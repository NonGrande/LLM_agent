import type { HealthTone } from "@/services/llm/probeApiHealth";

/** Local / self-hosted endpoints that work without an API key. */
export const KEYLESS_OK_TYPES = new Set(["ollama", "lmstudio", "vllm"]);

/** Fine-grained auth/access code for UI grouping (tone may still be shared "auth"). */
export type HealthDetailCode = 401 | 402 | 403;

/**
 * Clickable health filter buckets:
 * ✓ ok · 401 key · 402 payment · 403 geo · ✕ unreachable/other
 */
export type HealthFilterKey = "ok" | "401" | "402" | "403" | "fail";

export const HEALTH_FILTER_KEYS: HealthFilterKey[] = ["ok", "401", "402", "403", "fail"];

/** Russian short chip labels + full titles for tooltips / headers. */
export const HEALTH_FILTER_META: Record<
  HealthFilterKey,
  { short: string; label: string; hint: string; dot: string }
> = {
  ok: {
    short: "✓",
    label: "доступны",
    hint: "API отвечают и готовы к чату",
    dot: "bg-accent-green",
  },
  "401": {
    short: "401",
    label: "Требуется авторизация API",
    hint: "нужен ключ / credentials",
    dot: "bg-accent-yellow",
  },
  "402": {
    short: "402",
    label: "Авторизация + оплата",
    hint: "недостаточно баланса / квота",
    dot: "bg-accent-yellow",
  },
  "403": {
    short: "403",
    label: "Доступ запрещён в текущей локации",
    hint: "geo / VPN / forbidden",
    dot: "bg-accent-yellow",
  },
  fail: {
    short: "✕",
    label: "недоступны",
    hint: "сеть, 5xx или другая ошибка",
    dot: "bg-accent-red",
  },
};

/**
 * Map HTTP status (+ optional body) from a probe or chat error to a health tone.
 * 401/402/403 all map to yellow "auth" for the traffic-light color, but callers
 * should also store httpStatus / detailCode so the UI can group them separately.
 */
export function classifyHttpStatusForHealth(
  httpStatus: number,
  bodyHint = "",
): Exclude<HealthTone, "checking" | "idle"> {
  const body = bodyHint.toLowerCase();
  if (isBillingOrQuotaFailure(httpStatus, body)) {
    return "auth";
  }
  if (httpStatus === 401 || httpStatus === 403) return "auth";
  if (httpStatus === 404) return "auth";
  if (httpStatus >= 500) return "unreachable";
  if (httpStatus >= 200 && httpStatus < 300) return "ok";
  // 429 and other 4xx: reachable host, credentials/quota/plan issue
  return "auth";
}

/** Resolve 401 / 402 / 403 detail for UI grouping without collapsing them. */
export function resolveDetailCode(
  httpStatus: number | undefined,
  message = "",
  tone?: HealthTone,
): HealthDetailCode | undefined {
  if (isBillingOrQuotaFailure(httpStatus, message)) return 402;
  if (httpStatus === 402) return 402;
  if (httpStatus === 401) return 401;
  if (httpStatus === 403) return 403;

  const m = message.toLowerCase();
  if (
    /\b403\b/.test(m) ||
    m.includes("forbidden") ||
    m.includes("access denied") ||
    m.includes("geo") ||
    m.includes("регион") ||
    m.includes("локаци") ||
    m.includes("vpn")
  ) {
    return 403;
  }
  if (
    /\b401\b/.test(m) ||
    m.includes("unauthorized") ||
    m.includes("authentication") ||
    m.includes("invalid api key") ||
    m.includes("api-ключ") ||
    m.includes("нужен api") ||
    m.includes("нужен ключ")
  ) {
    return 401;
  }

  // Missing-key downgrade and generic auth without a specific code → 401 bucket
  if (tone === "auth" && (httpStatus == null || httpStatus === 0)) return 401;
  return undefined;
}

