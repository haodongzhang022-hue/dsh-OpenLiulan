# dsh-OpenLiulan 升级日志（CHANGELOG）

> **统一时间戳基线：2026-08-18** —— 本项目版本化统一采用 `YYYY-MM-DD`，同一版本的所有条目共用同一个时间戳；新版本永远最高权重，早期内容保留供参考、不作为当前实现的直接依据。
> 规则：按功能分节，每节内按版本正序（最新在最前）。

---

---

## 合并 · 2026-10-21 — 整合 `test/pr35` 护栏提交到默认分支（ISSUE #33 护栏合流）

本次把 `test/pr35` 分支的 **15 个护栏提交**整合进默认分支（`auto/browser-ai-forge-a3d8`），
走 PR 合入、默认分支不直推。16 个 **add/add** 冲突文件逐个按冲突矩阵处置。

### 处置原则

| 冲突面 | 处置 | 理由 |
| :--- | :--- | :--- |
| `src/dsh-schema.ts` | **取 test 侧** | test 侧是默认侧的功能超集：新增 `checkSupportedSchema()` / `checkRawSchemaSubset()` / `isPlainRecord()` / `isLosslessJson()`；`const`/`enum` 原样保留（不再静默丢弃）；`oneOf` 兄弟 keyword 有意丢弃并划出例外 |
| `src/dsh-types.ts` | **取 test 侧** | 仅一处注释措辞（压平 → keyword 白名单收敛），随实现走 |
| `src/plugin.ts` | **test 侧 + 合入默认侧增量** | 护栏层全取 test 侧；补回默认侧的 `gameStoreDir` 配置项（游戏画像落盘目录）与「15 枚工具」基线说明 |
| `scripts/build-plugin.mjs` | **取 test 侧** | test 侧把产物体检抽成 `scripts/host-inlining-guard.mjs` **单一实现**并落盘构建元数据供冒烟反证；默认侧那份是同一实现的旧副本 |
| `scripts/dsh-compat-check.mjs` | **test 侧 + 合入默认侧增量** | 取 test 侧更严的「宿主可见清单 = 插件报告清单」一致性校验；补回默认侧的**精确 15 枚工具期望清单**（test 侧原先只有「≥ 8」下限） |
| `test/plugin-dsh-compat.test.mjs` | **取 test 侧** | 期望清单改为从 `@openliulan/mcp-server` 的 `TOOLS`/`GAME_TOOLS` 推导，天然覆盖 15 枚；并把「宿主依赖缺失就静默跳过」改为**硬断言** |
| `test/plugin-smoke.mjs` | **取 test 侧** | 同上，清单自动跟随；产物检查改用构建期体检的**同一份** `findHostInputs()`，不再字符串匹配 |
| `package.json` | **默认侧 + 合入 test 侧增量** | 版本 `1.7.0` 与 `build`（含 `game-profile` workspace）取默认侧；补入 test 侧的 `typecheck` 脚本 |
| `package-lock.json` | **随定稿 `package.json` 重新生成** | 结果与默认侧一致（`1.7.0` + `game-profile` workspace 条目） |
| `lib/index.js` | **构建产物，不手合** | 用合并后的 `scripts/build-plugin.mjs` 重跑生成 |
| `.cnb.yml` | **默认侧 + 合入 test 侧增量** | 保留默认侧的 `ai-code-review`；补入 test 侧在 `main`/`pull_request` 上新增的 `plugin-smoke` 步骤 |
| `CHANGELOG.md` / `README.md` / `DEPENDENCIES.md` / `docs/dsh-compat.md` / `docs/mcp-integration.md` | **默认侧为骨架 + 合入 test 侧护栏章节** | 合入 test 侧更完整的护栏说明、语料筛选口径、已知分歧登记表、构建期体检与 CI 接入描述；文档中的工具基线从 8 枚更新为 15 枚 |

### 合并带来的行为变化

- **注册期 schema 自检从「记录」改为「抛错」**：合并后 `apply()` 用 `checkSupportedSchema()` 做**结构自检**，
  违规直接抛错、插件加载失败；默认侧原先的 `loadProfile().schemaChecks` 恒为空数组（无鉴别力），
  随之移除，test 侧的两份验收脚本与测试同步改为「能走到这里即代表通过」。
- **压平护栏新增四层判据**（🟡-1 / 🟡-2 / 🟡-3 / 🟡-N）：`oneOf`/`enum`/`const`/`items` 根、
  非法 `type` 声明、非布尔 `additionalProperties`、非记录根一律抛错——不再静默压成「收任意参数」。
- **工具期望清单改为单一事实来源**：从 `@openliulan/mcp-server` 的工具表推导，
  新增或丢失工具都能测出来（原先两处各自硬编码 8 枚 / 15 枚）。
- **`run_code` 保留名护栏降级为「防御性保留」**：真实调用路径上默认不可达（MCP 工具表无 `code` 工具），
  不再与两条真硬约束并列为「三条硬约束」。

> 逐文件处置明细、与冲突矩阵的一致性说明、验收命令输出摘要见仓库外 `ops/openliulan-merge-1021.md`。

---
## 最新版本（最高权重）· v1.7.0 — DSH 新版适配：PTC 时代插件规则对齐 + 双版本兼容（ISSUE #33，2026-09-18）

v1.7.0 完成 ISSUE #33「适配 dsh 新版」：DSH 已从 **Code mode 线（`dsh-tools` `0.1.1-rc.2`）** 演进到
**PTC mode 线（`0.1.6-alpha.2`）**，工具注册契约随之变化。本版把插件从「只在旧版能装」升级为
**一份产物同时适配新旧两版**，并用真实宿主的 `ToolRuntime` 把每一条硬约束固化成测试。

