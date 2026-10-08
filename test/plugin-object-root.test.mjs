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
 * **护栏分四层，前两层为枚举、第三层为归一形状、第四层为白名单（🟡-N 校正过）**：
 * 此处曾写「覆盖整类」，那是**无例支撑的全称断言**——枚举层（`ROOT_ONLY_KEYWORDS`）
 * 只认识 `oneOf` / `enum` / `const` / `items`，`anyOf` / `pattern` / `minProperties`
 * 一字之差就整片放行（测试席 F1–F4 已证，见文件末尾的钉住用例）。现在枚举层只说
 * 它枚举了什么，全称性由**第 4 层的 raw 白名单闸**（`checkRawSchemaSubset`）承担。
 *
 * 枚举层抓的两类（仍然有效、仍是**最短路径**——先给更精确的原因）：
 * - `parameters` 只从 normalized 取 `properties` / `required` / `additionalProperties`，
 *   凡是被压平丢掉的约束（`oneOf` / 根 `enum` / 根 `const` / `items`）或非 `object`
 *   的根 `type`，一律抛。例：`{ type:'object', enum:['x'] }` 是**对象根**、逃得过
 *   只看 `oneOf` 的护栏，但约束照样被丢（宿主 `assertObjectJsonSchema` 对原样输入
 *   直接拒绝）——同类，一并拦。
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
import { checkSupportedSchema, normalizeSchema } from '../src/dsh-schema.ts';

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

