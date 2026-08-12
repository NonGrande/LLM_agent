import { useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useFileStore } from "@/stores/fileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWorkspaceUiStore } from "@/stores/workspaceUiStore";
import { useContextAttachStore } from "@/stores/contextAttachStore";
import { openProjectFolder } from "@/services/projects/projectActions";
import { isTauri } from "@/utils/env";
import type { DirEntry } from "@/types";

function TreeNode({ entry, depth }: { entry: DirEntry; depth: number }) {
  const expanded = useFileStore((s) => s.expanded);
  const selectedPath = useFileStore((s) => s.selectedPath);
  const toggleDir = useFileStore((s) => s.toggleDir);
  const selectPath = useFileStore((s) => s.selectPath);
  const openFile = useWorkspaceUiStore((s) => s.openFile);
  const contextPaths = useContextAttachStore((s) => s.paths);
  const addContext = useContextAttachStore((s) => s.add);
  const toggleContext = useContextAttachStore((s) => s.toggle);
  const children = expanded[entry.path];
  const isOpen = Boolean(children);
  const selected = selectedPath === entry.path;
  const inContext = !entry.is_dir && contextPaths.includes(entry.path);

  return (
    <div>
      <button
        type="button"
        className={`flex w-full min-w-0 items-center gap-1 px-2 py-0.5 text-left text-[12px] hover:bg-bg-tertiary ${
          selected ? "bg-bg-tertiary text-text-primary" : "text-text-secondary hover:text-text-primary"
        } ${inContext ? "ring-1 ring-inset ring-accent-blue/50" : ""}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={(e) => {
          selectPath(entry.path);
          if (entry.is_dir) {
            void toggleDir(entry.path);
            return;
          }
          openFile(entry.path);
          // Ctrl/Cmd+click = toggle context only; plain click = preview + add to chat context
          if (e.ctrlKey || e.metaKey) {
            toggleContext(entry.path);
          } else {
            addContext(entry.path);
          }
        }}
        title={
          entry.is_dir
            ? entry.path
            : `${entry.path}\nКлик: превью + в контекст чата · Ctrl+клик: только контекст on/off`
        }
      >
        <span className="w-3 shrink-0 text-text-muted" aria-hidden="true">
          {entry.is_dir ? (isOpen ? "▾" : "▸") : inContext ? "●" : "·"}
        </span>
        <span className="min-w-0 truncate">{entry.name}</span>
        {inContext && (
          <span className="ml-auto shrink-0 text-[9px] text-accent-blue" title="В контексте чата">
            @
          </span>
        )}
      </button>
      {isOpen &&
        children?.map((child) => <TreeNode key={child.path} entry={child} depth={depth + 1} />)}
    </div>
  );
}

export function FileTree({ embedded = false }: { embedded?: boolean } = {}) {
  const rootPath = useFileStore((s) => s.rootPath);
  const entries = useFileStore((s) => s.entries);
  const loading = useFileStore((s) => s.loading);
  const error = useFileStore((s) => s.error);
  const setRootPath = useFileStore((s) => s.setRootPath);
  const workspacePath = useSettingsStore((s) => s.settings.workspace.path);
  const ctxCount = useContextAttachStore((s) => s.paths.length);
  const clearContext = useContextAttachStore((s) => s.clear);

  useEffect(() => {
    if (workspacePath && workspacePath !== rootPath) {
      void setRootPath(workspacePath);
    }
  }, [workspacePath, rootPath, setRootPath]);

  const pickFolder = async () => {
    if (!isTauri()) {
      useFileStore.setState({
        error: "Выбор папки доступен в Tauri. Запустите: npm run tauri:dev",
      });
      return;
    }
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      await openProjectFolder(selected);
    }
  };

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${
        embedded ? "bg-transparent" : "border-r border-border-default bg-bg-secondary"
      }`}
    >
      <div className="ui-section-header">
        <span className="ui-section-label">
          Files{ctxCount > 0 ? ` · ctx ${ctxCount}` : ""}
        </span>
        <div className="flex items-center gap-0.5">
          {ctxCount > 0 && (
            <button
              type="button"
              onClick={() => clearContext()}
              className="ui-chrome-btn px-1.5"
              title="Очистить контекст чата"
            >
              Clear @
            </button>
          )}
          <button type="button" onClick={() => void pickFolder()} className="ui-chrome-btn px-1.5">
            Open…
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
        {!rootPath && (
          <p className="px-3 py-4 text-[12px] leading-relaxed text-text-muted">
            Откройте рабочую папку проекта.
          </p>
        )}
        {loading && <p className="px-3 py-2 text-[12px] text-text-muted">Загрузка…</p>}
        {error && <p className="px-3 py-2 text-[12px] text-accent-red">{error}</p>}
        {entries.map((e) => (
          <TreeNode key={e.path} entry={e} depth={0} />
        ))}
      </div>
      {!embedded && rootPath && (
        <div
          className="truncate border-t border-border-default px-2 py-1 text-[10px] text-text-muted"
          title={rootPath}
        >
          {rootPath}
        </div>
      )}
    </div>
  );
}
