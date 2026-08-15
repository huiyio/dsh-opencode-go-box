const form = document.querySelector("#login-form");
const username = document.querySelector("#login-username");
const password = document.querySelector("#login-password");
const submit = document.querySelector("#login-submit");
const error = document.querySelector("#login-error");

const requestedNext = new URL(window.location.href).searchParams.get("next") || "/";
const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submit.disabled = true;
  error.hidden = true;
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.value, password: password.value, next }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error("login_failed");
    window.location.replace(payload.next || next);
  } catch {
    error.hidden = false;
    password.select();
    submit.disabled = false;
  }
});

username.focus();
