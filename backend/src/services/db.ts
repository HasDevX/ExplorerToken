import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from '@/config/env';

// Create a connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

/**
 * Query helper function
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Settings table interfaces and queries
 */
export interface Settings {
  id: number;
  etherscan_api_key: string;
  chains: { id: number; name: string }[];
  cache_ttl: number;
  setup_complete: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function getSettings(): Promise<Settings | null> {
  const result = await query<Settings>('SELECT * FROM settings LIMIT 1');
  return result.rows[0] || null;
}

export async function upsertSettings(data: {
  etherscan_api_key?: string;
  chains?: { id: number; name: string }[];
  cache_ttl?: number;
  setup_complete?: boolean;
}): Promise<Settings> {
  const existing = await getSettings();

  if (existing) {
    // Update existing settings
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.etherscan_api_key !== undefined) {
      updates.push(`etherscan_api_key = $${paramCount++}`);
      values.push(data.etherscan_api_key);
    }
    if (data.chains !== undefined) {
      updates.push(`chains = $${paramCount++}`);
      values.push(JSON.stringify(data.chains));
    }
    if (data.cache_ttl !== undefined) {
      updates.push(`cache_ttl = $${paramCount++}`);
      values.push(data.cache_ttl);
    }
    if (data.setup_complete !== undefined) {
      updates.push(`setup_complete = $${paramCount++}`);
      values.push(data.setup_complete);
    }

    updates.push(`updated_at = now()`);

    const result = await query<Settings>(
      `UPDATE settings SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      [...values, existing.id]
    );
    return result.rows[0];
  } else {
    // Insert new settings
    const result = await query<Settings>(
      `INSERT INTO settings (etherscan_api_key, chains, cache_ttl, setup_complete)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.etherscan_api_key || '',
        JSON.stringify(data.chains || []),
        data.cache_ttl || 60,
        data.setup_complete || false,
      ]
    );
    return result.rows[0];
  }
}

export async function updateApiKey(apiKey: string): Promise<Settings> {
  return upsertSettings({ etherscan_api_key: apiKey });
}

export async function updateChainsAndTtl(
  chains: { id: number; name: string }[],
  cacheTtl: number
): Promise<Settings> {
  return upsertSettings({ chains, cache_ttl: cacheTtl });
}

/**
 * Admin users table interfaces and queries
 */
export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
}

export async function createAdminUser(
  username: string,
  passwordHash: string,
  role = 'admin'
): Promise<AdminUser> {
  const result = await query<AdminUser>(
    `INSERT INTO admin_users (username, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [username, passwordHash, role]
  );
  return result.rows[0];
}

export async function findAdminByUsername(username: string): Promise<AdminUser | null> {
  const result = await query<AdminUser>('SELECT * FROM admin_users WHERE username = $1', [
    username,
  ]);
  return result.rows[0] || null;
}

export async function updateLastLogin(userId: string): Promise<void> {
  await query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [userId]);
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
}
