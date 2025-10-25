import { Express, Request, Response, NextFunction } from 'express';
import { explorerRouter } from '@/routes/explorer';
import { setupRouter } from '@/routes/setup';
import { authRouter } from '@/routes/auth';
import { adminRouter } from '@/routes/admin';
import { publicCors, strictCors } from '@/config/cors';
import * as db from '@/services/db';
import { logger } from '@/lib/logger';
import { isSetupReady, setSetupReady } from '@/routes/setupState';

/**
 * Register all application routes
 */
export function registerRoutes(app: Express): void {
  // Health check endpoint - always available
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Setup routes - always available
  app.use('/api/setup', setupRouter);

  // Gate all other /api routes until setup completes
  app.use('/api', gateUntilSetupComplete);

  // Mount auth and admin routes with strict CORS
  app.use('/api/auth', strictCors, authRouter);
  app.use('/api/admin', strictCors, adminRouter);

  // Mount explorer API routes with public CORS
  app.use('/api', publicCors, explorerRouter);
}

let checkingSetupStatus: Promise<void> | null = null;

async function ensureSetupStatus(): Promise<void> {
  if (isSetupReady() || checkingSetupStatus) {
    await checkingSetupStatus;
    return;
  }

  checkingSetupStatus = (async () => {
    try {
      const settings = await db.getSettings();
      if (settings?.setup_complete) {
        setSetupReady(true);
      }
    } catch (error) {
      logger.warn(
        `Failed to check setup status: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      checkingSetupStatus = null;
    }
  })();

  await checkingSetupStatus;
}

async function gateUntilSetupComplete(req: Request, res: Response, next: NextFunction) {
  if (!isSetupReady()) {
    await ensureSetupStatus();
  }

  if (isSetupReady()) {
    next();
    return;
  }

  if (req.path.startsWith('/setup')) {
    next();
    return;
  }

  res.status(503).json({
    error: 'Setup not complete',
    message: 'Please complete the initial setup at /api/setup/complete',
  });
}
