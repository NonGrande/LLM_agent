import { describe, expect, it } from "vitest";
import { FREE_MODEL_SEED } from "./freeModels";

describe("FREE_MODEL_SEED", () => {
  it("has groq and openrouter entries", () => {
    expect(FREE_MODEL_SEED.some((h) => h.source === "groq")).toBe(true);
    expect(FREE_MODEL_SEED.some((h) => h.source === "openrouter")).toBe(true);
    expect(FREE_MODEL_SEED.every((h) => h.id.trim().length > 0)).toBe(true);
  });
});
