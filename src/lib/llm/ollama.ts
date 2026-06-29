/**
 * Ollama LLM client
 * Connect to local Ollama instance for privacy-first, offline operation
 */

import { LLMClient, LLMMessage, LLMResponse, LLMConfig } from '../ai-providers';

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  temperature?: number;
}

interface OllamaStreamResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
}

export class OllamaClient implements LLMClient {
  private baseUrl: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private timeout: number;

  constructor(config: LLMConfig) {
    this.baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
    this.model = config.model;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
    this.timeout = config.timeout ?? 30000;
  }

  async validateConfig(): Promise<void> {
    try {
      const response = await this.request('/api/tags', { method: 'GET' });
      if (!response.models || !Array.isArray(response.models)) {
        throw new Error('Invalid Ollama response');
      }
      const modelExists = response.models.some(
        (m: { name: string }) => m.name === this.model
      );
      if (!modelExists) {
        throw new Error(
          `Model '${this.model}' not found. Available: ${response.models.map((m: { name: string }) => m.name).join(', ')}`
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to connect to Ollama at ${this.baseUrl}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const ollamaMessages: OllamaMessage[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: m.content,
    }));

    const request: OllamaRequest = {
      model: this.model,
      messages: ollamaMessages,
      stream: false,
      temperature: this.temperature,
    };

    const response = await this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return {
      content: response.message?.content || '',
      stopReason: response.done ? 'stop' : undefined,
      tokensUsed: {
        input: response.prompt_eval_count || 0,
        output: response.eval_count || 0,
      },
    };
  }

  async chatStream(
    messages: LLMMessage[],
    onToken: (token: string) => void
  ): Promise<LLMResponse> {
    const ollamaMessages: OllamaMessage[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: m.content,
    }));

    const request: OllamaRequest = {
      model: this.model,
      messages: ollamaMessages,
      stream: true,
      temperature: this.temperature,
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          const data = JSON.parse(line) as OllamaStreamResponse;
          const token = data.message?.content || '';
          fullContent += token;
          onToken(token);

          if (data.done) {
            totalInputTokens = (data as any).prompt_eval_count || 0;
            totalOutputTokens = (data as any).eval_count || 0;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      stopReason: 'stop',
      tokensUsed: {
        input: totalInputTokens,
        output: totalOutputTokens,
      },
    };
  }

  async countTokens(text: string): Promise<number> {
    // Ollama doesn't have a direct tokenize endpoint in standard API
    // Use approximate: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Ollama request failed: ${response.status} ${response.statusText} - ${text}`
      );
    }

    return response.json();
  }
}
