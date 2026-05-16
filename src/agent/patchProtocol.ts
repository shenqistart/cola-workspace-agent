import type {
  CanvasBlock,
  FlowEdgeBlock,
  Point,
  PositionSource,
} from "../types/canvas";

export type PatchOperation =
  | {
      op: "createBlock";
      block: CanvasBlock;
      anchorId?: string;
      layoutScope?: "local" | "branch" | "global";
    }
  | {
      op: "updateBlock";
      id: string;
      patch: Partial<CanvasBlock>;
      preserveUserLayout?: boolean;
      forceMove?: boolean;
    }
  | { op: "deleteBlock"; id: string }
  | { op: "createEdge"; edge: FlowEdgeBlock }
  | { op: "deleteEdge"; id: string }
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
      blocks: CanvasBlock[];
      edges: FlowEdgeBlock[];
      layoutScope: "local" | "branch" | "global";
    }
  | { op: "batch"; operations: PatchOperation[] };

export interface AgentPatch {
  id: string;
  description: string;
  baseVersion: number;
  affectedBlockIds: string[];
  operations: PatchOperation[];
  createdAt: number;
  summary?: string;
}

export function describeOperation(operation: PatchOperation) {
  switch (operation.op) {
    case "createBlock":
      return `Create block ${operation.block.id}`;
    case "updateBlock":
      return `Update block ${operation.id}`;
    case "deleteBlock":
      return `Delete block ${operation.id}`;
    case "createEdge":
      return `Create edge ${operation.edge.id}`;
    case "deleteEdge":
      return `Delete edge ${operation.id}`;
    case "moveBlock":
      return `Move block ${operation.id}`;
    case "insertAfter":
      return `Insert ${operation.blocks.length} block(s) after ${operation.anchorId}`;
    case "batch":
      return `Batch ${operation.operations.length} operation(s)`;
  }
}
