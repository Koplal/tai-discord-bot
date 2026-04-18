/**
 * W4 tests for imageFilter.ts — T24, T25, T26 from COD-992 plan §4.
 *
 * T24  imageFilter_rejectsOversizedPayload
 * T25  imageFilter_capsAt2ImagesPerRequest
 * T26  imageFilter_returnsEmptyWhenVisionDisabled
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Collection } from 'discord.js';
import type { Attachment } from 'discord.js';
import { buildMockAttachment } from '../__fixtures__/discord.fixtures.js';
import { filterImageAttachments } from './imageFilter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCollection(attachments: Attachment[]): Collection<string, Attachment> {
  return new Collection(attachments.map((a) => [a.id, a]));
}

beforeEach(() => {
  delete process.env['ENABLE_VISION'];
});

afterEach(() => {
  delete process.env['ENABLE_VISION'];
});

// ---------------------------------------------------------------------------
// T24 — imageFilter_rejectsOversizedPayload
// ---------------------------------------------------------------------------

describe('T24 imageFilter_rejectsOversizedPayload', () => {
  it('filters out attachments with size > 10MB', () => {
    const oversized = buildMockAttachment({
      id: '111',
      size: 10 * 1024 * 1024 + 1, // 1 byte over cap
      contentType: 'image/png',
    });
    const normal = buildMockAttachment({
      id: '222',
      size: 204800, // 200 KB — within cap
      contentType: 'image/jpeg',
    });

    const result = filterImageAttachments(makeCollection([oversized, normal]));

    expect(result).toHaveLength(1);
    expect(result[0]!.mimeType).toBe('image/jpeg');
  });

  it('excludes an attachment at exactly the cap limit (> not >=)', () => {
    // 10MB exactly is NOT oversized — only strictly > 10MB is rejected
    const exactCap = buildMockAttachment({
      id: '333',
      size: 10 * 1024 * 1024,
      contentType: 'image/png',
    });

    const result = filterImageAttachments(makeCollection([exactCap]));
    // Exactly at the boundary passes — > means strictly greater than
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// T25 — imageFilter_capsAt2ImagesPerRequest
// ---------------------------------------------------------------------------

describe('T25 imageFilter_capsAt2ImagesPerRequest', () => {
  it('returns at most 2 images from 5 valid attachments', () => {
    const attachments = Array.from({ length: 5 }, (_, i) =>
      buildMockAttachment({
        id: String(100 + i),
        size: 1024,
        contentType: 'image/png',
        url: `https://cdn.discordapp.com/attachments/1/2/image${i}.png`,
      })
    );

    const result = filterImageAttachments(makeCollection(attachments));

    expect(result).toHaveLength(2);
  });

  it('respects a custom cap argument', () => {
    const attachments = Array.from({ length: 5 }, (_, i) =>
      buildMockAttachment({
        id: String(200 + i),
        size: 1024,
        contentType: 'image/webp',
        url: `https://cdn.discordapp.com/attachments/1/2/image${i}.webp`,
      })
    );

    const result = filterImageAttachments(makeCollection(attachments), 3);

    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// T26 — imageFilter_returnsEmptyWhenVisionDisabled (table-driven)
// ---------------------------------------------------------------------------

describe('T26 imageFilter_returnsEmptyWhenVisionDisabled', () => {
  const attachment = buildMockAttachment({
    id: '999',
    size: 1024,
    contentType: 'image/png',
  });
  const collection = makeCollection([attachment]);

  // Values that disable vision — should return []
  const disabledCases: Array<string> = [
    'false',
    'FALSE',
    '0',
    'no',
    'off',
    '  false  ', // padded
    '  FALSE  ', // padded uppercase
    ' 0 ',       // padded
    ' no ',      // padded
    ' off ',     // padded
  ];

  for (const value of disabledCases) {
    it(`ENABLE_VISION=${JSON.stringify(value)} → returns []`, () => {
      process.env['ENABLE_VISION'] = value;
      const result = filterImageAttachments(collection);
      expect(result).toHaveLength(0);
    });
  }

  // Values that enable vision (or default) — should pass images through
  const enabledCases: Array<string | undefined> = [
    undefined, // default → enabled
    'true',
    '1',
  ];

  for (const value of enabledCases) {
    it(`ENABLE_VISION=${JSON.stringify(value)} → passes images through`, () => {
      if (value === undefined) {
        delete process.env['ENABLE_VISION'];
      } else {
        process.env['ENABLE_VISION'] = value;
      }
      const result = filterImageAttachments(collection);
      expect(result.length).toBeGreaterThan(0);
    });
  }
});
