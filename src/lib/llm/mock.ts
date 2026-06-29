/**
 * Mock LLM client for testing
 * Implements the same interface as real providers
 */

import { LLMClient, LLMMessage, LLMResponse, LLMConfig } from '../ai-providers';

export class MockClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const lastUserMessage = messages
      .reverse()
      .find((m) => m.role === 'user')?.content || '';

    // Mock responses based on message content
    let content = 'Mock response from director.';

    if (lastUserMessage.toLowerCase().includes('expand')) {
      content = JSON.stringify(
        {
          scenes: [
            { number: 1, heading: 'Expanded Scene 1', beat: 'Mock expanded beat' },
            { number: 2, heading: 'Expanded Scene 2', beat: 'Mock expanded beat' },
          ],
        },
        null,
        2
      );
    } else if (lastUserMessage.toLowerCase().includes('generate')) {
      content = JSON.stringify(
        {
          title: 'Mock Blueprint',
          scenes: [
            {
              number: 1,
              heading: 'Opening',
              beat: 'Establish the world',
              prompt: 'A cinematic opening shot',
            },
          ],
        },
        null,
        2
      );
    } else {
      content = `Mock director response: "${lastUserMessage.slice(0, 50)}..."`;
    }

    return {
      content,
      stopReason: 'stop',
      tokensUsed: { input: 100, output: 50 },
    };
  }

  async countTokens(text: string): Promise<number> {
    // Rough approximation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  async validateConfig(): Promise<void> {
    // Mock always validates
    return;
  }
}
