/**
 * 角色状态树 JSON 落盘存储（StateTreeStore）
 *
 * 复用 JsonProfileStore 的「JSON 落盘、跨会话留存」范式：
 * - 每棵树一个 <id>.json，按目录持久化；
 * - 提供按画像检索，支撑「同一画像下次直接沿状态树探索」。
 */
import fs from "node:fs";
import path from "node:path";
import type { AgentStateTree, StateTreeStore } from "./state-tree.js";

/** JSON 落盘状态树存储 */
export class JsonStateTreeStore implements StateTreeStore {
  private dir: string;
  private cache = new Map<string, AgentStateTree>();

  constructor(dir: string) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
    this.loadAll();
  }

  async save(t: AgentStateTree): Promise<void> {
    const file = path.join(this.dir, `${t.id}.json`);
    fs.writeFileSync(file, JSON.stringify(t, null, 2), "utf-8");
    this.cache.set(t.id, t);
  }

  async get(id: string): Promise<AgentStateTree | undefined> {
    return this.cache.get(id);
  }

  async getByProfile(profileId: string): Promise<AgentStateTree | undefined> {
    return [...this.cache.values()].find((t) => t.profileId === profileId);
  }

  async listAll(): Promise<AgentStateTree[]> {
    return [...this.cache.values()];
  }

  async remove(id: string): Promise<void> {
    const file = path.join(this.dir, `${id}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    this.cache.delete(id);
  }

  private loadAll(): void {
    if (!fs.existsSync(this.dir)) return;
    for (const f of fs.readdirSync(this.dir)) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = fs.readFileSync(path.join(this.dir, f), "utf-8");
        const t = JSON.parse(raw) as AgentStateTree;
        this.cache.set(t.id, t);
      } catch {
        // 跳过损坏文件
      }
    }
  }
}
