import { Express, Request, Response } from 'express';

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

  // Additional routes can be registered here based on setupComplete flag
  // For example, only expose certain endpoints after DB migrations are complete
  if (setupComplete) {
    // Future routes will be added here
  }
}
