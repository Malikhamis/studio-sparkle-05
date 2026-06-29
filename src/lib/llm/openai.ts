/**
 * OpenAI LLM client
 * Support for GPT-4, GPT-4o, GPT-3.5-turbo
 */

import { LLMClient, LLMMessage, LLMResponse, LLMConfig } from '../ai-providers';

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export class OpenAIClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private timeout: number;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
    this.timeout = config.timeout ?? 30000;
  }

  async validateConfig(): Promise<void> {
    try {
      // Make a minimal request to validate API key
      const response = await this.request('/models', { method: 'GET' });
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid OpenAI response');
      }
    } catch (error) {
      throw new Error(
        `Failed to validate OpenAI API key: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const openaiMessages: OpenAIMessage[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: m.content,
    }));

    const request: OpenAIRequest = {
      model: this.model,
      messages: openaiMessages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    };

    const response = (await this.request('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(request),
    })) as OpenAIResponse;

    const content = response.choices[0]?.message?.content || '';

    return {
      content,
      stopReason: response.choices[0]?.finish_reason,
      tokensUsed: {
        input: response.usage.prompt_tokens,
        output: response.usage.completion_tokens,
      },
    };
  }

  async chatStream(
    messages: LLMMessage[],
    onToken: (token: string) => void
  ): Promise<LLMResponse> {
    const openaiMessages: OpenAIMessage[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: m.content,
    }));

    const request: OpenAIRequest = {
      model: this.model,
      messages: openaiMessages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `OpenAI error: ${error.error?.message || response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data) as OpenAIStreamChunk;
              const token = parsed.choices[0]?.delta?.content || '';
              if (token) {
                fullContent += token;
                onToken(token);
              }
            } catch {
              // Skip parse errors
            }
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
        input: 0, // Not available in stream mode
        output: 0,
      },
    };
  }

  async countTokens(text: string): Promise<number> {
    // OpenAI doesn't have a direct API for tokenization in this SDK
    // Use approximate: GPT models use ~4 chars per token on average
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
        Authorization: `Bearer ${this.apiKey}`,
      },
      ...options,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `OpenAI request failed: ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }
}