| 增强点 | 做了什么 |
| :--- | :--- |
| 版本线探测 | 不导入任何 `@deepseek-ai/dsh-tools` 符号，改用 `ctx.tools.constructor.Config` 的公开投影判定版本线：`mode` 取值含 `ptc` → 新版（modern），含 `code` → 旧版（legacy），无法判定时按兼容路径注册并如实报 `unknown` |
| 保留名护栏（**防御性保留**，非硬约束） | 新增 `assertNotReserved()`：新版把 Code Mode 改名 PTC mode，但 `run_code` 仍是保留的 presentation transport，宿主 `register()` 对其直接抛错；插件提前显式失败，让用户看到「prefix 选得不对」而不是宿主内部错误。**主防线是命名前缀**（默认 `browser_`），护栏真实路径上默认不可达 |
| schema 规范化 | 新增 `src/dsh-schema.ts`：把 MCP 侧宽松 `inputSchema` 按 **keyword 白名单收敛**到 DSH 强制的受支持 JSON Schema 子集（`oneOf` 与 `type` 互斥、`required` 必须落在 `properties` 内）。**不丢取值约束、不做类型一致性修正**——`const`/`enum` 原样保留，由注册期自检拒绝；**例外**：`oneOf` 节点上的兄弟 keyword 有意丢弃（位置维度不受支持）。**不擅自加严**：未声明 `additionalProperties` 时保持「未声明 = 宽松」 |
| `output.schema` 自检 | 注册前用 `checkSupportedSchema()` 对**真实的 parameters / output.schema** 做**结构自检**，违规即抛错、插件加载失败——不再表现为「装上了但调用即炸」 |
| `exec.signal` 取消语义 | `execute(args, exec)` 双参签名显式处理 `exec?.signal`：已中止立刻抛出，长任务不再无视宿主取消（新版明确要求异步工具 observe/forward 取消信号） |
| 工具清单补齐 | 插件此前只注册 8 枚浏览器工具，`game_*` 7 枚（ISSUE #29 画像级控制）留在 MCP 侧未进进程内插件；本版补齐为 **15 枚全部注册** |
| 跨版本产物 | `scripts/build-plugin.mjs` 增加**产物体检**：若 `lib/index.js` 内联了 `@deepseek-ai/dsh-tools` / `@deepseek-ai/cordis` 即构建失败——把「不得钉死 DSH 版本」变成构建期硬约束 |
| 真实宿主验收 | 新增 `test/plugin-dsh-compat.test.mjs`（7 例）：用真实 cordis + ToolRuntime 装配插件，验收注册清单、版本线、schema 子集、`execute → output.schema → render` 全链路、取消语义、保留名护栏、effect 卸载回收 |
| 双版本 CI 验收 | 新增 `scripts/dsh-compat-check.mjs`：在**隔离临时目录**各装一份真实宿主，分别跑旧版（`0.1.1-rc.2`）与新版（`0.1.6-alpha.2`）适配验收；`.cnb.yml` 的 `main` 与 `pull_request` 均新增 `dsh-compat` 任务，验收失败即 CI 红 |

**实测结论**（真实宿主，非模拟）：

```text
legacy 宿主：DSH_COMPAT_OK flavor=legacy tools=15  evidence=tools.Config.mode ~ { mode?: "native" | "code" | "both" }
modern 宿主：DSH_COMPAT_OK flavor=modern tools=15  evidence=tools.Config.mode ~ { mode?: "native" | "ptc"  | "both" }
```

**新版适配的三条硬约束与对应处置**：

| 新版约束 | 不处置的后果 | 本版处置 |
| :--- | :--- | :--- |
| `run_code` 为保留工具名 | 用户改 prefix 后宿主 `register()` 抛错，报错信息指向宿主内部 | 注册前 `assertNotReserved()` 显式失败 + 指明 prefix 冲突 |
| `output.schema` 受强制 JSON Schema 子集校验 | 作者侧 `type: 'json'` 等写法被直接拒绝，插件整个加载失败 | 统一走 `normalizeSchema()` 压平；注册期 `validateAgainstSchema()` 自检 |
| `execute(args, exec)` 必须尊重 `exec.signal` | 长任务无视宿主取消，新版在取消窗口上返回 `ABORTED` 与工具实际行为不一致 | 双参签名显式 `throwIfAborted()`；测试覆盖「已中止的调用必须失败」 |

**阶段边界**：本版只做**插件注册契约的版本适配**，不改动浏览器控制能力本身；PTC mode 下的
「浏览器工具经 `run_code` 程序内调用」由宿主 SDK 自动投影（插件无需额外声明），但也未额外提供
PTC-only 的 SDK 语义增强，留作后续增量，避免过度设计。

---

## 最新版本（最高权重）· v1.6.0 — 游戏控制流沉淀：画像级调度与 MCP 接入（ISSUE #29 S4，2026-09-06）

v1.6.0 落地 ISSUE #29 的收尾 S4「画像级调度 + MCP 接入」，把 S1..S3 沉淀的画像/状态树收敛为**按游戏项目隔离的可用会话**，让本地 AI 通过 MCP 直接驱动「同一游戏 → 同一份沉淀」，真正达成 ISSUE 里「用一个 MCP 对应一个端口、按游戏项目沉淀能力」的诉求：

| 增强点 | 做了什么 |
| :--- | :--- |
| 画像级调度控制器 | `game-profile` 新增 `GameProfileDirector`：每游戏项目绑定一条隔离会话（画像+录制器+状态树同柄），端口名规范化（projectKey→slug 连字符），会话按活跃度可回收防堆积 |
| 沉淀工作流 | 一条可持续沉淀闭环：`feed` 喂真实动作 → 达阈值静默进「待落库草稿」→ `settle` 确认落库成画像能力 → `markReuse` 累计复用收益；跨会话 JSON 留存，新进程也能还原同端口会话 |
| 状态树驱动 | `planToGoal` 沿画像状态树规划到目标态的动作序列，供上层按序驱动真实游戏页 |
| MCP 游戏工具 | `mcp-server` 扩展 `game_bind` / `game_record` / `game_settle` / `game_transition` / `game_plan` / `game_act` / `game_list` 七枚工具，本地 AI 可直接经 MCP 按项目端口沉淀与驱动游戏控制流 |
| 真实引擎执行 | `game_act` 把画像语义动作经 `expandSemanticActions` 展开喂给真实浏览器引擎执行，成功后自动计入画像复用收益 |

