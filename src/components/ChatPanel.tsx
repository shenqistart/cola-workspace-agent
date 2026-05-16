import { FormEvent, useState } from "react";
import { CornerDownLeft, Loader2, MessageSquareText } from "lucide-react";
import { examplePrompts } from "../agent/mockAgent";
import { useCanvasStore } from "../store/useCanvasStore";
import { formatTime } from "../utils/time";

export function ChatPanel() {
  const [draft, setDraft] = useState("");
  const messages = useCanvasStore((state) => state.agent.messages);
  const status = useCanvasStore((state) => state.agent.status);
  const submitUserMessage = useCanvasStore((state) => state.submitUserMessage);
  const isBusy = status === "thinking" || status === "applying";

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || isBusy) {
      return;
    }
    setDraft("");
    await submitUserMessage(content);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[#d8e0ec] px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#26344d]">
          <MessageSquareText size={16} />
          Chat Panel
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {examplePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setDraft(prompt)}
              className="rounded-md border border-[#d8e0ec] bg-[#f7f9fc] px-3 py-2 text-left text-xs leading-5 text-[#40506a] transition hover:border-[#91a4bd] hover:bg-white"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <article
            key={message.id}
            className={[
              "rounded-md border px-3 py-2",
              message.actor === "user"
                ? "border-[#9bb7df] bg-[#edf4ff]"
                : message.actor === "agent"
                  ? "border-[#b7dfc7] bg-[#f1fbf4]"
                  : "border-[#d8e0ec] bg-[#f7f9fc]",
            ].join(" ")}
          >
            <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-normal text-[#63718a]">
              <span>{message.actor}</span>
              <span>{formatTime(message.createdAt)}</span>
            </div>
            <p className="text-sm leading-5 text-[#26344d]">{message.content}</p>
          </article>
        ))}
      </div>

      <form onSubmit={submit} className="border-t border-[#d8e0ec] p-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="输入需求，例如：把手机验证那条路径加一个短信发送失败的重试逻辑"
          className="h-28 w-full resize-none rounded-md border border-[#cbd6e4] bg-white px-3 py-2 text-sm leading-5 outline-none transition placeholder:text-[#91a4bd] focus:border-[#4d83c6] focus:ring-2 focus:ring-[#cfe1f8]"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isBusy}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#152033] px-4 text-sm font-semibold text-white transition hover:bg-[#26344d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? <Loader2 className="animate-spin" size={16} /> : <CornerDownLeft size={16} />}
          Send Patch Request
        </button>
      </form>
    </section>
  );
}
