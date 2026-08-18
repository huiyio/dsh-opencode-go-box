const copy = {
  zh: {
    eyebrow: "账号范围", title: "访问授权", subtitle: "按用户分配可见的 OpenCode Go Key",
    logout: "退出登录", keys: "Key 资产", dashboard: "额度观测", errorTitle: "操作失败",
    addTitle: "新增授权用户", addHelp: "创建登录账号并定义 Key 可见范围",
    username: "用户名", password: "登录密码", enabled: "允许登录", disabled: "已停用",
    permissions: "可查看的 Key", addUser: "创建用户并授权", listTitle: "访问授权矩阵",
    listSubtitle: "每个单元格都表示该用户是否能查看对应 Key 的额度。",
    matrixKicker: "用户 × Key", matrixUser: "登录用户", matrixActions: "管理",
    encrypted: "加密保存用户凭据", count: "用户", noUsers: "还没有创建用户",
    noAccounts: "当前没有可授权的 Key", noPermissions: "未授权任何 Key",
    editUser: "修改用户与授权", editKicker: "访问范围", replacementPassword: "新密码（留空则不修改）",
    editAction: "修改权限", deleteAction: "删除用户", cancel: "取消", save: "保存用户与授权",
    confirmDelete: "确定删除用户“{username}”？该用户会立即退出登录，且无法恢复。",
    duplicate: "这个用户名已经存在。", invalid: "请检查用户名、密码和 Key 授权。",
    unavailable: "用户服务暂时不可用。", deleted: "用户已删除。",
    searchKeys: "搜索 Key", searchKeysPlaceholder: "账号名称或 Key 尾号", selectAll: "全选", clearAll: "清空",
    enabledUsers: "已启用用户", enabledUsersHint: "可登录额度监控台", availableKeys: "可授权 Key",
    availableKeysHint: "当前已接入的账号", permissionRelations: "授权关系", permissionRelationsHint: "用户与 Key 的可见关系",
    usersWithoutAccess: "零权限用户", usersWithoutAccessHint: "登录后看不到任何额度",
    granted: "已授权", notGranted: "未授权", permissionCoverage: "{assigned}/{total} 个 Key", noMatches: "没有匹配的 Key",
  },
  en: {
    eyebrow: "Account scope", title: "Access authorization", subtitle: "Assign the OpenCode Go keys each user can view",
    logout: "Sign out", keys: "Key assets", dashboard: "Quota view", errorTitle: "Operation failed",
    addTitle: "Add authorized user", addHelp: "Create a login and define its visible key scope",
    username: "Username", password: "Login password", enabled: "Allow login", disabled: "Disabled",
    permissions: "Visible keys", addUser: "Create user and authorize", listTitle: "Access matrix",
    listSubtitle: "Each cell shows whether the user can view quota data for the corresponding key.",
    matrixKicker: "Users × keys", matrixUser: "Login user", matrixActions: "Manage",
    encrypted: "Encrypted user credentials", count: "Users", noUsers: "No users have been created yet",
    noAccounts: "No keys are available to authorize", noPermissions: "No keys authorized",
    editUser: "Edit user and access", editKicker: "Access scope", replacementPassword: "New password (leave empty to keep current)",
    editAction: "Edit access", deleteAction: "Delete user", cancel: "Cancel", save: "Save user and access",
    confirmDelete: "Delete user “{username}”? They will be signed out immediately and cannot be restored.",
    duplicate: "This username already exists.", invalid: "Check the username, password, and key assignments.",
    unavailable: "User service is temporarily unavailable.", deleted: "User deleted.",
    searchKeys: "Search keys", searchKeysPlaceholder: "Account label or key suffix", selectAll: "Select all", clearAll: "Clear",
    enabledUsers: "Enabled users", enabledUsersHint: "Can enter the quota console", availableKeys: "Assignable keys",
    availableKeysHint: "Accounts currently connected", permissionRelations: "Authorization links", permissionRelationsHint: "Visible user-to-key relationships",
    usersWithoutAccess: "Users without access", usersWithoutAccessHint: "They see no quota after login",
    granted: "Authorized", notGranted: "Not authorized", permissionCoverage: "{assigned}/{total} keys", noMatches: "No matching keys",
  },
};

