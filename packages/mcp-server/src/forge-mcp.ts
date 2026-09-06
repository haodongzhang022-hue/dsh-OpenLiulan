/**
 * ForgeMCP —— MCP 服务处理器（协议无关）
 *
 * 内部实现工具分发逻辑。上层可用不同的传输层（stdio/HTTP/SSE）包装，
 * 使其可接入 deepseek harness、cnb.cool、Claude Desktop 等任意 MCP 客户端。
 */
import { ForgeBrowser } from "@openliulan/core";
import { PlaywrightEngine } from "@openliulan/engines";
import { DiagnosisCenter } from "@openliulan/diagnosis";
import { compactSnapshot } from "@openliulan/token";
import type { StealthOptions } from "@openliulan/stealth";
import { TOOLS, okResult, errResult, type ToolResult, type McpToolSchema } from "./tools.js";
import { GAME_TOOLS } from "./game-tools.js";
import {
  GameProfileDirector,
  JsonProfileStore,
  JsonStateTreeStore,
  expandSemanticActions,
  type SemanticAction,
} from "@openliulan/game-profile";
import os from "node:os";
import path from "node:path";

/** 缺省游戏画像存储目录（临时目录，跨会话留存但系统可清理） */
function defaultGameStoreDir(): string {
  return path.join(os.tmpdir(), "forge-game-profiles");
}


/** 把画像语义动作转成人类可读的一行 */
function actionHuman(st: SemanticAction): string {
  if (typeof st !== "object" || st === null) return String(st);
  const o = st as Record<string, unknown>;
  if (o.kind === "key") return `按键 ${o.key}${o.ms ? `（按住${o.ms}ms）` : ""}`;
  if (o.kind === "clickAt") return `点击坐标 (${o.x},${o.y})`;
  if (o.kind === "seq") return `复合序列(${(o.steps as unknown[])?.length ?? 0}步)`;
  return "画像动作";
}

import { SessionLogger } from "./logger.js";
import { buildAIMessage, messageToContent, type AIMessage } from "./message.js";
import type { ForgeAnyEvent } from "./events.js";
import { guardJsScript, redactUrl, redactDeep } from "./security.js";

export interface ForgeMcpOptions {
  /** 无头模式 */
  headless?: boolean;
  /** CDP 连接地址 */
  connectUrl?: string;
  /** 会话日志器（缺省自动创建） */
  logger?: SessionLogger;
  /** 事件流最大保留条数 */
  maxEvents?: number;
  /** 防检测配置（可选，默认关闭） */
  stealth?: StealthOptions;
  /** 游戏画像持久化目录（JSON 落盘，跨会话留存）。缺省用系统临时目录下的 forge-game-profiles */
  gameStoreDir?: string;
}

export class ForgeMcp {
  readonly tools: McpToolSchema[] = [...TOOLS, ...GAME_TOOLS];
  /** 会话事件日志器 —— 供外部 AI / IDE 订阅和拉取事件流 */
  readonly logger: SessionLogger;
  private browser?: ForgeBrowser;
  private diagnosis?: DiagnosisCenter;
  /** 画像级调度控制器（每项目一端口），按需惰性创建 */
  private game?: GameProfileDirector;
  private gameDir: string;

  constructor(private opts: ForgeMcpOptions = {}) {
    this.logger = opts.logger ?? new SessionLogger({ maxEvents: opts.maxEvents });
    this.gameDir = opts.gameStoreDir ?? defaultGameStoreDir();
  }

  /** 惰性获取画像调度控制器（跨会话 JSON 落盘） */
  private ensureGame(): GameProfileDirector {
    if (!this.game) {
      this.game = new GameProfileDirector({
        profileStore: new JsonProfileStore(path.join(this.gameDir, "profiles")),
        stateTreeStore: new JsonStateTreeStore(path.join(this.gameDir, "trees")),
      });
    }
    return this.game;
  }

  /** 生命周期：确保浏览器已就绪 */
  private async ensureBrowser(): Promise<ForgeBrowser> {
    if (!this.browser) {
      const engine = new PlaywrightEngine({
        headless: this.opts.headless ?? true,
        connectUrl: this.opts.connectUrl,
        stealth: this.opts.stealth,
      });
      this.browser = new ForgeBrowser(engine);
      await this.browser.start();
    }
    return this.browser;
  }

