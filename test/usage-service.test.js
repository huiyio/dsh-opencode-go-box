import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUsage, UsageError, UsageService } from "../src/usage-service.js";

test("normalizeUsage accepts wrapped payloads and computes remaining percentage", () => {
  const usage = normalizeUsage({ usage: {
    rolling: { status: "ok", percent: "9", resetsAt: "2026-08-16T00:00:00Z" },
    weekly: { status: "ok", percent: 120, resetsAt: "bad-date" },
    monthly: null,
  } });
  assert.deepEqual(usage.rolling, {
    status: "ok",
    percent: 9,
    remainingPercent: 91,
    resetsAt: "2026-08-16T00:00:00Z",
  });
  assert.equal(usage.weekly.percent, 100);
  assert.equal(usage.weekly.remainingPercent, 0);
  assert.equal(usage.weekly.resetsAt, null);
  assert.equal(usage.monthly, null);
});

test("normalizeUsage rejects unrelated payloads", () => {
  assert.throws(() => normalizeUsage({ hello: "world" }), (error) => {
    assert.equal(error.code, "invalid_payload");
    return true;
  });
});

test("UsageService caches successful requests and supports forced refresh", async () => {
  let calls = 0;
  let now = 1000;
  const service = new UsageService({
    apiKey: "test-key",
    usageUrl: "https://example.test/usage",
    timeoutMs: 1000,
    cacheTtlMs: 30000,
    now: () => now,
    fetchImpl: async (_url, options) => {
      calls += 1;
      assert.equal(options.headers.Authorization, "Bearer test-key");
      return new Response(JSON.stringify({ rolling: { percent: calls } }), { status: 200 });
    },
  });

  const first = await service.getUsage();
  const cached = await service.getUsage();
  const refreshed = await service.getUsage({ force: true });
  assert.equal(first.cached, false);
  assert.equal(cached.cached, true);
  assert.equal(refreshed.usage.rolling.percent, 2);
  assert.equal(calls, 2);

  now += 30001;
  await service.getUsage();
  assert.equal(calls, 3);
});

test("UsageService maps missing keys and upstream authorization failures", async () => {
  const missing = new UsageService({
    apiKey: "",
    usageUrl: "https://example.test/usage",
    timeoutMs: 1000,
    cacheTtlMs: 0,
  });
  await assert.rejects(missing.getUsage(), (error) => error instanceof UsageError && error.code === "not_configured");

  const unauthorized = new UsageService({
    apiKey: "bad-key",
    usageUrl: "https://example.test/usage",
    timeoutMs: 1000,
    cacheTtlMs: 0,
    fetchImpl: async () => new Response("denied", { status: 401 }),
  });
  await assert.rejects(unauthorized.getUsage(), (error) => error.code === "upstream_unauthorized");
});
