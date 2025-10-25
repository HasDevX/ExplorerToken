import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthRequest } from '@/middleware/auth';
import * as db from '@/services/db';
import * as cache from '@/services/cache';
import { env } from '@/config/env';

export const adminRouter = Router();

/**
 * POST /api/auth/login
 * Login endpoint - returns JWT token
 */
adminRouter.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const loginSchema = z.object({
      username: z.string().min(1, 'Username is required'),
      password: z.string().min(1, 'Password is required'),
    });

    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.format(),
      });
      return;
    }

    const { username, password } = result.data;

    // Find admin user
    const admin = await db.findAdminByUsername(username);
    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login (no-op for now but kept for future use)
    db.updateLastLogin(admin.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        sub: admin.id,
        username: admin.username,
        role: admin.role,
      },
      env.JWT_SECRET,
      {
        expiresIn: '24h',
      }
    );

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/admin/settings
 * Get current settings (requires auth)
 * Does not return the API key for security
 */
adminRouter.get('/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await db.getSettings();
    if (!settings) {
      res.status(404).json({ error: 'Settings not found' });
      return;
    }

    // Return settings without the API key
    res.json({
      chains: settings.chains,
      cache_ttl: settings.cache_ttl,
      setup_complete: settings.setup_complete,
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * PUT /api/admin/settings
 * Update chains and cache TTL (requires auth)
 */
adminRouter.put('/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const settingsSchema = z.object({
      chains: z
        .array(
          z.object({
            id: z.number().int().positive('Chain ID must be a positive integer'),
            name: z.string().min(1, 'Chain name is required'),
          })
        )
        .min(1, 'At least one chain is required'),
      cache_ttl: z.number().int().positive('Cache TTL must be a positive integer'),
    });

    const result = settingsSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.format(),
      });
      return;
    }

    const { chains, cache_ttl } = result.data;

    // Update settings
    await db.updateChainsAndTtl(chains, cache_ttl);

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * PUT /api/admin/apikey
 * Update Etherscan API key (requires auth)
 */
adminRouter.put('/apikey', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const apiKeySchema = z.object({
      apiKey: z.string().min(1, 'API key is required'),
    });

    const result = apiKeySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.format(),
      });
      return;
    }

    const { apiKey } = result.data;

    // Update API key
    await db.updateApiKey(apiKey);

    res.json({ message: 'API key updated successfully' });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

/**
 * POST /api/admin/cache/clear
 * Clear all cache entries (requires auth)
 */
adminRouter.post('/cache/clear', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await cache.flushAll();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});
