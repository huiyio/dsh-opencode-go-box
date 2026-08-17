import { decryptApiKey, encryptApiKey, secureEqual } from "./crypto.js";
import { WorkerError } from "./errors.js";

const encoder = new TextEncoder();
const PASSWORD_BYTES = 32;
const USER_BACKUP_ID = "user-backup-v1";
const PASSWORD_INFO = "opencode-go-balance:worker-password:v1";

function bytesToBase64(value) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function normalizeUsername(value) {
  const username = typeof value === "string" ? value.trim() : "";
  if (username.length < 3 || username.length > 64 || /[\s\x00-\x1f\x7f]/.test(username)) {
    throw new WorkerError("invalid_username", "Username must contain 3 to 64 characters without spaces");
  }
  return username;
}

function usernameKey(value) {
  return normalizeUsername(value).toLowerCase();
}

function normalizePassword(value, { optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === "")) return null;
  if (typeof value !== "string" || value.length < 8 || value.length > 128 || /[\r\n]/.test(value)) {
    throw new WorkerError("invalid_password", "Password must contain 8 to 128 characters without line breaks");
  }
  return value;
}

function normalizeAccountIds(value) {
  if (!Array.isArray(value) || value.length > 500) {
    throw new WorkerError("invalid_permissions", "accountIds must be an array with at most 500 items");
  }
  const ids = value.map((id) => {
    if (typeof id !== "string" || id.length < 1 || id.length > 100) {
      throw new WorkerError("invalid_permissions", "Account permission contains an invalid account ID");
    }
    return id;
  });
  return [...new Set(ids)];
}

async function derivePassword(password, salt, secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new WorkerError("user_store_disabled", "KEY_ENCRYPTION_SECRET must contain at least 32 characters", 503);
  }
  const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({
    name: "HKDF",
    hash: "SHA-256",
    salt,
    info: encoder.encode(PASSWORD_INFO),
  }, material, { name: "HMAC", hash: "SHA-256", length: PASSWORD_BYTES * 8 }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(password)));
}

export async function hashUserPassword(password, secret, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const normalized = normalizePassword(password);
  return { salt: bytesToBase64(salt), hash: bytesToBase64(await derivePassword(normalized, salt, secret)) };
}

export async function verifyUserPassword(password, hash, salt, secret) {
  if (typeof password !== "string" || typeof hash !== "string" || typeof salt !== "string") return false;
  try {
    const actual = bytesToBase64(await derivePassword(password, base64ToBytes(salt), secret));
    return secureEqual(actual, hash);
  } catch {
    return false;
  }
}

