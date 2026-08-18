import assert from "node:assert/strict";
import test from "node:test";
import { AccountStore } from "../worker/store.js";
import { WorkerError } from "../worker/errors.js";

const MASTER_SECRET = "worker-store-test-secret-with-more-than-32-characters";

function clone(value) {
  return value === undefined ? value : structuredClone(value);
}

class FakeD1Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async first() {
    return clone(this.db.query(this.sql, this.params).at(0) || null);
  }

  async all() {
    return { results: clone(this.db.query(this.sql, this.params)) };
  }

  async run() {
    this.db.execute(this.sql, this.params);
    return { success: true };
  }
}

/**
 * Small D1-shaped fixture. It intentionally handles only SQL emitted by
 * AccountStore, so the tests still verify the statement shapes and bindings.
 */
class FakeD1 {
  constructor() {
    this.accounts = [];
    this.usageCache = [];
  }

  prepare(sql) {
    return new FakeD1Statement(this, sql);
  }

  async batch(statements) {
    for (const statement of statements) await statement.run();
    return statements.map(() => ({ success: true }));
  }

  query(sql, params) {
    const normalized = sql.replace(/\s+/g, " ").trim();
    const upper = normalized.toUpperCase();
    if (upper.startsWith("SELECT COUNT(*) AS COUNT FROM ACCOUNTS")) {
      const [startsBefore, expiresAfter] = params;
      return [{
        count: this.accounts.filter((account) => account.enabled === 1
          && (account.starts_at === null || account.starts_at <= startsBefore)
          && (account.expires_at === null || account.expires_at > expiresAfter)).length,
      }];
    }
    if (upper.startsWith("SELECT ID FROM ACCOUNTS WHERE KEY_FINGERPRINT = ?")) {
      const [fingerprint, excludedId] = params;
      return this.accounts.filter((account) => account.key_fingerprint === fingerprint
        && (!upper.includes("AND ID <> ?") || account.id !== excludedId))
        .map((account) => ({ id: account.id }));
    }
    if (upper.startsWith("SELECT * FROM ACCOUNTS WHERE ID = ?")) {
      return this.accounts.filter((account) => account.id === params[0]);
    }
    if (upper.startsWith("SELECT * FROM ACCOUNTS WHERE ENABLED = 1")) {
      const [startsBefore, expiresAfter] = params;
      return this.accounts
        .filter((account) => account.enabled === 1
          && (account.starts_at === null || account.starts_at <= startsBefore)
          && (account.expires_at === null || account.expires_at > expiresAfter))
        .sort((left, right) => left.created_at.localeCompare(right.created_at));
    }
    if (upper.startsWith("SELECT * FROM ACCOUNTS ORDER BY CREATED_AT ASC")) {
      return [...this.accounts].sort((left, right) => left.created_at.localeCompare(right.created_at));
    }
    if (upper.startsWith("SELECT ID FROM ACCOUNTS WHERE AUTO_DELETE = 1")) {
      const [today] = params;
      return this.accounts
        .filter((account) => account.auto_delete === 1 && account.expires_at !== null && account.expires_at <= today)
        .map((account) => ({ id: account.id }));
    }
    if (upper.startsWith("SELECT ID, LABEL, GROUP_NAME,")) {
      return [...this.accounts]
        .sort((left, right) => left.created_at.localeCompare(right.created_at))
        .map((account) => ({
          id: account.id,
          label: account.label,
          group_name: account.group_name,
          key_ciphertext: account.key_ciphertext,
          key_iv: account.key_iv,
          key_salt: account.key_salt,
          key_fingerprint: account.key_fingerprint,
          key_suffix: account.key_suffix,
          enabled: account.enabled,
          starts_at: account.starts_at,
          expires_at: account.expires_at,
          auto_delete: account.auto_delete,
          created_at: account.created_at,
          updated_at: account.updated_at,
        }));
    }
    if (upper.startsWith("SELECT PAYLOAD, FETCHED_AT, EXPIRES_AT FROM USAGE_CACHE")) {
      const [accountId, expiresAfter] = params;
      return this.usageCache.filter((entry) => entry.account_id === accountId && entry.expires_at > expiresAfter);
    }
    throw new Error(`FakeD1 does not implement query: ${normalized}`);
  }

