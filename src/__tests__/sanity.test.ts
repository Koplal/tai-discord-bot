/**
 * Sanity test: asserts that ContextMessage.content accepts both string
 * and ContentBlockParam[] (widened type from W1).
 */
import type { ContextMessage } from '../types.js';
import type Anthropic from '@anthropic-ai/sdk';

describe('ContextMessage type widening (W1)', () => {
  it('accepts string content', () => {
    const msg: ContextMessage = {
      role: 'user',
      content: 'Hello, world!',
    };
    expect(typeof msg.content).toBe('string');
  });

  it('accepts ContentBlockParam[] content', () => {
    const blocks: Anthropic.ContentBlockParam[] = [
      { type: 'text', text: 'What is in this image?' },
      {
        type: 'image',
        source: {
          type: 'url',
          url: 'https://cdn.discordapp.com/attachments/1/2/img.png',
        },
      },
    ];

    const msg: ContextMessage = {
      role: 'user',
      content: blocks,
    };

    expect(Array.isArray(msg.content)).toBe(true);
    if (Array.isArray(msg.content)) {
      expect(msg.content).toHaveLength(2);
    }
  });

  it('compile-time: string assignment satisfies the union', () => {
    // If ContextMessage.content were still `string`, this would error.
    // If it were only `ContentBlockParam[]`, the first test would error.
    // Both passing confirms the union is correct.
    const stringMsg: ContextMessage = { role: 'assistant', content: 'OK' };
    const arrayMsg: ContextMessage = {
      role: 'user',
      content: [{ type: 'text', text: 'hi' }],
    };
    expect(stringMsg.content).toBe('OK');
    expect(Array.isArray(arrayMsg.content)).toBe(true);
  });
});
