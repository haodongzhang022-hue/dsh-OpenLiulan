/**
 * engine.ts —— modlens 视觉引擎桥（CLI 解析 + spawn + 结果规范化）
 *
 * 复用开源项目 liustack/modlens（MIT，见 THIRD_PARTY_NOTICES.md）的 CLI：
 *   node <modlens>/dist/main.js -i <image> [--prompt <focus>] [--timeout <ms>]
 * 输出固定 JSON：{ image, provider, result, meta }。
 * 本模块只负责：找到 CLI、spawn 它、把输出规范化为 VisionResult。不依赖
 * @liustack/modlens 的 JS API——只依赖它发布的 dist/main.js，保持弱耦合；
 * 引擎未配置/未安装时给出可行动的安装指引而不是崩溃。
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

/** 视觉引擎超时（默认 180s，与 modlens 默认一致） */
export const DEFAULT_VISION_TIMEOUT_MS = 180_000;

export interface CliResolution {
  nodeBin: string;
  cliPath: string;
  source: "env" | "resolve";
}
export interface CliMissing {
  cliPath: null;
  source: null;
  hint: string;
}
export type CliResolutionResult = CliResolution | CliMissing;

const require_ = createRequire(import.meta.url);

/** 引擎路径环境变量（最高优先级，便于沙盒/AB 部署时指向任意安装） */
const ENV_CLI_PATH = "MODLENS_CLI_PATH";

/**
 * 解析 modlens CLI：
 * 1. 环境变量 MODLENS_CLI_PATH 显式指定（沙盒 / 生产切换用）
 * 2. 从本包所在依赖树 require.resolve("@liustack/modlens/package.json")，
 *    命中则用其 dist/main.js（与 modlens 插件同源锁定）
 * 3. 都找不到 → 返回带指引的 CliMissing（不抛错）
 */
export function resolveModlensCli(): CliResolutionResult {
  try {
    const envPath = (process.env[ENV_CLI_PATH] ?? "").trim();
    if (envPath) {
      const cli = envPath.replace(/[\\/]+$/, "") + "/dist/main.js";
      if (existsSync(cli)) return { nodeBin: process.execPath, cliPath: cli, source: "env" };
    }
  } catch {
    /* env 解析失败 → 继续 */
  }
  try {
    const pkgJsonPath = require_.resolve("@liustack/modlens/package.json");
    const cli = pkgJsonPath.replace(/package\.json$/, "dist/main.js");
    if (existsSync(cli)) return { nodeBin: process.execPath, cliPath: cli, source: "resolve" };
  } catch {
    /* 未安装 → 落入指引 */
  }
  return {
    cliPath: null,
    source: null,
    hint:
      "未找到 modlens 视觉引擎（@liustack/modlens）。安装方式任选：\n" +
      "  1) 在运行 DSH 的 profile（如 web）执行: dsh plugin --profile web add liustack/modlens\n" +
      "  2) 或设置环境变量 MODLENS_CLI_PATH 指向其 dist/main.js（沙盒/AB 部署推荐）\n" +
      "  3) 或手动 npm i -g @liustack/modlens 后设置 MODLENS_CLI_PATH\n" +
      "引擎首次还需配置视觉供应商：node <modlens>/dist/main.js doctor 查看，常见为 gemini-api.apiKey 或 reuse.opencode 复用本机 opencode 登录。",
  };
}

/** 规范化后的视觉证据（与 modlens 输出对齐，字段都可选） */
export interface VisionResult {
  ok: boolean;
  imagePath: string | null;
  provider: string | null;
  model: string | null;
  summary: string | null;
  ocr: { full_text: string; lines: { text: string; language?: string }[] };
  layout: { regions: { type: string; reading_order: number; text: string }[] };
  semantics: {
    scene: string | null;
    intent?: string | null;
    entities: { name: string; type: string; evidence?: string }[];
    relations: { subject: string; predicate: string; object: string }[];
  };
  visual: { dominant_colors?: string[]; style?: string | null; notes?: string[] };
  uncertainty: string[];
  usage?: Record<string, unknown> | null;
  durationSeconds?: number;
  warnings?: string[];
  error?: string;
}

