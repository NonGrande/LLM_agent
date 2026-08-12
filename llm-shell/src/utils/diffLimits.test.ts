import { describe, expect, it } from "vitest";
import { diffTooLarge, MAX_DIFF_RENDER_CHARS } from "./diffLimits";

describe("diffTooLarge", () => {
  it("allows small diffs", () => {
    expect(diffTooLarge("a", "b")).toBe(false);
  });

  it("blocks huge combined payload", () => {
    const chunk = "x".repeat(MAX_DIFF_RENDER_CHARS + 1);
    expect(diffTooLarge("", chunk)).toBe(true);
  });
});
