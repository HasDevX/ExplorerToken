import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import * as redis from '@/services/redis';

const isTest = process.env.NODE_ENV === 'test';
const LOGIN_WINDOW_MS = 60 * 1000; // 1 minute
const LOGIN_MAX = Number(process.env.LOGIN_MAX ?? (isTest ? 100000 : 5));
const ADMIN_WINDOW_MS = 60 * 1000; // 1 minute
const ADMIN_MAX = Number(process.env.ADMIN_MAX ?? (isTest ? 100000 : 60));

/**
 * Create a Redis store for rate limiting if Redis is available
 * Returns undefined to use in-memory store as fallback
 */
function getRedisStore() {
  try {
    const client = redis.getClient();
    if (client?.isOpen) {
      return new RedisStore({
        sendCommand: (...args: string[]) => client.sendCommand(args),
      });
    }
  } catch (error) {
    // Redis not available, will use in-memory store
  }
  return undefined;
}

/** Limit brute-force on login: 5/min per IP (burst up to 10) */
export const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  max: LOGIN_MAX,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: getRedisStore(),
  handler: (_req, res) => {
    res.status(429).json({ error: 'rate_limited' });
  },
});

/** Admin route rate limiter: 60/min per IP */
export const adminLimiter = rateLimit({
  windowMs: ADMIN_WINDOW_MS,
  max: ADMIN_MAX,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: getRedisStore(),
  handler: (_req, res) => {
    res.status(429).json({ error: 'rate_limited' });
  },
});
