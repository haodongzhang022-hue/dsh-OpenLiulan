# dsh-OpenLiulan 依赖说明

> 独立依赖说明，克隆仓库后请以此为准准备运行环境与依赖。
> 完整文档见 [docs/dependencies.md](docs/dependencies.md)。

## 快速开始（三行命令）

```bash
npm install
npm run build
npx playwright install chromium
```

> ⚠️ 仅 `npm install` **不会**自动下载 Chromium 浏览器，必须额外执行
> `npx playwright install chromium`，否则真实浏览器自动化无法运行。

## 运行环境

| 依赖 | 最低版本 | 用途 |
| :--- | :--- | :--- |
| Node.js | >= 20，推荐 22 LTS | 运行 MCP 服务、TypeScript 编译与 Playwright |
| npm | 与 Node.js 配套 | 安装 workspace 依赖、执行构建与测试 |
| Chromium（Playwright 管理） | 与 Playwright 对应 | 实际启动和控制浏览器 |
| 网络访问 | 必需 | 首次下载 npm 包和 Playwright 浏览器 |

> 当前项目已用 **Node.js 22.20.0 + Playwright Chromium** 完成实际测试。

## 生产依赖

| 包 | 版本 | 所属模块 | 作用 |
| :--- | :--- | :--- | :--- |
| `playwright` | `^1.45.0`（锁定 1.62.1） | `@openliulan/engines` | 浏览器启动、CDP 连接、DOM 操作、导航、点击、输入、截图和断言等底层浏览器自动化。 |
| `zod` | `^3.23.0` | `@openliulan/core` | 统一动作、输入参数与核心数据结构的运行时校验。 |

## 可选依赖（视觉引擎，成本阶梯 L1）

| 包 | 版本 | 所属模块 | 作用 |
| :--- | :--- | :--- | :--- |
| `@liustack/modlens`（可选，MIT） | `>= 3.25.0`（peerDependencies，optional） | `@openliulan/vision` | 「vision」工具的默认视觉引擎：截图 → OCR/布局/语义纯文本证据。缺失时工具给出安装指引，并自动回退到本机 opencode 直连通道。归属声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。 |
| opencode CLI（可选回退通道） | 本机已安装即可（PATH / OPENCODE_BIN） | `@openliulan/vision` | modlens 引擎不可用/欠费时的 L1 次级通道：`opencode run --format json -f <图>` 直连视觉模型，复用 opencode 登录与配额。 |

## 开发与构建依赖

| 包 | 版本 | 用途 |
| :--- | :--- | :--- |
| `typescript` | `^5.5.0` | 编译所有 `packages/*` 下的 TS 源码到 `dist/`。 |
| `vitest` | `^3.0.0` / 根目录 `^3.2.7` | 单元测试及真实浏览器验收测试。 |
| `@types/node` | `^20.0.0` | Node.js API 的 TypeScript 类型。 |

## 内部 Workspace 依赖

`@openliulan/*` 均为仓库内部包，由 `npm install` 自动关联，**无需单独安装**：

```text
@openliulan/mcp-server
├── @openliulan/core
├── @openliulan/engines
├── @openliulan/diagnosis
├── @openliulan/token
├── @openliulan/ai-layer
└── @openliulan/vision

@openliulan/engines
├── @openliulan/core
├── @openliulan/diagnosis
├── @openliulan/ai-layer
└── playwright

@openliulan/core
└── zod
```

## 实测验证版本

```text
Node.js:   v22.20.0
TypeScript: 5.5.x
Vitest:     3.2.7
Playwright: 1.62.1
Chromium:   Playwright Chromium v1234
```

## 常见问题

- **修改 `src/` 后必须重新构建**：MCP CLI 实际执行 `packages/mcp-server/dist/cli.js`，请重跑 `npm run build`。
- **首次必须装浏览器**：`npx playwright install chromium`。
- **stdio MCP stdout 必须干净**：日志写入 stderr，不要污染 stdout。
- **升级 playwright 后同步验证**：重跑 `npm install && npx playwright install chromium && npm test`。

## DeepSeek Harness 集成

集成 DSH 需要 `@deepseek-ai/dsh-mcp-client`、已构建的 `@openliulan/mcp-server`、
可访问的 Node.js 与 Playwright Chromium。完整 Harness 配置示例见
[docs/dependencies.md](docs/dependencies.md#5-deepseek-harness-集成额外依赖)。
