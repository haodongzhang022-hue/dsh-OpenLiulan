/**
 * @openliulan/game-profile —— 游戏能力画像沉淀域模块（ISSUE #29 S2）
 *
 * 把 Canvas/WebGL 游戏页的「坐标点击 + 按键按住」控制流沉淀为可复用画像：
 * - 每游戏项目一份画像（GameProfile），可映射一个 MCP 端口；
 * - 画像只存表现层契约（坐标/按键），跨引擎复用；
 * - 操作 2 次 → 询问沉淀，落库后同画像直接调用，解决「挤牙膏、动完不记忆」。
 */
export * from "./model.js";
import type { GameProfile } from "./model.js";
export * from "./store.js";
export * from "./recorder.js";

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
