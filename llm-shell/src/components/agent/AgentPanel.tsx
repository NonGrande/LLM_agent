import { useAgentStore } from "@/stores/agentStore";
import { formatDuration } from "@/utils/formatting";
import { useState } from "react";
import {
  checkpointFileCount,
  hasRestorableCheckpoint,
  restoreCheckpoint,
} from "@/services/agent/checkpoints";
import { useEditQueueStore } from "@/stores/editQueueStore";
import { useEditorStore } from "@/stores/editorStore";
import { readFile } from "@/services/tauri/fs";

const STATUS_LABEL: Record<string, string> = {
  idle: "Idle",
  thinking: "Thinking",
  executing_tool: "Tool",
  waiting_confirmation: "Confirm",
  error: "Error",
  stopped: "Stopped",
};

/** Slim agent strip for center column — does not occupy the right pane. */
export function AgentPanel() {
  const status = useAgentStore((s) => s.status);
  const iteration = useAgentStore((s) => s.iteration);
  const maxIterations = useAgentStore((s) => s.maxIterations);
  const toolLog = useAgentStore((s) => s.toolLog);
  const contextTokens = useAgentStore((s) => s.contextTokens);
  const activeSkills = useAgentStore((s) => s.activeSkills);
  const pending = useAgentStore((s) => s.pendingPermission);
  const resolvePermission = useAgentStore((s) => s.resolvePermission);
  const busy = status === "thinking" || status === "executing_tool";
  const [expanded, setExpanded] = useState(false);
  const canRestore = hasRestorableCheckpoint();
  const cpFiles = checkpointFileCount();

  const onRestore = async () => {
    if (!window.confirm(`Откатить ${cpFiles} файл(ов) к состоянию до agent run?`)) return;
    const { paths } = await restoreCheckpoint();
    useEditQueueStore.getState().clear();
    for (const p of paths) {
      try {
        const f = await readFile(p);
        if (!f.is_binary) useEditorStore.getState().reloadFromDisk(p, f.content);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="shrink-0 border-t border-border-default bg-bg-secondary">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-bg-tertiary/50"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="ui-section-label shrink-0">Agent</span>
        <span className="shrink-0 text-text-primary">{STATUS_LABEL[status] ?? status}</span>
        {busy && (
          <span
            className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-accent-blue border-t-transparent"
            aria-hidden="true"
          />
        )}
        <span className="shrink-0 tabular-nums text-text-muted">
          {iteration}/{maxIterations}
        </span>
        <span className="shrink-0 tabular-nums text-text-muted">
          {(contextTokens / 1000).toFixed(1)}K
        </span>
        {activeSkills.length > 0 && (
          <span className="min-w-0 max-w-[140px] truncate text-text-muted" title={activeSkills.join(", ")}>
            · {activeSkills.join(", ")}
          </span>
        )}
        <span className="ml-auto shrink-0 text-text-muted">
          {canRestore && (
            <button
              type="button"
              className="mr-2 text-accent-yellow hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                void onRestore();
              }}
            >
              Restore checkpoint ({cpFiles})
            </button>
          )}
          {expanded ? "▾" : "▸"} log
        </span>
      </button>

      {pending && (
        <div className="mx-2 mb-2 border border-accent-yellow/40 bg-accent-yellow/10 p-2.5 text-[12px]">
          <p className="mb-1 font-medium text-accent-yellow">Подтверждение</p>
          <p className="mb-2 leading-relaxed text-text-secondary">{pending.description}</p>
          <pre className="mb-2 max-h-24 overflow-auto rounded bg-bg-primary p-1.5 font-mono text-[10px]">
            {JSON.stringify(pending.details, null, 2)}
          </pre>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-accent-green px-2.5 py-1 text-[12px] text-white hover:brightness-110"
              onClick={() => resolvePermission(true)}
            >
              Allow
            </button>
            <button
              type="button"
              className="rounded bg-bg-tertiary px-2.5 py-1 text-[12px] text-text-primary hover:bg-border-default"
              onClick={() => resolvePermission(false)}
            >
              Deny
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="max-h-36 overflow-y-auto overscroll-contain border-t border-border-muted px-2 py-1.5">
          {toolLog.length === 0 && (
            <p className="px-1 text-[11px] text-text-muted">Пока нет вызовов инструментов.</p>
          )}
          {toolLog
            .slice()
            .reverse()
            .slice(0, 40)
            .map((t) => (
              <div
                key={t.id}
                className="mb-0.5 flex min-w-0 items-center gap-2 px-2 py-1 text-[11px] hover:bg-bg-primary/40"
              >
                <span className="shrink-0 font-mono text-accent-blue" translate="no">
                  {t.toolName}
                </span>
                <span className="shrink-0 text-text-muted">{t.status}</span>
                {t.completedAt && t.startedAt && (
                  <span className="shrink-0 tabular-nums text-text-muted">
                    {formatDuration(t.completedAt - t.startedAt)}
                  </span>
                )}
                {t.error && <span className="min-w-0 truncate text-accent-red">{t.error}</span>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
