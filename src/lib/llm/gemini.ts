/**
 * Google Gemini LLM client
 * Support for Gemini Pro models
 */

import { LLMClient, LLMMessage, LLMResponse, LLMConfig } from '../ai-providers';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{
    text: string;
  }>;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
  safetySettings: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      role: string;
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiStreamChunk {
  candidates: Array<{
    content: {
      role: string;
      parts: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
}

export class GeminiClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private timeout: number;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
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
        `Failed to validate Gemini API key: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const geminiContents: GeminiContent[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const request: GeminiRequest = {
      contents: geminiContents,
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_UNSPECIFIED',
          threshold: 'BLOCK_NONE',
        },
      ],
    };

    // Include system prompt as first user message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    if (systemMessage) {
      request.contents.unshift({
        role: 'user',
        parts: [{ text: systemMessage.content }],
      });
      // Add a dummy model response so system prompt is in context
      request.contents.push({
        role: 'model',
        parts: [{ text: 'Understood.' }],
      });
    }

    const response = (await this.request(
      `/${this.model}:generateContent`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    )) as GeminiResponse;

    const content = response.candidates
      .flatMap((c) => c.content.parts)
      .map((p) => p.text)
      .join('');

    return {
      content,
      stopReason: response.candidates[0]?.finishReason,
      tokensUsed: {
        input: response.usageMetadata.promptTokenCount,
        output: response.usageMetadata.candidatesTokenCount,
      },
    };
  }

  async chatStream(
    messages: LLMMessage[],
    onToken: (token: string) => void
  ): Promise<LLMResponse> {
    const geminiContents: GeminiContent[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const request: GeminiRequest = {
      contents: geminiContents,
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_UNSPECIFIED',
          threshold: 'BLOCK_NONE',
        },
      ],
    };

    const systemMessage = messages.find((m) => m.role === 'system');
    if (systemMessage) {
      request.contents.unshift({
        role: 'user',
        parts: [{ text: systemMessage.content }],
      });
      request.contents.push({
        role: 'model',
        parts: [{ text: 'Understood.' }],
      });
    }

    const response = await fetch(
      `${this.baseUrl}/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Gemini error: ${error.error?.message || response.statusText}`
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
              const parsed = JSON.parse(data) as GeminiStreamChunk;
              const texts = parsed.candidates
                .flatMap((c) => c.content.parts)
                .map((p) => p.text || '')
                .join('');
              if (texts) {
                fullContent += texts;
                onToken(texts);
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
    // Gemini doesn't have a direct tokenization API
    // Use approximate: ~4 chars per token on average
    return Math.ceil(text.length / 4);
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}?key=${this.apiKey}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Gemini request failed: ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }
}
