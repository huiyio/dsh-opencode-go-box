import { WorkerError } from "./errors.js";

const MAX_JSON_BYTES = 1024 * 1024;

function finitePercent(value) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(100, Math.max(0, number));
}

function validDateString(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function normalizeWindow(value) {
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
    throw new WorkerError("invalid_payload", "The upstream response is not an object", 502);
  }
  const source = payload.usage && typeof payload.usage === "object" ? payload.usage : payload;
  const usage = {
    rolling: normalizeWindow(source.rolling),
    weekly: normalizeWindow(source.weekly),
    monthly: normalizeWindow(source.monthly),
  };
  if (!usage.rolling && !usage.weekly && !usage.monthly) {
    throw new WorkerError("invalid_payload", "The upstream response contains no usage windows", 502);
  }
  return usage;
}

async function readJson(response, invalidCode, invalidMessage) {
  const declaredLength = Number(response.headers.get("Content-Length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    throw new WorkerError("upstream_response_too_large", "The upstream response is too large", 502);
  }

  if (!response.body) throw new WorkerError(invalidCode, invalidMessage, 502);
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new WorkerError("upstream_response_too_large", "The upstream response is too large", 502);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new WorkerError(invalidCode, invalidMessage, 502);
  }
}

async function fetchWithTimeout(url, options, timeoutMs, timeoutCode, unavailableCode, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new WorkerError(timeoutCode, `${label} timed out`, 504);
    }
    throw new WorkerError(unavailableCode, `Unable to reach ${label}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchUsage(apiKey, config) {
  const response = await fetchWithTimeout(config.usageUrl, {
    headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
  }, config.timeoutMs, "upstream_timeout", "upstream_unavailable", "the OpenCode Go endpoint");

  if (response.status === 401 || response.status === 403) {
    throw new WorkerError("upstream_unauthorized", "The OpenCode Go API key was rejected", 502);
  }
  if (!response.ok) {
    throw new WorkerError("upstream_http_error", `OpenCode Go returned HTTP ${response.status}`, 502);
  }
  const payload = await readJson(response, "invalid_json", "OpenCode Go returned invalid JSON");
  return { usage: normalizeUsage(payload), fetchedAt: new Date().toISOString() };
}

export async function listModels(config) {
  const response = await fetchWithTimeout(config.modelListUrl, {
    headers: { Accept: "application/json" },
  }, config.timeoutMs, "model_list_timeout", "model_list_unavailable", "the OpenCode Go model list");
  if (!response.ok) {
    throw new WorkerError("model_list_http_error", `OpenCode Go returned HTTP ${response.status} for the model list`, 502);
  }
  const payload = await readJson(response, "model_list_invalid_json", "The model list returned invalid JSON");
  const models = Array.isArray(payload?.data)
    ? payload.data.map((item) => item?.id).filter((id) => typeof id === "string" && id.length > 0)
    : [];
  if (models.length === 0) {
    throw new WorkerError("model_list_empty", "The OpenCode Go model list is empty", 502);
  }
  return [...new Set(models)];
}

export async function testModel(apiKey, model, config) {
  const selectedModel = typeof model === "string" ? model.trim() : "";
  if (!selectedModel || selectedModel.length > 200 || /[\r\n]/.test(selectedModel)) {
    throw new WorkerError("invalid_model", "Select a valid model");
  }
  const response = await fetchWithTimeout(config.modelTestUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [{ role: "user", content: "Reply with OK." }],
      max_tokens: 1,
      stream: false,
    }),
  }, config.timeoutMs, "model_timeout", "model_unavailable", "the OpenCode Go model endpoint");

  if (response.status === 401 || response.status === 403) {
    throw new WorkerError("model_unauthorized", "The OpenCode Go key cannot call this model", 502);
  }
  if (response.status === 429) {
    throw new WorkerError("model_rate_limited", "The model request was rate limited or the quota is exhausted", 429);
  }
  if (!response.ok) {
    throw new WorkerError("model_http_error", `OpenCode Go returned HTTP ${response.status} for the model test`, 502);
  }
  const payload = await readJson(response, "model_invalid_json", "The model endpoint returned invalid JSON");
  if (!Array.isArray(payload?.choices) || payload.choices.length === 0) {
    throw new WorkerError("model_invalid_payload", "The model endpoint returned no completion", 502);
  }
  return { model: selectedModel, completedAt: new Date().toISOString() };
}
