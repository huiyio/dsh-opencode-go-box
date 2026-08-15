export class UsageError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = "UsageError";
    this.code = code;
    this.status = status;
  }
}

function finitePercent(value) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(100, Math.max(0, number));
}

function validDateString(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

export function normalizeWindow(value) {
  if (!value || typeof value !== "object") return null;
  const percent = finitePercent(value.percent);
  return {
    status: typeof value.status === "string" ? value.status : null,
    percent,
    remainingPercent: percent === null ? null : Math.round((100 - percent) * 10) / 10,
    resetsAt: validDateString(value.resetsAt),
  };
}

export function normalizeUsage(payload) {
  if (!payload || typeof payload !== "object") {
    throw new UsageError("invalid_payload", "The upstream response is not an object");
  }
  const source = payload.usage && typeof payload.usage === "object" ? payload.usage : payload;
  const usage = {
    rolling: normalizeWindow(source.rolling),
    weekly: normalizeWindow(source.weekly),
    monthly: normalizeWindow(source.monthly),
  };
  if (!usage.rolling && !usage.weekly && !usage.monthly) {
    throw new UsageError("invalid_payload", "The upstream response contains no usage windows");
  }
  return usage;
}

export class UsageService {
  constructor({ apiKey, usageUrl, timeoutMs, cacheTtlMs, fetchImpl = fetch, now = Date.now }) {
    this.apiKey = apiKey;
    this.usageUrl = usageUrl;
    this.timeoutMs = timeoutMs;
    this.cacheTtlMs = cacheTtlMs;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.cache = null;
    this.inFlight = null;
  }

  async getUsage({ force = false } = {}) {
    const currentTime = this.now();
    if (!force && this.cache && currentTime < this.cache.expiresAt) {
      return { ...this.cache.value, cached: true };
    }
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.#fetchUsage()
      .then((value) => {
        this.cache = {
          value,
          expiresAt: this.now() + this.cacheTtlMs,
        };
        return { ...value, cached: false };
      })
      .finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  }

  async #fetchUsage() {
    if (!this.apiKey) {
      throw new UsageError("not_configured", "OPENCODE_GO_API_KEY is not configured", 503);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await this.fetchImpl(this.usageUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new UsageError("upstream_timeout", "The OpenCode Go request timed out", 504);
      }
      throw new UsageError("upstream_unavailable", "Unable to reach the OpenCode Go endpoint", 502);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 || response.status === 403) {
      throw new UsageError("upstream_unauthorized", "The OpenCode Go API key was rejected", 502);
    }
    if (!response.ok) {
      throw new UsageError("upstream_http_error", `OpenCode Go returned HTTP ${response.status}`, 502);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new UsageError("invalid_json", "OpenCode Go returned invalid JSON", 502);
    }

    return {
      usage: normalizeUsage(payload),
      fetchedAt: new Date(this.now()).toISOString(),
    };
  }
}