**本次为 ISSUE #29 的框架侧收尾落点**，补齐 MCP 接入与每画像调度；`game_act` 的真实浏览器驱动归入 browser-smoke CI 验收。仍严守阶段边界护栏：不做帧同步校验/实时战斗验证/多 Agent 并发游戏操作。

---

## 最新版本（最高权重）· v1.5.0 — 游戏控制流沉淀：角色状态树（ISSUE #29 S3，2026-09-05）

v1.5.0 在 S1+S2 基础上落地 ISSUE #29 的 S3「角色状态树」：把 S2 沉淀的画像能力，从「单条命令可复用」升级为「一次成型、可导航的状态机」，支撑测试角色在游戏页按状态推进直到目标态：

| 增强点 | 做了什么 |
| :--- | :--- |
| 角色状态树模型 | `game-profile` 新增 `AgentStateTree`：根=起始画面，边=画像语义动作（走 keyMap/anchors/actions），子节点=关键态（用画像 stateDetectors 判定），叶=目标态（通关/结算/达标） |
| 转移登记 | `AgentStateExplorer.addTransition` 登记「动作 → 关键态」实测转移；同关键态复用节点（分支收敛）、同边去重并累计 verified |
| 路径规划 | 由根 DFS 找所有可达目标态的路径；`findPathToGoal`/`firstGoalPath` 返回节点链与待执行语义动作序列，`toReplaySteps` 可直接喂给回放器按序驱动 |
| 目标态判定 | `isGoalState` 按 victory/win/clear/通关/胜利/结算等语义词识别叶终点 |
| 树落盘 | `JsonStateTreeStore` 按画像 JSON 落盘，跨会话留存；按画像检索支撑「同一画像下次沿状态树直接探索」 |
| 画像+树编排 | `GameProfileAgent` 统一画像与状态树：按 URL 归一化绑定画像、查询能力词表与关键态选项、登记实测转移、规划到目标态路径——构成「每画像一端口」MCP 调度的控制器基础 |

**本次为 S3 框架侧落点**；MCP 侧「每画像一端口」的具体网络/调度接入保留为后续增量，避免过度设计（见 ISSUE #29 阶段边界护栏：不做帧同步校验/实时战斗验证/多 Agent 并发游戏操作）。

---

## 最新版本（最高权重）· v1.4.0 — 游戏控制流沉淀复用（ISSUE #29，2026-09-05）

v1.4.0 落地 ISSUE #29「控制增强和沉淀」的框架侧 S1+S2：把 Canvas/WebGL 游戏页（无 DOM 语义锚点）的「坐标点击 + 按键按住」控制流，从「挤牙膏、动完不记忆」升级为可沉淀、可复用的能力画像：

| 增强点 | 做了什么 |
| :--- | :--- |
| 无 DOM 基元动作 | core 动作模型新增 `clickAt`（坐标点击，支持持续按住）、`keyDown`、`keyUp`、`keyHold`（按住持续），Playwright 引擎对应执行分支已打通，覆盖 WASD 方向按住移动与坐标点交互 |
| 游戏能力画像域模块 | 新增 `@openliulan/game-profile`：每游戏项目一份 `GameProfile`（按键映射 + 坐标锚点 + 语义动作词表 + 视口基线），只存表现层契约，跨引擎（Cocos→Unity）可复用 |
| JSON 落盘画像库 | `JsonProfileStore` 按项目/页面 key 分类持久化，跨会话留存，下次同画像直接调用 |
| 画像沉淀器 | `GameProfileRecorder` 复用「不打扰」哲学：坐标/按键第 1 次静默记录，第 2 次询问沉淀，落库后同画像零定位复用 |
| 坐标漂移护栏 | 坐标锚点携带录制视口基线与归一化比例，回放前可校验视口，规避 Canvas 分辨率缩放漂移 |

**本次为 S1+S2 框架侧落点**；S3「角色状态树 + 每画像一 MCP 端口」依赖 S1/S2 稳定后作为后续增量（见 ISSUE #29 阶段边界护栏）。

---

## 最新版本（最高权重）· v1.3.0 — DSH 新版插件规则适配（2026-08-30）

v1.3.0 适配 DSH 新版插件规则，解决旧插件在新版 DSH 中不兼容的问题：

| 增强点 | 做了什么 |
| :--- | :--- |
| `inject` 声明 | `src/plugin.ts` 导出 `inject = ['tools']`，等待 host 的 `ctx.tools`（ToolRuntime）服务就绪后再加载，旧版直接访问 `ctx.tools` 导致加载顺序不可靠 |
| `parameters` 完整 JSON Schema | 工具注册改为传递完整 `{ type, properties, required }` 的 ParameterJsonSchema，旧版只传 `properties` 在新版不兼容 |
| `output.schema` 强化 | `additionalProperties` 显式声明，嵌套内容块 schema 类型更精确，符合新版 DSH 对 JSON Schema 子集的强制校验 |
| `execute` 返回 canonical value | 返回符合 `output.schema` 声明的 canonical value，`render` 负责投影为模型内容块 |
| `peerDependencies` | `package.json` 声明 `@deepseek-ai/cordis: ^4.0.1`，安装器据此校验宿主版本兼容性 |
| `cordis.patch.yml` 精简 | `insert` 只保留 `id` 和 `name`，配置默认值交由代码内部处理，用户可在自己的 profile 中自由覆盖 |
| 注册标签细化 | 每个工具注册的 effect 标签从单一 `openliulan.tool` 细化为 `openliulan.tool.<toolName>`，便于诊断定位 |


