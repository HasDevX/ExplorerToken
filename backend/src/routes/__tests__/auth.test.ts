// Set up environment variables before importing modules
process.env.ETHERSCAN_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RATE_LIMIT_PER_MIN = '1000';

import express, { Express } from 'express';
import request from 'supertest';
import { authRouter } from '../auth';
import * as auth from '@/services/auth';

// Mock the auth service
jest.mock('@/services/auth');

describe('Auth Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 'test-id',
        username: 'admin',
        role: 'admin',
        is_active: true,
      };

      (auth.authenticateUser as jest.Mock).mockResolvedValue(mockUser);
      (auth.generateToken as jest.Mock).mockReturnValue('test-jwt-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        token: 'test-jwt-token',
        user: {
          id: 'test-id',
          username: 'admin',
          role: 'admin',
        },
      });
    });

    it('should reject invalid credentials', async () => {
      (auth.authenticateUser as jest.Mock).mockResolvedValue(null);

      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should validate username', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: '',
          password: 'password123',
        })
        .expect(400);
    });

    it('should validate password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: '',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app).post('/api/auth/logout').expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });

  describe('GET /api/auth/me', () => {
    it('should reject request without token', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });

    it('should reject request with invalid token', async () => {
      (auth.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid').expect(401);
    });

    it('should return user info with valid token', async () => {
      const mockPayload = {
        userId: 'test-id',
        username: 'admin',
        role: 'admin',
      };

      (auth.verifyToken as jest.Mock).mockReturnValue(mockPayload);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        user: mockPayload,
      });
    });
  });
});
