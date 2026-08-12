import { describe, expect, it } from "vitest";
import { listGreenModelOptions, modelsForGreenProfile, MAX_GREEN_MODELS_PER_PROFILE } from "./greenModels";
import type { ApiHealthItem } from "./probeApiHealth";
import type { ApiProfile } from "@/types";

function profile(partial: Partial<ApiProfile> & Pick<ApiProfile, "id" | "model">): ApiProfile {
  return {
    label: partial.label ?? partial.id,
    type: partial.type ?? "custom",
    baseUrl: partial.baseUrl ?? "http://localhost",
    apiKey: partial.apiKey ?? "sk-test",
    availableModels: partial.availableModels ?? [],
    modelQuotas: [],
    fallbackModels: partial.fallbackModels ?? [],
    failoverEnabled: true,
    ...partial,
  };
}

function health(
  id: string,
  tone: ApiHealthItem["tone"],
  kind: ApiHealthItem["kind"] = "profile",
): ApiHealthItem {
  return {
    id,
    label: id,
    type: "custom",
    baseUrl: "http://x",
    kind,
    tone,
    message: "",
  };
}

describe("listGreenModelOptions", () => {
  it("lists only active profile models (unified)", () => {
    const profiles = [
      profile({ id: "a", model: "llama", availableModels: ["llama", "mistral"], apiKey: "k" }),
      profile({ id: "b", model: "gpt-4", availableModels: ["gpt-4"], apiKey: "k" }),
    ];
    const items = [health("a", "ok"), health("b", "ok")];
    const opts = listGreenModelOptions(profiles, items, "a");
    expect(opts.map((o) => o.model).sort()).toEqual(["llama", "mistral"]);
    expect(opts.every((o) => o.profileId === "a")).toBe(true);
  });

  it("does not mix models from other green profiles", () => {
    const profiles = [
      profile({ id: "a", model: "m1", availableModels: ["m1"], apiKey: "k" }),
      profile({ id: "b", model: "m2", availableModels: ["m2", "m3"], apiKey: "k" }),
    ];
    const items = [health("a", "ok"), health("b", "ok")];
    const opts = listGreenModelOptions(profiles, items, "b");
    expect(opts.map((o) => o.model).sort()).toEqual(["m2", "m3"]);
  });

  it("dedupes mistral vs mistral:latest", () => {
    const profiles = [
      profile({
        id: "a",
        model: "mistral",
        availableModels: ["mistral", "mistral:latest", "mistral-small-latest"],
        apiKey: "k",
      }),
    ];
    const opts = listGreenModelOptions(profiles, [health("a", "ok")], "a");
    expect(opts.filter((o) => normalizeIncludes(o.model, "mistral") && !o.model.includes("small"))).toHaveLength(1);
    expect(opts.map((o) => o.model)).toContain("mistral-small-latest");
  });

  it("skips profiles without key (cloud)", () => {
    const profiles = [
      profile({ id: "a", model: "x", apiKey: "", type: "openai" }),
      profile({ id: "b", model: "y", apiKey: "sk", type: "openai", availableModels: ["y"] }),
    ];
    const opts = listGreenModelOptions(profiles, [health("b", "ok")], "a");
    expect(opts.every((o) => o.profileId === "b")).toBe(true);
  });

  it("allows ollama without key", () => {
    const profiles = [
      profile({
        id: "o",
        type: "ollama",
        model: "qwen2.5-coder:7b",
        apiKey: "",
        baseUrl: "http://127.0.0.1:11434/v1",
        availableModels: ["qwen2.5-coder:7b"],
      }),
    ];
    const opts = listGreenModelOptions(profiles, [health("o", "ok")], "o");
    expect(opts).toHaveLength(1);
  });

  it("does not seed full preset catalog into picker", () => {
    const profiles = [
      profile({
        id: "ds",
        type: "deepseek",
        model: "deepseek-chat",
        availableModels: [],
        apiKey: "k",
      }),
    ];
    const opts = listGreenModelOptions(profiles, [health("ds", "ok")], "ds");
    expect(opts.map((o) => o.model)).toEqual(["deepseek-chat"]);
  });

  it("caps per profile", () => {
    const many = Array.from({ length: 50 }, (_, i) => `model-${i}`);
    const profiles = [
      profile({
        id: "a",
        model: "primary",
        availableModels: many,
        apiKey: "k",
      }),
    ];
    const opts = listGreenModelOptions(profiles, [health("a", "ok")], "a");
    expect(opts).toHaveLength(MAX_GREEN_MODELS_PER_PROFILE);
    expect(opts[0].model).toBe("primary");
  });
});

function normalizeIncludes(model: string, stem: string) {
  return model.toLowerCase().includes(stem);
}

describe("modelsForGreenProfile", () => {
  it("dedupes primary already listed in availableModels", () => {
    const models = modelsForGreenProfile(
      profile({ id: "a", model: "x", availableModels: ["x", "y"] }),
    );
    expect(models).toEqual(["x", "y"]);
  });
});