const addForm = document.querySelector("#user-add-form");
const addButton = document.querySelector("#user-add-button");
const addPermissions = document.querySelector("#user-permissions");
const addPermissionSearch = document.querySelector("#user-permission-search");
const addSelectAll = document.querySelector("#user-permissions-select-all");
const addClearAll = document.querySelector("#user-permissions-clear");
const userList = document.querySelector("#user-list");
const userCount = document.querySelector("#user-count");
const matrixHeads = document.querySelector("#permission-matrix-heads");
const enabledUserCount = document.querySelector("#enabled-user-count");
const availableKeyCount = document.querySelector("#available-key-count");
const permissionRelationCount = document.querySelector("#permission-relation-count");
const unassignedUserCount = document.querySelector("#unassigned-user-count");
const errorBanner = document.querySelector("#users-error");
const errorMessage = document.querySelector("#users-error-message");
const editDialog = document.querySelector("#user-edit-dialog");
const editForm = document.querySelector("#user-edit-form");
const editUsername = document.querySelector("#user-edit-username");
const editPassword = document.querySelector("#user-edit-password");
const editEnabled = document.querySelector("#user-edit-enabled");
const editPermissions = document.querySelector("#user-edit-permissions");
const editPermissionSearch = document.querySelector("#user-edit-permission-search");
const editSelectAll = document.querySelector("#user-edit-permissions-select-all");
const editClearAll = document.querySelector("#user-edit-permissions-clear");
const editError = document.querySelector("#user-edit-error");

let locale = localStorage.getItem("opencode-go-locale") === "en" ? "en" : "zh";
let accounts = [];
let users = [];
let editingUserId = null;
let busy = false;

function t(key) { return copy[locale][key] || key; }

function setLocale(next) {
  locale = next === "en" ? "en" : "zh";
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  document.title = locale === "zh" ? "OpenCode Go 访问授权" : "OpenCode Go access authorization";
  localStorage.setItem("opencode-go-locale", locale);
  document.querySelectorAll("[data-copy]").forEach((element) => { element.textContent = t(element.dataset.copy); });
  document.querySelectorAll("[data-copy-placeholder]").forEach((element) => { element.placeholder = t(element.dataset.copyPlaceholder); });
  document.querySelectorAll("[data-locale]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.locale === locale));
  });
  renderPermissionChoices(addPermissions, selectedPermissionIds(addPermissions), addPermissionSearch.value);
  renderPermissionChoices(editPermissions, selectedPermissionIds(editPermissions), editPermissionSearch.value);
  renderUsers();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) {
    window.location.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
    throw { code: "authentication_required" };
  }
  if (!response.ok || !payload?.ok) throw payload?.error || { code: "invalid_response" };
  return payload;
}

function errorText(code) {
  if (code === "duplicate_username") return t("duplicate");
  if (["invalid_username", "invalid_password", "invalid_permissions", "invalid_enabled"].includes(code)) return t("invalid");
  return t("unavailable");
}

function showError(error) {
  if (editDialog.open) {
    editError.textContent = errorText(error?.code);
    editError.hidden = false;
    return;
  }
  errorMessage.textContent = errorText(error?.code);
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
  editError.hidden = true;
  editError.textContent = "";
}

function selectedPermissionIds(container) {
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
}

function accountSearchText(account) {
  return `${account.label || ""} ${account.maskedKey || ""}`.toLocaleLowerCase();
}

function renderPermissionChoices(container, selectedIds = [], query = "") {
  const selected = new Set(selectedIds);
  container.replaceChildren();
  if (accounts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "permission-empty";
    empty.textContent = t("noAccounts");
    container.append(empty);
    return;
  }

  for (const account of accounts) {
    const label = document.createElement("label");
    label.className = "permission-option";
    label.dataset.search = accountSearchText(account);
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = account.id;
    checkbox.checked = selected.has(account.id);
    const text = document.createElement("span");
    text.textContent = `${account.label} (${account.maskedKey})`;
    label.append(checkbox, text);
    container.append(label);
  }

  const noMatches = document.createElement("p");
  noMatches.className = "permission-filter-empty";
  noMatches.textContent = t("noMatches");
  container.append(noMatches);
  filterPermissionChoices(container, query);
}

