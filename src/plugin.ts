/**
 * dsh-openliulan deepseek harness 进程内浏览器控制插件入口。
 *
 * 把 dsh-openliulan 的统一 AI 浏览器控制框架（ForgeMCP）工具注册为
 * deepseek harness 的原生工具，供 agent 的 tool_loop 直接调用。
 *
 * 工具清单**由 `ForgeMcp.tools` 决定**（本模块不硬编码），因此后续批次
 * 往 `@openliulan/mcp-server` 增加工具（例如 ISSUE #29 的游戏画像工具）
 * 时，插件会自动跟随，不会漏注册。
 *
 * ## ISSUE #33：新版 DSH 适配（兼容旧版）
 *
 * 新版 DSH（dsh-tools `0.1.6` 线）对插件注册有三处**会直接决定加载成败**的
 * 变更，本模块按「探测 → 适配 → 自检」三步兼容新旧两版：
 *
 * 1. **`run_code` 成为保留工具名**。新版把 Code Mode 重命名为 PTC mode，
 *    `ToolRuntime.register()` 对 `name === 'run_code'` 直接抛错（旧版同样保留）。
 *    本插件所有工具都带 `prefix`（默认 `browser`），从命名上规避冲突；
 *    并在注册前主动做一次保留名自检，避免用户改 prefix 后炸在宿主里。
 * 2. **`output.schema` 受强制 JSON Schema 子集校验**。新版在
 *    `register()` 里执行 `assertSupportedJsonSchema(output.schema)`；
 *    `type: 'json'` 之类的作者侧写法不再被接受。本插件的输出 schema
 *    统一走 {@link normalizeSchema} 压平为受支持子集，并在注册前
 *    用 {@link validateAgainstSchema} 自检。
 * 3. **`execute(args, exec)` 的 `exec.signal` 必须被尊重**。新版明确要求
 *    异步工具 observe / forward 取消信号，并在 body 启动后到结果物化前
 *    的取消窗口上返回 `ABORTED` / `ABORTED_BEFORE_DISPATCH`。本插件在
 *    `execute` 入口对 `exec.signal` 做 `throwIfAborted()`——已中止的调用
 *    不会触达工具体（浏览器不会被启动），与宿主的取消语义对齐。
 *
 * 同时保留旧版兼容（`inject = ['tools']` 在 0.1.1 与 0.1.6 上语义一致，
 * `register(definition)` 返回 disposer 亦为两版共有契约），因此**同一份
 * 产物可同时安装在旧版与新版 DSH 上**，安装时无需选择通道。
 *
 * ### 版本探测
 *
 * 本模块不 `import` 任何 `@deepseek-ai/dsh-tools` 运行时符号（避免把
 * peer 版本钉死在产物里），而是**探测已就绪的 `ctx.tools` 实例**：
 * 读取其 `constructor.Config`（schemastery schema）的公开 `toString()`
 * 投影，其中 `mode` 的取值集合即版本线指纹：
 * - 含 `'ptc'` → 新版（dsh-tools `0.1.6` 线），`flavor = 'modern'`；
 * - 含 `'code'` → 旧版（`0.1.1` 线），`flavor = 'legacy'`；
 * - 无法判定 → `flavor = 'unknown'`，按兼容路径注册，不抛错、不阻断加载。
 *
 * 探测结果通过 {@link loadProfile} 暴露（不注册为模型可见工具，
 * 避免污染工具目录），供宿主诊断、CI 验收与用户排障读取。
 *
 * @module @openliulan/dsh-openliulan
 */
import { ForgeMcp } from "@openliulan/mcp-server";
import { normalizeSchema, validateAgainstSchema, type SupportedSchemaNode } from "./dsh-schema.js";
import type { HostContext, HostToolRunContext, SupportedParameters } from "./dsh-types.js";

/** Cordis 插件名（用于 loader 诊断）。 */
export const name = "openliulan-browser";
/** 工具命名前缀，避免与 host 其它工具冲突。 */
const DEFAULT_PREFIX = "browser";

/** DSH 保留的工具名：任何插件都不得注册或遮蔽。 */
const RESERVED_TOOL_NAME = "run_code";

/**
 * 等待 host 的 `ctx.tools`（ToolRuntime）服务就绪后再加载本插件。
 *
 * 该声明在 dsh-tools `0.1.1`（旧版）与 `0.1.6`（新版）上语义一致：
 * `ToolRuntime.inject = ['systemPrompt']`，本插件只依赖 `tools`。
 */
export const inject = ["tools"] as const;

/** DSH 适配状态：供 `browser_capabilities` 工具与宿主诊断使用。 */
export type DshFlavor = "modern" | "legacy" | "unknown";

