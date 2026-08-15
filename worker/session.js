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

export async function sessionAuthorized(request, env, now = Date.now()) {
  const token = cookiesFromRequest(request).get(SESSION_COOKIE);
  if (!token || !env.WEB_PASSWORD) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [encodedUsername, expiresAt, providedSignature] = parts;
  const payload = `${encodedUsername}.${expiresAt}`;
  const expectedSignature = await hmac(payload, env.WEB_PASSWORD);
  if (!(await secureEqual(providedSignature, expectedSignature))) return false;
  const expires = Number(expiresAt);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(now / 1000)) return false;
  try {
    return base64UrlDecode(encodedUsername) === env.WEB_USERNAME;
  } catch {
    return false;
  }
}

export async function sessionCookie(env, request, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + SESSION_MAX_AGE;
  const payload = `${base64UrlEncode(env.WEB_USERNAME)}.${expiresAt}`;
  const secure = new URL(request.url).protocol === "https:";
  return `${SESSION_COOKIE}=${payload}.${await hmac(payload, env.WEB_PASSWORD)}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`;
}
