import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildIdeCommands, filterCommands, type IdeCommand } from "@/services/ide/ideCommands";
import { rankByQuery } from "@/services/ide/fuzzyScore";
import { revealInEditor } from "@/services/ide/revealLine";
import { runInlineEdit } from "@/services/ide/inlineEdit";
import { collectIndexableFiles } from "@/services/index/collectFiles";
import { grepSearch } from "@/services/tauri/search";
import { useIdeStore } from "@/stores/ideStore";
import { useFileStore } from "@/stores/fileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWorkspaceUiStore } from "@/stores/workspaceUiStore";
import type { GrepMatch } from "@/types";

interface CommandPaletteProps {
  mode: "palette" | "quickOpen";
  onClose: () => void;
}

export function CommandPalette({ mode, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo(() => {
    if (mode === "quickOpen") return [];
    return filterCommands(buildIdeCommands(), query);
  }, [mode, query]);

  const title = mode === "quickOpen" ? "Go to File" : "Command Palette";
  const placeholder = mode === "quickOpen" ? "Type a file name…" : "Type a command…";

  useEffect(() => {
    inputRef.current?.focus();
    setQuery("");
    setIdx(0);
  }, [mode]);

  const run = useCallback(
    (cmd: IdeCommand) => {
      onClose();
      void cmd.run();
    },
    [onClose],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (mode === "quickOpen") {
    return (
      <QuickOpenOverlay query={query} setQuery={setQuery} onClose={onClose} title={title} placeholder={placeholder} />
    );
  }

  return (
    <div
      className="ui-modal-scrim fixed inset-0 z-[70] flex items-start justify-center bg-black/55 pt-[12vh] p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ui-modal w-full max-w-xl overflow-hidden" role="dialog" aria-label={title}>
        <input
          ref={inputRef}
          className="w-full border-b border-border-default bg-bg-primary px-4 py-3 text-[13px] text-text-primary outline-none"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIdx(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIdx((i) => Math.min(i + 1, Math.max(0, commands.length - 1)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIdx((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && commands[idx]) {
              e.preventDefault();
              run(commands[idx]!);
            }
          }}
        />
        <ul className="max-h-[50vh] overflow-y-auto overscroll-contain py-1">
          {commands.length === 0 ? (
            <li className="px-4 py-3 text-[12px] text-text-muted">No matching commands</li>
          ) : (
            commands.map((cmd, i) => (
              <li key={cmd.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-[12px] ${
                    i === idx ? "bg-bg-tertiary text-text-primary" : "text-text-secondary hover:bg-bg-tertiary/60"
                  }`}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => run(cmd)}
                >
                  <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
                  <span className="shrink-0 text-[10px] text-text-muted">{cmd.category}</span>
                  {cmd.shortcut && (
                    <span className="shrink-0 font-mono text-[10px] text-text-muted">{cmd.shortcut}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function QuickOpenOverlay({
  query,
  setQuery,
  onClose,
  title,
  placeholder,
}: {
  query: string;
  setQuery: (q: string) => void;
  onClose: () => void;
  title: string;
  placeholder: string;
}) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootPath = useFileStore((s) => s.rootPath);
  const openFile = useWorkspaceUiStore((s) => s.openFile);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!rootPath) {
        setFiles([]);
        return;
      }
      setLoading(true);
      try {
        const hits = await collectIndexableFiles(rootPath);
        if (!cancelled) setFiles(hits);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  const ranked = useMemo(() => {
    const base = query.trim() ? rankByQuery(files, query, (p) => p.replace(/\\/g, "/")) : files.slice(0, 80);
    return base.slice(0, 50);
  }, [files, query]);

  const openPath = (path: string) => {
    openFile(path);
    onClose();
  };

  return (
    <div
      className="ui-modal-scrim fixed inset-0 z-[70] flex items-start justify-center bg-black/55 pt-[12vh] p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ui-modal w-full max-w-xl overflow-hidden" role="dialog" aria-label={title}>
        <input
          ref={inputRef}
          className="w-full border-b border-border-default bg-bg-primary px-4 py-3 text-[13px] text-text-primary outline-none"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIdx(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIdx((i) => Math.min(i + 1, Math.max(0, ranked.length - 1)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIdx((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && ranked[idx]) {
              e.preventDefault();
              openPath(ranked[idx]!);
            }
          }}
        />
        <ul className="max-h-[50vh] overflow-y-auto overscroll-contain py-1">
          {loading ? (
            <li className="px-4 py-3 text-[12px] text-text-muted">Loading files…</li>
          ) : !rootPath ? (
            <li className="px-4 py-3 text-[12px] text-text-muted">Open a workspace folder first</li>
          ) : ranked.length === 0 ? (
            <li className="px-4 py-3 text-[12px] text-text-muted">No matching files</li>
          ) : (
            ranked.map((path, i) => (
              <li key={path}>
                <button
                  type="button"
                  className={`block w-full truncate px-4 py-2 text-left font-mono text-[11px] ${
                    i === idx ? "bg-bg-tertiary text-text-primary" : "text-text-secondary hover:bg-bg-tertiary/60"
                  }`}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => openPath(path)}
                  title={path}
                >
                  {path.replace(/\\/g, "/")}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export function IdeModals() {
  const modal = useIdeStore((s) => s.modal);
  const closeModal = useIdeStore((s) => s.closeModal);

  if (modal === "palette") return <CommandPalette mode="palette" onClose={closeModal} />;
  if (modal === "quickOpen") return <CommandPalette mode="quickOpen" onClose={closeModal} />;
  if (modal === "find") return <FindInFilesModal onClose={closeModal} />;
  if (modal === "inlineEdit") return <InlineEditModal onClose={closeModal} />;
  return null;
}

function FindInFilesModal({ onClose }: { onClose: () => void }) {
  const rootPath = useFileStore((s) => s.rootPath);
  const [pattern, setPattern] = useState("");
  const [results, setResults] = useState<GrepMatch[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = async () => {
    if (!rootPath || !pattern.trim()) return;
    setBusy(true);
    try {
      const hits = await grepSearch(pattern.trim(), rootPath, undefined, true);
      setResults(hits.slice(0, 200));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="ui-modal-scrim fixed inset-0 z-[70] flex items-start justify-center bg-black/55 pt-[10vh] p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ui-modal flex w-full max-w-2xl flex-col overflow-hidden" role="dialog" aria-label="Find in Files">
        <div className="flex gap-2 border-b border-border-default p-2">
          <input
            ref={inputRef}
            className="min-w-0 flex-1 rounded border border-border-default bg-bg-primary px-3 py-2 text-[12px] outline-none"
            placeholder="Search pattern (regex)…"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
              if (e.key === "Escape") onClose();
            }}
          />
          <button type="button" className="ui-chrome-btn px-3" disabled={busy} onClick={() => void search()}>
            {busy ? "…" : "Find"}
          </button>
        </div>
        <ul className="max-h-[55vh] overflow-y-auto overscroll-contain py-1">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-[12px] text-text-muted">{busy ? "Searching…" : "No results yet"}</li>
          ) : (
            results.map((r, i) => (
              <li key={`${r.file_path}:${r.line_number}:${i}`}>
                <button
                  type="button"
                  className="block w-full px-4 py-1.5 text-left hover:bg-bg-tertiary/60"
                  onClick={() => {
                    revealInEditor(r.file_path, r.line_number, 1);
                    onClose();
                  }}
                >
                  <div className="truncate font-mono text-[10px] text-accent-blue">
                    {r.file_path.replace(/\\/g, "/")}:{r.line_number}
                  </div>
                  <div className="truncate font-mono text-[11px] text-text-secondary">{r.line_content.trim()}</div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function InlineEditModal({ onClose }: { onClose: () => void }) {
  const selection = useIdeStore((s) => s.selection);
  const settings = useSettingsStore((s) => s.settings);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const apply = async () => {
    if (!selection?.text.trim() || !instruction.trim()) {
      setError("Select code in the editor and enter an instruction.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const replacement = await runInlineEdit(settings, {
        filePath: selection.path,
        selection: selection.text,
        instruction: instruction.trim(),
      });
      window.dispatchEvent(
        new CustomEvent("llm-shell:inline-edit-apply", {
          detail: {
            path: selection.path,
            startLine: selection.startLine,
            startColumn: selection.startColumn,
            endLine: selection.endLine,
            endColumn: selection.endColumn,
            text: replacement,
          },
        }),
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="ui-modal-scrim fixed inset-0 z-[70] flex items-start justify-center bg-black/55 pt-[15vh] p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ui-modal w-full max-w-lg overflow-hidden p-4" role="dialog" aria-label="Inline Edit">
        <p className="mb-2 text-[12px] font-medium text-text-primary">Inline Edit (Ctrl+K)</p>
        {!selection?.text ? (
          <p className="mb-3 text-[11px] text-text-muted">Select code in Monaco first.</p>
        ) : (
          <pre className="mb-3 max-h-24 overflow-auto rounded border border-border-muted bg-bg-tertiary p-2 font-mono text-[10px] text-text-secondary">
            {selection.text.slice(0, 400)}
            {selection.text.length > 400 ? "…" : ""}
          </pre>
        )}
        <input
          ref={inputRef}
          className="mb-2 w-full rounded border border-border-default bg-bg-primary px-3 py-2 text-[12px] outline-none"
          placeholder="Instruction (e.g. add error handling)…"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void apply();
            if (e.key === "Escape") onClose();
          }}
        />
        {error && <p className="mb-2 text-[11px] text-accent-red">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="ui-chrome-btn px-3" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ui-chrome-btn px-3 text-text-primary" disabled={busy} onClick={() => void apply()}>
            {busy ? "…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
