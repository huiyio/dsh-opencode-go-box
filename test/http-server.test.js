import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createHttpServer } from "../src/http-server.js";
import { EncryptedUserStore } from "../src/user-store.js";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

function authHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

test("HTTP server exposes health while protecting the dashboard and API", async (context) => {
  const config = {
    apiKey: "server-only-key",
    webUsername: "viewer",
    webPassword: "secret",
    warnPercent: 60,
    dangerPercent: 85,
    refreshIntervalMs: 30000,
  };
  const accountService = {
    configured: true,
    adminEnabled: false,
    listAccounts() {
      return [{ id: "account-1", label: "Primary", maskedKey: "••••••••2345", enabled: true }];
    },
    async getUsage(accountId, options) {
      assert.equal(accountId, "account-1");
      assert.deepEqual(options, { force: true });
      return {
        account: { id: "account-1", label: "Primary", maskedKey: "••••••••2345", enabled: true },
        usage: { rolling: { percent: 9, remainingPercent: 91, resetsAt: null } },
        fetchedAt: "2026-08-15T08:00:00.000Z",
        cached: false,
      };
    },
  };
  const server = createHttpServer({ config, accountService, publicDir, logger: { error() {} } });
  context.after(() => server.close());
  const baseUrl = await listen(server);

  const health = await fetch(`${baseUrl}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok", configured: true, adminEnabled: false, uptimeSeconds: 0 });

  const anonymous = await fetch(`${baseUrl}/`, { redirect: "manual" });
  assert.equal(anonymous.status, 302);
  assert.match(anonymous.headers.get("location"), /^\/login\?next=/);

  const loginPage = await fetch(`${baseUrl}/login`);
  assert.equal(loginPage.status, 200);
  assert.match(await loginPage.text(), /login-form/);
  const loginStyles = await fetch(`${baseUrl}/styles.css`);
  assert.equal(loginStyles.status, 200);

  const invalidLogin = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "viewer", password: "wrong" }),
  });
  assert.equal(invalidLogin.status, 401);

  const login = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "viewer", password: "secret", next: "/admin" }),
  });
  assert.equal(login.status, 200);
  const sessionCookie = login.headers.get("set-cookie").split(";", 1)[0];
  const sessionPage = await fetch(`${baseUrl}/`, { headers: { Cookie: sessionCookie } });
  assert.equal(sessionPage.status, 200);
  assert.match(await sessionPage.text(), /OpenCode Go/);

  const headers = { Authorization: authHeader("viewer", "secret") };
  const page = await fetch(`${baseUrl}/`, { headers });
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal(page.headers.get("cache-control"), "no-store");
  assert.match(await page.text(), /OpenCode Go/);

  const accounts = await fetch(`${baseUrl}/api/accounts`, { headers });
  assert.equal(accounts.status, 200);
  assert.equal((await accounts.json()).accounts[0].maskedKey, "••••••••2345");

  const api = await fetch(`${baseUrl}/api/usage?account=account-1&refresh=1`, { headers });
  assert.equal(api.status, 200);
  const payload = await api.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.usage.rolling.remainingPercent, 91);
  assert.equal(JSON.stringify(payload).includes(config.apiKey), false);
});

test("HTTP server returns method and not-found errors without upstream calls", async (context) => {
  const config = {
    apiKey: "",
    webUsername: "",
    webPassword: "",
    warnPercent: 60,
    dangerPercent: 85,
    refreshIntervalMs: 30000,
  };
  const accountService = {
    configured: false,
    adminEnabled: false,
    listAccounts() { return []; },
    async getUsage() { throw new Error("must not run"); },
  };
  const server = createHttpServer({ config, accountService, publicDir, logger: { error() {} } });
  context.after(() => server.close());
  const baseUrl = await listen(server);

  const method = await fetch(`${baseUrl}/api/usage`, { method: "POST" });
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "GET");

  const missing = await fetch(`${baseUrl}/missing`);
  assert.equal(missing.status, 404);

  const disabledAdmin = await fetch(`${baseUrl}/api/admin/accounts`);
  assert.equal(disabledAdmin.status, 503);
  assert.equal((await disabledAdmin.json()).error.code, "admin_disabled");
});

test("admin account API creates, updates, and deletes without returning secrets", async (context) => {
  const calls = [];
  const account = { id: "stored-1", label: "Team", maskedKey: "••••••••cdef", enabled: true, editable: true };
  const accountService = {
    configured: true,
    adminEnabled: true,
    listAccounts() { return [account]; },
    async listTestModels() {
      calls.push(["list-models"]);
      return ["hy3", "kimi-k3"];
    },
    async testModel(id, model) {
      calls.push(["test-model", id, model]);
      return { account, model, completedAt: "2026-08-15T10:00:00.000Z" };
    },
    async getUsage(id, options) {
      calls.push(["test", id, options]);
      return {
        account,
        usage: { rolling: { percent: 10, remainingPercent: 90, resetsAt: null } },
        fetchedAt: "2026-08-15T10:00:00.000Z",
        cached: false,
      };
    },
    async addAccount(input) { calls.push(["add", input]); return account; },
    async updateAccount(id, input) { calls.push(["update", id, input]); return { ...account, ...input }; },
    async removeAccount(id) { calls.push(["remove", id]); return account; },
    async exportBackup() { calls.push(["backup"]); return { format: "test-backup", accounts: [] }; },
    async restoreBackup(backup) { calls.push(["restore", backup]); return { count: 1 }; },
  };
  const config = {
    apiKey: "",
    webUsername: "admin",
    webPassword: "long-password",
    warnPercent: 60,
    dangerPercent: 85,
    refreshIntervalMs: 30000,
  };
  const server = createHttpServer({ config, accountService, publicDir, logger: { error() {} } });
  context.after(() => server.close());
  const baseUrl = await listen(server);
  const headers = {
    Authorization: authHeader("admin", "long-password"),
    "Content-Type": "application/json",
  };

  const models = await fetch(`${baseUrl}/api/admin/models`, { headers });
  assert.equal(models.status, 200);
  assert.deepEqual((await models.json()).models, ["hy3", "kimi-k3"]);

  const created = await fetch(`${baseUrl}/api/admin/accounts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ label: "Team", group: "Operations", key: "secret-key-abcdef" }),
  });
  assert.equal(created.status, 201);
  assert.equal((await created.text()).includes("secret-key-abcdef"), false);

  const tested = await fetch(`${baseUrl}/api/admin/accounts/stored-1/test`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: "kimi-k3" }),
  });
  assert.equal(tested.status, 200);
  const testResult = await tested.json();
  assert.equal(testResult.valid, true);
  assert.equal(testResult.modelTest.model, "kimi-k3");

  const updated = await fetch(`${baseUrl}/api/admin/accounts/stored-1`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ enabled: false }),
  });
  assert.equal(updated.status, 200);

  const removed = await fetch(`${baseUrl}/api/admin/accounts/stored-1`, { method: "DELETE", headers });
  assert.equal(removed.status, 200);
  assert.deepEqual(calls, [
    ["list-models"],
    ["add", { label: "Team", group: "Operations", key: "secret-key-abcdef" }],
    ["test-model", "stored-1", "kimi-k3"],
    ["update", "stored-1", { enabled: false }],
    ["remove", "stored-1"],
  ]);
});

