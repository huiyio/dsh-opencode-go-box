// Host half of the dsh-opencode-go-usage plugin.
// Publishes the "opencodeUsage" Cordis service (a Typert Remote) whose
// usage() method is callable from the browser settings page over the
// /api RPC carrier. Strict-mode dispatch is driven by typert.host.js,
// so no @Remote decorator is required here.
import z from "@deepseek-ai/schemastery";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

const DEFAULT_BASE_URL = "https://opencode.ai/zen/go/v1/usage";
const DEFAULT_TIMEOUT_MS = 15000;
const PROVIDER_ID = "opencode-go";
const DEFAULT_CREDENTIAL_REF = "OPENCODE_GO_API_KEY";

export const Config = z.object({
  baseUrl: z.string().default(DEFAULT_BASE_URL),
  timeoutMs: z.number().default(DEFAULT_TIMEOUT_MS),
});

/**
 * Discover the credential reference (environment-variable name) that the
 * opencode-go provider profile declares as its apiKeyEnv, so a renamed
 * credential keeps working without a plugin change. Falls back to the
 * conventional OPENCODE_GO_API_KEY.
 */
async function resolveCredentialRefName(ctx) {
  try {
    const llm = ctx.get("llm");
    if (llm && typeof llm.listConfigurableProviders === "function") {
      const entries = llm.listConfigurableProviders() ?? [];
      for (const entry of entries) {
        if (!entry || entry.provider !== PROVIDER_ID) continue;
        if (typeof entry.settingsNs !== "string") continue;
        const section = ctx.settings.get(settingsNamespace(entry.settingsNs));
        let profile = section;
        if (Array.isArray(entry.settingsPath)) {
          for (const part of entry.settingsPath) {
            if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
              profile = undefined;
              break;
            }
            profile = profile[part];
          }
        }
        if (
          profile
          && typeof profile === "object"
          && typeof profile.apiKeyEnv === "string"
          && profile.apiKeyEnv.length > 0
        ) {
          return profile.apiKeyEnv;
        }
      }
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_CREDENTIAL_REF;
}

/**
 * Resolve the OpenCode Go API key, most-trusted first:
 *   1. The credential reference the opencode-go provider profile declares
 *      (covers $DSH_HOME/.credentials.yaml and the process environment)
 *   2. The conventional DSH credentials / env reference OPENCODE_GO_API_KEY
 *   3. OpenCode's own auth.json: opencode-go (fallback opencode) type=api key
 */
async function resolveApiKey(ctx) {
  try {
    const refName = await resolveCredentialRefName(ctx);
    const cred = await ctx.credentials.resolve(credentialRef(refName));
    if (cred && cred.value) return cred.value;
  } catch {
    /* fall through */
  }
  try {
    const cred = await ctx.credentials.resolve(credentialRef(DEFAULT_CREDENTIAL_REF));
    if (cred && cred.value) return cred.value;
  } catch {
    /* fall through */
  }
  try {
    const authPath = join(homedir(), ".local", "share", "opencode", "auth.json");
    const raw = JSON.parse(await readFile(authPath, "utf8"));
    const entry = raw["opencode-go"] ?? raw["opencode"];
    if (entry && entry.type === "api" && typeof entry.key === "string" && entry.key.length > 0) {
      return entry.key;
    }
  } catch {
    /* fall through */
  }
  return undefined;
}

function pickWindow(w) {
  if (!w || typeof w !== "object") return null;
  const percent = typeof w.percent === "number" ? w.percent : Number(w.percent);
  return {
    status: typeof w.status === "string" ? w.status : null,
    percent: Number.isFinite(percent) ? percent : null,
    resetsAt: typeof w.resetsAt === "string" ? w.resetsAt : null,
  };
}

export class OpencodeUsageGateway extends TypertRemoteService {
  static inject = ["credentials", "settings"];
  static Config = Config;

  constructor(ctx, config) {
    super(ctx, "opencodeUsage");
    this.config = config ?? {};
  }

  async usage() {
    const baseUrl = this.config.baseUrl || DEFAULT_BASE_URL;
    const timeoutMs = this.config.timeoutMs || DEFAULT_TIMEOUT_MS;

    // Precondition: opencode-go must be present in Settings -> Models
    // (the llm-pi-ai provider namespace keyed by the route id "opencode-go").
    let configured = false;
    try {
      const pi = this.ctx.settings.get(settingsNamespace("llm-pi-ai"));
      configured = !!(pi && pi.providers && pi.providers["opencode-go"]);
    } catch {
      configured = false;
    }
    if (!configured) {
      return { configured: false, reason: "not-in-models", error: null, usage: null };
    }

    const apiKey = await resolveApiKey(this.ctx);
    if (!apiKey) {
      return { configured: false, reason: "no-api-key", error: null, usage: null };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(baseUrl, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: controller.signal,
      });
    } catch {
      return { configured: true, reason: null, error: "network", usage: null };
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401) {
      return { configured: true, reason: null, error: "unauthorized", usage: null };
    }
    if (!res.ok) {
      return { configured: true, reason: null, error: `http-${res.status}`, usage: null };
    }

    let body;
    try {
      body = await res.json();
    } catch {
      return { configured: true, reason: null, error: "bad-json", usage: null };
    }

    const usage = body && typeof body === "object" && body.usage ? body.usage : body;
    return {
      configured: true,
      reason: null,
      error: null,
      usage: {
        rolling: pickWindow(usage && usage.rolling),
        weekly: pickWindow(usage && usage.weekly),
        monthly: pickWindow(usage && usage.monthly),
      },
    };
  }
}

export default OpencodeUsageGateway;
