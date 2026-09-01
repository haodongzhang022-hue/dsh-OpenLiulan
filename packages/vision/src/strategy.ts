/**
 * @openliulan/vision —— 浏览器视觉成本阶梯策略
 *
 * 设计目标（成本优先）：同一个任务先用纯文本 + 浏览器解决，只有文本路径
 * 无法回答「视觉/渲染/布局/外观」类问题时才升级到视觉；升级路径也分两档：
 * 先本地视觉引擎（modlens，低成本文本证据），仍不够才用模型原生视觉
 * （多模态计费，最贵）。纯文本模型永远不应该消费原生图片。
 *
 * 引用说明：L1 的视觉引擎来自开源项目 liustack/modlens（MIT），
 * 见根目录 THIRD_PARTY_NOTICES.md / DEPENDENCIES.md。
 */

/**
 * 成本阶梯（渲染给模型看的完整策略文本）。
 * 作为 vision / screenshot / observe 三个工具描述的公共出处，
 * 保证任何模型在任何入口都能看到同一套升级规则。
 */
export const VISION_LADDER = `浏览器视觉成本阶梯（按任务从最便宜开始，逐级升级）：
L0 纯文本 DOM —— observe（可交互快照+ref）/ act extract(文本提取) / act evaluate(JS查询)：零额外成本、最快。
   只要答案能从 DOM/文本/属性里拿到，就用 L0，不要截图。
L1 modlens 视觉引擎 —— vision 工具：截图 → 本地视觉引擎 → 纯文本证据（OCR 全文 + 布局区域阅读顺序 + 语义场景描述 + 不确定项）。
   仅当 L0 无法回答「页面长什么样/是否可见/是否居中重叠/颜色样式/图表图片内容/Canvas渲染」等问题时使用。费用低、文本模型可直接消费。
L2 模型原生视觉 —— screenshot 工具：返回原生 PNG 图片，只有支持图片输入的多模态模型能看见；视觉计费最贵。
   仅当 L0+L1 结合仍无法解决（如精细像素级比对、复杂图表细读）且当前模型确实支持图片输入时才使用。
规则：默认 L0；有视觉需求先 L1；L0+L1 都解决不了才 L2。纯文本模型看到 screenshot 的图片信息等于没有，直接用 L1 的 vision。`;

/** 简短开场指引（用于 observe 描述，一两行，不刷屏） */
export const L0_HINT = "成本阶梯 L0：纯文本 DOM 快照，零额外成本，是理解页面的默认第一步。";

/** 简短警示（用于 screenshot 描述）：纯文本模型看不见原生图 */
export const L2_WARN =
  "成本阶梯 L2（最后手段）：原生图片仅多模态模型可见并计费；纯文本模型请优先用 vision（L1）获取文本证据。";

/** 整段策略（供 vision 工具描述使用） */
export const VISION_POLICY = VISION_LADDER;

/** vision 工具描述（保持与工具名/参数一致） */
export const VISION_TOOL_DESCRIPTION =
  "截取当前页面并交给 modlens 视觉引擎（外部开源项目，MIT）转成纯文本证据：" +
  "OCR 全文、布局区域阅读顺序、语义场景/实体/关系、不确定项。纯文本模型 = 直接可用的「视觉」。\n" +
  VISION_LADDER +
  "\n参数 focus 可指定关注点以提升证据质量；savePath 可把截图 PNG 落盘留档（默认临时目录）。";
