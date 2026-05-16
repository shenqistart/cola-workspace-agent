import { Bot, GitPullRequestArrow, Sparkles } from "lucide-react";
import { useCanvasStore } from "../store/useCanvasStore";
import { Toolbar } from "./Toolbar";

export function Header() {
  const status = useCanvasStore((state) => state.agent.status);
  const version = useCanvasStore((state) => state.canvas.version);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#d8e0ec] bg-white px-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-[#152033] text-white">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-normal">Cola Workspace Agent</h1>
          <p className="text-xs text-[#63718a]">
            React Flow workspace · Agent Patch Protocol · v{version}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-md border border-[#d8e0ec] px-3 py-2 text-sm text-[#40506a]">
          <Bot size={16} />
          <span className="capitalize">{status}</span>
        </div>
        <div className="hidden items-center gap-2 text-sm text-[#63718a] lg:flex">
          <GitPullRequestArrow size={16} />
          <span>Incremental patches preserve manual layout</span>
        </div>
        <Toolbar />
      </div>
    </header>
  );
}
