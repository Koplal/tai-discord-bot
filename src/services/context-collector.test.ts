/**
 * W2 tests for context-collector — default limit bump (10→15) and image carry-through.
 *
 * Tests T7–T11 from COD-992 plan §4.
 */

import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import type { Message } from 'discord.js';
import { buildMockMessage, buildMockAttachment, buildMockTextChannel } from '../__fixtures__/discord.fixtures.js';
import { collectContext, collectThreadContext, collectReplyContext } from './context-collector.js';

// ---------------------------------------------------------------------------
// T7 — collectContext: default limit is 15
// ---------------------------------------------------------------------------

describe('T7 collectContext_defaultLimitIs15', () => {
  it('calls channel.messages.fetch with limit 15 when no limit argument is provided', async () => {
    // discord.js Collection.map() returns an array; simulate that
    const fetchSpy = vi.fn().mockResolvedValue({ map: (_fn: unknown) => [] });

    const channel = {
      id: '1',
      messages: { fetch: fetchSpy },
    } as never;

    await collectContext(channel);

    expect(fetchSpy).toHaveBeenCalledWith({ limit: 15 });
  });
});

// ---------------------------------------------------------------------------
// T8 — collectContext: messages returned oldest first
// ---------------------------------------------------------------------------

describe('T8 collectContext_orderingOldestFirst', () => {
  it('returns messages in oldest-first order', async () => {
    const msg1 = buildMockMessage({
      id: '200000000000000001',
      content: 'First message',
      createdAt: new Date('2026-04-18T10:00:00.000Z'),
    });
    const msg2 = buildMockMessage({
      id: '200000000000000002',
      content: 'Second message',
      createdAt: new Date('2026-04-18T11:00:00.000Z'),
    });
    // Discord returns newest-first, so msg2 comes first in fetch result
    const channel = buildMockTextChannel({ messages: [msg2, msg1] });

    const result = await collectContext(channel as never);

    // After .reverse(), oldest (msg1) should be first
    expect(result[0]?.content).toBe('First message');
    expect(result[1]?.content).toBe('Second message');
  });
});

// ---------------------------------------------------------------------------
// T9 — collectThreadContext: image in thread message carries through to result
// ---------------------------------------------------------------------------

describe('T9 collectThreadContext_carriesImagesAcrossTurns', () => {
  it('includes image blocks from a historical thread message with an image attachment', async () => {
    const imageAttachment = buildMockAttachment({
      id: '300000000000000001',
      url: 'https://cdn.discordapp.com/attachments/thread/1/diagram.png',
      contentType: 'image/png',
      spoiler: false,
      size: 512000,
    });

    const msgWithImage = buildMockMessage({
      id: '300000000000000010',
      content: 'Check this diagram',
      attachments: [imageAttachment],
      createdAt: new Date('2026-04-18T10:00:00.000Z'),
    });

    const threadChannel = buildMockTextChannel({
      id: '400000000000000001',
      isThread: false, // no parent, simplifies test
      messages: [msgWithImage],
    });

    const result = await collectThreadContext(threadChannel as never);

    expect(result.length).toBeGreaterThan(0);
    const msgResult = result.find(
      (m) => Array.isArray(m.content) &&
        (m.content as Anthropic.ContentBlockParam[]).some((b) => b.type === 'image')
    );
    expect(msgResult).toBeDefined();

    const imageBlock = (msgResult?.content as Anthropic.ContentBlockParam[]).find(
      (b) => b.type === 'image'
    ) as Anthropic.ImageBlockParam | undefined;
    expect(imageBlock?.source.type).toBe('url');
    if (imageBlock?.source.type === 'url') {
      expect(imageBlock.source.url).toBe(
        'https://cdn.discordapp.com/attachments/thread/1/diagram.png'
      );
    }
  });
});

// ---------------------------------------------------------------------------
// T10 — collectReplyContext: default limit is 15
// ---------------------------------------------------------------------------

describe('T10 collectReplyContext_defaultLimitIs15', () => {
  it('passes limit 15 to the internal collectContext when no limit arg provided', async () => {
    // discord.js Collection.map() returns an array; simulate that shape
    const fetchSpy = vi.fn().mockResolvedValue({ map: (_fn: unknown) => [] });

    // Build a channel mock with a spy on fetch.
    // discord.js Collection.map() returns an array, so simulate that shape.
    const channelWithSpy = {
      id: '500000000000000001',
      messages: { fetch: fetchSpy },
    };

    const message = buildMockMessage({
      id: '600000000000000001',
      content: 'Reply message',
      reference: null,
    }) as Message;

    // Attach the channel mock
    (message as unknown as Record<string, unknown>).channel = channelWithSpy;

    await collectReplyContext(message);

    // collectContext is called internally with the channel and the default limit (15)
    expect(fetchSpy).toHaveBeenCalledWith({ limit: 15 });
  });
});

// ---------------------------------------------------------------------------
// T11 — collectReplyContext: image in reply chain carries through
// ---------------------------------------------------------------------------

describe('T11 collectReplyContext_imagesThroughReplyChain', () => {
  it('includes image blocks from a referenced reply message with an image', async () => {
    const imageAttachment = buildMockAttachment({
      id: '700000000000000001',
      url: 'https://cdn.discordapp.com/attachments/reply/1/screenshot.png',
      contentType: 'image/png',
      spoiler: false,
      size: 102400,
    });

    // The referenced (parent) message has an image — use a unique timestamp
    const referencedMsg = buildMockMessage({
      id: '700000000000000010',
      content: 'Here is my screenshot',
      attachments: [imageAttachment],
      // Use a distinct author+timestamp key so dedup does not filter it out
      author: { username: 'alice' },
      createdAt: new Date('2026-04-18T09:00:00.000Z'),
    });

    // The current message replies to the referenced one — distinct author+timestamp
    const currentMsg = buildMockMessage({
      id: '700000000000000020',
      content: 'What does this show?',
      attachments: [],
      author: { username: 'bob' },
      createdAt: new Date('2026-04-18T09:05:00.000Z'),
      reference: { messageId: referencedMsg.id },
    }) as Message;

    // Build channel mock that returns referencedMsg when fetched by ID
    const channelFetchSpy = vi.fn().mockImplementation(async (arg: string | { limit: number }) => {
      if (typeof arg === 'string') {
        // fetch(messageId) — return the referenced message
        return referencedMsg;
      }
      // fetch({ limit }) — return a Collection-like object (map returns array)
      return { map: (_fn: unknown) => [] };
    });

    const channelMock = {
      id: '800000000000000001',
      messages: { fetch: channelFetchSpy },
    };

    // Wire the channel onto the current message
    (currentMsg as unknown as Record<string, unknown>).channel = channelMock;
    // Also set partial: false so hydrateIfPartial skips the fetch(id) hydration
    (referencedMsg as unknown as Record<string, unknown>).partial = false;

    const result = await collectReplyContext(currentMsg);

    // The reply chain should have at least the referenced message with image content
    const msgWithImage = result.find(
      (m) =>
        Array.isArray(m.content) &&
        (m.content as Anthropic.ContentBlockParam[]).some((b) => b.type === 'image')
    );

    expect(msgWithImage).toBeDefined();
    const imageBlock = (msgWithImage?.content as Anthropic.ContentBlockParam[]).find(
      (b) => b.type === 'image'
    ) as Anthropic.ImageBlockParam | undefined;
    expect(imageBlock?.source.type).toBe('url');
    if (imageBlock?.source.type === 'url') {
      expect(imageBlock.source.url).toBe(
        'https://cdn.discordapp.com/attachments/reply/1/screenshot.png'
      );
    }
  });
});
