# Cola Workspace Agent 设计说明


## 0. 一句话总结

本项目实现的是一个 **AI 可视化工作区**，不是一个基于 HTML `<canvas>` 的绘图应用。

这里的“画布式交互”指产品体验：

> 用户可以在一个可缩放、可拖拽、可编排的空间里操作流程图、文本、代码、图表等内容块。

技术实现上，推荐选择：

```txt
React Flow + SVG + DOM
```

具体含义是：

- **React Flow** 负责拖拽、缩放、平移、节点选择、MiniMap、Controls 等工作区能力；
- **DOM / React 组件** 负责渲染复杂节点内容，例如标题、描述、状态徽章、代码块、图表卡片；
- **SVG** 负责渲染节点之间的连线、箭头、条件标签、路径动画；
- **Zustand / Redux Toolkit** 负责统一管理工作区状态、Agent 状态、历史记录和 Patch 日志；
- 如果未来支持多人协作，则将本地状态升级为 **Yjs CRDT 共享状态**。

因此，项目名称使用 **Cola Workspace Agent**，避免让人误以为主技术方案是 HTML `<canvas>`。

---

# 1. 你选择的画布渲染方案是什么？为什么？

## 1.1 先回答：这个产品有没有必要使用“画布”？

有必要，但要区分两个概念：

| 概念 | 含义 | 本项目是否需要 |
|---|---|---|
| 画布式工作区 / Workspace | 可缩放、可拖拽、可编排内容块的产品交互空间 | 需要 |
| HTML `<canvas>` | 浏览器提供的像素绘制 API | 不作为主渲染方案 |

这个项目需要的是 **Workspace**，不是一定要用 HTML `<canvas>`。

原因是：用户要在一个空间里查看流程、拖拽节点、追加 Agent 指令、局部更新分支，这类体验确实是“画布式”的；但节点内部内容、交互、状态管理和可维护性更适合用 DOM / React 组件来完成。

---

## 1.2 最终选择

推荐选择：

```txt
React Flow + SVG + DOM 混合方案
```

具体分工如下：

```txt
React Flow
  ├── 负责工作区基础能力
  │   ├── 节点拖拽
  │   ├── 缩放和平移
  │   ├── 节点选择
  │   ├── MiniMap
  │   └── Controls
  │
  ├── DOM / React 组件
  │   └── 渲染节点内部内容
  │       ├── 标题
  │       ├── 描述
  │       ├── 状态标签
  │       ├── 代码块
  │       └── 图表块
  │
  └── SVG
      └── 渲染边和箭头
          ├── 连线
          ├── 箭头
          ├── 条件标签
          └── 流式绘制动画
```

---

## 1.3 为什么不用 HTML `<canvas>` 作为主渲染层？

HTML `<canvas>` 适合高性能绘制大量图形，但不适合作为本项目的主实现。

原因是：

1. **节点内部内容会很复杂**
   流程图节点里可能有标题、描述、状态标签、按钮、代码片段、图表等。如果用 `<canvas>`，需要自己处理文字换行、点击区域、输入框、hover、selection，开发和维护成本高。

2. **交互实现成本高**
   拖拽、选中、框选、连线命中检测、右键菜单、键盘快捷键，都需要自己实现。

3. **不利于组件化和调试**
   DOM / React 组件可以天然复用 UI 组件、状态、事件和样式，而 `<canvas>` 里的内容本质上是像素绘制，调试和组件拆分更困难。

4. **不利于 Agent 局部更新表达**
   本项目的核心是 Agent 输出结构化 Patch，前端局部更新某些 block。DOM / React + React Flow 的结构化节点模型更容易和 Patch 对齐。

5. **无障碍和可测试性较弱**
   DOM 节点更容易做键盘访问、语义化、自动化测试和 Inspector 面板联动。

所以，HTML `<canvas>` 更适合大量粒子、密集图形、热力图、游戏或极大规模可视化，不适合作为这个产品的主渲染层。

---

## 1.4 那未来完全不需要 Canvas 吗？

不是。

正式产品中可以把 HTML `<canvas>` 或 WebGL 作为 **性能增强层**，但不是第一层架构。

未来可以在这些场景引入：

- 节点数量达到几千到几万个；
- 需要绘制复杂背景网格、热力图、轨迹或装饰层；
- 需要高频动画或大量图形对象；
- 需要在缩小视图下做超大规模概览。

