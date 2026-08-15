import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { KeyStoreError } from "./key-store.js";
import { ModelTestError } from "./model-test-service.js";
import { clearSessionCookie, credentialsMatch, sessionAuthorized, sessionCookie } from "./session.js";
import { UsageError } from "./usage-service.js";

const STATIC_ROUTES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/admin", "admin.html"],
  ["/admin.html", "admin.html"],
  ["/login", "login.html"],
  ["/login.html", "login.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"],
  ["/admin.js", "admin.js"],
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

function isAuthorized(request, config) {
  if (!config.webUsername && !config.webPassword) return true;
  if (sessionAuthorized(request, config)) return true;
  const credentials = credentialsFromRequest(request);
  if (!credentials) return false;
  return credentialsMatch(credentials.username, credentials.password, config);
}

async function sendStatic(response, publicDir, filename, headOnly) {
  try {
    const payload = await readFile(join(publicDir, filename));
    response.writeHead(200, {
      ...securityHeaders(),
      "Cache-Control": "no-cache",
      "Content-Type": CONTENT_TYPES.get(extname(filename)) || "application/octet-stream",
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
  const expected = error instanceof UsageError || error instanceof KeyStoreError || error instanceof ModelTestError || error instanceof HttpError;
  if (!expected) logger.error("Unexpected request failure", error);
  sendJson(response, expected ? error.status : 500, {
    ok: false,
    error: {
      code: expected ? error.code : "internal_error",
      message: expected ? error.message : "An unexpected server error occurred",
    },
  });
}

export function createHttpServer({ config, accountService, publicDir, logger = console }) {
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
        if (!credentialsMatch(body.username, body.password, config)) {
          sendJson(response, 401, { ok: false, error: { code: "invalid_credentials", message: "Invalid username or password" } });
          return;
        }
        const next = typeof body.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//")
          ? body.next
          : "/";
        sendJson(response, 200, { ok: true, next }, { "Set-Cookie": sessionCookie(config, request) });
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

    const publicLoginRoute = url.pathname === "/login" || url.pathname === "/login.html" || url.pathname === "/login.js";
    if (!publicLoginRoute && !isAuthorized(request, config)) {
      if ((url.pathname === "/" || url.pathname === "/admin") && (request.method === "GET" || request.method === "HEAD")) {
        response.writeHead(302, { Location: `/login?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`, ...securityHeaders() });
        response.end();
        return;
      }
      sendJson(response, 401, { ok: false, error: { code: "authentication_required", message: "Authentication required" } });
      return;
    }

    if (url.pathname === "/api/accounts") {
      if (request.method !== "GET") {
        sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, { Allow: "GET" });
        return;
      }
      sendJson(response, 200, {
        ok: true,
        accounts: accountService.listAccounts(),
        adminEnabled: accountService.adminEnabled,
      });
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

    if (url.pathname === "/api/usage") {
      if (request.method !== "GET") {
        sendJson(response, 405, { ok: false, error: { code: "method_not_allowed", message: "Method not allowed" } }, { Allow: "GET" });
        return;
      }
      try {
        const result = await accountService.getUsage(url.searchParams.get("account"), {
          force: url.searchParams.get("refresh") === "1",
        });
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

    if (url.pathname === "/api/admin/backup" || url.pathname === "/api/admin/restore") {
      if (!accountService.adminEnabled) {
        sendJson(response, 503, { ok: false, error: { code: "admin_disabled", message: "Account management is disabled" } });
        return;
      }
      try {
        if (url.pathname === "/api/admin/backup" && request.method === "GET") {
          sendJson(response, 200, { ok: true, backup: await accountService.exportBackup() }, {
            "Content-Disposition": 'attachment; filename="opencode-go-balance-backup.json"',
          });
          return;
        }
        if (url.pathname === "/api/admin/restore" && request.method === "POST") {
          const body = await readJsonBody(request, 8 * 1024 * 1024);
          const result = await accountService.restoreBackup(body.backup || body);
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
          sendJson(response, 200, {
            ok: true,
            valid: true,
            modelTest: result,
          });
          return;
        }
        if (id && !action && request.method === "PATCH") {
          const account = await accountService.updateAccount(id, await readJsonBody(request));
          sendJson(response, 200, { ok: true, account });
          return;
        }
        if (id && !action && request.method === "DELETE") {
          const account = await accountService.removeAccount(id);
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
