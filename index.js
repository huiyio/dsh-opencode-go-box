// Host half of the dsh-opencode-go-usage plugin.
// Publishes the "opencodeUsage" Cordis service (a Typert Remote) with three
// methods callable from the browser over the /api RPC carrier:
//   usage()                 — the official quota windows (5h / weekly / monthly)
//   dshUsage()              — per-session token usage from DeepSeek Harness
//                             session persistence (sessions on opencode-go)
//   dshSessionMessages(id)  — per-step (per model call) usage of one session
// Strict-mode dispatch is driven by typert.host.js, so no @Remote decorator
// is required here.
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
const DEFAULT_WARN_PERCENT = 60;
const DEFAULT_DANGER_PERCENT = 85;
const MAX_SESSIONS = 30;
const MAX_STEPS_PER_SESSION = 400;

export const Config = z.object({
  baseUrl: z.string().default(DEFAULT_BASE_URL),
  timeoutMs: z.number().default(DEFAULT_TIMEOUT_MS),
  warnPercent: z.number().default(DEFAULT_WARN_PERCENT),
  dangerPercent: z.number().default(DEFAULT_DANGER_PERCENT),
  maxSessions: z.number().default(MAX_SESSIONS),
});

function asString(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

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

/** Session-level usage fold from one raw DSH session log. */
function foldSessionLog(sessionId, createdAt, events) {
  let provider = null;
  let model = null;
  let messageCount = 0;
  const totals = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
  };
  const steps = [];
  for (const event of events) {
    if (event === null || typeof event !== "object") continue;
    if (event.type === "request/header") {
      const config = event.header && typeof event.header === "object" ? event.header.config : undefined;
      if (config && typeof config === "object") {
        const p = asString(config.provider);
        if (p !== undefined) provider = p;
        const m = asString(config.model);
        if (m !== undefined) model = m;
      }
      continue;
    }
    if (event.type !== "assistant/message") continue;
    const usage = event.usage;
    if (usage === undefined || usage === null || typeof usage !== "object") continue;
    const step = {
      turn: typeof event.turn === "number" ? event.turn : 0,
      step: typeof event.step === "number" ? event.step : 0,
      inputTokens: Number(usage.inputTokens) || 0,
      outputTokens: Number(usage.outputTokens) || 0,
      cacheReadTokens: Number(usage.cacheReadTokens) || 0,
      cacheWriteTokens: Number(usage.cacheWriteTokens) || 0,
      reasoningTokens: Number(usage.reasoningTokens) || 0,
    };
    messageCount += 1;
    totals.inputTokens += step.inputTokens;
    totals.outputTokens += step.outputTokens;
    totals.cacheReadTokens += step.cacheReadTokens;
    totals.cacheWriteTokens += step.cacheWriteTokens;
    totals.reasoningTokens += step.reasoningTokens;
    if (steps.length < MAX_STEPS_PER_SESSION) steps.push(step);
  }
  return {
    sessionId: String(sessionId),
    provider,
    model,
    createdAt: new Date(createdAt).toISOString(),
    messageCount,
    totals,
    steps,
  };
}

export class OpencodeUsageGateway extends TypertRemoteService {
  static inject = ["credentials", "settings", "sessionQuery"];
  static Config = Config;

  constructor(ctx, config) {
    super(ctx, "opencodeUsage");
    this.config = config ?? {};
  }

  async usage() {
    const baseUrl = this.config.baseUrl || DEFAULT_BASE_URL;
    const timeoutMs = this.config.timeoutMs || DEFAULT_TIMEOUT_MS;
    const warn = typeof this.config.warnPercent === "number" ? this.config.warnPercent : DEFAULT_WARN_PERCENT;
    const danger = typeof this.config.dangerPercent === "number" ? this.config.dangerPercent : DEFAULT_DANGER_PERCENT;

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
      return { configured: false, reason: "not-in-models", error: null, usage: null, thresholds: null, limits: null };
    }

    const apiKey = await resolveApiKey(this.ctx);
    if (!apiKey) {
      return { configured: false, reason: "no-api-key", error: null, usage: null, thresholds: null, limits: null };
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
      return { configured: true, reason: null, error: "network", usage: null, thresholds: null, limits: null };
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401) {
      return { configured: true, reason: null, error: "unauthorized", usage: null, thresholds: null, limits: null };
    }
    if (!res.ok) {
      return { configured: true, reason: null, error: `http-${res.status}`, usage: null, thresholds: null, limits: null };
    }

