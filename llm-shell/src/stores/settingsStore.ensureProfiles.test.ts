import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, profileToProvider, providerToProfile } from "@/types";
import { ensureProfiles } from "@/stores/settingsStore";

describe("ensureProfiles combat merge", () => {
  it("adds missing combat profiles without wiping existing Ollama key", () => {
    const ollamaOnly = providerToProfile(
      {
        ...profileToProvider(DEFAULT_SETTINGS.apiProfiles.find((p) => p.id === "profile-ollama")!),
        apiKey: "keep-me-secret",
        model: "qwen2.5-coder:7b",
      },
      "profile-ollama",
      "My Ollama",
    );

    const migrated = ensureProfiles({
      ...DEFAULT_SETTINGS,
      apiProfiles: [ollamaOnly],
      activeProfileId: ollamaOnly.id,
      provider: profileToProvider(ollamaOnly),
      profileFailover: { enabled: true, fallbackProfileIds: [] },
    });

    expect(migrated.apiProfiles.some((p) => p.id === "profile-openrouter")).toBe(true);
    expect(migrated.apiProfiles.some((p) => p.id === "profile-xai")).toBe(true);
    const ollama = migrated.apiProfiles.find((p) => p.id === "profile-ollama");
    expect(ollama?.apiKey).toBe("keep-me-secret");
    expect(ollama?.label).toBe("My Ollama");
    expect(migrated.profileFailover.fallbackProfileIds).toContain("profile-xai");
  });

  it("migrates keyed provider with empty apiProfiles into combat slot (no wipe)", () => {
    const xai = DEFAULT_SETTINGS.apiProfiles.find((p) => p.id === "profile-xai")!;
    const provider = {
      ...profileToProvider(xai),
      apiKey: "xai-secret-key-9999",
      model: "grok-4.5",
    };

    const migrated = ensureProfiles({
      ...DEFAULT_SETTINGS,
      apiProfiles: [],
      activeProfileId: undefined as unknown as string,
      provider,
      profileFailover: { enabled: true, fallbackProfileIds: [] },
    });

    const xaiProfile = migrated.apiProfiles.find((p) => p.id === "profile-xai");
    expect(xaiProfile?.apiKey).toBe("xai-secret-key-9999");
    expect(migrated.provider.apiKey).toBe("xai-secret-key-9999");
    expect(migrated.activeProfileId).toBe("profile-xai");
  });

  it("heals empty active profile from keyed provider", () => {
    const xai = DEFAULT_SETTINGS.apiProfiles.find((p) => p.id === "profile-xai")!;
    const emptyXai = { ...xai, apiKey: "" };
    const migrated = ensureProfiles({
      ...DEFAULT_SETTINGS,
      apiProfiles: DEFAULT_SETTINGS.apiProfiles.map((p) =>
        p.id === "profile-xai" ? emptyXai : { ...p, apiKey: "" },
      ),
      activeProfileId: "profile-xai",
      provider: { ...profileToProvider(emptyXai), apiKey: "healed-from-provider" },
      profileFailover: { enabled: true, fallbackProfileIds: [] },
    });

    expect(migrated.apiProfiles.find((p) => p.id === "profile-xai")?.apiKey).toBe(
      "healed-from-provider",
    );
    expect(migrated.provider.apiKey).toBe("healed-from-provider");
  });

  it("resets Ollama model leftovers on DeepSeek profile without wiping apiKey", () => {
    const deepseekLike = {
      id: "profile-ollama",
      label: "DeepSeek",
      type: "deepseek" as const,
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "sk-deepseek-secret",
      model: "qwen2.5:7b",
      availableModels: ["qwen2.5:7b", "qwen2.5-coder:1.5b"],
      modelQuotas: [{ id: "qwen2.5:7b" }],
      fallbackModels: ["qwen2.5-coder:1.5b"],
      failoverEnabled: true,
    };

    const migrated = ensureProfiles({
      ...DEFAULT_SETTINGS,
      apiProfiles: [deepseekLike],
      activeProfileId: deepseekLike.id,
      provider: profileToProvider(deepseekLike),
      profileFailover: { enabled: true, fallbackProfileIds: [] },
    });

    const p = migrated.apiProfiles.find((x) => x.id === "profile-ollama");
    expect(p?.apiKey).toBe("sk-deepseek-secret");
    expect(p?.model).toBe("deepseek-chat");
    expect(p?.fallbackModels).toEqual(["deepseek-reasoner"]);
    expect(migrated.provider.apiKey).toBe("sk-deepseek-secret");
    expect(migrated.provider.model).toBe("deepseek-chat");
  });

  it("resets DeepSeek model leftovers on Ollama profile", () => {
    const ollamaLike = {
      id: "profile-xai",
      label: "Ollama (Local)",
      type: "ollama" as const,
      baseUrl: "http://localhost:11434/v1",
      apiKey: "",
      model: "deepseek-chat",
      availableModels: ["deepseek-chat", "deepseek-reasoner"],
      modelQuotas: [{ id: "deepseek-chat" }],
      fallbackModels: ["deepseek-reasoner"],
      failoverEnabled: true,
    };

    const migrated = ensureProfiles({
      ...DEFAULT_SETTINGS,
      apiProfiles: [ollamaLike],
      activeProfileId: ollamaLike.id,
      provider: profileToProvider(ollamaLike),
      profileFailover: { enabled: true, fallbackProfileIds: [] },
    });

    const p = migrated.apiProfiles.find((x) => x.id === ollamaLike.id);
    expect(p?.model).toBe("qwen2.5-coder:7b");
    expect(p?.availableModels[0]).toBe("qwen2.5-coder:7b");
  });
});
