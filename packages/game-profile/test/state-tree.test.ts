/**
 * @openliulan/game-profile 角色状态树 S3 能力测试
 *
 * 验证：
 * 1. 基于画像创建状态树（根 = 起始画面）
 * 2. 登记「动作 → 关键态」转移，含目标态判定与分支收敛
 * 3. 去重边 verified 累计
 * 4. 由根找目标路径 / 首条目标路径 / 展开可执行步骤
 * 5. JSON 落盘跨会话留存
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createProfile,
  AgentStateExplorer,
  JsonStateTreeStore,
  isGoalState,
  expandSemanticActions,
  type GameProfile,
  type ProfileStateDetector,
} from "../src/index.js";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "gstate-"));

function makeProfile(projectKey = "platformer-demo"): GameProfile {
  return createProfile({
    projectKey,
    name: "Platformer 示例",
    sourceUrl: "https://p.example.com/level1",
    viewport: { width: 1280, height: 720 },
  });
}

const pixelVictory: ProfileStateDetector = { name: "victory", detect: { kind: "pixel", x: 10, y: 10, rgb: [255, 215, 0] } };
const pixelInventory: ProfileStateDetector = { name: "inventory", detect: { kind: "url", fragment: "bag" } };
const pixelDefeat: ProfileStateDetector = { name: "defeat", detect: { kind: "pixel", x: 5, y: 5, rgb: [255, 0, 0] } };

describe("目标态判定", () => {
  it("victory/通关/结算 命中目标态", () => {
    expect(isGoalState("victory")).toBe(true);
    expect(isGoalState("game-clear")).toBe(true);
    expect(isGoalState("通关界面")).toBe(true);
    expect(isGoalState("inventory")).toBe(false);
    expect(isGoalState("start")).toBe(false);
  });
});

describe("AgentStateTree 构建与路径", () => {
  it("登记转移生成节点与边，深度正确", () => {
    const profile = makeProfile();
    profile.stateDetectors.push(pixelInventory, pixelVictory);
    const explorer = new AgentStateExplorer(profile);

    // 从根按 Space 跳到 inventory，再按 Enter 跳 victory（非真实，仅验证登记机制）
    explorer.addTransition({
      fromNodeId: "root",
      action: { kind: "key", key: "Space" },
      label: "jump",
      detector: pixelInventory,
    });
    explorer.addTransition({
      fromNodeId: "state_1",
      action: { kind: "key", key: "Enter" },
      label: "confirm",
      detector: pixelVictory,
    });

    const tree = explorer.tree;
    expect(tree.nodes.length).toBe(3); // root + inventory + victory
    expect(tree.edges.length).toBe(2);

    const goal = tree.nodes.find((n) => n.name === "victory")!;
    expect(goal.isGoal).toBe(true);
    expect(goal.depth).toBe(2);
  });

  it("同关键态复用节点（分支收敛），同边去重累计 verified", () => {
    const profile = makeProfile();
    const explorer = new AgentStateExplorer(profile);

    // 两条不同父路径都到 victory
    explorer.addTransition({
      fromNodeId: "root",
      action: { kind: "key", key: "KeyW", ms: 500 },
      label: "move:forward",
      detector: pixelInventory,
    });
    // 从 root 再次跳 victory（同父不同 detector） -> 新建边与节点
    explorer.addTransition({
      fromNodeId: "root",
      action: { kind: "key", key: "Space" },
      label: "jump",
      detector: pixelVictory,
    });
    // 重复登记同一条 jump->victory 边：去重，verified 累计
    explorer.addTransition({
      fromNodeId: "root",
      action: { kind: "key", key: "Space" },
      label: "jump",
      detector: pixelVictory,
    });

    expect(explorer.tree.edges.length).toBe(2); // 2 条不同边
    const jumpEdge = explorer.tree.edges.find((e) => e.label === "jump")!;
    expect(jumpEdge.verified).toBe(2);
  });

  it("findPathsToGoal / firstGoalPath / toReplaySteps 展开可执行序列", () => {
    const profile = makeProfile();
    const explorer = new AgentStateExplorer(profile);
    explorer.addTransition({
      fromNodeId: "root",
      action: { kind: "key", key: "Space", ms: 120 },
      label: "jump",
      detector: pixelInventory,
    });
    explorer.addTransition({
      fromNodeId: "state_1",
      action: { kind: "clickAt", x: 640, y: 420 },
      label: "click attack",
      detector: pixelVictory,
    });

    const paths = explorer.findPathsToGoal();
    expect(paths.length).toBe(1);
    const first = explorer.firstGoalPath()!;
    expect(first.goalNodeId).toBe("state_2");
    expect(first.steps.length).toBe(2);

    // 展开为扁平可执行动作
    const steps = explorer.toReplaySteps();
    const flat = steps.flatMap(expandSemanticActions);
    expect(flat.length).toBe(2);
    expect(flat[0]).toMatchObject({ type: "keyHold", key: "Space" });
    expect(flat[1]).toMatchObject({ type: "clickAt", x: 640, y: 420 });
  });
});

describe("JsonStateTreeStore 落盘", () => {
  it("save/get/list 跨会话留存（按画像检索）", async () => {
    const dir = tmpDir();
    const store = new JsonStateTreeStore(dir);
    const profile = makeProfile();
    const explorer = new AgentStateExplorer(profile);
    explorer.addTransition({
      fromNodeId: "root",
      action: { kind: "key", key: "Space" },
      label: "jump",
      detector: pixelVictory,
    });
    await store.save(explorer.tree);

    // 模拟新会话
    const store2 = new JsonStateTreeStore(dir);
    const t = await store2.getByProfile("platformer-demo");
    expect(t).toBeDefined();
    expect(t!.nodes.length).toBe(2);
    expect(await store2.listAll()).toHaveLength(1);
  });
});