  execute(sql, params) {
    const normalized = sql.replace(/\s+/g, " ").trim();
    const upper = normalized.toUpperCase();
    if (upper.startsWith("INSERT INTO ACCOUNTS (")) {
      const enabledIsLiteral = upper.includes("VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1,");
      const account = {
        id: params[0],
        label: params[1],
        group_name: params[2],
        key_ciphertext: params[3],
        key_iv: params[4],
        key_salt: params[5],
        key_fingerprint: params[6],
        key_suffix: params[7],
        enabled: enabledIsLiteral ? 1 : Number(params[8]),
        starts_at: enabledIsLiteral ? params[8] : params[9],
        expires_at: enabledIsLiteral ? params[9] : params[10],
        auto_delete: enabledIsLiteral ? Number(params[10]) : Number(params[11]),
        created_at: enabledIsLiteral ? params[11] : params[12],
        updated_at: enabledIsLiteral ? params[12] : params[13],
      };
      if (this.accounts.some((candidate) => candidate.id === account.id)) {
        throw new Error("UNIQUE constraint failed: accounts.id");
      }
      if (this.accounts.some((candidate) => candidate.key_fingerprint === account.key_fingerprint)) {
        throw new Error("UNIQUE constraint failed: accounts.key_fingerprint");
      }
      this.accounts.push(account);
      return;
    }
    if (upper.startsWith("UPDATE ACCOUNTS SET")) {
      const [label, groupName, ciphertext, iv, salt, fingerprint, suffix, enabled,
        startsAt, expiresAt, autoDelete, updatedAt, id] = params;
      const account = this.accounts.find((candidate) => candidate.id === id);
      if (!account) throw new Error("account not found");
      Object.assign(account, {
        label,
        group_name: groupName,
        key_ciphertext: ciphertext,
        key_iv: iv,
        key_salt: salt,
        key_fingerprint: fingerprint,
        key_suffix: suffix,
        enabled: Number(enabled),
        starts_at: startsAt,
        expires_at: expiresAt,
        auto_delete: Number(autoDelete),
        updated_at: updatedAt,
      });
      return;
    }
    if (upper === "DELETE FROM ACCOUNTS") {
      this.accounts = [];
      return;
    }
    if (upper.startsWith("DELETE FROM ACCOUNTS WHERE ID = ?")) {
      this.accounts = this.accounts.filter((account) => account.id !== params[0]);
      return;
    }
    if (upper === "DELETE FROM USAGE_CACHE") {
      this.usageCache = [];
      return;
    }
    if (upper.startsWith("DELETE FROM USAGE_CACHE WHERE ACCOUNT_ID = ?")) {
      this.usageCache = this.usageCache.filter((entry) => entry.account_id !== params[0]);
      return;
    }
    if (upper.startsWith("DELETE FROM USER_ACCOUNTS WHERE ACCOUNT_ID = ?")) return;
    if (upper.startsWith("INSERT INTO USAGE_CACHE (")) {
      const [accountId, payload, fetchedAt, expiresAt] = params;
      this.usageCache = this.usageCache.filter((entry) => entry.account_id !== accountId);
      this.usageCache.push({ account_id: accountId, payload, fetched_at: fetchedAt, expires_at: expiresAt });
      return;
    }
    throw new Error(`FakeD1 does not implement statement: ${normalized}`);
  }
}

function createWorkerStore() {
  const DB = new FakeD1();
  const env = { DB, KEY_ENCRYPTION_SECRET: MASTER_SECRET };
  return { DB, store: new AccountStore(env) };
}

test("Worker AccountStore stores, updates, and clears groups", async () => {
  const { store } = createWorkerStore();
  const created = await store.add({
    label: "Primary",
    key: "sk-worker-group-1234",
    group: "  Team Alpha  ",
  });
  assert.equal(created.group, "Team Alpha");
  assert.equal((await store.list({ includeDisabled: true }))[0].group, "Team Alpha");

  const updated = await store.update(created.id, { group: "Team Beta" });
  assert.equal(updated.group, "Team Beta");
  assert.equal((await store.getSecret(created.id)).group, "Team Beta");

  const cleared = await store.update(created.id, { group: "   " });
  assert.equal(cleared.group, null);
  assert.equal((await store.list({ includeDisabled: true }))[0].group, null);

  await assert.rejects(
    store.update(created.id, { group: "x".repeat(61) }),
    (error) => error instanceof WorkerError && error.code === "invalid_group",
  );
  await assert.rejects(
    store.add({ label: "Invalid", key: "sk-worker-group-invalid-1234", group: "line\nbreak" }),
    (error) => error instanceof WorkerError && error.code === "invalid_group",
  );
  await assert.rejects(
    store.update(created.id, { group: false }),
    (error) => error instanceof WorkerError && error.code === "invalid_group",
  );
});

test("Worker AccountStore preserves groups in backups and accepts pre-group backups", async () => {
  const { store } = createWorkerStore();
  const created = await store.add({ label: "Backup", key: "sk-worker-backup-1234", group: "Archive" });
  const backup = await store.exportBackup();
  assert.equal(backup.accounts.length, 1);
  assert.equal(backup.accounts[0].group_name, "Archive");

  await store.remove(created.id);
  assert.deepEqual(await store.list({ includeDisabled: true }), []);
  assert.deepEqual(await store.restoreBackup(backup), { count: 1 });
  assert.equal((await store.getSecret(created.id)).group, "Archive");

  const legacyBackup = {
    ...backup,
    accounts: backup.accounts.map(({ group_name: _groupName, ...account }) => account),
  };
  assert.deepEqual(await store.restoreBackup(legacyBackup), { count: 1 });
  assert.equal((await store.getSecret(created.id)).group, null);
});