## 最新版本（最高权重）· v1.2.0 — 可安装 DSH 插件包（2026-08-29）

v1.2.0 把 dsh-OpenLiulan 从「源码接入」升级为「一行命令可安装的 **DSH 插件包**」，对标 DSH Plugin Hub 的一键安装体验：

| 增强点 | 做了什么 |
| :--- | :--- |
| 可安装插件包 | 顶层包更名 `@openliulan/dsh-openliulan`，声明 `dsh.bundle.patch → cordis.patch.yml`，`main/exports/files` 只暴露自包含 `lib/index.js` + 装配补丁 |
| 一条命令安装 | `dsh plugin --profile web add <cnb.cool|GitHub|npm>` 即可装进 dsh web profile；安装器自动把插件并入 `dsh.profile.bundles` 装配层 |
| 自包含构建 | `scripts/build-plugin.mjs` 用 esbuild 把所有 `@openliulan/*` 源码内联成单文件，仅外置已发布的 `playwright`，不依赖任何未发布包即可被他人安装 |
| 进程内插件入口 | `src/plugin.ts` 的 `apply(ctx)` 构造进程内 ForgeMcp，把 8 个浏览器工具以 `browser_*` 前缀注册为 harness 原生工具 |
| 装配补丁 | `cordis.patch.yml` 声明插件 `insert`，`prefix: browser`、无头模式均可覆盖 |
| 消费端零构建 | 预构建产物 `lib/index.js` 入库，消费端**无构建脚本**，git 源码通道真正一条命令直装，不被 pnpm allowBuilds 拦截；仅 npm 发布时 `prepack` 自动重建 |

---

## 最新版本（最高权重）· v1.1.0 — DeepSeek Harness 接入适配增强（2026-08-29）



v1.1.0 是「从自研可调，到生态里开箱即接」的一轮增强：把 OpenLiulan 统一 MCP Server 直接接进 **DeepSeek Harness** 运行环境（profile `@deepseek-ai/dsh-mcp-client`），并补齐 Trae / OpenCode 三客户端一键接入。

| 增强点 | 做了什么 |
| :--- | :--- |
| Harness MCP 接入 | profile 内加 `@deepseek-ai/dsh-mcp-client` 条目，`serverName: openliulan`，工具化为 `mcp__openliulan__observe/act/diagnose/eval/screenshot/session_log/close`；工程参数 `failOnStartupError`、`toolCallTimeoutMs` 一次配好 |
| 三客户端接入 | DeepSeek Harness（`docs/mcp-management.md`）+ Trae（`.trae/mcp.json`）+ OpenCode（`opencode.jsonc`）一个库全搞定 |
| 函数式适配 | `toHarnessTools` / `buildHarnessFunctionSchemas` 输出 OpenAI 兼容 function calling schema，注入 harness tools / system prompt |
| 权威单点 + 周同步 | `docs/SYNC_WINDOW.md` 明确本目录为唯一权威源码源，消费端（node_modules junction / dsh-home / 全局 MCP）都引用同一 `dist/cli.js`，每周云端→本地只读单向同步 |

> 依赖说明见 `docs/dependencies.md` 与 `DEPENDENCIES.md`；接入配置见 `docs/mcp-management.md`。

---

## 功能分节 · 版本迭代时间线

> 以下各功能节内，**最新版本在最前（最高权重）**；旧版本仅保留作参考。

### DeepSeek Harness / cnb.cool 适配
- **v1.1.0（2026-08-29）**：新增 Harness 接入文档 `docs/mcp-management.md` + `.trae/mcp.json` + `opencode.jsonc`，Harness / Trae / OpenCode 三客户端开箱即接。
- **v1.0.0（2026-08-18）**：`packages/mcp-server/src/adapters/harness.ts`「强化版」——`toHarnessTools` / `buildHarnessFunctionSchemas` 把 Forge 工具映射为 harness 可调用函数与 OpenAI 兼容 schema；`adapters/cnb.ts` 提供 cnb.cool stdio / HTTP / CI 三接入。

### 自愈 AgentLoop · 双调试模式
- **v1.0.0（2026-08-18）**：`runAgentLoop` 闭环节点——MCP 自带眼睛直接观察 DOM/控制台/网络/JS 异常；`debug`（Agent 全权调试）与 `report`（控制/诊断分离，结构化报告交开发 AI）双模式；`buildSelfHealContext` 生成可行动自愈上下文；`stopReason` 明确退出原因；`verify` assert 自校验目标真实达成；整环 `timeoutMs` 防死循环。

### 错误自动匹配解决方案引擎
- **v1.0.0（2026-08-18）**：`RepeatErrorRegistry` 二次触发（不多余不困境）、`fingerprintError` 错误指纹归一、内置 `SOLUTION_PLAYBOOK`；自动接入 `runAgentLoop` / `runCiCheck`。

### 可成长在线解决方案库 + 决策上下文注入
- **v1.0.0（2026-08-18）**：`SolutionRepository` 持久化沉淀（`solutions-repo.json`）、未命中新错误记候选、`addSolution` 入库；`buildSolutionKnowledgeContext` 把沉淀方案注入 system prompt，在线 CodeBuddy / 本地 Agent 默认携带已解决问题。

### cnb.cool · 云端 CI 冒烟
- **v1.0.0（2026-08-18）**：`.cnb.yml` 固化 `browser-smoke`——云端真实启动 Chromium 跑 `--ci-spec --solution-repo`，失败即驱动 CI 红/绿；`runDebugSession` 支持 owner 选择（developer-ai / agent / 自定义渠道）；`buildKnowledgeContext` 注入仓库知识。

### 双引擎 · Token 效率 · 安全（基础能力，历史保留）
- **v1.0.0（2026-08-18）**：CDP + Playwright 真双引擎同代码切换；快照裁剪 / 增量读取 / 结构化压缩省 Token；防令牌泄露 / 防渗透 / 防提权 / 统一 SSRF 防护（含云元数据 `169.254/16` 拦截）。

