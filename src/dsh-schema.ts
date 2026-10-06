/**
 * DSH 工具 JSON Schema 规范化与校验（新旧版本通用）。
 *
 * DSH 对工具 schema 的强制校验只接受 **受支持的 JSON Schema 子集**：
 * 单个 `type`、对象 `properties` / `required` / 布尔 `additionalProperties`、
 * 数组 `items`、标量 `enum` / `const`、以及至少两支的 `oneOf`。
 * **不支持或位置错放的 keyword 会直接拒绝**（`assertSupportedJsonSchema`
 * 抛 `JsonSchemaError`），而不是被静默忽略。
 *
 * 新版 DSH（dsh-tools 0.1.6 线）在 `ToolRuntime.register()` 里对
 * `output.schema` 执行该校验，并在每次返回后按 `output.schema`
 * 校验 canonical value。
 *
 * 本模块承担三件事：
 * 1. **规范化**（{@link normalizeSchema}）：对 MCP 侧宽松的 `inputSchema` 做
 *    **keyword 白名单收敛**——丢弃未知 keyword、把 `required` 收敛到
 *    `properties` 之内、强制对象根。它**不做类型一致性修正**：作者写的
 *    `{ type: 'string', const: null }` 会被原样保留，因为丢弃它等于静默放宽
 *    约束（从「必须是 null」变成「任意值」）。这类 schema 由
 *    {@link checkSupportedSchema} 在注册期拒绝，宿主
 *    `assertSupportedJsonSchema` 同样拒绝——行为一致，早失败优于调用即炸。
 *    **不擅自加严**：作者没声明 `additionalProperties` 时保持
 *    「未声明 = 宽松」，与 MCP 侧声明一致。
 * 2. **结构自检**（{@link checkSupportedSchema}）：注册前对 schema 本身
 *    做一次受支持子集校验（对齐宿主 `assertSupportedJsonSchema` 的判定），
 *    违规项写入加载画像并让插件**加载失败**，避免「装上了但调用即炸」。
 * 3. **值自检**（{@link validateAgainstSchema}）：按 schema 校验一个值。
 *    判定语义与宿主 `validateJsonSchemaValue` **对齐**（含 lossless JSON
 *    边界：拒绝 `undefined` / 非有限数 / `-0` / 稀疏数组 / 非普通原型），
 *    由 `test/dsh-schema.test.mjs` 以真实宿主为 oracle 做差分回归。
 *    诊断文案不追求与宿主逐字一致。
 *
 * @module @openliulan/dsh-openliulan/dsh-schema
 */

/** 受支持的 JSON Schema 子集节点。 */
export interface SupportedSchemaNode {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  oneOf?: SupportedSchemaNode[];
  properties?: Record<string, SupportedSchemaNode>;
  required?: string[];
  additionalProperties?: boolean;
  items?: SupportedSchemaNode;
  enum?: (string | number | boolean | null)[];
  const?: string | number | boolean | null;
  description?: string;
  title?: string;
}

const SCHEMA_TYPES = new Set(["object", "array", "string", "number", "integer", "boolean", "null"]);
const SCALAR_TYPES = new Set(["string", "number", "integer", "boolean", "null"]);
const CONSTRAINT_KEYWORDS = new Set([
  "type",
  "oneOf",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "enum",
  "const",
]);
const ANNOTATION_KEYWORDS = new Set(["description", "title", "default", "examples"]);
/** 与 `oneOf` 互斥的兄弟 keyword（宿主 `ONE_OF_SIBLING_KEYWORDS`）。 */
const ONE_OF_SIBLING_KEYWORDS = ["properties", "required", "additionalProperties", "items", "enum", "const"];

/** 判断是否为可下钻的普通对象（排除数组与 null）。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 是否为普通记录（判定语义对齐宿主 `isPlainJsonRecord`）：
 * 原型为 `null` 或 `Object.prototype`，排除类实例 / `Date` / `Map` 等。
 */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

