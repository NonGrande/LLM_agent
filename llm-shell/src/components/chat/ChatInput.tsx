import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type DragEvent,
  useState,
} from "react";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { createClientFromSettings } from "@/services/llm/LLMClient";
import { createDefaultToolRegistry } from "@/services/agent/tools";
import { runAgentLoop } from "@/services/agent/AgentLoop";
import { errorMessage } from "@/utils/errors";
import { isTauri } from "@/utils/env";
import { ChatModelSelector } from "@/components/chat/ChatModelSelector";
import { FileMentionPicker } from "@/components/chat/FileMentionPicker";
import {
  extractMentionPaths,
  extractCodebaseQuery,
  hasCodebaseMention,
  getActiveMentionQuery,
  resolveWorkspacePath,
  searchMentionFiles,
} from "@/services/mentions/filePaths";
import {
  buildSpecialAndFileItems,
  fetchWebPreview,
  formatDocsForPrompt,
  formatWebForPrompt,
  getActiveDocsWebMention,
  loadDocsPreview,
  looksLikeUrl,
  normalizeWebUrl,
  parseDocsMentions,
  parseWebMentions,
  searchDocsFiles,
  type MentionPickerItem,
} from "@/services/mentions/docsWeb";
import { searchCodebaseForPrompt } from "@/services/index/indexService";
import {
  buildAttachedFilesContext,
  useContextAttachStore,
} from "@/stores/contextAttachStore";
import { useMentionPreviewStore } from "@/stores/mentionPreviewStore";

const SLASH_HELP = `Slash commands:
/clear — clear current chat
/model <name> — set model
/context — show context token estimate
/skills — list loaded skills
/skill <name> — force-load skill this turn (also works in a normal message)
/help — this help
/stop — cancel current run`;

function physicalToCss(pos: { x: number; y: number }): { x: number; y: number } {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return { x: pos.x / dpr, y: pos.y / dpr };
}

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function filePathFromBrowserFile(file: File): string | null {
  const withPath = file as File & { path?: string };
  if (typeof withPath.path === "string" && withPath.path.trim()) {
    return withPath.path.trim();
  }
  // WebView / browser often only exposes the basename — still attach so the user sees it.
  return file.name || null;
}

function effectiveProxyUrl(): string | undefined {
  const net = useSettingsStore.getState().settings.network;
  if (!net?.proxyEnabled) return undefined;
  const u = net.proxyUrl?.trim();
  return u || undefined;
}

