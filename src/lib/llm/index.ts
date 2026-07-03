/**
 * LLM Client Factory
 *
 * Returns the active LLM client based on the user's settings.
 * Never returns the mock client in production.
 */

import type { LLMClient, ProviderConfig } from '../ai-providers';
import { LLMProviderError } from '../ai-providers';

export { LLMProviderError, LLMCallError } from '../ai-providers';
export type { LLMClient, LLMMessage, LLMResponse, LLMConfig } from '../ai-providers';

export async function createClient(config: ProviderConfig): Promise<LLMClient> {
  switch (config.provider) {
    case 'openai': {
      const { OpenAIClient } = await import('./openai');
      return new OpenAIClient(config);
    }
    case 'anthropic': {
      const { AnthropicClient } = await import('./anthropic');
      return new AnthropicClient(config);
    }
    case 'gemini': {
      const { GeminiClient } = await import('./gemini');
      return new GeminiClient(config);
    }
    case 'ollama': {
      const { OllamaClient } = await import('./ollama');
      return new OllamaClient(config);
    }
    default:
      throw new LLMProviderError(
        `Unknown provider: ${(config as { provider: string }).provider}`
      );
  }
}

/**
 * Retry an LLM call with exponential backoff.
 * Retries on rate limit, server errors, timeouts, and malformed responses.
 * Does NOT retry on auth errors or content policy violations.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; provider?: string } = {}
): Promise<T> {
  const { maxAttempts = 3, provider = 'unknown' } = opts;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();

      // Do not retry auth or content policy errors
      if (
        msg.includes('401') ||
        msg.includes('invalid api key') ||
        msg.includes('content_policy') ||
        msg.includes('content policy') ||
        msg.includes('context_length_exceeded') ||
        msg.includes('context length')
      ) {
        throw lastError;
      }

      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.warn(
          `[LLM/${provider}] Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. ` +
            `Retrying in ${delayMs}ms...`
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError;
}
