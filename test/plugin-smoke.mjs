/**
 * 离目录冒烟自检：加载自包含插件包 lib/index.js，用假 ctx 验证
 * ForgeMcp 全部工具被正确映射为 harness 工具并注册（browser_ 前缀），
 * 且输出的 canonical value 满足自身声明的 output.schema。
 *
 * ISSUE #33：自检同时覆盖「新版 DSH 适配」的三条硬约束：
 * 1. 不注册 DSH 保留名（run_code）；
 * 2. 每个工具都有 output.schema 且 canonical value 通过校验；
 * 3. execute 尊重 exec.signal（取消后不再执行）。
 */
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const mod = await import('../lib/index.js');
if (typeof mod.apply !== 'function') throw new Error('lib/index.js 未导出 apply');
if (mod.name !== 'openliulan-browser') throw new Error('插件 name 不匹配: ' + mod.name);

const registered = [];
const effects = [];
const ctx = {
  tools: {
    register(def) {
      registered.push(def);
      return () => { const i = registered.indexOf(def); if (i >= 0) registered.splice(i, 1); };
    },
  },
  effect(fn, label) { effects.push(label); return fn(); },
};

mod.apply(ctx, { prefix: 'browser' });

const expected = [
  'observe', 'act', 'diagnose', 'eval', 'screenshot', 'session_log', 'close', 'stealth_status',
  'game_bind', 'game_record', 'game_settle', 'game_transition', 'game_plan', 'game_act', 'game_list',
];
const names = registered.map((d) => d.name).sort();
const want = expected.map((n) => 'browser_' + n).sort();
for (const n of want) if (!names.includes(n)) throw new Error('缺少工具: ' + n);
if (names.length !== want.length) throw new Error('工具数不符: ' + names.join(','));

for (const d of registered) {
  if (typeof d.execute !== 'function') throw new Error(d.name + ' 缺 execute');
  if (!d.output || typeof d.output.render !== 'function') throw new Error(d.name + ' 缺 output.render');
  if (!d.output.schema) throw new Error(d.name + ' 缺 output.schema');
  if (d.parameters?.type !== 'object') throw new Error(d.name + ' parameters 必须是 object 根: ' + JSON.stringify(d.parameters));
  if (d.name === 'run_code') throw new Error('不得注册 DSH 保留名 run_code');
}

// 每个工具都必须带细化的 effect 标签（新版要求可诊断定位）
for (const d of registered) {
  const label = 'openliulan.tool.' + d.name;
  if (!effects.includes(label)) throw new Error('缺 effect 标签: ' + label);
}

// canonical value 必须满足自身声明的 output.schema
const { validateAgainstSchema } = await import('../src/dsh-schema.ts');
for (const d of registered) {
  const violations = validateAgainstSchema(d.output.schema, { content: [{ type: 'text', text: 'ok' }] });
  if (violations.length > 0) throw new Error(d.name + ' output.schema 自检失败: ' + violations.join('; '));
}

// execute 尊重 exec.signal：已取消时必须立刻抛错、不触达浏览器
const ac = new AbortController();
ac.abort();
let aborted = false;
try {
  await registered.find((d) => d.name === 'browser_stealth_status').execute({}, { signal: ac.signal });
} catch {
  aborted = true;
}
if (!aborted) throw new Error('execute 未尊重 exec.signal（取消后仍执行）');

// stealth_status 是最轻的一枚工具，且不触达浏览器，用它验证真实调用链路
const live = await registered.find((d) => d.name === 'browser_stealth_status').execute({}, { signal: new AbortController().signal });
const liveViolations = validateAgainstSchema(
  registered.find((d) => d.name === 'browser_stealth_status').output.schema, live);
if (liveViolations.length > 0) throw new Error('真实返回值不符合 output.schema: ' + liveViolations.join('; '));

// 适配自检画像：不注册为模型可见工具，但必须可读
const profile = mod.loadProfile('browser');
if (!profile) throw new Error('未暴露加载画像 loadProfile()');
if (profile.tools.length !== want.length) throw new Error('画像工具数与注册数不符');
if (profile.schemaChecks.length > 0) throw new Error('schema 自检未通过: ' + JSON.stringify(profile.schemaChecks));

// 产物必须不内联 DSH 宿主包（跨版本兼容的硬约束）
const bundle = await readFile(new URL('../lib/index.js', import.meta.url), 'utf8');
for (const hostPkg of ['@deepseek-ai/dsh-tools', '@deepseek-ai/cordis']) {
  if (bundle.includes('from "' + hostPkg + '"') || bundle.includes('require("' + hostPkg + '")')) {
    throw new Error('产物内联了宿主包 ' + hostPkg + '，会钉死 DSH 版本');
  }
}

console.log('SMOKE_OK pkg=' + pkg.name + '@' + pkg.version
  + ' tools=' + registered.length
  + ' flavor=' + profile.host.flavor
  + ' dshBundlePatch=' + JSON.stringify(pkg.dsh?.bundle?.patch));
