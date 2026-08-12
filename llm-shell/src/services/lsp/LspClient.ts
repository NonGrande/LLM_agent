import { FramedJsonRpcClient } from "@/services/rpc/FramedJsonRpcClient";
import { isTauri } from "@/utils/env";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  monacoLangToLsp,
  resolveServerSpec,
  type LspServerSpec,
} from "@/services/lsp/languages";

export interface LspDiagnostic {
  message: string;
  severity: number;
  line: number;
  character: number;
  endLine: number;
  endCharacter: number;
}

export type LspPosition = { line: number; character: number };
export type LspRange = { start: LspPosition; end: LspPosition };

type DiagListener = (uri: string, diags: LspDiagnostic[]) => void;
type StatusListener = (languageId: string, status: string) => void;

const CLIENT_CAPS = {
  textDocument: {
    publishDiagnostics: {},
    synchronization: { didSave: true, willSave: false },
    completion: {
      completionItem: { snippetSupport: true, documentationFormat: ["markdown", "plaintext"] },
    },
    hover: { contentFormat: ["markdown", "plaintext"] },
    signatureHelp: { signatureInformation: { documentationFormat: ["markdown", "plaintext"] } },
    definition: { linkSupport: true },
    references: {},
    rename: { prepareSupport: true },
    documentSymbol: { hierarchicalDocumentSymbolSupport: true },
    formatting: {},
    codeAction: {
      codeActionLiteralSupport: {
        codeActionKind: { valueSet: ["quickfix", "refactor", "source"] },
      },
    },
  },
};

class ServerSession {
  rpc: FramedJsonRpcClient | null = null;
  ready = false;
  starting: Promise<void> | null = null;
  rootUri = "";
  /** uri → version */
  versions = new Map<string, number>();
  openDocs = new Set<string>();
  lastError: string | null = null;
  languageId: string;
  spec: LspServerSpec;

  constructor(languageId: string, spec: LspServerSpec) {
    this.languageId = languageId;
    this.spec = spec;
  }
}

/**
 * Multi-language LSP registry: lazy stdio servers per languageId.
 */
class LspRegistry {
  private servers = new Map<string, ServerSession>();
  private diagListeners = new Set<DiagListener>();
  private statusListeners = new Set<StatusListener>();

