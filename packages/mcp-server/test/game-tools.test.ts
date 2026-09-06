/**
 * ForgeMcp 游戏画像级控制工具测试（ISSUE #29 S4）
 *
 * 验证不依赖真实浏览器的工具链（game_bind / game_record / game_settle / game_plan / game_list）：
 * 1. game_bind 绑定/复用某游戏项目画像（每项目一端口）；
 * 2. game_record 达阈值进待落库草稿；
 * 3. game_settle 落库成画像能力；
 * 4. game_plan 沿状态树规划到目标态；
 * 5. game_list 资产总览；跨会话 JSON 留存。
 * （game_act 依赖真实浏览器，留待 browser-smoke CI 验收，单测不覆盖。）
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ForgeMcp } from "../src/forge-mcp.js";

const tmpGameDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "forgegame-"));

describe("ForgeMcp 游戏画像工具", () => {
  it("game_bind 新建 + 重复 bind 复用", async () => {
    const mcp = new ForgeMcp({ gameStoreDir: tmpGameDir(), headless: true });
    const r1 = await mcp.callTool("game_bind", {
      projectKey: "cocos-demo",
      name: "Cocos 示例",
      sourceUrl: "https://g.example.com/play",
      width: 1280,
      height: 720,
    });
    expect(r1.ok).toBe(true);
    const structured1 = r1.structured as any;
    expect(structured1.port).toBe("cocos-demo");

    // 同项目再 bind → 命中复用（端口/画像存在）
    const r2 = await mcp.callTool("game_bind", {
      projectKey: "cocos-demo",
      name: "Cocos 示例",
      sourceUrl: "https://g.example.com/play",
    });
    expect(r2.ok).toBe(true);
  });

  it("game_record 达阈值进草稿，game_settle 落库，game_list 可见", async () => {
    const mcp = new ForgeMcp({ gameStoreDir: tmpGameDir(), headless: true });
    await mcp.callTool("game_bind", {
      projectKey: "platformer",
      sourceUrl: "https://p.example.com/l1",
      width: 1280,
      height: 720,
    });

    // 同坐标点击两次 → 第 2 次进草稿
    const feed1 = await mcp.callTool("game_record", { projectKey: "platformer", type: "clickAt", x: 100, y: 200 });
    expect((feed1.structured as any).newDraft).toBe(false);
    const feed2 = await mcp.callTool("game_record", { projectKey: "platformer", type: "clickAt", x: 100, y: 200 });
    expect((feed2.structured as any).newDraft).toBe(true);
    expect((feed2.structured as any).pendingCount).toBe(1);

    // Space 按键两次进草稿
    await mcp.callTool("game_record", { projectKey: "platformer", type: "keyHold", key: "Space", ms: 150 });
    const feedSpace = await mcp.callTool("game_record", { projectKey: "platformer", type: "keyHold", key: "Space", ms: 150 });
    expect((feedSpace.structured as any).pendingCount).toBe(2);

    // settle 全量落库
    const settle = await mcp.callTool("game_settle", { projectKey: "platformer" });
    expect((settle.structured as any).settled).toBe(2);

    // list 可见
    const list = await mcp.callTool("game_list", {});
    expect(list.ok).toBe(true);
    expect(list.content[0].text).toContain("platformer");
  });

  it("game_list 空时给出引导文案", async () => {
    const mcp = new ForgeMcp({ gameStoreDir: tmpGameDir(), headless: true });
    const list = await mcp.callTool("game_list", {});
    expect(list.ok).toBe(true);
    expect(list.content[0].text).toContain("尚无沉淀");
  });

  it("跨会话：新 ForgeMcp 同 gameStoreDir 可还原画像（game_bind 复用）", async () => {
    const dir = tmpGameDir();
    const mcp1 = new ForgeMcp({ gameStoreDir: dir, headless: true });
    await mcp1.callTool("game_bind", { projectKey: "adventure", sourceUrl: "https://a.example.com/i", width: 800, height: 600 });
    await mcp1.callTool("game_record", { projectKey: "adventure", type: "clickAt", x: 50, y: 60 });
    await mcp1.callTool("game_record", { projectKey: "adventure", type: "clickAt", x: 50, y: 60 });
    await mcp1.callTool("game_settle", { projectKey: "adventure" });

    // 新实例读同一磁盘目录
    const mcp2 = new ForgeMcp({ gameStoreDir: dir, headless: true });
    const bind2 = await mcp2.callTool("game_bind", { projectKey: "adventure", sourceUrl: "https://a.example.com/i" });
    expect(bind2.ok).toBe(true);
    const sess = await (mcp2 as any).game.session("adventure");
    expect(sess.profile.anchors.some((a: { x: number }) => a.x === 50)).toBe(true);
  });

  it("game_transition 登记状态转移后 game_plan 可规划到目标态", async () => {
    const mcp = new ForgeMcp({ gameStoreDir: tmpGameDir(), headless: true });
    await mcp.callTool("game_bind", { projectKey: "adventure", sourceUrl: "https://a.example.com/i", width: 800, height: 600 });

    // 登记：root --Space(jump)--> inventory
    const t1 = await mcp.callTool("game_transition", {
      projectKey: "adventure",
      action: { kind: "key", key: "Space" },
      label: "jump",
      detectorName: "inventory",
      detectorKind: "url",
      fragment: "bag",
    });
    expect(t1.ok).toBe(true);

    // 登记：inventory(用可读名 fromNodeId) --Enter(confirm)--> victory（目标态）
    const t2 = await mcp.callTool("game_transition", {
      projectKey: "adventure",
      fromNodeId: "inventory",
      action: { kind: "key", key: "Enter" },
      label: "confirm",
      detectorName: "victory",
      detectorKind: "pixel",
      x: 10,
      y: 10,
      r: 255,
      g: 215,
      b: 0,
    });
    expect(t2.ok).toBe(true);

    // 沿树规划到目标态
    const plan = await mcp.callTool("game_plan", { projectKey: "adventure" });
    expect(plan.ok).toBe(true);
    const structured = plan.structured as any;
    expect(structured.hasPath).not.toBe(false);
    expect(structured.steps.length).toBe(2);
  });
});