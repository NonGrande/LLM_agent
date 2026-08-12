import { create } from "zustand";
import { writeFile } from "@/services/tauri/fs";
import { errorMessage } from "@/utils/errors";

interface Buffer {
  saved: string;
  draft: string;
}

interface EditorState {
  buffers: Record<string, Buffer>;
  initBuffer: (path: string, content: string) => void;
  setDraft: (path: string, content: string) => void;
  isDirty: (path: string) => boolean;
  getDraft: (path: string) => string | undefined;
  save: (path: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  reloadFromDisk: (path: string, content: string) => void;
  removeBuffer: (path: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  buffers: {},

  initBuffer: (path, content) => {
    const existing = get().buffers[path];
    if (existing) return;
    set((s) => ({
      buffers: { ...s.buffers, [path]: { saved: content, draft: content } },
    }));
  },

  setDraft: (path, content) => {
    set((s) => {
      const buf = s.buffers[path];
      if (!buf) {
        return { buffers: { ...s.buffers, [path]: { saved: content, draft: content } } };
      }
      return { buffers: { ...s.buffers, [path]: { ...buf, draft: content } } };
    });
  },

  isDirty: (path) => {
    const buf = get().buffers[path];
    return buf ? buf.saved !== buf.draft : false;
  },

  getDraft: (path) => get().buffers[path]?.draft,

  save: async (path) => {
    const buf = get().buffers[path];
    if (!buf) return { ok: false, error: "No editor buffer" };
    try {
      await writeFile(path, buf.draft);
      set((s) => ({
        buffers: {
          ...s.buffers,
          [path]: { saved: buf.draft, draft: buf.draft },
        },
      }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },

  reloadFromDisk: (path, content) => {
    const buf = get().buffers[path];
    if (buf && buf.saved !== buf.draft) return;
    set((s) => ({
      buffers: { ...s.buffers, [path]: { saved: content, draft: content } },
    }));
  },

  removeBuffer: (path) => {
    set((s) => {
      const next = { ...s.buffers };
      delete next[path];
      return { buffers: next };
    });
  },
}));
