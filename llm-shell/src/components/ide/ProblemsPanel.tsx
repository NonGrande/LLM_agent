import { useDiagnosticsStore } from "@/stores/diagnosticsStore";
import { revealInEditor } from "@/services/ide/revealLine";
import type { LspDiagnostic } from "@/services/lsp/LspClient";

function severityLabel(s: number): string {
  if (s <= 1) return "error";
  if (s === 2) return "warn";
  return "info";
}

function severityClass(s: number): string {
  if (s <= 1) return "text-accent-red";
  if (s === 2) return "text-accent-yellow";
  return "text-text-muted";
}

export function ProblemsPanel() {
  const files = useDiagnosticsStore((s) => s.all());
  const counts = useDiagnosticsStore((s) => s.count());

  if (files.length === 0) {
    return (
      <div className="p-3 text-[11px] text-text-muted">
        No problems. Open a code file with LSP enabled in Settings → Editor.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border-muted px-3 py-1 text-[10px] text-text-muted">
        {counts.errors} errors · {counts.warnings} warnings
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {files.map(({ path, diagnostics }) =>
          diagnostics.map((d: LspDiagnostic, i: number) => (
            <li key={`${path}:${d.line}:${d.character}:${i}`}>
              <button
                type="button"
                className="flex w-full gap-2 px-3 py-1.5 text-left hover:bg-bg-tertiary/60"
                onClick={() => revealInEditor(path, d.line + 1, d.character + 1)}
              >
                <span className={`shrink-0 font-mono text-[10px] uppercase ${severityClass(d.severity)}`}>
                  {severityLabel(d.severity)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-text-primary">{d.message}</span>
                <span className="shrink-0 font-mono text-[10px] text-text-muted">
                  {path.split(/[/\\]/).pop()}:{d.line + 1}
                </span>
              </button>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
