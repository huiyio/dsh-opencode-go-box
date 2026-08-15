# dsh-opencode-go-usage

[中文](README.md) | English

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web-GUI plugin for users connected to **OpenCode Go** models:

- **Quota windows**: the subscription's three usage windows — **5-hour rolling / weekly / monthly** — with percent used, the reference plan limit, and reset time;
- **DSH session details**: token usage of every DeepSeek Harness session that used an opencode-go model, drillable down to **every model call** (turn/step level);
- **Composer dock widget**: a live one-line quota readout under the composer (30s polling) that changes color by threshold.

## Features

- Settings sidebar section **"OpenCode Go"** (a `settings.section` contribution) with two tabs: **Quota** and **DSH sessions**
- Host-side Typert Remote `opencodeUsage` with three methods: `usage` / `dshUsage` / `dshSessionMessages`
- **The DSH session details come entirely from DeepSeek Harness session logs** (every `assistant/message` event carries token accounting) — no local OpenCode client required, works on any DSH deployment
- Composer dock widget (a `conversation.composer.dock` contribution): `🟢 5h 22% · Weekly 13% · Monthly 13% · resets 2h13m`, colored by the 5-hour rolling window thresholds (default: <60% green / 60–85% orange / ≥85% red)
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
    warnPercent: 60                                 # default: orange at 60%+
    dangerPercent: 85                               # default: red at 85%+
    maxSessions: 30                                 # default: max sessions scanned for DSH details
```

| Key | Default | Meaning |
| --- | --- | --- |
| `baseUrl` | `https://opencode.ai/zen/go/v1/usage` | The usage endpoint. |
| `timeoutMs` | `15000` | Fetch timeout in milliseconds. |
| `warnPercent` | `60` | 5-hour rolling percent at which the dock widget turns orange. |
| `dangerPercent` | `85` | 5-hour rolling percent at which the dock widget turns red. |
| `maxSessions` | `30` | Upper bound on recent sessions scanned for DSH session details. |

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
| `client.js` | Browser bundle in `window.__ModuleLoader__.load` format — mounts the Remote, registers the section and the dock widget, renders the pages |
| `cordis.patch.yml` | Bundle patch inserting the plugin row (`id: opencode-go-usage`) |
| `package.json` | Dual-face declaration: `main` + `exports["./client"]` + `exports["./typert"]` + `dsh.client` + `dsh.bundle` |

## Known limitations

- The usage endpoint is undocumented and may change; parsing is defensive, and non-200 responses surface as a friendly status rather than a crash.
- Quota limits ($12 / $30 / $60) are shown for context only and are not part of the response; they follow the OpenCode Go plan and can drift.
- DSH session details report token accounting from DSH session logs (no cost amounts) and only cover conversations inside DeepSeek Harness.

## License

MIT
