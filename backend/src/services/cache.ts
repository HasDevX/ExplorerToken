import NodeCache from 'node-cache';
import * as redis from './redis';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

// In-memory cache fallback
const nodeCache = new NodeCache({ stdTTL: env.CACHE_DEFAULT_TTL });

// Track whether Redis is available
let redisAvailable = false;

/**
 * Initialize cache (attempt Redis connection)
 */
export async function initCache(): Promise<void> {
  redisAvailable = await redis.connect();
  if (redisAvailable) {
    logger.info('Cache: Using Redis');
  } else {
    logger.info('Cache: Using in-memory fallback (node-cache)');
  }
}

/**
 * Get a value from cache
 * Tries Redis first, falls back to node-cache
 */
export async function get<T>(key: string): Promise<T | null> {
  // Try Redis first
  if (redisAvailable) {
    try {
      const value = await redis.get(key);
      if (value !== null) {
        return JSON.parse(value) as T;
      }
    } catch (error) {
      console.error(
        'Cache get error (Redis):',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // Fallback to node-cache
  const value = nodeCache.get<T>(key);
  return value ?? null;
}

/**
 * Set a value in cache with optional TTL
 * Stores in both Redis (if available) and node-cache for redundancy
 */
export async function set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
  const ttl = ttlSec ?? env.CACHE_DEFAULT_TTL;
  const serialized = JSON.stringify(value);

  // Try to set in Redis
  if (redisAvailable) {
    try {
      await redis.setEx(key, ttl, serialized);
    } catch (error) {
      console.error(
        'Cache set error (Redis):',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // Always set in node-cache as fallback
  nodeCache.set(key, value, ttl);
}

/**
 * Delete a key from cache
 * Removes from both Redis and node-cache
 */
export async function del(key: string): Promise<void> {
  // Try to delete from Redis
  if (redisAvailable) {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(
        'Cache del error (Redis):',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // Delete from node-cache
  nodeCache.del(key);
}

/**
 * Flush all cache entries
 * Clears both Redis and node-cache
 */
export async function flushAll(): Promise<void> {
  // Try to flush Redis
  if (redisAvailable) {
    try {
      await redis.flushAll();
    } catch (error) {
      console.error(
        'Cache flushAll error (Redis):',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // Flush node-cache
  nodeCache.flushAll();
}
