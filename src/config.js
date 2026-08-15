const DEFAULT_USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const DEFAULT_MODEL_TEST_URL = "https://opencode.ai/zen/go/v1/chat/completions";
const DEFAULT_MODEL_LIST_URL = "https://opencode.ai/zen/go/v1/models";

function parseInteger(name, value, fallback, minimum, maximum) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function parseUrl(value) {
  let url;
  try {
    url = new URL(value || DEFAULT_USAGE_URL);
  } catch {
    throw new Error("OPENCODE_USAGE_URL must be a valid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("OPENCODE_USAGE_URL must use http or https");
  }
  return url.toString();
}

export function readConfig(env = process.env) {
  const webUsername = env.WEB_USERNAME?.trim() || "";
  const webPassword = env.WEB_PASSWORD || "";
  if ((webUsername && !webPassword) || (!webUsername && webPassword)) {
    throw new Error("WEB_USERNAME and WEB_PASSWORD must be configured together");
  }

  const warnPercent = parseInteger("WARN_PERCENT", env.WARN_PERCENT, 60, 0, 100);
  const dangerPercent = parseInteger("DANGER_PERCENT", env.DANGER_PERCENT, 85, 0, 100);
  if (warnPercent >= dangerPercent) {
    throw new Error("WARN_PERCENT must be lower than DANGER_PERCENT");
  }

  const keyEncryptionSecret = env.KEY_ENCRYPTION_SECRET || "";
  if (keyEncryptionSecret && keyEncryptionSecret.length < 32) {
    throw new Error("KEY_ENCRYPTION_SECRET must contain at least 32 characters");
  }

  return Object.freeze({
    host: env.HOST?.trim() || "0.0.0.0",
    port: parseInteger("PORT", env.PORT, 3000, 1, 65535),
    apiKey: env.OPENCODE_GO_API_KEY?.trim() || "",
    usageUrl: parseUrl(env.OPENCODE_USAGE_URL),
    modelTestUrl: parseUrl(env.OPENCODE_MODEL_TEST_URL || DEFAULT_MODEL_TEST_URL),
    modelListUrl: parseUrl(env.OPENCODE_MODEL_LIST_URL || DEFAULT_MODEL_LIST_URL),
    modelTestModel: env.OPENCODE_MODEL_TEST_MODEL?.trim() || "hy3",
    timeoutMs: parseInteger("FETCH_TIMEOUT_MS", env.FETCH_TIMEOUT_MS, 15000, 1000, 120000),
    cacheTtlMs: parseInteger("CACHE_TTL_MS", env.CACHE_TTL_MS, 30000, 0, 300000),
    refreshIntervalMs: parseInteger("REFRESH_INTERVAL_MS", env.REFRESH_INTERVAL_MS, 30000, 10000, 3600000),
    warnPercent,
    dangerPercent,
    webUsername,
    webPassword,
    dataDir: env.DATA_DIR?.trim() || "./data",
    keyEncryptionSecret,
  });
}

export { DEFAULT_MODEL_LIST_URL, DEFAULT_MODEL_TEST_URL, DEFAULT_USAGE_URL };
