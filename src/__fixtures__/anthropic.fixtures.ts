/**
 * Anthropic SDK test fixtures for COD-992 vision feature.
 *
 * Returns a minimal mock Anthropic client with a spyable messages.create.
 * Import this in unit tests to avoid hitting the real API.
 */

import { vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';

/**
 * Default successful text response from the Anthropic Messages API.
 */
export function buildMockAnthropicResponse(
  text = 'Mock response from Claude.'
): Anthropic.Message {
  return {
    id: 'msg_mock_01',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    model: 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  } as unknown as Anthropic.Message;
}

/**
 * Builds a mock Anthropic client with a spyable `messages.create`.
 *
 * @example
 * const mockClient = buildMockAnthropicClient();
 * mockClient.messages.create.mockResolvedValue(buildMockAnthropicResponse('Hello'));
 */
export function buildMockAnthropicClient() {
  const messagesCreate = vi.fn().mockResolvedValue(buildMockAnthropicResponse());

  return {
    messages: {
      create: messagesCreate,
    },
  };
}