  onDiagnostics(listener: DiagListener): () => void {
    this.diagListeners.add(listener);
    return () => this.diagListeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private emitStatus(languageId: string, status: string) {
    for (const l of this.statusListeners) l(languageId, status);
  }

  private emitDiags(uri: string, diags: LspDiagnostic[]) {
    for (const l of this.diagListeners) l(uri, diags);
  }

  private getSpec(languageId: string): LspServerSpec | null {
    const settings = useSettingsStore.getState().settings;
    const editor = settings.editor;
    return resolveServerSpec(languageId, editor?.lspServers ?? null, {
      command: editor?.lspCommand ?? "typescript-language-server",
      args: editor?.lspArgs ?? ["--stdio"],
    });
  }

  private workspaceRoot(): string {
    const settings = useSettingsStore.getState().settings;
    return (
      settings.workspace.path?.trim() ||
      settings.agent.workingDirectory?.trim() ||
      ""
    );
  }

  async ensureServer(languageId: string): Promise<ServerSession | null> {
    const settings = useSettingsStore.getState().settings;
    if (!settings.editor?.lspEnabled || !isTauri()) return null;

    const lspLang = monacoLangToLsp(languageId);
    let session = this.servers.get(lspLang);
    if (session?.ready && session.rpc) return session;
    if (session?.starting) {
      await session.starting;
      return session.ready ? session : null;
    }

    const spec = this.getSpec(lspLang);
    if (!spec) {
      this.emitStatus(lspLang, `no LSP mapping for ${lspLang}`);
      return null;
    }

    session = new ServerSession(lspLang, spec);
    this.servers.set(lspLang, session);
    session.starting = this.startServer(session);
    try {
      await session.starting;
    } finally {
      session.starting = null;
    }
    return session.ready ? session : null;
  }

  private async startServer(session: ServerSession): Promise<void> {
    const root = this.workspaceRoot();
    if (!root) {
      session.lastError = "LSP: откройте workspace (площадку)";
      this.emitStatus(session.languageId, session.lastError);
      return;
    }
    session.rootUri = pathToUri(root);
    this.emitStatus(session.languageId, `starting ${session.spec.command}…`);

    const channel = `lsp-${session.languageId}-${Date.now()}`;
    const rpc = new FramedJsonRpcClient(channel);
    rpc.onNotification((method, params) => {
      if (method === "textDocument/publishDiagnostics" && params && typeof params === "object") {
        const p = params as {
          uri?: string;
          diagnostics?: Array<{
            message: string;
            severity?: number;
            range?: { start: LspPosition; end: LspPosition };
          }>;
        };
        if (!p.uri || !Array.isArray(p.diagnostics)) return;
        const diags: LspDiagnostic[] = p.diagnostics.map((d) => ({
          message: d.message,
          severity: d.severity ?? 1,
          line: d.range?.start.line ?? 0,
          character: d.range?.start.character ?? 0,
          endLine: d.range?.end.line ?? d.range?.start.line ?? 0,
          endCharacter: d.range?.end.character ?? d.range?.start.character ?? 0,
        }));
        this.emitDiags(p.uri, diags);
      }
    });

    try {
      await rpc.start({
        program: session.spec.command,
        args: session.spec.args,
        cwd: root,
      });
      session.rpc = rpc;
      await rpc.request("initialize", {
        processId: null,
        rootUri: session.rootUri,
        capabilities: CLIENT_CAPS,
        clientInfo: { name: "llm-shell", version: "0.3.0" },
      });
      await rpc.notify("initialized", {});
      session.ready = true;
      session.lastError = null;
      this.emitStatus(session.languageId, "ready");
    } catch (err) {
      session.ready = false;
      session.rpc = null;
      session.lastError = String(err);
      this.emitStatus(
        session.languageId,
        `failed: ${session.spec.command} — ${String(err).slice(0, 120)}`,
      );
      try {
        await rpc.close();
      } catch {
        /* ignore */
      }
      // Python fallback: basedpyright → pyright
      if (session.languageId === "python" && session.spec.command.includes("basedpyright")) {
        session.spec = { command: "pyright-langserver", args: ["--stdio"] };
        this.emitStatus(session.languageId, "retry pyright-langserver…");
        await this.startServer(session);
      }
    }
  }

  private async getRpc(languageId: string): Promise<FramedJsonRpcClient | null> {
    const s = await this.ensureServer(languageId);
    return s?.rpc ?? null;
  }

  async didOpen(filePath: string, languageId: string, text: string): Promise<void> {
    const session = await this.ensureServer(languageId);
    if (!session?.rpc) return;
    const uri = pathToUri(filePath);
    const lspLang = monacoLangToLsp(languageId);
    if (!session.openDocs.has(uri)) {
      session.versions.set(uri, 1);
      session.openDocs.add(uri);
      await session.rpc.notify("textDocument/didOpen", {
        textDocument: { uri, languageId: lspLang, version: 1, text },
      });
    } else {
      const ver = (session.versions.get(uri) ?? 1) + 1;
      session.versions.set(uri, ver);
      await session.rpc.notify("textDocument/didChange", {
        textDocument: { uri, version: ver },
        contentChanges: [{ text }],
      });
    }
  }

  async didSave(filePath: string, languageId: string, text?: string): Promise<void> {
    const session = await this.ensureServer(languageId);
    if (!session?.rpc) return;
    const uri = pathToUri(filePath);
    await session.rpc.notify("textDocument/didSave", {
      textDocument: { uri },
      text,
    });
  }

  async didClose(filePath: string, languageId: string): Promise<void> {
    const session = this.servers.get(monacoLangToLsp(languageId));
    if (!session?.rpc) return;
    const uri = pathToUri(filePath);
    if (!session.openDocs.has(uri)) return;
    session.openDocs.delete(uri);
    session.versions.delete(uri);
    await session.rpc.notify("textDocument/didClose", { textDocument: { uri } });
  }

  async request<T = unknown>(
    languageId: string,
    method: string,
    params: unknown,
  ): Promise<T | null> {
    const rpc = await this.getRpc(languageId);
    if (!rpc) return null;
    try {
      return (await rpc.request(method, params)) as T;
    } catch {
      return null;
    }
  }

  async hover(filePath: string, line: number, character: number, languageId: string): Promise<string | null> {
    const uri = pathToUri(filePath);
    const res = await this.request<{ contents?: unknown }>(languageId, "textDocument/hover", {
      textDocument: { uri },
      position: { line, character },
    });
    if (!res?.contents) return null;
    return formatHover(res.contents);
  }

  async completion(
    filePath: string,
    languageId: string,
    line: number,
    character: number,
  ): Promise<unknown> {
    const uri = pathToUri(filePath);
    return this.request(languageId, "textDocument/completion", {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async definition(
    filePath: string,
    languageId: string,
    line: number,
    character: number,
  ): Promise<unknown> {
    const uri = pathToUri(filePath);
    return this.request(languageId, "textDocument/definition", {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async references(
    filePath: string,
    languageId: string,
    line: number,
    character: number,
  ): Promise<unknown> {
    const uri = pathToUri(filePath);
    return this.request(languageId, "textDocument/references", {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration: true },
    });
  }

  async rename(
    filePath: string,
    languageId: string,
    line: number,
    character: number,
    newName: string,
  ): Promise<unknown> {
    const uri = pathToUri(filePath);
    return this.request(languageId, "textDocument/rename", {
      textDocument: { uri },
      position: { line, character },
      newName,
    });
  }

  async formatting(filePath: string, languageId: string): Promise<unknown> {
    const uri = pathToUri(filePath);
    return this.request(languageId, "textDocument/formatting", {
      textDocument: { uri },
      options: { tabSize: 2, insertSpaces: true },
    });
  }

  async signatureHelp(
    filePath: string,
    languageId: string,
    line: number,
    character: number,
  ): Promise<unknown> {
    const uri = pathToUri(filePath);
    return this.request(languageId, "textDocument/signatureHelp", {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async documentSymbol(filePath: string, languageId: string): Promise<unknown> {
    const uri = pathToUri(filePath);
    return this.request(languageId, "textDocument/documentSymbol", {
      textDocument: { uri },
    });
  }

  async codeAction(
    filePath: string,
    languageId: string,
    range: LspRange,
    diagnostics: unknown[],
  ): Promise<unknown> {
    const uri = pathToUri(filePath);
    return this.request(languageId, "textDocument/codeAction", {
      textDocument: { uri },
      range,
      context: { diagnostics },
    });
  }

  async stopAll(): Promise<void> {
    const all = [...this.servers.values()];
    this.servers.clear();
    await Promise.all(
      all.map(async (s) => {
        s.ready = false;
        const rpc = s.rpc;
        s.rpc = null;
        if (rpc) await rpc.close();
      }),
    );
  }

  /** @deprecated use stopAll */
  async stop(): Promise<void> {
    await this.stopAll();
  }
}

export function pathToUri(p: string): string {
  const norm = p.replace(/\\/g, "/");
  if (norm.startsWith("file:")) return norm;
  if (/^[a-zA-Z]:\//.test(norm)) return `file:///${norm}`;
  return `file://${norm.startsWith("/") ? "" : "/"}${norm}`;
}

export function uriToPath(uri: string): string {
  let u = uri;
  if (u.startsWith("file:///")) u = u.slice("file:///".length);
  else if (u.startsWith("file://")) u = u.slice("file://".length);
  try {
    u = decodeURIComponent(u);
  } catch {
    /* keep */
  }
  if (/^[a-zA-Z]:\//.test(u)) return u.replace(/\//g, "\\");
  return u;
}

export function formatHover(contents: unknown): string {
  if (typeof contents === "string") return contents;
  if (contents && typeof contents === "object") {
    const c = contents as { kind?: string; value?: string; language?: string };
    if (typeof c.value === "string") return c.value;
    if (Array.isArray(contents)) {
      return contents.map((x) => formatHover(x)).filter(Boolean).join("\n\n");
    }
  }
  return String(contents);
}

export const lspSession = new LspRegistry();

export { monacoLangToLsp } from "@/services/lsp/languages";
