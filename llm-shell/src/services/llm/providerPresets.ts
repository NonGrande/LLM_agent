/**
 * Public / commonly used OpenAI-compatible chat endpoints.
 * LLM Shell talks OpenAI `/v1/chat/completions` — native Anthropic Messages API is NOT supported
 * (use OpenRouter / gateway for Claude).
 */

export type ProviderCategory = "local" | "aggregator" | "major" | "ru" | "other";

export type ProviderPreset = {
  name: string;
  baseUrl: string;
  models: string[];
  /** Short hint shown in Settings */
  notes?: string;
  docsUrl?: string;
  /** Catalog grouping in Settings «Добавить провайдера» */
  category: ProviderCategory;
  /**
   * Soft flag: models/docs may lag; keep in catalog but demote visually.
   * Do not treat as “delete” — endpoint may still work.
   */
  stale?: boolean;
};

export const PROVIDER_CATEGORY_META: Record<
  ProviderCategory,
  { label: string; hint: string; defaultExpanded: boolean }
> = {
  local: {
    label: "Локальные",
    hint: "Ollama / LM Studio / vLLM — ключ обычно не нужен",
    defaultExpanded: true,
  },
  aggregator: {
    label: "Агрегаторы",
    hint: "Один ключ → много вендоров",
    defaultExpanded: true,
  },
  major: {
    label: "Крупные облака",
    hint: "Прямые OpenAI-совместимые API",
    defaultExpanded: true,
  },
  ru: {
    label: "РФ / дружественные",
    hint: "Чаще доступны без зарубежного VPN",
    defaultExpanded: true,
  },
  other: {
    label: "Прочие / нишевые",
    hint: "Свёрнуто по умолчанию",
    defaultExpanded: false,
  },
};

export const PROVIDER_CATEGORY_ORDER: ProviderCategory[] = [
  "local",
  "aggregator",
  "major",
  "ru",
  "other",
];

