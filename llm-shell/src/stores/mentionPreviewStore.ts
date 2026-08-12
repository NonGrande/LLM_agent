import { create } from "zustand";

export type MentionPreviewKind = "docs" | "web";

export interface DocsPreviewAttachment {
  id: string;
  kind: "docs";
  path: string;
  label: string;
  snippet: string;
  content: string;
}

export interface WebPreviewAttachment {
  id: string;
  kind: "web";
  url: string;
  title: string;
  snippet: string;
  content: string;
  error?: string;
}

export type MentionPreviewAttachment = DocsPreviewAttachment | WebPreviewAttachment;

interface MentionPreviewState {
  items: MentionPreviewAttachment[];
  addDocs: (item: Omit<DocsPreviewAttachment, "id" | "kind">) => void;
  addWeb: (item: Omit<WebPreviewAttachment, "id" | "kind">) => void;
  remove: (id: string) => void;
  clear: () => void;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useMentionPreviewStore = create<MentionPreviewState>((set, get) => ({
  items: [],
  addDocs: (item) => {
    const path = item.path.trim();
    if (!path) return;
    const prev = get().items.filter((x) => !(x.kind === "docs" && x.path === path));
    set({
      items: [
        ...prev,
        {
          id: uid("docs"),
          kind: "docs",
          path,
          label: item.label || path.replace(/^.*[/\\]/, "") || path,
          snippet: item.snippet,
          content: item.content,
        },
      ],
    });
  },
  addWeb: (item) => {
    const url = item.url.trim();
    if (!url) return;
    const prev = get().items.filter((x) => !(x.kind === "web" && x.url === url));
    set({
      items: [
        ...prev,
        {
          id: uid("web"),
          kind: "web",
          url,
          title: item.title || url,
          snippet: item.snippet,
          content: item.content,
          error: item.error,
        },
      ],
    });
  },
  remove: (id) => set({ items: get().items.filter((x) => x.id !== id) }),
  clear: () => set({ items: [] }),
}));
