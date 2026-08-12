import { globSearch } from "@/services/tauri/search";
import { readFile } from "@/services/tauri/fs";
import { httpGetText } from "@/services/tauri/httpText";
import { isTauri } from "@/utils/env";
import { resolveWorkspacePath } from "@/services/mentions/filePaths";

export type MentionPickerKind = "special" | "file" | "docs" | "web";

export interface MentionPickerItem {
  kind: MentionPickerKind;
  value: string;
  label: string;
  hint?: string;
}

export const MENTION_SPECIALS: MentionPickerItem[] = [
  { kind: "special", value: "docs", label: "@docs", hint: "Документация workspace" },
  { kind: "special", value: "web", label: "@web", hint: "Страница по URL" },
  { kind: "special", value: "codebase", label: "@codebase", hint: "Поиск по индексу" },
];

const SPECIAL_NAMES = new Set(["docs", "web", "codebase"]);

const DOCS_GLOBS = [
  "**/docs/**",
  "**/README*",
  "**/USER.md",
  "**/AGENTS.md",
  "**/CHANGELOG*",
  "**/CONTRIBUTING*",
  "**/STATUS.md",
  "**/ARCHITECTURE.md",
  "**/TZ*.md",
  "**/PLAN*.md",
];

const CONTENT_CAP = 24_000;
const WEB_SNIPPET = 220;

export function isSpecialMentionName(name: string): boolean {
  return SPECIAL_NAMES.has(name.trim().toLowerCase());
}

/** Decode a few common HTML entities. */
export function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Rough HTML → plain text for preview / prompt injection. */
export function htmlToPlainText(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|br|blockquote|pre|section|article)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeBasicEntities(s);
  return s
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function extractTitleFromHtml(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m?.[1]) return null;
  const t = decodeBasicEntities(m[1].replace(/<[^>]+>/g, "")).trim();
  return t || null;
}

/** Normalize user-typed URL (add https:// if missing). */
export function normalizeWebUrl(raw: string): string {
  const t = raw.trim().replace(/[),.;]+$/, "");
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w.-]+\.[a-z]{2,}([/:].*)?$/i.test(t)) return `https://${t}`;
  return t;
}

export function looksLikeUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  return /^[\w.-]+\.[a-z]{2,}([/:].*)?$/i.test(t);
}

/** Leftover `@web https://…` tokens in the message. */
export function parseWebMentions(text: string): string[] {
  const out: string[] = [];
  const re = /(?:^|\s)@web\s+(\S+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const url = normalizeWebUrl(m[1] ?? "");
    if (url && looksLikeUrl(url) && !out.includes(url)) out.push(url);
  }
  return out;
}

