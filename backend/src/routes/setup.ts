import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { rateLimit } from '@/middleware/rateLimit';
import * as db from '@/services/db';
import { markSetupComplete } from '@/routes/setupState';

export const setupRouter = Router();

// Apply rate limiting to prevent brute force attempts on setup
setupRouter.use(rateLimit);

/**
 * GET /api/setup/state
 * Returns whether the initial setup has been completed
 */
setupRouter.get('/state', async (_req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    res.json({ setup: settings?.setup_complete || false });
  } catch (error) {
    console.error('Error getting setup state:', error);
    res.status(500).json({ error: 'Failed to get setup state' });
  }
});

/**
 * POST /api/setup/complete
 * Complete the initial setup wizard
 */
setupRouter.post('/complete', async (req: Request, res: Response) => {
  try {
    // Check if setup is already complete
    const settings = await db.getSettings();
    if (settings?.setup_complete) {
      res.status(409).json({ error: 'Setup already completed' });
      return;
    }

    // Validate request body
    const setupSchema = z.object({
      apiKey: z.string().trim().min(1, 'API key is required'),
      chains: z
        .array(
          z.object({
            id: z.number().int().positive('Chain ID must be a positive integer'),
            name: z.string().trim().min(1, 'Chain name is required'),
          })
        )
        .min(1, 'At least one chain is required'),
      admin: z.object({
        username: z
          .string()
          .trim()
          .min(3, 'Username must be at least 3 characters')
          .max(50, 'Username must be at most 50 characters')
          .regex(
            /^[a-zA-Z0-9_-]+$/,
            'Username can only contain letters, numbers, hyphens, and underscores'
          ),
        password: z.string().min(8, 'Password must be at least 8 characters'),
      }),
      cacheTtl: z.number().int().positive('Cache TTL must be a positive integer').optional(),
    });

    const result = setupSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.format(),
      });
      return;
    }

    const { apiKey, chains, admin, cacheTtl } = result.data;

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(admin.password, saltRounds);

    // Check if username already exists
    const existingAdmin = await db.findAdminByUsername(admin.username);
    if (existingAdmin) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    // Create admin user
    await db.createAdminUser({
      username: admin.username,
      password_hash: passwordHash,
      role: 'admin',
    });

    // Update settings
    await db.upsertSettings({
      etherscan_api_key: apiKey,
      chains,
      cache_ttl: cacheTtl || 60,
      setup_complete: true,
    });

    markSetupComplete();

    res.status(201).json({ message: 'Setup completed successfully' });
  } catch (error) {
    console.error('Error completing setup:', error);
    res.status(500).json({ error: 'Failed to complete setup' });
  }
});
