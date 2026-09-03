/**
 * opencode.ts —— 直连 OpenCode CLI 的视觉回退路由（L1 的次级通道）
 *
 * 场景：modlens 引擎已安装但当前机器上其选中的供应商不可用/欠费时
 * （如 opencode.ai 网关 Insufficient balance），直接用本机 opencode 的
 * 视觉模型完成读图。复用 opencode 自身登录（auth.json），消耗其账户配额。
 *
 * 与 modlens 的关系：本路由输出同样走 modlens 的 {image, provider, result, meta}
 * 约定，因此 normalizeVisionOutput / formatVisionEvidence 完全复用，属于
 * 「引擎可插拔」：modlens 主、opencode 兜底，二者输出同构。
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { normalizeVisionOutput, type VisionResult } from "./engine.js";

/**
 * 视觉回退默认模型清单（2026-09-03 本机实测定稿，成本优先）：
 * - opencode/mimo-v2.5-free：zen 免费池，实测可用且 cost=0（约 2-4 分钟，可接受）
 * - opencode-go/deepseek-v4-flash：订阅文字版，实测【收不到图片】（模型自行 bash 探测，白耗订阅）→ 不列入默认
 * - ocgo-free-A/deepseek-v4-flash-free：zen 免费池同名模型，实测 Model is unavailable → 不列入默认
 * - opencode-go/deepseek-v4-flash-vision-exp：订阅视觉版，实测可用（30-90s）但属「真模型视觉」，默认不启用；
 *   用户确需时显式配置 vision.opencodeModels（费用自理，属 L2 级别开销）
 * 规则：L1 默认只走免费/最低成本通道，绝不默认消费用户付费额度。
 */
export const DEFAULT_OPENCODE_MODELS = ["opencode/mimo-v2.5-free"].map((m) => m.toLowerCase());

export interface OpenCodeVisionOptions {
  imagePath: string;
  focus?: string;
  models?: string[];
  bin?: string;
  timeoutMs?: number;
}

