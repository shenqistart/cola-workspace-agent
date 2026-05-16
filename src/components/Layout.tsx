import { CanvasView } from "./CanvasView";
import { ChatPanel } from "./ChatPanel";
import { Header } from "./Header";
import { InspectorPanel } from "./InspectorPanel";
import { PatchPreview } from "./PatchPreview";
import { Timeline } from "./Timeline";

export function Layout() {
  return (
    <div className="flex h-screen min-h-[720px] flex-col bg-[#f7f9fc] text-[#152033]">
      <Header />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-[#d8e0ec] bg-white">
          <ChatPanel />
        </aside>
        <main className="min-w-0 flex-1 bg-[#eef3f8]">
          <CanvasView />
        </main>
        <aside className="flex w-[340px] shrink-0 flex-col border-l border-[#d8e0ec] bg-white">
          <InspectorPanel />
          <Timeline />
          <PatchPreview />
        </aside>
      </div>
    </div>
  );
}
