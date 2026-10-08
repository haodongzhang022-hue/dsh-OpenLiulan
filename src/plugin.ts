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
 * 新版 DSH（dsh-tools `0.1.6` 线）对插件注册有三处会直接影响加载成败的
 * 变更，本模块按「探测 → 适配 → 自检」三步兼容新旧两版：
 *
 * 1. **`run_code` 是保留工具名**。新版把 Code Mode 重命名为 PTC mode，
 *    `ToolRuntime.register()` 对 `name === 'run_code'` 直接抛错（旧版同样保留）。
 *    **主防线是命名前缀**（默认 `browser_`），使所有工具名天然远离保留名；
 *    {@link assertNotReserved} 是**防御性保留**，真实路径上默认不可达，
 *    详见其文档。
 * 2. **schema 受强制 JSON Schema 子集校验**。新版在 `register()` 里执行
 *    `assertSupportedJsonSchema(output.schema)`。本插件把 MCP 侧宽松
 *    `inputSchema` 与输出 schema 统一走 {@link normalizeSchema} 收敛到受支持
 *    子集，并在注册前用 {@link checkSupportedSchema} 做**结构自检**——
 *    违规即抛错、加载失败，而不是「装上了但调用即炸」。
 * 3. **`execute(args, exec)` 的 `exec.signal` 必须被尊重**。新版要求异步工具
 *    响应取消，并在 body 启动前 / 启动后的取消窗口上返回
 *    `ABORTED_BEFORE_DISPATCH` / `ABORTED`。本插件在 `execute` 入口做
 *    `throwIfAborted()`，把「已中止的调用」在触达浏览器前截断，与宿主语义对齐。
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
import {
  checkRawSchemaSubset,
  checkSupportedSchema,
  isPlainRecord,
  normalizeSchema,
  type SupportedSchemaNode,
} from "./dsh-schema.js";
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

/** DSH 适配状态：供宿主诊断与 CI 验收使用。 */
export type DshFlavor = "modern" | "legacy" | "unknown";

