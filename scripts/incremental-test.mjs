#!/usr/bin/env node
/**
 * 增量测试：只跑 git diff 变更文件对应的测试，不跑全量。
 *
 * 用法：node scripts/incremental-test.mjs [base_ref]
 *   base_ref 默认 origin/main（对比当前分支与 main 的差异）
 *
 * 映射规则：
 *   src/plugin.ts              → test/plugin-dsh-compat.test.mjs, test/plugin-cancel.test.mjs, test/plugin-object-root.test.mjs
 *   src/dsh-schema.ts          → test/dsh-schema.test.mjs
 *   src/dsh-types.ts           → test/dsh-schema.test.mjs
 *   scripts/build-plugin.mjs   → test/build-plugin.test.mjs
 *   scripts/dsh-compat-check.mjs → test/plugin-dsh-compat.test.mjs
 *   scripts/host-inlining-guard.mjs → test/build-plugin.test.mjs
 *   packages/engines/test/real-browser.acceptance.test.ts → 自身
 *   packages/engines/test/acceptance-server.ts → packages/engines/test/acceptance-server.test.ts
 *   vitest.config.ts           → 跳过（全量配置，不触发全量测试）
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const baseRef = process.argv[2] ?? "origin/main";

// 源文件 → 测试文件映射
const SOURCE_TO_TESTS = {
  "src/plugin.ts": [
    "test/plugin-dsh-compat.test.mjs",
    "test/plugin-cancel.test.mjs",
    "test/plugin-object-root.test.mjs",
  ],
  "src/dsh-schema.ts": ["test/dsh-schema.test.mjs"],
  "src/dsh-types.ts": ["test/dsh-schema.test.mjs"],
  "scripts/build-plugin.mjs": ["test/build-plugin.test.mjs"],
  "scripts/dsh-compat-check.mjs": ["test/plugin-dsh-compat.test.mjs"],
  "scripts/host-inlining-guard.mjs": ["test/build-plugin.test.mjs"],
  "packages/engines/test/real-browser.acceptance.test.ts": [
    "packages/engines/test/real-browser.acceptance.test.ts",
  ],
  "packages/engines/test/acceptance-server.ts": [
    "packages/engines/test/acceptance-server.test.ts",
  ],
};

// 获取变更的文件列表
let changedFiles;
try {
  changedFiles = execSync(`git diff --name-only ${baseRef}...HEAD`, {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
} catch {
  // 如果没有 base_ref，尝试 working tree 变更
  changedFiles = execSync("git diff --name-only", { cwd: root, encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
}

console.log(`增量测试：对比 ${baseRef}，变更 ${changedFiles.length} 个文件`);

// 映射到测试文件
const testFiles = new Set();
for (const file of changedFiles) {
  const tests = SOURCE_TO_TESTS[file];
  if (tests) {
    for (const t of tests) {
      const fullPath = resolve(root, t);
      if (existsSync(fullPath)) {
        testFiles.add(t);
      } else {
        console.log(`  跳过（不存在）：${t}`);
      }
    }
  }
}

if (testFiles.size === 0) {
  console.log("没有需要跑的测试（变更文件没有对应的测试映射）");
  process.exit(0);
}

const testList = [...testFiles].join(" ");
console.log(`需要跑的测试（${testFiles.size} 个）：`);
for (const t of testFiles) {
  console.log(`  - ${t}`);
}

// 跑测试
console.log(`\nnpx vitest run ${testList}\n`);
try {
  execSync(`npx vitest run ${testList}`, { cwd: root, stdio: "inherit" });
} catch (error) {
  process.exit(error.status ?? 1);
}
