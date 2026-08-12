import type { ApiHealthItem } from "@/services/llm/probeApiHealth";
import {
  isProfileReadyForChat,
  normalizeModelKey,
} from "@/services/llm/profileReady";
import type { ApiProfile } from "@/types";

/** Cap selectable models per profile (keeps picker usable for huge /models lists). */
export const MAX_GREEN_MODELS_PER_PROFILE = 24;

/** Option for the chat input model picker. */
export interface GreenModelOption {
  profileId: string;
  model: string;
  /** Display label — usually just the model id. */
  label: string;
}

/**
 * Models for one profile: primary + availableModels + fallbacks.
 * Does NOT seed the full provider preset (that flooded pickers with every Mistral/* variant).
 * Dedupes mistral vs mistral:latest.
 */
export function modelsForGreenProfile(p: ApiProfile): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (m?: string) => {
    const t = m?.trim();
    if (!t) return;
    const key = normalizeModelKey(t);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  add(p.model);
  for (const m of p.availableModels ?? []) add(m);
  for (const m of p.fallbackModels ?? []) add(m);

  return out.slice(0, MAX_GREEN_MODELS_PER_PROFILE);
}

/**
 * Unified picker: models of the **active** profile only (if configured).
 * Health-green is preferred but not required — key/local is enough.
 * Falls back to first ready+green profile, then first ready.
 */
export function listGreenModelOptions(
  profiles: ApiProfile[],
  healthItems: ApiHealthItem[],
  activeProfileId?: string,
): GreenModelOption[] {
  const greenIds = new Set(
    healthItems.filter((h) => h.kind === "profile" && h.tone === "ok").map((h) => h.id),
  );

  const ready = profiles.filter(isProfileReadyForChat);
  if (!ready.length) return [];

  let target =
    (activeProfileId && ready.find((p) => p.id === activeProfileId)) || undefined;

  if (!target) {
    target =
      ready.find((p) => greenIds.has(p.id)) ?? ready[0];
  }

  if (!target) return [];

  return modelsForGreenProfile(target).map((model) => ({
    profileId: target!.id,
    model,
    label: model,
  }));
}

/** @deprecated alias — same as listGreenModelOptions */
export const listSelectableModelOptions = listGreenModelOptions;
