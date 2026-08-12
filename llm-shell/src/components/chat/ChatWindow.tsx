import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Markdown } from "@/components/common/Markdown";
import { ToolCallView } from "@/components/chat/ToolCallView";
import { PathLinkedText } from "@/components/chat/PathLinkedText";
import type { ContentPart } from "@/types";
import { recordSuccessTask } from "@/services/memory/successMemory";
import { appendRuleToAgents } from "@/services/rules/projectRules";

const ROLE_STYLES: Record<string, string> = {
  user: "text-accent-blue",
  assistant: "text-text-primary",
  system: "text-text-muted",
  tool: "text-text-muted",
};

function MessageRole({ role }: { role: string }) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-[0.05em] ${ROLE_STYLES[role] ?? "text-text-secondary"}`}
    >
      {role}
    </span>
  );
}

function messageDisplayText(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .map((p) => (p.type === "text" ? p.text : "[image]"))
    .join("\n");
}

export function ChatWindow() {
  const session = useChatStore((s) => {
    const { sessions, currentSessionId } = s;
    return sessions.find((x) => x.id === currentSessionId) ?? sessions[0];
  });
  const isStreaming = useChatStore((s) => s.isStreaming);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const messages = session.messages.filter((m) => m.role !== "system");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const prevStreaming = useRef(false);

  // Keep near bottom while user hasn't scrolled up; always jump to end when stream finishes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottom.current = dist < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const finished = prevStreaming.current && !isStreaming;
    prevStreaming.current = isStreaming;
    if (!stickToBottom.current && !finished) return;
    bottomRef.current?.scrollIntoView({ behavior: finished ? "smooth" : "auto", block: "end" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
        <p
          className="text-[15px] font-semibold tracking-tight text-text-primary text-pretty"
          translate="no"
        >
          LLM Shell
        </p>
        <p className="max-w-sm text-[12px] leading-relaxed text-text-secondary text-pretty">
          Settings → провайдер (Ollama / OpenAI-compatible). Файлы и команды — с подтверждением.
        </p>
      </div>
    );
  }

  const pinToAgents = async (id: string) => {
    const msg = session.messages.find((m) => m.id === id);
    if (!msg || msg.role !== "assistant" || msg.agentsPinned) return;
    const text = messageDisplayText(msg.content);
    const settings = useSettingsStore.getState().settings;
    const workspace = settings.agent.workingDirectory || settings.workspace.path;
    if (!workspace || text.length < 8) return;
    const idx = session.messages.indexOf(msg);
    const prevUser = [...session.messages]
      .slice(0, idx)
      .reverse()
      .find(
        (m) =>
          m.role === "user" &&
          !messageDisplayText(m.content).startsWith("[Model handoff"),
      );
    const userQuery = prevUser ? messageDisplayText(prevUser.content) : undefined;
    try {
      await appendRuleToAgents(workspace, text, userQuery);
      updateMessage(id, { agentsPinned: true });
    } catch {
      /* ignore */
    }
  };

  const acceptToRag = async (id: string) => {
    const msg = session.messages.find((m) => m.id === id);
    if (!msg || msg.role !== "assistant") return;
    const text = messageDisplayText(msg.content);
    const settings = useSettingsStore.getState().settings;
    const workspace = settings.agent.workingDirectory || settings.workspace.path;
    if (!workspace || text.length < 8) return;
    const idx = session.messages.indexOf(msg);
    const prevUser = [...session.messages]
      .slice(0, idx)
      .reverse()
      .find(
        (m) =>
          m.role === "user" &&
          !messageDisplayText(m.content).startsWith("[Model handoff"),
      );
    const userQuery = prevUser ? messageDisplayText(prevUser.content) : "Accepted answer";
    updateMessage(id, { pinned: true, feedback: "up" });
    try {
      await recordSuccessTask({
        workspacePath: workspace,
        projectId: settings.activeProjectId,
        sessionId: session.id,
        userQuery,
        solutionSummary: text,
        toolsUsed: msg.tool_calls?.map((t) => t.function.name) ?? [],
        filesTouched: [],
        settings,
        source: "user_accepted",
      });
    } catch {
      /* ignore */
    }
  };

  const setFeedback = (id: string, feedback: "up" | "down") => {
    const cur = session.messages.find((m) => m.id === id);
    const next = cur?.feedback === feedback ? undefined : feedback;
    updateMessage(id, { feedback: next });
    if (next === "up") void acceptToRag(id);
  };

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
      {messages.map((m) => {
        const text = messageDisplayText(m.content);
        return (
          <div
            key={m.id}
            className={`border-b border-border-muted/80 px-4 py-3 ${
              m.role === "user" ? "bg-bg-secondary/40" : ""
            }`}
          >
            <div className="mb-1.5 flex min-w-0 items-center gap-2">
              <MessageRole role={m.role} />
              {m.streaming && (
                <span className="animate-pulse text-[10px] text-text-muted">streaming…</span>
              )}
              {m.name && (
                <span className="min-w-0 truncate font-mono text-[10px] text-text-muted" translate="no">
                  {m.name}
                </span>
              )}
              {m.role === "assistant" && !m.streaming && text.length > 0 && (
                <div className="ml-auto flex items-center gap-0.5">
                  <button
                    type="button"
                    className={`ui-chrome-btn px-1.5 text-[11px] ${m.feedback === "up" ? "text-accent-green" : ""}`}
                    title="Принять → сохранить в Success RAG"
                    aria-pressed={m.feedback === "up"}
                    onClick={() => setFeedback(m.id, "up")}
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    className={`ui-chrome-btn px-1.5 text-[11px] ${m.feedback === "down" ? "text-accent-red" : ""}`}
                    title="Не полезно"
                    aria-pressed={m.feedback === "down"}
                    onClick={() => setFeedback(m.id, "down")}
                  >
                    👎
                  </button>
                  <button
                    type="button"
                    className={`ui-chrome-btn px-1.5 text-[11px] ${m.agentsPinned ? "text-accent-blue" : ""}`}
                    title="Закрепить как правило проекта в AGENTS.md"
                    aria-pressed={m.agentsPinned}
                    disabled={m.agentsPinned}
                    onClick={() => void pinToAgents(m.id)}
                  >
                    {m.agentsPinned ? "AGENTS ✓" : "📌 AGENTS"}
                  </button>
                  <button
                    type="button"
                    className={`ui-chrome-btn px-1.5 text-[11px] ${m.pinned ? "text-accent-blue" : ""}`}
                    title="Сохранить ответ в Success RAG"
                    onClick={() => void acceptToRag(m.id)}
                  >
                    {m.pinned ? "В RAG ✓" : "В RAG"}
                  </button>
                </div>
              )}
            </div>
            {m.role === "assistant" ? (
              <Markdown>{text}</Markdown>
            ) : (
              <PathLinkedText
                text={text}
                className="min-w-0 whitespace-pre-wrap break-words text-[13px] leading-relaxed"
              />
            )}
            {m.tool_calls?.map((tc) => (
              <ToolCallView key={tc.id} toolCall={tc} />
            ))}
            {m.streaming && (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-accent-blue"
              />
            )}
          </div>
        );
      })}
      <div ref={bottomRef} className="h-px w-full shrink-0" aria-hidden="true" />
    </div>
  );
}
