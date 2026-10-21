import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 包内单测（TS）+ 顶层 DSH 宿主兼容验收（真实 ToolRuntime，.mjs）
    include: ["packages/*/test/**/*.test.ts", "test/**/*.test.mjs"],
    environment: "node",
    // 禁用文件并发：全量跑时多个测试文件并发执行，内存不足导致 worker OOM
    // （ERR_IPC_CHANNEL_CLOSED）。串行执行可避免 OOM，但会增加总耗时。
    fileParallelism: false,
  },
});
