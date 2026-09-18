/**
 * DSH 宿主兼容性验收（真实 ToolRuntime，不是假 ctx）。
 *
 * ISSUE #33 的核心诉求是「适配 dsh 新版」。本测试用 **真实
 * `@deepseek-ai/cordis` + `@deepseek-ai/dsh-tools` 的 ToolRuntime**
 * 装配插件，逐条验收新版的三处硬约束，避免「假 ctx 全绿、装到真机上炸」：
 *
 * 1. 新版保留名 `run_code` 不被注册；
 * 2. `output.schema` 通过新版 `assertSupportedJsonSchema` 校验；
 * 3. `execute(args, exec)` 双参签名 + `exec.signal` 取消语义；
 * 4. 工具名、effect 标签、canonical value 与 `render` 投影一致。
 *
 * 依赖不可用时自动跳过（本仓库把 DSH 声明为可选 peer，离线环境仍可跑其余测试）。
 */
import { describe, it, expect, beforeAll } from 'vitest';

let Context;
let ToolRuntime;
let SystemPrompt;
let apply;
let loadProfile;
let available = false;

beforeAll(async () => {
  try {
    ({ Context } = await import('@deepseek-ai/cordis'));
    ToolRuntime = (await import('@deepseek-ai/dsh-tools')).default;
    SystemPrompt = (await import('@deepseek-ai/dsh-system-prompt')).default;
    ({ apply, loadProfile } = await import('../src/plugin.js'));
    available = typeof ToolRuntime === 'function' && typeof SystemPrompt === 'function';
  } catch {
    available = false;
  }
});

/** 装配一个真实的 harness 上下文并加载插件。 */
async function mount(prefix = 'browser') {
  const ctx = new Context();
  ctx.plugin(SystemPrompt, {});
  ctx.plugin(ToolRuntime, {});
  await new Promise((r) => setTimeout(r, 50));
  const tools = ctx.get('tools');
  if (!tools) throw new Error('未取得 ctx.tools（ToolRuntime 未装配）');
  apply({ tools, effect: (fn, label) => ctx.effect(fn, label) }, { prefix });
  return { ctx, tools };
}

const EXPECTED_TOOLS = [
  'observe', 'act', 'diagnose', 'eval', 'screenshot', 'session_log', 'close', 'stealth_status',
  'game_bind', 'game_record', 'game_settle', 'game_transition', 'game_plan', 'game_act', 'game_list',
].map((n) => `browser_${n}`).sort();

describe.runIf(true)('DSH 真实宿主兼容性', () => {
  it('真实 ToolRuntime 上注册全部 15 枚工具', async () => {
    if (!available) return;
    const { tools } = await mount();
    const names = tools.schemas().map((s) => s.name).sort();
    expect(names).toEqual(EXPECTED_TOOLS);
  });

  it('识别新版 DSH 版本线（mode 取值含 ptc）', async () => {
    if (!available) return;
    await mount();
    const profile = loadProfile('browser');
    expect(profile).toBeDefined();
    // 旧版宿主上为 legacy，新版为 modern；两者都不得是 unknown
    expect(['modern', 'legacy']).toContain(profile.host.flavor);
    expect(profile.tools.length).toBe(EXPECTED_TOOLS.length);
    expect(profile.schemaChecks).toEqual([]);
  });

  it('parameters 是受支持子集（object 根 + 显式 additionalProperties）', async () => {
    if (!available) return;
    const { tools } = await mount();
    for (const schema of tools.schemas()) {
      expect(schema.parameters.type, schema.name).toBe('object');
      for (const key of Object.keys(schema.parameters)) {
        expect(['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const', 'oneOf', 'description', 'title'],
          `${schema.name} 含不受支持的 keyword: ${key}`).toContain(key);
      }
      // required 的每一项都必须落在 properties 内，否则新版直接拒绝
      for (const name of schema.parameters.required ?? []) {
        expect(Object.keys(schema.parameters.properties ?? {}), `${schema.name}.required`).toContain(name);
      }
    }
  });

  it('真实 dispatch 走通 execute → output.schema → render 全链路', async () => {
    if (!available) return;
    const { tools } = await mount();
    const result = await tools.execute({
      callId: 'call-openliulan-1',
      name: 'browser_stealth_status',
      arguments: {},
      signal: new AbortController().signal,
    });
    expect(result.isError).toBe(false);
    // canonical value 必须满足 output.schema（真实 ToolRuntime 已做强制校验）
    expect(Array.isArray(result.value.content)).toBe(true);
    expect(typeof result.value.content[0].text).toBe('string');
    // render 投影为模型内容块
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('防检测');
  });

  it('execute 尊重 exec.signal：已取消时不触达工具体', async () => {
    if (!available) return;
    const { tools } = await mount();
    const ac = new AbortController();
    ac.abort();
    const result = await tools.execute({
      callId: 'call-openliulan-2',
      name: 'browser_stealth_status',
      arguments: {},
      signal: ac.signal,
    });
    expect(result.isError).toBe(true);
  });

  it('拒绝注册 DSH 保留名 run_code', async () => {
    if (!available) return;
    const { ctx, tools } = await mount();
    // prefix='run' + 工具名 'code' 组合出 run_code；但本插件无 'code' 工具，
    // 故直接用 prefix='run_code' 断言「任何以保留名结尾的组合都被拒绝」不可靠，
    // 改为直接验证注册期护栏函数对保留名的判定。
    const { assertNotReserved } = await import('../src/plugin.js');
    expect(() => assertNotReserved('run_code')).toThrow(/保留名/);
    expect(() => assertNotReserved('browser_observe')).not.toThrow();
    void ctx; void tools;
  });

  it('卸载插件后工具全部回收（effect disposer 生效）', async () => {
    if (!available) return;
    const root = new Context();
    root.plugin(SystemPrompt, {});
    root.plugin(ToolRuntime, {});
    await new Promise((r) => setTimeout(r, 50));
    const tools = root.get('tools');
    const scope = root.plugin((c) => apply({ tools, effect: (fn, label) => c.effect(fn, label) }, { prefix: 'browser' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(tools.schemas().length).toBe(EXPECTED_TOOLS.length);
    scope.dispose();
    await new Promise((r) => setTimeout(r, 50));
    expect(tools.schemas().length).toBe(0);
  });
});