test("HTTP server downloads and restores an authenticated backup", async (context) => {
  const calls = [];
  const accountService = {
    configured: true,
    adminEnabled: true,
    listAccounts() { return []; },
    async exportBackup() { calls.push("backup"); return { format: "test-backup", accounts: [] }; },
    async restoreBackup(value) { calls.push(["restore", value]); return { count: 2 }; },
  };
  const config = { apiKey: "", webUsername: "admin", webPassword: "password", warnPercent: 60, dangerPercent: 85, refreshIntervalMs: 30000 };
  const server = createHttpServer({ config, accountService, publicDir, logger: { error() {} } });
  context.after(() => server.close());
  const baseUrl = await listen(server);
  const headers = { Authorization: authHeader("admin", "password"), "Content-Type": "application/json" };

  const backup = await fetch(`${baseUrl}/api/admin/backup`, { headers });
  assert.equal(backup.status, 200);
  assert.match(backup.headers.get("content-disposition"), /attachment/);
  assert.deepEqual((await backup.json()).backup, { format: "test-backup", accounts: [] });

  const restored = await fetch(`${baseUrl}/api/admin/restore`, {
    method: "POST",
    headers,
    body: JSON.stringify({ backup: { format: "test-backup", accounts: [] } }),
  });
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).count, 2);
  assert.deepEqual(calls, ["backup", ["restore", { format: "test-backup", accounts: [] }]]);
});

