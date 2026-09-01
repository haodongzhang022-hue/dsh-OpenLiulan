/**
 * format.ts —— 把视觉证据格式化为纯文本（给纯文本模型直接消费）
 */
import type { VisionResult } from "./engine.js";
import { VISION_LADDER } from "./strategy.js";

export interface FormatOptions {
  /** 关注点（原样回显，帮助模型对齐） */
  focus?: string;
  /** 是否省略冗长段（如逐行 OCR lines），默认 false */
  compact?: boolean;
}

/** 单行截断 */
function clip(s: string, n = 200): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

/**
 * 把 VisionResult 渲染成 markdown 文本。
 * 顺序：来源信息 → 总结 → OCR 全文 → 布局区域（按阅读顺序）→ 语义 → 视觉 → 不确定项。
 * 末尾附升级提示：证据不足时如何升到 L2（模型原生视觉）。
 */
export function formatVisionEvidence(v: VisionResult, opts: FormatOptions = {}): string {
  const lines: string[] = [];
  if (!v.ok) {
    lines.push("## 👁 视觉引擎不可用/失败");
    lines.push((v.error ?? "未知错误").split("\n").join("\n> "));
    lines.push("");
    lines.push("> 若未安装引擎，执行 `dsh plugin --profile web add liustack/modlens` 后重试（见 THIRD_PARTY_NOTICES.md 归属声明）。");
    return lines.join("\n");
  }
  lines.push("## 👁 视觉证据 (modlens)");
  if (opts.focus) lines.push(`**关注点**: ${clip(opts.focus, 120)}`);
  const src = [v.provider ? `provider=${v.provider}` : "", v.model ? `model=${v.model}` : "",
    v.durationSeconds ? `${v.durationSeconds.toFixed(1)}s` : ""].filter(Boolean).join(" · ");
  if (src) lines.push(`> 来源: ${src}`);
  if (v.imagePath) lines.push(`> 截图文件: \`${v.imagePath}\``);
  lines.push("");
  if (v.summary) {
    lines.push(`**总结**: ${v.summary}`);
    lines.push("");
  }
  const ocrText = v.ocr.full_text.trim();
  if (ocrText) {
    lines.push("**OCR 全文**:", "```", ocrText.length > 4000 ? ocrText.slice(0, 4000) + "…(截断)" : ocrText, "```", "");
  }
  if (v.layout.regions.length) {
    lines.push("**布局区域（阅读顺序）**:");
    for (const r of v.layout.regions.slice(0, 30)) {
      lines.push(`  ${r.reading_order}. [${r.type}] ${clip(r.text || "(无文本)", 160)}`);
    }
    lines.push("");
  }
  if (v.semantics.scene || v.semantics.entities.length) {
    lines.push("**语义**:");
    if (v.semantics.scene) lines.push(`  场景: ${v.semantics.scene}`);
    if (v.semantics.intent) lines.push(`  意图: ${v.semantics.intent}`);
    for (const e of v.semantics.entities.slice(0, 20)) {
      lines.push(`  - ${e.name} [${e.type}]${e.evidence ? ` (${clip(e.evidence, 80)})` : ""}`);
    }
    for (const rel of v.semantics.relations.slice(0, 10)) {
      lines.push(`  - ${rel.subject} → ${rel.predicate} → ${rel.object}`);
    }
    lines.push("");
  }
  if (v.visual.dominant_colors?.length || v.visual.style || v.visual.notes?.length) {
    lines.push("**视觉**:");
    if (v.visual.dominant_colors?.length) lines.push(`  主色调: ${v.visual.dominant_colors.join(", ")}`);
    if (v.visual.style) lines.push(`  风格: ${v.visual.style}`);
    for (const n of v.visual.notes ?? []) lines.push(`  - ${clip(n, 160)}`);
    lines.push("");
  }
  if (v.uncertainty.length) {
    lines.push("**不确定项**（引用证据时注意）:");
    for (const u of v.uncertainty.slice(0, 8)) lines.push(`  - ${clip(u, 160)}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("> 升级路径（成本阶梯，`screenshot` 是最后手段 L2）：证据仍不足以判断视觉细节、且当前模型支持图片输入时，再用 screenshot 拿原生图比对；纯文本模型到此为止，用以上证据 + observe/act 继续。");
  return lines.join("\n");
}

/** 简短版（供日志/事件流使用） */
export function formatVisionBrief(v: VisionResult): string {
  if (!v.ok) return `视觉引擎失败: ${(v.error ?? "").slice(0, 120)}`;
  const t = v.ocr.full_text.trim();
  return `视觉证据: ${v.summary ?? "(无总结)"} | OCR ${t.length} 字符 | 布局 ${v.layout.regions.length} 区 | 实体 ${v.semantics.entities.length} | 不确定 ${v.uncertainty.length} 项`;
}

/** 供工具描述引用的完整策略（见 strategy.ts） */
export { VISION_LADDER, VISION_POLICY, VISION_TOOL_DESCRIPTION, L0_HINT, L2_WARN } from "./strategy.js";
