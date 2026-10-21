/**
 * DSH 双版本适配验收（CI 用）。
 *
 * ISSUE #33：dsh 已进入新版（PTC mode 线），插件必须能同时装在旧版与
 * 新版上。本脚本在**独立临时目录**安装指定版本的
 * `@deepseek-ai/cordis` + `@deepseek-ai/dsh-tools` + `@deepseek-ai/dsh-system-prompt`，
 * 用真实 `ToolRuntime` 装配本插件的自包含产物 `lib/index.js`，逐条验收：
 *
 * 1. 15 枚工具全部注册可见；
 * 2. `output.schema` 通过宿主的强制 JSON Schema 子集校验；
 * 3. 版本线探测结果符合预期（新版 modern / 旧版 legacy）；
 * 4. `execute(args, exec)` 双参签名跑通，canonical value 合法且 `render` 可投影；
 * 5. `exec.signal` 取消语义与宿主一致（注意：宿主自己也会拦下已中止的
 *    调用，插件侧护栏的**有鉴别力**证据在 test/plugin-cancel.test.mjs）；
 * 6. DSH 保留名 `run_code` 被拒绝注册（防御性保留，默认不可达）。
 *
 * 用法：node scripts/dsh-compat-check.mjs <modern|legacy>
 * 退出码非零即代表该版本线适配失败（驱动 CI 红/绿）。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 两条版本线的依赖钉版（新版 = PTC mode 线，旧版 = Code mode 线）。 */
const FLAVORS = {
  modern: {
    expected: 'modern',
    deps: [
      '@deepseek-ai/cordis@4.0.2',
      '@deepseek-ai/dsh-tools@0.1.6-alpha.2',
      '@deepseek-ai/dsh-llm@0.1.6-alpha.2',
      '@deepseek-ai/dsh-session@0.1.6-alpha.2',
      '@deepseek-ai/dsh-agent@0.1.6-alpha.2',
      '@deepseek-ai/dsh-scope@0.1.6-alpha.2',
      '@deepseek-ai/dsh-brand@0.1.6-alpha.2',
      '@deepseek-ai/dsh-util-values@0.1.6-alpha.2',
      '@deepseek-ai/dsh-invariants@0.1.6-alpha.2',
      '@deepseek-ai/dsh-system-prompt@0.1.6-alpha.2',
      '@deepseek-ai/dsh-user-approval@0.1.6-alpha.2',
      '@deepseek-ai/schemastery@3.18.2',
    ],
  },
  legacy: {
    expected: 'legacy',
    deps: [
      '@deepseek-ai/cordis@4.0.1',
      '@deepseek-ai/dsh-tools@0.1.1-rc.2',
      '@deepseek-ai/dsh-agent@0.1.1-rc.2',
      '@deepseek-ai/dsh-attachment@0.1.1-rc.2',
      '@deepseek-ai/dsh-brand@0.1.1-rc.2',
      '@deepseek-ai/dsh-code-runtime@0.1.1-rc.2',
      '@deepseek-ai/dsh-invariants@0.1.1-rc.2',
      '@deepseek-ai/dsh-llm@0.1.1-rc.2',
      '@deepseek-ai/dsh-scope@0.1.1-rc.2',
      '@deepseek-ai/dsh-session@0.1.1-rc.2',
      '@deepseek-ai/dsh-system-prompt@0.1.1-rc.2',
      '@deepseek-ai/dsh-timeout@0.1.1-rc.2',
      '@deepseek-ai/dsh-user-approval@0.1.1-rc.2',
      '@deepseek-ai/schemastery@3.18.1',
    ],
  },
};

const flavor = process.argv[2];
const spec = FLAVORS[flavor];
if (!spec) {
  console.error(`用法: node scripts/dsh-compat-check.mjs <${Object.keys(FLAVORS).join('|')}>`);
  process.exit(2);
}

const root = fileURLToPath(new URL('..', import.meta.url));
const bundle = path.join(root, 'lib/index.js');
const dir = mkdtempSync(path.join(tmpdir(), `dsh-compat-${flavor}-`));

console.log(`[dsh-compat] 版本线 = ${flavor}，临时目录 = ${dir}`);

