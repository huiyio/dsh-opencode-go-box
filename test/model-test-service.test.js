import assert from "node:assert/strict";
import test from "node:test";
import { ModelTestError, ModelTestService } from "../src/model-test-service.js";

function response(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("ModelTestService sends a minimal completion request", async () => {
  let request;
  const service = new ModelTestService({
    apiKey: "secret-key",
    modelTestUrl: "https://example.test/v1/chat/completions",
    model: "hy3",
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return response(200, { id: "completion-1", choices: [{ message: { content: "O" } }] });
    },
    now: () => Date.parse("2026-08-15T12:00:00.000Z"),
  });

  const result = await service.test();
  assert.deepEqual(result, { model: "hy3", completedAt: "2026-08-15T12:00:00.000Z" });
  assert.equal(request.url, "https://example.test/v1/chat/completions");
  assert.equal(request.options.headers.Authorization, "Bearer secret-key");
  assert.deepEqual(request.body, {
    model: "hy3",
    messages: [{ role: "user", content: "Reply with OK." }],
    max_tokens: 1,
    stream: false,
  });
});

test("ModelTestService distinguishes invalid keys and exhausted model quota", async () => {
  for (const [status, code] of [[401, "model_unauthorized"], [429, "model_rate_limited"]]) {
    const service = new ModelTestService({
      apiKey: "secret-key",
      modelTestUrl: "https://example.test/v1/chat/completions",
      model: "hy3",
      timeoutMs: 1000,
      fetchImpl: async () => response(status, { error: { message: "rejected" } }),
    });
    await assert.rejects(service.test(), (error) => error instanceof ModelTestError && error.code === code);
  }
});

test("ModelTestService loads and deduplicates model ids", async () => {
  let request;
  const service = new ModelTestService({
    apiKey: "unused-for-list",
    modelTestUrl: "https://example.test/v1/chat/completions",
    modelListUrl: "https://example.test/v1/models",
    model: "hy3",
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response(200, {
        data: [{ id: "hy3" }, { id: "kimi-k3" }, { id: "hy3" }, { name: "ignored" }],
      });
    },
  });

  assert.deepEqual(await service.listModels(), ["hy3", "kimi-k3"]);
  assert.equal(request.url, "https://example.test/v1/models");
  assert.equal(request.options.headers.Accept, "application/json");
});
