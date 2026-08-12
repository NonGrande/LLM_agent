import { useWorkspaceUiStore } from "@/stores/workspaceUiStore";

/** Open file tab and scroll editor to line/column. */
export function revealInEditor(path: string, line: number, column = 1) {
  useWorkspaceUiStore.getState().openFile(path);
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("llm-shell:reveal-line", {
        detail: { path, line, column },
      }),
    );
  }, 200);
}
