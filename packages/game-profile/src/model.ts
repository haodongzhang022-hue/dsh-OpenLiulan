/**
 * 游戏能力画像数据模型（GameProfile）——「网页控制流沉淀复用」落点
 *
 * 针对 Canvas/WebGL 类游戏页（无 DOM 语义锚点）的通用控制沉淀：
 * - 每个「游戏项目」对应一份画像（GameProfile），同时映射一个 MCP 端口；
 * - 画像只存「表现层的坐标/按键契约」，不含引擎逻辑，跨引擎（Cocos→Unity→未来）可复用；
 * - 沉淀一次 → 下次在同一画像下直接调用，本地 AI 无需再下指令定位坐标。
 *
 * 分层归属（见 ISSUE #29 架构）：
 * - 本模块在**框架侧**沉淀「表现契约」；
 * - 游戏侧只提供一份画像配置 schema（本项目给实现，游戏工程按此声明契约）。
 */
import type { UnifiedAction } from "@openliulan/core";

/** 按键映射：某个物理按键/组合承载的语义动作（如 KeyW → move:forward） */
export interface KeyBinding {
  /** 物理键（Playwright keyboard 取值，如 KeyW / ArrowUp / Space / KeyA） */
  key: string;
  /** 语义动作（如 move:forward / jump / attack），与语义动作集 actions 对应 */
  semantic: string;
  /** 人类可读说明 */
  desc?: string;
}

/** 坐标锚点：Canvas 上一个可交互位置（攻击键、菜单项等） */
export interface CoordAnchor {
  /** 锚点语义名（如 attack / jump-btn / menu-item） */
  name: string;
  /** 视口内像素坐标 */
  x: number;
  y: number;
  /** 视口归一化基线宽度/高度（0~1），用于坐标漂移校正 */
  vw?: number;
  /** 视口归一化基线高度 */
  vh?: number;
  /** 人类可读说明 */
  desc?: string;
}

/** 语义动作集：该画像支持的高层动作词表 */
export type SemanticAction =
  | { kind: "key"; key: string; ms?: number }      // 按键（可按住 ms）
  | { kind: "clickAt"; x: number; y: number; holdMs?: number } // 坐标点击
  | { kind: "seq"; steps: SemanticAction[] };      // 复合序列

/** 该画像的胜利/失败/结算等「关键态」画面判定（图色/文本） */
export interface ProfileStateDetector {
  /** 状态语义名（如 victory / defeat / level-1 / inventory） */
  name: string;
  /** 检测方式 */
  detect:
    | { kind: "pixel"; x: number; y: number; rgb: [number, number, number] } // 图色识别
    | { kind: "url"; fragment: string };                                     // URL 片段
}

/** 一条游戏能力画像 */
export interface GameProfile {
  /** 画像唯一 id（通常 = projectKey） */
  id: string;
  /** 项目 key（也映射 MCP 端口名，按 slug 规范命名） */
  projectKey: string;
  /** 画像名称（人类可读） */
  name: string;
  /** 入口 URL（用于按项目归类与首次导航） */
  sourceUrl: string;
  /** 入口 URL 归一化 key（host+path） */
  pageKey: string;
  /** 视口基线（宽×高），坐标锚点在录制时的原始视口，用于回放前漂移校验 */
  viewportBaseline: { width: number; height: number };
  /** 按键映射表（WASD→语义方向 等） */
  keyMap: KeyBinding[];
  /** 坐标锚点表（攻击键/菜单项等可交互点） */
  anchors: CoordAnchor[];
  /** 语义动作词表 */
  actions: SemanticAction[];
  /** 关键态画面判定（可选，供状态树/校验） */
  stateDetectors: ProfileStateDetector[];
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 沉淀次数（操作复用的累计收益参考） */
  reuseCount: number;
}

/** 画像存储接口（可内存 / JSON 落盘 / 云端） */
export interface GameProfileStore {
  save(profile: GameProfile): Promise<void>;
  get(id: string): Promise<GameProfile | undefined>;
  getByPageKey(pageKey: string): Promise<GameProfile | undefined>;
  listAll(): Promise<GameProfile[]>;
  remove(id: string): Promise<void>;
}

/**
 * 把坐标动作 / 按键动作沉淀成画像的能力项。
 * 入参统一为已执行成功的动作，返回可落库的画像数据片段。
 */
export interface ProfileSink {
  /** 记下一个坐标点击：沉淀为坐标锚点（若该坐标未收录） */
  recordClickAt(x: number, y: number, desc?: string): void;
  /** 记下一个按键：沉淀为按键映射（若该键未收录），可带按住时长 */
  recordKeyHold(key: string, ms?: number, semantic?: string): void;
  /** 标记一次沉淀/复用，更新 reuseCount */
  markReuse(): void;
}

/** 游戏画像动作的通用构造工具：把画像能力项转成可执行动作 */
export function semanticToAction(s: SemanticAction): UnifiedAction {
  switch (s.kind) {
    case "key":
      return { type: "keyHold", waitUntilStable: true, key: s.key, ms: s.ms ?? 150 };
    case "clickAt":
      return { type: "clickAt", waitUntilStable: true, button: "left", clickCount: 1, x: s.x, y: s.y, holdMs: s.holdMs ?? 0 };
    case "seq":
      throw new Error("seq 需逐层展开，请用 expandSemanticActions()");
  }
}

/** 展开复合序列为扁平动作数组（供回放器按序执行） */
export function expandSemanticActions(s: SemanticAction): UnifiedAction[] {
  if (s.kind !== "seq") return [semanticToAction(s)];
  return s.steps.flatMap(expandSemanticActions);
}
