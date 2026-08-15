import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { EncryptedKeyStore, KeyStoreError } from "../src/key-store.js";

const SECRET = "a-strong-test-secret-with-at-least-32-characters";

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
