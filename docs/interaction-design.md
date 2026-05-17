# Cola Workspace Agent 交互设计文档

> 交付阶段：Day 1 交互设计文档
> 文档目标：用浅显、清晰的方式说明 AI Agent 如何生成、修改并局部更新可视化工作区。

---

## 0. 先澄清一个容易混淆的点

本文中的 **Workspace / 可视化工作区 / 画布式交互**，指的是一种产品形态：

> 用户可以在一个可缩放、可拖拽、可编排的空间里操作内容块。

它 **不等于** 技术上的 HTML `<canvas>` 标签。

本项目的技术实现建议是：

```txt
React Flow + DOM + SVG
```

也就是说：

- **节点内容** 用 DOM / React 组件渲染；
- **连线和箭头** 用 SVG 渲染；
- **拖拽、缩放、平移、节点选择、MiniMap** 由 React Flow 提供；
- 不把 HTML `<canvas>` 作为主渲染层。

因此，项目名称使用 **Cola Workspace Agent**，比 **Cola Canvas Agent** 更准确，也能避免让人误以为项目主技术方案是 HTML `<canvas>`。

---

## 1. 一句话说明

Cola Workspace Agent 可以理解为：

> 用户像和 ChatGPT 聊天一样描述需求，Agent 在类似 Figma / Miro 的可视化工作区里创建流程图、文本、代码、图表等内容块；用户可以手动拖拽调整，Agent 下一次修改时不会破坏用户已经调整好的布局。

核心不是“AI 重新画一张图”，而是：

> Agent 输出结构化更新指令，前端把这些指令增量应用到当前工作区。

---

## 2. 本文重点回答的四个问题

1. **内容块类型与数据结构**
   工作区支持哪些内容块？每个内容块的数据模型长什么样？

2. **数据流设计**
   Agent 生成内容之后，如何一步步渲染到工作区？

3. **冲突处理**
   用户手动拖拽修改了布局，Agent 下一次更新时如何保留用户的调整？

4. **局部更新策略**
   Agent 修改流程图某个分支时，为什么不应该重新生成整张图？应该怎么局部更新？

---

# 一、内容块类型与数据结构

## 1.1 设计思路

工作区里的所有东西都叫做 **内容块 WorkspaceBlock**。

它可以是：

- 一个流程图节点；
- 一条流程图连线；
- 一段文本说明；
- 一段代码；
- 一个图表。

这样做的好处是：

- 所有内容都有统一的数据模型；
- Agent 修改时只需要告诉前端“改哪个 block”；
- 前端可以做增量更新，而不是整张工作区重画；
- 后续扩展代码块、图表块、多人协作时更方便。

> 说明：如果代码中仍使用 `CanvasBlock` 这个名字，它表示“画布式工作区中的内容块”这个领域概念，不代表 HTML `<canvas>`。为了降低歧义，本文统一使用 `WorkspaceBlock`。

---

## 1.2 内容块类型

| 类型 | 名称 | 用途 |
|---|---|---|
| `flowNode` | 流程图节点 | 表示流程中的一步，例如“开始注册”“邮箱验证”“手机验证” |
| `flowEdge` | 流程图连线 | 表示节点之间的关系，例如“选择手机验证” |
| `textBlock` | 文本块 | 用于说明、备注、总结 |
| `codeBlock` | 代码块 | 用于展示接口代码、伪代码、校验逻辑 |
| `chartBlock` | 图表块 | 用于展示柱状图、折线图、表格等数据 |

---

## 1.3 每个内容块都应该有哪些基础字段？

无论是哪种内容块，都应该有这些基础字段：

```ts
type Actor = "user" | "agent" | "system";

type BlockType =
  | "flowNode"
  | "flowEdge"
  | "textBlock"
  | "codeBlock"
  | "chartBlock";

interface BaseBlock {
  id: string;                    // 稳定 ID，用来定位这个内容块
  type: BlockType;               // 内容块类型
  semanticId?: string;           // 语义 ID，帮助 Agent 理解它代表什么
  version: number;               // 版本号，每次修改递增
  createdBy: Actor;              // 谁创建的：用户 / Agent / 系统
  updatedBy: Actor;              // 最近是谁更新的
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}
```

