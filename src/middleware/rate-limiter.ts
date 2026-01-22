import type { RateLimitResult, TokenBucket, UserTier } from '../types.js';

/**
 * In-memory rate limit storage
 * TODO: Replace with Redis for production (multi-instance support)
 */
const rateLimits = new Map<string, TokenBucket>();

/**
 * Rate limit configuration by tier
 */
const RATE_LIMITS: Record<UserTier, { maxTokens: number; refillRate: number }> = {
  free: {
    maxTokens: 5, // Burst capacity
    refillRate: 10 / 60, // 10 requests per minute = 0.167 tokens/sec
  },
  premium: {
    maxTokens: 10, // Higher burst capacity
    refillRate: 60 / 60, // 60 requests per minute = 1 token/sec
  },
  admin: {
    maxTokens: 100, // Very high burst
    refillRate: 1000 / 60, // Effectively unlimited
  },
};

/**
 * Check if a user is rate limited
 */
export async function checkRateLimit(
  userId: string,
  tier: UserTier = 'free'
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[tier];
  const now = Date.now() / 1000;
  const key = `rate:${userId}`;

  let bucket = rateLimits.get(key);

  if (!bucket) {
    // Initialize new bucket
    bucket = {
      tokens: config.maxTokens,
      lastRefillTime: now,
      maxTokens: config.maxTokens,
      refillRate: config.refillRate,
    };
  } else {
    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefillTime;
    const tokensToAdd = timePassed * config.refillRate;
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefillTime = now;
    // Update config in case tier changed
    bucket.maxTokens = config.maxTokens;
    bucket.refillRate = config.refillRate;
  }

  if (bucket.tokens >= 1) {
    // Consume a token
    bucket.tokens -= 1;
    rateLimits.set(key, bucket);

    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
    };
  }

  // Calculate when a token will be available
  const timeUntilRefill = (1 - bucket.tokens) / config.refillRate;
  const resetAt = new Date((now + timeUntilRefill) * 1000);

  rateLimits.set(key, bucket);

  return {
    allowed: false,
    remaining: 0,
    resetAt,
    reason: 'Rate limit exceeded',
  };
}

/**
 * Reset rate limit for a user (admin function)
 */
export function resetRateLimit(userId: string): void {
  rateLimits.delete(`rate:${userId}`);
}

/**
 * Get current rate limit status for a user
 */
export function getRateLimitStatus(userId: string, tier: UserTier = 'free'): TokenBucket | null {
  const key = `rate:${userId}`;
  const bucket = rateLimits.get(key);

  if (!bucket) {
    const config = RATE_LIMITS[tier];
    return {
      tokens: config.maxTokens,
      lastRefillTime: Date.now() / 1000,
      maxTokens: config.maxTokens,
      refillRate: config.refillRate,
    };
  }

  return bucket;
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits(maxAgeSeconds: number = 3600): number {
  const now = Date.now() / 1000;
  let cleaned = 0;

  for (const [key, bucket] of rateLimits.entries()) {
    if (now - bucket.lastRefillTime > maxAgeSeconds) {
      rateLimits.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}
