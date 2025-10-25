// Set up environment variables before importing modules
process.env.ETHERSCAN_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RATE_LIMIT_PER_MIN = '1000';

import express, { Express } from 'express';
import request from 'supertest';
import { registerRoutes } from '@/routes';
import { resetSetupState } from '@/routes/setupState';
import * as db from '@/services/db';

jest.mock('@/services/db');

jest.mock('@/routes/explorer', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const expressModule = require('express');
  const router = expressModule.Router();
  router.get('/tx/:hash', (_req: express.Request, res: express.Response) => {
    res.json({ ok: true });
  });
  return { explorerRouter: router };
});

describe('Dynamic setup gate', () => {
  let app: Express;

  const mockedGetSettings = db.getSettings as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSetupState();

    app = express();
    app.use(express.json());
    registerRoutes(app);
  });

  it('blocks requests before setup completes and allows them after completion', async () => {
    mockedGetSettings.mockResolvedValueOnce(null).mockResolvedValue({
      id: 1,
      etherscan_api_key: 'secret',
      chains: [],
      cache_ttl: 60,
      setup_complete: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const blocked = await request(app).get('/api/tx/0x1234').expect(503);
    expect(blocked.body).toHaveProperty('error', 'Setup not complete');

    const allowed = await request(app).get('/api/tx/0x1234').expect(200);
    expect(allowed.body).toEqual({ ok: true });
  });
});
