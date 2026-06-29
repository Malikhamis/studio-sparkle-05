/**
 * Anthropic (Claude) LLM client
 * Support for Claude 3 models (Opus, Sonnet, Haiku)
 */

import { LLMClient, LLMMessage, LLMResponse, LLMConfig } from '../ai-providers';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  temperature?: number;
  system?: string;
  messages: AnthropicMessage[];
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: string;
  index?: number;
  delta?: {
    type: string;
    text?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private timeout: number;
  private baseUrl: string = 'https://api.anthropic.com/v1';
  private apiVersion: string = '2024-01-15';

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
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
      await this.chat([
        {
          role: 'user',
          content: 'Hello',
        },
      ]);
    } catch (error) {
      throw new Error(
        `Failed to validate Anthropic API key: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const anthropicMessages: AnthropicMessage[] = chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const request: AnthropicRequest = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: anthropicMessages,
    };

    // Add system prompt if present
    if (systemMessages.length > 0) {
      request.system = systemMessages.map((m) => m.content).join('\n\n');
    }

    const response = (await this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(request),
    })) as AnthropicResponse;

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content,
      stopReason: response.stop_reason,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  }

  async chatStream(
    messages: LLMMessage[],
    onToken: (token: string) => void
  ): Promise<LLMResponse> {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const anthropicMessages: AnthropicMessage[] = chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const request: AnthropicRequest = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: anthropicMessages,
    };

    if (systemMessages.length > 0) {
      request.system = systemMessages.map((m) => m.content).join('\n\n');
    }

    const response = await fetch(`${this.baseUrl}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Anthropic error: ${error.error?.message || response.statusText}`
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
            try {
              const event = JSON.parse(data) as AnthropicStreamEvent;
              if (
                event.type === 'content_block_delta' &&
                event.delta?.type === 'text_delta' &&
                event.delta.text
              ) {
                fullContent += event.delta.text;
                onToken(event.delta.text);
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
        input: 0, // Not available in streaming
        output: 0,
      },
    };
  }

  async countTokens(text: string): Promise<number> {
    // Anthropic doesn't have a direct tokenization API
    // Use approximate: Claude uses ~4 chars per token on average
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
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
      },
      ...options,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Anthropic request failed: ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }
}
