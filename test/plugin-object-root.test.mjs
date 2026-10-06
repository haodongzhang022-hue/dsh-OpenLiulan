/**
 * 压平护栏（🟡-K）的可达性与鉴别力。
 *
 * 评审反证：`plugin.ts` 读 `normalized.properties ?? {}`，于是
 * `inputSchema = { oneOf: [...] }` → 注册出 `parameters = { type:'object', properties:{} }`，
 * `checkSupportedSchema` **放行**，工具静默变成「收任意参数」。
 *
 * 这里丢的**不是**「位置不受支持的写法」（那是 🟡-G，保留会让插件整体加载失败），
 * 而是**整个取值约束**，且注册成功——正是 🟡-D 那条 fail-open。所以护栏选择抛错。
 *
 * **护栏覆盖整类，不止评审点名的 `oneOf`**：`parameters` 只从 normalized 取
 * `properties` / `required` / `additionalProperties`，凡是被压平丢掉的约束
 * （`oneOf` / 根 `enum` / 根 `const` / `items`）或非 `object` 的根 `type`，一律抛。
 * 例：`{ type:'object', enum:['x'] }` 是**对象根**、逃得过只看 `oneOf` 的护栏，
 * 但约束照样被丢（宿主 `assertObjectJsonSchema` 对原样输入直接拒绝）——同类，一并拦。
 *
 * 本文件把两个方向都钉住：
 * - 会被压平的输入（非对象根 / 根上并写的约束 keyword）**必须**抛错，且**抛前零注册**；
 * - 纯对象根（含空 properties、注解式节点）**必须**照常注册（证明不是「见谁都抛」）。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/** 当前探针工具的 inputSchema（每个用例前重置）。 */
let probeSchema;
/** 注册进假 ctx 的工具数（用于确认护栏在注册**之前**生效）。 */
let registeredCount = 0;

vi.mock('@openliulan/mcp-server', () => ({
  ForgeMcp: class {
    constructor() {
      this.tools = [{ name: 'probe_tool', description: 'probe', inputSchema: probeSchema }];
    }
    async callTool() {
      return { ok: true, content: [{ type: 'text', text: 'ok' }] };
    }
  },
}));

const { apply } = await import('../src/plugin.ts');

// 真实宿主 oracle：parameters 根的校验器是 `assertObjectJsonSchema`（不是
// `assertSupportedJsonSchema`——后者只判 keyword 子集，对 `{oneOf:[…]}` 是放行的，
// 因为它只负责「值 schema」那一层）。拿错 oracle 会写出假断言，这里用对的那个。
let assertObjectJsonSchema;
let hostAvailable = false;
try {
  ({ assertObjectJsonSchema } = await import('@deepseek-ai/dsh-tools'));
  hostAvailable = typeof assertObjectJsonSchema === 'function';
} catch {
  hostAvailable = false;
}

function mount() {
  const registered = [];
  const ctx = {
    tools: { register(def) { registered.push(def); registeredCount++; return () => {}; } },
    effect(fn) { return fn(); },
  };
  apply(ctx, { prefix: 'browser' });
  return registered;
}

beforeEach(() => {
  probeSchema = { type: 'object', properties: {} };
  registeredCount = 0;
});

describe('压平护栏', () => {
  it('oneOf 作根时抛错（不得压成 { type:"object", properties:{} }）', () => {
    probeSchema = { oneOf: [{ type: 'string' }, { type: 'number' }] };
    expect(() => mount(), 'oneOf 根会被压成空对象 → 静默变宽，必须抛').toThrow(/对象根/);
    // 护栏必须在注册**之前**生效：不能「先注册再抛」
    expect(registeredCount, '抛错前不得注册任何工具').toBe(0);
  });

  it('非 object 的 type 作根时抛错（string / array / number / boolean）', () => {
    for (const type of ['string', 'array', 'number', 'boolean']) {
      registeredCount = 0;
      probeSchema = { type, items: { type: 'string' } };
      expect(() => mount(), `type:"${type}" 根会被压成空对象 → 静默变宽`).toThrow(/对象根/);
      expect(registeredCount, `type:"${type}"：抛错前不得注册`).toBe(0);
    }
  });

  it('对象根上并写的约束 keyword 也抛（同属压平丢失，只看 oneOf 会漏）', () => {
    // `{ type:'object', enum:['x'] }` 是**对象根**——逃得过只看 `oneOf` 的护栏，
    // 但 `parameters` 只取 properties/required/additionalProperties，enum 照样被丢。
    for (const [key, value] of [
      ['enum', ['x']],
      ['const', { a: 1 }],
      ['items', { type: 'string' }],
    ]) {
      registeredCount = 0;
      probeSchema = { type: 'object', properties: { a: { type: 'string' } }, [key]: value };
      expect(() => mount(), `根上并写的 ${key} 会被静默丢弃 → 必须抛`).toThrow(/对象根/);
      expect(registeredCount, `${key}：抛错前不得注册`).toBe(0);
    }
  });

  it('被拦的写法，宿主 assertObjectJsonSchema 同样拒绝（护栏拦的是真问题）', () => {
    expect(hostAvailable, '差分 oracle 的宿主依赖不可用：本用例必须真跑，不得静默跳过').toBe(true);
    for (const raw of [
      { oneOf: [{ type: 'string' }, { type: 'number' }] },
      { type: 'string' },
      { type: 'array', items: { type: 'string' } },
      { type: 'object', enum: ['x'] },
      { type: 'object', const: { a: 1 } },
      { type: 'object', items: { type: 'string' } },
    ]) {
      expect(
        () => assertObjectJsonSchema(raw),
        `宿主应拒绝原样 ${JSON.stringify(raw)} 作 parameters 根`,
      ).toThrow();
    }
    // 反向：纯对象根宿主放行（证明 oracle 不是「见谁都拒」）
    for (const raw of [{ type: 'object', properties: { a: { type: 'string' } } }, { type: 'object' }]) {
      expect(() => assertObjectJsonSchema(raw), JSON.stringify(raw)).not.toThrow();
    }
  });

  it('对象根照常注册（鉴别力：不是见谁都抛）', () => {
    for (const schema of [
      { type: 'object', properties: {} },
      { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
      { description: '注解式节点，无 type' },
      {},
    ]) {
      registeredCount = 0;
      probeSchema = schema;
      const registered = mount();
      const label = JSON.stringify(schema);
      expect(registered.map((d) => d.name), label).toEqual(['browser_probe_tool']);
      expect(registered[0].parameters.type, label).toBe('object');
      // 对象根上原有约束**不得**被压平丢掉（与 🟡-K 丢约束的病灶相对照）
      if (schema.properties?.a) {
        expect(registered[0].parameters.properties, label).toEqual({ a: { type: 'string' } });
        expect(registered[0].parameters.required, label).toEqual(['a']);
      }
    }
  });
});
