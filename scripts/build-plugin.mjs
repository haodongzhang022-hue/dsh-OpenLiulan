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
 * 注入的 `ctx.tools`，`@deepseek-ai/cordis` 仅作类型使用（esbuild 会擦除），
 * 因此同一份 lib/index.js 可同时装在旧版与新版的 DSH 上。
 */
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/** 断言产物没有把 DSH 宿主包内联进来（跨版本兼容的硬约束）。 */
const assertNoHostInlining = {
  name: 'assert-no-host-inlining',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;
      const contents = result.outputFiles?.[0]?.text ?? '';
      const banned = ['@deepseek-ai/dsh-tools', '@deepseek-ai/cordis'];
      for (const pkg of banned) {
        if (contents.includes(`from "${pkg}"`) || contents.includes(`require("${pkg}")`)) {
          result.errors.push({ text: `产物内联了宿主包 ${pkg}：会钉死 DSH 版本，破坏跨版本兼容` });
        }
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
  plugins: [resolveOpenliulan, assertNoHostInlining],
  external: ['playwright', 'playwright-core'],
});

console.log('built lib/index.js');
