import { FileJson2 } from "lucide-react";
import type { AgentPatch, PatchOperation } from "../agent/patchProtocol";
import { describeOperation } from "../agent/patchProtocol";
import { useCanvasStore } from "../store/useCanvasStore";
import type { PatchLogEntry } from "../types/agent";
import type { CanvasBlock } from "../types/canvas";
import { isPositionedBlock } from "../types/canvas";

interface PatchPreviewData {
  id: string;
  description: string;
  affectedBlockIds: string[];
  operations: PatchOperation[];
  status: "applying" | PatchLogEntry["status"];
}

type OperationStatus = "applied" | "pending" | "rolled back";

export function PatchPreview() {
  const currentPatch = useCanvasStore((state) => state.agent.currentPatch);
  const activeOperations = useCanvasStore((state) => state.agent.activeOperations);
  const latestPatchLog = useCanvasStore((state) => state.patchLog[0]);
  const canvas = useCanvasStore((state) => state.canvas);
  const error = useCanvasStore((state) => state.agent.error);
  const preview = currentPatch
    ? agentPatchToPreview(currentPatch)
    : latestPatchLog
      ? patchLogEntryToPreview(latestPatchLog)
      : undefined;
  const preservedManualLayout = preview
    ? hasRelatedUserLayout(preview.operations, canvas.blocks)
    : false;

  return (
    <section className="h-[280px] shrink-0 overflow-y-auto p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#26344d]">
        <FileJson2 size={16} />
        Patch Preview
      </div>

      {error ? (
        <div className="rounded-md border border-[#d87878] bg-[#fff1f1] p-3 text-xs leading-5 text-[#7b2f2f]">
          {error}
        </div>
      ) : null}

      {!preview && !error ? (
        <p className="text-sm leading-5 text-[#63718a]">
          当前没有可预览的 patch。提交指令后会展示逐条 operation。
        </p>
      ) : null}

      {preview ? (
        <div className="rounded-md border border-[#d8e0ec] bg-[#f7f9fc] p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="break-all text-xs uppercase tracking-normal text-[#63718a]">
              {preview.id}
            </div>
            <span className="rounded border border-[#d8e0ec] bg-white px-1.5 py-0.5 text-[11px] uppercase tracking-normal text-[#63718a]">
              {preview.status}
            </span>
          </div>
          <div className="mt-1 text-sm font-semibold leading-5 text-[#26344d]">
            {preview.description}
          </div>
          <KeyList title="Affected blocks" values={preview.affectedBlockIds} />
          {preservedManualLayout ? (
            <div className="mt-3 rounded-md border border-[#b7dfc7] bg-[#f1fbf4] px-2 py-1.5 text-xs leading-5 text-[#315d3d]">
              已保留用户手动布局
            </div>
          ) : null}
          <div className="mt-3 space-y-2">
            {preview.operations.map((operation, index) => (
              <OperationCard
                key={`${operation.op}-${index}`}
                operation={operation}
                status={getOperationStatus(preview, operation, activeOperations)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OperationCard({
  operation,
  status,
}: {
  operation: PatchOperation;
  status: OperationStatus;
}) {
  return (
    <div className="rounded-md bg-white px-2 py-2 text-xs text-[#40506a]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-[#26344d]">{describeOperation(operation)}</span>
        <span className={status === "applied" ? "text-[#3f7d4b]" : "text-[#91a4bd]"}>
          {status}
        </span>
      </div>
      {operation.op === "insertAfter" ? (
        <div className="mt-2 space-y-1 text-[#52637d]">
          <div>anchorId: {operation.anchorId}</div>
          <div>layoutScope: {operation.layoutScope}</div>
          <KeyList title="new blocks" values={operation.blocks.map((block) => block.id)} />
          <KeyList title="new edges" values={operation.edges.map((edge) => edge.id)} />
        </div>
      ) : null}
    </div>
  );
}

function KeyList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="mt-2">
      <div className="text-[11px] font-semibold uppercase tracking-normal text-[#63718a]">
        {title}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={value}
              className="rounded border border-[#d8e0ec] bg-[#f7f9fc] px-1.5 py-0.5 text-[11px] text-[#40506a]"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-[#91a4bd]">none</span>
        )}
      </div>
    </div>
  );
}

function agentPatchToPreview(patch: AgentPatch): PatchPreviewData {
  return {
    id: patch.id,
    description: patch.description,
    affectedBlockIds: patch.affectedBlockIds,
    operations: patch.operations,
    status: "applying",
  };
}

function patchLogEntryToPreview(entry: PatchLogEntry): PatchPreviewData {
  return {
    id: entry.patchId,
    description: entry.description,
    affectedBlockIds: entry.affectedBlockIds,
    operations: entry.operations,
    status: entry.status,
  };
}

function getOperationStatus(
  preview: PatchPreviewData,
  operation: PatchOperation,
  activeOperations: PatchOperation[],
): OperationStatus {
  if (preview.status === "committed") {
    return "applied";
  }

  if (preview.status === "rolled_back") {
    return "rolled back";
  }

  return activeOperations.includes(operation) ? "applied" : "pending";
}

function hasRelatedUserLayout(
  operations: PatchOperation[],
  blocks: Record<string, CanvasBlock>,
) {
  return getRelatedBlockIds(operations).some((id) => {
    const block = blocks[id];
    return isPositionedBlock(block) && block.positionSource === "user";
  });
}

function getRelatedBlockIds(operations: PatchOperation[]): string[] {
  return operations.flatMap((operation) => {
    switch (operation.op) {
      case "createBlock":
        return [operation.block.id, operation.anchorId].filter(Boolean) as string[];
      case "updateBlock":
      case "deleteBlock":
      case "deleteEdge":
      case "moveBlock":
        return [operation.id];
      case "createEdge":
        return [operation.edge.id, operation.edge.source, operation.edge.target];
      case "insertAfter":
        return [
          operation.anchorId,
          ...operation.blocks.map((block) => block.id),
          ...operation.edges.flatMap((edge) => [edge.id, edge.source, edge.target]),
        ];
      case "batch":
        return getRelatedBlockIds(operation.operations);
    }
  });
}
