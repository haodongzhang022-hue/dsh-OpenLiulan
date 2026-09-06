/**
 * @openliulan/game-profile GameProfileAgent 编排控制器测试（S3）
 *
 * 验证：
 * 1. bind：按 pageKey 命中已有画像复用，否则新建骨架并建状态树
 * 2. registerTransition：登记实测转移写入状态树 + 画像关键态表
 * 3. planToGoal：由根到目标态展开可执行路径
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GameProfileAgent, JsonProfileStore, JsonStateTreeStore } from "../src/index.js";
import type { GameProfileStore, StateTreeStore, ProfileStateDetector } from "../src/index.js";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "gagent-"));

const detectorVictory: ProfileStateDetector = { name: "victory", detect: { kind: "pixel", x: 10, y: 10, rgb: [255, 215, 0] } };
const detectorInventory: ProfileStateDetector = { name: "inventory", detect: { kind: "url", fragment: "bag" } };

describe("GameProfileAgent 绑定与状态树编排", () => {
  it("bind 同 pageKey 复用既有画像（created=false），首绑建树", async () => {
    const dir = tmpDir();
    const profileStore = new JsonProfileStore(path.join(dir, "profiles"));
    const stateTreeStore = new JsonStateTreeStore(path.join(dir, "trees"));
    const agent = new GameProfileAgent({ profileStore, stateTreeStore });

    const r1 = await agent.bind({
      projectKey: "rpg",
      name: "RPG 示例",
      sourceUrl: "https://r.example.com/play?room=9",
      viewport: { width: 1280, height: 720 },
    });
    expect(r1.created).toBe(true);
    expect(r1.profile.pageKey).toBe("r.example.com/play");

    // 相同 URL 再绑 → 复用
    const r2 = await agent.bind({
      projectKey: "rpg",
      name: "RPG 示例",
      sourceUrl: "https://r.example.com/play",
      viewport: { width: 1280, height: 720 },
    });
    expect(r2.created).toBe(false);
    expect(r2.stateTree.root.name).toBe("start");
  });

  it("registerTransition 写入状态树与画像关键态，planToGoal 展开路径", async () => {
    const dir = tmpDir();
    const agent = new GameProfileAgent({
      profileStore: new JsonProfileStore(path.join(dir, "profiles")),
      stateTreeStore: new JsonStateTreeStore(path.join(dir, "trees")),
    });
    await agent.bind({
      projectKey: "adventure",
      name: "Adventure 示例",
      sourceUrl: "https://a.example.com/index",
      viewport: { width: 800, height: 600 },
    });

    // 登记：root --jump--> inventory
    await agent.registerTransition({
      projectKey: "adventure",
      action: { kind: "key", key: "Space", ms: 120 },
      label: "jump",
      detectorName: "inventory",
      detector: detectorInventory,
    });
    // 登记：inventory --enter--> victory
    await agent.registerTransition({
      projectKey: "adventure",
      fromNodeId: "state_1", // inventory 节点的 id
      action: { kind: "key", key: "Enter" },
      label: "confirm",
      detectorName: "victory",
      detector: detectorVictory,
    });

    const profile = await agent.getProfile("adventure");
    expect(profile!.stateDetectors).toHaveLength(2);

    const tree = await agent.getStateTree("adventure");
    expect(tree!.nodes.length).toBe(3);
    expect(tree!.edges.length).toBe(2);

    const p = await agent.planToGoal("adventure");
    expect(p).toBeDefined();
    expect(p!.steps.length).toBe(2);
    expect(p!.goalNodeId).toBe("state_2");
  });

  it("listStateDetectors 返回关键态判定选项", async () => {
    const dir = tmpDir();
    const agent = new GameProfileAgent({
      profileStore: new JsonProfileStore(path.join(dir, "profiles")),
      stateTreeStore: new JsonStateTreeStore(path.join(dir, "trees")),
    });
    await agent.bind({
      projectKey: "shooter",
      name: "Shooter",
      sourceUrl: "https://s.example.com/play",
      viewport: { width: 800, height: 600 },
    });
    const opts = await agent.listStateDetectors("shooter");
    expect(opts).toEqual([]);
  });
});
