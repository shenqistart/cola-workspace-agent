import type {
  Actor,
  CanvasSnapshot,
  FlowEdgeBlock,
  FlowEdgeRole,
  FlowNodeBlock,
  FlowNodeRole,
  Point,
} from "../types/canvas";
import { now } from "./time";

export const NODE_SIZE = {
  width: 190,
  height: 84,
};

export function createEmptyCanvasSnapshot(): CanvasSnapshot {
  return {
    blocks: {},
    blockOrder: [],
    selectedBlockIds: [],
    manualLayoutMap: {},
    version: 0,
  };
}

export function createFlowNode(input: {
  id: string;
  label: string;
  description?: string;
  position: Point;
  semanticId?: string;
  semanticRole: FlowNodeRole;
  branchKey?: FlowNodeBlock["branchKey"];
  createdBy?: Actor;
}): FlowNodeBlock {
  const timestamp = now();
  const createdBy = input.createdBy ?? "agent";

  return {
    id: input.id,
    type: "flowNode",
    semanticId: input.semanticId,
    version: 1,
    createdBy,
    updatedBy: createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    label: input.label,
    description: input.description,
    branchKey: input.branchKey,
    semanticRole: input.semanticRole,
    position: input.position,
    size: NODE_SIZE,
    positionSource: "agent",
  };
}

export function createFlowEdge(input: {
  id: string;
  source: string;
  target: string;
  label?: string;
  semanticId?: string;
  semanticRole?: FlowEdgeRole;
  branchKey?: FlowEdgeBlock["branchKey"];
  animated?: boolean;
  createdBy?: Actor;
}): FlowEdgeBlock {
  const timestamp = now();
  const createdBy = input.createdBy ?? "agent";

  return {
    id: input.id,
    type: "flowEdge",
    semanticId: input.semanticId,
    version: 1,
    createdBy,
    updatedBy: createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    source: input.source,
    target: input.target,
    label: input.label,
    branchKey: input.branchKey,
    semanticRole: input.semanticRole ?? "primary",
    animated: input.animated,
  };
}
