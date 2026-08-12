import { ProblemsPanel } from "@/components/ide/ProblemsPanel";
import { OutlinePanel } from "@/components/ide/OutlinePanel";
import { ResizeHandle } from "@/components/common/ResizeHandle";
import { useIdeStore, type BottomPanelTab } from "@/stores/ideStore";
import { useDiagnosticsStore } from "@/stores/diagnosticsStore";
import { useLayoutStore, LAYOUT_MIN } from "@/stores/layoutStore";

const TABS: { id: BottomPanelTab; label: string }[] = [
  { id: "problems", label: "Problems" },
  { id: "outline", label: "Outline" },
];

export function BottomPanel() {
  const open = useIdeStore((s) => s.bottomPanelOpen);
  const tab = useIdeStore((s) => s.bottomPanelTab);
  const setTab = useIdeStore((s) => s.setBottomPanelTab);
  const toggle = useIdeStore((s) => s.toggleBottomPanel);
  const height = useLayoutStore((s) => s.bottomPanelHeight);
  const setHeight = useLayoutStore((s) => s.setBottomPanelHeight);
  const counts = useDiagnosticsStore((s) => s.count());

  if (!open) return null;

  return (
    <>
      <ResizeHandle
        orientation="vertical"
        value={height}
        onChange={setHeight}
        reverse
        title="Высота панели Problems/Outline"
      />
      <div
        className="flex min-h-0 shrink-0 flex-col overflow-hidden border-t border-border-default bg-bg-secondary"
        style={{ height, minHeight: LAYOUT_MIN.bottomPanel }}
      >
        <div className="flex shrink-0 items-center gap-1 border-b border-border-muted px-2 py-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded px-2 py-0.5 text-[11px] ${
                tab === t.id
                  ? "bg-bg-tertiary text-text-primary"
                  : "text-text-secondary hover:bg-bg-tertiary/60"
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "problems" && counts.errors + counts.warnings > 0 && (
                <span className="ml-1 text-accent-yellow">
                  {counts.errors + counts.warnings}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            className="ui-icon-close ml-auto"
            aria-label="Close panel"
            onClick={() => toggle()}
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "problems" ? <ProblemsPanel /> : <OutlinePanel />}
        </div>
      </div>
    </>
  );
}
