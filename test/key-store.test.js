import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, scrypt as scryptCallback } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { EncryptedKeyStore, KeyStoreError } from "../src/key-store.js";

const SECRET = "a-strong-test-secret-with-at-least-32-characters";
const scrypt = promisify(scryptCallback);
const STORE_AAD = Buffer.from("opencode-go-balance:key-store:v1");

async function rewriteEncryptedPayload(envelope, mutate) {
  const salt = Buffer.from(envelope.salt, "base64");
  const iv = Buffer.from(envelope.iv, "base64");
  const encryptionKey = await scrypt(SECRET, salt, 32);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAAD(STORE_AAD);
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const payload = JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8"));
  mutate(payload);

  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  cipher.setAAD(STORE_AAD);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return {
    ...envelope,
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

async function temporaryStore(context, secret = SECRET) {
  const directory = await mkdtemp(join(tmpdir(), "opencode-go-keys-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "keys.enc.json");
  const store = new EncryptedKeyStore({
    filePath,
    secret,
    now: () => new Date("2026-08-15T10:00:00.000Z"),
    createId: () => "account-1",
  });
  await store.init();
  return { store, filePath };
}

test("EncryptedKeyStore persists encrypted keys and returns masked metadata", async (context) => {
  const { store, filePath } = await temporaryStore(context);
  const created = await store.add({ label: " Primary ", key: "sk-opencode-secret-1234" });
  assert.equal(created.label, "Primary");
  assert.equal(created.maskedKey, "••••••••1234");
  assert.equal(Object.hasOwn(created, "key"), false);

  const disk = await readFile(filePath, "utf8");
  assert.equal(disk.includes("sk-opencode-secret-1234"), false);
  assert.match(disk, /aes-256-gcm/);

  const reloaded = new EncryptedKeyStore({ filePath, secret: SECRET });
  await reloaded.init();
  assert.equal(reloaded.getSecret("account-1").key, "sk-opencode-secret-1234");
  assert.equal(reloaded.list()[0].maskedKey, "••••••••1234");
});

test("EncryptedKeyStore supports update, disable, duplicate detection, and removal", async (context) => {
  const { store } = await temporaryStore(context);
  await store.add({ label: "Primary", key: "sk-opencode-secret-1234" });
  await assert.rejects(
    store.add({ label: "Duplicate", key: "sk-opencode-secret-1234" }),
    (error) => error instanceof KeyStoreError && error.code === "duplicate_key",
  );
  const updated = await store.update("account-1", { label: "Paused", enabled: false, key: "sk-opencode-new-5678" });
  assert.equal(updated.enabled, false);
  assert.equal(updated.maskedKey, "••••••••5678");
  assert.equal(store.list({ includeDisabled: false }).length, 0);
  await store.remove("account-1");
  assert.equal(store.list().length, 0);
});

test("EncryptedKeyStore stores, edits, and clears account groups", async (context) => {
  const { store } = await temporaryStore(context);
  const created = await store.add({
    label: "Grouped",
    key: "sk-opencode-grouped-1234",
    group: "  Team Alpha  ",
  });
  assert.equal(created.group, "Team Alpha");
  assert.equal(store.list()[0].group, "Team Alpha");

  const renamed = await store.update(created.id, { group: "Team Beta" });
  assert.equal(renamed.group, "Team Beta");
  assert.equal(store.getSecret(created.id).group, "Team Beta");

  const cleared = await store.update(created.id, { group: "   " });
  assert.equal(cleared.group, null);
  assert.equal(store.list()[0].group, null);
});

test("EncryptedKeyStore validates group names and keeps empty groups nullable", async (context) => {
  const { store } = await temporaryStore(context);
  const created = await store.add({ label: "Ungrouped", key: "sk-opencode-ungrouped-1234", group: null });
  assert.equal(created.group, null);

  await assert.rejects(
    store.add({ label: "Too long", key: "sk-opencode-group-too-long-1234", group: "x".repeat(61) }),
    (error) => error instanceof KeyStoreError && error.code === "invalid_group",
  );
  await assert.rejects(
    store.update(created.id, { group: "line\nbreak" }),
    (error) => error instanceof KeyStoreError && error.code === "invalid_group",
  );
  await assert.rejects(
    store.update(created.id, { group: 42 }),
    (error) => error instanceof KeyStoreError && error.code === "invalid_group",
  );
});

test("EncryptedKeyStore manages lifecycle dates and deletes expired accounts", async (context) => {
  const { store } = await temporaryStore(context);
  const created = await store.add({
    label: "Monthly",
    key: "sk-opencode-monthly-1234",
    startsAt: "2027-01-31",
    autoDelete: true,
  });
  assert.equal(created.startsAt, "2027-01-31");
  assert.equal(created.expiresAt, "2027-02-28");
  assert.equal(created.autoDelete, true);
  assert.equal(created.lifecycleStatus, "pending");

  assert.deepEqual(await store.purgeExpired("2027-02-27"), []);
  const removed = await store.purgeExpired("2027-02-28");
  assert.equal(removed.length, 1);
  assert.equal(store.list().length, 0);
});

test("EncryptedKeyStore keeps manually expired accounts and validates date ranges", async (context) => {
  const { store } = await temporaryStore(context);
  await assert.rejects(
    store.add({
      label: "Invalid",
      key: "sk-opencode-invalid-1234",
      startsAt: "2026-08-15",
      expiresAt: "2026-08-14",
    }),
    (error) => error instanceof KeyStoreError && error.code === "invalid_lifecycle",
  );
  const created = await store.add({
    label: "Retained",
    key: "sk-opencode-retained-1234",
    startsAt: "2026-08-01",
    expiresAt: "2026-08-10",
    autoDelete: false,
  });
  assert.equal(created.lifecycleStatus, "expired");
  assert.deepEqual(await store.purgeExpired("2026-08-16"), []);
  assert.equal(store.list({ includeDisabled: true }).length, 1);
  assert.equal(store.list({ includeDisabled: false }).length, 0);
});

test("EncryptedKeyStore exports and restores an encrypted backup", async (context) => {
  const { store } = await temporaryStore(context);
  await store.add({ label: "Primary", group: "Backups", key: "sk-opencode-backup-1234" });
  const backup = await store.exportBackup();
  assert.equal(backup.format, "opencode-go-docker-encrypted-v1");
  assert.equal(JSON.stringify(backup).includes("sk-opencode-backup-1234"), false);

  await store.remove("account-1");
  assert.equal(store.list().length, 0);
  const restored = await store.restoreBackup(backup);
  assert.deepEqual(restored, { count: 1 });
  assert.equal(store.getSecret("account-1").key, "sk-opencode-backup-1234");
  assert.equal(store.getSecret("account-1").group, "Backups");

  const legacyStore = await rewriteEncryptedPayload(backup.store, (payload) => {
    delete payload.accounts[0].group;
  });
  await store.remove("account-1");
  await store.restoreBackup({ ...backup, store: legacyStore });
  assert.equal(store.getSecret("account-1").group, null);

  await assert.rejects(
    store.restoreBackup({ ...backup, store: { ...backup.store, ciphertext: "tampered" } }),
    (error) => error.code === "invalid_backup",
  );
});

test("EncryptedKeyStore fails closed for missing and incorrect encryption secrets", async (context) => {
  const { store, filePath } = await temporaryStore(context);
  await store.add({ label: "Primary", key: "sk-opencode-secret-1234" });

  const wrongSecret = new EncryptedKeyStore({ filePath, secret: "another-strong-secret-with-32-characters" });
  await assert.rejects(wrongSecret.init(), /Unable to decrypt/);

  const disabled = new EncryptedKeyStore({ filePath: `${filePath}.disabled`, secret: "" });
  await disabled.init();
  await assert.rejects(disabled.add({ label: "Nope", key: "sk-opencode-secret-0000" }), (error) => {
    assert.equal(error.code, "key_store_disabled");
    return true;
  });
});
