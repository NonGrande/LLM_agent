import { describe, expect, it } from "vitest";
import { parseUnifiedPatch } from "./patchApply";
import { fuzzyReplace } from "./fuzzyMatch";

describe("parseUnifiedPatch", () => {
  it("parses a simple hunk", () => {
    const patch = `@@ -1,2 +1,3 @@
-old
+new
 context`;
    const hunks = parseUnifiedPatch(patch);
    expect(hunks.length).toBe(1);
    expect(hunks[0]?.oldLines).toContain("old");
    expect(hunks[0]?.newLines).toContain("new");
  });
});

describe("patch hunks apply via fuzzyReplace", () => {
  it("applies hunk content", () => {
    const content = "alpha\nbeta\ngamma";
    const r = fuzzyReplace(content, "beta", "BETA");
    expect(r.ok).toBe(true);
    expect(r.content).toContain("BETA");
  });
});
