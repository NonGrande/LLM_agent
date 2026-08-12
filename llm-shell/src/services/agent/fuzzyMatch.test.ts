import { describe, expect, it } from "vitest";
import { fuzzyReplace, normalizeTrimLines } from "./fuzzyMatch";

describe("fuzzyReplace", () => {
  it("replaces exact match", () => {
    const r = fuzzyReplace("hello world", "world", "there");
    expect(r.ok).toBe(true);
    expect(r.content).toBe("hello there");
  });

  it("handles normalized whitespace", () => {
    const content = "line1 \nline2  ";
    const old = "line1\nline2";
    const r = fuzzyReplace(content, old, "line1\nline2\nline3");
    expect(r.ok).toBe(true);
    expect(r.fuzzy).toBe(true);
  });

  it("normalizeTrimLines trims ends", () => {
    expect(normalizeTrimLines("a  \nb ")).toBe("a\nb");
  });
});
