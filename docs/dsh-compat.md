# DSH 新旧版本适配说明（ISSUE #33）

> 结论先行：**同一份 `lib/index.js` 同时适配 DSH 旧版（Code mode 线）与新版（PTC mode 线）**，
> 安装时无需选择通道、无需额外配置。本文记录差异、处置与验收方式。

## 1. 两条版本线

| 维度 | 旧版（Code mode 线） | 新版（PTC mode 线） |
| :--- | :--- | :--- |
| `@deepseek-ai/dsh-tools` | `0.1.1` 线（本仓库 devDependency 钉 `^0.1.1-rc.2`） | `0.1.6` 线（CI 钉 `0.1.6-alpha.2`） |
| `ToolRuntime.Config.mode` | `native \| code \| both` | `native \| ptc \| both` |
| 聚合执行器工具名 | `run_code`（保留） | `run_code`（保留，语义由 Code Mode 变为 PTC mode） |
| 运行时服务 | `ctx.codeRuntime` | `ctx.ptcRuntime` |
| 子调用会话事件 | `tool/code-dispatch` / `tool/code-dispatch-start` | `tool/ptc-dispatch` / `tool/ptc-dispatch-start` |
| 子调用 ID 前缀 | `<parent>:code:<n>` | `<parent>:ptc:<n>` |
| dispatch-log 瀑布 | `tools/code-dispatch-log` | `tools/ptc-dispatch-log` |
| `ToolExecutionInput` | 无 `schema` 字段 | 新增绑定期 `schema`（PTC 内层调用用） |
| `PreToolDecision` | `allow \| deny \| ask` | 新增 `cancel`；`deny` 可携带 `info` |
| `ToolErrorInfo` | `name` / `code` | 新增 `reason` |
| `JsonValue` 来源 | `@deepseek-ai/dsh-session` | `@deepseek-ai/dsh-util-values` |
| `CallId` | `@deepseek-ai/dsh-llm` 的 `CallId` | `ToolCallId` |

**未变的核心契约**（插件因此可只写一条注册路径）：

- `inject = ['tools']` 语义一致；
- `tools.register(definition)` 返回 disposer，两者一致；
- `ToolDefinition` 的 `name` / `description` / `parameters` / `output.schema` / `output.render` / `execute(args, exec)` 形态一致；
- 只有 `mode` 的取值字面量与运行时服务名变了，**插件侧无感**（插件不声明
  `mode`，由用户在自己的 profile 里配）。

## 2. 新版对插件的约束与处置

### 2.1 schema 受强制 JSON Schema 子集校验（硬约束）

`register()` 会对 `output.schema` 执行 `assertSupportedJsonSchema()`，
**不支持或位置错放的 keyword 直接拒绝**（不是静默忽略）。受支持子集为：

- 单个 `type`（`object` / `array` / `string` / `number` / `integer` / `boolean` / `null`）；
- 对象：`properties` / `required`（**每一项都必须出现在 `properties` 中**）/ 布尔 `additionalProperties`；
- 数组：`items`；
- 标量：`enum` / `const`；
- `oneOf`：至少两支，且**与 `type` 互斥**；
- 注解：`description` / `title` / `default` / `examples`。

> 作者侧的 `type: 'json'` 是 schema DSL 的写法，**投影后**是注解式节点；
> 直接手写 `type: 'json'` 到 `output.schema` 会被拒绝。

本插件通过 `src/dsh-schema.ts` 的 `normalizeSchema()` 把 MCP 侧宽松
`inputSchema` 与输出 schema 按 keyword 白名单收敛到上述子集（不做类型一致性修正），并在注册前用
`checkSupportedSchema()` 对**真实的 parameters / output.schema** 做结构自检：
违规即抛错、插件加载失败——比「装上了但调用即炸」可诊断得多。

**`const` / `enum` 一律原样保留，不筛选**：早先实现用 `filter` 丢掉非标量取值
（`{ type: 'string', enum: [{ a: 1 }] }` → enum 被整体删除），那是**静默放宽**——
约束从「必须是 `{a:1}`」变成「任意值」，而宿主对同一份 schema 是直接拒绝。
现在标量与非标量行为一致：保留 → 注册期自检拒绝 → 加载失败。
代价是上游畸形 schema 不再被静默「修好」，而是让插件加载失败（更可诊断）；
当前 MCP 工具表 8/8 无此写法，`rejected = 0`。