    let body;
    try {
      body = await res.json();
    } catch {
      return { configured: true, reason: null, error: "bad-json", usage: null, thresholds: null, limits: null };
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
      thresholds: { warn, danger },
      // Reference plan limits for context only; the endpoint reports
      // percent, and these can drift with plan changes.
      limits: { rolling: "$12", weekly: "$30", monthly: "$60" },
    };
  }

  /**
   * Aggregate per-session usage from DeepSeek Harness session persistence.
   * Every DSH session logs per-step token accounting on its
   * `assistant/message` events, so this works for every deployment —
   * no local OpenCode client required. Only sessions whose latest request
   * header used the opencode-go provider are returned.
   */
  async dshUsage() {
    const query = this.ctx.sessionQuery;
    const maxSessions = typeof this.config.maxSessions === "number" && this.config.maxSessions > 0
      ? Math.min(this.config.maxSessions, 100)
      : MAX_SESSIONS;

    let records;
    try {
      records = await query.listSessions();
    } catch (error) {
      return {
        ok: false,
        error: "list-failed",
        message: "读取 DSH 会话列表失败：" + String(error && error.message ? error.message : error),
        scanned: 0,
        totals: null,
        sessions: [],
      };
    }

    const sorted = [...records]
      .filter((record) => record && record.header && typeof record.header.id === "string")
      .sort((a, b) => (b.header.createdAt || 0) - (a.header.createdAt || 0))
      .slice(0, maxSessions);

    const sessions = [];
    for (const record of sorted) {
      let snapshot;
      try {
        snapshot = await query.readSession(record.header.id);
      } catch {
        continue;
      }
      const folded = foldSessionLog(record.header.id, record.header.createdAt || 0, snapshot.events || []);
      if (folded.provider !== PROVIDER_ID) continue;
      let title = null;
      try {
        const titleSnapshot = await query.readTitle(record.header.id);
        title = titleSnapshot && typeof titleSnapshot.title === "string" ? titleSnapshot.title : null;
      } catch {
        /* title is best-effort */
      }
      sessions.push({
        ...folded,
        title,
        cwd: asString(record.header.cwd) ?? null,
        agentPreset: asString(record.header.agentPreset) ?? null,
      });
    }

    const totals = sessions.reduce(
      (acc, s) => ({
        inputTokens: acc.inputTokens + s.totals.inputTokens,
        outputTokens: acc.outputTokens + s.totals.outputTokens,
        cacheReadTokens: acc.cacheReadTokens + s.totals.cacheReadTokens,
        cacheWriteTokens: acc.cacheWriteTokens + s.totals.cacheWriteTokens,
        reasoningTokens: acc.reasoningTokens + s.totals.reasoningTokens,
      }),
      { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 },
    );

    return {
      ok: true,
      error: null,
      message: null,
      scanned: sorted.length,
      totals: sessions.length > 0 ? totals : null,
      sessions,
    };
  }

  /** Per-step (per model call) usage of one DSH session. */
  async dshSessionMessages(args) {
    const sessionId = args && typeof args.sessionId === "string" ? args.sessionId : undefined;
    if (sessionId === undefined) {
      return { ok: false, error: "missing-session", message: "缺少会话 ID。", sessionId: null, model: null, steps: [] };
    }
    try {
      const snapshot = await this.ctx.sessionQuery.readSession(sessionId);
      const folded = foldSessionLog(sessionId, snapshot.session && snapshot.session.createdAt || 0, snapshot.events || []);
      return {
        ok: true,
        error: null,
        message: null,
        sessionId,
        model: folded.model,
        provider: folded.provider,
        createdAt: folded.createdAt,
        steps: folded.steps,
      };
    } catch (error) {
      return {
        ok: false,
        error: "read-failed",
        message: "读取会话明细失败：" + String(error && error.message ? error.message : error),
        sessionId,
        model: null,
        steps: [],
      };
    }
  }
}

export default OpencodeUsageGateway;
