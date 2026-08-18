import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorized } from "../worker/auth.js";
import { decryptApiKey, encryptApiKey, fingerprintApiKey } from "../worker/crypto.js";
import { WorkerError } from "../worker/errors.js";
import { cacheControlForAssetPath } from "../worker/index.js";
import { sessionClaims, sessionCookie } from "../worker/session.js";
import { hashUserPassword, verifyUserPassword } from "../worker/user-store.js";
import { listModels, normalizeUsage, testModel } from "../worker/upstream.js";

const MASTER_SECRET = "worker-test-secret-with-more-than-32-characters";

test("Worker prevents stale document shells while retaining versioned asset caching", () => {
  for (const pathname of ["/", "/admin", "/users", "/profile", "/login", "/admin.html"]) {
    assert.equal(cacheControlForAssetPath(pathname), "no-store");
  }
  assert.equal(cacheControlForAssetPath("/admin.js"), "public, max-age=3600");
  assert.equal(cacheControlForAssetPath("/styles.css"), "public, max-age=3600");
});

test("Worker encryption round-trips keys without storing plaintext", async () => {
  const key = "sk-opencode-worker-secret-1234";
  const encrypted = await encryptApiKey(MASTER_SECRET, "account-1", key);
  assert.equal(JSON.stringify(encrypted).includes(key), false);
  assert.equal(await decryptApiKey(MASTER_SECRET, "account-1", encrypted), key);
  assert.equal(
    await fingerprintApiKey(MASTER_SECRET, key),
    await fingerprintApiKey(MASTER_SECRET, key),
  );
  await assert.rejects(
    decryptApiKey(MASTER_SECRET, "account-2", encrypted),
    (error) => error instanceof WorkerError && error.code === "key_decryption_failed",
  );
});

test("Worker Basic authentication validates both credentials", async () => {
  const env = { WEB_USERNAME: "管理者", WEB_PASSWORD: "strong-password" };
  const valid = new Request("https://example.test/", {
    headers: { Authorization: `Basic ${Buffer.from("管理者:strong-password").toString("base64")}` },
  });
  const invalid = new Request("https://example.test/", {
    headers: { Authorization: `Basic ${Buffer.from("管理者:wrong-password").toString("base64")}` },
  });
  assert.equal(await isAuthorized(valid, env), true);
  assert.equal(await isAuthorized(invalid, env), false);
});

test("Worker session cookie authorizes the browser without Basic Auth", async () => {
  const env = { WEB_USERNAME: "admin", WEB_PASSWORD: "strong-password" };
  const setCookie = await sessionCookie(env, new Request("https://example.test/api/login"), Date.parse("2026-08-15T12:00:00.000Z"));
  const cookie = setCookie.split(";", 1)[0];
  const request = new Request("https://example.test/admin", { headers: { Cookie: cookie } });
  const { isAuthorized } = await import("../worker/auth.js");
  assert.equal(await isAuthorized(request, env), true);
  const tampered = new Request("https://example.test/admin", { headers: { Cookie: `${cookie}x` } });
  assert.equal(await isAuthorized(tampered, env), false);
});

test("Worker viewer sessions carry the credential version used for invalidation", async () => {
  const env = { WEB_USERNAME: "admin", WEB_PASSWORD: "strong-password" };
  const principal = {
    subject: "user-1",
    username: "customer",
    role: "viewer",
    accountIds: [],
    authVersion: 4,
  };
  const request = new Request("https://example.test/api/login");
  const cookie = (await sessionCookie(env, request, principal)).split(";", 1)[0];
  const claims = await sessionClaims(new Request("https://example.test/profile", { headers: { Cookie: cookie } }), env);
  assert.equal(claims.subject, principal.subject);
  assert.equal(claims.authVersion, 4);
});

test("Worker user passwords use salted secret-keyed verifiers", async () => {
  const first = await hashUserPassword("strong-password", MASTER_SECRET);
  const second = await hashUserPassword("strong-password", MASTER_SECRET);
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(await verifyUserPassword("strong-password", first.hash, first.salt, MASTER_SECRET), true);
  assert.equal(await verifyUserPassword("wrong-password", first.hash, first.salt, MASTER_SECRET), false);
  assert.equal(await verifyUserPassword("strong-password", first.hash, first.salt, `${MASTER_SECRET}-different`), false);
});

test("Worker usage normalization clamps percentages and preserves reset times", () => {
  const usage = normalizeUsage({ usage: {
    rolling: { status: "ok", percent: "9", resetsAt: "2026-08-16T00:00:00Z" },
    weekly: { percent: 120, resetsAt: "invalid" },
  } });
  assert.equal(usage.rolling.remainingPercent, 91);
  assert.equal(usage.rolling.resetsAt, "2026-08-16T00:00:00Z");
  assert.equal(usage.weekly.percent, 100);
  assert.equal(usage.weekly.resetsAt, null);
});

test("Worker model test sends only the selected minimal completion request", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return Response.json({ choices: [{ message: { content: "OK" } }] });
  };
  const config = {
    modelTestUrl: "https://example.test/v1/chat/completions",
    timeoutMs: 1000,
  };
  const result = await testModel("secret-key", "kimi-k3", config);
  assert.equal(result.model, "kimi-k3");
  assert.equal(captured.url, config.modelTestUrl);
  assert.equal(captured.options.headers.Authorization, "Bearer secret-key");
  assert.deepEqual(captured.body, {
    model: "kimi-k3",
    messages: [{ role: "user", content: "Reply with OK." }],
    max_tokens: 1,
    stream: false,
  });
});

test("Worker model list is deduplicated and does not require an account key", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  let authorization;
  globalThis.fetch = async (_url, options) => {
    authorization = options.headers.Authorization;
    return Response.json({ data: [{ id: "hy3" }, { id: "kimi-k3" }, { id: "hy3" }] });
  };
  const models = await listModels({ modelListUrl: "https://example.test/v1/models", timeoutMs: 1000 });
  assert.deepEqual(models, ["hy3", "kimi-k3"]);
  assert.equal(authorization, undefined);
});
