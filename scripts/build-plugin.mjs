/**
 * 构建「可安装 DSH 插件包」的自包含单文件 lib/index.js。
 *
 * 用 esbuild 把 src/plugin.ts 及其内部依赖（@openliulan/* 全部源码）内联为
 * 一个 ESM 文件，只外置已发布的 playwright，从而产出一个不依赖任何未发布
 * npm 包、可被 `dsh plugin --profile web add ...` 一条命令安装的插件包。
 *
 * 说明：这里的 resolve 插件把所有 `@openliulan/<pkg>` 重定向到对应包的
 * 源码入口 src/index.ts（而非可能未构建的 main 字段），实现真正的进程内
 * 内联。`packages` 不设 external，否则内部包会被当外部依赖原样导出。
 *
 * ISSUE #33：产物**不内联任何 @deepseek-ai/* 运行时符号**。插件只依赖宿主
 * 注入的 `ctx.tools`，因此同一份 lib/index.js 可同时装在旧版与新版的 DSH 上。
 *
 * 该约束由 `scripts/host-inlining-guard.mjs` 的 `assertNoHostInlining` 强制，
 * **本脚本不再自带副本**。这里踩过一次双份漂移：体检被抽成独立模块后，本文件
 * 仍留着一份读 `result.outputFiles` + 只 `errors.push()` 的旧副本，而真正被执行
 * 的正是它——产物内联宿主后构建仍退出 0，修好的那份成了孤儿。
 * 现在体检只有一份实现，`test/build-plugin.test.mjs` 直接对**本脚本**做反证。
 */
import { build } from 'esbuild';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoHostInlining } from './host-inlining-guard.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

const INTERNAL = ['mcp-server', 'core', 'engines', 'diagnosis', 'token', 'ai-layer', 'stealth', 'game-profile'];

/** 把 @openliulan/<pkg> 解析到源码入口，保证被打包内联。 */
const resolveOpenliulan = {
  name: 'resolve-openliulan',
  setup(build) {
    build.onResolve({ filter: /^@openliulan\// }, (args) => {
      const name = args.path.replace(/^@openliulan\//, '');
      if (!INTERNAL.includes(name)) return; // 走默认解析
      return { path: resolve(root, `packages/${name}/src/index.ts`) };
    });
  },
};

/**
 * 入口 / 产物 / 元数据落点。生产路径用默认值；反证用例
 * （`test/build-plugin.test.mjs`）用环境变量把入口换成含真实宿主 import 的
 * 探针，断言**本脚本**非零退出——体检挂在生产路径上，不是平行实现。
 */
const entryPoint = process.env.OPENLIULAN_BUILD_ENTRY ?? resolve(root, 'src/plugin.ts');
const outfile = process.env.OPENLIULAN_BUILD_OUTFILE ?? resolve(root, 'lib/index.js');
const metaFile =
  process.env.OPENLIULAN_BUILD_METAFILE ?? resolve(root, 'node_modules/.cache/openliulan/build-metafile.json');

const result = await build({
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  logLevel: 'info',
  sourcemap: 'inline',
  write: true,
  // 构建期体检需要输入文件图；`write` 不影响 metafile 可用性。
  metafile: true,
  plugins: [resolveOpenliulan, assertNoHostInlining],
  external: ['playwright', 'playwright-core'],
});

// 落盘构建元数据，供 `test/plugin-smoke.mjs` 用**同一份** findHostInputs()
// 复核已落盘产物（此前的字符串匹配拦不住内联，只会给假绿）。
mkdirSync(dirname(metaFile), { recursive: true });
writeFileSync(
  metaFile,
  JSON.stringify({
    outfile: relative(root, outfile),
    bytes: statSync(outfile).size,
    // 存完整 metafile：让下游用同一份 findHostInputs() 复核，而不是另写判定
    metafile: result.metafile,
  }),
);

console.log(`built ${relative(root, outfile)}`);
