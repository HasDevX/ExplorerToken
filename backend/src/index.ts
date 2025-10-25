import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { registerRoutes } from '@/routes';
import { initCache } from '@/services/cache';
import * as db from '@/services/db';
import { setSetupReady } from '@/routes/setupState';

// Initialize cache on startup
initCache().catch((error) => {
  logger.error(
    `Failed to initialize cache: ${error instanceof Error ? error.message : String(error)}`
  );
});

// Create Express application
const app = express();

// Apply middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('combined'));

/**
 * Check if initial setup is complete
 */
async function checkSetupComplete(): Promise<boolean> {
  try {
    const settings = await db.getSettings();
    return settings?.setup_complete || false;
  } catch (error) {
    // If we can't query the database, assume setup is not complete
    logger.warn('Could not check setup status, assuming not complete');
    return false;
  }
}

/**
 * Initialize the application
 */
async function init() {
  const setupComplete = await checkSetupComplete();
  setSetupReady(setupComplete);

  if (setupComplete) {
    logger.info('Setup is complete');
  } else {
    logger.info('Setup is not complete - only /api/setup/* endpoints available');
  }

  // Register routes
  registerRoutes(app);

  // Start server
  app.listen(env.PORT, () => {
    logger.info(`Server is running on port ${env.PORT}`);
    logger.info(`Health check available at http://localhost:${env.PORT}/health`);
  });
}

// Start the application
init().catch((error) => {
  logger.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