test("viewer sessions only expose assigned accounts and can securely update their own credentials", async (context) => {
  const viewer = { id: "user-1", username: "customer", enabled: true, accountIds: ["account-1"], authVersion: 1 };
  let viewerPassword = "viewer-password";
  const userStore = {
    writable: true,
    async authenticate(username, password) {
      return username === viewer.username && password === viewerPassword && viewer.enabled ? { ...viewer } : null;
    },
    getEnabledById(id) {
      return id === viewer.id && viewer.enabled ? { ...viewer } : null;
    },
    list() { return [{ ...viewer }]; },
    async update(id, changes) {
      assert.equal(id, viewer.id);
      if (Object.hasOwn(changes, "username") && changes.username !== viewer.username) {
        viewer.username = changes.username;
        viewer.authVersion += 1;
      }
      if (Object.hasOwn(changes, "password") && changes.password) {
        viewerPassword = changes.password;
        viewer.authVersion += 1;
      }
      return { ...viewer };
    },
    async revokeAccount() {},
  };
  const usageCalls = [];
  const accounts = [
    { id: "account-1", label: "Assigned", maskedKey: "••••••••1111", enabled: true },
    { id: "account-2", label: "Private", maskedKey: "••••••••2222", enabled: true },
  ];
  const accountService = {
    configured: true,
    adminEnabled: true,
    listAccounts() { return accounts; },
    async getUsage(id) {
      usageCalls.push(id);
      return { account: accounts.find((account) => account.id === id), usage: {}, fetchedAt: "2026-08-17T08:00:00.000Z", cached: false };
    },
  };
  const config = {
    apiKey: "",
    webUsername: "admin",
    webPassword: "admin-password",
    warnPercent: 60,
    dangerPercent: 85,
    refreshIntervalMs: 30000,
  };
  const server = createHttpServer({ config, accountService, userStore, publicDir, logger: { error() {} } });
  context.after(() => server.close());
  const baseUrl = await listen(server);

  const login = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "customer", password: "viewer-password", next: "/admin" }),
  });
  assert.equal(login.status, 200);
  assert.equal((await login.clone().json()).next, "/");
  const cookie = login.headers.get("set-cookie").split(";", 1)[0];
  const headers = { Cookie: cookie };

  const identity = await fetch(`${baseUrl}/api/me`, { headers });
  assert.deepEqual((await identity.json()).user, {
    username: "customer",
    role: "viewer",
    canEditProfile: true,
    credentialSource: "user_store",
  });
  const visible = await fetch(`${baseUrl}/api/accounts`, { headers });
  assert.deepEqual((await visible.json()).accounts.map((account) => account.id), ["account-1"]);
  assert.equal((await fetch(`${baseUrl}/api/usage?account=account-1`, { headers })).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/usage?account=account-2`, { headers })).status, 404);
  assert.deepEqual(usageCalls, ["account-1"]);
  assert.equal((await fetch(`${baseUrl}/admin`, { headers })).status, 403);
  assert.equal((await fetch(`${baseUrl}/users`, { headers })).status, 403);
  assert.equal((await fetch(`${baseUrl}/api/admin/accounts`, { headers })).status, 403);

  const wrongCurrent = await fetch(`${baseUrl}/api/me`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "wrong-password", username: "customer-new" }),
  });
  assert.equal(wrongCurrent.status, 401);

  const updatedProfile = await fetch(`${baseUrl}/api/me`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "viewer-password", username: "customer-new", password: "new-viewer-password" }),
  });
  assert.equal(updatedProfile.status, 200);
  assert.equal((await updatedProfile.clone().json()).user.username, "customer-new");
  const updatedCookie = updatedProfile.headers.get("set-cookie").split(";", 1)[0];
  assert.equal((await fetch(`${baseUrl}/api/accounts`, { headers })).status, 401);
  const updatedHeaders = { Cookie: updatedCookie };
  assert.equal((await fetch(`${baseUrl}/api/accounts`, { headers: updatedHeaders })).status, 200);

  viewer.accountIds = [];
  const empty = await fetch(`${baseUrl}/api/accounts`, { headers: updatedHeaders });
  assert.deepEqual((await empty.json()).accounts, []);
  assert.equal((await fetch(`${baseUrl}/api/usage`, { headers: updatedHeaders })).status, 404);
  viewer.enabled = false;
  assert.equal((await fetch(`${baseUrl}/api/accounts`, { headers: updatedHeaders })).status, 401);
});

test("administrator can move credentials into the encrypted store and invalidate previous sessions", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "opencode-go-admin-profile-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const config = {
    apiKey: "",
    webUsername: "bootstrap-admin",
    webPassword: "environment-password",
    webAdminRecovery: false,
    keyEncryptionSecret: "administrator-test-secret-with-at-least-32-characters",
    warnPercent: 60,
    dangerPercent: 85,
    refreshIntervalMs: 30000,
  };
  const userStore = new EncryptedUserStore({
    filePath: join(directory, "users.enc.json"),
    secret: config.keyEncryptionSecret,
    reservedUsername: config.webUsername,
  });
  await userStore.init();
  const accountService = {
    configured: true,
    adminEnabled: true,
    listAccounts() { return []; },
  };
  const server = createHttpServer({ config, accountService, userStore, publicDir, logger: { error() {} } });
  context.after(() => server.close());
  const baseUrl = await listen(server);

  const login = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "bootstrap-admin", password: "environment-password" }),
  });
  const bootstrapCookie = login.headers.get("set-cookie").split(";", 1)[0];
  const updated = await fetch(`${baseUrl}/api/me`, {
    method: "PATCH",
    headers: { Cookie: bootstrapCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ username: "system-admin", currentPassword: "environment-password", password: "system-password" }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.clone().json()).user.credentialSource, "system");
  const systemCookie = updated.headers.get("set-cookie").split(";", 1)[0];
  assert.equal((await fetch(`${baseUrl}/api/me`, { headers: { Cookie: bootstrapCookie } })).status, 401);
  const environmentLogin = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "bootstrap-admin", password: "environment-password" }),
  });
  assert.equal(environmentLogin.status, 401);
  assert.equal((await fetch(`${baseUrl}/api/me`, { headers: { Cookie: systemCookie } })).status, 200);

  const rotation = await fetch(`${baseUrl}/api/me`, {
    method: "PATCH",
    headers: { Cookie: systemCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ username: "system-admin", currentPassword: "system-password", password: "rotated-system-password" }),
  });
  assert.equal(rotation.status, 200, await rotation.text());
  assert.equal((await fetch(`${baseUrl}/api/me`, { headers: { Cookie: systemCookie } })).status, 401);
  const rotatedLogin = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "system-admin", password: "rotated-system-password" }),
  });
  assert.equal(rotatedLogin.status, 200);
});