/** 标量是否与声明的 type 匹配（宿主 `scalarMatches`）。 */
function scalarMatches(type: string, value: unknown): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0);
    case "integer":
      return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0) && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      return false;
  }
}

/**
 * 是否为 lossless JSON 值（判定语义对齐宿主的 `isJsonValue`）。
 *
 * 拒绝：`undefined` / 函数 / symbol / bigint / 非有限数 / `-0` / 稀疏数组 /
 * 非普通原型对象 / 循环引用。宿主在值校验的 object / array / 无 type 节点
 * 上都会做这道检查，本模块必须一致，否则自检会比宿主宽松而漏报。
 */
export function isLosslessJson(value: unknown): boolean {
  const ancestors = new Set<object>();
  const walk = (current: unknown): boolean => {
    if (current === null) return true;
    const kind = typeof current;
    if (kind === "string" || kind === "boolean") return true;
    if (kind === "number") return Number.isFinite(current as number) && !Object.is(current, -0);
    if (kind !== "object") return false;
    const node = current as object;
    if (ancestors.has(node)) return false;
    ancestors.add(node);
    try {
      const prototype = Object.getPrototypeOf(node);
      if (Array.isArray(node)) {
        if (prototype !== Array.prototype) return false;
        if (Reflect.ownKeys(node).length !== node.length + 1) return false;
        for (let index = 0; index < node.length; index++) {
          if (!Object.hasOwn(node, index) || !walk((node as unknown[])[index])) return false;
        }
        return true;
      }
      if (prototype !== Object.prototype && prototype !== null) return false;
      for (const key of Reflect.ownKeys(node)) {
        if (typeof key !== "string" || !Object.prototype.propertyIsEnumerable.call(node, key)) return false;
        if (!walk((node as Record<string, unknown>)[key])) return false;
      }
      return true;
    } finally {
      ancestors.delete(node);
    }
  };
  return walk(value);
}

/**
 * 把任意宽松 schema 收敛到受支持子集的 keyword 白名单。
 *
 * **边界（曾文档失实）**：本函数只做 keyword 白名单收敛，**不做类型一致性
 * 修正**。类型不匹配的 `const` / `enum`（如 `{ type: 'string', const: null }`）
 * 会原样保留，随后被 {@link checkSupportedSchema} 拒绝——这是有意的：丢弃
 * 约束会让「必须是 null」静默变成「任意值」，比直接报错更危险。因此本函数
 * 的返回值**不保证**通过 `checkSupportedSchema`；注册期自检才是最终闸门。
 *
 * 规则：
 * - 只保留白名单 keyword；`oneOf` 与 `type` 互斥（保留 `oneOf`）。
 * - 对象节点若声明了 `properties`，则把 `required` 收敛为
 *   「既在 properties 里、又在原 required 里」的名字——DSH 要求
 *   `required` 的每一项都必须出现在 `properties` 中。
 * - `additionalProperties` **只在作者显式声明布尔值时保留**；未声明则
 *   不写该 keyword，保持「未声明 = 宽松」的原始语义。此前实现无条件写成
 *   `false`，等于把宽松的 MCP `inputSchema` 静默加严为「拒绝额外参数」，
 *   与声明不一致，已修正。
 * - 数组 `items` 缺省视为任意 JSON。
 *
 * @param raw - MCP 侧原始 schema（宽松结构）。
 * @returns 受支持的 schema 节点；无法识别时返回 `{}`（任意 JSON）。
 */
