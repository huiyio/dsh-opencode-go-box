import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { KeyStoreError } from "./key-store.js";
import { ModelTestError } from "./model-test-service.js";
import { clearSessionCookie, credentialsMatch, sessionClaims, sessionCookie } from "./session.js";
import { UserStoreError } from "./user-store.js";
import { UsageError } from "./usage-service.js";

const STATIC_ROUTES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/admin", "admin.html"],
  ["/admin.html", "admin.html"],
  ["/users", "users.html"],
  ["/users.html", "users.html"],
  ["/profile", "profile.html"],
  ["/profile.html", "profile.html"],
  ["/login", "login.html"],
  ["/login.html", "login.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"],
  ["/admin.js", "admin.js"],
  ["/users.js", "users.js"],
  ["/profile.js", "profile.js"],
  ["/login.js", "login.js"],
]);

const CONTENT_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
]);

function securityHeaders() {
  return {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

function sendJson(response, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    ...securityHeaders(),
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...extraHeaders,
  });
  response.end(payload);
}

class HttpError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function credentialsFromRequest(request) {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

function adminPrincipal(administrator, source = "system") {
  return {
    subject: "admin",
    username: administrator.username,
    role: "admin",
    accountIds: null,
    authVersion: administrator.authVersion || 1,
    credentialSource: source,
  };
}

function viewerPrincipal(user) {
  return {
    subject: user.id,
    username: user.username,
    role: "viewer",
    accountIds: [...user.accountIds],
    authVersion: user.authVersion,
  };
}

function isAdminPath(pathname) {
  return pathname === "/admin" || pathname === "/admin.html" || pathname === "/admin.js"
    || pathname === "/users" || pathname === "/users.html" || pathname === "/users.js"
    || pathname.startsWith("/api/admin/");
}

async function authenticateCredentials(username, password, config, userStore) {
  const administrator = await userStore?.authenticateAdministrator?.(username, password);
  if (administrator) return adminPrincipal(administrator);
  const configuredAdministrator = userStore?.getAdministrator?.();
  if ((!configuredAdministrator || config.webAdminRecovery) && credentialsMatch(username, password, config)) {
    return adminPrincipal({ username: config.webUsername || "admin", authVersion: 1 }, configuredAdministrator ? "environment_recovery" : "environment_bootstrap");
  }
  const user = await userStore?.authenticate(username, password);
  return user ? viewerPrincipal(user) : null;
}

async function principalFromRequest(request, config, userStore) {
  if (!config.webUsername && !config.webPassword) return adminPrincipal({ username: "admin", authVersion: 1 }, "unconfigured");
  const claims = sessionClaims(request, config);
  if (claims?.role === "admin" && claims.subject === "admin") {
    const administrator = userStore?.getAdministrator?.();
    if (administrator && claims.username === administrator.username && claims.authVersion === administrator.authVersion) {
      return adminPrincipal(administrator);
    }
    if (!administrator && claims.username === config.webUsername && claims.authVersion === 1) {
      return adminPrincipal({ username: config.webUsername, authVersion: 1 }, "environment_bootstrap");
    }
  }
  if (claims?.role === "viewer") {
    const user = userStore?.getEnabledById(claims.subject);
    if (user && user.username === claims.username && user.authVersion === claims.authVersion) return viewerPrincipal(user);
  }
  const credentials = credentialsFromRequest(request);
  if (!credentials) return null;
  return authenticateCredentials(credentials.username, credentials.password, config, userStore);
}

async function sendStatic(response, publicDir, filename, headOnly) {
  try {
    const payload = await readFile(join(publicDir, filename));
    const extension = extname(filename);
    response.writeHead(200, {
      ...securityHeaders(),
      "Cache-Control": extension === ".html" ? "no-store" : "no-cache",
      "Content-Type": CONTENT_TYPES.get(extension) || "application/octet-stream",
      "Content-Length": payload.length,
    });
    response.end(headOnly ? undefined : payload);
  } catch {
    sendJson(response, 500, { ok: false, error: { code: "static_read_failed", message: "Unable to read the web application" } });
  }
}

async function readJsonBody(request, maxBytes = 16384) {
  const contentType = request.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError("json_required", "Content-Type must be application/json", 415);
  }
  const declaredLength = Number(request.headers["content-length"] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpError("body_too_large", "Request body is too large", 413);
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maxBytes) throw new HttpError("body_too_large", "Request body is too large", 413);
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    return value;
  } catch {
    throw new HttpError("invalid_json", "Request body must be a JSON object");
  }
}

