import { create } from "zustand";
import type { DirEntry } from "@/types";
import { listDirectory } from "@/services/tauri/fs";
import { errorMessage } from "@/utils/errors";
import { isTauri } from "@/utils/env";

interface FileState {
  rootPath: string;
  entries: DirEntry[];
  expanded: Record<string, DirEntry[]>;
  selectedPath: string | null;
  loading: boolean;
  error: string | null;

  setRootPath: (path: string) => Promise<void>;
  toggleDir: (path: string) => Promise<void>;
  selectPath: (path: string | null) => void;
  refresh: () => Promise<void>;
}

export const useFileStore = create<FileState>((set, get) => ({
  rootPath: "",
  entries: [],
  expanded: {},
  selectedPath: null,
  loading: false,
  error: null,

  setRootPath: async (path) => {
    set({ rootPath: path, entries: [], expanded: {}, selectedPath: null, error: null, loading: true });
    if (!path) {
      set({ loading: false });
      return;
    }
    if (!isTauri()) {
      set({
        loading: false,
        error: "Файловое дерево доступно только в окне Tauri (npm run tauri:dev).",
      });
      return;
    }
    try {
      const entries = await listDirectory(path);
      set({ entries: sortEntries(entries), loading: false });
    } catch (err) {
      set({ error: errorMessage(err), loading: false });
    }
  },

  toggleDir: async (path) => {
    const { expanded } = get();
    if (expanded[path]) {
      const next = { ...expanded };
      delete next[path];
      set({ expanded: next });
      return;
    }
    if (!isTauri()) return;
    try {
      const children = await listDirectory(path);
      set({ expanded: { ...get().expanded, [path]: sortEntries(children) } });
    } catch (err) {
      set({ error: errorMessage(err) });
    }
  },

  selectPath: (path) => set({ selectedPath: path }),

  refresh: async () => {
    const { rootPath } = get();
    if (rootPath) await get().setRootPath(rootPath);
  },
}));

function sortEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