export function normalizeSchema(raw: unknown): SupportedSchemaNode {
  if (!isRecord(raw)) return {};

  const out: SupportedSchemaNode = {};

  if (typeof raw.description === "string") out.description = raw.description;
  if (typeof raw.title === "string") out.title = raw.title;

  // oneOf 优先：与 type 互斥。
  if (Array.isArray(raw.oneOf) && raw.oneOf.length > 0) {
    const branches = raw.oneOf.map((branch) => normalizeSchema(branch));
    if (branches.length >= 2) {
      out.oneOf = branches;
      return out;
    }
    // 单支 oneOf 非法：退化为该支本身。
    return branches[0] ?? {};
  }

  const declaredType = typeof raw.type === "string" ? raw.type : undefined;

  if (declaredType !== undefined && SCHEMA_TYPES.has(declaredType)) {
    out.type = declaredType as SupportedSchemaNode["type"];
  }

  // 标量 enum / const：仅在声明了标量 type 时保留（数组/对象上的 enum 直接
  // 丢弃）；保留时**不校验元素/取值与 type 是否匹配**，不匹配的留给注册期自检拒绝。
  const isScalar = out.type !== undefined && SCALAR_TYPES.has(out.type);
  if (isScalar) {
    if (Array.isArray(raw.enum) && raw.enum.length > 0) {
      out.enum = raw.enum.filter(
        (v): v is string | number | boolean | null =>
          v === null || ["string", "number", "boolean"].includes(typeof v),
      );
      if (out.enum.length === 0) delete out.enum;
    }
    if (raw.const !== undefined && (raw.const === null || ["string", "number", "boolean"].includes(typeof raw.const))) {
      out.const = raw.const as string | number | boolean | null;
    }
  }

  // 数组 items。
  if (out.type === "array" && raw.items !== undefined) {
    out.items = normalizeSchema(raw.items);
  }

  // 对象 properties / required / additionalProperties。
  const looksObject = out.type === "object" || isRecord(raw.properties);
  if (looksObject) {
    out.type = "object";
    const props: Record<string, SupportedSchemaNode> = {};
    if (isRecord(raw.properties)) {
      for (const [key, value] of Object.entries(raw.properties)) {
        props[key] = normalizeSchema(value);
      }
    }
    if (Object.keys(props).length > 0) out.properties = props;

    // required 必须全部落在 properties 之内，否则 DSH 拒绝该 schema。
    const names = Array.isArray(raw.required)
      ? raw.required.filter((n): n is string => typeof n === "string" && Object.hasOwn(props, n))
      : [];
    if (names.length > 0) out.required = names;

    // 只在作者显式声明布尔值时保留，不擅自加严为 false。
    if (typeof raw.additionalProperties === "boolean") out.additionalProperties = raw.additionalProperties;
  }

  return out;
}

/**
 * 校验一个 schema 是否落在受支持子集内（对齐宿主 `assertSupportedJsonSchema`）。
 *
 * 这是**注册期自检**的正确输入：schema 本身是静态数据，可在此判定；而
 * canonical value 只能在运行时有值，故不在此处假装校验常量。
 *
 * @param schema - 待校验的原始 schema。
 * @param path - 诊断路径前缀。
 * @returns 违规描述列表；空数组代表通过。
 */
