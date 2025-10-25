// Set up environment variables before importing modules
process.env.ETHERSCAN_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RATE_LIMIT_PER_MIN = '1000';

import express, { Express } from 'express';
import request from 'supertest';
import { setupRouter } from '../setup';
import * as settings from '@/services/settings';
import * as auth from '@/services/auth';

// Mock the database service modules
jest.mock('@/services/settings');
jest.mock('@/services/auth');

describe('Setup Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/setup', setupRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/setup/state', () => {
    it('should return setup incomplete when not configured', async () => {
      (settings.isSetupComplete as jest.Mock).mockResolvedValue(false);

      const response = await request(app).get('/api/setup/state').expect(200);

      expect(response.body).toEqual({ setupComplete: false });
    });

    it('should return setup complete when configured', async () => {
      (settings.isSetupComplete as jest.Mock).mockResolvedValue(true);

      const response = await request(app).get('/api/setup/state').expect(200);

      expect(response.body).toEqual({ setupComplete: true });
    });

    it('should handle errors gracefully', async () => {
      (settings.isSetupComplete as jest.Mock).mockRejectedValue(new Error('Database error'));

      await request(app).get('/api/setup/state').expect(500);
    });
  });

  describe('POST /api/setup/complete', () => {
    it('should complete setup with valid data', async () => {
      (settings.isSetupComplete as jest.Mock).mockResolvedValue(false);
      (auth.createAdminUser as jest.Mock).mockResolvedValue({
        id: 'test-id',
        username: 'admin',
        role: 'admin',
        is_active: true,
      });
      (settings.initializeSettings as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/setup/complete')
        .send({
          apiKey: 'test-api-key',
          chains: [1, 137],
          adminUsername: 'admin',
          adminPassword: 'password123',
          cacheTtl: 60,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Setup completed successfully',
      });
      expect(auth.createAdminUser).toHaveBeenCalledWith('admin', 'password123');
      expect(settings.initializeSettings).toHaveBeenCalledWith('test-api-key', [1, 137], 60);
    });

    it('should reject setup if already complete', async () => {
      (settings.isSetupComplete as jest.Mock).mockResolvedValue(true);

      await request(app)
        .post('/api/setup/complete')
        .send({
          apiKey: 'test-api-key',
          chains: [1],
          adminUsername: 'admin',
          adminPassword: 'password123',
          cacheTtl: 60,
        })
        .expect(400);
    });

    it('should validate API key', async () => {
      (settings.isSetupComplete as jest.Mock).mockResolvedValue(false);

      await request(app)
        .post('/api/setup/complete')
        .send({
          apiKey: '',
          chains: [1],
          adminUsername: 'admin',
          adminPassword: 'password123',
          cacheTtl: 60,
        })
        .expect(400);
    });

    it('should validate chains', async () => {
      (settings.isSetupComplete as jest.Mock).mockResolvedValue(false);

      await request(app)
        .post('/api/setup/complete')
        .send({
          apiKey: 'test-api-key',
          chains: [],
          adminUsername: 'admin',
          adminPassword: 'password123',
          cacheTtl: 60,
        })
        .expect(400);
    });

    it('should validate password length', async () => {
      (settings.isSetupComplete as jest.Mock).mockResolvedValue(false);

      await request(app)
        .post('/api/setup/complete')
        .send({
          apiKey: 'test-api-key',
          chains: [1],
          adminUsername: 'admin',
          adminPassword: 'short',
          cacheTtl: 60,
        })
        .expect(400);
    });
  });
});