### 字段解释

| 字段 | 作用 |
|---|---|
| `id` | 前端用来精确找到某个节点或连线 |
| `type` | 告诉系统这是节点、连线、文本还是图表 |
| `semanticId` | 告诉 Agent 这个节点的业务含义，例如 `register.phone.verify` |
| `version` | 用来判断这个内容块是否被更新过 |
| `createdBy` / `updatedBy` | 用来区分是用户改的，还是 Agent 改的 |
| `metadata` | 给未来扩展留空间 |

---

## 1.4 流程图节点模型

流程图节点是工作区里最重要的内容块。

```ts
type PositionSource = "agent" | "layout" | "user";

type FlowNodeRole =
  | "start"
  | "action"
  | "decision"
  | "success"
  | "failure"
  | "retry"
  | "end";

interface FlowNodeBlock extends BaseBlock {
  type: "flowNode";

  title: string;                 // 节点标题
  description?: string;          // 节点说明
  role: FlowNodeRole;            // 节点角色

  position: { x: number; y: number };
  size: { width: number; height: number };

  // 这个位置是谁决定的？
  // agent：Agent 初始生成
  // layout：自动布局生成
  // user：用户手动拖拽生成
  positionSource: PositionSource;

  // 所属分支，例如 email / phone
  branchKey?: string;

  // 用户是否锁定了这个节点的位置
  layoutLocked?: boolean;
}
```

### 示例：手机验证节点

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
  positionSource: "agent",
  branchKey: "phone",
  version: 1,
  createdBy: "agent",
  updatedBy: "agent",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

---

## 1.5 流程图连线模型

连线表示两个节点之间的关系。

```ts
interface FlowEdgeBlock extends BaseBlock {
  type: "flowEdge";

  source: string;      // 起点节点 ID
  target: string;      // 终点节点 ID

  label?: string;      // 连线文字，例如“选择手机验证”
  condition?: string;  // 条件，例如 success / failed
  animated?: boolean;  // 是否展示动态连线效果
}
```

### 示例：选择手机验证的连线

```ts
const phoneEdge: FlowEdgeBlock = {
  id: "edge_choose_to_phone",
  semanticId: "register.edge.choose_to_phone",
  type: "flowEdge",
  source: "node_choose_method",
  target: "node_phone_verify",
  label: "选择手机验证",
  condition: "phone",
  animated: true,
  version: 1,
  createdBy: "agent",
  updatedBy: "agent",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

---

## 1.6 其他内容块模型

### 文本块

```ts
interface TextBlock extends BaseBlock {
  type: "textBlock";
  title?: string;
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  positionSource: PositionSource;
}
```

### 代码块

```ts
interface CodeBlock extends BaseBlock {
  type: "codeBlock";
  language: string;
  code: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  positionSource: PositionSource;
}
```

### 图表块

```ts
interface ChartBlock extends BaseBlock {
  type: "chartBlock";
  chartType: "bar" | "line" | "pie" | "table";
  data: Array<Record<string, string | number>>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  positionSource: PositionSource;
}
```

---

## 1.7 统一的 WorkspaceBlock 类型

```ts
type WorkspaceBlock =
  | FlowNodeBlock
  | FlowEdgeBlock
  | TextBlock
  | CodeBlock
  | ChartBlock;
```

---

## 1.8 工作区状态结构

工作区不要直接用一个大数组管理，而应该用标准化结构。

```ts
interface WorkspaceState {
  blocks: Record<string, WorkspaceBlock>; // 所有内容块，以 id 为 key
  blockOrder: string[];                   // 渲染顺序
  selectedBlockIds: string[];             // 当前选中的内容块
  manualLayoutMap: Record<string, ManualLayoutRecord>;
  version: number;                        // 工作区版本号
}

