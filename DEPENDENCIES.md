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
└── @openliulan/ai-layer

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
Node.js:   v22.23.3（DSH 双版本验收在 v24.21.0 上亦复跑通过）
TypeScript: 5.5.x
Vitest:     3.2.7
Playwright: 1.62.1
Chromium:   Playwright Chromium v1234
DSH 旧版线:  @deepseek-ai/dsh-tools 0.1.1-rc.2 + cordis 4.0.1
DSH 新版线:  @deepseek-ai/dsh-tools 0.1.6-alpha.2 + cordis 4.0.2
```

## 常见问题

- **修改 `src/` 后必须重新构建**：MCP CLI 实际执行 `packages/mcp-server/dist/cli.js`，请重跑 `npm run build`。
- **首次必须装浏览器**：`npx playwright install chromium`。
- **stdio MCP stdout 必须干净**：日志写入 stderr，不要污染 stdout。
- **升级 playwright 后同步验证**：重跑 `npm install && npx playwright install chromium && npm test`。

## DeepSeek Harness 集成

DSH 有两条接入通道，按下表选一：

| 通道 | 需要什么 | 适用场景 |
| :--- | :--- | :--- |
| **进程内插件（推荐）** | 只要 DSH 本身，无需额外依赖 | 本地/云端 dsh web profile，一条命令装当前全部 `browser_*` 工具 |
| MCP 客户端 | `@deepseek-ai/dsh-mcp-client` + 已构建的 `@openliulan/mcp-server` | 需要 stdio/HTTP 分离部署或跨进程隔离 |

### 插件通道的宿主兼容性

插件**不内联任何 `@deepseek-ai/*` 运行时符号**，只依赖宿主注入的 `ctx.tools`，
因此同一份 `lib/index.js` 可同时装在两条 DSH 版本线上：

| DSH 版本线 | `@deepseek-ai/dsh-tools` | `mode` 取值 | 适配状态 |
| :--- | :--- | :--- | :--- |
| 旧版（Code mode） | `0.1.1` 线（本仓库 devDependency 钉 `^0.1.1-rc.2`） | `native \| code \| both` | ✅ 实测通过 |
| 新版（PTC mode） | `0.1.6` 线（CI 钉 `0.1.6-alpha.2`） | `native \| ptc \| both` | ✅ 实测通过 |

> 「实测通过」的出处：`node scripts/dsh-compat-check.mjs legacy|modern` 在
> Node.js `22.23.3` 与 `24.21.0` 上各跑一遍，两条线均输出 `DSH_COMPAT_OK` 且退出码为 0。
> 未列出的 Node 版本**未经实测**，不作兼容性承诺。

`@deepseek-ai/cordis` 仅作类型时使用（本仓库已改为本地结构化声明，构建时被擦除）；
`peerDependencies` 声明 `^4.0.1`，两版宿主（`4.0.1` / `4.0.2`）均满足。

自检命令：

```bash
npm run test:plugin        # 假 ctx 冒烟，无需装 DSH
npm run test:dsh-compat    # 真实宿主双版本验收（隔离临时目录各自安装）
```

完整 Harness 配置示例见 [docs/dependencies.md](docs/dependencies.md#5-deepseek-harness-集成额外依赖)。