export const PROVIDER_PRESETS = {
  openrouter: {
    name: "OpenRouter (multi-model hub)",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "openai/gpt-4o",
      "anthropic/claude-sonnet-4",
      "google/gemini-2.5-pro",
      "x-ai/grok-4",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
    ],
    notes: "Один ключ → сотни моделей; удобно для failover между вендорами",
    docsUrl: "https://openrouter.ai/docs",
    category: "aggregator",
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini", "o4-mini"],
    docsUrl: "https://platform.openai.com/docs",
    category: "major",
  },
  xai: {
    name: "xAI Grok",
    baseUrl: "https://api.x.ai/v1",
    models: [
      "grok-4.5",
      "grok-4.3",
      "grok-4",
      "grok-4.20-0309-reasoning",
      "grok-4.20-0309-non-reasoning",
      "grok-build-0.1",
      "grok-3",
      "grok-3-mini",
    ],
    docsUrl: "https://docs.x.ai",
    category: "major",
  },
  google: {
    name: "Google Gemini (OpenAI compat)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
    notes: "Ключ из Google AI Studio",
    docsUrl: "https://ai.google.dev/gemini-api/docs/openai",
    category: "major",
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    docsUrl: "https://api-docs.deepseek.com",
    category: "major",
  },
  mistral: {
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest", "ministral-8b-latest"],
    docsUrl: "https://docs.mistral.ai",
    category: "major",
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3-32b",
    ],
    notes: "mixtral-8x7b и qwen-qwq сняты с Groq — обновлены на актуальные id",
    docsUrl: "https://console.groq.com/docs",
    category: "major",
  },
  anthropic: {
    name: "Anthropic (via OpenRouter id)",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "anthropic/claude-sonnet-4",
      "anthropic/claude-opus-4",
      "anthropic/claude-3.5-haiku",
    ],
    notes:
      "Нативный Anthropic API не OpenAI-совместим — пресет идёт через OpenRouter (тот же baseUrl, что у OpenRouter)",
    docsUrl: "https://openrouter.ai/anthropic",
    category: "major",
  },
  yandex: {
    name: "Yandex AI Studio (YandexGPT / Алиса)",
    baseUrl: "https://ai.api.cloud.yandex.net/v1",
    // Placeholder URI — replace <folder_id>; bare "yandexgpt" → HTTP 400 Failed to parse model URI
    models: [
      "gpt://<folder_id>/yandexgpt/latest",
      "gpt://<folder_id>/yandexgpt-lite/latest",
      "gpt://<folder_id>/qwen3-235b-a22b-fp8/latest",
      "gpt://<folder_id>/gpt-oss-120b/latest",
    ],
    notes:
      "Ключ сервисного аккаунта (scope yc.ai.languageModels.execute). Model — URI-плейсхолдер gpt://<folder_id>/yandexgpt/latest (не голое yandexgpt): подставьте ID каталога из шапки console.yandex.cloud. Примеры: yandexgpt, yandexgpt-lite. OpenAI-compatible: Bearer + api key.",
    docsUrl: "https://yandex.cloud/en/docs/tutorials/ml-ai/ai-model-ide-integration",
    category: "ru",
  },
  together: {
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    models: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "deepseek-ai/DeepSeek-V3",
    ],
    docsUrl: "https://docs.together.ai",
    category: "other",
  },
  fireworks: {
    name: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    models: [
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/qwen2p5-coder-32b-instruct",
    ],
    docsUrl: "https://docs.fireworks.ai",
    category: "other",
  },
  deepinfra: {
    name: "DeepInfra",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    models: [
      "meta-llama/Llama-3.3-70B-Instruct",
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "deepseek-ai/DeepSeek-V3",
    ],
    docsUrl: "https://deepinfra.com/docs",
    category: "other",
  },
  cerebras: {
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    models: ["llama-3.3-70b", "qwen-3-32b"],
    docsUrl: "https://inference-docs.cerebras.ai",
    category: "other",
  },
  sambanova: {
    name: "SambaNova",
    baseUrl: "https://api.sambanova.ai/v1",
    models: ["Meta-Llama-3.3-70B-Instruct", "Qwen2.5-Coder-32B-Instruct"],
    docsUrl: "https://docs.sambanova.ai",
    category: "other",
  },
  perplexity: {
    name: "Perplexity",
    baseUrl: "https://api.perplexity.ai",
    models: ["sonar-pro", "sonar", "sonar-reasoning-pro"],
    notes: "Поиск + chat; tool-calling ограниченнее",
    docsUrl: "https://docs.perplexity.ai",
    category: "other",
  },
  nvidia: {
    name: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    models: ["meta/llama-3.3-70b-instruct", "qwen/qwen2.5-coder-32b-instruct"],
    docsUrl: "https://docs.api.nvidia.com",
    category: "other",
  },
  moonshot: {
    name: "Moonshot (Kimi)",
    baseUrl: "https://api.moonshot.ai/v1",
    models: ["kimi-k2-instruct", "moonshot-v1-128k", "moonshot-v1-32k"],
    docsUrl: "https://platform.moonshot.ai",
    category: "other",
  },
  dashscope: {
    name: "Alibaba DashScope (Qwen)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-plus", "qwen-turbo", "qwen-max", "qwen2.5-coder-32b-instruct"],
    docsUrl: "https://help.aliyun.com/zh/model-studio",
    category: "other",
  },
  siliconflow: {
    name: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1",
    models: [
      "deepseek-ai/DeepSeek-V3",
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "meta-llama/Llama-3.3-70B-Instruct",
    ],
    docsUrl: "https://docs.siliconflow.cn",
    category: "other",
  },
  nebius: {
    name: "Nebius Token Factory",
    baseUrl: "https://api.tokenfactory.nebius.com/v1",
    models: ["meta-llama/Llama-3.3-70B-Instruct", "Qwen/Qwen2.5-Coder-32B-Instruct"],
    notes:
      "Бывший Nebius AI Studio → Token Factory. Старый host api.studio.nebius.ai может ещё редиректить.",
    docsUrl: "https://docs.tokenfactory.nebius.com",
    category: "other",
    stale: true,
  },
  novita: {
    name: "Novita AI",
    baseUrl: "https://api.novita.ai/v3/openai",
    models: ["meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-v3"],
    docsUrl: "https://novita.ai/docs",
    category: "other",
  },
  huggingface: {
    name: "Hugging Face Router",
    baseUrl: "https://router.huggingface.co/v1",
    models: ["meta-llama/Llama-3.3-70B-Instruct", "Qwen/Qwen2.5-Coder-32B-Instruct"],
    docsUrl: "https://huggingface.co/docs/api-inference",
    category: "other",
  },
  ollama: {
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1",
    models: ["qwen2.5-coder:7b", "qwen2.5-coder:14b", "qwen2.5:7b", "llama3.2", "mistral", "codellama"],
    notes: "Ключ не нужен",
    docsUrl: "https://ollama.com",
    category: "local",
  },
  lmstudio: {
    name: "LM Studio (Local)",
    baseUrl: "http://localhost:1234/v1",
    models: [] as string[],
    notes: "Включите Local Server в LM Studio",
    docsUrl: "https://lmstudio.ai",
    category: "local",
  },
  vllm: {
    name: "vLLM (Local)",
    baseUrl: "http://localhost:8000/v1",
    models: [] as string[],
    notes: "Свой OpenAI-совместимый сервер",
    category: "local",
  },
  custom: {
    name: "Custom (OpenAI-compatible)",
    baseUrl: "",
    models: [] as string[],
    notes: "Любой endpoint с /chat/completions",
    category: "other",
  },
} as const satisfies Record<string, ProviderPreset>;