---

## 版本速览

| 版本 | 时间戳 | 一句话 |
| :--- | :--- | :--- |
| **v1.2.0** | 2026-08-29 | 可安装 DSH 插件包：一个命令安装到 dsh profile（cnb.cool/GitHub/npm） |
| **v1.1.0** | 2026-08-29 | DeepSeek Harness 接入适配增强（Harness/Trae/OpenCode 开箱即接） |
| v1.0.0 | 2026-08-18 | 首个正式版：四合一框架 + 自愈调试 + 6星能力 + 双引擎 + 安全加固 |

---

## 附录 · 来自 `test/pr35` 的护栏补丁系列（v1.3.0 补丁，2026-10-06 / 10-07）

> 以下条目在 `test/pr35` 分支上开发与复评（测试席 F1–F4 多轮返工），随本次护栏合流一并进入默认分支。
> 补丁系列标注的 `v1.3.0` 是该分支当时的版本号；合流后的产品版本为 `1.7.0`。

## 修复 · v1.3.0 补丁 — 测试侧复测：压平护栏补 raw 白名单闸，让「覆盖整类」成真（2026-10-07）

测试席在 `cf9691d` 的复测判定 🟡 **有条件**：自报 5 条 🟡P2 全部为真、全部清零，
但**同一病灶（「归一后与正常同形 → 护栏放行 → 注册成收任意参数」）还有未覆盖的整片**，
而本轮新增的注释/测试同时宣称「**覆盖整类**」——与刚被拿掉的那句同属**无例支撑的全称断言**。
本轮按测试席给出的 **B 方案**处置（而不是把宣称收窄成七类），并顺带更正产物尺寸。

| 项 | 问题（测试席实测复现） | 处置 |
| :--- | :--- | :--- |
| 🟡-N | **「覆盖整类」被证伪**：护栏是**手工枚举**（`ROOT_ONLY_KEYWORDS = [oneOf, enum, const, items]`），不是类。以下四类全部**静默压平 → 注册成功 → 宿主对原样输入拒绝**，枚举层一个都拦不住：<br>**F1** 根组合子/其它 keyword——`anyOf` / `allOf` / `not` / `$ref` / `if…then` / `minProperties` / `patternProperties` / `propertyNames`（`oneOf` 被拦、`anyOf` 一字之差放行）；<br>**F2** 嵌套层约束——`properties.a` 上的 `pattern` / `minLength` / `format` / `maximum` / `minItems` / 嵌套 `anyOf`；<br>**F3** 布尔 `additionalProperties` **单独出现**（无 `type`、无 `properties` → `looksObject` 为假 → keyword **整个丢弃**），另嵌套非布尔 `ap` 同样静默丢；<br>**F4** `required` 被收敛掉作者声明的名字（`required:['a','b']` → `['a']`，**放宽**） | 加 **raw 白名单闸**（`checkRawSchemaSubset()`）：不问「我们认识什么」，只问「**作者原样的 schema 是否已落在受支持子集内**」——直接复用 `checkSupportedSchema()` 的语义，**判定只有一份实现**。减去的是 🟡-G 明确接受的**有意宽松**（`oneOf` 与兄弟 keyword 并写的豁免，原样 schema 本模块与宿主一致拒绝，见 `docs/dsh-compat.md`） |
| 尺寸口径 | 上一轮自报产物 `938,807 B`，测试席 `git cat-file -s` 与工作区实测均为 **947,909 B**；sha 对、大小错 | 本文件与文档不再写死字节数（改为以 `sha256` 为准），并把「产物指标以 `git cat-file -s` 为准、不写第二套数」写进 `docs/dsh-compat.md` |
| 措辞（🟡-2 精度备注） | 注释写「两判据…缺任一层都会漏」，而测试席穷举 112 万 + 42 万组后证明 **`normalized.type` 从不单独命中**（凡它命中处 raw 判据必同时命中）——是**行为冗余**，不是互补 | `src/plugin.ts` 该段注释收口：如实写明「行为冗余、删它零行为变化」，并说明 🟡-2b 里那句 `toMatch(/type=string/)` 是**消息断言**而非行为断言 |

**raw 白名单闸的豁免口径（唯一减法，必须精确）**：某 `oneOf` 节点在 **raw 上**的违规
**全部**属「`oneOf` 与非 `oneOf` 的兄弟 keyword 冲突」这一类时，该节点的这类违规被豁免
（归一确实把这些兄弟 keyword 整体丢弃）；节点上的其它违规（未知 keyword 如 `pattern`、
拼错的 `required`）照旧计入，`oneOf` 各分支也照旧下钻、其违规不豁免。

> ⚠️ **口径纠正（实测）**：**根**上的 `{ oneOf:[…], type:'string' }` **本来就被枚举层拦**
> （`丢掉根 oneOf` + `丢掉根 type(...)`）——那是 🟡-K 的核心病灶，护栏**继续拦**，
> 不算误杀。真正受益于 🟡-G 宽松的是**嵌套**位置（`properties.a` 上的 `oneOf` 兄弟
> keyword，根仍是合法对象、不会变宽）。两者在测试里分别钉住，别写成「凡 `oneOf`
> 兄弟都放行」。

**「覆盖整类」现在有例支撑**：`test/plugin-object-root.test.mjs` 从 12 例扩到 **22 例**，
新增 F1–F4 **四组逐类用例**，每条都带「**抛前零注册**」+「**宿主 `assertObjectJsonSchema`
双向断言**」（原样必拒 / 合法必放行），另加「反例确实归一后与正常同形」的自证
（否则用例是假的）、「不误伤合法形态」、「🟡-G 有意宽松不被误杀」、「豁免不得扩大」。

**变异验证**（新增用例的鉴别力，逐条实测）：

