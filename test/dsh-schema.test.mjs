/**
 * `src/dsh-schema.ts` 与真实宿主的**差分 oracle** 回归。
 *
 * 文档曾写 `validateAgainstSchema` 与宿主 `validateJsonSchemaValue`「同构」，
 * 但实测 16 例里有 5 例判定分歧（含 `const` 判定、`undefined`、非有限数、
 * `-0`、稀疏数组）。本测试以真实宿主为 oracle 逐例比对，把「同构」从宣称
 * 变成可验证事实；分歧会直接红。
 *
 * **依赖缺失不得静默跳过**：本文件此前用 `if (!available) return;`，导入失败时
 * 整例空过（`describe.runIf(true)` 也不拦），本地/未来依赖缺失会给出假绿。
 * 现在改为硬断言——依赖装不上就红，因为「差分 oracle 跑没跑过」本身就是结论。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { checkSupportedSchema, isLosslessJson, normalizeSchema, validateAgainstSchema } from '../src/dsh-schema.ts';

let assertSupportedJsonSchema;
let validateJsonSchemaValue;
let available = false;

beforeAll(async () => {
  try {
    ({ assertSupportedJsonSchema, validateJsonSchemaValue } = await import('@deepseek-ai/dsh-tools'));
    available = typeof validateJsonSchemaValue === 'function';
  } catch {
    available = false;
  }
});

const S = (type) => ({ type });

/** 依赖缺失即失败：oracle 没跑过 = 结论不成立，不能算通过。 */
function requireHost() {
  expect(available, '差分 oracle 的宿主依赖不可用（@deepseek-ai/dsh-tools）：本用例必须真跑，不得静默跳过').toBe(true);
}

/** [名称, schema, 值] —— 覆盖曾出现分歧的判定。 */
const VALUE_CASES = [
  ['const 命中', { type: 'string', const: 'a' }, 'a'],
  ['const 未命中', { type: 'string', const: 'a' }, 'b'],
  ['const 类型错（分歧点：宿主先判 type）', { type: 'string', const: 'a' }, 1],
  ['enum 命中', { type: 'string', enum: ['a', 'b'] }, 'a'],
  ['enum 未命中', { type: 'string', enum: ['a', 'b'] }, 'c'],
  ['undefined 对 string', S('string'), undefined],
  ['undefined 对无 type（lossless 边界）', {}, undefined],
  ['number 非有限', S('number'), Infinity],
  ['number -0（分歧点）', S('number'), -0],
  ['number 字符串（分歧点：宿主报 must be a number）', S('number'), 'x'],
  ['integer 1.5', S('integer'), 1.5],
  ['object ap:false 多键', { type: 'object', properties: { a: S('string') }, additionalProperties: false }, { a: 'x', b: 'y' }],
  ['object 未声明 ap 多键（应宽松）', { type: 'object', properties: { a: S('string') } }, { a: 'x', b: 'y' }],
  ['object required 缺失', { type: 'object', properties: { a: S('string') }, required: ['a'] }, {}],
  ['object 属性值 undefined', { type: 'object', properties: { a: S('string') } }, { a: undefined }],
  ['object 非普通原型', { type: 'object', properties: {} }, Object.create({ z: 1 })],
  ['object Date 实例', { type: 'object', properties: {} }, new Date()],
  ['oneOf 命中一支', { oneOf: [S('string'), S('number')] }, 'a'],
  ['oneOf 全不中', { oneOf: [S('string'), S('number')] }, true],
  ['数组稀疏', { type: 'array', items: S('number') }, [1, , 3]],
  ['数组含 undefined', { type: 'array', items: S('number') }, [1, undefined]],
  ['null 对 string', S('string'), null],
  // 🟡-H：畸形 enum 形状。旧实现用 `Array.isArray(enum) &&` 兜底，畸形输入
  // 直接静默 PASS（方向是 fail-open）；现改为 fail-closed。宿主对 `{enum:{a:1}}`
  // 报 "must be a lossless JSON value"，两者都判「不通过」，故可进差分。
  ['enum 形状畸形（对象）', { type: 'string', enum: { a: 1 } }, 'zzz'],
  ['enum 形状畸形（null）', { type: 'string', enum: null }, 'a'],
  // 空 enum：`[].includes(v)` 恒 false，两边都判违规。早先实现里多写了一个
  // `length === 0 ||` **冗余项**（删掉后全量仍绿），所以这里用 oracle 钉住
  // 行为本身，不再把「空 enum 判违规」当成「本轮修复」——它此前就是违规。
  ['enum 空数组', { type: 'string', enum: [] }, 'a'],
];