export type ProviderType = keyof typeof PROVIDER_PRESETS;

/** Widen optional fields for safe UI access */
export function getProviderPreset(type: ProviderType): ProviderPreset {
  return PROVIDER_PRESETS[type] as ProviderPreset;
}

/**
 * Catalog order: local → aggregator → major → ru → other (niche collapsed in UI).
 * Custom stays last inside «other».
 */
export const PROVIDER_TYPE_ORDER: ProviderType[] = [
  "ollama",
  "lmstudio",
  "vllm",
  "openrouter",
  "openai",
  "xai",
  "google",
  "deepseek",
  "mistral",
  "groq",
  "anthropic",
  "yandex",
  "together",
  "fireworks",
  "deepinfra",
  "cerebras",
  "sambanova",
  "perplexity",
  "nvidia",
  "moonshot",
  "dashscope",
  "siliconflow",
  "nebius",
  "novita",
  "huggingface",
  "custom",
];

export function providersInCategory(category: ProviderCategory): ProviderType[] {
  return PROVIDER_TYPE_ORDER.filter((t) => PROVIDER_PRESETS[t].category === category);
}

/** Types that health-check without an API key (local / self-hosted). */
export function isKeylessProbeType(type: string): boolean {
  return type === "ollama" || type === "lmstudio" || type === "vllm";
}

/**
 * Detect combat-slot / label drift (e.g. DeepSeek key sitting in profile-ollama with Ollama label).
 * Does not mutate data — UI can offer a rename that keeps keys/URLs.
 */
export function profileLabelMismatch(profile: {
  id: string;
  label: string;
  type: ProviderType;
  baseUrl: string;
}): { expectedLabel: string; reason: string } | null {
  const expectedLabel = PROVIDER_PRESETS[profile.type]?.name ?? profile.type;
  const label = profile.label.toLowerCase();
  const reasons: string[] = [];

  if (profile.id === "profile-ollama" && profile.type !== "ollama") {
    reasons.push(`слот profile-ollama, но type=${profile.type}`);
  }
  if (profile.id === "profile-xai" && profile.type !== "xai") {
    reasons.push(`слот profile-xai, но type=${profile.type}`);
  }
  if (profile.id === "profile-openrouter" && profile.type !== "openrouter" && profile.type !== "anthropic") {
    reasons.push(`слот profile-openrouter, но type=${profile.type}`);
  }

  if (/\bollama\b/i.test(profile.label) && profile.type !== "ollama") {
    reasons.push("имя говорит Ollama, type другой");
  }
  if (/\b(xai|grok)\b/i.test(profile.label) && profile.type !== "xai") {
    reasons.push("имя говорит xAI/Grok, type другой");
  }
  if (/\bdeepseek\b/i.test(profile.label) && profile.type !== "deepseek") {
    reasons.push("имя говорит DeepSeek, type другой");
  }
  if (/\bopenrouter\b/i.test(profile.label) && profile.type !== "openrouter" && profile.type !== "anthropic") {
    reasons.push("имя говорит OpenRouter, type другой");
  }

  const expectedBits = expectedLabel
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split(/[\s/]+/)
    .filter((w) => w.length > 2 && !["the", "via", "and", "for", "api"].includes(w));
  const labelMentionsExpected = expectedBits.some((w) => label.includes(w));
  if (!labelMentionsExpected && profile.label.trim() && expectedLabel) {
    reasons.push(`подпись «${profile.label}» не похожа на «${expectedLabel}»`);
  }

  if (!reasons.length) return null;
  return { expectedLabel, reason: reasons[0]! };
}

