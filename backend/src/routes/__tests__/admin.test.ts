// Set up environment variables before importing modules
process.env.ETHERSCAN_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RATE_LIMIT_PER_MIN = '1000';

import express, { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { adminRouter } from '../admin';
import * as db from '@/services/db';
import * as cache from '@/services/cache';
import { env } from '@/config/env';

// Mock the modules
jest.mock('@/services/db');
jest.mock('@/services/cache');

describe('Admin API Routes', () => {
  let app: Express;
  let validToken: string;

  beforeEach(async () => {
    // Set up Express app with router
    app = express();
    app.use(express.json());
    app.use('/api/auth', adminRouter);
    app.use('/api/admin', adminRouter);

    // Clear all mocks
    jest.clearAllMocks();

    // Generate a valid token for authenticated tests
    validToken = jwt.sign(
      {
        sub: 'test-user-id',
        username: 'testuser',
        role: 'admin',
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Mock cache methods
    (cache.flushAll as jest.Mock).mockResolvedValue(undefined);
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      (db.findAdminByUsername as jest.Mock).mockResolvedValue({
        id: 'admin-id',
        username: 'admin',
        password_hash: passwordHash,
        role: 'admin',
      });
      (db.updateLastLogin as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(db.updateLastLogin).toHaveBeenCalledWith('admin-id');

      // Verify the token
      const decoded = jwt.verify(response.body.token, env.JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe('admin-id');
      expect((decoded as { username: string }).username).toBe('admin');
      expect((decoded as { role: string }).role).toBe('admin');
    });

    it('should return 401 for invalid username', async () => {
      (db.findAdminByUsername as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123',
        })
        .expect(401);

      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should return 401 for invalid password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      (db.findAdminByUsername as jest.Mock).mockResolvedValue({
        id: 'admin-id',
        username: 'admin',
        password_hash: passwordHash,
        role: 'admin',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrong-password',
        })
        .expect(401);

      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/admin/settings', () => {
    it('should return settings without API key when authenticated', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue({
        id: 1,
        etherscan_api_key: 'secret-key',
        chains: [
          { id: 1, name: 'Ethereum' },
          { id: 137, name: 'Polygon' },
        ],
        cache_ttl: 120,
        setup_complete: true,
      });

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        chains: [
          { id: 1, name: 'Ethereum' },
          { id: 137, name: 'Polygon' },
        ],
        cache_ttl: 120,
        setup_complete: true,
      });
      expect(response.body).not.toHaveProperty('etherscan_api_key');
    });

    it('should return 401 without authorization header', async () => {
      const response = await request(app).get('/api/admin/settings').expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({ error: 'Invalid token' });
    });

    it('should return 404 if settings not found', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body).toEqual({ error: 'Settings not found' });
    });
  });

  describe('PUT /api/admin/settings', () => {
    it('should update settings successfully when authenticated', async () => {
      (db.updateChainsAndTtl as jest.Mock).mockResolvedValue({
        id: 1,
        chains: [{ id: 1, name: 'Ethereum' }],
        cache_ttl: 90,
      });

      const response = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          chains: [{ id: 1, name: 'Ethereum' }],
          cache_ttl: 90,
        })
        .expect(200);

      expect(response.body).toEqual({ message: 'Settings updated successfully' });
      expect(db.updateChainsAndTtl).toHaveBeenCalledWith([{ id: 1, name: 'Ethereum' }], 90);
    });

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .put('/api/admin/settings')
        .send({
          chains: [{ id: 1, name: 'Ethereum' }],
          cache_ttl: 90,
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid data - empty chains', async () => {
      const response = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          chains: [],
          cache_ttl: 90,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid data - negative cache_ttl', async () => {
      const response = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          chains: [{ id: 1, name: 'Ethereum' }],
          cache_ttl: -5,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /api/admin/apikey', () => {
    it('should update API key successfully when authenticated', async () => {
      (db.updateApiKey as jest.Mock).mockResolvedValue({
        id: 1,
        etherscan_api_key: 'new-key',
      });

      const response = await request(app)
        .put('/api/admin/apikey')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          apiKey: 'new-key',
        })
        .expect(200);

      expect(response.body).toEqual({ message: 'API key updated successfully' });
      expect(db.updateApiKey).toHaveBeenCalledWith('new-key');
    });

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .put('/api/admin/apikey')
        .send({
          apiKey: 'new-key',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for empty API key', async () => {
      const response = await request(app)
        .put('/api/admin/apikey')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          apiKey: '',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/admin/cache/clear', () => {
    it('should clear cache successfully when authenticated', async () => {
      const response = await request(app)
        .post('/api/admin/cache/clear')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({ message: 'Cache cleared successfully' });
      expect(cache.flushAll).toHaveBeenCalled();
    });

    it('should return 401 without authorization', async () => {
      const response = await request(app).post('/api/admin/cache/clear').expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle cache errors gracefully', async () => {
      (cache.flushAll as jest.Mock).mockRejectedValue(new Error('Cache error'));

      const response = await request(app)
        .post('/api/admin/cache/clear')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to clear cache' });
    });
  });
});
