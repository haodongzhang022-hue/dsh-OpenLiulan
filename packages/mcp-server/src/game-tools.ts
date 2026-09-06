/**
 * 游戏画像级控制工具集（ISSUE #29 S4 — MCP 接入层）
 *
 * 把 S1..S4 沉淀的「每画像一端口/一连接」能力通过 MCP 暴露给本地 AI：
 * 本地 AI 不再每次下指令去定位坐标，而是**按游戏项目端口**直接驱动已沉淀的
 * 画像/状态树资产——这是 ISSUE 里「本地工具可直接与它交互」的落点。
 *
 * 工具语义：
 * - game_bind     按入口 URL 绑定/复用某游戏项目的画像会话（每项目一端口）
 * - game_record   把真实做过的坐标点击/按键按住喂给该画像录制器（达阈值进草稿）
 * - game_settle   确认把待落库草稿落库成画像能力（沉淀确认）
 * - game_transition 登记一条实测「动作 → 关键态」转移到该画像状态树
 * - game_plan     沿该画像状态树规划到目标态的动作序列（回放驱动）
 * - game_act      按画像语义动作驱动真实浏览器（含坐标视口漂移校验）
 * - game_list     列出已沉淀的游戏画像资产（复用计数/端口）
 *
 * 存储：画像/状态树 JSON 落盘于 gameStoreDir（跨会话留存），
 * 使「同一个游戏项目 → 同一个沉淀」真正可用。
 */
import type { McpToolSchema } from "./tools.js";

/** 游戏画像工具的 JSON Schema 定义（本地 AI function calling 用） */
export const GAME_TOOLS: McpToolSchema[] = [
  {
    name: "game_bind",
    description:
      "按入口 URL 绑定/复用某个 Canvas/WebGL 游戏项目的画像会话。每游戏项目一个端口；同项目再次 bind 命中已有沉淀复用（created=false）。首次会新建画像骨架。",
    inputSchema: {
      type: "object",
      properties: {
        projectKey: { type: "string", description: "游戏项目 key（如 cocos-demo），决定端口名" },
        name: { type: "string", description: "画像名称（人类可读）" },
        sourceUrl: { type: "string", description: "游戏入口 URL（用于页面归一化归类）" },
        width: { type: "number", description: "视口基线宽度（Canvas 坐标漂移校验用）" },
        height: { type: "number", description: "视口基线高度" },
      },
      required: ["projectKey", "sourceUrl"],
    },
  },
  {
    name: "game_record",
    description:
      "把本地/浏览器实际执行成功的一个坐标点击或按键按住动作喂给该游戏画像的录制器。同一能力项出现达到阈值后进入『待落库草稿』（静默不打扰），待 game_settle 确认落库。",
    inputSchema: {
      type: "object",
      properties: {
        projectKey: { type: "string", description: "游戏项目 key" },
        type: { type: "string", enum: ["clickAt", "keyHold", "keyDown"], description: "动作类型（仅参与画像沉淀的动作）" },
        x: { type: "number", description: "clickAt 的视口 x 坐标" },
        y: { type: "number", description: "clickAt 的视口 y 坐标" },
        key: { type: "string", description: "keyHold/keyDown 的物理键（如 Space/KeyW）" },
        ms: { type: "number", description: "keyHold 按住时长" },
        desc: { type: "string", description: "动作说明" },
      },
      required: ["projectKey", "type"],
    },
  },
  {
    name: "game_settle",
    description:
      "确认把某游戏画像的『待落库草稿』落库成画像能力（坐标锚点/按键映射）。index 指定单条草稿（默认全量）。落库后同画像能力可零定位复用。",
    inputSchema: {
      type: "object",
      properties: {
        projectKey: { type: "string" },
        index: { type: "number", description: "指定落库第几条草稿（默认 -1 = 全量）" },
      },
      required: ["projectKey"],
    },
  },
  {
    name: "game_plan",
    description:
      "沿该游戏画像的『角色状态树』规划到首个目标态（通关/结算/达标）的动作序列。返回可执行动作步骤列表，本地 AI 可据此驱动真实游戏页，重复探索无需重新定位。",
    inputSchema: {
      type: "object",
      properties: {
        projectKey: { type: "string" },
      },
      required: ["projectKey"],
    },
  },
  {
    name: "game_transition",
    description:
      "登记一条实测状态转移到该游戏画像的『角色状态树』：在 from 节点态执行某动作后到达某关键态画面（victory/通关/inventory 等）。登记后可用 game_plan 沿树规划到目标态，重复探索直接复用，无需每次下指令定位。",
    inputSchema: {
      type: "object",
      properties: {
        projectKey: { type: "string" },
        fromNodeId: { type: "string", description: "起始节点：节点 id / 语义名 / 关键态名（如 root、start、inventory）。缺省从 root 出发" },
        action: {
          type: "object",
          description: "触发动作（语义动作：key 按键 / clickAt 坐标 / seq 复合）",
          properties: {
            kind: { type: "string", enum: ["key", "clickAt", "seq"] },
            key: { type: "string" },
            ms: { type: "number" },
            x: { type: "number" },
            y: { type: "number" },
            steps: { type: "array", description: "seq 时的子动作" },
          },
          required: ["kind"],
        },
        label: { type: "string", description: "动作语义标签（如 jump / attack）" },
        detectorName: { type: "string", description: "动作后到达的关键态语义名（如 victory / inventory / 通关）" },
        detectorKind: { type: "string", enum: ["pixel", "url"], description: "关键态判定方式" },
        x: { type: "number", description: "detectorKind=pixel 时的像素 x" },
        y: { type: "number", description: "detectorKind=pixel 时的像素 y" },
        r: { type: "number" },
        g: { type: "number" },
        b: { type: "number" },
        fragment: { type: "string", description: "detectorKind=url 时的 URL 片段" },
      },
      required: ["projectKey", "action", "detectorName"],
    },
  },
  {
    name: "game_act",
    description:
      "按该游戏画像的语义动作驱动真实浏览器执行（key 按键 / clickAt 坐标点击）。执行前自动校验当前视口与画像基线一致，规避 Canvas 坐标漂移；成功后自动计入画像复用收益。",
    inputSchema: {
      type: "object",
      properties: {
        projectKey: { type: "string" },
        kind: { type: "string", enum: ["key", "clickAt"], description: "语义动作类型" },
        key: { type: "string", description: "kind=key 时的物理键" },
        ms: { type: "number", description: "kind=key 按住时长" },
        x: { type: "number", description: "kind=clickAt 的 x" },
        y: { type: "number", description: "kind=clickAt 的 y" },
      },
      required: ["projectKey", "kind"],
    },
  },
  {
    name: "game_list",
    description: "列出当前所有已沉淀的游戏画像资产：项目、端口、复用计数、待落库草稿数。",
    inputSchema: { type: "object", properties: {} },
  },
];

/** 各游戏工具的注册名（供 ForgeMcp.dispatch 分流） */
export const GAME_TOOL_NAMES = GAME_TOOLS.map((t) => t.name);
