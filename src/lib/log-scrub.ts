/**
 * Log scrubbing helpers for Discord CDN URLs.
 *
 * Discord CDN URLs contain signed auth tokens (ex=, is=, hm= query params).
 * We must not log these tokens verbatim — replace the path with [REDACTED].
 */

const CDN_URL_REGEX = /(cdn\.discordapp\.com|media\.discordapp\.net)\/[^\s"'\\]+/g;

/**
 * Replace Discord CDN URL paths with [REDACTED] to avoid leaking
 * signed auth tokens into logs.
 *
 * Handles both primary CDN host and the media.discordapp.net mirror.
 *
 * @example
 * scrubDiscordCdnUrls('https://cdn.discordapp.com/attachments/123/456/img.png?ex=abc')
 * // → 'https://cdn.discordapp.com/[REDACTED]'
 */
export function scrubDiscordCdnUrls(text: string): string {
  return text.replace(CDN_URL_REGEX, '$1/[REDACTED]');
}
