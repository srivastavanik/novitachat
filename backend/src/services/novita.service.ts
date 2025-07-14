import axios, { AxiosInstance } from 'axios';
import { novitaConfig } from '../config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}

class NovitaService {
  private client: AxiosInstance;
  private static instance: NovitaService;

  private constructor() {
    this.client = axios.create({
      baseURL: novitaConfig.baseURL,
      headers: {
        'Authorization': `Bearer ${novitaConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`📤 Novita API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Novita API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`📥 Novita API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('❌ Novita API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): NovitaService {
    if (!NovitaService.instance) {
      NovitaService.instance = new NovitaService();
    }
    return NovitaService.instance;
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        ...request,
        stream: false,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create chat completion: ${error.message}`);
    }
  }

  /**
   * Create a streaming chat completion
   */
  async createChatCompletionStream(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamChunk) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      const response = await this.client.post('/chat/completions', {
        ...request,
        stream: true,
      }, {
        responseType: 'stream',
      });

      const stream = response.data;
      let buffer = '';

      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') {
            if (onComplete) onComplete();
            continue;
          }

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onChunk(data);
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      });

      stream.on('error', (error: Error) => {
        console.error('Stream error:', error);
        if (onError) onError(error);
      });

      stream.on('end', () => {
        if (onComplete) onComplete();
      });

    } catch (error: any) {
      const errorMessage = `Failed to create streaming chat completion: ${error.message}`;
      console.error(errorMessage);
      if (onError) onError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<any> {
    try {
      const response = await this.client.get('/models');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  /**
   * Get model information
   */
  async getModel(modelId: string): Promise<any> {
    try {
      const response = await this.client.get(`/models/${modelId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listModels();
      console.log('✅ Novita AI API connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Novita AI API connection failed:', error);
      return false;
    }
  }

  /**
   * Format messages for the API
   */
  formatMessages(messages: Array<{ role: string; content: string }>): ChatMessage[] {
    return messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }));
  }

  /**
   * Count tokens (approximate)
   * Note: This is a rough estimation. For accurate token counting,
   * use the tokenizer specific to the model being used.
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

export const novitaService = NovitaService.getInstance();
export default novitaService;
