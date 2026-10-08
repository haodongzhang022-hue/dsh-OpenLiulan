/**
 * 构建期体检的**反证用例**（防止它再次退化成死代码或双份漂移）。
 *
 * 背景（两次踩坑，都已复现）：
 * 1. 上一版体检读的是 `result.outputFiles`，而 esbuild 在 `write: true`
 *    （本项目实际构建方式）下 `outputFiles` 恒为 `undefined`——体检从未真正
 *    执行过；注入真实宿主 import 后产物内联了 cordis，构建仍退出 0。
 * 2. 修好体检后，它被抽成 `scripts/host-inlining-guard.mjs`，但
 *    `scripts/build-plugin.mjs`（**真正被执行的那份**）里还留着一份本地副本，
 *    仍是 `result.errors.push()`。测试测的是孤儿模块，生产路径照旧静默失效。
 *
 * 因此本文件分三层钉住：
 * - **同源**：体检只有一份实现，`build-plugin.mjs` 必须 import 它（见「单一实现」）。
 * - **反证**：对**生产脚本本身**注入宿主 import，`node scripts/build-plugin.mjs`
 *   必须非零退出（用 `OPENLIULAN_BUILD_ENTRY/OUTFILE` 把入口换成探针，不污染源码）。
 * - **不误报**：同一机制跑干净入口必须退出 0（证明失败来自体检而非探针机制）。
 */
import { describe, it, expect } from 'vitest';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assertNoHostInlining, findHostInputs } from '../scripts/host-inlining-guard.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
/** 探针放在仓库内，才能解析到本仓库的 node_modules。 */
const probeDir = `${root}node_modules/.cache/openliulan`;
const HOST_INLINED = `import { Context } from '@deepseek-ai/cordis'; export const x = Context;`;
const CLEAN = `export const x = 1;`;

/** 写一个探针入口文件，返回其路径。 */
function writeProbe(name, contents) {
  mkdirSync(probeDir, { recursive: true });
  const file = `${probeDir}/${name}.ts`;
  writeFileSync(file, contents);
  return file;
}

/**
 * 用生产脚本跑一次构建（入口/产物/元数据路径走环境变量覆盖）。
 * 返回退出结果与产出的构建元数据路径。
 */
function runProductionBuild(entry, { outfile = `${probeDir}/out.js`, metaFile = `${probeDir}/metafile.json` } = {}) {
  const result = spawnSync(process.execPath, ['scripts/build-plugin.mjs'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      OPENLIULAN_BUILD_ENTRY: entry,
      OPENLIULAN_BUILD_OUTFILE: outfile,
      OPENLIULAN_BUILD_METAFILE: metaFile,
    },
  });
  return { ...result, metaFile };
}

/** 用与生产构建相同的体检插件跑一次内存构建。 */
async function runCheck(contents, write = false) {
  try {
    await build({
      stdin: { contents, resolveDir: process.cwd() },
      bundle: true,
      platform: 'node',
      format: 'esm',
      write,
      outfile: write ? `${probeDir}/host-inlining-probe.js` : undefined,
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
  it('生产脚本必须 import 唯一一份体检实现，不得再留本地副本', () => {
    const source = readFileSync(`${root}scripts/build-plugin.mjs`, 'utf8');
    expect(source, 'build-plugin.mjs 未 import host-inlining-guard → 生产路径用的是另一份').toContain(
      "from './host-inlining-guard.mjs'",
    );
    expect(source, 'build-plugin.mjs 里又出现了本地体检副本（双份实现会漂移）').not.toMatch(
      /const\s+assertNoHostInlining\s*=/,
    );
    expect(source, 'onEnd 里 errors.push 不会让构建失败，别再用它').not.toContain('result.errors.push');
  });

  it('对生产脚本注入宿主 import → node scripts/build-plugin.mjs 必须非零退出', () => {
    const entry = writeProbe('probe-host-import', HOST_INLINED);
    const result = runProductionBuild(entry);
    expect(result.status, `生产构建仍退出 0（体检在生产路径上是死代码）\n${result.stdout}${result.stderr}`).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain('@deepseek-ai');
  });

  it('同一机制跑干净入口必须退出 0（证明上一条失败来自体检，不是探针机制）', () => {
    const entry = writeProbe('probe-clean', CLEAN);
    const result = runProductionBuild(entry);
    expect(result.status, `干净入口也失败了，说明探针机制本身有问题\n${result.stdout}${result.stderr}`).toBe(0);
  });

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
      outfile: `${probeDir}/host-inlining-probe.js`,
      metafile: true,
      logLevel: 'silent',
    });
    expect(written.outputFiles, 'write:true 下 outputFiles 应为 undefined').toBeUndefined();
    expect(written.metafile, 'write:true 下 metafile 仍可用').toBeDefined();
    expect(findHostInputs(written.metafile)).toEqual([]);
  });

  it('真实生产构建（src/plugin.ts → 生产脚本）的输入图不含宿主包', () => {
    const { status, metaFile } = runProductionBuild(`${root}src/plugin.ts`);
    expect(status, '生产构建未成功').toBe(0);
    // 元数据由生产脚本自己落盘，判定用同一份 findHostInputs
    const { metafile } = JSON.parse(readFileSync(metaFile, 'utf8'));
    expect(findHostInputs(metafile)).toEqual([]);
  });
});
