import { scrubDiscordCdnUrls } from './log-scrub.js';

describe('scrubDiscordCdnUrls', () => {
  it('replaces cdn.discordapp.com URL path with [REDACTED]', () => {
    const input =
      'https://cdn.discordapp.com/attachments/123/456/image.png?ex=abc&is=def&hm=xyz';
    const result = scrubDiscordCdnUrls(input);
    expect(result).toBe('https://cdn.discordapp.com/[REDACTED]');
  });

  it('replaces media.discordapp.net URL path with [REDACTED]', () => {
    const input =
      'https://media.discordapp.net/attachments/789/012/photo.jpg?ex=111&is=222';
    const result = scrubDiscordCdnUrls(input);
    expect(result).toBe('https://media.discordapp.net/[REDACTED]');
  });

  it('leaves non-Discord URLs untouched', () => {
    const input = 'https://example.com/image.png?foo=bar';
    const result = scrubDiscordCdnUrls(input);
    expect(result).toBe('https://example.com/image.png?foo=bar');
  });

  it('handles multiple Discord URLs in one string', () => {
    const input =
      'First: https://cdn.discordapp.com/attachments/1/2/a.png?ex=1 ' +
      'Second: https://media.discordapp.net/attachments/3/4/b.jpg?ex=2';
    const result = scrubDiscordCdnUrls(input);
    expect(result).toBe(
      'First: https://cdn.discordapp.com/[REDACTED] ' +
        'Second: https://media.discordapp.net/[REDACTED]'
    );
  });

  it('scrubs URLs embedded in JSON-serialized form', () => {
    const obj = {
      url: 'https://cdn.discordapp.com/attachments/123/456/image.png?ex=token',
    };
    const json = JSON.stringify(obj);
    const result = scrubDiscordCdnUrls(json);
    // JSON uses double-quotes, so the URL is terminated by " in the regex
    expect(result).toContain('cdn.discordapp.com/[REDACTED]');
    expect(result).not.toContain('ex=token');
  });

  it('returns empty string unchanged', () => {
    expect(scrubDiscordCdnUrls('')).toBe('');
  });

  it('returns string with no URLs unchanged', () => {
    const input = 'No URLs here, just plain text.';
    expect(scrubDiscordCdnUrls(input)).toBe(input);
  });
});