**不擅自加严**：作者未声明 `additionalProperties` 时，规范化结果**不写**该
keyword，保持「未声明 = 宽松」。此前实现无条件写成 `false`，等于把宽松的 MCP
`inputSchema` 静默加严为「拒绝额外参数」，且与声明不一致，已修正并由
`test/dsh-schema.test.mjs` 钉住。

### 2.2 `execute(args, exec)` 必须尊重 `exec.signal`（硬约束）

新版要求异步工具响应取消，并在 body 启动前 / 启动后的取消窗口上返回
`ABORTED_BEFORE_DISPATCH` / `ABORTED`。本插件在 `execute` 入口
`exec?.signal?.throwIfAborted()`，已中止的调用不会触达工具体
（浏览器不会被启动）。

**证据分工（重要）**：真宿主 dispatch 层**自己就会**在 body 启动前拦下已中止
的调用。因此 `test/plugin-dsh-compat.test.mjs` 里那条断言证明的是**宿主**行为，
删掉插件的 `throwIfAborted()` 它依然全绿。插件侧的有鉴别力证据在
`test/plugin-cancel.test.mjs`：直接调用工具体（绕过宿主），断言「已中止 →
`callTool` **零调用**」，并用「未中止 → `callTool` 必须被调用」证明该断言不是恒真。

### 2.3 `run_code` 是保留工具名（**防御性保留**，非硬约束）

新旧两版都在 `register()` 里拒绝 `name === 'run_code'`。

**主防线是命名前缀**：本插件所有工具都带 `prefix`（默认 `browser_`），
命名上已天然远离保留名。

`assertNotReserved()` 是**防御性保留**，真实调用路径上默认不可达：

```text
publicName = `${prefix}_${tool.name}`；MCP 工具表里没有名为 `code` 的工具
prefix="run"        → run_observe       （不是 run_code）
prefix="run_code"   → run_code_observe  （不是 run_code）
```

也就是说，除非将来有人往 MCP 里加一枚恰好叫 `code` 的工具，这枚护栏不会命中。
判定因此同时覆盖 `tool.name` 本身作为兜底。可达性边界由
`test/plugin-reserved-name.test.mjs` 钉住（既记录「默认不可达」，也断言
「MCP 侧一旦出现 `code` 工具就必须拦下」）。

> 本项**不当作硬约束宣称**。此前文档把它与另两项并列成「三条硬约束」，
> 属于「宣称的防线强于实际防线」，已更正。

## 3. 版本探测

插件**不导入任何 `@deepseek-ai/dsh-tools` 符号**（避免把 peer 版本钉死在产物里）。
`detectDshFlavor()` 读取已就绪 `ctx.tools.constructor.Config` 的公开投影
（schemastery 的 `toString()`）：

```text
旧版 → tools.Config.mode ~ { mode?: "native" | "code" | "both", maxParallelSubCalls?: number }
新版 → tools.Config.mode ~ { mode?: "native" | "ptc"  | "both", maxParallelSubCalls?: number }
```

判定结果（`modern` / `legacy`）通过 `loadProfile(prefix).host` 暴露，供诊断与
CI 验收读取；`unknown` 时按兼容路径注册（不抛错、不阻断加载）。

`loadProfile()` 返回的画像随插件卸载（effect disposer）同步清理，
避免同 prefix 重载后读到陈旧画像。

## 4. 验收方式

```bash
npm run test:plugin        # 假 ctx 冒烟：注册清单 + 真实 schema 自检 + 产物不内联宿主包
npm run test:dsh-compat    # 真实宿主双版本验收（隔离临时目录各自安装真实宿主）
npm run test               # 全量单测（含 schema 差分 oracle、取消鉴别力、构建期体检反证）
npm run typecheck          # 源码类型检查（离线环境亦可跑）
```

`scripts/dsh-compat-check.mjs` 的验收项：

1. 工具全部注册可见，且与插件报告的清单一致（期望清单从 `@openliulan/mcp-server` 的工具表推导，不硬编码）；
2. 版本线探测结果符合预期（`legacy` / `modern`）；
3. schema 结构自检已在注册期强制（违规即 `apply()` 抛错），能走到此处即代表通过；
4. `execute → output.schema 校验 → render 投影` 全链路跑通；
5. 取消语义与宿主一致（宿主 dispatch 的兜底行为，非插件护栏证据）；
6. `run_code` 保留名被拒绝（防御性保留，默认不可达）。

