import { describe, expect, it } from "vitest";
import { cosineSimilarity, keywordScore, searchChunks } from "./retrieve";
import type { CodeChunk } from "./types";

describe("retrieve", () => {
  it("keywordScore finds matching terms", () => {
    expect(keywordScore("auth login", "function loginUser()")).toBeGreaterThan(0);
  });

  it("cosineSimilarity is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("searchChunks ranks by score", () => {
    const chunks: CodeChunk[] = [
      {
        id: "1",
        path: "a.ts",
        startLine: 1,
        endLine: 2,
        content: "auth middleware",
        contentHash: "x",
      },
      {
        id: "2",
        path: "b.ts",
        startLine: 1,
        endLine: 2,
        content: "unrelated css",
        contentHash: "y",
      },
    ];
    const hits = searchChunks(chunks, "auth", null, 2);
    expect(hits[0]?.path).toBe("a.ts");
  });
});
