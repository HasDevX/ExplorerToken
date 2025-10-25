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

// Mock services
jest.mock('@/services/settings');
jest.mock('@/services/cache');
jest.mock('@/services/auth');
jest.mock('../explorer', () => ({
  flushUsageLogs: jest.fn().mockReturnValue(new Map()),
}));

describe('Admin Routes', () => {
  let app: Express;
  const validToken = 'valid-jwt-token';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
    jest.clearAllMocks();

    // Mock token verification to return valid user
    (auth.verifyToken as jest.Mock).mockReturnValue({
      userId: 'test-id',
      username: 'admin',
      role: 'admin',
    });
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      await request(app).get('/api/admin/settings').expect(401);
    });

    it('should reject requests with invalid token', async () => {
      (auth.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await request(app)
        .get('/api/admin/settings')
        .set('Authorization', 'Bearer invalid')
        .expect(401);
    });
  });

  describe('GET /api/admin/settings', () => {
    it('should return settings for authenticated user', async () => {
      const mockSettings = {
        id: 1,
        etherscan_api_key: 'key',
        chains: [1, 137],
        cache_ttl: 60,
        setup_complete: true,
        api_key_last_validated_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (settings.getSettings as jest.Mock).mockResolvedValue(mockSettings);

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        chains: [1, 137],
        cacheTtl: 60,
        apiKeySet: true,
        apiKeyLastValidated: null,
      });
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
