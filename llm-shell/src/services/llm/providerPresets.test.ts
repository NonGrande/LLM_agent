import { describe, expect, it } from "vitest";
import {
  PROVIDER_PRESETS,
  PROVIDER_TYPE_ORDER,
  PROVIDER_CATEGORY_ORDER,
  providersInCategory,
  profileLabelMismatch,
  profileModelFamilyMismatch,
  healProfileModelsIfMismatched,
  isKeylessProbeType,
  yandexModelUriError,
  enrichYandexModelUriHttpError,
} from "./providerPresets";

describe("providerPresets", () => {
  it("lists many public OpenAI-compatible APIs", () => {
    expect(PROVIDER_TYPE_ORDER.length).toBeGreaterThanOrEqual(20);
    expect(PROVIDER_PRESETS.openrouter.baseUrl).toContain("openrouter");
    expect(PROVIDER_PRESETS.xai.baseUrl).toBe("https://api.x.ai/v1");
    expect(PROVIDER_PRESETS.google.baseUrl).toContain("generativelanguage.googleapis.com");
    expect(PROVIDER_PRESETS.deepseek.baseUrl).toContain("deepseek");
    expect(PROVIDER_PRESETS.yandex.baseUrl).toBe("https://ai.api.cloud.yandex.net/v1");
    expect(PROVIDER_PRESETS.nebius.baseUrl).toContain("tokenfactory.nebius.com");
  });

  it("order covers every preset key", () => {
    const keys = Object.keys(PROVIDER_PRESETS).sort();
    expect([...PROVIDER_TYPE_ORDER].sort()).toEqual(keys);
  });

  it("every preset has a category and categories partition the catalog", () => {
    for (const type of PROVIDER_TYPE_ORDER) {
      expect(PROVIDER_CATEGORY_ORDER).toContain(PROVIDER_PRESETS[type].category);
    }
    const all = PROVIDER_CATEGORY_ORDER.flatMap((c) => providersInCategory(c));
    expect([...all].sort()).toEqual([...PROVIDER_TYPE_ORDER].sort());
  });

  it("keeps niche providers collapsed by default via other category", () => {
    expect(providersInCategory("other").length).toBeGreaterThanOrEqual(8);
    expect(PROVIDER_PRESETS.together.category).toBe("other");
    expect(PROVIDER_PRESETS.ollama.category).toBe("local");
    expect(PROVIDER_PRESETS.openrouter.category).toBe("aggregator");
    expect(PROVIDER_PRESETS.yandex.category).toBe("ru");
  });

  it("does not ship decommissioned Groq model ids", () => {
    expect(PROVIDER_PRESETS.groq.models).not.toContain("mixtral-8x7b-32768");
    expect(PROVIDER_PRESETS.groq.models).not.toContain("qwen-qwq-32b");
  });

  it("ships Yandex models as gpt:// placeholder URIs, not bare names", () => {
    for (const m of PROVIDER_PRESETS.yandex.models) {
      expect(m.startsWith("gpt://")).toBe(true);
      expect(m).toContain("<folder_id>");
    }
    expect(PROVIDER_PRESETS.yandex.models).not.toContain("yandexgpt");
    expect(yandexModelUriError("yandexgpt")).toMatch(/gpt:\/\//);
    expect(yandexModelUriError("gpt://<folder_id>/yandexgpt/latest")).toMatch(/folder_id/);
    expect(yandexModelUriError("gpt://b1gabc123/yandexgpt/latest")).toBeNull();
    expect(enrichYandexModelUriHttpError('HTTP 400: Failed to parse model URI', "yandexgpt")).toMatch(
      /gpt:\/\//,
    );
  });

  it("flags keyless probe types", () => {
    expect(isKeylessProbeType("ollama")).toBe(true);
    expect(isKeylessProbeType("openai")).toBe(false);
  });

  it("detects combat-slot / label mismatches without wiping keys", () => {
    const bad = profileLabelMismatch({
      id: "profile-ollama",
      label: "Ollama (Local)",
      type: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
    });
    expect(bad?.expectedLabel).toBe("DeepSeek");

    const ok = profileLabelMismatch({
      id: "profile-openrouter",
      label: "OpenRouter (multi-model hub)",
      type: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
    });
    expect(ok).toBeNull();
  });

  it("detects DeepSeek/Ollama model-family leftovers after slot swap", () => {
    expect(
      profileModelFamilyMismatch({
        type: "deepseek",
        baseUrl: "https://api.deepseek.com/v1",
        model: "qwen2.5:7b",
      })?.expectedType,
    ).toBe("deepseek");

    expect(
      profileModelFamilyMismatch({
        type: "ollama",
        baseUrl: "http://localhost:11434/v1",
        model: "deepseek-chat",
      })?.expectedType,
    ).toBe("ollama");

    expect(
      profileModelFamilyMismatch({
        type: "deepseek",
        baseUrl: "https://api.deepseek.com/v1",
        model: "deepseek-chat",
      }),
    ).toBeNull();
  });

  it("heals mismatched models from preset without touching apiKey", () => {
    const healed = healProfileModelsIfMismatched({
      type: "deepseek" as const,
      baseUrl: "https://api.deepseek.com/v1",
      model: "qwen2.5:7b",
      availableModels: ["qwen2.5:7b", "qwen2.5-coder:1.5b"],
      fallbackModels: ["qwen2.5-coder:1.5b"],
      apiKey: "sk-keep-me",
    });
    expect(healed?.apiKey).toBe("sk-keep-me");
    expect(healed?.model).toBe("deepseek-chat");
    expect(healed?.availableModels).toEqual([...PROVIDER_PRESETS.deepseek.models]);
    expect(healed?.fallbackModels).toContain("deepseek-reasoner");
  });
});
