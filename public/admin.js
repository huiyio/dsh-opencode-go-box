const copy = {
  zh: {
    eyebrow: "Key 资产控制",
    title: "Key 资产",
    subtitle: "集中观测 Key 的额度、生命周期和真实模型探测结果。",
    addTitle: "录入 Key 资产",
    label: "账号名称",
    apiKey: "API Key",
    add: "添加",
    accounts: "Key 资产节点",
    accountCount: "数量",
    backup: "下载备份",
    restore: "恢复备份",
    restoreConfirm: "恢复后会覆盖当前所有账号和用户，确定继续吗？",
    restoreDone: "账号和用户已恢复。",
    invalidBackup: "备份文件无效，或与当前部署的加密主密钥不匹配。",
    autoRefresh: "自动刷新",
    seconds: "秒",
    minutes: "分钟",
    encrypted: "AES-256-GCM 加密存储",
    editTitle: "编辑 Key 资产",
    replacementKey: "替换 Key（留空则不修改）",
    enabled: "启用",
    disabled: "已停用",
    environment: "环境变量",
    stored: "加密存储",
    edit: "编辑",
    disable: "停用",
    enable: "启用",
    remove: "删除",
    cancel: "取消",
    save: "保存",
    back: "额度观测",
    manageUsers: "访问授权",
    logout: "退出登录",
    empty: "还没有保存的 Key",
    errorTitle: "操作失败",
    adminDisabled: "请先配置 WEB_USERNAME、WEB_PASSWORD 和 KEY_ENCRYPTION_SECRET。",
    duplicate: "这个 Key 已经存在。",
    invalid: "请检查账号名称和 Key。",
    generic: "服务暂时不可用，请稍后重试。",
    accountDisabled: "账号已停用。",
    accountNotStarted: "账号尚未到开通日期。",
    accountExpired: "账号已过期。",
    upstreamUnauthorized: "上游 Key 无效或已过期。",
    upstreamTimeout: "上游请求超时。",
    upstreamUnavailable: "暂时无法连接上游服务。",
    confirmRemove: "确定删除账号“{label}”？此操作无法撤销。",
    refreshAll: "刷新全部额度",
    refreshKey: "刷新额度",
    refreshingKey: "刷新中",
    remainingQuota: "剩余",
    reset: "重置",
    quotaFailed: "查询失败",
    quotaFailedReason: "原因",
    remaining: "剩余",
    used: "已用",
    rollingPeriod: "5小时",
    weeklyPeriod: "7天",
    monthlyPeriod: "30天",
    testKey: "测试模型",
    testingKey: "模型测试中",
    testPassed: "模型请求成功",
    testDepleted: "模型请求被限流",
    testInvalid: "Key 无效",
    testFailed: "探测失败",
    testQuotaDepleted: "有额度窗口已耗尽",
    testCompleted: "测试完成",
    testNoResult: "尚未测试",
    testDialogTitle: "选择模型并发送真实请求",
    testModelLabel: "测试模型",
    startModelTest: "开始真实测试",
    modelListFailed: "模型列表加载失败，请稍后重试。",
    addedAt: "添加时间",
    startsAt: "开通日期",
    expiresAt: "结束日期",
    autoDeleteMonth: "一个月到期自动删除",
    autoDeleteEnabled: "到期自动删除",
    pending: "待开通",
    expired: "已到期",
    active: "当前可用",
    lifecycle: "生命周期",
    lifecycleStarted: "已开通",
    lifecycleRemaining: "剩余 {days} 天",
    lifecycleNoExpiry: "未设置结束日期",
    lifecycleOngoing: "持续有效",
    lifecycleNoDates: "未设置生命周期",
    lifecycleAutoDelete: "到期自动删除",
    sourceLabel: "来源",
    visibleCount: "显示",
    filteredEmpty: "没有符合筛选条件的 Key 资产",
    searchPlaceholder: "搜索账号或 Key 尾号",
    usersTitle: "用户管理",
    usersSubtitle: "用户只能查看已授权的账号额度，未授权时看不到任何账号数据",
    username: "用户名",
    password: "登录密码",
    replacementPassword: "重置密码（留空则不修改）",
    permissions: "可查看的账号",
    addUser: "添加用户",
    editUser: "编辑用户",
    noPermissions: "未授权任何账号",
    noPermissionOptions: "当前没有可授权的账号",
    usersEmpty: "还没有创建用户",
    userCount: "数量",
    confirmRemoveUser: "确定删除用户“{username}”？删除后该用户会立即退出登录。",
    duplicateUser: "这个用户名已经存在。",
    invalidUser: "请检查用户名、密码和账号授权。",
  },
  en: {
    eyebrow: "Key asset control",
    title: "OpenCode Go Keys",
    subtitle: "Observe quota windows, lifecycle, and real model probes for every key",
    addTitle: "Add key",
    label: "Account label",
    apiKey: "API key",
    add: "Add",
    accounts: "Accounts",
    accountCount: "Count",
    backup: "Download backup",
    restore: "Restore backup",
    restoreConfirm: "Restoring will replace all current accounts and users. Continue?",
    restoreDone: "Accounts and users restored.",
    invalidBackup: "The backup is invalid or uses a different encryption secret.",
    autoRefresh: "Auto refresh",
    seconds: "seconds",
    minutes: "minutes",
    encrypted: "AES-256-GCM encrypted storage",
    editTitle: "Edit account",
    replacementKey: "Replacement key (leave empty to keep current)",
    enabled: "Enabled",
    disabled: "Disabled",
    environment: "Environment",
    stored: "Encrypted store",
    edit: "Edit",
    disable: "Disable",
    enable: "Enable",
    remove: "Delete",
    cancel: "Cancel",
    save: "Save",
    back: "Quota view",
    manageUsers: "Access authorization",
    logout: "Sign out",
    empty: "No stored keys yet",
    errorTitle: "Operation failed",
    adminDisabled: "Configure WEB_USERNAME, WEB_PASSWORD, and KEY_ENCRYPTION_SECRET first.",
    duplicate: "This key already exists.",
    invalid: "Check the account label and API key.",
    generic: "The service is temporarily unavailable. Try again later.",
    accountDisabled: "The account is disabled.",
    accountNotStarted: "The account has not reached its start date.",
    accountExpired: "The account has expired.",
    upstreamUnauthorized: "The upstream key is invalid or expired.",
    upstreamTimeout: "The upstream request timed out.",
    upstreamUnavailable: "The upstream service is currently unreachable.",
    confirmRemove: "Delete account “{label}”? This cannot be undone.",
    refreshAll: "Refresh all quotas",
    refreshKey: "Refresh quota",
    refreshingKey: "Refreshing",
    remainingQuota: "Remaining",
    reset: "Resets",
    quotaFailed: "Query failed",
    quotaFailedReason: "Reason",
    remaining: "Remaining",
    used: "Used",
    rollingPeriod: "5 hours",
    weeklyPeriod: "7 days",
    monthlyPeriod: "30 days",
    testKey: "Test model",
    testingKey: "Testing model",
    testPassed: "Model available",
    testDepleted: "Model unavailable · quota exhausted",
    testInvalid: "Key invalid",
    testFailed: "Test failed",
    testCompleted: "Test completed",
    testNoResult: "Not tested",
    testDialogTitle: "Choose a test model",
    testModelLabel: "Model",
    startModelTest: "Start test",
    modelListFailed: "Unable to load the model list. Try again later.",
    addedAt: "Added",
    startsAt: "Starts",
    expiresAt: "Ends",
    autoDeleteMonth: "Delete automatically after one month",
    autoDeleteEnabled: "Deletes automatically at expiry",
    pending: "Pending",
    expired: "Expired",
    active: "Available",
    lifecycle: "Lifecycle",
    lifecycleStarted: "Started",
    lifecycleRemaining: "{days} days left",
    lifecycleNoExpiry: "No end date",
    lifecycleOngoing: "Active without an end date",
    lifecycleNoDates: "No lifecycle dates",
    lifecycleAutoDelete: "Auto-delete at expiry",
    sourceLabel: "Source",
    visibleCount: "Showing",
    filteredEmpty: "No key assets match this filter",
    searchPlaceholder: "Search account or key suffix",
    usersTitle: "User management",
    usersSubtitle: "Users can only view assigned accounts; unassigned users receive no account data",
    username: "Username",
    password: "Login password",
    replacementPassword: "Reset password (leave empty to keep current)",
    permissions: "Visible accounts",
    addUser: "Add user",
    editUser: "Edit user",
    noPermissions: "No accounts assigned",
    noPermissionOptions: "No accounts are available to assign",
    usersEmpty: "No users yet",
    userCount: "Count",
    confirmRemoveUser: "Delete user “{username}”? Their active session will stop working immediately.",
    duplicateUser: "This username already exists.",
    invalidUser: "Check the username, password, and account permissions.",
  },
};

