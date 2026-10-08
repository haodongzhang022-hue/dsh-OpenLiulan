/**
 * DSH 宿主包的「类型声明桥」。
 *
 * 本插件的产物**不能依赖任何 `@deepseek-ai/*` 运行时符号**（否则会把 DSH
 * 版本钉死在 lib/index.js 里，破坏新旧双版本兼容，见
 * `scripts/build-plugin.mjs` 的构建期体检）。因此类型侧也统一走**本地声明**：
 *
 * - 不 `import type { Context } from '@deepseek-ai/cordis'`；
 * - 用结构化的本地接口描述「宿主注入给我们的最小契约」。
 *
 * 这样做的好处是：本仓库即使在没有安装 DSH 宿主的机器上（例如只跑单测的
 * 离线环境）也能通过类型检查，且插件代码始终只面向「我实际用到的三个字段」
 * 编程，天然不会随宿主内部类型变动而被动升级依赖。
 *
 * @module @openliulan/dsh-openliulan/dsh-types
 */

/**
 * 工具注册项：DSH `ToolRuntime.register()` 的入参中，本插件实际构造的子集。
 *
 * 形态在 dsh-tools `0.1.1`（旧版）与 `0.1.6`（新版）上一致；新版额外对
 * `output.schema` 执行强制 JSON Schema 子集校验（由
 * `src/dsh-schema.ts` 负责 keyword 白名单收敛与自检）。
 */
export interface HostToolDefinition {
  /** 工具名（全局唯一；`run_code` 为 DSH 保留名）。 */
  name: string;
  /** 给模型看的工具描述。 */
  description: string;
  /** 参数 JSON Schema（受支持子集；对象根）。 */
  parameters: SupportedParameters;
  /** 输出契约：canonical value schema + 模型内容投影。 */
  output: {
    schema: unknown;
    render(args: unknown, value: unknown): { type: string; text: string }[];
  };
  /** 工具体。新版签名为 `(args, exec)`；旧版只传 `args`，故 `exec` 可缺省。 */
  execute(args: unknown, exec?: HostToolRunContext): Promise<unknown>;
}

/** DSH `ToolRunContext` 中本插件实际使用的字段。 */
export interface HostToolRunContext {
  /** 调用方取消信号（新版明确要求工具 observe / forward）。 */
  signal?: { throwIfAborted?: () => void };
}

/** 参数 JSON Schema（受支持子集；对象根）。 */
export interface SupportedParameters {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/** DSH `ToolRuntime` 中本插件实际使用的字段。 */
export interface HostToolRuntime {
  register(definition: HostToolDefinition): () => void;
}

/**
 * Cordis 插件上下文：只声明本插件用到的 `tools` / `effect`。
 *
 * `tools` 由宿主通过 `inject = ['tools']` 保证就绪；
 * `effect` 用于把工具注册挂进宿主的 effect 生命周期（卸载时自动回收）。
 */
export interface HostContext {
  /** 工具运行时（宿主注入）。 */
  tools: HostToolRuntime;
  /**
   * 注册一个受宿主管理的副作用。
   *
   * @param fn - 副作用工厂，返回 disposer。
   * @param label - 诊断标签（新版要求可按工具名定位）。
   * @returns disposer 或宿主自己的回收句柄。
   */
  effect(fn: () => unknown, label?: string): unknown;
}
