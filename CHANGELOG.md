# dsh-OpenLiulan 升级日志（CHANGELOG）

> **统一时间戳基线：2026-08-18** —— 本项目版本化统一采用 `YYYY-MM-DD`，同一版本的所有条目共用同一个时间戳；新版本永远最高权重，早期内容保留供参考、不作为当前实现的直接依据。
> 规则：按功能分节，每节内按版本正序（最新在最前）。

---

---

## 最新版本（最高权重）· v1.3.0 — DSH 新版适配：PTC 时代插件规则对齐 + 双版本兼容（ISSUE #33，2026-08-30）

v1.3.0 完成 ISSUE #33「适配 dsh 新版」：DSH 的 `@deepseek-ai/dsh-tools` 已从 **`0.1.1` 线**演进到
**`0.1.6` 线**，聚合执行器由 **Code Mode 改名 PTC mode**，工具注册契约随之变化。
本版把插件升级为**一份产物同时适配新旧两条版本线**，并用真实宿主的 `ToolRuntime`
把每一条**真实存在**的硬约束固化成测试与 CI。

> 版本号说明：本版为**单一版本 `1.3.0`**。此前草稿曾把同一批改动写成 `1.7.0`（从 `1.2.0`
> 一跳五版却只加一条日志），版本号与改动量不符，已收敛为 `1.3.0`——
> 与「上一版 `1.2.0` 的可安装插件包」直接衔接。