/** [名称, schema] —— 覆盖 schema 结构自检的接受/拒绝边界。 */
const SCHEMA_CASES = [
  ['合法对象根', { type: 'object', properties: { a: S('string') }, required: ['a'] }],
  ['required 不在 properties 内', { type: 'object', properties: { a: S('string') }, required: ['b'] }],
  ['additionalProperties 非布尔', { type: 'object', properties: { a: S('string') }, additionalProperties: 'no' }],
  ['const 不在 enum 内', { type: 'string', const: 'a', enum: ['b'] }],
  ['未知 keyword', { type: 'string', type2: 1 }],
  ['单支 oneOf', { oneOf: [S('string')] }],
  ['type 与 oneOf 并存', { oneOf: [S('string'), S('number')], type: 'string' }],
  ['type 数组', { type: ['string', 'number'] }],
  ['空 enum', { type: 'string', enum: [] }],
  ['注解式节点', { description: 'x' }],
  ['数组 items', { type: 'array', items: S('number') }],
  // 非标量取值：本仓库曾用 filter 静默丢弃，宿主则是直接拒绝——差分钉住「一致拒绝」
  ['非标量 const', { type: 'string', const: { a: 1 } }],
  ['非标量 enum 元素', { type: 'string', enum: [{ a: 1 }] }],
  // 🟡-G：`oneOf` 的兄弟 keyword。宿主一律拒绝（位置不受支持），本模块对
  // **原样** schema 也拒绝——两处自检在「原始输入」这一层行为一致。
  ['oneOf 兄弟 enum', { oneOf: [S('string'), S('number')], enum: ['x'] }],
  ['oneOf 兄弟 properties', { oneOf: [S('string'), S('number')], properties: { a: S('string') } }],
  ['oneOf 兄弟 items', { oneOf: [S('string'), S('number')], items: S('string') }],
];

/**
 * **已知分歧（有意更严）**：本模块判定与宿主不同，且**不打算**模仿宿主。
 *
 * 语料筛选口径（写下来，免得「逐例一致」变成构造出来的结论）：
 * `VALUE_CASES` / `SCHEMA_CASES` **只收两边判定一致的例子**，用来钉住同构；
 * 两边不一致的例子一律登记在此，逐条写明「谁更严 / 为什么」。
 * 没有这张表，「以真实宿主为 oracle 逐例回归」就有一半是筛出来的。
 */
const KNOWN_DIVERGENCES = [
  {
    name: 'enum 声明为非数组字符串',
    schema: { type: 'string', enum: 'abc' },
    value: 'a',
    why:
      '宿主把 `enum: "abc"` 退化成 `String.prototype.includes("a")` → 判 PASS（不健全）；' +
      '本模块判 schema 畸形 → 违规。**有意更严**：畸形声明不该被当成合法约束放行。',
  },
];

describe('已知分歧（有意更严）逐条登记', () => {
  it('本模块与宿主的判定分歧与登记表一致（双向断言）', () => {
    requireHost();
    for (const { name, schema, value, why } of KNOWN_DIVERGENCES) {
      const mineRejects = validateAgainstSchema(schema, value).length > 0;
      const hostRejects = validateJsonSchemaValue(schema, value).length > 0;
      expect(mineRejects, `${name}：本模块应有意更严（判违规）——${why}`).toBe(true);
      expect(hostRejects, `${name}：登记为分歧，宿主此时应放行；若宿主改了行为请更新本表——${why}`).toBe(false);
    }
  });
});

