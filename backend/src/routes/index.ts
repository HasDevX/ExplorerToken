import { Express, Request, Response } from 'express';
import cors from 'cors';
import { explorerRouter } from '@/routes/explorer';
import { setupRouter } from '@/routes/setup';
import { authRouter } from '@/routes/auth';
import { adminRouter } from '@/routes/admin';

/**
 * Register all application routes
 * @param app - Express application instance
 * @param setupComplete - Flag indicating if setup is complete
 */
export function registerRoutes(app: Express, setupComplete: boolean): void {
  // Health check endpoint - always available
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Setup routes - always available (with public CORS for initial setup access)
  // Note: This is intentionally permissive as setup must be accessible before configuration
  app.use('/api/setup', cors({ origin: '*' }), setupRouter);

  // Auth routes - configurable CORS for security
  // In production, set FRONTEND_URL environment variable to restrict access
  app.use(
    '/api/auth',
    cors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    }),
    authRouter
  );

  // Admin routes - configurable CORS for security, requires authentication
  // In production, set FRONTEND_URL environment variable to restrict access
  app.use(
    '/api/admin',
    cors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    }),
    adminRouter
  );

  // Mount explorer API routes - public CORS for public explorer access
  // Note: This is intentionally permissive for public blockchain data access
  app.use('/api', cors({ origin: '*' }), explorerRouter);

  // Additional routes can be registered here based on setupComplete flag
  // For example, only expose certain endpoints after DB migrations are complete
  if (setupComplete) {
    // Future routes will be added here
  }
}
