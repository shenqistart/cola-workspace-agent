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
      return `createBlock ${operation.block.id}`;
    case "updateBlock":
      return `updateBlock ${operation.id}`;
    case "deleteBlock":
      return `deleteBlock ${operation.id}`;
    case "createEdge":
      return `createEdge ${operation.edge.id}`;
    case "deleteEdge":
      return `deleteEdge ${operation.id}`;
    case "moveBlock":
      return `moveBlock ${operation.id}`;
    case "insertAfter":
      return `insertAfter ${operation.anchorId}`;
    case "batch":
      return `batch ${operation.operations.length} operation(s)`;
  }
}

export function describeOperationDetails(operation: PatchOperation): string[] {
  switch (operation.op) {
    case "insertAfter":
      return [
        `insertAfter ${operation.anchorId}`,
        ...operation.blocks.map((block) => `create ${block.id}`),
        ...operation.edges.map((edge) => `createEdge ${edge.id}`),
      ];
    case "batch":
      return operation.operations.flatMap(describeOperationDetails);
    default:
      return [describeOperation(operation)];
  }
}