try {
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'dsh-compat-probe', private: true, type: 'module' }, null, 2));
  console.log(`[dsh-compat] 安装宿主依赖（${spec.deps.length} 个）...`);
  // npm 的跨平台调用：Windows 上 PATH 里的 `npm` 是**无扩展名的 shell 脚本**，
  // 直接 spawn 会 ENOENT；而 `npm.cmd` 在无 shell 时被 Node 拒绝执行（EINVAL）。
  // 故 Windows 走 `npm.cmd` + shell:true，POSIX 保持原样（Linux CI 行为不变）。
  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(npmBin, ['install', '--no-audit', '--no-fund', '--loglevel=error', ...spec.deps], {
    cwd: dir,
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32',
  });

  const probe = `
import { pathToFileURL } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import ToolRuntime from '@deepseek-ai/dsh-tools';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';

const EXPECTED = ${JSON.stringify(
    ['observe','act','diagnose','eval','screenshot','session_log','close','stealth_status',
     'game_bind','game_record','game_settle','game_transition','game_plan','game_act','game_list']
      .map((n) => 'browser_' + n).sort())};

const ctx = new Context();
ctx.plugin(SystemPrompt, {});
ctx.plugin(ToolRuntime, {});
await new Promise((r) => setTimeout(r, 100));
const tools = ctx.get('tools');
if (!tools) throw new Error('ctx.tools 未就绪：宿主未装配 ToolRuntime');

// 用 file:// URL：Windows 上绝对路径不是合法的 ESM 导入说明符
// （ERR_UNSUPPORTED_ESM_URL_SCHEME），POSIX 上与原写法等价。
const mod = await import(pathToFileURL(${JSON.stringify(bundle)}).href);
if (typeof mod.apply !== 'function') throw new Error('插件未导出 apply');
mod.apply({ tools, effect: (fn, label) => ctx.effect(fn, label) }, { prefix: 'browser' });

const names = tools.schemas().map((s) => s.name).sort();
if (names.some((n) => !n.startsWith('browser_'))) {
  throw new Error('工具前缀不符（应全部为 browser_*）: ' + names.join(','));
}
// 精确匹配期望清单：多注册（漏了护栏的重复注册）与少注册都要红，
// 不能只卡「>= 8」的下限——那会让新增/丢失工具都测不出来。
if (JSON.stringify(names) !== JSON.stringify(EXPECTED)) {
  throw new Error('工具清单不符\\n  期望: ' + EXPECTED.join(',') + '\\n  实得: ' + names.join(','));
}

const profile = mod.loadProfile('browser');
// 宿主可见清单必须与插件报告一致——防止「注册了但没进清单」或反之
const reported = [...profile.tools].sort();
if (JSON.stringify(names) !== JSON.stringify(reported)) {
  throw new Error('宿主可见工具与插件报告不一致\\n  宿主: ' + names.join(',') + '\\n  插件: ' + reported.join(','));
}
if (profile.host.flavor !== ${JSON.stringify(spec.expected)}) {
  throw new Error('版本线探测不符：期望 ${spec.expected}，实得 ' + profile.host.flavor + '（' + profile.host.evidence + '）');
}
// schema 结构自检已在注册期强制：违规即 apply() 抛错、插件加载失败，
// 因此能走到这里就代表全部 schema 通过（不再有恒空的 schemaChecks 数组）。

// 真实 dispatch：execute(args, exec) → output.schema 校验 → render 投影
const ok = await tools.execute({ callId: 'c-ok', name: 'browser_stealth_status', arguments: {}, signal: new AbortController().signal });
if (ok.isError) throw new Error('browser_stealth_status 执行失败: ' + JSON.stringify(ok.content));
if (!Array.isArray(ok.value?.content) || typeof ok.value.content[0]?.text !== 'string') {
  throw new Error('canonical value 结构不符: ' + JSON.stringify(ok.value));
}
if (ok.content[0]?.type !== 'text' || !String(ok.content[0].text).includes('防检测')) {
  throw new Error('render 投影不符: ' + JSON.stringify(ok.content));
}

// 取消语义：与宿主一致（宿主 dispatch 自己就会拦下已中止的调用，故这条
// 只证明「插件不与宿主语义冲突」；插件侧护栏的有鉴别力证据见 test/plugin-cancel.test.mjs）
const ac = new AbortController(); ac.abort();
const cancelled = await tools.execute({ callId: 'c-abort', name: 'browser_stealth_status', arguments: {}, signal: ac.signal });
if (!cancelled.isError) throw new Error('exec.signal 取消语义失效：已中止的调用仍成功');

// 保留名护栏（防御性保留，默认路径不可达；可达性证据见 test/plugin-reserved-name.test.mjs）
if (typeof mod.assertNotReserved !== 'function') throw new Error('插件未导出 assertNotReserved');
if ((() => { try { mod.assertNotReserved('run_code'); return false; } catch { return true; } })() !== true) {
  throw new Error('DSH 保留名 run_code 未被拒绝');
}

console.log('DSH_COMPAT_OK flavor=' + profile.host.flavor + ' tools=' + names.length
  + ' names=' + names.join(',')
  + ' evidence=' + profile.host.evidence);
`;
  writeFileSync(path.join(dir, 'probe.mjs'), probe);
  const out = execFileSync('node', ['probe.mjs'], { cwd: dir, encoding: 'utf8' });
  process.stdout.write(out);
  console.log(`[dsh-compat] ${flavor} 适配验收通过 ✓`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