**实测出处**：Node.js `22.23.3` 与 `24.21.0` 上各跑一次
`node scripts/dsh-compat-check.mjs legacy` 与 `... modern`，两条版本线均输出
`DSH_COMPAT_OK` 并以 0 退出。

### 构建期体检：产物不得内联宿主包

`scripts/host-inlining-guard.mjs` 把「不得钉死 DSH 版本」变成硬约束。这里踩过
**三处静默失效**，都已固化为反证用例（`test/build-plugin.test.mjs`）：

1. 判定**不能**用 `result.outputFiles`——它在 `write: true`（本项目实际构建方式）
   下恒为 `undefined`，分支永不进入；改用 `metafile.inputs`。
2. 命中后**不能**只 `result.errors.push()`——在 `onEnd` 里往 `errors` 推条目
   不会让构建失败；必须 `throw`。`metafile` 缺失时同样 `throw`。
3. 体检**不能留第二份副本**。抽成独立模块后，`build-plugin.mjs`（真正被执行
   的那份）里还留着一份旧副本，测试测的是孤儿模块——生产路径照旧静默失效，
   还多了一层「测试全绿」的假信心。

`test/build-plugin.test.mjs` 因此分三层钉住：**同源**（源码断言
`build-plugin.mjs` 必须 import 该模块、不得再出现 `const assertNoHostInlining =`
或 `result.errors.push`）、**反证**（`OPENLIULAN_BUILD_ENTRY` 指向含真实
`@deepseek-ai/cordis` import 的探针 → `node scripts/build-plugin.mjs` 必须非零
退出）、**不误报**（同机制跑干净入口必须退出 0）。

`test/plugin-smoke.mjs` 的产物检查也不再字符串匹配 `from "@deepseek-ai/cordis"`
（esbuild 内联后产物里只剩注释，拦不住内联、只会假绿），改为读生产构建落盘的
输入图、复用**同一份** `findHostInputs()`。

## 5. CI 接入

`.cnb.yml` 在 `main`（push）与 `pull_request` 上各挂两条任务：

```yaml
- name: build-and-test        # 构建（含产物体检）+ 全量测试 + 离目录冒烟
  stages:
    - install:  npm ci
    - build:    npm run build
    - test:     npm run test && npm run test:plugin
- name: dsh-compat            # 真实宿主双版本验收
  stages:
    - install:      npm ci
    - build-plugin: npm run build:plugin
    - legacy-host:  node scripts/dsh-compat-check.mjs legacy
    - modern-host:  node scripts/dsh-compat-check.mjs modern
```

`npm run test:plugin` 此前**存在但不在 CI**——插件产物坏了 CI 也不红，本次补齐。

任一验收失败即返回非零退出码，驱动 CI 红/绿——防止「新版适配」在后续
迭代里静默回归，也防止为了适配新版而反过来把旧版装崩。

## 6. 工具清单

插件**不硬编码工具清单**——`apply()` 直接遍历 `ForgeMcp.tools` 注册，期望清单也从
`@openliulan/mcp-server` 导出的 `TOOLS` / `GAME_TOOLS` 推导。好处是后续批次往 MCP
新增工具（例如 ISSUE #29 的游戏画像工具）时，插件自动跟随注册，且测试能真正发现
「漏注册」而不是被硬编码清单放过。

当前基线（`main` 已合并的部分）为 8 枚浏览器工具：

```text
browser_observe  browser_act       browser_diagnose  browser_eval
browser_screenshot  browser_session_log  browser_close  browser_stealth_status
```

## 7. 阶段边界

本版只做**插件注册契约的版本适配**，不改动浏览器控制能力本身：

- PTC mode 下「浏览器工具经 `run_code` 程序内调用」由宿主 SDK 自动投影，插件无需额外声明；
- 未额外提供 PTC-only 的 SDK 语义增强（如按 scope 调 `presentAs('ptc')`），留作后续增量，避免过度设计；
- 未引入 `@deepseek-ai/dsh-sandbox` 相关的 PTC sandbox 权限参数——本插件工具
  不使用 `run_code` 的 `sandbox_permissions` 通道，权限模型由宿主对
  `run_code` 自身的策略决定。
