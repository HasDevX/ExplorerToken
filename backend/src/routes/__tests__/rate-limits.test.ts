// Set up environment variables before importing modules
process.env.ETHERSCAN_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'production'; // Use production limits for this test
process.env.LOGIN_MAX = '5'; // 5 requests per minute for login
process.env.ADMIN_MAX = '60'; // 60 requests per minute for admin

import express, { Express } from 'express';
import request from 'supertest';
import { authRouter } from '../auth';
import { adminRouter } from '../admin';
import * as auth from '@/services/auth';
import * as db from '@/services/db';
import { RequestWithId } from '@/middleware/requestId';

// Mock services
jest.mock('@/services/auth');
jest.mock('@/services/db');
jest.mock('@/services/settings');
jest.mock('@/services/cache');
jest.mock('../explorer', () => ({
  flushUsageLogs: jest.fn().mockReturnValue(new Map()),
}));

describe('Rate Limiting', () => {
  let app: Express;
  let mockDbQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DB query
    mockDbQuery = jest.fn();
    (db.getDb as jest.Mock).mockReturnValue({
      query: mockDbQuery,
    });
  });

  describe('HEAD /api/admin/settings without auth', () => {
    beforeEach(() => {
      // Create a fresh app for each test to avoid rate limit carryover
      app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        (req as RequestWithId).requestId = 'test-request-id';
        next();
      });
      app.use('/api/auth', authRouter);
      app.use('/api/admin', adminRouter);
    });

    it('should return 401, not 500, for unauthenticated HEAD request', async () => {
      const response = await request(app).head('/api/admin/settings').expect(401);
      expect(response.status).toBe(401);
    });

    it('should return 401 for HEAD request with invalid token', async () => {
      (auth.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .head('/api/admin/settings')
        .set('Authorization', 'Bearer invalid')
        .expect(401);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/login rate limiting', () => {
    beforeEach(() => {
      // Create a fresh app for each test suite
      app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        (req as RequestWithId).requestId = 'test-request-id';
        next();
      });
      app.use('/api/auth', authRouter);
      app.use('/api/admin', adminRouter);
    });
    it('should return 429 with rate_limited error when exceeding 5 requests per minute', async () => {
      // Mock authenticateUser to return null (failed login)
      (auth.authenticateUser as jest.Mock).mockResolvedValue(null);

      // Make 5 requests (should succeed)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ username: 'test', password: 'test' })
          .expect(401); // Invalid credentials
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'test' })
        .expect(429);

      expect(response.body).toEqual({ error: 'rate_limited' });
    });

    it('should return 429 JSON response with correct format', async () => {
      (auth.authenticateUser as jest.Mock).mockResolvedValue(null);

      // Exhaust the rate limit
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login').send({ username: 'test', password: 'test' });
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'test' })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('rate_limited');
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe('GET /api/admin/settings rate limiting', () => {
    beforeEach(() => {
      // Create a fresh app for each test suite
      app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        (req as RequestWithId).requestId = 'test-request-id';
        next();
      });
      app.use('/api/auth', authRouter);
      app.use('/api/admin', adminRouter);
    });
    it('should return 429 with rate_limited error when exceeding 60 requests per minute', async () => {
      // Mock valid token
      (auth.verifyToken as jest.Mock).mockReturnValue({
        userId: 'test-id',
        username: 'admin',
        role: 'admin',
      });

      mockDbQuery.mockResolvedValue({
        rows: [
          {
            id: 1,
            chains: [1, 137],
            cache_ttl: 60,
            etherscan_api_key: 'key',
          },
        ],
      });

      const token = 'valid-token';

      // Make many requests until we hit the rate limit
      let hitLimit = false;
      for (let i = 0; i < 70; i++) {
        const response = await request(app)
          .get('/api/admin/settings')
          .set('Authorization', `Bearer ${token}`);

        if (response.status === 429) {
          hitLimit = true;
          expect(response.body).toEqual({ error: 'rate_limited' });
          break;
        }
      }

      expect(hitLimit).toBe(true);
    });

    it('should apply rate limit to all admin routes', async () => {
      // Mock valid token
      (auth.verifyToken as jest.Mock).mockReturnValue({
        userId: 'test-id',
        username: 'admin',
        role: 'admin',
      });

      mockDbQuery.mockResolvedValue({
        rows: [{ id: 1, chains: [1], cache_ttl: 60, etherscan_api_key: 'key' }],
      });

      const token = 'valid-token';

      // Make 60 requests across different admin endpoints
      for (let i = 0; i < 30; i++) {
        await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`);
      }
      for (let i = 0; i < 30; i++) {
        await request(app).get('/api/admin/metrics').set('Authorization', `Bearer ${token}`);
      }

      // Next request to any admin endpoint should be rate limited
      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(429);

      expect(response.body).toEqual({ error: 'rate_limited' });
    });
  });
});
