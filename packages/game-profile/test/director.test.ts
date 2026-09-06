/**
 * @openliulan/game-profile GameProfileDirector 画像级调度控制器测试（S4）
 *
 * 验证「每项目一端口/一连接」的沉淀闭环：
 * 1. bind 建会话，portOf 得到稳定 slug 端口名；
 * 2. 同项目重复 bind 复用同一会话（隔离不冲突）；
 * 3. feed 坐标点击/按键达阈值进入待落库草稿（静默不打扰），settle 落库画像；
 * 4. 落库后同画像能力项可被直接调用（零定位复用）；
 * 5. registerTransition 链式登记状态转移，planToGoal 规划到目标态；
 * 6. JSON 落盘跨会话留存，新 director 可从磁盘还原同一端口会话。
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  GameProfileDirector,
  JsonProfileStore,
  JsonStateTreeStore,
  slugifyProjectKey,
  type ProfileStateDetector,
} from "../src/index.js";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "gdir-"));

function makeStores(dir: string) {
  return {
    profileStore: new JsonProfileStore(path.join(dir, "profiles")),
    stateTreeStore: new JsonStateTreeStore(path.join(dir, "trees")),
  };
}

const viewport = { width: 1280, height: 720 };
const detectorVictory: ProfileStateDetector = { name: "victory", detect: { kind: "pixel", x: 10, y: 10, rgb: [255, 215, 0] } };

describe("slug 端口名", () => {
  it("projectKey → 小写连字符稳定名", () => {
    expect(slugifyProjectKey("Cocos Demo")).toBe("cocos-demo");
    expect(slugifyProjectKey("My RPG Game!")).toBe("my-rpg-game");
    expect(slugifyProjectKey("adventure")).toBe("adventure");
  });
});

describe("每项目一会话：bind 复用与隔离", () => {
  it("同项目重复 bind 复用同一会话，不同项目独立", async () => {
    const st = makeStores(tmpDir());
    const director = new GameProfileDirector(st);

    const s1 = await director.bind({
      projectKey: "Cocos Demo",
      name: "Cocos 示例",
      sourceUrl: "https://g.example.com/play",
      viewport,
    });
    expect(s1.port).toBe("cocos-demo");
    expect(director.has("Cocos Demo")).toBe(true);

    const s2 = await director.bind({
      projectKey: "Cocos Demo",
      name: "Cocos 示例",
      sourceUrl: "https://g.example.com/play",
      viewport,
    });
    expect(s2).toBe(s1);

    const other = await director.bind({
      projectKey: "Unity WebGL",
      name: "Unity 示例",
      sourceUrl: "https://u.example.com/runner",
      viewport,
    });
    expect(other).not.toBe(s1);
    expect(other.port).toBe("unity-webgl");
  });
});

describe("沉淀闭环：feed → settle → 落库可复用", () => {
  it("坐标/按键达阈值进草稿，settle 落库后画像可零定位复用", async () => {
    const st = makeStores(tmpDir());
    const director = new GameProfileDirector({ ...st, sinkThreshold: 2 });

    await director.bind({
      projectKey: "platformer",
      name: "Platformer",
      sourceUrl: "https://p.example.com/level1",
      viewport,
    });

    let out = await director.feed("platformer", { type: "clickAt", x: 640, y: 420 });
    expect(out.newDraft).toBe(false);

    out = await director.feed("platformer", { type: "clickAt", x: 640, y: 420 });
    expect(out.newDraft).toBe(true);
    expect(out.pendingCount).toBe(1);

    await director.feed("platformer", { type: "keyHold", key: "Space", ms: 150 });
    out = await director.feed("platformer", { type: "keyHold", key: "Space", ms: 150 });
    expect(out.newDraft).toBe(true);
    expect(out.pendingCount).toBe(2);

    const r = await director.settle("platformer");
    expect(r.settled).toBe(2);

    const s = (await director.session("platformer"))!;
    expect(s.profile.anchors.some((a) => a.x === 640 && a.y === 420)).toBe(true);
    expect(s.profile.keyMap.some((b) => b.key === "Space")).toBe(true);
    expect(s.pendingDrafts.length).toBe(0);

    const list = await director.list();
    expect(list.some((l) => l.projectKey === "platformer")).toBe(true);
  });
});

describe("状态树驱动（registerTransition + planToGoal）", () => {
  it("链式登记转移后 planToGoal 返回完整动作序列", async () => {
    const st = makeStores(tmpDir());
    const director = new GameProfileDirector(st);

    await director.bind({
      projectKey: "chain-demo",
      name: "Chain",
      sourceUrl: "https://c.example.com/i",
      viewport,
    });

    await director.registerTransition({
      projectKey: "chain-demo",
      action: { kind: "key", key: "Space" },
      label: "jump",
      detectorName: "inventory",
      detector: { name: "inventory", detect: { kind: "url", fragment: "bag" } },
    });
    await director.registerTransition({
      projectKey: "chain-demo",
      fromNodeId: "inventory", // 可读名解析到节点
      action: { kind: "key", key: "Enter" },
      label: "confirm",
      detectorName: "victory",
      detector: { name: "victory", detect: { kind: "pixel", x: 1, y: 1, rgb: [1, 2, 3] } },
    });

    const path = await director.planToGoal("chain-demo");
    expect(path).toBeDefined();
    expect(path!.steps).toHaveLength(2);
  });
});

describe("跨会话留存", () => {
  it("画像+关键态落盘后，新 director（跨会话）从磁盘还原同端口会话", async () => {
    const dir = tmpDir();
    const st = makeStores(dir);
    const director = new GameProfileDirector(st);

    const sess = await director.bind({
      projectKey: "adventure",
      name: "Adventure",
      sourceUrl: "https://a.example.com/index",
      viewport,
    });
    sess.profile.stateDetectors.push(detectorVictory);
    await director.markReuse("adventure");

    const st2 = makeStores(dir);
    const director2 = new GameProfileDirector(st2);
    const s2 = await director2.session("adventure");
    expect(s2).toBeDefined();
    expect(s2!.profile.name).toBe("Adventure");
    expect(s2!.profile.stateDetectors).toHaveLength(1);
    expect(s2!.port).toBe("adventure");

    const list = await director2.list();
    expect(list.some((l) => l.projectKey === "adventure")).toBe(true);
  });
});
