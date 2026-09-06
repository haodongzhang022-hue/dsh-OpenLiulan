/**
 * GameProfileDirector —— 画像级「端口/连接」调度控制器（ISSUE #29 S4）
 *
 * 至此 S1..S3 已分别落地：无 DOM 基元、能力画像(Profile)、角色状态树(StateTree)。
 * 本模块把这三者收敛成**按游戏项目隔离的一条沉淀工作流**，对应 ISSUE 里
 * 「一个 MCP 对一个端口、按游戏项目形成沉淀能力」的诉求：
 *
 * - **每项目一「连接(Session)」**：projectKey 归一化为稳定 slug 端口名，
 *   把该项目的画像、状态树、沉淀录制器绑定到同一把句柄上——端口间天然隔离，
 *   互不污染，本地 AI 切到哪个项目就打哪个端口的沉淀资产。
 * - **沉淀闭环**（对应「操作一次→沉淀→下次直接复用」）：
 *   ① 在真实页面上做一次坐标点击/按键按住 → `feed()` 记入会话录制器；
 *   ② 能力项出现达到阈值 → 进入「待落库草稿」`pendingDrafts`，静默不打扰；
 *   ③ 由本地 AI / 开发 AI 确认 `settle()` 落库进画像 → 同画像下次可零定位调用；
 *   ④ 回放/复用成功后 `markReuse()` 累计收益计数。
 * - **状态树驱动**：沿画像状态树规划到目标态(通关/结算)的语义动作序列，
 *   供上层(引擎执行器 / MCP 工具)按序驱动真实游戏页。
 *
 * 安全/命名护栏（对齐 ISSUE #29 架构风险清单）：
 * - 端口命名规范化为项目 slug（小写连字符），避免任意字符入端口名；
 * - 会话按活跃度可回收（idle 超时由上层调度器决定），防止端口/句柄堆积。
 */
import type { GameProfile, GameProfileStore, KeyBinding, CoordAnchor, ProfileStateDetector, SemanticAction } from "./model.js";
import type { UnifiedAction } from "@openliulan/core";
import type { ProfileSinkNotice } from "./recorder.js";
import { GameProfileAgent } from "./agent.js";
import { GameProfileRecorder } from "./recorder.js";
import type { AgentStateTree, StateTreePath } from "./state-tree.js";
import type { StateTreeStore } from "./state-tree.js";

