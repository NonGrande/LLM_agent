import { createClientFromSettings } from "@/services/llm/LLMClient";
import {
  adjustToneForMissingKey,
  classifyHttpStatusForHealth,
  defaultMessageForDetail,
  isBillingOrQuotaFailure,
  resolveDetailCode,
  type HealthDetailCode,
} from "@/services/llm/healthClassify";
import {
  PROVIDER_PRESETS,
  PROVIDER_TYPE_ORDER,
  isKeylessProbeType,
} from "@/services/llm/providerPresets";
import type { ApiProfile, NetworkConfig } from "@/types";
import { isTauri } from "@/utils/env";
import { invoke } from "@tauri-apps/api/core";

export type HealthTone = "ok" | "auth" | "unreachable" | "checking" | "idle";

export interface ApiHealthItem {
  id: string;
  label: string;
  type: string;
  baseUrl: string;
  kind: "profile" | "preset";
  tone: HealthTone;
  message: string;
  latencyMs?: number;
  /** Raw HTTP status from probe when available. */
  httpStatus?: number;
  /** 401 / 402 / 403 for UI grouping (tone stays "auth" for all three). */
  detailCode?: HealthDetailCode;
}

interface RustProbe {
  ok: boolean;
  status: string;
  message: string;
  http_status?: number | null;
  latency_ms: number;
}

type ProbeResult = {
  status: HealthTone;
  message: string;
  latencyMs: number;
  httpStatus?: number;
  detailCode?: HealthDetailCode;
};

function proxyFromNetwork(network?: NetworkConfig): string | null {
  if (!network?.proxyEnabled) return null;
  return network.proxyUrl?.trim() || null;
}

function mapProbeStatus(
  status: string,
  message: string,
  httpStatus?: number | null,
): { status: HealthTone; message: string; httpStatus?: number; detailCode?: HealthDetailCode } {
  const http = httpStatus != null && httpStatus > 0 ? httpStatus : undefined;

  if (isBillingOrQuotaFailure(http, message)) {
    const detailCode: HealthDetailCode = 402;
    const msg =
      /баланс|402|insufficient|квота|payment required|оплат/i.test(message)
        ? message
        : defaultMessageForDetail(402, http ?? 402, message);
    return { status: "auth", message: msg, httpStatus: http ?? 402, detailCode };
  }

  if (http != null && (http < 200 || http >= 300)) {
    const tone = classifyHttpStatusForHealth(http, message);
    const detailCode = resolveDetailCode(http, message, tone);
    const msg =
      detailCode != null ? defaultMessageForDetail(detailCode, http, message) : message;
    return { status: tone, message: msg, httpStatus: http, detailCode };
  }

  const tone: HealthTone =
    status === "ok" ? "ok" : status === "auth" ? "auth" : "unreachable";
  const detailCode = resolveDetailCode(http, message, tone);
  return {
    status: tone,
    message:
      detailCode != null ? defaultMessageForDetail(detailCode, http, message) : message,
    httpStatus: http,
    detailCode,
  };
}

async function probeViaRust(
  baseUrl: string,
  apiKey: string,
  network?: NetworkConfig,
): Promise<ProbeResult> {
  const res = await invoke<RustProbe>("probe_api", {
    baseUrl,
    apiKey: apiKey || null,
    timeoutMs: 8000,
    proxyUrl: proxyFromNetwork(network),
  });
  const mapped = mapProbeStatus(res.status, res.message, res.http_status);
  return {
    status: mapped.status,
    message: mapped.message,
    latencyMs: res.latency_ms,
    httpStatus: mapped.httpStatus,
    detailCode: mapped.detailCode,
  };
}

async function probeViaFetch(
  baseUrl: string,
  apiKey: string,
  model: string,
  network?: NetworkConfig,
): Promise<ProbeResult> {
  const client = createClientFromSettings(baseUrl, apiKey, network);
  client.updateConfig({ timeoutMs: 8_000, maxRetries: 1 });
  const res = await client.quickProbe(model || undefined);
  const mapped = mapProbeStatus(res.status, res.message, res.httpStatus);
  return {
    status: mapped.status,
    message: mapped.message,
    latencyMs: res.latencyMs,
    httpStatus: mapped.httpStatus ?? res.httpStatus,
    detailCode: mapped.detailCode,
  };
}