const addForm = document.querySelector("#add-form");
const addButton = document.querySelector("#add-button");
const accountList = document.querySelector("#account-list");
const accountCount = document.querySelector("#account-count");
const accountSearch = document.querySelector("#account-search");
const accountFilter = document.querySelector("#account-filter");
const keySummaryTotal = document.querySelector("#key-summary-total");
const keySummaryActive = document.querySelector("#key-summary-active");
const keySummaryRisk = document.querySelector("#key-summary-risk");
const keySummaryAttention = document.querySelector("#key-summary-attention");
const keySummaryTested = document.querySelector("#key-summary-tested");
const errorBanner = document.querySelector("#admin-error");
const errorTitle = document.querySelector("#admin-error-title");
const errorMessage = document.querySelector("#admin-error-message");
const dashboardLink = document.querySelector("#dashboard-link");
const usersLink = document.querySelector("#users-link");
const logoutButton = document.querySelector("#logout-button");
const editDialog = document.querySelector("#edit-dialog");
const editForm = document.querySelector("#edit-form");
const editLabel = document.querySelector("#edit-label");
const editKey = document.querySelector("#edit-key");
const accountStartsAt = document.querySelector("#account-starts-at");
const accountExpiresAt = document.querySelector("#account-expires-at");
const accountAutoDelete = document.querySelector("#account-auto-delete");
const editStartsAt = document.querySelector("#edit-starts-at");
const editExpiresAt = document.querySelector("#edit-expires-at");
const editAutoDelete = document.querySelector("#edit-auto-delete");
const editEnabled = document.querySelector("#edit-enabled");
const editError = document.querySelector("#edit-error");
const refreshAllButton = document.querySelector("#refresh-all");
const backupButton = document.querySelector("#backup-button");
const restoreButton = document.querySelector("#restore-button");
const restoreInput = document.querySelector("#restore-input");
const autoRefreshForm = document.querySelector("#auto-refresh-form");
const autoRefreshEnabled = document.querySelector("#auto-refresh-enabled");
const autoRefreshValue = document.querySelector("#auto-refresh-value");
const autoRefreshUnit = document.querySelector("#auto-refresh-unit");
const testDialog = document.querySelector("#test-dialog");
const testForm = document.querySelector("#test-form");
const testModelError = document.querySelector("#test-model-error");
const testModelSelect = document.querySelector("#test-model-select");
const testSubmit = document.querySelector("#test-submit");
let locale = readStoredLocale();
let accounts = [];
let editingId = null;
let testAccountTarget = null;
let busy = false;
let usageGeneration = 0;
let usageRequestSequence = 0;
let autoRefreshTimer = null;
let usageLoadPromise = null;
const usageByAccount = new Map();
const usageRequestByAccount = new Map();
const refreshingAccounts = new Set();
const testingAccounts = new Set();
const testResults = new Map();

