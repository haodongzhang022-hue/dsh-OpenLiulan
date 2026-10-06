/**
 * 取消语义的**有鉴别力**用例。
 *
 * 背景（评审反证）：`test/plugin-dsh-compat.test.mjs` 里那条「已取消必须
 * isError」走的是**真宿主 dispatch**，而真宿主自己就会在 body 启动前拦下
 * 已中止的调用（`ABORTED_BEFORE_DISPATCH`）。把插件的 `throwIfAborted()`
 * 整段删掉，那 7 例仍全绿——测的是宿主，不是插件。
 *
 * 本文件用 `vi.mock` 把 `ForgeMcp.callTool` 换成计数器，**直接调用工具体**
 * （绕过宿主那层），于是：
 * - 已中止 → `callTool` 必须**零调用**（插件自己的护栏生效）；
 * - 未中止 → `callTool` 必须被调用（证明断言不是恒真、spy 真的接上了）。
 *
 * 两条一起构成鉴别力：删掉插件护栏，第一条立刻红。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const calls = [];
vi.mock('@openliulan/mcp-server', () => ({
  ForgeMcp: class {
    constructor() {
      this.tools = [
        { name: 'probe_tool', description: 'probe', inputSchema: { type: 'object', properties: {} } },
      ];
    }
    async callTool(name, args) {
      calls.push({ name, args });
      return { ok: true, content: [{ type: 'text', text: 'called' }] };
    }
  },
}));

const { apply } = await import('../src/plugin.ts');

/** 用假 ctx 装载插件，返回按名字索引的注册定义。 */
function mount() {
  const registered = new Map();
  const ctx = {
    tools: { register(def) { registered.set(def.name, def); return () => registered.delete(def.name); } },
    effect(fn) { return fn(); },
  };
  apply(ctx, { prefix: 'browser' });
  return registered;
}

beforeEach(() => {
  calls.length = 0;
});

describe('execute 的取消语义（直接调工具体，绕过宿主）', () => {
  it('已中止的调用不得触达工具体（callTool 零调用）', async () => {
    const tool = mount().get('browser_probe_tool');
    const ac = new AbortController();
    ac.abort();
    await expect(tool.execute({}, { signal: ac.signal })).rejects.toThrow();
    expect(calls, '已中止却仍调用了 callTool → 插件护栏失效').toEqual([]);
  });

  it('未中止的调用必须触达工具体（证明上一条不是恒真断言）', async () => {
    const tool = mount().get('browser_probe_tool');
    await tool.execute({}, { signal: new AbortController().signal });
    expect(calls.map((c) => c.name)).toEqual(['probe_tool']);
  });

  it('旧版宿主不传 exec 时不得因缺 signal 而失败（双版本兼容）', async () => {
    const tool = mount().get('browser_probe_tool');
    await tool.execute({});
    expect(calls.map((c) => c.name)).toEqual(['probe_tool']);
  });

  it('宿主 dispatch 的取消兜底是宿主行为，不能当作插件证据', async () => {
    // 记录该事实，避免后来者再把宿主行为误读成插件护栏：
    // 上面第一条「直接调 execute」才是插件侧的证据。
    const tool = mount().get('browser_probe_tool');
    const ac = new AbortController();
    ac.abort();
    let pluginThrew = false;
    try {
      await tool.execute({}, { signal: ac.signal });
    } catch {
      pluginThrew = true;
    }
    expect(pluginThrew).toBe(true);
    expect(calls).toEqual([]);
  });
});
