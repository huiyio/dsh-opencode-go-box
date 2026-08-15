import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MODEL_TEST_URL, DEFAULT_USAGE_URL, readConfig } from "../src/config.js";

test("readConfig returns safe standalone defaults", () => {
  const config = readConfig({});
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.port, 3000);
  assert.equal(config.usageUrl, DEFAULT_USAGE_URL);
  assert.equal(config.modelTestUrl, DEFAULT_MODEL_TEST_URL);
  assert.equal(config.modelTestModel, "hy3");
  assert.equal(config.apiKey, "");
  assert.equal(config.cacheTtlMs, 30000);
});

test("readConfig validates authentication pairs and threshold order", () => {
  assert.throws(() => readConfig({ WEB_USERNAME: "admin" }), /configured together/);
  assert.throws(() => readConfig({ WEB_PASSWORD: "secret" }), /configured together/);
  assert.throws(() => readConfig({ WARN_PERCENT: "90", DANGER_PERCENT: "80" }), /must be lower/);
  assert.throws(() => readConfig({ KEY_ENCRYPTION_SECRET: "too-short" }), /at least 32/);
});

test("readConfig accepts explicit deployment values", () => {
  const config = readConfig({
    HOST: "127.0.0.1",
    PORT: "8080",
    OPENCODE_GO_API_KEY: " test-key ",
    OPENCODE_USAGE_URL: "http://127.0.0.1:9000/usage",
    WEB_USERNAME: "viewer",
    WEB_PASSWORD: "secret",
  });
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 8080);
  assert.equal(config.apiKey, "test-key");
  assert.equal(config.usageUrl, "http://127.0.0.1:9000/usage");
  assert.equal(config.webUsername, "viewer");
});
