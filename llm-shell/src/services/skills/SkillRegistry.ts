import type { Skill } from "./types";
import { parseSkillMarkdown } from "./parseSkill";
import { listDirectory, readFile } from "@/services/tauri/fs";
import { isTauri } from "@/utils/env";
import { errorMessage } from "@/utils/errors";

/** Bundled skills shipped with the app (Vite raw imports). */
const bundledModules = import.meta.glob("../../../skills/**/SKILL.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export class SkillRegistry {
  private skills: Skill[] = [];

  list(): Skill[] {
    return [...this.skills];
  }

  get(name: string): Skill | undefined {
    const key = name.toLowerCase();
    return this.skills.find((s) => s.name.toLowerCase() === key);
  }

  /** Load bundled + optional workspace / .cursor skills. */
  async load(workspacePath?: string): Promise<Skill[]> {
    const out: Skill[] = [];

    for (const [modPath, raw] of Object.entries(bundledModules)) {
      const skill = parseSkillMarkdown(raw, modPath, "bundled");
      if (skill) out.push(skill);
    }

    if (workspacePath && isTauri()) {
      const roots = [
        { dir: joinPath(workspacePath, "skills"), source: "workspace" as const },
        { dir: joinPath(workspacePath, ".cursor", "skills"), source: "cursor" as const },
      ];
      for (const root of roots) {
        try {
          const found = await loadSkillsFromDir(root.dir, root.source);
          for (const s of found) {
            if (!out.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) {
              out.push(s);
            } else {
              // workspace overrides bundled same name
              const idx = out.findIndex((x) => x.name.toLowerCase() === s.name.toLowerCase());
              if (idx >= 0 && s.source !== "bundled") out[idx] = s;
            }
          }
        } catch (err) {
          console.warn("skills load skipped:", root.dir, errorMessage(err));
        }
      }
    }

    this.skills = out;
    return this.list();
  }
}

async function loadSkillsFromDir(dir: string, source: Skill["source"]): Promise<Skill[]> {
  const entries = await listDirectory(dir);
  const skills: Skill[] = [];
  for (const e of entries) {
    if (!e.is_dir) continue;
    const skillPath = joinPath(e.path, "SKILL.md");
    try {
      const file = await readFile(skillPath);
      if (file.is_binary) continue;
      const skill = parseSkillMarkdown(file.content, skillPath, source);
      if (skill) skills.push(skill);
    } catch {
      // no SKILL.md in this folder
    }
  }
  return skills;
}

function joinPath(a: string, ...parts: string[]): string {
  const sep = a.includes("\\") ? "\\" : "/";
  let out = a.replace(/[\\/]+$/, "");
  for (const p of parts) {
    out = `${out}${sep}${p.replace(/^[\\/]+/, "")}`;
  }
  return out;
}

let singleton: SkillRegistry | null = null;

export function getSkillRegistry(): SkillRegistry {
  if (!singleton) singleton = new SkillRegistry();
  return singleton;
}
