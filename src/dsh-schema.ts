/**
 * DSH 工具 JSON Schema 规范化与校验（新旧版本通用）。
 *
 * DSH 对工具 schema 的强制校验只接受 **受支持的 JSON Schema 子集**：
 * 单个 `type`、对象 `properties` / `required` / 布尔 `additionalProperties`、
 * 数组 `items`、标量 `enum` / `const`、以及至少两支的 `oneOf`。
 * **不支持或位置错放的 keyword 会直接拒绝**（`assertSupportedJsonSchema`
 * 抛 `JsonSchemaError`），而不是被静默忽略。
 *
 * 新版 DSH（dsh-tools 0.1.6）在 `ToolRuntime.register()` 里对
 * `output.schema` 执行该校验，并在每次返回后按 `output.schema`
 * 校验 canonical value；参数 schema 则由注册方保证。
 *
 * 本模块因此承担两件事：
 * 1. **规范化**：把 MCP 侧宽松的 `inputSchema` / 输出 schema 压平为
 *    受支持子集（丢弃未知 keyword，补全 `additionalProperties` 布尔位）。
 * 2. **自检**：在注册前对 schema 做一次同构校验，把违规项以
 *    `openliulan.schema.<tool>` 的 effect 标签暴露出来，避免「装上了但
 *    调用即报错」——这是 ISSUE #33「适配新版」里最容易踩空的一环。
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

const SCALAR_TYPES = new Set(["string", "number", "integer", "boolean", "null"]);
const KNOWN_TYPES = new Set([...SCALAR_TYPES, "object", "array"]);

/** 判断是否为可下钻的普通对象（排除数组与 null）。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 把任意宽松 schema 压平为受支持子集。
 *
 * 规则：
 * - 只保留白名单 keyword；`oneOf` 与 `type` 互斥（保留 `oneOf`）。
 * - 对象节点若声明了 `properties`，则把 `required` 收敛为
 *   「既在 properties 里、又在原 required 里」的名字——DSH 要求
 *   `required` 的每一项都必须出现在 `properties` 中。
 * - `additionalProperties` 显式为布尔；数组 `items` 缺省视为任意 JSON。
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
    const branches = raw.oneOf.map((b) => normalizeSchema(b));
    if (branches.length >= 2) {
      out.oneOf = branches;
      return out;
    }
    // 单支 oneOf 非法：退化为该支本身。
    return branches[0] ?? {};
  }

  const declaredType = typeof raw.type === "string" ? raw.type : undefined;

  if (declaredType !== undefined && KNOWN_TYPES.has(declaredType)) {
    out.type = declaredType as SupportedSchemaNode["type"];
  }

  // 标量 enum / const（数组/对象上的 enum 不被接受，直接丢弃）。
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

    // 嵌套对象显式声明开闭；根节点若为对象亦显式声明。
    out.additionalProperties = raw.additionalProperties === true;
  }

  return out;
}

/**
 * 校验一个值是否满足 {@link SupportedSchemaNode} 的判定语义。
 *
 * 与 DSH 的 `validateJsonSchemaValue` 同构（只覆盖受支持子集），
 * 用于注册期自检与输出值回归断言，不依赖 DSH 内部实现。
 *
 * @param schema - 已规范化的 schema。
 * @param value - 待校验的值。
 * @param path - 诊断路径前缀。
 * @returns 违规描述列表；空数组代表通过。
 */
export function validateAgainstSchema(
  schema: SupportedSchemaNode,
  value: unknown,
  path = "value",
): string[] {
  const violations: string[] = [];

  if (schema.oneOf !== undefined) {
    const matched = schema.oneOf.filter((branch) => validateAgainstSchema(branch, value, path).length === 0);
    if (matched.length !== 1) {
      violations.push(`"${path}" must match exactly one oneOf branch (matched ${matched.length})`);
    }
    return violations;
  }

  if (schema.const !== undefined && value !== schema.const) {
    violations.push(`"${path}" must be ${JSON.stringify(schema.const)}`);
    return violations;
  }
  if (schema.enum !== undefined && !schema.enum.includes(value as string | number | boolean | null)) {
    violations.push(`"${path}" must be one of ${JSON.stringify(schema.enum)}`);
    return violations;
  }

  switch (schema.type) {
    case undefined:
      return violations;
    case "null":
      if (value !== null) violations.push(`"${path}" must be null`);
      return violations;
    case "boolean":
      if (typeof value !== "boolean") violations.push(`"${path}" must be boolean`);
      return violations;
    case "string":
      if (typeof value !== "string") violations.push(`"${path}" must be string`);
      return violations;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) violations.push(`"${path}" must be a finite number`);
      return violations;
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) violations.push(`"${path}" must be an integer`);
      return violations;
    case "array": {
      if (!Array.isArray(value)) {
        violations.push(`"${path}" must be an array`);
        return violations;
      }
      if (schema.items !== undefined) {
        value.forEach((item, i) => violations.push(...validateAgainstSchema(schema.items!, item, `${path}[${i}]`)));
      }
      return violations;
    }
    case "object": {
      if (!isRecord(value)) {
        violations.push(`"${path}" must be an object`);
        return violations;
      }
      const props = schema.properties ?? {};
      for (const name of schema.required ?? []) {
        if (!Object.hasOwn(value, name)) violations.push(`"${path}.${name}" is required`);
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!Object.hasOwn(props, key)) violations.push(`"${path}.${key}" is not a declared property`);
        }
      }
      for (const [key, child] of Object.entries(props)) {
        if (Object.hasOwn(value, key)) {
          violations.push(...validateAgainstSchema(child, value[key], `${path}.${key}`));
        }
      }
      return violations;
    }
    default:
      return violations;
  }
}
