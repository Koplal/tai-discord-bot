/**
 * Tests for tai.ts — parseTaiCommand with attachment option (W5).
 */

import { describe, it, expect } from 'vitest';
import { buildMockAttachment, buildMockInteraction } from '../__fixtures__/discord.fixtures.js';
import { parseTaiCommand } from './tai.js';
import type { TaiCommandInteraction } from './tai.js';

describe('parseTaiCommand', () => {
  it('returns image attachment when getAttachment("image") returns one', () => {
    const attachment = buildMockAttachment({
      id: '111222333444555666',
      url: 'https://cdn.discordapp.com/attachments/1/2/img.png?ex=abc&is=def&hm=xyz',
      contentType: 'image/png',
    });

    const interaction = buildMockInteraction({
      subcommand: 'ask',
      getString: (name: string) => (name === 'prompt' ? 'describe this' : null),
      getAttachment: (name: string) => (name === 'image' ? attachment : null),
    });

    const result = parseTaiCommand(interaction as unknown as TaiCommandInteraction);

    expect(result.subcommand).toBe('ask');
    expect(result.prompt).toBe('describe this');
    expect(result.image).toBe(attachment);
  });

  it('returns undefined image when getAttachment returns null', () => {
    const interaction = buildMockInteraction({
      subcommand: 'ask',
      getString: (name: string) => (name === 'prompt' ? 'hi' : null),
      getAttachment: (_name: string) => null,
    });

    const result = parseTaiCommand(interaction as unknown as TaiCommandInteraction);

    expect(result.subcommand).toBe('ask');
    expect(result.prompt).toBe('hi');
    expect(result.image).toBeUndefined();
  });

  it('does not set image for create-issue subcommand', () => {
    const interaction = buildMockInteraction({
      subcommand: 'create-issue',
      getString: (name: string) => {
        if (name === 'description') return 'Fix the bug';
        return null;
      },
      getAttachment: (_name: string) => null,
    });

    const result = parseTaiCommand(interaction as unknown as TaiCommandInteraction);

    expect(result.subcommand).toBe('create-issue');
    expect(result.image).toBeUndefined();
  });
});
