PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  key_ciphertext TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  key_salt TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL UNIQUE,
  key_suffix TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS accounts_enabled_created_at
  ON accounts (enabled, created_at);

CREATE TABLE IF NOT EXISTS usage_cache (
  account_id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS usage_cache_expires_at
  ON usage_cache (expires_at);