function findOnPath(bin: string): string | null {
  const exts = process.platform === "win32" ? [".exe", ".cmd", ".bat"] : [""];
  for (const dir of (process.env.PATH ?? "").split(";").filter(Boolean)) {
    for (const ext of exts) {
      const candidate = resolve(dir, bin + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/** 解析后的可执行形式 */
export type ResolvedBin =
  | { kind: "exe"; path: string }
  | { kind: "node"; script: string };

/**
 * 定位 opencode：
 * 1. 显式路径 / OPENCODE_BIN（env）
 * 2. PATH 上的 .exe（直接跑）
 * 3. PATH 上的 npm .cmd 壳（解壳出真实 node 脚本，避免 cmd.exe 引号搅乱参数）
 */
export function resolveOpenCodeBin(explicit?: string): ResolvedBin | null {
  if (explicit && existsSync(explicit)) return explicit.endsWith(".js") ? { kind: "node", script: explicit } : { kind: "exe", path: explicit };
  const envBin = process.env.OPENCODE_BIN?.trim();
  if (envBin && existsSync(envBin)) return envBin.endsWith(".js") ? { kind: "node", script: envBin } : { kind: "exe", path: envBin };
  const found = findOnPath("opencode");
  if (!found) return null;
  if (!/\.(cmd|bat)$/i.test(found)) return { kind: "exe", path: found };
  // npm .cmd 壳解壳：读出真实 node 脚本路径
  try {
    const shim = readFileSync(found, "utf8");
    const m = shim.match(/dp0%[\\/]+node_modules[\\/]+([^"\\/]+)[\\/]+([^"%]+?\.(?:exe|js))/i);
    if (m) {
      const target = resolve(dirname(found) + "/node_modules/" + m[1] + "/" + m[2]);
      if (existsSync(target)) {
        return /\.js$/i.test(m[2]) ? { kind: "node", script: target } : { kind: "exe", path: target };
      }
    }
  } catch {
    /* 解壳失败：退回直接 spawn .cmd（Windows 下可能 EINVAL，提示用户 OPENCODE_BIN） */
  }
  return { kind: "exe", path: found };
}

/** opencode --format json 事件解析：收到 error 事件即失败 */
export interface OpenCodeEvents {
  texts: string[];
  tokens?: Record<string, unknown>;
  cost?: number;
  error?: string;
}

export function parseOpenCodeEvents(raw: string): OpenCodeEvents {
  const out: OpenCodeEvents = { texts: [] };
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    let ev: Record<string, any>;
    try { ev = JSON.parse(t); } catch { continue; }
    if (ev.type === "text" && typeof ev.part?.text === "string") {
      out.texts.push(ev.part.text);
    } else if (ev.type === "error") {
      const msg = ev.error?.data?.message ?? ev.error?.message ?? JSON.stringify(ev.error);
      out.error = String(msg).slice(0, 500);
    } else if (ev.type === "step_finish" && ev.part?.tokens) {
      out.tokens = ev.part.tokens as Record<string, unknown>;
      if (typeof ev.part.cost === "number") out.cost = ev.part.cost;
    }
  }
  return out;
}

/** 从模型回答里提取第一段 JSON 对象（容忍前后缀噪音） */
export function extractJson(answer: string): Record<string, any> | null {
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

/** 直连 opencode 视觉的提示模板（与 modlens 契约同构，保证下游复用） */
function buildOpenCodePrompt(focus?: string): string {
  const shape = [
    "{",
    '  "summary": "one-sentence overall description",',
    '  "ocr": { "full_text": "all visible text, line-broken", "lines": [{ "text": "each visible line" }] },',
    '  "layout": { "regions": [{ "reading_order": 1, "type": "title|heading|paragraph|list|table|chart|form|image|icon|link|nav|button|search|dialog|banner", "text": "what this region is/contains" }] },',
    '  "semantics": { "scene": "what kind of page/UI this is", "entities": [{ "name": "...", "type": "button|input|label|chart|dialog|...", "evidence": "why" }], "relations": [] },',
    '  "visual": { "dominant_colors": [], "style": "flat|material|dark|...", "notes": [] },',
    '  "uncertainty": ["anything you could not read confidently"]',
    "}",
  ];
  const lines = [
    "You are the vision engine of a browser automation tool. Analyze the attached screenshot.",
    "Reply with ONE JSON object, no prose, no markdown fence, using exactly this shape:",
    ...shape,
  ];
  if (focus) lines.push("Extra focus from the caller: " + focus);
  return lines.join("\n");
}

/**
 * 运行一次 opencode 视觉读图；成功时返回与 modlens 同构的 root 对象再走
 * normalizeVisionOutput；直接失败返回 ok=false，绝不抛出。
 */
export async function runOpenCodeVision(opts: OpenCodeVisionOptions): Promise<VisionResult> {
  const bin = resolveOpenCodeBin(opts.bin);
  if (!bin) {
    return {
      ok: false, imagePath: opts.imagePath, provider: null, model: null, summary: null,
      ocr: { full_text: "", lines: [] }, layout: { regions: [] },
      semantics: { scene: null, entities: [], relations: [] }, visual: {}, uncertainty: [],
      error: "opencode CLI 未找到：设置 OPENCODE_BIN 或将其加入 PATH。",
    };
  }
  const models = (opts.models && opts.models.length ? opts.models : DEFAULT_OPENCODE_MODELS)
    .map((m) => m.toLowerCase());
  // 免费池（zen）实测较慢（2-4 分钟），默认超时放宽到 240s
  const timeoutMs = opts.timeoutMs ?? 240_000;
  for (const model of models) {
    const prompt = buildOpenCodePrompt(opts.focus);
    const res = await new Promise<{ ok: boolean; raw?: string; err?: string }>((resolvePromise) => {
      const args = ["run", prompt, "-m", model, "--format", "json", "-f", opts.imagePath];
      const child =
        bin.kind === "node"
          ? spawn(process.execPath, [bin.script, ...args], {
              windowsHide: true,
              stdio: ["ignore", "pipe", "pipe"],
              cwd: dirname(resolve(opts.imagePath)),
              env: { ...process.env },
            })
          : spawn(bin.path, args, {
              windowsHide: true,
              stdio: ["ignore", "pipe", "pipe"],
              cwd: dirname(resolve(opts.imagePath)),
              env: { ...process.env },
            });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => child.kill(), timeoutMs + 10_000);
      child.stdout.on("data", (d: Buffer) => { stdout += d.toString("utf8"); });
      child.stderr.on("data", (d: Buffer) => { stderr += d.toString("utf8"); });
      child.on("error", (e) => {
        clearTimeout(timer);
        resolvePromise({ ok: false, err: "opencode 启动失败: " + e.message });
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          resolvePromise({ ok: false, err: "opencode 退出 (code=" + code + "): " + (stderr.trim().split("\n").slice(-3).join("\n") || "无错误输出") });
          return;
        }
        resolvePromise({ ok: true, raw: stdout });
      });
    });
    if (!res.ok) {
      const skipped = res.err ?? "unknown";
      if (skipped.includes("Insufficient balance") || skipped.includes("CreditsError") || skipped.includes("not supported")) {
        continue; // 该模型不可用，试下一个（L1 成本优先：不把用户的付费通道当默认）
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
    if (!parsed) return emptyFail(opts.imagePath, "opencode 未返回合法 JSON 证据");
    const root = {
      image: opts.imagePath,
      provider: "opencode-cli:" + model,
      result: parsed,
      meta: {
        model,
        durationSeconds: null,
        usage: events.tokens ?? null,
        attempts: [{ provider: "opencode-cli", ok: true }],
        warnings: ["opencode 直连回退（modlens 引擎不可用时的 L1 次级通道）"],
      },
    };
    return normalizeVisionOutput(JSON.stringify(root), opts.imagePath);
  }
  return emptyFail(
    opts.imagePath,
    "全部回退模型均不可用。实测指引：\n" +
      "  - opencode/mimo-v2.5-free（zen 免费池）通常可用但较慢（2-4 分钟），本次可能排队/超时，可重试；\n" +
      "  - deepseek 文字版（opencode-go/deepseek-v4-flash）无法接收图片（模型收不到附件，只会空转），不要用文字模型硬看图；\n" +
      "  - 若确需更强视觉：在插件配置 vision.opencodeModels 显式加入视觉模型（如 opencode-go/deepseek-v4-flash-vision-exp），属「真模型视觉」自担费用，或给 modlens 配 gemini-api 免费 key。"
  );
}

function emptyFail(imagePath: string, error: string): VisionResult {
  return {
    ok: false, imagePath, provider: null, model: null, summary: null,
    ocr: { full_text: "", lines: [] }, layout: { regions: [] },
    semantics: { scene: null, entities: [], relations: [] }, visual: {}, uncertainty: [],
    error,
  };
}
