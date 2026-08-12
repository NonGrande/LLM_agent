import * as fs from "@/services/tauri/fs";
import { fuzzyReplace, normalizeText } from "@/services/agent/fuzzyMatch";

export interface PatchHunk {
  oldLines: string[];
  newLines: string[];
}

export interface ApplyPatchResult {
  ok: boolean;
  path: string;
  message: string;
  fuzzy?: boolean;
  bytes?: number;
}

/** Parse a minimal single-file unified diff body (hunks only). */
export function parseUnifiedPatch(patch: string): PatchHunk[] {
  const lines = normalizeText(patch).split("\n");
  const hunks: PatchHunk[] = [];
  let current: PatchHunk | null = null;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      if (current) hunks.push(current);
      current = { oldLines: [], newLines: [] };
      continue;
    }
    if (!current) continue;
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (line.startsWith("-")) current.oldLines.push(line.slice(1));
    else if (line.startsWith("+")) current.newLines.push(line.slice(1));
    else if (line.startsWith(" ")) {
      const t = line.slice(1);
      current.oldLines.push(t);
      current.newLines.push(t);
    } else if (line.length > 0) {
      current.oldLines.push(line);
      current.newLines.push(line);
    }
  }
  if (current) hunks.push(current);
  return hunks;
}

function applyHunks(content: string, hunks: PatchHunk[]): { ok: boolean; content?: string; message: string } {
  let text = content;
  for (const hunk of hunks) {
    const oldBlock = hunk.oldLines.join("\n");
    const newBlock = hunk.newLines.join("\n");
    const r = fuzzyReplace(text, oldBlock, newBlock, false);
    if (!r.ok || r.content === undefined) {
      return { ok: false, message: r.message };
    }
    text = r.content;
  }
  return { ok: true, content: text, message: "ok" };
}

export async function applyPatchToFile(
  filePath: string,
  patch: string,
  mode: "unified" | "replace" = "unified",
  oldString?: string,
  newString?: string,
): Promise<ApplyPatchResult> {
  let content = "";
  let existed = true;
  try {
    const file = await fs.readFile(filePath);
    if (file.is_binary) {
      return { ok: false, path: filePath, message: "Cannot patch binary file" };
    }
    content = file.content;
  } catch {
    existed = false;
    content = "";
  }

  if (mode === "replace" && oldString !== undefined && newString !== undefined) {
    const base = existed ? content : "";
    const r = fuzzyReplace(base, oldString, newString, false);
    if (!r.ok || r.content === undefined) {
      return { ok: false, path: filePath, message: r.message };
    }
    await fs.writeFile(filePath, r.content);
    return {
      ok: true,
      path: filePath,
      message: r.message,
      fuzzy: r.fuzzy,
      bytes: r.content.length,
    };
  }

  const hunks = parseUnifiedPatch(patch);
  if (hunks.length === 0 && oldString && newString !== undefined) {
    return applyPatchToFile(filePath, patch, "replace", oldString, newString);
  }
  if (hunks.length === 0) {
    return { ok: false, path: filePath, message: "No patch hunks found" };
  }

  const applied = applyHunks(content, hunks);
  if (!applied.ok || applied.content === undefined) {
    return { ok: false, path: filePath, message: applied.message };
  }
  await fs.writeFile(filePath, applied.content);
  return {
    ok: true,
    path: filePath,
    message: applied.message,
    bytes: applied.content.length,
  };
}
