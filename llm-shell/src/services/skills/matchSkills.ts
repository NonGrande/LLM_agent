import type { Skill } from "./types";

/**
 * Select relevant skills for a user message.
 * - Explicit `/skill name` or `@skill name` always included
 * - Otherwise score by description/name token overlap (max 3)
 */
export function matchSkills(userText: string, skills: Skill[], max = 3): Skill[] {
  const explicit = [...userText.matchAll(/(?:\/skill|@skill)\s+([a-zA-Z0-9_-]+)/gi)].map((m) =>
    m[1].toLowerCase(),
  );

  const selected: Skill[] = [];
  for (const name of explicit) {
    const s = skills.find((x) => x.name.toLowerCase() === name);
    if (s && !selected.some((x) => x.name === s.name)) selected.push(s);
  }

  if (selected.length >= max) return selected.slice(0, max);

  const tokens = tokenize(userText);
  if (tokens.length === 0) return selected;

  const scored = skills
    .filter((s) => !selected.some((x) => x.name === s.name))
    .map((s) => ({
      skill: s,
      score: scoreSkill(s, tokens, userText.toLowerCase()),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const row of scored) {
    if (selected.length >= max) break;
    selected.push(row.skill);
  }
  return selected;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zа-яё0-9_+.-]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function scoreSkill(skill: Skill, tokens: string[], full: string): number {
  const hay = `${skill.name} ${skill.description}`.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) score += t.length >= 5 ? 2 : 1;
  }
  // strong triggers for skill-finder
  if (
    skill.name === "skill-finder" &&
    /(скилл|skill|skills\.sh|плагин|расширен|найди skill|find skill)/i.test(full)
  ) {
    score += 10;
  }
  if (
    skill.name === "screenshot" &&
    /(screenshot|скриншот|сними\s+экран|сделай\s+скрин|capture\s+screen|inspect\s+(the\s+)?ui|look\s+at\s+(the\s+)?ui)/i.test(
      full,
    )
  ) {
    score += 10;
  }
  return score;
}

/** Format skills for injection into system context. */
export function formatSkillsForPrompt(skills: Skill[]): string {
  if (skills.length === 0) return "";
  const parts = skills.map(
    (s) =>
      `### Skill: ${s.name}\nSource: ${s.source} (${s.path})\n\n${s.body}`,
  );
  return (
    `\n\n## Active skills (follow these instructions when relevant)\n` +
    `You have ${skills.length} skill(s) loaded. Apply them when the user request matches.\n\n` +
    parts.join("\n\n---\n\n")
  );
}

export function formatSkillsCatalog(skills: Skill[]): string {
  if (skills.length === 0) return "No skills loaded.";
  return skills
    .map((s) => `- **${s.name}** (${s.source}): ${s.description.slice(0, 160)}`)
    .join("\n");
}