推荐演进方式：

```txt
第一阶段：React Flow + DOM + SVG
第二阶段：对背景层、缩略图层、海量装饰层引入 Canvas / WebGL
第三阶段：保留结构化数据模型，按性能需求拆分渲染层
```

也就是说：

> 数据模型和 Agent Patch 协议不要绑定到某一种渲染技术上。
> 先把结构化工作区做好，再根据规模引入 Canvas / WebGL 优化。

---

## 1.5 为什么不用纯 SVG？

纯 SVG 适合画线、箭头、路径和简单图形，但不适合承载复杂业务节点。

原因是：

1. **复杂节点不好写**
   如果一个节点里面有富文本、按钮、代码块、状态标签，用 SVG 写会很繁琐。

2. **表单和交互不自然**
   SVG 里做输入框、菜单、滚动区域不如 DOM 自然。

3. **组件生态不如 React DOM 丰富**
   很多 UI 组件库都是基于 DOM 的。

所以，SVG 更适合负责“线”和“图形”，不适合负责全部工作区内容。

---

## 1.6 为什么不用纯 DOM？

纯 DOM 可以渲染复杂节点，但不适合处理大量连线和工作区坐标系统。

原因是：

1. **边和箭头不好处理**
   DOM 画线通常依赖绝对定位、伪元素或额外层。复杂连线、贝塞尔曲线、箭头、路径动画都会比较麻烦。

2. **缩放和平移需要自己管理**
   工作区坐标、屏幕坐标、缩放比例、拖拽偏移都需要额外设计。

3. **流程图能力需要大量基础设施**
   节点连接、边更新、MiniMap、Controls、selection 都需要自己实现。

所以，纯 DOM 更适合普通页面布局，不适合完整流程图工作区。

---

## 1.7 为什么 React Flow 适合这个项目？

React Flow 很适合这道题，因为它天然支持流程图和节点式工作区。

它能直接提供：

- 节点渲染；
- 连线渲染；
- 节点拖拽；
- 缩放和平移；
- 节点选择；
- 自定义节点；
- 自定义边；
- MiniMap；
- Controls；
- 与 React 状态管理集成。

这让我们可以把精力放在真正重要的地方：

```txt
Agent 如何输出 Patch
Patch 如何增量更新工作区
用户手动拖拽的位置如何保留
如何撤销 / 重做
如何乐观更新和回滚
如何扩展多人协作
```

---

## 1.8 渲染方案总结

| 方案 | 优点 | 缺点 | 是否适合本项目 |
|---|---|---|---|
| HTML `<canvas>` | 性能好，适合大量图形 | 复杂交互和富内容实现成本高 | 不作为主渲染层 |
| 纯 SVG | 画线和图形方便 | 复杂节点和表单不方便 | 不推荐单独使用 |
| 纯 DOM | 节点内容好写 | 连线、缩放、坐标系统复杂 | 不推荐单独使用 |
| React Flow + SVG + DOM | 工作区能力完整，节点灵活，边线自然 | 超大规模节点需要优化 | 推荐 |

最终选择：

```txt
React Flow 作为工作区框架
DOM / React 渲染节点内容
SVG 渲染边、箭头和路径动画
```

---

# 2. 状态管理的核心数据结构长什么样？

## 2.1 状态管理目标

状态管理的核心目标不是简单保存节点数组，而是支持：

1. Agent 增量更新工作区；
2. 用户拖拽后保留手动布局；
3. Patch 可以验证、应用、撤销、重做；
4. 失败时可以回滚；
5. 未来可以扩展多人协作。

所以工作区状态应该采用 **标准化结构**，而不是简单数组。

---

## 2.2 为什么用标准化 blocks map？

不推荐这样存：

```ts
const blocks = [node1, node2, node3];
```

推荐这样存：

```ts
const blocks = {
  node_start: node1,
  node_phone_verify: node2,
  node_sms_retry: node3,
};
```

原因：

1. 可以通过 `id` 快速找到节点；
2. 方便 Agent Patch 精准修改某个节点；
3. 方便判断某个节点是否被用户手动拖拽过；
4. 方便做撤销、重做和快照；
5. 方便未来接入 CRDT。

---

## 2.3 内容块基础模型