interface ManualLayoutRecord {
  blockId: string;
  position: { x: number; y: number };
  updatedAt: number;
  reason: "drag" | "resize" | "lock";
}
```

### 为什么要用 `blocks: Record<string, WorkspaceBlock>`？

因为 Agent 更新时通常是这样的：

> 更新 `node_phone_verify`，新增 `node_sms_retry`，新增一条从 A 到 B 的边。

如果用数组，每次都要遍历查找。
如果用 `Record`，可以直接通过 ID 找到目标内容块。

---

# 二、数据流设计：Agent 生成内容 → 渲染到工作区

## 2.1 核心原则

Agent 不应该直接返回完整 UI，也不应该直接控制 React 组件。

更好的方式是：

> Agent 返回结构化 Patch，前端负责校验、合并、渲染、记录历史。

这样做有几个好处：

- 前端可以判断 Agent 的修改是否安全；
- 前端可以保留用户手动拖拽的位置；
- 前端可以做撤销、重做；
- 前端可以失败回滚；
- Agent 修改某个分支时，不需要重建整张图。

---

## 2.2 Agent Patch 是什么？

Agent Patch 可以理解为：

> Agent 给前端的一组“修改指令”。

例如：

- 创建一个节点；
- 修改一个节点标题；
- 删除一条边；
- 在某个节点后插入新节点；
- 移动一个节点。

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
      op: "deleteBlock";
      id: string;
    }
  | {
      op: "moveBlock";
      id: string;
      position: { x: number; y: number };
      source: PositionSource;
      forceMove?: boolean;
    }
  | {
      op: "insertAfter";
      anchorId: string;
      blocks: WorkspaceBlock[];
      edges: FlowEdgeBlock[];
      layoutScope: "local" | "branch" | "global";
    };
```

---

## 2.3 一次完整的 AgentPatch

```ts
interface AgentPatch {
  id: string;
  description: string;
  baseVersion: number;        // Agent 基于哪个工作区版本生成
  affectedBlockIds: string[]; // 本次影响哪些内容块
  operations: PatchOperation[];
  createdAt: number;
  summary?: string;
}
```

---

## 2.4 完整数据流

```txt
用户输入自然语言
  ↓
Chat Panel 创建用户消息
  ↓
Agent 状态变为 thinking
  ↓
前端收集当前工作区上下文
  ↓
Agent 返回 AgentPatch
  ↓
前端校验 Patch
  ↓
保存更新前的工作区快照
  ↓
创建 pendingTransaction
  ↓
逐条应用 PatchOperation
  ↓
工作区流式渲染节点和连线
  ↓
成功后提交 transaction
  ↓
写入 undoStack 和 patchLog
  ↓
Agent 状态变为 synced
```

---

## 2.5 Agent 需要看到什么上下文？

Agent 不能只看用户刚输入的一句话，还需要知道当前工作区上已经有什么。

```ts
interface AgentContext {
  userMessage: string;
  workspaceSnapshot: WorkspaceSnapshot;
  manualLayoutMap: Record<string, ManualLayoutRecord>;
  selectedBlockIds: string[];
  patchLog: AgentPatch[];
  recentTransactions: WorkspaceTransaction[];
}
```

Agent 需要这些信息来判断：

- 用户说的“手机验证那条路径”指的是哪个节点？
- 这个节点有没有被用户手动拖拽过？
- 上一次 Agent 做了什么？
- 本次应该新增内容，还是修改已有内容？

---

## 2.6 初次生成流程图的数据流示例

用户输入：

```txt
帮我画一个用户注册的流程图，包含邮箱验证和手机验证两条路径
```

Agent 返回的不是 HTML，也不是图片，而是一组创建节点和连线的操作：

```txt
createBlock: 开始注册
createBlock: 选择验证方式
createBlock: 邮箱验证
createBlock: 手机验证
createBlock: 注册成功
createEdge: 开始注册 → 选择验证方式
createEdge: 选择验证方式 → 邮箱验证
createEdge: 选择验证方式 → 手机验证
createEdge: 邮箱验证 → 注册成功
createEdge: 手机验证 → 注册成功
```

前端收到后：

