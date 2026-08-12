import { useEffect, useState } from "react";
import { lspSession } from "@/services/lsp/LspClient";
import { monacoLangToLsp, langFromPath } from "@/services/lsp/languages";
import { revealInEditor } from "@/services/ide/revealLine";
import { useWorkspaceUiStore } from "@/stores/workspaceUiStore";
import { useEditorStore } from "@/stores/editorStore";
import { useSettingsStore } from "@/stores/settingsStore";

interface SymbolNode {
  name: string;
  kind: number;
  line: number;
  character: number;
  children?: SymbolNode[];
}

function mapSymbols(raw: unknown): SymbolNode[] {
  if (!Array.isArray(raw)) return [];
  const out: SymbolNode[] = [];
  for (const item of raw) {
    const s = item as {
      name?: string;
      kind?: number;
      range?: { start: { line: number; character: number } };
      selectionRange?: { start: { line: number; character: number } };
      location?: { range?: { start: { line: number; character: number } } };
      children?: unknown[];
    };
    if (!s.name) continue;
    const start = s.selectionRange?.start ?? s.range?.start ?? s.location?.range?.start;
    if (!start) continue;
    out.push({
      name: s.name,
      kind: s.kind ?? 0,
      line: start.line,
      character: start.character,
      children: s.children ? mapSymbols(s.children) : undefined,
    });
  }
  return out;
}

function SymbolTree({ nodes, path, depth = 0 }: { nodes: SymbolNode[]; path: string; depth?: number }) {
  return (
    <ul className={depth ? "ml-3 border-l border-border-muted" : ""}>
      {nodes.map((n, i) => (
        <li key={`${n.name}:${n.line}:${i}`}>
          <button
            type="button"
            className="block w-full truncate px-2 py-0.5 text-left font-mono text-[11px] text-text-secondary hover:bg-bg-tertiary/60 hover:text-text-primary"
            style={{ paddingLeft: 8 + depth * 4 }}
            onClick={() => revealInEditor(path, n.line + 1, n.character + 1)}
            title={n.name}
          >
            {n.name}
          </button>
          {n.children && n.children.length > 0 && (
            <SymbolTree nodes={n.children} path={path} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function OutlinePanel() {
  const activePath = useWorkspaceUiStore((s) => s.activePath);
  const lspEnabled = useSettingsStore((s) => s.settings.editor?.lspEnabled);
  const draft = useEditorStore((s) => (activePath ? s.buffers[activePath]?.draft : undefined));
  const [symbols, setSymbols] = useState<SymbolNode[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activePath || !lspEnabled) {
        setSymbols([]);
        setHint(lspEnabled ? "Open a file tab" : "Enable LSP in Settings → Editor");
        return;
      }
      if (/\.(md|mdx|markdown)$/i.test(activePath)) {
        setSymbols([]);
        setHint("Outline not available for markdown preview");
        return;
      }
      setHint(null);
      try {
        const lang = monacoLangToLsp(langFromPath(activePath));
        const text = draft ?? "";
        await lspSession.didOpen(activePath, lang, text);
        const res = await lspSession.documentSymbol(activePath, lang);
        if (!cancelled) setSymbols(mapSymbols(res));
      } catch (err) {
        if (!cancelled) {
          setSymbols([]);
          setHint(err instanceof Error ? err.message.slice(0, 120) : "Outline unavailable");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePath, lspEnabled, draft]);

  if (!activePath) {
    return <div className="p-3 text-[11px] text-text-muted">No file open</div>;
  }

  if (hint) {
    return <div className="p-3 text-[11px] text-text-muted">{hint}</div>;
  }

  if (symbols.length === 0) {
    return <div className="p-3 text-[11px] text-text-muted">No symbols (LSP server may not support outline)</div>;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
      <SymbolTree nodes={symbols} path={activePath} />
    </div>
  );
}
