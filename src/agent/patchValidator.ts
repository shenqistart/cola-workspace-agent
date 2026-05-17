import type { CanvasSnapshot } from "../types/canvas";
import { isFlowEdgeBlock } from "../types/canvas";
import type { AgentPatch, PatchOperation } from "./patchProtocol";

export type PatchValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

interface ValidationContext {
  availableIds: Set<string>;
  nodeIds: Set<string>;
  edgeIds: Set<string>;
  errors: string[];
}

const allowedOperations = new Set<PatchOperation["op"]>([
  "createBlock",
  "updateBlock",
  "deleteBlock",
  "createEdge",
  "deleteEdge",
  "moveBlock",
  "insertAfter",
  "batch",
]);

export function validateAgentPatch(
  patch: AgentPatch,
  snapshot: CanvasSnapshot,
): PatchValidationResult {
  const context: ValidationContext = {
    availableIds: new Set(Object.keys(snapshot.blocks)),
    nodeIds: new Set(
      Object.values(snapshot.blocks)
        .filter((block) => block.type !== "flowEdge")
        .map((block) => block.id),
    ),
    edgeIds: new Set(
      Object.values(snapshot.blocks)
        .filter(isFlowEdgeBlock)
        .map((block) => block.id),
    ),
    errors: [],
  };

  if (!patch.id) {
    context.errors.push("Patch id is required.");
  }

  if (!patch.description) {
    context.errors.push("Patch description is required.");
  }

  if (!Array.isArray(patch.operations) || patch.operations.length === 0) {
    context.errors.push("Patch must contain at least one operation.");
  } else {
    patch.operations.forEach((operation, index) => {
      validateOperation(operation, context, `operations[${index}]`);
    });
  }

  return context.errors.length > 0
    ? { ok: false, errors: context.errors }
    : { ok: true };
}

function validateOperation(
  operation: PatchOperation,
  context: ValidationContext,
  path: string,
) {
  if (!allowedOperations.has(operation.op)) {
    context.errors.push(`${path}: unsupported operation "${operation.op}".`);
    return;
  }

  switch (operation.op) {
    case "createBlock":
      validateCreateBlock(operation.block, context, path);
      break;
    case "updateBlock":
      requireExistingId(operation.id, context, path, "updateBlock");
      break;
    case "deleteBlock":
      requireExistingId(operation.id, context, path, "deleteBlock");
      if (context.availableIds.has(operation.id)) {
        context.availableIds.delete(operation.id);
        context.nodeIds.delete(operation.id);
        context.edgeIds.delete(operation.id);
      }
      break;
    case "createEdge":
      validateCreateEdge(operation.edge, context, path);
      break;
    case "deleteEdge":
      requireExistingId(operation.id, context, path, "deleteEdge");
      if (context.availableIds.has(operation.id)) {
        context.availableIds.delete(operation.id);
        context.edgeIds.delete(operation.id);
      }
      break;
    case "moveBlock":
      requireExistingId(operation.id, context, path, "moveBlock");
      break;
    case "insertAfter":
      validateInsertAfter(operation, context, path);
      break;
    case "batch":
      if (operation.operations.length === 0) {
        context.errors.push(`${path}: batch must contain at least one operation.`);
        break;
      }
      operation.operations.forEach((childOperation, childIndex) => {
        validateOperation(childOperation, context, `${path}.operations[${childIndex}]`);
      });
      break;
  }
}

function validateCreateBlock(
  block: Extract<PatchOperation, { op: "createBlock" }>["block"],
  context: ValidationContext,
  path: string,
) {
  if (!block?.id) {
    context.errors.push(`${path}: createBlock requires block.id.`);
    return;
  }

  if (context.availableIds.has(block.id)) {
    context.errors.push(`${path}: block id "${block.id}" already exists.`);
    return;
  }

  context.availableIds.add(block.id);
  if (block.type === "flowEdge") {
    context.edgeIds.add(block.id);
  } else {
    context.nodeIds.add(block.id);
  }
}

function validateCreateEdge(
  edge: Extract<PatchOperation, { op: "createEdge" }>["edge"],
  context: ValidationContext,
  path: string,
) {
  if (!edge?.id) {
    context.errors.push(`${path}: createEdge requires edge.id.`);
    return;
  }

  if (context.availableIds.has(edge.id)) {
    context.errors.push(`${path}: edge id "${edge.id}" already exists.`);
  }

  if (!context.nodeIds.has(edge.source)) {
    context.errors.push(`${path}: edge source "${edge.source}" does not exist.`);
  }

  if (!context.nodeIds.has(edge.target)) {
    context.errors.push(`${path}: edge target "${edge.target}" does not exist.`);
  }

  if (!context.availableIds.has(edge.id)) {
    context.availableIds.add(edge.id);
    context.edgeIds.add(edge.id);
  }
}

function validateInsertAfter(
  operation: Extract<PatchOperation, { op: "insertAfter" }>,
  context: ValidationContext,
  path: string,
) {
  if (!context.availableIds.has(operation.anchorId)) {
    context.errors.push(`${path}: anchorId "${operation.anchorId}" does not exist.`);
  }

  operation.blocks.forEach((block, index) => {
    validateCreateBlock(block, context, `${path}.blocks[${index}]`);
  });

  operation.edges.forEach((edge, index) => {
    validateCreateEdge(edge, context, `${path}.edges[${index}]`);
  });
}

function requireExistingId(
  id: string,
  context: ValidationContext,
  path: string,
  op: string,
) {
  if (!id) {
    context.errors.push(`${path}: ${op} requires id.`);
    return;
  }

  if (!context.availableIds.has(id)) {
    context.errors.push(`${path}: id "${id}" does not exist.`);
  }
}