/** Pick the filter bucket for an API health item. */
export function resolveHealthFilterKey(item: {
  tone: HealthTone;
  httpStatus?: number;
  detailCode?: number;
  message?: string;
}): HealthFilterKey | null {
  if (item.tone === "checking" || item.tone === "idle") return null;
  if (item.tone === "ok") return "ok";

  const code =
    (item.detailCode === 401 || item.detailCode === 402 || item.detailCode === 403
      ? item.detailCode
      : undefined) ?? resolveDetailCode(item.httpStatus, item.message ?? "", item.tone);

  if (code === 401) return "401";
  if (code === 402) return "402";
  if (code === 403) return "403";
  return "fail";
}

export function itemMatchesHealthFilter(
  item: {
    tone: HealthTone;
    kind?: "profile" | "preset";
    httpStatus?: number;
    detailCode?: number;
    message?: string;
  },
  filter: HealthFilterKey,
): boolean {
  const key = resolveHealthFilterKey(item);
  if (key !== filter) return false;
  // Green chip = pickable chat profiles only
  if (filter === "ok" && item.kind === "preset") return false;
  return true;
}

/** True when response indicates payment / credit / plan quota exhaustion. */
export function isBillingOrQuotaFailure(httpStatus: number | undefined, text: string): boolean {
  if (httpStatus === 402) return true;
  const m = text.toLowerCase();
  if (m.includes("402")) return true;
  if (m.includes("insufficient_balance") || m.includes("insufficient balance")) return true;
  if (m.includes("payment required")) return true;
  if (m.includes("insufficient") && (m.includes("credit") || m.includes("fund") || m.includes("quota"))) {
    return true;
  }
  if (m.includes("exceeded your current quota")) return true;
  if (m.includes("credit balance is too low")) return true;
  return false;
}

export type LlmErrorClassification = {
  tone: "auth" | "unreachable";
  httpStatus?: number;
  detailCode?: HealthDetailCode;
};

/**
 * Classify a chat/completions (or stream) error string for runtime health updates.
 * Returns null when the error should not change the traffic light.
 */
export function classifyLlmError(errorMessage: string): LlmErrorClassification | null {
  const m = errorMessage.toLowerCase();
  if (isBillingOrQuotaFailure(undefined, m)) {
    return { tone: "auth", httpStatus: 402, detailCode: 402 };
  }
  if (
    m.includes("401") ||
    m.includes("invalid api key") ||
    m.includes("unauthorized") ||
    m.includes("authentication")
  ) {
    return { tone: "auth", httpStatus: 401, detailCode: 401 };
  }
  if (
    m.includes("403") ||
    m.includes("forbidden") ||
    m.includes("access denied") ||
    (m.includes("geo") && (m.includes("block") || m.includes("restrict")))
  ) {
    return { tone: "auth", httpStatus: 403, detailCode: 403 };
  }
  return null;
}

/** @deprecated Prefer classifyLlmError — keeps tone-only callers working. */
export function classifyLlmErrorTone(errorMessage: string): "auth" | "unreachable" | null {
  return classifyLlmError(errorMessage)?.tone ?? null;
}

/**
 * GET /models often returns 200 without a key (or with $0 balance).
 * Keyless cloud presets/profiles must not stay green — chat will fail.
 */
export function adjustToneForMissingKey(
  type: string,
  apiKey: string,
  tone: HealthTone,
  message: string,
): { tone: HealthTone; message: string; detailCode?: HealthDetailCode } {
  if (tone !== "ok") return { tone, message };
  if (apiKey?.trim()) return { tone, message };
  if (KEYLESS_OK_TYPES.has(type)) return { tone, message };
  return {
    tone: "auth",
    message: `${message} — нужен API-ключ для чата`,
    detailCode: 401,
  };
}

/** Default Russian probe messages when the backend only returns a bare status. */
export function defaultMessageForDetail(
  detail: HealthDetailCode,
  httpStatus?: number,
  existing?: string,
): string {
  if (existing?.trim() && !/^HTTP\s+\d+$/i.test(existing.trim())) {
    return existing;
  }
  const code = httpStatus ?? detail;
  switch (detail) {
    case 401:
      return `Требуется авторизация API (HTTP ${code}) — нужен ключ`;
    case 402:
      return `Авторизация + оплата: недостаточно баланса (HTTP ${code})`;
    case 403:
      return `Доступ запрещён в текущей локации (HTTP ${code}) — geo / VPN`;
  }
}
