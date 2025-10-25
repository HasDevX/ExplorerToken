// Set up environment variables before importing modules
process.env.ETHERSCAN_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RATE_LIMIT_PER_MIN = '1000';

import express, { Express } from 'express';
import request from 'supertest';
import { setupRouter } from '../setup';
import * as db from '@/services/db';

// Mock the database module
jest.mock('@/services/db');

describe('Setup API Routes', () => {
  let app: Express;

  beforeEach(() => {
    // Set up Express app with router
    app = express();
    app.use(express.json());
    app.use('/api/setup', setupRouter);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/setup/state', () => {
    it('should return setup: false when no settings exist', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/setup/state').expect(200);

      expect(response.body).toEqual({ setup: false });
    });

    it('should return setup: false when setup_complete is false', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue({
        id: 1,
        setup_complete: false,
        etherscan_api_key: '',
        chains: [],
        cache_ttl: 60,
      });

      const response = await request(app).get('/api/setup/state').expect(200);

      expect(response.body).toEqual({ setup: false });
    });

    it('should return setup: true when setup_complete is true', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue({
        id: 1,
        setup_complete: true,
        etherscan_api_key: 'test-key',
        chains: [{ id: 1, name: 'Ethereum' }],
        cache_ttl: 60,
      });

      const response = await request(app).get('/api/setup/state').expect(200);

      expect(response.body).toEqual({ setup: true });
    });

    it('should handle database errors gracefully', async () => {
      (db.getSettings as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/setup/state').expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/setup/complete', () => {
    it('should complete setup successfully with valid data', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue(null);
      (db.findAdminByUsername as jest.Mock).mockResolvedValue(null);
      (db.createAdminUser as jest.Mock).mockResolvedValue({
        id: 'uuid',
        username: 'admin',
        role: 'admin',
      });
      (db.upsertSettings as jest.Mock).mockResolvedValue({
        id: 1,
        setup_complete: true,
      });

      const setupData = {
        apiKey: 'test-etherscan-key',
        chains: [
          { id: 1, name: 'Ethereum' },
          { id: 137, name: 'Polygon' },
        ],
        admin: {
          username: 'admin',
          password: 'SecurePassword123',
        },
        cacheTtl: 60,
      };

      const response = await request(app).post('/api/setup/complete').send(setupData).expect(201);

      expect(response.body).toEqual({ message: 'Setup completed successfully' });
      expect(db.createAdminUser).toHaveBeenCalledWith(
        'admin',
        expect.any(String) // bcrypt hash
      );
      expect(db.upsertSettings).toHaveBeenCalledWith({
        etherscan_api_key: 'test-etherscan-key',
        chains: [
          { id: 1, name: 'Ethereum' },
          { id: 137, name: 'Polygon' },
        ],
        cache_ttl: 60,
        setup_complete: true,
      });
    });

    it('should return 409 if setup is already complete', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue({
        id: 1,
        setup_complete: true,
      });

      const setupData = {
        apiKey: 'test-etherscan-key',
        chains: [{ id: 1, name: 'Ethereum' }],
        admin: {
          username: 'admin',
          password: 'SecurePassword123',
        },
      };

      const response = await request(app).post('/api/setup/complete').send(setupData).expect(409);

      expect(response.body).toEqual({ error: 'Setup already completed' });
    });

    it('should return 400 for invalid data - missing apiKey', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue(null);

      const setupData = {
        chains: [{ id: 1, name: 'Ethereum' }],
        admin: {
          username: 'admin',
          password: 'SecurePassword123',
        },
      };

      const response = await request(app).post('/api/setup/complete').send(setupData).expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid data - empty chains array', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue(null);

      const setupData = {
        apiKey: 'test-key',
        chains: [],
        admin: {
          username: 'admin',
          password: 'SecurePassword123',
        },
      };

      const response = await request(app).post('/api/setup/complete').send(setupData).expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid username - too short', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue(null);

      const setupData = {
        apiKey: 'test-key',
        chains: [{ id: 1, name: 'Ethereum' }],
        admin: {
          username: 'ab',
          password: 'SecurePassword123',
        },
      };

      const response = await request(app).post('/api/setup/complete').send(setupData).expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid username - special characters', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue(null);

      const setupData = {
        apiKey: 'test-key',
        chains: [{ id: 1, name: 'Ethereum' }],
        admin: {
          username: 'admin@test',
          password: 'SecurePassword123',
        },
      };

      const response = await request(app).post('/api/setup/complete').send(setupData).expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid password - too short', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue(null);

      const setupData = {
        apiKey: 'test-key',
        chains: [{ id: 1, name: 'Ethereum' }],
        admin: {
          username: 'admin',
          password: 'short',
        },
      };

      const response = await request(app).post('/api/setup/complete').send(setupData).expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 409 if username already exists', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue(null);
      (db.findAdminByUsername as jest.Mock).mockResolvedValue({
        id: 'existing-uuid',
        username: 'admin',
      });

      const setupData = {
        apiKey: 'test-key',
        chains: [{ id: 1, name: 'Ethereum' }],
        admin: {
          username: 'admin',
          password: 'SecurePassword123',
        },
      };

      const response = await request(app).post('/api/setup/complete').send(setupData).expect(409);

      expect(response.body).toEqual({ error: 'Username already exists' });
    });

    it('should use default cacheTtl when not provided', async () => {
      (db.getSettings as jest.Mock).mockResolvedValue(null);
      (db.findAdminByUsername as jest.Mock).mockResolvedValue(null);
      (db.createAdminUser as jest.Mock).mockResolvedValue({
        id: 'uuid',
        username: 'admin',
        role: 'admin',
      });
      (db.upsertSettings as jest.Mock).mockResolvedValue({
        id: 1,
        setup_complete: true,
      });

      const setupData = {
        apiKey: 'test-key',
        chains: [{ id: 1, name: 'Ethereum' }],
        admin: {
          username: 'admin',
          password: 'SecurePassword123',
        },
      };

      await request(app).post('/api/setup/complete').send(setupData).expect(201);

      expect(db.upsertSettings).toHaveBeenCalledWith({
        etherscan_api_key: 'test-key',
        chains: [{ id: 1, name: 'Ethereum' }],
        cache_ttl: 60,
        setup_complete: true,
      });
    });
  });
});
