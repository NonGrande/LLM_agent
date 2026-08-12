import { describe, expect, it } from "vitest";
import { buildModelChain, isFailoverError, ModelRouter } from "./ModelRouter";
import type { ProviderConfig } from "@/types";

function provider(partial: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    name: "t",
    type: "custom",
    baseUrl: "http://x",
    apiKey: "",
    model: "primary",
    availableModels: ["primary", "fb1"],
    modelQuotas: [],
    fallbackModels: ["fb1", "fb2"],
    failoverEnabled: true,
    ...partial,
  };
}

describe("ModelRouter", () => {
  it("builds unique chain primary → fallbacks", () => {
    expect(buildModelChain(provider())).toEqual(["primary", "fb1", "fb2"]);
  });

  it("detects rate-limit style errors", () => {
    expect(isFailoverError("HTTP 429: rate limit")).toBe(true);
    expect(isFailoverError("context length exceeded")).toBe(true);
    expect(isFailoverError("syntax error in user code")).toBe(false);
  });

  it("does not failover on stream idle / abort", () => {
    expect(isFailoverError("Stream idle timeout (45s без данных от API)")).toBe(false);
    expect(isFailoverError("Aborted")).toBe(false);
  });

  it("switches on failover", () => {
    const r = new ModelRouter(provider());
    expect(r.current()).toBe("primary");
    const sw = r.tryFailover("429 Too Many Requests");
    expect(sw.switched).toBe(true);
    expect(sw.to).toBe("fb1");
  });

  it("respects failoverEnabled=false", () => {
    const r = new ModelRouter(provider({ failoverEnabled: false }));
    expect(r.tryFailover("429").switched).toBe(false);
  });
});
