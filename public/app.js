const copy = {
  zh: {
    eyebrow: "实时额度",
    title: "使用情况",
    loading: "正在读取",
    current: "数据正常",
    failed: "读取失败",
    rolling: "5 小时滚动",
    weekly: "每周",
    monthly: "每月",
    rollingPeriod: "5小时",
    weeklyPeriod: "7天",
    monthlyPeriod: "30天",
    remaining: "剩余",
    used: "已使用",
    reset: "重置",
    ready: "正常",
    unknown: "暂无数据",
    cached: "缓存数据",
    live: "实时数据",
    errorTitle: "无法获取额度",
    notConfigured: "容器尚未配置 OPENCODE_GO_API_KEY。",
    unauthorized: "OpenCode Go API Key 无效或已过期。",
    timeout: "OpenCode Go 请求超时。",
    unavailable: "暂时无法连接 OpenCode Go。",
    genericError: "服务暂时不可用，请稍后重试。",
    refresh: "刷新",
    justNow: "刚刚",
    days: "天",
    account: "账号",
    manageKeys: "Key 管理",
    noAccounts: "还没有可用账号，请先在后台添加 Key。",
  },
  en: {
    eyebrow: "Live quota",
    title: "Usage overview",
    loading: "Loading",
    current: "Up to date",
    failed: "Unavailable",
    rolling: "5-hour rolling",
    weekly: "Weekly",
    monthly: "Monthly",
    rollingPeriod: "5 hours",
    weeklyPeriod: "7 days",
    monthlyPeriod: "30 days",
    remaining: "remaining",
    used: "Used",
    reset: "Resets",
    ready: "Available",
    unknown: "No data",
    cached: "Cached data",
    live: "Live data",
    errorTitle: "Unable to load quota",
    notConfigured: "OPENCODE_GO_API_KEY is not configured in the container.",
    unauthorized: "The OpenCode Go API key is invalid or expired.",
    timeout: "The OpenCode Go request timed out.",
    unavailable: "OpenCode Go is currently unreachable.",
    genericError: "The service is temporarily unavailable. Try again later.",
    refresh: "Refresh",
    justNow: "just now",
    days: "d",
    account: "Account",
    manageKeys: "Manage keys",
    noAccounts: "No active accounts. Add a key in the admin page first.",
  },
};

const cards = new Map(
  [...document.querySelectorAll("[data-window]")].map((element) => [element.dataset.window, element]),
);
const refreshButton = document.querySelector("#refresh-button");
const statusDot = document.querySelector("#status-dot");
const statusLabel = document.querySelector("#status-label");
const updatedAt = document.querySelector("#updated-at");
const errorBanner = document.querySelector("#error-banner");
const errorTitle = document.querySelector("#error-title");
const errorMessage = document.querySelector("#error-message");
const cacheLabel = document.querySelector("#cache-label");
const accountSelect = document.querySelector("#account-select");
const accountKey = document.querySelector("#account-key");
const adminLink = document.querySelector("#admin-link");

