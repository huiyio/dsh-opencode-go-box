# dsh-opencode-go-usage

English | [中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web-GUI plugin that adds an **OpenCode Go** entry to the Settings sidebar. Click it to see your OpenCode Go subscription's three usage windows — **5-hour rolling / weekly / monthly** — with percent used, the reference plan limit, and reset time.

## Features

- Settings sidebar section **"OpenCode Go"** (a `settings.section` contribution)
- Host-side Typert Remote `opencodeUsage/usage` calls the official endpoint
- Client usage page: per-window percent, progress bar, limit, and reset time
- Precondition check: if opencode-go is missing from **Settings → Models**, or no API key is found, it shows guidance instead of an error
- API key resolution: the credential reference the opencode-go provider profile declares (`apiKeyEnv`, discovered through the `llm` provider directory), then the conventional `OPENCODE_GO_API_KEY` from the DSH credentials seam, then OpenCode's `auth.json`

## Install

```sh
dsh plugin --profile web add github:yascitom/dsh-opencode-go-box
```

Or from a local source checkout:

```sh
dsh plugin --profile web add file:/path/to/dsh-opencode-go-usage
```

The package declares `dsh.bundle.patch`, so `dsh plugin add` reconciles it into
`dsh.profile.bundles` automatically — no manual `cordis.patch.yml` row needed.
Restart `dsh web` so the host half and the served client bundle pick up the plugin.
The plugin needs the standard web bundle composition (the `api-gateway` client
Remote and the `settings.section` slot) — the default `dsh web` profile has both.

## Configuration

Host-side tunables live on the plugin row (`id: opencode-go-usage`); override in
`$DSH_HOME/profiles/web/cordis.patch.yml`:

```yaml
- id: opencode-go-usage
  config:
    baseUrl: https://opencode.ai/zen/go/v1/usage   # default
    timeoutMs: 15000                                # default
```

| Key | Default | Meaning |
| --- | --- | --- |
| `baseUrl` | `https://opencode.ai/zen/go/v1/usage` | The usage endpoint. |
| `timeoutMs` | `15000` | Fetch timeout in milliseconds. |

## The usage endpoint

```http
GET https://opencode.ai/zen/go/v1/usage
Authorization: Bearer <API_KEY>
```

`<API_KEY>` is the OpenCode Go key (`sk-opencode-…`) already stored when the
model was connected. The endpoint returns:

```json
{
  "usage": {
    "rolling": { "status": "ok", "percent": 9,  "resetsAt": "…" },
    "weekly":  { "status": "ok", "percent": 12, "resetsAt": "…" },
    "monthly": { "status": "ok", "percent": 6,  "resetsAt": "…" }
  }
}
```

`percent` is 0–100; `resetsAt` is ISO-8601. The endpoint is not yet in OpenCode's public docs.

## Layout

| File | Role |
| --- | --- |
| `index.js` | Host half — `OpencodeUsageGateway` (`TypertRemoteService`, service key `opencodeUsage`) |
| `typert.host.js` | Hand-written Typert host manifest, registered via `exports["./typert"]` |
| `client.js` | Browser bundle in `window.__ModuleLoader__.load` format — mounts the Remote, registers the section, renders the page |
| `cordis.patch.yml` | Bundle patch inserting the plugin row (`id: opencode-go-usage`) |
| `package.json` | Dual-face declaration: `main` + `exports["./client"]` + `exports["./typert"]` + `dsh.client` + `dsh.bundle` |

## Known limitations

- The usage endpoint is undocumented and may change; parsing is defensive, and non-200 responses surface as a friendly status rather than a crash.
- Quota limits ($12 / $30 / $60) are shown for context only and are not part of the response; they follow the OpenCode Go plan and can drift.

## License

MIT
