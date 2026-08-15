import assert from "node:assert/strict";
import { once } from "node:events";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createHttpServer } from "../src/http-server.js";

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

  const anonymous = await fetch(`${baseUrl}/`);
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers.get("www-authenticate"), /OpenCode Go Balance/);

  const headers = { Authorization: authHeader("viewer", "secret") };
  const page = await fetch(`${baseUrl}/`, { headers });
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal(page.headers.get("cache-control"), "no-cache");
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
    body: JSON.stringify({ label: "Team", key: "secret-key-abcdef" }),
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
    ["add", { label: "Team", key: "secret-key-abcdef" }],
    ["test-model", "stored-1", "kimi-k3"],
    ["update", "stored-1", { enabled: false }],
    ["remove", "stored-1"],
  ]);
});
