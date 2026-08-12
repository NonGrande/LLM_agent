import type { ApiProfile, ProviderConfig, ProfileFailoverConfig } from "@/types";
import { profileToProvider } from "@/types";

/** Build unique ordered chain: primary first, then fallbacks. */
export function buildModelChain(provider: ProviderConfig): string[] {
  const primary = provider.model?.trim();
  const fallbacks = (provider.fallbackModels ?? []).map((m) => m.trim()).filter(Boolean);
  const chain: string[] = [];
  if (primary) chain.push(primary);
  for (const m of fallbacks) {
    if (!chain.includes(m)) chain.push(m);
  }
  return chain;
}

/**
 * Errors that justify switching to the next model / profile.
 */
export function isFailoverError(message: string): boolean {
  const m = message.toLowerCase();
  // Stream stall / user stop — do NOT hop to Ollama; that makes hangs worse
  if (
    m.includes("stream idle timeout") ||
    m.includes("без данных от api") ||
    m.includes("без токенов от api") ||
    m === "aborted" ||
    m.startsWith("aborted")
  ) {
    return false;
  }
  const patterns = [
    "429",
    "402",
    "rate limit",
    "ratelimit",
    "too many requests",
    "quota",
    "insufficient_balance",
    "insufficient balance",
    "payment required",
    "503",
    "502",
    "overloaded",
    "capacity",
    "context length",
    "context_length",
    "maximum context",
    "max tokens",
    "token limit",
    "too long",
    "model not found",
    "does not exist",
    "unknown model",
    "invalid model",
    "not available",
    "failed to load",
    "out of memory",
    "oom",
    "cuda out of memory",
    "timed out",
    "econnrefused",
    "enotfound",
    "fetch failed",
    "network error",
    "proxy error",
  ];
  return patterns.some((p) => m.includes(p));
}

export class ModelRouter {
  private chain: string[];
  private index = 0;
  readonly failoverEnabled: boolean;

  constructor(provider: ProviderConfig) {
    this.chain = buildModelChain(provider);
    this.failoverEnabled = provider.failoverEnabled !== false;
    if (this.chain.length === 0) {
      this.chain = ["gpt-4o-mini"];
    }
  }

  reset(provider: ProviderConfig) {
    this.chain = buildModelChain(provider);
    this.index = 0;
    if (this.chain.length === 0) this.chain = ["gpt-4o-mini"];
  }

  current(): string {
    return this.chain[this.index] ?? this.chain[0];
  }

  tryFailover(errorMessage: string): { switched: boolean; from: string; to: string; reason: string } {
    const from = this.current();
    if (!this.failoverEnabled || !isFailoverError(errorMessage)) {
      return { switched: false, from, to: from, reason: errorMessage };
    }
    if (this.index >= this.chain.length - 1) {
      return { switched: false, from, to: from, reason: "failover chain exhausted" };
    }
    this.index += 1;
    const to = this.current();
    return {
      switched: true,
      from,
      to,
      reason: `Failover: ${from} → ${to} (${errorMessage.slice(0, 120)})`,
    };
  }

  exhausted(): boolean {
    return this.index >= this.chain.length - 1;
  }

  list(): string[] {
    return [...this.chain];
  }
}

/**
 * After models on the active profile are exhausted (or network is dead),
 * switch to the next API profile (e.g. OpenRouter → xAI → Ollama offline).
 */
export class ProfileRouter {
  private profileIds: string[];
  private index = 0;
  readonly enabled: boolean;
  private profilesById: Map<string, ApiProfile>;

  constructor(
    activeProfileId: string,
    profiles: ApiProfile[],
    failover: ProfileFailoverConfig | undefined,
  ) {
    this.enabled = failover?.enabled !== false;
    this.profilesById = new Map(profiles.map((p) => [p.id, p]));
    const rest = (failover?.fallbackProfileIds ?? []).filter(
      (id) => id !== activeProfileId && this.profilesById.has(id),
    );
    this.profileIds = [activeProfileId, ...rest].filter((id) => this.profilesById.has(id));
    if (this.profileIds.length === 0 && profiles[0]) {
      this.profileIds = [profiles[0].id];
    }
  }

  currentProfile(): ApiProfile {
    const id = this.profileIds[this.index] ?? this.profileIds[0];
    return this.profilesById.get(id)!;
  }

  currentProvider(): ProviderConfig {
    return profileToProvider(this.currentProfile());
  }

  tryNextProfile(errorMessage: string): {
    switched: boolean;
    from: string;
    to: string;
    reason: string;
    provider?: ProviderConfig;
  } {
    const from = this.currentProfile().label;
    if (!this.enabled || !isFailoverError(errorMessage)) {
      return { switched: false, from, to: from, reason: errorMessage };
    }
    if (this.index >= this.profileIds.length - 1) {
      return { switched: false, from, to: from, reason: "profile failover chain exhausted" };
    }
    this.index += 1;
    const profile = this.currentProfile();
    return {
      switched: true,
      from,
      to: profile.label,
      reason: `Profile failover: ${from} → ${profile.label} (${errorMessage.slice(0, 100)})`,
      provider: profileToProvider(profile),
    };
  }
}