export function ChatInput() {
  const draft = useChatStore((s) => s.draft);
  const setDraft = useChatStore((s) => s.setDraft);
  const addMessage = useChatStore((s) => s.addMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const settings = useSettingsStore((s) => s.settings);
  const updateProvider = useSettingsStore((s) => s.updateProvider);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const attached = useContextAttachStore((s) => s.paths);
  const addContext = useContextAttachStore((s) => s.add);
  const removeContext = useContextAttachStore((s) => s.remove);
  const clearContext = useContextAttachStore((s) => s.clear);
  const previewItems = useMentionPreviewStore((s) => s.items);
  const addDocsPreview = useMentionPreviewStore((s) => s.addDocs);
  const addWebPreview = useMentionPreviewStore((s) => s.addWeb);
  const removePreview = useMentionPreviewStore((s) => s.remove);
  const clearPreviews = useMentionPreviewStore((s) => s.clear);
  const [dragOver, setDragOver] = useState(false);
  const dragDepthRef = useRef(0);
  const [mentionItems, setMentionItems] = useState<MentionPickerItem[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const [previewBusy, setPreviewBusy] = useState(false);

  const attachPaths = useCallback(
    (paths: string[]) => {
      if (!paths.length) return;
      addContext(paths);
    },
    [addContext],
  );

  const dropZoneEl = useCallback((): HTMLElement | null => {
    const self = dropZoneRef.current;
    if (!self) return null;
    // Accept drops anywhere in the center chat column (messages + input).
    return (self.closest("main") as HTMLElement | null) ?? self;
  }, []);

  const isOverDropZone = useCallback(
    (clientX: number, clientY: number): boolean => {
      const el = dropZoneEl();
      if (!el) return false;
      return pointInRect(clientX, clientY, el.getBoundingClientRect());
    },
    [dropZoneEl],
  );

  // Tauri/WebView2: OS file drops never populate dataTransfer.files with real paths.
  // Absolute paths come from the native onDragDropEvent API.
  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      if (cancelled) return;
      unlisten = await getCurrentWebview().onDragDropEvent((event) => {
        const payload = event.payload;
        if (payload.type === "enter" || payload.type === "over") {
          const { x, y } = physicalToCss(payload.position);
          setDragOver(isOverDropZone(x, y));
          return;
        }
        if (payload.type === "drop") {
          const { x, y } = physicalToCss(payload.position);
          const over = isOverDropZone(x, y);
          setDragOver(false);
          if (over) attachPaths(payload.paths);
          return;
        }
        // leave
        setDragOver(false);
      });
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [attachPaths, isOverDropZone]);

  const workspaceRoot = settings.agent.workingDirectory || settings.workspace.path;

  const replaceMentionRange = useCallback(
    (start: number, insert: string) => {
      const el = textareaRef.current;
      if (!el || start < 0) return;
      const cursor = el.selectionStart ?? draft.length;
      const before = draft.slice(0, start);
      const after = draft.slice(cursor);
      const next = `${before}${insert}${after}`;
      setDraft(next);
      setMentionOpen(false);
      requestAnimationFrame(() => {
        const pos = before.length + insert.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [draft, setDraft],
  );

  const refreshMention = useCallback(async () => {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? draft.length;

    const docsWeb = getActiveDocsWebMention(draft, cursor);
    if (docsWeb) {
      setMentionStart(docsWeb.start);
      if (docsWeb.mode === "docs") {
        const paths = await searchDocsFiles(workspaceRoot, docsWeb.query);
        const items: MentionPickerItem[] = paths.map((p) => ({
          kind: "docs",
          value: p,
          label: p.replace(/\\/g, "/").split("/").slice(-2).join("/"),
          hint: p,
        }));
        setMentionItems(items);
        setMentionIndex(0);
        setMentionOpen(items.length > 0);
        return;
      }
      // web mode
      const q = docsWeb.query.trim();
      const items: MentionPickerItem[] = [];
      if (q && looksLikeUrl(q)) {
        const url = normalizeWebUrl(q);
        items.push({
          kind: "web",
          value: url,
          label: url,
          hint: "Загрузить превью страницы",
        });
      } else if (!q) {
        items.push({
          kind: "web",
          value: "",
          label: "@web",
          hint: "Вставьте URL (https://…)",
        });
      } else {
        items.push({
          kind: "web",
          value: q,
          label: q,
          hint: "URL не распознан — уточните",
        });
      }
      setMentionItems(items);
      setMentionIndex(0);
      setMentionOpen(items.length > 0);
      return;
    }

    const active = getActiveMentionQuery(draft, cursor);
    if (!active) {
      setMentionOpen(false);
      setMentionStart(-1);
      return;
    }
    setMentionStart(active.start);
    const files = await searchMentionFiles(workspaceRoot, active.query);
    const items = buildSpecialAndFileItems(active.query, files);
    setMentionItems(items);
    setMentionIndex(0);
    setMentionOpen(items.length > 0);
  }, [draft, workspaceRoot]);

  useEffect(() => {
    void refreshMention();
  }, [refreshMention]);

  const pickMention = useCallback(
    async (item: MentionPickerItem) => {
      const el = textareaRef.current;
      if (!el || mentionStart < 0) return;

      if (item.kind === "special") {
        replaceMentionRange(mentionStart, `@${item.value} `);
        return;
      }

      if (item.kind === "file") {
        replaceMentionRange(mentionStart, `@${item.value} `);
        return;
      }

      if (item.kind === "docs") {
        setPreviewBusy(true);
        try {
          const preview = await loadDocsPreview(workspaceRoot, item.value);
          addDocsPreview({
            path: preview.path,
            label: preview.label,
            snippet: preview.snippet,
            content: preview.content,
          });
          replaceMentionRange(mentionStart, "");
        } finally {
          setPreviewBusy(false);
        }
        return;
      }

      if (item.kind === "web") {
        const url = normalizeWebUrl(item.value);
        if (!url || !looksLikeUrl(url)) return;
        setPreviewBusy(true);
        try {
          const preview = await fetchWebPreview(url, { proxyUrl: effectiveProxyUrl() });
          addWebPreview({
            url: preview.url,
            title: preview.title,
            snippet: preview.snippet,
            content: preview.content,
            error: preview.error,
          });
          replaceMentionRange(mentionStart, "");
        } finally {
          setPreviewBusy(false);
        }
      }
    },
    [mentionStart, replaceMentionRange, workspaceRoot, addDocsPreview, addWebPreview],
  );

  const handleSlash = (text: string): boolean => {
    if (text === "/clear") {
      clearMessages();
      return true;
    }
    if (text === "/help") {
      addMessage({ role: "assistant", content: SLASH_HELP });
      return true;
    }
    if (text === "/stop") {
      abortRef.current?.abort();
      useChatStore.getState().setStreaming(false);
      return true;
    }
    if (text === "/context") {
      const msgs = useChatStore.getState().currentSession().messages;
      const chars = msgs.reduce(
        (n, m) => n + (typeof m.content === "string" ? m.content.length : 0),
        0,
      );
      addMessage({
        role: "assistant",
        content: `Messages: ${msgs.length}. ~${Math.ceil(chars / 4)} tokens (heuristic). Max context: ${settings.agent.maxContextTokens}.`,
      });
      return true;
    }
    if (text === "/skills") {
      void (async () => {
        const { getSkillRegistry } = await import("@/services/skills/SkillRegistry");
        const { formatSkillsCatalog } = await import("@/services/skills/matchSkills");
        const reg = getSkillRegistry();
        const ws = settings.agent.workingDirectory || settings.workspace.path;
        await reg.load(ws || undefined);
        addMessage({
          role: "assistant",
          content: `## Skills\n\n${formatSkillsCatalog(reg.list())}\n\nUse \`/skill skill-finder\` or ask «найди скилл для …».`,
        });
      })();
      return true;
    }
    if (text.startsWith("/model ")) {
      const model = text.slice(7).trim();
      if (model) {
        updateProvider({ model });
        addMessage({ role: "assistant", content: `Model set to «${model}».` });
      }
      return true;
    }
    // /skill name — fall through to agent so skill is matched & run
    if (text.startsWith("/skill ")) {
      return false;
    }
    return false;
  };

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || isStreaming) return;
    setDraft("");

    if (text.startsWith("/") && handleSlash(text)) {
      return;
    }

    let payload = text;
    if (hasCodebaseMention(text)) {
      const pid = settings.activeProjectId;
      const cq = extractCodebaseQuery(text);
      try {
        const block = await searchCodebaseForPrompt(pid, cq, settings);
        if (block) payload += `\n\n${block}`;
      } catch {
        /* index optional */
      }
    }

    const staged = useMentionPreviewStore.getState().items;
    const docsFromChips = staged.filter((x) => x.kind === "docs");
    const webFromChips = staged.filter((x) => x.kind === "web");

    const leftoverDocs = parseDocsMentions(text);
    const leftoverWeb = parseWebMentions(text);

    const docsPayload: Array<{ path: string; content: string; error?: string }> = [
      ...docsFromChips.map((d) => ({ path: d.path, content: d.content })),
    ];
    const chipDocPaths = new Set(docsFromChips.map((d) => d.path.replace(/\\/g, "/").toLowerCase()));
    for (const frag of leftoverDocs) {
      const abs = resolveWorkspacePath(workspaceRoot, frag);
      if (chipDocPaths.has(abs.replace(/\\/g, "/").toLowerCase())) continue;
      const loaded = await loadDocsPreview(workspaceRoot, frag);
      docsPayload.push({ path: loaded.path, content: loaded.content, error: loaded.error });
    }

    const webPayload: Array<{ url: string; title: string; content: string; error?: string }> = [
      ...webFromChips.map((w) => ({
        url: w.url,
        title: w.title,
        content: w.content,
        error: w.error,
      })),
    ];
    const chipUrls = new Set(webFromChips.map((w) => w.url.toLowerCase()));
    for (const url of leftoverWeb) {
      if (chipUrls.has(url.toLowerCase())) continue;
      const preview = await fetchWebPreview(url, { proxyUrl: effectiveProxyUrl() });
      webPayload.push({
        url: preview.url,
        title: preview.title,
        content: preview.content,
        error: preview.error,
      });
    }

    const docsBlock = formatDocsForPrompt(docsPayload);
    const webBlock = formatWebForPrompt(webPayload);
    if (docsBlock) payload += docsBlock;
    if (webBlock) payload += webBlock;
    if (staged.length) clearPreviews();

    const mentions = extractMentionPaths(text).map((p) => resolveWorkspacePath(workspaceRoot, p));
    const toInline = [...new Set([...mentions, ...attached])];
    if (toInline.length) {
      try {
        payload += await buildAttachedFilesContext(toInline);
      } catch {
        payload +=
          "\n\n[Attached paths]\n" + toInline.map((p) => `- ${p}`).join("\n");
      }
      if (attached.length) clearContext();
    }

    if (!settings.provider.baseUrl) {
      addMessage({ role: "assistant", content: "Set provider Base URL in Settings." });
      return;
    }

    const client = createClientFromSettings(settings.provider.baseUrl, settings.provider.apiKey, settings.network);
    const registry = createDefaultToolRegistry();
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await runAgentLoop(payload, {
        client,
        registry,
        settings,
        abortSignal: abort.signal,
      });
    } catch (err) {
      addMessage({ role: "assistant", content: `Failed: ${errorMessage(err)}` });
      useChatStore.getState().setStreaming(false);
    }
  }, [
    draft,
    isStreaming,
    settings,
    attached,
    addMessage,
    setDraft,
    clearMessages,
    updateProvider,
    workspaceRoot,
    clearContext,
    clearPreviews,
  ]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && mentionItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionItems.length) % mentionItems.length);
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        const item = mentionItems[mentionIndex] ?? mentionItems[0];
        if (item.kind === "web" && !looksLikeUrl(item.value)) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        void pickMention(item);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  /** Browser / non-Tauri fallback (and rare WebView cases that still emit HTML5 DnD). */
  const allowHtml5FileDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  const onDragEnter = (e: DragEvent) => {
    allowHtml5FileDrag(e);
    dragDepthRef.current += 1;
    setDragOver(true);
  };

  const onDragLeave = (e: DragEvent) => {
    allowHtml5FileDrag(e);
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragOver(false);
  };

  const onDrop = (e: DragEvent) => {
    allowHtml5FileDrag(e);
    dragDepthRef.current = 0;
    setDragOver(false);
    // In Tauri, OS drops are handled by onDragDropEvent (absolute paths).
    // HTML5 dataTransfer.files is empty or basename-only — ignore to avoid junk chips.
    if (isTauri()) return;

    const paths: string[] = [];
    for (const file of e.dataTransfer?.files ?? []) {
      const p = filePathFromBrowserFile(file);
      if (p) paths.push(p);
    }
    // Also accept text/uri-list (file://… from some shells)
    const uriList = e.dataTransfer?.getData("text/uri-list")?.trim();
    if (uriList) {
      for (const line of uriList.split(/\r?\n/)) {
        if (!line || line.startsWith("#")) continue;
        try {
          const u = new URL(line);
          if (u.protocol === "file:") {
            let path = decodeURIComponent(u.pathname);
            // Windows file URLs are `/C:/...` — strip the leading slash.
            if (/^\/[A-Za-z]:/.test(path)) path = path.slice(1);
            if (path) paths.push(path);
          }
        } catch {
          /* ignore */
        }
      }
    }
    attachPaths(paths);
  };

  const hasChips = attached.length > 0 || previewItems.length > 0;

  return (
    <div
      ref={dropZoneRef}
      className={`border-t bg-bg-secondary px-3 py-2.5 transition-colors ${
        dragOver
          ? "border-accent-blue bg-accent-blue/10 ring-1 ring-inset ring-accent-blue/70"
          : "border-border-default"
      }`}
      onDragEnter={onDragEnter}
      onDragOver={allowHtml5FileDrag}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragOver && (
        <div className="mb-2 rounded border border-dashed border-accent-blue/80 bg-accent-blue/5 px-2 py-1.5 text-center text-[11px] text-accent-blue">
          Drop files to attach
        </div>
      )}
      {hasChips && (
        <div className="mb-2 flex flex-wrap gap-1">
          {attached.map((p) => {
            const name = p.replace(/^.*[/\\]/, "") || p;
            return (
              <span
                key={`file:${p}`}
                className="inline-flex max-w-[280px] items-center gap-1 rounded border border-accent-blue/40 bg-accent-blue/10 px-2 py-0.5 font-mono text-[11px] text-text-secondary"
                title={`${p}\nБудет вставлен в контекст при отправке`}
              >
                <span className="shrink-0 text-accent-blue">@</span>
                <span className="min-w-0 truncate">{name}</span>
                <button
                  type="button"
                  className="shrink-0 text-text-muted hover:text-text-primary"
                  aria-label={`Remove ${p}`}
                  onClick={() => removeContext(p)}
                >
                  ×
                </button>
              </span>
            );
          })}
          {previewItems.map((it) => {
            if (it.kind === "docs") {
              return (
                <span
                  key={it.id}
                  className="inline-flex max-w-[320px] items-center gap-1 rounded border border-accent-blue/40 bg-accent-blue/10 px-2 py-0.5 text-[11px] text-text-secondary"
                  title={`${it.path}\n${it.snippet}`}
                >
                  <span className="shrink-0 font-sans text-[9px] uppercase text-accent-blue">docs</span>
                  <span className="min-w-0 truncate font-mono">{it.label}</span>
                  <button
                    type="button"
                    className="shrink-0 text-text-muted hover:text-text-primary"
                    aria-label={`Remove docs ${it.path}`}
                    onClick={() => removePreview(it.id)}
                  >
                    ×
                  </button>
                </span>
              );
            }
            return (
              <span
                key={it.id}
                className="inline-flex max-w-[360px] flex-col gap-0.5 rounded border border-accent-blue/40 bg-accent-blue/10 px-2 py-0.5 text-[11px] text-text-secondary"
                title={`${it.url}\n${it.snippet}`}
              >
                <span className="flex items-center gap-1">
                  <span className="shrink-0 font-sans text-[9px] uppercase text-accent-blue">web</span>
                  <span className="min-w-0 truncate font-medium">{it.title}</span>
                  <button
                    type="button"
                    className="shrink-0 text-text-muted hover:text-text-primary"
                    aria-label={`Remove web ${it.url}`}
                    onClick={() => removePreview(it.id)}
                  >
                    ×
                  </button>
                </span>
                <span className="line-clamp-2 max-w-full text-[10px] text-text-muted">{it.snippet}</span>
              </span>
            );
          })}
        </div>
      )}
      {previewBusy && (
        <div className="mb-1 text-[10px] text-text-muted">Загрузка превью…</div>
      )}
      <div
        className={`flex flex-col gap-1 rounded border bg-bg-primary p-1.5 focus-within:border-accent-blue/80 ${
          dragOver ? "border-accent-blue" : "border-border-default"
        }`}
      >
        <div className="relative flex gap-2">
          <FileMentionPicker
            open={mentionOpen}
            items={mentionItems}
            activeIndex={mentionIndex}
            onPick={(item) => void pickMention(item)}
          />
          <textarea
            ref={textareaRef}
            name="agent-message"
            autoComplete="off"
            spellCheck={true}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={() => void refreshMention()}
            onClick={() => void refreshMention()}
            disabled={isStreaming}
            rows={2}
            placeholder="Ask… @docs @web @file @codebase · /help · Enter send"
            aria-label="Сообщение агенту"
            className="max-h-40 min-h-[48px] min-w-0 flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-text-primary placeholder:text-text-muted disabled:opacity-50"
          />
          <div className="flex flex-col gap-1 self-end">
            {isStreaming && (
              <button
                type="button"
                className="rounded bg-accent-red/90 px-2 py-1 text-[11px] font-medium text-white hover:bg-accent-red"
                onClick={() => {
                  abortRef.current?.abort();
                  useChatStore.getState().setStreaming(false);
                }}
              >
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={() => void send()}
              disabled={isStreaming || !draft.trim()}
              aria-label="Отправить"
              className="rounded bg-accent-blue px-2.5 py-1 text-[12px] font-medium text-white hover:brightness-110 disabled:opacity-40"
            >
              ▶
            </button>
          </div>
        </div>
        <div className="flex min-w-0 items-center border-t border-border-muted pt-1">
          <ChatModelSelector />
        </div>
      </div>
    </div>
  );
}