describe('🟡-N / F1–F4：枚举漏掉的整片（raw 白名单闸）', () => {
  /**
   * 测试席在 `cf9691d` 的复测里给的反例：同一病灶（「归一后与正常同形 → 护栏放行 →
   * 注册成收任意参数」）还有未覆盖的整片。以下四类当时**全部静默压平 → 注册成功 →
   * 宿主对原样输入拒绝**，而本轮新增的注释/测试同时宣称「覆盖整类」。
   *
   * 处置：加 **raw 白名单闸**（`checkRawSchemaSubset` = `checkSupportedSchema` 的
   * 语义 − 🟡-G 的有意宽松），让「覆盖整类」成真。每条都带：
   * - **抛前零注册**（`registeredCount === 0`）；
   * - **宿主双向断言**（原样输入宿主拒绝 / 合法形态宿主放行）。
   */

  /** F1：根组合子与其它 keyword——`oneOf` 被拦，`anyOf` 一字之差放行。 */
  const F1 = [
    ['anyOf', { anyOf: [{ type: 'string' }, { type: 'number' }] }],
    ['allOf', { allOf: [{ type: 'object', properties: { a: { type: 'string' } } }] }],
    ['not', { not: { type: 'string' } }],
    ['$ref', { $ref: '#/definitions/x' }],
    ['if…then', { if: { type: 'object' }, then: { required: ['a'] } }],
    ['minProperties', { type: 'object', minProperties: 2 }],
    ['patternProperties', { type: 'object', patternProperties: { '^a': { type: 'string' } } }],
    ['propertyNames', { type: 'object', propertyNames: { pattern: '^a' } }],
  ];

  /** F2：嵌套层约束——`properties.a` 上的关键字整片丢失。 */
  const F2 = [
    ['pattern', { type: 'object', properties: { a: { type: 'string', pattern: '^x' } } }],
    ['minLength', { type: 'object', properties: { a: { type: 'string', minLength: 3 } } }],
    ['format', { type: 'object', properties: { a: { type: 'string', format: 'email' } } }],
    ['maximum', { type: 'object', properties: { a: { type: 'number', maximum: 10 } } }],
    ['minItems', { type: 'object', properties: { a: { type: 'array', items: { type: 'string' }, minItems: 1 } } }],
    ['嵌套 anyOf', { type: 'object', properties: { a: { anyOf: [{ type: 'string' }, { type: 'number' }] } } }],
  ];

  /** F3：布尔 `additionalProperties` **单独出现**（无 `type`、无 `properties`）。 */
  const F3 = [
    ['根布尔 ap 单独出现', { additionalProperties: false }],
    ['嵌套非布尔 ap', { type: 'object', properties: { a: { type: 'object', additionalProperties: 'no' } } }],
  ];

  /** F4：`required` 被收敛掉作者声明的名字（**放宽**）。 */
  const F4 = [
    ['required 被过滤', { type: 'object', properties: { a: { type: 'string' } }, required: ['a', 'b'] }],
  ];

  const GROUPS = [
    ['F1 根组合子/其它 keyword', F1],
    ['F2 嵌套层约束', F2],
    ['F3 布尔 ap 单独出现', F3],
    ['F4 required 被过滤', F4],
  ];

  for (const [label, cases] of GROUPS) {
    it(`${label}：一律抛错，且抛前零注册`, () => {
      for (const [name, raw] of cases) {
        registeredCount = 0;
        probeSchema = raw;
        expect(() => mount(), `${label} / ${name} 会被压平 → 必须抛`).toThrow(/压平护栏拦下的根约束/);
        expect(registeredCount, `${label} / ${name}：抛错前不得注册任何工具`).toBe(0);
      }
    });
  }

  it('F1–F4 的反例，宿主 assertObjectJsonSchema 同样拒绝（护栏拦的是真问题）', () => {
    expect(hostAvailable, '差分 oracle 的宿主依赖不可用：本用例必须真跑，不得静默跳过').toBe(true);
    for (const [, cases] of GROUPS) {
      for (const [name, raw] of cases) {
        expect(
          () => assertObjectJsonSchema(raw),
          `宿主应拒绝原样 ${name}: ${JSON.stringify(raw)}`,
        ).toThrow();
      }
    }
  });

  it('反例确实「归一后与正常同形」——证明护栏拦的是压平，不是形状错误', () => {
    // 张力所在：这些输入经 normalizeSchema 后**与合法形态无法区分**，
    // 注册期自检也放行。所以只能在 raw 上看。
    for (const [name, raw] of [...F1, ...F2, ...F3, ...F4]) {
      expect(checkSupportedSchema(normalizeSchema(raw)), `${name}：归一结果必须能通过自检（否则本用例是假的）`).toEqual([]);
    }
  });

  it('不误伤：合法形态照常注册（白名单闸不是「见谁都抛」）', () => {
    for (const raw of [
      { type: 'object', properties: { a: { type: 'string', enum: ['x'] } } },
      { type: 'object', properties: { a: { type: 'string', const: 'x' } } },
      { type: 'object', properties: { a: { oneOf: [{ type: 'string' }, { type: 'number' }] } } },
      { type: 'object', properties: { a: { type: 'array', items: { type: 'string' } } } },
      { type: 'object', properties: { a: { type: 'integer' } } },
      { type: 'object', properties: { a: { type: 'null' } } },
      { type: 'object', properties: { a: { type: 'string', description: 'd', title: 't' } }, required: ['a'] },
      { type: 'object', properties: { a: { type: 'string' } }, additionalProperties: false },
      { type: 'object', properties: {} },
    ]) {
      registeredCount = 0;
      probeSchema = raw;
      expect(mount().map((d) => d.name), JSON.stringify(raw)).toEqual(['browser_probe_tool']);
    }
  });

  it('🟡-G 的有意宽松不被白名单闸误杀：**嵌套** oneOf 兄弟 keyword 仍放行', () => {
    // 白名单闸 = `checkSupportedSchema(raw)` − oneOf 兄弟豁免。若退化成裸调用，
    // 下列全部会抛——那是把 🟡-G 明确接受的宽松换成了响亮失败，不是本闸的目的。
    //
    // **口径必须分清根与嵌套**（本轮实测，别再写全称句）：
    // - **根**上的 `{ oneOf:[…], type:'string' }` 等**本来就被枚举层拦**（`丢掉根
    //   oneOf` + `丢掉根 type(...)`）——那是 🟡-K 的核心病灶（根压平成「收任意
    //   参数」），本护栏**继续拦**，不是误杀。真正受益于 🟡-G 宽松的是**嵌套**位置：
    //   `properties.a` 上的 `oneOf` 兄弟 keyword，根仍是合法对象，不会变宽。
    // - 所以本条只断言**嵌套**位置放行。宿主对**原样**输入仍一律拒绝，这是设计
    //   如此（见 `docs/dsh-compat.md`），不是本用例的反例。
    for (const raw of [
      { type: 'object', properties: { a: { oneOf: [{ type: 'string' }, { type: 'number' }], type: 'string' } } },
      { type: 'object', properties: { a: { oneOf: [{ type: 'string' }, { type: 'number' }], enum: ['x'] } } },
      { type: 'object', properties: { a: { oneOf: [{ type: 'string' }, { type: 'number' }], properties: { x: { type: 'string' } } } } },
      { type: 'object', properties: { a: { oneOf: [{ type: 'string' }, { type: 'number' }], required: ['x'] } } },
      { type: 'object', properties: { a: { oneOf: [{ type: 'string' }, { type: 'number' }], const: 'x' } } },
      { type: 'object', properties: { a: { oneOf: [{ type: 'string' }, { type: 'number' }], items: { type: 'string' } } } },
      { type: 'object', properties: { a: { oneOf: [{ type: 'string' }, { type: 'number' }], additionalProperties: false } } },
    ]) {
      registeredCount = 0;
      probeSchema = raw;
      expect(mount().map((d) => d.name), `🟡-G 有意宽松被误杀：${JSON.stringify(raw)}`).toEqual([
        'browser_probe_tool',
      ]);
    }
  });

  it('根上的 oneOf 兄弟 keyword 照旧拦（🟡-K 的原始病灶，不属于 🟡-G 豁免范围）', () => {
    // 与上一条配对，避免「豁免」被读成「凡 oneOf 兄弟都放行」。
    for (const raw of [
      { oneOf: [{ type: 'string' }, { type: 'number' }], type: 'string' },
      { oneOf: [{ type: 'string' }, { type: 'number' }], enum: ['x'] },
      { oneOf: [{ type: 'string' }, { type: 'number' }], additionalProperties: false },
      { type: 'object', oneOf: [{ type: 'string' }, { type: 'number' }] },
    ]) {
      registeredCount = 0;
      probeSchema = raw;
      expect(() => mount(), `${JSON.stringify(raw)} 会压成「收任意参数」→ 必须抛`).toThrow(
        /压平护栏拦下的根约束/,
      );
      expect(registeredCount, '抛错前不得注册').toBe(0);
    }
  });

  it('豁免不得扩大：oneOf 节点上另有**非兄弟**违规时照旧抛', () => {
    // 若豁免口径写成「只要这个节点有 oneOf 就全豁免」，下面这些会被放走——
    // 它们归一后**丢的不止兄弟 keyword**，正是本闸要拦的。
    for (const raw of [
      { type: 'object', properties: { a: { oneOf: [{ type: 'string' }, { type: 'number' }], anyOf: [{ type: 'string' }] } } },
      { type: 'object', properties: { a: { oneOf: [{ type: 'string' }, { type: 'number' }], pattern: '^x' } } },
      // 分支自身的违规不豁免
      { type: 'object', properties: { a: { oneOf: [{ type: 'object', properties: { x: { type: 'string', pattern: '^x' } } }, { type: 'number' }] } } },
    ]) {
      registeredCount = 0;
      probeSchema = raw;
      expect(() => mount(), `${JSON.stringify(raw)} 归一后丢的不止兄弟 keyword → 必须抛`).toThrow(
        /压平护栏拦下的根约束/,
      );
      expect(registeredCount, '抛错前不得注册').toBe(0);
    }
  });
});
