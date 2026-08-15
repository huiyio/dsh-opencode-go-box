import { secureEqual } from "./crypto.js";

function decodeBasicCredentials(header) {
  if (typeof header !== "string" || !header.startsWith("Basic ")) return null;
  try {
    const binary = atob(header.slice(6));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

export function authConfigured(env) {
  return Boolean(env.WEB_USERNAME && env.WEB_PASSWORD);
}

export async function isAuthorized(request, env) {
  if (!authConfigured(env)) return false;
  const credentials = decodeBasicCredentials(request.headers.get("Authorization"));
  if (!credentials) return false;
  const [usernameMatches, passwordMatches] = await Promise.all([
    secureEqual(credentials.username, env.WEB_USERNAME),
    secureEqual(credentials.password, env.WEB_PASSWORD),
  ]);
  return usernameMatches && passwordMatches;
}
