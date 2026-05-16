import { Inspect, MapPin, UserRoundCheck } from "lucide-react";
import { useCanvasStore } from "../store/useCanvasStore";
import { isFlowEdgeBlock, isPositionedBlock } from "../types/canvas";

export function InspectorPanel() {
  const canvas = useCanvasStore((state) => state.canvas);
  const selectedId = canvas.selectedBlockIds[0];
  const block = selectedId ? canvas.blocks[selectedId] : undefined;
  const manualLayout = selectedId ? canvas.manualLayoutMap[selectedId] : undefined;

  return (
    <section className="border-b border-[#d8e0ec] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#26344d]">
        <Inspect size={16} />
        Inspector
      </div>

      {!block ? (
        <p className="text-sm leading-5 text-[#63718a]">
          选择一个节点查看语义、位置来源和布局保护状态。
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-normal text-[#63718a]">Block</div>
            <div className="mt-1 break-all font-semibold text-[#26344d]">{block.id}</div>
          </div>
          <KeyValue label="Type" value={block.type} />
          <KeyValue label="Version" value={String(block.version)} />
          {isFlowEdgeBlock(block) ? (
            <>
              <KeyValue label="Source" value={block.source} />
              <KeyValue label="Target" value={block.target} />
            </>
          ) : null}
          {isPositionedBlock(block) ? (
            <>
              <div className="rounded-md border border-[#d8e0ec] bg-[#f7f9fc] p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[#63718a]">
                  <MapPin size={14} />
                  Position
                </div>
                <div className="grid grid-cols-2 gap-2 text-[#26344d]">
                  <span>x {Math.round(block.position.x)}</span>
                  <span>y {Math.round(block.position.y)}</span>
                </div>
                <div className="mt-2 text-xs text-[#63718a]">
                  source: {block.positionSource}
                </div>
              </div>
              {manualLayout ? (
                <div className="rounded-md border border-[#b7dfc7] bg-[#f1fbf4] p-3 text-xs leading-5 text-[#315d3d]">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <UserRoundCheck size={14} />
                    Manual layout protected
                  </div>
                  Agent patches cannot overwrite this position unless they set
                  forceMove.
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#edf1f6] pb-2">
      <span className="text-xs uppercase tracking-normal text-[#63718a]">{label}</span>
      <span className="break-all text-right text-[#26344d]">{value}</span>
    </div>
  );
}
