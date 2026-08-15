# dsh-opencode-go-usage

中文 | [English](README.en.md)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web-GUI 插件，在设置侧边栏新增 **OpenCode Go** 入口。点击即可查看你的 OpenCode Go 订阅的三个用量窗口 —— **5 小时滚动 / 每周 / 每月** —— 包括已用百分比、套餐参考限额和重置时间。

## 功能特性

- 设置侧边栏新增 **"OpenCode Go"** 栏目（`settings.section` 贡献）
- Host 端 Typert Remote `opencodeUsage/usage` 调用官方接口
- Client 用量页面：每个窗口的百分比、进度条、限额和重置时间
- 前置校验：若 **设置 → 模型** 中未添加 opencode-go，或未找到 API key，会显示引导说明而非报错
- API key 解析链：opencode-go provider 配置所声明的凭证引用（`apiKeyEnv`，通过 `llm` provider 目录动态发现）→ DSH 凭证层的常规引用 `OPENCODE_GO_API_KEY` → OpenCode 的 `auth.json`

## 安装

```sh
dsh plugin --profile web add github:yascitom/dsh-opencode-go-box
```

或从本地源码目录安装：

```sh
dsh plugin --profile web add file:/path/to/dsh-opencode-go-usage
```

本包声明了 `dsh.bundle.patch`，因此 `dsh plugin add` 会自动将其 reconcile 进
`dsh.profile.bundles` —— 无需手动修改 `cordis.patch.yml`。
安装后请重启 `dsh web`，让 Host 半部与托管的 Client bundle 生效。
该插件依赖标准 web bundle 组合（`api-gateway` Client Remote 与 `settings.section` slot）——默认的 `dsh web` profile 均包含。

## 配置

Host 端可调项位于插件行（`id: opencode-go-usage`）；在
`$DSH_HOME/profiles/web/cordis.patch.yml` 中覆盖：

```yaml
- id: opencode-go-usage
  config:
    baseUrl: https://opencode.ai/zen/go/v1/usage   # 默认值
    timeoutMs: 15000                                # 默认值
```

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `baseUrl` | `https://opencode.ai/zen/go/v1/usage` | 用量查询接口地址。 |
| `timeoutMs` | `15000` | 请求超时时间（毫秒）。 |

## 用量接口

```http
GET https://opencode.ai/zen/go/v1/usage
Authorization: Bearer <API_KEY>
```

`<API_KEY>` 即接入模型时已存储的 OpenCode Go key（`sk-opencode-…`）。接口返回：

```json
{
  "usage": {
    "rolling": { "status": "ok", "percent": 9,  "resetsAt": "…" },
    "weekly":  { "status": "ok", "percent": 12, "resetsAt": "…" },
    "monthly": { "status": "ok", "percent": 6,  "resetsAt": "…" }
  }
}
```

`percent` 取值 0–100；`resetsAt` 为 ISO-8601 时间。该接口尚未出现在 OpenCode 的公开文档中。

## 目录结构

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半部 —— `OpencodeUsageGateway`（`TypertRemoteService`，服务键 `opencodeUsage`） |
| `typert.host.js` | 手写 Typert Host 清单，通过 `exports["./typert"]` 注册 |
| `client.js` | `window.__ModuleLoader__.load` 格式的浏览器 bundle —— 挂载 Remote、注册栏目、渲染页面 |
| `cordis.patch.yml` | Bundle patch，插入插件行（`id: opencode-go-usage`） |
| `package.json` | 双面声明：`main` + `exports["./client"]` + `exports["./typert"]` + `dsh.client` + `dsh.bundle` |

## 已知限制

- 用量接口未公开文档，可能变更；解析做了防御性处理，非 200 响应会以友好状态提示而非崩溃。
- 限额（$12 / $30 / $60）仅作展示参考，并非接口返回内容；它们随 OpenCode Go 套餐而定，可能漂移。

## License

MIT
