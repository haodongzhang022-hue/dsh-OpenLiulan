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

## 2. 新版对插件的三条硬约束

### 2.1 `run_code` 是保留工具名

新旧两版都在 `register()` 里拒绝 `name === 'run_code'`。本插件所有工具都带
`prefix`（默认 `browser`），并从命名上规避；同时提供显式护栏
`assertNotReserved()`，让冲突在**注册前**以「prefix 选得不对」的措辞报出，
而不是让用户去看宿主的内部错误。

### 2.2 `output.schema` 受强制 JSON Schema 子集校验

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
`inputSchema` 压平为上述子集，并在注册前用 `validateAgainstSchema()`
对每枚工具的 canonical value 契约逐一自检；违规结果写入加载画像
（`loadProfile().schemaChecks`），不会变成「装上了但调用即炸」。

### 2.3 `execute(args, exec)` 必须尊重 `exec.signal`

新版明确要求异步工具 observe / forward 取消信号，并在 body 启动后到结果物化前
的取消窗口上返回 `ABORTED` / `ABORTED_BEFORE_DISPATCH`。本插件在
`execute` 入口 `exec?.signal?.throwIfAborted()`，已中止的调用不会触达工具体
（测试覆盖：取消后必须 `isError === true`）。

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

## 4. 验收方式

```bash
npm run test:plugin        # 假 ctx 冒烟：注册清单 + schema + 取消语义 + 产物不内联宿主包
npm run test:dsh-compat    # 真实宿主双版本验收（隔离临时目录各自安装真实宿主）
npx vitest run test/plugin-dsh-compat.test.mjs   # 用本仓库 devDependency 的真实 ToolRuntime 验收
```

`scripts/dsh-compat-check.mjs` 的验收项：

1. 工具全部注册可见，且与插件报告的清单一致（期望清单从 `@openliulan/mcp-server` 的工具表推导，不硬编码）；
2. 版本线探测结果符合预期（`legacy` / `modern`）；
3. `schemaChecks` 为空（无 schema 违规）；
4. `execute → output.schema 校验 → render 投影` 全链路跑通；
5. `exec.signal` 已中止时必须失败；
6. `run_code` 保留名被拒绝。

`scripts/build-plugin.mjs` 另加**构建期体检**：若产物内联了
`@deepseek-ai/dsh-tools` / `@deepseek-ai/cordis`，构建直接失败——
把「不得钉死 DSH 版本」变成硬约束而不是口头约定。

## 5. CI 接入

`.cnb.yml` 在 `main`（push）与 `pull_request` 上各挂一条 `dsh-compat` 任务：

```yaml
- name: dsh-compat
  docker:
    image: node:22
  stages:
    - name: install
      script: npm ci
    - name: build-plugin
      script: npm run build:plugin
    - name: legacy-host
      script: node scripts/dsh-compat-check.mjs legacy
    - name: modern-host
      script: node scripts/dsh-compat-check.mjs modern
```

任一版本线验收失败即返回非零退出码，驱动 CI 红/绿——防止「新版适配」在后续
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
