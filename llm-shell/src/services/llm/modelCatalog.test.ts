import { describe, expect, it } from "vitest";
import {
  formatQuotaShort,
  mergeModelQuotas,
  quotaFromCatalog,
} from "./modelCatalog";

describe("modelCatalog", () => {
  it("seeds xAI grok context", () => {
    const q = quotaFromCatalog("grok-4.5");
    expect(q.contextWindow).toBe(500_000);
    expect(q.priceInPer1M).toBe(2);
  });

  it("merges API list keeping user RPM", () => {
    const merged = mergeModelQuotas(["grok-4.5", "custom-model"], [
      { id: "grok-4.5", rpm: 42, tpm: 999 },
    ]);
    const g = merged.find((m) => m.id === "grok-4.5")!;
    expect(g.rpm).toBe(42);
    expect(g.tpm).toBe(999);
    expect(g.contextWindow).toBe(500_000);
    expect(merged.some((m) => m.id === "custom-model")).toBe(true);
  });

  it("formats short quota label", () => {
    expect(formatQuotaShort({ id: "x", contextWindow: 128000, rpm: 60 })).toContain("128k");
    expect(formatQuotaShort({ id: "x", rpm: 60 })).toContain("60 RPM");
  });
});