1. 校验这些节点和连线是否合法；
2. 将节点加入 `workspace.blocks`；
3. 将 ID 加入 `workspace.blockOrder`；
4. 按顺序逐步渲染；
5. 写入一次 Agent 操作历史。

---

## 2.7 流式渲染

为了让效果更像 Agent 正在实时工作，可以逐条执行 operation。

```txt
第 1 步：出现“开始注册”节点
第 2 步：出现“选择验证方式”节点
第 3 步：出现“邮箱验证”节点
第 4 步：出现“手机验证”节点
第 5 步：逐步绘制连线
```

简单伪代码：

```ts
async function streamApplyPatch(patch: AgentPatch) {
  for (const operation of patch.operations) {
    applyOperation(operation);
    await wait(280);
  }
}
```

这样面试时能明显看到：

> Agent 不是一下子替换工作区，而是在逐步增量更新。

---

# 三、冲突处理：如何保留用户手动调整？

## 3.1 冲突场景

典型场景如下：

```txt
1. Agent 生成流程图。
2. 用户把“手机验证”节点拖到了右侧。
3. 用户继续说：“给手机验证路径增加短信失败重试逻辑”。
4. Agent 返回了新的布局建议。
5. 如果直接应用 Agent 的位置，就会覆盖用户刚刚拖好的布局。
```

这就是冲突。

---

## 3.2 处理原则

最重要的原则是：

> 用户手动调整优先于 Agent 自动布局。

也就是说：

- 用户拖过的节点，Agent 默认不能移动；
- Agent 可以更新节点标题、说明、连线关系；
- 但 Agent 不能悄悄覆盖用户拖拽后的位置。

---

## 3.3 用 positionSource 记录位置来源

每个有位置的内容块都有一个字段：

```ts
positionSource: "agent" | "layout" | "user";
```

含义如下：

| 值 | 含义 |
|---|---|
| `agent` | 位置由 Agent 初始生成 |
| `layout` | 位置由自动布局算法生成 |
| `user` | 位置由用户手动拖拽产生 |

用户一拖拽节点，就把它标记成 `user`。

---

## 3.4 用户拖拽时如何记录？

```ts
function onUserDragBlock(blockId: string, nextPosition: Point) {
  const block = workspace.blocks[blockId];

  workspace.blocks[blockId] = {
    ...block,
    position: nextPosition,
    positionSource: "user",
    updatedBy: "user",
    updatedAt: Date.now(),
    version: block.version + 1,
  };

  workspace.manualLayoutMap[blockId] = {
    blockId,
    position: nextPosition,
    updatedAt: Date.now(),
    reason: "drag",
  };
}
```

这一步非常关键。
它告诉系统：

> 这个位置是用户亲自调整过的，后面 Agent 不要随便覆盖。

---

## 3.5 Agent 更新时如何保护用户布局？

当前端应用 Agent patch 时，要判断：

1. 这个节点是否被用户拖拽过？
2. Agent 是否想改它的位置？
3. Agent 是否明确要求强制移动？

如果节点是 `positionSource = "user"`，并且 Agent 没有 `forceMove = true`，就保留用户位置。

```ts
function applyUpdateBlockOperation(existing, patch, options) {
  const shouldPreservePosition =
    existing.positionSource === "user" &&
    patch.position &&
    options.preserveUserLayout !== false &&
    !options.forceMove;

  return {
    ...existing,
    ...patch,
    position: shouldPreservePosition
      ? existing.position
      : patch.position ?? existing.position,
    positionSource: shouldPreservePosition
      ? "user"
      : patch.positionSource ?? existing.positionSource,
    version: existing.version + 1,
    updatedAt: Date.now(),
  };
}
```

---

## 3.6 Agent 确实想移动用户节点怎么办？

如果 Agent 确实需要移动用户拖过的节点，不能直接移动，而应该提示用户。

例如 Patch Preview 中显示：

```txt
检测到布局冲突

Agent 建议移动 1 个你手动调整过的节点：
- 手机验证

默认处理：保留你的手动布局。

你可以选择：
1. 保留我的布局
2. 接受 Agent 的布局建议
```