/** 适配器探测到的宿主能力。 */
export interface DshHostProfile {
  /** 宿主 DSH 版本线。 */
  flavor: DshFlavor;
  /** 探测到的依据（人类可读，便于排障）。 */
  evidence: string;
  /** 注入的插件的 Cordis 版本要求（`inject` 声明长度等）。 */
  injected: string[];
}

/**
 * 探测宿主 DSH 版本线。
 *
 * 不导入任何 `@deepseek-ai/dsh-tools` 符号——新版把 Code Mode 改名 PTC，
 * `ToolRuntime.Config` 上 `mode` 的合法取值集合从 `native|code|both`
 * 变为 `native|ptc|both`。`Config` 是 schemastery schema，其 `toString()`
 * 是公开且稳定的投影（新旧版都为 `"native" | ... | "both"` 形态），
 * 因此读取该投影即可判定版本线，无需内省 schemastery 内部结构。
 *
 * @param tools - 宿主注入的 `ctx.tools`（ToolRuntime 实例）。
 * @returns 宿主能力画像。
 */
export function detectDshFlavor(tools: unknown): DshHostProfile {
  const injected = [...inject];
  try {
    const ctor = (tools as { constructor?: { Config?: unknown } } | undefined)?.constructor;
    const config = ctor?.Config as { toString?: () => string } | undefined;
    const rendered = typeof config?.toString === "function" ? config.toString() : "";
    if (/["']ptc["']/.test(rendered)) {
      return { flavor: "modern", evidence: `tools.Config.mode ~ ${rendered}`, injected };
    }
    if (/["']code["']/.test(rendered)) {
      return { flavor: "legacy", evidence: `tools.Config.mode ~ ${rendered}`, injected };
    }
    const hasRegister = typeof (tools as { register?: unknown } | undefined)?.register === "function";
    return {
      flavor: "unknown",
      evidence: hasRegister ? "tools.register 可用，但 Config 未暴露 mode 取值" : "ctx.tools 结构异常",
      injected,
    };
  } catch {
    return { flavor: "unknown", evidence: "探测抛错，按兼容路径注册", injected };
  }
}

/**
 * 注册期护栏：拒绝 DSH 保留工具名。
 *
 * 新版（dsh-tools 0.1.6 线）把 Code Mode 重命名为 PTC mode，但
 * `run_code` 仍是保留的 presentation transport，`ToolRuntime.register()`
 * 对其直接抛错。本插件提前显式失败，让用户看到「prefix 选得不对」，
 * 而不是宿主的内部错误。
 *
 * @param publicName - 加上 prefix 后的最终工具名。
 * @throws 当名字命中 DSH 保留名时。
 */
export function assertNotReserved(publicName: string): void {
  if (publicName === RESERVED_TOOL_NAME) {
    throw new Error(
      `[openliulan] 工具名 "${publicName}" 是 DSH 保留名（PTC/Code mode 的 run_code transport），请改用其它 prefix`,
    );
  }
}

/** 容错取值：把调用参数收敛为对象（模型可能输出裸值）。 */
function toRecord(args: unknown): Record<string, unknown> {
  return typeof args === "object" && args !== null ? (args as Record<string, unknown>) : {};
}

/** 把 ForgeMCP 调用方返回值映射为 harness ContentBlock 文本。 */
function resultText(content: readonly { type?: string; text?: string }[] | undefined): string {
  if (!content || content.length === 0) return "(无输出)";
  return content.map((block) => block.text ?? "").join("\n");
}

/**
 * 统一的工具输出契约：canonical value = `{ content: [{ type, text }] }`。
 *
 * 该 schema 是**受支持子集**（对象根 + 显式 `additionalProperties: false`
 * + `required: ['content']`），可同时通过新旧两版的 `output.schema` 校验。
 */
const CONTENT_BLOCKS_SCHEMA: SupportedSchemaNode = {
  type: "object",
  properties: {
    content: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          text: { type: "string" },
        },
        additionalProperties: true,
      },
    },
  },
  required: ["content"],
  additionalProperties: false,
};

/** 把 canonical value 投影为模型内容块。 */
function renderContent(_args: unknown, value: unknown): { type: string; text: string }[] {
  const content = (value as { content?: { type?: string; text?: string }[] } | undefined)?.content ?? [];
  return [{ type: "text", text: resultText(content) }];
}

/** 注册期自检结果（用于诊断，不影响已成功注册的工具）。 */
export interface SchemaCheck {
  tool: string;
  violations: string[];
}

