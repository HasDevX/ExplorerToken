// Set up environment variables before importing modules
process.env.ETHERSCAN_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RATE_LIMIT_PER_MIN = '1000'; // High limit to avoid rate limiting in tests

import express, { Express } from 'express';
import request from 'supertest';
import { explorerRouter } from '../explorer';
import * as etherscanClient from '@/services/etherscanClient';
import * as cache from '@/services/cache';

// Mock only the functions, not the entire module
jest.mock('@/services/etherscanClient', () => {
  // Import the actual module to get the error class
  const actual = jest.requireActual('@/services/etherscanClient');
  return {
    ...actual,
    getTokenTransfers: jest.fn(),
    getTokenInfo: jest.fn(),
    getTxDetails: jest.fn(),
    getTokenHolders: jest.fn(),
  };
});

describe('Explorer API Routes', () => {
  let app: Express;

  beforeEach(async () => {
    // Set up Express app with router
    app = express();
    app.use(express.json());
    app.use('/api', explorerRouter);

    // Clear all mocks and cache
    jest.clearAllMocks();
    await cache.flushAll();
  });

  describe('GET /api/chains', () => {
    it('should return a list of 9 supported chains', async () => {
      const response = await request(app).get('/api/chains').expect(200);

      expect(response.body).toHaveProperty('chains');
      expect(response.body.chains).toHaveLength(9);
      expect(response.body.chains).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'Ethereum', supported: true }),
          expect.objectContaining({ id: 10, name: 'Optimism', supported: true }),
          expect.objectContaining({ id: 56, name: 'BNB Smart Chain', supported: true }),
          expect.objectContaining({ id: 137, name: 'Polygon', supported: true }),
          expect.objectContaining({ id: 42161, name: 'Arbitrum One', supported: true }),
          expect.objectContaining({ id: 43114, name: 'Avalanche C-Chain', supported: true }),
          expect.objectContaining({ id: 8453, name: 'Base', supported: true }),
          expect.objectContaining({ id: 324, name: 'zkSync', supported: true }),
          expect.objectContaining({ id: 5000, name: 'Mantle', supported: true }),
        ])
      );
    });
  });

  describe('GET /api/address/:chainId/:address/transfers', () => {
    it('should return transfers for a valid address', async () => {
      const mockTransfers = [
        {
          hash: '0xabc123',
          blockNumber: 12345678,
          timeStamp: 1609459200,
          from: '0x123abc',
          to: '0x456def',
          contractAddress: '0x789ghi',
          valueRaw: '1000000000000000000',
          tokenSymbol: 'TEST',
          tokenName: 'Test Token',
          tokenDecimal: 18,
        },
      ];

      (etherscanClient.getTokenTransfers as jest.Mock).mockResolvedValue(mockTransfers);

      const response = await request(app)
        .get('/api/address/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/transfers')
        .query({ page: '1', offset: '25', sort: 'desc' })
        .expect(200);

      expect(response.body).toEqual({
        chainId: 1,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        page: 1,
        offset: 25,
        sort: 'desc',
        data: mockTransfers,
      });

      expect(etherscanClient.getTokenTransfers).toHaveBeenCalledWith({
        chainId: 1,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        page: 1,
        offset: 25,
        sort: 'desc',
      });
    });

    it('should use default query parameters when not provided', async () => {
      (etherscanClient.getTokenTransfers as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/address/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/transfers')
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.offset).toBe(25);
      expect(response.body.sort).toBe('desc');
    });

    it('should return 400 for invalid chainId', async () => {
      const response = await request(app)
        .get('/api/address/invalid/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/transfers')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid address', async () => {
      const response = await request(app)
        .get('/api/address/1/0xinvalidaddress/transfers')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for address without 0x prefix', async () => {
      const response = await request(app)
        .get('/api/address/1/742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/transfers')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid offset (too large)', async () => {
      const response = await request(app)
        .get('/api/address/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/transfers')
        .query({ offset: '101' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid sort parameter', async () => {
      const response = await request(app)
        .get('/api/address/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/transfers')
        .query({ sort: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 502 when etherscan client throws an error', async () => {
      (etherscanClient.getTokenTransfers as jest.Mock).mockRejectedValue(
        new etherscanClient.EtherscanError(
          'API rate limit exceeded',
          'https://api.etherscan.io/v2/api',
          1
        )
      );

      const response = await request(app)
        .get('/api/address/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/transfers')
        .expect(502);

      expect(response.body).toEqual({
        error: 'Upstream error',
        code: 'ETHERSCAN_ERROR',
        details: 'API rate limit exceeded',
      });
    });
  });

  describe('GET /api/token/:chainId/:address/info', () => {
    it('should return token info for a valid contract address', async () => {
      const mockTokenInfo = {
        contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        totalSupplyRaw: '1000000000000000000000000',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
      };

      (etherscanClient.getTokenInfo as jest.Mock).mockResolvedValue(mockTokenInfo);

      const response = await request(app)
        .get('/api/token/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/info')
        .expect(200);

      expect(response.body).toEqual(mockTokenInfo);

      expect(etherscanClient.getTokenInfo).toHaveBeenCalledWith({
        chainId: 1,
        contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });
    });

    it('should return 400 for invalid chainId', async () => {
      const response = await request(app)
        .get('/api/token/invalid/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/info')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid address', async () => {
      const response = await request(app).get('/api/token/1/0xinvalidaddress/info').expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 502 when etherscan client throws an error', async () => {
      (etherscanClient.getTokenInfo as jest.Mock).mockRejectedValue(
        new etherscanClient.EtherscanError(
          'Contract not found',
          'https://api.etherscan.io/v2/api',
          1
        )
      );

      const response = await request(app)
        .get('/api/token/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/info')
        .expect(502);

      expect(response.body).toEqual({
        error: 'Upstream error',
        code: 'ETHERSCAN_ERROR',
        details: 'Contract not found',
      });
    });
  });

  describe('GET /api/tx/:chainId/:hash', () => {
    it('should return transaction details for a valid hash', async () => {
      const mockTxDetails = {
        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: 12345678,
        from: '0x123abc',
        to: '0x456def',
        valueWei: '1000000000000000000',
        input: '0x',
        status: 'success' as const,
        receipt: {
          gasUsed: '21000',
          effectiveGasPrice: '1000000000',
          logs: [],
        },
      };

      (etherscanClient.getTxDetails as jest.Mock).mockResolvedValue(mockTxDetails);

      const response = await request(app)
        .get('/api/tx/1/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
        .expect(200);

      expect(response.body).toEqual(mockTxDetails);

      expect(etherscanClient.getTxDetails).toHaveBeenCalledWith({
        chainId: 1,
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      });
    });

    it('should return 400 for invalid chainId', async () => {
      const response = await request(app)
        .get('/api/tx/invalid/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid hash', async () => {
      const response = await request(app).get('/api/tx/1/0xinvalidhash').expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for hash without 0x prefix', async () => {
      const response = await request(app)
        .get('/api/tx/1/1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for hash with incorrect length', async () => {
      const response = await request(app).get('/api/tx/1/0x1234').expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 502 when etherscan client throws an error', async () => {
      (etherscanClient.getTxDetails as jest.Mock).mockRejectedValue(
        new etherscanClient.EtherscanError(
          'Transaction not found',
          'https://api.etherscan.io/v2/api',
          1
        )
      );

      const response = await request(app)
        .get('/api/tx/1/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
        .expect(502);

      expect(response.body).toEqual({
        error: 'Upstream error',
        code: 'ETHERSCAN_ERROR',
        details: 'Transaction not found',
      });
    });
  });

  describe('GET /api/token/:chainId/:address/holders', () => {
    it('should return token holders with pagination', async () => {
      const mockHolders = [
        {
          address: '0x1234567890123456789012345678901234567890',
          balanceRaw: '1000000000000000000000',
          percent: 10.5,
        },
        {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          balanceRaw: '500000000000000000000',
          percent: 5.25,
        },
      ];

      (etherscanClient.getTokenHolders as jest.Mock).mockResolvedValue(mockHolders);

      const response = await request(app)
        .get('/api/token/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/holders')
        .query({ page: '1', offset: '25' })
        .expect(200);

      expect(response.body).toEqual({
        page: 1,
        offset: 25,
        total: null,
        result: mockHolders,
      });

      expect(response.headers['cache-control']).toBe('public, max-age=60');

      expect(etherscanClient.getTokenHolders).toHaveBeenCalledWith({
        chainId: 1,
        contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        page: 1,
        offset: 25,
      });
    });

    it('should use default page and offset values', async () => {
      const mockHolders = [
        {
          address: '0x1234567890123456789012345678901234567890',
          balanceRaw: '1000000000000000000000',
        },
      ];

      (etherscanClient.getTokenHolders as jest.Mock).mockResolvedValue(mockHolders);

      const response = await request(app)
        .get('/api/token/137/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/holders')
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.offset).toBe(25);
      expect(response.body.total).toBeNull();
      expect(response.body.result).toEqual(mockHolders);

      expect(etherscanClient.getTokenHolders).toHaveBeenCalledWith({
        chainId: 137,
        contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        page: 1,
        offset: 25,
      });
    });

    it('should cache holders response for 180 seconds', async () => {
      const mockHolders = [
        {
          address: '0x1234567890123456789012345678901234567890',
          balanceRaw: '1000000000000000000000',
        },
      ];

      (etherscanClient.getTokenHolders as jest.Mock).mockResolvedValue(mockHolders);

      // First request
      await request(app)
        .get('/api/token/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/holders')
        .expect(200);

      // Second request should use cache
      await request(app)
        .get('/api/token/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/holders')
        .expect(200);

      // Should only call the client once due to caching
      expect(etherscanClient.getTokenHolders).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid chainId', async () => {
      const response = await request(app)
        .get('/api/token/invalid/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/holders')
        .expect(400);

      expect(response.body.error).toBe('Invalid parameters');
    });

    it('should return 400 for invalid address format', async () => {
      const response = await request(app).get('/api/token/1/invalid-address/holders').expect(400);

      expect(response.body.error).toBe('Invalid parameters');
    });

    it('should return 400 for invalid page parameter', async () => {
      const response = await request(app)
        .get('/api/token/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/holders')
        .query({ page: '0' })
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });

    it('should return 400 for offset exceeding max value', async () => {
      const response = await request(app)
        .get('/api/token/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/holders')
        .query({ offset: '101' })
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });

    it('should return 502 when etherscan client throws an error', async () => {
      (etherscanClient.getTokenHolders as jest.Mock).mockRejectedValue(
        new etherscanClient.EtherscanError(
          'API rate limit exceeded',
          'https://api.etherscan.io/v2/api',
          1
        )
      );

      const response = await request(app)
        .get('/api/token/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/holders')
        .expect(502);

      expect(response.body).toEqual({
        error: 'Upstream error',
        code: 'ETHERSCAN_ERROR',
        details: 'API rate limit exceeded',
      });
    });

    it('should return 200 with unavailable:true when provider feature is unavailable', async () => {
      (etherscanClient.getTokenHolders as jest.Mock).mockRejectedValue(
        new etherscanClient.ProviderFeatureUnavailableError(
          'Feature not available: not available',
          'https://api.etherscan.io/v2/api',
          1
        )
      );

      const response = await request(app)
        .get('/api/token/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/holders')
        .expect(200);

      expect(response.body).toEqual({
        page: 1,
        offset: 25,
        total: null,
        unavailable: true,
        reason: 'Holders not available on this chain/plan',
        result: [],
      });

      expect(response.headers['cache-control']).toBe('public, max-age=60');
    });
  });
});
