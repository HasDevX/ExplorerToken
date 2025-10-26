// Set up environment variables before importing modules
process.env.ETHERSCAN_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RATE_LIMIT_PER_MIN = '1000';

import express, { Express } from 'express';
import request from 'supertest';
import { adminRouter } from '../admin';
import * as settings from '@/services/settings';
import * as cache from '@/services/cache';
import * as auth from '@/services/auth';
import * as db from '@/services/db';
import { RequestWithId } from '@/middleware/requestId';

// Mock services
jest.mock('@/services/settings');
jest.mock('@/services/cache');
jest.mock('@/services/auth');
jest.mock('@/services/db');
jest.mock('../explorer', () => ({
  flushUsageLogs: jest.fn().mockReturnValue(new Map()),
}));

describe('Admin Routes', () => {
  let app: Express;
  const validToken = 'valid-jwt-token';
  let mockDbQuery: jest.Mock;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Add request ID middleware for testing
    app.use((req, _res, next) => {
      (req as RequestWithId).requestId = 'test-request-id';
      next();
    });
    app.use('/api/admin', adminRouter);
    jest.clearAllMocks();

    // Mock token verification to return valid user
    (auth.verifyToken as jest.Mock).mockReturnValue({
      userId: 'test-id',
      username: 'admin',
      role: 'admin',
    });

    // Mock DB query
    mockDbQuery = jest.fn();
    (db.getDb as jest.Mock).mockReturnValue({
      query: mockDbQuery,
    });
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await request(app).get('/api/admin/settings').expect(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should reject requests with invalid token', async () => {
      (auth.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', 'Bearer invalid')
        .expect(401);

      expect(response.body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('GET /api/admin/settings', () => {
    it('should return 409 when settings not found', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(409);

      expect(response.body).toEqual({ error: 'Setup not completed' });
    });

    it('should return sanitized settings for authenticated user', async () => {
      const mockRow = {
        id: 1,
        etherscan_api_key: 'secret-key-should-not-be-exposed',
        chains: [1, 137],
        cache_ttl: 60,
        setup_complete: true,
        api_key_last_validated_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDbQuery.mockResolvedValue({ rows: [mockRow] });

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        selectedChainIds: [1, 137],
        cacheTtl: 60,
        apiKeySet: true,
        apiKeyLastValidated: null,
        chainsDetailed: expect.any(Array),
      });

      // Verify the secret key is NOT in the response
      expect(JSON.stringify(response.body)).not.toContain('secret-key');
    });

    it('should use defaults when fields are missing', async () => {
      const mockRow = {
        id: 1,
        etherscan_api_key: null,
        chains: null,
        cache_ttl: null,
        setup_complete: false,
      };

      mockDbQuery.mockResolvedValue({ rows: [mockRow] });

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        selectedChainIds: [], // default
        cacheTtl: 60, // default
        apiKeySet: false,
        apiKeyLastValidated: null,
        chainsDetailed: [],
      });
    });

    it('should return 500 with requestId on DB error', async () => {
      mockDbQuery.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal error',
        requestId: 'test-request-id',
      });

      // Verify no stack trace is exposed
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('details');
    });
  });

  describe('PUT /api/admin/settings', () => {
    it('should update settings', async () => {
      const updatedSettings = {
        id: 1,
        etherscan_api_key: 'key',
        chains: [1, 10, 137],
        cache_ttl: 120,
        setup_complete: true,
        api_key_last_validated_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (settings.updateSettings as jest.Mock).mockResolvedValue(updatedSettings);

      const response = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          chains: [1, 10, 137],
          cacheTtl: 120,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.settings.chains).toEqual([1, 10, 137]);
      expect(response.body.settings.cacheTtl).toBe(120);
    });

    it('should validate cache TTL minimum', async () => {
      await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          cacheTtl: 5,
        })
        .expect(400);
    });
  });

  describe('PUT /api/admin/api-key', () => {
    it('should update API key', async () => {
      (settings.updateSettings as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .put('/api/admin/api-key')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          apiKey: 'new-api-key',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(settings.updateSettings).toHaveBeenCalledWith({
        etherscan_api_key: 'new-api-key',
      });
    });

    it('should reject empty API key', async () => {
      await request(app)
        .put('/api/admin/api-key')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          apiKey: '',
        })
        .expect(400);
    });
  });

  describe('POST /api/admin/cache/clear', () => {
    it('should clear cache', async () => {
      (cache.flushAll as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/admin/cache/clear')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(cache.flushAll).toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/metrics', () => {
    it('should return metrics', async () => {
      const response = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('usage');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
