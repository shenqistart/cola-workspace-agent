import type { CanvasSnapshot } from "../types/canvas";

export function cloneSnapshot(snapshot: CanvasSnapshot): CanvasSnapshot {
  return structuredClone(snapshot);
}

export function getChangedBlockIds(before: CanvasSnapshot, after: CanvasSnapshot) {
  const ids = new Set([...Object.keys(before.blocks), ...Object.keys(after.blocks)]);
  return [...ids].filter((id) => {
    const beforeBlock = before.blocks[id];
    const afterBlock = after.blocks[id];
    return JSON.stringify(beforeBlock) !== JSON.stringify(afterBlock);
  });
}