function filterPermissionChoices(container, query) {
  const normalized = String(query || "").trim().toLocaleLowerCase();
  let visible = 0;
  container.querySelectorAll(".permission-option").forEach((option) => {
    const matches = !normalized || option.dataset.search.includes(normalized);
    option.hidden = !matches;
    if (matches) visible += 1;
  });
  const empty = container.querySelector(".permission-filter-empty");
  if (empty) empty.hidden = visible !== 0;
}

function setVisiblePermissions(container, checked) {
  container.querySelectorAll(".permission-option:not([hidden]) input[type=checkbox]").forEach((input) => {
    input.checked = checked;
  });
}

function bindPermissionControls(search, container, selectAll, clearAll) {
  search.addEventListener("input", () => filterPermissionChoices(container, search.value));
  selectAll.addEventListener("click", () => setVisiblePermissions(container, true));
  clearAll.addEventListener("click", () => setVisiblePermissions(container, false));
}

function actionButton(label, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `command-button ${className}`;
  button.textContent = label;
  button.disabled = busy;
  button.addEventListener("click", handler);
  return button;
}

function renderStats(accountById) {
  const enabled = users.filter((user) => user.enabled).length;
  const relations = users.reduce((total, user) => total + new Set(user.accountIds.filter((id) => accountById.has(id))).size, 0);
  const withoutAccess = users.filter((user) => !user.accountIds.some((id) => accountById.has(id))).length;
  enabledUserCount.textContent = String(enabled);
  availableKeyCount.textContent = String(accounts.length);
  permissionRelationCount.textContent = String(relations);
  unassignedUserCount.textContent = String(withoutAccess);
}

function renderMatrixHeaders() {
  matrixHeads.replaceChildren();
  matrixHeads.style.setProperty("--permission-column-count", String(Math.max(accounts.length, 1)));
  if (accounts.length === 0) {
    const empty = document.createElement("span");
    empty.className = "permission-matrix-head is-empty";
    empty.textContent = t("noAccounts");
    matrixHeads.append(empty);
    return;
  }
  for (const account of accounts) {
    const head = document.createElement("span");
    head.className = "permission-matrix-head";
    head.title = `${account.label} (${account.maskedKey})`;
    const label = document.createElement("strong");
    label.textContent = account.label;
    const key = document.createElement("small");
    key.textContent = account.maskedKey;
    head.append(label, key);
    matrixHeads.append(head);
  }
}

function renderPermissionCells(container, user, accountById) {
  const assigned = new Set(user.accountIds.filter((id) => accountById.has(id)));
  container.style.setProperty("--permission-column-count", String(Math.max(accounts.length, 1)));
  const coverage = document.createElement("div");
  coverage.className = "permission-coverage";
  const coverageValue = document.createElement("strong");
  coverageValue.textContent = t("permissionCoverage").replace("{assigned}", String(assigned.size)).replace("{total}", String(accounts.length));
  const coverageLabel = document.createElement("span");
  coverageLabel.textContent = assigned.size ? t("granted") : t("noPermissions");
  coverage.append(coverageValue, coverageLabel);
  container.append(coverage);

  const cells = document.createElement("div");
  cells.className = "permission-matrix-cells";
  cells.style.setProperty("--permission-column-count", String(Math.max(accounts.length, 1)));
  if (accounts.length === 0) {
    const empty = document.createElement("span");
    empty.className = "permission-state is-empty";
    empty.textContent = t("noAccounts");
    cells.append(empty);
  } else {
    for (const account of accounts) {
      const granted = assigned.has(account.id);
      const cell = document.createElement("span");
      cell.className = `permission-state${granted ? " is-granted" : " is-not-granted"}`;
      cell.title = `${account.label}: ${granted ? t("granted") : t("notGranted")}`;
      const accountLabel = document.createElement("small");
      accountLabel.className = "permission-account-label";
      accountLabel.textContent = account.label;
      const state = document.createElement("strong");
      state.className = "permission-state-copy";
      state.textContent = granted ? t("granted") : t("notGranted");
      cell.append(accountLabel, state);
      cells.append(cell);
    }
  }
  container.append(cells);
}

