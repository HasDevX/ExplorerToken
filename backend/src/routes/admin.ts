import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/middleware/auth';
import { adminReadLimiter, adminWriteLimiter } from '@/middleware/rateLimiters';
import { updateSettings } from '@/services/settings';
import * as cache from '@/services/cache';
import { flushUsageLogs } from '@/routes/explorer';
import { RequestWithId } from '@/middleware/requestId';

export const adminRouter = Router();

// ============================================================================
// Settings Management
// ============================================================================

/**
 * GET /api/admin/settings
 * Get current application settings
 */
adminRouter.get('/settings', adminReadLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const db = await import('@/services/db').then((m) => m.getDb());

    // Query the latest settings row (id desc limit 1)
    const result = await db.query(`SELECT * FROM settings ORDER BY id DESC LIMIT 1`);

    // If no settings found, return 409
    if (result.rows.length === 0) {
      res.status(409).json({ error: 'Setup not completed' });
      return;
    }

    const row = result.rows[0];

    // Sanitize and return safe data with defaults
    res.json({
      setupComplete: !!row.setup_complete,
      cacheTtl: row.cache_ttl ?? 60,
      chains: Array.isArray(row.chains) ? row.chains : [],
      hasApiKey: Boolean(row.etherscan_api_key),
    });
  } catch (error) {
    // Log error but don't expose details
    const requestId = (req as RequestWithId).requestId;
    console.error(`[${requestId}] Error fetching settings:`, error);

    res.status(500).json({
      error: 'Internal error',
      requestId,
    });
  }
});

/**
 * PUT /api/admin/settings
 * Update application settings
 */
adminRouter.put(
  '/settings',
  adminWriteLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
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
  }
);

// ============================================================================
// API Key Management
// ============================================================================

/**
 * PUT /api/admin/api-key
 * Update Etherscan API key
 */
adminRouter.put('/api-key', adminWriteLimiter, requireAuth, async (req: Request, res: Response) => {
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
adminRouter.post(
  '/cache/clear',
  adminWriteLimiter,
  requireAuth,
  async (_req: Request, res: Response) => {
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
  }
);

// ============================================================================
// Metrics
// ============================================================================

/**
 * GET /api/admin/metrics
 * Get usage metrics
 */
adminRouter.get('/metrics', adminReadLimiter, requireAuth, (_req: Request, res: Response) => {
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