| 变异 | 结果 |
| :--- | :--- |
| 删掉 raw 白名单闸（第 4 层整段移除） | **5 failed**（F1–F4 四组 + 反例自证） |
| 豁免退化成裸调用（去掉 `oneOf` 兄弟豁免） | **1 failed**（🟡-G 放行用例） |
| 豁免扩大（本节点有 `oneOf` 就全豁免） | **1 failed**（豁免不得扩大用例） |

**影响面**：8/8 真实工具经 raw 白名单闸 **0 违规**、9 种合法形态（嵌套 `enum` /
`const` / `oneOf` / 注解 / 数组 / `integer` / `null` / 空 `properties` / 布尔 `ap`）
全放行；F1–F4 反例 **17/17 全捕获**。今天仍不可达（真实工具都是
`{ type:'object', properties }`），属健壮性护栏。

---

## 修复 · v1.3.0 补丁 — 测试侧 5 条 🟡P2 清零（2026-10-06）

测试席在 PR #35 的验收结论（🟢 放行合并）里另报 5 条非功能 🟡P2。本补丁一并清掉，
不改架构、不改浏览器控制能力。

| 编号 | 问题 | 处置 |
| :--- | :--- | :--- |
| 🟡-1 | **非记录根 inputSchema 仍静默压平**：`'oops'` / `[{…}]` / `null` / `42` / `undefined` 作根 → `normalizeSchema` 归成 `{}`，护栏与自检**双双放行**，注册成「收任意参数」 | 压平护栏改为**先看 raw 记录形状**（`isPlainRecord`，从 `dsh-schema.ts` 导出），非记录根一律抛。用例 6 组，含「抛前零注册」 |
| 🟡-2 | **`normalized.type` 分支零覆盖**：`{ type:'string' }` 确实被拦，但删掉该分支 204 全绿 | 补 `{ type:'string'\|'array'\|'number'\|'boolean' }` 用例；另补「两层判据互补」用例，逐条钉住「非法 `type` 只能靠 raw 拦、合法非对象 `type` 两层都能拦」 |
| 🟡-3 | **根非法 `type` / 非法 `additionalProperties` 静默压平**：`{ type:['string'] }` / `{ type:'strin' }` / `{ type:42 }` 归一后被静默丢 `type`（与「没写 type」同形）；非布尔 `additionalProperties` 同理 | 护栏加判 raw 上的 `type` 声明（非 `"object"` 即抛）与非布尔 `additionalProperties`。**布尔 `additionalProperties` 保留放行**——那是 `parameters` 能表达的，拦了会误伤真实工具表 |
| 🟡-4 | **新克隆 `npm ci` 后直接 `typecheck` 报 `TS2307` + `TS7006`** | CI 本就是 `build` → `test` 顺序，不受影响；README 的「离线环境亦可跑」对**新克隆**不成立，已更正为「需先 `npm run build`」并写明原因 |
| 🟡-5 | **论据失实**：注释与 `docs/dsh-compat.md` 写「把原样 schema 当 parameters 交给宿主，宿主会拒绝」——实测**不成立** | 两条版本线的 `register()` 都只对 `output.schema` 跑 `assertSupportedJsonSchema`，**完全不校验 `parameters` 根**；`assertObjectJsonSchema` 在全部 `@deepseek-ai/*` 包内**除定义与导出外 0 个调用点**。论据换成「**本模块自检也拦不住压平**」，注释与文档同步更正 |

**压平护栏的分层判据（三层互补，缺一即漏）**：

```text
1. raw 必须是普通记录                  ← 🟡-1：'oops'/42/null/[...] 归一成 {} 后无法区分
2. raw 上不得有 parameters 表达不了的声明：
   oneOf / enum / const / items        ← 🟡-K：压平丢掉整个取值约束
   type 非 "object"                    ← 🟡-3：非法声明被 normalizeSchema 静默丢掉
   additionalProperties 非布尔         ← 🟡-3：同上；布尔保留（parameters 能表达）
3. normalized.type 必须是 object 或缺省 ← 🟡-2：合法但非对象的 type（{ type:'string' }）
```

第 2、3 层**天然重叠**（`{ type:'string' }` 两层都拦），第 1、2 层的 `type` 判定
与第 3 层**互补**（非法 `type` 只有第 2 层拦得住）——故不能删任一层。

**变异验证**（5 个分支逐个单点禁用，各自变红）：

| 变异 | 结果 |
| :--- | :--- |
| 删「非记录根」判定 | 1 failed |
| 删「raw `type`」判定 | 3 failed |
| 删「`normalized.type`」判定 | 1 failed |
| 清空 `ROOT_ONLY_KEYWORDS` | 2 failed |
| 删「非布尔 `additionalProperties`」判定 | 1 failed |

回归：`typecheck` 0 错 · `vitest run` **206 passed / 0 failed**（真浏览器 5 例因沙箱缺
chromium 跳过，非本补丁）· `SMOKE_OK tools=8` · legacy + modern 双 `DSH_COMPAT_OK` ·
注入真实 `@deepseek-ai/cordis` import → `build:plugin` **exit=1** 并报出 cosmokit + cordis
两条路径，干净态 exit=0。

---

## 修复 · v1.3.0 补丁 — CI 真实浏览器验收：断言不再绑第三方页面结构（2026-10-06）

PR #35 的 CI 在 `test` 阶段红：`packages/engines/test/real-browser.acceptance.test.ts` 的
「框架 extract 提取真实页面主标题」断言失败。

**根因不是框架缺陷，是断言绑错了对象**：旧用例全部打 `https://example.com`，并断言其
`<h1>Example Domain</h1>`。该站点现已移除这个 h1（正文改由 `/s.js` 注入 `<p>` 与链接），
第三方一改版，本仓库 CI 就凭空变红——实测本地与 CI 镜像复现一致（`extract` 返回
「无法定位元素：selector=h1」）。同一根因还潜伏在 `examples/ci-spec.json`（`main` push 的
`browser-smoke` 任务）与 `quickstart.mjs` / `stealth-viz.mjs` 示例里，一并修掉。

