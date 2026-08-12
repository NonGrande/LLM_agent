import { describe, expect, it } from "vitest";
import { chunkFileText } from "./chunker";

describe("chunkFileText", () => {
  it("splits long files into multiple chunks", () => {
    const text = Array.from({ length: 400 }, (_, i) => `line ${i} ${"x".repeat(40)}`).join("\n");
    const chunks = chunkFileText("a.ts", text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.startLine).toBe(1);
  });

  it("returns empty for blank", () => {
    expect(chunkFileText("a.ts", "   ")).toEqual([]);
  });
});
