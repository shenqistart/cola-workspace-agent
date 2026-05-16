# Cola Workspace Agent

Cola Workspace Agent is a React + TypeScript demo of an AI visual workspace. A mock Agent turns natural-language requests into structured UI patches, and the frontend validates, applies, streams, commits, rolls back, and records those patches.

This project uses **Workspace** to mean a visual editing workspace. It uses React Flow + DOM + SVG for canvas-style interactions, not the browser HTML Canvas API as the primary rendering layer.

## Tech Stack

- React, TypeScript, Vite
- React Flow / xyflow for nodes, edges, pan, zoom, MiniMap, and Controls
- Zustand + Immer for state and immutable transactions
- Tailwind CSS v4 for styling
- Vitest for protocol and history tests

## Run

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

## Demo Path

Use these prompts from the left chat panel:

```txt
帮我画一个用户注册的流程图，包含邮箱验证和手机验证两条路径
把手机验证那条路径加一个短信发送失败的重试逻辑
把邮箱验证路径加一个验证码过期判断
```

Recommended interview walkthrough:

1. Generate the registration flow.
2. Drag the `手机验证` node to a custom position.
3. Ask for SMS failure retry logic.
4. Confirm only the phone branch changes and the dragged node remains in place.
5. Use Undo and Redo from the header.

## Architecture Highlights

- `src/types` defines normalized canvas state and history records.
- `src/agent/patchProtocol.ts` defines the Agent Patch Protocol.
- `src/agent/patchValidator.ts` validates ids, anchors, and edge endpoints before applying a patch.
- `src/agent/patchApplier.ts` applies patch operations and enforces manual layout protection.
- `src/store/useCanvasStore.ts` coordinates optimistic patch application, rollback, undo, redo, messages, and timelines.
- `src/components` renders the chat panel, React Flow workspace, inspector, timeline, and patch preview.

## Agent Patch Protocol

The Agent never returns React components or a full replacement page. It returns an `AgentPatch` with operations:

- `createBlock`
- `updateBlock`
- `deleteBlock`
- `createEdge`
- `deleteEdge`
- `moveBlock`
- `insertAfter`
- `batch`

The frontend owns validation, application, conflict handling, transaction history, and rendering.

## Conflict Handling

Manual layout is protected by default. When a user drags a node:

- the node `positionSource` becomes `user`
- the position is recorded in `manualLayoutMap`
- a user transaction is added to history

If a later Agent patch tries to update that node's position, the applier preserves the user's position unless the operation explicitly sets `preserveUserLayout: false` or `forceMove: true`.

## Incremental Updates

The mock Agent uses stable ids, `semanticId`, `branchKey`, and `anchorId`. Follow-up prompts use `insertAfter` and targeted edge replacement, so the phone and email branches can be extended without clearing or rebuilding the whole graph.

## Optimistic Updates and Rollback

Patch application follows this flow:

```txt
save before snapshot
create pending transaction
set agent.status = applying
optimistically apply operations one by one
commit transaction and patch log on success
restore before snapshot and mark failed on error
```

The streaming effect is intentionally simple: operations apply one at a time, new nodes appear progressively, animated edges highlight new paths, and the Timeline lists active operations.

## CRDT Collaboration Direction

The current normalized model can evolve toward multiplayer editing by treating each patch operation as a CRDT-compatible command:

- assign Lamport or hybrid logical timestamps to operations
- keep stable block ids and semantic ids
- merge independent block updates field-by-field
- treat manual layout as a user-owned register with explicit override intent
- broadcast committed transactions instead of snapshots

This keeps Agent patches, user drags, undo/redo, and future remote edits on the same operation log foundation.