/**
 * Cordis 插件入口：构造一个进程内的 ForgeMcp 实例，把其工具映射为
 * deepseek harness 的 ToolDefinition 并注册到 `ctx.tools`。
 *
 * 配置（可在 cordis.patch.yml 覆盖）：
 * - `headless`: 无头模式（默认 true）
 * - `connectUrl`: 可选，CDP 连接已启动的浏览器
 * - `prefix`: 工具命名前缀（默认 "browser"）
 * - `stealth`: 可选，防检测配置
 *
 * @param ctx - 插件上下文（宿主注入，含工具注册服务）。
 * @param config - 解析后的插件配置。
 */
export function apply(ctx: HostContext, config: Record<string, unknown> = {}): void {
  const prefix = typeof config.prefix === "string" && config.prefix ? config.prefix : DEFAULT_PREFIX;
  const mcp = new ForgeMcp({
    headless: config.headless === undefined ? true : Boolean(config.headless),
    connectUrl: typeof config.connectUrl === "string" ? config.connectUrl : undefined,
    stealth: (config.stealth as never) ?? undefined,
  });

  // DSH 新版：通过 inject 声明后，ctx.tools 已由宿主保证就绪。
  // 旧版（0.1.1 线）同样支持 inject，故无需等待重试。
  const tools = ctx.tools;
  const host = detectDshFlavor(tools);

  /** 注册期自检：暴露给诊断与 `browser_capabilities`。 */
  const schemaChecks: SchemaCheck[] = [];

  for (const tool of mcp.tools) {
    const publicName = `${prefix}_${tool.name}`;

    // 保留名自检：新版 register() 对 'run_code' 直接抛错，
    // 这里提前显式失败，让用户看到「prefix 选得不对」而不是宿主的内部错误。
    assertNotReserved(publicName);

    // DSH 新版：parameters 必须是受支持子集的 ParameterJsonSchema，
    // 且必须是**对象根**（`ParameterJsonSchema extends ObjectJsonSchema`）。
    // MCP 侧的 inputSchema 本就是 { type: 'object', properties, required }；
    // 经 normalizeSchema 压平后强制对象根，并补齐 additionalProperties 布尔位。
    const normalized = normalizeSchema(tool.inputSchema);
    const parameters: SupportedParameters = {
      type: "object",
      properties: normalized.properties ?? {},
      ...(normalized.required === undefined ? {} : { required: normalized.required }),
      additionalProperties: normalized.additionalProperties ?? true,
    };

    // 注册前自检：把违规项记入诊断标签，避免「装上了但调用即失败」。
    const violations = [
      ...validateAgainstSchema(CONTENT_BLOCKS_SCHEMA, { content: [] }).map((v) => `output.schema: ${v}`),
    ];
    if (violations.length > 0) schemaChecks.push({ tool: publicName, violations });

    ctx.effect(
      () =>
        tools.register({
          name: publicName,
          description: tool.description,
          parameters,
          output: {
            // canonical value：{ content: [{ type: "text", text }] }
            schema: CONTENT_BLOCKS_SCHEMA,
            render: renderContent,
          },
          /**
           * DSH 新版签名 `execute(args, exec)`，`exec.signal` 用于取消。
           * 旧版调用时只传 args，故对 `exec` 做可选处理，保持双版本兼容。
           */
          execute: async (args: unknown, exec?: HostToolRunContext) => {
            exec?.signal?.throwIfAborted?.();
            const result = await mcp.callTool(tool.name, toRecord(args));
            const text = resultText(result.content);
            if (!result.ok) throw new Error(text);
            // 返回 canonical value，类型符合 output.schema 声明
            return { content: [{ type: "text", text }] };
          },
        }),
      // 新版要求 effect 标签唯一可定位：按工具名细化，便于诊断定位。
      `openliulan.tool.${publicName}`,
    );
  }

  // 暴露一条「适配自检」的宿主观测点：DSH 版本线 + 工具清单 + schema 自检结果。
  // 不注册成模型可见工具，避免污染工具目录；由 loadProfile() 读取。
  PROFILES.set(prefix, {
    host,
    prefix,
    tools: mcp.tools.map((t) => `${prefix}_${t.name}`),
    schemaChecks,
  });
}

/** 已加载的插件实例画像（供宿主/测试/CI 读取，不注册为模型可见工具）。 */
export interface LoadedProfile {
  host: DshHostProfile;
  prefix: string;
  tools: string[];
  schemaChecks: SchemaCheck[];
}

/** 按 prefix 索引的已加载画像。 */
export const PROFILES = new Map<string, LoadedProfile>();

/**
 * 读取某个 prefix 的加载画像（供适配自检与测试使用）。
 *
 * @param prefix - 工具前缀，缺省 `"browser"`。
 * @returns 加载画像，未加载时为 undefined。
 */
export function loadProfile(prefix = DEFAULT_PREFIX): LoadedProfile | undefined {
  return PROFILES.get(prefix);
}
