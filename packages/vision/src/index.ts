/**
 * @openliulan/vision —— 浏览器视觉桥
 *
 * 让纯文本模型通过浏览器「看见」：截图 → modlens 视觉引擎（MIT，
 * https://github.com/liustack/modlens）→ 纯文本证据（OCR/布局/语义/不确定项）。
 *
 * 成本阶梯：L0 DOM 文本 → L1 modlens 本地视觉 → L2 模型原生视觉（最贵）。
 */
export * from "./strategy.js";
export * from "./engine.js";
export * from "./format.js";
export * from "./opencode.js";
