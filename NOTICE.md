# Project Origin, Attribution, and Responsibility Boundaries

## 中文说明

### 项目来源

本仓库 `huiyio/dsh-opencode-go-box` 是以下开源项目的 Fork 和衍生改造：

- 上游项目：`yascitom/dsh-opencode-go-box`
- 上游地址：https://github.com/yascitom/dsh-opencode-go-box
- 改造基线：`v0.3.2` / commit `6dccb9e3a9f470431050d3cff16a239fa5584f80`
- 上游作者及贡献者：`yascitom` 和 `dsh-opencode-go-usage contributors`
- 上游许可证：MIT License，完整许可文本保留在本仓库的 `LICENSE` 文件中

本仓库保留了上游 Git 历史和 GitHub Fork 关系，以便识别原始作者、提交记录和代码来源。除 MIT 许可证允许的使用、修改和再发布外，本仓库不主张拥有上游作者的原始成果。

### 改造范围

上游项目原本是 DeepSeek Harness 插件。本 Fork 由 `huiyio` 仓库维护者及本 Fork 的贡献者改造成独立的 Docker Web 应用，主要新增或重写了：

- 独立 Node.js HTTP 服务和 Docker/Compose 部署文件；
- 多账号 Key 管理、加密存储和额度查询；
- 独立中英文 Web 看板和管理后台；
- 模型列表、模型请求测试、自动刷新及相关测试与文档。

本 Fork 不是上游项目的官方续作，也不代表上游作者的立场。未经明确书面说明，上游作者没有参与、审核、认可或担保本 Fork 的上述改造。

### 责任与问题归属

- 与上游原始 DSH 插件代码有关、且可在未经修改的上游版本中复现的问题，应向上游项目反馈。
- 与本 Fork 的 Docker、Web 界面、账号管理、加密存储、模型测试、部署配置或其他新增改造有关的问题，应在本 Fork 仓库反馈，由本 Fork 维护者处理。
- 不应要求上游作者为本 Fork 的修改、部署、运行、数据、账号、费用、安全事件或维护承诺承担责任。
- 本 Fork 维护者不代表 OpenCode、DeepSeek、DeepSeek Harness 或上游作者；相关名称、商标、服务和 API 归各自权利人所有。

### 使用者责任和免责声明

本项目依据 MIT License 按“原样”提供，不作任何明示或默示担保。MIT License 中的免责声明和责任限制适用于本项目。

使用者自行负责：

- 遵守 OpenCode Go、GitHub、容器平台及所在地区适用的服务条款、法律和监管要求；
- API Key、Web 密码、加密主密钥、数据卷、备份、网络暴露和 HTTPS 的安全；
- 上游接口调用产生的额度消耗、限流、费用、账号风险和数据处理；
- 在生产环境使用前进行独立审查、测试、监控和风险评估。

本文用于说明项目来源和维护责任边界，不构成法律意见，也不替代 `LICENSE`。若本文与 MIT License 冲突，以 MIT License 为准。

## English Notice

### Origin

This repository, `huiyio/dsh-opencode-go-box`, is a fork and derivative work of:

- Upstream project: `yascitom/dsh-opencode-go-box`
- Upstream URL: https://github.com/yascitom/dsh-opencode-go-box
- Modification baseline: `v0.3.2` / commit `6dccb9e3a9f470431050d3cff16a239fa5584f80`
- Upstream authors and contributors: `yascitom` and `dsh-opencode-go-usage contributors`
- Upstream license: MIT License, preserved in this repository as `LICENSE`

The upstream Git history and GitHub fork relationship are retained to identify the original authors, commits, and source. Except for the rights granted by the MIT License to use, modify, and redistribute the software, this repository does not claim ownership of the upstream authors' original work.

### Scope of this fork

The upstream project was a DeepSeek Harness plugin. The maintainer of the `huiyio` repository and contributors to this fork converted it into a standalone Docker Web application. The fork primarily adds or rewrites:

- A standalone Node.js HTTP service and Docker/Compose deployment files;
- Multi-account key management, encrypted storage, and quota queries;
- Independent Chinese and English dashboards and administration UI;
- Model listing, real model request tests, automatic refresh, tests, and documentation.

This fork is not an official continuation of the upstream project and does not represent the upstream author's views. Unless explicitly stated in writing, the upstream author has not participated in, reviewed, endorsed, or warranted these modifications.

### Responsibility and issue ownership

- Issues in the original DSH plugin that can be reproduced in an unmodified upstream release should be reported to the upstream project.
- Issues involving this fork's Docker packaging, Web UI, account management, encrypted storage, model tests, deployment configuration, or other modifications should be reported to this fork and handled by its maintainers.
- The upstream author should not be asked to assume responsibility for this fork's modifications, deployment, operation, data, accounts, costs, security incidents, or maintenance commitments.
- This fork and its maintainers do not represent OpenCode, DeepSeek, DeepSeek Harness, or the upstream author. Their names, trademarks, services, and APIs belong to their respective owners.

### User responsibilities and disclaimer

The project is provided "AS IS" under the MIT License, without express or implied warranties. The disclaimer and limitation of liability in the MIT License apply.

Users are responsible for:

- Compliance with the terms of OpenCode Go, GitHub, container platforms, and applicable laws and regulations;
- Security of API keys, Web passwords, encryption secrets, volumes, backups, network exposure, and HTTPS;
- Quota consumption, rate limits, charges, account risks, and data processing resulting from upstream API requests;
- Independent review, testing, monitoring, and risk assessment before production use.

This notice documents project origin and maintenance boundaries. It is not legal advice and does not replace `LICENSE`. If this notice conflicts with the MIT License, the MIT License controls.
