import { create } from "zustand";
import type { ApiHealthItem, HealthTone } from "@/services/llm/probeApiHealth";
import { runStartupApiHealthCheck } from "@/services/llm/probeApiHealth";
import {
  classifyLlmError,
  type HealthDetailCode,
  type HealthFilterKey,
} from "@/services/llm/healthClassify";
import type { ApiProfile } from "@/types";

/** @deprecated Use HealthFilterKey — kept for any external imports. */
export type HealthFilterTone = HealthFilterKey;

interface ApiHealthState {
  running: boolean;
  doneAt: number | null;
  items: ApiHealthItem[];
  /** Legacy banner flag — panel stays collapsed; traffic-light popover is the detail UI. */
  dismissed: boolean;
  /** When set, traffic-light popover shows this bucket (ok / 401 / 402 / 403 / fail). */
  filterTone: HealthFilterKey | null;
  run: (profiles: ApiProfile[]) => Promise<void>;
  dismiss: () => void;
  show: () => void;
  /** Toggle popover filter; same key again clears. Does not expand the banner. */
  setFilterTone: (tone: HealthFilterKey | null) => void;
  getByProfileId: (id: string) => ApiHealthItem | undefined;
  /** Update a profile's tone after chat/probe runtime errors (e.g. HTTP 402). */
  patchProfileHealth: (
    profileId: string,
    tone: HealthTone,
    message: string,
    extras?: { httpStatus?: number; detailCode?: HealthDetailCode },
  ) => void;
  /** Classify LLM error and mark that profile yellow/red so it drops out of the green picker. */
  reportLlmError: (profileId: string, errorMessage: string) => void;
}

export const useApiHealthStore = create<ApiHealthState>((set, get) => ({
  running: false,
  doneAt: null,
  items: [],
  dismissed: true,
  filterTone: null,

  run: async (profiles) => {
    if (get().running) return;
    // Keep banner dismissed — ambient status lives in ApiTrafficLight only.
    set({ running: true, items: [] });
    try {
      const { useSettingsStore } = await import("@/stores/settingsStore");
      const network = useSettingsStore.getState().settings.network;
      const items = await runStartupApiHealthCheck(
        profiles,
        (partial) => {
          set({ items: partial });
        },
        network,
      );
      set({ items, doneAt: Date.now(), running: false });
    } catch {
      set({ running: false, doneAt: Date.now() });
    }
  },

  dismiss: () => set({ dismissed: true, filterTone: null }),
  show: () => set({ dismissed: false }),

  setFilterTone: (tone) => {
    const next = get().filterTone === tone ? null : tone;
    set({ filterTone: next });
  },

  getByProfileId: (id) => get().items.find((x) => x.id === id),

  patchProfileHealth: (profileId, tone, message, extras) => {
    set((s) => {
      const idx = s.items.findIndex((x) => x.id === profileId && x.kind === "profile");
      if (idx < 0) {
        return s;
      }
      const items = s.items.slice();
      items[idx] = {
        ...items[idx],
        tone,
        message,
        ...(extras?.httpStatus != null ? { httpStatus: extras.httpStatus } : {}),
        ...(extras?.detailCode != null ? { detailCode: extras.detailCode } : {}),
      };
      return { items };
    });
  },

  reportLlmError: (profileId, errorMessage) => {
    const classified = classifyLlmError(errorMessage);
    if (!classified) return;
    get().patchProfileHealth(profileId, classified.tone, errorMessage.slice(0, 200), {
      httpStatus: classified.httpStatus,
      detailCode: classified.detailCode,
    });
  },
}));
