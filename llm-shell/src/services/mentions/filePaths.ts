import { globSearch } from "@/services/tauri/search";
import { isTauri } from "@/utils/env";

/** Active `@mention` query at cursor, if any. */
export function getActiveMentionQuery(
  text: string,
  cursorPos: number,
): { query: string; start: number } | null {
  const before = text.slice(0, cursorPos);
  const match = /(?:^|\s)@([\w./\\-]*)$/.exec(before);
  if (!match) return null;
  const query = match[1];
  return { query, start: cursorPos - query.length - 1 };
}

export function joinWorkspacePath(root: string, fragment: string): string {
  const normRoot = root.replace(/\\/g, "/").replace(/\/+$/, "");
  const frag = fragment.replace(/\\/g, "/").replace(/^[/\\]+/, "");
  if (/^[A-Za-z]:\//.test(frag) || frag.startsWith("/")) return fragment;
  const sep = root.includes("\\") ? "\\" : "/";
  return `${normRoot.split("/").join(sep)}${sep}${frag.split("/").join(sep)}`;
}

export function resolveWorkspacePath(root: string, fragment: string): string {
  const trimmed = fragment.trim();
  if (!trimmed) return "";
  if (/^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  if (!root) return trimmed;
  return joinWorkspacePath(root, trimmed);
}

/** Collect `@path` tokens from message text (excludes @docs / @web / @codebase). */
export function extractMentionPaths(text: string): string[] {
  const out: string[] = [];
  const re = /(?:^|\s)@(?!(?:codebase|docs|web)\b)([\w./\\-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const p = m[1]?.trim();
    if (p && !out.includes(p)) out.push(p);
  }
  return out;
}

export async function searchMentionFiles(root: string, query: string, limit = 12): Promise<string[]> {
  if (!isTauri() || !root.trim()) return [];
  const q = query.trim().toLowerCase();
  try {
    const pattern = q ? `**/*${q}*` : "**/*";
    const hits = await globSearch(pattern, root, [
      "**/node_modules/**",
      "**/.git/**",
      "**/target/**",
      "**/dist/**",
    ]);
    return hits
      .filter((p) => !p.endsWith("/"))
      .sort((a, b) => a.length - b.length)
      .slice(0, limit);
  } catch {
    return [];
  }
}

const WIN_PATH = /[A-Za-z]:\\[^\s`"'<>|]+/;
const UNIX_PATH = /\/(?:[\w.-]+\/)*[\w.-]+/;
const REL_PATH = /(?:[\w.-]+[/\\])[\w./\\-]+\.\w{1,8}/;

export function extractClickablePaths(text: string): string[] {
  const found = new Set<string>();
  for (const re of [WIN_PATH, UNIX_PATH, REL_PATH]) {
    for (const m of text.matchAll(new RegExp(re.source, "g"))) {
      const p = m[0].replace(/[.,;:!?)]+$/, "");
      if (p.length >= 3) found.add(p);
    }
  }
  return [...found];
}

export function hasCodebaseMention(text: string): boolean {
  return /@codebase\b/i.test(text);
}

/** Query text after @codebase (or whole message sans tag). */
export function extractCodebaseQuery(text: string): string {
  const m = text.match(/@codebase\s+([\s\S]+)/i);
  if (m?.[1]?.trim()) return m[1].trim();
  const stripped = text.replace(/@codebase/gi, "").trim();
  return stripped || "project overview";
}