| 增强点 | 做了什么 |
| :--- | :--- |
| 版本线探测 | 不导入任何 `@deepseek-ai/dsh-tools` 符号，改用 `ctx.tools.constructor.Config` 的公开投影判定版本线：`mode` 取值含 `ptc` → 新版（modern），含 `code` → 旧版（legacy），无法判定时按兼容路径注册并如实报 `unknown`，不抛错、不阻断加载 |
| schema 规范化 | 新增 `src/dsh-schema.ts`：把 MCP 侧宽松 `inputSchema` / 输出 schema **按 keyword 白名单收敛**到 DSH 强制的受支持 JSON Schema 子集（`oneOf` 与 `type` 互斥、`required` 必须落在 `properties` 内、强制对象根）。**不丢取值约束、也不做类型一致性修正**——作者声明的 `const` / `enum` 一律原样保留（无论标量还是对象/数组），交给注册期自检拒绝（丢弃它等于静默放宽约束）；**例外**：`oneOf` 节点上的兄弟 keyword 被丢弃（有意的宽松归一，位置维度不受支持，见下）；**也不擅自加严**：作者未声明 `additionalProperties` 时保持「未声明 = 宽松」 |
| schema 结构自检 | 注册前用 `checkSupportedSchema()` 校验**真实的 parameters / output.schema**；违规即抛错、加载失败，而不是「装上了但调用即炸」 |
| 值判定差分对齐 | `validateAgainstSchema()` 以真实宿主 `validateJsonSchemaValue` 为 oracle 逐例回归（**25 条值例 + 16 条结构例**，含 `const` / `undefined` / 非有限数 / `-0` / 稀疏数组 / 非普通原型 / `oneOf` 兄弟 keyword / 畸形 `enum` 形状；两边判定**不一致**的例子不在语料里，逐条登记在 `KNOWN_DIVERGENCES`），把「同构」从宣称变成可验证事实。依赖缺失时**硬断言失败**，不再静默空过 |
| `exec.signal` 取消语义 | `execute(args, exec)` 双参签名显式 `throwIfAborted()`：已中止的调用不触达工具体。**有鉴别力的证据**：`test/plugin-cancel.test.mjs` 直接调工具体并统计 `callTool` 零调用（真宿主 dispatch 那条会自己拦下，删掉插件护栏仍全绿，故不作为插件证据） |
| 类型声明解耦 | 新增 `src/dsh-types.ts`：用本地结构化声明替代 `import type { Context } from '@deepseek-ai/cordis'`，产物与源码都不含宿主包符号；新增 `tsconfig.json` + `npm run typecheck`，离线环境也可类型检查 |
| 工具清单不硬编码 | 插件与冒烟测试的期望清单都从唯一事实来源 `@openliulan/mcp-server` 的 `TOOLS` / `GAME_TOOLS` 推导，后续批次往 MCP 加工具时插件自动跟随，不会漏注册也测不出「漏注册」 |
| 跨版本产物体检 | `scripts/host-inlining-guard.mjs`：产物内联任何 `@deepseek-ai/*` 即**构建失败**。判定走 `metafile.inputs`（`write: true` 下 `outputFiles` 恒 `undefined`，用它会让体检静默失效），且命中即 `throw`（`onEnd` 里往 `errors` 推条目不会让构建失败）。体检**只有这一份实现**，`build-plugin.mjs` import 它、不留副本；`test/build-plugin.test.mjs` 用环境变量把入口换成含真实宿主 import 的探针，对**生产脚本本身**断言非零退出 |
| 保留名护栏（降级） | `assertNotReserved()` 明确为**防御性保留**、非硬约束：真实路径上默认不可达（MCP 工具表无 `code` 工具，`prefix="run"` 产出的是 `run_observe`）。主防线是命名前缀；判定同时覆盖 `tool.name` 本身作为兜底。可达性边界由 `test/plugin-reserved-name.test.mjs` 钉住 |
| 加载画像清理 | `PROFILES` 随插件卸载（effect disposer）同步清理，避免同 prefix 重载后读到陈旧画像 |
| 真实宿主验收 | `test/plugin-dsh-compat.test.mjs`：用真实 cordis + ToolRuntime 装配插件，验收注册清单、版本线、schema 子集、`execute → output.schema → render` 全链路、宿主取消兜底、effect 卸载回收与画像清理 |
| 双版本 CI 验收 | `scripts/dsh-compat-check.mjs`：在**隔离临时目录**各装一份真实宿主，分别跑旧版（`0.1.1-rc.2`）与新版（`0.1.6-alpha.2`）适配验收；`.cnb.yml` 的 `main` 与 `pull_request` 均挂 `dsh-compat` 任务 |
| CI 覆盖离目录冒烟 | `.cnb.yml` 的 `build-and-test` 增加 `npm run test:plugin`——此前该自检存在但**不在 CI**，插件产物坏了 CI 也不红。该自检的产物检查已从字符串匹配 `from "@deepseek-ai/cordis"`（esbuild 内联后只剩注释，拦不住、只会假绿）换成复用构建期体检的**同一份** `findHostInputs()` 判定生产构建落盘的输入图 |

**新版适配的两条硬约束与一项防御性保留**：

| 新版约束 | 不处置的后果 | 本版处置 |
| :--- | :--- | :--- |
| schema 受强制 JSON Schema 子集校验（`assertSupportedJsonSchema`） | 作者侧 `type: 'json'` 等写法被直接拒绝，插件整个加载失败 | 统一走 `normalizeSchema()` 收敛 keyword；注册期 `checkSupportedSchema()` 对真实 schema 自检，违规即加载失败 |
| `execute(args, exec)` 必须尊重 `exec.signal` | 长任务无视宿主取消，与新版取消窗口的 `ABORTED` 语义不一致 | 双参签名显式 `throwIfAborted()`；`test/plugin-cancel.test.mjs` 以「已中止 → `callTool` 零调用」为证据 |
| （防御性保留，非硬约束）`run_code` 为保留工具名 | 若用户把 prefix 改成 `run` 且 MCP 侧恰有 `code` 工具，宿主 `register()` 会抛错 | 主防线是命名前缀（默认 `browser_`）；`assertNotReserved()` 兜底并指明 prefix 冲突。**不当作硬约束宣称** |

