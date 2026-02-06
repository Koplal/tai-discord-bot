import type { Message, GuildMember } from 'discord.js';

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
  content: string;
  author?: string;
  timestamp?: string;
}

/**
 * Request payload sent to TAI backend
 */
export interface AgentRequest {
  content: string;
  context: {
    messages: ContextMessage[];
  };
  user: {
    discordId: string;
    username: string;
    roles: string[];
  };
  channel: {
    id: string;
    name: string | null;
  };
  guild?: {
    id: string;
    name: string;
  };
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
 * Extract relevant info from a Discord message.
 * Captures both regular content and embed content (many bots use embeds).
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

  return {
    role: message.author.bot ? 'assistant' : 'user',
    content: parts.join('\n') || '',
    author: message.author.username,
    timestamp: message.createdAt.toISOString(),
  };
}
