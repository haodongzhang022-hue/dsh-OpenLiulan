/**
 * GameProfileAgent —— 画像 + 状态树的统一编排控制器（ISSUE #29 S3）
 *
 * 把 S2 沉淀的「能力画像」与 S3 固化的「角色状态树」收敛到一个可编程入口，
 * 供上层（MCP 工具、本地 AI、测试角色）按画像驱动探索，支撑「每画像一端口」的调度。
 *
 * 能力：
 * - bind / 按 pageKey 归一化绑定画像（同一页面命中同一画像）；
 * - 查询画像能力词表（keyMap / anchors / actions）与关键态判定；
 * - 沿状态树从根到目标态展开可执行动作序列（复用画像语义）；
 * - 实测一条转移后登记到状态树（探索沉淀的累积过程）。
 */
import type { GameProfile, GameProfileStore, ProfileStateDetector, SemanticAction } from "./model.js";
import { createProfile, normalizePageKey } from "./index.js";
import type { AgentStateTree, StateTreeStore, StateTreePath } from "./state-tree.js";
import { AgentStateExplorer, rebuildExplorer } from "./state-tree.js";

/** 画像绑定结果 */
export interface BindResult {
  profile: GameProfile;
  stateTree: AgentStateTree;
  /** 是否为新创建画像（false = 命中已有沉淀） */
  created: boolean;
}

/** 画像控制器选项 */
export interface GameProfileAgentOptions {
  /** 画像存储（默认内存） */
  profileStore?: GameProfileStore;
  /** 状态树存储（默认内存） */
  stateTreeStore?: StateTreeStore;
}

/** 把某画像下已有的 stateDetectors 表列出，供登记转移时引用 */
export interface StateDetectorOption {
  name: string;
  detector: ProfileStateDetector;
  isGoal: boolean;
}

/** 画像 + 状态树统一控制器 */
export class GameProfileAgent {
  readonly profiles: GameProfileStore;
  readonly stateTrees: StateTreeStore;
  private loaded = new Map<string, AgentStateTree>();

  constructor(opts: GameProfileAgentOptions = {}) {
    this.profiles = opts.profileStore ?? new MemoryProfileStore();
    this.stateTrees = opts.stateTreeStore ?? new MemoryStateTreeStore();
  }

  /**
   * 绑定一个画像：按 URL 归一化 pageKey，命中已有画像则复用，否则新建骨架。
   * 返回该画像与其状态树（树尚为空，随探索累积登记转移）。
   */
  async bind(opts: {
    projectKey: string;
    name: string;
    sourceUrl: string;
    viewport: { width: number; height: number };
  }): Promise<BindResult> {
    const pageKey = normalizePageKey(opts.sourceUrl);
    const existing = await this.profiles.getByPageKey(pageKey);
    let profile = existing;
    let created = false;

    if (!profile) {
      profile = createProfile(opts);
      profile.id = opts.projectKey;
      profile.projectKey = opts.projectKey;
      profile.name = opts.name;
      profile.sourceUrl = opts.sourceUrl;
      created = true;
    }

    // 状态树：按画像取，缺失则用画像骨架新树
    let tree = await this.stateTrees.getByProfile(profile.id);
    if (!tree) {
      const explorer = new AgentStateExplorer(profile);
      tree = explorer.tree;
      await this.stateTrees.save(tree);
    }
    this.loaded.set(profile.id, tree);

    if (created) await this.profiles.save(profile);
    return { profile, stateTree: tree, created };
  }

  /** 取画像（按 projectKey / profile id） */
  async getProfile(projectKey: string): Promise<GameProfile | undefined> {
    return this.profiles.get(projectKey) ?? (await this.profiles.getByPageKey(projectKey));
  }

