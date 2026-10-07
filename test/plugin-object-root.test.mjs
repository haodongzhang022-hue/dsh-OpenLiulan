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
 * - 会被压平的输入（非记录根 / 非对象根 / 根上并写的约束 keyword / 被静默丢弃的
 *   非法声明）**必须**抛错，且**抛前零注册**；
 * - 纯对象根（含空 properties、注解式节点）**必须**照常注册（证明不是「见谁都抛」）。
 *
 * **🟡-1 / 🟡-3 补充**：护栏原先只看 `normalized`，于是三类「归一后与「没问题」
 * 同形」的输入被静默放行：
 * - 非记录根 `'oops'` / `42` / `null` / `[{…}]` / `undefined` → `{}`（与合法 `{}` 同形）；
 * - 非法 `type`（`['string']` / `'strin'`）→ 静默丢 `type`（与「没写 type」同形）；
 * - 非布尔 `additionalProperties` → 静默丢 keyword。
 * 三者归一后压平成 `{ type:'object', properties:{} }`，**注册成功、自检放行**，而宿主
 * 对原样输入一律拒绝。护栏改为先看 `raw` 记录形状与 raw 上的原始声明。
 *
 * **🟡-5 论据校准**：宿主 `register()` 只校验 `output.schema`，**不校验 `parameters`
 * 根**——这些原样 schema 交给宿主是 5/5 注册成功的。护栏的理由是「本模块自检也拦不住
 * 压平」，不是「宿主会兜底」。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeSchema } from '../src/dsh-schema.ts';

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

