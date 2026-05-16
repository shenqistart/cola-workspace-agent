import { RotateCcw, RotateCw, RefreshCcw } from "lucide-react";
import { useCanvasStore } from "../store/useCanvasStore";

export function Toolbar() {
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const resetDemo = useCanvasStore((state) => state.resetDemo);
  const canUndo = useCanvasStore((state) => state.undoStack.length > 0);
  const canRedo = useCanvasStore((state) => state.redoStack.length > 0);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        title="Undo"
        onClick={undo}
        disabled={!canUndo}
        className="flex size-9 items-center justify-center rounded-md border border-[#d8e0ec] bg-white text-[#40506a] transition hover:border-[#91a4bd] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RotateCcw size={16} />
      </button>
      <button
        type="button"
        title="Redo"
        onClick={redo}
        disabled={!canRedo}
        className="flex size-9 items-center justify-center rounded-md border border-[#d8e0ec] bg-white text-[#40506a] transition hover:border-[#91a4bd] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RotateCw size={16} />
      </button>
      <button
        type="button"
        title="Reset demo"
        onClick={resetDemo}
        className="flex size-9 items-center justify-center rounded-md border border-[#d8e0ec] bg-white text-[#40506a] transition hover:border-[#91a4bd]"
      >
        <RefreshCcw size={16} />
      </button>
    </div>
  );
}
