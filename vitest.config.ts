import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 包内单测（TS）+ 顶层 DSH 宿主兼容验收（真实 ToolRuntime，.mjs）
    include: ["packages/*/test/**/*.test.ts", "test/**/*.test.mjs"],
    environment: "node",
  },
});
