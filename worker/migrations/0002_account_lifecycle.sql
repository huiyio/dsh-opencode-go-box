ALTER TABLE accounts ADD COLUMN starts_at TEXT;
ALTER TABLE accounts ADD COLUMN expires_at TEXT;
ALTER TABLE accounts ADD COLUMN auto_delete INTEGER NOT NULL DEFAULT 0 CHECK (auto_delete IN (0, 1));

UPDATE accounts
SET starts_at = strftime('%Y-%m-%d', created_at, '+8 hours')
WHERE starts_at IS NULL;

CREATE INDEX IF NOT EXISTS accounts_lifecycle
  ON accounts (auto_delete, expires_at, starts_at);