const AUTO_REFRESH_STORAGE_KEY = "opencode-go-admin-refresh";
const MIN_AUTO_REFRESH_MS = 10000;

function readStoredLocale() {
  try {
    return localStorage.getItem("opencode-go-locale") === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

function t(key) {
  return copy[locale][key] || key;
}

function setLocale(nextLocale) {
  locale = nextLocale === "en" ? "en" : "zh";
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  document.title = locale === "zh" ? "OpenCode Go Key 资产" : "OpenCode Go key assets";
  try {
    localStorage.setItem("opencode-go-locale", locale);
  } catch {
    // Language persistence is optional.
  }
  document.querySelectorAll("[data-copy]").forEach((element) => {
    element.textContent = t(element.dataset.copy);
  });
  document.querySelectorAll("[data-locale]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.locale === locale));
  });
  dashboardLink.title = t("back");
  dashboardLink.setAttribute("aria-label", t("back"));
  usersLink.title = t("manageUsers");
  usersLink.setAttribute("aria-label", t("manageUsers"));
  logoutButton.title = t("logout");
  logoutButton.setAttribute("aria-label", t("logout"));
  refreshAllButton.title = t("refreshAll");
  refreshAllButton.setAttribute("aria-label", t("refreshAll"));
  backupButton.title = t("backup");
  backupButton.setAttribute("aria-label", t("backup"));
  restoreButton.title = t("restore");
  restoreButton.setAttribute("aria-label", t("restore"));
  if (accountSearch) accountSearch.placeholder = t("searchPlaceholder");
  renderAccounts();
}

function readAutoRefreshSetting() {
  const fallback = { enabled: true, value: 30, unit: "seconds" };
  try {
    const stored = JSON.parse(localStorage.getItem(AUTO_REFRESH_STORAGE_KEY) || "null");
    if (!stored || typeof stored !== "object") return fallback;
    const unit = stored.unit === "minutes" ? "minutes" : "seconds";
    const rawValue = Number(stored.value);
    const minimum = unit === "minutes" ? 1 : 10;
    return {
      enabled: stored.enabled !== false,
      value: Number.isInteger(rawValue) ? Math.min(1440, Math.max(minimum, rawValue)) : fallback.value,
      unit,
    };
  } catch {
    return fallback;
  }
}

function autoRefreshMilliseconds() {
  const value = Number(autoRefreshValue.value);
  const multiplier = autoRefreshUnit.value === "minutes" ? 60000 : 1000;
  if (!Number.isInteger(value) || value < 1) return MIN_AUTO_REFRESH_MS;
  return Math.max(MIN_AUTO_REFRESH_MS, value * multiplier);
}

function saveAutoRefreshSetting() {
  try {
    localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, JSON.stringify({
      enabled: autoRefreshEnabled.checked,
      value: Number(autoRefreshValue.value),
      unit: autoRefreshUnit.value,
    }));
  } catch {
    // Refresh preferences are optional when browser storage is unavailable.
  }
}

function scheduleAutoRefresh() {
  if (autoRefreshTimer) window.clearTimeout(autoRefreshTimer);
  autoRefreshTimer = null;
  if (!autoRefreshEnabled.checked) return;
  autoRefreshTimer = window.setTimeout(async () => {
    await loadAccountUsages(true);
    scheduleAutoRefresh();
  }, autoRefreshMilliseconds());
}

function applyAutoRefreshSetting() {
  const unit = autoRefreshUnit.value === "minutes" ? "minutes" : "seconds";
  const minimum = unit === "minutes" ? 1 : 10;
  const value = Number(autoRefreshValue.value);
  autoRefreshValue.value = String(Number.isInteger(value) ? Math.min(1440, Math.max(minimum, value)) : minimum);
  autoRefreshValue.min = String(minimum);
  autoRefreshEnabled.checked = Boolean(autoRefreshEnabled.checked);
  autoRefreshValue.disabled = !autoRefreshEnabled.checked;
  autoRefreshUnit.disabled = !autoRefreshEnabled.checked;
  saveAutoRefreshSetting();
  scheduleAutoRefresh();
}

