import { authConfigured, authenticateCredentials, resolvePrincipal } from "./auth.js";
import { WorkerError } from "./errors.js";
import { AccountStore } from "./store.js";
import { UserStore } from "./user-store.js";
import { fetchUsage, listModels, testModel } from "./upstream.js";
import { clearSessionCookie, sessionCookie } from "./session.js";

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

function isAdminPath(pathname) {
  return pathname === "/admin" || pathname === "/admin.html" || pathname === "/admin.js"
    || pathname === "/users" || pathname === "/users.html" || pathname === "/users.js"
    || pathname.startsWith("/api/admin/");
}

async function readJsonBody(request, maxBytes = 16384) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    throw new WorkerError("json_required", "Content-Type must be application/json", 415);
  }
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new WorkerError("body_too_large", "Request body is too large", 413);
  }
  if (!request.body) throw new WorkerError("invalid_json", "Request body must be a JSON object");
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new WorkerError("body_too_large", "Request body is too large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
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

function filterAccounts(accounts, principal) {
  if (principal.role === "admin") return accounts;
  const allowed = new Set(principal.accountIds);
  return accounts.filter((account) => allowed.has(account.id));
}

async function handleApi(request, env, url, principal, store, userStore, config) {
  if (url.pathname === "/api/me") {
    if (request.method === "GET") {
      return json(200, {
        ok: true,
        user: {
          username: principal.username,
          role: principal.role,
          canEditProfile: principal.role === "viewer" || (principal.role === "admin" && userStore.writable),
          credentialSource: principal.role === "admin" ? principal.credentialSource : "user_store",
        },
      });
    }
    if (request.method === "PATCH") {
    if (principal.role === "admin" && !userStore.writable) {
      throw new WorkerError("user_store_disabled", "Configure KEY_ENCRYPTION_SECRET to update administrator credentials", 503);
      }
      const body = await readJsonBody(request);
    const verified = principal.role === "admin"
      ? await authenticateCredentials(principal.username, body.currentPassword, env, userStore)
      : await userStore.authenticate(principal.username, body.currentPassword);
    if (!verified || (principal.role === "admin" ? verified.subject : verified.id) !== principal.subject) {
        throw new WorkerError("current_password_invalid", "Current password is incorrect", 401);
      }
    const changes = {};
    if (Object.hasOwn(body, "username")) changes.username = body.username;
    if (Object.hasOwn(body, "password") && body.password !== "") changes.password = body.password;
    if (principal.role === "admin") changes.bootstrapPassword = body.currentPassword;
      if (Object.keys(changes).length === 0) {
        throw new WorkerError("invalid_profile_update", "A new username or password is required");
      }
    const updated = principal.role === "admin"
      ? await userStore.updateAdministrator(changes)
      : await userStore.update(principal.subject, changes);
    const nextPrincipal = principal.role === "admin" ? {
      subject: "admin", username: updated.username, role: "admin", accountIds: null, authVersion: updated.authVersion, credentialSource: "system",
    } : (() => {
      const user = updated;
      return { subject: user.id, username: user.username, role: "viewer", accountIds: [...user.accountIds], authVersion: user.authVersion };
    })();
      return json(200, {
        ok: true,
      user: { username: updated.username, role: nextPrincipal.role, canEditProfile: true, credentialSource: nextPrincipal.credentialSource || "user_store" },
      }, { "Set-Cookie": await sessionCookie(env, request, nextPrincipal) });
    }
    return methodNotAllowed("GET, PATCH");
  }

  if (url.pathname === "/api/accounts") {
    if (request.method !== "GET") return methodNotAllowed("GET");
    return json(200, {
      ok: true,
      accounts: filterAccounts(await store.list(), principal),
      adminEnabled: principal.role === "admin" && store.writable,
    });
  }

  if (url.pathname === "/api/usage") {
    if (request.method !== "GET") return methodNotAllowed("GET");
    const allowedAccounts = filterAccounts(await store.list(), principal);
    const requestedId = url.searchParams.get("account");
    const selected = requestedId
      ? allowedAccounts.find((account) => account.id === requestedId)
      : allowedAccounts[0];
    if (!selected) {
      throw new WorkerError(requestedId ? "account_not_found" : "no_accounts", requestedId ? "Account not found" : "No accounts are assigned", 404);
    }
    const account = await store.getSecret(selected.id);
    if (!account.enabled) throw new WorkerError("account_disabled", "Account is disabled", 409);
    if (account.lifecycleStatus === "pending") throw new WorkerError("account_not_started", "Account is not active yet", 409);
    if (account.lifecycleStatus === "expired") throw new WorkerError("account_expired", "Account has expired", 410);
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

  if (url.pathname === "/api/admin/users" || url.pathname.startsWith("/api/admin/users/")) {
    if (!userStore.writable) throw new WorkerError("user_store_disabled", "User management is disabled", 503);
    const id = url.pathname.startsWith("/api/admin/users/")
      ? decodeURIComponent(url.pathname.slice("/api/admin/users/".length))
      : "";
    if (!id && request.method === "GET") return json(200, { ok: true, users: await userStore.list() });
    if (!id && request.method === "POST") return json(201, { ok: true, user: await userStore.add(await readJsonBody(request)) });
    if (id && request.method === "PATCH") return json(200, { ok: true, user: await userStore.update(id, await readJsonBody(request)) });
    if (id && request.method === "DELETE") return json(200, { ok: true, user: await userStore.remove(id) });
    return methodNotAllowed(id ? "PATCH, DELETE" : "GET, POST");
  }

  if (url.pathname === "/api/admin/backup" || url.pathname === "/api/admin/restore") {
    if (!store.writable) throw new WorkerError("admin_disabled", "Account management is disabled", 503);
    if (url.pathname === "/api/admin/backup" && request.method === "GET") {
      const backup = {
        format: "opencode-go-full-backup-v2",
        platform: "workers",
        exportedAt: new Date().toISOString(),
        accountBackup: await store.exportBackup(),
        userBackup: await userStore.exportBackup(),
      };
      return json(200, { ok: true, backup }, {
        "Content-Disposition": 'attachment; filename="opencode-go-balance-backup.json"',
      });
    }
    if (url.pathname === "/api/admin/restore" && request.method === "POST") {
      const body = await readJsonBody(request, 8 * 1024 * 1024);
      const backup = body.backup || body;
      let result;
      if (backup?.format === "opencode-go-full-backup-v2" && backup.platform === "workers") {
        result = await store.restoreBackup(backup.accountBackup);
        result = { ...result, ...(await userStore.restoreBackup(backup.userBackup)) };
      } else {
        result = await store.restoreBackup(backup);
        await userStore.retainAccounts();
      }
      return json(200, { ok: true, ...result });
    }
    return methodNotAllowed(url.pathname.endsWith("backup") ? "GET" : "POST");
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
    if (!id && request.method === "GET") return json(200, { ok: true, accounts: await store.list({ includeDisabled: true }) });
    if (!id && request.method === "POST") return json(201, { ok: true, account: await store.add(await readJsonBody(request)) });
    if (id && action === "test" && request.method === "POST") {
      const body = await readJsonBody(request);
      const account = await store.getSecret(id);
      if (!account.enabled) throw new WorkerError("account_disabled", "Account is disabled", 409);
      if (account.lifecycleStatus === "pending") throw new WorkerError("account_not_started", "Account is not active yet", 409);
      if (account.lifecycleStatus === "expired") throw new WorkerError("account_expired", "Account has expired", 410);
      const modelTest = await testModel(account.key, body.model, config);
      const { key: _key, ...publicAccount } = account;
      return json(200, { ok: true, valid: true, modelTest: { account: publicAccount, ...modelTest } });
    }
    if (id && !action && request.method === "PATCH") return json(200, { ok: true, account: await store.update(id, await readJsonBody(request)) });
    if (id && !action && request.method === "DELETE") return json(200, { ok: true, account: await store.remove(id) });
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

    const userStore = new UserStore(env);
    if (url.pathname === "/api/login") {
      if (request.method !== "POST") return methodNotAllowed("POST");
      try {
        const body = await readJsonBody(request);
        const principal = await authenticateCredentials(body.username, body.password, env, userStore);
        if (!principal) {
          return json(401, { ok: false, error: { code: "invalid_credentials", message: "Invalid username or password" } });
        }
        const requestedNext = typeof body.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//")
          ? body.next
          : "/";
        const next = principal.role === "admin" || !isAdminPath(new URL(requestedNext, url.origin).pathname) ? requestedNext : "/";
        return json(200, { ok: true, next }, { "Set-Cookie": await sessionCookie(env, request, principal) });
      } catch (error) {
        return reportError(error, request);
      }
    }

    if (url.pathname === "/api/logout") {
      if (request.method !== "POST") return methodNotAllowed("POST");
      return json(200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
    }

    const publicLoginRoute = url.pathname === "/login" || url.pathname === "/login.html"
      || url.pathname === "/login.js" || url.pathname === "/styles.css";
    if (!publicLoginRoute && !authConfigured(env)) {
      return json(503, { ok: false, error: { code: "authentication_not_configured", message: "Web authentication is not configured" } });
    }
    const principal = publicLoginRoute ? null : await resolvePrincipal(request, env, userStore);
    if (!publicLoginRoute && !principal) {
      if (["/", "/admin", "/users", "/profile"].includes(url.pathname) && (request.method === "GET" || request.method === "HEAD")) {
        return new Response(null, {
          status: 302,
          headers: headers({ Location: `${url.origin}/login?next=${encodeURIComponent(`${url.pathname}${url.search}`)}` }),
        });
      }
      return json(401, { ok: false, error: { code: "authentication_required", message: "Authentication required" } });
    }
    const adminResource = isAdminPath(url.pathname);
    if (adminResource && principal.role !== "admin") {
      return json(403, { ok: false, error: { code: "admin_required", message: "Administrator access is required" } });
    }

    try {
      const store = new AccountStore(env);
      if (url.pathname === "/" || url.pathname === "/admin" || url.pathname.startsWith("/api/")) {
        await store.cleanupExpired();
      }
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url, principal, store, userStore, readConfig(env));
      }
      return await serveAsset(request, env, url);
    } catch (error) {
      return reportError(error, request);
    }
  },

  async scheduled(_event, env, context) {
    context.waitUntil(new AccountStore(env).cleanupExpired());
  },
};
