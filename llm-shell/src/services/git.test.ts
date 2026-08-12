import { describe, expect, it } from "vitest";
import { parseBranches } from "./git";

describe("git branch parse", () => {
  it("detects current and local branches", () => {
    const { current, branches } = parseBranches(`* main\n  feature/ui\n  develop\n`);
    expect(current).toBe("main");
    expect(branches).toEqual(["main", "feature/ui", "develop"]);
  });

  it("handles detached HEAD", () => {
    const { current, branches } = parseBranches(`* (HEAD detached at abc123)\n  main\n`);
    expect(current).toBe("(HEAD detached at abc123)");
    expect(branches).toEqual(["main"]);
  });
});
