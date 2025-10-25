import { createClient, RedisClientType } from 'redis';
import { env } from '@/config/env';

let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Connect to Redis if REDIS_URL is configured
 * Returns true if connected, false if Redis is not available
 */
export async function connect(): Promise<boolean> {
  if (!env.REDIS_URL) {
    return false;
  }

  if (isConnected && redisClient) {
    return true;
  }

  try {
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
    });

    await redisClient.connect();
    isConnected = true;
    return true;
  } catch (error) {
    console.error('Failed to connect to Redis:', error instanceof Error ? error.message : String(error));
    redisClient = null;
    isConnected = false;
    return false;
  }
}

/**
 * Get a value from Redis
 * Returns null if key doesn't exist or Redis is unavailable
 */
export async function get(key: string): Promise<string | null> {
  if (!isConnected || !redisClient) {
    return null;
  }

  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error('Redis get error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Set a value in Redis with TTL
 * Returns true if successful, false otherwise
 */
export async function setEx(key: string, ttlSec: number, value: string): Promise<boolean> {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.setEx(key, ttlSec, value);
    return true;
  } catch (error) {
    console.error('Redis setEx error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Delete a key from Redis
 * Returns true if successful, false otherwise
 */
export async function del(key: string): Promise<boolean> {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis del error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Flush all keys from Redis
 * Returns true if successful, false otherwise
 */
export async function flushAll(): Promise<boolean> {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.flushAll();
    return true;
  } catch (error) {
    console.error('Redis flushAll error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Disconnect from Redis
 */
export async function disconnect(): Promise<void> {
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
    } catch (error) {
      console.error('Redis disconnect error:', error instanceof Error ? error.message : String(error));
    } finally {
      isConnected = false;
      redisClient = null;
    }
  }
}