function publicUser(row, accountIds = []) {
  return {
    id: row.id,
    username: row.username,
    enabled: Boolean(row.enabled),
    accountIds,
    authVersion: Number(row.auth_version || 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateBackupUser(user) {
  if (!user || typeof user !== "object" || typeof user.id !== "string" || user.id.length < 1 || user.id.length > 100
    || typeof user.passwordHash !== "string" || typeof user.passwordSalt !== "string"
    || typeof user.enabled !== "boolean" || typeof user.createdAt !== "string" || typeof user.updatedAt !== "string") {
    throw new WorkerError("invalid_backup", "The backup user data is invalid");
  }
  const username = normalizeUsername(user.username);
  const accountIds = normalizeAccountIds(user.accountIds);
  if (base64ToBytes(user.passwordHash).length !== PASSWORD_BYTES || base64ToBytes(user.passwordSalt).length !== 16) {
    throw new WorkerError("invalid_backup", "The backup user password data is invalid");
  }
  const authVersion = user.authVersion === undefined ? 1 : user.authVersion;
  if (!Number.isSafeInteger(authVersion) || authVersion < 1) {
    throw new WorkerError("invalid_backup", "The backup user session version is invalid");
  }
  return { ...user, username, usernameKey: usernameKey(username), accountIds, authVersion };
}

export class UserStore {
  constructor(env) {
    this.env = env;
  }

  get writable() {
    return typeof this.env.KEY_ENCRYPTION_SECRET === "string" && this.env.KEY_ENCRYPTION_SECRET.length >= 32;
  }

  async list() {
    const [usersResult, permissionsResult] = await Promise.all([
      this.env.DB.prepare("SELECT * FROM users ORDER BY created_at ASC").all(),
      this.env.DB.prepare("SELECT user_id, account_id FROM user_accounts ORDER BY user_id, account_id").all(),
    ]);
    const permissions = new Map();
    for (const row of permissionsResult.results) {
      const ids = permissions.get(row.user_id) || [];
      ids.push(row.account_id);
      permissions.set(row.user_id, ids);
    }
    return usersResult.results.map((row) => publicUser(row, permissions.get(row.id) || []));
  }

  async getById(id) {
    const row = await this.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
    if (!row) return null;
    const result = await this.env.DB.prepare("SELECT account_id FROM user_accounts WHERE user_id = ? ORDER BY account_id").bind(id).all();
    return publicUser(row, result.results.map((permission) => permission.account_id));
  }

  async getEnabledById(id) {
    const user = await this.getById(id);
    return user?.enabled ? user : null;
  }

  async authenticate(username, password) {
    if (typeof username !== "string" || typeof password !== "string") return null;
    const row = await this.env.DB.prepare("SELECT * FROM users WHERE username_key = ?").bind(username.trim().toLowerCase()).first();
    if (!row) {
      await derivePassword(password, new Uint8Array(16), this.env.KEY_ENCRYPTION_SECRET);
      return null;
    }
    if (!(await verifyUserPassword(password, row.password_hash, row.password_salt, this.env.KEY_ENCRYPTION_SECRET)) || !Boolean(row.enabled)) return null;
    return this.getById(row.id);
  }

  async validateAccountIds(value) {
    const ids = normalizeAccountIds(value);
    const result = await this.env.DB.prepare("SELECT id FROM accounts").all();
    const known = new Set(result.results.map((row) => row.id));
    if (this.env.OPENCODE_GO_API_KEY) known.add("environment");
    if (ids.some((id) => !known.has(id))) {
      throw new WorkerError("invalid_permissions", "One or more account permissions do not exist");
    }
    return ids;
  }

  async add(input) {
    if (!this.writable) throw new WorkerError("user_store_disabled", "User management is disabled", 503);
    const username = normalizeUsername(input?.username);
    const normalizedKey = usernameKey(username);
    if (normalizedKey === String(this.env.WEB_USERNAME || "").trim().toLowerCase()) {
      throw new WorkerError("duplicate_username", "This username already exists", 409);
    }
    const enabled = input?.enabled === undefined ? true : input.enabled;
    if (typeof enabled !== "boolean") throw new WorkerError("invalid_enabled", "enabled must be a boolean");
    const accountIds = await this.validateAccountIds(input?.accountIds || []);
    const password = await hashUserPassword(input?.password, this.env.KEY_ENCRYPTION_SECRET);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const statements = [this.env.DB.prepare(`INSERT INTO users (
      id, username, username_key, password_hash, password_salt, enabled, auth_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      id, username, normalizedKey, password.hash, password.salt, enabled ? 1 : 0, 1, now, now,
    )];
    statements.push(...accountIds.map((accountId) => this.env.DB.prepare(
      "INSERT INTO user_accounts (user_id, account_id) VALUES (?, ?)",
    ).bind(id, accountId)));
    try {
      await this.env.DB.batch(statements);
    } catch (error) {
      if (String(error?.message || error).includes("UNIQUE")) {
        throw new WorkerError("duplicate_username", "This username already exists", 409);
      }
      throw error;
    }
    return { id, username, enabled, accountIds, authVersion: 1, createdAt: now, updatedAt: now };
  }

  async update(id, input) {
    if (!this.writable) throw new WorkerError("user_store_disabled", "User management is disabled", 503);
    const row = await this.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
    if (!row) throw new WorkerError("user_not_found", "User not found", 404);
    const username = Object.hasOwn(input, "username") ? normalizeUsername(input.username) : row.username;
    const normalizedKey = usernameKey(username);
    if (normalizedKey === String(this.env.WEB_USERNAME || "").trim().toLowerCase()) {
      throw new WorkerError("duplicate_username", "This username already exists", 409);
    }
    const enabled = Object.hasOwn(input, "enabled") ? input.enabled : Boolean(row.enabled);
    if (typeof enabled !== "boolean") throw new WorkerError("invalid_enabled", "enabled must be a boolean");
    const accountIds = Object.hasOwn(input, "accountIds")
      ? await this.validateAccountIds(input.accountIds)
      : (await this.getById(id)).accountIds;
    let passwordHash = row.password_hash;
    let passwordSalt = row.password_salt;
    let invalidateSessions = username !== row.username || enabled !== Boolean(row.enabled);
    if (Object.hasOwn(input, "password") && input.password !== "") {
      const password = await hashUserPassword(normalizePassword(input.password, { optional: true }), this.env.KEY_ENCRYPTION_SECRET);
      passwordHash = password.hash;
      passwordSalt = password.salt;
      invalidateSessions = true;
    }
    const authVersion = Number(row.auth_version || 1) + (invalidateSessions ? 1 : 0);
    const now = new Date().toISOString();
    const statements = [
      this.env.DB.prepare(`UPDATE users SET username = ?, username_key = ?, password_hash = ?, password_salt = ?,
        enabled = ?, auth_version = ?, updated_at = ? WHERE id = ?`).bind(
        username, normalizedKey, passwordHash, passwordSalt, enabled ? 1 : 0, authVersion, now, id,
      ),
      this.env.DB.prepare("DELETE FROM user_accounts WHERE user_id = ?").bind(id),
      ...accountIds.map((accountId) => this.env.DB.prepare(
        "INSERT INTO user_accounts (user_id, account_id) VALUES (?, ?)",
      ).bind(id, accountId)),
    ];
    try {
      await this.env.DB.batch(statements);
    } catch (error) {
      if (String(error?.message || error).includes("UNIQUE")) {
        throw new WorkerError("duplicate_username", "This username already exists", 409);
      }
      throw error;
    }
    return { id, username, enabled, accountIds, authVersion, createdAt: row.created_at, updatedAt: now };
  }

  async remove(id) {
    const user = await this.getById(id);
    if (!user) throw new WorkerError("user_not_found", "User not found", 404);
    await this.env.DB.batch([
      this.env.DB.prepare("DELETE FROM user_accounts WHERE user_id = ?").bind(id),
      this.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id),
    ]);
    return user;
  }

  async revokeAccount(accountId) {
    await this.env.DB.prepare("DELETE FROM user_accounts WHERE account_id = ?").bind(accountId).run();
  }

  async retainAccounts() {
    const [permissions, accounts] = await Promise.all([
      this.env.DB.prepare("SELECT user_id, account_id FROM user_accounts").all(),
      this.env.DB.prepare("SELECT id FROM accounts").all(),
    ]);
    const known = new Set(accounts.results.map((row) => row.id));
    if (this.env.OPENCODE_GO_API_KEY) known.add("environment");
    const invalid = permissions.results.filter((row) => !known.has(row.account_id));
    if (invalid.length > 0) {
      await this.env.DB.batch(invalid.map((row) => this.env.DB.prepare(
        "DELETE FROM user_accounts WHERE user_id = ? AND account_id = ?",
      ).bind(row.user_id, row.account_id)));
    }
  }

  async exportBackup() {
    const users = await this.list();
    const rows = await this.env.DB.prepare("SELECT id, password_hash, password_salt FROM users").all();
    const passwordById = new Map(rows.results.map((row) => [row.id, row]));
    const payload = users.map((user) => ({
      ...user,
      passwordHash: passwordById.get(user.id).password_hash,
      passwordSalt: passwordById.get(user.id).password_salt,
    }));
    return {
      format: "opencode-go-workers-users-encrypted-v1",
      exportedAt: new Date().toISOString(),
      store: await encryptApiKey(this.env.KEY_ENCRYPTION_SECRET, USER_BACKUP_ID, JSON.stringify({ version: 1, users: payload })),
    };
  }

  async restoreBackup(backup) {
    if (backup?.format !== "opencode-go-workers-users-encrypted-v1" || !backup.store) {
      throw new WorkerError("invalid_backup", "This backup does not contain valid user data");
    }
    let payload;
    try {
      payload = JSON.parse(await decryptApiKey(this.env.KEY_ENCRYPTION_SECRET, USER_BACKUP_ID, backup.store));
    } catch {
      throw new WorkerError("invalid_backup", "The user backup cannot be decrypted with the current KEY_ENCRYPTION_SECRET");
    }
    if (!payload || payload.version !== 1 || !Array.isArray(payload.users) || payload.users.length > 500) {
      throw new WorkerError("invalid_backup", "The backup user data is invalid");
    }
    const users = payload.users.map(validateBackupUser);
    if (new Set(users.map((user) => user.id)).size !== users.length
      || new Set(users.map((user) => user.usernameKey)).size !== users.length
      || users.some((user) => user.usernameKey === String(this.env.WEB_USERNAME || "").trim().toLowerCase())) {
      throw new WorkerError("invalid_backup", "The backup contains duplicate or reserved users");
    }
    const validAccountIds = new Set((await this.env.DB.prepare("SELECT id FROM accounts").all()).results.map((row) => row.id));
    if (this.env.OPENCODE_GO_API_KEY) validAccountIds.add("environment");
    for (const user of users) user.accountIds = user.accountIds.filter((id) => validAccountIds.has(id));
    const statements = [
      this.env.DB.prepare("DELETE FROM user_accounts"),
      this.env.DB.prepare("DELETE FROM users"),
      ...users.flatMap((user) => [
        this.env.DB.prepare(`INSERT INTO users (
          id, username, username_key, password_hash, password_salt, enabled, auth_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          user.id, user.username, user.usernameKey, user.passwordHash, user.passwordSalt,
          user.enabled ? 1 : 0, user.authVersion, user.createdAt, user.updatedAt,
        ),
        ...user.accountIds.map((accountId) => this.env.DB.prepare(
          "INSERT INTO user_accounts (user_id, account_id) VALUES (?, ?)",
        ).bind(user.id, accountId)),
      ]),
    ];
    await this.env.DB.batch(statements);
    return { userCount: users.length };
  }
}
