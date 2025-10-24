-- Initial schema migration
-- Creates core application tables using pgcrypto for UUID generation

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Application settings and configuration
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  etherscan_api_key TEXT NOT NULL,
  chains JSONB DEFAULT '[]',
  cache_ttl INT DEFAULT 60,
  setup_complete BOOLEAN DEFAULT false,
  api_key_last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users for dashboard authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- API usage logging for metrics and monitoring
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  chain_id INT NOT NULL,
  call_count INT NOT NULL,
  status_code INT DEFAULT 200,
  latency_ms INT DEFAULT 0,
  date DATE NOT NULL,
  UNIQUE (date, endpoint, chain_id)
);

-- Analytics data cache for token metrics
CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT NOT NULL,
  chain_id INT NOT NULL,
  date DATE NOT NULL,
  holder_count INT,
  tx_count INT,
  UNIQUE (token_address, chain_id, date)
);