| 处置 | 做了什么 |
| :--- | :--- |
| 验收页自持 | 新增 `packages/engines/test/fixtures/`（`acceptance.html` / `next.html`）+ `acceptance-server.ts`：真实 HTTP 服务（随机端口、防目录穿越），页面结构由本仓库掌管 |
| 断言分层 | 本地 fixture 站点验 DOM 真值（navigate/observe/extract/click 跳转/诊断）；真实公网只验**站点身份与加载成功**（url 含 `example.com`、标题匹配 `/example/i`），不绑第三方 DOM 细节 |
| 保留反「假装测试」力度 | 用例数 4 → 5，仍真实启动 headless Chromium 驱动真实代码路径；鉴别力实测：把 `extract` 的文本返回值改成空串后，本地 fixture 用例立刻红 |
| 同源隐患同修 | `examples/ci-spec.json` 与 `docs/mcp-integration.md` 的断言目标由 `h1` 改为 `title`（并注明原因）；`quickstart.mjs` / `stealth-viz.mjs` 的 extract 目标同步改为 `title`，避免示例静默取空值 |

---

## 修复 · v1.3.0 补丁 — 复评处置：非标量 const/enum 不再静默丢弃 + 两处零断言假绿（2026-10-07）

PR #35 复评（第 1 次返工交回）判定必修项清零、放行，并提了三条 🟡。本轮一并处置：

| 项 | 问题 | 处置 |
| :--- | :--- | :--- |
| 🟡-D | docstring 写「类型不匹配的 `const` / `enum` 会原样保留」，实测只有**标量**如此；对象/数组取值走 `filter` 丢弃分支，`{ type: 'string', enum: [{ a: 1 }] }` 的 enum 被整体删除后 PASS——正是 🟡-A 想避免的「静默放宽」 | 收窄实现而非收窄文档：`normalizeSchema()` **不再筛选**，`const` / `enum` 一律原样保留，由注册期自检拒绝。标量与非标量行为一致，也与宿主一致（宿主对这两种写法都直接拒绝） |
| 🟡-E | `test/plugin-dsh-compat.test.mjs` 仍有 6 处 `if (!available) return;`；移走 `@deepseek-ai` 后该文件照样报「6 passed」 | 换成同一套 `requireHost()` 硬断言（与 `dsh-schema.test.mjs` 同源）；实测移走宿主后 **6 failed**，报「本用例必须真跑，不得静默跳过」 |
| 🟡-F | `test/plugin-smoke.mjs` 删掉唯一那处 `require(...)` 用法后，`createRequire` 与 `node:module` 导入成了孤儿 | 一并删除 |
| 🟢-A | `OPENLIULAN_BUILD_ENTRY/OUTFILE/METAFILE` 直接决定生产构建入口与落盘位置 | 保留该开口（钉住生产脚本本身的必要代价），在 `build-plugin.mjs` 注释里点明**仅供测试用**、发布/CI 不得设置 |

**顺带修正一处计数**：上一版 CHANGELOG 写「22 条值例 + 11 条结构例」，本轮补入
「非标量 `const` / 非标量 `enum` 元素」两条结构例（差分 oracle 钉住「本仓库与宿主一致拒绝」），
现为 **22 条值例 + 13 条结构例**（第 2 次复评又补 2 条值例 + 3 条结构例 → 24 + 16；
第 3 次复评再补 1 条值例 → **25 + 16**，见下节）。🟡-C 的更正已接受：`963ec97` 那行原本没有计数，
此前「23→22」的过程描述与仓库事实不符，本轮不再复述该说法。

---

## 修复 · v1.3.0 补丁 — 复评（第 2 次返工）处置：全称断言收口 + 死路径 fail-closed（2026-10-07）

PR #35 第 2 次复评判定「必修清零、无新增 🔴、`proceed / merge`」，另提两条 🟡。
本轮一并处置，**不新增 🔴、不打回**。

| 项 | 问题 | 处置 |
| :--- | :--- | :--- |
| 🟡-G | 新增 docstring / CHANGELOG 写「无论取值是标量还是对象/数组、**也无论位置是否受支持**」——取值那半为真，位置那半为假：`oneOf` 节点的兄弟 keyword（`enum`/`const`/`properties`/`required`/`items`/`additionalProperties`）会被整体丢弃，`{ oneOf:[…], enum:['x'] }` 本模块放行 / 宿主拒绝 | 改口径：把承诺**收回取值维度**，并为位置维度补上例外与实测例。**不改变行为**——丢弃兄弟 keyword 是有意的宽松归一（DSH 子集禁止其与 `oneOf` 共存，真实 schema 却常并写，保留会让插件整体加载失败）。影响面 0（MCP 工具表 `oneOf` 命中 0）。补 3 条结构例 + 3 条专属用例钉住「丢弃 → 归一后放行 / 原样拒绝」，并加宿主差分（原样输入层本模块与宿主一致拒绝） |
| 🟡-H | `validateAgainstSchema` 新增的 `Array.isArray(schema.enum) &&` 兜底把畸形 enum（`{ enum: { a: 1 } }`）从「抛 TypeError」改成了「静默 PASS」——方向与 🟡-A/🟡-D 相反（fail-open） | 改 **fail-closed**：畸形 `enum` 形状返回违规。生产路径不可达（注册期自检先拒），但死路径上也宁可报错。补 2 条值例进差分 oracle（宿主对 `{enum:{a:1}}` 也判「不通过」）+ 1 条鉴别力用例（正常 `enum` 行为不变） |

**「无例支撑的全称句式」这个 meta 观察已接受并落到本轮**，但本轮的「全部经变异验证」
**说得过头了**（第 3 次复评 🟡-J 实测反证，见下节）：`oneOf` 兄弟 keyword 的 3 条
`SCHEMA_CASES` 只钉「**原样**被拒」，不钉「归一后丢弃」；专属用例的 body 又只放了
`enum`。于是「在归一分支里加回 `const` / `type`」两个变异**全绿**——`const` / `type`
当时无例支撑。第 3 次复评已修（专属用例改成 7 个 keyword 的循环，两个变异立刻红）。

