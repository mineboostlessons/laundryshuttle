// =============================================================================
// In-Memory Sliding Window Rate Limiter
// =============================================================================
// Simple rate limiter for serverless environments. Uses a Map-based
// sliding window counter. Automatically cleans up expired entries.
// For production at scale, consider upgrading to Redis-based (Upstash).
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60_000);
  // Allow process to exit if this is the only thing keeping it alive
  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key.
 * Returns headers-compatible result for use in API routes.
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  ensureCleanup();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry or expired window — start fresh
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowSeconds * 1000;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt,
    };
  }

  // Within window — increment
  entry.count++;

  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit headers for a NextResponse.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
    ...(result.success ? {} : { "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString() }),
  };
}

// =============================================================================
// Pre-configured rate limiters for common use cases
// =============================================================================

/** Auth endpoints: 10 requests per minute per IP */
export const AUTH_RATE_LIMIT: RateLimitConfig = { limit: 10, windowSeconds: 60 };

/** API routes: 60 requests per minute per IP */
export const API_RATE_LIMIT: RateLimitConfig = { limit: 60, windowSeconds: 60 };

/** Webhook receivers: 100 requests per minute per IP */
export const WEBHOOK_RATE_LIMIT: RateLimitConfig = { limit: 100, windowSeconds: 60 };

/** SMS/Email sending: 5 per minute per user (prevent abuse) */
export const NOTIFICATION_RATE_LIMIT: RateLimitConfig = { limit: 5, windowSeconds: 60 };
