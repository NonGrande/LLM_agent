import type { Monaco } from "@monaco-editor/react";
import type {
  CancellationToken,
  IDisposable,
  IRange,
  Position,
  editor,
  languages,
} from "monaco-editor";
import { lspSession, uriToPath } from "@/services/lsp/LspClient";
import { LSP_MONACO_LANGUAGES } from "@/services/lsp/languages";
import { useWorkspaceUiStore } from "@/stores/workspaceUiStore";

type LocationLike = {
  uri?: string;
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
};

function modelPath(model: editor.ITextModel): string {
  const u = model.uri;
  if (u.scheme === "file") {
    return uriToPath(u.toString());
  }
  // Monaco path= often sets fsPath-like path in URI
  const p = u.path || u.fsPath || "";
  if (/^[a-zA-Z]:\//.test(p)) return p.replace(/\//g, "\\");
  if (p.startsWith("/") && /^\/[a-zA-Z]:/.test(p)) {
    return p.slice(1).replace(/\//g, "\\");
  }
  return p.replace(/\//g, "\\");
}

function asLocations(result: unknown): LocationLike[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    return result.flatMap((x) => {
      if (x && typeof x === "object" && "targetUri" in x) {
        const l = x as {
          targetUri?: string;
          targetRange?: LocationLike["range"];
          targetSelectionRange?: LocationLike["range"];
        };
        return [{ uri: l.targetUri, range: l.targetSelectionRange ?? l.targetRange }];
      }
      return [x as LocationLike];
    });
  }
  if (typeof result === "object" && result !== null && "uri" in result) {
    return [result as LocationLike];
  }
  return [];
}

function openLocation(loc: LocationLike) {
  if (!loc.uri || !loc.range) return;
  const path = uriToPath(loc.uri);
  useWorkspaceUiStore.getState().openFile(path);
  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("llm-shell:reveal-line", {
        detail: {
          path,
          line: loc.range!.start.line + 1,
          column: loc.range!.start.character + 1,
        },
      }),
    );
  }, 200);
}

function completionKind(monaco: Monaco, kind?: number): languages.CompletionItemKind {
  const K = monaco.languages.CompletionItemKind;
  const map: Record<number, languages.CompletionItemKind> = {
    1: K.Text,
    2: K.Method,
    3: K.Function,
    4: K.Constructor,
    5: K.Field,
    6: K.Variable,
    7: K.Class,
    8: K.Interface,
    9: K.Module,
    10: K.Property,
    14: K.Keyword,
    15: K.Snippet,
    21: K.Constant,
  };
  return map[kind ?? 1] ?? K.Text;
}

function docToMarkdown(doc: unknown): string | { value: string } | undefined {
  if (!doc) return undefined;
  if (typeof doc === "string") return doc;
  if (typeof doc === "object" && doc !== null && "value" in doc) {
    return { value: String((doc as { value: string }).value) };
  }
  return String(doc);
}