describe('dsh-schema 与真实宿主差分', () => {
  it('值判定与 validateJsonSchemaValue 逐例一致', () => {
    requireHost();
    const mismatches = [];
    for (const [name, schema, value] of VALUE_CASES) {
      const mine = validateAgainstSchema(schema, value);
      const host = validateJsonSchemaValue(schema, value);
      if ((mine.length === 0) !== (host.length === 0)) {
        mismatches.push(`${name}\n    本仓库: ${JSON.stringify(mine)}\n    宿主  : ${JSON.stringify(host)}`);
      }
    }
    expect(mismatches, `判定分歧：\n${mismatches.join('\n')}`).toEqual([]);
  });

  it('schema 结构判定与 assertSupportedJsonSchema 逐例一致', () => {
    requireHost();
    const mismatches = [];
    for (const [name, schema] of SCHEMA_CASES) {
      let hostRejects = false;
      try {
        assertSupportedJsonSchema(schema);
      } catch {
        hostRejects = true;
      }
      const mineRejects = checkSupportedSchema(schema).length > 0;
      if (hostRejects !== mineRejects) {
        mismatches.push(`${name}: 本仓库 ${mineRejects ? '拒绝' : '接受'} / 宿主 ${hostRejects ? '拒绝' : '接受'}`);
      }
    }
    expect(mismatches, `结构判定分歧：\n${mismatches.join('\n')}`).toEqual([]);
  });

  it('isLosslessJson 与宿主边界一致（undefined / 非有限数 / -0 / 稀疏 / 非普通原型）', () => {
    requireHost();
    const cases = [undefined, Infinity, NaN, -0, [1, , 3], { a: undefined }, new Date(), Object.create({ z: 1 }), 'ok', 0, null, [1, 2]];
    for (const value of cases) {
      // 用注解式节点（无 type）让宿主只跑 lossless 边界判定
      const host = validateJsonSchemaValue({}, value);
      expect(isLosslessJson(value), `isLosslessJson(${String(value)})`).toBe(host.length === 0);
    }
  });
});

describe('normalizeSchema 的边界如实（不宣称「压平后必通过」）', () => {
  // 文档曾写「压平为受支持子集」，但类型不匹配的 const/enum 会被原样保留，
  // 而 checkSupportedSchema 会拒绝。行为上不冲突（宿主同样拒绝），但「压平」
  // 名不副实。这里把真实边界钉住：保留 → 注册期拒绝，两条断言一起才有意义。
  it('类型不匹配的 const / enum 原样保留（不静默放宽约束）', () => {
    const normalizedConst = normalizeSchema({ type: 'string', const: null });
    expect(normalizedConst.const, '丢弃 const 会把「必须是 null」静默放宽为「任意值」').toBe(null);
    const normalizedEnum = normalizeSchema({ type: 'string', enum: [1] });
    expect(normalizedEnum.enum).toEqual([1]);
  });

  it('非标量取值同样原样保留（曾走 filter 丢弃分支 = 静默放宽）', () => {
    // 旧实现：标量不匹配 → 保留；对象/数组取值 → filter 丢掉 → PASS。
    // 同一份 docstring 只对前者成立，属「文档超前于实现」。
    expect(normalizeSchema({ type: 'string', const: { a: 1 } }).const, '丢弃 const 会把「必须是 {a:1}」静默放宽').toEqual({
      a: 1,
    });
    expect(normalizeSchema({ type: 'string', enum: [{ a: 1 }] }).enum).toEqual([{ a: 1 }]);
  });

  it('同一份 schema 由注册期自检拒绝（最终闸门在 checkSupportedSchema）', () => {
    const violations = [
      ...checkSupportedSchema(normalizeSchema({ type: 'string', const: null })),
      ...checkSupportedSchema(normalizeSchema({ type: 'string', enum: [1] })),
      ...checkSupportedSchema(normalizeSchema({ type: 'string', const: { a: 1 } })),
      ...checkSupportedSchema(normalizeSchema({ type: 'string', enum: [{ a: 1 }] })),
    ];
    expect(violations.some((v) => v.includes('const'))).toBe(true);
    expect(violations.some((v) => v.includes('enum'))).toBe(true);
  });
});

