import { decryptApiKey, encryptApiKey, fingerprintApiKey } from "./crypto.js";
import { WorkerError } from "./errors.js";

const ENVIRONMENT_ACCOUNT_ID = "environment";
const LIFECYCLE_TIME_ZONE = "Asia/Shanghai";

function zonedDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: LIFECYCLE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

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

function dateOnly(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new WorkerError("invalid_lifecycle", `${fieldName} must use YYYY-MM-DD`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new WorkerError("invalid_lifecycle", `${fieldName} is not a valid date`);
  }
  return value;
}

function addCalendarMonth(value) {
  const [year, month, day] = value.split("-").map(Number);
  const targetMonth = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), Math.min(day, lastDay)))
    .toISOString().slice(0, 10);
}

function lifecycle(input, current, defaultStart) {
  const hasStartsAt = Object.hasOwn(input, "startsAt") && input.startsAt !== undefined;
  const hasExpiresAt = Object.hasOwn(input, "expiresAt") && input.expiresAt !== undefined;
  const hasAutoDelete = Object.hasOwn(input, "autoDelete") && input.autoDelete !== undefined;
  const startsAt = dateOnly(hasStartsAt ? input.startsAt : current?.startsAt ?? defaultStart, "startsAt");
  const autoDelete = hasAutoDelete ? input.autoDelete : Boolean(current?.autoDelete);
  if (typeof autoDelete !== "boolean") throw new WorkerError("invalid_lifecycle", "autoDelete must be a boolean");
  const expiresAt = autoDelete
    ? addCalendarMonth(startsAt || defaultStart)
    : dateOnly(hasExpiresAt ? input.expiresAt : current?.expiresAt ?? null, "expiresAt");
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    throw new WorkerError("invalid_lifecycle", "expiresAt must be later than startsAt");
  }
  return { startsAt, expiresAt, autoDelete };
}

function lifecycleStatus(account, today = zonedDate()) {
  if (!Boolean(account.enabled)) return "disabled";
  if (account.startsAt && account.startsAt > today) return "pending";
  if (account.expiresAt && account.expiresAt <= today) return "expired";
  return "active";
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
    startsAt: null,
    expiresAt: null,
    autoDelete: false,
    lifecycleStatus: "active",
  };
}

function publicStoredAccount(row) {
  const account = {
    id: row.id,
    label: row.label,
    maskedKey: `••••••••${row.key_suffix}`,
    enabled: Boolean(row.enabled),
    editable: true,
    source: "stored",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startsAt: row.starts_at || null,
    expiresAt: row.expires_at || null,
    autoDelete: Boolean(row.auto_delete),
  };
  return { ...account, lifecycleStatus: lifecycleStatus(account) };
}

export class AccountStore {
  constructor(env) {
    this.env = env;
  }

  get writable() {
    return typeof this.env.KEY_ENCRYPTION_SECRET === "string" && this.env.KEY_ENCRYPTION_SECRET.length >= 32;
  }

  async countEnabled() {
    const today = zonedDate();
    const row = await this.env.DB.prepare(`SELECT COUNT(*) AS count FROM accounts
      WHERE enabled = 1 AND (starts_at IS NULL OR starts_at <= ?) AND (expires_at IS NULL OR expires_at > ?)`)
      .bind(today, today).first();
    return Number(row?.count || 0) + (this.env.OPENCODE_GO_API_KEY ? 1 : 0);
  }

  async list({ includeDisabled = false } = {}) {
    const today = zonedDate();
    const query = includeDisabled
      ? "SELECT * FROM accounts ORDER BY created_at ASC"
      : `SELECT * FROM accounts WHERE enabled = 1
        AND (starts_at IS NULL OR starts_at <= ?) AND (expires_at IS NULL OR expires_at > ?)
        ORDER BY created_at ASC`;
    const statement = this.env.DB.prepare(query);
    const result = await (includeDisabled ? statement : statement.bind(today, today)).all();
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
    const dates = lifecycle(input || {}, null, zonedDate());
    const [fingerprint, encrypted] = await Promise.all([
      fingerprintApiKey(this.env.KEY_ENCRYPTION_SECRET, key),
      encryptApiKey(this.env.KEY_ENCRYPTION_SECRET, id, key),
    ]);
    const duplicate = await this.env.DB.prepare("SELECT id FROM accounts WHERE key_fingerprint = ?").bind(fingerprint).first();
    if (duplicate) throw new WorkerError("duplicate_key", "This API key already exists", 409);
    try {
      await this.env.DB.prepare(`INSERT INTO accounts (
        id, label, key_ciphertext, key_iv, key_salt, key_fingerprint, key_suffix, enabled,
        starts_at, expires_at, auto_delete, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`).bind(
        id, label, encrypted.ciphertext, encrypted.iv, encrypted.salt, fingerprint, key.slice(-4),
        dates.startsAt, dates.expiresAt, dates.autoDelete ? 1 : 0, now, now,
      ).run();
    } catch (error) {
      if (String(error?.message || error).includes("UNIQUE")) {
        throw new WorkerError("duplicate_key", "This API key already exists", 409);
      }
      throw error;
    }
    return {
      id, label, maskedKey: `••••••••${key.slice(-4)}`, enabled: true,
      editable: true, source: "stored", createdAt: now, updatedAt: now, ...dates,
      lifecycleStatus: lifecycleStatus({ enabled: true, ...dates }),
    };
  }

