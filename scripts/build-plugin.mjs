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
 * 该约束由 {@link assertNoHostInlining} 在构建期强制。判定依据是 esbuild 的
 * **`metafile.inputs`**（构建时即已确定、与 `write` 无关），不是
 * `result.outputFiles`——后者在 `write: true` 下恒为 `undefined`，
 * 曾导致这道体检静默失效（产物内联宿主仍退出 0）。
 */
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const INTERNAL = ['mcp-server', 'core', 'engines', 'diagnosis', 'token', 'ai-layer', 'stealth', 'game-profile'];

/** 不得出现在产物输入图里的宿主包（出现在此即代表被内联）。 */
export const BANNED_HOST_INPUTS = ['@deepseek-ai/'];

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
 * 断言产物没有把 DSH 宿主包内联进来（跨版本兼容的硬约束）。
 *
 * 判定用 `result.metafile.inputs`：它是 esbuild 解析出的**输入文件图**，
 * 在 `write` 取值下都可用。任何 `@deepseek-ai/*` 包一旦被真正打进产物，
 * 其文件必然出现在这张图里；仅在注释/字符串里提到包名则不会误报。
 *
 * 自检：`scripts/build-plugin.test.mjs` 会注入一条真实宿主 import，
 * 断言本体检确实让构建失败——防止它再次退化成死代码。
 */
const assertNoHostInlining = {
  name: 'assert-no-host-inlining',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;
      const inputs = Object.keys(result.metafile?.inputs ?? {});
      const inlined = inputs.filter((path) => BANNED_HOST_INPUTS.some((prefix) => path.includes(`node_modules/${prefix}`)));
      for (const path of inlined) {
        result.errors.push({
          text: `产物内联了宿主包（${path}）：会钉死 DSH 版本，破坏跨版本兼容`,
        });
      }
    });
  },
};

await build({
  entryPoints: [resolve(root, 'src/plugin.ts')],
  outfile: resolve(root, 'lib/index.js'),
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

console.log('built lib/index.js');
