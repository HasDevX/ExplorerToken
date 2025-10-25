import { Express, Request, Response } from 'express';
import { explorerRouter } from '@/routes/explorer';
import { setupRouter } from '@/routes/setup';
import { authRouter } from '@/routes/auth';
import { adminRouter } from '@/routes/admin';
import { strictCors } from '@/config/cors';

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

  // Setup routes - available without additional CORS configuration
  app.use('/api/setup', setupRouter);

  // Sensitive groups → strict CORS
  app.use('/api/auth', strictCors, authRouter);
  app.use('/api/admin', strictCors, adminRouter);

  // Explorer routes rely on same-origin (or dev proxy) without wildcard CORS
  app.use('/api', explorerRouter);

  // Additional routes can be registered here based on setupComplete flag
  // For example, only expose certain endpoints after DB migrations are complete
  if (setupComplete) {
    // Future routes will be added here
  }
}