function sendError(response, error, logger) {
  const expected = error instanceof UsageError || error instanceof KeyStoreError || error instanceof UserStoreError
    || error instanceof ModelTestError || error instanceof HttpError;
  if (!expected) logger.error("Unexpected request failure", error);
  sendJson(response, expected ? error.status : 500, {
    ok: false,
    error: {
      code: expected ? error.code : "internal_error",
      message: expected ? error.message : "An unexpected server error occurred",
    },
  });
}

function accountsForPrincipal(accountService, principal, { includeDisabled = false } = {}) {
  const accounts = accountService.listAccounts({ includeDisabled });
  if (principal.role === "admin") return accounts;
  const allowed = new Set(principal.accountIds);
  return accounts.filter((account) => allowed.has(account.id));
}

function validatedAccountIds(value, accountService) {
  if (!Array.isArray(value) || value.length > 500) {
    throw new UserStoreError("invalid_permissions", "accountIds must be an array with at most 500 items");
  }
  const known = new Set(accountService.listAccounts({ includeDisabled: true }).map((account) => account.id));
  const ids = [...new Set(value)];
  if (ids.some((id) => typeof id !== "string" || !known.has(id))) {
    throw new UserStoreError("invalid_permissions", "One or more account permissions do not exist");
  }
  return ids;
}

function requireAdmin(response, principal) {
  if (principal.role === "admin") return true;
  sendJson(response, 403, { ok: false, error: { code: "admin_required", message: "Administrator access is required" } });
  return false;
}