export function checkSupportedSchema(schema: unknown, path = "schema"): string[] {
  const violations: string[] = [];
  const seen = new Set<unknown>();
  const walk = (node: unknown, at: string): void => {
    if (!isRecord(node)) {
      violations.push(`${at} must be a schema object`);
      return;
    }
    if (seen.has(node)) {
      violations.push(`${at} is circular`);
      return;
    }
    seen.add(node);
    try {
      for (const key of Object.keys(node)) {
        if (CONSTRAINT_KEYWORDS.has(key)) continue;
        if (ANNOTATION_KEYWORDS.has(key)) {
          if (!isLosslessJson(node[key])) violations.push(`${at}.${key} annotation must be lossless JSON data`);
          continue;
        }
        violations.push(
          `${at}.${key} is not a supported keyword (subset: type/oneOf/properties/required/additionalProperties/items/enum/const + annotations)`,
        );
      }
      if (Object.hasOwn(node, "description") && typeof node.description !== "string") {
        violations.push(`${at}.description must be a string`);
      }
      if (Object.hasOwn(node, "title") && typeof node.title !== "string") {
        violations.push(`${at}.title must be a string`);
      }

      const hasType = Object.hasOwn(node, "type");
      const hasOneOf = Object.hasOwn(node, "oneOf");
      if (hasType && hasOneOf) {
        violations.push(`${at} cannot declare both type and oneOf`);
        return;
      }
      if (!hasType && !hasOneOf) {
        for (const key of ONE_OF_SIBLING_KEYWORDS) {
          if (Object.hasOwn(node, key)) violations.push(`${at}.${key} requires type or oneOf`);
        }
        return;
      }

      if (hasOneOf) {
        for (const key of ONE_OF_SIBLING_KEYWORDS) {
          if (Object.hasOwn(node, key)) violations.push(`${at}.${key} is not supported beside oneOf`);
        }
        const oneOf = node.oneOf;
        if (!Array.isArray(oneOf) || oneOf.length < 2) {
          violations.push(`${at}.oneOf must be an array of at least two schemas`);
          return;
        }
        oneOf.forEach((branch, index) => walk(branch, `${at}.oneOf[${index}]`));
        return;
      }

      const type = node.type;
      if (typeof type !== "string" || !SCHEMA_TYPES.has(type)) {
        violations.push(
          Array.isArray(type)
            ? `${at}.type must be a single type string (type arrays are not supported)`
            : `${at}.type must be one of ${[...SCHEMA_TYPES].join("/")}`,
        );
        return;
      }

      const allowedFor: Record<string, string[]> = {
        properties: ["object"],
        required: ["object"],
        additionalProperties: ["object"],
        items: ["array"],
        enum: ["string", "number", "integer", "boolean", "null"],
        const: ["string", "number", "integer", "boolean", "null"],
      };
      for (const [key, types] of Object.entries(allowedFor)) {
        if (Object.hasOwn(node, key) && !types.includes(type)) {
          violations.push(`${at}.${key} is not supported on type "${type}"`);
        }
      }

      switch (type) {
        case "object": {
          if (Object.hasOwn(node, "properties")) {
            if (!isRecord(node.properties)) {
              violations.push(`${at}.properties must be an object of schemas`);
            } else {
              for (const [key, child] of Object.entries(node.properties)) {
                walk(child, `${at}.properties.${key}`);
              }
            }
          }
          if (Object.hasOwn(node, "required")) {
            const required = node.required;
            if (!Array.isArray(required) || required.some((entry) => typeof entry !== "string")) {
              violations.push(`${at}.required must be an array of strings`);
            } else {
              const declared = isRecord(node.properties) ? node.properties : {};
              for (const key of required) {
                if (!Object.hasOwn(declared, key)) violations.push(`${at}.required names "${key}" which is not in properties`);
              }
            }
          }
          if (Object.hasOwn(node, "additionalProperties") && typeof node.additionalProperties !== "boolean") {
            violations.push(`${at}.additionalProperties must be a boolean`);
          }
          return;
        }
        case "array": {
          if (Object.hasOwn(node, "items")) walk(node.items, `${at}.items`);
          return;
        }
        default: {
          if (Object.hasOwn(node, "enum")) {
            const allowed = node.enum;
            const valid =
              Array.isArray(allowed) && allowed.length > 0 && allowed.every((entry) => scalarMatches(type, entry));
            if (!valid) violations.push(`${at}.enum must be a non-empty array of ${type} values`);
          }
          if (Object.hasOwn(node, "const")) {
            const declared = node.const;
            if (!scalarMatches(type, declared)) {
              violations.push(`${at}.const must be a ${type} value`);
            } else if (Array.isArray(node.enum) && node.enum.length > 0 && !node.enum.includes(declared)) {
              violations.push(`${at}.const must be one of ${at}.enum when both are declared`);
            }
          }
          return;
        }
      }
    } finally {
      seen.delete(node);
    }
  };
  walk(schema, path);
  return violations;
}

