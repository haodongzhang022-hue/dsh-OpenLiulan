/**
 * 验收测试用的本地静态服务器。
 *
 * 真实浏览器验收必须控制**真实页面**，但不应把断言绑在第三方站点的结构上——
 * `example.com` 曾长期提供 `<h1>Example Domain</h1>`，如今该 h1 已被移除
 * （正文改由 `/s.js` 注入 `<p>` 与链接），断言 h1 的用例因此凭空变红。
 * 结论：验收页面必须由本仓库掌管，网络栈仍走真实 HTTP。
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURE_DIR = fileURLToPath(new URL("./fixtures/", import.meta.url));

export interface LocalSite {
  /** 形如 `http://127.0.0.1:<port>/`，以 `/` 结尾 */
  baseUrl: string;
  close(): Promise<void>;
}

/** 启动一个只服务 `test/fixtures/` 的本地 HTTP 站点（随机端口）。 */
export async function startLocalSite(): Promise<LocalSite> {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const file = path.resolve(FIXTURE_DIR, urlPath === "/" ? "acceptance.html" : `.${urlPath}`);
    // 防目录穿越：解析后必须仍在 fixtures 目录内
    if (!file.startsWith(FIXTURE_DIR) || !fs.existsSync(file)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(file));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  return {
    baseUrl: `http://127.0.0.1:${port}/`,
    close: () =>
      new Promise<void>((resolve) => {
        // server.close() 会等待所有连接关闭，但 Chromium 的 keep-alive 连接
        // 可能不会立即关闭，导致回调永远不触发、afterAll 卡住。
        // closeAllConnections()（Node 18.2+）强制关闭所有连接，使 close 回调立即触发。
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}