export function createHttpServer({ config, accountService, userStore = null, publicDir, logger = console }) {
  const startedAt = Date.now();

  return createServer(async (request, response) => {
    let url;
    try {
      url = new URL(request.url || "/", "http://localhost");
    } catch {
      sendJson(response, 400, { ok: false, error: { code: "bad_request", message: "Invalid request URL" } });
      return;
    }

    if (url.pathname === "/healthz") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, { Allow: "GET, HEAD" });
        return;
      }
      sendJson(response, 200, {
        status: "ok",
        configured: accountService.configured,
        adminEnabled: accountService.adminEnabled,
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      });
      return;
    }

    if (url.pathname === "/api/login") {
      if (request.method !== "POST") {
        sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, { Allow: "POST" });
        return;
      }
      try {
        const body = await readJsonBody(request);
        const principal = await authenticateCredentials(body.username, body.password, config, userStore);
        if (!principal) {
          sendJson(response, 401, { ok: false, error: { code: "invalid_credentials", message: "Invalid username or password" } });
          return;
        }
        const requestedNext = typeof body.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//")
          ? body.next
          : "/";
        const next = principal.role === "admin" || !isAdminPath(new URL(requestedNext, "http://localhost").pathname) ? requestedNext : "/";
        sendJson(response, 200, { ok: true, next }, { "Set-Cookie": sessionCookie(config, request, principal) });
      } catch (error) {
        sendError(response, error, logger);
      }
      return;
    }

    if (url.pathname === "/api/logout") {
      if (request.method !== "POST") {
        sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, { Allow: "POST" });
        return;
      }
      sendJson(response, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
      return;
    }

    const publicLoginRoute = url.pathname === "/login" || url.pathname === "/login.html"
      || url.pathname === "/login.js" || url.pathname === "/styles.css";
    const principal = publicLoginRoute ? null : await principalFromRequest(request, config, userStore);
    if (!publicLoginRoute && !principal) {
      if (["/", "/admin", "/users", "/profile"].includes(url.pathname) && (request.method === "GET" || request.method === "HEAD")) {
        response.writeHead(302, { Location: `/login?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`, ...securityHeaders() });
        response.end();
        return;
      }
      sendJson(response, 401, { ok: false, error: { code: "authentication_required", message: "Authentication required" } });
      return;
    }

    if (!publicLoginRoute && isAdminPath(url.pathname)
      && !requireAdmin(response, principal)) return;

    if (!publicLoginRoute && typeof accountService.cleanupExpiredAccounts === "function") {
      try {
        const removed = await accountService.cleanupExpiredAccounts();
        if (userStore) {
          for (const account of removed) await userStore.revokeAccount(account.id);
        }
      } catch (error) {
        sendError(response, error, logger);
        return;
      }
    }

    if (url.pathname === "/api/me") {
      if (request.method === "GET") {
        sendJson(response, 200, {
          ok: true,
          user: {
            username: principal.username,
            role: principal.role,
            canEditProfile: principal.role === "viewer" || (principal.role === "admin" && userStore?.writable),
            credentialSource: principal.role === "admin" ? principal.credentialSource : "user_store",
          },
        });
        return;
      }
      if (request.method === "PATCH") {
        if (principal.role === "admin" && !userStore?.writable) {
          sendJson(response, 503, { ok: false, error: { code: "user_store_disabled", message: "Configure KEY_ENCRYPTION_SECRET to update administrator credentials" } });
          return;
        }
        try {
          const body = await readJsonBody(request);
          const verified = principal.role === "admin"
            ? await authenticateCredentials(principal.username, body.currentPassword, config, userStore)
            : await userStore?.authenticate(principal.username, body.currentPassword);
          if (!verified || (principal.role === "admin" ? verified.subject : verified.id) !== principal.subject) {
            throw new HttpError("current_password_invalid", "Current password is incorrect", 401);
          }
          const changes = {};
          if (Object.hasOwn(body, "username")) changes.username = body.username;
          if (Object.hasOwn(body, "password") && body.password !== "") changes.password = body.password;
          if (principal.role === "admin") changes.bootstrapPassword = body.currentPassword;
          if (Object.keys(changes).length === 0) {
            throw new HttpError("invalid_profile_update", "A new username or password is required");
          }
          const updated = principal.role === "admin"
            ? await userStore.updateAdministrator(changes)
            : await userStore.update(principal.subject, changes);
          const nextPrincipal = principal.role === "admin" ? adminPrincipal(updated) : viewerPrincipal(userStore.getEnabledById(principal.subject));
          sendJson(response, 200, {
            ok: true,
            user: { username: nextPrincipal.username, role: nextPrincipal.role, canEditProfile: true, credentialSource: nextPrincipal.credentialSource || "user_store" },
          }, { "Set-Cookie": sessionCookie(config, request, nextPrincipal) });
        } catch (error) {
          sendError(response, error, logger);
        }
        return;
      }
      sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, { Allow: "GET, PATCH" });
      return;
    }

    if (url.pathname === "/api/accounts") {
      if (request.method !== "GET") {
        sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, { Allow: "GET" });
        return;
      }
      sendJson(response, 200, {
        ok: true,
        accounts: accountsForPrincipal(accountService, principal),
        adminEnabled: principal.role === "admin" && accountService.adminEnabled,
      });
      return;
    }

    if (url.pathname === "/api/usage") {
      if (request.method !== "GET") {
        sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, { Allow: "GET" });
        return;
      }
      try {
        const allowedAccounts = accountsForPrincipal(accountService, principal);
        const requestedId = url.searchParams.get("account");
        const selected = requestedId
          ? allowedAccounts.find((account) => account.id === requestedId)
          : allowedAccounts[0];
        if (!selected) {
          throw new UsageError(requestedId ? "account_not_found" : "no_accounts", requestedId ? "Account not found" : "No accounts are assigned", 404);
        }
        const result = await accountService.getUsage(selected.id, { force: url.searchParams.get("refresh") === "1" });
        sendJson(response, 200, {
          ok: true,
          ...result,
          thresholds: { warn: config.warnPercent, danger: config.dangerPercent },
          refreshIntervalMs: config.refreshIntervalMs,
        });
      } catch (error) {
        sendError(response, error, logger);
      }
      return;
    }

    if (url.pathname === "/api/admin/users" || url.pathname.startsWith("/api/admin/users/")) {
      if (!userStore?.writable) {
        sendJson(response, 503, { ok: false, error: { code: "user_store_disabled", message: "User management is disabled" } });
        return;
      }
      try {
        const id = url.pathname.startsWith("/api/admin/users/")
          ? decodeURIComponent(url.pathname.slice("/api/admin/users/".length))
          : "";
        if (!id && request.method === "GET") {
          sendJson(response, 200, { ok: true, users: userStore.list() });
          return;
        }
        if (!id && request.method === "POST") {
          const body = await readJsonBody(request);
          const user = await userStore.add({ ...body, accountIds: validatedAccountIds(body.accountIds || [], accountService) });
          sendJson(response, 201, { ok: true, user });
          return;
        }
        if (id && request.method === "PATCH") {
          const body = await readJsonBody(request);
          const changes = { ...body };
          if (Object.hasOwn(body, "accountIds")) changes.accountIds = validatedAccountIds(body.accountIds, accountService);
          const user = await userStore.update(id, changes);
          sendJson(response, 200, { ok: true, user });
          return;
        }
        if (id && request.method === "DELETE") {
          const user = await userStore.remove(id);
          sendJson(response, 200, { ok: true, user });
          return;
        }
        sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, {
          Allow: id ? "PATCH, DELETE" : "GET, POST",
        });
      } catch (error) {
        sendError(response, error, logger);
      }
      return;
    }

    if (url.pathname === "/api/admin/models") {
      if (!accountService.adminEnabled) {
        sendJson(response, 503, { ok: false, error: { code: "admin_disabled", message: "Account management is disabled" } });
        return;
      }
      if (request.method !== "GET") {
        sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, { Allow: "GET" });
        return;
      }
      try {
        sendJson(response, 200, { ok: true, models: await accountService.listTestModels() });
      } catch (error) {
        sendError(response, error, logger);
      }
      return;
    }

    if (url.pathname === "/api/admin/backup" || url.pathname === "/api/admin/restore") {
      if (!accountService.adminEnabled) {
        sendJson(response, 503, { ok: false, error: { code: "admin_disabled", message: "Account management is disabled" } });
        return;
      }
      try {
        if (url.pathname === "/api/admin/backup" && request.method === "GET") {
          const accountBackup = await accountService.exportBackup();
          const backup = userStore?.writable
            ? { format: "opencode-go-full-backup-v2", platform: "docker", exportedAt: new Date().toISOString(), accountBackup, userBackup: await userStore.exportBackup() }
            : accountBackup;
          sendJson(response, 200, { ok: true, backup }, {
            "Content-Disposition": 'attachment; filename="opencode-go-balance-backup.json"',
          });
          return;
        }
        if (url.pathname === "/api/admin/restore" && request.method === "POST") {
          const body = await readJsonBody(request, 8 * 1024 * 1024);
          const backup = body.backup || body;
          let result;
          if (backup?.format === "opencode-go-full-backup-v2" && backup.platform === "docker") {
            result = await accountService.restoreBackup(backup.accountBackup);
            const userResult = await userStore.restoreBackup(backup.userBackup);
            await userStore.retainAccounts(accountService.listAccounts({ includeDisabled: true }).map((account) => account.id));
            result = { ...result, ...userResult };
          } else {
            result = await accountService.restoreBackup(backup);
            if (userStore?.writable) {
              await userStore.retainAccounts(accountService.listAccounts({ includeDisabled: true }).map((account) => account.id));
            }
          }
          sendJson(response, 200, { ok: true, ...result });
          return;
        }
        sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, {
          Allow: url.pathname.endsWith("backup") ? "GET" : "POST",
        });
      } catch (error) {
        sendError(response, error, logger);
      }
      return;
    }

    if (url.pathname === "/api/admin/accounts" || url.pathname.startsWith("/api/admin/accounts/")) {
      if (!accountService.adminEnabled) {
        sendJson(response, 503, {
          ok: false,
          error: { code: "admin_disabled", message: "Configure web authentication and KEY_ENCRYPTION_SECRET to enable account management" },
        });
        return;
      }
      try {
        const path = url.pathname.startsWith("/api/admin/accounts/")
          ? url.pathname.slice("/api/admin/accounts/".length).split("/")
          : [];
        const id = path[0] ? decodeURIComponent(path[0]) : "";
        const action = path[1] || "";
        if (!id && request.method === "GET") {
          sendJson(response, 200, { ok: true, accounts: accountService.listAccounts({ includeDisabled: true }) });
          return;
        }
        if (!id && request.method === "POST") {
          const account = await accountService.addAccount(await readJsonBody(request));
          sendJson(response, 201, { ok: true, account });
          return;
        }
        if (id && action === "test" && request.method === "POST") {
          const body = await readJsonBody(request);
          const result = await accountService.testModel(id, body.model);
          sendJson(response, 200, { ok: true, valid: true, modelTest: result });
          return;
        }
        if (id && !action && request.method === "PATCH") {
          const account = await accountService.updateAccount(id, await readJsonBody(request));
          sendJson(response, 200, { ok: true, account });
          return;
        }
        if (id && !action && request.method === "DELETE") {
          const account = await accountService.removeAccount(id);
          if (userStore) await userStore.revokeAccount(id);
          sendJson(response, 200, { ok: true, account });
          return;
        }
        sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, {
          Allow: action === "test" ? "POST" : id ? "PATCH, DELETE" : "GET, POST",
        });
      } catch (error) {
        sendError(response, error, logger);
      }
      return;
    }

    const filename = STATIC_ROUTES.get(url.pathname);
    if (filename && (request.method === "GET" || request.method === "HEAD")) {
      await sendStatic(response, publicDir, filename, request.method === "HEAD");
      return;
    }

    sendJson(response, 404, { ok: false, error: { code: "not_found", message: "Not found" } });
  });
}
