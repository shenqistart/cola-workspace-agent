# Cola Workspace Agent

Cola Workspace Agent 是一个基于 React + TypeScript 的 AI 可视化工作区演示项目。Mock Agent 会把自然语言需求转换为结构化 UI Patch，前端负责校验、应用、流式展示、提交、回滚并记录这些 Patch。

本项目中的 **Workspace** 指可视化编辑工作区。项目使用 React Flow + DOM + SVG 实现画布式交互，不以浏览器 HTML Canvas API 作为主渲染层。

## 技术栈

- React, TypeScript, Vite
- React Flow / xyflow：节点、连线、拖拽、缩放、平移、MiniMap 和 Controls
- Zustand + Immer：状态管理与不可变事务更新
- Tailwind CSS v4：界面样式
- Vitest：Patch 协议、冲突处理和历史记录测试

## 运行方式

使用 pnpm：

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

使用 npm：

```bash
npm install
npm run dev
npm run build
npm test
```

## 演示路径

在左侧 Chat Panel 中依次输入这些指令：

```txt
帮我画一个用户注册的流程图，包含邮箱验证和手机验证两条路径
把手机验证那条路径加一个短信发送失败的重试逻辑
把邮箱验证路径加一个验证码过期判断
测试失败回滚
```

推荐面试演示流程：

1. 生成用户注册流程图。
2. 手动拖拽 `手机验证` 节点到自定义位置。
3. 继续要求 Agent 增加短信发送失败重试逻辑。
4. 确认只有手机验证分支发生局部变化，并且被拖拽过的节点位置保持不变。
5. 使用 Header 中的 Undo / Redo 验证撤销与重做。

## 架构亮点

- `src/types` 定义标准化工作区状态和历史记录类型。
- `src/agent/patchProtocol.ts` 定义 Agent Patch Protocol。
- `src/agent/patchValidator.ts` 在应用 Patch 前校验 id、anchor 和 edge 端点。
- `src/agent/patchApplier.ts` 应用 Patch operation，并执行用户手动布局保护。
- `src/store/useCanvasStore.ts` 协调乐观更新、失败回滚、撤销、重做、消息和时间线。
- `src/components` 渲染 Chat Panel、React Flow Workspace、Inspector、Timeline 和 Patch Preview。

## 设计文档

- [交互设计文档](docs/interaction-design.md)
- [架构设计说明](docs/design-notes.md)

## Agent Patch Protocol

Agent 不直接返回 React 组件，也不返回整页替换结果。Agent 只返回包含 operation 的 `AgentPatch`：

- `createBlock`
- `updateBlock`
- `deleteBlock`
- `createEdge`
- `deleteEdge`
- `moveBlock`
- `insertAfter`
- `batch`

前端负责 Patch 校验、应用、冲突处理、事务历史和最终渲染。

## 冲突处理

用户手动布局默认会被保护。当用户拖拽节点时：

- 节点的 `positionSource` 会变为 `user`
- 节点位置会写入 `manualLayoutMap`
- 一条用户事务会被加入历史记录

如果后续 Agent Patch 试图更新该节点位置，Patch Applier 会保留用户位置，除非 operation 明确设置 `preserveUserLayout: false` 或 `forceMove: true`。

## 增量更新

Mock Agent 使用稳定 id、`semanticId`、`branchKey` 和 `anchorId` 定位内容。后续指令通过 `insertAfter` 和定向 edge 替换扩展分支，因此可以只更新手机验证或邮箱验证分支，而不清空或重建整张图。

## 乐观更新与回滚

Patch 应用流程如下：

```txt
保存 before snapshot
创建 pending transaction
设置 agent.status = applying
逐条乐观应用 operations
成功后提交 transaction 和 patch log
失败时恢复 before snapshot 并标记 failed
```

当前流式效果刻意保持稳定：operation 会逐条应用，新节点逐个出现，新增边使用 animated 高亮路径，Timeline 会展示正在执行和已提交的 operation 明细。

## CRDT 多人协作扩展方向

当前标准化模型可以继续演进为多人协作编辑系统。核心方向是把每个 Patch operation 视为可兼容 CRDT 的命令：

- 为 operation 分配 Lamport 时间戳或混合逻辑时钟
- 保持稳定的 block id 和 semantic id
- 对独立 block 更新做字段级合并
- 将 manual layout 作为用户拥有的 register，并要求显式覆盖意图
- 广播已提交 transaction，而不是广播完整 snapshot

这样可以让 Agent Patch、用户拖拽、撤销 / 重做和未来远端协作编辑都建立在同一套 operation log 基础上。
