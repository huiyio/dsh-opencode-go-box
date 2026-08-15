import { authConfigured, isAuthorized } from "./auth.js";
import { WorkerError } from "./errors.js";
import { AccountStore } from "./store.js";
import { fetchUsage, listModels, testModel } from "./upstream.js";

const DEFAULTS = Object.freeze({
  usageUrl: "https://opencode.ai/zen/go/v1/usage",
  modelTestUrl: "https://opencode.ai/zen/go/v1/chat/completions",
  modelListUrl: "https://opencode.ai/zen/go/v1/models",
  timeoutMs: 15000,
  cacheTtlMs: 30000,
  refreshIntervalMs: 30000,
  warnPercent: 60,
  dangerPercent: 85,
});

const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
});

function integerSetting(name, value, fallback, minimum, maximum) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new WorkerError("invalid_configuration", `${name} must be an integer between ${minimum} and ${maximum}`, 503);
  }
  return parsed;
}

function urlSetting(name, value, fallback) {
  try {
    const url = new URL(value || fallback);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid protocol");
    return url.toString();
  } catch {
    throw new WorkerError("invalid_configuration", `${name} must be a valid HTTP URL`, 503);
  }
}

function readConfig(env) {
  const warnPercent = integerSetting("WARN_PERCENT", env.WARN_PERCENT, DEFAULTS.warnPercent, 0, 100);
  const dangerPercent = integerSetting("DANGER_PERCENT", env.DANGER_PERCENT, DEFAULTS.dangerPercent, 0, 100);
  if (warnPercent >= dangerPercent) {
    throw new WorkerError("invalid_configuration", "WARN_PERCENT must be lower than DANGER_PERCENT", 503);
  }
  return {
    usageUrl: urlSetting("OPENCODE_USAGE_URL", env.OPENCODE_USAGE_URL, DEFAULTS.usageUrl),
    modelTestUrl: urlSetting("OPENCODE_MODEL_TEST_URL", env.OPENCODE_MODEL_TEST_URL, DEFAULTS.modelTestUrl),
    modelListUrl: urlSetting("OPENCODE_MODEL_LIST_URL", env.OPENCODE_MODEL_LIST_URL, DEFAULTS.modelListUrl),
    timeoutMs: integerSetting("FETCH_TIMEOUT_MS", env.FETCH_TIMEOUT_MS, DEFAULTS.timeoutMs, 1000, 120000),
    cacheTtlMs: integerSetting("CACHE_TTL_MS", env.CACHE_TTL_MS, DEFAULTS.cacheTtlMs, 0, 300000),
    refreshIntervalMs: integerSetting("REFRESH_INTERVAL_MS", env.REFRESH_INTERVAL_MS, DEFAULTS.refreshIntervalMs, 10000, 3600000),
    warnPercent,
    dangerPercent,
  };
}

function headers(extra = {}) {
  return { ...SECURITY_HEADERS, ...extra };
}

function json(status, body, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: headers({ "Cache-Control": "no-store", ...extraHeaders }),
  });
}

function methodNotAllowed(allow) {
  return json(405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, { Allow: allow });
}

async function readJsonBody(request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    throw new WorkerError("json_required", "Content-Type must be application/json", 415);
  }
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 16384) {
    throw new WorkerError("body_too_large", "Request body is too large", 413);
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > 16384) throw new WorkerError("body_too_large", "Request body is too large", 413);
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    return value;
  } catch {
    throw new WorkerError("invalid_json", "Request body must be a JSON object");
  }
}

function reportError(error, request) {
  const expected = error instanceof WorkerError;
  if (!expected) {
    console.error(JSON.stringify({
      event: "request_failed",
      method: request.method,
      path: new URL(request.url).pathname,
      ray: request.headers.get("CF-Ray") || null,
      error: error?.name || "Error",
    }));
  }
  return json(expected ? error.status : 500, {
    ok: false,
    error: {
      code: expected ? error.code : "internal_error",
      message: expected ? error.message : "An unexpected server error occurred",
    },
  });
}

