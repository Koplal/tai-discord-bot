/**
 * W3 tests for agent.ts — buildMessages rewrite, error path, vision flag,
 * consecutive-role collapse, and log scrub.
 *
 * Tests T12–T22 from COD-992 plan §4.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import type { ContextMessage, BotConfig } from '../types.js';
import {
  buildMockAnthropicResponse,
} from '../__fixtures__/anthropic.fixtures.js';
import { processAgentRequest } from './agent.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(): BotConfig {
  return {
    discordToken: 'tok',
    discordClientId: 'cid',
    discordGuildId: 'gid',
    anthropicApiKey: 'sk-test',
    linearApiKey: 'lin-key',
    linearTeamId: 'team-id',
  };
}

function makeMockClient() {
  const create = vi.fn().mockResolvedValue(buildMockAnthropicResponse());
  return { messages: { create } };
}

function baseRequest(overrides: Partial<Parameters<typeof processAgentRequest>[0]> = {}) {
  return {
    content: 'Hello',
    context: [] as ContextMessage[],
    username: 'TestUser',
    channel: 'general',
    tier: 'free' as const,
    ...overrides,
  };
}

beforeEach(() => {
  delete process.env['ENABLE_VISION'];
});

afterEach(() => {
  delete process.env['ENABLE_VISION'];
});

// ---------------------------------------------------------------------------
// T12 — buildMessages: array content in context is NOT stringified
// ---------------------------------------------------------------------------

describe('T12 buildMessages_contextMessageWithArrayContentNotStringConcatenated', () => {
  it('passes array content through as-is, not as "[object Object]"', async () => {
    const imageUrl = 'https://cdn.discordapp.com/attachments/1/2/img.png';
    const ctxWithArray: ContextMessage = {
      role: 'user',
      content: [
        { type: 'text', text: 'hi' },
        { type: 'image', source: { type: 'url', url: imageUrl } },
      ] as Anthropic.ContentBlockParam[],
      author: 'alice',
    };

    const mockClient = makeMockClient();
    await processAgentRequest(baseRequest({ context: [ctxWithArray] }), makeConfig(), mockClient as never);

    const callArgs = mockClient.messages.create.mock.calls[0]![0] as { messages: Anthropic.MessageParam[] };
    const contextMsg = callArgs.messages[0];

    // Content must be an array, not a string
    expect(Array.isArray(contextMsg?.content)).toBe(true);

    // Must not contain the [object Object] stringification
    const serialized = JSON.stringify(contextMsg?.content);
    expect(serialized).not.toContain('[object Object]');

    // Must contain both original blocks
    const blocks = contextMsg?.content as Anthropic.ContentBlockParam[];
    const imageBlock = blocks.find((b) => b.type === 'image');
    expect(imageBlock).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// T13 — buildMessages: attachments produce content block array on user turn
// ---------------------------------------------------------------------------

describe('T13 buildMessages_userTurnWithAttachmentsProducesContentBlockArray', () => {
  it('builds [text, image] block array for current user turn when attachments present', async () => {
    const imageUrl = 'https://cdn.discordapp.com/attachments/1/2/photo.png';
    const mockClient = makeMockClient();

    await processAgentRequest(
      baseRequest({
        content: 'What is in this image?',
        attachments: [{ url: imageUrl, mimeType: 'image/png' }],
      }),
      makeConfig(),
      mockClient as never
    );

    const callArgs = mockClient.messages.create.mock.calls[0]![0] as { messages: Anthropic.MessageParam[] };
    // The last message in the array is the current user turn
    const userTurn = callArgs.messages[callArgs.messages.length - 1];

    expect(userTurn?.role).toBe('user');
    expect(Array.isArray(userTurn?.content)).toBe(true);

    const blocks = userTurn?.content as Anthropic.ContentBlockParam[];
    expect(blocks[0]).toMatchObject({ type: 'text', text: 'What is in this image?' });
    expect(blocks[1]).toMatchObject({
      type: 'image',
      source: { type: 'url', url: imageUrl },
    });
  });
});

// ---------------------------------------------------------------------------
// T14 — buildMessages: no attachments → plain string user turn (no regression)
// ---------------------------------------------------------------------------

describe('T14 buildMessages_userTurnWithoutAttachmentsRemainsString', () => {
  it('keeps user turn as a plain string when no attachments provided', async () => {
    const mockClient = makeMockClient();

    await processAgentRequest(
      baseRequest({ content: 'Just a text message' }),
      makeConfig(),
      mockClient as never
    );

    const callArgs = mockClient.messages.create.mock.calls[0]![0] as { messages: Anthropic.MessageParam[] };
    const userTurn = callArgs.messages[callArgs.messages.length - 1];

    expect(userTurn?.role).toBe('user');
    expect(typeof userTurn?.content).toBe('string');
    expect(userTurn?.content).toBe('Just a text message');
  });
});

// ---------------------------------------------------------------------------
// T15 — tool loop: image block from initial turn persists across iterations
// ---------------------------------------------------------------------------

describe('T15 toolLoop_preservesImageContextAcrossIterations', () => {
  it('second messages.create call still contains the image block from the initial turn', async () => {
    const imageUrl = 'https://cdn.discordapp.com/attachments/5/6/diagram.png';

    const toolUseResponse = {
      id: 'msg_tool',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'tu_1',
          name: 'list_linear_issues',
          input: {},
        } as Anthropic.ToolUseBlock,
      ],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'tool_use',
      stop_sequence: null,
      usage: { input_tokens: 50, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    } as unknown as Anthropic.Message;

    const mockClient = makeMockClient();
    mockClient.messages.create
      .mockResolvedValueOnce(toolUseResponse)
      .mockResolvedValueOnce(buildMockAnthropicResponse('Done.'));

    await processAgentRequest(
      baseRequest({
        content: 'Check this diagram',
        attachments: [{ url: imageUrl, mimeType: 'image/png' }],
        tier: 'premium',
      }),
      makeConfig(),
      mockClient as never
    );

    expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
    const secondCallArgs = mockClient.messages.create.mock.calls[1]![0] as { messages: Anthropic.MessageParam[] };
    const serialized = JSON.stringify(secondCallArgs.messages);
    expect(serialized).toContain(imageUrl);
  });
});

// ---------------------------------------------------------------------------
// T16 — empty text + attachments: no "Please provide a message" short-circuit
// ---------------------------------------------------------------------------

describe('T16 agentRequest_emptyContentAllowedWhenImagesPresent', () => {
  it('does not return early error when content is empty but attachments are present', async () => {
    const mockClient = makeMockClient();

    const result = await processAgentRequest(
      baseRequest({
        content: '',
        attachments: [{ url: 'https://cdn.discordapp.com/attachments/1/2/img.png', mimeType: 'image/png' }],
      }),
      makeConfig(),
      mockClient as never
    );

    expect(result.content).not.toBe('Please provide a message.');
    expect(mockClient.messages.create).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// T17 — buildMessages: consecutive same-role context messages are merged
// ---------------------------------------------------------------------------

describe('T17 buildMessages_collapsesConsecutiveSameRoleMessages_inInitialContextOnly', () => {
  it('merges two adjacent user-role context messages into one', async () => {
    const ctx: ContextMessage[] = [
      { role: 'user', content: 'First message', author: 'alice' },
      { role: 'user', content: 'Second message', author: 'alice' },
    ];

    const mockClient = makeMockClient();
    await processAgentRequest(baseRequest({ context: ctx }), makeConfig(), mockClient as never);

    const callArgs = mockClient.messages.create.mock.calls[0]![0] as { messages: Anthropic.MessageParam[] };
    // Find how many user messages appear before the current turn
    const contextMessages = callArgs.messages.slice(0, -1);
    const userContextMessages = contextMessages.filter((m) => m.role === 'user');
    expect(userContextMessages).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// T18 — error path: retry without images on 400 image error, scrub on re-throw
// ---------------------------------------------------------------------------

describe('T18 agent_retriesWithoutImagesOnAnthropic400ImageError', () => {
  it('(a) removes image blocks from context on 400 image error and retries', async () => {
    const imageUrl = 'https://cdn.discordapp.com/attachments/7/8/old.png';
    const ctxWithImage: ContextMessage = {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
      ] as Anthropic.ContentBlockParam[],
    };

    const imageError = Object.assign(new Error('Invalid image URL'), {
      status: 400,
      name: 'BadRequestError',
    });

    const mockClient = makeMockClient();
    mockClient.messages.create
      .mockRejectedValueOnce(imageError)
      .mockResolvedValueOnce(buildMockAnthropicResponse('Retry succeeded.'));

    const result = await processAgentRequest(
      baseRequest({ context: [ctxWithImage] }),
      makeConfig(),
      mockClient as never
    );

    expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
    const retryCallArgs = mockClient.messages.create.mock.calls[1]![0] as { messages: Anthropic.MessageParam[] };
    const retryJson = JSON.stringify(retryCallArgs.messages);
    expect(retryJson).not.toContain('"type":"image"');
    // The image-only message must be replaced with text, not become empty
    expect(retryCallArgs.messages.some(
      (m) => Array.isArray(m.content) && (m.content as Anthropic.ContentBlockParam[]).some(
        (b) => b.type === 'text' && (b as Anthropic.TextBlockParam).text.includes('image removed')
      )
    )).toBe(true);
    expect(result.content).toBe('Retry succeeded.');
  });

  it('(b) scrubs CDN URLs from error message when both calls fail', async () => {
    const imageUrl = 'https://cdn.discordapp.com/attachments/9/0/bad.png';
    const ctxWithImage: ContextMessage = {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
      ] as Anthropic.ContentBlockParam[],
    };

    const imageError = Object.assign(
      new Error(`Invalid image at ${imageUrl}`),
      { status: 400, name: 'BadRequestError' }
    );

    const mockClient = makeMockClient();
    mockClient.messages.create
      .mockRejectedValueOnce(imageError)
      .mockRejectedValueOnce(new Error('Still failing'));

    const result = await processAgentRequest(
      baseRequest({ context: [ctxWithImage] }),
      makeConfig(),
      mockClient as never
    );

    expect(result.content).not.toMatch(/cdn\.discordapp\.com\/attachments/);
    expect(result.content).not.toMatch(/media\.discordapp\.net\/attachments/);
  });
});

// ---------------------------------------------------------------------------
// T19 — log scrub: CDN URLs in messages array are scrubbed before logging
// ---------------------------------------------------------------------------

describe('T19 agent_scrubsCdnUrlsFromSerializedMessagesLog', () => {
  it('warn-level log output does not contain raw cdn.discordapp.com or media.discordapp.net URLs', async () => {
    const cdnUrl = 'https://cdn.discordapp.com/attachments/1/2/secret.png?ex=abc&is=def&hm=xyz';
    const mediaUrl = 'https://media.discordapp.net/attachments/3/4/photo.jpg?ex=111&is=222';

    const ctxWithImages: ContextMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: cdnUrl } },
        ] as Anthropic.ContentBlockParam[],
      },
    ];

    const imageError = Object.assign(
      new Error(`Failed: ${mediaUrl}`),
      { status: 400, name: 'BadRequestError' }
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockClient = makeMockClient();
    mockClient.messages.create
      .mockRejectedValueOnce(imageError)
      .mockResolvedValueOnce(buildMockAnthropicResponse('ok'));

    await processAgentRequest(
      baseRequest({ context: ctxWithImages }),
      makeConfig(),
      mockClient as never
    );

    for (const call of warnSpy.mock.calls) {
      const logText = call.map(String).join(' ');
      expect(logText).not.toMatch(/cdn\.discordapp\.com\/attachments/);
      expect(logText).not.toMatch(/media\.discordapp\.net\/attachments/);
    }

    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// T20 — buildMessages: Discord CDN URL produces correct image block shape
// ---------------------------------------------------------------------------

describe('T20 buildMessages_producesUrlSourceImageBlock_forDiscordCdnStyleUrl', () => {
  it('attachment produces {type:"image", source:{type:"url", url}} block', async () => {
    const discordUrl = 'https://cdn.discordapp.com/attachments/100/200/screenshot.png?ex=aaa&is=bbb';
    const mockClient = makeMockClient();

    await processAgentRequest(
      baseRequest({
        content: 'Look at this',
        attachments: [{ url: discordUrl, mimeType: 'image/png' }],
      }),
      makeConfig(),
      mockClient as never
    );

    const callArgs = mockClient.messages.create.mock.calls[0]![0] as { messages: Anthropic.MessageParam[] };
    const userTurn = callArgs.messages[callArgs.messages.length - 1];
    const blocks = userTurn?.content as Anthropic.ContentBlockParam[];

    const imageBlock = blocks.find((b) => b.type === 'image') as Anthropic.ImageBlockParam | undefined;
    expect(imageBlock).toBeDefined();
    expect(imageBlock?.source.type).toBe('url');
    if (imageBlock?.source.type === 'url') {
      expect(imageBlock.source.url).toBe(discordUrl);
    }
  });
});

// ---------------------------------------------------------------------------
// T21 — collapseConsecutiveRoles scoped to initial context, not tool loop
// ---------------------------------------------------------------------------

describe('T21 collapseConsecutiveRoles_scopedToInitialContext_notToolLoop', () => {
  it('initial context collapsed; tool_use + tool_result adjacent turns preserved verbatim', async () => {
    const ctx: ContextMessage[] = [
      { role: 'user', content: 'Req A', author: 'alice' },
      { role: 'user', content: 'Req B', author: 'alice' },
    ];

    const toolUseResponse = {
      id: 'msg_tool_21',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'tu_21',
          name: 'list_linear_issues',
          input: {},
        } as Anthropic.ToolUseBlock,
      ],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'tool_use',
      stop_sequence: null,
      usage: { input_tokens: 50, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    } as unknown as Anthropic.Message;

    const mockClient = makeMockClient();
    mockClient.messages.create
      .mockResolvedValueOnce(toolUseResponse)
      .mockResolvedValueOnce(buildMockAnthropicResponse('Done T21.'));

    await processAgentRequest(
      baseRequest({ context: ctx, tier: 'premium' }),
      makeConfig(),
      mockClient as never
    );

    expect(mockClient.messages.create).toHaveBeenCalledTimes(2);

    const secondCallArgs = mockClient.messages.create.mock.calls[1]![0] as { messages: Anthropic.MessageParam[] };
    const msgs = secondCallArgs.messages;

    // The tool_use block and tool_result must be adjacent in the array
    const assistantToolUseIdx = msgs.findIndex(
      (m) =>
        m.role === 'assistant' &&
        Array.isArray(m.content) &&
        (m.content as Anthropic.ContentBlockParam[]).some((b) => b.type === 'tool_use')
    );
    const toolResultIdx = msgs.findIndex(
      (m) =>
        m.role === 'user' &&
        Array.isArray(m.content) &&
        (m.content as Anthropic.ToolResultBlockParam[]).some((b) => b.type === 'tool_result')
    );

    expect(assistantToolUseIdx).toBeGreaterThan(-1);
    expect(toolResultIdx).toBe(assistantToolUseIdx + 1);

    // The context slice (before current user turn) should have had the 2 user
    // messages collapsed to 1. Count user messages that came before the tool loop.
    const priorToToolLoop = msgs.slice(0, assistantToolUseIdx);
    const priorUserMsgs = priorToToolLoop.filter((m) => m.role === 'user');
    // 1 collapsed context entry + 1 current user turn = 2 user entries before tool loop
    // But collapsed context is 1, plus current turn is 1 = 2 total user entries pre-tool-loop
    expect(priorUserMsgs.length).toBeLessThanOrEqual(2);
    // The two context messages should have been collapsed to 1 (not 2) context entries
    // priorUserMsgs = [collapsed-context, current-turn] = 2, so context part = 1
    expect(priorUserMsgs.length).toBe(2); // collapsed(1) + currentTurn(1)
  });
});

// ---------------------------------------------------------------------------
// T22 — ENABLE_VISION=false suppresses image blocks at buildMessages level
// ---------------------------------------------------------------------------

describe('T22 buildMessages_suppressesHistoricalImageBlocksWhenVisionDisabled', () => {
  it('removes image blocks from context and replaces with text when ENABLE_VISION=false', async () => {
    process.env['ENABLE_VISION'] = 'false';

    const imageUrl = 'https://cdn.discordapp.com/attachments/11/22/hidden.png';
    const ctxWithImage: ContextMessage = {
      role: 'user',
      content: [
        { type: 'text', text: 'here is an image' },
        { type: 'image', source: { type: 'url', url: imageUrl } },
      ] as Anthropic.ContentBlockParam[],
      author: 'bob',
    };

    const mockClient = makeMockClient();
    await processAgentRequest(baseRequest({ context: [ctxWithImage] }), makeConfig(), mockClient as never);

    const callArgs = mockClient.messages.create.mock.calls[0]![0] as { messages: Anthropic.MessageParam[] };
    const serialized = JSON.stringify(callArgs.messages);

    expect(serialized).not.toContain('"type":"image"');
    expect(serialized).not.toContain(imageUrl);

    const contextMsg = callArgs.messages[0];
    expect(contextMsg).toBeDefined();
    if (Array.isArray(contextMsg?.content)) {
      const hasText = (contextMsg.content as Anthropic.ContentBlockParam[]).some(
        (b) => b.type === 'text'
      );
      expect(hasText).toBe(true);
    }
  });
});