/** Leftover `@docs path/or/query` tokens (path-like fragment). */
export function parseDocsMentions(text: string): string[] {
  const out: string[] = [];
  const re = /(?:^|\s)@docs\s+([\w./\\-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const p = (m[1] ?? "").trim();
    if (p && !isSpecialMentionName(p) && !out.includes(p)) out.push(p);
  }
  return out;
}

export type ActiveMentionMode = "file" | "docs" | "web";

export interface ActiveMentionQuery {
  query: string;
  start: number;
  mode: ActiveMentionMode;
}

/**
 * Active `@…` at cursor. Supports `@docs …` / `@web …` (space after keyword)
 * and plain `@path` / `@docs` / `@web` / `@codebase`.
 */
export function getActiveDocsWebMention(
  text: string,
  cursorPos: number,
): ActiveMentionQuery | null {
  const before = text.slice(0, cursorPos);

  const docsSp = /(?:^|\s)@docs(?:\s+([\w./\\-]*))?$/i.exec(before);
  if (docsSp) {
    const idx = before.toLowerCase().lastIndexOf("@docs");
    if (idx >= 0) {
      return { query: docsSp[1] ?? "", start: idx, mode: "docs" };
    }
  }

  const webSp = /(?:^|\s)@web(?:\s+(\S*))?$/i.exec(before);
  if (webSp) {
    const idx = before.toLowerCase().lastIndexOf("@web");
    if (idx >= 0) {
      return { query: webSp[1] ?? "", start: idx, mode: "web" };
    }
  }

  return null;
}

export async function searchDocsFiles(
  root: string,
  query: string,
  limit = 12,
): Promise<string[]> {
  if (!isTauri() || !root.trim()) return [];
  const q = query.trim().toLowerCase();
  const found = new Set<string>();
  try {
    for (const pattern of DOCS_GLOBS) {
      const hits = await globSearch(pattern, root, [
        "**/node_modules/**",
        "**/.git/**",
        "**/target/**",
        "**/dist/**",
      ]);
      for (const p of hits) {
        if (p.endsWith("/") || p.endsWith("\\")) continue;
        found.add(p);
      }
    }
  } catch {
    return [];
  }

  let list = [...found];
  if (q) {
    list = list.filter((p) => p.replace(/\\/g, "/").toLowerCase().includes(q));
  }
  return list.sort((a, b) => a.length - b.length).slice(0, limit);
}

export interface WebPreviewResult {
  url: string;
  title: string;
  snippet: string;
  content: string;
  status: number;
  error?: string;
}

export async function fetchWebPreview(
  url: string,
  opts?: { proxyUrl?: string; timeoutMs?: number; maxChars?: number },
): Promise<WebPreviewResult> {
  const normalized = normalizeWebUrl(url);
  if (!normalized || !looksLikeUrl(normalized)) {
    return {
      url: url.trim(),
      title: url.trim() || "(empty)",
      snippet: "Некорректный URL",
      content: "",
      status: 0,
      error: "Invalid URL",
    };
  }
  try {
    const res = await httpGetText(normalized, {
      proxyUrl: opts?.proxyUrl,
      timeoutMs: opts?.timeoutMs,
      maxChars: opts?.maxChars ?? 80_000,
    });
    const ct = (res.content_type || "").toLowerCase();
    const body = res.body ?? "";
    const isHtml =
      ct.includes("html") || /^\s*</.test(body) || /<html[\s>]/i.test(body);
    const plain = isHtml ? htmlToPlainText(body) : body.trim();
    const title =
      (isHtml ? extractTitleFromHtml(body) : null) ||
      normalized.replace(/^https?:\/\//i, "").slice(0, 80);
    const content =
      plain.length > CONTENT_CAP ? plain.slice(0, CONTENT_CAP) + "\n… [truncated]" : plain;
    return {
      url: normalized,
      title,
      snippet: plain.slice(0, WEB_SNIPPET) + (plain.length > WEB_SNIPPET ? "…" : ""),
      content,
      status: res.status,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      url: normalized,
      title: normalized,
      snippet: msg.slice(0, WEB_SNIPPET),
      content: "",
      status: 0,
      error: msg,
    };
  }
}

export interface DocsPreviewResult {
  path: string;
  label: string;
  snippet: string;
  content: string;
  error?: string;
}

export async function loadDocsPreview(
  root: string,
  fragment: string,
): Promise<DocsPreviewResult> {
  const path = resolveWorkspacePath(root, fragment);
  const label = path.replace(/^.*[/\\]/, "") || path;
  if (!isTauri()) {
    return {
      path,
      label,
      snippet: "Откройте в Tauri, чтобы загрузить содержимое",
      content: "",
      error: "not-tauri",
    };
  }
  try {
    const file = await readFile(path);
    if (file.is_binary) {
      return { path, label, snippet: "(binary)", content: "", error: "binary" };
    }
    let body = file.content ?? "";
    if (body.length > CONTENT_CAP) {
      body = body.slice(0, CONTENT_CAP) + "\n… [truncated]";
    }
    return {
      path,
      label,
      snippet: body.slice(0, WEB_SNIPPET).replace(/\s+/g, " ") + (body.length > WEB_SNIPPET ? "…" : ""),
      content: body,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { path, label, snippet: msg.slice(0, WEB_SNIPPET), content: "", error: msg };
  }
}

export function formatWebForPrompt(
  items: Array<{ url: string; title: string; content: string; error?: string }>,
): string {
  if (!items.length) return "";
  const parts = items.map((it) => {
    if (it.error && !it.content) {
      return `\n### ${it.title}\nURL: ${it.url}\n(error: ${it.error})`;
    }
    return `\n### ${it.title}\nURL: ${it.url}\n\n${it.content || "(empty)"}`;
  });
  return (
    "\n\n## Web context\n" +
    "Use the following fetched pages as context. Cite URLs when relevant.\n" +
    parts.join("\n")
  );
}

export function formatDocsForPrompt(
  items: Array<{ path: string; content: string; error?: string }>,
): string {
  if (!items.length) return "";
  const parts = items.map((it) => {
    if (it.error && !it.content) {
      return `\n### Docs: ${it.path}\n(error: ${it.error})`;
    }
    return `\n### Docs: ${it.path}\n\`\`\`\n${it.content || "(empty)"}\n\`\`\``;
  });
  return (
    "\n\n## Docs context\n" +
    "Project documentation attached by the user (@docs). Prefer these over rediscovering paths.\n" +
    parts.join("\n")
  );
}

/** Build picker rows for plain `@` (specials + files). */
export function buildSpecialAndFileItems(
  query: string,
  filePaths: string[],
): MentionPickerItem[] {
  const q = query.trim().toLowerCase();
  const specials = MENTION_SPECIALS.filter(
    (s) => !q || s.value.startsWith(q) || s.label.toLowerCase().includes(q),
  );
  const files: MentionPickerItem[] = filePaths.map((p) => ({
    kind: "file" as const,
    value: p,
    label: p.replace(/\\/g, "/").split("/").slice(-2).join("/"),
    hint: p,
  }));
  return [...specials, ...files];
}
