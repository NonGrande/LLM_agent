import type { AppSettings } from "@/types";
import { APP_VERSION } from "@/utils/constants";

const EXPORT_VERSION = 1;

export interface SettingsExportPayload {
  format: "llm-shell-settings";
  version: number;
  exportedAt: string;
  appVersion: string;
  settings: AppSettings;
}

/** Deep-clone settings; optionally strip API keys for safe sharing. */
export function buildSettingsExport(
  settings: AppSettings,
  opts?: { stripSecrets?: boolean },
): SettingsExportPayload {
  const clone = structuredClone(settings) as AppSettings;
  if (opts?.stripSecrets) {
    clone.provider.apiKey = "";
    for (const p of clone.apiProfiles) {
      p.apiKey = "";
    }
    if (clone.network) {
      // keep proxy URL; no secrets there typically
    }
  }
  return {
    format: "llm-shell-settings",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    settings: clone,
  };
}

export function parseSettingsImport(raw: string): AppSettings {
  const data = JSON.parse(raw) as Partial<SettingsExportPayload> & { settings?: AppSettings };
  if (data.format === "llm-shell-settings" && data.settings) {
    return data.settings;
  }
  // Accept bare AppSettings JSON
  if (data && typeof data === "object" && "provider" in data && "apiProfiles" in data) {
    return data as unknown as AppSettings;
  }
  if (data.settings) return data.settings;
  throw new Error("Unrecognized settings JSON (expected llm-shell-settings export).");
}

export interface UpdateCheckResult {
  ok: boolean;
  current: string;
  latest?: string;
  htmlUrl?: string;
  newer: boolean;
  message: string;
}

/** Compare semver-ish tags (v0.3.0 / 0.3.0). */
export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/i, "")
      .split(/[.+-]/)
      .map((p) => Number.parseInt(p, 10) || 0);
  const a = parse(latest);
  const b = parse(current);
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

/**
 * Soft update check via GitHub Releases API.
 * Override with VITE_UPDATE_REPO=owner/name (default: empty → skip network, local message).
 */
export async function checkGithubUpdates(
  repo = (import.meta as { env?: { VITE_UPDATE_REPO?: string } }).env?.VITE_UPDATE_REPO ?? "",
): Promise<UpdateCheckResult> {
  const current = APP_VERSION;
  if (!repo.trim()) {
    return {
      ok: true,
      current,
      newer: false,
      message: `Текущая версия ${current}. Задайте VITE_UPDATE_REPO=owner/repo для проверки релизов.`,
    };
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) {
      return {
        ok: false,
        current,
        newer: false,
        message: `GitHub API ${res.status}: не удалось проверить обновления`,
      };
    }
    const body = (await res.json()) as { tag_name?: string; html_url?: string };
    const latest = (body.tag_name ?? "").replace(/^v/i, "");
    const newer = latest ? isNewerVersion(latest, current) : false;
    return {
      ok: true,
      current,
      latest,
      htmlUrl: body.html_url,
      newer,
      message: newer
        ? `Доступна ${latest} (сейчас ${current})`
        : `У вас актуальная версия ${current}`,
    };
  } catch (err) {
    return {
      ok: false,
      current,
      newer: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface SignedUpdateResult extends UpdateCheckResult {
  /** Signed updater found a package; call installSignedUpdate to apply */
  canInstall?: boolean;
}

/**
 * Prefer signed Tauri updater; fall back to GitHub soft check.
 * Install requires confirm + downloadAndInstall + relaunch.
 */
export async function checkForAppUpdates(): Promise<SignedUpdateResult> {
  const soft = await checkGithubUpdates();
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (update) {
      return {
        ok: true,
        current: APP_VERSION,
        latest: update.version,
        newer: true,
        canInstall: true,
        message: `Подписанное обновление ${update.version} доступно (сейчас ${APP_VERSION})`,
        htmlUrl: soft.htmlUrl,
      };
    }
    return {
      ...soft,
      canInstall: false,
      message: soft.message + (soft.newer ? "" : " · signed updater: нет пакета"),
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      ...soft,
      canInstall: false,
      message: soft.message + ` · signed: ${detail.slice(0, 120)}`,
    };
  }
}

/** Download, install signed update, then relaunch. */
export async function installSignedUpdate(): Promise<{ ok: boolean; message: string }> {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const { relaunch } = await import("@tauri-apps/plugin-process");
    const update = await check();
    if (!update) {
      return { ok: false, message: "Нет подписанного обновления" };
    }
    await update.downloadAndInstall();
    await relaunch();
    return { ok: true, message: "Установлено, перезапуск…" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