/** 适配器探测到的宿主能力。 */
export interface DshHostProfile {
  /** 宿主 DSH 版本线。 */
  flavor: DshFlavor;
  /** 探测到的依据（人类可读，便于排障）。 */
  evidence: string;
  /** 注入的插件的 Cordis 版本要求（`inject` 声明）。 */
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
 * 注册期护栏：拒绝 DSH 保留工具名（**防御性保留**，非主防线）。
 *
 * 新版（dsh-tools 0.1.6 线）把 Code Mode 重命名为 PTC mode，但
 * `run_code` 仍是保留的 presentation transport，`ToolRuntime.register()`
 * 对其直接抛错。
 *
 * **可达性**：真实调用路径上，本护栏只在「MCP 工具表里存在名为 `code`
 * 的工具，且用户把 prefix 设为 `run`」时才可能命中；当前 MCP 工具表没有
 * `code` 工具，故该护栏默认不可达（`prefix="run"` 产出的是 `run_observe`
 * 等，不是 `run_code`）。它保留为兜底：将来 MCP 侧新增 `code` 工具、或
 * 用户直接以保留名作 prefix 时仍会拦下。
 *
 * 因此判定同时覆盖 `toolName`（MCP 侧原始名）与 `publicName`（加 prefix 后）。
 * **主防线是命名前缀**——默认 `browser_` 使所有工具名天然远离保留名。
 *
 * @param publicName - 加上 prefix 后的最终工具名。
 * @param toolName - MCP 侧原始工具名（未加 prefix），一并判定。
 * @throws 当任一名命中 DSH 保留名时。
 */
export function assertNotReserved(publicName: string, toolName?: string): void {
  const hit = [publicName, toolName].find((candidate) => candidate === RESERVED_TOOL_NAME);
  if (hit !== undefined) {
    throw new Error(
      `[openliulan] 工具名 "${hit}" 是 DSH 保留名（PTC/Code mode 的 run_code transport），请改用其它 prefix`,
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

  for (const tool of mcp.tools) {
    const publicName = `${prefix}_${tool.name}`;

    // 防御性保留名护栏（默认不可达，见 assertNotReserved 文档）。
    assertNotReserved(publicName, tool.name);

    // DSH 新版：parameters 必须是受支持子集的 ParameterJsonSchema，
    // 且必须是**对象根**（`ParameterJsonSchema extends ObjectJsonSchema`）。
    // MCP 侧 inputSchema 本就是 { type: 'object', properties, required }；
    // 经 normalizeSchema 收敛 keyword 后强制对象根（不做类型一致性修正，
    // const/enum 一律原样保留、由下方注册期自检拒绝）。additionalProperties
    // 只在作者显式声明时保留，不擅自加严。
    const normalized = normalizeSchema(tool.inputSchema);

    // 压平护栏（🟡-K / 🟡-1 / 🟡-3）：下面的 `parameters` 只从 normalized 里取
    // `properties` / `required` / `additionalProperties`，**其余约束 keyword 会被
    // 静默丢掉**——工具注册成功，却变成「收任意参数」。压平后的 parameters 能通过
    // 注册期自检，自检看不出丢失，所以必须在这里拦。
    //
    // 丢的不是「位置不受支持的写法」（那是 🟡-G：`oneOf` 的兄弟 keyword），而是
    // **整个取值约束**。护栏选**抛**：响亮失败优于静默变宽。
    //
    // **论据（🟡-5 校准过）**：宿主 `register()` 里的 `assertSupportedJsonSchema`
    // 只校验 `output.schema`，**不看 `parameters` 根**；全 `@deepseek-ai/*` 包内
    // `assertObjectJsonSchema` 除定义与导出外没有调用点。所以「交给宿主兜底」这条
    // 退路不存在——`{oneOf:[…]}` / `{type:'string'}` 这类根，宿主注册阶段一律放行。
    // 护栏存在的理由是**本模块自检也拦不住压平**（压平后的 parameters 合法），
    // 只能在这里拦。未来维护者别因为「宿主会拒」而放松这里。
    //
    // **覆盖面（🟡-N 校正过）**：判据分四层。前三层是**枚举**的，抓的是几何形状
    // 已知的那几类；第四层是**白名单**，抓的是「枚举漏掉、但归一同样会丢」的整片。
    //
    // 关于措辞的一段历史：此处曾写「覆盖整类」。那是**无例支撑的全称断言**——
    // `ROOT_ONLY_KEYWORDS` 是手工枚举，`anyOf` / `pattern` / `minProperties` 一字之差
    // 就整片放行（测试席 F1–F4 已证）。现在枚举层只说它枚举了什么，全称性由
    // 第 4 层的白名单闸承担，并有逐类用例（`test/plugin-object-root.test.mjs`）。
    //
    // 1. **根必须是记录**（🟡-1）：`'oops'` / `42` / `null` / `[{…}]` / `undefined`
    //    会被 normalizeSchema 归成 `{}`，护栏与自检**双双放行**，注册成
    //    「收任意参数」——与 🟡-K 同类，是它漏掉的子面。宿主对同一份原样输入直接
    //    拒绝（`schema must be a schema object`）。`undefined` 与 `{}` 不同路径：
    //    `{}` 是合法对象根，`'oops'` / `42` / `null` / `[{…}]` 是形状错误。
    // 2. **根上 `parameters` 表达不了的约束 keyword**：`oneOf` / `enum` / `const` /
    //    `items` 一律丢；`additionalProperties` 只在**非布尔**时丢（🟡-3，布尔是
    //    `parameters` 能表达的，normalizeSchema 已保留，不拦以免误伤真实工具表）。
    //    看 raw 而不只看 normalized：`items` 在 `type:'object'` 下就被 normalizeSchema
    //    丢掉了，只看 normalized 会漏掉 `{ type:'object', items:… }`。
    // 3. **根 `type` 声明必须是 `undefined` 或 `"object"`**：`{ type:'string' }` /
    //    `{ type:['string'] }` / `{ type:'strin' }` / `{ type:42 }`（🟡-3）。
    //    这一层拆成两个判据，因为它们**不冗余、只看其一都会漏一类**（实测）：
    //    - `rawInput.type`：非法声明（数组 / 拼错 / 非字符串）会被 `normalizeSchema`
    //      **静默丢掉**，归一成 `{}`，此时 `normalized.type` 是 `undefined`
    //      ——**只有 raw 判据拦得住**。
    //    - `normalized.type`：`{ type:'string' }` 这种合法但非对象的声明，
    //      `normalizeSchema` **保留**了它，两个判据都会命中。
    //    所以两判据对 `{ type:'string' }` 重叠、对非法声明互补；缺 raw 判据则
    //    非法声明漏网（回归 204 全绿的那种漏）。宿主对原样输入一律拒绝
    //    （`schema.type must be one of …`）。
    //    **精度备注（测试席穷举 112 万 + 42 万组后给出）**：`normalized.type`
    //    从不**单独**命中——凡它命中处，第 3 层的 raw 判据必同时命中。所以这两条
    //    是**行为冗余**（互补性只对「非法声明」成立，而那靠的是 raw 判据本身），
    //    不是「缺任一层都会漏」。保留它只为让诊断文案同时指出归一后的类型；
    //    删掉它零行为变化（🟡-2b 的 `toMatch(/type=string/)` 是**消息断言**，
    //    不是行为断言）。
    // 4. **raw 白名单闸**（🟡-N / 测试席 F1–F4）：前三层枚举的是「我们**认识**的
    //    会丢的 keyword」，而真正会丢的是「`normalizeSchema` **不认识**的一切」。
    //    两者不等价：`anyOf` / `allOf` / `not` / `$ref` / `if…then` /
    //    `minProperties` / `patternProperties` / `propertyNames` 作根（F1），
    //    `properties.a` 上的 `pattern` / `minLength` / `format` / `maximum` /
    //    `minItems` / 嵌套 `anyOf`（F2），`{additionalProperties:false}` 单独出现
    //    （F3：无 `type`、无 `properties` → `looksObject` 为假 → keyword 整个丢），
    //    以及 `required` 被收敛掉作者声明的名字（F4）——全部**静默压平 → 注册成功
    //    → 宿主对原样输入拒绝**。前三层一个都拦不住。
    //    所以第 4 层不问「我们认识什么」，只问「**作者原样的 schema 是否已落在受支持
    //    子集内**」——直接复用 `checkRawSchemaSubset()`（`checkSupportedSchema` 的
    //    语义），**判定只有一份实现**。减去的是 🟡-G 明确接受的有意宽松
    //    （`oneOf` 与兄弟 keyword 并写的豁免），豁免口径与证明见该函数与 docs。
    //    真实工具表 8/8 通过、9 种合法形态（嵌套 `enum`/`const`/`oneOf`/注解/数组/
    //    integer/null…）全放行——不误伤。
    // 影响面：8/8 工具都是 `{ type:'object', properties }`，今天不可达；MCP 协议本就
    // 要求对象根，属健壮性护栏。
    const ROOT_ONLY_KEYWORDS = ["oneOf", "enum", "const", "items"] as const;
    const rawInput: unknown = tool.inputSchema;
    const rootReasons: string[] = [];
    if (!isPlainRecord(rawInput)) {
      rootReasons.push(`根不是普通记录（${rawInput === null ? "null" : Array.isArray(rawInput) ? "array" : typeof rawInput}）`);
    } else {
      for (const key of ROOT_ONLY_KEYWORDS) {
        if (rawInput[key] !== undefined) rootReasons.push(`丢掉根 ${key}`);
      }
      if (rawInput.additionalProperties !== undefined && typeof rawInput.additionalProperties !== "boolean") {
        rootReasons.push(`丢掉根 additionalProperties(${typeof rawInput.additionalProperties})`);
      }
    }
    if (normalized.type !== undefined && normalized.type !== "object") {
      rootReasons.push(`type=${String(normalized.type)}`);
    }
    if (isPlainRecord(rawInput) && rawInput.type !== undefined && rawInput.type !== "object") {
      // raw 上的 type 声明：非法（数组/拼错/非字符串）或合法但非对象（如 `'string'`）。
      // 归一后非法声明会消失，所以这一层必须在 raw 上看。
      rootReasons.push(`丢掉根 type(${JSON.stringify(rawInput.type)})`);
    }
    // 第 4 层：raw 白名单闸（枚举漏掉的那整片）。放在最后，让枚举层先给出更精确的
    // 原因；两者都不命中的输入才会走到这里。
    for (const violation of checkRawSchemaSubset(rawInput)) {
      rootReasons.push(`原样 schema 不在受支持子集内（${violation}）`);
    }
    if (rootReasons.length > 0) {
      throw new Error(
        `[openliulan] ${publicName} inputSchema 的根必须是纯对象 schema（DSH ParameterJsonSchema 要求对象根；` +
          `压平护栏拦下的根约束: ${rootReasons.join(" / ")}）: ` +
          JSON.stringify(tool.inputSchema),
      );
    }

    const parameters: SupportedParameters = {
      type: "object",
      properties: normalized.properties ?? {},
      ...(normalized.required === undefined ? {} : { required: normalized.required }),
      ...(normalized.additionalProperties === undefined
        ? {}
        : { additionalProperties: normalized.additionalProperties }),
    };

    // 注册前**结构自检**：校验 schema 本身（静态数据）是否落在受支持子集内。
    // 违规即抛错——加载期失败比「装上了但调用即炸」可诊断得多。
    const violations = [
      ...checkSupportedSchema(parameters).map((v) => `parameters: ${v}`),
      ...checkSupportedSchema(CONTENT_BLOCKS_SCHEMA).map((v) => `output.schema: ${v}`),
    ];
    if (violations.length > 0) {
      throw new Error(`[openliulan] ${publicName} schema 不在 DSH 受支持子集内: ${violations.join("; ")}`);
    }

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
           *
           * 这里显式 `throwIfAborted()`：已中止的调用在触达 ForgeMcp（进而
           * 启动浏览器）之前就抛出。宿主侧另有 `ABORTED_BEFORE_DISPATCH` /
           * `ABORTED` 的兜底，本插件不重复实现那层语义。
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

  // 暴露一条「适配自检」的宿主观测点：DSH 版本线 + 工具清单。
  // 不注册成模型可见工具，避免污染工具目录；由 loadProfile() 读取。
  // 卸载（effect disposer 触发）时同步清理，避免同 prefix 重载后读到陈旧画像。
  PROFILES.set(prefix, {
    host,
    prefix,
    tools: mcp.tools.map((t) => `${prefix}_${t.name}`),
  });
  ctx.effect(
    () => () => {
      if (PROFILES.get(prefix)?.host === host) PROFILES.delete(prefix);
    },
    `openliulan.profile.${prefix}`,
  );
}

/** 已加载的插件实例画像（供宿主/测试/CI 读取，不注册为模型可见工具）。 */
export interface LoadedProfile {
  host: DshHostProfile;
  prefix: string;
  tools: string[];
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

/**
 * 诊断辅助的再导出：让 `test/plugin-smoke.mjs` 能直接对**已构建产物**
 * （`lib/index.js`）校验 schema，而不必依赖 Node 的 TS 剥离能力。
 * DSH 只读 `apply` / `name` / `inject`，额外导出不影响加载。
 */
export {
  checkRawSchemaSubset,
  checkSupportedSchema,
  isPlainRecord,
  normalizeSchema,
  validateAgainstSchema,
} from "./dsh-schema.js";