function errorText(code) {
  if (code === "admin_disabled" || code === "key_store_disabled" || code === "user_store_disabled") return t("adminDisabled");
  if (code === "duplicate_key") return t("duplicate");
  if (code === "invalid_backup") return t("invalidBackup");
  if (code === "invalid_lifecycle") return t("invalid");
  if (code === "account_disabled") return t("accountDisabled");
  if (code === "account_not_started") return t("accountNotStarted");
  if (code === "account_expired") return t("accountExpired");
  if (code === "upstream_unauthorized") return t("upstreamUnauthorized");
  if (code === "upstream_timeout") return t("upstreamTimeout");
  if (code === "upstream_unavailable" || code === "upstream_http_error") return t("upstreamUnavailable");
  if (code?.startsWith("invalid_")) return t("invalid");
  return t("generic");
}

function showError(error) {
  if (editDialog.open) {
    editError.textContent = errorText(error?.code);
    editError.hidden = false;
    return;
  }
  errorTitle.textContent = t("errorTitle");
  errorMessage.textContent = errorText(error?.code);
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
  editError.hidden = true;
  editError.textContent = "";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw payload?.error || { code: "invalid_response" };
  return payload;
}

function actionButton(label, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `command-button ${className}`.trim();
  button.textContent = label;
  button.disabled = busy;
  button.addEventListener("click", handler);
  return button;
}

function beginUsageRequest(accountId) {
  const requestId = ++usageRequestSequence;
  usageRequestByAccount.set(accountId, requestId);
  return requestId;
}

function isCurrentUsageRequest(accountId, requestId) {
  return usageRequestByAccount.get(accountId) === requestId;
}

function formatRemaining(value) {
  if (typeof value !== "number") return "--";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function formatAccountDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function todayDate() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addCalendarMonth(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)))
    .toISOString().slice(0, 10);
}

function syncAutoDelete(startsInput, expiresInput, checkbox) {
  expiresInput.disabled = checkbox.checked;
  if (checkbox.checked) expiresInput.value = addCalendarMonth(startsInput.value || todayDate());
}

function displayLifecycleDate(value) {
  if (!value) return "--";
  const [year, month, day] = value.split("-");
  return locale === "zh" ? `${year}/${month}/${day}` : `${month}/${day}/${year}`;
}