**阶段边界**：本版只做**插件注册契约的版本适配**，不改动浏览器控制能力本身。PTC mode 下
「浏览器工具经 `run_code` 程序内调用」由宿主 SDK 自动投影，插件无需额外声明；也未额外提供
PTC-only 的 SDK 语义增强（如按 scope 调 `presentAs('ptc')`），留作后续增量，避免过度设计。

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
| 🟡-K | 生产路径根部 `oneOf` 是**静默放宽**，不是「位置不受支持」：`plugin.ts` 读 `normalized.properties ?? {}`，`inputSchema = {oneOf:[…]}` → 注册出 `parameters = {type:'object',properties:{}}`，`checkSupportedSchema` **放行**、工具变成「收任意参数」。docstring 给的理由（保留会让插件整体加载失败）**在该位置不成立** | 加**压平护栏**（注册**之前**抛，不压成空对象）。**覆盖整类，不止点名的 `oneOf`**：判据是「作者在**根**上声明了 `parameters` 表达不了的约束」，故看 **raw** 而非只看 normalized（`items` 在归一里就被丢了，只看 normalized 会漏 `{type:'object',items:…}`）。同类实测：`{type:'object',enum:['x']}` 是对象根、逃得过只看 `oneOf` 的护栏，约束照样被丢，宿主对原样输入同样拒绝。新增 `test/plugin-object-root.test.mjs`：会被压平的输入必抛且**抛前零注册**；纯对象根照常注册且**原约束不被压平**（变异：整段关掉 → 3 failed；收窄成只看 `oneOf` → 1 failed） |
| 🟡-L | `{enum:'abc'}` 上本模块判违规、宿主 **PASS**（宿主退化成 `String.prototype.includes`）——**真分歧**，但只写在 `src/dsh-schema.ts` 注释里。`docs/dsh-compat.md` 仍讲「以真实宿主为 oracle 逐例回归、把同构变成可验证事实」，而语料的筛选口径（只收两边一致的例子）没写出来 | 新增 `KNOWN_DIVERGENCES` 登记表（含双向断言：本模块必拒 / 宿主必放行，宿主改行为则本表红），`docs/dsh-compat.md` 写明**语料筛选口径**与「已知分歧（有意更严）」。没有这张表，「逐例一致」有一半是筛出来的 |

**顺带更正一处计数分歧**：上轮提交信息写「把 enum 兜底改回 `Array.isArray &&` → 差分 + 兜底共 **3 failed**」。
复评复跑为 **2 failed**（差分 1 + 兜底 1），本轮在 `93bbf9f` 语料上复现也是 **2 failed**——
提交信息写错了，已更正。（修完本轮后同一变异为 3 failed，多出的那条是新增的 `KNOWN_DIVERGENCES` 断言，属新增覆盖而非原数。）

**自测（本轮）**：`npm run test` → **203 passed / 0 skipped**（21 文件；装 Chromium 后 `real-browser` 5 例真跑，未装则 198 passed / 5 skipped）；
`typecheck` 0 错；`test:plugin` `SMOKE_OK tools=8`；`test:dsh-compat` legacy + modern 均 `DSH_COMPAT_OK`；
`build:plugin` 重建 `lib/index.js` 逐字节一致。变异验证：`const`/`type` 兄弟保留各 1 failed，
`enum` 兜底改回 fail-open 3 failed，空 enum 冗余项删/加均全绿（如实记为**等价变异**，不是鉴别力）；压平护栏整段关掉 3 failed、收窄成只看 `oneOf` 1 failed。

---

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
| **v1.3.0** | 2026-08-30 | DSH 新版适配：一份产物同时适配 Code mode 线与 PTC mode 线（ISSUE #33） |
| **v1.2.0** | 2026-08-29 | 可安装 DSH 插件包：一个命令安装到 dsh profile（cnb.cool/GitHub/npm） |
| **v1.1.0** | 2026-08-29 | DeepSeek Harness 接入适配增强（Harness/Trae/OpenCode 开箱即接） |
| v1.0.0 | 2026-08-18 | 首个正式版：四合一框架 + 自愈调试 + 6星能力 + 双引擎 + 安全加固 |
