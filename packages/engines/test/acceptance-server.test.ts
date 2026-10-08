/**
 * 本地 fixture 站点自身的测试。
 *
 * 真实浏览器验收已改为打本地站点，这个站点就成了验收的地基：
 * 它必须真能服务 fixture，且不得被目录穿越读走仓库里的其他文件。
 * 地基不钉住，上面的断言等于建在沙子上。
 *
 * 注意：这里用 `node:http` 直发原始 path，**不能用 `fetch`**——
 * fetch 会在客户端把 `/../x` 规范化成 `/x`，穿越根本没到服务端，
 * 于是「删掉护栏测试照样绿」的假绿。
 */
import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import { startLocalSite, type LocalSite } from "./acceptance-server.js";

let site: LocalSite | undefined;

afterEach(async () => {
  await site?.close();
  site = undefined;
});

/** 直发原始 path，返回状态码与响应体。 */
function rawGet(base: string, rawPath: string): Promise<{ status: number; body: string }> {
  const { hostname, port } = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, port, path: rawPath, method: "GET" }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

describe("验收 fixture 站点", () => {
  it("根路径返回验收页，且能取到同目录其他 fixture", async () => {
    site = await startLocalSite();
    const home = await fetch(site.baseUrl);
    expect(home.status).toBe(200);
    expect(await home.text()).toContain("Forge 验收主标题");

    const next = await fetch(`${site.baseUrl}next.html`);
    expect(next.status).toBe(200);
    expect(await next.text()).toContain("Forge 第二页");
  });

  it("拒绝目录穿越（目标为 fixtures 外真实存在的文件）", async () => {
    site = await startLocalSite();
    // 反证目标必须是**真实存在**的文件：否则 404 只是因为「文件不存在」，
    // 与护栏无关，删掉护栏测试仍绿（这正是上一版的假绿原因）。
    for (const probe of ["/../acceptance-server.ts", "/../fixtures/../acceptance-server.ts", "/%2e%2e%2Facceptance-server.ts"]) {
      const res = await rawGet(site.baseUrl, probe);
      expect(res.status, `probe=${probe}`).toBe(404);
      expect(res.body, `probe=${probe} 不得泄露仓库文件`).not.toContain("startLocalSite");
    }
  });
});
