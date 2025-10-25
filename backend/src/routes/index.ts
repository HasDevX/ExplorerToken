import { Express, Request, Response } from 'express';
import { explorerRouter } from '@/routes/explorer';
import { setupRouter } from '@/routes/setup';
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

  // Setup routes - always available
  app.use('/api/setup', setupRouter);

  // If setup is not complete, only expose setup and health endpoints
  if (!setupComplete) {
    // Block all other routes except setup and health
    app.use('/api', (_req: Request, res: Response) => {
      res.status(503).json({
        error: 'Setup not complete',
        message: 'Please complete the initial setup at /api/setup/complete',
      });
    });
    return;
  }

  // Mount admin routes (auth + admin endpoints)
  app.use('/api/auth', adminRouter);
  app.use('/api/admin', adminRouter);

  // Mount explorer API routes
  app.use('/api', explorerRouter);
}
