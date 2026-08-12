import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppSettings,
  ProviderConfig,
  GenerationConfig,
  AgentConfig,
  AppearanceConfig,
  EditorConfig,
  WorkspaceConfig,
  ProviderType,
  ApiProfile,
  ModelQuota,
  NetworkConfig,
  McpServerConfig,
} from "@/types";
import {
  DEFAULT_SETTINGS,
  PROVIDER_PRESETS,
  providerToProfile,
  profileToProvider,
} from "@/types";
import {
  healProfileModelsIfMismatched,
  profileLabelMismatch,
} from "@/services/llm/providerPresets";
import { STORAGE_KEYS } from "@/utils/constants";
import { mergeModelQuotas } from "@/services/llm/modelCatalog";
import { createAppDataJSONStorage } from "@/services/persist/appDataStorage";
import type { ProfileFailoverConfig } from "@/types";
import { ensureProjects as migrateProjects } from "@/services/projects/projectHelpers";
import type { SettingsModule } from "@/components/settings/settingsModules";

interface SettingsState {
  settings: AppSettings;
  isOpen: boolean;
  /** Which settings module modal is open (null when closed). */
  activeModule: SettingsModule | null;
  setOpen: (open: boolean) => void;
  openSettings: (module?: SettingsModule) => void;
  closeSettings: () => void;
  updateProvider: (partial: Partial<ProviderConfig>) => void;
  setProviderType: (type: ProviderType) => void;
  updateGeneration: (partial: Partial<GenerationConfig>) => void;
  updateAgent: (partial: Partial<AgentConfig>) => void;
  updateWorkspace: (partial: Partial<WorkspaceConfig>) => void;
  updateAppearance: (partial: Partial<AppearanceConfig>) => void;
  updateEditor: (partial: Partial<EditorConfig>) => void;
  updateNetwork: (partial: Partial<NetworkConfig>) => void;
  updateProfileFailover: (partial: Partial<ProfileFailoverConfig>) => void;
  setOfflineMode: (offline: boolean) => void;
  setActiveProfile: (id: string) => void;
  addApiProfile: (type: ProviderType, label?: string) => void;
  removeApiProfile: (id: string) => void;
  renameActiveProfile: (label: string) => void;
  setProjectProfile: (projectId: string, profileId: string | undefined) => void;
  completeOnboarding: () => void;
  setMcpServers: (servers: McpServerConfig[]) => void;
  upsertMcpServer: (server: McpServerConfig) => void;
  removeMcpServer: (id: string) => void;
  /** Rename labels + reset mismatched model families from presets (keeps keys / URLs). */
  realignMismatchedProfileLabels: () => number;
  updateModelQuota: (modelId: string, partial: Partial<ModelQuota>) => void;
  syncModelsFromList: (models: string[]) => void;
  resetSettings: () => void;
  /** Replace settings from imported AppSettings (runs ensureProfiles). */
  importAppSettings: (next: AppSettings) => void;
}

function syncActiveProfile(settings: AppSettings): AppSettings {
  const profiles = settings.apiProfiles.map((p) =>
    p.id === settings.activeProfileId
      ? {
          ...providerToProfile(settings.provider, p.id, settings.provider.name),
          label: p.label || settings.provider.name,
        }
      : p,
  );
  return { ...settings, apiProfiles: profiles };
}