/** Ollama local tags: `qwen2.5:7b`, `llama3.2:latest` (no vendor slash). */
export function looksLikeOllamaModelId(model: string): boolean {
  const m = model.trim();
  if (!m || m.includes("/")) return false;
  return /^[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$/.test(m);
}

/** Direct DeepSeek API ids (not OpenRouter `deepseek/...`). */
export function looksLikeDeepseekCloudModelId(model: string): boolean {
  const m = model.trim().toLowerCase();
  if (!m || m.includes("/")) return false;
  return m === "deepseek-chat" || m === "deepseek-reasoner" || /^deepseek-[a-z0-9.-]+$/.test(m);
}

function isDeepseekEndpoint(type: ProviderType, baseUrl: string): boolean {
  return type === "deepseek" || /deepseek/i.test(baseUrl);
}

function isOllamaEndpoint(type: ProviderType, baseUrl: string): boolean {
  return type === "ollama" || /:\/\/(localhost|127\.0\.0\.1):11434\b/i.test(baseUrl);
}

/** Help text for Yandex model field (Settings tooltip / validation messages). */
export const YANDEX_MODEL_URI_HINT =
  "Формат: gpt://<folder_id>/yandexgpt/latest — folder_id из шапки console.yandex.cloud. Примеры моделей: yandexgpt-lite, yandexgpt (не голые имена без gpt://).";

/**
 * Client-side check before calling Yandex AI Studio.
 * Returns a user-facing error, or null when the URI looks usable.
 */
export function yandexModelUriError(model: string): string | null {
  const m = model?.trim() ?? "";
  if (!m) {
    return `Yandex AI Studio: укажите model URI.\n${YANDEX_MODEL_URI_HINT}`;
  }
  if (!m.startsWith("gpt://")) {
    return (
      `Yandex AI Studio: model «${m}» невалиден — нужен URI с префиксом gpt:// ` +
      `(не короткое имя вроде yandexgpt).\n${YANDEX_MODEL_URI_HINT}`
    );
  }
  if (m.includes("<folder_id>") || m.includes("%3Cfolder_id%3E")) {
    return (
      `Yandex AI Studio: в model всё ещё плейсхолдер <folder_id> — API вернёт ` +
      `"Failed to parse model URI". Подставьте реальный ID каталога из console.yandex.cloud.\n` +
      `Сейчас: «${m}». Пример: gpt://b1gxxxxxxxxxxxxxxxx/yandexgpt/latest`
    );
  }
  return null;
}

/** Enrich opaque Yandex HTTP 400 "Failed to parse model URI" with setup guidance. */
export function enrichYandexModelUriHttpError(httpError: string, model?: string): string {
  if (!/failed to parse model uri/i.test(httpError)) return httpError;
  const local = yandexModelUriError(model ?? "");
  if (local) return `${httpError}\n\n${local}`;
  return (
    `${httpError}\n\nYandex AI Studio не принял model URI` +
    (model ? ` «${model}»` : "") +
    `. Проверьте формат gpt://<folder_id>/yandexgpt/latest (folder_id из console.yandex.cloud).`
  );
}

/**
 * After combat-slot swap / label heal, type+URL can be DeepSeek while model stays `qwen2.5:7b`.
 * Detect that family mismatch so heal can reset models from the preset (keys untouched).
 */
export function profileModelFamilyMismatch(profile: {
  type: ProviderType;
  baseUrl: string;
  model: string;
}): { expectedType: "deepseek" | "ollama"; reason: string } | null {
  const model = profile.model?.trim() ?? "";
  if (!model) return null;

  if (isDeepseekEndpoint(profile.type, profile.baseUrl)) {
    const preset = PROVIDER_PRESETS.deepseek.models as readonly string[];
    if (looksLikeOllamaModelId(model) || !preset.includes(model)) {
      return {
        expectedType: "deepseek",
        reason: `модель «${model}» не из пресета DeepSeek (остаток от Ollama/другого слота)`,
      };
    }
  }

  if (isOllamaEndpoint(profile.type, profile.baseUrl)) {
    if (looksLikeDeepseekCloudModelId(model)) {
      return {
        expectedType: "ollama",
        reason: `модель «${model}» похожа на DeepSeek API, а endpoint — Ollama`,
      };
    }
  }

  return null;
}

export type ProfileModelFields = {
  model: string;
  availableModels: string[];
  fallbackModels: string[];
};

/** Reset model / availableModels / fallbackModels from preset. Does not touch apiKey. */
export function presetModelFields(type: ProviderType): ProfileModelFields | null {
  const preset = PROVIDER_PRESETS[type];
  if (!preset?.models?.length) return null;
  const models = [...preset.models];
  return {
    model: models[0]!,
    availableModels: models,
    fallbackModels: models.slice(1, 4),
  };
}

/**
 * If type/URL vs model family mismatch, return profile with preset models; else null.
 * Preserves apiKey and other fields.
 */
export function healProfileModelsIfMismatched<T extends ProfileModelFields & {
  type: ProviderType;
  baseUrl: string;
}>(profile: T): T | null {
  const mismatch = profileModelFamilyMismatch(profile);
  if (!mismatch) return null;
  const fields = presetModelFields(mismatch.expectedType);
  if (!fields) return null;
  return { ...profile, ...fields };
}
