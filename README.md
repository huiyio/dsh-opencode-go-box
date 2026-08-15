# OpenCode Go Balance Web

中文 | [English](README.en.md)

[![Docker image](https://github.com/huiyio/dsh-opencode-go-box/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/huiyio/dsh-opencode-go-box/actions/workflows/docker-publish.yml)

独立的 OpenCode Go 多账号额度看板，可部署为 Docker 容器或 Cloudflare Worker，提供 Web 管理后台、加密 Key 存储和真实模型请求测试。不依赖 DeepSeek Harness、Cordis、Typert 或本机 OpenCode 客户端。

> [!IMPORTANT]
> 本仓库是基于 [yascitom/dsh-opencode-go-box](https://github.com/yascitom/dsh-opencode-go-box) `v0.3.2` 的 Fork 和独立改造，不是上游官方续作，也不代表上游作者或 OpenCode 官方。来源、改造范围、责任边界和免责声明见 [NOTICE.md](NOTICE.md)，许可条款见 [LICENSE](LICENSE)。

## 功能

- 在 `/admin` 添加、编辑、启停和删除多个 OpenCode Go API Key。
- 每个账号显示 5 小时、7 天和 30 天窗口的剩余百分比、已用百分比及重置时间。
- 后台支持按秒或分钟设置自动刷新，设置保存在当前浏览器。
- 从官方模型列表选择模型，再发送最小真实请求测试 Key 是否可调用。
- Docker 使用 scrypt + AES-256-GCM 加密文件；Workers 使用 HKDF-SHA256 + AES-256-GCM 加密后保存到 D1。
- 浏览器使用账号密码登录页和 HttpOnly 会话 Cookie；Basic Auth 仍兼容命令行和旧客户端。
- 后台可下载加密账号备份，也可上传备份恢复账号。
- 每个 Key 可设置开通日期和结束日期，也可选择一个日历月后到期自动删除。
- 提供中文和英文界面，支持 `linux/amd64` 和 `linux/arm64` 镜像。

## 额度口径

OpenCode Go `/zen/go/v1/usage` 接口返回的是用量百分比，不是货币余额。接口字段 `usage.*.percent` 表示已用比例；本项目按 `100 - percent` 计算并显示剩余比例。例如接口返回 `percent: 52` 时，后台显示“已用 52%，剩余 48%”。

三个窗口的含义不同：5 小时是滚动窗口，7 天和 30 天是周期窗口。`resetsAt` 是对应窗口的重置时间，不代表 Key 添加时间或订阅开通时间。接口没有公开货币余额字段，本项目不会根据固定套餐金额推算余额；如果上游调整字段含义，应以原始接口响应和官方页面为准。

## Key 生命周期

后台添加或编辑 Key 时可设置：

- `开通日期`：日期未到时账号显示“待开通”，不会查询额度或发送模型测试请求。
- `结束日期`：到达该日期时账号失效。未开启自动删除时，账号仍保留在后台并显示“已到期”。
- `一个月到期自动删除`：以开通日期为起点计算一个日历月，到期后删除 Key 和对应额度缓存。例如 1 月 31 日会计算为 2 月最后一天。

日期按 `YYYY-MM-DD` 保存并以 `Asia/Shanghai` 日期为准。Docker 进程和 Cloudflare Workers Cron 都每分钟清理一次；受平台调度影响，实际删除可能有短暂延迟。旧账号和旧备份升级后默认使用原添加日期作为开通日期，并保持“不过期、不自动删除”。自动删除属于不可恢复操作，生产环境应先下载加密备份并单独保管原 `KEY_ENCRYPTION_SECRET`。

## 使用预构建镜像

推荐使用 GitHub Container Registry 上的镜像：

```text
ghcr.io/huiyio/dsh-opencode-go-box:latest
```

要求服务器已安装 Docker Engine 和 Docker Compose v2。

### 1. 下载部署文件

```sh
git clone https://github.com/huiyio/dsh-opencode-go-box.git
cd dsh-opencode-go-box
cp .env.example .env
```

### 2. 生成加密主密钥

Linux：

```sh
openssl rand -base64 48
```

Windows PowerShell：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

### 3. 配置环境变量

编辑 `.env`，至少填写：

```env
IMAGE_TAG=latest
WEB_USERNAME=admin
WEB_PASSWORD=替换成强密码
KEY_ENCRYPTION_SECRET=粘贴上一步生成的随机值
PORT=3000
```

`KEY_ENCRYPTION_SECRET` 至少 32 个字符。添加 Key 后不要更换它，否则已有加密数据无法解密，服务会拒绝启动。

### 4. 启动

```sh
chmod 600 .env
docker compose pull
docker compose up -d
```

检查状态：

```sh
docker compose ps
docker compose logs --tail=100
curl http://127.0.0.1:3000/healthz
```

访问：

- 看板：`http://服务器地址:3000/`
- Key 管理：`http://服务器地址:3000/admin`

浏览器会要求输入 `.env` 中的 `WEB_USERNAME` 和 `WEB_PASSWORD`。首次访问会打开登录页，成功后使用 HttpOnly 会话 Cookie，不再依赖浏览器原生 Basic Auth 弹窗；Basic Auth 仍可用于脚本请求和旧客户端。`/healthz` 专门用于容器健康检查，不要求认证。

## 部署到 Cloudflare Workers

Workers 版与 Docker 版并存，复用同一套 Web UI 和 HTTP API，但运行时和 Key 存储互相独立。Docker 中已有的 `/data/keys.enc.json` 不会自动迁移到 D1；部署 Worker 后需要在 `/admin` 重新添加 Key。

要求 Node.js 22、Cloudflare 账号和 Wrangler 登录权限。Fork 本仓库后执行：

```sh
npm ci
npx wrangler login
npx wrangler d1 create opencode-go-balance
```

首次创建 D1 后，将命令返回的 `database_id` 写入 `wrangler.jsonc` 的 `d1_databases[0]`，然后初始化远程数据库：

```sh
npx wrangler d1 migrations apply opencode-go-balance --remote
```

已有 Workers 部署升级时也必须先执行上述远程迁移，再部署新代码。生命周期清理由 `wrangler.jsonc` 中每分钟运行的 Cron 触发，同时也会在看板和管理 API 请求前执行。

配置三个必需 Secret。命令会在终端中安全提示输入，不要把实际值写进 `wrangler.jsonc` 或提交到 Git：

```sh
npx wrangler secret put WEB_USERNAME
npx wrangler secret put WEB_PASSWORD
npx wrangler secret put KEY_ENCRYPTION_SECRET
```

也可以生成一套随机强凭据并批量上传。生成文件已被 Git 忽略，包含登录密码和解密 D1 Key 所需的主密钥，必须作为敏感备份保管：

```sh
npm run worker:credentials
npx wrangler secret bulk worker-credentials.json
```

`KEY_ENCRYPTION_SECRET` 至少 32 个字符，添加 Key 后不得更换。可选的只读环境账号可通过 `npx wrangler secret put OPENCODE_GO_API_KEY` 配置。

部署并检查：

```sh
npm run worker:dry-run
npx wrangler deploy
curl https://你的-worker地址/healthz
```

- 看板：`https://你的-worker地址/`
- Key 管理：`https://你的-worker地址/admin`
- `/healthz`、登录页面、登录脚本和样式可匿名加载；登录接口用于建立会话。看板、后台和管理 API 需要会话 Cookie 或 Basic Auth。Workers 自动提供 HTTPS；仍应使用强密码。需要更严格的身份策略时可在外层再配置 Cloudflare Access。

本地开发可复制 `.dev.vars.example` 为 Git 忽略的 `.dev.vars`，填写测试凭据后运行：

```sh
npm run worker:d1:local
npm run worker:dev
```

Workers 版的账号、加密 Key 和用量缓存存储在 D1。备份前先确认导出文件不会被提交：

也可以直接在 `/admin` 点击“下载备份”保存 JSON 文件，或点击“恢复备份”选择之前下载的文件。恢复会覆盖当前部署中的全部账号，并清空用量缓存；只接受相同部署类型且能用当前 `KEY_ENCRYPTION_SECRET` 校验的加密备份。Docker 和 Workers 备份格式不互通。

```sh
npx wrangler d1 export opencode-go-balance --remote --output opencode-go-balance-backup.sql
```

还必须单独安全备份 `KEY_ENCRYPTION_SECRET`；只有 D1 导出文件或只有主密钥都无法恢复 Key。

## 镜像版本

GitHub Actions 在以下情况自动构建并发布镜像：

- 推送到 `main`：发布 `latest` 和 `sha-<提交短哈希>`。
- 推送 `v*` 标签：同时发布版本号标签。
- 在 Actions 页面手动运行工作流。

镜像包含 `linux/amd64` 和 `linux/arm64`，并附带构建来源证明和 SBOM。

生产环境建议固定 `IMAGE_TAG=sha-<提交短哈希>`，验证后再升级。查看可用标签：

https://github.com/huiyio/dsh-opencode-go-box/pkgs/container/dsh-opencode-go-box

## 更新与回滚

更新到 `.env` 指定的标签：

```sh
docker compose pull
docker compose up -d
docker compose ps
```

回滚时将 `.env` 的 `IMAGE_TAG` 改为之前使用的 `sha-*` 标签，再执行相同命令。数据卷不会因更换容器镜像而删除。

## Docker 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `IMAGE_TAG` | `latest` | Compose 拉取的 GHCR 镜像标签。 |
| `WEB_USERNAME` | 空 | Web 登录用户名；Compose 部署必填。 |
| `WEB_PASSWORD` | 空 | Web 登录密码；Compose 部署必填。 |
| `KEY_ENCRYPTION_SECRET` | 空 | Key 存储主密钥，至少 32 字符；Compose 部署必填。 |
| `OPENCODE_GO_API_KEY` | 空 | 可选的只读环境变量账号，也可在后台添加账号。 |
| `PORT` | `3000` | 宿主机发布端口；容器内固定为 3000。 |
| `DATA_DIR` | `/data` | 容器内加密数据目录。 |
| `FETCH_TIMEOUT_MS` | `15000` | 上游请求超时。 |
| `CACHE_TTL_MS` | `30000` | 每个账号的成功用量响应缓存时间。 |
| `REFRESH_INTERVAL_MS` | `30000` | 前台看板自动刷新间隔，最小 10 秒。后台间隔在页面上设置。 |
| `WARN_PERCENT` | `60` | 已用比例达到该值时显示警告。 |
| `DANGER_PERCENT` | `85` | 已用比例达到该值时显示危险。 |
| `OPENCODE_USAGE_URL` | 官方用量接口 | 一般无需修改。自定义地址会接收账号 Bearer Key，只能使用可信服务。 |
| `OPENCODE_MODEL_TEST_URL` | 官方模型接口 | 模型测试请求地址。 |
| `OPENCODE_MODEL_LIST_URL` | 官方模型列表 | 测试弹窗的模型列表地址。 |
| `OPENCODE_MODEL_TEST_MODEL` | `hy3` | 未提供模型时的兼容默认值；后台正常流程由用户选择。 |

## 数据与备份

Compose 使用固定命名卷 `opencode-go-balance-data`，Key 数据位于卷内的 `/data/keys.enc.json`。

备份数据卷：

```sh
mkdir -p backup
docker run --rm \
  -v opencode-go-balance-data:/data:ro \
  -v "$PWD/backup:/backup" \
  alpine:3.22 sh -c 'tar -C /data -czf /backup/opencode-go-data.tgz .'
```

必须同时备份 `.env` 中的 `KEY_ENCRYPTION_SECRET`。数据文件和加密主密钥缺少任意一个都无法恢复 Key，不要将它们存放在同一个公开位置。

恢复前停止服务，并确保使用原来的 `KEY_ENCRYPTION_SECRET`：

```sh
docker compose down
docker volume create opencode-go-balance-data
docker run --rm \
  -v opencode-go-balance-data:/data \
  -v "$PWD/backup:/backup:ro" \
  alpine:3.22 sh -c 'tar -C /data -xzf /backup/opencode-go-data.tgz'
docker compose up -d
```

`docker compose down` 不会删除数据卷；不要使用 `docker compose down -v`，除非明确要永久删除所有账号数据。

## 从源码构建

预构建镜像不可用或需要审核修改时，可以本地构建：

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

本地开发需要 Node.js 22 或更高版本：

```sh
npm run check
npm test
npm run preview
```

`npm run preview` 只监听 `127.0.0.1:57726`，并在 Git 忽略的 `.local-runtime` 中保存本地预览数据，不代替正式 Docker 或 Workers 部署。

## HTTP 接口

```text
GET    /                              Web 看板
GET    /admin                         Key 管理后台
GET    /api/accounts                  可用账号元数据
GET    /api/usage?account=<id>        指定账号额度
GET    /api/admin/accounts            全部账号元数据
GET    /api/admin/models              测试弹窗可选模型
GET    /api/admin/backup              下载加密账号备份
POST   /api/admin/restore             恢复加密账号备份
POST   /api/admin/accounts            添加账号
PATCH  /api/admin/accounts/<id>       编辑、换 Key 或启停
DELETE /api/admin/accounts/<id>       删除账号
POST   /api/admin/accounts/<id>/test  按所选模型发送最小测试请求
GET    /healthz                       匿名健康检查
```

除 `/healthz`、`/login` 和登录接口外，所有页面和接口都受会话 Cookie 或 Basic Auth 保护。所有 Key 相关响应只返回掩码，不返回明文；备份文件也只包含加密密文。

## 安全说明

- 公网部署必须在容器前配置 HTTPS 反向代理；Basic Auth 在纯 HTTP 下不会加密密码。
- 镜像以非 root 用户运行；Compose 使用只读根文件系统、丢弃 Linux capabilities 并禁止提权。
- 只有 `/data` 数据卷可写，API Key 不会写入镜像、浏览器响应或应用日志。
- “测试模型”会发送真实模型请求，可能消耗额度并触发限流；只有用户确认后才会发送。
- 恢复备份会覆盖当前账号列表，执行前应确认备份来源和主密钥；额度缓存会在恢复后清空。
- Workers Secret、`worker-credentials.json`、`.dev.vars`、D1 导出文件和 Docker `.env` 都不得提交到 Git；日志和响应不会输出完整 Key。
- OpenCode Go 接口格式或地址未来可能变化，生产使用者应自行监控。

## 来源、责任与许可

本 Fork 与上游作者、OpenCode、DeepSeek 或 DeepSeek Harness 没有官方隶属或背书关系。上游代码问题和本 Fork 的 Docker/Web 改造问题应分别向对应仓库反馈。完整说明见 [NOTICE.md](NOTICE.md)。

本项目依据 [MIT License](LICENSE) 按“原样”提供，不作任何明示或默示担保。
