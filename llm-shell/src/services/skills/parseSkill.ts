import type { Skill } from "./types";

/** Minimal YAML-ish frontmatter parser for SKILL.md (name + description). */
export function parseSkillMarkdown(raw: string, path: string, source: Skill["source"]): Skill | null {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  if (!trimmed.startsWith("---")) return null;

  const end = trimmed.indexOf("\n---", 3);
  if (end < 0) return null;

  const fm = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 4).replace(/^\r?\n/, "").trim();

  const name = readFmString(fm, "name");
  const description = readFmString(fm, "description");
  if (!name) return null;

  return {
    name,
    description: description || name,
    path,
    source,
    body,
    raw: trimmed,
  };
}

function readFmString(fm: string, key: string): string {
  // block scalar: description: >\n  line1\n  line2
  const block = new RegExp(`^${key}:\\s*>\\s*\\n([\\s\\S]*?)(?=\\n\\w[\\w-]*:|$)`, "m").exec(fm);
  if (block) {
    return block[1]
      .split("\n")
      .map((l) => l.replace(/^\s{2}/, "").trimEnd())
      .join(" ")
      .trim();
  }
  // quoted or plain: name: value
  const line = new RegExp(`^${key}:\\s*(.*)$`, "m").exec(fm);
  if (!line) return "";
  let v = line[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v.trim();
}
