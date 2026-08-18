const copy = {
  zh: {
    logout: "退出登录", users: "访问授权", dashboard: "额度观测", eyebrow: "账户安全", title: "账户安全",
    roleAdmin: "系统管理员", roleViewer: "普通用户", identity: "当前账号：{username} · {role}",
    editTitle: "更换登录凭据", username: "新用户名", currentPassword: "当前密码",
    newPassword: "新密码（不修改可留空）", confirmPassword: "确认新密码", save: "保存账户凭据",
    security: "账户安全", credentialKicker: "登录凭据", savedTitle: "修改成功", saved: "账号资料已更新，其他旧登录已失效。",
    errorTitle: "修改失败", currentInvalid: "当前密码不正确。", mismatch: "两次输入的新密码不一致。",
    duplicate: "这个用户名已经存在。", invalid: "用户名应为 3-64 个无空格字符，密码应为 8-128 个字符。",
    generic: "暂时无法修改，请稍后重试。",
  },
  en: {
    logout: "Sign out", users: "Access authorization", dashboard: "Quota view", eyebrow: "Account security", title: "Account security",
    roleAdmin: "Administrator", roleViewer: "Viewer", identity: "Current account: {username} · {role}",
    editTitle: "Rotate login credentials", username: "New username", currentPassword: "Current password",
    newPassword: "New password (leave empty to keep current)", confirmPassword: "Confirm new password", save: "Save account credentials",
    security: "Account security", credentialKicker: "Login credentials", savedTitle: "Updated", saved: "Your account was updated. Other existing sessions are now invalid.",
    errorTitle: "Update failed", currentInvalid: "The current password is incorrect.", mismatch: "The new passwords do not match.",
    duplicate: "This username already exists.", invalid: "Use a 3-64 character username without spaces and an 8-128 character password.",
    generic: "Unable to update the account right now. Try again later.",
  },
};

const form = document.querySelector("#profile-form");
const editor = document.querySelector("#profile-editor");
const usernameInput = document.querySelector("#profile-username");
const currentPassword = document.querySelector("#current-password");
const newPassword = document.querySelector("#new-password");
const confirmPassword = document.querySelector("#confirm-password");
const saveButton = document.querySelector("#profile-save");
const identitySummary = document.querySelector("#identity-summary");
const usersLink = document.querySelector("#users-link");
const adminLinks = document.querySelectorAll("[data-admin-link]");
const message = document.querySelector("#profile-message");
const messageTitle = document.querySelector("#profile-message-title");
const messageText = document.querySelector("#profile-message-text");

let locale = localStorage.getItem("opencode-go-locale") === "en" ? "en" : "zh";
let identity = null;

function t(key) { return copy[locale][key] || key; }

function renderIdentity() {
  if (!identity) return;
  const role = identity.role === "admin" ? t("roleAdmin") : t("roleViewer");
  identitySummary.textContent = t("identity").replace("{username}", identity.username).replace("{role}", role);
  usernameInput.value = identity.username;
  editor.hidden = !identity.canEditProfile;
  const isAdmin = identity.role === "admin";
  usersLink.hidden = !isAdmin;
  adminLinks.forEach((link) => { link.hidden = !isAdmin; });
}

function setLocale(next) {
  locale = next === "en" ? "en" : "zh";
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  document.title = locale === "zh" ? "OpenCode Go 账户安全" : "OpenCode Go account security";
  localStorage.setItem("opencode-go-locale", locale);
  document.querySelectorAll("[data-copy]").forEach((element) => { element.textContent = t(element.dataset.copy); });
  document.querySelectorAll("[data-locale]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.locale === locale)));
  renderIdentity();
}

function showMessage(kind, text) {
  message.classList.toggle("is-success", kind === "success");
  messageTitle.textContent = kind === "success" ? t("savedTitle") : t("errorTitle");
  messageText.textContent = text;
  message.hidden = false;
}

function errorText(code) {
  if (code === "current_password_invalid") return t("currentInvalid");
  if (code === "duplicate_username") return t("duplicate");
  if (["invalid_username", "invalid_password", "invalid_profile_update"].includes(code)) return t("invalid");
  return t("generic");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401 && path !== "/api/me") {
    if (payload?.error?.code === "authentication_required") window.location.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
  }
  if (!response.ok || !payload?.ok) throw payload?.error || { code: "invalid_response" };
  return payload;
}

async function loadIdentity() {
  try {
    const payload = await api("/api/me");
    identity = payload.user;
    renderIdentity();
  } catch (error) {
    if (error?.code === "authentication_required") window.location.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
    else showMessage("error", errorText(error?.code));
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.hidden = true;
  if (newPassword.value !== confirmPassword.value) {
    showMessage("error", t("mismatch"));
    return;
  }
  saveButton.disabled = true;
  try {
    const payload = await api("/api/me", {
      method: "PATCH",
      body: JSON.stringify({ username: usernameInput.value, currentPassword: currentPassword.value, password: newPassword.value }),
    });
    identity = payload.user;
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    renderIdentity();
    showMessage("success", t("saved"));
  } catch (error) {
    showMessage("error", errorText(error?.code));
  } finally {
    saveButton.disabled = false;
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", cache: "no-store" }).catch(() => {});
  window.location.replace("/login");
});
document.querySelectorAll("[data-locale]").forEach((button) => button.addEventListener("click", () => setLocale(button.dataset.locale)));

setLocale(locale);
loadIdentity();
