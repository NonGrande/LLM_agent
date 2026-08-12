import { useCallback } from "react";
import { ProjectList } from "@/components/layout/ProjectList";
import { SessionList } from "@/components/layout/SessionList";
import { GitBranchSelector } from "@/components/layout/GitBranchSelector";
import { FileTree } from "@/components/workspace/FileTree";
import { ResizeHandle } from "@/components/common/ResizeHandle";
import { useLayoutStore, LAYOUT_MIN } from "@/stores/layoutStore";

export function LeftSidebar() {
  const sessionsHeight = useLayoutStore((s) => s.sessionsHeight);
  const setSessionsHeight = useLayoutStore((s) => s.setSessionsHeight);

  const onSessionsHeight = useCallback(
    (next: number) => {
      setSessionsHeight(next);
    },
    [setSessionsHeight],
  );

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-bg-secondary">
      <ProjectList />
      <GitBranchSelector />

      <div
        className="flex min-h-0 shrink-0 flex-col overflow-hidden"
        style={{ height: sessionsHeight, minHeight: LAYOUT_MIN.sessions }}
      >
        <SessionList />
      </div>

      <ResizeHandle
        orientation="vertical"
        value={sessionsHeight}
        onChange={onSessionsHeight}
        title="Высота списка чатов"
      />

      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        style={{ minHeight: LAYOUT_MIN.files }}
      >
        <FileTree embedded />
      </div>
    </aside>
  );
}