/** 稳定 slug 端口名：projectKey → 小写连字符（如 "Cocos Demo" → "cocos-demo"） */
export function slugifyProjectKey(projectKey: string): string {
  return projectKey
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 一条待确认的沉淀草稿（能力项出现达阈值，等待本地 AI 拍板落库） */
export type DraftItem =
  | { kind: "anchor"; item: CoordAnchor }
  | { kind: "key"; item: KeyBinding };

/** 单个游戏项目的一条隔离会话句柄 */
export interface ProfileSession {
  /** 项目 key */
  projectKey: string;
  /** slug 端口名（供 MCP/上层以稳定名调度） */
  port: string;
  /** 画像 */
  profile: GameProfile;
  /** 该画像的状态树 */
  stateTree: AgentStateTree;
  /** 会话录制器（沉淀工作流的输入端） */
  recorder: GameProfileRecorder;
  /** 待本地 AI 确认落库的能力草稿（达阈值后自动进入，静默不打扰） */
  pendingDrafts: DraftItem[];
}

/** 会话绑定请求 */
export interface BindRequest {
  projectKey: string;
  name: string;
  sourceUrl: string;
  viewport: { width: number; height: number };
  /** 能力项沉淀阈值（同一操作出现多少次后进入待落库草稿，默认 2） */
  sinkThreshold?: number;
}

/** 把成功执行的动作喂给会话录制器后得到的沉淀反馈 */
export interface FeedOutcome {
  /** 本次是否产生新的待落库草稿 */
  newDraft: boolean;
  /** 当前全部待落库草稿数 */
  pendingCount: number;
  /** 首个新草稿说明（若有） */
  draftMessage?: string;
}

/** 会话级别（每画像一端口/一连接）的调度控制器 */
export class GameProfileDirector {
  private agent: GameProfileAgent;
  /** projectKey → 会话（每项目一个连接句柄） */
  private sessions = new Map<string, ProfileSession>();
  /** 会话命中活跃度（供上层按 idle 回收） */
  private lastUsedAt = new Map<string, number>();
  private sinkThreshold: number;

  constructor(opts: {
    profileStore?: GameProfileStore;
    stateTreeStore?: StateTreeStore;
    /** 全局默认能力沉淀阈值（默认 2） */
    sinkThreshold?: number;
  } = {}) {
    this.agent = new GameProfileAgent({
      profileStore: opts.profileStore,
      stateTreeStore: opts.stateTreeStore,
    });
    this.sinkThreshold = opts.sinkThreshold ?? 2;
  }

  /** 取某项目的 slug 端口名（稳定、可作 MCP 连接/路由名） */
  portOf(projectKey: string): string {
    return slugifyProjectKey(projectKey);
  }

  /** 绑定/复用一个游戏项目会话。命中既有画像则复用沉淀；否则新建画像+状态树+录制器。 */
  async bind(req: BindRequest): Promise<ProfileSession> {
    const existing = this.sessions.get(req.projectKey);
    if (existing) {
      this.lastUsedAt.set(req.projectKey, Date.now());
      return existing;
    }

    const bound = await this.agent.bind(req);
    const recorder = new GameProfileRecorder(bound.profile, {
      triggerAfter: req.sinkThreshold ?? this.sinkThreshold,
      // 达阈值草稿进入会话 pendingDrafts，静默不打扰本地 AI，由上层 settle 决定落库
      onSinkNotice: (n: ProfileSinkNotice) => this.stageDraft(req.projectKey, n),
    });

    const session: ProfileSession = {
      projectKey: req.projectKey,
      port: slugifyProjectKey(req.projectKey),
      profile: bound.profile,
      stateTree: bound.stateTree,
      recorder,
      pendingDrafts: [],
    };
    this.sessions.set(req.projectKey, session);
    this.lastUsedAt.set(req.projectKey, Date.now());
    return session;
  }

  /** 取已绑定会话（未绑定返回 undefined） */
  async session(projectKey: string): Promise<ProfileSession | undefined> {
    const s = this.sessions.get(projectKey);
    if (s) this.lastUsedAt.set(projectKey, Date.now());
    else {
      // 尝试从持久存储按画像/树还原（跨会话留存：新进程也能续上同一端口）
      const profile = await this.agent.getProfile(projectKey);
      if (profile) {
        return this.bind({
          projectKey: profile.projectKey,
          name: profile.name,
          sourceUrl: profile.sourceUrl,
          viewport: profile.viewportBaseline,
        });
      }
    }
    return this.sessions.get(projectKey);
  }

  /** 会话是否存在（含可从存储还原的情况由 session() 决定） */
  has(projectKey: string): boolean {
    return this.sessions.has(projectKey);
  }

  /** 把一个真实成功的动作喂给某项目会话的录制器（沉淀输入端）。 */
  async feed(projectKey: string, action: UnifiedAction): Promise<FeedOutcome> {
    const s = await this.session(projectKey);
    if (!s) throw new Error(`画像 ${projectKey} 未绑定，请先 bind`);
    const before = s.pendingDrafts.length;
    s.recorder.feed(action);
    this.lastUsedAt.set(projectKey, Date.now());
    return {
      newDraft: s.pendingDrafts.length > before,
      pendingCount: s.pendingDrafts.length,
      draftMessage: s.pendingDrafts.length > before ? s.pendingDrafts[s.pendingDrafts.length - 1].kind : undefined,
    };
  }

  /** 将某项目会话的**指定待落库草稿**落库进画像（确认沉淀）。index=-1 表示全量落库。 */
  async settle(projectKey: string, index = -1): Promise<{ settled: number; remaining: number }> {
    const s = await this.session(projectKey);
    if (!s) throw new Error(`画像 ${projectKey} 未绑定，请先 bind`);
    const profile = s.profile;
    const list = index < 0 ? [...s.pendingDrafts] : s.pendingDrafts.slice(index, index + 1);
    let settled = 0;
    for (const d of list) {
      if (d.kind === "anchor" && !profile.anchors.some((a) => a.x === d.item.x && a.y === d.item.y)) {
        profile.anchors.push(d.item);
        settled++;
      } else if (d.kind === "key" && !profile.keyMap.some((b) => b.key === d.item.key)) {
        profile.keyMap.push(d.item);
        settled++;
      }
    }
    if (settled > 0) {
      profile.updatedAt = Date.now();
      await this.agent.profiles.save(profile);
    }
    // 移除已落库草稿（按对象引用/键匹配）
    const keep = s.pendingDrafts.filter((d) => !list.includes(d));
    s.pendingDrafts.length = 0;
    s.pendingDrafts.push(...keep);
    return { settled, remaining: keep.length };
  }

  /** 沿某项目状态树规划到首个目标态的语义动作序列（供上层驱动回放） */
  async planToGoal(projectKey: string): Promise<StateTreePath | undefined> {
    const s = await this.session(projectKey);
    if (!s) throw new Error(`画像 ${projectKey} 未绑定，请先 bind`);
    this.lastUsedAt.set(projectKey, Date.now());
    return this.agent.planToGoal(projectKey);
  }

  /**
   * 登记一条实测状态转移到某项目状态树（在 from 态执行 action 后到达 detector 关键态）。
   * 画像缺失关键态判定时可由 detector 补齐。登记后可用 planToGoal 沿树规划到目标态。
   */
  async registerTransition(opts: {
    projectKey: string;
    fromNodeId?: string;
    action: SemanticAction;
    label: string;
    detectorName: string;
    detector?: ProfileStateDetector;
  }): Promise<{ from: string; to: string }> {
    const s = await this.session(opts.projectKey);
    if (!s) throw new Error(`画像 ${opts.projectKey} 未绑定，请先 bind`);
    this.lastUsedAt.set(opts.projectKey, Date.now());
    // fromNodeId 支持三种写法：节点 id / 节点语义名 / 关键态名（detectorName），
    // 方便上层(本地 AI / MCP 工具)用可读名直接链式登记，不必背内部 state_<n> id。
    let fromNodeId = opts.fromNodeId;
    if (fromNodeId !== undefined) {
      const tree = await this.agent.getStateTree(opts.projectKey);
      const hit = tree?.nodes.find(
        (n) => n.id === fromNodeId || n.name === fromNodeId || n.detectorName === fromNodeId
      );
      if (hit) fromNodeId = hit.id;
    }
    return this.agent.registerTransition({ ...opts, fromNodeId });
  }

  /** 标记一次画像复用成功，累计收益计数并落盘 */
  async markReuse(projectKey: string): Promise<void> {
    const s = await this.session(projectKey);
    if (!s) throw new Error(`画像 ${projectKey} 未绑定，请先 bind`);
    s.recorder.markReuse();
    await this.agent.profiles.save(s.profile);
  }

  /** 列出全部已绑定/已沉淀的画像会话（含复用计数与端口名） */
  async list(): Promise<Array<{ projectKey: string; port: string; name: string; reuseCount: number; draftCount: number }>> {
    const out: Array<{ projectKey: string; port: string; name: string; reuseCount: number; draftCount: number }> = [];
    const s = await this.sessionAll();
    for (const sess of s) {
      out.push({
        projectKey: sess.projectKey,
        port: sess.port,
        name: sess.profile.name,
        reuseCount: sess.profile.reuseCount,
        draftCount: sess.pendingDrafts.length,
      });
    }
    return out;
  }

  private async sessionAll(): Promise<ProfileSession[]> {
    // 当前内存会话 + 存储里未加载的画像也纳入（跨会话资产总览）
    const fromStore = await this.agent.profiles.listAll();
    const list: ProfileSession[] = [...this.sessions.values()];
    for (const p of fromStore) {
      if (!this.sessions.has(p.projectKey)) {
        const s = await this.bind({
          projectKey: p.projectKey,
          name: p.name,
          sourceUrl: p.sourceUrl,
          viewport: p.viewportBaseline,
        });
        list.push(s);
      }
    }
    return list;
  }

  /** 将达阈值的录制器能力项草稿暂存进会话（静默不打扰，等待 settle 确认） */
  private stageDraft(projectKey: string, n: ProfileSinkNotice): void {
    const s = this.sessions.get(projectKey);
    if (!s) return;
    const draft: DraftItem =
      n.kind === "anchor" ? { kind: "anchor", item: n.item as CoordAnchor } : { kind: "key", item: n.item as KeyBinding };
    // 去重：同能力项已在待落库队列则跳过
    const dup = s.pendingDrafts.some(
      (d) =>
        (d.kind === "anchor" && draft.kind === "anchor" && d.item.x === draft.item.x && d.item.y === draft.item.y) ||
        (d.kind === "key" && draft.kind === "key" && d.item.key === draft.item.key)
    );
    if (!dup) s.pendingDrafts.push(draft);
  }
}

/** 便捷：由画像语义动作展开为扁平可执行动作（状态树回放步骤 → 引擎可直接执行） */
export { expandSemanticActions } from "./model.js";

/** 便捷重建（供外部传入的存储统一由 director 接管） */
export type { AgentStateTree, StateTreePath };
