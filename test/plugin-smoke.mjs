/**
 * 离目录冒烟自检：加载自包含插件包 lib/index.js，用假 ctx 验证
 * ForgeMcp 全部工具被正确映射为 harness 工具并注册（browser_ 前缀），
 * 且输出的 canonical value 满足自身声明的 output.schema。
 *
 * 覆盖：
 * 1. 注册清单与 MCP 工具表（唯一事实来源）一致，且不含 DSH 保留名；
 * 2. 每个工具的 parameters / output.schema 落在 DSH 受支持子集内
 *    （**用真实 schema 校验，不是校验常量**）；
 * 3. execute 尊重 exec.signal（直接调工具体，见 test/plugin-cancel.test.mjs）；
 * 4. 产物不内联 DSH 宿主包（构建期体检见 test/build-plugin.test.mjs）。
 */
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
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

// 期望清单来自唯一事实来源：@openliulan/mcp-server 导出的工具表。
// 不在这里硬编码——否则后续批次往 MCP 加工具时，插件漏注册也测不出来。
const { TOOLS, GAME_TOOLS } = await import('@openliulan/mcp-server');
const want = [...TOOLS, ...(GAME_TOOLS ?? [])].map((t) => 'browser_' + t.name).sort();
const names = registered.map((d) => d.name).sort();
for (const n of want) if (!names.includes(n)) throw new Error('缺少工具: ' + n);
if (names.length !== want.length) throw new Error('工具数不符: ' + names.join(','));

// 基线护栏：MCP 侧工具表若被清空/破坏，也要报错而不是「空集全绿」
if (want.length < 8) throw new Error('MCP 工具表异常（至少应有 8 枚浏览器工具）: ' + want.join(','));

// 用**已构建产物**里的同一份实现校验，避免测试与产物不一致
const { checkSupportedSchema, validateAgainstSchema } = mod;

for (const d of registered) {
  if (typeof d.execute !== 'function') throw new Error(d.name + ' 缺 execute');
  if (!d.output || typeof d.output.render !== 'function') throw new Error(d.name + ' 缺 output.render');
  if (!d.output.schema) throw new Error(d.name + ' 缺 output.schema');
  if (d.parameters?.type !== 'object') throw new Error(d.name + ' parameters 必须是 object 根: ' + JSON.stringify(d.parameters));
  if (d.name === 'run_code') throw new Error('不得注册 DSH 保留名 run_code');

  // 真实 schema 自检：不是校验常量。任一违规都代表「装上了但调用即炸」。
  const violations = [
    ...checkSupportedSchema(d.parameters).map((v) => 'parameters: ' + v),
    ...checkSupportedSchema(d.output.schema).map((v) => 'output.schema: ' + v),
  ];
  if (violations.length > 0) throw new Error(d.name + ' schema 不在受支持子集内: ' + violations.join('; '));

  // canonical value 契约：用真实返回值形状校验（不是空数组这种恒真输入）
  const sample = { content: [{ type: 'text', text: 'ok' }] };
  const valueViolations = validateAgainstSchema(d.output.schema, sample);
  if (valueViolations.length > 0) throw new Error(d.name + ' output.schema 自检失败: ' + valueViolations.join('; '));
}

// 每个工具都必须带细化的 effect 标签（新版要求可诊断定位）
for (const d of registered) {
  const label = 'openliulan.tool.' + d.name;
  if (!effects.includes(label)) throw new Error('缺 effect 标签: ' + label);
}

// 适配自检画像：不注册为模型可见工具，但必须可读
const profile = mod.loadProfile('browser');
if (!profile) throw new Error('未暴露加载画像 loadProfile()');
if (profile.tools.length !== want.length) throw new Error('画像工具数与注册数不符');

// 产物必须不内联 DSH 宿主包（跨版本兼容的硬约束）
const bundle = await readFile(new URL('../lib/index.js', import.meta.url), 'utf8');
for (const hostPkg of ['@deepseek-ai/dsh-tools', '@deepseek-ai/cordis']) {
  if (bundle.includes('from "' + hostPkg + '"') || bundle.includes('require("' + hostPkg + '")')) {
    throw new Error('产物内联了宿主包 ' + hostPkg + '，会钉死 DSH 版本');
  }
}

console.log('SMOKE_OK pkg=' + pkg.name + '@' + pkg.version
  + ' tools=' + registered.length
  + ' browserTools=' + TOOLS.length
  + ' gameTools=' + (GAME_TOOLS?.length ?? 0)
  + ' flavor=' + profile.host.flavor
  + ' dshBundlePatch=' + JSON.stringify(pkg.dsh?.bundle?.patch));
