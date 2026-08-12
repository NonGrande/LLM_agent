import { describe, expect, it } from "vitest";
import {
  formatSuccessMemoryForPrompt,
  retrieveSuccessMemories,
  scoreMemoryEntry,
  scoreMemoryHybrid,
} from "./successMemory";
import type { SuccessMemoryEntry } from "./successMemory";

function entry(partial: Partial<SuccessMemoryEntry>): SuccessMemoryEntry {
  return {
    id: "1",
    workspacePath: "C:/proj",
    sessionId: "s",
    userQuery: "fix login",
    solutionSummary: "edited auth.ts",
    toolsUsed: ["read_file"],
    filesTouched: ["C:/proj/auth.ts"],
    createdAt: 1,
    outcome: "success",
    ...partial,
  };
}

describe("successMemory", () => {
  it("scores overlapping queries higher", () => {
    const e = entry({ userQuery: "настрой Yandex API ключ", solutionSummary: "gpt://folder/yandexgpt" });
    expect(scoreMemoryEntry("Yandex API ключ", e)).toBeGreaterThan(0.2);
    expect(scoreMemoryEntry("совсем другая тема xyz", e)).toBeLessThan(0.1);
  });

  it("retrieves only same workspace", () => {
    const list = [
      entry({ id: "a", workspacePath: "C:/proj" }),
      entry({ id: "b", workspacePath: "D:/other", userQuery: "fix login" }),
    ];
    const r = retrieveSuccessMemories("fix login auth", "C:/proj", list);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("a");
  });

  it("formats prompt block", () => {
    const block = formatSuccessMemoryForPrompt([entry({})]);
    expect(block).toContain("Past successful tasks");
    expect(block).toContain("fix login");
  });

  it("hybrid prefers embedding when present", () => {
    const withEmb = entry({
      embedding: [1, 0, 0],
      userQuery: "zzz unrelated tokens nowhere",
      solutionSummary: "zzz",
    });
    const score = scoreMemoryHybrid("login", withEmb, [1, 0, 0]);
    expect(score).toBeGreaterThan(0.5);
  });

  it("filters by projectId when set", () => {
    const list = [
      entry({ id: "a", projectId: "p1", userQuery: "fix login" }),
      entry({ id: "b", projectId: "p2", userQuery: "fix login" }),
      entry({ id: "c", userQuery: "fix login" }),
    ];
    const r = retrieveSuccessMemories("fix login", "C:/proj", list, 5, { projectId: "p1" });
    expect(r.map((e) => e.id).sort()).toEqual(["a", "c"]);
  });
});
