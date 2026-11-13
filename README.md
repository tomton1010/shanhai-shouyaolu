# 《山海收妖录》

一款以《山海经》异兽收服为题材、加上每日同种子挑战的 2D 网页幸存者游戏。打开网页就能玩：走位躲妖，灵宠自动开火；用五行相生拼流派，把异兽打残再收服；每天全服同一道「今日异兆」。

本仓库先放设计文档和给 AI 编程助手用的任务清单，代码按 `TASKS.md` 逐步实现。

## 给 Agent 的入口

请先读这些文件，再动手：

1. [AGENTS.md](./AGENTS.md) — 工作方式和硬性约束
2. [TASKS.md](./TASKS.md) — 当前任务和完成标准
3. [DESIGN.md](./DESIGN.md) — 完整游戏设计文档（只读与当前任务相关的章节）

每次只做 `TASKS.md` 里标记为 **进行中** 的那一条，做完即停，不要开始下一条。

第一条可直接粘贴的任务说明：[prompts/T1.1.md](./prompts/T1.1.md)

## 技术栈（已定）

- 前端：Phaser 3 + TypeScript + Vite，浏览器打开即可玩，桌面优先，兼容手机横屏
- 全程只做 2D 俯视角；2.5D / Three.js 不在 MVP 范围
- 后端（从任务 4.x 才开始）：Spring Boot，每日种子、runToken、排行榜
- 美术：写实暗黑像素风，前期可用色块或 [Kenney](https://kenney.nl/assets) 占位

## 本地运行

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

浏览器打开终端里的地址，默认 [http://localhost:5173](http://localhost:5173)。游戏分辨率 1280×720。

- 移动：`W` `A` `S` `D` 或方向键。斜向速度与直线相同。
- 冲刺：`空格`。沿当前移动方向做一次短位移；没有按方向键时，沿上次朝向（开局朝上）。冲刺开始后进入冷却，冷却结束前再按空格不会冲刺。按住空格不会连续冲刺，松开后再按才算下一次。

速度、冲刺距离和冷却写在 `src/game/constants.ts`。`npm run build` 会做类型检查并产出 `dist/`。

## 手机

合并进 `main` 并且打开 Pages 之后，手机打开 [https://tomton1010.github.io/shanhai-shouyaolu/](https://tomton1010.github.io/shanhai-shouyaolu/)。竖屏横屏都能看到完整的 1280×720 画面，竖屏会提示「横屏体验更好」。

触控（手机上才出现，桌面仍用键盘）：

- 按住屏幕左半边，手指落下的位置出现摇杆，拖动走位，松开消失。可以和冲刺同时按。
- 右下角按钮冲刺，规则和空格一样：有冷却，按住不会连冲，松开后再按才算下一次。

部署只在推到 `main` 时跑。仓库所有者要先打开 GitHub 的 Settings → Pages → Build and deployment，把 Source 设为 GitHub Actions。工作流不能自己改这个开关，所以要等 PR 合并后页面才会上线。

## 文档来源

设计文档整理自：[《山海收妖录》游戏设计文档](https://cursor.com/canvas/store-6e720c58-c1da-467a-b128-c58d1b1fe7cb/666d1aba-2839-41f4-8a18-633ffe1021f6)
