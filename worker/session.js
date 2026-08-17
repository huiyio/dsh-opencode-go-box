import { secureEqual } from "./crypto.js";

const encoder = new TextEncoder();
export const SESSION_COOKIE = "opencode_go_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

function base64UrlEncode(value) {
  const bytes = encoder.encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

async function hmac(payload, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {
    name: "HMAC",
    hash: "SHA-256",
  }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function cookiesFromRequest(request) {
  return new Map((request.headers.get("Cookie") || "").split(";").map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? ["", ""] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }).filter(([name]) => name));
}

export async function credentialsMatch(username, password, env) {
  if (typeof username !== "string" || typeof password !== "string" || !env.WEB_USERNAME || !env.WEB_PASSWORD) return false;
  const [expectedUsername, actualUsername, expectedPassword, actualPassword] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(env.WEB_USERNAME)),
    crypto.subtle.digest("SHA-256", encoder.encode(username)),
    crypto.subtle.digest("SHA-256", encoder.encode(env.WEB_PASSWORD)),
    crypto.subtle.digest("SHA-256", encoder.encode(password)),
  ]);
  const equal = (left, right) => {
    if (typeof crypto.subtle.timingSafeEqual === "function") return crypto.subtle.timingSafeEqual(left, right);
    const a = new Uint8Array(left);
    const b = new Uint8Array(right);
    let difference = 0;
    for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
    return difference === 0;
  };
  return equal(actualUsername, expectedUsername) && equal(actualPassword, expectedPassword);
}

export async function sessionClaims(request, env, now = Date.now()) {
  const token = cookiesFromRequest(request).get(SESSION_COOKIE);
  if (!token || !env.WEB_PASSWORD) return null;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const encodedPayload = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  if (!(await secureEqual(providedSignature, await hmac(encodedPayload, env.WEB_PASSWORD)))) return null;
  try {
    const claims = JSON.parse(base64UrlDecode(encodedPayload));
    if (!claims || claims.version !== 1 || !["admin", "viewer"].includes(claims.role)
      || typeof claims.subject !== "string" || typeof claims.username !== "string"
      || (claims.role === "viewer" && (!Number.isSafeInteger(claims.authVersion) || claims.authVersion < 1))
      || !Number.isSafeInteger(claims.expiresAt) || claims.expiresAt <= Math.floor(now / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function sessionAuthorized(request, env, now = Date.now()) {
  const claims = await sessionClaims(request, env, now);
  return Boolean(claims?.role === "admin" && claims.subject === "admin" && claims.username === env.WEB_USERNAME);
}

export async function sessionCookie(env, request, principal = null, now = Date.now()) {
  if (typeof principal === "number") {
    now = principal;
    principal = null;
  }
  const identity = principal || { subject: "admin", username: env.WEB_USERNAME, role: "admin" };
  const claims = {
    subject: identity.subject,
    username: identity.username,
    role: identity.role,
    version: 1,
    expiresAt: Math.floor(now / 1000) + SESSION_MAX_AGE,
  };
  if (identity.role === "viewer") claims.authVersion = identity.authVersion;
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const secure = new URL(request.url).protocol === "https:";
  return `${SESSION_COOKIE}=${encodedPayload}.${await hmac(encodedPayload, env.WEB_PASSWORD)}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`;
}