function storedLocale() {
  try {
    return localStorage.getItem("opencode-go-locale") === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

let locale = storedLocale();
let latestPayload = null;
let refreshTimer = null;
let loading = false;
let selectedAccountId = null;

function t(key) {
  return copy[locale][key] || key;
}

function setLocale(nextLocale) {
  locale = nextLocale === "en" ? "en" : "zh";
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  document.title = locale === "zh" ? "OpenCode Go 额度" : "OpenCode Go quota";
  try {
    localStorage.setItem("opencode-go-locale", locale);
  } catch {
    // Language persistence is optional when browser storage is unavailable.
  }
  document.querySelectorAll("[data-copy]").forEach((element) => {
    element.textContent = t(element.dataset.copy);
  });
  document.querySelectorAll("[data-locale]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.locale === locale));
  });
  refreshButton.title = t("refresh");
  refreshButton.setAttribute("aria-label", t("refresh"));
  adminLink.title = t("manageKeys");
  adminLink.setAttribute("aria-label", t("manageKeys"));
  if (latestPayload) render(latestPayload);
}

function formatPercent(value) {
  if (typeof value !== "number") return "--";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCountdown(value) {
  if (!value) return "--";
  const difference = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(difference)) return "--";
  if (difference <= 0) return t("justNow");
  const totalMinutes = Math.ceil(difference / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return locale === "zh" ? `${days}${t("days")} ${hours}小时` : `${days}${t("days")} ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

function cardLevel(percent, thresholds) {
  if (typeof percent !== "number") return "unknown";
  if (percent >= thresholds.danger) return "danger";
  if (percent >= thresholds.warn) return "warn";
  return "ok";
}

function renderCard(card, value, thresholds) {
  const remaining = card.querySelector('[data-role="remaining"]');
  const used = card.querySelector('[data-role="used"]');
  const progress = card.querySelector('[data-role="progress"]');
  const progressTrack = card.querySelector(".progress-track");
  const countdown = card.querySelector('[data-role="countdown"]');
  const resetAt = card.querySelector('[data-role="reset-at"]');
  const windowStatus = card.querySelector('[data-role="window-status"]');

  const percent = value?.percent;
  const level = cardLevel(percent, thresholds);
  card.classList.toggle("is-warn", level === "warn");
  card.classList.toggle("is-danger", level === "danger");
  remaining.textContent = formatPercent(value?.remainingPercent);
  used.textContent = formatPercent(percent);
  progress.style.width = `${typeof percent === "number" ? percent : 0}%`;
  progressTrack.setAttribute("aria-valuenow", String(typeof percent === "number" ? percent : 0));
  countdown.textContent = formatCountdown(value?.resetsAt);
  resetAt.textContent = formatDate(value?.resetsAt);
  resetAt.dateTime = value?.resetsAt || "";
  windowStatus.textContent = value ? t("ready") : t("unknown");
}

function render(payload) {
  latestPayload = payload;
  const thresholds = payload.thresholds || { warn: 60, danger: 85 };
  for (const [name, card] of cards) renderCard(card, payload.usage?.[name], thresholds);

  statusDot.className = "status-dot";
  statusLabel.textContent = t("current");
  updatedAt.textContent = formatDate(payload.fetchedAt);
  cacheLabel.textContent = payload.cached ? t("cached") : t("live");
  errorBanner.hidden = true;
}

function updateCountdowns() {
  if (!latestPayload) return;
  for (const [name, card] of cards) {
    const value = latestPayload.usage?.[name];
    card.querySelector('[data-role="countdown"]').textContent = formatCountdown(value?.resetsAt);
  }
}

function translatedError(code) {
  if (code === "no_accounts") return t("noAccounts");
  if (code === "not_configured") return t("notConfigured");
  if (code === "upstream_unauthorized") return t("unauthorized");
  if (code === "upstream_timeout") return t("timeout");
  if (code === "upstream_unavailable" || code === "upstream_http_error") return t("unavailable");
  return t("genericError");
}

function showError(error) {
  statusDot.className = "status-dot is-error";
  statusLabel.textContent = t("failed");
  errorTitle.textContent = t("errorTitle");
  errorMessage.textContent = translatedError(error?.code);
  errorBanner.hidden = false;
  cacheLabel.textContent = "";
}

function scheduleRefresh(intervalMs) {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = window.setInterval(() => loadUsage(false), Math.max(10000, intervalMs || 30000));
}

async function loadUsage(force) {
  if (loading) return;
  loading = true;
  refreshButton.disabled = true;
  refreshButton.classList.add("is-loading");
  if (!latestPayload) {
    statusDot.className = "status-dot is-loading";
    statusLabel.textContent = t("loading");
  }

  try {
    if (!selectedAccountId) throw { code: "no_accounts" };
    const parameters = new URLSearchParams({ account: selectedAccountId });
    if (force) parameters.set("refresh", "1");
    const response = await fetch(`/api/usage?${parameters}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw payload?.error || { code: "invalid_response" };
    render(payload);
    scheduleRefresh(payload.refreshIntervalMs);
  } catch (error) {
    showError(error);
    scheduleRefresh(latestPayload?.refreshIntervalMs || 30000);
  } finally {
    loading = false;
    refreshButton.disabled = false;
    refreshButton.classList.remove("is-loading");
  }
}

function storedAccountId() {
  try {
    return localStorage.getItem("opencode-go-account");
  } catch {
    return null;
  }
}

function rememberAccountId(id) {
  try {
    localStorage.setItem("opencode-go-account", id);
  } catch {
    // Account selection persistence is optional.
  }
}

async function loadAccounts() {
  try {
    const response = await fetch("/api/accounts", { headers: { Accept: "application/json" }, cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw payload?.error || { code: "invalid_response" };
    accountSelect.replaceChildren();
    for (const account of payload.accounts) {
      const option = document.createElement("option");
      option.value = account.id;
      option.textContent = account.label;
      option.dataset.maskedKey = account.maskedKey;
      accountSelect.append(option);
    }
    const preferred = storedAccountId();
    selectedAccountId = payload.accounts.some((account) => account.id === preferred)
      ? preferred
      : payload.accounts[0]?.id || null;
    accountSelect.disabled = payload.accounts.length < 2;
    if (selectedAccountId) accountSelect.value = selectedAccountId;
    accountKey.textContent = accountSelect.selectedOptions[0]?.dataset.maskedKey || "--";
    return Boolean(selectedAccountId);
  } catch (error) {
    showError(error);
    return false;
  }
}

document.querySelectorAll("[data-locale]").forEach((button) => {
  button.addEventListener("click", () => setLocale(button.dataset.locale));
});
refreshButton.addEventListener("click", () => loadUsage(true));
accountSelect.addEventListener("change", () => {
  selectedAccountId = accountSelect.value;
  rememberAccountId(selectedAccountId);
  accountKey.textContent = accountSelect.selectedOptions[0]?.dataset.maskedKey || "--";
  latestPayload = null;
  loadUsage(false);
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") loadUsage(false);
});
window.setInterval(() => {
  updateCountdowns();
}, 30000);

setLocale(locale);
loadAccounts().then((hasAccounts) => {
  if (hasAccounts) loadUsage(false);
  else showError({ code: "no_accounts" });
});
