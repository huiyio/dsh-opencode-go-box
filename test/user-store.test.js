import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { EncryptedUserStore, UserStoreError } from "../src/user-store.js";

const SECRET = "a-user-store-test-secret-with-at-least-32-characters";

async function temporaryStore(context) {
  const directory = await mkdtemp(join(tmpdir(), "opencode-go-users-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "users.enc.json");
  let id = 0;
  const store = new EncryptedUserStore({
    filePath,
    secret: SECRET,
    reservedUsername: "admin",
    now: () => new Date("2026-08-17T08:00:00.000Z"),
    createId: () => `user-${++id}`,
  });
  await store.init();
  return { store, filePath };
}

test("EncryptedUserStore hashes passwords and returns only public user fields", async (context) => {
  const { store, filePath } = await temporaryStore(context);
  const user = await store.add({
    username: "customer-a",
    password: "strong-password",
    enabled: true,
    accountIds: ["account-1"],
  });
  assert.deepEqual(user.accountIds, ["account-1"]);
  assert.equal(Object.hasOwn(user, "passwordHash"), false);
  assert.equal((await store.authenticate("customer-a", "strong-password")).id, user.id);
  assert.equal(await store.authenticate("customer-a", "wrong-password"), null);

  const disk = await readFile(filePath, "utf8");
  assert.equal(disk.includes("strong-password"), false);
  assert.equal(disk.includes("customer-a"), false);
});

test("EncryptedUserStore updates permissions and invalidates disabled or deleted users", async (context) => {
  const { store } = await temporaryStore(context);
  const user = await store.add({
    username: "customer-b",
    password: "strong-password",
    accountIds: ["account-1", "account-2"],
  });
  await store.revokeAccount("account-2");
  assert.deepEqual(store.getById(user.id).accountIds, ["account-1"]);
  await store.update(user.id, { enabled: false, accountIds: [] });
  assert.equal(await store.authenticate("customer-b", "strong-password"), null);
  assert.equal(store.getEnabledById(user.id), null);
  await store.remove(user.id);
  assert.equal(store.getById(user.id), null);
});

test("EncryptedUserStore rejects reserved and duplicate usernames and restores encrypted backups", async (context) => {
  const { store } = await temporaryStore(context);
  await assert.rejects(
    store.add({ username: "ADMIN", password: "strong-password", accountIds: [] }),
    (error) => error instanceof UserStoreError && error.code === "duplicate_username",
  );
  await store.add({ username: "customer-c", password: "strong-password", accountIds: ["account-1"] });
  await assert.rejects(
    store.add({ username: "Customer-C", password: "another-password", accountIds: [] }),
    (error) => error.code === "duplicate_username",
  );
  const backup = await store.exportBackup();
  assert.equal(JSON.stringify(backup).includes("customer-c"), false);
  await store.remove("user-1");
  assert.equal(store.list().length, 0);
  assert.deepEqual(await store.restoreBackup(backup), { userCount: 1 });
  assert.equal(store.list()[0].username, "customer-c");
});
