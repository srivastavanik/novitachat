import { Request, Response } from 'express';
import novitaService from '../services/novita.service';
import { AuthRequest } from '../types/auth';

export class ModelsController {
  // Get available Novita AI models
  async getModels(req: AuthRequest, res: Response) {
    try {
      const { hasAttachments, attachmentTypes, category } = req.query;
      
      let modelsResponse;
      try {
        // Get models from Novita
        modelsResponse = await novitaService.getModels();
        
        // Handle different response formats from Novita API
        if (modelsResponse && modelsResponse.data) {
          modelsResponse = modelsResponse.data;
        }
        
        // Ensure we have an array of models
        if (!Array.isArray(modelsResponse)) {
          console.warn('Novita API returned non-array response, using fallback models');
          throw new Error('Invalid response format from Novita API');
        }
      } catch (apiError) {
        console.error('Novita API error:', apiError);
        // Use fallback models when API fails
        modelsResponse = this.getFallbackModels();
      }
      
      // Transform the response to include only necessary fields
      let models = modelsResponse.map((model: any) => {
        // Strip brain emojis from model names
        let modelName = model.name || this.simplifyModelName(model.id);
        modelName = modelName.replace(/🧠\s*/g, '').trim();
        
        return {
          id: model.id,
          name: modelName,
          description: model.description,
          contextSize: model.maxTokens || model.context_size || 4096,
          inputPrice: model.pricing?.input || model.input_token_price_per_m,
          outputPrice: model.pricing?.output || model.output_token_price_per_m,
          capabilities: this.inferCapabilities(model),
          category: this.categorizeModel(model),
          supportsThinking: this.supportsThinking(model.id)
        };
      });

      // Filter for vision models if attachments present
      if (typeof hasAttachments === 'string' && hasAttachments === 'true') {
        const attachmentTypesStr = typeof attachmentTypes === 'string' ? attachmentTypes : '';
        const hasImages = attachmentTypesStr.includes('image');
        if (hasImages) {
          models = models.filter((model: any) => model.capabilities.includes('image'));
        }
      }

      // Filter by category if specified
      if (category) {
        models = models.filter((model: any) => model.category === category);
      }

      // Sort by popularity/capability
      const sortedModels = this.sortModelsByRecommendation(models);

      // Group models by category for the catalog view
      const categorizedModels = this.groupModelsByCategory(sortedModels);

      res.json({ 
        models: sortedModels,
        categorized: categorizedModels,
        categories: this.getModelCategories()
      });
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({ 
        error: 'Failed to fetch models',
        fallbackModels: this.getFallbackModels(),
        categorized: this.groupModelsByCategory(this.getFallbackModels()),
        categories: this.getModelCategories()
      });
    }
  }

  // Infer model capabilities based on name/description
  private inferCapabilities(model: any): string[] {
    const capabilities: string[] = ['text'];
    const modelName = model.id.toLowerCase();
    const description = (model.description || '').toLowerCase();

    // Vision/Multimodal capabilities - based on Novita research
    const visionModels = [
      'qwen2.5-vl', 'qwen/qwen2.5-vl', 'qwen2-vl',
      'gemma-3-27b', 'google/gemma-3-27b',
      'llama-4-maverick', 'meta-llama/llama-4-maverick',
      'llama-4-scout', 'meta-llama/llama-4-scout',
      'glm-4.1v', 'thudm/glm-4.1v'
    ];
    
    // Check for vision capabilities
    if (visionModels.some(vm => modelName.includes(vm)) || 
        modelName.includes('vision') || description.includes('image') || 
        modelName.includes('llava') || modelName.includes('-vl') ||
        description.includes('multimodal') || description.includes('vision')) {
      capabilities.push('image');
      capabilities.push('vision');
      // Vision models also support document analysis
      capabilities.push('documents');
    }

    // Document processing capabilities (for models that can handle text files but not images)
    if (capabilities.includes('image') || 
        modelName.includes('claude') || modelName.includes('gpt-4') ||
        modelName.includes('gemini') || description.includes('document')) {
      capabilities.push('documents');
    }

    // Code capabilities
    if (modelName.includes('code') || description.includes('code') || 
        modelName.includes('codestral') || modelName.includes('coder')) {
      capabilities.push('code');
    }

    // Function calling
    if (description.includes('function') || description.includes('tool') ||
        modelName.includes('instruct') || modelName.includes('chat')) {
      capabilities.push('functions');
    }

    // Embeddings
    if (modelName.includes('embed')) {
      capabilities.push('embeddings');
    }

    // Reasoning capabilities (for deep research)
    if (modelName.includes('405b') || modelName.includes('large') || 
        modelName.includes('70b') || modelName.includes('72b') ||
        modelName.includes('120b') || modelName.includes('235b')) {
      capabilities.push('reasoning');
    }

    // Multi-step reasoning for deep research
    if (modelName.includes('405b') || (modelName.includes('70b') && modelName.includes('3.3')) ||
        modelName.includes('120b') || modelName.includes('235b') ||
        modelName.includes('r1') || modelName.includes('thinking')) {
      capabilities.push('multi-step');
    }

    return capabilities;
  }

