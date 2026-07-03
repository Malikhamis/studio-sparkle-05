/**
 * Hooke AI Provider Interface
 *
 * Shared types and interfaces for all LLM provider clients.
 * All clients in src/lib/llm/ implement these interfaces.
 */

export type MessageRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: MessageRole;
  content: string;
}

export interface LLMResponse {
  content: string;
  stopReason?: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  /** For Ollama: override the base URL (default: http://localhost:11434) */
  baseUrl?: string;
}

export interface LLMClient {
  /** Single-turn completion */
  chat(messages: LLMMessage[]): Promise<LLMResponse>;

  /** Streaming completion — calls onToken for each token as it arrives */
  chatStream(
    messages: LLMMessage[],
    onToken: (token: string) => void
  ): Promise<LLMResponse>;

  /** Validate API key / connectivity. Throws with a user-readable message on failure. */
  validateConfig(): Promise<void>;

  /** Estimate token count for the given text */
  countTokens(text: string): Promise<number>;
}

/** Error thrown when no provider is configured */
export class LLMProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

/** Error thrown when an API call fails after all retries */
export class LLMCallError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'LLMCallError';
  }
}

export type ProviderName = 'openai' | 'anthropic' | 'gemini' | 'ollama';

export interface ProviderConfig {
  provider: ProviderName;
  apiKey: string;
  model: string;
  label?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}