/**
 * 校验一个值是否满足 {@link SupportedSchemaNode} 的判定语义。
 *
 * 判定与 DSH 的 `validateJsonSchemaValue` 对齐（只覆盖受支持子集），
 * 用于输出值回归断言，不依赖 DSH 内部实现；**诊断文案不保证逐字一致**。
 * 对齐点：`type` 判定先于 `enum` / `const`；`undefined`、非有限数、`-0`、
 * 稀疏数组、非普通原型对象按 lossless JSON 边界拒绝。
 *
 * @param schema - 已规范化的 schema。
 * @param value - 待校验的值。
 * @param path - 诊断路径前缀。
 * @returns 违规描述列表；空数组代表通过。
 */
export function validateAgainstSchema(schema: SupportedSchemaNode, value: unknown, path = "value"): string[] {
  if (schema.oneOf !== undefined) {
    const matched = schema.oneOf.filter((branch) => validateAgainstSchema(branch, value, path).length === 0);
    return matched.length === 1 ? [] : [`"${path}" must match exactly one oneOf branch (matched ${matched.length})`];
  }

  // 无 type 的注解式节点：只要求是 lossless JSON。
  if (schema.type === undefined) {
    return isLosslessJson(value) ? [] : [`"${path}" must be a lossless JSON value`];
  }

  const enumViolation = (): string[] => {
    if (schema.enum !== undefined && !schema.enum.includes(value as string | number | boolean | null)) {
      return [`"${path}" must be one of ${JSON.stringify(schema.enum)}`];
    }
    if (schema.const !== undefined && value !== schema.const) {
      return [`"${path}" must be ${JSON.stringify(schema.const)}`];
    }
    return [];
  };

  switch (schema.type) {
    case "null":
      return value === null ? enumViolation() : [`"${path}" must be null`];
    case "boolean":
      return typeof value === "boolean" ? enumViolation() : [`"${path}" must be a boolean`];
    case "string":
      return typeof value === "string" ? enumViolation() : [`"${path}" must be a string`];
    case "number":
      if (typeof value !== "number") return [`"${path}" must be a number`];
      return Number.isFinite(value) && !Object.is(value, -0) ? enumViolation() : [`"${path}" must be a finite JSON number`];
    case "integer":
      return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0) && Number.isInteger(value)
        ? enumViolation()
        : [`"${path}" must be an integer`];
    case "array": {
      if (!Array.isArray(value)) return [`"${path}" must be an array`];
      const violations: string[] = [];
      if (schema.items !== undefined) {
        value.forEach((item, i) => violations.push(...validateAgainstSchema(schema.items!, item, `${path}[${i}]`)));
      }
      // 与宿主一致：items 违规优先于 lossless 边界（稀疏数组由 lossless 兜底）。
      if (violations.length > 0) return violations;
      return isLosslessJson(value) ? [] : [`"${path}" must be a dense lossless JSON array`];
    }
    case "object": {
      if (!isPlainRecord(value)) return [`"${path}" must be an object`];
      const props = schema.properties ?? {};
      const violations: string[] = [];
      for (const name of schema.required ?? []) {
        if (!Object.hasOwn(value, name) || value[name] === undefined) {
          violations.push(`missing required property "${path}.${name}"`);
        }
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!Object.hasOwn(props, key)) {
            violations.push(`"${path}.${key}" is not a declared property (additionalProperties: false)`);
          }
        }
      }
      for (const [key, child] of Object.entries(props)) {
        if (Object.hasOwn(value, key) && value[key] !== undefined) {
          violations.push(...validateAgainstSchema(child, value[key], `${path}.${key}`));
        }
      }
      if (violations.length > 0) return violations;
      return isLosslessJson(value) ? [] : [`"${path}" must be a lossless JSON object`];
    }
    default:
      return [];
  }
}
