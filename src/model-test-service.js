export class ModelTestError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = "ModelTestError";
    this.code = code;
    this.status = status;
  }
}

export class ModelTestService {
  constructor({ apiKey, modelTestUrl, modelListUrl, model, timeoutMs, fetchImpl = fetch, now = Date.now }) {
    this.apiKey = apiKey;
    this.modelTestUrl = modelTestUrl;
    this.modelListUrl = modelListUrl || modelTestUrl.replace(/\/chat\/completions\/?$/, "/models");
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
    this.now = now;
  }

  async listModels() {
    let response;
    try {
      response = await this.fetchImpl(this.modelListUrl, { headers: { Accept: "application/json" } });
    } catch {
      throw new ModelTestError("model_list_unavailable", "Unable to load the OpenCode Go model list", 502);
    }
    if (!response.ok) {
      throw new ModelTestError("model_list_http_error", `OpenCode Go returned HTTP ${response.status} for the model list`, 502);
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new ModelTestError("model_list_invalid_json", "The model list returned invalid JSON", 502);
    }
    const models = Array.isArray(payload?.data)
      ? payload.data.map((item) => item?.id).filter((id) => typeof id === "string" && id.length > 0)
      : [];
    if (models.length === 0) throw new ModelTestError("model_list_empty", "The OpenCode Go model list is empty", 502);
    return [...new Set(models)];
  }

  async test() {
    if (!this.apiKey) throw new ModelTestError("not_configured", "The OpenCode Go API key is not configured", 503);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await this.fetchImpl(this.modelTestUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: "Reply with OK." }],
          max_tokens: 1,
          stream: false,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") throw new ModelTestError("model_timeout", "The model test request timed out", 504);
      throw new ModelTestError("model_unavailable", "Unable to reach the OpenCode Go model endpoint", 502);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 || response.status === 403) {
      throw new ModelTestError("model_unauthorized", "The OpenCode Go key cannot call this model", 502);
    }
    if (response.status === 429) {
      throw new ModelTestError("model_rate_limited", "The model request was rate limited or the quota is exhausted", 429);
    }
    if (!response.ok) {
      throw new ModelTestError("model_http_error", `OpenCode Go returned HTTP ${response.status} for the model test`, 502);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new ModelTestError("model_invalid_json", "The model endpoint returned invalid JSON", 502);
    }
    if (!Array.isArray(payload?.choices) || payload.choices.length === 0) {
      throw new ModelTestError("model_invalid_payload", "The model endpoint returned no completion", 502);
    }
    return {
      model: this.model,
      completedAt: new Date(this.now()).toISOString(),
    };
  }
}
