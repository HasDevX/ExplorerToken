// Set up environment variables before importing modules
process.env.ETHERSCAN_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RATE_LIMIT_PER_MIN = '10'; // Low limit for testing

import express, { Express } from 'express';
import request from 'supertest';
import { explorerRouter } from '../explorer';
import * as etherscanClient from '@/services/etherscanClient';
import * as cache from '@/services/cache';
import { clearBuckets } from '@/middleware/rateLimit';

// Mock the etherscan client
jest.mock('@/services/etherscanClient', () => {
  const actual = jest.requireActual('@/services/etherscanClient');
  return {
    ...actual,
    getTokenTransfers: jest.fn(),
    getTokenInfo: jest.fn(),
    getTxDetails: jest.fn(),
  };
});

describe('Explorer API - Caching and Rate Limiting', () => {
  let app: Express;

  beforeAll(async () => {
    // Initialize cache
    await cache.initCache();
  });

  beforeEach(async () => {
    // Set up Express app with router
    app = express();
    app.use(express.json());
    app.use('/api', explorerRouter);

    // Clear all mocks, cache, and rate limit buckets
    jest.clearAllMocks();
    await cache.flushAll();
    clearBuckets();
  });

  describe('Caching behavior', () => {
    describe('GET /api/tx/:chainId/:hash', () => {
      it('should cache transaction details and reduce upstream calls', async () => {
        const mockTx = {
          hash: '0x123abc',
          blockNumber: 12345678,
          from: '0xfrom',
          to: '0xto',
          valueWei: '1000000000000000000',
          input: '0x',
          status: 'success' as const,
        };

        (etherscanClient.getTxDetails as jest.Mock).mockResolvedValue(mockTx);

        const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

        // First request - should call etherscan client
        const response1 = await request(app).get(`/api/tx/1/${txHash}`).expect(200);

        expect(response1.body).toEqual(mockTx);
        expect(etherscanClient.getTxDetails).toHaveBeenCalledTimes(1);

        // Second request within TTL - should use cache
        const response2 = await request(app).get(`/api/tx/1/${txHash}`).expect(200);

        expect(response2.body).toEqual(mockTx);
        expect(etherscanClient.getTxDetails).toHaveBeenCalledTimes(1); // Still 1, not called again

        // Third request - should still use cache
        const response3 = await request(app).get(`/api/tx/1/${txHash}`).expect(200);

        expect(response3.body).toEqual(mockTx);
        expect(etherscanClient.getTxDetails).toHaveBeenCalledTimes(1); // Still 1
      });

      it('should have separate cache entries for different transactions', async () => {
        const mockTx1 = {
          hash: '0x111',
          blockNumber: 1,
          from: '0xfrom1',
          to: '0xto1',
          valueWei: '100',
          input: '0x',
          status: 'success' as const,
        };

        const mockTx2 = {
          hash: '0x222',
          blockNumber: 2,
          from: '0xfrom2',
          to: '0xto2',
          valueWei: '200',
          input: '0x',
          status: 'success' as const,
        };

        (etherscanClient.getTxDetails as jest.Mock)
          .mockResolvedValueOnce(mockTx1)
          .mockResolvedValueOnce(mockTx2);

        const txHash1 = '0x1111111111111111111111111111111111111111111111111111111111111111';
        const txHash2 = '0x2222222222222222222222222222222222222222222222222222222222222222';

        // Request both transactions
        await request(app).get(`/api/tx/1/${txHash1}`).expect(200);
        await request(app).get(`/api/tx/1/${txHash2}`).expect(200);

        expect(etherscanClient.getTxDetails).toHaveBeenCalledTimes(2);

        // Request them again - should use cache
        const resp1 = await request(app).get(`/api/tx/1/${txHash1}`).expect(200);
        const resp2 = await request(app).get(`/api/tx/1/${txHash2}`).expect(200);

        expect(resp1.body).toEqual(mockTx1);
        expect(resp2.body).toEqual(mockTx2);
        expect(etherscanClient.getTxDetails).toHaveBeenCalledTimes(2); // No additional calls
      });
    });

    describe('GET /api/token/:chainId/:address/info', () => {
      it('should cache token info and reduce upstream calls', async () => {
        const mockTokenInfo = {
          contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
          totalSupplyRaw: '1000000000000000000000000',
          name: 'Test Token',
          symbol: 'TEST',
          decimals: 18,
        };

        (etherscanClient.getTokenInfo as jest.Mock).mockResolvedValue(mockTokenInfo);

        const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

        // First request
        await request(app).get(`/api/token/1/${address}/info`).expect(200);
        expect(etherscanClient.getTokenInfo).toHaveBeenCalledTimes(1);

        // Second request - should use cache
        await request(app).get(`/api/token/1/${address}/info`).expect(200);
        expect(etherscanClient.getTokenInfo).toHaveBeenCalledTimes(1);
      });
    });

    describe('GET /api/address/:chainId/:address/transfers', () => {
      it('should cache transfers and differentiate by pagination params', async () => {
        const mockTransfers1 = [
          {
            hash: '0xabc',
            blockNumber: 1,
            timeStamp: 1000,
            from: '0xfrom',
            to: '0xto',
            contractAddress: '0xtoken',
            valueRaw: '100',
          },
        ];

        const mockTransfers2 = [
          {
            hash: '0xdef',
            blockNumber: 2,
            timeStamp: 2000,
            from: '0xfrom2',
            to: '0xto2',
            contractAddress: '0xtoken',
            valueRaw: '200',
          },
        ];

        (etherscanClient.getTokenTransfers as jest.Mock)
          .mockResolvedValueOnce(mockTransfers1)
          .mockResolvedValueOnce(mockTransfers2);

        const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

        // Request page 1
        await request(app)
          .get(`/api/address/1/${address}/transfers`)
          .query({ page: '1', offset: '25', sort: 'desc' })
          .expect(200);

        // Request page 2
        await request(app)
          .get(`/api/address/1/${address}/transfers`)
          .query({ page: '2', offset: '25', sort: 'desc' })
          .expect(200);

        expect(etherscanClient.getTokenTransfers).toHaveBeenCalledTimes(2);

        // Request page 1 again - should use cache
        await request(app)
          .get(`/api/address/1/${address}/transfers`)
          .query({ page: '1', offset: '25', sort: 'desc' })
          .expect(200);

        expect(etherscanClient.getTokenTransfers).toHaveBeenCalledTimes(2); // No new call
      });
    });
  });

  describe('Rate limiting behavior', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      const mockTx = {
        hash: '0x123',
        blockNumber: 1,
        from: '0xfrom',
        to: '0xto',
        valueWei: '100',
        input: '0x',
        status: 'success' as const,
      };

      (etherscanClient.getTxDetails as jest.Mock).mockResolvedValue(mockTx);

      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      // Make requests up to the limit (10)
      for (let i = 0; i < 10; i++) {
        const response = await request(app).get(`/api/tx/1/${txHash}`);
        expect(response.status).toBe(200);
      }

      // Next request should be rate limited
      const response = await request(app).get(`/api/tx/1/${txHash}`);
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error', 'Too many requests');
      expect(response.body).toHaveProperty('retryAfter');
      expect(response.headers).toHaveProperty('retry-after');
    });

    it('should set rate limit headers on successful requests', async () => {
      const response = await request(app).get('/api/chains');

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers['x-ratelimit-limit']).toBe('10');
    });

    it('should decrement remaining count with each request', async () => {
      // First request
      const response1 = await request(app).get('/api/chains');
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'], 10);

      // Second request
      const response2 = await request(app).get('/api/chains');
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'], 10);

      expect(remaining2).toBeLessThan(remaining1);
    });
  });
});
