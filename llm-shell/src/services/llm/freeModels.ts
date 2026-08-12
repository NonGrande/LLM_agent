import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/utils/env";
import { useSettingsStore } from "@/stores/settingsStore";
import { mergeModelQuotas } from "@/services/llm/modelCatalog";
import { isKeylessProbeType } from "@/services/llm/providerPresets";
import { profileToProvider } from "@/types";
import type { ApiProfile, NetworkConfig } from "@/types";

export interface FreeModelHit {
  id: string;
  source: string;
  note?: string;
}

/** Offline fallback seeds (only if live probe fails entirely). */
export const FREE_MODEL_SEED: FreeModelHit[] = [
  { id: "llama-3.3-70b-versatile", source: "groq" },
  { id: "llama-3.1-8b-instant", source: "groq" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", source: "openrouter" },
  { id: "google/gemma-3-27b-it:free", source: "openrouter" },
  { id: "qwen/qwen3-4b:free", source: "openrouter" },
];

const MAX_MODELS = 40;

function proxyFromNetwork(network?: NetworkConfig): string | null {
  if (!network?.proxyEnabled) return null;
  return network.proxyUrl?.trim() || null;
}

async function llmHttpGet(
  url: string,
  opts?: { apiKey?: string | null; proxyUrl?: string | null },
): Promise<string | null> {
  if (!isTauri()) {
    try {
      const headers: Record<string, string> = {};
      if (opts?.apiKey?.trim()) headers.Authorization = `Bearer ${opts.apiKey.trim()}`;
      const r = await fetch(url, { headers });
      if (!r.ok) return null;
      return await r.text();
    } catch {
      return null;
    }
  }
  try {
    return await invoke<string>("llm_http", {
      method: "GET",
      url,
      apiKey: opts?.apiKey?.trim() || null,
      body: null,
      proxyUrl: opts?.proxyUrl ?? null,
      timeoutMs: 15_000,
    });
  } catch {
    return null;
  }
}

function parseOpenAiModels(raw: string): string[] {
  try {
    const data = JSON.parse(raw) as { data?: Array<{ id?: string }> };
    return (data.data ?? [])
      .map((m) => m.id?.trim())
      .filter((id): id is string => Boolean(id));
  } catch {
    return [];
  }
}

/** Prefer free-tier ids first (OpenRouter `:free`). */
function preferFreeFirst(ids: string[]): string[] {
  const free: string[] = [];
  const rest: string[] = [];
  for (const id of ids) {
    if (/:free$/i.test(id)) free.push(id);
    else rest.push(id);
  }
  return [...free, ...rest].slice(0, MAX_MODELS);
}

export async function listModelsForProfile(
  profile: ApiProfile,
  network?: NetworkConfig,
): Promise<{ ok: boolean; models: string[]; error?: string }> {
  const base = profile.baseUrl?.trim().replace(/\/$/, "");
  if (!base) return { ok: false, models: [], error: "empty baseUrl" };

  const proxyUrl = proxyFromNetwork(network);
  const key = profile.apiKey?.trim() || null;

  if (profile.type === "ollama" || /:11434\b/.test(base)) {
    const root = base.replace(/\/v1\/?$/, "");
    const tagsRaw = await llmHttpGet(`${root}/api/tags`, { proxyUrl });
    if (tagsRaw) {
      try {
        const data = JSON.parse(tagsRaw) as { models?: Array<{ name?: string }> };
        const models = (data.models ?? [])
          .map((m) => m.name?.trim())
          .filter((id): id is string => Boolean(id));
        if (models.length) return { ok: true, models: models.slice(0, MAX_MODELS) };
      } catch {
        /* fall through to /v1/models */
      }
    }
  }

  if (!key && !isKeylessProbeType(profile.type) && profile.type !== "custom") {
    return { ok: false, models: [], error: "нет API key" };
  }

  const raw = await llmHttpGet(`${base}/models`, { apiKey: key, proxyUrl });
  if (!raw) return { ok: false, models: [], error: "unreachable /models" };

  let models = parseOpenAiModels(raw);
  models =
    profile.type === "openrouter" ? preferFreeFirst(models) : models.slice(0, MAX_MODELS);
  if (!models.length) return { ok: false, models: [], error: "empty model list" };
  return { ok: true, models };
}

export interface ProfileSyncRow {
  profileId: string;
  label: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface ApplyFreeModelsResult {
  profileId: string;
  profileLabel: string;
  model: string;
  count: number;
  source: string;
  needsApiKey: boolean;
  message: string;
  synced: ProfileSyncRow[];
}

/**
 * For each profile: GET /models (or Ollama tags) using **current** proxy + keys.
 * Writes reachable lists into profiles; activates the first successful one.
 */
export async function applyFreeModelsToFirstProfile(): Promise<ApplyFreeModelsResult> {
  const settings = useSettingsStore.getState().settings;
  const network = settings.network;
  const profiles = settings.apiProfiles;
  if (!profiles.length) {
    throw new Error("Нет apiProfiles — добавьте профиль в Settings");
  }

  const synced: ProfileSyncRow[] = [];
  const updated = profiles.map((p) => ({ ...p }));

  for (let i = 0; i < updated.length; i++) {
    const p = updated[i]!;
    const res = await listModelsForProfile(p, network);
    if (res.ok && res.models.length) {
      const models = res.models;
      const primary = models.includes(p.model) ? p.model : models[0]!;
      updated[i] = {
        ...p,
        model: primary,
        availableModels: models,
        fallbackModels: models.filter((m) => m !== primary).slice(0, 5),
        modelQuotas: mergeModelQuotas(models, p.modelQuotas),
      };
      synced.push({ profileId: p.id, label: p.label, ok: true, count: models.length });
    } else {
      synced.push({
        profileId: p.id,
        label: p.label,
        ok: false,
        count: 0,
        error: res.error ?? "fail",
      });
    }
  }

  let anyOk = synced.some((s) => s.ok);
  if (!anyOk) {
    const ollamaIdx = updated.findIndex((p) => p.type === "ollama");
    const idx = ollamaIdx >= 0 ? ollamaIdx : 0;
    const probe: ApiProfile = {
      ...updated[idx]!,
      type: "ollama",
      baseUrl: "http://127.0.0.1:11434/v1",
      apiKey: "",
    };
    const res = await listModelsForProfile(probe, network);
    if (res.ok && res.models.length) {
      const models = res.models;
      updated[idx] = {
        ...updated[idx]!,
        type: "ollama",
        baseUrl: "http://127.0.0.1:11434/v1",
        model: models[0]!,
        availableModels: models,
        fallbackModels: models.slice(1, 6),
        modelQuotas: mergeModelQuotas(models, updated[idx]!.modelQuotas),
      };
      synced[idx] = {
        profileId: updated[idx]!.id,
        label: updated[idx]!.label,
        ok: true,
        count: models.length,
      };
      anyOk = true;
    }
  }

  const active =
    updated.find((p) => synced.some((s) => s.profileId === p.id && s.ok && p.availableModels.length)) ??
    null;

  if (!active) {
    const lines = synced.map((s) => `- ${s.label}: ${s.error ?? "fail"}`).join("\n");
    throw new Error(
      `Нет доступных API по текущим настройкам (прокси/ключи/URL).\n${lines}\n` +
        `Включите Cloudflare/прокси, добавьте ключ или запустите Ollama.`,
    );
  }

  useSettingsStore.setState((s) => ({
    settings: {
      ...s.settings,
      apiProfiles: updated,
      activeProfileId: active.id,
      provider: profileToProvider(active),
    },
  }));

  const okRows = synced.filter((s) => s.ok);
  const failRows = synced.filter((s) => !s.ok);

  return {
    profileId: active.id,
    profileLabel: active.label,
    model: active.model,
    count: active.availableModels.length,
    source: active.type,
    needsApiKey: !isKeylessProbeType(active.type) && !active.apiKey?.trim(),
    synced,
    message:
      `Синхронизировано по вашим настройкам (прокси ${network.proxyEnabled ? "on" : "off"}).\n` +
      `Активен «${active.label}»: ${active.availableModels.length} моделей, primary \`${active.model}\`.\n` +
      okRows.map((s) => `✓ ${s.label}: ${s.count}`).join(" · ") +
      (failRows.length
        ? `\nНедоступны: ${failRows.map((s) => `${s.label} (${s.error})`).join(", ")}`
        : ""),
  };
}
