import { getDb } from '@/services/db';

export interface AppSettings {
  id: number;
  etherscan_api_key: string;
  chains: number[];
  cache_ttl: number;
  setup_complete: boolean;
  api_key_last_validated_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get application settings
 */
export async function getSettings(): Promise<AppSettings | null> {
  const db = getDb();
  const result = await db.query(`SELECT * FROM settings LIMIT 1`);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    chains: Array.isArray(row.chains) ? row.chains : [],
  };
}

/**
 * Initialize application settings
 */
export async function initializeSettings(
  apiKey: string,
  chains: number[],
  cacheTtl: number
): Promise<AppSettings> {
  const db = getDb();

  // Delete existing settings if any
  await db.query(`DELETE FROM settings`);

  const result = await db.query(
    `INSERT INTO settings (etherscan_api_key, chains, cache_ttl, setup_complete, updated_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING *`,
    [apiKey, JSON.stringify(chains), cacheTtl, true]
  );

  const row = result.rows[0];
  return {
    ...row,
    chains: Array.isArray(row.chains) ? row.chains : [],
  };
}

/**
 * Update application settings
 */
export async function updateSettings(updates: {
  etherscan_api_key?: string;
  chains?: number[];
  cache_ttl?: number;
}): Promise<AppSettings> {
  const db = getDb();
  const current = await getSettings();

  if (!current) {
    throw new Error('Settings not initialized');
  }

  const newApiKey = updates.etherscan_api_key ?? current.etherscan_api_key;
  const newChains = updates.chains ?? current.chains;
  const newCacheTtl = updates.cache_ttl ?? current.cache_ttl;

  const result = await db.query(
    `UPDATE settings
     SET etherscan_api_key = $1,
         chains = $2,
         cache_ttl = $3,
         updated_at = now()
     WHERE id = $4
     RETURNING *`,
    [newApiKey, JSON.stringify(newChains), newCacheTtl, current.id]
  );

  const row = result.rows[0];
  return {
    ...row,
    chains: Array.isArray(row.chains) ? row.chains : [],
  };
}

/**
 * Check if setup is complete
 */
export async function isSetupComplete(): Promise<boolean> {
  const settings = await getSettings();
  return settings?.setup_complete ?? false;
}
