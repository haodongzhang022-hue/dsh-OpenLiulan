/**
 * 构建期体检的**反证用例**（防止它再次退化成死代码）。
 *
 * 背景：上一版体检读的是 `result.outputFiles`，而 esbuild 在
 * `write: true`（本项目实际构建方式）下 `outputFiles` 恒为 `undefined`——
 * 体检从未真正执行过；注入真实宿主 import 后产物内联了 cordis，构建仍退出 0。
 *
 * 本测试复用 `scripts/host-inlining-guard.mjs` 的**同一份**体检插件，
 * 用真实 esbuild 跑反证，而不是复刻一套判定。
 */
import { describe, it, expect } from 'vitest';
import { build } from 'esbuild';
import { assertNoHostInlining, findHostInputs } from '../scripts/host-inlining-guard.mjs';

const HOST_INLINED = `import { Context } from '@deepseek-ai/cordis'; export const x = Context;`;
const CLEAN = `export const x = 1;`;

/** 用与生产构建相同的体检插件跑一次内存构建。 */
async function runCheck(contents, write = false) {
  try {
    await build({
      stdin: { contents, resolveDir: process.cwd() },
      bundle: true,
      platform: 'node',
      format: 'esm',
      write,
      outfile: write ? 'node_modules/.cache/host-inlining-probe.js' : undefined,
      metafile: true,
      logLevel: 'silent',
      plugins: [assertNoHostInlining],
    });
    return { failed: false, message: '' };
  } catch (error) {
    return { failed: true, message: error.message ?? '' };
  }
}

describe('构建期体检（宿主包不得内联）', () => {
  it('注入真实宿主 import 时构建必须失败（反证：曾静默通过）', async () => {
    const { failed, message } = await runCheck(HOST_INLINED);
    expect(failed, '注入宿主 import 后构建仍成功 → 体检是死代码').toBe(true);
    expect(message).toContain('@deepseek-ai');
  });

  it('write:true（生产构建方式）下同样必须失败', async () => {
    expect((await runCheck(HOST_INLINED, true)).failed).toBe(true);
  });

  it('不引宿主时构建正常通过（不误报）', async () => {
    expect((await runCheck(CLEAN)).failed).toBe(false);
    expect((await runCheck(CLEAN, true)).failed).toBe(false);
  });

  it('metafile 缺失时体检必须失败，不得静默通过', async () => {
    let failed = false;
    try {
      await build({
        stdin: { contents: CLEAN, resolveDir: process.cwd() },
        bundle: true,
        platform: 'node',
        format: 'esm',
        write: false,
        logLevel: 'silent',
        plugins: [assertNoHostInlining],
      });
    } catch {
      failed = true;
    }
    expect(failed, 'metafile 缺失却静默通过 → 体检可被绕过').toBe(true);
  });

  it('write:true 下 outputFiles 为 undefined，故判定必须走 metafile', async () => {
    const written = await build({
      stdin: { contents: CLEAN, resolveDir: process.cwd() },
      bundle: true,
      platform: 'node',
      format: 'esm',
      write: true,
      outfile: 'node_modules/.cache/host-inlining-probe.js',
      metafile: true,
      logLevel: 'silent',
    });
    expect(written.outputFiles, 'write:true 下 outputFiles 应为 undefined').toBeUndefined();
    expect(written.metafile, 'write:true 下 metafile 仍可用').toBeDefined();
    expect(findHostInputs(written.metafile)).toEqual([]);
  });

  it('真实产物输入图不含宿主包', async () => {
    const result = await build({
      entryPoints: ['src/plugin.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      write: false,
      metafile: true,
      logLevel: 'silent',
      external: ['playwright', 'playwright-core'],
    });
    expect(findHostInputs(result.metafile)).toEqual([]);
  });
});
