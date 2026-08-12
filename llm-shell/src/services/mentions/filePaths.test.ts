import { describe, expect, it } from "vitest";
import {
  extractMentionPaths,
  extractCodebaseQuery,
  getActiveMentionQuery,
  joinWorkspacePath,
  resolveWorkspacePath,
} from "./filePaths";

describe("filePaths mentions", () => {
  it("detects active @mention query at cursor", () => {
    const text = "fix bug in @src/comp";
    const q = getActiveMentionQuery(text, text.length);
    expect(q?.query).toBe("src/comp");
  });

  it("extracts @paths from message", () => {
    expect(extractMentionPaths("see @src/a.ts and @lib/b.rs")).toEqual(["src/a.ts", "lib/b.rs"]);
  });

  it("skips @docs @web @codebase in path extraction", () => {
    expect(
      extractMentionPaths("@docs STATUS.md @web https://x @codebase auth @src/a.ts"),
    ).toEqual(["src/a.ts"]);
  });

  it("extracts codebase query", () => {
    expect(extractCodebaseQuery("@codebase how auth works")).toBe("how auth works");
  });

  it("joins workspace relative paths", () => {
    expect(joinWorkspacePath("C:\\proj", "src/foo.ts")).toBe("C:\\proj\\src\\foo.ts");
  });

  it("resolves absolute paths unchanged", () => {
    expect(resolveWorkspacePath("C:/proj", "D:/other/x.ts")).toBe("D:/other/x.ts");
  });
});