这样用户会觉得系统尊重自己的操作。

---

## 3.7 冲突处理小结

冲突处理可以记成一句话：

> 用户拖过的节点记为 `positionSource = "user"`，Agent 后续更新默认只改内容、不改位置。

---

# 四、局部更新策略：修改一个分支，不重画整张图

## 4.1 为什么不能全量重建？

用户说：

```txt
把手机验证那条路径加一个短信发送失败的重试逻辑
```

错误做法是：

```txt
Agent 重新生成一整张注册流程图
前端清空旧图
重新渲染所有节点和边
```

这样会带来几个问题：

- 用户手动拖拽的位置会丢失；
- 整个工作区会闪烁；
- 撤销记录不清晰；
- 邮箱验证分支明明没变，却也被重建；
- 用户会觉得 AI 不理解“局部修改”。

---

## 4.2 正确做法

正确做法是：

> Agent 只返回手机验证分支的局部 Patch。

也就是：

```txt
保留原有流程图
只找到“手机验证”节点
在它后面新增“短信发送失败？”节点
再新增“重新发送短信”节点
补充相关连线
其他分支不动
```

---

## 4.3 如何让 Agent 找到目标分支？

需要给节点增加语义信息。

例如：

```txt
register.start
register.choose_method
register.email.verify
register.phone.verify
register.phone.sms_failed
register.phone.sms_retry
register.success
```

同时用 `branchKey` 标记分支：

| 节点 | branchKey |
|---|---|
| 开始注册 | register |
| 选择验证方式 | register |
| 邮箱验证 | email |
| 手机验证 | phone |
| 注册成功 | success |

这样当用户说“手机验证那条路径”时，Agent 可以定位到：

```txt
semanticId = register.phone.verify
branchKey = phone
```

---

## 4.4 局部更新的 Patch 示例

用户输入：

```txt
把手机验证那条路径加一个短信发送失败的重试逻辑
```

Agent 返回：

```ts
const patch: AgentPatch = {
  id: "patch_add_sms_retry",
  description: "在手机验证分支增加短信发送失败重试逻辑",
  baseVersion: 3,
  affectedBlockIds: ["node_phone_verify"],
  createdAt: Date.now(),
  operations: [
    {
      op: "insertAfter",
      anchorId: "node_phone_verify",
      layoutScope: "branch",
      blocks: [
        {
          id: "node_sms_failed",
          semanticId: "register.phone.sms_failed",
          type: "flowNode",
          title: "短信发送失败？",
          role: "decision",
          position: { x: 920, y: 340 },
          size: { width: 220, height: 96 },
          positionSource: "layout",
          branchKey: "phone",
          version: 1,
          createdBy: "agent",
          updatedBy: "agent",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "node_sms_retry",
          semanticId: "register.phone.sms_retry",
          type: "flowNode",
          title: "重新发送短信",
          role: "retry",
          position: { x: 920, y: 500 },
          size: { width: 220, height: 96 },
          positionSource: "layout",
          branchKey: "phone",
          version: 1,
          createdBy: "agent",
          updatedBy: "agent",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      edges: [
        {
          id: "edge_phone_to_sms_failed",
          type: "flowEdge",
          source: "node_phone_verify",
          target: "node_sms_failed",
          label: "发送短信",
          version: 1,
          createdBy: "agent",
          updatedBy: "agent",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "edge_sms_failed_to_retry",
          type: "flowEdge",
          source: "node_sms_failed",
          target: "node_sms_retry",
          label: "失败，重试",
          animated: true,
          version: 1,
          createdBy: "agent",
          updatedBy: "agent",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    },
  ],
};
```

---

## 4.5 局部布局策略

新增节点应该放在哪里？

推荐策略：

1. 找到 `anchorId` 对应的节点，例如“手机验证”；
2. 读取它当前的位置；
3. 新节点放在它右侧或下方；
4. 只调整同一个分支内的新节点；
5. 不移动其他分支；
6. 不移动 `positionSource = "user"` 的节点。

简单伪代码：