  async update(id, input) {
    const row = await this.env.DB.prepare("SELECT * FROM accounts WHERE id = ?").bind(id).first();
    if (!row) throw new WorkerError("account_not_found", "Account not found", 404);
    const label = Object.hasOwn(input, "label") ? normalizeLabel(input.label) : row.label;
    const enabled = Object.hasOwn(input, "enabled") ? (Boolean(input.enabled) ? 1 : 0) : row.enabled;
    const now = new Date().toISOString();
    const dates = lifecycle(input || {}, {
      startsAt: row.starts_at,
      expiresAt: row.expires_at,
      autoDelete: Boolean(row.auto_delete),
    }, zonedDate(new Date(row.created_at)));
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
      label = ?, key_ciphertext = ?, key_iv = ?, key_salt = ?, key_fingerprint = ?, key_suffix = ?, enabled = ?,
      starts_at = ?, expires_at = ?, auto_delete = ?, updated_at = ?
      WHERE id = ?`).bind(
      label, encrypted.ciphertext, encrypted.iv, encrypted.salt, fingerprint, suffix, enabled,
      dates.startsAt, dates.expiresAt, dates.autoDelete ? 1 : 0, now, id,
    )];
    if (replacingKey) statements.push(this.env.DB.prepare("DELETE FROM usage_cache WHERE account_id = ?").bind(id));
    await this.env.DB.batch(statements);
    return {
      id, label, maskedKey: `••••••••${suffix}`, enabled: Boolean(enabled),
      editable: true, source: "stored", createdAt: row.created_at, updatedAt: now, ...dates,
      lifecycleStatus: lifecycleStatus({ enabled: Boolean(enabled), ...dates }),
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

  async cleanupExpired(today = zonedDate()) {
    const result = await this.env.DB.prepare(
      "SELECT id FROM accounts WHERE auto_delete = 1 AND expires_at IS NOT NULL AND expires_at <= ?",
    ).bind(today).all();
    const ids = result.results.map((row) => row.id);
    if (ids.length === 0) return [];
    await this.env.DB.batch(ids.flatMap((id) => [
      this.env.DB.prepare("DELETE FROM usage_cache WHERE account_id = ?").bind(id),
      this.env.DB.prepare("DELETE FROM accounts WHERE id = ?").bind(id),
    ]));
    return ids;
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

  async exportBackup() {
    if (!this.writable) throw new WorkerError("key_store_disabled", "Account management is disabled", 503);
    const result = await this.env.DB.prepare(`SELECT id, label, key_ciphertext, key_iv, key_salt,
      key_fingerprint, key_suffix, enabled, starts_at, expires_at, auto_delete, created_at, updated_at
      FROM accounts ORDER BY created_at ASC`).all();
    return {
      format: "opencode-go-workers-encrypted-v1",
      exportedAt: new Date().toISOString(),
      accounts: result.results,
    };
  }

  async restoreBackup(backup) {
    if (!this.writable) throw new WorkerError("key_store_disabled", "Account management is disabled", 503);
    if (backup?.format !== "opencode-go-workers-encrypted-v1" || !Array.isArray(backup.accounts) || backup.accounts.length > 500) {
      throw new WorkerError("invalid_backup", "The backup account data is invalid");
    }
    const accounts = backup.accounts.map((account) => {
      if (!account || typeof account !== "object"
        || typeof account.id !== "string" || account.id.length < 1 || account.id.length > 100
        || typeof account.label !== "string" || account.label.length < 1 || account.label.length > 80
        || typeof account.key_ciphertext !== "string" || typeof account.key_iv !== "string" || typeof account.key_salt !== "string"
        || typeof account.key_fingerprint !== "string" || typeof account.key_suffix !== "string"
        || ![0, 1].includes(Number(account.enabled))
        || typeof account.created_at !== "string" || typeof account.updated_at !== "string") {
        throw new WorkerError("invalid_backup", "The backup account data is invalid");
      }
      const dates = lifecycle({
        startsAt: account.starts_at,
        expiresAt: account.expires_at,
        autoDelete: account.auto_delete === undefined ? false : Boolean(account.auto_delete),
      }, null, zonedDate(new Date(account.created_at)));
      return { ...account, starts_at: dates.startsAt, expires_at: dates.expiresAt, auto_delete: dates.autoDelete ? 1 : 0 };
    });
    if (new Set(accounts.map((account) => account.id)).size !== accounts.length
      || new Set(accounts.map((account) => account.key_fingerprint)).size !== accounts.length) {
      throw new WorkerError("invalid_backup", "The backup contains duplicate accounts or keys");
    }
    for (const account of accounts) {
      const key = await decryptApiKey(this.env.KEY_ENCRYPTION_SECRET, account.id, {
        ciphertext: account.key_ciphertext,
        iv: account.key_iv,
        salt: account.key_salt,
      });
      if (key.slice(-4) !== account.key_suffix || await fingerprintApiKey(this.env.KEY_ENCRYPTION_SECRET, key) !== account.key_fingerprint) {
        throw new WorkerError("invalid_backup", "The backup key integrity check failed");
      }
    }
    const statements = [
      this.env.DB.prepare("DELETE FROM usage_cache"),
      this.env.DB.prepare("DELETE FROM accounts"),
      ...accounts.map((account) => this.env.DB.prepare(`INSERT INTO accounts (
        id, label, key_ciphertext, key_iv, key_salt, key_fingerprint, key_suffix, enabled,
        starts_at, expires_at, auto_delete, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        account.id, account.label, account.key_ciphertext, account.key_iv, account.key_salt,
        account.key_fingerprint, account.key_suffix, Number(account.enabled), account.starts_at, account.expires_at,
        Number(account.auto_delete), account.created_at, account.updated_at,
      )),
    ];
    await this.env.DB.batch(statements);
    return { count: accounts.length };
  }
}
