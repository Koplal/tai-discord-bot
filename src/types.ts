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
  taiApiUrl: string;
  taiDiscordSecret: string;
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
    'TAI_API_URL',
    'TAI_DISCORD_SECRET',
  ] as const;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    discordToken: process.env.DISCORD_BOT_TOKEN!,
    discordClientId: process.env.DISCORD_CLIENT_ID!,
    discordGuildId: process.env.DISCORD_GUILD_ID!,
    taiApiUrl: process.env.TAI_API_URL!,
    taiDiscordSecret: process.env.TAI_DISCORD_SECRET!,
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
 * Extract relevant info from a Discord message
 */
export function messageToContext(message: Message): ContextMessage {
  return {
    role: message.author.bot ? 'assistant' : 'user',
    content: message.content,
    author: message.author.username,
    timestamp: message.createdAt.toISOString(),
  };
}
