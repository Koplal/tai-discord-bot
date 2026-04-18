import type { Message, GuildMember } from 'discord.js';
import type { Anthropic } from '@anthropic-ai/sdk';

/**
 * User tier determines rate limits and feature access
 */
export type UserTier = 'free' | 'premium' | 'admin';

/**
 * Discord role to tier mapping
 */
export interface RolePermission {
  roleId: string;
  tier: UserTier;
  features: string[];
  requestsPerMin: number;
  maxTokensPerDay: number;
}

/**
 * Context message for agent requests
 */
export interface ContextMessage {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlockParam[];
  author?: string;
  timestamp?: string;
}

/**
 * Image attachment extracted from a Discord message
 */
export interface ImageAttachment {
  url: string;
  mimeType: string;
}

/**
 * Response from TAI backend
 */
export interface AgentResponse {
  content: string;
  actions?: AgentAction[];
  tokensUsed?: number;
  processingTimeMs?: number;
}

/**
 * Action taken by the agent (for audit logging)
 */
export interface AgentAction {
  tool: string;
  input: Record<string, unknown>;
  result: string;
  success: boolean;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: Date;
  reason?: string;
}

/**
 * Token bucket state for rate limiting
 */
export interface TokenBucket {
  tokens: number;
  lastRefillTime: number;
  maxTokens: number;
  refillRate: number;
}

/**
 * Configuration for the bot
 */
export interface BotConfig {
  discordToken: string;
  discordClientId: string;
  discordGuildId: string;
  anthropicApiKey: string;
  linearApiKey: string;
  linearTeamId: string;
  redisUrl?: string;
}

/**
 * Environment variable validation
 */
export function loadConfig(): BotConfig {
  const required = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_CLIENT_ID',
    'DISCORD_GUILD_ID',
    'ANTHROPIC_API_KEY',
    'LINEAR_API_KEY',
    'LINEAR_TEAM_ID',
  ] as const;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    discordToken: process.env.DISCORD_BOT_TOKEN!,
    discordClientId: process.env.DISCORD_CLIENT_ID!,
    discordGuildId: process.env.DISCORD_GUILD_ID!,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    linearApiKey: process.env.LINEAR_API_KEY!,
    linearTeamId: process.env.LINEAR_TEAM_ID!,
    redisUrl: process.env.REDIS_URL,
  };
}

/**
 * Get user tier from Discord member roles
 */
export function getUserTier(member: GuildMember | null, roleTiers: Map<string, RolePermission>): UserTier {
  if (!member) return 'free';

  // Check roles in priority order: admin > premium > free
  const tierOrder: UserTier[] = ['admin', 'premium', 'free'];

  for (const tier of tierOrder) {
    for (const [roleId, permission] of roleTiers) {
      if (permission.tier === tier && member.roles.cache.has(roleId)) {
        return tier;
      }
    }
  }

  return 'free';
}

/**
 * Allowed image MIME type prefixes for Discord attachments.
 * Using prefix match so variants like "image/png; charset=utf-8" are accepted.
 */
const ALLOWED_IMAGE_MIME_PREFIXES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;

/** 10 MB per-image size cap */
const IMAGE_SIZE_CAP = 10 * 1024 * 1024;

/**
 * Returns true if the given MIME type is an accepted image type.
 * Handles content-type headers with parameters (e.g. "image/png; charset=utf-8")
 * by extracting the base MIME type before the first semicolon.
 */
function isAllowedImageMime(contentType: string): boolean {
  const base = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return ALLOWED_IMAGE_MIME_PREFIXES.some((prefix) => base === prefix);
}

/**
 * Extract relevant info from a Discord message.
 * Captures both regular content and embed content (many bots use embeds).
 * If the message has image attachments that pass the filter, returns array
 * content (ContentBlockParam[]) with text + image blocks. Otherwise returns
 * a plain string (backwards compatible with text-only messages).
 */
export function messageToContext(message: Message): ContextMessage {
  const parts: string[] = [];

  // Regular message content
  if (message.content?.trim()) {
    parts.push(message.content.trim());
  }

  // Extract text from embeds (many bots send responses as embeds)
  for (const embed of message.embeds) {
    if (embed.title) parts.push(embed.title);
    if (embed.description) parts.push(embed.description);
    for (const field of embed.fields) {
      parts.push(`${field.name}: ${field.value}`);
    }
    if (embed.footer?.text) parts.push(embed.footer.text);
  }

  // Collect image blocks from attachments (filter: MIME, spoiler, size, non-null)
  const imageBlocks: Anthropic.ImageBlockParam[] = [];
  for (const attachment of message.attachments.values()) {
    // Enforce 2-image cap (matches filterImageAttachments cap)
    if (imageBlocks.length >= 2) break;
    // Reject null contentType
    if (attachment.contentType === null || attachment.contentType === undefined) continue;
    // Reject non-image MIME types (base MIME prefix match)
    if (!isAllowedImageMime(attachment.contentType)) continue;
    // Reject spoiler attachments — honor user intent
    if (attachment.spoiler) continue;
    // Reject images over 10MB
    if (attachment.size > IMAGE_SIZE_CAP) continue;

    imageBlocks.push({
      type: 'image',
      source: {
        type: 'url',
        url: attachment.url,
      },
    });
  }

  const joinedText = parts.join('\n') || '';

  // If any images survived the filter, return array content
  if (imageBlocks.length > 0) {
    const blocks: Anthropic.ContentBlockParam[] = [
      { type: 'text', text: joinedText },
      ...imageBlocks,
    ];
    return {
      role: message.author.bot ? 'assistant' : 'user',
      content: blocks,
      author: message.author.username,
      timestamp: message.createdAt.toISOString(),
    };
  }

  // No images — return plain string (backwards compatible)
  return {
    role: message.author.bot ? 'assistant' : 'user',
    content: joinedText,
    author: message.author.username,
    timestamp: message.createdAt.toISOString(),
  };
}
