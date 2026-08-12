import { open } from "@tauri-apps/plugin-dialog";
import { useSettingsStore } from "@/stores/settingsStore";
import { useChatStore } from "@/stores/chatStore";
import { activateProject, openProjectFolder, removeProjectFromList } from "@/services/projects/projectActions";
import { useIndexStore } from "@/stores/indexStore";
import { isTauri } from "@/utils/env";
import { useState, useRef, useEffect } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

type ProjectMenu = { x: number; y: number; projectId: string } | null;

export function ProjectList() {
  const projects = useSettingsStore((s) => s.settings.projects ?? []);
  const profiles = useSettingsStore((s) => s.settings.apiProfiles ?? []);
  const activeId = useSettingsStore((s) => s.settings.activeProjectId);
  const setProjectProfile = useSettingsStore((s) => s.setProjectProfile);
  const reindexProject = useIndexStore((s) => s.reindexProject);
  const indexing = useIndexStore((s) => s.indexing);
  const chunkCount = useIndexStore((s) => s.chunkCount);
  const activeProject = projects.find((p) => p.id === activeId);

  const [menu, setMenu] = useState<ProjectMenu>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menu]);

  const pickFolder = async () => {
    if (!isTauri()) return;
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      await openProjectFolder(selected);
    }
  };

  const onNewChat = () => {
    const pid = activeId || projects[0]?.id;
    if (pid) useChatStore.getState().newSession(pid);
  };

  return (
    <div className="shrink-0 border-b border-border-muted px-2 py-2">
      <div className="ui-section-header mb-1">
        <span className="ui-section-label">Площадки</span>
        <div className="flex gap-1">
          <button type="button" className="ui-chrome-btn px-1.5" onClick={() => void pickFolder()}>
            Open…
          </button>
          <button type="button" className="ui-chrome-btn px-1.5" onClick={onNewChat}>
            + Chat
          </button>
        </div>
      </div>

      <ul className="max-h-28 space-y-0.5 overflow-y-auto overscroll-contain">
        {projects.length === 0 && (
          <li className="px-1 py-1 text-[11px] text-text-muted">Откройте папку проекта</li>
        )}
        {projects.map((p) => {
          const active = p.id === activeId;
          return (
            <li key={p.id}>
              <button
                type="button"
                title={p.path || p.name}
                className={`group flex w-full min-w-0 items-center gap-1 rounded px-1.5 py-1 text-left text-[12px] ${
                  active
                    ? "border-l-2 border-accent-blue bg-bg-tertiary text-text-primary"
                    : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                }`}
                onClick={() => void activateProject(p.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, projectId: p.id });
                }}
              >
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {projects.length > 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="ui-icon-close shrink-0 opacity-40 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmRemove(p.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        setConfirmRemove(p.id);
                      }
                    }}
                    aria-label="Убрать из списка"
                  >
                    ×
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {activeProject?.path && (
        <p className="mt-1 truncate px-1 text-[10px] text-text-muted" title={activeProject.path}>
          {activeProject.path.replace(/\\/g, "/").split("/").slice(-2).join("/")}
        </p>
      )}

      {activeProject && profiles.length > 0 && (
        <label className="mt-1.5 block px-1">
          <span className="text-[10px] text-text-muted">API профиль</span>
          <select
            className="mt-0.5 w-full rounded border border-border-default bg-bg-primary px-1.5 py-0.5 text-[11px] text-text-primary"
            value={activeProject.activeProfileId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setProjectProfile(activeProject.id, v || undefined);
            }}
            title="Профиль API для этой площадки"
          >
            <option value="">По умолчанию (глобальный)</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {activeProject?.path && (
        <div className="mt-1 flex items-center gap-1 px-1">
          <button
            type="button"
            className="ui-chrome-btn flex-1 px-1.5 py-0.5 text-[10px]"
            disabled={indexing}
            onClick={() => void reindexProject(activeProject.id, activeProject.path)}
            title="Rebuild @codebase index"
          >
            {indexing ? "Indexing…" : "Reindex @codebase"}
          </button>
          {chunkCount > 0 && (
            <span className="text-[10px] text-text-muted" title="Indexed chunks">
              {chunkCount}
            </span>
          )}
        </div>
      )}

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] rounded border border-border-default bg-bg-primary py-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-[12px] hover:bg-bg-tertiary"
            onClick={() => {
              setConfirmRemove(menu.projectId);
              setMenu(null);
            }}
          >
            Убрать из списка
          </button>
        </div>
      )}

      {confirmRemove != null && (
        <ConfirmDialog
          title="Убрать площадку"
          description="Папка на диске не удаляется. Чаты этой площадки останутся в истории."
          onConfirm={() => {
            if (confirmRemove) void removeProjectFromList(confirmRemove);
            setConfirmRemove(null);
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}