  // Check if model supports thinking/reasoning
  private supportsThinking(modelId: string): boolean {
    // Models that explicitly support thinking/reasoning process
    const thinkingModels = [
      'openai/gpt-oss-120b',  // GPT OSS models support thinking
      'openai/gpt-oss-20b',
      'deepseek/deepseek-r1', 'deepseek-r1-0528', 'deepseek-r1-0324',
      'glm-4.1v-9b-thinking',
      'qwen3-235b-a22b-thinking',
      'qwen-2.5-72b-instruct-thinking',
      'moonshotai/kimi-k2-instruct', 'kimi/k2', 'kimi-k2',
      'reflection',
      'reasoning'
    ];
    
    const modelLower = modelId.toLowerCase();
    
    // Explicitly exclude models that don't support thinking
    const nonThinkingModels = [
      'deepseek-v3',
      'deepseek/deepseek-v3',
      'deepseek-chat',
      'deepseek-coder'
    ];
    
    // Check if it's a non-thinking model first
    if (nonThinkingModels.some(model => modelLower.includes(model))) {
      return false;
    }
    
    // Check if it's in the thinking models list
    return thinkingModels.some(model => modelLower.includes(model.toLowerCase()));
  }

  // Sort models by recommendation - GPT OSS 120B first as default
  private sortModelsByRecommendation(models: any[]): any[] {
    const priority = [
      'openai/gpt-oss-120b',  // Default model as requested
      'openai/gpt-oss-20b',
      'moonshotai/kimi-k2-instruct',
      'kimi/k2',
      'kimi-k2',
      'deepseek/deepseek-r1-0528',
      'deepseek/deepseek-r1',
      'deepseek-r1',
      'deepseek/deepseek-v3-0324',
      'deepseek/deepseek-v3',
      'deepseek-v3',
      'qwen3-235b-a22b-thinking-2507',
      'qwen3-235b-a22b-instruct-2507',
      'qwen3-coder-480b-a35b-instruct',
      'qwen/qwen-2.5-72b-instruct',
      'qwen2.5-72b-instruct', 
      'zai-org/glm-4.5',
      'glm-4.5',
      'glm-4.1v-9b-thinking',
      'meta-llama/llama-4-maverick-17b-128e-instruct-fp8',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'meta-llama/llama-3.3-70b-instruct',
      'meta-llama/llama-3.2-90b-vision-instruct', 
      'meta-llama/llama-3.1-405b-instruct',
      'meta-llama/llama-3.1-70b-instruct',
      'meta-llama/llama-3.1-8b-instruct',
      'mistralai/mixtral-8x7b-instruct-v0.1',
      'mistralai/mistral-large-2407',
      'mistralai/codestral-2405',
      'minimax/m1-80k',
      'ernie-4.5-300b-a47b',
      'ernie-4.5-vl-424b-a47b'
    ];

    return models.sort((a, b) => {
      const aIndex = priority.indexOf(a.id);
      const bIndex = priority.indexOf(b.id);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // Sort by context size for others
      return (b.contextSize || 0) - (a.contextSize || 0);
    });
  }