工作区中的所有内容都抽象成 `WorkspaceBlock`。

> 如果代码里沿用 `CanvasBlock` 命名，也应在 README 中说明：这里的 Canvas 指“画布式工作区”的领域概念，不代表 HTML `<canvas>`。为了降低歧义，文档中建议统一叫 `WorkspaceBlock`。

```ts
type Actor = "user" | "agent" | "system";

type BlockType =
  | "flowNode"
  | "flowEdge"
  | "textBlock"
  | "codeBlock"
  | "chartBlock";

type PositionSource = "agent" | "layout" | "user";

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface BaseBlock {
  id: string;
  type: BlockType;

  /**
   * 给 Agent 理解业务含义用。
   * 例如：register.phone.verify
   */
  semanticId?: string;

  version: number;

  createdBy: Actor;
  updatedBy: Actor;

  createdAt: number;
  updatedAt: number;

  metadata?: Record<string, unknown>;
}
```

---

## 2.4 流程图节点模型

```ts
interface FlowNodeBlock extends BaseBlock {
  type: "flowNode";

  title: string;
  description?: string;

  role:
    | "start"
    | "action"
    | "decision"
    | "success"
    | "failure"
    | "retry"
    | "end";

  position: Point;
  size: Size;

  /**
   * agent：Agent 初始生成的位置
   * layout：自动布局生成的位置
   * user：用户手动拖拽后的位置
   */
  positionSource: PositionSource;

  /**
   * 用户锁定后，Agent 默认不能移动。
   */
  layoutLocked?: boolean;

  /**
   * 用于局部更新。
   * 例如 phone / email / register。
   */
  branchKey?: string;
}
```

示例：

```ts
const phoneVerifyNode: FlowNodeBlock = {
  id: "node_phone_verify",
  semanticId: "register.phone.verify",
  type: "flowNode",
  title: "手机验证",
  description: "发送短信验证码并等待用户输入",
  role: "action",
  position: { x: 640, y: 340 },
  size: { width: 220, height: 96 },
  positionSource: "user",
  branchKey: "phone",
  version: 2,
  createdBy: "agent",
  updatedBy: "user",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

---

## 2.5 流程图连线模型

```ts
interface FlowEdgeBlock extends BaseBlock {
  type: "flowEdge";

  source: string;
  target: string;

