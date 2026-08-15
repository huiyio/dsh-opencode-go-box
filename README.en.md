# OpenCode Go Balance Web

[中文](README.md) | English

[![Docker image](https://github.com/huiyio/dsh-opencode-go-box/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/huiyio/dsh-opencode-go-box/actions/workflows/docker-publish.yml)

A standalone multi-account OpenCode Go quota dashboard deployable as either a Docker container or a Cloudflare Worker, with Web administration, encrypted key storage, and real model request tests. It does not require DeepSeek Harness, Cordis, Typert, or a local OpenCode client.

> [!IMPORTANT]
> This repository is an independent fork and derivative of [yascitom/dsh-opencode-go-box](https://github.com/yascitom/dsh-opencode-go-box) `v0.3.2`. It is not an official continuation and does not represent the upstream author or OpenCode. See [NOTICE.md](NOTICE.md) for attribution and responsibility boundaries and [LICENSE](LICENSE) for the governing license.

## Features

- Add, edit, disable, and delete multiple OpenCode Go API keys at `/admin`.
- Show 5-hour, 7-day, and 30-day remaining quota and reset times for every account.
- Configure admin auto-refresh in seconds or minutes, persisted in the browser.
- Select an official model before sending a minimal real request to test a key.
- Docker encrypts keys with scrypt and AES-256-GCM; Workers uses HKDF-SHA256 and AES-256-GCM with D1.
- Protect the Web UI and APIs with environment-configured Basic Auth.
- Support Chinese and English UI plus `linux/amd64` and `linux/arm64` images.

The upstream API reports usage percentages, not a monetary balance.

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

The browser prompts for `WEB_USERNAME` and `WEB_PASSWORD`. `/healthz` remains unauthenticated for container health checks.

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

Set the three required secrets. Wrangler prompts securely; never place real values in `wrangler.jsonc` or Git:

```sh
npx wrangler secret put WEB_USERNAME
npx wrangler secret put WEB_PASSWORD
npx wrangler secret put KEY_ENCRYPTION_SECRET
```

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
- `/healthz` is public; every other page, script, stylesheet, and API passes through Basic Auth.
- Workers provides HTTPS automatically. Use a strong password; Cloudflare Access can be added as an outer identity layer when needed.

For local development, copy `.dev.vars.example` to the Git-ignored `.dev.vars`, set test credentials, and run:

```sh
npm run worker:d1:local
npm run worker:dev
```

Worker accounts, encrypted keys, and usage cache are stored in D1. Ensure the export path cannot be committed before backing up:

```sh
npx wrangler d1 export opencode-go-balance --remote --output opencode-go-balance-backup.sql
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
GET    /api/accounts                  Enabled account metadata
GET    /api/usage?account=<id>        Selected account quota
GET    /api/admin/accounts            All account metadata
GET    /api/admin/models              Test-dialog model list
POST   /api/admin/accounts            Add an account
PATCH  /api/admin/accounts/<id>       Edit, replace key, enable, or disable
DELETE /api/admin/accounts/<id>       Delete an account
POST   /api/admin/accounts/<id>/test  Send a minimal request using the selected model
GET    /healthz                       Public health check
```

All pages and APIs except `/healthz` require Basic Auth. Key-related responses contain masked values only.

## Security

- Use an HTTPS reverse proxy before public exposure; Basic Auth does not encrypt credentials over plain HTTP.
- The image runs as a non-root user. Compose uses a read-only root filesystem, drops Linux capabilities, and prevents privilege escalation.
- Only `/data` is writable. API keys are not written into the image, browser responses, or application logs.
- A model test sends a real request and can consume quota or trigger rate limits. It runs only after user confirmation.
- Worker secrets, `worker-credentials.json`, `.dev.vars`, D1 exports, and Docker `.env` files must never be committed. Logs and responses never expose full keys.
- The OpenCode Go API may change; production operators must monitor compatibility.

## Origin, responsibility, and license

This fork has no official affiliation with or endorsement from the upstream author, OpenCode, DeepSeek, or DeepSeek Harness. Report upstream plugin issues and this fork's Docker/Web issues to their respective repositories. See [NOTICE.md](NOTICE.md).

The project is provided "AS IS" under the [MIT License](LICENSE), without express or implied warranties.
