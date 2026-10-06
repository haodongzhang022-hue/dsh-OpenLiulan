/**
 * 真实浏览器验收测试（端到端功能性验证，非 mock）
 *
 * ⚠️ 本测试不使用 mock，而是真正启动 headless Chromium 并驱动框架的
 * PlaywrightEngine/ForgeBrowser 真实代码路径控制真实网页。
 * 目的：防止「假装测试」——编码/单测无法发现真实浏览器中的运行期缺陷
 * （如 page.evaluate 浏览器上下文闭包引用缺失、DOM 观察失效等），
 * 这些只能通过真实控制网页 + 断言真实 DOM 状态来拦截。
 *
 * 页面来源分两类：
 * - **本地 fixture 站点**（`test/fixtures/` + 真实 HTTP 服务）：断言 DOM 结构、
 *   提取、点击跳转。页面结构由本仓库掌管，不被第三方改版牵连。
 * - **真实公网**：只断言站点身份与「加载成功」，不绑第三方 DOM 细节。
 *
 * 背景（本文件曾被第三方改版打红）：旧版全部用例都打 `example.com`，并断言
 * `<h1>Example Domain</h1>`。该 h1 现已被站点移除（正文改由 `/s.js` 注入
 * `<p>` 与链接），断言随之凭空失败——这是**断言绑错了对象**，不是框架缺陷。
 *
 * 依赖：需要安装 Playwright 浏览器（`npx playwright install chromium`）。
 * 这是 CI 中强制执行的真实网页验收，必须真实通过。
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PlaywrightEngine } from "@openliulan/engines";
import { ForgeBrowser } from "@openliulan/core";
import { startLocalSite, type LocalSite } from "./acceptance-server.js";

// 真实浏览器测试涉及真实网络导航，运行时受网络波动影响较大
// （实测单用例可达 5.5s+，超出 vitest 默认 5s 超时），
// 故为这些端到端验收用例设置更宽裕的统一超时，避免 CI 误报。
const BROWSER_TEST_TIMEOUT = 30_000;

let engine: PlaywrightEngine;
let forge: ForgeBrowser;
let site: LocalSite;

beforeAll(async () => {
  site = await startLocalSite();
  engine = new PlaywrightEngine({ headless: true });
  forge = new ForgeBrowser(engine, { autoDiagnoseOnError: true });
  await forge.start();
});

afterAll(async () => {
  await forge.stop();
  await site.close();
});

describe("真实浏览器验收：本地 fixture 站点（结构可控，断言 DOM 真值）", () => {
  it("框架 navigate + observe 观察到真实 DOM", { timeout: BROWSER_TEST_TIMEOUT }, async () => {
    const nav = await forge.act({ type: "navigate", url: site.baseUrl });
    expect(nav.ok).toBe(true);
    const snap = await forge.observe({ maxNodes: 50, maxTextLength: 40 });
    expect(snap.title).toBe("Forge 验收页");
    expect(snap.url).toContain(site.baseUrl);
    // 真实 DOM 中必然存在链接（可交互元素索引不为空）
    expect(snap.interactive.length).toBeGreaterThan(0);
  });

  it("框架 extract 提取真实页面主标题", { timeout: BROWSER_TEST_TIMEOUT }, async () => {
    const result = await forge.act({ type: "extract", selector: "h1", description: "提取主标题" });
    expect(result.ok).toBe(true);
    expect((result.data as any)?.text).toBe("Forge 验收主标题");
  });

  it("框架点击页面链接并真实跳转（对齐用户行为）", { timeout: BROWSER_TEST_TIMEOUT }, async () => {
    await forge.act({ type: "navigate", url: site.baseUrl });
    // 点击默认 waitForNavigation=true：引擎会等待点击链接触发的新页面加载完成后再返回，
    // 无需脆弱的 setTimeout 硬等，即可观察到跳转后的稳定页面（真实网络跳转留给 30s 超时兜底）。
    const click = await forge.act({ type: "click", text: "前往下一页" });
    expect(click.ok).toBe(true);
    const snap = await forge.observe({ maxNodes: 20 });
    expect(snap.url).toContain("/next.html");
    expect(snap.title).toBe("Forge 第二页");
  });

  it("框架 5 星诊断采集真实控制台/网络/JS 异常", { timeout: BROWSER_TEST_TIMEOUT }, async () => {
    await forge.act({ type: "navigate", url: site.baseUrl });
    const report = await forge.captureDiagnostics();
    // 健康页面不应有 JS 异常与错误级控制台消息
    expect(report.jsExceptions).toHaveLength(0);
    expect(report.console.filter((c) => c.severity === "error")).toHaveLength(0);
    // 报告结构完整
    expect(Array.isArray(report.console)).toBe(true);
    expect(Array.isArray(report.network)).toBe(true);
  });
});

describe("真实浏览器验收：真实公网（只验站点身份与加载成功）", () => {
  it("真实网络导航到 example.com 并读到真实页面", { timeout: BROWSER_TEST_TIMEOUT }, async () => {
    const nav = await forge.act({ type: "navigate", url: "https://example.com" });
    expect(nav.ok).toBe(true);
    const snap = await forge.observe({ maxNodes: 20, maxTextLength: 40 });
    // 只断言站点身份（域名 + 标题），不断言其 DOM 细节——第三方改版不应打红本仓库 CI
    expect(snap.url).toContain("example.com");
    expect(snap.title).toMatch(/example/i);
  });
});
