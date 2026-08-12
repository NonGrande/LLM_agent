export interface SkillMeta {
  name: string;
  description: string;
  /** Absolute or logical path to SKILL.md */
  path: string;
  source: "bundled" | "workspace" | "cursor";
}

export interface Skill extends SkillMeta {
  body: string;
  /** Full markdown including frontmatter stripped from body */
  raw: string;
}
