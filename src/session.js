import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "opencode_go_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signingSecret(config) {
  return config.keyEncryptionSecret || config.webPassword;
}

function secureTextEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const expected = createHmac("sha256", "opencode-go-credential-comparison").update(right).digest();
  const actual = createHmac("sha256", "opencode-go-credential-comparison").update(left).digest();
  return timingSafeEqual(actual, expected);
}

function cookiesFromRequest(request) {
  const header = request.headers.cookie || "";
  return new Map(header.split(";").map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? ["", ""] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }).filter(([name]) => name));
}

export function credentialsMatch(username, password, config) {
  if (!config.webUsername || !config.webPassword) return false;
  return secureTextEqual(username, config.webUsername) && secureTextEqual(password, config.webPassword);
}

export function sessionClaims(request, config, now = Date.now()) {
  const token = cookiesFromRequest(request).get(SESSION_COOKIE);
  if (!token || !signingSecret(config)) return null;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const encodedPayload = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  const expectedSignature = signature(encodedPayload, signingSecret(config));
  if (providedSignature.length !== expectedSignature.length
    || !timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) return null;
  try {
    const claims = JSON.parse(base64UrlDecode(encodedPayload));
    if (!claims || claims.version !== 1 || !["admin", "viewer"].includes(claims.role)
      || typeof claims.subject !== "string" || typeof claims.username !== "string"
      || !Number.isSafeInteger(claims.authVersion) || claims.authVersion < 1
      || !Number.isSafeInteger(claims.expiresAt) || claims.expiresAt <= Math.floor(now / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export function sessionAuthorized(request, config, now = Date.now()) {
  const claims = sessionClaims(request, config, now);
  return Boolean(claims?.role === "admin" && claims.username === config.webUsername);
}

export function sessionCookie(config, request, principal = {
  subject: "admin",
  username: config.webUsername,
  role: "admin",
}, now = Date.now()) {
  const claims = {
    subject: principal.subject,
    username: principal.username,
    role: principal.role,
    version: 1,
    expiresAt: Math.floor(now / 1000) + SESSION_MAX_AGE,
  };
  claims.authVersion = principal.authVersion || 1;
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const secure = request.socket?.encrypted || request.headers["x-forwarded-proto"] === "https";
  return `${SESSION_COOKIE}=${encodedPayload}.${signature(encodedPayload, signingSecret(config))}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
}