export async function probeOne(
  id: string,
  label: string,
  type: string,
  baseUrl: string,
  apiKey: string,
  model: string,
  kind: "profile" | "preset",
  network?: NetworkConfig,
): Promise<ApiHealthItem> {
  if (!baseUrl?.trim()) {
    return {
      id,
      label,
      type,
      baseUrl,
      kind,
      tone: "unreachable",
      message: "Нет Base URL",
    };
  }
  try {
    const res = isTauri()
      ? await probeViaRust(baseUrl, apiKey, network)
      : await probeViaFetch(baseUrl, apiKey, model, network);
    const adjusted = adjustToneForMissingKey(type, apiKey, res.status, res.message);
    const detailCode = adjusted.detailCode ?? res.detailCode;
    return {
      id,
      label,
      type,
      baseUrl,
      kind,
      tone: adjusted.tone,
      message: adjusted.message,
      latencyMs: res.latencyMs,
      httpStatus: res.httpStatus,
      detailCode,
    };
  } catch (e) {
    return {
      id,
      label,
      type,
      baseUrl,
      kind,
      tone: "unreachable",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function runStartupApiHealthCheck(
  profiles: ApiProfile[],
  onProgress?: (items: ApiHealthItem[]) => void,
  network?: NetworkConfig,
): Promise<ApiHealthItem[]> {
  const items: ApiHealthItem[] = [];

  const push = (item: ApiHealthItem) => {
    const idx = items.findIndex((x) => x.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    onProgress?.([...items]);
  };

  for (const p of profiles) {
    push({
      id: p.id,
      label: p.label,
      type: p.type,
      baseUrl: p.baseUrl,
      kind: "profile",
      tone: "checking",
      message: "Проверка…",
    });
  }
  // Discovery presets: only local/keyless hosts. Cloud presets without keys
  // used to flood health UI with 20+ yellow 401 rows — catalog lives in Settings.
  const discoveryPresets = PROVIDER_TYPE_ORDER.filter((type) => {
    if (type === "custom") return false;
    if (!isKeylessProbeType(type)) return false;
    const preset = PROVIDER_PRESETS[type];
    if (!preset.baseUrl) return false;
    return !profiles.some(
      (p) => p.baseUrl.replace(/\/+$/, "") === preset.baseUrl.replace(/\/+$/, ""),
    );
  });

  for (const type of discoveryPresets) {
    const preset = PROVIDER_PRESETS[type];
    push({
      id: `preset:${type}`,
      label: preset.name,
      type,
      baseUrl: preset.baseUrl,
      kind: "preset",
      tone: "checking",
      message: "Проверка…",
    });
  }

  await mapPool(profiles, 4, async (p) => {
    push(
      await probeOne(p.id, p.label, p.type, p.baseUrl, p.apiKey, p.model, "profile", network),
    );
  });

  await mapPool(discoveryPresets, 6, async (type) => {
    const preset = PROVIDER_PRESETS[type];
    push(
      await probeOne(
        `preset:${type}`,
        preset.name,
        type,
        preset.baseUrl,
        "",
        preset.models[0] ?? "",
        "preset",
        network,
      ),
    );
  });

  return items;
}

async function mapPool<T>(
  list: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const n = Math.min(concurrency, Math.max(list.length, 0));
  const workers = Array.from({ length: n }, async () => {
    while (i < list.length) {
      const cur = list[i++];
      await fn(cur);
    }
  });
  await Promise.all(workers);
}

export function toneClass(tone: HealthTone): string {
  switch (tone) {
    case "ok":
      return "border-accent-green/70 text-text-primary";
    case "auth":
      return "border-accent-yellow/70 text-text-primary";
    case "unreachable":
      return "border-accent-red/70 text-text-primary";
    case "checking":
      return "border-border-default text-text-muted";
    default:
      return "border-border-default text-text-secondary";
  }
}

export function toneDot(tone: HealthTone): string {
  switch (tone) {
    case "ok":
      return "bg-accent-green";
    case "auth":
      return "bg-accent-yellow";
    case "unreachable":
      return "bg-accent-red";
    case "checking":
      return "bg-text-muted animate-pulse";
    default:
      return "bg-border-default";
  }
}
