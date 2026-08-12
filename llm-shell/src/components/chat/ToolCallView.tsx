import { useState } from "react";
import type { ToolCall } from "@/types";
import { useAgentStore } from "@/stores/agentStore";

export function ToolCallView({ toolCall, result }: { toolCall: ToolCall; result?: string }) {
  const [open, setOpen] = useState(false);
  const toolLog = useAgentStore((s) => s.toolLog);
  const exec = toolLog.find((t) => t.toolCallId === toolCall.id || t.toolName === toolCall.function.name);

  let argsPreview = toolCall.function.arguments;
  try {
    argsPreview = JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2);
  } catch {
    /* keep raw */
  }

  const status = exec?.status;
  const statusLabel =
    status === "success"
      ? "✓"
      : status === "error"
        ? "✕"
        : status === "running"
          ? "…"
          : status === "cancelled"
            ? "⊘"
            : "·";
  const statusClass =
    status === "success"
      ? "text-accent-green"
      : status === "error"
        ? "text-accent-red"
        : status === "running"
          ? "text-accent-yellow animate-pulse"
          : "text-text-muted";

  const resultText =
    result ??
    (exec?.result != null
      ? JSON.stringify(exec.result).slice(0, 4000)
      : exec?.error
        ? exec.error
        : undefined);

  return (
    <div className="my-2 overflow-hidden rounded border border-border-default bg-bg-secondary">
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-bg-tertiary/40"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="shrink-0 text-text-muted" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
        <span className={`shrink-0 font-mono text-[11px] ${statusClass}`} aria-hidden="true">
          {statusLabel}
        </span>
        <span className="ui-section-label shrink-0 normal-case tracking-normal">tool</span>
        <span className="min-w-0 truncate font-mono text-accent-blue" translate="no">
          {toolCall.function.name}
        </span>
        {exec?.completedAt && exec.startedAt && (
          <span className="ml-auto shrink-0 font-mono text-[9px] tabular-nums text-text-muted">
            {Math.max(0, exec.completedAt - exec.startedAt)}ms
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-border-muted px-3 py-2">
          <div className="ui-section-label mb-1">args</div>
          <pre className="mb-2 max-h-48 overflow-x-auto overscroll-contain font-mono text-[11px] text-text-secondary">
            {argsPreview}
          </pre>
          {resultText && (
            <>
              <div className="ui-section-label mb-1">
                {status === "error" ? "error" : "result"}
              </div>
              <pre className="max-h-40 overflow-auto overscroll-contain rounded bg-bg-primary p-2 font-mono text-[11px]">
                {resultText.slice(0, 4000)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
