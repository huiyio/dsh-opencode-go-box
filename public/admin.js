const copy = {
  zh: {
    eyebrow: "账号管理",
    title: "Key 管理",
    subtitle: "添加和管理额度看板使用的账号",
    addTitle: "添加 Key",
    label: "账号名称",
    apiKey: "API Key",
    add: "添加",
    accounts: "账号",
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
    editTitle: "编辑账号",
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
    back: "返回看板",
    manageUsers: "用户管理",
    logout: "退出登录",
    empty: "还没有保存的 Key",
    errorTitle: "操作失败",
    adminDisabled: "请先配置 WEB_USERNAME、WEB_PASSWORD 和 KEY_ENCRYPTION_SECRET。",
    duplicate: "这个 Key 已经存在。",
    invalid: "请检查账号名称和 Key。",
    generic: "服务暂时不可用，请稍后重试。",
    confirmRemove: "确定删除账号“{label}”？此操作无法撤销。",
    refreshAll: "刷新全部额度",
    remainingQuota: "剩余",
    reset: "重置",
    quotaFailed: "查询失败",
    remaining: "剩余",
    used: "已用",
    rollingPeriod: "5小时",
    weeklyPeriod: "7天",
    monthlyPeriod: "30天",
    testKey: "测试模型",
    testingKey: "模型测试中",
    testPassed: "模型可用",
    testDepleted: "模型不可用·额度已耗尽",
    testInvalid: "Key 无效",
    testFailed: "检测失败",
    testDialogTitle: "选择测试模型",
    testModelLabel: "模型",
    startModelTest: "开始测试",
    modelListFailed: "模型列表加载失败，请稍后重试。",
    addedAt: "添加时间",
    startsAt: "开通日期",
    expiresAt: "结束日期",
    autoDeleteMonth: "一个月到期自动删除",
    autoDeleteEnabled: "到期自动删除",
    pending: "待开通",
    expired: "已到期",
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
    eyebrow: "Account management",
    title: "OpenCode Go Keys",
    subtitle: "Add and manage accounts used by the quota dashboard",
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
    back: "Back to dashboard",
    manageUsers: "User management",
    logout: "Sign out",
    empty: "No stored keys yet",
    errorTitle: "Operation failed",
    adminDisabled: "Configure WEB_USERNAME, WEB_PASSWORD, and KEY_ENCRYPTION_SECRET first.",
    duplicate: "This key already exists.",
    invalid: "Check the account label and API key.",
    generic: "The service is temporarily unavailable. Try again later.",
    confirmRemove: "Delete account “{label}”? This cannot be undone.",
    refreshAll: "Refresh all quotas",
    remainingQuota: "Remaining",
    reset: "Resets",
    quotaFailed: "Query failed",
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
let autoRefreshTimer = null;
let usageLoadPromise = null;
const usageByAccount = new Map();
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
  document.title = locale === "zh" ? "OpenCode Go Key 管理" : "OpenCode Go key management";
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

function testResultForUsage(payload) {
  const windows = Object.values(payload?.usage || {});
  return windows.some((value) => typeof value?.remainingPercent === "number" && value.remainingPercent <= 0)
    ? "depleted"
    : "passed";
}

function quotaSummary(account) {
  const summary = document.createElement("div");
  summary.className = "quota-summary";
  summary.setAttribute("aria-label", t("remainingQuota"));
  const state = usageByAccount.get(account.id);
  const windows = [
    ["rolling", t("rollingPeriod")],
    ["weekly", t("weeklyPeriod")],
    ["monthly", t("monthlyPeriod")],
  ];

  for (const [name, label] of windows) {
    const metric = document.createElement("div");
    metric.className = "quota-metric";
    const metricLabel = document.createElement("span");
    metricLabel.className = "quota-period";
    metricLabel.textContent = label;
    const resetAt = document.createElement("time");
    resetAt.className = "quota-reset";
    resetAt.textContent = "--";
    const value = document.createElement("strong");

    if (account.lifecycleStatus && account.lifecycleStatus !== "active") {
      value.textContent = "--";
    } else if (!state || state.kind === "loading") {
      value.textContent = "…";
    } else if (state.kind === "failed") {
      metric.className += " is-failed";
      value.textContent = "!";
      metric.title = t("quotaFailed");
    } else {
      const windowValue = state.value.usage?.[name];
      resetAt.textContent = formatResetDate(windowValue?.resetsAt);
      resetAt.dateTime = windowValue?.resetsAt || "";
      value.textContent = `${t("remaining")} ${formatRemaining(windowValue?.remainingPercent)}`;
      metric.className += quotaLevel(windowValue?.percent, state.value.thresholds || { warn: 60, danger: 85 });
      metric.title = `${t("remaining")}: ${formatRemaining(windowValue?.remainingPercent)}; ${t("used")}: ${formatRemaining(windowValue?.percent)}; ${t("reset")} ${resetAt.textContent}`;
    }

    metric.append(metricLabel, resetAt, value);
    summary.append(metric);
  }
  return summary;
}

function renderAccounts() {
  accountList.replaceChildren();
  accountCount.textContent = locale === "zh"
    ? `${t("accountCount")}：${accounts.length}`
    : `${t("accountCount")}: ${accounts.length}`;
  if (accounts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = t("empty");
    accountList.append(empty);
    return;
  }

  for (const account of accounts) {
    const row = document.createElement("article");
    row.className = "account-row";

    const identity = document.createElement("div");
    identity.className = "account-identity";
    const label = document.createElement("strong");
    label.textContent = account.label;
    const maskedKey = document.createElement("code");
    maskedKey.textContent = account.maskedKey;
    identity.append(label, maskedKey);
    const addedAt = formatAccountDate(account.createdAt);
    if (addedAt) {
      const created = document.createElement("span");
      created.textContent = `${t("addedAt")}: ${addedAt}`;
      identity.append(created);
    }

    const details = document.createElement("div");
    details.className = "account-details";
    const status = document.createElement("span");
    const lifecycleState = account.lifecycleStatus || (account.enabled ? "active" : "disabled");
    status.className = `status-label${lifecycleState === "active" ? "" : ` is-${lifecycleState}`}`;
    status.textContent = lifecycleState === "pending"
      ? t("pending")
      : lifecycleState === "expired"
        ? t("expired")
        : lifecycleState === "disabled"
          ? t("disabled")
          : t("enabled");
    const source = document.createElement("span");
    source.textContent = account.source === "environment" ? t("environment") : t("stored");
    details.append(status, source);
    if (account.startsAt) {
      const starts = document.createElement("span");
      starts.textContent = `${t("startsAt")}: ${displayLifecycleDate(account.startsAt)}`;
      details.append(starts);
    }
    if (account.expiresAt) {
      const expires = document.createElement("span");
      expires.textContent = `${t("expiresAt")}: ${displayLifecycleDate(account.expiresAt)}`;
      details.append(expires);
    }
    if (account.autoDelete) {
      const autoDelete = document.createElement("span");
      autoDelete.textContent = t("autoDeleteEnabled");
      details.append(autoDelete);
    }

    const actions = document.createElement("div");
    actions.className = "account-actions";
    actions.setAttribute("aria-live", "polite");
    const testResult = testResults.get(account.id);
    const testButton = actionButton(
      testingAccounts.has(account.id)
        ? t("testingKey")
        : testResult === "passed"
          ? t("testPassed")
          : testResult === "depleted"
            ? t("testDepleted")
          : testResult === "invalid"
            ? t("testInvalid")
          : testResult === "failed"
            ? t("testFailed")
            : t("testKey"),
      `secondary test-button${testResult ? ` is-${testResult}` : ""}`,
      () => openTestDialog(account),
    );
    testButton.disabled = busy || lifecycleState !== "active" || testingAccounts.has(account.id);
    actions.append(testButton);
    if (account.editable) {
      actions.append(
        actionButton(t("edit"), "secondary", () => openEdit(account)),
        actionButton(account.enabled ? t("disable") : t("enable"), "secondary", () => toggleAccount(account)),
        actionButton(t("remove"), "danger", () => removeAccount(account)),
      );
    }
    row.append(identity, quotaSummary(account), details, actions);
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
  if (busy || account.lifecycleStatus !== "active" || testingAccounts.has(account.id)) return;
  testingAccounts.add(account.id);
  testResults.delete(account.id);
  const previousUsage = usageByAccount.get(account.id);
  usageByAccount.set(account.id, { kind: "loading" });
  renderAccounts();

  try {
    await api(`/api/admin/accounts/${encodeURIComponent(account.id)}/test`, {
      method: "POST",
      body: JSON.stringify({ model }),
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
      testResults.set(account.id, testResultForUsage(quotaPayload));
    } else {
      if (previousUsage) usageByAccount.set(account.id, previousUsage);
      testResults.set(account.id, "passed");
    }
  } catch (error) {
    usageByAccount.set(account.id, { kind: "failed", error });
    testResults.set(account.id,
      error?.code === "model_unauthorized"
        ? "invalid"
        : error?.code === "model_rate_limited"
          ? "depleted"
          : "failed");
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
      testingAccounts.delete(id);
      testResults.delete(id);
    }
  }
  for (const account of accounts) {
    usageByAccount.set(account.id, { kind: account.enabled ? "loading" : "disabled" });
  }
  refreshAllButton.disabled = true;
  refreshAllButton.classList.add("is-loading");
  renderAccounts();

  let next = 0;
  async function worker() {
    while (next < enabledAccounts.length) {
      const account = enabledAccounts[next];
      next += 1;
      try {
        const parameters = new URLSearchParams({ account: account.id });
        if (force) parameters.set("refresh", "1");
        const payload = await api(`/api/usage?${parameters}`);
        if (generation !== usageGeneration) return;
        usageByAccount.set(account.id, { kind: "done", value: payload });
      } catch (error) {
        if (generation !== usageGeneration) return;
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

const storedAutoRefresh = readAutoRefreshSetting();
autoRefreshEnabled.checked = storedAutoRefresh.enabled;
autoRefreshValue.value = String(storedAutoRefresh.value);
autoRefreshUnit.value = storedAutoRefresh.unit;
applyAutoRefreshSetting();
setLocale(locale);
loadAccounts();
accountStartsAt.value = todayDate();
syncAutoDelete(accountStartsAt, accountExpiresAt, accountAutoDelete);
