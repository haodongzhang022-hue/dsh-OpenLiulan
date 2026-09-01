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

// packages/vision/src/strategy.ts
var VISION_LADDER = `\u6D4F\u89C8\u5668\u89C6\u89C9\u6210\u672C\u9636\u68AF\uFF08\u6309\u4EFB\u52A1\u4ECE\u6700\u4FBF\u5B9C\u5F00\u59CB\uFF0C\u9010\u7EA7\u5347\u7EA7\uFF09\uFF1A
L0 \u7EAF\u6587\u672C DOM \u2014\u2014 observe\uFF08\u53EF\u4EA4\u4E92\u5FEB\u7167+ref\uFF09/ act extract(\u6587\u672C\u63D0\u53D6) / act evaluate(JS\u67E5\u8BE2)\uFF1A\u96F6\u989D\u5916\u6210\u672C\u3001\u6700\u5FEB\u3002
   \u53EA\u8981\u7B54\u6848\u80FD\u4ECE DOM/\u6587\u672C/\u5C5E\u6027\u91CC\u62FF\u5230\uFF0C\u5C31\u7528 L0\uFF0C\u4E0D\u8981\u622A\u56FE\u3002
L1 modlens \u89C6\u89C9\u5F15\u64CE \u2014\u2014 vision \u5DE5\u5177\uFF1A\u622A\u56FE \u2192 \u672C\u5730\u89C6\u89C9\u5F15\u64CE \u2192 \u7EAF\u6587\u672C\u8BC1\u636E\uFF08OCR \u5168\u6587 + \u5E03\u5C40\u533A\u57DF\u9605\u8BFB\u987A\u5E8F + \u8BED\u4E49\u573A\u666F\u63CF\u8FF0 + \u4E0D\u786E\u5B9A\u9879\uFF09\u3002
   \u4EC5\u5F53 L0 \u65E0\u6CD5\u56DE\u7B54\u300C\u9875\u9762\u957F\u4EC0\u4E48\u6837/\u662F\u5426\u53EF\u89C1/\u662F\u5426\u5C45\u4E2D\u91CD\u53E0/\u989C\u8272\u6837\u5F0F/\u56FE\u8868\u56FE\u7247\u5185\u5BB9/Canvas\u6E32\u67D3\u300D\u7B49\u95EE\u9898\u65F6\u4F7F\u7528\u3002\u8D39\u7528\u4F4E\u3001\u6587\u672C\u6A21\u578B\u53EF\u76F4\u63A5\u6D88\u8D39\u3002
L2 \u6A21\u578B\u539F\u751F\u89C6\u89C9 \u2014\u2014 screenshot \u5DE5\u5177\uFF1A\u8FD4\u56DE\u539F\u751F PNG \u56FE\u7247\uFF0C\u53EA\u6709\u652F\u6301\u56FE\u7247\u8F93\u5165\u7684\u591A\u6A21\u6001\u6A21\u578B\u80FD\u770B\u89C1\uFF1B\u89C6\u89C9\u8BA1\u8D39\u6700\u8D35\u3002
   \u4EC5\u5F53 L0+L1 \u7ED3\u5408\u4ECD\u65E0\u6CD5\u89E3\u51B3\uFF08\u5982\u7CBE\u7EC6\u50CF\u7D20\u7EA7\u6BD4\u5BF9\u3001\u590D\u6742\u56FE\u8868\u7EC6\u8BFB\uFF09\u4E14\u5F53\u524D\u6A21\u578B\u786E\u5B9E\u652F\u6301\u56FE\u7247\u8F93\u5165\u65F6\u624D\u4F7F\u7528\u3002
\u89C4\u5219\uFF1A\u9ED8\u8BA4 L0\uFF1B\u6709\u89C6\u89C9\u9700\u6C42\u5148 L1\uFF1BL0+L1 \u90FD\u89E3\u51B3\u4E0D\u4E86\u624D L2\u3002\u7EAF\u6587\u672C\u6A21\u578B\u770B\u5230 screenshot \u7684\u56FE\u7247\u4FE1\u606F\u7B49\u4E8E\u6CA1\u6709\uFF0C\u76F4\u63A5\u7528 L1 \u7684 vision\u3002`;
var VISION_TOOL_DESCRIPTION = "\u622A\u53D6\u5F53\u524D\u9875\u9762\u5E76\u4EA4\u7ED9 modlens \u89C6\u89C9\u5F15\u64CE\uFF08\u5916\u90E8\u5F00\u6E90\u9879\u76EE\uFF0CMIT\uFF09\u8F6C\u6210\u7EAF\u6587\u672C\u8BC1\u636E\uFF1AOCR \u5168\u6587\u3001\u5E03\u5C40\u533A\u57DF\u9605\u8BFB\u987A\u5E8F\u3001\u8BED\u4E49\u573A\u666F/\u5B9E\u4F53/\u5173\u7CFB\u3001\u4E0D\u786E\u5B9A\u9879\u3002\u7EAF\u6587\u672C\u6A21\u578B = \u76F4\u63A5\u53EF\u7528\u7684\u300C\u89C6\u89C9\u300D\u3002\n" + VISION_LADDER + "\n\u53C2\u6570 focus \u53EF\u6307\u5B9A\u5173\u6CE8\u70B9\u4EE5\u63D0\u5347\u8BC1\u636E\u8D28\u91CF\uFF1BsavePath \u53EF\u628A\u622A\u56FE PNG \u843D\u76D8\u7559\u6863\uFF08\u9ED8\u8BA4\u4E34\u65F6\u76EE\u5F55\uFF09\u3002";

// packages/vision/src/engine.ts
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
var DEFAULT_VISION_TIMEOUT_MS = 18e4;
var require_ = createRequire(import.meta.url);
var ENV_CLI_PATH = "MODLENS_CLI_PATH";
function resolveModlensCli() {
  try {
    const envPath = (process.env[ENV_CLI_PATH] ?? "").trim();
    if (envPath) {
      const cli = envPath.replace(/[\\/]+$/, "") + "/dist/main.js";
      if (existsSync(cli)) return { nodeBin: process.execPath, cliPath: cli, source: "env" };
    }
  } catch {
  }
  try {
    const pkgJsonPath = require_.resolve("@liustack/modlens/package.json");
    const cli = pkgJsonPath.replace(/package\.json$/, "dist/main.js");
    if (existsSync(cli)) return { nodeBin: process.execPath, cliPath: cli, source: "resolve" };
  } catch {
  }
  return {
    cliPath: null,
    source: null,
    hint: "\u672A\u627E\u5230 modlens \u89C6\u89C9\u5F15\u64CE\uFF08@liustack/modlens\uFF09\u3002\u5B89\u88C5\u65B9\u5F0F\u4EFB\u9009\uFF1A\n  1) \u5728\u8FD0\u884C DSH \u7684 profile\uFF08\u5982 web\uFF09\u6267\u884C: dsh plugin --profile web add liustack/modlens\n  2) \u6216\u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF MODLENS_CLI_PATH \u6307\u5411\u5176 dist/main.js\uFF08\u6C99\u76D2/AB \u90E8\u7F72\u63A8\u8350\uFF09\n  3) \u6216\u624B\u52A8 npm i -g @liustack/modlens \u540E\u8BBE\u7F6E MODLENS_CLI_PATH\n\u5F15\u64CE\u9996\u6B21\u8FD8\u9700\u914D\u7F6E\u89C6\u89C9\u4F9B\u5E94\u5546\uFF1Anode <modlens>/dist/main.js doctor \u67E5\u770B\uFF0C\u5E38\u89C1\u4E3A gemini-api.apiKey \u6216 reuse.opencode \u590D\u7528\u672C\u673A opencode \u767B\u5F55\u3002"
  };
}
function emptyEvidence() {
  return {
    ok: false,
    imagePath: null,
    provider: null,
    model: null,
    summary: null,
    ocr: { full_text: "", lines: [] },
    layout: { regions: [] },
    semantics: { scene: null, entities: [], relations: [] },
    visual: {},
    uncertainty: []
  };
}
function asArray(v) {
  return Array.isArray(v) ? v : [];
}
function normalizeVisionOutput(raw, imagePath) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ...emptyEvidence(), imagePath, error: "modlens \u8F93\u51FA\u4E0D\u662F\u5408\u6CD5 JSON: " + String(e) };
  }
  const root = parsed ?? {};
  const result = root.result ?? {};
  const meta = root.meta ?? {};
  const ocr = result.ocr ?? {};
  const layout = result.layout ?? {};
  const semantics = result.semantics ?? {};
  const visual = result.visual ?? {};
  const attempts = asArray(meta.attempts);
  const failed = attempts.some((a) => a.ok !== true) || Boolean(root.error);
  return {
    ok: !failed,
    imagePath,
    provider: typeof root.provider === "string" ? root.provider : null,
    model: typeof meta.model === "string" ? meta.model : null,
    summary: typeof result.summary === "string" ? result.summary : null,
    ocr: {
      full_text: typeof ocr.full_text === "string" ? ocr.full_text : "",
      lines: asArray(ocr.lines)
    },
    layout: {
      regions: asArray(layout.regions)
    },
    semantics: {
      scene: typeof semantics.scene === "string" ? semantics.scene : null,
      intent: typeof semantics.intent === "string" ? semantics.intent : null,
      entities: asArray(semantics.entities),
      relations: asArray(semantics.relations).filter((rel) => rel && rel.subject && rel.predicate && rel.object)
    },
    visual: {
      dominant_colors: asArray(visual.dominant_colors),
      style: typeof visual.style === "string" ? visual.style : null,
      notes: asArray(visual.notes)
    },
    uncertainty: asArray(result.uncertainty),
    usage: meta.usage === void 0 ? void 0 : meta.usage,
    durationSeconds: typeof meta.durationSeconds === "number" ? meta.durationSeconds : void 0,
    warnings: asArray(meta.warnings),
    error: typeof root.error === "string" ? root.error : void 0
  };
}
async function runModlens(opts) {
  let resolution;
  if (opts.cliPath) {
    resolution = { nodeBin: process.execPath, cliPath: opts.cliPath, source: "env" };
  } else {
    const res = resolveModlensCli();
    if (res.source === null) {
      return { ...emptyEvidence(), imagePath: opts.imagePath, error: res.hint };
    }
    resolution = res;
  }
  const args = ["-i", opts.imagePath];
  if (opts.focus) args.push("--prompt", opts.focus);
  if (opts.provider) args.push("-p", opts.provider);
  args.push("--timeout", String(opts.timeoutMs ?? DEFAULT_VISION_TIMEOUT_MS));
  return new Promise((resolvePromise) => {
    const child = spawn(resolution.nodeBin, [resolution.cliPath, ...args], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env }
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), (opts.timeoutMs ?? DEFAULT_VISION_TIMEOUT_MS) + 1e4);
    child.stdout.on("data", (d) => {
      stdout += d.toString("utf8");
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolvePromise({ ...emptyEvidence(), imagePath: opts.imagePath, error: "\u65E0\u6CD5\u542F\u52A8 modlens \u5F15\u64CE: " + err.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const tail = stderr.trim().split("\n").slice(-4).join("\n");
        resolvePromise({
          ...emptyEvidence(),
          imagePath: opts.imagePath,
          error: "modlens \u5F15\u64CE\u9000\u51FA (code=" + code + "): " + (tail || "\u65E0\u9519\u8BEF\u8F93\u51FA")
        });
        return;
      }
      resolvePromise(normalizeVisionOutput(stdout, opts.imagePath));
    });
  });
}

// packages/vision/src/format.ts
function clip(s, n = 200) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "\u2026" : t;
}
function formatVisionEvidence(v, opts = {}) {
  const lines = [];
  if (!v.ok) {
    lines.push("## \u{1F441} \u89C6\u89C9\u5F15\u64CE\u4E0D\u53EF\u7528/\u5931\u8D25");
    lines.push((v.error ?? "\u672A\u77E5\u9519\u8BEF").split("\n").join("\n> "));
    lines.push("");
    lines.push("> \u82E5\u672A\u5B89\u88C5\u5F15\u64CE\uFF0C\u6267\u884C `dsh plugin --profile web add liustack/modlens` \u540E\u91CD\u8BD5\uFF08\u89C1 THIRD_PARTY_NOTICES.md \u5F52\u5C5E\u58F0\u660E\uFF09\u3002");
    return lines.join("\n");
  }
  lines.push("## \u{1F441} \u89C6\u89C9\u8BC1\u636E (modlens)");
  if (opts.focus) lines.push(`**\u5173\u6CE8\u70B9**: ${clip(opts.focus, 120)}`);
  const src = [
    v.provider ? `provider=${v.provider}` : "",
    v.model ? `model=${v.model}` : "",
    v.durationSeconds ? `${v.durationSeconds.toFixed(1)}s` : ""
  ].filter(Boolean).join(" \xB7 ");
  if (src) lines.push(`> \u6765\u6E90: ${src}`);
  if (v.imagePath) lines.push(`> \u622A\u56FE\u6587\u4EF6: \`${v.imagePath}\``);
  lines.push("");
  if (v.summary) {
    lines.push(`**\u603B\u7ED3**: ${v.summary}`);
    lines.push("");
  }
  const ocrText = v.ocr.full_text.trim();
  if (ocrText) {
    lines.push("**OCR \u5168\u6587**:", "```", ocrText.length > 4e3 ? ocrText.slice(0, 4e3) + "\u2026(\u622A\u65AD)" : ocrText, "```", "");
  }
  if (v.layout.regions.length) {
    lines.push("**\u5E03\u5C40\u533A\u57DF\uFF08\u9605\u8BFB\u987A\u5E8F\uFF09**:");
    for (const r of v.layout.regions.slice(0, 30)) {
      lines.push(`  ${r.reading_order}. [${r.type}] ${clip(r.text || "(\u65E0\u6587\u672C)", 160)}`);
    }
    lines.push("");
  }
  if (v.semantics.scene || v.semantics.entities.length) {
    lines.push("**\u8BED\u4E49**:");
    if (v.semantics.scene) lines.push(`  \u573A\u666F: ${v.semantics.scene}`);
    if (v.semantics.intent) lines.push(`  \u610F\u56FE: ${v.semantics.intent}`);
    for (const e of v.semantics.entities.slice(0, 20)) {
      lines.push(`  - ${e.name} [${e.type}]${e.evidence ? ` (${clip(e.evidence, 80)})` : ""}`);
    }
    for (const rel of v.semantics.relations.slice(0, 10)) {
      lines.push(`  - ${rel.subject} \u2192 ${rel.predicate} \u2192 ${rel.object}`);
    }
    lines.push("");
  }
  if (v.visual.dominant_colors?.length || v.visual.style || v.visual.notes?.length) {
    lines.push("**\u89C6\u89C9**:");
    if (v.visual.dominant_colors?.length) lines.push(`  \u4E3B\u8272\u8C03: ${v.visual.dominant_colors.join(", ")}`);
    if (v.visual.style) lines.push(`  \u98CE\u683C: ${v.visual.style}`);
    for (const n of v.visual.notes ?? []) lines.push(`  - ${clip(n, 160)}`);
    lines.push("");
  }
  if (v.uncertainty.length) {
    lines.push("**\u4E0D\u786E\u5B9A\u9879**\uFF08\u5F15\u7528\u8BC1\u636E\u65F6\u6CE8\u610F\uFF09:");
    for (const u of v.uncertainty.slice(0, 8)) lines.push(`  - ${clip(u, 160)}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("> \u5347\u7EA7\u8DEF\u5F84\uFF08\u6210\u672C\u9636\u68AF\uFF0C`screenshot` \u662F\u6700\u540E\u624B\u6BB5 L2\uFF09\uFF1A\u8BC1\u636E\u4ECD\u4E0D\u8DB3\u4EE5\u5224\u65AD\u89C6\u89C9\u7EC6\u8282\u3001\u4E14\u5F53\u524D\u6A21\u578B\u652F\u6301\u56FE\u7247\u8F93\u5165\u65F6\uFF0C\u518D\u7528 screenshot \u62FF\u539F\u751F\u56FE\u6BD4\u5BF9\uFF1B\u7EAF\u6587\u672C\u6A21\u578B\u5230\u6B64\u4E3A\u6B62\uFF0C\u7528\u4EE5\u4E0A\u8BC1\u636E + observe/act \u7EE7\u7EED\u3002");
  return lines.join("\n");
}
function formatVisionBrief(v) {
  if (!v.ok) return `\u89C6\u89C9\u5F15\u64CE\u5931\u8D25: ${(v.error ?? "").slice(0, 120)}`;
  const t = v.ocr.full_text.trim();
  return `\u89C6\u89C9\u8BC1\u636E: ${v.summary ?? "(\u65E0\u603B\u7ED3)"} | OCR ${t.length} \u5B57\u7B26 | \u5E03\u5C40 ${v.layout.regions.length} \u533A | \u5B9E\u4F53 ${v.semantics.entities.length} | \u4E0D\u786E\u5B9A ${v.uncertainty.length} \u9879`;
}

// packages/vision/src/opencode.ts
import { spawn as spawn2 } from "node:child_process";
import { existsSync as existsSync2, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
var DEFAULT_OPENCODE_MODELS = [
  "opencode-go/deepseek-v4-flash-vision-exp",
  // opencode-go 网关，实测本机可用
  "github-copilot/claude-haiku-4",
  // GitHub Copilot 登录（Claude 视觉）
  "deepseek/deepseek-v4-flash-vision-exp"
  // DeepSeek 官方视觉（用户自己的 key）
].map((m) => m.toLowerCase());
function findOnPath(bin) {
  const exts = process.platform === "win32" ? [".exe", ".cmd", ".bat"] : [""];
  for (const dir of (process.env.PATH ?? "").split(";").filter(Boolean)) {
    for (const ext of exts) {
      const candidate = resolve(dir, bin + ext);
      if (existsSync2(candidate)) return candidate;
    }
  }
  return null;
}
function resolveOpenCodeBin(explicit) {
  if (explicit && existsSync2(explicit)) return explicit.endsWith(".js") ? { kind: "node", script: explicit } : { kind: "exe", path: explicit };
  const envBin = process.env.OPENCODE_BIN?.trim();
  if (envBin && existsSync2(envBin)) return envBin.endsWith(".js") ? { kind: "node", script: envBin } : { kind: "exe", path: envBin };
  const found = findOnPath("opencode");
  if (!found) return null;
  if (!/\.(cmd|bat)$/i.test(found)) return { kind: "exe", path: found };
  try {
    const shim = readFileSync(found, "utf8");
    const m = shim.match(/dp0%[\\/]+node_modules[\\/]+([^"\\/]+)[\\/]+([^"%]+?\.(?:exe|js))/i);
    if (m) {
      const target = resolve(dirname(found) + "/node_modules/" + m[1] + "/" + m[2]);
      if (existsSync2(target)) {
        return /\.js$/i.test(m[2]) ? { kind: "node", script: target } : { kind: "exe", path: target };
      }
    }
  } catch {
  }
  return { kind: "exe", path: found };
}
function parseOpenCodeEvents(raw) {
  const out = { texts: [] };
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    let ev;
    try {
      ev = JSON.parse(t);
    } catch {
      continue;
    }
    if (ev.type === "text" && typeof ev.part?.text === "string") {
      out.texts.push(ev.part.text);
    } else if (ev.type === "error") {
      const msg = ev.error?.data?.message ?? ev.error?.message ?? JSON.stringify(ev.error);
      out.error = String(msg).slice(0, 500);
    } else if (ev.type === "step_finish" && ev.part?.tokens) {
      out.tokens = ev.part.tokens;
      if (typeof ev.part.cost === "number") out.cost = ev.part.cost;
    }
  }
  return out;
}
function extractJson(answer) {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(answer.slice(start, end + 1));
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}
function buildOpenCodePrompt(focus) {
  const shape = [
    "{",
    '  "summary": "one-sentence overall description",',
    '  "ocr": { "full_text": "all visible text, line-broken", "lines": [{ "text": "each visible line" }] },',
    '  "layout": { "regions": [{ "reading_order": 1, "type": "title|heading|paragraph|list|table|chart|form|image|icon|link|nav|button|search|dialog|banner", "text": "what this region is/contains" }] },',
    '  "semantics": { "scene": "what kind of page/UI this is", "entities": [{ "name": "...", "type": "button|input|label|chart|dialog|...", "evidence": "why" }], "relations": [] },',
    '  "visual": { "dominant_colors": [], "style": "flat|material|dark|...", "notes": [] },',
    '  "uncertainty": ["anything you could not read confidently"]',
    "}"
  ];
  const lines = [
    "You are the vision engine of a browser automation tool. Analyze the attached screenshot.",
    "Reply with ONE JSON object, no prose, no markdown fence, using exactly this shape:",
    ...shape
  ];
  if (focus) lines.push("Extra focus from the caller: " + focus);
  return lines.join("\n");
}
async function runOpenCodeVision(opts) {
  const bin = resolveOpenCodeBin(opts.bin);
  if (!bin) {
    return {
      ok: false,
      imagePath: opts.imagePath,
      provider: null,
      model: null,
      summary: null,
      ocr: { full_text: "", lines: [] },
      layout: { regions: [] },
      semantics: { scene: null, entities: [], relations: [] },
      visual: {},
      uncertainty: [],
      error: "opencode CLI \u672A\u627E\u5230\uFF1A\u8BBE\u7F6E OPENCODE_BIN \u6216\u5C06\u5176\u52A0\u5165 PATH\u3002"
    };
  }
  const models = (opts.models && opts.models.length ? opts.models : DEFAULT_OPENCODE_MODELS).map((m) => m.toLowerCase());
  const timeoutMs = opts.timeoutMs ?? 18e4;
  for (const model of models) {
    const prompt = buildOpenCodePrompt(opts.focus);
    const res = await new Promise((resolvePromise) => {
      const args = ["run", prompt, "-m", model, "--format", "json", "-f", opts.imagePath];
      const child = bin.kind === "node" ? spawn2(process.execPath, [bin.script, ...args], {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        cwd: dirname(resolve(opts.imagePath)),
        env: { ...process.env }
      }) : spawn2(bin.path, args, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        cwd: dirname(resolve(opts.imagePath)),
        env: { ...process.env }
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => child.kill(), timeoutMs + 1e4);
      child.stdout.on("data", (d) => {
        stdout += d.toString("utf8");
      });
      child.stderr.on("data", (d) => {
        stderr += d.toString("utf8");
      });
      child.on("error", (e) => {
        clearTimeout(timer);
        resolvePromise({ ok: false, err: "opencode \u542F\u52A8\u5931\u8D25: " + e.message });
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          resolvePromise({ ok: false, err: "opencode \u9000\u51FA (code=" + code + "): " + (stderr.trim().split("\n").slice(-3).join("\n") || "\u65E0\u9519\u8BEF\u8F93\u51FA") });
          return;
        }
        resolvePromise({ ok: true, raw: stdout });
      });
    });
    if (!res.ok) {
      const skipped = res.err ?? "unknown";
      if (skipped.includes("Insufficient balance") || skipped.includes("CreditsError") || skipped.includes("not supported")) {
        continue;
      }
      return emptyFail(opts.imagePath, skipped);
    }
    const events = parseOpenCodeEvents(res.raw ?? "");
    if (events.error) {
      if (events.error.includes("Insufficient balance") || events.error.includes("CreditsError") || events.error.includes("not supported")) continue;
      return emptyFail(opts.imagePath, events.error);
    }
    const answer = events.texts.join("\n");
    const parsed = extractJson(answer);
    if (!parsed) return emptyFail(opts.imagePath, "opencode \u672A\u8FD4\u56DE\u5408\u6CD5 JSON \u8BC1\u636E");
    const root = {
      image: opts.imagePath,
      provider: "opencode-cli:" + model,
      result: parsed,
      meta: {
        model,
        durationSeconds: null,
        usage: events.tokens ?? null,
        attempts: [{ provider: "opencode-cli", ok: true }],
        warnings: ["opencode \u76F4\u8FDE\u56DE\u9000\uFF08modlens \u5F15\u64CE\u4E0D\u53EF\u7528\u65F6\u7684 L1 \u6B21\u7EA7\u901A\u9053\uFF09"]
      }
    };
    return normalizeVisionOutput(JSON.stringify(root), opts.imagePath);
  }
  return emptyFail(opts.imagePath, "\u5168\u90E8\u56DE\u9000\u6A21\u578B\u5747\u4E0D\u53EF\u7528\uFF08\u6B20\u8D39\u6216\u6A21\u578B\u4E0D\u652F\u6301\uFF09\uFF0C\u8BF7\u68C0\u67E5 opencode \u767B\u5F55\u4E0E\u914D\u989D\u3002");
}
function emptyFail(imagePath, error) {
  return {
    ok: false,
    imagePath,
    provider: null,
    model: null,
    summary: null,
    ocr: { full_text: "", lines: [] },
    layout: { regions: [] },
    semantics: { scene: null, entities: [], relations: [] },
    visual: {},
    uncertainty: [],
    error
  };
}

// packages/mcp-server/src/tools.ts
var TOOLS = [
  {
    name: "observe",
    description: "\u83B7\u53D6\u5F53\u524D\u9875\u9762\u7684\u9AD8\u6548\u5FEB\u7167\u3002\u8FD4\u56DE\u7CBE\u7B80\u540E\u7684\u53EF\u4EA4\u4E92\u5143\u7D20\u7D22\u5F15\uFF08\u5E26 ref\uFF09\u4E0E\u9875\u9762\u7EDF\u8BA1\u3002Token \u53CB\u597D\uFF0C\u662F\u7406\u89E3\u9875\u9762\u7684\u9996\u9009\u3002\uFF08\u6210\u672C\u9636\u68AF L0\uFF1A\u7EAF\u6587\u672C DOM \u5FEB\u7167\uFF0C\u96F6\u989D\u5916\u6210\u672C\uFF0C\u662F\u7406\u89E3\u9875\u9762\u7684\u9ED8\u8BA4\u7B2C\u4E00\u6B65\uFF09",
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
    description: "\u622A\u53D6\u5F53\u524D\u9875\u9762\uFF08\u53EF\u6574\u9875\uFF09\uFF0C\u8FD4\u56DE base64 \u56FE\u7247\uFF0C\u7528\u4E8E\u89C6\u89C9\u786E\u8BA4\u3002\u622A\u56FE\u4F1A\u4F5C\u4E3A\u56FE\u7247\u4E8B\u4EF6\u5199\u5165\u4F1A\u8BDD\u65E5\u5FD7\uFF0C\u4F9B\u591A\u6A21\u6001 AI \u6D88\u8D39\u3002\uFF08\u6210\u672C\u9636\u68AF L2 \u6700\u540E\u624B\u6BB5\uFF1A\u539F\u751F\u56FE\u7247\u4EC5\u591A\u6A21\u6001\u6A21\u578B\u53EF\u89C1\u5E76\u8BA1\u8D39\uFF1B\u7EAF\u6587\u672C\u6A21\u578B\u8BF7\u4F18\u5148\u7528 vision L1 \u83B7\u53D6\u6587\u672C\u8BC1\u636E\uFF09",
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
  },
  {
    name: "vision",
    description: VISION_TOOL_DESCRIPTION,
    inputSchema: {
      type: "object",
      properties: {
        focus: { type: "string", description: "\u5173\u6CE8\u70B9\uFF08\u53EF\u9009\uFF09\uFF1A\u544A\u8BC9\u5F15\u64CE\u91CD\u70B9\u770B\u4EC0\u4E48\uFF0C\u5982\u201C\u9875\u9762\u4E2D\u95F4\u7684\u5F39\u7A97\u6587\u6848\u4E0E\u6309\u94AE\u989C\u8272\u201D" },
        fullPage: { type: "boolean", description: "\u662F\u5426\u6574\u9875\u622A\u56FE\uFF08\u9ED8\u8BA4\u4EC5\u89C6\u53E3\uFF09" },
        savePath: { type: "string", description: "\u53EF\u9009\uFF1A\u622A\u56FE PNG \u7684\u7EDD\u5BF9\u8DEF\u5F84\uFF08\u9ED8\u8BA4\u7CFB\u7EDF\u4E34\u65F6\u76EE\u5F55\uFF09" }
      }
    }
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
        const snapOpts = { clip: action.clip, animations: "disabled", caret: "hide" };
        const buf = action.fullPage ? await this.page.screenshot({ fullPage: true, ...snapOpts }) : await this.page.screenshot(snapOpts);
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
        case "vision": {
          const b = await this.ensureBrowser();
          const focus = args.focus ? String(args.focus).slice(0, 500) : void 0;
          const fullPage = !!args.fullPage;
          let shot = await b.act({ type: "screenshot", fullPage });
          let base64 = shot.data?.base64;
          if (!shot.ok || typeof base64 !== "string") {
            await new Promise((r0) => setTimeout(r0, 1500));
            shot = await b.act({ type: "screenshot", fullPage });
            base64 = shot.data?.base64;
          }
          if (!shot.ok || typeof base64 !== "string") {
            result = errResult(`vision \u524D\u7F6E\u622A\u56FE\u5931\u8D25\uFF08\u4E24\u6B21\u5C1D\u8BD5\uFF09: ${shot.summary}`);
            break;
          }
          const { writeFileSync, mkdirSync } = await import("node:fs");
          const { tmpdir } = await import("node:os");
          const { join, resolve: resolve2, dirname: dirname2 } = await import("node:path");
          const ts = Date.now();
          const rand = Math.random().toString(36).slice(2, 8);
          const target = args.savePath ? resolve2(String(args.savePath)) : join(tmpdir(), `openliulan-vision-${ts}-${rand}.png`);
          if (!target.endsWith(".png") && !target.endsWith(".jpg")) {
            result = errResult("vision savePath \u5FC5\u987B\u4EE5 .png \u7ED3\u5C3E\uFF08\u9632\u4EFB\u610F\u6587\u4EF6\u5199\u5165\uFF09");
            break;
          }
          mkdirSync(dirname2(target), { recursive: true });
          writeFileSync(target, Buffer.from(base64, "base64"));
          let visionResult = await runModlens({
            imagePath: target,
            focus,
            cliPath: this.opts.vision?.cliPath,
            timeoutMs: this.opts.vision?.timeoutMs ?? 18e4
          });
          let evidenceText = formatVisionEvidence(visionResult, { focus });
          if (!visionResult.ok) {
            const fallback = this.opts.vision?.opencodeFallback ?? true;
            if (fallback) {
              const fb = await runOpenCodeVision({
                imagePath: target,
                focus,
                models: this.opts.vision?.opencodeModels,
                bin: this.opts.vision?.opencodeBin,
                timeoutMs: this.opts.vision?.timeoutMs ?? 18e4
              });
              if (fb.ok) {
                evidenceText = formatVisionEvidence(fb, { focus }) + "\n> \u6CE8\uFF1A\u672C\u6B21\u7531 opencode \u76F4\u8FDE\u56DE\u9000\u5B8C\u6210\uFF08modlens \u5F15\u64CE\u4E0D\u53EF\u7528\uFF0C\u89C1 docs/vision.md\uFF09\u3002";
                visionResult = fb;
              } else {
                result = errResult(evidenceText + "\n\n[opencode \u56DE\u9000\u4E5F\u5931\u8D25] " + (fb.error ?? ""));
                this.logger.error({
                  message: "vision \u5F15\u64CE\u5931\u8D25: " + (visionResult.error ?? "").slice(0, 200),
                  code: "VISION_ENGINE_FAILED",
                  reason: "vision-engine-unavailable",
                  raw: visionResult.error ?? "",
                  explanation: "modlens \u89C6\u89C9\u5F15\u64CE\u7F3A\u5931\u6216\u4F9B\u5E94\u5546\u672A\u914D\u7F6E\uFF0Copencode \u76F4\u8FDE\u56DE\u9000\u4EA6\u5931\u8D25\uFF1B\u5148\u5B89\u88C5/\u914D\u7F6E\u5F15\u64CE\uFF08\u89C1 THIRD_PARTY_NOTICES.md \u5F52\u5C5E\u4E0E docs/vision.md\uFF09\u3002",
                  suggestion: "modlens: dsh plugin --profile web add liustack/modlens \u4E14 node <modlens>/dist/main.js doctor \u914D\u7F6E\u4F9B\u5E94\u5546\uFF08reuse.opencode \u6216 gemini-api.apiKey\uFF09\uFF1Bopencode: \u68C0\u67E5\u767B\u5F55\u4E0E\u914D\u989D\uFF08opencode auth list\uFF09\u3002"
                });
                break;
              }
            } else {
              result = errResult(evidenceText);
              this.logger.error({
                message: "vision \u5F15\u64CE\u5931\u8D25: " + (visionResult.error ?? "").slice(0, 200),
                code: "VISION_ENGINE_FAILED",
                reason: "vision-engine-unavailable",
                raw: visionResult.error ?? "",
                explanation: "modlens \u89C6\u89C9\u5F15\u64CE\u7F3A\u5931\u6216\u4F9B\u5E94\u5546\u672A\u914D\u7F6E\uFF1B\u5148\u5B89\u88C5/\u914D\u7F6E\u5F15\u64CE\uFF08\u89C1 THIRD_PARTY_NOTICES.md \u5F52\u5C5E\u4E0E docs/vision.md\uFF09\u3002",
                suggestion: "\u5B89\u88C5 @liustack/modlens\uFF08dsh plugin --profile web add liustack/modlens\uFF09\u6216\u8BBE\u7F6E MODLENS_CLI_PATH\uFF1B\u7136\u540E node <modlens>/dist/main.js doctor \u914D\u7F6E\u4F9B\u5E94\u5546\uFF08\u5982 reuse.opencode\uFF09\u3002"
              });
              break;
            }
          }
          result = okResult(evidenceText, {
            imagePath: target,
            provider: visionResult.provider,
            model: visionResult.model,
            usage: visionResult.usage,
            uncertainty: visionResult.uncertainty
          });
          this.logger.log({
            category: "vision",
            message: `vision \u5B8C\u6210: ${formatVisionBrief(visionResult)}`,
            payload: { imagePath: target, provider: visionResult.provider }
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

// src/plugin.ts
var name = "openliulan-browser";
var DEFAULT_PREFIX = "browser";
function toRecord(args) {
  return typeof args === "object" && args !== null ? args : {};
}
function resultText(content) {
  if (!content || content.length === 0) return "(\u65E0\u8F93\u51FA)";
  return content.map((block) => block.text ?? "").join("\n");
}
function apply(ctx, config = {}) {
  const prefix = typeof config.prefix === "string" && config.prefix ? config.prefix : DEFAULT_PREFIX;
  const mcp = new ForgeMcp({
    headless: config.headless === void 0 ? true : Boolean(config.headless),
    connectUrl: typeof config.connectUrl === "string" ? config.connectUrl : void 0,
    stealth: config.stealth ?? void 0
  });
  const tools = ctx.tools;
  for (const tool of mcp.tools) {
    const parameters = tool.inputSchema.properties ?? {};
    const publicName = `${prefix}_${tool.name}`;
    ctx.effect(
      () => tools.register({
        name: publicName,
        description: tool.description,
        parameters,
        output: {
          schema: {
            type: "object",
            properties: { content: { type: "array", items: {} } },
            required: ["content"],
            additionalProperties: false
          },
          render(_args, value) {
            const text = resultText((value ?? {}).content ?? []);
            return [{ type: "text", text }];
          }
        },
        execute: async (args) => {
          const result = await mcp.callTool(tool.name, toRecord(args));
          const text = resultText(result.content);
          if (!result.ok) throw new Error(text);
          return { isError: false, value: { content: text }, content: [{ type: "text", text }] };
        }
      }),
      "openliulan.tool"
    );
  }
}
export {
  apply,
  name
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcGFja2FnZXMvZGlhZ25vc2lzL3NyYy9hbmFseXplci50cyIsICIuLi9wYWNrYWdlcy9kaWFnbm9zaXMvc3JjL3R5cGVzLnRzIiwgIi4uL3BhY2thZ2VzL2RpYWdub3Npcy9zcmMvaW5kZXgudHMiLCAiLi4vcGFja2FnZXMvdmlzaW9uL3NyYy9zdHJhdGVneS50cyIsICIuLi9wYWNrYWdlcy92aXNpb24vc3JjL2VuZ2luZS50cyIsICIuLi9wYWNrYWdlcy92aXNpb24vc3JjL2Zvcm1hdC50cyIsICIuLi9wYWNrYWdlcy92aXNpb24vc3JjL29wZW5jb2RlLnRzIiwgIi4uL3BhY2thZ2VzL21jcC1zZXJ2ZXIvc3JjL3Rvb2xzLnRzIiwgIi4uL25vZGVfbW9kdWxlcy96b2QvdjMvZXh0ZXJuYWwuanMiLCAiLi4vbm9kZV9tb2R1bGVzL3pvZC92My9oZWxwZXJzL3V0aWwuanMiLCAiLi4vbm9kZV9tb2R1bGVzL3pvZC92My9ab2RFcnJvci5qcyIsICIuLi9ub2RlX21vZHVsZXMvem9kL3YzL2xvY2FsZXMvZW4uanMiLCAiLi4vbm9kZV9tb2R1bGVzL3pvZC92My9lcnJvcnMuanMiLCAiLi4vbm9kZV9tb2R1bGVzL3pvZC92My9oZWxwZXJzL3BhcnNlVXRpbC5qcyIsICIuLi9ub2RlX21vZHVsZXMvem9kL3YzL2hlbHBlcnMvZXJyb3JVdGlsLmpzIiwgIi4uL25vZGVfbW9kdWxlcy96b2QvdjMvdHlwZXMuanMiLCAiLi4vcGFja2FnZXMvY29yZS9zcmMvYWN0aW9ucy50cyIsICIuLi9wYWNrYWdlcy9jb3JlL3NyYy9zZXNzaW9uLnRzIiwgIi4uL3BhY2thZ2VzL2NvcmUvc3JjL2ZvcmdlLnRzIiwgIi4uL3BhY2thZ2VzL2VuZ2luZXMvc3JjL2xvY2F0b3IudHMiLCAiLi4vcGFja2FnZXMvZW5naW5lcy9zcmMvc25hcHNob3QudHMiLCAiLi4vcGFja2FnZXMvZW5naW5lcy9zcmMvZGlhZ25vc3RpY3MudHMiLCAiLi4vcGFja2FnZXMvZW5naW5lcy9zcmMvcGxheXdyaWdodC1lbmdpbmUudHMiLCAiLi4vcGFja2FnZXMvYWktbGF5ZXIvc3JjL3NlbWFudGljLWxvY2F0b3IudHMiLCAiLi4vcGFja2FnZXMvc3RlYWx0aC9zcmMvc3RlYWx0aC50cyIsICIuLi9wYWNrYWdlcy90b2tlbi9zcmMvaW5kZXgudHMiLCAiLi4vcGFja2FnZXMvbWNwLXNlcnZlci9zcmMvc2VjdXJpdHkudHMiLCAiLi4vcGFja2FnZXMvbWNwLXNlcnZlci9zcmMvbG9nZ2VyLnRzIiwgIi4uL3BhY2thZ2VzL21jcC1zZXJ2ZXIvc3JjL2ZvcmdlLW1jcC50cyIsICIuLi9wYWNrYWdlcy9tY3Atc2VydmVyL3NyYy9zb2x1dGlvbnMudHMiLCAiLi4vc3JjL3BsdWdpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBcdThCQ0FcdTY1QURcdTUyMDZcdTY3OTBcdTU2NjhcdUZGMUFcdTYyOEFcdTUzOUZcdTU5Q0JcdThCQ0FcdTY1QURcdTY1NzBcdTYzNkVcdTUyQTBcdTVERTVcdTYyMTBcdTRGOUIgQUkgXHU1MUIzXHU3QjU2XHU3Njg0XHU3RUQzXHU4QkJBXHUzMDAyXG4gKiBcdTUwMUZcdTkyNzQgQ2hyb21lIERldlRvb2xzIE1DUFx1MzAwQ1x1NTE0OFx1N0VEOVx1N0VEM1x1OEJCQVx1MzAwMVx1NTE4RFx1N0VEOVx1N0VDNlx1ODI4Mlx1MzAwRFx1NzY4NFx1NjAxRFx1OERFRlx1RkYwQ1x1ODI4Mlx1NzcwMSBUb2tlblx1MzAwMlxuICovXG5pbXBvcnQgdHlwZSB7IERpYWdub3N0aWNSZWYgfSBmcm9tIFwiQG9wZW5saXVsYW4vY29yZVwiO1xuaW1wb3J0IHR5cGUgeyBEaWFnbm9zaXNSZXBvcnQsIERpYWdub3Npc1N1bW1hcnksIE5ldHdvcmtSZWNvcmQsIFBlcmZvcm1hbmNlTWV0cmljcyB9IGZyb20gXCIuL3R5cGVzLmpzXCI7XG5cbi8qKlxuICogXHU3RjUxXHU3RURDXHU1OTMxXHU4RDI1XHU1MjA2XHU2NzkwXHVGRjFBXHU1QzA2XHU3RjUxXHU3RURDXHU4QkIwXHU1RjU1XHU4RjZDXHU1MzE2XHU0RTNBXHU4QkNBXHU2NUFEXHU1RjE1XHU3NTI4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplTmV0d29yayhyZWNvcmRzOiBOZXR3b3JrUmVjb3JkW10pOiB7IHJlZnM6IERpYWdub3N0aWNSZWZbXTsgc3VnZ2VzdGlvbnM6IHN0cmluZ1tdIH0ge1xuICBjb25zdCByZWZzOiBEaWFnbm9zdGljUmVmW10gPSBbXTtcbiAgY29uc3Qgc3VnZ2VzdGlvbnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGZhaWxlZCA9IHJlY29yZHMuZmlsdGVyKChyKSA9PiByLnN0YXR1cyA+PSA0MDAgfHwgci5lcnJvcik7XG4gIGNvbnN0IHNsb3cgPSByZWNvcmRzLmZpbHRlcigocikgPT4gci5kdXJhdGlvbk1zID4gMzAwMCk7XG5cbiAgZm9yIChjb25zdCByIG9mIGZhaWxlZCkge1xuICAgIHJlZnMucHVzaCh7XG4gICAgICBraW5kOiBcIm5ldHdvcmtcIixcbiAgICAgIHNldmVyaXR5OiByLnN0YXR1cyA+PSA1MDAgPyBcImVycm9yXCIgOiBcIndhcm5pbmdcIixcbiAgICAgIG1lc3NhZ2U6IGBcdThCRjdcdTZDNDJcdTU5MzFcdThEMjUgJHtyLm1ldGhvZH0gJHtyLnVybH0gKCR7ci5zdGF0dXN9JHtyLnN0YXR1c1RleHQgPyBcIiBcIiArIHIuc3RhdHVzVGV4dCA6IFwiXCJ9KSR7ci5lcnJvciA/IFwiIFx1MjAxNCBcIiArIHIuZXJyb3IgOiBcIlwifWAsXG4gICAgICBkZXRhaWw6IHsgZHVyYXRpb25Nczogci5kdXJhdGlvbk1zLCByZXF1ZXN0SWQ6IHIucmVxdWVzdElkIH0sXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgfSk7XG4gIH1cbiAgZm9yIChjb25zdCByIG9mIHNsb3cpIHtcbiAgICByZWZzLnB1c2goe1xuICAgICAga2luZDogXCJuZXR3b3JrXCIsXG4gICAgICBzZXZlcml0eTogXCJ3YXJuaW5nXCIsXG4gICAgICBtZXNzYWdlOiBgXHU2MTYyXHU4QkY3XHU2QzQyICR7ci5kdXJhdGlvbk1zfW1zICR7ci5tZXRob2R9ICR7ci51cmx9YCxcbiAgICAgIGRldGFpbDogeyBzdGF0dXM6IHIuc3RhdHVzIH0sXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgfSk7XG4gIH1cblxuICBpZiAoZmFpbGVkLmxlbmd0aCkgc3VnZ2VzdGlvbnMucHVzaChgXHU3RjUxXHU3RURDXHU1QjU4XHU1NzI4ICR7ZmFpbGVkLmxlbmd0aH0gXHU0RTJBXHU1OTMxXHU4RDI1XHU4QkY3XHU2QzQyXHVGRjBDXHU1M0VGXHU4MEZEXHU2NjJGXHU4RDQ0XHU2RTkwIDQwNC81MDAgXHU2MjE2IENPUlMvXHU4REU4XHU1N0RGXHU5NjNCXHU2NUFEYCk7XG4gIGlmIChzbG93Lmxlbmd0aCkgc3VnZ2VzdGlvbnMucHVzaChgXHU1QjU4XHU1NzI4ICR7c2xvdy5sZW5ndGh9IFx1NEUyQVx1NjE2Mlx1OEJGN1x1NkM0Mig+M3MpXHVGRjBDXHU4MDAzXHU4NjUxXHU2OEMwXHU2N0U1XHU1NDBFXHU3QUVGXHU2M0E1XHU1M0UzXHU2MjE2XHU4RDQ0XHU2RTkwXHU1MkEwXHU4RjdEYCk7XG4gIHJldHVybiB7IHJlZnMsIHN1Z2dlc3Rpb25zIH07XG59XG5cbi8qKlxuICogXHU2MDI3XHU4MEZEXHU1MjA2XHU2NzkwXHVGRjFBXHU1QzA2XHU2MzA3XHU2ODA3XHU4RjZDXHU1MzE2XHU0RTNBXHU4QkNBXHU2NUFEXHU1RjE1XHU3NTI4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplUGVyZm9ybWFuY2UobWV0cmljczogUGVyZm9ybWFuY2VNZXRyaWNzKTogeyByZWZzOiBEaWFnbm9zdGljUmVmW107IHN1Z2dlc3Rpb25zOiBzdHJpbmdbXSB9IHtcbiAgY29uc3QgcmVmczogRGlhZ25vc3RpY1JlZltdID0gW107XG4gIGNvbnN0IHN1Z2dlc3Rpb25zOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGlmIChtZXRyaWNzLnR0ZmIgPiAxMDAwKSB7XG4gICAgcmVmcy5wdXNoKHtcbiAgICAgIGtpbmQ6IFwicGVyZm9ybWFuY2VcIixcbiAgICAgIHNldmVyaXR5OiBcIndhcm5pbmdcIixcbiAgICAgIG1lc3NhZ2U6IGBUVEZCIFx1NTA0Rlx1OUFEODogJHttZXRyaWNzLnR0ZmJ9bXNcdUZGMDhcdTk5OTZcdTVCNTdcdTgyODJcdTU0Q0RcdTVFOTRcdTYxNjJcdUZGMENcdTUzRUZcdTgwRkRcdTY3MERcdTUyQTFcdTdBRUZcdTYxNjJcdTYyMTZcdTdGNTFcdTdFRENcdTVERUVcdUZGMDlgLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgIH0pO1xuICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJUVEZCID4gMXNcdUZGMENcdTRGMThcdTUxNDhcdTYzOTJcdTY3RTVcdTY3MERcdTUyQTFcdTdBRUZcdTU0Q0RcdTVFOTRcdTRFMEUgQ0ROXCIpO1xuICB9XG4gIGlmIChtZXRyaWNzLmxjcCAmJiBtZXRyaWNzLmxjcCA+IDI1MDApIHtcbiAgICByZWZzLnB1c2goe1xuICAgICAga2luZDogXCJwZXJmb3JtYW5jZVwiLFxuICAgICAgc2V2ZXJpdHk6IFwid2FybmluZ1wiLFxuICAgICAgbWVzc2FnZTogYExDUCBcdTUwNEZcdTlBRDg6ICR7bWV0cmljcy5sY3B9bXNcdUZGMDhcdTY3MDBcdTU5MjdcdTUxODVcdTVCQjlcdTdFRDhcdTUyMzZcdTYxNjJcdUZGMENcdTVGNzFcdTU0Q0RcdTk5OTZcdTVDNEZcdUZGMDlgLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgIH0pO1xuICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJMQ1AgPiAyLjVzXHVGRjBDXHU1MTczXHU2Q0U4XHU5OTk2XHU1QzRGXHU1NkZFXHU3MjQ3L1x1NTkyN1x1OEQ0NFx1NkU5MFx1NTJBMFx1OEY3RFwiKTtcbiAgfVxuICBpZiAobWV0cmljcy5sb25nVGFza3MgPiAzKSB7XG4gICAgcmVmcy5wdXNoKHtcbiAgICAgIGtpbmQ6IFwicGVyZm9ybWFuY2VcIixcbiAgICAgIHNldmVyaXR5OiBcIndhcm5pbmdcIixcbiAgICAgIG1lc3NhZ2U6IGBcdTRFM0JcdTdFQkZcdTdBMEJcdTk1N0ZcdTRFRkJcdTUyQTEgJHttZXRyaWNzLmxvbmdUYXNrc30gXHU2QjIxXHVGRjA4SlMgXHU1M0VGXHU4MEZEXHU5NjNCXHU1ODVFXHU2RTMyXHU2N0QzXHVGRjA5YCxcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICB9KTtcbiAgICBzdWdnZXN0aW9ucy5wdXNoKFwiXHU1QjU4XHU1NzI4XHU5NTdGXHU0RUZCXHU1MkExXHU5NjNCXHU1ODVFXHU0RTNCXHU3RUJGXHU3QTBCXHVGRjBDXHU2OEMwXHU2N0U1XHU1NDBDXHU2QjY1XHU4MTFBXHU2NzJDL1x1NUJDNlx1OTZDNlx1OEJBMVx1N0I5N1wiKTtcbiAgfVxuICBpZiAobWV0cmljcy5yZXNvdXJjZXMudG90YWxCeXRlcyA+IDUgKiAxMDI0ICogMTAyNCkge1xuICAgIHJlZnMucHVzaCh7XG4gICAgICBraW5kOiBcInBlcmZvcm1hbmNlXCIsXG4gICAgICBzZXZlcml0eTogXCJpbmZvXCIsXG4gICAgICBtZXNzYWdlOiBgXHU5ODc1XHU5NzYyXHU4RDQ0XHU2RTkwXHU2MDNCXHU5MUNGXHU4RjgzXHU1OTI3OiAkeyhtZXRyaWNzLnJlc291cmNlcy50b3RhbEJ5dGVzIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoMSl9TUJgLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgIH0pO1xuICB9XG4gIHJldHVybiB7IHJlZnMsIHN1Z2dlc3Rpb25zIH07XG59XG5cbi8qKlxuICogXHU2QzQ3XHU2MDNCXHU4QkNBXHU2NUFEXHU2MkE1XHU1NDRBXHVGRjBDXHU3NTFGXHU2MjEwXHU1MDY1XHU1RUI3XHU1RUE2XHU0RTBFXHU1RUZBXHU4QkFFXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdW1tYXJpemUocmVwb3J0OiBEaWFnbm9zaXNSZXBvcnQpOiBEaWFnbm9zaXNTdW1tYXJ5IHtcbiAgY29uc3QgaXNzdWVzOiBEaWFnbm9zaXNTdW1tYXJ5W1wiaXNzdWVzXCJdID0gW107XG4gIGNvbnN0IHN1Z2dlc3Rpb25zOiBzdHJpbmdbXSA9IFtdO1xuXG4gIC8vIFx1NjNBN1x1NTIzNlx1NTNGMFx1OTUxOVx1OEJFRlxuICBjb25zdCBjb25zb2xlRXJyb3JzID0gcmVwb3J0LmNvbnNvbGUuZmlsdGVyKChjKSA9PiBjLnNldmVyaXR5ID09PSBcImVycm9yXCIpO1xuICBmb3IgKGNvbnN0IGUgb2YgY29uc29sZUVycm9ycykge1xuICAgIGlzc3Vlcy5wdXNoKHsgY2F0ZWdvcnk6IFwiY29uc29sZVwiLCBzZXZlcml0eTogXCJlcnJvclwiLCBtZXNzYWdlOiBlLm1lc3NhZ2UgfSk7XG4gIH1cbiAgaWYgKGNvbnNvbGVFcnJvcnMubGVuZ3RoKSBzdWdnZXN0aW9ucy5wdXNoKGBcdTYzQTdcdTUyMzZcdTUzRjBcdTY3MDkgJHtjb25zb2xlRXJyb3JzLmxlbmd0aH0gXHU2NzYxXHU5NTE5XHU4QkVGXHVGRjBDXHU1M0VGXHU4MEZEXHU2NjJGIEpTIFx1NUYwMlx1NUUzOFx1NjIxNlx1OEQ0NFx1NkU5MFx1NTJBMFx1OEY3RFx1NTkzMVx1OEQyNWApO1xuXG4gIC8vIEpTIFx1NUYwMlx1NUUzOFxuICBmb3IgKGNvbnN0IGUgb2YgcmVwb3J0LmpzRXhjZXB0aW9ucykge1xuICAgIGlzc3Vlcy5wdXNoKHsgY2F0ZWdvcnk6IFwianMtZXhjZXB0aW9uXCIsIHNldmVyaXR5OiBcImVycm9yXCIsIG1lc3NhZ2U6IGUubWVzc2FnZSB9KTtcbiAgfVxuICBpZiAocmVwb3J0LmpzRXhjZXB0aW9ucy5sZW5ndGgpIHN1Z2dlc3Rpb25zLnB1c2goXCJcdTk4NzVcdTk3NjJcdTYyOUJcdTUxRkFcdTRFODYgSlMgXHU2NzJBXHU2MzU1XHU4M0I3XHU1RjAyXHU1RTM4XHVGRjBDXHU2OEMwXHU2N0U1XHU1QkY5XHU1RTk0XHU1ODA2XHU2ODA4XCIpO1xuXG4gIC8vIFx1N0Y1MVx1N0VEQ1xuICBjb25zdCBuZXRGYWlsZWQgPSByZXBvcnQubmV0d29yay5maWx0ZXIoKG4pID0+IG4uc2V2ZXJpdHkgPT09IFwiZXJyb3JcIik7XG4gIGZvciAoY29uc3QgbiBvZiBuZXRGYWlsZWQpIGlzc3Vlcy5wdXNoKHsgY2F0ZWdvcnk6IFwibmV0d29ya1wiLCBzZXZlcml0eTogXCJlcnJvclwiLCBtZXNzYWdlOiBuLm1lc3NhZ2UgfSk7XG4gIGNvbnN0IG5ldFdhcm4gPSByZXBvcnQubmV0d29yay5maWx0ZXIoKG4pID0+IG4uc2V2ZXJpdHkgPT09IFwid2FybmluZ1wiKTtcbiAgZm9yIChjb25zdCBuIG9mIG5ldFdhcm4pIGlzc3Vlcy5wdXNoKHsgY2F0ZWdvcnk6IFwibmV0d29ya1wiLCBzZXZlcml0eTogXCJ3YXJuaW5nXCIsIG1lc3NhZ2U6IG4ubWVzc2FnZSB9KTtcblxuICAvLyBET00gXHU2OEMwXHU2N0U1XHVGRjA4XHU3NjdEXHU1QzRGL1x1NjcyQVx1NkUzMlx1NjdEMy9cdTY1RTBcdTRFQTRcdTRFOTJcdTdCNDlcdUZGMENcdTRFQ0UgY29uc29sZS9uZXR3b3JrIFx1NzcwQlx1NEUwRFx1NTIzMFx1NzY4NFx1NkUzMlx1NjdEM1x1N0VBN1x1OTVFRVx1OTg5OFx1RkYwOVxuICBmb3IgKGNvbnN0IGQgb2YgcmVwb3J0LmRvbSkge1xuICAgIGlzc3Vlcy5wdXNoKHsgY2F0ZWdvcnk6IFwiZG9tXCIsIHNldmVyaXR5OiBkLnNldmVyaXR5ID09PSBcImVycm9yXCIgPyBcImVycm9yXCIgOiBcIndhcm5pbmdcIiwgbWVzc2FnZTogZC5tZXNzYWdlIH0pO1xuICB9XG4gIGNvbnN0IGRvbUJsYW5rID0gcmVwb3J0LmRvbS5maWx0ZXIoKGQpID0+IGQuc2V2ZXJpdHkgPT09IFwiZXJyb3JcIik7XG4gIGlmIChkb21CbGFuay5sZW5ndGgpIHN1Z2dlc3Rpb25zLnB1c2goXCJcdTk4NzVcdTk3NjJcdTc1OTFcdTRGM0NcdTdBN0FcdTc2N0QvXHU2NzJBXHU2RTMyXHU2N0QzXHVGRjBDXHU2OEMwXHU2N0U1XHU2MzAyXHU4RjdEXHU4MjgyXHU3MEI5XHU0RTBFXHU1MjFEXHU1OUNCXHU1MzE2XHU4MTFBXHU2NzJDXHVGRjA4XHU1M0VGXHU4MEZEIEpTIFx1NjJBNVx1OTUxOVx1OTYzQlx1NjVBRFx1NjU3NFx1NjgxMVx1NkUzMlx1NjdEM1x1RkYwOVwiKTtcblxuICAvLyBcdTYwMjdcdTgwRkRcbiAgZm9yIChjb25zdCBwIG9mIHJlcG9ydC5wZXJmb3JtYW5jZSkge1xuICAgIGlmIChwLnNldmVyaXR5ID09PSBcIndhcm5pbmdcIikgaXNzdWVzLnB1c2goeyBjYXRlZ29yeTogXCJwZXJmb3JtYW5jZVwiLCBzZXZlcml0eTogXCJ3YXJuaW5nXCIsIG1lc3NhZ2U6IHAubWVzc2FnZSB9KTtcbiAgfVxuXG4gIC8vIFx1NTNCQlx1OTFDRFx1NUVGQVx1OEJBRVxuICBjb25zdCB1bmlxdWUgPSBbLi4ubmV3IFNldChzdWdnZXN0aW9ucyldO1xuICByZXR1cm4ge1xuICAgIGhlYWx0aHk6IGlzc3Vlcy5maWx0ZXIoKGkpID0+IGkuc2V2ZXJpdHkgPT09IFwiZXJyb3JcIikubGVuZ3RoID09PSAwLFxuICAgIGlzc3VlczogaXNzdWVzLnNsaWNlKDAsIDE1KSxcbiAgICBzdWdnZXN0aW9uczogdW5pcXVlLnNsaWNlKDAsIDgpLFxuICB9O1xufVxuIiwgIi8qKlxuICogXHU4QzAzXHU4QkQ1XHU4QkNBXHU2NUFEXHU0RTJEXHU1RkMzIFx1MjAxNFx1MjAxNCA1IFx1NjYxRlx1ODBGRFx1NTI5QlxuICpcbiAqIFx1NTAxRlx1OTI3NCBDaHJvbWUgRGV2VG9vbHMgTUNQIFx1NzY4NFx1OEJDQVx1NjVBRFx1ODBGRFx1NTI5Qlx1RkYwQ1x1NEUzQSBBSSBcdTYzRDBcdTRGOUJcdTUxNjhcdTk0RkVcdThERUZcdTk4NzVcdTk3NjJcdThCQ0FcdTY1QURcdUZGMUFcbiAqIDEuIERPTSBcdTY4QzBcdTY3RTVcdTRFMEVcdTVCOUFcdTRGNERcbiAqIDIuIFx1NjNBN1x1NTIzNlx1NTNGMFx1NkQ4OFx1NjA2Ri9cdTk1MTlcdThCRUZcbiAqIDMuIFx1N0Y1MVx1N0VEQ1x1OEJGN1x1NkM0Mlx1NEUwRVx1NTkzMVx1OEQyNVx1NTIwNlx1Njc5MFxuICogNC4gXHU2MDI3XHU4MEZEXHU2MzA3XHU2ODA3XG4gKiA1LiBKUyBcdTVGMDJcdTVFMzhcdTRFMEVcdTU4MDZcdTY4MDhcbiAqL1xuaW1wb3J0IHR5cGUgeyBEaWFnbm9zdGljUmVmIH0gZnJvbSBcIkBvcGVubGl1bGFuL2NvcmVcIjtcblxuZXhwb3J0IHR5cGUgRGlhZ25vc3RpY0NhdGVnb3J5ID0gXCJjb25zb2xlXCIgfCBcIm5ldHdvcmtcIiB8IFwiZG9tXCIgfCBcInBlcmZvcm1hbmNlXCIgfCBcImpzLWV4Y2VwdGlvblwiIHwgXCJhY2Nlc3NpYmlsaXR5XCI7XG5cbi8qKiBcdTkxQzdcdTk2QzZcdTU2NjhcdTdFREZcdTRFMDBcdTYzQTVcdTUzRTNcdUZGMUFcdTVFOTVcdTVDNDJcdTVGMTVcdTY0Q0VcdTVCOUVcdTczQjBcdTUxNzdcdTRGNTNcdTc2ODQgQ0RQL1BsYXl3cmlnaHQgXHU5MUM3XHU5NkM2XHU5MDNCXHU4RjkxICovXG5leHBvcnQgaW50ZXJmYWNlIERpYWdub3N0aWNDb2xsZWN0b3Ige1xuICByZWFkb25seSBjYXRlZ29yeTogRGlhZ25vc3RpY0NhdGVnb3J5O1xuICBjb2xsZWN0KCk6IFByb21pc2U8RGlhZ25vc3RpY1JlZltdPjtcbn1cblxuLyoqIFx1N0Y1MVx1N0VEQ1x1OEJGN1x1NkM0Mlx1OEJCMFx1NUY1NVx1RkYwOFx1NzUyOFx1NEU4RVx1NTIwNlx1Njc5MFx1NTJBMFx1OEY3RFx1NTkzMVx1OEQyNS9cdTYxNjJcdThCRjdcdTZDNDJcdUZGMDkgKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmV0d29ya1JlY29yZCB7XG4gIHVybDogc3RyaW5nO1xuICBtZXRob2Q6IHN0cmluZztcbiAgc3RhdHVzOiBudW1iZXI7XG4gIHN0YXR1c1RleHQ/OiBzdHJpbmc7XG4gIG1pbWVUeXBlPzogc3RyaW5nO1xuICBkdXJhdGlvbk1zOiBudW1iZXI7XG4gIC8qKiBcdThCRjdcdTZDNDJcdTU5MzFcdThEMjUvXHU4OEFCXHU5NjNCXHU2NUFEXHU1MzlGXHU1NkUwICovXG4gIGVycm9yPzogc3RyaW5nO1xuICByZXF1ZXN0SWQ/OiBzdHJpbmc7XG59XG5cbi8qKiBET00gXHU2OEMwXHU2N0U1XHU3RUQzXHU2NzlDICovXG5leHBvcnQgaW50ZXJmYWNlIERvbUluc3BlY3Rpb24ge1xuICAvKiogXHU2OEMwXHU2N0U1XHU3Njg0XHU3NkVFXHU2ODA3XHU2M0NGXHU4RkYwICovXG4gIHRhcmdldDogc3RyaW5nO1xuICAvKiogXHU1MTQzXHU3RDIwIG91dGxpbmVcdUZGMDhcdTY4MDdcdTdCN0VcdTMwMDFpZFx1MzAwMWNsYXNzXHUzMDAxXHU1MTczXHU5NTJFXHU1QzVFXHU2MDI3XHVGRjA5ICovXG4gIG91dGxpbmU6IHN0cmluZztcbiAgLyoqIFx1NTE0M1x1N0QyMFx1NTNFRlx1ODlDMVx1NjAyNyAvIFx1NEY0RFx1N0Y2RSAqL1xuICBib3g6IHsgeDogbnVtYmVyOyB5OiBudW1iZXI7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH0gfCBudWxsO1xuICAvKiogXHU2NUUwXHU5NjlDXHU3ODhEL0FSSUEgXHU0RkUxXHU2MDZGICovXG4gIGFjY2Vzc2libGU6IHtcbiAgICByb2xlPzogc3RyaW5nO1xuICAgIG5hbWU/OiBzdHJpbmc7XG4gICAgZGlzYWJsZWQ/OiBib29sZWFuO1xuICB9O1xuICAvKiogXHU3NkY4XHU1MTczXHU4QkExXHU3Qjk3XHU2ODM3XHU1RjBGXHVGRjA4XHU4OEMxXHU1MjZBXHU0RTNBXHU1MTczXHU5NTJFXHU5ODc5XHVGRjA5ICovXG4gIGNvbXB1dGVkU3R5bGU6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIC8qKiBcdTU0MEVcdTRFRTMvXHU3OTU2XHU1MTQ4XHU2OTgyXHU4OUM4ICovXG4gIGNvbnRleHQ6IHtcbiAgICBhbmNlc3RvcnM6IHN0cmluZ1tdO1xuICAgIGRlc2NlbmRhbnRzQ291bnQ6IG51bWJlcjtcbiAgfTtcbn1cblxuLyoqIFx1NjAyN1x1ODBGRFx1NjMwN1x1NjgwNyAqL1xuZXhwb3J0IGludGVyZmFjZSBQZXJmb3JtYW5jZU1ldHJpY3Mge1xuICAvKiogbmF2aWdhdGlvbiB0aW1pbmcgKi9cbiAgdHRmYjogbnVtYmVyO1xuICBkb21Db250ZW50TG9hZGVkOiBudW1iZXI7XG4gIGxvYWRFdmVudDogbnVtYmVyO1xuICAvKiogTGFyZ2VzdCBDb250ZW50ZnVsIFBhaW50ICovXG4gIGxjcD86IG51bWJlcjtcbiAgLyoqIEZpcnN0IENvbnRlbnRmdWwgUGFpbnQgKi9cbiAgZmNwPzogbnVtYmVyO1xuICAvKiogXHU4RDQ0XHU2RTkwXHU2NTcwXHU5MUNGXHU0RTBFXHU0RjUzXHU3OUVGICovXG4gIHJlc291cmNlczogeyBjb3VudDogbnVtYmVyOyB0b3RhbEJ5dGVzOiBudW1iZXIgfTtcbiAgLyoqIFx1OTU3Rlx1NEVGQlx1NTJBMVx1RkYwOFx1OTYzQlx1NTg1RVx1NEUzQlx1N0VCRlx1N0EwQlx1RkYwOVx1NkIyMVx1NjU3MCAqL1xuICBsb25nVGFza3M6IG51bWJlcjtcbiAgLyoqIFx1NTE4NVx1NUI1OFx1RkYwOFx1OEZEMVx1NEYzQ1x1RkYwOSAqL1xuICBqc0hlYXBVc2VkPzogbnVtYmVyO1xufVxuXG4vKiogXHU4QkNBXHU2NUFEXHU2MkE1XHU1NDRBXHU4MDVBXHU1NDA4ICovXG5leHBvcnQgaW50ZXJmYWNlIERpYWdub3Npc1JlcG9ydCB7XG4gIGNvbnNvbGU6IERpYWdub3N0aWNSZWZbXTtcbiAgbmV0d29yazogRGlhZ25vc3RpY1JlZltdO1xuICBkb206IERpYWdub3N0aWNSZWZbXTtcbiAgcGVyZm9ybWFuY2U6IERpYWdub3N0aWNSZWZbXTtcbiAganNFeGNlcHRpb25zOiBEaWFnbm9zdGljUmVmW107XG4gIGFjY2Vzc2liaWxpdHk6IERpYWdub3N0aWNSZWZbXTtcbn1cblxuLyoqIFx1OEJDQVx1NjVBRFx1NjQ1OFx1ODk4MVx1RkYxQVx1N0VEOSBBSSBcdTc2ODRcdTRFMDBcdTUzRTVcdThCRERcdTdFRDNcdThCQkEgKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGlhZ25vc2lzU3VtbWFyeSB7XG4gIC8qKiBcdTk4NzVcdTk3NjJcdTY2MkZcdTU0MjZcdTUwNjVcdTVFQjcgKi9cbiAgaGVhbHRoeTogYm9vbGVhbjtcbiAgLyoqIFx1NTE3M1x1OTUyRVx1OTVFRVx1OTg5OFx1NTIxN1x1ODg2OFx1RkYwOFx1NjMwOVx1NEUyNVx1OTFDRFx1NUVBNlx1NjM5Mlx1NUU4Rlx1RkYwOSAqL1xuICBpc3N1ZXM6IEFycmF5PHtcbiAgICBjYXRlZ29yeTogRGlhZ25vc3RpY0NhdGVnb3J5O1xuICAgIHNldmVyaXR5OiBcImVycm9yXCIgfCBcIndhcm5pbmdcIjtcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG4gIH0+O1xuICAvKiogXHU1RUZBXHU4QkFFXHVGRjA4XHU0RjlCIEFJIFx1NTFCM1x1N0I1Nlx1NEUwQlx1NEUwMFx1NkI2NVx1RkYwOSAqL1xuICBzdWdnZXN0aW9uczogc3RyaW5nW107XG59XG4iLCAiLyoqXG4gKiBEaWFnbm9zaXNDZW50ZXIgXHUyMDE0XHUyMDE0IFx1OEJDQVx1NjVBRFx1NEUyRFx1NUZDM1x1OTVFOFx1OTc2MlxuICogXHU4MDVBXHU1NDA4XHU1NDA0XHU3QzdCXHU5MUM3XHU5NkM2XHU1NjY4XHVGRjBDXHU0RUE3XHU1MUZBXHU3RURGXHU0RTAwXHU4QkNBXHU2NUFEXHU2MkE1XHU1NDRBXHU0RTBFIEFJIFx1NTNFRlx1OEJGQlx1NjQ1OFx1ODk4MVx1MzAwMlxuICovXG5pbXBvcnQgdHlwZSB7IERpYWdub3N0aWNSZWYgfSBmcm9tIFwiQG9wZW5saXVsYW4vY29yZVwiO1xuaW1wb3J0IHR5cGUgeyBEaWFnbm9zaXNSZXBvcnQsIERpYWdub3Npc1N1bW1hcnksIERpYWdub3N0aWNDb2xsZWN0b3IgfSBmcm9tIFwiLi90eXBlcy5qc1wiO1xuaW1wb3J0IHsgc3VtbWFyaXplIH0gZnJvbSBcIi4vYW5hbHl6ZXIuanNcIjtcblxuZXhwb3J0IGNsYXNzIERpYWdub3Npc0NlbnRlciB7XG4gIHByaXZhdGUgY29sbGVjdG9yczogRGlhZ25vc3RpY0NvbGxlY3RvcltdID0gW107XG5cbiAgLyoqIFx1NkNFOFx1NTE4Q1x1OTFDN1x1OTZDNlx1NTY2OFx1RkYwOFx1NUU5NVx1NUM0Mlx1NUYxNVx1NjRDRVx1NjNEMFx1NEY5Qlx1RkYwOSAqL1xuICByZWdpc3Rlcihjb2xsZWN0b3I6IERpYWdub3N0aWNDb2xsZWN0b3IpOiB0aGlzIHtcbiAgICB0aGlzLmNvbGxlY3RvcnMucHVzaChjb2xsZWN0b3IpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqIFx1OEZEMFx1ODg0Q1x1NEUwMFx1NkIyMVx1NUI4Q1x1NjU3NFx1OEJDQVx1NjVBRCAqL1xuICBhc3luYyBydW4oKTogUHJvbWlzZTxEaWFnbm9zaXNSZXBvcnQ+IHtcbiAgICBjb25zdCByZXBvcnQ6IERpYWdub3Npc1JlcG9ydCA9IHtcbiAgICAgIGNvbnNvbGU6IFtdLFxuICAgICAgbmV0d29yazogW10sXG4gICAgICBkb206IFtdLFxuICAgICAgcGVyZm9ybWFuY2U6IFtdLFxuICAgICAganNFeGNlcHRpb25zOiBbXSxcbiAgICAgIGFjY2Vzc2liaWxpdHk6IFtdLFxuICAgIH07XG5cbiAgICBjb25zdCB0YXNrcyA9IHRoaXMuY29sbGVjdG9ycy5tYXAoYXN5bmMgKGMpID0+IHtcbiAgICAgIGNvbnN0IHJlZnMgPSBhd2FpdCBjLmNvbGxlY3QoKTtcbiAgICAgIHJldHVybiB7IGNhdGVnb3J5OiBjLmNhdGVnb3J5LCByZWZzIH07XG4gICAgfSk7XG5cbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKHRhc2tzKTtcbiAgICBmb3IgKGNvbnN0IHIgb2YgcmVzdWx0cykge1xuICAgICAgaWYgKHIuc3RhdHVzID09PSBcImZ1bGZpbGxlZFwiKSB7XG4gICAgICAgIChyZXBvcnQgYXMgYW55KVtyLnZhbHVlLmNhdGVnb3J5XSA9IHIudmFsdWUucmVmcztcbiAgICAgIH1cbiAgICAgIC8vIFx1NTM1NVx1NEUyQVx1OTFDN1x1OTZDNlx1NTY2OFx1NTkzMVx1OEQyNVx1NEUwRFx1NUY3MVx1NTRDRFx1NjU3NFx1NEY1M1x1OEJDQVx1NjVBRFxuICAgIH1cbiAgICByZXR1cm4gcmVwb3J0O1xuICB9XG5cbiAgLyoqIFx1ODNCN1x1NTNENiBBSSBcdTUzRUZcdThCRkJcdTY0NThcdTg5ODEgKi9cbiAgYXN5bmMgc3VtbWFyaXplKCk6IFByb21pc2U8RGlhZ25vc2lzU3VtbWFyeT4ge1xuICAgIGNvbnN0IHJlcG9ydCA9IGF3YWl0IHRoaXMucnVuKCk7XG4gICAgcmV0dXJuIHN1bW1hcml6ZShyZXBvcnQpO1xuICB9XG5cbiAgLyoqIFx1NEZCRlx1NjM3N1x1RkYxQVx1OTFDN1x1OTZDNlx1N0Y1MVx1N0VEQ1x1NTkzMVx1OEQyNSAqL1xuICBzdGF0aWMgZmxhdHRlbkVycm9ycyhyZXBvcnQ6IERpYWdub3Npc1JlcG9ydCk6IERpYWdub3N0aWNSZWZbXSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIC4uLnJlcG9ydC5jb25zb2xlLmZpbHRlcigoYykgPT4gYy5zZXZlcml0eSA9PT0gXCJlcnJvclwiKSxcbiAgICAgIC4uLnJlcG9ydC5uZXR3b3JrLmZpbHRlcigobikgPT4gbi5zZXZlcml0eSA9PT0gXCJlcnJvclwiKSxcbiAgICAgIC4uLnJlcG9ydC5qc0V4Y2VwdGlvbnMsXG4gICAgICAuLi5yZXBvcnQucGVyZm9ybWFuY2UuZmlsdGVyKChwKSA9PiBwLnNldmVyaXR5ID09PSBcImVycm9yXCIpLFxuICAgIF07XG4gIH1cbn1cblxuZXhwb3J0ICogZnJvbSBcIi4vdHlwZXMuanNcIjtcbmV4cG9ydCB7IGFuYWx5emVOZXR3b3JrLCBhbmFseXplUGVyZm9ybWFuY2UsIHN1bW1hcml6ZSB9IGZyb20gXCIuL2FuYWx5emVyLmpzXCI7XG4iLCAiLyoqXG4gKiBAb3BlbmxpdWxhbi92aXNpb24gXHUyMDE0XHUyMDE0IFx1NkQ0Rlx1ODlDOFx1NTY2OFx1ODlDNlx1ODlDOVx1NjIxMFx1NjcyQ1x1OTYzNlx1NjhBRlx1N0I1Nlx1NzU2NVxuICpcbiAqIFx1OEJCRVx1OEJBMVx1NzZFRVx1NjgwN1x1RkYwOFx1NjIxMFx1NjcyQ1x1NEYxOFx1NTE0OFx1RkYwOVx1RkYxQVx1NTQwQ1x1NEUwMFx1NEUyQVx1NEVGQlx1NTJBMVx1NTE0OFx1NzUyOFx1N0VBRlx1NjU4N1x1NjcyQyArIFx1NkQ0Rlx1ODlDOFx1NTY2OFx1ODlFM1x1NTFCM1x1RkYwQ1x1NTNFQVx1NjcwOVx1NjU4N1x1NjcyQ1x1OERFRlx1NUY4NFxuICogXHU2NUUwXHU2Q0Q1XHU1NkRFXHU3QjU0XHUzMDBDXHU4OUM2XHU4OUM5L1x1NkUzMlx1NjdEMy9cdTVFMDNcdTVDNDAvXHU1OTE2XHU4OUMyXHUzMDBEXHU3QzdCXHU5NUVFXHU5ODk4XHU2NUY2XHU2MjREXHU1MzQ3XHU3RUE3XHU1MjMwXHU4OUM2XHU4OUM5XHVGRjFCXHU1MzQ3XHU3RUE3XHU4REVGXHU1Rjg0XHU0RTVGXHU1MjA2XHU0RTI0XHU2ODYzXHVGRjFBXG4gKiBcdTUxNDhcdTY3MkNcdTU3MzBcdTg5QzZcdTg5QzlcdTVGMTVcdTY0Q0VcdUZGMDhtb2RsZW5zXHVGRjBDXHU0RjRFXHU2MjEwXHU2NzJDXHU2NTg3XHU2NzJDXHU4QkMxXHU2MzZFXHVGRjA5XHVGRjBDXHU0RUNEXHU0RTBEXHU1OTFGXHU2MjREXHU3NTI4XHU2QTIxXHU1NzhCXHU1MzlGXHU3NTFGXHU4OUM2XHU4OUM5XG4gKiBcdUZGMDhcdTU5MUFcdTZBMjFcdTYwMDFcdThCQTFcdThEMzlcdUZGMENcdTY3MDBcdThEMzVcdUZGMDlcdTMwMDJcdTdFQUZcdTY1ODdcdTY3MkNcdTZBMjFcdTU3OEJcdTZDMzhcdThGRENcdTRFMERcdTVFOTRcdThCRTVcdTZEODhcdThEMzlcdTUzOUZcdTc1MUZcdTU2RkVcdTcyNDdcdTMwMDJcbiAqXG4gKiBcdTVGMTVcdTc1MjhcdThCRjRcdTY2MEVcdUZGMUFMMSBcdTc2ODRcdTg5QzZcdTg5QzlcdTVGMTVcdTY0Q0VcdTY3NjVcdTgxRUFcdTVGMDBcdTZFOTBcdTk4NzlcdTc2RUUgbGl1c3RhY2svbW9kbGVuc1x1RkYwOE1JVFx1RkYwOVx1RkYwQ1xuICogXHU4OUMxXHU2ODM5XHU3NkVFXHU1RjU1IFRISVJEX1BBUlRZX05PVElDRVMubWQgLyBERVBFTkRFTkNJRVMubWRcdTMwMDJcbiAqL1xuXG4vKipcbiAqIFx1NjIxMFx1NjcyQ1x1OTYzNlx1NjhBRlx1RkYwOFx1NkUzMlx1NjdEM1x1N0VEOVx1NkEyMVx1NTc4Qlx1NzcwQlx1NzY4NFx1NUI4Q1x1NjU3NFx1N0I1Nlx1NzU2NVx1NjU4N1x1NjcyQ1x1RkYwOVx1MzAwMlxuICogXHU0RjVDXHU0RTNBIHZpc2lvbiAvIHNjcmVlbnNob3QgLyBvYnNlcnZlIFx1NEUwOVx1NEUyQVx1NURFNVx1NTE3N1x1NjNDRlx1OEZGMFx1NzY4NFx1NTE2Q1x1NTE3MVx1NTFGQVx1NTkwNFx1RkYwQ1xuICogXHU0RkREXHU4QkMxXHU0RUZCXHU0RjU1XHU2QTIxXHU1NzhCXHU1NzI4XHU0RUZCXHU0RjU1XHU1MTY1XHU1M0UzXHU5MEZEXHU4MEZEXHU3NzBCXHU1MjMwXHU1NDBDXHU0RTAwXHU1OTU3XHU1MzQ3XHU3RUE3XHU4OUM0XHU1MjE5XHUzMDAyXG4gKi9cbmV4cG9ydCBjb25zdCBWSVNJT05fTEFEREVSID0gYFx1NkQ0Rlx1ODlDOFx1NTY2OFx1ODlDNlx1ODlDOVx1NjIxMFx1NjcyQ1x1OTYzNlx1NjhBRlx1RkYwOFx1NjMwOVx1NEVGQlx1NTJBMVx1NEVDRVx1NjcwMFx1NEZCRlx1NUI5Q1x1NUYwMFx1NTlDQlx1RkYwQ1x1OTAxMFx1N0VBN1x1NTM0N1x1N0VBN1x1RkYwOVx1RkYxQVxuTDAgXHU3RUFGXHU2NTg3XHU2NzJDIERPTSBcdTIwMTRcdTIwMTQgb2JzZXJ2ZVx1RkYwOFx1NTNFRlx1NEVBNFx1NEU5Mlx1NUZFQlx1NzE2NytyZWZcdUZGMDkvIGFjdCBleHRyYWN0KFx1NjU4N1x1NjcyQ1x1NjNEMFx1NTNENikgLyBhY3QgZXZhbHVhdGUoSlNcdTY3RTVcdThCRTIpXHVGRjFBXHU5NkY2XHU5ODlEXHU1OTE2XHU2MjEwXHU2NzJDXHUzMDAxXHU2NzAwXHU1RkVCXHUzMDAyXG4gICBcdTUzRUFcdTg5ODFcdTdCNTRcdTY4NDhcdTgwRkRcdTRFQ0UgRE9NL1x1NjU4N1x1NjcyQy9cdTVDNUVcdTYwMjdcdTkxQ0NcdTYyRkZcdTUyMzBcdUZGMENcdTVDMzFcdTc1MjggTDBcdUZGMENcdTRFMERcdTg5ODFcdTYyMkFcdTU2RkVcdTMwMDJcbkwxIG1vZGxlbnMgXHU4OUM2XHU4OUM5XHU1RjE1XHU2NENFIFx1MjAxNFx1MjAxNCB2aXNpb24gXHU1REU1XHU1MTc3XHVGRjFBXHU2MjJBXHU1NkZFIFx1MjE5MiBcdTY3MkNcdTU3MzBcdTg5QzZcdTg5QzlcdTVGMTVcdTY0Q0UgXHUyMTkyIFx1N0VBRlx1NjU4N1x1NjcyQ1x1OEJDMVx1NjM2RVx1RkYwOE9DUiBcdTUxNjhcdTY1ODcgKyBcdTVFMDNcdTVDNDBcdTUzM0FcdTU3REZcdTk2MDVcdThCRkJcdTk4N0FcdTVFOEYgKyBcdThCRURcdTRFNDlcdTU3M0FcdTY2NkZcdTYzQ0ZcdThGRjAgKyBcdTRFMERcdTc4NkVcdTVCOUFcdTk4NzlcdUZGMDlcdTMwMDJcbiAgIFx1NEVDNVx1NUY1MyBMMCBcdTY1RTBcdTZDRDVcdTU2REVcdTdCNTRcdTMwMENcdTk4NzVcdTk3NjJcdTk1N0ZcdTRFQzBcdTRFNDhcdTY4MzcvXHU2NjJGXHU1NDI2XHU1M0VGXHU4OUMxL1x1NjYyRlx1NTQyNlx1NUM0NVx1NEUyRFx1OTFDRFx1NTNFMC9cdTk4OUNcdTgyNzJcdTY4MzdcdTVGMEYvXHU1NkZFXHU4ODY4XHU1NkZFXHU3MjQ3XHU1MTg1XHU1QkI5L0NhbnZhc1x1NkUzMlx1NjdEM1x1MzAwRFx1N0I0OVx1OTVFRVx1OTg5OFx1NjVGNlx1NEY3Rlx1NzUyOFx1MzAwMlx1OEQzOVx1NzUyOFx1NEY0RVx1MzAwMVx1NjU4N1x1NjcyQ1x1NkEyMVx1NTc4Qlx1NTNFRlx1NzZGNFx1NjNBNVx1NkQ4OFx1OEQzOVx1MzAwMlxuTDIgXHU2QTIxXHU1NzhCXHU1MzlGXHU3NTFGXHU4OUM2XHU4OUM5IFx1MjAxNFx1MjAxNCBzY3JlZW5zaG90IFx1NURFNVx1NTE3N1x1RkYxQVx1OEZENFx1NTZERVx1NTM5Rlx1NzUxRiBQTkcgXHU1NkZFXHU3MjQ3XHVGRjBDXHU1M0VBXHU2NzA5XHU2NTJGXHU2MzAxXHU1NkZFXHU3MjQ3XHU4RjkzXHU1MTY1XHU3Njg0XHU1OTFBXHU2QTIxXHU2MDAxXHU2QTIxXHU1NzhCXHU4MEZEXHU3NzBCXHU4OUMxXHVGRjFCXHU4OUM2XHU4OUM5XHU4QkExXHU4RDM5XHU2NzAwXHU4RDM1XHUzMDAyXG4gICBcdTRFQzVcdTVGNTMgTDArTDEgXHU3RUQzXHU1NDA4XHU0RUNEXHU2NUUwXHU2Q0Q1XHU4OUUzXHU1MUIzXHVGRjA4XHU1OTgyXHU3Q0JFXHU3RUM2XHU1MENGXHU3RDIwXHU3RUE3XHU2QkQ0XHU1QkY5XHUzMDAxXHU1OTBEXHU2NzQyXHU1NkZFXHU4ODY4XHU3RUM2XHU4QkZCXHVGRjA5XHU0RTE0XHU1RjUzXHU1MjREXHU2QTIxXHU1NzhCXHU3ODZFXHU1QjlFXHU2NTJGXHU2MzAxXHU1NkZFXHU3MjQ3XHU4RjkzXHU1MTY1XHU2NUY2XHU2MjREXHU0RjdGXHU3NTI4XHUzMDAyXG5cdTg5QzRcdTUyMTlcdUZGMUFcdTlFRDhcdThCQTQgTDBcdUZGMUJcdTY3MDlcdTg5QzZcdTg5QzlcdTk3MDBcdTZDNDJcdTUxNDggTDFcdUZGMUJMMCtMMSBcdTkwRkRcdTg5RTNcdTUxQjNcdTRFMERcdTRFODZcdTYyNEQgTDJcdTMwMDJcdTdFQUZcdTY1ODdcdTY3MkNcdTZBMjFcdTU3OEJcdTc3MEJcdTUyMzAgc2NyZWVuc2hvdCBcdTc2ODRcdTU2RkVcdTcyNDdcdTRGRTFcdTYwNkZcdTdCNDlcdTRFOEVcdTZDQTFcdTY3MDlcdUZGMENcdTc2RjRcdTYzQTVcdTc1MjggTDEgXHU3Njg0IHZpc2lvblx1MzAwMmA7XG5cbi8qKiBcdTdCODBcdTc3RURcdTVGMDBcdTU3M0FcdTYzMDdcdTVGMTVcdUZGMDhcdTc1MjhcdTRFOEUgb2JzZXJ2ZSBcdTYzQ0ZcdThGRjBcdUZGMENcdTRFMDBcdTRFMjRcdTg4NENcdUZGMENcdTRFMERcdTUyMzdcdTVDNEZcdUZGMDkgKi9cbmV4cG9ydCBjb25zdCBMMF9ISU5UID0gXCJcdTYyMTBcdTY3MkNcdTk2MzZcdTY4QUYgTDBcdUZGMUFcdTdFQUZcdTY1ODdcdTY3MkMgRE9NIFx1NUZFQlx1NzE2N1x1RkYwQ1x1OTZGNlx1OTg5RFx1NTkxNlx1NjIxMFx1NjcyQ1x1RkYwQ1x1NjYyRlx1NzQwNlx1ODlFM1x1OTg3NVx1OTc2Mlx1NzY4NFx1OUVEOFx1OEJBNFx1N0IyQ1x1NEUwMFx1NkI2NVx1MzAwMlwiO1xuXG4vKiogXHU3QjgwXHU3N0VEXHU4QjY2XHU3OTNBXHVGRjA4XHU3NTI4XHU0RThFIHNjcmVlbnNob3QgXHU2M0NGXHU4RkYwXHVGRjA5XHVGRjFBXHU3RUFGXHU2NTg3XHU2NzJDXHU2QTIxXHU1NzhCXHU3NzBCXHU0RTBEXHU4OUMxXHU1MzlGXHU3NTFGXHU1NkZFICovXG5leHBvcnQgY29uc3QgTDJfV0FSTiA9XG4gIFwiXHU2MjEwXHU2NzJDXHU5NjM2XHU2OEFGIEwyXHVGRjA4XHU2NzAwXHU1NDBFXHU2MjRCXHU2QkI1XHVGRjA5XHVGRjFBXHU1MzlGXHU3NTFGXHU1NkZFXHU3MjQ3XHU0RUM1XHU1OTFBXHU2QTIxXHU2MDAxXHU2QTIxXHU1NzhCXHU1M0VGXHU4OUMxXHU1RTc2XHU4QkExXHU4RDM5XHVGRjFCXHU3RUFGXHU2NTg3XHU2NzJDXHU2QTIxXHU1NzhCXHU4QkY3XHU0RjE4XHU1MTQ4XHU3NTI4IHZpc2lvblx1RkYwOEwxXHVGRjA5XHU4M0I3XHU1M0Q2XHU2NTg3XHU2NzJDXHU4QkMxXHU2MzZFXHUzMDAyXCI7XG5cbi8qKiBcdTY1NzRcdTZCQjVcdTdCNTZcdTc1NjVcdUZGMDhcdTRGOUIgdmlzaW9uIFx1NURFNVx1NTE3N1x1NjNDRlx1OEZGMFx1NEY3Rlx1NzUyOFx1RkYwOSAqL1xuZXhwb3J0IGNvbnN0IFZJU0lPTl9QT0xJQ1kgPSBWSVNJT05fTEFEREVSO1xuXG4vKiogdmlzaW9uIFx1NURFNVx1NTE3N1x1NjNDRlx1OEZGMFx1RkYwOFx1NEZERFx1NjMwMVx1NEUwRVx1NURFNVx1NTE3N1x1NTQwRC9cdTUzQzJcdTY1NzBcdTRFMDBcdTgxRjRcdUZGMDkgKi9cbmV4cG9ydCBjb25zdCBWSVNJT05fVE9PTF9ERVNDUklQVElPTiA9XG4gIFwiXHU2MjJBXHU1M0Q2XHU1RjUzXHU1MjREXHU5ODc1XHU5NzYyXHU1RTc2XHU0RUE0XHU3RUQ5IG1vZGxlbnMgXHU4OUM2XHU4OUM5XHU1RjE1XHU2NENFXHVGRjA4XHU1OTE2XHU5MEU4XHU1RjAwXHU2RTkwXHU5ODc5XHU3NkVFXHVGRjBDTUlUXHVGRjA5XHU4RjZDXHU2MjEwXHU3RUFGXHU2NTg3XHU2NzJDXHU4QkMxXHU2MzZFXHVGRjFBXCIgK1xuICBcIk9DUiBcdTUxNjhcdTY1ODdcdTMwMDFcdTVFMDNcdTVDNDBcdTUzM0FcdTU3REZcdTk2MDVcdThCRkJcdTk4N0FcdTVFOEZcdTMwMDFcdThCRURcdTRFNDlcdTU3M0FcdTY2NkYvXHU1QjlFXHU0RjUzL1x1NTE3M1x1N0NGQlx1MzAwMVx1NEUwRFx1Nzg2RVx1NUI5QVx1OTg3OVx1MzAwMlx1N0VBRlx1NjU4N1x1NjcyQ1x1NkEyMVx1NTc4QiA9IFx1NzZGNFx1NjNBNVx1NTNFRlx1NzUyOFx1NzY4NFx1MzAwQ1x1ODlDNlx1ODlDOVx1MzAwRFx1MzAwMlxcblwiICtcbiAgVklTSU9OX0xBRERFUiArXG4gIFwiXFxuXHU1M0MyXHU2NTcwIGZvY3VzIFx1NTNFRlx1NjMwN1x1NUI5QVx1NTE3M1x1NkNFOFx1NzBCOVx1NEVFNVx1NjNEMFx1NTM0N1x1OEJDMVx1NjM2RVx1OEQyOFx1OTFDRlx1RkYxQnNhdmVQYXRoIFx1NTNFRlx1NjI4QVx1NjIyQVx1NTZGRSBQTkcgXHU4NDNEXHU3NkQ4XHU3NTU5XHU2ODYzXHVGRjA4XHU5RUQ4XHU4QkE0XHU0RTM0XHU2NUY2XHU3NkVFXHU1RjU1XHVGRjA5XHUzMDAyXCI7XG4iLCAiLyoqXG4gKiBlbmdpbmUudHMgXHUyMDE0XHUyMDE0IG1vZGxlbnMgXHU4OUM2XHU4OUM5XHU1RjE1XHU2NENFXHU2ODY1XHVGRjA4Q0xJIFx1ODlFM1x1Njc5MCArIHNwYXduICsgXHU3RUQzXHU2NzlDXHU4OUM0XHU4MzAzXHU1MzE2XHVGRjA5XG4gKlxuICogXHU1OTBEXHU3NTI4XHU1RjAwXHU2RTkwXHU5ODc5XHU3NkVFIGxpdXN0YWNrL21vZGxlbnNcdUZGMDhNSVRcdUZGMENcdTg5QzEgVEhJUkRfUEFSVFlfTk9USUNFUy5tZFx1RkYwOVx1NzY4NCBDTElcdUZGMUFcbiAqICAgbm9kZSA8bW9kbGVucz4vZGlzdC9tYWluLmpzIC1pIDxpbWFnZT4gWy0tcHJvbXB0IDxmb2N1cz5dIFstLXRpbWVvdXQgPG1zPl1cbiAqIFx1OEY5M1x1NTFGQVx1NTZGQVx1NUI5QSBKU09OXHVGRjFBeyBpbWFnZSwgcHJvdmlkZXIsIHJlc3VsdCwgbWV0YSB9XHUzMDAyXG4gKiBcdTY3MkNcdTZBMjFcdTU3NTdcdTUzRUFcdThEMUZcdThEMjNcdUZGMUFcdTYyN0VcdTUyMzAgQ0xJXHUzMDAxc3Bhd24gXHU1QjgzXHUzMDAxXHU2MjhBXHU4RjkzXHU1MUZBXHU4OUM0XHU4MzAzXHU1MzE2XHU0RTNBIFZpc2lvblJlc3VsdFx1MzAwMlx1NEUwRFx1NEY5RFx1OEQ1NlxuICogQGxpdXN0YWNrL21vZGxlbnMgXHU3Njg0IEpTIEFQSVx1MjAxNFx1MjAxNFx1NTNFQVx1NEY5RFx1OEQ1Nlx1NUI4M1x1NTNEMVx1NUUwM1x1NzY4NCBkaXN0L21haW4uanNcdUZGMENcdTRGRERcdTYzMDFcdTVGMzFcdTgwMjZcdTU0MDhcdUZGMUJcbiAqIFx1NUYxNVx1NjRDRVx1NjcyQVx1OTE0RFx1N0Y2RS9cdTY3MkFcdTVCODlcdTg4QzVcdTY1RjZcdTdFRDlcdTUxRkFcdTUzRUZcdTg4NENcdTUyQThcdTc2ODRcdTVCODlcdTg4QzVcdTYzMDdcdTVGMTVcdTgwMENcdTRFMERcdTY2MkZcdTVEMjlcdTZFODNcdTMwMDJcbiAqL1xuaW1wb3J0IHsgc3Bhd24gfSBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tIFwibm9kZTptb2R1bGVcIjtcblxuLyoqIFx1ODlDNlx1ODlDOVx1NUYxNVx1NjRDRVx1OEQ4NVx1NjVGNlx1RkYwOFx1OUVEOFx1OEJBNCAxODBzXHVGRjBDXHU0RTBFIG1vZGxlbnMgXHU5RUQ4XHU4QkE0XHU0RTAwXHU4MUY0XHVGRjA5ICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9WSVNJT05fVElNRU9VVF9NUyA9IDE4MF8wMDA7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpUmVzb2x1dGlvbiB7XG4gIG5vZGVCaW46IHN0cmluZztcbiAgY2xpUGF0aDogc3RyaW5nO1xuICBzb3VyY2U6IFwiZW52XCIgfCBcInJlc29sdmVcIjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpTWlzc2luZyB7XG4gIGNsaVBhdGg6IG51bGw7XG4gIHNvdXJjZTogbnVsbDtcbiAgaGludDogc3RyaW5nO1xufVxuZXhwb3J0IHR5cGUgQ2xpUmVzb2x1dGlvblJlc3VsdCA9IENsaVJlc29sdXRpb24gfCBDbGlNaXNzaW5nO1xuXG5jb25zdCByZXF1aXJlXyA9IGNyZWF0ZVJlcXVpcmUoaW1wb3J0Lm1ldGEudXJsKTtcblxuLyoqIFx1NUYxNVx1NjRDRVx1OERFRlx1NUY4NFx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRlx1RkYwOFx1NjcwMFx1OUFEOFx1NEYxOFx1NTE0OFx1N0VBN1x1RkYwQ1x1NEZCRlx1NEU4RVx1NkM5OVx1NzZEMi9BQiBcdTkwRThcdTdGNzJcdTY1RjZcdTYzMDdcdTU0MTFcdTRFRkJcdTYxMEZcdTVCODlcdTg4QzVcdUZGMDkgKi9cbmNvbnN0IEVOVl9DTElfUEFUSCA9IFwiTU9ETEVOU19DTElfUEFUSFwiO1xuXG4vKipcbiAqIFx1ODlFM1x1Njc5MCBtb2RsZW5zIENMSVx1RkYxQVxuICogMS4gXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGIE1PRExFTlNfQ0xJX1BBVEggXHU2NjNFXHU1RjBGXHU2MzA3XHU1QjlBXHVGRjA4XHU2Qzk5XHU3NkQyIC8gXHU3NTFGXHU0RUE3XHU1MjA3XHU2MzYyXHU3NTI4XHVGRjA5XG4gKiAyLiBcdTRFQ0VcdTY3MkNcdTUzMDVcdTYyNDBcdTU3MjhcdTRGOURcdThENTZcdTY4MTEgcmVxdWlyZS5yZXNvbHZlKFwiQGxpdXN0YWNrL21vZGxlbnMvcGFja2FnZS5qc29uXCIpXHVGRjBDXG4gKiAgICBcdTU0N0RcdTRFMkRcdTUyMTlcdTc1MjhcdTUxNzYgZGlzdC9tYWluLmpzXHVGRjA4XHU0RTBFIG1vZGxlbnMgXHU2M0QyXHU0RUY2XHU1NDBDXHU2RTkwXHU5NTAxXHU1QjlBXHVGRjA5XG4gKiAzLiBcdTkwRkRcdTYyN0VcdTRFMERcdTUyMzAgXHUyMTkyIFx1OEZENFx1NTZERVx1NUUyNlx1NjMwN1x1NUYxNVx1NzY4NCBDbGlNaXNzaW5nXHVGRjA4XHU0RTBEXHU2MjlCXHU5NTE5XHVGRjA5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTW9kbGVuc0NsaSgpOiBDbGlSZXNvbHV0aW9uUmVzdWx0IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBlbnZQYXRoID0gKHByb2Nlc3MuZW52W0VOVl9DTElfUEFUSF0gPz8gXCJcIikudHJpbSgpO1xuICAgIGlmIChlbnZQYXRoKSB7XG4gICAgICBjb25zdCBjbGkgPSBlbnZQYXRoLnJlcGxhY2UoL1tcXFxcL10rJC8sIFwiXCIpICsgXCIvZGlzdC9tYWluLmpzXCI7XG4gICAgICBpZiAoZXhpc3RzU3luYyhjbGkpKSByZXR1cm4geyBub2RlQmluOiBwcm9jZXNzLmV4ZWNQYXRoLCBjbGlQYXRoOiBjbGksIHNvdXJjZTogXCJlbnZcIiB9O1xuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLyogZW52IFx1ODlFM1x1Njc5MFx1NTkzMVx1OEQyNSBcdTIxOTIgXHU3RUU3XHU3RUVEICovXG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCBwa2dKc29uUGF0aCA9IHJlcXVpcmVfLnJlc29sdmUoXCJAbGl1c3RhY2svbW9kbGVucy9wYWNrYWdlLmpzb25cIik7XG4gICAgY29uc3QgY2xpID0gcGtnSnNvblBhdGgucmVwbGFjZSgvcGFja2FnZVxcLmpzb24kLywgXCJkaXN0L21haW4uanNcIik7XG4gICAgaWYgKGV4aXN0c1N5bmMoY2xpKSkgcmV0dXJuIHsgbm9kZUJpbjogcHJvY2Vzcy5leGVjUGF0aCwgY2xpUGF0aDogY2xpLCBzb3VyY2U6IFwicmVzb2x2ZVwiIH07XG4gIH0gY2F0Y2gge1xuICAgIC8qIFx1NjcyQVx1NUI4OVx1ODhDNSBcdTIxOTIgXHU4NDNEXHU1MTY1XHU2MzA3XHU1RjE1ICovXG4gIH1cbiAgcmV0dXJuIHtcbiAgICBjbGlQYXRoOiBudWxsLFxuICAgIHNvdXJjZTogbnVsbCxcbiAgICBoaW50OlxuICAgICAgXCJcdTY3MkFcdTYyN0VcdTUyMzAgbW9kbGVucyBcdTg5QzZcdTg5QzlcdTVGMTVcdTY0Q0VcdUZGMDhAbGl1c3RhY2svbW9kbGVuc1x1RkYwOVx1MzAwMlx1NUI4OVx1ODhDNVx1NjVCOVx1NUYwRlx1NEVGQlx1OTAwOVx1RkYxQVxcblwiICtcbiAgICAgIFwiICAxKSBcdTU3MjhcdThGRDBcdTg4NEMgRFNIIFx1NzY4NCBwcm9maWxlXHVGRjA4XHU1OTgyIHdlYlx1RkYwOVx1NjI2N1x1ODg0QzogZHNoIHBsdWdpbiAtLXByb2ZpbGUgd2ViIGFkZCBsaXVzdGFjay9tb2RsZW5zXFxuXCIgK1xuICAgICAgXCIgIDIpIFx1NjIxNlx1OEJCRVx1N0Y2RVx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRiBNT0RMRU5TX0NMSV9QQVRIIFx1NjMwN1x1NTQxMVx1NTE3NiBkaXN0L21haW4uanNcdUZGMDhcdTZDOTlcdTc2RDIvQUIgXHU5MEU4XHU3RjcyXHU2M0E4XHU4MzUwXHVGRjA5XFxuXCIgK1xuICAgICAgXCIgIDMpIFx1NjIxNlx1NjI0Qlx1NTJBOCBucG0gaSAtZyBAbGl1c3RhY2svbW9kbGVucyBcdTU0MEVcdThCQkVcdTdGNkUgTU9ETEVOU19DTElfUEFUSFxcblwiICtcbiAgICAgIFwiXHU1RjE1XHU2NENFXHU5OTk2XHU2QjIxXHU4RkQ4XHU5NzAwXHU5MTREXHU3RjZFXHU4OUM2XHU4OUM5XHU0RjlCXHU1RTk0XHU1NTQ2XHVGRjFBbm9kZSA8bW9kbGVucz4vZGlzdC9tYWluLmpzIGRvY3RvciBcdTY3RTVcdTc3MEJcdUZGMENcdTVFMzhcdTg5QzFcdTRFM0EgZ2VtaW5pLWFwaS5hcGlLZXkgXHU2MjE2IHJldXNlLm9wZW5jb2RlIFx1NTkwRFx1NzUyOFx1NjcyQ1x1NjczQSBvcGVuY29kZSBcdTc2N0JcdTVGNTVcdTMwMDJcIixcbiAgfTtcbn1cblxuLyoqIFx1ODlDNFx1ODMwM1x1NTMxNlx1NTQwRVx1NzY4NFx1ODlDNlx1ODlDOVx1OEJDMVx1NjM2RVx1RkYwOFx1NEUwRSBtb2RsZW5zIFx1OEY5M1x1NTFGQVx1NUJGOVx1OUY1MFx1RkYwQ1x1NUI1N1x1NkJCNVx1OTBGRFx1NTNFRlx1OTAwOVx1RkYwOSAqL1xuZXhwb3J0IGludGVyZmFjZSBWaXNpb25SZXN1bHQge1xuICBvazogYm9vbGVhbjtcbiAgaW1hZ2VQYXRoOiBzdHJpbmcgfCBudWxsO1xuICBwcm92aWRlcjogc3RyaW5nIHwgbnVsbDtcbiAgbW9kZWw6IHN0cmluZyB8IG51bGw7XG4gIHN1bW1hcnk6IHN0cmluZyB8IG51bGw7XG4gIG9jcjogeyBmdWxsX3RleHQ6IHN0cmluZzsgbGluZXM6IHsgdGV4dDogc3RyaW5nOyBsYW5ndWFnZT86IHN0cmluZyB9W10gfTtcbiAgbGF5b3V0OiB7IHJlZ2lvbnM6IHsgdHlwZTogc3RyaW5nOyByZWFkaW5nX29yZGVyOiBudW1iZXI7IHRleHQ6IHN0cmluZyB9W10gfTtcbiAgc2VtYW50aWNzOiB7XG4gICAgc2NlbmU6IHN0cmluZyB8IG51bGw7XG4gICAgaW50ZW50Pzogc3RyaW5nIHwgbnVsbDtcbiAgICBlbnRpdGllczogeyBuYW1lOiBzdHJpbmc7IHR5cGU6IHN0cmluZzsgZXZpZGVuY2U/OiBzdHJpbmcgfVtdO1xuICAgIHJlbGF0aW9uczogeyBzdWJqZWN0OiBzdHJpbmc7IHByZWRpY2F0ZTogc3RyaW5nOyBvYmplY3Q6IHN0cmluZyB9W107XG4gIH07XG4gIHZpc3VhbDogeyBkb21pbmFudF9jb2xvcnM/OiBzdHJpbmdbXTsgc3R5bGU/OiBzdHJpbmcgfCBudWxsOyBub3Rlcz86IHN0cmluZ1tdIH07XG4gIHVuY2VydGFpbnR5OiBzdHJpbmdbXTtcbiAgdXNhZ2U/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGw7XG4gIGR1cmF0aW9uU2Vjb25kcz86IG51bWJlcjtcbiAgd2FybmluZ3M/OiBzdHJpbmdbXTtcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIGVtcHR5RXZpZGVuY2UoKTogVmlzaW9uUmVzdWx0IHtcbiAgcmV0dXJuIHtcbiAgICBvazogZmFsc2UsIGltYWdlUGF0aDogbnVsbCwgcHJvdmlkZXI6IG51bGwsIG1vZGVsOiBudWxsLCBzdW1tYXJ5OiBudWxsLFxuICAgIG9jcjogeyBmdWxsX3RleHQ6IFwiXCIsIGxpbmVzOiBbXSB9LFxuICAgIGxheW91dDogeyByZWdpb25zOiBbXSB9LFxuICAgIHNlbWFudGljczogeyBzY2VuZTogbnVsbCwgZW50aXRpZXM6IFtdLCByZWxhdGlvbnM6IFtdIH0sXG4gICAgdmlzdWFsOiB7fSxcbiAgICB1bmNlcnRhaW50eTogW10sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGFzQXJyYXk8VD4odjogdW5rbm93bik6IFRbXSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHYpID8gKHYgYXMgVFtdKSA6IFtdO1xufVxuXG4vKipcbiAqIFx1NjI4QSBtb2RsZW5zIENMSSBzdGRvdXQgSlNPTiBcdTg5QzRcdTgzMDNcdTUzMTZcdTMwMDJcbiAqIFx1OEY5M1x1NTFGQVx1NUY2Mlx1NzJCNlx1ODlDMSBkb2NzL2NsaS5tZFx1RkYxQXsgaW1hZ2UsIHByb3ZpZGVyLCByZXN1bHQ6IHsuLi59LCBtZXRhOiB7Li4ufSB9XHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVWaXNpb25PdXRwdXQocmF3OiBzdHJpbmcsIGltYWdlUGF0aDogc3RyaW5nKTogVmlzaW9uUmVzdWx0IHtcbiAgbGV0IHBhcnNlZDogdW5rbm93bjtcbiAgdHJ5IHtcbiAgICBwYXJzZWQgPSBKU09OLnBhcnNlKHJhdyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4geyAuLi5lbXB0eUV2aWRlbmNlKCksIGltYWdlUGF0aCwgZXJyb3I6IFwibW9kbGVucyBcdThGOTNcdTUxRkFcdTRFMERcdTY2MkZcdTU0MDhcdTZDRDUgSlNPTjogXCIgKyBTdHJpbmcoZSkgfTtcbiAgfVxuICBjb25zdCByb290ID0gKHBhcnNlZCA/PyB7fSkgYXMgUmVjb3JkPHN0cmluZywgYW55PjtcbiAgY29uc3QgcmVzdWx0ID0gKHJvb3QucmVzdWx0ID8/IHt9KSBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xuICBjb25zdCBtZXRhID0gKHJvb3QubWV0YSA/PyB7fSkgYXMgUmVjb3JkPHN0cmluZywgYW55PjtcbiAgY29uc3Qgb2NyID0gKHJlc3VsdC5vY3IgPz8ge30pIGFzIFJlY29yZDxzdHJpbmcsIGFueT47XG4gIGNvbnN0IGxheW91dCA9IChyZXN1bHQubGF5b3V0ID8/IHt9KSBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xuICBjb25zdCBzZW1hbnRpY3MgPSAocmVzdWx0LnNlbWFudGljcyA/PyB7fSkgYXMgUmVjb3JkPHN0cmluZywgYW55PjtcbiAgY29uc3QgdmlzdWFsID0gKHJlc3VsdC52aXN1YWwgPz8ge30pIGFzIFJlY29yZDxzdHJpbmcsIGFueT47XG4gIGNvbnN0IGF0dGVtcHRzID0gYXNBcnJheTxSZWNvcmQ8c3RyaW5nLCBhbnk+PihtZXRhLmF0dGVtcHRzKTtcbiAgY29uc3QgZmFpbGVkID0gYXR0ZW1wdHMuc29tZSgoYSkgPT4gYS5vayAhPT0gdHJ1ZSkgfHwgQm9vbGVhbihyb290LmVycm9yKTtcbiAgcmV0dXJuIHtcbiAgICBvazogIWZhaWxlZCxcbiAgICBpbWFnZVBhdGgsXG4gICAgcHJvdmlkZXI6IHR5cGVvZiByb290LnByb3ZpZGVyID09PSBcInN0cmluZ1wiID8gcm9vdC5wcm92aWRlciA6IG51bGwsXG4gICAgbW9kZWw6IHR5cGVvZiBtZXRhLm1vZGVsID09PSBcInN0cmluZ1wiID8gbWV0YS5tb2RlbCA6IG51bGwsXG4gICAgc3VtbWFyeTogdHlwZW9mIHJlc3VsdC5zdW1tYXJ5ID09PSBcInN0cmluZ1wiID8gcmVzdWx0LnN1bW1hcnkgOiBudWxsLFxuICAgIG9jcjoge1xuICAgICAgZnVsbF90ZXh0OiB0eXBlb2Ygb2NyLmZ1bGxfdGV4dCA9PT0gXCJzdHJpbmdcIiA/IG9jci5mdWxsX3RleHQgOiBcIlwiLFxuICAgICAgbGluZXM6IGFzQXJyYXk8eyB0ZXh0OiBzdHJpbmc7IGxhbmd1YWdlPzogc3RyaW5nIH0+KG9jci5saW5lcyksXG4gICAgfSxcbiAgICBsYXlvdXQ6IHtcbiAgICAgIHJlZ2lvbnM6IGFzQXJyYXk8eyB0eXBlOiBzdHJpbmc7IHJlYWRpbmdfb3JkZXI6IG51bWJlcjsgdGV4dDogc3RyaW5nIH0+KGxheW91dC5yZWdpb25zKSxcbiAgICB9LFxuICAgIHNlbWFudGljczoge1xuICAgICAgc2NlbmU6IHR5cGVvZiBzZW1hbnRpY3Muc2NlbmUgPT09IFwic3RyaW5nXCIgPyBzZW1hbnRpY3Muc2NlbmUgOiBudWxsLFxuICAgICAgaW50ZW50OiB0eXBlb2Ygc2VtYW50aWNzLmludGVudCA9PT0gXCJzdHJpbmdcIiA/IHNlbWFudGljcy5pbnRlbnQgOiBudWxsLFxuICAgICAgZW50aXRpZXM6IGFzQXJyYXk8eyBuYW1lOiBzdHJpbmc7IHR5cGU6IHN0cmluZzsgZXZpZGVuY2U/OiBzdHJpbmcgfT4oc2VtYW50aWNzLmVudGl0aWVzKSxcbiAgICAgIHJlbGF0aW9uczogYXNBcnJheTx7IHN1YmplY3Q6IHN0cmluZzsgcHJlZGljYXRlOiBzdHJpbmc7IG9iamVjdDogc3RyaW5nIH0+KHNlbWFudGljcy5yZWxhdGlvbnMpXG4gICAgICAgIC5maWx0ZXIoKHJlbCkgPT4gcmVsICYmIHJlbC5zdWJqZWN0ICYmIHJlbC5wcmVkaWNhdGUgJiYgcmVsLm9iamVjdCksXG4gICAgfSxcbiAgICB2aXN1YWw6IHtcbiAgICAgIGRvbWluYW50X2NvbG9yczogYXNBcnJheTxzdHJpbmc+KHZpc3VhbC5kb21pbmFudF9jb2xvcnMpLFxuICAgICAgc3R5bGU6IHR5cGVvZiB2aXN1YWwuc3R5bGUgPT09IFwic3RyaW5nXCIgPyB2aXN1YWwuc3R5bGUgOiBudWxsLFxuICAgICAgbm90ZXM6IGFzQXJyYXk8c3RyaW5nPih2aXN1YWwubm90ZXMpLFxuICAgIH0sXG4gICAgdW5jZXJ0YWludHk6IGFzQXJyYXk8c3RyaW5nPihyZXN1bHQudW5jZXJ0YWludHkpLFxuICAgIHVzYWdlOiBtZXRhLnVzYWdlID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiAobWV0YS51c2FnZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwpLFxuICAgIGR1cmF0aW9uU2Vjb25kczogdHlwZW9mIG1ldGEuZHVyYXRpb25TZWNvbmRzID09PSBcIm51bWJlclwiID8gbWV0YS5kdXJhdGlvblNlY29uZHMgOiB1bmRlZmluZWQsXG4gICAgd2FybmluZ3M6IGFzQXJyYXk8c3RyaW5nPihtZXRhLndhcm5pbmdzKSxcbiAgICBlcnJvcjogdHlwZW9mIHJvb3QuZXJyb3IgPT09IFwic3RyaW5nXCIgPyByb290LmVycm9yIDogdW5kZWZpbmVkLFxuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJ1blZpc2lvbk9wdGlvbnMge1xuICBpbWFnZVBhdGg6IHN0cmluZztcbiAgZm9jdXM/OiBzdHJpbmc7XG4gIGNsaVBhdGg/OiBzdHJpbmc7XG4gIHByb3ZpZGVyPzogc3RyaW5nO1xuICB0aW1lb3V0TXM/OiBudW1iZXI7XG59XG5cbi8qKiBcdThGRDBcdTg4NEMgbW9kbGVucyBcdTVGMTVcdTY0Q0VcdThCRkJcdTU2RkVcdUZGMENcdThGRDRcdTU2REVcdTg5QzRcdTgzMDNcdTUzMTZcdThCQzFcdTYzNkVcdUZGMUJcdTVGMTVcdTY0Q0VcdTdGM0FcdTU5MzEvXHU1OTMxXHU4RDI1XHU2NUY2IG9rPWZhbHNlXHVGRjBDXHU3RUREXHU0RTBEXHU2MjlCXHU1MUZBXHUzMDAyICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuTW9kbGVucyhvcHRzOiBSdW5WaXNpb25PcHRpb25zKTogUHJvbWlzZTxWaXNpb25SZXN1bHQ+IHtcbiAgbGV0IHJlc29sdXRpb246IENsaVJlc29sdXRpb247XG4gIGlmIChvcHRzLmNsaVBhdGgpIHtcbiAgICByZXNvbHV0aW9uID0geyBub2RlQmluOiBwcm9jZXNzLmV4ZWNQYXRoLCBjbGlQYXRoOiBvcHRzLmNsaVBhdGgsIHNvdXJjZTogXCJlbnZcIiB9O1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHJlcyA9IHJlc29sdmVNb2RsZW5zQ2xpKCk7XG4gICAgaWYgKHJlcy5zb3VyY2UgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7IC4uLmVtcHR5RXZpZGVuY2UoKSwgaW1hZ2VQYXRoOiBvcHRzLmltYWdlUGF0aCwgZXJyb3I6IHJlcy5oaW50IH07XG4gICAgfVxuICAgIHJlc29sdXRpb24gPSByZXM7XG4gIH1cbiAgY29uc3QgYXJncyA9IFtcIi1pXCIsIG9wdHMuaW1hZ2VQYXRoXTtcbiAgaWYgKG9wdHMuZm9jdXMpIGFyZ3MucHVzaChcIi0tcHJvbXB0XCIsIG9wdHMuZm9jdXMpO1xuICBpZiAob3B0cy5wcm92aWRlcikgYXJncy5wdXNoKFwiLXBcIiwgb3B0cy5wcm92aWRlcik7XG4gIGFyZ3MucHVzaChcIi0tdGltZW91dFwiLCBTdHJpbmcob3B0cy50aW1lb3V0TXMgPz8gREVGQVVMVF9WSVNJT05fVElNRU9VVF9NUykpO1xuICByZXR1cm4gbmV3IFByb21pc2U8VmlzaW9uUmVzdWx0PigocmVzb2x2ZVByb21pc2UpID0+IHtcbiAgICBjb25zdCBjaGlsZCA9IHNwYXduKHJlc29sdXRpb24ubm9kZUJpbiwgW3Jlc29sdXRpb24uY2xpUGF0aCEsIC4uLmFyZ3NdLCB7XG4gICAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgICAgIHN0ZGlvOiBbXCJpZ25vcmVcIiwgXCJwaXBlXCIsIFwicGlwZVwiXSxcbiAgICAgIGVudjogeyAuLi5wcm9jZXNzLmVudiB9LFxuICAgIH0pO1xuICAgIGxldCBzdGRvdXQgPSBcIlwiO1xuICAgIGxldCBzdGRlcnIgPSBcIlwiO1xuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiBjaGlsZC5raWxsKCksIChvcHRzLnRpbWVvdXRNcyA/PyBERUZBVUxUX1ZJU0lPTl9USU1FT1VUX01TKSArIDEwXzAwMCk7XG4gICAgY2hpbGQuc3Rkb3V0Lm9uKFwiZGF0YVwiLCAoZDogQnVmZmVyKSA9PiB7IHN0ZG91dCArPSBkLnRvU3RyaW5nKFwidXRmOFwiKTsgfSk7XG4gICAgY2hpbGQuc3RkZXJyLm9uKFwiZGF0YVwiLCAoZDogQnVmZmVyKSA9PiB7IHN0ZGVyciArPSBkLnRvU3RyaW5nKFwidXRmOFwiKTsgfSk7XG4gICAgY2hpbGQub24oXCJlcnJvclwiLCAoZXJyKSA9PiB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgcmVzb2x2ZVByb21pc2UoeyAuLi5lbXB0eUV2aWRlbmNlKCksIGltYWdlUGF0aDogb3B0cy5pbWFnZVBhdGgsIGVycm9yOiBcIlx1NjVFMFx1NkNENVx1NTQyRlx1NTJBOCBtb2RsZW5zIFx1NUYxNVx1NjRDRTogXCIgKyBlcnIubWVzc2FnZSB9KTtcbiAgICB9KTtcbiAgICBjaGlsZC5vbihcImNsb3NlXCIsIChjb2RlKSA9PiB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgY29uc3QgdGFpbCA9IHN0ZGVyci50cmltKCkuc3BsaXQoXCJcXG5cIikuc2xpY2UoLTQpLmpvaW4oXCJcXG5cIik7XG4gICAgICAgIHJlc29sdmVQcm9taXNlKHtcbiAgICAgICAgICAuLi5lbXB0eUV2aWRlbmNlKCksXG4gICAgICAgICAgaW1hZ2VQYXRoOiBvcHRzLmltYWdlUGF0aCxcbiAgICAgICAgICBlcnJvcjogXCJtb2RsZW5zIFx1NUYxNVx1NjRDRVx1OTAwMFx1NTFGQSAoY29kZT1cIiArIGNvZGUgKyBcIik6IFwiICsgKHRhaWwgfHwgXCJcdTY1RTBcdTk1MTlcdThCRUZcdThGOTNcdTUxRkFcIiksXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZXNvbHZlUHJvbWlzZShub3JtYWxpemVWaXNpb25PdXRwdXQoc3Rkb3V0LCBvcHRzLmltYWdlUGF0aCkpO1xuICAgIH0pO1xuICB9KTtcbn1cbiIsICIvKipcbiAqIGZvcm1hdC50cyBcdTIwMTRcdTIwMTQgXHU2MjhBXHU4OUM2XHU4OUM5XHU4QkMxXHU2MzZFXHU2ODNDXHU1RjBGXHU1MzE2XHU0RTNBXHU3RUFGXHU2NTg3XHU2NzJDXHVGRjA4XHU3RUQ5XHU3RUFGXHU2NTg3XHU2NzJDXHU2QTIxXHU1NzhCXHU3NkY0XHU2M0E1XHU2RDg4XHU4RDM5XHVGRjA5XG4gKi9cbmltcG9ydCB0eXBlIHsgVmlzaW9uUmVzdWx0IH0gZnJvbSBcIi4vZW5naW5lLmpzXCI7XG5pbXBvcnQgeyBWSVNJT05fTEFEREVSIH0gZnJvbSBcIi4vc3RyYXRlZ3kuanNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBGb3JtYXRPcHRpb25zIHtcbiAgLyoqIFx1NTE3M1x1NkNFOFx1NzBCOVx1RkYwOFx1NTM5Rlx1NjgzN1x1NTZERVx1NjYzRVx1RkYwQ1x1NUUyRVx1NTJBOVx1NkEyMVx1NTc4Qlx1NUJGOVx1OUY1MFx1RkYwOSAqL1xuICBmb2N1cz86IHN0cmluZztcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NzcwMVx1NzU2NVx1NTE5N1x1OTU3Rlx1NkJCNVx1RkYwOFx1NTk4Mlx1OTAxMFx1ODg0QyBPQ1IgbGluZXNcdUZGMDlcdUZGMENcdTlFRDhcdThCQTQgZmFsc2UgKi9cbiAgY29tcGFjdD86IGJvb2xlYW47XG59XG5cbi8qKiBcdTUzNTVcdTg4NENcdTYyMkFcdTY1QUQgKi9cbmZ1bmN0aW9uIGNsaXAoczogc3RyaW5nLCBuID0gMjAwKTogc3RyaW5nIHtcbiAgY29uc3QgdCA9IHMucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpO1xuICByZXR1cm4gdC5sZW5ndGggPiBuID8gdC5zbGljZSgwLCBuKSArIFwiXHUyMDI2XCIgOiB0O1xufVxuXG4vKipcbiAqIFx1NjI4QSBWaXNpb25SZXN1bHQgXHU2RTMyXHU2N0QzXHU2MjEwIG1hcmtkb3duIFx1NjU4N1x1NjcyQ1x1MzAwMlxuICogXHU5ODdBXHU1RThGXHVGRjFBXHU2NzY1XHU2RTkwXHU0RkUxXHU2MDZGIFx1MjE5MiBcdTYwM0JcdTdFRDMgXHUyMTkyIE9DUiBcdTUxNjhcdTY1ODcgXHUyMTkyIFx1NUUwM1x1NUM0MFx1NTMzQVx1NTdERlx1RkYwOFx1NjMwOVx1OTYwNVx1OEJGQlx1OTg3QVx1NUU4Rlx1RkYwOVx1MjE5MiBcdThCRURcdTRFNDkgXHUyMTkyIFx1ODlDNlx1ODlDOSBcdTIxOTIgXHU0RTBEXHU3ODZFXHU1QjlBXHU5ODc5XHUzMDAyXG4gKiBcdTY3MkJcdTVDM0VcdTk2NDRcdTUzNDdcdTdFQTdcdTYzRDBcdTc5M0FcdUZGMUFcdThCQzFcdTYzNkVcdTRFMERcdThEQjNcdTY1RjZcdTU5ODJcdTRGNTVcdTUzNDdcdTUyMzAgTDJcdUZGMDhcdTZBMjFcdTU3OEJcdTUzOUZcdTc1MUZcdTg5QzZcdTg5QzlcdUZGMDlcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFZpc2lvbkV2aWRlbmNlKHY6IFZpc2lvblJlc3VsdCwgb3B0czogRm9ybWF0T3B0aW9ucyA9IHt9KTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG4gIGlmICghdi5vaykge1xuICAgIGxpbmVzLnB1c2goXCIjIyBcdUQ4M0RcdURDNDEgXHU4OUM2XHU4OUM5XHU1RjE1XHU2NENFXHU0RTBEXHU1M0VGXHU3NTI4L1x1NTkzMVx1OEQyNVwiKTtcbiAgICBsaW5lcy5wdXNoKCh2LmVycm9yID8/IFwiXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGXCIpLnNwbGl0KFwiXFxuXCIpLmpvaW4oXCJcXG4+IFwiKSk7XG4gICAgbGluZXMucHVzaChcIlwiKTtcbiAgICBsaW5lcy5wdXNoKFwiPiBcdTgyRTVcdTY3MkFcdTVCODlcdTg4QzVcdTVGMTVcdTY0Q0VcdUZGMENcdTYyNjdcdTg4NEMgYGRzaCBwbHVnaW4gLS1wcm9maWxlIHdlYiBhZGQgbGl1c3RhY2svbW9kbGVuc2AgXHU1NDBFXHU5MUNEXHU4QkQ1XHVGRjA4XHU4OUMxIFRISVJEX1BBUlRZX05PVElDRVMubWQgXHU1RjUyXHU1QzVFXHU1OEYwXHU2NjBFXHVGRjA5XHUzMDAyXCIpO1xuICAgIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xuICB9XG4gIGxpbmVzLnB1c2goXCIjIyBcdUQ4M0RcdURDNDEgXHU4OUM2XHU4OUM5XHU4QkMxXHU2MzZFIChtb2RsZW5zKVwiKTtcbiAgaWYgKG9wdHMuZm9jdXMpIGxpbmVzLnB1c2goYCoqXHU1MTczXHU2Q0U4XHU3MEI5Kio6ICR7Y2xpcChvcHRzLmZvY3VzLCAxMjApfWApO1xuICBjb25zdCBzcmMgPSBbdi5wcm92aWRlciA/IGBwcm92aWRlcj0ke3YucHJvdmlkZXJ9YCA6IFwiXCIsIHYubW9kZWwgPyBgbW9kZWw9JHt2Lm1vZGVsfWAgOiBcIlwiLFxuICAgIHYuZHVyYXRpb25TZWNvbmRzID8gYCR7di5kdXJhdGlvblNlY29uZHMudG9GaXhlZCgxKX1zYCA6IFwiXCJdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiIFx1MDBCNyBcIik7XG4gIGlmIChzcmMpIGxpbmVzLnB1c2goYD4gXHU2NzY1XHU2RTkwOiAke3NyY31gKTtcbiAgaWYgKHYuaW1hZ2VQYXRoKSBsaW5lcy5wdXNoKGA+IFx1NjIyQVx1NTZGRVx1NjU4N1x1NEVGNjogXFxgJHt2LmltYWdlUGF0aH1cXGBgKTtcbiAgbGluZXMucHVzaChcIlwiKTtcbiAgaWYgKHYuc3VtbWFyeSkge1xuICAgIGxpbmVzLnB1c2goYCoqXHU2MDNCXHU3RUQzKio6ICR7di5zdW1tYXJ5fWApO1xuICAgIGxpbmVzLnB1c2goXCJcIik7XG4gIH1cbiAgY29uc3Qgb2NyVGV4dCA9IHYub2NyLmZ1bGxfdGV4dC50cmltKCk7XG4gIGlmIChvY3JUZXh0KSB7XG4gICAgbGluZXMucHVzaChcIioqT0NSIFx1NTE2OFx1NjU4NyoqOlwiLCBcImBgYFwiLCBvY3JUZXh0Lmxlbmd0aCA+IDQwMDAgPyBvY3JUZXh0LnNsaWNlKDAsIDQwMDApICsgXCJcdTIwMjYoXHU2MjJBXHU2NUFEKVwiIDogb2NyVGV4dCwgXCJgYGBcIiwgXCJcIik7XG4gIH1cbiAgaWYgKHYubGF5b3V0LnJlZ2lvbnMubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChcIioqXHU1RTAzXHU1QzQwXHU1MzNBXHU1N0RGXHVGRjA4XHU5NjA1XHU4QkZCXHU5ODdBXHU1RThGXHVGRjA5Kio6XCIpO1xuICAgIGZvciAoY29uc3QgciBvZiB2LmxheW91dC5yZWdpb25zLnNsaWNlKDAsIDMwKSkge1xuICAgICAgbGluZXMucHVzaChgICAke3IucmVhZGluZ19vcmRlcn0uIFske3IudHlwZX1dICR7Y2xpcChyLnRleHQgfHwgXCIoXHU2NUUwXHU2NTg3XHU2NzJDKVwiLCAxNjApfWApO1xuICAgIH1cbiAgICBsaW5lcy5wdXNoKFwiXCIpO1xuICB9XG4gIGlmICh2LnNlbWFudGljcy5zY2VuZSB8fCB2LnNlbWFudGljcy5lbnRpdGllcy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKFwiKipcdThCRURcdTRFNDkqKjpcIik7XG4gICAgaWYgKHYuc2VtYW50aWNzLnNjZW5lKSBsaW5lcy5wdXNoKGAgIFx1NTczQVx1NjY2RjogJHt2LnNlbWFudGljcy5zY2VuZX1gKTtcbiAgICBpZiAodi5zZW1hbnRpY3MuaW50ZW50KSBsaW5lcy5wdXNoKGAgIFx1NjEwRlx1NTZGRTogJHt2LnNlbWFudGljcy5pbnRlbnR9YCk7XG4gICAgZm9yIChjb25zdCBlIG9mIHYuc2VtYW50aWNzLmVudGl0aWVzLnNsaWNlKDAsIDIwKSkge1xuICAgICAgbGluZXMucHVzaChgICAtICR7ZS5uYW1lfSBbJHtlLnR5cGV9XSR7ZS5ldmlkZW5jZSA/IGAgKCR7Y2xpcChlLmV2aWRlbmNlLCA4MCl9KWAgOiBcIlwifWApO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJlbCBvZiB2LnNlbWFudGljcy5yZWxhdGlvbnMuc2xpY2UoMCwgMTApKSB7XG4gICAgICBsaW5lcy5wdXNoKGAgIC0gJHtyZWwuc3ViamVjdH0gXHUyMTkyICR7cmVsLnByZWRpY2F0ZX0gXHUyMTkyICR7cmVsLm9iamVjdH1gKTtcbiAgICB9XG4gICAgbGluZXMucHVzaChcIlwiKTtcbiAgfVxuICBpZiAodi52aXN1YWwuZG9taW5hbnRfY29sb3JzPy5sZW5ndGggfHwgdi52aXN1YWwuc3R5bGUgfHwgdi52aXN1YWwubm90ZXM/Lmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goXCIqKlx1ODlDNlx1ODlDOSoqOlwiKTtcbiAgICBpZiAodi52aXN1YWwuZG9taW5hbnRfY29sb3JzPy5sZW5ndGgpIGxpbmVzLnB1c2goYCAgXHU0RTNCXHU4MjcyXHU4QzAzOiAke3YudmlzdWFsLmRvbWluYW50X2NvbG9ycy5qb2luKFwiLCBcIil9YCk7XG4gICAgaWYgKHYudmlzdWFsLnN0eWxlKSBsaW5lcy5wdXNoKGAgIFx1OThDRVx1NjgzQzogJHt2LnZpc3VhbC5zdHlsZX1gKTtcbiAgICBmb3IgKGNvbnN0IG4gb2Ygdi52aXN1YWwubm90ZXMgPz8gW10pIGxpbmVzLnB1c2goYCAgLSAke2NsaXAobiwgMTYwKX1gKTtcbiAgICBsaW5lcy5wdXNoKFwiXCIpO1xuICB9XG4gIGlmICh2LnVuY2VydGFpbnR5Lmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goXCIqKlx1NEUwRFx1Nzg2RVx1NUI5QVx1OTg3OSoqXHVGRjA4XHU1RjE1XHU3NTI4XHU4QkMxXHU2MzZFXHU2NUY2XHU2Q0U4XHU2MTBGXHVGRjA5OlwiKTtcbiAgICBmb3IgKGNvbnN0IHUgb2Ygdi51bmNlcnRhaW50eS5zbGljZSgwLCA4KSkgbGluZXMucHVzaChgICAtICR7Y2xpcCh1LCAxNjApfWApO1xuICAgIGxpbmVzLnB1c2goXCJcIik7XG4gIH1cbiAgbGluZXMucHVzaChcIi0tLVwiKTtcbiAgbGluZXMucHVzaChcIj4gXHU1MzQ3XHU3RUE3XHU4REVGXHU1Rjg0XHVGRjA4XHU2MjEwXHU2NzJDXHU5NjM2XHU2OEFGXHVGRjBDYHNjcmVlbnNob3RgIFx1NjYyRlx1NjcwMFx1NTQwRVx1NjI0Qlx1NkJCNSBMMlx1RkYwOVx1RkYxQVx1OEJDMVx1NjM2RVx1NEVDRFx1NEUwRFx1OERCM1x1NEVFNVx1NTIyNFx1NjVBRFx1ODlDNlx1ODlDOVx1N0VDNlx1ODI4Mlx1MzAwMVx1NEUxNFx1NUY1M1x1NTI0RFx1NkEyMVx1NTc4Qlx1NjUyRlx1NjMwMVx1NTZGRVx1NzI0N1x1OEY5M1x1NTE2NVx1NjVGNlx1RkYwQ1x1NTE4RFx1NzUyOCBzY3JlZW5zaG90IFx1NjJGRlx1NTM5Rlx1NzUxRlx1NTZGRVx1NkJENFx1NUJGOVx1RkYxQlx1N0VBRlx1NjU4N1x1NjcyQ1x1NkEyMVx1NTc4Qlx1NTIzMFx1NkI2NFx1NEUzQVx1NkI2Mlx1RkYwQ1x1NzUyOFx1NEVFNVx1NEUwQVx1OEJDMVx1NjM2RSArIG9ic2VydmUvYWN0IFx1N0VFN1x1N0VFRFx1MzAwMlwiKTtcbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbi8qKiBcdTdCODBcdTc3RURcdTcyNDhcdUZGMDhcdTRGOUJcdTY1RTVcdTVGRDcvXHU0RThCXHU0RUY2XHU2RDQxXHU0RjdGXHU3NTI4XHVGRjA5ICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0VmlzaW9uQnJpZWYodjogVmlzaW9uUmVzdWx0KTogc3RyaW5nIHtcbiAgaWYgKCF2Lm9rKSByZXR1cm4gYFx1ODlDNlx1ODlDOVx1NUYxNVx1NjRDRVx1NTkzMVx1OEQyNTogJHsodi5lcnJvciA/PyBcIlwiKS5zbGljZSgwLCAxMjApfWA7XG4gIGNvbnN0IHQgPSB2Lm9jci5mdWxsX3RleHQudHJpbSgpO1xuICByZXR1cm4gYFx1ODlDNlx1ODlDOVx1OEJDMVx1NjM2RTogJHt2LnN1bW1hcnkgPz8gXCIoXHU2NUUwXHU2MDNCXHU3RUQzKVwifSB8IE9DUiAke3QubGVuZ3RofSBcdTVCNTdcdTdCMjYgfCBcdTVFMDNcdTVDNDAgJHt2LmxheW91dC5yZWdpb25zLmxlbmd0aH0gXHU1MzNBIHwgXHU1QjlFXHU0RjUzICR7di5zZW1hbnRpY3MuZW50aXRpZXMubGVuZ3RofSB8IFx1NEUwRFx1Nzg2RVx1NUI5QSAke3YudW5jZXJ0YWludHkubGVuZ3RofSBcdTk4NzlgO1xufVxuXG4vKiogXHU0RjlCXHU1REU1XHU1MTc3XHU2M0NGXHU4RkYwXHU1RjE1XHU3NTI4XHU3Njg0XHU1QjhDXHU2NTc0XHU3QjU2XHU3NTY1XHVGRjA4XHU4OUMxIHN0cmF0ZWd5LnRzXHVGRjA5ICovXG5leHBvcnQgeyBWSVNJT05fTEFEREVSLCBWSVNJT05fUE9MSUNZLCBWSVNJT05fVE9PTF9ERVNDUklQVElPTiwgTDBfSElOVCwgTDJfV0FSTiB9IGZyb20gXCIuL3N0cmF0ZWd5LmpzXCI7XG4iLCAiLyoqXG4gKiBvcGVuY29kZS50cyBcdTIwMTRcdTIwMTQgXHU3NkY0XHU4RkRFIE9wZW5Db2RlIENMSSBcdTc2ODRcdTg5QzZcdTg5QzlcdTU2REVcdTkwMDBcdThERUZcdTc1MzFcdUZGMDhMMSBcdTc2ODRcdTZCMjFcdTdFQTdcdTkwMUFcdTkwNTNcdUZGMDlcbiAqXG4gKiBcdTU3M0FcdTY2NkZcdUZGMUFtb2RsZW5zIFx1NUYxNVx1NjRDRVx1NURGMlx1NUI4OVx1ODhDNVx1NEY0Nlx1NUY1M1x1NTI0RFx1NjczQVx1NTY2OFx1NEUwQVx1NTE3Nlx1OTAwOVx1NEUyRFx1NzY4NFx1NEY5Qlx1NUU5NFx1NTU0Nlx1NEUwRFx1NTNFRlx1NzUyOC9cdTZCMjBcdThEMzlcdTY1RjZcbiAqIFx1RkYwOFx1NTk4MiBvcGVuY29kZS5haSBcdTdGNTFcdTUxNzMgSW5zdWZmaWNpZW50IGJhbGFuY2VcdUZGMDlcdUZGMENcdTc2RjRcdTYzQTVcdTc1MjhcdTY3MkNcdTY3M0Egb3BlbmNvZGUgXHU3Njg0XG4gKiBcdTg5QzZcdTg5QzlcdTZBMjFcdTU3OEJcdTVCOENcdTYyMTBcdThCRkJcdTU2RkVcdTMwMDJcdTU5MERcdTc1Mjggb3BlbmNvZGUgXHU4MUVBXHU4RUFCXHU3NjdCXHU1RjU1XHVGRjA4YXV0aC5qc29uXHVGRjA5XHVGRjBDXHU2RDg4XHU4MDE3XHU1MTc2XHU4RDI2XHU2MjM3XHU5MTREXHU5ODlEXHUzMDAyXG4gKlxuICogXHU0RTBFIG1vZGxlbnMgXHU3Njg0XHU1MTczXHU3Q0ZCXHVGRjFBXHU2NzJDXHU4REVGXHU3NTMxXHU4RjkzXHU1MUZBXHU1NDBDXHU2ODM3XHU4RDcwIG1vZGxlbnMgXHU3Njg0IHtpbWFnZSwgcHJvdmlkZXIsIHJlc3VsdCwgbWV0YX1cbiAqIFx1N0VBNlx1NUI5QVx1RkYwQ1x1NTZFMFx1NkI2NCBub3JtYWxpemVWaXNpb25PdXRwdXQgLyBmb3JtYXRWaXNpb25FdmlkZW5jZSBcdTVCOENcdTUxNjhcdTU5MERcdTc1MjhcdUZGMENcdTVDNUVcdTRFOEVcbiAqIFx1MzAwQ1x1NUYxNVx1NjRDRVx1NTNFRlx1NjNEMlx1NjJENFx1MzAwRFx1RkYxQW1vZGxlbnMgXHU0RTNCXHUzMDAxb3BlbmNvZGUgXHU1MTVDXHU1RTk1XHVGRjBDXHU0RThDXHU4MDA1XHU4RjkzXHU1MUZBXHU1NDBDXHU2Nzg0XHUzMDAyXG4gKi9cbmltcG9ydCB7IHNwYXduIH0gZnJvbSBcIm5vZGU6Y2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUsIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBub3JtYWxpemVWaXNpb25PdXRwdXQsIHR5cGUgVmlzaW9uUmVzdWx0IH0gZnJvbSBcIi4vZW5naW5lLmpzXCI7XG5cbi8qKiBcdTg5QzZcdTg5QzlcdTU2REVcdTkwMDBcdTlFRDhcdThCQTRcdTZBMjFcdTU3OEJcdTZFMDVcdTUzNTVcdUZGMDhcdTYzMDlcdTY3MkNcdTY3M0FcdTVCOUVcdTZENEJcdTRGMThcdTUxNDhcdTVFOEZcdUZGMUJcdTc1MjhcdTY1RjZcdTZEODhcdTgwMTdcdTVCRjlcdTVFOTRcdThEMjZcdTYyMzdcdTkxNERcdTk4OURcdUZGMDkgKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX09QRU5DT0RFX01PREVMUyA9IFtcbiAgXCJvcGVuY29kZS1nby9kZWVwc2Vlay12NC1mbGFzaC12aXNpb24tZXhwXCIsIC8vIG9wZW5jb2RlLWdvIFx1N0Y1MVx1NTE3M1x1RkYwQ1x1NUI5RVx1NkQ0Qlx1NjcyQ1x1NjczQVx1NTNFRlx1NzUyOFxuICBcImdpdGh1Yi1jb3BpbG90L2NsYXVkZS1oYWlrdS00XCIsIC8vIEdpdEh1YiBDb3BpbG90IFx1NzY3Qlx1NUY1NVx1RkYwOENsYXVkZSBcdTg5QzZcdTg5QzlcdUZGMDlcbiAgXCJkZWVwc2Vlay9kZWVwc2Vlay12NC1mbGFzaC12aXNpb24tZXhwXCIsIC8vIERlZXBTZWVrIFx1NUI5OFx1NjVCOVx1ODlDNlx1ODlDOVx1RkYwOFx1NzUyOFx1NjIzN1x1ODFFQVx1NURGMVx1NzY4NCBrZXlcdUZGMDlcbl0ubWFwKChtKSA9PiBtLnRvTG93ZXJDYXNlKCkpO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wZW5Db2RlVmlzaW9uT3B0aW9ucyB7XG4gIGltYWdlUGF0aDogc3RyaW5nO1xuICBmb2N1cz86IHN0cmluZztcbiAgbW9kZWxzPzogc3RyaW5nW107XG4gIGJpbj86IHN0cmluZztcbiAgdGltZW91dE1zPzogbnVtYmVyO1xufVxuXG5mdW5jdGlvbiBmaW5kT25QYXRoKGJpbjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGV4dHMgPSBwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIgPyBbXCIuZXhlXCIsIFwiLmNtZFwiLCBcIi5iYXRcIl0gOiBbXCJcIl07XG4gIGZvciAoY29uc3QgZGlyIG9mIChwcm9jZXNzLmVudi5QQVRIID8/IFwiXCIpLnNwbGl0KFwiO1wiKS5maWx0ZXIoQm9vbGVhbikpIHtcbiAgICBmb3IgKGNvbnN0IGV4dCBvZiBleHRzKSB7XG4gICAgICBjb25zdCBjYW5kaWRhdGUgPSByZXNvbHZlKGRpciwgYmluICsgZXh0KTtcbiAgICAgIGlmIChleGlzdHNTeW5jKGNhbmRpZGF0ZSkpIHJldHVybiBjYW5kaWRhdGU7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKiogXHU4OUUzXHU2NzkwXHU1NDBFXHU3Njg0XHU1M0VGXHU2MjY3XHU4ODRDXHU1RjYyXHU1RjBGICovXG5leHBvcnQgdHlwZSBSZXNvbHZlZEJpbiA9XG4gIHwgeyBraW5kOiBcImV4ZVwiOyBwYXRoOiBzdHJpbmcgfVxuICB8IHsga2luZDogXCJub2RlXCI7IHNjcmlwdDogc3RyaW5nIH07XG5cbi8qKlxuICogXHU1QjlBXHU0RjREIG9wZW5jb2RlXHVGRjFBXG4gKiAxLiBcdTY2M0VcdTVGMEZcdThERUZcdTVGODQgLyBPUEVOQ09ERV9CSU5cdUZGMDhlbnZcdUZGMDlcbiAqIDIuIFBBVEggXHU0RTBBXHU3Njg0IC5leGVcdUZGMDhcdTc2RjRcdTYzQTVcdThERDFcdUZGMDlcbiAqIDMuIFBBVEggXHU0RTBBXHU3Njg0IG5wbSAuY21kIFx1NThGM1x1RkYwOFx1ODlFM1x1NThGM1x1NTFGQVx1NzcxRlx1NUI5RSBub2RlIFx1ODExQVx1NjcyQ1x1RkYwQ1x1OTA3Rlx1NTE0RCBjbWQuZXhlIFx1NUYxNVx1NTNGN1x1NjQwNVx1NEU3MVx1NTNDMlx1NjU3MFx1RkYwOVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZU9wZW5Db2RlQmluKGV4cGxpY2l0Pzogc3RyaW5nKTogUmVzb2x2ZWRCaW4gfCBudWxsIHtcbiAgaWYgKGV4cGxpY2l0ICYmIGV4aXN0c1N5bmMoZXhwbGljaXQpKSByZXR1cm4gZXhwbGljaXQuZW5kc1dpdGgoXCIuanNcIikgPyB7IGtpbmQ6IFwibm9kZVwiLCBzY3JpcHQ6IGV4cGxpY2l0IH0gOiB7IGtpbmQ6IFwiZXhlXCIsIHBhdGg6IGV4cGxpY2l0IH07XG4gIGNvbnN0IGVudkJpbiA9IHByb2Nlc3MuZW52Lk9QRU5DT0RFX0JJTj8udHJpbSgpO1xuICBpZiAoZW52QmluICYmIGV4aXN0c1N5bmMoZW52QmluKSkgcmV0dXJuIGVudkJpbi5lbmRzV2l0aChcIi5qc1wiKSA/IHsga2luZDogXCJub2RlXCIsIHNjcmlwdDogZW52QmluIH0gOiB7IGtpbmQ6IFwiZXhlXCIsIHBhdGg6IGVudkJpbiB9O1xuICBjb25zdCBmb3VuZCA9IGZpbmRPblBhdGgoXCJvcGVuY29kZVwiKTtcbiAgaWYgKCFmb3VuZCkgcmV0dXJuIG51bGw7XG4gIGlmICghL1xcLihjbWR8YmF0KSQvaS50ZXN0KGZvdW5kKSkgcmV0dXJuIHsga2luZDogXCJleGVcIiwgcGF0aDogZm91bmQgfTtcbiAgLy8gbnBtIC5jbWQgXHU1OEYzXHU4OUUzXHU1OEYzXHVGRjFBXHU4QkZCXHU1MUZBXHU3NzFGXHU1QjlFIG5vZGUgXHU4MTFBXHU2NzJDXHU4REVGXHU1Rjg0XG4gIHRyeSB7XG4gICAgY29uc3Qgc2hpbSA9IHJlYWRGaWxlU3luYyhmb3VuZCwgXCJ1dGY4XCIpO1xuICAgIGNvbnN0IG0gPSBzaGltLm1hdGNoKC9kcDAlW1xcXFwvXStub2RlX21vZHVsZXNbXFxcXC9dKyhbXlwiXFxcXC9dKylbXFxcXC9dKyhbXlwiJV0rP1xcLig/OmV4ZXxqcykpL2kpO1xuICAgIGlmIChtKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSByZXNvbHZlKGRpcm5hbWUoZm91bmQpICsgXCIvbm9kZV9tb2R1bGVzL1wiICsgbVsxXSArIFwiL1wiICsgbVsyXSk7XG4gICAgICBpZiAoZXhpc3RzU3luYyh0YXJnZXQpKSB7XG4gICAgICAgIHJldHVybiAvXFwuanMkL2kudGVzdChtWzJdKSA/IHsga2luZDogXCJub2RlXCIsIHNjcmlwdDogdGFyZ2V0IH0gOiB7IGtpbmQ6IFwiZXhlXCIsIHBhdGg6IHRhcmdldCB9O1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLyogXHU4OUUzXHU1OEYzXHU1OTMxXHU4RDI1XHVGRjFBXHU5MDAwXHU1NkRFXHU3NkY0XHU2M0E1IHNwYXduIC5jbWRcdUZGMDhXaW5kb3dzIFx1NEUwQlx1NTNFRlx1ODBGRCBFSU5WQUxcdUZGMENcdTYzRDBcdTc5M0FcdTc1MjhcdTYyMzcgT1BFTkNPREVfQklOXHVGRjA5ICovXG4gIH1cbiAgcmV0dXJuIHsga2luZDogXCJleGVcIiwgcGF0aDogZm91bmQgfTtcbn1cblxuLyoqIG9wZW5jb2RlIC0tZm9ybWF0IGpzb24gXHU0RThCXHU0RUY2XHU4OUUzXHU2NzkwXHVGRjFBXHU2NTM2XHU1MjMwIGVycm9yIFx1NEU4Qlx1NEVGNlx1NTM3M1x1NTkzMVx1OEQyNSAqL1xuZXhwb3J0IGludGVyZmFjZSBPcGVuQ29kZUV2ZW50cyB7XG4gIHRleHRzOiBzdHJpbmdbXTtcbiAgdG9rZW5zPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGNvc3Q/OiBudW1iZXI7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VPcGVuQ29kZUV2ZW50cyhyYXc6IHN0cmluZyk6IE9wZW5Db2RlRXZlbnRzIHtcbiAgY29uc3Qgb3V0OiBPcGVuQ29kZUV2ZW50cyA9IHsgdGV4dHM6IFtdIH07XG4gIGZvciAoY29uc3QgbGluZSBvZiByYXcuc3BsaXQoXCJcXG5cIikpIHtcbiAgICBjb25zdCB0ID0gbGluZS50cmltKCk7XG4gICAgaWYgKCF0LnN0YXJ0c1dpdGgoXCJ7XCIpKSBjb250aW51ZTtcbiAgICBsZXQgZXY6IFJlY29yZDxzdHJpbmcsIGFueT47XG4gICAgdHJ5IHsgZXYgPSBKU09OLnBhcnNlKHQpOyB9IGNhdGNoIHsgY29udGludWU7IH1cbiAgICBpZiAoZXYudHlwZSA9PT0gXCJ0ZXh0XCIgJiYgdHlwZW9mIGV2LnBhcnQ/LnRleHQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIG91dC50ZXh0cy5wdXNoKGV2LnBhcnQudGV4dCk7XG4gICAgfSBlbHNlIGlmIChldi50eXBlID09PSBcImVycm9yXCIpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGV2LmVycm9yPy5kYXRhPy5tZXNzYWdlID8/IGV2LmVycm9yPy5tZXNzYWdlID8/IEpTT04uc3RyaW5naWZ5KGV2LmVycm9yKTtcbiAgICAgIG91dC5lcnJvciA9IFN0cmluZyhtc2cpLnNsaWNlKDAsIDUwMCk7XG4gICAgfSBlbHNlIGlmIChldi50eXBlID09PSBcInN0ZXBfZmluaXNoXCIgJiYgZXYucGFydD8udG9rZW5zKSB7XG4gICAgICBvdXQudG9rZW5zID0gZXYucGFydC50b2tlbnMgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgICBpZiAodHlwZW9mIGV2LnBhcnQuY29zdCA9PT0gXCJudW1iZXJcIikgb3V0LmNvc3QgPSBldi5wYXJ0LmNvc3Q7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8qKiBcdTRFQ0VcdTZBMjFcdTU3OEJcdTU2REVcdTdCNTRcdTkxQ0NcdTYzRDBcdTUzRDZcdTdCMkNcdTRFMDBcdTZCQjUgSlNPTiBcdTVCRjlcdThDNjFcdUZGMDhcdTVCQjlcdTVGQ0RcdTUyNERcdTU0MEVcdTdGMDBcdTU2NkFcdTk3RjNcdUZGMDkgKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0SnNvbihhbnN3ZXI6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIGFueT4gfCBudWxsIHtcbiAgY29uc3Qgc3RhcnQgPSBhbnN3ZXIuaW5kZXhPZihcIntcIik7XG4gIGNvbnN0IGVuZCA9IGFuc3dlci5sYXN0SW5kZXhPZihcIn1cIik7XG4gIGlmIChzdGFydCA8IDAgfHwgZW5kIDw9IHN0YXJ0KSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGFuc3dlci5zbGljZShzdGFydCwgZW5kICsgMSkpO1xuICAgIHJldHVybiB0eXBlb2YgcGFyc2VkID09PSBcIm9iamVjdFwiICYmIHBhcnNlZCAhPT0gbnVsbCA/IHBhcnNlZCA6IG51bGw7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKiBcdTc2RjRcdThGREUgb3BlbmNvZGUgXHU4OUM2XHU4OUM5XHU3Njg0XHU2M0QwXHU3OTNBXHU2QTIxXHU2NzdGXHVGRjA4XHU0RTBFIG1vZGxlbnMgXHU1OTUxXHU3RUE2XHU1NDBDXHU2Nzg0XHVGRjBDXHU0RkREXHU4QkMxXHU0RTBCXHU2RTM4XHU1OTBEXHU3NTI4XHVGRjA5ICovXG5mdW5jdGlvbiBidWlsZE9wZW5Db2RlUHJvbXB0KGZvY3VzPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3Qgc2hhcGUgPSBbXG4gICAgXCJ7XCIsXG4gICAgJyAgXCJzdW1tYXJ5XCI6IFwib25lLXNlbnRlbmNlIG92ZXJhbGwgZGVzY3JpcHRpb25cIiwnLFxuICAgICcgIFwib2NyXCI6IHsgXCJmdWxsX3RleHRcIjogXCJhbGwgdmlzaWJsZSB0ZXh0LCBsaW5lLWJyb2tlblwiLCBcImxpbmVzXCI6IFt7IFwidGV4dFwiOiBcImVhY2ggdmlzaWJsZSBsaW5lXCIgfV0gfSwnLFxuICAgICcgIFwibGF5b3V0XCI6IHsgXCJyZWdpb25zXCI6IFt7IFwicmVhZGluZ19vcmRlclwiOiAxLCBcInR5cGVcIjogXCJ0aXRsZXxoZWFkaW5nfHBhcmFncmFwaHxsaXN0fHRhYmxlfGNoYXJ0fGZvcm18aW1hZ2V8aWNvbnxsaW5rfG5hdnxidXR0b258c2VhcmNofGRpYWxvZ3xiYW5uZXJcIiwgXCJ0ZXh0XCI6IFwid2hhdCB0aGlzIHJlZ2lvbiBpcy9jb250YWluc1wiIH1dIH0sJyxcbiAgICAnICBcInNlbWFudGljc1wiOiB7IFwic2NlbmVcIjogXCJ3aGF0IGtpbmQgb2YgcGFnZS9VSSB0aGlzIGlzXCIsIFwiZW50aXRpZXNcIjogW3sgXCJuYW1lXCI6IFwiLi4uXCIsIFwidHlwZVwiOiBcImJ1dHRvbnxpbnB1dHxsYWJlbHxjaGFydHxkaWFsb2d8Li4uXCIsIFwiZXZpZGVuY2VcIjogXCJ3aHlcIiB9XSwgXCJyZWxhdGlvbnNcIjogW10gfSwnLFxuICAgICcgIFwidmlzdWFsXCI6IHsgXCJkb21pbmFudF9jb2xvcnNcIjogW10sIFwic3R5bGVcIjogXCJmbGF0fG1hdGVyaWFsfGRhcmt8Li4uXCIsIFwibm90ZXNcIjogW10gfSwnLFxuICAgICcgIFwidW5jZXJ0YWludHlcIjogW1wiYW55dGhpbmcgeW91IGNvdWxkIG5vdCByZWFkIGNvbmZpZGVudGx5XCJdJyxcbiAgICBcIn1cIixcbiAgXTtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgXCJZb3UgYXJlIHRoZSB2aXNpb24gZW5naW5lIG9mIGEgYnJvd3NlciBhdXRvbWF0aW9uIHRvb2wuIEFuYWx5emUgdGhlIGF0dGFjaGVkIHNjcmVlbnNob3QuXCIsXG4gICAgXCJSZXBseSB3aXRoIE9ORSBKU09OIG9iamVjdCwgbm8gcHJvc2UsIG5vIG1hcmtkb3duIGZlbmNlLCB1c2luZyBleGFjdGx5IHRoaXMgc2hhcGU6XCIsXG4gICAgLi4uc2hhcGUsXG4gIF07XG4gIGlmIChmb2N1cykgbGluZXMucHVzaChcIkV4dHJhIGZvY3VzIGZyb20gdGhlIGNhbGxlcjogXCIgKyBmb2N1cyk7XG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuXG4vKipcbiAqIFx1OEZEMFx1ODg0Q1x1NEUwMFx1NkIyMSBvcGVuY29kZSBcdTg5QzZcdTg5QzlcdThCRkJcdTU2RkVcdUZGMUJcdTYyMTBcdTUyOUZcdTY1RjZcdThGRDRcdTU2REVcdTRFMEUgbW9kbGVucyBcdTU0MENcdTY3ODRcdTc2ODQgcm9vdCBcdTVCRjlcdThDNjFcdTUxOERcdThENzBcbiAqIG5vcm1hbGl6ZVZpc2lvbk91dHB1dFx1RkYxQlx1NzZGNFx1NjNBNVx1NTkzMVx1OEQyNVx1OEZENFx1NTZERSBvaz1mYWxzZVx1RkYwQ1x1N0VERFx1NEUwRFx1NjI5Qlx1NTFGQVx1MzAwMlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuT3BlbkNvZGVWaXNpb24ob3B0czogT3BlbkNvZGVWaXNpb25PcHRpb25zKTogUHJvbWlzZTxWaXNpb25SZXN1bHQ+IHtcbiAgY29uc3QgYmluID0gcmVzb2x2ZU9wZW5Db2RlQmluKG9wdHMuYmluKTtcbiAgaWYgKCFiaW4pIHtcbiAgICByZXR1cm4ge1xuICAgICAgb2s6IGZhbHNlLCBpbWFnZVBhdGg6IG9wdHMuaW1hZ2VQYXRoLCBwcm92aWRlcjogbnVsbCwgbW9kZWw6IG51bGwsIHN1bW1hcnk6IG51bGwsXG4gICAgICBvY3I6IHsgZnVsbF90ZXh0OiBcIlwiLCBsaW5lczogW10gfSwgbGF5b3V0OiB7IHJlZ2lvbnM6IFtdIH0sXG4gICAgICBzZW1hbnRpY3M6IHsgc2NlbmU6IG51bGwsIGVudGl0aWVzOiBbXSwgcmVsYXRpb25zOiBbXSB9LCB2aXN1YWw6IHt9LCB1bmNlcnRhaW50eTogW10sXG4gICAgICBlcnJvcjogXCJvcGVuY29kZSBDTEkgXHU2NzJBXHU2MjdFXHU1MjMwXHVGRjFBXHU4QkJFXHU3RjZFIE9QRU5DT0RFX0JJTiBcdTYyMTZcdTVDMDZcdTUxNzZcdTUyQTBcdTUxNjUgUEFUSFx1MzAwMlwiLFxuICAgIH07XG4gIH1cbiAgY29uc3QgbW9kZWxzID0gKG9wdHMubW9kZWxzICYmIG9wdHMubW9kZWxzLmxlbmd0aCA/IG9wdHMubW9kZWxzIDogREVGQVVMVF9PUEVOQ09ERV9NT0RFTFMpXG4gICAgLm1hcCgobSkgPT4gbS50b0xvd2VyQ2FzZSgpKTtcbiAgY29uc3QgdGltZW91dE1zID0gb3B0cy50aW1lb3V0TXMgPz8gMTgwXzAwMDtcbiAgZm9yIChjb25zdCBtb2RlbCBvZiBtb2RlbHMpIHtcbiAgICBjb25zdCBwcm9tcHQgPSBidWlsZE9wZW5Db2RlUHJvbXB0KG9wdHMuZm9jdXMpO1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IG5ldyBQcm9taXNlPHsgb2s6IGJvb2xlYW47IHJhdz86IHN0cmluZzsgZXJyPzogc3RyaW5nIH0+KChyZXNvbHZlUHJvbWlzZSkgPT4ge1xuICAgICAgY29uc3QgYXJncyA9IFtcInJ1blwiLCBwcm9tcHQsIFwiLW1cIiwgbW9kZWwsIFwiLS1mb3JtYXRcIiwgXCJqc29uXCIsIFwiLWZcIiwgb3B0cy5pbWFnZVBhdGhdO1xuICAgICAgY29uc3QgY2hpbGQgPVxuICAgICAgICBiaW4ua2luZCA9PT0gXCJub2RlXCJcbiAgICAgICAgICA/IHNwYXduKHByb2Nlc3MuZXhlY1BhdGgsIFtiaW4uc2NyaXB0LCAuLi5hcmdzXSwge1xuICAgICAgICAgICAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgICAgICAgICAgICAgc3RkaW86IFtcImlnbm9yZVwiLCBcInBpcGVcIiwgXCJwaXBlXCJdLFxuICAgICAgICAgICAgICBjd2Q6IGRpcm5hbWUocmVzb2x2ZShvcHRzLmltYWdlUGF0aCkpLFxuICAgICAgICAgICAgICBlbnY6IHsgLi4ucHJvY2Vzcy5lbnYgfSxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgOiBzcGF3bihiaW4ucGF0aCwgYXJncywge1xuICAgICAgICAgICAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgICAgICAgICAgICAgc3RkaW86IFtcImlnbm9yZVwiLCBcInBpcGVcIiwgXCJwaXBlXCJdLFxuICAgICAgICAgICAgICBjd2Q6IGRpcm5hbWUocmVzb2x2ZShvcHRzLmltYWdlUGF0aCkpLFxuICAgICAgICAgICAgICBlbnY6IHsgLi4ucHJvY2Vzcy5lbnYgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgbGV0IHN0ZG91dCA9IFwiXCI7XG4gICAgICBsZXQgc3RkZXJyID0gXCJcIjtcbiAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiBjaGlsZC5raWxsKCksIHRpbWVvdXRNcyArIDEwXzAwMCk7XG4gICAgICBjaGlsZC5zdGRvdXQub24oXCJkYXRhXCIsIChkOiBCdWZmZXIpID0+IHsgc3Rkb3V0ICs9IGQudG9TdHJpbmcoXCJ1dGY4XCIpOyB9KTtcbiAgICAgIGNoaWxkLnN0ZGVyci5vbihcImRhdGFcIiwgKGQ6IEJ1ZmZlcikgPT4geyBzdGRlcnIgKz0gZC50b1N0cmluZyhcInV0ZjhcIik7IH0pO1xuICAgICAgY2hpbGQub24oXCJlcnJvclwiLCAoZSkgPT4ge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICByZXNvbHZlUHJvbWlzZSh7IG9rOiBmYWxzZSwgZXJyOiBcIm9wZW5jb2RlIFx1NTQyRlx1NTJBOFx1NTkzMVx1OEQyNTogXCIgKyBlLm1lc3NhZ2UgfSk7XG4gICAgICB9KTtcbiAgICAgIGNoaWxkLm9uKFwiY2xvc2VcIiwgKGNvZGUpID0+IHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgICByZXNvbHZlUHJvbWlzZSh7IG9rOiBmYWxzZSwgZXJyOiBcIm9wZW5jb2RlIFx1OTAwMFx1NTFGQSAoY29kZT1cIiArIGNvZGUgKyBcIik6IFwiICsgKHN0ZGVyci50cmltKCkuc3BsaXQoXCJcXG5cIikuc2xpY2UoLTMpLmpvaW4oXCJcXG5cIikgfHwgXCJcdTY1RTBcdTk1MTlcdThCRUZcdThGOTNcdTUxRkFcIikgfSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlc29sdmVQcm9taXNlKHsgb2s6IHRydWUsIHJhdzogc3Rkb3V0IH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKCFyZXMub2spIHtcbiAgICAgIGNvbnN0IHNraXBwZWQgPSByZXMuZXJyID8/IFwidW5rbm93blwiO1xuICAgICAgaWYgKHNraXBwZWQuaW5jbHVkZXMoXCJJbnN1ZmZpY2llbnQgYmFsYW5jZVwiKSB8fCBza2lwcGVkLmluY2x1ZGVzKFwiQ3JlZGl0c0Vycm9yXCIpIHx8IHNraXBwZWQuaW5jbHVkZXMoXCJub3Qgc3VwcG9ydGVkXCIpKSB7XG4gICAgICAgIGNvbnRpbnVlOyAvLyBcdThCRTVcdTZBMjFcdTU3OEJcdTRFMERcdTUzRUZcdTc1MjhcdUZGMENcdThCRDVcdTRFMEJcdTRFMDBcdTRFMkFcdUZGMDhMMSBcdTYyMTBcdTY3MkNcdTRGMThcdTUxNDhcdUZGMUFcdTRFMERcdTYyOEFcdTc1MjhcdTYyMzdcdTc2ODRcdTRFRDhcdThEMzlcdTkwMUFcdTkwNTNcdTVGNTNcdTlFRDhcdThCQTRcdUZGMDlcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbXB0eUZhaWwob3B0cy5pbWFnZVBhdGgsIHNraXBwZWQpO1xuICAgIH1cbiAgICBjb25zdCBldmVudHMgPSBwYXJzZU9wZW5Db2RlRXZlbnRzKHJlcy5yYXcgPz8gXCJcIik7XG4gICAgaWYgKGV2ZW50cy5lcnJvcikge1xuICAgICAgaWYgKGV2ZW50cy5lcnJvci5pbmNsdWRlcyhcIkluc3VmZmljaWVudCBiYWxhbmNlXCIpIHx8IGV2ZW50cy5lcnJvci5pbmNsdWRlcyhcIkNyZWRpdHNFcnJvclwiKSB8fCBldmVudHMuZXJyb3IuaW5jbHVkZXMoXCJub3Qgc3VwcG9ydGVkXCIpKSBjb250aW51ZTtcbiAgICAgIHJldHVybiBlbXB0eUZhaWwob3B0cy5pbWFnZVBhdGgsIGV2ZW50cy5lcnJvcik7XG4gICAgfVxuICAgIGNvbnN0IGFuc3dlciA9IGV2ZW50cy50ZXh0cy5qb2luKFwiXFxuXCIpO1xuICAgIGNvbnN0IHBhcnNlZCA9IGV4dHJhY3RKc29uKGFuc3dlcik7XG4gICAgaWYgKCFwYXJzZWQpIHJldHVybiBlbXB0eUZhaWwob3B0cy5pbWFnZVBhdGgsIFwib3BlbmNvZGUgXHU2NzJBXHU4RkQ0XHU1NkRFXHU1NDA4XHU2Q0Q1IEpTT04gXHU4QkMxXHU2MzZFXCIpO1xuICAgIGNvbnN0IHJvb3QgPSB7XG4gICAgICBpbWFnZTogb3B0cy5pbWFnZVBhdGgsXG4gICAgICBwcm92aWRlcjogXCJvcGVuY29kZS1jbGk6XCIgKyBtb2RlbCxcbiAgICAgIHJlc3VsdDogcGFyc2VkLFxuICAgICAgbWV0YToge1xuICAgICAgICBtb2RlbCxcbiAgICAgICAgZHVyYXRpb25TZWNvbmRzOiBudWxsLFxuICAgICAgICB1c2FnZTogZXZlbnRzLnRva2VucyA/PyBudWxsLFxuICAgICAgICBhdHRlbXB0czogW3sgcHJvdmlkZXI6IFwib3BlbmNvZGUtY2xpXCIsIG9rOiB0cnVlIH1dLFxuICAgICAgICB3YXJuaW5nczogW1wib3BlbmNvZGUgXHU3NkY0XHU4RkRFXHU1NkRFXHU5MDAwXHVGRjA4bW9kbGVucyBcdTVGMTVcdTY0Q0VcdTRFMERcdTUzRUZcdTc1MjhcdTY1RjZcdTc2ODQgTDEgXHU2QjIxXHU3RUE3XHU5MDFBXHU5MDUzXHVGRjA5XCJdLFxuICAgICAgfSxcbiAgICB9O1xuICAgIHJldHVybiBub3JtYWxpemVWaXNpb25PdXRwdXQoSlNPTi5zdHJpbmdpZnkocm9vdCksIG9wdHMuaW1hZ2VQYXRoKTtcbiAgfVxuICByZXR1cm4gZW1wdHlGYWlsKG9wdHMuaW1hZ2VQYXRoLCBcIlx1NTE2OFx1OTBFOFx1NTZERVx1OTAwMFx1NkEyMVx1NTc4Qlx1NTc0N1x1NEUwRFx1NTNFRlx1NzUyOFx1RkYwOFx1NkIyMFx1OEQzOVx1NjIxNlx1NkEyMVx1NTc4Qlx1NEUwRFx1NjUyRlx1NjMwMVx1RkYwOVx1RkYwQ1x1OEJGN1x1NjhDMFx1NjdFNSBvcGVuY29kZSBcdTc2N0JcdTVGNTVcdTRFMEVcdTkxNERcdTk4OURcdTMwMDJcIik7XG59XG5cbmZ1bmN0aW9uIGVtcHR5RmFpbChpbWFnZVBhdGg6IHN0cmluZywgZXJyb3I6IHN0cmluZyk6IFZpc2lvblJlc3VsdCB7XG4gIHJldHVybiB7XG4gICAgb2s6IGZhbHNlLCBpbWFnZVBhdGgsIHByb3ZpZGVyOiBudWxsLCBtb2RlbDogbnVsbCwgc3VtbWFyeTogbnVsbCxcbiAgICBvY3I6IHsgZnVsbF90ZXh0OiBcIlwiLCBsaW5lczogW10gfSwgbGF5b3V0OiB7IHJlZ2lvbnM6IFtdIH0sXG4gICAgc2VtYW50aWNzOiB7IHNjZW5lOiBudWxsLCBlbnRpdGllczogW10sIHJlbGF0aW9uczogW10gfSwgdmlzdWFsOiB7fSwgdW5jZXJ0YWludHk6IFtdLFxuICAgIGVycm9yLFxuICB9O1xufVxuIiwgIi8qKlxyXG4gKiBNQ1AgXHU1REU1XHU1MTc3XHU1QjlBXHU0RTQ5XHJcbiAqXHJcbiAqIFx1NjI4QSBGb3JnZSBcdTc2ODRcdTY4MzhcdTVGQzNcdTgwRkRcdTUyOUJcdTVDMDFcdTg4QzVcdTRFM0FcdTY4MDdcdTUxQzZcdTc2ODQgTUNQIFx1NURFNVx1NTE3N1x1OTZDNlx1RkYwQ1x1NEY5Qlx1NEVGQlx1NEY1NSBNQ1AgXHU1QkEyXHU2MjM3XHU3QUVGXHVGRjA4XHJcbiAqIGRlZXBzZWVrIGhhcm5lc3NcdTMwMDFjbmIuY29vbFx1MzAwMUNsYXVkZSBEZXNrdG9wIFx1N0I0OVx1RkYwOVx1OEMwM1x1NzUyOFx1MzAwMlxyXG4gKlxyXG4gKiBcdTVERTVcdTUxNzdcdThCQkVcdThCQTFcdTUzOUZcdTUyMTlcdUZGMDhcdTUwMUZcdTkyNzQgQ2hyb21lIERldlRvb2xzIE1DUCBcdTc2ODRcdThDMDNcdThCRDVcdTRGMThcdTUxNDggKyBcdTlBRDhcdTY1NDhcdUZGMDlcdUZGMUFcclxuICogLSBvYnNlcnZlXHVGRjFBXHU5QUQ4XHU2NTQ4XHU5ODc1XHU5NzYyXHU1RkVCXHU3MTY3XHVGRjA4XHU2NkZGXHU0RUUzXHU1MTk3XHU5NTdGIERPTSBkdW1wXHVGRjA5XHUyMDE0XHUyMDE0XHU2MjEwXHU2NzJDXHU5NjM2XHU2OEFGIEwwXHVGRjA4XHU3RUFGXHU2NTg3XHU2NzJDXHVGRjBDXHU5NkY2XHU2MjEwXHU2NzJDXHVGRjA5XHJcbiAqIC0gYWN0XHVGRjFBXHU3RURGXHU0RTAwXHU1MkE4XHU0RjVDXHU2MjY3XHU4ODRDXHJcbiAqIC0gZGlhZ25vc2VcdUZGMUE1IFx1NjYxRlx1OEMwM1x1OEJENVx1OEJDQVx1NjVBRFxyXG4gKiAtIGV2YWxcdUZGMUFcdTZDRThcdTUxNjUgSlMgXHU5QUQ4XHU3RUE3XHU4QkNBXHU2NUFEXHJcbiAqIC0gdmlzaW9uXHVGRjFBXHU2MjJBXHU1NkZFICsgbW9kbGVucyBcdTg5QzZcdTg5QzlcdTVGMTVcdTY0Q0UgXHUyMTkyIFx1N0VBRlx1NjU4N1x1NjcyQ1x1OEJDMVx1NjM2RSBcdTIwMTRcdTIwMTQgXHU2MjEwXHU2NzJDXHU5NjM2XHU2OEFGIEwxXHJcbiAqIC0gc2NyZWVuc2hvdFx1RkYxQVx1NTM5Rlx1NzUxRlx1NTZGRVx1NzI0N1x1RkYwOFx1NTkxQVx1NkEyMVx1NjAwMVx1NkEyMVx1NTc4Qlx1NTNFRlx1ODlDMVx1RkYwOVx1MjAxNFx1MjAxNCBcdTYyMTBcdTY3MkNcdTk2MzZcdTY4QUYgTDJcdUZGMENcdTY3MDBcdTU0MEVcdTYyNEJcdTZCQjVcclxuICpcclxuICogXHU4OUM2XHU4OUM5XHU2MjEwXHU2NzJDXHU5NjM2XHU2OEFGXHU4OUMxIEBvcGVubGl1bGFuL3Zpc2lvbiBcdTc2ODQgVklTSU9OX0xBRERFUlx1RkYxQUwwIFx1MjE5MiBMMSBcdTIxOTIgTDIgXHU5MDEwXHU3RUE3XHU1MzQ3XHU3RUE3XHUzMDAyXHJcbiAqL1xyXG5pbXBvcnQgeyBWSVNJT05fVE9PTF9ERVNDUklQVElPTiB9IGZyb20gXCJAb3BlbmxpdWxhbi92aXNpb25cIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWNwVG9vbFNjaGVtYSB7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgLyoqIEpTT04gU2NoZW1hIFx1NTE2NVx1NTNDMiAqL1xyXG4gIGlucHV0U2NoZW1hOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IFRPT0xTOiBNY3BUb29sU2NoZW1hW10gPSBbXHJcbiAge1xyXG4gICAgbmFtZTogXCJvYnNlcnZlXCIsXHJcbiAgICBkZXNjcmlwdGlvbjpcclxuICAgICAgXCJcdTgzQjdcdTUzRDZcdTVGNTNcdTUyNERcdTk4NzVcdTk3NjJcdTc2ODRcdTlBRDhcdTY1NDhcdTVGRUJcdTcxNjdcdTMwMDJcdThGRDRcdTU2REVcdTdDQkVcdTdCODBcdTU0MEVcdTc2ODRcdTUzRUZcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTdEMjJcdTVGMTVcdUZGMDhcdTVFMjYgcmVmXHVGRjA5XHU0RTBFXHU5ODc1XHU5NzYyXHU3RURGXHU4QkExXHUzMDAyVG9rZW4gXHU1M0NCXHU1OTdEXHVGRjBDXHU2NjJGXHU3NDA2XHU4OUUzXHU5ODc1XHU5NzYyXHU3Njg0XHU5OTk2XHU5MDA5XHUzMDAyXHVGRjA4XHU2MjEwXHU2NzJDXHU5NjM2XHU2OEFGIEwwXHVGRjFBXHU3RUFGXHU2NTg3XHU2NzJDIERPTSBcdTVGRUJcdTcxNjdcdUZGMENcdTk2RjZcdTk4OURcdTU5MTZcdTYyMTBcdTY3MkNcdUZGMENcdTY2MkZcdTc0MDZcdTg5RTNcdTk4NzVcdTk3NjJcdTc2ODRcdTlFRDhcdThCQTRcdTdCMkNcdTRFMDBcdTZCNjVcdUZGMDlcIixcclxuICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXHJcbiAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICBtYXhOb2RlczogeyB0eXBlOiBcIm51bWJlclwiLCBkZXNjcmlwdGlvbjogXCJcdTY3MDBcdTU5MjdcdTgyODJcdTcwQjlcdTY1NzBcdUZGMDhcdTlFRDhcdThCQTQgMjAwXHVGRjA5XCIgfSxcclxuICAgICAgICBtYXhUZXh0TGVuZ3RoOiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcIlx1NTM1NVx1ODI4Mlx1NzBCOVx1NjU4N1x1NjcyQ1x1NjcwMFx1NTkyN1x1OTU3Rlx1NUVBNlx1RkYwOFx1OUVEOFx1OEJBNCA4MFx1RkYwOVwiIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAge1xyXG4gICAgbmFtZTogXCJhY3RcIixcclxuICAgIGRlc2NyaXB0aW9uOlxyXG4gICAgICBcIlx1NjI2N1x1ODg0Q1x1NEUwMFx1NEUyQVx1N0VERlx1NEUwMFx1NkQ0Rlx1ODlDOFx1NTY2OFx1NTJBOFx1NEY1Q1x1RkYwOG5hdmlnYXRlL2NsaWNrL2ZpbGwvdHlwZS9zZWxlY3QvaG92ZXIvc2Nyb2xsL3ByZXNzL3dhaXQvZXh0cmFjdC9hc3NlcnQvc2NyZWVuc2hvdC9ldmFsdWF0ZVx1RkYwOVx1MzAwMlwiLFxyXG4gICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgIHR5cGU6IHtcclxuICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXHJcbiAgICAgICAgICBlbnVtOiBbXCJuYXZpZ2F0ZVwiLCBcImNsaWNrXCIsIFwiZmlsbFwiLCBcInR5cGVcIiwgXCJzZWxlY3RcIiwgXCJob3ZlclwiLCBcInNjcm9sbFwiLCBcInByZXNzXCIsIFwid2FpdFwiLCBcImV4dHJhY3RcIiwgXCJhc3NlcnRcIiwgXCJzY3JlZW5zaG90XCIsIFwiZXZhbHVhdGVcIl0sXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcdTUyQThcdTRGNUNcdTdDN0JcdTU3OEJcIixcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuICAgICAgICAvLyBcdTkwMUFcdTc1MjhcdTVCOUFcdTRGNERcclxuICAgICAgICByZWY6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwib2JzZXJ2ZSBcdThGRDRcdTU2REVcdTc2ODRcdTUxNDNcdTdEMjAgcmVmXHVGRjA4XHU2NzAwXHU3Q0JFXHU3ODZFXHVGRjA5XCIgfSxcclxuICAgICAgICBzZWxlY3RvcjogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJDU1MgXHU5MDA5XHU2MkU5XHU1NjY4XCIgfSxcclxuICAgICAgICB0ZXh0OiB7IHR5cGU6IFwic3RyaW5nXCIsIGRlc2NyaXB0aW9uOiBcIlx1N0NCRVx1Nzg2RVx1NjU4N1x1NjcyQ1x1NUI5QVx1NEY0RFwiIH0sXHJcbiAgICAgICAgc2VtYW50aWM6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiXHU4QkVEXHU0RTQ5XHU2M0NGXHU4RkYwXHU1QjlBXHU0RjREXCIgfSxcclxuICAgICAgICAvLyBcdTUyQThcdTRGNUNcdTUzQzJcdTY1NzBcclxuICAgICAgICB1cmw6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG4gICAgICAgIHZhbHVlOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuICAgICAgICBrZXk6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG4gICAgICAgIG1zOiB7IHR5cGU6IFwibnVtYmVyXCIgfSxcclxuICAgICAgICBzY3JpcHQ6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG4gICAgICAgIG1vZGU6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxyXG4gICAgICAgIGV4cGVjdGVkOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcclxuICAgICAgICAvLyBcdTYyMkFcdTU2RkUvXHU2RURBXHU1MkE4L1x1OEY5M1x1NTE2NS9cdTVCRkNcdTgyMkFcdTdFQzZcdTgyODJcdUZGMDhcdTRGOUIgSURFIFx1NzY4NCBmdW5jdGlvbiBjYWxsaW5nIFx1NUI4Q1x1NjU3NFx1NThGMFx1NjYwRVx1RkYwQ1x1OTA3Rlx1NTE0RFx1ODBGRFx1NTI5Qlx1ODhBQlx1OTY5MFx1ODVDRlx1RkYwOVxyXG4gICAgICAgIGZ1bGxQYWdlOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbjogXCJzY3JlZW5zaG90IFx1NjVGNlx1NjYyRlx1NTQyNlx1NjU3NFx1OTg3NVx1NjIyQVx1NTZGRVwiIH0sXHJcbiAgICAgICAgZGVsdGFZOiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcInNjcm9sbCBcdTY1RjZcdTU3ODJcdTc2RjRcdTZFREFcdTUyQThcdThERERcdTc5QkJcIiB9LFxyXG4gICAgICAgIGRlbGF5OiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlc2NyaXB0aW9uOiBcInR5cGUgXHU2NUY2XHU5MDEwXHU5NTJFXHU4RjkzXHU1MTY1XHU1RUY2XHU4RkRGKG1zKVwiIH0sXHJcbiAgICAgICAgd2FpdFVudGlsOiB7IHR5cGU6IFwic3RyaW5nXCIsIGVudW06IFtcImxvYWRcIiwgXCJkb21jb250ZW50bG9hZGVkXCIsIFwibmV0d29ya2lkbGVcIiwgXCJjb21taXRcIl0sIGRlc2NyaXB0aW9uOiBcIm5hdmlnYXRlIFx1NjVGNlx1N0I0OVx1NUY4NVx1N0I1Nlx1NzU2NVwiIH0sXHJcbiAgICAgICAgd2FpdEZvck5hdmlnYXRpb246IHsgdHlwZTogXCJib29sZWFuXCIsIGRlc2NyaXB0aW9uOiBcImNsaWNrIFx1NjVGNlx1NjYyRlx1NTQyNlx1N0I0OVx1NUY4NVx1NUJGQ1x1ODIyQVx1N0EzM1x1NUI5QVx1RkYwOFx1NzBCOVx1NTFGQlx1OTRGRVx1NjNBNVx1ODlFNlx1NTNEMVx1OERGM1x1OEY2Q1x1NjVGNlx1RkYwOVwiIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlcXVpcmVkOiBbXCJ0eXBlXCJdLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHtcclxuICAgIG5hbWU6IFwiZGlhZ25vc2VcIixcclxuICAgIGRlc2NyaXB0aW9uOlxyXG4gICAgICBcIlx1OEZEMFx1ODg0QyA1IFx1NjYxRlx1OEMwM1x1OEJENVx1OEJDQVx1NjVBRFx1RkYwQ1x1OTFDN1x1OTZDNlx1NjNBN1x1NTIzNlx1NTNGMFx1OTUxOVx1OEJFRlx1MzAwMVx1N0Y1MVx1N0VEQ1x1NTkzMVx1OEQyNVx1MzAwMUpTIFx1NUYwMlx1NUUzOFx1MzAwMVx1NjAyN1x1ODBGRFx1NjMwN1x1NjgwN1x1RkYwQ1x1NUU3Nlx1OEZENFx1NTZERVx1NTA2NVx1NUVCN1x1NUVBNlx1NEUwRSBBSSBcdTUzRUZcdThCRkJcdTVFRkFcdThCQUVcdTMwMDJcdTUyQThcdTRGNUNcdTU5MzFcdThEMjVcdTU0MEVcdTgxRUFcdTUyQThcdThCQ0FcdTY1QURcdTMwMDJcIixcclxuICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgfSxcclxuICB7XHJcbiAgICBuYW1lOiBcImV2YWxcIixcclxuICAgIGRlc2NyaXB0aW9uOiBcIlx1NTcyOFx1OTg3NVx1OTc2Mlx1NkNFOFx1NTE2NVx1NjI2N1x1ODg0QyBKYXZhU2NyaXB0XHVGRjBDXHU3NTI4XHU0RThFXHU5QUQ4XHU3RUE3XHU4QkNBXHU2NUFEXHU0RTBFXHU3MkI2XHU2MDAxXHU2OEMwXHU2N0U1XHUzMDAyXCIsXHJcbiAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICBwcm9wZXJ0aWVzOiB7IHNjcmlwdDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJcdTg5ODFcdTYyNjdcdTg4NENcdTc2ODQgSlMgXHU4ODY4XHU4RkJFXHU1RjBGL1x1OEJFRFx1NTNFNVwiIH0gfSxcclxuICAgICAgcmVxdWlyZWQ6IFtcInNjcmlwdFwiXSxcclxuICAgIH0sXHJcbiAgfSxcclxuICB7XHJcbiAgICBuYW1lOiBcInNjcmVlbnNob3RcIixcclxuICAgIGRlc2NyaXB0aW9uOlxyXG4gICAgICBcIlx1NjIyQVx1NTNENlx1NUY1M1x1NTI0RFx1OTg3NVx1OTc2Mlx1RkYwOFx1NTNFRlx1NjU3NFx1OTg3NVx1RkYwOVx1RkYwQ1x1OEZENFx1NTZERSBiYXNlNjQgXHU1NkZFXHU3MjQ3XHVGRjBDXHU3NTI4XHU0RThFXHU4OUM2XHU4OUM5XHU3ODZFXHU4QkE0XHUzMDAyXHU2MjJBXHU1NkZFXHU0RjFBXHU0RjVDXHU0RTNBXHU1NkZFXHU3MjQ3XHU0RThCXHU0RUY2XHU1MTk5XHU1MTY1XHU0RjFBXHU4QkREXHU2NUU1XHU1RkQ3XHVGRjBDXHU0RjlCXHU1OTFBXHU2QTIxXHU2MDAxIEFJIFx1NkQ4OFx1OEQzOVx1MzAwMlx1RkYwOFx1NjIxMFx1NjcyQ1x1OTYzNlx1NjhBRiBMMiBcdTY3MDBcdTU0MEVcdTYyNEJcdTZCQjVcdUZGMUFcdTUzOUZcdTc1MUZcdTU2RkVcdTcyNDdcdTRFQzVcdTU5MUFcdTZBMjFcdTYwMDFcdTZBMjFcdTU3OEJcdTUzRUZcdTg5QzFcdTVFNzZcdThCQTFcdThEMzlcdUZGMUJcdTdFQUZcdTY1ODdcdTY3MkNcdTZBMjFcdTU3OEJcdThCRjdcdTRGMThcdTUxNDhcdTc1MjggdmlzaW9uIEwxIFx1ODNCN1x1NTNENlx1NjU4N1x1NjcyQ1x1OEJDMVx1NjM2RVx1RkYwOVwiLFxyXG4gICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgIGZ1bGxQYWdlOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbjogXCJcdTY2MkZcdTU0MjZcdTY1NzRcdTk4NzVcdTYyMkFcdTU2RkVcIiB9LFxyXG4gICAgICAgIGNhcHRpb246IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiXHU2MjJBXHU1NkZFXHU4QkY0XHU2NjBFXHVGRjA4XHU1MTk5XHU1MTY1XHU2NUU1XHU1RkQ3XHU0RThCXHU0RUY2XHVGRjA5XCIgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICB7XHJcbiAgICBuYW1lOiBcInNlc3Npb25fbG9nXCIsXHJcbiAgICBkZXNjcmlwdGlvbjpcclxuICAgICAgXCJcdTgzQjdcdTUzRDZcdTVGNTNcdTUyNERcdTRGMUFcdThCRERcdTc2ODRcdTRFOEJcdTRFRjZcdTY1RTVcdTVGRDdcdTZENDFcdUZGMDhcdTUyQThcdTRGNUMvXHU4QkNBXHU2NUFEL1x1OTUxOVx1OEJFRi9cdTYyMkFcdTU2RkVcdThGNjhcdThGRjlcdUZGMDlcdTMwMDJcdThGRDlcdTY2MkYgQUkgXHU1MzRGXHU0RjVDXHU3Njg0XHU4RkZEXHU4RTJBXHU4MEZEXHU1MjlCXHVGRjFBXHU4QkE5XHU1OTE2XHU5MEU4IEFJIFx1NzcwQlx1NTIzMFx1MzAwRVx1NTNEMVx1NzUxRlx1NEU4Nlx1NEVDMFx1NEU0OCArIFx1NEUzQVx1NEVDMFx1NEU0OFx1NTkzMVx1OEQyNSArIFx1NUVGQVx1OEJBRVx1MzAwRlx1MzAwMmZvcm1hdD1qc29uIFx1OEZENFx1NTZERVx1N0VEM1x1Njc4NFx1NTMxNlx1NEU4Qlx1NEVGNlx1RkYwQ1x1OUVEOFx1OEJBNFx1OEZENFx1NTZERSBtYXJrZG93blx1MzAwMlwiLFxyXG4gICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgIGZvcm1hdDogeyB0eXBlOiBcInN0cmluZ1wiLCBlbnVtOiBbXCJtYXJrZG93blwiLCBcImpzb25cIl0sIGRlc2NyaXB0aW9uOiBcIlx1OEY5M1x1NTFGQVx1NjgzQ1x1NUYwRlx1RkYwQ1x1OUVEOFx1OEJBNCBtYXJrZG93blwiIH0sXHJcbiAgICAgICAgdGl0bGU6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwibWFya2Rvd24gXHU2MkE1XHU1NDRBXHU2ODA3XHU5ODk4XCIgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICB7XHJcbiAgICBuYW1lOiBcImNsb3NlXCIsXHJcbiAgICBkZXNjcmlwdGlvbjogXCJcdTUxNzNcdTk1RURcdTZENEZcdTg5QzhcdTU2NjhcdUZGMENcdTdFRDNcdTY3NUZcdTRGMUFcdThCRERcdTMwMDJcIixcclxuICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgfSxcclxuICB7XHJcbiAgICBuYW1lOiBcInN0ZWFsdGhfc3RhdHVzXCIsXHJcbiAgICBkZXNjcmlwdGlvbjogXCJcdTY3RTVcdTc3MEJcdTk2MzJcdTY4QzBcdTZENEJcdUZGMDhTdGVhbHRoXHVGRjA5XHU2QTIxXHU1NzU3XHU3MkI2XHU2MDAxXHVGRjFBXHU2NjJGXHU1NDI2XHU1NDJGXHU3NTI4XHUzMDAxXHU3RUE3XHU1MjJCXHUzMDAxVUEgXHU3QjU2XHU3NTY1XHU3QjQ5XHUzMDAyXHU5NjMyXHU2OEMwXHU2RDRCXHU3NTI4XHU0RThFXHU5MDdGXHU1MTREXHU4OEFCXHU3NkVFXHU2ODA3XHU3QUQ5XHU3MEI5XHU4QkM2XHU1MjJCXHU0RTNBXHU3MjJDXHU4NjZCXHU4MDBDXHU5NjUwXHU5MDFGL1x1NUMwMVx1Nzk4MVx1MzAwMlwiLFxyXG4gICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30gfSxcclxuICB9LFxyXG4gIHtcclxuICAgIG5hbWU6IFwidmlzaW9uXCIsXHJcbiAgICBkZXNjcmlwdGlvbjogVklTSU9OX1RPT0xfREVTQ1JJUFRJT04sXHJcbiAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICB0eXBlOiBcIm9iamVjdFwiLFxyXG4gICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgZm9jdXM6IHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb246IFwiXHU1MTczXHU2Q0U4XHU3MEI5XHVGRjA4XHU1M0VGXHU5MDA5XHVGRjA5XHVGRjFBXHU1NDRBXHU4QkM5XHU1RjE1XHU2NENFXHU5MUNEXHU3MEI5XHU3NzBCXHU0RUMwXHU0RTQ4XHVGRjBDXHU1OTgyXHUyMDFDXHU5ODc1XHU5NzYyXHU0RTJEXHU5NUY0XHU3Njg0XHU1RjM5XHU3QTk3XHU2NTg3XHU2ODQ4XHU0RTBFXHU2MzA5XHU5NEFFXHU5ODlDXHU4MjcyXHUyMDFEXCIgfSxcclxuICAgICAgICBmdWxsUGFnZTogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVzY3JpcHRpb246IFwiXHU2NjJGXHU1NDI2XHU2NTc0XHU5ODc1XHU2MjJBXHU1NkZFXHVGRjA4XHU5RUQ4XHU4QkE0XHU0RUM1XHU4OUM2XHU1M0UzXHVGRjA5XCIgfSxcclxuICAgICAgICBzYXZlUGF0aDogeyB0eXBlOiBcInN0cmluZ1wiLCBkZXNjcmlwdGlvbjogXCJcdTUzRUZcdTkwMDlcdUZGMUFcdTYyMkFcdTU2RkUgUE5HIFx1NzY4NFx1N0VERFx1NUJGOVx1OERFRlx1NUY4NFx1RkYwOFx1OUVEOFx1OEJBNFx1N0NGQlx1N0VERlx1NEUzNFx1NjVGNlx1NzZFRVx1NUY1NVx1RkYwOVwiIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXTtcclxuXHJcbi8qKiBcdTVERTVcdTUxNzdcdThDMDNcdTc1MjhcdTdFRDNcdTY3OUNcdUZGMDhcdTUzNEZcdThCQUVcdTY1RTBcdTUxNzNcdTc2ODRcdTY4MDdcdTUxQzZcdTU0Q0RcdTVFOTRcdTdFRDNcdTY3ODRcdUZGMDkgKi9cclxuZXhwb3J0IGludGVyZmFjZSBUb29sUmVzdWx0IHtcclxuICAvKiogXHU2NjJGXHU1NDI2XHU2MjEwXHU1MjlGICovXHJcbiAgb2s6IGJvb2xlYW47XHJcbiAgLyoqIFx1NEY5QiBBSSBcdTk2MDVcdThCRkJcdTc2ODRcdTY1ODdcdTY3MkMgKi9cclxuICBjb250ZW50OiBBcnJheTx7IHR5cGU6IFwidGV4dFwiOyB0ZXh0OiBzdHJpbmcgfT47XHJcbiAgLyoqIFx1N0VEM1x1Njc4NFx1NTMxNlx1NjU3MFx1NjM2RVx1RkYwOFx1NTk4Mlx1NjIyQVx1NTZGRSBiYXNlNjRcdUZGMDkgKi9cclxuICBzdHJ1Y3R1cmVkPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcbiAgLyoqIFx1OTUxOVx1OEJFRlx1NEZFMVx1NjA2RiAqL1xyXG4gIGlzRXJyb3I/OiBib29sZWFuO1xyXG59XHJcblxyXG4vKiogXHU2MjhBXHU0RUZCXHU2MTBGXHU3RUQzXHU2NzlDXHU1MzA1XHU4OEM1XHU0RTNBXHU2ODA3XHU1MUM2IFRvb2xSZXN1bHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG9rUmVzdWx0KHRleHQ6IHN0cmluZywgc3RydWN0dXJlZD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogVG9vbFJlc3VsdCB7XHJcbiAgcmV0dXJuIHsgb2s6IHRydWUsIGNvbnRlbnQ6IFt7IHR5cGU6IFwidGV4dFwiLCB0ZXh0IH1dLCBzdHJ1Y3R1cmVkIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBlcnJSZXN1bHQodGV4dDogc3RyaW5nKTogVG9vbFJlc3VsdCB7XHJcbiAgcmV0dXJuIHsgb2s6IGZhbHNlLCBjb250ZW50OiBbeyB0eXBlOiBcInRleHRcIiwgdGV4dCB9XSwgaXNFcnJvcjogdHJ1ZSB9O1xyXG59XHJcbiIsICJleHBvcnQgKiBmcm9tIFwiLi9lcnJvcnMuanNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2hlbHBlcnMvcGFyc2VVdGlsLmpzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9oZWxwZXJzL3R5cGVBbGlhc2VzLmpzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9oZWxwZXJzL3V0aWwuanNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3R5cGVzLmpzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9ab2RFcnJvci5qc1wiO1xuIiwgImV4cG9ydCB2YXIgdXRpbDtcbihmdW5jdGlvbiAodXRpbCkge1xuICAgIHV0aWwuYXNzZXJ0RXF1YWwgPSAoXykgPT4geyB9O1xuICAgIGZ1bmN0aW9uIGFzc2VydElzKF9hcmcpIHsgfVxuICAgIHV0aWwuYXNzZXJ0SXMgPSBhc3NlcnRJcztcbiAgICBmdW5jdGlvbiBhc3NlcnROZXZlcihfeCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9XG4gICAgdXRpbC5hc3NlcnROZXZlciA9IGFzc2VydE5ldmVyO1xuICAgIHV0aWwuYXJyYXlUb0VudW0gPSAoaXRlbXMpID0+IHtcbiAgICAgICAgY29uc3Qgb2JqID0ge307XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgb2JqW2l0ZW1dID0gaXRlbTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gICAgdXRpbC5nZXRWYWxpZEVudW1WYWx1ZXMgPSAob2JqKSA9PiB7XG4gICAgICAgIGNvbnN0IHZhbGlkS2V5cyA9IHV0aWwub2JqZWN0S2V5cyhvYmopLmZpbHRlcigoaykgPT4gdHlwZW9mIG9ialtvYmpba11dICE9PSBcIm51bWJlclwiKTtcbiAgICAgICAgY29uc3QgZmlsdGVyZWQgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrIG9mIHZhbGlkS2V5cykge1xuICAgICAgICAgICAgZmlsdGVyZWRba10gPSBvYmpba107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV0aWwub2JqZWN0VmFsdWVzKGZpbHRlcmVkKTtcbiAgICB9O1xuICAgIHV0aWwub2JqZWN0VmFsdWVzID0gKG9iaikgPT4ge1xuICAgICAgICByZXR1cm4gdXRpbC5vYmplY3RLZXlzKG9iaikubWFwKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqW2VdO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHV0aWwub2JqZWN0S2V5cyA9IHR5cGVvZiBPYmplY3Qua2V5cyA9PT0gXCJmdW5jdGlvblwiIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgYmFuL2JhblxuICAgICAgICA/IChvYmopID0+IE9iamVjdC5rZXlzKG9iaikgLy8gZXNsaW50LWRpc2FibGUtbGluZSBiYW4vYmFuXG4gICAgICAgIDogKG9iamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5cyA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICAgIH07XG4gICAgdXRpbC5maW5kID0gKGFyciwgY2hlY2tlcikgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgYXJyKSB7XG4gICAgICAgICAgICBpZiAoY2hlY2tlcihpdGVtKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH07XG4gICAgdXRpbC5pc0ludGVnZXIgPSB0eXBlb2YgTnVtYmVyLmlzSW50ZWdlciA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgID8gKHZhbCkgPT4gTnVtYmVyLmlzSW50ZWdlcih2YWwpIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgYmFuL2JhblxuICAgICAgICA6ICh2YWwpID0+IHR5cGVvZiB2YWwgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKHZhbCkgJiYgTWF0aC5mbG9vcih2YWwpID09PSB2YWw7XG4gICAgZnVuY3Rpb24gam9pblZhbHVlcyhhcnJheSwgc2VwYXJhdG9yID0gXCIgfCBcIikge1xuICAgICAgICByZXR1cm4gYXJyYXkubWFwKCh2YWwpID0+ICh0eXBlb2YgdmFsID09PSBcInN0cmluZ1wiID8gYCcke3ZhbH0nYCA6IHZhbCkpLmpvaW4oc2VwYXJhdG9yKTtcbiAgICB9XG4gICAgdXRpbC5qb2luVmFsdWVzID0gam9pblZhbHVlcztcbiAgICB1dGlsLmpzb25TdHJpbmdpZnlSZXBsYWNlciA9IChfLCB2YWx1ZSkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcImJpZ2ludFwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbn0pKHV0aWwgfHwgKHV0aWwgPSB7fSkpO1xuZXhwb3J0IHZhciBvYmplY3RVdGlsO1xuKGZ1bmN0aW9uIChvYmplY3RVdGlsKSB7XG4gICAgb2JqZWN0VXRpbC5tZXJnZVNoYXBlcyA9IChmaXJzdCwgc2Vjb25kKSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAuLi5maXJzdCxcbiAgICAgICAgICAgIC4uLnNlY29uZCwgLy8gc2Vjb25kIG92ZXJ3cml0ZXMgZmlyc3RcbiAgICAgICAgfTtcbiAgICB9O1xufSkob2JqZWN0VXRpbCB8fCAob2JqZWN0VXRpbCA9IHt9KSk7XG5leHBvcnQgY29uc3QgWm9kUGFyc2VkVHlwZSA9IHV0aWwuYXJyYXlUb0VudW0oW1xuICAgIFwic3RyaW5nXCIsXG4gICAgXCJuYW5cIixcbiAgICBcIm51bWJlclwiLFxuICAgIFwiaW50ZWdlclwiLFxuICAgIFwiZmxvYXRcIixcbiAgICBcImJvb2xlYW5cIixcbiAgICBcImRhdGVcIixcbiAgICBcImJpZ2ludFwiLFxuICAgIFwic3ltYm9sXCIsXG4gICAgXCJmdW5jdGlvblwiLFxuICAgIFwidW5kZWZpbmVkXCIsXG4gICAgXCJudWxsXCIsXG4gICAgXCJhcnJheVwiLFxuICAgIFwib2JqZWN0XCIsXG4gICAgXCJ1bmtub3duXCIsXG4gICAgXCJwcm9taXNlXCIsXG4gICAgXCJ2b2lkXCIsXG4gICAgXCJuZXZlclwiLFxuICAgIFwibWFwXCIsXG4gICAgXCJzZXRcIixcbl0pO1xuZXhwb3J0IGNvbnN0IGdldFBhcnNlZFR5cGUgPSAoZGF0YSkgPT4ge1xuICAgIGNvbnN0IHQgPSB0eXBlb2YgZGF0YTtcbiAgICBzd2l0Y2ggKHQpIHtcbiAgICAgICAgY2FzZSBcInVuZGVmaW5lZFwiOlxuICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUudW5kZWZpbmVkO1xuICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5zdHJpbmc7XG4gICAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIuaXNOYU4oZGF0YSkgPyBab2RQYXJzZWRUeXBlLm5hbiA6IFpvZFBhcnNlZFR5cGUubnVtYmVyO1xuICAgICAgICBjYXNlIFwiYm9vbGVhblwiOlxuICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUuYm9vbGVhbjtcbiAgICAgICAgY2FzZSBcImZ1bmN0aW9uXCI6XG4gICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5mdW5jdGlvbjtcbiAgICAgICAgY2FzZSBcImJpZ2ludFwiOlxuICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUuYmlnaW50O1xuICAgICAgICBjYXNlIFwic3ltYm9sXCI6XG4gICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5zeW1ib2w7XG4gICAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUuYXJyYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBab2RQYXJzZWRUeXBlLm51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS50aGVuICYmIHR5cGVvZiBkYXRhLnRoZW4gPT09IFwiZnVuY3Rpb25cIiAmJiBkYXRhLmNhdGNoICYmIHR5cGVvZiBkYXRhLmNhdGNoID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5wcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBNYXAgIT09IFwidW5kZWZpbmVkXCIgJiYgZGF0YSBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBab2RQYXJzZWRUeXBlLm1hcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgU2V0ICE9PSBcInVuZGVmaW5lZFwiICYmIGRhdGEgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5zZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIERhdGUgIT09IFwidW5kZWZpbmVkXCIgJiYgZGF0YSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5kYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUub2JqZWN0O1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUudW5rbm93bjtcbiAgICB9XG59O1xuIiwgImltcG9ydCB7IHV0aWwgfSBmcm9tIFwiLi9oZWxwZXJzL3V0aWwuanNcIjtcbmV4cG9ydCBjb25zdCBab2RJc3N1ZUNvZGUgPSB1dGlsLmFycmF5VG9FbnVtKFtcbiAgICBcImludmFsaWRfdHlwZVwiLFxuICAgIFwiaW52YWxpZF9saXRlcmFsXCIsXG4gICAgXCJjdXN0b21cIixcbiAgICBcImludmFsaWRfdW5pb25cIixcbiAgICBcImludmFsaWRfdW5pb25fZGlzY3JpbWluYXRvclwiLFxuICAgIFwiaW52YWxpZF9lbnVtX3ZhbHVlXCIsXG4gICAgXCJ1bnJlY29nbml6ZWRfa2V5c1wiLFxuICAgIFwiaW52YWxpZF9hcmd1bWVudHNcIixcbiAgICBcImludmFsaWRfcmV0dXJuX3R5cGVcIixcbiAgICBcImludmFsaWRfZGF0ZVwiLFxuICAgIFwiaW52YWxpZF9zdHJpbmdcIixcbiAgICBcInRvb19zbWFsbFwiLFxuICAgIFwidG9vX2JpZ1wiLFxuICAgIFwiaW52YWxpZF9pbnRlcnNlY3Rpb25fdHlwZXNcIixcbiAgICBcIm5vdF9tdWx0aXBsZV9vZlwiLFxuICAgIFwibm90X2Zpbml0ZVwiLFxuXSk7XG5leHBvcnQgY29uc3QgcXVvdGVsZXNzSnNvbiA9IChvYmopID0+IHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5zdHJpbmdpZnkob2JqLCBudWxsLCAyKTtcbiAgICByZXR1cm4ganNvbi5yZXBsYWNlKC9cIihbXlwiXSspXCI6L2csIFwiJDE6XCIpO1xufTtcbmV4cG9ydCBjbGFzcyBab2RFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgICBnZXQgZXJyb3JzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pc3N1ZXM7XG4gICAgfVxuICAgIGNvbnN0cnVjdG9yKGlzc3Vlcykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmlzc3VlcyA9IFtdO1xuICAgICAgICB0aGlzLmFkZElzc3VlID0gKHN1YikgPT4ge1xuICAgICAgICAgICAgdGhpcy5pc3N1ZXMgPSBbLi4udGhpcy5pc3N1ZXMsIHN1Yl07XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuYWRkSXNzdWVzID0gKHN1YnMgPSBbXSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5pc3N1ZXMgPSBbLi4udGhpcy5pc3N1ZXMsIC4uLnN1YnNdO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBhY3R1YWxQcm90byA9IG5ldy50YXJnZXQucHJvdG90eXBlO1xuICAgICAgICBpZiAoT2JqZWN0LnNldFByb3RvdHlwZU9mKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgYmFuL2JhblxuICAgICAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsIGFjdHVhbFByb3RvKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX19wcm90b19fID0gYWN0dWFsUHJvdG87XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5uYW1lID0gXCJab2RFcnJvclwiO1xuICAgICAgICB0aGlzLmlzc3VlcyA9IGlzc3VlcztcbiAgICB9XG4gICAgZm9ybWF0KF9tYXBwZXIpIHtcbiAgICAgICAgY29uc3QgbWFwcGVyID0gX21hcHBlciB8fFxuICAgICAgICAgICAgZnVuY3Rpb24gKGlzc3VlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzc3VlLm1lc3NhZ2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICBjb25zdCBmaWVsZEVycm9ycyA9IHsgX2Vycm9yczogW10gfTtcbiAgICAgICAgY29uc3QgcHJvY2Vzc0Vycm9yID0gKGVycm9yKSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlzc3VlIG9mIGVycm9yLmlzc3Vlcykge1xuICAgICAgICAgICAgICAgIGlmIChpc3N1ZS5jb2RlID09PSBcImludmFsaWRfdW5pb25cIikge1xuICAgICAgICAgICAgICAgICAgICBpc3N1ZS51bmlvbkVycm9ycy5tYXAocHJvY2Vzc0Vycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoaXNzdWUuY29kZSA9PT0gXCJpbnZhbGlkX3JldHVybl90eXBlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc0Vycm9yKGlzc3VlLnJldHVyblR5cGVFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLmNvZGUgPT09IFwiaW52YWxpZF9hcmd1bWVudHNcIikge1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzRXJyb3IoaXNzdWUuYXJndW1lbnRzRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChpc3N1ZS5wYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBmaWVsZEVycm9ycy5fZXJyb3JzLnB1c2gobWFwcGVyKGlzc3VlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgY3VyciA9IGZpZWxkRXJyb3JzO1xuICAgICAgICAgICAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChpIDwgaXNzdWUucGF0aC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gaXNzdWUucGF0aFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlcm1pbmFsID0gaSA9PT0gaXNzdWUucGF0aC5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0ZXJtaW5hbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJbZWxdID0gY3VycltlbF0gfHwgeyBfZXJyb3JzOiBbXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmICh0eXBlb2YgZWwgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgIGN1cnJbZWxdID0gY3VycltlbF0gfHwgeyBfZXJyb3JzOiBbXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0gZWxzZSBpZiAodHlwZW9mIGVsID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICBjb25zdCBlcnJvckFycmF5OiBhbnkgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgIGVycm9yQXJyYXkuX2Vycm9ycyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgY3VycltlbF0gPSBjdXJyW2VsXSB8fCBlcnJvckFycmF5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJbZWxdID0gY3VycltlbF0gfHwgeyBfZXJyb3JzOiBbXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJbZWxdLl9lcnJvcnMucHVzaChtYXBwZXIoaXNzdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnIgPSBjdXJyW2VsXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcHJvY2Vzc0Vycm9yKHRoaXMpO1xuICAgICAgICByZXR1cm4gZmllbGRFcnJvcnM7XG4gICAgfVxuICAgIHN0YXRpYyBhc3NlcnQodmFsdWUpIHtcbiAgICAgICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBab2RFcnJvcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IGEgWm9kRXJyb3I6ICR7dmFsdWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2U7XG4gICAgfVxuICAgIGdldCBtZXNzYWdlKCkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5pc3N1ZXMsIHV0aWwuanNvblN0cmluZ2lmeVJlcGxhY2VyLCAyKTtcbiAgICB9XG4gICAgZ2V0IGlzRW1wdHkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzc3Vlcy5sZW5ndGggPT09IDA7XG4gICAgfVxuICAgIGZsYXR0ZW4obWFwcGVyID0gKGlzc3VlKSA9PiBpc3N1ZS5tZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGZpZWxkRXJyb3JzID0ge307XG4gICAgICAgIGNvbnN0IGZvcm1FcnJvcnMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzdWIgb2YgdGhpcy5pc3N1ZXMpIHtcbiAgICAgICAgICAgIGlmIChzdWIucGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlyc3RFbCA9IHN1Yi5wYXRoWzBdO1xuICAgICAgICAgICAgICAgIGZpZWxkRXJyb3JzW2ZpcnN0RWxdID0gZmllbGRFcnJvcnNbZmlyc3RFbF0gfHwgW107XG4gICAgICAgICAgICAgICAgZmllbGRFcnJvcnNbZmlyc3RFbF0ucHVzaChtYXBwZXIoc3ViKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3JtRXJyb3JzLnB1c2gobWFwcGVyKHN1YikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IGZvcm1FcnJvcnMsIGZpZWxkRXJyb3JzIH07XG4gICAgfVxuICAgIGdldCBmb3JtRXJyb3JzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mbGF0dGVuKCk7XG4gICAgfVxufVxuWm9kRXJyb3IuY3JlYXRlID0gKGlzc3VlcykgPT4ge1xuICAgIGNvbnN0IGVycm9yID0gbmV3IFpvZEVycm9yKGlzc3Vlcyk7XG4gICAgcmV0dXJuIGVycm9yO1xufTtcbiIsICJpbXBvcnQgeyBab2RJc3N1ZUNvZGUgfSBmcm9tIFwiLi4vWm9kRXJyb3IuanNcIjtcbmltcG9ydCB7IHV0aWwsIFpvZFBhcnNlZFR5cGUgfSBmcm9tIFwiLi4vaGVscGVycy91dGlsLmpzXCI7XG5jb25zdCBlcnJvck1hcCA9IChpc3N1ZSwgX2N0eCkgPT4ge1xuICAgIGxldCBtZXNzYWdlO1xuICAgIHN3aXRjaCAoaXNzdWUuY29kZSkge1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGU6XG4gICAgICAgICAgICBpZiAoaXNzdWUucmVjZWl2ZWQgPT09IFpvZFBhcnNlZFR5cGUudW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiUmVxdWlyZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgRXhwZWN0ZWQgJHtpc3N1ZS5leHBlY3RlZH0sIHJlY2VpdmVkICR7aXNzdWUucmVjZWl2ZWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX2xpdGVyYWw6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludmFsaWQgbGl0ZXJhbCB2YWx1ZSwgZXhwZWN0ZWQgJHtKU09OLnN0cmluZ2lmeShpc3N1ZS5leHBlY3RlZCwgdXRpbC5qc29uU3RyaW5naWZ5UmVwbGFjZXIpfWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUudW5yZWNvZ25pemVkX2tleXM6XG4gICAgICAgICAgICBtZXNzYWdlID0gYFVucmVjb2duaXplZCBrZXkocykgaW4gb2JqZWN0OiAke3V0aWwuam9pblZhbHVlcyhpc3N1ZS5rZXlzLCBcIiwgXCIpfWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF91bmlvbjpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCBpbnB1dGA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF91bmlvbl9kaXNjcmltaW5hdG9yOlxuICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGRpc2NyaW1pbmF0b3IgdmFsdWUuIEV4cGVjdGVkICR7dXRpbC5qb2luVmFsdWVzKGlzc3VlLm9wdGlvbnMpfWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9lbnVtX3ZhbHVlOlxuICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGVudW0gdmFsdWUuIEV4cGVjdGVkICR7dXRpbC5qb2luVmFsdWVzKGlzc3VlLm9wdGlvbnMpfSwgcmVjZWl2ZWQgJyR7aXNzdWUucmVjZWl2ZWR9J2A7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9hcmd1bWVudHM6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludmFsaWQgZnVuY3Rpb24gYXJndW1lbnRzYDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX3JldHVybl90eXBlOlxuICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGZ1bmN0aW9uIHJldHVybiB0eXBlYDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX2RhdGU6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludmFsaWQgZGF0ZWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmc6XG4gICAgICAgICAgICBpZiAodHlwZW9mIGlzc3VlLnZhbGlkYXRpb24gPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoXCJpbmNsdWRlc1wiIGluIGlzc3VlLnZhbGlkYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGlucHV0OiBtdXN0IGluY2x1ZGUgXCIke2lzc3VlLnZhbGlkYXRpb24uaW5jbHVkZXN9XCJgO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlzc3VlLnZhbGlkYXRpb24ucG9zaXRpb24gPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgJHttZXNzYWdlfSBhdCBvbmUgb3IgbW9yZSBwb3NpdGlvbnMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvICR7aXNzdWUudmFsaWRhdGlvbi5wb3NpdGlvbn1gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKFwic3RhcnRzV2l0aFwiIGluIGlzc3VlLnZhbGlkYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGlucHV0OiBtdXN0IHN0YXJ0IHdpdGggXCIke2lzc3VlLnZhbGlkYXRpb24uc3RhcnRzV2l0aH1cImA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKFwiZW5kc1dpdGhcIiBpbiBpc3N1ZS52YWxpZGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCBpbnB1dDogbXVzdCBlbmQgd2l0aCBcIiR7aXNzdWUudmFsaWRhdGlvbi5lbmRzV2l0aH1cImA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB1dGlsLmFzc2VydE5ldmVyKGlzc3VlLnZhbGlkYXRpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnZhbGlkYXRpb24gIT09IFwicmVnZXhcIikge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCAke2lzc3VlLnZhbGlkYXRpb259YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIkludmFsaWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS50b29fc21hbGw6XG4gICAgICAgICAgICBpZiAoaXNzdWUudHlwZSA9PT0gXCJhcnJheVwiKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgQXJyYXkgbXVzdCBjb250YWluICR7aXNzdWUuZXhhY3QgPyBcImV4YWN0bHlcIiA6IGlzc3VlLmluY2x1c2l2ZSA/IGBhdCBsZWFzdGAgOiBgbW9yZSB0aGFuYH0gJHtpc3N1ZS5taW5pbXVtfSBlbGVtZW50KHMpYDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBTdHJpbmcgbXVzdCBjb250YWluICR7aXNzdWUuZXhhY3QgPyBcImV4YWN0bHlcIiA6IGlzc3VlLmluY2x1c2l2ZSA/IGBhdCBsZWFzdGAgOiBgb3ZlcmB9ICR7aXNzdWUubWluaW11bX0gY2hhcmFjdGVyKHMpYDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBOdW1iZXIgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHkgZXF1YWwgdG8gYCA6IGlzc3VlLmluY2x1c2l2ZSA/IGBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gYCA6IGBncmVhdGVyIHRoYW4gYH0ke2lzc3VlLm1pbmltdW19YDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwiYmlnaW50XCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBOdW1iZXIgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHkgZXF1YWwgdG8gYCA6IGlzc3VlLmluY2x1c2l2ZSA/IGBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gYCA6IGBncmVhdGVyIHRoYW4gYH0ke2lzc3VlLm1pbmltdW19YDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwiZGF0ZVwiKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgRGF0ZSBtdXN0IGJlICR7aXNzdWUuZXhhY3QgPyBgZXhhY3RseSBlcXVhbCB0byBgIDogaXNzdWUuaW5jbHVzaXZlID8gYGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byBgIDogYGdyZWF0ZXIgdGhhbiBgfSR7bmV3IERhdGUoTnVtYmVyKGlzc3VlLm1pbmltdW0pKX1gO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIkludmFsaWQgaW5wdXRcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS50b29fYmlnOlxuICAgICAgICAgICAgaWYgKGlzc3VlLnR5cGUgPT09IFwiYXJyYXlcIilcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYEFycmF5IG11c3QgY29udGFpbiAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYGF0IG1vc3RgIDogYGxlc3MgdGhhbmB9ICR7aXNzdWUubWF4aW11bX0gZWxlbWVudChzKWA7XG4gICAgICAgICAgICBlbHNlIGlmIChpc3N1ZS50eXBlID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgU3RyaW5nIG11c3QgY29udGFpbiAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYGF0IG1vc3RgIDogYHVuZGVyYH0gJHtpc3N1ZS5tYXhpbXVtfSBjaGFyYWN0ZXIocylgO1xuICAgICAgICAgICAgZWxzZSBpZiAoaXNzdWUudHlwZSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYE51bWJlciBtdXN0IGJlICR7aXNzdWUuZXhhY3QgPyBgZXhhY3RseWAgOiBpc3N1ZS5pbmNsdXNpdmUgPyBgbGVzcyB0aGFuIG9yIGVxdWFsIHRvYCA6IGBsZXNzIHRoYW5gfSAke2lzc3VlLm1heGltdW19YDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwiYmlnaW50XCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBCaWdJbnQgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYGxlc3MgdGhhbiBvciBlcXVhbCB0b2AgOiBgbGVzcyB0aGFuYH0gJHtpc3N1ZS5tYXhpbXVtfWA7XG4gICAgICAgICAgICBlbHNlIGlmIChpc3N1ZS50eXBlID09PSBcImRhdGVcIilcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYERhdGUgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYHNtYWxsZXIgdGhhbiBvciBlcXVhbCB0b2AgOiBgc21hbGxlciB0aGFuYH0gJHtuZXcgRGF0ZShOdW1iZXIoaXNzdWUubWF4aW11bSkpfWA7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiSW52YWxpZCBpbnB1dFwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgWm9kSXNzdWVDb2RlLmN1c3RvbTpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCBpbnB1dGA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9pbnRlcnNlY3Rpb25fdHlwZXM6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludGVyc2VjdGlvbiByZXN1bHRzIGNvdWxkIG5vdCBiZSBtZXJnZWRgO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgWm9kSXNzdWVDb2RlLm5vdF9tdWx0aXBsZV9vZjpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgTnVtYmVyIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAke2lzc3VlLm11bHRpcGxlT2Z9YDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5ub3RfZmluaXRlOlxuICAgICAgICAgICAgbWVzc2FnZSA9IFwiTnVtYmVyIG11c3QgYmUgZmluaXRlXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBfY3R4LmRlZmF1bHRFcnJvcjtcbiAgICAgICAgICAgIHV0aWwuYXNzZXJ0TmV2ZXIoaXNzdWUpO1xuICAgIH1cbiAgICByZXR1cm4geyBtZXNzYWdlIH07XG59O1xuZXhwb3J0IGRlZmF1bHQgZXJyb3JNYXA7XG4iLCAiaW1wb3J0IGRlZmF1bHRFcnJvck1hcCBmcm9tIFwiLi9sb2NhbGVzL2VuLmpzXCI7XG5sZXQgb3ZlcnJpZGVFcnJvck1hcCA9IGRlZmF1bHRFcnJvck1hcDtcbmV4cG9ydCB7IGRlZmF1bHRFcnJvck1hcCB9O1xuZXhwb3J0IGZ1bmN0aW9uIHNldEVycm9yTWFwKG1hcCkge1xuICAgIG92ZXJyaWRlRXJyb3JNYXAgPSBtYXA7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0RXJyb3JNYXAoKSB7XG4gICAgcmV0dXJuIG92ZXJyaWRlRXJyb3JNYXA7XG59XG4iLCAiaW1wb3J0IHsgZ2V0RXJyb3JNYXAgfSBmcm9tIFwiLi4vZXJyb3JzLmpzXCI7XG5pbXBvcnQgZGVmYXVsdEVycm9yTWFwIGZyb20gXCIuLi9sb2NhbGVzL2VuLmpzXCI7XG5leHBvcnQgY29uc3QgbWFrZUlzc3VlID0gKHBhcmFtcykgPT4ge1xuICAgIGNvbnN0IHsgZGF0YSwgcGF0aCwgZXJyb3JNYXBzLCBpc3N1ZURhdGEgfSA9IHBhcmFtcztcbiAgICBjb25zdCBmdWxsUGF0aCA9IFsuLi5wYXRoLCAuLi4oaXNzdWVEYXRhLnBhdGggfHwgW10pXTtcbiAgICBjb25zdCBmdWxsSXNzdWUgPSB7XG4gICAgICAgIC4uLmlzc3VlRGF0YSxcbiAgICAgICAgcGF0aDogZnVsbFBhdGgsXG4gICAgfTtcbiAgICBpZiAoaXNzdWVEYXRhLm1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uaXNzdWVEYXRhLFxuICAgICAgICAgICAgcGF0aDogZnVsbFBhdGgsXG4gICAgICAgICAgICBtZXNzYWdlOiBpc3N1ZURhdGEubWVzc2FnZSxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgbGV0IGVycm9yTWVzc2FnZSA9IFwiXCI7XG4gICAgY29uc3QgbWFwcyA9IGVycm9yTWFwc1xuICAgICAgICAuZmlsdGVyKChtKSA9PiAhIW0pXG4gICAgICAgIC5zbGljZSgpXG4gICAgICAgIC5yZXZlcnNlKCk7XG4gICAgZm9yIChjb25zdCBtYXAgb2YgbWFwcykge1xuICAgICAgICBlcnJvck1lc3NhZ2UgPSBtYXAoZnVsbElzc3VlLCB7IGRhdGEsIGRlZmF1bHRFcnJvcjogZXJyb3JNZXNzYWdlIH0pLm1lc3NhZ2U7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIC4uLmlzc3VlRGF0YSxcbiAgICAgICAgcGF0aDogZnVsbFBhdGgsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yTWVzc2FnZSxcbiAgICB9O1xufTtcbmV4cG9ydCBjb25zdCBFTVBUWV9QQVRIID0gW107XG5leHBvcnQgZnVuY3Rpb24gYWRkSXNzdWVUb0NvbnRleHQoY3R4LCBpc3N1ZURhdGEpIHtcbiAgICBjb25zdCBvdmVycmlkZU1hcCA9IGdldEVycm9yTWFwKCk7XG4gICAgY29uc3QgaXNzdWUgPSBtYWtlSXNzdWUoe1xuICAgICAgICBpc3N1ZURhdGE6IGlzc3VlRGF0YSxcbiAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICBlcnJvck1hcHM6IFtcbiAgICAgICAgICAgIGN0eC5jb21tb24uY29udGV4dHVhbEVycm9yTWFwLCAvLyBjb250ZXh0dWFsIGVycm9yIG1hcCBpcyBmaXJzdCBwcmlvcml0eVxuICAgICAgICAgICAgY3R4LnNjaGVtYUVycm9yTWFwLCAvLyB0aGVuIHNjaGVtYS1ib3VuZCBtYXAgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBvdmVycmlkZU1hcCwgLy8gdGhlbiBnbG9iYWwgb3ZlcnJpZGUgbWFwXG4gICAgICAgICAgICBvdmVycmlkZU1hcCA9PT0gZGVmYXVsdEVycm9yTWFwID8gdW5kZWZpbmVkIDogZGVmYXVsdEVycm9yTWFwLCAvLyB0aGVuIGdsb2JhbCBkZWZhdWx0IG1hcFxuICAgICAgICBdLmZpbHRlcigoeCkgPT4gISF4KSxcbiAgICB9KTtcbiAgICBjdHguY29tbW9uLmlzc3Vlcy5wdXNoKGlzc3VlKTtcbn1cbmV4cG9ydCBjbGFzcyBQYXJzZVN0YXR1cyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSBcInZhbGlkXCI7XG4gICAgfVxuICAgIGRpcnR5KCkge1xuICAgICAgICBpZiAodGhpcy52YWx1ZSA9PT0gXCJ2YWxpZFwiKVxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IFwiZGlydHlcIjtcbiAgICB9XG4gICAgYWJvcnQoKSB7XG4gICAgICAgIGlmICh0aGlzLnZhbHVlICE9PSBcImFib3J0ZWRcIilcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBcImFib3J0ZWRcIjtcbiAgICB9XG4gICAgc3RhdGljIG1lcmdlQXJyYXkoc3RhdHVzLCByZXN1bHRzKSB7XG4gICAgICAgIGNvbnN0IGFycmF5VmFsdWUgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIGlmIChzLnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICBpZiAocy5zdGF0dXMgPT09IFwiZGlydHlcIilcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgIGFycmF5VmFsdWUucHVzaChzLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGFycmF5VmFsdWUgfTtcbiAgICB9XG4gICAgc3RhdGljIGFzeW5jIG1lcmdlT2JqZWN0QXN5bmMoc3RhdHVzLCBwYWlycykge1xuICAgICAgICBjb25zdCBzeW5jUGFpcnMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBwYWlyIG9mIHBhaXJzKSB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBhd2FpdCBwYWlyLmtleTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgcGFpci52YWx1ZTtcbiAgICAgICAgICAgIHN5bmNQYWlycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBrZXksXG4gICAgICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUGFyc2VTdGF0dXMubWVyZ2VPYmplY3RTeW5jKHN0YXR1cywgc3luY1BhaXJzKTtcbiAgICB9XG4gICAgc3RhdGljIG1lcmdlT2JqZWN0U3luYyhzdGF0dXMsIHBhaXJzKSB7XG4gICAgICAgIGNvbnN0IGZpbmFsT2JqZWN0ID0ge307XG4gICAgICAgIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgICAgICAgICAgY29uc3QgeyBrZXksIHZhbHVlIH0gPSBwYWlyO1xuICAgICAgICAgICAgaWYgKGtleS5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgaWYgKHZhbHVlLnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXR1cyA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgaWYgKHZhbHVlLnN0YXR1cyA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgaWYgKGtleS52YWx1ZSAhPT0gXCJfX3Byb3RvX19cIiAmJiAodHlwZW9mIHZhbHVlLnZhbHVlICE9PSBcInVuZGVmaW5lZFwiIHx8IHBhaXIuYWx3YXlzU2V0KSkge1xuICAgICAgICAgICAgICAgIGZpbmFsT2JqZWN0W2tleS52YWx1ZV0gPSB2YWx1ZS52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGZpbmFsT2JqZWN0IH07XG4gICAgfVxufVxuZXhwb3J0IGNvbnN0IElOVkFMSUQgPSBPYmplY3QuZnJlZXplKHtcbiAgICBzdGF0dXM6IFwiYWJvcnRlZFwiLFxufSk7XG5leHBvcnQgY29uc3QgRElSVFkgPSAodmFsdWUpID0+ICh7IHN0YXR1czogXCJkaXJ0eVwiLCB2YWx1ZSB9KTtcbmV4cG9ydCBjb25zdCBPSyA9ICh2YWx1ZSkgPT4gKHsgc3RhdHVzOiBcInZhbGlkXCIsIHZhbHVlIH0pO1xuZXhwb3J0IGNvbnN0IGlzQWJvcnRlZCA9ICh4KSA9PiB4LnN0YXR1cyA9PT0gXCJhYm9ydGVkXCI7XG5leHBvcnQgY29uc3QgaXNEaXJ0eSA9ICh4KSA9PiB4LnN0YXR1cyA9PT0gXCJkaXJ0eVwiO1xuZXhwb3J0IGNvbnN0IGlzVmFsaWQgPSAoeCkgPT4geC5zdGF0dXMgPT09IFwidmFsaWRcIjtcbmV4cG9ydCBjb25zdCBpc0FzeW5jID0gKHgpID0+IHR5cGVvZiBQcm9taXNlICE9PSBcInVuZGVmaW5lZFwiICYmIHggaW5zdGFuY2VvZiBQcm9taXNlO1xuIiwgImV4cG9ydCB2YXIgZXJyb3JVdGlsO1xuKGZ1bmN0aW9uIChlcnJvclV0aWwpIHtcbiAgICBlcnJvclV0aWwuZXJyVG9PYmogPSAobWVzc2FnZSkgPT4gdHlwZW9mIG1lc3NhZ2UgPT09IFwic3RyaW5nXCIgPyB7IG1lc3NhZ2UgfSA6IG1lc3NhZ2UgfHwge307XG4gICAgLy8gYmlvbWUtaWdub3JlIGxpbnQ6XG4gICAgZXJyb3JVdGlsLnRvU3RyaW5nID0gKG1lc3NhZ2UpID0+IHR5cGVvZiBtZXNzYWdlID09PSBcInN0cmluZ1wiID8gbWVzc2FnZSA6IG1lc3NhZ2U/Lm1lc3NhZ2U7XG59KShlcnJvclV0aWwgfHwgKGVycm9yVXRpbCA9IHt9KSk7XG4iLCAiaW1wb3J0IHsgWm9kRXJyb3IsIFpvZElzc3VlQ29kZSwgfSBmcm9tIFwiLi9ab2RFcnJvci5qc1wiO1xuaW1wb3J0IHsgZGVmYXVsdEVycm9yTWFwLCBnZXRFcnJvck1hcCB9IGZyb20gXCIuL2Vycm9ycy5qc1wiO1xuaW1wb3J0IHsgZXJyb3JVdGlsIH0gZnJvbSBcIi4vaGVscGVycy9lcnJvclV0aWwuanNcIjtcbmltcG9ydCB7IERJUlRZLCBJTlZBTElELCBPSywgUGFyc2VTdGF0dXMsIGFkZElzc3VlVG9Db250ZXh0LCBpc0Fib3J0ZWQsIGlzQXN5bmMsIGlzRGlydHksIGlzVmFsaWQsIG1ha2VJc3N1ZSwgfSBmcm9tIFwiLi9oZWxwZXJzL3BhcnNlVXRpbC5qc1wiO1xuaW1wb3J0IHsgdXRpbCwgWm9kUGFyc2VkVHlwZSwgZ2V0UGFyc2VkVHlwZSB9IGZyb20gXCIuL2hlbHBlcnMvdXRpbC5qc1wiO1xuY2xhc3MgUGFyc2VJbnB1dExhenlQYXRoIHtcbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQsIHZhbHVlLCBwYXRoLCBrZXkpIHtcbiAgICAgICAgdGhpcy5fY2FjaGVkUGF0aCA9IFtdO1xuICAgICAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICAgICAgdGhpcy5kYXRhID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX3BhdGggPSBwYXRoO1xuICAgICAgICB0aGlzLl9rZXkgPSBrZXk7XG4gICAgfVxuICAgIGdldCBwYXRoKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2NhY2hlZFBhdGgubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLl9rZXkpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2FjaGVkUGF0aC5wdXNoKC4uLnRoaXMuX3BhdGgsIC4uLnRoaXMuX2tleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWNoZWRQYXRoLnB1c2goLi4udGhpcy5fcGF0aCwgdGhpcy5fa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGVkUGF0aDtcbiAgICB9XG59XG5jb25zdCBoYW5kbGVSZXN1bHQgPSAoY3R4LCByZXN1bHQpID0+IHtcbiAgICBpZiAoaXNWYWxpZChyZXN1bHQpKSB7XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdC52YWx1ZSB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKCFjdHguY29tbW9uLmlzc3Vlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZhbGlkYXRpb24gZmFpbGVkIGJ1dCBubyBpc3N1ZXMgZGV0ZWN0ZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIGdldCBlcnJvcigpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9lcnJvcjtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBab2RFcnJvcihjdHguY29tbW9uLmlzc3Vlcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZXJyb3I7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cbn07XG5mdW5jdGlvbiBwcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcykge1xuICAgIGlmICghcGFyYW1zKVxuICAgICAgICByZXR1cm4ge307XG4gICAgY29uc3QgeyBlcnJvck1hcCwgaW52YWxpZF90eXBlX2Vycm9yLCByZXF1aXJlZF9lcnJvciwgZGVzY3JpcHRpb24gfSA9IHBhcmFtcztcbiAgICBpZiAoZXJyb3JNYXAgJiYgKGludmFsaWRfdHlwZV9lcnJvciB8fCByZXF1aXJlZF9lcnJvcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCB1c2UgXCJpbnZhbGlkX3R5cGVfZXJyb3JcIiBvciBcInJlcXVpcmVkX2Vycm9yXCIgaW4gY29uanVuY3Rpb24gd2l0aCBjdXN0b20gZXJyb3IgbWFwLmApO1xuICAgIH1cbiAgICBpZiAoZXJyb3JNYXApXG4gICAgICAgIHJldHVybiB7IGVycm9yTWFwOiBlcnJvck1hcCwgZGVzY3JpcHRpb24gfTtcbiAgICBjb25zdCBjdXN0b21NYXAgPSAoaXNzLCBjdHgpID0+IHtcbiAgICAgICAgY29uc3QgeyBtZXNzYWdlIH0gPSBwYXJhbXM7XG4gICAgICAgIGlmIChpc3MuY29kZSA9PT0gXCJpbnZhbGlkX2VudW1fdmFsdWVcIikge1xuICAgICAgICAgICAgcmV0dXJuIHsgbWVzc2FnZTogbWVzc2FnZSA/PyBjdHguZGVmYXVsdEVycm9yIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBjdHguZGF0YSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgcmV0dXJuIHsgbWVzc2FnZTogbWVzc2FnZSA/PyByZXF1aXJlZF9lcnJvciA/PyBjdHguZGVmYXVsdEVycm9yIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzcy5jb2RlICE9PSBcImludmFsaWRfdHlwZVwiKVxuICAgICAgICAgICAgcmV0dXJuIHsgbWVzc2FnZTogY3R4LmRlZmF1bHRFcnJvciB9O1xuICAgICAgICByZXR1cm4geyBtZXNzYWdlOiBtZXNzYWdlID8/IGludmFsaWRfdHlwZV9lcnJvciA/PyBjdHguZGVmYXVsdEVycm9yIH07XG4gICAgfTtcbiAgICByZXR1cm4geyBlcnJvck1hcDogY3VzdG9tTWFwLCBkZXNjcmlwdGlvbiB9O1xufVxuZXhwb3J0IGNsYXNzIFpvZFR5cGUge1xuICAgIGdldCBkZXNjcmlwdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5kZXNjcmlwdGlvbjtcbiAgICB9XG4gICAgX2dldFR5cGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIGdldFBhcnNlZFR5cGUoaW5wdXQuZGF0YSk7XG4gICAgfVxuICAgIF9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KSB7XG4gICAgICAgIHJldHVybiAoY3R4IHx8IHtcbiAgICAgICAgICAgIGNvbW1vbjogaW5wdXQucGFyZW50LmNvbW1vbixcbiAgICAgICAgICAgIGRhdGE6IGlucHV0LmRhdGEsXG4gICAgICAgICAgICBwYXJzZWRUeXBlOiBnZXRQYXJzZWRUeXBlKGlucHV0LmRhdGEpLFxuICAgICAgICAgICAgc2NoZW1hRXJyb3JNYXA6IHRoaXMuX2RlZi5lcnJvck1hcCxcbiAgICAgICAgICAgIHBhdGg6IGlucHV0LnBhdGgsXG4gICAgICAgICAgICBwYXJlbnQ6IGlucHV0LnBhcmVudCxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIF9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXR1czogbmV3IFBhcnNlU3RhdHVzKCksXG4gICAgICAgICAgICBjdHg6IHtcbiAgICAgICAgICAgICAgICBjb21tb246IGlucHV0LnBhcmVudC5jb21tb24sXG4gICAgICAgICAgICAgICAgZGF0YTogaW5wdXQuZGF0YSxcbiAgICAgICAgICAgICAgICBwYXJzZWRUeXBlOiBnZXRQYXJzZWRUeXBlKGlucHV0LmRhdGEpLFxuICAgICAgICAgICAgICAgIHNjaGVtYUVycm9yTWFwOiB0aGlzLl9kZWYuZXJyb3JNYXAsXG4gICAgICAgICAgICAgICAgcGF0aDogaW5wdXQucGF0aCxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGlucHV0LnBhcmVudCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuICAgIF9wYXJzZVN5bmMoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fcGFyc2UoaW5wdXQpO1xuICAgICAgICBpZiAoaXNBc3luYyhyZXN1bHQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTeW5jaHJvbm91cyBwYXJzZSBlbmNvdW50ZXJlZCBwcm9taXNlLlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBfcGFyc2VBc3luYyhpbnB1dCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9wYXJzZShpbnB1dCk7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzdWx0KTtcbiAgICB9XG4gICAgcGFyc2UoZGF0YSwgcGFyYW1zKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuc2FmZVBhcnNlKGRhdGEsIHBhcmFtcyk7XG4gICAgICAgIGlmIChyZXN1bHQuc3VjY2VzcylcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQuZGF0YTtcbiAgICAgICAgdGhyb3cgcmVzdWx0LmVycm9yO1xuICAgIH1cbiAgICBzYWZlUGFyc2UoZGF0YSwgcGFyYW1zKSB7XG4gICAgICAgIGNvbnN0IGN0eCA9IHtcbiAgICAgICAgICAgIGNvbW1vbjoge1xuICAgICAgICAgICAgICAgIGlzc3VlczogW10sXG4gICAgICAgICAgICAgICAgYXN5bmM6IHBhcmFtcz8uYXN5bmMgPz8gZmFsc2UsXG4gICAgICAgICAgICAgICAgY29udGV4dHVhbEVycm9yTWFwOiBwYXJhbXM/LmVycm9yTWFwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhdGg6IHBhcmFtcz8ucGF0aCB8fCBbXSxcbiAgICAgICAgICAgIHNjaGVtYUVycm9yTWFwOiB0aGlzLl9kZWYuZXJyb3JNYXAsXG4gICAgICAgICAgICBwYXJlbnQ6IG51bGwsXG4gICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgcGFyc2VkVHlwZTogZ2V0UGFyc2VkVHlwZShkYXRhKSxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fcGFyc2VTeW5jKHsgZGF0YSwgcGF0aDogY3R4LnBhdGgsIHBhcmVudDogY3R4IH0pO1xuICAgICAgICByZXR1cm4gaGFuZGxlUmVzdWx0KGN0eCwgcmVzdWx0KTtcbiAgICB9XG4gICAgXCJ+dmFsaWRhdGVcIihkYXRhKSB7XG4gICAgICAgIGNvbnN0IGN0eCA9IHtcbiAgICAgICAgICAgIGNvbW1vbjoge1xuICAgICAgICAgICAgICAgIGlzc3VlczogW10sXG4gICAgICAgICAgICAgICAgYXN5bmM6ICEhdGhpc1tcIn5zdGFuZGFyZFwiXS5hc3luYyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYXRoOiBbXSxcbiAgICAgICAgICAgIHNjaGVtYUVycm9yTWFwOiB0aGlzLl9kZWYuZXJyb3JNYXAsXG4gICAgICAgICAgICBwYXJlbnQ6IG51bGwsXG4gICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgcGFyc2VkVHlwZTogZ2V0UGFyc2VkVHlwZShkYXRhKSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCF0aGlzW1wifnN0YW5kYXJkXCJdLmFzeW5jKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX3BhcnNlU3luYyh7IGRhdGEsIHBhdGg6IFtdLCBwYXJlbnQ6IGN0eCB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNWYWxpZChyZXN1bHQpXG4gICAgICAgICAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHJlc3VsdC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzc3VlczogY3R4LmNvbW1vbi5pc3N1ZXMsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycj8ubWVzc2FnZT8udG9Mb3dlckNhc2UoKT8uaW5jbHVkZXMoXCJlbmNvdW50ZXJlZFwiKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW1wifnN0YW5kYXJkXCJdLmFzeW5jID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3R4LmNvbW1vbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgaXNzdWVzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcGFyc2VBc3luYyh7IGRhdGEsIHBhdGg6IFtdLCBwYXJlbnQ6IGN0eCB9KS50aGVuKChyZXN1bHQpID0+IGlzVmFsaWQocmVzdWx0KVxuICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IHJlc3VsdC52YWx1ZSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgIGlzc3VlczogY3R4LmNvbW1vbi5pc3N1ZXMsXG4gICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgYXN5bmMgcGFyc2VBc3luYyhkYXRhLCBwYXJhbXMpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zYWZlUGFyc2VBc3luYyhkYXRhLCBwYXJhbXMpO1xuICAgICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0LmRhdGE7XG4gICAgICAgIHRocm93IHJlc3VsdC5lcnJvcjtcbiAgICB9XG4gICAgYXN5bmMgc2FmZVBhcnNlQXN5bmMoZGF0YSwgcGFyYW1zKSB7XG4gICAgICAgIGNvbnN0IGN0eCA9IHtcbiAgICAgICAgICAgIGNvbW1vbjoge1xuICAgICAgICAgICAgICAgIGlzc3VlczogW10sXG4gICAgICAgICAgICAgICAgY29udGV4dHVhbEVycm9yTWFwOiBwYXJhbXM/LmVycm9yTWFwLFxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhdGg6IHBhcmFtcz8ucGF0aCB8fCBbXSxcbiAgICAgICAgICAgIHNjaGVtYUVycm9yTWFwOiB0aGlzLl9kZWYuZXJyb3JNYXAsXG4gICAgICAgICAgICBwYXJlbnQ6IG51bGwsXG4gICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgcGFyc2VkVHlwZTogZ2V0UGFyc2VkVHlwZShkYXRhKSxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgbWF5YmVBc3luY1Jlc3VsdCA9IHRoaXMuX3BhcnNlKHsgZGF0YSwgcGF0aDogY3R4LnBhdGgsIHBhcmVudDogY3R4IH0pO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCAoaXNBc3luYyhtYXliZUFzeW5jUmVzdWx0KSA/IG1heWJlQXN5bmNSZXN1bHQgOiBQcm9taXNlLnJlc29sdmUobWF5YmVBc3luY1Jlc3VsdCkpO1xuICAgICAgICByZXR1cm4gaGFuZGxlUmVzdWx0KGN0eCwgcmVzdWx0KTtcbiAgICB9XG4gICAgcmVmaW5lKGNoZWNrLCBtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGdldElzc3VlUHJvcGVydGllcyA9ICh2YWwpID0+IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgbWVzc2FnZSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG1lc3NhZ2UgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBtZXNzYWdlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZSh2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWZpbmVtZW50KCh2YWwsIGN0eCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gY2hlY2sodmFsKTtcbiAgICAgICAgICAgIGNvbnN0IHNldEVycm9yID0gKCkgPT4gY3R4LmFkZElzc3VlKHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuY3VzdG9tLFxuICAgICAgICAgICAgICAgIC4uLmdldElzc3VlUHJvcGVydGllcyh2YWwpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIFByb21pc2UgIT09IFwidW5kZWZpbmVkXCIgJiYgcmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldEVycm9yKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBzZXRFcnJvcigpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVmaW5lbWVudChjaGVjaywgcmVmaW5lbWVudERhdGEpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlZmluZW1lbnQoKHZhbCwgY3R4KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWNoZWNrKHZhbCkpIHtcbiAgICAgICAgICAgICAgICBjdHguYWRkSXNzdWUodHlwZW9mIHJlZmluZW1lbnREYXRhID09PSBcImZ1bmN0aW9uXCIgPyByZWZpbmVtZW50RGF0YSh2YWwsIGN0eCkgOiByZWZpbmVtZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBfcmVmaW5lbWVudChyZWZpbmVtZW50KSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kRWZmZWN0cyh7XG4gICAgICAgICAgICBzY2hlbWE6IHRoaXMsXG4gICAgICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEVmZmVjdHMsXG4gICAgICAgICAgICBlZmZlY3Q6IHsgdHlwZTogXCJyZWZpbmVtZW50XCIsIHJlZmluZW1lbnQgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHN1cGVyUmVmaW5lKHJlZmluZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlZmluZW1lbnQocmVmaW5lbWVudCk7XG4gICAgfVxuICAgIGNvbnN0cnVjdG9yKGRlZikge1xuICAgICAgICAvKiogQWxpYXMgb2Ygc2FmZVBhcnNlQXN5bmMgKi9cbiAgICAgICAgdGhpcy5zcGEgPSB0aGlzLnNhZmVQYXJzZUFzeW5jO1xuICAgICAgICB0aGlzLl9kZWYgPSBkZWY7XG4gICAgICAgIHRoaXMucGFyc2UgPSB0aGlzLnBhcnNlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuc2FmZVBhcnNlID0gdGhpcy5zYWZlUGFyc2UuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5wYXJzZUFzeW5jID0gdGhpcy5wYXJzZUFzeW5jLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuc2FmZVBhcnNlQXN5bmMgPSB0aGlzLnNhZmVQYXJzZUFzeW5jLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuc3BhID0gdGhpcy5zcGEuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5yZWZpbmUgPSB0aGlzLnJlZmluZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnJlZmluZW1lbnQgPSB0aGlzLnJlZmluZW1lbnQuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5zdXBlclJlZmluZSA9IHRoaXMuc3VwZXJSZWZpbmUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5vcHRpb25hbCA9IHRoaXMub3B0aW9uYWwuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5udWxsYWJsZSA9IHRoaXMubnVsbGFibGUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5udWxsaXNoID0gdGhpcy5udWxsaXNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYXJyYXkgPSB0aGlzLmFycmF5LmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMucHJvbWlzZSA9IHRoaXMucHJvbWlzZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLm9yID0gdGhpcy5vci5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmFuZCA9IHRoaXMuYW5kLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMudHJhbnNmb3JtID0gdGhpcy50cmFuc2Zvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5icmFuZCA9IHRoaXMuYnJhbmQuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0ID0gdGhpcy5kZWZhdWx0LmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY2F0Y2ggPSB0aGlzLmNhdGNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuZGVzY3JpYmUgPSB0aGlzLmRlc2NyaWJlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMucGlwZSA9IHRoaXMucGlwZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnJlYWRvbmx5ID0gdGhpcy5yZWFkb25seS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmlzTnVsbGFibGUgPSB0aGlzLmlzTnVsbGFibGUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5pc09wdGlvbmFsID0gdGhpcy5pc09wdGlvbmFsLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXNbXCJ+c3RhbmRhcmRcIl0gPSB7XG4gICAgICAgICAgICB2ZXJzaW9uOiAxLFxuICAgICAgICAgICAgdmVuZG9yOiBcInpvZFwiLFxuICAgICAgICAgICAgdmFsaWRhdGU6IChkYXRhKSA9PiB0aGlzW1wifnZhbGlkYXRlXCJdKGRhdGEpLFxuICAgICAgICB9O1xuICAgIH1cbiAgICBvcHRpb25hbCgpIHtcbiAgICAgICAgcmV0dXJuIFpvZE9wdGlvbmFsLmNyZWF0ZSh0aGlzLCB0aGlzLl9kZWYpO1xuICAgIH1cbiAgICBudWxsYWJsZSgpIHtcbiAgICAgICAgcmV0dXJuIFpvZE51bGxhYmxlLmNyZWF0ZSh0aGlzLCB0aGlzLl9kZWYpO1xuICAgIH1cbiAgICBudWxsaXNoKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5udWxsYWJsZSgpLm9wdGlvbmFsKCk7XG4gICAgfVxuICAgIGFycmF5KCkge1xuICAgICAgICByZXR1cm4gWm9kQXJyYXkuY3JlYXRlKHRoaXMpO1xuICAgIH1cbiAgICBwcm9taXNlKCkge1xuICAgICAgICByZXR1cm4gWm9kUHJvbWlzZS5jcmVhdGUodGhpcywgdGhpcy5fZGVmKTtcbiAgICB9XG4gICAgb3Iob3B0aW9uKSB7XG4gICAgICAgIHJldHVybiBab2RVbmlvbi5jcmVhdGUoW3RoaXMsIG9wdGlvbl0sIHRoaXMuX2RlZik7XG4gICAgfVxuICAgIGFuZChpbmNvbWluZykge1xuICAgICAgICByZXR1cm4gWm9kSW50ZXJzZWN0aW9uLmNyZWF0ZSh0aGlzLCBpbmNvbWluZywgdGhpcy5fZGVmKTtcbiAgICB9XG4gICAgdHJhbnNmb3JtKHRyYW5zZm9ybSkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEVmZmVjdHMoe1xuICAgICAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyh0aGlzLl9kZWYpLFxuICAgICAgICAgICAgc2NoZW1hOiB0aGlzLFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RFZmZlY3RzLFxuICAgICAgICAgICAgZWZmZWN0OiB7IHR5cGU6IFwidHJhbnNmb3JtXCIsIHRyYW5zZm9ybSB9LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZGVmYXVsdChkZWYpIHtcbiAgICAgICAgY29uc3QgZGVmYXVsdFZhbHVlRnVuYyA9IHR5cGVvZiBkZWYgPT09IFwiZnVuY3Rpb25cIiA/IGRlZiA6ICgpID0+IGRlZjtcbiAgICAgICAgcmV0dXJuIG5ldyBab2REZWZhdWx0KHtcbiAgICAgICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXModGhpcy5fZGVmKSxcbiAgICAgICAgICAgIGlubmVyVHlwZTogdGhpcyxcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZTogZGVmYXVsdFZhbHVlRnVuYyxcbiAgICAgICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kRGVmYXVsdCxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGJyYW5kKCkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEJyYW5kZWQoe1xuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RCcmFuZGVkLFxuICAgICAgICAgICAgdHlwZTogdGhpcyxcbiAgICAgICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXModGhpcy5fZGVmKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNhdGNoKGRlZikge1xuICAgICAgICBjb25zdCBjYXRjaFZhbHVlRnVuYyA9IHR5cGVvZiBkZWYgPT09IFwiZnVuY3Rpb25cIiA/IGRlZiA6ICgpID0+IGRlZjtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RDYXRjaCh7XG4gICAgICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHRoaXMuX2RlZiksXG4gICAgICAgICAgICBpbm5lclR5cGU6IHRoaXMsXG4gICAgICAgICAgICBjYXRjaFZhbHVlOiBjYXRjaFZhbHVlRnVuYyxcbiAgICAgICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kQ2F0Y2gsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBkZXNjcmliZShkZXNjcmlwdGlvbikge1xuICAgICAgICBjb25zdCBUaGlzID0gdGhpcy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgcmV0dXJuIG5ldyBUaGlzKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcGlwZSh0YXJnZXQpIHtcbiAgICAgICAgcmV0dXJuIFpvZFBpcGVsaW5lLmNyZWF0ZSh0aGlzLCB0YXJnZXQpO1xuICAgIH1cbiAgICByZWFkb25seSgpIHtcbiAgICAgICAgcmV0dXJuIFpvZFJlYWRvbmx5LmNyZWF0ZSh0aGlzKTtcbiAgICB9XG4gICAgaXNPcHRpb25hbCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2FmZVBhcnNlKHVuZGVmaW5lZCkuc3VjY2VzcztcbiAgICB9XG4gICAgaXNOdWxsYWJsZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2FmZVBhcnNlKG51bGwpLnN1Y2Nlc3M7XG4gICAgfVxufVxuY29uc3QgY3VpZFJlZ2V4ID0gL15jW15cXHMtXXs4LH0kL2k7XG5jb25zdCBjdWlkMlJlZ2V4ID0gL15bMC05YS16XSskLztcbmNvbnN0IHVsaWRSZWdleCA9IC9eWzAtOUEtSEpLTU5QLVRWLVpdezI2fSQvaTtcbi8vIGNvbnN0IHV1aWRSZWdleCA9XG4vLyAgIC9eKFthLWYwLTldezh9LVthLWYwLTldezR9LVsxLTVdW2EtZjAtOV17M30tW2EtZjAtOV17NH0tW2EtZjAtOV17MTJ9fDAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCkkL2k7XG5jb25zdCB1dWlkUmVnZXggPSAvXlswLTlhLWZBLUZdezh9XFxiLVswLTlhLWZBLUZdezR9XFxiLVswLTlhLWZBLUZdezR9XFxiLVswLTlhLWZBLUZdezR9XFxiLVswLTlhLWZBLUZdezEyfSQvaTtcbmNvbnN0IG5hbm9pZFJlZ2V4ID0gL15bYS16MC05Xy1dezIxfSQvaTtcbmNvbnN0IGp3dFJlZ2V4ID0gL15bQS1aYS16MC05LV9dK1xcLltBLVphLXowLTktX10rXFwuW0EtWmEtejAtOS1fXSokLztcbmNvbnN0IGR1cmF0aW9uUmVnZXggPSAvXlstK10/UCg/ISQpKD86KD86Wy0rXT9cXGQrWSl8KD86Wy0rXT9cXGQrWy4sXVxcZCtZJCkpPyg/Oig/OlstK10/XFxkK00pfCg/OlstK10/XFxkK1suLF1cXGQrTSQpKT8oPzooPzpbLStdP1xcZCtXKXwoPzpbLStdP1xcZCtbLixdXFxkK1ckKSk/KD86KD86Wy0rXT9cXGQrRCl8KD86Wy0rXT9cXGQrWy4sXVxcZCtEJCkpPyg/OlQoPz1bXFxkKy1dKSg/Oig/OlstK10/XFxkK0gpfCg/OlstK10/XFxkK1suLF1cXGQrSCQpKT8oPzooPzpbLStdP1xcZCtNKXwoPzpbLStdP1xcZCtbLixdXFxkK00kKSk/KD86Wy0rXT9cXGQrKD86Wy4sXVxcZCspP1MpPyk/PyQvO1xuLy8gZnJvbSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvNDYxODEvMTU1MDE1NVxuLy8gb2xkIHZlcnNpb246IHRvbyBzbG93LCBkaWRuJ3Qgc3VwcG9ydCB1bmljb2RlXG4vLyBjb25zdCBlbWFpbFJlZ2V4ID0gL14oKChbYS16XXxcXGR8WyEjXFwkJSYnXFwqXFwrXFwtXFwvPVxcP1xcXl9ge1xcfH1+XXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkrKFxcLihbYS16XXxcXGR8WyEjXFwkJSYnXFwqXFwrXFwtXFwvPVxcP1xcXl9ge1xcfH1+XXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkrKSopfCgoXFx4MjIpKCgoKFxceDIwfFxceDA5KSooXFx4MGRcXHgwYSkpPyhcXHgyMHxcXHgwOSkrKT8oKFtcXHgwMS1cXHgwOFxceDBiXFx4MGNcXHgwZS1cXHgxZlxceDdmXXxcXHgyMXxbXFx4MjMtXFx4NWJdfFtcXHg1ZC1cXHg3ZV18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfChcXFxcKFtcXHgwMS1cXHgwOVxceDBiXFx4MGNcXHgwZC1cXHg3Zl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKSkpKigoKFxceDIwfFxceDA5KSooXFx4MGRcXHgwYSkpPyhcXHgyMHxcXHgwOSkrKT8oXFx4MjIpKSlAKCgoW2Etel18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoKFthLXpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2Etel18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKVxcLikrKChbYS16XXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16XXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2Etel18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSkpJC9pO1xuLy9vbGQgZW1haWwgcmVnZXhcbi8vIGNvbnN0IGVtYWlsUmVnZXggPSAvXigoW148PigpW1xcXS4sOzpcXHNAXCJdKyhcXC5bXjw+KClbXFxdLiw7Olxcc0BcIl0rKSopfChcIi4rXCIpKUAoKD8hLSkoW148PigpW1xcXS4sOzpcXHNAXCJdK1xcLikrW148PigpW1xcXS4sOzpcXHNAXCJdezEsfSlbXi08PigpW1xcXS4sOzpcXHNAXCJdJC9pO1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG4vLyBjb25zdCBlbWFpbFJlZ2V4ID1cbi8vICAgL14oKFtePD4oKVtcXF1cXFxcLiw7Olxcc0BcXFwiXSsoXFwuW148PigpW1xcXVxcXFwuLDs6XFxzQFxcXCJdKykqKXwoXFxcIi4rXFxcIikpQCgoXFxbKCgoMjVbMC01XSl8KDJbMC00XVswLTldKXwoMVswLTldezJ9KXwoWzAtOV17MSwyfSkpXFwuKXszfSgoMjVbMC01XSl8KDJbMC00XVswLTldKXwoMVswLTldezJ9KXwoWzAtOV17MSwyfSkpXFxdKXwoXFxbSVB2NjooKFthLWYwLTldezEsNH06KXs3fXw6OihbYS1mMC05XXsxLDR9Oil7MCw2fXwoW2EtZjAtOV17MSw0fTopezF9OihbYS1mMC05XXsxLDR9Oil7MCw1fXwoW2EtZjAtOV17MSw0fTopezJ9OihbYS1mMC05XXsxLDR9Oil7MCw0fXwoW2EtZjAtOV17MSw0fTopezN9OihbYS1mMC05XXsxLDR9Oil7MCwzfXwoW2EtZjAtOV17MSw0fTopezR9OihbYS1mMC05XXsxLDR9Oil7MCwyfXwoW2EtZjAtOV17MSw0fTopezV9OihbYS1mMC05XXsxLDR9Oil7MCwxfSkoW2EtZjAtOV17MSw0fXwoKCgyNVswLTVdKXwoMlswLTRdWzAtOV0pfCgxWzAtOV17Mn0pfChbMC05XXsxLDJ9KSlcXC4pezN9KCgyNVswLTVdKXwoMlswLTRdWzAtOV0pfCgxWzAtOV17Mn0pfChbMC05XXsxLDJ9KSkpXFxdKXwoW0EtWmEtejAtOV0oW0EtWmEtejAtOS1dKltBLVphLXowLTldKSooXFwuW0EtWmEtel17Mix9KSspKSQvO1xuLy8gY29uc3QgZW1haWxSZWdleCA9XG4vLyAgIC9eW2EtekEtWjAtOVxcLlxcIVxcI1xcJFxcJVxcJlxcJ1xcKlxcK1xcL1xcPVxcP1xcXlxcX1xcYFxce1xcfFxcfVxcflxcLV0rQFthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPyg/OlxcLlthLXpBLVowLTldKD86W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0pPykqJC87XG4vLyBjb25zdCBlbWFpbFJlZ2V4ID1cbi8vICAgL14oPzpbYS16MC05ISMkJSYnKisvPT9eX2B7fH1+LV0rKD86XFwuW2EtejAtOSEjJCUmJyorLz0/Xl9ge3x9fi1dKykqfFwiKD86W1xceDAxLVxceDA4XFx4MGJcXHgwY1xceDBlLVxceDFmXFx4MjFcXHgyMy1cXHg1YlxceDVkLVxceDdmXXxcXFxcW1xceDAxLVxceDA5XFx4MGJcXHgwY1xceDBlLVxceDdmXSkqXCIpQCg/Oig/OlthLXowLTldKD86W2EtejAtOS1dKlthLXowLTldKT9cXC4pK1thLXowLTldKD86W2EtejAtOS1dKlthLXowLTldKT98XFxbKD86KD86MjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT98W2EtejAtOS1dKlthLXowLTldOig/OltcXHgwMS1cXHgwOFxceDBiXFx4MGNcXHgwZS1cXHgxZlxceDIxLVxceDVhXFx4NTMtXFx4N2ZdfFxcXFxbXFx4MDEtXFx4MDlcXHgwYlxceDBjXFx4MGUtXFx4N2ZdKSspXFxdKSQvaTtcbmNvbnN0IGVtYWlsUmVnZXggPSAvXig/IVxcLikoPyEuKlxcLlxcLikoW0EtWjAtOV8nK1xcLVxcLl0qKVtBLVowLTlfKy1dQChbQS1aMC05XVtBLVowLTlcXC1dKlxcLikrW0EtWl17Mix9JC9pO1xuLy8gY29uc3QgZW1haWxSZWdleCA9XG4vLyAgIC9eW2EtejAtOS4hIyQlJlx1MjAxOSorLz0/Xl9ge3x9fi1dK0BbYS16MC05LV0rKD86XFwuW2EtejAtOVxcLV0rKSokL2k7XG4vLyBmcm9tIGh0dHBzOi8vdGhla2V2aW5zY290dC5jb20vZW1vamlzLWluLWphdmFzY3JpcHQvI3dyaXRpbmctYS1yZWd1bGFyLWV4cHJlc3Npb25cbmNvbnN0IF9lbW9qaVJlZ2V4ID0gYF4oXFxcXHB7RXh0ZW5kZWRfUGljdG9ncmFwaGljfXxcXFxccHtFbW9qaV9Db21wb25lbnR9KSskYDtcbmxldCBlbW9qaVJlZ2V4O1xuLy8gZmFzdGVyLCBzaW1wbGVyLCBzYWZlclxuY29uc3QgaXB2NFJlZ2V4ID0gL14oPzooPzoyNVswLTVdfDJbMC00XVswLTldfDFbMC05XVswLTldfFsxLTldWzAtOV18WzAtOV0pXFwuKXszfSg/OjI1WzAtNV18MlswLTRdWzAtOV18MVswLTldWzAtOV18WzEtOV1bMC05XXxbMC05XSkkLztcbmNvbnN0IGlwdjRDaWRyUmVnZXggPSAvXig/Oig/OjI1WzAtNV18MlswLTRdWzAtOV18MVswLTldWzAtOV18WzEtOV1bMC05XXxbMC05XSlcXC4pezN9KD86MjVbMC01XXwyWzAtNF1bMC05XXwxWzAtOV1bMC05XXxbMS05XVswLTldfFswLTldKVxcLygzWzAtMl18WzEyXT9bMC05XSkkLztcbi8vIGNvbnN0IGlwdjZSZWdleCA9XG4vLyAvXigoW2EtZjAtOV17MSw0fTopezd9fDo6KFthLWYwLTldezEsNH06KXswLDZ9fChbYS1mMC05XXsxLDR9Oil7MX06KFthLWYwLTldezEsNH06KXswLDV9fChbYS1mMC05XXsxLDR9Oil7Mn06KFthLWYwLTldezEsNH06KXswLDR9fChbYS1mMC05XXsxLDR9Oil7M306KFthLWYwLTldezEsNH06KXswLDN9fChbYS1mMC05XXsxLDR9Oil7NH06KFthLWYwLTldezEsNH06KXswLDJ9fChbYS1mMC05XXsxLDR9Oil7NX06KFthLWYwLTldezEsNH06KXswLDF9KShbYS1mMC05XXsxLDR9fCgoKDI1WzAtNV0pfCgyWzAtNF1bMC05XSl8KDFbMC05XXsyfSl8KFswLTldezEsMn0pKVxcLil7M30oKDI1WzAtNV0pfCgyWzAtNF1bMC05XSl8KDFbMC05XXsyfSl8KFswLTldezEsMn0pKSkkLztcbmNvbnN0IGlwdjZSZWdleCA9IC9eKChbMC05YS1mQS1GXXsxLDR9Oil7Nyw3fVswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDd9OnwoWzAtOWEtZkEtRl17MSw0fTopezEsNn06WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsNX0oOlswLTlhLWZBLUZdezEsNH0pezEsMn18KFswLTlhLWZBLUZdezEsNH06KXsxLDR9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDN9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwzfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsMn0oOlswLTlhLWZBLUZdezEsNH0pezEsNX18WzAtOWEtZkEtRl17MSw0fTooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDZ9KXw6KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw3fXw6KXxmZTgwOig6WzAtOWEtZkEtRl17MCw0fSl7MCw0fSVbMC05YS16QS1aXXsxLH18OjooZmZmZig6MHsxLDR9KXswLDF9Oil7MCwxfSgoMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pXFwuKXszLDN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH06KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezMsM30oMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pKSQvO1xuY29uc3QgaXB2NkNpZHJSZWdleCA9IC9eKChbMC05YS1mQS1GXXsxLDR9Oil7Nyw3fVswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDd9OnwoWzAtOWEtZkEtRl17MSw0fTopezEsNn06WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsNX0oOlswLTlhLWZBLUZdezEsNH0pezEsMn18KFswLTlhLWZBLUZdezEsNH06KXsxLDR9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDN9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwzfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsMn0oOlswLTlhLWZBLUZdezEsNH0pezEsNX18WzAtOWEtZkEtRl17MSw0fTooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDZ9KXw6KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw3fXw6KXxmZTgwOig6WzAtOWEtZkEtRl17MCw0fSl7MCw0fSVbMC05YS16QS1aXXsxLH18OjooZmZmZig6MHsxLDR9KXswLDF9Oil7MCwxfSgoMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pXFwuKXszLDN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH06KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezMsM30oMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pKVxcLygxMlswLThdfDFbMDFdWzAtOV18WzEtOV0/WzAtOV0pJC87XG4vLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83ODYwMzkyL2RldGVybWluZS1pZi1zdHJpbmctaXMtaW4tYmFzZTY0LXVzaW5nLWphdmFzY3JpcHRcbmNvbnN0IGJhc2U2NFJlZ2V4ID0gL14oWzAtOWEtekEtWisvXXs0fSkqKChbMC05YS16QS1aKy9dezJ9PT0pfChbMC05YS16QS1aKy9dezN9PSkpPyQvO1xuLy8gaHR0cHM6Ly9iYXNlNjQuZ3VydS9zdGFuZGFyZHMvYmFzZTY0dXJsXG5jb25zdCBiYXNlNjR1cmxSZWdleCA9IC9eKFswLTlhLXpBLVotX117NH0pKigoWzAtOWEtekEtWi1fXXsyfSg9PSk/KXwoWzAtOWEtekEtWi1fXXszfSg9KT8pKT8kLztcbi8vIHNpbXBsZVxuLy8gY29uc3QgZGF0ZVJlZ2V4U291cmNlID0gYFxcXFxkezR9LVxcXFxkezJ9LVxcXFxkezJ9YDtcbi8vIG5vIGxlYXAgeWVhciB2YWxpZGF0aW9uXG4vLyBjb25zdCBkYXRlUmVnZXhTb3VyY2UgPSBgXFxcXGR7NH0tKCgwWzEzNTc4XXwxMHwxMiktMzF8KDBbMTMtOV18MVswLTJdKS0zMHwoMFsxLTldfDFbMC0yXSktKDBbMS05XXwxXFxcXGR8MlxcXFxkKSlgO1xuLy8gd2l0aCBsZWFwIHllYXIgdmFsaWRhdGlvblxuY29uc3QgZGF0ZVJlZ2V4U291cmNlID0gYCgoXFxcXGRcXFxcZFsyNDY4XVswNDhdfFxcXFxkXFxcXGRbMTM1NzldWzI2XXxcXFxcZFxcXFxkMFs0OF18WzAyNDY4XVswNDhdMDB8WzEzNTc5XVsyNl0wMCktMDItMjl8XFxcXGR7NH0tKCgwWzEzNTc4XXwxWzAyXSktKDBbMS05XXxbMTJdXFxcXGR8M1swMV0pfCgwWzQ2OV18MTEpLSgwWzEtOV18WzEyXVxcXFxkfDMwKXwoMDIpLSgwWzEtOV18MVxcXFxkfDJbMC04XSkpKWA7XG5jb25zdCBkYXRlUmVnZXggPSBuZXcgUmVnRXhwKGBeJHtkYXRlUmVnZXhTb3VyY2V9JGApO1xuZnVuY3Rpb24gdGltZVJlZ2V4U291cmNlKGFyZ3MpIHtcbiAgICBsZXQgc2Vjb25kc1JlZ2V4U291cmNlID0gYFswLTVdXFxcXGRgO1xuICAgIGlmIChhcmdzLnByZWNpc2lvbikge1xuICAgICAgICBzZWNvbmRzUmVnZXhTb3VyY2UgPSBgJHtzZWNvbmRzUmVnZXhTb3VyY2V9XFxcXC5cXFxcZHske2FyZ3MucHJlY2lzaW9ufX1gO1xuICAgIH1cbiAgICBlbHNlIGlmIChhcmdzLnByZWNpc2lvbiA9PSBudWxsKSB7XG4gICAgICAgIHNlY29uZHNSZWdleFNvdXJjZSA9IGAke3NlY29uZHNSZWdleFNvdXJjZX0oXFxcXC5cXFxcZCspP2A7XG4gICAgfVxuICAgIGNvbnN0IHNlY29uZHNRdWFudGlmaWVyID0gYXJncy5wcmVjaXNpb24gPyBcIitcIiA6IFwiP1wiOyAvLyByZXF1aXJlIHNlY29uZHMgaWYgcHJlY2lzaW9uIGlzIG5vbnplcm9cbiAgICByZXR1cm4gYChbMDFdXFxcXGR8MlswLTNdKTpbMC01XVxcXFxkKDoke3NlY29uZHNSZWdleFNvdXJjZX0pJHtzZWNvbmRzUXVhbnRpZmllcn1gO1xufVxuZnVuY3Rpb24gdGltZVJlZ2V4KGFyZ3MpIHtcbiAgICByZXR1cm4gbmV3IFJlZ0V4cChgXiR7dGltZVJlZ2V4U291cmNlKGFyZ3MpfSRgKTtcbn1cbi8vIEFkYXB0ZWQgZnJvbSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzE0MzIzMVxuZXhwb3J0IGZ1bmN0aW9uIGRhdGV0aW1lUmVnZXgoYXJncykge1xuICAgIGxldCByZWdleCA9IGAke2RhdGVSZWdleFNvdXJjZX1UJHt0aW1lUmVnZXhTb3VyY2UoYXJncyl9YDtcbiAgICBjb25zdCBvcHRzID0gW107XG4gICAgb3B0cy5wdXNoKGFyZ3MubG9jYWwgPyBgWj9gIDogYFpgKTtcbiAgICBpZiAoYXJncy5vZmZzZXQpXG4gICAgICAgIG9wdHMucHVzaChgKFsrLV1cXFxcZHsyfTo/XFxcXGR7Mn0pYCk7XG4gICAgcmVnZXggPSBgJHtyZWdleH0oJHtvcHRzLmpvaW4oXCJ8XCIpfSlgO1xuICAgIHJldHVybiBuZXcgUmVnRXhwKGBeJHtyZWdleH0kYCk7XG59XG5mdW5jdGlvbiBpc1ZhbGlkSVAoaXAsIHZlcnNpb24pIHtcbiAgICBpZiAoKHZlcnNpb24gPT09IFwidjRcIiB8fCAhdmVyc2lvbikgJiYgaXB2NFJlZ2V4LnRlc3QoaXApKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoKHZlcnNpb24gPT09IFwidjZcIiB8fCAhdmVyc2lvbikgJiYgaXB2NlJlZ2V4LnRlc3QoaXApKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBpc1ZhbGlkSldUKGp3dCwgYWxnKSB7XG4gICAgaWYgKCFqd3RSZWdleC50ZXN0KGp3dCkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBbaGVhZGVyXSA9IGp3dC5zcGxpdChcIi5cIik7XG4gICAgICAgIGlmICghaGVhZGVyKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAvLyBDb252ZXJ0IGJhc2U2NHVybCB0byBiYXNlNjRcbiAgICAgICAgY29uc3QgYmFzZTY0ID0gaGVhZGVyXG4gICAgICAgICAgICAucmVwbGFjZSgvLS9nLCBcIitcIilcbiAgICAgICAgICAgIC5yZXBsYWNlKC9fL2csIFwiL1wiKVxuICAgICAgICAgICAgLnBhZEVuZChoZWFkZXIubGVuZ3RoICsgKCg0IC0gKGhlYWRlci5sZW5ndGggJSA0KSkgJSA0KSwgXCI9XCIpO1xuICAgICAgICBjb25zdCBkZWNvZGVkID0gSlNPTi5wYXJzZShhdG9iKGJhc2U2NCkpO1xuICAgICAgICBpZiAodHlwZW9mIGRlY29kZWQgIT09IFwib2JqZWN0XCIgfHwgZGVjb2RlZCA9PT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKFwidHlwXCIgaW4gZGVjb2RlZCAmJiBkZWNvZGVkPy50eXAgIT09IFwiSldUXCIpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICghZGVjb2RlZC5hbGcpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChhbGcgJiYgZGVjb2RlZC5hbGcgIT09IGFsZylcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGlzVmFsaWRDaWRyKGlwLCB2ZXJzaW9uKSB7XG4gICAgaWYgKCh2ZXJzaW9uID09PSBcInY0XCIgfHwgIXZlcnNpb24pICYmIGlwdjRDaWRyUmVnZXgudGVzdChpcCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICgodmVyc2lvbiA9PT0gXCJ2NlwiIHx8ICF2ZXJzaW9uKSAmJiBpcHY2Q2lkclJlZ2V4LnRlc3QoaXApKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5leHBvcnQgY2xhc3MgWm9kU3RyaW5nIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGlmICh0aGlzLl9kZWYuY29lcmNlKSB7XG4gICAgICAgICAgICBpbnB1dC5kYXRhID0gU3RyaW5nKGlucHV0LmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhcnNlZFR5cGUgPSB0aGlzLl9nZXRUeXBlKGlucHV0KTtcbiAgICAgICAgaWYgKHBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUuc3RyaW5nKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLnN0cmluZyxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IG5ldyBQYXJzZVN0YXR1cygpO1xuICAgICAgICBsZXQgY3R4ID0gdW5kZWZpbmVkO1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaGVjay5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmRhdGEubGVuZ3RoIDwgY2hlY2sudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19zbWFsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4YWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcIm1heFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmRhdGEubGVuZ3RoID4gY2hlY2sudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19iaWcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJsZW5ndGhcIikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb0JpZyA9IGlucHV0LmRhdGEubGVuZ3RoID4gY2hlY2sudmFsdWU7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vU21hbGwgPSBpbnB1dC5kYXRhLmxlbmd0aCA8IGNoZWNrLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0b29CaWcgfHwgdG9vU21hbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b29CaWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fYmlnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heGltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4YWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0b29TbWFsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19zbWFsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5pbXVtOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJlbWFpbFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFlbWFpbFJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJlbWFpbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiZW1vamlcIikge1xuICAgICAgICAgICAgICAgIGlmICghZW1vamlSZWdleCkge1xuICAgICAgICAgICAgICAgICAgICBlbW9qaVJlZ2V4ID0gbmV3IFJlZ0V4cChfZW1vamlSZWdleCwgXCJ1XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWVtb2ppUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImVtb2ppXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJ1dWlkXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXV1aWRSZWdleC50ZXN0KGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwidXVpZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwibmFub2lkXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW5hbm9pZFJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJuYW5vaWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImN1aWRcIikge1xuICAgICAgICAgICAgICAgIGlmICghY3VpZFJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJjdWlkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJjdWlkMlwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjdWlkMlJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJjdWlkMlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwidWxpZFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF1bGlkUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcInVsaWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcInVybFwiKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgbmV3IFVSTChpbnB1dC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcInVybFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwicmVnZXhcIikge1xuICAgICAgICAgICAgICAgIGNoZWNrLnJlZ2V4Lmxhc3RJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgY29uc3QgdGVzdFJlc3VsdCA9IGNoZWNrLnJlZ2V4LnRlc3QoaW5wdXQuZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKCF0ZXN0UmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwicmVnZXhcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcInRyaW1cIikge1xuICAgICAgICAgICAgICAgIGlucHV0LmRhdGEgPSBpbnB1dC5kYXRhLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiaW5jbHVkZXNcIikge1xuICAgICAgICAgICAgICAgIGlmICghaW5wdXQuZGF0YS5pbmNsdWRlcyhjaGVjay52YWx1ZSwgY2hlY2sucG9zaXRpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IHsgaW5jbHVkZXM6IGNoZWNrLnZhbHVlLCBwb3NpdGlvbjogY2hlY2sucG9zaXRpb24gfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcInRvTG93ZXJDYXNlXCIpIHtcbiAgICAgICAgICAgICAgICBpbnB1dC5kYXRhID0gaW5wdXQuZGF0YS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJ0b1VwcGVyQ2FzZVwiKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQuZGF0YSA9IGlucHV0LmRhdGEudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwic3RhcnRzV2l0aFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnB1dC5kYXRhLnN0YXJ0c1dpdGgoY2hlY2sudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IHsgc3RhcnRzV2l0aDogY2hlY2sudmFsdWUgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImVuZHNXaXRoXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlucHV0LmRhdGEuZW5kc1dpdGgoY2hlY2sudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IHsgZW5kc1dpdGg6IGNoZWNrLnZhbHVlIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJkYXRldGltZVwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVnZXggPSBkYXRldGltZVJlZ2V4KGNoZWNrKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJkYXRldGltZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiZGF0ZVwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVnZXggPSBkYXRlUmVnZXg7XG4gICAgICAgICAgICAgICAgaWYgKCFyZWdleC50ZXN0KGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwiZGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwidGltZVwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVnZXggPSB0aW1lUmVnZXgoY2hlY2spO1xuICAgICAgICAgICAgICAgIGlmICghcmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcInRpbWVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImR1cmF0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWR1cmF0aW9uUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImR1cmF0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJpcFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1ZhbGlkSVAoaW5wdXQuZGF0YSwgY2hlY2sudmVyc2lvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJpcFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiand0XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlzVmFsaWRKV1QoaW5wdXQuZGF0YSwgY2hlY2suYWxnKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImp3dFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiY2lkclwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1ZhbGlkQ2lkcihpbnB1dC5kYXRhLCBjaGVjay52ZXJzaW9uKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImNpZHJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImJhc2U2NFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFiYXNlNjRSZWdleC50ZXN0KGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwiYmFzZTY0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJiYXNlNjR1cmxcIikge1xuICAgICAgICAgICAgICAgIGlmICghYmFzZTY0dXJsUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImJhc2U2NHVybFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHV0aWwuYXNzZXJ0TmV2ZXIoY2hlY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN0YXR1czogc3RhdHVzLnZhbHVlLCB2YWx1ZTogaW5wdXQuZGF0YSB9O1xuICAgIH1cbiAgICBfcmVnZXgocmVnZXgsIHZhbGlkYXRpb24sIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVmaW5lbWVudCgoZGF0YSkgPT4gcmVnZXgudGVzdChkYXRhKSwge1xuICAgICAgICAgICAgdmFsaWRhdGlvbixcbiAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIF9hZGRDaGVjayhjaGVjaykge1xuICAgICAgICByZXR1cm4gbmV3IFpvZFN0cmluZyh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBjaGVja3M6IFsuLi50aGlzLl9kZWYuY2hlY2tzLCBjaGVja10sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbWFpbChtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwiZW1haWxcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICB1cmwobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcInVybFwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkgfSk7XG4gICAgfVxuICAgIGVtb2ppKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJlbW9qaVwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkgfSk7XG4gICAgfVxuICAgIHV1aWQobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcInV1aWRcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICBuYW5vaWQobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcIm5hbm9pZFwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkgfSk7XG4gICAgfVxuICAgIGN1aWQobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcImN1aWRcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICBjdWlkMihtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwiY3VpZDJcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICB1bGlkKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJ1bGlkXCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSB9KTtcbiAgICB9XG4gICAgYmFzZTY0KG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJiYXNlNjRcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICBiYXNlNjR1cmwobWVzc2FnZSkge1xuICAgICAgICAvLyBiYXNlNjR1cmwgZW5jb2RpbmcgaXMgYSBtb2RpZmljYXRpb24gb2YgYmFzZTY0IHRoYXQgY2FuIHNhZmVseSBiZSB1c2VkIGluIFVSTHMgYW5kIGZpbGVuYW1lc1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJiYXNlNjR1cmxcIixcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGp3dChvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwiand0XCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihvcHRpb25zKSB9KTtcbiAgICB9XG4gICAgaXAob3B0aW9ucykge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcImlwXCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihvcHRpb25zKSB9KTtcbiAgICB9XG4gICAgY2lkcihvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwiY2lkclwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoob3B0aW9ucykgfSk7XG4gICAgfVxuICAgIGRhdGV0aW1lKG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAgICAgIGtpbmQ6IFwiZGF0ZXRpbWVcIixcbiAgICAgICAgICAgICAgICBwcmVjaXNpb246IG51bGwsXG4gICAgICAgICAgICAgICAgb2Zmc2V0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBsb2NhbDogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogb3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcImRhdGV0aW1lXCIsXG4gICAgICAgICAgICBwcmVjaXNpb246IHR5cGVvZiBvcHRpb25zPy5wcmVjaXNpb24gPT09IFwidW5kZWZpbmVkXCIgPyBudWxsIDogb3B0aW9ucz8ucHJlY2lzaW9uLFxuICAgICAgICAgICAgb2Zmc2V0OiBvcHRpb25zPy5vZmZzZXQgPz8gZmFsc2UsXG4gICAgICAgICAgICBsb2NhbDogb3B0aW9ucz8ubG9jYWwgPz8gZmFsc2UsXG4gICAgICAgICAgICAuLi5lcnJvclV0aWwuZXJyVG9PYmoob3B0aW9ucz8ubWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBkYXRlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJkYXRlXCIsIG1lc3NhZ2UgfSk7XG4gICAgfVxuICAgIHRpbWUob3B0aW9ucykge1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICAgICAga2luZDogXCJ0aW1lXCIsXG4gICAgICAgICAgICAgICAgcHJlY2lzaW9uOiBudWxsLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJ0aW1lXCIsXG4gICAgICAgICAgICBwcmVjaXNpb246IHR5cGVvZiBvcHRpb25zPy5wcmVjaXNpb24gPT09IFwidW5kZWZpbmVkXCIgPyBudWxsIDogb3B0aW9ucz8ucHJlY2lzaW9uLFxuICAgICAgICAgICAgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG9wdGlvbnM/Lm1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZHVyYXRpb24obWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcImR1cmF0aW9uXCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSB9KTtcbiAgICB9XG4gICAgcmVnZXgocmVnZXgsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwicmVnZXhcIixcbiAgICAgICAgICAgIHJlZ2V4OiByZWdleCxcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGluY2x1ZGVzKHZhbHVlLCBvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcImluY2x1ZGVzXCIsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICBwb3NpdGlvbjogb3B0aW9ucz8ucG9zaXRpb24sXG4gICAgICAgICAgICAuLi5lcnJvclV0aWwuZXJyVG9PYmoob3B0aW9ucz8ubWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzdGFydHNXaXRoKHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcInN0YXJ0c1dpdGhcIixcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVuZHNXaXRoKHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcImVuZHNXaXRoXCIsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBtaW4obWluTGVuZ3RoLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1pblwiLFxuICAgICAgICAgICAgdmFsdWU6IG1pbkxlbmd0aCxcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG1heChtYXhMZW5ndGgsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWF4XCIsXG4gICAgICAgICAgICB2YWx1ZTogbWF4TGVuZ3RoLFxuICAgICAgICAgICAgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbGVuZ3RoKGxlbiwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJsZW5ndGhcIixcbiAgICAgICAgICAgIHZhbHVlOiBsZW4sXG4gICAgICAgICAgICAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFcXVpdmFsZW50IHRvIGAubWluKDEpYFxuICAgICAqL1xuICAgIG5vbmVtcHR5KG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWluKDEsIGVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSk7XG4gICAgfVxuICAgIHRyaW0oKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kU3RyaW5nKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGNoZWNrczogWy4uLnRoaXMuX2RlZi5jaGVja3MsIHsga2luZDogXCJ0cmltXCIgfV0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB0b0xvd2VyQ2FzZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RTdHJpbmcoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgY2hlY2tzOiBbLi4udGhpcy5fZGVmLmNoZWNrcywgeyBraW5kOiBcInRvTG93ZXJDYXNlXCIgfV0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB0b1VwcGVyQ2FzZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RTdHJpbmcoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgY2hlY2tzOiBbLi4udGhpcy5fZGVmLmNoZWNrcywgeyBraW5kOiBcInRvVXBwZXJDYXNlXCIgfV0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXQgaXNEYXRldGltZSgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJkYXRldGltZVwiKTtcbiAgICB9XG4gICAgZ2V0IGlzRGF0ZSgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJkYXRlXCIpO1xuICAgIH1cbiAgICBnZXQgaXNUaW1lKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcInRpbWVcIik7XG4gICAgfVxuICAgIGdldCBpc0R1cmF0aW9uKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcImR1cmF0aW9uXCIpO1xuICAgIH1cbiAgICBnZXQgaXNFbWFpbCgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJlbWFpbFwiKTtcbiAgICB9XG4gICAgZ2V0IGlzVVJMKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcInVybFwiKTtcbiAgICB9XG4gICAgZ2V0IGlzRW1vamkoKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwiZW1vamlcIik7XG4gICAgfVxuICAgIGdldCBpc1VVSUQoKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwidXVpZFwiKTtcbiAgICB9XG4gICAgZ2V0IGlzTkFOT0lEKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcIm5hbm9pZFwiKTtcbiAgICB9XG4gICAgZ2V0IGlzQ1VJRCgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJjdWlkXCIpO1xuICAgIH1cbiAgICBnZXQgaXNDVUlEMigpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJjdWlkMlwiKTtcbiAgICB9XG4gICAgZ2V0IGlzVUxJRCgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJ1bGlkXCIpO1xuICAgIH1cbiAgICBnZXQgaXNJUCgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJpcFwiKTtcbiAgICB9XG4gICAgZ2V0IGlzQ0lEUigpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJjaWRyXCIpO1xuICAgIH1cbiAgICBnZXQgaXNCYXNlNjQoKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwiYmFzZTY0XCIpO1xuICAgIH1cbiAgICBnZXQgaXNCYXNlNjR1cmwoKSB7XG4gICAgICAgIC8vIGJhc2U2NHVybCBlbmNvZGluZyBpcyBhIG1vZGlmaWNhdGlvbiBvZiBiYXNlNjQgdGhhdCBjYW4gc2FmZWx5IGJlIHVzZWQgaW4gVVJMcyBhbmQgZmlsZW5hbWVzXG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwiYmFzZTY0dXJsXCIpO1xuICAgIH1cbiAgICBnZXQgbWluTGVuZ3RoKCkge1xuICAgICAgICBsZXQgbWluID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2gua2luZCA9PT0gXCJtaW5cIikge1xuICAgICAgICAgICAgICAgIGlmIChtaW4gPT09IG51bGwgfHwgY2gudmFsdWUgPiBtaW4pXG4gICAgICAgICAgICAgICAgICAgIG1pbiA9IGNoLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtaW47XG4gICAgfVxuICAgIGdldCBtYXhMZW5ndGgoKSB7XG4gICAgICAgIGxldCBtYXggPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaC5raW5kID09PSBcIm1heFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1heCA9PT0gbnVsbCB8fCBjaC52YWx1ZSA8IG1heClcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1heDtcbiAgICB9XG59XG5ab2RTdHJpbmcuY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kU3RyaW5nKHtcbiAgICAgICAgY2hlY2tzOiBbXSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RTdHJpbmcsXG4gICAgICAgIGNvZXJjZTogcGFyYW1zPy5jb2VyY2UgPz8gZmFsc2UsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG4vLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zOTY2NDg0L3doeS1kb2VzLW1vZHVsdXMtb3BlcmF0b3ItcmV0dXJuLWZyYWN0aW9uYWwtbnVtYmVyLWluLWphdmFzY3JpcHQvMzE3MTEwMzQjMzE3MTEwMzRcbmZ1bmN0aW9uIGZsb2F0U2FmZVJlbWFpbmRlcih2YWwsIHN0ZXApIHtcbiAgICBjb25zdCB2YWxEZWNDb3VudCA9ICh2YWwudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0gfHwgXCJcIikubGVuZ3RoO1xuICAgIGNvbnN0IHN0ZXBEZWNDb3VudCA9IChzdGVwLnRvU3RyaW5nKCkuc3BsaXQoXCIuXCIpWzFdIHx8IFwiXCIpLmxlbmd0aDtcbiAgICBjb25zdCBkZWNDb3VudCA9IHZhbERlY0NvdW50ID4gc3RlcERlY0NvdW50ID8gdmFsRGVjQ291bnQgOiBzdGVwRGVjQ291bnQ7XG4gICAgY29uc3QgdmFsSW50ID0gTnVtYmVyLnBhcnNlSW50KHZhbC50b0ZpeGVkKGRlY0NvdW50KS5yZXBsYWNlKFwiLlwiLCBcIlwiKSk7XG4gICAgY29uc3Qgc3RlcEludCA9IE51bWJlci5wYXJzZUludChzdGVwLnRvRml4ZWQoZGVjQ291bnQpLnJlcGxhY2UoXCIuXCIsIFwiXCIpKTtcbiAgICByZXR1cm4gKHZhbEludCAlIHN0ZXBJbnQpIC8gMTAgKiogZGVjQ291bnQ7XG59XG5leHBvcnQgY2xhc3MgWm9kTnVtYmVyIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMubWluID0gdGhpcy5ndGU7XG4gICAgICAgIHRoaXMubWF4ID0gdGhpcy5sdGU7XG4gICAgICAgIHRoaXMuc3RlcCA9IHRoaXMubXVsdGlwbGVPZjtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGlmICh0aGlzLl9kZWYuY29lcmNlKSB7XG4gICAgICAgICAgICBpbnB1dC5kYXRhID0gTnVtYmVyKGlucHV0LmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhcnNlZFR5cGUgPSB0aGlzLl9nZXRUeXBlKGlucHV0KTtcbiAgICAgICAgaWYgKHBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUubnVtYmVyKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLm51bWJlcixcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGxldCBjdHggPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IG5ldyBQYXJzZVN0YXR1cygpO1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaGVjay5raW5kID09PSBcImludFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF1dGlsLmlzSW50ZWdlcihpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFwiaW50ZWdlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IFwiZmxvYXRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vU21hbGwgPSBjaGVjay5pbmNsdXNpdmUgPyBpbnB1dC5kYXRhIDwgY2hlY2sudmFsdWUgOiBpbnB1dC5kYXRhIDw9IGNoZWNrLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0b29TbWFsbCkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX3NtYWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogY2hlY2sudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm51bWJlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiBjaGVjay5pbmNsdXNpdmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJtYXhcIikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb0JpZyA9IGNoZWNrLmluY2x1c2l2ZSA/IGlucHV0LmRhdGEgPiBjaGVjay52YWx1ZSA6IGlucHV0LmRhdGEgPj0gY2hlY2sudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHRvb0JpZykge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX2JpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heGltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJudW1iZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogY2hlY2suaW5jbHVzaXZlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhhY3Q6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwibXVsdGlwbGVPZlwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZsb2F0U2FmZVJlbWFpbmRlcihpbnB1dC5kYXRhLCBjaGVjay52YWx1ZSkgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLm5vdF9tdWx0aXBsZV9vZixcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpcGxlT2Y6IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiZmluaXRlXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIU51bWJlci5pc0Zpbml0ZShpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUubm90X2Zpbml0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1dGlsLmFzc2VydE5ldmVyKGNoZWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGlucHV0LmRhdGEgfTtcbiAgICB9XG4gICAgZ3RlKHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldExpbWl0KFwibWluXCIsIHZhbHVlLCB0cnVlLCBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkpO1xuICAgIH1cbiAgICBndCh2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRMaW1pdChcIm1pblwiLCB2YWx1ZSwgZmFsc2UsIGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSk7XG4gICAgfVxuICAgIGx0ZSh2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRMaW1pdChcIm1heFwiLCB2YWx1ZSwgdHJ1ZSwgZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpKTtcbiAgICB9XG4gICAgbHQodmFsdWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0TGltaXQoXCJtYXhcIiwgdmFsdWUsIGZhbHNlLCBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkpO1xuICAgIH1cbiAgICBzZXRMaW1pdChraW5kLCB2YWx1ZSwgaW5jbHVzaXZlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kTnVtYmVyKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGNoZWNrczogW1xuICAgICAgICAgICAgICAgIC4uLnRoaXMuX2RlZi5jaGVja3MsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBraW5kLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBfYWRkQ2hlY2soY2hlY2spIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2ROdW1iZXIoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgY2hlY2tzOiBbLi4udGhpcy5fZGVmLmNoZWNrcywgY2hlY2tdLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgaW50KG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwiaW50XCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBwb3NpdGl2ZShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1pblwiLFxuICAgICAgICAgICAgdmFsdWU6IDAsXG4gICAgICAgICAgICBpbmNsdXNpdmU6IGZhbHNlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbmVnYXRpdmUobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtYXhcIixcbiAgICAgICAgICAgIHZhbHVlOiAwLFxuICAgICAgICAgICAgaW5jbHVzaXZlOiBmYWxzZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG5vbnBvc2l0aXZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWF4XCIsXG4gICAgICAgICAgICB2YWx1ZTogMCxcbiAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG5vbm5lZ2F0aXZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWluXCIsXG4gICAgICAgICAgICB2YWx1ZTogMCxcbiAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG11bHRpcGxlT2YodmFsdWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibXVsdGlwbGVPZlwiLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZmluaXRlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwiZmluaXRlXCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzYWZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWluXCIsXG4gICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZTogTnVtYmVyLk1JTl9TQUZFX0lOVEVHRVIsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1heFwiLFxuICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgdmFsdWU6IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0IG1pblZhbHVlKCkge1xuICAgICAgICBsZXQgbWluID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2gua2luZCA9PT0gXCJtaW5cIikge1xuICAgICAgICAgICAgICAgIGlmIChtaW4gPT09IG51bGwgfHwgY2gudmFsdWUgPiBtaW4pXG4gICAgICAgICAgICAgICAgICAgIG1pbiA9IGNoLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtaW47XG4gICAgfVxuICAgIGdldCBtYXhWYWx1ZSgpIHtcbiAgICAgICAgbGV0IG1heCA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgdGhpcy5fZGVmLmNoZWNrcykge1xuICAgICAgICAgICAgaWYgKGNoLmtpbmQgPT09IFwibWF4XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAobWF4ID09PSBudWxsIHx8IGNoLnZhbHVlIDwgbWF4KVxuICAgICAgICAgICAgICAgICAgICBtYXggPSBjaC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF4O1xuICAgIH1cbiAgICBnZXQgaXNJbnQoKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwiaW50XCIgfHwgKGNoLmtpbmQgPT09IFwibXVsdGlwbGVPZlwiICYmIHV0aWwuaXNJbnRlZ2VyKGNoLnZhbHVlKSkpO1xuICAgIH1cbiAgICBnZXQgaXNGaW5pdGUoKSB7XG4gICAgICAgIGxldCBtYXggPSBudWxsO1xuICAgICAgICBsZXQgbWluID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2gua2luZCA9PT0gXCJmaW5pdGVcIiB8fCBjaC5raW5kID09PSBcImludFwiIHx8IGNoLmtpbmQgPT09IFwibXVsdGlwbGVPZlwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaC5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1pbiA9PT0gbnVsbCB8fCBjaC52YWx1ZSA+IG1pbilcbiAgICAgICAgICAgICAgICAgICAgbWluID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaC5raW5kID09PSBcIm1heFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1heCA9PT0gbnVsbCB8fCBjaC52YWx1ZSA8IG1heClcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShtaW4pICYmIE51bWJlci5pc0Zpbml0ZShtYXgpO1xuICAgIH1cbn1cblpvZE51bWJlci5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2ROdW1iZXIoe1xuICAgICAgICBjaGVja3M6IFtdLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE51bWJlcixcbiAgICAgICAgY29lcmNlOiBwYXJhbXM/LmNvZXJjZSB8fCBmYWxzZSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RCaWdJbnQgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5taW4gPSB0aGlzLmd0ZTtcbiAgICAgICAgdGhpcy5tYXggPSB0aGlzLmx0ZTtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGlmICh0aGlzLl9kZWYuY29lcmNlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlucHV0LmRhdGEgPSBCaWdJbnQoaW5wdXQuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dldEludmFsaWRJbnB1dChpbnB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5iaWdpbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nZXRJbnZhbGlkSW5wdXQoaW5wdXQpO1xuICAgICAgICB9XG4gICAgICAgIGxldCBjdHggPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IG5ldyBQYXJzZVN0YXR1cygpO1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaGVjay5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vU21hbGwgPSBjaGVjay5pbmNsdXNpdmUgPyBpbnB1dC5kYXRhIDwgY2hlY2sudmFsdWUgOiBpbnB1dC5kYXRhIDw9IGNoZWNrLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0b29TbWFsbCkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX3NtYWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJiaWdpbnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiBjaGVjay5pbmNsdXNpdmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJtYXhcIikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb0JpZyA9IGNoZWNrLmluY2x1c2l2ZSA/IGlucHV0LmRhdGEgPiBjaGVjay52YWx1ZSA6IGlucHV0LmRhdGEgPj0gY2hlY2sudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHRvb0JpZykge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX2JpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYmlnaW50XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogY2hlY2suaW5jbHVzaXZlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwibXVsdGlwbGVPZlwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmRhdGEgJSBjaGVjay52YWx1ZSAhPT0gQmlnSW50KDApKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5ub3RfbXVsdGlwbGVfb2YsXG4gICAgICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZU9mOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1dGlsLmFzc2VydE5ldmVyKGNoZWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGlucHV0LmRhdGEgfTtcbiAgICB9XG4gICAgX2dldEludmFsaWRJbnB1dChpbnB1dCkge1xuICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLmJpZ2ludCxcbiAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgIH1cbiAgICBndGUodmFsdWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0TGltaXQoXCJtaW5cIiwgdmFsdWUsIHRydWUsIGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSk7XG4gICAgfVxuICAgIGd0KHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldExpbWl0KFwibWluXCIsIHZhbHVlLCBmYWxzZSwgZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpKTtcbiAgICB9XG4gICAgbHRlKHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldExpbWl0KFwibWF4XCIsIHZhbHVlLCB0cnVlLCBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkpO1xuICAgIH1cbiAgICBsdCh2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRMaW1pdChcIm1heFwiLCB2YWx1ZSwgZmFsc2UsIGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSk7XG4gICAgfVxuICAgIHNldExpbWl0KGtpbmQsIHZhbHVlLCBpbmNsdXNpdmUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RCaWdJbnQoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgY2hlY2tzOiBbXG4gICAgICAgICAgICAgICAgLi4udGhpcy5fZGVmLmNoZWNrcyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIF9hZGRDaGVjayhjaGVjaykge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEJpZ0ludCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBjaGVja3M6IFsuLi50aGlzLl9kZWYuY2hlY2tzLCBjaGVja10sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBwb3NpdGl2ZShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1pblwiLFxuICAgICAgICAgICAgdmFsdWU6IEJpZ0ludCgwKSxcbiAgICAgICAgICAgIGluY2x1c2l2ZTogZmFsc2UsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBuZWdhdGl2ZShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1heFwiLFxuICAgICAgICAgICAgdmFsdWU6IEJpZ0ludCgwKSxcbiAgICAgICAgICAgIGluY2x1c2l2ZTogZmFsc2UsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBub25wb3NpdGl2ZShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1heFwiLFxuICAgICAgICAgICAgdmFsdWU6IEJpZ0ludCgwKSxcbiAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG5vbm5lZ2F0aXZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWluXCIsXG4gICAgICAgICAgICB2YWx1ZTogQmlnSW50KDApLFxuICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbXVsdGlwbGVPZih2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtdWx0aXBsZU9mXCIsXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldCBtaW5WYWx1ZSgpIHtcbiAgICAgICAgbGV0IG1pbiA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgdGhpcy5fZGVmLmNoZWNrcykge1xuICAgICAgICAgICAgaWYgKGNoLmtpbmQgPT09IFwibWluXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAobWluID09PSBudWxsIHx8IGNoLnZhbHVlID4gbWluKVxuICAgICAgICAgICAgICAgICAgICBtaW4gPSBjaC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWluO1xuICAgIH1cbiAgICBnZXQgbWF4VmFsdWUoKSB7XG4gICAgICAgIGxldCBtYXggPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaC5raW5kID09PSBcIm1heFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1heCA9PT0gbnVsbCB8fCBjaC52YWx1ZSA8IG1heClcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1heDtcbiAgICB9XG59XG5ab2RCaWdJbnQuY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kQmlnSW50KHtcbiAgICAgICAgY2hlY2tzOiBbXSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RCaWdJbnQsXG4gICAgICAgIGNvZXJjZTogcGFyYW1zPy5jb2VyY2UgPz8gZmFsc2UsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kQm9vbGVhbiBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBpZiAodGhpcy5fZGVmLmNvZXJjZSkge1xuICAgICAgICAgICAgaW5wdXQuZGF0YSA9IEJvb2xlYW4oaW5wdXQuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5ib29sZWFuKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLmJvb2xlYW4sXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT0soaW5wdXQuZGF0YSk7XG4gICAgfVxufVxuWm9kQm9vbGVhbi5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RCb29sZWFuKHtcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RCb29sZWFuLFxuICAgICAgICBjb2VyY2U6IHBhcmFtcz8uY29lcmNlIHx8IGZhbHNlLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZERhdGUgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RlZi5jb2VyY2UpIHtcbiAgICAgICAgICAgIGlucHV0LmRhdGEgPSBuZXcgRGF0ZShpbnB1dC5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLmRhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUuZGF0ZSxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4oaW5wdXQuZGF0YS5nZXRUaW1lKCkpKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9kYXRlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzdGF0dXMgPSBuZXcgUGFyc2VTdGF0dXMoKTtcbiAgICAgICAgbGV0IGN0eCA9IHVuZGVmaW5lZDtcbiAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2hlY2sua2luZCA9PT0gXCJtaW5cIikge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5kYXRhLmdldFRpbWUoKSA8IGNoZWNrLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fc21hbGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhhY3Q6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogY2hlY2sudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImRhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwibWF4XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuZGF0YS5nZXRUaW1lKCkgPiBjaGVjay52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX2JpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiZGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdXRpbC5hc3NlcnROZXZlcihjaGVjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXR1czogc3RhdHVzLnZhbHVlLFxuICAgICAgICAgICAgdmFsdWU6IG5ldyBEYXRlKGlucHV0LmRhdGEuZ2V0VGltZSgpKSxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgX2FkZENoZWNrKGNoZWNrKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kRGF0ZSh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBjaGVja3M6IFsuLi50aGlzLl9kZWYuY2hlY2tzLCBjaGVja10sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBtaW4obWluRGF0ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtaW5cIixcbiAgICAgICAgICAgIHZhbHVlOiBtaW5EYXRlLmdldFRpbWUoKSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG1heChtYXhEYXRlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1heFwiLFxuICAgICAgICAgICAgdmFsdWU6IG1heERhdGUuZ2V0VGltZSgpLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0IG1pbkRhdGUoKSB7XG4gICAgICAgIGxldCBtaW4gPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaC5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1pbiA9PT0gbnVsbCB8fCBjaC52YWx1ZSA+IG1pbilcbiAgICAgICAgICAgICAgICAgICAgbWluID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1pbiAhPSBudWxsID8gbmV3IERhdGUobWluKSA6IG51bGw7XG4gICAgfVxuICAgIGdldCBtYXhEYXRlKCkge1xuICAgICAgICBsZXQgbWF4ID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2gua2luZCA9PT0gXCJtYXhcIikge1xuICAgICAgICAgICAgICAgIGlmIChtYXggPT09IG51bGwgfHwgY2gudmFsdWUgPCBtYXgpXG4gICAgICAgICAgICAgICAgICAgIG1heCA9IGNoLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYXggIT0gbnVsbCA/IG5ldyBEYXRlKG1heCkgOiBudWxsO1xuICAgIH1cbn1cblpvZERhdGUuY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kRGF0ZSh7XG4gICAgICAgIGNoZWNrczogW10sXG4gICAgICAgIGNvZXJjZTogcGFyYW1zPy5jb2VyY2UgfHwgZmFsc2UsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kRGF0ZSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RTeW1ib2wgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5zeW1ib2wpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUuc3ltYm9sLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE9LKGlucHV0LmRhdGEpO1xuICAgIH1cbn1cblpvZFN5bWJvbC5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RTeW1ib2woe1xuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFN5bWJvbCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RVbmRlZmluZWQgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS51bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUudW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE9LKGlucHV0LmRhdGEpO1xuICAgIH1cbn1cblpvZFVuZGVmaW5lZC5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RVbmRlZmluZWQoe1xuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFVuZGVmaW5lZCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2ROdWxsIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHBhcnNlZFR5cGUgPSB0aGlzLl9nZXRUeXBlKGlucHV0KTtcbiAgICAgICAgaWYgKHBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUubnVsbCkge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5udWxsLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE9LKGlucHV0LmRhdGEpO1xuICAgIH1cbn1cblpvZE51bGwuY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kTnVsbCh7XG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kTnVsbCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RBbnkgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgLy8gdG8gcHJldmVudCBpbnN0YW5jZXMgb2Ygb3RoZXIgY2xhc3NlcyBmcm9tIGV4dGVuZGluZyBab2RBbnkuIHRoaXMgY2F1c2VzIGlzc3VlcyB3aXRoIGNhdGNoYWxsIGluIFpvZE9iamVjdC5cbiAgICAgICAgdGhpcy5fYW55ID0gdHJ1ZTtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBPSyhpbnB1dC5kYXRhKTtcbiAgICB9XG59XG5ab2RBbnkuY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kQW55KHtcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RBbnksXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kVW5rbm93biBleHRlbmRzIFpvZFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICAvLyByZXF1aXJlZFxuICAgICAgICB0aGlzLl91bmtub3duID0gdHJ1ZTtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBPSyhpbnB1dC5kYXRhKTtcbiAgICB9XG59XG5ab2RVbmtub3duLmNyZWF0ZSA9IChwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZFVua25vd24oe1xuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFVua25vd24sXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kTmV2ZXIgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5uZXZlcixcbiAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgIH1cbn1cblpvZE5ldmVyLmNyZWF0ZSA9IChwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE5ldmVyKHtcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2ROZXZlcixcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RWb2lkIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHBhcnNlZFR5cGUgPSB0aGlzLl9nZXRUeXBlKGlucHV0KTtcbiAgICAgICAgaWYgKHBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUudW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLnZvaWQsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT0soaW5wdXQuZGF0YSk7XG4gICAgfVxufVxuWm9kVm9pZC5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RWb2lkKHtcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RWb2lkLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZEFycmF5IGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgY3R4LCBzdGF0dXMgfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGNvbnN0IGRlZiA9IHRoaXMuX2RlZjtcbiAgICAgICAgaWYgKGN0eC5wYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLmFycmF5KSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLmFycmF5LFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlZi5leGFjdExlbmd0aCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc3QgdG9vQmlnID0gY3R4LmRhdGEubGVuZ3RoID4gZGVmLmV4YWN0TGVuZ3RoLnZhbHVlO1xuICAgICAgICAgICAgY29uc3QgdG9vU21hbGwgPSBjdHguZGF0YS5sZW5ndGggPCBkZWYuZXhhY3RMZW5ndGgudmFsdWU7XG4gICAgICAgICAgICBpZiAodG9vQmlnIHx8IHRvb1NtYWxsKSB7XG4gICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IHRvb0JpZyA/IFpvZElzc3VlQ29kZS50b29fYmlnIDogWm9kSXNzdWVDb2RlLnRvb19zbWFsbCxcbiAgICAgICAgICAgICAgICAgICAgbWluaW11bTogKHRvb1NtYWxsID8gZGVmLmV4YWN0TGVuZ3RoLnZhbHVlIDogdW5kZWZpbmVkKSxcbiAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogKHRvb0JpZyA/IGRlZi5leGFjdExlbmd0aC52YWx1ZSA6IHVuZGVmaW5lZCksXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBleGFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZGVmLmV4YWN0TGVuZ3RoLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlZi5taW5MZW5ndGggIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChjdHguZGF0YS5sZW5ndGggPCBkZWYubWluTGVuZ3RoLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fc21hbGwsXG4gICAgICAgICAgICAgICAgICAgIG1pbmltdW06IGRlZi5taW5MZW5ndGgudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZi5taW5MZW5ndGgubWVzc2FnZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVmLm1heExlbmd0aCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGN0eC5kYXRhLmxlbmd0aCA+IGRlZi5tYXhMZW5ndGgudmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19iaWcsXG4gICAgICAgICAgICAgICAgICAgIG1heGltdW06IGRlZi5tYXhMZW5ndGgudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZi5tYXhMZW5ndGgubWVzc2FnZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFsuLi5jdHguZGF0YV0ubWFwKChpdGVtLCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZi50eXBlLl9wYXJzZUFzeW5jKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCBpdGVtLCBjdHgucGF0aCwgaSkpO1xuICAgICAgICAgICAgfSkpLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZUFycmF5KHN0YXR1cywgcmVzdWx0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFsuLi5jdHguZGF0YV0ubWFwKChpdGVtLCBpKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZGVmLnR5cGUuX3BhcnNlU3luYyhuZXcgUGFyc2VJbnB1dExhenlQYXRoKGN0eCwgaXRlbSwgY3R4LnBhdGgsIGkpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZUFycmF5KHN0YXR1cywgcmVzdWx0KTtcbiAgICB9XG4gICAgZ2V0IGVsZW1lbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYudHlwZTtcbiAgICB9XG4gICAgbWluKG1pbkxlbmd0aCwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEFycmF5KHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIG1pbkxlbmd0aDogeyB2YWx1ZTogbWluTGVuZ3RoLCBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG1heChtYXhMZW5ndGgsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RBcnJheSh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBtYXhMZW5ndGg6IHsgdmFsdWU6IG1heExlbmd0aCwgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBsZW5ndGgobGVuLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kQXJyYXkoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgZXhhY3RMZW5ndGg6IHsgdmFsdWU6IGxlbiwgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBub25lbXB0eShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1pbigxLCBtZXNzYWdlKTtcbiAgICB9XG59XG5ab2RBcnJheS5jcmVhdGUgPSAoc2NoZW1hLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZEFycmF5KHtcbiAgICAgICAgdHlwZTogc2NoZW1hLFxuICAgICAgICBtaW5MZW5ndGg6IG51bGwsXG4gICAgICAgIG1heExlbmd0aDogbnVsbCxcbiAgICAgICAgZXhhY3RMZW5ndGg6IG51bGwsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kQXJyYXksXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5mdW5jdGlvbiBkZWVwUGFydGlhbGlmeShzY2hlbWEpIHtcbiAgICBpZiAoc2NoZW1hIGluc3RhbmNlb2YgWm9kT2JqZWN0KSB7XG4gICAgICAgIGNvbnN0IG5ld1NoYXBlID0ge307XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIHNjaGVtYS5zaGFwZSkge1xuICAgICAgICAgICAgY29uc3QgZmllbGRTY2hlbWEgPSBzY2hlbWEuc2hhcGVba2V5XTtcbiAgICAgICAgICAgIG5ld1NoYXBlW2tleV0gPSBab2RPcHRpb25hbC5jcmVhdGUoZGVlcFBhcnRpYWxpZnkoZmllbGRTY2hlbWEpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi5zY2hlbWEuX2RlZixcbiAgICAgICAgICAgIHNoYXBlOiAoKSA9PiBuZXdTaGFwZSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIFpvZEFycmF5KSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kQXJyYXkoe1xuICAgICAgICAgICAgLi4uc2NoZW1hLl9kZWYsXG4gICAgICAgICAgICB0eXBlOiBkZWVwUGFydGlhbGlmeShzY2hlbWEuZWxlbWVudCksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBab2RPcHRpb25hbCkge1xuICAgICAgICByZXR1cm4gWm9kT3B0aW9uYWwuY3JlYXRlKGRlZXBQYXJ0aWFsaWZ5KHNjaGVtYS51bndyYXAoKSkpO1xuICAgIH1cbiAgICBlbHNlIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBab2ROdWxsYWJsZSkge1xuICAgICAgICByZXR1cm4gWm9kTnVsbGFibGUuY3JlYXRlKGRlZXBQYXJ0aWFsaWZ5KHNjaGVtYS51bndyYXAoKSkpO1xuICAgIH1cbiAgICBlbHNlIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBab2RUdXBsZSkge1xuICAgICAgICByZXR1cm4gWm9kVHVwbGUuY3JlYXRlKHNjaGVtYS5pdGVtcy5tYXAoKGl0ZW0pID0+IGRlZXBQYXJ0aWFsaWZ5KGl0ZW0pKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gc2NoZW1hO1xuICAgIH1cbn1cbmV4cG9ydCBjbGFzcyBab2RPYmplY3QgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5fY2FjaGVkID0gbnVsbDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXByZWNhdGVkIEluIG1vc3QgY2FzZXMsIHRoaXMgaXMgbm8gbG9uZ2VyIG5lZWRlZCAtIHVua25vd24gcHJvcGVydGllcyBhcmUgbm93IHNpbGVudGx5IHN0cmlwcGVkLlxuICAgICAgICAgKiBJZiB5b3Ugd2FudCB0byBwYXNzIHRocm91Z2ggdW5rbm93biBwcm9wZXJ0aWVzLCB1c2UgYC5wYXNzdGhyb3VnaCgpYCBpbnN0ZWFkLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5ub25zdHJpY3QgPSB0aGlzLnBhc3N0aHJvdWdoO1xuICAgICAgICAvLyBleHRlbmQ8XG4gICAgICAgIC8vICAgQXVnbWVudGF0aW9uIGV4dGVuZHMgWm9kUmF3U2hhcGUsXG4gICAgICAgIC8vICAgTmV3T3V0cHV0IGV4dGVuZHMgdXRpbC5mbGF0dGVuPHtcbiAgICAgICAgLy8gICAgIFtrIGluIGtleW9mIEF1Z21lbnRhdGlvbiB8IGtleW9mIE91dHB1dF06IGsgZXh0ZW5kcyBrZXlvZiBBdWdtZW50YXRpb25cbiAgICAgICAgLy8gICAgICAgPyBBdWdtZW50YXRpb25ba11bXCJfb3V0cHV0XCJdXG4gICAgICAgIC8vICAgICAgIDogayBleHRlbmRzIGtleW9mIE91dHB1dFxuICAgICAgICAvLyAgICAgICA/IE91dHB1dFtrXVxuICAgICAgICAvLyAgICAgICA6IG5ldmVyO1xuICAgICAgICAvLyAgIH0+LFxuICAgICAgICAvLyAgIE5ld0lucHV0IGV4dGVuZHMgdXRpbC5mbGF0dGVuPHtcbiAgICAgICAgLy8gICAgIFtrIGluIGtleW9mIEF1Z21lbnRhdGlvbiB8IGtleW9mIElucHV0XTogayBleHRlbmRzIGtleW9mIEF1Z21lbnRhdGlvblxuICAgICAgICAvLyAgICAgICA/IEF1Z21lbnRhdGlvbltrXVtcIl9pbnB1dFwiXVxuICAgICAgICAvLyAgICAgICA6IGsgZXh0ZW5kcyBrZXlvZiBJbnB1dFxuICAgICAgICAvLyAgICAgICA/IElucHV0W2tdXG4gICAgICAgIC8vICAgICAgIDogbmV2ZXI7XG4gICAgICAgIC8vICAgfT5cbiAgICAgICAgLy8gPihcbiAgICAgICAgLy8gICBhdWdtZW50YXRpb246IEF1Z21lbnRhdGlvblxuICAgICAgICAvLyApOiBab2RPYmplY3Q8XG4gICAgICAgIC8vICAgZXh0ZW5kU2hhcGU8VCwgQXVnbWVudGF0aW9uPixcbiAgICAgICAgLy8gICBVbmtub3duS2V5cyxcbiAgICAgICAgLy8gICBDYXRjaGFsbCxcbiAgICAgICAgLy8gICBOZXdPdXRwdXQsXG4gICAgICAgIC8vICAgTmV3SW5wdXRcbiAgICAgICAgLy8gPiB7XG4gICAgICAgIC8vICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAvLyAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAvLyAgICAgc2hhcGU6ICgpID0+ICh7XG4gICAgICAgIC8vICAgICAgIC4uLnRoaXMuX2RlZi5zaGFwZSgpLFxuICAgICAgICAvLyAgICAgICAuLi5hdWdtZW50YXRpb24sXG4gICAgICAgIC8vICAgICB9KSxcbiAgICAgICAgLy8gICB9KSBhcyBhbnk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXByZWNhdGVkIFVzZSBgLmV4dGVuZGAgaW5zdGVhZFxuICAgICAgICAgKiAgKi9cbiAgICAgICAgdGhpcy5hdWdtZW50ID0gdGhpcy5leHRlbmQ7XG4gICAgfVxuICAgIF9nZXRDYWNoZWQoKSB7XG4gICAgICAgIGlmICh0aGlzLl9jYWNoZWQgIT09IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGVkO1xuICAgICAgICBjb25zdCBzaGFwZSA9IHRoaXMuX2RlZi5zaGFwZSgpO1xuICAgICAgICBjb25zdCBrZXlzID0gdXRpbC5vYmplY3RLZXlzKHNoYXBlKTtcbiAgICAgICAgdGhpcy5fY2FjaGVkID0geyBzaGFwZSwga2V5cyB9O1xuICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGVkO1xuICAgIH1cbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5vYmplY3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUub2JqZWN0LFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgeyBzdGF0dXMsIGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgY29uc3QgeyBzaGFwZSwga2V5czogc2hhcGVLZXlzIH0gPSB0aGlzLl9nZXRDYWNoZWQoKTtcbiAgICAgICAgY29uc3QgZXh0cmFLZXlzID0gW107XG4gICAgICAgIGlmICghKHRoaXMuX2RlZi5jYXRjaGFsbCBpbnN0YW5jZW9mIFpvZE5ldmVyICYmIHRoaXMuX2RlZi51bmtub3duS2V5cyA9PT0gXCJzdHJpcFwiKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gY3R4LmRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXNoYXBlS2V5cy5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhS2V5cy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhaXJzID0gW107XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHNoYXBlS2V5cykge1xuICAgICAgICAgICAgY29uc3Qga2V5VmFsaWRhdG9yID0gc2hhcGVba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY3R4LmRhdGFba2V5XTtcbiAgICAgICAgICAgIHBhaXJzLnB1c2goe1xuICAgICAgICAgICAgICAgIGtleTogeyBzdGF0dXM6IFwidmFsaWRcIiwgdmFsdWU6IGtleSB9LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBrZXlWYWxpZGF0b3IuX3BhcnNlKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCB2YWx1ZSwgY3R4LnBhdGgsIGtleSkpLFxuICAgICAgICAgICAgICAgIGFsd2F5c1NldDoga2V5IGluIGN0eC5kYXRhLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2RlZi5jYXRjaGFsbCBpbnN0YW5jZW9mIFpvZE5ldmVyKSB7XG4gICAgICAgICAgICBjb25zdCB1bmtub3duS2V5cyA9IHRoaXMuX2RlZi51bmtub3duS2V5cztcbiAgICAgICAgICAgIGlmICh1bmtub3duS2V5cyA9PT0gXCJwYXNzdGhyb3VnaFwiKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgZXh0cmFLZXlzKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiB7IHN0YXR1czogXCJ2YWxpZFwiLCB2YWx1ZToga2V5IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyBzdGF0dXM6IFwidmFsaWRcIiwgdmFsdWU6IGN0eC5kYXRhW2tleV0gfSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodW5rbm93bktleXMgPT09IFwic3RyaWN0XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXh0cmFLZXlzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudW5yZWNvZ25pemVkX2tleXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzOiBleHRyYUtleXMsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bmtub3duS2V5cyA9PT0gXCJzdHJpcFwiKSB7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGVybmFsIFpvZE9iamVjdCBlcnJvcjogaW52YWxpZCB1bmtub3duS2V5cyB2YWx1ZS5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIHJ1biBjYXRjaGFsbCB2YWxpZGF0aW9uXG4gICAgICAgICAgICBjb25zdCBjYXRjaGFsbCA9IHRoaXMuX2RlZi5jYXRjaGFsbDtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGV4dHJhS2V5cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY3R4LmRhdGFba2V5XTtcbiAgICAgICAgICAgICAgICBwYWlycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAga2V5OiB7IHN0YXR1czogXCJ2YWxpZFwiLCB2YWx1ZToga2V5IH0sXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBjYXRjaGFsbC5fcGFyc2UobmV3IFBhcnNlSW5wdXRMYXp5UGF0aChjdHgsIHZhbHVlLCBjdHgucGF0aCwga2V5KSAvLywgY3R4LmNoaWxkKGtleSksIHZhbHVlLCBnZXRQYXJzZWRUeXBlKHZhbHVlKVxuICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICBhbHdheXNTZXQ6IGtleSBpbiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAgICAgICAgICAgLnRoZW4oYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN5bmNQYWlycyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBhd2FpdCBwYWlyLmtleTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCBwYWlyLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBzeW5jUGFpcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsd2F5c1NldDogcGFpci5hbHdheXNTZXQsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc3luY1BhaXJzO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAudGhlbigoc3luY1BhaXJzKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFBhcnNlU3RhdHVzLm1lcmdlT2JqZWN0U3luYyhzdGF0dXMsIHN5bmNQYWlycyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZU9iamVjdFN5bmMoc3RhdHVzLCBwYWlycyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ2V0IHNoYXBlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnNoYXBlKCk7XG4gICAgfVxuICAgIHN0cmljdChtZXNzYWdlKSB7XG4gICAgICAgIGVycm9yVXRpbC5lcnJUb09iajtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgdW5rbm93bktleXM6IFwic3RyaWN0XCIsXG4gICAgICAgICAgICAuLi4obWVzc2FnZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWFwOiAoaXNzdWUsIGN0eCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVmYXVsdEVycm9yID0gdGhpcy5fZGVmLmVycm9yTWFwPy4oaXNzdWUsIGN0eCkubWVzc2FnZSA/PyBjdHguZGVmYXVsdEVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzc3VlLmNvZGUgPT09IFwidW5yZWNvZ25pemVkX2tleXNcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkubWVzc2FnZSA/PyBkZWZhdWx0RXJyb3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZGVmYXVsdEVycm9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgOiB7fSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzdHJpcCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgdW5rbm93bktleXM6IFwic3RyaXBcIixcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHBhc3N0aHJvdWdoKCkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICB1bmtub3duS2V5czogXCJwYXNzdGhyb3VnaFwiLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gY29uc3QgQXVnbWVudEZhY3RvcnkgPVxuICAgIC8vICAgPERlZiBleHRlbmRzIFpvZE9iamVjdERlZj4oZGVmOiBEZWYpID0+XG4gICAgLy8gICA8QXVnbWVudGF0aW9uIGV4dGVuZHMgWm9kUmF3U2hhcGU+KFxuICAgIC8vICAgICBhdWdtZW50YXRpb246IEF1Z21lbnRhdGlvblxuICAgIC8vICAgKTogWm9kT2JqZWN0PFxuICAgIC8vICAgICBleHRlbmRTaGFwZTxSZXR1cm5UeXBlPERlZltcInNoYXBlXCJdPiwgQXVnbWVudGF0aW9uPixcbiAgICAvLyAgICAgRGVmW1widW5rbm93bktleXNcIl0sXG4gICAgLy8gICAgIERlZltcImNhdGNoYWxsXCJdXG4gICAgLy8gICA+ID0+IHtcbiAgICAvLyAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgIC8vICAgICAgIC4uLmRlZixcbiAgICAvLyAgICAgICBzaGFwZTogKCkgPT4gKHtcbiAgICAvLyAgICAgICAgIC4uLmRlZi5zaGFwZSgpLFxuICAgIC8vICAgICAgICAgLi4uYXVnbWVudGF0aW9uLFxuICAgIC8vICAgICAgIH0pLFxuICAgIC8vICAgICB9KSBhcyBhbnk7XG4gICAgLy8gICB9O1xuICAgIGV4dGVuZChhdWdtZW50YXRpb24pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgc2hhcGU6ICgpID0+ICh7XG4gICAgICAgICAgICAgICAgLi4udGhpcy5fZGVmLnNoYXBlKCksXG4gICAgICAgICAgICAgICAgLi4uYXVnbWVudGF0aW9uLFxuICAgICAgICAgICAgfSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcmlvciB0byB6b2RAMS4wLjEyIHRoZXJlIHdhcyBhIGJ1ZyBpbiB0aGVcbiAgICAgKiBpbmZlcnJlZCB0eXBlIG9mIG1lcmdlZCBvYmplY3RzLiBQbGVhc2VcbiAgICAgKiB1cGdyYWRlIGlmIHlvdSBhcmUgZXhwZXJpZW5jaW5nIGlzc3Vlcy5cbiAgICAgKi9cbiAgICBtZXJnZShtZXJnaW5nKSB7XG4gICAgICAgIGNvbnN0IG1lcmdlZCA9IG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgdW5rbm93bktleXM6IG1lcmdpbmcuX2RlZi51bmtub3duS2V5cyxcbiAgICAgICAgICAgIGNhdGNoYWxsOiBtZXJnaW5nLl9kZWYuY2F0Y2hhbGwsXG4gICAgICAgICAgICBzaGFwZTogKCkgPT4gKHtcbiAgICAgICAgICAgICAgICAuLi50aGlzLl9kZWYuc2hhcGUoKSxcbiAgICAgICAgICAgICAgICAuLi5tZXJnaW5nLl9kZWYuc2hhcGUoKSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RPYmplY3QsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbWVyZ2VkO1xuICAgIH1cbiAgICAvLyBtZXJnZTxcbiAgICAvLyAgIEluY29taW5nIGV4dGVuZHMgQW55Wm9kT2JqZWN0LFxuICAgIC8vICAgQXVnbWVudGF0aW9uIGV4dGVuZHMgSW5jb21pbmdbXCJzaGFwZVwiXSxcbiAgICAvLyAgIE5ld091dHB1dCBleHRlbmRzIHtcbiAgICAvLyAgICAgW2sgaW4ga2V5b2YgQXVnbWVudGF0aW9uIHwga2V5b2YgT3V0cHV0XTogayBleHRlbmRzIGtleW9mIEF1Z21lbnRhdGlvblxuICAgIC8vICAgICAgID8gQXVnbWVudGF0aW9uW2tdW1wiX291dHB1dFwiXVxuICAgIC8vICAgICAgIDogayBleHRlbmRzIGtleW9mIE91dHB1dFxuICAgIC8vICAgICAgID8gT3V0cHV0W2tdXG4gICAgLy8gICAgICAgOiBuZXZlcjtcbiAgICAvLyAgIH0sXG4gICAgLy8gICBOZXdJbnB1dCBleHRlbmRzIHtcbiAgICAvLyAgICAgW2sgaW4ga2V5b2YgQXVnbWVudGF0aW9uIHwga2V5b2YgSW5wdXRdOiBrIGV4dGVuZHMga2V5b2YgQXVnbWVudGF0aW9uXG4gICAgLy8gICAgICAgPyBBdWdtZW50YXRpb25ba11bXCJfaW5wdXRcIl1cbiAgICAvLyAgICAgICA6IGsgZXh0ZW5kcyBrZXlvZiBJbnB1dFxuICAgIC8vICAgICAgID8gSW5wdXRba11cbiAgICAvLyAgICAgICA6IG5ldmVyO1xuICAgIC8vICAgfVxuICAgIC8vID4oXG4gICAgLy8gICBtZXJnaW5nOiBJbmNvbWluZ1xuICAgIC8vICk6IFpvZE9iamVjdDxcbiAgICAvLyAgIGV4dGVuZFNoYXBlPFQsIFJldHVyblR5cGU8SW5jb21pbmdbXCJfZGVmXCJdW1wic2hhcGVcIl0+PixcbiAgICAvLyAgIEluY29taW5nW1wiX2RlZlwiXVtcInVua25vd25LZXlzXCJdLFxuICAgIC8vICAgSW5jb21pbmdbXCJfZGVmXCJdW1wiY2F0Y2hhbGxcIl0sXG4gICAgLy8gICBOZXdPdXRwdXQsXG4gICAgLy8gICBOZXdJbnB1dFxuICAgIC8vID4ge1xuICAgIC8vICAgY29uc3QgbWVyZ2VkOiBhbnkgPSBuZXcgWm9kT2JqZWN0KHtcbiAgICAvLyAgICAgdW5rbm93bktleXM6IG1lcmdpbmcuX2RlZi51bmtub3duS2V5cyxcbiAgICAvLyAgICAgY2F0Y2hhbGw6IG1lcmdpbmcuX2RlZi5jYXRjaGFsbCxcbiAgICAvLyAgICAgc2hhcGU6ICgpID0+XG4gICAgLy8gICAgICAgb2JqZWN0VXRpbC5tZXJnZVNoYXBlcyh0aGlzLl9kZWYuc2hhcGUoKSwgbWVyZ2luZy5fZGVmLnNoYXBlKCkpLFxuICAgIC8vICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE9iamVjdCxcbiAgICAvLyAgIH0pIGFzIGFueTtcbiAgICAvLyAgIHJldHVybiBtZXJnZWQ7XG4gICAgLy8gfVxuICAgIHNldEtleShrZXksIHNjaGVtYSkge1xuICAgICAgICByZXR1cm4gdGhpcy5hdWdtZW50KHsgW2tleV06IHNjaGVtYSB9KTtcbiAgICB9XG4gICAgLy8gbWVyZ2U8SW5jb21pbmcgZXh0ZW5kcyBBbnlab2RPYmplY3Q+KFxuICAgIC8vICAgbWVyZ2luZzogSW5jb21pbmdcbiAgICAvLyApOiAvL1pvZE9iamVjdDxUICYgSW5jb21pbmdbXCJfc2hhcGVcIl0sIFVua25vd25LZXlzLCBDYXRjaGFsbD4gPSAobWVyZ2luZykgPT4ge1xuICAgIC8vIFpvZE9iamVjdDxcbiAgICAvLyAgIGV4dGVuZFNoYXBlPFQsIFJldHVyblR5cGU8SW5jb21pbmdbXCJfZGVmXCJdW1wic2hhcGVcIl0+PixcbiAgICAvLyAgIEluY29taW5nW1wiX2RlZlwiXVtcInVua25vd25LZXlzXCJdLFxuICAgIC8vICAgSW5jb21pbmdbXCJfZGVmXCJdW1wiY2F0Y2hhbGxcIl1cbiAgICAvLyA+IHtcbiAgICAvLyAgIC8vIGNvbnN0IG1lcmdlZFNoYXBlID0gb2JqZWN0VXRpbC5tZXJnZVNoYXBlcyhcbiAgICAvLyAgIC8vICAgdGhpcy5fZGVmLnNoYXBlKCksXG4gICAgLy8gICAvLyAgIG1lcmdpbmcuX2RlZi5zaGFwZSgpXG4gICAgLy8gICAvLyApO1xuICAgIC8vICAgY29uc3QgbWVyZ2VkOiBhbnkgPSBuZXcgWm9kT2JqZWN0KHtcbiAgICAvLyAgICAgdW5rbm93bktleXM6IG1lcmdpbmcuX2RlZi51bmtub3duS2V5cyxcbiAgICAvLyAgICAgY2F0Y2hhbGw6IG1lcmdpbmcuX2RlZi5jYXRjaGFsbCxcbiAgICAvLyAgICAgc2hhcGU6ICgpID0+XG4gICAgLy8gICAgICAgb2JqZWN0VXRpbC5tZXJnZVNoYXBlcyh0aGlzLl9kZWYuc2hhcGUoKSwgbWVyZ2luZy5fZGVmLnNoYXBlKCkpLFxuICAgIC8vICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE9iamVjdCxcbiAgICAvLyAgIH0pIGFzIGFueTtcbiAgICAvLyAgIHJldHVybiBtZXJnZWQ7XG4gICAgLy8gfVxuICAgIGNhdGNoYWxsKGluZGV4KSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kT2JqZWN0KHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGNhdGNoYWxsOiBpbmRleCxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHBpY2sobWFzaykge1xuICAgICAgICBjb25zdCBzaGFwZSA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiB1dGlsLm9iamVjdEtleXMobWFzaykpIHtcbiAgICAgICAgICAgIGlmIChtYXNrW2tleV0gJiYgdGhpcy5zaGFwZVtrZXldKSB7XG4gICAgICAgICAgICAgICAgc2hhcGVba2V5XSA9IHRoaXMuc2hhcGVba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBzaGFwZTogKCkgPT4gc2hhcGUsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBvbWl0KG1hc2spIHtcbiAgICAgICAgY29uc3Qgc2hhcGUgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgdXRpbC5vYmplY3RLZXlzKHRoaXMuc2hhcGUpKSB7XG4gICAgICAgICAgICBpZiAoIW1hc2tba2V5XSkge1xuICAgICAgICAgICAgICAgIHNoYXBlW2tleV0gPSB0aGlzLnNoYXBlW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgc2hhcGU6ICgpID0+IHNoYXBlLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICBkZWVwUGFydGlhbCgpIHtcbiAgICAgICAgcmV0dXJuIGRlZXBQYXJ0aWFsaWZ5KHRoaXMpO1xuICAgIH1cbiAgICBwYXJ0aWFsKG1hc2spIHtcbiAgICAgICAgY29uc3QgbmV3U2hhcGUgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgdXRpbC5vYmplY3RLZXlzKHRoaXMuc2hhcGUpKSB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZFNjaGVtYSA9IHRoaXMuc2hhcGVba2V5XTtcbiAgICAgICAgICAgIGlmIChtYXNrICYmICFtYXNrW2tleV0pIHtcbiAgICAgICAgICAgICAgICBuZXdTaGFwZVtrZXldID0gZmllbGRTY2hlbWE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXdTaGFwZVtrZXldID0gZmllbGRTY2hlbWEub3B0aW9uYWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBzaGFwZTogKCkgPT4gbmV3U2hhcGUsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXF1aXJlZChtYXNrKSB7XG4gICAgICAgIGNvbnN0IG5ld1NoYXBlID0ge307XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHV0aWwub2JqZWN0S2V5cyh0aGlzLnNoYXBlKSkge1xuICAgICAgICAgICAgaWYgKG1hc2sgJiYgIW1hc2tba2V5XSkge1xuICAgICAgICAgICAgICAgIG5ld1NoYXBlW2tleV0gPSB0aGlzLnNoYXBlW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWVsZFNjaGVtYSA9IHRoaXMuc2hhcGVba2V5XTtcbiAgICAgICAgICAgICAgICBsZXQgbmV3RmllbGQgPSBmaWVsZFNjaGVtYTtcbiAgICAgICAgICAgICAgICB3aGlsZSAobmV3RmllbGQgaW5zdGFuY2VvZiBab2RPcHRpb25hbCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdGaWVsZCA9IG5ld0ZpZWxkLl9kZWYuaW5uZXJUeXBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXdTaGFwZVtrZXldID0gbmV3RmllbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgc2hhcGU6ICgpID0+IG5ld1NoYXBlLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAga2V5b2YoKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVab2RFbnVtKHV0aWwub2JqZWN0S2V5cyh0aGlzLnNoYXBlKSk7XG4gICAgfVxufVxuWm9kT2JqZWN0LmNyZWF0ZSA9IChzaGFwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICBzaGFwZTogKCkgPT4gc2hhcGUsXG4gICAgICAgIHVua25vd25LZXlzOiBcInN0cmlwXCIsXG4gICAgICAgIGNhdGNoYWxsOiBab2ROZXZlci5jcmVhdGUoKSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RPYmplY3QsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5ab2RPYmplY3Quc3RyaWN0Q3JlYXRlID0gKHNoYXBlLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgIHNoYXBlOiAoKSA9PiBzaGFwZSxcbiAgICAgICAgdW5rbm93bktleXM6IFwic3RyaWN0XCIsXG4gICAgICAgIGNhdGNoYWxsOiBab2ROZXZlci5jcmVhdGUoKSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RPYmplY3QsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5ab2RPYmplY3QubGF6eWNyZWF0ZSA9IChzaGFwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICBzaGFwZSxcbiAgICAgICAgdW5rbm93bktleXM6IFwic3RyaXBcIixcbiAgICAgICAgY2F0Y2hhbGw6IFpvZE5ldmVyLmNyZWF0ZSgpLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE9iamVjdCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RVbmlvbiBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMuX2RlZi5vcHRpb25zO1xuICAgICAgICBmdW5jdGlvbiBoYW5kbGVSZXN1bHRzKHJlc3VsdHMpIHtcbiAgICAgICAgICAgIC8vIHJldHVybiBmaXJzdCBpc3N1ZS1mcmVlIHZhbGlkYXRpb24gaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5yZXN1bHQuc3RhdHVzID09PSBcInZhbGlkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgcmVzdWx0cykge1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQucmVzdWx0LnN0YXR1cyA9PT0gXCJkaXJ0eVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBpc3N1ZXMgZnJvbSBkaXJ0eSBvcHRpb25cbiAgICAgICAgICAgICAgICAgICAgY3R4LmNvbW1vbi5pc3N1ZXMucHVzaCguLi5yZXN1bHQuY3R4LmNvbW1vbi5pc3N1ZXMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyByZXR1cm4gaW52YWxpZFxuICAgICAgICAgICAgY29uc3QgdW5pb25FcnJvcnMgPSByZXN1bHRzLm1hcCgocmVzdWx0KSA9PiBuZXcgWm9kRXJyb3IocmVzdWx0LmN0eC5jb21tb24uaXNzdWVzKSk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF91bmlvbixcbiAgICAgICAgICAgICAgICB1bmlvbkVycm9ycyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN0eC5jb21tb24uYXN5bmMpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChvcHRpb25zLm1hcChhc3luYyAob3B0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRDdHggPSB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgICAgICAgY29tbW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5jdHguY29tbW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWVzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBudWxsLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBhd2FpdCBvcHRpb24uX3BhcnNlQXN5bmMoe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogY2hpbGRDdHgsXG4gICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICBjdHg6IGNoaWxkQ3R4LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KSkudGhlbihoYW5kbGVSZXN1bHRzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxldCBkaXJ0eSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbnN0IGlzc3VlcyA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2Ygb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkQ3R4ID0ge1xuICAgICAgICAgICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICAgICAgICAgIGNvbW1vbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgLi4uY3R4LmNvbW1vbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzc3VlczogW10sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbnVsbCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG9wdGlvbi5fcGFyc2VTeW5jKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IGNoaWxkQ3R4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSBcInZhbGlkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAocmVzdWx0LnN0YXR1cyA9PT0gXCJkaXJ0eVwiICYmICFkaXJ0eSkge1xuICAgICAgICAgICAgICAgICAgICBkaXJ0eSA9IHsgcmVzdWx0LCBjdHg6IGNoaWxkQ3R4IH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjaGlsZEN0eC5jb21tb24uaXNzdWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaChjaGlsZEN0eC5jb21tb24uaXNzdWVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGlydHkpIHtcbiAgICAgICAgICAgICAgICBjdHguY29tbW9uLmlzc3Vlcy5wdXNoKC4uLmRpcnR5LmN0eC5jb21tb24uaXNzdWVzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGlydHkucmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdW5pb25FcnJvcnMgPSBpc3N1ZXMubWFwKChpc3N1ZXMpID0+IG5ldyBab2RFcnJvcihpc3N1ZXMpKTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3VuaW9uLFxuICAgICAgICAgICAgICAgIHVuaW9uRXJyb3JzLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBnZXQgb3B0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5vcHRpb25zO1xuICAgIH1cbn1cblpvZFVuaW9uLmNyZWF0ZSA9ICh0eXBlcywgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RVbmlvbih7XG4gICAgICAgIG9wdGlvbnM6IHR5cGVzLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFVuaW9uLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8vLy8vLy8vL1xuLy8vLy8vLy8vLyAgICAgIFpvZERpc2NyaW1pbmF0ZWRVbmlvbiAgICAgIC8vLy8vLy8vLy9cbi8vLy8vLy8vLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbmNvbnN0IGdldERpc2NyaW1pbmF0b3IgPSAodHlwZSkgPT4ge1xuICAgIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kTGF6eSkge1xuICAgICAgICByZXR1cm4gZ2V0RGlzY3JpbWluYXRvcih0eXBlLnNjaGVtYSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2RFZmZlY3RzKSB7XG4gICAgICAgIHJldHVybiBnZXREaXNjcmltaW5hdG9yKHR5cGUuaW5uZXJUeXBlKCkpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kTGl0ZXJhbCkge1xuICAgICAgICByZXR1cm4gW3R5cGUudmFsdWVdO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kRW51bSkge1xuICAgICAgICByZXR1cm4gdHlwZS5vcHRpb25zO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kTmF0aXZlRW51bSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgYmFuL2JhblxuICAgICAgICByZXR1cm4gdXRpbC5vYmplY3RWYWx1ZXModHlwZS5lbnVtKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSBpbnN0YW5jZW9mIFpvZERlZmF1bHQpIHtcbiAgICAgICAgcmV0dXJuIGdldERpc2NyaW1pbmF0b3IodHlwZS5fZGVmLmlubmVyVHlwZSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2RVbmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIFt1bmRlZmluZWRdO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kTnVsbCkge1xuICAgICAgICByZXR1cm4gW251bGxdO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kT3B0aW9uYWwpIHtcbiAgICAgICAgcmV0dXJuIFt1bmRlZmluZWQsIC4uLmdldERpc2NyaW1pbmF0b3IodHlwZS51bndyYXAoKSldO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kTnVsbGFibGUpIHtcbiAgICAgICAgcmV0dXJuIFtudWxsLCAuLi5nZXREaXNjcmltaW5hdG9yKHR5cGUudW53cmFwKCkpXTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSBpbnN0YW5jZW9mIFpvZEJyYW5kZWQpIHtcbiAgICAgICAgcmV0dXJuIGdldERpc2NyaW1pbmF0b3IodHlwZS51bndyYXAoKSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2RSZWFkb25seSkge1xuICAgICAgICByZXR1cm4gZ2V0RGlzY3JpbWluYXRvcih0eXBlLnVud3JhcCgpKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSBpbnN0YW5jZW9mIFpvZENhdGNoKSB7XG4gICAgICAgIHJldHVybiBnZXREaXNjcmltaW5hdG9yKHR5cGUuX2RlZi5pbm5lclR5cGUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbn07XG5leHBvcnQgY2xhc3MgWm9kRGlzY3JpbWluYXRlZFVuaW9uIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUub2JqZWN0KSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLm9iamVjdCxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpc2NyaW1pbmF0b3IgPSB0aGlzLmRpc2NyaW1pbmF0b3I7XG4gICAgICAgIGNvbnN0IGRpc2NyaW1pbmF0b3JWYWx1ZSA9IGN0eC5kYXRhW2Rpc2NyaW1pbmF0b3JdO1xuICAgICAgICBjb25zdCBvcHRpb24gPSB0aGlzLm9wdGlvbnNNYXAuZ2V0KGRpc2NyaW1pbmF0b3JWYWx1ZSk7XG4gICAgICAgIGlmICghb3B0aW9uKSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF91bmlvbl9kaXNjcmltaW5hdG9yLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IEFycmF5LmZyb20odGhpcy5vcHRpb25zTWFwLmtleXMoKSksXG4gICAgICAgICAgICAgICAgcGF0aDogW2Rpc2NyaW1pbmF0b3JdLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbi5fcGFyc2VBc3luYyh7XG4gICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRpb24uX3BhcnNlU3luYyh7XG4gICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBnZXQgZGlzY3JpbWluYXRvcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5kaXNjcmltaW5hdG9yO1xuICAgIH1cbiAgICBnZXQgb3B0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5vcHRpb25zO1xuICAgIH1cbiAgICBnZXQgb3B0aW9uc01hcCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5vcHRpb25zTWFwO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgY29uc3RydWN0b3Igb2YgdGhlIGRpc2NyaW1pbmF0ZWQgdW5pb24gc2NoZW1hLiBJdHMgYmVoYXZpb3VyIGlzIHZlcnkgc2ltaWxhciB0byB0aGF0IG9mIHRoZSBub3JtYWwgei51bmlvbigpIGNvbnN0cnVjdG9yLlxuICAgICAqIEhvd2V2ZXIsIGl0IG9ubHkgYWxsb3dzIGEgdW5pb24gb2Ygb2JqZWN0cywgYWxsIG9mIHdoaWNoIG5lZWQgdG8gc2hhcmUgYSBkaXNjcmltaW5hdG9yIHByb3BlcnR5LiBUaGlzIHByb3BlcnR5IG11c3RcbiAgICAgKiBoYXZlIGEgZGlmZmVyZW50IHZhbHVlIGZvciBlYWNoIG9iamVjdCBpbiB0aGUgdW5pb24uXG4gICAgICogQHBhcmFtIGRpc2NyaW1pbmF0b3IgdGhlIG5hbWUgb2YgdGhlIGRpc2NyaW1pbmF0b3IgcHJvcGVydHlcbiAgICAgKiBAcGFyYW0gdHlwZXMgYW4gYXJyYXkgb2Ygb2JqZWN0IHNjaGVtYXNcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICovXG4gICAgc3RhdGljIGNyZWF0ZShkaXNjcmltaW5hdG9yLCBvcHRpb25zLCBwYXJhbXMpIHtcbiAgICAgICAgLy8gR2V0IGFsbCB0aGUgdmFsaWQgZGlzY3JpbWluYXRvciB2YWx1ZXNcbiAgICAgICAgY29uc3Qgb3B0aW9uc01hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgLy8gdHJ5IHtcbiAgICAgICAgZm9yIChjb25zdCB0eXBlIG9mIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGRpc2NyaW1pbmF0b3JWYWx1ZXMgPSBnZXREaXNjcmltaW5hdG9yKHR5cGUuc2hhcGVbZGlzY3JpbWluYXRvcl0pO1xuICAgICAgICAgICAgaWYgKCFkaXNjcmltaW5hdG9yVmFsdWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQSBkaXNjcmltaW5hdG9yIHZhbHVlIGZvciBrZXkgXFxgJHtkaXNjcmltaW5hdG9yfVxcYCBjb3VsZCBub3QgYmUgZXh0cmFjdGVkIGZyb20gYWxsIHNjaGVtYSBvcHRpb25zYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIGRpc2NyaW1pbmF0b3JWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9uc01hcC5oYXModmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRGlzY3JpbWluYXRvciBwcm9wZXJ0eSAke1N0cmluZyhkaXNjcmltaW5hdG9yKX0gaGFzIGR1cGxpY2F0ZSB2YWx1ZSAke1N0cmluZyh2YWx1ZSl9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9wdGlvbnNNYXAuc2V0KHZhbHVlLCB0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZERpc2NyaW1pbmF0ZWRVbmlvbih7XG4gICAgICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZERpc2NyaW1pbmF0ZWRVbmlvbixcbiAgICAgICAgICAgIGRpc2NyaW1pbmF0b3IsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgb3B0aW9uc01hcCxcbiAgICAgICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZnVuY3Rpb24gbWVyZ2VWYWx1ZXMoYSwgYikge1xuICAgIGNvbnN0IGFUeXBlID0gZ2V0UGFyc2VkVHlwZShhKTtcbiAgICBjb25zdCBiVHlwZSA9IGdldFBhcnNlZFR5cGUoYik7XG4gICAgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGRhdGE6IGEgfTtcbiAgICB9XG4gICAgZWxzZSBpZiAoYVR5cGUgPT09IFpvZFBhcnNlZFR5cGUub2JqZWN0ICYmIGJUeXBlID09PSBab2RQYXJzZWRUeXBlLm9iamVjdCkge1xuICAgICAgICBjb25zdCBiS2V5cyA9IHV0aWwub2JqZWN0S2V5cyhiKTtcbiAgICAgICAgY29uc3Qgc2hhcmVkS2V5cyA9IHV0aWwub2JqZWN0S2V5cyhhKS5maWx0ZXIoKGtleSkgPT4gYktleXMuaW5kZXhPZihrZXkpICE9PSAtMSk7XG4gICAgICAgIGNvbnN0IG5ld09iaiA9IHsgLi4uYSwgLi4uYiB9O1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBzaGFyZWRLZXlzKSB7XG4gICAgICAgICAgICBjb25zdCBzaGFyZWRWYWx1ZSA9IG1lcmdlVmFsdWVzKGFba2V5XSwgYltrZXldKTtcbiAgICAgICAgICAgIGlmICghc2hhcmVkVmFsdWUudmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ld09ialtrZXldID0gc2hhcmVkVmFsdWUuZGF0YTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyB2YWxpZDogdHJ1ZSwgZGF0YTogbmV3T2JqIH07XG4gICAgfVxuICAgIGVsc2UgaWYgKGFUeXBlID09PSBab2RQYXJzZWRUeXBlLmFycmF5ICYmIGJUeXBlID09PSBab2RQYXJzZWRUeXBlLmFycmF5KSB7XG4gICAgICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld0FycmF5ID0gW107XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBhLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgY29uc3QgaXRlbUEgPSBhW2luZGV4XTtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1CID0gYltpbmRleF07XG4gICAgICAgICAgICBjb25zdCBzaGFyZWRWYWx1ZSA9IG1lcmdlVmFsdWVzKGl0ZW1BLCBpdGVtQik7XG4gICAgICAgICAgICBpZiAoIXNoYXJlZFZhbHVlLnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdBcnJheS5wdXNoKHNoYXJlZFZhbHVlLmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHZhbGlkOiB0cnVlLCBkYXRhOiBuZXdBcnJheSB9O1xuICAgIH1cbiAgICBlbHNlIGlmIChhVHlwZSA9PT0gWm9kUGFyc2VkVHlwZS5kYXRlICYmIGJUeXBlID09PSBab2RQYXJzZWRUeXBlLmRhdGUgJiYgK2EgPT09ICtiKSB7XG4gICAgICAgIHJldHVybiB7IHZhbGlkOiB0cnVlLCBkYXRhOiBhIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UgfTtcbiAgICB9XG59XG5leHBvcnQgY2xhc3MgWm9kSW50ZXJzZWN0aW9uIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdHVzLCBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGNvbnN0IGhhbmRsZVBhcnNlZCA9IChwYXJzZWRMZWZ0LCBwYXJzZWRSaWdodCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlzQWJvcnRlZChwYXJzZWRMZWZ0KSB8fCBpc0Fib3J0ZWQocGFyc2VkUmlnaHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtZXJnZWQgPSBtZXJnZVZhbHVlcyhwYXJzZWRMZWZ0LnZhbHVlLCBwYXJzZWRSaWdodC52YWx1ZSk7XG4gICAgICAgICAgICBpZiAoIW1lcmdlZC52YWxpZCkge1xuICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9pbnRlcnNlY3Rpb25fdHlwZXMsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNEaXJ0eShwYXJzZWRMZWZ0KSB8fCBpc0RpcnR5KHBhcnNlZFJpZ2h0KSkge1xuICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBtZXJnZWQuZGF0YSB9O1xuICAgICAgICB9O1xuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgICAgICB0aGlzLl9kZWYubGVmdC5fcGFyc2VBc3luYyh7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgdGhpcy5fZGVmLnJpZ2h0Ll9wYXJzZUFzeW5jKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIF0pLnRoZW4oKFtsZWZ0LCByaWdodF0pID0+IGhhbmRsZVBhcnNlZChsZWZ0LCByaWdodCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZVBhcnNlZCh0aGlzLl9kZWYubGVmdC5fcGFyc2VTeW5jKHtcbiAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgICAgIH0pLCB0aGlzLl9kZWYucmlnaHQuX3BhcnNlU3luYyh7XG4gICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5ab2RJbnRlcnNlY3Rpb24uY3JlYXRlID0gKGxlZnQsIHJpZ2h0LCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZEludGVyc2VjdGlvbih7XG4gICAgICAgIGxlZnQ6IGxlZnQsXG4gICAgICAgIHJpZ2h0OiByaWdodCxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RJbnRlcnNlY3Rpb24sXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG4vLyB0eXBlIFpvZFR1cGxlSXRlbXMgPSBbWm9kVHlwZUFueSwgLi4uWm9kVHlwZUFueVtdXTtcbmV4cG9ydCBjbGFzcyBab2RUdXBsZSBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IHN0YXR1cywgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUuYXJyYXkpIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUuYXJyYXksXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3R4LmRhdGEubGVuZ3RoIDwgdGhpcy5fZGVmLml0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19zbWFsbCxcbiAgICAgICAgICAgICAgICBtaW5pbXVtOiB0aGlzLl9kZWYuaXRlbXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN0ID0gdGhpcy5fZGVmLnJlc3Q7XG4gICAgICAgIGlmICghcmVzdCAmJiBjdHguZGF0YS5sZW5ndGggPiB0aGlzLl9kZWYuaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX2JpZyxcbiAgICAgICAgICAgICAgICBtYXhpbXVtOiB0aGlzLl9kZWYuaXRlbXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpdGVtcyA9IFsuLi5jdHguZGF0YV1cbiAgICAgICAgICAgIC5tYXAoKGl0ZW0sIGl0ZW1JbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2NoZW1hID0gdGhpcy5fZGVmLml0ZW1zW2l0ZW1JbmRleF0gfHwgdGhpcy5fZGVmLnJlc3Q7XG4gICAgICAgICAgICBpZiAoIXNjaGVtYSlcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBzY2hlbWEuX3BhcnNlKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCBpdGVtLCBjdHgucGF0aCwgaXRlbUluZGV4KSk7XG4gICAgICAgIH0pXG4gICAgICAgICAgICAuZmlsdGVyKCh4KSA9PiAhIXgpOyAvLyBmaWx0ZXIgbnVsbHNcbiAgICAgICAgaWYgKGN0eC5jb21tb24uYXN5bmMpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChpdGVtcykudGhlbigocmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZUFycmF5KHN0YXR1cywgcmVzdWx0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZUFycmF5KHN0YXR1cywgaXRlbXMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGdldCBpdGVtcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pdGVtcztcbiAgICB9XG4gICAgcmVzdChyZXN0KSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kVHVwbGUoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgcmVzdCxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuWm9kVHVwbGUuY3JlYXRlID0gKHNjaGVtYXMsIHBhcmFtcykgPT4ge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShzY2hlbWFzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbXVzdCBwYXNzIGFuIGFycmF5IG9mIHNjaGVtYXMgdG8gei50dXBsZShbIC4uLiBdKVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBab2RUdXBsZSh7XG4gICAgICAgIGl0ZW1zOiBzY2hlbWFzLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFR1cGxlLFxuICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZFJlY29yZCBleHRlbmRzIFpvZFR5cGUge1xuICAgIGdldCBrZXlTY2hlbWEoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYua2V5VHlwZTtcbiAgICB9XG4gICAgZ2V0IHZhbHVlU2NoZW1hKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnZhbHVlVHlwZTtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdHVzLCBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGlmIChjdHgucGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5vYmplY3QpIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUub2JqZWN0LFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFpcnMgPSBbXTtcbiAgICAgICAgY29uc3Qga2V5VHlwZSA9IHRoaXMuX2RlZi5rZXlUeXBlO1xuICAgICAgICBjb25zdCB2YWx1ZVR5cGUgPSB0aGlzLl9kZWYudmFsdWVUeXBlO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBjdHguZGF0YSkge1xuICAgICAgICAgICAgcGFpcnMucHVzaCh7XG4gICAgICAgICAgICAgICAga2V5OiBrZXlUeXBlLl9wYXJzZShuZXcgUGFyc2VJbnB1dExhenlQYXRoKGN0eCwga2V5LCBjdHgucGF0aCwga2V5KSksXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlVHlwZS5fcGFyc2UobmV3IFBhcnNlSW5wdXRMYXp5UGF0aChjdHgsIGN0eC5kYXRhW2tleV0sIGN0eC5wYXRoLCBrZXkpKSxcbiAgICAgICAgICAgICAgICBhbHdheXNTZXQ6IGtleSBpbiBjdHguZGF0YSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jKSB7XG4gICAgICAgICAgICByZXR1cm4gUGFyc2VTdGF0dXMubWVyZ2VPYmplY3RBc3luYyhzdGF0dXMsIHBhaXJzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZU9iamVjdFN5bmMoc3RhdHVzLCBwYWlycyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ2V0IGVsZW1lbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYudmFsdWVUeXBlO1xuICAgIH1cbiAgICBzdGF0aWMgY3JlYXRlKGZpcnN0LCBzZWNvbmQsIHRoaXJkKSB7XG4gICAgICAgIGlmIChzZWNvbmQgaW5zdGFuY2VvZiBab2RUeXBlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFpvZFJlY29yZCh7XG4gICAgICAgICAgICAgICAga2V5VHlwZTogZmlyc3QsXG4gICAgICAgICAgICAgICAgdmFsdWVUeXBlOiBzZWNvbmQsXG4gICAgICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RSZWNvcmQsXG4gICAgICAgICAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyh0aGlyZCksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZFJlY29yZCh7XG4gICAgICAgICAgICBrZXlUeXBlOiBab2RTdHJpbmcuY3JlYXRlKCksXG4gICAgICAgICAgICB2YWx1ZVR5cGU6IGZpcnN0LFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RSZWNvcmQsXG4gICAgICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHNlY29uZCksXG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydCBjbGFzcyBab2RNYXAgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBnZXQga2V5U2NoZW1hKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmtleVR5cGU7XG4gICAgfVxuICAgIGdldCB2YWx1ZVNjaGVtYSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi52YWx1ZVR5cGU7XG4gICAgfVxuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IHN0YXR1cywgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUubWFwKSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLm1hcCxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGtleVR5cGUgPSB0aGlzLl9kZWYua2V5VHlwZTtcbiAgICAgICAgY29uc3QgdmFsdWVUeXBlID0gdGhpcy5fZGVmLnZhbHVlVHlwZTtcbiAgICAgICAgY29uc3QgcGFpcnMgPSBbLi4uY3R4LmRhdGEuZW50cmllcygpXS5tYXAoKFtrZXksIHZhbHVlXSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAga2V5OiBrZXlUeXBlLl9wYXJzZShuZXcgUGFyc2VJbnB1dExhenlQYXRoKGN0eCwga2V5LCBjdHgucGF0aCwgW2luZGV4LCBcImtleVwiXSkpLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVR5cGUuX3BhcnNlKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCB2YWx1ZSwgY3R4LnBhdGgsIFtpbmRleCwgXCJ2YWx1ZVwiXSkpLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jKSB7XG4gICAgICAgICAgICBjb25zdCBmaW5hbE1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBhaXIgb2YgcGFpcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYXdhaXQgcGFpci5rZXk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgcGFpci52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdGF0dXMgPT09IFwiYWJvcnRlZFwiIHx8IHZhbHVlLnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3RhdHVzID09PSBcImRpcnR5XCIgfHwgdmFsdWUuc3RhdHVzID09PSBcImRpcnR5XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZpbmFsTWFwLnNldChrZXkudmFsdWUsIHZhbHVlLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBmaW5hbE1hcCB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBmaW5hbE1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IHBhaXIua2V5O1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcGFpci52YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5LnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIgfHwgdmFsdWUuc3RhdHVzID09PSBcImFib3J0ZWRcIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGtleS5zdGF0dXMgPT09IFwiZGlydHlcIiB8fCB2YWx1ZS5zdGF0dXMgPT09IFwiZGlydHlcIikge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZmluYWxNYXAuc2V0KGtleS52YWx1ZSwgdmFsdWUudmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBmaW5hbE1hcCB9O1xuICAgICAgICB9XG4gICAgfVxufVxuWm9kTWFwLmNyZWF0ZSA9IChrZXlUeXBlLCB2YWx1ZVR5cGUsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kTWFwKHtcbiAgICAgICAgdmFsdWVUeXBlLFxuICAgICAgICBrZXlUeXBlLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE1hcCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RTZXQgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0dXMsIGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgaWYgKGN0eC5wYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLnNldCkge1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5zZXQsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkZWYgPSB0aGlzLl9kZWY7XG4gICAgICAgIGlmIChkZWYubWluU2l6ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGN0eC5kYXRhLnNpemUgPCBkZWYubWluU2l6ZS52YWx1ZSkge1xuICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX3NtYWxsLFxuICAgICAgICAgICAgICAgICAgICBtaW5pbXVtOiBkZWYubWluU2l6ZS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzZXRcIixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZi5taW5TaXplLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlZi5tYXhTaXplICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoY3R4LmRhdGEuc2l6ZSA+IGRlZi5tYXhTaXplLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fYmlnLFxuICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiBkZWYubWF4U2l6ZS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzZXRcIixcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGRlZi5tYXhTaXplLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdmFsdWVUeXBlID0gdGhpcy5fZGVmLnZhbHVlVHlwZTtcbiAgICAgICAgZnVuY3Rpb24gZmluYWxpemVTZXQoZWxlbWVudHMpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZFNldCA9IG5ldyBTZXQoKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnN0YXR1cyA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICBwYXJzZWRTZXQuYWRkKGVsZW1lbnQudmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBwYXJzZWRTZXQgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbGVtZW50cyA9IFsuLi5jdHguZGF0YS52YWx1ZXMoKV0ubWFwKChpdGVtLCBpKSA9PiB2YWx1ZVR5cGUuX3BhcnNlKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCBpdGVtLCBjdHgucGF0aCwgaSkpKTtcbiAgICAgICAgaWYgKGN0eC5jb21tb24uYXN5bmMpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChlbGVtZW50cykudGhlbigoZWxlbWVudHMpID0+IGZpbmFsaXplU2V0KGVsZW1lbnRzKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmluYWxpemVTZXQoZWxlbWVudHMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIG1pbihtaW5TaXplLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kU2V0KHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIG1pblNpemU6IHsgdmFsdWU6IG1pblNpemUsIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSB9LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbWF4KG1heFNpemUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RTZXQoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgbWF4U2l6ZTogeyB2YWx1ZTogbWF4U2l6ZSwgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzaXplKHNpemUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWluKHNpemUsIG1lc3NhZ2UpLm1heChzaXplLCBtZXNzYWdlKTtcbiAgICB9XG4gICAgbm9uZW1wdHkobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5taW4oMSwgbWVzc2FnZSk7XG4gICAgfVxufVxuWm9kU2V0LmNyZWF0ZSA9ICh2YWx1ZVR5cGUsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kU2V0KHtcbiAgICAgICAgdmFsdWVUeXBlLFxuICAgICAgICBtaW5TaXplOiBudWxsLFxuICAgICAgICBtYXhTaXplOiBudWxsLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFNldCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RGdW5jdGlvbiBleHRlbmRzIFpvZFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICB0aGlzLnZhbGlkYXRlID0gdGhpcy5pbXBsZW1lbnQ7XG4gICAgfVxuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgaWYgKGN0eC5wYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLmZ1bmN0aW9uKSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLmZ1bmN0aW9uLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gbWFrZUFyZ3NJc3N1ZShhcmdzLCBlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIG1ha2VJc3N1ZSh7XG4gICAgICAgICAgICAgICAgZGF0YTogYXJncyxcbiAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICBlcnJvck1hcHM6IFtjdHguY29tbW9uLmNvbnRleHR1YWxFcnJvck1hcCwgY3R4LnNjaGVtYUVycm9yTWFwLCBnZXRFcnJvck1hcCgpLCBkZWZhdWx0RXJyb3JNYXBdLmZpbHRlcigoeCkgPT4gISF4KSxcbiAgICAgICAgICAgICAgICBpc3N1ZURhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfYXJndW1lbnRzLFxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHNFcnJvcjogZXJyb3IsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIG1ha2VSZXR1cm5zSXNzdWUocmV0dXJucywgZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBtYWtlSXNzdWUoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHJldHVybnMsXG4gICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgZXJyb3JNYXBzOiBbY3R4LmNvbW1vbi5jb250ZXh0dWFsRXJyb3JNYXAsIGN0eC5zY2hlbWFFcnJvck1hcCwgZ2V0RXJyb3JNYXAoKSwgZGVmYXVsdEVycm9yTWFwXS5maWx0ZXIoKHgpID0+ICEheCksXG4gICAgICAgICAgICAgICAgaXNzdWVEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3JldHVybl90eXBlLFxuICAgICAgICAgICAgICAgICAgICByZXR1cm5UeXBlRXJyb3I6IGVycm9yLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYXJhbXMgPSB7IGVycm9yTWFwOiBjdHguY29tbW9uLmNvbnRleHR1YWxFcnJvck1hcCB9O1xuICAgICAgICBjb25zdCBmbiA9IGN0eC5kYXRhO1xuICAgICAgICBpZiAodGhpcy5fZGVmLnJldHVybnMgaW5zdGFuY2VvZiBab2RQcm9taXNlKSB7XG4gICAgICAgICAgICAvLyBXb3VsZCBsb3ZlIGEgd2F5IHRvIGF2b2lkIGRpc2FibGluZyB0aGlzIHJ1bGUsIGJ1dCB3ZSBuZWVkXG4gICAgICAgICAgICAvLyBhbiBhbGlhcyAodXNpbmcgYW4gYXJyb3cgZnVuY3Rpb24gd2FzIHdoYXQgY2F1c2VkIDI2NTEpLlxuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICBjb25zdCBtZSA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gT0soYXN5bmMgZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBab2RFcnJvcihbXSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkQXJncyA9IGF3YWl0IG1lLl9kZWYuYXJncy5wYXJzZUFzeW5jKGFyZ3MsIHBhcmFtcykuY2F0Y2goKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IuYWRkSXNzdWUobWFrZUFyZ3NJc3N1ZShhcmdzLCBlKSk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IFJlZmxlY3QuYXBwbHkoZm4sIHRoaXMsIHBhcnNlZEFyZ3MpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcnNlZFJldHVybnMgPSBhd2FpdCBtZS5fZGVmLnJldHVybnMuX2RlZi50eXBlXG4gICAgICAgICAgICAgICAgICAgIC5wYXJzZUFzeW5jKHJlc3VsdCwgcGFyYW1zKVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IuYWRkSXNzdWUobWFrZVJldHVybnNJc3N1ZShyZXN1bHQsIGUpKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlZFJldHVybnM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIFdvdWxkIGxvdmUgYSB3YXkgdG8gYXZvaWQgZGlzYWJsaW5nIHRoaXMgcnVsZSwgYnV0IHdlIG5lZWRcbiAgICAgICAgICAgIC8vIGFuIGFsaWFzICh1c2luZyBhbiBhcnJvdyBmdW5jdGlvbiB3YXMgd2hhdCBjYXVzZWQgMjY1MSkuXG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgIGNvbnN0IG1lID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiBPSyhmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcnNlZEFyZ3MgPSBtZS5fZGVmLmFyZ3Muc2FmZVBhcnNlKGFyZ3MsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgaWYgKCFwYXJzZWRBcmdzLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFpvZEVycm9yKFttYWtlQXJnc0lzc3VlKGFyZ3MsIHBhcnNlZEFyZ3MuZXJyb3IpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuYXBwbHkoZm4sIHRoaXMsIHBhcnNlZEFyZ3MuZGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkUmV0dXJucyA9IG1lLl9kZWYucmV0dXJucy5zYWZlUGFyc2UocmVzdWx0LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIGlmICghcGFyc2VkUmV0dXJucy5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBab2RFcnJvcihbbWFrZVJldHVybnNJc3N1ZShyZXN1bHQsIHBhcnNlZFJldHVybnMuZXJyb3IpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZWRSZXR1cm5zLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwYXJhbWV0ZXJzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmFyZ3M7XG4gICAgfVxuICAgIHJldHVyblR5cGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYucmV0dXJucztcbiAgICB9XG4gICAgYXJncyguLi5pdGVtcykge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEZ1bmN0aW9uKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGFyZ3M6IFpvZFR1cGxlLmNyZWF0ZShpdGVtcykucmVzdChab2RVbmtub3duLmNyZWF0ZSgpKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybnMocmV0dXJuVHlwZSkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEZ1bmN0aW9uKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIHJldHVybnM6IHJldHVyblR5cGUsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpbXBsZW1lbnQoZnVuYykge1xuICAgICAgICBjb25zdCB2YWxpZGF0ZWRGdW5jID0gdGhpcy5wYXJzZShmdW5jKTtcbiAgICAgICAgcmV0dXJuIHZhbGlkYXRlZEZ1bmM7XG4gICAgfVxuICAgIHN0cmljdEltcGxlbWVudChmdW5jKSB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRlZEZ1bmMgPSB0aGlzLnBhcnNlKGZ1bmMpO1xuICAgICAgICByZXR1cm4gdmFsaWRhdGVkRnVuYztcbiAgICB9XG4gICAgc3RhdGljIGNyZWF0ZShhcmdzLCByZXR1cm5zLCBwYXJhbXMpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RGdW5jdGlvbih7XG4gICAgICAgICAgICBhcmdzOiAoYXJncyA/IGFyZ3MgOiBab2RUdXBsZS5jcmVhdGUoW10pLnJlc3QoWm9kVW5rbm93bi5jcmVhdGUoKSkpLFxuICAgICAgICAgICAgcmV0dXJuczogcmV0dXJucyB8fCBab2RVbmtub3duLmNyZWF0ZSgpLFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RGdW5jdGlvbixcbiAgICAgICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0IGNsYXNzIFpvZExhenkgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBnZXQgc2NoZW1hKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmdldHRlcigpO1xuICAgIH1cbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGNvbnN0IGxhenlTY2hlbWEgPSB0aGlzLl9kZWYuZ2V0dGVyKCk7XG4gICAgICAgIHJldHVybiBsYXp5U2NoZW1hLl9wYXJzZSh7IGRhdGE6IGN0eC5kYXRhLCBwYXRoOiBjdHgucGF0aCwgcGFyZW50OiBjdHggfSk7XG4gICAgfVxufVxuWm9kTGF6eS5jcmVhdGUgPSAoZ2V0dGVyLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZExhenkoe1xuICAgICAgICBnZXR0ZXI6IGdldHRlcixcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RMYXp5LFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZExpdGVyYWwgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgaWYgKGlucHV0LmRhdGEgIT09IHRoaXMuX2RlZi52YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX2xpdGVyYWwsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IHRoaXMuX2RlZi52YWx1ZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBcInZhbGlkXCIsIHZhbHVlOiBpbnB1dC5kYXRhIH07XG4gICAgfVxuICAgIGdldCB2YWx1ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi52YWx1ZTtcbiAgICB9XG59XG5ab2RMaXRlcmFsLmNyZWF0ZSA9ICh2YWx1ZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RMaXRlcmFsKHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZExpdGVyYWwsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5mdW5jdGlvbiBjcmVhdGVab2RFbnVtKHZhbHVlcywgcGFyYW1zKSB7XG4gICAgcmV0dXJuIG5ldyBab2RFbnVtKHtcbiAgICAgICAgdmFsdWVzLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEVudW0sXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn1cbmV4cG9ydCBjbGFzcyBab2RFbnVtIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQuZGF0YSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRWYWx1ZXMgPSB0aGlzLl9kZWYudmFsdWVzO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IHV0aWwuam9pblZhbHVlcyhleHBlY3RlZFZhbHVlcyksXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5fY2FjaGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhY2hlID0gbmV3IFNldCh0aGlzLl9kZWYudmFsdWVzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX2NhY2hlLmhhcyhpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRWYWx1ZXMgPSB0aGlzLl9kZWYudmFsdWVzO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX2VudW1fdmFsdWUsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogZXhwZWN0ZWRWYWx1ZXMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBPSyhpbnB1dC5kYXRhKTtcbiAgICB9XG4gICAgZ2V0IG9wdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYudmFsdWVzO1xuICAgIH1cbiAgICBnZXQgZW51bSgpIHtcbiAgICAgICAgY29uc3QgZW51bVZhbHVlcyA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IHZhbCBvZiB0aGlzLl9kZWYudmFsdWVzKSB7XG4gICAgICAgICAgICBlbnVtVmFsdWVzW3ZhbF0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVudW1WYWx1ZXM7XG4gICAgfVxuICAgIGdldCBWYWx1ZXMoKSB7XG4gICAgICAgIGNvbnN0IGVudW1WYWx1ZXMgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCB2YWwgb2YgdGhpcy5fZGVmLnZhbHVlcykge1xuICAgICAgICAgICAgZW51bVZhbHVlc1t2YWxdID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbnVtVmFsdWVzO1xuICAgIH1cbiAgICBnZXQgRW51bSgpIHtcbiAgICAgICAgY29uc3QgZW51bVZhbHVlcyA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IHZhbCBvZiB0aGlzLl9kZWYudmFsdWVzKSB7XG4gICAgICAgICAgICBlbnVtVmFsdWVzW3ZhbF0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVudW1WYWx1ZXM7XG4gICAgfVxuICAgIGV4dHJhY3QodmFsdWVzLCBuZXdEZWYgPSB0aGlzLl9kZWYpIHtcbiAgICAgICAgcmV0dXJuIFpvZEVudW0uY3JlYXRlKHZhbHVlcywge1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgLi4ubmV3RGVmLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZXhjbHVkZSh2YWx1ZXMsIG5ld0RlZiA9IHRoaXMuX2RlZikge1xuICAgICAgICByZXR1cm4gWm9kRW51bS5jcmVhdGUodGhpcy5vcHRpb25zLmZpbHRlcigob3B0KSA9PiAhdmFsdWVzLmluY2x1ZGVzKG9wdCkpLCB7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICAuLi5uZXdEZWYsXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblpvZEVudW0uY3JlYXRlID0gY3JlYXRlWm9kRW51bTtcbmV4cG9ydCBjbGFzcyBab2ROYXRpdmVFbnVtIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IG5hdGl2ZUVudW1WYWx1ZXMgPSB1dGlsLmdldFZhbGlkRW51bVZhbHVlcyh0aGlzLl9kZWYudmFsdWVzKTtcbiAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUuc3RyaW5nICYmIGN0eC5wYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLm51bWJlcikge1xuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRWYWx1ZXMgPSB1dGlsLm9iamVjdFZhbHVlcyhuYXRpdmVFbnVtVmFsdWVzKTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiB1dGlsLmpvaW5WYWx1ZXMoZXhwZWN0ZWRWYWx1ZXMpLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX2NhY2hlKSB7XG4gICAgICAgICAgICB0aGlzLl9jYWNoZSA9IG5ldyBTZXQodXRpbC5nZXRWYWxpZEVudW1WYWx1ZXModGhpcy5fZGVmLnZhbHVlcykpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5fY2FjaGUuaGFzKGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICBjb25zdCBleHBlY3RlZFZhbHVlcyA9IHV0aWwub2JqZWN0VmFsdWVzKG5hdGl2ZUVudW1WYWx1ZXMpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX2VudW1fdmFsdWUsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogZXhwZWN0ZWRWYWx1ZXMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBPSyhpbnB1dC5kYXRhKTtcbiAgICB9XG4gICAgZ2V0IGVudW0oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYudmFsdWVzO1xuICAgIH1cbn1cblpvZE5hdGl2ZUVudW0uY3JlYXRlID0gKHZhbHVlcywgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2ROYXRpdmVFbnVtKHtcbiAgICAgICAgdmFsdWVzOiB2YWx1ZXMsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kTmF0aXZlRW51bSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RQcm9taXNlIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgdW53cmFwKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnR5cGU7XG4gICAgfVxuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgaWYgKGN0eC5wYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLnByb21pc2UgJiYgY3R4LmNvbW1vbi5hc3luYyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUucHJvbWlzZSxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByb21pc2lmaWVkID0gY3R4LnBhcnNlZFR5cGUgPT09IFpvZFBhcnNlZFR5cGUucHJvbWlzZSA/IGN0eC5kYXRhIDogUHJvbWlzZS5yZXNvbHZlKGN0eC5kYXRhKTtcbiAgICAgICAgcmV0dXJuIE9LKHByb21pc2lmaWVkLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9kZWYudHlwZS5wYXJzZUFzeW5jKGRhdGEsIHtcbiAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICBlcnJvck1hcDogY3R4LmNvbW1vbi5jb250ZXh0dWFsRXJyb3JNYXAsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgIH1cbn1cblpvZFByb21pc2UuY3JlYXRlID0gKHNjaGVtYSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RQcm9taXNlKHtcbiAgICAgICAgdHlwZTogc2NoZW1hLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFByb21pc2UsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kRWZmZWN0cyBleHRlbmRzIFpvZFR5cGUge1xuICAgIGlubmVyVHlwZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5zY2hlbWE7XG4gICAgfVxuICAgIHNvdXJjZVR5cGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYuc2NoZW1hLl9kZWYudHlwZU5hbWUgPT09IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RFZmZlY3RzXG4gICAgICAgICAgICA/IHRoaXMuX2RlZi5zY2hlbWEuc291cmNlVHlwZSgpXG4gICAgICAgICAgICA6IHRoaXMuX2RlZi5zY2hlbWE7XG4gICAgfVxuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IHN0YXR1cywgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBjb25zdCBlZmZlY3QgPSB0aGlzLl9kZWYuZWZmZWN0IHx8IG51bGw7XG4gICAgICAgIGNvbnN0IGNoZWNrQ3R4ID0ge1xuICAgICAgICAgICAgYWRkSXNzdWU6IChhcmcpID0+IHtcbiAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIGFyZyk7XG4gICAgICAgICAgICAgICAgaWYgKGFyZy5mYXRhbCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQgcGF0aCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3R4LnBhdGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICBjaGVja0N0eC5hZGRJc3N1ZSA9IGNoZWNrQ3R4LmFkZElzc3VlLmJpbmQoY2hlY2tDdHgpO1xuICAgICAgICBpZiAoZWZmZWN0LnR5cGUgPT09IFwicHJlcHJvY2Vzc1wiKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzZWQgPSBlZmZlY3QudHJhbnNmb3JtKGN0eC5kYXRhLCBjaGVja0N0eCk7XG4gICAgICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocHJvY2Vzc2VkKS50aGVuKGFzeW5jIChwcm9jZXNzZWQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cy52YWx1ZSA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5fZGVmLnNjaGVtYS5fcGFyc2VBc3luYyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBwcm9jZXNzZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSBcImRpcnR5XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRElSVFkocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cy52YWx1ZSA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIERJUlRZKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzLnZhbHVlID09PSBcImFib3J0ZWRcIilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fZGVmLnNjaGVtYS5fcGFyc2VTeW5jKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogcHJvY2Vzc2VkLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRElSVFkocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzLnZhbHVlID09PSBcImRpcnR5XCIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBESVJUWShyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVmZmVjdC50eXBlID09PSBcInJlZmluZW1lbnRcIikge1xuICAgICAgICAgICAgY29uc3QgZXhlY3V0ZVJlZmluZW1lbnQgPSAoYWNjKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZWZmZWN0LnJlZmluZW1lbnQoYWNjLCBjaGVja0N0eCk7XG4gICAgICAgICAgICAgICAgaWYgKGN0eC5jb21tb24uYXN5bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBc3luYyByZWZpbmVtZW50IGVuY291bnRlcmVkIGR1cmluZyBzeW5jaHJvbm91cyBwYXJzZSBvcGVyYXRpb24uIFVzZSAucGFyc2VBc3luYyBpbnN0ZWFkLlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbm5lciA9IHRoaXMuX2RlZi5zY2hlbWEuX3BhcnNlU3luYyh7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKGlubmVyLnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgICAgIGlmIChpbm5lci5zdGF0dXMgPT09IFwiZGlydHlcIilcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIHZhbHVlIGlzIGlnbm9yZWRcbiAgICAgICAgICAgICAgICBleGVjdXRlUmVmaW5lbWVudChpbm5lci52YWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBpbm5lci52YWx1ZSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5zY2hlbWEuX3BhcnNlQXN5bmMoeyBkYXRhOiBjdHguZGF0YSwgcGF0aDogY3R4LnBhdGgsIHBhcmVudDogY3R4IH0pLnRoZW4oKGlubmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbm5lci5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbm5lci5zdGF0dXMgPT09IFwiZGlydHlcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXhlY3V0ZVJlZmluZW1lbnQoaW5uZXIudmFsdWUpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBpbm5lci52YWx1ZSB9O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZWZmZWN0LnR5cGUgPT09IFwidHJhbnNmb3JtXCIpIHtcbiAgICAgICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhc2UgPSB0aGlzLl9kZWYuc2NoZW1hLl9wYXJzZVN5bmMoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICghaXNWYWxpZChiYXNlKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZWZmZWN0LnRyYW5zZm9ybShiYXNlLnZhbHVlLCBjaGVja0N0eCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3luY2hyb25vdXMgdHJhbnNmb3JtIGVuY291bnRlcmVkIGR1cmluZyBzeW5jaHJvbm91cyBwYXJzZSBvcGVyYXRpb24uIFVzZSAucGFyc2VBc3luYyBpbnN0ZWFkLmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IHJlc3VsdCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5zY2hlbWEuX3BhcnNlQXN5bmMoeyBkYXRhOiBjdHguZGF0YSwgcGF0aDogY3R4LnBhdGgsIHBhcmVudDogY3R4IH0pLnRoZW4oKGJhc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc1ZhbGlkKGJhc2UpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZWZmZWN0LnRyYW5zZm9ybShiYXNlLnZhbHVlLCBjaGVja0N0eCkpLnRoZW4oKHJlc3VsdCkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1czogc3RhdHVzLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHV0aWwuYXNzZXJ0TmV2ZXIoZWZmZWN0KTtcbiAgICB9XG59XG5ab2RFZmZlY3RzLmNyZWF0ZSA9IChzY2hlbWEsIGVmZmVjdCwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RFZmZlY3RzKHtcbiAgICAgICAgc2NoZW1hLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEVmZmVjdHMsXG4gICAgICAgIGVmZmVjdCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcblpvZEVmZmVjdHMuY3JlYXRlV2l0aFByZXByb2Nlc3MgPSAocHJlcHJvY2Vzcywgc2NoZW1hLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZEVmZmVjdHMoe1xuICAgICAgICBzY2hlbWEsXG4gICAgICAgIGVmZmVjdDogeyB0eXBlOiBcInByZXByb2Nlc3NcIiwgdHJhbnNmb3JtOiBwcmVwcm9jZXNzIH0sXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kRWZmZWN0cyxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCB7IFpvZEVmZmVjdHMgYXMgWm9kVHJhbnNmb3JtZXIgfTtcbmV4cG9ydCBjbGFzcyBab2RPcHRpb25hbCBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlID09PSBab2RQYXJzZWRUeXBlLnVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIE9LKHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pbm5lclR5cGUuX3BhcnNlKGlucHV0KTtcbiAgICB9XG4gICAgdW53cmFwKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmlubmVyVHlwZTtcbiAgICB9XG59XG5ab2RPcHRpb25hbC5jcmVhdGUgPSAodHlwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RPcHRpb25hbCh7XG4gICAgICAgIGlubmVyVHlwZTogdHlwZSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RPcHRpb25hbCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2ROdWxsYWJsZSBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlID09PSBab2RQYXJzZWRUeXBlLm51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBPSyhudWxsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmlubmVyVHlwZS5fcGFyc2UoaW5wdXQpO1xuICAgIH1cbiAgICB1bndyYXAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYuaW5uZXJUeXBlO1xuICAgIH1cbn1cblpvZE51bGxhYmxlLmNyZWF0ZSA9ICh0eXBlLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE51bGxhYmxlKHtcbiAgICAgICAgaW5uZXJUeXBlOiB0eXBlLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE51bGxhYmxlLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZERlZmF1bHQgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGxldCBkYXRhID0gY3R4LmRhdGE7XG4gICAgICAgIGlmIChjdHgucGFyc2VkVHlwZSA9PT0gWm9kUGFyc2VkVHlwZS51bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRhdGEgPSB0aGlzLl9kZWYuZGVmYXVsdFZhbHVlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pbm5lclR5cGUuX3BhcnNlKHtcbiAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVtb3ZlRGVmYXVsdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pbm5lclR5cGU7XG4gICAgfVxufVxuWm9kRGVmYXVsdC5jcmVhdGUgPSAodHlwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2REZWZhdWx0KHtcbiAgICAgICAgaW5uZXJUeXBlOiB0eXBlLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZERlZmF1bHQsXG4gICAgICAgIGRlZmF1bHRWYWx1ZTogdHlwZW9mIHBhcmFtcy5kZWZhdWx0ID09PSBcImZ1bmN0aW9uXCIgPyBwYXJhbXMuZGVmYXVsdCA6ICgpID0+IHBhcmFtcy5kZWZhdWx0LFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZENhdGNoIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICAvLyBuZXdDdHggaXMgdXNlZCB0byBub3QgY29sbGVjdCBpc3N1ZXMgZnJvbSBpbm5lciB0eXBlcyBpbiBjdHhcbiAgICAgICAgY29uc3QgbmV3Q3R4ID0ge1xuICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgY29tbW9uOiB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LmNvbW1vbixcbiAgICAgICAgICAgICAgICBpc3N1ZXM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fZGVmLmlubmVyVHlwZS5fcGFyc2Uoe1xuICAgICAgICAgICAgZGF0YTogbmV3Q3R4LmRhdGEsXG4gICAgICAgICAgICBwYXRoOiBuZXdDdHgucGF0aCxcbiAgICAgICAgICAgIHBhcmVudDoge1xuICAgICAgICAgICAgICAgIC4uLm5ld0N0eCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaXNBc3luYyhyZXN1bHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0LnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1czogXCJ2YWxpZFwiLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcmVzdWx0LnN0YXR1cyA9PT0gXCJ2YWxpZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHJlc3VsdC52YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgOiB0aGlzLl9kZWYuY2F0Y2hWYWx1ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0IGVycm9yKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFpvZEVycm9yKG5ld0N0eC5jb21tb24uaXNzdWVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0OiBuZXdDdHguZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3RhdHVzOiBcInZhbGlkXCIsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHJlc3VsdC5zdGF0dXMgPT09IFwidmFsaWRcIlxuICAgICAgICAgICAgICAgICAgICA/IHJlc3VsdC52YWx1ZVxuICAgICAgICAgICAgICAgICAgICA6IHRoaXMuX2RlZi5jYXRjaFZhbHVlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldCBlcnJvcigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFpvZEVycm9yKG5ld0N0eC5jb21tb24uaXNzdWVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dDogbmV3Q3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZW1vdmVDYXRjaCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pbm5lclR5cGU7XG4gICAgfVxufVxuWm9kQ2F0Y2guY3JlYXRlID0gKHR5cGUsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kQ2F0Y2goe1xuICAgICAgICBpbm5lclR5cGU6IHR5cGUsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kQ2F0Y2gsXG4gICAgICAgIGNhdGNoVmFsdWU6IHR5cGVvZiBwYXJhbXMuY2F0Y2ggPT09IFwiZnVuY3Rpb25cIiA/IHBhcmFtcy5jYXRjaCA6ICgpID0+IHBhcmFtcy5jYXRjaCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2ROYU4gZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5uYW4pIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUubmFuLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBcInZhbGlkXCIsIHZhbHVlOiBpbnB1dC5kYXRhIH07XG4gICAgfVxufVxuWm9kTmFOLmNyZWF0ZSA9IChwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE5hTih7XG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kTmFOLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNvbnN0IEJSQU5EID0gU3ltYm9sKFwiem9kX2JyYW5kXCIpO1xuZXhwb3J0IGNsYXNzIFpvZEJyYW5kZWQgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBjdHguZGF0YTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi50eXBlLl9wYXJzZSh7XG4gICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHVud3JhcCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi50eXBlO1xuICAgIH1cbn1cbmV4cG9ydCBjbGFzcyBab2RQaXBlbGluZSBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IHN0YXR1cywgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgY29uc3QgaGFuZGxlQXN5bmMgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5SZXN1bHQgPSBhd2FpdCB0aGlzLl9kZWYuaW4uX3BhcnNlQXN5bmMoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChpblJlc3VsdC5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICBpZiAoaW5SZXN1bHQuc3RhdHVzID09PSBcImRpcnR5XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBESVJUWShpblJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZGVmLm91dC5fcGFyc2VBc3luYyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBpblJlc3VsdC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlQXN5bmMoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGluUmVzdWx0ID0gdGhpcy5fZGVmLmluLl9wYXJzZVN5bmMoe1xuICAgICAgICAgICAgICAgIGRhdGE6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoaW5SZXN1bHQuc3RhdHVzID09PSBcImFib3J0ZWRcIilcbiAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgIGlmIChpblJlc3VsdC5zdGF0dXMgPT09IFwiZGlydHlcIikge1xuICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1czogXCJkaXJ0eVwiLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaW5SZXN1bHQudmFsdWUsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9kZWYub3V0Ll9wYXJzZVN5bmMoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBpblJlc3VsdC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHN0YXRpYyBjcmVhdGUoYSwgYikge1xuICAgICAgICByZXR1cm4gbmV3IFpvZFBpcGVsaW5lKHtcbiAgICAgICAgICAgIGluOiBhLFxuICAgICAgICAgICAgb3V0OiBiLFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RQaXBlbGluZSxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0IGNsYXNzIFpvZFJlYWRvbmx5IGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2RlZi5pbm5lclR5cGUuX3BhcnNlKGlucHV0KTtcbiAgICAgICAgY29uc3QgZnJlZXplID0gKGRhdGEpID0+IHtcbiAgICAgICAgICAgIGlmIChpc1ZhbGlkKGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgZGF0YS52YWx1ZSA9IE9iamVjdC5mcmVlemUoZGF0YS52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGlzQXN5bmMocmVzdWx0KSA/IHJlc3VsdC50aGVuKChkYXRhKSA9PiBmcmVlemUoZGF0YSkpIDogZnJlZXplKHJlc3VsdCk7XG4gICAgfVxuICAgIHVud3JhcCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pbm5lclR5cGU7XG4gICAgfVxufVxuWm9kUmVhZG9ubHkuY3JlYXRlID0gKHR5cGUsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kUmVhZG9ubHkoe1xuICAgICAgICBpbm5lclR5cGU6IHR5cGUsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kUmVhZG9ubHksXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vICAgICAgICAgICAgICAgICAgICAvLy8vLy8vLy8vXG4vLy8vLy8vLy8vICAgICAgei5jdXN0b20gICAgICAvLy8vLy8vLy8vXG4vLy8vLy8vLy8vICAgICAgICAgICAgICAgICAgICAvLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5mdW5jdGlvbiBjbGVhblBhcmFtcyhwYXJhbXMsIGRhdGEpIHtcbiAgICBjb25zdCBwID0gdHlwZW9mIHBhcmFtcyA9PT0gXCJmdW5jdGlvblwiID8gcGFyYW1zKGRhdGEpIDogdHlwZW9mIHBhcmFtcyA9PT0gXCJzdHJpbmdcIiA/IHsgbWVzc2FnZTogcGFyYW1zIH0gOiBwYXJhbXM7XG4gICAgY29uc3QgcDIgPSB0eXBlb2YgcCA9PT0gXCJzdHJpbmdcIiA/IHsgbWVzc2FnZTogcCB9IDogcDtcbiAgICByZXR1cm4gcDI7XG59XG5leHBvcnQgZnVuY3Rpb24gY3VzdG9tKGNoZWNrLCBfcGFyYW1zID0ge30sIFxuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICpcbiAqIFBhc3MgYGZhdGFsYCBpbnRvIHRoZSBwYXJhbXMgb2JqZWN0IGluc3RlYWQ6XG4gKlxuICogYGBgdHNcbiAqIHouc3RyaW5nKCkuY3VzdG9tKCh2YWwpID0+IHZhbC5sZW5ndGggPiA1LCB7IGZhdGFsOiBmYWxzZSB9KVxuICogYGBgXG4gKlxuICovXG5mYXRhbCkge1xuICAgIGlmIChjaGVjaylcbiAgICAgICAgcmV0dXJuIFpvZEFueS5jcmVhdGUoKS5zdXBlclJlZmluZSgoZGF0YSwgY3R4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCByID0gY2hlY2soZGF0YSk7XG4gICAgICAgICAgICBpZiAociBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gci50aGVuKChyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gY2xlYW5QYXJhbXMoX3BhcmFtcywgZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBfZmF0YWwgPSBwYXJhbXMuZmF0YWwgPz8gZmF0YWwgPz8gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5hZGRJc3N1ZSh7IGNvZGU6IFwiY3VzdG9tXCIsIC4uLnBhcmFtcywgZmF0YWw6IF9mYXRhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gY2xlYW5QYXJhbXMoX3BhcmFtcywgZGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc3QgX2ZhdGFsID0gcGFyYW1zLmZhdGFsID8/IGZhdGFsID8/IHRydWU7XG4gICAgICAgICAgICAgICAgY3R4LmFkZElzc3VlKHsgY29kZTogXCJjdXN0b21cIiwgLi4ucGFyYW1zLCBmYXRhbDogX2ZhdGFsIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gWm9kQW55LmNyZWF0ZSgpO1xufVxuZXhwb3J0IHsgWm9kVHlwZSBhcyBTY2hlbWEsIFpvZFR5cGUgYXMgWm9kU2NoZW1hIH07XG5leHBvcnQgY29uc3QgbGF0ZSA9IHtcbiAgICBvYmplY3Q6IFpvZE9iamVjdC5sYXp5Y3JlYXRlLFxufTtcbmV4cG9ydCB2YXIgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kO1xuKGZ1bmN0aW9uIChab2RGaXJzdFBhcnR5VHlwZUtpbmQpIHtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RTdHJpbmdcIl0gPSBcIlpvZFN0cmluZ1wiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZE51bWJlclwiXSA9IFwiWm9kTnVtYmVyXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kTmFOXCJdID0gXCJab2ROYU5cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RCaWdJbnRcIl0gPSBcIlpvZEJpZ0ludFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZEJvb2xlYW5cIl0gPSBcIlpvZEJvb2xlYW5cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2REYXRlXCJdID0gXCJab2REYXRlXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kU3ltYm9sXCJdID0gXCJab2RTeW1ib2xcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RVbmRlZmluZWRcIl0gPSBcIlpvZFVuZGVmaW5lZFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZE51bGxcIl0gPSBcIlpvZE51bGxcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RBbnlcIl0gPSBcIlpvZEFueVwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZFVua25vd25cIl0gPSBcIlpvZFVua25vd25cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2ROZXZlclwiXSA9IFwiWm9kTmV2ZXJcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RWb2lkXCJdID0gXCJab2RWb2lkXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kQXJyYXlcIl0gPSBcIlpvZEFycmF5XCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kT2JqZWN0XCJdID0gXCJab2RPYmplY3RcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RVbmlvblwiXSA9IFwiWm9kVW5pb25cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2REaXNjcmltaW5hdGVkVW5pb25cIl0gPSBcIlpvZERpc2NyaW1pbmF0ZWRVbmlvblwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZEludGVyc2VjdGlvblwiXSA9IFwiWm9kSW50ZXJzZWN0aW9uXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kVHVwbGVcIl0gPSBcIlpvZFR1cGxlXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kUmVjb3JkXCJdID0gXCJab2RSZWNvcmRcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RNYXBcIl0gPSBcIlpvZE1hcFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZFNldFwiXSA9IFwiWm9kU2V0XCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kRnVuY3Rpb25cIl0gPSBcIlpvZEZ1bmN0aW9uXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kTGF6eVwiXSA9IFwiWm9kTGF6eVwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZExpdGVyYWxcIl0gPSBcIlpvZExpdGVyYWxcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RFbnVtXCJdID0gXCJab2RFbnVtXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kRWZmZWN0c1wiXSA9IFwiWm9kRWZmZWN0c1wiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZE5hdGl2ZUVudW1cIl0gPSBcIlpvZE5hdGl2ZUVudW1cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RPcHRpb25hbFwiXSA9IFwiWm9kT3B0aW9uYWxcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2ROdWxsYWJsZVwiXSA9IFwiWm9kTnVsbGFibGVcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2REZWZhdWx0XCJdID0gXCJab2REZWZhdWx0XCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kQ2F0Y2hcIl0gPSBcIlpvZENhdGNoXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kUHJvbWlzZVwiXSA9IFwiWm9kUHJvbWlzZVwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZEJyYW5kZWRcIl0gPSBcIlpvZEJyYW5kZWRcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RQaXBlbGluZVwiXSA9IFwiWm9kUGlwZWxpbmVcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RSZWFkb25seVwiXSA9IFwiWm9kUmVhZG9ubHlcIjtcbn0pKFpvZEZpcnN0UGFydHlUeXBlS2luZCB8fCAoWm9kRmlyc3RQYXJ0eVR5cGVLaW5kID0ge30pKTtcbi8vIHJlcXVpcmVzIFRTIDQuNCtcbmNsYXNzIENsYXNzIHtcbiAgICBjb25zdHJ1Y3RvciguLi5fKSB7IH1cbn1cbmNvbnN0IGluc3RhbmNlT2ZUeXBlID0gKFxuLy8gY29uc3QgaW5zdGFuY2VPZlR5cGUgPSA8VCBleHRlbmRzIG5ldyAoLi4uYXJnczogYW55W10pID0+IGFueT4oXG5jbHMsIHBhcmFtcyA9IHtcbiAgICBtZXNzYWdlOiBgSW5wdXQgbm90IGluc3RhbmNlIG9mICR7Y2xzLm5hbWV9YCxcbn0pID0+IGN1c3RvbSgoZGF0YSkgPT4gZGF0YSBpbnN0YW5jZW9mIGNscywgcGFyYW1zKTtcbmNvbnN0IHN0cmluZ1R5cGUgPSBab2RTdHJpbmcuY3JlYXRlO1xuY29uc3QgbnVtYmVyVHlwZSA9IFpvZE51bWJlci5jcmVhdGU7XG5jb25zdCBuYW5UeXBlID0gWm9kTmFOLmNyZWF0ZTtcbmNvbnN0IGJpZ0ludFR5cGUgPSBab2RCaWdJbnQuY3JlYXRlO1xuY29uc3QgYm9vbGVhblR5cGUgPSBab2RCb29sZWFuLmNyZWF0ZTtcbmNvbnN0IGRhdGVUeXBlID0gWm9kRGF0ZS5jcmVhdGU7XG5jb25zdCBzeW1ib2xUeXBlID0gWm9kU3ltYm9sLmNyZWF0ZTtcbmNvbnN0IHVuZGVmaW5lZFR5cGUgPSBab2RVbmRlZmluZWQuY3JlYXRlO1xuY29uc3QgbnVsbFR5cGUgPSBab2ROdWxsLmNyZWF0ZTtcbmNvbnN0IGFueVR5cGUgPSBab2RBbnkuY3JlYXRlO1xuY29uc3QgdW5rbm93blR5cGUgPSBab2RVbmtub3duLmNyZWF0ZTtcbmNvbnN0IG5ldmVyVHlwZSA9IFpvZE5ldmVyLmNyZWF0ZTtcbmNvbnN0IHZvaWRUeXBlID0gWm9kVm9pZC5jcmVhdGU7XG5jb25zdCBhcnJheVR5cGUgPSBab2RBcnJheS5jcmVhdGU7XG5jb25zdCBvYmplY3RUeXBlID0gWm9kT2JqZWN0LmNyZWF0ZTtcbmNvbnN0IHN0cmljdE9iamVjdFR5cGUgPSBab2RPYmplY3Quc3RyaWN0Q3JlYXRlO1xuY29uc3QgdW5pb25UeXBlID0gWm9kVW5pb24uY3JlYXRlO1xuY29uc3QgZGlzY3JpbWluYXRlZFVuaW9uVHlwZSA9IFpvZERpc2NyaW1pbmF0ZWRVbmlvbi5jcmVhdGU7XG5jb25zdCBpbnRlcnNlY3Rpb25UeXBlID0gWm9kSW50ZXJzZWN0aW9uLmNyZWF0ZTtcbmNvbnN0IHR1cGxlVHlwZSA9IFpvZFR1cGxlLmNyZWF0ZTtcbmNvbnN0IHJlY29yZFR5cGUgPSBab2RSZWNvcmQuY3JlYXRlO1xuY29uc3QgbWFwVHlwZSA9IFpvZE1hcC5jcmVhdGU7XG5jb25zdCBzZXRUeXBlID0gWm9kU2V0LmNyZWF0ZTtcbmNvbnN0IGZ1bmN0aW9uVHlwZSA9IFpvZEZ1bmN0aW9uLmNyZWF0ZTtcbmNvbnN0IGxhenlUeXBlID0gWm9kTGF6eS5jcmVhdGU7XG5jb25zdCBsaXRlcmFsVHlwZSA9IFpvZExpdGVyYWwuY3JlYXRlO1xuY29uc3QgZW51bVR5cGUgPSBab2RFbnVtLmNyZWF0ZTtcbmNvbnN0IG5hdGl2ZUVudW1UeXBlID0gWm9kTmF0aXZlRW51bS5jcmVhdGU7XG5jb25zdCBwcm9taXNlVHlwZSA9IFpvZFByb21pc2UuY3JlYXRlO1xuY29uc3QgZWZmZWN0c1R5cGUgPSBab2RFZmZlY3RzLmNyZWF0ZTtcbmNvbnN0IG9wdGlvbmFsVHlwZSA9IFpvZE9wdGlvbmFsLmNyZWF0ZTtcbmNvbnN0IG51bGxhYmxlVHlwZSA9IFpvZE51bGxhYmxlLmNyZWF0ZTtcbmNvbnN0IHByZXByb2Nlc3NUeXBlID0gWm9kRWZmZWN0cy5jcmVhdGVXaXRoUHJlcHJvY2VzcztcbmNvbnN0IHBpcGVsaW5lVHlwZSA9IFpvZFBpcGVsaW5lLmNyZWF0ZTtcbmNvbnN0IG9zdHJpbmcgPSAoKSA9PiBzdHJpbmdUeXBlKCkub3B0aW9uYWwoKTtcbmNvbnN0IG9udW1iZXIgPSAoKSA9PiBudW1iZXJUeXBlKCkub3B0aW9uYWwoKTtcbmNvbnN0IG9ib29sZWFuID0gKCkgPT4gYm9vbGVhblR5cGUoKS5vcHRpb25hbCgpO1xuZXhwb3J0IGNvbnN0IGNvZXJjZSA9IHtcbiAgICBzdHJpbmc6ICgoYXJnKSA9PiBab2RTdHJpbmcuY3JlYXRlKHsgLi4uYXJnLCBjb2VyY2U6IHRydWUgfSkpLFxuICAgIG51bWJlcjogKChhcmcpID0+IFpvZE51bWJlci5jcmVhdGUoeyAuLi5hcmcsIGNvZXJjZTogdHJ1ZSB9KSksXG4gICAgYm9vbGVhbjogKChhcmcpID0+IFpvZEJvb2xlYW4uY3JlYXRlKHtcbiAgICAgICAgLi4uYXJnLFxuICAgICAgICBjb2VyY2U6IHRydWUsXG4gICAgfSkpLFxuICAgIGJpZ2ludDogKChhcmcpID0+IFpvZEJpZ0ludC5jcmVhdGUoeyAuLi5hcmcsIGNvZXJjZTogdHJ1ZSB9KSksXG4gICAgZGF0ZTogKChhcmcpID0+IFpvZERhdGUuY3JlYXRlKHsgLi4uYXJnLCBjb2VyY2U6IHRydWUgfSkpLFxufTtcbmV4cG9ydCB7IGFueVR5cGUgYXMgYW55LCBhcnJheVR5cGUgYXMgYXJyYXksIGJpZ0ludFR5cGUgYXMgYmlnaW50LCBib29sZWFuVHlwZSBhcyBib29sZWFuLCBkYXRlVHlwZSBhcyBkYXRlLCBkaXNjcmltaW5hdGVkVW5pb25UeXBlIGFzIGRpc2NyaW1pbmF0ZWRVbmlvbiwgZWZmZWN0c1R5cGUgYXMgZWZmZWN0LCBlbnVtVHlwZSBhcyBlbnVtLCBmdW5jdGlvblR5cGUgYXMgZnVuY3Rpb24sIGluc3RhbmNlT2ZUeXBlIGFzIGluc3RhbmNlb2YsIGludGVyc2VjdGlvblR5cGUgYXMgaW50ZXJzZWN0aW9uLCBsYXp5VHlwZSBhcyBsYXp5LCBsaXRlcmFsVHlwZSBhcyBsaXRlcmFsLCBtYXBUeXBlIGFzIG1hcCwgbmFuVHlwZSBhcyBuYW4sIG5hdGl2ZUVudW1UeXBlIGFzIG5hdGl2ZUVudW0sIG5ldmVyVHlwZSBhcyBuZXZlciwgbnVsbFR5cGUgYXMgbnVsbCwgbnVsbGFibGVUeXBlIGFzIG51bGxhYmxlLCBudW1iZXJUeXBlIGFzIG51bWJlciwgb2JqZWN0VHlwZSBhcyBvYmplY3QsIG9ib29sZWFuLCBvbnVtYmVyLCBvcHRpb25hbFR5cGUgYXMgb3B0aW9uYWwsIG9zdHJpbmcsIHBpcGVsaW5lVHlwZSBhcyBwaXBlbGluZSwgcHJlcHJvY2Vzc1R5cGUgYXMgcHJlcHJvY2VzcywgcHJvbWlzZVR5cGUgYXMgcHJvbWlzZSwgcmVjb3JkVHlwZSBhcyByZWNvcmQsIHNldFR5cGUgYXMgc2V0LCBzdHJpY3RPYmplY3RUeXBlIGFzIHN0cmljdE9iamVjdCwgc3RyaW5nVHlwZSBhcyBzdHJpbmcsIHN5bWJvbFR5cGUgYXMgc3ltYm9sLCBlZmZlY3RzVHlwZSBhcyB0cmFuc2Zvcm1lciwgdHVwbGVUeXBlIGFzIHR1cGxlLCB1bmRlZmluZWRUeXBlIGFzIHVuZGVmaW5lZCwgdW5pb25UeXBlIGFzIHVuaW9uLCB1bmtub3duVHlwZSBhcyB1bmtub3duLCB2b2lkVHlwZSBhcyB2b2lkLCB9O1xuZXhwb3J0IGNvbnN0IE5FVkVSID0gSU5WQUxJRDtcbiIsICIvKipcbiAqIFx1N0VERlx1NEUwMFx1NTJBOFx1NEY1Q1x1NkEyMVx1NTc4QiAoVW5pZmllZCBBY3Rpb24gTW9kZWwpXG4gKlxuICogXHU4NzhEXHU1NDA4XHU1NkRCXHU0RTJBXHU5ODc5XHU3NkVFXHU3Njg0XHU1MkE4XHU0RjVDXHU4QkVEXHU0RTQ5XHVGRjBDXHU2MkJEXHU4QzYxXHU2MjEwXHU0RTAwXHU1OTU3IEFJIFx1NTNFRlx1NzZGNFx1NjNBNVx1NEY3Rlx1NzUyOFx1NzY4NFx1ODlDNFx1ODMwM1x1NTJBOFx1NEY1Q1x1MzAwMlxuICogLSBcdThCRURcdTRFNDlcdTU0N0RcdTU0MERcdUZGMDhcdTRGOUIgQUkgXHU3NDA2XHU4OUUzXHVGRjBDXHU1MDFGXHU5Mjc0IEJyb3dzZXItVXNlXHVGRjA5XG4gKiAtIFx1N0NCRVx1Nzg2RVx1NTNDMlx1NjU3MFx1RkYwOFx1NEY5Qlx1NUU5NVx1NUM0Mlx1N0NCRVx1Nzg2RVx1NjI2N1x1ODg0Q1x1RkYwQ1x1NTAxRlx1OTI3NCBTdGFnZWhhbmQvUGxheXdyaWdodFx1RkYwOVxuICovXG5pbXBvcnQgeyB6IH0gZnJvbSBcInpvZFwiO1xuXG4vKiogXHU1N0ZBXHU3ODQwXHU1MkE4XHU0RjVDXHU1QjlBXHU0RTQ5ICovXG5leHBvcnQgY29uc3QgQmFzZUFjdGlvblNjaGVtYSA9IHoub2JqZWN0KHtcbiAgLyoqIFx1NTJBOFx1NEY1Q1x1N0M3Qlx1NTc4QiAqL1xuICB0eXBlOiB6LmVudW0oW1xuICAgIFwibmF2aWdhdGVcIixcbiAgICBcImNsaWNrXCIsXG4gICAgXCJmaWxsXCIsXG4gICAgXCJ0eXBlXCIsXG4gICAgXCJzZWxlY3RcIixcbiAgICBcImhvdmVyXCIsXG4gICAgXCJzY3JvbGxcIixcbiAgICBcInByZXNzXCIsXG4gICAgXCJ3YWl0XCIsXG4gICAgXCJzY3JlZW5zaG90XCIsXG4gICAgXCJldmFsdWF0ZVwiLFxuICAgIFwiYXNzZXJ0XCIsXG4gICAgXCJleHRyYWN0XCIsXG4gICAgXCJzbmFwc2hvdFwiLFxuICBdKSxcbiAgLyoqIFx1NTJBOFx1NEY1Q1x1NzUyOFx1OTAxNFx1NjNDRlx1OEZGMFx1RkYwOFx1NEY5QiBBSSAvIFx1NjVFNVx1NUZENyAvIFx1NTZERVx1NjUzRVx1RkYwOSAqL1xuICBkZXNjcmlwdGlvbjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAvKiogXHU4QkVEXHU0RTQ5XHU3NkVFXHU2ODA3XHVGRjA4XHU4MUVBXHU3MTM2XHU4QkVEXHU4QTAwXHVGRjBDXHU0RjlCIEFJIFx1NUM0Mlx1ODlFM1x1Njc5MFx1RkYwOSAqL1xuICBpbnRlbnQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgLyoqIFx1NjYyRlx1NTQyNlx1N0I0OVx1NUY4NVx1NTJBOFx1NEY1Q1x1N0EzM1x1NUI5QVx1NTQwRVx1NTE4RFx1OEZENFx1NTZERSAqL1xuICB3YWl0VW50aWxTdGFibGU6IHouYm9vbGVhbigpLmRlZmF1bHQodHJ1ZSksXG59KTtcblxuLyoqIFx1NUJGQ1x1ODIyQVx1NTJBOFx1NEY1QyAqL1xuZXhwb3J0IGNvbnN0IE5hdmlnYXRlQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJuYXZpZ2F0ZVwiKSxcbiAgdXJsOiB6LnN0cmluZygpLnVybCgpLFxuICAvKiogXHU3QjQ5XHU1Rjg1XHU3RjUxXHU3RURDXHU3QTdBXHU5NUYyICovXG4gIHdhaXRVbnRpbDogelxuICAgIC5lbnVtKFtcImxvYWRcIiwgXCJkb21jb250ZW50bG9hZGVkXCIsIFwibmV0d29ya2lkbGVcIiwgXCJjb21taXRcIl0pXG4gICAgLmRlZmF1bHQoXCJuZXR3b3JraWRsZVwiKSxcbn0pO1xuXG4vKiogXHU3MEI5XHU1MUZCXHU1MkE4XHU0RjVDXHVGRjFBXHU2NTJGXHU2MzAxXHU1OTFBXHU3OUNEXHU1QjlBXHU0RjREXHU3QjU2XHU3NTY1ICovXG5leHBvcnQgY29uc3QgQ2xpY2tBY3Rpb25TY2hlbWEgPSBCYXNlQWN0aW9uU2NoZW1hLmV4dGVuZCh7XG4gIHR5cGU6IHoubGl0ZXJhbChcImNsaWNrXCIpLFxuICAvLyBcdTVCOUFcdTRGNERcdTY1QjlcdTVGMEZcdUZGMDhcdTYzMDlcdTRGMThcdTUxNDhcdTdFQTdcdTVDMURcdThCRDVcdUZGMDlcbiAgc2VsZWN0b3I6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgLy8gXHU4QkVEXHU0RTQ5XHU3NkVFXHU2ODA3XHU2NTg3XHU2NzJDXHVGRjA4XHU1MDFGXHU5Mjc0IEJyb3dzZXItVXNlXHVGRjBDXHU3NTI4XHU2NTg3XHU2NzJDXHU1QjlBXHU0RjREXHVGRjA5XG4gIHRleHQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgLy8gQUkgXHU0RUNFXHU1RkVCXHU3MTY3XHU0RTJEXHU4RkQ0XHU1NkRFXHU3Njg0IHJlZlx1RkYwOFx1OUFEOFx1NjU0OFx1N0NCRVx1Nzg2RVx1NUI5QVx1NEY0RFx1RkYwQ1x1NTAxRlx1OTI3NCBTdGFnZWhhbmQgWFBhdGggLyBBSSBsb2NhdG9yXHVGRjA5XG4gIHJlZjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAvLyBBSSBcdThGRDRcdTU2REVcdTc2ODRcdThCRURcdTRFNDlcdTVCOUFcdTRGNERcdTYzQ0ZcdThGRjBcbiAgc2VtYW50aWM6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgLyoqIFx1NzBCOVx1NTFGQlx1NjMwOVx1OTRBRSAqL1xuICBidXR0b246IHouZW51bShbXCJsZWZ0XCIsIFwicmlnaHRcIiwgXCJtaWRkbGVcIl0pLmRlZmF1bHQoXCJsZWZ0XCIpLFxuICAvKiogXHU3MEI5XHU1MUZCXHU2QjIxXHU2NTcwICovXG4gIGNsaWNrQ291bnQ6IHoubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCgzKS5kZWZhdWx0KDEpLFxuICAvKiogXHU1RjNBXHU1MjM2XHU1RkZEXHU3NTY1XHU1M0VGXHU2NENEXHU0RjVDXHU2MDI3XHU2OEMwXHU2N0U1ICovXG4gIGZvcmNlOiB6LmJvb2xlYW4oKS5kZWZhdWx0KGZhbHNlKSxcbiAgLyoqIFx1NzBCOVx1NTFGQlx1NTQwRVx1NjYyRlx1NTQyNlx1N0I0OVx1NUY4NVx1OTg3NVx1OTc2Mlx1NUJGQ1x1ODIyQVx1N0EzM1x1NUI5QVx1RkYwOFx1NzBCOVx1NTFGQlx1OTRGRVx1NjNBNVx1ODlFNlx1NTNEMVx1OERGM1x1OEY2Q1x1NjVGNlx1RkYwQ1x1N0I0OVx1NUY4NVx1NjVCMFx1OTg3NVx1OTc2Mlx1NTJBMFx1OEY3RFx1NUI4Q1x1NjIxMFx1NTE4RFx1OEZENFx1NTZERVx1RkYwOVx1MzAwMlxuICAgKiAgXHU5RUQ4XHU4QkE0IHRydWVcdUZGMENcdTc4NkVcdTRGREQgQUkgXHU3MEI5XHU1MUZCXHU4REYzXHU4RjZDXHU1NDBFXHU4QkZCXHU1MjMwXHU3Njg0XHU2NjJGXHU3QTMzXHU1QjlBXHU1NDBFXHU3Njg0XHU5ODc1XHU5NzYyXHVGRjBDXHU4MDBDXHU5NzVFXHU2NUU3XHU5ODc1XHU5NzYyXHUzMDAyICovXG4gIHdhaXRGb3JOYXZpZ2F0aW9uOiB6LmJvb2xlYW4oKS5kZWZhdWx0KHRydWUpLFxufSk7XG5cbi8qKiBcdThGOTNcdTUxNjVcdTUyQThcdTRGNUMgKi9cbmV4cG9ydCBjb25zdCBGaWxsQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJmaWxsXCIpLFxuICBzZWxlY3Rvcjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICB0ZXh0OiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gIHJlZjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICBzZW1hbnRpYzogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICB2YWx1ZTogei5zdHJpbmcoKSxcbiAgLyoqIFx1OEY5M1x1NTE2NVx1NkEyMVx1NUYwRlx1RkYxQWZpbGwgXHU1MzczXHU2NUY2XHU1ODZCXHU1MTQ1IC8gdHlwZSBcdTkwMTBcdTk1MkVcdTZBMjFcdTYyREYgKi9cbn0pO1xuXG4vKiogXHU2M0QwXHU1M0Q2XHU1MkE4XHU0RjVDICovXG5leHBvcnQgY29uc3QgRXh0cmFjdEFjdGlvblNjaGVtYSA9IEJhc2VBY3Rpb25TY2hlbWEuZXh0ZW5kKHtcbiAgdHlwZTogei5saXRlcmFsKFwiZXh0cmFjdFwiKSxcbiAgc2VsZWN0b3I6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgdGV4dDogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICByZWY6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgc2VtYW50aWM6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgLyoqIFx1N0VEM1x1Njc4NFx1NTMxNlx1NjNEMFx1NTNENlx1NzY4NCBzY2hlbWEgXHU2M0NGXHU4RkYwICovXG4gIHNjaGVtYTogei5yZWNvcmQoei5zdHJpbmcoKSwgei5hbnkoKSkub3B0aW9uYWwoKSxcbn0pO1xuXG4vKiogXHU2NUFEXHU4QTAwXHU1MkE4XHU0RjVDICovXG5leHBvcnQgY29uc3QgQXNzZXJ0QWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJhc3NlcnRcIiksXG4gIHNlbGVjdG9yOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gIHRleHQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgcmVmOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gIHNlbWFudGljOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gIC8qKiBcdTY1QURcdThBMDBcdTY1QjlcdTVGMEYgKi9cbiAgbW9kZTogelxuICAgIC5lbnVtKFtcInZpc2libGVcIiwgXCJleGlzdHNcIiwgXCJoaWRkZW5cIiwgXCJ0ZXh0LWNvbnRhaW5zXCIsIFwidmFsdWUtZXF1YWxzXCIsIFwiZW5hYmxlZFwiXSlcbiAgICAuZGVmYXVsdChcInZpc2libGVcIiksXG4gIGV4cGVjdGVkOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG59KTtcblxuLyoqIFx1NjIyQVx1NTZGRVx1NTJBOFx1NEY1QyAqL1xuZXhwb3J0IGNvbnN0IFNjcmVlbnNob3RBY3Rpb25TY2hlbWEgPSBCYXNlQWN0aW9uU2NoZW1hLmV4dGVuZCh7XG4gIHR5cGU6IHoubGl0ZXJhbChcInNjcmVlbnNob3RcIiksXG4gIGZ1bGxQYWdlOiB6LmJvb2xlYW4oKS5kZWZhdWx0KGZhbHNlKSxcbiAgLyoqIFx1NjIyQVx1NTZGRVx1NTMzQVx1NTdERlx1RkYwOFx1NTNFRlx1OTAwOVx1RkYwQ1x1NzUyOFx1NEU4RVx1OEMwM1x1OEJENVx1NUI5QVx1NEY0RFx1RkYwOSAqL1xuICBjbGlwOiB6XG4gICAgLm9iamVjdCh7XG4gICAgICB4OiB6Lm51bWJlcigpLFxuICAgICAgeTogei5udW1iZXIoKSxcbiAgICAgIHdpZHRoOiB6Lm51bWJlcigpLFxuICAgICAgaGVpZ2h0OiB6Lm51bWJlcigpLFxuICAgIH0pXG4gICAgLm9wdGlvbmFsKCksXG59KTtcblxuLyoqIFx1NjBBQ1x1NTA1Q1x1NTJBOFx1NEY1QyAqL1xuZXhwb3J0IGNvbnN0IEhvdmVyQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJob3ZlclwiKSxcbiAgc2VsZWN0b3I6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgdGV4dDogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICByZWY6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgc2VtYW50aWM6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbn0pO1xuXG4vKiogXHU2RURBXHU1MkE4XHU1MkE4XHU0RjVDICovXG5leHBvcnQgY29uc3QgU2Nyb2xsQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJzY3JvbGxcIiksXG4gIGRlbHRhWDogei5udW1iZXIoKS5kZWZhdWx0KDApLFxuICBkZWx0YVk6IHoubnVtYmVyKCkuZGVmYXVsdCg2MDApLFxufSk7XG5cbi8qKiBcdTdCNDlcdTVGODVcdTUyQThcdTRGNUMgKi9cbmV4cG9ydCBjb25zdCBXYWl0QWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJ3YWl0XCIpLFxuICBtczogei5udW1iZXIoKS5pbnQoKS5taW4oMCkuZGVmYXVsdCgxMDAwKSxcbn0pO1xuXG4vKiogSlMgXHU2MjY3XHU4ODRDXHU1MkE4XHU0RjVDXHVGRjA4XHU5QUQ4XHU3RUE3XHU4QkNBXHU2NUFEXHVGRjA5ICovXG5leHBvcnQgY29uc3QgRXZhbHVhdGVBY3Rpb25TY2hlbWEgPSBCYXNlQWN0aW9uU2NoZW1hLmV4dGVuZCh7XG4gIHR5cGU6IHoubGl0ZXJhbChcImV2YWx1YXRlXCIpLFxuICBzY3JpcHQ6IHouc3RyaW5nKCksXG59KTtcblxuLyoqIFx1NjMwOVx1OTUyRVx1NTJBOFx1NEY1QyAqL1xuZXhwb3J0IGNvbnN0IFByZXNzQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJwcmVzc1wiKSxcbiAga2V5OiB6LnN0cmluZygpLFxufSk7XG5cbi8qKiBcdTkwMTBcdTk1MkVcdThGOTNcdTUxNjVcdTUyQThcdTRGNUMgKi9cbmV4cG9ydCBjb25zdCBUeXBlQWN0aW9uU2NoZW1hID0gQmFzZUFjdGlvblNjaGVtYS5leHRlbmQoe1xuICB0eXBlOiB6LmxpdGVyYWwoXCJ0eXBlXCIpLFxuICBzZWxlY3Rvcjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICB0ZXh0OiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gIHJlZjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICB2YWx1ZTogei5zdHJpbmcoKSxcbiAgZGVsYXk6IHoubnVtYmVyKCkuaW50KCkubWluKDApLmRlZmF1bHQoMCksXG59KTtcblxuLyoqIFx1NEUwQlx1NjJDOVx1OTAwOVx1NjJFOVx1NTJBOFx1NEY1QyAqL1xuZXhwb3J0IGNvbnN0IFNlbGVjdEFjdGlvblNjaGVtYSA9IEJhc2VBY3Rpb25TY2hlbWEuZXh0ZW5kKHtcbiAgdHlwZTogei5saXRlcmFsKFwic2VsZWN0XCIpLFxuICBzZWxlY3Rvcjogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICByZWY6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgdmFsdWU6IHouc3RyaW5nKCksXG59KTtcblxuLyoqIFx1N0VERlx1NEUwMFx1NTJBOFx1NEY1Q1x1ODA1NFx1NTQwOCAqL1xuZXhwb3J0IGNvbnN0IFVuaWZpZWRBY3Rpb25TY2hlbWEgPSB6LmRpc2NyaW1pbmF0ZWRVbmlvbihcInR5cGVcIiwgW1xuICBOYXZpZ2F0ZUFjdGlvblNjaGVtYSxcbiAgQ2xpY2tBY3Rpb25TY2hlbWEsXG4gIEZpbGxBY3Rpb25TY2hlbWEsXG4gIFR5cGVBY3Rpb25TY2hlbWEsXG4gIFNlbGVjdEFjdGlvblNjaGVtYSxcbiAgSG92ZXJBY3Rpb25TY2hlbWEsXG4gIFNjcm9sbEFjdGlvblNjaGVtYSxcbiAgV2FpdEFjdGlvblNjaGVtYSxcbiAgRXZhbHVhdGVBY3Rpb25TY2hlbWEsXG4gIFByZXNzQWN0aW9uU2NoZW1hLFxuICBFeHRyYWN0QWN0aW9uU2NoZW1hLFxuICBBc3NlcnRBY3Rpb25TY2hlbWEsXG4gIFNjcmVlbnNob3RBY3Rpb25TY2hlbWEsXG5dKTtcblxuZXhwb3J0IHR5cGUgVW5pZmllZEFjdGlvbiA9IHouaW5mZXI8dHlwZW9mIFVuaWZpZWRBY3Rpb25TY2hlbWE+O1xuZXhwb3J0IHR5cGUgQWN0aW9uVHlwZSA9IFVuaWZpZWRBY3Rpb25bXCJ0eXBlXCJdO1xuXG4vKiogXHU1MkE4XHU0RjVDXHU2MjY3XHU4ODRDXHU3RUQzXHU2NzlDICovXG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvblJlc3VsdCB7XG4gIG9rOiBib29sZWFuO1xuICB0eXBlOiBBY3Rpb25UeXBlO1xuICAvKiogXHU0RUJBXHU3QzdCXHU1M0VGXHU4QkZCXHU3Njg0XHU3RUQzXHU2NzlDXHVGRjA4XHU0RjlCIEFJIC8gXHU2NUU1XHU1RkQ3XHVGRjA5ICovXG4gIHN1bW1hcnk6IHN0cmluZztcbiAgLyoqIFx1N0VEM1x1Njc4NFx1NTMxNlx1NjU3MFx1NjM2RVx1RkYwOFx1NjNEMFx1NTNENi9cdTVGRUJcdTcxNjdcdTc1MjhcdUZGMDkgKi9cbiAgZGF0YT86IHVua25vd247XG4gIC8qKiBcdThDMDNcdThCRDVcdThCQ0FcdTY1QURcdTRGRTFcdTYwNkZcdUZGMDhcdTk0RkVcdTYzQTVcdTUyMzAgZGlhZ25vc2lzIFx1NEUyRFx1NUZDM1x1RkYwOSAqL1xuICBkaWFnbm9zdGljcz86IERpYWdub3N0aWNSZWZbXTtcbiAgLyoqIFx1ODAxN1x1NjVGNiAqL1xuICBkdXJhdGlvbk1zOiBudW1iZXI7XG4gIC8qKiBcdTUxRkFcdTk1MTlcdTY1RjZcdTc2ODRcdTk1MTlcdThCRUZcdTRGRTFcdTYwNkYgKi9cbiAgZXJyb3I/OiBzdHJpbmc7XG4gIC8qKiBcdTYyNjdcdTg4NENcdTU0MEVcdTc2ODRcdTk4NzVcdTk3NjJcdTVGRUJcdTcxNjdcdTVGMTVcdTc1MjggKi9cbiAgc25hcHNob3RSZWY/OiBzdHJpbmc7XG59XG5cbi8qKiBcdThCQ0FcdTY1QURcdTVGMTVcdTc1MjhcdUZGMUFcdTYyOEFcdTdFRDNcdTY3OUNcdTUxNzNcdTgwNTRcdTUyMzAgNSBcdTY2MUZcdThDMDNcdThCRDVcdThCQ0FcdTY1QURcdTRFMkRcdTVGQzMgKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGlhZ25vc3RpY1JlZiB7XG4gIGtpbmQ6IFwiY29uc29sZVwiIHwgXCJuZXR3b3JrXCIgfCBcImRvbVwiIHwgXCJwZXJmb3JtYW5jZVwiIHwgXCJqcy1leGNlcHRpb25cIiB8IFwiYWNjZXNzaWJpbGl0eVwiO1xuICBzZXZlcml0eTogXCJpbmZvXCIgfCBcIndhcm5pbmdcIiB8IFwiZXJyb3JcIjtcbiAgbWVzc2FnZTogc3RyaW5nO1xuICAvKiogXHU1M0VGXHU1QzU1XHU1RjAwXHU3Njg0XHU4QkU2XHU2MEM1XHVGRjA4XHU1OTgyIHN0YWNrXHUzMDAxcmVxdWVzdElkXHVGRjA5ICovXG4gIGRldGFpbD86IHVua25vd247XG4gIC8qKiBcdTY1RjZcdTk1RjRcdTYyMzMgKi9cbiAgdGltZXN0YW1wOiBudW1iZXI7XG59XG4iLCAiLyoqXG4gKiBcdTcyQjZcdTYwMDFcdTY3M0FcdUZGMUFcdThEREZcdThFMkEgQUkgXHU1NzI4XHU5ODc1XHU5NzYyXHU0RTBBXHU3Njg0XHU2NENEXHU0RjVDXHU0RjFBXHU4QkREXHU3MkI2XHU2MDAxXHVGRjA4XHU1MDFGXHU5Mjc0IFN0YWdlaGFuZCBcdTc2ODQgQWN0L0V4dHJhY3QvT2JzZXJ2ZSBcdTc1MUZcdTU0N0RcdTU0NjhcdTY3MUZcdUZGMDlcbiAqL1xuZXhwb3J0IHR5cGUgU2Vzc2lvblBoYXNlID1cbiAgfCBcImlkbGVcIlxuICB8IFwibmF2aWdhdGluZ1wiXG4gIHwgXCJhY3RpbmdcIlxuICB8IFwib2JzZXJ2aW5nXCJcbiAgfCBcImV4dHJhY3RpbmdcIlxuICB8IFwiZGlhZ25vc2luZ1wiXG4gIHwgXCJlcnJvclwiXG4gIHwgXCJkb25lXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2Vzc2lvblN0YXRlIHtcbiAgcGhhc2U6IFNlc3Npb25QaGFzZTtcbiAgLyoqIFx1NURGMlx1NjI2N1x1ODg0Q1x1NzY4NFx1NkI2NVx1NjU3MCAqL1xuICBzdGVwczogbnVtYmVyO1xuICAvKiogXHU1RjUzXHU1MjREXHU5ODc1XHU5NzYyIFVSTCAqL1xuICB1cmw/OiBzdHJpbmc7XG4gIC8qKiBcdTY3MDBcdThGRDFcdTRFMDBcdTZCMjFcdTVGRUJcdTcxNjcgKi9cbiAgbGFzdFNuYXBzaG90UmVmPzogc3RyaW5nO1xuICAvKiogXHU2NzAwXHU4RkQxXHU0RTAwXHU2QjIxXHU1MkE4XHU0RjVDXHU3RUQzXHU2NzlDICovXG4gIGxhc3RBY3Rpb24/OiBzdHJpbmc7XG4gIC8qKiBcdTRGMUFcdThCRERcdTVGMDBcdTU5Q0JcdTY1RjZcdTk1RjQgKi9cbiAgc3RhcnRlZEF0OiBudW1iZXI7XG4gIC8qKiBcdTk1MTlcdThCRUZcdTRGRTFcdTYwNkZcdUZGMDhcdTgyRTVcdTU5MDRcdTRFOEUgZXJyb3IgXHU5NjM2XHU2QkI1XHVGRjA5ICovXG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgU2Vzc2lvbk1hY2hpbmUge1xuICBwcml2YXRlIHN0YXRlOiBTZXNzaW9uU3RhdGU7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgIHBoYXNlOiBcImlkbGVcIixcbiAgICAgIHN0ZXBzOiAwLFxuICAgICAgc3RhcnRlZEF0OiBEYXRlLm5vdygpLFxuICAgIH07XG4gIH1cblxuICBnZXQgc25hcHNob3QoKTogUmVhZG9ubHk8U2Vzc2lvblN0YXRlPiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGU7XG4gIH1cblxuICB0cmFuc2l0aW9uKG5leHQ6IFNlc3Npb25QaGFzZSwgcGF0Y2g/OiBQYXJ0aWFsPFNlc3Npb25TdGF0ZT4pIHtcbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgIC4uLnBhdGNoLFxuICAgICAgcGhhc2U6IG5leHQsXG4gICAgfTtcbiAgICBpZiAobmV4dCA9PT0gXCJhY3RpbmdcIiB8fCBuZXh0ID09PSBcIm5hdmlnYXRpbmdcIiB8fCBuZXh0ID09PSBcIm9ic2VydmluZ1wiIHx8IG5leHQgPT09IFwiZXh0cmFjdGluZ1wiKSB7XG4gICAgICB0aGlzLnN0YXRlLnN0ZXBzICs9IDE7XG4gICAgfVxuICB9XG5cbiAgc2V0VXJsKHVybDogc3RyaW5nKSB7XG4gICAgdGhpcy5zdGF0ZS51cmwgPSB1cmw7XG4gIH1cblxuICBzZXRFcnJvcihlcnJvcjogc3RyaW5nKSB7XG4gICAgdGhpcy5zdGF0ZS5lcnJvciA9IGVycm9yO1xuICAgIHRoaXMuc3RhdGUucGhhc2UgPSBcImVycm9yXCI7XG4gIH1cblxuICAvKiogXHU5MUNEXHU3RjZFXHU0RjFBXHU4QkREXHVGRjA4XHU0RjlCXHU0RTBCXHU0RTAwXHU4RjZFXHU1OTBEXHU3NTI4XHU1NDBDXHU0RTAwXHU2RDRGXHU4OUM4XHU1NjY4XHU1QjlFXHU0RjhCXHVGRjA5ICovXG4gIHJlc2V0KCkge1xuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBwaGFzZTogXCJpZGxlXCIsXG4gICAgICBzdGVwczogMCxcbiAgICAgIHN0YXJ0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICB9O1xuICB9XG59XG4iLCAiLyoqXG4gKiBGb3JnZUJyb3dzZXIgXHUyMDE0XHUyMDE0IFx1N0VERlx1NEUwMFx1NkQ0Rlx1ODlDOFx1NTY2OFx1NjNBN1x1NTIzNlx1OTVFOFx1OTc2Mlx1RkYwOFx1Njg0Nlx1NjdCNlx1NjgzOFx1NUZDM1x1RkYwOVxuICpcbiAqIFx1OTc2Mlx1NTQxMSBBSSBBZ2VudCBcdTc2ODRcdTRFMDBcdTdBRDlcdTVGMEZcdTYzQTVcdTUzRTNcdUZGMENcdTg3OERcdTU0MDhcdUZGMUFcbiAqIC0gXHU3RURGXHU0RTAwXHU1MkE4XHU0RjVDXHU2MjY3XHU4ODRDXHVGRjA4U3RhZ2VoYW5kL1BsYXl3cmlnaHQgXHU3Q0JFXHU3ODZFICsgQnJvd3Nlci1Vc2UgXHU4QkVEXHU0RTQ5XHVGRjA5XG4gKiAtIFx1OUFEOFx1NjU0OFx1OTg3NVx1OTc2Mlx1NUZFQlx1NzE2N1x1RkYwOENocm9tZSBEZXZUb29scyBNQ1AgXHU3Njg0IFRva2VuIFx1N0I1Nlx1NzU2NVx1RkYwOVxuICogLSA1IFx1NjYxRlx1OEMwM1x1OEJENVx1OEJDQVx1NjVBRFx1RkYwOENocm9tZSBEZXZUb29scyBNQ1AgXHU4MEZEXHU1MjlCXHVGRjA5XG4gKi9cbmltcG9ydCB0eXBlIHsgQnJvd3NlckVuZ2luZSwgRGlhZ25vc3RpY1JlcG9ydCB9IGZyb20gXCIuL2VuZ2luZS5qc1wiO1xuaW1wb3J0IHR5cGUgeyBVbmlmaWVkQWN0aW9uLCBBY3Rpb25SZXN1bHQgfSBmcm9tIFwiLi9hY3Rpb25zLmpzXCI7XG5pbXBvcnQgdHlwZSB7IFBhZ2VTbmFwc2hvdCwgU25hcHNob3RPcHRpb25zIH0gZnJvbSBcIi4vc25hcHNob3QuanNcIjtcbmltcG9ydCB7IFNlc3Npb25NYWNoaW5lIH0gZnJvbSBcIi4vc2Vzc2lvbi5qc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZvcmdlT3B0aW9ucyB7XG4gIC8qKiBcdTUyQThcdTRGNUNcdThEODVcdTY1RjZcdUZGMDhcdTlFRDhcdThCQTQgMzBzXHVGRjA5ICovXG4gIHRpbWVvdXRNcz86IG51bWJlcjtcbiAgLyoqIFx1NUZFQlx1NzE2N1x1OUVEOFx1OEJBNFx1OTAwOVx1OTg3OSAqL1xuICBzbmFwc2hvdE9wdGlvbnM/OiBTbmFwc2hvdE9wdGlvbnM7XG4gIC8qKiBcdTUyQThcdTRGNUNcdTU5MzFcdThEMjVcdTU0MEVcdTY2MkZcdTU0MjZcdTgxRUFcdTUyQThcdTkxQzdcdTk2QzZcdThCQ0FcdTY1QURcdUZGMDhcdTlFRDhcdThCQTQgdHJ1ZVx1RkYwQ1x1NEY1M1x1NzNCMFx1OEMwM1x1OEJENVx1NEYxOFx1NTE0OFx1RkYwOSAqL1xuICBhdXRvRGlhZ25vc2VPbkVycm9yPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIEZvcmdlQnJvd3NlciB7XG4gIHJlYWRvbmx5IHNlc3Npb24gPSBuZXcgU2Vzc2lvbk1hY2hpbmUoKTtcbiAgcHJpdmF0ZSBvcHRzOiBSZXF1aXJlZDxGb3JnZU9wdGlvbnM+O1xuICBwcml2YXRlIGRpYWdub3N0aWNzQ2FjaGU6IERpYWdub3N0aWNSZXBvcnQgPSB7XG4gICAgY29uc29sZTogW10sXG4gICAgbmV0d29yazogW10sXG4gICAgZG9tOiBbXSxcbiAgICBwZXJmb3JtYW5jZTogW10sXG4gICAganNFeGNlcHRpb25zOiBbXSxcbiAgICBhY2Nlc3NpYmlsaXR5OiBbXSxcbiAgfTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIGVuZ2luZTogQnJvd3NlckVuZ2luZSxcbiAgICBvcHRzOiBGb3JnZU9wdGlvbnMgPSB7fVxuICApIHtcbiAgICB0aGlzLm9wdHMgPSB7XG4gICAgICB0aW1lb3V0TXM6IDMwXzAwMCxcbiAgICAgIHNuYXBzaG90T3B0aW9uczogeyBtYXhOb2RlczogMjAwLCBtYXhUZXh0TGVuZ3RoOiA4MCwgd2l0aFNlbGVjdG9yczogdHJ1ZSB9LFxuICAgICAgYXV0b0RpYWdub3NlT25FcnJvcjogdHJ1ZSxcbiAgICAgIC4uLm9wdHMsXG4gICAgfTtcbiAgfVxuXG4gIGdldCBlbmdpbmVOYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZW5naW5lLm5hbWU7XG4gIH1cblxuICAvKiogXHU1NDJGXHU1MkE4ICovXG4gIGFzeW5jIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuZW5naW5lLmluaXQoKTtcbiAgICB0aGlzLnNlc3Npb24udHJhbnNpdGlvbihcImlkbGVcIik7XG4gIH1cblxuICAvKiogXHU1MDVDXHU2QjYyICovXG4gIGFzeW5jIHN0b3AoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5lbmdpbmUuY2xvc2UoKTtcbiAgICB0aGlzLnNlc3Npb24udHJhbnNpdGlvbihcImRvbmVcIik7XG4gIH1cblxuICAvKipcbiAgICogXHU2MjY3XHU4ODRDXHU3RURGXHU0RTAwXHU1MkE4XHU0RjVDXHUzMDAyXG4gICAqIFx1NTkzMVx1OEQyNVx1NjVGNlx1ODFFQVx1NTJBOFx1ODlFNlx1NTNEMVx1OEJDQVx1NjVBRFx1OTFDN1x1OTZDNlx1RkYwQ1x1OEZENFx1NTZERVx1NUUyNlx1OEJDQVx1NjVBRFx1NUYxNVx1NzUyOFx1NzY4NFx1N0VEM1x1Njc5Q1x1MzAwMlxuICAgKi9cbiAgYXN5bmMgYWN0KGFjdGlvbjogVW5pZmllZEFjdGlvbik6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gICAgY29uc3QgdDAgPSBEYXRlLm5vdygpO1xuICAgIHRoaXMuc2Vzc2lvbi50cmFuc2l0aW9uKFwiYWN0aW5nXCIpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmVuZ2luZS5leGVjdXRlKGFjdGlvbik7XG4gICAgICByZXN1bHQuZHVyYXRpb25NcyA9IERhdGUubm93KCkgLSB0MDtcbiAgICAgIHRoaXMuc2Vzc2lvbi5zZXRVcmwocmVzdWx0LnN1bW1hcnkuaW5jbHVkZXMoXCJodHRwXCIpID8gcmVzdWx0LnN1bW1hcnkgOiAodGhpcy5zZXNzaW9uLnNuYXBzaG90LnVybCA/PyBcIlwiKSk7XG4gICAgICBpZiAocmVzdWx0Lm9rKSB7XG4gICAgICAgIHRoaXMuc2Vzc2lvbi50cmFuc2l0aW9uKFwiYWN0aW5nXCIsIHsgbGFzdEFjdGlvbjogYWN0aW9uLnR5cGUgfSk7XG4gICAgICAgIC8vIFx1NTJBOFx1NEY1Q1x1NTQwRVx1OTg3QVx1NjI0Qlx1OTFDN1x1OTZDNlx1NjNBN1x1NTIzNlx1NTNGMC9cdTdGNTFcdTdFRENcdTVGMDJcdTVFMzhcdUZGMENcdTRGOUIgQUkgXHU1MjI0XHU2NUFEXHU5ODc1XHU5NzYyXHU2NjJGXHU1NDI2XHU1RjAyXHU1RTM4XG4gICAgICAgIHJlc3VsdC5kaWFnbm9zdGljcyA9IGF3YWl0IHRoaXMuZW5naW5lLmRpYWdub3NlKCkudGhlbigoZCkgPT5cbiAgICAgICAgICBbXG4gICAgICAgICAgICAuLi5kLmNvbnNvbGUuZmlsdGVyKChjKSA9PiBjLnNldmVyaXR5ID09PSBcImVycm9yXCIpLFxuICAgICAgICAgICAgLi4uZC5uZXR3b3JrLmZpbHRlcigobikgPT4gbi5zZXZlcml0eSA9PT0gXCJlcnJvclwiKSxcbiAgICAgICAgICAgIC4uLmQuanNFeGNlcHRpb25zLFxuICAgICAgICAgIF0uc2xpY2UoMCwgOClcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpO1xuICAgICAgY29uc3QgcmVzdWx0OiBBY3Rpb25SZXN1bHQgPSB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgdHlwZTogYWN0aW9uLnR5cGUsXG4gICAgICAgIHN1bW1hcnk6IGBcdTUyQThcdTRGNUNcdTYyNjdcdTg4NENcdTU5MzFcdThEMjU6ICR7bWVzc2FnZX1gLFxuICAgICAgICBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAsXG4gICAgICAgIGVycm9yOiBtZXNzYWdlLFxuICAgICAgfTtcbiAgICAgIGlmICh0aGlzLm9wdHMuYXV0b0RpYWdub3NlT25FcnJvcikge1xuICAgICAgICAvLyA1IFx1NjYxRlx1OEMwM1x1OEJENVx1RkYxQVx1NTkzMVx1OEQyNVx1NTM3M1x1OTFDN1x1OTZDNlx1NTE2OFx1OTFDRlx1OEJDQVx1NjVBRFx1RkYwOFx1NTQyQiBET00gXHU3NjdEXHU1QzRGL1x1NjcyQVx1NkUzMlx1NjdEM1x1NjhDMFx1NkQ0Qlx1RkYwOVxuICAgICAgICBjb25zdCByZXBvcnQgPSBhd2FpdCB0aGlzLmNhcHR1cmVEaWFnbm9zdGljcygpO1xuICAgICAgICByZXN1bHQuZGlhZ25vc3RpY3MgPSBbXG4gICAgICAgICAgLi4ucmVwb3J0LmNvbnNvbGUsXG4gICAgICAgICAgLi4ucmVwb3J0Lm5ldHdvcmssXG4gICAgICAgICAgLi4ucmVwb3J0LmRvbSxcbiAgICAgICAgICAuLi5yZXBvcnQuanNFeGNlcHRpb25zLFxuICAgICAgICAgIC4uLnJlcG9ydC5wZXJmb3JtYW5jZSxcbiAgICAgICAgXS5zbGljZSgwLCAxMCk7XG4gICAgICB9XG4gICAgICB0aGlzLnNlc3Npb24uc2V0RXJyb3IobWVzc2FnZSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfVxuXG4gIC8qKiBcdTgzQjdcdTUzRDZcdTk4NzVcdTk3NjJcdTVGRUJcdTcxNjdcdUZGMDhcdTRGOUIgQUkgXHU4OUMyXHU1QkRGXHU5ODc1XHU5NzYyXHVGRjA5ICovXG4gIGFzeW5jIG9ic2VydmUob3B0cz86IFNuYXBzaG90T3B0aW9ucyk6IFByb21pc2U8UGFnZVNuYXBzaG90PiB7XG4gICAgdGhpcy5zZXNzaW9uLnRyYW5zaXRpb24oXCJvYnNlcnZpbmdcIik7XG4gICAgY29uc3Qgc25hcCA9IGF3YWl0IHRoaXMuZW5naW5lLnNuYXBzaG90KG9wdHMgPz8gdGhpcy5vcHRzLnNuYXBzaG90T3B0aW9ucyk7XG4gICAgdGhpcy5zZXNzaW9uLnRyYW5zaXRpb24oXCJvYnNlcnZpbmdcIiwgeyBsYXN0U25hcHNob3RSZWY6IGAke3NuYXAudXJsfSMke3NuYXAudGltZXN0YW1wfWAgfSk7XG4gICAgcmV0dXJuIHNuYXA7XG4gIH1cblxuICAvKiogXHU5MUM3XHU5NkM2XHU1MTY4XHU5MUNGXHU4QzAzXHU4QkQ1XHU4QkNBXHU2NUFEXHVGRjA4NSBcdTY2MUZcdTgwRkRcdTUyOUJcdTY4MzhcdTVGQzNcdUZGMDkgKi9cbiAgYXN5bmMgY2FwdHVyZURpYWdub3N0aWNzKCk6IFByb21pc2U8RGlhZ25vc3RpY1JlcG9ydD4ge1xuICAgIHRoaXMuc2Vzc2lvbi50cmFuc2l0aW9uKFwiZGlhZ25vc2luZ1wiKTtcbiAgICBjb25zdCByYXcgPSBhd2FpdCB0aGlzLmVuZ2luZS5kaWFnbm9zZSgpO1xuICAgIC8vIFx1NUY1Mlx1NEUwMFx1NTMxNlx1RkYxQVx1NUJGOVx1N0YzQVx1NTkzMVx1NzY4NCBkb20vYWNjZXNzaWJpbGl0eSBcdTVCNTdcdTZCQjVcdTUxNUNcdTVFOTVcdUZGMENcdTUxN0NcdTVCQjlcdTY1RTdcdTVGMTVcdTY0Q0VcdThGRDRcdTU2REVcdTc2ODQgNCBcdTVCNTdcdTZCQjVcdTdFRDNcdTY3ODRcbiAgICB0aGlzLmRpYWdub3N0aWNzQ2FjaGUgPSB7XG4gICAgICBjb25zb2xlOiByYXcuY29uc29sZSA/PyBbXSxcbiAgICAgIG5ldHdvcms6IHJhdy5uZXR3b3JrID8/IFtdLFxuICAgICAgZG9tOiByYXcuZG9tID8/IFtdLFxuICAgICAgcGVyZm9ybWFuY2U6IHJhdy5wZXJmb3JtYW5jZSA/PyBbXSxcbiAgICAgIGpzRXhjZXB0aW9uczogcmF3LmpzRXhjZXB0aW9ucyA/PyBbXSxcbiAgICAgIGFjY2Vzc2liaWxpdHk6IHJhdy5hY2Nlc3NpYmlsaXR5ID8/IFtdLFxuICAgIH07XG4gICAgdGhpcy5zZXNzaW9uLnRyYW5zaXRpb24oXCJhY3RpbmdcIik7XG4gICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3NDYWNoZTtcbiAgfVxuXG4gIC8qKiBcdTY3MDBcdThGRDFcdTRFMDBcdTZCMjFcdThCQ0FcdTY1QURcdTYyQTVcdTU0NEEgKi9cbiAgZ2V0IGxhc3REaWFnbm9zdGljcygpOiBEaWFnbm9zdGljUmVwb3J0IHtcbiAgICByZXR1cm4gdGhpcy5kaWFnbm9zdGljc0NhY2hlO1xuICB9XG5cbiAgLyoqIFx1NkNFOFx1NTE2NVx1NjI2N1x1ODg0QyBKU1x1RkYwOFx1OUFEOFx1N0VBN1x1OEJDQVx1NjVBRC9cdThCQzRcdTRGMzBcdUZGMDkgKi9cbiAgYXN5bmMgZXZhbChzY3JpcHQ6IHN0cmluZyk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIHJldHVybiB0aGlzLmVuZ2luZS5ldmFsdWF0ZShzY3JpcHQpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBcdTUxNDNcdTdEMjBcdTVCOUFcdTRGNERcdTU2NjhcdUZGMUFcdTU5MUFcdTdCNTZcdTc1NjVcdTVCOUFcdTRGNERcbiAqXG4gKiBcdTUwMUZcdTkyNzRcdUZGMUFcbiAqIC0gU3RhZ2VoYW5kXHVGRjFBQ1NTIFx1OTAwOVx1NjJFOVx1NTY2OFx1MzAwMVhQYXRoXHUzMDAxQUkgTG9jYXRvclx1MzAwMVx1NjU4N1x1NjcyQ1x1NUI5QVx1NEY0RFxuICogLSBCcm93c2VyLVVzZVx1RkYxQVx1OEJFRFx1NEU0OS9cdTY1ODdcdTY3MkNcdTVCOUFcdTRGNERcbiAqIC0gRGV2VG9vbHMgTUNQXHVGRjFBXHU5MDFBXHU4RkM3IHJlZiBcdTdDQkVcdTc4NkVcdTVCRkJcdTU3NDBcbiAqXG4gKiBcdTVCOUFcdTRGNERcdTRGMThcdTUxNDhcdTdFQTdcdUZGMUFyZWZcdUZGMDhcdTVGRUJcdTcxNjdcdTVGMTVcdTc1MjhcdUZGMDkgPiBzZWxlY3RvciA+IHRleHQgPiBzZW1hbnRpYyA+IGludGVudFxuICovXG5pbXBvcnQgdHlwZSB7IFBhZ2UgfSBmcm9tIFwicGxheXdyaWdodFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvY2F0ZU9wdGlvbnMge1xuICAvKiogXHU1RkVCXHU3MTY3XHU1RjE1XHU3NTI4ICovXG4gIHJlZj86IHN0cmluZztcbiAgLyoqIENTUyBcdTkwMDlcdTYyRTlcdTU2NjggKi9cbiAgc2VsZWN0b3I/OiBzdHJpbmc7XG4gIC8qKiBcdTdDQkVcdTc4NkVcdTY1ODdcdTY3MkMgKi9cbiAgdGV4dD86IHN0cmluZztcbiAgLyoqIFx1OEJFRFx1NEU0OVx1NjNDRlx1OEZGMFx1RkYwOFx1ODFFQVx1NzEzNlx1OEJFRFx1OEEwMFx1RkYwQ1x1NjcwMFx1N0VDOFx1NTZERVx1OTAwMFx1NTIzMCBBSSBcdTg5RTNcdTY3OTBcdUZGMDkgKi9cbiAgc2VtYW50aWM/OiBzdHJpbmc7XG4gIC8qKiBcdThEODVcdTY1RjYgKi9cbiAgdGltZW91dE1zPzogbnVtYmVyO1xufVxuXG4vKiogXHU1QjlBXHU0RjREXHU3RUQzXHU2NzlDXHVGRjFBXHU4RkQ0XHU1NkRFXHU1M0VGXHU2NENEXHU0RjVDXHU3Njg0IGxvY2F0b3IgXHU0RTBFXHU1MTc2XHU2M0NGXHU4RkYwICovXG5leHBvcnQgaW50ZXJmYWNlIExvY2F0ZWQge1xuICBsb2NhdG9yOiBpbXBvcnQoXCJwbGF5d3JpZ2h0XCIpLkxvY2F0b3I7XG4gIC8qKiBcdTVCOUFcdTRGNERcdTY1QjlcdTVGMEZcdThCRjRcdTY2MEVcdUZGMDhcdTRGOUJcdTY1RTVcdTVGRDcvXHU4QkNBXHU2NUFEXHVGRjA5ICovXG4gIHN0cmF0ZWd5OiBcInJlZlwiIHwgXCJzZWxlY3RvclwiIHwgXCJ0ZXh0XCIgfCBcInNlbWFudGljXCI7XG4gIC8qKiBcdTc1MjhcdTRFOEVcdTdDQkVcdTc4NkVcdTk1MUFcdTVCOUFcdTc2ODRcdTU1MkZcdTRFMDAgQ1NTIFx1OTAwOVx1NjJFOVx1NTY2OFx1RkYwOFx1NEY5Qlx1NTQwRVx1N0VFRFx1OEJDQVx1NjVBRC9cdTkxQ0RcdThCRDVcdUZGMDkgKi9cbiAgYW5jaG9yU2VsZWN0b3I6IHN0cmluZztcbn1cblxuLyoqXG4gKiBcdThCRURcdTRFNDlcdTg5RTNcdTY3OTBcdTU2NjhcdTU2REVcdThDMDNcdUZGMUFcdTYyOEFcdTgxRUFcdTcxMzZcdThCRURcdThBMDBcdThCRURcdTRFNDlcdTYzQ0ZcdThGRjBcdTg5RTNcdTY3OTBcdTRFM0FcdTUzRUZcdTVCOUFcdTRGNERcdTUzQzJcdTY1NzBcdTMwMDJcbiAqIFx1NzUzMVx1NUYxNVx1NjRDRVx1NTcyOFx1NTIxRFx1NTlDQlx1NTMxNlx1NjVGNlx1NkNFOFx1NTE2NVx1RkYwOFx1OTAxQVx1NUUzOFx1NTdGQVx1NEU4RSBhaS1sYXllciBcdTc2ODRcdThCRURcdTRFNDlcdTVCOUFcdTRGNERcdTU2NjhcdUZGMENcdTdFRDNcdTU0MDhcdTVGRUJcdTcxNjdcdTUwNUFcbiAqIFx1NEUyRFx1NjU4N1x1NTIwNlx1OEJDRC9cdThCRURcdTRFNDlcdTc2RjhcdTRGM0NcdTVFQTZcdTUzMzlcdTkxNERcdUZGMDlcdUZGMENcdTRFQ0VcdTgwMENcdTYyNTNcdTkwMUFcdTMwMENBSSBcdThCRURcdTRFNDlcdTVDNDIgXHUyMTkyIFx1NUYxNVx1NjRDRVx1N0NCRVx1Nzg2RVx1NUI5QVx1NEY0RFx1MzAwRFx1NzY4NFx1OTRGRVx1OERFRlx1MzAwMlxuICogXHU4RkQ0XHU1NkRFIG51bGwgXHU4ODY4XHU3OTNBXHU2NzJBXHU1NDdEXHU0RTJEXHUzMDAyXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VtYW50aWNSZXNvbHZlciB7XG4gIHJlc29sdmUoc2VtYW50aWM6IHN0cmluZyk6IFByb21pc2U8eyByZWY/OiBzdHJpbmc7IHRleHQ/OiBzdHJpbmc7IHNlbGVjdG9yPzogc3RyaW5nIH0gfCBudWxsPjtcbn1cblxuY29uc3QgSU5URVJBQ1RJVkVfU0VMRUNUT1IgPSBbXG4gIFwiYVtocmVmXVwiLFxuICBcImJ1dHRvblwiLFxuICBcImlucHV0Om5vdChbdHlwZT0naGlkZGVuJ10pXCIsXG4gIFwic2VsZWN0XCIsXG4gIFwidGV4dGFyZWFcIixcbiAgXCJbcm9sZT0nYnV0dG9uJ11cIixcbiAgXCJbcm9sZT0nbGluayddXCIsXG4gIFwiW2NvbnRlbnRlZGl0YWJsZT0ndHJ1ZSddXCIsXG4gIFwibGFiZWxcIixcbl0uam9pbihcIiwgXCIpO1xuXG5leHBvcnQgY2xhc3MgRWxlbWVudExvY2F0b3Ige1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBhZ2U6IFBhZ2UsIHByaXZhdGUgc2VtYW50aWNSZXNvbHZlcj86IFNlbWFudGljUmVzb2x2ZXIpIHt9XG5cbiAgLyoqXG4gICAqIFx1NjgzOVx1NjM2RVx1NTJBOFx1NEY1Q1x1NTNDMlx1NjU3MFx1NUI5QVx1NEY0RFx1NTE0M1x1N0QyMFx1RkYwQ1x1NTkxQVx1N0I1Nlx1NzU2NVx1NEY5RFx1NkIyMVx1NTZERVx1OTAwMFx1MzAwMlxuICAgKiBcdTYyN0VcdTRFMERcdTUyMzBcdTY1RjZcdTYyOUJcdTUxRkFcdTVFMjZcdThCQ0FcdTY1QURcdTYzRDBcdTc5M0FcdTc2ODRcdTk1MTlcdThCRUZcdTMwMDJcbiAgICovXG4gIGFzeW5jIGxvY2F0ZShvcHRzOiBMb2NhdGVPcHRpb25zKTogUHJvbWlzZTxMb2NhdGVkPiB7XG4gICAgY29uc3QgeyByZWYsIHNlbGVjdG9yLCB0ZXh0LCBzZW1hbnRpYyB9ID0gb3B0cztcblxuICAgIC8vIDEpIHJlZiBcdTVCOUFcdTRGNERcdUZGMDhcdTY3MDBcdTlBRDhcdTY1NDhcdTMwMDFcdTY3MDBcdTdDQkVcdTc4NkVcdUZGMENcdTY3NjVcdTgxRUFcdTVGRUJcdTcxNjdcdTRFQTRcdTRFOTJcdTdEMjJcdTVGMTVcdUZGMDlcbiAgICBpZiAocmVmKSB7XG4gICAgICBjb25zdCBieVJlZiA9IHRoaXMubG9jYXRlQnlSZWYocmVmKTtcbiAgICAgIGlmICgoYXdhaXQgYnlSZWYuY291bnQoKSkpIHtcbiAgICAgICAgcmV0dXJuIHsgbG9jYXRvcjogYnlSZWYuZmlyc3QoKSwgc3RyYXRlZ3k6IFwicmVmXCIsIGFuY2hvclNlbGVjdG9yOiBhd2FpdCB0aGlzLnRvQ3NzKGJ5UmVmLmZpcnN0KCkpIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gMikgQ1NTIFx1OTAwOVx1NjJFOVx1NTY2OFxuICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgY29uc3QgbG9jID0gdGhpcy5wYWdlLmxvY2F0b3Ioc2VsZWN0b3IpO1xuICAgICAgaWYgKChhd2FpdCBsb2MuY291bnQoKSkpIHtcbiAgICAgICAgcmV0dXJuIHsgbG9jYXRvcjogbG9jLmZpcnN0KCksIHN0cmF0ZWd5OiBcInNlbGVjdG9yXCIsIGFuY2hvclNlbGVjdG9yOiBzZWxlY3RvciB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIDMpIFx1N0NCRVx1Nzg2RVx1NjU4N1x1NjcyQ1x1RkYwOFx1NTNFRlx1NEVBNFx1NEU5Mlx1NTE0M1x1N0QyMFx1NTE4NVx1RkYwOVxuICAgIGlmICh0ZXh0KSB7XG4gICAgICBjb25zdCBieVRleHQgPSB0aGlzLmxvY2F0ZUJ5VGV4dCh0ZXh0KTtcbiAgICAgIGlmICgoYXdhaXQgYnlUZXh0LmNvdW50KCkpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbG9jYXRvcjogYnlUZXh0LmZpcnN0KCksXG4gICAgICAgICAgc3RyYXRlZ3k6IFwidGV4dFwiLFxuICAgICAgICAgIGFuY2hvclNlbGVjdG9yOiBhd2FpdCB0aGlzLnRvQ3NzKGJ5VGV4dC5maXJzdCgpKSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyA0KSBcdThCRURcdTRFNDlcdTU2REVcdTkwMDBcdUZGMUFcdTVDMURcdThCRDUgcm9sZS9uYW1lIFx1N0VDNFx1NTQwOFx1RkYwQ1x1NTE4RFx1NzUyOCBhaS1sYXllciBcdThCRURcdTRFNDlcdTVCOUFcdTRGNERcdTU2NjhcdUZGMDhcdTRFMkRcdTY1ODdcdTUyMDZcdThCQ0QvXHU4QkVEXHU0RTQ5XHU3NkY4XHU0RjNDXHU1RUE2XHVGRjA5XG4gICAgaWYgKHNlbWFudGljKSB7XG4gICAgICBjb25zdCBieVNlbWFudGljID0gdGhpcy5sb2NhdGVCeVNlbWFudGljKHNlbWFudGljKTtcbiAgICAgIGlmICgoYXdhaXQgYnlTZW1hbnRpYy5jb3VudCgpKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGxvY2F0b3I6IGJ5U2VtYW50aWMuZmlyc3QoKSxcbiAgICAgICAgICBzdHJhdGVneTogXCJzZW1hbnRpY1wiLFxuICAgICAgICAgIGFuY2hvclNlbGVjdG9yOiBhd2FpdCB0aGlzLnRvQ3NzKGJ5U2VtYW50aWMuZmlyc3QoKSksXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICAvLyBhcmlhL3BsYWNlaG9sZGVyL3RpdGxlIFx1NjcyQVx1NTQ3RFx1NEUyRCBcdTIxOTIgXHU0RUE0XHU3RUQ5XHU4QkVEXHU0RTQ5XHU1QjlBXHU0RjREXHU1NjY4XHVGRjA4XHU1N0ZBXHU0RThFXHU1RkVCXHU3MTY3XHU1MDVBXHU4QkVEXHU0RTQ5XHU3NkY4XHU0RjNDXHU1RUE2XHU1MzM5XHU5MTREXHVGRjA5XG4gICAgICBpZiAodGhpcy5zZW1hbnRpY1Jlc29sdmVyKSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkID0gYXdhaXQgdGhpcy5zZW1hbnRpY1Jlc29sdmVyLnJlc29sdmUoc2VtYW50aWMpO1xuICAgICAgICBpZiAocmVzb2x2ZWQ/LnJlZiB8fCByZXNvbHZlZD8uc2VsZWN0b3IgfHwgcmVzb2x2ZWQ/LnRleHQpIHtcbiAgICAgICAgICBjb25zdCBieVJlc29sdmVkID0gcmVzb2x2ZWQuc2VsZWN0b3JcbiAgICAgICAgICAgID8gdGhpcy5wYWdlLmxvY2F0b3IocmVzb2x2ZWQuc2VsZWN0b3IpXG4gICAgICAgICAgICA6IHJlc29sdmVkLnRleHRcbiAgICAgICAgICAgICAgPyB0aGlzLmxvY2F0ZUJ5VGV4dChyZXNvbHZlZC50ZXh0KVxuICAgICAgICAgICAgICA6IHRoaXMubG9jYXRlQnlSZWYocmVzb2x2ZWQucmVmISk7XG4gICAgICAgICAgaWYgKChhd2FpdCBieVJlc29sdmVkLmNvdW50KCkpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBsb2NhdG9yOiBieVJlc29sdmVkLmZpcnN0KCksXG4gICAgICAgICAgICAgIHN0cmF0ZWd5OiBcInNlbWFudGljXCIsXG4gICAgICAgICAgICAgIGFuY2hvclNlbGVjdG9yOiByZXNvbHZlZC5zZWxlY3RvciB8fCAoYXdhaXQgdGhpcy50b0NzcyhieVJlc29sdmVkLmZpcnN0KCkpKSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFx1NjVFMFx1NkNENVx1NUI5QVx1NEY0RFx1NTE0M1x1N0QyMFx1RkYxQXJlZj0ke3JlZiA/PyBcIi1cIn0gc2VsZWN0b3I9JHtzZWxlY3RvciA/PyBcIi1cIn0gdGV4dD0ke3RleHQgPz8gXCItXCJ9IHNlbWFudGljPSR7c2VtYW50aWMgPz8gXCItXCJ9LiBgICtcbiAgICAgICAgYFx1NUVGQVx1OEJBRVx1OEMwM1x1NzUyOCBvYnNlcnZlKCkgXHU4M0I3XHU1M0Q2XHU2NzAwXHU2NUIwXHU1RkVCXHU3MTY3XHU1NDBFXHU5MUNEXHU4QkQ1XHVGRjBDXHU2MjE2XHU0RjdGXHU3NTI4IGRpYWdub3NlKCkgXHU2OEMwXHU2N0U1IERPTSBcdTcyQjZcdTYwMDFcdTMwMDJgXG4gICAgKTtcbiAgfVxuXG4gIC8qKiBcdTkwMUFcdThGQzdcdTVGRUJcdTcxNjcgcmVmIFx1NUI5QVx1NEY0RFx1RkYxQXJlZiBcdTUxODVcdTVENENcdTRFODZcdTkwMDlcdTYyRTlcdTU2NjhcdTRGRTFcdTYwNkZcdUZGMDhkYXRhLWZvcmdlLXJlZlx1RkYwOSAqL1xuICBwcml2YXRlIGxvY2F0ZUJ5UmVmKHJlZjogc3RyaW5nKTogaW1wb3J0KFwicGxheXdyaWdodFwiKS5Mb2NhdG9yIHtcbiAgICAvLyBcdTRGMThcdTUxNDhcdTdDQkVcdTc4NkVcdTUzMzlcdTkxNEQgZGF0YS1mb3JnZS1yZWYgXHU1QzVFXHU2MDI3XHVGRjBDXHU4MkU1XHU2NzJBXHU1NDdEXHU0RTJEXHU1MjE5XHU3NTI4XHU2QTIxXHU3Q0NBXHU1MzM5XHU5MTREXG4gICAgcmV0dXJuIHRoaXMucGFnZS5sb2NhdG9yKGBbZGF0YS1mb3JnZS1yZWY9XCIke3JlZn1cIl0sIFtkYXRhLWZvcmdlLXJlZio9XCIke3JlZn1cIl1gKTtcbiAgfVxuXG4gIC8qKiBcdTY1ODdcdTY3MkNcdTVCOUFcdTRGNERcdUZGMUFcdTU3MjhcdTUzRUZcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTUxODVcdTY3RTVcdTYyN0VcdTUzMDVcdTU0MkJcdTYzMDdcdTVCOUFcdTY1ODdcdTY3MkNcdTgwMDUgKi9cbiAgcHJpdmF0ZSBsb2NhdGVCeVRleHQodGV4dDogc3RyaW5nKTogaW1wb3J0KFwicGxheXdyaWdodFwiKS5Mb2NhdG9yIHtcbiAgICByZXR1cm4gdGhpcy5wYWdlLmxvY2F0b3IoSU5URVJBQ1RJVkVfU0VMRUNUT1IpLmZpbHRlcih7IGhhc1RleHQ6IHRleHQgfSk7XG4gIH1cblxuICAvKiogXHU4QkVEXHU0RTQ5XHU1QjlBXHU0RjREXHVGRjFBXHU1QzFEXHU4QkQ1IGFyaWEtbGFiZWwgLyBwbGFjZWhvbGRlciAvIHRpdGxlICovXG4gIHByaXZhdGUgbG9jYXRlQnlTZW1hbnRpYyhzZW1hbnRpYzogc3RyaW5nKTogaW1wb3J0KFwicGxheXdyaWdodFwiKS5Mb2NhdG9yIHtcbiAgICByZXR1cm4gdGhpcy5wYWdlXG4gICAgICAubG9jYXRvcihgJHtJTlRFUkFDVElWRV9TRUxFQ1RPUn1bYXJpYS1sYWJlbCo9XCIke3NlbWFudGljfVwiXSwgJHtJTlRFUkFDVElWRV9TRUxFQ1RPUn1bcGxhY2Vob2xkZXIqPVwiJHtzZW1hbnRpY31cIl0sICR7SU5URVJBQ1RJVkVfU0VMRUNUT1J9W3RpdGxlKj1cIiR7c2VtYW50aWN9XCJdYClcbiAgICAgIC5maXJzdCgpO1xuICB9XG5cbiAgLyoqIFx1NUMwNiBsb2NhdG9yIFx1OEY2Q1x1NjIxMFx1NTUyRlx1NEUwMCBDU1MgXHU5MDA5XHU2MkU5XHU1NjY4XHVGRjA4XHU3NTI4XHU0RThFXHU4QkNBXHU2NUFEXHU5NTFBXHU1QjlBXHVGRjA5ICovXG4gIHByaXZhdGUgYXN5bmMgdG9Dc3MobG9jOiBpbXBvcnQoXCJwbGF5d3JpZ2h0XCIpLkxvY2F0b3IpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gKGF3YWl0IGxvYy5ldmFsdWF0ZSgoZWw6IEVsZW1lbnQpID0+IHtcbiAgICAgICAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGxldCBjdXI6IEVsZW1lbnQgfCBudWxsID0gZWw7XG4gICAgICAgIHdoaWxlIChjdXIgJiYgY3VyLm5vZGVUeXBlID09PSAxICYmIHBhcnRzLmxlbmd0aCA8IDUpIHtcbiAgICAgICAgICBsZXQgc2VnID0gY3VyLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICBpZiAoY3VyLmlkKSB7XG4gICAgICAgICAgICBzZWcgKz0gYCMke2N1ci5pZH1gO1xuICAgICAgICAgICAgcGFydHMudW5zaGlmdChzZWcpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjdXIuY2xhc3NMaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgc2VnICs9IFwiLlwiICsgQXJyYXkuZnJvbShjdXIuY2xhc3NMaXN0KS5zbGljZSgwLCAyKS5qb2luKFwiLlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFydHMudW5zaGlmdChzZWcpO1xuICAgICAgICAgIGN1ciA9IGN1ci5wYXJlbnRFbGVtZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXJ0cy5qb2luKFwiID4gXCIpO1xuICAgICAgfSkpIGFzIHN0cmluZztcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogXHU5ODc1XHU5NzYyXHU1RkVCXHU3MTY3XHU3NTFGXHU2MjEwXHU1NjY4XG4gKlxuICogXHU1MDFGXHU5Mjc0IENocm9tZSBEZXZUb29scyBNQ1AgXHU3Njg0IFRva2VuIFx1OUFEOFx1NjU0OFx1N0I1Nlx1NzU2NVx1RkYxQVxuICogLSBcdTVDNUVcdTYwMjdcdTc2N0RcdTU0MERcdTUzNTVcdTg4QzFcdTUyNkFcdUZGMDhcdTkwN0ZcdTUxNERcdTUxNjhcdTkxQ0ZcdTVDNUVcdTYwMjdcdTcyMDZcdTcwQjhcdUZGMDlcbiAqIC0gXHU4MjgyXHU3MEI5XHU2NTcwXHU0RTBBXHU5NjUwICsgXHU2REYxXHU1RUE2XHU4OEMxXHU1MjZBXG4gKiAtIFx1NjU4N1x1NjcyQ1x1OTU3Rlx1NUVBNlx1ODhDMVx1NTI2QVxuICogLSBcdTc1MUZcdTYyMTBcdTUzRUZcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTdEMjJcdTVGMTVcdUZGMDhcdTRGOUIgQUkgXHU2MzExXHU5MDA5IHJlZlx1RkYwOVxuICogLSBcdTRFM0FcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTc1MUZcdTYyMTBcdTdBMzNcdTVCOUEgZGF0YS1mb3JnZS1yZWYgXHU0RkJGXHU0RThFXHU3Q0JFXHU3ODZFXHU1QjlBXHU0RjREXG4gKi9cbmltcG9ydCB0eXBlIHsgUGFnZSB9IGZyb20gXCJwbGF5d3JpZ2h0XCI7XG5pbXBvcnQgdHlwZSB7IFBhZ2VTbmFwc2hvdCwgU25hcHNob3ROb2RlLCBTbmFwc2hvdE9wdGlvbnMgfSBmcm9tIFwiQG9wZW5saXVsYW4vY29yZVwiO1xuXG5jb25zdCBBVFRSX1dISVRFTElTVCA9IFtcImlkXCIsIFwiY2xhc3NcIiwgXCJuYW1lXCIsIFwidHlwZVwiLCBcInZhbHVlXCIsIFwiaHJlZlwiLCBcInBsYWNlaG9sZGVyXCIsIFwidGl0bGVcIiwgXCJhcmlhLWxhYmVsXCIsIFwicm9sZVwiLCBcImRhdGEtdGVzdGlkXCIsIFwic3JjXCIsIFwiYWx0XCIsIFwiY2hlY2tlZFwiLCBcInNlbGVjdGVkXCIsIFwiZGlzYWJsZWRcIiwgXCJ0YXJnZXRcIl07XG5jb25zdCBURVhUX1RBR1MgPSBuZXcgU2V0KFtcIlBcIiwgXCJIMVwiLCBcIkgyXCIsIFwiSDNcIiwgXCJINFwiLCBcIkg1XCIsIFwiSDZcIiwgXCJBXCIsIFwiQlVUVE9OXCIsIFwiSU5QVVRcIiwgXCJURVhUQVJFQVwiLCBcIlNFTEVDVFwiLCBcIk9QVElPTlwiLCBcIkxJXCIsIFwiVERcIiwgXCJUSFwiLCBcIlNQQU5cIiwgXCJMQUJFTFwiLCBcIkNBUFRJT05cIiwgXCJTVU1NQVJZXCJdKTtcbmNvbnN0IFBSVU5FX1RBR1MgPSBuZXcgU2V0KFtcIlNDUklQVFwiLCBcIlNUWUxFXCIsIFwiTk9TQ1JJUFRcIiwgXCJURU1QTEFURVwiLCBcIklGUkFNRVwiLCBcIkhFQURcIiwgXCJNRVRBXCIsIFwiTElOS1wiLCBcIlNWR1wiXSk7XG5jb25zdCBJTlRFUkFDVElWRV9UQUdTID0gbmV3IFNldChbXCJBXCIsIFwiQlVUVE9OXCIsIFwiSU5QVVRcIiwgXCJTRUxFQ1RcIiwgXCJURVhUQVJFQVwiLCBcIk9QVElPTlwiLCBcIlNVTU1BUllcIl0pO1xuY29uc3QgSU5URVJBQ1RJVkVfUk9MRVMgPSBuZXcgU2V0KFtcImJ1dHRvblwiLCBcImxpbmtcIiwgXCJ0ZXh0Ym94XCIsIFwiY29tYm9ib3hcIiwgXCJjaGVja2JveFwiLCBcInJhZGlvXCIsIFwidGFiXCIsIFwibWVudWl0ZW1cIl0pO1xuXG5leHBvcnQgY2xhc3MgU25hcHNob3RCdWlsZGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwYWdlOiBQYWdlKSB7fVxuXG4gIGFzeW5jIGJ1aWxkKG9wdHM6IFNuYXBzaG90T3B0aW9ucyA9IHt9KTogUHJvbWlzZTxQYWdlU25hcHNob3Q+IHtcbiAgICBjb25zdCBtYXhOb2RlcyA9IG9wdHMubWF4Tm9kZXMgPz8gMjAwO1xuICAgIGNvbnN0IG1heFRleHQgPSBvcHRzLm1heFRleHRMZW5ndGggPz8gODA7XG4gICAgY29uc3Qgd2l0aFNlbGVjdG9ycyA9IG9wdHMud2l0aFNlbGVjdG9ycyA/PyB0cnVlO1xuXG4gICAgLy8gXHU2Q0U4XHU1MTY1XHU4Rjg1XHU1MkE5XHU4MTFBXHU2NzJDXHVGRjBDXHU2RDRGXHU4OUM4XHU1NjY4XHU3QUVGXHU4OEMxXHU1MjZBXHU5MDREXHU1Mzg2IERPTVx1RkYwOFx1NkJENCBOb2RlIFx1N0FFRlx1OTAxMFx1ODI4Mlx1NzBCOVx1NjZGNFx1OUFEOFx1NjU0OFx1RkYwOVxuICAgIC8vIFx1NkNFOFx1NjEwRlx1RkYxQW5vZGUgXHU2QTIxXHU1NzU3XHU0RjVDXHU3NTI4XHU1N0RGXHU1RTM4XHU5MUNGXHVGRjA4UFJVTkVfVEFHUy9URVhUX1RBR1MvSU5URVJBQ1RJVkVfUk9MRVMvd2l0aFNlbGVjdG9ycyBcdTdCNDlcdUZGMDlcbiAgICAvLyBcdTU3MjggcGFnZS5ldmFsdWF0ZSBcdTc2ODRcdTZENEZcdTg5QzhcdTU2NjhcdTYyNjdcdTg4NENcdTRFMEFcdTRFMEJcdTY1ODdcdTRFMkRcdTRFMERcdTUzRUZcdTg5QzFcdUZGMENcdTRFMTQgU2V0IFx1NjVFMFx1NkNENVx1OTAxQVx1OEZDN1x1NUU4Rlx1NTIxN1x1NTMxNlx1NEZERFx1NzU1OVx1RkYwQ1xuICAgIC8vIFx1NTZFMFx1NkI2NFx1NUZDNVx1OTg3Qlx1NEY1Q1x1NEUzQVx1NjU3MFx1N0VDNFx1NTNDMlx1NjU3MFx1NjYzRVx1NUYwRlx1NEYyMFx1NTE2NVx1NUU3Nlx1NTcyOFx1NkQ0Rlx1ODlDOFx1NTY2OFx1N0FFRlx1NzUyOCAuaW5jbHVkZXMoKSBcdTUyMjRcdTY1QURcdUZGMENcbiAgICAvLyBcdTU0MjZcdTUyMTlcdTc3MUZcdTVCOUVcdTZENEZcdTg5QzhcdTU2NjhcdTRFMkRcdTRGMUFcdTYyOUIgUmVmZXJlbmNlRXJyb3IgLyBUeXBlRXJyb3JcdUZGMDhcdThGRDlcdTZCNjNcdTY2MkZcdTUzNTVcdTZENEJcdTUzRDFcdTczQjBcdTRFMERcdTRFODZcdTc2ODRcdThGRDBcdTg4NENcdTY3MUZcdTdGM0FcdTk2NzdcdUZGMDlcdTMwMDJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnBhZ2UuZXZhbHVhdGUoXG4gICAgICAoeyBtYXhOb2RlcywgbWF4VGV4dCwgcHJ1bmVEZWVwLCBpbmNsdWRlSGlkZGVuLCB3aXRoU2VsZWN0b3JzLCBQUlVORV9UQUdTLCBURVhUX1RBR1MsIEFUVFJfV0hJVEVMSVNULCBJTlRFUkFDVElWRV9UQUdTLCBJTlRFUkFDVElWRV9ST0xFUyB9KSA9PiB7XG4gICAgICAgIGNvbnN0IG91dDoge1xuICAgICAgICAgIHVybDogc3RyaW5nO1xuICAgICAgICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgICAgICAgcmVhZHlTdGF0ZTogc3RyaW5nO1xuICAgICAgICAgIHRvdGFsTm9kZXM6IG51bWJlcjtcbiAgICAgICAgICByb290OiBhbnk7XG4gICAgICAgICAgaW50ZXJhY3RpdmU6IGFueVtdO1xuICAgICAgICB9ID0ge1xuICAgICAgICAgIHVybDogbG9jYXRpb24uaHJlZixcbiAgICAgICAgICB0aXRsZTogZG9jdW1lbnQudGl0bGUsXG4gICAgICAgICAgcmVhZHlTdGF0ZTogZG9jdW1lbnQucmVhZHlTdGF0ZSxcbiAgICAgICAgICB0b3RhbE5vZGVzOiAwLFxuICAgICAgICAgIHJvb3Q6IG51bGwgYXMgYW55LFxuICAgICAgICAgIGludGVyYWN0aXZlOiBbXSxcbiAgICAgICAgfTtcblxuICAgICAgICBsZXQgZW1pdHRlZCA9IDA7XG4gICAgICAgIGxldCB0cnVuY2F0ZWROb2RlcyA9IDA7XG4gICAgICAgIGNvbnN0IHJlZkNvdW50ZXIgPSB7IG46IDAgfTtcblxuICAgICAgICBjb25zdCBpc1Zpc2libGUgPSAoZWw6IEVsZW1lbnQpOiBib29sZWFuID0+IHtcbiAgICAgICAgICBjb25zdCByID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgY29uc3QgcyA9IGdldENvbXB1dGVkU3R5bGUoZWwpO1xuICAgICAgICAgIHJldHVybiBzLmRpc3BsYXkgIT09IFwibm9uZVwiICYmIHMudmlzaWJpbGl0eSAhPT0gXCJoaWRkZW5cIiAmJiByLndpZHRoID4gMCAmJiByLmhlaWdodCA+IDA7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXNJbnRlcmFjdGl2ZSA9IChlbDogRWxlbWVudCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgIGlmIChJTlRFUkFDVElWRV9UQUdTLmluY2x1ZGVzKGVsLnRhZ05hbWUpKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICBjb25zdCByb2xlID0gZWwuZ2V0QXR0cmlidXRlKFwicm9sZVwiKTtcbiAgICAgICAgICByZXR1cm4gISFyb2xlICYmIElOVEVSQUNUSVZFX1JPTEVTLmluY2x1ZGVzKHJvbGUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFx1NjU0Rlx1NjExRlx1OEY5M1x1NTE2NVx1N0M3Qlx1NTc4Qlx1RkYwOFx1NUJDNlx1NzgwMS9cdTRFRTRcdTcyNEMvXHU1QkM2XHU5NEE1XHU3QjQ5XHVGRjA5XHUyMDE0XHUyMDE0IFx1NTAzQ1x1NUZDNVx1OTg3Qlx1ODEzMVx1NjU0Rlx1RkYwQ1x1OTYzMlx1NEVFNFx1NzI0Qy9cdTUzRTNcdTRFRTRcdTZDQzRcdTk3MzJcbiAgICAgICAgY29uc3QgU0VOU0lUSVZFX0lOUFVUX1RZUEVTID0gW1wicGFzc3dvcmRcIiwgXCJ0b2tlblwiLCBcInNlY3JldFwiLCBcImtleVwiLCBcImFwaS1rZXlcIiwgXCJhcGlrZXlcIl07XG4gICAgICAgIGNvbnN0IGlzU2Vuc2l0aXZlSW5wdXQgPSAoZWw6IEVsZW1lbnQpOiBib29sZWFuID0+IHtcbiAgICAgICAgICBpZiAoZWwudGFnTmFtZSAhPT0gXCJJTlBVVFwiKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgY29uc3QgdCA9IChlbCBhcyBIVE1MSW5wdXRFbGVtZW50KS50eXBlPy50b0xvd2VyQ2FzZSgpID8/IFwiXCI7XG4gICAgICAgICAgY29uc3QgbiA9ICgoZWwuZ2V0QXR0cmlidXRlKFwibmFtZVwiKSB8fCBcIlwiKSArIChlbC5nZXRBdHRyaWJ1dGUoXCJhdXRvY29tcGxldGVcIikgfHwgXCJcIikpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgaWYgKHQgPT09IFwicGFzc3dvcmRcIikgcmV0dXJuIHRydWU7XG4gICAgICAgICAgaWYgKFNFTlNJVElWRV9JTlBVVF9UWVBFUy5pbmNsdWRlcyh0KSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgcmV0dXJuIC8ocGFzc3dvcmR8cGFzc3dkfHRva2VufHNlY3JldHxhcGlbXy1dP2tleXxhdXRoKS8udGVzdChuKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgZWxUZXh0ID0gKGVsOiBFbGVtZW50KTogc3RyaW5nID0+IHtcbiAgICAgICAgICBpZiAoZWwudGFnTmFtZSA9PT0gXCJJTlBVVFwiKSB7XG4gICAgICAgICAgICBjb25zdCBwaCA9IGVsLmdldEF0dHJpYnV0ZShcInBsYWNlaG9sZGVyXCIpIHx8IFwiXCI7XG4gICAgICAgICAgICAvLyBcdTY1NEZcdTYxMUZcdThGOTNcdTUxNjVcdTY4NDZcdTRFMERcdThGRDRcdTU2REVcdTc3MUZcdTVCOUVcdTUwM0NcdUZGMENcdTRFQzVcdTc1MjhcdTUzNjBcdTRGNERcdTdCMjZcdUZGMDhcdTk2MzJcdTRFRTRcdTcyNEMvXHU1QkM2XHU3ODAxXHU1MTY1XHU1RkVCXHU3MTY3XHVGRjA5XG4gICAgICAgICAgICBpZiAoaXNTZW5zaXRpdmVJbnB1dChlbCkpIHJldHVybiBwaCA/IGBbXHU2NTRGXHU2MTFGXHU4RjkzXHU1MTY1XSAke3BofWAgOiBcIltcdTY1NEZcdTYxMUZcdThGOTNcdTUxNjVcdTVERjJcdTk2OTBcdTg1Q0ZdXCI7XG4gICAgICAgICAgICBjb25zdCB2ID0gKGVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIHYgfHwgcGggfHwgXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGVsLnRhZ05hbWUgPT09IFwiU0VMRUNUXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlbCA9IGVsIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xuICAgICAgICAgICAgcmV0dXJuIHNlbC5zZWxlY3RlZE9wdGlvbnNbMF0/LnRleHQgfHwgXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgdCA9IChlbC50ZXh0Q29udGVudCB8fCBcIlwiKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCk7XG4gICAgICAgICAgcmV0dXJuIHQuc2xpY2UoMCwgbWF4VGV4dCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgd2FsayA9IChlbDogRWxlbWVudCwgZGVwdGg6IG51bWJlcik6IGFueSA9PiB7XG4gICAgICAgICAgaWYgKGVtaXR0ZWQgPj0gbWF4Tm9kZXMpIHtcbiAgICAgICAgICAgIHRydW5jYXRlZE5vZGVzKys7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKFBSVU5FX1RBR1MuaW5jbHVkZXMoZWwudGFnTmFtZSkpIHJldHVybiBudWxsO1xuICAgICAgICAgIGlmICghaW5jbHVkZUhpZGRlbiAmJiAhaXNWaXNpYmxlKGVsKSkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgaWYgKHBydW5lRGVlcCAmJiBkZXB0aCA+IDI1KSByZXR1cm4gbnVsbDtcblxuICAgICAgICAgIG91dC50b3RhbE5vZGVzKys7XG4gICAgICAgICAgZW1pdHRlZCsrO1xuXG4gICAgICAgICAgY29uc3Qgbm9kZTogYW55ID0ge1xuICAgICAgICAgICAgcmVmOiBgciR7cmVmQ291bnRlci5uKyt9YCxcbiAgICAgICAgICAgIHRhZzogZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxuICAgICAgICAgICAgdGV4dDogVEVYVF9UQUdTLmluY2x1ZGVzKGVsLnRhZ05hbWUpID8gZWxUZXh0KGVsKSA6IFwiXCIsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7fSxcbiAgICAgICAgICAgIGludGVyYWN0aXZlOiBpc0ludGVyYWN0aXZlKGVsKSxcbiAgICAgICAgICAgIGRlcHRoLFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgQVRUUl9XSElURUxJU1QpIHtcbiAgICAgICAgICAgIGxldCB2ID0gZWwuZ2V0QXR0cmlidXRlKGF0dHIpO1xuICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgLy8gXHU2NTRGXHU2MTFGXHU4RjkzXHU1MTY1XHU2ODQ2XHU3Njg0IHZhbHVlIFx1NUM1RVx1NjAyN1x1NUZDNVx1OTg3Qlx1ODEzMVx1NjU0Rlx1RkYwOFx1OTYzMlx1NEVFNFx1NzI0Qy9cdTVCQzZcdTc4MDFcdTUxNjVcdTVGRUJcdTcxNjdcdUZGMDlcbiAgICAgICAgICAgICAgaWYgKGF0dHIgPT09IFwidmFsdWVcIiAmJiBpc1NlbnNpdGl2ZUlucHV0KGVsKSkge1xuICAgICAgICAgICAgICAgIHYgPSBcIioqKlJFREFDVEVEKioqXCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbm9kZS5hdHRyaWJ1dGVzW2F0dHJdID0gdi5zbGljZSgwLCA2MCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3Qgcm9sZSA9IGVsLmdldEF0dHJpYnV0ZShcInJvbGVcIik7XG4gICAgICAgICAgaWYgKHJvbGUpIG5vZGUucm9sZSA9IHJvbGU7XG4gICAgICAgICAgaWYgKHdpdGhTZWxlY3RvcnMgJiYgKG5vZGUuaW50ZXJhY3RpdmUgfHwgbm9kZS5hdHRyaWJ1dGVzLmlkKSkge1xuICAgICAgICAgICAgLy8gXHU3NTFGXHU2MjEwXHU3QTMzXHU1QjlBIHJlZiBcdTVDNUVcdTYwMjdcdTRGQkZcdTRFOEVcdTU0MEVcdTdFRURcdTVCOUFcdTRGNERcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShcImRhdGEtZm9yZ2UtcmVmXCIsIG5vZGUucmVmKTtcbiAgICAgICAgICAgIG5vZGUuc2VsZWN0b3IgPSBlbC5pZFxuICAgICAgICAgICAgICA/IGAke2VsLnRhZ05hbWUudG9Mb3dlckNhc2UoKX0jJHtlbC5pZH1gXG4gICAgICAgICAgICAgIDogYCR7ZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpfVtkYXRhLWZvcmdlLXJlZj1cIiR7bm9kZS5yZWZ9XCJdYDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobm9kZS5pbnRlcmFjdGl2ZSkge1xuICAgICAgICAgICAgb3V0LmludGVyYWN0aXZlLnB1c2goe1xuICAgICAgICAgICAgICByZWY6IG5vZGUucmVmLFxuICAgICAgICAgICAgICB0YWc6IG5vZGUudGFnLFxuICAgICAgICAgICAgICB0ZXh0OiBub2RlLnRleHQgfHwgZWxUZXh0KGVsKSxcbiAgICAgICAgICAgICAgcm9sZTogcm9sZSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIHNlbGVjdG9yOiBub2RlLnNlbGVjdG9yLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgY2hpbGRyZW46IGFueVtdID0gW107XG4gICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKGVsLmNoaWxkcmVuKSkge1xuICAgICAgICAgICAgY29uc3QgYyA9IHdhbGsoY2hpbGQsIGRlcHRoICsgMSk7XG4gICAgICAgICAgICBpZiAoYykgY2hpbGRyZW4ucHVzaChjKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNoaWxkcmVuLmxlbmd0aCkgbm9kZS5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuXG4gICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgIH07XG5cbiAgICAgICAgb3V0LnJvb3QgPSB3YWxrKGRvY3VtZW50LmJvZHksIDApO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbWF4Tm9kZXMsXG4gICAgICAgIG1heFRleHQsXG4gICAgICAgIHBydW5lRGVlcDogb3B0cy5wcnVuZURlZXAgPz8gdHJ1ZSxcbiAgICAgICAgaW5jbHVkZUhpZGRlbjogb3B0cy5pbmNsdWRlSGlkZGVuID8/IGZhbHNlLFxuICAgICAgICB3aXRoU2VsZWN0b3JzLFxuICAgICAgICBQUlVORV9UQUdTOiBbLi4uUFJVTkVfVEFHU10sXG4gICAgICAgIFRFWFRfVEFHUzogWy4uLlRFWFRfVEFHU10sXG4gICAgICAgIEFUVFJfV0hJVEVMSVNUOiBbLi4uQVRUUl9XSElURUxJU1RdLFxuICAgICAgICBJTlRFUkFDVElWRV9UQUdTOiBbLi4uSU5URVJBQ1RJVkVfVEFHU10sXG4gICAgICAgIElOVEVSQUNUSVZFX1JPTEVTOiBbLi4uSU5URVJBQ1RJVkVfUk9MRVNdLFxuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBcdThCQTFcdTdCOTcgVG9rZW4gXHU0RjMwXHU3Qjk3XHVGRjA4XHU3RUE2IDQgXHU1QjU3XHU3QjI2L3Rva2VuXHVGRjBDXHU1NDJCXHU3RUQzXHU2Nzg0XHU1RjAwXHU5NTAwXHVGRjA5XG4gICAgY29uc3QgYXBwcm94ID0gdGhpcy5lc3RpbWF0ZVRva2VucyhyZXN1bHQucm9vdCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdXJsOiByZXN1bHQudXJsLFxuICAgICAgdGl0bGU6IHJlc3VsdC50aXRsZSxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgcmVhZHlTdGF0ZTogcmVzdWx0LnJlYWR5U3RhdGUsXG4gICAgICBzdGF0czoge1xuICAgICAgICB0b3RhbE5vZGVzOiByZXN1bHQudG90YWxOb2RlcyxcbiAgICAgICAgZW1pdHRlZE5vZGVzOiByZXN1bHQudG90YWxOb2RlcyAtIHJlc3VsdC5pbnRlcmFjdGl2ZS5sZW5ndGgsIC8vIFx1OEZEMVx1NEYzQ1xuICAgICAgICB0cnVuY2F0ZWROb2RlczogMCxcbiAgICAgICAgYXBwcm94aW1hdGVUb2tlbnM6IGFwcHJveCxcbiAgICAgIH0sXG4gICAgICByb290OiByZXN1bHQucm9vdCxcbiAgICAgIGludGVyYWN0aXZlOiByZXN1bHQuaW50ZXJhY3RpdmUsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZXN0aW1hdGVUb2tlbnMocm9vdDogYW55KTogbnVtYmVyIHtcbiAgICBsZXQgY2hhcnMgPSAwO1xuICAgIGNvbnN0IGNvdW50ID0gKG46IGFueSkgPT4ge1xuICAgICAgaWYgKCFuKSByZXR1cm47XG4gICAgICBjaGFycyArPSAobi50YWc/Lmxlbmd0aCA/PyAwKSArIChuLnRleHQ/Lmxlbmd0aCA/PyAwKSArIEpTT04uc3RyaW5naWZ5KG4uYXR0cmlidXRlcyB8fCB7fSkubGVuZ3RoO1xuICAgICAgKG4uY2hpbGRyZW4gfHwgW10pLmZvckVhY2goY291bnQpO1xuICAgIH07XG4gICAgY291bnQocm9vdCk7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoY2hhcnMgLyA0KTtcbiAgfVxufVxuIiwgIi8qKlxuICogUGxheXdyaWdodCBcdTVGMTVcdTY0Q0VcdTc2ODRcdThCQ0FcdTY1QURcdTkxQzdcdTk2QzZcdTU2NjhcbiAqXG4gKiBcdTkwMUFcdThGQzcgUGxheXdyaWdodCBcdTc2ODQgQ0RQIFx1ODBGRFx1NTI5QiArIFx1OTg3NVx1OTc2Mlx1NEU4Qlx1NEVGNlx1RkYwQ1x1OTFDN1x1OTZDNlx1RkYxQVxuICogLSBjb25zb2xlIFx1NkQ4OFx1NjA2Ri9cdTk1MTlcdThCRUZcbiAqIC0gXHU3RjUxXHU3RURDXHU4QkY3XHU2QzQyXHVGRjA4XHU1NDJCXHU1OTMxXHU4RDI1XHU1MjA2XHU2NzkwXHVGRjA5XG4gKiAtIFx1NjAyN1x1ODBGRFx1NjMwN1x1NjgwN1x1RkYwOG5hdmlnYXRpb24gdGltaW5nIC8gTENQIC8gXHU5NTdGXHU0RUZCXHU1MkExXHVGRjA5XG4gKiAtIEpTIFx1NjcyQVx1NjM1NVx1ODNCN1x1NUYwMlx1NUUzOFxuICovXG5pbXBvcnQgdHlwZSB7IFBhZ2UgfSBmcm9tIFwicGxheXdyaWdodFwiO1xuaW1wb3J0IHR5cGUgeyBEaWFnbm9zdGljUmVmIH0gZnJvbSBcIkBvcGVubGl1bGFuL2NvcmVcIjtcbmltcG9ydCB0eXBlIHsgRGlhZ25vc3RpY0NvbGxlY3RvciwgTmV0d29ya1JlY29yZCwgUGVyZm9ybWFuY2VNZXRyaWNzIH0gZnJvbSBcIkBvcGVubGl1bGFuL2RpYWdub3Npc1wiO1xuaW1wb3J0IHsgYW5hbHl6ZU5ldHdvcmssIGFuYWx5emVQZXJmb3JtYW5jZSB9IGZyb20gXCJAb3BlbmxpdWxhbi9kaWFnbm9zaXNcIjtcblxuZXhwb3J0IGNsYXNzIENvbnNvbGVDb2xsZWN0b3IgaW1wbGVtZW50cyBEaWFnbm9zdGljQ29sbGVjdG9yIHtcbiAgcmVhZG9ubHkgY2F0ZWdvcnkgPSBcImNvbnNvbGVcIiBhcyBjb25zdDtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwYWdlOiBQYWdlLCBwcml2YXRlIGJ1ZmZlcjogRGlhZ25vc3RpY1JlZltdID0gW10pIHt9XG5cbiAgYXN5bmMgY29sbGVjdCgpOiBQcm9taXNlPERpYWdub3N0aWNSZWZbXT4ge1xuICAgIGNvbnN0IHJlZnMgPSBbLi4udGhpcy5idWZmZXJdO1xuICAgIHRoaXMuYnVmZmVyID0gW107XG4gICAgcmV0dXJuIHJlZnM7XG4gIH1cblxuICAvKiogXHU3NTMxXHU1RjE1XHU2NENFXHU1NzI4XHU5ODc1XHU5NzYyXHU3NkQxXHU1NDJDXHU2NUY2XHU4QzAzXHU3NTI4ICovXG4gIHB1c2godGV4dDogc3RyaW5nLCBsZXZlbDogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3Qgc2V2ZXJpdHkgPSBsZXZlbCA9PT0gXCJlcnJvclwiID8gXCJlcnJvclwiIDogbGV2ZWwgPT09IFwid2FybmluZ1wiID8gXCJ3YXJuaW5nXCIgOiBcImluZm9cIjtcbiAgICB0aGlzLmJ1ZmZlci5wdXNoKHtcbiAgICAgIGtpbmQ6IFwiY29uc29sZVwiLFxuICAgICAgc2V2ZXJpdHksXG4gICAgICBtZXNzYWdlOiB0ZXh0LnNsaWNlKDAsIDUwMCksXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEpzRXhjZXB0aW9uQ29sbGVjdG9yIGltcGxlbWVudHMgRGlhZ25vc3RpY0NvbGxlY3RvciB7XG4gIHJlYWRvbmx5IGNhdGVnb3J5ID0gXCJqcy1leGNlcHRpb25cIiBhcyBjb25zdDtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwYWdlOiBQYWdlLCBwcml2YXRlIGJ1ZmZlcjogRGlhZ25vc3RpY1JlZltdID0gW10pIHt9XG5cbiAgYXN5bmMgY29sbGVjdCgpOiBQcm9taXNlPERpYWdub3N0aWNSZWZbXT4ge1xuICAgIGNvbnN0IHJlZnMgPSBbLi4udGhpcy5idWZmZXJdO1xuICAgIHRoaXMuYnVmZmVyID0gW107XG4gICAgcmV0dXJuIHJlZnM7XG4gIH1cblxuICBwdXNoKGVycm9yOiBFcnJvcik6IHZvaWQge1xuICAgIHRoaXMuYnVmZmVyLnB1c2goe1xuICAgICAga2luZDogXCJqcy1leGNlcHRpb25cIixcbiAgICAgIHNldmVyaXR5OiBcImVycm9yXCIsXG4gICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLnNsaWNlKDAsIDUwMCksXG4gICAgICBkZXRhaWw6IHsgc3RhY2s6IGVycm9yLnN0YWNrPy5zbGljZSgwLCAxMjAwKSB9LFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBOZXR3b3JrQ29sbGVjdG9yIGltcGxlbWVudHMgRGlhZ25vc3RpY0NvbGxlY3RvciB7XG4gIHJlYWRvbmx5IGNhdGVnb3J5ID0gXCJuZXR3b3JrXCIgYXMgY29uc3Q7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcGFnZTogUGFnZSwgcHJpdmF0ZSByZWNvcmRzOiBOZXR3b3JrUmVjb3JkW10gPSBbXSkge31cblxuICBhc3luYyBjb2xsZWN0KCk6IFByb21pc2U8RGlhZ25vc3RpY1JlZltdPiB7XG4gICAgY29uc3QgeyByZWZzIH0gPSBhbmFseXplTmV0d29yayh0aGlzLnJlY29yZHMpO1xuICAgIHRoaXMucmVjb3JkcyA9IFtdO1xuICAgIHJldHVybiByZWZzO1xuICB9XG5cbiAgLyoqIFx1NzUzMVx1NUYxNVx1NjRDRVx1NTcyOFx1OEJGN1x1NkM0Mlx1NUI4Q1x1NjIxMFx1NjVGNlx1OEMwM1x1NzUyOCAqL1xuICByZWNvcmQocmVjb3JkOiBOZXR3b3JrUmVjb3JkKTogdm9pZCB7XG4gICAgdGhpcy5yZWNvcmRzLnB1c2gocmVjb3JkKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUGVyZm9ybWFuY2VDb2xsZWN0b3IgaW1wbGVtZW50cyBEaWFnbm9zdGljQ29sbGVjdG9yIHtcbiAgcmVhZG9ubHkgY2F0ZWdvcnkgPSBcInBlcmZvcm1hbmNlXCIgYXMgY29uc3Q7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcGFnZTogUGFnZSkge31cblxuICBhc3luYyBjb2xsZWN0KCk6IFByb21pc2U8RGlhZ25vc3RpY1JlZltdPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1ldHJpY3MgPSBhd2FpdCB0aGlzLnBhZ2UuZXZhbHVhdGUoKCk6IFBlcmZvcm1hbmNlTWV0cmljcyA9PiB7XG4gICAgICAgIGNvbnN0IG5hdiA9IHBlcmZvcm1hbmNlLmdldEVudHJpZXNCeVR5cGUoXCJuYXZpZ2F0aW9uXCIpWzBdIGFzIFBlcmZvcm1hbmNlTmF2aWdhdGlvblRpbWluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgcGFpbnQgPSBwZXJmb3JtYW5jZS5nZXRFbnRyaWVzQnlUeXBlKFwicGFpbnRcIikgYXMgUGVyZm9ybWFuY2VFbnRyeVtdO1xuICAgICAgICBjb25zdCBsY3BFbnRyeSA9IHBlcmZvcm1hbmNlXG4gICAgICAgICAgLmdldEVudHJpZXNCeVR5cGUoXCJsYXJnZXN0LWNvbnRlbnRmdWwtcGFpbnRcIilcbiAgICAgICAgICAucG9wKCkgYXMgUGVyZm9ybWFuY2VFbnRyeSB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VzID0gcGVyZm9ybWFuY2UuZ2V0RW50cmllc0J5VHlwZShcInJlc291cmNlXCIpIGFzIFBlcmZvcm1hbmNlUmVzb3VyY2VUaW1pbmdbXTtcblxuICAgICAgICAvLyBcdTk1N0ZcdTRFRkJcdTUyQTFcdUZGMUE+NTBtcyBcdTg5QzZcdTRFM0FcdTk2M0JcdTU4NUVcbiAgICAgICAgY29uc3QgbG9uZ1Rhc2tzID0gKHBlcmZvcm1hbmNlIGFzIGFueSkuZ2V0RW50cmllc0J5VHlwZVxuICAgICAgICAgID8gcGVyZm9ybWFuY2UuZ2V0RW50cmllc0J5VHlwZShcImxvbmd0YXNrXCIpLmxlbmd0aFxuICAgICAgICAgIDogMDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHR0ZmI6IG5hdiA/IG5hdi5yZXNwb25zZVN0YXJ0IC0gbmF2LnJlcXVlc3RTdGFydCA6IDAsXG4gICAgICAgICAgZG9tQ29udGVudExvYWRlZDogbmF2ID8gbmF2LmRvbUNvbnRlbnRMb2FkZWRFdmVudFN0YXJ0IC0gbmF2LnN0YXJ0VGltZSA6IDAsXG4gICAgICAgICAgbG9hZEV2ZW50OiBuYXYgPyBuYXYubG9hZEV2ZW50RW5kIC0gbmF2LnN0YXJ0VGltZSA6IDAsXG4gICAgICAgICAgZmNwOiBwYWludC5maW5kKChwKSA9PiBwLm5hbWUgPT09IFwiZmlyc3QtY29udGVudGZ1bC1wYWludFwiKT8uc3RhcnRUaW1lLFxuICAgICAgICAgIGxjcDogbGNwRW50cnk/LnN0YXJ0VGltZSxcbiAgICAgICAgICByZXNvdXJjZXM6IHtcbiAgICAgICAgICAgIGNvdW50OiByZXNvdXJjZXMubGVuZ3RoLFxuICAgICAgICAgICAgdG90YWxCeXRlczogcmVzb3VyY2VzLnJlZHVjZSgocywgcikgPT4gcyArIChyLnRyYW5zZmVyU2l6ZSB8fCAwKSwgMCksXG4gICAgICAgICAgfSxcbiAgICAgICAgICBsb25nVGFza3MsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHsgcmVmcyB9ID0gYW5hbHl6ZVBlcmZvcm1hbmNlKG1ldHJpY3MpO1xuICAgICAgcmV0dXJuIHJlZnM7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRE9NIFx1OEJDQVx1NjVBRFx1OTFDN1x1OTZDNlx1NTY2OFx1RkYxQVx1NjhDMFx1NkQ0Qlx1OTg3NVx1OTc2Mlx1NkUzMlx1NjdEM1x1NzJCNlx1NjAwMVx1RkYwQ1x1ODg2NVx1OUY1MFx1MzAwQ1x1NzY3RFx1NUM0Ri9cdTY3MkFcdTZFMzJcdTY3RDMvXHU2NUUwXHU0RUE0XHU0RTkyXHUzMDBEXHU4RkQ5XHU3QzdCXG4gKiBcdTRFQ0UgY29uc29sZS9uZXR3b3JrIFx1OTFDQ1x1NzcwQlx1NEUwRFx1NTIzMFx1NzY4NCBET00gXHU3RUE3XHU5NUVFXHU5ODk4XHVGRjA4XHU1QkY5XHU1RTk0XHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU1RTkzXHU3Njg0IGJsYW5rLXBhZ2UgXHU1NzNBXHU2NjZGXHVGRjA5XHUzMDAyXG4gKi9cbmV4cG9ydCBjbGFzcyBEb21Db2xsZWN0b3IgaW1wbGVtZW50cyBEaWFnbm9zdGljQ29sbGVjdG9yIHtcbiAgcmVhZG9ubHkgY2F0ZWdvcnkgPSBcImRvbVwiIGFzIGNvbnN0O1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBhZ2U6IFBhZ2UpIHt9XG5cbiAgYXN5bmMgY29sbGVjdCgpOiBQcm9taXNlPERpYWdub3N0aWNSZWZbXT4ge1xuICAgIGNvbnN0IHJlZnM6IERpYWdub3N0aWNSZWZbXSA9IFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0ZSA9IGF3YWl0IHRoaXMucGFnZS5ldmFsdWF0ZSgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICAgICAgICBjb25zdCBoYXNCb2R5ID0gISFib2R5ICYmIGJvZHkuY2hpbGRFbGVtZW50Q291bnQgPiAwO1xuICAgICAgICAvLyBcdTUzRUZcdTg5QzFcdTRFMTRcdTUzRUZcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTY1NzBcdTkxQ0ZcdUZGMDhcdTYzOTJcdTk2NjRcdTk2OTBcdTg1Q0YvXHU2NUUwXHU1RTAzXHU1QzQwXHU1MTQzXHU3RDIwXHVGRjA5XG4gICAgICAgIGNvbnN0IHZpc2libGUgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJhLGJ1dHRvbixpbnB1dCxzZWxlY3QsdGV4dGFyZWEsW3JvbGVdXCIpKVxuICAgICAgICAgIC5maWx0ZXIoKGVsKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByID0gKGVsIGFzIEhUTUxFbGVtZW50KS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIGNvbnN0IHMgPSBnZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICAgICAgICAgIHJldHVybiBzLmRpc3BsYXkgIT09IFwibm9uZVwiICYmIHMudmlzaWJpbGl0eSAhPT0gXCJoaWRkZW5cIiAmJiByLndpZHRoID4gMCAmJiByLmhlaWdodCA+IDA7XG4gICAgICAgICAgfSkubGVuZ3RoO1xuICAgICAgICBjb25zdCByb290ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyb290XCIpIHx8IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXBwXCIpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGhhc0JvZHksXG4gICAgICAgICAgdmlzaWJsZUludGVyYWN0aXZlOiB2aXNpYmxlLFxuICAgICAgICAgIGhhc01vdW50OiByb290ID8gcm9vdC5jaGlsZEVsZW1lbnRDb3VudCA+IDAgOiBudWxsLFxuICAgICAgICAgIGJvZHlUZXh0TGVuOiAoZG9jdW1lbnQuYm9keT8uaW5uZXJUZXh0IHx8IFwiXCIpLnRyaW0oKS5sZW5ndGgsXG4gICAgICAgIH07XG4gICAgICB9KTtcblxuICAgICAgLy8gXHU3NjdEXHU1QzRGIC8gXHU2NzJBXHU2RTMyXHU2N0QzXHVGRjFBYm9keSBcdTY1RTBcdTVCNTBcdTUxNDNcdTdEMjAgXHU2MjE2IFx1NjMwMlx1OEY3RFx1ODI4Mlx1NzBCOVx1N0E3QSBcdTRFMTQgXHU2NUUwXHU1M0VGXHU0RUE0XHU0RTkyXHU1MTQzXHU3RDIwXG4gICAgICBjb25zdCBibGFuayA9IHN0YXRlLmhhc0JvZHkgPT09IGZhbHNlIHx8IChzdGF0ZS52aXNpYmxlSW50ZXJhY3RpdmUgPT09IDAgJiYgc3RhdGUuYm9keVRleHRMZW4gPT09IDApO1xuICAgICAgaWYgKGJsYW5rKSB7XG4gICAgICAgIHJlZnMucHVzaCh7XG4gICAgICAgICAga2luZDogXCJkb21cIixcbiAgICAgICAgICBzZXZlcml0eTogXCJlcnJvclwiLFxuICAgICAgICAgIG1lc3NhZ2U6IGBcdTk4NzVcdTk3NjJcdTc1OTFcdTRGM0NcdTdBN0FcdTc2N0QvXHU2NzJBXHU2RTMyXHU2N0QzXHVGRjFBYm9keSBcdTVCNTBcdTUxNDNcdTdEMjA9JHtzdGF0ZS5oYXNCb2R5fVx1RkYwQ1x1NTNFRlx1ODlDMVx1NEVBNFx1NEU5Mlx1NTE0M1x1N0QyMD0ke3N0YXRlLnZpc2libGVJbnRlcmFjdGl2ZX1cdUZGMENcdTZCNjNcdTY1ODc9JHtzdGF0ZS5ib2R5VGV4dExlbn0gXHU1QjU3XHU3QjI2YCxcbiAgICAgICAgICBkZXRhaWw6IHsgaGFzTW91bnQ6IHN0YXRlLmhhc01vdW50IH0sXG4gICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUudmlzaWJsZUludGVyYWN0aXZlID09PSAwKSB7XG4gICAgICAgIC8vIFx1OTg3NVx1OTc2Mlx1NjcwOVx1NTE4NVx1NUJCOVx1NEY0Nlx1NjVFMFx1NTNFRlx1ODlDMVx1NTNFRlx1NEVBNFx1NEU5Mlx1NTE0M1x1N0QyMFx1RkYwOFx1NTNFRlx1ODBGRFx1NEVBNFx1NEU5Mlx1ODhBQlx1OTA2RVx1NjMyMS9cdTk3MDBcdTg5ODFcdTc2N0JcdTVGNTVcdTdCNDlcdUZGMDlcbiAgICAgICAgcmVmcy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBcImRvbVwiLFxuICAgICAgICAgIHNldmVyaXR5OiBcIndhcm5pbmdcIixcbiAgICAgICAgICBtZXNzYWdlOiBgXHU5ODc1XHU5NzYyXHU2NUUwXHU1M0VGXHU4OUMxXHU1M0VGXHU0RUE0XHU0RTkyXHU1MTQzXHU3RDIwXHVGRjA4XHU2QjYzXHU2NTg3ICR7c3RhdGUuYm9keVRleHRMZW59IFx1NUI1N1x1N0IyNlx1RkYwOVx1RkYwQ1x1NTNFRlx1ODBGRFx1OTcwMFx1NzY3Qlx1NUY1NVx1NjIxNlx1NTE0M1x1N0QyMFx1ODhBQlx1OTA2RVx1NjMyMWAsXG4gICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIERPTSBcdTkxQzdcdTk2QzZcdTU5MzFcdThEMjVcdTVGRkRcdTc1NjVcdUZGMDhcdTRFMERcdTk2M0JcdTY1QURcdTY1NzRcdTRGNTNcdThCQ0FcdTY1QURcdUZGMDlcbiAgICB9XG4gICAgcmV0dXJuIHJlZnM7XG4gIH1cbn1cblxuLyoqIFx1ODA1QVx1NTQwOFx1NjI0MFx1NjcwOVx1OTFDN1x1OTZDNlx1NTY2OCAqL1xuZXhwb3J0IGNsYXNzIFBsYXl3cmlnaHREaWFnbm9zdGljcyB7XG4gIGNvbnNvbGU6IENvbnNvbGVDb2xsZWN0b3I7XG4gIGpzRXhjZXB0aW9uczogSnNFeGNlcHRpb25Db2xsZWN0b3I7XG4gIG5ldHdvcms6IE5ldHdvcmtDb2xsZWN0b3I7XG4gIHBlcmZvcm1hbmNlOiBQZXJmb3JtYW5jZUNvbGxlY3RvcjtcbiAgZG9tOiBEb21Db2xsZWN0b3I7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwYWdlOiBQYWdlKSB7XG4gICAgdGhpcy5jb25zb2xlID0gbmV3IENvbnNvbGVDb2xsZWN0b3IodGhpcy5wYWdlKTtcbiAgICB0aGlzLmpzRXhjZXB0aW9ucyA9IG5ldyBKc0V4Y2VwdGlvbkNvbGxlY3Rvcih0aGlzLnBhZ2UpO1xuICAgIHRoaXMubmV0d29yayA9IG5ldyBOZXR3b3JrQ29sbGVjdG9yKHRoaXMucGFnZSk7XG4gICAgdGhpcy5wZXJmb3JtYW5jZSA9IG5ldyBQZXJmb3JtYW5jZUNvbGxlY3Rvcih0aGlzLnBhZ2UpO1xuICAgIHRoaXMuZG9tID0gbmV3IERvbUNvbGxlY3Rvcih0aGlzLnBhZ2UpO1xuICAgIHRoaXMud2lyZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSB3aXJlKCk6IHZvaWQge1xuICAgIHRoaXMucGFnZS5vbihcImNvbnNvbGVcIiwgKG1zZykgPT4gdGhpcy5jb25zb2xlLnB1c2gobXNnLnRleHQoKSwgbXNnLnR5cGUoKSkpO1xuICAgIHRoaXMucGFnZS5vbihcInBhZ2VlcnJvclwiLCAoZXJyKSA9PiB0aGlzLmpzRXhjZXB0aW9ucy5wdXNoKGVycikpO1xuICAgIHRoaXMucGFnZS5vbihcInJlcXVlc3RmYWlsZWRcIiwgKHJlcSkgPT4ge1xuICAgICAgdGhpcy5uZXR3b3JrLnJlY29yZCh7XG4gICAgICAgIHVybDogcmVxLnVybCgpLFxuICAgICAgICBtZXRob2Q6IHJlcS5tZXRob2QoKSxcbiAgICAgICAgc3RhdHVzOiAwLFxuICAgICAgICBlcnJvcjogcmVxLmZhaWx1cmUoKT8uZXJyb3JUZXh0IHx8IFwiZmFpbGVkXCIsXG4gICAgICAgIGR1cmF0aW9uTXM6IDAsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLnBhZ2Uub24oXCJyZXNwb25zZVwiLCAocmVzKSA9PiB7XG4gICAgICBjb25zdCByZXEgPSByZXMucmVxdWVzdCgpO1xuICAgICAgdGhpcy5uZXR3b3JrLnJlY29yZCh7XG4gICAgICAgIHVybDogcmVxLnVybCgpLFxuICAgICAgICBtZXRob2Q6IHJlcS5tZXRob2QoKSxcbiAgICAgICAgc3RhdHVzOiByZXMuc3RhdHVzKCksXG4gICAgICAgIHN0YXR1c1RleHQ6IHJlcy5zdGF0dXNUZXh0KCksXG4gICAgICAgIG1pbWVUeXBlOiByZXMuaGVhZGVycygpW1wiY29udGVudC10eXBlXCJdLFxuICAgICAgICBkdXJhdGlvbk1zOiAwLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBjb2xsZWN0b3JzKCk6IERpYWdub3N0aWNDb2xsZWN0b3JbXSB7XG4gICAgcmV0dXJuIFt0aGlzLmNvbnNvbGUsIHRoaXMuanNFeGNlcHRpb25zLCB0aGlzLm5ldHdvcmssIHRoaXMucGVyZm9ybWFuY2UsIHRoaXMuZG9tXTtcbiAgfVxufVxuIiwgIi8qKlxyXG4gKiBQbGF5d3JpZ2h0RW5naW5lIFx1MjAxNFx1MjAxNCBcdTVFOTVcdTVDNDJcdTlBNzFcdTUyQThcdTVCOUVcdTczQjBcclxuICpcclxuICogXHU1NDBDXHU2NUY2XHU2M0QwXHU0RjlCXHVGRjFBXHJcbiAqIC0gXHU3RURGXHU0RTAwXHU1MkE4XHU0RjVDXHU2MjY3XHU4ODRDXHVGRjA4XHU3Q0JFXHU3ODZFXHU2NENEXHU0RjVDXHVGRjA5XHJcbiAqIC0gXHU5QUQ4XHU2NTQ4XHU1RkVCXHU3MTY3XHJcbiAqIC0gNSBcdTY2MUZcdThCQ0FcdTY1QURcdTkxQzdcdTk2QzZcdUZGMDhcdTkwMUFcdThGQzcgQ0RQL1x1NEU4Qlx1NEVGNlx1RkYwOVxyXG4gKi9cclxuaW1wb3J0IHsgY2hyb21pdW0sIHR5cGUgQnJvd3NlciwgdHlwZSBQYWdlLCB0eXBlIEJyb3dzZXJDb250ZXh0IH0gZnJvbSBcInBsYXl3cmlnaHRcIjtcclxuaW1wb3J0IHR5cGUgeyBCcm93c2VyRW5naW5lLCBEaWFnbm9zdGljUmVwb3J0LCBVbmlmaWVkQWN0aW9uLCBBY3Rpb25SZXN1bHQsIFBhZ2VTbmFwc2hvdCwgU25hcHNob3RPcHRpb25zIH0gZnJvbSBcIkBvcGVubGl1bGFuL2NvcmVcIjtcclxuaW1wb3J0IHsgbG9jYXRlQnlTZW1hbnRpYyB9IGZyb20gXCJAb3BlbmxpdWxhbi9haS1sYXllclwiO1xyXG5pbXBvcnQgeyBTdGVhbHRoTWFuYWdlciwgdHlwZSBTdGVhbHRoT3B0aW9ucyB9IGZyb20gXCJAb3BlbmxpdWxhbi9zdGVhbHRoXCI7XHJcbmltcG9ydCB7IEVsZW1lbnRMb2NhdG9yIH0gZnJvbSBcIi4vbG9jYXRvci5qc1wiO1xyXG5pbXBvcnQgeyBTbmFwc2hvdEJ1aWxkZXIgfSBmcm9tIFwiLi9zbmFwc2hvdC5qc1wiO1xyXG5pbXBvcnQgeyBQbGF5d3JpZ2h0RGlhZ25vc3RpY3MgfSBmcm9tIFwiLi9kaWFnbm9zdGljcy5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQbGF5d3JpZ2h0RW5naW5lT3B0aW9ucyB7XHJcbiAgaGVhZGxlc3M/OiBib29sZWFuO1xyXG4gIC8qKiBcdThGREVcdTYzQTVcdTUyMzBcdTVERjJcdTU0MkZcdTUyQThcdTc2ODRcdTZENEZcdTg5QzhcdTU2NjhcdUZGMDhDRFBcdUZGMENcdTUwMUZcdTkyNzQgRGV2VG9vbHMgTUNQIFx1NzZGNFx1OEZERVx1ODBGRFx1NTI5Qlx1RkYwOSAqL1xyXG4gIGNvbm5lY3RVcmw/OiBzdHJpbmc7XHJcbiAgLyoqIFx1NkQ0Rlx1ODlDOFx1NTY2OFx1NTNFRlx1NjI2N1x1ODg0Q1x1OERFRlx1NUY4NCAqL1xyXG4gIGV4ZWN1dGFibGVQYXRoPzogc3RyaW5nO1xyXG4gIC8qKiBcdTg5QzZcdTUzRTMgKi9cclxuICB2aWV3cG9ydD86IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfTtcclxuICAvKiogXHU5NjMyXHU2OEMwXHU2RDRCXHU5MTREXHU3RjZFXHVGRjA4XHU1M0VGXHU5MDA5XHVGRjBDXHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHVGRjA5ICovXHJcbiAgc3RlYWx0aD86IFN0ZWFsdGhPcHRpb25zIHwgU3RlYWx0aE1hbmFnZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBQbGF5d3JpZ2h0RW5naW5lIGltcGxlbWVudHMgQnJvd3NlckVuZ2luZSB7XHJcbiAgcmVhZG9ubHkgbmFtZSA9IFwicGxheXdyaWdodCtjZHBcIjtcclxuICBwcml2YXRlIGJyb3dzZXI/OiBCcm93c2VyO1xyXG4gIHByaXZhdGUgY29udGV4dD86IEJyb3dzZXJDb250ZXh0O1xyXG4gIHByaXZhdGUgcGFnZT86IFBhZ2U7XHJcbiAgcHJpdmF0ZSBsb2NhdG9yPzogRWxlbWVudExvY2F0b3I7XHJcbiAgcHJpdmF0ZSBzbmFwc2hvdEJ1aWxkZXI/OiBTbmFwc2hvdEJ1aWxkZXI7XHJcbiAgcHJpdmF0ZSBkaWFnbm9zdGljcz86IFBsYXl3cmlnaHREaWFnbm9zdGljcztcclxuICBwcml2YXRlIG9wdGlvbnM6IFBsYXl3cmlnaHRFbmdpbmVPcHRpb25zO1xyXG4gIC8qKiBcdTk2MzJcdTY4QzBcdTZENEJcdTdCQTFcdTc0MDZcdTU2NjggKi9cclxuICBwcml2YXRlIHN0ZWFsdGg/OiBTdGVhbHRoTWFuYWdlcjtcclxuXHJcbiAgY29uc3RydWN0b3Iob3B0aW9uczogUGxheXdyaWdodEVuZ2luZU9wdGlvbnMgPSB7fSkge1xyXG4gICAgdGhpcy5vcHRpb25zID0geyBoZWFkbGVzczogdHJ1ZSwgdmlld3BvcnQ6IHsgd2lkdGg6IDEyODAsIGhlaWdodDogODAwIH0sIC4uLm9wdGlvbnMgfTtcclxuICAgIC8vIFx1Njc4NFx1OTAyMCBzdGVhbHRoIFx1N0JBMVx1NzQwNlx1NTY2OFx1RkYwOFx1NjNBNVx1NTNENyBTdGVhbHRoTWFuYWdlciBcdTVCOUVcdTRGOEJcdTYyMTZcdTkxNERcdTdGNkVcdTVCRjlcdThDNjFcdUZGMDlcclxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RlYWx0aCBpbnN0YW5jZW9mIFN0ZWFsdGhNYW5hZ2VyKSB7XHJcbiAgICAgIHRoaXMuc3RlYWx0aCA9IHRoaXMub3B0aW9ucy5zdGVhbHRoO1xyXG4gICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuc3RlYWx0aCkge1xyXG4gICAgICB0aGlzLnN0ZWFsdGggPSBuZXcgU3RlYWx0aE1hbmFnZXIodGhpcy5vcHRpb25zLnN0ZWFsdGgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqIFx1NUY1M1x1NTI0RCBzdGVhbHRoIFx1NjYyRlx1NTQyNlx1NTQyRlx1NzUyOCAqL1xyXG4gIGdldCBzdGVhbHRoRW5hYmxlZCgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0aGlzLnN0ZWFsdGg/LmlzRW5hYmxlZCA/PyBmYWxzZTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGluaXQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBsYXVuY2hBcmdzID0gdGhpcy5zdGVhbHRoPy5idWlsZExhdW5jaEFyZ3MoKSA/PyBbXTtcclxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29ubmVjdFVybCkge1xyXG4gICAgICAvLyBDRFAgXHU3NkY0XHU4RkRFXHVGRjA4XHU1MDFGXHU5Mjc0IENocm9tZSBEZXZUb29scyBNQ1AgXHU3Njg0XHU4MEZEXHU1MjlCXHVGRjA5XHJcbiAgICAgIHRoaXMuYnJvd3NlciA9IGF3YWl0IGNocm9taXVtLmNvbm5lY3RPdmVyQ0RQKHRoaXMub3B0aW9ucy5jb25uZWN0VXJsKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuYnJvd3NlciA9IGF3YWl0IGNocm9taXVtLmxhdW5jaCh7XHJcbiAgICAgICAgaGVhZGxlc3M6IHRoaXMub3B0aW9ucy5oZWFkbGVzcyxcclxuICAgICAgICBleGVjdXRhYmxlUGF0aDogdGhpcy5vcHRpb25zLmV4ZWN1dGFibGVQYXRoLFxyXG4gICAgICAgIGFyZ3M6IGxhdW5jaEFyZ3MubGVuZ3RoID8gbGF1bmNoQXJncyA6IHVuZGVmaW5lZCxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvLyBcdTUyMUJcdTVFRkFcdTRFMEFcdTRFMEJcdTY1ODdcdUZGMUFcdTgyRTVcdTU0MkZcdTc1Mjggc3RlYWx0aFx1RkYwQ1x1NkNFOFx1NTE2NVx1NTNDRFx1NjMwN1x1N0VCOVx1ODExQVx1NjcyQ1x1NEUwRSBVQVxyXG4gICAgY29uc3QgY3R4T3B0aW9uczogYW55ID0geyB2aWV3cG9ydDogdGhpcy5vcHRpb25zLnZpZXdwb3J0IH07XHJcbiAgICBpZiAodGhpcy5zdGVhbHRoPy5pc0VuYWJsZWQpIHtcclxuICAgICAgY29uc3QgaW5pdFNjcmlwdCA9IHRoaXMuc3RlYWx0aC5idWlsZEluaXRTY3JpcHQoKTtcclxuICAgICAgaWYgKGluaXRTY3JpcHQpIGN0eE9wdGlvbnMuaW5pdFNjcmlwdCA9IGluaXRTY3JpcHQ7XHJcbiAgICAgIGlmICh0aGlzLnN0ZWFsdGgub3B0aW9ucy51c2VyQWdlbnQpIGN0eE9wdGlvbnMudXNlckFnZW50ID0gdGhpcy5zdGVhbHRoLm9wdGlvbnMudXNlckFnZW50O1xyXG4gICAgfVxyXG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5icm93c2VyLmNvbnRleHRzKClbMF0gfHwgKGF3YWl0IHRoaXMuYnJvd3Nlci5uZXdDb250ZXh0KGN0eE9wdGlvbnMpKTtcclxuICAgIHRoaXMucGFnZSA9IHRoaXMuY29udGV4dC5wYWdlcygpWzBdIHx8IChhd2FpdCB0aGlzLmNvbnRleHQubmV3UGFnZSgpKTtcclxuICAgIHRoaXMuZGlhZ25vc3RpY3MgPSBuZXcgUGxheXdyaWdodERpYWdub3N0aWNzKHRoaXMucGFnZSk7XHJcbiAgICB0aGlzLnNuYXBzaG90QnVpbGRlciA9IG5ldyBTbmFwc2hvdEJ1aWxkZXIodGhpcy5wYWdlKTtcclxuICAgIHRoaXMubG9jYXRvciA9IG5ldyBFbGVtZW50TG9jYXRvcih0aGlzLnBhZ2UsIHtcclxuICAgICAgLy8gXHU4QkVEXHU0RTQ5XHU1QjlBXHU0RjREXHU5NEZFXHU4REVGXHVGRjFBYXJpYS9wbGFjZWhvbGRlciBcdTUxNUNcdTVFOTVcdTU5MzFcdThEMjVcdTU0MEVcdUZGMENcdTU3RkFcdTRFOEVcdTVGRUJcdTcxNjdcdTUwNUFcdTRFMkRcdTY1ODdcdTUyMDZcdThCQ0QrXHU4QkVEXHU0RTQ5XHU3NkY4XHU0RjNDXHU1RUE2XHU1MzM5XHU5MTREXHJcbiAgICAgIHJlc29sdmU6IGFzeW5jIChzZW1hbnRpYykgPT4ge1xyXG4gICAgICAgIGNvbnN0IHNuYXAgPSBhd2FpdCB0aGlzLnNuYXBzaG90QnVpbGRlciEuYnVpbGQoeyBtYXhOb2RlczogMjAwLCBtYXhUZXh0TGVuZ3RoOiA4MCB9KTtcclxuICAgICAgICBjb25zdCBoaXQgPSBsb2NhdGVCeVNlbWFudGljKHNuYXAsIHNlbWFudGljKTtcclxuICAgICAgICBpZiAoaGl0ICYmIChoaXQucmVmIHx8IGhpdC5zZWxlY3RvcikpIHtcclxuICAgICAgICAgIHJldHVybiB7IHJlZjogaGl0LnJlZiwgdGV4dDogaGl0LnRleHQsIHNlbGVjdG9yOiBoaXQuc2VsZWN0b3IgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGNsb3NlKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5icm93c2VyPy5jbG9zZSgpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZXhlY3V0ZShhY3Rpb246IFVuaWZpZWRBY3Rpb24pOiBQcm9taXNlPEFjdGlvblJlc3VsdD4ge1xyXG4gICAgaWYgKCF0aGlzLnBhZ2UpIHRocm93IG5ldyBFcnJvcihcIlx1NUYxNVx1NjRDRVx1NjcyQVx1NTIxRFx1NTlDQlx1NTMxNlx1RkYwQ1x1OEJGN1x1NTE0OFx1OEMwM1x1NzUyOCBpbml0KClcIik7XHJcbiAgICBjb25zdCB0MCA9IERhdGUubm93KCk7XHJcblxyXG4gICAgc3dpdGNoIChhY3Rpb24udHlwZSkge1xyXG4gICAgICBjYXNlIFwibmF2aWdhdGVcIjoge1xyXG4gICAgICAgIGF3YWl0IHRoaXMucGFnZS5nb3RvKGFjdGlvbi51cmwsIHsgd2FpdFVudGlsOiBhY3Rpb24ud2FpdFVudGlsID8/IFwibmV0d29ya2lkbGVcIiwgdGltZW91dDogMzBfMDAwIH0pO1xyXG4gICAgICAgIHRoaXMuZGlhZ25vc3RpY3M/Lm5ldHdvcmsucmVjb3JkKHtcclxuICAgICAgICAgIHVybDogYWN0aW9uLnVybCxcclxuICAgICAgICAgIG1ldGhvZDogXCJOQVZcIixcclxuICAgICAgICAgIHN0YXR1czogMjAwLFxyXG4gICAgICAgICAgZHVyYXRpb25NczogRGF0ZS5ub3coKSAtIHQwLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiB7IG9rOiB0cnVlLCB0eXBlOiBcIm5hdmlnYXRlXCIsIHN1bW1hcnk6IGBcdTVERjJcdTVCRkNcdTgyMkFcdTUyMzAgJHthY3Rpb24udXJsfWAsIGR1cmF0aW9uTXM6IERhdGUubm93KCkgLSB0MCB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjYXNlIFwiY2xpY2tcIjoge1xyXG4gICAgICAgIGNvbnN0IHsgbG9jYXRvciwgc3RyYXRlZ3ksIGFuY2hvclNlbGVjdG9yIH0gPSBhd2FpdCB0aGlzLmxvY2F0b3IhLmxvY2F0ZSh7XHJcbiAgICAgICAgICByZWY6IGFjdGlvbi5yZWYsXHJcbiAgICAgICAgICBzZWxlY3RvcjogYWN0aW9uLnNlbGVjdG9yLFxyXG4gICAgICAgICAgdGV4dDogYWN0aW9uLnRleHQsXHJcbiAgICAgICAgICBzZW1hbnRpYzogYWN0aW9uLnNlbWFudGljLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vIFx1NzBCOVx1NTFGQlx1NTNFRlx1ODBGRFx1ODlFNlx1NTNEMVx1OTg3NVx1OTc2Mlx1NUJGQ1x1ODIyQVx1RkYwOFx1NTk4Mlx1NzBCOVx1NTFGQjxhPlx1OTRGRVx1NjNBNVx1OERGM1x1OEY2Q1x1RkYwOVx1MzAwMlxyXG4gICAgICAgIC8vIFx1NTNFQVx1NjcwOVx1NzBCOVx1NTFGQlx1NzZFRVx1NjgwN1x1NjYyRlx1OTRGRVx1NjNBNVx1NjVGNlx1NjI0RFx1N0I0OVx1NUY4NVx1NjVCMFx1OTg3NVx1OTc2Mlx1NTJBMFx1OEY3RFx1RkYwQ1x1OTA3Rlx1NTE0RFx1NjY2RVx1OTAxQVx1NjMwOVx1OTRBRVx1NjVFMFx1OEMxM1x1N0I0OVx1NUY4NVx1NUJGQ1x1ODIyQVx1OEQ4NVx1NjVGNlx1MzAwMlxyXG4gICAgICAgIGNvbnN0IHdhaXRGb3JOYXZpZ2F0aW9uID0gYWN0aW9uLndhaXRGb3JOYXZpZ2F0aW9uID8/IHRydWU7XHJcbiAgICAgICAgY29uc3QgaXNMaW5rID0gYXdhaXQgbG9jYXRvclxyXG4gICAgICAgICAgLmV2YWx1YXRlKChlbCkgPT4gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImFcIiAmJiAhIWVsLmdldEF0dHJpYnV0ZShcImhyZWZcIikpXHJcbiAgICAgICAgICAuY2F0Y2goKCkgPT4gZmFsc2UpO1xyXG4gICAgICAgIGNvbnN0IG5hdlByb21pc2UgPVxyXG4gICAgICAgICAgd2FpdEZvck5hdmlnYXRpb24gJiYgaXNMaW5rXHJcbiAgICAgICAgICAgID8gdGhpcy5wYWdlXHJcbiAgICAgICAgICAgICAgICAud2FpdEZvck5hdmlnYXRpb24oeyB3YWl0VW50aWw6IFwibG9hZFwiLCB0aW1lb3V0OiAxNV8wMDAgfSlcclxuICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiBudWxsKSAvLyBcdTY3MkFcdTg5RTZcdTUzRDFcdTVCRkNcdTgyMkFcdTY1RjZcdTk3NTlcdTlFRDhcdTVGRkRcdTc1NjVcclxuICAgICAgICAgICAgOiBudWxsO1xyXG4gICAgICAgIGF3YWl0IGxvY2F0b3IuY2xpY2soe1xyXG4gICAgICAgICAgYnV0dG9uOiBhY3Rpb24uYnV0dG9uLFxyXG4gICAgICAgICAgY2xpY2tDb3VudDogYWN0aW9uLmNsaWNrQ291bnQsXHJcbiAgICAgICAgICBmb3JjZTogYWN0aW9uLmZvcmNlLFxyXG4gICAgICAgICAgdGltZW91dDogMTVfMDAwLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vIFx1ODJFNVx1NzBCOVx1NTFGQlx1OTRGRVx1NjNBNVx1ODlFNlx1NTNEMVx1NEU4Nlx1NUJGQ1x1ODIyQVx1RkYwQ1x1NTIxOVx1N0I0OVx1NUY4NVx1NTE3Nlx1NUI4Q1x1NjIxMFx1NTQwRVx1NTE4RFx1OEZENFx1NTZERVx1RkYwQ1x1NEZERFx1OEJDMVx1NTQwRVx1N0VFRFx1NjRDRFx1NEY1Q1x1OTc2Mlx1NUJGOVx1N0EzM1x1NUI5QVx1OTg3NVx1OTc2MlxyXG4gICAgICAgIGlmIChuYXZQcm9taXNlKSBhd2FpdCBuYXZQcm9taXNlO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBvazogdHJ1ZSxcclxuICAgICAgICAgIHR5cGU6IFwiY2xpY2tcIixcclxuICAgICAgICAgIHN1bW1hcnk6IGBcdTVERjJcdTcwQjlcdTUxRkJcdUZGMDhcdTdCNTZcdTc1NjU9JHtzdHJhdGVneX0gXHU5NTFBXHU3MEI5PSR7YW5jaG9yU2VsZWN0b3J9JHtuYXZQcm9taXNlID8gXCIsXHU1REYyXHU3QjQ5XHU1Rjg1XHU1QkZDXHU4MjJBXHU3QTMzXHU1QjlBXCIgOiBcIlwifVx1RkYwOWAsXHJcbiAgICAgICAgICBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAsXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY2FzZSBcImZpbGxcIjoge1xyXG4gICAgICAgIGNvbnN0IHsgbG9jYXRvciwgc3RyYXRlZ3kgfSA9IGF3YWl0IHRoaXMubG9jYXRvciEubG9jYXRlKHtcclxuICAgICAgICAgIHJlZjogYWN0aW9uLnJlZixcclxuICAgICAgICAgIHNlbGVjdG9yOiBhY3Rpb24uc2VsZWN0b3IsXHJcbiAgICAgICAgICB0ZXh0OiBhY3Rpb24udGV4dCxcclxuICAgICAgICAgIHNlbWFudGljOiBhY3Rpb24uc2VtYW50aWMsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgYXdhaXQgbG9jYXRvci5maWxsKGFjdGlvbi52YWx1ZSk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIG9rOiB0cnVlLFxyXG4gICAgICAgICAgdHlwZTogXCJmaWxsXCIsXHJcbiAgICAgICAgICBzdW1tYXJ5OiBgXHU1REYyXHU1ODZCXHU1MTY1XHU1MTg1XHU1QkI5XHVGRjA4XHU3QjU2XHU3NTY1PSR7c3RyYXRlZ3l9XHVGRjA5YCxcclxuICAgICAgICAgIGR1cmF0aW9uTXM6IERhdGUubm93KCkgLSB0MCxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjYXNlIFwidHlwZVwiOiB7XHJcbiAgICAgICAgY29uc3QgeyBsb2NhdG9yLCBzdHJhdGVneSB9ID0gYXdhaXQgdGhpcy5sb2NhdG9yIS5sb2NhdGUoe1xyXG4gICAgICAgICAgcmVmOiBhY3Rpb24ucmVmLFxyXG4gICAgICAgICAgc2VsZWN0b3I6IGFjdGlvbi5zZWxlY3RvcixcclxuICAgICAgICAgIHRleHQ6IGFjdGlvbi50ZXh0LFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGF3YWl0IGxvY2F0b3IuY2xpY2soKTtcclxuICAgICAgICAvLyBzdGVhbHRoIFx1NkEyMVx1NUYwRlx1NEUwQlx1RkYxQVx1OTAxMFx1OTUyRVx1OEY5M1x1NTE2NVx1NUUyNlx1NEVCQVx1N0M3Qlx1NTMxNlx1OTY4Rlx1NjczQVx1NUVGNlx1OEZERlx1RkYwOFx1OTA3Rlx1NTE0RFx1OEY5M1x1NTE2NVx1NTkyQVx1NUZFQlx1ODhBQlx1OEJDNlx1NTIyQlx1NEUzQVx1NjczQVx1NTY2OFx1NEVCQVx1RkYwOVxyXG4gICAgICAgIGNvbnN0IGRlbGF5ID0gYWN0aW9uLmRlbGF5ID8/ICh0aGlzLnN0ZWFsdGg/LmlzRW5hYmxlZCA/IHRoaXMuc3RlYWx0aC5odW1hblR5cGluZ0RlbGF5TXMoKSA6IHVuZGVmaW5lZCk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5wYWdlLmtleWJvYXJkLnR5cGUoYWN0aW9uLnZhbHVlLCB7IGRlbGF5OiBkZWxheSA/PyAwIH0pO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBvazogdHJ1ZSxcclxuICAgICAgICAgIHR5cGU6IFwidHlwZVwiLFxyXG4gICAgICAgICAgc3VtbWFyeTogYFx1NURGMlx1OTAxMFx1OTUyRVx1OEY5M1x1NTE2NVx1RkYwOFx1N0I1Nlx1NzU2NT0ke3N0cmF0ZWd5fSR7dGhpcy5zdGVhbHRoPy5pc0VuYWJsZWQgPyBcIixzdGVhbHRoXHU1RUY2XHU4RkRGXCIgOiBcIlwifVx1RkYwOWAsXHJcbiAgICAgICAgICBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAsXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY2FzZSBcInNlbGVjdFwiOiB7XHJcbiAgICAgICAgY29uc3QgeyBsb2NhdG9yLCBzdHJhdGVneSB9ID0gYXdhaXQgdGhpcy5sb2NhdG9yIS5sb2NhdGUoe1xyXG4gICAgICAgICAgcmVmOiBhY3Rpb24ucmVmLFxyXG4gICAgICAgICAgc2VsZWN0b3I6IGFjdGlvbi5zZWxlY3RvcixcclxuICAgICAgICB9KTtcclxuICAgICAgICBhd2FpdCBsb2NhdG9yLnNlbGVjdE9wdGlvbihhY3Rpb24udmFsdWUpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBvazogdHJ1ZSxcclxuICAgICAgICAgIHR5cGU6IFwic2VsZWN0XCIsXHJcbiAgICAgICAgICBzdW1tYXJ5OiBgXHU1REYyXHU5MDA5XHU2MkU5XHU5MDA5XHU5ODc5XHVGRjA4XHU3QjU2XHU3NTY1PSR7c3RyYXRlZ3l9XHVGRjA5YCxcclxuICAgICAgICAgIGR1cmF0aW9uTXM6IERhdGUubm93KCkgLSB0MCxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjYXNlIFwiZXh0cmFjdFwiOiB7XHJcbiAgICAgICAgY29uc3QgeyBsb2NhdG9yIH0gPSBhd2FpdCB0aGlzLmxvY2F0b3IhLmxvY2F0ZSh7XHJcbiAgICAgICAgICByZWY6IGFjdGlvbi5yZWYsXHJcbiAgICAgICAgICBzZWxlY3RvcjogYWN0aW9uLnNlbGVjdG9yLFxyXG4gICAgICAgICAgdGV4dDogYWN0aW9uLnRleHQsXHJcbiAgICAgICAgICBzZW1hbnRpYzogYWN0aW9uLnNlbWFudGljLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBsb2NhdG9yLmV2YWx1YXRlKChlbCkgPT4ge1xyXG4gICAgICAgICAgY29uc3QgY2xvbmUgPSBlbC5jbG9uZU5vZGUodHJ1ZSkgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICBjb25zdCB0ZXh0ID0gKGNsb25lLmlubmVyVGV4dCB8fCBjbG9uZS50ZXh0Q29udGVudCB8fCBcIlwiKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCk7XHJcbiAgICAgICAgICByZXR1cm4geyB0ZXh0OiB0ZXh0LnNsaWNlKDAsIDIwMDApIH07XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHR5cGU6IFwiZXh0cmFjdFwiLCBzdW1tYXJ5OiBcIlx1NjNEMFx1NTNENlx1NUI4Q1x1NjIxMFwiLCBkYXRhLCBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY2FzZSBcImFzc2VydFwiOiB7XHJcbiAgICAgICAgY29uc3QgeyBsb2NhdG9yIH0gPSBhd2FpdCB0aGlzLmxvY2F0b3IhLmxvY2F0ZSh7XHJcbiAgICAgICAgICByZWY6IGFjdGlvbi5yZWYsXHJcbiAgICAgICAgICBzZWxlY3RvcjogYWN0aW9uLnNlbGVjdG9yLFxyXG4gICAgICAgICAgdGV4dDogYWN0aW9uLnRleHQsXHJcbiAgICAgICAgICBzZW1hbnRpYzogYWN0aW9uLnNlbWFudGljLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IGNvdW50ID0gYXdhaXQgbG9jYXRvci5jb3VudCgpO1xyXG4gICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xyXG4gICAgICAgICAgcmV0dXJuIHsgb2s6IGZhbHNlLCB0eXBlOiBcImFzc2VydFwiLCBzdW1tYXJ5OiBgXHU2NUFEXHU4QTAwXHU1OTMxXHU4RDI1XHVGRjFBXHU2NzJBXHU2MjdFXHU1MjMwXHU3NkVFXHU2ODA3XHU1MTQzXHU3RDIwYCwgZHVyYXRpb25NczogRGF0ZS5ub3coKSAtIHQwIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGVsID0gbG9jYXRvci5maXJzdCgpO1xyXG4gICAgICAgIGNvbnN0IHZpc2libGUgPSBhd2FpdCBlbC5pc1Zpc2libGUoKS5jYXRjaCgoKSA9PiBmYWxzZSk7XHJcbiAgICAgICAgY29uc3QgdGV4dCA9IChhd2FpdCBlbC5pbm5lclRleHQoKS5jYXRjaCgoKSA9PiBcIlwiKSkgfHwgXCJcIjtcclxuICAgICAgICBsZXQgcGFzcyA9IHRydWU7XHJcbiAgICAgICAgbGV0IGRldGFpbCA9IFwiXCI7XHJcbiAgICAgICAgc3dpdGNoIChhY3Rpb24ubW9kZSkge1xyXG4gICAgICAgICAgY2FzZSBcInZpc2libGVcIjpcclxuICAgICAgICAgICAgcGFzcyA9IHZpc2libGU7XHJcbiAgICAgICAgICAgIGRldGFpbCA9IGBcdTUzRUZcdTg5QzE9JHt2aXNpYmxlfWA7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSBcImV4aXN0c1wiOlxyXG4gICAgICAgICAgICBwYXNzID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlIFwiaGlkZGVuXCI6XHJcbiAgICAgICAgICAgIHBhc3MgPSAhdmlzaWJsZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlIFwidGV4dC1jb250YWluc1wiOlxyXG4gICAgICAgICAgICBwYXNzID0gYWN0aW9uLmV4cGVjdGVkID8gdGV4dC5pbmNsdWRlcyhhY3Rpb24uZXhwZWN0ZWQpIDogZmFsc2U7XHJcbiAgICAgICAgICAgIGRldGFpbCA9IGBcdTY1ODdcdTY3MkNcdTUzMDVcdTU0MkInJHthY3Rpb24uZXhwZWN0ZWR9Jz0ke3Bhc3N9IFx1NUI5RVx1OTY0NT0nJHt0ZXh0LnNsaWNlKDAsIDUwKX0nYDtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlIFwiZW5hYmxlZFwiOlxyXG4gICAgICAgICAgICBwYXNzID0gYXdhaXQgZWwuaXNFbmFibGVkKCkuY2F0Y2goKCkgPT4gZmFsc2UpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIHBhc3MgPSB2aXNpYmxlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgb2s6IHBhc3MsXHJcbiAgICAgICAgICB0eXBlOiBcImFzc2VydFwiLFxyXG4gICAgICAgICAgc3VtbWFyeTogYFx1NjVBRFx1OEEwMCR7cGFzcyA/IFwiXHU5MDFBXHU4RkM3XCIgOiBcIlx1NTkzMVx1OEQyNVwifTogJHthY3Rpb24ubW9kZX0gJHtkZXRhaWx9YCxcclxuICAgICAgICAgIGR1cmF0aW9uTXM6IERhdGUubm93KCkgLSB0MCxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjYXNlIFwic2NyZWVuc2hvdFwiOiB7XHJcbiAgICAgICAgLy8gYW5pbWF0aW9ucy9jYXJldCBcdTc5ODFcdTc1MjhcdUZGMUFcdTgxRUFcdTUyQThcdTUzMTZcdTYyMkFcdTU2RkVcdTY4MDdcdTUxQzZcdTUwNUFcdTZDRDVcdUZGMENcdTkwN0ZcdTUxNERcdTUyQThcdTc1M0IvXHU1MTQ5XHU2ODA3XHU1QkZDXHU4MUY0XHU2MjJBXHU1NkZFXHU0RTAwXHU3NkY0XHUyMDFDXHU3QjQ5XHU1Rjg1XHU2RTMyXHU2N0QzXHU1QjhDXHU2MjEwXHUyMDFEXHJcbiAgICAgICAgY29uc3Qgc25hcE9wdHMgPSB7IGNsaXA6IGFjdGlvbi5jbGlwLCBhbmltYXRpb25zOiBcImRpc2FibGVkXCIgYXMgY29uc3QsIGNhcmV0OiBcImhpZGVcIiBhcyBjb25zdCB9O1xyXG4gICAgICAgIGNvbnN0IGJ1ZiA9IGFjdGlvbi5mdWxsUGFnZVxyXG4gICAgICAgICAgPyBhd2FpdCB0aGlzLnBhZ2Uuc2NyZWVuc2hvdCh7IGZ1bGxQYWdlOiB0cnVlLCAuLi5zbmFwT3B0cyB9KVxyXG4gICAgICAgICAgOiBhd2FpdCB0aGlzLnBhZ2Uuc2NyZWVuc2hvdChzbmFwT3B0cyk7XHJcbiAgICAgICAgY29uc3QgYmFzZTY0ID0gYnVmLnRvU3RyaW5nKFwiYmFzZTY0XCIpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBvazogdHJ1ZSxcclxuICAgICAgICAgIHR5cGU6IFwic2NyZWVuc2hvdFwiLFxyXG4gICAgICAgICAgc3VtbWFyeTogYFx1NURGMlx1NjIyQVx1NTZGRSAoJHsoYmFzZTY0Lmxlbmd0aCAqIDAuNzUpIC8gMTAyNH1LQiwgJHtiYXNlNjQubGVuZ3RofSBiNjQpYCxcclxuICAgICAgICAgIGRhdGE6IHsgYmFzZTY0IH0sXHJcbiAgICAgICAgICBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAsXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY2FzZSBcImhvdmVyXCI6IHtcclxuICAgICAgICBjb25zdCB7IGxvY2F0b3IgfSA9IGF3YWl0IHRoaXMubG9jYXRvciEubG9jYXRlKHsgcmVmOiBhY3Rpb24ucmVmLCBzZWxlY3RvcjogYWN0aW9uLnNlbGVjdG9yIH0pO1xyXG4gICAgICAgIGF3YWl0IGxvY2F0b3IuaG92ZXIoKTtcclxuICAgICAgICByZXR1cm4geyBvazogdHJ1ZSwgdHlwZTogXCJob3ZlclwiLCBzdW1tYXJ5OiBcIlx1NURGMlx1NjBBQ1x1NTA1Q1wiLCBkdXJhdGlvbk1zOiBEYXRlLm5vdygpIC0gdDAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY2FzZSBcInNjcm9sbFwiOiB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5wYWdlLm1vdXNlLndoZWVsKDAsIChhY3Rpb24gYXMgYW55KS5kZWx0YVkgPz8gNjAwKTtcclxuICAgICAgICByZXR1cm4geyBvazogdHJ1ZSwgdHlwZTogXCJzY3JvbGxcIiwgc3VtbWFyeTogXCJcdTVERjJcdTZFREFcdTUyQThcIiwgZHVyYXRpb25NczogRGF0ZS5ub3coKSAtIHQwIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNhc2UgXCJ3YWl0XCI6IHtcclxuICAgICAgICBhd2FpdCB0aGlzLnBhZ2Uud2FpdEZvclRpbWVvdXQoKGFjdGlvbiBhcyBhbnkpLm1zID8/IDEwMDApO1xyXG4gICAgICAgIHJldHVybiB7IG9rOiB0cnVlLCB0eXBlOiBcIndhaXRcIiwgc3VtbWFyeTogXCJcdTVERjJcdTdCNDlcdTVGODVcIiwgZHVyYXRpb25NczogRGF0ZS5ub3coKSAtIHQwIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNhc2UgXCJldmFsdWF0ZVwiOiB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wYWdlLmV2YWx1YXRlKChhY3Rpb24gYXMgYW55KS5zY3JpcHQgYXMgc3RyaW5nKTtcclxuICAgICAgICByZXR1cm4geyBvazogdHJ1ZSwgdHlwZTogXCJldmFsdWF0ZVwiLCBzdW1tYXJ5OiBcIkpTIFx1NjI2N1x1ODg0Q1x1NUI4Q1x1NjIxMFwiLCBkYXRhOiByZXN1bHQsIGR1cmF0aW9uTXM6IERhdGUubm93KCkgLSB0MCB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjYXNlIFwicHJlc3NcIjoge1xyXG4gICAgICAgIGF3YWl0IHRoaXMucGFnZS5rZXlib2FyZC5wcmVzcygoYWN0aW9uIGFzIGFueSkua2V5ID8/IFwiRW50ZXJcIik7XHJcbiAgICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHR5cGU6IFwicHJlc3NcIiwgc3VtbWFyeTogYFx1NURGMlx1NjMwOVx1OTUyRSAkeyhhY3Rpb24gYXMgYW55KS5rZXl9YCwgZHVyYXRpb25NczogRGF0ZS5ub3coKSAtIHQwIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGRlZmF1bHQ6IHtcclxuICAgICAgICBjb25zdCBhID0gYWN0aW9uIGFzIGFueTtcclxuICAgICAgICByZXR1cm4geyBvazogZmFsc2UsIHR5cGU6IGEudHlwZSwgc3VtbWFyeTogYFx1NEUwRFx1NjUyRlx1NjMwMVx1NzY4NCBhY3Rpb246ICR7YS50eXBlfWAsIGR1cmF0aW9uTXM6IERhdGUubm93KCkgLSB0MCB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyBzbmFwc2hvdChvcHRpb25zPzogU25hcHNob3RPcHRpb25zKTogUHJvbWlzZTxQYWdlU25hcHNob3Q+IHtcclxuICAgIHJldHVybiB0aGlzLnNuYXBzaG90QnVpbGRlciEuYnVpbGQob3B0aW9ucyk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBkaWFnbm9zZSgpOiBQcm9taXNlPERpYWdub3N0aWNSZXBvcnQ+IHtcclxuICAgIGNvbnN0IGNvbGxlY3RvcnMgPSB0aGlzLmRpYWdub3N0aWNzIS5jb2xsZWN0b3JzKCk7XHJcbiAgICBjb25zdCBjb2xsZWN0ZWQgPSBhd2FpdCBQcm9taXNlLmFsbChcclxuICAgICAgY29sbGVjdG9ycy5tYXAoYXN5bmMgKGMpID0+ICh7IGNhdGVnb3J5OiBjLmNhdGVnb3J5LCByZWZzOiBhd2FpdCBjLmNvbGxlY3QoKSB9KSlcclxuICAgICk7XHJcbiAgICBjb25zdCBieUNhdCA9IChjYXQ6IHN0cmluZykgPT5cclxuICAgICAgY29sbGVjdGVkLmZpbmQoKGMpID0+IGMuY2F0ZWdvcnkgPT09IGNhdCk/LnJlZnMgPz8gW107XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBjb25zb2xlOiBieUNhdChcImNvbnNvbGVcIiksXHJcbiAgICAgIG5ldHdvcms6IGJ5Q2F0KFwibmV0d29ya1wiKSxcclxuICAgICAgZG9tOiBieUNhdChcImRvbVwiKSxcclxuICAgICAgcGVyZm9ybWFuY2U6IGJ5Q2F0KFwicGVyZm9ybWFuY2VcIiksXHJcbiAgICAgIGpzRXhjZXB0aW9uczogYnlDYXQoXCJqcy1leGNlcHRpb25cIiksXHJcbiAgICAgIGFjY2Vzc2liaWxpdHk6IGJ5Q2F0KFwiYWNjZXNzaWJpbGl0eVwiKSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBhc3luYyBjb2xsZWN0Q29uc29sZSgpIHtcclxuICAgIHJldHVybiB0aGlzLmRpYWdub3N0aWNzIS5jb25zb2xlLmNvbGxlY3QoKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGNvbGxlY3ROZXR3b3JrKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3MhLm5ldHdvcmsuY29sbGVjdCgpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZXZhbHVhdGUoc2NyaXB0OiBzdHJpbmcpOiBQcm9taXNlPHVua25vd24+IHtcclxuICAgIHJldHVybiB0aGlzLnBhZ2UhLmV2YWx1YXRlKHNjcmlwdCk7XHJcbiAgfVxyXG59XHJcbiIsICIvKipcbiAqIFx1OEJFRFx1NEU0OVx1NUI5QVx1NEY0RFx1NTY2OFx1RkYxQVx1NjI4QVx1ODFFQVx1NzEzNlx1OEJFRFx1OEEwMFx1NjNDRlx1OEZGMFx1OEY2Q1x1NjIxMFx1N0VEM1x1Njc4NFx1NTMxNlx1NzY4NFx1NUI5QVx1NEY0RFx1NTNDMlx1NjU3MFx1MzAwMlxuICogXHU1MDFGXHU5Mjc0IFN0YWdlaGFuZCBcdTc2ODQgQUkgTG9jYXRvciBcdTRFMEUgQnJvd3Nlci1Vc2UgXHU3Njg0XHU4QkVEXHU0RTQ5XHU1QjlBXHU0RjREXHUzMDAyXG4gKi9cbmltcG9ydCB0eXBlIHsgUGFnZVNuYXBzaG90IH0gZnJvbSBcIkBvcGVubGl1bGFuL2NvcmVcIjtcblxuZXhwb3J0IGludGVyZmFjZSBTZW1hbnRpY0xvY2F0ZVJlc3VsdCB7XG4gIC8qKiBcdTU0N0RcdTRFMkRcdTc2ODRcdTVGRUJcdTcxNjdcdTVGMTVcdTc1MjggKi9cbiAgcmVmPzogc3RyaW5nO1xuICAvKiogXHU1NDdEXHU0RTJEXHU3Njg0XHU2NTg3XHU2NzJDICovXG4gIHRleHQ/OiBzdHJpbmc7XG4gIC8qKiBDU1MgXHU5MDA5XHU2MkU5XHU1NjY4XHVGRjA4XHU4MkU1XHU1M0VGXHU3NTI4XHVGRjA5ICovXG4gIHNlbGVjdG9yPzogc3RyaW5nO1xuICAvKiogXHU1NDdEXHU0RTJEXHU1MjA2XHU2NTcwICovXG4gIHNjb3JlOiBudW1iZXI7XG4gIC8qKiBcdThCRjRcdTY2MEUgKi9cbiAgbm90ZTogc3RyaW5nO1xufVxuXG5jb25zdCBJR05PUkVfV09SRFMgPSBuZXcgU2V0KFtcIlx1OEJGN1wiLCBcIlx1NzBCOVx1NTFGQlwiLCBcIlx1OEY5M1x1NTE2NVwiLCBcIlx1OTAwOVx1NjJFOVwiLCBcIlx1NjI3RVx1NTIzMFwiLCBcIlx1OTBBM1x1NEUyQVwiLCBcIlx1OEZEOVx1NEUyQVwiLCBcIlx1NzY4NFwiLCBcIlx1NjMwOVx1OTRBRVwiLCBcIlx1OTRGRVx1NjNBNVwiLCBcInRoZVwiLCBcImNsaWNrXCIsIFwiYnV0dG9uXCIsIFwibGlua1wiLCBcInBsZWFzZVwiXSk7XG5cbi8qKiBcdTRFQ0VcdTVGRUJcdTcxNjdcdTc2ODRcdTUzRUZcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTRFMkRcdUZGMENcdTYzMDlcdThCRURcdTRFNDlcdTc2RjhcdTRGM0NcdTVFQTZcdTY3RTVcdTYyN0VcdTY3MDBcdTRGNzNcdTc2RUVcdTY4MDcgKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2NhdGVCeVNlbWFudGljKHNuYXBzaG90OiBQYWdlU25hcHNob3QsIHNlbWFudGljOiBzdHJpbmcpOiBTZW1hbnRpY0xvY2F0ZVJlc3VsdCB7XG4gIGNvbnN0IHEgPSBub3JtYWxpemUoc2VtYW50aWMpO1xuICAvLyBcdTRFMkRcdTY1ODdcdTY1RTBcdTdBN0FcdTY4M0NcdTUyMDZcdThCQ0RcdUZGMUFcdTYyOEEgQ0pLIFx1OEZERVx1N0VFRFx1NEUzMlx1NjJDNlx1NjIxMFx1NTM1NVx1NEUyQVx1NkM0OVx1NUI1N1x1NTNDMlx1NEUwRVx1NTMzOVx1OTE0RFx1RkYxQlx1ODJGMVx1NjU4Ny9cdTY1NzBcdTVCNTdcdTYzMDlcdTdBN0FcdTY4M0NcdTUyMDZcdThCQ0RcbiAgY29uc3QgcVRva2VucyA9IHRva2VuaXplKHEpO1xuXG4gIGxldCBiZXN0OiBTZW1hbnRpY0xvY2F0ZVJlc3VsdCA9IHsgc2NvcmU6IDAsIG5vdGU6IFwiXHU2NzJBXHU2MjdFXHU1MjMwXHU1MzM5XHU5MTREXCIgfTtcblxuICBmb3IgKGNvbnN0IGVsIG9mIHNuYXBzaG90LmludGVyYWN0aXZlKSB7XG4gICAgY29uc3QgdGFyZ2V0VGV4dCA9IG5vcm1hbGl6ZShlbC50ZXh0KTtcbiAgICAvLyBcdTc2RjRcdTYzQTVcdTUzMDVcdTU0MkJcbiAgICBpZiAodGFyZ2V0VGV4dCAmJiB0YXJnZXRUZXh0LmluY2x1ZGVzKHEpKSB7XG4gICAgICBjb25zdCBzY29yZSA9IDEwMCArIHEubGVuZ3RoO1xuICAgICAgaWYgKHNjb3JlID4gYmVzdC5zY29yZSkgYmVzdCA9IHsgcmVmOiBlbC5yZWYsIHRleHQ6IGVsLnRleHQsIHNlbGVjdG9yOiBlbC5zZWxlY3Rvciwgc2NvcmUsIG5vdGU6IFwiXHU2NTg3XHU2NzJDXHU1MzA1XHU1NDJCXHU1MzM5XHU5MTREXCIgfTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICAvLyBcdThCQ0RcdTUxNDNcdTkxQ0RcdTUzRTBcdUZGMDhcdTgyRjFcdTY1ODdcdTYzMDlcdThCQ0RcdTMwMDFcdTRFMkRcdTY1ODdcdTYzMDlcdTVCNTdcdUZGMDlcbiAgICBjb25zdCB0YXJnZXRUb2tlbnMgPSB0b2tlbml6ZSh0YXJnZXRUZXh0KTtcbiAgICBjb25zdCBtZWFuaW5nZnVsUSA9IHFUb2tlbnMuZmlsdGVyKGlzTWVhbmluZ2Z1bCk7XG4gICAgY29uc3QgbWVhbmluZ2Z1bFRhcmdldCA9IHRhcmdldFRva2Vucy5maWx0ZXIoaXNNZWFuaW5nZnVsKTtcbiAgICBpZiAoIW1lYW5pbmdmdWxUYXJnZXQubGVuZ3RoKSBjb250aW51ZTtcbiAgICBjb25zdCBvdmVybGFwID0gbWVhbmluZ2Z1bFEuZmlsdGVyKCh3KSA9PiBtZWFuaW5nZnVsVGFyZ2V0LmluY2x1ZGVzKHcpKS5sZW5ndGg7XG4gICAgY29uc3Qgc2NvcmUgPSBNYXRoLnJvdW5kKChvdmVybGFwIC8gTWF0aC5tYXgobWVhbmluZ2Z1bFEubGVuZ3RoLCAxKSkgKiAxMDApO1xuICAgIGlmIChzY29yZSA+IDAgJiYgc2NvcmUgPiBiZXN0LnNjb3JlKSB7XG4gICAgICBiZXN0ID0geyByZWY6IGVsLnJlZiwgdGV4dDogZWwudGV4dCwgc2VsZWN0b3I6IGVsLnNlbGVjdG9yLCBzY29yZSwgbm90ZTogXCJcdThCQ0RcdTUxNDNcdTkxQ0RcdTUzRTBcdTUzMzlcdTkxNERcIiB9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gYmVzdDtcbn1cblxuLyoqIFx1NTIwNlx1OEJDRFx1RkYxQVx1ODJGMVx1NjU4N1x1NjMwOVx1N0E3QVx1NzY3RFx1NTIwN1x1NTIwNlx1RkYwQ1x1NEUyRFx1NjU4NyBDSksgXHU2MzA5XHU1MzU1XHU0RTJBXHU1QjU3XHU3QjI2XHU1MjA3XHU1MjA2ICovXG5mdW5jdGlvbiB0b2tlbml6ZShzOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHRva2Vuczogc3RyaW5nW10gPSBbXTtcbiAgLy8gXHU2M0QwXHU1M0Q2XHU4MkYxXHU2NTg3XHU1MzU1XHU4QkNEXHU1NDhDXHU2NTcwXHU1QjU3XG4gIGZvciAoY29uc3QgbSBvZiBzLm1hdGNoQWxsKC9bYS16MC05XSsvZ2kpKSB0b2tlbnMucHVzaChtWzBdKTtcbiAgLy8gXHU2M0QwXHU1M0Q2XHU4RkRFXHU3RUVEIENKSyBcdTVCNTdcdTdCMjZcdTRFMzJcdUZGMENcdTkwMTBcdTVCNTdcdTYyQzZcdTUyMDZcbiAgZm9yIChjb25zdCBtIG9mIHMubWF0Y2hBbGwoL1tcXHU0ZTAwLVxcdTlmZmZdKy9nKSkge1xuICAgIGZvciAoY29uc3QgY2ggb2YgbVswXSkgdG9rZW5zLnB1c2goY2gpO1xuICB9XG4gIHJldHVybiB0b2tlbnM7XG59XG5cbi8qKiBcdTY3MDlcdTYxMEZcdTRFNDlcdThCQ0RcdTUxNDNcdUZGMUFcdTk3NUVcdTVGRkRcdTc1NjVcdThCQ0RcdUZGMENcdTRFMTRcdUZGMDhDSksgXHU1MzU1XHU1QjU3XHU2MjE2XHU5NTdGXHU1RUE2PjEgXHU3Njg0XHU4MkYxXHU2NTg3L1x1NjU3MFx1NUI1N1x1RkYwOSAqL1xuZnVuY3Rpb24gaXNNZWFuaW5nZnVsKHc6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAoSUdOT1JFX1dPUkRTLmhhcyh3KSkgcmV0dXJuIGZhbHNlO1xuICAvLyBDSksgXHU1MzU1XHU1QjU3XHVGRjA4XHU5NTdGXHU1RUE2IDEgXHU0RTE0XHU0RTNBXHU2QzQ5XHU1QjU3XHVGRjA5XHU0RkREXHU3NTU5XG4gIGlmICgvXltcXHU0ZTAwLVxcdTlmZmZdJC8udGVzdCh3KSkgcmV0dXJuIHRydWU7XG4gIHJldHVybiB3Lmxlbmd0aCA+IDE7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZShzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcy50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1tcdUZGMENcdTMwMDJcdUZGMDFcdUZGMUZcdTMwMDFcdUZGMUJcdUZGMUFcIlwiJydcdUZGMDhcdUZGMDkoKV0vZywgXCIgXCIpLnRyaW0oKTtcbn1cblxuLyoqIFx1OEY4NVx1NTJBOVx1RkYxQVx1Njc4NFx1OTAyMFx1NUUyNlx1OEJFRFx1NEU0OVx1NzY4NCBjbGljayBcdTUyQThcdTRGNUNcdTUzQzJcdTY1NzAgKi9cbmV4cG9ydCBmdW5jdGlvbiBzZW1hbnRpY1RvTG9jYXRlUGFyYW1zKHJlc3VsdDogU2VtYW50aWNMb2NhdGVSZXN1bHQpIHtcbiAgcmV0dXJuIHtcbiAgICByZWY6IHJlc3VsdC5yZWYsXG4gICAgdGV4dDogcmVzdWx0LnRleHQsXG4gICAgc2VsZWN0b3I6IHJlc3VsdC5zZWxlY3RvcixcbiAgfTtcbn1cbiIsICIvKipcclxuICogQG9wZW5saXVsYW4vc3RlYWx0aCBcdTIwMTRcdTIwMTQgXHU5NjMyXHU2OEMwXHU2RDRCXHU2QTIxXHU1NzU3XHVGRjA4QW50aS1EZXRlY3Rpb24gLyBTdGVhbHRoXHVGRjA5XHJcbiAqXHJcbiAqIFx1NzZFRVx1NjgwN1x1NzUyOFx1NjIzN1x1RkYxQVx1ODNCN1x1NTNENlx1NTE2Q1x1NUYwMFx1NjU3MFx1NjM2RVx1NzY4NFx1NzUyOFx1NjIzN1x1RkYwOFx1NzIyQ1x1NTNENi9cdTkxQzdcdTk2QzZcdUZGMDlcdUZGMENcdTkwN0ZcdTUxNERcdTg4QUJcdTc2RUVcdTY4MDdcdTdBRDlcdTcwQjlcdTUyMjRcdTVCOUFcdTRFM0FcdTcyMkNcdTg2NkJcdTgwMENcdTk2NTBcdTkwMUYvXHU1QzAxXHU3OTgxXHUzMDAyXHJcbiAqXHJcbiAqIFx1ODBGRFx1NTI5Qlx1NTIwNlx1NUM0Mlx1RkYxQVxyXG4gKiAtICoqXHU1M0NEXHU2MzA3XHU3RUI5XHU2Q0U4XHU1MTY1KipcdUZGMDhpbml0U2NyaXB0XHVGRjA5XHVGRjFBXHU5NjkwXHU4NUNGIHdlYmRyaXZlciBcdTY4MDdcdTVGRDdcdTMwMDFcdTRGMkFcdTg4QzVcdTYzRDJcdTRFRjYvXHU4QkVEXHU4QTAwL1x1Njc0M1x1OTY1MFx1N0I0OVx1NjMwN1x1N0VCOVx1RkYxQlxyXG4gKiAtICoqXHU1NDJGXHU1MkE4XHU1M0MyXHU2NTcwKipcdUZGMUFcdTk2NDRcdTUyQTAgQ2hyb21lIFx1NTQyRlx1NTJBOFx1NTNDMlx1NjU3MFx1RkYwOFx1Nzk4MVx1NzUyOFx1ODFFQVx1NTJBOFx1NTMxNlx1NjNBN1x1NTIzNlx1MzAwMVx1Nzk4MVx1NzUyOFx1ODRERFx1NzI1OS9cdTlFRDhcdThCQTRcdTZENEZcdTg5QzhcdTU2NjhcdTY4QzBcdTY3RTVcdTdCNDlcdUZGMDlcdUZGMUJcclxuICogLSAqKlx1NEVCQVx1N0M3Qlx1ODg0Q1x1NEUzQVx1NkEyMVx1NjJERioqXHVGRjFBXHU5RjIwXHU2ODA3XHU3OUZCXHU1MkE4XHU4RjY4XHU4RkY5XHUzMDAxXHU4RjkzXHU1MTY1XHU1RUY2XHU4RkRGXHUzMDAxXHU2RURBXHU1MkE4XHU5NjhGXHU2NzNBXHU1MzE2XHVGRjA4XHU4QkE5XHU0RUJBXHU1REU1XHU2NENEXHU0RjVDXHU3Mjc5XHU1RjgxXHU0RTBEXHU1M0VGXHU4RkE4XHU4QkM2XHVGRjA5XHVGRjFCXHJcbiAqIC0gKipVc2VyLUFnZW50IFx1N0I1Nlx1NzU2NSoqXHVGRjFBXHU1M0VGXHU5MTREXHU3RjZFXHU3NzFGXHU1QjlFXHU2RDRGXHU4OUM4XHU1NjY4IFVBXHVGRjBDXHU4MUVBXHU1MkE4XHU4RjZFXHU2MzYyXHUzMDAyXHJcbiAqXHJcbiAqIFx1OEJCRVx1OEJBMVx1NTM5Rlx1NTIxOVx1RkYxQVxyXG4gKiAtIFx1N0VBRiBKUyBcdTZDRThcdTUxNjVcdTRFM0FcdTRFM0JcdUZGMDhcdTRFMERcdTRGOURcdThENTYgcHVwcGV0ZWVyLWV4dHJhIFx1N0I0OVx1OTFDRFx1NTc4Qlx1NUU5M1x1RkYwOVx1RkYwQ1x1OTZGNlx1NTkxNlx1OTBFOFx1NEY5RFx1OEQ1Nlx1NTM3M1x1NTNFRlx1NURFNVx1NEY1Q1x1RkYxQlxyXG4gKiAtIFx1NTNFRlx1OTAwOVx1NjJFOVx1NjAyN1x1NTQyRlx1NzUyOFx1RkYwOHN0ZWFsdGggXHU5RUQ4XHU4QkE0XHU1MTczXHU5NUVEXHVGRjBDXHU0RUM1XHU1NzI4XHU3NTI4XHU2MjM3XHU1OEYwXHU2NjBFXHU5NzAwXHU4OTgxXHU2NUY2XHU1RjAwXHU1NDJGXHVGRjBDXHU5MDdGXHU1MTREXHU2NUUwXHU4QzEzXHU0RkI1XHU1MTY1XHVGRjA5XHVGRjFCXHJcbiAqIC0gXHU0RTBFXHU3M0IwXHU2NzA5IFBsYXl3cmlnaHRFbmdpbmUgXHU2NUUwXHU3RjFEXHU5NkM2XHU2MjEwXHVGRjFBXHU5MDFBXHU4RkM3IGBpbml0U2NyaXB0YCBcdTZDRThcdTUxNjUgKyBgbGF1bmNoT3B0aW9uc2AgXHU3NTFGXHU2NTQ4XHUzMDAyXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFN0ZWFsdGggXHU5MTREXHU3RjZFXHU5ODc5XHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFN0ZWFsdGhPcHRpb25zIHtcclxuICAvKiogXHU2NjJGXHU1NDI2XHU1NDJGXHU3NTI4IHN0ZWFsdGhcdUZGMDhcdTlFRDhcdThCQTQgZmFsc2UgXHUyMDE0XHUyMDE0IFx1NEVDNVx1NTcyOFx1NzUyOFx1NjIzN1x1NjYwRVx1Nzg2RVx1ODk4MVx1NkM0Mlx1NjVGNlx1NUYwMFx1NTQyRlx1RkYwOSAqL1xyXG4gIGVuYWJsZWQ/OiBib29sZWFuO1xyXG4gIC8qKiBcdTUzQ0RcdTYzMDdcdTdFQjlcdTZDRThcdTUxNjVcdTdFQTdcdTUyMkJcdUZGMUFiYXNpYz1cdTk2OTBcdTg1Q0Ygd2ViZHJpdmVyXHVGRjFCZnVsbD1cdTVCOENcdTY1NzRcdTUzQ0RcdTYzMDdcdTdFQjlcdUZGMDhcdTlFRDhcdThCQTQgYmFzaWNcdUZGMDkgKi9cclxuICBsZXZlbD86IFwiYmFzaWNcIiB8IFwiZnVsbFwiO1xyXG4gIC8qKiBcdTc1MjhcdTYyMzdcdTRFRTNcdTc0MDZcdUZGMDhcdTc1NTlcdTdBN0FcdTUyMTlcdTRFMERcdTg5ODZcdTc2RDYgVUFcdUZGMENcdTRGN0ZcdTc1MjhcdTZENEZcdTg5QzhcdTU2NjhcdTlFRDhcdThCQTRcdUZGMDkgKi9cclxuICB1c2VyQWdlbnQ/OiBzdHJpbmc7XHJcbiAgLyoqIFx1NEVCQVx1N0M3Qlx1ODg0Q1x1NEUzQVx1NkEyMVx1NjJERlx1RkYxQVx1OEY5M1x1NTE2NVx1NUVGNlx1OEZERlx1NTMzQVx1OTVGNCBbbWluLCBtYXhdIG1zXHVGRjA4XHU5RUQ4XHU4QkE0IFszMCwgOTBdXHVGRjA5ICovXHJcbiAgaHVtYW5UeXBpbmdEZWxheT86IFtudW1iZXIsIG51bWJlcl07XHJcbiAgLyoqIFx1NEVCQVx1N0M3Qlx1ODg0Q1x1NEUzQVx1NkEyMVx1NjJERlx1RkYxQVx1NTJBOFx1NEY1Q1x1OTVGNFx1OTY4Rlx1NjczQVx1OTVGNFx1OTY5NCBbbWluLCBtYXhdIG1zXHVGRjA4XHU5RUQ4XHU4QkE0IFsyMDAsIDYwMF1cdUZGMDkgKi9cclxuICBodW1hbkFjdGlvbkRlbGF5PzogW251bWJlciwgbnVtYmVyXTtcclxuICAvKiogXHU5RjIwXHU2ODA3XHU3OUZCXHU1MkE4XHU2NjJGXHU1NDI2XHU2QTIxXHU2MkRGXHU0RUJBXHU3QzdCXHU4RjY4XHU4RkY5XHVGRjA4XHU5RUQ4XHU4QkE0IHRydWVcdUZGMDkgKi9cclxuICBodW1hbk1vdXNlVHJhamVjdG9yeT86IGJvb2xlYW47XHJcbiAgLyoqIFx1OTg5RFx1NTkxNlx1ODFFQVx1NUI5QVx1NEU0OVx1NTQyRlx1NTJBOFx1NTNDMlx1NjU3MCAqL1xyXG4gIGV4dHJhQXJncz86IHN0cmluZ1tdO1xyXG59XHJcblxyXG4vKiogXHU5RUQ4XHU4QkE0XHU5MTREXHU3RjZFICovXHJcbmNvbnN0IERFRkFVTFRTOiBSZXF1aXJlZDxQaWNrPFN0ZWFsdGhPcHRpb25zLCBcImxldmVsXCIgfCBcImh1bWFuVHlwaW5nRGVsYXlcIiB8IFwiaHVtYW5BY3Rpb25EZWxheVwiIHwgXCJodW1hbk1vdXNlVHJhamVjdG9yeVwiPj4gJiBQaWNrPFN0ZWFsdGhPcHRpb25zLCBcInVzZXJBZ2VudFwiIHwgXCJleHRyYUFyZ3NcIj4gPSB7XHJcbiAgbGV2ZWw6IFwiYmFzaWNcIixcclxuICBodW1hblR5cGluZ0RlbGF5OiBbMzAsIDkwXSxcclxuICBodW1hbkFjdGlvbkRlbGF5OiBbMjAwLCA2MDBdLFxyXG4gIGh1bWFuTW91c2VUcmFqZWN0b3J5OiB0cnVlLFxyXG4gIHVzZXJBZ2VudDogdW5kZWZpbmVkLFxyXG4gIGV4dHJhQXJnczogW10sXHJcbn07XHJcblxyXG4vKipcclxuICogU3RlYWx0aE1hbmFnZXIgXHUyMDE0XHUyMDE0IFx1OTYzMlx1NjhDMFx1NkQ0Qlx1NkEyMVx1NTc1N1x1NTE2NVx1NTNFM1xyXG4gKlxyXG4gKiBcdTYzRDBcdTRGOUJcdUZGMUFcclxuICogLSBgYnVpbGRMYXVuY2hPcHRpb25zKClgICBcdTIxOTIgXHU2RDRGXHU4OUM4XHU1NjY4XHU1NDJGXHU1MkE4XHU1M0MyXHU2NTcwXHVGRjA4XHU1NDJCXHU1M0NEXHU4MUVBXHU1MkE4XHU1MzE2IGZsYWdzXHVGRjA5XHJcbiAqIC0gYGJ1aWxkSW5pdFNjcmlwdCgpYCAgICAgXHUyMTkyIFx1NTNDRFx1NjMwN1x1N0VCOVx1NkNFOFx1NTE2NVx1ODExQVx1NjcyQ1x1RkYwOFx1NTcyOFx1OTg3NVx1OTc2Mlx1NTIxQlx1NUVGQVx1NTI0RFx1NkNFOFx1NTE2NVx1RkYwOVxyXG4gKiAtIGBodW1hbml6ZSgpYCAgICAgICAgICAgIFx1MjE5MiBcdTRFQkFcdTdDN0JcdTg4NENcdTRFM0FcdTZBMjFcdTYyREZcdTg4QzVcdTk5NzBcdTU2NjhcdUZGMDhcdTc1MjhcdTRFOEVcdTUyQThcdTRGNUNcdTYyNjdcdTg4NENcdUZGMDlcclxuICovXHJcbmV4cG9ydCBjbGFzcyBTdGVhbHRoTWFuYWdlciB7XHJcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVxdWlyZWQ8T21pdDxTdGVhbHRoT3B0aW9ucywgXCJ1c2VyQWdlbnRcIiB8IFwiZXh0cmFBcmdzXCI+PiAmIFBpY2s8U3RlYWx0aE9wdGlvbnMsIFwidXNlckFnZW50XCIgfCBcImV4dHJhQXJnc1wiPjtcclxuXHJcbiAgY29uc3RydWN0b3Iob3B0aW9uczogU3RlYWx0aE9wdGlvbnMgPSB7fSkge1xyXG4gICAgdGhpcy5vcHRpb25zID0ge1xyXG4gICAgICBlbmFibGVkOiBvcHRpb25zLmVuYWJsZWQgPz8gZmFsc2UsXHJcbiAgICAgIGxldmVsOiBvcHRpb25zLmxldmVsID8/IERFRkFVTFRTLmxldmVsLFxyXG4gICAgICB1c2VyQWdlbnQ6IG9wdGlvbnMudXNlckFnZW50ID8/IERFRkFVTFRTLnVzZXJBZ2VudCxcclxuICAgICAgaHVtYW5UeXBpbmdEZWxheTogb3B0aW9ucy5odW1hblR5cGluZ0RlbGF5ID8/IERFRkFVTFRTLmh1bWFuVHlwaW5nRGVsYXksXHJcbiAgICAgIGh1bWFuQWN0aW9uRGVsYXk6IG9wdGlvbnMuaHVtYW5BY3Rpb25EZWxheSA/PyBERUZBVUxUUy5odW1hbkFjdGlvbkRlbGF5LFxyXG4gICAgICBodW1hbk1vdXNlVHJhamVjdG9yeTogb3B0aW9ucy5odW1hbk1vdXNlVHJhamVjdG9yeSA/PyBERUZBVUxUUy5odW1hbk1vdXNlVHJhamVjdG9yeSxcclxuICAgICAgZXh0cmFBcmdzOiBvcHRpb25zLmV4dHJhQXJncyA/PyBERUZBVUxUUy5leHRyYUFyZ3MsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NTQyRlx1NzUyOCAqL1xyXG4gIGdldCBpc0VuYWJsZWQoKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmVuYWJsZWQ7XHJcbiAgfVxyXG5cclxuICAvKiogXHU2RDRGXHU4OUM4XHU1NjY4XHU1NDJGXHU1MkE4XHU1M0MyXHU2NTcwXHVGRjA4XHU0RUM1XHU1RjUzXHU1NDJGXHU3NTI4XHU2NUY2XHU4RkQ0XHU1NkRFXHVGRjBDXHU1NDI2XHU1MjE5XHU4RkQ0XHU1NkRFXHU3QTdBXHU2NTcwXHU3RUM0XHVGRjBDXHU0RkREXHU2MzAxXHU5RUQ4XHU4QkE0XHU1RTcyXHU1MUMwXHVGRjA5ICovXHJcbiAgYnVpbGRMYXVuY2hBcmdzKCk6IHN0cmluZ1tdIHtcclxuICAgIGlmICghdGhpcy5vcHRpb25zLmVuYWJsZWQpIHJldHVybiBbXTtcclxuICAgIGNvbnN0IGFyZ3MgPSBbXHJcbiAgICAgIC8vIFx1Nzk4MVx1NzUyOFx1ODFFQVx1NTJBOFx1NTMxNlx1NjNBN1x1NTIzNlx1NjgwN1x1NUZEN1x1RkYwOFx1OEZEOVx1NjYyRlx1NjcwMFx1OTFDRFx1ODk4MVx1NzY4NFx1NTNDRFx1NjhDMFx1NkQ0Qlx1NzBCOVx1RkYwOVxyXG4gICAgICBcIi0tZGlzYWJsZS1ibGluay1mZWF0dXJlcz1BdXRvbWF0aW9uQ29udHJvbGxlZFwiLFxyXG4gICAgICBcIi0tZGlzYWJsZS1ibGluay1mZWF0dXJlcz1BdXRvbWF0aW9uQ29udHJvbGxlZCxJZGxlRGV0ZWN0aW9uXCIsXHJcbiAgICAgIC8vIFx1NzlGQlx1OTY2NFx1ODFFQVx1NTJBOFx1NTMxNlx1NzZGOFx1NTE3M1x1NzY4NFx1OUVEOFx1OEJBNFx1ODg0Q1x1NEUzQVxyXG4gICAgICBcIi0tZGlzYWJsZS1hdXRvbWF0aW9uXCIsXHJcbiAgICAgIFwiLS1uby1maXJzdC1ydW5cIixcclxuICAgICAgXCItLW5vLWRlZmF1bHQtYnJvd3Nlci1jaGVja1wiLFxyXG4gICAgICBcIi0tZGlzYWJsZS1kZWZhdWx0LWFwcHNcIixcclxuICAgICAgXCItLWRpc2FibGUtZXh0ZW5zaW9ucy1leGNlcHQ9L2Rldi9udWxsXCIsXHJcbiAgICAgIFwiLS1kaXNhYmxlLWJhY2tncm91bmQtbmV0d29ya2luZ1wiLFxyXG4gICAgICBcIi0tZGlzYWJsZS1zeW5jXCIsXHJcbiAgICAgIFwiLS1kaXNhYmxlLWNvbXBvbmVudC11cGRhdGVcIixcclxuICAgICAgXCItLWRpc2FibGUtZG9tYWluLXJlbGlhYmlsaXR5XCIsXHJcbiAgICAgIFwiLS1kaXNhYmxlLWNsaWVudC1zaWRlLXBoaXNoaW5nLWRldGVjdGlvblwiLFxyXG4gICAgICAvLyBcdTc5ODFcdTc1MjhcdTY1RTBcdTU5MzRcdTZBMjFcdTVGMEZcdTcyNzlcdTY3MDlcdTc2ODRcdTUzRUZcdTY4QzBcdTZENEJcdTcyNzlcdTVGODFcclxuICAgICAgXCItLWRpc2FibGUtaW5mb2JhcnNcIixcclxuICAgICAgXCItLWRpc2FibGUtZmVhdHVyZXM9SXNvbGF0ZU9yaWdpbnMsc2l0ZS1wZXItcHJvY2Vzc1wiLFxyXG4gICAgICBcIi0td2luZG93LXBvc2l0aW9uPTAsMFwiLFxyXG4gICAgICBcIi0tbGFuZz1lbi1VUyxlblwiLFxyXG4gICAgXTtcclxuICAgIGlmICh0aGlzLm9wdGlvbnMuZXh0cmFBcmdzPy5sZW5ndGgpIGFyZ3MucHVzaCguLi50aGlzLm9wdGlvbnMuZXh0cmFBcmdzKTtcclxuICAgIHJldHVybiBhcmdzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogXHU1M0NEXHU2MzA3XHU3RUI5XHU2Q0U4XHU1MTY1XHU4MTFBXHU2NzJDIFx1MjAxNFx1MjAxNCBcdTU3MjhcdTk4NzVcdTk3NjJcdTRFMEFcdTRFMEJcdTY1ODdcdTRFMkRcdTYyNjdcdTg4NENcdUZGMENcdTc1MjhcdTRFOEVcdTRGMkFcdTg4QzVcdTZENEZcdTg5QzhcdTU2NjhcdTYzMDdcdTdFQjlcdTMwMDJcclxuICAgKiBcdThGRDRcdTU2REVcdTc2ODRcdTgxMUFcdTY3MkNcdTRGMUFcdTU3MjhcdTZCQ0ZcdTRFMkFcdTY1QjBcdTk4NzVcdTk3NjJcdTUyMUJcdTVFRkFcdTY1RjZcdTZDRThcdTUxNjVcdTMwMDJcclxuICAgKi9cclxuICBidWlsZEluaXRTY3JpcHQoKTogc3RyaW5nIHtcclxuICAgIGlmICghdGhpcy5vcHRpb25zLmVuYWJsZWQpIHJldHVybiBcIlwiO1xyXG4gICAgcmV0dXJuIGAoKCkgPT4ge1xyXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCAxLiBcdTk2OTBcdTg1Q0YgbmF2aWdhdG9yLndlYmRyaXZlclx1RkYwOFx1NjcwMFx1N0VDRlx1NTE3OFx1NzY4NFx1NjhDMFx1NkQ0Qlx1NzBCOVx1RkYwOSBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobmF2aWdhdG9yLCAnd2ViZHJpdmVyJywgeyBnZXQ6ICgpID0+IHVuZGVmaW5lZCB9KTtcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIDIuIFx1NEYyQVx1ODhDNSBwbHVnaW5zXHVGRjA4XHU3NzFGXHU1QjlFXHU2RDRGXHU4OUM4XHU1NjY4XHU5MDFBXHU1RTM4XHU2NzA5IFBERiBcdTY3RTVcdTc3MEJcdTU2NjhcdTdCNDlcdTYzRDJcdTRFRjZcdUZGMDkgXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5hdmlnYXRvciwgJ3BsdWdpbnMnLCB7XHJcbiAgICBnZXQ6ICgpID0+IHtcclxuICAgICAgY29uc3QgcGx1Z2luTGlzdCA9IFtcclxuICAgICAgICB7IG5hbWU6ICdDaHJvbWUgUERGIFBsdWdpbicsIGZpbGVuYW1lOiAnaW50ZXJuYWwtcGRmLXZpZXdlcicsIGRlc2NyaXB0aW9uOiAnUG9ydGFibGUgRG9jdW1lbnQgRm9ybWF0JyB9LFxyXG4gICAgICAgIHsgbmFtZTogJ0Nocm9tZSBQREYgVmlld2VyJywgZmlsZW5hbWU6ICdtaGpmYm1kZ2NmamJicGFlb2pvZm9ob2VmZ2llaGphaScsIGRlc2NyaXB0aW9uOiAnJyB9LFxyXG4gICAgICAgIHsgbmFtZTogJ05hdGl2ZSBDbGllbnQnLCBmaWxlbmFtZTogJ2ludGVybmFsLW5hY2wtcGx1Z2luJywgZGVzY3JpcHRpb246ICcnIH1cclxuICAgICAgXTtcclxuICAgICAgY29uc3QgcmVzdWx0ID0geyBsZW5ndGg6IHBsdWdpbkxpc3QubGVuZ3RoLCBpdGVtOiAoaSkgPT4gcGx1Z2luTGlzdFtpXSwgbmFtZWRJdGVtOiAobikgPT4gcGx1Z2luTGlzdC5maW5kKHAgPT4gcC5uYW1lID09PSBuKSB8fCBudWxsIH07XHJcbiAgICAgIGZvciAoY29uc3QgcCBvZiBwbHVnaW5MaXN0KSByZXN1bHRbcC5uYW1lXSA9IHA7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCAzLiBcdTRGMkFcdTg4QzUgbGFuZ3VhZ2VzXHVGRjA4XHU0RTBFXHU3NzFGXHU1QjlFIENocm9tZSBcdTVCRjlcdTlGNTBcdUZGMDkgXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5hdmlnYXRvciwgJ2xhbmd1YWdlcycsIHsgZ2V0OiAoKSA9PiBbJ2VuLVVTJywgJ2VuJywgJ3poLUNOJ10gfSk7XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCA0LiBcdTk2OTBcdTg1Q0YgQXV0b21hdGlvbkNvbnRyb2xsZWQgXHU3NUQ1XHU4RkY5IFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gIGlmICh3aW5kb3cuY2hyb21lKSB7XHJcbiAgICAvLyBcdTc4NkVcdTRGREQgY2hyb21lLnJ1bnRpbWUgXHU1QjU4XHU1NzI4XHVGRjA4XHU3NzFGXHU1QjlFXHU2RDRGXHU4OUM4XHU1NjY4XHU0RTJEXHU4QkU1XHU1QkY5XHU4QzYxXHU1QjU4XHU1NzI4XHVGRjA5XHJcbiAgICBpZiAoIXdpbmRvdy5jaHJvbWUucnVudGltZSkge1xyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LmNocm9tZSwgJ3J1bnRpbWUnLCB7IHZhbHVlOiB7fSB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCA1LiBcdTRGRUVcdTY1MzkgcGVybWlzc2lvbnMgXHU2MkE1XHU1NDRBXHVGRjA4XHU5MDdGXHU1MTREXHU4RkQ0XHU1NkRFIGRlbmllZCBcdTg4QUJcdThCQzZcdTUyMkJcdUZGMDkgXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgY29uc3Qgb3JpZ2luYWxRdWVyeSA9IHdpbmRvdy5uYXZpZ2F0b3IucGVybWlzc2lvbnMgJiYgd2luZG93Lm5hdmlnYXRvci5wZXJtaXNzaW9ucy5xdWVyeTtcclxuICBpZiAob3JpZ2luYWxRdWVyeSkge1xyXG4gICAgd2luZG93Lm5hdmlnYXRvci5wZXJtaXNzaW9ucy5xdWVyeSA9IChwYXJhbWV0ZXJzKSA9PiAoXHJcbiAgICAgIHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy5uYW1lID09PSAnbm90aWZpY2F0aW9ucydcclxuICAgICAgICA/IFByb21pc2UucmVzb2x2ZSh7IHN0YXRlOiBOb3RpZmljYXRpb24ucGVybWlzc2lvbiB9KVxyXG4gICAgICAgIDogb3JpZ2luYWxRdWVyeShwYXJhbWV0ZXJzKVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCA2LiBcdTUxNjhcdTdFQTcgc3RlYWx0aFx1RkYxQVx1NjZGNFx1NTkxQVx1NjMwN1x1N0VCOVx1NEYyQVx1ODhDNSBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICAke3RoaXMub3B0aW9ucy5sZXZlbCA9PT0gXCJmdWxsXCIgPyBgXHJcbiAgLy8gXHU0RjJBXHU4OEM1IGNvbnNvbGUuZGVidWcgXHU0RTBEXHU0RUE3XHU3NTFGXHU1NTJGXHU0RTAwXHU4QzAzXHU3NTI4XHU2ODA4XHJcbiAgLy8gXHU0RjJBXHU4OEM1IHdpbmRvdy5vdXRlcldpZHRoL291dGVySGVpZ2h0XHVGRjA4aGVhZGxlc3MgXHU2RDRGXHU4OUM4XHU1NjY4XHU3QTk3XHU1M0UzXHU1QzNBXHU1QkY4XHU1REVFXHU1RjAyXHVGRjA5XHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdywgJ291dGVyV2lkdGgnLCB7IGdldDogKCkgPT4gd2luZG93LmlubmVyV2lkdGggfHwgMTkyMCB9KTtcclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LCAnb3V0ZXJIZWlnaHQnLCB7IGdldDogKCkgPT4gd2luZG93LmlubmVySGVpZ2h0IHx8IDEwODAgfSk7XHJcblxyXG4gIC8vIFx1NEYyQVx1ODhDNSBzY3JlZW4gXHU1M0MyXHU2NTcwXHJcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5zY3JlZW4sICdjb2xvckRlcHRoJywgeyBnZXQ6ICgpID0+IDI0IH0pO1xyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuc2NyZWVuLCAncGl4ZWxEZXB0aCcsIHsgZ2V0OiAoKSA9PiAyNCB9KTtcclxuXHJcbiAgLy8gXHU0RjJBXHU4OEM1XHU3RjZFXHU4OUU2XHU2NDc4XHU2NTJGXHU2MzAxXHVGRjA4XHU5MDdGXHU1MTREIGhlYWRsZXNzIFx1NjhDMFx1NkQ0Qlx1NTIzMFx1NjVFMFx1ODlFNlx1NjQ3OFx1ODBGRFx1NTI5Qlx1RkYwOVxyXG4gIGlmICghKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdykpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3csICdvbnRvdWNoc3RhcnQnLCB7IHZhbHVlOiBudWxsIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gXHU0RjJBXHU4OEM1IERldmljZU1lbW9yeSBcdTU0OEMgSGFyZHdhcmVDb25jdXJyZW5jeVxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuYXZpZ2F0b3IsICdkZXZpY2VNZW1vcnknLCB7IGdldDogKCkgPT4gOCB9KTtcclxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobmF2aWdhdG9yLCAnaGFyZHdhcmVDb25jdXJyZW5jeScsIHsgZ2V0OiAoKSA9PiA4IH0pO1xyXG5cclxuICAvLyBcdTRGMkFcdTg4QzUgV2ViR0wgXHU2RTMyXHU2N0QzXHU1NjY4XHVGRjA4XHU5MDdGXHU1MTREXHU2NkI0XHU5NzMyIFN3aWZ0U2hhZGVyIFx1N0I0OVx1NjVFMFx1NTkzNFx1NkUzMlx1NjdEM1x1NTY2OFx1RkYwOVxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBnZXRQYXJhbWV0ZXIgPSBXZWJHTFJlbmRlcmluZ0NvbnRleHQucHJvdG90eXBlLmdldFBhcmFtZXRlcjtcclxuICAgIFdlYkdMUmVuZGVyaW5nQ29udGV4dC5wcm90b3R5cGUuZ2V0UGFyYW1ldGVyID0gZnVuY3Rpb24ocGFyYW1ldGVyKSB7XHJcbiAgICAgIGlmIChwYXJhbWV0ZXIgPT09IDM3NDQ1KSByZXR1cm4gJ0dvb2dsZSBJbmMuIChOVklESUEpJztcclxuICAgICAgaWYgKHBhcmFtZXRlciA9PT0gMzc0NDYpIHJldHVybiAnQU5HTEUgKE5WSURJQSwgTlZJRElBIEdlRm9yY2UgUlRYIDMwNjAgRGlyZWN0M0QxMSB2c181XzAgcHNfNV8wLCBEM0QxMSknO1xyXG4gICAgICByZXR1cm4gZ2V0UGFyYW1ldGVyLmNhbGwodGhpcywgcGFyYW1ldGVyKTtcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZSkge31cclxuICBgIDogXCJcIn1cclxufSkoKTtgO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogXHU0RUJBXHU3QzdCXHU4ODRDXHU0RTNBXHU2QTIxXHU2MkRGIFx1MjAxNFx1MjAxNCBcdTc1MUZcdTYyMTBcdTk2OEZcdTY3M0FcdTc2ODRcdTRFQkFcdTdDN0JcdTUzMTZcdTUyQThcdTRGNUNcdTk1RjRcdTk2OTRcdTMwMDJcclxuICAgKiBcdThDMDNcdTc1MjhcdTY1QjlcdTU3MjhcdTUyQThcdTRGNUNcdTRFNEJcdTk1RjRcdTRGN0ZcdTc1MjhcdThCRTVcdTk1RjRcdTk2OTRcdUZGMENcdTZBMjFcdTYyREZcdTRFQkFcdTc2ODRcdTY0Q0RcdTRGNUNcdTgyODJcdTU5NEZcdTMwMDJcclxuICAgKi9cclxuICBodW1hbkRlbGF5KCk6IG51bWJlciB7XHJcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5lbmFibGVkKSByZXR1cm4gMDtcclxuICAgIGNvbnN0IFttaW4sIG1heF0gPSB0aGlzLm9wdGlvbnMuaHVtYW5BY3Rpb25EZWxheSE7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcclxuICB9XHJcblxyXG4gIC8qKiBcdTRFQkFcdTdDN0JcdTYyNTNcdTVCNTdcdTVFRjZcdThGREZcdUZGMDh0eXBlIFx1NTJBOFx1NEY1Q1x1NjVGNlx1OTAxMFx1OTUyRVx1NEU0Qlx1OTVGNFx1NzY4NFx1OTY4Rlx1NjczQVx1OTVGNFx1OTY5NFx1RkYwOSAqL1xyXG4gIGh1bWFuVHlwaW5nRGVsYXlNcygpOiBudW1iZXIge1xyXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZW5hYmxlZCkgcmV0dXJuIDA7XHJcbiAgICBjb25zdCBbbWluLCBtYXhdID0gdGhpcy5vcHRpb25zLmh1bWFuVHlwaW5nRGVsYXkhO1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBcdTc1MUZcdTYyMTBcdTRFQkFcdTdDN0JcdTUzMTZcdTc2ODRcdTlGMjBcdTY4MDdcdTc5RkJcdTUyQThcdThERUZcdTVGODRcdUZGMDhcdThEMURcdTU4NUVcdTVDMTRcdTY2RjJcdTdFQkZcdTYzRDJcdTUwM0NcdUZGMDlcdTMwMDJcclxuICAgKiBcdThGRDRcdTU2REVcdTRFMDBcdTdFQzQgW1t4LHldLCAuLi5dIFx1NTc1MFx1NjgwN1x1NUU4Rlx1NTIxN1x1RkYwQ1x1NEY5Qlx1OEMwM1x1NzUyOFx1NjVCOVx1NEY5RFx1NkIyMVx1NzlGQlx1NTJBOFx1OUYyMFx1NjgwN1x1MzAwMlxyXG4gICAqL1xyXG4gIGh1bWFuTW91c2VQYXRoKGZyb206IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSwgdG86IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSwgc3RlcHMgPSAxMik6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+IHtcclxuICAgIGlmICghdGhpcy5vcHRpb25zLmVuYWJsZWQgfHwgIXRoaXMub3B0aW9ucy5odW1hbk1vdXNlVHJhamVjdG9yeSkge1xyXG4gICAgICByZXR1cm4gW1t0by54LCB0by55XV07XHJcbiAgICB9XHJcbiAgICBjb25zdCBwYXRoOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdGVwczsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IHQgPSAoaSArIDEpIC8gc3RlcHM7XHJcbiAgICAgIC8vIFx1N0I4MFx1NTM1NVx1NEU4Q1x1NkIyMVx1OEQxRFx1NTg1RVx1NUMxNFx1RkYwQ1x1NTJBMFx1NTE2NVx1OTY4Rlx1NjczQVx1NjI3MFx1NTJBOFx1NkEyMVx1NjJERlx1NzcxRlx1NUI5RVx1NjI0Qlx1OTBFOFx1OEZEMFx1NTJBOFxyXG4gICAgICBjb25zdCBjb250cm9sWCA9IChmcm9tLnggKyB0by54KSAvIDIgKyAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiA0MDtcclxuICAgICAgY29uc3QgY29udHJvbFkgPSBNYXRoLm1pbihmcm9tLnksIHRvLnkpIC0gTWF0aC5yYW5kb20oKSAqIDMwO1xyXG4gICAgICBjb25zdCB4ID0gKDEgLSB0KSAqKiAyICogZnJvbS54ICsgMiAqICgxIC0gdCkgKiB0ICogY29udHJvbFggKyB0ICoqIDIgKiB0by54O1xyXG4gICAgICBjb25zdCB5ID0gKDEgLSB0KSAqKiAyICogZnJvbS55ICsgMiAqICgxIC0gdCkgKiB0ICogY29udHJvbFkgKyB0ICoqIDIgKiB0by55O1xyXG4gICAgICBwYXRoLnB1c2goW01hdGgucm91bmQoeCksIE1hdGgucm91bmQoeSldKTtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXRoO1xyXG4gIH1cclxuXHJcbiAgLyoqIFx1NzUxRlx1NjIxMFx1NTUyRlx1NEUwMFx1N0I3RVx1NTQwRFx1NjgwN1x1OEJDNlx1RkYwOFx1NzUyOFx1NEU4RVx1NjgwN1x1OEJCMCBzdGVhbHRoIFx1NUYwMFx1NTQyRlx1NzJCNlx1NjAwMVx1RkYwOSAqL1xyXG4gIGdldCBzaWduYXR1cmUoKTogc3RyaW5nIHtcclxuICAgIGlmICghdGhpcy5vcHRpb25zLmVuYWJsZWQpIHJldHVybiBcInN0ZWFsdGgtb2ZmXCI7XHJcbiAgICByZXR1cm4gYHN0ZWFsdGg6JHt0aGlzLm9wdGlvbnMubGV2ZWx9OnVhPSR7dGhpcy5vcHRpb25zLnVzZXJBZ2VudCA/IFwiY3VzdG9tXCIgOiBcImRlZmF1bHRcIn1gO1xyXG4gIH1cclxufVxyXG5cclxuLyoqIFx1NEZCRlx1NjM3N1x1NTFGRFx1NjU3MFx1RkYxQVx1NTIxQlx1NUVGQSBzdGVhbHRoIFx1N0JBMVx1NzQwNlx1NTY2OCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3RlYWx0aChvcHRpb25zPzogU3RlYWx0aE9wdGlvbnMpOiBTdGVhbHRoTWFuYWdlciB7XHJcbiAgcmV0dXJuIG5ldyBTdGVhbHRoTWFuYWdlcihvcHRpb25zKTtcclxufVxyXG4iLCAiLyoqXG4gKiBUb2tlbiBcdTlBRDhcdTY1NDhcdTYzRDBcdTUzRDZcdTdCNTZcdTc1NjVcbiAqXG4gKiBcdTUwMUZcdTkyNzQgQ2hyb21lIERldlRvb2xzIE1DUCBcdTc2ODQgNSBcdTY2MUYgVG9rZW4gXHU2NTQ4XHU3Mzg3XHVGRjFBXG4gKiAxLiBET00gXHU2MzA5XHU5NzAwXHU4OEMxXHU1MjZBXHVGRjA4XHU1M0VBXHU4QkZCXHU5NzAwXHU4OTgxXHU3Njg0XHU0RkUxXHU2MDZGXHVGRjA5XG4gKiAyLiBcdTU4OUVcdTkxQ0ZcdThCRkJcdTUzRDZcdUZGMDhcdTUxNDhcdTY0NThcdTg5ODFcdUZGMENcdTYzMDkgcmVmIFx1NUM1NVx1NUYwMFx1RkYwOVxuICogMy4gXHU3RUQzXHU2Nzg0XHU1MzE2XHU1MzhCXHU3RjI5XHU4RjkzXHU1MUZBXG4gKi9cbmltcG9ydCB0eXBlIHsgUGFnZVNuYXBzaG90LCBTbmFwc2hvdE5vZGUgfSBmcm9tIFwiQG9wZW5saXVsYW4vY29yZVwiO1xuXG4vKiogVG9rZW4gXHU0RjMwXHU3Qjk3XHVGRjFBXHU3Qzk3XHU3NTY1IDQgXHU1QjU3XHU3QjI2L3Rva2VuICovXG5leHBvcnQgZnVuY3Rpb24gZXN0aW1hdGVUb2tlbnModGV4dDogc3RyaW5nKTogbnVtYmVyIHtcbiAgcmV0dXJuIE1hdGguY2VpbCh0ZXh0Lmxlbmd0aCAvIDQpO1xufVxuXG4vKiogXHU1RkVCXHU3MTY3XHU3Njg0XHU2NzAwXHU1QzBGXHU1MzE2XHU2NTg3XHU2NzJDXHU4ODY4XHU3OTNBXHVGRjA4XHU0RjlCIExMTVx1RkYwOSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhY3RTbmFwc2hvdChzbmFwc2hvdDogUGFnZVNuYXBzaG90LCBtYXhJbnRlcmFjdGl2ZSA9IDQwKTogc3RyaW5nIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XG4gIHBhcnRzLnB1c2goYFske3NuYXBzaG90LnRpdGxlfV0gJHtzbmFwc2hvdC51cmx9YCk7XG4gIGNvbnN0IHJvd3MgPSBzbmFwc2hvdC5pbnRlcmFjdGl2ZS5zbGljZSgwLCBtYXhJbnRlcmFjdGl2ZSkubWFwKFxuICAgIChlbCkgPT4gYCR7ZWwucmVmfToke2VsLnRhZ30ke2VsLnJvbGUgPyBcIltcIiArIGVsLnJvbGUgKyBcIl1cIiA6IFwiXCJ9OlwiJHtlbC50ZXh0LnNsaWNlKDAsIDYwKX1cImBcbiAgKTtcbiAgcGFydHMucHVzaChyb3dzLmpvaW4oXCJcXG5cIikpO1xuICByZXR1cm4gcGFydHMuam9pbihcIlxcblwiKTtcbn1cblxuLyoqIFx1NTM1NVx1NEUyQVx1ODI4Mlx1NzBCOVx1NTM4Qlx1N0YyOVx1NEUzQVx1NEUwMFx1ODg0QyAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vZGVUb0xpbmUobm9kZTogU25hcHNob3ROb2RlKTogc3RyaW5nIHtcbiAgY29uc3QgYXR0cnMgPSBPYmplY3QuZW50cmllcyhub2RlLmF0dHJpYnV0ZXMpXG4gICAgLm1hcCgoW2ssIHZdKSA9PiBgJHtrfT1cIiR7dn1cImApXG4gICAgLmpvaW4oXCIgXCIpO1xuICByZXR1cm4gYCR7bm9kZS5yZWZ9IDwke25vZGUudGFnfSR7YXR0cnMgPyBcIiBcIiArIGF0dHJzIDogXCJcIn0+IFwiJHtub2RlLnRleHR9XCJgO1xufVxuXG4vKipcbiAqIFx1NTg5RVx1OTFDRlx1OEJGQlx1NTNENlx1RkYxQVx1N0VEOVx1NUI5QVx1NzZFRVx1NjgwNyByZWZcdUZGMENcdThGRDRcdTU2REVcdThCRTVcdTgyODJcdTcwQjlcdTUzQ0FcdTUxNzZcdTRFMDBcdTdFQTdcdTVCNTBcdTY4MTFcdTc2ODRcdTdEMjdcdTUxRDFcdTY1ODdcdTY3MkNcdTMwMDJcbiAqIFx1NzUyOFx1NEU4RSBBSSBcdTk3MDBcdTg5ODFcdTY3RTVcdTc3MEJcdTY3RDBcdTUxNDNcdTdEMjBcdTUxODVcdTkwRThcdThCRTZcdTYwQzVcdTY1RjZcdTYyNERcdTVDNTVcdTVGMDBcdUZGMENcdTkwN0ZcdTUxNERcdTUxNjhcdTkxQ0ZcdTUyQTBcdThGN0RcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZE5vZGUoc25hcHNob3Q6IFBhZ2VTbmFwc2hvdCwgcmVmOiBzdHJpbmcsIGRlcHRoID0gMSk6IHN0cmluZyB7XG4gIGNvbnN0IGZvdW5kID0gZmluZE5vZGUoc25hcHNob3Qucm9vdCwgcmVmKTtcbiAgaWYgKCFmb3VuZCkgcmV0dXJuIGBcdTY3MkFcdTYyN0VcdTUyMzAgcmVmPSR7cmVmfWA7XG4gIHJldHVybiByZW5kZXJOb2RlKGZvdW5kLCAwLCBkZXB0aCk7XG59XG5cbmZ1bmN0aW9uIGZpbmROb2RlKG5vZGU6IFNuYXBzaG90Tm9kZSB8IHVuZGVmaW5lZCwgcmVmOiBzdHJpbmcpOiBTbmFwc2hvdE5vZGUgfCB1bmRlZmluZWQge1xuICBpZiAoIW5vZGUpIHJldHVybiB1bmRlZmluZWQ7XG4gIGlmIChub2RlLnJlZiA9PT0gcmVmKSByZXR1cm4gbm9kZTtcbiAgZm9yIChjb25zdCBjIG9mIG5vZGUuY2hpbGRyZW4gfHwgW10pIHtcbiAgICBjb25zdCBoaXQgPSBmaW5kTm9kZShjLCByZWYpO1xuICAgIGlmIChoaXQpIHJldHVybiBoaXQ7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gcmVuZGVyTm9kZShub2RlOiBTbmFwc2hvdE5vZGUsIGRlcHRoOiBudW1iZXIsIG1heERlcHRoOiBudW1iZXIpOiBzdHJpbmcge1xuICBjb25zdCBpbmRlbnQgPSBcIiAgXCIucmVwZWF0KGRlcHRoKTtcbiAgbGV0IG91dCA9IGluZGVudCArIG5vZGVUb0xpbmUobm9kZSk7XG4gIGlmIChkZXB0aCA8IG1heERlcHRoICYmIG5vZGUuY2hpbGRyZW4/Lmxlbmd0aCkge1xuICAgIGZvciAoY29uc3QgYyBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICBvdXQgKz0gXCJcXG5cIiArIHJlbmRlck5vZGUoYywgZGVwdGggKyAxLCBtYXhEZXB0aCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8qKlxuICogXHU0RUNFXHU1RkVCXHU3MTY3XHU0RTJEXHU2M0QwXHU1M0Q2XHUzMDBDXHU1RjUzXHU1MjREXHU4OUM2XHU1M0UzXHU1MTg1XHUzMDBEXHU3Njg0XHU1MTczXHU5NTJFXHU1MTQzXHU3RDIwXHVGRjA4XHU3NTI4XHU0RThFXHU4MDVBXHU3MTI2XHVGRjBDXHU1MUNGXHU1QzExIFRva2VuXHVGRjA5XHUzMDAyXG4gKiBcdTUwMUZcdTUyQTlcdTY4MzlcdTgyODJcdTcwQjlcdTkwNERcdTUzODZcdTRGRERcdTc1NTlcdTZCQ0ZcdTRFMkFcdTRFQTRcdTRFOTJcdTUxNDNcdTdEMjBcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGtleUVsZW1lbnRzKHNuYXBzaG90OiBQYWdlU25hcHNob3QsIGxpbWl0ID0gMzApOiBBcnJheTx7IHJlZjogc3RyaW5nOyB0YWc6IHN0cmluZzsgdGV4dDogc3RyaW5nIH0+IHtcbiAgcmV0dXJuIHNuYXBzaG90LmludGVyYWN0aXZlLnNsaWNlKDAsIGxpbWl0KTtcbn1cbiIsICIvKipcclxuICogc2VjdXJpdHkudHMgXHUyMDE0XHUyMDE0IFx1NUI4OVx1NTE2OFx1NTJBMFx1NTZGQVx1NkEyMVx1NTc1N1xyXG4gKlxyXG4gKiBcdTk0ODhcdTVCRjkgQnJvd3NlciBBSSBGb3JnZSBcdTc2ODRcdTZENEZcdTg5QzhcdTU2NjhcdTgxRUFcdTUyQThcdTUzMTZcdTgwRkRcdTUyOUJcdTUwNUFcdTVCODlcdTUxNjhcdTUyQTBcdTU2RkFcdUZGMENcdTkxQ0RcdTcwQjlcdTk2MzJcdTVGQTFcdUZGMUFcclxuICogMS4gKipcdTY1NEZcdTYxMUZcdTRGRTFcdTYwNkZcdTZDQzRcdTk3MzJcdUZGMDhcdTRFRTRcdTcyNEMvXHU1QkM2XHU3ODAxXHVGRjA5KipcdUZGMUFcdTk4NzVcdTk3NjJcdTVGRUJcdTcxNjdcdTMwMDFVUkxcdTMwMDFcdTY1RTVcdTVGRDdcdTMwMDFcdTRFOEJcdTRFRjZcdTZENDFcdTMwMDFcdTk1MTlcdThCRUYgZGV0YWlsXHJcbiAqICAgIFx1NEUyRFx1NTNFRlx1ODBGRFx1NjQzQVx1NUUyNlx1NzUyOFx1NjIzN1x1NEVFNFx1NzI0Q1x1MzAwMVx1NUJDNlx1NzgwMVx1MzAwMUFQSSBLZXkgXHU3QjQ5XHU2NTRGXHU2MTFGXHU0RkUxXHU2MDZGXHVGRjBDXHU5NzAwXHU4OTgxXHU3RURGXHU0RTAwXHU4MTMxXHU2NTRGXHVGRjA4cmVkYWN0XHVGRjA5XHUzMDAyXHJcbiAqIDIuICoqSFRUUCBcdTY3MERcdTUyQTFcdTg4QUJcdTZFMTdcdTkwMEYvXHU2M0QwXHU2NzQzKipcdUZGMUFgL3Rvb2xzL2NhbGxgIFx1NTE0MVx1OEJCOFx1OEZEQ1x1N0EwQlx1NjNBN1x1NTIzNlx1NzcxRlx1NUI5RVx1NkQ0Rlx1ODlDOFx1NTY2OFx1RkYwQ1xyXG4gKiAgICBcdTVGQzVcdTk4N0JcdTUwNUFcdTkyNzRcdTY3NDNcdUZGMDhCZWFyZXIgVG9rZW5cdUZGMDkrIFx1Njc2NVx1NkU5MFx1OTY1MFx1NTIzNiArIFx1OEJGN1x1NkM0Mlx1NEY1M1x1NTkyN1x1NUMwRlx1OTY1MFx1NTIzNlx1RkYwQ1x1OTYzMlx1NkI2Mlx1NEVGQlx1NjEwRlx1NEVCQVx1OEMwM1x1NzUyOFx1MzAwMlxyXG4gKiAzLiAqKlx1NEVGQlx1NjEwRiBKUyBcdTZDRThcdTUxNjVcdUZGMDhldmFsXHVGRjA5KipcdUZGMUFgZXZhbGAgXHU1REU1XHU1MTc3XHU1MTQxXHU4QkI4XHU2Q0U4XHU1MTY1XHU0RUZCXHU2MTBGXHU4MTFBXHU2NzJDXHVGRjBDXHU5NzAwXHU1MDVBXHU1MzcxXHU5NjY5XHU2NENEXHU0RjVDXHU2MkU2XHU2MjJBXHJcbiAqICAgIFx1NEUwRVx1NUI4OVx1NTE2OFx1NjNEMFx1NzkzQVx1MzAwMlxyXG4gKiA0LiAqKlNTUkYgXHU5OENFXHU5NjY5KipcdUZGMUFcdTgxRUFcdTVCOUFcdTRFNDlcdTYyOTVcdTkwMTJcdUZGMDh3ZWJob29rXHVGRjA5XHU3Njg0IGBmZXRjaCh0YXJnZXQpYCBcdTc2RUVcdTY4MDdcdTY3MkFcdTY4MjFcdTlBOENcdUZGMENcdTUzRUZcdTgwRkRcclxuICogICAgXHU4OEFCXHU1MjI5XHU3NTI4XHU4QkJGXHU5NUVFXHU1MTg1XHU3RjUxXHU4RDQ0XHU2RTkwXHVGRjBDXHU5NzAwXHU5NjUwXHU1MjM2XHU3NkVFXHU2ODA3XHU0RTNBXHU2NjNFXHU1RjBGXHU1MTQxXHU4QkI4XHU3Njg0IGh0dHAocykgXHU1NzMwXHU1NzQwXHU1RTc2XHU2MkQyXHU3RUREXHU1MTg1XHU3RjUxL0lQXHUzMDAyXHJcbiAqXHJcbiAqIFx1NjI0MFx1NjcwOVx1NTFGRFx1NjU3MFx1NTc0N1x1NEUzQVx1N0VBRlx1NTFGRFx1NjU3MC9cdTVFNDJcdTdCNDlcdUZGMENcdTRFMERcdTY1MzlcdTUzRDhcdTUzOUZcdTVCRjlcdThDNjFcdUZGMENcdThGRDRcdTU2REVcdTgxMzFcdTY1NEZcdTU0MEVcdTc2ODRcdTUyNkZcdTY3MkNcdUZGMENcdTY1QjlcdTRGQkZcdTU3MjhcdTU0MDRcdTkwMDJcdTkxNERcdTVDNDJcdTU5MERcdTc1MjhcdTMwMDJcclxuICovXHJcbmltcG9ydCBjcnlwdG8gZnJvbSBcIm5vZGU6Y3J5cHRvXCI7XHJcblxyXG4vKiA9PT09PT09PT09PT09PT09PT09PT0gXHU2NTRGXHU2MTFGXHU1QjU3XHU2QkI1XHU1QjlBXHU0RTQ5ID09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuLyoqIFx1NUUzOFx1ODlDMVx1NzY4NFx1NjU0Rlx1NjExRlx1NTNDMlx1NjU3MFx1NTQwRFx1RkYwOHF1ZXJ5IC8gYm9keSAvIGhlYWRlciAvIFx1NUM1RVx1NjAyN1x1RkYwOVx1MjAxNFx1MjAxNCBcdTU0N0RcdTRFMkRcdTUzNzNcdTgxMzFcdTY1NEYgKi9cclxuY29uc3QgU0VOU0lUSVZFX0tFWVMgPSBbXHJcbiAgXCJ0b2tlblwiLFxyXG4gIFwiYWNjZXNzX3Rva2VuXCIsXHJcbiAgXCJyZWZyZXNoX3Rva2VuXCIsXHJcbiAgXCJzZWNyZXRcIixcclxuICBcImNsaWVudF9zZWNyZXRcIixcclxuICBcInBhc3N3b3JkXCIsXHJcbiAgXCJwYXNzd2RcIixcclxuICBcInB3ZFwiLFxyXG4gIFwiYXBpa2V5XCIsXHJcbiAgXCJhcGlfa2V5XCIsXHJcbiAgXCJhcGkta2V5XCIsXHJcbiAgXCJhdXRoXCIsXHJcbiAgXCJhdXRob3JpemF0aW9uXCIsXHJcbiAgXCJjb29raWVcIixcclxuICBcInNldC1jb29raWVcIixcclxuICBcInNlc3Npb25pZFwiLFxyXG4gIFwic2lkXCIsXHJcbiAgXCJrZXlcIixcclxuICBcInByaXZhdGVfa2V5XCIsXHJcbiAgXCJwcml2YXRla2V5XCIsXHJcbiAgXCJzaWduYXR1cmVcIixcclxuICBcImNyZWRlbnRpYWxcIixcclxuICBcImNyZWRlbnRpYWxzXCIsXHJcbiAgXCJ4LWFwaS1rZXlcIixcclxuICBcIngtYXV0aC10b2tlblwiLFxyXG4gIFwiand0XCIsXHJcbl07XHJcblxyXG4vKiogXHU1MjI0XHU2NUFEXHU1QjU3XHU2QkI1XHU1NDBEXHU2NjJGXHU1NDI2XHU0RTNBXHU2NTRGXHU2MTFGXHU1QjU3XHU2QkI1ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1NlbnNpdGl2ZUtleShrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGNvbnN0IGsgPSBrZXkudG9Mb3dlckNhc2UoKTtcclxuICAvLyBzZXNzaW9uSWQgLyBzZXNzaW9uIFx1NEYxQVx1OEJERFx1NjgwN1x1OEJDNlx1NjcyQ1x1OEVBQlx1OTc1RVx1NjU0Rlx1NjExRlx1RkYwOFx1NEVDNVx1NzcxRlx1NkI2M1x1NzY4NFx1NEYxQVx1OEJERFx1NEVFNFx1NzI0Q1x1NjI0RFx1OTcwMFx1ODEzMVx1NjU0Rlx1RkYwOVxyXG4gIGlmIChrID09PSBcInNlc3Npb25cIiB8fCBrID09PSBcInNlc3Npb25pZFwiIHx8IGsgPT09IFwic2lkXCIpIHJldHVybiBmYWxzZTtcclxuICByZXR1cm4gU0VOU0lUSVZFX0tFWVMuc29tZSgocykgPT4gay5pbmNsdWRlcyhzKSk7XHJcbn1cclxuXHJcbi8qKiBcdTgxMzFcdTY1NEZcdTUzNjBcdTRGNERcdUZGMDhcdTRGRERcdTc1NTlcdTk1N0ZcdTVFQTZcdTYzRDBcdTc5M0FcdUZGMDkgKi9cclxuZnVuY3Rpb24gbWFzayh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICBpZiAoIXZhbHVlKSByZXR1cm4gdmFsdWU7XHJcbiAgaWYgKHZhbHVlLmxlbmd0aCA8PSAyKSByZXR1cm4gXCIqKioqXCI7XHJcbiAgY29uc3QgaGVhZCA9IHZhbHVlLnNsaWNlKDAsIDIpO1xyXG4gIGNvbnN0IHRhaWwgPSB2YWx1ZS5sZW5ndGggPiA2ID8gdmFsdWUuc2xpY2UoLTIpIDogXCJcIjtcclxuICByZXR1cm4gYCR7aGVhZH0qKioqJHt0YWlsfSAoJHt2YWx1ZS5sZW5ndGh9IGNoYXJzKWA7XHJcbn1cclxuXHJcbi8qID09PT09PT09PT09PT09PT09PT09PSBcdTVCRjlcdThDNjFcdTZERjFcdTgxMzFcdTY1NEYgPT09PT09PT09PT09PT09PT09PT09ICovXHJcblxyXG4vKipcclxuICogXHU2REYxXHU1RUE2XHU5MDREXHU1Mzg2XHU0RUZCXHU2MTBGXHU1QkY5XHU4QzYxL1x1NjU3MFx1N0VDNC9cdTVCNTdcdTdCMjZcdTRFMzJcdUZGMENcdTVCRjlcdTMwMENcdTY1NEZcdTYxMUZcdTVCNTdcdTZCQjVcdTU0MERcdTMwMERcdTc2ODRcdTUwM0NcdTUwNUFcdTgxMzFcdTY1NEZcdTMwMDJcclxuICogXHU3NTI4XHU0RThFXHU2NUU1XHU1RkQ3IHBheWxvYWRcdTMwMDFcdTRFOEJcdTRFRjZcdTZENDFcdTMwMDFcdTk1MTlcdThCRUYgZGV0YWlsXHUzMDAxQUlNZXNzYWdlIFx1N0I0OVx1N0VEM1x1Njc4NFx1NTMxNlx1NjU3MFx1NjM2RVx1MzAwMlxyXG4gKiBcdThGRDRcdTU2REVcdTgxMzFcdTY1NEZcdTU0MEVcdTc2ODRcdTUyNkZcdTY3MkNcdUZGMDhcdTRFMERcdTRGRUVcdTY1MzlcdTUzOUZcdTVCRjlcdThDNjFcdUZGMDlcdTMwMDJcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWRhY3REZWVwKHZhbHVlOiB1bmtub3duLCBkZXB0aCA9IDAsIG1heERlcHRoID0gMTIpOiB1bmtub3duIHtcclxuICBpZiAoZGVwdGggPiBtYXhEZXB0aCkgcmV0dXJuIHVuZGVmaW5lZDtcclxuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHZhbHVlO1xyXG5cclxuICAvLyBcdTVCNTdcdTdCMjZcdTRFMzJcdTc2RjRcdTYzQTVcdThGRDRcdTU2REVcdUZGMDhcdTVCNTdcdTZCQjVcdTU0MERcdTdFQTdcdTUyMkJcdTc2ODRcdTgxMzFcdTY1NEZcdTc1MzFcdTRFMEFcdTVDNDIgaXNTZW5zaXRpdmVLZXkgXHU1MUIzXHU1QjlBXHVGRjA5XHJcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIHZhbHVlO1xyXG5cclxuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgIHJldHVybiB2YWx1ZS5tYXAoKHYpID0+IHJlZGFjdERlZXAodiwgZGVwdGggKyAxLCBtYXhEZXB0aCkpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIikge1xyXG4gICAgY29uc3Qgb3V0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xyXG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXModmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pKSB7XHJcbiAgICAgIGlmIChpc1NlbnNpdGl2ZUtleShrKSkge1xyXG4gICAgICAgIG91dFtrXSA9IHR5cGVvZiB2ID09PSBcInN0cmluZ1wiID8gbWFzayh2KSA6IFwiKioqUkVEQUNURUQqKipcIjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBvdXRba10gPSByZWRhY3REZWVwKHYsIGRlcHRoICsgMSwgbWF4RGVwdGgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb3V0O1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHZhbHVlO1xyXG59XHJcblxyXG4vKiA9PT09PT09PT09PT09PT09PT09PT0gVVJMIFx1ODEzMVx1NjU0RiA9PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbi8qKlxyXG4gKiBcdTVCRjkgVVJMIFx1NTA1QVx1ODEzMVx1NjU0Rlx1RkYxQVx1OTY5MFx1ODVDRiBxdWVyeSAvIGhhc2ggXHU0RTJEXHU3Njg0XHU2NTRGXHU2MTFGXHU1M0MyXHU2NTcwXHU1MDNDXHUzMDAyXHJcbiAqIFx1NEY4Qlx1RkYxQWBodHRwczovL3guY29tL2xvZ2luP3Rva2VuPWFiYzEyMyZuZXh0PS9ob21lYCAtPiBgaHR0cHM6Ly94LmNvbS9sb2dpbj90b2tlbj1hYioqKioyMyAoOCBjaGFycykmbmV4dD0vaG9tZWBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWRhY3RVcmwocmF3VXJsOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGlmICghcmF3VXJsKSByZXR1cm4gcmF3VXJsO1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB1ID0gbmV3IFVSTChyYXdVcmwpO1xyXG4gICAgZm9yIChjb25zdCBrZXkgb2YgWy4uLnUuc2VhcmNoUGFyYW1zLmtleXMoKV0pIHtcclxuICAgICAgaWYgKGlzU2Vuc2l0aXZlS2V5KGtleSkpIHtcclxuICAgICAgICBjb25zdCB2ID0gdS5zZWFyY2hQYXJhbXMuZ2V0KGtleSkgPz8gXCJcIjtcclxuICAgICAgICB1LnNlYXJjaFBhcmFtcy5zZXQoa2V5LCBtYXNrKHYpKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gaGFzaCBcdTRFMkRcdTUzRUZcdTgwRkRcdTY0M0FcdTVFMjYgdG9rZW5cdUZGMDhcdTU5ODIgU1BBIFx1NzY4NCAjYWNjZXNzX3Rva2VuPXh4eFx1RkYwOVxyXG4gICAgaWYgKHUuaGFzaCAmJiAvKHRva2VufGFjY2Vzc190b2tlbnxzZWNyZXR8YXV0aCk9L2kudGVzdCh1Lmhhc2gpKSB7XHJcbiAgICAgIHUuaGFzaCA9IFwiIyMjUkVEQUNURUQjIyNcIjtcclxuICAgIH1cclxuICAgIC8vIFx1NzUyOFx1NjIzN1x1NTQwRFx1NUJDNlx1NzgwMVx1NUY2Mlx1NUYwRlx1RkYwOGh0dHA6Ly91c2VyOnBhc3NAaG9zdFx1RkYwOVxyXG4gICAgaWYgKHUudXNlcm5hbWUgfHwgdS5wYXNzd29yZCkge1xyXG4gICAgICB1LnVzZXJuYW1lID0gXCIqKipcIjtcclxuICAgICAgdS5wYXNzd29yZCA9IFwiKioqXCI7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdS50b1N0cmluZygpO1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgLy8gXHU5NzVFXHU2Q0Q1IFVSTFx1RkYxQVx1NEVDNVx1NUJGOVx1NjYwRVx1NjYzRVx1NzY4NCBrZXk9dmFsdWUgXHU1MDVBXHU3Qzk3XHU3NTY1XHU4MTMxXHU2NTRGXHJcbiAgICByZXR1cm4gcmF3VXJsLnJlcGxhY2UoXHJcbiAgICAgIC8oWz8mXSh0b2tlbnxwYXNzd29yZHxwYXNzd2R8c2VjcmV0fGFwaVtfLV0/a2V5fGF1dGh8YWNjZXNzX3Rva2VufHJlZnJlc2hfdG9rZW58Y2xpZW50X3NlY3JldCk9KVteJl0qL2dpLFxyXG4gICAgICBcIiQxKioqUkVEQUNURUQqKipcIlxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuXHJcbi8qID09PT09PT09PT09PT09PT09PT09PSBIVFRQIFx1OTI3NFx1Njc0MyA9PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSHR0cEF1dGhDb25maWcge1xyXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTU0MkZcdTc1MjhcdTkyNzRcdTY3NDNcdUZGMDhcdTlFRDhcdThCQTRcdUZGMUFcdTY3MkFcdTkxNERcdTdGNkUgdG9rZW4gXHU2NUY2XHU0RTVGXHU2MkQyXHU3RUREXHU4RkRDXHU3QTBCXHU2NzY1XHU2RTkwXHVGRjA5ICovXHJcbiAgZW5hYmxlZD86IGJvb2xlYW47XHJcbiAgLyoqIFx1NTE0MVx1OEJCOFx1NzY4NCBCZWFyZXIgVG9rZW5cdUZGMDhcdTU5MUFcdTRFMkFcdTRFRTVcdTkwMTdcdTUzRjdcdTUyMDZcdTk2OTRcdUZGMUJcdTY3NjVcdTgxRUFcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0YgRk9SR0VfSFRUUF9UT0tFTiBcdTYyMTZcdTkxNERcdTdGNkVcdUZGMDkgKi9cclxuICB0b2tlbnM/OiBzdHJpbmdbXTtcclxuICAvKiogXHU0RUM1XHU1MTQxXHU4QkI4XHU2NzY1XHU4MUVBXHU4RkQ5XHU0RTlCIEhvc3QvT3JpZ2luIFx1NzY4NFx1OEJGN1x1NkM0Mlx1RkYwOFx1Njc2NVx1ODFFQSBGT1JHRV9IVFRQX0FMTE9XRURfT1JJR0lOU1x1RkYwQ1x1OTAxN1x1NTNGN1x1NTIwNlx1OTY5NFx1RkYwOSAqL1xyXG4gIGFsbG93ZWRPcmlnaW5zPzogc3RyaW5nW107XHJcbiAgLyoqIFx1NEVDNVx1NTE0MVx1OEJCOFx1NTZERVx1NzNBRi9cdTY3MkNcdTY3M0FcdTU3MzBcdTU3NDBcdThCQkZcdTk1RUVcdUZGMDhcdTlFRDhcdThCQTQgdHJ1ZVx1RkYwQ1x1NjcyQVx1OTE0RFx1N0Y2RSB0b2tlbiBcdTY1RjZcdTVGM0FcdTUyMzYgdHJ1ZVx1RkYwOSAqL1xyXG4gIGxvb3BiYWNrT25seT86IGJvb2xlYW47XHJcbn1cclxuXHJcbi8qKiBcdTRFQ0VcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0ZcdTY3ODRcdTVFRkEgSFRUUCBcdTkyNzRcdTY3NDNcdTkxNERcdTdGNkUgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGh0dHBBdXRoQ29uZmlnRnJvbUVudigpOiBIdHRwQXV0aENvbmZpZyB7XHJcbiAgY29uc3QgcmF3VG9rZW5zID0gcHJvY2Vzcy5lbnYuRk9SR0VfSFRUUF9UT0tFTiA/PyBcIlwiO1xyXG4gIGNvbnN0IHJhd09yaWdpbnMgPSBwcm9jZXNzLmVudi5GT1JHRV9IVFRQX0FMTE9XRURfT1JJR0lOUyA/PyBcIlwiO1xyXG4gIGNvbnN0IGxvb3BiYWNrID0gKHByb2Nlc3MuZW52LkZPUkdFX0hUVFBfTE9PUEJBQ0tfT05MWSA/PyBcInRydWVcIikudG9Mb3dlckNhc2UoKSAhPT0gXCJmYWxzZVwiO1xyXG4gIHJldHVybiB7XHJcbiAgICBlbmFibGVkOiAhIXJhd1Rva2VucyxcclxuICAgIHRva2VuczogcmF3VG9rZW5zLnNwbGl0KFwiLFwiKS5tYXAoKHQpID0+IHQudHJpbSgpKS5maWx0ZXIoQm9vbGVhbiksXHJcbiAgICBhbGxvd2VkT3JpZ2luczogcmF3T3JpZ2lucy5zcGxpdChcIixcIikubWFwKChvKSA9PiBvLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pLFxyXG4gICAgbG9vcGJhY2tPbmx5OiBsb29wYmFjayxcclxuICB9O1xyXG59XHJcblxyXG4vKiogXHU1MjI0XHU2NUFEXHU4QkY3XHU2QzQyXHU2NzY1XHU2RTkwXHU2NjJGXHU1NDI2XHU0RTNBXHU1NkRFXHU3M0FGXHU1NzMwXHU1NzQwXHVGRjA4XHU1NDJCIElQdjQvSVB2NiBcdTRFMEUgOjpmZmZmOiBcdTY2MjBcdTVDMDRcdUZGMDkgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzTG9vcGJhY2tSZW1vdGUoYWRkcjogc3RyaW5nIHwgdW5kZWZpbmVkKTogYm9vbGVhbiB7XHJcbiAgaWYgKCFhZGRyKSByZXR1cm4gZmFsc2U7XHJcbiAgbGV0IGEgPSBhZGRyLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xyXG4gIC8vIFx1NTNCQlx1NjM4OVx1N0FFRlx1NTNFM1x1RkYxQUlQdjQgXHU3Njg0IDpwb3J0IC8gSVB2NiBcdTc2ODQgXTpwb3J0IC8gXHU3RUFGIElQdjYgXHU3Njg0ICV6b25lXHJcbiAgaWYgKC9eXFxbLipcXF06Ly50ZXN0KGEpKSBhID0gYS5zbGljZSgxLCBhLmluZGV4T2YoXCJdXCIpKTtcclxuICBlbHNlIGlmICgvXjo6ZmZmZjovaS50ZXN0KGEpKSBhID0gYS5zbGljZSg3KTsgLy8gSVB2NCBcdTY2MjBcdTVDMDQgOjpmZmZmOjEyNy4wLjAuMVxyXG4gIGVsc2UgaWYgKGEuaW5jbHVkZXMoXCI6XCIpICYmICFhLnN0YXJ0c1dpdGgoXCI6OlwiKSkgYSA9IGEuc3BsaXQoXCI6XCIpWzBdO1xyXG4gIGEgPSBhLnJlcGxhY2UoL1xcL1xcZCskLywgXCJcIikucmVwbGFjZSgvJVxcdyskLywgXCJcIik7XHJcbiAgcmV0dXJuIGEgPT09IFwiMTI3LjAuMC4xXCIgfHwgYSA9PT0gXCI6OjFcIiB8fCBhID09PSBcImxvY2FsaG9zdFwiIHx8IGEgPT09IFwiMDowOjA6MDowOjA6MDoxXCI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcdTY4MjFcdTlBOEMgSFRUUCBcdThCRjdcdTZDNDJcdTY2MkZcdTU0MjZcdTg4QUJcdTYzODhcdTY3NDNcdTMwMDJcclxuICogQHBhcmFtIHJlbW90ZUFkZHJlc3MgXHU4QkY3XHU2QzQyXHU2NUI5XHU1NzMwXHU1NzQwXHVGRjA4XHU1OTgyIGAxMjcuMC4wLjE6NTQzMjFgIFx1NjIxNiBgcmVxLnNvY2tldC5yZW1vdGVBZGRyZXNzYFx1RkYwOVxyXG4gKiBAcGFyYW0gb3JpZ2luIFx1OEJGN1x1NkM0Mlx1NzY4NCBPcmlnaW4gLyBSZWZlcmVyIFx1NTkzNFx1RkYwOFx1NTNFRlx1NEUzQVx1N0E3QVx1RkYwOVxyXG4gKiBAcGFyYW0gYXV0aG9yaXphdGlvbiBBdXRob3JpemF0aW9uIFx1NTkzNFx1RkYwOFx1NTNFRlx1NEUzQVx1N0E3QVx1RkYwOVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGF1dGhvcml6ZUh0dHBSZXF1ZXN0KFxyXG4gIGNmZzogSHR0cEF1dGhDb25maWcsXHJcbiAgcmVtb3RlQWRkcmVzczogc3RyaW5nIHwgdW5kZWZpbmVkLFxyXG4gIG9yaWdpbjogc3RyaW5nIHwgdW5kZWZpbmVkLFxyXG4gIGF1dGhvcml6YXRpb246IHN0cmluZyB8IHVuZGVmaW5lZFxyXG4pOiB7IG9rOiBib29sZWFuOyByZWFzb24/OiBzdHJpbmcgfSB7XHJcbiAgLy8gMSkgXHU1NkRFXHU3M0FGXHU5NjUwXHU1MjM2XHVGRjFBXHU2NzJBXHU5MTREXHU3RjZFIHRva2VuIFx1NjIxNlx1NjYzRVx1NUYwRlx1ODk4MVx1NkM0MiBsb29wYmFja09ubHkgXHU2NUY2XHVGRjBDXHU2MkQyXHU3RUREXHU5NzVFXHU2NzJDXHU2NzNBXHU2NzY1XHU2RTkwXHVGRjA4XHU5NjMyXHU4RkRDXHU3QTBCXHU2RTE3XHU5MDBGXHVGRjA5XHJcbiAgY29uc3QgbG9vcGJhY2tPbmx5ID0gY2ZnLmxvb3BiYWNrT25seSA/PyAhY2ZnLmVuYWJsZWQ7XHJcbiAgaWYgKGxvb3BiYWNrT25seSAmJiAhaXNMb29wYmFja1JlbW90ZShyZW1vdGVBZGRyZXNzKSkge1xyXG4gICAgcmV0dXJuIHsgb2s6IGZhbHNlLCByZWFzb246IFwiXHU0RUM1XHU1MTQxXHU4QkI4XHU2NzJDXHU2NzNBXHU4QkJGXHU5NUVFXHVGRjA4Rk9SR0VfSFRUUF9MT09QQkFDS19PTkxZPXRydWVcdUZGMDlcdTMwMDJcIiB9O1xyXG4gIH1cclxuXHJcbiAgLy8gMikgQmVhcmVyIFRva2VuIFx1OTI3NFx1Njc0M1x1RkYwOFx1ODJFNVx1NjcwOVx1OTE0RFx1N0Y2RVx1RkYwOVxyXG4gIGlmIChjZmcuZW5hYmxlZCAmJiBjZmcudG9rZW5zPy5sZW5ndGgpIHtcclxuICAgIGNvbnN0IHRva2VuID0gYXV0aG9yaXphdGlvbj8ucmVwbGFjZSgvXkJlYXJlclxccysvaSwgXCJcIikudHJpbSgpID8/IFwiXCI7XHJcbiAgICBjb25zdCB0b2tlbkhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaChcInNoYTI1NlwiKS51cGRhdGUodG9rZW4pLmRpZ2VzdChcImhleFwiKTtcclxuICAgIGNvbnN0IHZhbGlkID0gY2ZnLnRva2Vucy5zb21lKCh0KSA9PiB7XHJcbiAgICAgIGNvbnN0IHRIYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goXCJzaGEyNTZcIikudXBkYXRlKHQpLmRpZ2VzdChcImhleFwiKTtcclxuICAgICAgLy8gXHU2MDUyXHU1QjlBXHU2NUY2XHU5NUY0XHU2QkQ0XHU4RjgzXHVGRjBDXHU5NjMyXHU2NUY2XHU1RThGXHU2NTNCXHU1MUZCXHJcbiAgICAgIGNvbnN0IGEgPSBCdWZmZXIuZnJvbSh0SGFzaCk7XHJcbiAgICAgIGNvbnN0IGIgPSBCdWZmZXIuZnJvbSh0b2tlbkhhc2gpO1xyXG4gICAgICByZXR1cm4gYS5sZW5ndGggPT09IGIubGVuZ3RoICYmIGNyeXB0by50aW1pbmdTYWZlRXF1YWwoYSwgYik7XHJcbiAgICB9KTtcclxuICAgIGlmICghdmFsaWQpIHJldHVybiB7IG9rOiBmYWxzZSwgcmVhc29uOiBcIlx1NjVFMFx1NjU0OFx1NjIxNlx1N0YzQVx1NTkzMVx1NzY4NCBBUEkgVG9rZW5cdTMwMDJcIiB9O1xyXG4gIH1cclxuXHJcbiAgLy8gMykgXHU2NzY1XHU2RTkwXHU3NjdEXHU1NDBEXHU1MzU1XHVGRjA4XHU4MkU1XHU2NzA5XHU5MTREXHU3RjZFXHVGRjA5XHJcbiAgaWYgKGNmZy5hbGxvd2VkT3JpZ2lucz8ubGVuZ3RoKSB7XHJcbiAgICBpZiAoIW9yaWdpbikgcmV0dXJuIHsgb2s6IGZhbHNlLCByZWFzb246IFwiXHU3RjNBXHU1QzExXHU2NzY1XHU2RTkwIE9yaWdpbi9SZWZlcmVyIFx1NTkzNFx1MzAwMlwiIH07XHJcbiAgICBjb25zdCBhbGxvd2VkID0gY2ZnLmFsbG93ZWRPcmlnaW5zLnNvbWUoKG8pID0+IHtcclxuICAgICAgaWYgKG8gPT09IFwiKlwiKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgcmV0dXJuIG9yaWdpbiA9PT0gbyB8fCBvcmlnaW4uc3RhcnRzV2l0aChgJHtvfS9gKSB8fCBvcmlnaW4uc3RhcnRzV2l0aChgJHtvLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX06YCk7XHJcbiAgICB9KTtcclxuICAgIGlmICghYWxsb3dlZCkgcmV0dXJuIHsgb2s6IGZhbHNlLCByZWFzb246IFwiXHU2NzY1XHU2RTkwXHU2NzJBXHU4OEFCXHU1MTQxXHU4QkI4XHUzMDAyXCIgfTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7IG9rOiB0cnVlIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcdTc1MUZcdTYyMTBcdTRFMDBcdTRFMkFcdTVCODlcdTUxNjhcdTc2ODRcdTk2OEZcdTY3M0EgQVBJIFRva2VuXHVGRjA4XHU0RjlCXHU5OTk2XHU2QjIxXHU5MEU4XHU3RjcyXHU2NUY2XHU1MTk5XHU1MTY1XHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGXHVGRjA5XHUzMDAyXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVBcGlUb2tlbigpOiBzdHJpbmcge1xyXG4gIHJldHVybiBjcnlwdG8ucmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKFwiaGV4XCIpO1xyXG59XHJcblxyXG4vKiA9PT09PT09PT09PT09PT09PT09PT0gZXZhbCAvIFx1NTM3MVx1OTY2OVx1ODExQVx1NjcyQ1x1NjJFNlx1NjIyQSA9PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbi8qKiBcdTlBRDhcdTUzNzFcdTY0Q0RcdTRGNUNcdTZBMjFcdTVGMEZcdUZGMUFcdTY4QzBcdTZENEJcdTZDRThcdTUxNjVcdTgxMUFcdTY3MkNcdTRFMkRcdTc2ODRcdTUzNzFcdTk2NjlcdTg4NENcdTRFM0FcdUZGMDhcdTYzRDBcdTY3NDMvXHU2RTE3XHU5MDBGXHU1QzFEXHU4QkQ1XHVGRjA5ICovXHJcbmNvbnN0IERBTkdFUk9VU19KU19QQVRURVJOUzogQXJyYXk8eyBsYWJlbDogc3RyaW5nOyByZTogUmVnRXhwIH0+ID0gW1xyXG4gIHsgbGFiZWw6IFwiXHU2NTg3XHU0RUY2XHU3Q0ZCXHU3RURGXHU4QkJGXHU5NUVFXCIsIHJlOiAvcmVxdWlyZVxccypcXChcXHMqWydcIl1mc1snXCJdfG5vZGU6ZnN8cmVhZEZpbGV8d3JpdGVGaWxlfHJtU3luY3x1bmxpbmtTeW5jL2kgfSxcclxuICB7IGxhYmVsOiBcIlx1NUI1MFx1OEZEQlx1N0EwQlx1NjI2N1x1ODg0Q1wiLCByZTogL2NoaWxkX3Byb2Nlc3N8ZXhlY1N5bmN8c3Bhd25TeW5jfFxcYmV4ZWNcXHMqXFwofHByb2Nlc3NcXC5leGVjL2kgfSxcclxuICB7IGxhYmVsOiBcIlx1N0Y1MVx1N0VEQ1x1NkUxN1x1OTAwRlwiLCByZTogL3Byb2Nlc3NcXC5lbnZ8X19wcm90b19ffGNvbnN0cnVjdG9yXFxzKlxcKFxccypbJ1wiXWNvbnN0cnVjdG9yL2kgfSxcclxuICB7IGxhYmVsOiBcIlx1NkQ0Rlx1ODlDOFx1NTY2OFx1NkYwRlx1NkQxRVx1NTIyOVx1NzUyOFwiLCByZTogL2V4cGxvaXR8YnlwYXNzfGJ5cGFzcy4qc2VjdXJpdHl8ZGlzYWJsZS4qc2VjdXJpdHl8Y2VydGlmaWNhdGUvaSB9LFxyXG5dO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFdmFsR3VhcmRSZXN1bHQge1xyXG4gIGFsbG93ZWQ6IGJvb2xlYW47XHJcbiAgcmVhc29ucz86IHN0cmluZ1tdO1xyXG4gIC8qKiBcdTY2MkZcdTU0MjZcdTU0N0RcdTRFMkRcdTlBRDhcdTUzNzFcdUZGMDhcdTk3MDBcdTVGM0FcdTUyMzZcdTYyRTZcdTYyMkFcdUZGMDkgKi9cclxuICBibG9ja2VkOiBib29sZWFuO1xyXG59XHJcblxyXG4vKipcclxuICogXHU2ODIxXHU5QThDXHU0RTAwXHU2QkI1XHU1QzA2XHU4OTgxXHU2Q0U4XHU1MTY1XHU2MjY3XHU4ODRDXHU3Njg0IEpTIFx1NjYyRlx1NTQyNlx1NUI4OVx1NTE2OFx1MzAwMlxyXG4gKiBcdTU0N0RcdTRFMkRcdTlBRDhcdTUzNzFcdTZBMjFcdTVGMEYgXHUyMTkyIFx1NUYzQVx1NTIzNlx1NjJFNlx1NjIyQVx1RkYxQlx1NjcyQVx1NTQ3RFx1NEUyRFx1NEY0Nlx1NTQyQlx1NkY1Q1x1NTcyOFx1OThDRVx1OTY2OSBcdTIxOTIgXHU1MTQxXHU4QkI4XHU0RjQ2XHU5NjQ0XHU1RTI2XHU4QjY2XHU1NDRBXHUzMDAyXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ3VhcmRKc1NjcmlwdChzY3JpcHQ6IHN0cmluZyk6IEV2YWxHdWFyZFJlc3VsdCB7XHJcbiAgY29uc3QgYmxvY2tlZFJlYXNvbnM6IHN0cmluZ1tdID0gW107XHJcbiAgZm9yIChjb25zdCB7IGxhYmVsLCByZSB9IG9mIERBTkdFUk9VU19KU19QQVRURVJOUykge1xyXG4gICAgaWYgKHJlLnRlc3Qoc2NyaXB0KSkgYmxvY2tlZFJlYXNvbnMucHVzaChsYWJlbCk7XHJcbiAgfVxyXG4gIHJldHVybiB7XHJcbiAgICBhbGxvd2VkOiBibG9ja2VkUmVhc29ucy5sZW5ndGggPT09IDAsXHJcbiAgICBibG9ja2VkOiBibG9ja2VkUmVhc29ucy5sZW5ndGggPiAwLFxyXG4gICAgcmVhc29uczogYmxvY2tlZFJlYXNvbnMsXHJcbiAgfTtcclxufVxyXG5cclxuLyogPT09PT09PT09PT09PT09PT09PT09IFx1NjU4N1x1NjcyQ1x1NjJBNVx1NTQ0QVx1ODEzMVx1NjU0RiA9PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbi8qKlxyXG4gKiBcdTVCRjlcdTRFRkJcdTYxMEZcdTY1ODdcdTY3MkNcdUZGMDhcdThCQ0FcdTY1QURcdTYyQTVcdTU0NEFcdTMwMDFcdTY1RTVcdTVGRDdcdTMwMDFcdTVGRUJcdTcxNjdcdTY1ODdcdTY3MkNcdTMwMDFcdTk1MTlcdThCRUYgZGV0YWlsXHVGRjA5XHU1MDVBXHU3Qzk3XHU3QzkyXHU1RUE2XHU4MTMxXHU2NTRGXHVGRjFBXHJcbiAqIFx1OTY5MFx1ODVDRlx1NUY2Mlx1NTk4MiBgdG9rZW49eHh4YFx1MzAwMWBwYXNzd29yZDogeHh4YFx1MzAwMWBCZWFyZXIgeHh4YFx1MzAwMWBBdXRob3JpemF0aW9uOiB4eHhgIFx1NzY4NFx1NzI0N1x1NkJCNVx1MzAwMlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlZGFjdFRleHQocmF3OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGlmICghcmF3KSByZXR1cm4gcmF3O1xyXG4gIHJldHVybiByYXdcclxuICAgIC5yZXBsYWNlKC8oQmVhcmVyXFxzKylbQS1aYS16MC05Ll9+Ky89LV0rL2dpLCBcIiQxKioqUkVEQUNURUQqKipcIilcclxuICAgIC5yZXBsYWNlKC8oQXV0aG9yaXphdGlvblxccypbOj1dXFxzKikoPzpCZWFyZXJcXHMrKT9bQS1aYS16MC05Ll9+Ky89LV0rL2dpLCBcIiQxKioqUkVEQUNURUQqKipcIilcclxuICAgIC5yZXBsYWNlKC8oWz8mXSg/OnRva2VufHBhc3N3b3JkfHBhc3N3ZHxzZWNyZXR8YXBpW18tXT9rZXl8YWNjZXNzX3Rva2VufHJlZnJlc2hfdG9rZW58Y2xpZW50X3NlY3JldHxhdXRoKT0pW14mXFxzXCInXSsvZ2ksIFwiJDEqKipSRURBQ1RFRCoqKlwiKVxyXG4gICAgLnJlcGxhY2UoLyhwYXNzd29yZFxccypbOj1dXFxzKlsnXCJdPylbXidcIlxccyw7XSsvZ2ksIFwiJDEqKipSRURBQ1RFRCoqKlwiKTtcclxufVxyXG5cclxuLyoqIFx1NkM0N1x1NjAzQlx1NTE2NVx1NTNFM1x1RkYxQVx1NUJGOVx1N0VEM1x1Njc4NFx1NTMxNlx1NUJGOVx1OEM2MVx1NTA1QVx1NkRGMVx1ODEzMVx1NjU0Rlx1RkYwQ1x1NUU3Nlx1OEZENFx1NTZERVx1ODEzMVx1NjU0Rlx1NTQwRVx1NzY4NFx1NTI2Rlx1NjcyQyAqL1xyXG5leHBvcnQgZnVuY3Rpb24gc2FuaXRpemUodmFsdWU6IHVua25vd24pOiB1bmtub3duIHtcclxuICByZXR1cm4gcmVkYWN0RGVlcCh2YWx1ZSk7XHJcbn1cclxuXHJcbi8qID09PT09PT09PT09PT09PT09PT09PSBTU1JGIFx1OTYzMlx1NjJBNCA9PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbi8qKlxyXG4gKiBcdTUyMjRcdTY1QURcdTRFMDBcdTRFMkEgaG9zdG5hbWUgXHU2NjJGXHU1NDI2XHU0RTNBXHUzMDBDXHU3OUMxXHU2NzA5L1x1NTZERVx1NzNBRi9cdTk0RkVcdThERUZcdTY3MkNcdTU3MzAvXHU0RTkxXHU1MTQzXHU2NTcwXHU2MzZFXHUzMDBEXHU1NzMwXHU1NzQwXHVGRjA4XHU1NDJCIElQdjQvSVB2Nlx1RkYwOVx1MzAwMlxyXG4gKiBcdTc1MjhcdTRFOEUgd2ViaG9vayAvIFx1ODFFQVx1NUI5QVx1NEU0OVx1NjI5NVx1OTAxMlx1N0I0OSBgZmV0Y2godGFyZ2V0KWAgXHU1MjREXHU3Njg0IFNTUkYgXHU2MkU2XHU2MjJBXHVGRjBDXHU5NjMyXHU2QjYyXHU4OEFCXHU1MjI5XHU3NTI4XHU4QkJGXHU5NUVFXHU1MTg1XHU3RjUxXHU4RDQ0XHU2RTkwXHUzMDAyXHJcbiAqXHJcbiAqIFx1ODk4Nlx1NzZENlx1NTczQVx1NjY2Rlx1RkYwOFx1NzcxRlx1NUI5RVx1NkUxN1x1OTAwRlx1N0VENVx1OEZDN1x1NzBCOVx1RkYwQ1x1NUZDNVx1OTg3Qlx1ODk4Nlx1NzZENlx1RkYwOVx1RkYxQVxyXG4gKiAtIElQdjQgXHU1NkRFXHU3M0FGIDEyNy4wLjAuMC84XHJcbiAqIC0gSVB2NiBcdTU2REVcdTczQUYgOjoxIFx1NTNDQVx1NTE3Nlx1NUUyNlx1NjVCOVx1NjJFQ1x1NTNGN1x1NTE5OVx1NkNENSBbOjoxXVxyXG4gKiAtIFx1NzlDMVx1NjcwOVx1N0Y1MVx1NkJCNSAxMC84XHUzMDAxMTcyLjE2LzEyXHUzMDAxMTkyLjE2OC8xNlxyXG4gKiAtIENHTkFUIDEwMC42NC8xMFxyXG4gKiAtIFx1OTRGRVx1OERFRlx1NjcyQ1x1NTczMCAvIFx1NEU5MVx1NTE0M1x1NjU3MFx1NjM2RSAxNjkuMjU0LzE2XHVGRjA4XHU1OTgyIEFXUyAxNjkuMjU0LjE2OS4yNTRcdUZGMENcdTUzRUZcdTdBODNcdTUzRDYgSUFNIFx1NTFFRFx1OEJDMVx1RkYwOVxyXG4gKiAtIElQdjQtbWFwcGVkIElQdjYgOjpmZmZmOngueC54LnhcclxuICogLSBcdTdFQzRcdTY0QUQvXHU0RkREXHU3NTU5XHU2QkI1IDIyNC80XHUzMDAxMjQwLzRcdTMwMDExOTguMTgvMTVcdTMwMDExOTIuMC4wLzI0XHJcbiAqIC0gXHU1MTY4XHU5NkY2IDAuMC4wLjBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1ByaXZhdGVPckxvb3BiYWNrSG9zdChob3N0bmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgaWYgKCFob3N0bmFtZSkgcmV0dXJuIGZhbHNlO1xyXG4gIC8vIFx1NTNCQlx1NjM4OSBJUHY2IFx1NjVCOVx1NjJFQ1x1NTNGN1x1RkYwOG5ldyBVUkwoKS5ob3N0bmFtZSBcdTVCRjkgWzo6MV0gXHU0RjFBXHU0RkREXHU3NTU5XHU2NUI5XHU2MkVDXHU1M0Y3XHVGRjA5XHJcbiAgbGV0IGggPSBob3N0bmFtZS50cmltKCkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9eXFxbfFxcXSQvZywgXCJcIik7XHJcblxyXG4gIC8vIFx1NTdERlx1NTQwRFx1RkYxQS5sb2NhbCBcdTdFRDNcdTVDM0VcdTg5QzZcdTRFM0FcdTUxODVcdTdGNTFcdUZGMDhtRE5TXHVGRjA5XHJcbiAgaWYgKGguZW5kc1dpdGgoXCIubG9jYWxcIikpIHJldHVybiB0cnVlO1xyXG4gIGlmIChoID09PSBcImxvY2FsaG9zdFwiKSByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgLy8gSVB2NiBcdTU2REVcdTczQUZcdUZGMDhcdTU0MkIgSVB2NC1tYXBwZWQgOjpmZmZmOjEyNy4wLjAuMSBcdTY2MjBcdTVDMDRcdTVGNjJcdTVGMEZcdUZGMDlcclxuICBpZiAoaCA9PT0gXCI6OjFcIiB8fCBoID09PSBcIjA6MDowOjA6MDowOjA6MVwiKSByZXR1cm4gdHJ1ZTtcclxuICBpZiAoaC5zdGFydHNXaXRoKFwiOjpmZmZmOlwiKSkge1xyXG4gICAgLy8gXHU2MjhBIDo6ZmZmZjphLmIuYy5kIFx1NjYyMFx1NUMwNFx1NTZERSBJUHY0IFx1NTQwRVx1OTAxMlx1NUY1Mlx1NTIyNFx1NjVBRFxyXG4gICAgY29uc3QgbWFwcGVkVjQgPSBoLnJlcGxhY2UoL146OmZmZmY6LywgXCJcIikucmVwbGFjZSgvXjAqKFswLTlhLWZdezEsNH0pOjAqKFswLTlhLWZdezEsNH0pJC8sIChfLCBhLCBiKSA9PiB7XHJcbiAgICAgIGNvbnN0IGlwID0gKGhleDogc3RyaW5nKSA9PiBgJHtwYXJzZUludChoZXgsIDE2KSA+PiA4fS4ke3BhcnNlSW50KGhleCwgMTYpICYgMHhmZn1gO1xyXG4gICAgICByZXR1cm4gYCR7aXAoYSl9LiR7aXAoYil9YDtcclxuICAgIH0pO1xyXG4gICAgaWYgKC9eXFxkK1xcLlxcZCtcXC5cXGQrXFwuXFxkKyQvLnRlc3QobWFwcGVkVjQpKSByZXR1cm4gaXNQcml2YXRlT3JMb29wYmFja0hvc3QobWFwcGVkVjQpO1xyXG4gICAgcmV0dXJuIHRydWU7IC8vIFx1NTE3Nlx1NEVENiA6OmZmZmY6IFx1NUY2Mlx1NUYwRlx1RkYwOFx1NTk4MiA6OmZmZmY6N2YwMDoxXHVGRjA5XHU0RTAwXHU1RjhCXHU4OUM2XHU0RTNBXHU1MTg1XHU3RjUxXHU2NjIwXHU1QzA0XHJcbiAgfVxyXG5cclxuICAvLyBJUHY2IFx1NTE3Nlx1NEVENlx1NjcyQ1x1NTczMC9cdTk0RkVcdThERUZcdTY3MkNcdTU3MzBcdUZGMDhmYzAwOjovNyBVTEFcdTMwMDFmZTgwOjovMTAgXHU5NEZFXHU4REVGXHU2NzJDXHU1NzMwXHVGRjA5XHU0RTBFXHU1MTY4XHU5NkY2XHJcbiAgaWYgKGguaW5jbHVkZXMoXCI6XCIpICYmICFoLmluY2x1ZGVzKFwiLlwiKSkge1xyXG4gICAgaWYgKGggPT09IFwiOjpcIiB8fCBoID09PSBcIjA6MDowOjA6MDowOjA6MFwiKSByZXR1cm4gdHJ1ZTtcclxuICAgIGlmICgvXmZbY2RdLy50ZXN0KGgpIHx8IC9eZmVbODlhYl0vLnRlc3QoaCkpIHJldHVybiB0cnVlOyAvLyBVTEEgLyBcdTk0RkVcdThERUZcdTY3MkNcdTU3MzBcclxuICAgIC8vIFx1OTc1RVx1NTE2OFx1NUM0MFx1NTM1NVx1NjRBRFx1NTI0RFx1N0YwMFx1RkYwOFx1NEUwRFx1NEVFNSAyIFx1NjIxNiAzIFx1NUYwMFx1NTkzNFx1RkYwOVx1NEZERFx1NUI4OFx1ODlDNlx1NEUzQVx1NTE4NVx1N0Y1MS9cdTRGRERcdTc1NTlcclxuICAgIGlmICghL15bMjNdWzAtOWEtZl17M306Ly50ZXN0KGgpKSByZXR1cm4gdHJ1ZTtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8vIElQdjQgXHU3RjUxXHU2QkI1XHU1MjI0XHU2NUFEXHJcbiAgY29uc3QgbSA9IGgubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pJC8pO1xyXG4gIGlmIChtKSB7XHJcbiAgICBjb25zdCBhID0gTnVtYmVyKG1bMV0pO1xyXG4gICAgY29uc3QgYiA9IE51bWJlcihtWzJdKTtcclxuICAgIGNvbnN0IGMgPSBOdW1iZXIobVszXSk7XHJcbiAgICBpZiAoYSA9PT0gMTApIHJldHVybiB0cnVlOyAvLyAxMC84XHJcbiAgICBpZiAoYSA9PT0gMTcyICYmIGIgPj0gMTYgJiYgYiA8PSAzMSkgcmV0dXJuIHRydWU7IC8vIDE3Mi4xNi8xMlxyXG4gICAgaWYgKGEgPT09IDE5MiAmJiBiID09PSAxNjgpIHJldHVybiB0cnVlOyAvLyAxOTIuMTY4LzE2XHJcbiAgICBpZiAoYSA9PT0gMTI3KSByZXR1cm4gdHJ1ZTsgLy8gMTI3LzggXHU1NkRFXHU3M0FGXHJcbiAgICBpZiAoYSA9PT0gMTY5ICYmIGIgPT09IDI1NCkgcmV0dXJuIHRydWU7IC8vIDE2OS4yNTQvMTYgXHU5NEZFXHU4REVGXHU2NzJDXHU1NzMwL1x1NEU5MVx1NTE0M1x1NjU3MFx1NjM2RVxyXG4gICAgaWYgKGEgPT09IDEwMCAmJiBiID49IDY0ICYmIGIgPD0gMTI3KSByZXR1cm4gdHJ1ZTsgLy8gMTAwLjY0LzEwIENHTkFUXHJcbiAgICBpZiAoYSA9PT0gMCAmJiBiID09PSAwICYmIGMgPT09IDApIHJldHVybiB0cnVlOyAvLyAwLjAuMC4wXHJcbiAgICBpZiAoYSA+PSAyMjQpIHJldHVybiB0cnVlOyAvLyBcdTdFQzRcdTY0QUQvXHU0RkREXHU3NTU5XHJcbiAgICBpZiAoYSA9PT0gMTk4ICYmIChiID09PSAxOCB8fCBiID09PSAxOSkpIHJldHVybiB0cnVlOyAvLyAxOTguMTgvMTUgXHU1N0ZBXHU1MUM2XHU2RDRCXHU4QkQ1XHJcbiAgICBpZiAoYSA9PT0gMTkyICYmIGIgPT09IDApIHJldHVybiB0cnVlOyAvLyAxOTIuMC4wLzI0XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvLyBcdTk3NUUgSVAgXHU1N0RGXHU1NDBEXHU5RUQ4XHU4QkE0XHU4OUM2XHU0RTNBXHU1MTZDXHU3RjUxXHVGRjA4XHU0RUE0XHU3NTMxXHU0RTBBXHU2RTM4IEROUyBcdTg5RTNcdTY3OTBcdUZGMDlcclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuIiwgIi8qKlxuICogU2Vzc2lvbkxvZ2dlciBcdTIwMTRcdTIwMTQgXHU0RjFBXHU4QkREXHU0RThCXHU0RUY2XHU2NUU1XHU1RkQ3XHU1NjY4XG4gKlxuICogXHU3RUY0XHU2MkE0XHU0RTAwXHU2NzYxKipcdThGREVcdThEMkZcdTc2ODRcdTRFOEJcdTRFRjZcdTZENDEqKlx1RkYwQ1x1OEJBOVx1NTkxNlx1OTBFOCBBSSAvIElERSBcdTgwRkRcdUZGMUFcbiAqIC0gXHU4QkEyXHU5NjA1XHU1QjlFXHU2NUY2XHU0RThCXHU0RUY2XHVGRjA4RXZlbnRFbWl0dGVyIFx1NUYwRlx1NjNBOFx1OTAwMVx1RkYwOVxuICogLSBcdTYyQzlcdTUzRDZcdTUzODZcdTUzRjJcdTRFOEJcdTRFRjZcdTVGRUJcdTcxNjdcdUZGMDhgdG9BcnJheWAgLyBgZXhwb3J0TWFya2Rvd25gXHVGRjA5XG4gKiAtIFx1NzUxRlx1NjIxMFx1NEVCQVx1N0M3Qlx1NTNFRlx1OEJGQlx1NzY4NFx1NjI2N1x1ODg0Q1x1OEY2OFx1OEZGOVx1RkYwOFx1NTZERVx1NjUzRVx1NTJBOFx1NEY1QyArIFx1OEJDQVx1NjVBRCArIFx1OTUxOVx1OEJFRiArIFx1NjIyQVx1NTZGRVx1RkYwOVxuICpcbiAqIFx1OEZEOVx1NjYyRlx1MzAwQ1x1OERERiBJREUgLyBcdTU5MTZcdTkwRTggQUkgXHU1MzRGXHU0RjVDXHUzMDBEXHU3Njg0XHU2RDg4XHU2MDZGXHU2MDNCXHU3RUJGXHVGRjFBXHU2ODQ2XHU2N0I2XHU2MjQwXHU2NzA5XHU1MkE4XHU0RjVDXHUzMDAxXHU4QkNBXHU2NUFEXHUzMDAxXHU5NTE5XHU4QkVGXHUzMDAxXG4gKiBcdTYyMkFcdTU2RkVcdTMwMDFcdTY1RTVcdTVGRDdcdTkwRkRcdTZDNDdcdTUxNjVcdThGRDlcdTkxQ0NcdUZGMENcdTUxOERcdTc1MzFcdTkwMDJcdTkxNERcdTVDNDJcdUZGMDhzdGRpby9IVFRQL2hhcm5lc3MvQ0xJXHVGRjA5XHU4RjZDXHU1M0QxXHU3RUQ5XHU1OTE2XHU5MEU4IEFJXHUzMDAyXG4gKi9cbmltcG9ydCB0eXBlIHtcbiAgRXZlbnRMZXZlbCxcbiAgRXZlbnRDYXRlZ29yeSxcbiAgRm9yZ2VFdmVudCxcbiAgRm9yZ2VFcnJvckV2ZW50LFxuICBTY3JlZW5zaG90RXZlbnQsXG4gIEZvcmdlQW55RXZlbnQsXG4gIEV2ZW50TGlzdGVuZXIsXG59IGZyb20gXCIuL2V2ZW50cy5qc1wiO1xuaW1wb3J0IHsgcmVkYWN0RGVlcCwgcmVkYWN0VGV4dCB9IGZyb20gXCIuL3NlY3VyaXR5LmpzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2Vzc2lvbkxvZ2dlck9wdGlvbnMge1xuICAvKiogXHU0RjFBXHU4QkREIGlkXHVGRjA4XHU3RjNBXHU3NzAxXHU4MUVBXHU1MkE4XHU3NTFGXHU2MjEwXHVGRjA5ICovXG4gIHNlc3Npb25JZD86IHN0cmluZztcbiAgLyoqIFx1NEU4Qlx1NEVGNlx1NkQ0MVx1NjcwMFx1NTkyN1x1NEZERFx1NzU1OVx1Njc2MVx1NjU3MFx1RkYwOFx1OTYzMlx1NTE4NVx1NUI1OFx1NjVFMFx1OTY1MFx1NTg5RVx1OTU3Rlx1RkYwQ1x1N0YzQVx1NzcwMSAyMDAwXHVGRjA5ICovXG4gIG1heEV2ZW50cz86IG51bWJlcjtcbiAgLyoqIFx1NjYyRlx1NTQyNlx1NTQyRlx1NzUyOFx1NjVFNVx1NUZEN1x1RkYwOGRlYnVnIFx1N0VBN1x1NTIyQlx1NEVDRFx1OEJCMFx1NUY1NVx1RkYwQ1x1NTNFQVx1NjYyRlx1N0VBN1x1NTIyQlx1NUI1N1x1NkJCNVx1NEUzQSBkZWJ1Z1x1RkYwOSAqL1xuICBlbmFibGVkPzogYm9vbGVhbjtcbn1cblxuLyoqIFx1NjVFNVx1NUZEN1x1NTE2NVx1NTNFM1x1NTNDMlx1NjU3MFx1RkYwOG1lc3NhZ2UgKyBcdTUzRUZcdTkwMDkgcGF5bG9hZFx1RkYwOSAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dFbnRyeSB7XG4gIGxldmVsPzogRXZlbnRMZXZlbDtcbiAgY2F0ZWdvcnk/OiBFdmVudENhdGVnb3J5O1xuICBtZXNzYWdlOiBzdHJpbmc7XG4gIHBheWxvYWQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuZXhwb3J0IGNsYXNzIFNlc3Npb25Mb2dnZXIge1xuICByZWFkb25seSBzZXNzaW9uSWQ6IHN0cmluZztcbiAgcHJpdmF0ZSBldmVudHM6IEZvcmdlQW55RXZlbnRbXSA9IFtdO1xuICBwcml2YXRlIGxpc3RlbmVycyA9IG5ldyBTZXQ8RXZlbnRMaXN0ZW5lcj4oKTtcbiAgcHJpdmF0ZSBzZXEgPSAwO1xuICBwcml2YXRlIG1heEV2ZW50czogbnVtYmVyO1xuICBwcml2YXRlIGVuYWJsZWQ6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3Iob3B0czogU2Vzc2lvbkxvZ2dlck9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuc2Vzc2lvbklkID0gb3B0cy5zZXNzaW9uSWQgPz8gYHNlc3NfJHtEYXRlLm5vdygpLnRvU3RyaW5nKDM2KX0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsIDgpfWA7XG4gICAgdGhpcy5tYXhFdmVudHMgPSBvcHRzLm1heEV2ZW50cyA/PyAyMDAwO1xuICAgIHRoaXMuZW5hYmxlZCA9IG9wdHMuZW5hYmxlZCA/PyB0cnVlO1xuICB9XG5cbiAgLyoqIFx1OEJBMlx1OTYwNVx1NUI5RVx1NjVGNlx1NEU4Qlx1NEVGNlx1RkYwQ1x1OEZENFx1NTZERVx1NTNENlx1NkQ4OFx1OEJBMlx1OTYwNVx1NTFGRFx1NjU3MCAqL1xuICBzdWJzY3JpYmUobGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIpOiAoKSA9PiB2b2lkIHtcbiAgICB0aGlzLmxpc3RlbmVycy5hZGQobGlzdGVuZXIpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLmxpc3RlbmVycy5kZWxldGUobGlzdGVuZXIpO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1NEUwMFx1Njc2MVx1OTAxQVx1NzUyOFx1NjVFNVx1NUZEN1x1NEU4Qlx1NEVGNiAqL1xuICBsb2coZW50cnk6IExvZ0VudHJ5KTogRm9yZ2VFdmVudCB7XG4gICAgY29uc3QgZXZlbnQ6IEZvcmdlRXZlbnQgPSB7XG4gICAgICBzZXE6IHRoaXMubmV4dFNlcSgpLFxuICAgICAgdHM6IERhdGUubm93KCksXG4gICAgICBsZXZlbDogZW50cnkubGV2ZWwgPz8gXCJpbmZvXCIsXG4gICAgICBjYXRlZ29yeTogZW50cnkuY2F0ZWdvcnkgPz8gXCJsb2dcIixcbiAgICAgIG1lc3NhZ2U6IGVudHJ5Lm1lc3NhZ2UsXG4gICAgICBwYXlsb2FkOiBlbnRyeS5wYXlsb2FkLFxuICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLmVtaXQoZXZlbnQpO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1NEUwMFx1Njc2MVx1NjgwN1x1NTFDNlx1OTUxOVx1OEJFRlx1NEU4Qlx1NEVGNlx1RkYwOFx1NUUyNlx1NjJBNVx1OTUxOVx1NTM5Rlx1NTZFMFx1NEUwRVx1ODlFM1x1OTFDQVx1RkYwQ1x1NEVBNFx1N0VEOVx1NTkxNlx1OTBFOCBBSVx1RkYwOSAqL1xuICBlcnJvcihlcnI6IE9taXQ8Rm9yZ2VFcnJvckV2ZW50W1wiZXJyb3JcIl0sIG5ldmVyPiAmIHtcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG4gICAgbGV2ZWw/OiBFdmVudExldmVsO1xuICAgIHBheWxvYWQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgfSk6IEZvcmdlRXJyb3JFdmVudCB7XG4gICAgY29uc3QgeyBtZXNzYWdlLCBsZXZlbCwgcGF5bG9hZCwgLi4uZXJyb3IgfSA9IGVycjtcbiAgICBjb25zdCBldmVudDogRm9yZ2VFcnJvckV2ZW50ID0ge1xuICAgICAgc2VxOiB0aGlzLm5leHRTZXEoKSxcbiAgICAgIHRzOiBEYXRlLm5vdygpLFxuICAgICAgbGV2ZWw6IGxldmVsID8/IFwiZXJyb3JcIixcbiAgICAgIGNhdGVnb3J5OiBcImVycm9yXCIsXG4gICAgICBtZXNzYWdlLFxuICAgICAgZXJyb3IsXG4gICAgICBwYXlsb2FkLFxuICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLmVtaXQoZXZlbnQpO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1NEUwMFx1Njc2MVx1NjIyQVx1NTZGRS9cdTU2RkVcdTcyNDdcdTRFOEJcdTRFRjYgKi9cbiAgc2NyZWVuc2hvdChpbWc6IHtcbiAgICBkYXRhVXJpOiBzdHJpbmc7XG4gICAgZnVsbFBhZ2U/OiBib29sZWFuO1xuICAgIGNhcHRpb24/OiBzdHJpbmc7XG4gIH0pOiBTY3JlZW5zaG90RXZlbnQge1xuICAgIGNvbnN0IGJ5dGVMZW5ndGggPSBpbWcuZGF0YVVyaS5yZXBsYWNlKC9eZGF0YTppbWFnZVxcL3BuZztiYXNlNjQsLywgXCJcIikubGVuZ3RoO1xuICAgIGNvbnN0IGV2ZW50OiBTY3JlZW5zaG90RXZlbnQgPSB7XG4gICAgICBzZXE6IHRoaXMubmV4dFNlcSgpLFxuICAgICAgdHM6IERhdGUubm93KCksXG4gICAgICBsZXZlbDogXCJpbmZvXCIsXG4gICAgICBjYXRlZ29yeTogXCJzY3JlZW5zaG90XCIsXG4gICAgICBtZXNzYWdlOiBpbWcuY2FwdGlvbiA/PyBgXHU2MjJBXHU1NkZFXHU1REYyXHU5MUM3XHU5NkM2ICgkeyhieXRlTGVuZ3RoICogMC43NSkgLyAxMDI0fUtCKWAsXG4gICAgICBpbWFnZToge1xuICAgICAgICBkYXRhVXJpOiBpbWcuZGF0YVVyaSxcbiAgICAgICAgYnl0ZUxlbmd0aCxcbiAgICAgICAgZnVsbFBhZ2U6IGltZy5mdWxsUGFnZSA/PyBmYWxzZSxcbiAgICAgICAgY2FwdGlvbjogaW1nLmNhcHRpb24sXG4gICAgICB9LFxuICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLmVtaXQoZXZlbnQpO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1N0NGQlx1N0VERlx1NzUxRlx1NTQ3RFx1NTQ2OFx1NjcxRlx1NEU4Qlx1NEVGNiAqL1xuICBzeXN0ZW0obWVzc2FnZTogc3RyaW5nLCBwYXlsb2FkPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBGb3JnZUV2ZW50IHtcbiAgICByZXR1cm4gdGhpcy5sb2coeyBsZXZlbDogXCJpbmZvXCIsIGNhdGVnb3J5OiBcInN5c3RlbVwiLCBtZXNzYWdlLCBwYXlsb2FkIH0pO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1NEUwMFx1NkIyMVx1NTJBOFx1NEY1Q1x1NjI2N1x1ODg0Q1x1NEU4Qlx1NEVGNiAqL1xuICBhY3Rpb24obWVzc2FnZTogc3RyaW5nLCBwYXlsb2FkPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBGb3JnZUV2ZW50IHtcbiAgICByZXR1cm4gdGhpcy5sb2coeyBsZXZlbDogXCJpbmZvXCIsIGNhdGVnb3J5OiBcImFjdGlvblwiLCBtZXNzYWdlLCBwYXlsb2FkIH0pO1xuICB9XG5cbiAgLyoqIFx1OEJCMFx1NUY1NVx1NEUwMFx1NkIyMVx1OEJDQVx1NjVBRFx1NEU4Qlx1NEVGNiAqL1xuICBkaWFnbm9zZShtZXNzYWdlOiBzdHJpbmcsIHBheWxvYWQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IEZvcmdlRXZlbnQge1xuICAgIHJldHVybiB0aGlzLmxvZyh7IGxldmVsOiBcImluZm9cIiwgY2F0ZWdvcnk6IFwiZGlhZ25vc2VcIiwgbWVzc2FnZSwgcGF5bG9hZCB9KTtcbiAgfVxuXG4gIC8qKiBcdTgzQjdcdTUzRDZcdTUxNjhcdTkwRThcdTUzODZcdTUzRjJcdTRFOEJcdTRFRjZcdUZGMDhcdTVGRUJcdTcxNjdcdUZGMDkgKi9cbiAgdG9BcnJheSgpOiBGb3JnZUFueUV2ZW50W10ge1xuICAgIHJldHVybiB0aGlzLmV2ZW50cy5zbGljZSgpO1xuICB9XG5cbiAgLyoqIFx1NjMwOVx1N0M3Qlx1NTIyQlx1OEZDN1x1NkVFNFx1NEU4Qlx1NEVGNiAqL1xuICBmaWx0ZXIoY2F0ZWdvcnk6IEV2ZW50Q2F0ZWdvcnkgfCBFdmVudENhdGVnb3J5W10pOiBGb3JnZUFueUV2ZW50W10ge1xuICAgIGNvbnN0IGNhdHMgPSBBcnJheS5pc0FycmF5KGNhdGVnb3J5KSA/IGNhdGVnb3J5IDogW2NhdGVnb3J5XTtcbiAgICByZXR1cm4gdGhpcy5ldmVudHMuZmlsdGVyKChlKSA9PiBjYXRzLmluY2x1ZGVzKGUuY2F0ZWdvcnkpKTtcbiAgfVxuXG4gIC8qKiBcdTZFMDVcdTdBN0FcdTRFOEJcdTRFRjZcdTZENDEgKi9cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgdGhpcy5ldmVudHMgPSBbXTtcbiAgICB0aGlzLnNlcSA9IDA7XG4gIH1cblxuICAvKiogXHU1QkZDXHU1MUZBXHU0RTNBIG1hcmtkb3duXHVGRjA4XHU0RjlCXHU1OTE2XHU5MEU4IEFJIC8gUFIgXHU4QkM0XHU4QkJBIC8gXHU1MjM2XHU1NEMxXHU2RDg4XHU4RDM5XHVGRjA5XHVGRjBDXHU1QkY5XHU2RDg4XHU2MDZGXHU0RTBFIHBheWxvYWQgXHU4MTMxXHU2NTRGXHU5NjMyXHU0RUU0XHU3MjRDXHU2Q0M0XHU5NzMyICovXG4gIGV4cG9ydE1hcmtkb3duKG9wdHM6IHsgdGl0bGU/OiBzdHJpbmc7IGluY2x1ZGVTY3JlZW5zaG90cz86IGJvb2xlYW4gfSA9IHt9KTogc3RyaW5nIHtcbiAgICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcbiAgICBsaW5lcy5wdXNoKGAjICR7b3B0cy50aXRsZSA/PyBcIkZvcmdlIFx1NEYxQVx1OEJERFx1NEU4Qlx1NEVGNlx1NjVFNVx1NUZEN1wifWApO1xuICAgIGxpbmVzLnB1c2goYCoqU2Vzc2lvbioqOiAke3RoaXMuc2Vzc2lvbklkfSB8ICoqXHU0RThCXHU0RUY2XHU2NTcwKio6ICR7dGhpcy5ldmVudHMubGVuZ3RofWApO1xuICAgIGxpbmVzLnB1c2goXCJcIik7XG4gICAgZm9yIChjb25zdCBlIG9mIHRoaXMuZXZlbnRzKSB7XG4gICAgICBjb25zdCB0ID0gbmV3IERhdGUoZS50cykudG9JU09TdHJpbmcoKS5yZXBsYWNlKFwiVFwiLCBcIiBcIikuc2xpY2UoMCwgMTkpO1xuICAgICAgY29uc3QgdGFnID0gYFske2UubGV2ZWwudG9VcHBlckNhc2UoKX0vJHtlLmNhdGVnb3J5fV1gO1xuICAgICAgY29uc3QgbXNnID0gcmVkYWN0VGV4dChlLm1lc3NhZ2UpO1xuICAgICAgaWYgKGUuY2F0ZWdvcnkgPT09IFwiZXJyb3JcIikge1xuICAgICAgICBjb25zdCBlcnIgPSAoZSBhcyBGb3JnZUVycm9yRXZlbnQpLmVycm9yO1xuICAgICAgICBsaW5lcy5wdXNoKGAtIFxcYCR7dH1cXGAgKioke3RhZ30qKiAke21zZ31gKTtcbiAgICAgICAgbGluZXMucHVzaChgICAtIFx1OTUxOVx1OEJFRlx1NzgwMTogXFxgJHtlcnIuY29kZX1cXGAgfCBcdTY4MzlcdTU2RTA6ICR7ZXJyLnJlYXNvbn1gKTtcbiAgICAgICAgaWYgKGVyci5leHBsYW5hdGlvbikgbGluZXMucHVzaChgICAtIFx1NTM5Rlx1NTZFMDogJHtyZWRhY3RUZXh0KGVyci5leHBsYW5hdGlvbil9YCk7XG4gICAgICAgIGlmIChlcnIuc3VnZ2VzdGlvbikgbGluZXMucHVzaChgICAtIFx1NUVGQVx1OEJBRTogJHtyZWRhY3RUZXh0KGVyci5zdWdnZXN0aW9uKX1gKTtcbiAgICAgIH0gZWxzZSBpZiAoZS5jYXRlZ29yeSA9PT0gXCJzY3JlZW5zaG90XCIpIHtcbiAgICAgICAgY29uc3QgaW1nID0gKGUgYXMgU2NyZWVuc2hvdEV2ZW50KS5pbWFnZTtcbiAgICAgICAgbGluZXMucHVzaChgLSBcXGAke3R9XFxgICoqJHt0YWd9KiogJHttc2d9YCk7XG4gICAgICAgIGlmIChvcHRzLmluY2x1ZGVTY3JlZW5zaG90cykge1xuICAgICAgICAgIGxpbmVzLnB1c2goYCAgLSAhW1x1NjIyQVx1NTZGRV0oLi9mb3JnZS1ldmVudC0ke2Uuc2VxfS5wbmcpYCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpbmVzLnB1c2goYC0gXFxgJHt0fVxcYCAqKiR7dGFnfSoqICR7bXNnfWApO1xuICAgICAgfVxuICAgICAgaWYgKGUucGF5bG9hZCAmJiBPYmplY3Qua2V5cyhlLnBheWxvYWQpLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBwID0gSlNPTi5zdHJpbmdpZnkocmVkYWN0RGVlcChlLnBheWxvYWQpKTtcbiAgICAgICAgaWYgKHAubGVuZ3RoIDw9IDQwMCkgbGluZXMucHVzaChgICAtIHBheWxvYWQ6IFxcYCR7cH1cXGBgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICAvKiogXHU3NTFGXHU2MjEwXHU3RUFGXHU2NTg3XHU2NzJDXHU2MjY3XHU4ODRDXHU4RjY4XHU4RkY5XHVGRjA4XHU0RjlCXHU2NUU1XHU1RkQ3L1x1N0VDOFx1N0FFRlx1RkYwOSAqL1xuICB0b1RpbWVsaW5lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZXZlbnRzXG4gICAgICAubWFwKChlKSA9PiB7XG4gICAgICAgIGNvbnN0IHQgPSBuZXcgRGF0ZShlLnRzKS50b0lTT1N0cmluZygpLnJlcGxhY2UoXCJUXCIsIFwiIFwiKS5zbGljZSgxMSwgMTkpO1xuICAgICAgICByZXR1cm4gYCR7dH0gWyR7ZS5sZXZlbH1dICR7ZS5jYXRlZ29yeX06ICR7ZS5tZXNzYWdlfWA7XG4gICAgICB9KVxuICAgICAgLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBwcml2YXRlIG5leHRTZXEoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gKyt0aGlzLnNlcTtcbiAgfVxuXG4gIHByaXZhdGUgZW1pdDxUIGV4dGVuZHMgRm9yZ2VBbnlFdmVudD4oZXZlbnQ6IFQpOiBUIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCkgcmV0dXJuIGV2ZW50O1xuICAgIHRoaXMuZXZlbnRzLnB1c2goZXZlbnQpO1xuICAgIGlmICh0aGlzLmV2ZW50cy5sZW5ndGggPiB0aGlzLm1heEV2ZW50cykge1xuICAgICAgdGhpcy5ldmVudHMgPSB0aGlzLmV2ZW50cy5zbGljZSh0aGlzLmV2ZW50cy5sZW5ndGggLSB0aGlzLm1heEV2ZW50cyk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbCBvZiB0aGlzLmxpc3RlbmVycykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbChldmVudCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gXHU1MzU1XHU0RTJBXHU3NkQxXHU1NDJDXHU1NjY4XHU1RjAyXHU1RTM4XHU0RTBEXHU1RjcxXHU1NENEXHU0RThCXHU0RUY2XHU2RDQxXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBldmVudDtcbiAgfVxufVxuIiwgIi8qKlxyXG4gKiBGb3JnZU1DUCBcdTIwMTRcdTIwMTQgTUNQIFx1NjcwRFx1NTJBMVx1NTkwNFx1NzQwNlx1NTY2OFx1RkYwOFx1NTM0Rlx1OEJBRVx1NjVFMFx1NTE3M1x1RkYwOVxyXG4gKlxyXG4gKiBcdTUxODVcdTkwRThcdTVCOUVcdTczQjBcdTVERTVcdTUxNzdcdTUyMDZcdTUzRDFcdTkwM0JcdThGOTFcdTMwMDJcdTRFMEFcdTVDNDJcdTUzRUZcdTc1MjhcdTRFMERcdTU0MENcdTc2ODRcdTRGMjBcdThGOTNcdTVDNDJcdUZGMDhzdGRpby9IVFRQL1NTRVx1RkYwOVx1NTMwNVx1ODhDNVx1RkYwQ1xyXG4gKiBcdTRGN0ZcdTUxNzZcdTUzRUZcdTYzQTVcdTUxNjUgZGVlcHNlZWsgaGFybmVzc1x1MzAwMWNuYi5jb29sXHUzMDAxQ2xhdWRlIERlc2t0b3AgXHU3QjQ5XHU0RUZCXHU2MTBGIE1DUCBcdTVCQTJcdTYyMzdcdTdBRUZcdTMwMDJcclxuICovXHJcbmltcG9ydCB7IEZvcmdlQnJvd3NlciB9IGZyb20gXCJAb3BlbmxpdWxhbi9jb3JlXCI7XHJcbmltcG9ydCB7IFBsYXl3cmlnaHRFbmdpbmUgfSBmcm9tIFwiQG9wZW5saXVsYW4vZW5naW5lc1wiO1xyXG5pbXBvcnQgeyBEaWFnbm9zaXNDZW50ZXIgfSBmcm9tIFwiQG9wZW5saXVsYW4vZGlhZ25vc2lzXCI7XHJcbmltcG9ydCB7IGNvbXBhY3RTbmFwc2hvdCB9IGZyb20gXCJAb3BlbmxpdWxhbi90b2tlblwiO1xyXG5pbXBvcnQgdHlwZSB7IFN0ZWFsdGhPcHRpb25zIH0gZnJvbSBcIkBvcGVubGl1bGFuL3N0ZWFsdGhcIjtcclxuaW1wb3J0IHsgVE9PTFMsIG9rUmVzdWx0LCBlcnJSZXN1bHQsIHR5cGUgVG9vbFJlc3VsdCwgdHlwZSBNY3BUb29sU2NoZW1hIH0gZnJvbSBcIi4vdG9vbHMuanNcIjtcclxuaW1wb3J0IHtcclxuICBydW5Nb2RsZW5zLFxyXG4gIGZvcm1hdFZpc2lvbkV2aWRlbmNlLFxyXG4gIGZvcm1hdFZpc2lvbkJyaWVmLFxyXG4gIHJlc29sdmVNb2RsZW5zQ2xpLFxyXG4gIHJ1bk9wZW5Db2RlVmlzaW9uLFxyXG4gIHR5cGUgVmlzaW9uUmVzdWx0LFxyXG59IGZyb20gXCJAb3BlbmxpdWxhbi92aXNpb25cIjtcclxuaW1wb3J0IHsgU2Vzc2lvbkxvZ2dlciB9IGZyb20gXCIuL2xvZ2dlci5qc1wiO1xyXG5pbXBvcnQgeyBidWlsZEFJTWVzc2FnZSwgbWVzc2FnZVRvQ29udGVudCwgdHlwZSBBSU1lc3NhZ2UgfSBmcm9tIFwiLi9tZXNzYWdlLmpzXCI7XHJcbmltcG9ydCB0eXBlIHsgRm9yZ2VBbnlFdmVudCB9IGZyb20gXCIuL2V2ZW50cy5qc1wiO1xyXG5pbXBvcnQgeyBndWFyZEpzU2NyaXB0LCByZWRhY3RVcmwsIHJlZGFjdERlZXAgfSBmcm9tIFwiLi9zZWN1cml0eS5qc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGb3JnZU1jcE9wdGlvbnMge1xyXG4gIC8qKiBcdTY1RTBcdTU5MzRcdTZBMjFcdTVGMEYgKi9cclxuICBoZWFkbGVzcz86IGJvb2xlYW47XHJcbiAgLyoqIENEUCBcdThGREVcdTYzQTVcdTU3MzBcdTU3NDAgKi9cclxuICBjb25uZWN0VXJsPzogc3RyaW5nO1xyXG4gIC8qKiBcdTRGMUFcdThCRERcdTY1RTVcdTVGRDdcdTU2NjhcdUZGMDhcdTdGM0FcdTc3MDFcdTgxRUFcdTUyQThcdTUyMUJcdTVFRkFcdUZGMDkgKi9cclxuICBsb2dnZXI/OiBTZXNzaW9uTG9nZ2VyO1xyXG4gIC8qKiBcdTRFOEJcdTRFRjZcdTZENDFcdTY3MDBcdTU5MjdcdTRGRERcdTc1NTlcdTY3NjFcdTY1NzAgKi9cclxuICBtYXhFdmVudHM/OiBudW1iZXI7XHJcbiAgLyoqIFx1OTYzMlx1NjhDMFx1NkQ0Qlx1OTE0RFx1N0Y2RVx1RkYwOFx1NTNFRlx1OTAwOVx1RkYwQ1x1OUVEOFx1OEJBNFx1NTE3M1x1OTVFRFx1RkYwOSAqL1xyXG4gIHN0ZWFsdGg/OiBTdGVhbHRoT3B0aW9ucztcclxuICAvKiogXHU4OUM2XHU4OUM5XHU2ODY1XHU5MTREXHU3RjZFXHVGRjA4XHU1M0VGXHU5MDA5XHVGRjA5XHVGRjFBbW9kbGVucyBcdTVGMTVcdTY0Q0UgQ0xJIFx1OERFRlx1NUY4NCAvIFx1OEQ4NVx1NjVGNlx1RkYwOFx1OUVEOFx1OEJBNCAxODBzXHVGRjA5LyBvcGVuY29kZSBcdTc2RjRcdThGREVcdTU2REVcdTkwMDBcdUZGMDhcdTUzRUZcdTkwMDlcdUZGMDkgKi9cclxuICB2aXNpb24/OiB7XHJcbiAgICBjbGlQYXRoPzogc3RyaW5nO1xyXG4gICAgdGltZW91dE1zPzogbnVtYmVyO1xyXG4gICAgLyoqIG1vZGxlbnMgXHU1RjE1XHU2NENFXHU0RTBEXHU1M0VGXHU3NTI4L1x1NkIyMFx1OEQzOVx1NjVGNlx1NjYyRlx1NTQyNlx1NzUyOFx1NjcyQ1x1NjczQSBvcGVuY29kZSBcdTc2RjRcdThGREVcdTU2REVcdTkwMDBcdUZGMDhcdTlFRDhcdThCQTQgdHJ1ZVx1RkYwOSAqL1xyXG4gICAgb3BlbmNvZGVGYWxsYmFjaz86IGJvb2xlYW47XHJcbiAgICAvKiogXHU1NkRFXHU5MDAwXHU2QTIxXHU1NzhCXHU2RTA1XHU1MzU1XHVGRjA4XHU5RUQ4XHU4QkE0IG9wZW5jb2RlLWdvIHZpc2lvbi1leHAgXHUyMTkyIGNvcGlsb3QgXHUyMTkyIGRlZXBzZWVrIFx1ODlDNlx1ODlDOVx1RkYwOSAqL1xyXG4gICAgb3BlbmNvZGVNb2RlbHM/OiBzdHJpbmdbXTtcclxuICAgIC8qKiBvcGVuY29kZSBcdTUzRUZcdTYyNjdcdTg4NENcdTY1ODdcdTRFRjZcdThERUZcdTVGODRcdUZGMDhcdTlFRDhcdThCQTQgUEFUSCBcdTY3RTVcdTYyN0VcdUZGMDkgKi9cclxuICAgIG9wZW5jb2RlQmluPzogc3RyaW5nO1xyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGb3JnZU1jcCB7XHJcbiAgcmVhZG9ubHkgdG9vbHM6IE1jcFRvb2xTY2hlbWFbXSA9IFRPT0xTO1xyXG4gIC8qKiBcdTRGMUFcdThCRERcdTRFOEJcdTRFRjZcdTY1RTVcdTVGRDdcdTU2NjggXHUyMDE0XHUyMDE0IFx1NEY5Qlx1NTkxNlx1OTBFOCBBSSAvIElERSBcdThCQTJcdTk2MDVcdTU0OENcdTYyQzlcdTUzRDZcdTRFOEJcdTRFRjZcdTZENDEgKi9cclxuICByZWFkb25seSBsb2dnZXI6IFNlc3Npb25Mb2dnZXI7XHJcbiAgcHJpdmF0ZSBicm93c2VyPzogRm9yZ2VCcm93c2VyO1xyXG4gIHByaXZhdGUgZGlhZ25vc2lzPzogRGlhZ25vc2lzQ2VudGVyO1xyXG5cclxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG9wdHM6IEZvcmdlTWNwT3B0aW9ucyA9IHt9KSB7XHJcbiAgICB0aGlzLmxvZ2dlciA9IG9wdHMubG9nZ2VyID8/IG5ldyBTZXNzaW9uTG9nZ2VyKHsgbWF4RXZlbnRzOiBvcHRzLm1heEV2ZW50cyB9KTtcclxuICB9XHJcblxyXG4gIC8qKiBcdTc1MUZcdTU0N0RcdTU0NjhcdTY3MUZcdUZGMUFcdTc4NkVcdTRGRERcdTZENEZcdTg5QzhcdTU2NjhcdTVERjJcdTVDMzFcdTdFRUEgKi9cclxuICBwcml2YXRlIGFzeW5jIGVuc3VyZUJyb3dzZXIoKTogUHJvbWlzZTxGb3JnZUJyb3dzZXI+IHtcclxuICAgIGlmICghdGhpcy5icm93c2VyKSB7XHJcbiAgICAgIGNvbnN0IGVuZ2luZSA9IG5ldyBQbGF5d3JpZ2h0RW5naW5lKHtcclxuICAgICAgICBoZWFkbGVzczogdGhpcy5vcHRzLmhlYWRsZXNzID8/IHRydWUsXHJcbiAgICAgICAgY29ubmVjdFVybDogdGhpcy5vcHRzLmNvbm5lY3RVcmwsXHJcbiAgICAgICAgc3RlYWx0aDogdGhpcy5vcHRzLnN0ZWFsdGgsXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aGlzLmJyb3dzZXIgPSBuZXcgRm9yZ2VCcm93c2VyKGVuZ2luZSk7XHJcbiAgICAgIGF3YWl0IHRoaXMuYnJvd3Nlci5zdGFydCgpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXMuYnJvd3NlcjtcclxuICB9XHJcblxyXG4gIC8qKiBcdTY4MzhcdTVGQzNcdUZGMUFcdTUyMDZcdTUzRDFcdTVERTVcdTUxNzdcdThDMDNcdTc1MjggKi9cclxuICBhc3luYyBjYWxsVG9vbChuYW1lOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogUHJvbWlzZTxUb29sUmVzdWx0PiB7XHJcbiAgICBjb25zdCB0MCA9IERhdGUubm93KCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBcdThCQjBcdTVGNTVcdTVERTVcdTUxNzdcdThDMDNcdTc1MjhcdTVGMDBcdTU5Q0JcdUZGMDhzeXN0ZW0gXHU0RThCXHU0RUY2XHVGRjBDXHU0RjlCXHU1OTE2XHU5MEU4IEFJIFx1OEZGRFx1OEUyQVx1RkYwOVxyXG4gICAgICB0aGlzLmxvZ2dlci5sb2coeyBsZXZlbDogXCJkZWJ1Z1wiLCBjYXRlZ29yeTogXCJzeXN0ZW1cIiwgbWVzc2FnZTogYFx1OEMwM1x1NzUyOFx1NURFNVx1NTE3NyAke25hbWV9YCwgcGF5bG9hZDogeyBhcmdzOiB0aGlzLnNhZmVBcmdzKGFyZ3MpIH0gfSk7XHJcblxyXG4gICAgICBsZXQgcmVzdWx0OiBUb29sUmVzdWx0O1xyXG4gICAgICBzd2l0Y2ggKG5hbWUpIHtcclxuICAgICAgICBjYXNlIFwib2JzZXJ2ZVwiOiB7XHJcbiAgICAgICAgICBjb25zdCBiID0gYXdhaXQgdGhpcy5lbnN1cmVCcm93c2VyKCk7XHJcbiAgICAgICAgICBjb25zdCBzbmFwID0gYXdhaXQgYi5vYnNlcnZlKHsgbWF4Tm9kZXM6IChhcmdzLm1heE5vZGVzIGFzIG51bWJlcikgPz8gMjAwLCBtYXhUZXh0TGVuZ3RoOiAoYXJncy5tYXhUZXh0TGVuZ3RoIGFzIG51bWJlcikgPz8gODAgfSk7XHJcbiAgICAgICAgICByZXN1bHQgPSBva1Jlc3VsdChjb21wYWN0U25hcHNob3Qoc25hcCksIHsgdXJsOiBzbmFwLnVybCwgdGl0bGU6IHNuYXAudGl0bGUsIHN0YXRzOiBzbmFwLnN0YXRzIH0pO1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIubG9nKHsgY2F0ZWdvcnk6IFwiYWN0aW9uXCIsIG1lc3NhZ2U6IGBvYnNlcnZlICR7c25hcC51cmx9ICgke3NuYXAuc3RhdHM/LmVtaXR0ZWROb2RlcyA/PyAwfSBcdTUzRUZcdTRFQTRcdTRFOTJcdTgyODJcdTcwQjkpYCB9KTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2FzZSBcImFjdFwiOiB7XHJcbiAgICAgICAgICBjb25zdCBiID0gYXdhaXQgdGhpcy5lbnN1cmVCcm93c2VyKCk7XHJcbiAgICAgICAgICBjb25zdCBhY3Rpb24gPSB0aGlzLm5vcm1hbGl6ZUFjdGlvbihhcmdzKTtcclxuICAgICAgICAgIGNvbnN0IGFjdFJlc3VsdCA9IGF3YWl0IGIuYWN0KGFjdGlvbiBhcyBhbnkpO1xyXG4gICAgICAgICAgY29uc3QgbGluZXMgPSBbYFx1NTJBOFx1NEY1QzogJHthY3RSZXN1bHQudHlwZX1gXTtcclxuICAgICAgICAgIGlmIChhY3RSZXN1bHQub2spIHtcclxuICAgICAgICAgICAgbGluZXMucHVzaChgXHUyNzEzICR7YWN0UmVzdWx0LnN1bW1hcnl9YCk7XHJcbiAgICAgICAgICAgIGlmIChhY3RSZXN1bHQuZGlhZ25vc3RpY3M/Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgIGxpbmVzLnB1c2goYFx1MjZBMCBcdTUyQThcdTRGNUNcdTU0MEVcdTY4QzBcdTZENEJcdTUyMzAgJHthY3RSZXN1bHQuZGlhZ25vc3RpY3MubGVuZ3RofSBcdTY3NjFcdTk4NzVcdTk3NjJcdTVGMDJcdTVFMzg6YCk7XHJcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBkIG9mIGFjdFJlc3VsdC5kaWFnbm9zdGljcy5zbGljZSgwLCA1KSkgbGluZXMucHVzaChgICAtIFske2Qua2luZH1dICR7ZC5tZXNzYWdlfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsaW5lcy5wdXNoKGBcdTI3MTcgJHthY3RSZXN1bHQuc3VtbWFyeX1gKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGxpbmVzLnB1c2goYFx1ODAxN1x1NjVGNiAke2FjdFJlc3VsdC5kdXJhdGlvbk1zfW1zYCk7XHJcbiAgICAgICAgICByZXN1bHQgPSBhY3RSZXN1bHQub2sgPyBva1Jlc3VsdChsaW5lcy5qb2luKFwiXFxuXCIpLCB7IGRhdGE6IGFjdFJlc3VsdC5kYXRhIH0pIDogZXJyUmVzdWx0KGxpbmVzLmpvaW4oXCJcXG5cIikpO1xyXG5cclxuICAgICAgICAgIC8vIFx1NTJBOFx1NEY1Q1x1NEU4Qlx1NEVGNlx1RkYxQVx1NjIxMFx1NTI5Ri9cdTU5MzFcdThEMjVcdTkwRkRcdTZDODlcdTZEQzBcdTRFM0FcdTdFRDNcdTY3ODRcdTUzMTZcdTRFOEJcdTRFRjZcdUZGMDhcdTRGOUJcdTU5MTZcdTkwRTggQUkgXHU4RkZEXHU4RTJBXHU2MjY3XHU4ODRDXHU4RjY4XHU4RkY5XHVGRjA5XHJcbiAgICAgICAgICBpZiAoYWN0UmVzdWx0Lm9rKSB7XHJcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmFjdGlvbihgXHU1MkE4XHU0RjVDICR7YWN0UmVzdWx0LnR5cGV9IFx1NjIxMFx1NTI5RjogJHthY3RSZXN1bHQuc3VtbWFyeX1gLCB7IHR5cGU6IGFjdFJlc3VsdC50eXBlLCBkdXJhdGlvbk1zOiBhY3RSZXN1bHQuZHVyYXRpb25NcyB9KTtcclxuICAgICAgICAgICAgaWYgKGFjdFJlc3VsdC5kaWFnbm9zdGljcz8ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZGlhZ25vc2UoYFx1NTJBOFx1NEY1Q1x1NTQwRVx1NjhDMFx1NkQ0Qlx1NTIzMCAke2FjdFJlc3VsdC5kaWFnbm9zdGljcy5sZW5ndGh9IFx1Njc2MVx1OTg3NVx1OTc2Mlx1NUYwMlx1NUUzOGAsIHtcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiBhY3RSZXN1bHQuZGlhZ25vc3RpY3Muc2xpY2UoMCwgNSkubWFwKChkKSA9PiAoeyBraW5kOiBkLmtpbmQsIG1lc3NhZ2U6IGQubWVzc2FnZSB9KSksXHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIFx1NjgwN1x1NTFDNlx1OTUxOVx1OEJFRlx1NEU4Qlx1NEVGNlx1RkYxQVx1NUUyNlx1NjJBNVx1OTUxOVx1NTM5Rlx1NTZFMFx1NEUwRVx1ODlFM1x1OTFDQVx1RkYwQ1x1NEVBNFx1N0VEOVx1NTkxNlx1OTBFOCBBSVxyXG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcih7XHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogYFx1NTJBOFx1NEY1QyAke2FjdFJlc3VsdC50eXBlfSBcdTU5MzFcdThEMjU6ICR7YWN0UmVzdWx0LnN1bW1hcnl9YCxcclxuICAgICAgICAgICAgICBjb2RlOiB0aGlzLm1hcEVycm9yQ29kZShhY3RSZXN1bHQudHlwZSksXHJcbiAgICAgICAgICAgICAgcmVhc29uOiB0aGlzLm1hcEVycm9yUmVhc29uKGFjdFJlc3VsdC5zdW1tYXJ5LCBhY3RSZXN1bHQuZGlhZ25vc3RpY3MpLFxyXG4gICAgICAgICAgICAgIHJhdzogYWN0UmVzdWx0LnN1bW1hcnksXHJcbiAgICAgICAgICAgICAgZXhwbGFuYXRpb246IHRoaXMuYnVpbGRFeHBsYW5hdGlvbihhY3RSZXN1bHQuc3VtbWFyeSwgYWN0UmVzdWx0LmRpYWdub3N0aWNzKSxcclxuICAgICAgICAgICAgICBzdWdnZXN0aW9uOiB0aGlzLmJ1aWxkU3VnZ2VzdGlvbihhY3RSZXN1bHQuc3VtbWFyeSksXHJcbiAgICAgICAgICAgICAgZGV0YWlsOiBhY3RSZXN1bHQuZXJyb3IsXHJcbiAgICAgICAgICAgICAgZmluZGluZ3M6IChhY3RSZXN1bHQuZGlhZ25vc3RpY3MgPz8gW10pLnNsaWNlKDAsIDUpLm1hcCgoZCkgPT4gKHtcclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBkLmtpbmQsXHJcbiAgICAgICAgICAgICAgICBzZXZlcml0eTogZC5zZXZlcml0eSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGQubWVzc2FnZSxcclxuICAgICAgICAgICAgICB9KSksXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYXNlIFwiZGlhZ25vc2VcIjoge1xyXG4gICAgICAgICAgY29uc3QgYiA9IGF3YWl0IHRoaXMuZW5zdXJlQnJvd3NlcigpO1xyXG4gICAgICAgICAgY29uc3QgcmVwb3J0ID0gYXdhaXQgYi5jYXB0dXJlRGlhZ25vc3RpY3MoKTtcclxuICAgICAgICAgIC8vIFx1NzUyOCBkaWFnbm9zaXMgXHU0RTJEXHU1RkMzXHU3NTFGXHU2MjEwXHU2NDU4XHU4OTgxXHVGRjA4Y29yZSBcdTRFMEUgZGlhZ25vc2lzIFx1NzY4NFx1NjJBNVx1NTQ0QVx1N0M3Qlx1NTc4Qlx1NURGMlx1NUJGOVx1OUY1MFx1RkYwQ1x1NjVFMFx1OTcwMFx1NUYzQVx1OEY2Q1x1RkYwOVxyXG4gICAgICAgICAgY29uc3QgeyBzdW1tYXJpemUgfSA9IGF3YWl0IGltcG9ydChcIkBvcGVubGl1bGFuL2RpYWdub3Npc1wiKTtcclxuICAgICAgICAgIGNvbnN0IHN1bW1hcnkgPSBzdW1tYXJpemUocmVwb3J0KTtcclxuICAgICAgICAgIGNvbnN0IGxpbmVzID0gW2AjIFx1OEJDQVx1NjVBRFx1N0VEM1x1Njc5QyAoJHtzdW1tYXJ5LmhlYWx0aHkgPyBcIlx1NTA2NVx1NUVCN1wiIDogXCJcdTVCNThcdTU3MjhcdTk1RUVcdTk4OThcIn0pYF07XHJcbiAgICAgICAgICBpZiAoc3VtbWFyeS5pc3N1ZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGxpbmVzLnB1c2goXCJcdTY3MkFcdTUzRDFcdTczQjBcdTk1MTlcdThCRUZcdUZGMENcdTk4NzVcdTk3NjJcdThGRDBcdTg4NENcdTZCNjNcdTVFMzhcdTMwMDJcIik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBmb3IgKGNvbnN0IGlzc3VlIG9mIHN1bW1hcnkuaXNzdWVzKSB7XHJcbiAgICAgICAgICAgIGxpbmVzLnB1c2goYC0gWyR7aXNzdWUuY2F0ZWdvcnl9LyR7aXNzdWUuc2V2ZXJpdHl9XSAke2lzc3VlLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoc3VtbWFyeS5zdWdnZXN0aW9ucy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgbGluZXMucHVzaChgXFxuIyMgXHU1RUZBXHU4QkFFYCk7XHJcbiAgICAgICAgICAgIHN1bW1hcnkuc3VnZ2VzdGlvbnMuZm9yRWFjaCgocywgaSkgPT4gbGluZXMucHVzaChgJHtpICsgMX0uICR7c31gKSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXN1bHQgPSBva1Jlc3VsdChsaW5lcy5qb2luKFwiXFxuXCIpLCB7XHJcbiAgICAgICAgICAgIGlzc3Vlczogc3VtbWFyeS5pc3N1ZXMsXHJcbiAgICAgICAgICAgIGNvbnNvbGU6IHJlcG9ydC5jb25zb2xlLmxlbmd0aCxcclxuICAgICAgICAgICAgbmV0d29yazogcmVwb3J0Lm5ldHdvcmsubGVuZ3RoLFxyXG4gICAgICAgICAgICBkb206IHJlcG9ydC5kb20ubGVuZ3RoLFxyXG4gICAgICAgICAgICBqc0V4Y2VwdGlvbnM6IHJlcG9ydC5qc0V4Y2VwdGlvbnMubGVuZ3RoLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICB0aGlzLmxvZ2dlci5kaWFnbm9zZShgXHU4QkNBXHU2NUFEXHU1QjhDXHU2MjEwOiAke3N1bW1hcnkuaGVhbHRoeSA/IFwiXHU1MDY1XHU1RUI3XCIgOiBgJHtzdW1tYXJ5Lmlzc3Vlcy5sZW5ndGh9IFx1Njc2MVx1OTVFRVx1OTg5OGB9YCwge1xyXG4gICAgICAgICAgICBoZWFsdGh5OiBzdW1tYXJ5LmhlYWx0aHksXHJcbiAgICAgICAgICAgIGlzc3Vlczogc3VtbWFyeS5pc3N1ZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICBzdWdnZXN0aW9uczogc3VtbWFyeS5zdWdnZXN0aW9ucy5sZW5ndGgsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2FzZSBcImV2YWxcIjoge1xyXG4gICAgICAgICAgY29uc3QgYiA9IGF3YWl0IHRoaXMuZW5zdXJlQnJvd3NlcigpO1xyXG4gICAgICAgICAgY29uc3Qgc2NyaXB0ID0gU3RyaW5nKGFyZ3Muc2NyaXB0KTtcclxuICAgICAgICAgIC8vIFx1NUI4OVx1NTE2OFx1NTJBMFx1NTZGQVx1RkYxQVx1NjJFNlx1NjIyQVx1OUFEOFx1NTM3MVx1NkNFOFx1NTE2NVx1ODExQVx1NjcyQ1x1RkYwOFx1NjU4N1x1NEVGNlx1N0NGQlx1N0VERi9cdTVCNTBcdThGREJcdTdBMEIvXHU2RTE3XHU5MDBGXHU1QzFEXHU4QkQ1XHVGRjA5XHVGRjBDXHU5NjMyXHU2M0QwXHU2NzQzXHJcbiAgICAgICAgICBjb25zdCBndWFyZCA9IGd1YXJkSnNTY3JpcHQoc2NyaXB0KTtcclxuICAgICAgICAgIGlmIChndWFyZC5ibG9ja2VkKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IGVyclJlc3VsdChcclxuICAgICAgICAgICAgICBgZXZhbCBcdTg4QUJcdTVCODlcdTUxNjhcdTYyRTZcdTYyMkFcdUZGMUFcdTgxMUFcdTY3MkNcdTU0N0RcdTRFMkRcdTlBRDhcdTUzNzFcdTY0Q0RcdTRGNUMgWyR7KGd1YXJkLnJlYXNvbnMgPz8gW10pLmpvaW4oXCIsIFwiKX1dXHUzMDAyYCArXHJcbiAgICAgICAgICAgICAgICBgXFxuXHU0RTNBXHU5NjMyXHU2M0QwXHU2NzQzL1x1NkUxN1x1OTAwRlx1RkYwQ1x1Nzk4MVx1NkI2Mlx1OTAxQVx1OEZDNyBldmFsIFx1NkNFOFx1NTE2NVx1NjU4N1x1NEVGNlx1N0NGQlx1N0VERlx1OEJCRlx1OTVFRVx1MzAwMVx1NUI1MFx1OEZEQlx1N0EwQlx1NjI2N1x1ODg0Q1x1NjIxNlx1N0NGQlx1N0VERlx1N0VBN1x1NjRDRFx1NEY1Q1x1MzAwMmBcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3Ioe1xyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGBldmFsIFx1ODhBQlx1NUI4OVx1NTE2OFx1NjJFNlx1NjIyQTogJHtndWFyZC5yZWFzb25zPy5qb2luKFwiLCBcIil9YCxcclxuICAgICAgICAgICAgICBjb2RlOiBcIkVWQUxfQkxPQ0tFRFwiLFxyXG4gICAgICAgICAgICAgIHJlYXNvbjogXCJkYW5nZXJvdXMtc2NyaXB0XCIsXHJcbiAgICAgICAgICAgICAgcmF3OiBzY3JpcHQuc2xpY2UoMCwgMzAwKSxcclxuICAgICAgICAgICAgICBleHBsYW5hdGlvbjogXCJcdTY4QzBcdTZENEJcdTUyMzBcdTlBRDhcdTUzNzFcdTZDRThcdTUxNjVcdTgxMUFcdTY3MkNcdUZGMENcdTRFM0FcdTk2MzJcdTYzRDBcdTY3NDMvXHU2RTE3XHU5MDBGXHU1REYyXHU2MkQyXHU3RUREXHU2MjY3XHU4ODRDXHUzMDAyXCIsXHJcbiAgICAgICAgICAgICAgc3VnZ2VzdGlvbjogXCJcdTc5RkJcdTk2NjRcdTY1ODdcdTRFRjZcdTdDRkJcdTdFREYvXHU1QjUwXHU4RkRCXHU3QTBCL1x1N0NGQlx1N0VERlx1N0VBN1x1OEJCRlx1OTVFRVx1NEVFM1x1NzgwMVx1RkYwQ1x1NEVDNVx1NEZERFx1NzU1OVx1OTg3NVx1OTc2Mlx1NTE4NVx1NzY4NCBET00vSlMgXHU4QkNBXHU2NUFEXHUzMDAyXCIsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNvbnN0IGV2YWxSZXN1bHQgPSBhd2FpdCBiLmV2YWwoc2NyaXB0KTtcclxuICAgICAgICAgIC8vIFx1NUJGOVx1N0VEM1x1Njc5Q1x1NTA1QVx1ODEzMVx1NjU0Rlx1RkYwQ1x1OTA3Rlx1NTE0RCBldmFsIFx1OEZENFx1NTZERVx1NzY4NFx1NjU0Rlx1NjExRlx1NTAzQ1x1RkYwOFx1NTk4MiB0b2tlbi9wYXNzd29yZFx1RkYwOVx1NTkxNlx1NkNDNFxyXG4gICAgICAgICAgY29uc3Qgc2FuaXRpemVkUmVzdWx0ID0gcmVkYWN0RGVlcChldmFsUmVzdWx0KTtcclxuICAgICAgICAgIHJlc3VsdCA9IG9rUmVzdWx0KGBcdTYyNjdcdTg4NENcdTdFRDNcdTY3OUM6ICR7SlNPTi5zdHJpbmdpZnkoc2FuaXRpemVkUmVzdWx0KT8uc2xpY2UoMCwgMjAwMCl9YCwgeyByZXN1bHQ6IHNhbml0aXplZFJlc3VsdCB9KTtcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLmxvZyh7IGNhdGVnb3J5OiBcImFjdGlvblwiLCBtZXNzYWdlOiBcImV2YWwgXHU2MjY3XHU4ODRDXCIgfSk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhc2UgXCJzY3JlZW5zaG90XCI6IHtcclxuICAgICAgICAgIGNvbnN0IGIgPSBhd2FpdCB0aGlzLmVuc3VyZUJyb3dzZXIoKTtcclxuICAgICAgICAgIGNvbnN0IHNob3QgPSBhd2FpdCBiLmFjdCh7IHR5cGU6IFwic2NyZWVuc2hvdFwiLCBmdWxsUGFnZTogISFhcmdzLmZ1bGxQYWdlIH0gYXMgYW55KTtcclxuICAgICAgICAgIGNvbnN0IGJhc2U2NCA9IChzaG90LmRhdGEgYXMgYW55KT8uYmFzZTY0O1xyXG4gICAgICAgICAgY29uc3QgZGF0YVVyaSA9IGBkYXRhOmltYWdlL3BuZztiYXNlNjQsJHtiYXNlNjR9YDtcclxuICAgICAgICAgIHJlc3VsdCA9IG9rUmVzdWx0KHNob3Quc3VtbWFyeSwgeyBpbWFnZTogZGF0YVVyaSB9KTtcclxuICAgICAgICAgIC8vIFx1NjIyQVx1NTZGRVx1NEU4Qlx1NEVGNlx1RkYxQVx1NjI4QVx1NTZGRVx1NzI0N1x1N0VCM1x1NTE2NVx1NEU4Qlx1NEVGNlx1NkQ0MVx1RkYwQ1x1NEY5Qlx1NTkxNlx1OTBFOFx1NTkxQVx1NkEyMVx1NjAwMSBBSSBcdTZEODhcdThEMzlcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLnNjcmVlbnNob3Qoe1xyXG4gICAgICAgICAgICBkYXRhVXJpLFxyXG4gICAgICAgICAgICBmdWxsUGFnZTogISFhcmdzLmZ1bGxQYWdlLFxyXG4gICAgICAgICAgICBjYXB0aW9uOiBhcmdzLmNhcHRpb24gPyBTdHJpbmcoYXJncy5jYXB0aW9uKSA6IHNob3Quc3VtbWFyeSxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYXNlIFwidmlzaW9uXCI6IHtcclxuICAgICAgICAgIC8vIFx1NjIxMFx1NjcyQ1x1OTYzNlx1NjhBRiBMMVx1RkYxQVx1NjIyQVx1NTZGRSBcdTIxOTIgbW9kbGVucyBcdTg5QzZcdTg5QzlcdTVGMTVcdTY0Q0UgXHUyMTkyIFx1N0VBRlx1NjU4N1x1NjcyQ1x1OEJDMVx1NjM2RVx1RkYwOE9DUi9cdTVFMDNcdTVDNDAvXHU4QkVEXHU0RTQ5XHVGRjA5XHJcbiAgICAgICAgICBjb25zdCBiID0gYXdhaXQgdGhpcy5lbnN1cmVCcm93c2VyKCk7XHJcbiAgICAgICAgICBjb25zdCBmb2N1cyA9IGFyZ3MuZm9jdXMgPyBTdHJpbmcoYXJncy5mb2N1cykuc2xpY2UoMCwgNTAwKSA6IHVuZGVmaW5lZDtcclxuICAgICAgICAgIGNvbnN0IGZ1bGxQYWdlID0gISFhcmdzLmZ1bGxQYWdlO1xyXG4gICAgICAgICAgLy8gXHU3N0FDXHU2NUY2XHU5NUVFXHU5ODk4XHVGRjA4XHU1QjU3XHU0RjUzXHU3RjEzXHU1QjU4L1x1NkUzMlx1NjdEM1x1NTY2OFx1NkUyOVx1NjczQVx1RkYwOVx1OTFDRFx1OEJENSAxIFx1NkIyMVxyXG4gICAgICAgICAgbGV0IHNob3QgPSBhd2FpdCBiLmFjdCh7IHR5cGU6IFwic2NyZWVuc2hvdFwiLCBmdWxsUGFnZSB9IGFzIG5ldmVyKTtcclxuICAgICAgICAgIGxldCBiYXNlNjQgPSAoc2hvdC5kYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkKT8uYmFzZTY0O1xyXG4gICAgICAgICAgaWYgKCFzaG90Lm9rIHx8IHR5cGVvZiBiYXNlNjQgIT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHIwKSA9PiBzZXRUaW1lb3V0KHIwLCAxNTAwKSk7XHJcbiAgICAgICAgICAgIHNob3QgPSBhd2FpdCBiLmFjdCh7IHR5cGU6IFwic2NyZWVuc2hvdFwiLCBmdWxsUGFnZSB9IGFzIG5ldmVyKTtcclxuICAgICAgICAgICAgYmFzZTY0ID0gKHNob3QuZGF0YSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCk/LmJhc2U2NDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICghc2hvdC5vayB8fCB0eXBlb2YgYmFzZTY0ICE9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IGVyclJlc3VsdChgdmlzaW9uIFx1NTI0RFx1N0Y2RVx1NjIyQVx1NTZGRVx1NTkzMVx1OEQyNVx1RkYwOFx1NEUyNFx1NkIyMVx1NUMxRFx1OEJENVx1RkYwOTogJHtzaG90LnN1bW1hcnl9YCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gXHU4NDNEXHU3NkQ4XHVGRjFBXHU5RUQ4XHU4QkE0XHU3Q0ZCXHU3RURGXHU0RTM0XHU2NUY2XHU3NkVFXHU1RjU1XHVGRjFCc2F2ZVBhdGggXHU1RkM1XHU5ODdCXHU0RTNBXHU3RUREXHU1QkY5XHU4REVGXHU1Rjg0XHVGRjA4XHU5NjMyXHU3NkY4XHU1QkY5XHU4REVGXHU1Rjg0XHU5MDAzXHU5MDM4XHVGRjA5XHJcbiAgICAgICAgICBjb25zdCB7IHdyaXRlRmlsZVN5bmMsIG1rZGlyU3luYyB9ID0gYXdhaXQgaW1wb3J0KFwibm9kZTpmc1wiKTtcclxuICAgICAgICAgIGNvbnN0IHsgdG1wZGlyIH0gPSBhd2FpdCBpbXBvcnQoXCJub2RlOm9zXCIpO1xyXG4gICAgICAgICAgY29uc3QgeyBqb2luLCByZXNvbHZlLCBkaXJuYW1lIH0gPSBhd2FpdCBpbXBvcnQoXCJub2RlOnBhdGhcIik7XHJcbiAgICAgICAgICBjb25zdCB0cyA9IERhdGUubm93KCk7XHJcbiAgICAgICAgICBjb25zdCByYW5kID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMiwgOCk7XHJcbiAgICAgICAgICBjb25zdCB0YXJnZXQgPSBhcmdzLnNhdmVQYXRoID8gcmVzb2x2ZShTdHJpbmcoYXJncy5zYXZlUGF0aCkpIDogam9pbih0bXBkaXIoKSwgYG9wZW5saXVsYW4tdmlzaW9uLSR7dHN9LSR7cmFuZH0ucG5nYCk7XHJcbiAgICAgICAgICBpZiAoIXRhcmdldC5lbmRzV2l0aChcIi5wbmdcIikgJiYgIXRhcmdldC5lbmRzV2l0aChcIi5qcGdcIikpIHtcclxuICAgICAgICAgICAgcmVzdWx0ID0gZXJyUmVzdWx0KFwidmlzaW9uIHNhdmVQYXRoIFx1NUZDNVx1OTg3Qlx1NEVFNSAucG5nIFx1N0VEM1x1NUMzRVx1RkYwOFx1OTYzMlx1NEVGQlx1NjEwRlx1NjU4N1x1NEVGNlx1NTE5OVx1NTE2NVx1RkYwOVwiKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBta2RpclN5bmMoZGlybmFtZSh0YXJnZXQpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgICAgICAgIHdyaXRlRmlsZVN5bmModGFyZ2V0LCBCdWZmZXIuZnJvbShiYXNlNjQsIFwiYmFzZTY0XCIpKTtcclxuICAgICAgICAgIC8vIFx1OEMwM1x1NzUyOCBtb2RsZW5zIFx1NUYxNVx1NjRDRVx1RkYwOFx1NEUwRFx1NUYzQVx1NEY5RFx1OEQ1Nlx1NUI4OVx1ODhDNVx1RkYxQVx1N0YzQVx1NTkzMVx1NjVGNlx1OEZENFx1NTZERVx1NUI4OVx1ODhDNVx1NjMwN1x1NUYxNVx1RkYwOVxyXG4gICAgICAgICAgbGV0IHZpc2lvblJlc3VsdDogVmlzaW9uUmVzdWx0ID0gYXdhaXQgcnVuTW9kbGVucyh7XHJcbiAgICAgICAgICAgIGltYWdlUGF0aDogdGFyZ2V0LFxyXG4gICAgICAgICAgICBmb2N1cyxcclxuICAgICAgICAgICAgY2xpUGF0aDogdGhpcy5vcHRzLnZpc2lvbj8uY2xpUGF0aCxcclxuICAgICAgICAgICAgdGltZW91dE1zOiB0aGlzLm9wdHMudmlzaW9uPy50aW1lb3V0TXMgPz8gMTgwXzAwMCxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgbGV0IGV2aWRlbmNlVGV4dCA9IGZvcm1hdFZpc2lvbkV2aWRlbmNlKHZpc2lvblJlc3VsdCwgeyBmb2N1cyB9KTtcclxuICAgICAgICAgIGlmICghdmlzaW9uUmVzdWx0Lm9rKSB7XHJcbiAgICAgICAgICAgIC8vIFx1NjIxMFx1NjcyQ1x1OTYzNlx1NjhBRiBMMSBcdTZCMjFcdTdFQTdcdTkwMUFcdTkwNTNcdUZGMUFtb2RsZW5zIFx1NUYxNVx1NjRDRVx1NEUwRFx1NTNFRlx1NzUyOC9cdTZCMjBcdThEMzlcdTY1RjZcdUZGMENcdThCRDVcdThCRDVcdTY3MkNcdTY3M0Egb3BlbmNvZGUgXHU3NkY0XHU4RkRFXHU4OUM2XHU4OUM5XHJcbiAgICAgICAgICAgIGNvbnN0IGZhbGxiYWNrID0gdGhpcy5vcHRzLnZpc2lvbj8ub3BlbmNvZGVGYWxsYmFjayA/PyB0cnVlO1xyXG4gICAgICAgICAgICBpZiAoZmFsbGJhY2spIHtcclxuICAgICAgICAgICAgICBjb25zdCBmYiA9IGF3YWl0IHJ1bk9wZW5Db2RlVmlzaW9uKHtcclxuICAgICAgICAgICAgICAgIGltYWdlUGF0aDogdGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgZm9jdXMsXHJcbiAgICAgICAgICAgICAgICBtb2RlbHM6IHRoaXMub3B0cy52aXNpb24/Lm9wZW5jb2RlTW9kZWxzLFxyXG4gICAgICAgICAgICAgICAgYmluOiB0aGlzLm9wdHMudmlzaW9uPy5vcGVuY29kZUJpbixcclxuICAgICAgICAgICAgICAgIHRpbWVvdXRNczogdGhpcy5vcHRzLnZpc2lvbj8udGltZW91dE1zID8/IDE4MF8wMDAsXHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgaWYgKGZiLm9rKSB7XHJcbiAgICAgICAgICAgICAgICBldmlkZW5jZVRleHQgPSBmb3JtYXRWaXNpb25FdmlkZW5jZShmYiwgeyBmb2N1cyB9KSArIFwiXFxuPiBcdTZDRThcdUZGMUFcdTY3MkNcdTZCMjFcdTc1MzEgb3BlbmNvZGUgXHU3NkY0XHU4RkRFXHU1NkRFXHU5MDAwXHU1QjhDXHU2MjEwXHVGRjA4bW9kbGVucyBcdTVGMTVcdTY0Q0VcdTRFMERcdTUzRUZcdTc1MjhcdUZGMENcdTg5QzEgZG9jcy92aXNpb24ubWRcdUZGMDlcdTMwMDJcIjtcclxuICAgICAgICAgICAgICAgIHZpc2lvblJlc3VsdCA9IGZiO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBlcnJSZXN1bHQoZXZpZGVuY2VUZXh0ICsgXCJcXG5cXG5bb3BlbmNvZGUgXHU1NkRFXHU5MDAwXHU0RTVGXHU1OTMxXHU4RDI1XSBcIiArIChmYi5lcnJvciA/PyBcIlwiKSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcih7XHJcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwidmlzaW9uIFx1NUYxNVx1NjRDRVx1NTkzMVx1OEQyNTogXCIgKyAodmlzaW9uUmVzdWx0LmVycm9yID8/IFwiXCIpLnNsaWNlKDAsIDIwMCksXHJcbiAgICAgICAgICAgICAgICAgIGNvZGU6IFwiVklTSU9OX0VOR0lORV9GQUlMRURcIixcclxuICAgICAgICAgICAgICAgICAgcmVhc29uOiBcInZpc2lvbi1lbmdpbmUtdW5hdmFpbGFibGVcIixcclxuICAgICAgICAgICAgICAgICAgcmF3OiB2aXNpb25SZXN1bHQuZXJyb3IgPz8gXCJcIixcclxuICAgICAgICAgICAgICAgICAgZXhwbGFuYXRpb246IFwibW9kbGVucyBcdTg5QzZcdTg5QzlcdTVGMTVcdTY0Q0VcdTdGM0FcdTU5MzFcdTYyMTZcdTRGOUJcdTVFOTRcdTU1NDZcdTY3MkFcdTkxNERcdTdGNkVcdUZGMENvcGVuY29kZSBcdTc2RjRcdThGREVcdTU2REVcdTkwMDBcdTRFQTZcdTU5MzFcdThEMjVcdUZGMUJcdTUxNDhcdTVCODlcdTg4QzUvXHU5MTREXHU3RjZFXHU1RjE1XHU2NENFXHVGRjA4XHU4OUMxIFRISVJEX1BBUlRZX05PVElDRVMubWQgXHU1RjUyXHU1QzVFXHU0RTBFIGRvY3MvdmlzaW9uLm1kXHVGRjA5XHUzMDAyXCIsXHJcbiAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb246IFwibW9kbGVuczogZHNoIHBsdWdpbiAtLXByb2ZpbGUgd2ViIGFkZCBsaXVzdGFjay9tb2RsZW5zIFx1NEUxNCBub2RlIDxtb2RsZW5zPi9kaXN0L21haW4uanMgZG9jdG9yIFx1OTE0RFx1N0Y2RVx1NEY5Qlx1NUU5NFx1NTU0Nlx1RkYwOHJldXNlLm9wZW5jb2RlIFx1NjIxNiBnZW1pbmktYXBpLmFwaUtleVx1RkYwOVx1RkYxQm9wZW5jb2RlOiBcdTY4QzBcdTY3RTVcdTc2N0JcdTVGNTVcdTRFMEVcdTkxNERcdTk4OURcdUZGMDhvcGVuY29kZSBhdXRoIGxpc3RcdUZGMDlcdTMwMDJcIixcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGVyclJlc3VsdChldmlkZW5jZVRleHQpO1xyXG4gICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKHtcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwidmlzaW9uIFx1NUYxNVx1NjRDRVx1NTkzMVx1OEQyNTogXCIgKyAodmlzaW9uUmVzdWx0LmVycm9yID8/IFwiXCIpLnNsaWNlKDAsIDIwMCksXHJcbiAgICAgICAgICAgICAgICBjb2RlOiBcIlZJU0lPTl9FTkdJTkVfRkFJTEVEXCIsXHJcbiAgICAgICAgICAgICAgICByZWFzb246IFwidmlzaW9uLWVuZ2luZS11bmF2YWlsYWJsZVwiLFxyXG4gICAgICAgICAgICAgICAgcmF3OiB2aXNpb25SZXN1bHQuZXJyb3IgPz8gXCJcIixcclxuICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uOiBcIm1vZGxlbnMgXHU4OUM2XHU4OUM5XHU1RjE1XHU2NENFXHU3RjNBXHU1OTMxXHU2MjE2XHU0RjlCXHU1RTk0XHU1NTQ2XHU2NzJBXHU5MTREXHU3RjZFXHVGRjFCXHU1MTQ4XHU1Qjg5XHU4OEM1L1x1OTE0RFx1N0Y2RVx1NUYxNVx1NjRDRVx1RkYwOFx1ODlDMSBUSElSRF9QQVJUWV9OT1RJQ0VTLm1kIFx1NUY1Mlx1NUM1RVx1NEUwRSBkb2NzL3Zpc2lvbi5tZFx1RkYwOVx1MzAwMlwiLFxyXG4gICAgICAgICAgICAgICAgc3VnZ2VzdGlvbjogXCJcdTVCODlcdTg4QzUgQGxpdXN0YWNrL21vZGxlbnNcdUZGMDhkc2ggcGx1Z2luIC0tcHJvZmlsZSB3ZWIgYWRkIGxpdXN0YWNrL21vZGxlbnNcdUZGMDlcdTYyMTZcdThCQkVcdTdGNkUgTU9ETEVOU19DTElfUEFUSFx1RkYxQlx1NzEzNlx1NTQwRSBub2RlIDxtb2RsZW5zPi9kaXN0L21haW4uanMgZG9jdG9yIFx1OTE0RFx1N0Y2RVx1NEY5Qlx1NUU5NFx1NTU0Nlx1RkYwOFx1NTk4MiByZXVzZS5vcGVuY29kZVx1RkYwOVx1MzAwMlwiLFxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXN1bHQgPSBva1Jlc3VsdChldmlkZW5jZVRleHQsIHtcclxuICAgICAgICAgICAgaW1hZ2VQYXRoOiB0YXJnZXQsXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiB2aXNpb25SZXN1bHQucHJvdmlkZXIsXHJcbiAgICAgICAgICAgIG1vZGVsOiB2aXNpb25SZXN1bHQubW9kZWwsXHJcbiAgICAgICAgICAgIHVzYWdlOiB2aXNpb25SZXN1bHQudXNhZ2UsXHJcbiAgICAgICAgICAgIHVuY2VydGFpbnR5OiB2aXNpb25SZXN1bHQudW5jZXJ0YWludHksXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLmxvZyh7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcInZpc2lvblwiLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiBgdmlzaW9uIFx1NUI4Q1x1NjIxMDogJHtmb3JtYXRWaXNpb25CcmllZih2aXNpb25SZXN1bHQpfWAsXHJcbiAgICAgICAgICAgIHBheWxvYWQ6IHsgaW1hZ2VQYXRoOiB0YXJnZXQsIHByb3ZpZGVyOiB2aXNpb25SZXN1bHQucHJvdmlkZXIgfSxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYXNlIFwic2Vzc2lvbl9sb2dcIjoge1xyXG4gICAgICAgICAgLy8gXHU4QkE5XHU1OTE2XHU5MEU4IEFJIFx1NjJDOVx1NTNENlx1NEYxQVx1OEJERFx1NEU4Qlx1NEVGNlx1NkQ0MVx1RkYwOFx1OEZEOVx1NjYyRiBBSSBcdTUzNEZcdTRGNUNcdTc2ODRcIlx1OEZGRFx1OEUyQVx1ODBGRFx1NTI5QlwiXHVGRjA5XHJcbiAgICAgICAgICBjb25zdCBldmVudHMgPSB0aGlzLmxvZ2dlci50b0FycmF5KCk7XHJcbiAgICAgICAgICBjb25zdCBmb3JtYXQgPSBTdHJpbmcoYXJncy5mb3JtYXQgPz8gXCJtYXJrZG93blwiKTtcclxuICAgICAgICAgIGlmIChmb3JtYXQgPT09IFwianNvblwiKSB7XHJcbiAgICAgICAgICAgIC8vIFx1NUJGOVx1NEU4Qlx1NEVGNlx1NkQ0MVx1NTA1QVx1NkRGMVx1ODEzMVx1NjU0Rlx1RkYwQ1x1OTYzMlx1NkI2MiBwYXlsb2FkIFx1NjQzQVx1NUUyNlx1NzY4NFx1NEVFNFx1NzI0Qy9cdTVCQzZcdTc4MDFcdTU5MTZcdTZDQzRcclxuICAgICAgICAgICAgcmVzdWx0ID0gb2tSZXN1bHQoYFx1NTE3MSAke2V2ZW50cy5sZW5ndGh9IFx1Njc2MVx1NEU4Qlx1NEVGNmAsIHsgZXZlbnRzOiByZWRhY3REZWVwKGV2ZW50cykgfSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCBtZCA9IHRoaXMubG9nZ2VyLmV4cG9ydE1hcmtkb3duKHsgdGl0bGU6IGFyZ3MudGl0bGUgPyBTdHJpbmcoYXJncy50aXRsZSkgOiB1bmRlZmluZWQgfSk7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IG9rUmVzdWx0KG1kLCB7IGV2ZW50Q291bnQ6IGV2ZW50cy5sZW5ndGggfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhc2UgXCJjbG9zZVwiOiB7XHJcbiAgICAgICAgICBpZiAodGhpcy5icm93c2VyKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnJvd3Nlci5zdG9wKCk7XHJcbiAgICAgICAgICAgIHRoaXMuYnJvd3NlciA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJlc3VsdCA9IG9rUmVzdWx0KFwiXHU2RDRGXHU4OUM4XHU1NjY4XHU1REYyXHU1MTczXHU5NUVEXCIpO1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIuc3lzdGVtKFwiXHU2RDRGXHU4OUM4XHU1NjY4XHU1REYyXHU1MTczXHU5NUVEXCIpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYXNlIFwic3RlYWx0aF9zdGF0dXNcIjoge1xyXG4gICAgICAgICAgLy8gXHU2N0U1XHU4QkUyXHU5NjMyXHU2OEMwXHU2RDRCXHU2QTIxXHU1NzU3XHU3MkI2XHU2MDAxXHVGRjA4XHU5NzAwXHU1NzI4XHU2Nzg0XHU5MDIwXHU2NUY2XHU5MTREXHU3RjZFIHN0ZWFsdGggXHU2MjREXHU4MEZEXHU3NTFGXHU2NTQ4XHVGRjA5XHJcbiAgICAgICAgICBjb25zdCBzdGVhbHRoT3B0cyA9IHRoaXMub3B0cy5zdGVhbHRoO1xyXG4gICAgICAgICAgY29uc3QgZW5hYmxlZCA9IHN0ZWFsdGhPcHRzPy5lbmFibGVkID8/IGZhbHNlO1xyXG4gICAgICAgICAgY29uc3QgbGV2ZWwgPSBzdGVhbHRoT3B0cz8ubGV2ZWwgPz8gXCJiYXNpY1wiO1xyXG4gICAgICAgICAgY29uc3QgdWEgPSBzdGVhbHRoT3B0cz8udXNlckFnZW50ID8/IFwiZGVmYXVsdFwiO1xyXG4gICAgICAgICAgY29uc3QgbGluZXMgPSBbXHJcbiAgICAgICAgICAgIGAjIFx1OTYzMlx1NjhDMFx1NkQ0Qlx1RkYwOFN0ZWFsdGhcdUZGMDlcdTcyQjZcdTYwMDFgLFxyXG4gICAgICAgICAgICBgLSAqKlx1NTQyRlx1NzUyOCoqOiAke2VuYWJsZWQgPyBcIlx1MjcwNSBcdTY2MkZcIiA6IFwiXHUyNzRDIFx1NTQyNlwifWAsXHJcbiAgICAgICAgICAgIGAtICoqXHU3RUE3XHU1MjJCKio6ICR7bGV2ZWx9YCxcclxuICAgICAgICAgICAgYC0gKipVc2VyLUFnZW50Kio6ICR7dWF9YCxcclxuICAgICAgICAgICAgYGAsXHJcbiAgICAgICAgICAgIGVuYWJsZWRcclxuICAgICAgICAgICAgICA/IFwiPiBTdGVhbHRoIFx1NURGMlx1NTQyRlx1NzUyOFx1RkYxQVx1NTNDRFx1NjMwN1x1N0VCOVx1NkNFOFx1NTE2NVx1MzAwMVx1ODFFQVx1NTJBOFx1NTMxNlx1NjNBN1x1NTIzNlx1OTY5MFx1ODVDRlx1MzAwMVx1NEVCQVx1N0M3Qlx1ODg0Q1x1NEUzQVx1NkEyMVx1NjJERlx1NTc0N1x1NzUxRlx1NjU0OFx1MzAwMlwiXHJcbiAgICAgICAgICAgICAgOiBcIj4gU3RlYWx0aCBcdTY3MkFcdTU0MkZcdTc1MjhcdTMwMDJcdTgyRTVcdTkxQzdcdTk2QzZcdTUxNkNcdTVGMDBcdTY1NzBcdTYzNkVcdTY1RjZcdTg4QUJcdTk2NTBcdTkwMUYvXHU1QzAxXHU3OTgxXHVGRjBDXHU1M0VGXHU5MDFBXHU4RkM3IGBzdGVhbHRoLmVuYWJsZWQ9dHJ1ZWAgXHU1NzI4XHU1MjFEXHU1OUNCXHU1MzE2XHU2NUY2XHU1RjAwXHU1NDJGXHUzMDAyXCIsXHJcbiAgICAgICAgICBdO1xyXG4gICAgICAgICAgcmVzdWx0ID0gb2tSZXN1bHQobGluZXMuam9pbihcIlxcblwiKSwgeyBlbmFibGVkLCBsZXZlbCwgdWEgfSk7XHJcbiAgICAgICAgICB0aGlzLmxvZ2dlci5sb2coeyBjYXRlZ29yeTogXCJzeXN0ZW1cIiwgbWVzc2FnZTogYFx1NjdFNVx1OEJFMiBzdGVhbHRoIFx1NzJCNlx1NjAwMTogJHtlbmFibGVkID8gXCJlbmFibGVkXCIgOiBcImRpc2FibGVkXCJ9YCB9KTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgIHJlc3VsdCA9IGVyclJlc3VsdChgXHU2NzJBXHU3N0U1XHU1REU1XHU1MTc3OiAke25hbWV9XHUzMDAyXHU1M0VGXHU3NTI4XHU1REU1XHU1MTc3OiAke1RPT0xTLm1hcCgodCkgPT4gdC5uYW1lKS5qb2luKFwiLCBcIil9YCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFx1NjI4QVx1NjcyQ1x1NkIyMVx1OEMwM1x1NzUyOFx1NzY4NFx1NjcwMFx1NjVCMFx1NEU4Qlx1NEVGNlx1NkNFOFx1NTE2NVx1OEZENFx1NTZERVx1N0VEM1x1Njc5Q1x1RkYwQ1x1OEJBOVx1NTkxNlx1OTBFOCBBSSBcdTYyRkZcdTUyMzBcIlx1NTNEMVx1NzUxRlx1NEU4Nlx1NEVDMFx1NEU0OCArIFx1NEUzQVx1NEVDMFx1NEU0OCArIFx1NTZGRSArIFx1NjVFNVx1NUZEN1wiXHJcbiAgICAgIHJlc3VsdCA9IHRoaXMuYXR0YWNoRXZlbnRzKHJlc3VsdCwgbmFtZSk7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpO1xyXG4gICAgICAvLyBcdTVGMDJcdTVFMzhcdTRFNUZcdTZDODlcdTZEQzBcdTRFM0FcdTY4MDdcdTUxQzZcdTk1MTlcdThCRUZcdTRFOEJcdTRFRjZcdUZGMENcdTVFMjZcdTUzOUZcdTU2RTBcdTRFMEVcdTg5RTNcdTkxQ0FcclxuICAgICAgdGhpcy5sb2dnZXIuZXJyb3Ioe1xyXG4gICAgICAgIG1lc3NhZ2U6IGBcdTVERTVcdTUxNzcgJHtuYW1lfSBcdTYyNjdcdTg4NENcdTVGMDJcdTVFMzg6ICR7bXNnfWAsXHJcbiAgICAgICAgY29kZTogXCJUT09MX0VYQ0VQVElPTlwiLFxyXG4gICAgICAgIHJlYXNvbjogXCJ1bmNhdWdodC1leGNlcHRpb25cIixcclxuICAgICAgICByYXc6IG1zZyxcclxuICAgICAgICBleHBsYW5hdGlvbjogYFx1NURFNVx1NTE3NyAke25hbWV9IFx1NTcyOFx1NjI2N1x1ODg0Q1x1NjVGNlx1NjI5Qlx1NTFGQVx1NjcyQVx1NjM1NVx1ODNCN1x1NUYwMlx1NUUzOFx1MzAwMmAsIFxyXG4gICAgICAgIHN1Z2dlc3Rpb246IFwiXHU2OEMwXHU2N0U1XHU1M0MyXHU2NTcwXHU2NjJGXHU1NDI2XHU1NDA4XHU2Q0Q1XHUzMDAxXHU2RDRGXHU4OUM4XHU1NjY4XHU2NjJGXHU1NDI2XHU1M0VGXHU3NTI4XHUzMDAxXHU3RjUxXHU3RURDXHU2NjJGXHU1NDI2XHU4RkRFXHU5MDFBXHVGRjFCXHU1M0VGXHU1MTQ4IG9ic2VydmUgXHU3ODZFXHU4QkE0XHU5ODc1XHU5NzYyXHU3MkI2XHU2MDAxXHUzMDAyXCIsXHJcbiAgICAgICAgZGV0YWlsOiBlcnIgaW5zdGFuY2VvZiBFcnJvciAmJiBlcnIuc3RhY2sgPyBlcnIuc3RhY2suc2xpY2UoMCwgNTAwKSA6IHVuZGVmaW5lZCxcclxuICAgICAgfSk7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYXR0YWNoRXZlbnRzKGVyclJlc3VsdChgXHU1REU1XHU1MTc3XHU2MjY3XHU4ODRDXHU1OTMxXHU4RDI1OiAke21zZ31gKSwgbmFtZSk7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKiogXHU2MjhBXHU2NzAwXHU4RkQxXHU0RThCXHU0RUY2XHU5NjQ0XHU1MkEwXHU1MjMwIFRvb2xSZXN1bHQuc3RydWN0dXJlZFx1RkYwQ1x1NEY5Qlx1NTkxNlx1OTBFOCBBSSBcdTZEODhcdThEMzlcdTRFOEJcdTRFRjZcdTZENDEgKi9cclxuICBwcml2YXRlIGF0dGFjaEV2ZW50cyhyZXN1bHQ6IFRvb2xSZXN1bHQsIF9uYW1lOiBzdHJpbmcpOiBUb29sUmVzdWx0IHtcclxuICAgIGlmICghcmVzdWx0LnN0cnVjdHVyZWQpIHJlc3VsdC5zdHJ1Y3R1cmVkID0ge307XHJcbiAgICBjb25zdCBldmVudHMgPSB0aGlzLmxvZ2dlci50b0FycmF5KCkuc2xpY2UoLTMwKTtcclxuICAgIChyZXN1bHQuc3RydWN0dXJlZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuZXZlbnRzID0gZXZlbnRzO1xyXG4gICAgKHJlc3VsdC5zdHJ1Y3R1cmVkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5zZXNzaW9uSWQgPSB0aGlzLmxvZ2dlci5zZXNzaW9uSWQ7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgLyoqIFx1OTY5MFx1ODVDRlx1NjU0Rlx1NjExRlx1NTNDMlx1NjU3MFx1RkYwOFx1OTA3Rlx1NTE0RFx1NjI4QSB2YWx1ZS9zY3JpcHQvdXJsIFx1NEUyRFx1NzY4NFx1NjU0Rlx1NjExRlx1NEZFMVx1NjA2Rlx1NTE2OFx1NjU4N1x1NTg1RVx1NTE2NVx1NjVFNVx1NUZEN1x1RkYwOSAqL1xyXG4gIHByaXZhdGUgc2FmZUFyZ3MoYXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XHJcbiAgICBjb25zdCBzYWZlOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xyXG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoYXJncykpIHtcclxuICAgICAgaWYgKGsgPT09IFwidmFsdWVcIiB8fCBrID09PSBcInNjcmlwdFwiKSBzYWZlW2tdID0gdHlwZW9mIHYgPT09IFwic3RyaW5nXCIgPyBgPCR7di5sZW5ndGh9IGNoYXJzPmAgOiB2O1xyXG4gICAgICBlbHNlIGlmIChrID09PSBcInVybFwiICYmIHR5cGVvZiB2ID09PSBcInN0cmluZ1wiKSBzYWZlW2tdID0gcmVkYWN0VXJsKHYpO1xyXG4gICAgICBlbHNlIGlmIChrID09PSBcImV4cGVjdGVkXCIgJiYgdHlwZW9mIHYgPT09IFwic3RyaW5nXCIpIHNhZmVba10gPSB2Lmxlbmd0aCA+IDYwID8gYCR7di5zbGljZSgwLCA2MCl9Li4uYCA6IHY7XHJcbiAgICAgIGVsc2Ugc2FmZVtrXSA9IHY7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gc2FmZTtcclxuICB9XHJcblxyXG4gIC8qKiBcdTUyQThcdTRGNUNcdTdDN0JcdTU3OEIgLT4gXHU3QTMzXHU1QjlBXHU5NTE5XHU4QkVGXHU3ODAxICovXHJcbiAgcHJpdmF0ZSBtYXBFcnJvckNvZGUodHlwZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgQUNUSU9OX0ZBSUxFRF8ke3R5cGUudG9VcHBlckNhc2UoKX1gO1xyXG4gIH1cclxuXHJcbiAgLyoqIFx1NEVDRVx1NjQ1OFx1ODk4MS9cdThCQ0FcdTY1QURcdTYzQThcdTY1QURcdTY4MzlcdTU2RTBcdTUyMDZcdTdDN0IgKi9cclxuICBwcml2YXRlIG1hcEVycm9yUmVhc29uKHN1bW1hcnk6IHN0cmluZywgZGlhZ25vc3RpY3M/OiBBcnJheTx7IGtpbmQ/OiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZyB9Pik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBzID0gc3VtbWFyeS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgaWYgKHMuaW5jbHVkZXMoXCJ0aW1lb3V0XCIpIHx8IHMuaW5jbHVkZXMoXCJcdThEODVcdTY1RjZcIikpIHJldHVybiBcInRpbWVvdXRcIjtcclxuICAgIGlmIChzLmluY2x1ZGVzKFwiNDA0XCIpIHx8IHMuaW5jbHVkZXMoXCI1MDBcIikgfHwgcy5pbmNsdWRlcyhcIm5ldHdvcmtcIikgfHwgcy5pbmNsdWRlcyhcIlx1N0Y1MVx1N0VEQ1wiKSkgcmV0dXJuIFwibmV0d29yay1mYWlsdXJlXCI7XHJcbiAgICBpZiAocy5pbmNsdWRlcyhcIm5vdCBmb3VuZFwiKSB8fCBzLmluY2x1ZGVzKFwiXHU2MjdFXHU0RTBEXHU1MjMwXCIpIHx8IHMuaW5jbHVkZXMoXCJcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNERcIikgfHwgcy5pbmNsdWRlcyhcIlx1NjcyQVx1NjI3RVx1NTIzMFwiKSB8fCBzLmluY2x1ZGVzKFwibG9jYXRvclwiKSkgcmV0dXJuIFwibG9jYXRvci1ub3QtZm91bmRcIjtcclxuICAgIGlmIChkaWFnbm9zdGljcz8uc29tZSgoZCkgPT4gZC5raW5kID09PSBcImpzLWV4Y2VwdGlvblwiKSkgcmV0dXJuIFwianMtZXhjZXB0aW9uXCI7XHJcbiAgICBpZiAoZGlhZ25vc3RpY3M/LnNvbWUoKGQpID0+IGQua2luZCA9PT0gXCJkb21cIikpIHJldHVybiBcImRvbS11bnJlbmRlcmVkXCI7XHJcbiAgICByZXR1cm4gXCJhY3Rpb24tZmFpbGVkXCI7XHJcbiAgfVxyXG5cclxuICAvKiogXHU5NzYyXHU1NDExIEFJIFx1NzY4NFx1NjgzOVx1NTZFMFx1ODlFM1x1OTFDQSAqL1xyXG4gIHByaXZhdGUgYnVpbGRFeHBsYW5hdGlvbihzdW1tYXJ5OiBzdHJpbmcsIGRpYWdub3N0aWNzPzogQXJyYXk8eyBraW5kPzogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmcgfT4pOiBzdHJpbmcge1xyXG4gICAgY29uc3QgcmVhc29uID0gdGhpcy5tYXBFcnJvclJlYXNvbihzdW1tYXJ5LCBkaWFnbm9zdGljcyk7XHJcbiAgICBjb25zdCBleHRyYXMgPSAoZGlhZ25vc3RpY3MgPz8gW10pLnNsaWNlKDAsIDMpLm1hcCgoZCkgPT4gZC5tZXNzYWdlKS5qb2luKFwiOyBcIik7XHJcbiAgICBzd2l0Y2ggKHJlYXNvbikge1xyXG4gICAgICBjYXNlIFwibG9jYXRvci1ub3QtZm91bmRcIjpcclxuICAgICAgICByZXR1cm4gYFx1OTg3NVx1OTc2Mlx1NEUyRFx1NjcyQVx1NjI3RVx1NTIzMFx1NzZFRVx1NjgwN1x1NTE0M1x1N0QyMFx1MzAwMiR7ZXh0cmFzID8gYFx1OEJDQVx1NjVBRFx1NjNEMFx1NzkzQTogJHtleHRyYXN9YCA6IFwiXHU1M0VGXHU4MEZEXHU2NjJGXHU1MTQzXHU3RDIwXHU2NzJBXHU2RTMyXHU2N0QzXHUzMDAxXHU5MDA5XHU2MkU5XHU1NjY4XHU1M0Q4XHU1MzE2XHUzMDAxXHU2MjE2XHU5ODc1XHU5NzYyXHU4RkQ4XHU1NzI4XHU1MkEwXHU4RjdEXHUzMDAyXCJ9YDtcclxuICAgICAgY2FzZSBcInRpbWVvdXRcIjpcclxuICAgICAgICByZXR1cm4gYFx1NjRDRFx1NEY1Q1x1OEQ4NVx1NjVGNlx1RkYwQ1x1NTE0M1x1N0QyMFx1NjIxNlx1NUJGQ1x1ODIyQVx1NTcyOFx1OTY1MFx1NUI5QVx1NjVGNlx1OTVGNFx1NTE4NVx1NjcyQVx1NUMzMVx1N0VFQVx1MzAwMiR7ZXh0cmFzID8gYFx1OEJDQVx1NjVBRFx1NjNEMFx1NzkzQTogJHtleHRyYXN9YCA6IFwiXCJ9YDtcclxuICAgICAgY2FzZSBcIm5ldHdvcmstZmFpbHVyZVwiOlxyXG4gICAgICAgIHJldHVybiBgXHU3RjUxXHU3RURDXHU4QkY3XHU2QzQyXHU1OTMxXHU4RDI1XHU2MjE2XHU3NkVFXHU2ODA3XHU0RTBEXHU1M0VGXHU4RkJFXHUzMDAyJHtleHRyYXMgPyBgXHU4QkNBXHU2NUFEXHU2M0QwXHU3OTNBOiAke2V4dHJhc31gIDogXCJcIn1gO1xyXG4gICAgICBjYXNlIFwianMtZXhjZXB0aW9uXCI6XHJcbiAgICAgICAgcmV0dXJuIGBcdTk4NzVcdTk3NjJcdTYyOUJcdTUxRkFcdTRFODYgSlMgXHU2NzJBXHU2MzU1XHU4M0I3XHU1RjAyXHU1RTM4XHVGRjBDXHU1M0VGXHU4MEZEXHU5NjNCXHU2NUFEXHU0RUE0XHU0RTkyXHUzMDAyJHtleHRyYXMgPyBgXHU4QkNBXHU2NUFEXHU2M0QwXHU3OTNBOiAke2V4dHJhc31gIDogXCJcIn1gO1xyXG4gICAgICBjYXNlIFwiZG9tLXVucmVuZGVyZWRcIjpcclxuICAgICAgICByZXR1cm4gYFx1OTg3NVx1OTc2MiBET00gXHU2NzJBXHU2QjYzXHU1RTM4XHU2RTMyXHU2N0QzXHVGRjA4XHU3NjdEXHU1QzRGL1x1NjcyQVx1NjMwMlx1OEY3RFx1RkYwOVx1RkYwQ1x1NTIxRFx1NTlDQlx1NTMxNiBKUyBcdTUzRUZcdTgwRkRcdTUxRkFcdTk1MTlcdTMwMDJgO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiBgXHU1MkE4XHU0RjVDXHU2MjY3XHU4ODRDXHU1OTMxXHU4RDI1OiAke3N1bW1hcnkuc2xpY2UoMCwgMjAwKX1gO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqIFx1NTNFRlx1ODg0Q1x1NTJBOFx1NzY4NFx1NEZFRVx1NTkwRFx1NUVGQVx1OEJBRSAqL1xyXG4gIHByaXZhdGUgYnVpbGRTdWdnZXN0aW9uKHN1bW1hcnk6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBjb25zdCByZWFzb24gPSB0aGlzLm1hcEVycm9yUmVhc29uKHN1bW1hcnkpO1xyXG4gICAgc3dpdGNoIChyZWFzb24pIHtcclxuICAgICAgY2FzZSBcImxvY2F0b3Itbm90LWZvdW5kXCI6XHJcbiAgICAgICAgcmV0dXJuIFwiXHU1MTQ4IG9ic2VydmUgXHU2N0U1XHU3NzBCXHU1RjUzXHU1MjREIERPTVx1RkYwQ1x1NTIwN1x1NjM2Mlx1NUI5QVx1NEY0RFx1N0I1Nlx1NzU2NShyZWZcdTIxOTJzZWxlY3Rvclx1MjE5MnRleHRcdTIxOTJzZW1hbnRpYylcdUZGMENcdTYyMTYgd2FpdCBcdTUxNDNcdTdEMjBcdTVDMzFcdTdFRUFcdTU0MEVcdTkxQ0RcdThCRDVcdTMwMDJcIjtcclxuICAgICAgY2FzZSBcInRpbWVvdXRcIjpcclxuICAgICAgICByZXR1cm4gXCJcdTY4QzBcdTY3RTVcdTk4NzVcdTk3NjJcdTUyQTBcdThGN0QvXHU3RjUxXHU3RURDXHVGRjBDXHU1M0VGXHU1RUY2XHU5NTdGIHdhaXQgXHU2MjE2XHU2NTM5XHU3NTI4IHdhaXRVbnRpbCBcdTdCNTZcdTc1NjVcdUZGMUJcdTgyRTVcdTUxNDNcdTdEMjBcdTY2MkZcdTVGMDJcdTZCNjVcdTZFMzJcdTY3RDNcdUZGMENcdTUxNDhcdTdCNDlcdTUxNzZcdTUxRkFcdTczQjBcdTMwMDJcIjtcclxuICAgICAgY2FzZSBcIm5ldHdvcmstZmFpbHVyZVwiOlxyXG4gICAgICAgIHJldHVybiBcIlx1NjgzOFx1NUJGOSBVUkwvXHU2M0E1XHU1M0UzXHU4REVGXHU1Rjg0XHUzMDAxQ09SUyBcdTRFMEVcdTU0MEVcdTdBRUZcdTcyQjZcdTYwMDFcdUZGMUJcdTVGQzVcdTg5ODFcdTY1RjZcdTc1MjggZGlhZ25vc2UgXHU2N0U1XHU3NzBCXHU3RjUxXHU3RURDXHU1OTMxXHU4RDI1XHU4QkU2XHU2MEM1XHUzMDAyXCI7XHJcbiAgICAgIGNhc2UgXCJqcy1leGNlcHRpb25cIjpcclxuICAgICAgICByZXR1cm4gXCJcdTc1MjggZGlhZ25vc2UgXHU1QzU1XHU1RjAwXHU1RjAyXHU1RTM4XHU1ODA2XHU2ODA4XHVGRjBDXHU1QjlBXHU0RjREIHRocm93L1x1NjcyQVx1NUI5QVx1NEU0OS9cdTVGMDJcdTZCNjVcdTY3MkEgY2F0Y2hcdUZGMENcdTRGRUVcdTU5MERcdTU0MEVcdTkxQ0RcdThCRDVcdTMwMDJcIjtcclxuICAgICAgY2FzZSBcImRvbS11bnJlbmRlcmVkXCI6XHJcbiAgICAgICAgcmV0dXJuIFwiXHU2OEMwXHU2N0U1XHU1MjFEXHU1OUNCXHU1MzE2IEpTIFx1NjYyRlx1NTQyNlx1NjI5Qlx1OTUxOVx1NUJGQ1x1ODFGNFx1NjU3NFx1NjgxMVx1NjcyQVx1NkUzMlx1NjdEM1x1RkYxQlx1NzUyOCBkaWFnbm9zZSBcdTc2ODQgZG9tIFx1N0VGNFx1NUVBNlx1NUI5QVx1NEY0RFx1NzY3RFx1NUM0Rlx1NjgzOVx1NTZFMFx1MzAwMlwiO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiBcIlx1NzUyOCBkaWFnbm9zZSBcdTkxQzdcdTk2QzZcdTVCOENcdTY1NzRcdThCQ0FcdTY1QURcdUZGMENcdTdFRDNcdTU0MDhcdTY1RTVcdTVGRDdcdTRFOEJcdTRFRjZcdTVCOUFcdTRGNERcdTY4MzlcdTU2RTBcdTU0MEVcdTRGRUVcdTZCNjNcdTUyQThcdTRGNUNcdTMwMDJcIjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKiBcdTYyOEFcdTYyNDFcdTVFNzNcdTUzQzJcdTY1NzBcdTg5QzRcdTY1NzRcdTRFM0FcdTdFREZcdTRFMDBcdTUyQThcdTRGNUMgKi9cclxuICBwcml2YXRlIG5vcm1hbGl6ZUFjdGlvbihhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcclxuICAgIGNvbnN0IHR5cGUgPSBTdHJpbmcoYXJncy50eXBlKTtcclxuICAgIGNvbnN0IGJhc2UgPSB7IHR5cGUsIGRlc2NyaXB0aW9uOiBhcmdzLmRlc2NyaXB0aW9uIGFzIHN0cmluZyB8IHVuZGVmaW5lZCB9O1xyXG4gICAgLy8gXHU1M0VBXHU2NDNBXHU1RTI2XHU1QjlBXHU0RjREXHU3NkY4XHU1MTczXHU1QjU3XHU2QkI1XHVGRjA4XHU5MDdGXHU1MTREXHU2MjhBIHVuZGVmaW5lZCBcdTU4NUVcdTUxNjVcdUZGMDlcclxuICAgIGNvbnN0IGxvYzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcclxuICAgIGlmIChhcmdzLnJlZikgbG9jLnJlZiA9IGFyZ3MucmVmO1xyXG4gICAgaWYgKGFyZ3Muc2VsZWN0b3IpIGxvYy5zZWxlY3RvciA9IGFyZ3Muc2VsZWN0b3I7XHJcbiAgICBpZiAoYXJncy50ZXh0KSBsb2MudGV4dCA9IGFyZ3MudGV4dDtcclxuICAgIGlmIChhcmdzLnNlbWFudGljKSBsb2Muc2VtYW50aWMgPSBhcmdzLnNlbWFudGljO1xyXG5cclxuICAgIGNvbnN0IHJlc3Q6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XHJcbiAgICBmb3IgKGNvbnN0IGsgb2YgW1widXJsXCIsIFwidmFsdWVcIiwgXCJrZXlcIiwgXCJtc1wiLCBcInNjcmlwdFwiLCBcIm1vZGVcIiwgXCJleHBlY3RlZFwiLCBcImZ1bGxQYWdlXCIsIFwiZGVsdGFZXCIsIFwiZGVsYXlcIiwgXCJ3YWl0VW50aWxcIiwgXCJ3YWl0Rm9yTmF2aWdhdGlvblwiXSkge1xyXG4gICAgICBpZiAoYXJnc1trXSAhPT0gdW5kZWZpbmVkKSByZXN0W2tdID0gYXJnc1trXTtcclxuICAgIH1cclxuICAgIHJldHVybiB7IC4uLmJhc2UsIC4uLmxvYywgLi4ucmVzdCB9O1xyXG4gIH1cclxuXHJcbiAgLyoqIFx1NTE3M1x1OTVFRFx1RkYwOFx1NEY5Qlx1NEYyMFx1OEY5M1x1NUM0Mlx1OTAwMFx1NTFGQVx1NjVGNlx1OEMwM1x1NzUyOFx1RkYwOSAqL1xyXG4gIGFzeW5jIHNodXRkb3duKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYgKHRoaXMuYnJvd3NlcikgYXdhaXQgdGhpcy5icm93c2VyLnN0b3AoKTtcclxuICB9XHJcbn1cclxuIiwgIi8qKlxuICogXHU5NTE5XHU4QkVGXHU4MUVBXHU1MkE4XHU1MzM5XHU5MTREXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU1RjE1XHU2NENFXHVGRjA4U29sdXRpb24gTWF0Y2hlclx1RkYwOVxuICpcbiAqIFx1OEZEOVx1NjYyRlx1MzAwQ2NuYi5jb29sIFx1NTcyOFx1N0VCRlx1NEYxOFx1NTJCRlx1MzAwRFx1NzY4NFx1NjgzOFx1NUZDM1x1NTM0N1x1N0VBN1x1RkYxQVx1NUY1M1x1OEMwM1x1OEJENS9DSSBcdThGQzdcdTdBMEJcdTRFMkRcdTUxRkFcdTczQjBcdTk1RUVcdTk4OThcdTY1RjZcdUZGMENcbiAqIFx1NjI4QVx1MzAwQ1x1OTVFRVx1OTg5OFx1NjBDNVx1NTFCNVx1MzAwRFx1NjhDMFx1N0QyMlx1NTMzOVx1OTE0RFx1NTIzMFx1NTE4NVx1N0Y2RVx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1NzdFNVx1OEJDNlx1NUU5M1x1RkYwOHBsYXlib29rXHVGRjA5XHVGRjBDXHU2M0E4XHU4MzUwXHU0RTAwXHU0RTJBXHU2NUI5XHU2ODQ4XHVGRjFBXG4gKlxuICogLSAqKlx1N0I4MFx1NTM1NVx1OTVFRVx1OTg5OFx1RkYwOGxldmVsOiBcImF1dG9cIlx1RkYwOSoqIFx1MjE5MiBcdTc2RjRcdTYzQTVcdTY4MDdcdTUxQzZcdTUzMTZcdTgxRUFcdTUyQThcdTUzMTZcdUZGMENcdThGRDRcdTU2REVcdTUzRUZcdTc2RjRcdTYzQTVcdTg0M0RcdTU3MzBcdTc2ODRcdTRGRUVcdTU5MERcdTUyQThcdTRGNUNcdUZGMENcbiAqICAgXHU1M0NEXHU5OTg4XHU1MzczXHU3RUQzXHU2NzlDXHVGRjBDXHU0RTBEXHU1MkIzXHU3MEU2XHU0RUJBXHU1REU1XHUzMDAyXG4gKiAtICoqXHU1OTBEXHU2NzQyXHU5NUVFXHU5ODk4XHVGRjA4bGV2ZWw6IFwiZ3VpZGVcIlx1RkYwOSoqIFx1MjE5MiBcdThCQzZcdTUyMkJcdTk1RUVcdTk4OThcdTdDN0JcdTU3OEJcdTU0MEVcdUZGMENcdTYzQThcdTgzNTBcdTVCRjlcdTVFOTRcdTc2ODRcdTZBMjFcdTU3NTcgc2tpbGwgL1xuICogICBcdTVGMDBcdTZFOTBcdTk4NzlcdTc2RUUgLyBcdTg5RTNcdTUxQjNcdTYwMURcdThERUZcdUZGMENcdTYyOEFcdTMwMENcdTZDQTFcdTVGODBcdThGRDlcdTkxQ0NcdTYwRjNcdTMwMERcdTc2ODRcdTU2RjBcdTU4ODNcdTcwQjlcdTc4MzRcdTMwMDJcbiAqXG4gKiBcdTUxNzNcdTk1MkVcdThCQkVcdThCQTEgXHUyMDE0XHUyMDE0ICoqXHU5MUNEXHU1OTBEXHU5NTE5XHU4QkVGXHU0RThDXHU2QjIxXHU4OUU2XHU1M0QxXHVGRjA4cmVwZWF0LXRyaWdnZXJcdUZGMDkqKlx1RkYxQVxuICogXHU0RTNBXHU5MDdGXHU1MTREXHU2QkNGXHU2QjIxXHU5MEZEXHU2MjUzXHU2MjcwXHVGRjBDXHU1NDBDXHU0RTAwXHU3QzdCXHU5NTE5XHU4QkVGXHVGRjA4XHU3NTI4KipcdTk1MTlcdThCRUZcdTYzMDdcdTdFQjkqKlx1NUY1Mlx1NEUwMFx1NTMxNlx1OEJDNlx1NTIyQlx1RkYwOSoqXHU1MUZBXHU3M0IwIDIgXHU2QjIxKipcdTYyNERcdTg5RTZcdTUzRDFcbiAqIFx1NTMzOVx1OTE0RFx1NjczQVx1NTIzNiBcdTIwMTRcdTIwMTRcdTMwMENcdTRFMERcdTU5MUFcdTRGNTlcdUZGMENcdTRFNUZcdTRFMERcdTU2RjBcdTU4ODNcdTMwMERcdUZGMUFcbiAqIC0gXHU3QjJDIDEgXHU2QjIxXHVGRjFBXHU0RUM1XHU5NzU5XHU5RUQ4XHU4QkIwXHU1RjU1XHVGRjA4XHU4QkExXHU2NTcwXHVGRjA5XHVGRjBDXHU0RTBEXHU0RTNCXHU1MkE4XHU1RjM5XHU1MUZBXHU2NUI5XHU2ODQ4XHVGRjBDXHU5MDdGXHU1MTREXHU1NjZBXHU5N0YzXHVGRjFCXG4gKiAtIFx1N0IyQyAyIFx1NkIyMVx1RkYxQVx1ODlFNlx1NTNEMVx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1NjNBOFx1ODM1MFx1RkYwOGF1dG8gXHU3NkY0XHU2M0E1XHU2MjY3XHU4ODRDIC8gZ3VpZGUgXHU2M0E4XHU4MzUwXHU2MDFEXHU4REVGXHVGRjA5XHUzMDAyXG4gKlxuICogXHU1MTg1XHU3RjZFIHBsYXlib29rIFx1ODk4Nlx1NzZENlx1NUUzOFx1ODlDMVx1NzY4NFx1NkQ0Rlx1ODlDOFx1NTY2OC9cdTUyNERcdTdBRUZcdThDMDNcdThCRDVcdTk1RUVcdTk4OThcdUZGMDhcdTdGNTFcdTdFRENcdTMwMDFcdTYzQTdcdTUyMzZcdTUzRjBcdTMwMDFKUyBcdTVGMDJcdTVFMzhcdTMwMDFET00gXHU1QjlBXHU0RjREXHUzMDAxXG4gKiBcdTYwMjdcdTgwRkRcdTMwMDFcdThERThcdTU3REZcdTdCNDlcdUZGMDlcdUZGMENcdTVFNzZcdTRFMEVcdTk4NzlcdTc2RUVcdTgxRUFcdThFQUJcdTc3RTVcdThCQzZcdTVFOTNcdUZGMDhidWlsZEtub3dsZWRnZUNvbnRleHRcdUZGMDlcdTRFOTJcdTg4NjVcdTMwMDJcbiAqL1xuaW1wb3J0IGZzIGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG5cbi8qKiBcdTk1RUVcdTk4OThcdTRFMjVcdTkxQ0RcdTdFQTdcdTUyMkIgKi9cbmV4cG9ydCB0eXBlIFNvbHV0aW9uTGV2ZWwgPSBcImF1dG9cIiB8IFwiZ3VpZGVcIjtcblxuLyoqIFx1NEUwMFx1Njc2MVx1NTE4NVx1N0Y2RVx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OCAqL1xuZXhwb3J0IGludGVyZmFjZSBTb2x1dGlvbkVudHJ5IHtcbiAgLyoqIFx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1NjgwN1x1OEJDNlx1RkYwOFx1NzUyOFx1NEU4RVx1NTNCQlx1OTFDRCAvIFx1NUYxNVx1NzUyOFx1RkYwOSAqL1xuICBpZDogc3RyaW5nO1xuICAvKiogXHU1MzM5XHU5MTREXHU1MjMwXHU3Njg0XHU5NTE5XHU4QkVGXHU2MzA3XHU3RUI5ICovXG4gIGZpbmdlcnByaW50OiBzdHJpbmc7XG4gIC8qKiBcdTk1RUVcdTk4OThcdTRFMDBcdTUzRTVcdThCRERcdTYzQ0ZcdThGRjAgKi9cbiAgdGl0bGU6IHN0cmluZztcbiAgLyoqIFx1OTVFRVx1OTg5OFx1NzY4NFx1NkI2M1x1NTIxOVx1NTMzOVx1OTE0RFx1NkEyMVx1NUYwRlx1RkYwOFx1NUJGOVx1NTM5Rlx1NTlDQlx1OTUxOVx1OEJFRi9cdThCQ0FcdTY1QURcdTY1ODdcdTY3MkNcdTUzMzlcdTkxNERcdUZGMDkgKi9cbiAgcGF0dGVybjogUmVnRXhwO1xuICAvKiogXHU2NUI5XHU2ODQ4XHU3RUE3XHU1MjJCXHVGRjFBYXV0bz1cdTY4MDdcdTUxQzZcdTUzMTZcdTgxRUFcdTUyQThcdTUzMTZcdTc2RjRcdTYzQTVcdTYyNjdcdTg4NENcdUZGMUJndWlkZT1cdTYzQThcdTgzNTBcdTYwMURcdThERUYvc2tpbGwvXHU1RjAwXHU2RTkwXHU5ODc5XHU3NkVFICovXG4gIGxldmVsOiBTb2x1dGlvbkxldmVsO1xuICAvKiogXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU2QjYzXHU2NTg3XHVGRjA4YXV0byBcdTY1RjZcdTRFM0FcdTUzRUZcdTYyNjdcdTg4NENcdTZCNjVcdTlBQTRcdUZGMENndWlkZSBcdTY1RjZcdTRFM0FcdTYwMURcdThERUYvXHU5ODc5XHU3NkVFXHVGRjA5ICovXG4gIHNvbHV0aW9uOiBzdHJpbmc7XG4gIC8qKiBcdTVGNTMgbGV2ZWw9Z3VpZGUgXHU2NUY2XHU2M0E4XHU4MzUwXHU3Njg0XHU1MTc3XHU0RjUzXHU4NDNEXHU1NzMwXHU2NUI5XHU1RjBGICovXG4gIHNraWxsPzogc3RyaW5nO1xuICAvKiogXHU1RjUzIGxldmVsPWd1aWRlIFx1NjVGNlx1NjNBOFx1ODM1MFx1NzY4NFx1NkEyMVx1NTc1NyAvIFx1NUYwMFx1NkU5MFx1OTg3OVx1NzZFRSAqL1xuICBvcGVuU291cmNlPzogc3RyaW5nO1xuICAvKiogXHU4OUU2XHU1M0QxXHU5NjA4XHU1MDNDXHVGRjFBXHU1NDBDXHU2MzA3XHU3RUI5XHU1MUZBXHU3M0IwXHU1MUUwXHU2QjIxXHU1NDBFXHU2M0E4XHU4MzUwXHVGRjA4XHU5RUQ4XHU4QkE0IDJcdUZGMDkgKi9cbiAgdHJpZ2dlckFmdGVyPzogbnVtYmVyO1xuICAvKiogXHU1MTczXHU5NTJFXHU4QkNEXHVGRjFBXHU3NTI4XHU0RThFIGZpbmdlcnByaW50IFx1NTIyNFx1NUI5QVx1NEU0Qlx1NTkxNlx1NzY4NFx1OEY4NVx1NTJBOVx1NTMzOVx1OTE0RCAqL1xuICBrZXl3b3Jkcz86IHN0cmluZ1tdO1xuICAvKiogXHU2NUI5XHU2ODQ4XHU2NzY1XHU2RTkwXHU2ODA3XHU2Q0U4XHVGRjA4XHU5RUQ4XHU4QkE0IHNvbHV0aW9ucy1yZXBvXHVGRjFCXHU1M0VGXHU3NTI4XHU0RThFXHU3N0U1XHU4QkM2XHU0RTBBXHU0RTBCXHU2NTg3XHU2RUFGXHU2RTkwXHVGRjA5ICovXG4gIHNvdXJjZT86IHN0cmluZztcbn1cblxuLyoqIFx1NTMzOVx1OTE0RFx1N0VEM1x1Njc5QyAqL1xuZXhwb3J0IGludGVyZmFjZSBTb2x1dGlvbk1hdGNoIHtcbiAgLyoqIFx1NjYyRlx1NTQyNlx1ODlFNlx1NTNEMVx1NjNBOFx1ODM1MCAqL1xuICB0cmlnZ2VyZWQ6IGJvb2xlYW47XG4gIC8qKiBcdTk1MTlcdThCRUZcdTYzMDdcdTdFQjkgKi9cbiAgZmluZ2VycHJpbnQ6IHN0cmluZztcbiAgLyoqIFx1NURGMlx1NTFGQVx1NzNCMFx1NkIyMVx1NjU3MCAqL1xuICBvY2N1cnJlbmNlczogbnVtYmVyO1xuICAvKiogXHU1NDdEXHU0RTJEXHU3Njg0XHU2NUI5XHU2ODQ4XHVGRjA4dHJpZ2dlcmVkPXRydWUgXHU2NUY2XHU1QjU4XHU1NzI4XHVGRjA5ICovXG4gIGVudHJ5PzogU29sdXRpb25FbnRyeTtcbiAgLyoqIFx1NTQ3RFx1NEUyRFx1NzY4NFx1NjVCOVx1Njg0OFx1NjU4N1x1NjcyQ1x1RkYwOFx1NEY5Qlx1NkNFOFx1NTE2NVx1OEMwM1x1OEJENVx1NEUwQVx1NEUwQlx1NjU4NyAvIFx1NTNDRFx1OTk4OFx1RkYwOSAqL1xuICBhZHZpY2U/OiBzdHJpbmc7XG4gIC8qKiBcdTY2MkZcdTU0MjZcdTVERjJcdTVDMURcdThCRDVcdTgxRUFcdTUyQThcdTRGRUVcdTU5MERcdUZGMDhhdXRvIFx1N0VBN1x1NTIyQlx1RkYwOSAqL1xuICBhdXRvQXBwbGllZD86IGJvb2xlYW47XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogXHU1MTg1XHU3RjZFXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU3N0U1XHU4QkM2XHU1RTkzXHVGRjA4cGxheWJvb2tcdUZGMDlcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuLyoqXG4gKiBcdTUxODVcdTdGNkUgcGxheWJvb2tcdUZGMUFcdTYyOEFcdTVFMzhcdTg5QzFcdTUyNERcdTdBRUYvXHU2RDRGXHU4OUM4XHU1NjY4XHU4QzAzXHU4QkQ1XHU5NUVFXHU5ODk4XHU2NjIwXHU1QzA0XHU1MjMwXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHUzMDAyXG4gKiBcdThGRDlcdTY2MkZcdTMwMENcdTRFMERcdTk3NjBcdTg4RjhcdTVERTVcdTUxNzdcdTMwMERcdTc2ODRcdTc3RTVcdThCQzZcdTZDODlcdTZEQzAgXHUyMDE0XHUyMDE0IFx1NUY4OFx1NTkxQVx1OTVFRVx1OTg5OFx1NTE3Nlx1NUI5RVx1NjcwOVx1NjIxMFx1NzE5Rlx1ODlFM1x1RkYwQ1x1NTNFQVx1NjYyRlx1NUYwMFx1NTNEMVx1NjVGNlx1NkNBMVx1NUY4MFx1OEZEOVx1OTFDQ1x1NjBGM1x1MzAwMlxuICovXG5leHBvcnQgY29uc3QgU09MVVRJT05fUExBWUJPT0s6IFNvbHV0aW9uRW50cnlbXSA9IFtcbiAge1xuICAgIGlkOiBcIm5ldC00MDQtNTAwXCIsXG4gICAgZmluZ2VycHJpbnQ6IFwibmV0d29yazpodHRwLWVycm9yXCIsXG4gICAgdGl0bGU6IFwiXHU4RDQ0XHU2RTkwL1x1NjNBNVx1NTNFM1x1OEJGN1x1NkM0Mlx1NTkzMVx1OEQyNVx1RkYwODQwNC81MDBcdUZGMDlcIixcbiAgICBwYXR0ZXJuOiAvKD86XHU3RjUxXHU3RURDXHU1QjU4XHU1NzI4IFxcZCsgXHU0RTJBXHU1OTMxXHU4RDI1XHU4QkY3XHU2QzQyfFx1OEJGN1x1NkM0Mlx1NTkzMVx1OEQyNXxzdGF0dXMgKD86NDA0fDUwMCl8NDA0fDUwMCkvaSxcbiAgICBsZXZlbDogXCJhdXRvXCIsXG4gICAgc29sdXRpb246XG4gICAgICBcIlx1NjgwN1x1NTFDNlx1NTMxNlx1NjgyMVx1OUE4Q1x1RkYxQVx1MjQ2MCBcdTkwMTBcdTRFMkFcdTY4MzhcdTVCRjlcdTU5MzFcdThEMjUgVVJMIFx1NzY4NFx1OERFRlx1NUY4NFx1NEUwRVx1NTQwRVx1N0FFRlx1NjYyRlx1NTQyNlx1NUMzMVx1N0VFQVx1RkYxQlx1MjQ2MSBcdTgyRTVcdTY2MkZcdTUyNERcdTdBRUZcdTk3NTlcdTYwMDFcdThENDRcdTZFOTBcdUZGMENcdTY4QzBcdTY3RTVcdTYyNTNcdTUzMDVcdThERUZcdTVGODQgYmFzZSBcdTY2MkZcdTU0MjZcdTZCNjNcdTc4NkVcdUZGMDhWaXRlIGJhc2UgLyB3ZWJwYWNrIHB1YmxpY1BhdGhcdUZGMDlcdUZGMUJcdTI0NjIgXHU4MkU1XHU2NjJGXHU2M0E1XHU1M0UzXHVGRjBDXHU2OEMwXHU2N0U1XHU2NzBEXHU1MkExXHU3QUVGXHU2NjJGXHU1NDI2XHU1REYyXHU1NDJGXHU1MkE4XHUzMDAxXHU4REVGXHU3NTMxXHU2NjJGXHU1NDI2XHU2Q0U4XHU1MThDXHUzMDAyXCIsXG4gICAgdHJpZ2dlckFmdGVyOiAyLFxuICAgIGtleXdvcmRzOiBbXCI0MDRcIiwgXCI1MDBcIiwgXCJcdTU5MzFcdThEMjVcdThCRjdcdTZDNDJcIiwgXCJcdThCRjdcdTZDNDJcdTU5MzFcdThEMjVcIl0sXG4gIH0sXG4gIHtcbiAgICBpZDogXCJuZXQtY29yc1wiLFxuICAgIGZpbmdlcnByaW50OiBcIm5ldHdvcms6Y29yc1wiLFxuICAgIHRpdGxlOiBcIlx1OERFOFx1NTdERlx1RkYwOENPUlNcdUZGMDlcdTg4QUJcdTk2M0JcdTY1QURcIixcbiAgICBwYXR0ZXJuOiAvKD86Y29yc3xcdThERThcdTU3REZ8YWNjZXNzLWNvbnRyb2x8bm8gJ2FjY2Vzcy1jb250cm9sLWFsbG93LW9yaWdpbicpL2ksXG4gICAgbGV2ZWw6IFwiZ3VpZGVcIixcbiAgICBzb2x1dGlvbjpcbiAgICAgIFwiQ09SUyBcdTY2MkZcdTVFMzhcdTg5QzFcdTU3NTFcdUZGMUFcdTUyNERcdTdBRUZcdTc2RjRcdThGREVcdTRFMERcdTU0MENcdTZFOTBcdTU0MEVcdTdBRUZcdTRGMUFcdTg4QUJcdTZENEZcdTg5QzhcdTU2NjhcdTYyRTZcdTYyMkFcdTMwMDJcdTYzQThcdTgzNTBcdTY1QjlcdTY4NDhcdUZGMUFcdTRGN0ZcdTc1MjhcdTY3MkNcdTU3MzBcdTRFRTNcdTc0MDYvXHU1M0NEXHU1NDExXHU0RUUzXHU3NDA2XHVGRjA4dml0ZSBkZXYgc2VydmVyIHByb3h5IC8gbmdpbnhcdUZGMDlcdTYyOEFcdThERThcdTU3REZcdTUzRDhcdTU0MENcdTZFOTBcdUZGMUJcdTU0MEVcdTdBRUZcdTUyQTAgQ09SUyBcdTU5MzRcdUZGMDhBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cdUZGMDlcdTMwMDJcIixcbiAgICBza2lsbDogXCJjbmItcGlwZWxpbmVcIixcbiAgICBvcGVuU291cmNlOiBcInZpdGUtcHJveHkgLyBuZ2lueCAvIGh0dHAtcHJveHktbWlkZGxld2FyZVwiLFxuICAgIHRyaWdnZXJBZnRlcjogMixcbiAgICBrZXl3b3JkczogW1wiY29yc1wiLCBcIlx1OERFOFx1NTdERlwiLCBcImFjY2Vzcy1jb250cm9sXCJdLFxuICB9LFxuICB7XG4gICAgaWQ6IFwiY29uc29sZS1qcy1leGNlcHRpb25cIixcbiAgICBmaW5nZXJwcmludDogXCJjb25zb2xlOmpzLWV4Y2VwdGlvblwiLFxuICAgIHRpdGxlOiBcIlx1NjNBN1x1NTIzNlx1NTNGMCBKUyBcdTY3MkFcdTYzNTVcdTgzQjdcdTVGMDJcdTVFMzhcIixcbiAgICBwYXR0ZXJuOiAvKD86XHU5ODc1XHU5NzYyXHU2MjlCXHU1MUZBXHU0RTg2IEpTIFx1NjcyQVx1NjM1NVx1ODNCN1x1NUYwMlx1NUUzOHxcdTY3MkFcdTYzNTVcdTgzQjdcdTc2ODR8dW5jYXVnaHR8VHlwZUVycm9yfFJlZmVyZW5jZUVycm9yKS9pLFxuICAgIGxldmVsOiBcImF1dG9cIixcbiAgICBzb2x1dGlvbjpcbiAgICAgIFwiXHU2ODA3XHU1MUM2XHU1MzE2XHU2MzkyXHU5NjlDXHVGRjFBXHUyNDYwIFx1NUM1NVx1NUYwMFx1NUYwMlx1NUUzOFx1NTgwNlx1NjgwOFx1NUI5QVx1NEY0RCB0aHJvdyAvIFx1NjcyQVx1NUI5QVx1NEU0OVx1NTNEOFx1OTFDRiAvIFx1NUYwMlx1NkI2NVx1NjcyQSBjYXRjaFx1RkYxQlx1MjQ2MSBcdTc1MjggZXZhbCBcdTU3MjhcdTk4NzVcdTk3NjJcdTZDRThcdTUxNjVcdTY4QzBcdTY3RTVcdTUxNzNcdTk1MkVcdTUzRDhcdTkxQ0YvXHU1QkY5XHU4QzYxXHU2NjJGXHU1NDI2XHU1QjU4XHU1NzI4XHVGRjFCXHUyNDYyIFx1NEYxOFx1NTE0OFx1NEZFRVx1NTkwRFx1NjcwMFx1NEUwQVx1NUM0Mlx1NjcyQVx1NjM1NVx1ODNCN1x1NUYwMlx1NUUzOFx1RkYwOFx1OTAxQVx1NUUzOFx1NzUzMVx1NUI4M1x1NUYxNVx1NTNEMVx1OEZERVx1NUUyNlx1NjJBNVx1OTUxOVx1RkYwOVx1MzAwMlwiLFxuICAgIHRyaWdnZXJBZnRlcjogMixcbiAgICBrZXl3b3JkczogW1wianMgXHU1RjAyXHU1RTM4XCIsIFwiXHU2NzJBXHU2MzU1XHU4M0I3XCIsIFwidW5jYXVnaHRcIiwgXCJ0eXBlZXJyb3JcIl0sXG4gIH0sXG4gIHtcbiAgICBpZDogXCJkb20tbG9jYXRvci1mYWlsZWRcIixcbiAgICBmaW5nZXJwcmludDogXCJkb206bG9jYXRvci1mYWlsZWRcIixcbiAgICB0aXRsZTogXCJcdTUxNDNcdTdEMjBcdTVCOUFcdTRGNEQvXHU3MEI5XHU1MUZCXHU1OTMxXHU4RDI1XCIsXG4gICAgcGF0dGVybjogLyg/Olx1NjcyQVx1NjI3RVx1NTIzMFx1NTE0M1x1N0QyMHxcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNER8XHU1QjlBXHU0RjREXHU1OTMxXHU4RDI1fFx1NUI5QVx1NEY0RC4qXHU1OTMxXHU4RDI1fG5vdCBmb3VuZHxubyBlbGVtZW50fGVsZW1lbnQgbm90IGZvdW5kfFx1NjI3RVx1NEUwRFx1NTIzMCkvaSxcbiAgICBsZXZlbDogXCJhdXRvXCIsXG4gICAgc29sdXRpb246XG4gICAgICBcIlx1NjgwN1x1NTFDNlx1NTMxNlx1OTFDRFx1OEJENVx1RkYxQVx1MjQ2MCBcdTY1MzlcdTc1MjhcdTY2RjRcdTdBMzNcdTVCOUFcdTc2ODRcdTVCOUFcdTRGNERcdTdCNTZcdTc1NjVcdUZGMDhyZWZcdTIxOTJzZWxlY3Rvclx1MjE5MnNlbWFudGljIFx1OTAxMFx1N0VBN1x1OTY0RFx1N0VBN1x1RkYwOVx1RkYxQlx1MjQ2MSBcdTUxNDNcdTdEMjBcdTUzRUZcdTgwRkRcdTU3MjhcdTVGMDJcdTZCNjVcdTZFMzJcdTY3RDNcdTU0MEVcdTUxRkFcdTczQjBcdUZGMENcdTUxNDggd2FpdCBcdTUxOERcdTY0Q0RcdTRGNUNcdUZGMUJcdTI0NjIgXHU4MkU1XHU1RjM5XHU3QTk3L2lmcmFtZSBcdTkwNkVcdTYzMjFcdUZGMENcdTUxNDhcdTUyMDdcdTYzNjIgZnJhbWUgXHU2MjE2XHU1MTczXHU5NUVEXHU1RjM5XHU1QzQyXHUzMDAyXCIsXG4gICAgdHJpZ2dlckFmdGVyOiAyLFxuICAgIGtleXdvcmRzOiBbXCJcdTY3MkFcdTYyN0VcdTUyMzBcdTUxNDNcdTdEMjBcIiwgXCJcdTY1RTBcdTZDRDVcdTVCOUFcdTRGNERcdTUxNDNcdTdEMjBcIiwgXCJcdTVCOUFcdTRGNERcdTU5MzFcdThEMjVcIiwgXCJlbGVtZW50IG5vdCBmb3VuZFwiXSxcbiAgfSxcbiAge1xuICAgIGlkOiBcInBlcmYtdHRmYi1zbG93XCIsXG4gICAgZmluZ2VycHJpbnQ6IFwicGVyZm9ybWFuY2U6dHRmYlwiLFxuICAgIHRpdGxlOiBcIlx1NjNBNVx1NTNFM1x1NTRDRFx1NUU5NFx1NjE2Mlx1RkYwOFRURkIgXHU1MDRGXHU5QUQ4XHVGRjA5XCIsXG4gICAgcGF0dGVybjogLyg/OlRURkIgXHU1MDRGXHU5QUQ4fFRURkIuKm1zfFx1NjE2Mlx1OEJGN1x1NkM0MikvaSxcbiAgICBsZXZlbDogXCJndWlkZVwiLFxuICAgIHNvbHV0aW9uOlxuICAgICAgXCJcdTYwMjdcdTgwRkRcdTc0RjZcdTk4ODhcdTVFMzhcdTg5QzFcdTg5RTNcdUZGMUFcdTI0NjAgXHU0RjE4XHU1MTQ4XHU2MzkyXHU2N0U1XHU2NzBEXHU1MkExXHU3QUVGXHU1OTA0XHU3NDA2XHVGRjA4XHU2NTcwXHU2MzZFXHU1RTkzXHU2N0U1XHU4QkUyXHUzMDAxXHU1NDBDXHU2QjY1XHU5MDNCXHU4RjkxXHVGRjA5XHU0RTBFXHU3RjUxXHU3RURDXHU5NEZFXHU4REVGXHVGRjFCXHUyNDYxIFx1NTJBMFx1N0YxM1x1NUI1OFx1RkYwOENETiAvIFx1NjcwRFx1NTJBMVx1N0FFRlx1N0YxM1x1NUI1OCAvIEhUVFAgXHU3RjEzXHU1QjU4XHVGRjA5XHVGRjFCXHUyNDYyIFx1NTQwOFx1NUU3Nlx1OEJGN1x1NkM0Mlx1MzAwMVx1NTM4Qlx1N0YyOVx1NEY1M1x1NzlFRlx1MzAwMlx1NTNFRlx1NzUyOCBQZXJmb3JtYW5jZSBcdTk3NjJcdTY3N0YvXHU4QkNBXHU2NUFEXHU2MkE1XHU1NDRBXHU3Njg0IFRURkIgXHU2MkM2XHU1MjA2XHU1QjlBXHU0RjREXHU2NjJGXHU3RjUxXHU3RURDXHU4RkQ4XHU2NjJGXHU2NzBEXHU1MkExXHU3QUVGXHU2MTYyXHUzMDAyXCIsXG4gICAgc2tpbGw6IFwiY25iLXBpcGVsaW5lXCIsXG4gICAgb3BlblNvdXJjZTogXCJyZWRpcy1jYWNoZSAvIG5naW54LWNhY2hlIC8gdml0ZS1idW5kbGUtYW5hbHl6ZXJcIixcbiAgICB0cmlnZ2VyQWZ0ZXI6IDIsXG4gICAga2V5d29yZHM6IFtcInR0ZmJcIiwgXCJcdTYxNjJcdThCRjdcdTZDNDJcIiwgXCJcdTYwMjdcdTgwRkRcIl0sXG4gIH0sXG4gIHtcbiAgICBpZDogXCJkb20tc3NyLWh5ZHJhdGlvblwiLFxuICAgIGZpbmdlcnByaW50OiBcImRvbTpoeWRyYXRpb24tbWlzbWF0Y2hcIixcbiAgICB0aXRsZTogXCJTU1IgXHU2QzM0XHU1NDA4XHU0RTBEXHU0RTAwXHU4MUY0XHVGRjA4aHlkcmF0aW9uIG1pc21hdGNoXHVGRjA5XCIsXG4gICAgcGF0dGVybjogLyg/Omh5ZHJhdGlvbnxcdTZDMzRcdTU0MDh8c2VydmVyLXJlbmRlcmVkIGNvbnRlbnR8ZGlkIG5vdCBtYXRjaCkvaSxcbiAgICBsZXZlbDogXCJndWlkZVwiLFxuICAgIHNvbHV0aW9uOlxuICAgICAgXCJTU1IgXHU2QzM0XHU1NDA4XHU0RTBEXHU0RTAwXHU4MUY0XHU2NjJGXHU1RTM4XHU4OUMxXHU1NzUxXHVGRjA4XHU2NzBEXHU1MkExXHU3QUVGXHU2RTMyXHU2N0QzIERPTSBcdTRFMEVcdTVCQTJcdTYyMzdcdTdBRUZcdTk5OTZcdTZCMjFcdTZFMzJcdTY3RDNcdTRFMERcdTRFMDBcdTgxRjRcdUZGMDlcdTMwMDJcdTYzQThcdTgzNTBcdTYwMURcdThERUZcdUZGMUFcdTI0NjAgXHU5MDdGXHU1MTREXHU1NzI4XHU2RTMyXHU2N0QzXHU2NzFGXHU5NUY0XHU0RjlEXHU4RDU2XHU2RDRGXHU4OUM4XHU1NjY4XHU3MkVDXHU2NzA5IEFQSVx1RkYwOHdpbmRvdy9kb2N1bWVudFx1RkYwOVx1RkYxQlx1MjQ2MSBcdTc1Mjggc3VwcHJlc3NIeWRyYXRpb25XYXJuaW5nIFx1NjIxNlx1NUJBMlx1NjIzN1x1N0FFRlx1NjI0RFx1NkUzMlx1NjdEM1x1NzY4NFx1N0VDNFx1NEVGNlx1OTY5NFx1NzlCQlx1NURFRVx1NUYwMlx1RkYxQlx1MjQ2MiBcdTYzOTJcdTY3RTUgZGF0ZS9yYW5kb20vbG9jYWxlIFx1N0I0OVx1OTc1RVx1Nzg2RVx1NUI5QVx1NjAyN1x1OEY5M1x1NTFGQVx1MzAwMlwiLFxuICAgIHNraWxsOiBcImNuYi1kb2NzXCIsXG4gICAgb3BlblNvdXJjZTogXCJyZWFjdC1kb20gaHlkcmF0aW9uIC8gbmV4dC5qcyAvIG51eHRcIixcbiAgICB0cmlnZ2VyQWZ0ZXI6IDIsXG4gICAga2V5d29yZHM6IFtcImh5ZHJhdGlvblwiLCBcIlx1NkMzNFx1NTQwOFwiLCBcImRpZCBub3QgbWF0Y2hcIl0sXG4gIH0sXG4gIHtcbiAgICBpZDogXCJsb2dpbi1hdXRoLXJlZGlyZWN0XCIsXG4gICAgZmluZ2VycHJpbnQ6IFwiYXV0aDpyZWRpcmVjdFwiLFxuICAgIHRpdGxlOiBcIlx1NzY3Qlx1NUY1NS9cdTkyNzRcdTY3NDNcdThERjNcdThGNkNcdTVCRkNcdTgxRjRcdTc2RUVcdTY4MDdcdTk4NzVcdTRFMERcdTUzRUZcdThGQkVcIixcbiAgICBwYXR0ZXJuOiAvKD86XHU3NjdCXHU1RjU1fHJlZGlyZWN0fFx1OTFDRFx1NUI5QVx1NTQxMXw0MDF8NDAzfFx1OTcwMFx1ODk4MVx1NzY3Qlx1NUY1NXxcdTY3MkFcdTYzODhcdTY3NDMpL2ksXG4gICAgbGV2ZWw6IFwiZ3VpZGVcIixcbiAgICBzb2x1dGlvbjpcbiAgICAgIFwiXHU3NjdCXHU1RjU1XHU2MDAxL1x1OTI3NFx1Njc0M1x1NjJFNlx1NjIyQVx1NjYyRlx1OUFEOFx1OTg5MVx1NTM5Rlx1NTZFMFx1RkYxQVx1NzZFRVx1NjgwN1x1OTg3NVx1NUUzOFx1ODhBQlx1OTFDRFx1NUI5QVx1NTQxMVx1NTIzMFx1NzY3Qlx1NUY1NVx1OTg3NVx1MzAwMlx1NjNBOFx1ODM1MFx1NjAxRFx1OERFRlx1RkYxQVx1MjQ2MCBcdTc1MjhcdTk4NzlcdTc2RUVcdTc3RTVcdThCQzZcdTVFOTNcdUZGMDhidWlsZEtub3dsZWRnZUNvbnRleHRcdUZGMDlcdTZDRThcdTUxNjVcdTZENEJcdThCRDVcdThEMjZcdTUzRjcvXHU1MTg1XHU3RjUxXHU1N0RGXHU1NDBEXHU3RUE2XHU1QjlBXHVGRjFCXHUyNDYxIFx1NTE0OFx1OEQ3MFx1NzY3Qlx1NUY1NVx1NkQ0MVx1N0EwQlx1NTE4RFx1NUJGQ1x1ODIyQVx1NzZFRVx1NjgwN1x1OTg3NVx1RkYxQlx1MjQ2MiBcdTY4QzBcdTY3RTVcdTY2MkZcdTU0MjZcdTU2RTAgQ29va2llL3Rva2VuIFx1N0YzQVx1NTkzMVx1ODhBQiA0MDEvNDAzIFx1NjJFNlx1NjIyQVx1MzAwMlwiLFxuICAgIHNraWxsOiBcImNuYi1yZXBvLWtub3dsZWRnZS1iYXNlXCIsXG4gICAgb3BlblNvdXJjZTogXCJwbGF5d3JpZ2h0IHN0b3JhZ2VTdGF0ZSAvIGF1dGggZml4dHVyZVwiLFxuICAgIHRyaWdnZXJBZnRlcjogMixcbiAgICBrZXl3b3JkczogW1wiXHU3NjdCXHU1RjU1XCIsIFwiXHU5Mjc0XHU2NzQzXCIsIFwiNDAxXCIsIFwiNDAzXCIsIFwiXHU5MUNEXHU1QjlBXHU1NDExXCJdLFxuICB9LFxuICB7XG4gICAgaWQ6IFwiYmxhbmstd2hpdGUtcGFnZVwiLFxuICAgIGZpbmdlcnByaW50OiBcImRvbTpibGFuay1wYWdlXCIsXG4gICAgdGl0bGU6IFwiXHU5ODc1XHU5NzYyXHU3QTdBXHU3NjdEL1x1NjcyQVx1NkUzMlx1NjdEM1wiLFxuICAgIHBhdHRlcm46IC8oPzpcdTdBN0FcdTc2N0R8XHU3NjdEXHU1QzRGfGJsYW5rfG5vdGhpbmd8XHU3QTdBXHU5ODc1XHU5NzYyfFx1NjcyQVx1NkUzMlx1NjdEMykvaSxcbiAgICBsZXZlbDogXCJhdXRvXCIsXG4gICAgc29sdXRpb246XG4gICAgICBcIlx1NjgwN1x1NTFDNlx1NTMxNlx1NjM5Mlx1NjdFNVx1NzY3RFx1NUM0Rlx1RkYxQVx1MjQ2MCBcdTc3MEJcdTYzQTdcdTUyMzZcdTUzRjBcdTY2MkZcdTU0MjYgSlMgXHU2MkE1XHU5NTE5XHU1QkZDXHU4MUY0XHU2NTc0XHU2ODExXHU2NzJBXHU2RTMyXHU2N0QzXHVGRjA4XHU1RTM4XHU4OUMxXHU0RThFXHU2NzJBIGNhdGNoIFx1NzY4NFx1NTIxRFx1NTlDQlx1NTMxNlx1NUYwMlx1NUUzOFx1RkYwOVx1RkYxQlx1MjQ2MSBcdTY4QzBcdTY3RTVcdThENDRcdTZFOTBcdTY2MkZcdTU0MjZcdTg4QUJcdTYyRTZcdTYyMkFcdUZGMDhDU1AvXHU1MkEwXHU4RjdEXHU1OTMxXHU4RDI1XHVGRjA5XHVGRjFCXHUyNDYyIFx1Nzg2RVx1OEJBNFx1NjMwMlx1OEY3RFx1ODI4Mlx1NzBCOVx1NjYyRlx1NTQyNlx1NUI1OFx1NTcyOFx1MzAwMVx1Njg0Nlx1NjdCNlx1NjYyRlx1NTQyNlx1NkI2M1x1NUUzOCBib290c3RyYXBcdTMwMDJcIixcbiAgICB0cmlnZ2VyQWZ0ZXI6IDIsXG4gICAga2V5d29yZHM6IFtcIlx1NzY3RFx1NUM0RlwiLCBcIlx1N0E3QVx1NzY3RFwiLCBcImJsYW5rXCJdLFxuICB9LFxuXTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBcdTk1MTlcdThCRUZcdTYzMDdcdTdFQjlcdUZGMDhmaW5nZXJwcmludFx1RkYwOVx1NUY1Mlx1NEUwMFx1NTMxNlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4vKipcbiAqIFx1NEVDRVx1OTUxOVx1OEJFRlx1NjU4N1x1NjcyQyAvIFx1OEJDQVx1NjVBRFx1NjQ1OFx1ODk4MVx1NUY1Mlx1NEUwMFx1NTMxNlx1NEUzQVx1N0EzM1x1NUI5QVx1NzY4NFx1OTUxOVx1OEJFRlx1NjMwN1x1N0VCOVx1MzAwMlxuICogXHU2MzA3XHU3RUI5XHU3NTI4XHU0RThFXHUzMDBDXHU1NDBDXHU3QzdCXHU5NTE5XHU4QkVGXHU4QkM2XHU1MjJCXHUzMDBEXHU1NDhDXHUzMDBDXHU0RThDXHU2QjIxXHU4OUU2XHU1M0QxXHU1M0JCXHU5MUNEXHUzMDBEXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5nZXJwcmludEVycm9yKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghdGV4dCkgcmV0dXJuIFwidW5rbm93blwiO1xuICBjb25zdCB0ID0gdGV4dC50b0xvd2VyQ2FzZSgpO1xuICAvLyBcdTdGNTFcdTdFRENcdTk1MTlcdThCRUZcdUZGMDhcdTUxNDhcdTUyMjQgQ09SUy9cdThERThcdTU3REZcdUZGMENcdTUxOERcdTUyMjQgSFRUUCBcdTk1MTlcdThCRUZcdUZGMUJcdTZDRThcdTYxMEZcdTYyOEEgVFRGQi9cdTYxNjJcdThCRjdcdTZDNDJcdTYzRDBcdTUyNERcdUZGMENcdTkwN0ZcdTUxNEQgXCIxNTAwbXNcIiBcdTkxQ0NcdTc2ODQgNTAwIFx1OEJFRlx1NTIyNFx1NEUzQSBIVFRQIFx1OTUxOVx1OEJFRlx1RkYwOVxuICBpZiAoL2NvcnN8YWNjZXNzLWNvbnRyb2x8XHU4REU4XHU1N0RGLy50ZXN0KHQpKSByZXR1cm4gXCJuZXR3b3JrOmNvcnNcIjtcbiAgLy8gXHU2MDI3XHU4MEZEXHVGRjFBVFRGQiAvIFx1NjE2Mlx1OEJGN1x1NkM0Mlx1RkYwOFx1NEYxOFx1NTE0OFx1NEU4RSBIVFRQIFx1OTUxOVx1OEJFRlx1NTIyNFx1NUI5QVx1RkYwQ1x1NTZFMFx1NEUzQVx1NjU3MFx1NTAzQ1x1OTFDQ1x1NTNFRlx1ODBGRFx1NTQyQiA1MDAvNDA0IFx1NjU3MFx1NUI1N1x1RkYwOVxuICBpZiAoL3R0ZmJ8XHU2MTYyXHU4QkY3XHU2QzQyLy50ZXN0KHQpKSByZXR1cm4gXCJwZXJmb3JtYW5jZTp0dGZiXCI7XG4gIC8vIFx1N0Y1MVx1N0VEQyBIVFRQIFx1OTUxOVx1OEJFRlx1RkYwOFx1NEVDNVx1NUY1M1x1NjYwRVx1Nzg2RVx1NTFGQVx1NzNCMFx1NTkzMVx1OEQyNVx1OEJFRFx1NEU0OVx1NjIxNlx1NzJCNlx1NjAwMVx1NzgwMVx1RkYwQ1x1OTA3Rlx1NTE0RFx1OEJFRlx1NTIyNFx1NjU3MFx1NTAzQ1x1RkYwOVxuICBpZiAoL1x1NTkzMVx1OEQyNVx1OEJGN1x1NkM0MnxcdThCRjdcdTZDNDJcdTU5MzFcdThEMjV8cmVxdWVzdCBmYWlsZWR8c3RhdHVzXFxzKls6XFxzXSooPzo0MDR8NTAwKS8udGVzdCh0KSkgcmV0dXJuIFwibmV0d29yazpodHRwLWVycm9yXCI7XG4gIGlmICgvXFxiKD86NDA0fDUwMClcXGIvLnRlc3QodCkgJiYgIS9cXGR7NCx9Ly50ZXN0KHQpKSByZXR1cm4gXCJuZXR3b3JrOmh0dHAtZXJyb3JcIjtcbiAgLy8gSlMgXHU1RjAyXHU1RTM4XG4gIGlmICgvdW5jYXVnaHR8XHU2NzJBXHU2MzU1XHU4M0I3fHR5cGVlcnJvcnxyZWZlcmVuY2VlcnJvcnxqcyBcdTVGMDJcdTVFMzgvLnRlc3QodCkpIHJldHVybiBcImNvbnNvbGU6anMtZXhjZXB0aW9uXCI7XG4gIC8vIERPTSBcdTVCOUFcdTRGNERcbiAgaWYgKC9cdTY3MkFcdTYyN0VcdTUyMzB8XHU2NUUwXHU2Q0Q1XHU1QjlBXHU0RjREfFx1NUI5QVx1NEY0RFx1NTkzMVx1OEQyNXxcdTVCOUFcdTRGNEQuKlx1NTkzMVx1OEQyNXxlbGVtZW50IG5vdCBmb3VuZHxubyBlbGVtZW50fG5vdCBmb3VuZHxcdTYyN0VcdTRFMERcdTUyMzAvLnRlc3QodCkpIHJldHVybiBcImRvbTpsb2NhdG9yLWZhaWxlZFwiO1xuICAvLyBcdTkyNzRcdTY3NDNcbiAgaWYgKC80MDF8NDAzfFx1NzY3Qlx1NUY1NXxcdTkyNzRcdTY3NDN8XHU2NzJBXHU2Mzg4XHU2NzQzfHJlZGlyZWN0fFx1OTFDRFx1NUI5QVx1NTQxMS8udGVzdCh0KSkgcmV0dXJuIFwiYXV0aDpyZWRpcmVjdFwiO1xuICAvLyBcdTZDMzRcdTU0MDhcbiAgaWYgKC9oeWRyYXRpb258XHU2QzM0XHU1NDA4fGRpZCBub3QgbWF0Y2gvLnRlc3QodCkpIHJldHVybiBcImRvbTpoeWRyYXRpb24tbWlzbWF0Y2hcIjtcbiAgLy8gXHU3NjdEXHU1QzRGXG4gIGlmICgvXHU3NjdEXHU1QzRGfFx1N0E3QVx1NzY3RHxibGFua3xcdTY3MkFcdTZFMzJcdTY3RDMvLnRlc3QodCkpIHJldHVybiBcImRvbTpibGFuay1wYWdlXCI7XG4gIC8vIFx1OTAxQVx1NzUyOFx1NTkzMVx1OEQyNVx1RkYwOFx1NTE1Q1x1NUU5NVx1RkYwQ1x1OTY0RFx1NEY0RVx1OEJFRlx1NjJBNVx1RkYxQVx1OEZEOVx1N0M3Qlx1NEUwRFx1NUYzQVx1ODlFNlx1NTNEMVx1RkYwOVxuICByZXR1cm4gXCJnZW5lcmljOmFjdGlvbi1mYWlsZWRcIjtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBcdTkxQ0RcdTU5MERcdTk1MTlcdThCRUZcdTZDRThcdTUxOENcdTg4NjhcdUZGMDhcdTRFOENcdTZCMjFcdTg5RTZcdTUzRDFcdUZGMDlcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuLyoqXG4gKiBcdTkxQ0RcdTU5MERcdTk1MTlcdThCRUZcdTZDRThcdTUxOENcdTg4NjhcdUZGMUFcdThCQjBcdTVGNTVcdTZCQ0ZcdTRFMkFcdTk1MTlcdThCRUZcdTYzMDdcdTdFQjlcdTc2ODRcdTUxRkFcdTczQjBcdTZCMjFcdTY1NzBcdTMwMDJcbiAqIFx1NTNFQVx1NjcwOVx1NUY1M1x1NjdEMFx1NjMwN1x1N0VCOVx1NTFGQVx1NzNCMFx1NkIyMVx1NjU3MFx1OEZCRVx1NTIzMCBgdHJpZ2dlckFmdGVyYFx1RkYwOFx1OUVEOFx1OEJBNCAyXHVGRjA5XHU2NUY2XHU2MjREXHU4OUU2XHU1M0QxXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU2M0E4XHU4MzUwXHVGRjBDXG4gKiBcdTVCOUVcdTczQjBcdTMwMENcdTRFMERcdTU5MUFcdTRGNTlcdUZGMENcdTRFNUZcdTRFMERcdTU2RjBcdTU4ODNcdTMwMERcdTIwMTRcdTIwMTRcdTdCMkMgMSBcdTZCMjFcdTk3NTlcdTlFRDhcdUZGMENcdTdCMkMgMiBcdTZCMjFcdTYyNERcdTdFRDlcdTUxRkFcdTY3MDlcdTRFRjdcdTUwM0NcdTc2ODRcdTY1QjlcdTY4NDhcdTMwMDJcbiAqL1xuZXhwb3J0IGNsYXNzIFJlcGVhdEVycm9yUmVnaXN0cnkge1xuICBwcml2YXRlIGNvdW50cyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gIC8qKiBcdTgxRUFcdTVCOUFcdTRFNDlcdTg5RTZcdTUzRDFcdTk2MDhcdTUwM0NcdUZGMDhcdTlFRDhcdThCQTQgMlx1RkYwOSAqL1xuICBwcml2YXRlIHRocmVzaG9sZDogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKHRocmVzaG9sZCA9IDIpIHtcbiAgICB0aGlzLnRocmVzaG9sZCA9IHRocmVzaG9sZDtcbiAgfVxuXG4gIC8qKiBcdThCQjBcdTVGNTVcdTRFMDBcdTZCMjFcdTk1MTlcdThCRUZcdUZGMENcdThGRDRcdTU2REVcdTY2MkZcdTU0MjZcdThGQkVcdTUyMzBcdTg5RTZcdTUzRDFcdTk2MDhcdTUwM0MgKi9cbiAgcmVjb3JkKHRleHQ6IHN0cmluZyk6IHsgZmluZ2VycHJpbnQ6IHN0cmluZzsgb2NjdXJyZW5jZXM6IG51bWJlcjsgdHJpZ2dlcmVkOiBib29sZWFuIH0ge1xuICAgIGNvbnN0IGZwID0gZmluZ2VycHJpbnRFcnJvcih0ZXh0KTtcbiAgICBjb25zdCBvY2N1cnJlbmNlcyA9ICh0aGlzLmNvdW50cy5nZXQoZnApID8/IDApICsgMTtcbiAgICB0aGlzLmNvdW50cy5zZXQoZnAsIG9jY3VycmVuY2VzKTtcbiAgICByZXR1cm4geyBmaW5nZXJwcmludDogZnAsIG9jY3VycmVuY2VzLCB0cmlnZ2VyZWQ6IG9jY3VycmVuY2VzID49IHRoaXMudGhyZXNob2xkIH07XG4gIH1cblxuICAvKiogXHU2N0U1XHU4QkUyXHU2N0QwXHU2MzA3XHU3RUI5XHU1RjUzXHU1MjREXHU2QjIxXHU2NTcwXHVGRjA4XHU0RTBEXHU2NTM5XHU1M0Q4XHU4QkExXHU2NTcwXHVGRjA5ICovXG4gIHBlZWsodGV4dDogc3RyaW5nKTogeyBmaW5nZXJwcmludDogc3RyaW5nOyBvY2N1cnJlbmNlczogbnVtYmVyIH0ge1xuICAgIGNvbnN0IGZwID0gZmluZ2VycHJpbnRFcnJvcih0ZXh0KTtcbiAgICByZXR1cm4geyBmaW5nZXJwcmludDogZnAsIG9jY3VycmVuY2VzOiB0aGlzLmNvdW50cy5nZXQoZnApID8/IDAgfTtcbiAgfVxuXG4gIC8qKiBcdTkxQ0RcdTdGNkVcdUZGMDhcdTY1QjBcdTRFMDBcdThGNkVcdThDMDNcdThCRDVcdTVGMDBcdTU5Q0JcdTY1RjZcdTUzRUZcdThDMDNcdTc1MjhcdUZGMDkgKi9cbiAgcmVzZXQoKTogdm9pZCB7XG4gICAgdGhpcy5jb3VudHMuY2xlYXIoKTtcbiAgfVxufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1NTMzOVx1OTE0RFxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4vKipcbiAqIFx1NTcyOCBwbGF5Ym9vayBcdTRFMkRcdTY3RTVcdTYyN0VcdTRFMEVcdTk1MTlcdThCRUZcdTY1ODdcdTY3MkNcdTUzMzlcdTkxNERcdTc2ODRcdTY1QjlcdTY4NDhcdTY3NjFcdTc2RUVcdTMwMDJcbiAqIFx1NEYxOFx1NTE0OFx1N0NCRVx1Nzg2RVx1NTMzOVx1OTE0RCBmaW5nZXJwcmludFx1RkYwQ1x1NTE3Nlx1NkIyMVx1NzUyOCBwYXR0ZXJuL2tleXdvcmRzIFx1NTE1Q1x1NUU5NVx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9va3VwU29sdXRpb24odGV4dDogc3RyaW5nLCBmaW5nZXJwcmludD86IHN0cmluZyk6IFNvbHV0aW9uRW50cnkgfCB1bmRlZmluZWQge1xuICBjb25zdCBmcCA9IGZpbmdlcnByaW50ID8/IGZpbmdlcnByaW50RXJyb3IodGV4dCk7XG4gIGNvbnN0IHQgPSB0ZXh0LnRvTG93ZXJDYXNlKCk7XG5cbiAgLy8gMS4gZmluZ2VycHJpbnQgXHU3Q0JFXHU3ODZFXHU1NDdEXHU0RTJEXG4gIGNvbnN0IGJ5RnAgPSBTT0xVVElPTl9QTEFZQk9PSy5maW5kKChzKSA9PiBzLmZpbmdlcnByaW50ID09PSBmcCk7XG4gIGlmIChieUZwKSByZXR1cm4gYnlGcDtcblxuICAvLyAyLiBcdTZCNjNcdTUyMTkgcGF0dGVybiBcdTU0N0RcdTRFMkRcbiAgY29uc3QgYnlQYXR0ZXJuID0gU09MVVRJT05fUExBWUJPT0suZmluZCgocykgPT4gcy5wYXR0ZXJuLnRlc3QodGV4dCkpO1xuICBpZiAoYnlQYXR0ZXJuKSByZXR1cm4gYnlQYXR0ZXJuO1xuXG4gIC8vIDMuIFx1NTE3M1x1OTUyRVx1OEJDRFx1NTE1Q1x1NUU5NVxuICBjb25zdCBieUtleXdvcmQgPSBTT0xVVElPTl9QTEFZQk9PSy5maW5kKFxuICAgIChzKSA9PiBzLmtleXdvcmRzICYmIHMua2V5d29yZHMuc29tZSgoaykgPT4gdC5pbmNsdWRlcyhrLnRvTG93ZXJDYXNlKCkpKVxuICApO1xuICByZXR1cm4gYnlLZXl3b3JkO1xufVxuXG4vKipcbiAqIFx1NjgzOFx1NUZDM1x1NTMzOVx1OTE0RFx1NTE2NVx1NTNFM1x1RkYxQVxuICogXHU3RUQ5XHU1QjlBXHU0RTAwXHU2QjIxXHU5NTE5XHU4QkVGXHU2NTg3XHU2NzJDXHVGRjBDXHU3RUQzXHU1NDA4XHU5MUNEXHU1OTBEXHU2Q0U4XHU1MThDXHU4ODY4XHU1MDVBXHUzMDBDXHU0RThDXHU2QjIxXHU4OUU2XHU1M0QxXHUzMDBEXHU1MjI0XHU1QjlBXHVGRjBDXG4gKiBcdTU0N0RcdTRFMkRcdTUyMTlcdThGRDRcdTU2REVcdTg5RTNcdTUxQjNcdTY1QjlcdTY4NDhcdUZGMDhcdTU0MkIgYXV0by9ndWlkZSBcdTUyMDZcdTdFQTdcdTRFMEVcdTUzRUZcdTYyNjdcdTg4NENcdTVFRkFcdThCQUVcdUZGMDlcdTMwMDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoU29sdXRpb24ocmVnaXN0cnk6IFJlcGVhdEVycm9yUmVnaXN0cnksIGVycm9yVGV4dDogc3RyaW5nKTogU29sdXRpb25NYXRjaCB7XG4gIGNvbnN0IHsgZmluZ2VycHJpbnQsIG9jY3VycmVuY2VzLCB0cmlnZ2VyZWQgfSA9IHJlZ2lzdHJ5LnJlY29yZChlcnJvclRleHQpO1xuICBpZiAoIXRyaWdnZXJlZCkge1xuICAgIHJldHVybiB7IHRyaWdnZXJlZDogZmFsc2UsIGZpbmdlcnByaW50LCBvY2N1cnJlbmNlcyB9O1xuICB9XG4gIGNvbnN0IGVudHJ5ID0gbG9va3VwU29sdXRpb24oZXJyb3JUZXh0LCBmaW5nZXJwcmludCk7XG4gIGlmICghZW50cnkpIHtcbiAgICByZXR1cm4geyB0cmlnZ2VyZWQ6IHRydWUsIGZpbmdlcnByaW50LCBvY2N1cnJlbmNlcyB9O1xuICB9XG4gIHJldHVybiB7XG4gICAgdHJpZ2dlcmVkOiB0cnVlLFxuICAgIGZpbmdlcnByaW50LFxuICAgIG9jY3VycmVuY2VzLFxuICAgIGVudHJ5LFxuICAgIGFkdmljZTogcmVuZGVyQWR2aWNlKGVudHJ5KSxcbiAgfTtcbn1cblxuLyoqIFx1NkUzMlx1NjdEM1x1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1NjU4N1x1NjcyQyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckFkdmljZShlbnRyeTogU29sdXRpb25FbnRyeSk6IHN0cmluZyB7XG4gIGNvbnN0IGhlYWQgPSBgW1x1NURGMlx1N0IyQyAyIFx1NkIyMVx1OTA0N1x1NTIzMFx1NTQwQ1x1N0M3Qlx1OTVFRVx1OTg5OFx1RkY1Q1x1NjVCOVx1Njg0OFx1NjNBOFx1ODM1MF0gJHtlbnRyeS50aXRsZX1cdUZGMDhcdTdFQTdcdTUyMkI6ICR7ZW50cnkubGV2ZWwgPT09IFwiYXV0b1wiID8gXCJcdTgxRUFcdTUyQThcdTRGRUVcdTU5MERcIiA6IFwiXHU2MDFEXHU4REVGXHU1RjE1XHU1QkZDXCJ9XHVGRjA5YDtcbiAgY29uc3QgbGluZXMgPSBbaGVhZCwgYD4gJHtlbnRyeS5zb2x1dGlvbn1gXTtcbiAgaWYgKGVudHJ5LmxldmVsID09PSBcImd1aWRlXCIpIHtcbiAgICBpZiAoZW50cnkuc2tpbGwpIGxpbmVzLnB1c2goYD4gXHU2M0E4XHU4MzUwIHNraWxsXHVGRjFBJHtlbnRyeS5za2lsbH1gKTtcbiAgICBpZiAoZW50cnkub3BlblNvdXJjZSkgbGluZXMucHVzaChgPiBcdTYzQThcdTgzNTBcdTY1QjlcdTY4NDgvXHU1RjAwXHU2RTkwXHU5ODc5XHU3NkVFXHVGRjFBJHtlbnRyeS5vcGVuU291cmNlfWApO1xuICAgIGxpbmVzLnB1c2goXCI+IFx1NjAxRFx1OERFRlx1RkYxQVx1NTE0OFx1NUI5QVx1NEY0RFx1NjgzOVx1NTZFMFx1RkYwQ1x1NTE4RFx1NjMwOVx1NEUwQVx1OEZGMFx1OTg3OVx1NzZFRS9cdTYyODBcdTgwRkRcdTg0M0RcdTU3MzBcdUZGMENcdTUzRUZcdTY2M0VcdTg0NTdcdTUxQ0ZcdTVDMTFcdTkxQ0RcdTU5MERcdTkwMjBcdThGNkVcdTVCNTBcdTMwMDJcIik7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbi8qKiBcdTlFRDhcdThCQTRcdTZDRThcdTUxOENcdTg4NjhcdTVCOUVcdTRGOEJcdUZGMDhcdTRGOUJcdTY1RTBcdTcyQjZcdTYwMDFcdThDMDNcdTc1MjhcdTU5MERcdTc1MjhcdUZGMENcdTUzRUZcdTYzMDlcdTRGMUFcdThCREQgcmVzZXRcdUZGMDkgKi9cbmV4cG9ydCBjb25zdCBkZWZhdWx0UmVnaXN0cnkgPSBuZXcgUmVwZWF0RXJyb3JSZWdpc3RyeSgpO1xuXG4vKipcbiAqIFx1NEZCRlx1NjM3N1x1NTFGRFx1NjU3MFx1RkYxQVx1NjI4QVx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1NkNFOFx1NTE2NVx1NTIzMFx1NEUwMFx1Njc2MVx1OEMwM1x1OEJENVx1NEUwQVx1NEUwQlx1NjU4N1x1OTFDQ1x1MzAwMlxuICogXHU4MkU1XHU1REYyXHU4OUU2XHU1M0QxXHVGRjA4XHU3QjJDIDIgXHU2QjIxXHU1NDBDXHU3QzdCXHU5NTE5XHU4QkVGXHVGRjA5XHVGRjBDXHU4RkQ0XHU1NkRFXHU5NjQ0XHU1RTI2XHU2NUI5XHU2ODQ4XHU3Njg0XHU0RTBBXHU0RTBCXHU2NTg3XHVGRjFCXHU1NDI2XHU1MjE5XHU4RkQ0XHU1NkRFXHU1MzlGXHU2NTg3XHU2NzJDXHUzMDAyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50V2l0aFNvbHV0aW9uKHJlZ2lzdHJ5OiBSZXBlYXRFcnJvclJlZ2lzdHJ5LCBjb250ZXh0VGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbWF0Y2ggPSBtYXRjaFNvbHV0aW9uKHJlZ2lzdHJ5LCBjb250ZXh0VGV4dCk7XG4gIGlmIChtYXRjaC50cmlnZ2VyZWQgJiYgbWF0Y2guYWR2aWNlKSB7XG4gICAgcmV0dXJuIGAke2NvbnRleHRUZXh0fVxcblxcbi0tLVxcbiR7bWF0Y2guYWR2aWNlfWA7XG4gIH1cbiAgcmV0dXJuIGNvbnRleHRUZXh0O1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFx1NTNFRlx1NjIxMFx1OTU3Rlx1NzY4NFx1NTcyOFx1N0VCRlx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1NUU5M1x1RkYwOFNvbHV0aW9uIFJlcG9zaXRvcnlcdUZGMDlcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuLyoqXG4gKiBcdTYzMDFcdTRFNDVcdTUzMTZcdTY1QjlcdTY4NDhcdTVFOTNcdTY1ODdcdTRFRjZcdTY4M0NcdTVGMEZcdUZGMDhKU09OXHVGRjA5XHUzMDAyXG4gKiBwYXR0ZXJuIFx1NUI1N1x1NkJCNVx1NTcyOFx1NzhDMVx1NzZEOFx1NEUwQVx1NUI1OFx1NEUzQVx1NUI1N1x1N0IyNlx1NEUzMlx1RkYwQ1x1NTJBMFx1OEY3RFx1NjVGNiBuZXcgUmVnRXhwIFx1OEZEOFx1NTM5Rlx1MzAwMlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNvbHV0aW9uUmVwb0ZpbGUge1xuICAvKiogXHU2NUI5XHU2ODQ4XHU2NzYxXHU3NkVFXHVGRjA4XHU0RTBEXHU1NDJCIHBhdHRlcm4gXHU2NUUwXHU2Q0Q1IEpTT04gXHU1RThGXHU1MjE3XHU1MzE2XHU3Njg0XHU5MEU4XHU1MjA2XHVGRjBDXHU3NTI4IHBhdHRlcm5Tb3VyY2UgXHU1QjU3XHU3QjI2XHU0RTMyXHU1QjU4XHU1MEE4XHVGRjA5ICovXG4gIGVudHJpZXM6IFBlcnNpc3RlZFNvbHV0aW9uW107XG4gIC8qKiBcdTVDMUFcdTY3MkFcdTg5RTNcdTUxQjNcdTc2ODRcdTY1QjBcdTk1MTlcdThCRUZcdTYzMDdcdTdFQjlcdTUwMTlcdTkwMDlcdUZGMDhcdTRGOUJcdTU0MEVcdTdFRURcdTZDODlcdTZEQzBcdTY1QjlcdTY4NDhcdUZGMENcdTkwN0ZcdTUxNERcdTkxQ0RcdTU5MERcdTkwMjBcdThGNkVcdTVCNTBcdUZGMDkgKi9cbiAgdW5rbm93bkVycm9ycz86IHN0cmluZ1tdO1xuICAvKiogXHU1MTQzXHU0RkUxXHU2MDZGICovXG4gIG1ldGE/OiB7IHVwZGF0ZWRBdD86IHN0cmluZzsgc291cmNlPzogc3RyaW5nIH07XG59XG5cbi8qKiBcdTUzRUZcdTYzMDFcdTRFNDVcdTUzMTZcdTY1QjlcdTY4NDhcdTY3NjFcdTc2RUVcdUZGMDhwYXR0ZXJuIFx1OEY2Q1x1NEUzQVx1NUI1N1x1N0IyNlx1NEUzMlx1RkYwOSAqL1xuZXhwb3J0IGludGVyZmFjZSBQZXJzaXN0ZWRTb2x1dGlvbiB7XG4gIGlkOiBzdHJpbmc7XG4gIGZpbmdlcnByaW50OiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIC8qKiBcdTZCNjNcdTUyMTlcdTZFOTBcdUZGMDhcdTVCNTdcdTdCMjZcdTRFMzJcdUZGMDkgKi9cbiAgcGF0dGVyblNvdXJjZTogc3RyaW5nO1xuICBsZXZlbDogU29sdXRpb25MZXZlbDtcbiAgc29sdXRpb246IHN0cmluZztcbiAgc2tpbGw/OiBzdHJpbmc7XG4gIG9wZW5Tb3VyY2U/OiBzdHJpbmc7XG4gIHRyaWdnZXJBZnRlcj86IG51bWJlcjtcbiAga2V5d29yZHM/OiBzdHJpbmdbXTtcbiAgLyoqIFx1NjVCOVx1Njg0OFx1Njc2NVx1NkU5MFx1NjgwN1x1NkNFOCAqL1xuICBzb3VyY2U/OiBzdHJpbmc7XG59XG5cbi8qKiBcdTYyOEFcdTUxODVcdTdGNkUgU29sdXRpb25FbnRyeSBcdThGNkNcdTRFM0FcdTUzRUZcdTYzMDFcdTRFNDVcdTUzMTZcdTVGNjJcdTVGMEYgKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1BlcnNpc3RlZChlbnRyeTogU29sdXRpb25FbnRyeSk6IFBlcnNpc3RlZFNvbHV0aW9uIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogZW50cnkuaWQsXG4gICAgZmluZ2VycHJpbnQ6IGVudHJ5LmZpbmdlcnByaW50LFxuICAgIHRpdGxlOiBlbnRyeS50aXRsZSxcbiAgICBwYXR0ZXJuU291cmNlOiBlbnRyeS5wYXR0ZXJuLnNvdXJjZSxcbiAgICBsZXZlbDogZW50cnkubGV2ZWwsXG4gICAgc29sdXRpb246IGVudHJ5LnNvbHV0aW9uLFxuICAgIHNraWxsOiBlbnRyeS5za2lsbCxcbiAgICBvcGVuU291cmNlOiBlbnRyeS5vcGVuU291cmNlLFxuICAgIHRyaWdnZXJBZnRlcjogZW50cnkudHJpZ2dlckFmdGVyLFxuICAgIGtleXdvcmRzOiBlbnRyeS5rZXl3b3JkcyxcbiAgICBzb3VyY2U6IGVudHJ5LnNvdXJjZSxcbiAgfTtcbn1cblxuLyoqIFx1NjI4QVx1NjMwMVx1NEU0NVx1NTMxNlx1NUY2Mlx1NUYwRlx1OEZEOFx1NTM5Rlx1NEUzQVx1OEZEMFx1ODg0Q1x1NjVGNiBTb2x1dGlvbkVudHJ5ICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVBlcnNpc3RlZChwOiBQZXJzaXN0ZWRTb2x1dGlvbik6IFNvbHV0aW9uRW50cnkge1xuICByZXR1cm4ge1xuICAgIGlkOiBwLmlkLFxuICAgIGZpbmdlcnByaW50OiBwLmZpbmdlcnByaW50LFxuICAgIHRpdGxlOiBwLnRpdGxlLFxuICAgIHBhdHRlcm46IG5ldyBSZWdFeHAocC5wYXR0ZXJuU291cmNlLCBcImlcIiksXG4gICAgbGV2ZWw6IHAubGV2ZWwsXG4gICAgc29sdXRpb246IHAuc29sdXRpb24sXG4gICAgc2tpbGw6IHAuc2tpbGwsXG4gICAgb3BlblNvdXJjZTogcC5vcGVuU291cmNlLFxuICAgIHRyaWdnZXJBZnRlcjogcC50cmlnZ2VyQWZ0ZXIsXG4gICAga2V5d29yZHM6IHAua2V5d29yZHMsXG4gICAgc291cmNlOiBwLnNvdXJjZSxcbiAgfTtcbn1cblxuLyoqXG4gKiBcdTUzRUZcdTYyMTBcdTk1N0ZcdTc2ODRcdTg5RTNcdTUxQjNcdTY1QjlcdTY4NDhcdTRFRDNcdTVFOTNcdUZGMUFcdTUxODVcdTdGNkUgcGxheWJvb2sgKyBcdTc1MjhcdTYyMzdcdTZDODlcdTZEQzBcdTc2ODRcdTYzMDFcdTRFNDVcdTUzMTZcdTY1QjlcdTY4NDhcdTVFOTNcdTU0MDhcdTVFNzZcdTY3RTVcdThCRTJcdTMwMDJcbiAqXG4gKiBcdThGRDlcdTY2MkZcdTMwMENcdTRFMERcdTRGOURcdThENTZcdTY4QzBcdTdEMjJcdTMwMDFcdTUzRUZcdTYzMDFcdTdFRURcdTYyMTBcdTk1N0ZcdTMwMERcdTc2ODRcdTUxNzNcdTk1MkVcdUZGMUFcbiAqIC0gXHU2QkNGXHU2QjIxXHU4OUUzXHU1MUIzXHU0RTAwXHU0RTJBXHU2NUIwXHU5NUVFXHU5ODk4XHVGRjBDXHU4QzAzXHU3NTI4IGBhZGRTb2x1dGlvbmAgXHU2Qzg5XHU2REMwXHU4RkRCXHU1RTkzXHU2NTg3XHU0RUY2XHVGRjA4XHU0RjVDXHU0RTNBXHUzMDBDXHU1NzI4XHU3RUJGXHU1RTkzXHUzMDBEXHU1MTcxXHU0RUFCXHVGRjA5XHVGRjFCXG4gKiAtIFx1OTA0N1x1NTIzMFx1NjcyQVx1NTQ3RFx1NEUyRFx1NzY4NFx1NjVCMFx1OTUxOVx1OEJFRlx1RkYwQ1x1OEJCMFx1NUY1NVx1NTIzMCBgdW5rbm93bkVycm9yc2BcdUZGMENcdTRGOUJcdTU0MEVcdTdFRURcdTg4NjVcdTUxNDVcdTY1QjlcdTY4NDhcdUZGMUJcbiAqIC0gXHU2NUI5XHU2ODQ4XHU1RTkzXHU2NTg3XHU0RUY2XHU1M0VGXHU2M0QwXHU0RUE0XHU4RkRCXHU0RUQzXHU1RTkzIC8gXHU0RjVDXHU0RTNBIENJIFx1NTIzNlx1NTRDMVx1NUJGQ1x1NTFGQVx1RkYwQ1x1NUI5RVx1NzNCMFx1MzAwQ1x1OEQ4QVx1NzUyOFx1OEQ4QVx1NTkyN1x1MzAwMVx1NEUwQVx1OTY1MFx1NjMwMVx1N0VFRFx1NjNEMFx1OUFEOFx1MzAwRFx1MzAwMlxuICovXG5leHBvcnQgY2xhc3MgU29sdXRpb25SZXBvc2l0b3J5IHtcbiAgLyoqIFx1NTE4NVx1N0Y2RSBwbGF5Ym9va1x1RkYwOFx1NTNFQVx1OEJGQlx1NTdGQVx1N0VCRlx1RkYwOSAqL1xuICBwcml2YXRlIGJ1aWx0aW46IFNvbHV0aW9uRW50cnlbXSA9IFNPTFVUSU9OX1BMQVlCT09LO1xuICAvKiogXHU3NTI4XHU2MjM3XHU2Qzg5XHU2REMwXHU3Njg0XHU2NUI5XHU2ODQ4XHVGRjA4XHU2MzAxXHU0RTQ1XHU1MzE2XHVGRjA5ICovXG4gIHByaXZhdGUgY3VzdG9tOiBTb2x1dGlvbkVudHJ5W10gPSBbXTtcbiAgLyoqIFx1NjcyQVx1NTQ3RFx1NEUyRFx1NzY4NFx1NjVCMFx1OTUxOVx1OEJFRlx1NjMwN1x1N0VCOVx1RkYwOFx1NTAxOVx1OTAwOVx1NkM4OVx1NkRDMFx1RkYwOSAqL1xuICBwcml2YXRlIHVua25vd24gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgLyoqIFx1NUU5M1x1NjU4N1x1NEVGNlx1OERFRlx1NUY4NCAqL1xuICBwcml2YXRlIGZpbGVQYXRoPzogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKGZpbGVQYXRoPzogc3RyaW5nKSB7XG4gICAgdGhpcy5maWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgIGlmIChmaWxlUGF0aCkgdGhpcy5sb2FkKGZpbGVQYXRoKTtcbiAgfVxuXG4gIC8qKiBcdTUxNjhcdTkwRThcdTY1QjlcdTY4NDhcdUZGMDhcdTUxODVcdTdGNkUgKyBcdTZDODlcdTZEQzBcdUZGMDkgKi9cbiAgZ2V0IGVudHJpZXMoKTogU29sdXRpb25FbnRyeVtdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuYnVpbHRpbiwgLi4udGhpcy5jdXN0b21dO1xuICB9XG5cbiAgLyoqIFx1NEVDNVx1NzUyOFx1NjIzN1x1NkM4OVx1NkRDMFx1NzY4NFx1NjVCOVx1Njg0OFx1RkYwOFx1NjIxMFx1OTU3Rlx1NUU5M1x1NjVCMFx1NTg5RVx1OTBFOFx1NTIwNlx1RkYwOSAqL1xuICBnZXQgY3VzdG9tRW50cmllcygpOiBTb2x1dGlvbkVudHJ5W10ge1xuICAgIHJldHVybiBbLi4udGhpcy5jdXN0b21dO1xuICB9XG5cbiAgLyoqIFx1NTJBMFx1OEY3RFx1NjMwMVx1NEU0NVx1NTMxNlx1NjVCOVx1Njg0OFx1NUU5M1x1NjU4N1x1NEVGNlx1RkYwOFx1NEUwRFx1NUI1OFx1NTcyOFx1NTIxOVx1NUZGRFx1NzU2NVx1RkYwOSAqL1xuICBsb2FkKGZpbGVQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGZpbGVQYXRoKSkgcmV0dXJuO1xuICAgICAgY29uc3QgcmF3OiBTb2x1dGlvblJlcG9GaWxlID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsIFwidXRmOFwiKSk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyYXcuZW50cmllcykpIHtcbiAgICAgICAgdGhpcy5jdXN0b20gPSByYXcuZW50cmllcy5tYXAoZnJvbVBlcnNpc3RlZCk7XG4gICAgICB9XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyYXcudW5rbm93bkVycm9ycykpIHtcbiAgICAgICAgcmF3LnVua25vd25FcnJvcnMuZm9yRWFjaCgodSkgPT4gdGhpcy51bmtub3duLmFkZCh1KSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBcdTVFOTNcdTY1ODdcdTRFRjZcdTYzNUZcdTU3NEYvXHU0RTBEXHU1M0VGXHU4QkZCXHU2NUY2XHU5NzU5XHU5RUQ4XHU1RkZEXHU3NTY1XHVGRjBDXHU0RkREXHU3NTU5XHU1MTg1XHU3RjZFXHU1N0ZBXHU3RUJGXG4gICAgICB0aGlzLmN1c3RvbSA9IFtdO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBcdTYzMDFcdTRFNDVcdTUzMTZcdTVGNTNcdTUyNERcdTVFOTNcdTUyMzBcdTY1ODdcdTRFRjYgKi9cbiAgcGVyc2lzdChmaWxlUGF0aD86IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZmlsZVBhdGggPz8gdGhpcy5maWxlUGF0aDtcbiAgICBpZiAoIXRhcmdldCkgcmV0dXJuIFwiXCI7XG4gICAgY29uc3QgZGF0YTogU29sdXRpb25SZXBvRmlsZSA9IHtcbiAgICAgIGVudHJpZXM6IHRoaXMuY3VzdG9tLm1hcCh0b1BlcnNpc3RlZCksXG4gICAgICB1bmtub3duRXJyb3JzOiBbLi4udGhpcy51bmtub3duXSxcbiAgICAgIG1ldGE6IHsgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksIHNvdXJjZTogXCJvcGVubGl1bGFuXCIgfSxcbiAgICB9O1xuICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUodGFyZ2V0KSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyh0YXJnZXQsIEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpLCBcInV0ZjhcIik7XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIC8qKlxuICAgKiBcdTU3MjhcdTY1QjlcdTY4NDhcdTVFOTNcdUZGMDhcdTUxODVcdTdGNkUgKyBcdTZDODlcdTZEQzBcdUZGMDlcdTRFMkRcdTY3RTVcdTYyN0VcdTUzMzlcdTkxNERcdTY3NjFcdTc2RUVcdTMwMDJcbiAgICogXHU0RjE4XHU1MTQ4IGZpbmdlcnByaW50XHVGRjBDXHU1MThEIHBhdHRlcm5cdUZGMENcdTUxOERcdTUxNzNcdTk1MkVcdThCQ0RcdTMwMDJcbiAgICovXG4gIGxvb2t1cCh0ZXh0OiBzdHJpbmcsIGZpbmdlcnByaW50Pzogc3RyaW5nKTogU29sdXRpb25FbnRyeSB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZnAgPSBmaW5nZXJwcmludCA/PyBmaW5nZXJwcmludEVycm9yKHRleHQpO1xuICAgIGNvbnN0IHQgPSB0ZXh0LnRvTG93ZXJDYXNlKCk7XG4gICAgLy8gMS4gZmluZ2VycHJpbnQgXHU3Q0JFXHU3ODZFXHU1NDdEXHU0RTJEXHVGRjA4XHU0RjE4XHU1MTQ4XHU4MUVBXHU1QjlBXHU0RTQ5XHU2Qzg5XHU2REMwXHVGRjBDXHU1MTc2XHU2QjIxXHU1MTg1XHU3RjZFXHVGRjA5XG4gICAgY29uc3QgYnlGcCA9IHRoaXMuY3VzdG9tLmZpbmQoKHMpID0+IHMuZmluZ2VycHJpbnQgPT09IGZwKSA/PyB0aGlzLmJ1aWx0aW4uZmluZCgocykgPT4gcy5maW5nZXJwcmludCA9PT0gZnApO1xuICAgIGlmIChieUZwKSByZXR1cm4gYnlGcDtcbiAgICAvLyAyLiBwYXR0ZXJuIFx1NTQ3RFx1NEUyRFxuICAgIGZvciAoY29uc3QgcyBvZiB0aGlzLmVudHJpZXMpIHtcbiAgICAgIGlmIChzLnBhdHRlcm4udGVzdCh0ZXh0KSkgcmV0dXJuIHM7XG4gICAgfVxuICAgIC8vIDMuIFx1NTE3M1x1OTUyRVx1OEJDRFx1NTE1Q1x1NUU5NVxuICAgIHJldHVybiB0aGlzLmVudHJpZXMuZmluZCgocykgPT4gcy5rZXl3b3JkcyAmJiBzLmtleXdvcmRzLnNvbWUoKGspID0+IHQuaW5jbHVkZXMoay50b0xvd2VyQ2FzZSgpKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFx1NjgzOFx1NUZDM1x1NTMzOVx1OTE0RFx1NTE2NVx1NTNFM1x1RkYwOFx1NEU4Q1x1NkIyMVx1ODlFNlx1NTNEMSArIFx1NUU5M1x1NTMzOVx1OTE0RFx1RkYwOVx1MzAwMlxuICAgKiBcdTg5RTZcdTUzRDFcdTY1RjZcdTRGMThcdTUxNDhcdTc1MjhcdTRFRDNcdTVFOTNcdTUzMzlcdTkxNERcdTY1QjlcdTY4NDhcdUZGMUJcdTY3MkFcdTU0N0RcdTRFMkRcdTUyMTlcdThCQjBcdTVGNTVcdTRFM0FcdTY1QjBcdTk1MTlcdThCRUZcdTUwMTlcdTkwMDlcdTMwMDJcbiAgICovXG4gIG1hdGNoKHJlZ2lzdHJ5OiBSZXBlYXRFcnJvclJlZ2lzdHJ5LCBlcnJvclRleHQ6IHN0cmluZyk6IFNvbHV0aW9uTWF0Y2gge1xuICAgIGNvbnN0IHsgZmluZ2VycHJpbnQsIG9jY3VycmVuY2VzLCB0cmlnZ2VyZWQgfSA9IHJlZ2lzdHJ5LnJlY29yZChlcnJvclRleHQpO1xuICAgIGlmICghdHJpZ2dlcmVkKSB7XG4gICAgICByZXR1cm4geyB0cmlnZ2VyZWQ6IGZhbHNlLCBmaW5nZXJwcmludCwgb2NjdXJyZW5jZXMgfTtcbiAgICB9XG4gICAgY29uc3QgZW50cnkgPSB0aGlzLmxvb2t1cChlcnJvclRleHQsIGZpbmdlcnByaW50KTtcbiAgICBpZiAoIWVudHJ5KSB7XG4gICAgICAvLyBcdTY3MkFcdTU0N0RcdTRFMkQgXHUyMTkyIFx1OEJCMFx1NUY1NVx1NjVCMFx1OTUxOVx1OEJFRlx1NTAxOVx1OTAwOVx1RkYwQ1x1NEY5Qlx1NTQwRVx1N0VFRFx1NkM4OVx1NkRDMFx1RkYwOFx1NjIxMFx1OTU3Rlx1NzBCOVx1RkYwOVxuICAgICAgdGhpcy51bmtub3duLmFkZChmaW5nZXJwcmludCk7XG4gICAgICByZXR1cm4geyB0cmlnZ2VyZWQ6IHRydWUsIGZpbmdlcnByaW50LCBvY2N1cnJlbmNlcyB9O1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdHJpZ2dlcmVkOiB0cnVlLFxuICAgICAgZmluZ2VycHJpbnQsXG4gICAgICBvY2N1cnJlbmNlcyxcbiAgICAgIGVudHJ5LFxuICAgICAgYWR2aWNlOiByZW5kZXJBZHZpY2UoZW50cnkpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogXHU2Qzg5XHU2REMwXHU0RTAwXHU2NzYxXHU2NUIwXHU4OUUzXHU1MUIzXHU2NUI5XHU2ODQ4XHU1MjMwXHU4MUVBXHU1QjlBXHU0RTQ5XHU1RTkzXHVGRjA4XHU1M0JCXHU5MUNEXHU1NDBFXHU4RkZEXHU1MkEwXHU1RTc2XHU2MzAxXHU0RTQ1XHU1MzE2XHVGRjA5XHUzMDAyXG4gICAqIFx1OEZENFx1NTZERVx1NjVCMFx1NTg5RVx1Njc2MVx1NzZFRVx1NzY4NCBpZFx1RkYxQlx1ODJFNVx1NURGMlx1NUI1OFx1NTcyOFx1NTIxOVx1OEZENFx1NTZERVx1NjVFMlx1NjcwOSBpZFx1MzAwMlxuICAgKi9cbiAgYWRkU29sdXRpb24oZW50cnk6IE9taXQ8U29sdXRpb25FbnRyeSwgXCJwYXR0ZXJuXCI+ICYgeyBwYXR0ZXJuOiBSZWdFeHAgfCBzdHJpbmcgfSk6IHN0cmluZyB7XG4gICAgY29uc3Qgbm9ybWFsaXplZDogU29sdXRpb25FbnRyeSA9IHtcbiAgICAgIC4uLmVudHJ5LFxuICAgICAgcGF0dGVybjogdHlwZW9mIGVudHJ5LnBhdHRlcm4gPT09IFwic3RyaW5nXCIgPyBuZXcgUmVnRXhwKGVudHJ5LnBhdHRlcm4sIFwiaVwiKSA6IGVudHJ5LnBhdHRlcm4sXG4gICAgfTtcbiAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuY3VzdG9tLmZpbmQoKHMpID0+IHMuaWQgPT09IG5vcm1hbGl6ZWQuaWQgfHwgcy5maW5nZXJwcmludCA9PT0gbm9ybWFsaXplZC5maW5nZXJwcmludCk7XG4gICAgaWYgKGV4aXN0aW5nKSByZXR1cm4gZXhpc3RpbmcuaWQ7XG4gICAgdGhpcy5jdXN0b20ucHVzaChub3JtYWxpemVkKTtcbiAgICB0aGlzLnVua25vd24uZGVsZXRlKG5vcm1hbGl6ZWQuZmluZ2VycHJpbnQpO1xuICAgIGlmICh0aGlzLmZpbGVQYXRoKSB0aGlzLnBlcnNpc3QoKTtcbiAgICByZXR1cm4gbm9ybWFsaXplZC5pZDtcbiAgfVxuXG4gIC8qKiBcdTY3MkFcdTU0N0RcdTRFMkRcdTc2ODRcdTY1QjBcdTk1MTlcdThCRUZcdTYzMDdcdTdFQjlcdTUwMTlcdTkwMDkgKi9cbiAgZ2V0IHVua25vd25FcnJvcnMoKTogc3RyaW5nW10ge1xuICAgIHJldHVybiBbLi4udGhpcy51bmtub3duXTtcbiAgfVxuXG4gIC8qKiBcdTZDODlcdTZEQzBcdThCQTFcdTY1NzBcdUZGMDhcdTgxRUFcdTVCOUFcdTRFNDlcdTVFOTNcdTg5QzRcdTZBMjFcdUZGMDkgKi9cbiAgZ2V0IGN1c3RvbUNvdW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuY3VzdG9tLmxlbmd0aDtcbiAgfVxufVxuXG4vKipcbiAqIFx1NEZCRlx1NjM3N1x1RkYxQVx1NjI4QVx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1NUU5M1x1NUJGQ1x1NTFGQVx1NEUzQSBtYXJrZG93blx1RkYwOFx1NTNFRlx1NEY1QyBQUiBcdThCQzRcdThCQkEgLyBcdTUyMzZcdTU0QzEgLyBcdTY1ODdcdTY4NjNcdUZGMDlcdTMwMDJcbiAqIFx1OEJBOVx1MzAwQ1x1NTcyOFx1N0VCRlx1NUU5M1x1MzAwRFx1NTNFRlx1ODhBQlx1NTE3MVx1NEVBQlx1MzAwMVx1NUJBMVx1OTYwNVx1MzAwMVx1NzI0OFx1NjcyQ1x1NTMxNlx1MzAwMlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhwb3J0U29sdXRpb25SZXBvTWFya2Rvd24ocmVwbzogU29sdXRpb25SZXBvc2l0b3J5LCBvcHRzOiB7IHRpdGxlPzogc3RyaW5nIH0gPSB7fSk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzID0gW1xuICAgIGAjICR7b3B0cy50aXRsZSA/PyBcIlx1OTUxOVx1OEJFRlx1ODFFQVx1NTJBOFx1NTMzOVx1OTE0RFx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1NUU5M1wifWAsXG4gICAgYFx1NTE4NVx1N0Y2RSAke1NPTFVUSU9OX1BMQVlCT09LLmxlbmd0aH0gXHU2NzYxICsgXHU2Qzg5XHU2REMwICR7cmVwby5jdXN0b21Db3VudH0gXHU2NzYxXHVGRjBDXHU1MTcxICR7cmVwby5lbnRyaWVzLmxlbmd0aH0gXHU2NzYxXHUzMDAyYCxcbiAgICBcIlwiLFxuICBdO1xuICBmb3IgKGNvbnN0IHMgb2YgcmVwby5lbnRyaWVzKSB7XG4gICAgbGluZXMucHVzaChgIyMgWyR7cy5sZXZlbH1dICR7cy50aXRsZX1gKTtcbiAgICBsaW5lcy5wdXNoKGAtIFx1NjMwN1x1N0VCOTogXFxgJHtzLmZpbmdlcnByaW50fVxcYGApO1xuICAgIGxpbmVzLnB1c2goYC0gXHU2NUI5XHU2ODQ4OiAke3Muc29sdXRpb259YCk7XG4gICAgaWYgKHMuc2tpbGwpIGxpbmVzLnB1c2goYC0gc2tpbGw6ICR7cy5za2lsbH1gKTtcbiAgICBpZiAocy5vcGVuU291cmNlKSBsaW5lcy5wdXNoKGAtIFx1NjVCOVx1Njg0OC9cdTVGMDBcdTZFOTBcdTk4NzlcdTc2RUU6ICR7cy5vcGVuU291cmNlfWApO1xuICAgIGxpbmVzLnB1c2goXCJcIik7XG4gIH1cbiAgaWYgKHJlcG8udW5rbm93bkVycm9ycy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGAjIyBcdTVGODVcdTZDODlcdTZEQzBcdTc2ODRcdTY1QjBcdTk1MTlcdThCRUZcdUZGMDgke3JlcG8udW5rbm93bkVycm9ycy5sZW5ndGh9XHVGRjA5YCk7XG4gICAgcmVwby51bmtub3duRXJyb3JzLmZvckVhY2goKHUpID0+IGxpbmVzLnB1c2goYC0gXFxgJHt1fVxcYGApKTtcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cblxuLyoqXG4gKiBcdTYyOEFcdTY1QjlcdTY4NDhcdTVFOTNcdUZGMDhcdTUxODVcdTdGNkUgKyBcdTZDODlcdTZEQzBcdUZGMDlcdThGNkNcdTYyMTBcdTMwMENcdTUzRUZcdTZDRThcdTUxNjUgc3lzdGVtIHByb21wdCBcdTc2ODRcdTc3RTVcdThCQzZcdTcyNDdcdTZCQjVcdTMwMERcdTMwMDJcbiAqXG4gKiBcdThGRDlcdTY2MkZcdTMwMENcdTVERjJcdTZDODlcdTZEQzBcdTY1QjlcdTY4NDggXHUyMTkyIFx1NTFCM1x1N0I1Nlx1NEUwQVx1NEUwQlx1NjU4N1x1MzAwRFx1NzY4NFx1NEUwMFx1NzNBRlx1RkYxQVx1NTcyOFx1N0VCRiBDb2RlQnVkZHkgXHU0RTBFXHU2NzJDXHU1NzMwIEFnZW50IFx1NTcyOFxuICogXHU4QkNBXHU2NUFEL1x1ODlDNFx1NTIxMlx1NjVGNlx1RkYwQ1x1OUVEOFx1OEJBNFx1NjQzQVx1NUUyNlx1OTg3OVx1NzZFRVx1OTFDQ1x1NURGMlx1N0VDRlx1NzlFRlx1N0QyRlx1NzY4NFx1ODlFM1x1NTFCM1x1NjVCOVx1Njg0OFx1RkYwQ1x1OTA3Rlx1NTE0RFx1OTFDRFx1NTkwRFx1OTAyMFx1OEY2RVx1NUI1MFx1RkYwQ1x1NEU1Rlx1OEJBOVxuICogXHUzMDBDXHU4OUUzXHU1MUIzXHU4RkM3XHU3Njg0XHU5NUVFXHU5ODk4XHU0RTBEXHU1MThEXHU0RjlEXHU4RDU2XHU1OTE2XHU5MEU4XHU2OEMwXHU3RDIyXHUzMDBEXHU4RDJGXHU3QTdGXHU1MjMwXHU2QkNGXHU0RTAwXHU2QjY1XHU1MUIzXHU3QjU2XHUzMDAyXG4gKlxuICogXHU4RkQ0XHU1NkRFXHU3RUQzXHU2Nzg0XHU0RTBFIGBidWlsZEtub3dsZWRnZUNvbnRleHRgIFx1NzY4NCBrbm93bGVkZ2UgXHU1MTY1XHU1M0MyXHU0RTAwXHU4MUY0XHVGRjA4dGl0bGUvc25pcHBldC9zb3VyY2VcdUZGMDlcdUZGMENcbiAqIFx1NTZFMFx1NkI2NFx1NTNFRlx1NzZGNFx1NjNBNVx1NjJGQ1x1NjNBNVx1NTIzMFx1NEVEM1x1NUU5M1x1NzdFNVx1OEJDNlx1NUU5M1x1NEUwQVx1NEUwQlx1NjU4N1x1NEU0Qlx1NTQwRVx1RkYwQ1x1NjIxNlx1NTM1NVx1NzJFQ1x1NkNFOFx1NTE2NVx1MzAwMlxuICpcbiAqIEBwYXJhbSByZXBvIFx1NjVCOVx1Njg0OFx1NUU5M1x1NUI5RVx1NEY4QlxuICogQHBhcmFtIG9wdHMuaW5jbHVkZUJ1aWx0aW4gXHU2NjJGXHU1NDI2XHU1MzA1XHU1NDJCXHU1MTg1XHU3RjZFIHBsYXlib29rXHVGRjA4XHU5RUQ4XHU4QkE0IHRydWVcdUZGMDlcdUZGMUJcdTRFQzVcdTYwRjNcdTY0M0FcdTVFMjZcdTk4NzlcdTc2RUVcdTZDODlcdTZEQzBcdTY1RjZcdThCQkVcdTRFM0EgZmFsc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU29sdXRpb25Lbm93bGVkZ2VDb250ZXh0KFxuICByZXBvOiBTb2x1dGlvblJlcG9zaXRvcnksXG4gIG9wdHM6IHsgaW5jbHVkZUJ1aWx0aW4/OiBib29sZWFuOyBzb3VyY2U/OiBzdHJpbmcgfSA9IHt9XG4pOiBBcnJheTx7IHRpdGxlOiBzdHJpbmc7IHNuaXBwZXQ6IHN0cmluZzsgc291cmNlPzogc3RyaW5nIH0+IHtcbiAgY29uc3QgaW5jbHVkZUJ1aWx0aW4gPSBvcHRzLmluY2x1ZGVCdWlsdGluID8/IHRydWU7XG4gIGNvbnN0IGVudHJpZXMgPSBpbmNsdWRlQnVpbHRpbiA/IHJlcG8uZW50cmllcyA6IHJlcG8uY3VzdG9tRW50cmllcztcbiAgY29uc3Qgc291cmNlID0gb3B0cy5zb3VyY2UgPz8gXCJzb2x1dGlvbnMtcmVwb1wiO1xuXG4gIHJldHVybiBlbnRyaWVzLm1hcCgocykgPT4gKHtcbiAgICB0aXRsZTogYFtcdTY1QjlcdTY4NDhcdTAwQjcke3MubGV2ZWx9XSAke3MudGl0bGV9XHVGRjA4XHU2MzA3XHU3RUI5ICR7cy5maW5nZXJwcmludH1cdUZGMDlgLFxuICAgIHNuaXBwZXQ6XG4gICAgICBzLmxldmVsID09PSBcImF1dG9cIlxuICAgICAgICA/IGBcdTUzRUZcdTc2RjRcdTYzQTVcdTYyNjdcdTg4NENcdUZGMUEke3Muc29sdXRpb259YFxuICAgICAgICA6IGBcdTYzQThcdTgzNTBcdTYwMURcdThERUZcdUZGMUEke3Muc29sdXRpb259JHtzLnNraWxsID8gYFx1RkYxQlx1NTNFRlx1NzUyOCBza2lsbDogJHtzLnNraWxsfWAgOiBcIlwifSR7cy5vcGVuU291cmNlID8gYFx1RkYxQlx1NTNFRlx1NTNDMlx1ODAwMzogJHtzLm9wZW5Tb3VyY2V9YCA6IFwiXCJ9YCxcbiAgICBzb3VyY2U6IHMuc291cmNlID8/IHNvdXJjZSxcbiAgfSkpO1xufVxuIiwgIi8qKlxyXG4gKiBkc2gtb3BlbmxpdWxhbiBkZWVwc2VlayBoYXJuZXNzIFx1OEZEQlx1N0EwQlx1NTE4NVx1NkQ0Rlx1ODlDOFx1NTY2OFx1NjNBN1x1NTIzNlx1NjNEMlx1NEVGNlx1NTE2NVx1NTNFM1x1MzAwMlxyXG4gKlxyXG4gKiBcdTYyOEEgZHNoLW9wZW5saXVsYW4gXHU3Njg0XHU3RURGXHU0RTAwIEFJIFx1NkQ0Rlx1ODlDOFx1NTY2OFx1NjNBN1x1NTIzNlx1Njg0Nlx1NjdCNlx1RkYwOEZvcmdlTUNQXHVGRjFBb2JzZXJ2ZSAvIGFjdCAvXHJcbiAqIGRpYWdub3NlIC8gZXZhbCAvIHNjcmVlbnNob3QgLyBzZXNzaW9uX2xvZyAvIGNsb3NlXHVGRjA5XHU2Q0U4XHU1MThDXHU0RTNBIGRlZXBzZWVrXHJcbiAqIGhhcm5lc3MgXHU3Njg0XHU1MzlGXHU3NTFGXHU1REU1XHU1MTc3XHVGRjBDXHU0RjlCIGFnZW50IFx1NzY4NCB0b29sX2xvb3AgXHU3NkY0XHU2M0E1XHU4QzAzXHU3NTI4XHVGRjBDXHU5MTREXHU1NDA4IGhhcm5lc3MgXHU3Njg0XHJcbiAqIFx1NTM5Rlx1NzUxRiBmdW5jdGlvbiBjYWxsaW5nIC8gXHU1OTFBXHU2QjY1XHU4OUM0XHU1MjEyIC8gXHU2NzA5XHU3MkI2XHU2MDAxXHU0RjFBXHU4QkREXHU4MEZEXHU1MjlCXHUzMDAyXHJcbiAqXHJcbiAqIFx1OEJFNVx1NTE2NVx1NTNFM1x1NjYyRlx1MzAwQ1x1NTNFRlx1NUI4OVx1ODhDNVx1NjNEMlx1NEVGNlx1NTMwNVx1MzAwRFx1NzY4NFx1ODhDNVx1OTE0RFx1NzBCOVx1RkYxQVx1OTg3Nlx1NUM0Mlx1NTMwNSBwYWNrYWdlLmpzb24gXHU1OEYwXHU2NjBFXHJcbiAqIGBkc2guYnVuZGxlLnBhdGNoYCBcdTYzMDdcdTU0MTEgY29yZGlzLnBhdGNoLnltbFx1RkYwQ1x1NzUzMSBkc2ggXHU1M0VGXHU1NzI4IHByb2ZpbGUgXHU3NkVFXHU1RjU1XHU0RTAwXHU2NzYxXHJcbiAqIFx1NTQ3RFx1NEVFNFx1RkYwOGBkc2ggcGx1Z2luIC0tcHJvZmlsZSB3ZWIgYWRkIC4uLmBcdUZGMDlcdTVCODlcdTg4QzVcdTMwMDJcdTY3ODRcdTVFRkFcdTY1RjZcdTc1MjggZXNidWlsZCBcdTYyOEFcdTYyNDBcdTY3MDlcclxuICogYEBvcGVubGl1bGFuLypgIFx1NkU5MFx1NzgwMVx1NTE4NVx1ODA1NFx1NjIxMFx1ODFFQVx1NTMwNVx1NTQyQlx1NzY4NCBsaWIvaW5kZXguanNcdUZGMENcdTUzRUFcdTU5MTZcdTdGNkVcdTVERjJcdTUzRDFcdTVFMDNcdTc2ODRcclxuICogYHBsYXl3cmlnaHRgXHVGRjBDXHU1NkUwXHU2QjY0XHU0RTBEXHU0RjlEXHU4RDU2XHU0RUZCXHU0RjU1XHU2NzJBXHU1M0QxXHU1RTAzIG5wbSBcdTUzMDVcdTUzNzNcdTUzRUZcdTg4QUJcdTRFRDZcdTRFQkFcdTVCODlcdTg4QzVcdTMwMDJcclxuICpcclxuICogQG1vZHVsZSBAb3BlbmxpdWxhbi9kc2gtb3BlbmxpdWxhblxyXG4gKi9cclxuaW1wb3J0IHsgRm9yZ2VNY3AgfSBmcm9tIFwiQG9wZW5saXVsYW4vbWNwLXNlcnZlclwiO1xyXG5pbXBvcnQgdHlwZSB7IENvbnRleHQgfSBmcm9tIFwiQGRlZXBzZWVrLWFpL2NvcmRpc1wiO1xyXG5cclxuLyoqIENvcmRpcyBcdTYzRDJcdTRFRjZcdTU0MERcdUZGMDhcdTc1MjhcdTRFOEUgbG9hZGVyIFx1OEJDQVx1NjVBRFx1RkYwOVx1MzAwMiAqL1xyXG5leHBvcnQgY29uc3QgbmFtZSA9IFwib3BlbmxpdWxhbi1icm93c2VyXCI7XHJcbi8qKiBcdTVERTVcdTUxNzdcdTU0N0RcdTU0MERcdTUyNERcdTdGMDBcdUZGMENcdTkwN0ZcdTUxNERcdTRFMEUgaG9zdCBcdTUxNzZcdTVCODNcdTVERTVcdTUxNzdcdTUxQjJcdTdBODFcdTMwMDIgKi9cclxuY29uc3QgREVGQVVMVF9QUkVGSVggPSBcImJyb3dzZXJcIjtcclxuXHJcbi8qKiBcdThGREJcdTdBMEJcdTUxODVcdTVERTVcdTUxNzdcdTZDRThcdTUxOENcdTc2ODRcdTY3MDBcdTVDMEYgaGFybmVzcyBcdTU5NTFcdTdFQTZcdUZGMDhcdTdGMTZcdThCRDFcdTY3MUZcdTRFQzVcdTRGNUNcdTVGNjJcdTcyQjZcdTdFQTZcdTY3NUZcdUZGMENcdThGRDBcdTg4NENcdTY3MUZcdTc1MjhcdTVCQkZcdTRFM0IgY3R4XHVGRjA5XHUzMDAyICovXHJcbmludGVyZmFjZSBIYXJuZXNzVG9vbFJlZ2lzdHJ5IHtcclxuICByZWdpc3RlcihkZWY6IHVua25vd24pOiAoKSA9PiB2b2lkO1xyXG59XHJcblxyXG4vKiogXHU1QkI5XHU5NTE5XHU1M0Q2XHU1MDNDXHVGRjFBXHU2MjhBXHU4QzAzXHU3NTI4XHU1M0MyXHU2NTcwXHU2NTM2XHU2NTVCXHU0RTNBXHU1QkY5XHU4QzYxXHVGRjA4XHU2QTIxXHU1NzhCXHU1M0VGXHU4MEZEXHU4RjkzXHU1MUZBXHU4OEY4XHU1MDNDXHVGRjA5XHUzMDAyICovXHJcbmZ1bmN0aW9uIHRvUmVjb3JkKGFyZ3M6IHVua25vd24pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XHJcbiAgcmV0dXJuIHR5cGVvZiBhcmdzID09PSBcIm9iamVjdFwiICYmIGFyZ3MgIT09IG51bGwgPyAoYXJncyBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgOiB7fTtcclxufVxyXG5cclxuLyoqIFx1NjI4QSBGb3JnZU1DUCBcdThDMDNcdTc1MjhcdTY1QjlcdThGRDRcdTU2REVcdTUwM0NcdTY2MjBcdTVDMDRcdTRFM0EgaGFybmVzcyBDb250ZW50QmxvY2sgXHU2NTg3XHU2NzJDXHUzMDAyICovXHJcbmZ1bmN0aW9uIHJlc3VsdFRleHQoY29udGVudDogcmVhZG9ubHkgeyB0eXBlPzogc3RyaW5nOyB0ZXh0Pzogc3RyaW5nIH1bXSB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XHJcbiAgaWYgKCFjb250ZW50IHx8IGNvbnRlbnQubGVuZ3RoID09PSAwKSByZXR1cm4gXCIoXHU2NUUwXHU4RjkzXHU1MUZBKVwiO1xyXG4gIHJldHVybiBjb250ZW50Lm1hcCgoYmxvY2spID0+IGJsb2NrLnRleHQgPz8gXCJcIikuam9pbihcIlxcblwiKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvcmRpcyBcdTYzRDJcdTRFRjZcdTUxNjVcdTUzRTNcdUZGMUFcdTY3ODRcdTkwMjBcdTRFMDBcdTRFMkFcdThGREJcdTdBMEJcdTUxODVcdTc2ODQgRm9yZ2VNY3AgXHU1QjlFXHU0RjhCXHVGRjBDXHU2MjhBXHU1MTc2XHU1REU1XHU1MTc3XHU2NjIwXHU1QzA0XHU0RTNBXHJcbiAqIGRlZXBzZWVrIGhhcm5lc3MgXHU3Njg0IFRvb2xEZWZpbml0aW9uIFx1NUU3Nlx1NkNFOFx1NTE4Q1x1NTIzMCBgY3R4LnRvb2xzYFx1MzAwMlxyXG4gKlxyXG4gKiBcdTkxNERcdTdGNkVcdUZGMDhcdTUzRUZcdTU3MjggY29yZGlzLnBhdGNoLnltbCBcdTg5ODZcdTc2RDZcdUZGMDlcdUZGMUFcclxuICogLSBgaGVhZGxlc3NgOiBcdTY1RTBcdTU5MzRcdTZBMjFcdTVGMEZcdUZGMDhcdTlFRDhcdThCQTQgdHJ1ZVx1RkYwOVxyXG4gKiAtIGBjb25uZWN0VXJsYDogXHU1M0VGXHU5MDA5XHVGRjBDQ0RQIFx1OEZERVx1NjNBNVx1NURGMlx1NTQyRlx1NTJBOFx1NzY4NFx1NkQ0Rlx1ODlDOFx1NTY2OFxyXG4gKiAtIGBwcmVmaXhgOiBcdTVERTVcdTUxNzdcdTU0N0RcdTU0MERcdTUyNERcdTdGMDBcdUZGMDhcdTlFRDhcdThCQTQgXCJicm93c2VyXCJcdUZGMDlcclxuICogLSBgc3RlYWx0aGA6IFx1NTNFRlx1OTAwOVx1RkYwQ1x1OTYzMlx1NjhDMFx1NkQ0Qlx1OTE0RFx1N0Y2RVxyXG4gKlxyXG4gKiBAcGFyYW0gY3R4IC0gXHU2M0QyXHU0RUY2XHU0RTBBXHU0RTBCXHU2NTg3XHVGRjA4XHU1QkJGXHU0RTNCXHU2Q0U4XHU1MTY1XHVGRjBDXHU1NDJCXHU1REU1XHU1MTc3XHU2Q0U4XHU1MThDXHU2NzBEXHU1MkExXHVGRjA5XHUzMDAyXHJcbiAqIEBwYXJhbSBjb25maWcgLSBcdTg5RTNcdTY3OTBcdTU0MEVcdTc2ODRcdTYzRDJcdTRFRjZcdTkxNERcdTdGNkVcdTMwMDJcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseShjdHg6IENvbnRleHQsIGNvbmZpZzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fSk6IHZvaWQge1xyXG4gIGNvbnN0IHByZWZpeCA9IHR5cGVvZiBjb25maWcucHJlZml4ID09PSBcInN0cmluZ1wiICYmIGNvbmZpZy5wcmVmaXggPyBjb25maWcucHJlZml4IDogREVGQVVMVF9QUkVGSVg7XHJcbiAgY29uc3QgbWNwID0gbmV3IEZvcmdlTWNwKHtcclxuICAgIGhlYWRsZXNzOiBjb25maWcuaGVhZGxlc3MgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBCb29sZWFuKGNvbmZpZy5oZWFkbGVzcyksXHJcbiAgICBjb25uZWN0VXJsOiB0eXBlb2YgY29uZmlnLmNvbm5lY3RVcmwgPT09IFwic3RyaW5nXCIgPyBjb25maWcuY29ubmVjdFVybCA6IHVuZGVmaW5lZCxcclxuICAgIHN0ZWFsdGg6IChjb25maWcuc3RlYWx0aCBhcyBuZXZlcikgPz8gdW5kZWZpbmVkLFxyXG4gIH0pO1xyXG5cclxuICBjb25zdCB0b29scyA9IChjdHggYXMgdW5rbm93biBhcyB7IHRvb2xzOiBIYXJuZXNzVG9vbFJlZ2lzdHJ5IH0pLnRvb2xzO1xyXG5cclxuICBmb3IgKGNvbnN0IHRvb2wgb2YgbWNwLnRvb2xzKSB7XHJcbiAgICBjb25zdCBwYXJhbWV0ZXJzID0gKHRvb2wuaW5wdXRTY2hlbWEgYXMgeyBwcm9wZXJ0aWVzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSkucHJvcGVydGllcyA/PyB7fTtcclxuICAgIGNvbnN0IHB1YmxpY05hbWUgPSBgJHtwcmVmaXh9XyR7dG9vbC5uYW1lfWA7XHJcbiAgICBjdHguZWZmZWN0KFxyXG4gICAgICAoKSA9PlxyXG4gICAgICAgIHRvb2xzLnJlZ2lzdGVyKHtcclxuICAgICAgICAgIG5hbWU6IHB1YmxpY05hbWUsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogdG9vbC5kZXNjcmlwdGlvbixcclxuICAgICAgICAgIHBhcmFtZXRlcnMsXHJcbiAgICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgICAgc2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcclxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7IGNvbnRlbnQ6IHsgdHlwZTogXCJhcnJheVwiLCBpdGVtczoge30gfSB9LFxyXG4gICAgICAgICAgICAgIHJlcXVpcmVkOiBbXCJjb250ZW50XCJdLFxyXG4gICAgICAgICAgICAgIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBmYWxzZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcmVuZGVyKF9hcmdzOiB1bmtub3duLCB2YWx1ZTogdW5rbm93bik6IHVua25vd25bXSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IHJlc3VsdFRleHQoKCh2YWx1ZSBhcyB7IGNvbnRlbnQ/OiB7IHR5cGU/OiBzdHJpbmc7IHRleHQ/OiBzdHJpbmcgfVtdIH0pID8/IHt9KS5jb250ZW50ID8/IFtdKTtcclxuICAgICAgICAgICAgICByZXR1cm4gW3sgdHlwZTogXCJ0ZXh0XCIsIHRleHQgfV07XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZXhlY3V0ZTogYXN5bmMgKGFyZ3M6IHVua25vd24pID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgbWNwLmNhbGxUb29sKHRvb2wubmFtZSwgdG9SZWNvcmQoYXJncykpO1xyXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gcmVzdWx0VGV4dChyZXN1bHQuY29udGVudCk7XHJcbiAgICAgICAgICAgIGlmICghcmVzdWx0Lm9rKSB0aHJvdyBuZXcgRXJyb3IodGV4dCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IGlzRXJyb3I6IGZhbHNlLCB2YWx1ZTogeyBjb250ZW50OiB0ZXh0IH0sIGNvbnRlbnQ6IFt7IHR5cGU6IFwidGV4dFwiLCB0ZXh0IH1dIH07XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICBcIm9wZW5saXVsYW4udG9vbFwiLFxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7OztBQVVPLFNBQVMsZUFBZSxTQUE0RTtBQUN6RyxRQUFNLE9BQXdCLENBQUM7QUFDL0IsUUFBTSxjQUF3QixDQUFDO0FBQy9CLFFBQU0sU0FBUyxRQUFRLE9BQU8sQ0FBQyxNQUFNLEVBQUUsVUFBVSxPQUFPLEVBQUUsS0FBSztBQUMvRCxRQUFNLE9BQU8sUUFBUSxPQUFPLENBQUMsTUFBTSxFQUFFLGFBQWEsR0FBSTtBQUV0RCxhQUFXLEtBQUssUUFBUTtBQUN0QixTQUFLLEtBQUs7QUFBQSxNQUNSLE1BQU07QUFBQSxNQUNOLFVBQVUsRUFBRSxVQUFVLE1BQU0sVUFBVTtBQUFBLE1BQ3RDLFNBQVMsNEJBQVEsRUFBRSxNQUFNLElBQUksRUFBRSxHQUFHLEtBQUssRUFBRSxNQUFNLEdBQUcsRUFBRSxhQUFhLE1BQU0sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFFBQVEsYUFBUSxFQUFFLFFBQVEsRUFBRTtBQUFBLE1BQzFILFFBQVEsRUFBRSxZQUFZLEVBQUUsWUFBWSxXQUFXLEVBQUUsVUFBVTtBQUFBLE1BQzNELFdBQVcsS0FBSyxJQUFJO0FBQUEsSUFDdEIsQ0FBQztBQUFBLEVBQ0g7QUFDQSxhQUFXLEtBQUssTUFBTTtBQUNwQixTQUFLLEtBQUs7QUFBQSxNQUNSLE1BQU07QUFBQSxNQUNOLFVBQVU7QUFBQSxNQUNWLFNBQVMsc0JBQU8sRUFBRSxVQUFVLE1BQU0sRUFB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QUFPLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxPQUFPO0FBQUEsRUFDOUQ7QUFBQSxFQUNBLElBQUksU0FBUztBQUNULFdBQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxPQUFPLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxNQUFNO0FBQUEsRUFDN0Q7QUFBQSxFQUNBLElBQUksV0FBVztBQUNYLFdBQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxPQUFPLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxRQUFRO0FBQUEsRUFDL0Q7QUFBQSxFQUNBLElBQUksU0FBUztBQUNULFdBQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxPQUFPLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxNQUFNO0FBQUEsRUFDN0Q7QUFBQSxFQUNBLElBQUksVUFBVTtBQUNWLFdBQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxPQUFPLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxPQUFPO0FBQUEsRUFDOUQ7QUFBQSxFQUNBLElBQUksU0FBUztBQUNULFdBQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxPQUFPLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxNQUFNO0FBQUEsRUFDN0Q7QUFBQSxFQUNBLElBQUksT0FBTztBQUNQLFdBQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxPQUFPLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxJQUFJO0FBQUEsRUFDM0Q7QUFBQSxFQUNBLElBQUksU0FBUztBQUNULFdBQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxPQUFPLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxNQUFNO0FBQUEsRUFDN0Q7QUFBQSxFQUNBLElBQUksV0FBVztBQUNYLFdBQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxPQUFPLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxRQUFRO0FBQUEsRUFDL0Q7QUFBQSxFQUNBLElBQUksY0FBYztBQUVkLFdBQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxPQUFPLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxXQUFXO0FB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QUFPLEVBQUUsU0FBUyxLQUFLLEdBQUcsU0FBUyxDQUFDLEVBQUUsTUFBTSxRQUFRLEtBQUssQ0FBQyxFQUFFO0FBQUEsUUFDdkY7QUFBQSxNQUNGLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsic3Bhd24iLCAiZXhpc3RzU3luYyIsICJleGlzdHNTeW5jIiwgInNwYXduIiwgInV0aWwiLCAib2JqZWN0VXRpbCIsICJlcnJvclV0aWwiLCAiZXJyb3JNYXAiLCAiY3R4IiwgInJlc3VsdCIsICJtYXNrIiwgImlzc3VlcyIsICJlbGVtZW50cyIsICJwcm9jZXNzZWQiLCAicmVzdWx0IiwgInIiLCAiWm9kRmlyc3RQYXJ0eVR5cGVLaW5kIiwgIm1heE5vZGVzIiwgIm1heFRleHQiLCAid2l0aFNlbGVjdG9ycyIsICJQUlVORV9UQUdTIiwgIlRFWFRfVEFHUyIsICJBVFRSX1dISVRFTElTVCIsICJJTlRFUkFDVElWRV9UQUdTIiwgIklOVEVSQUNUSVZFX1JPTEVTIiwgInNjb3JlIiwgIm5hbWUiLCAic3VtbWFyaXplIiwgInJlc29sdmUiLCAiZGlybmFtZSJdCn0K
