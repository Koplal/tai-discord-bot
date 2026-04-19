import type { Collection, Attachment } from 'discord.js';
import type { ImageAttachment } from '../types.js';
import { isVisionDisabled } from '../lib/env-flags.js';

const ALLOWED_MIME_PREFIXES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const IMAGE_SIZE_CAP = 10 * 1024 * 1024; // 10 MB per-image defense-in-depth
const DEFAULT_CAP = 2;

/**
 * Filter Discord message attachments down to valid image attachments.
 *
 * Rules applied in order:
 *  1. If ENABLE_VISION is disabled, return [] immediately.
 *  2. Skip attachments with no contentType.
 *  3. Skip non-image MIME types (png, jpeg, gif, webp allowed).
 *  4. Skip spoiler attachments (honor user intent).
 *  5. Skip attachments over 10 MB.
 *  6. Cap output at `cap` images (default 2).
 */
export function filterImageAttachments(
  attachments: Collection<string, Attachment>,
  cap: number = DEFAULT_CAP
): ImageAttachment[] {
  if (isVisionDisabled()) return [];

  const result: ImageAttachment[] = [];
  for (const attachment of attachments.values()) {
    if (result.length >= cap) break;
    if (!attachment.contentType) continue;
    const baseMime = attachment.contentType.split(';')[0]!.trim().toLowerCase();
    if (!ALLOWED_MIME_PREFIXES.includes(baseMime)) continue;
    if (attachment.spoiler) continue;
    if (attachment.size > IMAGE_SIZE_CAP) continue;
    result.push({ url: attachment.url, mimeType: baseMime });
  }
  return result;
}
