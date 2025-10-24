# Database Schema

This document describes the database schema for ExplorerToken.

## Overview

ExplorerToken uses PostgreSQL as its database. The schema consists of four core tables that manage application configuration, user authentication, API usage tracking, and analytics caching.

## Schema Tables

### `_migrations`

Tracks applied database migrations to ensure schema version consistency.

- `id` (SERIAL PRIMARY KEY): Auto-incrementing migration ID
- `name` (TEXT UNIQUE NOT NULL): Migration filename (e.g., "0001_init.sql")
- `applied_at` (TIMESTAMPTZ NOT NULL): Timestamp when the migration was applied

### `settings`

Stores global application configuration.

- `id` (SERIAL PRIMARY KEY): Settings record ID
- `etherscan_api_key` (TEXT NOT NULL): Etherscan API key for blockchain data
- `chains` (JSONB DEFAULT '[]'): List of supported blockchain networks
- `cache_ttl` (INT DEFAULT 60): Cache time-to-live in seconds
- `setup_complete` (BOOLEAN DEFAULT false): Whether initial setup is complete
- `api_key_last_validated_at` (TIMESTAMPTZ): Last API key validation timestamp
- `created_at` (TIMESTAMPTZ DEFAULT now()): Record creation timestamp
- `updated_at` (TIMESTAMPTZ DEFAULT now()): Record update timestamp

### `admin_users`

Manages administrator accounts for the dashboard.

- `id` (UUID PRIMARY KEY): Unique user identifier
- `username` (TEXT UNIQUE NOT NULL): Administrator username
- `password_hash` (TEXT NOT NULL): Bcrypt-hashed password
- `role` (TEXT DEFAULT 'admin'): User role
- `is_active` (BOOLEAN DEFAULT true): Whether the account is active
- `last_login_at` (TIMESTAMPTZ): Last login timestamp
- `created_at` (TIMESTAMPTZ DEFAULT now()): Account creation timestamp

### `api_usage_log`

Tracks API endpoint usage for monitoring and analytics.

- `id` (UUID PRIMARY KEY): Log entry identifier
- `endpoint` (TEXT NOT NULL): API endpoint path
- `chain_id` (INT NOT NULL): Blockchain network ID
- `call_count` (INT NOT NULL): Number of API calls
- `status_code` (INT DEFAULT 200): HTTP response status code
- `latency_ms` (INT DEFAULT 0): Response latency in milliseconds
- `date` (DATE NOT NULL): Date of the logged activity
- **UNIQUE constraint**: `(date, endpoint, chain_id)` to prevent duplicate entries

### `analytics_cache`

Caches token analytics data to reduce API calls.

- `id` (UUID PRIMARY KEY): Cache entry identifier
- `token_address` (TEXT NOT NULL): Token contract address
- `chain_id` (INT NOT NULL): Blockchain network ID
- `date` (DATE NOT NULL): Date of the cached data
- `holder_count` (INT): Number of token holders
- `tx_count` (INT): Number of transactions
- **UNIQUE constraint**: `(token_address, chain_id, date)` to prevent duplicate entries

## UUID Generation with pgcrypto

The schema uses the `pgcrypto` extension for UUID generation via the `gen_random_uuid()` function. This approach is preferred over `uuid-ossp` because:

1. **Security**: `gen_random_uuid()` uses cryptographically secure random number generation
2. **Standard compliance**: Generates UUID v4 (random) as per RFC 4122
3. **Built-in availability**: `pgcrypto` is commonly available in PostgreSQL installations
4. **Performance**: Efficient generation with minimal overhead

The extension is enabled in the initial migration (`0001_init.sql`) and provides UUID primary keys for `admin_users`, `api_usage_log`, and `analytics_cache` tables.

## Migration System

Database migrations are plain SQL files stored in `backend/migrations/` and executed in alphabetical order:

1. `0000_bootstrap.sql` - Creates the `_migrations` table
2. `0001_init.sql` - Creates the initial schema with pgcrypto extension and core tables
3. Future migrations follow the pattern `NNNN_description.sql`

The migration runner (`backend/src/migrate/run.ts`) tracks applied migrations in the `_migrations` table to ensure idempotent execution.

## Running Migrations Locally

To set up the database for local development:

```bash
cd backend
cp .env.sample .env   # edit if needed
npm i
npm run migrate
npm run migrate:status
```

After running migrations, you can verify the tables were created using PostgreSQL meta-commands:

```bash
psql "$DATABASE_URL" -c "\dt"
```

This will list all tables in the database, confirming that the schema has been applied correctly.
