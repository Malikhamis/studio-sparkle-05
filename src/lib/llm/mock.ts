/**
 * Mock LLM client — FOR TESTING ONLY.
 *
 * This client MUST NOT be used in production code paths.
 * A runtime guard throws if instantiated outside a test environment.
 */

import type { LLMClient, LLMMessage, LLMResponse, LLMConfig } from '../ai-providers';

export class MockClient implements LLMClient {
  constructor(private config: LLMConfig) {
    // Use the Vite build-time constant (reliable in browser environments).
    // Falls back to process.env check for Node.js test runners.
    const isProd =
      (typeof import.meta !== 'undefined' && (import.meta as { env?: { PROD?: boolean } }).env?.PROD === true) ||
      (typeof process !== 'undefined' && process.env.NODE_ENV === 'production');
    if (isProd) {
      throw new Error(
        '[Hooke] MockClient cannot be instantiated in production. ' +
          'Configure a real provider in Settings → AI Providers.'
      );
    }
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    return {
      content: this.mockResponse(last),
      stopReason: 'stop',
      tokensUsed: { input: 100, output: 50 },
    };
  }

  async chatStream(
    messages: LLMMessage[],
    onToken: (token: string) => void
  ): Promise<LLMResponse> {
    const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const response = this.mockResponse(last);
    // Simulate streaming token by token
    for (const char of response) {
      onToken(char);
      await new Promise((r) => setTimeout(r, 10));
    }
    return { content: response, stopReason: 'stop', tokensUsed: { input: 100, output: 50 } };
  }

  async validateConfig(): Promise<void> {
    // Mock always passes validation
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }

  private mockResponse(userMessage: string): string {
    const msg = userMessage.toLowerCase();
    if (msg.includes('generate') || msg.includes('blueprint')) {
      return JSON.stringify({
        title: 'Mock Blueprint',
        preset: 'cinematic',
        logline: 'A mock production for testing purposes.',
        audience: 'Test audience',
        tone: 'Neutral',
        length: '60s',
        format: '16:9',
        references: '',
        scenes: [
          { id: 'mock-1', number: 1, heading: 'Opening', beat: 'Establish the world.', shot: 'Wide establishing shot.', duration: 10, prompt: 'A wide cinematic opening shot.' },
          { id: 'mock-2', number: 2, heading: 'Inciting Image', beat: 'The hook.', shot: 'Close-up on the subject.', duration: 8, prompt: 'A compelling close-up.' },
        ],
      }, null, 2);
    }
    return `[MOCK] Response to: "${userMessage.slice(0, 60)}${userMessage.length > 60 ? '...' : ''}"`;
  }
}
