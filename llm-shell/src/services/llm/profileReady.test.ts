import { describe, expect, it } from "vitest";
import { isProfileReadyForChat, normalizeModelKey } from "./profileReady";
import type { ApiProfile } from "@/types";

function p(partial: Partial<ApiProfile>): ApiProfile {
  return {
    id: "x",
    label: "x",
    type: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt",
    availableModels: [],
    modelQuotas: [],
    fallbackModels: [],
    failoverEnabled: true,
    ...partial,
  };
}

describe("isProfileReadyForChat", () => {
  it("requires key for cloud", () => {
    expect(isProfileReadyForChat(p({ apiKey: "" }))).toBe(false);
    expect(isProfileReadyForChat(p({ apiKey: "sk" }))).toBe(true);
  });

  it("allows ollama without key", () => {
    expect(
      isProfileReadyForChat(
        p({ type: "ollama", apiKey: "", baseUrl: "http://127.0.0.1:11434/v1" }),
      ),
    ).toBe(true);
  });
});

describe("normalizeModelKey", () => {
  it("collapses :latest", () => {
    expect(normalizeModelKey("mistral:latest")).toBe(normalizeModelKey("mistral"));
  });
});