function renderUsers() {
  userList.replaceChildren();
  userCount.textContent = locale === "zh" ? `${t("count")}：${users.length}` : `${t("count")}: ${users.length}`;
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  renderStats(accountById);
  renderMatrixHeaders();
  if (users.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = t("noUsers");
    userList.append(empty);
    return;
  }

  for (const user of users) {
    const row = document.createElement("article");
    row.className = "user-row access-matrix-row";
    row.dataset.userId = user.id;
    const identity = document.createElement("div");
    identity.className = "user-identity";
    const username = document.createElement("strong");
    username.textContent = user.username;
    username.title = user.username;
    const status = document.createElement("span");
    status.className = `status-label${user.enabled ? "" : " is-disabled"}`;
    status.textContent = user.enabled ? t("enabled") : t("disabled");
    identity.append(username, status);

    const permissions = document.createElement("div");
    permissions.className = "user-permission-summary";
    permissions.title = user.accountIds.map((id) => accountById.get(id)?.label).filter(Boolean).join("、");
    renderPermissionCells(permissions, user, accountById);

    const actions = document.createElement("div");
    actions.className = "user-actions";
    actions.append(
      actionButton(t("editAction"), "secondary", () => openEdit(user)),
      actionButton(t("deleteAction"), "danger", () => deleteUser(user)),
    );
    row.append(identity, permissions, actions);
    userList.append(row);
  }
}

async function loadData() {
  try {
    const [accountPayload, userPayload] = await Promise.all([api("/api/admin/accounts"), api("/api/admin/users")]);
    accounts = accountPayload.accounts;
    users = userPayload.users;
    clearError();
    renderPermissionChoices(addPermissions, selectedPermissionIds(addPermissions), addPermissionSearch.value);
    renderPermissionChoices(editPermissions, selectedPermissionIds(editPermissions), editPermissionSearch.value);
    renderUsers();
  } catch (error) {
    showError(error);
  }
}

async function mutate(operation) {
  if (busy) return;
  busy = true;
  addButton.disabled = true;
  clearError();
  renderUsers();
  try {
    await operation();
    await loadData();
  } catch (error) {
    showError(error);
  } finally {
    busy = false;
    addButton.disabled = false;
    renderUsers();
  }
}

function openEdit(user) {
  editingUserId = user.id;
  editUsername.value = user.username;
  editPassword.value = "";
  editEnabled.checked = user.enabled;
  editPermissionSearch.value = "";
  renderPermissionChoices(editPermissions, user.accountIds);
  clearError();
  editDialog.showModal();
}

async function deleteUser(user) {
  if (!window.confirm(t("confirmDelete").replace("{username}", user.username))) return;
  await mutate(() => api(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE" }));
}

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(addForm);
  await mutate(async () => {
    await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"), password: form.get("password"),
        enabled: document.querySelector("#user-enabled").checked,
        accountIds: selectedPermissionIds(addPermissions),
      }),
    });
    addForm.reset();
    document.querySelector("#user-enabled").checked = true;
    addPermissionSearch.value = "";
    renderPermissionChoices(addPermissions, []);
  });
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const changes = { username: editUsername.value, enabled: editEnabled.checked, accountIds: selectedPermissionIds(editPermissions) };
  if (editPassword.value) changes.password = editPassword.value;
  await mutate(async () => {
    await api(`/api/admin/users/${encodeURIComponent(editingUserId)}`, { method: "PATCH", body: JSON.stringify(changes) });
    editDialog.close();
  });
});

document.querySelector("#user-edit-cancel").addEventListener("click", () => editDialog.close());
document.querySelector("#logout-button").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", cache: "no-store" }).catch(() => {});
  window.location.replace("/login");
});
document.querySelectorAll("[data-locale]").forEach((button) => button.addEventListener("click", () => setLocale(button.dataset.locale)));
bindPermissionControls(addPermissionSearch, addPermissions, addSelectAll, addClearAll);
bindPermissionControls(editPermissionSearch, editPermissions, editSelectAll, editClearAll);

setLocale(locale);
loadData();