function registerAllProviders(monaco: Monaco): IDisposable {
  const disposables: IDisposable[] = [];

  for (const lang of LSP_MONACO_LANGUAGES) {
    disposables.push(
      monaco.languages.registerCompletionItemProvider(lang, {
        triggerCharacters: [".", "<", '"', "'", "/", "@"],
        provideCompletionItems: async (
          model: editor.ITextModel,
          position: Position,
          _ctx: languages.CompletionContext,
          token: CancellationToken,
        ) => {
          if (token.isCancellationRequested) return { suggestions: [] };
          const filePath = modelPath(model);
          const res = await lspSession.completion(
            filePath,
            model.getLanguageId(),
            position.lineNumber - 1,
            position.column - 1,
          );
          const items = Array.isArray(res)
            ? res
            : res && typeof res === "object" && Array.isArray((res as { items?: unknown }).items)
              ? (res as { items: unknown[] }).items
              : [];
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          return {
            suggestions: items.map((raw, i) => {
              const it = raw as {
                label?: string | { label?: string };
                kind?: number;
                detail?: string;
                documentation?: unknown;
                insertText?: string;
                insertTextFormat?: number;
              };
              const label =
                typeof it.label === "string" ? it.label : it.label?.label ?? `item-${i}`;
              return {
                label,
                kind: completionKind(monaco, it.kind),
                detail: it.detail,
                documentation: docToMarkdown(it.documentation),
                insertText: it.insertText ?? label,
                insertTextRules:
                  it.insertTextFormat === 2
                    ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                    : undefined,
                range,
              };
            }),
          };
        },
      }),
    );

    disposables.push(
      monaco.languages.registerHoverProvider(lang, {
        provideHover: async (
          model: editor.ITextModel,
          position: Position,
          token: CancellationToken,
        ) => {
          if (token.isCancellationRequested) return null;
          const tip = await lspSession.hover(
            modelPath(model),
            position.lineNumber - 1,
            position.column - 1,
            model.getLanguageId(),
          );
          if (!tip) return null;
          return { contents: [{ value: tip }] };
        },
      }),
    );

    disposables.push(
      monaco.languages.registerDefinitionProvider(lang, {
        provideDefinition: async (model: editor.ITextModel, position: Position) => {
          const res = await lspSession.definition(
            modelPath(model),
            model.getLanguageId(),
            position.lineNumber - 1,
            position.column - 1,
          );
          const locs = asLocations(res);
          if (locs[0]) openLocation(locs[0]);
          return locs
            .filter((l) => l.uri && l.range)
            .map((l) => ({
              uri: monaco.Uri.file(uriToPath(l.uri!)),
              range: {
                startLineNumber: l.range!.start.line + 1,
                startColumn: l.range!.start.character + 1,
                endLineNumber: l.range!.end.line + 1,
                endColumn: l.range!.end.character + 1,
              },
            }));
        },
      }),
    );

    disposables.push(
      monaco.languages.registerReferenceProvider(lang, {
        provideReferences: async (model: editor.ITextModel, position: Position) => {
          const res = await lspSession.references(
            modelPath(model),
            model.getLanguageId(),
            position.lineNumber - 1,
            position.column - 1,
          );
          return asLocations(res)
            .filter((l) => l.uri && l.range)
            .map((l) => ({
              uri: monaco.Uri.file(uriToPath(l.uri!)),
              range: {
                startLineNumber: l.range!.start.line + 1,
                startColumn: l.range!.start.character + 1,
                endLineNumber: l.range!.end.line + 1,
                endColumn: l.range!.end.character + 1,
              },
            }));
        },
      }),
    );

    disposables.push(
      monaco.languages.registerRenameProvider(lang, {
        provideRenameEdits: async (
          model: editor.ITextModel,
          position: Position,
          newName: string,
        ) => {
          const res = await lspSession.rename(
            modelPath(model),
            model.getLanguageId(),
            position.lineNumber - 1,
            position.column - 1,
            newName,
          );
          if (!res || typeof res !== "object") return null;
          const changes = (
            res as {
              changes?: Record<
                string,
                Array<{
                  range: {
                    start: { line: number; character: number };
                    end: { line: number; character: number };
                  };
                  newText: string;
                }>
              >;
            }
          ).changes;
          if (!changes) return null;
          const edits: languages.IWorkspaceTextEdit[] = [];
          for (const [uri, arr] of Object.entries(changes)) {
            for (const e of arr) {
              edits.push({
                resource: monaco.Uri.file(uriToPath(uri)),
                versionId: undefined,
                textEdit: {
                  range: {
                    startLineNumber: e.range.start.line + 1,
                    startColumn: e.range.start.character + 1,
                    endLineNumber: e.range.end.line + 1,
                    endColumn: e.range.end.character + 1,
                  },
                  text: e.newText,
                },
              });
            }
          }
          return { edits };
        },
      }),
    );

    disposables.push(
      monaco.languages.registerDocumentFormattingEditProvider(lang, {
        provideDocumentFormattingEdits: async (model: editor.ITextModel) => {
          const res = await lspSession.formatting(modelPath(model), model.getLanguageId());
          if (!Array.isArray(res)) return [];
          return (
            res as Array<{
              range: {
                start: { line: number; character: number };
                end: { line: number; character: number };
              };
              newText: string;
            }>
          ).map((e) => ({
            range: {
              startLineNumber: e.range.start.line + 1,
              startColumn: e.range.start.character + 1,
              endLineNumber: e.range.end.line + 1,
              endColumn: e.range.end.character + 1,
            },
            text: e.newText,
          }));
        },
      }),
    );

    disposables.push(
      monaco.languages.registerSignatureHelpProvider(lang, {
        signatureHelpTriggerCharacters: ["(", ","],
        provideSignatureHelp: async (
          model: editor.ITextModel,
          position: Position,
          token: CancellationToken,
        ) => {
          if (token.isCancellationRequested) return null;
          const res = await lspSession.signatureHelp(
            modelPath(model),
            model.getLanguageId(),
            position.lineNumber - 1,
            position.column - 1,
          );
          if (!res || typeof res !== "object") return null;
          const sh = res as {
            signatures?: Array<{
              label: string;
              documentation?: unknown;
              parameters?: Array<{ label: string | [number, number]; documentation?: unknown }>;
            }>;
            activeSignature?: number;
            activeParameter?: number;
          };
          return {
            value: {
              signatures: (sh.signatures ?? []).map((s) => ({
                label: s.label,
                documentation: docToMarkdown(s.documentation),
                parameters: (s.parameters ?? []).map((p) => ({
                  label: p.label,
                  documentation: docToMarkdown(p.documentation),
                })),
              })),
              activeSignature: sh.activeSignature ?? 0,
              activeParameter: sh.activeParameter ?? 0,
            },
            dispose: () => undefined,
          };
        },
      }),
    );

    disposables.push(
      monaco.languages.registerDocumentSymbolProvider(lang, {
        provideDocumentSymbols: async (model: editor.ITextModel) => {
          const res = await lspSession.documentSymbol(modelPath(model), model.getLanguageId());
          if (!Array.isArray(res)) return [];
          return mapSymbols(monaco, res);
        },
      }),
    );

    disposables.push(
      monaco.languages.registerCodeActionProvider(lang, {
        provideCodeActions: async (model: editor.ITextModel, range: IRange) => {
          const markers = monaco.editor.getModelMarkers({ resource: model.uri });
          const diags = markers.map((m: editor.IMarker) => ({
            range: {
              start: { line: m.startLineNumber - 1, character: m.startColumn - 1 },
              end: { line: m.endLineNumber - 1, character: m.endColumn - 1 },
            },
            message: m.message,
            severity: 1,
          }));
          const res = await lspSession.codeAction(
            modelPath(model),
            model.getLanguageId(),
            {
              start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
              end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
            },
            diags,
          );
          if (!Array.isArray(res)) return { actions: [], dispose: () => undefined };
          const actions: languages.CodeAction[] = [];
          for (const raw of res) {
            const a = raw as {
              title?: string;
              kind?: string;
              edit?: {
                changes?: Record<
                  string,
                  Array<{
                    range: {
                      start: { line: number; character: number };
                      end: { line: number; character: number };
                    };
                    newText: string;
                  }>
                >;
              };
            };
            if (!a.title) continue;
            actions.push({
              title: a.title,
              kind: a.kind,
              edit: a.edit?.changes
                ? {
                    edits: Object.entries(a.edit.changes).flatMap(([uri, arr]) =>
                      arr.map((e) => ({
                        resource: monaco.Uri.file(uriToPath(uri)),
                        textEdit: {
                          range: {
                            startLineNumber: e.range.start.line + 1,
                            startColumn: e.range.start.character + 1,
                            endLineNumber: e.range.end.line + 1,
                            endColumn: e.range.end.character + 1,
                          },
                          text: e.newText,
                        },
                        versionId: undefined,
                      })),
                    ),
                  }
                : undefined,
            });
          }
          return { actions, dispose: () => undefined };
        },
      }),
    );
  }

  return {
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

function mapSymbols(monaco: Monaco, items: unknown[]): languages.DocumentSymbol[] {
  return items.map((raw) => {
    const s = raw as {
      name?: string;
      detail?: string;
      kind?: number;
      range?: { start: { line: number; character: number }; end: { line: number; character: number } };
      selectionRange?: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
      children?: unknown[];
      location?: {
        range: { start: { line: number; character: number }; end: { line: number; character: number } };
      };
    };
    const range = s.range ?? s.selectionRange ?? s.location?.range;
    const r = range
      ? {
          startLineNumber: range.start.line + 1,
          startColumn: range.start.character + 1,
          endLineNumber: range.end.line + 1,
          endColumn: range.end.character + 1,
        }
      : { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 };
    return {
      name: s.name ?? "?",
      detail: s.detail ?? "",
      kind: (s.kind as languages.SymbolKind) ?? monaco.languages.SymbolKind.Variable,
      tags: [],
      range: r,
      selectionRange: r,
      children: s.children ? mapSymbols(monaco, s.children) : undefined,
    };
  });
}

let globalBridge: IDisposable | null = null;
let bridgeRefs = 0;

/** Register LSP→Monaco providers once (ref-counted). */
export function acquireMonacoLspBridge(monaco: Monaco): IDisposable {
  if (!globalBridge) globalBridge = registerAllProviders(monaco);
  bridgeRefs += 1;
  return {
    dispose: () => {
      bridgeRefs = Math.max(0, bridgeRefs - 1);
      if (bridgeRefs === 0 && globalBridge) {
        globalBridge.dispose();
        globalBridge = null;
      }
    },
  };
}

export function bindEditorLspKeys(
  editor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
): IDisposable {
  return editor.addAction({
    id: "lsp.formatDocument",
    label: "Format Document (LSP)",
    keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
    run: async (ed) => {
      await ed.getAction("editor.action.formatDocument")?.run();
    },
  });
}
