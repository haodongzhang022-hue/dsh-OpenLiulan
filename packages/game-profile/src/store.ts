/**
 * 游戏画像 JSON 落盘存储（ProfileStore）
 *
 * 复用 JsonScriptStore 的「JSON 落盘、跨会话留存」范式：
 * - 每份画像一个 <id>.json，按目录持久化；
 * - 提供按项目 / 页面 key 检索，支撑「同画像下次直接调用」。
 */
import fs from "node:fs";
import path from "node:path";
import type { GameProfile, GameProfileStore } from "./model.js";

/** JSON 落盘游戏画像存储 */
export class JsonProfileStore implements GameProfileStore {
  private dir: string;
  private cache = new Map<string, GameProfile>();

  constructor(dir: string) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
    this.loadAll();
  }

  async save(p: GameProfile): Promise<void> {
    const file = path.join(this.dir, `${p.id}.json`);
    fs.writeFileSync(file, JSON.stringify(p, null, 2), "utf-8");
    this.cache.set(p.id, p);
  }

  async get(id: string): Promise<GameProfile | undefined> {
    return this.cache.get(id);
  }

  async getByPageKey(pageKey: string): Promise<GameProfile | undefined> {
    return [...this.cache.values()].find((p) => p.pageKey === pageKey);
  }

  async listAll(): Promise<GameProfile[]> {
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
        const p = JSON.parse(raw) as GameProfile;
        this.cache.set(p.id, p);
      } catch {
        // 跳过损坏文件
      }
    }
  }
}
