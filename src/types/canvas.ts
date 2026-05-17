export type Actor = "user" | "agent" | "system";
export type BlockType =
  | "flowNode"
  | "flowEdge"
  | "textBlock"
  | "codeBlock"
  | "chartBlock";
export type PositionSource = "agent" | "layout" | "user";

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  semanticId?: string;
  version: number;
  createdBy: Actor;
  updatedBy: Actor;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

export type FlowNodeRole =
  | "start"
  | "input"
  | "decision"
  | "action"
  | "success"
  | "warning"
  | "error";

export type FlowEdgeRole = "primary" | "branch" | "retry" | "failure";

export interface FlowNodeBlock extends BaseBlock {
  type: "flowNode";
  label: string;
  description?: string;
  branchKey?: "registration" | "email" | "phone";
  semanticRole: FlowNodeRole;
  position: Point;
  size?: Size;
  positionSource: PositionSource;
}

export interface FlowEdgeBlock extends BaseBlock {
  type: "flowEdge";
  source: string;
  target: string;
  label?: string;
  branchKey?: "registration" | "email" | "phone";
  semanticRole: FlowEdgeRole;
  animated?: boolean;
}

export interface TextBlock extends BaseBlock {
  type: "textBlock";
  content: string;
  position: Point;
  size?: Size;
  positionSource: PositionSource;
}

export interface CodeBlock extends BaseBlock {
  type: "codeBlock";
  language: string;
  code: string;
  position: Point;
  size?: Size;
  positionSource: PositionSource;
}

export interface ChartBlock extends BaseBlock {
  type: "chartBlock";
  title: string;
  data: Record<string, unknown>;
  position: Point;
  size?: Size;
  positionSource: PositionSource;
}

export type CanvasBlock =
  | FlowNodeBlock
  | FlowEdgeBlock
  | TextBlock
  | CodeBlock
  | ChartBlock;

export interface ManualLayoutRecord {
  blockId: string;
  position: Point;
  reason: "drag" | "resize" | "lock";
  updatedAt: number;
  updatedBy: "user";
}

export type ManualLayoutMap = Record<string, ManualLayoutRecord>;

export interface CanvasSnapshot {
  blocks: Record<string, CanvasBlock>;
  blockOrder: string[];
  selectedBlockIds: string[];
  manualLayoutMap: ManualLayoutMap;
  version: number;
}

export function isFlowNodeBlock(block: CanvasBlock | undefined): block is FlowNodeBlock {
  return block?.type === "flowNode";
}

export function isFlowEdgeBlock(block: CanvasBlock | undefined): block is FlowEdgeBlock {
  return block?.type === "flowEdge";
}

export function isPositionedBlock(
  block: CanvasBlock | undefined,
): block is Exclude<CanvasBlock, FlowEdgeBlock> {
  return Boolean(block && "position" in block && "positionSource" in block);
}