---

## 修复 · v1.3.0 补丁 — 复评（第 3 次）处置：钉住丢弃、删冗余项、补非对象根护栏（2026-10-07）

PR #35 第 3 次复评判定「0 🔴、必修清零、放行」，另提 4 条 🟡（均不阻塞）。
本轮**四条全修**（不修也放行，但其中两条是「宣称强于事实」，留着会继续误导）。
复现环境：Node `22.23.3` + `npm ci`，另装 Playwright Chromium 以复现 200 例。

| 项 | 问题（复评实测） | 处置 |
| :--- | :--- | :--- |
| 🟡-I | `enum.length === 0 ||` 是**冗余项**：旧代码 `Array.isArray(enum) && !enum.includes(v)` 对 `enum: []` 本就返回违规（`[].includes()` 恒 false）。删掉该 disjunct → 全量全绿（**等价变异 SURVIVED**）；新增的 `it('空 enum 也判违规')` 改动前后都绿 = **零鉴别力**。CHANGELOG 把「空 enum 同样判违规」列为本轮修复，属夸大 | 删冗余分支 + 删零鉴别力用例；改为把「空 enum」作为**语料**放进差分 oracle（`VALUE_CASES` 25 条），钉住行为本身；CHANGELOG 该行不再声称「修复」 |
| 🟡-J | `it('oneOf 兄弟 enum / const 被整体丢弃…')` 的 body 只放了 `enum`，`const` / `type` **无例支撑**。变异：在 `branches.length >= 2` 里加回 `if (raw.const !== undefined) out.const = raw.const;` → **全绿**（`type` 同）。故 CHANGELOG「6 条用例 / 全部经变异验证」不成立——`SCHEMA_CASES` 那 3 条只钉「原样被拒」，不钉「归一丢弃」 | 专属用例改成对 **7 个兄弟 keyword**（`type`/`enum`/`const`/`properties`/`required`/`items`/`additionalProperties`）的循环；两个变异（`const` / `type`）**立刻红**（实测各 1 failed）。CHANGELOG meta 段如实承认上轮说法过头 |
| 🟡-K | 生产路径根部 `oneOf` 是**静默放宽**，不是「位置不受支持」：`plugin.ts` 读 `normalized.properties ?? {}`，`inputSchema = {oneOf:[…]}` → 注册出 `parameters = {type:'object',properties:{}}`，`checkSupportedSchema` **放行**、工具变成「收任意参数」。docstring 给的理由（保留会让插件整体加载失败）**在该位置不成立** | 加**压平护栏**（注册**之前**抛，不压成空对象）。**不止点名的 `oneOf`**：判据是「作者在**根**上声明了 `parameters` 表达不了的约束」，故看 **raw** 而非只看 normalized（`items` 在归一里就被丢了，只看 normalized 会漏 `{type:'object',items:…}`）。同类实测：`{type:'object',enum:['x']}` 是对象根、逃得过只看 `oneOf` 的护栏，约束照样被丢，宿主对原样输入同样拒绝。新增 `test/plugin-object-root.test.mjs`：会被压平的输入必抛且**抛前零注册**；纯对象根照常注册且**原约束不被压平**；并用**真实宿主 `assertObjectJsonSchema`**（parameters 根的校验器，**不是** `assertSupportedJsonSchema`——后者只判值 schema 的 keyword 子集，对 `{oneOf:[…]}` 是放行的，拿错 oracle 会写出假断言）做差分。变异：整段关掉 → 3 failed；收窄成只看 `oneOf` → 1 failed；用 normalized 代替 raw → 1 failed。**（🟡-N 校正）**本行原写「覆盖整类」，属无例支撑的全称断言，已收回；覆盖面由 🟡-N 新增的 raw 白名单闸承担，见下节 |
| 🟡-L | `{enum:'abc'}` 上本模块判违规、宿主 **PASS**（宿主退化成 `String.prototype.includes`）——**真分歧**，但只写在 `src/dsh-schema.ts` 注释里。`docs/dsh-compat.md` 仍讲「以真实宿主为 oracle 逐例回归、把同构变成可验证事实」，而语料的筛选口径（只收两边一致的例子）没写出来 | 新增 `KNOWN_DIVERGENCES` 登记表（含双向断言：本模块必拒 / 宿主必放行，宿主改行为则本表红），`docs/dsh-compat.md` 写明**语料筛选口径**与「已知分歧（有意更严）」。没有这张表，「逐例一致」有一半是筛出来的 |

**顺带更正一处计数分歧**：上轮提交信息写「把 enum 兜底改回 `Array.isArray &&` → 差分 + 兜底共 **3 failed**」。
复评复跑为 **2 failed**（差分 1 + 兜底 1），本轮在 `93bbf9f` 语料上复现也是 **2 failed**——
提交信息写错了，已更正。（修完本轮后同一变异为 3 failed，多出的那条是新增的 `KNOWN_DIVERGENCES` 断言，属新增覆盖而非原数。）

**自测（本轮）**：`npm run test` → **204 passed / 0 skipped**（21 文件；装 Chromium 后 `real-browser` 5 例真跑，未装则 199 passed / 5 skipped）；
`typecheck` 0 错；`test:plugin` `SMOKE_OK tools=8`；`test:dsh-compat` legacy + modern 均 `DSH_COMPAT_OK`；
`build:plugin` 重建 `lib/index.js` 逐字节一致。变异验证：`const`/`type` 兄弟保留各 1 failed，
`enum` 兜底改回 fail-open 3 failed，空 enum 冗余项删/加均全绿（如实记为**等价变异**，不是鉴别力）；压平护栏整段关掉 3 failed、收窄成只看 `oneOf` 1 failed、用 normalized 代替 raw 1 failed。

---
