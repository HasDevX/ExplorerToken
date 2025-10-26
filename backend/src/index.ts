import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { registerRoutes } from '@/routes';
import { initCache } from '@/services/cache';
import { requestIdMiddleware } from '@/middleware/requestId';
import { errorHandler } from '@/middleware/errorHandler';

// Initialize cache on startup
initCache().catch((error) => {
  logger.error(
    `Failed to initialize cache: ${error instanceof Error ? error.message : String(error)}`
  );
});

// Create Express application
const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

// Apply middleware
app.use(helmet());
// Note: CORS is now applied per-route in registerRoutes
app.use(express.json());
app.use(morgan('combined'));

// Add request ID to all requests
app.use(requestIdMiddleware);

// Setup complete flag (will be true after DB migrations are run)
const setupComplete = false;

// Register routes
registerRoutes(app, setupComplete);

// Add centralized error handler (must be after routes)
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT}`);
  logger.info(`Health check available at http://localhost:${env.PORT}/health`);
  logger.info('CORS allowlist', { origins: env.CORS_ALLOW_ORIGINS });
});
