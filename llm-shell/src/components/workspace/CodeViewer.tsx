import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { readFile } from "@/services/tauri/fs";
import { isTauri } from "@/utils/env";
import { errorMessage } from "@/utils/errors";
import { Markdown } from "@/components/common/Markdown";
import { useEditorStore } from "@/stores/editorStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useIdeStore } from "@/stores/ideStore";
import { registerGhostTextProvider } from "@/services/editor/ghostText";
import { lspSession, monacoLangToLsp } from "@/services/lsp/LspClient";
import { langFromPath } from "@/services/lsp/languages";
import { acquireMonacoLspBridge, bindEditorLspKeys } from "@/services/lsp/monacoLspBridge";

function isMarkdown(path: string): boolean {
  return /\.(md|mdx|markdown)$/i.test(path);
}

export function CodeViewer({ path }: { path: string }) {
  const initBuffer = useEditorStore((s) => s.initBuffer);
  const setDraft = useEditorStore((s) => s.setDraft);
  const reloadFromDisk = useEditorStore((s) => s.reloadFromDisk);
  const saveToDisk = useEditorStore((s) => s.save);
  const isDirty = useEditorStore((s) => s.isDirty(path));
  const draft = useEditorStore((s) => s.buffers[path]?.draft);
  const ghostEnabled = useSettingsStore((s) => s.settings.editor?.ghostTextEnabled);
  const lspEnabled = useSettingsStore((s) => s.settings.editor?.lspEnabled);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"preview" | "source">("preview");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lspHint, setLspHint] = useState<string | null>(null);
  const md = isMarkdown(path);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const disposables = useRef<Array<{ dispose: () => void }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setSaveError(null);
      if (!isTauri()) {
        setLoadError("Code viewer requires Tauri.");
        setLoading(false);
        return;
      }
      try {
        const file = await readFile(path);
        if (cancelled) return;
        if (file.is_binary) {
          setLoadError("Binary file — preview only.");
          setLoading(false);
          return;
        }
        initBuffer(path, file.content);
        reloadFromDisk(path, file.content);
      } catch (err) {
        if (!cancelled) setLoadError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, initBuffer, reloadFromDisk]);

  useEffect(() => {
    setMode(isMarkdown(path) ? "preview" : "source");
  }, [path]);

  useEffect(() => {
    return () => {
      for (const d of disposables.current) d.dispose();
      disposables.current = [];
    };
  }, []);

  useEffect(() => {
    const onReveal = (ev: Event) => {
      const detail = (ev as CustomEvent<{ path: string; line: number; column: number }>).detail;
      if (
        !detail ||
        detail.path.replace(/\\/g, "/").toLowerCase() !== path.replace(/\\/g, "/").toLowerCase()
      ) {
        return;
      }
      const ed = editorRef.current;
      if (!ed) return;
      ed.revealPositionInCenter({ lineNumber: detail.line, column: detail.column });
      ed.setPosition({ lineNumber: detail.line, column: detail.column });
      ed.focus();
    };
    window.addEventListener("llm-shell:reveal-line", onReveal);
    return () => window.removeEventListener("llm-shell:reveal-line", onReveal);
  }, [path]);

  useEffect(() => {
    const onInline = (ev: Event) => {
      const detail = (
        ev as CustomEvent<{
          path: string;
          startLine: number;
          startColumn: number;
          endLine: number;
          endColumn: number;
          text: string;
        }>
      ).detail;
      if (
        !detail ||
        detail.path.replace(/\\/g, "/").toLowerCase() !== path.replace(/\\/g, "/").toLowerCase()
      ) {
        return;
      }
      const ed = editorRef.current;
      const model = ed?.getModel();
      if (!ed || !model) return;
      ed.executeEdits("inline-edit", [
        {
          range: {
            startLineNumber: detail.startLine,
            startColumn: detail.startColumn,
            endLineNumber: detail.endLine,
            endColumn: detail.endColumn,
          },
          text: detail.text,
        },
      ]);
      setDraft(path, model.getValue());
    };
    window.addEventListener("llm-shell:inline-edit-apply", onInline);
    return () => window.removeEventListener("llm-shell:inline-edit-apply", onInline);
  }, [path, setDraft]);

  useEffect(() => {
    if (!lspEnabled || md) return;
    const text = draft ?? "";
    const lang = monacoLangToLsp(langFromPath(path));
    const t = setTimeout(() => {
      void lspSession.didOpen(path, lang, text).catch((err) => {
        setLspHint(errorMessage(err).slice(0, 160));
      });
    }, 400);
    return () => clearTimeout(t);
  }, [path, draft, lspEnabled, md]);

  useEffect(() => {
    if (!lspEnabled) return;
    return lspSession.onStatus((_lang, status) => {
      setLspHint(status.slice(0, 240));
    });
  }, [lspEnabled]);

  useEffect(() => {
    if (!lspEnabled) return;
    const unsub = lspSession.onDiagnostics((uri, diags) => {
      const monaco = monacoRef.current;
      const model = editorRef.current?.getModel();
      if (!monaco || !model) return;
      const fileUri = path.replace(/\\/g, "/");
      const base = fileUri.split("/").pop() ?? "";
      if (
        !uri.replace(/\\/g, "/").toLowerCase().endsWith(fileUri.toLowerCase()) &&
        !uri.toLowerCase().includes(base.toLowerCase())
      ) {
        return;
      }
      monaco.editor.setModelMarkers(
        model,
        "lsp",
        diags.map((d) => ({
          message: d.message,
          severity:
            d.severity <= 1
              ? monaco.MarkerSeverity.Error
              : d.severity === 2
                ? monaco.MarkerSeverity.Warning
                : monaco.MarkerSeverity.Info,
          startLineNumber: d.line + 1,
          startColumn: d.character + 1,
          endLineNumber: d.endLine + 1,
          endColumn: Math.max(d.endCharacter + 1, d.character + 2),
        })),
      );
    });
    return unsub;
  }, [lspEnabled, path]);

  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    const result = await saveToDisk(path);
    setSaving(false);
    if (!result.ok) setSaveError(result.error);
    else if (lspEnabled && !md) {
      void lspSession.didSave(path, monacoLangToLsp(langFromPath(path)), draft ?? undefined);
    }
  }, [path, saveToDisk, lspEnabled, md, draft]);

  const onMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      for (const d of disposables.current) d.dispose();
      disposables.current = [];

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        void save();
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
        useIdeStore.getState().setModal("inlineEdit");
      });

      const syncSelection = () => {
        const sel = editor.getSelection();
        const model = editor.getModel();
        if (!sel || !model || sel.isEmpty()) {
          useIdeStore.getState().setSelection(null);
          return;
        }
        const text = model.getValueInRange(sel);
        useIdeStore.getState().setSelection({
          path,
          text,
          startLine: sel.startLineNumber,
          startColumn: sel.startColumn,
          endLine: sel.endLineNumber,
          endColumn: sel.endColumn,
        });
      };
      disposables.current.push(editor.onDidChangeCursorSelection(syncSelection));
      syncSelection();

      const lang = langFromPath(path);
      if (ghostEnabled) {
        disposables.current.push(registerGhostTextProvider(monaco, lang));
        if (lang === "typescript") {
          disposables.current.push(registerGhostTextProvider(monaco, "javascript"));
        }
      }

      if (lspEnabled) {
        disposables.current.push(acquireMonacoLspBridge(monaco));
        disposables.current.push(bindEditorLspKeys(editor, monaco));
      }
    },
    [save, path, ghostEnabled, lspEnabled],
  );

  if (loading) return <div className="p-3 text-[12px] text-text-muted">Loading…</div>;
  if (loadError) return <div className="p-3 text-[12px] text-accent-red">{loadError}</div>;

  const content = draft ?? "";
  const showEditor = !md || mode === "source";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-border-default bg-bg-secondary px-2 py-1">
        {md && (
          <>
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-[11px] ${mode === "preview" ? "bg-bg-tertiary text-text-primary" : "text-text-secondary hover:bg-bg-tertiary/60 hover:text-text-primary"}`}
              onClick={() => setMode("preview")}
            >
              Preview
            </button>
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-[11px] ${mode === "source" ? "bg-bg-tertiary text-text-primary" : "text-text-secondary hover:bg-bg-tertiary/60 hover:text-text-primary"}`}
              onClick={() => setMode("source")}
            >
              Source
            </button>
          </>
        )}
        {showEditor && (
          <button
            type="button"
            className="rounded px-2 py-0.5 text-[11px] text-text-secondary hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-40"
            onClick={() => void save()}
            disabled={!isDirty || saving}
            title="Ctrl+S"
          >
            {saving ? "Saving…" : isDirty ? "Save •" : "Saved"}
          </button>
        )}
        {(ghostEnabled || lspEnabled) && (
          <span className="text-[10px] text-text-muted">
            {ghostEnabled ? "ghost" : ""}
            {ghostEnabled && lspEnabled ? " · " : ""}
            {lspEnabled ? "lsp" : ""}
          </span>
        )}
        <span className="ml-auto min-w-0 truncate font-mono text-[10px] text-text-muted" title={path}>
          {path.replace(/\\/g, "/").split("/").pop()}
          {isDirty && showEditor ? " *" : ""}
        </span>
      </div>
      {saveError && (
        <div className="shrink-0 border-b border-accent-red/30 bg-accent-red/10 px-2 py-1 text-[11px] text-accent-red">
          {saveError}
        </div>
      )}
      {lspHint && lspEnabled && (
        <div className="shrink-0 border-b border-border-muted bg-bg-tertiary/40 px-2 py-1 text-[10px] text-text-secondary">
          {lspHint}
        </div>
      )}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {md && mode === "preview" ? (
          <div className="h-full overflow-y-auto overscroll-contain px-4 py-3">
            <Markdown>{content}</Markdown>
          </div>
        ) : (
          <Editor
            height="100%"
            theme="vs-dark"
            language={langFromPath(path)}
            path={path}
            value={content}
            onMount={onMount}
            onChange={(value) => setDraft(path, value ?? "")}
            options={{
              readOnly: false,
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              wordWrap: md ? "on" : "off",
              inlineSuggest: { enabled: Boolean(ghostEnabled) },
              quickSuggestions: lspEnabled ? true : undefined,
              suggestOnTriggerCharacters: Boolean(lspEnabled),
            }}
          />
        )}
      </div>
    </div>
  );
}