async function handleApi(request, env, url) {
  const config = readConfig(env);
  const store = new AccountStore(env);

  if (url.pathname === "/api/accounts") {
    if (request.method !== "GET") return methodNotAllowed("GET");
    return json(200, { ok: true, accounts: await store.list(), adminEnabled: store.writable });
  }

  if (url.pathname === "/api/usage") {
    if (request.method !== "GET") return methodNotAllowed("GET");
    const account = await store.resolve(url.searchParams.get("account"));
    if (!account.enabled) throw new WorkerError("account_disabled", "Account is disabled", 409);
    const force = url.searchParams.get("refresh") === "1";
    let result = force ? null : await store.getCachedUsage(account.id);
    if (!result) {
      result = { ...(await fetchUsage(account.key, config)), cached: false };
      await store.putCachedUsage(account.id, result, config.cacheTtlMs);
    }
    const { key: _key, ...publicAccount } = account;
    return json(200, {
      ok: true,
      account: publicAccount,
      ...result,
      thresholds: { warn: config.warnPercent, danger: config.dangerPercent },
      refreshIntervalMs: config.refreshIntervalMs,
    });
  }

  if (url.pathname === "/api/admin/models") {
    if (!store.writable) throw new WorkerError("admin_disabled", "Account management is disabled", 503);
    if (request.method !== "GET") return methodNotAllowed("GET");
    return json(200, { ok: true, models: await listModels(config) });
  }

  if (url.pathname === "/api/admin/accounts" || url.pathname.startsWith("/api/admin/accounts/")) {
    if (!store.writable) {
      throw new WorkerError("admin_disabled", "Configure KEY_ENCRYPTION_SECRET to enable account management", 503);
    }
    const parts = url.pathname.startsWith("/api/admin/accounts/")
      ? url.pathname.slice("/api/admin/accounts/".length).split("/")
      : [];
    let id = "";
    try {
      id = parts[0] ? decodeURIComponent(parts[0]) : "";
    } catch {
      throw new WorkerError("bad_request", "Invalid account ID");
    }
    const action = parts[1] || "";
    if (!id && request.method === "GET") {
      return json(200, { ok: true, accounts: await store.list({ includeDisabled: true }) });
    }
    if (!id && request.method === "POST") {
      return json(201, { ok: true, account: await store.add(await readJsonBody(request)) });
    }
    if (id && action === "test" && request.method === "POST") {
      const body = await readJsonBody(request);
      const account = await store.getSecret(id);
      if (!account.enabled) throw new WorkerError("account_disabled", "Account is disabled", 409);
      const modelTest = await testModel(account.key, body.model, config);
      const { key: _key, ...publicAccount } = account;
      return json(200, { ok: true, valid: true, modelTest: { account: publicAccount, ...modelTest } });
    }
    if (id && !action && request.method === "PATCH") {
      return json(200, { ok: true, account: await store.update(id, await readJsonBody(request)) });
    }
    if (id && !action && request.method === "DELETE") {
      return json(200, { ok: true, account: await store.remove(id) });
    }
    return methodNotAllowed(action === "test" ? "POST" : id ? "PATCH, DELETE" : "GET, POST");
  }

  return json(404, { ok: false, error: { code: "not_found", message: "Not found" } });
}

async function serveAsset(request, env, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed("GET, HEAD");
  const assetUrl = new URL(url);
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), {
    method: request.method,
    headers: request.headers,
  }));
  const securedHeaders = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) securedHeaders.set(name, value);
  securedHeaders.set("Cache-Control", assetUrl.pathname.endsWith(".html") ? "no-cache" : "public, max-age=3600");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: securedHeaders });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed("GET, HEAD");
      let configured = false;
      try {
        configured = (await new AccountStore(env).countEnabled()) > 0;
      } catch {
        // Health remains available while D1 errors are exposed through authenticated API requests.
      }
      return json(200, { status: "ok", configured, adminEnabled: Boolean(env.KEY_ENCRYPTION_SECRET), authConfigured: authConfigured(env) });
    }

    if (!authConfigured(env)) {
      return json(503, { ok: false, error: { code: "authentication_not_configured", message: "Web authentication is not configured" } });
    }
    if (!(await isAuthorized(request, env))) {
      return json(401, { ok: false, error: { code: "authentication_required", message: "Authentication required" } }, {
        "WWW-Authenticate": 'Basic realm="OpenCode Go Balance", charset="UTF-8"',
      });
    }

    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);
      return await serveAsset(request, env, url);
    } catch (error) {
      return reportError(error, request);
    }
  },
};