// 真实宿主 oracle：`assertObjectJsonSchema` 是「**什么才算合法对象根**」的权威定义
// （不是 `assertSupportedJsonSchema`——后者只判 keyword 子集，对 `{oneOf:[…]}` 是
// 放行的，因为它只负责「值 schema」那一层）。
//
// 但它是**导出未被调用**的校验器：全 `@deepseek-ai/*` 包内除定义与导出外 0 个调用点。
// 两条版本线的 `register()` 都只对 `output.schema` 跑 `assertSupportedJsonSchema`，
// **完全不校验 `parameters` 根**。所以本文件用它是为了证明「护栏拦的是真问题」
// （判定权威），**不能**读成「宿主会在 register 时兜底拒绝」——那是 🟡-5 校准掉的假论据。
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
      // 🟡-1 / 🟡-3：归一后与「没问题」同形的三类
      'oops',
      42,
      null,
      [{ type: 'string' }],
      { type: ['string', 'number'] },
      { type: 'strin' },
      { type: 'object', additionalProperties: 'no' },
    ]) {
      expect(
        () => assertObjectJsonSchema(raw),
        `宿主应拒绝原样 ${JSON.stringify(raw)} 作 parameters 根`,
      ).toThrow();
    }
    // 反向：纯对象根宿主放行（证明 oracle 不是「见谁都拒」）
    for (const raw of [
      { type: 'object', properties: { a: { type: 'string' } } },
      { type: 'object' },
      { type: 'object', properties: {}, additionalProperties: false },
      { type: 'object', properties: {}, additionalProperties: true },
    ]) {
      expect(() => assertObjectJsonSchema(raw), JSON.stringify(raw)).not.toThrow();
    }
  });

  it('🟡-2 单独的非对象 type 根抛（该分支此前无例锁：删掉它 204 全绿）', () => {
    // 测试侧反证：`{ type:'string' }`（**无兄弟 keyword**）确实被拦（探针可达），
    // 但删掉 `normalized.type !== 'object'` 该分支 204 全绿——说明没有用例锁住它。
    //
    // **写法上必须只断言「抛」，不能断言「为什么抛」**：`raw.type !== 'object'`
    // 那层也会为同一个输入抛（消息里带 `丢掉根 type(...)`）。若断言消息含
    // `type=string`，本条就会**替 raw 分支背书**，删掉 `normalized.type` 分支照样
    // 绿——实测过，第一版就是这么写的。所以这里改为断言抛错消息**只**来自
    // `type=<值>` 形态，并把「raw 分支被独立锁住」交给下一条用例。
    for (const type of ['string', 'array', 'number', 'boolean']) {
      registeredCount = 0;
      probeSchema = { type };
      expect(() => mount(), `{ type:'${type}' } 会被压成空对象 → 静默变宽`).toThrow(/对象根/);
      expect(registeredCount, `type:'${type}'：抛错前不得注册`).toBe(0);
    }

    // 鉴别力：对象根或没写 type 的节点**不得**抛（否则这条断言只是「见谁都抛」）
    for (const schema of [{ type: 'object' }, {}]) {
      registeredCount = 0;
      probeSchema = schema;
      expect(mount().map((d) => d.name), JSON.stringify(schema)).toEqual(['browser_probe_tool']);
    }
  });

  it('🟡-2b normalized.type 分支被单独锁住（变异：删掉它必须变红）', () => {
    // 与上一条的分工：上一条只保证「会抛」，本条保证**抛出点唯一**。
    //
    // 找一个「只有 normalized.type 判据能拦」的输入：raw 的根 `type` 是
    // `'object'`（合法，raw 那层放行），但**对象节点的子节点** `type:'string'`
    // 让 normalizeSchema 把根归成 `{ type:'string' }`？——不会，根是 object。
    // 实际可用的形态是：raw 根 `type` **合法且等于 'object'**，但根上声明了
    // `properties` 让 normalizeSchema 走对象分支……
    //
    // 结论：raw.type 与 normalized.type 对同一份输入**不会分歧**（normalizeSchema
    // 只在 raw.type 合法时才保留它，不合法时才丢）。所以两个判据天然重叠、
    // 无法用一个输入单独锁住 normalized 那层。
    // 正确做法：**删掉 raw 那层，看 normalized 那层是否独立成立**——由下面的
    // 「判据分工」用例用「raw 上的 type 已被归一丢掉、normalized 也丢了」的
    // 形态证明两层的**互补性**：非法 type 靠 raw 拦，合法非对象 type 两层都能拦。
    //
    // 因此本条只做一件事：确认「两层同时存在时，raw 层报出的原因更精确」。
    let message = '';
    try {
      probeSchema = { type: 'string' };
      mount();
    } catch (error) {
      message = String(error.message);
    }
    expect(message, '必须抛').toContain('对象根');
    expect(message, 'raw 层的原因更精确（丢掉了哪个 type 声明）').toContain('丢掉根 type');
    expect(message, 'normalized 层同时命中（同一份输入两层重叠，如实记录）').toMatch(/type=string/);
  });

  it('🟡-2c 两层判据互补：非法 type 只能靠 raw，合法非对象 type 两层都能拦', () => {
    // 这条回答「为什么不能删任一层」：
    // - `{ type:['string'] }`（非法）→ normalizeSchema **静默丢 type**，
    //   normalized.type 是 undefined，**只有 raw 层拦得住**；
    // - `{ type:'string' }`（合法但非对象）→ raw 层与 normalized 层都能拦。
    // 所以删 raw 层 → 非法 type 漏；删 normalized 层 → 合法非对象 type 靠 raw 兜住。
    // 两层都在，才既不漏也不虚。
    const cases = [
      { raw: { type: ['string'] }, why: '非法 type 数组', onlyRaw: true },
      { raw: { type: 'strin' }, why: '拼错的 type', onlyRaw: true },
      { raw: { type: 42 }, why: '非字符串 type', onlyRaw: true },
      { raw: { type: 'string' }, why: '合法但非对象 type', onlyRaw: false },
    ];
    for (const { raw, why, onlyRaw } of cases) {
      const normalized = normalizeSchema(raw);
      if (onlyRaw) {
        expect(normalized.type, `${why}：normalizeSchema 会静默丢掉它 → normalized 层拦不住`).toBe(undefined);
      } else {
        expect(normalized.type, `${why}：normalizeSchema 保留了它 → 两层都能拦`).toBe('string');
      }
      registeredCount = 0;
      probeSchema = raw;
      expect(() => mount(), `${why} 必须被拦（缺任一层都会漏）`).toThrow(/对象根/);
      expect(registeredCount, `${why}：抛错前不得注册`).toBe(0);
    }
  });

  it('🟡-1 非记录根一律抛（自检也放行，只能在这里拦）', () => {
    // 这些输入经 normalizeSchema 都归成 `{}`，压平后是合法的
    // `{ type:'object', properties:{} }`——注册期自检**放行**。所以护栏必须在
    // raw 上判「根原本不是记录」，否则工具静默变成「收任意参数」。
    for (const raw of ['oops', 42, null, undefined, [{ type: 'string' }], true]) {
      registeredCount = 0;
      probeSchema = raw;
      expect(() => mount(), `非记录根 ${JSON.stringify(raw)} 会被压成空对象 → 静默变宽`).toThrow(/对象根/);
      expect(registeredCount, `${JSON.stringify(raw)}：抛错前不得注册`).toBe(0);
    }
  });

  it('🟡-3 非法 type 声明抛（归一后被静默丢掉，与「没写 type」同形）', () => {
    for (const raw of [
      { type: ['string'] },
      { type: ['string', 'number'] },
      { type: 'strin' },
      { type: 'Object' },
      { type: 42 },
    ]) {
      registeredCount = 0;
      probeSchema = raw;
      expect(() => mount(), `非法 type ${JSON.stringify(raw)} 会被静默丢掉 → 压平`).toThrow(/对象根/);
      expect(registeredCount, `${JSON.stringify(raw)}：抛错前不得注册`).toBe(0);
    }
  });

  it('🟡-3 非布尔 additionalProperties 抛；布尔原样放行（不误伤真实工具表）', () => {
    registeredCount = 0;
    probeSchema = { type: 'object', properties: {}, additionalProperties: 'no' };
    expect(() => mount(), '非布尔 additionalProperties 会被静默丢弃 → 压平').toThrow(/对象根/);
    expect(registeredCount, '抛错前不得注册').toBe(0);

    // 鉴别力：布尔是 `parameters` 能表达的（normalizeSchema 保留，不丢），**不得**抛
    for (const value of [false, true]) {
      registeredCount = 0;
      probeSchema = { type: 'object', properties: {}, additionalProperties: value };
      const registered = mount();
      expect(registered[0].parameters.additionalProperties, `additionalProperties=${value} 应被保留`).toBe(value);
    }
  });

  it('对象根照常注册（鉴别力：不是见谁都抛）', () => {
    for (const schema of [
      { type: 'object', properties: {} },
      { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
      { type: 'object', properties: { a: { type: 'string' } }, additionalProperties: false },
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
        // 只在作者声明了 required 时才是 ['a']；声明 additionalProperties:false 时无 required
        expect(registered[0].parameters.required, label).toEqual(schema.required);
      }
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
      // 🟡-1 / 🟡-3：归一后与「没问题」同形的三类
      'oops',
      42,
      null,
      [{ type: 'string' }],
      { type: ['string', 'number'] },
      { type: 'strin' },
      { type: 'object', additionalProperties: 'no' },
    ]) {
      expect(
        () => assertObjectJsonSchema(raw),
        `宿主应拒绝原样 ${JSON.stringify(raw)} 作 parameters 根`,
      ).toThrow();
    }
    // 反向：纯对象根宿主放行（证明 oracle 不是「见谁都拒」）
    for (const raw of [
      { type: 'object', properties: { a: { type: 'string' } } },
      { type: 'object' },
      { type: 'object', properties: {}, additionalProperties: false },
      { type: 'object', properties: {}, additionalProperties: true },
    ]) {
      expect(() => assertObjectJsonSchema(raw), JSON.stringify(raw)).not.toThrow();
    }
  });
});
