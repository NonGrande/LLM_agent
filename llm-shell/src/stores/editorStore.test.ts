import { describe, expect, it, vi, beforeEach } from "vitest";
import { useEditorStore } from "@/stores/editorStore";

vi.mock("@/services/tauri/fs", () => ({
  writeFile: vi.fn(async () => undefined),
}));

import { writeFile } from "@/services/tauri/fs";

describe("editorStore", () => {
  beforeEach(() => {
    useEditorStore.setState({ buffers: {} });
    vi.mocked(writeFile).mockClear();
  });

  it("tracks dirty state", () => {
    const store = useEditorStore.getState();
    store.initBuffer("/x/a.ts", "hello");
    expect(store.isDirty("/x/a.ts")).toBe(false);
    store.setDraft("/x/a.ts", "hello world");
    expect(useEditorStore.getState().isDirty("/x/a.ts")).toBe(true);
  });

  it("save clears dirty and calls writeFile", async () => {
    const store = useEditorStore.getState();
    store.initBuffer("/x/a.ts", "a");
    store.setDraft("/x/a.ts", "b");
    const result = await useEditorStore.getState().save("/x/a.ts");
    expect(result.ok).toBe(true);
    expect(writeFile).toHaveBeenCalledWith("/x/a.ts", "b");
    expect(useEditorStore.getState().isDirty("/x/a.ts")).toBe(false);
  });
});
