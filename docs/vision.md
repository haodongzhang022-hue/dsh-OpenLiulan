# dsh-OpenLiulan 视觉桥（Vision Bridge）使用与部署手册

> 版本：v1.3.0（特性分支 `feat/vision-modlens`）· 2026-08-30
> 涉及代码：`packages/vision`（新包）、`packages/mcp-server`（`vision` 工具）、`packages/engines`（截图加固）
> 归属：视觉引擎来自开源项目 [liustack/modlens](https://github.com/liustack/modlens)（MIT），详见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。

---

## 1. 为什么需要它（成本设计）

DeepSeek Harness 等多模态平台虽然原生支持视觉，但**视觉调用额外计费**，而纯文本调用可高频触发、成本极低。
本增强的目标：**默认用「纯文本 + 浏览器 + 便宜视觉引擎」把活干完；只有当三者结合仍解决不了时，才升级到模型原生视觉**。

为此定义了三级成本阶梯，且把策略文本直接写进工具描述，模型看到描述就知道怎么选：

| 层 | 工具 | 成本 | 用途 |
| :-- | :-- | :-- | :-- |
| L0 | `observe` / `act extract` / `act evaluate` | 零 | DOM/文本可回答的一切（元素、文本、属性、状态） |
| L1 | `vision` | 低 | 视觉类问题：布局/颜色/可见性/重叠/图表/图片/Canvas/弹窗外观 |
| L2 | `screenshot` | 高 | 仅多模态模型：精细像素级比对（L0+L1 都失败后） |

> 纯文本模型永远不要消费 L2 的原生图片（看不见也白花钱）；对应提示已写进 `screenshot` 工具描述。

## 2. `vision` 工具用法

参数：`focus`（关注点，可选）、`fullPage`（整页截图，默认视口）、`savePath`（截图 PNG 绝对路径，默认系统临时目录）。

返回纯文本 markdown 证据，包含：
- 引擎来源（provider/model/耗时）与截图文件路径（可再交给 L2 阶段引用）
- **总结**：一句话页面概述
- **OCR 全文**：页面所有可见文字
- **布局区域（阅读顺序）**：title/banner/button/chart/... 每个区域做什么
- **语义**：场景 + 实体（名称/类型/证据）
- **视觉**：主色调（含色值）、风格、备注
- **不确定项**：引擎自己都拿不准的部分（引用证据时注意）
- **升级路径**：证据不足时的下一步提示

## 3. 引擎与配置

### 3.1 主引擎：modlens（默认）

```bash
# 安装（引擎包与 DSH 插件二选一即可）
dsh plugin --profile web add liustack/modlens        # 推荐：DSH web profile 安装
# 或手动：npm i -g @liustack/modlens

# 配置视觉供应商（首次必需）
node <modlens>/dist/main.js doctor                   # 查看各供应商状态
node <modlens>/dist/main.js config set gemini-api.apiKey   # 免费 key：https://aistudio.google.com
node <modlens>/dist/main.js config set reuse.opencode true # 或复用本机 opencode 登录（本机实测通路）
```

引擎查找顺序：环境变量 `MODLENS_CLI_PATH`（指向 `dist/main.js`）→ 依赖树 `require.resolve("@liustack/modlens")` → 找不到则给出安装指引并进入回退通道。
MCP 侧也可通过插件配置显式指定：`vision.cliPath`、`vision.timeoutMs`（默认 180s）。

### 3.2 回退通道：opencode 直连（L1 次级）

当 modlens 引擎缺失、或其选中供应商欠费（如本机曾遇到 opencode.ai 网关 `Insufficient balance`）时，
自动尝试本机 opencode CLI：

```bash
opencode run <prompt> -m <model> --format json -f <截图.png>
```

- 二进制定位：`OPENCODE_BIN` 环境变量 → PATH 上的 `.exe` → npm 全局 `.cmd` 壳自动解壳（`opencode-ai/bin/opencode.exe`）
- 默认模型清单（按机器实测优先，可配 `vision.opencodeModels` 覆盖）：
  1. `opencode-go/deepseek-v4-flash-vision-exp`（本机实测可用，成本低）
  2. `github-copilot/claude-haiku-4`（GitHub Copilot 登录）
  3. `deepseek/deepseek-v4-flash-vision-exp`（用户自己的 DeepSeek 视觉配额）
- 欠费/不支持的模型自动跳过，不把用户的付费通道当默认

### 3.3 L2 模型原生视觉（最后手段）

`screenshot { fullPage?: boolean }`：仅当 L0+L1 均不足以判断、且当前模型支持图片输入时使用。
`vision` 返回的 `imagePath` 可直接供 L2 阶段引用同一张截图。

## 4. 沙盒 AB 部署（重要：不直接改生产）

> 原则：**先沙盒 A1 验证构建与冒烟 → 再 A2 完整 profile 验证 → 最后才动生产装配**。生产 profile（dsh-home/profiles/web）在本特性开发期间零改动。

### A1：隔离构建 + MCP 冒烟（已完成）

```powershell
# 1) 沙盒构建（不碰 packages/*/dist，生产输入不变）
Push-Location E:\1shuju\1gitgengxin\liulanzengqiang
.\node_modules\.bin\tsc.cmd -p packages/vision/tsconfig.json --outDir .sandbox-build/vision
.\node_modules\.bin\tsc.cmd -p packages/engines/tsconfig.json --outDir .sandbox-build/engines
.\node_modules\.bin\tsc.cmd -p packages/mcp-server/tsconfig.json --outDir .sandbox-build/mcp-server
# 沙盒内联覆盖（只替换这两个包，其余沿用仓库 dist）：
#   .sandbox-build/node_modules/@openliulan/{engines,vision} → junction 指向沙盒构建
Pop-Location

# 2) 冒烟（MCP stdio 客户端）：initialize → tools/list → navigate(file://) → observe(L0) → vision(L1) → close
node mcp-smoke-ai.mjs
```

**A1 实测结果（2026-08-30）**：
- `tools/list` 出现 `vision` 工具
- L0 `observe` 返回 DOM 可交互快照（含 ref）
- L1 `vision` 返回真实证据：OCR 全文、布局区域阅读顺序、语义实体、主色调（如红 #b02a24 / 绿 #2e8b57）、不确定项
- modlens 引擎未配置时自动回退 opencode 直连（provider=opencode-cli:opencode-go/deepseek-v4-flash-vision-exp）
- 前置截图失败自动重试一次（字体缓存/渲染器温机）

### A2：沙盒 DSH profile 全量验证（待做）

在沙盒 DSH（如 dsh-sandbox-A1/A2 的 dsh-home）的 profile patch 中把 openliulan-mcp 指向沙盒构建的 cli.js：

```yaml
# <sandbox dsh-home>/profiles/<profile>/cordis.patch.yml 追加/替换
- insert:
    - id: openliulan-mcp-v3
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: openliulan
        transport: stdio
        command: 'E:/1shuju/tools/node/node.exe'
        args: ['E:/1shuju/1gitgengxin/liulanzengqiang/.sandbox-build/mcp-server/cli.js', '--stdio']
        cwd: 'E:/1shuju/1gitgengxin/liulanzengqiang'
        env:
          PATH: 'E:/1shuju/tools/node;C:/Windows/System32'
        failOnStartupError: true
        toolCallTimeoutMs: 120000
```

启动沙盒 DSH 验证：工具出现、L0/L1 冒烟、原有 observe/act/diagnose 无回归。

### 生产上线（只有用户批准后才执行）

1. 在 `feat/vision-modlens` 分支：`npm run build` 重建 `packages/*/dist`（生产 file: 链接的输入）
2. `npm run build:plugin` 重建 `lib/index.js`（插件包装配输入）
3. 重启生产 dsh web（或热重载 MCP：重挂 openliulan-mcp 条目），用冒烟复验
4. 若出问题：回滚 = 把生产 profile 的 mcp-server 指向旧 dist（git 历史中取回）

## 5. 故障排查

| 现象 | 原因 | 处理 |
| :-- | :-- | :-- |
| vision 返回「未找到 modlens 视觉引擎」 | 引擎包未安装 | `dsh plugin --profile web add liustack/modlens` 或设 `MODLENS_CLI_PATH` |
| modlens 报 opencode-cli provider failed code 1 | opencode.ai 网关欠费或模型不支持 | 给 modlens 配 gemini-api 免费 key；或依赖内置 opencode 回退（无需处理） |
| opencode 未找到 | opencode 未安装 | `npm i -g opencode-ai` 并登录一次；或 `OPENCODE_BIN` 指向 exe |
| 回退模型全部不可用 | 各通道欠费/不支持 | `opencode auth list` / `opencode models` 检查，配置 `vision.opencodeModels` |
| 截图偶发超时（waiting for fonts） | 首次字体缓存/渲染器温机 | 已内置：截图 `animations:disabled` + 失败自动重试 1 次；仍失败检查系统字体服务 |
| Windows 下 spawn opencode EINVAL | 直接 spawn 了 .cmd 壳 | 已内置解壳（读壳内真实 opencode-ai/bin/opencode.exe）；仍失败用 `OPENCODE_BIN` 显式指定 |

## 6. 证据样例（A1 实测节选）

fixture 页调用 vision 关注「警报栏与图表柱子的颜色和布局」，输出关键段：

> **总结**: 一个包含警告横幅、重试按钮和柱状图的浏览器冒烟测试页
> **OCR 全文**: Vision Fixture 冒烟测试页 / ⚠ 警报：数据库连接中断 / 立即重试 / …
> **布局区域**: 1[title] 顶部居左标题 … 2[banner] 红色警报栏白字 … 3[button] 绿色按钮 … 4[chart] 三根竖向柱子
> **主色调**: #b02a24 红 · #2e8b57 绿 · #ee7c1f 橙 · #2b7de0 蓝 · #8b4fbf 紫
> **不确定项**: 柱状图无坐标轴刻度，无法判断具体数值
