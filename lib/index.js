var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// packages/diagnosis/src/analyzer.ts
function analyzeNetwork(records) {
  const refs = [];
  const suggestions = [];
  const failed = records.filter((r) => r.status >= 400 || r.error);
  const slow = records.filter((r) => r.durationMs > 3e3);
  for (const r of failed) {
    refs.push({
      kind: "network",
      severity: r.status >= 500 ? "error" : "warning",
      message: `\u8BF7\u6C42\u5931\u8D25 ${r.method} ${r.url} (${r.status}${r.statusText ? " " + r.statusText : ""})${r.error ? " \u2014 " + r.error : ""}`,
      detail: { durationMs: r.durationMs, requestId: r.requestId },
      timestamp: Date.now()
    });
  }
  for (const r of slow) {
    refs.push({
      kind: "network",
      severity: "warning",
      message: `\u6162\u8BF7\u6C42 ${r.durationMs}ms ${r.method} ${r.url}`,
      detail: { status: r.status },
      timestamp: Date.now()
    });
  }
  if (failed.length) suggestions.push(`\u7F51\u7EDC\u5B58\u5728 ${failed.length} \u4E2A\u5931\u8D25\u8BF7\u6C42\uFF0C\u53EF\u80FD\u662F\u8D44\u6E90 404/500 \u6216 CORS/\u8DE8\u57DF\u963B\u65AD`);
  if (slow.length) suggestions.push(`\u5B58\u5728 ${slow.length} \u4E2A\u6162\u8BF7\u6C42(>3s)\uFF0C\u8003\u8651\u68C0\u67E5\u540E\u7AEF\u63A5\u53E3\u6216\u8D44\u6E90\u52A0\u8F7D`);
  return { refs, suggestions };
}
function analyzePerformance(metrics) {
  const refs = [];
  const suggestions = [];
  if (metrics.ttfb > 1e3) {
    refs.push({
      kind: "performance",
      severity: "warning",
      message: `TTFB \u504F\u9AD8: ${metrics.ttfb}ms\uFF08\u9996\u5B57\u8282\u54CD\u5E94\u6162\uFF0C\u53EF\u80FD\u670D\u52A1\u7AEF\u6162\u6216\u7F51\u7EDC\u5DEE\uFF09`,
      timestamp: Date.now()
    });
    suggestions.push("TTFB > 1s\uFF0C\u4F18\u5148\u6392\u67E5\u670D\u52A1\u7AEF\u54CD\u5E94\u4E0E CDN");
  }
  if (metrics.lcp && metrics.lcp > 2500) {
    refs.push({
      kind: "performance",
      severity: "warning",
      message: `LCP \u504F\u9AD8: ${metrics.lcp}ms\uFF08\u6700\u5927\u5185\u5BB9\u7ED8\u5236\u6162\uFF0C\u5F71\u54CD\u9996\u5C4F\uFF09`,
      timestamp: Date.now()
    });
    suggestions.push("LCP > 2.5s\uFF0C\u5173\u6CE8\u9996\u5C4F\u56FE\u7247/\u5927\u8D44\u6E90\u52A0\u8F7D");
  }
  if (metrics.longTasks > 3) {
    refs.push({
      kind: "performance",
      severity: "warning",
      message: `\u4E3B\u7EBF\u7A0B\u957F\u4EFB\u52A1 ${metrics.longTasks} \u6B21\uFF08JS \u53EF\u80FD\u963B\u585E\u6E32\u67D3\uFF09`,
      timestamp: Date.now()
    });
    suggestions.push("\u5B58\u5728\u957F\u4EFB\u52A1\u963B\u585E\u4E3B\u7EBF\u7A0B\uFF0C\u68C0\u67E5\u540C\u6B65\u811A\u672C/\u5BC6\u96C6\u8BA1\u7B97");
  }
  if (metrics.resources.totalBytes > 5 * 1024 * 1024) {
    refs.push({
      kind: "performance",
      severity: "info",
      message: `\u9875\u9762\u8D44\u6E90\u603B\u91CF\u8F83\u5927: ${(metrics.resources.totalBytes / 1024 / 1024).toFixed(1)}MB`,
      timestamp: Date.now()
    });
  }
  return { refs, suggestions };
}
function summarize(report) {
  const issues = [];
  const suggestions = [];
  const consoleErrors = report.console.filter((c) => c.severity === "error");
  for (const e of consoleErrors) {
    issues.push({ category: "console", severity: "error", message: e.message });
  }
  if (consoleErrors.length) suggestions.push(`\u63A7\u5236\u53F0\u6709 ${consoleErrors.length} \u6761\u9519\u8BEF\uFF0C\u53EF\u80FD\u662F JS \u5F02\u5E38\u6216\u8D44\u6E90\u52A0\u8F7D\u5931\u8D25`);
  for (const e of report.jsExceptions) {
    issues.push({ category: "js-exception", severity: "error", message: e.message });
  }
  if (report.jsExceptions.length) suggestions.push("\u9875\u9762\u629B\u51FA\u4E86 JS \u672A\u6355\u83B7\u5F02\u5E38\uFF0C\u68C0\u67E5\u5BF9\u5E94\u5806\u6808");
  const netFailed = report.network.filter((n) => n.severity === "error");
  for (const n of netFailed) issues.push({ category: "network", severity: "error", message: n.message });
  const netWarn = report.network.filter((n) => n.severity === "warning");
  for (const n of netWarn) issues.push({ category: "network", severity: "warning", message: n.message });
  for (const d of report.dom) {
    issues.push({ category: "dom", severity: d.severity === "error" ? "error" : "warning", message: d.message });
  }
  const domBlank = report.dom.filter((d) => d.severity === "error");
  if (domBlank.length) suggestions.push("\u9875\u9762\u7591\u4F3C\u7A7A\u767D/\u672A\u6E32\u67D3\uFF0C\u68C0\u67E5\u6302\u8F7D\u8282\u70B9\u4E0E\u521D\u59CB\u5316\u811A\u672C\uFF08\u53EF\u80FD JS \u62A5\u9519\u963B\u65AD\u6574\u6811\u6E32\u67D3\uFF09");
  for (const p of report.performance) {
    if (p.severity === "warning") issues.push({ category: "performance", severity: "warning", message: p.message });
  }
  const unique = [...new Set(suggestions)];
  return {
    healthy: issues.filter((i) => i.severity === "error").length === 0,
    issues: issues.slice(0, 15),
    suggestions: unique.slice(0, 8)
  };
}
var init_analyzer = __esm({
  "packages/diagnosis/src/analyzer.ts"() {
    "use strict";
  }
});

// packages/diagnosis/src/types.ts
var init_types = __esm({
  "packages/diagnosis/src/types.ts"() {
    "use strict";
  }
});

// packages/diagnosis/src/index.ts
var src_exports = {};
__export(src_exports, {
  DiagnosisCenter: () => DiagnosisCenter,
  analyzeNetwork: () => analyzeNetwork,
  analyzePerformance: () => analyzePerformance,
  summarize: () => summarize
});
var DiagnosisCenter;
var init_src = __esm({
  "packages/diagnosis/src/index.ts"() {
    init_analyzer();
    init_types();
    init_analyzer();
    DiagnosisCenter = class {
      collectors = [];
      /** 注册采集器（底层引擎提供） */
      register(collector) {
        this.collectors.push(collector);
        return this;
      }
      /** 运行一次完整诊断 */
      async run() {
        const report = {
          console: [],
          network: [],
          dom: [],
          performance: [],
          jsExceptions: [],
          accessibility: []
        };
        const tasks = this.collectors.map(async (c) => {
          const refs = await c.collect();
          return { category: c.category, refs };
        });
        const results = await Promise.allSettled(tasks);
        for (const r of results) {
          if (r.status === "fulfilled") {
            report[r.value.category] = r.value.refs;
          }
        }
        return report;
      }
      /** 获取 AI 可读摘要 */
      async summarize() {
        const report = await this.run();
        return summarize(report);
      }
      /** 便捷：采集网络失败 */
      static flattenErrors(report) {
        return [
          ...report.console.filter((c) => c.severity === "error"),
          ...report.network.filter((n) => n.severity === "error"),
          ...report.jsExceptions,
          ...report.performance.filter((p) => p.severity === "error")
        ];
      }
    };
  }
});

// packages/mcp-server/src/tools.ts
var TOOLS = [
  {
    name: "observe",
    description: "\u83B7\u53D6\u5F53\u524D\u9875\u9762\u7684\u9AD8\u6548\u5FEB\u7167\u3002\u8FD4\u56DE\u7CBE\u7B80\u540E\u7684\u53EF\u4EA4\u4E92\u5143\u7D20\u7D22\u5F15\uFF08\u5E26 ref\uFF09\u4E0E\u9875\u9762\u7EDF\u8BA1\u3002Token \u53CB\u597D\uFF0C\u662F\u7406\u89E3\u9875\u9762\u7684\u9996\u9009\u3002",
    inputSchema: {
      type: "object",
      properties: {
        maxNodes: { type: "number", description: "\u6700\u5927\u8282\u70B9\u6570\uFF08\u9ED8\u8BA4 200\uFF09" },
        maxTextLength: { type: "number", description: "\u5355\u8282\u70B9\u6587\u672C\u6700\u5927\u957F\u5EA6\uFF08\u9ED8\u8BA4 80\uFF09" }
      }
    }
  },
  {
    name: "act",
    description: "\u6267\u884C\u4E00\u4E2A\u7EDF\u4E00\u6D4F\u89C8\u5668\u52A8\u4F5C\uFF08navigate/click/fill/type/select/hover/scroll/press/wait/extract/assert/screenshot/evaluate\uFF09\u3002",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["navigate", "click", "fill", "type", "select", "hover", "scroll", "press", "wait", "extract", "assert", "screenshot", "evaluate"],
          description: "\u52A8\u4F5C\u7C7B\u578B"
        },
        description: { type: "string" },
        // 通用定位
        ref: { type: "string", description: "observe \u8FD4\u56DE\u7684\u5143\u7D20 ref\uFF08\u6700\u7CBE\u786E\uFF09" },
        selector: { type: "string", description: "CSS \u9009\u62E9\u5668" },
        text: { type: "string", description: "\u7CBE\u786E\u6587\u672C\u5B9A\u4F4D" },
        semantic: { type: "string", description: "\u8BED\u4E49\u63CF\u8FF0\u5B9A\u4F4D" },
        // 动作参数
        url: { type: "string" },
        value: { type: "string" },
        key: { type: "string" },
        ms: { type: "number" },
        script: { type: "string" },
        mode: { type: "string" },
        expected: { type: "string" },
        // 截图/滚动/输入/导航细节（供 IDE 的 function calling 完整声明，避免能力被隐藏）
        fullPage: { type: "boolean", description: "screenshot \u65F6\u662F\u5426\u6574\u9875\u622A\u56FE" },
        deltaY: { type: "number", description: "scroll \u65F6\u5782\u76F4\u6EDA\u52A8\u8DDD\u79BB" },
        delay: { type: "number", description: "type \u65F6\u9010\u952E\u8F93\u5165\u5EF6\u8FDF(ms)" },
        waitUntil: { type: "string", enum: ["load", "domcontentloaded", "networkidle", "commit"], description: "navigate \u65F6\u7B49\u5F85\u7B56\u7565" },
        waitForNavigation: { type: "boolean", description: "click \u65F6\u662F\u5426\u7B49\u5F85\u5BFC\u822A\u7A33\u5B9A\uFF08\u70B9\u51FB\u94FE\u63A5\u89E6\u53D1\u8DF3\u8F6C\u65F6\uFF09" }
      },
      required: ["type"]
    }
  },
  {
    name: "diagnose",
    description: "\u8FD0\u884C 5 \u661F\u8C03\u8BD5\u8BCA\u65AD\uFF0C\u91C7\u96C6\u63A7\u5236\u53F0\u9519\u8BEF\u3001\u7F51\u7EDC\u5931\u8D25\u3001JS \u5F02\u5E38\u3001\u6027\u80FD\u6307\u6807\uFF0C\u5E76\u8FD4\u56DE\u5065\u5EB7\u5EA6\u4E0E AI \u53EF\u8BFB\u5EFA\u8BAE\u3002\u52A8\u4F5C\u5931\u8D25\u540E\u81EA\u52A8\u8BCA\u65AD\u3002",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "eval",
    description: "\u5728\u9875\u9762\u6CE8\u5165\u6267\u884C JavaScript\uFF0C\u7528\u4E8E\u9AD8\u7EA7\u8BCA\u65AD\u4E0E\u72B6\u6001\u68C0\u67E5\u3002",
    inputSchema: {
      type: "object",
      properties: { script: { type: "string", description: "\u8981\u6267\u884C\u7684 JS \u8868\u8FBE\u5F0F/\u8BED\u53E5" } },
      required: ["script"]
    }
  },
  {
    name: "screenshot",
    description: "\u622A\u53D6\u5F53\u524D\u9875\u9762\uFF08\u53EF\u6574\u9875\uFF09\uFF0C\u8FD4\u56DE base64 \u56FE\u7247\uFF0C\u7528\u4E8E\u89C6\u89C9\u786E\u8BA4\u3002\u622A\u56FE\u4F1A\u4F5C\u4E3A\u56FE\u7247\u4E8B\u4EF6\u5199\u5165\u4F1A\u8BDD\u65E5\u5FD7\uFF0C\u4F9B\u591A\u6A21\u6001 AI \u6D88\u8D39\u3002",
    inputSchema: {
      type: "object",
      properties: {
        fullPage: { type: "boolean", description: "\u662F\u5426\u6574\u9875\u622A\u56FE" },
        caption: { type: "string", description: "\u622A\u56FE\u8BF4\u660E\uFF08\u5199\u5165\u65E5\u5FD7\u4E8B\u4EF6\uFF09" }
      }
    }
  },
  {
    name: "session_log",
    description: "\u83B7\u53D6\u5F53\u524D\u4F1A\u8BDD\u7684\u4E8B\u4EF6\u65E5\u5FD7\u6D41\uFF08\u52A8\u4F5C/\u8BCA\u65AD/\u9519\u8BEF/\u622A\u56FE\u8F68\u8FF9\uFF09\u3002\u8FD9\u662F AI \u534F\u4F5C\u7684\u8FFD\u8E2A\u80FD\u529B\uFF1A\u8BA9\u5916\u90E8 AI \u770B\u5230\u300E\u53D1\u751F\u4E86\u4EC0\u4E48 + \u4E3A\u4EC0\u4E48\u5931\u8D25 + \u5EFA\u8BAE\u300F\u3002format=json \u8FD4\u56DE\u7ED3\u6784\u5316\u4E8B\u4EF6\uFF0C\u9ED8\u8BA4\u8FD4\u56DE markdown\u3002",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["markdown", "json"], description: "\u8F93\u51FA\u683C\u5F0F\uFF0C\u9ED8\u8BA4 markdown" },
        title: { type: "string", description: "markdown \u62A5\u544A\u6807\u9898" }
      }
    }
  },
  {
    name: "close",
    description: "\u5173\u95ED\u6D4F\u89C8\u5668\uFF0C\u7ED3\u675F\u4F1A\u8BDD\u3002",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "stealth_status",
    description: "\u67E5\u770B\u9632\u68C0\u6D4B\uFF08Stealth\uFF09\u6A21\u5757\u72B6\u6001\uFF1A\u662F\u5426\u542F\u7528\u3001\u7EA7\u522B\u3001UA \u7B56\u7565\u7B49\u3002\u9632\u68C0\u6D4B\u7528\u4E8E\u907F\u514D\u88AB\u76EE\u6807\u7AD9\u70B9\u8BC6\u522B\u4E3A\u722C\u866B\u800C\u9650\u901F/\u5C01\u7981\u3002",
    inputSchema: { type: "object", properties: {} }
  }
];
function okResult(text, structured) {
  return { ok: true, content: [{ type: "text", text }], structured };
}
function errResult(text) {
  return { ok: false, content: [{ type: "text", text }], isError: true };
}

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask2) {
    const shape = {};
    for (const key of util.objectKeys(mask2)) {
      if (mask2[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask2) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask2[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask2) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask2 && !mask2[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask2) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask2 && !mask2[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// packages/core/src/actions.ts
var BaseActionSchema = external_exports.object({
  /** 动作类型 */
  type: external_exports.enum([
    "navigate",
    "click",
    "fill",
    "type",
    "select",
    "hover",
    "scroll",
    "press",
    "wait",
    "screenshot",
    "evaluate",
    "assert",
    "extract",
    "snapshot"
  ]),
  /** 动作用途描述（供 AI / 日志 / 回放） */
  description: external_exports.string().optional(),
  /** 语义目标（自然语言，供 AI 层解析） */
  intent: external_exports.string().optional(),
  /** 是否等待动作稳定后再返回 */
  waitUntilStable: external_exports.boolean().default(true)
});
var NavigateActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("navigate"),
  url: external_exports.string().url(),
  /** 等待网络空闲 */
  waitUntil: external_exports.enum(["load", "domcontentloaded", "networkidle", "commit"]).default("networkidle")
});
var ClickActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("click"),
  // 定位方式（按优先级尝试）
  selector: external_exports.string().optional(),
  // 语义目标文本（借鉴 Browser-Use，用文本定位）
  text: external_exports.string().optional(),
  // AI 从快照中返回的 ref（高效精确定位，借鉴 Stagehand XPath / AI locator）
  ref: external_exports.string().optional(),
  // AI 返回的语义定位描述
  semantic: external_exports.string().optional(),
  /** 点击按钮 */
  button: external_exports.enum(["left", "right", "middle"]).default("left"),
  /** 点击次数 */
  clickCount: external_exports.number().int().min(1).max(3).default(1),
  /** 强制忽略可操作性检查 */
  force: external_exports.boolean().default(false),
  /** 点击后是否等待页面导航稳定（点击链接触发跳转时，等待新页面加载完成再返回）。
   *  默认 true，确保 AI 点击跳转后读到的是稳定后的页面，而非旧页面。 */
  waitForNavigation: external_exports.boolean().default(true)
});
var FillActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("fill"),
  selector: external_exports.string().optional(),
  text: external_exports.string().optional(),
  ref: external_exports.string().optional(),
  semantic: external_exports.string().optional(),
  value: external_exports.string()
  /** 输入模式：fill 即时填充 / type 逐键模拟 */
});
var ExtractActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("extract"),
  selector: external_exports.string().optional(),
  text: external_exports.string().optional(),
  ref: external_exports.string().optional(),
  semantic: external_exports.string().optional(),
  /** 结构化提取的 schema 描述 */
  schema: external_exports.record(external_exports.string(), external_exports.any()).optional()
});
var AssertActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("assert"),
  selector: external_exports.string().optional(),
  text: external_exports.string().optional(),
  ref: external_exports.string().optional(),
  semantic: external_exports.string().optional(),
  /** 断言方式 */
  mode: external_exports.enum(["visible", "exists", "hidden", "text-contains", "value-equals", "enabled"]).default("visible"),
  expected: external_exports.string().optional()
});
var ScreenshotActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("screenshot"),
  fullPage: external_exports.boolean().default(false),
  /** 截图区域（可选，用于调试定位） */
  clip: external_exports.object({
    x: external_exports.number(),
    y: external_exports.number(),
    width: external_exports.number(),
    height: external_exports.number()
  }).optional()
});
var HoverActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("hover"),
  selector: external_exports.string().optional(),
  text: external_exports.string().optional(),
  ref: external_exports.string().optional(),
  semantic: external_exports.string().optional()
});
var ScrollActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("scroll"),
  deltaX: external_exports.number().default(0),
  deltaY: external_exports.number().default(600)
});
var WaitActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("wait"),
  ms: external_exports.number().int().min(0).default(1e3)
});
var EvaluateActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("evaluate"),
  script: external_exports.string()
});
var PressActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("press"),
  key: external_exports.string()
});
var TypeActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("type"),
  selector: external_exports.string().optional(),
  text: external_exports.string().optional(),
  ref: external_exports.string().optional(),
  value: external_exports.string(),
  delay: external_exports.number().int().min(0).default(0)
});
var SelectActionSchema = BaseActionSchema.extend({
  type: external_exports.literal("select"),
  selector: external_exports.string().optional(),
  ref: external_exports.string().optional(),
  value: external_exports.string()
});
var UnifiedActionSchema = external_exports.discriminatedUnion("type", [
  NavigateActionSchema,
  ClickActionSchema,
  FillActionSchema,
  TypeActionSchema,
  SelectActionSchema,
  HoverActionSchema,
  ScrollActionSchema,
  WaitActionSchema,
  EvaluateActionSchema,
  PressActionSchema,
  ExtractActionSchema,
  AssertActionSchema,
  ScreenshotActionSchema
]);

// packages/core/src/session.ts
var SessionMachine = class {
  state;
  constructor() {
    this.state = {
      phase: "idle",
      steps: 0,
      startedAt: Date.now()
    };
  }
  get snapshot() {
    return this.state;
  }
  transition(next, patch) {
    this.state = {
      ...this.state,
      ...patch,
      phase: next
    };
    if (next === "acting" || next === "navigating" || next === "observing" || next === "extracting") {
      this.state.steps += 1;
    }
  }
  setUrl(url) {
    this.state.url = url;
  }
  setError(error) {
    this.state.error = error;
    this.state.phase = "error";
  }
  /** 重置会话（供下一轮复用同一浏览器实例） */
  reset() {
    this.state = {
      phase: "idle",
      steps: 0,
      startedAt: Date.now()
    };
  }
};

// packages/core/src/forge.ts
var ForgeBrowser = class {
  constructor(engine, opts = {}) {
    this.engine = engine;
    this.opts = {
      timeoutMs: 3e4,
      snapshotOptions: { maxNodes: 200, maxTextLength: 80, withSelectors: true },
      autoDiagnoseOnError: true,
      ...opts
    };
  }
  engine;
  session = new SessionMachine();
  opts;
  diagnosticsCache = {
    console: [],
    network: [],
    dom: [],
    performance: [],
    jsExceptions: [],
    accessibility: []
  };
  get engineName() {
    return this.engine.name;
  }
  /** 启动 */
  async start() {
    await this.engine.init();
    this.session.transition("idle");
  }
  /** 停止 */
  async stop() {
    await this.engine.close();
    this.session.transition("done");
  }
  /**
   * 执行统一动作。
   * 失败时自动触发诊断采集，返回带诊断引用的结果。
   */
  async act(action) {
    const t0 = Date.now();
    this.session.transition("acting");
    try {
      const result = await this.engine.execute(action);
      result.durationMs = Date.now() - t0;
      this.session.setUrl(result.summary.includes("http") ? result.summary : this.session.snapshot.url ?? "");
      if (result.ok) {
        this.session.transition("acting", { lastAction: action.type });
        result.diagnostics = await this.engine.diagnose().then(
          (d) => [
            ...d.console.filter((c) => c.severity === "error"),
            ...d.network.filter((n) => n.severity === "error"),
            ...d.jsExceptions
          ].slice(0, 8)
        );
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const result = {
        ok: false,
        type: action.type,
        summary: `\u52A8\u4F5C\u6267\u884C\u5931\u8D25: ${message}`,
        durationMs: Date.now() - t0,
        error: message
      };
      if (this.opts.autoDiagnoseOnError) {
        const report = await this.captureDiagnostics();
        result.diagnostics = [
          ...report.console,
          ...report.network,
          ...report.dom,
          ...report.jsExceptions,
          ...report.performance
        ].slice(0, 10);
      }
      this.session.setError(message);
      return result;
    }
  }
  /** 获取页面快照（供 AI 观察页面） */
  async observe(opts) {
    this.session.transition("observing");
    const snap = await this.engine.snapshot(opts ?? this.opts.snapshotOptions);
    this.session.transition("observing", { lastSnapshotRef: `${snap.url}#${snap.timestamp}` });
    return snap;
  }
  /** 采集全量调试诊断（5 星能力核心） */
  async captureDiagnostics() {
    this.session.transition("diagnosing");
    const raw = await this.engine.diagnose();
    this.diagnosticsCache = {
      console: raw.console ?? [],
      network: raw.network ?? [],
      dom: raw.dom ?? [],
      performance: raw.performance ?? [],
      jsExceptions: raw.jsExceptions ?? [],
      accessibility: raw.accessibility ?? []
    };
    this.session.transition("acting");
    return this.diagnosticsCache;
  }
  /** 最近一次诊断报告 */
  get lastDiagnostics() {
    return this.diagnosticsCache;
  }
  /** 注入执行 JS（高级诊断/评估） */
  async eval(script) {
    return this.engine.evaluate(script);
  }
};

// packages/engines/src/locator.ts
var INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[contenteditable='true']",
  "label"
].join(", ");
var ElementLocator = class {
  constructor(page, semanticResolver) {
    this.page = page;
    this.semanticResolver = semanticResolver;
  }
  page;
  semanticResolver;
  /**
   * 根据动作参数定位元素，多策略依次回退。
   * 找不到时抛出带诊断提示的错误。
   */
  async locate(opts) {
    const { ref, selector, text, semantic } = opts;
    if (ref) {
      const byRef = this.locateByRef(ref);
      if (await byRef.count()) {
        return { locator: byRef.first(), strategy: "ref", anchorSelector: await this.toCss(byRef.first()) };
      }
    }
    if (selector) {
      const loc = this.page.locator(selector);
      if (await loc.count()) {
        return { locator: loc.first(), strategy: "selector", anchorSelector: selector };
      }
    }
    if (text) {
      const byText = this.locateByText(text);
      if (await byText.count()) {
        return {
          locator: byText.first(),
          strategy: "text",
          anchorSelector: await this.toCss(byText.first())
        };
      }
    }
    if (semantic) {
      const bySemantic = this.locateBySemantic(semantic);
      if (await bySemantic.count()) {
        return {
          locator: bySemantic.first(),
          strategy: "semantic",
          anchorSelector: await this.toCss(bySemantic.first())
        };
      }
      if (this.semanticResolver) {
        const resolved = await this.semanticResolver.resolve(semantic);
        if (resolved?.ref || resolved?.selector || resolved?.text) {
          const byResolved = resolved.selector ? this.page.locator(resolved.selector) : resolved.text ? this.locateByText(resolved.text) : this.locateByRef(resolved.ref);
          if (await byResolved.count()) {
            return {
              locator: byResolved.first(),
              strategy: "semantic",
              anchorSelector: resolved.selector || await this.toCss(byResolved.first())
            };
          }
        }
      }
    }
    throw new Error(
      `\u65E0\u6CD5\u5B9A\u4F4D\u5143\u7D20\uFF1Aref=${ref ?? "-"} selector=${selector ?? "-"} text=${text ?? "-"} semantic=${semantic ?? "-"}. \u5EFA\u8BAE\u8C03\u7528 observe() \u83B7\u53D6\u6700\u65B0\u5FEB\u7167\u540E\u91CD\u8BD5\uFF0C\u6216\u4F7F\u7528 diagnose() \u68C0\u67E5 DOM \u72B6\u6001\u3002`
    );
  }
  /** 通过快照 ref 定位：ref 内嵌了选择器信息（data-forge-ref） */
  locateByRef(ref) {
    return this.page.locator(`[data-forge-ref="${ref}"], [data-forge-ref*="${ref}"]`);
  }
  /** 文本定位：在可交互元素内查找包含指定文本者 */
  locateByText(text) {
    return this.page.locator(INTERACTIVE_SELECTOR).filter({ hasText: text });
  }
  /** 语义定位：尝试 aria-label / placeholder / title */
  locateBySemantic(semantic) {
    return this.page.locator(`${INTERACTIVE_SELECTOR}[aria-label*="${semantic}"], ${INTERACTIVE_SELECTOR}[placeholder*="${semantic}"], ${INTERACTIVE_SELECTOR}[title*="${semantic}"]`).first();
  }
  /** 将 locator 转成唯一 CSS 选择器（用于诊断锚定） */
  async toCss(loc) {
    try {
      return await loc.evaluate((el) => {
        const parts = [];
        let cur = el;
        while (cur && cur.nodeType === 1 && parts.length < 5) {
          let seg = cur.tagName.toLowerCase();
          if (cur.id) {
            seg += `#${cur.id}`;
            parts.unshift(seg);
            break;
          }
          if (cur.classList.length) {
            seg += "." + Array.from(cur.classList).slice(0, 2).join(".");
          }
          parts.unshift(seg);
          cur = cur.parentElement;
        }
        return parts.join(" > ");
      });
    } catch {
      return "";
    }
  }
};

// packages/engines/src/snapshot.ts
var ATTR_WHITELIST = ["id", "class", "name", "type", "value", "href", "placeholder", "title", "aria-label", "role", "data-testid", "src", "alt", "checked", "selected", "disabled", "target"];
var TEXT_TAGS = /* @__PURE__ */ new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "A", "BUTTON", "INPUT", "TEXTAREA", "SELECT", "OPTION", "LI", "TD", "TH", "SPAN", "LABEL", "CAPTION", "SUMMARY"]);
var PRUNE_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME", "HEAD", "META", "LINK", "SVG"]);
var INTERACTIVE_TAGS = /* @__PURE__ */ new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "OPTION", "SUMMARY"]);
var INTERACTIVE_ROLES = /* @__PURE__ */ new Set(["button", "link", "textbox", "combobox", "checkbox", "radio", "tab", "menuitem"]);
var SnapshotBuilder = class {
  constructor(page) {
    this.page = page;
  }
  page;
  async build(opts = {}) {
    const maxNodes = opts.maxNodes ?? 200;
    const maxText = opts.maxTextLength ?? 80;
    const withSelectors = opts.withSelectors ?? true;
    const result = await this.page.evaluate(
      ({ maxNodes: maxNodes2, maxText: maxText2, pruneDeep, includeHidden, withSelectors: withSelectors2, PRUNE_TAGS: PRUNE_TAGS2, TEXT_TAGS: TEXT_TAGS2, ATTR_WHITELIST: ATTR_WHITELIST2, INTERACTIVE_TAGS: INTERACTIVE_TAGS2, INTERACTIVE_ROLES: INTERACTIVE_ROLES2 }) => {
        const out = {
          url: location.href,
          title: document.title,
          readyState: document.readyState,
          totalNodes: 0,
          root: null,
          interactive: []
        };
        let emitted = 0;
        let truncatedNodes = 0;
        const refCounter = { n: 0 };
        const isVisible = (el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
        };
        const isInteractive = (el) => {
          if (INTERACTIVE_TAGS2.includes(el.tagName)) return true;
          const role = el.getAttribute("role");
          return !!role && INTERACTIVE_ROLES2.includes(role);
        };
        const SENSITIVE_INPUT_TYPES = ["password", "token", "secret", "key", "api-key", "apikey"];
        const isSensitiveInput = (el) => {
          if (el.tagName !== "INPUT") return false;
          const t = el.type?.toLowerCase() ?? "";
          const n = ((el.getAttribute("name") || "") + (el.getAttribute("autocomplete") || "")).toLowerCase();
          if (t === "password") return true;
          if (SENSITIVE_INPUT_TYPES.includes(t)) return true;
          return /(password|passwd|token|secret|api[_-]?key|auth)/.test(n);
        };
        const elText = (el) => {
          if (el.tagName === "INPUT") {
            const ph = el.getAttribute("placeholder") || "";
            if (isSensitiveInput(el)) return ph ? `[\u654F\u611F\u8F93\u5165] ${ph}` : "[\u654F\u611F\u8F93\u5165\u5DF2\u9690\u85CF]";
            const v = el.value;
            return v || ph || "";
          }
          if (el.tagName === "SELECT") {
            const sel = el;
            return sel.selectedOptions[0]?.text || "";
          }
          const t = (el.textContent || "").replace(/\s+/g, " ").trim();
          return t.slice(0, maxText2);
        };
        const walk = (el, depth) => {
          if (emitted >= maxNodes2) {
            truncatedNodes++;
            return null;
          }
          if (PRUNE_TAGS2.includes(el.tagName)) return null;
          if (!includeHidden && !isVisible(el)) return null;
          if (pruneDeep && depth > 25) return null;
          out.totalNodes++;
          emitted++;
          const node = {
            ref: `r${refCounter.n++}`,
            tag: el.tagName.toLowerCase(),
            text: TEXT_TAGS2.includes(el.tagName) ? elText(el) : "",
            attributes: {},
            interactive: isInteractive(el),
            depth
          };
          for (const attr of ATTR_WHITELIST2) {
            let v = el.getAttribute(attr);
            if (v) {
              if (attr === "value" && isSensitiveInput(el)) {
                v = "***REDACTED***";
              }
              node.attributes[attr] = v.slice(0, 60);
            }
          }
          const role = el.getAttribute("role");
          if (role) node.role = role;
          if (withSelectors2 && (node.interactive || node.attributes.id)) {
            el.setAttribute("data-forge-ref", node.ref);
            node.selector = el.id ? `${el.tagName.toLowerCase()}#${el.id}` : `${el.tagName.toLowerCase()}[data-forge-ref="${node.ref}"]`;
          }
          if (node.interactive) {
            out.interactive.push({
              ref: node.ref,
              tag: node.tag,
              text: node.text || elText(el),
              role: role || void 0,
              selector: node.selector
            });
          }
          const children = [];
          for (const child of Array.from(el.children)) {
            const c = walk(child, depth + 1);
            if (c) children.push(c);
          }
          if (children.length) node.children = children;
          return node;
        };
        out.root = walk(document.body, 0);
        return out;
      },
      {
        maxNodes,
        maxText,
        pruneDeep: opts.pruneDeep ?? true,
        includeHidden: opts.includeHidden ?? false,
        withSelectors,
        PRUNE_TAGS: [...PRUNE_TAGS],
        TEXT_TAGS: [...TEXT_TAGS],
        ATTR_WHITELIST: [...ATTR_WHITELIST],
        INTERACTIVE_TAGS: [...INTERACTIVE_TAGS],
        INTERACTIVE_ROLES: [...INTERACTIVE_ROLES]
      }
    );
    const approx = this.estimateTokens(result.root);
    return {
      url: result.url,
      title: result.title,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      readyState: result.readyState,
      stats: {
        totalNodes: result.totalNodes,
        emittedNodes: result.totalNodes - result.interactive.length,
        // 近似
        truncatedNodes: 0,
        approximateTokens: approx
      },
      root: result.root,
      interactive: result.interactive
    };
  }
  estimateTokens(root) {
    let chars = 0;
    const count = (n) => {
      if (!n) return;
      chars += (n.tag?.length ?? 0) + (n.text?.length ?? 0) + JSON.stringify(n.attributes || {}).length;
      (n.children || []).forEach(count);
    };
    count(root);
    return Math.round(chars / 4);
  }
};

// packages/engines/src/diagnostics.ts
init_src();
var ConsoleCollector = class {
  constructor(page, buffer = []) {
    this.page = page;
    this.buffer = buffer;
  }
  page;
  buffer;
  category = "console";
  async collect() {
    const refs = [...this.buffer];
    this.buffer = [];
    return refs;
  }
  /** 由引擎在页面监听时调用 */
  push(text, level) {
    const severity = level === "error" ? "error" : level === "warning" ? "warning" : "info";
    this.buffer.push({
      kind: "console",
      severity,
      message: text.slice(0, 500),
      timestamp: Date.now()
    });
  }
};
var JsExceptionCollector = class {
  constructor(page, buffer = []) {
    this.page = page;
    this.buffer = buffer;
  }
  page;
  buffer;
  category = "js-exception";
  async collect() {
    const refs = [...this.buffer];
    this.buffer = [];
    return refs;
  }
  push(error) {
    this.buffer.push({
      kind: "js-exception",
      severity: "error",
      message: error.message.slice(0, 500),
      detail: { stack: error.stack?.slice(0, 1200) },
      timestamp: Date.now()
    });
  }
};
var NetworkCollector = class {
  constructor(page, records = []) {
    this.page = page;
    this.records = records;
  }
  page;
  records;
  category = "network";
  async collect() {
    const { refs } = analyzeNetwork(this.records);
    this.records = [];
    return refs;
  }
  /** 由引擎在请求完成时调用 */
  record(record) {
    this.records.push(record);
  }
};
var PerformanceCollector = class {
  constructor(page) {
    this.page = page;
  }
  page;
  category = "performance";
  async collect() {
    try {
      const metrics = await this.page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        const paint = performance.getEntriesByType("paint");
        const lcpEntry = performance.getEntriesByType("largest-contentful-paint").pop();
        const resources = performance.getEntriesByType("resource");
        const longTasks = performance.getEntriesByType ? performance.getEntriesByType("longtask").length : 0;
        return {
          ttfb: nav ? nav.responseStart - nav.requestStart : 0,
          domContentLoaded: nav ? nav.domContentLoadedEventStart - nav.startTime : 0,
          loadEvent: nav ? nav.loadEventEnd - nav.startTime : 0,
          fcp: paint.find((p) => p.name === "first-contentful-paint")?.startTime,
          lcp: lcpEntry?.startTime,
          resources: {
            count: resources.length,
            totalBytes: resources.reduce((s, r) => s + (r.transferSize || 0), 0)
          },
          longTasks
        };
      });
      const { refs } = analyzePerformance(metrics);
      return refs;
    } catch {
      return [];
    }
  }
};
var DomCollector = class {
  constructor(page) {
    this.page = page;
  }
  page;
  category = "dom";
  async collect() {
    const refs = [];
    try {
      const state = await this.page.evaluate(() => {
        const body = document.body;
        const hasBody = !!body && body.childElementCount > 0;
        const visible = Array.from(document.querySelectorAll("a,button,input,select,textarea,[role]")).filter((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
        }).length;
        const root = document.getElementById("root") || document.getElementById("app");
        return {
          hasBody,
          visibleInteractive: visible,
          hasMount: root ? root.childElementCount > 0 : null,
          bodyTextLen: (document.body?.innerText || "").trim().length
        };
      });
      const blank = state.hasBody === false || state.visibleInteractive === 0 && state.bodyTextLen === 0;
      if (blank) {
        refs.push({
          kind: "dom",
          severity: "error",
          message: `\u9875\u9762\u7591\u4F3C\u7A7A\u767D/\u672A\u6E32\u67D3\uFF1Abody \u5B50\u5143\u7D20=${state.hasBody}\uFF0C\u53EF\u89C1\u4EA4\u4E92\u5143\u7D20=${state.visibleInteractive}\uFF0C\u6B63\u6587=${state.bodyTextLen} \u5B57\u7B26`,
          detail: { hasMount: state.hasMount },
          timestamp: Date.now()
        });
      } else if (state.visibleInteractive === 0) {
        refs.push({
          kind: "dom",
          severity: "warning",
          message: `\u9875\u9762\u65E0\u53EF\u89C1\u53EF\u4EA4\u4E92\u5143\u7D20\uFF08\u6B63\u6587 ${state.bodyTextLen} \u5B57\u7B26\uFF09\uFF0C\u53EF\u80FD\u9700\u767B\u5F55\u6216\u5143\u7D20\u88AB\u906E\u6321`,
          timestamp: Date.now()
        });
      }
    } catch {
    }
    return refs;
  }
};
var PlaywrightDiagnostics = class {
  constructor(page) {
    this.page = page;
    this.console = new ConsoleCollector(this.page);
    this.jsExceptions = new JsExceptionCollector(this.page);
    this.network = new NetworkCollector(this.page);
    this.performance = new PerformanceCollector(this.page);
    this.dom = new DomCollector(this.page);
    this.wire();
  }
  page;
  console;
  jsExceptions;
  network;
  performance;
  dom;
  wire() {
    this.page.on("console", (msg) => this.console.push(msg.text(), msg.type()));
    this.page.on("pageerror", (err) => this.jsExceptions.push(err));
    this.page.on("requestfailed", (req) => {
      this.network.record({
        url: req.url(),
        method: req.method(),
        status: 0,
        error: req.failure()?.errorText || "failed",
        durationMs: 0
      });
    });
    this.page.on("response", (res) => {
      const req = res.request();
      this.network.record({
        url: req.url(),
        method: req.method(),
        status: res.status(),
        statusText: res.statusText(),
        mimeType: res.headers()["content-type"],
        durationMs: 0
      });
    });
  }
  collectors() {
    return [this.console, this.jsExceptions, this.network, this.performance, this.dom];
  }
};

// packages/engines/src/playwright-engine.ts
import { chromium } from "playwright";

// packages/ai-layer/src/semantic-locator.ts
var IGNORE_WORDS = /* @__PURE__ */ new Set(["\u8BF7", "\u70B9\u51FB", "\u8F93\u5165", "\u9009\u62E9", "\u627E\u5230", "\u90A3\u4E2A", "\u8FD9\u4E2A", "\u7684", "\u6309\u94AE", "\u94FE\u63A5", "the", "click", "button", "link", "please"]);
function locateBySemantic(snapshot, semantic) {
  const q = normalize(semantic);
  const qTokens = tokenize(q);
  let best = { score: 0, note: "\u672A\u627E\u5230\u5339\u914D" };
  for (const el of snapshot.interactive) {
    const targetText = normalize(el.text);
    if (targetText && targetText.includes(q)) {
      const score2 = 100 + q.length;
      if (score2 > best.score) best = { ref: el.ref, text: el.text, selector: el.selector, score: score2, note: "\u6587\u672C\u5305\u542B\u5339\u914D" };
      continue;
    }
    const targetTokens = tokenize(targetText);
    const meaningfulQ = qTokens.filter(isMeaningful);
    const meaningfulTarget = targetTokens.filter(isMeaningful);
    if (!meaningfulTarget.length) continue;
    const overlap = meaningfulQ.filter((w) => meaningfulTarget.includes(w)).length;
    const score = Math.round(overlap / Math.max(meaningfulQ.length, 1) * 100);
    if (score > 0 && score > best.score) {
      best = { ref: el.ref, text: el.text, selector: el.selector, score, note: "\u8BCD\u5143\u91CD\u53E0\u5339\u914D" };
    }
  }
  return best;
}
function tokenize(s) {
  const tokens = [];
  for (const m of s.matchAll(/[a-z0-9]+/gi)) tokens.push(m[0]);
  for (const m of s.matchAll(/[\u4e00-\u9fff]+/g)) {
    for (const ch of m[0]) tokens.push(ch);
  }
  return tokens;
}
function isMeaningful(w) {
  if (IGNORE_WORDS.has(w)) return false;
  if (/^[\u4e00-\u9fff]$/.test(w)) return true;
  return w.length > 1;
}
function normalize(s) {
  return s.toLowerCase().replace(/[，。！？、；：""''（）()]/g, " ").trim();
}

// packages/stealth/src/stealth.ts
var DEFAULTS = {
  level: "basic",
  humanTypingDelay: [30, 90],
  humanActionDelay: [200, 600],
  humanMouseTrajectory: true,
  userAgent: void 0,
  extraArgs: []
};
var StealthManager = class {
  options;
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled ?? false,
      level: options.level ?? DEFAULTS.level,
      userAgent: options.userAgent ?? DEFAULTS.userAgent,
      humanTypingDelay: options.humanTypingDelay ?? DEFAULTS.humanTypingDelay,
      humanActionDelay: options.humanActionDelay ?? DEFAULTS.humanActionDelay,
      humanMouseTrajectory: options.humanMouseTrajectory ?? DEFAULTS.humanMouseTrajectory,
      extraArgs: options.extraArgs ?? DEFAULTS.extraArgs
    };
  }
  /** 是否启用 */
  get isEnabled() {
    return this.options.enabled;
  }
  /** 浏览器启动参数（仅当启用时返回，否则返回空数组，保持默认干净） */
  buildLaunchArgs() {
    if (!this.options.enabled) return [];
    const args = [
      // 禁用自动化控制标志（这是最重要的反检测点）
      "--disable-blink-features=AutomationControlled",
      "--disable-blink-features=AutomationControlled,IdleDetection",
      // 移除自动化相关的默认行为
      "--disable-automation",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-default-apps",
      "--disable-extensions-except=/dev/null",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-client-side-phishing-detection",
      // 禁用无头模式特有的可检测特征
      "--disable-infobars",
      "--disable-features=IsolateOrigins,site-per-process",
      "--window-position=0,0",
      "--lang=en-US,en"
    ];
    if (this.options.extraArgs?.length) args.push(...this.options.extraArgs);
    return args;
  }
  /**
   * 反指纹注入脚本 —— 在页面上下文中执行，用于伪装浏览器指纹。
   * 返回的脚本会在每个新页面创建时注入。
   */
  buildInitScript() {
    if (!this.options.enabled) return "";
    return `(() => {
  // \u2500\u2500\u2500 1. \u9690\u85CF navigator.webdriver\uFF08\u6700\u7ECF\u5178\u7684\u68C0\u6D4B\u70B9\uFF09 \u2500\u2500\u2500
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // \u2500\u2500\u2500 2. \u4F2A\u88C5 plugins\uFF08\u771F\u5B9E\u6D4F\u89C8\u5668\u901A\u5E38\u6709 PDF \u67E5\u770B\u5668\u7B49\u63D2\u4EF6\uFF09 \u2500\u2500\u2500
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const pluginList = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
      ];
      const result = { length: pluginList.length, item: (i) => pluginList[i], namedItem: (n) => pluginList.find(p => p.name === n) || null };
      for (const p of pluginList) result[p.name] = p;
      return result;
    }
  });

  // \u2500\u2500\u2500 3. \u4F2A\u88C5 languages\uFF08\u4E0E\u771F\u5B9E Chrome \u5BF9\u9F50\uFF09 \u2500\u2500\u2500
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'zh-CN'] });

  // \u2500\u2500\u2500 4. \u9690\u85CF AutomationControlled \u75D5\u8FF9 \u2500\u2500\u2500
  if (window.chrome) {
    // \u786E\u4FDD chrome.runtime \u5B58\u5728\uFF08\u771F\u5B9E\u6D4F\u89C8\u5668\u4E2D\u8BE5\u5BF9\u8C61\u5B58\u5728\uFF09
    if (!window.chrome.runtime) {
      Object.defineProperty(window.chrome, 'runtime', { value: {} });
    }
  }

  // \u2500\u2500\u2500 5. \u4FEE\u6539 permissions \u62A5\u544A\uFF08\u907F\u514D\u8FD4\u56DE denied \u88AB\u8BC6\u522B\uFF09 \u2500\u2500\u2500
  const originalQuery = window.navigator.permissions && window.navigator.permissions.query;
  if (originalQuery) {
    window.navigator.permissions.query = (parameters) => (
      parameters && parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)
    );
  }

  // \u2500\u2500\u2500 6. \u5168\u7EA7 stealth\uFF1A\u66F4\u591A\u6307\u7EB9\u4F2A\u88C5 \u2500\u2500\u2500
  ${this.options.level === "full" ? `
  // \u4F2A\u88C5 console.debug \u4E0D\u4EA7\u751F\u552F\u4E00\u8C03\u7528\u6808
  // \u4F2A\u88C5 window.outerWidth/outerHeight\uFF08headless \u6D4F\u89C8\u5668\u7A97\u53E3\u5C3A\u5BF8\u5DEE\u5F02\uFF09
  Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth || 1920 });
  Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight || 1080 });

  // \u4F2A\u88C5 screen \u53C2\u6570
  Object.defineProperty(window.screen, 'colorDepth', { get: () => 24 });
  Object.defineProperty(window.screen, 'pixelDepth', { get: () => 24 });

  // \u4F2A\u88C5\u7F6E\u89E6\u6478\u652F\u6301\uFF08\u907F\u514D headless \u68C0\u6D4B\u5230\u65E0\u89E6\u6478\u80FD\u529B\uFF09
  if (!('ontouchstart' in window)) {
    Object.defineProperty(window, 'ontouchstart', { value: null });
  }

  // \u4F2A\u88C5 DeviceMemory \u548C HardwareConcurrency
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

  // \u4F2A\u88C5 WebGL \u6E32\u67D3\u5668\uFF08\u907F\u514D\u66B4\u9732 SwiftShader \u7B49\u65E0\u5934\u6E32\u67D3\u5668\uFF09
  try {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Google Inc. (NVIDIA)';
      if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)';
      return getParameter.call(this, parameter);
    };
  } catch (e) {}
  ` : ""}
})();`;
  }
  /**
   * 人类行为模拟 —— 生成随机的人类化动作间隔。
   * 调用方在动作之间使用该间隔，模拟人的操作节奏。
   */
  humanDelay() {
    if (!this.options.enabled) return 0;
    const [min, max] = this.options.humanActionDelay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  /** 人类打字延迟（type 动作时逐键之间的随机间隔） */
  humanTypingDelayMs() {
    if (!this.options.enabled) return 0;
    const [min, max] = this.options.humanTypingDelay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  /**
   * 生成人类化的鼠标移动路径（贝塞尔曲线插值）。
   * 返回一组 [[x,y], ...] 坐标序列，供调用方依次移动鼠标。
   */
  humanMousePath(from, to, steps = 12) {
    if (!this.options.enabled || !this.options.humanMouseTrajectory) {
      return [[to.x, to.y]];
    }
    const path = [];
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / steps;
      const controlX = (from.x + to.x) / 2 + (Math.random() - 0.5) * 40;
      const controlY = Math.min(from.y, to.y) - Math.random() * 30;
      const x = (1 - t) ** 2 * from.x + 2 * (1 - t) * t * controlX + t ** 2 * to.x;
      const y = (1 - t) ** 2 * from.y + 2 * (1 - t) * t * controlY + t ** 2 * to.y;
      path.push([Math.round(x), Math.round(y)]);
    }
    return path;
  }
  /** 生成唯一签名标识（用于标记 stealth 开启状态） */
  get signature() {
    if (!this.options.enabled) return "stealth-off";
    return `stealth:${this.options.level}:ua=${this.options.userAgent ? "custom" : "default"}`;
  }
};

// packages/engines/src/playwright-engine.ts
var PlaywrightEngine = class {
  name = "playwright+cdp";
  browser;
  context;
  page;
  locator;
  snapshotBuilder;
  diagnostics;
  options;
  /** 防检测管理器 */
  stealth;
  constructor(options = {}) {
    this.options = { headless: true, viewport: { width: 1280, height: 800 }, ...options };
    if (this.options.stealth instanceof StealthManager) {
      this.stealth = this.options.stealth;
    } else if (this.options.stealth) {
      this.stealth = new StealthManager(this.options.stealth);
    }
  }
  /** 当前 stealth 是否启用 */
  get stealthEnabled() {
    return this.stealth?.isEnabled ?? false;
  }
  async init() {
    const launchArgs = this.stealth?.buildLaunchArgs() ?? [];
    if (this.options.connectUrl) {
      this.browser = await chromium.connectOverCDP(this.options.connectUrl);
    } else {
      this.browser = await chromium.launch({
        headless: this.options.headless,
        executablePath: this.options.executablePath,
        args: launchArgs.length ? launchArgs : void 0
      });
    }
    const ctxOptions = { viewport: this.options.viewport };
    if (this.stealth?.isEnabled) {
      const initScript = this.stealth.buildInitScript();
      if (initScript) ctxOptions.initScript = initScript;
      if (this.stealth.options.userAgent) ctxOptions.userAgent = this.stealth.options.userAgent;
    }
    this.context = this.browser.contexts()[0] || await this.browser.newContext(ctxOptions);
    this.page = this.context.pages()[0] || await this.context.newPage();
    this.diagnostics = new PlaywrightDiagnostics(this.page);
    this.snapshotBuilder = new SnapshotBuilder(this.page);
    this.locator = new ElementLocator(this.page, {
      // 语义定位链路：aria/placeholder 兜底失败后，基于快照做中文分词+语义相似度匹配
      resolve: async (semantic) => {
        const snap = await this.snapshotBuilder.build({ maxNodes: 200, maxTextLength: 80 });
        const hit = locateBySemantic(snap, semantic);
        if (hit && (hit.ref || hit.selector)) {
          return { ref: hit.ref, text: hit.text, selector: hit.selector };
        }
        return null;
      }
    });
  }
  async close() {
    await this.browser?.close();
  }
  async execute(action) {
    if (!this.page) throw new Error("\u5F15\u64CE\u672A\u521D\u59CB\u5316\uFF0C\u8BF7\u5148\u8C03\u7528 init()");
    const t0 = Date.now();
    switch (action.type) {
      case "navigate": {
        await this.page.goto(action.url, { waitUntil: action.waitUntil ?? "networkidle", timeout: 3e4 });
        this.diagnostics?.network.record({
          url: action.url,
          method: "NAV",
          status: 200,
          durationMs: Date.now() - t0
        });
        return { ok: true, type: "navigate", summary: `\u5DF2\u5BFC\u822A\u5230 ${action.url}`, durationMs: Date.now() - t0 };
      }
      case "click": {
        const { locator, strategy, anchorSelector } = await this.locator.locate({
          ref: action.ref,
          selector: action.selector,
          text: action.text,
          semantic: action.semantic
        });
        const waitForNavigation = action.waitForNavigation ?? true;
        const isLink = await locator.evaluate((el) => el.tagName.toLowerCase() === "a" && !!el.getAttribute("href")).catch(() => false);
        const navPromise = waitForNavigation && isLink ? this.page.waitForNavigation({ waitUntil: "load", timeout: 15e3 }).catch(() => null) : null;
        await locator.click({
          button: action.button,
          clickCount: action.clickCount,
          force: action.force,
          timeout: 15e3
        });
        if (navPromise) await navPromise;
        return {
          ok: true,
          type: "click",
          summary: `\u5DF2\u70B9\u51FB\uFF08\u7B56\u7565=${strategy} \u951A\u70B9=${anchorSelector}${navPromise ? ",\u5DF2\u7B49\u5F85\u5BFC\u822A\u7A33\u5B9A" : ""}\uFF09`,
          durationMs: Date.now() - t0
        };
      }
      case "fill": {
        const { locator, strategy } = await this.locator.locate({
          ref: action.ref,
          selector: action.selector,
          text: action.text,
          semantic: action.semantic
        });
        await locator.fill(action.value);
        return {
          ok: true,
          type: "fill",
          summary: `\u5DF2\u586B\u5165\u5185\u5BB9\uFF08\u7B56\u7565=${strategy}\uFF09`,
          durationMs: Date.now() - t0
        };
      }
      case "type": {
        const { locator, strategy } = await this.locator.locate({
          ref: action.ref,
          selector: action.selector,
          text: action.text
        });
        await locator.click();
        const delay = action.delay ?? (this.stealth?.isEnabled ? this.stealth.humanTypingDelayMs() : void 0);
        await this.page.keyboard.type(action.value, { delay: delay ?? 0 });
        return {
          ok: true,
          type: "type",
          summary: `\u5DF2\u9010\u952E\u8F93\u5165\uFF08\u7B56\u7565=${strategy}${this.stealth?.isEnabled ? ",stealth\u5EF6\u8FDF" : ""}\uFF09`,
          durationMs: Date.now() - t0
        };
      }
      case "select": {
        const { locator, strategy } = await this.locator.locate({
          ref: action.ref,
          selector: action.selector
        });
        await locator.selectOption(action.value);
        return {
          ok: true,
          type: "select",
          summary: `\u5DF2\u9009\u62E9\u9009\u9879\uFF08\u7B56\u7565=${strategy}\uFF09`,
          durationMs: Date.now() - t0
        };
      }
      case "extract": {
        const { locator } = await this.locator.locate({
          ref: action.ref,
          selector: action.selector,
          text: action.text,
          semantic: action.semantic
        });
        const data = await locator.evaluate((el) => {
          const clone = el.cloneNode(true);
          const text = (clone.innerText || clone.textContent || "").replace(/\s+/g, " ").trim();
          return { text: text.slice(0, 2e3) };
        });
        return { ok: true, type: "extract", summary: "\u63D0\u53D6\u5B8C\u6210", data, durationMs: Date.now() - t0 };
      }
      case "assert": {
        const { locator } = await this.locator.locate({
          ref: action.ref,
          selector: action.selector,
          text: action.text,
          semantic: action.semantic
        });
        const count = await locator.count();
        if (count === 0) {
          return { ok: false, type: "assert", summary: `\u65AD\u8A00\u5931\u8D25\uFF1A\u672A\u627E\u5230\u76EE\u6807\u5143\u7D20`, durationMs: Date.now() - t0 };
        }
        const el = locator.first();
        const visible = await el.isVisible().catch(() => false);
        const text = await el.innerText().catch(() => "") || "";
        let pass = true;
        let detail = "";
        switch (action.mode) {
          case "visible":
            pass = visible;
            detail = `\u53EF\u89C1=${visible}`;
            break;
          case "exists":
            pass = true;
            break;
          case "hidden":
            pass = !visible;
            break;
          case "text-contains":
            pass = action.expected ? text.includes(action.expected) : false;
            detail = `\u6587\u672C\u5305\u542B'${action.expected}'=${pass} \u5B9E\u9645='${text.slice(0, 50)}'`;
            break;
          case "enabled":
            pass = await el.isEnabled().catch(() => false);
            break;
          default:
            pass = visible;
        }
        return {
          ok: pass,
          type: "assert",
          summary: `\u65AD\u8A00${pass ? "\u901A\u8FC7" : "\u5931\u8D25"}: ${action.mode} ${detail}`,
          durationMs: Date.now() - t0
        };
      }
      case "screenshot": {
        const buf = action.fullPage ? await this.page.screenshot({ fullPage: true, clip: action.clip }) : await this.page.screenshot({ clip: action.clip });
        const base64 = buf.toString("base64");
        return {
          ok: true,
          type: "screenshot",
          summary: `\u5DF2\u622A\u56FE (${base64.length * 0.75 / 1024}KB, ${base64.length} b64)`,
          data: { base64 },
          durationMs: Date.now() - t0
        };
      }
      case "hover": {
        const { locator } = await this.locator.locate({ ref: action.ref, selector: action.selector });
        await locator.hover();
        return { ok: true, type: "hover", summary: "\u5DF2\u60AC\u505C", durationMs: Date.now() - t0 };
      }
      case "scroll": {
        await this.page.mouse.wheel(0, action.deltaY ?? 600);
        return { ok: true, type: "scroll", summary: "\u5DF2\u6EDA\u52A8", durationMs: Date.now() - t0 };
      }
      case "wait": {
        await this.page.waitForTimeout(action.ms ?? 1e3);
        return { ok: true, type: "wait", summary: "\u5DF2\u7B49\u5F85", durationMs: Date.now() - t0 };
      }
      case "evaluate": {
        const result = await this.page.evaluate(action.script);
        return { ok: true, type: "evaluate", summary: "JS \u6267\u884C\u5B8C\u6210", data: result, durationMs: Date.now() - t0 };
      }
      case "press": {
        await this.page.keyboard.press(action.key ?? "Enter");
        return { ok: true, type: "press", summary: `\u5DF2\u6309\u952E ${action.key}`, durationMs: Date.now() - t0 };
      }
      default: {
        const a = action;
        return { ok: false, type: a.type, summary: `\u4E0D\u652F\u6301\u7684 action: ${a.type}`, durationMs: Date.now() - t0 };
      }
    }
  }
  async snapshot(options) {
    return this.snapshotBuilder.build(options);
  }
  async diagnose() {
    const collectors = this.diagnostics.collectors();
    const collected = await Promise.all(
      collectors.map(async (c) => ({ category: c.category, refs: await c.collect() }))
    );
    const byCat = (cat) => collected.find((c) => c.category === cat)?.refs ?? [];
    return {
      console: byCat("console"),
      network: byCat("network"),
      dom: byCat("dom"),
      performance: byCat("performance"),
      jsExceptions: byCat("js-exception"),
      accessibility: byCat("accessibility")
    };
  }
  async collectConsole() {
    return this.diagnostics.console.collect();
  }
  async collectNetwork() {
    return this.diagnostics.network.collect();
  }
  async evaluate(script) {
    return this.page.evaluate(script);
  }
};

// packages/token/src/index.ts
function compactSnapshot(snapshot, maxInteractive = 40) {
  const parts = [];
  parts.push(`[${snapshot.title}] ${snapshot.url}`);
  const rows = snapshot.interactive.slice(0, maxInteractive).map(
    (el) => `${el.ref}:${el.tag}${el.role ? "[" + el.role + "]" : ""}:"${el.text.slice(0, 60)}"`
  );
  parts.push(rows.join("\n"));
  return parts.join("\n");
}

// packages/mcp-server/src/security.ts
var SENSITIVE_KEYS = [
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "client_secret",
  "password",
  "passwd",
  "pwd",
  "apikey",
  "api_key",
  "api-key",
  "auth",
  "authorization",
  "cookie",
  "set-cookie",
  "sessionid",
  "sid",
  "key",
  "private_key",
  "privatekey",
  "signature",
  "credential",
  "credentials",
  "x-api-key",
  "x-auth-token",
  "jwt"
];
function isSensitiveKey(key) {
  const k = key.toLowerCase();
  if (k === "session" || k === "sessionid" || k === "sid") return false;
  return SENSITIVE_KEYS.some((s) => k.includes(s));
}
function mask(value) {
  if (!value) return value;
  if (value.length <= 2) return "****";
  const head = value.slice(0, 2);
  const tail = value.length > 6 ? value.slice(-2) : "";
  return `${head}****${tail} (${value.length} chars)`;
}
function redactDeep(value, depth = 0, maxDepth = 12) {
  if (depth > maxDepth) return void 0;
  if (value === null || value === void 0) return value;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((v) => redactDeep(v, depth + 1, maxDepth));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (isSensitiveKey(k)) {
        out[k] = typeof v === "string" ? mask(v) : "***REDACTED***";
      } else {
        out[k] = redactDeep(v, depth + 1, maxDepth);
      }
    }
    return out;
  }
  return value;
}
function redactUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    for (const key of [...u.searchParams.keys()]) {
      if (isSensitiveKey(key)) {
        const v = u.searchParams.get(key) ?? "";
        u.searchParams.set(key, mask(v));
      }
    }
    if (u.hash && /(token|access_token|secret|auth)=/i.test(u.hash)) {
      u.hash = "###REDACTED###";
    }
    if (u.username || u.password) {
      u.username = "***";
      u.password = "***";
    }
    return u.toString();
  } catch {
    return rawUrl.replace(
      /([?&](token|password|passwd|secret|api[_-]?key|auth|access_token|refresh_token|client_secret)=)[^&]*/gi,
      "$1***REDACTED***"
    );
  }
}
var DANGEROUS_JS_PATTERNS = [
  { label: "\u6587\u4EF6\u7CFB\u7EDF\u8BBF\u95EE", re: /require\s*\(\s*['"]fs['"]|node:fs|readFile|writeFile|rmSync|unlinkSync/i },
  { label: "\u5B50\u8FDB\u7A0B\u6267\u884C", re: /child_process|execSync|spawnSync|\bexec\s*\(|process\.exec/i },
  { label: "\u7F51\u7EDC\u6E17\u900F", re: /process\.env|__proto__|constructor\s*\(\s*['"]constructor/i },
  { label: "\u6D4F\u89C8\u5668\u6F0F\u6D1E\u5229\u7528", re: /exploit|bypass|bypass.*security|disable.*security|certificate/i }
];
function guardJsScript(script) {
  const blockedReasons = [];
  for (const { label, re } of DANGEROUS_JS_PATTERNS) {
    if (re.test(script)) blockedReasons.push(label);
  }
  return {
    allowed: blockedReasons.length === 0,
    blocked: blockedReasons.length > 0,
    reasons: blockedReasons
  };
}
function redactText(raw) {
  if (!raw) return raw;
  return raw.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1***REDACTED***").replace(/(Authorization\s*[:=]\s*)(?:Bearer\s+)?[A-Za-z0-9._~+/=-]+/gi, "$1***REDACTED***").replace(/([?&](?:token|password|passwd|secret|api[_-]?key|access_token|refresh_token|client_secret|auth)=)[^&\s"']+/gi, "$1***REDACTED***").replace(/(password\s*[:=]\s*['"]?)[^'"\s,;]+/gi, "$1***REDACTED***");
}

// packages/mcp-server/src/logger.ts
var SessionLogger = class {
  sessionId;
  events = [];
  listeners = /* @__PURE__ */ new Set();
  seq = 0;
  maxEvents;
  enabled;
  constructor(opts = {}) {
    this.sessionId = opts.sessionId ?? `sess_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    this.maxEvents = opts.maxEvents ?? 2e3;
    this.enabled = opts.enabled ?? true;
  }
  /** 订阅实时事件，返回取消订阅函数 */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /** 记录一条通用日志事件 */
  log(entry) {
    const event = {
      seq: this.nextSeq(),
      ts: Date.now(),
      level: entry.level ?? "info",
      category: entry.category ?? "log",
      message: entry.message,
      payload: entry.payload,
      sessionId: this.sessionId
    };
    return this.emit(event);
  }
  /** 记录一条标准错误事件（带报错原因与解释，交给外部 AI） */
  error(err) {
    const { message, level, payload, ...error } = err;
    const event = {
      seq: this.nextSeq(),
      ts: Date.now(),
      level: level ?? "error",
      category: "error",
      message,
      error,
      payload,
      sessionId: this.sessionId
    };
    return this.emit(event);
  }
  /** 记录一条截图/图片事件 */
  screenshot(img) {
    const byteLength = img.dataUri.replace(/^data:image\/png;base64,/, "").length;
    const event = {
      seq: this.nextSeq(),
      ts: Date.now(),
      level: "info",
      category: "screenshot",
      message: img.caption ?? `\u622A\u56FE\u5DF2\u91C7\u96C6 (${byteLength * 0.75 / 1024}KB)`,
      image: {
        dataUri: img.dataUri,
        byteLength,
        fullPage: img.fullPage ?? false,
        caption: img.caption
      },
      sessionId: this.sessionId
    };
    return this.emit(event);
  }
  /** 记录系统生命周期事件 */
  system(message, payload) {
    return this.log({ level: "info", category: "system", message, payload });
  }
  /** 记录一次动作执行事件 */
  action(message, payload) {
    return this.log({ level: "info", category: "action", message, payload });
  }
  /** 记录一次诊断事件 */
  diagnose(message, payload) {
    return this.log({ level: "info", category: "diagnose", message, payload });
  }
  /** 获取全部历史事件（快照） */
  toArray() {
    return this.events.slice();
  }
  /** 按类别过滤事件 */
  filter(category) {
    const cats = Array.isArray(category) ? category : [category];
    return this.events.filter((e) => cats.includes(e.category));
  }
  /** 清空事件流 */
  clear() {
    this.events = [];
    this.seq = 0;
  }
  /** 导出为 markdown（供外部 AI / PR 评论 / 制品消费），对消息与 payload 脱敏防令牌泄露 */
  exportMarkdown(opts = {}) {
    const lines = [];
    lines.push(`# ${opts.title ?? "Forge \u4F1A\u8BDD\u4E8B\u4EF6\u65E5\u5FD7"}`);
    lines.push(`**Session**: ${this.sessionId} | **\u4E8B\u4EF6\u6570**: ${this.events.length}`);
    lines.push("");
    for (const e of this.events) {
      const t = new Date(e.ts).toISOString().replace("T", " ").slice(0, 19);
      const tag = `[${e.level.toUpperCase()}/${e.category}]`;
      const msg = redactText(e.message);
      if (e.category === "error") {
        const err = e.error;
        lines.push(`- \`${t}\` **${tag}** ${msg}`);
        lines.push(`  - \u9519\u8BEF\u7801: \`${err.code}\` | \u6839\u56E0: ${err.reason}`);
        if (err.explanation) lines.push(`  - \u539F\u56E0: ${redactText(err.explanation)}`);
        if (err.suggestion) lines.push(`  - \u5EFA\u8BAE: ${redactText(err.suggestion)}`);
      } else if (e.category === "screenshot") {
        const img = e.image;
        lines.push(`- \`${t}\` **${tag}** ${msg}`);
        if (opts.includeScreenshots) {
          lines.push(`  - ![\u622A\u56FE](./forge-event-${e.seq}.png)`);
        }
      } else {
        lines.push(`- \`${t}\` **${tag}** ${msg}`);
      }
      if (e.payload && Object.keys(e.payload).length) {
        const p = JSON.stringify(redactDeep(e.payload));
        if (p.length <= 400) lines.push(`  - payload: \`${p}\``);
      }
    }
    return lines.join("\n");
  }
  /** 生成纯文本执行轨迹（供日志/终端） */
  toTimeline() {
    return this.events.map((e) => {
      const t = new Date(e.ts).toISOString().replace("T", " ").slice(11, 19);
      return `${t} [${e.level}] ${e.category}: ${e.message}`;
    }).join("\n");
  }
  nextSeq() {
    return ++this.seq;
  }
  emit(event) {
    if (!this.enabled) return event;
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(this.events.length - this.maxEvents);
    }
    for (const l of this.listeners) {
      try {
        l(event);
      } catch {
      }
    }
    return event;
  }
};

// packages/mcp-server/src/forge-mcp.ts
var ForgeMcp = class {
  constructor(opts = {}) {
    this.opts = opts;
    this.logger = opts.logger ?? new SessionLogger({ maxEvents: opts.maxEvents });
  }
  opts;
  tools = TOOLS;
  /** 会话事件日志器 —— 供外部 AI / IDE 订阅和拉取事件流 */
  logger;
  browser;
  diagnosis;
  /** 生命周期：确保浏览器已就绪 */
  async ensureBrowser() {
    if (!this.browser) {
      const engine = new PlaywrightEngine({
        headless: this.opts.headless ?? true,
        connectUrl: this.opts.connectUrl,
        stealth: this.opts.stealth
      });
      this.browser = new ForgeBrowser(engine);
      await this.browser.start();
    }
    return this.browser;
  }
  /** 核心：分发工具调用 */
  async callTool(name2, args) {
    const t0 = Date.now();
    try {
      this.logger.log({ level: "debug", category: "system", message: `\u8C03\u7528\u5DE5\u5177 ${name2}`, payload: { args: this.safeArgs(args) } });
      let result;
      switch (name2) {
        case "observe": {
          const b = await this.ensureBrowser();
          const snap = await b.observe({ maxNodes: args.maxNodes ?? 200, maxTextLength: args.maxTextLength ?? 80 });
          result = okResult(compactSnapshot(snap), { url: snap.url, title: snap.title, stats: snap.stats });
          this.logger.log({ category: "action", message: `observe ${snap.url} (${snap.stats?.emittedNodes ?? 0} \u53EF\u4EA4\u4E92\u8282\u70B9)` });
          break;
        }
        case "act": {
          const b = await this.ensureBrowser();
          const action = this.normalizeAction(args);
          const actResult = await b.act(action);
          const lines = [`\u52A8\u4F5C: ${actResult.type}`];
          if (actResult.ok) {
            lines.push(`\u2713 ${actResult.summary}`);
            if (actResult.diagnostics?.length) {
              lines.push(`\u26A0 \u52A8\u4F5C\u540E\u68C0\u6D4B\u5230 ${actResult.diagnostics.length} \u6761\u9875\u9762\u5F02\u5E38:`);
              for (const d of actResult.diagnostics.slice(0, 5)) lines.push(`  - [${d.kind}] ${d.message}`);
            }
          } else {
            lines.push(`\u2717 ${actResult.summary}`);
          }
          lines.push(`\u8017\u65F6 ${actResult.durationMs}ms`);
          result = actResult.ok ? okResult(lines.join("\n"), { data: actResult.data }) : errResult(lines.join("\n"));
          if (actResult.ok) {
            this.logger.action(`\u52A8\u4F5C ${actResult.type} \u6210\u529F: ${actResult.summary}`, { type: actResult.type, durationMs: actResult.durationMs });
            if (actResult.diagnostics?.length) {
              this.logger.diagnose(`\u52A8\u4F5C\u540E\u68C0\u6D4B\u5230 ${actResult.diagnostics.length} \u6761\u9875\u9762\u5F02\u5E38`, {
                items: actResult.diagnostics.slice(0, 5).map((d) => ({ kind: d.kind, message: d.message }))
              });
            }
          } else {
            this.logger.error({
              message: `\u52A8\u4F5C ${actResult.type} \u5931\u8D25: ${actResult.summary}`,
              code: this.mapErrorCode(actResult.type),
              reason: this.mapErrorReason(actResult.summary, actResult.diagnostics),
              raw: actResult.summary,
              explanation: this.buildExplanation(actResult.summary, actResult.diagnostics),
              suggestion: this.buildSuggestion(actResult.summary),
              detail: actResult.error,
              findings: (actResult.diagnostics ?? []).slice(0, 5).map((d) => ({
                category: d.kind,
                severity: d.severity,
                message: d.message
              }))
            });
          }
          break;
        }
        case "diagnose": {
          const b = await this.ensureBrowser();
          const report = await b.captureDiagnostics();
          const { summarize: summarize2 } = await Promise.resolve().then(() => (init_src(), src_exports));
          const summary = summarize2(report);
          const lines = [`# \u8BCA\u65AD\u7ED3\u679C (${summary.healthy ? "\u5065\u5EB7" : "\u5B58\u5728\u95EE\u9898"})`];
          if (summary.issues.length === 0) {
            lines.push("\u672A\u53D1\u73B0\u9519\u8BEF\uFF0C\u9875\u9762\u8FD0\u884C\u6B63\u5E38\u3002");
          }
          for (const issue of summary.issues) {
            lines.push(`- [${issue.category}/${issue.severity}] ${issue.message}`);
          }
          if (summary.suggestions.length) {
            lines.push(`
## \u5EFA\u8BAE`);
            summary.suggestions.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
          }
          result = okResult(lines.join("\n"), {
            issues: summary.issues,
            console: report.console.length,
            network: report.network.length,
            dom: report.dom.length,
            jsExceptions: report.jsExceptions.length
          });
          this.logger.diagnose(`\u8BCA\u65AD\u5B8C\u6210: ${summary.healthy ? "\u5065\u5EB7" : `${summary.issues.length} \u6761\u95EE\u9898`}`, {
            healthy: summary.healthy,
            issues: summary.issues.length,
            suggestions: summary.suggestions.length
          });
          break;
        }
        case "eval": {
          const b = await this.ensureBrowser();
          const script = String(args.script);
          const guard = guardJsScript(script);
          if (guard.blocked) {
            result = errResult(
              `eval \u88AB\u5B89\u5168\u62E6\u622A\uFF1A\u811A\u672C\u547D\u4E2D\u9AD8\u5371\u64CD\u4F5C [${(guard.reasons ?? []).join(", ")}]\u3002
\u4E3A\u9632\u63D0\u6743/\u6E17\u900F\uFF0C\u7981\u6B62\u901A\u8FC7 eval \u6CE8\u5165\u6587\u4EF6\u7CFB\u7EDF\u8BBF\u95EE\u3001\u5B50\u8FDB\u7A0B\u6267\u884C\u6216\u7CFB\u7EDF\u7EA7\u64CD\u4F5C\u3002`
            );
            this.logger.error({
              message: `eval \u88AB\u5B89\u5168\u62E6\u622A: ${guard.reasons?.join(", ")}`,
              code: "EVAL_BLOCKED",
              reason: "dangerous-script",
              raw: script.slice(0, 300),
              explanation: "\u68C0\u6D4B\u5230\u9AD8\u5371\u6CE8\u5165\u811A\u672C\uFF0C\u4E3A\u9632\u63D0\u6743/\u6E17\u900F\u5DF2\u62D2\u7EDD\u6267\u884C\u3002",
              suggestion: "\u79FB\u9664\u6587\u4EF6\u7CFB\u7EDF/\u5B50\u8FDB\u7A0B/\u7CFB\u7EDF\u7EA7\u8BBF\u95EE\u4EE3\u7801\uFF0C\u4EC5\u4FDD\u7559\u9875\u9762\u5185\u7684 DOM/JS \u8BCA\u65AD\u3002"
            });
            break;
          }
          const evalResult = await b.eval(script);
          const sanitizedResult = redactDeep(evalResult);
          result = okResult(`\u6267\u884C\u7ED3\u679C: ${JSON.stringify(sanitizedResult)?.slice(0, 2e3)}`, { result: sanitizedResult });
          this.logger.log({ category: "action", message: "eval \u6267\u884C" });
          break;
        }
        case "screenshot": {
          const b = await this.ensureBrowser();
          const shot = await b.act({ type: "screenshot", fullPage: !!args.fullPage });
          const base64 = shot.data?.base64;
          const dataUri = `data:image/png;base64,${base64}`;
          result = okResult(shot.summary, { image: dataUri });
          this.logger.screenshot({
            dataUri,
            fullPage: !!args.fullPage,
            caption: args.caption ? String(args.caption) : shot.summary
          });
          break;
        }
        case "session_log": {
          const events = this.logger.toArray();
          const format = String(args.format ?? "markdown");
          if (format === "json") {
            result = okResult(`\u5171 ${events.length} \u6761\u4E8B\u4EF6`, { events: redactDeep(events) });
          } else {
            const md = this.logger.exportMarkdown({ title: args.title ? String(args.title) : void 0 });
            result = okResult(md, { eventCount: events.length });
          }
          break;
        }
        case "close": {
          if (this.browser) {
            await this.browser.stop();
            this.browser = void 0;
          }
          result = okResult("\u6D4F\u89C8\u5668\u5DF2\u5173\u95ED");
          this.logger.system("\u6D4F\u89C8\u5668\u5DF2\u5173\u95ED");
          break;
        }
        case "stealth_status": {
          const stealthOpts = this.opts.stealth;
          const enabled = stealthOpts?.enabled ?? false;
          const level = stealthOpts?.level ?? "basic";
          const ua = stealthOpts?.userAgent ?? "default";
          const lines = [
            `# \u9632\u68C0\u6D4B\uFF08Stealth\uFF09\u72B6\u6001`,
            `- **\u542F\u7528**: ${enabled ? "\u2705 \u662F" : "\u274C \u5426"}`,
            `- **\u7EA7\u522B**: ${level}`,
            `- **User-Agent**: ${ua}`,
            ``,
            enabled ? "> Stealth \u5DF2\u542F\u7528\uFF1A\u53CD\u6307\u7EB9\u6CE8\u5165\u3001\u81EA\u52A8\u5316\u63A7\u5236\u9690\u85CF\u3001\u4EBA\u7C7B\u884C\u4E3A\u6A21\u62DF\u5747\u751F\u6548\u3002" : "> Stealth \u672A\u542F\u7528\u3002\u82E5\u91C7\u96C6\u516C\u5F00\u6570\u636E\u65F6\u88AB\u9650\u901F/\u5C01\u7981\uFF0C\u53EF\u901A\u8FC7 `stealth.enabled=true` \u5728\u521D\u59CB\u5316\u65F6\u5F00\u542F\u3002"
          ];
          result = okResult(lines.join("\n"), { enabled, level, ua });
          this.logger.log({ category: "system", message: `\u67E5\u8BE2 stealth \u72B6\u6001: ${enabled ? "enabled" : "disabled"}` });
          break;
        }
        default:
          result = errResult(`\u672A\u77E5\u5DE5\u5177: ${name2}\u3002\u53EF\u7528\u5DE5\u5177: ${TOOLS.map((t) => t.name).join(", ")}`);
      }
      result = this.attachEvents(result, name2);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error({
        message: `\u5DE5\u5177 ${name2} \u6267\u884C\u5F02\u5E38: ${msg}`,
        code: "TOOL_EXCEPTION",
        reason: "uncaught-exception",
        raw: msg,
        explanation: `\u5DE5\u5177 ${name2} \u5728\u6267\u884C\u65F6\u629B\u51FA\u672A\u6355\u83B7\u5F02\u5E38\u3002`,
        suggestion: "\u68C0\u67E5\u53C2\u6570\u662F\u5426\u5408\u6CD5\u3001\u6D4F\u89C8\u5668\u662F\u5426\u53EF\u7528\u3001\u7F51\u7EDC\u662F\u5426\u8FDE\u901A\uFF1B\u53EF\u5148 observe \u786E\u8BA4\u9875\u9762\u72B6\u6001\u3002",
        detail: err instanceof Error && err.stack ? err.stack.slice(0, 500) : void 0
      });
      const result = this.attachEvents(errResult(`\u5DE5\u5177\u6267\u884C\u5931\u8D25: ${msg}`), name2);
      return result;
    }
  }
  /** 把最近事件附加到 ToolResult.structured，供外部 AI 消费事件流 */
  attachEvents(result, _name) {
    if (!result.structured) result.structured = {};
    const events = this.logger.toArray().slice(-30);
    result.structured.events = events;
    result.structured.sessionId = this.logger.sessionId;
    return result;
  }
  /** 隐藏敏感参数（避免把 value/script/url 中的敏感信息全文塞入日志） */
  safeArgs(args) {
    const safe = {};
    for (const [k, v] of Object.entries(args)) {
      if (k === "value" || k === "script") safe[k] = typeof v === "string" ? `<${v.length} chars>` : v;
      else if (k === "url" && typeof v === "string") safe[k] = redactUrl(v);
      else if (k === "expected" && typeof v === "string") safe[k] = v.length > 60 ? `${v.slice(0, 60)}...` : v;
      else safe[k] = v;
    }
    return safe;
  }
  /** 动作类型 -> 稳定错误码 */
  mapErrorCode(type) {
    return `ACTION_FAILED_${type.toUpperCase()}`;
  }
  /** 从摘要/诊断推断根因分类 */
  mapErrorReason(summary, diagnostics) {
    const s = summary.toLowerCase();
    if (s.includes("timeout") || s.includes("\u8D85\u65F6")) return "timeout";
    if (s.includes("404") || s.includes("500") || s.includes("network") || s.includes("\u7F51\u7EDC")) return "network-failure";
    if (s.includes("not found") || s.includes("\u627E\u4E0D\u5230") || s.includes("\u65E0\u6CD5\u5B9A\u4F4D") || s.includes("\u672A\u627E\u5230") || s.includes("locator")) return "locator-not-found";
    if (diagnostics?.some((d) => d.kind === "js-exception")) return "js-exception";
    if (diagnostics?.some((d) => d.kind === "dom")) return "dom-unrendered";
    return "action-failed";
  }
  /** 面向 AI 的根因解释 */
  buildExplanation(summary, diagnostics) {
    const reason = this.mapErrorReason(summary, diagnostics);
    const extras = (diagnostics ?? []).slice(0, 3).map((d) => d.message).join("; ");
    switch (reason) {
      case "locator-not-found":
        return `\u9875\u9762\u4E2D\u672A\u627E\u5230\u76EE\u6807\u5143\u7D20\u3002${extras ? `\u8BCA\u65AD\u63D0\u793A: ${extras}` : "\u53EF\u80FD\u662F\u5143\u7D20\u672A\u6E32\u67D3\u3001\u9009\u62E9\u5668\u53D8\u5316\u3001\u6216\u9875\u9762\u8FD8\u5728\u52A0\u8F7D\u3002"}`;
      case "timeout":
        return `\u64CD\u4F5C\u8D85\u65F6\uFF0C\u5143\u7D20\u6216\u5BFC\u822A\u5728\u9650\u5B9A\u65F6\u95F4\u5185\u672A\u5C31\u7EEA\u3002${extras ? `\u8BCA\u65AD\u63D0\u793A: ${extras}` : ""}`;
      case "network-failure":
        return `\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25\u6216\u76EE\u6807\u4E0D\u53EF\u8FBE\u3002${extras ? `\u8BCA\u65AD\u63D0\u793A: ${extras}` : ""}`;
      case "js-exception":
        return `\u9875\u9762\u629B\u51FA\u4E86 JS \u672A\u6355\u83B7\u5F02\u5E38\uFF0C\u53EF\u80FD\u963B\u65AD\u4EA4\u4E92\u3002${extras ? `\u8BCA\u65AD\u63D0\u793A: ${extras}` : ""}`;
      case "dom-unrendered":
        return `\u9875\u9762 DOM \u672A\u6B63\u5E38\u6E32\u67D3\uFF08\u767D\u5C4F/\u672A\u6302\u8F7D\uFF09\uFF0C\u521D\u59CB\u5316 JS \u53EF\u80FD\u51FA\u9519\u3002`;
      default:
        return `\u52A8\u4F5C\u6267\u884C\u5931\u8D25: ${summary.slice(0, 200)}`;
    }
  }
  /** 可行动的修复建议 */
  buildSuggestion(summary) {
    const reason = this.mapErrorReason(summary);
    switch (reason) {
      case "locator-not-found":
        return "\u5148 observe \u67E5\u770B\u5F53\u524D DOM\uFF0C\u5207\u6362\u5B9A\u4F4D\u7B56\u7565(ref\u2192selector\u2192text\u2192semantic)\uFF0C\u6216 wait \u5143\u7D20\u5C31\u7EEA\u540E\u91CD\u8BD5\u3002";
      case "timeout":
        return "\u68C0\u67E5\u9875\u9762\u52A0\u8F7D/\u7F51\u7EDC\uFF0C\u53EF\u5EF6\u957F wait \u6216\u6539\u7528 waitUntil \u7B56\u7565\uFF1B\u82E5\u5143\u7D20\u662F\u5F02\u6B65\u6E32\u67D3\uFF0C\u5148\u7B49\u5176\u51FA\u73B0\u3002";
      case "network-failure":
        return "\u6838\u5BF9 URL/\u63A5\u53E3\u8DEF\u5F84\u3001CORS \u4E0E\u540E\u7AEF\u72B6\u6001\uFF1B\u5FC5\u8981\u65F6\u7528 diagnose \u67E5\u770B\u7F51\u7EDC\u5931\u8D25\u8BE6\u60C5\u3002";
      case "js-exception":
        return "\u7528 diagnose \u5C55\u5F00\u5F02\u5E38\u5806\u6808\uFF0C\u5B9A\u4F4D throw/\u672A\u5B9A\u4E49/\u5F02\u6B65\u672A catch\uFF0C\u4FEE\u590D\u540E\u91CD\u8BD5\u3002";
      case "dom-unrendered":
        return "\u68C0\u67E5\u521D\u59CB\u5316 JS \u662F\u5426\u629B\u9519\u5BFC\u81F4\u6574\u6811\u672A\u6E32\u67D3\uFF1B\u7528 diagnose \u7684 dom \u7EF4\u5EA6\u5B9A\u4F4D\u767D\u5C4F\u6839\u56E0\u3002";
      default:
        return "\u7528 diagnose \u91C7\u96C6\u5B8C\u6574\u8BCA\u65AD\uFF0C\u7ED3\u5408\u65E5\u5FD7\u4E8B\u4EF6\u5B9A\u4F4D\u6839\u56E0\u540E\u4FEE\u6B63\u52A8\u4F5C\u3002";
    }
  }
  /** 把扁平参数规整为统一动作 */
  normalizeAction(args) {
    const type = String(args.type);
    const base = { type, description: args.description };
    const loc = {};
    if (args.ref) loc.ref = args.ref;
    if (args.selector) loc.selector = args.selector;
    if (args.text) loc.text = args.text;
    if (args.semantic) loc.semantic = args.semantic;
    const rest = {};
    for (const k of ["url", "value", "key", "ms", "script", "mode", "expected", "fullPage", "deltaY", "delay", "waitUntil", "waitForNavigation"]) {
      if (args[k] !== void 0) rest[k] = args[k];
    }
    return { ...base, ...loc, ...rest };
  }
  /** 关闭（供传输层退出时调用） */
  async shutdown() {
    if (this.browser) await this.browser.stop();
  }
};

// packages/mcp-server/src/solutions.ts
function fingerprintError(text) {
  if (!text) return "unknown";
  const t = text.toLowerCase();
  if (/cors|access-control|跨域/.test(t)) return "network:cors";
  if (/ttfb|慢请求/.test(t)) return "performance:ttfb";
  if (/失败请求|请求失败|request failed|status\s*[:\s]*(?:404|500)/.test(t)) return "network:http-error";
  if (/\b(?:404|500)\b/.test(t) && !/\d{4,}/.test(t)) return "network:http-error";
  if (/uncaught|未捕获|typeerror|referenceerror|js 异常/.test(t)) return "console:js-exception";
  if (/未找到|无法定位|定位失败|定位.*失败|element not found|no element|not found|找不到/.test(t)) return "dom:locator-failed";
  if (/401|403|登录|鉴权|未授权|redirect|重定向/.test(t)) return "auth:redirect";
  if (/hydration|水合|did not match/.test(t)) return "dom:hydration-mismatch";
  if (/白屏|空白|blank|未渲染/.test(t)) return "dom:blank-page";
  return "generic:action-failed";
}
var RepeatErrorRegistry = class {
  counts = /* @__PURE__ */ new Map();
  /** 自定义触发阈值（默认 2） */
  threshold;
  constructor(threshold = 2) {
    this.threshold = threshold;
  }
  /** 记录一次错误，返回是否达到触发阈值 */
  record(text) {
    const fp = fingerprintError(text);
    const occurrences = (this.counts.get(fp) ?? 0) + 1;
    this.counts.set(fp, occurrences);
    return { fingerprint: fp, occurrences, triggered: occurrences >= this.threshold };
  }
  /** 查询某指纹当前次数（不改变计数） */
  peek(text) {
    const fp = fingerprintError(text);
    return { fingerprint: fp, occurrences: this.counts.get(fp) ?? 0 };
  }
  /** 重置（新一轮调试开始时可调用） */
  reset() {
    this.counts.clear();
  }
};
var defaultRegistry = new RepeatErrorRegistry();

// src/dsh-schema.ts
var SCHEMA_TYPES = /* @__PURE__ */ new Set(["object", "array", "string", "number", "integer", "boolean", "null"]);
var CONSTRAINT_KEYWORDS = /* @__PURE__ */ new Set([
  "type",
  "oneOf",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "enum",
  "const"
]);
var ANNOTATION_KEYWORDS = /* @__PURE__ */ new Set(["description", "title", "default", "examples"]);
var ONE_OF_SIBLING_KEYWORDS = ["properties", "required", "additionalProperties", "items", "enum", "const"];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isPlainRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}
function scalarMatches(type, value) {
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
function isLosslessJson(value) {
  const ancestors = /* @__PURE__ */ new Set();
  const walk = (current) => {
    if (current === null) return true;
    const kind = typeof current;
    if (kind === "string" || kind === "boolean") return true;
    if (kind === "number") return Number.isFinite(current) && !Object.is(current, -0);
    if (kind !== "object") return false;
    const node = current;
    if (ancestors.has(node)) return false;
    ancestors.add(node);
    try {
      const prototype = Object.getPrototypeOf(node);
      if (Array.isArray(node)) {
        if (prototype !== Array.prototype) return false;
        if (Reflect.ownKeys(node).length !== node.length + 1) return false;
        for (let index = 0; index < node.length; index++) {
          if (!Object.hasOwn(node, index) || !walk(node[index])) return false;
        }
        return true;
      }
      if (prototype !== Object.prototype && prototype !== null) return false;
      for (const key of Reflect.ownKeys(node)) {
        if (typeof key !== "string" || !Object.prototype.propertyIsEnumerable.call(node, key)) return false;
        if (!walk(node[key])) return false;
      }
      return true;
    } finally {
      ancestors.delete(node);
    }
  };
  return walk(value);
}
function normalizeSchema(raw) {
  if (!isRecord(raw)) return {};
  const out = {};
  if (typeof raw.description === "string") out.description = raw.description;
  if (typeof raw.title === "string") out.title = raw.title;
  if (Array.isArray(raw.oneOf) && raw.oneOf.length > 0) {
    const branches = raw.oneOf.map((branch) => normalizeSchema(branch));
    if (branches.length >= 2) {
      out.oneOf = branches;
      return out;
    }
    return branches[0] ?? {};
  }
  const declaredType = typeof raw.type === "string" ? raw.type : void 0;
  if (declaredType !== void 0 && SCHEMA_TYPES.has(declaredType)) {
    out.type = declaredType;
  }
  if (raw.enum !== void 0) out.enum = raw.enum;
  if (raw.const !== void 0) out.const = raw.const;
  if (out.type === "array" && raw.items !== void 0) {
    out.items = normalizeSchema(raw.items);
  }
  const looksObject = out.type === "object" || isRecord(raw.properties);
  if (looksObject) {
    out.type = "object";
    const props = {};
    if (isRecord(raw.properties)) {
      for (const [key, value] of Object.entries(raw.properties)) {
        props[key] = normalizeSchema(value);
      }
    }
    if (Object.keys(props).length > 0) out.properties = props;
    const names = Array.isArray(raw.required) ? raw.required.filter((n) => typeof n === "string" && Object.hasOwn(props, n)) : [];
    if (names.length > 0) out.required = names;
    if (typeof raw.additionalProperties === "boolean") out.additionalProperties = raw.additionalProperties;
  }
  return out;
}
function checkSupportedSchema(schema, path = "schema") {
  const violations = [];
  const seen = /* @__PURE__ */ new Set();
  const walk = (node, at) => {
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
          `${at}.${key} is not a supported keyword (subset: type/oneOf/properties/required/additionalProperties/items/enum/const + annotations)`
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
          Array.isArray(type) ? `${at}.type must be a single type string (type arrays are not supported)` : `${at}.type must be one of ${[...SCHEMA_TYPES].join("/")}`
        );
        return;
      }
      const allowedFor = {
        properties: ["object"],
        required: ["object"],
        additionalProperties: ["object"],
        items: ["array"],
        enum: ["string", "number", "integer", "boolean", "null"],
        const: ["string", "number", "integer", "boolean", "null"]
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
            const valid = Array.isArray(allowed) && allowed.length > 0 && allowed.every((entry) => scalarMatches(type, entry));
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
function validateAgainstSchema(schema, value, path = "value") {
  if (schema.oneOf !== void 0) {
    const matched = schema.oneOf.filter((branch) => validateAgainstSchema(branch, value, path).length === 0);
    return matched.length === 1 ? [] : [`"${path}" must match exactly one oneOf branch (matched ${matched.length})`];
  }
  if (schema.type === void 0) {
    return isLosslessJson(value) ? [] : [`"${path}" must be a lossless JSON value`];
  }
  const enumViolation = () => {
    if (schema.enum !== void 0) {
      if (!Array.isArray(schema.enum)) {
        return [`"${path}" schema.enum is malformed (must be a non-empty array)`];
      }
      if (!schema.enum.includes(value)) {
        return [`"${path}" must be one of ${JSON.stringify(schema.enum)}`];
      }
    }
    if (schema.const !== void 0 && value !== schema.const) {
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
      return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0) && Number.isInteger(value) ? enumViolation() : [`"${path}" must be an integer`];
    case "array": {
      if (!Array.isArray(value)) return [`"${path}" must be an array`];
      const violations = [];
      if (schema.items !== void 0) {
        value.forEach((item, i) => violations.push(...validateAgainstSchema(schema.items, item, `${path}[${i}]`)));
      }
      if (violations.length > 0) return violations;
      return isLosslessJson(value) ? [] : [`"${path}" must be a dense lossless JSON array`];
    }
    case "object": {
      if (!isPlainRecord(value)) return [`"${path}" must be an object`];
      const props = schema.properties ?? {};
      const violations = [];
      for (const name2 of schema.required ?? []) {
        if (!Object.hasOwn(value, name2) || value[name2] === void 0) {
          violations.push(`missing required property "${path}.${name2}"`);
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
        if (Object.hasOwn(value, key) && value[key] !== void 0) {
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

// src/plugin.ts
var name = "openliulan-browser";
var DEFAULT_PREFIX = "browser";
var RESERVED_TOOL_NAME = "run_code";
var inject = ["tools"];
function detectDshFlavor(tools) {
  const injected = [...inject];
  try {
    const ctor = tools?.constructor;
    const config = ctor?.Config;
    const rendered = typeof config?.toString === "function" ? config.toString() : "";
    if (/["']ptc["']/.test(rendered)) {
      return { flavor: "modern", evidence: `tools.Config.mode ~ ${rendered}`, injected };
    }
    if (/["']code["']/.test(rendered)) {
      return { flavor: "legacy", evidence: `tools.Config.mode ~ ${rendered}`, injected };
    }
    const hasRegister = typeof tools?.register === "function";
    return {
      flavor: "unknown",
      evidence: hasRegister ? "tools.register \u53EF\u7528\uFF0C\u4F46 Config \u672A\u66B4\u9732 mode \u53D6\u503C" : "ctx.tools \u7ED3\u6784\u5F02\u5E38",
      injected
    };
  } catch {
    return { flavor: "unknown", evidence: "\u63A2\u6D4B\u629B\u9519\uFF0C\u6309\u517C\u5BB9\u8DEF\u5F84\u6CE8\u518C", injected };
  }
}
function assertNotReserved(publicName, toolName) {
  const hit = [publicName, toolName].find((candidate) => candidate === RESERVED_TOOL_NAME);
  if (hit !== void 0) {
    throw new Error(
      `[openliulan] \u5DE5\u5177\u540D "${hit}" \u662F DSH \u4FDD\u7559\u540D\uFF08PTC/Code mode \u7684 run_code transport\uFF09\uFF0C\u8BF7\u6539\u7528\u5176\u5B83 prefix`
    );
  }
}
function toRecord(args) {
  return typeof args === "object" && args !== null ? args : {};
}
function resultText(content) {
  if (!content || content.length === 0) return "(\u65E0\u8F93\u51FA)";
  return content.map((block) => block.text ?? "").join("\n");
}
var CONTENT_BLOCKS_SCHEMA = {
  type: "object",
  properties: {
    content: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          text: { type: "string" }
        },
        additionalProperties: true
      }
    }
  },
  required: ["content"],
  additionalProperties: false
};
function renderContent(_args, value) {
  const content = value?.content ?? [];
  return [{ type: "text", text: resultText(content) }];
}
function apply(ctx, config = {}) {
  const prefix = typeof config.prefix === "string" && config.prefix ? config.prefix : DEFAULT_PREFIX;
  const mcp = new ForgeMcp({
    headless: config.headless === void 0 ? true : Boolean(config.headless),
    connectUrl: typeof config.connectUrl === "string" ? config.connectUrl : void 0,
    stealth: config.stealth ?? void 0
  });
  const tools = ctx.tools;
  const host = detectDshFlavor(tools);
  for (const tool of mcp.tools) {
    const publicName = `${prefix}_${tool.name}`;
    assertNotReserved(publicName, tool.name);
    const normalized = normalizeSchema(tool.inputSchema);
    const ROOT_ONLY_KEYWORDS = ["oneOf", "enum", "const", "items"];
    const rawInput = tool.inputSchema ?? {};
    const dropped = ROOT_ONLY_KEYWORDS.filter((key) => rawInput[key] !== void 0);
    if (dropped.length > 0 || normalized.type !== void 0 && normalized.type !== "object") {
      throw new Error(
        `[openliulan] ${publicName} inputSchema \u7684\u6839\u5FC5\u987B\u662F\u7EAF\u5BF9\u8C61 schema\uFF08DSH ParameterJsonSchema \u8981\u6C42\u5BF9\u8C61\u6839\uFF1Bparameters \u8868\u8FBE\u4E0D\u4E86\u7684\u6839\u7EA6\u675F: ${dropped.length > 0 ? dropped.join("/") : `type=${String(normalized.type)}`}\uFF09: ` + JSON.stringify(tool.inputSchema)
      );
    }
    const parameters = {
      type: "object",
      properties: normalized.properties ?? {},
      ...normalized.required === void 0 ? {} : { required: normalized.required },
      ...normalized.additionalProperties === void 0 ? {} : { additionalProperties: normalized.additionalProperties }
    };
    const violations = [
      ...checkSupportedSchema(parameters).map((v) => `parameters: ${v}`),
      ...checkSupportedSchema(CONTENT_BLOCKS_SCHEMA).map((v) => `output.schema: ${v}`)
    ];
    if (violations.length > 0) {
      throw new Error(`[openliulan] ${publicName} schema \u4E0D\u5728 DSH \u53D7\u652F\u6301\u5B50\u96C6\u5185: ${violations.join("; ")}`);
    }
    ctx.effect(
      () => tools.register({
        name: publicName,
        description: tool.description,
        parameters,
        output: {
          // canonical value：{ content: [{ type: "text", text }] }
          schema: CONTENT_BLOCKS_SCHEMA,
          render: renderContent
        },
        /**
         * DSH 新版签名 `execute(args, exec)`，`exec.signal` 用于取消。
         * 旧版调用时只传 args，故对 `exec` 做可选处理，保持双版本兼容。
         *
         * 这里显式 `throwIfAborted()`：已中止的调用在触达 ForgeMcp（进而
         * 启动浏览器）之前就抛出。宿主侧另有 `ABORTED_BEFORE_DISPATCH` /
         * `ABORTED` 的兜底，本插件不重复实现那层语义。
         */
        execute: async (args, exec) => {
          exec?.signal?.throwIfAborted?.();
          const result = await mcp.callTool(tool.name, toRecord(args));
          const text = resultText(result.content);
          if (!result.ok) throw new Error(text);
          return { content: [{ type: "text", text }] };
        }
      }),
      // 新版要求 effect 标签唯一可定位：按工具名细化，便于诊断定位。
      `openliulan.tool.${publicName}`
    );
  }
  PROFILES.set(prefix, {
    host,
    prefix,
    tools: mcp.tools.map((t) => `${prefix}_${t.name}`)
  });
  ctx.effect(
    () => () => {
      if (PROFILES.get(prefix)?.host === host) PROFILES.delete(prefix);
    },
    `openliulan.profile.${prefix}`
  );
}
var PROFILES = /* @__PURE__ */ new Map();
function loadProfile(prefix = DEFAULT_PREFIX) {
  return PROFILES.get(prefix);
}
export {
  PROFILES,
  apply,
  assertNotReserved,
  checkSupportedSchema,
  detectDshFlavor,
  inject,
  loadProfile,
  name,
  normalizeSchema,
  validateAgainstSchema
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcGFja2FnZXMvZGlhZ25vc2lzL3NyYy9hbmFseXplci50cyIsICIuLi9wYWNrYWdlcy9kaWFnbm9zaXMvc3JjL3R5cGVzLnRzIiwgIi4uL3BhY2thZ2VzL2RpYWdub3Npcy9zcmMvaW5kZXgudHMiLCAiLi4vcGFja2FnZXMvbWNwLXNlcnZlci9zcmMvdG9vbHMudHMiLCAiLi4vbm9kZV9tb2R1bGVzL3pvZC92My9leHRlcm5hbC5qcyIsICIuLi9ub2RlX21vZHVsZXMvem9kL3YzL2hlbHBlcnMvdXRpbC5qcyIsICIuLi9ub2RlX21vZHVsZXMvem9kL3YzL1pvZEVycm9yLmpzIiwgIi4uL25vZGVfbW9kdWxlcy96b2QvdjMvbG9jYWxlcy9lbi5qcyIsICIuLi9ub2RlX21vZHVsZXMvem9kL3YzL2Vycm9ycy5qcyIsICIuLi9ub2RlX21vZHVsZXMvem9kL3YzL2hlbHBlcnMvcGFyc2VVdGlsLmpzIiwgIi4uL25vZGVfbW9kdWxlcy96b2QvdjMvaGVscGVycy9lcnJvclV0aWwuanMiLCAiLi4vbm9kZV9tb2R1bGVzL3pvZC92My90eXBlcy5qcyIsICIuLi9wYWNrYWdlcy9jb3JlL3NyYy9hY3Rpb25zLnRzIiwgIi4uL3BhY2thZ2VzL2NvcmUvc3JjL3Nlc3Npb24udHMiLCAiLi4vcGFja2FnZXMvY29yZS9zcmMvZm9yZ2UudHMiLCAiLi4vcGFja2FnZXMvZW5naW5lcy9zcmMvbG9jYXRvci50cyIsICIuLi9wYWNrYWdlcy9lbmdpbmVzL3NyYy9zbmFwc2hvdC50cyIsICIuLi9wYWNrYWdlcy9lbmdpbmVzL3NyYy9kaWFnbm9zdGljcy50cyIsICIuLi9wYWNrYWdlcy9lbmdpbmVzL3NyYy9wbGF5d3JpZ2h0LWVuZ2luZS50cyIsICIuLi9wYWNrYWdlcy9haS1sYXllci9zcmMvc2VtYW50aWMtbG9jYXRvci50cyIsICIuLi9wYWNrYWdlcy9zdGVhbHRoL3NyYy9zdGVhbHRoLnRzIiwgIi4uL3BhY2thZ2VzL3Rva2VuL3NyYy9pbmRleC50cyIsICIuLi9wYWNrYWdlcy9tY3Atc2VydmVyL3NyYy9zZWN1cml0eS50cyIsICIuLi9wYWNrYWdlcy9tY3Atc2VydmVyL3NyYy9sb2dnZXIudHMiLCAiLi4vcGFja2FnZXMvbWNwLXNlcnZlci9zcmMvZm9yZ2UtbWNwLnRzIiwgIi4uL3BhY2thZ2VzL21jcC1zZXJ2ZXIvc3JjL3NvbHV0aW9ucy50cyIsICIuLi9zcmMvZHNoLXNjaGVtYS50cyIsICIuLi9zcmMvcGx1Z2luLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIFx1OEJDQVx1NjVBRFx1NTIwNlx1Njc5MFx1NTY2OFx1RkYxQVx1NjI4QVx1NTM5Rlx1NTlDQlx1OEJDQVx1NjVBRFx1NjU3MFx1NjM2RVx1NTJBMFx1NURFNVx1NjIxMFx1NEY5QiBBSSBcdTUxQjNcdTdCNTZcdTc2ODRcdTdFRDNcdThCQkFcdTMwMDJcbiAqIFx1NTAxRlx1OTI3NCBDaHJvbWUgRGV2VG9vbHMgTUNQXHUzMDBDXHU1MTQ4XHU3RUQ5XHU3RUQzXHU4QkJBXHUzMDAxXHU1MThEXHU3RUQ5XHU3RUM2XHU4MjgyXHUzMDBEXHU3Njg0XHU2MDFEXHU4REVGXHVGRjBDXHU4MjgyXHU3NzAxIFRva2VuXHUzMDAyXG4gKi9cbmltcG9ydCB0eXBlIHsgRGlhZ25vc3RpY1JlZiB9IGZyb20gXCJAb3BlbmxpdWxhbi9jb3JlXCI7XG5pbXBvcnQgdHlwZSB7IERpYWdub3Npc1JlcG9ydCwgRGlhZ25vc2lzU3VtbWFyeSwgTmV0d29ya1JlY29yZCwgUGVyZm9ybWFuY2VNZXRyaWNzIH0gZnJvbSBcIi4vdHlwZXMuanNcIjtcblxuLyoqXG4gKiBcdTdGNTFcdTdFRENcdTU5MzFcdThEMjVcdTUyMDZcdTY3OTBcdUZGMUFcdTVDMDZcdTdGNTFcdTdFRENcdThCQjBcdTVGNTVcdThGNkNcdTUzMTZcdTRFM0FcdThCQ0FcdTY1QURcdTVGMTVcdTc1MjhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVOZXR3b3JrKHJlY29yZHM6IE5ldHdvcmtSZWNvcmRbXSk6IHsgcmVmczogRGlhZ25vc3RpY1JlZltdOyBzdWdnZXN0aW9uczogc3RyaW5nW10gfSB7XG4gIGNvbnN0IHJlZnM6IERpYWdub3N0aWNSZWZbXSA9IFtdO1xuICBjb25zdCBzdWdnZXN0aW9uczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZmFpbGVkID0gcmVjb3Jkcy5maWx0ZXIoKHIpID0+IHIuc3RhdHVzID49IDQwMCB8fCByLmVycm9yKTtcbiAgY29uc3Qgc2xvdyA9IHJlY29yZHMuZmlsdGVyKChyKSA9PiByLmR1cmF0aW9uTXMgPiAzMDAwKTtcblxuICBmb3IgKGNvbnN0IHIgb2YgZmFpbGVkKSB7XG4gICAgcmVmcy5wdXNoKHtcbiAgICAgIGtpbmQ6IFwibmV0d29ya1wiLFxuICAgICAgc2V2ZXJpdHk6IHIuc3RhdHVzID49IDUwMCA/IFwiZXJyb3JcIiA6IFwid2FybmluZ1wiLFxuICAgICAgbWVzc2FnZTogYFx1OEJGN1x1NkM0Mlx1NTkzMVx1OEQyNSAke3IubWV0aG9kfSAke3IudXJsfSAoJHtyLnN0YXR1c30ke3Iuc3RhdHVzVGV4dCA/IFwiIFwiICsgci5zdGF0dXNUZXh0IDogXCJcIn0pJHtyLmVycm9yID8gXCIgXHUyMDE0IFwiICsgci5lcnJvciA6IFwiXCJ9YCxcbiAgICAgIGRldGFpbDogeyBkdXJhdGlvbk1zOiByLmR1cmF0aW9uTXMsIHJlcXVlc3RJZDogci5yZXF1ZXN0SWQgfSxcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICB9KTtcbiAgfVxuICBmb3IgKGNvbnN0IHIgb2Ygc2xvdykge1xuICAgIHJlZnMucHVzaCh7XG4gICAgICBraW5kOiBcIm5ldHdvcmtcIixcbiAgICAgIHNldmVyaXR5OiBcIndhcm5pbmdcIixcbiAgICAgIG1lc3NhZ2U6IGBcdTYxNjJcdThCRjdcdTZDNDIgJHtyLmR1cmF0aW9uTXN9bXMgJHtyLm1ldGhvZH0gJHtyLnVybH1gLFxuICAgICAgZGV0YWlsOiB7IHN0YXR1czogci5zdGF0dXMgfSxcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChmYWlsZWQubGVuZ3RoKSBzdWdnZXN0aW9ucy5wdXNoKGBcdTdGNTFcdTdFRENcdTVCNThcdTU3MjggJHtmYWlsZWQubGVuZ3RofSBcdTRFMkFcdTU5MzFcdThEMjVcdThCRjdcdTZDNDJcdUZGMENcdTUzRUZcdTgwRkRcdTY2MkZcdThENDRcdTZFOTAgNDA0LzUwMCBcdTYyMTYgQ09SUy9cdThERThcdTU3REZcdTk2M0JcdTY1QURgKTtcbiAgaWYgKHNsb3cubGVuZ3RoKSBzdWdnZXN0aW9ucy5wdXNoKGBcdTVCNThcdTU3MjggJHtzbG93Lmxlbmd0aH0gXHU0RTJBXHU2MTYyXHU4QkY3XHU2QzQyKD4zcylcdUZGMENcdTgwMDNcdTg2NTFcdTY4QzBcdTY3RTVcdTU0MEVcdTdBRUZcdTYzQTVcdTUzRTNcdTYyMTZcdThENDRcdTZFOTBcdTUyQTBcdThGN0RgKTtcbiAgcmV0dXJuIHsgcmVmcywgc3VnZ2VzdGlvbnMgfTtcbn1cblxuLyoqXG4gKiBcdTYwMjdcdTgwRkRcdTUyMDZcdTY3OTBcdUZGMUFcdTVDMDZcdTYzMDdcdTY4MDdcdThGNkNcdTUzMTZcdTRFM0FcdThCQ0FcdTY1QURcdTVGMTVcdTc1MjhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVQZXJmb3JtYW5jZShtZXRyaWNzOiBQZXJmb3JtYW5jZU1ldHJpY3MpOiB7IHJlZnM6IERpYWdub3N0aWNSZWZbXTsgc3VnZ2VzdGlvbnM6IHN0cmluZ1tdIH0ge1xuICBjb25zdCByZWZzOiBEaWFnbm9zdGljUmVmW10gPSBbXTtcbiAgY29uc3Qgc3VnZ2VzdGlvbnM6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKG1ldHJpY3MudHRmYiA+IDEwMDApIHtcbiAgICByZWZzLnB1c2goe1xuICAgICAga2luZDogXCJwZXJmb3JtYW5jZVwiLFxuICAgICAgc2V2ZXJpdHk6IFwid2FybmluZ1wiLFxuICAgICAgbWVzc2FnZTogYFRURkIgXHU1MDRGXHU5QUQ4OiAke21ldHJpY3MudHRmYn1tc1x1RkYwOFx1OTk5Nlx1NUI1N1x1ODI4Mlx1NTRDRFx1NUU5NFx1NjE2Mlx1RkYwQ1x1NTNFRlx1ODBGRFx1NjcwRFx1NTJBMVx1N0FFRlx1NjE2Mlx1NjIxNlx1N0Y1MVx1N0VEQ1x1NURFRVx1RkYwOWAsXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgfSk7XG4gICAgc3VnZ2VzdGlvbnMucHVzaChcIlRURkIgPiAxc1x1RkYwQ1x1NEYxOFx1NTE0OFx1NjM5Mlx1NjdFNVx1NjcwRFx1NTJBMVx1N0FFRlx1NTRDRFx1NUU5NFx1NEUwRSBDRE5cIik7XG4gIH1cbiAgaWYgKG1ldHJpY3MubGNwICYmIG1ldHJpY3MubGNwID4gMjUwMCkge1xuICAgIHJlZnMucHVzaCh7XG4gICAgICBraW5kOiBcInBlcmZvcm1hbmNlXCIsXG4gICAgICBzZXZlcml0eTogXCJ3YXJuaW5nXCIsXG4gICAgICBtZXNzYWdlOiBgTENQIFx1NTA0Rlx1OUFEODogJHttZXRyaWNzLmxjcH1tc1x1RkYwOFx1NjcwMFx1NTkyN1x1NTE4NVx1NUJCOVx1N0VEOFx1NTIzNlx1NjE2Mlx1RkYwQ1x1NUY3MVx1NTRDRFx1OTk5Nlx1NUM0Rlx1RkYwOWAsXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgfSk7XG4gICAgc3VnZ2VzdGlvbnMucHVzaChcIkxDUCA+IDIuNXNcdUZGMENcdTUxNzNcdTZDRThcdTk5OTZcdTVDNEZcdTU2RkVcdTcyNDcvXHU1OTI3XHU4RDQ0XHU2RTkwXHU1MkEwXHU4RjdEXCIpO1xuICB9XG4gIGlmIChtZXRyaWNzLmxvbmdUYXNrcyA+IDMpIHtcbiAgICByZWZzLnB1c2goe1xuICAgICAga2luZDogXCJwZXJmb3JtYW5jZVwiLFxuICAgICAgc2V2ZXJpdHk6IFwid2FybmluZ1wiLFxuICAgICAgbWVzc2FnZTogYFx1NEUzQlx1N0VCRlx1N0EwQlx1OTU3Rlx1NEVGQlx1NTJBMSAke21ldHJpY3MubG9uZ1Rhc2tzfSBcdTZCMjFcdUZGMDhKUyBcdTUzRUZcdTgwRkRcdTk2M0JcdTU4NUVcdTZFMzJcdTY3RDNcdUZGMDlgLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgIH0pO1xuICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJcdTVCNThcdTU3MjhcdTk1N0ZcdTRFRkJcdTUyQTFcdTk2M0JcdTU4NUVcdTRFM0JcdTdFQkZcdTdBMEJcdUZGMENcdTY4QzBcdTY3RTVcdTU0MENcdTZCNjVcdTgxMUFcdTY3MkMvXHU1QkM2XHU5NkM2XHU4QkExXHU3Qjk3XCIpO1xuICB9XG4gIGlmIChtZXRyaWNzLnJlc291cmNlcy50b3RhbEJ5dGVzID4gNSAqIDEwMjQgKiAxMDI0KSB7XG4gICAgcmVmcy5wdXNoKHtcbiAgICAgIGtpbmQ6IFwicGVyZm9ybWFuY2VcIixcbiAgICAgIHNldmVyaXR5OiBcImluZm9cIixcbiAgICAgIG1lc3NhZ2U6IGBcdTk4NzVcdTk3NjJcdThENDRcdTZFOTBcdTYwM0JcdTkxQ0ZcdThGODNcdTU5Mjc6ICR7KG1ldHJpY3MucmVzb3VyY2VzLnRvdGFsQnl0ZXMgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCgxKX1NQmAsXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHsgcmVmcywgc3VnZ2VzdGlvbnMgfTtcbn1cblxuLyoqXG4gKiBcdTZDNDdcdTYwM0JcdThCQ0FcdTY1QURcdTYyQTVcdTU0NEFcdUZGMENcdTc1MUZcdTYyMTBcdTUwNjVcdTVFQjdcdTVFQTZcdTRFMEVcdTVFRkFcdThCQUVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1bW1hcml6ZShyZXBvcnQ6IERpYWdub3Npc1JlcG9ydCk6IERpYWdub3Npc1N1bW1hcnkge1xuICBjb25zdCBpc3N1ZXM6IERpYWdub3Npc1N1bW1hcnlbXCJpc3N1ZXNcIl0gPSBbXTtcbiAgY29uc3Qgc3VnZ2VzdGlvbnM6IHN0cmluZ1tdID0gW107XG5cbiAgLy8gXHU2M0E3XHU1MjM2XHU1M0YwXHU5NTE5XHU4QkVGXG4gIGNvbnN0IGNvbnNvbGVFcnJvcnMgPSByZXBvcnQuY29uc29sZS5maWx0ZXIoKGMpID0+IGMuc2V2ZXJpdHkgPT09IFwiZXJyb3JcIik7XG4gIGZvciAoY29uc3QgZSBvZiBjb25zb2xlRXJyb3JzKSB7XG4gICAgaXNzdWVzLnB1c2goeyBjYXRlZ29yeTogXCJjb25zb2xlXCIsIHNldmVyaXR5OiBcImVycm9yXCIsIG1lc3NhZ2U6IGUubWVzc2FnZSB9KTtcbiAgfVxuICBpZiAoY29uc29sZUVycm9ycy5sZW5ndGgpIHN1Z2dlc3Rpb25zLnB1c2goYFx1NjNBN1x1NTIzNlx1NTNGMFx1NjcwOSAke2NvbnNvbGVFcnJvcnMubGVuZ3RofSBcdTY3NjFcdTk1MTlcdThCRUZcdUZGMENcdTUzRUZcdTgwRkRcdTY2MkYgSlMgXHU1RjAyXHU1RTM4XHU2MjE2XHU4RDQ0XHU2RTkwXHU1MkEwXHU4RjdEXHU1OTMxXHU4RDI1YCk7XG5cbiAgLy8gSlMgXHU1RjAyXHU1RTM4XG4gIGZvciAoY29uc3QgZSBvZiByZXBvcnQuanNFeGNlcHRpb25zKSB7XG4gICAgaXNzdWVzLnB1c2goeyBjYXRlZ29yeTogXCJqcy1leGNlcHRpb25cIiwgc2V2ZXJpdHk6IFwiZXJyb3JcIiwgbWVzc2FnZTogZS5tZXNzYWdlIH0pO1xuICB9XG4gIGlmIChyZXBvcnQuanNFeGNlcHRpb25zLmxlbmd0aCkgc3VnZ2VzdGlvbnMucHVzaChcIlx1OTg3NVx1OTc2Mlx1NjI5Qlx1NTFGQVx1NEU4NiBKUyBcdTY3MkFcdTYzNTVcdTgzQjdcdTVGMDJcdTVFMzhcdUZGMENcdTY4QzBcdTY3RTVcdTVCRjlcdTVFOTRcdTU4MDZcdTY4MDhcIik7XG5cbiAgLy8gXHU3RjUxXHU3RURDXG4gIGNvbnN0IG5ldEZhaWxlZCA9IHJlcG9ydC5uZXR3b3JrLmZpbHRlcigobikgPT4gbi5zZXZlcml0eSA9PT0gXCJlcnJvclwiKTtcbiAgZm9yIChjb25zdCBuIG9mIG5ldEZhaWxlZCkgaXNzdWVzLnB1c2goeyBjYXRlZ29yeTogXCJuZXR3b3JrXCIsIHNldmVyaXR5OiBcImVycm9yXCIsIG1lc3NhZ2U6IG4ubWVzc2FnZSB9KTtcbiAgY29uc3QgbmV0V2FybiA9IHJlcG9ydC5uZXR3b3JrLmZpbHRlcigobikgPT4gbi5zZXZlcml0eSA9PT0gXCJ3YXJuaW5nXCIpO1xuICBmb3IgKGNvbnN0IG4gb2YgbmV0V2FybikgaXNzdWVzLnB1c2goeyBjYXRlZ29yeTogXCJuZXR3b3JrXCIsIHNldmVyaXR5OiBcIndhcm5pbmdcIiwgbWVzc2FnZTogbi5tZXNzYWdlIH0pO1xuXG4gIC8vIERPTSBcdTY4QzBcdTY3RTVcdUZGMDhcdTc2N0RcdTVDNEYvXHU2NzJBXHU2RTMyXHU2N0QzL1x1NjVFMFx1NEVBNFx1NEU5Mlx1N0I0OVx1RkYwQ1x1NEVDRSBjb25zb2xlL25ldHdvcmsgXHU3NzBCXHU0RTBEXHU1MjMwXHU3Njg0XHU2RTMyXHU2N0QzXHU3RUE3XHU5NUVFXHU5ODk4XHVGRjA5XG4gIGZvciAoY29uc3QgZCBvZiByZXBvcnQuZG9tKSB7XG4gICAgaXNzdWVzLnB1c2goeyBjYXRlZ29yeTogXCJkb21cIiwgc2V2ZXJpdHk6IGQuc2V2ZXJpdHkgPT09IFwiZXJyb3JcIiA/IFwiZXJyb3JcIiA6IFwid2FybmluZ1wiLCBtZXNzYWdlOiBkLm1lc3NhZ2UgfSk7XG4gIH1cbiAgY29uc3QgZG9tQmxhbmsgPSByZXBvcnQuZG9tLmZpbHRlcigoZCkgPT4gZC5zZXZlcml0eSA9PT0gXCJlcnJvclwiKTtcbiAgaWYgKGRvbUJsYW5rLmxlbmd0aCkgc3VnZ2VzdGlvbnMucHVzaChcIlx1OTg3NVx1OTc2Mlx1NzU5MVx1NEYzQ1x1N0E3QVx1NzY3RC9cdTY3MkFcdTZFMzJcdTY3RDNcdUZGMENcdTY4QzBcdTY3RTVcdTYzMDJcdThGN0RcdTgyODJcdTcwQjlcdTRFMEVcdTUyMURcdTU5Q0JcdTUzMTZcdTgxMUFcdTY3MkNcdUZGMDhcdTUzRUZcdTgwRkQgSlMgXHU2MkE1XHU5NTE5XHU5NjNCXHU2NUFEXHU2NTc0XHU2ODExXHU2RTMyXHU2N0QzXHVGRjA5XCIpO1xuXG4gIC8vIFx1NjAyN1x1ODBGRFxuICBmb3IgKGNvbnN0IHAgb2YgcmVwb3J0LnBlcmZvcm1hbmNlKSB7XG4gICAgaWYgKHAuc2V2ZXJpdHkgPT09IFwid2FybmluZ1wiKSBpc3N1ZXMucHVzaCh7IGNhdGVnb3J5OiBcInBlcmZvcm1hbmNlXCIsIHNldmVyaXR5OiBcIndhcm5pbmdcIiwgbWVzc2FnZTogcC5tZXNzYWdlIH0pO1xuICB9XG5cbiAgLy8gXHU1M0JCXHU5MUNEXHU1RUZBXHU4QkFFXG4gIGNvbnN0IHVuaXF1ZSA9IFsuLi5uZXcgU2V0KHN1Z2dlc3Rpb25zKV07XG4gIHJldHVybiB7XG4gICAgaGVhbHRoeTogaXNzdWVzLmZpbHRlcigoaSkgPT4gaS5zZXZlcml0eSA9PT0gXCJlcnJvclwiKS5sZW5ndGggPT09IDAsXG4gICAgaXNzdWVzOiBpc3N1ZXMuc2xpY2UoMCwgMTUpLFxuICAgIHN1Z2dlc3Rpb25zOiB1bmlxdWUuc2xpY2UoMCwgOCksXG4gIH07XG59XG4iLCAiLyoqXG4gKiBcdThDMDNcdThCRDVcdThCQ0FcdTY1QURcdTRFMkRcdTVGQzMgXHUyMDE0XHUyMDE0IDUgXHU2NjFGXHU4MEZEXHU1MjlCXG4gKlxuICogXHU1MDFGXHU5Mjc0IENocm9tZSBEZXZUb29scyBNQ1AgXHU3Njg0XHU4QkNBXHU2NUFEXHU4MEZEXHU1MjlCXHVGRjBDXHU0RTNBIEFJIFx1NjNEMFx1NEY5Qlx1NTE2OFx1OTRGRVx1OERFRlx1OTg3NVx1OTc2Mlx1OEJDQVx1NjVBRFx1RkYxQVxuICogMS4gRE9NIFx1NjhDMFx1NjdFNVx1NEUwRVx1NUI5QVx1NEY0RFxuICogMi4gXHU2M0E3XHU1MjM2XHU1M0YwXHU2RDg4XHU2MDZGL1x1OTUxOVx1OEJFRlxuICogMy4gXHU3RjUxXHU3RURDXHU4QkY3XHU2QzQyXHU0RTBFXHU1OTMxXHU4RDI1XHU1MjA2XHU2NzkwXG4gKiA0LiBcdTYwMjdcdTgwRkRcdTYzMDdcdTY4MDdcbiAqIDUuIEpTIFx1NUYwMlx1NUUzOFx1NEUwRVx1NTgwNlx1NjgwOFxuICovXG5pbXBvcnQgdHlwZSB7IERpYWdub3N0aWNSZWYgfSBmcm9tIFwiQG9wZW5saXVsYW4vY29yZVwiO1xuXG5leHBvcnQgdHlwZSBEaWFnbm9zdGljQ2F0ZWdvcnkgPSBcImNvbnNvbGVcIiB8IFwibmV0d29ya1wiIHwgXCJkb21cIiB8IFwicGVyZm9ybWFuY2VcIiB8IFwianMtZXhjZXB0aW9uXCIgfCBcImFjY2Vzc2liaWxpdHlcIjtcblxuLyoqIFx1OTFDN1x1OTZDNlx1NTY2OFx1N0VERlx1NEUwMFx1NjNBNVx1NTNFM1x1RkYxQVx1NUU5NVx1NUM0Mlx1NUYxNVx1NjRDRVx1NUI5RVx1NzNCMFx1NTE3N1x1NEY1M1x1NzY4NCBDRFAvUGxheXdyaWdodCBcdTkxQzdcdTk2QzZcdTkwM0JcdThGOTEgKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGlhZ25vc3RpY0NvbGxlY3RvciB7XG4gIHJlYWRvbmx5IGNhdGVnb3J5OiBEaWFnbm9zdGljQ2F0ZWdvcnk7XG4gIGNvbGxlY3QoKTogUHJvbWlzZTxEaWFnbm9zdGljUmVmW10+O1xufVxuXG4vKiogXHU3RjUxXHU3RURDXHU4QkY3XHU2QzQyXHU4QkIwXHU1RjU1XHVGRjA4XHU3NTI4XHU0RThFXHU1MjA2XHU2NzkwXHU1MkEwXHU4RjdEXHU1OTMxXHU4RDI1L1x1NjE2Mlx1OEJGN1x1NkM0Mlx1RkYwOSAqL1xuZXhwb3J0IGludGVyZmFjZSBOZXR3b3JrUmVjb3JkIHtcbiAgdXJsOiBzdHJpbmc7XG4gIG1ldGhvZDogc3RyaW5nO1xuICBzdGF0dXM6IG51bWJlcjtcbiAgc3RhdHVzVGV4dD86IHN0cmluZztcbiAgbWltZVR5cGU/OiBzdHJpbmc7XG4gIGR1cmF0aW9uTXM6IG51bWJlcjtcbiAgLyoqIFx1OEJGN1x1NkM0Mlx1NTkzMVx1OEQyNS9cdTg4QUJcdTk2M0JcdTY1QURcdTUzOUZcdTU2RTAgKi9cbiAgZXJyb3I/OiBzdHJpbmc7XG4gIHJlcXVlc3RJZD86IHN0cmluZztcbn1cblxuLyoqIERPTSBcdTY4QzBcdTY3RTVcdTdFRDNcdTY3OUMgKi9cbmV4cG9ydCBpbnRlcmZhY2UgRG9tSW5zcGVjdGlvbiB7XG4gIC8qKiBcdTY4QzBcdTY3RTVcdTc2ODRcdTc2RUVcdTY4MDdcdTYzQ0ZcdThGRjAgKi9cbiAgdGFyZ2V0OiBzdHJpbmc7XG4gIC8qKiBcdTUxNDNcdTdEMjAgb3V0bGluZVx1RkYwOFx1NjgwN1x1N0I3RVx1MzAwMWlkXHUzMDAxY2xhc3NcdTMwMDFcdTUxNzNcdTk1MkVcdTVDNUVcdTYwMjdcdUZGMDkgKi9cbiAgb3V0bGluZTogc3RyaW5nO1xuICAvKiogXHU1MTQzXHU3RDIwXHU1M0VGXHU4OUMxXHU2MDI3IC8gXHU0RjREXHU3RjZFICovXG4gIGJveDogeyB4OiBudW1iZXI7IHk6IG51bWJlcjsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfSB8IG51bGw7XG4gIC8qKiBcdTY1RTBcdTk2OUNcdTc4OEQvQVJJQSBcdTRGRTFcdTYwNkYgKi9cbiAgYWNjZXNzaWJsZToge1xuICAgIHJvbGU/OiBzdHJpbmc7XG4gICAgbmFtZT86IHN0cmluZztcbiAgICBkaXNhYmxlZD86IGJvb2xlYW47XG4gIH07XG4gIC8qKiBcdTc2RjhcdTUxNzNcdThCQTFcdTdCOTdcdTY4MzdcdTVGMEZcdUZGMDhcdTg4QzFcdTUyNkFcdTRFM0FcdTUxNzNcdTk1MkVcdTk4NzlcdUZGMDkgKi9cbiAgY29tcHV0ZWRTdHlsZTogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgLyoqIFx1NTQwRVx1NEVFMy9cdTc5NTZcdTUxNDhcdTY5ODJcdTg5QzggKi9cbiAgY29udGV4dDoge1xuICAgIGFuY2VzdG9yczogc3RyaW5nW107XG4gICAgZGVzY2VuZGFudHNDb3VudDogbnVtYmVyO1xuICB9O1xufVxuXG4vKiogXHU2MDI3XHU4MEZEXHU2MzA3XHU2ODA3ICovXG5leHBvcnQgaW50ZXJmYWNlIFBlcmZvcm1hbmNlTWV0cmljcyB7XG4gIC8qKiBuYXZpZ2F0aW9uIHRpbWluZyAqL1xuICB0dGZiOiBudW1iZXI7XG4gIGRvbUNvbnRlbnRMb2FkZWQ6IG51bWJlcjtcbiAgbG9hZEV2ZW50OiBudW1iZXI7XG4gIC8qKiBMYXJnZXN0IENvbnRlbnRmdWwgUGFpbnQgKi9cbiAgbGNwPzogbnVtYmVyO1xuICAvKiogRmlyc3QgQ29udGVudGZ1bCBQYWludCAqL1xuICBmY3A/OiBudW1iZXI7XG4gIC8qKiBcdThENDRcdTZFOTBcdTY1NzBcdTkxQ0ZcdTRFMEVcdTRGNTNcdTc5RUYgKi9cbiAgcmVzb3VyY2VzOiB7IGNvdW50OiBudW1iZXI7IHRvdGFsQnl0ZXM6IG51bWJlciB9O1xuICAvKiogXHU5NTdGXHU0RUZCXHU1MkExXHVGRjA4XHU5NjNCXHU1ODVFXHU0RTNCXHU3RUJGXHU3QTBCXHVGRjA5XHU2QjIxXHU2NTcwICovXG4gIGxvbmdUYXNrczogbnVtYmVyO1xuICAvKiogXHU1MTg1XHU1QjU4XHVGRjA4XHU4RkQxXHU0RjNDXHVGRjA5ICovXG4gIGpzSGVhcFVzZWQ/OiBudW1iZXI7XG59XG5cbi8qKiBcdThCQ0FcdTY1QURcdTYyQTVcdTU0NEFcdTgwNUFcdTU0MDggKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGlhZ25vc2lzUmVwb3J0IHtcbiAgY29uc29sZTogRGlhZ25vc3RpY1JlZltdO1xuICBuZXR3b3JrOiBEaWFnbm9zdGljUmVmW107XG4gIGRvbTogRGlhZ25vc3RpY1JlZltdO1xuICBwZXJmb3JtYW5jZTogRGlhZ25vc3RpY1JlZltdO1xuICBqc0V4Y2VwdGlvbnM6IERpYWdub3N0aWNSZWZbXTtcbiAgYWNjZXNzaWJpbGl0eTogRGlhZ25vc3RpY1JlZltdO1xufVxuXG4vKiogXHU4QkNBXHU2NUFEXHU2NDU4XHU4OTgxXHVGRjFBXHU3RUQ5IEFJIFx1NzY4NFx1NEUwMFx1NTNFNVx1OEJERFx1N0VEM1x1OEJCQSAqL1xuZXhwb3J0IGludGVyZmFjZSBEaWFnbm9zaXNTdW1tYXJ5IHtcbiAgLyoqIFx1OTg3NVx1OTc2Mlx1NjYyRlx1NTQyNlx1NTA2NVx1NUVCNyAqL1xuICBoZWFsdGh5OiBib29sZWFuO1xuICAvKiogXHU1MTczXHU5NTJFXHU5NUVFXHU5ODk4XHU1MjE3XHU4ODY4XHVGRjA4XHU2MzA5XHU0RTI1XHU5MUNEXHU1RUE2XHU2MzkyXHU1RThGXHVGRjA5ICovXG4gIGlzc3VlczogQXJyYXk8e1xuICAgIGNhdGVnb3J5OiBEaWFnbm9zdGljQ2F0ZWdvcnk7XG4gICAgc2V2ZXJpdHk6IFwiZXJyb3JcIiB8IFwid2FybmluZ1wiO1xuICAgIG1lc3NhZ2U6IHN0cmluZztcbiAgfT47XG4gIC8qKiBcdTVFRkFcdThCQUVcdUZGMDhcdTRGOUIgQUkgXHU1MUIzXHU3QjU2XHU0RTBCXHU0RTAwXHU2QjY1XHVGRjA5ICovXG4gIHN1Z2dlc3Rpb25zOiBzdHJpbmdbXTtcbn1cbiIsICIvKipcbiAqIERpYWdub3Npc0NlbnRlciBcdTIwMTRcdTIwMTQgXHU4QkNBXHU2NUFEXHU0RTJEXHU1RkMzXHU5NUU4XHU5NzYyXG4gKiBcdTgwNUFcdTU0MDhcdTU0MDRcdTdDN0JcdTkxQzdcdTk2QzZcdTU2NjhcdUZGMENcdTRFQTdcdTUxRkFcdTdFREZcdTRFMDBcdThCQ0FcdTY1QURcdTYyQTVcdTU0NEFcdTRFMEUgQUkgXHU1M0VGXHU4QkZCXHU2NDU4XHU4OTgxXHUzMDAyXG4gKi9cbmltcG9ydCB0eXBlIHsgRGlhZ25vc3RpY1JlZiB9IGZyb20gXCJAb3BlbmxpdWxhbi9jb3JlXCI7XG5pbXBvcnQgdHlwZSB7IERpYWdub3Npc1JlcG9ydCwgRGlhZ25vc2lzU3VtbWFyeSwgRGlhZ25vc3RpY0NvbGxlY3RvciB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XG5pbXBvcnQgeyBzdW1tYXJpemUgfSBmcm9tIFwiLi9hbmFseXplci5qc1wiO1xuXG5leHBvcnQgY2xhc3MgRGlhZ25vc2lzQ2VudGVyIHtcbiAgcHJpdmF0ZSBjb2xsZWN0b3JzOiBEaWFnbm9zdGljQ29sbGVjdG9yW10gPSBbXTtcblxuICAvKiogXHU2Q0U4XHU1MThDXHU5MUM3XHU5NkM2XHU1NjY4XHVGRjA4XHU1RTk1XHU1QzQyXHU1RjE1XHU2NENFXHU2M0QwXHU0RjlCXHVGRjA5ICovXG4gIHJlZ2lzdGVyKGNvbGxlY3RvcjogRGlhZ25vc3RpY0NvbGxlY3Rvcik6IHRoaXMge1xuICAgIHRoaXMuY29sbGVjdG9ycy5wdXNoKGNvbGxlY3Rvcik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKiogXHU4RkQwXHU4ODRDXHU0RTAwXHU2QjIxXHU1QjhDXHU2NTc0XHU4QkNBXHU2NUFEICovXG4gIGFzeW5jIHJ1bigpOiBQcm9taXNlPERpYWdub3Npc1JlcG9ydD4ge1xuICAgIGNvbnN0IHJlcG9ydDogRGlhZ25vc2lzUmVwb3J0ID0ge1xuICAgICAgY29uc29sZTogW10sXG4gICAgICBuZXR3b3JrOiBbXSxcbiAgICAgIGRvbTogW10sXG4gICAgICBwZXJmb3JtYW5jZTogW10sXG4gICAgICBqc0V4Y2VwdGlvbnM6IFtdLFxuICAgICAgYWNjZXNzaWJpbGl0eTogW10sXG4gICAgfTtcblxuICAgIGNvbnN0IHRhc2tzID0gdGhpcy5jb2xsZWN0b3JzLm1hcChhc3luYyAoYykgPT4ge1xuICAgICAgY29uc3QgcmVmcyA9IGF3YWl0IGMuY29sbGVjdCgpO1xuICAgICAgcmV0dXJuIHsgY2F0ZWdvcnk6IGMuY2F0ZWdvcnksIHJlZnMgfTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQodGFza3MpO1xuICAgIGZvciAoY29uc3QgciBvZiByZXN1bHRzKSB7XG4gICAgICBpZiAoci5zdGF0dXMgPT09IFwiZnVsZmlsbGVkXCIpIHtcbiAgICAgICAgKHJlcG9ydCBhcyBhbnkpW3IudmFsdWUuY2F0ZWdvcnldID0gci52YWx1ZS5yZWZzO1xuICAgICAgfVxuICAgICAgLy8gXHU1MzU1XHU0RTJBXHU5MUM3XHU5NkM2XHU1NjY4XHU1OTMxXHU4RDI1XHU0RTBEXHU1RjcxXHU1NENEXHU2NTc0XHU0RjUzXHU4QkNBXHU2NUFEXG4gICAgfVxuICAgIHJldHVybiByZXBvcnQ7XG4gIH1cblxuICAvKiogXHU4M0I3XHU1M0Q2IEFJIFx1NTNFRlx1OEJGQlx1NjQ1OFx1ODk4MSAqL1xuICBhc3luYyBzdW1tYXJpemUoKTogUHJvbWlzZTxEaWFnbm9zaXNTdW1tYXJ5PiB7XG4gICAgY29uc3QgcmVwb3J0ID0gYXdhaXQgdGhpcy5ydW4oKTtcbiAgICByZXR1cm4gc3VtbWFyaXplKHJlcG9ydCk7XG4gIH1cblxuICAvKiogXHU0RkJGXHU2Mzc3XHVGRjFBXHU5MUM3XHU5NkM2XHU3RjUxXHU3RURDXHU1OTMxXHU4RDI1ICovXG4gIHN0YXRpYyBmbGF0dGVuRXJyb3JzKHJlcG9ydDogRGlhZ25vc2lzUmVwb3J0KTogRGlhZ25vc3RpY1JlZltdIHtcbiAgICByZXR1cm4gW1xuICAgICAgLi4ucmVwb3J0LmNvbnNvbGUuZmlsdGVyKChjKSA9PiBjLnNldmVyaXR5ID09PSBcImVycm9yXCIpLFxuICAgICAgLi4ucmVwb3J0Lm5ldHdvcmsuZmlsdGVyKChuKSA9PiBuLnNldmVyaXR5ID09PSBcImVycm9yXCIpLFxuICAgICAgLi4ucmVwb3J0LmpzRXhjZXB0aW9ucyxcbiAgICAgIC4uLnJlcG9ydC5wZXJmb3JtYW5jZS5maWx0ZXIoKHApID0+IHAuc2V2ZXJpdHkgPT09IFwiZXJyb3JcIiksXG4gICAgXTtcbiAgfVxufVxuXG5leHBvcnQgKiBmcm9tIFwiLi90eXBlcy5qc1wiO1xuZXhwb3J0IHsgYW5hbHl6ZU5ldHdvcmssIGFuYWx5emVQZXJmb3JtYW5jZSwgc3VtbWFyaXplIH0gZnJvbSBcIi4vYW5hbHl6ZXIuanNcIjtcbiIsICIvKipcbiAqIE1DUCBcdTVERTVcdTUxNzdcdTVCOUFcdTRFNDlcbiAqXG4gKiBcdTYyOEEgRm9yZ2UgXHU3Njg0XHU2ODM4XHU1RkMzXHU4MEZEXHU1MjlCXHU1QzAxXHU4OEM1XHU0RTNBXHU2ODA3XHU1MUM2XHU3Njg0IE1DUCBcdTVERTVcdTUxNzdcdTk2QzZcdUZGMENcdTRGOUJcdTRFRkJcdTRGNTUgTUNQIFx1NUJBMlx1NjIzN1x1N0FFRlx1RkYwOFxuICogZGVlcHNlZWsgaGFybmVzc1x1MzAwMWNuYi5jb29sXHUzMDAxQ2xhdWRlIERlc2t0b3AgXHU3QjQ5XHVGRjA5XHU4QzAzXHU3NTI4XHUzMDAyXG4gKlxuICogXHU1REU1XHU1MTc3XHU4QkJFXHU4QkExXHU1MzlGXHU1MjE5XHVGRjA4XHU1MDFGXHU5Mjc0IENocm9tZSBEZXZUb29scyBNQ1AgXHU3Njg0XHU4QzAzXHU4QkQ1XHU0RjE4XHU1MTQ4ICsgXHU5QUQ4XHU2NTQ4XHVGRjA5XHVGRjFBXG4gKiAtIG9ic2VydmVcdUZGMUFcdTlBRDhcdTY1NDhcdTk4NzVcdTk3NjJcdTVGRUJcdTcxNjdcdUZGMDhcdTY2RkZcdTRFRTNcdTUxOTdcdTk1N0YgRE9NIGR1bXBcdUZGMDlcbiAqIC0gYWN0XHVGRjFBXHU3RURGXHU0RTAwXHU1MkE4XHU0RjVDXHU2MjY3XHU4ODRDXG4gKiAtIGRpYWdub3NlXHVGRjFBNSBcdTY2MUZcdThDMDNcdThCRDVcdThCQ0FcdTY1QURcbiAqIC0gZXZhbFx1RkYxQVx1NkNFOFx1NTE2NSBKUyBcdTlBRDhcdTdFQTdcdThCQ0FcdTY1QURcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNY3BUb29sU2NoZW1hIHtcbiAgbmFtZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAvKiogSlNPTiBTY2hlbWEgXHU1MTY1XHU1M0MyICovXG4gIGlucHV0U2NoZW1hOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuZXhwb3J0IGNvbnN0IFRPT0xTOiBNY3BUb29sU2NoZW1hW10gPSBbXG4gIHtcbiAgICBuYW1lOiBcIm9ic2VydmVcIixcbiAgICBkZXNjcmlwdGlvbjpcbiAgICAgIFwiXHU4M0I3XHU1M0Q2XHU1RjUzXHU1MjREXHU5ODc1XHU5NzYyXHU3Njg0XHU5QUQ4XHU2NTQ4XHU1RkVCXHU3MTY3XHUzMDAyXHU4RkQ0XHU1NkRFXHU3Q0JFXHU3QjgwXHU1NDBFXHU3Njg0XHU1M0VGXHU0RUE0XHU0RTkyXHU1MTQzXHU3RDIwXHU3RDIyXHU1RjE1XHVGRjA4XHU1RTI2IHJlZlx1RkYwOVx1NEUwRVx1OTg3NVx1OTc2Mlx1N0VERlx1OEJBMVx1MzAwMlRva2VuIFx1NTNDQlx1NTk3RFx1RkYwQ1x1NjYyRlx1NzQwNlx1ODlFM1x1OTg3NVx1OTc2Mlx1NzY4NFx1OTk5Nlx1OTAwOVx1MzAwMlwiLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXhOb2RlczogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJcdTY3MDBcdTU5MjdcdTgyODJcdTcwQjlcdTY1NzBcdUZGMDhcdTlFRDhcdThCQTQgMjAwXHVGRjA5XCIgfSxcbiAgICAgICAgbWF4VGV4dExlbmd0aDogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJcdTUzNTVcdTgyODJcdTcwQjlcdTY1ODdcdTY3MkNcdTY3MDBcdTU5MjdcdTk1N0ZcdTVFQTZcdUZGMDhcdTlFRDhcdThCQTQgODBcdUZGMDlcIiB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogXCJhY3RcIixcbiAgICBkZXNjcmlwdGlvbjpcbiAgICAgIFwiXHU2MjY3XHU4ODRDXHU0RTAwXHU0RTJBXHU3RURGXHU0RTAwXHU2RDRGXHU4OUM4XHU1NjY4XHU1MkE4XHU0RjVDXHVGRjA4bmF2aWdhdGUvY2xpY2svZmlsbC90eXBlL3NlbGVjdC9ob3Zlci9zY3JvbGwvcHJlc3Mvd2FpdC9leHRyYWN0L2Fzc2VydC9zY3JlZW5zaG90L2V2YWx1YXRlXHVGRjA5XHUzMDAyXCIsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHR5cGU6IHtcbiAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgICAgIGVudW06IFtcIm5hdmlnYXRlXCIsIFwiY2xpY2tcIiwgXCJmaWxsXCIsIFwidHlwZVwiLCBcInNlbGVjdFwiLCBcImhvdmVyXCIsIFwic2Nyb2xsXCIsIFwicHJlc3NcIiwgXCJ3YWl0XCIsIFwiZXh0cmFjdFwiLCBcImFzc2VydFwiLCBcInNjcmVlbnNob3RcIiwgXCJldmFsdWF0ZVwiXSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcdTUyQThcdTRGNUNcdTdDN0JcdTU3OEJcIixcbiAgICAgICAgfSxcbiAgICAgICAgZGVzY3JpcHRpb246IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxuICAgICAgICAvLyBcdTkwMUFcdTc1MjhcdTVCOUFcdTRGNERcbiAgICAgICAgcmVmOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIm9ic2VydmUgXHU4RkQ0XHU1NkRFXHU3Njg0XHU1MTQzXHU3RDIwIHJlZlx1RkYwOFx1NjcwMFx1N0NCRVx1Nzg2RVx1RkYwOVwiIH0sXG4gICAgICAgIHNlbGVjdG9yOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIkNTUyBcdTkwMDlcdTYyRTlcdTU2NjhcIiB9LFxuICAgICAgICB0ZXh0OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlx1N0NCRVx1Nzg2RVx1NjU4N1x1NjcyQ1x1NUI5QVx1NEY0RFwiIH0sXG4gICAgICAgIHNlbWFudGljOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlx1OEJFRFx1NEU0OVx1NjNDRlx1OEZGMFx1NUI5QVx1NEY0RFwiIH0sXG4gICAgICAgIC8vIFx1NTJBOFx1NEY1Q1x1NTNDMlx1NjU3MFxuICAgICAgICB1cmw6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxuICAgICAgICB2YWx1ZTogeyB0eXBlOiBcInN0cmluZ1wiIH0sXG4gICAgICAgIGtleTogeyB0eXBlOiBcInN0cmluZ1wiIH0sXG4gICAgICAgIG1zOiB7IHR5cGU6IFwibnVtYmVyXCIgfSxcbiAgICAgICAgc2NyaXB0OiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcbiAgICAgICAgbW9kZTogeyB0eXBlOiBcInN0cmluZ1wiIH0sXG4gICAgICAgIGV4cGVjdGVkOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcbiAgICAgICAgLy8gXHU2MjJBXHU1NkZFL1x1NkVEQVx1NTJBOC9cdThGOTNcdTUxNjUvXHU1QkZDXHU4MjJBXHU3RUM2XHU4MjgyXHVGRjA4XHU0RjlCIElERSBcdTc2ODQgZnVuY3Rpb24gY2FsbGluZyBcdTVCOENcdTY1NzRcdTU4RjBcdTY2MEVcdUZGMENcdTkwN0ZcdTUxNERcdTgwRkRcdTUyOUJcdTg4QUJcdTk2OTBcdTg1Q0ZcdUZGMDlcbiAgICAgICAgZnVsbFBhZ2U6IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcInNjcmVlbnNob3QgXHU2NUY2XHU2NjJGXHU1NDI2XHU2NTc0XHU5ODc1XHU2MjJBXHU1NkZFXCIgfSxcbiAgICAgICAgZGVsdGFZOiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcInNjcm9sbCBcdTY1RjZcdTU3ODJcdTc2RjRcdTZFREFcdTUyQThcdThERERcdTc5QkJcIiB9LFxuICAgICAgICBkZWxheTogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJ0eXBlIFx1NjVGNlx1OTAxMFx1OTUyRVx1OEY5M1x1NTE2NVx1NUVGNlx1OEZERihtcylcIiB9LFxuICAgICAgICB3YWl0VW50aWw6IHsgdHlwZTogXCJzdHJpbmdcIiwgZW51bTogW1wibG9hZFwiLCBcImRvbWNvbnRlbnRsb2FkZWRcIiwgXCJuZXR3b3JraWRsZVwiLCBcImNvbW1pdFwiXSwgZGVzY3JpcHRpb246IFwibmF2aWdhdGUgXHU2NUY2XHU3QjQ5XHU1Rjg1XHU3QjU2XHU3NTY1XCIgfSxcbiAgICAgICAgd2FpdEZvck5hdmlnYXRpb246IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcImNsaWNrIFx1NjVGNlx1NjYyRlx1NTQyNlx1N0I0OVx1NUY4NVx1NUJGQ1x1ODIyQVx1N0EzM1x1NUI5QVx1RkYwOFx1NzBCOVx1NTFGQlx1OTRGRVx1NjNBNVx1ODlFNlx1NTNEMVx1OERGM1x1OEY2Q1x1NjVGNlx1RkYwOVwiIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFtcInR5cGVcIl0sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6IFwiZGlhZ25vc2VcIixcbiAgICBkZXNjcmlwdGlvbjpcbiAgICAgIFwiXHU4RkQwXHU4ODRDIDUgXHU2NjFGXHU4QzAzXHU4QkQ1XHU4QkNBXHU2NUFEXHVGRjBDXHU5MUM3XHU5NkM2XHU2M0E3XHU1MjM2XHU1M0YwXHU5NTE5XHU4QkVGXHUzMDAxXHU3RjUxXHU3RURDXHU1OTMxXHU4RDI1XHUzMDAxSlMgXHU1RjAyXHU1RTM4XHUzMDAxXHU2MDI3XHU4MEZEXHU2MzA3XHU2ODA3XHVGRjBDXHU1RTc2XHU4RkQ0XHU1NkRFXHU1MDY1XHU1RUI3XHU1RUE2XHU0RTBFIEFJIFx1NTNFRlx1OEJGQlx1NUVGQVx1OEJBRVx1MzAwMlx1NTJBOFx1NEY1Q1x1NTkzMVx1OEQyNVx1NTQwRVx1ODFFQVx1NTJBOFx1OEJDQVx1NjVBRFx1MzAwMlwiLFxuICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiBcImV2YWxcIixcbiAgICBkZXNjcmlwdGlvbjogXCJcdTU3MjhcdTk4NzVcdTk3NjJcdTZDRThcdTUxNjVcdTYyNjdcdTg4NEMgSmF2YVNjcmlwdFx1RkYwQ1x1NzUyOFx1NEU4RVx1OUFEOFx1N0VBN1x1OEJDQVx1NjVBRFx1NEUwRVx1NzJCNlx1NjAwMVx1NjhDMFx1NjdFNVx1MzAwMlwiLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgcHJvcGVydGllczogeyBzY3JpcHQ6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiXHU4OTgxXHU2MjY3XHU4ODRDXHU3Njg0IEpTIFx1ODg2OFx1OEZCRVx1NUYwRi9cdThCRURcdTUzRTVcIiB9IH0sXG4gICAgICByZXF1aXJlZDogW1wic2NyaXB0XCJdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiBcInNjcmVlbnNob3RcIixcbiAgICBkZXNjcmlwdGlvbjpcbiAgICAgIFwiXHU2MjJBXHU1M0Q2XHU1RjUzXHU1MjREXHU5ODc1XHU5NzYyXHVGRjA4XHU1M0VGXHU2NTc0XHU5ODc1XHVGRjA5XHVGRjBDXHU4RkQ0XHU1NkRFIGJhc2U2NCBcdTU2RkVcdTcyNDdcdUZGMENcdTc1MjhcdTRFOEVcdTg5QzZcdTg5QzlcdTc4NkVcdThCQTRcdTMwMDJcdTYyMkFcdTU2RkVcdTRGMUFcdTRGNUNcdTRFM0FcdTU2RkVcdTcyNDdcdTRFOEJcdTRFRjZcdTUxOTlcdTUxNjVcdTRGMUFcdThCRERcdTY1RTVcdTVGRDdcdUZGMENcdTRGOUJcdTU5MUFcdTZBMjFcdTYwMDEgQUkgXHU2RDg4XHU4RDM5XHUzMDAyXCIsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGZ1bGxQYWdlOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbjogXCJcdTY2MkZcdTU0MjZcdTY1NzRcdTk4NzVcdTYyMkFcdTU2RkVcIiB9LFxuICAgICAgICBjYXB0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlx1NjIyQVx1NTZGRVx1OEJGNFx1NjYwRVx1RkYwOFx1NTE5OVx1NTE2NVx1NjVFNVx1NUZEN1x1NEU4Qlx1NEVGNlx1RkYwOVwiIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiBcInNlc3Npb25fbG9nXCIsXG4gICAgZGVzY3JpcHRpb246XG4gICAgICBcIlx1ODNCN1x1NTNENlx1NUY1M1x1NTI0RFx1NEYxQVx1OEJERFx1NzY4NFx1NEU4Qlx1NEVGNlx1NjVFNVx1NUZEN1x1NkQ0MVx1RkYwOFx1NTJBOFx1NEY1Qy9cdThCQ0FcdTY1QUQvXHU5NTE5XHU4QkVGL1x1NjIyQVx1NTZGRVx1OEY2OFx1OEZGOVx1RkYwOVx1MzAwMlx1OEZEOVx1NjYyRiBBSSBcdTUzNEZcdTRGNUNcdTc2ODRcdThGRkRcdThFMkFcdTgwRkRcdTUyOUJcdUZGMUFcdThCQTlcdTU5MTZcdTkwRTggQUkgXHU3NzBCXHU1MjMwXHUzMDBFXHU1M0QxXHU3NTFGXHU0RTg2XHU0RUMwXHU0RTQ4ICsgXHU0RTNBXHU0RUMwXHU0RTQ4XHU1OTMxXHU4RDI1ICsgXHU1RUZBXHU4QkFFXHUzMDBGXHUzMDAyZm9ybWF0PWpzb24gXHU4RkQ0XHU1NkRFXHU3RUQzXHU2Nzg0XHU1MzE2XHU0RThCXHU0RUY2XHVGRjBDXHU5RUQ4XHU4QkE0XHU4RkQ0XHU1NkRFIG1hcmtkb3duXHUzMDAyXCIsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGZvcm1hdDogeyB0eXBlOiBcInN0cmluZ1wiLCBlbnVtOiBbXCJtYXJrZG93blwiLCBcImpzb25cIl0sIGRlc2NyaXB0aW9uOiBcIlx1OEY5M1x1NTFGQVx1NjgzQ1x1NUYwRlx1RkYwQ1x1OUVEOFx1OEJBNCBtYXJrZG93blwiIH0sXG4gICAgICAgIHRpdGxlOiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIm1hcmtkb3duIFx1NjJBNVx1NTQ0QVx1NjgwN1x1OTg5OFwiIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiBcImNsb3NlXCIsXG4gICAgZGVzY3JpcHRpb246IFwiXHU1MTczXHU5NUVEXHU2RDRGXHU4OUM4XHU1NjY4XHVGRjBDXHU3RUQzXHU2NzVGXHU0RjFBXHU4QkREXHUzMDAyXCIsXG4gICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30gfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6IFwic3RlYWx0aF9zdGF0dXNcIixcbiAgICBkZXNjcmlwdGlvbjogXCJcdTY3RTVcdTc3MEJcdTk2MzJcdTY4QzBcdTZENEJcdUZGMDhTdGVhbHRoXHVGRjA5XHU2QTIxXHU1NzU3XHU3MkI2XHU2MDAxXHVGRjFBXHU2NjJGXHU1NDI2XHU1NDJGXHU3NTI4XHUzMDAxXHU3RUE3XHU1MjJCXHUzMDAxVUEgXHU3QjU2XHU3NTY1XHU3QjQ5XHUzMDAyXHU5NjMyXHU2OEMwXHU2RDRCXHU3NTI4XHU0RThFXHU5MDdGXHU1MTREXHU4OEFCXHU3NkVFXHU2ODA3XHU3QUQ5XHU3MEI5XHU4QkM2XHU1MjJCXHU0RTNBXHU3MjJDXHU4NjZCXHU4MDBDXHU5NjUwXHU5MDFGL1x1NUMwMVx1Nzk4MVx1MzAwMlwiLFxuICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXG4gIH0sXG5dO1xuXG4vKiogXHU1REU1XHU1MTc3XHU4QzAzXHU3NTI4XHU3RUQzXHU2NzlDXHVGRjA4XHU1MzRGXHU4QkFFXHU2NUUwXHU1MTczXHU3Njg0XHU2ODA3XHU1MUM2XHU1NENEXHU1RTk0XHU3RUQzXHU2Nzg0XHVGRjA5ICovXG5leHBvcnQgaW50ZXJmYWNlIFRvb2xSZXN1bHQge1xuICAvKiogXHU2NjJGXHU1NDI2XHU2MjEwXHU1MjlGICovXG4gIG9rOiBib29sZWFuO1xuICAvKiogXHU0RjlCIEFJIFx1OTYwNVx1OEJGQlx1NzY4NFx1NjU4N1x1NjcyQyAqL1xuICBjb250ZW50OiBBcnJheTx7IHR5cGU6IFwidGV4dFwiOyB0ZXh0OiBzdHJpbmcgfT47XG4gIC8qKiBcdTdFRDNcdTY3ODRcdTUzMTZcdTY1NzBcdTYzNkVcdUZGMDhcdTU5ODJcdTYyMkFcdTU2RkUgYmFzZTY0XHVGRjA5ICovXG4gIHN0cnVjdHVyZWQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgLyoqIFx1OTUxOVx1OEJFRlx1NEZFMVx1NjA2RiAqL1xuICBpc0Vycm9yPzogYm9vbGVhbjtcbn1cblxuLyoqIFx1NjI4QVx1NEVGQlx1NjEwRlx1N0VEM1x1Njc5Q1x1NTMwNVx1ODhDNVx1NEUzQVx1NjgwN1x1NTFDNiBUb29sUmVzdWx0ICovXG5leHBvcnQgZnVuY3Rpb24gb2tSZXN1bHQodGV4dDogc3RyaW5nLCBzdHJ1Y3R1cmVkPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBUb29sUmVzdWx0IHtcbiAgcmV0dXJuIHsgb2s6IHRydWUsIGNvbnRlbnQ6IFt7IHR5cGU6IFwidGV4dFwiLCB0ZXh0IH1dLCBzdHJ1Y3R1cmVkIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcnJSZXN1bHQodGV4dDogc3RyaW5nKTogVG9vbFJlc3VsdCB7XG4gIHJldHVybiB7IG9rOiBmYWxzZSwgY29udGVudDogW3sgdHlwZTogXCJ0ZXh0XCIsIHRleHQgfV0sIGlzRXJyb3I6IHRydWUgfTtcbn1cbiIsICJleHBvcnQgKiBmcm9tIFwiLi9lcnJvcnMuanNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2hlbHBlcnMvcGFyc2VVdGlsLmpzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9oZWxwZXJzL3R5cGVBbGlhc2VzLmpzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9oZWxwZXJzL3V0aWwuanNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3R5cGVzLmpzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9ab2RFcnJvci5qc1wiO1xuIiwgImV4cG9ydCB2YXIgdXRpbDtcbihmdW5jdGlvbiAodXRpbCkge1xuICAgIHV0aWwuYXNzZXJ0RXF1YWwgPSAoXykgPT4geyB9O1xuICAgIGZ1bmN0aW9uIGFzc2VydElzKF9hcmcpIHsgfVxuICAgIHV0aWwuYXNzZXJ0SXMgPSBhc3NlcnRJcztcbiAgICBmdW5jdGlvbiBhc3NlcnROZXZlcihfeCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9XG4gICAgdXRpbC5hc3NlcnROZXZlciA9IGFzc2VydE5ldmVyO1xuICAgIHV0aWwuYXJyYXlUb0VudW0gPSAoaXRlbXMpID0+IHtcbiAgICAgICAgY29uc3Qgb2JqID0ge307XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgb2JqW2l0ZW1dID0gaXRlbTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gICAgdXRpbC5nZXRWYWxpZEVudW1WYWx1ZXMgPSAob2JqKSA9PiB7XG4gICAgICAgIGNvbnN0IHZhbGlkS2V5cyA9IHV0aWwub2JqZWN0S2V5cyhvYmopLmZpbHRlcigoaykgPT4gdHlwZW9mIG9ialtvYmpba11dICE9PSBcIm51bWJlclwiKTtcbiAgICAgICAgY29uc3QgZmlsdGVyZWQgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrIG9mIHZhbGlkS2V5cykge1xuICAgICAgICAgICAgZmlsdGVyZWRba10gPSBvYmpba107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV0aWwub2JqZWN0VmFsdWVzKGZpbHRlcmVkKTtcbiAgICB9O1xuICAgIHV0aWwub2JqZWN0VmFsdWVzID0gKG9iaikgPT4ge1xuICAgICAgICByZXR1cm4gdXRpbC5vYmplY3RLZXlzKG9iaikubWFwKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqW2VdO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHV0aWwub2JqZWN0S2V5cyA9IHR5cGVvZiBPYmplY3Qua2V5cyA9PT0gXCJmdW5jdGlvblwiIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgYmFuL2JhblxuICAgICAgICA/IChvYmopID0+IE9iamVjdC5rZXlzKG9iaikgLy8gZXNsaW50LWRpc2FibGUtbGluZSBiYW4vYmFuXG4gICAgICAgIDogKG9iamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5cyA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICAgIH07XG4gICAgdXRpbC5maW5kID0gKGFyciwgY2hlY2tlcikgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgYXJyKSB7XG4gICAgICAgICAgICBpZiAoY2hlY2tlcihpdGVtKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH07XG4gICAgdXRpbC5pc0ludGVnZXIgPSB0eXBlb2YgTnVtYmVyLmlzSW50ZWdlciA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgID8gKHZhbCkgPT4gTnVtYmVyLmlzSW50ZWdlcih2YWwpIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgYmFuL2JhblxuICAgICAgICA6ICh2YWwpID0+IHR5cGVvZiB2YWwgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKHZhbCkgJiYgTWF0aC5mbG9vcih2YWwpID09PSB2YWw7XG4gICAgZnVuY3Rpb24gam9pblZhbHVlcyhhcnJheSwgc2VwYXJhdG9yID0gXCIgfCBcIikge1xuICAgICAgICByZXR1cm4gYXJyYXkubWFwKCh2YWwpID0+ICh0eXBlb2YgdmFsID09PSBcInN0cmluZ1wiID8gYCcke3ZhbH0nYCA6IHZhbCkpLmpvaW4oc2VwYXJhdG9yKTtcbiAgICB9XG4gICAgdXRpbC5qb2luVmFsdWVzID0gam9pblZhbHVlcztcbiAgICB1dGlsLmpzb25TdHJpbmdpZnlSZXBsYWNlciA9IChfLCB2YWx1ZSkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcImJpZ2ludFwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbn0pKHV0aWwgfHwgKHV0aWwgPSB7fSkpO1xuZXhwb3J0IHZhciBvYmplY3RVdGlsO1xuKGZ1bmN0aW9uIChvYmplY3RVdGlsKSB7XG4gICAgb2JqZWN0VXRpbC5tZXJnZVNoYXBlcyA9IChmaXJzdCwgc2Vjb25kKSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAuLi5maXJzdCxcbiAgICAgICAgICAgIC4uLnNlY29uZCwgLy8gc2Vjb25kIG92ZXJ3cml0ZXMgZmlyc3RcbiAgICAgICAgfTtcbiAgICB9O1xufSkob2JqZWN0VXRpbCB8fCAob2JqZWN0VXRpbCA9IHt9KSk7XG5leHBvcnQgY29uc3QgWm9kUGFyc2VkVHlwZSA9IHV0aWwuYXJyYXlUb0VudW0oW1xuICAgIFwic3RyaW5nXCIsXG4gICAgXCJuYW5cIixcbiAgICBcIm51bWJlclwiLFxuICAgIFwiaW50ZWdlclwiLFxuICAgIFwiZmxvYXRcIixcbiAgICBcImJvb2xlYW5cIixcbiAgICBcImRhdGVcIixcbiAgICBcImJpZ2ludFwiLFxuICAgIFwic3ltYm9sXCIsXG4gICAgXCJmdW5jdGlvblwiLFxuICAgIFwidW5kZWZpbmVkXCIsXG4gICAgXCJudWxsXCIsXG4gICAgXCJhcnJheVwiLFxuICAgIFwib2JqZWN0XCIsXG4gICAgXCJ1bmtub3duXCIsXG4gICAgXCJwcm9taXNlXCIsXG4gICAgXCJ2b2lkXCIsXG4gICAgXCJuZXZlclwiLFxuICAgIFwibWFwXCIsXG4gICAgXCJzZXRcIixcbl0pO1xuZXhwb3J0IGNvbnN0IGdldFBhcnNlZFR5cGUgPSAoZGF0YSkgPT4ge1xuICAgIGNvbnN0IHQgPSB0eXBlb2YgZGF0YTtcbiAgICBzd2l0Y2ggKHQpIHtcbiAgICAgICAgY2FzZSBcInVuZGVmaW5lZFwiOlxuICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUudW5kZWZpbmVkO1xuICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5zdHJpbmc7XG4gICAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIuaXNOYU4oZGF0YSkgPyBab2RQYXJzZWRUeXBlLm5hbiA6IFpvZFBhcnNlZFR5cGUubnVtYmVyO1xuICAgICAgICBjYXNlIFwiYm9vbGVhblwiOlxuICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUuYm9vbGVhbjtcbiAgICAgICAgY2FzZSBcImZ1bmN0aW9uXCI6XG4gICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5mdW5jdGlvbjtcbiAgICAgICAgY2FzZSBcImJpZ2ludFwiOlxuICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUuYmlnaW50O1xuICAgICAgICBjYXNlIFwic3ltYm9sXCI6XG4gICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5zeW1ib2w7XG4gICAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUuYXJyYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBab2RQYXJzZWRUeXBlLm51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS50aGVuICYmIHR5cGVvZiBkYXRhLnRoZW4gPT09IFwiZnVuY3Rpb25cIiAmJiBkYXRhLmNhdGNoICYmIHR5cGVvZiBkYXRhLmNhdGNoID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5wcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBNYXAgIT09IFwidW5kZWZpbmVkXCIgJiYgZGF0YSBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBab2RQYXJzZWRUeXBlLm1hcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgU2V0ICE9PSBcInVuZGVmaW5lZFwiICYmIGRhdGEgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5zZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIERhdGUgIT09IFwidW5kZWZpbmVkXCIgJiYgZGF0YSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5kYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUub2JqZWN0O1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUudW5rbm93bjtcbiAgICB9XG59O1xuIiwgImltcG9ydCB7IHV0aWwgfSBmcm9tIFwiLi9oZWxwZXJzL3V0aWwuanNcIjtcbmV4cG9ydCBjb25zdCBab2RJc3N1ZUNvZGUgPSB1dGlsLmFycmF5VG9FbnVtKFtcbiAgICBcImludmFsaWRfdHlwZVwiLFxuICAgIFwiaW52YWxpZF9saXRlcmFsXCIsXG4gICAgXCJjdXN0b21cIixcbiAgICBcImludmFsaWRfdW5pb25cIixcbiAgICBcImludmFsaWRfdW5pb25fZGlzY3JpbWluYXRvclwiLFxuICAgIFwiaW52YWxpZF9lbnVtX3ZhbHVlXCIsXG4gICAgXCJ1bnJlY29nbml6ZWRfa2V5c1wiLFxuICAgIFwiaW52YWxpZF9hcmd1bWVudHNcIixcbiAgICBcImludmFsaWRfcmV0dXJuX3R5cGVcIixcbiAgICBcImludmFsaWRfZGF0ZVwiLFxuICAgIFwiaW52YWxpZF9zdHJpbmdcIixcbiAgICBcInRvb19zbWFsbFwiLFxuICAgIFwidG9vX2JpZ1wiLFxuICAgIFwiaW52YWxpZF9pbnRlcnNlY3Rpb25fdHlwZXNcIixcbiAgICBcIm5vdF9tdWx0aXBsZV9vZlwiLFxuICAgIFwibm90X2Zpbml0ZVwiLFxuXSk7XG5leHBvcnQgY29uc3QgcXVvdGVsZXNzSnNvbiA9IChvYmopID0+IHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5zdHJpbmdpZnkob2JqLCBudWxsLCAyKTtcbiAgICByZXR1cm4ganNvbi5yZXBsYWNlKC9cIihbXlwiXSspXCI6L2csIFwiJDE6XCIpO1xufTtcbmV4cG9ydCBjbGFzcyBab2RFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgICBnZXQgZXJyb3JzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pc3N1ZXM7XG4gICAgfVxuICAgIGNvbnN0cnVjdG9yKGlzc3Vlcykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmlzc3VlcyA9IFtdO1xuICAgICAgICB0aGlzLmFkZElzc3VlID0gKHN1YikgPT4ge1xuICAgICAgICAgICAgdGhpcy5pc3N1ZXMgPSBbLi4udGhpcy5pc3N1ZXMsIHN1Yl07XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuYWRkSXNzdWVzID0gKHN1YnMgPSBbXSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5pc3N1ZXMgPSBbLi4udGhpcy5pc3N1ZXMsIC4uLnN1YnNdO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBhY3R1YWxQcm90byA9IG5ldy50YXJnZXQucHJvdG90eXBlO1xuICAgICAgICBpZiAoT2JqZWN0LnNldFByb3RvdHlwZU9mKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgYmFuL2JhblxuICAgICAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsIGFjdHVhbFByb3RvKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX19wcm90b19fID0gYWN0dWFsUHJvdG87XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5uYW1lID0gXCJab2RFcnJvclwiO1xuICAgICAgICB0aGlzLmlzc3VlcyA9IGlzc3VlcztcbiAgICB9XG4gICAgZm9ybWF0KF9tYXBwZXIpIHtcbiAgICAgICAgY29uc3QgbWFwcGVyID0gX21hcHBlciB8fFxuICAgICAgICAgICAgZnVuY3Rpb24gKGlzc3VlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzc3VlLm1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICBjb25zdCBmaWVsZEVycm9ycyA9IHsgX2Vycm9yczogW10gfTtcbiAgICAgICAgY29uc3QgcHJvY2Vzc0Vycm9yID0gKGVycm9yKSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlzc3VlIG9mIGVycm9yLmlzc3Vlcykge1xuICAgICAgICAgICAgICAgIGlmIChpc3N1ZS5jb2RlID09PSBcImludmFsaWRfdW5pb25cIikge1xuICAgICAgICAgICAgICAgICAgICBpc3N1ZS51bmlvbkVycm9ycy5tYXAocHJvY2Vzc0Vycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoaXNzdWUuY29kZSA9PT0gXCJpbnZhbGlkX3JldHVybl90eXBlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc0Vycm9yKGlzc3VlLnJldHVyblR5cGVFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLmNvZGUgPT09IFwiaW52YWxpZF9hcmd1bWVudHNcIikge1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzRXJyb3IoaXNzdWUuYXJndW1lbnRzRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChpc3N1ZS5wYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBmaWVsZEVycm9ycy5fZXJyb3JzLnB1c2gobWFwcGVyKGlzc3VlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgY3VyciA9IGZpZWxkRXJyb3JzO1xuICAgICAgICAgICAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChpIDwgaXNzdWUucGF0aC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gaXNzdWUucGF0aFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlcm1pbmFsID0gaSA9PT0gaXNzdWUucGF0aC5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0ZXJtaW5hbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJbZWxdID0gY3VycltlbF0gfHwgeyBfZXJyb3JzOiBbXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmICh0eXBlb2YgZWwgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgIGN1cnJbZWxdID0gY3VycltlbF0gfHwgeyBfZXJyb3JzOiBbXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0gZWxzZSBpZiAodHlwZW9mIGVsID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICBjb25zdCBlcnJvckFycmF5OiBhbnkgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgIGVycm9yQXJyYXkuX2Vycm9ycyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgY3VycltlbF0gPSBjdXJyW2VsXSB8fCBlcnJvckFycmF5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJbZWxdID0gY3VycltlbF0gfHwgeyBfZXJyb3JzOiBbXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJbZWxdLl9lcnJvcnMucHVzaChtYXBwZXIoaXNzdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnIgPSBjdXJyW2VsXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcHJvY2Vzc0Vycm9yKHRoaXMpO1xuICAgICAgICByZXR1cm4gZmllbGRFcnJvcnM7XG4gICAgfVxuICAgIHN0YXRpYyBhc3NlcnQodmFsdWUpIHtcbiAgICAgICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBab2RFcnJvcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IGEgWm9kRXJyb3I6ICR7dmFsdWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2U7XG4gICAgfVxuICAgIGdldCBtZXNzYWdlKCkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5pc3N1ZXMsIHV0aWwuanNvblN0cmluZ2lmeVJlcGxhY2VyLCAyKTtcbiAgICB9XG4gICAgZ2V0IGlzRW1wdHkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzc3Vlcy5sZW5ndGggPT09IDA7XG4gICAgfVxuICAgIGZsYXR0ZW4obWFwcGVyID0gKGlzc3VlKSA9PiBpc3N1ZS5tZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGZpZWxkRXJyb3JzID0ge307XG4gICAgICAgIGNvbnN0IGZvcm1FcnJvcnMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzdWIgb2YgdGhpcy5pc3N1ZXMpIHtcbiAgICAgICAgICAgIGlmIChzdWIucGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlyc3RFbCA9IHN1Yi5wYXRoWzBdO1xuICAgICAgICAgICAgICAgIGZpZWxkRXJyb3JzW2ZpcnN0RWxdID0gZmllbGRFcnJvcnNbZmlyc3RFbF0gfHwgW107XG4gICAgICAgICAgICAgICAgZmllbGRFcnJvcnNbZmlyc3RFbF0ucHVzaChtYXBwZXIoc3ViKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3JtRXJyb3JzLnB1c2gobWFwcGVyKHN1YikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IGZvcm1FcnJvcnMsIGZpZWxkRXJyb3JzIH07XG4gICAgfVxuICAgIGdldCBmb3JtRXJyb3JzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mbGF0dGVuKCk7XG4gICAgfVxufVxuWm9kRXJyb3IuY3JlYXRlID0gKGlzc3VlcykgPT4ge1xuICAgIGNvbnN0IGVycm9yID0gbmV3IFpvZEVycm9yKGlzc3Vlcyk7XG4gICAgcmV0dXJuIGVycm9yO1xufTtcbiIsICJpbXBvcnQgeyBab2RJc3N1ZUNvZGUgfSBmcm9tIFwiLi4vWm9kRXJyb3IuanNcIjtcbmltcG9ydCB7IHV0aWwsIFpvZFBhcnNlZFR5cGUgfSBmcm9tIFwiLi4vaGVscGVycy91dGlsLmpzXCI7XG5jb25zdCBlcnJvck1hcCA9IChpc3N1ZSwgX2N0eCkgPT4ge1xuICAgIGxldCBtZXNzYWdlO1xuICAgIHN3aXRjaCAoaXNzdWUuY29kZSkge1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGU6XG4gICAgICAgICAgICBpZiAoaXNzdWUucmVjZWl2ZWQgPT09IFpvZFBhcnNlZFR5cGUudW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiUmVxdWlyZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgRXhwZWN0ZWQgJHtpc3N1ZS5leHBlY3RlZH0sIHJlY2VpdmVkICR7aXNzdWUucmVjZWl2ZWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX2xpdGVyYWw6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludmFsaWQgbGl0ZXJhbCB2YWx1ZSwgZXhwZWN0ZWQgJHtKU09OLnN0cmluZ2lmeShpc3N1ZS5leHBlY3RlZCwgdXRpbC5qc29uU3RyaW5naWZ5UmVwbGFjZXIpfWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUudW5yZWNvZ25pemVkX2tleXM6XG4gICAgICAgICAgICBtZXNzYWdlID0gYFVucmVjb2duaXplZCBrZXkocykgaW4gb2JqZWN0OiAke3V0aWwuam9pblZhbHVlcyhpc3N1ZS5rZXlzLCBcIiwgXCIpfWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF91bmlvbjpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCBpbnB1dGA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF91bmlvbl9kaXNjcmltaW5hdG9yOlxuICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGRpc2NyaW1pbmF0b3IgdmFsdWUuIEV4cGVjdGVkICR7dXRpbC5qb2luVmFsdWVzKGlzc3VlLm9wdGlvbnMpfWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9lbnVtX3ZhbHVlOlxuICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGVudW0gdmFsdWUuIEV4cGVjdGVkICR7dXRpbC5qb2luVmFsdWVzKGlzc3VlLm9wdGlvbnMpfSwgcmVjZWl2ZWQgJyR7aXNzdWUucmVjZWl2ZWR9J2A7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9hcmd1bWVudHM6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludmFsaWQgZnVuY3Rpb24gYXJndW1lbnRzYDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX3JldHVybl90eXBlOlxuICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGZ1bmN0aW9uIHJldHVybiB0eXBlYDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX2RhdGU6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludmFsaWQgZGF0ZWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmc6XG4gICAgICAgICAgICBpZiAodHlwZW9mIGlzc3VlLnZhbGlkYXRpb24gPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoXCJpbmNsdWRlc1wiIGluIGlzc3VlLnZhbGlkYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGlucHV0OiBtdXN0IGluY2x1ZGUgXCIke2lzc3VlLnZhbGlkYXRpb24uaW5jbHVkZXN9XCJgO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlzc3VlLnZhbGlkYXRpb24ucG9zaXRpb24gPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgJHttZXNzYWdlfSBhdCBvbmUgb3IgbW9yZSBwb3NpdGlvbnMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvICR7aXNzdWUudmFsaWRhdGlvbi5wb3NpdGlvbn1gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKFwic3RhcnRzV2l0aFwiIGluIGlzc3VlLnZhbGlkYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGlucHV0OiBtdXN0IHN0YXJ0IHdpdGggXCIke2lzc3VlLnZhbGlkYXRpb24uc3RhcnRzV2l0aH1cImA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKFwiZW5kc1dpdGhcIiBpbiBpc3N1ZS52YWxpZGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCBpbnB1dDogbXVzdCBlbmQgd2l0aCBcIiR7aXNzdWUudmFsaWRhdGlvbi5lbmRzV2l0aH1cImA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB1dGlsLmFzc2VydE5ldmVyKGlzc3VlLnZhbGlkYXRpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnZhbGlkYXRpb24gIT09IFwicmVnZXhcIikge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCAke2lzc3VlLnZhbGlkYXRpb259YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIkludmFsaWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS50b29fc21hbGw6XG4gICAgICAgICAgICBpZiAoaXNzdWUudHlwZSA9PT0gXCJhcnJheVwiKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgQXJyYXkgbXVzdCBjb250YWluICR7aXNzdWUuZXhhY3QgPyBcImV4YWN0bHlcIiA6IGlzc3VlLmluY2x1c2l2ZSA/IGBhdCBsZWFzdGAgOiBgbW9yZSB0aGFuYH0gJHtpc3N1ZS5taW5pbXVtfSBlbGVtZW50KHMpYDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBTdHJpbmcgbXVzdCBjb250YWluICR7aXNzdWUuZXhhY3QgPyBcImV4YWN0bHlcIiA6IGlzc3VlLmluY2x1c2l2ZSA/IGBhdCBsZWFzdGAgOiBgb3ZlcmB9ICR7aXNzdWUubWluaW11bX0gY2hhcmFjdGVyKHMpYDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBOdW1iZXIgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHkgZXF1YWwgdG8gYCA6IGlzc3VlLmluY2x1c2l2ZSA/IGBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gYCA6IGBncmVhdGVyIHRoYW4gYH0ke2lzc3VlLm1pbmltdW19YDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwiYmlnaW50XCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBOdW1iZXIgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHkgZXF1YWwgdG8gYCA6IGlzc3VlLmluY2x1c2l2ZSA/IGBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gYCA6IGBncmVhdGVyIHRoYW4gYH0ke2lzc3VlLm1pbmltdW19YDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwiZGF0ZVwiKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgRGF0ZSBtdXN0IGJlICR7aXNzdWUuZXhhY3QgPyBgZXhhY3RseSBlcXVhbCB0byBgIDogaXNzdWUuaW5jbHVzaXZlID8gYGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byBgIDogYGdyZWF0ZXIgdGhhbiBgfSR7bmV3IERhdGUoTnVtYmVyKGlzc3VlLm1pbmltdW0pKX1gO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIkludmFsaWQgaW5wdXRcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS50b29fYmlnOlxuICAgICAgICAgICAgaWYgKGlzc3VlLnR5cGUgPT09IFwiYXJyYXlcIilcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYEFycmF5IG11c3QgY29udGFpbiAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYGF0IG1vc3RgIDogYGxlc3MgdGhhbmB9ICR7aXNzdWUubWF4aW11bX0gZWxlbWVudChzKWA7XG4gICAgICAgICAgICBlbHNlIGlmIChpc3N1ZS50eXBlID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgU3RyaW5nIG11c3QgY29udGFpbiAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYGF0IG1vc3RgIDogYHVuZGVyYH0gJHtpc3N1ZS5tYXhpbXVtfSBjaGFyYWN0ZXIocylgO1xuICAgICAgICAgICAgZWxzZSBpZiAoaXNzdWUudHlwZSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYE51bWJlciBtdXN0IGJlICR7aXNzdWUuZXhhY3QgPyBgZXhhY3RseWAgOiBpc3N1ZS5pbmNsdXNpdmUgPyBgbGVzcyB0aGFuIG9yIGVxdWFsIHRvYCA6IGBsZXNzIHRoYW5gfSAke2lzc3VlLm1heGltdW19YDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwiYmlnaW50XCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBCaWdJbnQgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYGxlc3MgdGhhbiBvciBlcXVhbCB0b2AgOiBgbGVzcyB0aGFuYH0gJHtpc3N1ZS5tYXhpbXVtfWA7XG4gICAgICAgICAgICBlbHNlIGlmIChpc3N1ZS50eXBlID09PSBcImRhdGVcIilcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYERhdGUgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYHNtYWxsZXIgdGhhbiBvciBlcXVhbCB0b2AgOiBgc21hbGxlciB0aGFuYH0gJHtuZXcgRGF0ZShOdW1iZXIoaXNzdWUubWF4aW11bSkpfWA7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiSW52YWxpZCBpbnB1dFwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgWm9kSXNzdWVDb2RlLmN1c3RvbTpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCBpbnB1dGA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9pbnRlcnNlY3Rpb25fdHlwZXM6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludGVyc2VjdGlvbiByZXN1bHRzIGNvdWxkIG5vdCBiZSBtZXJnZWRgO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgWm9kSXNzdWVDb2RlLm5vdF9tdWx0aXBsZV9vZjpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgTnVtYmVyIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAke2lzc3VlLm11bHRpcGxlT2Z9YDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5ub3RfZmluaXRlOlxuICAgICAgICAgICAgbWVzc2FnZSA9IFwiTnVtYmVyIG11c3QgYmUgZmluaXRlXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBfY3R4LmRlZmF1bHRFcnJvcjtcbiAgICAgICAgICAgIHV0aWwuYXNzZXJ0TmV2ZXIoaXNzdWUpO1xuICAgIH1cbiAgICByZXR1cm4geyBtZXNzYWdlIH07XG59O1xuZXhwb3J0IGRlZmF1bHQgZXJyb3JNYXA7XG4iLCAiaW1wb3J0IGRlZmF1bHRFcnJvck1hcCBmcm9tIFwiLi9sb2NhbGVzL2VuLmpzXCI7XG5sZXQgb3ZlcnJpZGVFcnJvck1hcCA9IGRlZmF1bHRFcnJvck1hcDtcbmV4cG9ydCB7IGRlZmF1bHRFcnJvck1hcCB9O1xuZXhwb3J0IGZ1bmN0aW9uIHNldEVycm9yTWFwKG1hcCkge1xuICAgIG92ZXJyaWRlRXJyb3JNYXAgPSBtYXA7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0RXJyb3JNYXAoKSB7XG4gICAgcmV0dXJuIG92ZXJyaWRlRXJyb3JNYXA7XG59XG4iLCAiaW1wb3J0IHsgZ2V0RXJyb3JNYXAgfSBmcm9tIFwiLi4vZXJyb3JzLmpzXCI7XG5pbXBvcnQgZGVmYXVsdEVycm9yTWFwIGZyb20gXCIuLi9sb2NhbGVzL2VuLmpzXCI7XG5leHBvcnQgY29uc3QgbWFrZUlzc3VlID0gKHBhcmFtcykgPT4ge1xuICAgIGNvbnN0IHsgZGF0YSwgcGF0aCwgZXJyb3JNYXBzLCBpc3N1ZURhdGEgfSA9IHBhcmFtcztcbiAgICBjb25zdCBmdWxsUGF0aCA9IFsuLi5wYXRoLCAuLi4oaXNzdWVEYXRhLnBhdGggfHwgW10pXTtcbiAgICBjb25zdCBmdWxsSXNzdWUgPSB7XG4gICAgICAgIC4uLmlzc3VlRGF0YSxcbiAgICAgICAgcGF0aDogZnVsbFBhdGgsXG4gICAgfTtcbiAgICBpZiAoaXNzdWVEYXRhLm1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uaXNzdWVEYXRhLFxuICAgICAgICAgICAgcGF0aDogZnVsbFBhdGgsXG4gICAgICAgICAgICBtZXNzYWdlOiBpc3N1ZURhdGEubWVzc2FnZSxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgbGV0IGVycm9yTWVzc2FnZSA9IFwiXCI7XG4gICAgY29uc3QgbWFwcyA9IGVycm9yTWFwc1xuICAgICAgICAuZmlsdGVyKChtKSA9PiAhIW0pXG4gICAgICAgIC5zbGljZSgpXG4gICAgICAgIC5yZXZlcnNlKCk7XG4gICAgZm9yIChjb25zdCBtYXAgb2YgbWFwcykge1xuICAgICAgICBlcnJvck1lc3NhZ2UgPSBtYXAoZnVsbElzc3VlLCB7IGRhdGEsIGRlZmF1bHRFcnJvcjogZXJyb3JNZXNzYWdlIH0pLm1lc3NhZ2U7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIC4uLmlzc3VlRGF0YSxcbiAgICAgICAgcGF0aDogZnVsbFBhdGgsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yTWVzc2FnZSxcbiAgICB9O1xufTtcbmV4cG9ydCBjb25zdCBFTVBUWV9QQVRIID0gW107XG5leHBvcnQgZnVuY3Rpb24gYWRkSXNzdWVUb0NvbnRleHQoY3R4LCBpc3N1ZURhdGEpIHtcbiAgICBjb25zdCBvdmVycmlkZU1hcCA9IGdldEVycm9yTWFwKCk7XG4gICAgY29uc3QgaXNzdWUgPSBtYWtlSXNzdWUoe1xuICAgICAgICBpc3N1ZURhdGE6IGlzc3VlRGF0YSxcbiAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICBlcnJvck1hcHM6IFtcbiAgICAgICAgICAgIGN0eC5jb21tb24uY29udGV4dHVhbEVycm9yTWFwLCAvLyBjb250ZXh0dWFsIGVycm9yIG1hcCBpcyBmaXJzdCBwcmlvcml0eVxuICAgICAgICAgICAgY3R4LnNjaGVtYUVycm9yTWFwLCAvLyB0aGVuIHNjaGVtYS1ib3VuZCBtYXAgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBvdmVycmlkZU1hcCwgLy8gdGhlbiBnbG9iYWwgb3ZlcnJpZGUgbWFwXG4gICAgICAgICAgICBvdmVycmlkZU1hcCA9PT0gZGVmYXVsdEVycm9yTWFwID8gdW5kZWZpbmVkIDogZGVmYXVsdEVycm9yTWFwLCAvLyB0aGVuIGdsb2JhbCBkZWZhdWx0IG1hcFxuICAgICAgICBdLmZpbHRlcigoeCkgPT4gISF4KSxcbiAgICB9KTtcbiAgICBjdHguY29tbW9uLmlzc3Vlcy5wdXNoKGlzc3VlKTtcbn1cbmV4cG9ydCBjbGFzcyBQYXJzZVN0YXR1cyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSBcInZhbGlkXCI7XG4gICAgfVxuICAgIGRpcnR5KCkge1xuICAgICAgICBpZiAodGhpcy52YWx1ZSA9PT0gXCJ2YWxpZFwiKVxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IFwiZGlydHlcIjtcbiAgICB9XG4gICAgYWJvcnQoKSB7XG4gICAgICAgIGlmICh0aGlzLnZhbHVlICE9PSBcImFib3J0ZWRcIilcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBcImFib3J0ZWRcIjtcbiAgICB9XG4gICAgc3RhdGljIG1lcmdlQXJyYXkoc3RhdHVzLCByZXN1bHRzKSB7XG4gICAgICAgIGNvbnN0IGFycmF5VmFsdWUgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIGlmIChzLnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICBpZiAocy5zdGF0dXMgPT09IFwiZGlydHlcIilcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgIGFycmF5VmFsdWUucHVzaChzLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGFycmF5VmFsdWUgfTtcbiAgICB9XG4gICAgc3RhdGljIGFzeW5jIG1lcmdlT2JqZWN0QXN5bmMoc3RhdHVzLCBwYWlycykge1xuICAgICAgICBjb25zdCBzeW5jUGFpcnMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBwYWlyIG9mIHBhaXJzKSB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBhd2FpdCBwYWlyLmtleTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgcGFpci52YWx1ZTtcbiAgICAgICAgICAgIHN5bmNQYWlycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBrZXksXG4gICAgICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUGFyc2VTdGF0dXMubWVyZ2VPYmplY3RTeW5jKHN0YXR1cywgc3luY1BhaXJzKTtcbiAgICB9XG4gICAgc3RhdGljIG1lcmdlT2JqZWN0U3luYyhzdGF0dXMsIHBhaXJzKSB7XG4gICAgICAgIGNvbnN0IGZpbmFsT2JqZWN0ID0ge307XG4gICAgICAgIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgICAgICAgICAgY29uc3QgeyBrZXksIHZhbHVlIH0gPSBwYWlyO1xuICAgICAgICAgICAgaWYgKGtleS5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgaWYgKHZhbHVlLnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXR1cyA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgaWYgKHZhbHVlLnN0YXR1cyA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgaWYgKGtleS52YWx1ZSAhPT0gXCJfX3Byb3RvX19cIiAmJiAodHlwZW9mIHZhbHVlLnZhbHVlICE9PSBcInVuZGVmaW5lZFwiIHx8IHBhaXIuYWx3YXlzU2V0KSkge1xuICAgICAgICAgICAgICAgIGZpbmFsT2JqZWN0W2tleS52YWx1ZV0gPSB2YWx1ZS52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGZpbmFsT2JqZWN0IH07XG4gICAgfVxufVxuZXhwb3J0IGNvbnN0IElOVkFMSUQgPSBPYmplY3QuZnJlZXplKHtcbiAgICBzdGF0dXM6IFwiYWJvcnRlZFwiLFxufSk7XG5leHBvcnQgY29uc3QgRElSVFkgPSAodmFsdWUpID0+ICh7IHN0YXR1czogXCJkaXJ0eVwiLCB2YWx1ZSB9KTtcbmV4cG9ydCBjb25zdCBPSyA9ICh2YWx1ZSkgPT4gKHsgc3RhdHVzOiBcInZhbGlkXCIsIHZhbHVlIH0pO1xuZXhwb3J0IGNvbnN0IGlzQWJvcnRlZCA9ICh4KSA9PiB4LnN0YXR1cyA9PT0gXCJhYm9ydGVkXCI7XG5leHBvcnQgY29uc3QgaXNEaXJ0eSA9ICh4KSA9PiB4LnN0YXR1cyA9PT0gXCJkaXJ0eVwiO1xuZXhwb3J0IGNvbnN0IGlzVmFsaWQgPSAoeCkgPT4geC5zdGF0dXMgPT09IFwidmFsaWRcIjtcbmV4cG9ydCBjb25zdCBpc0FzeW5jID0gKHgpID0+IHR5cGVvZiBQcm9taXNlICE9PSBcInVuZGVmaW5lZFwiICYmIHggaW5zdGFuY2VvZiBQcm9taXNlO1xuIiwgImV4cG9ydCB2YXIgZXJyb3JVdGlsO1xuKGZ1bmN0aW9uIChlcnJvclV0aWwpIHtcbiAgICBlcnJvclV0aWwuZXJyVG9PYmogPSAobWVzc2FnZSkgPT4gdHlwZW9mIG1lc3NhZ2UgPT09IFwic3RyaW5nXCIgPyB7IG1lc3NhZ2UgfSA6IG1lc3NhZ2UgfHwge307XG4gICAgLy8gYmlvbWUtaWdub3JlIGxpbnQ6XG4gICAgZXJyb3JVdGlsLnRvU3RyaW5nID0gKG1lc3NhZ2UpID0+IHR5cGVvZiBtZXNzYWdlID09PSBcInN0cmluZ1wiID8gbWVzc2FnZSA6IG1lc3NhZ2U/Lm1lc3NhZ2U7XG59KShlcnJvclV0aWwgfHwgKGVycm9yVXRpbCA9IHt9KSk7XG4iLCAiaW1wb3J0IHsgWm9kRXJyb3IsIFpvZElzc3VlQ29kZSwgfSBmcm9tIFwiLi9ab2RFcnJvci5qc1wiO1xuaW1wb3J0IHsgZGVmYXVsdEVycm9yTWFwLCBnZXRFcnJvck1hcCB9IGZyb20gXCIuL2Vycm9ycy5qc1wiO1xuaW1wb3J0IHsgZXJyb3JVdGlsIH0gZnJvbSBcIi4vaGVscGVycy9lcnJvclV0aWwuanNcIjtcbmltcG9ydCB7IERJUlRZLCBJTlZBTElELCBPSywgUGFyc2VTdGF0dXMsIGFkZElzc3VlVG9Db250ZXh0LCBpc0Fib3J0ZWQsIGlzQXN5bmMsIGlzRGlydHksIGlzVmFsaWQsIG1ha2VJc3N1ZSwgfSBmcm9tIFwiLi9oZWxwZXJzL3BhcnNlVXRpbC5qc1wiO1xuaW1wb3J0IHsgdXRpbCwgWm9kUGFyc2VkVHlwZSwgZ2V0UGFyc2VkVHlwZSB9IGZyb20gXCIuL2hlbHBlcnMvdXRpbC5qc1wiO1xuY2xhc3MgUGFyc2VJbnB1dExhenlQYXRoIHtcbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQsIHZhbHVlLCBwYXRoLCBrZXkpIHtcbiAgICAgICAgdGhpcy5fY2FjaGVkUGF0aCA9IFtdO1xuICAgICAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICAgICAgdGhpcy5kYXRhID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX3BhdGggPSBwYXRoO1xuICAgICAgICB0aGlzLl9rZXkgPSBrZXk7XG4gICAgfVxuICAgIGdldCBwYXRoKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2NhY2hlZFBhdGgubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLl9rZXkpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2FjaGVkUGF0aC5wdXNoKC4uLnRoaXMuX3BhdGgsIC4uLnRoaXMuX2tleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWNoZWRQYXRoLnB1c2goLi4udGhpcy5fcGF0aCwgdGhpcy5fa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGVkUGF0aDtcbiAgICB9XG59XG5jb25zdCBoYW5kbGVSZXN1bHQgPSAoY3R4LCByZXN1bHQpID0+IHtcbiAgICBpZiAoaXNWYWxpZChyZXN1bHQpKSB7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdC52YWx1ZSB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKCFjdHguY29tbW9uLmlzc3Vlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZhbGlkYXRpb24gZmFpbGVkIGJ1dCBubyBpc3N1ZXMgZGV0ZWN0ZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIGdldCBlcnJvcigpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9lcnJvcjtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBab2RFcnJvcihjdHguY29tbW9uLmlzc3Vlcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZXJyb3I7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cbn07XG5mdW5jdGlvbiBwcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcykge1xuICAgIGlmICghcGFyYW1zKVxuICAgICAgICByZXR1cm4ge307XG4gICAgY29uc3QgeyBlcnJvck1hcCwgaW52YWxpZF90eXBlX2Vycm9yLCByZXF1aXJlZF9lcnJvciwgZGVzY3JpcHRpb24gfSA9IHBhcmFtcztcbiAgICBpZiAoZXJyb3JNYXAgJiYgKGludmFsaWRfdHlwZV9lcnJvciB8fCByZXF1aXJlZF9lcnJvcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCB1c2UgXCJpbnZhbGlkX3R5cGVfZXJyb3JcIiBvciBcInJlcXVpcmVkX2Vycm9yXCIgaW4gY29uanVuY3Rpb24gd2l0aCBjdXN0b20gZXJyb3IgbWFwLmApO1xuICAgIH1cbiAgICBpZiAoZXJyb3JNYXApXG4gICAgICAgIHJldHVybiB7IGVycm9yTWFwOiBlcnJvck1hcCwgZGVzY3JpcHRpb24gfTtcbiAgICBjb25zdCBjdXN0b21NYXAgPSAoaXNzLCBjdHgpID0+IHtcbiAgICAgICAgY29uc3QgeyBtZXNzYWdlIH0gPSBwYXJhbXM7XG4gICAgICAgIGlmIChpc3MuY29kZSA9PT0gXCJpbnZhbGlkX2VudW1fdmFsdWVcIikge1xuICAgICAgICAgICAgcmV0dXJuIHsgbWVzc2FnZTogbWVzc2FnZSA/PyBjdHguZGVmYXVsdEVycm9yIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBjdHguZGF0YSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgcmV0dXJuIHsgbWVzc2FnZTogbWVzc2FnZSA/PyByZXF1aXJlZF9lcnJvciA/PyBjdHguZGVmYXVsdEVycm9yIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzcy5jb2RlICE9PSBcImludmFsaWRfdHlwZVwiKVxuICAgICAgICAgICAgcmV0dXJuIHsgbWVzc2FnZTogY3R4LmRlZmF1bHRFcnJvciB9O1xuICAgICAgICByZXR1cm4geyBtZXNzYWdlOiBtZXNzYWdlID8/IGludmFsaWRfdHlwZV9lcnJvciA/PyBjdHguZGVmYXVsdEVycm9yIH07XG4gICAgfTtcbiAgICByZXR1cm4geyBlcnJvck1hcDogY3VzdG9tTWFwLCBkZXNjcmlwdGlvbiB9O1xufVxuZXhwb3J0IGNsYXNzIFpvZFR5cGUge1xuICAgIGdldCBkZXNjcmlwdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5kZXNjcmlwdGlvbjtcbiAgICB9XG4gICAgX2dldFR5cGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIGdldFBhcnNlZFR5cGUoaW5wdXQuZGF0YSk7XG4gICAgfVxuICAgIF9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KSB7XG4gICAgICAgIHJldHVybiAoY3R4IHx8IHtcbiAgICAgICAgICAgIGNvbW1vbjogaW5wdXQucGFyZW50LmNvbW1vbixcbiAgICAgICAgICAgIGRhdGE6IGlucHV0LmRhdGEsXG4gICAgICAgICAgICBwYXJzZWRUeXBlOiBnZXRQYXJzZWRUeXBlKGlucHV0LmRhdGEpLFxuICAgICAgICAgICAgc2NoZW1hRXJyb3JNYXA6IHRoaXMuX2RlZi5lcnJvck1hcCxcbiAgICAgICAgICAgIHBhdGg6IGlucHV0LnBhdGgsXG4gICAgICAgICAgICBwYXJlbnQ6IGlucHV0LnBhcmVudCxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIF9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXR1czogbmV3IFBhcnNlU3RhdHVzKCksXG4gICAgICAgICAgICBjdHg6IHtcbiAgICAgICAgICAgICAgICBjb21tb246IGlucHV0LnBhcmVudC5jb21tb24sXG4gICAgICAgICAgICAgICAgZGF0YTogaW5wdXQuZGF0YSxcbiAgICAgICAgICAgICAgICBwYXJzZWRUeXBlOiBnZXRQYXJzZWRUeXBlKGlucHV0LmRhdGEpLFxuICAgICAgICAgICAgICAgIHNjaGVtYUVycm9yTWFwOiB0aGlzLl9kZWYuZXJyb3JNYXAsXG4gICAgICAgICAgICAgICAgcGF0aDogaW5wdXQucGF0aCxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGlucHV0LnBhcmVudCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuICAgIF9wYXJzZVN5bmMoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fcGFyc2UoaW5wdXQpO1xuICAgICAgICBpZiAoaXNBc3luYyhyZXN1bHQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTeW5jaHJvbm91cyBwYXJzZSBlbmNvdW50ZXJlZCBwcm9taXNlLlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBfcGFyc2VBc3luYyhpbnB1dCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9wYXJzZShpbnB1dCk7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzdWx0KTtcbiAgICB9XG4gICAgcGFyc2UoZGF0YSwgcGFyYW1zKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuc2FmZVBhcnNlKGRhdGEsIHBhcmFtcyk7XG4gICAgICAgIGlmIChyZXN1bHQuc3VjY2VzcylcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQuZGF0YTtcbiAgICAgICAgdGhyb3cgcmVzdWx0LmVycm9yO1xuICAgIH1cbiAgICBzYWZlUGFyc2UoZGF0YSwgcGFyYW1zKSB7XG4gICAgICAgIGNvbnN0IGN0eCA9IHtcbiAgICAgICAgICAgIGNvbW1vbjoge1xuICAgICAgICAgICAgICAgIGlzc3VlczogW10sXG4gICAgICAgICAgICAgICAgYXN5bmM6IHBhcmFtcz8uYXN5bmMgPz8gZmFsc2UsXG4gICAgICAgICAgICAgICAgY29udGV4dHVhbEVycm9yTWFwOiBwYXJhbXM/LmVycm9yTWFwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhdGg6IHBhcmFtcz8ucGF0aCB8fCBbXSxcbiAgICAgICAgICAgIHNjaGVtYUVycm9yTWFwOiB0aGlzLl9kZWYuZXJyb3JNYXAsXG4gICAgICAgICAgICBwYXJlbnQ6IG51bGwsXG4gICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgcGFyc2VkVHlwZTogZ2V0UGFyc2VkVHlwZShkYXRhKSxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fcGFyc2VTeW5jKHsgZGF0YSwgcGF0aDogY3R4LnBhdGgsIHBhcmVudDogY3R4IH0pO1xuICAgICAgICByZXR1cm4gaGFuZGxlUmVzdWx0KGN0eCwgcmVzdWx0KTtcbiAgICB9XG4gICAgXCJ+dmFsaWRhdGVcIihkYXRhKSB7XG4gICAgICAgIGNvbnN0IGN0eCA9IHtcbiAgICAgICAgICAgIGNvbW1vbjoge1xuICAgICAgICAgICAgICAgIGlzc3VlczogW10sXG4gICAgICAgICAgICAgICAgYXN5bmM6ICEhdGhpc1tcIn5zdGFuZGFyZFwiXS5hc3luYyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYXRoOiBbXSxcbiAgICAgICAgICAgIHNjaGVtYUVycm9yTWFwOiB0aGlzLl9kZWYuZXJyb3JNYXAsXG4gICAgICAgICAgICBwYXJlbnQ6IG51bGwsXG4gICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgcGFyc2VkVHlwZTogZ2V0UGFyc2VkVHlwZShkYXRhKSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCF0aGlzW1wifnN0YW5kYXJkXCJdLmFzeW5jKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX3BhcnNlU3luYyh7IGRhdGEsIHBhdGg6IFtdLCBwYXJlbnQ6IGN0eCB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNWYWxpZChyZXN1bHQpXG4gICAgICAgICAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHJlc3VsdC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzc3VlczogY3R4LmNvbW1vbi5pc3N1ZXMsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycj8ubWVzc2FnZT8udG9Mb3dlckNhc2UoKT8uaW5jbHVkZXMoXCJlbmNvdW50ZXJlZFwiKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW1wifnN0YW5kYXJkXCJdLmFzeW5jID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3R4LmNvbW1vbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgaXNzdWVzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcGFyc2VBc3luYyh7IGRhdGEsIHBhdGg6IFtdLCBwYXJlbnQ6IGN0eCB9KS50aGVuKChyZXN1bHQpID0+IGlzVmFsaWQocmVzdWx0KVxuICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IHJlc3VsdC52YWx1ZSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgIGlzc3VlczogY3R4LmNvbW1vbi5pc3N1ZXMsXG4gICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgYXN5bmMgcGFyc2VBc3luYyhkYXRhLCBwYXJhbXMpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zYWZlUGFyc2VBc3luYyhkYXRhLCBwYXJhbXMpO1xuICAgICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0LmRhdGE7XG4gICAgICAgIHRocm93IHJlc3VsdC5lcnJvcjtcbiAgICB9XG4gICAgYXN5bmMgc2FmZVBhcnNlQXN5bmMoZGF0YSwgcGFyYW1zKSB7XG4gICAgICAgIGNvbnN0IGN0eCA9IHtcbiAgICAgICAgICAgIGNvbW1vbjoge1xuICAgICAgICAgICAgICAgIGlzc3VlczogW10sXG4gICAgICAgICAgICAgICAgY29udGV4dHVhbEVycm9yTWFwOiBwYXJhbXM/LmVycm9yTWFwLFxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhdGg6IHBhcmFtcz8ucGF0aCB8fCBbXSxcbiAgICAgICAgICAgIHNjaGVtYUVycm9yTWFwOiB0aGlzLl9kZWYuZXJyb3JNYXAsXG4gICAgICAgICAgICBwYXJlbnQ6IG51bGwsXG4gICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgcGFyc2VkVHlwZTogZ2V0UGFyc2VkVHlwZShkYXRhKSxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgbWF5YmVBc3luY1Jlc3VsdCA9IHRoaXMuX3BhcnNlKHsgZGF0YSwgcGF0aDogY3R4LnBhdGgsIHBhcmVudDogY3R4IH0pO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCAoaXNBc3luYyhtYXliZUFzeW5jUmVzdWx0KSA/IG1heWJlQXN5bmNSZXN1bHQgOiBQcm9taXNlLnJlc29sdmUobWF5YmVBc3luY1Jlc3VsdCkpO1xuICAgICAgICByZXR1cm4gaGFuZGxlUmVzdWx0KGN0eCwgcmVzdWx0KTtcbiAgICB9XG4gICAgcmVmaW5lKGNoZWNrLCBtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGdldElzc3VlUHJvcGVydGllcyA9ICh2YWwpID0+IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgbWVzc2FnZSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG1lc3NhZ2UgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBtZXNzYWdlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZSh2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWZpbmVtZW50KCh2YWwsIGN0eCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gY2hlY2sodmFsKTtcbiAgICAgICAgICAgIGNvbnN0IHNldEVycm9yID0gKCkgPT4gY3R4LmFkZElzc3VlKHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuY3VzdG9tLFxuICAgICAgICAgICAgICAgIC4uLmdldElzc3VlUHJvcGVydGllcyh2YWwpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIFByb21pc2UgIT09IFwidW5kZWZpbmVkXCIgJiYgcmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldEVycm9yKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBzZXRFcnJvcigpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVmaW5lbWVudChjaGVjaywgcmVmaW5lbWVudERhdGEpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlZmluZW1lbnQoKHZhbCwgY3R4KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWNoZWNrKHZhbCkpIHtcbiAgICAgICAgICAgICAgICBjdHguYWRkSXNzdWUodHlwZW9mIHJlZmluZW1lbnREYXRhID09PSBcImZ1bmN0aW9uXCIgPyByZWZpbmVtZW50RGF0YSh2YWwsIGN0eCkgOiByZWZpbmVtZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBfcmVmaW5lbWVudChyZWZpbmVtZW50KSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kRWZmZWN0cyh7XG4gICAgICAgICAgICBzY2hlbWE6IHRoaXMsXG4gICAgICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEVmZmVjdHMsXG4gICAgICAgICAgICBlZmZlY3Q6IHsgdHlwZTogXCJyZWZpbmVtZW50XCIsIHJlZmluZW1lbnQgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHN1cGVyUmVmaW5lKHJlZmluZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlZmluZW1lbnQocmVmaW5lbWVudCk7XG4gICAgfVxuICAgIGNvbnN0cnVjdG9yKGRlZikge1xuICAgICAgICAvKiogQWxpYXMgb2Ygc2FmZVBhcnNlQXN5bmMgKi9cbiAgICAgICAgdGhpcy5zcGEgPSB0aGlzLnNhZmVQYXJzZUFzeW5jO1xuICAgICAgICB0aGlzLl9kZWYgPSBkZWY7XG4gICAgICAgIHRoaXMucGFyc2UgPSB0aGlzLnBhcnNlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuc2FmZVBhcnNlID0gdGhpcy5zYWZlUGFyc2UuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5wYXJzZUFzeW5jID0gdGhpcy5wYXJzZUFzeW5jLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuc2FmZVBhcnNlQXN5bmMgPSB0aGlzLnNhZmVQYXJzZUFzeW5jLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuc3BhID0gdGhpcy5zcGEuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5yZWZpbmUgPSB0aGlzLnJlZmluZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnJlZmluZW1lbnQgPSB0aGlzLnJlZmluZW1lbnQuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5zdXBlclJlZmluZSA9IHRoaXMuc3VwZXJSZWZpbmUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5vcHRpb25hbCA9IHRoaXMub3B0aW9uYWwuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5udWxsYWJsZSA9IHRoaXMubnVsbGFibGUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5udWxsaXNoID0gdGhpcy5udWxsaXNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYXJyYXkgPSB0aGlzLmFycmF5LmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMucHJvbWlzZSA9IHRoaXMucHJvbWlzZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLm9yID0gdGhpcy5vci5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmFuZCA9IHRoaXMuYW5kLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMudHJhbnNmb3JtID0gdGhpcy50cmFuc2Zvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5icmFuZCA9IHRoaXMuYnJhbmQuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0ID0gdGhpcy5kZWZhdWx0LmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY2F0Y2ggPSB0aGlzLmNhdGNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuZGVzY3JpYmUgPSB0aGlzLmRlc2NyaWJlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMucGlwZSA9IHRoaXMucGlwZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnJlYWRvbmx5ID0gdGhpcy5yZWFkb25seS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmlzTnVsbGFibGUgPSB0aGlzLmlzTnVsbGFibGUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5pc09wdGlvbmFsID0gdGhpcy5pc09wdGlvbmFsLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXNbXCJ+c3RhbmRhcmRcIl0gPSB7XG4gICAgICAgICAgICB2ZXJzaW9uOiAxLFxuICAgICAgICAgICAgdmVuZG9yOiBcInpvZFwiLFxuICAgICAgICAgICAgdmFsaWRhdGU6IChkYXRhKSA9PiB0aGlzW1wifnZhbGlkYXRlXCJdKGRhdGEpLFxuICAgICAgICB9O1xuICAgIH1cbiAgICBvcHRpb25hbCgpIHtcbiAgICAgICAgcmV0dXJuIFpvZE9wdGlvbmFsLmNyZWF0ZSh0aGlzLCB0aGlzLl9kZWYpO1xuICAgIH1cbiAgICBudWxsYWJsZSgpIHtcbiAgICAgICAgcmV0dXJuIFpvZE51bGxhYmxlLmNyZWF0ZSh0aGlzLCB0aGlzLl9kZWYpO1xuICAgIH1cbiAgICBudWxsaXNoKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5udWxsYWJsZSgpLm9wdGlvbmFsKCk7XG4gICAgfVxuICAgIGFycmF5KCkge1xuICAgICAgICByZXR1cm4gWm9kQXJyYXkuY3JlYXRlKHRoaXMpO1xuICAgIH1cbiAgICBwcm9taXNlKCkge1xuICAgICAgICByZXR1cm4gWm9kUHJvbWlzZS5jcmVhdGUodGhpcywgdGhpcy5fZGVmKTtcbiAgICB9XG4gICAgb3Iob3B0aW9uKSB7XG4gICAgICAgIHJldHVybiBab2RVbmlvbi5jcmVhdGUoW3RoaXMsIG9wdGlvbl0sIHRoaXMuX2RlZik7XG4gICAgfVxuICAgIGFuZChpbmNvbWluZykge1xuICAgICAgICByZXR1cm4gWm9kSW50ZXJzZWN0aW9uLmNyZWF0ZSh0aGlzLCBpbmNvbWluZywgdGhpcy5fZGVmKTtcbiAgICB9XG4gICAgdHJhbnNmb3JtKHRyYW5zZm9ybSkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEVmZmVjdHMoe1xuICAgICAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyh0aGlzLl9kZWYpLFxuICAgICAgICAgICAgc2NoZW1hOiB0aGlzLFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RFZmZlY3RzLFxuICAgICAgICAgICAgZWZmZWN0OiB7IHR5cGU6IFwidHJhbnNmb3JtXCIsIHRyYW5zZm9ybSB9LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZGVmYXVsdChkZWYpIHtcbiAgICAgICAgY29uc3QgZGVmYXVsdFZhbHVlRnVuYyA9IHR5cGVvZiBkZWYgPT09IFwiZnVuY3Rpb25cIiA/IGRlZiA6ICgpID0+IGRlZjtcbiAgICAgICAgcmV0dXJuIG5ldyBab2REZWZhdWx0KHtcbiAgICAgICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXModGhpcy5fZGVmKSxcbiAgICAgICAgICAgIGlubmVyVHlwZTogdGhpcyxcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZTogZGVmYXVsdFZhbHVlRnVuYyxcbiAgICAgICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kRGVmYXVsdCxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGJyYW5kKCkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEJyYW5kZWQoe1xuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RCcmFuZGVkLFxuICAgICAgICAgICAgdHlwZTogdGhpcyxcbiAgICAgICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXModGhpcy5fZGVmKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNhdGNoKGRlZikge1xuICAgICAgICBjb25zdCBjYXRjaFZhbHVlRnVuYyA9IHR5cGVvZiBkZWYgPT09IFwiZnVuY3Rpb25cIiA/IGRlZiA6ICgpID0+IGRlZjtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RDYXRjaCh7XG4gICAgICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHRoaXMuX2RlZiksXG4gICAgICAgICAgICBpbm5lclR5cGU6IHRoaXMsXG4gICAgICAgICAgICBjYXRjaFZhbHVlOiBjYXRjaFZhbHVlRnVuYyxcbiAgICAgICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kQ2F0Y2gsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBkZXNjcmliZShkZXNjcmlwdGlvbikge1xuICAgICAgICBjb25zdCBUaGlzID0gdGhpcy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgcmV0dXJuIG5ldyBUaGlzKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcGlwZSh0YXJnZXQpIHtcbiAgICAgICAgcmV0dXJuIFpvZFBpcGVsaW5lLmNyZWF0ZSh0aGlzLCB0YXJnZXQpO1xuICAgIH1cbiAgICByZWFkb25seSgpIHtcbiAgICAgICAgcmV0dXJuIFpvZFJlYWRvbmx5LmNyZWF0ZSh0aGlzKTtcbiAgICB9XG4gICAgaXNPcHRpb25hbCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2FmZVBhcnNlKHVuZGVmaW5lZCkuc3VjY2VzcztcbiAgICB9XG4gICAgaXNOdWxsYWJsZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2FmZVBhcnNlKG51bGwpLnN1Y2Nlc3M7XG4gICAgfVxufVxuY29uc3QgY3VpZFJlZ2V4ID0gL15jW15cXHMtXXs4LH0kL2k7XG5jb25zdCBjdWlkMlJlZ2V4ID0gL15bMC05YS16XSskLztcbmNvbnN0IHVsaWRSZWdleCA9IC9eWzAtOUEtSEpLTU5QLVRWLVpdezI2fSQvaTtcbi8vIGNvbnN0IHV1aWRSZWdleCA9XG4vLyAgIC9eKFthLWYwLTldezh9LVthLWYwLTldezR9LVsxLTVdW2EtZjAtOV17M30tW2EtZjAtOV17NH0tW2EtZjAtOV17MTJ9fDAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCkkL2k7XG5jb25zdCB1dWlkUmVnZXggPSAvXlswLTlhLWZBLUZdezh9XFxiLVswLTlhLWZBLUZdezR9XFxiLVswLTlhLWZBLUZdezR9XFxiLVswLTlhLWZBLUZdezR9XFxiLVswLTlhLWZBLUZdezEyfSQvaTtcbmNvbnN0IG5hbm9pZFJlZ2V4ID0gL15bYS16MC05Xy1dezIxfSQvaTtcbmNvbnN0IGp3dFJlZ2V4ID0gL15bQS1aYS16MC05LV9dK1xcLltBLVphLXowLTktX10rXFwuW0EtWmEtejAtOS1fXSokLztcbmNvbnN0IGR1cmF0aW9uUmVnZXggPSAvXlstK10/UCg/ISQpKD86KD86Wy0rXT9cXGQrWSl8KD86Wy0rXT9cXGQrWy4sXVxcZCtZJCkpPyg/Oig/OlstK10/XFxkK00pfCg/OlstK10/XFxkK1suLF1cXGQrTSQpKT8oPzooPzpbLStdP1xcZCtXKXwoPzpbLStdP1xcZCtbLixdXFxkK1ckKSk/KD86KD86Wy0rXT9cXGQrRCl8KD86Wy0rXT9cXGQrWy4sXVxcZCtEJCkpPyg/OlQoPz1bXFxkKy1dKSg/Oig/OlstK10/XFxkK0gpfCg/OlstK10/XFxkK1suLF1cXGQrSCQpKT8oPzooPzpbLStdP1xcZCtNKXwoPzpbLStdP1xcZCtbLixdXFxkK00kKSk/KD86Wy0rXT9cXGQrKD86Wy4sXVxcZCspP1MpPyk/PyQvO1xuLy8gZnJvbSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvNDYxODEvMTU1MDE1NVxuLy8gb2xkIHZlcnNpb246IHRvbyBzbG93LCBkaWRuJ3Qgc3VwcG9ydCB1bmljb2RlXG4vLyBjb25zdCBlbWFpbFJlZ2V4ID0gL14oKChbYS16XXxcXGR8WyEjXFwkJSYnXFwqXFwrXFwtXFwvPVxcP1xcXl9ge1xcfH1+XXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkrKFxcLihbYS16XXxcXGR8WyEjXFwkJSYnXFwqXFwrXFwtXFwvPVxcP1xcXl9ge1xcfH1+XXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkrKSopfCgoXFx4MjIpKCgoKFxceDIwfFxceDA5KSooXFx4MGRcXHgwYSkpPyhcXHgyMHxcXHgwOSkrKT8oKFtcXHgwMS1cXHgwOFxceDBiXFx4MGNcXHgwZS1cXHgxZlxceDdmXXxcXHgyMXxbXFx4MjMtXFx4NWJdfFtcXHg1ZC1cXHg3ZV18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfChcXFxcKFtcXHgwMS1cXHgwOVxceDBiXFx4MGNcXHgwZC1cXHg3Zl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKSkpKigoKFxceDIwfFxceDA5KSooXFx4MGRcXHgwYSkpPyhcXHgyMHxcXHgwOSkrKT8oXFx4MjIpKSlAKCgoW2Etel18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoKFthLXpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2Etel18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKVxcLikrKChbYS16XXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16XXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2Etel18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSkpJC9pO1xuLy9vbGQgZW1haWwgcmVnZXhcbi8vIGNvbnN0IGVtYWlsUmVnZXggPSAvXigoW148PigpW1xcXS4sOzpcXHNAXCJdKyhcXC5bXjw+KClbXFxdLiw7Olxcc0BcIl0rKSopfChcIi4rXCIpKUAoKD8hLSkoW148PigpW1xcXS4sOzpcXHNAXCJdK1xcLikrW148PigpW1xcXS4sOzpcXHNAXCJdezEsfSlbXi08PigpW1xcXS4sOzpcXHNAXCJdJC9pO1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG4vLyBjb25zdCBlbWFpbFJlZ2V4ID1cbi8vICAgL14oKFtePD4oKVtcXF1cXFxcLiw7Olxcc0BcXFwiXSsoXFwuW148PigpW1xcXVxcXFwuLDs6XFxzQFxcXCJdKykqKXwoXFxcIi4rXFxcIikpQCgoXFxbKCgoMjVbMC01XSl8KDJbMC00XVswLTldKXwoMVswLTldezJ9KXwoWzAtOV17MSwyfSkpXFwuKXszfSgoMjVbMC01XSl8KDJbMC00XVswLTldKXwoMVswLTldezJ9KXwoWzAtOV17MSwyfSkpXFxdKXwoXFxbSVB2NjooKFthLWYwLTldezEsNH06KXs3fXw6OihbYS1mMC05XXsxLDR9Oil7MCw2fXwoW2EtZjAtOV17MSw0fTopezF9OihbYS1mMC05XXsxLDR9Oil7MCw1fXwoW2EtZjAtOV17MSw0fTopezJ9OihbYS1mMC05XXsxLDR9Oil7MCw0fXwoW2EtZjAtOV17MSw0fTopezN9OihbYS1mMC05XXsxLDR9Oil7MCwzfXwoW2EtZjAtOV17MSw0fTopezR9OihbYS1mMC05XXsxLDR9Oil7MCwyfXwoW2EtZjAtOV17MSw0fTopezV9OihbYS1mMC05XXsxLDR9Oil7MCwxfSkoW2EtZjAtOV17MSw0fXwoKCgyNVswLTVdKXwoMlswLTRdWzAtOV0pfCgxWzAtOV17Mn0pfChbMC05XXsxLDJ9KSlcXC4pezN9KCgyNVswLTVdKXwoMlswLTRdWzAtOV0pfCgxWzAtOV17Mn0pfChbMC05XXsxLDJ9KSkpXFxdKXwoW0EtWmEtejAtOV0oW0EtWmEtejAtOS1dKltBLVphLXowLTldKSooXFwuW0EtWmEtel17Mix9KSspKSQvO1xuLy8gY29uc3QgZW1haWxSZWdleCA9XG4vLyAgIC9eW2EtekEtWjAtOVxcLlxcIVxcI1xcJFxcJVxcJlxcJ1xcKlxcK1xcL1xcPVxcP1xcXlxcX1xcYFxce1xcfFxcfVxcflxcLV0rQFthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPyg/OlxcLlthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPykqJC87XG4vLyBjb25zdCBlbWFpbFJlZ2V4ID1cbi8vICAgL14oPzpbYS16MC05ISMkJSYnKisvPT9eX2B7fH1+LV0rKD86XFwuW2EtejAtOSEjJCUmJyorLz0/Xl9ge3x9fi1dKykqfFwiKD86W1xceDAxLVxceDA4XFx4MGJcXHgwY1xceDBlLVxceDFmXFx4MjFcXHgyMy1cXHg1YlxceDVkLVxceDdmXXxcXFxcW1xceDAxLVxceDA5XFx4MGJcXHgwY1xceDBlLVxceDdmXSkqXCIpQCg/Oig/OlthLXowLTldKD86W2EtejAtOS1dKlthLXowLTldKT9cXC4pK1thLXowLTldKD86W2EtejAtOS1dKlthLXowLTldKT98XFxbKD86KD86MjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT98W2EtejAtOS1dKlthLXowLTldOig/OltcXHgwMS1cXHgwOFxceDBiXFx4MGNcXHgwZS1cXHgxZlxceDIxLVxceDVhXFx4NTMtXFx4N2ZdfFxcXFxbXFx4MDEtXFx4MDlcXHgwYlxceDBjXFx4MGUtXFx4N2ZdKSspXFxdKSQvaTtcbmNvbnN0IGVtYWlsUmVnZXggPSAvXig/IVxcLikoPyEuKlxcLlxcLikoW0EtWjAtOV8nK1xcLVxcLl0qKVtBLVowLTlfKy1dQChbQS1aMC05XVtBLVowLTlcXC1dKlxcLikrW0EtWl17Mix9JC9pO1xuLy8gY29uc3QgZW1haWxSZWdleCA9XG4vLyAgIC9eW2EtejAtOS4hIyQlJlx1MjAxOSorLz0/Xl9ge3x9fi1dK0BbYS16MC05LV0rKD86XFwuW2EtejAtOVxcLV0rKSokL2k7XG4vLyBmcm9tIGh0dHBzOi8vdGhla2V2aW5zY290dC5jb20vZW1vamlzLWluLWphdmFzY3JpcHQvI3dyaXRpbmctYS1yZWd1bGFyLWV4cHJlc3Npb25cbmNvbnN0IF9lbW9qaVJlZ2V4ID0gYF4oXFxcXHB7RXh0ZW5kZWRfUGljdG9ncmFwaGljfXxcXFxccHtFbW9qaV9Db21wb25lbnR9KSskYDtcbmxldCBlbW9qaVJlZ2V4O1xuLy8gZmFzdGVyLCBzaW1wbGVyLCBzYWZlclxuY29uc3QgaXB2NFJlZ2V4ID0gL14oPzooPzoyNVswLTVdfDJbMC00XVswLTldfDFbMC05XVswLTldfFsxLTldWzAtOV18WzAtOV0pXFwuKXszfSg/OjI1WzAtNV18MlswLTRdWzAtOV18MVswLTldWzAtOV18WzEtOV1bMC05XXxbMC05XSkkLztcbmNvbnN0IGlwdjRDaWRyUmVnZXggPSAvXig/Oig/OjI1WzAtNV18MlswLTRdWzAtOV18MVswLTldWzAtOV18WzEtOV1bMC05XXxbMC05XSlcXC4pezN9KD86MjVbMC01XXwyWzAtNF1bMC05XXwxWzAtOV1bMC05XXxbMS05XVswLTldfFswLTldKVxcLygzWzAtMl18WzEyXT9bMC05XSkkLztcbi8vIGNvbnN0IGlwdjZSZWdleCA9XG4vLyAvXigoW2EtZjAtOV17MSw0fTopezd9fDo6KFthLWYwLTldezEsNH06KXswLDZ9fChbYS1mMC05XXsxLDR9Oil7MX06KFthLWYwLTldezEsNH06KXswLDV9fChbYS1mMC05XXsxLDR9Oil7Mn06KFthLWYwLTldezEsNH06KXswLDR9fChbYS1mMC05XXsxLDR9Oil7M306KFthLWYwLTldezEsNH06KXswLDN9fChbYS1mMC05XXsxLDR9Oil7NH06KFthLWYwLTldezEsNH06KXswLDJ9fChbYS1mMC05XXsxLDR9Oil7NX06KFthLWYwLTldezEsNH06KXswLDF9KShbYS1mMC05XXsxLDR9fCgoKDI1WzAtNV0pfCgyWzAtNF1bMC05XSl8KDFbMC05XXsyfSl8KFswLTldezEsMn0pKVxcLil7M30oKDI1WzAtNV0pfCgyWzAtNF1bMC05XSl8KDFbMC05XXsyfSl8KFswLTldezEsMn0pKSkkLztcbmNvbnN0IGlwdjZSZWdleCA9IC9eKChbMC05YS1mQS1GXXsxLDR9Oil7Nyw3fVswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDd9OnwoWzAtOWEtZkEtRl17MSw0fTopezEsNn06WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsNX0oOlswLTlhLWZBLUZdezEsNH0pezEsMn18KFswLTlhLWZBLUZdezEsNH06KXsxLDR9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDN9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwzfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsMn0oOlswLTlhLWZBLUZdezEsNH0pezEsNX18WzAtOWEtZkEtRl17MSw0fTooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDZ9KXw6KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw3fXw6KXxmZTgwOig6WzAtOWEtZkEtRl17MCw0fSl7MCw0fSVbMC05YS16QS1aXXsxLH18OjooZmZmZig6MHsxLDR9KXswLDF9Oil7MCwxfSgoMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pXFwuKXszLDN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH06KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezMsM30oMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pKSQvO1xuY29uc3QgaXB2NkNpZHJSZWdleCA9IC9eKChbMC05YS1mQS1GXXsxLDR9Oil7Nyw3fVswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDd9OnwoWzAtOWEtZkEtRl17MSw0fTopezEsNn06WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsNX0oOlswLTlhLWZBLUZdezEsNH0pezEsMn18KFswLTlhLWZBLUZdezEsNH06KXsxLDR9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDN9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwzfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsMn0oOlswLTlhLWZBLUZdezEsNH0pezEsNX18WzAtOWEtZkEtRl17MSw0fTooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDZ9KXw6KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw3fXw6KXxmZTgwOig6WzAtOWEtZkEtRl17MCw0fSl7MCw0fSVbMC05YS16QS1aXXsxLH18OjooZmZmZig6MHsxLDR9KXswLDF9Oil7MCwxfSgoMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pXFwuKXszLDN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH06KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezMsM30oMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pKVxcLygxMlswLThdfDFbMDFdWzAtOV18WzEtOV0/WzAtOV0pJC87XG4vLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83ODYwMzkyL2RldGVybWluZS1pZi1zdHJpbmctaXMtaW4tYmFzZTY0LXVzaW5nLWphdmFzY3JpcHRcbmNvbnN0IGJhc2U2NFJlZ2V4ID0gL14oWzAtOWEtekEtWisvXXs0fSkqKChbMC05YS16QS1aKy9dezJ9PT0pfChbMC05YS16QS1aKy9dezN9PSkpPyQvO1xuLy8gaHR0cHM6Ly9iYXNlNjQuZ3VydS9zdGFuZGFyZHMvYmFzZTY0dXJsXG5jb25zdCBiYXNlNjR1cmxSZWdleCA9IC9eKFswLTlhLXpBLVotX117NH0pKigoWzAtOWEtekEtWi1fXXsyfSg9PSk/KXwoWzAtOWEtekEtWi1fXXszfSg9KT8pKT8kLztcbi8vIHNpbXBsZVxuLy8gY29uc3QgZGF0ZVJlZ2V4U291cmNlID0gYFxcXFxkezR9LVxcXFxkezJ9LVxcXFxkezJ9YDtcbi8vIG5vIGxlYXAgeWVhciB2YWxpZGF0aW9uXG4vLyBjb25zdCBkYXRlUmVnZXhTb3VyY2UgPSBgXFxcXGR7NH0tKCgwWzEzNTc4XXwxMHwxMiktMzF8KDBbMTMtOV18MVswLTJdKS0zMHwoMFsxLTldfDFbMC0yXSktKDBbMS05XXwxXFxcXGR8MlxcXFxkKSlgO1xuLy8gd2l0aCBsZWFwIHllYXIgdmFsaWRhdGlvblxuY29uc3QgZGF0ZVJlZ2V4U291cmNlID0gYCgoXFxcXGRcXFxcZFsyNDY4XVswNDhdfFxcXFxkXFxcXGRbMTM1NzldWzI2XXxcXFxcZFxcXFxkMFs0OF18WzAyNDY4XVswNDhdMDB8WzEzNTc5XVsyNl0wMCktMDItMjl8XFxcXGR7NH0tKCgwWzEzNTc4XXwxWzAyXSktKDBbMS05XXxbMTJdXFxcXGR8M1swMV0pfCgwWzQ2OV18MTEpLSgwWzEtOV18WzEyXVxcXFxkfDMwKXwoMDIpLSgwWzEtOV18MVxcXFxkfDJbMC04XSkpKWA7XG5jb25zdCBkYXRlUmVnZXggPSBuZXcgUmVnRXhwKGBeJHtkYXRlUmVnZXhTb3VyY2V9JGApO1xuZnVuY3Rpb24gdGltZVJlZ2V4U291cmNlKGFyZ3MpIHtcbiAgICBsZXQgc2Vjb25kc1JlZ2V4U291cmNlID0gYFswLTVdXFxcXGRgO1xuICAgIGlmIChhcmdzLnByZWNpc2lvbikge1xuICAgICAgICBzZWNvbmRzUmVnZXhTb3VyY2UgPSBgJHtzZWNvbmRzUmVnZXhTb3VyY2V9XFxcXC5cXFxcZHske2FyZ3MucHJlY2lzaW9ufX1gO1xuICAgIH1cbiAgICBlbHNlIGlmIChhcmdzLnByZWNpc2lvbiA9PSBudWxsKSB7XG4gICAgICAgIHNlY29uZHNSZWdleFNvdXJjZSA9IGAke3NlY29uZHNSZWdleFNvdXJjZX0oXFxcXC5cXFxcZCspP2A7XG4gICAgfVxuICAgIGNvbnN0IHNlY29uZHNRdWFudGlmaWVyID0gYXJncy5wcmVjaXNpb24gPyBcIitcIiA6IFwiP1wiOyAvLyByZXF1aXJlIHNlY29uZHMgaWYgcHJlY2lzaW9uIGlzIG5vbnplcm9cbiAgICByZXR1cm4gYChbMDFdXFxcXGR8MlswLTNdKTpbMC01XVxcXFxkKDoke3NlY29uZHNSZWdleFNvdXJjZX0pJHtzZWNvbmRzUXVhbnRpZmllcn1gO1xufVxuZnVuY3Rpb24gdGltZVJlZ2V4KGFyZ3MpIHtcbiAgICByZXR1cm4gbmV3IFJlZ0V4cChgXiR7dGltZVJlZ2V4U291cmNlKGFyZ3MpfSRgKTtcbn1cbi8vIEFkYXB0ZWQgZnJvbSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzE0MzIzMVxuZXhwb3J0IGZ1bmN0aW9uIGRhdGV0aW1lUmVnZXgoYXJncykge1xuICAgIGxldCByZWdleCA9IGAke2RhdGVSZWdleFNvdXJjZX1UJHt0aW1lUmVnZXhTb3VyY2UoYXJncyl9YDtcbiAgICBjb25zdCBvcHRzID0gW107XG4gICAgb3B0cy5wdXNoKGFyZ3MubG9jYWwgPyBgWj9gIDogYFpgKTtcbiAgICBpZiAoYXJncy5vZmZzZXQpXG4gICAgICAgIG9wdHMucHVzaChgKFsrLV1cXFxcZHsyfTo/XFxcXGR7Mn0pYCk7XG4gICAgcmVnZXggPSBgJHtyZWdleH0oJHtvcHRzLmpvaW4oXCJ8XCIpfSlgO1xuICAgIHJldHVybiBuZXcgUmVnRXhwKGBeJHtyZWdleH0kYCk7XG59XG5mdW5jdGlvbiBpc1ZhbGlkSVAoaXAsIHZlcnNpb24pIHtcbiAgICBpZiAoKHZlcnNpb24gPT09IFwidjRcIiB8fCAhdmVyc2lvbikgJiYgaXB2NFJlZ2V4LnRlc3QoaXApKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoKHZlcnNpb24gPT09IFwidjZcIiB8fCAhdmVyc2lvbikgJiYgaXB2NlJlZ2V4LnRlc3QoaXApKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBpc1ZhbGlkSldUKGp3dCwgYWxnKSB7XG4gICAgaWYgKCFqd3RSZWdleC50ZXN0KGp3dCkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBbaGVhZGVyXSA9IGp3dC5zcGxpdChcIi5cIik7XG4gICAgICAgIGlmICghaGVhZGVyKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAvLyBDb252ZXJ0IGJhc2U2NHVybCB0byBiYXNlNjRcbiAgICAgICAgY29uc3QgYmFzZTY0ID0gaGVhZGVyXG4gICAgICAgICAgICAucmVwbGFjZSgvLS9nLCBcIitcIilcbiAgICAgICAgICAgIC5yZXBsYWNlKC9fL2csIFwiL1wiKVxuICAgICAgICAgICAgLnBhZEVuZChoZWFkZXIubGVuZ3RoICsgKCg0IC0gKGhlYWRlci5sZW5ndGggJSA0KSkgJSA0KSwgXCI9XCIpO1xuICAgICAgICBjb25zdCBkZWNvZGVkID0gSlNPTi5wYXJzZShhdG9iKGJhc2U2NCkpO1xuICAgICAgICBpZiAodHlwZW9mIGRlY29kZWQgIT09IFwib2JqZWN0XCIgfHwgZGVjb2RlZCA9PT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKFwidHlwXCIgaW4gZGVjb2RlZCAmJiBkZWNvZGVkPy50eXAgIT09IFwiSldUXCIpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICghZGVjb2RlZC5hbGcpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChhbGcgJiYgZGVjb2RlZC5hbGcgIT09IGFsZylcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGlzVmFsaWRDaWRyKGlwLCB2ZXJzaW9uKSB7XG4gICAgaWYgKCh2ZXJzaW9uID09PSBcInY0XCIgfHwgIXZlcnNpb24pICYmIGlwdjRDaWRyUmVnZXgudGVzdChpcCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICgodmVyc2lvbiA9PT0gXCJ2NlwiIHx8ICF2ZXJzaW9uKSAmJiBpcHY2Q2lkclJlZ2V4LnRlc3QoaXApKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5leHBvcnQgY2xhc3MgWm9kU3RyaW5nIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGlmICh0aGlzLl9kZWYuY29lcmNlKSB7XG4gICAgICAgICAgICBpbnB1dC5kYXRhID0gU3RyaW5nKGlucHV0LmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhcnNlZFR5cGUgPSB0aGlzLl9nZXRUeXBlKGlucHV0KTtcbiAgICAgICAgaWYgKHBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUuc3RyaW5nKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLnN0cmluZyxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IG5ldyBQYXJzZVN0YXR1cygpO1xuICAgICAgICBsZXQgY3R4ID0gdW5kZWZpbmVkO1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaGVjay5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmRhdGEubGVuZ3RoIDwgY2hlY2sudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19zbWFsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4YWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcIm1heFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmRhdGEubGVuZ3RoID4gY2hlY2sudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19iaWcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJsZW5ndGhcIikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb0JpZyA9IGlucHV0LmRhdGEubGVuZ3RoID4gY2hlY2sudmFsdWU7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vU21hbGwgPSBpbnB1dC5kYXRhLmxlbmd0aCA8IGNoZWNrLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0b29CaWcgfHwgdG9vU21hbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b29CaWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fYmlnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heGltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4YWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0b29TbWFsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19zbWFsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5pbXVtOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJlbWFpbFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFlbWFpbFJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJlbWFpbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiZW1vamlcIikge1xuICAgICAgICAgICAgICAgIGlmICghZW1vamlSZWdleCkge1xuICAgICAgICAgICAgICAgICAgICBlbW9qaVJlZ2V4ID0gbmV3IFJlZ0V4cChfZW1vamlSZWdleCwgXCJ1XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWVtb2ppUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImVtb2ppXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJ1dWlkXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXV1aWRSZWdleC50ZXN0KGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwidXVpZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwibmFub2lkXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW5hbm9pZFJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJuYW5vaWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImN1aWRcIikge1xuICAgICAgICAgICAgICAgIGlmICghY3VpZFJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJjdWlkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJjdWlkMlwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjdWlkMlJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJjdWlkMlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwidWxpZFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF1bGlkUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcInVsaWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcInVybFwiKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgbmV3IFVSTChpbnB1dC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcInVybFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwicmVnZXhcIikge1xuICAgICAgICAgICAgICAgIGNoZWNrLnJlZ2V4Lmxhc3RJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgY29uc3QgdGVzdFJlc3VsdCA9IGNoZWNrLnJlZ2V4LnRlc3QoaW5wdXQuZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKCF0ZXN0UmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwicmVnZXhcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcInRyaW1cIikge1xuICAgICAgICAgICAgICAgIGlucHV0LmRhdGEgPSBpbnB1dC5kYXRhLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiaW5jbHVkZXNcIikge1xuICAgICAgICAgICAgICAgIGlmICghaW5wdXQuZGF0YS5pbmNsdWRlcyhjaGVjay52YWx1ZSwgY2hlY2sucG9zaXRpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IHsgaW5jbHVkZXM6IGNoZWNrLnZhbHVlLCBwb3NpdGlvbjogY2hlY2sucG9zaXRpb24gfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcInRvTG93ZXJDYXNlXCIpIHtcbiAgICAgICAgICAgICAgICBpbnB1dC5kYXRhID0gaW5wdXQuZGF0YS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJ0b1VwcGVyQ2FzZVwiKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQuZGF0YSA9IGlucHV0LmRhdGEudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwic3RhcnRzV2l0aFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnB1dC5kYXRhLnN0YXJ0c1dpdGgoY2hlY2sudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IHsgc3RhcnRzV2l0aDogY2hlY2sudmFsdWUgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImVuZHNXaXRoXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlucHV0LmRhdGEuZW5kc1dpdGgoY2hlY2sudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IHsgZW5kc1dpdGg6IGNoZWNrLnZhbHVlIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJkYXRldGltZVwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVnZXggPSBkYXRldGltZVJlZ2V4KGNoZWNrKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJkYXRldGltZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiZGF0ZVwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVnZXggPSBkYXRlUmVnZXg7XG4gICAgICAgICAgICAgICAgaWYgKCFyZWdleC50ZXN0KGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwiZGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwidGltZVwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVnZXggPSB0aW1lUmVnZXgoY2hlY2spO1xuICAgICAgICAgICAgICAgIGlmICghcmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcInRpbWVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImR1cmF0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWR1cmF0aW9uUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImR1cmF0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJpcFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1ZhbGlkSVAoaW5wdXQuZGF0YSwgY2hlY2sudmVyc2lvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJpcFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiand0XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlzVmFsaWRKV1QoaW5wdXQuZGF0YSwgY2hlY2suYWxnKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImp3dFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiY2lkclwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1ZhbGlkQ2lkcihpbnB1dC5kYXRhLCBjaGVjay52ZXJzaW9uKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImNpZHJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImJhc2U2NFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFiYXNlNjRSZWdleC50ZXN0KGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwiYmFzZTY0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJiYXNlNjR1cmxcIikge1xuICAgICAgICAgICAgICAgIGlmICghYmFzZTY0dXJsUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImJhc2U2NHVybFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHV0aWwuYXNzZXJ0TmV2ZXIoY2hlY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN0YXR1czogc3RhdHVzLnZhbHVlLCB2YWx1ZTogaW5wdXQuZGF0YSB9O1xuICAgIH1cbiAgICBfcmVnZXgocmVnZXgsIHZhbGlkYXRpb24sIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVmaW5lbWVudCgoZGF0YSkgPT4gcmVnZXgudGVzdChkYXRhKSwge1xuICAgICAgICAgICAgdmFsaWRhdGlvbixcbiAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIF9hZGRDaGVjayhjaGVjaykge1xuICAgICAgICByZXR1cm4gbmV3IFpvZFN0cmluZyh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBjaGVja3M6IFsuLi50aGlzLl9kZWYuY2hlY2tzLCBjaGVja10sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbWFpbChtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwiZW1haWxcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICB1cmwobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcInVybFwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkgfSk7XG4gICAgfVxuICAgIGVtb2ppKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJlbW9qaVwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkgfSk7XG4gICAgfVxuICAgIHV1aWQobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcInV1aWRcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICBuYW5vaWQobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcIm5hbm9pZFwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkgfSk7XG4gICAgfVxuICAgIGN1aWQobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcImN1aWRcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICBjdWlkMihtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwiY3VpZDJcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICB1bGlkKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJ1bGlkXCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSB9KTtcbiAgICB9XG4gICAgYmFzZTY0KG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJiYXNlNjRcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICBiYXNlNjR1cmwobWVzc2FnZSkge1xuICAgICAgICAvLyBiYXNlNjR1cmwgZW5jb2RpbmcgaXMgYSBtb2RpZmljYXRpb24gb2YgYmFzZTY0IHRoYXQgY2FuIHNhZmVseSBiZSB1c2VkIGluIFVSTHMgYW5kIGZpbGVuYW1lc1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJiYXNlNjR1cmxcIixcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGp3dChvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwiand0XCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihvcHRpb25zKSB9KTtcbiAgICB9XG4gICAgaXAob3B0aW9ucykge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcImlwXCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihvcHRpb25zKSB9KTtcbiAgICB9XG4gICAgY2lkcihvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwiY2lkclwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoob3B0aW9ucykgfSk7XG4gICAgfVxuICAgIGRhdGV0aW1lKG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAgICAgIGtpbmQ6IFwiZGF0ZXRpbWVcIixcbiAgICAgICAgICAgICAgICBwcmVjaXNpb246IG51bGwsXG4gICAgICAgICAgICAgICAgb2Zmc2V0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBsb2NhbDogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogb3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcImRhdGV0aW1lXCIsXG4gICAgICAgICAgICBwcmVjaXNpb246IHR5cGVvZiBvcHRpb25zPy5wcmVjaXNpb24gPT09IFwidW5kZWZpbmVkXCIgPyBudWxsIDogb3B0aW9ucz8ucHJlY2lzaW9uLFxuICAgICAgICAgICAgb2Zmc2V0OiBvcHRpb25zPy5vZmZzZXQgPz8gZmFsc2UsXG4gICAgICAgICAgICBsb2NhbDogb3B0aW9ucz8ubG9jYWwgPz8gZmFsc2UsXG4gICAgICAgICAgICAuLi5lcnJvclV0aWwuZXJyVG9PYmoob3B0aW9ucz8ubWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBkYXRlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJkYXRlXCIsIG1lc3NhZ2UgfSk7XG4gICAgfVxuICAgIHRpbWUob3B0aW9ucykge1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICAgICAga2luZDogXCJ0aW1lXCIsXG4gICAgICAgICAgICAgICAgcHJlY2lzaW9uOiBudWxsLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJ0aW1lXCIsXG4gICAgICAgICAgICBwcmVjaXNpb246IHR5cGVvZiBvcHRpb25zPy5wcmVjaXNpb24gPT09IFwidW5kZWZpbmVkXCIgPyBudWxsIDogb3B0aW9ucz8ucHJlY2lzaW9uLFxuICAgICAgICAgICAgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG9wdGlvbnM/Lm1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZHVyYXRpb24obWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcImR1cmF0aW9uXCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSB9KTtcbiAgICB9XG4gICAgcmVnZXgocmVnZXgsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwicmVnZXhcIixcbiAgICAgICAgICAgIHJlZ2V4OiByZWdleCxcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGluY2x1ZGVzKHZhbHVlLCBvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcImluY2x1ZGVzXCIsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICBwb3NpdGlvbjogb3B0aW9ucz8ucG9zaXRpb24sXG4gICAgICAgICAgICAuLi5lcnJvclV0aWwuZXJyVG9PYmoob3B0aW9ucz8ubWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzdGFydHNXaXRoKHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcInN0YXJ0c1dpdGhcIixcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVuZHNXaXRoKHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcImVuZHNXaXRoXCIsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBtaW4obWluTGVuZ3RoLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1pblwiLFxuICAgICAgICAgICAgdmFsdWU6IG1pbkxlbmd0aCxcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG1heChtYXhMZW5ndGgsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWF4XCIsXG4gICAgICAgICAgICB2YWx1ZTogbWF4TGVuZ3RoLFxuICAgICAgICAgICAgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbGVuZ3RoKGxlbiwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJsZW5ndGhcIixcbiAgICAgICAgICAgIHZhbHVlOiBsZW4sXG4gICAgICAgICAgICAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFcXVpdmFsZW50IHRvIGAubWluKDEpYFxuICAgICAqL1xuICAgIG5vbmVtcHR5KG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWluKDEsIGVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSk7XG4gICAgfVxuICAgIHRyaW0oKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kU3RyaW5nKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGNoZWNrczogWy4uLnRoaXMuX2RlZi5jaGVja3MsIHsga2luZDogXCJ0cmltXCIgfV0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB0b0xvd2VyQ2FzZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RTdHJpbmcoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgY2hlY2tzOiBbLi4udGhpcy5fZGVmLmNoZWNrcywgeyBraW5kOiBcInRvTG93ZXJDYXNlXCIgfV0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB0b1VwcGVyQ2FzZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RTdHJpbmcoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgY2hlY2tzOiBbLi4udGhpcy5fZGVmLmNoZWNrcywgeyBraW5kOiBcInRvVXBwZXJDYXNlXCIgfV0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXQgaXNEYXRldGltZSgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJkYXRldGltZVwiKTtcbiAgICB9XG4gICAgZ2V0IGlzRGF0ZSgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJkYXRlXCIpO1xuICAgIH1cbiAgICBnZXQgaXNUaW1lKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcInRpbWVcIik7XG4gICAgfVxuICAgIGdldCBpc0R1cmF0aW9uKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcImR1cmF0aW9uXCIpO1xuICAgIH1cbiAgICBnZXQgaXNFbWFpbCgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJlbWFpbFwiKTtcbiAgICB9XG4gICAgZ2V0IGlzVVJMKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcInVybFwiKTtcbiAgICB9XG4gICAgZ2V0IGlzRW1vamkoKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwiZW1vamlcIik7XG4gICAgfVxuICAgIGdldCBpc1VVSUQoKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwidXVpZFwiKTtcbiAgICB9XG4gICAgZ2V0IGlzTkFOT0lEKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcIm5hbm9pZFwiKTtcbiAgICB9XG4gICAgZ2V0IGlzQ1VJRCgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJjdWlkXCIpO1xuICAgIH1cbiAgICBnZXQgaXNDVUlEMigpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJjdWlkMlwiKTtcbiAgICB9XG4gICAgZ2V0IGlzVUxJRCgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJ1bGlkXCIpO1xuICAgIH1cbiAgICBnZXQgaXNJUCgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJpcFwiKTtcbiAgICB9XG4gICAgZ2V0IGlzQ0lEUigpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJjaWRyXCIpO1xuICAgIH1cbiAgICBnZXQgaXNCYXNlNjQoKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwiYmFzZTY0XCIpO1xuICAgIH1cbiAgICBnZXQgaXNCYXNlNjR1cmwoKSB7XG4gICAgICAgIC8vIGJhc2U2NHVybCBlbmNvZGluZyBpcyBhIG1vZGlmaWNhdGlvbiBvZiBiYXNlNjQgdGhhdCBjYW4gc2FmZWx5IGJlIHVzZWQgaW4gVVJMcyBhbmQgZmlsZW5hbWVzXG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwiYmFzZTY0dXJsXCIpO1xuICAgIH1cbiAgICBnZXQgbWluTGVuZ3RoKCkge1xuICAgICAgICBsZXQgbWluID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2gua2luZCA9PT0gXCJtaW5cIikge1xuICAgICAgICAgICAgICAgIGlmIChtaW4gPT09IG51bGwgfHwgY2gudmFsdWUgPiBtaW4pXG4gICAgICAgICAgICAgICAgICAgIG1pbiA9IGNoLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtaW47XG4gICAgfVxuICAgIGdldCBtYXhMZW5ndGgoKSB7XG4gICAgICAgIGxldCBtYXggPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaC5raW5kID09PSBcIm1heFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1heCA9PT0gbnVsbCB8fCBjaC52YWx1ZSA8IG1heClcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1heDtcbiAgICB9XG59XG5ab2RTdHJpbmcuY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kU3RyaW5nKHtcbiAgICAgICAgY2hlY2tzOiBbXSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RTdHJpbmcsXG4gICAgICAgIGNvZXJjZTogcGFyYW1zPy5jb2VyY2UgPz8gZmFsc2UsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG4vLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zOTY2NDg0L3doeS1kb2VzLW1vZHVsdXMtb3BlcmF0b3ItcmV0dXJuLWZyYWN0aW9uYWwtbnVtYmVyLWluLWphdmFzY3JpcHQvMzE3MTEwMzQjMzE3MTEwMzRcbmZ1bmN0aW9uIGZsb2F0U2FmZVJlbWFpbmRlcih2YWwsIHN0ZXApIHtcbiAgICBjb25zdCB2YWxEZWNDb3VudCA9ICh2YWwudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0gfHwgXCJcIikubGVuZ3RoO1xuICAgIGNvbnN0IHN0ZXBEZWNDb3VudCA9IChzdGVwLnRvU3RyaW5nKCkuc3BsaXQoXCIuXCIpWzFdIHx8IFwiXCIpLmxlbmd0aDtcbiAgICBjb25zdCBkZWNDb3VudCA9IHZhbERlY0NvdW50ID4gc3RlcERlY0NvdW50ID8gdmFsRGVjQ291bnQgOiBzdGVwRGVjQ291bnQ7XG4gICAgY29uc3QgdmFsSW50ID0gTnVtYmVyLnBhcnNlSW50KHZhbC50b0ZpeGVkKGRlY0NvdW50KS5yZXBsYWNlKFwiLlwiLCBcIlwiKSk7XG4gICAgY29uc3Qgc3RlcEludCA9IE51bWJlci5wYXJzZUludChzdGVwLnRvRml4ZWQoZGVjQ291bnQpLnJlcGxhY2UoXCIuXCIsIFwiXCIpKTtcbiAgICByZXR1cm4gKHZhbEludCAlIHN0ZXBJbnQpIC8gMTAgKiogZGVjQ291bnQ7XG59XG5leHBvcnQgY2xhc3MgWm9kTnVtYmVyIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMubWluID0gdGhpcy5ndGU7XG4gICAgICAgIHRoaXMubWF4ID0gdGhpcy5sdGU7XG4gICAgICAgIHRoaXMuc3RlcCA9IHRoaXMubXVsdGlwbGVPZjtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGlmICh0aGlzLl9kZWYuY29lcmNlKSB7XG4gICAgICAgICAgICBpbnB1dC5kYXRhID0gTnVtYmVyKGlucHV0LmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhcnNlZFR5cGUgPSB0aGlzLl9nZXRUeXBlKGlucHV0KTtcbiAgICAgICAgaWYgKHBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUubnVtYmVyKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLm51bWJlcixcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGxldCBjdHggPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IG5ldyBQYXJzZVN0YXR1cygpO1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaGVjay5raW5kID09PSBcImludFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF1dGlsLmlzSW50ZWdlcihpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFwiaW50ZWdlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IFwiZmxvYXRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vU21hbGwgPSBjaGVjay5pbmNsdXNpdmUgPyBpbnB1dC5kYXRhIDwgY2hlY2sudmFsdWUgOiBpbnB1dC5kYXRhIDw9IGNoZWNrLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0b29TbWFsbCkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX3NtYWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogY2hlY2sudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm51bWJlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiBjaGVjay5pbmNsdXNpdmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJtYXhcIikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb0JpZyA9IGNoZWNrLmluY2x1c2l2ZSA/IGlucHV0LmRhdGEgPiBjaGVjay52YWx1ZSA6IGlucHV0LmRhdGEgPj0gY2hlY2sudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHRvb0JpZykge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX2JpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heGltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJudW1iZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogY2hlY2suaW5jbHVzaXZlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhhY3Q6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwibXVsdGlwbGVPZlwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZsb2F0U2FmZVJlbWFpbmRlcihpbnB1dC5kYXRhLCBjaGVjay52YWx1ZSkgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLm5vdF9tdWx0aXBsZV9vZixcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpcGxlT2Y6IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiZmluaXRlXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIU51bWJlci5pc0Zpbml0ZShpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUubm90X2Zpbml0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1dGlsLmFzc2VydE5ldmVyKGNoZWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGlucHV0LmRhdGEgfTtcbiAgICB9XG4gICAgZ3RlKHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldExpbWl0KFwibWluXCIsIHZhbHVlLCB0cnVlLCBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkpO1xuICAgIH1cbiAgICBndCh2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRMaW1pdChcIm1pblwiLCB2YWx1ZSwgZmFsc2UsIGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSk7XG4gICAgfVxuICAgIGx0ZSh2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRMaW1pdChcIm1heFwiLCB2YWx1ZSwgdHJ1ZSwgZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpKTtcbiAgICB9XG4gICAgbHQodmFsdWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0TGltaXQoXCJtYXhcIiwgdmFsdWUsIGZhbHNlLCBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkpO1xuICAgIH1cbiAgICBzZXRMaW1pdChraW5kLCB2YWx1ZSwgaW5jbHVzaXZlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kTnVtYmVyKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGNoZWNrczogW1xuICAgICAgICAgICAgICAgIC4uLnRoaXMuX2RlZi5jaGVja3MsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBraW5kLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBfYWRkQ2hlY2soY2hlY2spIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2ROdW1iZXIoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgY2hlY2tzOiBbLi4udGhpcy5fZGVmLmNoZWNrcywgY2hlY2tdLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgaW50KG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwiaW50XCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBwb3NpdGl2ZShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1pblwiLFxuICAgICAgICAgICAgdmFsdWU6IDAsXG4gICAgICAgICAgICBpbmNsdXNpdmU6IGZhbHNlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbmVnYXRpdmUobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtYXhcIixcbiAgICAgICAgICAgIHZhbHVlOiAwLFxuICAgICAgICAgICAgaW5jbHVzaXZlOiBmYWxzZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG5vbnBvc2l0aXZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWF4XCIsXG4gICAgICAgICAgICB2YWx1ZTogMCxcbiAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG5vbm5lZ2F0aXZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWluXCIsXG4gICAgICAgICAgICB2YWx1ZTogMCxcbiAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG11bHRpcGxlT2YodmFsdWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibXVsdGlwbGVPZlwiLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZmluaXRlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwiZmluaXRlXCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzYWZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWluXCIsXG4gICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZTogTnVtYmVyLk1JTl9TQUZFX0lOVEVHRVIsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1heFwiLFxuICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgdmFsdWU6IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0IG1pblZhbHVlKCkge1xuICAgICAgICBsZXQgbWluID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2gua2luZCA9PT0gXCJtaW5cIikge1xuICAgICAgICAgICAgICAgIGlmIChtaW4gPT09IG51bGwgfHwgY2gudmFsdWUgPiBtaW4pXG4gICAgICAgICAgICAgICAgICAgIG1pbiA9IGNoLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtaW47XG4gICAgfVxuICAgIGdldCBtYXhWYWx1ZSgpIHtcbiAgICAgICAgbGV0IG1heCA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgdGhpcy5fZGVmLmNoZWNrcykge1xuICAgICAgICAgICAgaWYgKGNoLmtpbmQgPT09IFwibWF4XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAobWF4ID09PSBudWxsIHx8IGNoLnZhbHVlIDwgbWF4KVxuICAgICAgICAgICAgICAgICAgICBtYXggPSBjaC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF4O1xuICAgIH1cbiAgICBnZXQgaXNJbnQoKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwiaW50XCIgfHwgKGNoLmtpbmQgPT09IFwibXVsdGlwbGVPZlwiICYmIHV0aWwuaXNJbnRlZ2VyKGNoLnZhbHVlKSkpO1xuICAgIH1cbiAgICBnZXQgaXNGaW5pdGUoKSB7XG4gICAgICAgIGxldCBtYXggPSBudWxsO1xuICAgICAgICBsZXQgbWluID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2gua2luZCA9PT0gXCJmaW5pdGVcIiB8fCBjaC5raW5kID09PSBcImludFwiIHx8IGNoLmtpbmQgPT09IFwibXVsdGlwbGVPZlwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaC5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1pbiA9PT0gbnVsbCB8fCBjaC52YWx1ZSA+IG1pbilcbiAgICAgICAgICAgICAgICAgICAgbWluID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaC5raW5kID09PSBcIm1heFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1heCA9PT0gbnVsbCB8fCBjaC52YWx1ZSA8IG1heClcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShtaW4pICYmIE51bWJlci5pc0Zpbml0ZShtYXgpO1xuICAgIH1cbn1cblpvZE51bWJlci5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2ROdW1iZXIoe1xuICAgICAgICBjaGVja3M6IFtdLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE51bWJlcixcbiAgICAgICAgY29lcmNlOiBwYXJhbXM/LmNvZXJjZSB8fCBmYWxzZSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RCaWdJbnQgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5taW4gPSB0aGlzLmd0ZTtcbiAgICAgICAgdGhpcy5tYXggPSB0aGlzLmx0ZTtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGlmICh0aGlzLl9kZWYuY29lcmNlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlucHV0LmRhdGEgPSBCaWdJbnQoaW5wdXQuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dldEludmFsaWRJbnB1dChpbnB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5iaWdpbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nZXRJbnZhbGlkSW5wdXQoaW5wdXQpO1xuICAgICAgICB9XG4gICAgICAgIGxldCBjdHggPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IG5ldyBQYXJzZVN0YXR1cygpO1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaGVjay5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vU21hbGwgPSBjaGVjay5pbmNsdXNpdmUgPyBpbnB1dC5kYXRhIDwgY2hlY2sudmFsdWUgOiBpbnB1dC5kYXRhIDw9IGNoZWNrLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0b29TbWFsbCkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX3NtYWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJiaWdpbnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiBjaGVjay5pbmNsdXNpdmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJtYXhcIikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb0JpZyA9IGNoZWNrLmluY2x1c2l2ZSA/IGlucHV0LmRhdGEgPiBjaGVjay52YWx1ZSA6IGlucHV0LmRhdGEgPj0gY2hlY2sudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHRvb0JpZykge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX2JpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYmlnaW50XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogY2hlY2suaW5jbHVzaXZlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwibXVsdGlwbGVPZlwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmRhdGEgJSBjaGVjay52YWx1ZSAhPT0gQmlnSW50KDApKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5ub3RfbXVsdGlwbGVfb2YsXG4gICAgICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZU9mOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1dGlsLmFzc2VydE5ldmVyKGNoZWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGlucHV0LmRhdGEgfTtcbiAgICB9XG4gICAgX2dldEludmFsaWRJbnB1dChpbnB1dCkge1xuICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLmJpZ2ludCxcbiAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgIH1cbiAgICBndGUodmFsdWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0TGltaXQoXCJtaW5cIiwgdmFsdWUsIHRydWUsIGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSk7XG4gICAgfVxuICAgIGd0KHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldExpbWl0KFwibWluXCIsIHZhbHVlLCBmYWxzZSwgZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpKTtcbiAgICB9XG4gICAgbHRlKHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldExpbWl0KFwibWF4XCIsIHZhbHVlLCB0cnVlLCBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkpO1xuICAgIH1cbiAgICBsdCh2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRMaW1pdChcIm1heFwiLCB2YWx1ZSwgZmFsc2UsIGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSk7XG4gICAgfVxuICAgIHNldExpbWl0KGtpbmQsIHZhbHVlLCBpbmNsdXNpdmUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RCaWdJbnQoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgY2hlY2tzOiBbXG4gICAgICAgICAgICAgICAgLi4udGhpcy5fZGVmLmNoZWNrcyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIF9hZGRDaGVjayhjaGVjaykge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEJpZ0ludCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBjaGVja3M6IFsuLi50aGlzLl9kZWYuY2hlY2tzLCBjaGVja10sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBwb3NpdGl2ZShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1pblwiLFxuICAgICAgICAgICAgdmFsdWU6IEJpZ0ludCgwKSxcbiAgICAgICAgICAgIGluY2x1c2l2ZTogZmFsc2UsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBuZWdhdGl2ZShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1heFwiLFxuICAgICAgICAgICAgdmFsdWU6IEJpZ0ludCgwKSxcbiAgICAgICAgICAgIGluY2x1c2l2ZTogZmFsc2UsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBub25wb3NpdGl2ZShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1heFwiLFxuICAgICAgICAgICAgdmFsdWU6IEJpZ0ludCgwKSxcbiAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG5vbm5lZ2F0aXZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWluXCIsXG4gICAgICAgICAgICB2YWx1ZTogQmlnSW50KDApLFxuICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbXVsdGlwbGVPZih2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtdWx0aXBsZU9mXCIsXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldCBtaW5WYWx1ZSgpIHtcbiAgICAgICAgbGV0IG1pbiA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgdGhpcy5fZGVmLmNoZWNrcykge1xuICAgICAgICAgICAgaWYgKGNoLmtpbmQgPT09IFwibWluXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAobWluID09PSBudWxsIHx8IGNoLnZhbHVlID4gbWluKVxuICAgICAgICAgICAgICAgICAgICBtaW4gPSBjaC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWluO1xuICAgIH1cbiAgICBnZXQgbWF4VmFsdWUoKSB7XG4gICAgICAgIGxldCBtYXggPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaC5raW5kID09PSBcIm1heFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1heCA9PT0gbnVsbCB8fCBjaC52YWx1ZSA8IG1heClcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1heDtcbiAgICB9XG59XG5ab2RCaWdJbnQuY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kQmlnSW50KHtcbiAgICAgICAgY2hlY2tzOiBbXSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RCaWdJbnQsXG4gICAgICAgIGNvZXJjZTogcGFyYW1zPy5jb2VyY2UgPz8gZmFsc2UsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kQm9vbGVhbiBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBpZiAodGhpcy5fZGVmLmNvZXJjZSkge1xuICAgICAgICAgICAgaW5wdXQuZGF0YSA9IEJvb2xlYW4oaW5wdXQuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5ib29sZWFuKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLmJvb2xlYW4sXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT0soaW5wdXQuZGF0YSk7XG4gICAgfVxufVxuWm9kQm9vbGVhbi5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RCb29sZWFuKHtcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RCb29sZWFuLFxuICAgICAgICBjb2VyY2U6IHBhcmFtcz8uY29lcmNlIHx8IGZhbHNlLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZERhdGUgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RlZi5jb2VyY2UpIHtcbiAgICAgICAgICAgIGlucHV0LmRhdGEgPSBuZXcgRGF0ZShpbnB1dC5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLmRhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUuZGF0ZSxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4oaW5wdXQuZGF0YS5nZXRUaW1lKCkpKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9kYXRlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzdGF0dXMgPSBuZXcgUGFyc2VTdGF0dXMoKTtcbiAgICAgICAgbGV0IGN0eCA9IHVuZGVmaW5lZDtcbiAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2hlY2sua2luZCA9PT0gXCJtaW5cIikge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5kYXRhLmdldFRpbWUoKSA8IGNoZWNrLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fc21hbGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhhY3Q6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogY2hlY2sudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImRhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwibWF4XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuZGF0YS5nZXRUaW1lKCkgPiBjaGVjay52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX2JpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiZGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdXRpbC5hc3NlcnROZXZlcihjaGVjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXR1czogc3RhdHVzLnZhbHVlLFxuICAgICAgICAgICAgdmFsdWU6IG5ldyBEYXRlKGlucHV0LmRhdGEuZ2V0VGltZSgpKSxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgX2FkZENoZWNrKGNoZWNrKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kRGF0ZSh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBjaGVja3M6IFsuLi50aGlzLl9kZWYuY2hlY2tzLCBjaGVja10sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBtaW4obWluRGF0ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtaW5cIixcbiAgICAgICAgICAgIHZhbHVlOiBtaW5EYXRlLmdldFRpbWUoKSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG1heChtYXhEYXRlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1heFwiLFxuICAgICAgICAgICAgdmFsdWU6IG1heERhdGUuZ2V0VGltZSgpLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0IG1pbkRhdGUoKSB7XG4gICAgICAgIGxldCBtaW4gPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaC5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1pbiA9PT0gbnVsbCB8fCBjaC52YWx1ZSA+IG1pbilcbiAgICAgICAgICAgICAgICAgICAgbWluID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1pbiAhPSBudWxsID8gbmV3IERhdGUobWluKSA6IG51bGw7XG4gICAgfVxuICAgIGdldCBtYXhEYXRlKCkge1xuICAgICAgICBsZXQgbWF4ID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2gua2luZCA9PT0gXCJtYXhcIikge1xuICAgICAgICAgICAgICAgIGlmIChtYXggPT09IG51bGwgfHwgY2gudmFsdWUgPCBtYXgpXG4gICAgICAgICAgICAgICAgICAgIG1heCA9IGNoLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYXggIT0gbnVsbCA/IG5ldyBEYXRlKG1heCkgOiBudWxsO1xuICAgIH1cbn1cblpvZERhdGUuY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kRGF0ZSh7XG4gICAgICAgIGNoZWNrczogW10sXG4gICAgICAgIGNvZXJjZTogcGFyYW1zPy5jb2VyY2UgfHwgZmFsc2UsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kRGF0ZSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RTeW1ib2wgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5zeW1ib2wpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUuc3ltYm9sLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE9LKGlucHV0LmRhdGEpO1xuICAgIH1cbn1cblpvZFN5bWJvbC5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RTeW1ib2woe1xuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFN5bWJvbCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RVbmRlZmluZWQgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS51bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUudW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE9LKGlucHV0LmRhdGEpO1xuICAgIH1cbn1cblpvZFVuZGVmaW5lZC5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RVbmRlZmluZWQoe1xuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFVuZGVmaW5lZCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2ROdWxsIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHBhcnNlZFR5cGUgPSB0aGlzLl9nZXRUeXBlKGlucHV0KTtcbiAgICAgICAgaWYgKHBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUubnVsbCkge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5udWxsLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE9LKGlucHV0LmRhdGEpO1xuICAgIH1cbn1cblpvZE51bGwuY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kTnVsbCh7XG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kTnVsbCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RBbnkgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgLy8gdG8gcHJldmVudCBpbnN0YW5jZXMgb2Ygb3RoZXIgY2xhc3NlcyBmcm9tIGV4dGVuZGluZyBab2RBbnkuIHRoaXMgY2F1c2VzIGlzc3VlcyB3aXRoIGNhdGNoYWxsIGluIFpvZE9iamVjdC5cbiAgICAgICAgdGhpcy5fYW55ID0gdHJ1ZTtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBPSyhpbnB1dC5kYXRhKTtcbiAgICB9XG59XG5ab2RBbnkuY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kQW55KHtcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RBbnksXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kVW5rbm93biBleHRlbmRzIFpvZFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICAvLyByZXF1aXJlZFxuICAgICAgICB0aGlzLl91bmtub3duID0gdHJ1ZTtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBPSyhpbnB1dC5kYXRhKTtcbiAgICB9XG59XG5ab2RVbmtub3duLmNyZWF0ZSA9IChwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZFVua25vd24oe1xuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFVua25vd24sXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kTmV2ZXIgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5uZXZlcixcbiAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgIH1cbn1cblpvZE5ldmVyLmNyZWF0ZSA9IChwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE5ldmVyKHtcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2ROZXZlcixcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RWb2lkIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHBhcnNlZFR5cGUgPSB0aGlzLl9nZXRUeXBlKGlucHV0KTtcbiAgICAgICAgaWYgKHBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUudW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLnZvaWQsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT0soaW5wdXQuZGF0YSk7XG4gICAgfVxufVxuWm9kVm9pZC5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RWb2lkKHtcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RWb2lkLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZEFycmF5IGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgY3R4LCBzdGF0dXMgfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGNvbnN0IGRlZiA9IHRoaXMuX2RlZjtcbiAgICAgICAgaWYgKGN0eC5wYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLmFycmF5KSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLmFycmF5LFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlZi5leGFjdExlbmd0aCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc3QgdG9vQmlnID0gY3R4LmRhdGEubGVuZ3RoID4gZGVmLmV4YWN0TGVuZ3RoLnZhbHVlO1xuICAgICAgICAgICAgY29uc3QgdG9vU21hbGwgPSBjdHguZGF0YS5sZW5ndGggPCBkZWYuZXhhY3RMZW5ndGgudmFsdWU7XG4gICAgICAgICAgICBpZiAodG9vQmlnIHx8IHRvb1NtYWxsKSB7XG4gICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IHRvb0JpZyA/IFpvZElzc3VlQ29kZS50b29fYmlnIDogWm9kSXNzdWVDb2RlLnRvb19zbWFsbCxcbiAgICAgICAgICAgICAgICAgICAgbWluaW11bTogKHRvb1NtYWxsID8gZGVmLmV4YWN0TGVuZ3RoLnZhbHVlIDogdW5kZWZpbmVkKSxcbiAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogKHRvb0JpZyA/IGRlZi5leGFjdExlbmd0aC52YWx1ZSA6IHVuZGVmaW5lZCksXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBleGFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZGVmLmV4YWN0TGVuZ3RoLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlZi5taW5MZW5ndGggIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChjdHguZGF0YS5sZW5ndGggPCBkZWYubWluTGVuZ3RoLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fc21hbGwsXG4gICAgICAgICAgICAgICAgICAgIG1pbmltdW06IGRlZi5taW5MZW5ndGgudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZi5taW5MZW5ndGgubWVzc2FnZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVmLm1heExlbmd0aCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGN0eC5kYXRhLmxlbmd0aCA+IGRlZi5tYXhMZW5ndGgudmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19iaWcsXG4gICAgICAgICAgICAgICAgICAgIG1heGltdW06IGRlZi5tYXhMZW5ndGgudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZi5tYXhMZW5ndGgubWVzc2FnZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFsuLi5jdHguZGF0YV0ubWFwKChpdGVtLCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZi50eXBlLl9wYXJzZUFzeW5jKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCBpdGVtLCBjdHgucGF0aCwgaSkpO1xuICAgICAgICAgICAgfSkpLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZUFycmF5KHN0YXR1cywgcmVzdWx0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFsuLi5jdHguZGF0YV0ubWFwKChpdGVtLCBpKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZGVmLnR5cGUuX3BhcnNlU3luYyhuZXcgUGFyc2VJbnB1dExhenlQYXRoKGN0eCwgaXRlbSwgY3R4LnBhdGgsIGkpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZUFycmF5KHN0YXR1cywgcmVzdWx0KTtcbiAgICB9XG4gICAgZ2V0IGVsZW1lbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYudHlwZTtcbiAgICB9XG4gICAgbWluKG1pbkxlbmd0aCwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEFycmF5KHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIG1pbkxlbmd0aDogeyB2YWx1ZTogbWluTGVuZ3RoLCBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG1heChtYXhMZW5ndGgsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RBcnJheSh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBtYXhMZW5ndGg6IHsgdmFsdWU6IG1heExlbmd0aCwgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBsZW5ndGgobGVuLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kQXJyYXkoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgZXhhY3RMZW5ndGg6IHsgdmFsdWU6IGxlbiwgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBub25lbXB0eShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1pbigxLCBtZXNzYWdlKTtcbiAgICB9XG59XG5ab2RBcnJheS5jcmVhdGUgPSAoc2NoZW1hLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZEFycmF5KHtcbiAgICAgICAgdHlwZTogc2NoZW1hLFxuICAgICAgICBtaW5MZW5ndGg6IG51bGwsXG4gICAgICAgIG1heExlbmd0aDogbnVsbCxcbiAgICAgICAgZXhhY3RMZW5ndGg6IG51bGwsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kQXJyYXksXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5mdW5jdGlvbiBkZWVwUGFydGlhbGlmeShzY2hlbWEpIHtcbiAgICBpZiAoc2NoZW1hIGluc3RhbmNlb2YgWm9kT2JqZWN0KSB7XG4gICAgICAgIGNvbnN0IG5ld1NoYXBlID0ge307XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIHNjaGVtYS5zaGFwZSkge1xuICAgICAgICAgICAgY29uc3QgZmllbGRTY2hlbWEgPSBzY2hlbWEuc2hhcGVba2V5XTtcbiAgICAgICAgICAgIG5ld1NoYXBlW2tleV0gPSBab2RPcHRpb25hbC5jcmVhdGUoZGVlcFBhcnRpYWxpZnkoZmllbGRTY2hlbWEpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi5zY2hlbWEuX2RlZixcbiAgICAgICAgICAgIHNoYXBlOiAoKSA9PiBuZXdTaGFwZSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIFpvZEFycmF5KSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kQXJyYXkoe1xuICAgICAgICAgICAgLi4uc2NoZW1hLl9kZWYsXG4gICAgICAgICAgICB0eXBlOiBkZWVwUGFydGlhbGlmeShzY2hlbWEuZWxlbWVudCksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBab2RPcHRpb25hbCkge1xuICAgICAgICByZXR1cm4gWm9kT3B0aW9uYWwuY3JlYXRlKGRlZXBQYXJ0aWFsaWZ5KHNjaGVtYS51bndyYXAoKSkpO1xuICAgIH1cbiAgICBlbHNlIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBab2ROdWxsYWJsZSkge1xuICAgICAgICByZXR1cm4gWm9kTnVsbGFibGUuY3JlYXRlKGRlZXBQYXJ0aWFsaWZ5KHNjaGVtYS51bndyYXAoKSkpO1xuICAgIH1cbiAgICBlbHNlIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBab2RUdXBsZSkge1xuICAgICAgICByZXR1cm4gWm9kVHVwbGUuY3JlYXRlKHNjaGVtYS5pdGVtcy5tYXAoKGl0ZW0pID0+IGRlZXBQYXJ0aWFsaWZ5KGl0ZW0pKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gc2NoZW1hO1xuICAgIH1cbn1cbmV4cG9ydCBjbGFzcyBab2RPYmplY3QgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5fY2FjaGVkID0gbnVsbDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXByZWNhdGVkIEluIG1vc3QgY2FzZXMsIHRoaXMgaXMgbm8gbG9uZ2VyIG5lZWRlZCAtIHVua25vd24gcHJvcGVydGllcyBhcmUgbm93IHNpbGVudGx5IHN0cmlwcGVkLlxuICAgICAgICAgKiBJZiB5b3Ugd2FudCB0byBwYXNzIHRocm91Z2ggdW5rbm93biBwcm9wZXJ0aWVzLCB1c2UgYC5wYXNzdGhyb3VnaCgpYCBpbnN0ZWFkLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5ub25zdHJpY3QgPSB0aGlzLnBhc3N0aHJvdWdoO1xuICAgICAgICAvLyBleHRlbmQ8XG4gICAgICAgIC8vICAgQXVnbWVudGF0aW9uIGV4dGVuZHMgWm9kUmF3U2hhcGUsXG4gICAgICAgIC8vICAgTmV3T3V0cHV0IGV4dGVuZHMgdXRpbC5mbGF0dGVuPHtcbiAgICAgICAgLy8gICAgIFtrIGluIGtleW9mIEF1Z21lbnRhdGlvbiB8IGtleW9mIE91dHB1dF06IGsgZXh0ZW5kcyBrZXlvZiBBdWdtZW50YXRpb25cbiAgICAgICAgLy8gICAgICAgPyBBdWdtZW50YXRpb25ba11bXCJfb3V0cHV0XCJdXG4gICAgICAgIC8vICAgICAgIDogayBleHRlbmRzIGtleW9mIE91dHB1dFxuICAgICAgICAvLyAgICAgICA/IE91dHB1dFtrXVxuICAgICAgICAvLyAgICAgICA6IG5ldmVyO1xuICAgICAgICAvLyAgIH0+LFxuICAgICAgICAvLyAgIE5ld0lucHV0IGV4dGVuZHMgdXRpbC5mbGF0dGVuPHtcbiAgICAgICAgLy8gICAgIFtrIGluIGtleW9mIEF1Z21lbnRhdGlvbiB8IGtleW9mIElucHV0XTogayBleHRlbmRzIGtleW9mIEF1Z21lbnRhdGlvblxuICAgICAgICAvLyAgICAgICA/IEF1Z21lbnRhdGlvbltrXVtcIl9pbnB1dFwiXVxuICAgICAgICAvLyAgICAgICA6IGsgZXh0ZW5kcyBrZXlvZiBJbnB1dFxuICAgICAgICAvLyAgICAgICA/IElucHV0W2tdXG4gICAgICAgIC8vICAgICAgIDogbmV2ZXI7XG4gICAgICAgIC8vICAgfT5cbiAgICAgICAgLy8gPihcbiAgICAgICAgLy8gICBhdWdtZW50YXRpb246IEF1Z21lbnRhdGlvblxuICAgICAgICAvLyApOiBab2RPYmplY3Q8XG4gICAgICAgIC8vICAgZXh0ZW5kU2hhcGU8VCwgQXVnbWVudGF0aW9uPixcbiAgICAgICAgLy8gICBVbmtub3duS2V5cyxcbiAgICAgICAgLy8gICBDYXRjaGFsbCxcbiAgICAgICAgLy8gICBOZXdPdXRwdXQsXG4gICAgICAgIC8vICAgTmV3SW5wdXRcbiAgICAgICAgLy8gPiB7XG4gICAgICAgIC8vICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAvLyAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAvLyAgICAgc2hhcGU6ICgpID0+ICh7XG4gICAgICAgIC8vICAgICAgIC4uLnRoaXMuX2RlZi5zaGFwZSgpLFxuICAgICAgICAvLyAgICAgICAuLi5hdWdtZW50YXRpb24sXG4gICAgICAgIC8vICAgICB9KSxcbiAgICAgICAgLy8gICB9KSBhcyBhbnk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXByZWNhdGVkIFVzZSBgLmV4dGVuZGAgaW5zdGVhZFxuICAgICAgICAgKiAgKi9cbiAgICAgICAgdGhpcy5hdWdtZW50ID0gdGhpcy5leHRlbmQ7XG4gICAgfVxuICAgIF9nZXRDYWNoZWQoKSB7XG4gICAgICAgIGlmICh0aGlzLl9jYWNoZWQgIT09IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGVkO1xuICAgICAgICBjb25zdCBzaGFwZSA9IHRoaXMuX2RlZi5zaGFwZSgpO1xuICAgICAgICBjb25zdCBrZXlzID0gdXRpbC5vYmplY3RLZXlzKHNoYXBlKTtcbiAgICAgICAgdGhpcy5fY2FjaGVkID0geyBzaGFwZSwga2V5cyB9O1xuICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGVkO1xuICAgIH1cbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5vYmplY3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUub2JqZWN0LFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgeyBzdGF0dXMsIGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgY29uc3QgeyBzaGFwZSwga2V5czogc2hhcGVLZXlzIH0gPSB0aGlzLl9nZXRDYWNoZWQoKTtcbiAgICAgICAgY29uc3QgZXh0cmFLZXlzID0gW107XG4gICAgICAgIGlmICghKHRoaXMuX2RlZi5jYXRjaGFsbCBpbnN0YW5jZW9mIFpvZE5ldmVyICYmIHRoaXMuX2RlZi51bmtub3duS2V5cyA9PT0gXCJzdHJpcFwiKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gY3R4LmRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXNoYXBlS2V5cy5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhS2V5cy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhaXJzID0gW107XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHNoYXBlS2V5cykge1xuICAgICAgICAgICAgY29uc3Qga2V5VmFsaWRhdG9yID0gc2hhcGVba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY3R4LmRhdGFba2V5XTtcbiAgICAgICAgICAgIHBhaXJzLnB1c2goe1xuICAgICAgICAgICAgICAgIGtleTogeyBzdGF0dXM6IFwidmFsaWRcIiwgdmFsdWU6IGtleSB9LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBrZXlWYWxpZGF0b3IuX3BhcnNlKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCB2YWx1ZSwgY3R4LnBhdGgsIGtleSkpLFxuICAgICAgICAgICAgICAgIGFsd2F5c1NldDoga2V5IGluIGN0eC5kYXRhLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2RlZi5jYXRjaGFsbCBpbnN0YW5jZW9mIFpvZE5ldmVyKSB7XG4gICAgICAgICAgICBjb25zdCB1bmtub3duS2V5cyA9IHRoaXMuX2RlZi51bmtub3duS2V5cztcbiAgICAgICAgICAgIGlmICh1bmtub3duS2V5cyA9PT0gXCJwYXNzdGhyb3VnaFwiKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgZXh0cmFLZXlzKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiB7IHN0YXR1czogXCJ2YWxpZFwiLCB2YWx1ZToga2V5IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyBzdGF0dXM6IFwidmFsaWRcIiwgdmFsdWU6IGN0eC5kYXRhW2tleV0gfSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodW5rbm93bktleXMgPT09IFwic3RyaWN0XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXh0cmFLZXlzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudW5yZWNvZ25pemVkX2tleXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzOiBleHRyYUtleXMsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bmtub3duS2V5cyA9PT0gXCJzdHJpcFwiKSB7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGVybmFsIFpvZE9iamVjdCBlcnJvcjogaW52YWxpZCB1bmtub3duS2V5cyB2YWx1ZS5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIHJ1biBjYXRjaGFsbCB2YWxpZGF0aW9uXG4gICAgICAgICAgICBjb25zdCBjYXRjaGFsbCA9IHRoaXMuX2RlZi5jYXRjaGFsbDtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGV4dHJhS2V5cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY3R4LmRhdGFba2V5XTtcbiAgICAgICAgICAgICAgICBwYWlycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAga2V5OiB7IHN0YXR1czogXCJ2YWxpZFwiLCB2YWx1ZToga2V5IH0sXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBjYXRjaGFsbC5fcGFyc2UobmV3IFBhcnNlSW5wdXRMYXp5UGF0aChjdHgsIHZhbHVlLCBjdHgucGF0aCwga2V5KSAvLywgY3R4LmNoaWxkKGtleSksIHZhbHVlLCBnZXRQYXJzZWRUeXBlKHZhbHVlKVxuICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICBhbHdheXNTZXQ6IGtleSBpbiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAgICAgICAgICAgLnRoZW4oYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN5bmNQYWlycyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBhd2FpdCBwYWlyLmtleTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCBwYWlyLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBzeW5jUGFpcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsd2F5c1NldDogcGFpci5hbHdheXNTZXQsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc3luY1BhaXJzO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAudGhlbigoc3luY1BhaXJzKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFBhcnNlU3RhdHVzLm1lcmdlT2JqZWN0U3luYyhzdGF0dXMsIHN5bmNQYWlycyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZU9iamVjdFN5bmMoc3RhdHVzLCBwYWlycyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ2V0IHNoYXBlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnNoYXBlKCk7XG4gICAgfVxuICAgIHN0cmljdChtZXNzYWdlKSB7XG4gICAgICAgIGVycm9yVXRpbC5lcnJUb09iajtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgdW5rbm93bktleXM6IFwic3RyaWN0XCIsXG4gICAgICAgICAgICAuLi4obWVzc2FnZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWFwOiAoaXNzdWUsIGN0eCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVmYXVsdEVycm9yID0gdGhpcy5fZGVmLmVycm9yTWFwPy4oaXNzdWUsIGN0eCkubWVzc2FnZSA/PyBjdHguZGVmYXVsdEVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzc3VlLmNvZGUgPT09IFwidW5yZWNvZ25pemVkX2tleXNcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkubWVzc2FnZSA/PyBkZWZhdWx0RXJyb3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZGVmYXVsdEVycm9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgOiB7fSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzdHJpcCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgdW5rbm93bktleXM6IFwic3RyaXBcIixcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHBhc3N0aHJvdWdoKCkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICB1bmtub3duS2V5czogXCJwYXNzdGhyb3VnaFwiLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gY29uc3QgQXVnbWVudEZhY3RvcnkgPVxuICAgIC8vICAgPERlZiBleHRlbmRzIFpvZE9iamVjdERlZj4oZGVmOiBEZWYpID0+XG4gICAgLy8gICA8QXVnbWVudGF0aW9uIGV4dGVuZHMgWm9kUmF3U2hhcGU+KFxuICAgIC8vICAgICBhdWdtZW50YXRpb246IEF1Z21lbnRhdGlvblxuICAgIC8vICAgKTogWm9kT2JqZWN0PFxuICAgIC8vICAgICBleHRlbmRTaGFwZTxSZXR1cm5UeXBlPERlZltcInNoYXBlXCJdPiwgQXVnbWVudGF0aW9uPixcbiAgICAvLyAgICAgRGVmW1widW5rbm93bktleXNcIl0sXG4gICAgLy8gICAgIERlZltcImNhdGNoYWxsXCJdXG4gICAgLy8gICA+ID0+IHtcbiAgICAvLyAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgIC8vICAgICAgIC4uLmRlZixcbiAgICAvLyAgICAgICBzaGFwZTogKCkgPT4gKHtcbiAgICAvLyAgICAgICAgIC4uLmRlZi5zaGFwZSgpLFxuICAgIC8vICAgICAgICAgLi4uYXVnbWVudGF0aW9uLFxuICAgIC8vICAgICAgIH0pLFxuICAgIC8vICAgICB9KSBhcyBhbnk7XG4gICAgLy8gICB9O1xuICAgIGV4dGVuZChhdWdtZW50YXRpb24pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgc2hhcGU6ICgpID0+ICh7XG4gICAgICAgICAgICAgICAgLi4udGhpcy5fZGVmLnNoYXBlKCksXG4gICAgICAgICAgICAgICAgLi4uYXVnbWVudGF0aW9uLFxuICAgICAgICAgICAgfSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcmlvciB0byB6b2RAMS4wLjEyIHRoZXJlIHdhcyBhIGJ1ZyBpbiB0aGVcbiAgICAgKiBpbmZlcnJlZCB0eXBlIG9mIG1lcmdlZCBvYmplY3RzLiBQbGVhc2VcbiAgICAgKiB1cGdyYWRlIGlmIHlvdSBhcmUgZXhwZXJpZW5jaW5nIGlzc3Vlcy5cbiAgICAgKi9cbiAgICBtZXJnZShtZXJnaW5nKSB7XG4gICAgICAgIGNvbnN0IG1lcmdlZCA9IG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgdW5rbm93bktleXM6IG1lcmdpbmcuX2RlZi51bmtub3duS2V5cyxcbiAgICAgICAgICAgIGNhdGNoYWxsOiBtZXJnaW5nLl9kZWYuY2F0Y2hhbGwsXG4gICAgICAgICAgICBzaGFwZTogKCkgPT4gKHtcbiAgICAgICAgICAgICAgICAuLi50aGlzLl9kZWYuc2hhcGUoKSxcbiAgICAgICAgICAgICAgICAuLi5tZXJnaW5nLl9kZWYuc2hhcGUoKSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RPYmplY3QsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbWVyZ2VkO1xuICAgIH1cbiAgICAvLyBtZXJnZTxcbiAgICAvLyAgIEluY29taW5nIGV4dGVuZHMgQW55Wm9kT2JqZWN0LFxuICAgIC8vICAgQXVnbWVudGF0aW9uIGV4dGVuZHMgSW5jb21pbmdbXCJzaGFwZVwiXSxcbiAgICAvLyAgIE5ld091dHB1dCBleHRlbmRzIHtcbiAgICAvLyAgICAgW2sgaW4ga2V5b2YgQXVnbWVudGF0aW9uIHwga2V5b2YgT3V0cHV0XTogayBleHRlbmRzIGtleW9mIEF1Z21lbnRhdGlvblxuICAgIC8vICAgICAgID8gQXVnbWVudGF0aW9uW2tdW1wiX291dHB1dFwiXVxuICAgIC8vICAgICAgIDogayBleHRlbmRzIGtleW9mIE91dHB1dFxuICAgIC8vICAgICAgID8gT3V0cHV0W2tdXG4gICAgLy8gICAgICAgOiBuZXZlcjtcbiAgICAvLyAgIH0sXG4gICAgLy8gICBOZXdJbnB1dCBleHRlbmRzIHtcbiAgICAvLyAgICAgW2sgaW4ga2V5b2YgQXVnbWVudGF0aW9uIHwga2V5b2YgSW5wdXRdOiBrIGV4dGVuZHMga2V5b2YgQXVnbWVudGF0aW9uXG4gICAgLy8gICAgICAgPyBBdWdtZW50YXRpb25ba11bXCJfaW5wdXRcIl1cbiAgICAvLyAgICAgICA6IGsgZXh0ZW5kcyBrZXlvZiBJbnB1dFxuICAgIC8vICAgICAgID8gSW5wdXRba11cbiAgICAvLyAgICAgICA6IG5ldmVyO1xuICAgIC8vICAgfVxuICAgIC8vID4oXG4gICAgLy8gICBtZXJnaW5nOiBJbmNvbWluZ1xuICAgIC8vICk6IFpvZE9iamVjdDxcbiAgICAvLyAgIGV4dGVuZFNoYXBlPFQsIFJldHVyblR5cGU8SW5jb21pbmdbXCJfZGVmXCJdW1wic2hhcGVcIl0+PixcbiAgICAvLyAgIEluY29taW5nW1wiX2RlZlwiXVtcInVua25vd25LZXlzXCJdLFxuICAgIC8vICAgSW5jb21pbmdbXCJfZGVmXCJdW1wiY2F0Y2hhbGxcIl0sXG4gICAgLy8gICBOZXdPdXRwdXQsXG4gICAgLy8gICBOZXdJbnB1dFxuICAgIC8vID4ge1xuICAgIC8vICAgY29uc3QgbWVyZ2VkOiBhbnkgPSBuZXcgWm9kT2JqZWN0KHtcbiAgICAvLyAgICAgdW5rbm93bktleXM6IG1lcmdpbmcuX2RlZi51bmtub3duS2V5cyxcbiAgICAvLyAgICAgY2F0Y2hhbGw6IG1lcmdpbmcuX2RlZi5jYXRjaGFsbCxcbiAgICAvLyAgICAgc2hhcGU6ICgpID0+XG4gICAgLy8gICAgICAgb2JqZWN0VXRpbC5tZXJnZVNoYXBlcyh0aGlzLl9kZWYuc2hhcGUoKSwgbWVyZ2luZy5fZGVmLnNoYXBlKCkpLFxuICAgIC8vICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE9iamVjdCxcbiAgICAvLyAgIH0pIGFzIGFueTtcbiAgICAvLyAgIHJldHVybiBtZXJnZWQ7XG4gICAgLy8gfVxuICAgIHNldEtleShrZXksIHNjaGVtYSkge1xuICAgICAgICByZXR1cm4gdGhpcy5hdWdtZW50KHsgW2tleV06IHNjaGVtYSB9KTtcbiAgICB9XG4gICAgLy8gbWVyZ2U8SW5jb21pbmcgZXh0ZW5kcyBBbnlab2RPYmplY3Q+KFxuICAgIC8vICAgbWVyZ2luZzogSW5jb21pbmdcbiAgICAvLyApOiAvL1pvZE9iamVjdDxUICYgSW5jb21pbmdbXCJfc2hhcGVcIl0sIFVua25vd25LZXlzLCBDYXRjaGFsbD4gPSAobWVyZ2luZykgPT4ge1xuICAgIC8vIFpvZE9iamVjdDxcbiAgICAvLyAgIGV4dGVuZFNoYXBlPFQsIFJldHVyblR5cGU8SW5jb21pbmdbXCJfZGVmXCJdW1wic2hhcGVcIl0+PixcbiAgICAvLyAgIEluY29taW5nW1wiX2RlZlwiXVtcInVua25vd25LZXlzXCJdLFxuICAgIC8vICAgSW5jb21pbmdbXCJfZGVmXCJdW1wiY2F0Y2hhbGxcIl1cbiAgICAvLyA+IHtcbiAgICAvLyAgIC8vIGNvbnN0IG1lcmdlZFNoYXBlID0gb2JqZWN0VXRpbC5tZXJnZVNoYXBlcyhcbiAgICAvLyAgIC8vICAgdGhpcy5fZGVmLnNoYXBlKCksXG4gICAgLy8gICAvLyAgIG1lcmdpbmcuX2RlZi5zaGFwZSgpXG4gICAgLy8gICAvLyApO1xuICAgIC8vICAgY29uc3QgbWVyZ2VkOiBhbnkgPSBuZXcgWm9kT2JqZWN0KHtcbiAgICAvLyAgICAgdW5rbm93bktleXM6IG1lcmdpbmcuX2RlZi51bmtub3duS2V5cyxcbiAgICAvLyAgICAgY2F0Y2hhbGw6IG1lcmdpbmcuX2RlZi5jYXRjaGFsbCxcbiAgICAvLyAgICAgc2hhcGU6ICgpID0+XG4gICAgLy8gICAgICAgb2JqZWN0VXRpbC5tZXJnZVNoYXBlcyh0aGlzLl9kZWYuc2hhcGUoKSwgbWVyZ2luZy5fZGVmLnNoYXBlKCkpLFxuICAgIC8vICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE9iamVjdCxcbiAgICAvLyAgIH0pIGFzIGFueTtcbiAgICAvLyAgIHJldHVybiBtZXJnZWQ7XG4gICAgLy8gfVxuICAgIGNhdGNoYWxsKGluZGV4KSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kT2JqZWN0KHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGNhdGNoYWxsOiBpbmRleCxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHBpY2sobWFzaykge1xuICAgICAgICBjb25zdCBzaGFwZSA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiB1dGlsLm9iamVjdEtleXMobWFzaykpIHtcbiAgICAgICAgICAgIGlmIChtYXNrW2tleV0gJiYgdGhpcy5zaGFwZVtrZXldKSB7XG4gICAgICAgICAgICAgICAgc2hhcGVba2V5XSA9IHRoaXMuc2hhcGVba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBzaGFwZTogKCkgPT4gc2hhcGUsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBvbWl0KG1hc2spIHtcbiAgICAgICAgY29uc3Qgc2hhcGUgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgdXRpbC5vYmplY3RLZXlzKHRoaXMuc2hhcGUpKSB7XG4gICAgICAgICAgICBpZiAoIW1hc2tba2V5XSkge1xuICAgICAgICAgICAgICAgIHNoYXBlW2tleV0gPSB0aGlzLnNoYXBlW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgc2hhcGU6ICgpID0+IHNoYXBlLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICBkZWVwUGFydGlhbCgpIHtcbiAgICAgICAgcmV0dXJuIGRlZXBQYXJ0aWFsaWZ5KHRoaXMpO1xuICAgIH1cbiAgICBwYXJ0aWFsKG1hc2spIHtcbiAgICAgICAgY29uc3QgbmV3U2hhcGUgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgdXRpbC5vYmplY3RLZXlzKHRoaXMuc2hhcGUpKSB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZFNjaGVtYSA9IHRoaXMuc2hhcGVba2V5XTtcbiAgICAgICAgICAgIGlmIChtYXNrICYmICFtYXNrW2tleV0pIHtcbiAgICAgICAgICAgICAgICBuZXdTaGFwZVtrZXldID0gZmllbGRTY2hlbWE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXdTaGFwZVtrZXldID0gZmllbGRTY2hlbWEub3B0aW9uYWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBzaGFwZTogKCkgPT4gbmV3U2hhcGUsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXF1aXJlZChtYXNrKSB7XG4gICAgICAgIGNvbnN0IG5ld1NoYXBlID0ge307XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHV0aWwub2JqZWN0S2V5cyh0aGlzLnNoYXBlKSkge1xuICAgICAgICAgICAgaWYgKG1hc2sgJiYgIW1hc2tba2V5XSkge1xuICAgICAgICAgICAgICAgIG5ld1NoYXBlW2tleV0gPSB0aGlzLnNoYXBlW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWVsZFNjaGVtYSA9IHRoaXMuc2hhcGVba2V5XTtcbiAgICAgICAgICAgICAgICBsZXQgbmV3RmllbGQgPSBmaWVsZFNjaGVtYTtcbiAgICAgICAgICAgICAgICB3aGlsZSAobmV3RmllbGQgaW5zdGFuY2VvZiBab2RPcHRpb25hbCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdGaWVsZCA9IG5ld0ZpZWxkLl9kZWYuaW5uZXJUeXBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXdTaGFwZVtrZXldID0gbmV3RmllbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgc2hhcGU6ICgpID0+IG5ld1NoYXBlLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAga2V5b2YoKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVab2RFbnVtKHV0aWwub2JqZWN0S2V5cyh0aGlzLnNoYXBlKSk7XG4gICAgfVxufVxuWm9kT2JqZWN0LmNyZWF0ZSA9IChzaGFwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICBzaGFwZTogKCkgPT4gc2hhcGUsXG4gICAgICAgIHVua25vd25LZXlzOiBcInN0cmlwXCIsXG4gICAgICAgIGNhdGNoYWxsOiBab2ROZXZlci5jcmVhdGUoKSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RPYmplY3QsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5ab2RPYmplY3Quc3RyaWN0Q3JlYXRlID0gKHNoYXBlLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgIHNoYXBlOiAoKSA9PiBzaGFwZSxcbiAgICAgICAgdW5rbm93bktleXM6IFwic3RyaWN0XCIsXG4gICAgICAgIGNhdGNoYWxsOiBab2ROZXZlci5jcmVhdGUoKSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RPYmplY3QsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5ab2RPYmplY3QubGF6eWNyZWF0ZSA9IChzaGFwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICBzaGFwZSxcbiAgICAgICAgdW5rbm93bktleXM6IFwic3RyaXBcIixcbiAgICAgICAgY2F0Y2hhbGw6IFpvZE5ldmVyLmNyZWF0ZSgpLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE9iamVjdCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RVbmlvbiBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMuX2RlZi5vcHRpb25zO1xuICAgICAgICBmdW5jdGlvbiBoYW5kbGVSZXN1bHRzKHJlc3VsdHMpIHtcbiAgICAgICAgICAgIC8vIHJldHVybiBmaXJzdCBpc3N1ZS1mcmVlIHZhbGlkYXRpb24gaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5yZXN1bHQuc3RhdHVzID09PSBcInZhbGlkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgcmVzdWx0cykge1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQucmVzdWx0LnN0YXR1cyA9PT0gXCJkaXJ0eVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBpc3N1ZXMgZnJvbSBkaXJ0eSBvcHRpb25cbiAgICAgICAgICAgICAgICAgICAgY3R4LmNvbW1vbi5pc3N1ZXMucHVzaCguLi5yZXN1bHQuY3R4LmNvbW1vbi5pc3N1ZXMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyByZXR1cm4gaW52YWxpZFxuICAgICAgICAgICAgY29uc3QgdW5pb25FcnJvcnMgPSByZXN1bHRzLm1hcCgocmVzdWx0KSA9PiBuZXcgWm9kRXJyb3IocmVzdWx0LmN0eC5jb21tb24uaXNzdWVzKSk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF91bmlvbixcbiAgICAgICAgICAgICAgICB1bmlvbkVycm9ycyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN0eC5jb21tb24uYXN5bmMpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChvcHRpb25zLm1hcChhc3luYyAob3B0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRDdHggPSB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgICAgICAgY29tbW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5jdHguY29tbW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWVzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBudWxsLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBhd2FpdCBvcHRpb24uX3BhcnNlQXN5bmMoe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogY2hpbGRDdHgsXG4gICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICBjdHg6IGNoaWxkQ3R4LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KSkudGhlbihoYW5kbGVSZXN1bHRzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxldCBkaXJ0eSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbnN0IGlzc3VlcyA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2Ygb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkQ3R4ID0ge1xuICAgICAgICAgICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICAgICAgICAgIGNvbW1vbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgLi4uY3R4LmNvbW1vbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzc3VlczogW10sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbnVsbCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG9wdGlvbi5fcGFyc2VTeW5jKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IGNoaWxkQ3R4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSBcInZhbGlkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAocmVzdWx0LnN0YXR1cyA9PT0gXCJkaXJ0eVwiICYmICFkaXJ0eSkge1xuICAgICAgICAgICAgICAgICAgICBkaXJ0eSA9IHsgcmVzdWx0LCBjdHg6IGNoaWxkQ3R4IH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjaGlsZEN0eC5jb21tb24uaXNzdWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaChjaGlsZEN0eC5jb21tb24uaXNzdWVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGlydHkpIHtcbiAgICAgICAgICAgICAgICBjdHguY29tbW9uLmlzc3Vlcy5wdXNoKC4uLmRpcnR5LmN0eC5jb21tb24uaXNzdWVzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGlydHkucmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdW5pb25FcnJvcnMgPSBpc3N1ZXMubWFwKChpc3N1ZXMpID0+IG5ldyBab2RFcnJvcihpc3N1ZXMpKTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3VuaW9uLFxuICAgICAgICAgICAgICAgIHVuaW9uRXJyb3JzLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBnZXQgb3B0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5vcHRpb25zO1xuICAgIH1cbn1cblpvZFVuaW9uLmNyZWF0ZSA9ICh0eXBlcywgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RVbmlvbih7XG4gICAgICAgIG9wdGlvbnM6IHR5cGVzLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFVuaW9uLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8vLy8vLy8vL1xuLy8vLy8vLy8vLyAgICAgIFpvZERpc2NyaW1pbmF0ZWRVbmlvbiAgICAgIC8vLy8vLy8vLy9cbi8vLy8vLy8vLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbmNvbnN0IGdldERpc2NyaW1pbmF0b3IgPSAodHlwZSkgPT4ge1xuICAgIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kTGF6eSkge1xuICAgICAgICByZXR1cm4gZ2V0RGlzY3JpbWluYXRvcih0eXBlLnNjaGVtYSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2RFZmZlY3RzKSB7XG4gICAgICAgIHJldHVybiBnZXREaXNjcmltaW5hdG9yKHR5cGUuaW5uZXJUeXBlKCkpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kTGl0ZXJhbCkge1xuICAgICAgICByZXR1cm4gW3R5cGUudmFsdWVdO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kRW51bSkge1xuICAgICAgICByZXR1cm4gdHlwZS5vcHRpb25zO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kTmF0aXZlRW51bSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgYmFuL2JhblxuICAgICAgICByZXR1cm4gdXRpbC5vYmplY3RWYWx1ZXModHlwZS5lbnVtKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSBpbnN0YW5jZW9mIFpvZERlZmF1bHQpIHtcbiAgICAgICAgcmV0dXJuIGdldERpc2NyaW1pbmF0b3IodHlwZS5fZGVmLmlubmVyVHlwZSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2RVbmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIFt1bmRlZmluZWRdO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kTnVsbCkge1xuICAgICAgICByZXR1cm4gW251bGxdO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kT3B0aW9uYWwpIHtcbiAgICAgICAgcmV0dXJuIFt1bmRlZmluZWQsIC4uLmdldERpc2NyaW1pbmF0b3IodHlwZS51bndyYXAoKSldO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kTnVsbGFibGUpIHtcbiAgICAgICAgcmV0dXJuIFtudWxsLCAuLi5nZXREaXNjcmltaW5hdG9yKHR5cGUudW53cmFwKCkpXTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSBpbnN0YW5jZW9mIFpvZEJyYW5kZWQpIHtcbiAgICAgICAgcmV0dXJuIGdldERpc2NyaW1pbmF0b3IodHlwZS51bndyYXAoKSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2RSZWFkb25seSkge1xuICAgICAgICByZXR1cm4gZ2V0RGlzY3JpbWluYXRvcih0eXBlLnVud3JhcCgpKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSBpbnN0YW5jZW9mIFpvZENhdGNoKSB7XG4gICAgICAgIHJldHVybiBnZXREaXNjcmltaW5hdG9yKHR5cGUuX2RlZi5pbm5lclR5cGUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbn07XG5leHBvcnQgY2xhc3MgWm9kRGlzY3JpbWluYXRlZFVuaW9uIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUub2JqZWN0KSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLm9iamVjdCxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpc2NyaW1pbmF0b3IgPSB0aGlzLmRpc2NyaW1pbmF0b3I7XG4gICAgICAgIGNvbnN0IGRpc2NyaW1pbmF0b3JWYWx1ZSA9IGN0eC5kYXRhW2Rpc2NyaW1pbmF0b3JdO1xuICAgICAgICBjb25zdCBvcHRpb24gPSB0aGlzLm9wdGlvbnNNYXAuZ2V0KGRpc2NyaW1pbmF0b3JWYWx1ZSk7XG4gICAgICAgIGlmICghb3B0aW9uKSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF91bmlvbl9kaXNjcmltaW5hdG9yLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IEFycmF5LmZyb20odGhpcy5vcHRpb25zTWFwLmtleXMoKSksXG4gICAgICAgICAgICAgICAgcGF0aDogW2Rpc2NyaW1pbmF0b3JdLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbi5fcGFyc2VBc3luYyh7XG4gICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRpb24uX3BhcnNlU3luYyh7XG4gICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBnZXQgZGlzY3JpbWluYXRvcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5kaXNjcmltaW5hdG9yO1xuICAgIH1cbiAgICBnZXQgb3B0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5vcHRpb25zO1xuICAgIH1cbiAgICBnZXQgb3B0aW9uc01hcCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5vcHRpb25zTWFwO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgY29uc3RydWN0b3Igb2YgdGhlIGRpc2NyaW1pbmF0ZWQgdW5pb24gc2NoZW1hLiBJdHMgYmVoYXZpb3VyIGlzIHZlcnkgc2ltaWxhciB0byB0aGF0IG9mIHRoZSBub3JtYWwgei51bmlvbigpIGNvbnN0cnVjdG9yLlxuICAgICAqIEhvd2V2ZXIsIGl0IG9ubHkgYWxsb3dzIGEgdW5pb24gb2Ygb2JqZWN0cywgYWxsIG9mIHdoaWNoIG5lZWQgdG8gc2hhcmUgYSBkaXNjcmltaW5hdG9yIHByb3BlcnR5LiBUaGlzIHByb3BlcnR5IG11c3RcbiAgICAgKiBoYXZlIGEgZGlmZmVyZW50IHZhbHVlIGZvciBlYWNoIG9iamVjdCBpbiB0aGUgdW5pb24uXG4gICAgICogQHBhcmFtIGRpc2NyaW1pbmF0b3IgdGhlIG5hbWUgb2YgdGhlIGRpc2NyaW1pbmF0b3IgcHJvcGVydHlcbiAgICAgKiBAcGFyYW0gdHlwZXMgYW4gYXJyYXkgb2Ygb2JqZWN0IHNjaGVtYXNcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICovXG4gICAgc3RhdGljIGNyZWF0ZShkaXNjcmltaW5hdG9yLCBvcHRpb25zLCBwYXJhbXMpIHtcbiAgICAgICAgLy8gR2V0IGFsbCB0aGUgdmFsaWQgZGlzY3JpbWluYXRvciB2YWx1ZXNcbiAgICAgICAgY29uc3Qgb3B0aW9uc01hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgLy8gdHJ5IHtcbiAgICAgICAgZm9yIChjb25zdCB0eXBlIG9mIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGRpc2NyaW1pbmF0b3JWYWx1ZXMgPSBnZXREaXNjcmltaW5hdG9yKHR5cGUuc2hhcGVbZGlzY3JpbWluYXRvcl0pO1xuICAgICAgICAgICAgaWYgKCFkaXNjcmltaW5hdG9yVmFsdWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQSBkaXNjcmltaW5hdG9yIHZhbHVlIGZvciBrZXkgXFxgJHtkaXNjcmltaW5hdG9yfVxcYCBjb3VsZCBub3QgYmUgZXh0cmFjdGVkIGZyb20gYWxsIHNjaGVtYSBvcHRpb25zYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIGRpc2NyaW1pbmF0b3JWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9uc01hcC5oYXModmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRGlzY3JpbWluYXRvciBwcm9wZXJ0eSAke1N0cmluZyhkaXNjcmltaW5hdG9yKX0gaGFzIGR1cGxpY2F0ZSB2YWx1ZSAke1N0cmluZyh2YWx1ZSl9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9wdGlvbnNNYXAuc2V0KHZhbHVlLCB0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZERpc2NyaW1pbmF0ZWRVbmlvbih7XG4gICAgICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZERpc2NyaW1pbmF0ZWRVbmlvbixcbiAgICAgICAgICAgIGRpc2NyaW1pbmF0b3IsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgb3B0aW9uc01hcCxcbiAgICAgICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZnVuY3Rpb24gbWVyZ2VWYWx1ZXMoYSwgYikge1xuICAgIGNvbnN0IGFUeXBlID0gZ2V0UGFyc2VkVHlwZShhKTtcbiAgICBjb25zdCBiVHlwZSA9IGdldFBhcnNlZFR5cGUoYik7XG4gICAgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGRhdGE6IGEgfTtcbiAgICB9XG4gICAgZWxzZSBpZiAoYVR5cGUgPT09IFpvZFBhcnNlZFR5cGUub2JqZWN0ICYmIGJUeXBlID09PSBab2RQYXJzZWRUeXBlLm9iamVjdCkge1xuICAgICAgICBjb25zdCBiS2V5cyA9IHV0aWwub2JqZWN0S2V5cyhiKTtcbiAgICAgICAgY29uc3Qgc2hhcmVkS2V5cyA9IHV0aWwub2JqZWN0S2V5cyhhKS5maWx0ZXIoKGtleSkgPT4gYktleXMuaW5kZXhPZihrZXkpICE9PSAtMSk7XG4gICAgICAgIGNvbnN0IG5ld09iaiA9IHsgLi4uYSwgLi4uYiB9O1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBzaGFyZWRLZXlzKSB7XG4gICAgICAgICAgICBjb25zdCBzaGFyZWRWYWx1ZSA9IG1lcmdlVmFsdWVzKGFba2V5XSwgYltrZXldKTtcbiAgICAgICAgICAgIGlmICghc2hhcmVkVmFsdWUudmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ld09ialtrZXldID0gc2hhcmVkVmFsdWUuZGF0YTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyB2YWxpZDogdHJ1ZSwgZGF0YTogbmV3T2JqIH07XG4gICAgfVxuICAgIGVsc2UgaWYgKGFUeXBlID09PSBab2RQYXJzZWRUeXBlLmFycmF5ICYmIGJUeXBlID09PSBab2RQYXJzZWRUeXBlLmFycmF5KSB7XG4gICAgICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld0FycmF5ID0gW107XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBhLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgY29uc3QgaXRlbUEgPSBhW2luZGV4XTtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1CID0gYltpbmRleF07XG4gICAgICAgICAgICBjb25zdCBzaGFyZWRWYWx1ZSA9IG1lcmdlVmFsdWVzKGl0ZW1BLCBpdGVtQik7XG4gICAgICAgICAgICBpZiAoIXNoYXJlZFZhbHVlLnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdBcnJheS5wdXNoKHNoYXJlZFZhbHVlLmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHZhbGlkOiB0cnVlLCBkYXRhOiBuZXdBcnJheSB9O1xuICAgIH1cbiAgICBlbHNlIGlmIChhVHlwZSA9PT0gWm9kUGFyc2VkVHlwZS5kYXRlICYmIGJUeXBlID09PSBab2RQYXJzZWRUeXBlLmRhdGUgJiYgK2EgPT09ICtiKSB7XG4gICAgICAgIHJldHVybiB7IHZhbGlkOiB0cnVlLCBkYXRhOiBhIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UgfTtcbiAgICB9XG59XG5leHBvcnQgY2xhc3MgWm9kSW50ZXJzZWN0aW9uIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdHVzLCBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGNvbnN0IGhhbmRsZVBhcnNlZCA9IChwYXJzZWRMZWZ0LCBwYXJzZWRSaWdodCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlzQWJvcnRlZChwYXJzZWRMZWZ0KSB8fCBpc0Fib3J0ZWQocGFyc2VkUmlnaHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtZXJnZWQgPSBtZXJnZVZhbHVlcyhwYXJzZWRMZWZ0LnZhbHVlLCBwYXJzZWRSaWdodC52YWx1ZSk7XG4gICAgICAgICAgICBpZiAoIW1lcmdlZC52YWxpZCkge1xuICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9pbnRlcnNlY3Rpb25fdHlwZXMsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNEaXJ0eShwYXJzZWRMZWZ0KSB8fCBpc0RpcnR5KHBhcnNlZFJpZ2h0KSkge1xuICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBtZXJnZWQuZGF0YSB9O1xuICAgICAgICB9O1xuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgICAgICB0aGlzLl9kZWYubGVmdC5fcGFyc2VBc3luYyh7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgdGhpcy5fZGVmLnJpZ2h0Ll9wYXJzZUFzeW5jKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIF0pLnRoZW4oKFtsZWZ0LCByaWdodF0pID0+IGhhbmRsZVBhcnNlZChsZWZ0LCByaWdodCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZVBhcnNlZCh0aGlzLl9kZWYubGVmdC5fcGFyc2VTeW5jKHtcbiAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgICAgIH0pLCB0aGlzLl9kZWYucmlnaHQuX3BhcnNlU3luYyh7XG4gICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5ab2RJbnRlcnNlY3Rpb24uY3JlYXRlID0gKGxlZnQsIHJpZ2h0LCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZEludGVyc2VjdGlvbih7XG4gICAgICAgIGxlZnQ6IGxlZnQsXG4gICAgICAgIHJpZ2h0OiByaWdodCxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RJbnRlcnNlY3Rpb24sXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG4vLyB0eXBlIFpvZFR1cGxlSXRlbXMgPSBbWm9kVHlwZUFueSwgLi4uWm9kVHlwZUFueVtdXTtcbmV4cG9ydCBjbGFzcyBab2RUdXBsZSBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IHN0YXR1cywgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUuYXJyYXkpIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUuYXJyYXksXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3R4LmRhdGEubGVuZ3RoIDwgdGhpcy5fZGVmLml0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19zbWFsbCxcbiAgICAgICAgICAgICAgICBtaW5pbXVtOiB0aGlzLl9kZWYuaXRlbXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN0ID0gdGhpcy5fZGVmLnJlc3Q7XG4gICAgICAgIGlmICghcmVzdCAmJiBjdHguZGF0YS5sZW5ndGggPiB0aGlzLl9kZWYuaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX2JpZyxcbiAgICAgICAgICAgICAgICBtYXhpbXVtOiB0aGlzLl9kZWYuaXRlbXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpdGVtcyA9IFsuLi5jdHguZGF0YV1cbiAgICAgICAgICAgIC5tYXAoKGl0ZW0sIGl0ZW1JbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2NoZW1hID0gdGhpcy5fZGVmLml0ZW1zW2l0ZW1JbmRleF0gfHwgdGhpcy5fZGVmLnJlc3Q7XG4gICAgICAgICAgICBpZiAoIXNjaGVtYSlcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBzY2hlbWEuX3BhcnNlKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCBpdGVtLCBjdHgucGF0aCwgaXRlbUluZGV4KSk7XG4gICAgICAgIH0pXG4gICAgICAgICAgICAuZmlsdGVyKCh4KSA9PiAhIXgpOyAvLyBmaWx0ZXIgbnVsbHNcbiAgICAgICAgaWYgKGN0eC5jb21tb24uYXN5bmMpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChpdGVtcykudGhlbigocmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZUFycmF5KHN0YXR1cywgcmVzdWx0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZUFycmF5KHN0YXR1cywgaXRlbXMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGdldCBpdGVtcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pdGVtcztcbiAgICB9XG4gICAgcmVzdChyZXN0KSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kVHVwbGUoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgcmVzdCxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuWm9kVHVwbGUuY3JlYXRlID0gKHNjaGVtYXMsIHBhcmFtcykgPT4ge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShzY2hlbWFzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbXVzdCBwYXNzIGFuIGFycmF5IG9mIHNjaGVtYXMgdG8gei50dXBsZShbIC4uLiBdKVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBab2RUdXBsZSh7XG4gICAgICAgIGl0ZW1zOiBzY2hlbWFzLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFR1cGxlLFxuICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZFJlY29yZCBleHRlbmRzIFpvZFR5cGUge1xuICAgIGdldCBrZXlTY2hlbWEoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYua2V5VHlwZTtcbiAgICB9XG4gICAgZ2V0IHZhbHVlU2NoZW1hKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnZhbHVlVHlwZTtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdHVzLCBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGlmIChjdHgucGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5vYmplY3QpIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUub2JqZWN0LFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFpcnMgPSBbXTtcbiAgICAgICAgY29uc3Qga2V5VHlwZSA9IHRoaXMuX2RlZi5rZXlUeXBlO1xuICAgICAgICBjb25zdCB2YWx1ZVR5cGUgPSB0aGlzLl9kZWYudmFsdWVUeXBlO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBjdHguZGF0YSkge1xuICAgICAgICAgICAgcGFpcnMucHVzaCh7XG4gICAgICAgICAgICAgICAga2V5OiBrZXlUeXBlLl9wYXJzZShuZXcgUGFyc2VJbnB1dExhenlQYXRoKGN0eCwga2V5LCBjdHgucGF0aCwga2V5KSksXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlVHlwZS5fcGFyc2UobmV3IFBhcnNlSW5wdXRMYXp5UGF0aChjdHgsIGN0eC5kYXRhW2tleV0sIGN0eC5wYXRoLCBrZXkpKSxcbiAgICAgICAgICAgICAgICBhbHdheXNTZXQ6IGtleSBpbiBjdHguZGF0YSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jKSB7XG4gICAgICAgICAgICByZXR1cm4gUGFyc2VTdGF0dXMubWVyZ2VPYmplY3RBc3luYyhzdGF0dXMsIHBhaXJzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZU9iamVjdFN5bmMoc3RhdHVzLCBwYWlycyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ2V0IGVsZW1lbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYudmFsdWVUeXBlO1xuICAgIH1cbiAgICBzdGF0aWMgY3JlYXRlKGZpcnN0LCBzZWNvbmQsIHRoaXJkKSB7XG4gICAgICAgIGlmIChzZWNvbmQgaW5zdGFuY2VvZiBab2RUeXBlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFpvZFJlY29yZCh7XG4gICAgICAgICAgICAgICAga2V5VHlwZTogZmlyc3QsXG4gICAgICAgICAgICAgICAgdmFsdWVUeXBlOiBzZWNvbmQsXG4gICAgICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RSZWNvcmQsXG4gICAgICAgICAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyh0aGlyZCksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZFJlY29yZCh7XG4gICAgICAgICAgICBrZXlUeXBlOiBab2RTdHJpbmcuY3JlYXRlKCksXG4gICAgICAgICAgICB2YWx1ZVR5cGU6IGZpcnN0LFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RSZWNvcmQsXG4gICAgICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHNlY29uZCksXG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydCBjbGFzcyBab2RNYXAgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBnZXQga2V5U2NoZW1hKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmtleVR5cGU7XG4gICAgfVxuICAgIGdldCB2YWx1ZVNjaGVtYSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi52YWx1ZVR5cGU7XG4gICAgfVxuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IHN0YXR1cywgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUubWFwKSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLm1hcCxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGtleVR5cGUgPSB0aGlzLl9kZWYua2V5VHlwZTtcbiAgICAgICAgY29uc3QgdmFsdWVUeXBlID0gdGhpcy5fZGVmLnZhbHVlVHlwZTtcbiAgICAgICAgY29uc3QgcGFpcnMgPSBbLi4uY3R4LmRhdGEuZW50cmllcygpXS5tYXAoKFtrZXksIHZhbHVlXSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAga2V5OiBrZXlUeXBlLl9wYXJzZShuZXcgUGFyc2VJbnB1dExhenlQYXRoKGN0eCwga2V5LCBjdHgucGF0aCwgW2luZGV4LCBcImtleVwiXSkpLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVR5cGUuX3BhcnNlKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCB2YWx1ZSwgY3R4LnBhdGgsIFtpbmRleCwgXCJ2YWx1ZVwiXSkpLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jKSB7XG4gICAgICAgICAgICBjb25zdCBmaW5hbE1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBhaXIgb2YgcGFpcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYXdhaXQgcGFpci5rZXk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgcGFpci52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdGF0dXMgPT09IFwiYWJvcnRlZFwiIHx8IHZhbHVlLnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3RhdHVzID09PSBcImRpcnR5XCIgfHwgdmFsdWUuc3RhdHVzID09PSBcImRpcnR5XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZpbmFsTWFwLnNldChrZXkudmFsdWUsIHZhbHVlLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBmaW5hbE1hcCB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBmaW5hbE1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IHBhaXIua2V5O1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcGFpci52YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5LnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIgfHwgdmFsdWUuc3RhdHVzID09PSBcImFib3J0ZWRcIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGtleS5zdGF0dXMgPT09IFwiZGlydHlcIiB8fCB2YWx1ZS5zdGF0dXMgPT09IFwiZGlydHlcIikge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZmluYWxNYXAuc2V0KGtleS52YWx1ZSwgdmFsdWUudmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBmaW5hbE1hcCB9O1xuICAgICAgICB9XG4gICAgfVxufVxuWm9kTWFwLmNyZWF0ZSA9IChrZXlUeXBlLCB2YWx1ZVR5cGUsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kTWFwKHtcbiAgICAgICAgdmFsdWVUeXBlLFxuICAgICAgICBrZXlUeXBlLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE1hcCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RTZXQgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0dXMsIGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgaWYgKGN0eC5wYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLnNldCkge1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5zZXQsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkZWYgPSB0aGlzLl9kZWY7XG4gICAgICAgIGlmIChkZWYubWluU2l6ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGN0eC5kYXRhLnNpemUgPCBkZWYubWluU2l6ZS52YWx1ZSkge1xuICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX3NtYWxsLFxuICAgICAgICAgICAgICAgICAgICBtaW5pbXVtOiBkZWYubWluU2l6ZS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzZXRcIixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZi5taW5TaXplLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlZi5tYXhTaXplICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoY3R4LmRhdGEuc2l6ZSA+IGRlZi5tYXhTaXplLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fYmlnLFxuICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiBkZWYubWF4U2l6ZS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzZXRcIixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZi5tYXhTaXplLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdmFsdWVUeXBlID0gdGhpcy5fZGVmLnZhbHVlVHlwZTtcbiAgICAgICAgZnVuY3Rpb24gZmluYWxpemVTZXQoZWxlbWVudHMpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZFNldCA9IG5ldyBTZXQoKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnN0YXR1cyA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICBwYXJzZWRTZXQuYWRkKGVsZW1lbnQudmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBwYXJzZWRTZXQgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbGVtZW50cyA9IFsuLi5jdHguZGF0YS52YWx1ZXMoKV0ubWFwKChpdGVtLCBpKSA9PiB2YWx1ZVR5cGUuX3BhcnNlKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCBpdGVtLCBjdHgucGF0aCwgaSkpKTtcbiAgICAgICAgaWYgKGN0eC5jb21tb24uYXN5bmMpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChlbGVtZW50cykudGhlbigoZWxlbWVudHMpID0+IGZpbmFsaXplU2V0KGVsZW1lbnRzKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmluYWxpemVTZXQoZWxlbWVudHMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIG1pbihtaW5TaXplLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kU2V0KHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIG1pblNpemU6IHsgdmFsdWU6IG1pblNpemUsIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSB9LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbWF4KG1heFNpemUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RTZXQoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgbWF4U2l6ZTogeyB2YWx1ZTogbWF4U2l6ZSwgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzaXplKHNpemUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWluKHNpemUsIG1lc3NhZ2UpLm1heChzaXplLCBtZXNzYWdlKTtcbiAgICB9XG4gICAgbm9uZW1wdHkobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5taW4oMSwgbWVzc2FnZSk7XG4gICAgfVxufVxuWm9kU2V0LmNyZWF0ZSA9ICh2YWx1ZVR5cGUsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kU2V0KHtcbiAgICAgICAgdmFsdWVUeXBlLFxuICAgICAgICBtaW5TaXplOiBudWxsLFxuICAgICAgICBtYXhTaXplOiBudWxsLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFNldCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RGdW5jdGlvbiBleHRlbmRzIFpvZFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICB0aGlzLnZhbGlkYXRlID0gdGhpcy5pbXBsZW1lbnQ7XG4gICAgfVxuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgaWYgKGN0eC5wYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLmZ1bmN0aW9uKSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLmZ1bmN0aW9uLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gbWFrZUFyZ3NJc3N1ZShhcmdzLCBlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIG1ha2VJc3N1ZSh7XG4gICAgICAgICAgICAgICAgZGF0YTogYXJncyxcbiAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICBlcnJvck1hcHM6IFtjdHguY29tbW9uLmNvbnRleHR1YWxFcnJvck1hcCwgY3R4LnNjaGVtYUVycm9yTWFwLCBnZXRFcnJvck1hcCgpLCBkZWZhdWx0RXJyb3JNYXBdLmZpbHRlcigoeCkgPT4gISF4KSxcbiAgICAgICAgICAgICAgICBpc3N1ZURhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfYXJndW1lbnRzLFxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHNFcnJvcjogZXJyb3IsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIG1ha2VSZXR1cm5zSXNzdWUocmV0dXJucywgZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBtYWtlSXNzdWUoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHJldHVybnMsXG4gICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgZXJyb3JNYXBzOiBbY3R4LmNvbW1vbi5jb250ZXh0dWFsRXJyb3JNYXAsIGN0eC5zY2hlbWFFcnJvck1hcCwgZ2V0RXJyb3JNYXAoKSwgZGVmYXVsdEVycm9yTWFwXS5maWx0ZXIoKHgpID0+ICEheCksXG4gICAgICAgICAgICAgICAgaXNzdWVEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3JldHVybl90eXBlLFxuICAgICAgICAgICAgICAgICAgICByZXR1cm5UeXBlRXJyb3I6IGVycm9yLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYXJhbXMgPSB7IGVycm9yTWFwOiBjdHguY29tbW9uLmNvbnRleHR1YWxFcnJvck1hcCB9O1xuICAgICAgICBjb25zdCBmbiA9IGN0eC5kYXRhO1xuICAgICAgICBpZiAodGhpcy5fZGVmLnJldHVybnMgaW5zdGFuY2VvZiBab2RQcm9taXNlKSB7XG4gICAgICAgICAgICAvLyBXb3VsZCBsb3ZlIGEgd2F5IHRvIGF2b2lkIGRpc2FibGluZyB0aGlzIHJ1bGUsIGJ1dCB3ZSBuZWVkXG4gICAgICAgICAgICAvLyBhbiBhbGlhcyAodXNpbmcgYW4gYXJyb3cgZnVuY3Rpb24gd2FzIHdoYXQgY2F1c2VkIDI2NTEpLlxuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICBjb25zdCBtZSA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gT0soYXN5bmMgZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBab2RFcnJvcihbXSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkQXJncyA9IGF3YWl0IG1lLl9kZWYuYXJncy5wYXJzZUFzeW5jKGFyZ3MsIHBhcmFtcykuY2F0Y2goKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IuYWRkSXNzdWUobWFrZUFyZ3NJc3N1ZShhcmdzLCBlKSk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IFJlZmxlY3QuYXBwbHkoZm4sIHRoaXMsIHBhcnNlZEFyZ3MpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcnNlZFJldHVybnMgPSBhd2FpdCBtZS5fZGVmLnJldHVybnMuX2RlZi50eXBlXG4gICAgICAgICAgICAgICAgICAgIC5wYXJzZUFzeW5jKHJlc3VsdCwgcGFyYW1zKVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IuYWRkSXNzdWUobWFrZVJldHVybnNJc3N1ZShyZXN1bHQsIGUpKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlZFJldHVybnM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIFdvdWxkIGxvdmUgYSB3YXkgdG8gYXZvaWQgZGlzYWJsaW5nIHRoaXMgcnVsZSwgYnV0IHdlIG5lZWRcbiAgICAgICAgICAgIC8vIGFuIGFsaWFzICh1c2luZyBhbiBhcnJvdyBmdW5jdGlvbiB3YXMgd2hhdCBjYXVzZWQgMjY1MSkuXG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgIGNvbnN0IG1lID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiBPSyhmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcnNlZEFyZ3MgPSBtZS5fZGVmLmFyZ3Muc2FmZVBhcnNlKGFyZ3MsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgaWYgKCFwYXJzZWRBcmdzLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFpvZEVycm9yKFttYWtlQXJnc0lzc3VlKGFyZ3MsIHBhcnNlZEFyZ3MuZXJyb3IpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuYXBwbHkoZm4sIHRoaXMsIHBhcnNlZEFyZ3MuZGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkUmV0dXJucyA9IG1lLl9kZWYucmV0dXJucy5zYWZlUGFyc2UocmVzdWx0LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIGlmICghcGFyc2VkUmV0dXJucy5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBab2RFcnJvcihbbWFrZVJldHVybnNJc3N1ZShyZXN1bHQsIHBhcnNlZFJldHVybnMuZXJyb3IpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZWRSZXR1cm5zLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwYXJhbWV0ZXJzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmFyZ3M7XG4gICAgfVxuICAgIHJldHVyblR5cGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYucmV0dXJucztcbiAgICB9XG4gICAgYXJncyguLi5pdGVtcykge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEZ1bmN0aW9uKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGFyZ3M6IFpvZFR1cGxlLmNyZWF0ZShpdGVtcykucmVzdChab2RVbmtub3duLmNyZWF0ZSgpKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybnMocmV0dXJuVHlwZSkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEZ1bmN0aW9uKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIHJldHVybnM6IHJldHVyblR5cGUsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpbXBsZW1lbnQoZnVuYykge1xuICAgICAgICBjb25zdCB2YWxpZGF0ZWRGdW5jID0gdGhpcy5wYXJzZShmdW5jKTtcbiAgICAgICAgcmV0dXJuIHZhbGlkYXRlZEZ1bmM7XG4gICAgfVxuICAgIHN0cmljdEltcGxlbWVudChmdW5jKSB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRlZEZ1bmMgPSB0aGlzLnBhcnNlKGZ1bmMpO1xuICAgICAgICByZXR1cm4gdmFsaWRhdGVkRnVuYztcbiAgICB9XG4gICAgc3RhdGljIGNyZWF0ZShhcmdzLCByZXR1cm5zLCBwYXJhbXMpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RGdW5jdGlvbih7XG4gICAgICAgICAgICBhcmdzOiAoYXJncyA/IGFyZ3MgOiBab2RUdXBsZS5jcmVhdGUoW10pLnJlc3QoWm9kVW5rbm93bi5jcmVhdGUoKSkpLFxuICAgICAgICAgICAgcmV0dXJuczogcmV0dXJucyB8fCBab2RVbmtub3duLmNyZWF0ZSgpLFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RGdW5jdGlvbixcbiAgICAgICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0IGNsYXNzIFpvZExhenkgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBnZXQgc2NoZW1hKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmdldHRlcigpO1xuICAgIH1cbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGNvbnN0IGxhenlTY2hlbWEgPSB0aGlzLl9kZWYuZ2V0dGVyKCk7XG4gICAgICAgIHJldHVybiBsYXp5U2NoZW1hLl9wYXJzZSh7IGRhdGE6IGN0eC5kYXRhLCBwYXRoOiBjdHgucGF0aCwgcGFyZW50OiBjdHggfSk7XG4gICAgfVxufVxuWm9kTGF6eS5jcmVhdGUgPSAoZ2V0dGVyLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZExhenkoe1xuICAgICAgICBnZXR0ZXI6IGdldHRlcixcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RMYXp5LFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZExpdGVyYWwgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgaWYgKGlucHV0LmRhdGEgIT09IHRoaXMuX2RlZi52YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX2xpdGVyYWwsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IHRoaXMuX2RlZi52YWx1ZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBcInZhbGlkXCIsIHZhbHVlOiBpbnB1dC5kYXRhIH07XG4gICAgfVxuICAgIGdldCB2YWx1ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi52YWx1ZTtcbiAgICB9XG59XG5ab2RMaXRlcmFsLmNyZWF0ZSA9ICh2YWx1ZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RMaXRlcmFsKHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZExpdGVyYWwsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5mdW5jdGlvbiBjcmVhdGVab2RFbnVtKHZhbHVlcywgcGFyYW1zKSB7XG4gICAgcmV0dXJuIG5ldyBab2RFbnVtKHtcbiAgICAgICAgdmFsdWVzLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEVudW0sXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn1cbmV4cG9ydCBjbGFzcyBab2RFbnVtIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQuZGF0YSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRWYWx1ZXMgPSB0aGlzLl9kZWYudmFsdWVzO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IHV0aWwuam9pblZhbHVlcyhleHBlY3RlZFZhbHVlcyksXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5fY2FjaGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhY2hlID0gbmV3IFNldCh0aGlzLl9kZWYudmFsdWVzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX2NhY2hlLmhhcyhpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRWYWx1ZXMgPSB0aGlzLl9kZWYudmFsdWVzO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX2VudW1fdmFsdWUsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogZXhwZWN0ZWRWYWx1ZXMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBPSyhpbnB1dC5kYXRhKTtcbiAgICB9XG4gICAgZ2V0IG9wdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYudmFsdWVzO1xuICAgIH1cbiAgICBnZXQgZW51bSgpIHtcbiAgICAgICAgY29uc3QgZW51bVZhbHVlcyA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IHZhbCBvZiB0aGlzLl9kZWYudmFsdWVzKSB7XG4gICAgICAgICAgICBlbnVtVmFsdWVzW3ZhbF0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVudW1WYWx1ZXM7XG4gICAgfVxuICAgIGdldCBWYWx1ZXMoKSB7XG4gICAgICAgIGNvbnN0IGVudW1WYWx1ZXMgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCB2YWwgb2YgdGhpcy5fZGVmLnZhbHVlcykge1xuICAgICAgICAgICAgZW51bVZhbHVlc1t2YWxdID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbnVtVmFsdWVzO1xuICAgIH1cbiAgICBnZXQgRW51bSgpIHtcbiAgICAgICAgY29uc3QgZW51bVZhbHVlcyA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IHZhbCBvZiB0aGlzLl9kZWYudmFsdWVzKSB7XG4gICAgICAgICAgICBlbnVtVmFsdWVzW3ZhbF0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVudW1WYWx1ZXM7XG4gICAgfVxuICAgIGV4dHJhY3QodmFsdWVzLCBuZXdEZWYgPSB0aGlzLl9kZWYpIHtcbiAgICAgICAgcmV0dXJuIFpvZEVudW0uY3JlYXRlKHZhbHVlcywge1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgLi4ubmV3RGVmLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZXhjbHVkZSh2YWx1ZXMsIG5ld0RlZiA9IHRoaXMuX2RlZikge1xuICAgICAgICByZXR1cm4gWm9kRW51bS5jcmVhdGUodGhpcy5vcHRpb25zLmZpbHRlcigob3B0KSA9PiAhdmFsdWVzLmluY2x1ZGVzKG9wdCkpLCB7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICAuLi5uZXdEZWYsXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblpvZEVudW0uY3JlYXRlID0gY3JlYXRlWm9kRW51bTtcbmV4cG9ydCBjbGFzcyBab2ROYXRpdmVFbnVtIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IG5hdGl2ZUVudW1WYWx1ZXMgPSB1dGlsLmdldFZhbGlkRW51bVZhbHVlcyh0aGlzLl9kZWYudmFsdWVzKTtcbiAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUuc3RyaW5nICYmIGN0eC5wYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLm51bWJlcikge1xuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRWYWx1ZXMgPSB1dGlsLm9iamVjdFZhbHVlcyhuYXRpdmVFbnVtVmFsdWVzKTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiB1dGlsLmpvaW5WYWx1ZXMoZXhwZWN0ZWRWYWx1ZXMpLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX2NhY2hlKSB7XG4gICAgICAgICAgICB0aGlzLl9jYWNoZSA9IG5ldyBTZXQodXRpbC5nZXRWYWxpZEVudW1WYWx1ZXModGhpcy5fZGVmLnZhbHVlcykpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5fY2FjaGUuaGFzKGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICBjb25zdCBleHBlY3RlZFZhbHVlcyA9IHV0aWwub2JqZWN0VmFsdWVzKG5hdGl2ZUVudW1WYWx1ZXMpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX2VudW1fdmFsdWUsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogZXhwZWN0ZWRWYWx1ZXMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBPSyhpbnB1dC5kYXRhKTtcbiAgICB9XG4gICAgZ2V0IGVudW0oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYudmFsdWVzO1xuICAgIH1cbn1cblpvZE5hdGl2ZUVudW0uY3JlYXRlID0gKHZhbHVlcywgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2ROYXRpdmVFbnVtKHtcbiAgICAgICAgdmFsdWVzOiB2YWx1ZXMsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kTmF0aXZlRW51bSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RQcm9taXNlIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgdW53cmFwKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnR5cGU7XG4gICAgfVxuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgaWYgKGN0eC5wYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLnByb21pc2UgJiYgY3R4LmNvbW1vbi5hc3luYyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUucHJvbWlzZSxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByb21pc2lmaWVkID0gY3R4LnBhcnNlZFR5cGUgPT09IFpvZFBhcnNlZFR5cGUucHJvbWlzZSA/IGN0eC5kYXRhIDogUHJvbWlzZS5yZXNvbHZlKGN0eC5kYXRhKTtcbiAgICAgICAgcmV0dXJuIE9LKHByb21pc2lmaWVkLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9kZWYudHlwZS5wYXJzZUFzeW5jKGRhdGEsIHtcbiAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICBlcnJvck1hcDogY3R4LmNvbW1vbi5jb250ZXh0dWFsRXJyb3JNYXAsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgIH1cbn1cblpvZFByb21pc2UuY3JlYXRlID0gKHNjaGVtYSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RQcm9taXNlKHtcbiAgICAgICAgdHlwZTogc2NoZW1hLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFByb21pc2UsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kRWZmZWN0cyBleHRlbmRzIFpvZFR5cGUge1xuICAgIGlubmVyVHlwZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5zY2hlbWE7XG4gICAgfVxuICAgIHNvdXJjZVR5cGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYuc2NoZW1hLl9kZWYudHlwZU5hbWUgPT09IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RFZmZlY3RzXG4gICAgICAgICAgICA/IHRoaXMuX2RlZi5zY2hlbWEuc291cmNlVHlwZSgpXG4gICAgICAgICAgICA6IHRoaXMuX2RlZi5zY2hlbWE7XG4gICAgfVxuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IHN0YXR1cywgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBjb25zdCBlZmZlY3QgPSB0aGlzLl9kZWYuZWZmZWN0IHx8IG51bGw7XG4gICAgICAgIGNvbnN0IGNoZWNrQ3R4ID0ge1xuICAgICAgICAgICAgYWRkSXNzdWU6IChhcmcpID0+IHtcbiAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIGFyZyk7XG4gICAgICAgICAgICAgICAgaWYgKGFyZy5mYXRhbCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQgcGF0aCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3R4LnBhdGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICBjaGVja0N0eC5hZGRJc3N1ZSA9IGNoZWNrQ3R4LmFkZElzc3VlLmJpbmQoY2hlY2tDdHgpO1xuICAgICAgICBpZiAoZWZmZWN0LnR5cGUgPT09IFwicHJlcHJvY2Vzc1wiKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzZWQgPSBlZmZlY3QudHJhbnNmb3JtKGN0eC5kYXRhLCBjaGVja0N0eCk7XG4gICAgICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocHJvY2Vzc2VkKS50aGVuKGFzeW5jIChwcm9jZXNzZWQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cy52YWx1ZSA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5fZGVmLnNjaGVtYS5fcGFyc2VBc3luYyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBwcm9jZXNzZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSBcImRpcnR5XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRElSVFkocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cy52YWx1ZSA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIERJUlRZKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzLnZhbHVlID09PSBcImFib3J0ZWRcIilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fZGVmLnNjaGVtYS5fcGFyc2VTeW5jKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogcHJvY2Vzc2VkLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRElSVFkocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzLnZhbHVlID09PSBcImRpcnR5XCIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBESVJUWShyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVmZmVjdC50eXBlID09PSBcInJlZmluZW1lbnRcIikge1xuICAgICAgICAgICAgY29uc3QgZXhlY3V0ZVJlZmluZW1lbnQgPSAoYWNjKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZWZmZWN0LnJlZmluZW1lbnQoYWNjLCBjaGVja0N0eCk7XG4gICAgICAgICAgICAgICAgaWYgKGN0eC5jb21tb24uYXN5bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBc3luYyByZWZpbmVtZW50IGVuY291bnRlcmVkIGR1cmluZyBzeW5jaHJvbm91cyBwYXJzZSBvcGVyYXRpb24uIFVzZSAucGFyc2VBc3luYyBpbnN0ZWFkLlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbm5lciA9IHRoaXMuX2RlZi5zY2hlbWEuX3BhcnNlU3luYyh7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKGlubmVyLnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgICAgIGlmIChpbm5lci5zdGF0dXMgPT09IFwiZGlydHlcIilcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIHZhbHVlIGlzIGlnbm9yZWRcbiAgICAgICAgICAgICAgICBleGVjdXRlUmVmaW5lbWVudChpbm5lci52YWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBpbm5lci52YWx1ZSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5zY2hlbWEuX3BhcnNlQXN5bmMoeyBkYXRhOiBjdHguZGF0YSwgcGF0aDogY3R4LnBhdGgsIHBhcmVudDogY3R4IH0pLnRoZW4oKGlubmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbm5lci5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbm5lci5zdGF0dXMgPT09IFwiZGlydHlcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXhlY3V0ZVJlZmluZW1lbnQoaW5uZXIudmFsdWUpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBpbm5lci52YWx1ZSB9O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZWZmZWN0LnR5cGUgPT09IFwidHJhbnNmb3JtXCIpIHtcbiAgICAgICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhc2UgPSB0aGlzLl9kZWYuc2NoZW1hLl9wYXJzZVN5bmMoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICghaXNWYWxpZChiYXNlKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZWZmZWN0LnRyYW5zZm9ybShiYXNlLnZhbHVlLCBjaGVja0N0eCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3luY2hyb25vdXMgdHJhbnNmb3JtIGVuY291bnRlcmVkIGR1cmluZyBzeW5jaHJvbm91cyBwYXJzZSBvcGVyYXRpb24uIFVzZSAucGFyc2VBc3luYyBpbnN0ZWFkLmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IHJlc3VsdCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5zY2hlbWEuX3BhcnNlQXN5bmMoeyBkYXRhOiBjdHguZGF0YSwgcGF0aDogY3R4LnBhdGgsIHBhcmVudDogY3R4IH0pLnRoZW4oKGJhc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc1ZhbGlkKGJhc2UpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZWZmZWN0LnRyYW5zZm9ybShiYXNlLnZhbHVlLCBjaGVja0N0eCkpLnRoZW4oKHJlc3VsdCkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1czogc3RhdHVzLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHV0aWwuYXNzZXJ0TmV2ZXIoZWZmZWN0KTtcbiAgICB9XG59XG5ab2RFZmZlY3RzLmNyZWF0ZSA9IChzY2hlbWEsIGVmZmVjdCwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RFZmZlY3RzKHtcbiAgICAgICAgc2NoZW1hLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEVmZmVjdHMsXG4gICAgICAgIGVmZmVjdCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcblpvZEVmZmVjdHMuY3JlYXRlV2l0aFByZXByb2Nlc3MgPSAocHJlcHJvY2Vzcywgc2NoZW1hLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZEVmZmVjdHMoe1xuICAgICAgICBzY2hlbWEsXG4gICAgICAgIGVmZmVjdDogeyB0eXBlOiBcInByZXByb2Nlc3NcIiwgdHJhbnNmb3JtOiBwcmVwcm9jZXNzIH0sXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kRWZmZWN0cyxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCB7IFpvZEVmZmVjdHMgYXMgWm9kVHJhbnNmb3JtZXIgfTtcbmV4cG9ydCBjbGFzcyBab2RPcHRpb25hbCBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlID09PSBab2RQYXJzZWRUeXBlLnVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIE9LKHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pbm5lclR5cGUuX3BhcnNlKGlucHV0KTtcbiAgICB9XG4gICAgdW53cmFwKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmlubmVyVHlwZTtcbiAgICB9XG59XG5ab2RPcHRpb25hbC5jcmVhdGUgPSAodHlwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RPcHRpb25hbCh7XG4gICAgICAgIGlubmVyVHlwZTogdHlwZSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RPcHRpb25hbCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2ROdWxsYWJsZSBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlID09PSBab2RQYXJzZWRUeXBlLm51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBPSyhudWxsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmlubmVyVHlwZS5fcGFyc2UoaW5wdXQpO1xuICAgIH1cbiAgICB1bndyYXAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYuaW5uZXJUeXBlO1xuICAgIH1cbn1cblpvZE51bGxhYmxlLmNyZWF0ZSA9ICh0eXBlLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE51bGxhYmxlKHtcbiAgICAgICAgaW5uZXJUeXBlOiB0eXBlLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE51bGxhYmxlLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZERlZmF1bHQgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGxldCBkYXRhID0gY3R4LmRhdGE7XG4gICAgICAgIGlmIChjdHgucGFyc2VkVHlwZSA9PT0gWm9kUGFyc2VkVHlwZS51bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRhdGEgPSB0aGlzLl9kZWYuZGVmYXVsdFZhbHVlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pbm5lclR5cGUuX3BhcnNlKHtcbiAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVtb3ZlRGVmYXVsdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pbm5lclR5cGU7XG4gICAgfVxufVxuWm9kRGVmYXVsdC5jcmVhdGUgPSAodHlwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2REZWZhdWx0KHtcbiAgICAgICAgaW5uZXJUeXBlOiB0eXBlLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZERlZmF1bHQsXG4gICAgICAgIGRlZmF1bHRWYWx1ZTogdHlwZW9mIHBhcmFtcy5kZWZhdWx0ID09PSBcImZ1bmN0aW9uXCIgPyBwYXJhbXMuZGVmYXVsdCA6ICgpID0+IHBhcmFtcy5kZWZhdWx0LFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZENhdGNoIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICAvLyBuZXdDdHggaXMgdXNlZCB0byBub3QgY29sbGVjdCBpc3N1ZXMgZnJvbSBpbm5lciB0eXBlcyBpbiBjdHhcbiAgICAgICAgY29uc3QgbmV3Q3R4ID0ge1xuICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgY29tbW9uOiB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LmNvbW1vbixcbiAgICAgICAgICAgICAgICBpc3N1ZXM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fZGVmLmlubmVyVHlwZS5fcGFyc2Uoe1xuICAgICAgICAgICAgZGF0YTogbmV3Q3R4LmRhdGEsXG4gICAgICAgICAgICBwYXRoOiBuZXdDdHgucGF0aCxcbiAgICAgICAgICAgIHBhcmVudDoge1xuICAgICAgICAgICAgICAgIC4uLm5ld0N0eCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaXNBc3luYyhyZXN1bHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0LnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1czogXCJ2YWxpZFwiLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcmVzdWx0LnN0YXR1cyA9PT0gXCJ2YWxpZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHJlc3VsdC52YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgOiB0aGlzLl9kZWYuY2F0Y2hWYWx1ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0IGVycm9yKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFpvZEVycm9yKG5ld0N0eC5jb21tb24uaXNzdWVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0OiBuZXdDdHguZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3RhdHVzOiBcInZhbGlkXCIsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHJlc3VsdC5zdGF0dXMgPT09IFwidmFsaWRcIlxuICAgICAgICAgICAgICAgICAgICA/IHJlc3VsdC52YWx1ZVxuICAgICAgICAgICAgICAgICAgICA6IHRoaXMuX2RlZi5jYXRjaFZhbHVlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldCBlcnJvcigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFpvZEVycm9yKG5ld0N0eC5jb21tb24uaXNzdWVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dDogbmV3Q3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZW1vdmVDYXRjaCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pbm5lclR5cGU7XG4gICAgfVxufVxuWm9kQ2F0Y2guY3JlYXRlID0gKHR5cGUsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kQ2F0Y2goe1xuICAgICAgICBpbm5lclR5cGU6IHR5cGUsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kQ2F0Y2gsXG4gICAgICAgIGNhdGNoVmFsdWU6IHR5cGVvZiBwYXJhbXMuY2F0Y2ggPT09IFwiZnVuY3Rpb25cIiA/IHBhcmFtcy5jYXRjaCA6ICgpID0+IHBhcmFtcy5jYXRjaCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2ROYU4gZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5uYW4pIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUubmFuLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBcInZhbGlkXCIsIHZhbHVlOiBpbnB1dC5kYXRhIH07XG4gICAgfVxufVxuWm9kTmFOLmNyZWF0ZSA9IChwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE5hTih7XG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kTmFOLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNvbnN0IEJSQU5EID0gU3ltYm9sKFwiem9kX2JyYW5kXCIpO1xuZXhwb3J0IGNsYXNzIFpvZEJyYW5kZWQgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBjdHguZGF0YTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi50eXBlLl9wYXJzZSh7XG4gICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHVud3JhcCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi50eXBlO1xuICAgIH1cbn1cbmV4cG9ydCBjbGFzcyBab2RQaXBlbGluZSBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IHN0YXR1cywgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgY29uc3QgaGFuZGxlQXN5bmMgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5SZXN1bHQgPSBhd2FpdCB0aGlzLl9kZWYuaW4uX3BhcnNlQXN5bmMoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChpblJlc3VsdC5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICBpZiAoaW5SZXN1bHQuc3RhdHVzID09PSBcImRpcnR5XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBESVJUWShpblJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZGVmLm91dC5fcGFyc2VBc3luYyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBpblJlc3VsdC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlQXN5bmMoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGluUmVzdWx0ID0gdGhpcy5fZGVmLmluLl9wYXJzZVN5bmMoe1xuICAgICAgICAgICAgICAgIGRhdGE6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoaW5SZXN1bHQuc3RhdHVzID09PSBcImFib3J0ZWRcIilcbiAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgIGlmIChpblJlc3VsdC5zdGF0dXMgPT09IFwiZGlydHlcIikge1xuICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1czogXCJkaXJ0eVwiLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaW5SZXN1bHQudmFsdWUsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9kZWYub3V0Ll9wYXJzZVN5bmMoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBpblJlc3VsdC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHN0YXRpYyBjcmVhdGUoYSwgYikge1xuICAgICAgICByZXR1cm4gbmV3IFpvZFBpcGVsaW5lKHtcbiAgICAgICAgICAgIGluOiBhLFxuICAgICAgICAgICAgb3V0OiBiLFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RQaXBlbGluZSxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0IGNsYXNzIFpvZFJlYWRvbmx5IGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2RlZi5pbm5lclR5cGUuX3BhcnNlKGlucHV0KTtcbiAgICAgICAgY29uc3QgZnJlZXplID0gKGRhdGEpID0+IHtcbiAgICAgICAgICAgIGlmIChpc1ZhbGlkKGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgZGF0YS52YWx1ZSA9IE9iamVjdC5mcmVlemUoZGF0YS52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGlzQXN5bmMocmVzdWx0KSA/IHJlc3VsdC50aGVuKChkYXRhKSA9PiBmcmVlemUoZGF0YSkpIDogZnJlZXplKHJlc3VsdCk7XG4gICAgfVxuICAgIHVud3JhcCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pbm5lclR5cGU7XG4gICAgfVxufVxuWm9kUmVhZG9ubHkuY3JlYXRlID0gKHR5cGUsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kUmVhZG9ubHkoe1xuICAgICAgICBpbm5lclR5cGU6IHR5cGUsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kUmVhZG9ubHksXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vICAgICAgICAgICAgICAgICAgICAvLy8vLy8vLy8vXG4vLy8vLy8vLy8vICAgICAgei5jdXN0b20gICAgICAvLy8vLy8vLy8vXG4vLy8vLy8vLy8vICAgICAgICAgICAgICAgICAgICAvLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5mdW5jdGlvbiBjbGVhblBhcmFtcyhwYXJhbXMsIGRhdGEpIHtcbiAgICBjb25zdCBwID0gdHlwZW9mIHBhcmFtcyA9PT0gXCJmdW5jdGlvblwiID8gcGFyYW1zKGRhdGEpIDogdHlwZW9mIHBhcmFtcyA9PT0gXCJzdHJpbmdcIiA/IHsgbWVzc2FnZTogcGFyYW1zIH0gOiBwYXJhbXM7XG4gICAgY29uc3QgcDIgPSB0eXBlb2YgcCA9PT0gXCJzdHJpbmdcIiA/IHsgbWVzc2FnZTogcCB9IDogcDtcbiAgICByZXR1cm4gcDI7XG59XG5leHBvcnQgZnVuY3Rpb24gY3VzdG9tKGNoZWNrLCBfcGFyYW1zID0ge30sIFxuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICpcbiAqIFBhc3MgYGZhdGFsYCBpbnRvIHRoZSBwYXJhbXMgb2JqZWN0IGluc3RlYWQ6XG4gKlxuICogYGBgdHNcbiAqIHouc3RyaW5nKCkuY3VzdG9tKCh2YWwpID0+IHZhbC5sZW5ndGggPiA1LCB7IGZhdGFsOiBmYWxzZSB9KVxuICogYGBgXG4gKlxuICovXG5mYXRhbCkge1xuICAgIGlmIChjaGVjaylcbiAgICAgICAgcmV0dXJuIFpvZEFueS5jcmVhdGUoKS5zdXBlclJlZmluZSgoZGF0YSwgY3R4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCByID0gY2hlY2soZGF0YSk7XG4gICAgICAgICAgICBpZiAociBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gci50aGVuKChyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gY2xlYW5QYXJhbXMoX3BhcmFtcywgZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBfZmF0YWwgPSBwYXJhbXMuZmF0YWwgPz8gZmF0YWwgPz8gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5hZGRJc3N1ZSh7IGNvZGU6IFwiY3VzdG9tXCIsIC4uLnBhcmFtcywgZmF0YWw6IF9mYXRhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gY2xlYW5QYXJhbXMoX3BhcmFtcywgZGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc3QgX2ZhdGFsID0gcGFyYW1zLmZhdGFsID8/IGZhdGFsID8/IHRydWU7XG4gICAgICAgICAgICAgICAgY3R4LmFkZElzc3VlKHsgY29kZTogXCJjdXN0b21cIiwgLi4ucGFyYW1zLCBmYXRhbDogX2ZhdGFsIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gWm9kQW55LmNyZWF0ZSgpO1xufVxuZXhwb3J0IHsgWm9kVHlwZSBhcyBTY2hlbWEsIFpvZFR5cGUgYXMgWm9kU2NoZW1hIH07XG5leHBvcnQgY29uc3QgbGF0ZSA9IHtcbiAgICBvYmplY3Q6IFpvZE9iamVjdC5sYXp5Y3JlYXRlLFxufTtcbmV4cG9ydCB2YXIgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kO1xuKGZ1bmN0aW9uIChab2RGaXJzdFBhcnR5VHlwZUtpbmQpIHtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RTdHJpbmdcIl0gPSBcIlpvZFN0cmluZ1wiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZE51bWJlclwiXSA9IFwiWm9kTnVtYmVyXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kTmFOXCJdID0gXCJab2ROYU5cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RCaWdJbnRcIl0gPSBcIlpvZEJpZ0ludFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZEJvb2xlYW5cIl0gPSBcIlpvZEJvb2xlYW5cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2REYXRlXCJdID0gXCJab2REYXRlXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kU3ltYm9sXCJdID0gXCJab2RTeW1ib2xcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RVbmRlZmluZWRcIl0gPSBcIlpvZFVuZGVmaW5lZFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZE51bGxcIl0gPSBcIlpvZE51bGxcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RBbnlcIl0gPSBcIlpvZEFueVwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZFVua25vd25cIl0gPSBcIlpvZFVua25vd25cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2ROZXZlclwiXSA9IFwiWm9kTmV2ZXJcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RWb2lkXCJdID0gXCJab2RWb2lkXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kQXJyYXlcIl0gPSBcIlpvZEFycmF5XCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kT2JqZWN0XCJdID0gXCJab2RPYmplY3RcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RVbmlvblwiXSA9IFwiWm9kVW5pb25cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2REaXNjcmltaW5hdGVkVW5pb25cIl0gPSBcIlpvZERpc2NyaW1pbmF0ZWRVbmlvblwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZEludGVyc2VjdGlvblwiXSA9IFwiWm9kSW50ZXJzZWN0aW9uXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kVHVwbGVcIl0gPSBcIlpvZFR1cGxlXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kUmVjb3JkXCJdID0gXCJab2RSZWNvcmRcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RNYXBcIl0gPSBcIlpvZE1hcFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZFNldFwiXSA9IFwiWm9kU2V0XCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kRnVuY3Rpb25cIl0gPSBcIlpvZEZ1bmN0aW9uXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kTGF6eVwiXSA9IFwiWm9kTGF6eVwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZExpdGVyYWxcIl0gPSBcIlpvZExpdGVyYWxcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RFbnVtXCJdID0gXCJab2RFbnVtXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kRWZmZWN0c1wiXSA9IFwiWm9kRWZmZWN0c1wiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZE5hdGl2ZUVudW1cIl0gPSBcIlpvZE5hdGl2ZUVudW1cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RPcHRpb25hbFwiXSA9IFwiWm9kT3B0aW9uYWxcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2ROdWxsYWJsZVwiXSA9IFwiWm9kTnVsbGFibGVcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2REZWZhdWx0XCJdID0gXCJab2REZWZhdWx0XCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kQ2F0Y2hcIl0gPSBcIlpvZENhdGNoXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kUHJvbWlzZVwiXSA9IFwiWm9kUHJvbWlzZVwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZEJyYW5kZWRcIl0gPSBcIlpvZEJyYW5kZWRcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RQaXBlbGluZVwiXSA9IFwiWm9kUGlwZWxpbmVcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RSZWFkb25seVwiXSA9IFwiWm9kUmVhZG9ubHlcIjtcbn0pKFpvZEZpcnN0UGFydHlUeXBlS2luZCB8fCAoWm9kRmlyc3RQYXJ0eVR5cGVLaW5kID0ge30pKTtcbi8vIHJlcXVpcmVzIFRTIDQuNCtcbmNsYXNzIENsYXNzIHtcbiAgICBjb25zdHJ1Y3RvciguLi5fKSB7IH1cbn1cbmNvbnN0IGluc3RhbmNlT2ZUeXBlID0gKFxuLy8gY29uc3QgaW5zdGFuY2VPZlR5cGUgPSA8VCBleHRlbmRzIG5ldyAoLi4uYXJnczogYW55W10pID0+IGFueT4oXG5jbHMsIHBhcmFtcyA9IHtcbiAgICBtZXNzYWdlOiBgSW5wdXQgbm90IGluc3RhbmNlIG9mICR7Y2xzLm5hbWV9YCxcbn0pID0+IGN1c3RvbSgoZGF0YSkgPT4gZGF0YSBpbnN0YW5jZW9mIGNscywgcGFyYW1zKTtcbmNvbnN0IHN0cmluZ1R5cGUgPSBab2RTdHJpbmcuY3JlYXRlO1xuY29uc3QgbnVtYmVyVHlwZSA9IFpvZE51bWJlci5jcmVhdGU7XG5jb25zdCBuYW5UeXBlID0gWm9kTmFOLmNyZWF0ZTtcbmNvbnN0IGJpZ0ludFR5cGUgPSBab2RCaWdJbnQuY3JlYXRlO1xuY29uc3QgYm9vbGVhblR5cGUgPSBab2RCb29sZWFuLmNyZWF0ZTtcbmNvbnN0IGRhdGVUeXBlID0gWm9kRGF0ZS5jcmVhdGU7XG5jb25zdCBzeW1ib2xUeXBlID0gWm9kU3ltYm9sLmNyZWF0ZTtcbmNvbnN0IHVuZGVmaW5lZFR5cGUgPSBab2RVbmRlZmluZWQuY3JlYXRlO1xuY29uc3QgbnVsbFR5cGUgPSBab2ROdWxsLmNyZWF0ZTtcbmNvbnN0IGFueVR5cGUgPSBab2RBbnkuY3JlYXRlO1xuY29uc3QgdW5rbm93blR5cGUgPSBab2RVbmtub3duLmNyZWF0ZTtcbmNvbnN0IG5ldmVyVHlwZSA9IFpvZE5ldmVyLmNyZWF0ZTtcbmNvbnN0IHZvaWRUeXBlID0gWm9kVm9pZC5jcmVhdGU7XG5jb25zdCBhcnJheVR5cGUgPSBab2RBcnJheS5jcmVhdGU7XG5jb25zdCBvYmplY3RUeXBlID0gWm9kT2JqZWN0LmNyZWF0ZTtcbmNvbnN0IHN0cmljdE9iamVjdFR5cGUgPSBab2RPYmplY3Quc3RyaWN0Q3JlYXRlO1xuY29uc3QgdW5pb25UeXBlID0gWm9kVW5pb24uY3JlYXRlO1xuY29uc3QgZGlzY3JpbWluYXRlZFVuaW9uVHlwZSA9IFpvZERpc2NyaW1pbmF0ZWRVbmlvbi5jcmVhdGU7XG5jb25zdCBpbnRlcnNlY3Rpb25UeXBlID0gWm9kSW50ZXJzZWN0aW9uLmNyZWF0ZTtcbmNvbnN0IHR1cGxlVHlwZSA9IFpvZFR1cGxlLmNyZWF0ZTtcbmNvbnN0IHJlY29yZFR5cGUgPSBab2RSZWNvcmQuY3JlYXRlO1xuY29uc3QgbWFwVHlwZSA9IFpvZE1hcC5jcmVhdGU7XG5jb25zdCBzZXRUeXBlID0gWm9kU2V0LmNyZWF0ZTtcbmNvbnN0IGZ1bmN0aW9uVHlwZSA9IFpvZEZ1bmN0aW9uLmNyZWF0ZTtcbmNvbnN0IGxhenlUeXBlID0gWm9kTGF6eS5jcmVhdGU7XG5jb25zdCBsaXRlcmFsVHlwZSA9IFpvZExpdGVyYWwuY3JlYXRlO1xuY29uc3QgZW51bVR5cGUgPSBab2RFbnVtLmNyZWF0ZTtcbmNvbnN0IG5hdGl2ZUVudW1UeXBlID0gWm9kTmF0aXZlRW51bS5jcmVhdGU7XG5jb25zdCBwcm9taXNlVHlwZSA9IFpvZFByb21pc2UuY3JlYXRlO1xuY29uc3QgZWZmZWN0c1R5cGUgPSBab2RFZmZlY3RzLmNyZWF0ZTtcbmNvbnN0IG9wdGlvbmFsVHlwZSA9IFpvZE9wdGlvbmFsLmNyZWF0ZTtcbmNvbnN0IG51bGxhYmxlVHlwZSA9IFpvZE51bGxhYmxlLmNyZWF0ZTtcbmNvbnN0IHByZXByb2Nlc3NUeXBlID0gWm9kRWZmZWN0cy5jcmVhdGVXaXRoUHJlcHJvY2VzcztcbmNvbnN0IHBpcGVsaW5lVHlwZSA9IFpvZFBpcGVsaW5lLmNyZWF0ZTtcbmNvbnN0IG9zdHJpbmcgPSAoKSA9PiBzdHJpbmdUeXBlKCkub3B0aW9uYWwoKTtcbmNvbnN0IG9udW1iZXIgPSAoKSA9PiBudW1iZXJUeXBlKCkub3B0aW9uYWwoKTtcbmNvbnN0IG9ib29sZWFuID0gKCkgPT4gYm9vbGVhblR5cGUoKS5vcHRpb25hbCgpO1xuZXhwb3J0IGNvbnN0IGNvZXJjZSA9IHtcbiAgICBzdHJpbmc6ICgoYXJnKSA9PiBab2RTdHJpbmcuY3JlYXRlKHsgLi4uYXJnLCBjb2VyY2U6IHRydWUgfSkpLFxuICAgIG51bWJlcjogKChhcmcpID0+IFpvZE51bWJlci5jcmVhdGUoeyAuLi5hcmcsIGNvZXJjZTogdHJ1ZSB9KSksXG4gICAgYm9vbGVhbjogKChhcmcpID0+IFpvZEJvb2xlYW4uY3JlYXRlKHtcbiAgICAgICAgLi4uYXJnLFxuICAgICAgICBjb2VyY2U6IHRydWUsXG4gICAgfSkpLFxuICAgIGJpZ2ludDogKChhcmcpID0+IFpvZEJpZ0ludC5jcmVhdGUoeyAuLi5hcmcsIGNvZXJjZTogdHJ1ZSB9KSksXG4gICAgZGF0ZTogKChhcmcpID0+IFpvZERhdGUuY3JlYXRlKHsgLi4uYXJnLCBjb2VyY2U6IHRydWUgfSkpLFxufTtcbmV4cG9ydCB7IGFueVR5cGUgYXMgYW55LCBhcnJheVR5cGUgYXMgYXJyYXksIGJpZ0ludFR5cGUgYXMgYmlnaW50LCBib29sZWFuVHlwZSBhcyBib29sZWFuLCBkYXRlVHlwZSBhcyBkYXRlLCBkaXNjcmltaW5hdGVkVW5pb25UeXBlIGFzIGRpc2NyaW1pbmF0ZWRVbmlvbiwgZWZmZWN0c1R5cGUgYXMgZWZmZWN0LCBlbnVtVHlwZSBhcyBlbnVtLCBmdW5jdGlvblR5cGUgYXMgZnVuY3Rpb24sIGluc3RhbmNlT2ZUeXBlIGFzIGluc3RhbmNlb2YsIGludGVyc2VjdGlvblR5cGUgYXMgaW50ZXJzZWN0aW9uLCBsYXp5VHlwZSBhcyBsYXp5LCBsaXRlcmFsVHlwZSBhcyBsaXRlcmFsLCBtYXBUeXBlIGFzIG1hcCwgbmFuVHlwZSBhcyBuYW4sIG5hdGl2ZUVudW1UeXBlIGFzIG5hdGl2ZUVudW0sIG5ldmVyVHlwZSBhcyBuZXZlciwgbnVsbFR5cGUgYXMgbnVsbCwgbnVsbGFibGVUeXBlIGFzIG51bGxhYmxlLCBudW1iZXJUeXBlIGFzIG51bWJlciwgb2JqZWN0VHlwZSBhcyBvYmplY3QsIG9ib29sZWFuLCBvbnVtYmVyLCBvcHRpb25hbFR5cGUgYXMgb3B0aW9uYWwsIG9zdHJpbmcsIHBpcGVsaW5lVHlwZSBhcyBwaXBlbGluZSwgcHJlcHJvY2Vzc1R5cGUgYXMgcHJlcHJvY2VzcywgcHJvbWlzZVR5cGUgYXMgcHJvbWlzZSwgcmVjb3JkVHlwZSBhcyByZWNvcmQsIHNldFR5cGUgYXMgc2V0LCBzdHJpY3RPYmplY3RUeXBlIGFzIHN0cmljdE9iamVjdCwgc3RyaW5nVHlwZSBhcyBzdHJpbmcsIHN5bWJvbFR5cGUgYXMgc3ltYm9sLCBlZmZlY3RzVHlwZSBhcyB0cmFuc2Zvcm1lciwgdHVwbGVUeXBlIGFzIHR1cGxlLCB1bmRlZmluZWRUeXBlIGFzIHVuZGVmaW5lZCwgdW5pb25UeXBlIGFzIHVuaW9uLCB1bmtub3duVHlwZSBhcyB1bmtub3duLCB2b2lkVHlwZSBhcyB2b2lkLCB9O1xuZXhwb3J0IGNvbnN0IE5FVkVSID0gSU5WQUxJRDtcbiIsICIvKipcbiAqIFx1N0VERlx1NEUwMFx1NTJBOFx1NEY1Q1x1NkEyMVx1NTc4QiAoVW5pZmllZCBBY3Rpb24gTW9kZWwpXG4gKlxuICogXHU4NzhEXHU1NDA4XHU1NkRCXHU0RTJBXHU5ODc5XHU3NkVFXHU3Njg0XHU1MkE4XHU0RjVDXHU4QkVEXHU0RTQ5XHVGRjBDXHU2MkJEXHU4QzYxXHU2MjEwXHU0RTAwXHU1OTU3IEFJIFx1NTNFRlx1NzZGNFx1NjNBNVx1NEY3Rlx1NzUyOFx1NzY4NFx1ODlDNFx1ODMwM1x1NTJBOFx1NEY1Q1x1MzAwMlxuICogLSBcdThCRURcdTRFNDlcdTU0N0RcdTU0MERcdUZGMDhcdTRGOUIgQUkgXHU3NDA2XHU4OUUzXHVGRjBDXHU1MDFGXHU5Mjc0IEJyb3dzZXItVXNlXHVGRjA5XG4gKiAtIFx1N0NCRVx1Nzg2RVx1NTNDMlx1NjU3MFx1RkYwOFx1NEY5Qlx1NUU5NVx1NUM0Mlx1N0NCRVx1Nzg2RVx1NjI2N1x1ODg0Q1x1RkYwQ1x1NTAxRlx1OTI3NCBTdGFnZWhhbmQvUGxheXdyaWdodFx1RkYwOVxuICovXG5pbXBvcnQgeyB6IH0gZnJvbSBcInpvZFwiO1xuXG4vKiogXHU1N0ZBXHU3ODQwXHU1MkE4XHU0RjVDXHU1QjlBXHU0RTQ5ICovXG5leHBvcnQgY29uc3QgQmFzZUFjdGlvblNjaGVtYSA9IHoub2JqZWN0KHtcbiAgLyoqIFx1NTJBOFx1NEY1Q1x1N0M3Qlx1NTc4QiAqL1xuICB0eXBlOiB6LmVudW0oW1xuICAgIFwibmF2aWdhdGVcIixcbiAgICBcImNsaWNrXCIsXG4gICAgXCJmaWxsXCIsXG4gICAgXCJ0eXBlXCIsXG4gICAgXCJzZWxlY3RcIixcbiAgICBcImhvdmVyXCIsXG4gICAgXCJzY3JvbGxcIixcbiAgICBcInByZXNzXCIsXG4gICAgXCJ3YWl0XCIsXG4gICAgXCJzY3JlZW5zaG90XCIsXG4gICAgXCJldmFsdWF0ZVwiLFxuICAgIFwiYXNzZXJ0XCIsXG4gICAgXCJleHRyYWN0XCIsXG4gICAgXCJzbmFwc2hvdFwiLFxuICBdKSxcbiAgLyoqIFx1NTJBOFx1NEY1Q1x1NzUyOFx1OTAxNFx1NjNDRlx1OEZGMFx1RkYwOFx1NEY5QiBBSSAvIFx1NjVFNVx1NUZENyAvIFx1NTZERVx1NjUzRVx1RkYwOSAqL1xuICBkZXNjcmlwdGlvbjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAvKiogXHU4QkVEXHU0RTQ5XHU3NkVFXHU2ODA3XHVGRjA4XHU4MUVBXHU3MTM2XHU4QkVEXHU4QTAwXHVGRjBDXHU0RjlCIEFJIFx1NUM0Mlx1ODlFM1x1Njc5MFx1RkYwOSAqL1xuICBpbnRlbnQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgLyoqIFx1NjYyRlx1NTQyNlx1N0I0OVx1NUY4NVx1NTJBOFx1NEY1Q1x1N0EzM1x1NUI5QVx1NTQwRVx1NTE4RFx1OEZENFx1NTZERSAqL1xuICB3YWl0VW50aWxTdGFibGU6IHouYm9vbGVhbigpLmRlZmF1bHQodHJ1ZSksXG59KTtcblxuLyoqIFx1NUJGQ1x1ODIyQVx1NTJBOFx1NEY1QyAqL1xuZXhwb3J0IGNvbnN0IE5hdmlnYXRlQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJuYXZpZ2F0ZVwiKSxcbiAgdXJsOiB6LnN0cmluZygpLnVybCgpLFxuICAvKiogXHU3QjQ5XHU1Rjg1XHU3RjUxXHU3RURDXHU3QTdBXHU5NUYyICovXG4gIHdhaXRVbnRpbDogelxuICAgIC5lbnVtKFtcImxvYWRcIiwgXCJkb21jb250ZW50bG9hZGVkXCIsIFwibmV0d29ya2lkbGVcIiwgXCJjb21taXRcIl0pXG4gICAgLmRlZmF1bHQoXCJuZXR3b3JraWRsZVwiKSxcbn0pO1xuXG4vKiogXHU3MEI5XHU1MUZCXHU1MkE4XHU0RjVDXHVGRjFBXHU2NTJGXHU2MzAxXHU1OTFBXHU3OUNEXHU1QjlBXHU0RjREXHU3QjU2XHU3NTY1ICovXG5leHBvcnQgY29uc3QgQ2xpY2tBY3Rpb25TY2hlbWEgPSBCYXNlQWN0aW9uU2NoZW1hLmV4dGVuZCh7XG4gIHR5cGU6IHoubGl0ZXJhbChcImNsaWNrXCIpLFxuICAvLyBcdTVCOUFcdTRGNERcdTY1QjlcdTVGMEZcdUZGMDhcdTYzMDlcdTRGMThcdTUxNDhcdTdFQTdcdTVDMURcdThCRDVcdUZGMDlcbiAgc2VsZWN0b3I6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgLy8gXHU4QkVEXHU0RTQ5XHU3NkVFXHU2ODA3XHU2NTg3XHU2NzJDXHVGRjA4XHU1MDFGXHU5Mjc0IEJyb3dzZXItVXNlXHVGRjBDXHU3NTI4XHU2NTg3XHU2NzJDXHU1QjlBXHU0RjREXHVGRjA5XG4gIHRleHQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgLy8gQUkgXHU0RUNFXHU1RkVCXHU3MTY3XHU0RTJEXHU4RkQ0XHU1NkRFXHU3Njg0IHJlZlx1RkYwOFx1OUFEOFx1NjU0OFx1N0NCRVx1Nzg2RVx1NUI5QVx1NEY0RFx1RkYwQ1x1NTAxRlx1OTI3NCBTdGFnZWhhbmQgWFBhdGggLyBBSSBsb2NhdG9yXHVGRjA5XG4gIHJlZjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAvLyBBSSBcdThGRDRcdTU2REVcdTc2ODRcdThCRURcdTRFNDlcdTVCOUFcdTRGNERcdTYzQ0ZcdThGRjBcbiAgc2VtYW50aWM6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgLyoqIFx1NzBCOVx1NTFGQlx1NjMwOVx1OTRBRSAqL1xuICBidXR0b246IHouZW51bShbXCJsZWZ0XCIsIFwicmlnaHRcIiwgXCJtaWRkbGVcIl0pLmRlZmF1bHQoXCJsZWZ0XCIpLFxuICAvKiogXHU3MEI5XHU1MUZCXHU2QjIxXHU2NTcwICovXG4gIGNsaWNrQ291bnQ6IHoubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCgzKS5kZWZhdWx0KDEpLFxuICAvKiogXHU1RjNBXHU1MjM2XHU1RkZEXHU3NTY1XHU1M0VGXHU2NENEXHU0RjVDXHU2MDI3XHU2OEMwXHU2N0U1ICovXG4gIGZvcmNlOiB6LmJvb2xlYW4oKS5kZWZhdWx0KGZhbHNlKSxcbiAgLyoqIFx1NzBCOVx1NTFGQlx1NTQwRVx1NjYyRlx1NTQyNlx1N0I0OVx1NUY4NVx1OTg3NVx1OTc2Mlx1NUJGQ1x1ODIyQVx1N0EzM1x1NUI5QVx1RkYwOFx1NzBCOVx1NTFGQlx1OTRGRVx1NjNBNVx1ODlFNlx1NTNEMVx1OERGM1x1OEY2Q1x1NjVGNlx1RkYwQ1x1N0I0OVx1NUY4NVx1NjVCMFx1OTg3NVx1OTc2Mlx1NTJBMFx1OEY3RFx1NUI4Q1x1NjIxMFx1NTE4RFx1OEZENFx1NTZERVx1RkYwOVx1MzAwMlxuICAgKiAgXHU5RUQ4XHU4QkE0IHRydWVcdUZGMENcdTc4NkVcdTRGREQgQUkgXHU3MEI5XHU1MUZCXHU4REYzXHU4RjZDXHU1NDBFXHU4QkZCXHU1MjMwXHU3Njg0XHU2NjJGXHU3QTMzXHU1QjlBXHU1NDBFXHU3Njg0XHU5ODc1XHU5NzYyXHVGRjBDXHU4MDBDXHU5NzVFXHU2NUU3XHU5ODc1XHU5NzYyXHUzMDAyICovXG4gIHdhaXRGb3JOYXZpZ2F0aW9uOiB6LmJvb2xlYW4oKS5kZWZhdWx0KHRydWUpLFxufSk7XG5cbi8qKiBcdThGOTNcdTUxNjVcdTUyQThcdTRGNUMgKi9cbmV4cG9ydCBjb25zdCBGaWxsQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJmaWxsXCIpLFxuICBzZWxlY3Rvcjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICB0ZXh0OiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gIHJlZjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICBzZW1hbnRpYzogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICB2YWx1ZTogei5zdHJpbmcoKSxcbiAgLyoqIFx1OEY5M1x1NTE2NVx1NkEyMVx1NUYwRlx1RkYxQWZpbGwgXHU1MzczXHU2NUY2XHU1ODZCXHU1MTQ1IC8gdHlwZSBcdTkwMTBcdTk1MkVcdTZBMjFcdTYyREYgKi9cbn0pO1xuXG4vKiogXHU2M0QwXHU1M0Q2XHU1MkE4XHU0RjVDICovXG5leHBvcnQgY29uc3QgRXh0cmFjdEFjdGlvblNjaGVtYSA9IEJhc2VBY3Rpb25TY2hlbWEuZXh0ZW5kKHtcbiAgdHlwZTogei5saXRlcmFsKFwiZXh0cmFjdFwiKSxcbiAgc2VsZWN0b3I6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgdGV4dDogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICByZWY6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgc2VtYW50aWM6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgLyoqIFx1N0VEM1x1Njc4NFx1NTMxNlx1NjNEMFx1NTNENlx1NzY4NCBzY2hlbWEgXHU2M0NGXHU4RkYwICovXG4gIHNjaGVtYTogei5yZWNvcmQoei5zdHJpbmcoKSwgei5hbnkoKSkub3B0aW9uYWwoKSxcbn0pO1xuXG4vKiogXHU2NUFEXHU4QTAwXHU1MkE4XHU0RjVDICovXG5leHBvcnQgY29uc3QgQXNzZXJ0QWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJhc3NlcnRcIiksXG4gIHNlbGVjdG9yOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gIHRleHQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgcmVmOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gIHNlbWFudGljOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gIC8qKiBcdTY1QURcdThBMDBcdTY1QjlcdTVGMEYgKi9cbiAgbW9kZTogelxuICAgIC5lbnVtKFtcInZpc2libGVcIiwgXCJleGlzdHNcIiwgXCJoaWRkZW5cIiwgXCJ0ZXh0LWNvbnRhaW5zXCIsIFwidmFsdWUtZXF1YWxzXCIsIFwiZW5hYmxlZFwiXSlcbiAgICAuZGVmYXVsdChcInZpc2libGVcIiksXG4gIGV4cGVjdGVkOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG59KTtcblxuLyoqIFx1NjIyQVx1NTZGRVx1NTJBOFx1NEY1QyAqL1xuZXhwb3J0IGNvbnN0IFNjcmVlbnNob3RBY3Rpb25TY2hlbWEgPSBCYXNlQWN0aW9uU2NoZW1hLmV4dGVuZCh7XG4gIHR5cGU6IHoubGl0ZXJhbChcInNjcmVlbnNob3RcIiksXG4gIGZ1bGxQYWdlOiB6LmJvb2xlYW4oKS5kZWZhdWx0KGZhbHNlKSxcbiAgLyoqIFx1NjIyQVx1NTZGRVx1NTMzQVx1NTdERlx1RkYwOFx1NTNFRlx1OTAwOVx1RkYwQ1x1NzUyOFx1NEU4RVx1OEMwM1x1OEJENVx1NUI5QVx1NEY0RFx1RkYwOSAqL1xuICBjbGlwOiB6XG4gICAgLm9iamVjdCh7XG4gICAgICB4OiB6Lm51bWJlcigpLFxuICAgICAgeTogei5udW1iZXIoKSxcbiAgICAgIHdpZHRoOiB6Lm51bWJlcigpLFxuICAgICAgaGVpZ2h0OiB6Lm51bWJlcigpLFxuICAgIH0pXG4gICAgLm9wdGlvbmFsKCksXG59KTtcblxuLyoqIFx1NjBBQ1x1NTA1Q1x1NTJBOFx1NEY1QyAqL1xuZXhwb3J0IGNvbnN0IEhvdmVyQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJob3ZlclwiKSxcbiAgc2VsZWN0b3I6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgdGV4dDogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICByZWY6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgc2VtYW50aWM6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbn0pO1xuXG4vKiogXHU2RURBXHU1MkE4XHU1MkE4XHU0RjVDICovXG5leHBvcnQgY29uc3QgU2Nyb2xsQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJzY3JvbGxcIiksXG4gIGRlbHRhWDogei5udW1iZXIoKS5kZWZhdWx0KDApLFxuICBkZWx0YVk6IHoubnVtYmVyKCkuZGVmYXVsdCg2MDApLFxufSk7XG5cbi8qKiBcdTdCNDlcdTVGODVcdTUyQThcdTRGNUMgKi9cbmV4cG9ydCBjb25zdCBXYWl0QWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJ3YWl0XCIpLFxuICBtczogei5udW1iZXIoKS5pbnQoKS5taW4oMCkuZGVmYXVsdCgxMDAwKSxcbn0pO1xuXG4vKiogSlMgXHU2MjY3XHU4ODRDXHU1MkE4XHU0RjVDXHVGRjA4XHU5QUQ4XHU3RUE3XHU4QkNBXHU2NUFEXHVGRjA5ICovXG5leHBvcnQgY29uc3QgRXZhbHVhdGVBY3Rpb25TY2hlbWEgPSBCYXNlQWN0aW9uU2NoZW1hLmV4dGVuZCh7XG4gIHR5cGU6IHoubGl0ZXJhbChcImV2YWx1YXRlXCIpLFxuICBzY3JpcHQ6IHouc3RyaW5nKCksXG59KTtcblxuLyoqIFx1NjMwOVx1OTUyRVx1NTJBOFx1NEY1QyAqL1xuZXhwb3J0IGNvbnN0IFByZXNzQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJwcmVzc1wiKSxcbiAga2V5OiB6LnN0cmluZygpLFxufSk7XG5cbi8qKiBcdTkwMTBcdTk1MkVcdThGOTNcdTUxNjVcdTUyQThcdTRGNUMgKi9cbmV4cG9ydCBjb25zdCBUeXBlQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJ0eXBlXCIpLFxuICBzZWxlY3Rvcjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICB0ZXh0OiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gIHJlZjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICB2YWx1ZTogei5zdHJpbmcoKSxcbiAgZGVsYXk6IHoubnVtYmVyKCkuaW50KCkubWluKDApLmRlZmF1bHQoMCksXG59KTtcblxuLyoqIFx1NEUwQlx1NjJDOVx1OTAwOVx1NjJFOVx1NTJBOFx1NEY1QyAqL1xuZXhwb3J0IGNvbnN0IFNlbGVjdEFjdGlvblNjaGVtYSA9IEJhc2VBY3Rpb25TY2hlbWEuZXh0ZW5kKHtcbiAgdHlwZTogei5saXRlcmFsKFwic2VsZWN0XCIpLFxuICBzZWxlY3Rvcjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICByZWY6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgdmFsdWU6IHouc3RyaW5nKCksXG59KTtcblxuLyoqIFx1N0VERlx1NEUwMFx1NTJBOFx1NEY1Q1x1ODA1NFx1NTQwOCAqL1xuZXhwb3J0IGNvbnN0IFVuaWZpZWRBY3Rpb25TY2hlbWEgPSB6LmRpc2NyaW1pbmF0ZWRVbmlvbihcInR5cGVcIiwgW1xuICBOYXZpZ2F0ZUFjdGlvblNjaGVtYSxcbiAgQ2xpY2tBY3Rpb25TY2hlbWEsXG4gIEZpbGxBY3Rpb25TY2hlbWEsXG4gIFR5cGVBY3Rpb25TY2hlbWEsXG4gIFNlbGVjdEFjdGlvblNjaGVtYSxcbiAgSG92ZXJBY3Rpb25TY2hlbWEsXG4gIFNjcm9sbEFjdGlvblNjaGVtYSxcbiAgV2FpdEFjdGlvblNjaGVtYSxcbiAgRXZhbHVhdGVBY3Rpb25TY2hlbWEsXG4gIFByZXNzQWN0aW9uU2NoZW1hLFxuICBFeHRyYWN0QWN0aW9uU2NoZW1hLFxuICBBc3NlcnRBY3Rpb25TY2hlbWEsXG4gIFNjcmVlbnNob3RBY3Rpb25TY2hlbWEsXG5dKTtcblxuZXhwb3J0IHR5cGUgVW5pZmllZEFjdGlvbiA9IHouaW5mZXI8dHlwZW9mIFVuaWZpZWRBY3Rpb25TY2hlbWE+O1xuZXhwb3J0IHR5cGUgQWN0aW9uVHlwZSA9IFVuaWZpZWRBY3Rpb25bXCJ0eXBlXCJdO1xuXG4vKiogXHU1MkE4XHU0RjVDXHU2MjY3XHU4ODRDXHU3RUQzXHU2NzlDICovXG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvblJlc3VsdCB7XG4gIG9rOiBib29sZWFuO1xuICB0eXBlOiBBY3Rpb25UeXBlO1xuICAvKiogXHU0RUJBXHU3QzdCXHU1M0VGXHU4QkZCXHU3Njg0XHU3RUQzXHU2NzlDXHVGRjA4XHU0RjlCIEFJIC8gXHU2NUU1XHU1RkQ3XHVGRjA5ICovXG4gIHN1bW1hcnk6IHN0cmluZztcbiAgLyoqIFx1N0VEM1x1Njc4NFx1NTMxNlx1NjU3MFx1NjM2RVx1RkYwOFx1NjNEMFx1NTNENi9cdTVGRUJcdTcxNjdcdTc1MjhcdUZGMDkgKi9cbiAgZGF0YT86IHVua25vd247XG4gIC8qKiBcdThDMDNcdThCRDVcdThCQ0FcdTY1QURcdTRGRTFcdTYwNkZcdUZGMDhcdTk0RkVcdTYzQTVcdTUyMzAgZGlhZ25vc2lzIFx1NEUyRFx1NUZDM1x1RkYwOSAqL1xuICBkaWFnbm9zdGljcz86IERpYWdub3N0aWNSZWZbXTtcbiAgLyoqIFx1ODAxN1x1NjVGNiAqL1xuICBkdXJhdGlvbk1zOiBudW1iZXI7XG4gIC8qKiBcdTUxRkFcdTk1MTlcdTY1RjZcdTc2ODRcdTk1MTlcdThCRUZcdTRGRTFcdTYwNkYgKi9cbiAgZXJyb3I/OiBzdHJpbmc7XG4gIC8qKiBcdTYyNjdcdTg4NENcdTU0MEVcdTc2ODRcdTk4NzVcdTk3NjJcdTVGRUJcdTcxNjdcdTVGMTVcdTc1MjggKi9cbiAgc25hcHNob3RSZWY/OiBzdHJpbmc7XG59XG5cbi8qKiBcdThCQ0FcdTY1QURcdTVGMTVcdTc1MjhcdUZGMUFcdTYyOEFcdTdFRDNcdTY3OUNcdTUxNzNcdTgwNTRcdTUyMzAgNSBcdTY2MUZcdThDMDNcdThCRDVcdThCQ0FcdTY1QURcdTRFMkRcdTVGQzMgKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGlhZ25vc3RpY1JlZiB7XG4gIGtpbmQ6IFwiY29uc29sZVwiIHwgXCJuZXR3b3JrXCIgfCBcImRvbVwiIHwgXCJwZXJmb3JtYW5jZVwiIHwgXCJqcy1leGNlcHRpb25cIiB8IFwiYWNjZXNzaWJpbGl0eVwiO1xuICBzZXZlcml0eTogXCJpbmZvXCIgfCBcIndhcm5pbmdcIiB8IFwiZXJyb3JcIjtcbiAgbWVzc2FnZTogc3RyaW5nO1xuICAvKiogXHU1M0VGXHU1QzU1XHU1RjAwXHU3Njg0XHU4QkU2XHU2MEM1XHVGRjA4XHU1OTgyIHN0YWNrXHUzMDAxcmVxdWVzdElkXHVGRjA5ICovXG4gIGRldGFpbD86IHVua25vd247XG4gIC8qKiBcdTY1RjZcdTk1RjRcdTYyMzMgKi9cbiAgdGltZXN0YW1wOiBudW1iZXI7XG59XG4iLCAiLyoqXG4gKiBcdTcyQjZcdTYwMDFcdTY3M0FcdUZGMUFcdThEREZcdThFMkEgQUkgXHU1NzI4XHU5ODc1XHU5NzYyXHU0RTBBXHU3Njg0XHU2NENEXHU0RjVDXHU0RjFBXHU4QkREXHU3MkI2XHU2MDAxXHVGRjA4XHU1MDFGXHU5Mjc0IFN0YWdlaGFuZCBcdTc2ODQgQWN0L0V4dHJhY3QvT2JzZXJ2ZSBcdTc1MUZcdTU0N0RcdTU0NjhcdTY3MUZcdUZGMDlcbiAqL1xuZXhwb3J0IHR5cGUgU2Vzc2lvblBoYXNlID1cbiAgfCBcImlkbGVcIlxuICB8IFwibmF2aWdhdGluZ1wiXG4gIHwgXCJhY3RpbmdcIlxuICB8IFwib2JzZXJ2aW5nXCJcbiAgfCBcImV4dHJhY3RpbmdcIlxuICB8IFwiZGlhZ25vc2luZ1wiXG4gIHwgXCJlcnJvclwiXG4gIHwgXCJkb25lXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2Vzc2lvblN0YXRlIHtcbiAgcGhhc2U6IFNlc3Npb25QaGFzZTtcbiAgLyoqIFx1NURGMlx1NjI2N1x1ODg0Q1x1NzY4NFx1NkI2NVx1NjU3MCAqL1xuICBzdGVwczogbnVtYmVyO1xuICAvKiogXHU1RjUzXHU1MjREXHU5ODc1XHU5NzYyIFVSTCAqL1xuICB1cmw/OiBzdHJpbmc7XG4gIC8qKiBcdTY3MDBcdThGRDFcdTRFMDBcdTZCMjFcdTVGRUJcdTcxNjcgKi9cbiAgbGFzdFNuYXBzaG90UmVmPzogc3RyaW5nO1xuICAvKiogXHU2NzAwXHU4RkQxXHU0RTAwXHU2QjIxXHU1MkE4XHU0RjVDXHU3RUQzXHU2NzlDICovXG4gIGxhc3RBY3Rpb24/OiBzdHJpbmc7XG4gIC8qKiBcdTRGMUFcdThCRERcdTVGMDBcdTU5Q0JcdTY1RjZcdTk1RjQgKi9cbiAgc3RhcnRlZEF0OiBudW1iZXI7XG4gIC8qKiBcdTk1MTlcdThCRUZcdTRGRTFcdTYwNkZcdUZGMDhcdTgyRTVcdTU5MDRcdTRFOEUgZXJyb3IgXHU5NjM2XHU2QkI1XHVGRjA5ICovXG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgU2Vzc2lvbk1hY2hpbmUge1xuICBwcml2YXRlIHN0YXRlOiBTZXNzaW9uU3RhdGU7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgIHBoYXNlOiBcImlkbGVcIixcbiAgICAgIHN0ZXBzOiAwLFxuICAgICAgc3RhcnRlZEF0OiBEYXRlLm5vdygpLFxuICAgIH07XG4gIH1cblxuICBnZXQgc25hcHNob3QoKTogUmVhZG9ubHk8U2Vzc2lvblN0YXRlPiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGU7XG4gIH1cblxuICB0cmFuc2l0aW9uKG5leHQ6IFNlc3Npb25QaGFzZSwgcGF0Y2g/OiBQYXJ0aWFsPFNlc3Npb25TdGF0ZT4pIHtcbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgIC4uLnBhdGNoLFxuICAgICAgcGhhc2U6IG5leHQsXG4gICAgfTtcbiAgICBpZiAobmV4dCA9PT0gXCJhY3RpbmdcIiB8fCBuZXh0ID09PSBcIm5hdmlnYXRpbmdcIiB8fCBuZXh0ID09PSBcIm9ic2VydmluZ1wiIHx8IG5leHQgPT09IFwiZXh0cmFjdGluZ1wiKSB7XG4gICAgICB0aGlzLnN0YXRlLnN0ZXBzICs9IDE7XG4gICAgfVxuICB9XG5cbiAgc2V0VXJsKHVybDogc3RyaW5nKSB7XG4gICAgdGhpcy5zdGF0ZS51cmwgPSB1cmw7XG4gIH1cblxuICBzZXRFcnJvcihlcnJvcjogc3RyaW5nKSB7XG4gICAgdGhpcy5zdGF0ZS5lcnJvciA9IGVycm9yO1xuICAgIHRoaXMuc3RhdGUucGhhc2UgPSBcImVycm9yXCI7XG4gIH1cblxuICAvKiogXHU5MUNEXHU3RjZFXHU0RjFBXHU4QkREXHVGRjA4XHU0RjlCXHU0RTBCXHU0RTAwXHU4RjZFXHU1OTBEXHU3NTI4XHU1NDBDXHU0RTAwXHU2RDRGXHU4OUM4XHU1NjY4XHU1QjlFXHU0RjhCXHVGRjA5ICovXG4gIHJlc2V0KCkge1xuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBwaGFzZTogXCJpZGxlXCIsXG4gICAgICBzdGVwczogMCxcbiAgICAgIHN0YXJ0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICB9O1xuICB9XG59XG4iLCAiLyoqXG4gKiBGb3JnZUJyb3dzZXIgXHUyMDE0XHUyMDE0IFx1N0VERlx1NEUwMFx1NkQ0Rlx1ODlDOFx1NTY2OFx1NjNBN1x1NTIzNlx1OTVFOFx1OTc2Mlx1RkYwOFx1Njg0Nlx1NjdCNlx1NjgzOFx1NUZDM1x1RkYwOVxuICpcbiAqIFx1OTc2Mlx1NTQxMSBBSSBBZ2VudCBcdTc2ODRcdTRFMDBcdTdBRDlcdTVGMEZcdTYzQTVcdTUzRTNcdUZGMENcdTg3OERcdTU0MDhcdUZGMUFcbiAqIC0gXHU3RURGXHU0RTAwXHU1MkE4XHU0RjVDXHU2MjY3XHU4ODRDXHVGRjA4U3RhZ2VoYW5kL1BsYXl3cmlnaHQgXHU3Q0JFXHU3ODZFICsgQnJvd3Nlci1Vc2UgXHU4QkVEXHU0RTQ5XHVGRjA5XG4gKiAtIFx1OUFEOFx1NjU0OFx1OTg3NVx1OTc2Mlx1NUZFQlx1NzE2N1x1RkYwOENocm9tZSBEZXZUb29scyBNQ1AgXHU3Njg0IFRva2VuIFx1N0I1Nlx1NzU2NVx1RkYwOVxuICogLSA1IFx1NjYxRlx1OEMwM1x1OEJENVx1OEJDQVx1NjVBRFx1RkYwOENocm9tZSBEZXZUb29scyBNQ1AgXHU4MEZEXHU1MjlCXHVGRjA5XG4gKi9cbmltcG9ydCB0eXBlIHsgQnJvd3NlckVuZ2luZSwgRGlhZ25vc3RpY1JlcG9ydCB9IGZyb20gXCIuL2VuZ2luZS5qc1wiO1xuaW1wb3J0IHR5cGUgeyBVbmlmaWVkQWN0aW9uLCBBY3Rpb25SZXN1bHQgfSBmcm9tIFwiLi9hY3Rpb25zLmpzXCI7XG5pbXBvcnQgdHlwZSB7IFBhZ2VTbmFwc2hvdCwgU25hcHNob3RPcHRpb25zIH0gZnJvbSBcIi4vc25hcHNob3QuanNcIjtcbmltcG9ydCB7IFNlc3Npb25NYWNoaW5lIH0gZnJvbSBcIi4vc2Vzc2lvbi5qc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZvcmdlT3B0aW9ucyB7XG4gIC8qKiBcdTUyQThcdTRGNUNcdThEODVcdTY1RjZcdUZGMDhcdTlFRDhcdThCQTQgMzBzXHVGRjA5ICovXG4gIHRpbWVvdXRNcz86IG51bWJlcjtcbiAgLyoqIFx1NUZFQlx1NzE2N1x1OUVEOFx1OEJBNFx1OTAwOVx1OTg3OSAqL1xuICBzbmFwc2hvdE9wdGlvbnM/OiBTbmFwc2hvdE9wdGlvbnM7XG4gIC8qKiBcdTUyQThcdTRGNUNcdTU5MzFcdThEMjVcdTU0MEVcdTY2MkZcdTU0MjZcdTgxRUFcdTUyQThcdTkxQzdcdTk2QzZcdThCQ0FcdTY1QURcdUZGMDhcdTlFRDhcdThCQTQgdHJ1ZVx1RkYwQ1x1NEY1M1x1NzNCMFx1OEMwM1x1OEJENVx1NEYxOFx1NTE0OFx1RkYwOSAqL1xuICBhdXRvRGlhZ25vc2VPbkVycm9yPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIEZvcmdlQnJvd3NlciB7XG4gIHJlYWRvbmx5IHNlc3Npb24gPSBuZXcgU2Vzc2lvbk1hY2hpbmUoKTtcbiAgcHJpdmF0ZSBvcHRzOiBSZXF1aXJlZDxGb3JnZU9wdGlvbnM+O1xuICBwcml2YXRlIGRpYWdub3N0aWNzQ2FjaGU6IERpYWdub3N0aWNSZXBvcnQgPSB7XG4gICAgY29uc29sZTogW10sXG4gICAgbmV0d29yazogW10sXG4gICAgZG9tOiBbXSxcbiAgICBwZXJmb3JtYW5jZTogW10sXG4gICAganNFeGNlcHRpb25zOiBbXSxcbiAgICBhY2Nlc3NpYmlsaXR5OiBbXSxcbiAgfTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIGVuZ2luZTogQnJvd3NlckVuZ2luZSxcbiAgICBvcHRzOiBGb3JnZU9wdGlvbnMgPSB7fVxuICApIHtcbiAgICB0aGlzLm9wdHMgPSB7XG4gICAgICB0aW1lb3V0TXM6IDMwXzAwMCxcbiAgICAgIHNuYXBzaG90T3B0aW9uczogeyBtYXhOb2RlczogMjAwLCBtYXhUZXh0TGVuZ3RoOiA4MCwgd2l0aFNlbGVjdG9yczogdHJ1ZSB9LFxuICAgICAgYXV0b0RpYWdub3NlT25FcnJvcjogdHJ1ZSxcbiAgICAgIC4uLm9wdHMsXG4gICAgfTtcbiAgfVxuXG4gIGdldCBlbmdpbmVOYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZW5naW5lLm5hbWU7XG4gIH1cblxuICAvKiogXHU1NDJGXHU1MkE4ICovXG4gIGFzeW5jIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuZW5naW5lLmluaXQoKTtcbiAgICB0aGlzLnNlc3Npb24udHJhbnNpdGlvbihcImlkbGVcIik7XG4gIH1cblxuICAvKiogXHU1MDVDXHU2QjYyICovXG4gIGFzeW5jIHN0b3AoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5lbmdpbmUuY2xvc2UoKTtcbiAgICB0aGlzLnNlc3Npb24udHJhbnNpdGlvbihcImRvbmVcIik7XG4gIH1cblxuICAvKipcbiAgICogXHU2MjY3XHU4ODRDXHU3RURGXHU0RTAwXHU1MkE4XHU0RjVDXHUzMDAyXG4gICAqIFx1NTkzMVx1OEQyNVx1NjVGNlx1ODFFQVx1NTJBOFx1ODlFNlx1NTNEMVx1OEJDQVx1NjVBRFx1OTFDN1x1OTZDNlx1RkYwQ1x1OEZENFx1NTZERVx1NUUyNlx1OEJDQVx1NjVBRFx1NUYxNVx1NzUyOFx1NzY4NFx1N0VEM1x1Njc5Q1x1MzAwMlxuICAgKi9cbiAgYXN5bmMgYWN0KGFjdGlvbjogVW5pZmllZEFjdGlvbik6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gICAgY29uc3QgdDAgPSBEYXRlLm5vdygpO1xuICAgIHRoaXMuc2Vzc2lvbi50cmFuc2l0aW9uKFwiYWN0aW5nXCIpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmVuZ2luZS5leGVjdXRlKGFjdGlvbik7XG4gICAgICByZXN1bHQuZHVyYXRpb25NcyA9IERhdGUubm93KCkgLSB0MDtcbiAgICAgIHRoaXMuc2Vzc2lvbi5zZXRVcmwocmVzdWx0LnN1bW1hcnkuaW5jbHVkZXMoXCJodHRwXCIpID8gcmVzdWx0LnN1bW1hcnkgOiAodGhpcy5zZXNzaW9uLnNuYXBzaG90LnVybCA/PyBcIlwiKSk7XG4gICAgICBpZiAocmVzdWx0Lm9rKSB7XG4gICAgICAgIHRoaXMuc2Vzc2lvbi50cmFuc2l0aW9uKFwiYWN0aW5nXCIsIHsgbGFzdEFjdGlvbjogYWN0aW9uLnR5cGUgfSk7XG4gICAgICAgIC8vIFx1NTJBOFx1NEY1Q1x1NTQwRVx1OTg3QVx1NjI0Qlx1OTFDN1x1OTZDNlx1NjNBN1x1NTIzNlx1NTNGMC9cdTdGNTFcdTdFRENcdTVGMDJcdTVFMzhcdUZGMENcdTRGOUIgQUkgXHU1MjI0XHU2NUFEXHU5ODc1XHU5NzYyXHU2NjJGXHU1NDI2XHU1RjAyXHU1RTM4XG4gICAgICAgIHJlc3VsdC5kaWFnbm9zdGljcyA9IGF3YWl0IHRoaXMuZW5naW5lLmRpYWdub3NlKCkudGhlbigoZCkgPT5cbiAgICAgICAgICBbXG4gICAgICAgICAgICAuLi5kLmNvbnNvbGUuZmlsdGVyKChjKSA9PiBjLnNldmVyaXR5ID09PSBcImVycm9yXCIpLFxuICAgICAgICAgICAgLi4uZC5uZXR3b3JrLmZpbHRlcigobikgPT4gbi5zZXZlcml0eSA9PT0gXCJlcnJvclwiKSxcbiAgICAgICAgICAgIC4uLmQuanNFeGNlcHRpb25zLFxuICAgICAgICAgIF0uc2xpY2UoMCwgOClcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpO1xuICAgICAgY29uc3QgcmVzdWx0OiBBY3Rpb25SZXN1bHQgPSB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgdHlwZTogYWN0aW9uLnR5cGUsXG4gICAgICAgIHN1bW1hcnk6IGBcdTUyQThcdTRGNUNcdTYyNjdcdTg4NENcdTU5MzFcdThEMjU6ICR7bWVzc2FnZX1gLFxuICAgICAgICBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAsXG4gICAgICAgIGVycm9yOiBtZXNzYWdlLFxuICAgICAgfTtcbiAgICAgIGlmICh0aGlzLm9wdHMuYXV0b0RpYWdub3NlT25FcnJvcikge1xuICAgICAgICAvLyA1IFx1NjYxRlx1OEMwM1x1OEJENVx1RkYxQVx1NTkzMVx1OEQyNVx1NTM3M1x1OTFDN1x1OTZDNlx1NTE2OFx1OTFDRlx1OEJDQVx1NjVBRFx1RkYwOFx1NTQyQiBET00gXHU3NjdEXHU1QzRGL1x1NjcyQVx1NkUzMlx1NjdEM1x1NjhDMFx1NkQ0Qlx1RkYwOVxuICAgICAgICBjb25zdCByZXBvcnQgPSBhd2FpdCB0aGlzLmNhcHR1cmVEaWFnbm9zdGljcygpO1xuICAgICAgICByZXN1bHQuZGlhZ25vc3RpY3MgPSBbXG4gICAgICAgICAgLi4ucmVwb3J0LmNvbnNvbGUsXG4gICAgICAgICAgLi4ucmVwb3J0Lm5ldHdvcmssXG4gICAgICAgICAgLi4ucmVwb3J0LmRvbSxcbiAgICAgICAgICAuLi5yZXBvcnQuanNFeGNlcHRpb25zLFxuICAgICAgICAgIC4uLnJlcG9ydC5wZXJmb3JtYW5jZSxcbiAgICAgICAgXS5zbGljZSgwLCAxMCk7XG4gICAgICB9XG4gICAgICB0aGlzLnNlc3Npb24uc2V0RXJyb3IobWVzc2FnZSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfVxuXG4gIC8qKiBcdTgzQjdcdTUzRDZcdTk4NzVcdTk3NjJcdTVGRUJcdTcxNjdcdUZGMDhcdTRGOUIgQUkgXHU4OUMyXHU1QkRGXHU5ODc1XHU5NzYyXHVGRjA5ICovXG4gIGFzeW5jIG9ic2VydmUob3B0cz86IFNuYXBzaG90T3B0aW9ucyk6IFByb21pc2U8UGFnZVNuYXBzaG90PiB7XG4gICAgdGhpcy5zZXNzaW9uLnRyYW5zaXRpb24oXCJvYnNlcnZpbmdcIik7XG4gICAgY29uc3Qgc25hcCA9IGF3YWl0IHRoaXMuZW5naW5lLnNuYXBzaG90KG9wdHMgPz8gdGhpcy5vcHRzLnNuYXBzaG90T3B0aW9ucyk7XG4gICAgdGhpcy5zZXNzaW9uLnRyYW5zaXRpb24oXCJvYnNlcnZpbmdcIiwgeyBsYXN0U25hcHNob3RSZWY6IGAke3NuYXAudXJsfSMke3NuYXAudGltZXN0YW1wfWAgfSk7XG4gICAgcmV0dXJuIHNuYXA7XG4gIH1cblxuICAvKiogXHU5MUM3XHU5NkM2XHU1MTY4XHU5MUNGXHU4QzAzXHU4QkQ1XHU4QkNBXHU2NUFEXHVGRjA4NSBcdTY2MUZcdTgwRkRcdTUyOUJcdTY4MzhcdTVGQzNcdUZGMDkgKi9cbiAgYXN5bmMgY2FwdHVyZURpYWdub3N0aWNzKCk6IFByb21pc2U8RGlhZ25vc3RpY1JlcG9ydD4ge1xuICAgIHRoaXMuc2Vzc2lvbi50cmFuc2l0aW9uKFwiZGlhZ25vc2luZ1wiKTtcbiAgICBjb25zdCByYXcgPSBhd2FpdCB0aGlzLmVuZ2luZS5kaWFnbm9zZSgpO1xuICAgIC8vIFx1NUY1Mlx1NEUwMFx1NTMxNlx1RkYxQVx1NUJGOVx1N0YzQVx1NTkzMVx1NzY4NCBkb20vYWNjZXNzaWJpbGl0eSBcdTVCNTdcdTZCQjVcdTUxNUNcdTVFOTVcdUZGMENcdTUxN0NcdTVCQjlcdTY1RTdcdTVGMTVcdTY0Q0VcdThGRDRcdTU2REVcdTc2ODQgNCBcdTVCNTdcdTZCQjVcdTdFRDNcdTY3ODRcbiAgICB0aGlzLmRpYWdub3N0aWNzQ2FjaGUgPSB7XG4gICAgICBjb25zb2xlOiByYXcuY29uc29sZSA/PyBbXSxcbiAgICAgIG5ldHdvcms6IHJhdy5uZXR3b3JrID8/IFtdLFxuICAgICAgZG9tOiByYXcuZG9tID8/IFtdLFxuICAgICAgcGVyZm9ybWFuY2U6IHJhdy5wZXJmb3JtYW5jZSA/PyBbXSxcbiAgICAgIGpzRXhjZXB0aW9uczogcmF3LmpzRXhjZXB0aW9ucyA/PyBbXSxcbiAgICAgIGFjY2Vzc2liaWxpdHk6IHJhdy5hY2Nlc3NpYmlsaXR5ID8/IFtdLFxuICAgIH07XG4gICAgdGhpcy5zZXNzaW9uLnRyYW5zaXRpb24oXCJhY3RpbmdcIik7XG4gICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3NDYWNoZTtcbiAgfVxuXG4gIC8qKiBcdTY3MDBcdThGRDFcdTRFMDBcdTZCMjFcdThCQ0FcdTY1QURcdTYyQTVcdTU0NEEgKi9cbiAgZ2V0IGxhc3REaWFnbm9zdGljcygpOiBEaWFnbm9zdGljUmVwb3J0IHtcbiAgICByZXR1cm4gdGhpcy5kaWFnbm9zdGljc0NhY2hlO1xuICB9XG5cbiAgLyoqIFx1NkNFOFx1NTE2NVx1NjI2N1x1ODg0QyBKU1x1RkYwOFx1OUFEOFx1N0VBN1x1OEJDQVx1NjVBRC9cdThCQzRcdTRGMzBcdUZGMDkgKi9cbiAgYXN5bmMgZXZhbChzY3JpcHQ6IHN0cmluZyk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIHJldHVybiB0aGlzLmVuZ2luZS5ldmFsdWF0ZShzY3JpcHQpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBcdTUxNDNcdTdEMjBcdTVCOUFcdTRGNERcdTU2NjhcdUZGMUFcdTU5MUFcdTdCNTZcdTc1NjVcdTVCOUFcdTRGNERcbiAqXG4gKiBcdTUwMUZcdTkyNzRcdUZGMUFcbiAqIC0gU3RhZ2VoYW5kXHVGRjFBQ1NTIFx1OTAwOVx1NjJFOVx1NTY2OFx1MzAwMVhQYXRoXHUzMDAxQUkgTG9jYXRvclx1MzAwMVx1NjU4N1x1NjcyQ1x1NUI5QVx1NEY0RFxuICogLSBCcm93c2VyLVVzZVx1RkYxQVx1OEJFRFx1NEU0OS9cdTY1ODdcdTY3MkNcdTVCOUFcdTRGNERcbiAqIC0gRGV2VG9vbHMgTUNQXHVGRjFBXHU5MDFBXHU4RkM3IHJlZiBcdTdDQkVcdTc4NkVcdTVCRkJcdTU3NDBcbiAqXG4gKiBcdTVCOUFcdTRGNERcdTRGMThcdTUxNDhcdTdFQTdcdUZGMUFyZWZcdUZGMDhcdTVGRUJcdTcxNjdcdTVGMTVcdTc1MjhcdUZGMDkgPiBzZWxlY3RvciA+IHRleHQgPiBzZW1hbnRpYyA+IGludGVudFxuICovXG5pbXBvcnQgdHlwZSB7IFBhZ2UgfSBmcm9tIFwicGxheXdyaWdodFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvY2F0ZU9wdGlvbnMge1xuICAvKiogXHU1RkVCXHU3MTY3XHU1RjE1XHU3NTI4ICovXG4gIHJlZj86IHN0cmluZztcbiAgLyoqIENTUyBcdTkwMDlcdTYyRTlcdTU2NjggKi9cbiAgc2VsZWN0b3I/OiBzdHJpbmc7XG4gIC8qKiBcdTdDQkVcdTc4NkVcdTY1ODdcdTY3MkMgKi9cbiAgdGV4dD86IHN0cmluZztcbiAgLyoqIFx1OEJFRFx1NEU0OVx1NjNDRlx1OEZGMFx1RkYwOFx1ODFFQVx1NzEzNlx1OEJFRFx1OEEwMFx1RkYwQ1x1NjcwMFx1N0VDOFx1NTZERVx1OTAwMFx1NTIzMCBBSSBcdTg5RTNcdTY3OTBcdUZGMDkgKi9cbiAgc2VtYW50aWM/OiBzdHJpbmc7XG4gIC8qKiBcdThEODVcdTY1RjYgKi9cbiAgdGltZW91dE1zPzogbnVtYmVyO1xufVxuXG4vKiogXHU1QjlBXHU0RjREXHU3RUQzXHU2NzlDXHVGRjFBXHU4RkQ0XHU1NkRFXHU1M0VGXHU2NENEXHU0RjVDXHU3Njg0IGxvY2F0b3IgXHU0RTBFXHU1MTc2XHU2M0NGXHU4RkYwICovXG5leHBvcnQgaW50ZXJmYWNlIExvY2F0ZWQge1xuICBsb2NhdG9yOiBpbXBvcnQoXCJwbGF5d3JpZ2h0XCIpLkxvY2F0b3I7XG4gIC8qKiBcdTVCOUFcdTRGNERcdTY1QjlcdTVGMEZcdThCRjRcdTY2MEVcdUZGMDhcdTRGOUJcdTY1RTVcdTVGRDcvXHU4QkNBXHU2NUFEXHVGRjA5ICovXG4gIHN0cmF0ZWd5OiBcInJlZlwiIHwgXCJzZWxlY3RvclwiIHwgXCJ0ZXh0XCIgfCBcInNlbWFudGljXCI7XG4gIC8qKiBcdTc1MjhcdTRFOEVcdTdDQkVcdTc4NkVcdTk1MUFcdTVCOUFcdTc2ODRcdTU1MkZcdTRFMDAgQ1NTIFx1OTAwOVx1NjJFOVx1NTY2OFx1RkYwOFx1NEY5Qlx1NTQwRVx1N0VFRFx1OEJDQVx1NjVBRC9cdTkxQ0RcdThCRDVcdUZGMDkgKi9cbiAgYW5jaG9yU2VsZWN0b3I6IHN0cmluZztcbn1cblxuLyoqXG4gKiBcdThCRURcdTRFNDlcdTg5RTNcdTY3OTBcdTU2NjhcdTU2REVcdThDMDNcdUZGMUFcdTYyOEFcdTgxRUFcdTcxMzZcdThCRURcdThBMDBcdThCRURcdTRFNDlcdTYzQ0ZcdThGRjBcdTg5RTNcdTY3OTBcdTRFM0FcdTUzRUZcdTVCOUFcdTRGNERcdTUzQzJcdTY1NzBcdTMwMDJcbiAqIFx1NzUzMVx1NUYxNVx1NjRDRVx1NTcyOFx1NTIxRFx1NTlDQlx1NTMxNlx1NjVGNlx1NkNFOFx1NTE2NVx1RkYwOFx1OTAxQVx1NUUzOFx1NTdGQVx1NEU4RSBhaS1sYXllciBcdTc2ODRcdThCRURcdTRFNDlcdTVCOUFcdTRGNERcdTU2NjhcdUZGMENcdTdFRDNcdTU0MDhcdTVGRUJcdTcxNjdcdTUwNUFcbiAqIFx1NEUyRFx1NjU4N1x1NTIwNlx1OEJDRC9cdThCRURcdTRFNDlcdTc2RjhcdTRGM0NcdTVFQTZcdTUzMzlcdTkxNERcdUZGMDlcdUZGMENcdTRFQ0VcdTgwMENcdTYyNTNcdTkwMUFcdTMwMENBSSBcdThCRURcdTRFNDlcdTVDNDIgXHUyMTkyIFx1NUYxNVx1NjRDRVx1N0NCRVx1Nzg2RVx1NUI5QVx1NEY0RFx1MzAwRFx1NzY4NFx1OTRGRVx1OERFRlx1MzAwMlxuICogXHU4RkQ0XHU1NkRFIG51bGwgXHU4ODY4XHU3OTNBXHU2NzJBXHU1NDdEXHU0RTJEXHUzMDAyXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VtYW50aWNSZXNvbHZlciB7XG4gIHJlc29sdmUoc2VtYW50aWM6IHN0cmluZyk6IFByb21pc2U8eyByZWY/OiBzdHJpbmc7IHRleHQ/OiBzdHJpbmc7IHNlbGVjdG9yPzogc3RyaW5nIH0gfCBudWxsPjtcbn1cblxuY29uc3QgSU5URVJBQ1RJVkVfU0VMRUNUT1IgPSBbXG4gIFwiYVtocmVmXVwiLFxuICBcImJ1dHRvblwiLFxuICBcImlucHV0Om5vdChbdHlwZT0naGlkZGVuJ10pXCIsXG4gIFwic2VsZWN0XCIsXG4gIFwidGV4dGFyZWFcIixcbiAgXCJbcm9sZT0nYnV0dG9uJ11cIixcbiAgXCJbcm9sZT0nbGluayddXCIsXG4gIFwiW2NvbnRlbnRlZGl0YWJsZT0ndHJ1ZSddXCIsXG4gIFwibGFiZWxcIixcbl0uam9pbihcIiwgXCIpO1xuXG5leHBvcnQgY2xhc3MgRWxlbWVudExvY2F0b3Ige1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBhZ2U6IFBhZ2UsIHByaXZhdGUgc2VtYW50aWNSZXNvbHZlcj86IFNlbWFudGljUmVzb2x2ZXIpIHt9XG5cbiAgLyoqXG4gICAqIFx1NjgzOVx1NjM2RVx1NTJBOFx1NEY1Q1x1NTNDMlx1NjU3MFx1NUI5QVx1NEY0RFx1NTE0M1x1N0QyMFx1RkYwQ1x1NTkxQVx1N0I1Nlx1NzU2NVx1NEY5RFx1NkIyMVx1NTZERVx1OTAwMFx1MzAwMlxuICAgKiBcdTYyN0VcdTRFMERcdTUyMzBcdTY1RjZcdTYyOUJcdTUxRkFcdTVFMjZcdThCQ0FcdTY1QURcdTYzRDBcdTc5M0FcdTc2ODRcdTk1MTlcdThCRUZcdTMwMDJcbiAgICovXG4gIGFzeW5jIGxvY2F0ZShvcHRzOiBMb2NhdGVPcHRpb25zKTogUHJvbWlzZTxMb2NhdGVkPiB7XG4gICAgY29uc3QgeyByZWYsIHNlbGVjdG9yLCB0ZXh0LCBzZW1hbnRpYyB9ID0gb3B0cztcblxuICAgIC8vIDEpIHJlZiBcdTVCOUFcdTRGNERcdUZGMDhcdTY3MDBcdTlBRDhcdTY1NDhcdTMwMDFcdTY3MDBcdTdDQkVcdTc4NkVcdUZGMENcdTY3NjVcdTgxRUFcdTVGRUJcdTcxNjdcdTRFQTRcdTRFOTJcdTdEMjJcdTVGMTVcdUZGMDlcbiAgICBpZiAocmVmKSB7XG4gICAgICBjb25zdCBieVJlZiA9IHRoaXMubG9jYXRlQnlSZWYocmVmKTtcbiAgICAgIGlmICgoYXdhaXQgYnlSZWYuY291bnQoKSkpIHtcbiAgICAgICAgcmV0dXJuIHsgbG9jYXRvcjogYnlSZWYuZmlyc3QoKSwgc3RyYXRlZ3k6IFwicmVmXCIsIGFuY2hvclNlbGVjdG9yOiBhd2FpdCB0aGlzLnRvQ3NzKGJ5UmVmLmZpcnN0KCkpIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gMikgQ1NTIFx1OTAwOVx1NjJFOVx1NTY2OFxuICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgY29uc3QgbG9jID0gdGhpcy5wYWdlLmxvY2F0b3Ioc2VsZWN0b3IpO1xuICAgICAgaWYgKChhd2FpdCBsb2MuY291bnQoKSkpIHtcbiAgICAgICAgcmV0dXJuIHsgbG9jYXRvcjogbG9jLmZpcnN0KCksIHN0cmF0ZWd5OiBcInNlbGVjdG9yXCIsIGFuY2hvclNlbGVjdG9yOiBzZWxlY3RvciB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIDMpIFx1N0NCRVx1Nzg2RVx1NjU4N1x1NjcyQ1x1RkYwOFx1NTNFRlx1NEVBNFx1NEU5Mlx1NTE0M1x1N0QyMFx1NTE4NVx1RkYwOVxuICAgIGlmICh0ZXh0KSB7XG4gICAgICBjb25zdCBieVRleHQgPSB0aGlzLmxvY2F0ZUJ5VGV4dCh0ZXh0KTtcbiAgICAgIGlmICgoYXdhaXQgYnlUZXh0LmNvdW50KCkpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbG9jYXRvcjogYnlUZXh0LmZpcnN0KCksXG4gICAgICAgICAgc3RyYXRlZ3k6IFwidGV4dFwiLFxuICAgICAgICAgIGFuY2hvclNlbGVjdG9yOiBhd2FpdCB0aGlzLnRvQ3NzKGJ5VGV4dC5maXJzdCgpKSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyA0KSBcdThCRURcdTRFNDlcdTU2REVcdTkwMDBcdUZGMUFcdTVDMURcdThCRDUgcm9sZS9uYW1lIFx1N0VDNFx1NTQwOFx1RkYwQ1x1NTE4RFx1NzUyOCBhaS1sYXllciBcdThCRURcdTRFNDlcdTVCOUFcdTRGNERcdTU2NjhcdUZGMDhcdTRFMkRcdTY1ODdcdTUyMDZcdThCQ0QvXHU4QkVEXHU0RTQ5XHU3NkY4XHU0RjNDXHU1RUE2XHVGRjA5XG4gICAgaWYgKHNlbWFudGljKSB7XG4gICAgICBjb25zdCBieVNlbWFudGljID0gdGhpcy5sb2NhdGVCeVNlbWFudGljKHNlbWFudGljKTtcbiAgICAgIGlmICgoYXdhaXQgYnlTZW1hbnRpYy5jb3VudCgpKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGxvY2F0b3I6IGJ5U2VtYW50aWMuZmlyc3QoKSxcbiAgICAgICAgICBzdHJhdGVneTogXCJzZW1hbnRpY1wiLFxuICAgICAgICAgIGFuY2hvclNlbGVjdG9yOiBhd2FpdCB0aGlzLnRvQ3NzKGJ5U2VtYW50aWMuZmlyc3QoKSksXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICAvLyBhcmlhL3BsYWNlaG9sZGVyL3RpdGxlIFx1NjcyQVx1NTQ3RFx1NEUyRCBcdTIxOTIgXHU0RUE0XHU3RUQ5XHU4QkVEXHU0RTQ5XHU1QjlBXHU0RjREXHU1NjY4XHVGRjA4XHU1N0ZBXHU0RThFXHU1RkVCXHU3MTY3XHU1MDVBXHU4QkVEXHU0RTQ5XHU3NkY4XHU0RjNDXHU1RUE2XHU1MzM5XHU5MTREXHVGRjA5XG4gICAgICBpZiAodGhpcy5zZW1hbnRpY1Jlc29sdmVyKSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkID0gYXdhaXQgdGhpcy5zZW1hbnRpY1Jlc29sdmVyLnJlc29sdmUoc2VtYW50aWMpO1xuICAgICAgICBpZiAocmVzb2x2ZWQ/LnJlZiB8fCByZXNvbHZlZD8uc2VsZWN0b3IgfHwgcmVzb2x2ZWQ/LnRleHQpIHtcbiAgICAgICAgICBjb25zdCBieVJlc29sdmVkID0gcmVzb2x2ZWQuc2VsZWN0b3JcbiAgICAgICAgICAgID8gdGhpcy5wYWdlLmxvY2F0b3IocmVzb2x2ZWQuc2VsZWN0b3IpXG4gICAgICAgICAgICA6IHJlc29sdmVkLnRleHRcbiAgICAgICAgICAgICAgPyB0aGlzLmxvY2F0ZUJ5VGV4dChyZXNvbHZlZC50ZXh0KVxuICAgICAgICAgICAgICA6IHRoaXMubG9jYXRlQnlSZWYocmVzb2x2ZWQucmVmISk7XG4gICAgICAgICAgaWYgKChhd2FpdCBieVJlc29sdmVkLmNvdW50KCkpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBsb2NhdG9yOiBieVJlc29sdmVkLmZpcnN0KCksXG4gICAgICAgICAgICAgIHN0cmF0ZWd5OiBcInNlbWFudGljXCIsXG4gICAgICAgICAgICAgIGFuY2hvclNlbGVjdG9yOiByZXNvbHZlZC5zZWxlY3RvciB8fCAoYXdhaXQgdGhpcy50b0NzcyhieVJlc29sdmVkLmZpcnN0KCkpKSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFx1NjVFMFx1NkNENVx1NUI5QVx1NEY0RFx1NTE0M1x1N0QyMFx1RkYxQXJlZj0ke3JlZiA/PyBcIi1cIn0gc2VsZWN0b3I9JHtzZWxlY3RvciA/PyBcIi1cIn0gdGV4dD0ke3RleHQgPz8gXCItXCJ9IHNlbWFudGljPSR7c2VtYW50aWMgPz8gXCItXCJ9LiBgICtcbiAgICAgICAgYFx1NUVGQVx1OEJBRVx1OEMwM1x1NzUyOCBvYnNlcnZlKCkgXHU4M0I3XHU1M0Q2XHU2NzAwXHU2NUIwXHU1RkVCXHU3MTY3XHU1NDBFXHU5MUNEXHU4QkQ1XHVGRjBDXHU2MjE2XHU0RjdGXHU3NTI4IGRpYWdub3NlKCkgXHU2OEMwXHU2N0U1IERPTSBcdTcyQjZcdTYwMDFcdTMwMDJgXG4gICAgKTtcbiAgfVxuXG4gIC8qKiBcdTkwMUFcdThGQzdcdTVGRUJcdTcxNjcgcmVmIFx1NUI5QVx1NEY0RFx1RkYxQXJlZiBcdTUxODVcdTVENENcdTRFODZcdTkwMDlcdTYyRTlcdTU2NjhcdTRGRTFcdTYwNkZcdUZGMDhkYXRhLWZvcmdlLXJlZlx1RkYwOSAqL1xuICBwcml2YXRlIGxvY2F0ZUJ5UmVmKHJlZjogc3RyaW5nKTogaW1wb3J0KFwicGxheXdyaWdodFwiKS5Mb2NhdG9yIHtcbiAgICAvLyBcdTRGMThcdTUxNDhcdTdDQkVcdTc4NkVcdTUzMzlcdTkxNEQgZGF0YS1mb3JnZS1yZWYgXHU1QzVFXHU2MDI3XHVGRjBDXHU4MkU1XHU2NzJBXHU1NDdEXHU0RTJEXHU1MjE5XHU3NTI4XHU2QTIxXHU3Q0NBXHU1MzM5XHU5MTREXG4gICAgcmV0dXJuIHRoaXMucGFnZS5sb2NhdG9yKGBbZGF0YS1mb3JnZS1yZWY9XCIke3JlZn1cIl0sIFtkYXRhLWZvcmdlLXJlZio9XCIke3JlZn1cIl1gKTtcbiAgfVxuXG4gIC8qKiBcdTY1ODdcdTY3MkNcdTVCOUFcdTRGNERcdUZGMUFcdTU3MjhcdTUzRUZcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTUxODVcdTY3RTVcdTYyN0VcdTUzMDVcdTU0MkJcdTYzMDdcdTVCOUFcdTY1ODdcdTY3MkNcdTgwMDUgKi9cbiAgcHJpdmF0ZSBsb2NhdGVCeVRleHQodGV4dDogc3RyaW5nKTogaW1wb3J0KFwicGxheXdyaWdodFwiKS5Mb2NhdG9yIHtcbiAgICByZXR1cm4gdGhpcy5wYWdlLmxvY2F0b3IoSU5URVJBQ1RJVkVfU0VMRUNUT1IpLmZpbHRlcih7IGhhc1RleHQ6IHRleHQgfSk7XG4gIH1cblxuICAvKiogXHU4QkVEXHU0RTQ5XHU1QjlBXHU0RjREXHVGRjFBXHU1QzFEXHU4QkQ1IGFyaWEtbGFiZWwgLyBwbGFjZWhvbGRlciAvIHRpdGxlICovXG4gIHByaXZhdGUgbG9jYXRlQnlTZW1hbnRpYyhzZW1hbnRpYzogc3RyaW5nKTogaW1wb3J0KFwicGxheXdyaWdodFwiKS5Mb2NhdG9yIHtcbiAgICByZXR1cm4gdGhpcy5wYWdlXG4gICAgICAubG9jYXRvcihgJHtJTlRFUkFDVElWRV9TRUxFQ1RPUn1bYXJpYS1sYWJlbCo9XCIke3NlbWFudGljfVwiXSwgJHtJTlRFUkFDVElWRV9TRUxFQ1RPUn1bcGxhY2Vob2xkZXIqPVwiJHtzZW1hbnRpY31cIl0sICR7SU5URVJBQ1RJVkVfU0VMRUNUT1J9W3RpdGxlKj1cIiR7c2VtYW50aWN9XCJdYClcbiAgICAgIC5maXJzdCgpO1xuICB9XG5cbiAgLyoqIFx1NUMwNiBsb2NhdG9yIFx1OEY2Q1x1NjIxMFx1NTUyRlx1NEUwMCBDU1MgXHU5MDA5XHU2MkU5XHU1NjY4XHVGRjA4XHU3NTI4XHU0RThFXHU4QkNBXHU2NUFEXHU5NTFBXHU1QjlBXHVGRjA5ICovXG4gIHByaXZhdGUgYXN5bmMgdG9Dc3MobG9jOiBpbXBvcnQoXCJwbGF5d3JpZ2h0XCIpLkxvY2F0b3IpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gKGF3YWl0IGxvYy5ldmFsdWF0ZSgoZWw6IEVsZW1lbnQpID0+IHtcbiAgICAgICAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGxldCBjdXI6IEVsZW1lbnQgfCBudWxsID0gZWw7XG4gICAgICAgIHdoaWxlIChjdXIgJiYgY3VyLm5vZGVUeXBlID09PSAxICYmIHBhcnRzLmxlbmd0aCA8IDUpIHtcbiAgICAgICAgICBsZXQgc2VnID0gY3VyLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICBpZiAoY3VyLmlkKSB7XG4gICAgICAgICAgICBzZWcgKz0gYCMke2N1ci5pZH1gO1xuICAgICAgICAgICAgcGFydHMudW5zaGlmdChzZWcpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjdXIuY2xhc3NMaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgc2VnICs9IFwiLlwiICsgQXJyYXkuZnJvbShjdXIuY2xhc3NMaXN0KS5zbGljZSgwLCAyKS5qb2luKFwiLlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFydHMudW5zaGlmdChzZWcpO1xuICAgICAgICAgIGN1ciA9IGN1ci5wYXJlbnRFbGVtZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXJ0cy5qb2luKFwiID4gXCIpO1xuICAgICAgfSkpIGFzIHN0cmluZztcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogXHU5ODc1XHU5NzYyXHU1RkVCXHU3MTY3XHU3NTFGXHU2MjEwXHU1NjY4XG4gKlxuICogXHU1MDFGXHU5Mjc0IENocm9tZSBEZXZUb29scyBNQ1AgXHU3Njg0IFRva2VuIFx1OUFEOFx1NjU0OFx1N0I1Nlx1NzU2NVx1RkYxQVxuICogLSBcdTVDNUVcdTYwMjdcdTc2N0RcdTU0MERcdTUzNTVcdTg4QzFcdTUyNkFcdUZGMDhcdTkwN0ZcdTUxNERcdTUxNjhcdTkxQ0ZcdTVDNUVcdTYwMjdcdTcyMDZcdTcwQjhcdUZGMDlcbiAqIC0gXHU4MjgyXHU3MEI5XHU2NTcwXHU0RTBBXHU5NjUwICsgXHU2REYxXHU1RUE2XHU4OEMxXHU1MjZBXG4gKiAtIFx1NjU4N1x1NjcyQ1x1OTU3Rlx1NUVBNlx1ODhDMVx1NTI2QVxuICogLSBcdTc1MUZcdTYyMTBcdTUzRUZcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTdEMjJcdTVGMTVcdUZGMDhcdTRGOUIgQUkgXHU2MzExXHU5MDA5IHJlZlx1RkYwOVxuICogLSBcdTRFM0FcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTc1MUZcdTYyMTBcdTdBMzNcdTVCOUEgZGF0YS1mb3JnZS1yZWYgXHU0RkJGXHU0RThFXHU3Q0JFXHU3ODZFXHU1QjlBXHU0RjREXG4gKi9cbmltcG9ydCB0eXBlIHsgUGFnZSB9IGZyb20gXCJwbGF5d3JpZ2h0XCI7XG5pbXBvcnQgdHlwZSB7IFBhZ2VTbmFwc2hvdCwgU25hcHNob3ROb2RlLCBTbmFwc2hvdE9wdGlvbnMgfSBmcm9tIFwiQG9wZW5saXVsYW4vY29yZVwiO1xuXG5jb25zdCBBVFRSX1dISVRFTElTVCA9IFtcImlkXCIsIFwiY2xhc3NcIiwgXCJuYW1lXCIsIFwidHlwZVwiLCBcInZhbHVlXCIsIFwiaHJlZlwiLCBcInBsYWNlaG9sZGVyXCIsIFwidGl0bGVcIiwgXCJhcmlhLWxhYmVsXCIsIFwicm9sZVwiLCBcImRhdGEtdGVzdGlkXCIsIFwic3JjXCIsIFwiYWx0XCIsIFwiY2hlY2tlZFwiLCBcInNlbGVjdGVkXCIsIFwiZGlzYWJsZWRcIiwgXCJ0YXJnZXRcIl07XG5jb25zdCBURVhUX1RBR1MgPSBuZXcgU2V0KFtcIlBcIiwgXCJIMVwiLCBcIkgyXCIsIFwiSDNcIiwgXCJINFwiLCBcIkg1XCIsIFwiSDZcIiwgXCJBXCIsIFwiQlVUVE9OXCIsIFwiSU5QVVRcIiwgXCJURVhUQVJFQVwiLCBcIlNFTEVDVFwiLCBcIk9QVElPTlwiLCBcIkxJXCIsIFwiVERcIiwgXCJUSFwiLCBcIlNQQU5cIiwgXCJMQUJFTFwiLCBcIkNBUFRJT05cIiwgXCJTVU1NQVJZXCJdKTtcbmNvbnN0IFBSVU5FX1RBR1MgPSBuZXcgU2V0KFtcIlNDUklQVFwiLCBcIlNUWUxFXCIsIFwiTk9TQ1JJUFRcIiwgXCJURU1QTEFURVwiLCBcIklGUkFNRVwiLCBcIkhFQURcIiwgXCJNRVRBXCIsIFwiTElOS1wiLCBcIlNWR1wiXSk7XG5jb25zdCBJTlRFUkFDVElWRV9UQUdTID0gbmV3IFNldChbXCJBXCIsIFwiQlVUVE9OXCIsIFwiSU5QVVRcIiwgXCJTRUxFQ1RcIiwgXCJURVhUQVJFQVwiLCBcIk9QVElPTlwiLCBcIlNVTU1BUllcIl0pO1xuY29uc3QgSU5URVJBQ1RJVkVfUk9MRVMgPSBuZXcgU2V0KFtcImJ1dHRvblwiLCBcImxpbmtcIiwgXCJ0ZXh0Ym94XCIsIFwiY29tYm9ib3hcIiwgXCJjaGVja2JveFwiLCBcInJhZGlvXCIsIFwidGFiXCIsIFwibWVudWl0ZW1cIl0pO1xuXG5leHBvcnQgY2xhc3MgU25hcHNob3RCdWlsZGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwYWdlOiBQYWdlKSB7fVxuXG4gIGFzeW5jIGJ1aWxkKG9wdHM6IFNuYXBzaG90T3B0aW9ucyA9IHt9KTogUHJvbWlzZTxQYWdlU25hcHNob3Q+IHtcbiAgICBjb25zdCBtYXhOb2RlcyA9IG9wdHMubWF4Tm9kZXMgPz8gMjAwO1xuICAgIGNvbnN0IG1heFRleHQgPSBvcHRzLm1heFRleHRMZW5ndGggPz8gODA7XG4gICAgY29uc3Qgd2l0aFNlbGVjdG9ycyA9IG9wdHMud2l0aFNlbGVjdG9ycyA/PyB0cnVlO1xuXG4gICAgLy8gXHU2Q0U4XHU1MTY1XHU4Rjg1XHU1MkE5XHU4MTFBXHU2NzJDXHVGRjBDXHU2RDRGXHU4OUM4XHU1NjY4XHU3QUVGXHU4OEMxXHU1MjZBXHU5MDREXHU1Mzg2IERPTVx1RkYwOFx1NkJENCBOb2RlIFx1N0FFRlx1OTAxMFx1ODI4Mlx1NzBCOVx1NjZGNFx1OUFEOFx1NjU0OFx1RkYwOVxuICAgIC8vIFx1NkNFOFx1NjEwRlx1RkYxQW5vZGUgXHU2QTIxXHU1NzU3XHU0RjVDXHU3NTI4XHU1N0RGXHU1RTM4XHU5MUNGXHVGRjA4UFJVTkVfVEFHUy9URVhUX1RBR1MvSU5URVJBQ1RJVkVfUk9MRVMvd2l0aFNlbGVjdG9ycyBcdTdCNDlcdUZGMDlcbiAgICAvLyBcdTU3MjggcGFnZS5ldmFsdWF0ZSBcdTc2ODRcdTZENEZcdTg5QzhcdTU2NjhcdTYyNjdcdTg4NENcdTRFMEFcdTRFMEJcdTY1ODdcdTRFMkRcdTRFMERcdTUzRUZcdTg5QzFcdUZGMENcdTRFMTQgU2V0IFx1NjVFMFx1NkNENVx1OTAxQVx1OEZDN1x1NUU4Rlx1NTIxN1x1NTMxNlx1NEZERFx1NzU1OVx1RkYwQ1xuICAgIC8vIFx1NTZFMFx1NkI2NFx1NUZDNVx1OTg3Qlx1NEY1Q1x1NEUzQVx1NjU3MFx1N0VDNFx1NTNDMlx1NjU3MFx1NjYzRVx1NUYwRlx1NEYyMFx1NTE2NVx1NUU3Nlx1NTcyOFx1NkQ0Rlx1ODlDOFx1NTY2OFx1N0FFRlx1NzUyOCAuaW5jbHVkZXMoKSBcdTUyMjRcdTY1QURcdUZGMENcbiAgICAvLyBcdTU0MjZcdTUyMTlcdTc3MUZcdTVCOUVcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTRGMUFcdTYyOUIgUmVmZXJlbmNlRXJyb3IgLyBUeXBlRXJyb3JcdUZGMDhcdThGRDlcdTZCNjNcdTY2MkZcdTUzNTVcdTZENEJcdTUzRDFcdTczQjBcdTRFMERcdTRFODZcdTc2ODRcdThGRDBcdTg4NENcdTY3MUZcdTdGM0FcdTk2NzdcdUZGMDlcdTMwMDJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnBhZ2UuZXZhbHVhdGUoXG4gICAgICAoeyBtYXhOb2RlcywgbWF4VGV4dCwgcHJ1bmVEZWVwLCBpbmNsdWRlSGlkZGVuLCB3aXRoU2VsZWN0b3JzLCBQUlVORV9UQUdTLCBURVhUX1RBR1MsIEFUVFJfV0hJVEVMSVNULCBJTlRFUkFDVElWRV9UQUdTLCBJTlRFUkFDVElWRV9ST0xFUyB9KSA9PiB7XG4gICAgICAgIGNvbnN0IG91dDoge1xuICAgICAgICAgIHVybDogc3RyaW5nO1xuICAgICAgICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgICAgICAgcmVhZHlTdGF0ZTogc3RyaW5nO1xuICAgICAgICAgIHRvdGFsTm9kZXM6IG51bWJlcjtcbiAgICAgICAgICByb290OiBhbnk7XG4gICAgICAgICAgaW50ZXJhY3RpdmU6IGFueVtdO1xuICAgICAgICB9ID0ge1xuICAgICAgICAgIHVybDogbG9jYXRpb24uaHJlZixcbiAgICAgICAgICB0aXRsZTogZG9jdW1lbnQudGl0bGUsXG4gICAgICAgICAgcmVhZHlTdGF0ZTogZG9jdW1lbnQucmVhZHlTdGF0ZSxcbiAgICAgICAgICB0b3RhbE5vZGVzOiAwLFxuICAgICAgICAgIHJvb3Q6IG51bGwgYXMgYW55LFxuICAgICAgICAgIGludGVyYWN0aXZlOiBbXSxcbiAgICAgICAgfTtcblxuICAgICAgICBsZXQgZW1pdHRlZCA9IDA7XG4gICAgICAgIGxldCB0cnVuY2F0ZWROb2RlcyA9IDA7XG4gICAgICAgIGNvbnN0IHJlZkNvdW50ZXIgPSB7IG46IDAgfTtcblxuICAgICAgICBjb25zdCBpc1Zpc2libGUgPSAoZWw6IEVsZW1lbnQpOiBib29sZWFuID0+IHtcbiAgICAgICAgICBjb25zdCByID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgY29uc3QgcyA9IGdldENvbXB1dGVkU3R5bGUoZWwpO1xuICAgICAgICAgIHJldHVybiBzLmRpc3BsYXkgIT09IFwibm9uZVwiICYmIHMudmlzaWJpbGl0eSAhPT0gXCJoaWRkZW5cIiAmJiByLndpZHRoID4gMCAmJiByLmhlaWdodCA+IDA7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXNJbnRlcmFjdGl2ZSA9IChlbDogRWxlbWVudCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgIGlmIChJTlRFUkFDVElWRV9UQUdTLmluY2x1ZGVzKGVsLnRhZ05hbWUpKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICBjb25zdCByb2xlID0gZWwuZ2V0QXR0cmlidXRlKFwicm9sZVwiKTtcbiAgICAgICAgICByZXR1cm4gISFyb2xlICYmIElOVEVSQUNUSVZFX1JPTEVTLmluY2x1ZGVzKHJvbGUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFx1NjU0Rlx1NjExRlx1OEY5M1x1NTE2NVx1N0M3Qlx1NTc4Qlx1RkYwOFx1NUJDNlx1NzgwMS9cdTRFRTRcdTcyNEMvXHU1QkM2XHU5NEE1XHU3QjQ5XHVGRjA5XHUyMDE0XHUyMDE0IFx1NTAzQ1x1NUZDNVx1OTg3Qlx1ODEzMVx1NjU0Rlx1RkYwQ1x1OTYzMlx1NEVFNFx1NzI0Qy9cdTUzRTNcdTRFRTRcdTZDQzRcdTk3MzJcbiAgICAgICAgY29uc3QgU0VOU0lUSVZFX0lOUFVUX1RZUEVTID0gW1wicGFzc3dvcmRcIiwgXCJ0b2tlblwiLCBcInNlY3JldFwiLCBcImtleVwiLCBcImFwaS1rZXlcIiwgXCJhcGlrZXlcIl07XG4gICAgICAgIGNvbnN0IGlzU2Vuc2l0aXZlSW5wdXQgPSAoZWw6IEVsZW1lbnQpOiBib29sZWFuID0+IHtcbiAgICAgICAgICBpZiAoZWwudGFnTmFtZSAhPT0gXCJJTlBVVFwiKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgY29uc3QgdCA9IChlbCBhcyBIVE1MSW5wdXRFbGVtZW50KS50eXBlPy50b0xvd2VyQ2FzZSgpID8/IFwiXCI7XG4gICAgICAgICAgY29uc3QgbiA9ICgoZWwuZ2V0QXR0cmlidXRlKFwibmFtZVwiKSB8fCBcIlwiKSArIChlbC5nZXRBdHRyaWJ1dGUoXCJhdXRvY29tcGxldGVcIikgfHwgXCJcIikpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgaWYgKHQgPT09IFwicGFzc3dvcmRcIikgcmV0dXJuIHRydWU7XG4gICAgICAgICAgaWYgKFNFTlNJVElWRV9JTlBVVF9UWVBFUy5pbmNsdWRlcyh0KSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgcmV0dXJuIC8ocGFzc3dvcmR8cGFzc3dkfHRva2VufHNlY3JldHxhcGlbXy1dP2tleXxhdXRoKS8udGVzdChuKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgZWxUZXh0ID0gKGVsOiBFbGVtZW50KTogc3RyaW5nID0+IHtcbiAgICAgICAgICBpZiAoZWwudGFnTmFtZSA9PT0gXCJJTlBVVFwiKSB7XG4gICAgICAgICAgICBjb25zdCBwaCA9IGVsLmdldEF0dHJpYnV0ZShcInBsYWNlaG9sZGVyXCIpIHx8IFwiXCI7XG4gICAgICAgICAgICAvLyBcdTY1NEZcdTYxMUZcdThGOTNcdTUxNjVcdTY4NDZcdTRFMERcdThGRDRcdTU2REVcdTc3MUZcdTVCOUVcdTUwM0NcdUZGMENcdTRFQzVcdTc1MjhcdTUzNjBcdTRGNERcdTdCMjZcdUZGMDhcdTk2MzJcdTRFRTRcdTcyNEMvXHU1QkM2XHU3ODAxXHU1MTY1XHU1RkVCXHU3MTY3XHVGRjA5XG4gICAgICAgICAgICBpZiAoaXNTZW5zaXRpdmVJbnB1dChlbCkpIHJldHVybiBwaCA/IGBbXHU2NTRGXHU2MTFGXHU4RjkzXHU1MTY1XSAke3BofWAgOiBcIltcdTY1NEZcdTYxMUZcdThGOTNcdTUxNjVcdTVERjJcdTk2OTBcdTg1Q0ZdXCI7XG4gICAgICAgICAgICBjb25zdCB2ID0gKGVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIHYgfHwgcGggfHwgXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGVsLnRhZ05hbWUgPT09IFwiU0VMRUNUXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlbCA9IGVsIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xuICAgICAgICAgICAgcmV0dXJuIHNlbC5zZWxlY3RlZE9wdGlvbnNbMF0/LnRleHQgfHwgXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgdCA9IChlbC50ZXh0Q29udGVudCB8fCBcIlwiKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCk7XG4gICAgICAgICAgcmV0dXJuIHQuc2xpY2UoMCwgbWF4VGV4dCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgd2FsayA9IChlbDogRWxlbWVudCwgZGVwdGg6IG51bWJlcik6IGFueSA9PiB7XG4gICAgICAgICAgaWYgKGVtaXR0ZWQgPj0gbWF4Tm9kZXMpIHtcbiAgICAgICAgICAgIHRydW5jYXRlZE5vZGVzKys7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKFBSVU5FX1RBR1MuaW5jbHVkZXMoZWwudGFnTmFtZSkpIHJldHVybiBudWxsO1xuICAgICAgICAgIGlmICghaW5jbHVkZUhpZGRlbiAmJiAhaXNWaXNpYmxlKGVsKSkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgaWYgKHBydW5lRGVlcCAmJiBkZXB0aCA+IDI1KSByZXR1cm4gbnVsbDtcblxuICAgICAgICAgIG91dC50b3RhbE5vZGVzKys7XG4gICAgICAgICAgZW1pdHRlZCsrO1xuXG4gICAgICAgICAgY29uc3Qgbm9kZTogYW55ID0ge1xuICAgICAgICAgICAgcmVmOiBgciR7cmVmQ291bnRlci5uKyt9YCxcbiAgICAgICAgICAgIHRhZzogZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxuICAgICAgICAgICAgdGV4dDogVEVYVF9UQUdTLmluY2x1ZGVzKGVsLnRhZ05hbWUpID8gZWxUZXh0KGVsKSA6IFwiXCIsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7fSxcbiAgICAgICAgICAgIGludGVyYWN0aXZlOiBpc0ludGVyYWN0aXZlKGVsKSxcbiAgICAgICAgICAgIGRlcHRoLFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgQVRUUl9XSElURUxJU1QpIHtcbiAgICAgICAgICAgIGxldCB2ID0gZWwuZ2V0QXR0cmlidXRlKGF0dHIpO1xuICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgLy8gXHU2NTRGXHU2MTFGXHU4RjkzXHU1MTY1XHU2ODQ2XHU3Njg0IHZhbHVlIFx1NUM1RVx1NjAyN1x1NUZDNVx1OTg3Qlx1ODEzMVx1NjU0Rlx1RkYwOFx1OTYzMlx1NEVFNFx1NzI0Qy9cdTVCQzZcdTc4MDFcdTUxNjVcdTVGRUJcdTcxNjdcdUZGMDlcbiAgICAgICAgICAgICAgaWYgKGF0dHIgPT09IFwidmFsdWVcIiAmJiBpc1NlbnNpdGl2ZUlucHV0KGVsKSkge1xuICAgICAgICAgICAgICAgIHYgPSBcIioqKlJFREFDVEVEKioqXCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbm9kZS5hdHRyaWJ1dGVzW2F0dHJdID0gdi5zbGljZSgwLCA2MCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3Qgcm9sZSA9IGVsLmdldEF0dHJpYnV0ZShcInJvbGVcIik7XG4gICAgICAgICAgaWYgKHJvbGUpIG5vZGUucm9sZSA9IHJvbGU7XG4gICAgICAgICAgaWYgKHdpdGhTZWxlY3RvcnMgJiYgKG5vZGUuaW50ZXJhY3RpdmUgfHwgbm9kZS5hdHRyaWJ1dGVzLmlkKSkge1xuICAgICAgICAgICAgLy8gXHU3NTFGXHU2MjEwXHU3QTMzXHU1QjlBIHJlZiBcdTVDNUVcdTYwMjdcdTRGQkZcdTRFOEVcdTU0MEVcdTdFRURcdTVCOUFcdTRGNERcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShcImRhdGEtZm9yZ2UtcmVmXCIsIG5vZGUucmVmKTtcbiAgICAgICAgICAgIG5vZGUuc2VsZWN0b3IgPSBlbC5pZFxuICAgICAgICAgICAgICA/IGAke2VsLnRhZ05hbWUudG9Mb3dlckNhc2UoKX0jJHtlbC5pZH1gXG4gICAgICAgICAgICAgIDogYCR7ZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpfVtkYXRhLWZvcmdlLXJlZj1cIiR7bm9kZS5yZWZ9XCJdYDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobm9kZS5pbnRlcmFjdGl2ZSkge1xuICAgICAgICAgICAgb3V0LmludGVyYWN0aXZlLnB1c2goe1xuICAgICAgICAgICAgICByZWY6IG5vZGUucmVmLFxuICAgICAgICAgICAgICB0YWc6IG5vZGUudGFnLFxuICAgICAgICAgICAgICB0ZXh0OiBub2RlLnRleHQgfHwgZWxUZXh0KGVsKSxcbiAgICAgICAgICAgICAgcm9sZTogcm9sZSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIHNlbGVjdG9yOiBub2RlLnNlbGVjdG9yLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgY2hpbGRyZW46IGFueVtdID0gW107XG4gICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKGVsLmNoaWxkcmVuKSkge1xuICAgICAgICAgICAgY29uc3QgYyA9IHdhbGsoY2hpbGQsIGRlcHRoICsgMSk7XG4gICAgICAgICAgICBpZiAoYykgY2hpbGRyZW4ucHVzaChjKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNoaWxkcmVuLmxlbmd0aCkgbm9kZS5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuXG4gICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgIH07XG5cbiAgICAgICAgb3V0LnJvb3QgPSB3YWxrKGRvY3VtZW50LmJvZHksIDApO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbWF4Tm9kZXMsXG4gICAgICAgIG1heFRleHQsXG4gICAgICAgIHBydW5lRGVlcDogb3B0cy5wcnVuZURlZXAgPz8gdHJ1ZSxcbiAgICAgICAgaW5jbHVkZUhpZGRlbjogb3B0cy5pbmNsdWRlSGlkZGVuID8/IGZhbHNlLFxuICAgICAgICB3aXRoU2VsZWN0b3JzLFxuICAgICAgICBQUlVORV9UQUdTOiBbLi4uUFJVTkVfVEFHU10sXG4gICAgICAgIFRFWFRfVEFHUzogWy4uLlRFWFRfVEFHU10sXG4gICAgICAgIEFUVFJfV0hJVEVMSVNUOiBbLi4uQVRUUl9XSElURUxJU1RdLFxuICAgICAgICBJTlRFUkFDVElWRV9UQUdTOiBbLi4uSU5URVJBQ1RJVkVfVEFHU10sXG4gICAgICAgIElOVEVSQUNUSVZFX1JPTEVTOiBbLi4uSU5URVJBQ1RJVkVfUk9MRVNdLFxuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBcdThCQTFcdTdCOTcgVG9rZW4gXHU0RjMwXHU3Qjk3XHVGRjA4XHU3RUE2IDQgXHU1QjU3XHU3QjI2L3Rva2VuXHVGRjBDXHU1NDJCXHU3RUQzXHU2Nzg0XHU1RjAwXHU5NTAwXHVGRjA5XG4gICAgY29uc3QgYXBwcm94ID0gdGhpcy5lc3RpbWF0ZVRva2VucyhyZXN1bHQucm9vdCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdXJsOiByZXN1bHQudXJsLFxuICAgICAgdGl0bGU6IHJlc3VsdC50aXRsZSxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgcmVhZHlTdGF0ZTogcmVzdWx0LnJlYWR5U3RhdGUsXG4gICAgICBzdGF0czoge1xuICAgICAgICB0b3RhbE5vZGVzOiByZXN1bHQudG90YWxOb2RlcyxcbiAgICAgICAgZW1pdHRlZE5vZGVzOiByZXN1bHQudG90YWxOb2RlcyAtIHJlc3VsdC5pbnRlcmFjdGl2ZS5sZW5ndGgsIC8vIFx1OEZEMVx1NEYzQ1xuICAgICAgICB0cnVuY2F0ZWROb2RlczogMCxcbiAgICAgICAgYXBwcm94aW1hdGVUb2tlbnM6IGFwcHJveCxcbiAgICAgIH0sXG4gICAgICByb290OiByZXN1bHQucm9vdCxcbiAgICAgIGludGVyYWN0aXZlOiByZXN1bHQuaW50ZXJhY3RpdmUsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZXN0aW1hdGVUb2tlbnMocm9vdDogYW55KTogbnVtYmVyIHtcbiAgICBsZXQgY2hhcnMgPSAwO1xuICAgIGNvbnN0IGNvdW50ID0gKG46IGFueSkgPT4ge1xuICAgICAgaWYgKCFuKSByZXR1cm47XG4gICAgICBjaGFycyArPSAobi50YWc/Lmxlbmd0aCA/PyAwKSArIChuLnRleHQ/Lmxlbmd0aCA/PyAwKSArIEpTT04uc3RyaW5naWZ5KG4uYXR0cmlidXRlcyB8fCB7fSkubGVuZ3RoO1xuICAgICAgKG4uY2hpbGRyZW4gfHwgW10pLmZvckVhY2goY291bnQpO1xuICAgIH07XG4gICAgY291bnQocm9vdCk7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoY2hhcnMgLyA0KTtcbiAgfVxufVxuIiwgIi8qKlxuICogUGxheXdyaWdodCBcdTVGMTVcdTY0Q0VcdTc2ODRcdThCQ0FcdTY1QURcdTkxQzdcdTk2QzZcdTU2NjhcbiAqXG4gKiBcdTkwMUFcdThGQzcgUGxheXdyaWdodCBcdTc2ODQgQ0RQIFx1ODBGRFx1NTI5QiArIFx1OTg3NVx1OTc2Mlx1NEU4Qlx1NEVGNlx1RkYwQ1x1OTFDN1x1OTZDNlx1RkYxQVxuICogLSBjb25zb2xlIFx1NkQ4OFx1NjA2Ri9cdTk1MTlcdThCRUZcbiAqIC0gXHU3RjUxXHU3RURDXHU4QkY3XHU2QzQyXHVGRjA4XHU1NDJCXHU1OTMxXHU4RDI1XHU1MjA2XHU2NzkwXHVGRjA5XG4gKiAtIFx1NjAyN1x1ODBGRFx1NjMwN1x1NjgwN1x1RkYwOG5hdmlnYXRpb24gdGltaW5nIC8gTENQIC8gXHU5NTdGXHU0RUZCXHU1MkExXHVGRjA5XG4gKiAtIEpTIFx1NjcyQVx1NjM1NVx1ODNCN1x1NUYwMlx1NUUzOFxuICovXG5pbXBvcnQgdHlwZSB7IFBhZ2UgfSBmcm9tIFwicGxheXdyaWdodFwiO1xuaW1wb3J0IHR5cGUgeyBEaWFnbm9zdGljUmVmIH0gZnJvbSBcIkBvcGVubGl1bGFuL2NvcmVcIjtcbmltcG9ydCB0eXBlIHsgRGlhZ25vc3RpY0NvbGxlY3RvciwgTmV0d29ya1JlY29yZCwgUGVyZm9ybWFuY2VNZXRyaWNzIH0gZnJvbSBcIkBvcGVubGl1bGFuL2RpYWdub3Npc1wiO1xuaW1wb3J0IHsgYW5hbHl6ZU5ldHdvcmssIGFuYWx5emVQZXJmb3JtYW5jZSB9IGZyb20gXCJAb3BlbmxpdWxhbi9kaWFnbm9zaXNcIjtcblxuZXhwb3J0IGNsYXNzIENvbnNvbGVDb2xsZWN0b3IgaW1wbGVtZW50cyBEaWFnbm9zdGljQ29sbGVjdG9yIHtcbiAgcmVhZG9ubHkgY2F0ZWdvcnkgPSBcImNvbnNvbGVcIiBhcyBjb25zdDtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwYWdlOiBQYWdlLCBwcml2YXRlIGJ1ZmZlcjogRGlhZ25vc3RpY1JlZltdID0gW10pIHt9XG5cbiAgYXN5bmMgY29sbGVjdCgpOiBQcm9taXNlPERpYWdub3N0aWNSZWZbXT4ge1xuICAgIGNvbnN0IHJlZnMgPSBbLi4udGhpcy5idWZmZXJdO1xuICAgIHRoaXMuYnVmZmVyID0gW107XG4gICAgcmV0dXJuIHJlZnM7XG4gIH1cblxuICAvKiogXHU3NTMxXHU1RjE1XHU2NENFXHU1NzI4XHU5ODc1XHU5NzYyXHU3NkQxXHU1NDJDXHU2NUY2XHU4QzAzXHU3NTI4ICovXG4gIHB1c2godGV4dDogc3RyaW5nLCBsZXZlbDogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3Qgc2V2ZXJpdHkgPSBsZXZlbCA9PT0gXCJlcnJvclwiID8gXCJlcnJvclwiIDogbGV2ZWwgPT09IFwid2FybmluZ1wiID8gXCJ3YXJuaW5nXCIgOiBcImluZm9cIjtcbiAgICB0aGlzLmJ1ZmZlci5wdXNoKHtcbiAgICAgIGtpbmQ6IFwiY29uc29sZVwiLFxuICAgICAgc2V2ZXJpdHksXG4gICAgICBtZXNzYWdlOiB0ZXh0LnNsaWNlKDAsIDUwMCksXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEpzRXhjZXB0aW9uQ29sbGVjdG9yIGltcGxlbWVudHMgRGlhZ25vc3RpY0NvbGxlY3RvciB7XG4gIHJlYWRvbmx5IGNhdGVnb3J5ID0gXCJqcy1leGNlcHRpb25cIiBhcyBjb25zdDtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwYWdlOiBQYWdlLCBwcml2YXRlIGJ1ZmZlcjogRGlhZ25vc3RpY1JlZltdID0gW10pIHt9XG5cbiAgYXN5bmMgY29sbGVjdCgpOiBQcm9taXNlPERpYWdub3N0aWNSZWZbXT4ge1xuICAgIGNvbnN0IHJlZnMgPSBbLi4udGhpcy5idWZmZXJdO1xuICAgIHRoaXMuYnVmZmVyID0gW107XG4gICAgcmV0dXJuIHJlZnM7XG4gIH1cblxuICBwdXNoKGVycm9yOiBFcnJvcik6IHZvaWQge1xuICAgIHRoaXMuYnVmZmVyLnB1c2goe1xuICAgICAga2luZDogXCJqcy1leGNlcHRpb25cIixcbiAgICAgIHNldmVyaXR5OiBcImVycm9yXCIsXG4gICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLnNsaWNlKDAsIDUwMCksXG4gICAgICBkZXRhaWw6IHsgc3RhY2s6IGVycm9yLnN0YWNrPy5zbGljZSgwLCAxMjAwKSB9LFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBOZXR3b3JrQ29sbGVjdG9yIGltcGxlbWVudHMgRGlhZ25vc3RpY0NvbGxlY3RvciB7XG4gIHJlYWRvbmx5IGNhdGVnb3J5ID0gXCJuZXR3b3JrXCIgYXMgY29uc3Q7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcGFnZTogUGFnZSwgcHJpdmF0ZSByZWNvcmRzOiBOZXR3b3JrUmVjb3JkW10gPSBbXSkge31cblxuICBhc3luYyBjb2xsZWN0KCk6IFByb21pc2U8RGlhZ25vc3RpY1JlZltdPiB7XG4gICAgY29uc3QgeyByZWZzIH0gPSBhbmFseXplTmV0d29yayh0aGlzLnJlY29yZHMpO1xuICAgIHRoaXMucmVjb3JkcyA9IFtdO1xuICAgIHJldHVybiByZWZzO1xuICB9XG5cbiAgLyoqIFx1NzUzMVx1NUYxNVx1NjRDRVx1NTcyOFx1OEJGN1x1NkM0Mlx1NUI4Q1x1NjIxMFx1NjVGNlx1OEMwM1x1NzUyOCAqL1xuICByZWNvcmQocmVjb3JkOiBOZXR3b3JrUmVjb3JkKTogdm9pZCB7XG4gICAgdGhpcy5yZWNvcmRzLnB1c2gocmVjb3JkKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUGVyZm9ybWFuY2VDb2xsZWN0b3IgaW1wbGVtZW50cyBEaWFnbm9zdGljQ29sbGVjdG9yIHtcbiAgcmVhZG9ubHkgY2F0ZWdvcnkgPSBcInBlcmZvcm1hbmNlXCIgYXMgY29uc3Q7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcGFnZTogUGFnZSkge31cblxuICBhc3luYyBjb2xsZWN0KCk6IFByb21pc2U8RGlhZ25vc3RpY1JlZltdPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1ldHJpY3MgPSBhd2FpdCB0aGlzLnBhZ2UuZXZhbHVhdGUoKCk6IFBlcmZvcm1hbmNlTWV0cmljcyA9PiB7XG4gICAgICAgIGNvbnN0IG5hdiA9IHBlcmZvcm1hbmNlLmdldEVudHJpZXNCeVR5cGUoXCJuYXZpZ2F0aW9uXCIpWzBdIGFzIFBlcmZvcm1hbmNlTmF2aWdhdGlvblRpbWluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgcGFpbnQgPSBwZXJmb3JtYW5jZS5nZXRFbnRyaWVzQnlUeXBlKFwicGFpbnRcIikgYXMgUGVyZm9ybWFuY2VFbnRyeVtdO1xuICAgICAgICBjb25zdCBsY3BFbnRyeSA9IHBlcmZvcm1hbmNlXG4gICAgICAgICAgLmdldEVudHJpZXNCeVR5cGUoXCJsYXJnZXN0LWNvbnRlbnRmdWwtcGFpbnRcIilcbiAgICAgICAgICAucG9wKCkgYXMgUGVyZm9ybWFuY2VFbnRyeSB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VzID0gcGVyZm9ybWFuY2UuZ2V0RW50cmllc0J5VHlwZShcInJlc291cmNlXCIpIGFzIFBlcmZvcm1hbmNlUmVzb3VyY2VUaW1pbmdbXTtcblxuICAgICAgICAvLyBcdTk1N0ZcdTRFRkJcdTUyQTFcdUZGMUE+NTBtcyBcdTg5QzZcdTRFM0FcdTk2M0JcdTU4NUVcbiAgICAgICAgY29uc3QgbG9uZ1Rhc2tzID0gKHBlcmZvcm1hbmNlIGFzIGFueSkuZ2V0RW50cmllc0J5VHlwZVxuICAgICAgICAgID8gcGVyZm9ybWFuY2UuZ2V0RW50cmllc0J5VHlwZShcImxvbmd0YXNrXCIpLmxlbmd0aFxuICAgICAgICAgIDogMDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHR0ZmI6IG5hdiA/IG5hdi5yZXNwb25zZVN0YXJ0IC0gbmF2LnJlcXVlc3RTdGFydCA6IDAsXG4gICAgICAgICAgZG9tQ29udGVudExvYWRlZDogbmF2ID8gbmF2LmRvbUNvbnRlbnRMb2FkZWRFdmVudFN0YXJ0IC0gbmF2LnN0YXJ0VGltZSA6IDAsXG4gICAgICAgICAgbG9hZEV2ZW50OiBuYXYgPyBuYXYubG9hZEV2ZW50RW5kIC0gbmF2LnN0YXJ0VGltZSA6IDAsXG4gICAgICAgICAgZmNwOiBwYWludC5maW5kKChwKSA9PiBwLm5hbWUgPT09IFwiZmlyc3QtY29udGVudGZ1bC1wYWludFwiKT8uc3RhcnRUaW1lLFxuICAgICAgICAgIGxjcDogbGNwRW50cnk/LnN0YXJ0VGltZSxcbiAgICAgICAgICByZXNvdXJjZXM6IHtcbiAgICAgICAgICAgIGNvdW50OiByZXNvdXJjZXMubGVuZ3RoLFxuICAgICAgICAgICAgdG90YWxCeXRlczogcmVzb3VyY2VzLnJlZHVjZSgocywgcikgPT4gcyArIChyLnRyYW5zZmVyU2l6ZSB8fCAwKSwgMCksXG4gICAgICAgICAgfSxcbiAgICAgICAgICBsb25nVGFza3MsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHsgcmVmcyB9ID0gYW5hbHl6ZVBlcmZvcm1hbmNlKG1ldHJpY3MpO1xuICAgICAgcmV0dXJuIHJlZnM7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRE9NIFx1OEJDQVx1NjVBRFx1OTFDN1x1OTZDNlx1NTY2OFx1RkYxQVx1NjhDMFx1NkQ0Qlx1OTg3NVx1OTc2Mlx1NkUzMlx1NjdEM1x1NzJCNlx1NjAwMVx1RkYwQ1x1ODg2NVx1OUY1MFx1MzAwQ1x1NzY3RFx1NUM0Ri9cdTY3MkFcdTZFMzJcdTY3RDMvXHU2NUUwXHU0RUE0XHU0RTkyXHUzMDBEXHU4RkQ5XHU3QzdCXG4gKiBcdTRFQ0UgY29uc29sZS9uZXR3b3JrIFx1OTFDQ1x1NzcwQlx1NEUwRFx1NTIzMFx1NzY4NCBET00gXHU3RUE3XHU5NUVFXHU5ODk4XHVGRjA4XHU1QkY5XHU1RTk0XHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU1RTkzXHU3Njg0IGJsYW5rLXBhZ2UgXHU1NzNBXHU2NjZGXHVGRjA5XHUzMDAyXG4gKi9cbmV4cG9ydCBjbGFzcyBEb21Db2xsZWN0b3IgaW1wbGVtZW50cyBEaWFnbm9zdGljQ29sbGVjdG9yIHtcbiAgcmVhZG9ubHkgY2F0ZWdvcnkgPSBcImRvbVwiIGFzIGNvbnN0O1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBhZ2U6IFBhZ2UpIHt9XG5cbiAgYXN5bmMgY29sbGVjdCgpOiBQcm9taXNlPERpYWdub3N0aWNSZWZbXT4ge1xuICAgIGNvbnN0IHJlZnM6IERpYWdub3N0aWNSZWZbXSA9IFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0ZSA9IGF3YWl0IHRoaXMucGFnZS5ldmFsdWF0ZSgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICAgICAgICBjb25zdCBoYXNCb2R5ID0gISFib2R5ICYmIGJvZHkuY2hpbGRFbGVtZW50Q291bnQgPiAwO1xuICAgICAgICAvLyBcdTUzRUZcdTg5QzFcdTRFMTRcdTUzRUZcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTY1NzBcdTkxQ0ZcdUZGMDhcdTYzOTJcdTk2NjRcdTk2OTBcdTg1Q0YvXHU2NUUwXHU1RTAzXHU1QzQwXHU1MTQzXHU3RDIwXHVGRjA5XG4gICAgICAgIGNvbnN0IHZpc2libGUgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJhLGJ1dHRvbixpbnB1dCxzZWxlY3QsdGV4dGFyZWEsW3JvbGVdXCIpKVxuICAgICAgICAgIC5maWx0ZXIoKGVsKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByID0gKGVsIGFzIEhUTUxFbGVtZW50KS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIGNvbnN0IHMgPSBnZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICAgICAgICAgIHJldHVybiBzLmRpc3BsYXkgIT09IFwibm9uZVwiICYmIHMudmlzaWJpbGl0eSAhPT0gXCJoaWRkZW5cIiAmJiByLndpZHRoID4gMCAmJiByLmhlaWdodCA+IDA7XG4gICAgICAgICAgfSkubGVuZ3RoO1xuICAgICAgICBjb25zdCByb290ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyb290XCIpIHx8IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXBwXCIpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGhhc0JvZHksXG4gICAgICAgICAgdmlzaWJsZUludGVyYWN0aXZlOiB2aXNpYmxlLFxuICAgICAgICAgIGhhc01vdW50OiByb290ID8gcm9vdC5jaGlsZEVsZW1lbnRDb3VudCA+IDAgOiBudWxsLFxuICAgICAgICAgIGJvZHlUZXh0TGVuOiAoZG9jdW1lbnQuYm9keT8uaW5uZXJUZXh0IHx8IFwiXCIpLnRyaW0oKS5sZW5ndGgsXG4gICAgICAgIH07XG4gICAgICB9KTtcblxuICAgICAgLy8gXHU3NjdEXHU1QzRGIC8gXHU2NzJBXHU2RTMyXHU2N0QzXHVGRjFBYm9keSBcdTY1RTBcdTVCNTBcdTUxNDNcdTdEMjAgXHU2MjE2IFx1NjMwMlx1OEY3RFx1ODI4Mlx1NzBCOVx1N0E3QSBcdTRFMTQgXHU2NUUwXHU1M0VGXHU0RUE0XHU0RTkyXHU1MTQzXHU3RDIwXG4gICAgICBjb25zdCBibGFuayA9IHN0YXRlLmhhc0JvZHkgPT09IGZhbHNlIHx8IChzdGF0ZS52aXNpYmxlSW50ZXJhY3RpdmUgPT09IDAgJiYgc3RhdGUuYm9keVRleHRMZW4gPT09IDApO1xuICAgICAgaWYgKGJsYW5rKSB7XG4gICAgICAgIHJlZnMucHVzaCh7XG4gICAgICAgICAga2luZDogXCJkb21cIixcbiAgICAgICAgICBzZXZlcml0eTogXCJlcnJvclwiLFxuICAgICAgICAgIG1lc3NhZ2U6IGBcdTk4NzVcdTk3NjJcdTc1OTFcdTRGM0NcdTdBN0FcdTc2N0QvXHU2NzJBXHU2RTMyXHU2N0QzXHVGRjFBYm9keSBcdTVCNTBcdTUxNDNcdTdEMjA9JHtzdGF0ZS5oYXNCb2R5fVx1RkYwQ1x1NTNFRlx1ODlDMVx1NEVBNFx1NEU5Mlx1NTE0M1x1N0QyMD0ke3N0YXRlLnZpc2libGVJbnRlcmFjdGl2ZX1cdUZGMENcdTZCNjNcdTY1ODc9JHtzdGF0ZS5ib2R5VGV4dExlbn0gXHU1QjU3XHU3QjI2YCxcbiAgICAgICAgICBkZXRhaWw6IHsgaGFzTW91bnQ6IHN0YXRlLmhhc01vdW50IH0sXG4gICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUudmlzaWJsZUludGVyYWN0aXZlID09PSAwKSB7XG4gICAgICAgIC8vIFx1OTg3NVx1OTc2Mlx1NjcwOVx1NTE4NVx1NUJCOVx1NEY0Nlx1NjVFMFx1NTNFRlx1ODlDMVx1NTNFRlx1NEVBNFx1NEU5Mlx1NTE0M1x1N0QyMFx1RkYwOFx1NTNFRlx1ODBGRFx1NEVBNFx1NEU5Mlx1ODhBQlx1OTA2RVx1NjMyMS9cdTk3MDBcdTg5ODFcdTc2N0JcdTVGNTVcdTdCNDlcdUZGMDlcbiAgICAgICAgcmVmcy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBcImRvbVwiLFxuICAgICAgICAgIHNldmVyaXR5OiBcIndhcm5pbmdcIixcbiAgICAgICAgICBtZXNzYWdlOiBgXHU5ODc1XHU5NzYyXHU2NUUwXHU1M0VGXHU4OUMxXHU1M0VGXHU0RUE0XHU0RTkyXHU1MTQzXHU3RDIwXHVGRjA4XHU2QjYzXHU2NTg3ICR7c3RhdGUuYm9keVRleHRMZW59IFx1NUI1N1x1N0IyNlx1RkYwOVx1RkYwQ1x1NTNFRlx1ODBGRFx1OTcwMFx1NzY3Qlx1NUY1NVx1NjIxNlx1NTE0M1x1N0QyMFx1ODhBQlx1OTA2RVx1NjMyMWAsXG4gICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIERPTSBcdTkxQzdcdTk2QzZcdTU5MzFcdThEMjVcdTVGRkRcdTc1NjVcdUZGMDhcdTRFMERcdTk2M0JcdTY1QURcdTY1NzRcdTRGNTNcdThCQ0FcdTY1QURcdUZGMDlcbiAgICB9XG4gICAgcmV0dXJuIHJlZnM7XG4gIH1cbn1cblxuLyoqIFx1ODA1QVx1NTQwOFx1NjI0MFx1NjcwOVx1OTFDN1x1OTZDNlx1NTY2OCAqL1xuZXhwb3J0IGNsYXNzIFBsYXl3cmlnaHREaWFnbm9zdGljcyB7XG4gIGNvbnNvbGU6IENvbnNvbGVDb2xsZWN0b3I7XG4gIGpzRXhjZXB0aW9uczogSnNFeGNlcHRpb25Db2xsZWN0b3I7XG4gIG5ldHdvcms6IE5ldHdvcmtDb2xsZWN0b3I7XG4gIHBlcmZvcm1hbmNlOiBQZXJmb3JtYW5jZUNvbGxlY3RvcjtcbiAgZG9tOiBEb21Db2xsZWN0b3I7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwYWdlOiBQYWdlKSB7XG4gICAgdGhpcy5jb25zb2xlID0gbmV3IENvbnNvbGVDb2xsZWN0b3IodGhpcy5wYWdlKTtcbiAgICB0aGlzLmpzRXhjZXB0aW9ucyA9IG5ldyBKc0V4Y2VwdGlvbkNvbGxlY3Rvcih0aGlzLnBhZ2UpO1xuICAgIHRoaXMubmV0d29yayA9IG5ldyBOZXR3b3JrQ29sbGVjdG9yKHRoaXMucGFnZSk7XG4gICAgdGhpcy5wZXJmb3JtYW5jZSA9IG5ldyBQZXJmb3JtYW5jZUNvbGxlY3Rvcih0aGlzLnBhZ2UpO1xuICAgIHRoaXMuZG9tID0gbmV3IERvbUNvbGxlY3Rvcih0aGlzLnBhZ2UpO1xuICAgIHRoaXMud2lyZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSB3aXJlKCk6IHZvaWQge1xuICAgIHRoaXMucGFnZS5vbihcImNvbnNvbGVcIiwgKG1zZykgPT4gdGhpcy5jb25zb2xlLnB1c2gobXNnLnRleHQoKSwgbXNnLnR5cGUoKSkpO1xuICAgIHRoaXMucGFnZS5vbihcInBhZ2VlcnJvclwiLCAoZXJyKSA9PiB0aGlzLmpzRXhjZXB0aW9ucy5wdXNoKGVycikpO1xuICAgIHRoaXMucGFnZS5vbihcInJlcXVlc3RmYWlsZWRcIiwgKHJlcSkgPT4ge1xuICAgICAgdGhpcy5uZXR3b3JrLnJlY29yZCh7XG4gICAgICAgIHVybDogcmVxLnVybCgpLFxuICAgICAgICBtZXRob2Q6IHJlcS5tZXRob2QoKSxcbiAgICAgICAgc3RhdHVzOiAwLFxuICAgICAgICBlcnJvcjogcmVxLmZhaWx1cmUoKT8uZXJyb3JUZXh0IHx8IFwiZmFpbGVkXCIsXG4gICAgICAgIGR1cmF0aW9uTXM6IDAsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLnBhZ2Uub24oXCJyZXNwb25zZVwiLCAocmVzKSA9PiB7XG4gICAgICBjb25zdCByZXEgPSByZXMucmVxdWVzdCgpO1xuICAgICAgdGhpcy5uZXR3b3JrLnJlY29yZCh7XG4gICAgICAgIHVybDogcmVxLnVybCgpLFxuICAgICAgICBtZXRob2Q6IHJlcS5tZXRob2QoKSxcbiAgICAgICAgc3RhdHVzOiByZXMuc3RhdHVzKCksXG4gICAgICAgIHN0YXR1c1RleHQ6IHJlcy5zdGF0dXNUZXh0KCksXG4gICAgICAgIG1pbWVUeXBlOiByZXMuaGVhZGVycygpW1wiY29udGVudC10eXBlXCJdLFxuICAgICAgICBkdXJhdGlvbk1zOiAwLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBjb2xsZWN0b3JzKCk6IERpYWdub3N0aWNDb2xsZWN0b3JbXSB7XG4gICAgcmV0dXJuIFt0aGlzLmNvbnNvbGUsIHRoaXMuanNFeGNlcHRpb25zLCB0aGlzLm5ldHdvcmssIHRoaXMucGVyZm9ybWFuY2UsIHRoaXMuZG9tXTtcbiAgfVxufVxuIiwgIi8qKlxuICogUGxheXdyaWdodEVuZ2luZSBcdTIwMTRcdTIwMTQgXHU1RTk1XHU1QzQyXHU5QTcxXHU1MkE4XHU1QjlFXHU3M0IwXG4gKlxuICogXHU1NDBDXHU2NUY2XHU2M0QwXHU0RjlCXHVGRjFBXG4gKiAtIFx1N0VERlx1NEUwMFx1NTJBOFx1NEY1Q1x1NjI2N1x1ODg0Q1x1RkYwOFx1N0NCRVx1Nzg2RVx1NjRDRFx1NEY1Q1x1RkYwOVxuICogLSBcdTlBRDhcdTY1NDhcdTVGRUJcdTcxNjdcbiAqIC0gNSBcdTY2MUZcdThCQ0FcdTY1QURcdTkxQzdcdTk2QzZcdUZGMDhcdTkwMUFcdThGQzcgQ0RQL1x1NEU4Qlx1NEVGNlx1RkYwOVxuICovXG5pbXBvcnQgeyBjaHJvbWl1bSwgdHlwZSBCcm93c2VyLCB0eXBlIFBhZ2UsIHR5cGUgQnJvd3NlckNvbnRleHQgfSBmcm9tIFwicGxheXdyaWdodFwiO1xuaW1wb3J0IHR5cGUgeyBCcm93c2VyRW5naW5lLCBEaWFnbm9zdGljUmVwb3J0LCBVbmlmaWVkQWN0aW9uLCBBY3Rpb25SZXN1bHQsIFBhZ2VTbmFwc2hvdCwgU25hcHNob3RPcHRpb25zIH0gZnJvbSBcIkBvcGVubGl1bGFuL2NvcmVcIjtcbmltcG9ydCB7IGxvY2F0ZUJ5U2VtYW50aWMgfSBmcm9tIFwiQG9wZW5saXVsYW4vYWktbGF5ZXJcIjtcbmltcG9ydCB7IFN0ZWFsdGhNYW5hZ2VyLCB0eXBlIFN0ZWFsdGhPcHRpb25zIH0gZnJvbSBcIkBvcGVubGl1bGFuL3N0ZWFsdGhcIjtcbmltcG9ydCB7IEVsZW1lbnRMb2NhdG9yIH0gZnJvbSBcIi4vbG9jYXRvci5qc1wiO1xuaW1wb3J0IHsgU25hcHNob3RCdWlsZGVyIH0gZnJvbSBcIi4vc25hcHNob3QuanNcIjtcbmltcG9ydCB7IFBsYXl3cmlnaHREaWFnbm9zdGljcyB9IGZyb20gXCIuL2RpYWdub3N0aWNzLmpzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGxheXdyaWdodEVuZ2luZU9wdGlvbnMge1xuICBoZWFkbGVzcz86IGJvb2xlYW47XG4gIC8qKiBcdThGREVcdTYzQTVcdTUyMzBcdTVERjJcdTU0MkZcdTUyQThcdTc2ODRcdTZENEZcdTg5QzhcdTU2NjhcdUZGMDhDRFBcdUZGMENcdTUwMUZcdTkyNzQgRGV2VG9vbHMgTUNQIFx1NzZGNFx1OEZERVx1ODBGRFx1NTI5Qlx1RkYwOSAqL1xuICBjb25uZWN0VXJsPzogc3RyaW5nO1xuICAvKiogXHU2RDRGXHU4OUM4XHU1NjY4XHU1M0VGXHU2MjY3XHU4ODRDXHU4REVGXHU1Rjg0ICovXG4gIGV4ZWN1dGFibGVQYXRoPzogc3RyaW5nO1xuICAvKiogXHU4OUM2XHU1M0UzICovXG4gIHZpZXdwb3J0PzogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9O1xuICAvKiogXHU5NjMyXHU2OEMwXHU2RDRCXHU5MTREXHU3RjZFXHVGRjA4XHU1M0VGXHU5MDA5XHVGRjBDXHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHVGRjA5ICovXG4gIHN0ZWFsdGg/OiBTdGVhbHRoT3B0aW9ucyB8IFN0ZWFsdGhNYW5hZ2VyO1xufVxuXG5leHBvcnQgY2xhc3MgUGxheXdyaWdodEVuZ2luZSBpbXBsZW1lbnRzIEJyb3dzZXJFbmdpbmUge1xuICByZWFkb25seSBuYW1lID0gXCJwbGF5d3JpZ2h0K2NkcFwiO1xuICBwcml2YXRlIGJyb3dzZXI/OiBCcm93c2VyO1xuICBwcml2YXRlIGNvbnRleHQ/OiBCcm93c2VyQ29udGV4dDtcbiAgcHJpdmF0ZSBwYWdlPzogUGFnZTtcbiAgcHJpdmF0ZSBsb2NhdG9yPzogRWxlbWVudExvY2F0b3I7XG4gIHByaXZhdGUgc25hcHNob3RCdWlsZGVyPzogU25hcHNob3RCdWlsZGVyO1xuICBwcml2YXRlIGRpYWdub3N0aWNzPzogUGxheXdyaWdodERpYWdub3N0aWNzO1xuICBwcml2YXRlIG9wdGlvbnM6IFBsYXl3cmlnaHRFbmdpbmVPcHRpb25zO1xuICAvKiogXHU5NjMyXHU2OEMwXHU2RDRCXHU3QkExXHU3NDA2XHU1NjY4ICovXG4gIHByaXZhdGUgc3RlYWx0aD86IFN0ZWFsdGhNYW5hZ2VyO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFBsYXl3cmlnaHRFbmdpbmVPcHRpb25zID0ge30pIHtcbiAgICB0aGlzLm9wdGlvbnMgPSB7IGhlYWRsZXNzOiB0cnVlLCB2aWV3cG9ydDogeyB3aWR0aDogMTI4MCwgaGVpZ2h0OiA4MDAgfSwgLi4ub3B0aW9ucyB9O1xuICAgIC8vIFx1Njc4NFx1OTAyMCBzdGVhbHRoIFx1N0JBMVx1NzQwNlx1NTY2OFx1RkYwOFx1NjNBNVx1NTNENyBTdGVhbHRoTWFuYWdlciBcdTVCOUVcdTRGOEJcdTYyMTZcdTkxNERcdTdGNkVcdTVCRjlcdThDNjFcdUZGMDlcbiAgICBpZiAodGhpcy5vcHRpb25zLnN0ZWFsdGggaW5zdGFuY2VvZiBTdGVhbHRoTWFuYWdlcikge1xuICAgICAgdGhpcy5zdGVhbHRoID0gdGhpcy5vcHRpb25zLnN0ZWFsdGg7XG4gICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuc3RlYWx0aCkge1xuICAgICAgdGhpcy5zdGVhbHRoID0gbmV3IFN0ZWFsdGhNYW5hZ2VyKHRoaXMub3B0aW9ucy5zdGVhbHRoKTtcbiAgICB9XG4gIH1cblxuICAvKiogXHU1RjUzXHU1MjREIHN0ZWFsdGggXHU2NjJGXHU1NDI2XHU1NDJGXHU3NTI4ICovXG4gIGdldCBzdGVhbHRoRW5hYmxlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGVhbHRoPy5pc0VuYWJsZWQgPz8gZmFsc2U7XG4gIH1cblxuICBhc3luYyBpbml0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGxhdW5jaEFyZ3MgPSB0aGlzLnN0ZWFsdGg/LmJ1aWxkTGF1bmNoQXJncygpID8/IFtdO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuY29ubmVjdFVybCkge1xuICAgICAgLy8gQ0RQIFx1NzZGNFx1OEZERVx1RkYwOFx1NTAxRlx1OTI3NCBDaHJvbWUgRGV2VG9vbHMgTUNQIFx1NzY4NFx1ODBGRFx1NTI5Qlx1RkYwOVxuICAgICAgdGhpcy5icm93c2VyID0gYXdhaXQgY2hyb21pdW0uY29ubmVjdE92ZXJDRFAodGhpcy5vcHRpb25zLmNvbm5lY3RVcmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmJyb3dzZXIgPSBhd2FpdCBjaHJvbWl1bS5sYXVuY2goe1xuICAgICAgICBoZWFkbGVzczogdGhpcy5vcHRpb25zLmhlYWRsZXNzLFxuICAgICAgICBleGVjdXRhYmxlUGF0aDogdGhpcy5vcHRpb25zLmV4ZWN1dGFibGVQYXRoLFxuICAgICAgICBhcmdzOiBsYXVuY2hBcmdzLmxlbmd0aCA/IGxhdW5jaEFyZ3MgOiB1bmRlZmluZWQsXG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gXHU1MjFCXHU1RUZBXHU0RTBBXHU0RTBCXHU2NTg3XHVGRjFBXHU4MkU1XHU1NDJGXHU3NTI4IHN0ZWFsdGhcdUZGMENcdTZDRThcdTUxNjVcdTUzQ0RcdTYzMDdcdTdFQjlcdTgxMUFcdTY3MkNcdTRFMEUgVUFcbiAgICBjb25zdCBjdHhPcHRpb25zOiBhbnkgPSB7IHZpZXdwb3J0OiB0aGlzLm9wdGlvbnMudmlld3BvcnQgfTtcbiAgICBpZiAodGhpcy5zdGVhbHRoPy5pc0VuYWJsZWQpIHtcbiAgICAgIGNvbnN0IGluaXRTY3JpcHQgPSB0aGlzLnN0ZWFsdGguYnVpbGRJbml0U2NyaXB0KCk7XG4gICAgICBpZiAoaW5pdFNjcmlwdCkgY3R4T3B0aW9ucy5pbml0U2NyaXB0ID0gaW5pdFNjcmlwdDtcbiAgICAgIGlmICh0aGlzLnN0ZWFsdGgub3B0aW9ucy51c2VyQWdlbnQpIGN0eE9wdGlvbnMudXNlckFnZW50ID0gdGhpcy5zdGVhbHRoLm9wdGlvbnMudXNlckFnZW50O1xuICAgIH1cbiAgICB0aGlzLmNvbnRleHQgPSB0aGlzLmJyb3dzZXIuY29udGV4dHMoKVswXSB8fCAoYXdhaXQgdGhpcy5icm93c2VyLm5ld0NvbnRleHQoY3R4T3B0aW9ucykpO1xuICAgIHRoaXMucGFnZSA9IHRoaXMuY29udGV4dC5wYWdlcygpWzBdIHx8IChhd2FpdCB0aGlzLmNvbnRleHQubmV3UGFnZSgpKTtcbiAgICB0aGlzLmRpYWdub3N0aWNzID0gbmV3IFBsYXl3cmlnaHREaWFnbm9zdGljcyh0aGlzLnBhZ2UpO1xuICAgIHRoaXMuc25hcHNob3RCdWlsZGVyID0gbmV3IFNuYXBzaG90QnVpbGRlcih0aGlzLnBhZ2UpO1xuICAgIHRoaXMubG9jYXRvciA9IG5ldyBFbGVtZW50TG9jYXRvcih0aGlzLnBhZ2UsIHtcbiAgICAgIC8vIFx1OEJFRFx1NEU0OVx1NUI5QVx1NEY0RFx1OTRGRVx1OERFRlx1RkYxQWFyaWEvcGxhY2Vob2xkZXIgXHU1MTVDXHU1RTk1XHU1OTMxXHU4RDI1XHU1NDBFXHVGRjBDXHU1N0ZBXHU0RThFXHU1RkVCXHU3MTY3XHU1MDVBXHU0RTJEXHU2NTg3XHU1MjA2XHU4QkNEK1x1OEJFRFx1NEU0OVx1NzZGOFx1NEYzQ1x1NUVBNlx1NTMzOVx1OTE0RFxuICAgICAgcmVzb2x2ZTogYXN5bmMgKHNlbWFudGljKSA9PiB7XG4gICAgICAgIGNvbnN0IHNuYXAgPSBhd2FpdCB0aGlzLnNuYXBzaG90QnVpbGRlciEuYnVpbGQoeyBtYXhOb2RlczogMjAwLCBtYXhUZXh0TGVuZ3RoOiA4MCB9KTtcbiAgICAgICAgY29uc3QgaGl0ID0gbG9jYXRlQnlTZW1hbnRpYyhzbmFwLCBzZW1hbnRpYyk7XG4gICAgICAgIGlmIChoaXQgJiYgKGhpdC5yZWYgfHwgaGl0LnNlbGVjdG9yKSkge1xuICAgICAgICAgIHJldHVybiB7IHJlZjogaGl0LnJlZiwgdGV4dDogaGl0LnRleHQsIHNlbGVjdG9yOiBoaXQuc2VsZWN0b3IgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBjbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmJyb3dzZXI/LmNsb3NlKCk7XG4gIH1cblxuICBhc3luYyBleGVjdXRlKGFjdGlvbjogVW5pZmllZEFjdGlvbik6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gICAgaWYgKCF0aGlzLnBhZ2UpIHRocm93IG5ldyBFcnJvcihcIlx1NUYxNVx1NjRDRVx1NjcyQVx1NTIxRFx1NTlDQlx1NTMxNlx1RkYwQ1x1OEJGN1x1NTE0OFx1OEMwM1x1NzUyOCBpbml0KClcIik7XG4gICAgY29uc3QgdDAgPSBEYXRlLm5vdygpO1xuXG4gICAgc3dpdGNoIChhY3Rpb24udHlwZSkge1xuICAgICAgY2FzZSBcIm5hdmlnYXRlXCI6IHtcbiAgICAgICAgYXdhaXQgdGhpcy5wYWdlLmdvdG8oYWN0aW9uLnVybCwgeyB3YWl0VW50aWw6IGFjdGlvbi53YWl0VW50aWwgPz8gXCJuZXR3b3JraWRsZVwiLCB0aW1lb3V0OiAzMF8wMDAgfSk7XG4gICAgICAgIHRoaXMuZGlhZ25vc3RpY3M/Lm5ldHdvcmsucmVjb3JkKHtcbiAgICAgICAgICB1cmw6IGFjdGlvbi51cmwsXG4gICAgICAgICAgbWV0aG9kOiBcIk5BVlwiLFxuICAgICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICAgIGR1cmF0aW9uTXM6IERhdGUubm93KCkgLSB0MCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IG9rOiB0cnVlLCB0eXBlOiBcIm5hdmlnYXRlXCIsIHN1bW1hcnk6IGBcdTVERjJcdTVCRkNcdTgyMkFcdTUyMzAgJHthY3Rpb24udXJsfWAsIGR1cmF0aW9uTXM6IERhdGUubm93KCkgLSB0MCB9O1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwiY2xpY2tcIjoge1xuICAgICAgICBjb25zdCB7IGxvY2F0b3IsIHN0cmF0ZWd5LCBhbmNob3JTZWxlY3RvciB9ID0gYXdhaXQgdGhpcy5sb2NhdG9yIS5sb2NhdGUoe1xuICAgICAgICAgIHJlZjogYWN0aW9uLnJlZixcbiAgICAgICAgICBzZWxlY3RvcjogYWN0aW9uLnNlbGVjdG9yLFxuICAgICAgICAgIHRleHQ6IGFjdGlvbi50ZXh0LFxuICAgICAgICAgIHNlbWFudGljOiBhY3Rpb24uc2VtYW50aWMsXG4gICAgICAgIH0pO1xuICAgICAgICAvLyBcdTcwQjlcdTUxRkJcdTUzRUZcdTgwRkRcdTg5RTZcdTUzRDFcdTk4NzVcdTk3NjJcdTVCRkNcdTgyMkFcdUZGMDhcdTU5ODJcdTcwQjlcdTUxRkI8YT5cdTk0RkVcdTYzQTVcdThERjNcdThGNkNcdUZGMDlcdTMwMDJcbiAgICAgICAgLy8gXHU1M0VBXHU2NzA5XHU3MEI5XHU1MUZCXHU3NkVFXHU2ODA3XHU2NjJGXHU5NEZFXHU2M0E1XHU2NUY2XHU2MjREXHU3QjQ5XHU1Rjg1XHU2NUIwXHU5ODc1XHU5NzYyXHU1MkEwXHU4RjdEXHVGRjBDXHU5MDdGXHU1MTREXHU2NjZFXHU5MDFBXHU2MzA5XHU5NEFFXHU2NUUwXHU4QzEzXHU3QjQ5XHU1Rjg1XHU1QkZDXHU4MjJBXHU4RDg1XHU2NUY2XHUzMDAyXG4gICAgICAgIGNvbnN0IHdhaXRGb3JOYXZpZ2F0aW9uID0gYWN0aW9uLndhaXRGb3JOYXZpZ2F0aW9uID8/IHRydWU7XG4gICAgICAgIGNvbnN0IGlzTGluayA9IGF3YWl0IGxvY2F0b3JcbiAgICAgICAgICAuZXZhbHVhdGUoKGVsKSA9PiBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IFwiYVwiICYmICEhZWwuZ2V0QXR0cmlidXRlKFwiaHJlZlwiKSlcbiAgICAgICAgICAuY2F0Y2goKCkgPT4gZmFsc2UpO1xuICAgICAgICBjb25zdCBuYXZQcm9taXNlID1cbiAgICAgICAgICB3YWl0Rm9yTmF2aWdhdGlvbiAmJiBpc0xpbmtcbiAgICAgICAgICAgID8gdGhpcy5wYWdlXG4gICAgICAgICAgICAgICAgLndhaXRGb3JOYXZpZ2F0aW9uKHsgd2FpdFVudGlsOiBcImxvYWRcIiwgdGltZW91dDogMTVfMDAwIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+IG51bGwpIC8vIFx1NjcyQVx1ODlFNlx1NTNEMVx1NUJGQ1x1ODIyQVx1NjVGNlx1OTc1OVx1OUVEOFx1NUZGRFx1NzU2NVxuICAgICAgICAgICAgOiBudWxsO1xuICAgICAgICBhd2FpdCBsb2NhdG9yLmNsaWNrKHtcbiAgICAgICAgICBidXR0b246IGFjdGlvbi5idXR0b24sXG4gICAgICAgICAgY2xpY2tDb3VudDogYWN0aW9uLmNsaWNrQ291bnQsXG4gICAgICAgICAgZm9yY2U6IGFjdGlvbi5mb3JjZSxcbiAgICAgICAgICB0aW1lb3V0OiAxNV8wMDAsXG4gICAgICAgIH0pO1xuICAgICAgICAvLyBcdTgyRTVcdTcwQjlcdTUxRkJcdTk0RkVcdTYzQTVcdTg5RTZcdTUzRDFcdTRFODZcdTVCRkNcdTgyMkFcdUZGMENcdTUyMTlcdTdCNDlcdTVGODVcdTUxNzZcdTVCOENcdTYyMTBcdTU0MEVcdTUxOERcdThGRDRcdTU2REVcdUZGMENcdTRGRERcdThCQzFcdTU0MEVcdTdFRURcdTY0Q0RcdTRGNUNcdTk3NjJcdTVCRjlcdTdBMzNcdTVCOUFcdTk4NzVcdTk3NjJcbiAgICAgICAgaWYgKG5hdlByb21pc2UpIGF3YWl0IG5hdlByb21pc2U7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgb2s6IHRydWUsXG4gICAgICAgICAgdHlwZTogXCJjbGlja1wiLFxuICAgICAgICAgIHN1bW1hcnk6IGBcdTVERjJcdTcwQjlcdTUxRkJcdUZGMDhcdTdCNTZcdTc1NjU9JHtzdHJhdGVneX0gXHU5NTFBXHU3MEI5PSR7YW5jaG9yU2VsZWN0b3J9JHtuYXZQcm9taXNlID8gXCIsXHU1REYyXHU3QjQ5XHU1Rjg1XHU1QkZDXHU4MjJBXHU3QTMzXHU1QjlBXCIgOiBcIlwifVx1RkYwOWAsXG4gICAgICAgICAgZHVyYXRpb25NczogRGF0ZS5ub3coKSAtIHQwLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwiZmlsbFwiOiB7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRvciwgc3RyYXRlZ3kgfSA9IGF3YWl0IHRoaXMubG9jYXRvciEubG9jYXRlKHtcbiAgICAgICAgICByZWY6IGFjdGlvbi5yZWYsXG4gICAgICAgICAgc2VsZWN0b3I6IGFjdGlvbi5zZWxlY3RvcixcbiAgICAgICAgICB0ZXh0OiBhY3Rpb24udGV4dCxcbiAgICAgICAgICBzZW1hbnRpYzogYWN0aW9uLnNlbWFudGljLFxuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgbG9jYXRvci5maWxsKGFjdGlvbi52YWx1ZSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgb2s6IHRydWUsXG4gICAgICAgICAgdHlwZTogXCJmaWxsXCIsXG4gICAgICAgICAgc3VtbWFyeTogYFx1NURGMlx1NTg2Qlx1NTE2NVx1NTE4NVx1NUJCOVx1RkYwOFx1N0I1Nlx1NzU2NT0ke3N0cmF0ZWd5fVx1RkYwOWAsXG4gICAgICAgICAgZHVyYXRpb25NczogRGF0ZS5ub3coKSAtIHQwLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwidHlwZVwiOiB7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRvciwgc3RyYXRlZ3kgfSA9IGF3YWl0IHRoaXMubG9jYXRvciEubG9jYXRlKHtcbiAgICAgICAgICByZWY6IGFjdGlvbi5yZWYsXG4gICAgICAgICAgc2VsZWN0b3I6IGFjdGlvbi5zZWxlY3RvcixcbiAgICAgICAgICB0ZXh0OiBhY3Rpb24udGV4dCxcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IGxvY2F0b3IuY2xpY2soKTtcbiAgICAgICAgLy8gc3RlYWx0aCBcdTZBMjFcdTVGMEZcdTRFMEJcdUZGMUFcdTkwMTBcdTk1MkVcdThGOTNcdTUxNjVcdTVFMjZcdTRFQkFcdTdDN0JcdTUzMTZcdTk2OEZcdTY3M0FcdTVFRjZcdThGREZcdUZGMDhcdTkwN0ZcdTUxNERcdThGOTNcdTUxNjVcdTU5MkFcdTVGRUJcdTg4QUJcdThCQzZcdTUyMkJcdTRFM0FcdTY3M0FcdTU2NjhcdTRFQkFcdUZGMDlcbiAgICAgICAgY29uc3QgZGVsYXkgPSBhY3Rpb24uZGVsYXkgPz8gKHRoaXMuc3RlYWx0aD8uaXNFbmFibGVkID8gdGhpcy5zdGVhbHRoLmh1bWFuVHlwaW5nRGVsYXlNcygpIDogdW5kZWZpbmVkKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wYWdlLmtleWJvYXJkLnR5cGUoYWN0aW9uLnZhbHVlLCB7IGRlbGF5OiBkZWxheSA/PyAwIH0pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG9rOiB0cnVlLFxuICAgICAgICAgIHR5cGU6IFwidHlwZVwiLFxuICAgICAgICAgIHN1bW1hcnk6IGBcdTVERjJcdTkwMTBcdTk1MkVcdThGOTNcdTUxNjVcdUZGMDhcdTdCNTZcdTc1NjU9JHtzdHJhdGVneX0ke3RoaXMuc3RlYWx0aD8uaXNFbmFibGVkID8gXCIsc3RlYWx0aFx1NUVGNlx1OEZERlwiIDogXCJcIn1cdUZGMDlgLFxuICAgICAgICAgIGR1cmF0aW9uTXM6IERhdGUubm93KCkgLSB0MCxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgY2FzZSBcInNlbGVjdFwiOiB7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRvciwgc3RyYXRlZ3kgfSA9IGF3YWl0IHRoaXMubG9jYXRvciEubG9jYXRlKHtcbiAgICAgICAgICByZWY6IGFjdGlvbi5yZWYsXG4gICAgICAgICAgc2VsZWN0b3I6IGFjdGlvbi5zZWxlY3RvcixcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IGxvY2F0b3Iuc2VsZWN0T3B0aW9uKGFjdGlvbi52YWx1ZSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgb2s6IHRydWUsXG4gICAgICAgICAgdHlwZTogXCJzZWxlY3RcIixcbiAgICAgICAgICBzdW1tYXJ5OiBgXHU1REYyXHU5MDA5XHU2MkU5XHU5MDA5XHU5ODc5XHVGRjA4XHU3QjU2XHU3NTY1PSR7c3RyYXRlZ3l9XHVGRjA5YCxcbiAgICAgICAgICBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNhc2UgXCJleHRyYWN0XCI6IHtcbiAgICAgICAgY29uc3QgeyBsb2NhdG9yIH0gPSBhd2FpdCB0aGlzLmxvY2F0b3IhLmxvY2F0ZSh7XG4gICAgICAgICAgcmVmOiBhY3Rpb24ucmVmLFxuICAgICAgICAgIHNlbGVjdG9yOiBhY3Rpb24uc2VsZWN0b3IsXG4gICAgICAgICAgdGV4dDogYWN0aW9uLnRleHQsXG4gICAgICAgICAgc2VtYW50aWM6IGFjdGlvbi5zZW1hbnRpYyxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBsb2NhdG9yLmV2YWx1YXRlKChlbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGNsb25lID0gZWwuY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgIGNvbnN0IHRleHQgPSAoY2xvbmUuaW5uZXJUZXh0IHx8IGNsb25lLnRleHRDb250ZW50IHx8IFwiXCIpLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKTtcbiAgICAgICAgICByZXR1cm4geyB0ZXh0OiB0ZXh0LnNsaWNlKDAsIDIwMDApIH07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4geyBvazogdHJ1ZSwgdHlwZTogXCJleHRyYWN0XCIsIHN1bW1hcnk6IFwiXHU2M0QwXHU1M0Q2XHU1QjhDXHU2MjEwXCIsIGRhdGEsIGR1cmF0aW9uTXM6IERhdGUubm93KCkgLSB0MCB9O1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwiYXNzZXJ0XCI6IHtcbiAgICAgICAgY29uc3QgeyBsb2NhdG9yIH0gPSBhd2FpdCB0aGlzLmxvY2F0b3IhLmxvY2F0ZSh7XG4gICAgICAgICAgcmVmOiBhY3Rpb24ucmVmLFxuICAgICAgICAgIHNlbGVjdG9yOiBhY3Rpb24uc2VsZWN0b3IsXG4gICAgICAgICAgdGV4dDogYWN0aW9uLnRleHQsXG4gICAgICAgICAgc2VtYW50aWM6IGFjdGlvbi5zZW1hbnRpYyxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IGNvdW50ID0gYXdhaXQgbG9jYXRvci5jb3VudCgpO1xuICAgICAgICBpZiAoY291bnQgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4geyBvazogZmFsc2UsIHR5cGU6IFwiYXNzZXJ0XCIsIHN1bW1hcnk6IGBcdTY1QURcdThBMDBcdTU5MzFcdThEMjVcdUZGMUFcdTY3MkFcdTYyN0VcdTUyMzBcdTc2RUVcdTY4MDdcdTUxNDNcdTdEMjBgLCBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbCA9IGxvY2F0b3IuZmlyc3QoKTtcbiAgICAgICAgY29uc3QgdmlzaWJsZSA9IGF3YWl0IGVsLmlzVmlzaWJsZSgpLmNhdGNoKCgpID0+IGZhbHNlKTtcbiAgICAgICAgY29uc3QgdGV4dCA9IChhd2FpdCBlbC5pbm5lclRleHQoKS5jYXRjaCgoKSA9PiBcIlwiKSkgfHwgXCJcIjtcbiAgICAgICAgbGV0IHBhc3MgPSB0cnVlO1xuICAgICAgICBsZXQgZGV0YWlsID0gXCJcIjtcbiAgICAgICAgc3dpdGNoIChhY3Rpb24ubW9kZSkge1xuICAgICAgICAgIGNhc2UgXCJ2aXNpYmxlXCI6XG4gICAgICAgICAgICBwYXNzID0gdmlzaWJsZTtcbiAgICAgICAgICAgIGRldGFpbCA9IGBcdTUzRUZcdTg5QzE9JHt2aXNpYmxlfWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwiZXhpc3RzXCI6XG4gICAgICAgICAgICBwYXNzID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgXCJoaWRkZW5cIjpcbiAgICAgICAgICAgIHBhc3MgPSAhdmlzaWJsZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgXCJ0ZXh0LWNvbnRhaW5zXCI6XG4gICAgICAgICAgICBwYXNzID0gYWN0aW9uLmV4cGVjdGVkID8gdGV4dC5pbmNsdWRlcyhhY3Rpb24uZXhwZWN0ZWQpIDogZmFsc2U7XG4gICAgICAgICAgICBkZXRhaWwgPSBgXHU2NTg3XHU2NzJDXHU1MzA1XHU1NDJCJyR7YWN0aW9uLmV4cGVjdGVkfSc9JHtwYXNzfSBcdTVCOUVcdTk2NDU9JyR7dGV4dC5zbGljZSgwLCA1MCl9J2A7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwiZW5hYmxlZFwiOlxuICAgICAgICAgICAgcGFzcyA9IGF3YWl0IGVsLmlzRW5hYmxlZCgpLmNhdGNoKCgpID0+IGZhbHNlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBwYXNzID0gdmlzaWJsZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG9rOiBwYXNzLFxuICAgICAgICAgIHR5cGU6IFwiYXNzZXJ0XCIsXG4gICAgICAgICAgc3VtbWFyeTogYFx1NjVBRFx1OEEwMCR7cGFzcyA/IFwiXHU5MDFBXHU4RkM3XCIgOiBcIlx1NTkzMVx1OEQyNVwifTogJHthY3Rpb24ubW9kZX0gJHtkZXRhaWx9YCxcbiAgICAgICAgICBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNhc2UgXCJzY3JlZW5zaG90XCI6IHtcbiAgICAgICAgY29uc3QgYnVmID0gYWN0aW9uLmZ1bGxQYWdlXG4gICAgICAgICAgPyBhd2FpdCB0aGlzLnBhZ2Uuc2NyZWVuc2hvdCh7IGZ1bGxQYWdlOiB0cnVlLCBjbGlwOiBhY3Rpb24uY2xpcCB9KVxuICAgICAgICAgIDogYXdhaXQgdGhpcy5wYWdlLnNjcmVlbnNob3QoeyBjbGlwOiBhY3Rpb24uY2xpcCB9KTtcbiAgICAgICAgY29uc3QgYmFzZTY0ID0gYnVmLnRvU3RyaW5nKFwiYmFzZTY0XCIpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG9rOiB0cnVlLFxuICAgICAgICAgIHR5cGU6IFwic2NyZWVuc2hvdFwiLFxuICAgICAgICAgIHN1bW1hcnk6IGBcdTVERjJcdTYyMkFcdTU2RkUgKCR7KGJhc2U2NC5sZW5ndGggKiAwLjc1KSAvIDEwMjR9S0IsICR7YmFzZTY0Lmxlbmd0aH0gYjY0KWAsXG4gICAgICAgICAgZGF0YTogeyBiYXNlNjQgfSxcbiAgICAgICAgICBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNhc2UgXCJob3ZlclwiOiB7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRvciB9ID0gYXdhaXQgdGhpcy5sb2NhdG9yIS5sb2NhdGUoeyByZWY6IGFjdGlvbi5yZWYsIHNlbGVjdG9yOiBhY3Rpb24uc2VsZWN0b3IgfSk7XG4gICAgICAgIGF3YWl0IGxvY2F0b3IuaG92ZXIoKTtcbiAgICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHR5cGU6IFwiaG92ZXJcIiwgc3VtbWFyeTogXCJcdTVERjJcdTYwQUNcdTUwNUNcIiwgZHVyYXRpb25NczogRGF0ZS5ub3coKSAtIHQwIH07XG4gICAgICB9XG5cbiAgICAgIGNhc2UgXCJzY3JvbGxcIjoge1xuICAgICAgICBhd2FpdCB0aGlzLnBhZ2UubW91c2Uud2hlZWwoMCwgKGFjdGlvbiBhcyBhbnkpLmRlbHRhWSA/PyA2MDApO1xuICAgICAgICByZXR1cm4geyBvazogdHJ1ZSwgdHlwZTogXCJzY3JvbGxcIiwgc3VtbWFyeTogXCJcdTVERjJcdTZFREFcdTUyQThcIiwgZHVyYXRpb25NczogRGF0ZS5ub3coKSAtIHQwIH07XG4gICAgICB9XG5cbiAgICAgIGNhc2UgXCJ3YWl0XCI6IHtcbiAgICAgICAgYXdhaXQgdGhpcy5wYWdlLndhaXRGb3JUaW1lb3V0KChhY3Rpb24gYXMgYW55KS5tcyA/PyAxMDAwKTtcbiAgICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHR5cGU6IFwid2FpdFwiLCBzdW1tYXJ5OiBcIlx1NURGMlx1N0I0OVx1NUY4NVwiLCBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAgfTtcbiAgICAgIH1cblxuICAgICAgY2FzZSBcImV2YWx1YXRlXCI6IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wYWdlLmV2YWx1YXRlKChhY3Rpb24gYXMgYW55KS5zY3JpcHQgYXMgc3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHR5cGU6IFwiZXZhbHVhdGVcIiwgc3VtbWFyeTogXCJKUyBcdTYyNjdcdTg4NENcdTVCOENcdTYyMTBcIiwgZGF0YTogcmVzdWx0LCBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAgfTtcbiAgICAgIH1cblxuICAgICAgY2FzZSBcInByZXNzXCI6IHtcbiAgICAgICAgYXdhaXQgdGhpcy5wYWdlLmtleWJvYXJkLnByZXNzKChhY3Rpb24gYXMgYW55KS5rZXkgPz8gXCJFbnRlclwiKTtcbiAgICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHR5cGU6IFwicHJlc3NcIiwgc3VtbWFyeTogYFx1NURGMlx1NjMwOVx1OTUyRSAkeyhhY3Rpb24gYXMgYW55KS5rZXl9YCwgZHVyYXRpb25NczogRGF0ZS5ub3coKSAtIHQwIH07XG4gICAgICB9XG5cbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgYSA9IGFjdGlvbiBhcyBhbnk7XG4gICAgICAgIHJldHVybiB7IG9rOiBmYWxzZSwgdHlwZTogYS50eXBlLCBzdW1tYXJ5OiBgXHU0RTBEXHU2NTJGXHU2MzAxXHU3Njg0IGFjdGlvbjogJHthLnR5cGV9YCwgZHVyYXRpb25NczogRGF0ZS5ub3coKSAtIHQwIH07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc25hcHNob3Qob3B0aW9ucz86IFNuYXBzaG90T3B0aW9ucyk6IFByb21pc2U8UGFnZVNuYXBzaG90PiB7XG4gICAgcmV0dXJuIHRoaXMuc25hcHNob3RCdWlsZGVyIS5idWlsZChvcHRpb25zKTtcbiAgfVxuXG4gIGFzeW5jIGRpYWdub3NlKCk6IFByb21pc2U8RGlhZ25vc3RpY1JlcG9ydD4ge1xuICAgIGNvbnN0IGNvbGxlY3RvcnMgPSB0aGlzLmRpYWdub3N0aWNzIS5jb2xsZWN0b3JzKCk7XG4gICAgY29uc3QgY29sbGVjdGVkID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICBjb2xsZWN0b3JzLm1hcChhc3luYyAoYykgPT4gKHsgY2F0ZWdvcnk6IGMuY2F0ZWdvcnksIHJlZnM6IGF3YWl0IGMuY29sbGVjdCgpIH0pKVxuICAgICk7XG4gICAgY29uc3QgYnlDYXQgPSAoY2F0OiBzdHJpbmcpID0+XG4gICAgICBjb2xsZWN0ZWQuZmluZCgoYykgPT4gYy5jYXRlZ29yeSA9PT0gY2F0KT8ucmVmcyA/PyBbXTtcbiAgICByZXR1cm4ge1xuICAgICAgY29uc29sZTogYnlDYXQoXCJjb25zb2xlXCIpLFxuICAgICAgbmV0d29yazogYnlDYXQoXCJuZXR3b3JrXCIpLFxuICAgICAgZG9tOiBieUNhdChcImRvbVwiKSxcbiAgICAgIHBlcmZvcm1hbmNlOiBieUNhdChcInBlcmZvcm1hbmNlXCIpLFxuICAgICAganNFeGNlcHRpb25zOiBieUNhdChcImpzLWV4Y2VwdGlvblwiKSxcbiAgICAgIGFjY2Vzc2liaWxpdHk6IGJ5Q2F0KFwiYWNjZXNzaWJpbGl0eVwiKSxcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgY29sbGVjdENvbnNvbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3MhLmNvbnNvbGUuY29sbGVjdCgpO1xuICB9XG5cbiAgYXN5bmMgY29sbGVjdE5ldHdvcmsoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3MhLm5ldHdvcmsuY29sbGVjdCgpO1xuICB9XG5cbiAgYXN5bmMgZXZhbHVhdGUoc2NyaXB0OiBzdHJpbmcpOiBQcm9taXNlPHVua25vd24+IHtcbiAgICByZXR1cm4gdGhpcy5wYWdlIS5ldmFsdWF0ZShzY3JpcHQpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBcdThCRURcdTRFNDlcdTVCOUFcdTRGNERcdTU2NjhcdUZGMUFcdTYyOEFcdTgxRUFcdTcxMzZcdThCRURcdThBMDBcdTYzQ0ZcdThGRjBcdThGNkNcdTYyMTBcdTdFRDNcdTY3ODRcdTUzMTZcdTc2ODRcdTVCOUFcdTRGNERcdTUzQzJcdTY1NzBcdTMwMDJcbiAqIFx1NTAxRlx1OTI3NCBTdGFnZWhhbmQgXHU3Njg0IEFJIExvY2F0b3IgXHU0RTBFIEJyb3dzZXItVXNlIFx1NzY4NFx1OEJFRFx1NEU0OVx1NUI5QVx1NEY0RFx1MzAwMlxuICovXG5pbXBvcnQgdHlwZSB7IFBhZ2VTbmFwc2hvdCB9IGZyb20gXCJAb3BlbmxpdWxhbi9jb3JlXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VtYW50aWNMb2NhdGVSZXN1bHQge1xuICAvKiogXHU1NDdEXHU0RTJEXHU3Njg0XHU1RkVCXHU3MTY3XHU1RjE1XHU3NTI4ICovXG4gIHJlZj86IHN0cmluZztcbiAgLyoqIFx1NTQ3RFx1NEUyRFx1NzY4NFx1NjU4N1x1NjcyQyAqL1xuICB0ZXh0Pzogc3RyaW5nO1xuICAvKiogQ1NTIFx1OTAwOVx1NjJFOVx1NTY2OFx1RkYwOFx1ODJFNVx1NTNFRlx1NzUyOFx1RkYwOSAqL1xuICBzZWxlY3Rvcj86IHN0cmluZztcbiAgLyoqIFx1NTQ3RFx1NEUyRFx1NTIwNlx1NjU3MCAqL1xuICBzY29yZTogbnVtYmVyO1xuICAvKiogXHU4QkY0XHU2NjBFICovXG4gIG5vdGU6IHN0cmluZztcbn1cblxuY29uc3QgSUdOT1JFX1dPUkRTID0gbmV3IFNldChbXCJcdThCRjdcIiwgXCJcdTcwQjlcdTUxRkJcIiwgXCJcdThGOTNcdTUxNjVcIiwgXCJcdTkwMDlcdTYyRTlcIiwgXCJcdTYyN0VcdTUyMzBcIiwgXCJcdTkwQTNcdTRFMkFcIiwgXCJcdThGRDlcdTRFMkFcIiwgXCJcdTc2ODRcIiwgXCJcdTYzMDlcdTk0QUVcIiwgXCJcdTk0RkVcdTYzQTVcIiwgXCJ0aGVcIiwgXCJjbGlja1wiLCBcImJ1dHRvblwiLCBcImxpbmtcIiwgXCJwbGVhc2VcIl0pO1xuXG4vKiogXHU0RUNFXHU1RkVCXHU3MTY3XHU3Njg0XHU1M0VGXHU0RUE0XHU0RTkyXHU1MTQzXHU3RDIwXHU0RTJEXHVGRjBDXHU2MzA5XHU4QkVEXHU0RTQ5XHU3NkY4XHU0RjNDXHU1RUE2XHU2N0U1XHU2MjdFXHU2NzAwXHU0RjczXHU3NkVFXHU2ODA3ICovXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRlQnlTZW1hbnRpYyhzbmFwc2hvdDogUGFnZVNuYXBzaG90LCBzZW1hbnRpYzogc3RyaW5nKTogU2VtYW50aWNMb2NhdGVSZXN1bHQge1xuICBjb25zdCBxID0gbm9ybWFsaXplKHNlbWFudGljKTtcbiAgLy8gXHU0RTJEXHU2NTg3XHU2NUUwXHU3QTdBXHU2ODNDXHU1MjA2XHU4QkNEXHVGRjFBXHU2MjhBIENKSyBcdThGREVcdTdFRURcdTRFMzJcdTYyQzZcdTYyMTBcdTUzNTVcdTRFMkFcdTZDNDlcdTVCNTdcdTUzQzJcdTRFMEVcdTUzMzlcdTkxNERcdUZGMUJcdTgyRjFcdTY1ODcvXHU2NTcwXHU1QjU3XHU2MzA5XHU3QTdBXHU2ODNDXHU1MjA2XHU4QkNEXG4gIGNvbnN0IHFUb2tlbnMgPSB0b2tlbml6ZShxKTtcblxuICBsZXQgYmVzdDogU2VtYW50aWNMb2NhdGVSZXN1bHQgPSB7IHNjb3JlOiAwLCBub3RlOiBcIlx1NjcyQVx1NjI3RVx1NTIzMFx1NTMzOVx1OTE0RFwiIH07XG5cbiAgZm9yIChjb25zdCBlbCBvZiBzbmFwc2hvdC5pbnRlcmFjdGl2ZSkge1xuICAgIGNvbnN0IHRhcmdldFRleHQgPSBub3JtYWxpemUoZWwudGV4dCk7XG4gICAgLy8gXHU3NkY0XHU2M0E1XHU1MzA1XHU1NDJCXG4gICAgaWYgKHRhcmdldFRleHQgJiYgdGFyZ2V0VGV4dC5pbmNsdWRlcyhxKSkge1xuICAgICAgY29uc3Qgc2NvcmUgPSAxMDAgKyBxLmxlbmd0aDtcbiAgICAgIGlmIChzY29yZSA+IGJlc3Quc2NvcmUpIGJlc3QgPSB7IHJlZjogZWwucmVmLCB0ZXh0OiBlbC50ZXh0LCBzZWxlY3RvcjogZWwuc2VsZWN0b3IsIHNjb3JlLCBub3RlOiBcIlx1NjU4N1x1NjcyQ1x1NTMwNVx1NTQyQlx1NTMzOVx1OTE0RFwiIH07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgLy8gXHU4QkNEXHU1MTQzXHU5MUNEXHU1M0UwXHVGRjA4XHU4MkYxXHU2NTg3XHU2MzA5XHU4QkNEXHUzMDAxXHU0RTJEXHU2NTg3XHU2MzA5XHU1QjU3XHVGRjA5XG4gICAgY29uc3QgdGFyZ2V0VG9rZW5zID0gdG9rZW5pemUodGFyZ2V0VGV4dCk7XG4gICAgY29uc3QgbWVhbmluZ2Z1bFEgPSBxVG9rZW5zLmZpbHRlcihpc01lYW5pbmdmdWwpO1xuICAgIGNvbnN0IG1lYW5pbmdmdWxUYXJnZXQgPSB0YXJnZXRUb2tlbnMuZmlsdGVyKGlzTWVhbmluZ2Z1bCk7XG4gICAgaWYgKCFtZWFuaW5nZnVsVGFyZ2V0Lmxlbmd0aCkgY29udGludWU7XG4gICAgY29uc3Qgb3ZlcmxhcCA9IG1lYW5pbmdmdWxRLmZpbHRlcigodykgPT4gbWVhbmluZ2Z1bFRhcmdldC5pbmNsdWRlcyh3KSkubGVuZ3RoO1xuICAgIGNvbnN0IHNjb3JlID0gTWF0aC5yb3VuZCgob3ZlcmxhcCAvIE1hdGgubWF4KG1lYW5pbmdmdWxRLmxlbmd0aCwgMSkpICogMTAwKTtcbiAgICBpZiAoc2NvcmUgPiAwICYmIHNjb3JlID4gYmVzdC5zY29yZSkge1xuICAgICAgYmVzdCA9IHsgcmVmOiBlbC5yZWYsIHRleHQ6IGVsLnRleHQsIHNlbGVjdG9yOiBlbC5zZWxlY3Rvciwgc2NvcmUsIG5vdGU6IFwiXHU4QkNEXHU1MTQzXHU5MUNEXHU1M0UwXHU1MzM5XHU5MTREXCIgfTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJlc3Q7XG59XG5cbi8qKiBcdTUyMDZcdThCQ0RcdUZGMUFcdTgyRjFcdTY1ODdcdTYzMDlcdTdBN0FcdTc2N0RcdTUyMDdcdTUyMDZcdUZGMENcdTRFMkRcdTY1ODcgQ0pLIFx1NjMwOVx1NTM1NVx1NEUyQVx1NUI1N1x1N0IyNlx1NTIwN1x1NTIwNiAqL1xuZnVuY3Rpb24gdG9rZW5pemUoczogc3RyaW5nKTogc3RyaW5nW10ge1xuICBjb25zdCB0b2tlbnM6IHN0cmluZ1tdID0gW107XG4gIC8vIFx1NjNEMFx1NTNENlx1ODJGMVx1NjU4N1x1NTM1NVx1OEJDRFx1NTQ4Q1x1NjU3MFx1NUI1N1xuICBmb3IgKGNvbnN0IG0gb2Ygcy5tYXRjaEFsbCgvW2EtejAtOV0rL2dpKSkgdG9rZW5zLnB1c2gobVswXSk7XG4gIC8vIFx1NjNEMFx1NTNENlx1OEZERVx1N0VFRCBDSksgXHU1QjU3XHU3QjI2XHU0RTMyXHVGRjBDXHU5MDEwXHU1QjU3XHU2MkM2XHU1MjA2XG4gIGZvciAoY29uc3QgbSBvZiBzLm1hdGNoQWxsKC9bXFx1NGUwMC1cXHU5ZmZmXSsvZykpIHtcbiAgICBmb3IgKGNvbnN0IGNoIG9mIG1bMF0pIHRva2Vucy5wdXNoKGNoKTtcbiAgfVxuICByZXR1cm4gdG9rZW5zO1xufVxuXG4vKiogXHU2NzA5XHU2MTBGXHU0RTQ5XHU4QkNEXHU1MTQzXHVGRjFBXHU5NzVFXHU1RkZEXHU3NTY1XHU4QkNEXHVGRjBDXHU0RTE0XHVGRjA4Q0pLIFx1NTM1NVx1NUI1N1x1NjIxNlx1OTU3Rlx1NUVBNj4xIFx1NzY4NFx1ODJGMVx1NjU4Ny9cdTY1NzBcdTVCNTdcdUZGMDkgKi9cbmZ1bmN0aW9uIGlzTWVhbmluZ2Z1bCh3OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgaWYgKElHTk9SRV9XT1JEUy5oYXModykpIHJldHVybiBmYWxzZTtcbiAgLy8gQ0pLIFx1NTM1NVx1NUI1N1x1RkYwOFx1OTU3Rlx1NUVBNiAxIFx1NEUxNFx1NEUzQVx1NkM0OVx1NUI1N1x1RkYwOVx1NEZERFx1NzU1OVxuICBpZiAoL15bXFx1NGUwMC1cXHU5ZmZmXSQvLnRlc3QodykpIHJldHVybiB0cnVlO1xuICByZXR1cm4gdy5sZW5ndGggPiAxO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemUoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHMudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXHVGRjBDXHUzMDAyXHVGRjAxXHVGRjFGXHUzMDAxXHVGRjFCXHVGRjFBXCJcIicnXHVGRjA4XHVGRjA5KCldL2csIFwiIFwiKS50cmltKCk7XG59XG5cbi8qKiBcdThGODVcdTUyQTlcdUZGMUFcdTY3ODRcdTkwMjBcdTVFMjZcdThCRURcdTRFNDlcdTc2ODQgY2xpY2sgXHU1MkE4XHU0RjVDXHU1M0MyXHU2NTcwICovXG5leHBvcnQgZnVuY3Rpb24gc2VtYW50aWNUb0xvY2F0ZVBhcmFtcyhyZXN1bHQ6IFNlbWFudGljTG9jYXRlUmVzdWx0KSB7XG4gIHJldHVybiB7XG4gICAgcmVmOiByZXN1bHQucmVmLFxuICAgIHRleHQ6IHJlc3VsdC50ZXh0LFxuICAgIHNlbGVjdG9yOiByZXN1bHQuc2VsZWN0b3IsXG4gIH07XG59XG4iLCAiLyoqXG4gKiBAb3BlbmxpdWxhbi9zdGVhbHRoIFx1MjAxNFx1MjAxNCBcdTk2MzJcdTY4QzBcdTZENEJcdTZBMjFcdTU3NTdcdUZGMDhBbnRpLURldGVjdGlvbiAvIFN0ZWFsdGhcdUZGMDlcbiAqXG4gKiBcdTc2RUVcdTY4MDdcdTc1MjhcdTYyMzdcdUZGMUFcdTgzQjdcdTUzRDZcdTUxNkNcdTVGMDBcdTY1NzBcdTYzNkVcdTc2ODRcdTc1MjhcdTYyMzdcdUZGMDhcdTcyMkNcdTUzRDYvXHU5MUM3XHU5NkM2XHVGRjA5XHVGRjBDXHU5MDdGXHU1MTREXHU4OEFCXHU3NkVFXHU2ODA3XHU3QUQ5XHU3MEI5XHU1MjI0XHU1QjlBXHU0RTNBXHU3MjJDXHU4NjZCXHU4MDBDXHU5NjUwXHU5MDFGL1x1NUMwMVx1Nzk4MVx1MzAwMlxuICpcbiAqIFx1ODBGRFx1NTI5Qlx1NTIwNlx1NUM0Mlx1RkYxQVxuICogLSAqKlx1NTNDRFx1NjMwN1x1N0VCOVx1NkNFOFx1NTE2NSoqXHVGRjA4aW5pdFNjcmlwdFx1RkYwOVx1RkYxQVx1OTY5MFx1ODVDRiB3ZWJkcml2ZXIgXHU2ODA3XHU1RkQ3XHUzMDAxXHU0RjJBXHU4OEM1XHU2M0QyXHU0RUY2L1x1OEJFRFx1OEEwMC9cdTY3NDNcdTk2NTBcdTdCNDlcdTYzMDdcdTdFQjlcdUZGMUJcbiAqIC0gKipcdTU0MkZcdTUyQThcdTUzQzJcdTY1NzAqKlx1RkYxQVx1OTY0NFx1NTJBMCBDaHJvbWUgXHU1NDJGXHU1MkE4XHU1M0MyXHU2NTcwXHVGRjA4XHU3OTgxXHU3NTI4XHU4MUVBXHU1MkE4XHU1MzE2XHU2M0E3XHU1MjM2XHUzMDAxXHU3OTgxXHU3NTI4XHU4NEREXHU3MjU5L1x1OUVEOFx1OEJBNFx1NkQ0Rlx1ODlDOFx1NTY2OFx1NjhDMFx1NjdFNVx1N0I0OVx1RkYwOVx1RkYxQlxuICogLSAqKlx1NEVCQVx1N0M3Qlx1ODg0Q1x1NEUzQVx1NkEyMVx1NjJERioqXHVGRjFBXHU5RjIwXHU2ODA3XHU3OUZCXHU1MkE4XHU4RjY4XHU4RkY5XHUzMDAxXHU4RjkzXHU1MTY1XHU1RUY2XHU4RkRGXHUzMDAxXHU2RURBXHU1MkE4XHU5NjhGXHU2NzNBXHU1MzE2XHVGRjA4XHU4QkE5XHU0RUJBXHU1REU1XHU2NENEXHU0RjVDXHU3Mjc5XHU1RjgxXHU0RTBEXHU1M0VGXHU4RkE4XHU4QkM2XHVGRjA5XHVGRjFCXG4gKiAtICoqVXNlci1BZ2VudCBcdTdCNTZcdTc1NjUqKlx1RkYxQVx1NTNFRlx1OTE0RFx1N0Y2RVx1NzcxRlx1NUI5RVx1NkQ0Rlx1ODlDOFx1NTY2OCBVQVx1RkYwQ1x1ODFFQVx1NTJBOFx1OEY2RVx1NjM2Mlx1MzAwMlxuICpcbiAqIFx1OEJCRVx1OEJBMVx1NTM5Rlx1NTIxOVx1RkYxQVxuICogLSBcdTdFQUYgSlMgXHU2Q0U4XHU1MTY1XHU0RTNBXHU0RTNCXHVGRjA4XHU0RTBEXHU0RjlEXHU4RDU2IHB1cHBldGVlci1leHRyYSBcdTdCNDlcdTkxQ0RcdTU3OEJcdTVFOTNcdUZGMDlcdUZGMENcdTk2RjZcdTU5MTZcdTkwRThcdTRGOURcdThENTZcdTUzNzNcdTUzRUZcdTVERTVcdTRGNUNcdUZGMUJcbiAqIC0gXHU1M0VGXHU5MDA5XHU2MkU5XHU2MDI3XHU1NDJGXHU3NTI4XHVGRjA4c3RlYWx0aCBcdTlFRDhcdThCQTRcdTUxNzNcdTk1RURcdUZGMENcdTRFQzVcdTU3MjhcdTc1MjhcdTYyMzdcdTU4RjBcdTY2MEVcdTk3MDBcdTg5ODFcdTY1RjZcdTVGMDBcdTU0MkZcdUZGMENcdTkwN0ZcdTUxNERcdTY1RTBcdThDMTNcdTRGQjVcdTUxNjVcdUZGMDlcdUZGMUJcbiAqIC0gXHU0RTBFXHU3M0IwXHU2NzA5IFBsYXl3cmlnaHRFbmdpbmUgXHU2NUUwXHU3RjFEXHU5NkM2XHU2MjEwXHVGRjFBXHU5MDFBXHU4RkM3IGBpbml0U2NyaXB0YCBcdTZDRThcdTUxNjUgKyBgbGF1bmNoT3B0aW9uc2AgXHU3NTFGXHU2NTQ4XHUzMDAyXG4gKi9cblxuLyoqXG4gKiBTdGVhbHRoIFx1OTE0RFx1N0Y2RVx1OTg3OVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0ZWFsdGhPcHRpb25zIHtcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NTQyRlx1NzUyOCBzdGVhbHRoXHVGRjA4XHU5RUQ4XHU4QkE0IGZhbHNlIFx1MjAxNFx1MjAxNCBcdTRFQzVcdTU3MjhcdTc1MjhcdTYyMzdcdTY2MEVcdTc4NkVcdTg5ODFcdTZDNDJcdTY1RjZcdTVGMDBcdTU0MkZcdUZGMDkgKi9cbiAgZW5hYmxlZD86IGJvb2xlYW47XG4gIC8qKiBcdTUzQ0RcdTYzMDdcdTdFQjlcdTZDRThcdTUxNjVcdTdFQTdcdTUyMkJcdUZGMUFiYXNpYz1cdTk2OTBcdTg1Q0Ygd2ViZHJpdmVyXHVGRjFCZnVsbD1cdTVCOENcdTY1NzRcdTUzQ0RcdTYzMDdcdTdFQjlcdUZGMDhcdTlFRDhcdThCQTQgYmFzaWNcdUZGMDkgKi9cbiAgbGV2ZWw/OiBcImJhc2ljXCIgfCBcImZ1bGxcIjtcbiAgLyoqIFx1NzUyOFx1NjIzN1x1NEVFM1x1NzQwNlx1RkYwOFx1NzU1OVx1N0E3QVx1NTIxOVx1NEUwRFx1ODk4Nlx1NzZENiBVQVx1RkYwQ1x1NEY3Rlx1NzUyOFx1NkQ0Rlx1ODlDOFx1NTY2OFx1OUVEOFx1OEJBNFx1RkYwOSAqL1xuICB1c2VyQWdlbnQ/OiBzdHJpbmc7XG4gIC8qKiBcdTRFQkFcdTdDN0JcdTg4NENcdTRFM0FcdTZBMjFcdTYyREZcdUZGMUFcdThGOTNcdTUxNjVcdTVFRjZcdThGREZcdTUzM0FcdTk1RjQgW21pbiwgbWF4XSBtc1x1RkYwOFx1OUVEOFx1OEJBNCBbMzAsIDkwXVx1RkYwOSAqL1xuICBodW1hblR5cGluZ0RlbGF5PzogW251bWJlciwgbnVtYmVyXTtcbiAgLyoqIFx1NEVCQVx1N0M3Qlx1ODg0Q1x1NEUzQVx1NkEyMVx1NjJERlx1RkYxQVx1NTJBOFx1NEY1Q1x1OTVGNFx1OTY4Rlx1NjczQVx1OTVGNFx1OTY5NCBbbWluLCBtYXhdIG1zXHVGRjA4XHU5RUQ4XHU4QkE0IFsyMDAsIDYwMF1cdUZGMDkgKi9cbiAgaHVtYW5BY3Rpb25EZWxheT86IFtudW1iZXIsIG51bWJlcl07XG4gIC8qKiBcdTlGMjBcdTY4MDdcdTc5RkJcdTUyQThcdTY2MkZcdTU0MjZcdTZBMjFcdTYyREZcdTRFQkFcdTdDN0JcdThGNjhcdThGRjlcdUZGMDhcdTlFRDhcdThCQTQgdHJ1ZVx1RkYwOSAqL1xuICBodW1hbk1vdXNlVHJhamVjdG9yeT86IGJvb2xlYW47XG4gIC8qKiBcdTk4OURcdTU5MTZcdTgxRUFcdTVCOUFcdTRFNDlcdTU0MkZcdTUyQThcdTUzQzJcdTY1NzAgKi9cbiAgZXh0cmFBcmdzPzogc3RyaW5nW107XG59XG5cbi8qKiBcdTlFRDhcdThCQTRcdTkxNERcdTdGNkUgKi9cbmNvbnN0IERFRkFVTFRTOiBSZXF1aXJlZDxQaWNrPFN0ZWFsdGhPcHRpb25zLCBcImxldmVsXCIgfCBcImh1bWFuVHlwaW5nRGVsYXlcIiB8IFwiaHVtYW5BY3Rpb25EZWxheVwiIHwgXCJodW1hbk1vdXNlVHJhamVjdG9yeVwiPj4gJiBQaWNrPFN0ZWFsdGhPcHRpb25zLCBcInVzZXJBZ2VudFwiIHwgXCJleHRyYUFyZ3NcIj4gPSB7XG4gIGxldmVsOiBcImJhc2ljXCIsXG4gIGh1bWFuVHlwaW5nRGVsYXk6IFszMCwgOTBdLFxuICBodW1hbkFjdGlvbkRlbGF5OiBbMjAwLCA2MDBdLFxuICBodW1hbk1vdXNlVHJhamVjdG9yeTogdHJ1ZSxcbiAgdXNlckFnZW50OiB1bmRlZmluZWQsXG4gIGV4dHJhQXJnczogW10sXG59O1xuXG4vKipcbiAqIFN0ZWFsdGhNYW5hZ2VyIFx1MjAxNFx1MjAxNCBcdTk2MzJcdTY4QzBcdTZENEJcdTZBMjFcdTU3NTdcdTUxNjVcdTUzRTNcbiAqXG4gKiBcdTYzRDBcdTRGOUJcdUZGMUFcbiAqIC0gYGJ1aWxkTGF1bmNoT3B0aW9ucygpYCAgXHUyMTkyIFx1NkQ0Rlx1ODlDOFx1NTY2OFx1NTQyRlx1NTJBOFx1NTNDMlx1NjU3MFx1RkYwOFx1NTQyQlx1NTNDRFx1ODFFQVx1NTJBOFx1NTMxNiBmbGFnc1x1RkYwOVxuICogLSBgYnVpbGRJbml0U2NyaXB0KClgICAgICBcdTIxOTIgXHU1M0NEXHU2MzA3XHU3RUI5XHU2Q0U4XHU1MTY1XHU4MTFBXHU2NzJDXHVGRjA4XHU1NzI4XHU5ODc1XHU5NzYyXHU1MjFCXHU1RUZBXHU1MjREXHU2Q0U4XHU1MTY1XHVGRjA5XG4gKiAtIGBodW1hbml6ZSgpYCAgICAgICAgICAgIFx1MjE5MiBcdTRFQkFcdTdDN0JcdTg4NENcdTRFM0FcdTZBMjFcdTYyREZcdTg4QzVcdTk5NzBcdTU2NjhcdUZGMDhcdTc1MjhcdTRFOEVcdTUyQThcdTRGNUNcdTYyNjdcdTg4NENcdUZGMDlcbiAqL1xuZXhwb3J0IGNsYXNzIFN0ZWFsdGhNYW5hZ2VyIHtcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVxdWlyZWQ8T21pdDxTdGVhbHRoT3B0aW9ucywgXCJ1c2VyQWdlbnRcIiB8IFwiZXh0cmFBcmdzXCI+PiAmIFBpY2s8U3RlYWx0aE9wdGlvbnMsIFwidXNlckFnZW50XCIgfCBcImV4dHJhQXJnc1wiPjtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBTdGVhbHRoT3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgZW5hYmxlZDogb3B0aW9ucy5lbmFibGVkID8/IGZhbHNlLFxuICAgICAgbGV2ZWw6IG9wdGlvbnMubGV2ZWwgPz8gREVGQVVMVFMubGV2ZWwsXG4gICAgICB1c2VyQWdlbnQ6IG9wdGlvbnMudXNlckFnZW50ID8/IERFRkFVTFRTLnVzZXJBZ2VudCxcbiAgICAgIGh1bWFuVHlwaW5nRGVsYXk6IG9wdGlvbnMuaHVtYW5UeXBpbmdEZWxheSA/PyBERUZBVUxUUy5odW1hblR5cGluZ0RlbGF5LFxuICAgICAgaHVtYW5BY3Rpb25EZWxheTogb3B0aW9ucy5odW1hbkFjdGlvbkRlbGF5ID8/IERFRkFVTFRTLmh1bWFuQWN0aW9uRGVsYXksXG4gICAgICBodW1hbk1vdXNlVHJhamVjdG9yeTogb3B0aW9ucy5odW1hbk1vdXNlVHJhamVjdG9yeSA/PyBERUZBVUxUUy5odW1hbk1vdXNlVHJhamVjdG9yeSxcbiAgICAgIGV4dHJhQXJnczogb3B0aW9ucy5leHRyYUFyZ3MgPz8gREVGQVVMVFMuZXh0cmFBcmdzLFxuICAgIH07XG4gIH1cblxuICAvKiogXHU2NjJGXHU1NDI2XHU1NDJGXHU3NTI4ICovXG4gIGdldCBpc0VuYWJsZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5lbmFibGVkO1xuICB9XG5cbiAgLyoqIFx1NkQ0Rlx1ODlDOFx1NTY2OFx1NTQyRlx1NTJBOFx1NTNDMlx1NjU3MFx1RkYwOFx1NEVDNVx1NUY1M1x1NTQyRlx1NzUyOFx1NjVGNlx1OEZENFx1NTZERVx1RkYwQ1x1NTQyNlx1NTIxOVx1OEZENFx1NTZERVx1N0E3QVx1NjU3MFx1N0VDNFx1RkYwQ1x1NEZERFx1NjMwMVx1OUVEOFx1OEJBNFx1NUU3Mlx1NTFDMFx1RkYwOSAqL1xuICBidWlsZExhdW5jaEFyZ3MoKTogc3RyaW5nW10ge1xuICAgIGlmICghdGhpcy5vcHRpb25zLmVuYWJsZWQpIHJldHVybiBbXTtcbiAgICBjb25zdCBhcmdzID0gW1xuICAgICAgLy8gXHU3OTgxXHU3NTI4XHU4MUVBXHU1MkE4XHU1MzE2XHU2M0E3XHU1MjM2XHU2ODA3XHU1RkQ3XHVGRjA4XHU4RkQ5XHU2NjJGXHU2NzAwXHU5MUNEXHU4OTgxXHU3Njg0XHU1M0NEXHU2OEMwXHU2RDRCXHU3MEI5XHVGRjA5XG4gICAgICBcIi0tZGlzYWJsZS1ibGluay1mZWF0dXJlcz1BdXRvbWF0aW9uQ29udHJvbGxlZFwiLFxuICAgICAgXCItLWRpc2FibGUtYmxpbmstZmVhdHVyZXM9QXV0b21hdGlvbkNvbnRyb2xsZWQsSWRsZURldGVjdGlvblwiLFxuICAgICAgLy8gXHU3OUZCXHU5NjY0XHU4MUVBXHU1MkE4XHU1MzE2XHU3NkY4XHU1MTczXHU3Njg0XHU5RUQ4XHU4QkE0XHU4ODRDXHU0RTNBXG4gICAgICBcIi0tZGlzYWJsZS1hdXRvbWF0aW9uXCIsXG4gICAgICBcIi0tbm8tZmlyc3QtcnVuXCIsXG4gICAgICBcIi0tbm8tZGVmYXVsdC1icm93c2VyLWNoZWNrXCIsXG4gICAgICBcIi0tZGlzYWJsZS1kZWZhdWx0LWFwcHNcIixcbiAgICAgIFwiLS1kaXNhYmxlLWV4dGVuc2lvbnMtZXhjZXB0PS9kZXYvbnVsbFwiLFxuICAgICAgXCItLWRpc2FibGUtYmFja2dyb3VuZC1uZXR3b3JraW5nXCIsXG4gICAgICBcIi0tZGlzYWJsZS1zeW5jXCIsXG4gICAgICBcIi0tZGlzYWJsZS1jb21wb25lbnQtdXBkYXRlXCIsXG4gICAgICBcIi0tZGlzYWJsZS1kb21haW4tcmVsaWFiaWxpdHlcIixcbiAgICAgIFwiLS1kaXNhYmxlLWNsaWVudC1zaWRlLXBoaXNoaW5nLWRldGVjdGlvblwiLFxuICAgICAgLy8gXHU3OTgxXHU3NTI4XHU2NUUwXHU1OTM0XHU2QTIxXHU1RjBGXHU3Mjc5XHU2NzA5XHU3Njg0XHU1M0VGXHU2OEMwXHU2RDRCXHU3Mjc5XHU1RjgxXG4gICAgICBcIi0tZGlzYWJsZS1pbmZvYmFyc1wiLFxuICAgICAgXCItLWRpc2FibGUtZmVhdHVyZXM9SXNvbGF0ZU9yaWdpbnMsc2l0ZS1wZXItcHJvY2Vzc1wiLFxuICAgICAgXCItLXdpbmRvdy1wb3NpdGlvbj0wLDBcIixcbiAgICAgIFwiLS1sYW5nPWVuLVVTLGVuXCIsXG4gICAgXTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmV4dHJhQXJncz8ubGVuZ3RoKSBhcmdzLnB1c2goLi4udGhpcy5vcHRpb25zLmV4dHJhQXJncyk7XG4gICAgcmV0dXJuIGFyZ3M7XG4gIH1cblxuICAvKipcbiAgICogXHU1M0NEXHU2MzA3XHU3RUI5XHU2Q0U4XHU1MTY1XHU4MTFBXHU2NzJDIFx1MjAxNFx1MjAxNCBcdTU3MjhcdTk4NzVcdTk3NjJcdTRFMEFcdTRFMEJcdTY1ODdcdTRFMkRcdTYyNjdcdTg4NENcdUZGMENcdTc1MjhcdTRFOEVcdTRGMkFcdTg4QzVcdTZENEZcdTg5QzhcdTU2NjhcdTYzMDdcdTdFQjlcdTMwMDJcbiAgICogXHU4RkQ0XHU1NkRFXHU3Njg0XHU4MTFBXHU2NzJDXHU0RjFBXHU1NzI4XHU2QkNGXHU0RTJBXHU2NUIwXHU5ODc1XHU5NzYyXHU1MjFCXHU1RUZBXHU2NUY2XHU2Q0U4XHU1MTY1XHUzMDAyXG4gICAqL1xuICBidWlsZEluaXRTY3JpcHQoKTogc3RyaW5nIHtcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5lbmFibGVkKSByZXR1cm4gXCJcIjtcbiAgICByZXR1cm4gYCgoKSA9PiB7XG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCAxLiBcdTk2OTBcdTg1Q0YgbmF2aWdhdG9yLndlYmRyaXZlclx1RkYwOFx1NjcwMFx1N0VDRlx1NTE3OFx1NzY4NFx1NjhDMFx1NkQ0Qlx1NzBCOVx1RkYwOSBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5hdmlnYXRvciwgJ3dlYmRyaXZlcicsIHsgZ2V0OiAoKSA9PiB1bmRlZmluZWQgfSk7XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIDIuIFx1NEYyQVx1ODhDNSBwbHVnaW5zXHVGRjA4XHU3NzFGXHU1QjlFXHU2RDRGXHU4OUM4XHU1NjY4XHU5MDFBXHU1RTM4XHU2NzA5IFBERiBcdTY3RTVcdTc3MEJcdTU2NjhcdTdCNDlcdTYzRDJcdTRFRjZcdUZGMDkgXHUyNTAwXHUyNTAwXHUyNTAwXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuYXZpZ2F0b3IsICdwbHVnaW5zJywge1xuICAgIGdldDogKCkgPT4ge1xuICAgICAgY29uc3QgcGx1Z2luTGlzdCA9IFtcbiAgICAgICAgeyBuYW1lOiAnQ2hyb21lIFBERiBQbHVnaW4nLCBmaWxlbmFtZTogJ2ludGVybmFsLXBkZi12aWV3ZXInLCBkZXNjcmlwdGlvbjogJ1BvcnRhYmxlIERvY3VtZW50IEZvcm1hdCcgfSxcbiAgICAgICAgeyBuYW1lOiAnQ2hyb21lIFBERiBWaWV3ZXInLCBmaWxlbmFtZTogJ21oamZibWRnY2ZqYmJwYWVvam9mb2hvZWZnaWVoamFpJywgZGVzY3JpcHRpb246ICcnIH0sXG4gICAgICAgIHsgbmFtZTogJ05hdGl2ZSBDbGllbnQnLCBmaWxlbmFtZTogJ2ludGVybmFsLW5hY2wtcGx1Z2luJywgZGVzY3JpcHRpb246ICcnIH1cbiAgICAgIF07XG4gICAgICBjb25zdCByZXN1bHQgPSB7IGxlbmd0aDogcGx1Z2luTGlzdC5sZW5ndGgsIGl0ZW06IChpKSA9PiBwbHVnaW5MaXN0W2ldLCBuYW1lZEl0ZW06IChuKSA9PiBwbHVnaW5MaXN0LmZpbmQocCA9PiBwLm5hbWUgPT09IG4pIHx8IG51bGwgfTtcbiAgICAgIGZvciAoY29uc3QgcCBvZiBwbHVnaW5MaXN0KSByZXN1bHRbcC5uYW1lXSA9IHA7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIDMuIFx1NEYyQVx1ODhDNSBsYW5ndWFnZXNcdUZGMDhcdTRFMEVcdTc3MUZcdTVCOUUgQ2hyb21lIFx1NUJGOVx1OUY1MFx1RkYwOSBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5hdmlnYXRvciwgJ2xhbmd1YWdlcycsIHsgZ2V0OiAoKSA9PiBbJ2VuLVVTJywgJ2VuJywgJ3poLUNOJ10gfSk7XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIDQuIFx1OTY5MFx1ODVDRiBBdXRvbWF0aW9uQ29udHJvbGxlZCBcdTc1RDVcdThGRjkgXHUyNTAwXHUyNTAwXHUyNTAwXG4gIGlmICh3aW5kb3cuY2hyb21lKSB7XG4gICAgLy8gXHU3ODZFXHU0RkREIGNocm9tZS5ydW50aW1lIFx1NUI1OFx1NTcyOFx1RkYwOFx1NzcxRlx1NUI5RVx1NkQ0Rlx1ODlDOFx1NTY2OFx1NEUyRFx1OEJFNVx1NUJGOVx1OEM2MVx1NUI1OFx1NTcyOFx1RkYwOVxuICAgIGlmICghd2luZG93LmNocm9tZS5ydW50aW1lKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LmNocm9tZSwgJ3J1bnRpbWUnLCB7IHZhbHVlOiB7fSB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgNS4gXHU0RkVFXHU2NTM5IHBlcm1pc3Npb25zIFx1NjJBNVx1NTQ0QVx1RkYwOFx1OTA3Rlx1NTE0RFx1OEZENFx1NTZERSBkZW5pZWQgXHU4OEFCXHU4QkM2XHU1MjJCXHVGRjA5IFx1MjUwMFx1MjUwMFx1MjUwMFxuICBjb25zdCBvcmlnaW5hbFF1ZXJ5ID0gd2luZG93Lm5hdmlnYXRvci5wZXJtaXNzaW9ucyAmJiB3aW5kb3cubmF2aWdhdG9yLnBlcm1pc3Npb25zLnF1ZXJ5O1xuICBpZiAob3JpZ2luYWxRdWVyeSkge1xuICAgIHdpbmRvdy5uYXZpZ2F0b3IucGVybWlzc2lvbnMucXVlcnkgPSAocGFyYW1ldGVycykgPT4gKFxuICAgICAgcGFyYW1ldGVycyAmJiBwYXJhbWV0ZXJzLm5hbWUgPT09ICdub3RpZmljYXRpb25zJ1xuICAgICAgICA/IFByb21pc2UucmVzb2x2ZSh7IHN0YXRlOiBOb3RpZmljYXRpb24ucGVybWlzc2lvbiB9KVxuICAgICAgICA6IG9yaWdpbmFsUXVlcnkocGFyYW1ldGVycylcbiAgICApO1xuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIDYuIFx1NTE2OFx1N0VBNyBzdGVhbHRoXHVGRjFBXHU2NkY0XHU1OTFBXHU2MzA3XHU3RUI5XHU0RjJBXHU4OEM1IFx1MjUwMFx1MjUwMFx1MjUwMFxuICAke3RoaXMub3B0aW9ucy5sZXZlbCA9PT0gXCJmdWxsXCIgPyBgXG4gIC8vIFx1NEYyQVx1ODhDNSBjb25zb2xlLmRlYnVnIFx1NEUwRFx1NEVBN1x1NzUxRlx1NTUyRlx1NEUwMFx1OEMwM1x1NzUyOFx1NjgwOFxuICAvLyBcdTRGMkFcdTg4QzUgd2luZG93Lm91dGVyV2lkdGgvb3V0ZXJIZWlnaHRcdUZGMDhoZWFkbGVzcyBcdTZENEZcdTg5QzhcdTU2NjhcdTdBOTdcdTUzRTNcdTVDM0FcdTVCRjhcdTVERUVcdTVGMDJcdUZGMDlcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdywgJ291dGVyV2lkdGgnLCB7IGdldDogKCkgPT4gd2luZG93LmlubmVyV2lkdGggfHwgMTkyMCB9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdywgJ291dGVySGVpZ2h0JywgeyBnZXQ6ICgpID0+IHdpbmRvdy5pbm5lckhlaWdodCB8fCAxMDgwIH0pO1xuXG4gIC8vIFx1NEYyQVx1ODhDNSBzY3JlZW4gXHU1M0MyXHU2NTcwXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuc2NyZWVuLCAnY29sb3JEZXB0aCcsIHsgZ2V0OiAoKSA9PiAyNCB9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5zY3JlZW4sICdwaXhlbERlcHRoJywgeyBnZXQ6ICgpID0+IDI0IH0pO1xuXG4gIC8vIFx1NEYyQVx1ODhDNVx1N0Y2RVx1ODlFNlx1NjQ3OFx1NjUyRlx1NjMwMVx1RkYwOFx1OTA3Rlx1NTE0RCBoZWFkbGVzcyBcdTY4QzBcdTZENEJcdTUyMzBcdTY1RTBcdTg5RTZcdTY0NzhcdTgwRkRcdTUyOUJcdUZGMDlcbiAgaWYgKCEoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3csICdvbnRvdWNoc3RhcnQnLCB7IHZhbHVlOiBudWxsIH0pO1xuICB9XG5cbiAgLy8gXHU0RjJBXHU4OEM1IERldmljZU1lbW9yeSBcdTU0OEMgSGFyZHdhcmVDb25jdXJyZW5jeVxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobmF2aWdhdG9yLCAnZGV2aWNlTWVtb3J5JywgeyBnZXQ6ICgpID0+IDggfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuYXZpZ2F0b3IsICdoYXJkd2FyZUNvbmN1cnJlbmN5JywgeyBnZXQ6ICgpID0+IDggfSk7XG5cbiAgLy8gXHU0RjJBXHU4OEM1IFdlYkdMIFx1NkUzMlx1NjdEM1x1NTY2OFx1RkYwOFx1OTA3Rlx1NTE0RFx1NjZCNFx1OTczMiBTd2lmdFNoYWRlciBcdTdCNDlcdTY1RTBcdTU5MzRcdTZFMzJcdTY3RDNcdTU2NjhcdUZGMDlcbiAgdHJ5IHtcbiAgICBjb25zdCBnZXRQYXJhbWV0ZXIgPSBXZWJHTFJlbmRlcmluZ0NvbnRleHQucHJvdG90eXBlLmdldFBhcmFtZXRlcjtcbiAgICBXZWJHTFJlbmRlcmluZ0NvbnRleHQucHJvdG90eXBlLmdldFBhcmFtZXRlciA9IGZ1bmN0aW9uKHBhcmFtZXRlcikge1xuICAgICAgaWYgKHBhcmFtZXRlciA9PT0gMzc0NDUpIHJldHVybiAnR29vZ2xlIEluYy4gKE5WSURJQSknO1xuICAgICAgaWYgKHBhcmFtZXRlciA9PT0gMzc0NDYpIHJldHVybiAnQU5HTEUgKE5WSURJQSwgTlZJRElBIEdlRm9yY2UgUlRYIDMwNjAgRGlyZWN0M0QxMSB2c181XzAgcHNfNV8wLCBEM0QxMSknO1xuICAgICAgcmV0dXJuIGdldFBhcmFtZXRlci5jYWxsKHRoaXMsIHBhcmFtZXRlcik7XG4gICAgfTtcbiAgfSBjYXRjaCAoZSkge31cbiAgYCA6IFwiXCJ9XG59KSgpO2A7XG4gIH1cblxuICAvKipcbiAgICogXHU0RUJBXHU3QzdCXHU4ODRDXHU0RTNBXHU2QTIxXHU2MkRGIFx1MjAxNFx1MjAxNCBcdTc1MUZcdTYyMTBcdTk2OEZcdTY3M0FcdTc2ODRcdTRFQkFcdTdDN0JcdTUzMTZcdTUyQThcdTRGNUNcdTk1RjRcdTk2OTRcdTMwMDJcbiAgICogXHU4QzAzXHU3NTI4XHU2NUI5XHU1NzI4XHU1MkE4XHU0RjVDXHU0RTRCXHU5NUY0XHU0RjdGXHU3NTI4XHU4QkU1XHU5NUY0XHU5Njk0XHVGRjBDXHU2QTIxXHU2MkRGXHU0RUJBXHU3Njg0XHU2NENEXHU0RjVDXHU4MjgyXHU1OTRGXHUzMDAyXG4gICAqL1xuICBodW1hbkRlbGF5KCk6IG51bWJlciB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZW5hYmxlZCkgcmV0dXJuIDA7XG4gICAgY29uc3QgW21pbiwgbWF4XSA9IHRoaXMub3B0aW9ucy5odW1hbkFjdGlvbkRlbGF5ITtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgfVxuXG4gIC8qKiBcdTRFQkFcdTdDN0JcdTYyNTNcdTVCNTdcdTVFRjZcdThGREZcdUZGMDh0eXBlIFx1NTJBOFx1NEY1Q1x1NjVGNlx1OTAxMFx1OTUyRVx1NEU0Qlx1OTVGNFx1NzY4NFx1OTY4Rlx1NjczQVx1OTVGNFx1OTY5NFx1RkYwOSAqL1xuICBodW1hblR5cGluZ0RlbGF5TXMoKTogbnVtYmVyIHtcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5lbmFibGVkKSByZXR1cm4gMDtcbiAgICBjb25zdCBbbWluLCBtYXhdID0gdGhpcy5vcHRpb25zLmh1bWFuVHlwaW5nRGVsYXkhO1xuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xuICB9XG5cbiAgLyoqXG4gICAqIFx1NzUxRlx1NjIxMFx1NEVCQVx1N0M3Qlx1NTMxNlx1NzY4NFx1OUYyMFx1NjgwN1x1NzlGQlx1NTJBOFx1OERFRlx1NUY4NFx1RkYwOFx1OEQxRFx1NTg1RVx1NUMxNFx1NjZGMlx1N0VCRlx1NjNEMlx1NTAzQ1x1RkYwOVx1MzAwMlxuICAgKiBcdThGRDRcdTU2REVcdTRFMDBcdTdFQzQgW1t4LHldLCAuLi5dIFx1NTc1MFx1NjgwN1x1NUU4Rlx1NTIxN1x1RkYwQ1x1NEY5Qlx1OEMwM1x1NzUyOFx1NjVCOVx1NEY5RFx1NkIyMVx1NzlGQlx1NTJBOFx1OUYyMFx1NjgwN1x1MzAwMlxuICAgKi9cbiAgaHVtYW5Nb3VzZVBhdGgoZnJvbTogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9LCB0bzogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9LCBzdGVwcyA9IDEyKTogQXJyYXk8W251bWJlciwgbnVtYmVyXT4ge1xuICAgIGlmICghdGhpcy5vcHRpb25zLmVuYWJsZWQgfHwgIXRoaXMub3B0aW9ucy5odW1hbk1vdXNlVHJhamVjdG9yeSkge1xuICAgICAgcmV0dXJuIFtbdG8ueCwgdG8ueV1dO1xuICAgIH1cbiAgICBjb25zdCBwYXRoOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RlcHM7IGkrKykge1xuICAgICAgY29uc3QgdCA9IChpICsgMSkgLyBzdGVwcztcbiAgICAgIC8vIFx1N0I4MFx1NTM1NVx1NEU4Q1x1NkIyMVx1OEQxRFx1NTg1RVx1NUMxNFx1RkYwQ1x1NTJBMFx1NTE2NVx1OTY4Rlx1NjczQVx1NjI3MFx1NTJBOFx1NkEyMVx1NjJERlx1NzcxRlx1NUI5RVx1NjI0Qlx1OTBFOFx1OEZEMFx1NTJBOFxuICAgICAgY29uc3QgY29udHJvbFggPSAoZnJvbS54ICsgdG8ueCkgLyAyICsgKE1hdGgucmFuZG9tKCkgLSAwLjUpICogNDA7XG4gICAgICBjb25zdCBjb250cm9sWSA9IE1hdGgubWluKGZyb20ueSwgdG8ueSkgLSBNYXRoLnJhbmRvbSgpICogMzA7XG4gICAgICBjb25zdCB4ID0gKDEgLSB0KSAqKiAyICogZnJvbS54ICsgMiAqICgxIC0gdCkgKiB0ICogY29udHJvbFggKyB0ICoqIDIgKiB0by54O1xuICAgICAgY29uc3QgeSA9ICgxIC0gdCkgKiogMiAqIGZyb20ueSArIDIgKiAoMSAtIHQpICogdCAqIGNvbnRyb2xZICsgdCAqKiAyICogdG8ueTtcbiAgICAgIHBhdGgucHVzaChbTWF0aC5yb3VuZCh4KSwgTWF0aC5yb3VuZCh5KV0pO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuXG4gIC8qKiBcdTc1MUZcdTYyMTBcdTU1MkZcdTRFMDBcdTdCN0VcdTU0MERcdTY4MDdcdThCQzZcdUZGMDhcdTc1MjhcdTRFOEVcdTY4MDdcdThCQjAgc3RlYWx0aCBcdTVGMDBcdTU0MkZcdTcyQjZcdTYwMDFcdUZGMDkgKi9cbiAgZ2V0IHNpZ25hdHVyZSgpOiBzdHJpbmcge1xuICAgIGlmICghdGhpcy5vcHRpb25zLmVuYWJsZWQpIHJldHVybiBcInN0ZWFsdGgtb2ZmXCI7XG4gICAgcmV0dXJuIGBzdGVhbHRoOiR7dGhpcy5vcHRpb25zLmxldmVsfTp1YT0ke3RoaXMub3B0aW9ucy51c2VyQWdlbnQgPyBcImN1c3RvbVwiIDogXCJkZWZhdWx0XCJ9YDtcbiAgfVxufVxuXG4vKiogXHU0RkJGXHU2Mzc3XHU1MUZEXHU2NTcwXHVGRjFBXHU1MjFCXHU1RUZBIHN0ZWFsdGggXHU3QkExXHU3NDA2XHU1NjY4ICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3RlYWx0aChvcHRpb25zPzogU3RlYWx0aE9wdGlvbnMpOiBTdGVhbHRoTWFuYWdlciB7XG4gIHJldHVybiBuZXcgU3RlYWx0aE1hbmFnZXIob3B0aW9ucyk7XG59XG4iLCAiLyoqXG4gKiBUb2tlbiBcdTlBRDhcdTY1NDhcdTYzRDBcdTUzRDZcdTdCNTZcdTc1NjVcbiAqXG4gKiBcdTUwMUZcdTkyNzQgQ2hyb21lIERldlRvb2xzIE1DUCBcdTc2ODQgNSBcdTY2MUYgVG9rZW4gXHU2NTQ4XHU3Mzg3XHVGRjFBXG4gKiAxLiBET00gXHU2MzA5XHU5NzAwXHU4OEMxXHU1MjZBXHVGRjA4XHU1M0VBXHU4QkZCXHU5NzAwXHU4OTgxXHU3Njg0XHU0RkUxXHU2MDZGXHVGRjA5XG4gKiAyLiBcdTU4OUVcdTkxQ0ZcdThCRkJcdTUzRDZcdUZGMDhcdTUxNDhcdTY0NThcdTg5ODFcdUZGMENcdTYzMDkgcmVmIFx1NUM1NVx1NUYwMFx1RkYwOVxuICogMy4gXHU3RUQzXHU2Nzg0XHU1MzE2XHU1MzhCXHU3RjI5XHU4RjkzXHU1MUZBXG4gKi9cbmltcG9ydCB0eXBlIHsgUGFnZVNuYXBzaG90LCBTbmFwc2hvdE5vZGUgfSBmcm9tIFwiQG9wZW5saXVsYW4vY29yZVwiO1xuXG4vKiogVG9rZW4gXHU0RjMwXHU3Qjk3XHVGRjFBXHU3Qzk3XHU3NTY1IDQgXHU1QjU3XHU3QjI2L3Rva2VuICovXG5leHBvcnQgZnVuY3Rpb24gZXN0aW1hdGVUb2tlbnModGV4dDogc3RyaW5nKTogbnVtYmVyIHtcbiAgcmV0dXJuIE1hdGguY2VpbCh0ZXh0Lmxlbmd0aCAvIDQpO1xufVxuXG4vKiogXHU1RkVCXHU3MTY3XHU3Njg0XHU2NzAwXHU1QzBGXHU1MzE2XHU2NTg3XHU2NzJDXHU4ODY4XHU3OTNBXHVGRjA4XHU0RjlCIExMTVx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhY3RTbmFwc2hvdChzbmFwc2hvdDogUGFnZVNuYXBzaG90LCBtYXhJbnRlcmFjdGl2ZSA9IDQwKTogc3RyaW5nIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XG4gIHBhcnRzLnB1c2goYFske3NuYXBzaG90LnRpdGxlfV0gJHtzbmFwc2hvdC51cmx9YCk7XG4gIGNvbnN0IHJvd3MgPSBzbmFwc2hvdC5pbnRlcmFjdGl2ZS5zbGljZSgwLCBtYXhJbnRlcmFjdGl2ZSkubWFwKFxuICAgIChlbCkgPT4gYCR7ZWwucmVmfToke2VsLnRhZ30ke2VsLnJvbGUgPyBcIltcIiArIGVsLnJvbGUgKyBcIl1cIiA6IFwiXCJ9OlwiJHtlbC50ZXh0LnNsaWNlKDAsIDYwKX1cImBcbiAgKTtcbiAgcGFydHMucHVzaChyb3dzLmpvaW4oXCJcXG5cIikpO1xuICByZXR1cm4gcGFydHMuam9pbihcIlxcblwiKTtcbn1cblxuLyoqIFx1NTM1NVx1NEUyQVx1ODI4Mlx1NzBCOVx1NTM4Qlx1N0YyOVx1NEUzQVx1NEUwMFx1ODg0QyAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vZGVUb0xpbmUobm9kZTogU25hcHNob3ROb2RlKTogc3RyaW5nIHtcbiAgY29uc3QgYXR0cnMgPSBPYmplY3QuZW50cmllcyhub2RlLmF0dHJpYnV0ZXMpXG4gICAgLm1hcCgoW2ssIHZdKSA9PiBgJHtrfT1cIiR7dn1cImApXG4gICAgLmpvaW4oXCIgXCIpO1xuICByZXR1cm4gYCR7bm9kZS5yZWZ9IDwke25vZGUudGFnfSR7YXR0cnMgPyBcIiBcIiArIGF0dHJzIDogXCJcIn0+IFwiJHtub2RlLnRleHR9XCJgO1xufVxuXG4vKipcbiAqIFx1NTg5RVx1OTFDRlx1OEJGQlx1NTNENlx1RkYxQVx1N0VEOVx1NUI5QVx1NzZFRVx1NjgwNyByZWZcdUZGMENcdThGRDRcdTU2REVcdThCRTVcdTgyODJcdTcwQjlcdTUzQ0FcdTUxNzZcdTRFMDBcdTdFQTdcdTVCNTBcdTY4MTFcdTc2ODRcdTdEMjdcdTUxRDFcdTY1ODdcdTY3MkNcdTMwMDJcbiAqIFx1NzUyOFx1NEU4RSBBSSBcdTk3MDBcdTg5ODFcdTY3RTVcdTc3MEJcdTY3RDBcdTUxNDNcdTdEMjBcdTUxODVcdTkwRThcdThCRTZcdTYwQzVcdTY1RjZcdTYyNERcdTVDNTVcdTVGMDBcdUZGMENcdTkwN0ZcdTUxNERcdTUxNjhcdTkxQ0ZcdTUyQTBcdThGN0RcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZE5vZGUoc25hcHNob3Q6IFBhZ2VTbmFwc2hvdCwgcmVmOiBzdHJpbmcsIGRlcHRoID0gMSk6IHN0cmluZyB7XG4gIGNvbnN0IGZvdW5kID0gZmluZE5vZGUoc25hcHNob3Qucm9vdCwgcmVmKTtcbiAgaWYgKCFmb3VuZCkgcmV0dXJuIGBcdTY3MkFcdTYyN0VcdTUyMzAgcmVmPSR7cmVmfWA7XG4gIHJldHVybiByZW5kZXJOb2RlKGZvdW5kLCAwLCBkZXB0aCk7XG59XG5cbmZ1bmN0aW9uIGZpbmROb2RlKG5vZGU6IFNuYXBzaG90Tm9kZSB8IHVuZGVmaW5lZCwgcmVmOiBzdHJpbmcpOiBTbmFwc2hvdE5vZGUgfCB1bmRlZmluZWQge1xuICBpZiAoIW5vZGUpIHJldHVybiB1bmRlZmluZWQ7XG4gIGlmIChub2RlLnJlZiA9PT0gcmVmKSByZXR1cm4gbm9kZTtcbiAgZm9yIChjb25zdCBjIG9mIG5vZGUuY2hpbGRyZW4gfHwgW10pIHtcbiAgICBjb25zdCBoaXQgPSBmaW5kTm9kZShjLCByZWYpO1xuICAgIGlmIChoaXQpIHJldHVybiBoaXQ7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gcmVuZGVyTm9kZShub2RlOiBTbmFwc2hvdE5vZGUsIGRlcHRoOiBudW1iZXIsIG1heERlcHRoOiBudW1iZXIpOiBzdHJpbmcge1xuICBjb25zdCBpbmRlbnQgPSBcIiAgXCIucmVwZWF0KGRlcHRoKTtcbiAgbGV0IG91dCA9IGluZGVudCArIG5vZGVUb0xpbmUobm9kZSk7XG4gIGlmIChkZXB0aCA8IG1heERlcHRoICYmIG5vZGUuY2hpbGRyZW4/Lmxlbmd0aCkge1xuICAgIGZvciAoY29uc3QgYyBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICBvdXQgKz0gXCJcXG5cIiArIHJlbmRlck5vZGUoYywgZGVwdGggKyAxLCBtYXhEZXB0aCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8qKlxuICogXHU0RUNFXHU1RkVCXHU3MTY3XHU0RTJEXHU2M0QwXHU1M0Q2XHUzMDBDXHU1RjUzXHU1MjREXHU4OUM2XHU1M0UzXHU1MTg1XHUzMDBEXHU3Njg0XHU1MTczXHU5NTJFXHU1MTQzXHU3RDIwXHVGRjA4XHU3NTI4XHU0RThFXHU4MDVBXHU3MTI2XHVGRjBDXHU1MUNGXHU1QzExIFRva2VuXHVGRjA5XHUzMDAyXG4gKiBcdTUwMUZcdTUyQTlcdTY4MzlcdTgyODJcdTcwQjlcdTkwNERcdTUzODZcdTRGRERcdTc1NTlcdTZCQ0ZcdTRFMkFcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGtleUVsZW1lbnRzKHNuYXBzaG90OiBQYWdlU25hcHNob3QsIGxpbWl0ID0gMzApOiBBcnJheTx7IHJlZjogc3RyaW5nOyB0YWc6IHN0cmluZzsgdGV4dDogc3RyaW5nIH0+IHtcbiAgcmV0dXJuIHNuYXBzaG90LmludGVyYWN0aXZlLnNsaWNlKDAsIGxpbWl0KTtcbn1cbiIsICIvKipcbiAqIHNlY3VyaXR5LnRzIFx1MjAxNFx1MjAxNCBcdTVCODlcdTUxNjhcdTUyQTBcdTU2RkFcdTZBMjFcdTU3NTdcbiAqXG4gKiBcdTk0ODhcdTVCRjkgQnJvd3NlciBBSSBGb3JnZSBcdTc2ODRcdTZENEZcdTg5QzhcdTU2NjhcdTgxRUFcdTUyQThcdTUzMTZcdTgwRkRcdTUyOUJcdTUwNUFcdTVCODlcdTUxNjhcdTUyQTBcdTU2RkFcdUZGMENcdTkxQ0RcdTcwQjlcdTk2MzJcdTVGQTFcdUZGMUFcbiAqIDEuICoqXHU2NTRGXHU2MTFGXHU0RkUxXHU2MDZGXHU2Q0M0XHU5NzMyXHVGRjA4XHU0RUU0XHU3MjRDL1x1NUJDNlx1NzgwMVx1RkYwOSoqXHVGRjFBXHU5ODc1XHU5NzYyXHU1RkVCXHU3MTY3XHUzMDAxVVJMXHUzMDAxXHU2NUU1XHU1RkQ3XHUzMDAxXHU0RThCXHU0RUY2XHU2RDQxXHUzMDAxXHU5NTE5XHU4QkVGIGRldGFpbFxuICogICAgXHU0RTJEXHU1M0VGXHU4MEZEXHU2NDNBXHU1RTI2XHU3NTI4XHU2MjM3XHU0RUU0XHU3MjRDXHUzMDAxXHU1QkM2XHU3ODAxXHUzMDAxQVBJIEtleSBcdTdCNDlcdTY1NEZcdTYxMUZcdTRGRTFcdTYwNkZcdUZGMENcdTk3MDBcdTg5ODFcdTdFREZcdTRFMDBcdTgxMzFcdTY1NEZcdUZGMDhyZWRhY3RcdUZGMDlcdTMwMDJcbiAqIDIuICoqSFRUUCBcdTY3MERcdTUyQTFcdTg4QUJcdTZFMTdcdTkwMEYvXHU2M0QwXHU2NzQzKipcdUZGMUFgL3Rvb2xzL2NhbGxgIFx1NTE0MVx1OEJCOFx1OEZEQ1x1N0EwQlx1NjNBN1x1NTIzNlx1NzcxRlx1NUI5RVx1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwQ1xuICogICAgXHU1RkM1XHU5ODdCXHU1MDVBXHU5Mjc0XHU2NzQzXHVGRjA4QmVhcmVyIFRva2VuXHVGRjA5KyBcdTY3NjVcdTZFOTBcdTk2NTBcdTUyMzYgKyBcdThCRjdcdTZDNDJcdTRGNTNcdTU5MjdcdTVDMEZcdTk2NTBcdTUyMzZcdUZGMENcdTk2MzJcdTZCNjJcdTRFRkJcdTYxMEZcdTRFQkFcdThDMDNcdTc1MjhcdTMwMDJcbiAqIDMuICoqXHU0RUZCXHU2MTBGIEpTIFx1NkNFOFx1NTE2NVx1RkYwOGV2YWxcdUZGMDkqKlx1RkYxQWBldmFsYCBcdTVERTVcdTUxNzdcdTUxNDFcdThCQjhcdTZDRThcdTUxNjVcdTRFRkJcdTYxMEZcdTgxMUFcdTY3MkNcdUZGMENcdTk3MDBcdTUwNUFcdTUzNzFcdTk2NjlcdTY0Q0RcdTRGNUNcdTYyRTZcdTYyMkFcbiAqICAgIFx1NEUwRVx1NUI4OVx1NTE2OFx1NjNEMFx1NzkzQVx1MzAwMlxuICogNC4gKipTU1JGIFx1OThDRVx1OTY2OSoqXHVGRjFBXHU4MUVBXHU1QjlBXHU0RTQ5XHU2Mjk1XHU5MDEyXHVGRjA4d2ViaG9va1x1RkYwOVx1NzY4NCBgZmV0Y2godGFyZ2V0KWAgXHU3NkVFXHU2ODA3XHU2NzJBXHU2ODIxXHU5QThDXHVGRjBDXHU1M0VGXHU4MEZEXG4gKiAgICBcdTg4QUJcdTUyMjlcdTc1MjhcdThCQkZcdTk1RUVcdTUxODVcdTdGNTFcdThENDRcdTZFOTBcdUZGMENcdTk3MDBcdTk2NTBcdTUyMzZcdTc2RUVcdTY4MDdcdTRFM0FcdTY2M0VcdTVGMEZcdTUxNDFcdThCQjhcdTc2ODQgaHR0cChzKSBcdTU3MzBcdTU3NDBcdTVFNzZcdTYyRDJcdTdFRERcdTUxODVcdTdGNTEvSVBcdTMwMDJcbiAqXG4gKiBcdTYyNDBcdTY3MDlcdTUxRkRcdTY1NzBcdTU3NDdcdTRFM0FcdTdFQUZcdTUxRkRcdTY1NzAvXHU1RTQyXHU3QjQ5XHVGRjBDXHU0RTBEXHU2NTM5XHU1M0Q4XHU1MzlGXHU1QkY5XHU4QzYxXHVGRjBDXHU4RkQ0XHU1NkRFXHU4MTMxXHU2NTRGXHU1NDBFXHU3Njg0XHU1MjZGXHU2NzJDXHVGRjBDXHU2NUI5XHU0RkJGXHU1NzI4XHU1NDA0XHU5MDAyXHU5MTREXHU1QzQyXHU1OTBEXHU3NTI4XHUzMDAyXG4gKi9cbmltcG9ydCBjcnlwdG8gZnJvbSBcIm5vZGU6Y3J5cHRvXCI7XG5cbi8qID09PT09PT09PT09PT09PT09PT09PSBcdTY1NEZcdTYxMUZcdTVCNTdcdTZCQjVcdTVCOUFcdTRFNDkgPT09PT09PT09PT09PT09PT09PT09ICovXG5cbi8qKiBcdTVFMzhcdTg5QzFcdTc2ODRcdTY1NEZcdTYxMUZcdTUzQzJcdTY1NzBcdTU0MERcdUZGMDhxdWVyeSAvIGJvZHkgLyBoZWFkZXIgLyBcdTVDNUVcdTYwMjdcdUZGMDlcdTIwMTRcdTIwMTQgXHU1NDdEXHU0RTJEXHU1MzczXHU4MTMxXHU2NTRGICovXG5jb25zdCBTRU5TSVRJVkVfS0VZUyA9IFtcbiAgXCJ0b2tlblwiLFxuICBcImFjY2Vzc190b2tlblwiLFxuICBcInJlZnJlc2hfdG9rZW5cIixcbiAgXCJzZWNyZXRcIixcbiAgXCJjbGllbnRfc2VjcmV0XCIsXG4gIFwicGFzc3dvcmRcIixcbiAgXCJwYXNzd2RcIixcbiAgXCJwd2RcIixcbiAgXCJhcGlrZXlcIixcbiAgXCJhcGlfa2V5XCIsXG4gIFwiYXBpLWtleVwiLFxuICBcImF1dGhcIixcbiAgXCJhdXRob3JpemF0aW9uXCIsXG4gIFwiY29va2llXCIsXG4gIFwic2V0LWNvb2tpZVwiLFxuICBcInNlc3Npb25pZFwiLFxuICBcInNpZFwiLFxuICBcImtleVwiLFxuICBcInByaXZhdGVfa2V5XCIsXG4gIFwicHJpdmF0ZWtleVwiLFxuICBcInNpZ25hdHVyZVwiLFxuICBcImNyZWRlbnRpYWxcIixcbiAgXCJjcmVkZW50aWFsc1wiLFxuICBcIngtYXBpLWtleVwiLFxuICBcIngtYXV0aC10b2tlblwiLFxuICBcImp3dFwiLFxuXTtcblxuLyoqIFx1NTIyNFx1NjVBRFx1NUI1N1x1NkJCNVx1NTQwRFx1NjYyRlx1NTQyNlx1NEUzQVx1NjU0Rlx1NjExRlx1NUI1N1x1NkJCNSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU2Vuc2l0aXZlS2V5KGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IGsgPSBrZXkudG9Mb3dlckNhc2UoKTtcbiAgLy8gc2Vzc2lvbklkIC8gc2Vzc2lvbiBcdTRGMUFcdThCRERcdTY4MDdcdThCQzZcdTY3MkNcdThFQUJcdTk3NUVcdTY1NEZcdTYxMUZcdUZGMDhcdTRFQzVcdTc3MUZcdTZCNjNcdTc2ODRcdTRGMUFcdThCRERcdTRFRTRcdTcyNENcdTYyNERcdTk3MDBcdTgxMzFcdTY1NEZcdUZGMDlcbiAgaWYgKGsgPT09IFwic2Vzc2lvblwiIHx8IGsgPT09IFwic2Vzc2lvbmlkXCIgfHwgayA9PT0gXCJzaWRcIikgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gU0VOU0lUSVZFX0tFWVMuc29tZSgocykgPT4gay5pbmNsdWRlcyhzKSk7XG59XG5cbi8qKiBcdTgxMzFcdTY1NEZcdTUzNjBcdTRGNERcdUZGMDhcdTRGRERcdTc1NTlcdTk1N0ZcdTVFQTZcdTYzRDBcdTc5M0FcdUZGMDkgKi9cbmZ1bmN0aW9uIG1hc2sodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghdmFsdWUpIHJldHVybiB2YWx1ZTtcbiAgaWYgKHZhbHVlLmxlbmd0aCA8PSAyKSByZXR1cm4gXCIqKioqXCI7XG4gIGNvbnN0IGhlYWQgPSB2YWx1ZS5zbGljZSgwLCAyKTtcbiAgY29uc3QgdGFpbCA9IHZhbHVlLmxlbmd0aCA+IDYgPyB2YWx1ZS5zbGljZSgtMikgOiBcIlwiO1xuICByZXR1cm4gYCR7aGVhZH0qKioqJHt0YWlsfSAoJHt2YWx1ZS5sZW5ndGh9IGNoYXJzKWA7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PSBcdTVCRjlcdThDNjFcdTZERjFcdTgxMzFcdTY1NEYgPT09PT09PT09PT09PT09PT09PT09ICovXG5cbi8qKlxuICogXHU2REYxXHU1RUE2XHU5MDREXHU1Mzg2XHU0RUZCXHU2MTBGXHU1QkY5XHU4QzYxL1x1NjU3MFx1N0VDNC9cdTVCNTdcdTdCMjZcdTRFMzJcdUZGMENcdTVCRjlcdTMwMENcdTY1NEZcdTYxMUZcdTVCNTdcdTZCQjVcdTU0MERcdTMwMERcdTc2ODRcdTUwM0NcdTUwNUFcdTgxMzFcdTY1NEZcdTMwMDJcbiAqIFx1NzUyOFx1NEU4RVx1NjVFNVx1NUZENyBwYXlsb2FkXHUzMDAxXHU0RThCXHU0RUY2XHU2RDQxXHUzMDAxXHU5NTE5XHU4QkVGIGRldGFpbFx1MzAwMUFJTWVzc2FnZSBcdTdCNDlcdTdFRDNcdTY3ODRcdTUzMTZcdTY1NzBcdTYzNkVcdTMwMDJcbiAqIFx1OEZENFx1NTZERVx1ODEzMVx1NjU0Rlx1NTQwRVx1NzY4NFx1NTI2Rlx1NjcyQ1x1RkYwOFx1NEUwRFx1NEZFRVx1NjUzOVx1NTM5Rlx1NUJGOVx1OEM2MVx1RkYwOVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVkYWN0RGVlcCh2YWx1ZTogdW5rbm93biwgZGVwdGggPSAwLCBtYXhEZXB0aCA9IDEyKTogdW5rbm93biB7XG4gIGlmIChkZXB0aCA+IG1heERlcHRoKSByZXR1cm4gdW5kZWZpbmVkO1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHZhbHVlO1xuXG4gIC8vIFx1NUI1N1x1N0IyNlx1NEUzMlx1NzZGNFx1NjNBNVx1OEZENFx1NTZERVx1RkYwOFx1NUI1N1x1NkJCNVx1NTQwRFx1N0VBN1x1NTIyQlx1NzY4NFx1ODEzMVx1NjU0Rlx1NzUzMVx1NEUwQVx1NUM0MiBpc1NlbnNpdGl2ZUtleSBcdTUxQjNcdTVCOUFcdUZGMDlcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS5tYXAoKHYpID0+IHJlZGFjdERlZXAodiwgZGVwdGggKyAxLCBtYXhEZXB0aCkpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIikge1xuICAgIGNvbnN0IG91dDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyh2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikpIHtcbiAgICAgIGlmIChpc1NlbnNpdGl2ZUtleShrKSkge1xuICAgICAgICBvdXRba10gPSB0eXBlb2YgdiA9PT0gXCJzdHJpbmdcIiA/IG1hc2sodikgOiBcIioqKlJFREFDVEVEKioqXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXRba10gPSByZWRhY3REZWVwKHYsIGRlcHRoICsgMSwgbWF4RGVwdGgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT0gVVJMIFx1ODEzMVx1NjU0RiA9PT09PT09PT09PT09PT09PT09PT0gKi9cblxuLyoqXG4gKiBcdTVCRjkgVVJMIFx1NTA1QVx1ODEzMVx1NjU0Rlx1RkYxQVx1OTY5MFx1ODVDRiBxdWVyeSAvIGhhc2ggXHU0RTJEXHU3Njg0XHU2NTRGXHU2MTFGXHU1M0MyXHU2NTcwXHU1MDNDXHUzMDAyXG4gKiBcdTRGOEJcdUZGMUFgaHR0cHM6Ly94LmNvbS9sb2dpbj90b2tlbj1hYmMxMjMmbmV4dD0vaG9tZWAgLT4gYGh0dHBzOi8veC5jb20vbG9naW4/dG9rZW49YWIqKioqMjMgKDggY2hhcnMpJm5leHQ9L2hvbWVgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWRhY3RVcmwocmF3VXJsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIXJhd1VybCkgcmV0dXJuIHJhd1VybDtcbiAgdHJ5IHtcbiAgICBjb25zdCB1ID0gbmV3IFVSTChyYXdVcmwpO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIFsuLi51LnNlYXJjaFBhcmFtcy5rZXlzKCldKSB7XG4gICAgICBpZiAoaXNTZW5zaXRpdmVLZXkoa2V5KSkge1xuICAgICAgICBjb25zdCB2ID0gdS5zZWFyY2hQYXJhbXMuZ2V0KGtleSkgPz8gXCJcIjtcbiAgICAgICAgdS5zZWFyY2hQYXJhbXMuc2V0KGtleSwgbWFzayh2KSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGhhc2ggXHU0RTJEXHU1M0VGXHU4MEZEXHU2NDNBXHU1RTI2IHRva2VuXHVGRjA4XHU1OTgyIFNQQSBcdTc2ODQgI2FjY2Vzc190b2tlbj14eHhcdUZGMDlcbiAgICBpZiAodS5oYXNoICYmIC8odG9rZW58YWNjZXNzX3Rva2VufHNlY3JldHxhdXRoKT0vaS50ZXN0KHUuaGFzaCkpIHtcbiAgICAgIHUuaGFzaCA9IFwiIyMjUkVEQUNURUQjIyNcIjtcbiAgICB9XG4gICAgLy8gXHU3NTI4XHU2MjM3XHU1NDBEXHU1QkM2XHU3ODAxXHU1RjYyXHU1RjBGXHVGRjA4aHR0cDovL3VzZXI6cGFzc0Bob3N0XHVGRjA5XG4gICAgaWYgKHUudXNlcm5hbWUgfHwgdS5wYXNzd29yZCkge1xuICAgICAgdS51c2VybmFtZSA9IFwiKioqXCI7XG4gICAgICB1LnBhc3N3b3JkID0gXCIqKipcIjtcbiAgICB9XG4gICAgcmV0dXJuIHUudG9TdHJpbmcoKTtcbiAgfSBjYXRjaCB7XG4gICAgLy8gXHU5NzVFXHU2Q0Q1IFVSTFx1RkYxQVx1NEVDNVx1NUJGOVx1NjYwRVx1NjYzRVx1NzY4NCBrZXk9dmFsdWUgXHU1MDVBXHU3Qzk3XHU3NTY1XHU4MTMxXHU2NTRGXG4gICAgcmV0dXJuIHJhd1VybC5yZXBsYWNlKFxuICAgICAgLyhbPyZdKHRva2VufHBhc3N3b3JkfHBhc3N3ZHxzZWNyZXR8YXBpW18tXT9rZXl8YXV0aHxhY2Nlc3NfdG9rZW58cmVmcmVzaF90b2tlbnxjbGllbnRfc2VjcmV0KT0pW14mXSovZ2ksXG4gICAgICBcIiQxKioqUkVEQUNURUQqKipcIlxuICAgICk7XG4gIH1cbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09IEhUVFAgXHU5Mjc0XHU2NzQzID09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEh0dHBBdXRoQ29uZmlnIHtcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NTQyRlx1NzUyOFx1OTI3NFx1Njc0M1x1RkYwOFx1OUVEOFx1OEJBNFx1RkYxQVx1NjcyQVx1OTE0RFx1N0Y2RSB0b2tlbiBcdTY1RjZcdTRFNUZcdTYyRDJcdTdFRERcdThGRENcdTdBMEJcdTY3NjVcdTZFOTBcdUZGMDkgKi9cbiAgZW5hYmxlZD86IGJvb2xlYW47XG4gIC8qKiBcdTUxNDFcdThCQjhcdTc2ODQgQmVhcmVyIFRva2VuXHVGRjA4XHU1OTFBXHU0RTJBXHU0RUU1XHU5MDE3XHU1M0Y3XHU1MjA2XHU5Njk0XHVGRjFCXHU2NzY1XHU4MUVBXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGIEZPUkdFX0hUVFBfVE9LRU4gXHU2MjE2XHU5MTREXHU3RjZFXHVGRjA5ICovXG4gIHRva2Vucz86IHN0cmluZ1tdO1xuICAvKiogXHU0RUM1XHU1MTQxXHU4QkI4XHU2NzY1XHU4MUVBXHU4RkQ5XHU0RTlCIEhvc3QvT3JpZ2luIFx1NzY4NFx1OEJGN1x1NkM0Mlx1RkYwOFx1Njc2NVx1ODFFQSBGT1JHRV9IVFRQX0FMTE9XRURfT1JJR0lOU1x1RkYwQ1x1OTAxN1x1NTNGN1x1NTIwNlx1OTY5NFx1RkYwOSAqL1xuICBhbGxvd2VkT3JpZ2lucz86IHN0cmluZ1tdO1xuICAvKiogXHU0RUM1XHU1MTQxXHU4QkI4XHU1NkRFXHU3M0FGL1x1NjcyQ1x1NjczQVx1NTczMFx1NTc0MFx1OEJCRlx1OTVFRVx1RkYwOFx1OUVEOFx1OEJBNCB0cnVlXHVGRjBDXHU2NzJBXHU5MTREXHU3RjZFIHRva2VuIFx1NjVGNlx1NUYzQVx1NTIzNiB0cnVlXHVGRjA5ICovXG4gIGxvb3BiYWNrT25seT86IGJvb2xlYW47XG59XG5cbi8qKiBcdTRFQ0VcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0ZcdTY3ODRcdTVFRkEgSFRUUCBcdTkyNzRcdTY3NDNcdTkxNERcdTdGNkUgKi9cbmV4cG9ydCBmdW5jdGlvbiBodHRwQXV0aENvbmZpZ0Zyb21FbnYoKTogSHR0cEF1dGhDb25maWcge1xuICBjb25zdCByYXdUb2tlbnMgPSBwcm9jZXNzLmVudi5GT1JHRV9IVFRQX1RPS0VOID8/IFwiXCI7XG4gIGNvbnN0IHJhd09yaWdpbnMgPSBwcm9jZXNzLmVudi5GT1JHRV9IVFRQX0FMTE9XRURfT1JJR0lOUyA/PyBcIlwiO1xuICBjb25zdCBsb29wYmFjayA9IChwcm9jZXNzLmVudi5GT1JHRV9IVFRQX0xPT1BCQUNLX09OTFkgPz8gXCJ0cnVlXCIpLnRvTG93ZXJDYXNlKCkgIT09IFwiZmFsc2VcIjtcbiAgcmV0dXJuIHtcbiAgICBlbmFibGVkOiAhIXJhd1Rva2VucyxcbiAgICB0b2tlbnM6IHJhd1Rva2Vucy5zcGxpdChcIixcIikubWFwKCh0KSA9PiB0LnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pLFxuICAgIGFsbG93ZWRPcmlnaW5zOiByYXdPcmlnaW5zLnNwbGl0KFwiLFwiKS5tYXAoKG8pID0+IG8udHJpbSgpKS5maWx0ZXIoQm9vbGVhbiksXG4gICAgbG9vcGJhY2tPbmx5OiBsb29wYmFjayxcbiAgfTtcbn1cblxuLyoqIFx1NTIyNFx1NjVBRFx1OEJGN1x1NkM0Mlx1Njc2NVx1NkU5MFx1NjYyRlx1NTQyNlx1NEUzQVx1NTZERVx1NzNBRlx1NTczMFx1NTc0MFx1RkYwOFx1NTQyQiBJUHY0L0lQdjYgXHU0RTBFIDo6ZmZmZjogXHU2NjIwXHU1QzA0XHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gaXNMb29wYmFja1JlbW90ZShhZGRyOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgaWYgKCFhZGRyKSByZXR1cm4gZmFsc2U7XG4gIGxldCBhID0gYWRkci50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgLy8gXHU1M0JCXHU2Mzg5XHU3QUVGXHU1M0UzXHVGRjFBSVB2NCBcdTc2ODQgOnBvcnQgLyBJUHY2IFx1NzY4NCBdOnBvcnQgLyBcdTdFQUYgSVB2NiBcdTc2ODQgJXpvbmVcbiAgaWYgKC9eXFxbLipcXF06Ly50ZXN0KGEpKSBhID0gYS5zbGljZSgxLCBhLmluZGV4T2YoXCJdXCIpKTtcbiAgZWxzZSBpZiAoL146OmZmZmY6L2kudGVzdChhKSkgYSA9IGEuc2xpY2UoNyk7IC8vIElQdjQgXHU2NjIwXHU1QzA0IDo6ZmZmZjoxMjcuMC4wLjFcbiAgZWxzZSBpZiAoYS5pbmNsdWRlcyhcIjpcIikgJiYgIWEuc3RhcnRzV2l0aChcIjo6XCIpKSBhID0gYS5zcGxpdChcIjpcIilbMF07XG4gIGEgPSBhLnJlcGxhY2UoL1xcL1xcZCskLywgXCJcIikucmVwbGFjZSgvJVxcdyskLywgXCJcIik7XG4gIHJldHVybiBhID09PSBcIjEyNy4wLjAuMVwiIHx8IGEgPT09IFwiOjoxXCIgfHwgYSA9PT0gXCJsb2NhbGhvc3RcIiB8fCBhID09PSBcIjA6MDowOjA6MDowOjA6MVwiO1xufVxuXG4vKipcbiAqIFx1NjgyMVx1OUE4QyBIVFRQIFx1OEJGN1x1NkM0Mlx1NjYyRlx1NTQyNlx1ODhBQlx1NjM4OFx1Njc0M1x1MzAwMlxuICogQHBhcmFtIHJlbW90ZUFkZHJlc3MgXHU4QkY3XHU2QzQyXHU2NUI5XHU1NzMwXHU1NzQwXHVGRjA4XHU1OTgyIGAxMjcuMC4wLjE6NTQzMjFgIFx1NjIxNiBgcmVxLnNvY2tldC5yZW1vdGVBZGRyZXNzYFx1RkYwOVxuICogQHBhcmFtIG9yaWdpbiBcdThCRjdcdTZDNDJcdTc2ODQgT3JpZ2luIC8gUmVmZXJlciBcdTU5MzRcdUZGMDhcdTUzRUZcdTRFM0FcdTdBN0FcdUZGMDlcbiAqIEBwYXJhbSBhdXRob3JpemF0aW9uIEF1dGhvcml6YXRpb24gXHU1OTM0XHVGRjA4XHU1M0VGXHU0RTNBXHU3QTdBXHVGRjA5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhdXRob3JpemVIdHRwUmVxdWVzdChcbiAgY2ZnOiBIdHRwQXV0aENvbmZpZyxcbiAgcmVtb3RlQWRkcmVzczogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBvcmlnaW46IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgYXV0aG9yaXphdGlvbjogc3RyaW5nIHwgdW5kZWZpbmVkXG4pOiB7IG9rOiBib29sZWFuOyByZWFzb24/OiBzdHJpbmcgfSB7XG4gIC8vIDEpIFx1NTZERVx1NzNBRlx1OTY1MFx1NTIzNlx1RkYxQVx1NjcyQVx1OTE0RFx1N0Y2RSB0b2tlbiBcdTYyMTZcdTY2M0VcdTVGMEZcdTg5ODFcdTZDNDIgbG9vcGJhY2tPbmx5IFx1NjVGNlx1RkYwQ1x1NjJEMlx1N0VERFx1OTc1RVx1NjcyQ1x1NjczQVx1Njc2NVx1NkU5MFx1RkYwOFx1OTYzMlx1OEZEQ1x1N0EwQlx1NkUxN1x1OTAwRlx1RkYwOVxuICBjb25zdCBsb29wYmFja09ubHkgPSBjZmcubG9vcGJhY2tPbmx5ID8/ICFjZmcuZW5hYmxlZDtcbiAgaWYgKGxvb3BiYWNrT25seSAmJiAhaXNMb29wYmFja1JlbW90ZShyZW1vdGVBZGRyZXNzKSkge1xuICAgIHJldHVybiB7IG9rOiBmYWxzZSwgcmVhc29uOiBcIlx1NEVDNVx1NTE0MVx1OEJCOFx1NjcyQ1x1NjczQVx1OEJCRlx1OTVFRVx1RkYwOEZPUkdFX0hUVFBfTE9PUEJBQ0tfT05MWT10cnVlXHVGRjA5XHUzMDAyXCIgfTtcbiAgfVxuXG4gIC8vIDIpIEJlYXJlciBUb2tlbiBcdTkyNzRcdTY3NDNcdUZGMDhcdTgyRTVcdTY3MDlcdTkxNERcdTdGNkVcdUZGMDlcbiAgaWYgKGNmZy5lbmFibGVkICYmIGNmZy50b2tlbnM/Lmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gYXV0aG9yaXphdGlvbj8ucmVwbGFjZSgvXkJlYXJlclxccysvaSwgXCJcIikudHJpbSgpID8/IFwiXCI7XG4gICAgY29uc3QgdG9rZW5IYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goXCJzaGEyNTZcIikudXBkYXRlKHRva2VuKS5kaWdlc3QoXCJoZXhcIik7XG4gICAgY29uc3QgdmFsaWQgPSBjZmcudG9rZW5zLnNvbWUoKHQpID0+IHtcbiAgICAgIGNvbnN0IHRIYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goXCJzaGEyNTZcIikudXBkYXRlKHQpLmRpZ2VzdChcImhleFwiKTtcbiAgICAgIC8vIFx1NjA1Mlx1NUI5QVx1NjVGNlx1OTVGNFx1NkJENFx1OEY4M1x1RkYwQ1x1OTYzMlx1NjVGNlx1NUU4Rlx1NjUzQlx1NTFGQlxuICAgICAgY29uc3QgYSA9IEJ1ZmZlci5mcm9tKHRIYXNoKTtcbiAgICAgIGNvbnN0IGIgPSBCdWZmZXIuZnJvbSh0b2tlbkhhc2gpO1xuICAgICAgcmV0dXJuIGEubGVuZ3RoID09PSBiLmxlbmd0aCAmJiBjcnlwdG8udGltaW5nU2FmZUVxdWFsKGEsIGIpO1xuICAgIH0pO1xuICAgIGlmICghdmFsaWQpIHJldHVybiB7IG9rOiBmYWxzZSwgcmVhc29uOiBcIlx1NjVFMFx1NjU0OFx1NjIxNlx1N0YzQVx1NTkzMVx1NzY4NCBBUEkgVG9rZW5cdTMwMDJcIiB9O1xuICB9XG5cbiAgLy8gMykgXHU2NzY1XHU2RTkwXHU3NjdEXHU1NDBEXHU1MzU1XHVGRjA4XHU4MkU1XHU2NzA5XHU5MTREXHU3RjZFXHVGRjA5XG4gIGlmIChjZmcuYWxsb3dlZE9yaWdpbnM/Lmxlbmd0aCkge1xuICAgIGlmICghb3JpZ2luKSByZXR1cm4geyBvazogZmFsc2UsIHJlYXNvbjogXCJcdTdGM0FcdTVDMTFcdTY3NjVcdTZFOTAgT3JpZ2luL1JlZmVyZXIgXHU1OTM0XHUzMDAyXCIgfTtcbiAgICBjb25zdCBhbGxvd2VkID0gY2ZnLmFsbG93ZWRPcmlnaW5zLnNvbWUoKG8pID0+IHtcbiAgICAgIGlmIChvID09PSBcIipcIikgcmV0dXJuIHRydWU7XG4gICAgICByZXR1cm4gb3JpZ2luID09PSBvIHx8IG9yaWdpbi5zdGFydHNXaXRoKGAke299L2ApIHx8IG9yaWdpbi5zdGFydHNXaXRoKGAke28ucmVwbGFjZSgvXFwvJC8sIFwiXCIpfTpgKTtcbiAgICB9KTtcbiAgICBpZiAoIWFsbG93ZWQpIHJldHVybiB7IG9rOiBmYWxzZSwgcmVhc29uOiBcIlx1Njc2NVx1NkU5MFx1NjcyQVx1ODhBQlx1NTE0MVx1OEJCOFx1MzAwMlwiIH07XG4gIH1cblxuICByZXR1cm4geyBvazogdHJ1ZSB9O1xufVxuXG4vKipcbiAqIFx1NzUxRlx1NjIxMFx1NEUwMFx1NEUyQVx1NUI4OVx1NTE2OFx1NzY4NFx1OTY4Rlx1NjczQSBBUEkgVG9rZW5cdUZGMDhcdTRGOUJcdTk5OTZcdTZCMjFcdTkwRThcdTdGNzJcdTY1RjZcdTUxOTlcdTUxNjVcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0ZcdUZGMDlcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQXBpVG9rZW4oKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNyeXB0by5yYW5kb21CeXRlcygzMikudG9TdHJpbmcoXCJoZXhcIik7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PSBldmFsIC8gXHU1MzcxXHU5NjY5XHU4MTFBXHU2NzJDXHU2MkU2XHU2MjJBID09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4vKiogXHU5QUQ4XHU1MzcxXHU2NENEXHU0RjVDXHU2QTIxXHU1RjBGXHVGRjFBXHU2OEMwXHU2RDRCXHU2Q0U4XHU1MTY1XHU4MTFBXHU2NzJDXHU0RTJEXHU3Njg0XHU1MzcxXHU5NjY5XHU4ODRDXHU0RTNBXHVGRjA4XHU2M0QwXHU2NzQzL1x1NkUxN1x1OTAwRlx1NUMxRFx1OEJENVx1RkYwOSAqL1xuY29uc3QgREFOR0VST1VTX0pTX1BBVFRFUk5TOiBBcnJheTx7IGxhYmVsOiBzdHJpbmc7IHJlOiBSZWdFeHAgfT4gPSBbXG4gIHsgbGFiZWw6IFwiXHU2NTg3XHU0RUY2XHU3Q0ZCXHU3RURGXHU4QkJGXHU5NUVFXCIsIHJlOiAvcmVxdWlyZVxccypcXChcXHMqWydcIl1mc1snXCJdfG5vZGU6ZnN8cmVhZEZpbGV8d3JpdGVGaWxlfHJtU3luY3x1bmxpbmtTeW5jL2kgfSxcbiAgeyBsYWJlbDogXCJcdTVCNTBcdThGREJcdTdBMEJcdTYyNjdcdTg4NENcIiwgcmU6IC9jaGlsZF9wcm9jZXNzfGV4ZWNTeW5jfHNwYXduU3luY3xcXGJleGVjXFxzKlxcKHxwcm9jZXNzXFwuZXhlYy9pIH0sXG4gIHsgbGFiZWw6IFwiXHU3RjUxXHU3RURDXHU2RTE3XHU5MDBGXCIsIHJlOiAvcHJvY2Vzc1xcLmVudnxfX3Byb3RvX198Y29uc3RydWN0b3JcXHMqXFwoXFxzKlsnXCJdY29uc3RydWN0b3IvaSB9LFxuICB7IGxhYmVsOiBcIlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NkYwRlx1NkQxRVx1NTIyOVx1NzUyOFwiLCByZTogL2V4cGxvaXR8YnlwYXNzfGJ5cGFzcy4qc2VjdXJpdHl8ZGlzYWJsZS4qc2VjdXJpdHl8Y2VydGlmaWNhdGUvaSB9LFxuXTtcblxuZXhwb3J0IGludGVyZmFjZSBFdmFsR3VhcmRSZXN1bHQge1xuICBhbGxvd2VkOiBib29sZWFuO1xuICByZWFzb25zPzogc3RyaW5nW107XG4gIC8qKiBcdTY2MkZcdTU0MjZcdTU0N0RcdTRFMkRcdTlBRDhcdTUzNzFcdUZGMDhcdTk3MDBcdTVGM0FcdTUyMzZcdTYyRTZcdTYyMkFcdUZGMDkgKi9cbiAgYmxvY2tlZDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBcdTY4MjFcdTlBOENcdTRFMDBcdTZCQjVcdTVDMDZcdTg5ODFcdTZDRThcdTUxNjVcdTYyNjdcdTg4NENcdTc2ODQgSlMgXHU2NjJGXHU1NDI2XHU1Qjg5XHU1MTY4XHUzMDAyXG4gKiBcdTU0N0RcdTRFMkRcdTlBRDhcdTUzNzFcdTZBMjFcdTVGMEYgXHUyMTkyIFx1NUYzQVx1NTIzNlx1NjJFNlx1NjIyQVx1RkYxQlx1NjcyQVx1NTQ3RFx1NEUyRFx1NEY0Nlx1NTQyQlx1NkY1Q1x1NTcyOFx1OThDRVx1OTY2OSBcdTIxOTIgXHU1MTQxXHU4QkI4XHU0RjQ2XHU5NjQ0XHU1RTI2XHU4QjY2XHU1NDRBXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBndWFyZEpzU2NyaXB0KHNjcmlwdDogc3RyaW5nKTogRXZhbEd1YXJkUmVzdWx0IHtcbiAgY29uc3QgYmxvY2tlZFJlYXNvbnM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgeyBsYWJlbCwgcmUgfSBvZiBEQU5HRVJPVVNfSlNfUEFUVEVSTlMpIHtcbiAgICBpZiAocmUudGVzdChzY3JpcHQpKSBibG9ja2VkUmVhc29ucy5wdXNoKGxhYmVsKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGFsbG93ZWQ6IGJsb2NrZWRSZWFzb25zLmxlbmd0aCA9PT0gMCxcbiAgICBibG9ja2VkOiBibG9ja2VkUmVhc29ucy5sZW5ndGggPiAwLFxuICAgIHJlYXNvbnM6IGJsb2NrZWRSZWFzb25zLFxuICB9O1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT0gXHU2NTg3XHU2NzJDXHU2MkE1XHU1NDRBXHU4MTMxXHU2NTRGID09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4vKipcbiAqIFx1NUJGOVx1NEVGQlx1NjEwRlx1NjU4N1x1NjcyQ1x1RkYwOFx1OEJDQVx1NjVBRFx1NjJBNVx1NTQ0QVx1MzAwMVx1NjVFNVx1NUZEN1x1MzAwMVx1NUZFQlx1NzE2N1x1NjU4N1x1NjcyQ1x1MzAwMVx1OTUxOVx1OEJFRiBkZXRhaWxcdUZGMDlcdTUwNUFcdTdDOTdcdTdDOTJcdTVFQTZcdTgxMzFcdTY1NEZcdUZGMUFcbiAqIFx1OTY5MFx1ODVDRlx1NUY2Mlx1NTk4MiBgdG9rZW49eHh4YFx1MzAwMWBwYXNzd29yZDogeHh4YFx1MzAwMWBCZWFyZXIgeHh4YFx1MzAwMWBBdXRob3JpemF0aW9uOiB4eHhgIFx1NzY4NFx1NzI0N1x1NkJCNVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVkYWN0VGV4dChyYXc6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghcmF3KSByZXR1cm4gcmF3O1xuICByZXR1cm4gcmF3XG4gICAgLnJlcGxhY2UoLyhCZWFyZXJcXHMrKVtBLVphLXowLTkuX34rLz0tXSsvZ2ksIFwiJDEqKipSRURBQ1RFRCoqKlwiKVxuICAgIC5yZXBsYWNlKC8oQXV0aG9yaXphdGlvblxccypbOj1dXFxzKikoPzpCZWFyZXJcXHMrKT9bQS1aYS16MC05Ll9+Ky89LV0rL2dpLCBcIiQxKioqUkVEQUNURUQqKipcIilcbiAgICAucmVwbGFjZSgvKFs/Jl0oPzp0b2tlbnxwYXNzd29yZHxwYXNzd2R8c2VjcmV0fGFwaVtfLV0/a2V5fGFjY2Vzc190b2tlbnxyZWZyZXNoX3Rva2VufGNsaWVudF9zZWNyZXR8YXV0aCk9KVteJlxcc1wiJ10rL2dpLCBcIiQxKioqUkVEQUNURUQqKipcIilcbiAgICAucmVwbGFjZSgvKHBhc3N3b3JkXFxzKls6PV1cXHMqWydcIl0/KVteJ1wiXFxzLDtdKy9naSwgXCIkMSoqKlJFREFDVEVEKioqXCIpO1xufVxuXG4vKiogXHU2QzQ3XHU2MDNCXHU1MTY1XHU1M0UzXHVGRjFBXHU1QkY5XHU3RUQzXHU2Nzg0XHU1MzE2XHU1QkY5XHU4QzYxXHU1MDVBXHU2REYxXHU4MTMxXHU2NTRGXHVGRjBDXHU1RTc2XHU4RkQ0XHU1NkRFXHU4MTMxXHU2NTRGXHU1NDBFXHU3Njg0XHU1MjZGXHU2NzJDICovXG5leHBvcnQgZnVuY3Rpb24gc2FuaXRpemUodmFsdWU6IHVua25vd24pOiB1bmtub3duIHtcbiAgcmV0dXJuIHJlZGFjdERlZXAodmFsdWUpO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT0gU1NSRiBcdTk2MzJcdTYyQTQgPT09PT09PT09PT09PT09PT09PT09ICovXG5cbi8qKlxuICogXHU1MjI0XHU2NUFEXHU0RTAwXHU0RTJBIGhvc3RuYW1lIFx1NjYyRlx1NTQyNlx1NEUzQVx1MzAwQ1x1NzlDMVx1NjcwOS9cdTU2REVcdTczQUYvXHU5NEZFXHU4REVGXHU2NzJDXHU1NzMwL1x1NEU5MVx1NTE0M1x1NjU3MFx1NjM2RVx1MzAwRFx1NTczMFx1NTc0MFx1RkYwOFx1NTQyQiBJUHY0L0lQdjZcdUZGMDlcdTMwMDJcbiAqIFx1NzUyOFx1NEU4RSB3ZWJob29rIC8gXHU4MUVBXHU1QjlBXHU0RTQ5XHU2Mjk1XHU5MDEyXHU3QjQ5IGBmZXRjaCh0YXJnZXQpYCBcdTUyNERcdTc2ODQgU1NSRiBcdTYyRTZcdTYyMkFcdUZGMENcdTk2MzJcdTZCNjJcdTg4QUJcdTUyMjlcdTc1MjhcdThCQkZcdTk1RUVcdTUxODVcdTdGNTFcdThENDRcdTZFOTBcdTMwMDJcbiAqXG4gKiBcdTg5ODZcdTc2RDZcdTU3M0FcdTY2NkZcdUZGMDhcdTc3MUZcdTVCOUVcdTZFMTdcdTkwMEZcdTdFRDVcdThGQzdcdTcwQjlcdUZGMENcdTVGQzVcdTk4N0JcdTg5ODZcdTc2RDZcdUZGMDlcdUZGMUFcbiAqIC0gSVB2NCBcdTU2REVcdTczQUYgMTI3LjAuMC4wLzhcbiAqIC0gSVB2NiBcdTU2REVcdTczQUYgOjoxIFx1NTNDQVx1NTE3Nlx1NUUyNlx1NjVCOVx1NjJFQ1x1NTNGN1x1NTE5OVx1NkNENSBbOjoxXVxuICogLSBcdTc5QzFcdTY3MDlcdTdGNTFcdTZCQjUgMTAvOFx1MzAwMTE3Mi4xNi8xMlx1MzAwMTE5Mi4xNjgvMTZcbiAqIC0gQ0dOQVQgMTAwLjY0LzEwXG4gKiAtIFx1OTRGRVx1OERFRlx1NjcyQ1x1NTczMCAvIFx1NEU5MVx1NTE0M1x1NjU3MFx1NjM2RSAxNjkuMjU0LzE2XHVGRjA4XHU1OTgyIEFXUyAxNjkuMjU0LjE2OS4yNTRcdUZGMENcdTUzRUZcdTdBODNcdTUzRDYgSUFNIFx1NTFFRFx1OEJDMVx1RkYwOVxuICogLSBJUHY0LW1hcHBlZCBJUHY2IDo6ZmZmZjp4LngueC54XG4gKiAtIFx1N0VDNFx1NjRBRC9cdTRGRERcdTc1NTlcdTZCQjUgMjI0LzRcdTMwMDEyNDAvNFx1MzAwMTE5OC4xOC8xNVx1MzAwMTE5Mi4wLjAvMjRcbiAqIC0gXHU1MTY4XHU5NkY2IDAuMC4wLjBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJpdmF0ZU9yTG9vcGJhY2tIb3N0KGhvc3RuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgaWYgKCFob3N0bmFtZSkgcmV0dXJuIGZhbHNlO1xuICAvLyBcdTUzQkJcdTYzODkgSVB2NiBcdTY1QjlcdTYyRUNcdTUzRjdcdUZGMDhuZXcgVVJMKCkuaG9zdG5hbWUgXHU1QkY5IFs6OjFdIFx1NEYxQVx1NEZERFx1NzU1OVx1NjVCOVx1NjJFQ1x1NTNGN1x1RkYwOVxuICBsZXQgaCA9IGhvc3RuYW1lLnRyaW0oKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL15cXFt8XFxdJC9nLCBcIlwiKTtcblxuICAvLyBcdTU3REZcdTU0MERcdUZGMUEubG9jYWwgXHU3RUQzXHU1QzNFXHU4OUM2XHU0RTNBXHU1MTg1XHU3RjUxXHVGRjA4bUROU1x1RkYwOVxuICBpZiAoaC5lbmRzV2l0aChcIi5sb2NhbFwiKSkgcmV0dXJuIHRydWU7XG4gIGlmIChoID09PSBcImxvY2FsaG9zdFwiKSByZXR1cm4gdHJ1ZTtcblxuICAvLyBJUHY2IFx1NTZERVx1NzNBRlx1RkYwOFx1NTQyQiBJUHY0LW1hcHBlZCA6OmZmZmY6MTI3LjAuMC4xIFx1NjYyMFx1NUMwNFx1NUY2Mlx1NUYwRlx1RkYwOVxuICBpZiAoaCA9PT0gXCI6OjFcIiB8fCBoID09PSBcIjA6MDowOjA6MDowOjA6MVwiKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKGguc3RhcnRzV2l0aChcIjo6ZmZmZjpcIikpIHtcbiAgICAvLyBcdTYyOEEgOjpmZmZmOmEuYi5jLmQgXHU2NjIwXHU1QzA0XHU1NkRFIElQdjQgXHU1NDBFXHU5MDEyXHU1RjUyXHU1MjI0XHU2NUFEXG4gICAgY29uc3QgbWFwcGVkVjQgPSBoLnJlcGxhY2UoL146OmZmZmY6LywgXCJcIikucmVwbGFjZSgvXjAqKFswLTlhLWZdezEsNH0pOjAqKFswLTlhLWZdezEsNH0pJC8sIChfLCBhLCBiKSA9PiB7XG4gICAgICBjb25zdCBpcCA9IChoZXg6IHN0cmluZykgPT4gYCR7cGFyc2VJbnQoaGV4LCAxNikgPj4gOH0uJHtwYXJzZUludChoZXgsIDE2KSAmIDB4ZmZ9YDtcbiAgICAgIHJldHVybiBgJHtpcChhKX0uJHtpcChiKX1gO1xuICAgIH0pO1xuICAgIGlmICgvXlxcZCtcXC5cXGQrXFwuXFxkK1xcLlxcZCskLy50ZXN0KG1hcHBlZFY0KSkgcmV0dXJuIGlzUHJpdmF0ZU9yTG9vcGJhY2tIb3N0KG1hcHBlZFY0KTtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gXHU1MTc2XHU0RUQ2IDo6ZmZmZjogXHU1RjYyXHU1RjBGXHVGRjA4XHU1OTgyIDo6ZmZmZjo3ZjAwOjFcdUZGMDlcdTRFMDBcdTVGOEJcdTg5QzZcdTRFM0FcdTUxODVcdTdGNTFcdTY2MjBcdTVDMDRcbiAgfVxuXG4gIC8vIElQdjYgXHU1MTc2XHU0RUQ2XHU2NzJDXHU1NzMwL1x1OTRGRVx1OERFRlx1NjcyQ1x1NTczMFx1RkYwOGZjMDA6Oi83IFVMQVx1MzAwMWZlODA6Oi8xMCBcdTk0RkVcdThERUZcdTY3MkNcdTU3MzBcdUZGMDlcdTRFMEVcdTUxNjhcdTk2RjZcbiAgaWYgKGguaW5jbHVkZXMoXCI6XCIpICYmICFoLmluY2x1ZGVzKFwiLlwiKSkge1xuICAgIGlmIChoID09PSBcIjo6XCIgfHwgaCA9PT0gXCIwOjA6MDowOjA6MDowOjBcIikgcmV0dXJuIHRydWU7XG4gICAgaWYgKC9eZltjZF0vLnRlc3QoaCkgfHwgL15mZVs4OWFiXS8udGVzdChoKSkgcmV0dXJuIHRydWU7IC8vIFVMQSAvIFx1OTRGRVx1OERFRlx1NjcyQ1x1NTczMFxuICAgIC8vIFx1OTc1RVx1NTE2OFx1NUM0MFx1NTM1NVx1NjRBRFx1NTI0RFx1N0YwMFx1RkYwOFx1NEUwRFx1NEVFNSAyIFx1NjIxNiAzIFx1NUYwMFx1NTkzNFx1RkYwOVx1NEZERFx1NUI4OFx1ODlDNlx1NEUzQVx1NTE4NVx1N0Y1MS9cdTRGRERcdTc1NTlcbiAgICBpZiAoIS9eWzIzXVswLTlhLWZdezN9Oi8udGVzdChoKSkgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gSVB2NCBcdTdGNTFcdTZCQjVcdTUyMjRcdTY1QURcbiAgY29uc3QgbSA9IGgubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pJC8pO1xuICBpZiAobSkge1xuICAgIGNvbnN0IGEgPSBOdW1iZXIobVsxXSk7XG4gICAgY29uc3QgYiA9IE51bWJlcihtWzJdKTtcbiAgICBjb25zdCBjID0gTnVtYmVyKG1bM10pO1xuICAgIGlmIChhID09PSAxMCkgcmV0dXJuIHRydWU7IC8vIDEwLzhcbiAgICBpZiAoYSA9PT0gMTcyICYmIGIgPj0gMTYgJiYgYiA8PSAzMSkgcmV0dXJuIHRydWU7IC8vIDE3Mi4xNi8xMlxuICAgIGlmIChhID09PSAxOTIgJiYgYiA9PT0gMTY4KSByZXR1cm4gdHJ1ZTsgLy8gMTkyLjE2OC8xNlxuICAgIGlmIChhID09PSAxMjcpIHJldHVybiB0cnVlOyAvLyAxMjcvOCBcdTU2REVcdTczQUZcbiAgICBpZiAoYSA9PT0gMTY5ICYmIGIgPT09IDI1NCkgcmV0dXJuIHRydWU7IC8vIDE2OS4yNTQvMTYgXHU5NEZFXHU4REVGXHU2NzJDXHU1NzMwL1x1NEU5MVx1NTE0M1x1NjU3MFx1NjM2RVxuICAgIGlmIChhID09PSAxMDAgJiYgYiA+PSA2NCAmJiBiIDw9IDEyNykgcmV0dXJuIHRydWU7IC8vIDEwMC42NC8xMCBDR05BVFxuICAgIGlmIChhID09PSAwICYmIGIgPT09IDAgJiYgYyA9PT0gMCkgcmV0dXJuIHRydWU7IC8vIDAuMC4wLjBcbiAgICBpZiAoYSA+PSAyMjQpIHJldHVybiB0cnVlOyAvLyBcdTdFQzRcdTY0QUQvXHU0RkREXHU3NTU5XG4gICAgaWYgKGEgPT09IDE5OCAmJiAoYiA9PT0gMTggfHwgYiA9PT0gMTkpKSByZXR1cm4gdHJ1ZTsgLy8gMTk4LjE4LzE1IFx1NTdGQVx1NTFDNlx1NkQ0Qlx1OEJENVxuICAgIGlmIChhID09PSAxOTIgJiYgYiA9PT0gMCkgcmV0dXJuIHRydWU7IC8vIDE5Mi4wLjAvMjRcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBcdTk3NUUgSVAgXHU1N0RGXHU1NDBEXHU5RUQ4XHU4QkE0XHU4OUM2XHU0RTNBXHU1MTZDXHU3RjUxXHVGRjA4XHU0RUE0XHU3NTMxXHU0RTBBXHU2RTM4IEROUyBcdTg5RTNcdTY3OTBcdUZGMDlcbiAgcmV0dXJuIGZhbHNlO1xufVxuIiwgIi8qKlxuICogU2Vzc2lvbkxvZ2dlciBcdTIwMTRcdTIwMTQgXHU0RjFBXHU4QkREXHU0RThCXHU0RUY2XHU2NUU1XHU1RkQ3XHU1NjY4XG4gKlxuICogXHU3RUY0XHU2MkE0XHU0RTAwXHU2NzYxKipcdThGREVcdThEMkZcdTc2ODRcdTRFOEJcdTRFRjZcdTZENDEqKlx1RkYwQ1x1OEJBOVx1NTkxNlx1OTBFOCBBSSAvIElERSBcdTgwRkRcdUZGMUFcbiAqIC0gXHU4QkEyXHU5NjA1XHU1QjlFXHU2NUY2XHU0RThCXHU0RUY2XHVGRjA4RXZlbnRFbWl0dGVyIFx1NUYwRlx1NjNBOFx1OTAwMVx1RkYwOVxuICogLSBcdTYyQzlcdTUzRDZcdTUzODZcdTUzRjJcdTRFOEJcdTRFRjZcdTVGRUJcdTcxNjdcdUZGMDhgdG9BcnJheWAgLyBgZXhwb3J0TWFya2Rvd25gXHVGRjA5XG4gKiAtIFx1NzUxRlx1NjIxMFx1NEVCQVx1N0M3Qlx1NTNFRlx1OEJGQlx1NzY4NFx1NjI2N1x1ODg0Q1x1OEY2OFx1OEZGOVx1RkYwOFx1NTZERVx1NjUzRVx1NTJBOFx1NEY1QyArIFx1OEJDQVx1NjVBRCArIFx1OTUxOVx1OEJFRiArIFx1NjIyQVx1NTZGRVx1RkYwOVxuICpcbiAqIFx1OEZEOVx1NjYyRlx1MzAwQ1x1OERERiBJREUgLyBcdTU5MTZcdTkwRTggQUkgXHU1MzRGXHU0RjVDXHUzMDBEXHU3Njg0XHU2RDg4XHU2MDZGXHU2MDNCXHU3RUJGXHVGRjFBXHU2ODQ2XHU2N0I2XHU2MjQwXHU2NzA5XHU1MkE4XHU0RjVDXHUzMDAxXHU4QkNBXHU2NUFEXHUzMDAxXHU5NTE5XHU4QkVGXHUzMDAxXG4gKiBcdTYyMkFcdTU2RkVcdTMwMDFcdTY1RTVcdTVGRDdcdTkwRkRcdTZDNDdcdTUxNjVcdThGRDlcdTkxQ0NcdUZGMENcdTUxOERcdTc1MzFcdTkwMDJcdTkxNERcdTVDNDJcdUZGMDhzdGRpby9IVFRQL2hhcm5lc3MvQ0xJXHVGRjA5XHU4RjZDXHU1M0QxXHU3RUQ5XHU1OTE2XHU5MEU4IEFJXHUzMDAyXG4gKi9cbmltcG9ydCB0eXBlIHtcbiAgRXZlbnRMZXZlbCxcbiAgRXZlbnRDYXRlZ29yeSxcbiAgRm9yZ2VFdmVudCxcbiAgRm9yZ2VFcnJvckV2ZW50LFxuICBTY3JlZW5zaG90RXZlbnQsXG4gIEZvcmdlQW55RXZlbnQsXG4gIEV2ZW50TGlzdGVuZXIsXG59IGZyb20gXCIuL2V2ZW50cy5qc1wiO1xuaW1wb3J0IHsgcmVkYWN0RGVlcCwgcmVkYWN0VGV4dCB9IGZyb20gXCIuL3NlY3VyaXR5LmpzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2Vzc2lvbkxvZ2dlck9wdGlvbnMge1xuICAvKiogXHU0RjFBXHU4QkREIGlkXHVGRjA4XHU3RjNBXHU3NzAxXHU4MUVBXHU1MkE4XHU3NTFGXHU2MjEwXHVGRjA5ICovXG4gIHNlc3Npb25JZD86IHN0cmluZztcbiAgLyoqIFx1NEU4Qlx1NEVGNlx1NkQ0MVx1NjcwMFx1NTkyN1x1NEZERFx1NzU1OVx1Njc2MVx1NjU3MFx1RkYwOFx1OTYzMlx1NTE4NVx1NUI1OFx1NjVFMFx1OTY1MFx1NTg5RVx1OTU3Rlx1RkYwQ1x1N0YzQVx1NzcwMSAyMDAwXHVGRjA5ICovXG4gIG1heEV2ZW50cz86IG51bWJlcjtcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NTQyRlx1NzUyOFx1NjVFNVx1NUZEN1x1RkYwOGRlYnVnIFx1N0VBN1x1NTIyQlx1NEVDRFx1OEJCMFx1NUY1NVx1RkYwQ1x1NTNFQVx1NjYyRlx1N0VBN1x1NTIyQlx1NUI1N1x1NkJCNVx1NEUzQSBkZWJ1Z1x1RkYwOSAqL1xuICBlbmFibGVkPzogYm9vbGVhbjtcbn1cblxuLyoqIFx1NjVFNVx1NUZEN1x1NTE2NVx1NTNFM1x1NTNDMlx1NjU3MFx1RkYwOG1lc3NhZ2UgKyBcdTUzRUZcdTkwMDkgcGF5bG9hZFx1RkYwOSAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dFbnRyeSB7XG4gIGxldmVsPzogRXZlbnRMZXZlbDtcbiAgY2F0ZWdvcnk/OiBFdmVudENhdGVnb3J5O1xuICBtZXNzYWdlOiBzdHJpbmc7XG4gIHBheWxvYWQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuZXhwb3J0IGNsYXNzIFNlc3Npb25Mb2dnZXIge1xuICByZWFkb25seSBzZXNzaW9uSWQ6IHN0cmluZztcbiAgcHJpdmF0ZSBldmVudHM6IEZvcmdlQW55RXZlbnRbXSA9IFtdO1xuICBwcml2YXRlIGxpc3RlbmVycyA9IG5ldyBTZXQ8RXZlbnRMaXN0ZW5lcj4oKTtcbiAgcHJpdmF0ZSBzZXEgPSAwO1xuICBwcml2YXRlIG1heEV2ZW50czogbnVtYmVyO1xuICBwcml2YXRlIGVuYWJsZWQ6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3Iob3B0czogU2Vzc2lvbkxvZ2dlck9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuc2Vzc2lvbklkID0gb3B0cy5zZXNzaW9uSWQgPz8gYHNlc3NfJHtEYXRlLm5vdygpLnRvU3RyaW5nKDM2KX0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsIDgpfWA7XG4gICAgdGhpcy5tYXhFdmVudHMgPSBvcHRzLm1heEV2ZW50cyA/PyAyMDAwO1xuICAgIHRoaXMuZW5hYmxlZCA9IG9wdHMuZW5hYmxlZCA/PyB0cnVlO1xuICB9XG5cbiAgLyoqIFx1OEJBMlx1OTYwNVx1NUI5RVx1NjVGNlx1NEU4Qlx1NEVGNlx1RkYwQ1x1OEZENFx1NTZERVx1NTNENlx1NkQ4OFx1OEJBMlx1OTYwNVx1NTFGRFx1NjU3MCAqL1xuICBzdWJzY3JpYmUobGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIpOiAoKSA9PiB2b2lkIHtcbiAgICB0aGlzLmxpc3RlbmVycy5hZGQobGlzdGVuZXIpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLmxpc3RlbmVycy5kZWxldGUobGlzdGVuZXIpO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1NEUwMFx1Njc2MVx1OTAxQVx1NzUyOFx1NjVFNVx1NUZEN1x1NEU4Qlx1NEVGNiAqL1xuICBsb2coZW50cnk6IExvZ0VudHJ5KTogRm9yZ2VFdmVudCB7XG4gICAgY29uc3QgZXZlbnQ6IEZvcmdlRXZlbnQgPSB7XG4gICAgICBzZXE6IHRoaXMubmV4dFNlcSgpLFxuICAgICAgdHM6IERhdGUubm93KCksXG4gICAgICBsZXZlbDogZW50cnkubGV2ZWwgPz8gXCJpbmZvXCIsXG4gICAgICBjYXRlZ29yeTogZW50cnkuY2F0ZWdvcnkgPz8gXCJsb2dcIixcbiAgICAgIG1lc3NhZ2U6IGVudHJ5Lm1lc3NhZ2UsXG4gICAgICBwYXlsb2FkOiBlbnRyeS5wYXlsb2FkLFxuICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLmVtaXQoZXZlbnQpO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1NEUwMFx1Njc2MVx1NjgwN1x1NTFDNlx1OTUxOVx1OEJFRlx1NEU4Qlx1NEVGNlx1RkYwOFx1NUUyNlx1NjJBNVx1OTUxOVx1NTM5Rlx1NTZFMFx1NEUwRVx1ODlFM1x1OTFDQVx1RkYwQ1x1NEVBNFx1N0VEOVx1NTkxNlx1OTBFOCBBSVx1RkYwOSAqL1xuICBlcnJvcihlcnI6IE9taXQ8Rm9yZ2VFcnJvckV2ZW50W1wiZXJyb3JcIl0sIG5ldmVyPiAmIHtcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG4gICAgbGV2ZWw/OiBFdmVudExldmVsO1xuICAgIHBheWxvYWQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgfSk6IEZvcmdlRXJyb3JFdmVudCB7XG4gICAgY29uc3QgeyBtZXNzYWdlLCBsZXZlbCwgcGF5bG9hZCwgLi4uZXJyb3IgfSA9IGVycjtcbiAgICBjb25zdCBldmVudDogRm9yZ2VFcnJvckV2ZW50ID0ge1xuICAgICAgc2VxOiB0aGlzLm5leHRTZXEoKSxcbiAgICAgIHRzOiBEYXRlLm5vdygpLFxuICAgICAgbGV2ZWw6IGxldmVsID8/IFwiZXJyb3JcIixcbiAgICAgIGNhdGVnb3J5OiBcImVycm9yXCIsXG4gICAgICBtZXNzYWdlLFxuICAgICAgZXJyb3IsXG4gICAgICBwYXlsb2FkLFxuICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLmVtaXQoZXZlbnQpO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1NEUwMFx1Njc2MVx1NjIyQVx1NTZGRS9cdTU2RkVcdTcyNDdcdTRFOEJcdTRFRjYgKi9cbiAgc2NyZWVuc2hvdChpbWc6IHtcbiAgICBkYXRhVXJpOiBzdHJpbmc7XG4gICAgZnVsbFBhZ2U/OiBib29sZWFuO1xuICAgIGNhcHRpb24/OiBzdHJpbmc7XG4gIH0pOiBTY3JlZW5zaG90RXZlbnQge1xuICAgIGNvbnN0IGJ5dGVMZW5ndGggPSBpbWcuZGF0YVVyaS5yZXBsYWNlKC9eZGF0YTppbWFnZVxcL3BuZztiYXNlNjQsLywgXCJcIikubGVuZ3RoO1xuICAgIGNvbnN0IGV2ZW50OiBTY3JlZW5zaG90RXZlbnQgPSB7XG4gICAgICBzZXE6IHRoaXMubmV4dFNlcSgpLFxuICAgICAgdHM6IERhdGUubm93KCksXG4gICAgICBsZXZlbDogXCJpbmZvXCIsXG4gICAgICBjYXRlZ29yeTogXCJzY3JlZW5zaG90XCIsXG4gICAgICBtZXNzYWdlOiBpbWcuY2FwdGlvbiA/PyBgXHU2MjJBXHU1NkZFXHU1REYyXHU5MUM3XHU5NkM2ICgkeyhieXRlTGVuZ3RoICogMC43NSkgLyAxMDI0fUtCKWAsXG4gICAgICBpbWFnZToge1xuICAgICAgICBkYXRhVXJpOiBpbWcuZGF0YVVyaSxcbiAgICAgICAgYnl0ZUxlbmd0aCxcbiAgICAgICAgZnVsbFBhZ2U6IGltZy5mdWxsUGFnZSA/PyBmYWxzZSxcbiAgICAgICAgY2FwdGlvbjogaW1nLmNhcHRpb24sXG4gICAgICB9LFxuICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLmVtaXQoZXZlbnQpO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1N0NGQlx1N0VERlx1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1NEU4Qlx1NEVGNiAqL1xuICBzeXN0ZW0obWVzc2FnZTogc3RyaW5nLCBwYXlsb2FkPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBGb3JnZUV2ZW50IHtcbiAgICByZXR1cm4gdGhpcy5sb2coeyBsZXZlbDogXCJpbmZvXCIsIGNhdGVnb3J5OiBcInN5c3RlbVwiLCBtZXNzYWdlLCBwYXlsb2FkIH0pO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1NEUwMFx1NkIyMVx1NTJBOFx1NEY1Q1x1NjI2N1x1ODg0Q1x1NEU4Qlx1NEVGNiAqL1xuICBhY3Rpb24obWVzc2FnZTogc3RyaW5nLCBwYXlsb2FkPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBGb3JnZUV2ZW50IHtcbiAgICByZXR1cm4gdGhpcy5sb2coeyBsZXZlbDogXCJpbmZvXCIsIGNhdGVnb3J5OiBcImFjdGlvblwiLCBtZXNzYWdlLCBwYXlsb2FkIH0pO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1NEUwMFx1NkIyMVx1OEJDQVx1NjVBRFx1NEU4Qlx1NEVGNiAqL1xuICBkaWFnbm9zZShtZXNzYWdlOiBzdHJpbmcsIHBheWxvYWQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IEZvcmdlRXZlbnQge1xuICAgIHJldHVybiB0aGlzLmxvZyh7IGxldmVsOiBcImluZm9cIiwgY2F0ZWdvcnk6IFwiZGlhZ25vc2VcIiwgbWVzc2FnZSwgcGF5bG9hZCB9KTtcbiAgfVxuXG4gIC8qKiBcdTgzQjdcdTUzRDZcdTUxNjhcdTkwRThcdTUzODZcdTUzRjJcdTRFOEJcdTRFRjZcdUZGMDhcdTVGRUJcdTcxNjdcdUZGMDkgKi9cbiAgdG9BcnJheSgpOiBGb3JnZUFueUV2ZW50W10ge1xuICAgIHJldHVybiB0aGlzLmV2ZW50cy5zbGljZSgpO1xuICB9XG5cbiAgLyoqIFx1NjMwOVx1N0M3Qlx1NTIyQlx1OEZDN1x1NkVFNFx1NEU4Qlx1NEVGNiAqL1xuICBmaWx0ZXIoY2F0ZWdvcnk6IEV2ZW50Q2F0ZWdvcnkgfCBFdmVudENhdGVnb3J5W10pOiBGb3JnZUFueUV2ZW50W10ge1xuICAgIGNvbnN0IGNhdHMgPSBBcnJheS5pc0FycmF5KGNhdGVnb3J5KSA/IGNhdGVnb3J5IDogW2NhdGVnb3J5XTtcbiAgICByZXR1cm4gdGhpcy5ldmVudHMuZmlsdGVyKChlKSA9PiBjYXRzLmluY2x1ZGVzKGUuY2F0ZWdvcnkpKTtcbiAgfVxuXG4gIC8qKiBcdTZFMDVcdTdBN0FcdTRFOEJcdTRFRjZcdTZENDEgKi9cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgdGhpcy5ldmVudHMgPSBbXTtcbiAgICB0aGlzLnNlcSA9IDA7XG4gIH1cblxuICAvKiogXHU1QkZDXHU1MUZBXHU0RTNBIG1hcmtkb3duXHVGRjA4XHU0RjlCXHU1OTE2XHU5MEU4IEFJIC8gUFIgXHU4QkM0XHU4QkJBIC8gXHU1MjM2XHU1NEMxXHU2RDg4XHU4RDM5XHVGRjA5XHVGRjBDXHU1QkY5XHU2RDg4XHU2MDZGXHU0RTBFIHBheWxvYWQgXHU4MTMxXHU2NTRGXHU5NjMyXHU0RUU0XHU3MjRDXHU2Q0M0XHU5NzMyICovXG4gIGV4cG9ydE1hcmtkb3duKG9wdHM6IHsgdGl0bGU/OiBzdHJpbmc7IGluY2x1ZGVTY3JlZW5zaG90cz86IGJvb2xlYW4gfSA9IHt9KTogc3RyaW5nIHtcbiAgICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcbiAgICBsaW5lcy5wdXNoKGAjICR7b3B0cy50aXRsZSA/PyBcIkZvcmdlIFx1NEYxQVx1OEJERFx1NEU4Qlx1NEVGNlx1NjVFNVx1NUZEN1wifWApO1xuICAgIGxpbmVzLnB1c2goYCoqU2Vzc2lvbioqOiAke3RoaXMuc2Vzc2lvbklkfSB8ICoqXHU0RThCXHU0RUY2XHU2NTcwKio6ICR7dGhpcy5ldmVudHMubGVuZ3RofWApO1xuICAgIGxpbmVzLnB1c2goXCJcIik7XG4gICAgZm9yIChjb25zdCBlIG9mIHRoaXMuZXZlbnRzKSB7XG4gICAgICBjb25zdCB0ID0gbmV3IERhdGUoZS50cykudG9JU09TdHJpbmcoKS5yZXBsYWNlKFwiVFwiLCBcIiBcIikuc2xpY2UoMCwgMTkpO1xuICAgICAgY29uc3QgdGFnID0gYFske2UubGV2ZWwudG9VcHBlckNhc2UoKX0vJHtlLmNhdGVnb3J5fV1gO1xuICAgICAgY29uc3QgbXNnID0gcmVkYWN0VGV4dChlLm1lc3NhZ2UpO1xuICAgICAgaWYgKGUuY2F0ZWdvcnkgPT09IFwiZXJyb3JcIikge1xuICAgICAgICBjb25zdCBlcnIgPSAoZSBhcyBGb3JnZUVycm9yRXZlbnQpLmVycm9yO1xuICAgICAgICBsaW5lcy5wdXNoKGAtIFxcYCR7dH1cXGAgKioke3RhZ30qKiAke21zZ31gKTtcbiAgICAgICAgbGluZXMucHVzaChgICAtIFx1OTUxOVx1OEJFRlx1NzgwMTogXFxgJHtlcnIuY29kZX1cXGAgfCBcdTY4MzlcdTU2RTA6ICR7ZXJyLnJlYXNvbn1gKTtcbiAgICAgICAgaWYgKGVyci5leHBsYW5hdGlvbikgbGluZXMucHVzaChgICAtIFx1NTM5Rlx1NTZFMDogJHtyZWRhY3RUZXh0KGVyci5leHBsYW5hdGlvbil9YCk7XG4gICAgICAgIGlmIChlcnIuc3VnZ2VzdGlvbikgbGluZXMucHVzaChgICAtIFx1NUVGQVx1OEJBRTogJHtyZWRhY3RUZXh0KGVyci5zdWdnZXN0aW9uKX1gKTtcbiAgICAgIH0gZWxzZSBpZiAoZS5jYXRlZ29yeSA9PT0gXCJzY3JlZW5zaG90XCIpIHtcbiAgICAgICAgY29uc3QgaW1nID0gKGUgYXMgU2NyZWVuc2hvdEV2ZW50KS5pbWFnZTtcbiAgICAgICAgbGluZXMucHVzaChgLSBcXGAke3R9XFxgICoqJHt0YWd9KiogJHttc2d9YCk7XG4gICAgICAgIGlmIChvcHRzLmluY2x1ZGVTY3JlZW5zaG90cykge1xuICAgICAgICAgIGxpbmVzLnB1c2goYCAgLSAhW1x1NjIyQVx1NTZGRV0oLi9mb3JnZS1ldmVudC0ke2Uuc2VxfS5wbmcpYCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpbmVzLnB1c2goYC0gXFxgJHt0fVxcYCAqKiR7dGFnfSoqICR7bXNnfWApO1xuICAgICAgfVxuICAgICAgaWYgKGUucGF5bG9hZCAmJiBPYmplY3Qua2V5cyhlLnBheWxvYWQpLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBwID0gSlNPTi5zdHJpbmdpZnkocmVkYWN0RGVlcChlLnBheWxvYWQpKTtcbiAgICAgICAgaWYgKHAubGVuZ3RoIDw9IDQwMCkgbGluZXMucHVzaChgICAtIHBheWxvYWQ6IFxcYCR7cH1cXGBgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICAvKiogXHU3NTFGXHU2MjEwXHU3RUFGXHU2NTg3XHU2NzJDXHU2MjY3XHU4ODRDXHU4RjY4XHU4RkY5XHVGRjA4XHU0RjlCXHU2NUU1XHU1RkQ3L1x1N0VDOFx1N0FFRlx1RkYwOSAqL1xuICB0b1RpbWVsaW5lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZXZlbnRzXG4gICAgICAubWFwKChlKSA9PiB7XG4gICAgICAgIGNvbnN0IHQgPSBuZXcgRGF0ZShlLnRzKS50b0lTT1N0cmluZygpLnJlcGxhY2UoXCJUXCIsIFwiIFwiKS5zbGljZSgxMSwgMTkpO1xuICAgICAgICByZXR1cm4gYCR7dH0gWyR7ZS5sZXZlbH1dICR7ZS5jYXRlZ29yeX06ICR7ZS5tZXNzYWdlfWA7XG4gICAgICB9KVxuICAgICAgLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBwcml2YXRlIG5leHRTZXEoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gKyt0aGlzLnNlcTtcbiAgfVxuXG4gIHByaXZhdGUgZW1pdDxUIGV4dGVuZHMgRm9yZ2VBbnlFdmVudD4oZXZlbnQ6IFQpOiBUIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCkgcmV0dXJuIGV2ZW50O1xuICAgIHRoaXMuZXZlbnRzLnB1c2goZXZlbnQpO1xuICAgIGlmICh0aGlzLmV2ZW50cy5sZW5ndGggPiB0aGlzLm1heEV2ZW50cykge1xuICAgICAgdGhpcy5ldmVudHMgPSB0aGlzLmV2ZW50cy5zbGljZSh0aGlzLmV2ZW50cy5sZW5ndGggLSB0aGlzLm1heEV2ZW50cyk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxpc3RlbmVycykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbChldmVudCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gXHU1MzU1XHU0RTJBXHU3NkQxXHU1NDJDXHU1NjY4XHU1RjAyXHU1RTM4XHU0RTBEXHU1RjcxXHU1NENEXHU0RThCXHU0RUY2XHU2RDQxXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBldmVudDtcbiAgfVxufVxuIiwgIi8qKlxuICogRm9yZ2VNQ1AgXHUyMDE0XHUyMDE0IE1DUCBcdTY3MERcdTUyQTFcdTU5MDRcdTc0MDZcdTU2NjhcdUZGMDhcdTUzNEZcdThCQUVcdTY1RTBcdTUxNzNcdUZGMDlcbiAqXG4gKiBcdTUxODVcdTkwRThcdTVCOUVcdTczQjBcdTVERTVcdTUxNzdcdTUyMDZcdTUzRDFcdTkwM0JcdThGOTFcdTMwMDJcdTRFMEFcdTVDNDJcdTUzRUZcdTc1MjhcdTRFMERcdTU0MENcdTc2ODRcdTRGMjBcdThGOTNcdTVDNDJcdUZGMDhzdGRpby9IVFRQL1NTRVx1RkYwOVx1NTMwNVx1ODhDNVx1RkYwQ1xuICogXHU0RjdGXHU1MTc2XHU1M0VGXHU2M0E1XHU1MTY1IGRlZXBzZWVrIGhhcm5lc3NcdTMwMDFjbmIuY29vbFx1MzAwMUNsYXVkZSBEZXNrdG9wIFx1N0I0OVx1NEVGQlx1NjEwRiBNQ1AgXHU1QkEyXHU2MjM3XHU3QUVGXHUzMDAyXG4gKi9cbmltcG9ydCB7IEZvcmdlQnJvd3NlciB9IGZyb20gXCJAb3BlbmxpdWxhbi9jb3JlXCI7XG5pbXBvcnQgeyBQbGF5d3JpZ2h0RW5naW5lIH0gZnJvbSBcIkBvcGVubGl1bGFuL2VuZ2luZXNcIjtcbmltcG9ydCB7IERpYWdub3Npc0NlbnRlciB9IGZyb20gXCJAb3BlbmxpdWxhbi9kaWFnbm9zaXNcIjtcbmltcG9ydCB7IGNvbXBhY3RTbmFwc2hvdCB9IGZyb20gXCJAb3BlbmxpdWxhbi90b2tlblwiO1xuaW1wb3J0IHR5cGUgeyBTdGVhbHRoT3B0aW9ucyB9IGZyb20gXCJAb3BlbmxpdWxhbi9zdGVhbHRoXCI7XG5pbXBvcnQgeyBUT09MUywgb2tSZXN1bHQsIGVyclJlc3VsdCwgdHlwZSBUb29sUmVzdWx0LCB0eXBlIE1jcFRvb2xTY2hlbWEgfSBmcm9tIFwiLi90b29scy5qc1wiO1xuaW1wb3J0IHsgU2Vzc2lvbkxvZ2dlciB9IGZyb20gXCIuL2xvZ2dlci5qc1wiO1xuaW1wb3J0IHsgYnVpbGRBSU1lc3NhZ2UsIG1lc3NhZ2VUb0NvbnRlbnQsIHR5cGUgQUlNZXNzYWdlIH0gZnJvbSBcIi4vbWVzc2FnZS5qc1wiO1xuaW1wb3J0IHR5cGUgeyBGb3JnZUFueUV2ZW50IH0gZnJvbSBcIi4vZXZlbnRzLmpzXCI7XG5pbXBvcnQgeyBndWFyZEpzU2NyaXB0LCByZWRhY3RVcmwsIHJlZGFjdERlZXAgfSBmcm9tIFwiLi9zZWN1cml0eS5qc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZvcmdlTWNwT3B0aW9ucyB7XG4gIC8qKiBcdTY1RTBcdTU5MzRcdTZBMjFcdTVGMEYgKi9cbiAgaGVhZGxlc3M/OiBib29sZWFuO1xuICAvKiogQ0RQIFx1OEZERVx1NjNBNVx1NTczMFx1NTc0MCAqL1xuICBjb25uZWN0VXJsPzogc3RyaW5nO1xuICAvKiogXHU0RjFBXHU4QkREXHU2NUU1XHU1RkQ3XHU1NjY4XHVGRjA4XHU3RjNBXHU3NzAxXHU4MUVBXHU1MkE4XHU1MjFCXHU1RUZBXHVGRjA5ICovXG4gIGxvZ2dlcj86IFNlc3Npb25Mb2dnZXI7XG4gIC8qKiBcdTRFOEJcdTRFRjZcdTZENDFcdTY3MDBcdTU5MjdcdTRGRERcdTc1NTlcdTY3NjFcdTY1NzAgKi9cbiAgbWF4RXZlbnRzPzogbnVtYmVyO1xuICAvKiogXHU5NjMyXHU2OEMwXHU2RDRCXHU5MTREXHU3RjZFXHVGRjA4XHU1M0VGXHU5MDA5XHVGRjBDXHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHVGRjA5ICovXG4gIHN0ZWFsdGg/OiBTdGVhbHRoT3B0aW9ucztcbn1cblxuZXhwb3J0IGNsYXNzIEZvcmdlTWNwIHtcbiAgcmVhZG9ubHkgdG9vbHM6IE1jcFRvb2xTY2hlbWFbXSA9IFRPT0xTO1xuICAvKiogXHU0RjFBXHU4QkREXHU0RThCXHU0RUY2XHU2NUU1XHU1RkQ3XHU1NjY4IFx1MjAxNFx1MjAxNCBcdTRGOUJcdTU5MTZcdTkwRTggQUkgLyBJREUgXHU4QkEyXHU5NjA1XHU1NDhDXHU2MkM5XHU1M0Q2XHU0RThCXHU0RUY2XHU2RDQxICovXG4gIHJlYWRvbmx5IGxvZ2dlcjogU2Vzc2lvbkxvZ2dlcjtcbiAgcHJpdmF0ZSBicm93c2VyPzogRm9yZ2VCcm93c2VyO1xuICBwcml2YXRlIGRpYWdub3Npcz86IERpYWdub3Npc0NlbnRlcjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG9wdHM6IEZvcmdlTWNwT3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIgPSBvcHRzLmxvZ2dlciA/PyBuZXcgU2Vzc2lvbkxvZ2dlcih7IG1heEV2ZW50czogb3B0cy5tYXhFdmVudHMgfSk7XG4gIH1cblxuICAvKiogXHU3NTFGXHU1NDdEXHU1NDY4XHU2NzFGXHVGRjFBXHU3ODZFXHU0RkREXHU2RDRGXHU4OUM4XHU1NjY4XHU1REYyXHU1QzMxXHU3RUVBICovXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlQnJvd3NlcigpOiBQcm9taXNlPEZvcmdlQnJvd3Nlcj4ge1xuICAgIGlmICghdGhpcy5icm93c2VyKSB7XG4gICAgICBjb25zdCBlbmdpbmUgPSBuZXcgUGxheXdyaWdodEVuZ2luZSh7XG4gICAgICAgIGhlYWRsZXNzOiB0aGlzLm9wdHMuaGVhZGxlc3MgPz8gdHJ1ZSxcbiAgICAgICAgY29ubmVjdFVybDogdGhpcy5vcHRzLmNvbm5lY3RVcmwsXG4gICAgICAgIHN0ZWFsdGg6IHRoaXMub3B0cy5zdGVhbHRoLFxuICAgICAgfSk7XG4gICAgICB0aGlzLmJyb3dzZXIgPSBuZXcgRm9yZ2VCcm93c2VyKGVuZ2luZSk7XG4gICAgICBhd2FpdCB0aGlzLmJyb3dzZXIuc3RhcnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYnJvd3NlcjtcbiAgfVxuXG4gIC8qKiBcdTY4MzhcdTVGQzNcdUZGMUFcdTUyMDZcdTUzRDFcdTVERTVcdTUxNzdcdThDMDNcdTc1MjggKi9cbiAgYXN5bmMgY2FsbFRvb2wobmFtZTogc3RyaW5nLCBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFByb21pc2U8VG9vbFJlc3VsdD4ge1xuICAgIGNvbnN0IHQwID0gRGF0ZS5ub3coKTtcbiAgICB0cnkge1xuICAgICAgLy8gXHU4QkIwXHU1RjU1XHU1REU1XHU1MTc3XHU4QzAzXHU3NTI4XHU1RjAwXHU1OUNCXHVGRjA4c3lzdGVtIFx1NEU4Qlx1NEVGNlx1RkYwQ1x1NEY5Qlx1NTkxNlx1OTBFOCBBSSBcdThGRkRcdThFMkFcdUZGMDlcbiAgICAgIHRoaXMubG9nZ2VyLmxvZyh7IGxldmVsOiBcImRlYnVnXCIsIGNhdGVnb3J5OiBcInN5c3RlbVwiLCBtZXNzYWdlOiBgXHU4QzAzXHU3NTI4XHU1REU1XHU1MTc3ICR7bmFtZX1gLCBwYXlsb2FkOiB7IGFyZ3M6IHRoaXMuc2FmZUFyZ3MoYXJncykgfSB9KTtcblxuICAgICAgbGV0IHJlc3VsdDogVG9vbFJlc3VsdDtcbiAgICAgIHN3aXRjaCAobmFtZSkge1xuICAgICAgICBjYXNlIFwib2JzZXJ2ZVwiOiB7XG4gICAgICAgICAgY29uc3QgYiA9IGF3YWl0IHRoaXMuZW5zdXJlQnJvd3NlcigpO1xuICAgICAgICAgIGNvbnN0IHNuYXAgPSBhd2FpdCBiLm9ic2VydmUoeyBtYXhOb2RlczogKGFyZ3MubWF4Tm9kZXMgYXMgbnVtYmVyKSA/PyAyMDAsIG1heFRleHRMZW5ndGg6IChhcmdzLm1heFRleHRMZW5ndGggYXMgbnVtYmVyKSA/PyA4MCB9KTtcbiAgICAgICAgICByZXN1bHQgPSBva1Jlc3VsdChjb21wYWN0U25hcHNob3Qoc25hcCksIHsgdXJsOiBzbmFwLnVybCwgdGl0bGU6IHNuYXAudGl0bGUsIHN0YXRzOiBzbmFwLnN0YXRzIH0pO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmxvZyh7IGNhdGVnb3J5OiBcImFjdGlvblwiLCBtZXNzYWdlOiBgb2JzZXJ2ZSAke3NuYXAudXJsfSAoJHtzbmFwLnN0YXRzPy5lbWl0dGVkTm9kZXMgPz8gMH0gXHU1M0VGXHU0RUE0XHU0RTkyXHU4MjgyXHU3MEI5KWAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjYXNlIFwiYWN0XCI6IHtcbiAgICAgICAgICBjb25zdCBiID0gYXdhaXQgdGhpcy5lbnN1cmVCcm93c2VyKCk7XG4gICAgICAgICAgY29uc3QgYWN0aW9uID0gdGhpcy5ub3JtYWxpemVBY3Rpb24oYXJncyk7XG4gICAgICAgICAgY29uc3QgYWN0UmVzdWx0ID0gYXdhaXQgYi5hY3QoYWN0aW9uIGFzIGFueSk7XG4gICAgICAgICAgY29uc3QgbGluZXMgPSBbYFx1NTJBOFx1NEY1QzogJHthY3RSZXN1bHQudHlwZX1gXTtcbiAgICAgICAgICBpZiAoYWN0UmVzdWx0Lm9rKSB7XG4gICAgICAgICAgICBsaW5lcy5wdXNoKGBcdTI3MTMgJHthY3RSZXN1bHQuc3VtbWFyeX1gKTtcbiAgICAgICAgICAgIGlmIChhY3RSZXN1bHQuZGlhZ25vc3RpY3M/Lmxlbmd0aCkge1xuICAgICAgICAgICAgICBsaW5lcy5wdXNoKGBcdTI2QTAgXHU1MkE4XHU0RjVDXHU1NDBFXHU2OEMwXHU2RDRCXHU1MjMwICR7YWN0UmVzdWx0LmRpYWdub3N0aWNzLmxlbmd0aH0gXHU2NzYxXHU5ODc1XHU5NzYyXHU1RjAyXHU1RTM4OmApO1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGQgb2YgYWN0UmVzdWx0LmRpYWdub3N0aWNzLnNsaWNlKDAsIDUpKSBsaW5lcy5wdXNoKGAgIC0gWyR7ZC5raW5kfV0gJHtkLm1lc3NhZ2V9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxpbmVzLnB1c2goYFx1MjcxNyAke2FjdFJlc3VsdC5zdW1tYXJ5fWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsaW5lcy5wdXNoKGBcdTgwMTdcdTY1RjYgJHthY3RSZXN1bHQuZHVyYXRpb25Nc31tc2ApO1xuICAgICAgICAgIHJlc3VsdCA9IGFjdFJlc3VsdC5vayA/IG9rUmVzdWx0KGxpbmVzLmpvaW4oXCJcXG5cIiksIHsgZGF0YTogYWN0UmVzdWx0LmRhdGEgfSkgOiBlcnJSZXN1bHQobGluZXMuam9pbihcIlxcblwiKSk7XG5cbiAgICAgICAgICAvLyBcdTUyQThcdTRGNUNcdTRFOEJcdTRFRjZcdUZGMUFcdTYyMTBcdTUyOUYvXHU1OTMxXHU4RDI1XHU5MEZEXHU2Qzg5XHU2REMwXHU0RTNBXHU3RUQzXHU2Nzg0XHU1MzE2XHU0RThCXHU0RUY2XHVGRjA4XHU0RjlCXHU1OTE2XHU5MEU4IEFJIFx1OEZGRFx1OEUyQVx1NjI2N1x1ODg0Q1x1OEY2OFx1OEZGOVx1RkYwOVxuICAgICAgICAgIGlmIChhY3RSZXN1bHQub2spIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmFjdGlvbihgXHU1MkE4XHU0RjVDICR7YWN0UmVzdWx0LnR5cGV9IFx1NjIxMFx1NTI5RjogJHthY3RSZXN1bHQuc3VtbWFyeX1gLCB7IHR5cGU6IGFjdFJlc3VsdC50eXBlLCBkdXJhdGlvbk1zOiBhY3RSZXN1bHQuZHVyYXRpb25NcyB9KTtcbiAgICAgICAgICAgIGlmIChhY3RSZXN1bHQuZGlhZ25vc3RpY3M/Lmxlbmd0aCkge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5kaWFnbm9zZShgXHU1MkE4XHU0RjVDXHU1NDBFXHU2OEMwXHU2RDRCXHU1MjMwICR7YWN0UmVzdWx0LmRpYWdub3N0aWNzLmxlbmd0aH0gXHU2NzYxXHU5ODc1XHU5NzYyXHU1RjAyXHU1RTM4YCwge1xuICAgICAgICAgICAgICAgIGl0ZW1zOiBhY3RSZXN1bHQuZGlhZ25vc3RpY3Muc2xpY2UoMCwgNSkubWFwKChkKSA9PiAoeyBraW5kOiBkLmtpbmQsIG1lc3NhZ2U6IGQubWVzc2FnZSB9KSksXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBcdTY4MDdcdTUxQzZcdTk1MTlcdThCRUZcdTRFOEJcdTRFRjZcdUZGMUFcdTVFMjZcdTYyQTVcdTk1MTlcdTUzOUZcdTU2RTBcdTRFMEVcdTg5RTNcdTkxQ0FcdUZGMENcdTRFQTRcdTdFRDlcdTU5MTZcdTkwRTggQUlcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogYFx1NTJBOFx1NEY1QyAke2FjdFJlc3VsdC50eXBlfSBcdTU5MzFcdThEMjU6ICR7YWN0UmVzdWx0LnN1bW1hcnl9YCxcbiAgICAgICAgICAgICAgY29kZTogdGhpcy5tYXBFcnJvckNvZGUoYWN0UmVzdWx0LnR5cGUpLFxuICAgICAgICAgICAgICByZWFzb246IHRoaXMubWFwRXJyb3JSZWFzb24oYWN0UmVzdWx0LnN1bW1hcnksIGFjdFJlc3VsdC5kaWFnbm9zdGljcyksXG4gICAgICAgICAgICAgIHJhdzogYWN0UmVzdWx0LnN1bW1hcnksXG4gICAgICAgICAgICAgIGV4cGxhbmF0aW9uOiB0aGlzLmJ1aWxkRXhwbGFuYXRpb24oYWN0UmVzdWx0LnN1bW1hcnksIGFjdFJlc3VsdC5kaWFnbm9zdGljcyksXG4gICAgICAgICAgICAgIHN1Z2dlc3Rpb246IHRoaXMuYnVpbGRTdWdnZXN0aW9uKGFjdFJlc3VsdC5zdW1tYXJ5KSxcbiAgICAgICAgICAgICAgZGV0YWlsOiBhY3RSZXN1bHQuZXJyb3IsXG4gICAgICAgICAgICAgIGZpbmRpbmdzOiAoYWN0UmVzdWx0LmRpYWdub3N0aWNzID8/IFtdKS5zbGljZSgwLCA1KS5tYXAoKGQpID0+ICh7XG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGQua2luZCxcbiAgICAgICAgICAgICAgICBzZXZlcml0eTogZC5zZXZlcml0eSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBkLm1lc3NhZ2UsXG4gICAgICAgICAgICAgIH0pKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGNhc2UgXCJkaWFnbm9zZVwiOiB7XG4gICAgICAgICAgY29uc3QgYiA9IGF3YWl0IHRoaXMuZW5zdXJlQnJvd3NlcigpO1xuICAgICAgICAgIGNvbnN0IHJlcG9ydCA9IGF3YWl0IGIuY2FwdHVyZURpYWdub3N0aWNzKCk7XG4gICAgICAgICAgLy8gXHU3NTI4IGRpYWdub3NpcyBcdTRFMkRcdTVGQzNcdTc1MUZcdTYyMTBcdTY0NThcdTg5ODFcdUZGMDhjb3JlIFx1NEUwRSBkaWFnbm9zaXMgXHU3Njg0XHU2MkE1XHU1NDRBXHU3QzdCXHU1NzhCXHU1REYyXHU1QkY5XHU5RjUwXHVGRjBDXHU2NUUwXHU5NzAwXHU1RjNBXHU4RjZDXHVGRjA5XG4gICAgICAgICAgY29uc3QgeyBzdW1tYXJpemUgfSA9IGF3YWl0IGltcG9ydChcIkBvcGVubGl1bGFuL2RpYWdub3Npc1wiKTtcbiAgICAgICAgICBjb25zdCBzdW1tYXJ5ID0gc3VtbWFyaXplKHJlcG9ydCk7XG4gICAgICAgICAgY29uc3QgbGluZXMgPSBbYCMgXHU4QkNBXHU2NUFEXHU3RUQzXHU2NzlDICgke3N1bW1hcnkuaGVhbHRoeSA/IFwiXHU1MDY1XHU1RUI3XCIgOiBcIlx1NUI1OFx1NTcyOFx1OTVFRVx1OTg5OFwifSlgXTtcbiAgICAgICAgICBpZiAoc3VtbWFyeS5pc3N1ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBsaW5lcy5wdXNoKFwiXHU2NzJBXHU1M0QxXHU3M0IwXHU5NTE5XHU4QkVGXHVGRjBDXHU5ODc1XHU5NzYyXHU4RkQwXHU4ODRDXHU2QjYzXHU1RTM4XHUzMDAyXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmb3IgKGNvbnN0IGlzc3VlIG9mIHN1bW1hcnkuaXNzdWVzKSB7XG4gICAgICAgICAgICBsaW5lcy5wdXNoKGAtIFske2lzc3VlLmNhdGVnb3J5fS8ke2lzc3VlLnNldmVyaXR5fV0gJHtpc3N1ZS5tZXNzYWdlfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc3VtbWFyeS5zdWdnZXN0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxpbmVzLnB1c2goYFxcbiMjIFx1NUVGQVx1OEJBRWApO1xuICAgICAgICAgICAgc3VtbWFyeS5zdWdnZXN0aW9ucy5mb3JFYWNoKChzLCBpKSA9PiBsaW5lcy5wdXNoKGAke2kgKyAxfS4gJHtzfWApKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0ID0gb2tSZXN1bHQobGluZXMuam9pbihcIlxcblwiKSwge1xuICAgICAgICAgICAgaXNzdWVzOiBzdW1tYXJ5Lmlzc3VlcyxcbiAgICAgICAgICAgIGNvbnNvbGU6IHJlcG9ydC5jb25zb2xlLmxlbmd0aCxcbiAgICAgICAgICAgIG5ldHdvcms6IHJlcG9ydC5uZXR3b3JrLmxlbmd0aCxcbiAgICAgICAgICAgIGRvbTogcmVwb3J0LmRvbS5sZW5ndGgsXG4gICAgICAgICAgICBqc0V4Y2VwdGlvbnM6IHJlcG9ydC5qc0V4Y2VwdGlvbnMubGVuZ3RoLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmRpYWdub3NlKGBcdThCQ0FcdTY1QURcdTVCOENcdTYyMTA6ICR7c3VtbWFyeS5oZWFsdGh5ID8gXCJcdTUwNjVcdTVFQjdcIiA6IGAke3N1bW1hcnkuaXNzdWVzLmxlbmd0aH0gXHU2NzYxXHU5NUVFXHU5ODk4YH1gLCB7XG4gICAgICAgICAgICBoZWFsdGh5OiBzdW1tYXJ5LmhlYWx0aHksXG4gICAgICAgICAgICBpc3N1ZXM6IHN1bW1hcnkuaXNzdWVzLmxlbmd0aCxcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25zOiBzdW1tYXJ5LnN1Z2dlc3Rpb25zLmxlbmd0aCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGNhc2UgXCJldmFsXCI6IHtcbiAgICAgICAgICBjb25zdCBiID0gYXdhaXQgdGhpcy5lbnN1cmVCcm93c2VyKCk7XG4gICAgICAgICAgY29uc3Qgc2NyaXB0ID0gU3RyaW5nKGFyZ3Muc2NyaXB0KTtcbiAgICAgICAgICAvLyBcdTVCODlcdTUxNjhcdTUyQTBcdTU2RkFcdUZGMUFcdTYyRTZcdTYyMkFcdTlBRDhcdTUzNzFcdTZDRThcdTUxNjVcdTgxMUFcdTY3MkNcdUZGMDhcdTY1ODdcdTRFRjZcdTdDRkJcdTdFREYvXHU1QjUwXHU4RkRCXHU3QTBCL1x1NkUxN1x1OTAwRlx1NUMxRFx1OEJENVx1RkYwOVx1RkYwQ1x1OTYzMlx1NjNEMFx1Njc0M1xuICAgICAgICAgIGNvbnN0IGd1YXJkID0gZ3VhcmRKc1NjcmlwdChzY3JpcHQpO1xuICAgICAgICAgIGlmIChndWFyZC5ibG9ja2VkKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBlcnJSZXN1bHQoXG4gICAgICAgICAgICAgIGBldmFsIFx1ODhBQlx1NUI4OVx1NTE2OFx1NjJFNlx1NjIyQVx1RkYxQVx1ODExQVx1NjcyQ1x1NTQ3RFx1NEUyRFx1OUFEOFx1NTM3MVx1NjRDRFx1NEY1QyBbJHsoZ3VhcmQucmVhc29ucyA/PyBbXSkuam9pbihcIiwgXCIpfV1cdTMwMDJgICtcbiAgICAgICAgICAgICAgICBgXFxuXHU0RTNBXHU5NjMyXHU2M0QwXHU2NzQzL1x1NkUxN1x1OTAwRlx1RkYwQ1x1Nzk4MVx1NkI2Mlx1OTAxQVx1OEZDNyBldmFsIFx1NkNFOFx1NTE2NVx1NjU4N1x1NEVGNlx1N0NGQlx1N0VERlx1OEJCRlx1OTVFRVx1MzAwMVx1NUI1MFx1OEZEQlx1N0EwQlx1NjI2N1x1ODg0Q1x1NjIxNlx1N0NGQlx1N0VERlx1N0VBN1x1NjRDRFx1NEY1Q1x1MzAwMmBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcih7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGBldmFsIFx1ODhBQlx1NUI4OVx1NTE2OFx1NjJFNlx1NjIyQTogJHtndWFyZC5yZWFzb25zPy5qb2luKFwiLCBcIil9YCxcbiAgICAgICAgICAgICAgY29kZTogXCJFVkFMX0JMT0NLRURcIixcbiAgICAgICAgICAgICAgcmVhc29uOiBcImRhbmdlcm91cy1zY3JpcHRcIixcbiAgICAgICAgICAgICAgcmF3OiBzY3JpcHQuc2xpY2UoMCwgMzAwKSxcbiAgICAgICAgICAgICAgZXhwbGFuYXRpb246IFwiXHU2OEMwXHU2RDRCXHU1MjMwXHU5QUQ4XHU1MzcxXHU2Q0U4XHU1MTY1XHU4MTFBXHU2NzJDXHVGRjBDXHU0RTNBXHU5NjMyXHU2M0QwXHU2NzQzL1x1NkUxN1x1OTAwRlx1NURGMlx1NjJEMlx1N0VERFx1NjI2N1x1ODg0Q1x1MzAwMlwiLFxuICAgICAgICAgICAgICBzdWdnZXN0aW9uOiBcIlx1NzlGQlx1OTY2NFx1NjU4N1x1NEVGNlx1N0NGQlx1N0VERi9cdTVCNTBcdThGREJcdTdBMEIvXHU3Q0ZCXHU3RURGXHU3RUE3XHU4QkJGXHU5NUVFXHU0RUUzXHU3ODAxXHVGRjBDXHU0RUM1XHU0RkREXHU3NTU5XHU5ODc1XHU5NzYyXHU1MTg1XHU3Njg0IERPTS9KUyBcdThCQ0FcdTY1QURcdTMwMDJcIixcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGV2YWxSZXN1bHQgPSBhd2FpdCBiLmV2YWwoc2NyaXB0KTtcbiAgICAgICAgICAvLyBcdTVCRjlcdTdFRDNcdTY3OUNcdTUwNUFcdTgxMzFcdTY1NEZcdUZGMENcdTkwN0ZcdTUxNEQgZXZhbCBcdThGRDRcdTU2REVcdTc2ODRcdTY1NEZcdTYxMUZcdTUwM0NcdUZGMDhcdTU5ODIgdG9rZW4vcGFzc3dvcmRcdUZGMDlcdTU5MTZcdTZDQzRcbiAgICAgICAgICBjb25zdCBzYW5pdGl6ZWRSZXN1bHQgPSByZWRhY3REZWVwKGV2YWxSZXN1bHQpO1xuICAgICAgICAgIHJlc3VsdCA9IG9rUmVzdWx0KGBcdTYyNjdcdTg4NENcdTdFRDNcdTY3OUM6ICR7SlNPTi5zdHJpbmdpZnkoc2FuaXRpemVkUmVzdWx0KT8uc2xpY2UoMCwgMjAwMCl9YCwgeyByZXN1bHQ6IHNhbml0aXplZFJlc3VsdCB9KTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5sb2coeyBjYXRlZ29yeTogXCJhY3Rpb25cIiwgbWVzc2FnZTogXCJldmFsIFx1NjI2N1x1ODg0Q1wiIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FzZSBcInNjcmVlbnNob3RcIjoge1xuICAgICAgICAgIGNvbnN0IGIgPSBhd2FpdCB0aGlzLmVuc3VyZUJyb3dzZXIoKTtcbiAgICAgICAgICBjb25zdCBzaG90ID0gYXdhaXQgYi5hY3QoeyB0eXBlOiBcInNjcmVlbnNob3RcIiwgZnVsbFBhZ2U6ICEhYXJncy5mdWxsUGFnZSB9IGFzIGFueSk7XG4gICAgICAgICAgY29uc3QgYmFzZTY0ID0gKHNob3QuZGF0YSBhcyBhbnkpPy5iYXNlNjQ7XG4gICAgICAgICAgY29uc3QgZGF0YVVyaSA9IGBkYXRhOmltYWdlL3BuZztiYXNlNjQsJHtiYXNlNjR9YDtcbiAgICAgICAgICByZXN1bHQgPSBva1Jlc3VsdChzaG90LnN1bW1hcnksIHsgaW1hZ2U6IGRhdGFVcmkgfSk7XG4gICAgICAgICAgLy8gXHU2MjJBXHU1NkZFXHU0RThCXHU0RUY2XHVGRjFBXHU2MjhBXHU1NkZFXHU3MjQ3XHU3RUIzXHU1MTY1XHU0RThCXHU0RUY2XHU2RDQxXHVGRjBDXHU0RjlCXHU1OTE2XHU5MEU4XHU1OTFBXHU2QTIxXHU2MDAxIEFJIFx1NkQ4OFx1OEQzOVxuICAgICAgICAgIHRoaXMubG9nZ2VyLnNjcmVlbnNob3Qoe1xuICAgICAgICAgICAgZGF0YVVyaSxcbiAgICAgICAgICAgIGZ1bGxQYWdlOiAhIWFyZ3MuZnVsbFBhZ2UsXG4gICAgICAgICAgICBjYXB0aW9uOiBhcmdzLmNhcHRpb24gPyBTdHJpbmcoYXJncy5jYXB0aW9uKSA6IHNob3Quc3VtbWFyeSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGNhc2UgXCJzZXNzaW9uX2xvZ1wiOiB7XG4gICAgICAgICAgLy8gXHU4QkE5XHU1OTE2XHU5MEU4IEFJIFx1NjJDOVx1NTNENlx1NEYxQVx1OEJERFx1NEU4Qlx1NEVGNlx1NkQ0MVx1RkYwOFx1OEZEOVx1NjYyRiBBSSBcdTUzNEZcdTRGNUNcdTc2ODRcIlx1OEZGRFx1OEUyQVx1ODBGRFx1NTI5QlwiXHVGRjA5XG4gICAgICAgICAgY29uc3QgZXZlbnRzID0gdGhpcy5sb2dnZXIudG9BcnJheSgpO1xuICAgICAgICAgIGNvbnN0IGZvcm1hdCA9IFN0cmluZyhhcmdzLmZvcm1hdCA/PyBcIm1hcmtkb3duXCIpO1xuICAgICAgICAgIGlmIChmb3JtYXQgPT09IFwianNvblwiKSB7XG4gICAgICAgICAgICAvLyBcdTVCRjlcdTRFOEJcdTRFRjZcdTZENDFcdTUwNUFcdTZERjFcdTgxMzFcdTY1NEZcdUZGMENcdTk2MzJcdTZCNjIgcGF5bG9hZCBcdTY0M0FcdTVFMjZcdTc2ODRcdTRFRTRcdTcyNEMvXHU1QkM2XHU3ODAxXHU1OTE2XHU2Q0M0XG4gICAgICAgICAgICByZXN1bHQgPSBva1Jlc3VsdChgXHU1MTcxICR7ZXZlbnRzLmxlbmd0aH0gXHU2NzYxXHU0RThCXHU0RUY2YCwgeyBldmVudHM6IHJlZGFjdERlZXAoZXZlbnRzKSB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbWQgPSB0aGlzLmxvZ2dlci5leHBvcnRNYXJrZG93bih7IHRpdGxlOiBhcmdzLnRpdGxlID8gU3RyaW5nKGFyZ3MudGl0bGUpIDogdW5kZWZpbmVkIH0pO1xuICAgICAgICAgICAgcmVzdWx0ID0gb2tSZXN1bHQobWQsIHsgZXZlbnRDb3VudDogZXZlbnRzLmxlbmd0aCB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjYXNlIFwiY2xvc2VcIjoge1xuICAgICAgICAgIGlmICh0aGlzLmJyb3dzZXIpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnJvd3Nlci5zdG9wKCk7XG4gICAgICAgICAgICB0aGlzLmJyb3dzZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdCA9IG9rUmVzdWx0KFwiXHU2RDRGXHU4OUM4XHU1NjY4XHU1REYyXHU1MTczXHU5NUVEXCIpO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLnN5c3RlbShcIlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NURGMlx1NTE3M1x1OTVFRFwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGNhc2UgXCJzdGVhbHRoX3N0YXR1c1wiOiB7XG4gICAgICAgICAgLy8gXHU2N0U1XHU4QkUyXHU5NjMyXHU2OEMwXHU2RDRCXHU2QTIxXHU1NzU3XHU3MkI2XHU2MDAxXHVGRjA4XHU5NzAwXHU1NzI4XHU2Nzg0XHU5MDIwXHU2NUY2XHU5MTREXHU3RjZFIHN0ZWFsdGggXHU2MjREXHU4MEZEXHU3NTFGXHU2NTQ4XHVGRjA5XG4gICAgICAgICAgY29uc3Qgc3RlYWx0aE9wdHMgPSB0aGlzLm9wdHMuc3RlYWx0aDtcbiAgICAgICAgICBjb25zdCBlbmFibGVkID0gc3RlYWx0aE9wdHM/LmVuYWJsZWQgPz8gZmFsc2U7XG4gICAgICAgICAgY29uc3QgbGV2ZWwgPSBzdGVhbHRoT3B0cz8ubGV2ZWwgPz8gXCJiYXNpY1wiO1xuICAgICAgICAgIGNvbnN0IHVhID0gc3RlYWx0aE9wdHM/LnVzZXJBZ2VudCA/PyBcImRlZmF1bHRcIjtcbiAgICAgICAgICBjb25zdCBsaW5lcyA9IFtcbiAgICAgICAgICAgIGAjIFx1OTYzMlx1NjhDMFx1NkQ0Qlx1RkYwOFN0ZWFsdGhcdUZGMDlcdTcyQjZcdTYwMDFgLFxuICAgICAgICAgICAgYC0gKipcdTU0MkZcdTc1MjgqKjogJHtlbmFibGVkID8gXCJcdTI3MDUgXHU2NjJGXCIgOiBcIlx1Mjc0QyBcdTU0MjZcIn1gLFxuICAgICAgICAgICAgYC0gKipcdTdFQTdcdTUyMkIqKjogJHtsZXZlbH1gLFxuICAgICAgICAgICAgYC0gKipVc2VyLUFnZW50Kio6ICR7dWF9YCxcbiAgICAgICAgICAgIGBgLFxuICAgICAgICAgICAgZW5hYmxlZFxuICAgICAgICAgICAgICA/IFwiPiBTdGVhbHRoIFx1NURGMlx1NTQyRlx1NzUyOFx1RkYxQVx1NTNDRFx1NjMwN1x1N0VCOVx1NkNFOFx1NTE2NVx1MzAwMVx1ODFFQVx1NTJBOFx1NTMxNlx1NjNBN1x1NTIzNlx1OTY5MFx1ODVDRlx1MzAwMVx1NEVCQVx1N0M3Qlx1ODg0Q1x1NEUzQVx1NkEyMVx1NjJERlx1NTc0N1x1NzUxRlx1NjU0OFx1MzAwMlwiXG4gICAgICAgICAgICAgIDogXCI+IFN0ZWFsdGggXHU2NzJBXHU1NDJGXHU3NTI4XHUzMDAyXHU4MkU1XHU5MUM3XHU5NkM2XHU1MTZDXHU1RjAwXHU2NTcwXHU2MzZFXHU2NUY2XHU4OEFCXHU5NjUwXHU5MDFGL1x1NUMwMVx1Nzk4MVx1RkYwQ1x1NTNFRlx1OTAxQVx1OEZDNyBgc3RlYWx0aC5lbmFibGVkPXRydWVgIFx1NTcyOFx1NTIxRFx1NTlDQlx1NTMxNlx1NjVGNlx1NUYwMFx1NTQyRlx1MzAwMlwiLFxuICAgICAgICAgIF07XG4gICAgICAgICAgcmVzdWx0ID0gb2tSZXN1bHQobGluZXMuam9pbihcIlxcblwiKSwgeyBlbmFibGVkLCBsZXZlbCwgdWEgfSk7XG4gICAgICAgICAgdGhpcy5sb2dnZXIubG9nKHsgY2F0ZWdvcnk6IFwic3lzdGVtXCIsIG1lc3NhZ2U6IGBcdTY3RTVcdThCRTIgc3RlYWx0aCBcdTcyQjZcdTYwMDE6ICR7ZW5hYmxlZCA/IFwiZW5hYmxlZFwiIDogXCJkaXNhYmxlZFwifWAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJlc3VsdCA9IGVyclJlc3VsdChgXHU2NzJBXHU3N0U1XHU1REU1XHU1MTc3OiAke25hbWV9XHUzMDAyXHU1M0VGXHU3NTI4XHU1REU1XHU1MTc3OiAke1RPT0xTLm1hcCgodCkgPT4gdC5uYW1lKS5qb2luKFwiLCBcIil9YCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFx1NjI4QVx1NjcyQ1x1NkIyMVx1OEMwM1x1NzUyOFx1NzY4NFx1NjcwMFx1NjVCMFx1NEU4Qlx1NEVGNlx1NkNFOFx1NTE2NVx1OEZENFx1NTZERVx1N0VEM1x1Njc5Q1x1RkYwQ1x1OEJBOVx1NTkxNlx1OTBFOCBBSSBcdTYyRkZcdTUyMzBcIlx1NTNEMVx1NzUxRlx1NEU4Nlx1NEVDMFx1NEU0OCArIFx1NEUzQVx1NEVDMFx1NEU0OCArIFx1NTZGRSArIFx1NjVFNVx1NUZEN1wiXG4gICAgICByZXN1bHQgPSB0aGlzLmF0dGFjaEV2ZW50cyhyZXN1bHQsIG5hbWUpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiBTdHJpbmcoZXJyKTtcbiAgICAgIC8vIFx1NUYwMlx1NUUzOFx1NEU1Rlx1NkM4OVx1NkRDMFx1NEUzQVx1NjgwN1x1NTFDNlx1OTUxOVx1OEJFRlx1NEU4Qlx1NEVGNlx1RkYwQ1x1NUUyNlx1NTM5Rlx1NTZFMFx1NEUwRVx1ODlFM1x1OTFDQVxuICAgICAgdGhpcy5sb2dnZXIuZXJyb3Ioe1xuICAgICAgICBtZXNzYWdlOiBgXHU1REU1XHU1MTc3ICR7bmFtZX0gXHU2MjY3XHU4ODRDXHU1RjAyXHU1RTM4OiAke21zZ31gLFxuICAgICAgICBjb2RlOiBcIlRPT0xfRVhDRVBUSU9OXCIsXG4gICAgICAgIHJlYXNvbjogXCJ1bmNhdWdodC1leGNlcHRpb25cIixcbiAgICAgICAgcmF3OiBtc2csXG4gICAgICAgIGV4cGxhbmF0aW9uOiBgXHU1REU1XHU1MTc3ICR7bmFtZX0gXHU1NzI4XHU2MjY3XHU4ODRDXHU2NUY2XHU2MjlCXHU1MUZBXHU2NzJBXHU2MzU1XHU4M0I3XHU1RjAyXHU1RTM4XHUzMDAyYCwgXG4gICAgICAgIHN1Z2dlc3Rpb246IFwiXHU2OEMwXHU2N0U1XHU1M0MyXHU2NTcwXHU2NjJGXHU1NDI2XHU1NDA4XHU2Q0Q1XHUzMDAxXHU2RDRGXHU4OUM4XHU1NjY4XHU2NjJGXHU1NDI2XHU1M0VGXHU3NTI4XHUzMDAxXHU3RjUxXHU3RURDXHU2NjJGXHU1NDI2XHU4RkRFXHU5MDFBXHVGRjFCXHU1M0VGXHU1MTQ4IG9ic2VydmUgXHU3ODZFXHU4QkE0XHU5ODc1XHU5NzYyXHU3MkI2XHU2MDAxXHUzMDAyXCIsXG4gICAgICAgIGRldGFpbDogZXJyIGluc3RhbmNlb2YgRXJyb3IgJiYgZXJyLnN0YWNrID8gZXJyLnN0YWNrLnNsaWNlKDAsIDUwMCkgOiB1bmRlZmluZWQsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYXR0YWNoRXZlbnRzKGVyclJlc3VsdChgXHU1REU1XHU1MTc3XHU2MjY3XHU4ODRDXHU1OTMxXHU4RDI1OiAke21zZ31gKSwgbmFtZSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfVxuXG4gIC8qKiBcdTYyOEFcdTY3MDBcdThGRDFcdTRFOEJcdTRFRjZcdTk2NDRcdTUyQTBcdTUyMzAgVG9vbFJlc3VsdC5zdHJ1Y3R1cmVkXHVGRjBDXHU0RjlCXHU1OTE2XHU5MEU4IEFJIFx1NkQ4OFx1OEQzOVx1NEU4Qlx1NEVGNlx1NkQ0MSAqL1xuICBwcml2YXRlIGF0dGFjaEV2ZW50cyhyZXN1bHQ6IFRvb2xSZXN1bHQsIF9uYW1lOiBzdHJpbmcpOiBUb29sUmVzdWx0IHtcbiAgICBpZiAoIXJlc3VsdC5zdHJ1Y3R1cmVkKSByZXN1bHQuc3RydWN0dXJlZCA9IHt9O1xuICAgIGNvbnN0IGV2ZW50cyA9IHRoaXMubG9nZ2VyLnRvQXJyYXkoKS5zbGljZSgtMzApO1xuICAgIChyZXN1bHQuc3RydWN0dXJlZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuZXZlbnRzID0gZXZlbnRzO1xuICAgIChyZXN1bHQuc3RydWN0dXJlZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuc2Vzc2lvbklkID0gdGhpcy5sb2dnZXIuc2Vzc2lvbklkO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKiogXHU5NjkwXHU4NUNGXHU2NTRGXHU2MTFGXHU1M0MyXHU2NTcwXHVGRjA4XHU5MDdGXHU1MTREXHU2MjhBIHZhbHVlL3NjcmlwdC91cmwgXHU0RTJEXHU3Njg0XHU2NTRGXHU2MTFGXHU0RkUxXHU2MDZGXHU1MTY4XHU2NTg3XHU1ODVFXHU1MTY1XHU2NUU1XHU1RkQ3XHVGRjA5ICovXG4gIHByaXZhdGUgc2FmZUFyZ3MoYXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gICAgY29uc3Qgc2FmZTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhhcmdzKSkge1xuICAgICAgaWYgKGsgPT09IFwidmFsdWVcIiB8fCBrID09PSBcInNjcmlwdFwiKSBzYWZlW2tdID0gdHlwZW9mIHYgPT09IFwic3RyaW5nXCIgPyBgPCR7di5sZW5ndGh9IGNoYXJzPmAgOiB2O1xuICAgICAgZWxzZSBpZiAoayA9PT0gXCJ1cmxcIiAmJiB0eXBlb2YgdiA9PT0gXCJzdHJpbmdcIikgc2FmZVtrXSA9IHJlZGFjdFVybCh2KTtcbiAgICAgIGVsc2UgaWYgKGsgPT09IFwiZXhwZWN0ZWRcIiAmJiB0eXBlb2YgdiA9PT0gXCJzdHJpbmdcIikgc2FmZVtrXSA9IHYubGVuZ3RoID4gNjAgPyBgJHt2LnNsaWNlKDAsIDYwKX0uLi5gIDogdjtcbiAgICAgIGVsc2Ugc2FmZVtrXSA9IHY7XG4gICAgfVxuICAgIHJldHVybiBzYWZlO1xuICB9XG5cbiAgLyoqIFx1NTJBOFx1NEY1Q1x1N0M3Qlx1NTc4QiAtPiBcdTdBMzNcdTVCOUFcdTk1MTlcdThCRUZcdTc4MDEgKi9cbiAgcHJpdmF0ZSBtYXBFcnJvckNvZGUodHlwZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEFDVElPTl9GQUlMRURfJHt0eXBlLnRvVXBwZXJDYXNlKCl9YDtcbiAgfVxuXG4gIC8qKiBcdTRFQ0VcdTY0NThcdTg5ODEvXHU4QkNBXHU2NUFEXHU2M0E4XHU2NUFEXHU2ODM5XHU1NkUwXHU1MjA2XHU3QzdCICovXG4gIHByaXZhdGUgbWFwRXJyb3JSZWFzb24oc3VtbWFyeTogc3RyaW5nLCBkaWFnbm9zdGljcz86IEFycmF5PHsga2luZD86IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0+KTogc3RyaW5nIHtcbiAgICBjb25zdCBzID0gc3VtbWFyeS50b0xvd2VyQ2FzZSgpO1xuICAgIGlmIChzLmluY2x1ZGVzKFwidGltZW91dFwiKSB8fCBzLmluY2x1ZGVzKFwiXHU4RDg1XHU2NUY2XCIpKSByZXR1cm4gXCJ0aW1lb3V0XCI7XG4gICAgaWYgKHMuaW5jbHVkZXMoXCI0MDRcIikgfHwgcy5pbmNsdWRlcyhcIjUwMFwiKSB8fCBzLmluY2x1ZGVzKFwibmV0d29ya1wiKSB8fCBzLmluY2x1ZGVzKFwiXHU3RjUxXHU3RURDXCIpKSByZXR1cm4gXCJuZXR3b3JrLWZhaWx1cmVcIjtcbiAgICBpZiAocy5pbmNsdWRlcyhcIm5vdCBmb3VuZFwiKSB8fCBzLmluY2x1ZGVzKFwiXHU2MjdFXHU0RTBEXHU1MjMwXCIpIHx8IHMuaW5jbHVkZXMoXCJcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNERcIikgfHwgcy5pbmNsdWRlcyhcIlx1NjcyQVx1NjI3RVx1NTIzMFwiKSB8fCBzLmluY2x1ZGVzKFwibG9jYXRvclwiKSkgcmV0dXJuIFwibG9jYXRvci1ub3QtZm91bmRcIjtcbiAgICBpZiAoZGlhZ25vc3RpY3M/LnNvbWUoKGQpID0+IGQua2luZCA9PT0gXCJqcy1leGNlcHRpb25cIikpIHJldHVybiBcImpzLWV4Y2VwdGlvblwiO1xuICAgIGlmIChkaWFnbm9zdGljcz8uc29tZSgoZCkgPT4gZC5raW5kID09PSBcImRvbVwiKSkgcmV0dXJuIFwiZG9tLXVucmVuZGVyZWRcIjtcbiAgICByZXR1cm4gXCJhY3Rpb24tZmFpbGVkXCI7XG4gIH1cblxuICAvKiogXHU5NzYyXHU1NDExIEFJIFx1NzY4NFx1NjgzOVx1NTZFMFx1ODlFM1x1OTFDQSAqL1xuICBwcml2YXRlIGJ1aWxkRXhwbGFuYXRpb24oc3VtbWFyeTogc3RyaW5nLCBkaWFnbm9zdGljcz86IEFycmF5PHsga2luZD86IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0+KTogc3RyaW5nIHtcbiAgICBjb25zdCByZWFzb24gPSB0aGlzLm1hcEVycm9yUmVhc29uKHN1bW1hcnksIGRpYWdub3N0aWNzKTtcbiAgICBjb25zdCBleHRyYXMgPSAoZGlhZ25vc3RpY3MgPz8gW10pLnNsaWNlKDAsIDMpLm1hcCgoZCkgPT4gZC5tZXNzYWdlKS5qb2luKFwiOyBcIik7XG4gICAgc3dpdGNoIChyZWFzb24pIHtcbiAgICAgIGNhc2UgXCJsb2NhdG9yLW5vdC1mb3VuZFwiOlxuICAgICAgICByZXR1cm4gYFx1OTg3NVx1OTc2Mlx1NEUyRFx1NjcyQVx1NjI3RVx1NTIzMFx1NzZFRVx1NjgwN1x1NTE0M1x1N0QyMFx1MzAwMiR7ZXh0cmFzID8gYFx1OEJDQVx1NjVBRFx1NjNEMFx1NzkzQTogJHtleHRyYXN9YCA6IFwiXHU1M0VGXHU4MEZEXHU2NjJGXHU1MTQzXHU3RDIwXHU2NzJBXHU2RTMyXHU2N0QzXHUzMDAxXHU5MDA5XHU2MkU5XHU1NjY4XHU1M0Q4XHU1MzE2XHUzMDAxXHU2MjE2XHU5ODc1XHU5NzYyXHU4RkQ4XHU1NzI4XHU1MkEwXHU4RjdEXHUzMDAyXCJ9YDtcbiAgICAgIGNhc2UgXCJ0aW1lb3V0XCI6XG4gICAgICAgIHJldHVybiBgXHU2NENEXHU0RjVDXHU4RDg1XHU2NUY2XHVGRjBDXHU1MTQzXHU3RDIwXHU2MjE2XHU1QkZDXHU4MjJBXHU1NzI4XHU5NjUwXHU1QjlBXHU2NUY2XHU5NUY0XHU1MTg1XHU2NzJBXHU1QzMxXHU3RUVBXHUzMDAyJHtleHRyYXMgPyBgXHU4QkNBXHU2NUFEXHU2M0QwXHU3OTNBOiAke2V4dHJhc31gIDogXCJcIn1gO1xuICAgICAgY2FzZSBcIm5ldHdvcmstZmFpbHVyZVwiOlxuICAgICAgICByZXR1cm4gYFx1N0Y1MVx1N0VEQ1x1OEJGN1x1NkM0Mlx1NTkzMVx1OEQyNVx1NjIxNlx1NzZFRVx1NjgwN1x1NEUwRFx1NTNFRlx1OEZCRVx1MzAwMiR7ZXh0cmFzID8gYFx1OEJDQVx1NjVBRFx1NjNEMFx1NzkzQTogJHtleHRyYXN9YCA6IFwiXCJ9YDtcbiAgICAgIGNhc2UgXCJqcy1leGNlcHRpb25cIjpcbiAgICAgICAgcmV0dXJuIGBcdTk4NzVcdTk3NjJcdTYyOUJcdTUxRkFcdTRFODYgSlMgXHU2NzJBXHU2MzU1XHU4M0I3XHU1RjAyXHU1RTM4XHVGRjBDXHU1M0VGXHU4MEZEXHU5NjNCXHU2NUFEXHU0RUE0XHU0RTkyXHUzMDAyJHtleHRyYXMgPyBgXHU4QkNBXHU2NUFEXHU2M0QwXHU3OTNBOiAke2V4dHJhc31gIDogXCJcIn1gO1xuICAgICAgY2FzZSBcImRvbS11bnJlbmRlcmVkXCI6XG4gICAgICAgIHJldHVybiBgXHU5ODc1XHU5NzYyIERPTSBcdTY3MkFcdTZCNjNcdTVFMzhcdTZFMzJcdTY3RDNcdUZGMDhcdTc2N0RcdTVDNEYvXHU2NzJBXHU2MzAyXHU4RjdEXHVGRjA5XHVGRjBDXHU1MjFEXHU1OUNCXHU1MzE2IEpTIFx1NTNFRlx1ODBGRFx1NTFGQVx1OTUxOVx1MzAwMmA7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gYFx1NTJBOFx1NEY1Q1x1NjI2N1x1ODg0Q1x1NTkzMVx1OEQyNTogJHtzdW1tYXJ5LnNsaWNlKDAsIDIwMCl9YDtcbiAgICB9XG4gIH1cblxuICAvKiogXHU1M0VGXHU4ODRDXHU1MkE4XHU3Njg0XHU0RkVFXHU1OTBEXHU1RUZBXHU4QkFFICovXG4gIHByaXZhdGUgYnVpbGRTdWdnZXN0aW9uKHN1bW1hcnk6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVhc29uID0gdGhpcy5tYXBFcnJvclJlYXNvbihzdW1tYXJ5KTtcbiAgICBzd2l0Y2ggKHJlYXNvbikge1xuICAgICAgY2FzZSBcImxvY2F0b3Itbm90LWZvdW5kXCI6XG4gICAgICAgIHJldHVybiBcIlx1NTE0OCBvYnNlcnZlIFx1NjdFNVx1NzcwQlx1NUY1M1x1NTI0RCBET01cdUZGMENcdTUyMDdcdTYzNjJcdTVCOUFcdTRGNERcdTdCNTZcdTc1NjUocmVmXHUyMTkyc2VsZWN0b3JcdTIxOTJ0ZXh0XHUyMTkyc2VtYW50aWMpXHVGRjBDXHU2MjE2IHdhaXQgXHU1MTQzXHU3RDIwXHU1QzMxXHU3RUVBXHU1NDBFXHU5MUNEXHU4QkQ1XHUzMDAyXCI7XG4gICAgICBjYXNlIFwidGltZW91dFwiOlxuICAgICAgICByZXR1cm4gXCJcdTY4QzBcdTY3RTVcdTk4NzVcdTk3NjJcdTUyQTBcdThGN0QvXHU3RjUxXHU3RURDXHVGRjBDXHU1M0VGXHU1RUY2XHU5NTdGIHdhaXQgXHU2MjE2XHU2NTM5XHU3NTI4IHdhaXRVbnRpbCBcdTdCNTZcdTc1NjVcdUZGMUJcdTgyRTVcdTUxNDNcdTdEMjBcdTY2MkZcdTVGMDJcdTZCNjVcdTZFMzJcdTY3RDNcdUZGMENcdTUxNDhcdTdCNDlcdTUxNzZcdTUxRkFcdTczQjBcdTMwMDJcIjtcbiAgICAgIGNhc2UgXCJuZXR3b3JrLWZhaWx1cmVcIjpcbiAgICAgICAgcmV0dXJuIFwiXHU2ODM4XHU1QkY5IFVSTC9cdTYzQTVcdTUzRTNcdThERUZcdTVGODRcdTMwMDFDT1JTIFx1NEUwRVx1NTQwRVx1N0FFRlx1NzJCNlx1NjAwMVx1RkYxQlx1NUZDNVx1ODk4MVx1NjVGNlx1NzUyOCBkaWFnbm9zZSBcdTY3RTVcdTc3MEJcdTdGNTFcdTdFRENcdTU5MzFcdThEMjVcdThCRTZcdTYwQzVcdTMwMDJcIjtcbiAgICAgIGNhc2UgXCJqcy1leGNlcHRpb25cIjpcbiAgICAgICAgcmV0dXJuIFwiXHU3NTI4IGRpYWdub3NlIFx1NUM1NVx1NUYwMFx1NUYwMlx1NUUzOFx1NTgwNlx1NjgwOFx1RkYwQ1x1NUI5QVx1NEY0RCB0aHJvdy9cdTY3MkFcdTVCOUFcdTRFNDkvXHU1RjAyXHU2QjY1XHU2NzJBIGNhdGNoXHVGRjBDXHU0RkVFXHU1OTBEXHU1NDBFXHU5MUNEXHU4QkQ1XHUzMDAyXCI7XG4gICAgICBjYXNlIFwiZG9tLXVucmVuZGVyZWRcIjpcbiAgICAgICAgcmV0dXJuIFwiXHU2OEMwXHU2N0U1XHU1MjFEXHU1OUNCXHU1MzE2IEpTIFx1NjYyRlx1NTQyNlx1NjI5Qlx1OTUxOVx1NUJGQ1x1ODFGNFx1NjU3NFx1NjgxMVx1NjcyQVx1NkUzMlx1NjdEM1x1RkYxQlx1NzUyOCBkaWFnbm9zZSBcdTc2ODQgZG9tIFx1N0VGNFx1NUVBNlx1NUI5QVx1NEY0RFx1NzY3RFx1NUM0Rlx1NjgzOVx1NTZFMFx1MzAwMlwiO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIFwiXHU3NTI4IGRpYWdub3NlIFx1OTFDN1x1OTZDNlx1NUI4Q1x1NjU3NFx1OEJDQVx1NjVBRFx1RkYwQ1x1N0VEM1x1NTQwOFx1NjVFNVx1NUZEN1x1NEU4Qlx1NEVGNlx1NUI5QVx1NEY0RFx1NjgzOVx1NTZFMFx1NTQwRVx1NEZFRVx1NkI2M1x1NTJBOFx1NEY1Q1x1MzAwMlwiO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBcdTYyOEFcdTYyNDFcdTVFNzNcdTUzQzJcdTY1NzBcdTg5QzRcdTY1NzRcdTRFM0FcdTdFREZcdTRFMDBcdTUyQThcdTRGNUMgKi9cbiAgcHJpdmF0ZSBub3JtYWxpemVBY3Rpb24oYXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gICAgY29uc3QgdHlwZSA9IFN0cmluZyhhcmdzLnR5cGUpO1xuICAgIGNvbnN0IGJhc2UgPSB7IHR5cGUsIGRlc2NyaXB0aW9uOiBhcmdzLmRlc2NyaXB0aW9uIGFzIHN0cmluZyB8IHVuZGVmaW5lZCB9O1xuICAgIC8vIFx1NTNFQVx1NjQzQVx1NUUyNlx1NUI5QVx1NEY0RFx1NzZGOFx1NTE3M1x1NUI1N1x1NkJCNVx1RkYwOFx1OTA3Rlx1NTE0RFx1NjI4QSB1bmRlZmluZWQgXHU1ODVFXHU1MTY1XHVGRjA5XG4gICAgY29uc3QgbG9jOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIGlmIChhcmdzLnJlZikgbG9jLnJlZiA9IGFyZ3MucmVmO1xuICAgIGlmIChhcmdzLnNlbGVjdG9yKSBsb2Muc2VsZWN0b3IgPSBhcmdzLnNlbGVjdG9yO1xuICAgIGlmIChhcmdzLnRleHQpIGxvYy50ZXh0ID0gYXJncy50ZXh0O1xuICAgIGlmIChhcmdzLnNlbWFudGljKSBsb2Muc2VtYW50aWMgPSBhcmdzLnNlbWFudGljO1xuXG4gICAgY29uc3QgcmVzdDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGsgb2YgW1widXJsXCIsIFwidmFsdWVcIiwgXCJrZXlcIiwgXCJtc1wiLCBcInNjcmlwdFwiLCBcIm1vZGVcIiwgXCJleHBlY3RlZFwiLCBcImZ1bGxQYWdlXCIsIFwiZGVsdGFZXCIsIFwiZGVsYXlcIiwgXCJ3YWl0VW50aWxcIiwgXCJ3YWl0Rm9yTmF2aWdhdGlvblwiXSkge1xuICAgICAgaWYgKGFyZ3Nba10gIT09IHVuZGVmaW5lZCkgcmVzdFtrXSA9IGFyZ3Nba107XG4gICAgfVxuICAgIHJldHVybiB7IC4uLmJhc2UsIC4uLmxvYywgLi4ucmVzdCB9O1xuICB9XG5cbiAgLyoqIFx1NTE3M1x1OTVFRFx1RkYwOFx1NEY5Qlx1NEYyMFx1OEY5M1x1NUM0Mlx1OTAwMFx1NTFGQVx1NjVGNlx1OEMwM1x1NzUyOFx1RkYwOSAqL1xuICBhc3luYyBzaHV0ZG93bigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5icm93c2VyKSBhd2FpdCB0aGlzLmJyb3dzZXIuc3RvcCgpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBcdTk1MTlcdThCRUZcdTgxRUFcdTUyQThcdTUzMzlcdTkxNERcdTg5RTNcdTUxQjNcdTY1QjlcdTY4NDhcdTVGMTVcdTY0Q0VcdUZGMDhTb2x1dGlvbiBNYXRjaGVyXHVGRjA5XG4gKlxuICogXHU4RkQ5XHU2NjJGXHUzMDBDY25iLmNvb2wgXHU1NzI4XHU3RUJGXHU0RjE4XHU1MkJGXHUzMDBEXHU3Njg0XHU2ODM4XHU1RkMzXHU1MzQ3XHU3RUE3XHVGRjFBXHU1RjUzXHU4QzAzXHU4QkQ1L0NJIFx1OEZDN1x1N0EwQlx1NEUyRFx1NTFGQVx1NzNCMFx1OTVFRVx1OTg5OFx1NjVGNlx1RkYwQ1xuICogXHU2MjhBXHUzMDBDXHU5NUVFXHU5ODk4XHU2MEM1XHU1MUI1XHUzMDBEXHU2OEMwXHU3RDIyXHU1MzM5XHU5MTREXHU1MjMwXHU1MTg1XHU3RjZFXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU3N0U1XHU4QkM2XHU1RTkzXHVGRjA4cGxheWJvb2tcdUZGMDlcdUZGMENcdTYzQThcdTgzNTBcdTRFMDBcdTRFMkFcdTY1QjlcdTY4NDhcdUZGMUFcbiAqXG4gKiAtICoqXHU3QjgwXHU1MzU1XHU5NUVFXHU5ODk4XHVGRjA4bGV2ZWw6IFwiYXV0b1wiXHVGRjA5KiogXHUyMTkyIFx1NzZGNFx1NjNBNVx1NjgwN1x1NTFDNlx1NTMxNlx1ODFFQVx1NTJBOFx1NTMxNlx1RkYwQ1x1OEZENFx1NTZERVx1NTNFRlx1NzZGNFx1NjNBNVx1ODQzRFx1NTczMFx1NzY4NFx1NEZFRVx1NTkwRFx1NTJBOFx1NEY1Q1x1RkYwQ1xuICogICBcdTUzQ0RcdTk5ODhcdTUzNzNcdTdFRDNcdTY3OUNcdUZGMENcdTRFMERcdTUyQjNcdTcwRTZcdTRFQkFcdTVERTVcdTMwMDJcbiAqIC0gKipcdTU5MERcdTY3NDJcdTk1RUVcdTk4OThcdUZGMDhsZXZlbDogXCJndWlkZVwiXHVGRjA5KiogXHUyMTkyIFx1OEJDNlx1NTIyQlx1OTVFRVx1OTg5OFx1N0M3Qlx1NTc4Qlx1NTQwRVx1RkYwQ1x1NjNBOFx1ODM1MFx1NUJGOVx1NUU5NFx1NzY4NFx1NkEyMVx1NTc1NyBza2lsbCAvXG4gKiAgIFx1NUYwMFx1NkU5MFx1OTg3OVx1NzZFRSAvIFx1ODlFM1x1NTFCM1x1NjAxRFx1OERFRlx1RkYwQ1x1NjI4QVx1MzAwQ1x1NkNBMVx1NUY4MFx1OEZEOVx1OTFDQ1x1NjBGM1x1MzAwRFx1NzY4NFx1NTZGMFx1NTg4M1x1NzBCOVx1NzgzNFx1MzAwMlxuICpcbiAqIFx1NTE3M1x1OTUyRVx1OEJCRVx1OEJBMSBcdTIwMTRcdTIwMTQgKipcdTkxQ0RcdTU5MERcdTk1MTlcdThCRUZcdTRFOENcdTZCMjFcdTg5RTZcdTUzRDFcdUZGMDhyZXBlYXQtdHJpZ2dlclx1RkYwOSoqXHVGRjFBXG4gKiBcdTRFM0FcdTkwN0ZcdTUxNERcdTZCQ0ZcdTZCMjFcdTkwRkRcdTYyNTNcdTYyNzBcdUZGMENcdTU0MENcdTRFMDBcdTdDN0JcdTk1MTlcdThCRUZcdUZGMDhcdTc1MjgqKlx1OTUxOVx1OEJFRlx1NjMwN1x1N0VCOSoqXHU1RjUyXHU0RTAwXHU1MzE2XHU4QkM2XHU1MjJCXHVGRjA5KipcdTUxRkFcdTczQjAgMiBcdTZCMjEqKlx1NjI0RFx1ODlFNlx1NTNEMVxuICogXHU1MzM5XHU5MTREXHU2NzNBXHU1MjM2IFx1MjAxNFx1MjAxNFx1MzAwQ1x1NEUwRFx1NTkxQVx1NEY1OVx1RkYwQ1x1NEU1Rlx1NEUwRFx1NTZGMFx1NTg4M1x1MzAwRFx1RkYxQVxuICogLSBcdTdCMkMgMSBcdTZCMjFcdUZGMUFcdTRFQzVcdTk3NTlcdTlFRDhcdThCQjBcdTVGNTVcdUZGMDhcdThCQTFcdTY1NzBcdUZGMDlcdUZGMENcdTRFMERcdTRFM0JcdTUyQThcdTVGMzlcdTUxRkFcdTY1QjlcdTY4NDhcdUZGMENcdTkwN0ZcdTUxNERcdTU2NkFcdTk3RjNcdUZGMUJcbiAqIC0gXHU3QjJDIDIgXHU2QjIxXHVGRjFBXHU4OUU2XHU1M0QxXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU2M0E4XHU4MzUwXHVGRjA4YXV0byBcdTc2RjRcdTYzQTVcdTYyNjdcdTg4NEMgLyBndWlkZSBcdTYzQThcdTgzNTBcdTYwMURcdThERUZcdUZGMDlcdTMwMDJcbiAqXG4gKiBcdTUxODVcdTdGNkUgcGxheWJvb2sgXHU4OTg2XHU3NkQ2XHU1RTM4XHU4OUMxXHU3Njg0XHU2RDRGXHU4OUM4XHU1NjY4L1x1NTI0RFx1N0FFRlx1OEMwM1x1OEJENVx1OTVFRVx1OTg5OFx1RkYwOFx1N0Y1MVx1N0VEQ1x1MzAwMVx1NjNBN1x1NTIzNlx1NTNGMFx1MzAwMUpTIFx1NUYwMlx1NUUzOFx1MzAwMURPTSBcdTVCOUFcdTRGNERcdTMwMDFcbiAqIFx1NjAyN1x1ODBGRFx1MzAwMVx1OERFOFx1NTdERlx1N0I0OVx1RkYwOVx1RkYwQ1x1NUU3Nlx1NEUwRVx1OTg3OVx1NzZFRVx1ODFFQVx1OEVBQlx1NzdFNVx1OEJDNlx1NUU5M1x1RkYwOGJ1aWxkS25vd2xlZGdlQ29udGV4dFx1RkYwOVx1NEU5Mlx1ODg2NVx1MzAwMlxuICovXG5pbXBvcnQgZnMgZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJub2RlOnBhdGhcIjtcblxuLyoqIFx1OTVFRVx1OTg5OFx1NEUyNVx1OTFDRFx1N0VBN1x1NTIyQiAqL1xuZXhwb3J0IHR5cGUgU29sdXRpb25MZXZlbCA9IFwiYXV0b1wiIHwgXCJndWlkZVwiO1xuXG4vKiogXHU0RTAwXHU2NzYxXHU1MTg1XHU3RjZFXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4ICovXG5leHBvcnQgaW50ZXJmYWNlIFNvbHV0aW9uRW50cnkge1xuICAvKiogXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU2ODA3XHU4QkM2XHVGRjA4XHU3NTI4XHU0RThFXHU1M0JCXHU5MUNEIC8gXHU1RjE1XHU3NTI4XHVGRjA5ICovXG4gIGlkOiBzdHJpbmc7XG4gIC8qKiBcdTUzMzlcdTkxNERcdTUyMzBcdTc2ODRcdTk1MTlcdThCRUZcdTYzMDdcdTdFQjkgKi9cbiAgZmluZ2VycHJpbnQ6IHN0cmluZztcbiAgLyoqIFx1OTVFRVx1OTg5OFx1NEUwMFx1NTNFNVx1OEJERFx1NjNDRlx1OEZGMCAqL1xuICB0aXRsZTogc3RyaW5nO1xuICAvKiogXHU5NUVFXHU5ODk4XHU3Njg0XHU2QjYzXHU1MjE5XHU1MzM5XHU5MTREXHU2QTIxXHU1RjBGXHVGRjA4XHU1QkY5XHU1MzlGXHU1OUNCXHU5NTE5XHU4QkVGL1x1OEJDQVx1NjVBRFx1NjU4N1x1NjcyQ1x1NTMzOVx1OTE0RFx1RkYwOSAqL1xuICBwYXR0ZXJuOiBSZWdFeHA7XG4gIC8qKiBcdTY1QjlcdTY4NDhcdTdFQTdcdTUyMkJcdUZGMUFhdXRvPVx1NjgwN1x1NTFDNlx1NTMxNlx1ODFFQVx1NTJBOFx1NTMxNlx1NzZGNFx1NjNBNVx1NjI2N1x1ODg0Q1x1RkYxQmd1aWRlPVx1NjNBOFx1ODM1MFx1NjAxRFx1OERFRi9za2lsbC9cdTVGMDBcdTZFOTBcdTk4NzlcdTc2RUUgKi9cbiAgbGV2ZWw6IFNvbHV0aW9uTGV2ZWw7XG4gIC8qKiBcdTg5RTNcdTUxQjNcdTY1QjlcdTY4NDhcdTZCNjNcdTY1ODdcdUZGMDhhdXRvIFx1NjVGNlx1NEUzQVx1NTNFRlx1NjI2N1x1ODg0Q1x1NkI2NVx1OUFBNFx1RkYwQ2d1aWRlIFx1NjVGNlx1NEUzQVx1NjAxRFx1OERFRi9cdTk4NzlcdTc2RUVcdUZGMDkgKi9cbiAgc29sdXRpb246IHN0cmluZztcbiAgLyoqIFx1NUY1MyBsZXZlbD1ndWlkZSBcdTY1RjZcdTYzQThcdTgzNTBcdTc2ODRcdTUxNzdcdTRGNTNcdTg0M0RcdTU3MzBcdTY1QjlcdTVGMEYgKi9cbiAgc2tpbGw/OiBzdHJpbmc7XG4gIC8qKiBcdTVGNTMgbGV2ZWw9Z3VpZGUgXHU2NUY2XHU2M0E4XHU4MzUwXHU3Njg0XHU2QTIxXHU1NzU3IC8gXHU1RjAwXHU2RTkwXHU5ODc5XHU3NkVFICovXG4gIG9wZW5Tb3VyY2U/OiBzdHJpbmc7XG4gIC8qKiBcdTg5RTZcdTUzRDFcdTk2MDhcdTUwM0NcdUZGMUFcdTU0MENcdTYzMDdcdTdFQjlcdTUxRkFcdTczQjBcdTUxRTBcdTZCMjFcdTU0MEVcdTYzQThcdTgzNTBcdUZGMDhcdTlFRDhcdThCQTQgMlx1RkYwOSAqL1xuICB0cmlnZ2VyQWZ0ZXI/OiBudW1iZXI7XG4gIC8qKiBcdTUxNzNcdTk1MkVcdThCQ0RcdUZGMUFcdTc1MjhcdTRFOEUgZmluZ2VycHJpbnQgXHU1MjI0XHU1QjlBXHU0RTRCXHU1OTE2XHU3Njg0XHU4Rjg1XHU1MkE5XHU1MzM5XHU5MTREICovXG4gIGtleXdvcmRzPzogc3RyaW5nW107XG4gIC8qKiBcdTY1QjlcdTY4NDhcdTY3NjVcdTZFOTBcdTY4MDdcdTZDRThcdUZGMDhcdTlFRDhcdThCQTQgc29sdXRpb25zLXJlcG9cdUZGMUJcdTUzRUZcdTc1MjhcdTRFOEVcdTc3RTVcdThCQzZcdTRFMEFcdTRFMEJcdTY1ODdcdTZFQUZcdTZFOTBcdUZGMDkgKi9cbiAgc291cmNlPzogc3RyaW5nO1xufVxuXG4vKiogXHU1MzM5XHU5MTREXHU3RUQzXHU2NzlDICovXG5leHBvcnQgaW50ZXJmYWNlIFNvbHV0aW9uTWF0Y2gge1xuICAvKiogXHU2NjJGXHU1NDI2XHU4OUU2XHU1M0QxXHU2M0E4XHU4MzUwICovXG4gIHRyaWdnZXJlZDogYm9vbGVhbjtcbiAgLyoqIFx1OTUxOVx1OEJFRlx1NjMwN1x1N0VCOSAqL1xuICBmaW5nZXJwcmludDogc3RyaW5nO1xuICAvKiogXHU1REYyXHU1MUZBXHU3M0IwXHU2QjIxXHU2NTcwICovXG4gIG9jY3VycmVuY2VzOiBudW1iZXI7XG4gIC8qKiBcdTU0N0RcdTRFMkRcdTc2ODRcdTY1QjlcdTY4NDhcdUZGMDh0cmlnZ2VyZWQ9dHJ1ZSBcdTY1RjZcdTVCNThcdTU3MjhcdUZGMDkgKi9cbiAgZW50cnk/OiBTb2x1dGlvbkVudHJ5O1xuICAvKiogXHU1NDdEXHU0RTJEXHU3Njg0XHU2NUI5XHU2ODQ4XHU2NTg3XHU2NzJDXHVGRjA4XHU0RjlCXHU2Q0U4XHU1MTY1XHU4QzAzXHU4QkQ1XHU0RTBBXHU0RTBCXHU2NTg3IC8gXHU1M0NEXHU5OTg4XHVGRjA5ICovXG4gIGFkdmljZT86IHN0cmluZztcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NURGMlx1NUMxRFx1OEJENVx1ODFFQVx1NTJBOFx1NEZFRVx1NTkwRFx1RkYwOGF1dG8gXHU3RUE3XHU1MjJCXHVGRjA5ICovXG4gIGF1dG9BcHBsaWVkPzogYm9vbGVhbjtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBcdTUxODVcdTdGNkVcdTg5RTNcdTUxQjNcdTY1QjlcdTY4NDhcdTc3RTVcdThCQzZcdTVFOTNcdUZGMDhwbGF5Ym9va1x1RkYwOVxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4vKipcbiAqIFx1NTE4NVx1N0Y2RSBwbGF5Ym9va1x1RkYxQVx1NjI4QVx1NUUzOFx1ODlDMVx1NTI0RFx1N0FFRi9cdTZENEZcdTg5QzhcdTU2NjhcdThDMDNcdThCRDVcdTk1RUVcdTk4OThcdTY2MjBcdTVDMDRcdTUyMzBcdTg5RTNcdTUxQjNcdTY1QjlcdTY4NDhcdTMwMDJcbiAqIFx1OEZEOVx1NjYyRlx1MzAwQ1x1NEUwRFx1OTc2MFx1ODhGOFx1NURFNVx1NTE3N1x1MzAwRFx1NzY4NFx1NzdFNVx1OEJDNlx1NkM4OVx1NkRDMCBcdTIwMTRcdTIwMTQgXHU1Rjg4XHU1OTFBXHU5NUVFXHU5ODk4XHU1MTc2XHU1QjlFXHU2NzA5XHU2MjEwXHU3MTlGXHU4OUUzXHVGRjBDXHU1M0VBXHU2NjJGXHU1RjAwXHU1M0QxXHU2NUY2XHU2Q0ExXHU1RjgwXHU4RkQ5XHU5MUNDXHU2MEYzXHUzMDAyXG4gKi9cbmV4cG9ydCBjb25zdCBTT0xVVElPTl9QTEFZQk9PSzogU29sdXRpb25FbnRyeVtdID0gW1xuICB7XG4gICAgaWQ6IFwibmV0LTQwNC01MDBcIixcbiAgICBmaW5nZXJwcmludDogXCJuZXR3b3JrOmh0dHAtZXJyb3JcIixcbiAgICB0aXRsZTogXCJcdThENDRcdTZFOTAvXHU2M0E1XHU1M0UzXHU4QkY3XHU2QzQyXHU1OTMxXHU4RDI1XHVGRjA4NDA0LzUwMFx1RkYwOVwiLFxuICAgIHBhdHRlcm46IC8oPzpcdTdGNTFcdTdFRENcdTVCNThcdTU3MjggXFxkKyBcdTRFMkFcdTU5MzFcdThEMjVcdThCRjdcdTZDNDJ8XHU4QkY3XHU2QzQyXHU1OTMxXHU4RDI1fHN0YXR1cyAoPzo0MDR8NTAwKXw0MDR8NTAwKS9pLFxuICAgIGxldmVsOiBcImF1dG9cIixcbiAgICBzb2x1dGlvbjpcbiAgICAgIFwiXHU2ODA3XHU1MUM2XHU1MzE2XHU2ODIxXHU5QThDXHVGRjFBXHUyNDYwIFx1OTAxMFx1NEUyQVx1NjgzOFx1NUJGOVx1NTkzMVx1OEQyNSBVUkwgXHU3Njg0XHU4REVGXHU1Rjg0XHU0RTBFXHU1NDBFXHU3QUVGXHU2NjJGXHU1NDI2XHU1QzMxXHU3RUVBXHVGRjFCXHUyNDYxIFx1ODJFNVx1NjYyRlx1NTI0RFx1N0FFRlx1OTc1OVx1NjAwMVx1OEQ0NFx1NkU5MFx1RkYwQ1x1NjhDMFx1NjdFNVx1NjI1M1x1NTMwNVx1OERFRlx1NUY4NCBiYXNlIFx1NjYyRlx1NTQyNlx1NkI2M1x1Nzg2RVx1RkYwOFZpdGUgYmFzZSAvIHdlYnBhY2sgcHVibGljUGF0aFx1RkYwOVx1RkYxQlx1MjQ2MiBcdTgyRTVcdTY2MkZcdTYzQTVcdTUzRTNcdUZGMENcdTY4QzBcdTY3RTVcdTY3MERcdTUyQTFcdTdBRUZcdTY2MkZcdTU0MjZcdTVERjJcdTU0MkZcdTUyQThcdTMwMDFcdThERUZcdTc1MzFcdTY2MkZcdTU0MjZcdTZDRThcdTUxOENcdTMwMDJcIixcbiAgICB0cmlnZ2VyQWZ0ZXI6IDIsXG4gICAga2V5d29yZHM6IFtcIjQwNFwiLCBcIjUwMFwiLCBcIlx1NTkzMVx1OEQyNVx1OEJGN1x1NkM0MlwiLCBcIlx1OEJGN1x1NkM0Mlx1NTkzMVx1OEQyNVwiXSxcbiAgfSxcbiAge1xuICAgIGlkOiBcIm5ldC1jb3JzXCIsXG4gICAgZmluZ2VycHJpbnQ6IFwibmV0d29yazpjb3JzXCIsXG4gICAgdGl0bGU6IFwiXHU4REU4XHU1N0RGXHVGRjA4Q09SU1x1RkYwOVx1ODhBQlx1OTYzQlx1NjVBRFwiLFxuICAgIHBhdHRlcm46IC8oPzpjb3JzfFx1OERFOFx1NTdERnxhY2Nlc3MtY29udHJvbHxubyAnYWNjZXNzLWNvbnRyb2wtYWxsb3ctb3JpZ2luJykvaSxcbiAgICBsZXZlbDogXCJndWlkZVwiLFxuICAgIHNvbHV0aW9uOlxuICAgICAgXCJDT1JTIFx1NjYyRlx1NUUzOFx1ODlDMVx1NTc1MVx1RkYxQVx1NTI0RFx1N0FFRlx1NzZGNFx1OEZERVx1NEUwRFx1NTQwQ1x1NkU5MFx1NTQwRVx1N0FFRlx1NEYxQVx1ODhBQlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NjJFNlx1NjIyQVx1MzAwMlx1NjNBOFx1ODM1MFx1NjVCOVx1Njg0OFx1RkYxQVx1NEY3Rlx1NzUyOFx1NjcyQ1x1NTczMFx1NEVFM1x1NzQwNi9cdTUzQ0RcdTU0MTFcdTRFRTNcdTc0MDZcdUZGMDh2aXRlIGRldiBzZXJ2ZXIgcHJveHkgLyBuZ2lueFx1RkYwOVx1NjI4QVx1OERFOFx1NTdERlx1NTNEOFx1NTQwQ1x1NkU5MFx1RkYxQlx1NTQwRVx1N0FFRlx1NTJBMCBDT1JTIFx1NTkzNFx1RkYwOEFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblx1RkYwOVx1MzAwMlwiLFxuICAgIHNraWxsOiBcImNuYi1waXBlbGluZVwiLFxuICAgIG9wZW5Tb3VyY2U6IFwidml0ZS1wcm94eSAvIG5naW54IC8gaHR0cC1wcm94eS1taWRkbGV3YXJlXCIsXG4gICAgdHJpZ2dlckFmdGVyOiAyLFxuICAgIGtleXdvcmRzOiBbXCJjb3JzXCIsIFwiXHU4REU4XHU1N0RGXCIsIFwiYWNjZXNzLWNvbnRyb2xcIl0sXG4gIH0sXG4gIHtcbiAgICBpZDogXCJjb25zb2xlLWpzLWV4Y2VwdGlvblwiLFxuICAgIGZpbmdlcnByaW50OiBcImNvbnNvbGU6anMtZXhjZXB0aW9uXCIsXG4gICAgdGl0bGU6IFwiXHU2M0E3XHU1MjM2XHU1M0YwIEpTIFx1NjcyQVx1NjM1NVx1ODNCN1x1NUYwMlx1NUUzOFwiLFxuICAgIHBhdHRlcm46IC8oPzpcdTk4NzVcdTk3NjJcdTYyOUJcdTUxRkFcdTRFODYgSlMgXHU2NzJBXHU2MzU1XHU4M0I3XHU1RjAyXHU1RTM4fFx1NjcyQVx1NjM1NVx1ODNCN1x1NzY4NHx1bmNhdWdodHxUeXBlRXJyb3J8UmVmZXJlbmNlRXJyb3IpL2ksXG4gICAgbGV2ZWw6IFwiYXV0b1wiLFxuICAgIHNvbHV0aW9uOlxuICAgICAgXCJcdTY4MDdcdTUxQzZcdTUzMTZcdTYzOTJcdTk2OUNcdUZGMUFcdTI0NjAgXHU1QzU1XHU1RjAwXHU1RjAyXHU1RTM4XHU1ODA2XHU2ODA4XHU1QjlBXHU0RjREIHRocm93IC8gXHU2NzJBXHU1QjlBXHU0RTQ5XHU1M0Q4XHU5MUNGIC8gXHU1RjAyXHU2QjY1XHU2NzJBIGNhdGNoXHVGRjFCXHUyNDYxIFx1NzUyOCBldmFsIFx1NTcyOFx1OTg3NVx1OTc2Mlx1NkNFOFx1NTE2NVx1NjhDMFx1NjdFNVx1NTE3M1x1OTUyRVx1NTNEOFx1OTFDRi9cdTVCRjlcdThDNjFcdTY2MkZcdTU0MjZcdTVCNThcdTU3MjhcdUZGMUJcdTI0NjIgXHU0RjE4XHU1MTQ4XHU0RkVFXHU1OTBEXHU2NzAwXHU0RTBBXHU1QzQyXHU2NzJBXHU2MzU1XHU4M0I3XHU1RjAyXHU1RTM4XHVGRjA4XHU5MDFBXHU1RTM4XHU3NTMxXHU1QjgzXHU1RjE1XHU1M0QxXHU4RkRFXHU1RTI2XHU2MkE1XHU5NTE5XHVGRjA5XHUzMDAyXCIsXG4gICAgdHJpZ2dlckFmdGVyOiAyLFxuICAgIGtleXdvcmRzOiBbXCJqcyBcdTVGMDJcdTVFMzhcIiwgXCJcdTY3MkFcdTYzNTVcdTgzQjdcIiwgXCJ1bmNhdWdodFwiLCBcInR5cGVlcnJvclwiXSxcbiAgfSxcbiAge1xuICAgIGlkOiBcImRvbS1sb2NhdG9yLWZhaWxlZFwiLFxuICAgIGZpbmdlcnByaW50OiBcImRvbTpsb2NhdG9yLWZhaWxlZFwiLFxuICAgIHRpdGxlOiBcIlx1NTE0M1x1N0QyMFx1NUI5QVx1NEY0RC9cdTcwQjlcdTUxRkJcdTU5MzFcdThEMjVcIixcbiAgICBwYXR0ZXJuOiAvKD86XHU2NzJBXHU2MjdFXHU1MjMwXHU1MTQzXHU3RDIwfFx1NjVFMFx1NkNENVx1NUI5QVx1NEY0RHxcdTVCOUFcdTRGNERcdTU5MzFcdThEMjV8XHU1QjlBXHU0RjRELipcdTU5MzFcdThEMjV8bm90IGZvdW5kfG5vIGVsZW1lbnR8ZWxlbWVudCBub3QgZm91bmR8XHU2MjdFXHU0RTBEXHU1MjMwKS9pLFxuICAgIGxldmVsOiBcImF1dG9cIixcbiAgICBzb2x1dGlvbjpcbiAgICAgIFwiXHU2ODA3XHU1MUM2XHU1MzE2XHU5MUNEXHU4QkQ1XHVGRjFBXHUyNDYwIFx1NjUzOVx1NzUyOFx1NjZGNFx1N0EzM1x1NUI5QVx1NzY4NFx1NUI5QVx1NEY0RFx1N0I1Nlx1NzU2NVx1RkYwOHJlZlx1MjE5MnNlbGVjdG9yXHUyMTkyc2VtYW50aWMgXHU5MDEwXHU3RUE3XHU5NjREXHU3RUE3XHVGRjA5XHVGRjFCXHUyNDYxIFx1NTE0M1x1N0QyMFx1NTNFRlx1ODBGRFx1NTcyOFx1NUYwMlx1NkI2NVx1NkUzMlx1NjdEM1x1NTQwRVx1NTFGQVx1NzNCMFx1RkYwQ1x1NTE0OCB3YWl0IFx1NTE4RFx1NjRDRFx1NEY1Q1x1RkYxQlx1MjQ2MiBcdTgyRTVcdTVGMzlcdTdBOTcvaWZyYW1lIFx1OTA2RVx1NjMyMVx1RkYwQ1x1NTE0OFx1NTIwN1x1NjM2MiBmcmFtZSBcdTYyMTZcdTUxNzNcdTk1RURcdTVGMzlcdTVDNDJcdTMwMDJcIixcbiAgICB0cmlnZ2VyQWZ0ZXI6IDIsXG4gICAga2V5d29yZHM6IFtcIlx1NjcyQVx1NjI3RVx1NTIzMFx1NTE0M1x1N0QyMFwiLCBcIlx1NjVFMFx1NkNENVx1NUI5QVx1NEY0RFx1NTE0M1x1N0QyMFwiLCBcIlx1NUI5QVx1NEY0RFx1NTkzMVx1OEQyNVwiLCBcImVsZW1lbnQgbm90IGZvdW5kXCJdLFxuICB9LFxuICB7XG4gICAgaWQ6IFwicGVyZi10dGZiLXNsb3dcIixcbiAgICBmaW5nZXJwcmludDogXCJwZXJmb3JtYW5jZTp0dGZiXCIsXG4gICAgdGl0bGU6IFwiXHU2M0E1XHU1M0UzXHU1NENEXHU1RTk0XHU2MTYyXHVGRjA4VFRGQiBcdTUwNEZcdTlBRDhcdUZGMDlcIixcbiAgICBwYXR0ZXJuOiAvKD86VFRGQiBcdTUwNEZcdTlBRDh8VFRGQi4qbXN8XHU2MTYyXHU4QkY3XHU2QzQyKS9pLFxuICAgIGxldmVsOiBcImd1aWRlXCIsXG4gICAgc29sdXRpb246XG4gICAgICBcIlx1NjAyN1x1ODBGRFx1NzRGNlx1OTg4OFx1NUUzOFx1ODlDMVx1ODlFM1x1RkYxQVx1MjQ2MCBcdTRGMThcdTUxNDhcdTYzOTJcdTY3RTVcdTY3MERcdTUyQTFcdTdBRUZcdTU5MDRcdTc0MDZcdUZGMDhcdTY1NzBcdTYzNkVcdTVFOTNcdTY3RTVcdThCRTJcdTMwMDFcdTU0MENcdTZCNjVcdTkwM0JcdThGOTFcdUZGMDlcdTRFMEVcdTdGNTFcdTdFRENcdTk0RkVcdThERUZcdUZGMUJcdTI0NjEgXHU1MkEwXHU3RjEzXHU1QjU4XHVGRjA4Q0ROIC8gXHU2NzBEXHU1MkExXHU3QUVGXHU3RjEzXHU1QjU4IC8gSFRUUCBcdTdGMTNcdTVCNThcdUZGMDlcdUZGMUJcdTI0NjIgXHU1NDA4XHU1RTc2XHU4QkY3XHU2QzQyXHUzMDAxXHU1MzhCXHU3RjI5XHU0RjUzXHU3OUVGXHUzMDAyXHU1M0VGXHU3NTI4IFBlcmZvcm1hbmNlIFx1OTc2Mlx1Njc3Ri9cdThCQ0FcdTY1QURcdTYyQTVcdTU0NEFcdTc2ODQgVFRGQiBcdTYyQzZcdTUyMDZcdTVCOUFcdTRGNERcdTY2MkZcdTdGNTFcdTdFRENcdThGRDhcdTY2MkZcdTY3MERcdTUyQTFcdTdBRUZcdTYxNjJcdTMwMDJcIixcbiAgICBza2lsbDogXCJjbmItcGlwZWxpbmVcIixcbiAgICBvcGVuU291cmNlOiBcInJlZGlzLWNhY2hlIC8gbmdpbngtY2FjaGUgLyB2aXRlLWJ1bmRsZS1hbmFseXplclwiLFxuICAgIHRyaWdnZXJBZnRlcjogMixcbiAgICBrZXl3b3JkczogW1widHRmYlwiLCBcIlx1NjE2Mlx1OEJGN1x1NkM0MlwiLCBcIlx1NjAyN1x1ODBGRFwiXSxcbiAgfSxcbiAge1xuICAgIGlkOiBcImRvbS1zc3ItaHlkcmF0aW9uXCIsXG4gICAgZmluZ2VycHJpbnQ6IFwiZG9tOmh5ZHJhdGlvbi1taXNtYXRjaFwiLFxuICAgIHRpdGxlOiBcIlNTUiBcdTZDMzRcdTU0MDhcdTRFMERcdTRFMDBcdTgxRjRcdUZGMDhoeWRyYXRpb24gbWlzbWF0Y2hcdUZGMDlcIixcbiAgICBwYXR0ZXJuOiAvKD86aHlkcmF0aW9ufFx1NkMzNFx1NTQwOHxzZXJ2ZXItcmVuZGVyZWQgY29udGVudHxkaWQgbm90IG1hdGNoKS9pLFxuICAgIGxldmVsOiBcImd1aWRlXCIsXG4gICAgc29sdXRpb246XG4gICAgICBcIlNTUiBcdTZDMzRcdTU0MDhcdTRFMERcdTRFMDBcdTgxRjRcdTY2MkZcdTVFMzhcdTg5QzFcdTU3NTFcdUZGMDhcdTY3MERcdTUyQTFcdTdBRUZcdTZFMzJcdTY3RDMgRE9NIFx1NEUwRVx1NUJBMlx1NjIzN1x1N0FFRlx1OTk5Nlx1NkIyMVx1NkUzMlx1NjdEM1x1NEUwRFx1NEUwMFx1ODFGNFx1RkYwOVx1MzAwMlx1NjNBOFx1ODM1MFx1NjAxRFx1OERFRlx1RkYxQVx1MjQ2MCBcdTkwN0ZcdTUxNERcdTU3MjhcdTZFMzJcdTY3RDNcdTY3MUZcdTk1RjRcdTRGOURcdThENTZcdTZENEZcdTg5QzhcdTU2NjhcdTcyRUNcdTY3MDkgQVBJXHVGRjA4d2luZG93L2RvY3VtZW50XHVGRjA5XHVGRjFCXHUyNDYxIFx1NzUyOCBzdXBwcmVzc0h5ZHJhdGlvbldhcm5pbmcgXHU2MjE2XHU1QkEyXHU2MjM3XHU3QUVGXHU2MjREXHU2RTMyXHU2N0QzXHU3Njg0XHU3RUM0XHU0RUY2XHU5Njk0XHU3OUJCXHU1REVFXHU1RjAyXHVGRjFCXHUyNDYyIFx1NjM5Mlx1NjdFNSBkYXRlL3JhbmRvbS9sb2NhbGUgXHU3QjQ5XHU5NzVFXHU3ODZFXHU1QjlBXHU2MDI3XHU4RjkzXHU1MUZBXHUzMDAyXCIsXG4gICAgc2tpbGw6IFwiY25iLWRvY3NcIixcbiAgICBvcGVuU291cmNlOiBcInJlYWN0LWRvbSBoeWRyYXRpb24gLyBuZXh0LmpzIC8gbnV4dFwiLFxuICAgIHRyaWdnZXJBZnRlcjogMixcbiAgICBrZXl3b3JkczogW1wiaHlkcmF0aW9uXCIsIFwiXHU2QzM0XHU1NDA4XCIsIFwiZGlkIG5vdCBtYXRjaFwiXSxcbiAgfSxcbiAge1xuICAgIGlkOiBcImxvZ2luLWF1dGgtcmVkaXJlY3RcIixcbiAgICBmaW5nZXJwcmludDogXCJhdXRoOnJlZGlyZWN0XCIsXG4gICAgdGl0bGU6IFwiXHU3NjdCXHU1RjU1L1x1OTI3NFx1Njc0M1x1OERGM1x1OEY2Q1x1NUJGQ1x1ODFGNFx1NzZFRVx1NjgwN1x1OTg3NVx1NEUwRFx1NTNFRlx1OEZCRVwiLFxuICAgIHBhdHRlcm46IC8oPzpcdTc2N0JcdTVGNTV8cmVkaXJlY3R8XHU5MUNEXHU1QjlBXHU1NDExfDQwMXw0MDN8XHU5NzAwXHU4OTgxXHU3NjdCXHU1RjU1fFx1NjcyQVx1NjM4OFx1Njc0MykvaSxcbiAgICBsZXZlbDogXCJndWlkZVwiLFxuICAgIHNvbHV0aW9uOlxuICAgICAgXCJcdTc2N0JcdTVGNTVcdTYwMDEvXHU5Mjc0XHU2NzQzXHU2MkU2XHU2MjJBXHU2NjJGXHU5QUQ4XHU5ODkxXHU1MzlGXHU1NkUwXHVGRjFBXHU3NkVFXHU2ODA3XHU5ODc1XHU1RTM4XHU4OEFCXHU5MUNEXHU1QjlBXHU1NDExXHU1MjMwXHU3NjdCXHU1RjU1XHU5ODc1XHUzMDAyXHU2M0E4XHU4MzUwXHU2MDFEXHU4REVGXHVGRjFBXHUyNDYwIFx1NzUyOFx1OTg3OVx1NzZFRVx1NzdFNVx1OEJDNlx1NUU5M1x1RkYwOGJ1aWxkS25vd2xlZGdlQ29udGV4dFx1RkYwOVx1NkNFOFx1NTE2NVx1NkQ0Qlx1OEJENVx1OEQyNlx1NTNGNy9cdTUxODVcdTdGNTFcdTU3REZcdTU0MERcdTdFQTZcdTVCOUFcdUZGMUJcdTI0NjEgXHU1MTQ4XHU4RDcwXHU3NjdCXHU1RjU1XHU2RDQxXHU3QTBCXHU1MThEXHU1QkZDXHU4MjJBXHU3NkVFXHU2ODA3XHU5ODc1XHVGRjFCXHUyNDYyIFx1NjhDMFx1NjdFNVx1NjYyRlx1NTQyNlx1NTZFMCBDb29raWUvdG9rZW4gXHU3RjNBXHU1OTMxXHU4OEFCIDQwMS80MDMgXHU2MkU2XHU2MjJBXHUzMDAyXCIsXG4gICAgc2tpbGw6IFwiY25iLXJlcG8ta25vd2xlZGdlLWJhc2VcIixcbiAgICBvcGVuU291cmNlOiBcInBsYXl3cmlnaHQgc3RvcmFnZVN0YXRlIC8gYXV0aCBmaXh0dXJlXCIsXG4gICAgdHJpZ2dlckFmdGVyOiAyLFxuICAgIGtleXdvcmRzOiBbXCJcdTc2N0JcdTVGNTVcIiwgXCJcdTkyNzRcdTY3NDNcIiwgXCI0MDFcIiwgXCI0MDNcIiwgXCJcdTkxQ0RcdTVCOUFcdTU0MTFcIl0sXG4gIH0sXG4gIHtcbiAgICBpZDogXCJibGFuay13aGl0ZS1wYWdlXCIsXG4gICAgZmluZ2VycHJpbnQ6IFwiZG9tOmJsYW5rLXBhZ2VcIixcbiAgICB0aXRsZTogXCJcdTk4NzVcdTk3NjJcdTdBN0FcdTc2N0QvXHU2NzJBXHU2RTMyXHU2N0QzXCIsXG4gICAgcGF0dGVybjogLyg/Olx1N0E3QVx1NzY3RHxcdTc2N0RcdTVDNEZ8Ymxhbmt8bm90aGluZ3xcdTdBN0FcdTk4NzVcdTk3NjJ8XHU2NzJBXHU2RTMyXHU2N0QzKS9pLFxuICAgIGxldmVsOiBcImF1dG9cIixcbiAgICBzb2x1dGlvbjpcbiAgICAgIFwiXHU2ODA3XHU1MUM2XHU1MzE2XHU2MzkyXHU2N0U1XHU3NjdEXHU1QzRGXHVGRjFBXHUyNDYwIFx1NzcwQlx1NjNBN1x1NTIzNlx1NTNGMFx1NjYyRlx1NTQyNiBKUyBcdTYyQTVcdTk1MTlcdTVCRkNcdTgxRjRcdTY1NzRcdTY4MTFcdTY3MkFcdTZFMzJcdTY3RDNcdUZGMDhcdTVFMzhcdTg5QzFcdTRFOEVcdTY3MkEgY2F0Y2ggXHU3Njg0XHU1MjFEXHU1OUNCXHU1MzE2XHU1RjAyXHU1RTM4XHVGRjA5XHVGRjFCXHUyNDYxIFx1NjhDMFx1NjdFNVx1OEQ0NFx1NkU5MFx1NjYyRlx1NTQyNlx1ODhBQlx1NjJFNlx1NjIyQVx1RkYwOENTUC9cdTUyQTBcdThGN0RcdTU5MzFcdThEMjVcdUZGMDlcdUZGMUJcdTI0NjIgXHU3ODZFXHU4QkE0XHU2MzAyXHU4RjdEXHU4MjgyXHU3MEI5XHU2NjJGXHU1NDI2XHU1QjU4XHU1NzI4XHUzMDAxXHU2ODQ2XHU2N0I2XHU2NjJGXHU1NDI2XHU2QjYzXHU1RTM4IGJvb3RzdHJhcFx1MzAwMlwiLFxuICAgIHRyaWdnZXJBZnRlcjogMixcbiAgICBrZXl3b3JkczogW1wiXHU3NjdEXHU1QzRGXCIsIFwiXHU3QTdBXHU3NjdEXCIsIFwiYmxhbmtcIl0sXG4gIH0sXG5dO1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFx1OTUxOVx1OEJFRlx1NjMwN1x1N0VCOVx1RkYwOGZpbmdlcnByaW50XHVGRjA5XHU1RjUyXHU0RTAwXHU1MzE2XG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbi8qKlxuICogXHU0RUNFXHU5NTE5XHU4QkVGXHU2NTg3XHU2NzJDIC8gXHU4QkNBXHU2NUFEXHU2NDU4XHU4OTgxXHU1RjUyXHU0RTAwXHU1MzE2XHU0RTNBXHU3QTMzXHU1QjlBXHU3Njg0XHU5NTE5XHU4QkVGXHU2MzA3XHU3RUI5XHUzMDAyXG4gKiBcdTYzMDdcdTdFQjlcdTc1MjhcdTRFOEVcdTMwMENcdTU0MENcdTdDN0JcdTk1MTlcdThCRUZcdThCQzZcdTUyMkJcdTMwMERcdTU0OENcdTMwMENcdTRFOENcdTZCMjFcdTg5RTZcdTUzRDFcdTUzQkJcdTkxQ0RcdTMwMERcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmdlcnByaW50RXJyb3IodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCF0ZXh0KSByZXR1cm4gXCJ1bmtub3duXCI7XG4gIGNvbnN0IHQgPSB0ZXh0LnRvTG93ZXJDYXNlKCk7XG4gIC8vIFx1N0Y1MVx1N0VEQ1x1OTUxOVx1OEJFRlx1RkYwOFx1NTE0OFx1NTIyNCBDT1JTL1x1OERFOFx1NTdERlx1RkYwQ1x1NTE4RFx1NTIyNCBIVFRQIFx1OTUxOVx1OEJFRlx1RkYxQlx1NkNFOFx1NjEwRlx1NjI4QSBUVEZCL1x1NjE2Mlx1OEJGN1x1NkM0Mlx1NjNEMFx1NTI0RFx1RkYwQ1x1OTA3Rlx1NTE0RCBcIjE1MDBtc1wiIFx1OTFDQ1x1NzY4NCA1MDAgXHU4QkVGXHU1MjI0XHU0RTNBIEhUVFAgXHU5NTE5XHU4QkVGXHVGRjA5XG4gIGlmICgvY29yc3xhY2Nlc3MtY29udHJvbHxcdThERThcdTU3REYvLnRlc3QodCkpIHJldHVybiBcIm5ldHdvcms6Y29yc1wiO1xuICAvLyBcdTYwMjdcdTgwRkRcdUZGMUFUVEZCIC8gXHU2MTYyXHU4QkY3XHU2QzQyXHVGRjA4XHU0RjE4XHU1MTQ4XHU0RThFIEhUVFAgXHU5NTE5XHU4QkVGXHU1MjI0XHU1QjlBXHVGRjBDXHU1NkUwXHU0RTNBXHU2NTcwXHU1MDNDXHU5MUNDXHU1M0VGXHU4MEZEXHU1NDJCIDUwMC80MDQgXHU2NTcwXHU1QjU3XHVGRjA5XG4gIGlmICgvdHRmYnxcdTYxNjJcdThCRjdcdTZDNDIvLnRlc3QodCkpIHJldHVybiBcInBlcmZvcm1hbmNlOnR0ZmJcIjtcbiAgLy8gXHU3RjUxXHU3RURDIEhUVFAgXHU5NTE5XHU4QkVGXHVGRjA4XHU0RUM1XHU1RjUzXHU2NjBFXHU3ODZFXHU1MUZBXHU3M0IwXHU1OTMxXHU4RDI1XHU4QkVEXHU0RTQ5XHU2MjE2XHU3MkI2XHU2MDAxXHU3ODAxXHVGRjBDXHU5MDdGXHU1MTREXHU4QkVGXHU1MjI0XHU2NTcwXHU1MDNDXHVGRjA5XG4gIGlmICgvXHU1OTMxXHU4RDI1XHU4QkY3XHU2QzQyfFx1OEJGN1x1NkM0Mlx1NTkzMVx1OEQyNXxyZXF1ZXN0IGZhaWxlZHxzdGF0dXNcXHMqWzpcXHNdKig/OjQwNHw1MDApLy50ZXN0KHQpKSByZXR1cm4gXCJuZXR3b3JrOmh0dHAtZXJyb3JcIjtcbiAgaWYgKC9cXGIoPzo0MDR8NTAwKVxcYi8udGVzdCh0KSAmJiAhL1xcZHs0LH0vLnRlc3QodCkpIHJldHVybiBcIm5ldHdvcms6aHR0cC1lcnJvclwiO1xuICAvLyBKUyBcdTVGMDJcdTVFMzhcbiAgaWYgKC91bmNhdWdodHxcdTY3MkFcdTYzNTVcdTgzQjd8dHlwZWVycm9yfHJlZmVyZW5jZWVycm9yfGpzIFx1NUYwMlx1NUUzOC8udGVzdCh0KSkgcmV0dXJuIFwiY29uc29sZTpqcy1leGNlcHRpb25cIjtcbiAgLy8gRE9NIFx1NUI5QVx1NEY0RFxuICBpZiAoL1x1NjcyQVx1NjI3RVx1NTIzMHxcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNER8XHU1QjlBXHU0RjREXHU1OTMxXHU4RDI1fFx1NUI5QVx1NEY0RC4qXHU1OTMxXHU4RDI1fGVsZW1lbnQgbm90IGZvdW5kfG5vIGVsZW1lbnR8bm90IGZvdW5kfFx1NjI3RVx1NEUwRFx1NTIzMC8udGVzdCh0KSkgcmV0dXJuIFwiZG9tOmxvY2F0b3ItZmFpbGVkXCI7XG4gIC8vIFx1OTI3NFx1Njc0M1xuICBpZiAoLzQwMXw0MDN8XHU3NjdCXHU1RjU1fFx1OTI3NFx1Njc0M3xcdTY3MkFcdTYzODhcdTY3NDN8cmVkaXJlY3R8XHU5MUNEXHU1QjlBXHU1NDExLy50ZXN0KHQpKSByZXR1cm4gXCJhdXRoOnJlZGlyZWN0XCI7XG4gIC8vIFx1NkMzNFx1NTQwOFxuICBpZiAoL2h5ZHJhdGlvbnxcdTZDMzRcdTU0MDh8ZGlkIG5vdCBtYXRjaC8udGVzdCh0KSkgcmV0dXJuIFwiZG9tOmh5ZHJhdGlvbi1taXNtYXRjaFwiO1xuICAvLyBcdTc2N0RcdTVDNEZcbiAgaWYgKC9cdTc2N0RcdTVDNEZ8XHU3QTdBXHU3NjdEfGJsYW5rfFx1NjcyQVx1NkUzMlx1NjdEMy8udGVzdCh0KSkgcmV0dXJuIFwiZG9tOmJsYW5rLXBhZ2VcIjtcbiAgLy8gXHU5MDFBXHU3NTI4XHU1OTMxXHU4RDI1XHVGRjA4XHU1MTVDXHU1RTk1XHVGRjBDXHU5NjREXHU0RjRFXHU4QkVGXHU2MkE1XHVGRjFBXHU4RkQ5XHU3QzdCXHU0RTBEXHU1RjNBXHU4OUU2XHU1M0QxXHVGRjA5XG4gIHJldHVybiBcImdlbmVyaWM6YWN0aW9uLWZhaWxlZFwiO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFx1OTFDRFx1NTkwRFx1OTUxOVx1OEJFRlx1NkNFOFx1NTE4Q1x1ODg2OFx1RkYwOFx1NEU4Q1x1NkIyMVx1ODlFNlx1NTNEMVx1RkYwOVxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4vKipcbiAqIFx1OTFDRFx1NTkwRFx1OTUxOVx1OEJFRlx1NkNFOFx1NTE4Q1x1ODg2OFx1RkYxQVx1OEJCMFx1NUY1NVx1NkJDRlx1NEUyQVx1OTUxOVx1OEJFRlx1NjMwN1x1N0VCOVx1NzY4NFx1NTFGQVx1NzNCMFx1NkIyMVx1NjU3MFx1MzAwMlxuICogXHU1M0VBXHU2NzA5XHU1RjUzXHU2N0QwXHU2MzA3XHU3RUI5XHU1MUZBXHU3M0IwXHU2QjIxXHU2NTcwXHU4RkJFXHU1MjMwIGB0cmlnZ2VyQWZ0ZXJgXHVGRjA4XHU5RUQ4XHU4QkE0IDJcdUZGMDlcdTY1RjZcdTYyNERcdTg5RTZcdTUzRDFcdTg5RTNcdTUxQjNcdTY1QjlcdTY4NDhcdTYzQThcdTgzNTBcdUZGMENcbiAqIFx1NUI5RVx1NzNCMFx1MzAwQ1x1NEUwRFx1NTkxQVx1NEY1OVx1RkYwQ1x1NEU1Rlx1NEUwRFx1NTZGMFx1NTg4M1x1MzAwRFx1MjAxNFx1MjAxNFx1N0IyQyAxIFx1NkIyMVx1OTc1OVx1OUVEOFx1RkYwQ1x1N0IyQyAyIFx1NkIyMVx1NjI0RFx1N0VEOVx1NTFGQVx1NjcwOVx1NEVGN1x1NTAzQ1x1NzY4NFx1NjVCOVx1Njg0OFx1MzAwMlxuICovXG5leHBvcnQgY2xhc3MgUmVwZWF0RXJyb3JSZWdpc3RyeSB7XG4gIHByaXZhdGUgY291bnRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgLyoqIFx1ODFFQVx1NUI5QVx1NEU0OVx1ODlFNlx1NTNEMVx1OTYwOFx1NTAzQ1x1RkYwOFx1OUVEOFx1OEJBNCAyXHVGRjA5ICovXG4gIHByaXZhdGUgdGhyZXNob2xkOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IodGhyZXNob2xkID0gMikge1xuICAgIHRoaXMudGhyZXNob2xkID0gdGhyZXNob2xkO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1NEUwMFx1NkIyMVx1OTUxOVx1OEJFRlx1RkYwQ1x1OEZENFx1NTZERVx1NjYyRlx1NTQyNlx1OEZCRVx1NTIzMFx1ODlFNlx1NTNEMVx1OTYwOFx1NTAzQyAqL1xuICByZWNvcmQodGV4dDogc3RyaW5nKTogeyBmaW5nZXJwcmludDogc3RyaW5nOyBvY2N1cnJlbmNlczogbnVtYmVyOyB0cmlnZ2VyZWQ6IGJvb2xlYW4gfSB7XG4gICAgY29uc3QgZnAgPSBmaW5nZXJwcmludEVycm9yKHRleHQpO1xuICAgIGNvbnN0IG9jY3VycmVuY2VzID0gKHRoaXMuY291bnRzLmdldChmcCkgPz8gMCkgKyAxO1xuICAgIHRoaXMuY291bnRzLnNldChmcCwgb2NjdXJyZW5jZXMpO1xuICAgIHJldHVybiB7IGZpbmdlcnByaW50OiBmcCwgb2NjdXJyZW5jZXMsIHRyaWdnZXJlZDogb2NjdXJyZW5jZXMgPj0gdGhpcy50aHJlc2hvbGQgfTtcbiAgfVxuXG4gIC8qKiBcdTY3RTVcdThCRTJcdTY3RDBcdTYzMDdcdTdFQjlcdTVGNTNcdTUyNERcdTZCMjFcdTY1NzBcdUZGMDhcdTRFMERcdTY1MzlcdTUzRDhcdThCQTFcdTY1NzBcdUZGMDkgKi9cbiAgcGVlayh0ZXh0OiBzdHJpbmcpOiB7IGZpbmdlcnByaW50OiBzdHJpbmc7IG9jY3VycmVuY2VzOiBudW1iZXIgfSB7XG4gICAgY29uc3QgZnAgPSBmaW5nZXJwcmludEVycm9yKHRleHQpO1xuICAgIHJldHVybiB7IGZpbmdlcnByaW50OiBmcCwgb2NjdXJyZW5jZXM6IHRoaXMuY291bnRzLmdldChmcCkgPz8gMCB9O1xuICB9XG5cbiAgLyoqIFx1OTFDRFx1N0Y2RVx1RkYwOFx1NjVCMFx1NEUwMFx1OEY2RVx1OEMwM1x1OEJENVx1NUYwMFx1NTlDQlx1NjVGNlx1NTNFRlx1OEMwM1x1NzUyOFx1RkYwOSAqL1xuICByZXNldCgpOiB2b2lkIHtcbiAgICB0aGlzLmNvdW50cy5jbGVhcigpO1xuICB9XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU1MzM5XHU5MTREXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbi8qKlxuICogXHU1NzI4IHBsYXlib29rIFx1NEUyRFx1NjdFNVx1NjI3RVx1NEUwRVx1OTUxOVx1OEJFRlx1NjU4N1x1NjcyQ1x1NTMzOVx1OTE0RFx1NzY4NFx1NjVCOVx1Njg0OFx1Njc2MVx1NzZFRVx1MzAwMlxuICogXHU0RjE4XHU1MTQ4XHU3Q0JFXHU3ODZFXHU1MzM5XHU5MTREIGZpbmdlcnByaW50XHVGRjBDXHU1MTc2XHU2QjIxXHU3NTI4IHBhdHRlcm4va2V5d29yZHMgXHU1MTVDXHU1RTk1XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb29rdXBTb2x1dGlvbih0ZXh0OiBzdHJpbmcsIGZpbmdlcnByaW50Pzogc3RyaW5nKTogU29sdXRpb25FbnRyeSB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGZwID0gZmluZ2VycHJpbnQgPz8gZmluZ2VycHJpbnRFcnJvcih0ZXh0KTtcbiAgY29uc3QgdCA9IHRleHQudG9Mb3dlckNhc2UoKTtcblxuICAvLyAxLiBmaW5nZXJwcmludCBcdTdDQkVcdTc4NkVcdTU0N0RcdTRFMkRcbiAgY29uc3QgYnlGcCA9IFNPTFVUSU9OX1BMQVlCT09LLmZpbmQoKHMpID0+IHMuZmluZ2VycHJpbnQgPT09IGZwKTtcbiAgaWYgKGJ5RnApIHJldHVybiBieUZwO1xuXG4gIC8vIDIuIFx1NkI2M1x1NTIxOSBwYXR0ZXJuIFx1NTQ3RFx1NEUyRFxuICBjb25zdCBieVBhdHRlcm4gPSBTT0xVVElPTl9QTEFZQk9PSy5maW5kKChzKSA9PiBzLnBhdHRlcm4udGVzdCh0ZXh0KSk7XG4gIGlmIChieVBhdHRlcm4pIHJldHVybiBieVBhdHRlcm47XG5cbiAgLy8gMy4gXHU1MTczXHU5NTJFXHU4QkNEXHU1MTVDXHU1RTk1XG4gIGNvbnN0IGJ5S2V5d29yZCA9IFNPTFVUSU9OX1BMQVlCT09LLmZpbmQoXG4gICAgKHMpID0+IHMua2V5d29yZHMgJiYgcy5rZXl3b3Jkcy5zb21lKChrKSA9PiB0LmluY2x1ZGVzKGsudG9Mb3dlckNhc2UoKSkpXG4gICk7XG4gIHJldHVybiBieUtleXdvcmQ7XG59XG5cbi8qKlxuICogXHU2ODM4XHU1RkMzXHU1MzM5XHU5MTREXHU1MTY1XHU1M0UzXHVGRjFBXG4gKiBcdTdFRDlcdTVCOUFcdTRFMDBcdTZCMjFcdTk1MTlcdThCRUZcdTY1ODdcdTY3MkNcdUZGMENcdTdFRDNcdTU0MDhcdTkxQ0RcdTU5MERcdTZDRThcdTUxOENcdTg4NjhcdTUwNUFcdTMwMENcdTRFOENcdTZCMjFcdTg5RTZcdTUzRDFcdTMwMERcdTUyMjRcdTVCOUFcdUZGMENcbiAqIFx1NTQ3RFx1NEUyRFx1NTIxOVx1OEZENFx1NTZERVx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1RkYwOFx1NTQyQiBhdXRvL2d1aWRlIFx1NTIwNlx1N0VBN1x1NEUwRVx1NTNFRlx1NjI2N1x1ODg0Q1x1NUVGQVx1OEJBRVx1RkYwOVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hTb2x1dGlvbihyZWdpc3RyeTogUmVwZWF0RXJyb3JSZWdpc3RyeSwgZXJyb3JUZXh0OiBzdHJpbmcpOiBTb2x1dGlvbk1hdGNoIHtcbiAgY29uc3QgeyBmaW5nZXJwcmludCwgb2NjdXJyZW5jZXMsIHRyaWdnZXJlZCB9ID0gcmVnaXN0cnkucmVjb3JkKGVycm9yVGV4dCk7XG4gIGlmICghdHJpZ2dlcmVkKSB7XG4gICAgcmV0dXJuIHsgdHJpZ2dlcmVkOiBmYWxzZSwgZmluZ2VycHJpbnQsIG9jY3VycmVuY2VzIH07XG4gIH1cbiAgY29uc3QgZW50cnkgPSBsb29rdXBTb2x1dGlvbihlcnJvclRleHQsIGZpbmdlcnByaW50KTtcbiAgaWYgKCFlbnRyeSkge1xuICAgIHJldHVybiB7IHRyaWdnZXJlZDogdHJ1ZSwgZmluZ2VycHJpbnQsIG9jY3VycmVuY2VzIH07XG4gIH1cbiAgcmV0dXJuIHtcbiAgICB0cmlnZ2VyZWQ6IHRydWUsXG4gICAgZmluZ2VycHJpbnQsXG4gICAgb2NjdXJyZW5jZXMsXG4gICAgZW50cnksXG4gICAgYWR2aWNlOiByZW5kZXJBZHZpY2UoZW50cnkpLFxuICB9O1xufVxuXG4vKiogXHU2RTMyXHU2N0QzXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU2NTg3XHU2NzJDICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQWR2aWNlKGVudHJ5OiBTb2x1dGlvbkVudHJ5KTogc3RyaW5nIHtcbiAgY29uc3QgaGVhZCA9IGBbXHU1REYyXHU3QjJDIDIgXHU2QjIxXHU5MDQ3XHU1MjMwXHU1NDBDXHU3QzdCXHU5NUVFXHU5ODk4XHVGRjVDXHU2NUI5XHU2ODQ4XHU2M0E4XHU4MzUwXSAke2VudHJ5LnRpdGxlfVx1RkYwOFx1N0VBN1x1NTIyQjogJHtlbnRyeS5sZXZlbCA9PT0gXCJhdXRvXCIgPyBcIlx1ODFFQVx1NTJBOFx1NEZFRVx1NTkwRFwiIDogXCJcdTYwMURcdThERUZcdTVGMTVcdTVCRkNcIn1cdUZGMDlgO1xuICBjb25zdCBsaW5lcyA9IFtoZWFkLCBgPiAke2VudHJ5LnNvbHV0aW9ufWBdO1xuICBpZiAoZW50cnkubGV2ZWwgPT09IFwiZ3VpZGVcIikge1xuICAgIGlmIChlbnRyeS5za2lsbCkgbGluZXMucHVzaChgPiBcdTYzQThcdTgzNTAgc2tpbGxcdUZGMUEke2VudHJ5LnNraWxsfWApO1xuICAgIGlmIChlbnRyeS5vcGVuU291cmNlKSBsaW5lcy5wdXNoKGA+IFx1NjNBOFx1ODM1MFx1NjVCOVx1Njg0OC9cdTVGMDBcdTZFOTBcdTk4NzlcdTc2RUVcdUZGMUEke2VudHJ5Lm9wZW5Tb3VyY2V9YCk7XG4gICAgbGluZXMucHVzaChcIj4gXHU2MDFEXHU4REVGXHVGRjFBXHU1MTQ4XHU1QjlBXHU0RjREXHU2ODM5XHU1NkUwXHVGRjBDXHU1MThEXHU2MzA5XHU0RTBBXHU4RkYwXHU5ODc5XHU3NkVFL1x1NjI4MFx1ODBGRFx1ODQzRFx1NTczMFx1RkYwQ1x1NTNFRlx1NjYzRVx1ODQ1N1x1NTFDRlx1NUMxMVx1OTFDRFx1NTkwRFx1OTAyMFx1OEY2RVx1NUI1MFx1MzAwMlwiKTtcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cblxuLyoqIFx1OUVEOFx1OEJBNFx1NkNFOFx1NTE4Q1x1ODg2OFx1NUI5RVx1NEY4Qlx1RkYwOFx1NEY5Qlx1NjVFMFx1NzJCNlx1NjAwMVx1OEMwM1x1NzUyOFx1NTkwRFx1NzUyOFx1RkYwQ1x1NTNFRlx1NjMwOVx1NEYxQVx1OEJERCByZXNldFx1RkYwOSAqL1xuZXhwb3J0IGNvbnN0IGRlZmF1bHRSZWdpc3RyeSA9IG5ldyBSZXBlYXRFcnJvclJlZ2lzdHJ5KCk7XG5cbi8qKlxuICogXHU0RkJGXHU2Mzc3XHU1MUZEXHU2NTcwXHVGRjFBXHU2MjhBXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU2Q0U4XHU1MTY1XHU1MjMwXHU0RTAwXHU2NzYxXHU4QzAzXHU4QkQ1XHU0RTBBXHU0RTBCXHU2NTg3XHU5MUNDXHUzMDAyXG4gKiBcdTgyRTVcdTVERjJcdTg5RTZcdTUzRDFcdUZGMDhcdTdCMkMgMiBcdTZCMjFcdTU0MENcdTdDN0JcdTk1MTlcdThCRUZcdUZGMDlcdUZGMENcdThGRDRcdTU2REVcdTk2NDRcdTVFMjZcdTY1QjlcdTY4NDhcdTc2ODRcdTRFMEFcdTRFMEJcdTY1ODdcdUZGMUJcdTU0MjZcdTUyMTlcdThGRDRcdTU2REVcdTUzOUZcdTY1ODdcdTY3MkNcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRXaXRoU29sdXRpb24ocmVnaXN0cnk6IFJlcGVhdEVycm9yUmVnaXN0cnksIGNvbnRleHRUZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBtYXRjaCA9IG1hdGNoU29sdXRpb24ocmVnaXN0cnksIGNvbnRleHRUZXh0KTtcbiAgaWYgKG1hdGNoLnRyaWdnZXJlZCAmJiBtYXRjaC5hZHZpY2UpIHtcbiAgICByZXR1cm4gYCR7Y29udGV4dFRleHR9XFxuXFxuLS0tXFxuJHttYXRjaC5hZHZpY2V9YDtcbiAgfVxuICByZXR1cm4gY29udGV4dFRleHQ7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogXHU1M0VGXHU2MjEwXHU5NTdGXHU3Njg0XHU1NzI4XHU3RUJGXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU1RTkzXHVGRjA4U29sdXRpb24gUmVwb3NpdG9yeVx1RkYwOVxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4vKipcbiAqIFx1NjMwMVx1NEU0NVx1NTMxNlx1NjVCOVx1Njg0OFx1NUU5M1x1NjU4N1x1NEVGNlx1NjgzQ1x1NUYwRlx1RkYwOEpTT05cdUZGMDlcdTMwMDJcbiAqIHBhdHRlcm4gXHU1QjU3XHU2QkI1XHU1NzI4XHU3OEMxXHU3NkQ4XHU0RTBBXHU1QjU4XHU0RTNBXHU1QjU3XHU3QjI2XHU0RTMyXHVGRjBDXHU1MkEwXHU4RjdEXHU2NUY2IG5ldyBSZWdFeHAgXHU4RkQ4XHU1MzlGXHUzMDAyXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU29sdXRpb25SZXBvRmlsZSB7XG4gIC8qKiBcdTY1QjlcdTY4NDhcdTY3NjFcdTc2RUVcdUZGMDhcdTRFMERcdTU0MkIgcGF0dGVybiBcdTY1RTBcdTZDRDUgSlNPTiBcdTVFOEZcdTUyMTdcdTUzMTZcdTc2ODRcdTkwRThcdTUyMDZcdUZGMENcdTc1MjggcGF0dGVyblNvdXJjZSBcdTVCNTdcdTdCMjZcdTRFMzJcdTVCNThcdTUwQThcdUZGMDkgKi9cbiAgZW50cmllczogUGVyc2lzdGVkU29sdXRpb25bXTtcbiAgLyoqIFx1NUMxQVx1NjcyQVx1ODlFM1x1NTFCM1x1NzY4NFx1NjVCMFx1OTUxOVx1OEJFRlx1NjMwN1x1N0VCOVx1NTAxOVx1OTAwOVx1RkYwOFx1NEY5Qlx1NTQwRVx1N0VFRFx1NkM4OVx1NkRDMFx1NjVCOVx1Njg0OFx1RkYwQ1x1OTA3Rlx1NTE0RFx1OTFDRFx1NTkwRFx1OTAyMFx1OEY2RVx1NUI1MFx1RkYwOSAqL1xuICB1bmtub3duRXJyb3JzPzogc3RyaW5nW107XG4gIC8qKiBcdTUxNDNcdTRGRTFcdTYwNkYgKi9cbiAgbWV0YT86IHsgdXBkYXRlZEF0Pzogc3RyaW5nOyBzb3VyY2U/OiBzdHJpbmcgfTtcbn1cblxuLyoqIFx1NTNFRlx1NjMwMVx1NEU0NVx1NTMxNlx1NjVCOVx1Njg0OFx1Njc2MVx1NzZFRVx1RkYwOHBhdHRlcm4gXHU4RjZDXHU0RTNBXHU1QjU3XHU3QjI2XHU0RTMyXHVGRjA5ICovXG5leHBvcnQgaW50ZXJmYWNlIFBlcnNpc3RlZFNvbHV0aW9uIHtcbiAgaWQ6IHN0cmluZztcbiAgZmluZ2VycHJpbnQ6IHN0cmluZztcbiAgdGl0bGU6IHN0cmluZztcbiAgLyoqIFx1NkI2M1x1NTIxOVx1NkU5MFx1RkYwOFx1NUI1N1x1N0IyNlx1NEUzMlx1RkYwOSAqL1xuICBwYXR0ZXJuU291cmNlOiBzdHJpbmc7XG4gIGxldmVsOiBTb2x1dGlvbkxldmVsO1xuICBzb2x1dGlvbjogc3RyaW5nO1xuICBza2lsbD86IHN0cmluZztcbiAgb3BlblNvdXJjZT86IHN0cmluZztcbiAgdHJpZ2dlckFmdGVyPzogbnVtYmVyO1xuICBrZXl3b3Jkcz86IHN0cmluZ1tdO1xuICAvKiogXHU2NUI5XHU2ODQ4XHU2NzY1XHU2RTkwXHU2ODA3XHU2Q0U4ICovXG4gIHNvdXJjZT86IHN0cmluZztcbn1cblxuLyoqIFx1NjI4QVx1NTE4NVx1N0Y2RSBTb2x1dGlvbkVudHJ5IFx1OEY2Q1x1NEUzQVx1NTNFRlx1NjMwMVx1NEU0NVx1NTMxNlx1NUY2Mlx1NUYwRiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvUGVyc2lzdGVkKGVudHJ5OiBTb2x1dGlvbkVudHJ5KTogUGVyc2lzdGVkU29sdXRpb24ge1xuICByZXR1cm4ge1xuICAgIGlkOiBlbnRyeS5pZCxcbiAgICBmaW5nZXJwcmludDogZW50cnkuZmluZ2VycHJpbnQsXG4gICAgdGl0bGU6IGVudHJ5LnRpdGxlLFxuICAgIHBhdHRlcm5Tb3VyY2U6IGVudHJ5LnBhdHRlcm4uc291cmNlLFxuICAgIGxldmVsOiBlbnRyeS5sZXZlbCxcbiAgICBzb2x1dGlvbjogZW50cnkuc29sdXRpb24sXG4gICAgc2tpbGw6IGVudHJ5LnNraWxsLFxuICAgIG9wZW5Tb3VyY2U6IGVudHJ5Lm9wZW5Tb3VyY2UsXG4gICAgdHJpZ2dlckFmdGVyOiBlbnRyeS50cmlnZ2VyQWZ0ZXIsXG4gICAga2V5d29yZHM6IGVudHJ5LmtleXdvcmRzLFxuICAgIHNvdXJjZTogZW50cnkuc291cmNlLFxuICB9O1xufVxuXG4vKiogXHU2MjhBXHU2MzAxXHU0RTQ1XHU1MzE2XHU1RjYyXHU1RjBGXHU4RkQ4XHU1MzlGXHU0RTNBXHU4RkQwXHU4ODRDXHU2NUY2IFNvbHV0aW9uRW50cnkgKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tUGVyc2lzdGVkKHA6IFBlcnNpc3RlZFNvbHV0aW9uKTogU29sdXRpb25FbnRyeSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IHAuaWQsXG4gICAgZmluZ2VycHJpbnQ6IHAuZmluZ2VycHJpbnQsXG4gICAgdGl0bGU6IHAudGl0bGUsXG4gICAgcGF0dGVybjogbmV3IFJlZ0V4cChwLnBhdHRlcm5Tb3VyY2UsIFwiaVwiKSxcbiAgICBsZXZlbDogcC5sZXZlbCxcbiAgICBzb2x1dGlvbjogcC5zb2x1dGlvbixcbiAgICBza2lsbDogcC5za2lsbCxcbiAgICBvcGVuU291cmNlOiBwLm9wZW5Tb3VyY2UsXG4gICAgdHJpZ2dlckFmdGVyOiBwLnRyaWdnZXJBZnRlcixcbiAgICBrZXl3b3JkczogcC5rZXl3b3JkcyxcbiAgICBzb3VyY2U6IHAuc291cmNlLFxuICB9O1xufVxuXG4vKipcbiAqIFx1NTNFRlx1NjIxMFx1OTU3Rlx1NzY4NFx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1NEVEM1x1NUU5M1x1RkYxQVx1NTE4NVx1N0Y2RSBwbGF5Ym9vayArIFx1NzUyOFx1NjIzN1x1NkM4OVx1NkRDMFx1NzY4NFx1NjMwMVx1NEU0NVx1NTMxNlx1NjVCOVx1Njg0OFx1NUU5M1x1NTQwOFx1NUU3Nlx1NjdFNVx1OEJFMlx1MzAwMlxuICpcbiAqIFx1OEZEOVx1NjYyRlx1MzAwQ1x1NEUwRFx1NEY5RFx1OEQ1Nlx1NjhDMFx1N0QyMlx1MzAwMVx1NTNFRlx1NjMwMVx1N0VFRFx1NjIxMFx1OTU3Rlx1MzAwRFx1NzY4NFx1NTE3M1x1OTUyRVx1RkYxQVxuICogLSBcdTZCQ0ZcdTZCMjFcdTg5RTNcdTUxQjNcdTRFMDBcdTRFMkFcdTY1QjBcdTk1RUVcdTk4OThcdUZGMENcdThDMDNcdTc1MjggYGFkZFNvbHV0aW9uYCBcdTZDODlcdTZEQzBcdThGREJcdTVFOTNcdTY1ODdcdTRFRjZcdUZGMDhcdTRGNUNcdTRFM0FcdTMwMENcdTU3MjhcdTdFQkZcdTVFOTNcdTMwMERcdTUxNzFcdTRFQUJcdUZGMDlcdUZGMUJcbiAqIC0gXHU5MDQ3XHU1MjMwXHU2NzJBXHU1NDdEXHU0RTJEXHU3Njg0XHU2NUIwXHU5NTE5XHU4QkVGXHVGRjBDXHU4QkIwXHU1RjU1XHU1MjMwIGB1bmtub3duRXJyb3JzYFx1RkYwQ1x1NEY5Qlx1NTQwRVx1N0VFRFx1ODg2NVx1NTE0NVx1NjVCOVx1Njg0OFx1RkYxQlxuICogLSBcdTY1QjlcdTY4NDhcdTVFOTNcdTY1ODdcdTRFRjZcdTUzRUZcdTYzRDBcdTRFQTRcdThGREJcdTRFRDNcdTVFOTMgLyBcdTRGNUNcdTRFM0EgQ0kgXHU1MjM2XHU1NEMxXHU1QkZDXHU1MUZBXHVGRjBDXHU1QjlFXHU3M0IwXHUzMDBDXHU4RDhBXHU3NTI4XHU4RDhBXHU1OTI3XHUzMDAxXHU0RTBBXHU5NjUwXHU2MzAxXHU3RUVEXHU2M0QwXHU5QUQ4XHUzMDBEXHUzMDAyXG4gKi9cbmV4cG9ydCBjbGFzcyBTb2x1dGlvblJlcG9zaXRvcnkge1xuICAvKiogXHU1MTg1XHU3RjZFIHBsYXlib29rXHVGRjA4XHU1M0VBXHU4QkZCXHU1N0ZBXHU3RUJGXHVGRjA5ICovXG4gIHByaXZhdGUgYnVpbHRpbjogU29sdXRpb25FbnRyeVtdID0gU09MVVRJT05fUExBWUJPT0s7XG4gIC8qKiBcdTc1MjhcdTYyMzdcdTZDODlcdTZEQzBcdTc2ODRcdTY1QjlcdTY4NDhcdUZGMDhcdTYzMDFcdTRFNDVcdTUzMTZcdUZGMDkgKi9cbiAgcHJpdmF0ZSBjdXN0b206IFNvbHV0aW9uRW50cnlbXSA9IFtdO1xuICAvKiogXHU2NzJBXHU1NDdEXHU0RTJEXHU3Njg0XHU2NUIwXHU5NTE5XHU4QkVGXHU2MzA3XHU3RUI5XHVGRjA4XHU1MDE5XHU5MDA5XHU2Qzg5XHU2REMwXHVGRjA5ICovXG4gIHByaXZhdGUgdW5rbm93biA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAvKiogXHU1RTkzXHU2NTg3XHU0RUY2XHU4REVGXHU1Rjg0ICovXG4gIHByaXZhdGUgZmlsZVBhdGg/OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoZmlsZVBhdGg/OiBzdHJpbmcpIHtcbiAgICB0aGlzLmZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgaWYgKGZpbGVQYXRoKSB0aGlzLmxvYWQoZmlsZVBhdGgpO1xuICB9XG5cbiAgLyoqIFx1NTE2OFx1OTBFOFx1NjVCOVx1Njg0OFx1RkYwOFx1NTE4NVx1N0Y2RSArIFx1NkM4OVx1NkRDMFx1RkYwOSAqL1xuICBnZXQgZW50cmllcygpOiBTb2x1dGlvbkVudHJ5W10ge1xuICAgIHJldHVybiBbLi4udGhpcy5idWlsdGluLCAuLi50aGlzLmN1c3RvbV07XG4gIH1cblxuICAvKiogXHU0RUM1XHU3NTI4XHU2MjM3XHU2Qzg5XHU2REMwXHU3Njg0XHU2NUI5XHU2ODQ4XHVGRjA4XHU2MjEwXHU5NTdGXHU1RTkzXHU2NUIwXHU1ODlFXHU5MEU4XHU1MjA2XHVGRjA5ICovXG4gIGdldCBjdXN0b21FbnRyaWVzKCk6IFNvbHV0aW9uRW50cnlbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmN1c3RvbV07XG4gIH1cblxuICAvKiogXHU1MkEwXHU4RjdEXHU2MzAxXHU0RTQ1XHU1MzE2XHU2NUI5XHU2ODQ4XHU1RTkzXHU2NTg3XHU0RUY2XHVGRjA4XHU0RTBEXHU1QjU4XHU1NzI4XHU1MjE5XHU1RkZEXHU3NTY1XHVGRjA5ICovXG4gIGxvYWQoZmlsZVBhdGg6IHN0cmluZyk6IHZvaWQge1xuICAgIHRyeSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZVBhdGgpKSByZXR1cm47XG4gICAgICBjb25zdCByYXc6IFNvbHV0aW9uUmVwb0ZpbGUgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgXCJ1dGY4XCIpKTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHJhdy5lbnRyaWVzKSkge1xuICAgICAgICB0aGlzLmN1c3RvbSA9IHJhdy5lbnRyaWVzLm1hcChmcm9tUGVyc2lzdGVkKTtcbiAgICAgIH1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHJhdy51bmtub3duRXJyb3JzKSkge1xuICAgICAgICByYXcudW5rbm93bkVycm9ycy5mb3JFYWNoKCh1KSA9PiB0aGlzLnVua25vd24uYWRkKHUpKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFx1NUU5M1x1NjU4N1x1NEVGNlx1NjM1Rlx1NTc0Ri9cdTRFMERcdTUzRUZcdThCRkJcdTY1RjZcdTk3NTlcdTlFRDhcdTVGRkRcdTc1NjVcdUZGMENcdTRGRERcdTc1NTlcdTUxODVcdTdGNkVcdTU3RkFcdTdFQkZcbiAgICAgIHRoaXMuY3VzdG9tID0gW107XG4gICAgfVxuICB9XG5cbiAgLyoqIFx1NjMwMVx1NEU0NVx1NTMxNlx1NUY1M1x1NTI0RFx1NUU5M1x1NTIzMFx1NjU4N1x1NEVGNiAqL1xuICBwZXJzaXN0KGZpbGVQYXRoPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCB0YXJnZXQgPSBmaWxlUGF0aCA/PyB0aGlzLmZpbGVQYXRoO1xuICAgIGlmICghdGFyZ2V0KSByZXR1cm4gXCJcIjtcbiAgICBjb25zdCBkYXRhOiBTb2x1dGlvblJlcG9GaWxlID0ge1xuICAgICAgZW50cmllczogdGhpcy5jdXN0b20ubWFwKHRvUGVyc2lzdGVkKSxcbiAgICAgIHVua25vd25FcnJvcnM6IFsuLi50aGlzLnVua25vd25dLFxuICAgICAgbWV0YTogeyB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSwgc291cmNlOiBcIm9wZW5saXVsYW5cIiB9LFxuICAgIH07XG4gICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZSh0YXJnZXQpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRhcmdldCwgSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMiksIFwidXRmOFwiKTtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgLyoqXG4gICAqIFx1NTcyOFx1NjVCOVx1Njg0OFx1NUU5M1x1RkYwOFx1NTE4NVx1N0Y2RSArIFx1NkM4OVx1NkRDMFx1RkYwOVx1NEUyRFx1NjdFNVx1NjI3RVx1NTMzOVx1OTE0RFx1Njc2MVx1NzZFRVx1MzAwMlxuICAgKiBcdTRGMThcdTUxNDggZmluZ2VycHJpbnRcdUZGMENcdTUxOEQgcGF0dGVyblx1RkYwQ1x1NTE4RFx1NTE3M1x1OTUyRVx1OEJDRFx1MzAwMlxuICAgKi9cbiAgbG9va3VwKHRleHQ6IHN0cmluZywgZmluZ2VycHJpbnQ/OiBzdHJpbmcpOiBTb2x1dGlvbkVudHJ5IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBmcCA9IGZpbmdlcnByaW50ID8/IGZpbmdlcnByaW50RXJyb3IodGV4dCk7XG4gICAgY29uc3QgdCA9IHRleHQudG9Mb3dlckNhc2UoKTtcbiAgICAvLyAxLiBmaW5nZXJwcmludCBcdTdDQkVcdTc4NkVcdTU0N0RcdTRFMkRcdUZGMDhcdTRGMThcdTUxNDhcdTgxRUFcdTVCOUFcdTRFNDlcdTZDODlcdTZEQzBcdUZGMENcdTUxNzZcdTZCMjFcdTUxODVcdTdGNkVcdUZGMDlcbiAgICBjb25zdCBieUZwID0gdGhpcy5jdXN0b20uZmluZCgocykgPT4gcy5maW5nZXJwcmludCA9PT0gZnApID8/IHRoaXMuYnVpbHRpbi5maW5kKChzKSA9PiBzLmZpbmdlcnByaW50ID09PSBmcCk7XG4gICAgaWYgKGJ5RnApIHJldHVybiBieUZwO1xuICAgIC8vIDIuIHBhdHRlcm4gXHU1NDdEXHU0RTJEXG4gICAgZm9yIChjb25zdCBzIG9mIHRoaXMuZW50cmllcykge1xuICAgICAgaWYgKHMucGF0dGVybi50ZXN0KHRleHQpKSByZXR1cm4gcztcbiAgICB9XG4gICAgLy8gMy4gXHU1MTczXHU5NTJFXHU4QkNEXHU1MTVDXHU1RTk1XG4gICAgcmV0dXJuIHRoaXMuZW50cmllcy5maW5kKChzKSA9PiBzLmtleXdvcmRzICYmIHMua2V5d29yZHMuc29tZSgoaykgPT4gdC5pbmNsdWRlcyhrLnRvTG93ZXJDYXNlKCkpKSk7XG4gIH1cblxuICAvKipcbiAgICogXHU2ODM4XHU1RkMzXHU1MzM5XHU5MTREXHU1MTY1XHU1M0UzXHVGRjA4XHU0RThDXHU2QjIxXHU4OUU2XHU1M0QxICsgXHU1RTkzXHU1MzM5XHU5MTREXHVGRjA5XHUzMDAyXG4gICAqIFx1ODlFNlx1NTNEMVx1NjVGNlx1NEYxOFx1NTE0OFx1NzUyOFx1NEVEM1x1NUU5M1x1NTMzOVx1OTE0RFx1NjVCOVx1Njg0OFx1RkYxQlx1NjcyQVx1NTQ3RFx1NEUyRFx1NTIxOVx1OEJCMFx1NUY1NVx1NEUzQVx1NjVCMFx1OTUxOVx1OEJFRlx1NTAxOVx1OTAwOVx1MzAwMlxuICAgKi9cbiAgbWF0Y2gocmVnaXN0cnk6IFJlcGVhdEVycm9yUmVnaXN0cnksIGVycm9yVGV4dDogc3RyaW5nKTogU29sdXRpb25NYXRjaCB7XG4gICAgY29uc3QgeyBmaW5nZXJwcmludCwgb2NjdXJyZW5jZXMsIHRyaWdnZXJlZCB9ID0gcmVnaXN0cnkucmVjb3JkKGVycm9yVGV4dCk7XG4gICAgaWYgKCF0cmlnZ2VyZWQpIHtcbiAgICAgIHJldHVybiB7IHRyaWdnZXJlZDogZmFsc2UsIGZpbmdlcnByaW50LCBvY2N1cnJlbmNlcyB9O1xuICAgIH1cbiAgICBjb25zdCBlbnRyeSA9IHRoaXMubG9va3VwKGVycm9yVGV4dCwgZmluZ2VycHJpbnQpO1xuICAgIGlmICghZW50cnkpIHtcbiAgICAgIC8vIFx1NjcyQVx1NTQ3RFx1NEUyRCBcdTIxOTIgXHU4QkIwXHU1RjU1XHU2NUIwXHU5NTE5XHU4QkVGXHU1MDE5XHU5MDA5XHVGRjBDXHU0RjlCXHU1NDBFXHU3RUVEXHU2Qzg5XHU2REMwXHVGRjA4XHU2MjEwXHU5NTdGXHU3MEI5XHVGRjA5XG4gICAgICB0aGlzLnVua25vd24uYWRkKGZpbmdlcnByaW50KTtcbiAgICAgIHJldHVybiB7IHRyaWdnZXJlZDogdHJ1ZSwgZmluZ2VycHJpbnQsIG9jY3VycmVuY2VzIH07XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0cmlnZ2VyZWQ6IHRydWUsXG4gICAgICBmaW5nZXJwcmludCxcbiAgICAgIG9jY3VycmVuY2VzLFxuICAgICAgZW50cnksXG4gICAgICBhZHZpY2U6IHJlbmRlckFkdmljZShlbnRyeSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBcdTZDODlcdTZEQzBcdTRFMDBcdTY3NjFcdTY1QjBcdTg5RTNcdTUxQjNcdTY1QjlcdTY4NDhcdTUyMzBcdTgxRUFcdTVCOUFcdTRFNDlcdTVFOTNcdUZGMDhcdTUzQkJcdTkxQ0RcdTU0MEVcdThGRkRcdTUyQTBcdTVFNzZcdTYzMDFcdTRFNDVcdTUzMTZcdUZGMDlcdTMwMDJcbiAgICogXHU4RkQ0XHU1NkRFXHU2NUIwXHU1ODlFXHU2NzYxXHU3NkVFXHU3Njg0IGlkXHVGRjFCXHU4MkU1XHU1REYyXHU1QjU4XHU1NzI4XHU1MjE5XHU4RkQ0XHU1NkRFXHU2NUUyXHU2NzA5IGlkXHUzMDAyXG4gICAqL1xuICBhZGRTb2x1dGlvbihlbnRyeTogT21pdDxTb2x1dGlvbkVudHJ5LCBcInBhdHRlcm5cIj4gJiB7IHBhdHRlcm46IFJlZ0V4cCB8IHN0cmluZyB9KTogc3RyaW5nIHtcbiAgICBjb25zdCBub3JtYWxpemVkOiBTb2x1dGlvbkVudHJ5ID0ge1xuICAgICAgLi4uZW50cnksXG4gICAgICBwYXR0ZXJuOiB0eXBlb2YgZW50cnkucGF0dGVybiA9PT0gXCJzdHJpbmdcIiA/IG5ldyBSZWdFeHAoZW50cnkucGF0dGVybiwgXCJpXCIpIDogZW50cnkucGF0dGVybixcbiAgICB9O1xuICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5jdXN0b20uZmluZCgocykgPT4gcy5pZCA9PT0gbm9ybWFsaXplZC5pZCB8fCBzLmZpbmdlcnByaW50ID09PSBub3JtYWxpemVkLmZpbmdlcnByaW50KTtcbiAgICBpZiAoZXhpc3RpbmcpIHJldHVybiBleGlzdGluZy5pZDtcbiAgICB0aGlzLmN1c3RvbS5wdXNoKG5vcm1hbGl6ZWQpO1xuICAgIHRoaXMudW5rbm93bi5kZWxldGUobm9ybWFsaXplZC5maW5nZXJwcmludCk7XG4gICAgaWYgKHRoaXMuZmlsZVBhdGgpIHRoaXMucGVyc2lzdCgpO1xuICAgIHJldHVybiBub3JtYWxpemVkLmlkO1xuICB9XG5cbiAgLyoqIFx1NjcyQVx1NTQ3RFx1NEUyRFx1NzY4NFx1NjVCMFx1OTUxOVx1OEJFRlx1NjMwN1x1N0VCOVx1NTAxOVx1OTAwOSAqL1xuICBnZXQgdW5rbm93bkVycm9ycygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLnVua25vd25dO1xuICB9XG5cbiAgLyoqIFx1NkM4OVx1NkRDMFx1OEJBMVx1NjU3MFx1RkYwOFx1ODFFQVx1NUI5QVx1NEU0OVx1NUU5M1x1ODlDNFx1NkEyMVx1RkYwOSAqL1xuICBnZXQgY3VzdG9tQ291bnQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5jdXN0b20ubGVuZ3RoO1xuICB9XG59XG5cbi8qKlxuICogXHU0RkJGXHU2Mzc3XHVGRjFBXHU2MjhBXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU1RTkzXHU1QkZDXHU1MUZBXHU0RTNBIG1hcmtkb3duXHVGRjA4XHU1M0VGXHU0RjVDIFBSIFx1OEJDNFx1OEJCQSAvIFx1NTIzNlx1NTRDMSAvIFx1NjU4N1x1Njg2M1x1RkYwOVx1MzAwMlxuICogXHU4QkE5XHUzMDBDXHU1NzI4XHU3RUJGXHU1RTkzXHUzMDBEXHU1M0VGXHU4OEFCXHU1MTcxXHU0RUFCXHUzMDAxXHU1QkExXHU5NjA1XHUzMDAxXHU3MjQ4XHU2NzJDXHU1MzE2XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHBvcnRTb2x1dGlvblJlcG9NYXJrZG93bihyZXBvOiBTb2x1dGlvblJlcG9zaXRvcnksIG9wdHM6IHsgdGl0bGU/OiBzdHJpbmcgfSA9IHt9KTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgYCMgJHtvcHRzLnRpdGxlID8/IFwiXHU5NTE5XHU4QkVGXHU4MUVBXHU1MkE4XHU1MzM5XHU5MTREXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU1RTkzXCJ9YCxcbiAgICBgXHU1MTg1XHU3RjZFICR7U09MVVRJT05fUExBWUJPT0subGVuZ3RofSBcdTY3NjEgKyBcdTZDODlcdTZEQzAgJHtyZXBvLmN1c3RvbUNvdW50fSBcdTY3NjFcdUZGMENcdTUxNzEgJHtyZXBvLmVudHJpZXMubGVuZ3RofSBcdTY3NjFcdTMwMDJgLFxuICAgIFwiXCIsXG4gIF07XG4gIGZvciAoY29uc3QgcyBvZiByZXBvLmVudHJpZXMpIHtcbiAgICBsaW5lcy5wdXNoKGAjIyBbJHtzLmxldmVsfV0gJHtzLnRpdGxlfWApO1xuICAgIGxpbmVzLnB1c2goYC0gXHU2MzA3XHU3RUI5OiBcXGAke3MuZmluZ2VycHJpbnR9XFxgYCk7XG4gICAgbGluZXMucHVzaChgLSBcdTY1QjlcdTY4NDg6ICR7cy5zb2x1dGlvbn1gKTtcbiAgICBpZiAocy5za2lsbCkgbGluZXMucHVzaChgLSBza2lsbDogJHtzLnNraWxsfWApO1xuICAgIGlmIChzLm9wZW5Tb3VyY2UpIGxpbmVzLnB1c2goYC0gXHU2NUI5XHU2ODQ4L1x1NUYwMFx1NkU5MFx1OTg3OVx1NzZFRTogJHtzLm9wZW5Tb3VyY2V9YCk7XG4gICAgbGluZXMucHVzaChcIlwiKTtcbiAgfVxuICBpZiAocmVwby51bmtub3duRXJyb3JzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goYCMjIFx1NUY4NVx1NkM4OVx1NkRDMFx1NzY4NFx1NjVCMFx1OTUxOVx1OEJFRlx1RkYwOCR7cmVwby51bmtub3duRXJyb3JzLmxlbmd0aH1cdUZGMDlgKTtcbiAgICByZXBvLnVua25vd25FcnJvcnMuZm9yRWFjaCgodSkgPT4gbGluZXMucHVzaChgLSBcXGAke3V9XFxgYCkpO1xuICB9XG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuXG4vKipcbiAqIFx1NjI4QVx1NjVCOVx1Njg0OFx1NUU5M1x1RkYwOFx1NTE4NVx1N0Y2RSArIFx1NkM4OVx1NkRDMFx1RkYwOVx1OEY2Q1x1NjIxMFx1MzAwQ1x1NTNFRlx1NkNFOFx1NTE2NSBzeXN0ZW0gcHJvbXB0IFx1NzY4NFx1NzdFNVx1OEJDNlx1NzI0N1x1NkJCNVx1MzAwRFx1MzAwMlxuICpcbiAqIFx1OEZEOVx1NjYyRlx1MzAwQ1x1NURGMlx1NkM4OVx1NkRDMFx1NjVCOVx1Njg0OCBcdTIxOTIgXHU1MUIzXHU3QjU2XHU0RTBBXHU0RTBCXHU2NTg3XHUzMDBEXHU3Njg0XHU0RTAwXHU3M0FGXHVGRjFBXHU1NzI4XHU3RUJGIENvZGVCdWRkeSBcdTRFMEVcdTY3MkNcdTU3MzAgQWdlbnQgXHU1NzI4XG4gKiBcdThCQ0FcdTY1QUQvXHU4OUM0XHU1MjEyXHU2NUY2XHVGRjBDXHU5RUQ4XHU4QkE0XHU2NDNBXHU1RTI2XHU5ODc5XHU3NkVFXHU5MUNDXHU1REYyXHU3RUNGXHU3OUVGXHU3RDJGXHU3Njg0XHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHVGRjBDXHU5MDdGXHU1MTREXHU5MUNEXHU1OTBEXHU5MDIwXHU4RjZFXHU1QjUwXHVGRjBDXHU0RTVGXHU4QkE5XG4gKiBcdTMwMENcdTg5RTNcdTUxQjNcdThGQzdcdTc2ODRcdTk1RUVcdTk4OThcdTRFMERcdTUxOERcdTRGOURcdThENTZcdTU5MTZcdTkwRThcdTY4QzBcdTdEMjJcdTMwMERcdThEMkZcdTdBN0ZcdTUyMzBcdTZCQ0ZcdTRFMDBcdTZCNjVcdTUxQjNcdTdCNTZcdTMwMDJcbiAqXG4gKiBcdThGRDRcdTU2REVcdTdFRDNcdTY3ODRcdTRFMEUgYGJ1aWxkS25vd2xlZGdlQ29udGV4dGAgXHU3Njg0IGtub3dsZWRnZSBcdTUxNjVcdTUzQzJcdTRFMDBcdTgxRjRcdUZGMDh0aXRsZS9zbmlwcGV0L3NvdXJjZVx1RkYwOVx1RkYwQ1xuICogXHU1NkUwXHU2QjY0XHU1M0VGXHU3NkY0XHU2M0E1XHU2MkZDXHU2M0E1XHU1MjMwXHU0RUQzXHU1RTkzXHU3N0U1XHU4QkM2XHU1RTkzXHU0RTBBXHU0RTBCXHU2NTg3XHU0RTRCXHU1NDBFXHVGRjBDXHU2MjE2XHU1MzU1XHU3MkVDXHU2Q0U4XHU1MTY1XHUzMDAyXG4gKlxuICogQHBhcmFtIHJlcG8gXHU2NUI5XHU2ODQ4XHU1RTkzXHU1QjlFXHU0RjhCXG4gKiBAcGFyYW0gb3B0cy5pbmNsdWRlQnVpbHRpbiBcdTY2MkZcdTU0MjZcdTUzMDVcdTU0MkJcdTUxODVcdTdGNkUgcGxheWJvb2tcdUZGMDhcdTlFRDhcdThCQTQgdHJ1ZVx1RkYwOVx1RkYxQlx1NEVDNVx1NjBGM1x1NjQzQVx1NUUyNlx1OTg3OVx1NzZFRVx1NkM4OVx1NkRDMFx1NjVGNlx1OEJCRVx1NEUzQSBmYWxzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTb2x1dGlvbktub3dsZWRnZUNvbnRleHQoXG4gIHJlcG86IFNvbHV0aW9uUmVwb3NpdG9yeSxcbiAgb3B0czogeyBpbmNsdWRlQnVpbHRpbj86IGJvb2xlYW47IHNvdXJjZT86IHN0cmluZyB9ID0ge31cbik6IEFycmF5PHsgdGl0bGU6IHN0cmluZzsgc25pcHBldDogc3RyaW5nOyBzb3VyY2U/OiBzdHJpbmcgfT4ge1xuICBjb25zdCBpbmNsdWRlQnVpbHRpbiA9IG9wdHMuaW5jbHVkZUJ1aWx0aW4gPz8gdHJ1ZTtcbiAgY29uc3QgZW50cmllcyA9IGluY2x1ZGVCdWlsdGluID8gcmVwby5lbnRyaWVzIDogcmVwby5jdXN0b21FbnRyaWVzO1xuICBjb25zdCBzb3VyY2UgPSBvcHRzLnNvdXJjZSA/PyBcInNvbHV0aW9ucy1yZXBvXCI7XG5cbiAgcmV0dXJuIGVudHJpZXMubWFwKChzKSA9PiAoe1xuICAgIHRpdGxlOiBgW1x1NjVCOVx1Njg0OFx1MDBCNyR7cy5sZXZlbH1dICR7cy50aXRsZX1cdUZGMDhcdTYzMDdcdTdFQjkgJHtzLmZpbmdlcnByaW50fVx1RkYwOWAsXG4gICAgc25pcHBldDpcbiAgICAgIHMubGV2ZWwgPT09IFwiYXV0b1wiXG4gICAgICAgID8gYFx1NTNFRlx1NzZGNFx1NjNBNVx1NjI2N1x1ODg0Q1x1RkYxQSR7cy5zb2x1dGlvbn1gXG4gICAgICAgIDogYFx1NjNBOFx1ODM1MFx1NjAxRFx1OERFRlx1RkYxQSR7cy5zb2x1dGlvbn0ke3Muc2tpbGwgPyBgXHVGRjFCXHU1M0VGXHU3NTI4IHNraWxsOiAke3Muc2tpbGx9YCA6IFwiXCJ9JHtzLm9wZW5Tb3VyY2UgPyBgXHVGRjFCXHU1M0VGXHU1M0MyXHU4MDAzOiAke3Mub3BlblNvdXJjZX1gIDogXCJcIn1gLFxuICAgIHNvdXJjZTogcy5zb3VyY2UgPz8gc291cmNlLFxuICB9KSk7XG59XG4iLCAiLyoqXG4gKiBEU0ggXHU1REU1XHU1MTc3IEpTT04gU2NoZW1hIFx1ODlDNFx1ODMwM1x1NTMxNlx1NEUwRVx1NjgyMVx1OUE4Q1x1RkYwOFx1NjVCMFx1NjVFN1x1NzI0OFx1NjcyQ1x1OTAxQVx1NzUyOFx1RkYwOVx1MzAwMlxuICpcbiAqIERTSCBcdTVCRjlcdTVERTVcdTUxNzcgc2NoZW1hIFx1NzY4NFx1NUYzQVx1NTIzNlx1NjgyMVx1OUE4Q1x1NTNFQVx1NjNBNVx1NTNENyAqKlx1NTNEN1x1NjUyRlx1NjMwMVx1NzY4NCBKU09OIFNjaGVtYSBcdTVCNTBcdTk2QzYqKlx1RkYxQVxuICogXHU1MzU1XHU0RTJBIGB0eXBlYFx1MzAwMVx1NUJGOVx1OEM2MSBgcHJvcGVydGllc2AgLyBgcmVxdWlyZWRgIC8gXHU1RTAzXHU1QzE0IGBhZGRpdGlvbmFsUHJvcGVydGllc2BcdTMwMDFcbiAqIFx1NjU3MFx1N0VDNCBgaXRlbXNgXHUzMDAxXHU2ODA3XHU5MUNGIGBlbnVtYCAvIGBjb25zdGBcdTMwMDFcdTRFRTVcdTUzQ0FcdTgxRjNcdTVDMTFcdTRFMjRcdTY1MkZcdTc2ODQgYG9uZU9mYFx1MzAwMlxuICogKipcdTRFMERcdTY1MkZcdTYzMDFcdTYyMTZcdTRGNERcdTdGNkVcdTk1MTlcdTY1M0VcdTc2ODQga2V5d29yZCBcdTRGMUFcdTc2RjRcdTYzQTVcdTYyRDJcdTdFREQqKlx1RkYwOGBhc3NlcnRTdXBwb3J0ZWRKc29uU2NoZW1hYFxuICogXHU2MjlCIGBKc29uU2NoZW1hRXJyb3JgXHVGRjA5XHVGRjBDXHU4MDBDXHU0RTBEXHU2NjJGXHU4OEFCXHU5NzU5XHU5RUQ4XHU1RkZEXHU3NTY1XHUzMDAyXG4gKlxuICogXHU2NUIwXHU3MjQ4IERTSFx1RkYwOGRzaC10b29scyAwLjEuNiBcdTdFQkZcdUZGMDlcdTU3MjggYFRvb2xSdW50aW1lLnJlZ2lzdGVyKClgIFx1OTFDQ1x1NUJGOVxuICogYG91dHB1dC5zY2hlbWFgIFx1NjI2N1x1ODg0Q1x1OEJFNVx1NjgyMVx1OUE4Q1x1RkYwQ1x1NUU3Nlx1NTcyOFx1NkJDRlx1NkIyMVx1OEZENFx1NTZERVx1NTQwRVx1NjMwOSBgb3V0cHV0LnNjaGVtYWBcbiAqIFx1NjgyMVx1OUE4QyBjYW5vbmljYWwgdmFsdWVcdTMwMDJcbiAqXG4gKiBcdTY3MkNcdTZBMjFcdTU3NTdcdTYyN0ZcdTYyQzVcdTRFMDlcdTRFRjZcdTRFOEJcdUZGMUFcbiAqIDEuICoqXHU4OUM0XHU4MzAzXHU1MzE2KipcdUZGMDh7QGxpbmsgbm9ybWFsaXplU2NoZW1hfVx1RkYwOVx1RkYxQVx1NUJGOSBNQ1AgXHU0RkE3XHU1QkJEXHU2NzdFXHU3Njg0IGBpbnB1dFNjaGVtYWAgXHU1MDVBXG4gKiAgICAqKmtleXdvcmQgXHU3NjdEXHU1NDBEXHU1MzU1XHU2NTM2XHU2NTVCKipcdTIwMTRcdTIwMTRcdTRFMjJcdTVGMDNcdTY3MkFcdTc3RTUga2V5d29yZFx1MzAwMVx1NjI4QSBgcmVxdWlyZWRgIFx1NjUzNlx1NjU1Qlx1NTIzMFxuICogICAgYHByb3BlcnRpZXNgIFx1NEU0Qlx1NTE4NVx1MzAwMVx1NUYzQVx1NTIzNlx1NUJGOVx1OEM2MVx1NjgzOVx1MzAwMlx1NUI4MyoqXHU0RTBEXHU0RTIyXHU1M0Q2XHU1MDNDXHU3RUE2XHU2NzVGXHUzMDAxXHU0RTVGXHU0RTBEXHU1MDVBXHU3QzdCXHU1NzhCXHU0RTAwXHU4MUY0XHU2MDI3XHU0RkVFXHU2QjYzKipcdUZGMUFcbiAqICAgIFx1NEY1Q1x1ODAwNVx1NTE5OVx1NzY4NCBgY29uc3RgIC8gYGVudW1gIFx1NEUwMFx1NUY4Qlx1NTM5Rlx1NjgzN1x1NEZERFx1NzU1OVx1RkYwQ1x1NjVFMFx1OEJCQVx1NTNENlx1NTAzQ1x1NjYyRlx1NjgwN1x1OTFDRlx1OEZEOFx1NjYyRlx1NUJGOVx1OEM2MS9cdTY1NzBcdTdFQzRcbiAqICAgIFx1RkYwOFx1NTk4MiBgeyB0eXBlOiAnc3RyaW5nJywgY29uc3Q6IG51bGwgfWBcdTMwMDFgeyB0eXBlOiAnc3RyaW5nJywgZW51bTogW3sgYTogMSB9XSB9YFx1RkYwOVx1MzAwMlxuICogICAgXHU0RTIyXHU1RjAzXHU1QjgzXHU0RUVDXHU3QjQ5XHU0RThFXHU5NzU5XHU5RUQ4XHU2NTNFXHU1QkJEXHU3RUE2XHU2NzVGXHVGRjA4XHU0RUNFXHUzMDBDXHU1RkM1XHU5ODdCXHU2NjJGIG51bGxcdTMwMERcdTUzRDhcdTYyMTBcdTMwMENcdTRFRkJcdTYxMEZcdTUwM0NcdTMwMERcdUZGMDlcdTMwMDJcdThGRDlcdTdDN0Igc2NoZW1hIFx1NzUzMVxuICogICAge0BsaW5rIGNoZWNrU3VwcG9ydGVkU2NoZW1hfSBcdTU3MjhcdTZDRThcdTUxOENcdTY3MUZcdTYyRDJcdTdFRERcdUZGMENcdTVCQkZcdTRFM0JcbiAqICAgIGBhc3NlcnRTdXBwb3J0ZWRKc29uU2NoZW1hYCBcdTU0MENcdTY4MzdcdTYyRDJcdTdFRERcdTIwMTRcdTIwMTRcdTg4NENcdTRFM0FcdTRFMDBcdTgxRjRcdUZGMENcdTY1RTlcdTU5MzFcdThEMjVcdTRGMThcdTRFOEVcdThDMDNcdTc1MjhcdTUzNzNcdTcwQjhcdTMwMDJcbiAqICAgICoqXHU0RjhCXHU1OTE2XHVGRjA4XHU2NzA5XHU2MTBGXHU3Njg0XHU1QkJEXHU2NzdFXHU1RjUyXHU0RTAwXHVGRjA5KipcdUZGMUFgb25lT2ZgIFx1ODI4Mlx1NzBCOVx1NEUwQVx1NzY4NFx1NTE0NFx1NUYxRiBrZXl3b3JkXHVGRjA4YHR5cGVgIC9cbiAqICAgIGBlbnVtYCAvIGBjb25zdGAgLyBgcHJvcGVydGllc2AgLyBgcmVxdWlyZWRgIC8gYGl0ZW1zYCAvXG4gKiAgICBgYWRkaXRpb25hbFByb3BlcnRpZXNgXHVGRjA5XHU0RjFBXHU4OEFCXHU2NTc0XHU0RjUzXHU0RTIyXHU1RjAzXHUzMDAyXHU1MzlGXHU1NkUwXHU2NjJGIERTSCBcdTVCNTBcdTk2QzZcdTc5ODFcdTZCNjJcdTVCODNcdTRFRUNcdTRFMEUgYG9uZU9mYFxuICogICAgXHU1MTcxXHU1QjU4XHVGRjBDXHU4MDBDXHU3NzFGXHU1QjlFXHU0RTE2XHU3NTRDXHU3Njg0IEpTT04gU2NoZW1hIFx1NUUzOFx1NjI4QSBgdHlwZWAgLyBgcHJvcGVydGllc2AgXHU0RTBFIGBvbmVPZmAgXHU1RTc2XHU1MTk5XHVGRjBDXG4gKiAgICBcdTRGRERcdTc1NTlcdTRGMUFcdThCQTlcdTYzRDJcdTRFRjZcdTY1NzRcdTRGNTNcdTUyQTBcdThGN0RcdTU5MzFcdThEMjVcdTMwMDJcdTRFRTNcdTRFRjdcdTY2MkZcdThCRTVcdTRGNERcdTdGNkVcdTRFMEFcdTc2ODRcdTUzRDZcdTUwM0NcdTdFQTZcdTY3NUZcdTRFMERcdTUxOERcdTc1MUZcdTY1NDhcdUZGMUIqKlx1NTM5Rlx1NjgzNyoqXG4gKiAgICBzY2hlbWEgXHU0RUNEXHU4OEFCXHU2NzJDXHU2QTIxXHU1NzU3XHU4MUVBXHU2OEMwXHU0RTBFXHU1QkJGXHU0RTNCXHU0RTAwXHU4MUY0XHU2MkQyXHU3RUREXHUzMDAyXHU2NzA5XHU0RjhCXHVGRjFBXHU4OUMxIGB0ZXN0L2RzaC1zY2hlbWEudGVzdC5tanNgXHUzMDAyXG4gKiAgICAqKlx1NEUwRFx1NjRDNVx1ODFFQVx1NTJBMFx1NEUyNSoqXHVGRjFBXHU0RjVDXHU4MDA1XHU2Q0ExXHU1OEYwXHU2NjBFIGBhZGRpdGlvbmFsUHJvcGVydGllc2AgXHU2NUY2XHU0RkREXHU2MzAxXG4gKiAgICBcdTMwMENcdTY3MkFcdTU4RjBcdTY2MEUgPSBcdTVCQkRcdTY3N0VcdTMwMERcdUZGMENcdTRFMEUgTUNQIFx1NEZBN1x1NThGMFx1NjYwRVx1NEUwMFx1ODFGNFx1MzAwMlxuICogMi4gKipcdTdFRDNcdTY3ODRcdTgxRUFcdTY4QzAqKlx1RkYwOHtAbGluayBjaGVja1N1cHBvcnRlZFNjaGVtYX1cdUZGMDlcdUZGMUFcdTZDRThcdTUxOENcdTUyNERcdTVCRjkgc2NoZW1hIFx1NjcyQ1x1OEVBQlxuICogICAgXHU1MDVBXHU0RTAwXHU2QjIxXHU1M0Q3XHU2NTJGXHU2MzAxXHU1QjUwXHU5NkM2XHU2ODIxXHU5QThDXHVGRjA4XHU1QkY5XHU5RjUwXHU1QkJGXHU0RTNCIGBhc3NlcnRTdXBwb3J0ZWRKc29uU2NoZW1hYCBcdTc2ODRcdTUyMjRcdTVCOUFcdUZGMDlcdUZGMENcbiAqICAgIFx1OEZERFx1ODlDNFx1OTg3OVx1NTE5OVx1NTE2NVx1NTJBMFx1OEY3RFx1NzUzQlx1NTBDRlx1NUU3Nlx1OEJBOVx1NjNEMlx1NEVGNioqXHU1MkEwXHU4RjdEXHU1OTMxXHU4RDI1KipcdUZGMENcdTkwN0ZcdTUxNERcdTMwMENcdTg4QzVcdTRFMEFcdTRFODZcdTRGNDZcdThDMDNcdTc1MjhcdTUzNzNcdTcwQjhcdTMwMERcdTMwMDJcbiAqIDMuICoqXHU1MDNDXHU4MUVBXHU2OEMwKipcdUZGMDh7QGxpbmsgdmFsaWRhdGVBZ2FpbnN0U2NoZW1hfVx1RkYwOVx1RkYxQVx1NjMwOSBzY2hlbWEgXHU2ODIxXHU5QThDXHU0RTAwXHU0RTJBXHU1MDNDXHUzMDAyXG4gKiAgICBcdTUyMjRcdTVCOUFcdThCRURcdTRFNDlcdTRFMEVcdTVCQkZcdTRFM0IgYHZhbGlkYXRlSnNvblNjaGVtYVZhbHVlYCAqKlx1NUJGOVx1OUY1MCoqXHVGRjA4XHU1NDJCIGxvc3NsZXNzIEpTT05cbiAqICAgIFx1OEZCOVx1NzU0Q1x1RkYxQVx1NjJEMlx1N0VERCBgdW5kZWZpbmVkYCAvIFx1OTc1RVx1NjcwOVx1OTY1MFx1NjU3MCAvIGAtMGAgLyBcdTdBMDBcdTc1OEZcdTY1NzBcdTdFQzQgLyBcdTk3NUVcdTY2NkVcdTkwMUFcdTUzOUZcdTU3OEJcdUZGMDlcdUZGMENcbiAqICAgIFx1NzUzMSBgdGVzdC9kc2gtc2NoZW1hLnRlc3QubWpzYCBcdTRFRTVcdTc3MUZcdTVCOUVcdTVCQkZcdTRFM0JcdTRFM0Egb3JhY2xlIFx1NTA1QVx1NURFRVx1NTIwNlx1NTZERVx1NUY1Mlx1MzAwMlxuICogICAgXHU4QkNBXHU2NUFEXHU2NTg3XHU2ODQ4XHU0RTBEXHU4RkZEXHU2QzQyXHU0RTBFXHU1QkJGXHU0RTNCXHU5MDEwXHU1QjU3XHU0RTAwXHU4MUY0XHUzMDAyXG4gKlxuICogQG1vZHVsZSBAb3BlbmxpdWxhbi9kc2gtb3BlbmxpdWxhbi9kc2gtc2NoZW1hXG4gKi9cblxuLyoqIFx1NTNEN1x1NjUyRlx1NjMwMVx1NzY4NCBKU09OIFNjaGVtYSBcdTVCNTBcdTk2QzZcdTgyODJcdTcwQjlcdTMwMDIgKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3VwcG9ydGVkU2NoZW1hTm9kZSB7XG4gIHR5cGU/OiBcIm9iamVjdFwiIHwgXCJhcnJheVwiIHwgXCJzdHJpbmdcIiB8IFwibnVtYmVyXCIgfCBcImludGVnZXJcIiB8IFwiYm9vbGVhblwiIHwgXCJudWxsXCI7XG4gIG9uZU9mPzogU3VwcG9ydGVkU2NoZW1hTm9kZVtdO1xuICBwcm9wZXJ0aWVzPzogUmVjb3JkPHN0cmluZywgU3VwcG9ydGVkU2NoZW1hTm9kZT47XG4gIHJlcXVpcmVkPzogc3RyaW5nW107XG4gIGFkZGl0aW9uYWxQcm9wZXJ0aWVzPzogYm9vbGVhbjtcbiAgaXRlbXM/OiBTdXBwb3J0ZWRTY2hlbWFOb2RlO1xuICAvKiogXHU0RjVDXHU4MDA1XHU1OEYwXHU2NjBFXHU3Njg0IGBlbnVtYFx1RkYwQyoqXHU1MzlGXHU2ODM3XHU0RkREXHU3NTU5KipcdUZGMDhcdTY2MkZcdTU0MjZcdTUzRDdcdTY1MkZcdTYzMDFcdTc1MzEge0BsaW5rIGNoZWNrU3VwcG9ydGVkU2NoZW1hfSBcdTUyMjRcdTVCOUFcdUZGMUJgb25lT2ZgIFx1ODI4Mlx1NzBCOVx1NEUwQVx1NzY4NFx1NTE0NFx1NUYxRiBgZW51bWAgXHU0RjhCXHU1OTE2XHVGRjBDXHU4OUMxIHtAbGluayBub3JtYWxpemVTY2hlbWF9XHVGRjA5XHUzMDAyICovXG4gIGVudW0/OiB1bmtub3duO1xuICAvKiogXHU0RjVDXHU4MDA1XHU1OEYwXHU2NjBFXHU3Njg0IGBjb25zdGBcdUZGMEMqKlx1NTM5Rlx1NjgzN1x1NEZERFx1NzU1OSoqXHVGRjA4XHU2NjJGXHU1NDI2XHU1M0Q3XHU2NTJGXHU2MzAxXHU3NTMxIHtAbGluayBjaGVja1N1cHBvcnRlZFNjaGVtYX0gXHU1MjI0XHU1QjlBXHVGRjFCYG9uZU9mYCBcdTgyODJcdTcwQjlcdTRFMEFcdTc2ODRcdTUxNDRcdTVGMUYgYGNvbnN0YCBcdTRGOEJcdTU5MTZcdUZGMENcdTg5QzEge0BsaW5rIG5vcm1hbGl6ZVNjaGVtYX1cdUZGMDlcdTMwMDIgKi9cbiAgY29uc3Q/OiB1bmtub3duO1xuICBkZXNjcmlwdGlvbj86IHN0cmluZztcbiAgdGl0bGU/OiBzdHJpbmc7XG59XG5cbmNvbnN0IFNDSEVNQV9UWVBFUyA9IG5ldyBTZXQoW1wib2JqZWN0XCIsIFwiYXJyYXlcIiwgXCJzdHJpbmdcIiwgXCJudW1iZXJcIiwgXCJpbnRlZ2VyXCIsIFwiYm9vbGVhblwiLCBcIm51bGxcIl0pO1xuY29uc3QgQ09OU1RSQUlOVF9LRVlXT1JEUyA9IG5ldyBTZXQoW1xuICBcInR5cGVcIixcbiAgXCJvbmVPZlwiLFxuICBcInByb3BlcnRpZXNcIixcbiAgXCJyZXF1aXJlZFwiLFxuICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCIsXG4gIFwiaXRlbXNcIixcbiAgXCJlbnVtXCIsXG4gIFwiY29uc3RcIixcbl0pO1xuY29uc3QgQU5OT1RBVElPTl9LRVlXT1JEUyA9IG5ldyBTZXQoW1wiZGVzY3JpcHRpb25cIiwgXCJ0aXRsZVwiLCBcImRlZmF1bHRcIiwgXCJleGFtcGxlc1wiXSk7XG4vKiogXHU0RTBFIGBvbmVPZmAgXHU0RTkyXHU2NUE1XHU3Njg0XHU1MTQ0XHU1RjFGIGtleXdvcmRcdUZGMDhcdTVCQkZcdTRFM0IgYE9ORV9PRl9TSUJMSU5HX0tFWVdPUkRTYFx1RkYwOVx1MzAwMiAqL1xuY29uc3QgT05FX09GX1NJQkxJTkdfS0VZV09SRFMgPSBbXCJwcm9wZXJ0aWVzXCIsIFwicmVxdWlyZWRcIiwgXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiLCBcIml0ZW1zXCIsIFwiZW51bVwiLCBcImNvbnN0XCJdO1xuXG4vKiogXHU1MjI0XHU2NUFEXHU2NjJGXHU1NDI2XHU0RTNBXHU1M0VGXHU0RTBCXHU5NEJCXHU3Njg0XHU2NjZFXHU5MDFBXHU1QkY5XHU4QzYxXHVGRjA4XHU2MzkyXHU5NjY0XHU2NTcwXHU3RUM0XHU0RTBFIG51bGxcdUZGMDlcdTMwMDIgKi9cbmZ1bmN0aW9uIGlzUmVjb3JkKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9PSBudWxsICYmICFBcnJheS5pc0FycmF5KHZhbHVlKTtcbn1cblxuLyoqXG4gKiBcdTY2MkZcdTU0MjZcdTRFM0FcdTY2NkVcdTkwMUFcdThCQjBcdTVGNTVcdUZGMDhcdTUyMjRcdTVCOUFcdThCRURcdTRFNDlcdTVCRjlcdTlGNTBcdTVCQkZcdTRFM0IgYGlzUGxhaW5Kc29uUmVjb3JkYFx1RkYwOVx1RkYxQVxuICogXHU1MzlGXHU1NzhCXHU0RTNBIGBudWxsYCBcdTYyMTYgYE9iamVjdC5wcm90b3R5cGVgXHVGRjBDXHU2MzkyXHU5NjY0XHU3QzdCXHU1QjlFXHU0RjhCIC8gYERhdGVgIC8gYE1hcGAgXHU3QjQ5XHUzMDAyXG4gKi9cbmZ1bmN0aW9uIGlzUGxhaW5SZWNvcmQodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgfHwgdmFsdWUgPT09IG51bGwgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgcHJvdG90eXBlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKTtcbiAgcmV0dXJuIHByb3RvdHlwZSA9PT0gbnVsbCB8fCBwcm90b3R5cGUgPT09IE9iamVjdC5wcm90b3R5cGU7XG59XG5cbi8qKiBcdTY4MDdcdTkxQ0ZcdTY2MkZcdTU0MjZcdTRFMEVcdTU4RjBcdTY2MEVcdTc2ODQgdHlwZSBcdTUzMzlcdTkxNERcdUZGMDhcdTVCQkZcdTRFM0IgYHNjYWxhck1hdGNoZXNgXHVGRjA5XHUzMDAyICovXG5mdW5jdGlvbiBzY2FsYXJNYXRjaGVzKHR5cGU6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIjtcbiAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmIE51bWJlci5pc0Zpbml0ZSh2YWx1ZSkgJiYgIU9iamVjdC5pcyh2YWx1ZSwgLTApO1xuICAgIGNhc2UgXCJpbnRlZ2VyXCI6XG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmIE51bWJlci5pc0Zpbml0ZSh2YWx1ZSkgJiYgIU9iamVjdC5pcyh2YWx1ZSwgLTApICYmIE51bWJlci5pc0ludGVnZXIodmFsdWUpO1xuICAgIGNhc2UgXCJib29sZWFuXCI6XG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcImJvb2xlYW5cIjtcbiAgICBjYXNlIFwibnVsbFwiOlxuICAgICAgcmV0dXJuIHZhbHVlID09PSBudWxsO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBcdTY2MkZcdTU0MjZcdTRFM0EgbG9zc2xlc3MgSlNPTiBcdTUwM0NcdUZGMDhcdTUyMjRcdTVCOUFcdThCRURcdTRFNDlcdTVCRjlcdTlGNTBcdTVCQkZcdTRFM0JcdTc2ODQgYGlzSnNvblZhbHVlYFx1RkYwOVx1MzAwMlxuICpcbiAqIFx1NjJEMlx1N0VERFx1RkYxQWB1bmRlZmluZWRgIC8gXHU1MUZEXHU2NTcwIC8gc3ltYm9sIC8gYmlnaW50IC8gXHU5NzVFXHU2NzA5XHU5NjUwXHU2NTcwIC8gYC0wYCAvIFx1N0EwMFx1NzU4Rlx1NjU3MFx1N0VDNCAvXG4gKiBcdTk3NUVcdTY2NkVcdTkwMUFcdTUzOUZcdTU3OEJcdTVCRjlcdThDNjEgLyBcdTVGQUFcdTczQUZcdTVGMTVcdTc1MjhcdTMwMDJcdTVCQkZcdTRFM0JcdTU3MjhcdTUwM0NcdTY4MjFcdTlBOENcdTc2ODQgb2JqZWN0IC8gYXJyYXkgLyBcdTY1RTAgdHlwZSBcdTgyODJcdTcwQjlcbiAqIFx1NEUwQVx1OTBGRFx1NEYxQVx1NTA1QVx1OEZEOVx1OTA1M1x1NjhDMFx1NjdFNVx1RkYwQ1x1NjcyQ1x1NkEyMVx1NTc1N1x1NUZDNVx1OTg3Qlx1NEUwMFx1ODFGNFx1RkYwQ1x1NTQyNlx1NTIxOVx1ODFFQVx1NjhDMFx1NEYxQVx1NkJENFx1NUJCRlx1NEUzQlx1NUJCRFx1Njc3RVx1ODAwQ1x1NkYwRlx1NjJBNVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNMb3NzbGVzc0pzb24odmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgY29uc3QgYW5jZXN0b3JzID0gbmV3IFNldDxvYmplY3Q+KCk7XG4gIGNvbnN0IHdhbGsgPSAoY3VycmVudDogdW5rbm93bik6IGJvb2xlYW4gPT4ge1xuICAgIGlmIChjdXJyZW50ID09PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCBraW5kID0gdHlwZW9mIGN1cnJlbnQ7XG4gICAgaWYgKGtpbmQgPT09IFwic3RyaW5nXCIgfHwga2luZCA9PT0gXCJib29sZWFuXCIpIHJldHVybiB0cnVlO1xuICAgIGlmIChraW5kID09PSBcIm51bWJlclwiKSByZXR1cm4gTnVtYmVyLmlzRmluaXRlKGN1cnJlbnQgYXMgbnVtYmVyKSAmJiAhT2JqZWN0LmlzKGN1cnJlbnQsIC0wKTtcbiAgICBpZiAoa2luZCAhPT0gXCJvYmplY3RcIikgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IG5vZGUgPSBjdXJyZW50IGFzIG9iamVjdDtcbiAgICBpZiAoYW5jZXN0b3JzLmhhcyhub2RlKSkgcmV0dXJuIGZhbHNlO1xuICAgIGFuY2VzdG9ycy5hZGQobm9kZSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb3RvdHlwZSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihub2RlKTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSB7XG4gICAgICAgIGlmIChwcm90b3R5cGUgIT09IEFycmF5LnByb3RvdHlwZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoUmVmbGVjdC5vd25LZXlzKG5vZGUpLmxlbmd0aCAhPT0gbm9kZS5sZW5ndGggKyAxKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBub2RlLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgIGlmICghT2JqZWN0Lmhhc093bihub2RlLCBpbmRleCkgfHwgIXdhbGsoKG5vZGUgYXMgdW5rbm93bltdKVtpbmRleF0pKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAocHJvdG90eXBlICE9PSBPYmplY3QucHJvdG90eXBlICYmIHByb3RvdHlwZSAhPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgZm9yIChjb25zdCBrZXkgb2YgUmVmbGVjdC5vd25LZXlzKG5vZGUpKSB7XG4gICAgICAgIGlmICh0eXBlb2Yga2V5ICE9PSBcInN0cmluZ1wiIHx8ICFPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwobm9kZSwga2V5KSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoIXdhbGsoKG5vZGUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW2tleV0pKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYW5jZXN0b3JzLmRlbGV0ZShub2RlKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiB3YWxrKHZhbHVlKTtcbn1cblxuLyoqXG4gKiBcdTYyOEFcdTRFRkJcdTYxMEZcdTVCQkRcdTY3N0Ugc2NoZW1hIFx1NjUzNlx1NjU1Qlx1NTIzMFx1NTNEN1x1NjUyRlx1NjMwMVx1NUI1MFx1OTZDNlx1NzY4NCBrZXl3b3JkIFx1NzY3RFx1NTQwRFx1NTM1NVx1MzAwMlxuICpcbiAqICoqXHU4RkI5XHU3NTRDXHVGRjA4XHU2NkZFXHU0RTA5XHU1RUE2XHU2NTg3XHU2ODYzXHU1OTMxXHU1QjlFXHVGRjA5KipcdUZGMUFcdTY3MkNcdTUxRkRcdTY1NzBcdTUzRUFcdTUwNUEga2V5d29yZCBcdTc2N0RcdTU0MERcdTUzNTVcdTY1MzZcdTY1NUJcdUZGMEMqKlx1NEUwRFx1NEUyMlx1NTNENlx1NTAzQ1x1N0VBNlx1Njc1Rlx1MzAwMVxuICogXHU0RTVGXHU0RTBEXHU1MDVBXHU3QzdCXHU1NzhCXHU0RTAwXHU4MUY0XHU2MDI3XHU0RkVFXHU2QjYzKipcdTMwMDJcdTRGNUNcdTgwMDVcdTU4RjBcdTY2MEVcdTc2ODQgYGNvbnN0YCAvIGBlbnVtYCBcdTRFMDBcdTVGOEJcdTUzOUZcdTY4MzdcdTRGRERcdTc1NTlcdUZGMENcdTk2OEZcdTU0MEVcdTc1MzFcbiAqIHtAbGluayBjaGVja1N1cHBvcnRlZFNjaGVtYX0gXHU1MjI0XHU1QjlBXHUyMDE0XHUyMDE0XHU4RkQ5XHU2NjJGXHU2NzA5XHU2MTBGXHU3Njg0XHVGRjFBXHU0RTIyXHU1RjAzXHU3RUE2XHU2NzVGXHU0RjFBXHU4QkE5XHUzMDBDXHU1RkM1XHU5ODdCXHU2NjJGIG51bGxcdTMwMERcbiAqIFx1OTc1OVx1OUVEOFx1NTNEOFx1NjIxMFx1MzAwQ1x1NEVGQlx1NjEwRlx1NTAzQ1x1MzAwRFx1RkYwQ1x1NkJENFx1NzZGNFx1NjNBNVx1NjJBNVx1OTUxOVx1NjZGNFx1NTM3MVx1OTY2OVx1MzAwMlxuICpcbiAqIFx1OEUyOVx1OEZDN1x1NEUyNFx1NkIyMVx1MzAwQ1x1NjU4N1x1Njg2M1x1NTNFQVx1NUJGOVx1NEUwMFx1NTM0QVx1MzAwRFx1NzY4NFx1NTc1MVx1RkYwQ1x1NjIxMFx1NTZFMFx1OTBGRFx1NjYyRioqXHU2NUUwXHU0RjhCXHU2NTJGXHU2NDkxXHU3Njg0XHU1MTY4XHU3OUYwXHU1M0U1XHU1RjBGKipcdUZGMUFcbiAqIDEuIFx1NjVFOVx1NTE0OFx1NUI5RVx1NzNCMFx1NzUyOCBgZmlsdGVyYCBcdTRFMjJcdTVGMDNcdTk3NUVcdTY4MDdcdTkxQ0ZcdTUzRDZcdTUwM0NcdUZGMENcdTRFOEVcdTY2MkYgYHsgdHlwZTogJ3N0cmluZycsIGNvbnN0OiBudWxsIH1gXG4gKiAgICBcdTRGRERcdTc1NTlcdTMwMDFcdTgwMEMgYHsgdHlwZTogJ3N0cmluZycsIGVudW06IFt7IGE6IDEgfV0gfWAgXHU4OEFCXHU5NzU5XHU5RUQ4XHU0RTIyXHU1RjAzXHUyMDE0XHUyMDE0ZG9jc3RyaW5nIFx1NTNFQVx1NUJGOVxuICogICAgXHU1MjREXHU4MDA1XHU2MjEwXHU3QUNCXHUzMDAyXHU3M0IwXHU1REYyXHU2NTM5XHU0RTNBXHU0RTI0XHU4MDA1XHU0RTAwXHU4MUY0XHVGRjFBKipcdTRFMDBcdTVGOEJcdTRGRERcdTc1NTkqKlx1RkYwQ1x1NzUzMVx1NkNFOFx1NTE4Q1x1NjcxRlx1ODFFQVx1NjhDMFx1NjJEMlx1N0VERFx1RkYwOFx1NUJCRlx1NEUzQlx1NTQwQ1x1NjgzN1x1NjJEMlx1N0VERFx1RkYwOVx1MzAwMlxuICogMi4gXHU0RkVFIDEgXHU2NUY2XHU1M0M4XHU1MTk5XHU0RTBCXHUzMDBDXHU2NUUwXHU4QkJBXHU0RjREXHU3RjZFXHU2NjJGXHU1NDI2XHU1M0Q3XHU2NTJGXHU2MzAxXHUzMDBEXHVGRjBDXHU4MDBDIGBvbmVPZmAgXHU4MjgyXHU3MEI5XHU3Njg0XHU1MTQ0XHU1RjFGIGtleXdvcmQgXHU2MDcwXHU2MDcwXG4gKiAgICBcdTg4QUJcdTRFMjJcdTVGMDNcdTMwMDIqKlx1NTNENlx1NTAzQ1x1N0VGNFx1NUVBNioqXHU3Njg0XHU2MjdGXHU4QkZBXHU0RTNBXHU3NzFGXHVGRjBDKipcdTRGNERcdTdGNkVcdTdFRjRcdTVFQTYqKlx1NEUzQVx1NTA0N1x1RkYwQ1x1NjU0NVx1NkI2NFx1NTkwNFx1NjYwRVx1Nzg2RVx1NTIxMlx1NTFGQVx1NEY4Qlx1NTkxNlx1RkYxQVxuICogICAgYG9uZU9mYCBcdTgyODJcdTcwQjlcdTRFMEFcdTc2ODRcdTUxNDRcdTVGMUYga2V5d29yZCBcdTRFMDBcdTVGOEJcdTRFMjJcdTVGMDNcdUZGMDhcdTg5QzFcdTRFMEJcdTMwMENcdTg5QzRcdTUyMTlcdTMwMERcdTRFMEVcbiAqICAgIGB0ZXN0L2RzaC1zY2hlbWEudGVzdC5tanNgIFx1NzY4NFx1OTQ4OVx1NEY0Rlx1NzUyOFx1NEY4Qlx1RkYwOVx1MzAwMlx1OEZEOVx1NjYyRioqXHU2NzA5XHU2MTBGXHU3Njg0XHU1QkJEXHU2NzdFXHU1RjUyXHU0RTAwKipcdUZGMENcdTRFMERcdTY2MkZcdTc1OEZcdTZGMEZcdTMwMDJcbiAqXG4gKiBcdTU2RTBcdTZCNjRcdTY3MkNcdTUxRkRcdTY1NzBcdTc2ODRcdThGRDRcdTU2REVcdTUwM0MqKlx1NEUwRFx1NEZERFx1OEJDMSoqXHU5MDFBXHU4RkM3IGBjaGVja1N1cHBvcnRlZFNjaGVtYWBcdUZGMUJcdTZDRThcdTUxOENcdTY3MUZcdTgxRUFcdTY4QzBcdTYyNERcdTY2MkZcdTY3MDBcdTdFQzhcdTk1RjhcdTk1RThcdTMwMDJcbiAqXG4gKiBcdTg5QzRcdTUyMTlcdUZGMUFcbiAqIC0gXHU1M0VBXHU0RkREXHU3NTU5XHU3NjdEXHU1NDBEXHU1MzU1IGtleXdvcmRcdUZGMUJgb25lT2ZgIFx1NEUwRSBgdHlwZWAgXHU0RTkyXHU2NUE1XHVGRjA4XHU0RkREXHU3NTU5IGBvbmVPZmBcdUZGMDlcdTMwMDJcbiAqIC0gYG9uZU9mYCBcdTgyODJcdTcwQjlcdUZGMUEqKlx1NTE0NFx1NUYxRiBrZXl3b3JkIFx1NEUwMFx1NUU3Nlx1NEUyMlx1NUYwMyoqXHVGRjA4XHU1NDJCIGB0eXBlYCAvIGBlbnVtYCAvIGBjb25zdGAgL1xuICogICBgcHJvcGVydGllc2AgLyBgcmVxdWlyZWRgIC8gYGl0ZW1zYCAvIGBhZGRpdGlvbmFsUHJvcGVydGllc2BcdUZGMDlcdTMwMDJEU0ggXHU1QjUwXHU5NkM2XHU3OTgxXHU2QjYyXG4gKiAgIFx1NUI4M1x1NEVFQ1x1NEUwRSBgb25lT2ZgIFx1NTE3MVx1NUI1OFx1RkYwQ1x1NzcxRlx1NUI5RSBzY2hlbWEgXHU1Mzc0XHU1RTM4XHU1RTc2XHU1MTk5XHVGRjBDXHU0RkREXHU3NTU5XHU0RjFBXHU4QkE5XHU2M0QyXHU0RUY2XHU2NTc0XHU0RjUzXHU1MkEwXHU4RjdEXHU1OTMxXHU4RDI1XHVGRjFCXG4gKiAgIFx1NEVFM1x1NEVGN1x1NjYyRlx1OEJFNVx1NEY0RFx1N0Y2RVx1NEUwQVx1NzY4NFx1NTNENlx1NTAzQ1x1N0VBNlx1Njc1Rlx1NEUwRFx1NTE4RFx1NzUxRlx1NjU0OFx1RkYwOCoqXHU1MzlGXHU2ODM3Kiogc2NoZW1hIFx1NEVDRFx1ODhBQlx1ODFFQVx1NjhDMFx1NEUwRVx1NUJCRlx1NEUzQlx1NjJEMlx1N0VERFx1RkYwOVx1MzAwMlxuICogLSBcdTVCRjlcdThDNjFcdTgyODJcdTcwQjlcdTgyRTVcdTU4RjBcdTY2MEVcdTRFODYgYHByb3BlcnRpZXNgXHVGRjBDXHU1MjE5XHU2MjhBIGByZXF1aXJlZGAgXHU2NTM2XHU2NTVCXHU0RTNBXG4gKiAgIFx1MzAwQ1x1NjVFMlx1NTcyOCBwcm9wZXJ0aWVzIFx1OTFDQ1x1MzAwMVx1NTNDOFx1NTcyOFx1NTM5RiByZXF1aXJlZCBcdTkxQ0NcdTMwMERcdTc2ODRcdTU0MERcdTVCNTdcdTIwMTRcdTIwMTREU0ggXHU4OTgxXHU2QzQyXG4gKiAgIGByZXF1aXJlZGAgXHU3Njg0XHU2QkNGXHU0RTAwXHU5ODc5XHU5MEZEXHU1RkM1XHU5ODdCXHU1MUZBXHU3M0IwXHU1NzI4IGBwcm9wZXJ0aWVzYCBcdTRFMkRcdTMwMDJcbiAqIC0gYGFkZGl0aW9uYWxQcm9wZXJ0aWVzYCAqKlx1NTNFQVx1NTcyOFx1NEY1Q1x1ODAwNVx1NjYzRVx1NUYwRlx1NThGMFx1NjYwRVx1NUUwM1x1NUMxNFx1NTAzQ1x1NjVGNlx1NEZERFx1NzU1OSoqXHVGRjFCXHU2NzJBXHU1OEYwXHU2NjBFXHU1MjE5XG4gKiAgIFx1NEUwRFx1NTE5OVx1OEJFNSBrZXl3b3JkXHVGRjBDXHU0RkREXHU2MzAxXHUzMDBDXHU2NzJBXHU1OEYwXHU2NjBFID0gXHU1QkJEXHU2NzdFXHUzMDBEXHU3Njg0XHU1MzlGXHU1OUNCXHU4QkVEXHU0RTQ5XHUzMDAyXHU2QjY0XHU1MjREXHU1QjlFXHU3M0IwXHU2NUUwXHU2NzYxXHU0RUY2XHU1MTk5XHU2MjEwXG4gKiAgIGBmYWxzZWBcdUZGMENcdTdCNDlcdTRFOEVcdTYyOEFcdTVCQkRcdTY3N0VcdTc2ODQgTUNQIGBpbnB1dFNjaGVtYWAgXHU5NzU5XHU5RUQ4XHU1MkEwXHU0RTI1XHU0RTNBXHUzMDBDXHU2MkQyXHU3RUREXHU5ODlEXHU1OTE2XHU1M0MyXHU2NTcwXHUzMDBEXHVGRjBDXG4gKiAgIFx1NEUwRVx1NThGMFx1NjYwRVx1NEUwRFx1NEUwMFx1ODFGNFx1RkYwQ1x1NURGMlx1NEZFRVx1NkI2M1x1MzAwMlxuICogLSBcdTY1NzBcdTdFQzQgYGl0ZW1zYCBcdTdGM0FcdTc3MDFcdTg5QzZcdTRFM0FcdTRFRkJcdTYxMEYgSlNPTlx1MzAwMlxuICpcbiAqIEBwYXJhbSByYXcgLSBNQ1AgXHU0RkE3XHU1MzlGXHU1OUNCIHNjaGVtYVx1RkYwOFx1NUJCRFx1Njc3RVx1N0VEM1x1Njc4NFx1RkYwOVx1MzAwMlxuICogQHJldHVybnMgXHU1M0Q3XHU2NTJGXHU2MzAxXHU3Njg0IHNjaGVtYSBcdTgyODJcdTcwQjlcdUZGMUJcdTY1RTBcdTZDRDVcdThCQzZcdTUyMkJcdTY1RjZcdThGRDRcdTU2REUgYHt9YFx1RkYwOFx1NEVGQlx1NjEwRiBKU09OXHVGRjA5XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTY2hlbWEocmF3OiB1bmtub3duKTogU3VwcG9ydGVkU2NoZW1hTm9kZSB7XG4gIGlmICghaXNSZWNvcmQocmF3KSkgcmV0dXJuIHt9O1xuXG4gIGNvbnN0IG91dDogU3VwcG9ydGVkU2NoZW1hTm9kZSA9IHt9O1xuXG4gIGlmICh0eXBlb2YgcmF3LmRlc2NyaXB0aW9uID09PSBcInN0cmluZ1wiKSBvdXQuZGVzY3JpcHRpb24gPSByYXcuZGVzY3JpcHRpb247XG4gIGlmICh0eXBlb2YgcmF3LnRpdGxlID09PSBcInN0cmluZ1wiKSBvdXQudGl0bGUgPSByYXcudGl0bGU7XG5cbiAgLy8gb25lT2YgXHU0RjE4XHU1MTQ4XHVGRjFBXHU0RTBFIHR5cGUgXHU0RTkyXHU2NUE1XHUzMDAyXG4gIC8vXG4gIC8vICoqXHU1MTQ0XHU1RjFGIGtleXdvcmQgXHU1NzI4XHU2QjY0XHU4OEFCXHU2NTc0XHU0RjUzXHU0RTIyXHU1RjAzKipcdUZGMDhgZW51bWAgLyBgY29uc3RgIC8gYHByb3BlcnRpZXNgIC8gYHJlcXVpcmVkYCAvXG4gIC8vIGBpdGVtc2AgLyBgYWRkaXRpb25hbFByb3BlcnRpZXNgIC8gYHR5cGVgXHVGRjA5XHUzMDAyXHU4RkQ5XHU2NjJGXHU2NzA5XHU2MTBGXHU3Njg0XHU1QkJEXHU2NzdFXHU1RjUyXHU0RTAwXHVGRjFBRFNIIFx1NUI1MFx1OTZDNlx1Nzk4MVx1NkI2MlxuICAvLyBcdTVCODNcdTRFRUNcdTRFMEUgYG9uZU9mYCBcdTUxNzFcdTVCNThcdUZGMENcdTgwMENcdTc3MUZcdTVCOUUgc2NoZW1hIFx1NUUzOFx1NjI4QSBgdHlwZWAgLyBgcHJvcGVydGllc2AgXHU0RTBFIGBvbmVPZmAgXHU1RTc2XHU1MTk5XHVGRjBDXG4gIC8vIFx1NEZERFx1NzU1OVx1NEYxQVx1OEJBOVx1NjNEMlx1NEVGNlx1NjU3NFx1NEY1M1x1NTJBMFx1OEY3RFx1NTkzMVx1OEQyNVx1MzAwMlx1NEVFM1x1NEVGN1x1NjYyRlx1OEJFNVx1NEY0RFx1N0Y2RVx1NEUwQVx1NzY4NFx1NTNENlx1NTAzQ1x1N0VBNlx1Njc1Rlx1NEUwRFx1NTE4RFx1NzUxRlx1NjU0OFx1MjAxNFx1MjAxNFxuICAvLyBcdTRGOEJcdUZGMUFgeyBvbmVPZjogW1MoJ3N0cmluZycpLCBTKCdudW1iZXInKV0sIGVudW06IFsneCddIH1gIFx1MjE5MiBcdTUzRUFcdTUyNjkgYG9uZU9mYFx1RkYwQ1xuICAvLyBgZW51bWAgXHU0RTBEXHU1MThEXHU1M0MyXHU0RTBFXHU1MjI0XHU1QjlBXHVGRjA4KipcdTUzOUZcdTY4MzcqKiBzY2hlbWEgXHU0RUNEXHU4OEFCIGNoZWNrU3VwcG9ydGVkU2NoZW1hIFx1NEUwRVx1NUJCRlx1NEUzQlx1NjJEMlx1N0VERFx1RkYwOVx1MzAwMlxuICAvLyBcdTc1MzEgYHRlc3QvZHNoLXNjaGVtYS50ZXN0Lm1qc2AgXHU5NDg5XHU0RjRGXHVGRjBDXHU5MDdGXHU1MTREXHU4RkQ5XHU1M0U1XHU1MThEXHU2QjIxXHU1M0Q4XHU2MjEwXHU2NUUwXHU0RjhCXHU2NTJGXHU2NDkxXHU3Njg0XHU1QkEzXHU3OUYwXHUzMDAyXG4gIGlmIChBcnJheS5pc0FycmF5KHJhdy5vbmVPZikgJiYgcmF3Lm9uZU9mLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBicmFuY2hlcyA9IHJhdy5vbmVPZi5tYXAoKGJyYW5jaCkgPT4gbm9ybWFsaXplU2NoZW1hKGJyYW5jaCkpO1xuICAgIGlmIChicmFuY2hlcy5sZW5ndGggPj0gMikge1xuICAgICAgb3V0Lm9uZU9mID0gYnJhbmNoZXM7XG4gICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgICAvLyBcdTUzNTVcdTY1MkYgb25lT2YgXHU5NzVFXHU2Q0Q1XHVGRjFBXHU5MDAwXHU1MzE2XHU0RTNBXHU4QkU1XHU2NTJGXHU2NzJDXHU4RUFCXHUzMDAyXG4gICAgcmV0dXJuIGJyYW5jaGVzWzBdID8/IHt9O1xuICB9XG5cbiAgY29uc3QgZGVjbGFyZWRUeXBlID0gdHlwZW9mIHJhdy50eXBlID09PSBcInN0cmluZ1wiID8gcmF3LnR5cGUgOiB1bmRlZmluZWQ7XG5cbiAgaWYgKGRlY2xhcmVkVHlwZSAhPT0gdW5kZWZpbmVkICYmIFNDSEVNQV9UWVBFUy5oYXMoZGVjbGFyZWRUeXBlKSkge1xuICAgIG91dC50eXBlID0gZGVjbGFyZWRUeXBlIGFzIFN1cHBvcnRlZFNjaGVtYU5vZGVbXCJ0eXBlXCJdO1xuICB9XG5cbiAgLy8gZW51bSAvIGNvbnN0XHVGRjFBKipcdTUzOUZcdTY4MzdcdTRGRERcdTc1NTlcdUZGMENcdTRFMERcdTdCNUJcdTkwMDlcdTMwMDFcdTRFMERcdTRFMjJcdTVGMDMqKlx1MzAwMlxuICAvL1xuICAvLyBcdTY1RTlcdTUxNDhcdThGRDlcdTkxQ0NcdTUzRUFcdTU3MjhcdTY4MDdcdTkxQ0YgdHlwZSBcdTRFMEJcdTRGRERcdTc1NTlcdUZGMENcdTVFNzZcdTc1MjggZmlsdGVyIFx1NEUyMlx1NjM4OVx1OTc1RVx1NjgwN1x1OTFDRlx1NTNENlx1NTAzQ1x1MjAxNFx1MjAxNFx1OTBBM1x1NjYyRlx1OTc1OVx1OUVEOFx1NjUzRVx1NUJCRFx1RkYxQVxuICAvLyBcdTMwMENcdTVGQzVcdTk4N0JcdTY2MkYge2E6MX1cdTMwMERcdTg4QUJcdTYwODRcdTYwODRcdTk2NERcdTdFQTdcdTRFM0FcdTMwMENcdTRFRkJcdTYxMEZcdTUwM0NcdTMwMERcdTMwMDJcdTY1RTJcdTcxMzZcdTVCQkZcdTRFM0JcdTVCRjlcdTU0MENcdTRFMDBcdTRFRkQgc2NoZW1hIFx1NjYyRlx1NzZGNFx1NjNBNVxuICAvLyBcdTYyRDJcdTdFRERcdUZGMDhgZW51bSBtdXN0IGJlIGEgbm9uLWVtcHR5IGFycmF5IG9mIDx0eXBlPiB2YWx1ZXNgXHVGRjA5XHVGRjBDXHU2NzJDXHU2QTIxXHU1NzU3XHU1QzMxXHU1OTgyXHU1QjlFXHU0RkREXHU3NTU5XG4gIC8vIFx1N0VBNlx1Njc1Rlx1RkYwQ1x1NjI4QVx1NTIyNFx1NUI5QVx1NEVBNFx1N0VEOVx1NkNFOFx1NTE4Q1x1NjcxRlx1ODFFQVx1NjhDMFx1RkYwQ1x1ODg0Q1x1NEUzQVx1NEUwRVx1NUJCRlx1NEUzQlx1NEUwMFx1ODFGNFx1MzAwMlxuICBpZiAocmF3LmVudW0gIT09IHVuZGVmaW5lZCkgb3V0LmVudW0gPSByYXcuZW51bTtcbiAgaWYgKHJhdy5jb25zdCAhPT0gdW5kZWZpbmVkKSBvdXQuY29uc3QgPSByYXcuY29uc3Q7XG5cbiAgLy8gXHU2NTcwXHU3RUM0IGl0ZW1zXHUzMDAyXG4gIGlmIChvdXQudHlwZSA9PT0gXCJhcnJheVwiICYmIHJhdy5pdGVtcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgb3V0Lml0ZW1zID0gbm9ybWFsaXplU2NoZW1hKHJhdy5pdGVtcyk7XG4gIH1cblxuICAvLyBcdTVCRjlcdThDNjEgcHJvcGVydGllcyAvIHJlcXVpcmVkIC8gYWRkaXRpb25hbFByb3BlcnRpZXNcdTMwMDJcbiAgY29uc3QgbG9va3NPYmplY3QgPSBvdXQudHlwZSA9PT0gXCJvYmplY3RcIiB8fCBpc1JlY29yZChyYXcucHJvcGVydGllcyk7XG4gIGlmIChsb29rc09iamVjdCkge1xuICAgIG91dC50eXBlID0gXCJvYmplY3RcIjtcbiAgICBjb25zdCBwcm9wczogUmVjb3JkPHN0cmluZywgU3VwcG9ydGVkU2NoZW1hTm9kZT4gPSB7fTtcbiAgICBpZiAoaXNSZWNvcmQocmF3LnByb3BlcnRpZXMpKSB7XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhyYXcucHJvcGVydGllcykpIHtcbiAgICAgICAgcHJvcHNba2V5XSA9IG5vcm1hbGl6ZVNjaGVtYSh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChPYmplY3Qua2V5cyhwcm9wcykubGVuZ3RoID4gMCkgb3V0LnByb3BlcnRpZXMgPSBwcm9wcztcblxuICAgIC8vIHJlcXVpcmVkIFx1NUZDNVx1OTg3Qlx1NTE2OFx1OTBFOFx1ODQzRFx1NTcyOCBwcm9wZXJ0aWVzIFx1NEU0Qlx1NTE4NVx1RkYwQ1x1NTQyNlx1NTIxOSBEU0ggXHU2MkQyXHU3RUREXHU4QkU1IHNjaGVtYVx1MzAwMlxuICAgIGNvbnN0IG5hbWVzID0gQXJyYXkuaXNBcnJheShyYXcucmVxdWlyZWQpXG4gICAgICA/IHJhdy5yZXF1aXJlZC5maWx0ZXIoKG4pOiBuIGlzIHN0cmluZyA9PiB0eXBlb2YgbiA9PT0gXCJzdHJpbmdcIiAmJiBPYmplY3QuaGFzT3duKHByb3BzLCBuKSlcbiAgICAgIDogW107XG4gICAgaWYgKG5hbWVzLmxlbmd0aCA+IDApIG91dC5yZXF1aXJlZCA9IG5hbWVzO1xuXG4gICAgLy8gXHU1M0VBXHU1NzI4XHU0RjVDXHU4MDA1XHU2NjNFXHU1RjBGXHU1OEYwXHU2NjBFXHU1RTAzXHU1QzE0XHU1MDNDXHU2NUY2XHU0RkREXHU3NTU5XHVGRjBDXHU0RTBEXHU2NEM1XHU4MUVBXHU1MkEwXHU0RTI1XHU0RTNBIGZhbHNlXHUzMDAyXG4gICAgaWYgKHR5cGVvZiByYXcuYWRkaXRpb25hbFByb3BlcnRpZXMgPT09IFwiYm9vbGVhblwiKSBvdXQuYWRkaXRpb25hbFByb3BlcnRpZXMgPSByYXcuYWRkaXRpb25hbFByb3BlcnRpZXM7XG4gIH1cblxuICByZXR1cm4gb3V0O1xufVxuXG4vKipcbiAqIFx1NjgyMVx1OUE4Q1x1NEUwMFx1NEUyQSBzY2hlbWEgXHU2NjJGXHU1NDI2XHU4NDNEXHU1NzI4XHU1M0Q3XHU2NTJGXHU2MzAxXHU1QjUwXHU5NkM2XHU1MTg1XHVGRjA4XHU1QkY5XHU5RjUwXHU1QkJGXHU0RTNCIGBhc3NlcnRTdXBwb3J0ZWRKc29uU2NoZW1hYFx1RkYwOVx1MzAwMlxuICpcbiAqIFx1OEZEOVx1NjYyRioqXHU2Q0U4XHU1MThDXHU2NzFGXHU4MUVBXHU2OEMwKipcdTc2ODRcdTZCNjNcdTc4NkVcdThGOTNcdTUxNjVcdUZGMUFzY2hlbWEgXHU2NzJDXHU4RUFCXHU2NjJGXHU5NzU5XHU2MDAxXHU2NTcwXHU2MzZFXHVGRjBDXHU1M0VGXHU1NzI4XHU2QjY0XHU1MjI0XHU1QjlBXHVGRjFCXHU4MDBDXG4gKiBjYW5vbmljYWwgdmFsdWUgXHU1M0VBXHU4MEZEXHU1NzI4XHU4RkQwXHU4ODRDXHU2NUY2XHU2NzA5XHU1MDNDXHVGRjBDXHU2NTQ1XHU0RTBEXHU1NzI4XHU2QjY0XHU1OTA0XHU1MDQ3XHU4OEM1XHU2ODIxXHU5QThDXHU1RTM4XHU5MUNGXHUzMDAyXG4gKlxuICogQHBhcmFtIHNjaGVtYSAtIFx1NUY4NVx1NjgyMVx1OUE4Q1x1NzY4NFx1NTM5Rlx1NTlDQiBzY2hlbWFcdTMwMDJcbiAqIEBwYXJhbSBwYXRoIC0gXHU4QkNBXHU2NUFEXHU4REVGXHU1Rjg0XHU1MjREXHU3RjAwXHUzMDAyXG4gKiBAcmV0dXJucyBcdThGRERcdTg5QzRcdTYzQ0ZcdThGRjBcdTUyMTdcdTg4NjhcdUZGMUJcdTdBN0FcdTY1NzBcdTdFQzRcdTRFRTNcdTg4NjhcdTkwMUFcdThGQzdcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrU3VwcG9ydGVkU2NoZW1hKHNjaGVtYTogdW5rbm93biwgcGF0aCA9IFwic2NoZW1hXCIpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHZpb2xhdGlvbnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHVua25vd24+KCk7XG4gIGNvbnN0IHdhbGsgPSAobm9kZTogdW5rbm93biwgYXQ6IHN0cmluZyk6IHZvaWQgPT4ge1xuICAgIGlmICghaXNSZWNvcmQobm9kZSkpIHtcbiAgICAgIHZpb2xhdGlvbnMucHVzaChgJHthdH0gbXVzdCBiZSBhIHNjaGVtYSBvYmplY3RgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHNlZW4uaGFzKG5vZGUpKSB7XG4gICAgICB2aW9sYXRpb25zLnB1c2goYCR7YXR9IGlzIGNpcmN1bGFyYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNlZW4uYWRkKG5vZGUpO1xuICAgIHRyeSB7XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhub2RlKSkge1xuICAgICAgICBpZiAoQ09OU1RSQUlOVF9LRVlXT1JEUy5oYXMoa2V5KSkgY29udGludWU7XG4gICAgICAgIGlmIChBTk5PVEFUSU9OX0tFWVdPUkRTLmhhcyhrZXkpKSB7XG4gICAgICAgICAgaWYgKCFpc0xvc3NsZXNzSnNvbihub2RlW2tleV0pKSB2aW9sYXRpb25zLnB1c2goYCR7YXR9LiR7a2V5fSBhbm5vdGF0aW9uIG11c3QgYmUgbG9zc2xlc3MgSlNPTiBkYXRhYCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxuICAgICAgICAgIGAke2F0fS4ke2tleX0gaXMgbm90IGEgc3VwcG9ydGVkIGtleXdvcmQgKHN1YnNldDogdHlwZS9vbmVPZi9wcm9wZXJ0aWVzL3JlcXVpcmVkL2FkZGl0aW9uYWxQcm9wZXJ0aWVzL2l0ZW1zL2VudW0vY29uc3QgKyBhbm5vdGF0aW9ucylgLFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgaWYgKE9iamVjdC5oYXNPd24obm9kZSwgXCJkZXNjcmlwdGlvblwiKSAmJiB0eXBlb2Ygbm9kZS5kZXNjcmlwdGlvbiAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICB2aW9sYXRpb25zLnB1c2goYCR7YXR9LmRlc2NyaXB0aW9uIG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICAgIH1cbiAgICAgIGlmIChPYmplY3QuaGFzT3duKG5vZGUsIFwidGl0bGVcIikgJiYgdHlwZW9mIG5vZGUudGl0bGUgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKGAke2F0fS50aXRsZSBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGhhc1R5cGUgPSBPYmplY3QuaGFzT3duKG5vZGUsIFwidHlwZVwiKTtcbiAgICAgIGNvbnN0IGhhc09uZU9mID0gT2JqZWN0Lmhhc093bihub2RlLCBcIm9uZU9mXCIpO1xuICAgICAgaWYgKGhhc1R5cGUgJiYgaGFzT25lT2YpIHtcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKGAke2F0fSBjYW5ub3QgZGVjbGFyZSBib3RoIHR5cGUgYW5kIG9uZU9mYCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghaGFzVHlwZSAmJiAhaGFzT25lT2YpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT05FX09GX1NJQkxJTkdfS0VZV09SRFMpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0Lmhhc093bihub2RlLCBrZXkpKSB2aW9sYXRpb25zLnB1c2goYCR7YXR9LiR7a2V5fSByZXF1aXJlcyB0eXBlIG9yIG9uZU9mYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGFzT25lT2YpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT05FX09GX1NJQkxJTkdfS0VZV09SRFMpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0Lmhhc093bihub2RlLCBrZXkpKSB2aW9sYXRpb25zLnB1c2goYCR7YXR9LiR7a2V5fSBpcyBub3Qgc3VwcG9ydGVkIGJlc2lkZSBvbmVPZmApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9uZU9mID0gbm9kZS5vbmVPZjtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG9uZU9mKSB8fCBvbmVPZi5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKGAke2F0fS5vbmVPZiBtdXN0IGJlIGFuIGFycmF5IG9mIGF0IGxlYXN0IHR3byBzY2hlbWFzYCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG9uZU9mLmZvckVhY2goKGJyYW5jaCwgaW5kZXgpID0+IHdhbGsoYnJhbmNoLCBgJHthdH0ub25lT2ZbJHtpbmRleH1dYCkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHR5cGUgPSBub2RlLnR5cGU7XG4gICAgICBpZiAodHlwZW9mIHR5cGUgIT09IFwic3RyaW5nXCIgfHwgIVNDSEVNQV9UWVBFUy5oYXModHlwZSkpIHtcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxuICAgICAgICAgIEFycmF5LmlzQXJyYXkodHlwZSlcbiAgICAgICAgICAgID8gYCR7YXR9LnR5cGUgbXVzdCBiZSBhIHNpbmdsZSB0eXBlIHN0cmluZyAodHlwZSBhcnJheXMgYXJlIG5vdCBzdXBwb3J0ZWQpYFxuICAgICAgICAgICAgOiBgJHthdH0udHlwZSBtdXN0IGJlIG9uZSBvZiAke1suLi5TQ0hFTUFfVFlQRVNdLmpvaW4oXCIvXCIpfWAsXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYWxsb3dlZEZvcjogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xuICAgICAgICBwcm9wZXJ0aWVzOiBbXCJvYmplY3RcIl0sXG4gICAgICAgIHJlcXVpcmVkOiBbXCJvYmplY3RcIl0sXG4gICAgICAgIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBbXCJvYmplY3RcIl0sXG4gICAgICAgIGl0ZW1zOiBbXCJhcnJheVwiXSxcbiAgICAgICAgZW51bTogW1wic3RyaW5nXCIsIFwibnVtYmVyXCIsIFwiaW50ZWdlclwiLCBcImJvb2xlYW5cIiwgXCJudWxsXCJdLFxuICAgICAgICBjb25zdDogW1wic3RyaW5nXCIsIFwibnVtYmVyXCIsIFwiaW50ZWdlclwiLCBcImJvb2xlYW5cIiwgXCJudWxsXCJdLFxuICAgICAgfTtcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdHlwZXNdIG9mIE9iamVjdC5lbnRyaWVzKGFsbG93ZWRGb3IpKSB7XG4gICAgICAgIGlmIChPYmplY3QuaGFzT3duKG5vZGUsIGtleSkgJiYgIXR5cGVzLmluY2x1ZGVzKHR5cGUpKSB7XG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKGAke2F0fS4ke2tleX0gaXMgbm90IHN1cHBvcnRlZCBvbiB0eXBlIFwiJHt0eXBlfVwiYCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgXCJvYmplY3RcIjoge1xuICAgICAgICAgIGlmIChPYmplY3QuaGFzT3duKG5vZGUsIFwicHJvcGVydGllc1wiKSkge1xuICAgICAgICAgICAgaWYgKCFpc1JlY29yZChub2RlLnByb3BlcnRpZXMpKSB7XG4gICAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChgJHthdH0ucHJvcGVydGllcyBtdXN0IGJlIGFuIG9iamVjdCBvZiBzY2hlbWFzYCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIGNoaWxkXSBvZiBPYmplY3QuZW50cmllcyhub2RlLnByb3BlcnRpZXMpKSB7XG4gICAgICAgICAgICAgICAgd2FsayhjaGlsZCwgYCR7YXR9LnByb3BlcnRpZXMuJHtrZXl9YCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKE9iamVjdC5oYXNPd24obm9kZSwgXCJyZXF1aXJlZFwiKSkge1xuICAgICAgICAgICAgY29uc3QgcmVxdWlyZWQgPSBub2RlLnJlcXVpcmVkO1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHJlcXVpcmVkKSB8fCByZXF1aXJlZC5zb21lKChlbnRyeSkgPT4gdHlwZW9mIGVudHJ5ICE9PSBcInN0cmluZ1wiKSkge1xuICAgICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goYCR7YXR9LnJlcXVpcmVkIG11c3QgYmUgYW4gYXJyYXkgb2Ygc3RyaW5nc2ApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc3QgZGVjbGFyZWQgPSBpc1JlY29yZChub2RlLnByb3BlcnRpZXMpID8gbm9kZS5wcm9wZXJ0aWVzIDoge307XG4gICAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHJlcXVpcmVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFPYmplY3QuaGFzT3duKGRlY2xhcmVkLCBrZXkpKSB2aW9sYXRpb25zLnB1c2goYCR7YXR9LnJlcXVpcmVkIG5hbWVzIFwiJHtrZXl9XCIgd2hpY2ggaXMgbm90IGluIHByb3BlcnRpZXNgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoT2JqZWN0Lmhhc093bihub2RlLCBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCIpICYmIHR5cGVvZiBub2RlLmFkZGl0aW9uYWxQcm9wZXJ0aWVzICE9PSBcImJvb2xlYW5cIikge1xuICAgICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKGAke2F0fS5hZGRpdGlvbmFsUHJvcGVydGllcyBtdXN0IGJlIGEgYm9vbGVhbmApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBcImFycmF5XCI6IHtcbiAgICAgICAgICBpZiAoT2JqZWN0Lmhhc093bihub2RlLCBcIml0ZW1zXCIpKSB3YWxrKG5vZGUuaXRlbXMsIGAke2F0fS5pdGVtc2ApO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgaWYgKE9iamVjdC5oYXNPd24obm9kZSwgXCJlbnVtXCIpKSB7XG4gICAgICAgICAgICBjb25zdCBhbGxvd2VkID0gbm9kZS5lbnVtO1xuICAgICAgICAgICAgY29uc3QgdmFsaWQgPVxuICAgICAgICAgICAgICBBcnJheS5pc0FycmF5KGFsbG93ZWQpICYmIGFsbG93ZWQubGVuZ3RoID4gMCAmJiBhbGxvd2VkLmV2ZXJ5KChlbnRyeSkgPT4gc2NhbGFyTWF0Y2hlcyh0eXBlLCBlbnRyeSkpO1xuICAgICAgICAgICAgaWYgKCF2YWxpZCkgdmlvbGF0aW9ucy5wdXNoKGAke2F0fS5lbnVtIG11c3QgYmUgYSBub24tZW1wdHkgYXJyYXkgb2YgJHt0eXBlfSB2YWx1ZXNgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKE9iamVjdC5oYXNPd24obm9kZSwgXCJjb25zdFwiKSkge1xuICAgICAgICAgICAgY29uc3QgZGVjbGFyZWQgPSBub2RlLmNvbnN0O1xuICAgICAgICAgICAgaWYgKCFzY2FsYXJNYXRjaGVzKHR5cGUsIGRlY2xhcmVkKSkge1xuICAgICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goYCR7YXR9LmNvbnN0IG11c3QgYmUgYSAke3R5cGV9IHZhbHVlYCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkobm9kZS5lbnVtKSAmJiBub2RlLmVudW0ubGVuZ3RoID4gMCAmJiAhbm9kZS5lbnVtLmluY2x1ZGVzKGRlY2xhcmVkKSkge1xuICAgICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goYCR7YXR9LmNvbnN0IG11c3QgYmUgb25lIG9mICR7YXR9LmVudW0gd2hlbiBib3RoIGFyZSBkZWNsYXJlZGApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2Vlbi5kZWxldGUobm9kZSk7XG4gICAgfVxuICB9O1xuICB3YWxrKHNjaGVtYSwgcGF0aCk7XG4gIHJldHVybiB2aW9sYXRpb25zO1xufVxuXG4vKipcbiAqIFx1NjgyMVx1OUE4Q1x1NEUwMFx1NEUyQVx1NTAzQ1x1NjYyRlx1NTQyNlx1NkVFMVx1OERCMyB7QGxpbmsgU3VwcG9ydGVkU2NoZW1hTm9kZX0gXHU3Njg0XHU1MjI0XHU1QjlBXHU4QkVEXHU0RTQ5XHUzMDAyXG4gKlxuICogXHU1MjI0XHU1QjlBXHU0RTBFIERTSCBcdTc2ODQgYHZhbGlkYXRlSnNvblNjaGVtYVZhbHVlYCBcdTVCRjlcdTlGNTBcdUZGMDhcdTUzRUFcdTg5ODZcdTc2RDZcdTUzRDdcdTY1MkZcdTYzMDFcdTVCNTBcdTk2QzZcdUZGMDlcdUZGMENcbiAqIFx1NzUyOFx1NEU4RVx1OEY5M1x1NTFGQVx1NTAzQ1x1NTZERVx1NUY1Mlx1NjVBRFx1OEEwMFx1RkYwQ1x1NEUwRFx1NEY5RFx1OEQ1NiBEU0ggXHU1MTg1XHU5MEU4XHU1QjlFXHU3M0IwXHVGRjFCKipcdThCQ0FcdTY1QURcdTY1ODdcdTY4NDhcdTRFMERcdTRGRERcdThCQzFcdTkwMTBcdTVCNTdcdTRFMDBcdTgxRjQqKlx1MzAwMlxuICogXHU1QkY5XHU5RjUwXHU3MEI5XHVGRjFBYHR5cGVgIFx1NTIyNFx1NUI5QVx1NTE0OFx1NEU4RSBgZW51bWAgLyBgY29uc3RgXHVGRjFCYHVuZGVmaW5lZGBcdTMwMDFcdTk3NUVcdTY3MDlcdTk2NTBcdTY1NzBcdTMwMDFgLTBgXHUzMDAxXG4gKiBcdTdBMDBcdTc1OEZcdTY1NzBcdTdFQzRcdTMwMDFcdTk3NUVcdTY2NkVcdTkwMUFcdTUzOUZcdTU3OEJcdTVCRjlcdThDNjFcdTYzMDkgbG9zc2xlc3MgSlNPTiBcdThGQjlcdTc1NENcdTYyRDJcdTdFRERcdTMwMDJcbiAqXG4gKiBAcGFyYW0gc2NoZW1hIC0gXHU1REYyXHU4OUM0XHU4MzAzXHU1MzE2XHU3Njg0IHNjaGVtYVx1MzAwMlxuICogQHBhcmFtIHZhbHVlIC0gXHU1Rjg1XHU2ODIxXHU5QThDXHU3Njg0XHU1MDNDXHUzMDAyXG4gKiBAcGFyYW0gcGF0aCAtIFx1OEJDQVx1NjVBRFx1OERFRlx1NUY4NFx1NTI0RFx1N0YwMFx1MzAwMlxuICogQHJldHVybnMgXHU4RkREXHU4OUM0XHU2M0NGXHU4RkYwXHU1MjE3XHU4ODY4XHVGRjFCXHU3QTdBXHU2NTcwXHU3RUM0XHU0RUUzXHU4ODY4XHU5MDFBXHU4RkM3XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUFnYWluc3RTY2hlbWEoc2NoZW1hOiBTdXBwb3J0ZWRTY2hlbWFOb2RlLCB2YWx1ZTogdW5rbm93biwgcGF0aCA9IFwidmFsdWVcIik6IHN0cmluZ1tdIHtcbiAgaWYgKHNjaGVtYS5vbmVPZiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbWF0Y2hlZCA9IHNjaGVtYS5vbmVPZi5maWx0ZXIoKGJyYW5jaCkgPT4gdmFsaWRhdGVBZ2FpbnN0U2NoZW1hKGJyYW5jaCwgdmFsdWUsIHBhdGgpLmxlbmd0aCA9PT0gMCk7XG4gICAgcmV0dXJuIG1hdGNoZWQubGVuZ3RoID09PSAxID8gW10gOiBbYFwiJHtwYXRofVwiIG11c3QgbWF0Y2ggZXhhY3RseSBvbmUgb25lT2YgYnJhbmNoIChtYXRjaGVkICR7bWF0Y2hlZC5sZW5ndGh9KWBdO1xuICB9XG5cbiAgLy8gXHU2NUUwIHR5cGUgXHU3Njg0XHU2Q0U4XHU4OUUzXHU1RjBGXHU4MjgyXHU3MEI5XHVGRjFBXHU1M0VBXHU4OTgxXHU2QzQyXHU2NjJGIGxvc3NsZXNzIEpTT05cdTMwMDJcbiAgaWYgKHNjaGVtYS50eXBlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gaXNMb3NzbGVzc0pzb24odmFsdWUpID8gW10gOiBbYFwiJHtwYXRofVwiIG11c3QgYmUgYSBsb3NzbGVzcyBKU09OIHZhbHVlYF07XG4gIH1cblxuICBjb25zdCBlbnVtVmlvbGF0aW9uID0gKCk6IHN0cmluZ1tdID0+IHtcbiAgICAvLyBcdTUzRUFcdTU3MjhcdTg5QzRcdTgzMDNcdTUzMTZcdTU0MEVcdTkwMUFcdThGQzdcdTgxRUFcdTY4QzBcdTc2ODQgc2NoZW1hIFx1NEUwQVx1OEMwM1x1NzUyOFx1RkYwQ1x1NjU0NSBgZW51bWAgXHU2QjYzXHU1RTM4XHU1RkM1XHU0RTNBXHU5NzVFXHU3QTdBXHU2NTcwXHU3RUM0XHUzMDAyXHU1RjYyXHU3MkI2XHU1MTVDXHU1RTk1XG4gICAgLy8gXHU4RDcwICoqZmFpbC1jbG9zZWQqKlx1RkYxQVx1NzU3OFx1NUY2MiBgZW51bWBcdUZGMDhcdTU5ODIgYHsgZW51bTogeyBhOiAxIH0gfWBcdUZGMDlcdThGRDRcdTU2REVcdThGRERcdTg5QzRcdUZGMENcdTgwMENcdTRFMERcdTY2MkZcbiAgICAvLyBcdTk3NTlcdTlFRDhcdTY1M0VcdThGQzdcdTMwMDJcdThGRDlcdTY3NjFcdThERUZcdTVGODRcdTc1MUZcdTRFQTdcdTRFMEFcdTRFMERcdTUzRUZcdThGQkVcdUZGMDhcdTZDRThcdTUxOENcdTY3MUZcdTgxRUFcdTY4QzBcdTUxNDhcdTYyRDJcdUZGMDlcdUZGMENcdTRGNDZcdTMwMENcdTZCN0JcdThERUZcdTVGODRcdTRFMEFcdTRFNUZcdTVCODFcdTUzRUZcdTYyQTVcdTk1MTlcdTMwMDFcbiAgICAvLyBcdTRFMEQgZmFpbC1vcGVuXHUzMDBEXHU0RTBFIFx1RDgzRFx1REZFMS1EIFx1NzY4NFx1NTNENlx1NTQxMVx1NEUwMFx1ODFGNFx1MjAxNFx1MjAxNFx1NkI2NFx1NTI0RCBgQXJyYXkuaXNBcnJheSguLi4pICYmYCBcdTRGMUFcdTYyOEFcbiAgICAvLyBcdTMwMENcdTYyOUIgVHlwZUVycm9yXHUzMDBEXHU2MDg0XHU2MDg0XHU2NTM5XHU2MjEwXHUzMDBDUEFTU1x1MzAwRFx1RkYwQ1x1NjVCOVx1NTQxMVx1NkI2M1x1NTk3RFx1NzZGOFx1NTNDRFx1MzAwMlxuICAgIC8vIFx1NkNFOFx1RkYxQVx1NUJCRlx1NEUzQlx1NUJGOSBgeyBlbnVtOiAnYWJjJyB9YCBcdTRGMUFcdTkwMDBcdTUzMTZcdTYyMTAgYFN0cmluZy5wcm90b3R5cGUuaW5jbHVkZXNgXHVGRjA4XHU0RTBEXHU1MDY1XHU1MTY4XHVGRjA5XHVGRjBDXG4gICAgLy8gXHU2NzJDXHU2QTIxXHU1NzU3XHU0RTBEXHU2QTIxXHU0RUZGXHU4QkU1XHU4ODRDXHU0RTNBXHVGRjBDXHU5NzVFXHU2NTcwXHU3RUM0XHU0RTAwXHU1RjhCXHU1MjI0XHU3NTc4XHU1RjYyXHUyMDE0XHUyMDE0XHU4QkU1XHU1MjA2XHU2QjY3XHU2NjJGKipcdTY3MDlcdTYxMEZcdTc2ODRcdTY2RjRcdTRFMjUqKlx1RkYwQ1x1NjYzRVx1NUYwRlx1NzY3Qlx1OEJCMFx1NTcyOFxuICAgIC8vIGB0ZXN0L2RzaC1zY2hlbWEudGVzdC5tanNgIFx1NzY4NCBgS05PV05fRElWRVJHRU5DRVNgXHVGRjBDXHU1RTc2XHU1MTk5XHU4RkRCIGBkb2NzL2RzaC1jb21wYXQubWRgXHUzMDAyXG4gICAgLy8gXHU3QTdBIGBlbnVtYCBcdTRFMERcdTk3MDBcdTg5ODFcdTUzNTVcdTUyMTdcdTUyMDZcdTY1MkZcdUZGMUFgW10uaW5jbHVkZXModilgIFx1NjA1Mlx1NEUzQSBmYWxzZVx1RkYwQ1x1NjcyQ1x1NUMzMVx1OEQ3MFx1OEZERFx1ODlDNFx1RkYwOFx1NjVFOVx1NTE0OFx1NTkxQVx1NTE5OVx1NzY4NFxuICAgIC8vIGBsZW5ndGggPT09IDAgfHxgIFx1NjYyRlx1NTE5N1x1NEY1OVx1OTg3OVx1RkYwQ1x1NTIyMFx1NjM4OVx1NTQwRVx1NTE2OFx1OTFDRlx1NEVDRFx1N0VGRlx1RkYwOVx1MzAwMlxuICAgIGlmIChzY2hlbWEuZW51bSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoc2NoZW1hLmVudW0pKSB7XG4gICAgICAgIHJldHVybiBbYFwiJHtwYXRofVwiIHNjaGVtYS5lbnVtIGlzIG1hbGZvcm1lZCAobXVzdCBiZSBhIG5vbi1lbXB0eSBhcnJheSlgXTtcbiAgICAgIH1cbiAgICAgIGlmICghc2NoZW1hLmVudW0uaW5jbHVkZXModmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBbYFwiJHtwYXRofVwiIG11c3QgYmUgb25lIG9mICR7SlNPTi5zdHJpbmdpZnkoc2NoZW1hLmVudW0pfWBdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2NoZW1hLmNvbnN0ICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IHNjaGVtYS5jb25zdCkge1xuICAgICAgcmV0dXJuIFtgXCIke3BhdGh9XCIgbXVzdCBiZSAke0pTT04uc3RyaW5naWZ5KHNjaGVtYS5jb25zdCl9YF07XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfTtcblxuICBzd2l0Y2ggKHNjaGVtYS50eXBlKSB7XG4gICAgY2FzZSBcIm51bGxcIjpcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gbnVsbCA/IGVudW1WaW9sYXRpb24oKSA6IFtgXCIke3BhdGh9XCIgbXVzdCBiZSBudWxsYF07XG4gICAgY2FzZSBcImJvb2xlYW5cIjpcbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwiYm9vbGVhblwiID8gZW51bVZpb2xhdGlvbigpIDogW2BcIiR7cGF0aH1cIiBtdXN0IGJlIGEgYm9vbGVhbmBdO1xuICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBlbnVtVmlvbGF0aW9uKCkgOiBbYFwiJHtwYXRofVwiIG11c3QgYmUgYSBzdHJpbmdgXTtcbiAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm51bWJlclwiKSByZXR1cm4gW2BcIiR7cGF0aH1cIiBtdXN0IGJlIGEgbnVtYmVyYF07XG4gICAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHZhbHVlKSAmJiAhT2JqZWN0LmlzKHZhbHVlLCAtMCkgPyBlbnVtVmlvbGF0aW9uKCkgOiBbYFwiJHtwYXRofVwiIG11c3QgYmUgYSBmaW5pdGUgSlNPTiBudW1iZXJgXTtcbiAgICBjYXNlIFwiaW50ZWdlclwiOlxuICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiBOdW1iZXIuaXNGaW5pdGUodmFsdWUpICYmICFPYmplY3QuaXModmFsdWUsIC0wKSAmJiBOdW1iZXIuaXNJbnRlZ2VyKHZhbHVlKVxuICAgICAgICA/IGVudW1WaW9sYXRpb24oKVxuICAgICAgICA6IFtgXCIke3BhdGh9XCIgbXVzdCBiZSBhbiBpbnRlZ2VyYF07XG4gICAgY2FzZSBcImFycmF5XCI6IHtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHJldHVybiBbYFwiJHtwYXRofVwiIG11c3QgYmUgYW4gYXJyYXlgXTtcbiAgICAgIGNvbnN0IHZpb2xhdGlvbnM6IHN0cmluZ1tdID0gW107XG4gICAgICBpZiAoc2NoZW1hLml0ZW1zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFsdWUuZm9yRWFjaCgoaXRlbSwgaSkgPT4gdmlvbGF0aW9ucy5wdXNoKC4uLnZhbGlkYXRlQWdhaW5zdFNjaGVtYShzY2hlbWEuaXRlbXMhLCBpdGVtLCBgJHtwYXRofVske2l9XWApKSk7XG4gICAgICB9XG4gICAgICAvLyBcdTRFMEVcdTVCQkZcdTRFM0JcdTRFMDBcdTgxRjRcdUZGMUFpdGVtcyBcdThGRERcdTg5QzRcdTRGMThcdTUxNDhcdTRFOEUgbG9zc2xlc3MgXHU4RkI5XHU3NTRDXHVGRjA4XHU3QTAwXHU3NThGXHU2NTcwXHU3RUM0XHU3NTMxIGxvc3NsZXNzIFx1NTE1Q1x1NUU5NVx1RkYwOVx1MzAwMlxuICAgICAgaWYgKHZpb2xhdGlvbnMubGVuZ3RoID4gMCkgcmV0dXJuIHZpb2xhdGlvbnM7XG4gICAgICByZXR1cm4gaXNMb3NzbGVzc0pzb24odmFsdWUpID8gW10gOiBbYFwiJHtwYXRofVwiIG11c3QgYmUgYSBkZW5zZSBsb3NzbGVzcyBKU09OIGFycmF5YF07XG4gICAgfVxuICAgIGNhc2UgXCJvYmplY3RcIjoge1xuICAgICAgaWYgKCFpc1BsYWluUmVjb3JkKHZhbHVlKSkgcmV0dXJuIFtgXCIke3BhdGh9XCIgbXVzdCBiZSBhbiBvYmplY3RgXTtcbiAgICAgIGNvbnN0IHByb3BzID0gc2NoZW1hLnByb3BlcnRpZXMgPz8ge307XG4gICAgICBjb25zdCB2aW9sYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIHNjaGVtYS5yZXF1aXJlZCA/PyBbXSkge1xuICAgICAgICBpZiAoIU9iamVjdC5oYXNPd24odmFsdWUsIG5hbWUpIHx8IHZhbHVlW25hbWVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goYG1pc3NpbmcgcmVxdWlyZWQgcHJvcGVydHkgXCIke3BhdGh9LiR7bmFtZX1cImApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2NoZW1hLmFkZGl0aW9uYWxQcm9wZXJ0aWVzID09PSBmYWxzZSkge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh2YWx1ZSkpIHtcbiAgICAgICAgICBpZiAoIU9iamVjdC5oYXNPd24ocHJvcHMsIGtleSkpIHtcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChgXCIke3BhdGh9LiR7a2V5fVwiIGlzIG5vdCBhIGRlY2xhcmVkIHByb3BlcnR5IChhZGRpdGlvbmFsUHJvcGVydGllczogZmFsc2UpYCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGNoaWxkXSBvZiBPYmplY3QuZW50cmllcyhwcm9wcykpIHtcbiAgICAgICAgaWYgKE9iamVjdC5oYXNPd24odmFsdWUsIGtleSkgJiYgdmFsdWVba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKC4uLnZhbGlkYXRlQWdhaW5zdFNjaGVtYShjaGlsZCwgdmFsdWVba2V5XSwgYCR7cGF0aH0uJHtrZXl9YCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAodmlvbGF0aW9ucy5sZW5ndGggPiAwKSByZXR1cm4gdmlvbGF0aW9ucztcbiAgICAgIHJldHVybiBpc0xvc3NsZXNzSnNvbih2YWx1ZSkgPyBbXSA6IFtgXCIke3BhdGh9XCIgbXVzdCBiZSBhIGxvc3NsZXNzIEpTT04gb2JqZWN0YF07XG4gICAgfVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gW107XG4gIH1cbn1cbiIsICIvKipcbiAqIGRzaC1vcGVubGl1bGFuIGRlZXBzZWVrIGhhcm5lc3MgXHU4RkRCXHU3QTBCXHU1MTg1XHU2RDRGXHU4OUM4XHU1NjY4XHU2M0E3XHU1MjM2XHU2M0QyXHU0RUY2XHU1MTY1XHU1M0UzXHUzMDAyXG4gKlxuICogXHU2MjhBIGRzaC1vcGVubGl1bGFuIFx1NzY4NFx1N0VERlx1NEUwMCBBSSBcdTZENEZcdTg5QzhcdTU2NjhcdTYzQTdcdTUyMzZcdTY4NDZcdTY3QjZcdUZGMDhGb3JnZU1DUFx1RkYwOVx1NURFNVx1NTE3N1x1NkNFOFx1NTE4Q1x1NEUzQVxuICogZGVlcHNlZWsgaGFybmVzcyBcdTc2ODRcdTUzOUZcdTc1MUZcdTVERTVcdTUxNzdcdUZGMENcdTRGOUIgYWdlbnQgXHU3Njg0IHRvb2xfbG9vcCBcdTc2RjRcdTYzQTVcdThDMDNcdTc1MjhcdTMwMDJcbiAqXG4gKiBcdTVERTVcdTUxNzdcdTZFMDVcdTUzNTUqKlx1NzUzMSBgRm9yZ2VNY3AudG9vbHNgIFx1NTFCM1x1NUI5QSoqXHVGRjA4XHU2NzJDXHU2QTIxXHU1NzU3XHU0RTBEXHU3ODZDXHU3RjE2XHU3ODAxXHVGRjA5XHVGRjBDXHU1NkUwXHU2QjY0XHU1NDBFXHU3RUVEXHU2Mjc5XHU2QjIxXG4gKiBcdTVGODAgYEBvcGVubGl1bGFuL21jcC1zZXJ2ZXJgIFx1NTg5RVx1NTJBMFx1NURFNVx1NTE3N1x1RkYwOFx1NEY4Qlx1NTk4MiBJU1NVRSAjMjkgXHU3Njg0XHU2RTM4XHU2MjBGXHU3NTNCXHU1MENGXHU1REU1XHU1MTc3XHVGRjA5XG4gKiBcdTY1RjZcdUZGMENcdTYzRDJcdTRFRjZcdTRGMUFcdTgxRUFcdTUyQThcdThEREZcdTk2OEZcdUZGMENcdTRFMERcdTRGMUFcdTZGMEZcdTZDRThcdTUxOENcdTMwMDJcbiAqXG4gKiAjIyBJU1NVRSAjMzNcdUZGMUFcdTY1QjBcdTcyNDggRFNIIFx1OTAwMlx1OTE0RFx1RkYwOFx1NTE3Q1x1NUJCOVx1NjVFN1x1NzI0OFx1RkYwOVxuICpcbiAqIFx1NjVCMFx1NzI0OCBEU0hcdUZGMDhkc2gtdG9vbHMgYDAuMS42YCBcdTdFQkZcdUZGMDlcdTVCRjlcdTYzRDJcdTRFRjZcdTZDRThcdTUxOENcdTY3MDlcdTRFMDlcdTU5MDRcdTRGMUFcdTc2RjRcdTYzQTVcdTVGNzFcdTU0Q0RcdTUyQTBcdThGN0RcdTYyMTBcdThEMjVcdTc2ODRcbiAqIFx1NTNEOFx1NjZGNFx1RkYwQ1x1NjcyQ1x1NkEyMVx1NTc1N1x1NjMwOVx1MzAwQ1x1NjNBMlx1NkQ0QiBcdTIxOTIgXHU5MDAyXHU5MTREIFx1MjE5MiBcdTgxRUFcdTY4QzBcdTMwMERcdTRFMDlcdTZCNjVcdTUxN0NcdTVCQjlcdTY1QjBcdTY1RTdcdTRFMjRcdTcyNDhcdUZGMUFcbiAqXG4gKiAxLiAqKmBydW5fY29kZWAgXHU2NjJGXHU0RkREXHU3NTU5XHU1REU1XHU1MTc3XHU1NDBEKipcdTMwMDJcdTY1QjBcdTcyNDhcdTYyOEEgQ29kZSBNb2RlIFx1OTFDRFx1NTQ3RFx1NTQwRFx1NEUzQSBQVEMgbW9kZVx1RkYwQ1xuICogICAgYFRvb2xSdW50aW1lLnJlZ2lzdGVyKClgIFx1NUJGOSBgbmFtZSA9PT0gJ3J1bl9jb2RlJ2AgXHU3NkY0XHU2M0E1XHU2MjlCXHU5NTE5XHVGRjA4XHU2NUU3XHU3MjQ4XHU1NDBDXHU2ODM3XHU0RkREXHU3NTU5XHVGRjA5XHUzMDAyXG4gKiAgICAqKlx1NEUzQlx1OTYzMlx1N0VCRlx1NjYyRlx1NTQ3RFx1NTQwRFx1NTI0RFx1N0YwMCoqXHVGRjA4XHU5RUQ4XHU4QkE0IGBicm93c2VyX2BcdUZGMDlcdUZGMENcdTRGN0ZcdTYyNDBcdTY3MDlcdTVERTVcdTUxNzdcdTU0MERcdTU5MjlcdTcxMzZcdThGRENcdTc5QkJcdTRGRERcdTc1NTlcdTU0MERcdUZGMUJcbiAqICAgIHtAbGluayBhc3NlcnROb3RSZXNlcnZlZH0gXHU2NjJGKipcdTk2MzJcdTVGQTFcdTYwMjdcdTRGRERcdTc1NTkqKlx1RkYwQ1x1NzcxRlx1NUI5RVx1OERFRlx1NUY4NFx1NEUwQVx1OUVEOFx1OEJBNFx1NEUwRFx1NTNFRlx1OEZCRVx1RkYwQ1xuICogICAgXHU4QkU2XHU4OUMxXHU1MTc2XHU2NTg3XHU2ODYzXHUzMDAyXG4gKiAyLiAqKnNjaGVtYSBcdTUzRDdcdTVGM0FcdTUyMzYgSlNPTiBTY2hlbWEgXHU1QjUwXHU5NkM2XHU2ODIxXHU5QThDKipcdTMwMDJcdTY1QjBcdTcyNDhcdTU3MjggYHJlZ2lzdGVyKClgIFx1OTFDQ1x1NjI2N1x1ODg0Q1xuICogICAgYGFzc2VydFN1cHBvcnRlZEpzb25TY2hlbWEob3V0cHV0LnNjaGVtYSlgXHUzMDAyXHU2NzJDXHU2M0QyXHU0RUY2XHU2MjhBIE1DUCBcdTRGQTdcdTVCQkRcdTY3N0VcbiAqICAgIGBpbnB1dFNjaGVtYWAgXHU0RTBFXHU4RjkzXHU1MUZBIHNjaGVtYSBcdTdFREZcdTRFMDBcdThENzAge0BsaW5rIG5vcm1hbGl6ZVNjaGVtYX0gXHU2NTM2XHU2NTVCXHU1MjMwXHU1M0Q3XHU2NTJGXHU2MzAxXG4gKiAgICBcdTVCNTBcdTk2QzZcdUZGMENcdTVFNzZcdTU3MjhcdTZDRThcdTUxOENcdTUyNERcdTc1Mjgge0BsaW5rIGNoZWNrU3VwcG9ydGVkU2NoZW1hfSBcdTUwNUEqKlx1N0VEM1x1Njc4NFx1ODFFQVx1NjhDMCoqXHUyMDE0XHUyMDE0XG4gKiAgICBcdThGRERcdTg5QzRcdTUzNzNcdTYyOUJcdTk1MTlcdTMwMDFcdTUyQTBcdThGN0RcdTU5MzFcdThEMjVcdUZGMENcdTgwMENcdTRFMERcdTY2MkZcdTMwMENcdTg4QzVcdTRFMEFcdTRFODZcdTRGNDZcdThDMDNcdTc1MjhcdTUzNzNcdTcwQjhcdTMwMERcdTMwMDJcbiAqIDMuICoqYGV4ZWN1dGUoYXJncywgZXhlYylgIFx1NzY4NCBgZXhlYy5zaWduYWxgIFx1NUZDNVx1OTg3Qlx1ODhBQlx1NUMwQVx1OTFDRCoqXHUzMDAyXHU2NUIwXHU3MjQ4XHU4OTgxXHU2QzQyXHU1RjAyXHU2QjY1XHU1REU1XHU1MTc3XG4gKiAgICBcdTU0Q0RcdTVFOTRcdTUzRDZcdTZEODhcdUZGMENcdTVFNzZcdTU3MjggYm9keSBcdTU0MkZcdTUyQThcdTUyNEQgLyBcdTU0MkZcdTUyQThcdTU0MEVcdTc2ODRcdTUzRDZcdTZEODhcdTdBOTdcdTUzRTNcdTRFMEFcdThGRDRcdTU2REVcbiAqICAgIGBBQk9SVEVEX0JFRk9SRV9ESVNQQVRDSGAgLyBgQUJPUlRFRGBcdTMwMDJcdTY3MkNcdTYzRDJcdTRFRjZcdTU3MjggYGV4ZWN1dGVgIFx1NTE2NVx1NTNFM1x1NTA1QVxuICogICAgYHRocm93SWZBYm9ydGVkKClgXHVGRjBDXHU2MjhBXHUzMDBDXHU1REYyXHU0RTJEXHU2QjYyXHU3Njg0XHU4QzAzXHU3NTI4XHUzMDBEXHU1NzI4XHU4OUU2XHU4RkJFXHU2RDRGXHU4OUM4XHU1NjY4XHU1MjREXHU2MjJBXHU2NUFEXHVGRjBDXHU0RTBFXHU1QkJGXHU0RTNCXHU4QkVEXHU0RTQ5XHU1QkY5XHU5RjUwXHUzMDAyXG4gKlxuICogXHU1NDBDXHU2NUY2XHU0RkREXHU3NTU5XHU2NUU3XHU3MjQ4XHU1MTdDXHU1QkI5XHVGRjA4YGluamVjdCA9IFsndG9vbHMnXWAgXHU1NzI4IDAuMS4xIFx1NEUwRSAwLjEuNiBcdTRFMEFcdThCRURcdTRFNDlcdTRFMDBcdTgxRjRcdUZGMENcbiAqIGByZWdpc3RlcihkZWZpbml0aW9uKWAgXHU4RkQ0XHU1NkRFIGRpc3Bvc2VyIFx1NEVBNlx1NEUzQVx1NEUyNFx1NzI0OFx1NTE3MVx1NjcwOVx1NTk1MVx1N0VBNlx1RkYwOVx1RkYwQ1x1NTZFMFx1NkI2NCoqXHU1NDBDXHU0RTAwXHU0RUZEXG4gKiBcdTRFQTdcdTcyNjlcdTUzRUZcdTU0MENcdTY1RjZcdTVCODlcdTg4QzVcdTU3MjhcdTY1RTdcdTcyNDhcdTRFMEVcdTY1QjBcdTcyNDggRFNIIFx1NEUwQSoqXHVGRjBDXHU1Qjg5XHU4OEM1XHU2NUY2XHU2NUUwXHU5NzAwXHU5MDA5XHU2MkU5XHU5MDFBXHU5MDUzXHUzMDAyXG4gKlxuICogIyMjIFx1NzI0OFx1NjcyQ1x1NjNBMlx1NkQ0QlxuICpcbiAqIFx1NjcyQ1x1NkEyMVx1NTc1N1x1NEUwRCBgaW1wb3J0YCBcdTRFRkJcdTRGNTUgYEBkZWVwc2Vlay1haS9kc2gtdG9vbHNgIFx1OEZEMFx1ODg0Q1x1NjVGNlx1N0IyNlx1NTNGN1x1RkYwOFx1OTA3Rlx1NTE0RFx1NjI4QVxuICogcGVlciBcdTcyNDhcdTY3MkNcdTk0ODlcdTZCN0JcdTU3MjhcdTRFQTdcdTcyNjlcdTkxQ0NcdUZGMDlcdUZGMENcdTgwMENcdTY2MkYqKlx1NjNBMlx1NkQ0Qlx1NURGMlx1NUMzMVx1N0VFQVx1NzY4NCBgY3R4LnRvb2xzYCBcdTVCOUVcdTRGOEIqKlx1RkYxQVxuICogXHU4QkZCXHU1M0Q2XHU1MTc2IGBjb25zdHJ1Y3Rvci5Db25maWdgXHVGRjA4c2NoZW1hc3Rlcnkgc2NoZW1hXHVGRjA5XHU3Njg0XHU1MTZDXHU1RjAwIGB0b1N0cmluZygpYFxuICogXHU2Mjk1XHU1RjcxXHVGRjBDXHU1MTc2XHU0RTJEIGBtb2RlYCBcdTc2ODRcdTUzRDZcdTUwM0NcdTk2QzZcdTU0MDhcdTUzNzNcdTcyNDhcdTY3MkNcdTdFQkZcdTYzMDdcdTdFQjlcdUZGMUFcbiAqIC0gXHU1NDJCIGAncHRjJ2AgXHUyMTkyIFx1NjVCMFx1NzI0OFx1RkYwOGRzaC10b29scyBgMC4xLjZgIFx1N0VCRlx1RkYwOVx1RkYwQ2BmbGF2b3IgPSAnbW9kZXJuJ2BcdUZGMUJcbiAqIC0gXHU1NDJCIGAnY29kZSdgIFx1MjE5MiBcdTY1RTdcdTcyNDhcdUZGMDhgMC4xLjFgIFx1N0VCRlx1RkYwOVx1RkYwQ2BmbGF2b3IgPSAnbGVnYWN5J2BcdUZGMUJcbiAqIC0gXHU2NUUwXHU2Q0Q1XHU1MjI0XHU1QjlBIFx1MjE5MiBgZmxhdm9yID0gJ3Vua25vd24nYFx1RkYwQ1x1NjMwOVx1NTE3Q1x1NUJCOVx1OERFRlx1NUY4NFx1NkNFOFx1NTE4Q1x1RkYwQ1x1NEUwRFx1NjI5Qlx1OTUxOVx1MzAwMVx1NEUwRFx1OTYzQlx1NjVBRFx1NTJBMFx1OEY3RFx1MzAwMlxuICpcbiAqIFx1NjNBMlx1NkQ0Qlx1N0VEM1x1Njc5Q1x1OTAxQVx1OEZDNyB7QGxpbmsgbG9hZFByb2ZpbGV9IFx1NjZCNFx1OTczMlx1RkYwOFx1NEUwRFx1NkNFOFx1NTE4Q1x1NEUzQVx1NkEyMVx1NTc4Qlx1NTNFRlx1ODlDMVx1NURFNVx1NTE3N1x1RkYwQ1xuICogXHU5MDdGXHU1MTREXHU2QzYxXHU2N0QzXHU1REU1XHU1MTc3XHU3NkVFXHU1RjU1XHVGRjA5XHVGRjBDXHU0RjlCXHU1QkJGXHU0RTNCXHU4QkNBXHU2NUFEXHUzMDAxQ0kgXHU5QThDXHU2NTM2XHU0RTBFXHU3NTI4XHU2MjM3XHU2MzkyXHU5NjlDXHU4QkZCXHU1M0Q2XHUzMDAyXG4gKlxuICogQG1vZHVsZSBAb3BlbmxpdWxhbi9kc2gtb3BlbmxpdWxhblxuICovXG5pbXBvcnQgeyBGb3JnZU1jcCB9IGZyb20gXCJAb3BlbmxpdWxhbi9tY3Atc2VydmVyXCI7XG5pbXBvcnQgeyBjaGVja1N1cHBvcnRlZFNjaGVtYSwgbm9ybWFsaXplU2NoZW1hLCB0eXBlIFN1cHBvcnRlZFNjaGVtYU5vZGUgfSBmcm9tIFwiLi9kc2gtc2NoZW1hLmpzXCI7XG5pbXBvcnQgdHlwZSB7IEhvc3RDb250ZXh0LCBIb3N0VG9vbFJ1bkNvbnRleHQsIFN1cHBvcnRlZFBhcmFtZXRlcnMgfSBmcm9tIFwiLi9kc2gtdHlwZXMuanNcIjtcblxuLyoqIENvcmRpcyBcdTYzRDJcdTRFRjZcdTU0MERcdUZGMDhcdTc1MjhcdTRFOEUgbG9hZGVyIFx1OEJDQVx1NjVBRFx1RkYwOVx1MzAwMiAqL1xuZXhwb3J0IGNvbnN0IG5hbWUgPSBcIm9wZW5saXVsYW4tYnJvd3NlclwiO1xuLyoqIFx1NURFNVx1NTE3N1x1NTQ3RFx1NTQwRFx1NTI0RFx1N0YwMFx1RkYwQ1x1OTA3Rlx1NTE0RFx1NEUwRSBob3N0IFx1NTE3Nlx1NUI4M1x1NURFNVx1NTE3N1x1NTFCMlx1N0E4MVx1MzAwMiAqL1xuY29uc3QgREVGQVVMVF9QUkVGSVggPSBcImJyb3dzZXJcIjtcblxuLyoqIERTSCBcdTRGRERcdTc1NTlcdTc2ODRcdTVERTVcdTUxNzdcdTU0MERcdUZGMUFcdTRFRkJcdTRGNTVcdTYzRDJcdTRFRjZcdTkwRkRcdTRFMERcdTVGOTdcdTZDRThcdTUxOENcdTYyMTZcdTkwNkVcdTg1M0RcdTMwMDIgKi9cbmNvbnN0IFJFU0VSVkVEX1RPT0xfTkFNRSA9IFwicnVuX2NvZGVcIjtcblxuLyoqXG4gKiBcdTdCNDlcdTVGODUgaG9zdCBcdTc2ODQgYGN0eC50b29sc2BcdUZGMDhUb29sUnVudGltZVx1RkYwOVx1NjcwRFx1NTJBMVx1NUMzMVx1N0VFQVx1NTQwRVx1NTE4RFx1NTJBMFx1OEY3RFx1NjcyQ1x1NjNEMlx1NEVGNlx1MzAwMlxuICpcbiAqIFx1OEJFNVx1NThGMFx1NjYwRVx1NTcyOCBkc2gtdG9vbHMgYDAuMS4xYFx1RkYwOFx1NjVFN1x1NzI0OFx1RkYwOVx1NEUwRSBgMC4xLjZgXHVGRjA4XHU2NUIwXHU3MjQ4XHVGRjA5XHU0RTBBXHU4QkVEXHU0RTQ5XHU0RTAwXHU4MUY0XHVGRjFBXG4gKiBgVG9vbFJ1bnRpbWUuaW5qZWN0ID0gWydzeXN0ZW1Qcm9tcHQnXWBcdUZGMENcdTY3MkNcdTYzRDJcdTRFRjZcdTUzRUFcdTRGOURcdThENTYgYHRvb2xzYFx1MzAwMlxuICovXG5leHBvcnQgY29uc3QgaW5qZWN0ID0gW1widG9vbHNcIl0gYXMgY29uc3Q7XG5cbi8qKiBEU0ggXHU5MDAyXHU5MTREXHU3MkI2XHU2MDAxXHVGRjFBXHU0RjlCXHU1QkJGXHU0RTNCXHU4QkNBXHU2NUFEXHU0RTBFIENJIFx1OUE4Q1x1NjUzNlx1NEY3Rlx1NzUyOFx1MzAwMiAqL1xuZXhwb3J0IHR5cGUgRHNoRmxhdm9yID0gXCJtb2Rlcm5cIiB8IFwibGVnYWN5XCIgfCBcInVua25vd25cIjtcblxuLyoqIFx1OTAwMlx1OTE0RFx1NTY2OFx1NjNBMlx1NkQ0Qlx1NTIzMFx1NzY4NFx1NUJCRlx1NEUzQlx1ODBGRFx1NTI5Qlx1MzAwMiAqL1xuZXhwb3J0IGludGVyZmFjZSBEc2hIb3N0UHJvZmlsZSB7XG4gIC8qKiBcdTVCQkZcdTRFM0IgRFNIIFx1NzI0OFx1NjcyQ1x1N0VCRlx1MzAwMiAqL1xuICBmbGF2b3I6IERzaEZsYXZvcjtcbiAgLyoqIFx1NjNBMlx1NkQ0Qlx1NTIzMFx1NzY4NFx1NEY5RFx1NjM2RVx1RkYwOFx1NEVCQVx1N0M3Qlx1NTNFRlx1OEJGQlx1RkYwQ1x1NEZCRlx1NEU4RVx1NjM5Mlx1OTY5Q1x1RkYwOVx1MzAwMiAqL1xuICBldmlkZW5jZTogc3RyaW5nO1xuICAvKiogXHU2Q0U4XHU1MTY1XHU3Njg0XHU2M0QyXHU0RUY2XHU3Njg0IENvcmRpcyBcdTcyNDhcdTY3MkNcdTg5ODFcdTZDNDJcdUZGMDhgaW5qZWN0YCBcdTU4RjBcdTY2MEVcdUZGMDlcdTMwMDIgKi9cbiAgaW5qZWN0ZWQ6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIFx1NjNBMlx1NkQ0Qlx1NUJCRlx1NEUzQiBEU0ggXHU3MjQ4XHU2NzJDXHU3RUJGXHUzMDAyXG4gKlxuICogXHU0RTBEXHU1QkZDXHU1MTY1XHU0RUZCXHU0RjU1IGBAZGVlcHNlZWstYWkvZHNoLXRvb2xzYCBcdTdCMjZcdTUzRjdcdTIwMTRcdTIwMTRcdTY1QjBcdTcyNDhcdTYyOEEgQ29kZSBNb2RlIFx1NjUzOVx1NTQwRCBQVENcdUZGMENcbiAqIGBUb29sUnVudGltZS5Db25maWdgIFx1NEUwQSBgbW9kZWAgXHU3Njg0XHU1NDA4XHU2Q0Q1XHU1M0Q2XHU1MDNDXHU5NkM2XHU1NDA4XHU0RUNFIGBuYXRpdmV8Y29kZXxib3RoYFxuICogXHU1M0Q4XHU0RTNBIGBuYXRpdmV8cHRjfGJvdGhgXHUzMDAyYENvbmZpZ2AgXHU2NjJGIHNjaGVtYXN0ZXJ5IHNjaGVtYVx1RkYwQ1x1NTE3NiBgdG9TdHJpbmcoKWBcbiAqIFx1NjYyRlx1NTE2Q1x1NUYwMFx1NEUxNFx1N0EzM1x1NUI5QVx1NzY4NFx1NjI5NVx1NUY3MVx1RkYwOFx1NjVCMFx1NjVFN1x1NzI0OFx1OTBGRFx1NEUzQSBgXCJuYXRpdmVcIiB8IC4uLiB8IFwiYm90aFwiYCBcdTVGNjJcdTYwMDFcdUZGMDlcdUZGMENcbiAqIFx1NTZFMFx1NkI2NFx1OEJGQlx1NTNENlx1OEJFNVx1NjI5NVx1NUY3MVx1NTM3M1x1NTNFRlx1NTIyNFx1NUI5QVx1NzI0OFx1NjcyQ1x1N0VCRlx1RkYwQ1x1NjVFMFx1OTcwMFx1NTE4NVx1NzcwMSBzY2hlbWFzdGVyeSBcdTUxODVcdTkwRThcdTdFRDNcdTY3ODRcdTMwMDJcbiAqXG4gKiBAcGFyYW0gdG9vbHMgLSBcdTVCQkZcdTRFM0JcdTZDRThcdTUxNjVcdTc2ODQgYGN0eC50b29sc2BcdUZGMDhUb29sUnVudGltZSBcdTVCOUVcdTRGOEJcdUZGMDlcdTMwMDJcbiAqIEByZXR1cm5zIFx1NUJCRlx1NEUzQlx1ODBGRFx1NTI5Qlx1NzUzQlx1NTBDRlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGV0ZWN0RHNoRmxhdm9yKHRvb2xzOiB1bmtub3duKTogRHNoSG9zdFByb2ZpbGUge1xuICBjb25zdCBpbmplY3RlZCA9IFsuLi5pbmplY3RdO1xuICB0cnkge1xuICAgIGNvbnN0IGN0b3IgPSAodG9vbHMgYXMgeyBjb25zdHJ1Y3Rvcj86IHsgQ29uZmlnPzogdW5rbm93biB9IH0gfCB1bmRlZmluZWQpPy5jb25zdHJ1Y3RvcjtcbiAgICBjb25zdCBjb25maWcgPSBjdG9yPy5Db25maWcgYXMgeyB0b1N0cmluZz86ICgpID0+IHN0cmluZyB9IHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IHJlbmRlcmVkID0gdHlwZW9mIGNvbmZpZz8udG9TdHJpbmcgPT09IFwiZnVuY3Rpb25cIiA/IGNvbmZpZy50b1N0cmluZygpIDogXCJcIjtcbiAgICBpZiAoL1tcIiddcHRjW1wiJ10vLnRlc3QocmVuZGVyZWQpKSB7XG4gICAgICByZXR1cm4geyBmbGF2b3I6IFwibW9kZXJuXCIsIGV2aWRlbmNlOiBgdG9vbHMuQ29uZmlnLm1vZGUgfiAke3JlbmRlcmVkfWAsIGluamVjdGVkIH07XG4gICAgfVxuICAgIGlmICgvW1wiJ11jb2RlW1wiJ10vLnRlc3QocmVuZGVyZWQpKSB7XG4gICAgICByZXR1cm4geyBmbGF2b3I6IFwibGVnYWN5XCIsIGV2aWRlbmNlOiBgdG9vbHMuQ29uZmlnLm1vZGUgfiAke3JlbmRlcmVkfWAsIGluamVjdGVkIH07XG4gICAgfVxuICAgIGNvbnN0IGhhc1JlZ2lzdGVyID0gdHlwZW9mICh0b29scyBhcyB7IHJlZ2lzdGVyPzogdW5rbm93biB9IHwgdW5kZWZpbmVkKT8ucmVnaXN0ZXIgPT09IFwiZnVuY3Rpb25cIjtcbiAgICByZXR1cm4ge1xuICAgICAgZmxhdm9yOiBcInVua25vd25cIixcbiAgICAgIGV2aWRlbmNlOiBoYXNSZWdpc3RlciA/IFwidG9vbHMucmVnaXN0ZXIgXHU1M0VGXHU3NTI4XHVGRjBDXHU0RjQ2IENvbmZpZyBcdTY3MkFcdTY2QjRcdTk3MzIgbW9kZSBcdTUzRDZcdTUwM0NcIiA6IFwiY3R4LnRvb2xzIFx1N0VEM1x1Njc4NFx1NUYwMlx1NUUzOFwiLFxuICAgICAgaW5qZWN0ZWQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHsgZmxhdm9yOiBcInVua25vd25cIiwgZXZpZGVuY2U6IFwiXHU2M0EyXHU2RDRCXHU2MjlCXHU5NTE5XHVGRjBDXHU2MzA5XHU1MTdDXHU1QkI5XHU4REVGXHU1Rjg0XHU2Q0U4XHU1MThDXCIsIGluamVjdGVkIH07XG4gIH1cbn1cblxuLyoqXG4gKiBcdTZDRThcdTUxOENcdTY3MUZcdTYyQTRcdTY4MEZcdUZGMUFcdTYyRDJcdTdFREQgRFNIIFx1NEZERFx1NzU1OVx1NURFNVx1NTE3N1x1NTQwRFx1RkYwOCoqXHU5NjMyXHU1RkExXHU2MDI3XHU0RkREXHU3NTU5KipcdUZGMENcdTk3NUVcdTRFM0JcdTk2MzJcdTdFQkZcdUZGMDlcdTMwMDJcbiAqXG4gKiBcdTY1QjBcdTcyNDhcdUZGMDhkc2gtdG9vbHMgMC4xLjYgXHU3RUJGXHVGRjA5XHU2MjhBIENvZGUgTW9kZSBcdTkxQ0RcdTU0N0RcdTU0MERcdTRFM0EgUFRDIG1vZGVcdUZGMENcdTRGNDZcbiAqIGBydW5fY29kZWAgXHU0RUNEXHU2NjJGXHU0RkREXHU3NTU5XHU3Njg0IHByZXNlbnRhdGlvbiB0cmFuc3BvcnRcdUZGMENgVG9vbFJ1bnRpbWUucmVnaXN0ZXIoKWBcbiAqIFx1NUJGOVx1NTE3Nlx1NzZGNFx1NjNBNVx1NjI5Qlx1OTUxOVx1MzAwMlxuICpcbiAqICoqXHU1M0VGXHU4RkJFXHU2MDI3KipcdUZGMUFcdTc3MUZcdTVCOUVcdThDMDNcdTc1MjhcdThERUZcdTVGODRcdTRFMEFcdUZGMENcdTY3MkNcdTYyQTRcdTY4MEZcdTUzRUFcdTU3MjhcdTMwMENNQ1AgXHU1REU1XHU1MTc3XHU4ODY4XHU5MUNDXHU1QjU4XHU1NzI4XHU1NDBEXHU0RTNBIGBjb2RlYFxuICogXHU3Njg0XHU1REU1XHU1MTc3XHVGRjBDXHU0RTE0XHU3NTI4XHU2MjM3XHU2MjhBIHByZWZpeCBcdThCQkVcdTRFM0EgYHJ1bmBcdTMwMERcdTY1RjZcdTYyNERcdTUzRUZcdTgwRkRcdTU0N0RcdTRFMkRcdUZGMUJcdTVGNTNcdTUyNEQgTUNQIFx1NURFNVx1NTE3N1x1ODg2OFx1NkNBMVx1NjcwOVxuICogYGNvZGVgIFx1NURFNVx1NTE3N1x1RkYwQ1x1NjU0NVx1OEJFNVx1NjJBNFx1NjgwRlx1OUVEOFx1OEJBNFx1NEUwRFx1NTNFRlx1OEZCRVx1RkYwOGBwcmVmaXg9XCJydW5cImAgXHU0RUE3XHU1MUZBXHU3Njg0XHU2NjJGIGBydW5fb2JzZXJ2ZWBcbiAqIFx1N0I0OVx1RkYwQ1x1NEUwRFx1NjYyRiBgcnVuX2NvZGVgXHVGRjA5XHUzMDAyXHU1QjgzXHU0RkREXHU3NTU5XHU0RTNBXHU1MTVDXHU1RTk1XHVGRjFBXHU1QzA2XHU2NzY1IE1DUCBcdTRGQTdcdTY1QjBcdTU4OUUgYGNvZGVgIFx1NURFNVx1NTE3N1x1MzAwMVx1NjIxNlxuICogXHU3NTI4XHU2MjM3XHU3NkY0XHU2M0E1XHU0RUU1XHU0RkREXHU3NTU5XHU1NDBEXHU0RjVDIHByZWZpeCBcdTY1RjZcdTRFQ0RcdTRGMUFcdTYyRTZcdTRFMEJcdTMwMDJcbiAqXG4gKiBcdTU2RTBcdTZCNjRcdTUyMjRcdTVCOUFcdTU0MENcdTY1RjZcdTg5ODZcdTc2RDYgYHRvb2xOYW1lYFx1RkYwOE1DUCBcdTRGQTdcdTUzOUZcdTU5Q0JcdTU0MERcdUZGMDlcdTRFMEUgYHB1YmxpY05hbWVgXHVGRjA4XHU1MkEwIHByZWZpeCBcdTU0MEVcdUZGMDlcdTMwMDJcbiAqICoqXHU0RTNCXHU5NjMyXHU3RUJGXHU2NjJGXHU1NDdEXHU1NDBEXHU1MjREXHU3RjAwKipcdTIwMTRcdTIwMTRcdTlFRDhcdThCQTQgYGJyb3dzZXJfYCBcdTRGN0ZcdTYyNDBcdTY3MDlcdTVERTVcdTUxNzdcdTU0MERcdTU5MjlcdTcxMzZcdThGRENcdTc5QkJcdTRGRERcdTc1NTlcdTU0MERcdTMwMDJcbiAqXG4gKiBAcGFyYW0gcHVibGljTmFtZSAtIFx1NTJBMFx1NEUwQSBwcmVmaXggXHU1NDBFXHU3Njg0XHU2NzAwXHU3RUM4XHU1REU1XHU1MTc3XHU1NDBEXHUzMDAyXG4gKiBAcGFyYW0gdG9vbE5hbWUgLSBNQ1AgXHU0RkE3XHU1MzlGXHU1OUNCXHU1REU1XHU1MTc3XHU1NDBEXHVGRjA4XHU2NzJBXHU1MkEwIHByZWZpeFx1RkYwOVx1RkYwQ1x1NEUwMFx1NUU3Nlx1NTIyNFx1NUI5QVx1MzAwMlxuICogQHRocm93cyBcdTVGNTNcdTRFRkJcdTRFMDBcdTU0MERcdTU0N0RcdTRFMkQgRFNIIFx1NEZERFx1NzU1OVx1NTQwRFx1NjVGNlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Tm90UmVzZXJ2ZWQocHVibGljTmFtZTogc3RyaW5nLCB0b29sTmFtZT86IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBoaXQgPSBbcHVibGljTmFtZSwgdG9vbE5hbWVdLmZpbmQoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlID09PSBSRVNFUlZFRF9UT09MX05BTUUpO1xuICBpZiAoaGl0ICE9PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgW29wZW5saXVsYW5dIFx1NURFNVx1NTE3N1x1NTQwRCBcIiR7aGl0fVwiIFx1NjYyRiBEU0ggXHU0RkREXHU3NTU5XHU1NDBEXHVGRjA4UFRDL0NvZGUgbW9kZSBcdTc2ODQgcnVuX2NvZGUgdHJhbnNwb3J0XHVGRjA5XHVGRjBDXHU4QkY3XHU2NTM5XHU3NTI4XHU1MTc2XHU1QjgzIHByZWZpeGAsXG4gICAgKTtcbiAgfVxufVxuXG4vKiogXHU1QkI5XHU5NTE5XHU1M0Q2XHU1MDNDXHVGRjFBXHU2MjhBXHU4QzAzXHU3NTI4XHU1M0MyXHU2NTcwXHU2NTM2XHU2NTVCXHU0RTNBXHU1QkY5XHU4QzYxXHVGRjA4XHU2QTIxXHU1NzhCXHU1M0VGXHU4MEZEXHU4RjkzXHU1MUZBXHU4OEY4XHU1MDNDXHVGRjA5XHUzMDAyICovXG5mdW5jdGlvbiB0b1JlY29yZChhcmdzOiB1bmtub3duKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICByZXR1cm4gdHlwZW9mIGFyZ3MgPT09IFwib2JqZWN0XCIgJiYgYXJncyAhPT0gbnVsbCA/IChhcmdzIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSA6IHt9O1xufVxuXG4vKiogXHU2MjhBIEZvcmdlTUNQIFx1OEMwM1x1NzUyOFx1NjVCOVx1OEZENFx1NTZERVx1NTAzQ1x1NjYyMFx1NUMwNFx1NEUzQSBoYXJuZXNzIENvbnRlbnRCbG9jayBcdTY1ODdcdTY3MkNcdTMwMDIgKi9cbmZ1bmN0aW9uIHJlc3VsdFRleHQoY29udGVudDogcmVhZG9ubHkgeyB0eXBlPzogc3RyaW5nOyB0ZXh0Pzogc3RyaW5nIH1bXSB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGlmICghY29udGVudCB8fCBjb250ZW50Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwiKFx1NjVFMFx1OEY5M1x1NTFGQSlcIjtcbiAgcmV0dXJuIGNvbnRlbnQubWFwKChibG9jaykgPT4gYmxvY2sudGV4dCA/PyBcIlwiKS5qb2luKFwiXFxuXCIpO1xufVxuXG4vKipcbiAqIFx1N0VERlx1NEUwMFx1NzY4NFx1NURFNVx1NTE3N1x1OEY5M1x1NTFGQVx1NTk1MVx1N0VBNlx1RkYxQWNhbm9uaWNhbCB2YWx1ZSA9IGB7IGNvbnRlbnQ6IFt7IHR5cGUsIHRleHQgfV0gfWBcdTMwMDJcbiAqXG4gKiBcdThCRTUgc2NoZW1hIFx1NjYyRioqXHU1M0Q3XHU2NTJGXHU2MzAxXHU1QjUwXHU5NkM2KipcdUZGMDhcdTVCRjlcdThDNjFcdTY4MzkgKyBcdTY2M0VcdTVGMEYgYGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBmYWxzZWBcbiAqICsgYHJlcXVpcmVkOiBbJ2NvbnRlbnQnXWBcdUZGMDlcdUZGMENcdTUzRUZcdTU0MENcdTY1RjZcdTkwMUFcdThGQzdcdTY1QjBcdTY1RTdcdTRFMjRcdTcyNDhcdTc2ODQgYG91dHB1dC5zY2hlbWFgIFx1NjgyMVx1OUE4Q1x1MzAwMlxuICovXG5jb25zdCBDT05URU5UX0JMT0NLU19TQ0hFTUE6IFN1cHBvcnRlZFNjaGVtYU5vZGUgPSB7XG4gIHR5cGU6IFwib2JqZWN0XCIsXG4gIHByb3BlcnRpZXM6IHtcbiAgICBjb250ZW50OiB7XG4gICAgICB0eXBlOiBcImFycmF5XCIsXG4gICAgICBpdGVtczoge1xuICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgdHlwZTogeyB0eXBlOiBcInN0cmluZ1wiIH0sXG4gICAgICAgICAgdGV4dDogeyB0eXBlOiBcInN0cmluZ1wiIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiB0cnVlLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICByZXF1aXJlZDogW1wiY29udGVudFwiXSxcbiAgYWRkaXRpb25hbFByb3BlcnRpZXM6IGZhbHNlLFxufTtcblxuLyoqIFx1NjI4QSBjYW5vbmljYWwgdmFsdWUgXHU2Mjk1XHU1RjcxXHU0RTNBXHU2QTIxXHU1NzhCXHU1MTg1XHU1QkI5XHU1NzU3XHUzMDAyICovXG5mdW5jdGlvbiByZW5kZXJDb250ZW50KF9hcmdzOiB1bmtub3duLCB2YWx1ZTogdW5rbm93bik6IHsgdHlwZTogc3RyaW5nOyB0ZXh0OiBzdHJpbmcgfVtdIHtcbiAgY29uc3QgY29udGVudCA9ICh2YWx1ZSBhcyB7IGNvbnRlbnQ/OiB7IHR5cGU/OiBzdHJpbmc7IHRleHQ/OiBzdHJpbmcgfVtdIH0gfCB1bmRlZmluZWQpPy5jb250ZW50ID8/IFtdO1xuICByZXR1cm4gW3sgdHlwZTogXCJ0ZXh0XCIsIHRleHQ6IHJlc3VsdFRleHQoY29udGVudCkgfV07XG59XG5cbi8qKlxuICogQ29yZGlzIFx1NjNEMlx1NEVGNlx1NTE2NVx1NTNFM1x1RkYxQVx1Njc4NFx1OTAyMFx1NEUwMFx1NEUyQVx1OEZEQlx1N0EwQlx1NTE4NVx1NzY4NCBGb3JnZU1jcCBcdTVCOUVcdTRGOEJcdUZGMENcdTYyOEFcdTUxNzZcdTVERTVcdTUxNzdcdTY2MjBcdTVDMDRcdTRFM0FcbiAqIGRlZXBzZWVrIGhhcm5lc3MgXHU3Njg0IFRvb2xEZWZpbml0aW9uIFx1NUU3Nlx1NkNFOFx1NTE4Q1x1NTIzMCBgY3R4LnRvb2xzYFx1MzAwMlxuICpcbiAqIFx1OTE0RFx1N0Y2RVx1RkYwOFx1NTNFRlx1NTcyOCBjb3JkaXMucGF0Y2gueW1sIFx1ODk4Nlx1NzZENlx1RkYwOVx1RkYxQVxuICogLSBgaGVhZGxlc3NgOiBcdTY1RTBcdTU5MzRcdTZBMjFcdTVGMEZcdUZGMDhcdTlFRDhcdThCQTQgdHJ1ZVx1RkYwOVxuICogLSBgY29ubmVjdFVybGA6IFx1NTNFRlx1OTAwOVx1RkYwQ0NEUCBcdThGREVcdTYzQTVcdTVERjJcdTU0MkZcdTUyQThcdTc2ODRcdTZENEZcdTg5QzhcdTU2NjhcbiAqIC0gYHByZWZpeGA6IFx1NURFNVx1NTE3N1x1NTQ3RFx1NTQwRFx1NTI0RFx1N0YwMFx1RkYwOFx1OUVEOFx1OEJBNCBcImJyb3dzZXJcIlx1RkYwOVxuICogLSBgc3RlYWx0aGA6IFx1NTNFRlx1OTAwOVx1RkYwQ1x1OTYzMlx1NjhDMFx1NkQ0Qlx1OTE0RFx1N0Y2RVxuICpcbiAqIEBwYXJhbSBjdHggLSBcdTYzRDJcdTRFRjZcdTRFMEFcdTRFMEJcdTY1ODdcdUZGMDhcdTVCQkZcdTRFM0JcdTZDRThcdTUxNjVcdUZGMENcdTU0MkJcdTVERTVcdTUxNzdcdTZDRThcdTUxOENcdTY3MERcdTUyQTFcdUZGMDlcdTMwMDJcbiAqIEBwYXJhbSBjb25maWcgLSBcdTg5RTNcdTY3OTBcdTU0MEVcdTc2ODRcdTYzRDJcdTRFRjZcdTkxNERcdTdGNkVcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5KGN0eDogSG9zdENvbnRleHQsIGNvbmZpZzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fSk6IHZvaWQge1xuICBjb25zdCBwcmVmaXggPSB0eXBlb2YgY29uZmlnLnByZWZpeCA9PT0gXCJzdHJpbmdcIiAmJiBjb25maWcucHJlZml4ID8gY29uZmlnLnByZWZpeCA6IERFRkFVTFRfUFJFRklYO1xuICBjb25zdCBtY3AgPSBuZXcgRm9yZ2VNY3Aoe1xuICAgIGhlYWRsZXNzOiBjb25maWcuaGVhZGxlc3MgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBCb29sZWFuKGNvbmZpZy5oZWFkbGVzcyksXG4gICAgY29ubmVjdFVybDogdHlwZW9mIGNvbmZpZy5jb25uZWN0VXJsID09PSBcInN0cmluZ1wiID8gY29uZmlnLmNvbm5lY3RVcmwgOiB1bmRlZmluZWQsXG4gICAgc3RlYWx0aDogKGNvbmZpZy5zdGVhbHRoIGFzIG5ldmVyKSA/PyB1bmRlZmluZWQsXG4gIH0pO1xuXG4gIC8vIERTSCBcdTY1QjBcdTcyNDhcdUZGMUFcdTkwMUFcdThGQzcgaW5qZWN0IFx1NThGMFx1NjYwRVx1NTQwRVx1RkYwQ2N0eC50b29scyBcdTVERjJcdTc1MzFcdTVCQkZcdTRFM0JcdTRGRERcdThCQzFcdTVDMzFcdTdFRUFcdTMwMDJcbiAgLy8gXHU2NUU3XHU3MjQ4XHVGRjA4MC4xLjEgXHU3RUJGXHVGRjA5XHU1NDBDXHU2ODM3XHU2NTJGXHU2MzAxIGluamVjdFx1RkYwQ1x1NjU0NVx1NjVFMFx1OTcwMFx1N0I0OVx1NUY4NVx1OTFDRFx1OEJENVx1MzAwMlxuICBjb25zdCB0b29scyA9IGN0eC50b29scztcbiAgY29uc3QgaG9zdCA9IGRldGVjdERzaEZsYXZvcih0b29scyk7XG5cbiAgZm9yIChjb25zdCB0b29sIG9mIG1jcC50b29scykge1xuICAgIGNvbnN0IHB1YmxpY05hbWUgPSBgJHtwcmVmaXh9XyR7dG9vbC5uYW1lfWA7XG5cbiAgICAvLyBcdTk2MzJcdTVGQTFcdTYwMjdcdTRGRERcdTc1NTlcdTU0MERcdTYyQTRcdTY4MEZcdUZGMDhcdTlFRDhcdThCQTRcdTRFMERcdTUzRUZcdThGQkVcdUZGMENcdTg5QzEgYXNzZXJ0Tm90UmVzZXJ2ZWQgXHU2NTg3XHU2ODYzXHVGRjA5XHUzMDAyXG4gICAgYXNzZXJ0Tm90UmVzZXJ2ZWQocHVibGljTmFtZSwgdG9vbC5uYW1lKTtcblxuICAgIC8vIERTSCBcdTY1QjBcdTcyNDhcdUZGMUFwYXJhbWV0ZXJzIFx1NUZDNVx1OTg3Qlx1NjYyRlx1NTNEN1x1NjUyRlx1NjMwMVx1NUI1MFx1OTZDNlx1NzY4NCBQYXJhbWV0ZXJKc29uU2NoZW1hXHVGRjBDXG4gICAgLy8gXHU0RTE0XHU1RkM1XHU5ODdCXHU2NjJGKipcdTVCRjlcdThDNjFcdTY4MzkqKlx1RkYwOGBQYXJhbWV0ZXJKc29uU2NoZW1hIGV4dGVuZHMgT2JqZWN0SnNvblNjaGVtYWBcdUZGMDlcdTMwMDJcbiAgICAvLyBNQ1AgXHU0RkE3IGlucHV0U2NoZW1hIFx1NjcyQ1x1NUMzMVx1NjYyRiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzLCByZXF1aXJlZCB9XHVGRjFCXG4gICAgLy8gXHU3RUNGIG5vcm1hbGl6ZVNjaGVtYSBcdTY1MzZcdTY1NUIga2V5d29yZCBcdTU0MEVcdTVGM0FcdTUyMzZcdTVCRjlcdThDNjFcdTY4MzlcdUZGMDhcdTRFMERcdTUwNUFcdTdDN0JcdTU3OEJcdTRFMDBcdTgxRjRcdTYwMjdcdTRGRUVcdTZCNjNcdUZGMENcbiAgICAvLyBjb25zdC9lbnVtIFx1NEUwMFx1NUY4Qlx1NTM5Rlx1NjgzN1x1NEZERFx1NzU1OVx1MzAwMVx1NzUzMVx1NEUwQlx1NjVCOVx1NkNFOFx1NTE4Q1x1NjcxRlx1ODFFQVx1NjhDMFx1NjJEMlx1N0VERFx1RkYwOVx1MzAwMmFkZGl0aW9uYWxQcm9wZXJ0aWVzXG4gICAgLy8gXHU1M0VBXHU1NzI4XHU0RjVDXHU4MDA1XHU2NjNFXHU1RjBGXHU1OEYwXHU2NjBFXHU2NUY2XHU0RkREXHU3NTU5XHVGRjBDXHU0RTBEXHU2NEM1XHU4MUVBXHU1MkEwXHU0RTI1XHUzMDAyXG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVNjaGVtYSh0b29sLmlucHV0U2NoZW1hKTtcblxuICAgIC8vIFx1NTM4Qlx1NUU3M1x1NjJBNFx1NjgwRlx1RkYwOFx1RDgzRFx1REZFMS1LXHVGRjA5XHVGRjFBXHU0RTBCXHU5NzYyXHU3Njg0IGBwYXJhbWV0ZXJzYCBcdTUzRUFcdTRFQ0Ugbm9ybWFsaXplZCBcdTkxQ0NcdTUzRDZcbiAgICAvLyBgcHJvcGVydGllc2AgLyBgcmVxdWlyZWRgIC8gYGFkZGl0aW9uYWxQcm9wZXJ0aWVzYFx1RkYwQyoqXHU1MTc2XHU0RjU5XHU3RUE2XHU2NzVGIGtleXdvcmQgXHU0RjFBXHU4OEFCXG4gICAgLy8gXHU5NzU5XHU5RUQ4XHU0RTIyXHU2Mzg5KipcdTIwMTRcdTIwMTRcdTVERTVcdTUxNzdcdTZDRThcdTUxOENcdTYyMTBcdTUyOUZcdUZGMENcdTUzNzRcdTUzRDhcdTYyMTBcdTMwMENcdTY1MzZcdTRFRkJcdTYxMEZcdTUzQzJcdTY1NzBcdTMwMERcdTMwMDJcdTUzOEJcdTVFNzNcdTU0MEVcdTc2ODQgcGFyYW1ldGVycyBcdTgwRkRcdTkwMUFcdThGQzdcbiAgICAvLyBcdTZDRThcdTUxOENcdTY3MUZcdTgxRUFcdTY4QzBcdUZGMENcdTgxRUFcdTY4QzBcdTc3MEJcdTRFMERcdTUxRkFcdTRFMjJcdTU5MzFcdUZGMENcdTYyNDBcdTRFRTVcdTVGQzVcdTk4N0JcdTU3MjhcdThGRDlcdTkxQ0NcdTYyRTZcdTMwMDJcbiAgICAvL1xuICAgIC8vIFx1NEUyMlx1NzY4NFx1NEUwRFx1NjYyRlx1MzAwQ1x1NEY0RFx1N0Y2RVx1NEUwRFx1NTNEN1x1NjUyRlx1NjMwMVx1NzY4NFx1NTE5OVx1NkNENVx1MzAwRFx1RkYwOFx1OTBBM1x1NjYyRiBcdUQ4M0RcdURGRTEtR1x1RkYxQWBvbmVPZmAgXHU3Njg0XHU1MTQ0XHU1RjFGIGtleXdvcmRcdUZGMENcdTRGRERcdTc1NTlcdTRGMUFcdThCQTlcbiAgICAvLyBcdTYzRDJcdTRFRjZcdTY1NzRcdTRGNTNcdTUyQTBcdThGN0RcdTU5MzFcdThEMjVcdUZGMENcdTRFMTRcdTUzOUZcdTY4Mzcgc2NoZW1hIFx1NEVDRFx1ODhBQlx1NUJCRlx1NEUzQlx1NjJEMlx1N0VERFx1RkYwOVx1RkYwQ1x1ODAwQ1x1NjYyRioqXHU2NTc0XHU0RTJBXHU1M0Q2XHU1MDNDXHU3RUE2XHU2NzVGKipcdUZGMENcdTRFMTRcdTRGRERcdTc1NTlcbiAgICAvLyBcdTVFNzZcdTRFMERcdTRGMUFcdThCQTlcdTUyQTBcdThGN0RcdTU5MzFcdThEMjVcdTIwMTRcdTIwMTRcdTYyNDBcdTRFRTVcdThGRDlcdTkxQ0NcdTYyOUJcdUZGMENcdTRFMERcdTk3NTlcdTlFRDhcdTUzRDhcdTVCQkRcdTMwMDJcbiAgICAvL1xuICAgIC8vIFx1ODk4Nlx1NzZENlx1NjU3NFx1N0M3Qlx1ODAwQ1x1NEUwRFx1NTNFQVx1NjYyRiBgb25lT2ZgIFx1NjgzOVx1MzAwMlx1NTIyNFx1NjM2RVx1NjYyRlx1MzAwQ1x1NEY1Q1x1ODAwNVx1NTcyOCoqXHU2ODM5KipcdTRFMEFcdTU4RjBcdTY2MEVcdTRFODYgYHBhcmFtZXRlcnNgXG4gICAgLy8gXHU4ODY4XHU4RkJFXHU0RTBEXHU0RTg2XHU3Njg0XHU3RUE2XHU2NzVGXHUzMDBEXHUyMDE0XHUyMDE0XHU3NzBCIHJhdyBcdTgwMENcdTRFMERcdTUzRUFcdTc3MEIgbm9ybWFsaXplZFx1RkYxQWBpdGVtc2AgXHU4RkQ5XHU3QzdCIGtleXdvcmQgXHU1NzI4XG4gICAgLy8gbm9ybWFsaXplU2NoZW1hIFx1OTFDQ1x1NUMzMVx1ODhBQlx1NEUyMlx1NjM4OVx1NEU4Nlx1RkYwOFx1NTNFQVx1NTcyOCBgdHlwZTonYXJyYXknYCBcdTRFMEJcdTRGRERcdTc1NTlcdUZGMDlcdUZGMENcdTUzRUFcdTc3MEIgbm9ybWFsaXplZFxuICAgIC8vIFx1NEYxQVx1NkYwRlx1NjM4OSBgeyB0eXBlOidvYmplY3QnLCBpdGVtczpcdTIwMjYgfWBcdUZGMDhcdTVCQkZcdTRFM0JcdTVCRjlcdTUzOUZcdTY4MzdcdThGOTNcdTUxNjVcdTU0MENcdTY4MzdcdTc2RjRcdTYzQTVcdTYyRDJcdTdFRERcdUZGMDlcdTMwMDJcbiAgICAvLyBcdTVGNzFcdTU0Q0RcdTk3NjJcdUZGMUE4LzggXHU1REU1XHU1MTc3XHU5MEZEXHU2NjJGIGB7IHR5cGU6J29iamVjdCcsIHByb3BlcnRpZXMgfWBcdUZGMENcdTRFQ0FcdTU5MjlcdTRFMERcdTUzRUZcdThGQkVcdUZGMUJNQ1AgXHU1MzRGXHU4QkFFXHU2NzJDXHU1QzMxXG4gICAgLy8gXHU4OTgxXHU2QzQyXHU1QkY5XHU4QzYxXHU2ODM5XHVGRjBDXHU1QzVFXHU1MDY1XHU1OEVFXHU2MDI3XHU2MkE0XHU2ODBGXHUzMDAyXG4gICAgY29uc3QgUk9PVF9PTkxZX0tFWVdPUkRTID0gW1wib25lT2ZcIiwgXCJlbnVtXCIsIFwiY29uc3RcIiwgXCJpdGVtc1wiXSBhcyBjb25zdDtcbiAgICBjb25zdCByYXdJbnB1dCA9ICh0b29sLmlucHV0U2NoZW1hID8/IHt9KSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICBjb25zdCBkcm9wcGVkID0gUk9PVF9PTkxZX0tFWVdPUkRTLmZpbHRlcigoa2V5KSA9PiByYXdJbnB1dFtrZXldICE9PSB1bmRlZmluZWQpO1xuICAgIGlmIChkcm9wcGVkLmxlbmd0aCA+IDAgfHwgKG5vcm1hbGl6ZWQudHlwZSAhPT0gdW5kZWZpbmVkICYmIG5vcm1hbGl6ZWQudHlwZSAhPT0gXCJvYmplY3RcIikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFtvcGVubGl1bGFuXSAke3B1YmxpY05hbWV9IGlucHV0U2NoZW1hIFx1NzY4NFx1NjgzOVx1NUZDNVx1OTg3Qlx1NjYyRlx1N0VBRlx1NUJGOVx1OEM2MSBzY2hlbWFcdUZGMDhEU0ggUGFyYW1ldGVySnNvblNjaGVtYSBcdTg5ODFcdTZDNDJcdTVCRjlcdThDNjFcdTY4MzlcdUZGMUJgICtcbiAgICAgICAgICBgcGFyYW1ldGVycyBcdTg4NjhcdThGQkVcdTRFMERcdTRFODZcdTc2ODRcdTY4MzlcdTdFQTZcdTY3NUY6ICR7ZHJvcHBlZC5sZW5ndGggPiAwID8gZHJvcHBlZC5qb2luKFwiL1wiKSA6IGB0eXBlPSR7U3RyaW5nKG5vcm1hbGl6ZWQudHlwZSl9YH1cdUZGMDk6IGAgK1xuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHRvb2wuaW5wdXRTY2hlbWEpLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJhbWV0ZXJzOiBTdXBwb3J0ZWRQYXJhbWV0ZXJzID0ge1xuICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICAgIHByb3BlcnRpZXM6IG5vcm1hbGl6ZWQucHJvcGVydGllcyA/PyB7fSxcbiAgICAgIC4uLihub3JtYWxpemVkLnJlcXVpcmVkID09PSB1bmRlZmluZWQgPyB7fSA6IHsgcmVxdWlyZWQ6IG5vcm1hbGl6ZWQucmVxdWlyZWQgfSksXG4gICAgICAuLi4obm9ybWFsaXplZC5hZGRpdGlvbmFsUHJvcGVydGllcyA9PT0gdW5kZWZpbmVkXG4gICAgICAgID8ge31cbiAgICAgICAgOiB7IGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBub3JtYWxpemVkLmFkZGl0aW9uYWxQcm9wZXJ0aWVzIH0pLFxuICAgIH07XG5cbiAgICAvLyBcdTZDRThcdTUxOENcdTUyNEQqKlx1N0VEM1x1Njc4NFx1ODFFQVx1NjhDMCoqXHVGRjFBXHU2ODIxXHU5QThDIHNjaGVtYSBcdTY3MkNcdThFQUJcdUZGMDhcdTk3NTlcdTYwMDFcdTY1NzBcdTYzNkVcdUZGMDlcdTY2MkZcdTU0MjZcdTg0M0RcdTU3MjhcdTUzRDdcdTY1MkZcdTYzMDFcdTVCNTBcdTk2QzZcdTUxODVcdTMwMDJcbiAgICAvLyBcdThGRERcdTg5QzRcdTUzNzNcdTYyOUJcdTk1MTlcdTIwMTRcdTIwMTRcdTUyQTBcdThGN0RcdTY3MUZcdTU5MzFcdThEMjVcdTZCRDRcdTMwMENcdTg4QzVcdTRFMEFcdTRFODZcdTRGNDZcdThDMDNcdTc1MjhcdTUzNzNcdTcwQjhcdTMwMERcdTUzRUZcdThCQ0FcdTY1QURcdTVGOTdcdTU5MUFcdTMwMDJcbiAgICBjb25zdCB2aW9sYXRpb25zID0gW1xuICAgICAgLi4uY2hlY2tTdXBwb3J0ZWRTY2hlbWEocGFyYW1ldGVycykubWFwKCh2KSA9PiBgcGFyYW1ldGVyczogJHt2fWApLFxuICAgICAgLi4uY2hlY2tTdXBwb3J0ZWRTY2hlbWEoQ09OVEVOVF9CTE9DS1NfU0NIRU1BKS5tYXAoKHYpID0+IGBvdXRwdXQuc2NoZW1hOiAke3Z9YCksXG4gICAgXTtcbiAgICBpZiAodmlvbGF0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFtvcGVubGl1bGFuXSAke3B1YmxpY05hbWV9IHNjaGVtYSBcdTRFMERcdTU3MjggRFNIIFx1NTNEN1x1NjUyRlx1NjMwMVx1NUI1MFx1OTZDNlx1NTE4NTogJHt2aW9sYXRpb25zLmpvaW4oXCI7IFwiKX1gKTtcbiAgICB9XG5cbiAgICBjdHguZWZmZWN0KFxuICAgICAgKCkgPT5cbiAgICAgICAgdG9vbHMucmVnaXN0ZXIoe1xuICAgICAgICAgIG5hbWU6IHB1YmxpY05hbWUsXG4gICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgcGFyYW1ldGVycyxcbiAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgIC8vIGNhbm9uaWNhbCB2YWx1ZVx1RkYxQXsgY29udGVudDogW3sgdHlwZTogXCJ0ZXh0XCIsIHRleHQgfV0gfVxuICAgICAgICAgICAgc2NoZW1hOiBDT05URU5UX0JMT0NLU19TQ0hFTUEsXG4gICAgICAgICAgICByZW5kZXI6IHJlbmRlckNvbnRlbnQsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBEU0ggXHU2NUIwXHU3MjQ4XHU3QjdFXHU1NDBEIGBleGVjdXRlKGFyZ3MsIGV4ZWMpYFx1RkYwQ2BleGVjLnNpZ25hbGAgXHU3NTI4XHU0RThFXHU1M0Q2XHU2RDg4XHUzMDAyXG4gICAgICAgICAgICogXHU2NUU3XHU3MjQ4XHU4QzAzXHU3NTI4XHU2NUY2XHU1M0VBXHU0RjIwIGFyZ3NcdUZGMENcdTY1NDVcdTVCRjkgYGV4ZWNgIFx1NTA1QVx1NTNFRlx1OTAwOVx1NTkwNFx1NzQwNlx1RkYwQ1x1NEZERFx1NjMwMVx1NTNDQ1x1NzI0OFx1NjcyQ1x1NTE3Q1x1NUJCOVx1MzAwMlxuICAgICAgICAgICAqXG4gICAgICAgICAgICogXHU4RkQ5XHU5MUNDXHU2NjNFXHU1RjBGIGB0aHJvd0lmQWJvcnRlZCgpYFx1RkYxQVx1NURGMlx1NEUyRFx1NkI2Mlx1NzY4NFx1OEMwM1x1NzUyOFx1NTcyOFx1ODlFNlx1OEZCRSBGb3JnZU1jcFx1RkYwOFx1OEZEQlx1ODAwQ1xuICAgICAgICAgICAqIFx1NTQyRlx1NTJBOFx1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwOVx1NEU0Qlx1NTI0RFx1NUMzMVx1NjI5Qlx1NTFGQVx1MzAwMlx1NUJCRlx1NEUzQlx1NEZBN1x1NTNFNlx1NjcwOSBgQUJPUlRFRF9CRUZPUkVfRElTUEFUQ0hgIC9cbiAgICAgICAgICAgKiBgQUJPUlRFRGAgXHU3Njg0XHU1MTVDXHU1RTk1XHVGRjBDXHU2NzJDXHU2M0QyXHU0RUY2XHU0RTBEXHU5MUNEXHU1OTBEXHU1QjlFXHU3M0IwXHU5MEEzXHU1QzQyXHU4QkVEXHU0RTQ5XHUzMDAyXG4gICAgICAgICAgICovXG4gICAgICAgICAgZXhlY3V0ZTogYXN5bmMgKGFyZ3M6IHVua25vd24sIGV4ZWM/OiBIb3N0VG9vbFJ1bkNvbnRleHQpID0+IHtcbiAgICAgICAgICAgIGV4ZWM/LnNpZ25hbD8udGhyb3dJZkFib3J0ZWQ/LigpO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgbWNwLmNhbGxUb29sKHRvb2wubmFtZSwgdG9SZWNvcmQoYXJncykpO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9IHJlc3VsdFRleHQocmVzdWx0LmNvbnRlbnQpO1xuICAgICAgICAgICAgaWYgKCFyZXN1bHQub2spIHRocm93IG5ldyBFcnJvcih0ZXh0KTtcbiAgICAgICAgICAgIC8vIFx1OEZENFx1NTZERSBjYW5vbmljYWwgdmFsdWVcdUZGMENcdTdDN0JcdTU3OEJcdTdCMjZcdTU0MDggb3V0cHV0LnNjaGVtYSBcdTU4RjBcdTY2MEVcbiAgICAgICAgICAgIHJldHVybiB7IGNvbnRlbnQ6IFt7IHR5cGU6IFwidGV4dFwiLCB0ZXh0IH1dIH07XG4gICAgICAgICAgfSxcbiAgICAgICAgfSksXG4gICAgICAvLyBcdTY1QjBcdTcyNDhcdTg5ODFcdTZDNDIgZWZmZWN0IFx1NjgwN1x1N0I3RVx1NTUyRlx1NEUwMFx1NTNFRlx1NUI5QVx1NEY0RFx1RkYxQVx1NjMwOVx1NURFNVx1NTE3N1x1NTQwRFx1N0VDNlx1NTMxNlx1RkYwQ1x1NEZCRlx1NEU4RVx1OEJDQVx1NjVBRFx1NUI5QVx1NEY0RFx1MzAwMlxuICAgICAgYG9wZW5saXVsYW4udG9vbC4ke3B1YmxpY05hbWV9YCxcbiAgICApO1xuICB9XG5cbiAgLy8gXHU2NkI0XHU5NzMyXHU0RTAwXHU2NzYxXHUzMDBDXHU5MDAyXHU5MTREXHU4MUVBXHU2OEMwXHUzMDBEXHU3Njg0XHU1QkJGXHU0RTNCXHU4OUMyXHU2RDRCXHU3MEI5XHVGRjFBRFNIIFx1NzI0OFx1NjcyQ1x1N0VCRiArIFx1NURFNVx1NTE3N1x1NkUwNVx1NTM1NVx1MzAwMlxuICAvLyBcdTRFMERcdTZDRThcdTUxOENcdTYyMTBcdTZBMjFcdTU3OEJcdTUzRUZcdTg5QzFcdTVERTVcdTUxNzdcdUZGMENcdTkwN0ZcdTUxNERcdTZDNjFcdTY3RDNcdTVERTVcdTUxNzdcdTc2RUVcdTVGNTVcdUZGMUJcdTc1MzEgbG9hZFByb2ZpbGUoKSBcdThCRkJcdTUzRDZcdTMwMDJcbiAgLy8gXHU1Mzc4XHU4RjdEXHVGRjA4ZWZmZWN0IGRpc3Bvc2VyIFx1ODlFNlx1NTNEMVx1RkYwOVx1NjVGNlx1NTQwQ1x1NkI2NVx1NkUwNVx1NzQwNlx1RkYwQ1x1OTA3Rlx1NTE0RFx1NTQwQyBwcmVmaXggXHU5MUNEXHU4RjdEXHU1NDBFXHU4QkZCXHU1MjMwXHU5NjQ4XHU2NUU3XHU3NTNCXHU1MENGXHUzMDAyXG4gIFBST0ZJTEVTLnNldChwcmVmaXgsIHtcbiAgICBob3N0LFxuICAgIHByZWZpeCxcbiAgICB0b29sczogbWNwLnRvb2xzLm1hcCgodCkgPT4gYCR7cHJlZml4fV8ke3QubmFtZX1gKSxcbiAgfSk7XG4gIGN0eC5lZmZlY3QoXG4gICAgKCkgPT4gKCkgPT4ge1xuICAgICAgaWYgKFBST0ZJTEVTLmdldChwcmVmaXgpPy5ob3N0ID09PSBob3N0KSBQUk9GSUxFUy5kZWxldGUocHJlZml4KTtcbiAgICB9LFxuICAgIGBvcGVubGl1bGFuLnByb2ZpbGUuJHtwcmVmaXh9YCxcbiAgKTtcbn1cblxuLyoqIFx1NURGMlx1NTJBMFx1OEY3RFx1NzY4NFx1NjNEMlx1NEVGNlx1NUI5RVx1NEY4Qlx1NzUzQlx1NTBDRlx1RkYwOFx1NEY5Qlx1NUJCRlx1NEUzQi9cdTZENEJcdThCRDUvQ0kgXHU4QkZCXHU1M0Q2XHVGRjBDXHU0RTBEXHU2Q0U4XHU1MThDXHU0RTNBXHU2QTIxXHU1NzhCXHU1M0VGXHU4OUMxXHU1REU1XHU1MTc3XHVGRjA5XHUzMDAyICovXG5leHBvcnQgaW50ZXJmYWNlIExvYWRlZFByb2ZpbGUge1xuICBob3N0OiBEc2hIb3N0UHJvZmlsZTtcbiAgcHJlZml4OiBzdHJpbmc7XG4gIHRvb2xzOiBzdHJpbmdbXTtcbn1cblxuLyoqIFx1NjMwOSBwcmVmaXggXHU3RDIyXHU1RjE1XHU3Njg0XHU1REYyXHU1MkEwXHU4RjdEXHU3NTNCXHU1MENGXHUzMDAyICovXG5leHBvcnQgY29uc3QgUFJPRklMRVMgPSBuZXcgTWFwPHN0cmluZywgTG9hZGVkUHJvZmlsZT4oKTtcblxuLyoqXG4gKiBcdThCRkJcdTUzRDZcdTY3RDBcdTRFMkEgcHJlZml4IFx1NzY4NFx1NTJBMFx1OEY3RFx1NzUzQlx1NTBDRlx1RkYwOFx1NEY5Qlx1OTAwMlx1OTE0RFx1ODFFQVx1NjhDMFx1NEUwRVx1NkQ0Qlx1OEJENVx1NEY3Rlx1NzUyOFx1RkYwOVx1MzAwMlxuICpcbiAqIEBwYXJhbSBwcmVmaXggLSBcdTVERTVcdTUxNzdcdTUyNERcdTdGMDBcdUZGMENcdTdGM0FcdTc3MDEgYFwiYnJvd3NlclwiYFx1MzAwMlxuICogQHJldHVybnMgXHU1MkEwXHU4RjdEXHU3NTNCXHU1MENGXHVGRjBDXHU2NzJBXHU1MkEwXHU4RjdEXHU2NUY2XHU0RTNBIHVuZGVmaW5lZFx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9hZFByb2ZpbGUocHJlZml4ID0gREVGQVVMVF9QUkVGSVgpOiBMb2FkZWRQcm9maWxlIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIFBST0ZJTEVTLmdldChwcmVmaXgpO1xufVxuXG4vKipcbiAqIFx1OEJDQVx1NjVBRFx1OEY4NVx1NTJBOVx1NzY4NFx1NTE4RFx1NUJGQ1x1NTFGQVx1RkYxQVx1OEJBOSBgdGVzdC9wbHVnaW4tc21va2UubWpzYCBcdTgwRkRcdTc2RjRcdTYzQTVcdTVCRjkqKlx1NURGMlx1Njc4NFx1NUVGQVx1NEVBN1x1NzI2OSoqXG4gKiBcdUZGMDhgbGliL2luZGV4LmpzYFx1RkYwOVx1NjgyMVx1OUE4QyBzY2hlbWFcdUZGMENcdTgwMENcdTRFMERcdTVGQzVcdTRGOURcdThENTYgTm9kZSBcdTc2ODQgVFMgXHU1MjY1XHU3OUJCXHU4MEZEXHU1MjlCXHUzMDAyXG4gKiBEU0ggXHU1M0VBXHU4QkZCIGBhcHBseWAgLyBgbmFtZWAgLyBgaW5qZWN0YFx1RkYwQ1x1OTg5RFx1NTkxNlx1NUJGQ1x1NTFGQVx1NEUwRFx1NUY3MVx1NTRDRFx1NTJBMFx1OEY3RFx1MzAwMlxuICovXG5leHBvcnQgeyBjaGVja1N1cHBvcnRlZFNjaGVtYSwgbm9ybWFsaXplU2NoZW1hLCB2YWxpZGF0ZUFnYWluc3RTY2hlbWEgfSBmcm9tIFwiLi9kc2gtc2NoZW1hLmpzXCI7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7O0FBVU8sU0FBUyxlQUFlLFNBQTRFO0FBQ3pHLFFBQU0sT0FBd0IsQ0FBQztBQUMvQixRQUFNLGNBQXdCLENBQUM7QUFDL0IsUUFBTSxTQUFTLFFBQVEsT0FBTyxDQUFDLE1BQU0sRUFBRSxVQUFVLE9BQU8sRUFBRSxLQUFLO0FBQy9ELFFBQU0sT0FBTyxRQUFRLE9BQU8sQ0FBQyxNQUFNLEVBQUUsYUFBYSxHQUFJO0FBRXRELGFBQVcsS0FBSyxRQUFRO0FBQ3RCLFNBQUssS0FBSztBQUFBLE1BQ1IsTUFBTTtBQUFBLE1BQ04sVUFBVSxFQUFFLFVBQVUsTUFBTSxVQUFVO0FBQUEsTUFDdEMsU0FB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LENBQUMsS0FBSyxLQUFLLE9BQU8sS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLEtBQUs7QUFBQSxFQUM1RDtBQUFBLEVBQ0EsSUFBSSxVQUFVO0FBQ1YsV0FBTyxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLE9BQU87QUFBQSxFQUM5RDtBQUFBLEVBQ0EsSUFBSSxTQUFTO0FBQ1QsV0FBTyxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLE1BQU07QUFBQSxFQUM3RDtBQUFBLEVBQ0EsSUFBSSxXQUFXO0FBQ1gsV0FBTyxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLFFBQVE7QUFBQSxFQUMvRDtBQUFBLEVBQ0EsSUFBSSxTQUFTO0FBQ1QsV0FBTyxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLE1BQU07QUFBQSxFQUM3RDtBQUFBLEVBQ0EsSUFBSSxVQUFVO0FBQ1YsV0FBTyxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLE9BQU87QUFBQSxFQUM5RDtBQUFBLEVBQ0EsSUFBSSxTQUFTO0FBQ1QsV0FBTyxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLE1BQU07QUFBQSxFQUM3RDtBQUFBLEVBQ0EsSUFBSSxPQUFPO0FBQ1AsV0FBTyxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLElBQUk7QUFBQSxFQUMzRDtBQUFBLEVBQ0EsSUFBSSxTQUFTO0FBQ1QsV0FBTyxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sS0FBSyxDQUFDLE9BQU8sR0FBRyxTQUFTLE1BQU07QUFBQSxFQUM3RDtBQUFBLEVBQ0EsSUFBSSxXQUFXO0FBQ1gsV0FBTyxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sS0FBSyxDQUFDLE9BQU8s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VyxTQUFTLEdBQUc7QUFDekIsWUFBTSxJQUFJLE1BQU0sZ0JBQWdCLFVBQVUsa0VBQTBCLFdBQVcsS0FBSyxJQUFJLENBQUMsRUFBRTtBQUFBLElBQzdGO0FBRUEsUUFBSTtBQUFBLE1BQ0YsTUFDRSxNQUFNLFNBQVM7QUFBQSxRQUNiLE1BQU07QUFBQSxRQUNOLGFBQWEsS0FBSztBQUFBLFFBQ2xCO0FBQUEsUUFDQSxRQUFRO0FBQUE7QUFBQSxVQUVOLFFBQVE7QUFBQSxVQUNSLFFBQVE7QUFBQSxRQUNWO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBU0EsU0FBUyxPQUFPLE1BQWUsU0FBOEI7QUFDM0QsZ0JBQU0sUUFBUSxpQkFBaUI7QUFDL0IsZ0JBQU0sU0FBUyxNQUFNLElBQUksU0FBUyxLQUFLLE1BQU0sU0FBUyxJQUFJLENBQUM7QUFDM0QsZ0JBQU0sT0FBTyxXQUFXLE9BQU8sT0FBTztBQUN0QyxjQUFJLENBQUMsT0FBTyxHQUFJLE9BQU0sSUFBSSxNQUFNLElBQUk7QUFFcEMsaUJBQU8sRUFBRSxTQUFTLENBQUMsRUFBRSxNQUFNLFFBQVEsS0FBSyxDQUFDLEVBQUU7QUFBQSxRQUM3QztBQUFBLE1BQ0YsQ0FBQztBQUFBO0FBQUEsTUFFSCxtQkFBbUIsVUFBVTtBQUFBLElBQy9CO0FBQUEsRUFDRjtBQUtBLFdBQVMsSUFBSSxRQUFRO0FBQUEsSUFDbkI7QUFBQSxJQUNBO0FBQUEsSUFDQSxPQUFPLElBQUksTUFBTSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sSUFBSSxFQUFFLElBQUksRUFBRTtBQUFBLEVBQ25ELENBQUM7QUFDRCxNQUFJO0FBQUEsSUFDRixNQUFNLE1BQU07QUFDVixVQUFJLFNBQVMsSUFBSSxNQUFNLEdBQUcsU0FBUyxLQUFNLFVBQVMsT0FBTyxNQUFNO0FBQUEsSUFDakU7QUFBQSxJQUNBLHNCQUFzQixNQUFNO0FBQUEsRUFDOUI7QUFDRjtBQVVPLElBQU0sV0FBVyxvQkFBSSxJQUEyQjtBQVFoRCxTQUFTLFlBQVksU0FBUyxnQkFBMkM7QUFDOUUsU0FBTyxTQUFTLElBQUksTUFBTTtBQUM1QjsiLAogICJuYW1lcyI6IFsidXRpbCIsICJvYmplY3RVdGlsIiwgImVycm9yVXRpbCIsICJlcnJvck1hcCIsICJjdHgiLCAicmVzdWx0IiwgIm1hc2siLCAiaXNzdWVzIiwgImVsZW1lbnRzIiwgInByb2Nlc3NlZCIsICJyZXN1bHQiLCAiciIsICJab2RGaXJzdFBhcnR5VHlwZUtpbmQiLCAibWF4Tm9kZXMiLCAibWF4VGV4dCIsICJ3aXRoU2VsZWN0b3JzIiwgIlBSVU5FX1RBR1MiLCAiVEVYVF9UQUdTIiwgIkFUVFJfV0hJVEVMSVNUIiwgIklOVEVSQUNUSVZFX1RBR1MiLCAiSU5URVJBQ1RJVkVfUk9MRVMiLCAic2NvcmUiLCAibmFtZSIsICJzdW1tYXJpemUiLCAibmFtZSJdCn0K
