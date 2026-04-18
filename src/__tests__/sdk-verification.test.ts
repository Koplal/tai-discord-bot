/**
 * SDK verification test: asserts that the installed @anthropic-ai/sdk
 * supports the ImageBlockParam shape required for vision (COD-992).
 */
import type Anthropic from '@anthropic-ai/sdk';

describe('Anthropic SDK version verification', () => {
  it('ImageBlockParam with url source type-checks at compile time', () => {
    // This is a compile-time assertion. If the SDK does not have the correct
    // shape for ImageBlockParam, this assignment will fail at `tsc` time.
    const block: Anthropic.ImageBlockParam = {
      type: 'image',
      source: {
        type: 'url',
        url: 'https://cdn.discordapp.com/attachments/123/456/image.png',
      },
    };

    expect(block.type).toBe('image');
    expect(block.source.type).toBe('url');
  });

  it('ContentBlockParam union includes ImageBlockParam', () => {
    const blocks: Anthropic.ContentBlockParam[] = [
      { type: 'text', text: 'Hello' },
      {
        type: 'image',
        source: {
          type: 'url',
          url: 'https://cdn.discordapp.com/attachments/123/456/image.png',
        },
      },
    ];

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.type).toBe('text');
    expect(blocks[1]?.type).toBe('image');
  });
});
