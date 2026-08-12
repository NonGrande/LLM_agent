import { describe, expect, it } from "vitest";
import {
  ASK_MODE_TOOLS,
  filterToolsForMode,
  isToolAllowedInMode,
  modePromptBlock,
} from "./agentModes";
import { ToolRegistry } from "./ToolRegistry";

function stubRegistry(names: string[]): ToolRegistry {
  const r = new ToolRegistry();
  for (const name of names) {
    r.register({
      name,
      requiresConfirmation: false,
      definition: {
        type: "function",
        function: { name, description: name, parameters: { type: "object", properties: {} } },
      },
      execute: async () => ({}),
    });
  }
  return r;
}

describe("agentModes", () => {
  it("plan mode has no tools", () => {
    const reg = stubRegistry(["read_file", "write_file"]);
    expect(filterToolsForMode(reg, "plan")).toEqual([]);
    expect(isToolAllowedInMode("read_file", "plan")).toBe(false);
  });

  it("ask mode keeps read-only tools", () => {
    const reg = stubRegistry(["read_file", "write_file", "grep"]);
    const names = filterToolsForMode(reg, "ask").map((t) => t.name);
    expect(names).toContain("read_file");
    expect(names).toContain("grep");
    expect(names).not.toContain("write_file");
    expect(ASK_MODE_TOOLS.has("git_status")).toBe(true);
  });

  it("agent mode allows all", () => {
    expect(isToolAllowedInMode("write_file", "agent")).toBe(true);
    expect(modePromptBlock("ask")).toMatch(/ASK/);
    expect(modePromptBlock("plan")).toMatch(/PLAN/);
  });
});
