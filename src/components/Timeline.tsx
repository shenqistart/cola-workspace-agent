import { Activity, Check, Clock, RotateCcw } from "lucide-react";
import { describeOperation, describeOperationDetails } from "../agent/patchProtocol";
import { useCanvasStore } from "../store/useCanvasStore";
import { formatTime } from "../utils/time";

export function Timeline() {
  const activeOperations = useCanvasStore((state) => state.agent.activeOperations);
  const patchLog = useCanvasStore((state) => state.patchLog);
  const undoStack = useCanvasStore((state) => state.undoStack);

  return (
    <section className="min-h-0 flex-1 overflow-y-auto border-b border-[#d8e0ec] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#26344d]">
        <Activity size={16} />
        Timeline
      </div>

      {activeOperations.length > 0 ? (
        <div className="mb-4 rounded-md border border-[#cfe1f8] bg-[#f0f6ff] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[#4d83c6]">
            <Clock size={14} />
            Streaming operations
          </div>
          <div className="space-y-2">
            {activeOperations.map((operation, index) => (
              <div key={`${operation.op}-${index}`} className="text-xs text-[#26344d]">
                {index + 1}. {describeOperation(operation)}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {patchLog.length === 0 && undoStack.length === 0 ? (
          <p className="text-sm leading-5 text-[#63718a]">
            Patch commits and user drag transactions will appear here.
          </p>
        ) : null}

        {patchLog.map((entry) => (
          <article
            key={entry.id}
            className="rounded-md border border-[#d8e0ec] bg-[#f7f9fc] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#26344d]">
                <Check size={14} />
                {entry.status}
              </div>
              <span className="text-[11px] text-[#63718a]">
                {formatTime(entry.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium leading-5 text-[#52637d]">
              Agent · {entry.description}
            </p>
            <ul className="mt-2 space-y-1 text-[11px] leading-5 text-[#63718a]">
              {entry.operations.flatMap(describeOperationDetails).map((detail, index) => (
                <li key={`${entry.id}-${detail}-${index}`}>- {detail}</li>
              ))}
            </ul>
          </article>
        ))}

        {undoStack
          .slice(-4)
          .reverse()
          .map((transaction) => (
            <article
              key={transaction.id}
              className="rounded-md border border-[#e5dcc8] bg-[#fffaf0] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#3a3226]">
                  <RotateCcw size={14} />
                  {transaction.source}
                </div>
                <span className="text-[11px] text-[#7b6a50]">
                  {formatTime(transaction.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#6a5738]">{transaction.label}</p>
            </article>
          ))}
      </div>
    </section>
  );
}
