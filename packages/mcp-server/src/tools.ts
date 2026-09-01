/**
 * MCP 工具定义
 *
 * 把 Forge 的核心能力封装为标准的 MCP 工具集，供任何 MCP 客户端（
 * deepseek harness、cnb.cool、Claude Desktop 等）调用。
 *
 * 工具设计原则（借鉴 Chrome DevTools MCP 的调试优先 + 高效）：
 * - observe：高效页面快照（替代冗长 DOM dump）——成本阶梯 L0（纯文本，零成本）
 * - act：统一动作执行
 * - diagnose：5 星调试诊断
 * - eval：注入 JS 高级诊断
 * - vision：截图 + modlens 视觉引擎 → 纯文本证据 —— 成本阶梯 L1
 * - screenshot：原生图片（多模态模型可见）—— 成本阶梯 L2，最后手段
 *
 * 视觉成本阶梯见 @openliulan/vision 的 VISION_LADDER：L0 → L1 → L2 逐级升级。
 */
import { VISION_TOOL_DESCRIPTION } from "@openliulan/vision";

export interface McpToolSchema {
  name: string;
  description: string;
  /** JSON Schema 入参 */
  inputSchema: Record<string, unknown>;
}

export const TOOLS: McpToolSchema[] = [
  {
    name: "observe",
    description:
      "获取当前页面的高效快照。返回精简后的可交互元素索引（带 ref）与页面统计。Token 友好，是理解页面的首选。（成本阶梯 L0：纯文本 DOM 快照，零额外成本，是理解页面的默认第一步）",
    inputSchema: {
      type: "object",
      properties: {
        maxNodes: { type: "number", description: "最大节点数（默认 200）" },
        maxTextLength: { type: "number", description: "单节点文本最大长度（默认 80）" },
      },
    },
  },
  {
    name: "act",
    description:
      "执行一个统一浏览器动作（navigate/click/fill/type/select/hover/scroll/press/wait/extract/assert/screenshot/evaluate）。",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["navigate", "click", "fill", "type", "select", "hover", "scroll", "press", "wait", "extract", "assert", "screenshot", "evaluate"],
          description: "动作类型",
        },
        description: { type: "string" },
        // 通用定位
        ref: { type: "string", description: "observe 返回的元素 ref（最精确）" },
        selector: { type: "string", description: "CSS 选择器" },
        text: { type: "string", description: "精确文本定位" },
        semantic: { type: "string", description: "语义描述定位" },
        // 动作参数
        url: { type: "string" },
        value: { type: "string" },
        key: { type: "string" },
        ms: { type: "number" },
        script: { type: "string" },
        mode: { type: "string" },
        expected: { type: "string" },
        // 截图/滚动/输入/导航细节（供 IDE 的 function calling 完整声明，避免能力被隐藏）
        fullPage: { type: "boolean", description: "screenshot 时是否整页截图" },
        deltaY: { type: "number", description: "scroll 时垂直滚动距离" },
        delay: { type: "number", description: "type 时逐键输入延迟(ms)" },
        waitUntil: { type: "string", enum: ["load", "domcontentloaded", "networkidle", "commit"], description: "navigate 时等待策略" },
        waitForNavigation: { type: "boolean", description: "click 时是否等待导航稳定（点击链接触发跳转时）" },
      },
      required: ["type"],
    },
  },
  {
    name: "diagnose",
    description:
      "运行 5 星调试诊断，采集控制台错误、网络失败、JS 异常、性能指标，并返回健康度与 AI 可读建议。动作失败后自动诊断。",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "eval",
    description: "在页面注入执行 JavaScript，用于高级诊断与状态检查。",
    inputSchema: {
      type: "object",
      properties: { script: { type: "string", description: "要执行的 JS 表达式/语句" } },
      required: ["script"],
    },
  },
  {
    name: "screenshot",
    description:
      "截取当前页面（可整页），返回 base64 图片，用于视觉确认。截图会作为图片事件写入会话日志，供多模态 AI 消费。（成本阶梯 L2 最后手段：原生图片仅多模态模型可见并计费；纯文本模型请优先用 vision L1 获取文本证据）",
    inputSchema: {
      type: "object",
      properties: {
        fullPage: { type: "boolean", description: "是否整页截图" },
        caption: { type: "string", description: "截图说明（写入日志事件）" },
      },
    },
  },
  {
    name: "session_log",
    description:
      "获取当前会话的事件日志流（动作/诊断/错误/截图轨迹）。这是 AI 协作的追踪能力：让外部 AI 看到『发生了什么 + 为什么失败 + 建议』。format=json 返回结构化事件，默认返回 markdown。",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["markdown", "json"], description: "输出格式，默认 markdown" },
        title: { type: "string", description: "markdown 报告标题" },
      },
    },
  },
  {
    name: "close",
    description: "关闭浏览器，结束会话。",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "stealth_status",
    description: "查看防检测（Stealth）模块状态：是否启用、级别、UA 策略等。防检测用于避免被目标站点识别为爬虫而限速/封禁。",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vision",
    description: VISION_TOOL_DESCRIPTION,
    inputSchema: {
      type: "object",
      properties: {
        focus: { type: "string", description: "关注点（可选）：告诉引擎重点看什么，如“页面中间的弹窗文案与按钮颜色”" },
        fullPage: { type: "boolean", description: "是否整页截图（默认仅视口）" },
        savePath: { type: "string", description: "可选：截图 PNG 的绝对路径（默认系统临时目录）" },
      },
    },
  },];

/** 工具调用结果（协议无关的标准响应结构） */
export interface ToolResult {
  /** 是否成功 */
  ok: boolean;
  /** 供 AI 阅读的文本 */
  content: Array<{ type: "text"; text: string }>;
  /** 结构化数据（如截图 base64） */
  structured?: Record<string, unknown>;
  /** 错误信息 */
  isError?: boolean;
}

/** 把任意结果包装为标准 ToolResult */
export function okResult(text: string, structured?: Record<string, unknown>): ToolResult {
  return { ok: true, content: [{ type: "text", text }], structured };
}

export function errResult(text: string): ToolResult {
  return { ok: false, content: [{ type: "text", text }], isError: true };
}
