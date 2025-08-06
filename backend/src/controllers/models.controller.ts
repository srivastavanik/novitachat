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
      if (hasAttachments === 'true') {
        const hasImages = attachmentTypes && (attachmentTypes as string).includes('image');
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

    // Check for specific capabilities
    if (modelName.includes('vision') || description.includes('image') || modelName.includes('llava')) {
      capabilities.push('image');
    }
    if (modelName.includes('code') || description.includes('code') || modelName.includes('codestral')) {
      capabilities.push('code');
    }
    if (description.includes('function') || description.includes('tool')) {
      capabilities.push('functions');
    }
    if (modelName.includes('embed')) {
      capabilities.push('embeddings');
    }
    // Check for reasoning capabilities (for deep research)
    if (modelName.includes('405b') || modelName.includes('large') || modelName.includes('70b') || modelName.includes('72b')) {
      capabilities.push('reasoning');
    }
    // Multi-step reasoning for deep research
    if (modelName.includes('405b') || (modelName.includes('70b') && modelName.includes('3.3'))) {
      capabilities.push('multi-step');
    }

    return capabilities;
  }

  // Check if model supports thinking/reasoning
  private supportsThinking(modelId: string): boolean {
    // Models that explicitly support thinking/reasoning process
    const thinkingModels = [
      'deepseek/deepseek-r1', 'deepseek-r1',
      'glm-4.1v-9b-thinking',
      'qwen3-235b-a22b-thinking',
      'qwen-2.5-72b-instruct-thinking',
      'kimi/k2', 'kimi-k2',
      'reflection',
      'reasoning'
    ];
    // DeepSeek V3 is NOT a thinking model
    return thinkingModels.some(model => modelId.toLowerCase().includes(model.toLowerCase()));
  }

  // Sort models by recommendation - GPT OSS 120B first as default
  private sortModelsByRecommendation(models: any[]): any[] {
    const priority = [
      'openai/gpt-oss-120b',  // Default model as requested
      'openai/gpt-oss-20b',
      'kimi/k2',
      'kimi-k2',
      'deepseek/deepseek-v3',
      'deepseek-v3',
      'deepseek/deepseek-r1', 
      'deepseek-r1',
      'deepseek/deepseek-chat',
      'deepseek/deepseek-coder',
      'deepseek/deepseek-math',
      'qwen/qwen-2.5-72b-instruct',
      'qwen2.5-72b-instruct', 
      'qwen/qwen-2.5-32b-instruct',
      'qwen2.5-32b-instruct',
      'meta-llama/llama-3.3-70b-instruct',
      'meta-llama/llama-3.2-90b-vision-instruct', 
      'meta-llama/llama-3.1-405b-instruct',
      'meta-llama/llama-3.1-70b-instruct',
      'meta-llama/llama-3.1-8b-instruct',
      'openai/gpt-4o',
      'gpt-4o',
      'anthropic/claude-3.5-sonnet',
      'claude-3.5-sonnet',
      'mistralai/mixtral-8x7b-instruct-v0.1',
      'mistralai/mistral-large-2407',
      'mistralai/codestral-2405'
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
    if (modelName.includes('vision') || description.includes('image') || modelName.includes('llava')) {
      return 'vision';
    }

    // Coding specialists
    if (modelName.includes('code') || modelName.includes('codestral') || description.includes('programming')) {
      return 'coding';
    }

    // Advanced models good for complex analysis go to reasoning
    if (modelName.includes('405b') || modelName.includes('claude')) {
      return 'reasoning';
    }

    // Math specialists
    if (modelName.includes('math') || description.includes('mathematical')) {
      return 'math';
    }

    // Premium/large models
    if (modelName.includes('large') || modelName.includes('70b') || modelName.includes('72b') || 
        modelName.includes('90b') || modelName.includes('120b') || modelName.includes('deepseek-v3')) {
      return 'premium';
    }

    // Fast/efficient models
    if (modelName.includes('8b') || modelName.includes('7b') || modelName.includes('mixtral') ||
        modelName.includes('gemma') || modelName.includes('nemo')) {
      return 'general';
    }

    // DeepSeek models that don't support thinking go to general
    if (modelName.includes('deepseek') && !this.supportsThinking(model.id)) {
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

  // Fallback models if API fails
  private getFallbackModels() {
    return [
      {
        id: 'openai/gpt-oss-120b',
        name: 'ChatGPT OSS 120B',
        description: 'OpenAI GPT OSS model with 120B parameters',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'premium',
        supportsThinking: false,
        inputPrice: 0.1,
        outputPrice: 0.5
      },
      {
        id: 'openai/gpt-oss-20b',
        name: 'ChatGPT OSS 20B',
        description: 'OpenAI GPT OSS model with 20B parameters',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'general',
        supportsThinking: false,
        inputPrice: 0.05,
        outputPrice: 0.2
      },
      {
        id: 'kimi/k2',
        name: 'Kimi K2',
        description: 'Advanced reasoning model with thinking capabilities',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'reasoning',
        supportsThinking: true
      },
      {
        id: 'deepseek/deepseek-v3',
        name: 'DeepSeek V3',
        description: 'Latest DeepSeek model with advanced capabilities',
        contextSize: 163840,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'premium',  // Not reasoning since it doesn't support thinking
        supportsThinking: false,
        inputPrice: 0.28,
        outputPrice: 1.14
      },
      {
        id: 'deepseek/deepseek-r1',
        name: 'DeepSeek R1',
        description: 'DeepSeek reasoning model with thinking process',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'reasoning',
        supportsThinking: true
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B',
        description: 'Latest Qwen model with strong reasoning',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'reasoning',
        supportsThinking: false
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B',
        description: 'Latest Llama model with 131K context',
        contextSize: 131072,
        capabilities: ['text', 'code', 'reasoning', 'multi-step'],
        category: 'reasoning',
        supportsThinking: false
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
        id: 'mistralai/mixtral-8x7b-instruct-v0.1',
        name: 'Mixtral 8x7B',
        description: 'Fast and efficient MoE model',
        contextSize: 32768,
        capabilities: ['text', 'code'],
        category: 'general',
        supportsThinking: false
      }
    ].map(model => ({
      ...model,
      supportsThinking: model.supportsThinking !== undefined ? model.supportsThinking : this.supportsThinking(model.id)
    }));
  }
}

export const modelsController = new ModelsController();