  /** 取画像对应状态树 */
  async getStateTree(projectKey: string): Promise<AgentStateTree | undefined> {
    const cached = this.loaded.get(projectKey);
    if (cached) return cached;
    const tree = await this.stateTrees.getByProfile(projectKey);
    if (tree) this.loaded.set(projectKey, tree);
    return tree;
  }

  /** 列出画像的关键态判定选项（供登记转移） */
  async listStateDetectors(projectKey: string): Promise<StateDetectorOption[]> {
    const p = await this.getProfile(projectKey);
    if (!p) return [];
    return p.stateDetectors.map((d) => ({
      name: d.name,
      detector: d,
      isGoal: /victory|win|clear|goal|success|complete|通关|胜利|结算|达标/i.test(d.name),
    }));
  }

  /**
   * 登记一条实测转移并落盘：在 `fromNodeId` 执行 `action` 后到达 `detectorName` 关键态。
   * 更新画像的关键态判定表（缺失则补），并把转移写入状态树。
   */
  async registerTransition(opts: {
    projectKey: string;
    fromNodeId?: string;
    action: SemanticAction;
    label: string;
    detectorName: string;
    /** 可选的判定定义（缺失且画像未收录时需提供） */
    detector?: ProfileStateDetector;
  }): Promise<{ from: string; to: string }> {
    const p = await this.getProfile(opts.projectKey);
    if (!p) throw new Error(`画像不存在: ${opts.projectKey}，请先 bind`);

    // 关键态判定去重：优先画像已收录
    let detector = p.stateDetectors.find((d) => d.name === opts.detectorName);
    if (!detector) {
      if (!opts.detector) throw new Error(`画像缺少关键态 ${opts.detectorName} 的判定定义，请传入 detector`);
      detector = opts.detector;
      p.stateDetectors.push(detector);
      await this.profiles.save(p);
    }

    const tree = await this.getStateTree(opts.projectKey);
    if (!tree) throw new Error(`状态树不存在，请先 bind`);
    const explorer = this.explorerFor(tree, p);

    const fromId = opts.fromNodeId ?? tree.root.id;
    const r = explorer.addTransition({ fromNodeId: fromId, action: opts.action, label: opts.label, detector });
    // 覆盖回 tree（addTransition 在 explorer.tree 上原地修改了同一引用）
    await this.stateTrees.save(tree);
    return { from: r.from.id, to: r.to.id };
  }

  /** 查询到某目标态的可执行动作序列（语义动作 → 已展开扁平动作给上层驱动） */
  async planToGoal(projectKey: string): Promise<StateTreePath | undefined> {
    const tree = await this.getStateTree(projectKey);
    if (!tree) return undefined;
    const p = await this.getProfile(projectKey);
    if (!p) return undefined;
    const explorer = this.explorerFor(tree, p);
    return explorer.firstGoalPath();
  }

  private explorerFor(tree: AgentStateTree, profile: GameProfile): AgentStateExplorer {
    // 由既有树重建探察器，正确还原邻接表，使其能继续 addTransition / 遍历
    return rebuildExplorer(tree, profile);
  }
}

/** 内存画像存储（默认兜底） */
class MemoryProfileStore implements GameProfileStore {
  private m = new Map<string, GameProfile>();
  async save(p: GameProfile) { this.m.set(p.id, p); }
  async get(id: string) { return this.m.get(id); }
  async getByPageKey(k: string) { return [...this.m.values()].find((p) => p.pageKey === k); }
  async listAll() { return [...this.m.values()]; }
  async remove(id: string) { this.m.delete(id); }
}

/** 内存状态树存储（默认兜底） */
class MemoryStateTreeStore implements StateTreeStore {
  private m = new Map<string, AgentStateTree>();
  async save(t: AgentStateTree) { this.m.set(t.id, t); }
  async get(id: string) { return this.m.get(id); }
  async getByProfile(id: string) { return [...this.m.values()].find((t) => t.profileId === id); }
  async listAll() { return [...this.m.values()]; }
  async remove(id: string) { this.m.delete(id); }
}
