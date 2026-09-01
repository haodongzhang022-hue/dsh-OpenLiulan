# 第三方开源组件声明（THIRD-PARTY NOTICES）

dsh-OpenLiulan 为 MIT 协议开源项目。本项目引用了下列第三方开源项目，特此声明归属与许可。使用时请遵守各自许可证条款。

## @liustack/modlens（可选，视觉引擎 L1）

- **项目**：[liustack/modlens](https://github.com/liustack/modlens)（npm 包 `@liustack/modlens`）
- **用途**：浏览器视觉桥（`vision` 工具）的默认视觉引擎——截图 → OCR 全文 + 布局区域 + 语义场景 + 不确定项，让纯文本模型获得可消费的「视觉」文本证据。
- **许可证**：MIT License
- **引用方式**：源码 `packages/vision/src/engine.ts` 通过其官方 CLI（`dist/main.js`）弱耦合调用；工具描述、错误提示与文档中均注明出处。
- **安装**（可选，引擎缺失时 `vision` 自动给出指引并回退到 opencode 直连通道）：

  ```bash
  dsh plugin --profile web add liustack/modlens
  # 或手动安装后配置视觉供应商:
  # node <modlens>/dist/main.js doctor        # 查看供应商状态
  # node <modlens>/dist/main.js config set gemini-api.apiKey    # 免费 key: https://aistudio.google.com
  # node <modlens>/dist/main.js config set reuse.opencode true  # 或复用本机 opencode 登录
  ```

### MIT License（liustack/modlens）

```text
MIT License

Copyright (c) 2026 liustack

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

> 版权文本以项目仓库内 LICENSE 文件为准；如需完整文本可从 https://github.com/liustack/modlens 获取。

## opencode（可选，视觉引擎 L1 回退通道）

- **项目**：[opencode](https://opencode.ai)（本项目仅调用其已安装 CLI：`opencode run ... --format json`，复用其登录与配额）
- **用途**：当 modlens 引擎未安装或其选中供应商欠费/不可用时的直连回退（`packages/vision/src/opencode.ts`），使 `vision` 工具在本机无额外配置时也能给出文本证据。
- **许可证**：Apache-2.0（以 opencode 项目自身声明为准）

## playwright（核心依赖）

- **项目**：[microsoft/playwright](https://github.com/microsoft/playwright)
- **用途**：浏览器启动、页面控制、截图等底层自动化。
- **许可证**：Apache-2.0（完整文本见 npm 包内 LICENSE 或 https://github.com/microsoft/playwright）

---

*本文件与 DEPENDENCIES.md / docs/vision.md 共同构成 dsh-OpenLiulan 的依赖与归属说明。*
