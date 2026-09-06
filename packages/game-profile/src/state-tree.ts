/**
 * 角色状态树（AgentStateTree）—— 游戏探索序列的固化与沉淀（ISSUE #29 S3）
 *
 * 在 S2「GameProfile 能力画像」之上，把**一整套探索序列**固化为树：
 * - 根节点 = 起始画面（首屏）
 * - 每条边 = 一个画像语义动作（走画像 keyMap / anchors / actions）
 * - 子节点 = 执行该动作后到达的「关键态」（用画像 stateDetectors 判定）
 * - 叶节点 = 目标态（结算 / 通关 / 达标）
 *
 * 这样游戏控制流从「挤牙膏的单条命令」升级为「一次成型、可导航的状态机」：
 * 本地 AI 在**同一画像**上可沿树从根走到叶，重复探索无需重新定位，
 * 也支撑「测试角色 / 状态树探索」——把角色放进树里按序推进直到目标态。
 *
 * 关键态判定复用以画像上的 stateDetectors（像素图色 / URL 片段），
 * 动作只引用画像的语义契约，不含引擎逻辑，跨引擎复用。
 */
import type { GameProfile, ProfileStateDetector, SemanticAction } from "./model.js";

/** 状态节点标识 */
export interface AgentStateNode {
  /** 节点唯一 id（如 root / state_<n>） */
  id: string;
  /** 语义名（如 start / victory / defeat / inventory） */
  name: string;
  /** 可读说明 */
  desc?: string;
  /** 该节点绑定的关键态判定名（对应画像 stateDetectors 的 name） */
  detectorName?: string;
  /** 是否为「目标态」（叶，探索终点：通关/结算/达标） */
  isGoal: boolean;
  /** 到达该节点的累计动作数（由根出发的深度，用于剪枝/代价） */
  depth: number;
}

/** 状态转移边：一个画像语义动作，从父态到子态 */
export interface AgentStateEdge {
  /** 边唯一 id（`父节点名->子态名`） */
  id: string;
  /** 触发动作（画像语义动作，走 keyMap/anchors/actions） */
  action: SemanticAction;
  /** 动作的人类可读语义（如 move:forward / jump / click attack） */
  label: string;
  /** 执行后到达的子节点 id */
  to: string;
  /** 该转移已验证的次数（回放/实测成功计数） */
  verified: number;
}

/** 一次从根到某目标的完整路径（供回放器按序执行） */
export interface StateTreePath {
  /** 目标节点 id */
  goalNodeId: string;
  /** 从根到目标逐节点（含根与目标） */
  nodes: AgentStateNode[];
  /** 连接各节点的边动作（待执行的语义动作序列） */
  steps: SemanticAction[];
}

/** 一棵角色状态树 */
export interface AgentStateTree {
  /** 树 id（默认 = profileId，每画像一棵树） */
  id: string;
  /** 所属画像 id（每画像一棵状态树，符合「一个画像一个沉淀」） */
  profileId: string;
  /** 名称 */
  name: string;
  /** 入口 URL（同画像 sourceUrl） */
  sourceUrl: string;
  /** 根节点（起始画面） */
  root: AgentStateNode;
  /** 全部节点 */
  nodes: AgentStateNode[];
  /** 全部边 */
  edges: AgentStateEdge[];
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/** 状态树存储接口 */
export interface StateTreeStore {
  save(tree: AgentStateTree): Promise<void>;
  get(id: string): Promise<AgentStateTree | undefined>;
  getByProfile(profileId: string): Promise<AgentStateTree | undefined>;
  listAll(): Promise<AgentStateTree[]>;
  remove(id: string): Promise<void>;
}

/**
 * 状态树构建/探索器：基于画像能力向状态树登记「动作 → 关键态」转移。
 * 本地 AI 实测一条转移后调用 addTransition 固化；重复登记同边会累计 verified，
 * 支撑「第 1 次静默实测、第 2 次沉淀」的复用哲学向状态树维度延伸。
 */
export class AgentStateExplorer {
  readonly tree: AgentStateTree;
  /** 已登记关键态名 → 节点，用于去重收敛分支 */
  private nodeByDetector = new Map<string, AgentStateNode>();
  /** 邻接表：父节点 id → 边列表 */
  private outByNode = new Map<string, AgentStateEdge[]>();

  constructor(profile: GameProfile) {
    const now = Date.now();
    const root: AgentStateNode = {
      id: "root",
      name: "start",
      desc: `${profile.name} 起始画面`,
      depth: 0,
      isGoal: false,
    };
    this.tree = {
      id: profile.projectKey,
      profileId: profile.projectKey,
      name: `${profile.name} 状态树`,
      sourceUrl: profile.sourceUrl,
      root,
      nodes: [root],
      edges: [],
      createdAt: now,
      updatedAt: now,
    };
    this.nodeByDetector.set("start", root);
  }