  // Simplify model names for better UX
  private simplifyModelName(modelId: string): string {
    // Remove organization prefix and clean up model names
    const simplifications: Record<string, string> = {
      'openai/gpt-oss-120b': 'ChatGPT OSS 120B',
      'openai/gpt-oss-20b': 'ChatGPT OSS 20B',
      'kimi/k2': 'Kimi K2',
      'deepseek/deepseek-v3': 'DeepSeek V3',
      'deepseek/deepseek-r1': 'DeepSeek R1',
      'deepseek/deepseek-chat': 'DeepSeek Chat',
      'deepseek/deepseek-coder': 'DeepSeek Coder',
      'glm-4.1v-9b-thinking': 'GLM 4.1V',
      'qwen3-235b-a22b-thinking': 'Qwen3 235B',
      'qwen-2.5-72b-instruct-thinking': 'Qwen 2.5 72B',
      'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3 70B',
      'meta-llama/llama-3.2-90b-vision-instruct': 'Llama 3.2 90B Vision',
      'meta-llama/llama-3.1-405b-instruct': 'Llama 3.1 405B',
      'meta-llama/llama-3.1-70b-instruct': 'Llama 3.1 70B',
      'meta-llama/llama-3.1-8b-instruct': 'Llama 3.1 8B',
      'mistralai/mistral-nemo-instruct-2407': 'Mistral Nemo',
      'mistralai/codestral-2405': 'Codestral',
      'mistralai/mistral-large-2407': 'Mistral Large',
      'mistralai/mixtral-8x7b-instruct-v0.1': 'Mixtral 8x7B',
      'qwen/qwen-2.5-72b-instruct': 'Qwen 2.5 72B',
      'google/gemma-2-27b-it': 'Gemma 2 27B',
      'openai/gpt-4': 'GPT-4',
      'openai/gpt-3.5-turbo': 'GPT-3.5 Turbo'
    };

    if (simplifications[modelId]) {
      return simplifications[modelId];
    }

    // Generic simplification
    let name = modelId.split('/').pop() || modelId;
    name = name.replace(/-instruct$/i, '');
    name = name.replace(/-chat$/i, '');
    name = name.replace(/-it$/i, '');
    name = name.replace(/[-_]/g, ' ');
    
    // Capitalize each word
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Categorize models based on their capabilities and name
  private categorizeModel(model: any): string {
    const modelName = model.id.toLowerCase();
    const description = (model.description || '').toLowerCase();

    // Reasoning models (only models that truly support thinking/reasoning process)
    if (this.supportsThinking(model.id)) {
      return 'reasoning';
    }

    // Vision models
    if (modelName.includes('vision') || modelName.includes('-vl-') || modelName.includes('llava') || 
        description.includes('vision') || description.includes('image')) {
      return 'vision';
    }

    // Coding specialists
    if (modelName.includes('code') || modelName.includes('codestral') || description.includes('programming')) {
      return 'coding';
    }

    // Math specialists
    if (modelName.includes('math') || description.includes('mathematical')) {
      return 'math';
    }

    // Premium/large models (but not if they support thinking - those go to reasoning)
    if (modelName.includes('405b') || modelName.includes('235b') || modelName.includes('300b') ||
        modelName.includes('90b') || modelName.includes('70b') || modelName.includes('72b') || 
        modelName.includes('120b') || modelName.includes('deepseek-v3') || modelName.includes('claude') ||
        modelName.includes('large') || modelName.includes('m1-80k')) {
      return 'premium';
    }

    // Fast/efficient models
    if (modelName.includes('8b') || modelName.includes('7b') || modelName.includes('9b') ||
        modelName.includes('20b') || modelName.includes('27b') || modelName.includes('mixtral') ||
        modelName.includes('gemma') || modelName.includes('nemo') || modelName.includes('turbo')) {
      return 'general';
    }

    // DeepSeek models that don't support thinking go to general or premium based on size
    if (modelName.includes('deepseek') && !this.supportsThinking(model.id)) {
      if (modelName.includes('v3') && !modelName.includes('turbo')) {
        return 'premium';
      }
      return 'general';
    }

    return 'general';
  }

  // Group models by category
  private groupModelsByCategory(models: any[]) {
    const categories = {
      reasoning: [] as any[],
      general: [] as any[],
      coding: [] as any[],
      vision: [] as any[],
      math: [] as any[],
      premium: [] as any[]
    };

    models.forEach(model => {
      const category = model.category || 'general';
      if (categories[category as keyof typeof categories]) {
        categories[category as keyof typeof categories].push(model);
      } else {
        categories.general.push(model);
      }
    });

    return categories;
  }

  // Get model categories with descriptions
  private getModelCategories() {
    return [
      {
        id: 'reasoning',
        name: 'Reasoning',
        description: 'Advanced models with thinking capabilities and deep research',
        icon: 'Sparkles'
      },
      {
        id: 'general',
        name: 'General Chat',
        description: 'Fast, efficient models for everyday conversations',
        icon: 'MessageSquare'
      },
      {
        id: 'coding',
        name: 'Code Assistant',
        description: 'Specialized models for programming and development',
        icon: 'Code'
      },
      {
        id: 'vision',
        name: 'Vision & Images',
        description: 'Models that can understand and analyze images',
        icon: 'Image'
      },
      {
        id: 'math',
        name: 'Mathematics',
        description: 'Models optimized for mathematical problem solving',
        icon: 'Calculator'
      },
      {
        id: 'premium',
        name: 'Premium Models',
        description: 'Largest, most capable models for demanding tasks',
        icon: 'Crown'
      }
    ];
  }

  // Fallback models if API fails - updated with latest Novita AI models
  private getFallbackModels() {
    return [
      // OpenAI GPT OSS Models (Default) - Support thinking/reasoning
      {
        id: 'openai/gpt-oss-120b',
        name: 'ChatGPT OSS 120B',
        description: 'OpenAI GPT OSS model with 120B parameters and thinking capabilities - Default model',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'reasoning',
        supportsThinking: true,
        inputPrice: 0.1,
        outputPrice: 0.5
      },
      {
        id: 'openai/gpt-oss-20b',
        name: 'ChatGPT OSS 20B',
        description: 'OpenAI GPT OSS model with 20B parameters and thinking capabilities',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'reasoning', 
        supportsThinking: true,
        inputPrice: 0.05,
        outputPrice: 0.2
      },
      // Kimi Models
      {
        id: 'moonshotai/kimi-k2-instruct',
        name: 'Kimi K2 Instruct',
        description: 'Advanced reasoning model from Moonshot AI with thinking capabilities',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'reasoning',
        supportsThinking: true,
        inputPrice: 0.57,
        outputPrice: 2.3
      },
      // DeepSeek Models
      {
        id: 'deepseek/deepseek-v3-0324',
        name: 'DeepSeek V3 0324',
        description: 'Latest DeepSeek model with advanced capabilities',
        contextSize: 163840,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'premium',
        supportsThinking: false,
        inputPrice: 0.28,
        outputPrice: 1.14
      },
      {
        id: 'deepseek/deepseek-r1-0528',
        name: 'DeepSeek R1 0528',
        description: 'DeepSeek reasoning model with thinking process',
        contextSize: 163840,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'reasoning',
        supportsThinking: true,
        inputPrice: 0.7,
        outputPrice: 2.5
      },
      {
        id: 'deepseek/deepseek-v3-turbo',
        name: 'DeepSeek V3 Turbo',
        description: 'Fast DeepSeek model for quick responses',
        contextSize: 64000,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'general',
        supportsThinking: false,
        inputPrice: 0.4,
        outputPrice: 1.3
      },
      // Qwen Models
      {
        id: 'qwen/qwen3-coder-480b-a35b-instruct',
        name: 'Qwen3 Coder 480B A35B',
        description: 'Massive coding model with 480B parameters for complex programming tasks',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'coding',
        supportsThinking: false,
        inputPrice: 0.28,
        outputPrice: 1.12
      },
      {
        id: 'qwen3-235b-a22b-thinking-2507',
        name: 'Qwen3 235B Thinking',
        description: 'Large Qwen model with thinking capabilities',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'reasoning',
        supportsThinking: true,
        inputPrice: 0.3,
        outputPrice: 3.0
      },
      {
        id: 'qwen/qwen3-235b-a22b-instruct-2507',
        name: 'Qwen3 235B Instruct',
        description: 'Large Qwen model optimized for instructions',
        contextSize: 262144,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'premium',
        supportsThinking: false,
        inputPrice: 0.15,
        outputPrice: 0.8
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B',
        description: 'Latest Qwen model with strong reasoning',
        contextSize: 32000,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'premium',
        supportsThinking: false,
        inputPrice: 0.38,
        outputPrice: 0.4
      },
      {
        id: 'qwen2.5-vl-72b-instruct',
        name: 'Qwen2.5 VL 72B',
        description: 'Vision-Language model from Qwen',
        contextSize: 32768,
        capabilities: ['text', 'image', 'code', 'reasoning'],
        category: 'vision',
        supportsThinking: false,
        inputPrice: 0.8,
        outputPrice: 0.8
      },
      // GLM Models
      {
        id: 'glm-4.5',
        name: 'GLM-4.5',
        description: 'Advanced GLM model with strong capabilities',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'premium',
        supportsThinking: false,
        inputPrice: 0.6,
        outputPrice: 2.2
      },
      {
        id: 'glm-4.1v-9b-thinking',
        name: 'GLM 4.1V Thinking',
        description: 'GLM model with thinking capabilities',
        contextSize: 65536,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'reasoning',
        supportsThinking: true,
        inputPrice: 0.035,
        outputPrice: 0.138
      },
      // Llama Models
      {
        id: 'meta-llama/llama-4-maverick-17b-128e-instruct-fp8',
        name: 'Llama 4 Maverick 17B',
        description: 'Next-gen Llama 4 model with extended 128K context for long-form content',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'premium',
        supportsThinking: false,
        inputPrice: 0.2,
        outputPrice: 0.5
      },
      {
        id: 'meta-llama/llama-4-scout-17b-16e-instruct',
        name: 'Llama 4 Scout 17B',
        description: 'Efficient Llama 4 model for vision understanding and document analysis',
        contextSize: 65536,
        capabilities: ['text', 'image', 'code', 'reasoning'],
        category: 'vision',
        supportsThinking: false,
        inputPrice: 0.18,
        outputPrice: 0.45
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B',
        description: 'Latest Llama 3.3 model with 131K context',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'premium',
        supportsThinking: false,
        inputPrice: 0.13,
        outputPrice: 0.39
      },
      {
        id: 'meta-llama/llama-3.2-90b-vision-instruct',
        name: 'Llama 3.2 90B Vision',
        description: 'Multimodal model with vision capabilities',
        contextSize: 131072,
        capabilities: ['text', 'image', 'code', 'reasoning'],
        category: 'vision',
        supportsThinking: false
      },
      {
        id: 'meta-llama/llama-3.1-405b-instruct',
        name: 'Llama 3.1 405B',
        description: 'Largest Llama model for complex tasks',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'premium',
        supportsThinking: false
      },
      {
        id: 'meta-llama/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B',
        description: 'Large Llama model with strong performance',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'premium',
        supportsThinking: false
      },
      {
        id: 'meta-llama/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B',
        description: 'Efficient Llama model for general use',
        contextSize: 16384,
        capabilities: ['text', 'code'],
        category: 'general',
        supportsThinking: false,
        inputPrice: 0.02,
        outputPrice: 0.05
      },
      // Mistral Models
      {
        id: 'mistralai/mixtral-8x7b-instruct-v0.1',
        name: 'Mixtral 8x7B',
        description: 'Fast and efficient MoE model',
        contextSize: 32768,
        capabilities: ['text', 'code'],
        category: 'general',
        supportsThinking: false
      },
      {
        id: 'mistralai/mistral-nemo-instruct-2407',
        name: 'Mistral Nemo',
        description: 'Compact and efficient Mistral model',
        contextSize: 60288,
        capabilities: ['text', 'code'],
        category: 'general',
        supportsThinking: false,
        inputPrice: 0.04,
        outputPrice: 0.17
      },
      // ERNIE Models
      {
        id: 'ernie-4.5-vl-424b-a47b',
        name: 'ERNIE 4.5 VL',
        description: 'Vision-Language model from Baidu',
        contextSize: 123000,
        capabilities: ['text', 'image', 'code', 'reasoning'],
        category: 'vision',
        supportsThinking: false,
        inputPrice: 0.42,
        outputPrice: 1.25
      },
      {
        id: 'ernie-4.5-300b-a47b',
        name: 'ERNIE 4.5 300B',
        description: 'Large ERNIE model with strong capabilities',
        contextSize: 123000,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'premium',
        supportsThinking: false,
        inputPrice: 0.28,
        outputPrice: 1.1
      },
      // MiniMax Models
      {
        id: 'minimax/m1-80k',
        name: 'MiniMax M1',
        description: 'Model with massive 1M token context window',
        contextSize: 1000000,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'premium',
        supportsThinking: false,
        inputPrice: 0.55,
        outputPrice: 2.2
      }
    ].map(model => ({
      ...model,
      supportsThinking: model.supportsThinking !== undefined ? model.supportsThinking : this.supportsThinking(model.id)
    }));
  }
}

export const modelsController = new ModelsController();
