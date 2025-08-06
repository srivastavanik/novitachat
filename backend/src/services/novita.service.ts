import axios, { AxiosInstance } from 'axios';
import { novitaConfig } from '../config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
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
      thinking?: string;
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
        console.log(`Novita API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('ERROR: Novita API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`Novita API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('ERROR: Novita API Response Error:', error.response?.data || error.message);
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
      // Create a timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 60000); // 60 second timeout

      const response = await this.client.post('/chat/completions', {
        ...request,
        stream: true,
      }, {
        responseType: 'stream',
        signal: controller.signal,
        timeout: 0, // Disable axios timeout for streaming
      });

      const stream = response.data;
      let buffer = '';
      let isCompleted = false;

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (!isCompleted) {
          isCompleted = true;
          if (onComplete) onComplete();
        }
      };

      stream.on('data', (chunk: Buffer) => {
        try {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.trim() === 'data: [DONE]') {
              cleanup();
              return;
            }

            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                // Validate chunk structure before passing to callback
                if (data && typeof data === 'object') {
                  onChunk(data);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e, 'Line:', line);
              }
            }
          }
        } catch (error) {
          console.error('Stream data processing error:', error);
          if (onError) onError(error as Error);
        }
      });

      stream.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        console.error('Stream error:', error);
        if (!isCompleted) {
          isCompleted = true;
          if (onError) onError(error);
        }
      });

      stream.on('end', () => {
        cleanup();
      });

      stream.on('close', () => {
        cleanup();
      });

      // Handle abort
      controller.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        if (!isCompleted) {
          isCompleted = true;
          const timeoutError = new Error('Stream timeout after 60 seconds');
          console.error('Stream timeout:', timeoutError);
          if (onError) onError(timeoutError);
        }
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
      // Request with a limit parameter to get more models
      const response = await this.client.get('/models', {
        params: {
          limit: 100, // Request up to 100 models
        }
      });
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
   * Get models (alias for listModels for backward compatibility)
   */
  async getModels(): Promise<any> {
    return this.listModels();
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listModels();
      console.log('Novita AI API connected successfully');
      return true;
    } catch (error) {
      console.error('ERROR: Novita AI API connection failed:', error);
      return false;
    }
  }

  /**
   * Format messages for the API
   */
  formatMessages(messages: Array<{ role: string; content: string | Array<any> }>): ChatMessage[] {
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
