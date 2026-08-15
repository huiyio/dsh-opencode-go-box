# dsh-opencode-go-usage

中文 | [English](README.en.md)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web-GUI 插件，为接入 **OpenCode Go** 模型的用户提供完整用量观测：

- **额度窗口**：5 小时滚动 / 每周 / 每月 三个窗口的已用百分比、套餐参考限额和重置时间；
- **DSH 会话明细**：DeepSeek Harness 中每个使用 opencode-go 模型的会话的 token 用量，并可下钻到**每一次模型调用**（turn/step 级）；
- **底栏常驻挂件**：输入框下方一行实时额度（30s 轮询），按阈值自动变色。

## 功能特性

- 设置侧边栏新增 **"OpenCode Go"** 栏目（`settings.section` 贡献），内含「额度」「DSH 会话明细」两个标签页
- Host 端 Typert Remote `opencodeUsage`：`usage` / `dshUsage` / `dshSessionMessages` 三个方法
- **DSH 会话明细完全基于 DeepSeek Harness 自身的会话日志**（每条 `assistant/message` 事件自带 token 记账），不依赖本机是否安装 OpenCode 客户端，任何 DSH 部署都能用
- 底栏挂件（`conversation.composer.dock` 贡献）：`🟢 5h 22% · 每周 13% · 每月 13% · 重置 2h13m`，按 5 小时滚动窗口阈值变色（默认 <60% 绿 / 60–85% 橙 / ≥85% 红）
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
    warnPercent: 60                                 # 默认值：≥60% 变橙
    dangerPercent: 85                               # 默认值：≥85% 变红
    maxSessions: 30                                 # 默认值：DSH 明细最多扫描的会话数
```

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `baseUrl` | `https://opencode.ai/zen/go/v1/usage` | 用量查询接口地址。 |
| `timeoutMs` | `15000` | 请求超时时间（毫秒）。 |
| `warnPercent` | `60` | 5 小时滚动窗口达到该百分比后挂件变橙。 |
| `dangerPercent` | `85` | 5 小时滚动窗口达到该百分比后挂件变红。 |
| `maxSessions` | `30` | DSH 会话明细扫描的最近会话数上限。 |

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
| `client.js` | `window.__ModuleLoader__.load` 格式的浏览器 bundle —— 挂载 Remote、注册栏目与底栏挂件、渲染页面 |
| `cordis.patch.yml` | Bundle patch，插入插件行（`id: opencode-go-usage`） |
| `package.json` | 双面声明：`main` + `exports["./client"]` + `exports["./typert"]` + `dsh.client` + `dsh.bundle` |

## 已知限制

- 用量接口未公开文档，可能变更；解析做了防御性处理，非 200 响应会以友好状态提示而非崩溃。
- 限额（$12 / $30 / $60）仅作展示参考，并非接口返回内容；它们随 OpenCode Go 套餐而定，可能漂移。
- DSH 会话明细统计的是 DSH 会话日志中的 token 记账（不含花费金额），只覆盖 DeepSeek Harness 内的对话。

## License

MIT