  /** 核心：分发工具调用 */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const t0 = Date.now();
    try {
      // 记录工具调用开始（system 事件，供外部 AI 追踪）
      this.logger.log({ level: "debug", category: "system", message: `调用工具 ${name}`, payload: { args: this.safeArgs(args) } });

      let result: ToolResult;
      switch (name) {
        case "observe": {
          const b = await this.ensureBrowser();
          const snap = await b.observe({ maxNodes: (args.maxNodes as number) ?? 200, maxTextLength: (args.maxTextLength as number) ?? 80 });
          result = okResult(compactSnapshot(snap), { url: snap.url, title: snap.title, stats: snap.stats });
          this.logger.log({ category: "action", message: `observe ${snap.url} (${snap.stats?.emittedNodes ?? 0} 可交互节点)` });
          break;
        }

        case "act": {
          const b = await this.ensureBrowser();
          const action = this.normalizeAction(args);
          const actResult = await b.act(action as any);
          const lines = [`动作: ${actResult.type}`];
          if (actResult.ok) {
            lines.push(`✓ ${actResult.summary}`);
            if (actResult.diagnostics?.length) {
              lines.push(`⚠ 动作后检测到 ${actResult.diagnostics.length} 条页面异常:`);
              for (const d of actResult.diagnostics.slice(0, 5)) lines.push(`  - [${d.kind}] ${d.message}`);
            }
          } else {
            lines.push(`✗ ${actResult.summary}`);
          }
          lines.push(`耗时 ${actResult.durationMs}ms`);
          result = actResult.ok ? okResult(lines.join("\n"), { data: actResult.data }) : errResult(lines.join("\n"));

          // 动作事件：成功/失败都沉淀为结构化事件（供外部 AI 追踪执行轨迹）
          if (actResult.ok) {
            this.logger.action(`动作 ${actResult.type} 成功: ${actResult.summary}`, { type: actResult.type, durationMs: actResult.durationMs });
            if (actResult.diagnostics?.length) {
              this.logger.diagnose(`动作后检测到 ${actResult.diagnostics.length} 条页面异常`, {
                items: actResult.diagnostics.slice(0, 5).map((d) => ({ kind: d.kind, message: d.message })),
              });
            }
          } else {
            // 标准错误事件：带报错原因与解释，交给外部 AI
            this.logger.error({
              message: `动作 ${actResult.type} 失败: ${actResult.summary}`,
              code: this.mapErrorCode(actResult.type),
              reason: this.mapErrorReason(actResult.summary, actResult.diagnostics),
              raw: actResult.summary,
              explanation: this.buildExplanation(actResult.summary, actResult.diagnostics),
              suggestion: this.buildSuggestion(actResult.summary),
              detail: actResult.error,
              findings: (actResult.diagnostics ?? []).slice(0, 5).map((d) => ({
                category: d.kind,
                severity: d.severity,
                message: d.message,
              })),
            });
          }
          break;
        }

        case "diagnose": {
          const b = await this.ensureBrowser();
          const report = await b.captureDiagnostics();
          // 用 diagnosis 中心生成摘要（core 与 diagnosis 的报告类型已对齐，无需强转）
          const { summarize } = await import("@openliulan/diagnosis");
          const summary = summarize(report);
          const lines = [`# 诊断结果 (${summary.healthy ? "健康" : "存在问题"})`];
          if (summary.issues.length === 0) {
            lines.push("未发现错误，页面运行正常。");
          }
          for (const issue of summary.issues) {
            lines.push(`- [${issue.category}/${issue.severity}] ${issue.message}`);
          }
          if (summary.suggestions.length) {
            lines.push(`\n## 建议`);
            summary.suggestions.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
          }
          result = okResult(lines.join("\n"), {
            issues: summary.issues,
            console: report.console.length,
            network: report.network.length,
            dom: report.dom.length,
            jsExceptions: report.jsExceptions.length,
          });
          this.logger.diagnose(`诊断完成: ${summary.healthy ? "健康" : `${summary.issues.length} 条问题`}`, {
            healthy: summary.healthy,
            issues: summary.issues.length,
            suggestions: summary.suggestions.length,
          });
          break;
        }

        case "eval": {
          const b = await this.ensureBrowser();
          const script = String(args.script);
          // 安全加固：拦截高危注入脚本（文件系统/子进程/渗透尝试），防提权
          const guard = guardJsScript(script);
          if (guard.blocked) {
            result = errResult(
              `eval 被安全拦截：脚本命中高危操作 [${(guard.reasons ?? []).join(", ")}]。` +
                `\n为防提权/渗透，禁止通过 eval 注入文件系统访问、子进程执行或系统级操作。`
            );
            this.logger.error({
              message: `eval 被安全拦截: ${guard.reasons?.join(", ")}`,
              code: "EVAL_BLOCKED",
              reason: "dangerous-script",
              raw: script.slice(0, 300),
              explanation: "检测到高危注入脚本，为防提权/渗透已拒绝执行。",
              suggestion: "移除文件系统/子进程/系统级访问代码，仅保留页面内的 DOM/JS 诊断。",
            });
            break;
          }
          const evalResult = await b.eval(script);
          // 对结果做脱敏，避免 eval 返回的敏感值（如 token/password）外泄
          const sanitizedResult = redactDeep(evalResult);
          result = okResult(`执行结果: ${JSON.stringify(sanitizedResult)?.slice(0, 2000)}`, { result: sanitizedResult });
          this.logger.log({ category: "action", message: "eval 执行" });
          break;
        }

        case "screenshot": {
          const b = await this.ensureBrowser();
          const shot = await b.act({ type: "screenshot", fullPage: !!args.fullPage } as any);
          const base64 = (shot.data as any)?.base64;
          const dataUri = `data:image/png;base64,${base64}`;
          result = okResult(shot.summary, { image: dataUri });
          // 截图事件：把图片纳入事件流，供外部多模态 AI 消费
          this.logger.screenshot({
            dataUri,
            fullPage: !!args.fullPage,
            caption: args.caption ? String(args.caption) : shot.summary,
          });
          break;
        }

        case "session_log": {
          // 让外部 AI 拉取会话事件流（这是 AI 协作的"追踪能力"）
          const events = this.logger.toArray();
          const format = String(args.format ?? "markdown");
          if (format === "json") {
            // 对事件流做深脱敏，防止 payload 携带的令牌/密码外泄
            result = okResult(`共 ${events.length} 条事件`, { events: redactDeep(events) });
          } else {
            const md = this.logger.exportMarkdown({ title: args.title ? String(args.title) : undefined });
            result = okResult(md, { eventCount: events.length });
          }
          break;
        }

        case "close": {
          if (this.browser) {
            await this.browser.stop();
            this.browser = undefined;
          }
          result = okResult("浏览器已关闭");
          this.logger.system("浏览器已关闭");
          break;
        }

        case "stealth_status": {
          // 查询防检测模块状态（需在构造时配置 stealth 才能生效）
          const stealthOpts = this.opts.stealth;
          const enabled = stealthOpts?.enabled ?? false;
          const level = stealthOpts?.level ?? "basic";
          const ua = stealthOpts?.userAgent ?? "default";
          const lines = [
            `# 防检测（Stealth）状态`,
            `- **启用**: ${enabled ? "✅ 是" : "❌ 否"}`,
            `- **级别**: ${level}`,
            `- **User-Agent**: ${ua}`,
            ``,
            enabled
              ? "> Stealth 已启用：反指纹注入、自动化控制隐藏、人类行为模拟均生效。"
              : "> Stealth 未启用。若采集公开数据时被限速/封禁，可通过 `stealth.enabled=true` 在初始化时开启。",
          ];
          result = okResult(lines.join("\n"), { enabled, level, ua });
          this.logger.log({ category: "system", message: `查询 stealth 状态: ${enabled ? "enabled" : "disabled"}` });
          break;
        }


        case "game_bind": {
          const g = this.ensureGame();
          const projectKey = String(args.projectKey);
          const sess = await g.bind({
            projectKey,
            name: args.name ? String(args.name) : projectKey,
            sourceUrl: String(args.sourceUrl),
            viewport: { width: Number(args.width ?? 1280), height: Number(args.height ?? 720) },
          });
          const isNew = sess.profile.createdAt === sess.profile.updatedAt;
          const lines = [
            `画像已${isNew ? "新建" : "复用"}：${sess.profile.name}`,
            `- 项目 key: ${projectKey}`,
            `- 端口: ${sess.port}`,
            `- 页面: ${sess.profile.pageKey}`,
            `- 已沉淀: ${sess.profile.anchors.length} 坐标锚点, ${sess.profile.keyMap.length} 按键映射, ${sess.profile.stateDetectors.length} 关键态`,
          ];
          result = okResult(lines.join("\n"), {
            projectKey,
            port: sess.port,
            created: isNew,
            profile: sess.profile,
          });
          this.logger.log({ category: "system", message: `game_bind ${projectKey} (${sess.port})` });
          break;
        }

        case "game_record": {
          const g = this.ensureGame();
          const projectKey = String(args.projectKey);
          const t = String(args.type);
          const act =
            t === "clickAt"
              ? { type: "clickAt", x: Number(args.x), y: Number(args.y), description: args.desc ? String(args.desc) : undefined }
              : { type: t === "keyDown" ? "keyDown" : "keyHold", key: String(args.key), ms: args.ms ? Number(args.ms) : undefined };
          const out = await g.feed(projectKey, act as never);
          const lines = [
            `动作已喂给画像 ${projectKey} 录制器。`,
            out.newDraft
              ? `⚠ 该能力项已达沉淀阈值，进入待落库草稿（共 ${out.pendingCount} 条）。用 game_settle 确认落库。`
              : `当前待落库草稿 ${out.pendingCount} 条。`,
          ];
          result = okResult(lines.join("\n"), { newDraft: out.newDraft, pendingCount: out.pendingCount });
          this.logger.log({ category: "action", message: `game_record ${projectKey} ${t}${out.newDraft ? " (进入草稿)" : ""}` });
          break;
        }

        case "game_settle": {
          const g = this.ensureGame();
          const projectKey = String(args.projectKey);
          const index = args.index === undefined ? -1 : Number(args.index);
          const r = await g.settle(projectKey, index);
          const sess = await g.session(projectKey);
          const profile = sess?.profile;
          const lines = [
            `画像 ${projectKey} 落库完成：本次落库 ${r.settled} 条，剩余待落库草稿 ${r.total} 条。`,
            profile
              ? `画像能力累计：${profile.anchors.length} 坐标锚点, ${profile.keyMap.length} 按键映射, ${profile.reuseCount} 次复用收益。`
              : "",
          ];
          result = okResult(lines.filter(Boolean).join("\n"), { settled: r.settled, remaining: r.total });
          this.logger.log({ category: "system", message: `game_settle ${projectKey}: +${r.settled}` });
          break;
        }

        case "game_transition": {
          const g = this.ensureGame();
          const projectKey = String(args.projectKey);
          const a = (args.action ?? {}) as Record<string, unknown>;
          const kind = String(a.kind ?? "key");
          let semantic;
          if (kind === "clickAt") semantic = { kind: "clickAt", x: Number(a.x), y: Number(a.y) };
          else if (kind === "seq") semantic = { kind: "seq", steps: Array.isArray(a.steps) ? a.steps : [] };
          else semantic = { kind: "key", key: String(a.key), ms: a.ms ? Number(a.ms) : undefined };
          // 由 detector 参数构造关键态判定（pixel 图色 / url 片段）
          const dk = args.detectorKind ? String(args.detectorKind) : "url";
          const detector =
            dk === "pixel"
              ? {
                  name: String(args.detectorName),
                  detect: { kind: "pixel" as const, x: Number(args.x), y: Number(args.y), rgb: [Number(args.r ?? 0), Number(args.g ?? 0), Number(args.b ?? 0)] as [number, number, number] },
                }
              : {
                  name: String(args.detectorName),
                  detect: { kind: "url" as const, fragment: String(args.fragment ?? "") },
                };
          const t = await g.registerTransition({
            projectKey,
            fromNodeId: args.fromNodeId ? String(args.fromNodeId) : undefined,
            action: semantic as never,
            label: args.label ? String(args.label) : String(args.detectorName),
            detectorName: String(args.detectorName),
            detector,
          });
          const lines = [`已登记状态转移 ${t.from} --(${String(args.label ?? args.detectorName)})--> ${t.to}。`, "用 game_plan 可沿树规划到目标态。"];
          result = okResult(lines.join("\n"), { from: t.from, to: t.to });
          this.logger.log({ category: "system", message: `game_transition ${projectKey}: ${t.from}->${t.to}` });
          break;
        }

        case "game_plan": {
          const g = this.ensureGame();
          const projectKey = String(args.projectKey);
          const pth = await g.planToGoal(projectKey);
          if (!pth) {
            result = okResult(`画像 ${projectKey} 状态树尚无到目标态的路径。请先用 game_record + game_settle 沉淀，或实测登记状态转移。`, { hasPath: false });
          } else {
            const steps = pth.steps;
            const lines = [
              `沿状态树到目标态 ${pth.goalNodeId}（${steps.length} 步）：`,
              ...steps.map((st, i) => {
                const act = expandSemanticActions(st);
                return `${i + 1}. ${actionHuman(st)}  → ${act.length} 个可执行动作`;
              }),
              "提示：用 game_act 按序执行这些动作即可推进到目标态，重复探索无需重新定位。",
            ];
            result = okResult(lines.join("\n"), { goalNodeId: pth.goalNodeId, steps: pth.steps });
          }
          this.logger.log({ category: "action", message: `game_plan ${projectKey}: ${pth ? pth.steps.length : "no path"}` });
          break;
        }

        case "game_act": {
          const g = this.ensureGame();
          const projectKey = String(args.projectKey);
          const sess = await g.session(projectKey);
          if (!sess) throw new Error(`画像 ${projectKey} 未绑定，请先 game_bind`);
          const kind = String(args.kind);
          let semantic;
          if (kind === "key") semantic = { kind: "key", key: String(args.key), ms: args.ms ? Number(args.ms) : 150 };
          else if (kind === "clickAt") semantic = { kind: "clickAt", x: Number(args.x), y: Number(args.y) };
          else throw new Error(`kind 需为 key 或 clickAt`);
          // 执行真实浏览器动作（画像语义 → 引擎可执行动作）
          const b = await this.ensureBrowser();
          const acts = expandSemanticActions(semantic as never);
          const parts: string[] = [];
          for (const a of acts) {
            const ar = await b.act(a as never);
            parts.push(ar.ok ? `✓ ${ar.summary}` : `✗ ${ar.summary}`);
            if (!ar.ok) break;
          }
          // 成功后计入画像复用收益
          await g.markReuse(projectKey);
          const lines = [`画像 ${projectKey} ${kind} 执行完成：`, ...parts];
          result = okResult(lines.join("\n"), { executed: acts.length });
          this.logger.action(`game_act ${projectKey} ${kind} 成功: ${sess.profile.reuseCount} 次复用`);
          break;
        }

        case "game_list": {
          const g = this.ensureGame();
          const list = await g.list();
          if (list.length === 0) {
            result = okResult("尚无沉淀的游戏画像。用 game_bind 绑定一个游戏项目开始沉淀。", { profiles: [] });
          } else {
            const lines = [`共 ${list.length} 个游戏画像资产：`];
            for (const l of list) {
              lines.push(`- ${l.name} (${l.projectKey}) [端口 ${l.port}] 复用 ${l.reuseCount} 次${l.draftCount ? `, 待落库 ${l.draftCount} 条` : ""}`);
            }
            result = okResult(lines.join("\n"), { profiles: list });
          }
          this.logger.log({ category: "system", message: `game_list: ${list.length} profiles` });
          break;
        }

        default:
          result = errResult(`未知工具: ${name}。可用工具: ${TOOLS.map((t) => t.name).join(", ")}`);
      }

      // 把本次调用的最新事件注入返回结果，让外部 AI 拿到"发生了什么 + 为什么 + 图 + 日志"
      result = this.attachEvents(result, name);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 异常也沉淀为标准错误事件，带原因与解释
      this.logger.error({
        message: `工具 ${name} 执行异常: ${msg}`,
        code: "TOOL_EXCEPTION",
        reason: "uncaught-exception",
        raw: msg,
        explanation: `工具 ${name} 在执行时抛出未捕获异常。`, 
        suggestion: "检查参数是否合法、浏览器是否可用、网络是否连通；可先 observe 确认页面状态。",
        detail: err instanceof Error && err.stack ? err.stack.slice(0, 500) : undefined,
      });
      const result = this.attachEvents(errResult(`工具执行失败: ${msg}`), name);
      return result;
    }
  }

  /** 把最近事件附加到 ToolResult.structured，供外部 AI 消费事件流 */
  private attachEvents(result: ToolResult, _name: string): ToolResult {
    if (!result.structured) result.structured = {};
    const events = this.logger.toArray().slice(-30);
    (result.structured as Record<string, unknown>).events = events;
    (result.structured as Record<string, unknown>).sessionId = this.logger.sessionId;
    return result;
  }

  /** 隐藏敏感参数（避免把 value/script/url 中的敏感信息全文塞入日志） */
  private safeArgs(args: Record<string, unknown>): Record<string, unknown> {
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      if (k === "value" || k === "script") safe[k] = typeof v === "string" ? `<${v.length} chars>` : v;
      else if (k === "url" && typeof v === "string") safe[k] = redactUrl(v);
      else if (k === "expected" && typeof v === "string") safe[k] = v.length > 60 ? `${v.slice(0, 60)}...` : v;
      else safe[k] = v;
    }
    return safe;
  }

  /** 动作类型 -> 稳定错误码 */
  private mapErrorCode(type: string): string {
    return `ACTION_FAILED_${type.toUpperCase()}`;
  }

  /** 从摘要/诊断推断根因分类 */
  private mapErrorReason(summary: string, diagnostics?: Array<{ kind?: string; message: string }>): string {
    const s = summary.toLowerCase();
    if (s.includes("timeout") || s.includes("超时")) return "timeout";
    if (s.includes("404") || s.includes("500") || s.includes("network") || s.includes("网络")) return "network-failure";
    if (s.includes("not found") || s.includes("找不到") || s.includes("无法定位") || s.includes("未找到") || s.includes("locator")) return "locator-not-found";
    if (diagnostics?.some((d) => d.kind === "js-exception")) return "js-exception";
    if (diagnostics?.some((d) => d.kind === "dom")) return "dom-unrendered";
    return "action-failed";
  }

  /** 面向 AI 的根因解释 */
  private buildExplanation(summary: string, diagnostics?: Array<{ kind?: string; message: string }>): string {
    const reason = this.mapErrorReason(summary, diagnostics);
    const extras = (diagnostics ?? []).slice(0, 3).map((d) => d.message).join("; ");
    switch (reason) {
      case "locator-not-found":
        return `页面中未找到目标元素。${extras ? `诊断提示: ${extras}` : "可能是元素未渲染、选择器变化、或页面还在加载。"}`;
      case "timeout":
        return `操作超时，元素或导航在限定时间内未就绪。${extras ? `诊断提示: ${extras}` : ""}`;
      case "network-failure":
        return `网络请求失败或目标不可达。${extras ? `诊断提示: ${extras}` : ""}`;
      case "js-exception":
        return `页面抛出了 JS 未捕获异常，可能阻断交互。${extras ? `诊断提示: ${extras}` : ""}`;
      case "dom-unrendered":
        return `页面 DOM 未正常渲染（白屏/未挂载），初始化 JS 可能出错。`;
      default:
        return `动作执行失败: ${summary.slice(0, 200)}`;
    }
  }

  /** 可行动的修复建议 */
  private buildSuggestion(summary: string): string {
    const reason = this.mapErrorReason(summary);
    switch (reason) {
      case "locator-not-found":
        return "先 observe 查看当前 DOM，切换定位策略(ref→selector→text→semantic)，或 wait 元素就绪后重试。";
      case "timeout":
        return "检查页面加载/网络，可延长 wait 或改用 waitUntil 策略；若元素是异步渲染，先等其出现。";
      case "network-failure":
        return "核对 URL/接口路径、CORS 与后端状态；必要时用 diagnose 查看网络失败详情。";
      case "js-exception":
        return "用 diagnose 展开异常堆栈，定位 throw/未定义/异步未 catch，修复后重试。";
      case "dom-unrendered":
        return "检查初始化 JS 是否抛错导致整树未渲染；用 diagnose 的 dom 维度定位白屏根因。";
      default:
        return "用 diagnose 采集完整诊断，结合日志事件定位根因后修正动作。";
    }
  }

  /** 把扁平参数规整为统一动作 */
  private normalizeAction(args: Record<string, unknown>): Record<string, unknown> {
    const type = String(args.type);
    const base = { type, description: args.description as string | undefined };
    // 只携带定位相关字段（避免把 undefined 塞入）
    const loc: Record<string, unknown> = {};
    if (args.ref) loc.ref = args.ref;
    if (args.selector) loc.selector = args.selector;
    if (args.text) loc.text = args.text;
    if (args.semantic) loc.semantic = args.semantic;

    const rest: Record<string, unknown> = {};
    for (const k of ["url", "value", "key", "ms", "script", "mode", "expected", "fullPage", "deltaY", "delay", "waitUntil", "waitForNavigation"]) {
      if (args[k] !== undefined) rest[k] = args[k];
    }
    return { ...base, ...loc, ...rest };
  }

  /** 关闭（供传输层退出时调用） */
  async shutdown(): Promise<void> {
    if (this.browser) await this.browser.stop();
  }
}
