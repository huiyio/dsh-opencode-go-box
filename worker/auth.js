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

export function authConfigured(env) {
  return Boolean(env.WEB_USERNAME && env.WEB_PASSWORD);
}

export async function authenticateCredentials(username, password, env, userStore = new UserStore(env)) {
  const administrator = await userStore.authenticateAdministrator(username, password);
  if (administrator) return adminPrincipal(administrator);
  const configuredAdministrator = await userStore.getAdministrator();
  if ((!configuredAdministrator || env.WEB_ADMIN_RECOVERY === "1") && await credentialsMatch(username, password, env)) {
    return adminPrincipal({ username: env.WEB_USERNAME, authVersion: 1 }, configuredAdministrator ? "environment_recovery" : "environment_bootstrap");
  }
  if (!env.DB) return null;
  const user = await userStore.authenticate(username, password);
  return user ? viewerPrincipal(user) : null;
}

export async function resolvePrincipal(request, env, userStore = new UserStore(env)) {
  if (!authConfigured(env)) return null;
  const claims = await sessionClaims(request, env);
  if (claims?.role === "admin" && claims.subject === "admin") {
    const administrator = await userStore.getAdministrator();
    if (administrator && claims.username === administrator.username && claims.authVersion === administrator.authVersion) {
      return adminPrincipal(administrator);
    }
    if (!administrator && claims.username === env.WEB_USERNAME && claims.authVersion === 1) {
      return adminPrincipal({ username: env.WEB_USERNAME, authVersion: 1 }, "environment_bootstrap");
    }
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
