/**
 * W4 tests for messageCreate.ts — T22, T23 from COD-992 plan §4.
 *
 * T22  messageCreate_extractsImageAttachmentsFromMention
 * T23  messageCreate_stripsMentionBeforeAgentCall_preservingAttachments
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client, Message } from 'discord.js';
import type { BotConfig } from '../types.js';
import { buildMockAttachment, buildMockMessage } from '../__fixtures__/discord.fixtures.js';

// ---------------------------------------------------------------------------
// Module mocks — boundary mocks only (external services)
// ---------------------------------------------------------------------------

vi.mock('../services/agent.js', () => ({
  processAgentRequest: vi.fn().mockResolvedValue({
    content: 'OK',
    tokensUsed: 10,
    processingTimeMs: 5,
  }),
}));

vi.mock('../services/context-collector.js', () => ({
  collectContext: vi.fn().mockResolvedValue([]),
  collectThreadContext: vi.fn().mockResolvedValue([]),
  collectReplyContext: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/response-formatter.js', () => ({
  formatResponse: vi.fn((r: string) => r),
}));

vi.mock('../middleware/rate-limiter.js', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock('../middleware/permissions.js', () => ({
  checkPermissions: vi.fn().mockReturnValue({ allowed: true, tier: 'admin' }),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { handleMessageCreate } from './messageCreate.js';
import { processAgentRequest } from '../services/agent.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOT_ID = 'BOT_USER_ID_001';

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

function makeClient(): Client {
  return {
    user: { id: BOT_ID },
  } as unknown as Client;
}

/**
 * Build a minimal Message that looks like an @TAIBot mention.
 *
 * The message content already has the mention prefix stripped to what
 * messageCreate.ts does internally: we simulate a message that has the
 * raw Discord mention token in `content` plus our attachment list, and
 * we make `mentions.has()` return true for the bot's user ID.
 */
function makeMentionMessage(overrides: {
  promptText?: string;
  attachments?: ReturnType<typeof buildMockAttachment>[];
  isThread?: boolean;
  hasReference?: boolean;
} = {}): Message {
  const { promptText = 'what is in this image?', attachments = [], isThread = false, hasReference = false } = overrides;

  const rawContent = `<@${BOT_ID}> ${promptText}`.trim();

  const msg = buildMockMessage({
    content: rawContent,
    attachments,
    reference: hasReference ? { messageId: '123' } : null,
  });

  // Override mentions.has so the bot thinks it was mentioned
  (msg as unknown as Record<string, unknown>).mentions = { has: () => true };

  // Override channel shape
  const channel = {
    type: 0, // GuildText
    isThread: () => isThread,
    sendTyping: vi.fn().mockResolvedValue(undefined),
    name: 'general',
    send: vi.fn().mockResolvedValue(undefined),
    messages: {
      fetch: vi.fn().mockResolvedValue(new Map()),
    },
  };
  (msg as unknown as Record<string, unknown>).channel = channel;

  // Override guild
  (msg as unknown as Record<string, unknown>).guild = {
    members: {
      fetch: vi.fn().mockResolvedValue(null),
    },
  };

  // Override reply / react
  (msg as unknown as Record<string, unknown>).reply = vi.fn().mockResolvedValue(undefined);
  (msg as unknown as Record<string, unknown>).react = vi.fn().mockResolvedValue(undefined);
  (msg as unknown as Record<string, unknown>).reactions = {
    cache: {
      get: () => ({
        users: { remove: vi.fn().mockResolvedValue(undefined) },
      }),
    },
  };

  return msg;
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env['ENABLE_VISION'];
});

afterEach(() => {
  delete process.env['ENABLE_VISION'];
});

// ---------------------------------------------------------------------------
// T22 — messageCreate_extractsImageAttachmentsFromMention
// ---------------------------------------------------------------------------

describe('T22 messageCreate_extractsImageAttachmentsFromMention', () => {
  it('passes 2 image attachments to processAgentRequest when message has 2 images', async () => {
    const img1 = buildMockAttachment({
      id: '100',
      url: 'https://cdn.discordapp.com/attachments/1/2/a.png',
      contentType: 'image/png',
      size: 1024,
    });
    const img2 = buildMockAttachment({
      id: '101',
      url: 'https://cdn.discordapp.com/attachments/1/2/b.jpeg',
      contentType: 'image/jpeg',
      size: 2048,
    });

    const message = makeMentionMessage({
      promptText: 'what is in these images?',
      attachments: [img1, img2],
    });

    await handleMessageCreate(message, makeClient(), makeConfig());

    expect(processAgentRequest).toHaveBeenCalledOnce();
    const [request] = (processAgentRequest as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(request.attachments).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// T23 — messageCreate_stripsMentionBeforeAgentCall_preservingAttachments
// ---------------------------------------------------------------------------

describe('T23 messageCreate_stripsMentionBeforeAgentCall_preservingAttachments', () => {
  it('strips the mention token from content but still forwards attachments', async () => {
    const img = buildMockAttachment({
      id: '200',
      url: 'https://cdn.discordapp.com/attachments/1/2/photo.png',
      contentType: 'image/png',
      size: 512,
    });

    const message = makeMentionMessage({
      promptText: 'describe this screenshot',
      attachments: [img],
    });

    await handleMessageCreate(message, makeClient(), makeConfig());

    expect(processAgentRequest).toHaveBeenCalledOnce();
    const [request] = (processAgentRequest as ReturnType<typeof vi.fn>).mock.calls[0]!;

    // Mention token must be stripped from content
    expect(request.content).not.toMatch(/<@!?BOT_USER_ID_001>/);
    expect(request.content).toBe('describe this screenshot');

    // Attachment still forwarded
    expect(request.attachments).toHaveLength(1);
    expect(request.attachments[0].url).toBe('https://cdn.discordapp.com/attachments/1/2/photo.png');
  });
});
