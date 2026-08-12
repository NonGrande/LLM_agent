import { describe, expect, it } from "vitest";
import { fuzzyScore, rankByQuery } from "./fuzzyScore";

describe("fuzzyScore", () => {
  it("prefers prefix match", () => {
    expect(fuzzyScore("app", "AppLayout.tsx")).toBeGreaterThan(fuzzyScore("app", "mapApp.ts"));
  });

  it("returns 0 when no match", () => {
    expect(fuzzyScore("zzz", "AppLayout.tsx")).toBe(0);
  });
});

describe("rankByQuery", () => {
  it("filters and sorts", () => {
    const items = ["src/App.tsx", "src/utils/map.ts", "AppLayout.tsx"];
    const ranked = rankByQuery(items, "app", (p) => p);
    expect(ranked[0]).toContain("App");
  });
});
