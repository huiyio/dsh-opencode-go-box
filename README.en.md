# OpenCode Go Balance Web

[中文](README.md) | English

[![Docker image](https://github.com/huiyio/dsh-opencode-go-box/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/huiyio/dsh-opencode-go-box/actions/workflows/docker-publish.yml)

A standalone multi-account OpenCode Go quota dashboard deployable as either a Docker container or a Cloudflare Worker, with Web administration, encrypted key storage, and real model request tests. It does not require DeepSeek Harness, Cordis, Typert, or a local OpenCode client.

> [!IMPORTANT]
> This repository is an independent fork and derivative of [yascitom/dsh-opencode-go-box](https://github.com/yascitom/dsh-opencode-go-box) `v0.3.2`. It is not an official continuation and does not represent the upstream author or OpenCode. See [NOTICE.md](NOTICE.md) for attribution and responsibility boundaries and [LICENSE](LICENSE) for the governing license.

## Features

- Add, edit, disable, and delete multiple OpenCode Go API keys at `/admin`.
- Assign a persistent group to each key, filter by group, and sort group sections ascending or descending. Older keys without a group appear under `Ungrouped`.
- Show remaining and used percentages plus reset times for each 5-hour, 7-day, and 30-day window.
- Configure admin auto-refresh in seconds or minutes, persisted in the browser.
- Select an official model before sending a minimal real request to test a key.
- Docker encrypts keys with scrypt and AES-256-GCM; Workers uses HKDF-SHA256 and AES-256-GCM with D1.
- Use a username/password login page with an HttpOnly session cookie; Basic Auth remains available for scripts and legacy clients.
- Create, edit, disable, and delete viewer users, assigning account-level key visibility to each user. Unassigned users receive no account or quota data.
- Download encrypted account and user backups and restore them from the admin page.
- Set start and end dates per key, with optional automatic deletion after one calendar month.
- Support Chinese and English UI plus `linux/amd64` and `linux/arm64` images.

## Quota semantics

The OpenCode Go `/zen/go/v1/usage` endpoint reports usage percentages, not a monetary balance. The `usage.*.percent` field is the used percentage; this project calculates the remaining percentage as `100 - percent`. For example, an upstream value of `percent: 52` is shown as `Used 52%, Remaining 48%` in the admin UI.

The windows have different meanings: 5 hours is a rolling window, while 7 days and 30 days are period windows. `resetsAt` is the reset time for that window, not the key creation time or subscription start time. The endpoint does not expose a monetary balance, and this project does not infer one from fixed plan prices. If the upstream field semantics change, compare the raw response with the official page.

## Key lifecycle

Each stored key can be configured in the admin page with:

- `Starts`: before this date, the account is pending and cannot fetch quota or send a model test.
- `Ends`: the account expires on this date. Without automatic deletion, it remains visible in the admin page as expired.
- `Delete automatically after one month`: calculates one calendar month from the start date and deletes the key plus its usage cache at expiry. January 31, for example, becomes the last day of February.

Dates are stored as `YYYY-MM-DD` and evaluated in the `Asia/Shanghai` time zone. The Docker process and a Cloudflare Workers Cron both clean up every minute; platform scheduling can introduce a short delay. Existing accounts and older backups migrate with their original creation date as the start date and remain non-expiring with automatic deletion disabled. Automatic deletion is irreversible, so download an encrypted backup and retain the original `KEY_ENCRYPTION_SECRET` separately.

## Key groups

Enter a group name when adding or editing a key (up to 60 characters, without line breaks). Groups are stored in the Docker encrypted file or Workers D1 and survive page refreshes, container restarts, auto-refresh, and backup restore. The admin list provides an all-groups selector and three sort modes: default order (group sections with original order inside each group), group ascending, and group descending. Ungrouped keys remain last. The read-only environment key is never assigned to a group.

When upgrading an existing Workers deployment, back up D1 and apply the new remote migration (`0006_account_groups.sql`) before deploying the new code; old rows are treated as `Ungrouped`.

## Users and permissions

`WEB_USERNAME` / `WEB_PASSWORD` are the bootstrap system-administrator credentials. After an administrator saves a username or password at `/profile`, the administrator credential is stored persistently and encrypted; it retains full key, user, model-test, and backup access. Keys are managed at `/admin`; viewer users and account assignments have a dedicated `/users` page.

- Administrators can create, edit, disable, delete, rename, reset passwords, and change account assignments for viewer users.
- Viewers can use only the dashboard and `/profile`; they cannot access `/admin`, `/users`, or `/api/admin/*`.
- Viewers can change their own username or password at `/profile` after confirming the current password. Other existing sessions are invalidated after the change.
- `/api/accounts` returns only assigned active accounts.
- `/api/usage` checks the assignment again, so changing an account ID manually cannot bypass authorization.
- A user with no assignments receives an empty account list; the service never falls back to a global account.
- Disabling, deleting, renaming, or resetting a user password invalidates existing sessions on the next request. Re-enabling an account does not revive older sessions.
- Administrators and viewers can change their own username or password at `/profile` after confirming the current password. An administrator update invalidates every older administrator session; the administrator cannot be deleted.
- After administrator credentials are stored, environment credentials no longer log in by default. To recover access, temporarily set `WEB_ADMIN_RECOVERY=1`, restart Docker or redeploy the Worker, then use `WEB_USERNAME` / `WEB_PASSWORD` to sign in and reset the credentials. Remove the setting or return it to `0` immediately after recovery.
- Docker hashes passwords with scrypt inside an AES-256-GCM encrypted file. Workers stores salted HKDF/HMAC-SHA256 verifiers keyed from `KEY_ENCRYPTION_SECRET` in D1. Passwords and password hashes are never returned by the APIs.

## Deploy the published image

The recommended image is:

```text
ghcr.io/huiyio/dsh-opencode-go-box:latest
```

Docker Engine and Docker Compose v2 are required.

```sh
git clone https://github.com/huiyio/dsh-opencode-go-box.git
cd dsh-opencode-go-box
cp .env.example .env
openssl rand -base64 48
```

Set at least these values in `.env`:

```env
IMAGE_TAG=latest
WEB_USERNAME=admin
WEB_PASSWORD=replace-with-a-strong-password
KEY_ENCRYPTION_SECRET=paste-the-generated-random-value
PORT=3000
```

`KEY_ENCRYPTION_SECRET` must contain at least 32 characters. Do not change it after adding keys, or the encrypted store will become unreadable and startup will fail closed.

Start and verify:

```sh
chmod 600 .env
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100
curl http://127.0.0.1:3000/healthz
```

- Dashboard: `http://your-server:3000/`
- Key management: `http://your-server:3000/admin`
- User management: `http://your-server:3000/users`
- Profile: `http://your-server:3000/profile`

The browser prompts for `WEB_USERNAME` and `WEB_PASSWORD`. The first browser visit opens a login page and then uses an HttpOnly session cookie instead of relying on the browser-native Basic Auth dialog. Basic Auth remains compatible with scripts and legacy clients. `/healthz` remains unauthenticated for container health checks.

After bootstrap login, use `/profile` to change the administrator username or password. This creates the independent system-administrator credential and invalidates older sessions; the `.env` credentials become emergency recovery credentials only when `WEB_ADMIN_RECOVERY=1`.

## Deploy to Cloudflare Workers

The Workers and Docker deployments coexist and share the same UI and HTTP API, but their runtimes and key stores are independent. Existing Docker `/data/keys.enc.json` data is not migrated automatically; add the keys again at `/admin` after deploying the Worker.

Node.js 22, a Cloudflare account, and Wrangler authorization are required:

```sh
npm ci
npx wrangler login
npx wrangler d1 create opencode-go-balance
```

Add the returned `database_id` to `d1_databases[0]` in `wrangler.jsonc`, then initialize the remote database:

```sh
npx wrangler d1 migrations apply opencode-go-balance --remote
```

Existing Workers deployments must also apply the remote migrations before deploying this version. Lifecycle cleanup runs from the per-minute Cron in `wrangler.jsonc` and before dashboard or management API requests.

Set the three required secrets. Wrangler prompts securely; never place real values in `wrangler.jsonc` or Git:

```sh
npx wrangler secret put WEB_USERNAME
npx wrangler secret put WEB_PASSWORD
npx wrangler secret put KEY_ENCRYPTION_SECRET
```

Only when Web administrator credentials are lost, temporarily set `WEB_ADMIN_RECOVERY` to `1` and redeploy. Delete it or return it to `0` after recovery; do not retain it as a long-lived Worker Secret.

Alternatively, generate strong random credentials and upload them in bulk. The generated file is Git-ignored and contains both the login password and the master secret required to decrypt D1 keys, so keep it as a sensitive backup:

```sh
npm run worker:credentials
npx wrangler secret bulk worker-credentials.json
```

`KEY_ENCRYPTION_SECRET` must contain at least 32 characters and must not change after keys are added. An optional read-only environment account can be set with `npx wrangler secret put OPENCODE_GO_API_KEY`.

Deploy and verify:

```sh
npm run worker:dry-run
npx wrangler deploy
curl https://your-worker.example/healthz
```

- Dashboard: `https://your-worker.example/`
- Key management: `https://your-worker.example/admin`
- User management: `https://your-worker.example/users`
- Profile: `https://your-worker.example/profile`
- This deployment also uses the custom domain `https://go.llmhost.net/` and `https://go.llmhost.net/admin`. The `custom_domain` entry in `wrangler.jsonc` lets Cloudflare create the DNS record and issue the certificate automatically.
- `/healthz`, the login page assets, and the login endpoint are public so the browser can establish a session; the dashboard, admin page, and management APIs require a session cookie or Basic Auth. Workers provides HTTPS automatically. Use a strong password; Cloudflare Access can be added as an outer identity layer when needed.

For local development, copy `.dev.vars.example` to the Git-ignored `.dev.vars`, set test credentials, and run:

```sh
npm run worker:d1:local
npm run worker:dev
```

Worker accounts, encrypted keys, user permissions, and usage cache are stored in D1. Back up D1 before applying migrations to an existing deployment:

You can also click `Download backup` in `/admin` and later choose that JSON file with `Restore backup`. A current full backup includes accounts, encrypted keys, viewers, the system-administrator verifier, and permission assignments; the user portion is encrypted again with `KEY_ENCRYPTION_SECRET`. Restore replaces all accounts, users, and the system-administrator credential, and clears the usage cache. Legacy account-only backups remain accepted. Docker and Workers backup formats are intentionally incompatible.

```sh
npx wrangler d1 export opencode-go-balance --remote --output opencode-go-balance-backup.sql
npx wrangler d1 migrations apply opencode-go-balance --remote
npx wrangler deploy
```

Back up `KEY_ENCRYPTION_SECRET` separately. Neither the D1 export nor the secret can recover keys by itself.

## Image tags and updates

GitHub Actions publishes:

- `latest` and `sha-<short-commit>` for pushes to `main`;
- version tags for `v*` Git tags;
- manually dispatched builds from the Actions page.

Images include `linux/amd64` and `linux/arm64`, build provenance, and an SBOM. Production deployments should pin `IMAGE_TAG=sha-<short-commit>` after validation.

Available image tags:

https://github.com/huiyio/dsh-opencode-go-box/pkgs/container/dsh-opencode-go-box

Update or roll back by changing `IMAGE_TAG` and running:

```sh
docker compose pull
docker compose up -d
docker compose ps
```

The named data volume is not removed when the image changes.

## Docker configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `IMAGE_TAG` | `latest` | GHCR image tag used by Compose. |
| `WEB_USERNAME` | empty | Web login username; required by Compose. |
| `WEB_PASSWORD` | empty | Web login password; required by Compose. |
| `WEB_ADMIN_RECOVERY` | `0` | Set to `1` only for emergency recovery with the environment administrator credentials; return it to `0` afterwards. |
| `KEY_ENCRYPTION_SECRET` | empty | Key encryption secret, at least 32 characters; required by Compose. |
| `OPENCODE_GO_API_KEY` | empty | Optional read-only environment account; accounts can also be added in the admin UI. |
| `PORT` | `3000` | Published host port; the container listens on 3000. |
| `DATA_DIR` | `/data` | Encrypted data directory inside the container. |
| `FETCH_TIMEOUT_MS` | `15000` | Upstream request timeout. |
| `CACHE_TTL_MS` | `30000` | Successful per-account usage cache duration. |
| `REFRESH_INTERVAL_MS` | `30000` | Dashboard refresh interval, minimum 10 seconds. Admin refresh is set in the UI. |
| `WARN_PERCENT` | `60` | Used-percentage warning threshold. |
| `DANGER_PERCENT` | `85` | Used-percentage danger threshold. |
| `OPENCODE_USAGE_URL` | official endpoint | Usage endpoint. A custom endpoint receives Bearer keys and must be trusted. |
| `OPENCODE_MODEL_TEST_URL` | official endpoint | Model completion endpoint used by tests. |
| `OPENCODE_MODEL_LIST_URL` | official endpoint | Model list used by the test dialog. |
| `OPENCODE_MODEL_TEST_MODEL` | `hy3` | Compatibility fallback; the normal admin flow lets the user choose. |

## Data and backup

Compose uses the stable named volume `opencode-go-balance-data`; encrypted keys are stored at `/data/keys.enc.json`.

Back up the volume:

```sh
mkdir -p backup
docker run --rm \
  -v opencode-go-balance-data:/data:ro \
  -v "$PWD/backup:/backup" \
  alpine:3.22 sh -c 'tar -C /data -czf /backup/opencode-go-data.tgz .'
```

Back up `KEY_ENCRYPTION_SECRET` separately. Neither the encrypted file nor the secret can recover keys by itself.

Restore with the original secret:

```sh
docker compose down
docker volume create opencode-go-balance-data
docker run --rm \
  -v opencode-go-balance-data:/data \
  -v "$PWD/backup:/backup:ro" \
  alpine:3.22 sh -c 'tar -C /data -xzf /backup/opencode-go-data.tgz'
docker compose up -d
```

Do not run `docker compose down -v` unless permanent deletion of all account data is intended.

## Build from source

```sh
docker build -t opencode-go-balance-web:local .
docker volume create opencode-go-balance-data
docker run -d \
  --name opencode-go-balance \
  --restart unless-stopped \
  --env-file .env \
  -p 3000:3000 \
  -v opencode-go-balance-data:/data \
  opencode-go-balance-web:local
```

Local development requires Node.js 22 or newer:

```sh
npm run check
npm test
npm run preview
```

The preview listens only on `127.0.0.1:57726` and stores local data under the Git-ignored `.local-runtime` directory. It is not a replacement for a production Docker or Workers deployment.

## Endpoints

```text
GET    /                              Dashboard
GET    /admin                         Key management
GET    /users                         User and account assignment management
GET    /profile                       Current-user profile
GET    /api/me                        Current identity, role, and credential source
PATCH  /api/me                        Change the current user's username or password after password verification
GET    /api/accounts                  Enabled account metadata
GET    /api/usage?account=<id>        Selected account quota
GET    /api/admin/users               Users and account assignments
POST   /api/admin/users               Add a viewer user
PATCH  /api/admin/users/<id>          Edit user, reset password, enable, or assign accounts
DELETE /api/admin/users/<id>          Delete user and invalidate their session
GET    /api/admin/accounts            All account metadata
GET    /api/admin/models              Test-dialog model list
GET    /api/admin/backup              Download encrypted account and user backup
POST   /api/admin/restore             Restore encrypted account and user backup
POST   /api/admin/accounts            Add an account
PATCH  /api/admin/accounts/<id>       Edit, replace key, enable, or disable
DELETE /api/admin/accounts/<id>       Delete an account
POST   /api/admin/accounts/<id>/test  Send a minimal request using the selected model
GET    /healthz                       Public health check
```

All pages and APIs except `/healthz`, `/login`, and the login endpoint require a session cookie or Basic Auth. Viewer responses are filtered to assigned accounts, and administrator routes enforce the role on the server. Key-related responses contain masked values only; backup files contain encrypted ciphertext only.

## Security

- Use an HTTPS reverse proxy before public exposure; Basic Auth does not encrypt credentials over plain HTTP.
- The image runs as a non-root user. Compose uses a read-only root filesystem, drops Linux capabilities, and prevents privilege escalation.
- Only `/data` is writable. API keys are not written into the image, browser responses, or application logs.
- A model test sends a real request and can consume quota or trigger rate limits. It runs only after user confirmation.
- Restoring a backup replaces the current account and user lists and clears usage cache; verify the backup source and encryption secret first.
- Worker secrets, `worker-credentials.json`, `.dev.vars`, D1 exports, and Docker `.env` files must never be committed. Logs and responses never expose full keys.
- The OpenCode Go API may change; production operators must monitor compatibility.

## Origin, responsibility, and license

This fork has no official affiliation with or endorsement from the upstream author, OpenCode, DeepSeek, or DeepSeek Harness. Report upstream plugin issues and this fork's Docker/Web issues to their respective repositories. See [NOTICE.md](NOTICE.md).

The project is provided "AS IS" under the [MIT License](LICENSE), without express or implied warranties.
