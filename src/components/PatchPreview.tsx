import { FileJson2 } from "lucide-react";
import { describeOperation } from "../agent/patchProtocol";
import { useCanvasStore } from "../store/useCanvasStore";

export function PatchPreview() {
  const currentPatchDescription = useCanvasStore(
    (state) => state.agent.currentPatchDescription,
  );
  const currentPatchId = useCanvasStore((state) => state.agent.currentPatchId);
  const operations = useCanvasStore((state) => state.agent.activeOperations);
  const error = useCanvasStore((state) => state.agent.error);

  return (
    <section className="h-[220px] shrink-0 overflow-y-auto p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#26344d]">
        <FileJson2 size={16} />
        Patch Preview
      </div>

      {error ? (
        <div className="rounded-md border border-[#d87878] bg-[#fff1f1] p-3 text-xs leading-5 text-[#7b2f2f]">
          {error}
        </div>
      ) : null}

      {!currentPatchId && !error ? (
        <p className="text-sm leading-5 text-[#63718a]">
          当前没有正在应用的 patch。提交指令后会展示逐条 operation。
        </p>
      ) : null}

      {currentPatchId ? (
        <div className="rounded-md border border-[#d8e0ec] bg-[#f7f9fc] p-3">
          <div className="break-all text-xs uppercase tracking-normal text-[#63718a]">
            {currentPatchId}
          </div>
          <div className="mt-1 text-sm font-semibold text-[#26344d]">
            {currentPatchDescription}
          </div>
          <div className="mt-3 space-y-2">
            {operations.map((operation, index) => (
              <div
                key={`${operation.op}-${index}`}
                className="rounded-md bg-white px-2 py-1.5 text-xs text-[#40506a]"
              >
                {describeOperation(operation)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
