import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const STORE_AAD = Buffer.from("opencode-go-balance:user-store:v1");
const PASSWORD_BYTES = 32;

export class UserStoreError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "UserStoreError";
    this.code = code;
    this.status = status;
  }
}

function normalizeUsername(value) {
  const username = typeof value === "string" ? value.trim() : "";
  if (username.length < 3 || username.length > 64 || /[\s\x00-\x1f\x7f]/.test(username)) {
    throw new UserStoreError("invalid_username", "Username must contain 3 to 64 characters without spaces");
  }
  return username;
}

function usernameKey(value) {
  return normalizeUsername(value).toLowerCase();
}

function normalizePassword(value, { optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === "")) return null;
  if (typeof value !== "string" || value.length < 8 || value.length > 128 || /[\r\n]/.test(value)) {
    throw new UserStoreError("invalid_password", "Password must contain 8 to 128 characters without line breaks");
  }
  return value;
}

function normalizeAccountIds(value) {
  if (!Array.isArray(value) || value.length > 500) {
    throw new UserStoreError("invalid_permissions", "accountIds must be an array with at most 500 items");
  }
  const ids = value.map((id) => {
    if (typeof id !== "string" || id.length < 1 || id.length > 100) {
      throw new UserStoreError("invalid_permissions", "Account permission contains an invalid account ID");
    }
    return id;
  });
  return [...new Set(ids)];
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    enabled: user.enabled,
    accountIds: [...user.accountIds],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function authenticatedUser(user) {
  return { ...publicUser(user), authVersion: user.authVersion };
}

function publicAdministrator(administrator) {
  return administrator ? {
    username: administrator.username,
    authVersion: administrator.authVersion,
    createdAt: administrator.createdAt,
    updatedAt: administrator.updatedAt,
  } : null;
}

async function hashPassword(password, salt = randomBytes(16)) {
  const hash = await scrypt(password, salt, PASSWORD_BYTES);
  return { salt: salt.toString("base64"), hash: Buffer.from(hash).toString("base64") };
}

async function passwordMatches(password, user) {
  if (typeof password !== "string") return false;
  try {
    const actual = await scrypt(password, Buffer.from(user.passwordSalt, "base64"), PASSWORD_BYTES);
    const expected = Buffer.from(user.passwordHash, "base64");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

async function deriveEncryptionKey(secret, salt) {
  return scrypt(secret, salt, 32);
}

async function encryptPayload(secret, payload) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const encryptionKey = await deriveEncryptionKey(secret, salt);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  cipher.setAAD(STORE_AAD);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return {
    version: 1,
    kdf: "scrypt",
    cipher: "aes-256-gcm",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

async function decryptPayload(secret, envelope) {
  if (!envelope || envelope.version !== 1 || envelope.kdf !== "scrypt" || envelope.cipher !== "aes-256-gcm") {
    throw new Error("Unsupported user store format");
  }
  const encryptionKey = await deriveEncryptionKey(secret, Buffer.from(envelope.salt, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(STORE_AAD);
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8"));
}

function validateStoredUser(user) {
  if (!user || typeof user !== "object" || typeof user.id !== "string" || user.id.length < 1 || user.id.length > 100
    || typeof user.passwordHash !== "string" || typeof user.passwordSalt !== "string"
    || typeof user.enabled !== "boolean" || typeof user.createdAt !== "string" || typeof user.updatedAt !== "string") {
    throw new UserStoreError("invalid_user_store", "The stored user data is invalid");
  }
  const username = normalizeUsername(user.username);
  const accountIds = normalizeAccountIds(user.accountIds);
  const hash = Buffer.from(user.passwordHash, "base64");
  const salt = Buffer.from(user.passwordSalt, "base64");
  if (hash.length !== PASSWORD_BYTES || salt.length !== 16) {
    throw new UserStoreError("invalid_user_store", "The stored user password data is invalid");
  }
  const authVersion = user.authVersion === undefined ? 1 : user.authVersion;
  if (!Number.isSafeInteger(authVersion) || authVersion < 1) {
    throw new UserStoreError("invalid_user_store", "The stored user session version is invalid");
  }
  return { ...user, username, usernameKey: usernameKey(username), accountIds, authVersion };
}

function validateStoredAdministrator(administrator) {
  if (!administrator || typeof administrator !== "object" || typeof administrator.passwordHash !== "string"
    || typeof administrator.passwordSalt !== "string" || typeof administrator.createdAt !== "string"
    || typeof administrator.updatedAt !== "string") {
    throw new UserStoreError("invalid_user_store", "The stored administrator data is invalid");
  }
  const username = normalizeUsername(administrator.username);
  const hash = Buffer.from(administrator.passwordHash, "base64");
  const salt = Buffer.from(administrator.passwordSalt, "base64");
  const authVersion = administrator.authVersion === undefined ? 1 : administrator.authVersion;
  if (hash.length !== PASSWORD_BYTES || salt.length !== 16 || !Number.isSafeInteger(authVersion) || authVersion < 1) {
    throw new UserStoreError("invalid_user_store", "The stored administrator credential data is invalid");
  }
  return { ...administrator, username, usernameKey: usernameKey(username), authVersion };
}

export class EncryptedUserStore {
  constructor({ filePath, secret, reservedUsername = "", now = () => new Date(), createId = randomUUID }) {
    this.filePath = filePath;
    this.secret = secret;
    this.reservedUsername = reservedUsername ? reservedUsername.toLowerCase() : "";
    this.now = now;
    this.createId = createId;
    this.users = [];
    this.administrator = null;
    this.initialized = false;
    this.mutationQueue = Promise.resolve();
  }

  get writable() {
    return this.secret.length >= 32;
  }

  async init() {
    if (this.initialized) return;
    if (!this.writable) {
      this.initialized = true;
      return;
    }
    try {
      const envelope = JSON.parse(await readFile(this.filePath, "utf8"));
      const payload = await decryptPayload(this.secret, envelope);
      if (!payload || payload.version !== 1 || !Array.isArray(payload.users)) throw new Error("Invalid user store payload");
      this.users = payload.users.map(validateStoredUser);
      this.administrator = payload.administrator ? validateStoredAdministrator(payload.administrator) : null;
      this.#assertUnique(this.users);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw new Error("Unable to decrypt the user store. Verify KEY_ENCRYPTION_SECRET and the data file.", { cause: error });
      }
    }
    this.initialized = true;
  }

  list() {
    this.#assertInitialized();
    return this.users.map(publicUser);
  }

  getById(id) {
    this.#assertInitialized();
    const user = this.users.find((candidate) => candidate.id === id);
    return user ? publicUser(user) : null;
  }

  getEnabledById(id) {
    this.#assertInitialized();
    const user = this.users.find((candidate) => candidate.id === id && candidate.enabled);
    return user ? authenticatedUser(user) : null;
  }

  async authenticate(username, password) {
    this.#assertInitialized();
    if (typeof username !== "string" || typeof password !== "string") return null;
    const normalized = username.trim().toLowerCase();
    const user = this.users.find((candidate) => candidate.usernameKey === normalized && candidate.enabled);
    if (!user || !(await passwordMatches(password, user))) return null;
    return authenticatedUser(user);
  }

  getAdministrator() {
    this.#assertInitialized();
    return publicAdministrator(this.administrator);
  }

  async authenticateAdministrator(username, password) {
    this.#assertInitialized();
    if (!this.administrator || typeof username !== "string" || username.trim().toLowerCase() !== this.administrator.usernameKey) return null;
    return (await passwordMatches(password, this.administrator)) ? publicAdministrator(this.administrator) : null;
  }

  async updateAdministrator(changes) {
    return this.#mutate(async () => {
      const existing = this.administrator;
      const username = Object.hasOwn(changes, "username") ? normalizeUsername(changes.username) : existing?.username;
      const password = Object.hasOwn(changes, "password") && changes.password !== "" ? normalizePassword(changes.password) : null;
      const bootstrapPassword = !existing ? normalizePassword(password || changes.bootstrapPassword) : null;
      if (!username || (!existing && !bootstrapPassword)) {
        throw new UserStoreError("invalid_profile_update", "A new username or password is required");
      }
      const normalizedKey = usernameKey(username);
      if (this.users.some((user) => user.usernameKey === normalizedKey)) {
        throw new UserStoreError("duplicate_username", "This username already exists", 409);
      }
      const timestamp = this.now().toISOString();
      if (!existing) {
        const passwordData = await hashPassword(bootstrapPassword);
        this.administrator = {
          username,
          usernameKey: normalizedKey,
          passwordHash: passwordData.hash,
          passwordSalt: passwordData.salt,
          authVersion: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      } else {
        let changed = username !== existing.username;
        existing.username = username;
        existing.usernameKey = normalizedKey;
        if (password) {
          const passwordData = await hashPassword(password);
          existing.passwordHash = passwordData.hash;
          existing.passwordSalt = passwordData.salt;
          changed = true;
        }
        if (!changed) throw new UserStoreError("invalid_profile_update", "A new username or password is required");
        existing.authVersion += 1;
        existing.updatedAt = timestamp;
      }
      await this.#persist();
      return publicAdministrator(this.administrator);
    });
  }

  async add({ username, password, enabled = true, accountIds = [] }) {
    return this.#mutate(async () => {
      const normalizedUsername = normalizeUsername(username);
      const normalizedKey = usernameKey(normalizedUsername);
      if (this.#isReservedUsername(normalizedKey) || this.users.some((user) => user.usernameKey === normalizedKey)) {
        throw new UserStoreError("duplicate_username", "This username already exists", 409);
      }
      if (typeof enabled !== "boolean") throw new UserStoreError("invalid_enabled", "enabled must be a boolean");
      const passwordData = await hashPassword(normalizePassword(password));
      const timestamp = this.now().toISOString();
      const user = {
        id: this.createId(),
        username: normalizedUsername,
        usernameKey: normalizedKey,
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt,
        enabled,
        accountIds: normalizeAccountIds(accountIds),
        authVersion: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.users.push(user);
      await this.#persist();
      return publicUser(user);
    });
  }

  async update(id, changes) {
    return this.#mutate(async () => {
      const user = this.users.find((candidate) => candidate.id === id);
      if (!user) throw new UserStoreError("user_not_found", "User not found", 404);
      let invalidateSessions = false;
      if (Object.hasOwn(changes, "username")) {
        const normalizedUsername = normalizeUsername(changes.username);
        const normalizedKey = usernameKey(normalizedUsername);
        if (this.#isReservedUsername(normalizedKey)
          || this.users.some((candidate) => candidate.id !== id && candidate.usernameKey === normalizedKey)) {
          throw new UserStoreError("duplicate_username", "This username already exists", 409);
        }
        if (normalizedKey !== user.usernameKey || normalizedUsername !== user.username) {
          user.username = normalizedUsername;
          user.usernameKey = normalizedKey;
          invalidateSessions = true;
        }
      }
      if (Object.hasOwn(changes, "password") && changes.password !== "") {
        const passwordData = await hashPassword(normalizePassword(changes.password, { optional: true }));
        user.passwordHash = passwordData.hash;
        user.passwordSalt = passwordData.salt;
        invalidateSessions = true;
      }
      if (Object.hasOwn(changes, "enabled")) {
        if (typeof changes.enabled !== "boolean") throw new UserStoreError("invalid_enabled", "enabled must be a boolean");
        if (user.enabled !== changes.enabled) {
          user.enabled = changes.enabled;
          invalidateSessions = true;
        }
      }
      if (Object.hasOwn(changes, "accountIds")) user.accountIds = normalizeAccountIds(changes.accountIds);
      if (invalidateSessions) user.authVersion += 1;
      user.updatedAt = this.now().toISOString();
      await this.#persist();
      return publicUser(user);
    });
  }

  async remove(id) {
    return this.#mutate(async () => {
      const index = this.users.findIndex((candidate) => candidate.id === id);
      if (index < 0) throw new UserStoreError("user_not_found", "User not found", 404);
      const [removed] = this.users.splice(index, 1);
      await this.#persist();
      return publicUser(removed);
    });
  }

  async revokeAccount(accountId) {
    return this.#mutate(async () => {
      let changed = false;
      for (const user of this.users) {
        const next = user.accountIds.filter((id) => id !== accountId);
        if (next.length !== user.accountIds.length) {
          user.accountIds = next;
          user.updatedAt = this.now().toISOString();
          changed = true;
        }
      }
      if (changed) await this.#persist();
      return changed;
    });
  }

  async retainAccounts(accountIds) {
    const allowed = new Set(accountIds);
    return this.#mutate(async () => {
      let changed = false;
      for (const user of this.users) {
        const next = user.accountIds.filter((id) => allowed.has(id));
        if (next.length !== user.accountIds.length) {
          user.accountIds = next;
          user.updatedAt = this.now().toISOString();
          changed = true;
        }
      }
      if (changed) await this.#persist();
      return changed;
    });
  }

  async exportBackup() {
    this.#assertWritable();
    return {
      format: "opencode-go-docker-users-encrypted-v1",
      exportedAt: new Date().toISOString(),
      store: await encryptPayload(this.secret, { version: 1, users: this.users, administrator: this.administrator }),
    };
  }

  async restoreBackup(backup) {
    return this.#mutate(async () => {
      if (backup?.format !== "opencode-go-docker-users-encrypted-v1" || !backup.store) {
        throw new UserStoreError("invalid_backup", "This backup does not contain valid user data");
      }
      let payload;
      try {
        payload = await decryptPayload(this.secret, backup.store);
      } catch {
        throw new UserStoreError("invalid_backup", "The user backup cannot be decrypted with the current KEY_ENCRYPTION_SECRET");
      }
      if (!payload || payload.version !== 1 || !Array.isArray(payload.users) || payload.users.length > 500) {
        throw new UserStoreError("invalid_backup", "The backup user data is invalid");
      }
      const restored = payload.users.map(validateStoredUser);
      const administrator = payload.administrator ? validateStoredAdministrator(payload.administrator) : null;
      this.administrator = administrator;
      this.#assertUnique(restored);
      this.users = restored;
      await this.#persist();
      return { userCount: restored.length };
    });
  }

  #assertInitialized() {
    if (!this.initialized) throw new Error("User store is not initialized");
  }

  #assertWritable() {
    this.#assertInitialized();
    if (!this.writable) throw new UserStoreError("user_store_disabled", "User management is disabled", 503);
  }

  #assertUnique(users) {
    if (new Set(users.map((user) => user.id)).size !== users.length
      || new Set(users.map((user) => user.usernameKey)).size !== users.length
      || users.some((user) => this.#isReservedUsername(user.usernameKey))) {
      throw new UserStoreError("invalid_user_store", "The user store contains duplicate or reserved users");
    }
  }

  #isReservedUsername(key) {
    return key === this.reservedUsername || key === this.administrator?.usernameKey;
  }

  #mutate(operation) {
    const run = this.mutationQueue.then(async () => {
      this.#assertWritable();
      const snapshot = structuredClone({ users: this.users, administrator: this.administrator });
      try {
        return await operation();
      } catch (error) {
        this.users = snapshot.users;
        this.administrator = snapshot.administrator;
        throw error;
      }
    });
    this.mutationQueue = run.catch(() => {});
    return run;
  }

  async #persist() {
    const envelope = await encryptPayload(this.secret, { version: 1, users: this.users, administrator: this.administrator });
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    const temporaryPath = `${this.filePath}.tmp-${process.pid}-${randomUUID()}`;
    await writeFile(temporaryPath, `${JSON.stringify(envelope, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, this.filePath);
  }
}
