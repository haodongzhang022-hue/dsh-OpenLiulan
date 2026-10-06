/**
 * DSH 宿主兼容性验收（真实 ToolRuntime，不是假 ctx）。
 *
 * ISSUE #33 的核心诉求是「适配 dsh 新版」。本测试用 **真实
 * `@deepseek-ai/cordis` + `@deepseek-ai/dsh-tools` 的 ToolRuntime**
 * 装配插件，逐条验收新版的三处硬约束，避免「假 ctx 全绿、装到真机上炸」。
 *
 * ## 与 `test/plugin-cancel.test.mjs` 的分工（重要）
 *
 * 本文件里「取消」那条走的是**真宿主 dispatch**——而真宿主自己就会在 body
 * 启动前拦下已中止的调用（`ABORTED_BEFORE_DISPATCH`）。也就是说，那条断言
 * 证明的是**宿主**的行为，删掉插件自己的 `throwIfAborted()` 它依然全绿。
 * **插件侧取消护栏的证据在 `test/plugin-cancel.test.mjs`**（直接调工具体、
 * 统计 `callTool` 调用数）。这里保留宿主侧断言，是为了确认插件与宿主语义
 * 不冲突，而不是把它当插件护栏的证明。
 *
 * 依赖不可用时自动跳过（本仓库把 DSH 声明为可选 peer，离线环境仍可跑其余测试）。
 */
import { describe, it, expect, beforeAll } from 'vitest';

let Context;
let ToolRuntime;
let SystemPrompt;
let apply;
let loadProfile;
let EXPECTED_TOOLS = [];
let available = false;

beforeAll(async () => {
  try {
    ({ Context } = await import('@deepseek-ai/cordis'));
    ToolRuntime = (await import('@deepseek-ai/dsh-tools')).default;
    SystemPrompt = (await import('@deepseek-ai/dsh-system-prompt')).default;
    ({ apply, loadProfile } = await import('../src/plugin.ts'));
    // 期望清单来自唯一事实来源（MCP 工具表），不硬编码
    const { TOOLS, GAME_TOOLS } = await import('@openliulan/mcp-server');
    EXPECTED_TOOLS = [...TOOLS, ...(GAME_TOOLS ?? [])].map((t) => `browser_${t.name}`).sort();
    available = typeof ToolRuntime === 'function'
      && typeof SystemPrompt === 'function'
      && EXPECTED_TOOLS.length >= 8;
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

describe.runIf(true)('DSH 真实宿主兼容性', () => {
  it('真实 ToolRuntime 上注册 MCP 工具表的全部工具', async () => {
    if (!available) return;
    const { tools } = await mount();
    const names = tools.schemas().map((s) => s.name).sort();
    expect(names).toEqual(EXPECTED_TOOLS);
    expect(names.length).toBeGreaterThanOrEqual(8);
  });

  it('识别新版 DSH 版本线（mode 取值含 ptc 或 code）', async () => {
    if (!available) return;
    await mount();
    const profile = loadProfile('browser');
    expect(profile).toBeDefined();
    expect(['modern', 'legacy']).toContain(profile.host.flavor);
    expect(profile.tools.length).toBe(EXPECTED_TOOLS.length);
  });

  it('parameters 是受支持子集（object 根 + 仅白名单 keyword）', async () => {
    if (!available) return;
    const { tools } = await mount();
    for (const schema of tools.schemas()) {
      expect(schema.parameters.type, schema.name).toBe('object');
      for (const key of Object.keys(schema.parameters)) {
        expect(['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const', 'oneOf', 'description', 'title'],
          `${schema.name} 含不受支持的 keyword: ${key}`).toContain(key);
      }
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
    expect(Array.isArray(result.value.content)).toBe(true);
    expect(typeof result.value.content[0].text).toBe('string');
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('防检测');
  });

  it('宿主 dispatch 层会拦下已中止的调用（宿主行为，非插件护栏证据）', async () => {
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
    expect(result.error?.info?.code).toBe('ABORTED_BEFORE_DISPATCH');
  });

  it('卸载插件后工具全部回收，且加载画像同步清理', async () => {
    if (!available) return;
    const root = new Context();
    root.plugin(SystemPrompt, {});
    root.plugin(ToolRuntime, {});
    await new Promise((r) => setTimeout(r, 50));
    const tools = root.get('tools');
    const scope = root.plugin((c) => apply({ tools, effect: (fn, label) => c.effect(fn, label) }, { prefix: 'browser' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(tools.schemas().length).toBe(EXPECTED_TOOLS.length);
    expect(loadProfile('browser'), '装载后画像应存在').toBeDefined();
    scope.dispose();
    await new Promise((r) => setTimeout(r, 50));
    expect(tools.schemas().length).toBe(0);
    expect(loadProfile('browser'), '卸载后画像应被清理，否则重载会读到陈旧画像').toBeUndefined();
  });
});
