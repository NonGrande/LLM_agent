import { describe, expect, it } from "vitest";
import { buildIdeCommands, filterCommands } from "./ideCommands";

describe("ideCommands", () => {
  it("includes palette commands", () => {
    const ids = buildIdeCommands().map((c) => c.id);
    expect(ids).toContain("file.quickOpen");
    expect(ids).toContain("file.findInFiles");
    expect(ids).toContain("edit.inlineEdit");
  });

  it("filters by query", () => {
    const cmds = buildIdeCommands();
    const filtered = filterCommands(cmds, "terminal");
    expect(filtered.some((c) => c.id === "view.toggleTerminal")).toBe(true);
  });
});
