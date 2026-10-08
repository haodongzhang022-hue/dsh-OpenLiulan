/**
 * 保留名护栏的可达性与鉴别力。
 *
 * 评审反证：`publicName = `${prefix}_${tool.name}``，而 MCP 工具表里没有名为
 * `code` 的工具——`prefix="run"` 产出的是 `run_observe`，`prefix="run_code"`
 * 产出的是 `run_code_observe`。所以**只看 publicName** 的护栏在真实调用路径
 * 上不可达，除非将来有人往 MCP 里加一枚恰好叫 `code` 的工具。
 *
 * 修复：判定同时覆盖 `tool.name` 本身；文档与注释降级为「防御性保留」，
 * 不再当硬约束卖。本文件把两个方向都钉住：
 * - 默认前缀路径下护栏**确实不可达**（如实记录，避免再次过度宣称）；
 * - 一旦 MCP 侧出现 `code` 工具，护栏**必须**拦下（这是它存在的理由）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const toolNames = [];
vi.mock('@openliulan/mcp-server', () => ({
  ForgeMcp: class {
    constructor() {
      this.tools = toolNames.map((name) => ({
        name,
        description: name,
        inputSchema: { type: 'object', properties: {} },
      }));
    }
    async callTool() {
      return { ok: true, content: [{ type: 'text', text: 'ok' }] };
    }
  },
}));

const { apply, assertNotReserved } = await import('../src/plugin.ts');

function mount(prefix) {
  const registered = [];
  const ctx = {
    tools: { register(def) { registered.push(def); return () => {}; } },
    effect(fn) { return fn(); },
  };
  apply(ctx, { prefix });
  return registered.map((d) => d.name);
}

beforeEach(() => {
  toolNames.length = 0;
  toolNames.push('observe');
});

describe('保留名护栏', () => {
  it('单看 publicName 时不可达：prefix="run" 产出 run_observe 而非 run_code', () => {
    expect(mount('run')).toEqual(['run_observe']);
    expect(() => assertNotReserved('run_observe')).not.toThrow();
  });

  it('prefix="run_code" 也不命中：产出的是 run_code_observe', () => {
    expect(mount('run_code')).toEqual(['run_code_observe']);
  });

  it('MCP 侧出现名为 code 的工具时，prefix="run" 必须被拦下', () => {
    toolNames.length = 0;
    toolNames.push('code');
    expect(() => mount('run'), '护栏对 tool.name 生效后才拦得住').toThrow(/保留名/);
  });

  it('直接以保留名作 prefix 时被拦下（tool.name 判定的兜底）', () => {
    toolNames.length = 0;
    toolNames.push('run_code');
    expect(() => mount('browser')).toThrow(/保留名/);
  });

  it('assertNotReserved 对保留名抛错、对普通名放行', () => {
    expect(() => assertNotReserved('run_code')).toThrow(/保留名/);
    expect(() => assertNotReserved('browser_observe', 'observe')).not.toThrow();
    expect(() => assertNotReserved('browser_run_code', 'run_code')).toThrow(/保留名/);
  });
});
