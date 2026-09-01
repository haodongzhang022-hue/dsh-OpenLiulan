import { describe, it, expect } from "vitest";
import { normalizeVisionOutput, formatVisionEvidence, resolveModlensCli, runModlens } from "../src/index.js";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURE = JSON.stringify({
  image: "C:\\tmp\\shot.png",
  provider: "opencode",
  result: {
    summary: "一个带红色标题和绿色按钮的登录表单页面。",
    ocr: { full_text: "登录\n用户名\n密码\n提交", lines: [{ text: "登录" }] },
    layout: { regions: [{ reading_order: 1, type: "title", text: "登录" }] },
    semantics: { scene: "登录表单", entities: [{ name: "提交按钮", type: "button" }], relations: [] },
    visual: { dominant_colors: ["red", "green"], style: "flat" },
    uncertainty: ["右下角小字无法确认"],
  },
  meta: { model: "claude-haiku-4-5", durationSeconds: 3.2, usage: { inputTokens: 100 }, attempts: [{ provider: "opencode", ok: true }] },
});

describe("vision normalize", () => {
  it("解析 modlens 标准输出", () => {
    const v = normalizeVisionOutput(FIXTURE, "C:\\tmp\\shot.png");
    expect(v.ok).toBe(true);
    expect(v.provider).toBe("opencode");
    expect(v.summary).toContain("登录");
    expect(v.ocr.full_text).toContain("用户名");
    expect(v.layout.regions[0].type).toBe("title");
    expect(v.semantics.scene).toBe("登录表单");
    expect(v.uncertainty).toHaveLength(1);
  });
  it("输出包含升级路径提示", () => {
    const v = normalizeVisionOutput(FIXTURE, "x.png");
    const text = formatVisionEvidence(v);
    expect(text).toContain("OCR 全文");
    expect(text).toContain("布局区域");
    expect(text).toContain("screenshot");
  });
  it("非法输出 → ok=false 且有错误信息", () => {
    const v = normalizeVisionOutput("not json", "x.png");
    expect(v.ok).toBe(false);
    expect(v.error).toBeTruthy();
  });
  it("CLI 缺失 → 返回指引不抛错", () => {
    const prev = process.env.MODLENS_CLI_PATH;
    delete process.env.MODLENS_CLI_PATH;
    const res = resolveModlensCli();
    expect(res.cliPath).toBeNull();
    expect((res as any).hint).toContain("liustack/modlens");
    if (prev) process.env.MODLENS_CLI_PATH = prev;
  });
  it("runModlens 使用假 CLI 端到端成功", async () => {
    const dir = mkdtempSync(join(tmpdir(), "openliulan-vision-test-"));
    const fakeCli = join(dir, "fake-main.js");
    writeFileSync(fakeCli, "const j=" + JSON.stringify(JSON.parse(FIXTURE)) + ";process.stdout.write(JSON.stringify(j));", "utf8");
    const v = await runModlens({ imagePath: join(dir, "shot.png"), cliPath: fakeCli });
    expect(v.ok).toBe(true);
    expect(v.provider).toBe("opencode");
    expect(v.semantics.scene).toBe("登录表单");
    rmSync(dir, { recursive: true, force: true });
  });
  it("env MODLENS_CLI_PATH 解析优先", () => {
    const dir = mkdtempSync(join(tmpdir(), "openliulan-vision-env-"));
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(join(dir, "dist", "main.js"), "// fake", "utf8");
    process.env.MODLENS_CLI_PATH = dir;
    const res = resolveModlensCli();
    expect(res.cliPath).toBe(dir.replace(/[\\/]+$/, "") + "/dist/main.js");
    expect(res.source).toBe("env");
    delete process.env.MODLENS_CLI_PATH;
    rmSync(dir, { recursive: true, force: true });
  });
});
