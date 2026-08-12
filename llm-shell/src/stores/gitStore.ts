import { create } from "zustand";
import { checkoutBranch, getGitInfo, type GitInfo } from "@/services/git";

interface GitState extends GitInfo {
  loading: boolean;
  error: string | null;
  cwd: string | null;
  refresh: (cwd?: string | null) => Promise<void>;
  switchBranch: (branch: string, forceDirty?: boolean) => Promise<{ ok: boolean; message: string }>;
}

export const useGitStore = create<GitState>((set, get) => ({
  isRepo: false,
  currentBranch: null,
  branches: [],
  dirty: false,
  loading: false,
  error: null,
  cwd: null,

  refresh: async (cwd) => {
    const path = cwd !== undefined ? cwd : get().cwd;
    set({ loading: true, error: null, cwd: path ?? null });
    const info = await getGitInfo(path);
    set({ ...info, loading: false });
  },

  switchBranch: async (branch, forceDirty = false) => {
    const { cwd, dirty, currentBranch } = get();
    if (!cwd) return { ok: false, message: "No workspace" };
    if (branch === currentBranch) return { ok: true, message: "Already on branch" };
    if (dirty && !forceDirty) {
      return { ok: false, message: "dirty" };
    }
    set({ loading: true, error: null });
    const result = await checkoutBranch(cwd, branch);
    if (result.ok) {
      await get().refresh(cwd);
    } else {
      set({ loading: false, error: result.message });
    }
    return result;
  },
}));
