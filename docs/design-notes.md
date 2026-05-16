# Design Notes

## Why React Flow

The product needs a visual workspace with drag, zoom, pan, node selection, edge rendering, MiniMap, and Controls. React Flow already provides those interaction primitives while still letting each node be a React component. That is a better fit than a raw HTML Canvas renderer for this demo because the project needs readable, inspectable UI blocks and maintainable frontend state.

## State Shape

Canvas state is normalized:

```ts
blocks: Record<string, CanvasBlock>
blockOrder: string[]
manualLayoutMap: Record<string, ManualLayoutRecord>
```

This supports targeted updates, stable ids, simple diffing, and future operation-log synchronization.

## Patch Boundaries

The Agent produces intent. The frontend owns enforcement:

- validate patch structure
- reject unknown ids and invalid edges
- apply operations transactionally
- preserve user-owned layout
- record before/after snapshots for undo and redo

## Rollback

The store saves a before snapshot before optimistic application. If validation or application fails, the store restores that snapshot and records a rolled-back patch log entry.

## Future Work

The natural next step is replacing the mock Agent with an LLM endpoint that emits the same `AgentPatch` shape. The UI and transaction system do not need to know whether a patch came from a mock, server action, or streaming model response.
