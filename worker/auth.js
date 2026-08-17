import { sessionClaims, credentialsMatch } from "./session.js";
import { UserStore } from "./user-store.js";

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

function adminPrincipal(env) {
  return { subject: "admin", username: env.WEB_USERNAME, role: "admin", accountIds: null };
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

export function authConfigured(env) {
  return Boolean(env.WEB_USERNAME && env.WEB_PASSWORD);
}

export async function authenticateCredentials(username, password, env, userStore = new UserStore(env)) {
  if (await credentialsMatch(username, password, env)) return adminPrincipal(env);
  if (!env.DB) return null;
  const user = await userStore.authenticate(username, password);
  return user ? viewerPrincipal(user) : null;
}

export async function resolvePrincipal(request, env, userStore = new UserStore(env)) {
  if (!authConfigured(env)) return null;
  const claims = await sessionClaims(request, env);
  if (claims?.role === "admin" && claims.subject === "admin" && claims.username === env.WEB_USERNAME) {
    return adminPrincipal(env);
  }
  if (claims?.role === "viewer") {
    const user = await userStore.getEnabledById(claims.subject);
    if (user && user.username === claims.username && user.authVersion === claims.authVersion) return viewerPrincipal(user);
  }
  const credentials = decodeBasicCredentials(request.headers.get("Authorization"));
  if (!credentials) return null;
  return authenticateCredentials(credentials.username, credentials.password, env, userStore);
}

export async function isAuthorized(request, env) {
  return Boolean(await resolvePrincipal(request, env));
}
