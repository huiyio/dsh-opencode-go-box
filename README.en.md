# OpenCode Go Balance Web

[中文](README.md) | English

A standalone Docker-ready multi-account OpenCode Go quota dashboard. It does not require DeepSeek Harness, Cordis, Typert, or a local OpenCode client.

- Add, edit, disable, and delete multiple API keys at `/admin`
- Select an account and inspect its 5-hour, weekly, and monthly quota
- Store keys in an AES-256-GCM encrypted Docker volume
- Keep plaintext keys out of browser responses, logs, and images
- Isolate request caches per account
- Show each enabled account's 5-hour, weekly, and monthly remaining quota in the admin list, with at most three concurrent upstream queries

The upstream API reports usage percentages rather than a monetary balance.

## Quick start

```sh
cp .env.example .env
openssl rand -base64 48
```

Set these values in `.env`:

```env
WEB_USERNAME=admin
WEB_PASSWORD=replace-with-a-long-random-password
KEY_ENCRYPTION_SECRET=paste-the-generated-random-value

# Optional read-only environment account
OPENCODE_GO_API_KEY=
```

Start the service:

```sh
docker compose up -d --build
```

- Dashboard: `http://your-server:3000/`
- Key management: `http://your-server:3000/admin`

The Compose stack stores `/data/keys.enc.json` in the `opencode-go-data` named volume. Do not change `KEY_ENCRYPTION_SECRET` after adding keys; an incorrect secret makes the encrypted store unreadable and startup fails closed.

Clicking “Test model” first loads the official OpenCode Go model list. The selected model is sent a minimal request only after confirmation.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `WEB_USERNAME` | empty | Web login username; required for admin. |
| `WEB_PASSWORD` | empty | Web login password; required for admin. |
| `KEY_ENCRYPTION_SECRET` | empty | At least 32 characters; required for encrypted key management. |
| `OPENCODE_GO_API_KEY` | empty | Optional read-only environment account. |
| `DATA_DIR` | `/data` | Encrypted data directory. |
| `PORT` | `3000` | Published host port. |
| `OPENCODE_USAGE_URL` | official usage endpoint | Trusted upstream URL. |
| `OPENCODE_MODEL_TEST_URL` | official model endpoint | Key test URL, defaulting to `/zen/go/v1/chat/completions`. |
| `OPENCODE_MODEL_LIST_URL` | official model list | Model list loaded by the admin test dialog, defaulting to `/zen/go/v1/models`. |
| `OPENCODE_MODEL_TEST_MODEL` | `hy3` | Compatibility fallback when no model is supplied; the normal admin flow lets the user choose a model. |
| `FETCH_TIMEOUT_MS` | `15000` | Upstream timeout. |
| `CACHE_TTL_MS` | `30000` | Successful per-account response cache. |
| `REFRESH_INTERVAL_MS` | `30000` | Browser refresh interval, minimum 10 seconds. |
| `WARN_PERCENT` | `60` | Used percentage warning threshold. |
| `DANGER_PERCENT` | `85` | Used percentage danger threshold. |

A custom `OPENCODE_USAGE_URL` receives every account's Bearer key and must be trusted.

## Endpoints

```text
GET    /                         Dashboard
GET    /admin                    Key management
GET    /api/accounts             Enabled account metadata
GET    /api/usage?account=<id>   Selected account quota
GET    /api/admin/accounts       All account metadata
GET    /api/admin/models         Official models available in the test dialog
POST   /api/admin/accounts       Add an account
PATCH  /api/admin/accounts/<id>  Edit, replace key, enable, or disable
DELETE /api/admin/accounts/<id>  Delete an account
POST   /api/admin/accounts/<id>/test  Send a minimal request using the selected model
GET    /healthz                  Health check
```

Key responses contain masked values only. Admin mutations require configured Basic Auth and accept JSON bodies up to 16 KiB.

## Backup

Back up both the Docker volume's `keys.enc.json` and `KEY_ENCRYPTION_SECRET`. Neither item can recover the keys by itself. Store them separately and never commit either to Git.

## Development

Node.js 22 or newer is required. There are no third-party runtime dependencies.

```sh
npm test
npm run check
```

For a persistent localhost-only preview, run:

```powershell
npm run preview
```

The first run creates random credentials and an encryption secret under the Git-ignored `.local-runtime` directory, preserving admin accounts across restarts. It listens only on `127.0.0.1:57726` and is not a replacement for the production Docker deployment.

Use HTTPS before public exposure because Basic Auth does not encrypt credentials over plain HTTP. The container runs as a non-root user with a read-only root filesystem; only `/data` is writable. The OpenCode Go usage endpoint is undocumented and may change.

## License

MIT
