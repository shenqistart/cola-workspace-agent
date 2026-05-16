import { produce } from "immer";
import type {
  Actor,
  CanvasBlock,
  CanvasSnapshot,
  FlowEdgeBlock,
  Point,
} from "../types/canvas";
import { isFlowEdgeBlock, isPositionedBlock } from "../types/canvas";
import { now } from "../utils/time";
import type { AgentPatch, PatchOperation } from "./patchProtocol";

export function applyAgentPatch(
  snapshot: CanvasSnapshot,
  patch: AgentPatch,
): CanvasSnapshot {
  return patch.operations.reduce(
    (current, operation) => applyPatchOperation(current, operation, "agent"),
    snapshot,
  );
}

export function applyPatchOperation(
  snapshot: CanvasSnapshot,
  operation: PatchOperation,
  actor: Actor = "agent",
): CanvasSnapshot {
  return produce(snapshot, (draft) => {
    applyOperationInPlace(draft, operation, actor);
    draft.version += 1;
  });
}

function applyOperationInPlace(
  draft: CanvasSnapshot,
  operation: PatchOperation,
  actor: Actor,
) {
  switch (operation.op) {
    case "createBlock":
      createBlock(draft, operation.block, operation.anchorId);
      break;
    case "updateBlock":
      updateBlock(draft, operation.id, operation.patch, {
        preserveUserLayout: operation.preserveUserLayout,
        forceMove: operation.forceMove,
        actor,
      });
      break;
    case "deleteBlock":
      deleteBlock(draft, operation.id);
      break;
    case "createEdge":
      createBlock(draft, operation.edge);
      break;
    case "deleteEdge":
      deleteBlock(draft, operation.id);
      break;
    case "moveBlock":
      moveBlock(draft, operation.id, operation.position, {
        actor,
        source: operation.source,
        forceMove: operation.forceMove,
      });
      break;
    case "insertAfter":
      insertAfter(draft, operation.anchorId, operation.blocks, operation.edges);
      break;
    case "batch":
      operation.operations.forEach((childOperation) => {
        applyOperationInPlace(draft, childOperation, actor);
      });
      break;
  }
}

function createBlock(
  draft: CanvasSnapshot,
  block: CanvasBlock,
  anchorId?: string,
) {
  draft.blocks[block.id] = block;
  insertBlockId(draft.blockOrder, block.id, anchorId);
}

function updateBlock(
  draft: CanvasSnapshot,
  id: string,
  patch: Partial<CanvasBlock>,
  options: {
    preserveUserLayout?: boolean;
    forceMove?: boolean;
    actor: Actor;
  },
) {
  const existing = draft.blocks[id];
  if (!existing) {
    throw new Error(`Cannot update missing block "${id}".`);
  }

  const shouldPreservePosition =
    isPositionedBlock(existing) &&
    "position" in patch &&
    Boolean(patch.position) &&
    existing.positionSource === "user" &&
    options.preserveUserLayout !== false &&
    !options.forceMove;

  const timestamp = now();
  const merged = {
    ...existing,
    ...patch,
    id: existing.id,
    type: existing.type,
    version: existing.version + 1,
    updatedBy: options.actor,
    updatedAt: timestamp,
  } as CanvasBlock;

  if (shouldPreservePosition && isPositionedBlock(merged) && isPositionedBlock(existing)) {
    merged.position = existing.position;
    merged.positionSource = existing.positionSource;
  }

  draft.blocks[id] = merged;
}

function deleteBlock(draft: CanvasSnapshot, id: string) {
  const existing = draft.blocks[id];
  if (!existing) {
    throw new Error(`Cannot delete missing block "${id}".`);
  }

  delete draft.blocks[id];
  delete draft.manualLayoutMap[id];
  draft.blockOrder = draft.blockOrder.filter((blockId) => blockId !== id);
  draft.selectedBlockIds = draft.selectedBlockIds.filter((blockId) => blockId !== id);

  if (!isFlowEdgeBlock(existing)) {
    Object.values(draft.blocks)
      .filter(isFlowEdgeBlock)
      .filter((edge) => edge.source === id || edge.target === id)
      .forEach((edge) => {
        delete draft.blocks[edge.id];
        draft.blockOrder = draft.blockOrder.filter((blockId) => blockId !== edge.id);
      });
  }
}

function moveBlock(
  draft: CanvasSnapshot,
  id: string,
  position: Point,
  options: {
    actor: Actor;
    source: "agent" | "layout" | "user";
    forceMove?: boolean;
  },
) {
  const existing = draft.blocks[id];
  if (!isPositionedBlock(existing)) {
    throw new Error(`Cannot move missing or unpositioned block "${id}".`);
  }

  if (
    existing.positionSource === "user" &&
    options.source !== "user" &&
    !options.forceMove
  ) {
    return;
  }

  const timestamp = now();
  existing.position = position;
  existing.positionSource = options.source;
  existing.version += 1;
  existing.updatedBy = options.actor;
  existing.updatedAt = timestamp;

  if (options.source === "user") {
    draft.manualLayoutMap[id] = {
      blockId: id,
      position,
      updatedAt: timestamp,
      updatedBy: "user",
    };
  } else if (options.forceMove) {
    delete draft.manualLayoutMap[id];
  }
}

function insertAfter(
  draft: CanvasSnapshot,
  anchorId: string,
  blocks: CanvasBlock[],
  edges: FlowEdgeBlock[],
) {
  let currentAnchorId = anchorId;
  blocks.forEach((block) => {
    createBlock(draft, block, currentAnchorId);
    currentAnchorId = block.id;
  });

  edges.forEach((edge) => {
    createBlock(draft, edge, currentAnchorId);
    currentAnchorId = edge.id;
  });
}

function insertBlockId(order: string[], id: string, anchorId?: string) {
  const existingIndex = order.indexOf(id);
  if (existingIndex >= 0) {
    order.splice(existingIndex, 1);
  }

  if (!anchorId) {
    order.push(id);
    return;
  }

  const anchorIndex = order.indexOf(anchorId);
  if (anchorIndex === -1) {
    order.push(id);
    return;
  }

  order.splice(anchorIndex + 1, 0, id);
}
