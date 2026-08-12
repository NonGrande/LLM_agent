import { create } from "zustand";
import { writeFile } from "@/services/tauri/fs";
import { useWorkspaceUiStore } from "@/stores/workspaceUiStore";
import { useEditorStore } from "@/stores/editorStore";
import { diffTooLarge } from "@/utils/diffLimits";

export interface PendingEdit {
  id: string;
  path: string;
  oldValue: string;
  newValue: string;
  createdAt: number;
}

interface EditQueueState {
  queue: PendingEdit[];
  activeId: string | null;

  push: (edit: Omit<PendingEdit, "id" | "createdAt">) => void;
  applyActive: () => Promise<void>;
  rejectActive: () => Promise<void>;
  applyAll: () => Promise<void>;
  rejectAll: () => Promise<void>;
  clear: () => void;
  pendingCount: () => number;
  showActiveDiff: () => void;
}

function showNextDiff(queue: PendingEdit[], activeId: string | null): void {
  const item = queue.find((q) => q.id === activeId) ?? queue[0];
  if (item) {
    useWorkspaceUiStore.getState().openFile(item.path);
    if (diffTooLarge(item.oldValue, item.newValue)) {
      // Large agent writes: skip diff overlay — it freezes WebView2 (black screen).
      useWorkspaceUiStore.getState().clearDiff();
    } else {
      useWorkspaceUiStore.getState().showDiff(item.path, item.oldValue, item.newValue);
    }
  } else {
    useWorkspaceUiStore.getState().clearDiff();
  }
}

export const useEditQueueStore = create<EditQueueState>((set, get) => ({
  queue: [],
  activeId: null,

  push: (edit) => {
    const item: PendingEdit = {
      ...edit,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    set((s) => {
      const queue = [...s.queue, item];
      const activeId = s.activeId ?? item.id;
      return { queue, activeId };
    });
    showNextDiff(get().queue, get().activeId);
  },

  showActiveDiff: () => {
    const { queue, activeId } = get();
    showNextDiff(queue, activeId);
  },

  applyActive: async () => {
    const { queue, activeId } = get();
    const item = queue.find((q) => q.id === activeId);
    if (!item) return;
    useEditorStore.getState().reloadFromDisk(item.path, item.newValue);
    const remaining = queue.filter((q) => q.id !== item.id);
    const nextActive = remaining[0]?.id ?? null;
    set({ queue: remaining, activeId: nextActive });
    showNextDiff(remaining, nextActive);
  },

  rejectActive: async () => {
    const { queue, activeId } = get();
    const item = queue.find((q) => q.id === activeId);
    if (!item) return;
    await writeFile(item.path, item.oldValue);
    useEditorStore.getState().reloadFromDisk(item.path, item.oldValue);
    const remaining = queue.filter((q) => q.id !== item.id);
    const nextActive = remaining[0]?.id ?? null;
    set({ queue: remaining, activeId: nextActive });
    showNextDiff(remaining, nextActive);
  },

  applyAll: async () => {
    const { queue } = get();
    for (const item of queue) {
      useEditorStore.getState().reloadFromDisk(item.path, item.newValue);
    }
    set({ queue: [], activeId: null });
    useWorkspaceUiStore.getState().clearDiff();
  },

  rejectAll: async () => {
    const { queue } = get();
    for (const item of queue) {
      await writeFile(item.path, item.oldValue);
      useEditorStore.getState().reloadFromDisk(item.path, item.oldValue);
    }
    set({ queue: [], activeId: null });
    useWorkspaceUiStore.getState().clearDiff();
  },

  clear: () => {
    set({ queue: [], activeId: null });
    useWorkspaceUiStore.getState().clearDiff();
  },

  pendingCount: () => get().queue.length,
}));
