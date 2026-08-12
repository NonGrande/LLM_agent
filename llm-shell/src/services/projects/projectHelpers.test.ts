import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_ID,
  ensureProjects,
  findProjectByPath,
  upsertProject,
} from "./projectHelpers";

describe("projectHelpers", () => {
  it("creates default project from legacy workspace path", () => {
    const r = ensureProjects({ workspace: { path: "C:/code/app" } });
    expect(r.projects).toHaveLength(1);
    expect(r.activeProjectId).toBe(DEFAULT_PROJECT_ID);
    expect(r.workspacePath).toBe("C:/code/app");
  });

  it("upserts by normalized path", () => {
    const first = upsertProject([], "C:\\proj\\a");
    const second = upsertProject(first.projects, "C:/proj/a");
    expect(second.projects).toHaveLength(1);
    expect(second.project.id).toBe(first.project.id);
  });

  it("finds project case-insensitively", () => {
    const { projects } = upsertProject([], "D:/Foo");
    expect(findProjectByPath(projects, "d:/foo")?.path).toBe("D:/Foo");
  });
});
