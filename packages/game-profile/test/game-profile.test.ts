/**
 * @openliulan/game-profile 游戏画像沉淀能力测试
 *
 * 验证：
 * 1. 画像创建：按项目 key / 页面 URL 归一化归类
 * 2. JSON 落盘：跨会话留存（ProfileStore）
 * 3. 坐标/按键沉淀：第 1 次不打扰，第 2 次触发草稿，落库后可复用
 * 4. 画像复用计数
 */
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createProfile,
  JsonProfileStore,
  GameProfileRecorder,
  expandSemanticActions,
  normalizePageKey,
  type GameProfile,
  type ProfileSinkNotice,
} from "../src/index.js";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "gprofile-"));

describe("画像创建与页面归一化", () => {
  it("按 sourceUrl 归一化 pageKey", () => {
    const p = createProfile({
      projectKey: "cocos-demo",
      name: "Cocos 示例",
      sourceUrl: "https://game.example.com/play/?room=1",
      viewport: { width: 1280, height: 720 },
    });
    expect(p.pageKey).toBe("game.example.com/play");
    expect(normalizePageKey("https://game.example.com/play/")).toBe("game.example.com/play");
  });
});

describe("ProfileStore JSON 落盘", () => {
  it("save/get/list 跨会话留存", async () => {
    const dir = tmpDir();
    const store = new JsonProfileStore(dir);
    const p = createProfile({
      projectKey: "unity-demo",
      name: "Unity WebGL 示例",
      sourceUrl: "https://u.example.com/runner",
      viewport: { width: 800, height: 600 },
    });
    await store.save(p);

    // 重新实例化（模拟新会话），仍能从磁盘读到
    const store2 = new JsonProfileStore(dir);
    expect((await store2.get("unity-demo"))?.name).toBe("Unity WebGL 示例");
    expect((await store2.getByPageKey("u.example.com/runner"))?.projectKey).toBe("unity-demo");
    expect((await store2.listAll()).length).toBe(1);
  });
});

describe("坐标/按键沉淀（第 1 次不打扰，第 2 次触发草稿）", () => {
  let profile: GameProfile;
  let notices: ProfileSinkNotice[];
  let recorder: GameProfileRecorder;

  beforeEach(() => {
    notices = [];
    profile = createProfile({
      projectKey: "rpg-demo",
      name: "RPG 示例",
      sourceUrl: "https://r.example.com/index",
      viewport: { width: 1280, height: 720 },
    });
    recorder = new GameProfileRecorder(profile, { onSinkNotice: (n) => notices.push(n) });
  });

  it("坐标点击 2 次后触发坐标锚点草稿，第 1 次不打扰", () => {
    recorder.recordClickAt(640, 420);
    expect(notices.length).toBe(0); // 第 1 次不打扰

    recorder.recordClickAt(640, 420);
    expect(notices.length).toBe(1);
    expect(notices[0].kind).toBe("anchor");
    const anchor = notices[0].item as { x: number; y: number };
    expect(anchor.x).toBe(640);
    expect(anchor.y).toBe(420);

    // 再次同一坐标：已收录，不再重复草稿
    recorder.recordClickAt(640, 420);
    expect(notices.length).toBe(1);
  });

  it("按键 KeyW 2 次后触发按键映射草稿并推断方向语义", () => {
    recorder.recordKeyHold("KeyW", 200);
    expect(notices.length).toBe(0);

    recorder.recordKeyHold("KeyW", 200);
    expect(notices.length).toBe(1);
    expect(notices[0].kind).toBe("key");
    const kb = notices[0].item as { key: string; semantic: string };
    expect(kb.key).toBe("KeyW");
    expect(kb.semantic).toBe("move:forward");
  });

  it("feed() 从已执行动作里识别可沉淀项", () => {
    recorder.feed({ type: "clickAt", x: 100, y: 200 });
    recorder.feed({ type: "clickAt", x: 100, y: 200 });
    expect(notices.some((n) => n.kind === "anchor")).toBe(true);

    recorder.feed({ type: "keyHold", key: "Space", ms: 120 });
    recorder.feed({ type: "keyHold", key: "Space", ms: 120 });
    expect(notices.some((n) => n.kind === "key" && (n.item as { semantic: string }).semantic === "jump")).toBe(true);
  });

  it("复用计数：markReuse 递增 reuseCount", () => {
    const before = profile.reuseCount;
    recorder.markReuse();
    expect(profile.reuseCount).toBe(before + 1);
  });
});

describe("语义动作展开为可执行动作", () => {
  it("seq 复合序列拍平成扁平动作", () => {
    const actions = expandSemanticActions({
      kind: "seq",
      steps: [
        { kind: "key", key: "KeyW", ms: 300 },
        { kind: "clickAt", x: 640, y: 420 },
      ],
    });
    expect(actions).toEqual([
      { type: "keyHold", waitUntilStable: true, key: "KeyW", ms: 300 },
      { type: "clickAt", waitUntilStable: true, button: "left", clickCount: 1, x: 640, y: 420, holdMs: 0 },
    ]);
  });
});
