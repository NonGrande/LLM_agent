import { globSearch } from "@/services/tauri/search";
import { readFile } from "@/services/tauri/fs";
import { isTauri } from "@/utils/env";

const MAX_RULE_CHARS = 12_000;

async function readTextFile(path: string): Promise<string | null> {
  try {
    const f = await readFile(path);
    if (f.is_binary) return null;
    return f.content;
  } catch {
    return null;
  }
}

/** Load `.cursor/rules/**`, `AGENTS.md`, `.cursorrules` from workspace. */
export async function loadWorkspaceRules(workspaceRoot: string): Promise<string> {
  if (!isTauri() || !workspaceRoot.trim()) return "";

  const parts: string[] = [];
  let total = 0;

  const push = (label: string, text: string | null) => {
    if (!text?.trim() || total >= MAX_RULE_CHARS) return;
    const block = `### ${label}\n${text.trim()}`;
    parts.push(block.slice(0, MAX_RULE_CHARS - total));
    total += block.length;
  };

  push("AGENTS.md", await readTextFile(`${workspaceRoot}/AGENTS.md`));
  push(".cursorrules", await readTextFile(`${workspaceRoot}/.cursorrules`));

  try {
    const ruleFiles = await globSearch("**/*", `${workspaceRoot}/.cursor/rules`, []);
    for (const file of ruleFiles.slice(0, 30)) {
      if (!/\.(md|mdc|txt)$/i.test(file)) continue;
      const rel = file.replace(/\\/g, "/").split("/.cursor/rules/").pop() ?? file;
      push(`.cursor/rules/${rel}`, await readTextFile(file));
      if (total >= MAX_RULE_CHARS) break;
    }
  } catch {
    /* no rules dir */
  }

  if (!parts.length) return "";
  return `## Project rules\n\n${parts.join("\n\n")}`;
}