```ts
function layoutInsertedBlocks(anchor, newBlocks) {
  const startX = anchor.position.x + anchor.size.width + 120;
  const startY = anchor.position.y;

  return newBlocks.map((block, index) => ({
    ...block,
    position: {
      x: startX,
      y: startY + index * 150,
    },
    positionSource: "layout",
  }));
}
```

---

## 4.6 更新前后对比

### 更新前

```txt
开始注册
  ↓
选择验证方式
  ├── 邮箱验证
  │     ↓
  │   注册成功
  └── 手机验证
        ↓
      注册成功
```

### 用户手动拖拽后

```txt
“手机验证”节点被用户拖到了更合适的位置
positionSource = "user"
```

### Agent 局部更新后

```txt
开始注册
  ↓
选择验证方式
  ├── 邮箱验证
  │     ↓
  │   注册成功
  └── 手机验证
        ↓
      短信发送失败？
        ├── 是 → 重新发送短信 → 手机验证
        └── 否 → 注册成功
```

关键结果：

- “手机验证”节点保持用户拖拽后的位置；
- 邮箱验证分支完全不动；
- 只新增手机验证分支相关节点和连线；
- 本次更新可以作为一次 Agent 操作被撤销。

---

# 五、最终交互验收标准

## 5.1 内容块类型与数据结构

交付时应体现：

- 所有工作区内容统一抽象为 `WorkspaceBlock`；
- 至少支持流程图节点、流程图连线、文本块、代码块、图表块；
- 节点有 `id`、`semanticId`、`position`、`size`、`version`；
- 用户拖拽过的位置通过 `positionSource = "user"` 和 `manualLayoutMap` 记录。

---

## 5.2 数据流设计

交付时应体现：

- 用户输入自然语言；
- Agent 读取当前工作区上下文；
- Agent 输出结构化 `AgentPatch`；
- 前端校验 patch；
- 前端逐条应用 patch operation；
- 工作区流式渲染；
- 成功后提交历史记录；
- 失败时可以回滚。

---

## 5.3 冲突处理

交付时应体现：

- 用户拖拽后，节点位置来源变为 `user`；
- Agent 默认不能覆盖用户手动位置；
- Agent 如果想移动用户节点，需要 `forceMove = true`；
- Patch Preview 应提示用户存在布局冲突。

---

## 5.4 局部更新策略

交付时应体现：

- Agent 修改某个分支时，不全量重建整图；
- 使用 `semanticId`、`branchKey`、`anchorId` 定位目标分支；
- 新增节点只在目标分支附近布局；
- 其他分支和用户手动调整过的节点保持不动。

---

# 六、面试中可以这样解释

可以用下面这段话向面试官说明设计思路：

> 我把可视化工作区里的所有内容统一抽象成 WorkspaceBlock，包括流程图节点、连线、文本块、代码块和图表块。这里的 Workspace 是产品交互概念，不等于 HTML `<canvas>`。Agent 不直接生成完整 UI，而是输出结构化 AgentPatch。前端负责校验 patch、应用 patch、记录历史和处理冲突。用户拖拽节点后，节点会被标记为 `positionSource = user`，Agent 后续默认只更新内容，不覆盖用户手动位置。当用户要求修改手机验证分支时，Agent 通过 `semanticId` 和 `branchKey` 找到目标分支，只插入相关节点和连线，不重建整张图。这样既能实现 AI 可视化工作区的效果，也能保证状态稳定、可撤销、可扩展。

---

# 七、总结

这个交互设计的核心可以概括为四句话：

1. **内容统一抽象**：所有工作区元素都是 `WorkspaceBlock`。
2. **Agent 只给指令**：Agent 返回 `AgentPatch`，不直接控制 UI。
3. **用户布局优先**：用户拖拽过的位置，Agent 默认不能覆盖。
4. **只做局部更新**：修改某个分支时，只更新相关节点和连线，不重建整张图。

最终效果是：

> 用户可以自然语言生成流程图，也可以手动拖拽调整；Agent 后续继续修改时，既能理解当前工作区，又能尊重用户已经做过的修改。
