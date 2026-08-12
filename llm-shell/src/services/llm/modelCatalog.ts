import type { ModelQuota, ProviderType } from "@/types";
import { PROVIDER_PRESETS } from "@/services/llm/providerPresets";

/** Seed quotas / pricing / context — edit RPM/TPM/RPD in Settings under your plan. */
export const MODEL_CATALOG: Record<string, Omit<ModelQuota, "id">> = {
  // xAI
  "grok-4.5": { contextWindow: 500_000, priceInPer1M: 2, priceOutPer1M: 6, notes: "xAI flagship" },
  "grok-4.3": { contextWindow: 1_000_000, priceInPer1M: 1.25, priceOutPer1M: 2.5 },
  "grok-4": { contextWindow: 256_000 },
  "grok-3": { contextWindow: 131_072 },
  "grok-3-mini": { contextWindow: 131_072 },
  "grok-build-0.1": { contextWindow: 256_000, priceInPer1M: 1, priceOutPer1M: 2 },

  // OpenAI
  "gpt-4o": { contextWindow: 128_000, priceInPer1M: 2.5, priceOutPer1M: 10 },
  "gpt-4o-mini": { contextWindow: 128_000, priceInPer1M: 0.15, priceOutPer1M: 0.6 },
  "gpt-4.1": { contextWindow: 1_000_000 },
  "gpt-4.1-mini": { contextWindow: 1_000_000 },
  "o3-mini": { contextWindow: 200_000 },
  "o4-mini": { contextWindow: 200_000 },

  // Gemini
  "gemini-2.5-pro": { contextWindow: 1_000_000 },
  "gemini-2.5-flash": { contextWindow: 1_000_000 },
  "gemini-2.0-flash": { contextWindow: 1_000_000 },

  // DeepSeek
  "deepseek-chat": { contextWindow: 128_000 },
  "deepseek-reasoner": { contextWindow: 128_000 },

  // Mistral
  "mistral-large-latest": { contextWindow: 128_000 },
  "codestral-latest": { contextWindow: 256_000 },

  // Groq
  "llama-3.3-70b-versatile": { contextWindow: 128_000, rpm: 30, tpm: 6_000 },
  "llama-3.1-8b-instant": { contextWindow: 128_000, rpm: 30 },
  "mixtral-8x7b-32768": { contextWindow: 32_768 },

  // Local
  "qwen2.5-coder:7b": { contextWindow: 32_768, notes: "local" },
  "qwen2.5-coder:14b": { contextWindow: 32_768, notes: "local" },
  "qwen2.5:7b": { contextWindow: 32_768, notes: "local" },
  "llama3.2": { contextWindow: 128_000, notes: "local" },
  mistral: { contextWindow: 32_768, notes: "local" },
  codellama: { contextWindow: 16_384, notes: "local" },
};

export const PROVIDER_DEFAULT_MODELS: Record<ProviderType, string[]> = Object.fromEntries(
  (Object.keys(PROVIDER_PRESETS) as ProviderType[]).map((k) => [
    k,
    [...PROVIDER_PRESETS[k].models],
  ]),
) as Record<ProviderType, string[]>;

export function quotaFromCatalog(modelId: string): ModelQuota {
  const seed = MODEL_CATALOG[modelId];
  return {
    id: modelId,
    ...(seed ?? { notes: "limits unknown — fill from provider console" }),
  };
}

/** Merge API /models list with existing user-edited quotas (keep user RPM/TPM/RPD). */
export function mergeModelQuotas(
  modelIds: string[],
  existing: ModelQuota[] = [],
): ModelQuota[] {
  const byId = new Map(existing.map((q) => [q.id, q]));
  const out: ModelQuota[] = [];
  for (const id of modelIds) {
    const prev = byId.get(id);
    const seed = quotaFromCatalog(id);
    out.push({
      ...seed,
      ...prev,
      id,
      rpm: prev?.rpm ?? seed.rpm,
      tpm: prev?.tpm ?? seed.tpm,
      rpd: prev?.rpd ?? seed.rpd,
      contextWindow: prev?.contextWindow ?? seed.contextWindow,
      notes: prev?.notes ?? seed.notes,
      priceInPer1M: prev?.priceInPer1M ?? seed.priceInPer1M,
      priceOutPer1M: prev?.priceOutPer1M ?? seed.priceOutPer1M,
    });
    byId.delete(id);
  }
  for (const leftover of byId.values()) out.push(leftover);
  return out;
}

export function formatQuotaShort(q?: ModelQuota): string {
  if (!q) return "";
  const parts: string[] = [];
  if (q.contextWindow) parts.push(`ctx ${(q.contextWindow / 1000).toFixed(0)}k`);
  if (q.rpm != null) parts.push(`${q.rpm} RPM`);
  if (q.tpm != null) parts.push(`${q.tpm} TPM`);
  if (q.rpd != null) parts.push(`${q.rpd} RPD`);
  return parts.join(" · ");
}