describe('normalizeSchema 对 oneOf 兄弟 keyword 的丢弃（有意的宽松归一）', () => {
  // 🟡-G：docstring 曾写「无论位置是否受支持」，而 `oneOf` 节点的兄弟 keyword
  // 恰恰被丢弃——取值维度的承诺为真，位置维度为假。这里把真实行为钉住：
  // 丢弃 → 本模块自检 PASS，但**原样** schema 被本模块与宿主一致拒绝。
  // 没有这组用例，那句「无论位置」就又是无例支撑的全称句式。
  const S = (type) => ({ type });

  // 7 个兄弟 keyword **全列**（含 `type` / `const`）。此前专属用例的 body 只放了
  // `enum`，`const` / `type` 无例支撑——变异「在 `branches.length >= 2` 里加回
  // `if (raw.const !== undefined) out.const = raw.const;`」全绿（`type` 同）。
  // 改成循环后，这两个变异立刻红。
  const SIBLINGS = {
    type: 'string',
    enum: ['x'],
    const: 'x',
    properties: { a: S('string') },
    required: ['a'],
    items: S('string'),
    additionalProperties: false,
  };

  it('7 个兄弟 keyword 一律被整体丢弃（取值约束在该位置不再生效）', () => {
    for (const [key, value] of Object.entries(SIBLINGS)) {
      const raw = { oneOf: [S('string'), S('number')], [key]: value };
      expect(normalizeSchema(raw), key).toEqual({ oneOf: [S('string'), S('number')] });
      // 丢弃是「宽松归一」，不是「静默放宽后还宣称受支持」：原样输入仍被拒
      expect(checkSupportedSchema(raw).length, `${key}: 原样 schema 必须被拒（位置不受支持）`).toBeGreaterThan(0);
    }
  });

  it('与宿主在「原样输入」这一层判定一致（丢弃只发生在归一之后）', () => {
    requireHost();
    for (const [key, value] of Object.entries(SIBLINGS)) {
      const raw = { oneOf: [S('string'), S('number')], [key]: value };
      let hostRejects = false;
      try {
        assertSupportedJsonSchema(raw);
      } catch {
        hostRejects = true;
      }
      expect(hostRejects, `宿主应拒绝原样 ${JSON.stringify(raw)}`).toBe(true);
      expect(checkSupportedSchema(raw).length > 0, `本模块也应拒绝原样 ${JSON.stringify(raw)}`).toBe(true);
    }
  });
});

describe('validateAgainstSchema 对畸形 schema 的形状兜底（fail-closed，不是 fail-open）', () => {
  // 🟡-H：旧实现 `Array.isArray(schema.enum) &&` 把「抛 TypeError」改成了
  // 「静默 PASS」——方向与 🟡-A/🟡-D 相反。生产路径不可达（注册期先拒），
  // 但死路径上也该 fail-closed。
  it('畸形 enum 形状返回违规，而不是静默通过', () => {
    expect(validateAgainstSchema({ type: 'string', enum: { a: 1 } }, 'zzz')).not.toEqual([]);
    expect(validateAgainstSchema({ type: 'string', enum: null }, 'a')).not.toEqual([]);
  });

  it('正常 enum 行为不变（鉴别力：不是把所有 enum 都判违规）', () => {
    expect(validateAgainstSchema({ type: 'string', enum: ['a', 'b'] }, 'a')).toEqual([]);
    expect(validateAgainstSchema({ type: 'string', enum: ['a', 'b'] }, 'c')).not.toEqual([]);
  });
});

describe('normalizeSchema 不擅自加严', () => {
  it('未声明 additionalProperties 时不得写入该 keyword（曾无条件写成 false）', () => {
    const normalized = normalizeSchema({ type: 'object', properties: { a: { type: 'string' } } });
    expect(Object.hasOwn(normalized, 'additionalProperties'), '未声明却被写成布尔位 = 静默加严').toBe(false);
  });

  it('显式声明时原样保留', () => {
    expect(normalizeSchema({ type: 'object', properties: {}, additionalProperties: false }).additionalProperties).toBe(false);
    expect(normalizeSchema({ type: 'object', properties: {}, additionalProperties: true }).additionalProperties).toBe(true);
  });

  it('规范化结果通过宿主结构校验', () => {
    requireHost();
    for (const raw of [
      { type: 'object', properties: { a: { type: 'string' } } },
      { type: 'object', properties: { a: { type: 'array', items: { type: 'number' } } }, required: ['a', 'ghost'] },
      { type: 'object', properties: { a: { type: 'string', enum: ['x'] } } },
    ]) {
      const normalized = normalizeSchema(raw);
      expect(checkSupportedSchema(normalized), JSON.stringify(normalized)).toEqual([]);
      expect(() => assertSupportedJsonSchema(normalized)).not.toThrow();
    }
  });
});
