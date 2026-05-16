import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  GitBranch,
  Mail,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import type { FlowNodeBlock } from "../types/canvas";

export interface WorkspaceNodeData extends Record<string, unknown> {
  block: FlowNodeBlock;
}

const roleStyles: Record<FlowNodeBlock["semanticRole"], string> = {
  start: "border-[#6786b7] bg-[#f0f6ff]",
  input: "border-[#7ea9a5] bg-[#eef9f7]",
  decision: "border-[#c9a65b] bg-[#fff8e8]",
  action: "border-[#81a5d4] bg-[#f4f8fd]",
  success: "border-[#75ad7b] bg-[#f0fbf2]",
  warning: "border-[#d39d65] bg-[#fff5ed]",
  error: "border-[#d87878] bg-[#fff1f1]",
};

export function CanvasNode(props: NodeProps) {
  const data = props.data as WorkspaceNodeData;
  const block = data.block;
  const Icon = getRoleIcon(block.semanticRole);

  return (
    <div
      className={[
        "min-h-[84px] w-[190px] rounded-md border-2 px-3 py-3 shadow-sm transition",
        roleStyles[block.semanticRole],
        props.selected ? "ring-2 ring-[#4d83c6] ring-offset-2" : "",
      ].join(" ")}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-white/80 text-[#26344d]">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="break-words text-sm font-semibold leading-5 text-[#1f2a3d]">
            {block.label}
          </div>
          {block.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#52637d]">
              {block.description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-[#63718a]">
        <span>{block.branchKey ?? "workspace"}</span>
        <span>{block.positionSource}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function getRoleIcon(role: FlowNodeBlock["semanticRole"]) {
  switch (role) {
    case "start":
      return PlayCircle;
    case "input":
      return Mail;
    case "decision":
      return GitBranch;
    case "success":
      return CheckCircle2;
    case "warning":
      return AlertTriangle;
    case "error":
      return AlertTriangle;
    case "action":
      return ShieldCheck;
    default:
      return CircleDot;
  }
}
