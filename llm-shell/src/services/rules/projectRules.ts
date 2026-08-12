import { readFile, writeFile } from "@/services/tauri/fs";
import { globSearch } from "@/services/tauri/search";
import { isTauri } from "@/utils/env";

export const PINNED_RULES_MARKER = "## Pinned rules (LLM Shell)";

function normalizeRoot(workspaceRoot: string): string {
  return workspaceRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}

export function agentsMdPath(workspaceRoot: string): string {
  return `${normalizeRoot(workspaceRoot)}/AGENTS.md`;
}

/** Strip code blocks and trim assistant text for AGENTS.md pin. */
export function condenseRuleFromAnswer(text: string, maxLen = 600): string {
  let s = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (s.length > maxLen) s = `${s.slice(0, maxLen).trim()}…`;
  return s;
}

export async function readAgentsMd(workspaceRoot: string): Promise<string> {
  if (!isTauri() || !workspaceRoot.trim()) return "";
  try {
    const f = await readFile(agentsMdPath(workspaceRoot));
    return f.is_binary ? "" : f.content;
  } catch {
    return "";
  }
}

export async function writeAgentsMd(workspaceRoot: string, content: string): Promise<void> {
  if (!isTauri() || !workspaceRoot.trim()) {
    throw new Error("Workspace недоступен (нужен Tauri и путь к проекту)");
  }
  await writeFile(agentsMdPath(workspaceRoot), content);
}

export async function appendRuleToAgents(
  workspaceRoot: string,
  rule: string,
  userQuery?: string,
): Promise<void> {
  const condensed = condenseRuleFromAnswer(rule);
  if (condensed.length < 8) {
    throw new Error("Слишком короткий текст для правила");
  }

  const existing = await readAgentsMd(workspaceRoot);
  const date = new Date().toISOString().slice(0, 10);
  const ctx = userQuery?.trim()
    ? `**Context:** ${userQuery.trim().slice(0, 200)}\n\n`
    : "";
  const block = `\n\n### ${date}\n${ctx}${condensed}\n`;

  let next: string;
  if (!existing.trim()) {
    next = `# AGENTS\n\n${PINNED_RULES_MARKER}${block}`;
  } else if (existing.includes(PINNED_RULES_MARKER)) {
    const idx = existing.indexOf(PINNED_RULES_MARKER);
    next = `${existing.slice(0, idx + PINNED_RULES_MARKER.length)}${block}${existing.slice(idx + PINNED_RULES_MARKER.length)}`;
  } else {
    next = `${existing.trimEnd()}\n\n${PINNED_RULES_MARKER}${block}`;
  }

  await writeAgentsMd(workspaceRoot, next);
}

export interface CursorRuleFile {
  path: string;
  name: string;
}

export async function listCursorRuleFiles(workspaceRoot: string): Promise<CursorRuleFile[]> {
  if (!isTauri() || !workspaceRoot.trim()) return [];
  try {
    const root = normalizeRoot(workspaceRoot);
    const files = await globSearch("**/*", `${root}/.cursor/rules`, []);
    return files
      .filter((f) => /\.(md|mdc|txt)$/i.test(f))
      .slice(0, 50)
      .map((path) => ({
        path,
        name: path.replace(/\\/g, "/").split("/.cursor/rules/").pop() ?? path,
      }));
  } catch {
    return [];
  }
}

export async function readRuleFile(path: string): Promise<string> {
  try {
    const f = await readFile(path);
    return f.is_binary ? "" : f.content;
  } catch {
    return "";
  }
}

export async function writeRuleFile(path: string, content: string): Promise<void> {
  await writeFile(path, content);
}
