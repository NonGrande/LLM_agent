import { create } from "zustand";
import { buildCodebaseIndex, getIndex, searchCodebase } from "@/services/index/indexService";
import { useSettingsStore } from "@/stores/settingsStore";
import type { SearchHit } from "@/services/index/types";

interface IndexState {
  indexing: boolean;
  progress: number;
  phase: string;
  chunkCount: number;
  lastIndexedAt: number | null;
  error: string | null;

  reindexProject: (projectId: string, rootPath: string) => Promise<void>;
  search: (projectId: string, query: string, topK?: number) => Promise<SearchHit[]>;
  refreshMeta: (projectId: string) => Promise<void>;
}

export const useIndexStore = create<IndexState>((set) => ({
  indexing: false,
  progress: 0,
  phase: "",
  chunkCount: 0,
  lastIndexedAt: null,
  error: null,

  refreshMeta: async (projectId) => {
    const index = await getIndex(projectId);
    set({
      chunkCount: index?.chunks.length ?? 0,
      lastIndexedAt: index?.lastIndexedAt ?? null,
    });
  },

  reindexProject: async (projectId, rootPath) => {
    if (!rootPath.trim()) return;
    set({ indexing: true, progress: 0, phase: "starting", error: null });
    try {
      const settings = useSettingsStore.getState().settings;
      const index = await buildCodebaseIndex(projectId, rootPath, settings, (p) => {
        const pct =
          p.phase === "embedding" && p.total > 0
            ? Math.round((p.done / p.total) * 100)
            : p.total > 0
              ? Math.round((p.done / p.total) * 80)
              : 0;
        set({ progress: pct, phase: p.phase });
      });
      set({
        indexing: false,
        progress: 100,
        phase: "done",
        chunkCount: index.chunks.length,
        lastIndexedAt: index.lastIndexedAt,
      });
    } catch (err) {
      set({
        indexing: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  search: async (projectId, query, topK) => {
    const settings = useSettingsStore.getState().settings;
    return searchCodebase(projectId, query, settings, topK);
  },
}));

/** Fire-and-forget reindex for active project. */
export function scheduleReindex(projectId: string, rootPath: string): void {
  if (!projectId || !rootPath.trim()) return;
  void useIndexStore.getState().reindexProject(projectId, rootPath);
}
