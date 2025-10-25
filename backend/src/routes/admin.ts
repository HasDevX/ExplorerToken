import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { getSettings, updateSettings } from '@/services/settings';
import * as cache from '@/services/cache';
import { flushUsageLogs } from '@/routes/explorer';

export const adminRouter = Router();

// Apply rate limiting and auth middleware to all admin routes
adminRouter.use(rateLimit);
adminRouter.use(requireAuth);

// ============================================================================
// Settings Management
// ============================================================================

/**
 * GET /api/admin/settings
 * Get current application settings
 */
adminRouter.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await getSettings();

    if (!settings) {
      res.status(404).json({ error: 'Settings not found' });
      return;
    }

    res.json({
      chains: settings.chains,
      cacheTtl: settings.cache_ttl,
      apiKeySet: !!settings.etherscan_api_key,
      apiKeyLastValidated: settings.api_key_last_validated_at,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get settings',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * PUT /api/admin/settings
 * Update application settings
 */
adminRouter.put('/settings', async (req: Request, res: Response) => {
  try {
    const UpdateSchema = z.object({
      chains: z.array(z.number().positive()).optional(),
      cacheTtl: z.number().min(10).optional(),
    });

    const validation = UpdateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid settings data',
        details: validation.error.format(),
      });
      return;
    }

    const updates = {
      chains: validation.data.chains,
      cache_ttl: validation.data.cacheTtl,
    };

    const settings = await updateSettings(updates);

    res.json({
      success: true,
      settings: {
        chains: settings.chains,
        cacheTtl: settings.cache_ttl,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update settings',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// API Key Management
// ============================================================================

/**
 * PUT /api/admin/api-key
 * Update Etherscan API key
 */
adminRouter.put('/api-key', async (req: Request, res: Response) => {
  try {
    const ApiKeySchema = z.object({
      apiKey: z.string().min(1, 'API key is required'),
    });

    const validation = ApiKeySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid API key',
        details: validation.error.format(),
      });
      return;
    }

    await updateSettings({
      etherscan_api_key: validation.data.apiKey,
    });

    res.json({
      success: true,
      message: 'API key updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update API key',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// Cache Management
// ============================================================================

/**
 * POST /api/admin/cache/clear
 * Clear the application cache
 */
adminRouter.post('/cache/clear', async (_req: Request, res: Response) => {
  try {
    await cache.flushAll();

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// Metrics
// ============================================================================

/**
 * GET /api/admin/metrics
 * Get usage metrics
 */
adminRouter.get('/metrics', (_req: Request, res: Response) => {
  try {
    const usageLogs = flushUsageLogs();

    // Convert Map to object for JSON serialization
    const metrics: Record<string, number> = {};
    usageLogs.forEach((count, key) => {
      metrics[key] = count;
    });

    res.json({
      usage: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get metrics',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
