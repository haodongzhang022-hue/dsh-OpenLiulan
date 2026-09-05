/**
 * @openliulan/game-profile —— 游戏能力画像沉淀域模块（ISSUE #29 S2 + S3）
 *
 * 把 Canvas/WebGL 游戏页的「坐标点击 + 按键按住」控制流沉淀为可复用画像，
 * 再把画像能力固化为「角色状态树」，支撑一次成型、可导航的探索复用：
 * - S2：每游戏项目一份画像（GameProfile），可映射一个 MCP 端口；
 * - S3：AgentStateTree 角色状态树，根=起始画面、边=画像语义动作、叶=目标态，
 *       本地 AI 沿树从根走到叶，重复探索无需重新定位。
 *
 * 分层归属：画像/状态树只存表现层契约（坐标/按键/关键态判定），跨引擎复用。
 */
export * from "./model.js";
import type { GameProfile } from "./model.js";
export * from "./store.js";
export * from "./recorder.js";
export * from "./state-tree.js";
import type { AgentStateTree } from "./state-tree.js";
export * from "./state-store.js";

/** 归一化页面 key：host + path（忽略 query/hash 与尾部斜杠），用于画像按项目归类 */
export function normalizePageKey(url: string): string {
  try {
    const u = new URL(url);
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return `${u.host}${path || "/"}`;
  } catch {
    return url;
  }
}

/** 由项目信息快速构建一份空画像骨架 */
export function createProfile(options: {
  projectKey: string;
  name: string;
  sourceUrl: string;
  viewport: { width: number; height: number };
}): GameProfile {
  const now = Date.now();
  return {
    id: options.projectKey,
    projectKey: options.projectKey,
    name: options.name,
    sourceUrl: options.sourceUrl,
    pageKey: normalizePageKey(options.sourceUrl),
    viewportBaseline: options.viewport,
    keyMap: [],
    anchors: [],
    actions: [],
    stateDetectors: [],
    createdAt: now,
    updatedAt: now,
    reuseCount: 0,
  };
}

/** 便捷类型引用：一棵可回放的画像状态树 */
export type { AgentStateTree };
export * from "./agent.js";
