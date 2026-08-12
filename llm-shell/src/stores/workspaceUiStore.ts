import { create } from "zustand";

interface OpenFile {
  path: string;
  title: string;
}

interface WorkspaceUiState {
  openFiles: OpenFile[];
  activePath: string | null;
  diff: { path: string; oldValue: string; newValue: string } | null;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActive: (path: string) => void;
  showDiff: (path: string, oldValue: string, newValue: string) => void;
  clearDiff: () => void;
  closeAll: () => void;
}

function titleOf(path: string) {
  return path.replace(/\\/g, "/").split("/").pop() || path;
}

export const useWorkspaceUiStore = create<WorkspaceUiState>((set, get) => ({
  openFiles: [],
  activePath: null,
  diff: null,

  openFile: (path) => {
    const { openFiles } = get();
    if (!openFiles.some((f) => f.path === path)) {
      set({
        openFiles: [...openFiles, { path, title: titleOf(path) }],
        activePath: path,
        diff: null,
      });
    } else {
      set({ activePath: path, diff: null });
    }
  },

  closeFile: (path) => {
    const openFiles = get().openFiles.filter((f) => f.path !== path);
    const activePath =
      get().activePath === path ? (openFiles[openFiles.length - 1]?.path ?? null) : get().activePath;
    set({ openFiles, activePath });
  },

  setActive: (path) => set({ activePath: path, diff: null }),

  showDiff: (path, oldValue, newValue) => set({ diff: { path, oldValue, newValue } }),

  clearDiff: () => set({ diff: null }),

  closeAll: () => set({ openFiles: [], activePath: null, diff: null }),
}));