/** Normalize / migrate persisted settings (combat profiles, failover, network). */
export function ensureProfiles(settings: AppSettings): AppSettings {
  let provider = {
    ...settings.provider,
    modelQuotas:
      settings.provider.modelQuotas?.length
        ? settings.provider.modelQuotas
        : mergeModelQuotas(settings.provider.availableModels ?? []),
    fallbackModels: settings.provider.fallbackModels ?? [],
    failoverEnabled: settings.provider.failoverEnabled ?? true,
  };

  let apiProfiles = [...(settings.apiProfiles ?? [])];
  let activeProfileId = settings.activeProfileId;

  if (!apiProfiles.length) {
    const combat = DEFAULT_SETTINGS.apiProfiles.find((p) => p.type === provider.type);
    const id = combat?.id ?? "profile-migrated";
    const label = provider.name || combat?.label || "Migrated";
    const migrated = providerToProfile(provider, id, label);
    apiProfiles = [
      combat
        ? {
            ...combat,
            ...migrated,
            id: combat.id,
            label,
            apiKey: provider.apiKey,
          }
        : migrated,
    ];
    activeProfileId = apiProfiles[0].id;
  }

  // Merge combat defaults (OpenRouter / xAI / Ollama) without wiping existing keys
  const byId = new Map(apiProfiles.map((p) => [p.id, p]));
  for (const def of DEFAULT_SETTINGS.apiProfiles) {
    const existing = byId.get(def.id);
    if (!existing) {
      // Seed from active provider when types match so a keyed provider is not
      // left only on `provider` while the new combat slot stays empty.
      const seeded: ApiProfile =
        provider.apiKey?.trim() && provider.type === def.type
          ? {
              ...def,
              apiKey: provider.apiKey,
              baseUrl: provider.baseUrl || def.baseUrl,
              model: provider.model || def.model,
              label: provider.name || def.label,
              availableModels: provider.availableModels?.length
                ? provider.availableModels
                : def.availableModels,
              modelQuotas: provider.modelQuotas?.length ? provider.modelQuotas : def.modelQuotas,
              fallbackModels: provider.fallbackModels?.length
                ? provider.fallbackModels
                : def.fallbackModels,
              failoverEnabled: provider.failoverEnabled ?? def.failoverEnabled,
            }
          : { ...def };
      apiProfiles.push(seeded);
      byId.set(def.id, seeded);
    }
    // existing profile keeps apiKey and user overrides as-is
  }

  if (!activeProfileId || !apiProfiles.some((p) => p.id === activeProfileId)) {
    // Prefer a combat slot matching provider type (esp. after seeding) over [0]
    const typed = apiProfiles.find((p) => p.type === provider.type);
    const pick = typed ?? apiProfiles[0];
    activeProfileId = pick.id;
    // Keep a non-empty provider key if the picked profile somehow lacks one
    const fromProfile = profileToProvider(pick);
    provider = {
      ...fromProfile,
      apiKey: fromProfile.apiKey?.trim() ? fromProfile.apiKey : provider.apiKey,
    };
  }

  // Heal split-brain: keyed provider + empty active profile (or vice versa)
  apiProfiles = apiProfiles.map((p) => {
    if (p.id !== activeProfileId) return p;
    if (p.apiKey?.trim() || !provider.apiKey?.trim()) return p;
    return { ...p, apiKey: provider.apiKey };
  });
  {
    const active = apiProfiles.find((p) => p.id === activeProfileId);
    if (active?.apiKey?.trim() && !provider.apiKey?.trim()) {
      provider = { ...provider, apiKey: active.apiKey };
    }
  }

  // Heal type/URL vs model family (e.g. DeepSeek key + leftover qwen2.5:7b after slot swap)
  const healedProfileIds = new Set<string>();
  apiProfiles = apiProfiles.map((p) => {
    const healed = healProfileModelsIfMismatched(p);
    if (!healed) return p;
    healedProfileIds.add(p.id);
    const quotas = mergeModelQuotas(healed.availableModels, p.modelQuotas);
    return { ...healed, modelQuotas: quotas };
  });
  {
    const active = apiProfiles.find((p) => p.id === activeProfileId);
    if (active && healedProfileIds.has(active.id)) {
      provider = {
        ...provider,
        model: active.model,
        availableModels: active.availableModels,
        fallbackModels: active.fallbackModels,
        modelQuotas: active.modelQuotas,
      };
    } else {
      const healedProvider = healProfileModelsIfMismatched({
        type: provider.type,
        baseUrl: provider.baseUrl,
        model: provider.model,
        availableModels: provider.availableModels ?? [],
        fallbackModels: provider.fallbackModels ?? [],
      });
      if (healedProvider) {
        provider = {
          ...provider,
          model: healedProvider.model,
          availableModels: healedProvider.availableModels,
          fallbackModels: healedProvider.fallbackModels,
          modelQuotas: mergeModelQuotas(
            healedProvider.availableModels,
            provider.modelQuotas,
          ),
        };
      }
    }
  }

  // Enrich quotas from catalog once
  provider = {
    ...provider,
    modelQuotas: mergeModelQuotas(
      provider.availableModels.length
        ? provider.availableModels
        : provider.modelQuotas.map((q) => q.id),
      provider.modelQuotas,
    ),
  };

  const defaultFailoverIds = DEFAULT_SETTINGS.profileFailover.fallbackProfileIds.filter((id) =>
    apiProfiles.some((p) => p.id === id && p.id !== activeProfileId),
  );
  const prevFailover = settings.profileFailover?.fallbackProfileIds ?? [];
  const fallbackProfileIds =
    prevFailover.length > 0
      ? [
          ...prevFailover.filter((id) => apiProfiles.some((p) => p.id === id)),
          ...defaultFailoverIds.filter((id) => !prevFailover.includes(id)),
        ]
      : defaultFailoverIds.length
        ? defaultFailoverIds
        : apiProfiles.filter((p) => p.id !== activeProfileId).map((p) => p.id);

  const migrated = migrateProjects(settings);
  const onboardingCompleted =
    settings.onboardingCompleted ??
    (Boolean(settings.workspace?.path) ||
      apiProfiles.some((p) => Boolean(p.apiKey?.trim())));

  return {
    ...settings,
    provider,
    apiProfiles,
    activeProfileId,
    profileFailover: {
      enabled: settings.profileFailover?.enabled ?? true,
      fallbackProfileIds,
    },
    projects: migrated.projects,
    activeProjectId: migrated.activeProjectId,
    workspace: {
      ...settings.workspace,
      path: migrated.workspacePath,
      excludedPatterns:
        settings.workspace?.excludedPatterns ?? DEFAULT_SETTINGS.workspace.excludedPatterns,
    },
    agent: {
      ...settings.agent,
      role: settings.agent?.role ?? "default",
      offlineMode: settings.agent?.offlineMode ?? false,
      ragFromSuccess: settings.agent?.ragFromSuccess ?? true,
      strictTools: settings.agent?.strictTools ?? false,
      planThenExecute: settings.agent?.planThenExecute ?? true,
      mode: settings.agent?.mode ?? "agent",
      workingDirectory: migrated.workspacePath || settings.agent?.workingDirectory || "",
    },
    network: {
      proxyEnabled: settings.network?.proxyEnabled ?? false,
      proxyUrl: settings.network?.proxyUrl ?? "socks5://127.0.0.1:1080",
      forceRustHttp: settings.network?.forceRustHttp ?? true,
    },
    editor: {
      ...DEFAULT_SETTINGS.editor,
      ...settings.editor,
      lspArgs: settings.editor?.lspArgs ?? DEFAULT_SETTINGS.editor.lspArgs,
    },
    mcpServers: settings.mcpServers ?? [],
    onboardingCompleted,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: ensureProfiles(DEFAULT_SETTINGS),
      isOpen: false,
      activeModule: null,

      setOpen: (open) =>
        set({
          isOpen: open,
          activeModule: open ? (get().activeModule ?? "api") : null,
        }),

      openSettings: (module = "api") => set({ isOpen: true, activeModule: module }),

      closeSettings: () => set({ isOpen: false, activeModule: null }),

      updateProvider: (partial) =>
        set((s) => {
          const settings = syncActiveProfile({
            ...s.settings,
            provider: { ...s.settings.provider, ...partial },
          });
          return { settings };
        }),

      setProviderType: (type) => {
        const preset = PROVIDER_PRESETS[type];
        const models = [...preset.models];
        set((s) => {
          const provider: ProviderConfig = {
            ...s.settings.provider,
            type,
            name: preset.name,
            baseUrl: preset.baseUrl || s.settings.provider.baseUrl,
            availableModels: models.length ? models : s.settings.provider.availableModels,
            model: models[0] ?? s.settings.provider.model,
            modelQuotas: mergeModelQuotas(
              models.length ? models : s.settings.provider.availableModels,
              s.settings.provider.modelQuotas,
            ),
            fallbackModels: s.settings.provider.fallbackModels ?? [],
            failoverEnabled: s.settings.provider.failoverEnabled ?? true,
          };
          return { settings: syncActiveProfile({ ...s.settings, provider }) };
        });
      },

      updateGeneration: (partial) =>
        set((s) => ({
          settings: { ...s.settings, generation: { ...s.settings.generation, ...partial } },
        })),

      updateAgent: (partial) =>
        set((s) => ({
          settings: { ...s.settings, agent: { ...s.settings.agent, ...partial } },
        })),

      updateWorkspace: (partial) =>
        set((s) => ({
          settings: {
            ...s.settings,
            workspace: { ...s.settings.workspace, ...partial },
            agent: {
              ...s.settings.agent,
              workingDirectory: partial.path ?? s.settings.agent.workingDirectory,
            },
          },
        })),

      updateAppearance: (partial) =>
        set((s) => ({
          settings: { ...s.settings, appearance: { ...s.settings.appearance, ...partial } },
        })),

      updateEditor: (partial) =>
        set((s) => ({
          settings: {
            ...s.settings,
            editor: {
              ...DEFAULT_SETTINGS.editor,
              ...s.settings.editor,
              ...partial,
            },
          },
        })),

      updateNetwork: (partial) =>
        set((s) => ({
          settings: {
            ...s.settings,
            network: {
              proxyEnabled: s.settings.network?.proxyEnabled ?? false,
              proxyUrl: s.settings.network?.proxyUrl ?? "",
              forceRustHttp: s.settings.network?.forceRustHttp ?? true,
              ...partial,
            },
          },
        })),

      updateProfileFailover: (partial) =>
        set((s) => ({
          settings: {
            ...s.settings,
            profileFailover: {
              enabled: s.settings.profileFailover?.enabled ?? true,
              fallbackProfileIds: s.settings.profileFailover?.fallbackProfileIds ?? [],
              ...partial,
            },
          },
        })),

      setOfflineMode: (offline) =>
        set((s) => {
          const ollama =
            s.settings.apiProfiles.find((p) => p.type === "ollama") ??
            s.settings.apiProfiles.find((p) => p.id === "profile-ollama");
          const online =
            s.settings.apiProfiles.find((p) => p.id === "profile-openrouter") ??
            s.settings.apiProfiles.find((p) => p.type === "openrouter" || p.type === "xai");
          if (offline && ollama) {
            return {
              settings: {
                ...s.settings,
                agent: { ...s.settings.agent, offlineMode: true },
                activeProfileId: ollama.id,
                provider: profileToProvider(ollama),
              },
            };
          }
          if (!offline && online) {
            return {
              settings: {
                ...s.settings,
                agent: { ...s.settings.agent, offlineMode: false },
                activeProfileId: online.id,
                provider: profileToProvider(online),
              },
            };
          }
          return {
            settings: {
              ...s.settings,
              agent: { ...s.settings.agent, offlineMode: offline },
            },
          };
        }),

      setActiveProfile: (id) =>
        set((s) => {
          const profile = s.settings.apiProfiles.find((p) => p.id === id);
          if (!profile) return s;
          return {
            settings: {
              ...s.settings,
              activeProfileId: id,
              provider: profileToProvider(profile),
            },
          };
        }),

      setProjectProfile: (projectId, profileId) =>
        set((s) => {
          const projects = s.settings.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  activeProfileId: profileId || undefined,
                }
              : p,
          );
          let settings: AppSettings = { ...s.settings, projects };
          if (s.settings.activeProjectId === projectId && profileId) {
            const profile = s.settings.apiProfiles.find((p) => p.id === profileId);
            if (profile) {
              settings = {
                ...settings,
                activeProfileId: profileId,
                provider: profileToProvider(profile),
              };
            }
          }
          return { settings };
        }),

      completeOnboarding: () =>
        set((s) => ({
          settings: { ...s.settings, onboardingCompleted: true },
        })),

      setMcpServers: (servers) =>
        set((s) => ({
          settings: { ...s.settings, mcpServers: servers },
        })),

      upsertMcpServer: (server) =>
        set((s) => {
          const list = s.settings.mcpServers ?? [];
          const idx = list.findIndex((x) => x.id === server.id);
          const mcpServers =
            idx >= 0
              ? list.map((x, i) => (i === idx ? server : x))
              : [...list, server];
          return { settings: { ...s.settings, mcpServers } };
        }),

      removeMcpServer: (id) =>
        set((s) => ({
          settings: {
            ...s.settings,
            mcpServers: (s.settings.mcpServers ?? []).filter((x) => x.id !== id),
          },
        })),

      addApiProfile: (type, label) =>
        set((s) => {
          const preset = PROVIDER_PRESETS[type];
          const models = [...preset.models];
          const profile: ApiProfile = {
            id: crypto.randomUUID(),
            label: label ?? preset.name,
            type,
            baseUrl: preset.baseUrl,
            apiKey: "",
            model: models[0] ?? "",
            availableModels: models,
            modelQuotas: mergeModelQuotas(models),
            fallbackModels: models.slice(1, 4),
            failoverEnabled: true,
          };
          return {
            settings: {
              ...s.settings,
              apiProfiles: [...s.settings.apiProfiles, profile],
              activeProfileId: profile.id,
              provider: profileToProvider(profile),
            },
          };
        }),

      removeApiProfile: (id) =>
        set((s) => {
          if (s.settings.apiProfiles.length <= 1) return s;
          const apiProfiles = s.settings.apiProfiles.filter((p) => p.id !== id);
          const activeProfileId =
            s.settings.activeProfileId === id ? apiProfiles[0].id : s.settings.activeProfileId;
          const active = apiProfiles.find((p) => p.id === activeProfileId)!;
          return {
            settings: {
              ...s.settings,
              apiProfiles,
              activeProfileId,
              provider: profileToProvider(active),
            },
          };
        }),

      renameActiveProfile: (label) =>
        set((s) => {
          const provider = { ...s.settings.provider, name: label };
          const settings = syncActiveProfile({ ...s.settings, provider });
          settings.apiProfiles = settings.apiProfiles.map((p) =>
            p.id === settings.activeProfileId ? { ...p, label } : p,
          );
          return { settings };
        }),

      realignMismatchedProfileLabels: () => {
        let fixed = 0;
        set((s) => {
          const apiProfiles = s.settings.apiProfiles.map((p) => {
            let next = p;
            let changed = false;
            const labelMismatch = profileLabelMismatch(next);
            if (labelMismatch) {
              next = { ...next, label: labelMismatch.expectedLabel };
              changed = true;
            }
            const healed = healProfileModelsIfMismatched(next);
            if (healed) {
              next = {
                ...healed,
                modelQuotas: mergeModelQuotas(healed.availableModels, next.modelQuotas),
              };
              changed = true;
            }
            if (changed) fixed += 1;
            return next;
          });
          if (!fixed) return s;
          const active = apiProfiles.find((p) => p.id === s.settings.activeProfileId);
          return {
            settings: {
              ...s.settings,
              apiProfiles,
              provider: active
                ? {
                    ...profileToProvider(active),
                    name: active.label,
                  }
                : s.settings.provider,
            },
          };
        });
        return fixed;
      },

      updateModelQuota: (modelId, partial) =>
        set((s) => {
          const quotas = [...(s.settings.provider.modelQuotas ?? [])];
          const idx = quotas.findIndex((q) => q.id === modelId);
          if (idx >= 0) quotas[idx] = { ...quotas[idx], ...partial, id: modelId };
          else quotas.push({ id: modelId, ...partial });
          return {
            settings: syncActiveProfile({
              ...s.settings,
              provider: { ...s.settings.provider, modelQuotas: quotas },
            }),
          };
        }),

      syncModelsFromList: (models) =>
        set((s) => {
          const modelQuotas = mergeModelQuotas(models, s.settings.provider.modelQuotas);
          return {
            settings: syncActiveProfile({
              ...s.settings,
              provider: {
                ...s.settings.provider,
                availableModels: models,
                modelQuotas,
                model: models.includes(s.settings.provider.model)
                  ? s.settings.provider.model
                  : models[0] ?? s.settings.provider.model,
              },
            }),
          };
        }),

      resetSettings: () => set({ settings: ensureProfiles(DEFAULT_SETTINGS) }),

      importAppSettings: (next) =>
        set({
          settings: ensureProfiles({
            ...DEFAULT_SETTINGS,
            ...next,
            provider: { ...DEFAULT_SETTINGS.provider, ...next.provider },
          }),
        }),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: createAppDataJSONStorage(),
      partialize: (s) => ({ settings: s.settings }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        const persistedSettings = p.settings;
        if (!persistedSettings) {
          return { ...current, settings: ensureProfiles(current.settings) };
        }
        // Do NOT inherit DEFAULT empty apiProfiles when an older persist had none —
        // pass [] so ensureProfiles migrates from provider (preserves apiKey).
        const raw: AppSettings = {
          ...current.settings,
          ...persistedSettings,
          provider: {
            ...current.settings.provider,
            ...persistedSettings.provider,
          },
          apiProfiles: persistedSettings.apiProfiles ?? [],
        };
        return {
          ...current,
          settings: ensureProfiles(raw),
          isOpen: false,
          activeModule: null,
        };
      },
    },
  ),
);
