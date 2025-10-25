import { Request, Response, NextFunction } from 'express';
import { env } from '@/config/env';

// Token bucket implementation
// Map of IP -> { tokens: number, lastRefill: number }
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

// Configuration
const MAX_TOKENS = env.RATE_LIMIT_PER_MIN;
const WINDOW_MS = 60 * 1000; // 1 minute in milliseconds
const REFILL_RATE = MAX_TOKENS / (WINDOW_MS / 1000); // tokens per second

/**
 * Refill tokens for a bucket based on time elapsed
 */
function refillBucket(bucket: TokenBucket): void {
  const now = Date.now();
  const timePassed = (now - bucket.lastRefill) / 1000; // seconds
  const tokensToAdd = timePassed * REFILL_RATE;

  bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

/**
 * Rate limiting middleware using token bucket algorithm
 * Limits requests per IP address
 */
export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Get or create bucket for this IP
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = {
      tokens: MAX_TOKENS,
      lastRefill: Date.now(),
    };
    buckets.set(ip, bucket);
  }

  // Refill tokens based on time elapsed
  refillBucket(bucket);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', MAX_TOKENS.toString());
  res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens).toString());

  // Check if we have tokens available
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    next();
  } else {
    // Rate limit exceeded
    const retryAfter = Math.ceil(Math.max(1, (1 - bucket.tokens) / REFILL_RATE));
    res.setHeader('Retry-After', retryAfter.toString());
    res.status(429).json({
      error: 'Too many requests',
      retryAfter,
    });
  }
}

/**
 * Clean up old buckets periodically to prevent memory leaks
 * Removes buckets that haven't been accessed in the last hour
 */
function cleanupBuckets(): void {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  for (const [ip, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > oneHour) {
      buckets.delete(ip);
    }
  }
}

/**
 * Clear all rate limit buckets (for testing)
 */
export function clearBuckets(): void {
  buckets.clear();
}

// Run cleanup every 10 minutes
// Use unref() to prevent this timer from keeping the process alive
setInterval(cleanupBuckets, 10 * 60 * 1000).unref();
