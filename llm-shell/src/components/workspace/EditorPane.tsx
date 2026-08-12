import { FileTabs } from "@/components/workspace/FileTabs";
import { CodeViewer } from "@/components/workspace/CodeViewer";
import { DiffViewer } from "@/components/workspace/DiffViewer";
import { BottomPanel } from "@/components/ide/BottomPanel";
import { useWorkspaceUiStore } from "@/stores/workspaceUiStore";
import { useEditorStore } from "@/stores/editorStore";
import { useEditQueueStore } from "@/stores/editQueueStore";

export function EditorPane() {
  const openFiles = useWorkspaceUiStore((s) => s.openFiles);
  const activePath = useWorkspaceUiStore((s) => s.activePath);
  const diff = useWorkspaceUiStore((s) => s.diff);
  const setActive = useWorkspaceUiStore((s) => s.setActive);
  const closeFileRaw = useWorkspaceUiStore((s) => s.closeFile);
  const pendingCount = useEditQueueStore((s) => s.queue.length);
  const applyActive = useEditQueueStore((s) => s.applyActive);
  const rejectActive = useEditQueueStore((s) => s.rejectActive);
  const applyAll = useEditQueueStore((s) => s.applyAll);
  const rejectAll = useEditQueueStore((s) => s.rejectAll);

  const closeFile = (path: string) => {
    const editor = useEditorStore.getState();
    if (editor.isDirty(path)) {
      const ok = window.confirm("Есть несохранённые изменения. Закрыть вкладку?");
      if (!ok) return;
    }
    editor.removeBuffer(path);
    closeFileRaw(path);
  };

  const hasContent = Boolean(diff || activePath || openFiles.length > 0);

  if (!hasContent) {
    return (
      <aside className="flex h-full flex-col items-center justify-center bg-bg-secondary px-6 text-center">
        <p className="ui-section-label mb-2">Preview</p>
        <p className="max-w-[220px] text-[12px] leading-relaxed text-text-muted text-pretty">
          Open a file from the explorer to preview code or markdown here.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-w-0 flex-col bg-bg-primary">
      <FileTabs tabs={openFiles} activePath={activePath} onSelect={setActive} onClose={closeFile} />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {diff ? (
          <DiffViewer
            title={
              pendingCount > 1
                ? `${diff.path} (${pendingCount} pending)`
                : diff.path
            }
            oldValue={diff.oldValue}
            newValue={diff.newValue}
            onReject={() => void rejectActive()}
            onApply={() => void applyActive()}
            onApplyAll={pendingCount > 1 ? () => void applyAll() : undefined}
            onRejectAll={pendingCount > 1 ? () => void rejectAll() : undefined}
          />
        ) : activePath ? (
          <CodeViewer path={activePath} />
        ) : (
          <div className="p-4 text-[12px] text-text-muted">Select a tab to preview.</div>
        )}
      </div>
      <BottomPanel />
    </aside>
  );
}
