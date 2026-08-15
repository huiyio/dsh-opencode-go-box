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

function tokenFor(username, secret, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + SESSION_MAX_AGE;
  const payload = `${base64UrlEncode(username)}.${expiresAt}`;
  return `${payload}.${signature(payload, secret)}`;
}

function cookiesFromRequest(request) {
  const header = request.headers.cookie || "";
  return new Map(header.split(";").map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? ["", ""] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }).filter(([name]) => name));
}

export function credentialsMatch(username, password, config) {
  if (typeof username !== "string" || typeof password !== "string" || !config.webUsername || !config.webPassword) return false;
  const expectedUsername = createHmac("sha256", "comparison").update(config.webUsername).digest();
  const actualUsername = createHmac("sha256", "comparison").update(username).digest();
  const expectedPassword = createHmac("sha256", "comparison").update(config.webPassword).digest();
  const actualPassword = createHmac("sha256", "comparison").update(password).digest();
  return timingSafeEqual(actualUsername, expectedUsername) && timingSafeEqual(actualPassword, expectedPassword);
}

export function sessionAuthorized(request, config, now = Date.now()) {
  const token = cookiesFromRequest(request).get(SESSION_COOKIE);
  if (!token || !config.webPassword) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [encodedUsername, expiresAt, providedSignature] = parts;
  const payload = `${encodedUsername}.${expiresAt}`;
  const expectedSignature = signature(payload, config.webPassword);
  if (providedSignature.length !== expectedSignature.length) return false;
  if (!timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) return false;
  const expires = Number(expiresAt);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(now / 1000)) return false;
  try {
    return base64UrlDecode(encodedUsername) === config.webUsername;
  } catch {
    return false;
  }
}

export function sessionCookie(config, request, now = Date.now()) {
  const secure = request.socket?.encrypted || request.headers["x-forwarded-proto"] === "https";
  return `${SESSION_COOKIE}=${tokenFor(config.webUsername, config.webPassword, now)}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
}