  label?: string;
  condition?: string;
  animated?: boolean;
}
```

示例：

```ts
const retryEdge: FlowEdgeBlock = {
  id: "edge_sms_retry_to_phone_verify",
  semanticId: "register.edge.sms_retry_to_phone_verify",
  type: "flowEdge",
  source: "node_sms_retry",
  target: "node_phone_verify",
  label: "重新发送",
  condition: "retry",
  animated: true,
  version: 1,
  createdBy: "agent",
  updatedBy: "agent",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

---

## 2.6 WorkspaceState：工作区核心状态

```ts
interface ManualLayoutRecord {
  blockId: string;
  position: Point;
  size?: Size;
  updatedAt: number;
  reason: "drag" | "resize" | "lock";
}

interface WorkspaceState {
  /**
   * 所有内容块，按 id 存储。
   */
  blocks: Record<string, WorkspaceBlock>;

  /**
   * 控制渲染顺序。
   */
  blockOrder: string[];

  /**
   * 当前选中的节点或边。
   */
  selectedBlockIds: string[];

  /**
   * 记录用户手动调整过的位置。
   */
  manualLayoutMap: Record<string, ManualLayoutRecord>;

  /**
   * 每次提交成功后递增。
   */
  version: number;
}
```

---

## 2.7 AgentState：Agent 状态

```ts
type AgentStatus =
  | "idle"
  | "thinking"
  | "streaming"
  | "applying"
  | "synced"
  | "failed";

interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  createdAt: number;
}

interface AgentState {
  status: AgentStatus;

  messages: ChatMessage[];

  /**
   * Agent 基于哪个工作区版本生成 Patch。
   */
  contextVersion: number;

  lastPatchId?: string;
}
```

---

## 2.8 Patch：Agent 输出协议

Agent 不应该直接改 UI，而是输出结构化 Patch。

```ts
interface AgentPatch {
  id: string;
  description: string;

  /**
   * Agent 生成 Patch 时看到的工作区版本。
   */
  baseVersion: number;

  affectedBlockIds: string[];
  operations: PatchOperation[];
  createdAt: number;
}
```

Patch 操作示例：

```ts
type PatchOperation =
  | {
      op: "createBlock";
      block: WorkspaceBlock;
    }
  | {
      op: "updateBlock";
      id: string;
      patch: Partial<WorkspaceBlock>;
      preserveUserLayout?: boolean;
      forceMove?: boolean;
    }
  | {
      op: "moveBlock";
      id: string;
      position: Point;
      source: PositionSource;
      forceMove?: boolean;
    }
  | {
      op: "insertAfter";
      anchorId: string;
      blocks: WorkspaceBlock[];
      edges: FlowEdgeBlock[];
      layoutScope: "local" | "branch" | "global";
    }
  | {
      op: "deleteBlock";
      id: string;
    };
```

---

## 2.9 HistoryState：撤销和重做

每次用户操作或 Agent Patch 都会变成一个事务。

```ts
interface WorkspaceSnapshot {
  blocks: Record<string, WorkspaceBlock>;
  blockOrder: string[];
  manualLayoutMap: Record<string, ManualLayoutRecord>;
  version: number;
}

interface WorkspaceTransaction {
  id: string;
  source: "user" | "agent" | "system";
  label: string;

  before: WorkspaceSnapshot;
  after: WorkspaceSnapshot;

  patchId?: string;
  createdAt: number;
}

interface HistoryState {
  undoStack: WorkspaceTransaction[];
  redoStack: WorkspaceTransaction[];
}
```

这样做的好处是：

- 撤销 Agent 最近一次操作时，恢复到 `before`；
- 重做时，恢复到 `after`；
- 用户拖拽也可以被撤销；
- 失败回滚的 Patch 不会进入 undoStack。

---

## 2.10 AppState：完整状态结构

```ts
interface AppState {
  workspace: WorkspaceState;
  agent: AgentState;
  history: HistoryState;

  /**
   * 乐观更新中的事务。
   */
  pendingTransaction?: WorkspaceTransaction;

  /**
   * Agent 每次修改工作区的记录。
   */
  patchLog: AgentPatch[];
}
```

---

## 2.11 状态结构总结

```txt
AppState
  ├── workspace
  │   ├── blocks
  │   ├── blockOrder
  │   ├── selectedBlockIds
  │   ├── manualLayoutMap
  │   └── version
  │
  ├── agent
  │   ├── status
  │   ├── messages
  │   ├── contextVersion
  │   └── lastPatchId
  │
  ├── history
  │   ├── undoStack
  │   └── redoStack
  │
  ├── pendingTransaction
  └── patchLog
```

这套结构可以同时支持：

- 工作区渲染；
- Agent 增量更新；
- 用户手动布局保护；
- 撤销 / 重做；
- 乐观更新 / 回滚；
- 未来多人协作扩展。

---

# 3. 如果要支持多人协作 CRDT，架构需要做哪些改动？

## 3.1 当前架构的问题

当前 Zustand 状态是本地状态。

也就是说：

```txt
用户 A 的工作区状态 ≠ 用户 B 的工作区状态
```

如果要支持多人协作，就需要让多个用户共享同一份工作区数据。

普通做法可能是：

```txt
用户 A 改完 → 发给服务端 → 服务端广播给用户 B
```

但这样很容易出现冲突，例如：

- 两个人同时移动同一个节点；
- 一个人删除节点，另一个人正在编辑节点标题；
- Agent 正在添加分支，用户同时拖拽相关节点。

所以更合适的方案是使用 CRDT。

---

## 3.2 CRDT 方案选择

推荐使用：

```txt
Yjs
```

Yjs 可以把多人对同一份数据的修改自动合并，适合协作工作区、协作文档、白板等场景。

核心变化是：

```txt
本地 Zustand 状态
  ↓
Y.Doc 作为多人协作的唯一数据源
  ↓
Zustand 只作为 UI 缓存和派生状态
```

---

## 3.3 改造前后对比

### 改造前

```txt
React UI
  ↓
Zustand Store
  ↓
本地 blocks / history / patchLog
```

### 改造后

```txt
React UI
  ↓
Zustand UI Store
  ↓
Y.Doc CRDT State
  ↓
WebSocket Provider / Persistence
  ↓
其他用户 / Agent / 后端
```

关键点：

- `Y.Doc` 是真实状态；
- `Zustand` 只是让 React 更方便渲染；
- 用户操作、Agent Patch、远端协作者操作，都写入 `Y.Doc`；
- `Y.Doc` 变化后，再同步更新本地 UI。

---

## 3.4 CRDT 数据结构设计

可以把原来的 `WorkspaceState` 映射成 Yjs 数据结构。

```ts
const ydoc = new Y.Doc();

const yBlocks = ydoc.getMap<Y.Map<unknown>>("blocks");
const yBlockOrder = ydoc.getArray<string>("blockOrder");
const yManualLayoutMap = ydoc.getMap<Y.Map<unknown>>("manualLayoutMap");
const yPatchLog = ydoc.getArray<Y.Map<unknown>>("patchLog");
```

对应关系：

| 本地结构 | CRDT 结构 |
|---|---|
| `blocks: Record<string, WorkspaceBlock>` | `Y.Map<blockId, Y.Map>` |
| `blockOrder: string[]` | `Y.Array<string>` |
| `manualLayoutMap` | `Y.Map<blockId, Y.Map>` |
| `patchLog: AgentPatch[]` | `Y.Array<AgentPatch>` |
| `selectedBlockIds` | 本地状态，不进入共享状态 |
| `agent.status` | 本地状态或协作事件流 |
| `presence` | Yjs Awareness |

---

## 3.5 哪些状态应该共享？哪些不该共享？

### 应该共享

这些状态会影响所有人的工作区结果：

- blocks；
- blockOrder；
- manualLayoutMap；
- patchLog；
- 已提交的 Agent Patch；
- 节点位置；
- 节点标题；
- 节点连线；
- 节点删除和创建。

### 不一定共享

这些状态通常是每个人自己的 UI 状态：

- 当前缩放比例；
- 当前视口位置；
- 当前展开的面板；
- 本地输入框内容；
- 本地 hover 状态。

### 需要通过 Presence 共享

这些状态适合用 Awareness 表示：

- 当前用户光标位置；
- 当前用户选中了哪个节点；
- 用户是否正在拖拽；
- 用户头像和在线状态。

---

## 3.6 用户操作如何写入 CRDT？

用户拖拽节点时，不再只更新本地 Zustand，而是写入 `Y.Doc`。

```ts
function moveBlockInCrdt(blockId: string, position: Point, userId: string) {
  ydoc.transact(() => {
    const yBlock = yBlocks.get(blockId);
    if (!yBlock) return;

    yBlock.set("position", position);
    yBlock.set("positionSource", "user");
    yBlock.set("updatedBy", userId);
    yBlock.set("updatedAt", Date.now());

    const yLayout = new Y.Map();
    yLayout.set("blockId", blockId);
    yLayout.set("position", position);
    yLayout.set("updatedAt", Date.now());
    yLayout.set("reason", "drag");

    yManualLayoutMap.set(blockId, yLayout);
  }, "user-drag");
}
```

注意：拖拽时需要节流，不能每一帧都发送大量更新。

推荐：

```txt
拖拽中：本地即时显示
每 50ms - 100ms：同步一次位置
拖拽结束：提交最终位置
```

---

## 3.7 Agent Patch 如何写入 CRDT？

Agent 也应该被看作一个协作者。

也就是说：

```txt
用户是一个协作者
Agent 也是一个协作者
```

Agent 生成 Patch 后，不再直接改本地状态，而是在一个 CRDT transaction 中写入。

```ts
function applyAgentPatchToCrdt(patch: AgentPatch) {
  ydoc.transact(() => {
    for (const operation of patch.operations) {
      applyOperationToYDoc(operation);
    }

    yPatchLog.push([patchToYMap(patch)]);
  }, "agent-patch");
}
```

这样可以保证：

- 多个用户都能看到 Agent 的修改；
- Agent 操作可以出现在协作历史中；
- Agent 不会绕过多人协作系统；
- 后续可以追踪是谁触发了 Agent。

---

## 3.8 冲突处理如何升级？

本地版本中，我们用 `positionSource` 和 `manualLayoutMap` 保护用户布局。

多人协作后，这个策略仍然保留，但需要升级为字段级合并。

### 示例冲突

用户 A 移动了“手机验证”节点：

```txt
position = { x: 760, y: 360 }
positionSource = "user"
```

Agent 同时想更新这个节点的标题：

```txt
title = "手机验证码验证"
position = { x: 640, y: 340 }
```

正确结果应该是：

```txt
title 使用 Agent 的更新
position 保留用户 A 的位置
```

也就是：

```ts
{
  title: "手机验证码验证",
  position: { x: 760, y: 360 },
  positionSource: "user"
}
```

这就是字段级合并：

- `title` 可以被 Agent 更新；
- `description` 可以被 Agent 更新；
- `position` 如果来自用户手动拖拽，则默认保留；
- 除非 Agent 明确设置 `forceMove = true`。

---

## 3.9 Undo / Redo 如何变化？

单人版本里，undo / redo 很简单：

```txt
undoStack / redoStack
```

多人协作后要区分两种历史：

### 本地撤销

用户只撤销自己刚才做的操作。

例如：

```txt
我移动了一个节点
我点击 Undo
只撤销我自己的移动
不影响别人刚刚添加的节点
```

### 协作历史

所有人的操作都记录在全局历史中，但不一定允许随便撤销。

例如：

```txt
用户 A 添加节点
用户 B 修改标题
Agent 添加分支
```

如果用户 A 撤销“添加节点”，可能会影响用户 B 的修改，所以需要更谨慎。

推荐策略：

```txt
本地 undo：使用 Y.UndoManager 管理当前用户的操作
全局历史：只展示，不一定允许直接撤销
Agent Patch：可以作为一个独立 transaction，被触发者撤销
```

---

## 3.10 Presence：多人在线状态

多人协作不仅要同步数据，还要同步“人在做什么”。

用 Yjs Awareness 可以实现：

```ts
awareness.setLocalStateField("user", {
  id: currentUser.id,
  name: currentUser.name,
  color: currentUser.color,
});

awareness.setLocalStateField("selection", {
  selectedBlockIds: ["node_phone_verify"],
});

awareness.setLocalStateField("cursor", {
  x: 520,
  y: 340,
});
```

界面上可以显示：

- 谁在线；
- 谁选中了哪个节点；
- 谁正在拖拽；
- 谁触发了 Agent；
- Agent 正在修改哪个分支。

---

## 3.11 Agent 上下文如何变化？

单人版本中，Agent 读取的是本地 snapshot。

多人协作后，Agent 必须读取 CRDT 的最新状态。

```txt
Y.Doc 最新状态
  ↓
生成 WorkspaceSnapshot
  ↓
加入 selectedBlockIds / visibleViewport / recentPatchLog
  ↓
发送给 Agent
  ↓
Agent 返回 AgentPatch
  ↓
Patch 写回 Y.Doc
```

重点：

1. Agent 不能基于旧状态生成 Patch；
2. Agent Patch 应该带上 `baseVersion` 或 CRDT state vector；
3. 应用 Patch 前要检查目标节点是否仍然存在；
4. 如果状态变化太大，需要重新生成 Patch 或提示用户确认。

---

## 3.12 多人协作后的推荐架构

```txt
                 ┌─────────────────────┐
                 │      Agent API       │
                 └──────────▲──────────┘
                            │
                            │ AgentContext / AgentPatch
                            │
┌──────────────┐     ┌───────┴────────┐     ┌────────────────┐
│  User A UI   │◄───►│     Y.Doc      │◄───►│   User B UI    │
└──────────────┘     │  CRDT State    │     └────────────────┘
                     └───────▲────────┘
                             │
                             │ sync
                             │
                     ┌───────┴────────┐
                     │ WebSocket / DB │
                     └────────────────┘
```

---

## 3.13 CRDT 改造总结

| 模块 | 单人版本 | 多人协作版本 |
|---|---|---|
| 真实状态 | Zustand | Y.Doc |
| UI 状态 | Zustand | Zustand 派生自 Y.Doc |
| blocks | Record Map | Y.Map |
| blockOrder | string[] | Y.Array |
| 用户选区 | 本地状态 | Awareness |
| 用户光标 | 无或本地 | Awareness |
| Agent Patch | 本地应用 | 写入 Y.Doc transaction |
| Undo / Redo | 本地 undoStack | Y.UndoManager + 本地事务 |
| 冲突处理 | positionSource | 字段级合并 + positionSource |
| 数据同步 | 无 | WebSocket Provider |

---