function formatResetDate(value) {
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

function quotaLevel(percent, thresholds) {
  if (typeof percent !== "number") return "";
  if (percent >= thresholds.danger) return " is-danger";
  if (percent >= thresholds.warn) return " is-warn";
  return "";
}

function lifecycleStateFor(account) {
  return account.lifecycleStatus || (account.enabled ? "active" : "disabled");
}

function dateOnlyToUtc(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function lifecycleDays(account) {
  if (!account.expiresAt) return null;
  const today = dateOnlyToUtc(todayDate());
  const expiry = dateOnlyToUtc(account.expiresAt);
  if (today === null || expiry === null) return null;
  return Math.max(0, Math.ceil((expiry - today) / 86400000));
}

function lifecycleProgress(account) {
  const start = dateOnlyToUtc(account.startsAt);
  const expiry = dateOnlyToUtc(account.expiresAt);
  const today = dateOnlyToUtc(todayDate());
  if (start === null || expiry === null || today === null || expiry <= start) return null;
  return Math.min(100, Math.max(0, ((today - start) / (expiry - start)) * 100));
}

function testCompleted(testResult) {
  return Boolean(testResult && testResult.state);
}

function accountHasRisk(account) {
  const state = usageByAccount.get(account.id);
  if (!state || state.kind !== "done") return false;
  return Object.values(state.value?.usage || {}).some((value) => (
    typeof value?.remainingPercent === "number" && value.remainingPercent <= 20
  ));
}

function accountMatchesFilter(account) {
  const query = String(accountSearch?.value || "").trim().toLocaleLowerCase();
  const haystack = `${account.label || ""} ${account.maskedKey || ""}`.toLocaleLowerCase();
  if (query && !haystack.includes(query)) return false;
  const filter = accountFilter?.value || "all";
  const lifecycleState = lifecycleStateFor(account);
  if (filter === "active") return lifecycleState === "active";
  if (filter === "risk") return accountHasRisk(account);
  if (filter === "pending") return lifecycleState === "pending";
  if (filter === "expired") return lifecycleState === "expired";
  if (filter === "disabled") return lifecycleState === "disabled";
  if (filter === "test-failed") return testResults.get(account.id)?.state && testResults.get(account.id).state !== "passed";
  return true;
}

function quotaSummary(account) {
  const summary = document.createElement("div");
  summary.className = "quota-summary";
  summary.setAttribute("aria-label", t("remainingQuota"));
  const state = usageByAccount.get(account.id);
  const windows = [
    ["rolling", t("rollingPeriod"), "5H"],
    ["weekly", t("weeklyPeriod"), "7D"],
    ["monthly", t("monthlyPeriod"), "30D"],
  ];

  for (const [name, label, code] of windows) {
    const metric = document.createElement("div");
    metric.className = `quota-metric quota-metric-${name}`;
    metric.dataset.window = name;
    const head = document.createElement("div");
    head.className = "quota-metric-head";
    const metricLabel = document.createElement("span");
    metricLabel.className = "quota-period";
    metricLabel.innerHTML = `<b>${code}</b><span>${label}</span>`;
    const remaining = document.createElement("strong");
    remaining.className = "quota-remaining";
    remaining.textContent = "--";
    head.append(metricLabel, remaining);

    const track = document.createElement("div");
    track.className = "quota-mini-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", "0");
    const fill = document.createElement("span");
    fill.className = "quota-used-fill";
    track.append(fill);

    const foot = document.createElement("div");
    foot.className = "quota-metric-foot";
    const used = document.createElement("span");
    used.className = "quota-used";
    used.textContent = `${t("used")} --`;
    const resetAt = document.createElement("time");
    resetAt.className = "quota-reset";
    resetAt.textContent = `${t("reset")} --`;
    foot.append(used, resetAt);

    if (lifecycleStateFor(account) !== "active") {
      metric.classList.add("is-unavailable");
      remaining.textContent = "--";
      used.textContent = lifecycleStateFor(account) === "pending" ? t("pending") : lifecycleStateFor(account) === "expired" ? t("expired") : t("disabled");
    } else if (!state || state.kind === "loading") {
      metric.classList.add("is-loading");
      remaining.textContent = "…";
      used.textContent = `${t("used")} …`;
    } else if (state.kind === "failed") {
      metric.classList.add("is-failed");
      remaining.textContent = t("quotaFailed");
      used.textContent = `${t("quotaFailedReason")}: ${errorText(state.error?.code)}`;
      metric.title = errorText(state.error?.code);
    } else {
      const windowValue = state.value.usage?.[name];
      const percent = typeof windowValue?.percent === "number" ? Math.min(100, Math.max(0, windowValue.percent)) : null;
      const remainingPercent = typeof windowValue?.remainingPercent === "number"
        ? Math.min(100, Math.max(0, windowValue.remainingPercent))
        : null;
      remaining.textContent = formatRemaining(remainingPercent);
      used.textContent = `${t("used")} ${formatRemaining(percent)}`;
      fill.style.width = `${percent ?? 0}%`;
      track.setAttribute("aria-valuenow", String(percent ?? 0));
      resetAt.textContent = `${t("reset")} ${formatResetDate(windowValue?.resetsAt)}`;
      resetAt.dateTime = windowValue?.resetsAt || "";
      metric.className += quotaLevel(percent, state.value.thresholds || { warn: 60, danger: 85 });
      metric.title = `${t("remaining")}: ${formatRemaining(remainingPercent)}; ${t("used")}: ${formatRemaining(percent)}; ${t("reset")} ${formatResetDate(windowValue?.resetsAt)}`;
    }

    metric.append(head, track, foot);
    summary.append(metric);
  }
  return summary;
}

function lifecyclePanel(account, lifecycleState) {
  const panel = document.createElement("section");
  panel.className = "account-details lifecycle-panel";
  const heading = document.createElement("div");
  heading.className = "lifecycle-heading";
  const title = document.createElement("span");
  title.textContent = t("lifecycle");
  const state = document.createElement("strong");
  state.className = `status-label lifecycle-state is-${lifecycleState}`;
  state.textContent = lifecycleState === "active" ? t("active") : lifecycleState === "pending" ? t("pending") : lifecycleState === "expired" ? t("expired") : t("disabled");
  heading.append(title, state);
  const track = document.createElement("div");
  track.className = "lifecycle-line";
  const fill = document.createElement("span");
  fill.style.width = `${lifecycleProgress(account) ?? (lifecycleState === "expired" ? 100 : 0)}%`;
  track.append(fill);
  const dates = document.createElement("div");
  dates.className = "lifecycle-dates";
  const start = document.createElement("span");
  start.textContent = `${t("lifecycleStarted")} ${displayLifecycleDate(account.startsAt)}`;
  const end = document.createElement("span");
  end.textContent = account.expiresAt ? `${t("expiresAt")} ${displayLifecycleDate(account.expiresAt)}` : t("lifecycleNoExpiry");
  dates.append(start, end);
  const note = document.createElement("p");
  const days = lifecycleDays(account);
  if (account.autoDelete) {
    note.textContent = days === null ? t("lifecycleAutoDelete") : `${t("lifecycleRemaining").replace("{days}", String(days))} · ${t("lifecycleAutoDelete")}`;
  } else if (!account.startsAt && !account.expiresAt) {
    note.textContent = t("lifecycleNoDates");
  } else if (days !== null && lifecycleState === "active") {
    note.textContent = t("lifecycleRemaining").replace("{days}", String(days));
  } else if (lifecycleState === "active") {
    note.textContent = t("lifecycleOngoing");
  } else {
    note.textContent = lifecycleState === "pending" ? t("pending") : lifecycleState === "expired" ? t("expired") : t("disabled");
  }
  panel.append(heading, track, dates, note);
  return panel;
}

function updateKeySummary() {
  const active = accounts.filter((account) => lifecycleStateFor(account) === "active").length;
  const risk = accounts.filter(accountHasRisk).length;
  const attention = accounts.filter((account) => lifecycleStateFor(account) !== "active").length;
  const tested = [...testResults.values()].filter(testCompleted).length;
  const summaryValues = [
    [keySummaryTotal, accounts.length],
    [keySummaryActive, active],
    [keySummaryRisk, risk],
    [keySummaryAttention, attention],
    [keySummaryTested, tested],
  ];
  for (const [element, value] of summaryValues) {
    if (element) element.textContent = String(value);
  }
}

function renderAccounts() {
  accountList.replaceChildren();
  updateKeySummary();
  const visibleAccounts = accounts.filter(accountMatchesFilter);
  accountCount.textContent = locale === "zh"
    ? `${t("accountCount")}：${accounts.length}`
    : `${t("accountCount")}: ${accounts.length}`;
  accountCount.title = `${t("visibleCount")}: ${visibleAccounts.length}`;
  if (accounts.length === 0 || visibleAccounts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = accounts.length === 0 ? t("empty") : t("filteredEmpty");
    accountList.append(empty);
    return;
  }

  for (const account of visibleAccounts) {
    const row = document.createElement("article");
    const lifecycleState = lifecycleStateFor(account);
    row.className = "account-row key-node";
    row.dataset.lifecycle = lifecycleState;
    row.dataset.source = account.source || "stored";
    row.dataset.accountId = account.id;

    const identity = document.createElement("div");
    identity.className = "account-identity";
    const label = document.createElement("strong");
    label.textContent = account.label;
    const maskedKey = document.createElement("code");
    maskedKey.textContent = account.maskedKey;
    const identityMeta = document.createElement("span");
    identityMeta.className = "identity-meta";
    const addedAt = formatAccountDate(account.createdAt);
    identityMeta.textContent = `${t("addedAt")}: ${addedAt || "--"}`;
    identity.append(label, maskedKey, identityMeta);
    const source = document.createElement("span");
    source.className = "asset-source";
    source.textContent = `${t("sourceLabel")}: ${account.source === "environment" ? t("environment") : t("stored")}`;
    identity.append(source);

    const actions = document.createElement("div");
    actions.className = "account-actions";
    const isRefreshing = refreshingAccounts.has(account.id);
    const refreshButton = actionButton(
      isRefreshing ? t("refreshingKey") : t("refreshKey"),
      "secondary refresh-button",
      () => refreshAccountUsage(account),
    );
    refreshButton.disabled = busy || lifecycleState !== "active" || isRefreshing || usageByAccount.get(account.id)?.kind === "loading";
    refreshButton.classList.toggle("is-loading", isRefreshing);
    actions.append(refreshButton);
    if (account.editable) {
      actions.append(
        actionButton(t("edit"), "secondary", () => openEdit(account)),
        actionButton(account.enabled ? t("disable") : t("enable"), "secondary", () => toggleAccount(account)),
        actionButton(t("remove"), "danger", () => removeAccount(account)),
      );
    }
    const testPanel = document.createElement("section");
    testPanel.className = "account-test model-probe";
    testPanel.setAttribute("aria-live", "polite");
    const testButton = actionButton(testingAccounts.has(account.id) ? t("testingKey") : t("testKey"), "secondary test-button", () => openTestDialog(account));
    testButton.disabled = busy || lifecycleState !== "active" || testingAccounts.has(account.id);
    const testResult = testResults.get(account.id);
    const result = document.createElement("strong");
    result.className = `test-status ${testResult ? `is-${testResult.state}` : "is-empty"}`;
    result.textContent = !testResult
      ? t("testNoResult")
      : testResult.state === "passed"
        ? t("testPassed")
        : testResult.state === "depleted"
          ? t("testDepleted")
          : testResult.state === "invalid"
            ? t("testInvalid")
            : t("testFailed");
    const testMeta = document.createElement("span");
    testMeta.className = "test-meta";
    if (testResult) {
      const model = testResult.model || "--";
      const completed = formatAccountDate(testResult.completedAt);
      testMeta.textContent = `${model} · ${t("testCompleted")} ${completed || "--"}`;
    } else {
      testMeta.hidden = true;
    }
    testPanel.append(result, testMeta, testButton);
    row.append(identity, lifecyclePanel(account, lifecycleState), testPanel, actions, quotaSummary(account));
    accountList.append(row);
  }
}

async function openTestDialog(account) {
  testAccountTarget = account;
  testModelError.hidden = true;
  testModelError.textContent = "";
  testModelSelect.replaceChildren();
  testModelSelect.disabled = true;
  testSubmit.disabled = true;
  testDialog.showModal();
  try {
    const payload = await api("/api/admin/models");
    if (testAccountTarget !== account) return;
    for (const model of payload.models) {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      testModelSelect.append(option);
    }
    testModelSelect.disabled = false;
    testSubmit.disabled = payload.models.length === 0;
  } catch {
    testModelError.textContent = t("modelListFailed");
    testModelError.hidden = false;
  }
}

async function testAccount(account, model) {
  if (busy || lifecycleStateFor(account) !== "active" || testingAccounts.has(account.id)) return;
  testingAccounts.add(account.id);
  testResults.delete(account.id);
  const previousUsage = usageByAccount.get(account.id);
  renderAccounts();

  try {
    const result = await api(`/api/admin/accounts/${encodeURIComponent(account.id)}/test`, {
      method: "POST",
      body: JSON.stringify({ model }),
    });
    const modelTest = result.modelTest || result.valid || result;
    testResults.set(account.id, {
      state: "passed",
      model: modelTest?.model || model,
      completedAt: modelTest?.completedAt || new Date().toISOString(),
    });
    let quotaPayload = null;
    try {
      const parameters = new URLSearchParams({ account: account.id, refresh: "1" });
      quotaPayload = await api(`/api/usage?${parameters}`);
    } catch {
      // A successful model call is still a valid test when the follow-up quota read fails.
    }
    if (quotaPayload) {
      usageByAccount.set(account.id, { kind: "done", value: quotaPayload });
    } else {
      if (previousUsage) usageByAccount.set(account.id, previousUsage);
    }
  } catch (error) {
    if (previousUsage) usageByAccount.set(account.id, previousUsage);
    testResults.set(account.id, {
      state: error?.code === "model_unauthorized"
        ? "invalid"
        : error?.code === "model_rate_limited"
          ? "depleted"
          : "failed",
      model,
      completedAt: new Date().toISOString(),
    });
  } finally {
    testingAccounts.delete(account.id);
    renderAccounts();
  }
}

async function loadAccounts() {
  try {
    const payload = await api("/api/admin/accounts");
    accounts = payload.accounts;
    clearError();
    renderAccounts();
    await loadAccountUsages(false);
  } catch (error) {
    showError(error);
    addForm.querySelectorAll("input, button").forEach((element) => { element.disabled = true; });
  }
}

async function performLoadAccountUsages(force) {
  const generation = ++usageGeneration;
  const enabledAccounts = accounts.filter((account) => (account.lifecycleStatus || (account.enabled ? "active" : "disabled")) === "active");
  const currentIds = new Set(accounts.map((account) => account.id));
  for (const id of usageByAccount.keys()) {
    if (!currentIds.has(id)) {
      usageByAccount.delete(id);
      usageRequestByAccount.delete(id);
      refreshingAccounts.delete(id);
      testingAccounts.delete(id);
      testResults.delete(id);
    }
  }
  const requestIds = new Map();
  for (const account of accounts) {
    if (lifecycleStateFor(account) === "active") {
      requestIds.set(account.id, beginUsageRequest(account.id));
    } else {
      usageRequestByAccount.delete(account.id);
      refreshingAccounts.delete(account.id);
    }
    usageByAccount.set(account.id, {
      kind: lifecycleStateFor(account) === "active" ? "loading" : "disabled",
    });
  }
  refreshAllButton.disabled = true;
  refreshAllButton.classList.add("is-loading");
  renderAccounts();

  let next = 0;
  async function worker() {
    while (next < enabledAccounts.length) {
      const account = enabledAccounts[next];
      next += 1;
      const requestId = requestIds.get(account.id);
      try {
        const parameters = new URLSearchParams({ account: account.id });
        if (force) parameters.set("refresh", "1");
        const payload = await api(`/api/usage?${parameters}`);
        if (generation !== usageGeneration) return;
        if (!isCurrentUsageRequest(account.id, requestId)) continue;
        usageByAccount.set(account.id, { kind: "done", value: payload });
      } catch (error) {
        if (generation !== usageGeneration) return;
        if (!isCurrentUsageRequest(account.id, requestId)) continue;
        usageByAccount.set(account.id, { kind: "failed", error });
      }
      renderAccounts();
    }
  }

  await Promise.all(Array.from({ length: Math.min(3, enabledAccounts.length) }, () => worker()));
  if (generation === usageGeneration) {
    refreshAllButton.disabled = false;
    refreshAllButton.classList.remove("is-loading");
  }
}

async function refreshAccountUsage(account) {
  if (busy || lifecycleStateFor(account) !== "active" || refreshingAccounts.has(account.id)) return;
  const requestId = beginUsageRequest(account.id);
  refreshingAccounts.add(account.id);
  usageByAccount.set(account.id, { kind: "loading" });
  clearError();
  renderAccounts();

  try {
    const parameters = new URLSearchParams({ account: account.id, refresh: "1" });
    const payload = await api(`/api/usage?${parameters}`);
    if (isCurrentUsageRequest(account.id, requestId)) usageByAccount.set(account.id, { kind: "done", value: payload });
  } catch (error) {
    if (isCurrentUsageRequest(account.id, requestId)) usageByAccount.set(account.id, { kind: "failed", error });
  } finally {
    refreshingAccounts.delete(account.id);
    renderAccounts();
  }
}

async function loadAccountUsages(force) {
  if (usageLoadPromise) return usageLoadPromise;
  usageLoadPromise = performLoadAccountUsages(force).finally(() => {
    usageLoadPromise = null;
  });
  return usageLoadPromise;
}

async function runMutation(operation) {
  if (busy) return;
  busy = true;
  addButton.disabled = true;
  renderAccounts();
  clearError();
  try {
    await operation();
    const payload = await api("/api/admin/accounts");
    accounts = payload.accounts;
    await loadAccountUsages(false);
  } catch (error) {
    showError(error);
  } finally {
    busy = false;
    addButton.disabled = false;
    renderAccounts();
  }
}

async function backupAccounts() {
  if (busy) return;
  busy = true;
  backupButton.disabled = true;
  restoreButton.disabled = true;
  try {
    const response = await fetch("/api/admin/backup", { headers: { Accept: "application/json" }, cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok || !payload.backup) throw payload?.error || { code: "invalid_response" };
    const blob = new Blob([JSON.stringify(payload.backup, null, 2)], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `opencode-go-balance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    showError(error);
  } finally {
    busy = false;
    backupButton.disabled = false;
    restoreButton.disabled = false;
  }
}

async function restoreAccounts(file) {
  if (!file || busy || !window.confirm(t("restoreConfirm"))) return;
  try {
    const backup = JSON.parse(await file.text());
    await runMutation(() => api("/api/admin/restore", {
      method: "POST",
      body: JSON.stringify({ backup }),
    }));
  } catch (error) {
    showError(error?.code ? error : { code: "invalid_backup" });
  }
}

function openEdit(account) {
  clearError();
  editingId = account.id;
  editLabel.value = account.label;
  editKey.value = "";
  editEnabled.checked = account.enabled;
  editStartsAt.value = account.startsAt || "";
  editExpiresAt.value = account.expiresAt || "";
  editAutoDelete.checked = Boolean(account.autoDelete);
  syncAutoDelete(editStartsAt, editExpiresAt, editAutoDelete);
  editDialog.showModal();
}

async function toggleAccount(account) {
  await runMutation(() => api(`/api/admin/accounts/${encodeURIComponent(account.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled: !account.enabled }),
  }));
}

async function removeAccount(account) {
  if (!window.confirm(t("confirmRemove").replace("{label}", account.label))) return;
  await runMutation(() => api(`/api/admin/accounts/${encodeURIComponent(account.id)}`, { method: "DELETE" }));
}

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(addForm);
  await runMutation(async () => {
    await api("/api/admin/accounts", {
      method: "POST",
      body: JSON.stringify({
        label: formData.get("label"),
        key: formData.get("key"),
        startsAt: accountStartsAt.value || null,
        expiresAt: accountExpiresAt.value || null,
        autoDelete: accountAutoDelete.checked,
      }),
    });
    addForm.reset();
    accountStartsAt.value = todayDate();
    syncAutoDelete(accountStartsAt, accountExpiresAt, accountAutoDelete);
  });
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const changes = {
    label: editLabel.value,
    enabled: editEnabled.checked,
    startsAt: editStartsAt.value || null,
    expiresAt: editExpiresAt.value || null,
    autoDelete: editAutoDelete.checked,
  };
  if (editKey.value) changes.key = editKey.value;
  await runMutation(async () => {
    await api(`/api/admin/accounts/${encodeURIComponent(editingId)}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
    editDialog.close();
    editKey.value = "";
  });
});

document.querySelector("#edit-cancel").addEventListener("click", () => {
  clearError();
  editDialog.close();
});
accountStartsAt.addEventListener("change", () => syncAutoDelete(accountStartsAt, accountExpiresAt, accountAutoDelete));
accountAutoDelete.addEventListener("change", () => syncAutoDelete(accountStartsAt, accountExpiresAt, accountAutoDelete));
editStartsAt.addEventListener("change", () => syncAutoDelete(editStartsAt, editExpiresAt, editAutoDelete));
editAutoDelete.addEventListener("change", () => syncAutoDelete(editStartsAt, editExpiresAt, editAutoDelete));
document.querySelector("#test-cancel").addEventListener("click", () => {
  testAccountTarget = null;
  testDialog.close();
});
testForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const account = testAccountTarget;
  const model = testModelSelect.value;
  testAccountTarget = null;
  testDialog.close();
  if (account && model) await testAccount(account, model);
});
document.querySelectorAll("[data-locale]").forEach((button) => {
  button.addEventListener("click", () => setLocale(button.dataset.locale));
});
refreshAllButton.addEventListener("click", () => loadAccountUsages(true));
logoutButton.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", cache: "no-store" }).catch(() => {});
  window.location.replace("/login");
});
backupButton.addEventListener("click", backupAccounts);
restoreButton.addEventListener("click", () => restoreInput.click());
restoreInput.addEventListener("change", async () => {
  const [file] = restoreInput.files || [];
  restoreInput.value = "";
  await restoreAccounts(file);
});
autoRefreshForm.addEventListener("submit", (event) => event.preventDefault());
autoRefreshEnabled.addEventListener("change", applyAutoRefreshSetting);
autoRefreshValue.addEventListener("change", applyAutoRefreshSetting);
autoRefreshUnit.addEventListener("change", applyAutoRefreshSetting);
accountSearch?.addEventListener("input", renderAccounts);
accountFilter?.addEventListener("change", renderAccounts);

const storedAutoRefresh = readAutoRefreshSetting();
autoRefreshEnabled.checked = storedAutoRefresh.enabled;
autoRefreshValue.value = String(storedAutoRefresh.value);
autoRefreshUnit.value = storedAutoRefresh.unit;
applyAutoRefreshSetting();
setLocale(locale);
loadAccounts();
accountStartsAt.value = todayDate();
syncAutoDelete(accountStartsAt, accountExpiresAt, accountAutoDelete);
