import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const STORE_AAD = Buffer.from("opencode-go-balance:key-store:v1");

export class KeyStoreError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "KeyStoreError";
    this.code = code;
    this.status = status;
  }
}

function normalizeLabel(value) {
  const label = typeof value === "string" ? value.trim() : "";
  if (label.length < 1 || label.length > 80) {
    throw new KeyStoreError("invalid_label", "Account label must contain 1 to 80 characters");
  }
  return label;
}

function normalizeKey(value) {
  const key = typeof value === "string" ? value.trim() : "";
  if (key.length < 8 || key.length > 512 || /[\r\n]/.test(key)) {
    throw new KeyStoreError("invalid_key", "API key must contain 8 to 512 characters without line breaks");
  }
  return key;
}

function publicAccount(account) {
  return {
    id: account.id,
    label: account.label,
    maskedKey: `••••••••${account.key.slice(-4)}`,
    enabled: account.enabled,
    editable: true,
    source: "stored",
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

async function deriveKey(secret, salt) {
  return scrypt(secret, salt, 32);
}

async function encryptPayload(secret, payload) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const encryptionKey = await deriveKey(secret, salt);
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
    throw new Error("Unsupported key store format");
  }
  const salt = Buffer.from(envelope.salt, "base64");
  const iv = Buffer.from(envelope.iv, "base64");
  const tag = Buffer.from(envelope.tag, "base64");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");
  const encryptionKey = await deriveKey(secret, salt);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAAD(STORE_AAD);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}

export class EncryptedKeyStore {
  constructor({ filePath, secret, now = () => new Date(), createId = randomUUID }) {
    this.filePath = filePath;
    this.secret = secret;
    this.now = now;
    this.createId = createId;
    this.accounts = [];
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
      if (!payload || !Array.isArray(payload.accounts)) throw new Error("Invalid key store payload");
      this.accounts = payload.accounts;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw new Error("Unable to decrypt the key store. Verify KEY_ENCRYPTION_SECRET and the data file.", { cause: error });
      }
    }
    this.initialized = true;
  }

  list({ includeDisabled = true } = {}) {
    this.#assertInitialized();
    return this.accounts
      .filter((account) => includeDisabled || account.enabled)
      .map(publicAccount);
  }

  getSecret(id) {
    this.#assertInitialized();
    const account = this.accounts.find((candidate) => candidate.id === id);
    if (!account) throw new KeyStoreError("account_not_found", "Account not found", 404);
    return { ...publicAccount(account), key: account.key };
  }

  async add({ label, key }) {
    return this.#mutate(async () => {
      const normalizedKey = normalizeKey(key);
      if (this.accounts.some((account) => account.key === normalizedKey)) {
        throw new KeyStoreError("duplicate_key", "This API key already exists", 409);
      }
      const timestamp = this.now().toISOString();
      const account = {
        id: this.createId(),
        label: normalizeLabel(label),
        key: normalizedKey,
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.accounts.push(account);
      await this.#persist();
      return publicAccount(account);
    });
  }

  async update(id, changes) {
    return this.#mutate(async () => {
      const account = this.accounts.find((candidate) => candidate.id === id);
      if (!account) throw new KeyStoreError("account_not_found", "Account not found", 404);
      if (Object.hasOwn(changes, "label")) account.label = normalizeLabel(changes.label);
      if (Object.hasOwn(changes, "key") && changes.key !== "") {
        const normalizedKey = normalizeKey(changes.key);
        if (this.accounts.some((candidate) => candidate.id !== id && candidate.key === normalizedKey)) {
          throw new KeyStoreError("duplicate_key", "This API key already exists", 409);
        }
        account.key = normalizedKey;
      }
      if (Object.hasOwn(changes, "enabled")) {
        if (typeof changes.enabled !== "boolean") throw new KeyStoreError("invalid_enabled", "enabled must be a boolean");
        account.enabled = changes.enabled;
      }
      account.updatedAt = this.now().toISOString();
      await this.#persist();
      return publicAccount(account);
    });
  }

  async remove(id) {
    return this.#mutate(async () => {
      const index = this.accounts.findIndex((candidate) => candidate.id === id);
      if (index < 0) throw new KeyStoreError("account_not_found", "Account not found", 404);
      const [removed] = this.accounts.splice(index, 1);
      await this.#persist();
      return publicAccount(removed);
    });
  }

  async exportBackup() {
    this.#assertWritable();
    return {
      format: "opencode-go-docker-encrypted-v1",
      exportedAt: new Date().toISOString(),
      store: await encryptPayload(this.secret, { version: 1, accounts: this.accounts }),
    };
  }

  async restoreBackup(backup) {
    return this.#mutate(async () => {
      if (backup?.format !== "opencode-go-docker-encrypted-v1" || !backup.store) {
        throw new KeyStoreError("invalid_backup", "This backup is not a Docker account backup");
      }
      let payload;
      try {
        payload = await decryptPayload(this.secret, backup.store);
      } catch {
        throw new KeyStoreError("invalid_backup", "The backup cannot be decrypted with the current KEY_ENCRYPTION_SECRET");
      }
      if (!payload || payload.version !== 1 || !Array.isArray(payload.accounts) || payload.accounts.length > 500) {
        throw new KeyStoreError("invalid_backup", "The backup account data is invalid");
      }
      const restored = payload.accounts.map((account) => {
        if (!account || typeof account !== "object" || typeof account.id !== "string" || account.id.length < 1 || account.id.length > 100) {
          throw new KeyStoreError("invalid_backup", "The backup account data is invalid");
        }
        const key = normalizeKey(account.key);
        const label = normalizeLabel(account.label);
        if (typeof account.enabled !== "boolean" || typeof account.createdAt !== "string" || typeof account.updatedAt !== "string") {
          throw new KeyStoreError("invalid_backup", "The backup account data is invalid");
        }
        return { id: account.id, label, key, enabled: account.enabled, createdAt: account.createdAt, updatedAt: account.updatedAt };
      });
      if (new Set(restored.map((account) => account.id)).size !== restored.length
        || new Set(restored.map((account) => account.key)).size !== restored.length) {
        throw new KeyStoreError("invalid_backup", "The backup contains duplicate accounts or keys");
      }
      this.accounts = restored;
      await this.#persist();
      return { count: restored.length };
    });
  }

  #assertInitialized() {
    if (!this.initialized) throw new Error("Key store is not initialized");
  }

  #assertWritable() {
    this.#assertInitialized();
    if (!this.writable) {
      throw new KeyStoreError("key_store_disabled", "KEY_ENCRYPTION_SECRET is not configured", 503);
    }
  }

  #mutate(operation) {
    const run = this.mutationQueue.then(async () => {
      this.#assertWritable();
      const snapshot = structuredClone(this.accounts);
      try {
        return await operation();
      } catch (error) {
        this.accounts = snapshot;
        throw error;
      }
    });
    this.mutationQueue = run.catch(() => {});
    return run;
  }

  async #persist() {
    const envelope = await encryptPayload(this.secret, { version: 1, accounts: this.accounts });
    const directory = dirname(this.filePath);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${this.filePath}.tmp-${process.pid}-${randomUUID()}`;
    await writeFile(temporaryPath, `${JSON.stringify(envelope, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, this.filePath);
  }
}
