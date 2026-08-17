const copy = {
  zh: {
    eyebrow: "访问控制", title: "用户与权限", subtitle: "管理登录账号和可查看的 Key",
    logout: "退出登录", keys: "Key 管理", dashboard: "返回看板", errorTitle: "操作失败",
    addTitle: "添加用户", username: "用户名", password: "登录密码", enabled: "启用", disabled: "已停用",
    permissions: "可查看的账号", addUser: "添加用户", listTitle: "用户列表",
    listSubtitle: "未授权的用户看不到任何账号额度", encrypted: "加密保存用户凭据",
    count: "数量", noUsers: "还没有创建用户", noAccounts: "当前没有可授权的账号", noPermissions: "未授权任何账号",
    editUser: "修改用户账号", replacementPassword: "新密码（留空则不修改）", editAction: "修改账号/密码",
    deleteAction: "删除用户", cancel: "取消", save: "保存修改",
    confirmDelete: "确定删除用户“{username}”？该用户会立即退出登录，且无法恢复。",
    duplicate: "这个用户名已经存在。", invalid: "请检查用户名、密码和账号授权。",
    unavailable: "用户服务暂时不可用。", deleted: "用户已删除。",
  },
  en: {
    eyebrow: "Access control", title: "Users and permissions", subtitle: "Manage login accounts and visible keys",
    logout: "Sign out", keys: "Key management", dashboard: "Dashboard", errorTitle: "Operation failed",
    addTitle: "Add user", username: "Username", password: "Login password", enabled: "Enabled", disabled: "Disabled",
    permissions: "Visible accounts", addUser: "Add user", listTitle: "Users",
    listSubtitle: "Users without assignments receive no account or quota data", encrypted: "Encrypted user credentials",
    count: "Count", noUsers: "No users yet", noAccounts: "No accounts are available to assign", noPermissions: "No accounts assigned",
    editUser: "Edit user account", replacementPassword: "New password (leave empty to keep current)", editAction: "Edit account/password",
    deleteAction: "Delete user", cancel: "Cancel", save: "Save changes",
    confirmDelete: "Delete user “{username}”? They will be signed out immediately and cannot be restored.",
    duplicate: "This username already exists.", invalid: "Check the username, password, and account assignments.",
    unavailable: "User management is temporarily unavailable.", deleted: "User deleted.",
  },
};

const addForm = document.querySelector("#user-add-form");
const addButton = document.querySelector("#user-add-button");
const addPermissions = document.querySelector("#user-permissions");
const userList = document.querySelector("#user-list");
const userCount = document.querySelector("#user-count");
const errorBanner = document.querySelector("#users-error");
const errorMessage = document.querySelector("#users-error-message");
const editDialog = document.querySelector("#user-edit-dialog");
const editForm = document.querySelector("#user-edit-form");
const editUsername = document.querySelector("#user-edit-username");
const editPassword = document.querySelector("#user-edit-password");
const editEnabled = document.querySelector("#user-edit-enabled");
const editPermissions = document.querySelector("#user-edit-permissions");
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
  document.title = locale === "zh" ? "OpenCode Go 用户管理" : "OpenCode Go user management";
  localStorage.setItem("opencode-go-locale", locale);
  document.querySelectorAll("[data-copy]").forEach((element) => { element.textContent = t(element.dataset.copy); });
  document.querySelectorAll("[data-locale]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.locale === locale));
  });
  renderPermissionChoices(addPermissions, selectedPermissionIds(addPermissions));
  renderPermissionChoices(editPermissions, selectedPermissionIds(editPermissions));
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

function renderPermissionChoices(container, selectedIds = []) {
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
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = account.id;
    checkbox.checked = selected.has(account.id);
    const text = document.createElement("span");
    text.textContent = `${account.label} (${account.maskedKey})`;
    label.append(checkbox, text);
    container.append(label);
  }
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

function renderUsers() {
  userList.replaceChildren();
  userCount.textContent = locale === "zh" ? `${t("count")}：${users.length}` : `${t("count")}: ${users.length}`;
  if (users.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = t("noUsers");
    userList.append(empty);
    return;
  }
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  for (const user of users) {
    const row = document.createElement("article");
    row.className = "user-row";
    const identity = document.createElement("div");
    identity.className = "user-identity";
    const username = document.createElement("strong");
    username.textContent = user.username;
    const status = document.createElement("span");
    status.className = `status-label${user.enabled ? "" : " is-disabled"}`;
    status.textContent = user.enabled ? t("enabled") : t("disabled");
    identity.append(username, status);
    const permissions = document.createElement("div");
    permissions.className = "user-permission-summary";
    const assigned = user.accountIds.map((id) => accountById.get(id)?.label).filter(Boolean);
    permissions.textContent = assigned.length ? assigned.join("、") : t("noPermissions");
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
    renderPermissionChoices(addPermissions, selectedPermissionIds(addPermissions));
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

setLocale(locale);
loadData();
