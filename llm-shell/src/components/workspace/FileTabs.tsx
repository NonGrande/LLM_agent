import { useEditorStore } from "@/stores/editorStore";

interface Tab {
  path: string;
  title: string;
}

interface Props {
  tabs: Tab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

function TabDirtyDot({ path }: { path: string }) {
  const dirty = useEditorStore((s) => s.isDirty(path));
  if (!dirty) return null;
  return <span className="shrink-0 text-accent-blue" aria-label="unsaved">•</span>;
}

export function FileTabs({ tabs, activePath, onSelect, onClose }: Props) {
  if (tabs.length === 0) return null;
  return (
    <div className="flex h-8 shrink-0 items-center gap-0.5 overflow-x-auto overscroll-contain border-b border-border-default bg-bg-secondary px-1">
      {tabs.map((t) => {
        const active = t.path === activePath;
        return (
          <div
            key={t.path}
            className={`group flex max-w-[180px] min-w-0 items-center gap-0.5 border-b-2 px-2 py-1 text-[11px] ${
              active
                ? "border-accent-blue bg-bg-primary text-text-primary"
                : "border-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            }`}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-0.5 truncate text-left"
              onClick={() => onSelect(t.path)}
              title={t.path}
            >
              <TabDirtyDot path={t.path} />
              <span className="min-w-0 truncate">{t.title}</span>
            </button>
            <button
              type="button"
              aria-label={`Закрыть ${t.title}`}
              title="Закрыть"
              className="ui-icon-close shrink-0"
              onClick={() => onClose(t.path)}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
