import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSettings, initializeSettings, isSetupComplete } from '@/services/settings';
import { createAdminUser } from '@/services/auth';

export const setupRouter = Router();

// Schema for setup completion request
const SetupCompleteSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  chains: z
    .array(z.number().positive())
    .min(1, 'At least one chain must be selected')
    .max(20, 'Maximum 20 chains allowed'),
  adminUsername: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  cacheTtl: z.number().min(10, 'Cache TTL must be at least 10 seconds').default(60),
});

/**
 * GET /api/setup/state
 * Check if initial setup is complete
 */
setupRouter.get('/state', async (_req: Request, res: Response) => {
  try {
    const complete = await isSetupComplete();
    res.json({ setupComplete: complete });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check setup state',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/setup/complete
 * Complete the initial setup wizard
 */
setupRouter.post('/complete', async (req: Request, res: Response) => {
  try {
    // Check if setup is already complete
    const alreadyComplete = await isSetupComplete();
    if (alreadyComplete) {
      res.status(400).json({ error: 'Setup has already been completed' });
      return;
    }

    // Validate request body
    const validation = SetupCompleteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid setup data',
        details: validation.error.format(),
      });
      return;
    }

    const { apiKey, chains, adminUsername, adminPassword, cacheTtl } = validation.data;

    // Create admin user
    await createAdminUser(adminUsername, adminPassword);

    // Initialize settings
    await initializeSettings(apiKey, chains, cacheTtl);

    res.json({
      success: true,
      message: 'Setup completed successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to complete setup',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/setup/config
 * Get current configuration (for authenticated users only)
 */
setupRouter.get('/config', async (_req: Request, res: Response) => {
  try {
    const settings = await getSettings();

    if (!settings) {
      res.status(404).json({ error: 'Settings not found' });
      return;
    }

    // Don't expose the API key in full
    res.json({
      chains: settings.chains,
      cacheTtl: settings.cache_ttl,
      apiKeySet: !!settings.etherscan_api_key,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get configuration',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
