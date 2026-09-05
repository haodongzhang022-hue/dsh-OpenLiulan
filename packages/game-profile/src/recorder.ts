/**
 * 游戏画像录制/沉淀器（GameProfileRecorder）
 *
 * 对应 ISSUE #29 核心痛点「挤牙膏——拨一下动一下，动完不记忆」：
 * 把用户在 Canvas/WebGL 游戏页上做过的**坐标点击 / 按键按住**操作，沉淀成一份可复用的能力画像。
 *
 * 沉淀策略（对齐现有 recorder 的「不打扰」哲学）：
 * - **第 1 次**：静默记录该操作（坐标点/按键），不打扰用户；
 * - 同一能力项出现达到阈值（默认 2 次）→ 生成画像能力草稿并回调询问是否落库；
 * - 落库后，下次在**同一画像/同一页面**可直接按能力名调用，无需再定位。
 *
 * 坐标锚点带录制时的视口基线，回放前可校验视口一致性，规避 Canvas 坐标随分辨率漂移。
 */
import type { UnifiedAction } from "@openliulan/core";
import type { CoordAnchor, GameProfile, KeyBinding, ProfileSink } from "./model.js";

/** 画像沉淀上报信息（供上层询问是否把某能力项落库） */
export interface ProfileSinkNotice {
  /** 能力类型：坐标锚点 or 按键映射 */
  kind: "anchor" | "key";
  /** 建议加入画像的能力项 */
  item: CoordAnchor | KeyBinding;
  /** 该操作已出现的次数 */
  occurrences: number;
  /** 说明文案 */
  message: string;
}

/** 画像录制器选项 */
export interface GameProfileRecorderOptions {
  /** 沉淀能力项的重复触发阈值（默认 2 次） */
  triggerAfter?: number;
  /** 能力草稿回调（询问是否落库） */
  onSinkNotice?: (notice: ProfileSinkNotice) => void;
}

/** 画像录制器：从坐标/按键动作里识别重复 → 沉淀画像能力 */
export class GameProfileRecorder implements ProfileSink {
  private opts: Required<Pick<GameProfileRecorderOptions, "triggerAfter">> & GameProfileRecorderOptions;
  /** 坐标锚点出现计数：key=`x,y` → 次数 */
  private clickCounts = new Map<string, number>();
  /** 按键出现计数：key=`key` → 次数 */
  private keyCounts = new Map<string, number>();

  /** 目标画像（沉淀写入对象） */
  readonly profile: GameProfile;

  constructor(profile: GameProfile, opts: GameProfileRecorderOptions = {}) {
    this.opts = { triggerAfter: 2, ...opts };
    this.profile = profile;
  }

  /** 记下一个坐标点击；若达到阈值且该点未收录，回调草稿。 */
  recordClickAt(x: number, y: number, desc?: string): void {
    const k = `${Math.round(x)},${Math.round(y)}`;
    const c = (this.clickCounts.get(k) ?? 0) + 1;
    this.clickCounts.set(k, c);

    // 已收录则跳过，避免重复草稿
    if (this.profile.anchors.some((a) => a.x === x && a.y === y)) return;
    if (c !== this.opts.triggerAfter) return;

    const item: CoordAnchor = {
      name: `anchor_${Math.round(x)}_${Math.round(y)}`,
      x: Math.round(x),
      y: Math.round(y),
      vw: x / this.profile.viewportBaseline.width,
      vh: y / this.profile.viewportBaseline.height,
      desc,
    };
    const notice: ProfileSinkNotice = {
      kind: "anchor",
      item,
      occurrences: c,
      message: `坐标 (${Math.round(x)},${Math.round(y)}) 已操作 ${c} 次，是否沉淀为画像坐标锚点？`,
    };
    this.opts.onSinkNotice?.(notice);
  }

  /** 记下一个按键按住；若达到阈值且该键未收录，回调草稿。 */
  recordKeyHold(key: string, ms?: number, semantic?: string): void {
    const c = (this.keyCounts.get(key) ?? 0) + 1;
    this.keyCounts.set(key, c);

    if (this.profile.keyMap.some((b) => b.key === key)) return;
    if (c !== this.opts.triggerAfter) return;

    const item: KeyBinding = {
      key,
      semantic: semantic ?? inferSemantic(key),
      desc: semantic ? undefined : `按键 ${key}${ms ? `（按住约${ms}ms）` : ""}`,
    };
    const notice: ProfileSinkNotice = {
      kind: "key",
      item,
      occurrences: c,
      message: `按键 ${key} 已按下 ${c} 次，是否沉淀为画像按键映射（如 WASD 方向）？`,
    };
    this.opts.onSinkNotice?.(notice);
  }

  /** 把已执行成功的动作喂给沉淀器（封装 dispatch）。 */
  feed(action: UnifiedAction, resultOk = true): void {
    if (!resultOk) return;
    switch (action.type) {
      case "clickAt":
        this.recordClickAt(action.x, action.y, action.description);
        break;
      case "keyDown":
        this.recordKeyHold(action.key, undefined);
        break;
      case "keyHold":
        this.recordKeyHold(action.key, action.ms);
        break;
      case "press":
        this.recordKeyHold((action as unknown as { key?: string }).key ?? "Enter");
        break;
      default:
        break; // 其余动作不参与画像沉淀
    }
  }

  /** 按语义名触发一次沉淀复用计数（回放成功时调用） */
  markReuse(): void {
    this.profile.reuseCount += 1;
    this.profile.updatedAt = Date.now();
  }
}

/** 物理键 → 语义的轻量推断（仅当未显式给 semantic 时兜底） */
function inferSemantic(key: string): string {
  const m: Record<string, string> = {
    KeyW: "move:forward",
    KeyS: "move:back",
    KeyA: "move:left",
    KeyD: "move:right",
    ArrowUp: "move:up",
    ArrowDown: "move:down",
    ArrowLeft: "move:left",
    ArrowRight: "move:right",
    Space: "jump",
    Enter: "confirm",
  };
  return m[key] ?? `press:${key}`;
}