  /**
   * 登记一条已实测的转移：在 `fromNodeId` 执行 `action` 后到达关键态 `detector`。
   * - 复用节点：同关键态复用节点，边指向它（形成分支收敛，避免无限增长）；
   * - 去重边：同父节点 + 同动作语义的边只保留一条并累计 verified；
   * - 目标态：detector 名命中 isGoalState 判为叶终点。
   */
  addTransition(opts: {
    fromNodeId: string;
    /** 触发动作（画像语义动作） */
    action: SemanticAction;
    /** 动作语义标签 */
    label: string;
    /** 动作后到达的关键态判定 */
    detector: ProfileStateDetector;
  }): { from: AgentStateNode; to: AgentStateNode } {
    const from = this.tree.nodes.find((n) => n.id === opts.fromNodeId);
    if (!from) throw new Error(`unknown node: ${opts.fromNodeId}`);

    // 同关键态复用节点
    let to = this.nodeByDetector.get(opts.detector.name);
    if (!to) {
      to = {
        id: `state_${this.tree.nodes.length}`,
        name: opts.detector.name,
        detectorName: opts.detector.name,
        desc: `关键态 ${opts.detector.name}`,
        isGoal: isGoalState(opts.detector.name),
        depth: from.depth + 1,
      };
      this.tree.nodes.push(to);
      this.nodeByDetector.set(opts.detector.name, to);
    }

    // 去重边：同 from 名 + 同 detector 名
    const edgeKey = `${from.name}->${opts.detector.name}`;
    const exist = this.tree.edges.find((e) => e.id === edgeKey);
    if (exist) {
      exist.verified += 1;
      // 复用已存在的动作语义，避免覆盖首次登记的更优标签
    } else {
      this.tree.edges.push({
        id: edgeKey,
        action: opts.action,
        label: opts.label,
        to: to.id,
        verified: 1,
      });
    }
    // 更新邻接表
    const list = this.outByNode.get(from.id) ?? [];
    if (!list.some((e) => e.id === edgeKey)) {
      list.push({ id: edgeKey, action: opts.action, label: opts.label, to: to.id, verified: 1 });
      this.outByNode.set(from.id, list);
    }
    this.tree.updatedAt = Date.now();
    return { from, to };
  }

  /** 取某节点出边 */
  outEdges(nodeId: string): AgentStateEdge[] {
    return this.outByNode.get(nodeId) ?? [];
  }

  /** 找所有能到达目标态的路径（DFS，不进入环） */
  findPathsToGoal(): StateTreePath[] {
    const paths: StateTreePath[] = [];
    const walked = new Set<string>();
    const walk = (nodeId: string, accNodes: AgentStateNode[], accSteps: SemanticAction[]) => {
      if (walked.has(nodeId)) return; // 防环
      walked.add(nodeId);
      const node = this.tree.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const nodes = [...accNodes, node];
      if (node.isGoal) {
        paths.push({ goalNodeId: node.id, nodes, steps: [...accSteps] });
        walked.delete(nodeId);
        return;
      }
      for (const e of this.outEdges(nodeId)) {
        walk(e.to, nodes, [...accSteps, e.action]);
      }
      walked.delete(nodeId);
    };
    walk(this.tree.root.id, [], []);
    return paths;
  }

  /** 由根到指定节点的路径（深度优先） */
  findPathTo(nodeId: string): StateTreePath | undefined {
    return this.findPathDfs(this.tree.root.id, nodeId);
  }

  /** 首条到目标态的路径 */
  firstGoalPath(): StateTreePath | undefined {
    return this.findPathsToGoal()[0];
  }

  private findPathDfs(curId: string, target: string): StateTreePath | undefined {
    const stack: { nodeId: string; nodes: AgentStateNode[]; steps: SemanticAction[] }[] = [
      { nodeId: curId, nodes: [], steps: [] },
    ];
    const visited = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (visited.has(cur.nodeId)) continue;
      visited.add(cur.nodeId);
      const node = this.tree.nodes.find((n) => n.id === cur.nodeId);
      if (!node) continue;
      const nodes = [...cur.nodes, node];
      if (cur.nodeId === target) return { goalNodeId: target, nodes, steps: cur.steps };
      for (const e of [...this.outEdges(cur.nodeId)].reverse()) {
        stack.push({ nodeId: e.to, nodes, steps: [...cur.steps, e.action] });
      }
    }
    return undefined;
  }

  /** 展开根 → 首个目标态的可执行语义动作序列，供回放器按序驱动 */
  toReplaySteps(): SemanticAction[] {
    const first = this.firstGoalPath();
    return first ? first.steps : [];
  }
}

/** 判断某关键态名是否为「目标态」（叶终点） */
export function isGoalState(name: string): boolean {
  return /victory|win|clear|goal|success|complete|pass|通关|胜利|结算|达标|完成/i.test(name);
}

/** 从既有树重建探察器（用于从 store 加载后继续遍历/登记） */
export function rebuildExplorer(tree: AgentStateTree, profile: GameProfile): AgentStateExplorer {
  const ex = new AgentStateExplorer(profile);
  // 用注入方式覆写树与邻接表
  Object.assign(ex, { tree, outByNode: indexOutByNode(tree), nodeByDetector: indexNodeByDetector(tree) });
  return ex;
}

/** 重建 outByNode 邻接表 */
function indexOutByNode(tree: AgentStateTree): Map<string, AgentStateEdge[]> {
  const m = new Map<string, AgentStateEdge[]>();
  for (const e of tree.edges) {
    const parent = e.id.split("->")[0];
    const list = m.get(parent) ?? [];
    // 通过 from 节点 id 定位父节点（id 可能不是名字，需用节点 name 匹配）
    list.push(e);
    m.set(parent, list);
  }
  // 上面的父 key 用的是节点名(edge.id 前半是 name)，需按 name→id 重映射
  const byNode = new Map<string, AgentStateEdge[]>();
  for (const n of tree.nodes) {
    const edges = tree.edges.filter((e) => e.id.startsWith(`${n.name}->`));
    if (edges.length) byNode.set(n.id, edges);
  }
  return byNode;
}

/** 重建 nodeByDetector（detector name → node） */
function indexNodeByDetector(tree: AgentStateTree): Map<string, AgentStateNode> {
  const m = new Map<string, AgentStateNode>();
  for (const n of tree.nodes) {
    if (n.detectorName) m.set(n.detectorName, n);
    else m.set(n.name, n); // root: name=start
  }
  return m;
}
