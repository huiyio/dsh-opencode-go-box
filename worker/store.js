import { decryptApiKey, encryptApiKey, fingerprintApiKey } from "./crypto.js";
import { WorkerError } from "./errors.js";

const ENVIRONMENT_ACCOUNT_ID = "environment";

function normalizeLabel(value) {
  const label = typeof value === "string" ? value.trim() : "";
  if (label.length < 1 || label.length > 80) {
    throw new WorkerError("invalid_label", "Account label must contain 1 to 80 characters");
  }
  return label;
}

function normalizeKey(value) {
  const key = typeof value === "string" ? value.trim() : "";
  if (key.length < 8 || key.length > 512 || /[\r\n]/.test(key)) {
    throw new WorkerError("invalid_key", "API key must contain 8 to 512 characters without line breaks");
  }
  return key;
}

function environmentAccount(apiKey) {
  return {
    id: ENVIRONMENT_ACCOUNT_ID,
    label: "Environment key",
    maskedKey: `••••••••${apiKey.slice(-4)}`,
    enabled: true,
    editable: false,
    source: "environment",
    createdAt: null,
    updatedAt: null,
  };
}

function publicStoredAccount(row) {
  return {
    id: row.id,
    label: row.label,
    maskedKey: `••••••••${row.key_suffix}`,
    enabled: Boolean(row.enabled),
    editable: true,
    source: "stored",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AccountStore {
  constructor(env) {
    this.env = env;
  }

  get writable() {
    return typeof this.env.KEY_ENCRYPTION_SECRET === "string" && this.env.KEY_ENCRYPTION_SECRET.length >= 32;
  }

  async countEnabled() {
    const row = await this.env.DB.prepare("SELECT COUNT(*) AS count FROM accounts WHERE enabled = 1").first();
    return Number(row?.count || 0) + (this.env.OPENCODE_GO_API_KEY ? 1 : 0);
  }

  async list({ includeDisabled = false } = {}) {
    const query = includeDisabled
      ? "SELECT * FROM accounts ORDER BY created_at ASC"
      : "SELECT * FROM accounts WHERE enabled = 1 ORDER BY created_at ASC";
    const result = await this.env.DB.prepare(query).all();
    const accounts = this.env.OPENCODE_GO_API_KEY ? [environmentAccount(this.env.OPENCODE_GO_API_KEY)] : [];
    accounts.push(...result.results.map(publicStoredAccount));
    return accounts;
  }

  async getSecret(accountId) {
    if (accountId === ENVIRONMENT_ACCOUNT_ID && this.env.OPENCODE_GO_API_KEY) {
      return { ...environmentAccount(this.env.OPENCODE_GO_API_KEY), key: this.env.OPENCODE_GO_API_KEY };
    }
    const row = await this.env.DB.prepare("SELECT * FROM accounts WHERE id = ?").bind(accountId).first();
    if (!row) throw new WorkerError("account_not_found", "Account not found", 404);
    const key = await decryptApiKey(this.env.KEY_ENCRYPTION_SECRET, row.id, {
      ciphertext: row.key_ciphertext,
      iv: row.key_iv,
      salt: row.key_salt,
    });
    return { ...publicStoredAccount(row), key };
  }

  async resolve(accountId) {
    if (accountId) return this.getSecret(accountId);
    const accounts = await this.list();
    if (accounts.length === 0) throw new WorkerError("no_accounts", "No OpenCode Go accounts are configured", 503);
    return this.getSecret(accounts[0].id);
  }

  async add(input) {
    if (!this.writable) throw new WorkerError("key_store_disabled", "Account management is disabled", 503);
    const label = normalizeLabel(input?.label);
    const key = normalizeKey(input?.key);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const [fingerprint, encrypted] = await Promise.all([
      fingerprintApiKey(this.env.KEY_ENCRYPTION_SECRET, key),
      encryptApiKey(this.env.KEY_ENCRYPTION_SECRET, id, key),
    ]);
    const duplicate = await this.env.DB.prepare("SELECT id FROM accounts WHERE key_fingerprint = ?").bind(fingerprint).first();
    if (duplicate) throw new WorkerError("duplicate_key", "This API key already exists", 409);
    try {
      await this.env.DB.prepare(`INSERT INTO accounts (
        id, label, key_ciphertext, key_iv, key_salt, key_fingerprint, key_suffix, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).bind(
        id, label, encrypted.ciphertext, encrypted.iv, encrypted.salt, fingerprint, key.slice(-4), now, now,
      ).run();
    } catch (error) {
      if (String(error?.message || error).includes("UNIQUE")) {
        throw new WorkerError("duplicate_key", "This API key already exists", 409);
      }
      throw error;
    }
    return {
      id, label, maskedKey: `••••••••${key.slice(-4)}`, enabled: true,
      editable: true, source: "stored", createdAt: now, updatedAt: now,
    };
  }

  async update(id, input) {
    const row = await this.env.DB.prepare("SELECT * FROM accounts WHERE id = ?").bind(id).first();
    if (!row) throw new WorkerError("account_not_found", "Account not found", 404);
    const label = Object.hasOwn(input, "label") ? normalizeLabel(input.label) : row.label;
    const enabled = Object.hasOwn(input, "enabled") ? (Boolean(input.enabled) ? 1 : 0) : row.enabled;
    const now = new Date().toISOString();
    let encrypted = { ciphertext: row.key_ciphertext, iv: row.key_iv, salt: row.key_salt };
    let fingerprint = row.key_fingerprint;
    let suffix = row.key_suffix;
    const replacingKey = Object.hasOwn(input, "key") && input.key !== "";
    if (replacingKey) {
      const key = normalizeKey(input.key);
      [fingerprint, encrypted] = await Promise.all([
        fingerprintApiKey(this.env.KEY_ENCRYPTION_SECRET, key),
        encryptApiKey(this.env.KEY_ENCRYPTION_SECRET, id, key),
      ]);
      const duplicate = await this.env.DB.prepare(
        "SELECT id FROM accounts WHERE key_fingerprint = ? AND id <> ?",
      ).bind(fingerprint, id).first();
      if (duplicate) throw new WorkerError("duplicate_key", "This API key already exists", 409);
      suffix = key.slice(-4);
    }
    const statements = [this.env.DB.prepare(`UPDATE accounts SET
      label = ?, key_ciphertext = ?, key_iv = ?, key_salt = ?, key_fingerprint = ?, key_suffix = ?, enabled = ?, updated_at = ?
      WHERE id = ?`).bind(
      label, encrypted.ciphertext, encrypted.iv, encrypted.salt, fingerprint, suffix, enabled, now, id,
    )];
    if (replacingKey) statements.push(this.env.DB.prepare("DELETE FROM usage_cache WHERE account_id = ?").bind(id));
    await this.env.DB.batch(statements);
    return {
      id, label, maskedKey: `••••••••${suffix}`, enabled: Boolean(enabled),
      editable: true, source: "stored", createdAt: row.created_at, updatedAt: now,
    };
  }

  async remove(id) {
    const row = await this.env.DB.prepare("SELECT * FROM accounts WHERE id = ?").bind(id).first();
    if (!row) throw new WorkerError("account_not_found", "Account not found", 404);
    await this.env.DB.batch([
      this.env.DB.prepare("DELETE FROM accounts WHERE id = ?").bind(id),
      this.env.DB.prepare("DELETE FROM usage_cache WHERE account_id = ?").bind(id),
    ]);
    return publicStoredAccount(row);
  }

  async getCachedUsage(accountId) {
    const row = await this.env.DB.prepare(
      "SELECT payload, fetched_at, expires_at FROM usage_cache WHERE account_id = ? AND expires_at > ?",
    ).bind(accountId, new Date().toISOString()).first();
    if (!row) return null;
    try {
      return { usage: JSON.parse(row.payload), fetchedAt: row.fetched_at, cached: true };
    } catch {
      await this.env.DB.prepare("DELETE FROM usage_cache WHERE account_id = ?").bind(accountId).run();
      return null;
    }
  }

  async putCachedUsage(accountId, value, cacheTtlMs) {
    const expiresAt = new Date(Date.now() + cacheTtlMs).toISOString();
    await this.env.DB.prepare(`INSERT INTO usage_cache (account_id, payload, fetched_at, expires_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET
        payload = excluded.payload, fetched_at = excluded.fetched_at, expires_at = excluded.expires_at`).bind(
      accountId, JSON.stringify(value.usage), value.fetchedAt, expiresAt,
    ).run();
  }
}
