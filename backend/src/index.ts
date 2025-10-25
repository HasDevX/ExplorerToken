import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { registerRoutes } from '@/routes';
import { initCache } from '@/services/cache';

// Initialize cache on startup
initCache().catch((error) => {
  logger.error(`Failed to initialize cache: ${error instanceof Error ? error.message : String(error)}`);
});

// Create Express application
const app = express();

// Apply middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('combined'));

// Setup complete flag (will be true after DB migrations are run)
const setupComplete = false;

// Register routes
registerRoutes(app, setupComplete);

// Start server
app.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT}`);
  logger.info(`Health check available at http://localhost:${env.PORT}/health`);
});
