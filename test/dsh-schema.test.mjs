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
];

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

  it('同一份 schema 由注册期自检拒绝（最终闸门在 checkSupportedSchema）', () => {
    const violations = [
      ...checkSupportedSchema(normalizeSchema({ type: 'string', const: null })),
      ...checkSupportedSchema(normalizeSchema({ type: 'string', enum: [1] })),
    ];
    expect(violations.some((v) => v.includes('const'))).toBe(true);
    expect(violations.some((v) => v.includes('enum'))).toBe(true);
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
