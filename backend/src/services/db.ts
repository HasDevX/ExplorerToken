import { Pool } from 'pg';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

let pool: Pool | null = null;

/**
 * Get or create database connection pool
 */
export function getDb(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      logger.error(`Unexpected database pool error: ${err.message}`);
    });
  }

  return pool;
}

/**
 * Close database connection pool
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
