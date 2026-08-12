import type { Project } from "@/types";

export const DEFAULT_PROJECT_ID = "project-default";

export function normalizeProjectPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function projectDisplayName(path: string): string {
  if (!path.trim()) return "Без папки";
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function createProject(path: string, id?: string): Project {
  const now = Date.now();
  return {
    id: id ?? crypto.randomUUID(),
    name: projectDisplayName(path),
    path,
    lastOpenedAt: now,
  };
}

export function findProjectByPath(projects: Project[], path: string): Project | undefined {
  const norm = normalizeProjectPath(path);
  if (!norm) return projects.find((p) => !normalizeProjectPath(p.path));
  return projects.find((p) => normalizeProjectPath(p.path) === norm);
}

export function upsertProject(projects: Project[], path: string): { projects: Project[]; project: Project } {
  const existing = findProjectByPath(projects, path);
  if (existing) {
    const updated = { ...existing, lastOpenedAt: Date.now(), name: projectDisplayName(path) };
    return {
      projects: projects.map((p) => (p.id === existing.id ? updated : p)),
      project: updated,
    };
  }
  const project = createProject(path);
  return { projects: [project, ...projects].slice(0, 20), project };
}

/** Migrate legacy settings + chat sessions without projectId. */
export function ensureProjects(settings: {
  projects?: Project[];
  activeProjectId?: string;
  workspace?: { path?: string };
}): { projects: Project[]; activeProjectId: string; workspacePath: string } {
  let projects = settings.projects ?? [];
  let activeProjectId = settings.activeProjectId ?? "";
  const legacyPath = settings.workspace?.path ?? "";

  if (projects.length === 0) {
    const p = legacyPath
      ? createProject(legacyPath, DEFAULT_PROJECT_ID)
      : createProject("", DEFAULT_PROJECT_ID);
    projects = [p];
    activeProjectId = p.id;
  }

  if (!projects.some((p) => p.id === activeProjectId)) {
    activeProjectId = projects[0]?.id ?? DEFAULT_PROJECT_ID;
  }

  const active = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const workspacePath = active?.path ?? legacyPath;

  return { projects, activeProjectId, workspacePath };
}

export function sessionProjectId(session: { projectId?: string }): string {
  return session.projectId ?? DEFAULT_PROJECT_ID;
}
