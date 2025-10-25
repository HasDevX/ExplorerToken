// Set up environment variables before importing modules
process.env.ETHERSCAN_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.CACHE_DEFAULT_TTL = '60';
process.env.RATE_LIMIT_PER_MIN = '60';

// Mock Redis before importing cache
jest.mock('../redis', () => ({
  connect: jest.fn(),
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  flushAll: jest.fn(),
}));

import * as cache from '../cache';
import * as redis from '../redis';

describe('Cache Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when Redis is not available', () => {
    beforeEach(async () => {
      (redis.connect as jest.Mock).mockResolvedValue(false);
      await cache.initCache();
    });

    it('should initialize with node-cache fallback', async () => {
      expect(redis.connect).toHaveBeenCalled();
    });

    it('should set and get values using node-cache', async () => {
      const testKey = 'test:key';
      const testValue = { foo: 'bar', num: 42 };

      await cache.set(testKey, testValue, 60);
      const retrieved = await cache.get(testKey);

      expect(retrieved).toEqual(testValue);
    });

    it('should delete values from node-cache', async () => {
      const testKey = 'test:delete';
      const testValue = { data: 'test' };

      await cache.set(testKey, testValue);
      await cache.del(testKey);
      const retrieved = await cache.get(testKey);

      expect(retrieved).toBeNull();
    });

    it('should flush all values from node-cache', async () => {
      await cache.set('key1', { value: 1 });
      await cache.set('key2', { value: 2 });

      await cache.flushAll();

      const val1 = await cache.get('key1');
      const val2 = await cache.get('key2');

      expect(val1).toBeNull();
      expect(val2).toBeNull();
    });

    it('should respect TTL for cached values', async () => {
      const testKey = 'test:ttl';
      const testValue = { data: 'expires' };

      await cache.set(testKey, testValue, 1); // 1 second TTL

      // Immediately available
      let retrieved = await cache.get(testKey);
      expect(retrieved).toEqual(testValue);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be expired
      retrieved = await cache.get(testKey);
      expect(retrieved).toBeNull();
    });
  });

  describe('when Redis is available', () => {
    beforeEach(async () => {
      (redis.connect as jest.Mock).mockResolvedValue(true);
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.setEx as jest.Mock).mockResolvedValue(true);
      (redis.del as jest.Mock).mockResolvedValue(true);
      (redis.flushAll as jest.Mock).mockResolvedValue(true);
      
      await cache.initCache();
    });

    it('should attempt to get from Redis first', async () => {
      const testKey = 'test:redis';
      const testValue = { foo: 'bar' };
      
      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(testValue));

      const retrieved = await cache.get(testKey);

      expect(redis.get).toHaveBeenCalledWith(testKey);
      expect(retrieved).toEqual(testValue);
    });

    it('should set values in Redis', async () => {
      const testKey = 'test:redis:set';
      const testValue = { data: 'test' };

      await cache.set(testKey, testValue, 60);

      expect(redis.setEx).toHaveBeenCalledWith(testKey, 60, JSON.stringify(testValue));
    });

    it('should delete values from Redis', async () => {
      const testKey = 'test:redis:delete';

      await cache.del(testKey);

      expect(redis.del).toHaveBeenCalledWith(testKey);
    });

    it('should flush all from Redis', async () => {
      await cache.flushAll();

      expect(redis.flushAll).toHaveBeenCalled();
    });

    it('should fall back to node-cache when Redis get fails', async () => {
      const testKey = 'test:fallback';
      const testValue = { data: 'fallback' };

      // Redis returns null
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      // Set in node-cache via normal set (which sets both)
      await cache.set(testKey, testValue);

      // Clear Redis mock to return null
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      // Should get from node-cache
      const retrieved = await cache.get(testKey);
      expect(retrieved).toEqual(testValue);
    });
  });
});
