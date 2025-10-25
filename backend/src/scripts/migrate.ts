import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Migration {
  name: string;
  sql: string;
}

interface MigrationStatus {
  applied: string[];
  pending: string[];
}

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(client: Client): Promise<string[]> {
  const result = await client.query<{ name: string }>('SELECT name FROM _migrations ORDER BY name');
  return result.rows.map((row) => row.name);
}

function loadMigrationFiles(): Migration[] {
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir);

  return files
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => ({
      name: file,
      sql: fs.readFileSync(path.join(migrationsDir, file), 'utf-8'),
    }));
}

async function getMigrationStatus(client: Client): Promise<MigrationStatus> {
  await ensureMigrationsTable(client);

  const appliedMigrations = await getAppliedMigrations(client);
  const allMigrations = loadMigrationFiles();

  const appliedSet = new Set(appliedMigrations);
  const pending = allMigrations.filter((m) => !appliedSet.has(m.name)).map((m) => m.name);

  return {
    applied: appliedMigrations,
    pending,
  };
}

async function applyMigration(client: Client, migration: Migration): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(migration.sql);
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migration.name]);
    await client.query('COMMIT');
    console.log(`✓ Applied migration: ${migration.name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(
      `Failed to apply migration ${migration.name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function applyMigrations(client: Client): Promise<void> {
  await ensureMigrationsTable(client);

  const status = await getMigrationStatus(client);

  if (status.pending.length === 0) {
    console.log('✓ All migrations are up to date');
    return;
  }

  const allMigrations = loadMigrationFiles();
  const pendingMigrations = allMigrations.filter((m) => status.pending.includes(m.name));

  console.log(`Applying ${pendingMigrations.length} pending migration(s)...`);

  for (const migration of pendingMigrations) {
    await applyMigration(client, migration);
  }

  console.log(`✓ Successfully applied ${pendingMigrations.length} migration(s)`);
}

async function main() {
  const args = process.argv.slice(2);
  const showStatus = args.includes('--status');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();

    if (showStatus) {
      const status = await getMigrationStatus(client);
      console.log(JSON.stringify(status, null, 2));
    } else {
      await applyMigrations(client);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
