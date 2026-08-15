# OpenCode Go Balance Web

中文 | [English](README.en.md)

一个完全独立、可用 Docker 部署的 OpenCode Go 多账号额度看板。不依赖 DeepSeek Harness、Cordis、Typert 或本机 OpenCode 客户端。

- 在 `/admin` 后台添加、编辑、启停和删除多个 API Key
- 前台按账号查看 5 小时、每周、每月用量和剩余百分比
- Key 使用 AES-256-GCM 加密后保存到 Docker 数据卷
- Key 明文不会返回浏览器、写入日志或落入镜像
- 每个账号独立缓存，支持手动刷新和中英文界面

> OpenCode Go 接口返回的是用量百分比，不是货币余额。本项目不会使用固定套餐金额推算余额。

## 快速部署

创建配置文件：

```sh
cp .env.example .env
```

生成加密主密钥：

```sh
openssl rand -base64 48
```

填写 `.env`：

```env
WEB_USERNAME=admin
WEB_PASSWORD=replace-with-a-long-random-password
KEY_ENCRYPTION_SECRET=粘贴上面生成的随机值

# 可选：保留一个由环境变量管理、后台不可编辑的账号
OPENCODE_GO_API_KEY=
```

启动：

```sh
docker compose up -d --build
```

访问地址：

- 看板：`http://服务器地址:3000/`
- Key 管理：`http://服务器地址:3000/admin`

Compose 会创建 `opencode-go-data` 命名卷，保存 `/data/keys.enc.json`。

## Windows 生成主密钥

PowerShell：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

`KEY_ENCRYPTION_SECRET` 至少需要 32 个字符。添加 Key 后不要直接更换它，否则已有密文无法解密，服务会拒绝启动。

## 多账号行为

- 后台添加账号时只需填写显示名称和 API Key。
- 后台账号行直接显示每个 Key 的 5 小时、每周和每月剩余百分比；最多并发查询 3 个账号。
- 账号列表仅显示掩码，例如 `••••••••abcd`。
- 停用账号后，前台不再显示该账号，但加密数据仍保留。
- 替换 Key 会立即清除该账号的内存缓存。
- 点击“测试模型”后会先从 OpenCode Go 官方模型列表加载可选模型；选择模型并确认后，服务才会向该模型发送最小请求验证 Key。
- 环境变量 `OPENCODE_GO_API_KEY` 会显示为 `Environment key`，不能从后台修改或删除。
- 前台只查询当前选择的账号，不会因账号很多而同时请求所有 Key。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `WEB_USERNAME` | 空 | Web 登录用户名；启用后台必需。 |
| `WEB_PASSWORD` | 空 | Web 登录密码；启用后台必需。 |
| `KEY_ENCRYPTION_SECRET` | 空 | Key 存储主密钥，至少 32 字符；启用后台必需。 |
| `OPENCODE_GO_API_KEY` | 空 | 可选的只读兼容账号。 |
| `DATA_DIR` | `/data` | 加密数据目录。 |
| `PORT` | `3000` | 宿主机映射端口；容器内固定监听 3000。 |
| `OPENCODE_USAGE_URL` | 官方用量接口 | 上游地址，一般无需修改。 |
| `OPENCODE_MODEL_TEST_URL` | 官方模型接口 | Key 测试请求地址，默认 `/zen/go/v1/chat/completions`。 |
| `OPENCODE_MODEL_LIST_URL` | 官方模型列表 | 后台测试弹窗使用的模型列表地址，默认 `/zen/go/v1/models`。 |
| `OPENCODE_MODEL_TEST_MODEL` | `hy3` | 未提供模型时的兼容默认值；正常后台流程会由用户在弹窗中选择模型。 |
| `FETCH_TIMEOUT_MS` | `15000` | 上游请求超时。 |
| `CACHE_TTL_MS` | `30000` | 每个账号的成功响应缓存时间。 |
| `REFRESH_INTERVAL_MS` | `30000` | 浏览器自动刷新间隔，最小 10 秒。 |
| `WARN_PERCENT` | `60` | 已用比例达到该值时显示警告。 |
| `DANGER_PERCENT` | `85` | 已用比例达到该值时显示危险。 |

自定义 `OPENCODE_USAGE_URL` 会接收所有账号的 Bearer API Key，只能指向可信服务。

## HTTP 接口

```text
GET    /                         Web 看板
GET    /admin                    Key 管理后台
GET    /api/accounts             可用账号元数据
GET    /api/usage?account=<id>   指定账号额度
GET    /api/admin/accounts       全部账号元数据
GET    /api/admin/models         测试弹窗可选的官方模型列表
POST   /api/admin/accounts       添加账号
PATCH  /api/admin/accounts/<id>  编辑、换 Key 或启停
DELETE /api/admin/accounts/<id>  删除账号
POST   /api/admin/accounts/<id>/test  按所选模型发送最小请求测试 Key
GET    /healthz                  容器健康检查
```

所有 Key 相关响应只包含掩码。后台写接口要求 Basic Auth 已配置，且只接受最大 16 KiB 的 JSON 请求。

## 备份与恢复

查看数据卷：

```sh
docker volume inspect opencode-go-box_opencode-go-data
```

备份时必须同时保存：

1. Docker 卷中的 `keys.enc.json`
2. `.env` 中的 `KEY_ENCRYPTION_SECRET`

缺少其中任何一个都无法恢复 Key。不要将二者存放在同一个公开位置，也不要提交到 Git。

## 本地开发

需要 Node.js 22 或更高版本，无第三方运行时依赖：

```sh
npm test
npm run check
WEB_USERNAME=admin \
WEB_PASSWORD=test-password \
KEY_ENCRYPTION_SECRET=a-development-secret-with-at-least-32-characters \
npm start
```

仅本机持久预览可运行：

```powershell
npm run preview
```

首次运行会在 Git 忽略的 `.local-runtime` 中生成随机认证和加密密钥，后续重启会保留后台账号。预览只监听 `127.0.0.1:57726`，不代替正式 Docker 部署。

## 安全与限制

- 公网部署必须使用 HTTPS；Basic Auth 在纯 HTTP 下不会加密传输密码。
- 镜像以非 root 用户运行；Compose 启用只读根文件系统、丢弃 capabilities 并禁止提权，只有 `/data` 卷可写。
- Key 使用 scrypt 派生密钥及 AES-256-GCM 认证加密；数据文件被篡改或主密钥错误时会失败关闭。
- `/healthz` 无需认证，只返回服务状态、是否存在账号、后台是否启用和运行时间。
- OpenCode Go 用量接口尚未公开文档，接口格式或地址未来可能变化。
- 只保存 Key 和账号元数据，不记录历史额度；容器重启后用量缓存会清空。

## License

MIT
