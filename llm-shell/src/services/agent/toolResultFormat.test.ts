import { describe, expect, it } from "vitest";
import { compactDirListing, toolResultForChat } from "./toolResultFormat";
import type { DirEntry } from "@/types";

function entry(name: string, is_dir = false): DirEntry {
  return {
    name,
    path: `C:/proj/${name}`,
    is_dir,
    size: is_dir ? 0 : 100,
    modified: 1,
  };
}

describe("toolResultFormat", () => {
  it("compacts list_files and caps entries", () => {
    const many = Array.from({ length: 300 }, (_, i) => entry(`f${i}.ts`));
    const compact = compactDirListing(many, 250);
    expect(compact.path_count).toBe(300);
    expect(compact.truncated).toBe(true);
    expect(compact.entries).toHaveLength(250);
    expect(compact.entries[0]).not.toHaveProperty("path");
  });

  it("toolResultForChat keeps list_files small", () => {
    const many = Array.from({ length: 80 }, (_, i) => entry(`doc${i}.md`));
    const s = toolResultForChat("list_files", many);
    expect(s.length).toBeLessThan(20_000);
    expect(s).toContain("path_count");
    expect(s).not.toContain("C:/proj/doc0.md");
  });

  it("caps generic JSON", () => {
    const huge = { blob: "x".repeat(50_000) };
    expect(toolResultForChat("read_file", huge).length).toBeLessThanOrEqual(24_000);
  });
});
