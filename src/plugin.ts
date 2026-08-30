/**
 * dsh-openliulan deepseek harness 进程内浏览器控制插件入口。
 *
 * 把 dsh-openliulan 的统一 AI 浏览器控制框架（ForgeMCP：observe / act /
 * diagnose / eval / screenshot / session_log / close / stealth_status）
 * 注册为 deepseek harness 的原生工具，供 agent 的 tool_loop 直接调用。
 *
 * ## DSH 新版插件规则适配（2026-08）
 *
 * 新版本对插件有明确要求，不满足则旧插件不兼容：
 *
 * 1. **`inject = ['tools']`**：声明等待 host 的 `ctx.tools`（ToolRuntime）
 *    服务就绪后再加载本插件。旧版直接访问 `ctx.tools` 会导致加载顺序不可靠。
 * 2. **`parameters` 必须是完整 JSON Schema**：旧版只传 `properties`，
 *    新版要求完整的 `{ type, properties, required }` 对象（ParameterJsonSchema）。
 * 3. **`output.schema` 必须声明 `additionalProperties`**：新版要求显式
 *    声明，否则工具注册会失败。
 * 4. **`execute(args, exec)` 接受第二个参数**：新版签名是
 *    `execute(args, exec: ToolRunContext)`，`exec.signal` 用于取消。
 * 5. **`peerDependencies`**：package.json 必须声明 `@deepseek-ai/cordis`
 *    版本，让安装器校验宿主版本兼容性。
 *
 * @module @openliulan/dsh-openliulan
 */
import type { Context } from "@deepseek-ai/cordis";
import { ForgeMcp } from "@openliulan/mcp-server";

/** Cordis 插件名（用于 loader 诊断）。 */
export const name = "openliulan-browser";
/** 工具命名前缀，避免与 host 其它工具冲突。 */
const DEFAULT_PREFIX = "browser";

/** 等待 host 的 `ctx.tools`（ToolRuntime）服务就绪后再加载本插件。 */
export const inject = ["tools"] as const;

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
export function apply(ctx: Context, config: Record<string, unknown> = {}): void {
  const prefix = typeof config.prefix === "string" && config.prefix ? config.prefix : DEFAULT_PREFIX;
  const mcp = new ForgeMcp({
    headless: config.headless === undefined ? true : Boolean(config.headless),
    connectUrl: typeof config.connectUrl === "string" ? config.connectUrl : undefined,
    stealth: (config.stealth as never) ?? undefined,
  });

  // DSH 新版：通过 inject 声明后，ctx.tools 已由宿主保证就绪。
  const tools = ctx.tools;

  for (const tool of mcp.tools) {
    const publicName = `${prefix}_${tool.name}`;
    // DSH 新版：parameters 必须是完整 ParameterJsonSchema
    // （{ type, properties, required }），旧版只传 properties 不兼容。
    const parameters = tool.inputSchema as {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };

    ctx.effect(
      () =>
        tools.register({
          name: publicName,
          description: tool.description,
          parameters,
          output: {
            // canonical value：{ content: [{ type: "text", text }] }
            schema: {
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
            },
            render(_args: unknown, value: unknown): unknown[] {
              const text = resultText(
                ((value as { content?: { type?: string; text?: string }[] }) ?? {}).content ?? [],
              );
              return [{ type: "text", text }];
            },
          },
          execute: async (args: unknown) => {
            const result = await mcp.callTool(tool.name, toRecord(args));
            const text = resultText(result.content);
            if (!result.ok) throw new Error(text);
            // 返回 canonical value，类型符合 output.schema 声明
            return { content: [{ type: "text", text }] };
          },
        }),
      `openliulan.tool.${publicName}`,
    );
  }
}
