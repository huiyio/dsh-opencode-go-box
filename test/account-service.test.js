import assert from "node:assert/strict";
import test from "node:test";
import { AccountService } from "../src/account-service.js";

test("AccountService lists environment and stored accounts without exposing keys", () => {
  const keyStore = {
    writable: true,
    list: () => [{ id: "stored", label: "Stored", maskedKey: "••••••••2222", enabled: true, source: "stored" }],
  };
  const service = new AccountService({
    config: { apiKey: "environment-secret-1111", webUsername: "admin", webPassword: "secret" },
    keyStore,
  });
  const accounts = service.listAccounts();
  assert.equal(accounts.length, 2);
  assert.equal(accounts[0].id, "environment");
  assert.equal(accounts[0].editable, false);
  assert.equal(JSON.stringify(accounts).includes("environment-secret-1111"), false);
  assert.equal(service.adminEnabled, true);
});

test("AccountService selects an account and isolates per-key usage services", async () => {
  const createdWith = [];
  const keyStore = {
    writable: true,
    list: () => [{ id: "stored", label: "Stored", maskedKey: "••••••••2222", enabled: true, source: "stored", updatedAt: "now" }],
    getSecret: () => ({ id: "stored", label: "Stored", maskedKey: "••••••••2222", enabled: true, source: "stored", key: "stored-secret-2222" }),
  };
  const service = new AccountService({
    config: {
      apiKey: "",
      usageUrl: "https://example.test/usage",
      timeoutMs: 1000,
      cacheTtlMs: 30000,
      webUsername: "admin",
      webPassword: "secret",
    },
    keyStore,
    createUsageService: (options) => {
      createdWith.push(options.apiKey);
      return { async getUsage({ force }) { return { usage: {}, fetchedAt: "now", cached: !force }; } };
    },
  });

  const first = await service.getUsage("stored", { force: true });
  const second = await service.getUsage("stored");
  assert.equal(first.account.label, "Stored");
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.deepEqual(createdWith, ["stored-secret-2222"]);
});
