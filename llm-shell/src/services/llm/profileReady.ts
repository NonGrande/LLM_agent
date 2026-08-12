import { isKeylessProbeType } from "@/services/llm/providerPresets";
import type { ApiProfile } from "@/types";

/**
 * Profile is usable for chat: has API key, or is local/self-hosted (no key).
 * Empty cloud slots stay in storage but stay out of the picker / compact UI.
 */
export function isProfileConfigured(p: ApiProfile): boolean {
  if (isKeylessProbeType(p.type)) return Boolean(p.baseUrl?.trim());
  if (p.type === "custom") return Boolean(p.baseUrl?.trim());
  return Boolean(p.apiKey?.trim());
}

/** Custom without key is still "configured" if URL set (user may use open endpoints). */
export function isProfileReadyForChat(p: ApiProfile): boolean {
  if (isKeylessProbeType(p.type)) return Boolean(p.baseUrl?.trim());
  if (p.type === "custom") return Boolean(p.baseUrl?.trim());
  return Boolean(p.apiKey?.trim());
}

/** Collapse mistral / mistral:latest style duplicates for pickers. */
export function normalizeModelKey(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/:latest$/i, "")
    .replace(/\s+/g, "");
}
