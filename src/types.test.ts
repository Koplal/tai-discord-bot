/**
 * W2 tests for messageToContext — image extraction from Discord attachments.
 *
 * Tests T1–T6 from COD-992 plan §4.
 */

import { describe, it, expect } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { messageToContext } from './types.js';
import { buildMockMessage, buildMockAttachment } from './__fixtures__/discord.fixtures.js';

// ---------------------------------------------------------------------------
// T1 — messageToContext extracts a PNG image attachment into content blocks
// ---------------------------------------------------------------------------

describe('T1 messageToContext_extractsImageAttachment', () => {
  it('returns ContentBlockParam[] with text and image blocks when PNG attachment present', () => {
    const attachment = buildMockAttachment({
      id: '100000000000000001',
      url: 'https://cdn.discordapp.com/attachments/1/2/photo.png?ex=abc&is=def',
      contentType: 'image/png',
      spoiler: false,
      size: 204800, // 200KB — well under 10MB cap
    });

    const message = buildMockMessage({
      content: 'What is in this image?',
      attachments: [attachment],
    });

    const result = messageToContext(message);

    expect(result.role).toBe('user');
    expect(Array.isArray(result.content)).toBe(true);

    const blocks = result.content as Anthropic.ContentBlockParam[];

    // First block: text
    const textBlock = blocks.find((b) => b.type === 'text') as Anthropic.TextBlockParam | undefined;
    expect(textBlock).toBeDefined();
    expect(textBlock?.text).toBe('What is in this image?');

    // Second block: image
    const imageBlock = blocks.find((b) => b.type === 'image') as Anthropic.ImageBlockParam | undefined;
    expect(imageBlock).toBeDefined();
    expect(imageBlock?.source.type).toBe('url');
    if (imageBlock?.source.type === 'url') {
      expect(imageBlock.source.url).toBe(
        'https://cdn.discordapp.com/attachments/1/2/photo.png?ex=abc&is=def'
      );
    }
  });
});

// ---------------------------------------------------------------------------
// T2 — messageToContext drops non-image attachments (PDF)
// ---------------------------------------------------------------------------

describe('T2 messageToContext_filtersNonImageMimeTypes', () => {
  it('returns plain string content when only a PDF attachment is present', () => {
    const attachment = buildMockAttachment({
      id: '100000000000000002',
      url: 'https://cdn.discordapp.com/attachments/1/2/document.pdf',
      contentType: 'application/pdf',
      spoiler: false,
      size: 500000,
    });

    const message = buildMockMessage({
      content: 'Please review this doc',
      attachments: [attachment],
    });

    const result = messageToContext(message);

    expect(result.role).toBe('user');
    // Non-image attachment dropped → string content, backwards compat
    expect(typeof result.content).toBe('string');
    expect(result.content).toBe('Please review this doc');
  });
});

// ---------------------------------------------------------------------------
// T3 — messageToContext treats null contentType as non-image (filtered out)
// ---------------------------------------------------------------------------

describe('T3 messageToContext_handlesNullContentType', () => {
  it('returns plain string content when attachment contentType is null', () => {
    const attachment = buildMockAttachment({
      id: '100000000000000003',
      url: 'https://cdn.discordapp.com/attachments/1/2/unknown',
      contentType: null,
      spoiler: false,
      size: 1024,
    });

    const message = buildMockMessage({
      content: 'Some text',
      attachments: [attachment],
    });

    const result = messageToContext(message);

    expect(typeof result.content).toBe('string');
    expect(result.content).toBe('Some text');
  });
});

// ---------------------------------------------------------------------------
// T4 — messageToContext: text-only message stays as plain string (backwards compat)
// ---------------------------------------------------------------------------

describe('T4 messageToContext_preservesStringContentForTextOnlyMessage', () => {
  it('returns a plain string when no attachments are present', () => {
    const message = buildMockMessage({
      content: 'Just a normal text message',
      attachments: [],
    });

    const result = messageToContext(message);

    expect(result.role).toBe('user');
    expect(typeof result.content).toBe('string');
    expect(result.content).toBe('Just a normal text message');
  });
});

// ---------------------------------------------------------------------------
// T5 — messageToContext filters out spoiler-marked image attachments
// ---------------------------------------------------------------------------

describe('T5 messageToContext_respectsSpoilerFlag', () => {
  it('filters out an image attachment marked as spoiler', () => {
    const attachment = buildMockAttachment({
      id: '100000000000000005',
      url: 'https://cdn.discordapp.com/attachments/1/2/SPOILER_img.png',
      contentType: 'image/png',
      spoiler: true,
      size: 204800,
    });

    const message = buildMockMessage({
      content: 'Spoiler image here',
      attachments: [attachment],
    });

    const result = messageToContext(message);

    // Spoiler image dropped → content stays as plain string
    expect(typeof result.content).toBe('string');
    expect(result.content).toBe('Spoiler image here');
  });
});

// ---------------------------------------------------------------------------
// T6 — messageToContext accepts contentType with charset suffix (prefix match)
// ---------------------------------------------------------------------------

describe('T6 messageToContext_acceptsContentTypeWithCharset', () => {
  it('passes image/png; charset=utf-8 through the filter (prefix match)', () => {
    const attachment = buildMockAttachment({
      id: '100000000000000006',
      url: 'https://cdn.discordapp.com/attachments/1/2/charset_img.png',
      contentType: 'image/png; charset=utf-8',
      spoiler: false,
      size: 204800,
    });

    const message = buildMockMessage({
      content: 'Image with charset content-type',
      attachments: [attachment],
    });

    const result = messageToContext(message);

    expect(Array.isArray(result.content)).toBe(true);

    const blocks = result.content as Anthropic.ContentBlockParam[];
    const imageBlock = blocks.find((b) => b.type === 'image') as Anthropic.ImageBlockParam | undefined;
    expect(imageBlock).toBeDefined();
    if (imageBlock?.source.type === 'url') {
      expect(imageBlock.source.url).toBe(
        'https://cdn.discordapp.com/attachments/1/2/charset_img.png'
      );
    }
  });
});
