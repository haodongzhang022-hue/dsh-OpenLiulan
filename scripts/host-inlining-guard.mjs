/**
 * 构建期体检：产物不得内联 DSH 宿主包（跨版本兼容的硬约束）。
 *
 * 抽成独立模块，是为了让 `test/build-plugin.test.mjs` 复用**同一份**判定做
 * 反证，防止体检再次退化成死代码。
 *
 * ## 两处曾经静默失效的坑（都已踩过，勿回退）
 *
 * 1. **不能用 `result.outputFiles`**：它在 `write: true`（本项目实际构建方式）
 *    下恒为 `undefined`，判定分支永不进入。
 *    → 改用 `metafile.inputs`（构建时即确定，与 `write` 无关）。
 * 2. **不能只 `result.errors.push()`**：在 `onEnd` 里往 `errors` 推条目
 *    **不会**让构建失败——esbuild 只把 onEnd 阶段的抛出当作失败。
 *    → 命中即 `throw`。`metafile` 缺失时同样 throw（否则又是静默通过）。
 *
 * @module @openliulan/dsh-openliulan/host-inlining-guard
 */

/** 不得出现在产物输入图里的宿主包前缀（出现在此即代表被内联）。 */
export const BANNED_HOST_INPUTS = ['@deepseek-ai/'];

/**
 * 从 metafile 中挑出被内联的宿主包输入文件。
 *
 * @param metafile - esbuild 的构建元数据（`build({ metafile: true })`）。
 * @returns 命中禁用前缀的输入文件路径。
 */
export function findHostInputs(metafile) {
  const inputs = Object.keys(metafile?.inputs ?? {});
  return inputs.filter((path) => BANNED_HOST_INPUTS.some((prefix) => path.includes(`node_modules/${prefix}`)));
}

/** esbuild 插件：产物内联宿主包即构建失败。 */
export const assertNoHostInlining = {
  name: 'assert-no-host-inlining',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return; // 已有编译错误，让它自己报
      if (result.metafile === undefined) {
        throw new Error('构建期体检需要 metafile: true——缺少输入文件图会让体检静默通过');
      }
      const inlined = findHostInputs(result.metafile);
      if (inlined.length > 0) {
        throw new Error(
          `产物内联了宿主包，会钉死 DSH 版本、破坏跨版本兼容：\n  ${inlined.join('\n  ')}`,
        );
      }
    });
  },
};
