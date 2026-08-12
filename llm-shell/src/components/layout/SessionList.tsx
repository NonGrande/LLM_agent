import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { sessionProjectId } from "@/services/projects/projectHelpers";

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type MenuState = { x: number; y: number; sessionId: string } | null;

type ConfirmState =
  | { kind: "delete"; sessionId: string; title: string }
  | { kind: "clear"; sessionId: string; title: string }
  | { kind: "clearAll" }
  | null;

export function SessionList() {
  const activeProjectId = useSettingsStore((s) => s.settings.activeProjectId);
  // Select stable `sessions` ref — never call filter inside the zustand selector
  // (React 19 useSyncExternalStore requires cached getSnapshot / referential equality).
  const allSessions = useChatStore((s) => s.sessions);
  const sessions = useMemo(
    () => allSessions.filter((s) => sessionProjectId(s) === activeProjectId),
    [allSessions, activeProjectId],
  );
  const currentId = useChatStore((s) => s.currentSessionId);
  const selectSession = useChatStore((s) => s.selectSession);
  const newSession = useChatStore((s) => s.newSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const clearSessionMessages = useChatStore((s) => s.clearSessionMessages);
  const clearAllSessions = useChatStore((s) => s.clearAllSessions);

  const [menu, setMenu] = useState<MenuState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const openMenu = (e: ReactMouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, sessionId });
  };

  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === "delete") deleteSession(confirm.sessionId);
    else if (confirm.kind === "clear") clearSessionMessages(confirm.sessionId);
    else clearAllSessions(activeProjectId);
    setConfirm(null);
  };

  const confirmCopy =
    confirm?.kind === "delete"
      ? {
          title: "Удалить беседу",
          description: `Беседа «${confirm.title}» будет удалена безвозвратно.`,
        }
      : confirm?.kind === "clear"
        ? {
            title: "Очистить историю",
            description: `Сообщения в «${confirm.title}» будут удалены. Сама беседа останется.`,
          }
        : confirm?.kind === "clearAll"
          ? {
              title: "Очистить все беседы",
              description: "Все беседы и их сообщения будут удалены. Создастся пустая беседа.",
            }
          : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="ui-section-header">
        <span className="ui-section-label">Chats</span>
        <button type="button" onClick={() => newSession(activeProjectId)} className="ui-chrome-btn px-1.5">
          + New
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-0.5">
        {sessions.length === 0 && (
          <p className="px-2.5 py-2 text-[11px] text-text-muted">No sessions yet.</p>
        )}
        {sessions.map((s) => {
          const active = s.id === currentId;
          const title = s.title || "New chat";
          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => selectSession(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectSession(s.id);
                }
              }}
              onContextMenu={(e) => openMenu(e, s.id)}
              className={`group relative flex w-full min-w-0 cursor-pointer items-center gap-1 py-1 pl-2.5 pr-1 text-left text-[12px] ${
                active
                  ? "bg-bg-tertiary/80 text-text-primary"
                  : "text-text-secondary hover:bg-bg-tertiary/50 hover:text-text-primary"
              }`}
              title={`${title} — ПКМ: меню`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0.5 left-0 top-0.5 w-0.5 rounded-r bg-accent-blue"
                />
              )}
              <span className="min-w-0 flex-1 truncate leading-snug">{title}</span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-text-muted opacity-60 group-hover:opacity-0">
                {formatTime(s.updatedAt)}
              </span>
              <button
                type="button"
                aria-label="Удалить беседу"
                title="Удалить беседу"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirm({ kind: "delete", sessionId: s.id, title });
                }}
                className="ui-icon-close shrink-0"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-[70] min-w-[180px] overflow-hidden rounded border border-border-default bg-bg-secondary py-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-[12px] text-text-primary hover:bg-bg-tertiary"
            onClick={() => {
              const session = sessions.find((x) => x.id === menu.sessionId);
              setMenu(null);
              setConfirm({
                kind: "delete",
                sessionId: menu.sessionId,
                title: session?.title || "New chat",
              });
            }}
          >
            Удалить беседу
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-[12px] text-text-primary hover:bg-bg-tertiary"
            onClick={() => {
              const session = sessions.find((x) => x.id === menu.sessionId);
              setMenu(null);
              setConfirm({
                kind: "clear",
                sessionId: menu.sessionId,
                title: session?.title || "New chat",
              });
            }}
          >
            Очистить историю
          </button>
          <div className="my-1 border-t border-border-default" />
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-[12px] text-accent-red hover:bg-bg-tertiary"
            onClick={() => {
              setMenu(null);
              setConfirm({ kind: "clearAll" });
            }}
          >
            Очистить все беседы
          </button>
        </div>
      )}

      {confirm && confirmCopy && (
        <ConfirmDialog
          title={confirmCopy.title}
          description={confirmCopy.description}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
