import { create } from "zustand";
import { readFile } from "@/services/tauri/fs";
import { isTauri } from "@/utils/env";

interface ContextAttachState {
  /** Absolute paths attached for the next agent turn */
  paths: string[];
  add: (path: string | string[]) => void;
  remove: (path: string) => void;
  clear: () => void;
  toggle: (path: string) => void;
}

function merge(prev: string[], next: string[]): string[] {
  const set = new Set(prev);
  for (const p of next) {
    const t = p.trim();
    if (t) set.add(t);
  }
  return [...set];
}

export const useContextAttachStore = create<ContextAttachState>((set, get) => ({
  paths: [],
  add: (path) => {
    const list = Array.isArray(path) ? path : [path];
    set({ paths: merge(get().paths, list) });
  },
  remove: (path) => set({ paths: get().paths.filter((p) => p !== path) }),
  clear: () => set({ paths: [] }),
  toggle: (path) => {
    const t = path.trim();
    if (!t) return;
    if (get().paths.includes(t)) get().remove(t);
    else get().add(t);
  },
}));

const CONTENT_CAP = 24_000;
const TOTAL_CAP = 80_000;

/**
 * Load attached files into a prompt block so the model can analyze without
 * relying on tool-calling (important for small local models).
 */
export async function buildAttachedFilesContext(paths: string[]): Promise<string> {
  if (!paths.length) return "";
  if (!isTauri()) {
    return (
      "\n\n[Attached paths — open in Tauri to inline contents]\n" +
      paths.map((p) => `- ${p}`).join("\n")
    );
  }

  const parts: string[] = [];
  let total = 0;
  for (const path of paths) {
    if (total >= TOTAL_CAP) {
      parts.push(`\n… truncated: ${paths.length - parts.length} more path(s) not inlined`);
      break;
    }
    try {
      const file = await readFile(path);
      if (file.is_binary) {
        parts.push(`\n### Attached (binary, skipped): ${path}`);
        continue;
      }
      let body = file.content;
      if (body.length > CONTENT_CAP) {
        body = body.slice(0, CONTENT_CAP) + "\n… [truncated]";
      }
      total += body.length;
      parts.push(`\n### Attached file: ${path}\n\`\`\`\n${body}\n\`\`\``);
    } catch (err) {
      parts.push(`\n### Attached file: ${path}\n(error reading: ${String(err)})`);
    }
  }

  if (!parts.length) return "";
  return (
    "\n\n## User-attached documents (use as primary context; do not re-list_files to rediscover them)\n" +
    parts.join("\n")
  );
}