function emptyEvidence(): VisionResult {
  return {
    ok: false, imagePath: null, provider: null, model: null, summary: null,
    ocr: { full_text: "", lines: [] },
    layout: { regions: [] },
    semantics: { scene: null, entities: [], relations: [] },
    visual: {},
    uncertainty: [],
  };
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * 把 modlens CLI stdout JSON 规范化。
 * 输出形状见 docs/cli.md：{ image, provider, result: {...}, meta: {...} }。
 */
export function normalizeVisionOutput(raw: string, imagePath: string): VisionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ...emptyEvidence(), imagePath, error: "modlens 输出不是合法 JSON: " + String(e) };
  }
  const root = (parsed ?? {}) as Record<string, any>;
  const result = (root.result ?? {}) as Record<string, any>;
  const meta = (root.meta ?? {}) as Record<string, any>;
  const ocr = (result.ocr ?? {}) as Record<string, any>;
  const layout = (result.layout ?? {}) as Record<string, any>;
  const semantics = (result.semantics ?? {}) as Record<string, any>;
  const visual = (result.visual ?? {}) as Record<string, any>;
  const attempts = asArray<Record<string, any>>(meta.attempts);
  const failed = attempts.some((a) => a.ok !== true) || Boolean(root.error);
  return {
    ok: !failed,
    imagePath,
    provider: typeof root.provider === "string" ? root.provider : null,
    model: typeof meta.model === "string" ? meta.model : null,
    summary: typeof result.summary === "string" ? result.summary : null,
    ocr: {
      full_text: typeof ocr.full_text === "string" ? ocr.full_text : "",
      lines: asArray<{ text: string; language?: string }>(ocr.lines),
    },
    layout: {
      regions: asArray<{ type: string; reading_order: number; text: string }>(layout.regions),
    },
    semantics: {
      scene: typeof semantics.scene === "string" ? semantics.scene : null,
      intent: typeof semantics.intent === "string" ? semantics.intent : null,
      entities: asArray<{ name: string; type: string; evidence?: string }>(semantics.entities),
      relations: asArray<{ subject: string; predicate: string; object: string }>(semantics.relations)
        .filter((rel) => rel && rel.subject && rel.predicate && rel.object),
    },
    visual: {
      dominant_colors: asArray<string>(visual.dominant_colors),
      style: typeof visual.style === "string" ? visual.style : null,
      notes: asArray<string>(visual.notes),
    },
    uncertainty: asArray<string>(result.uncertainty),
    usage: meta.usage === undefined ? undefined : (meta.usage as Record<string, unknown> | null),
    durationSeconds: typeof meta.durationSeconds === "number" ? meta.durationSeconds : undefined,
    warnings: asArray<string>(meta.warnings),
    error: typeof root.error === "string" ? root.error : undefined,
  };
}

export interface RunVisionOptions {
  imagePath: string;
  focus?: string;
  cliPath?: string;
  provider?: string;
  timeoutMs?: number;
}

/** 运行 modlens 引擎读图，返回规范化证据；引擎缺失/失败时 ok=false，绝不抛出。 */
export async function runModlens(opts: RunVisionOptions): Promise<VisionResult> {
  let resolution: CliResolution;
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
  return new Promise<VisionResult>((resolvePromise) => {
    const child = spawn(resolution.nodeBin, [resolution.cliPath!, ...args], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), (opts.timeoutMs ?? DEFAULT_VISION_TIMEOUT_MS) + 10_000);
    child.stdout.on("data", (d: Buffer) => { stdout += d.toString("utf8"); });
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString("utf8"); });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolvePromise({ ...emptyEvidence(), imagePath: opts.imagePath, error: "无法启动 modlens 引擎: " + err.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const tail = stderr.trim().split("\n").slice(-4).join("\n");
        resolvePromise({
          ...emptyEvidence(),
          imagePath: opts.imagePath,
          error: "modlens 引擎退出 (code=" + code + "): " + (tail || "无错误输出"),
        });
        return;
      }
      resolvePromise(normalizeVisionOutput(stdout, opts.imagePath));
    });
  });
}
