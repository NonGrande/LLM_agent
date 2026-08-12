import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { MAX_DIFF_RENDER_CHARS, diffTooLarge } from "@/utils/diffLimits";

interface Props {
  oldValue: string;
  newValue: string;
  splitView?: boolean;
  onApply?: () => void;
  onReject?: () => void;
  onApplyAll?: () => void;
  onRejectAll?: () => void;
  title?: string;
}

export function DiffViewer({
  oldValue,
  newValue,
  splitView = true,
  onApply,
  onReject,
  onApplyAll,
  onRejectAll,
  title,
}: Props) {
  const tooLarge = diffTooLarge(oldValue, newValue);

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <div className="flex items-center gap-2 border-b border-border-default bg-bg-secondary px-3 py-1.5">
        <span className="min-w-0 truncate text-[12px] font-medium text-text-primary" title={title}>
          {title ?? "Diff"}
        </span>
        <div className="ml-auto flex shrink-0 gap-1.5">
          {onRejectAll && (
            <button type="button" className="ui-chrome-btn bg-bg-tertiary px-2 py-1 text-[10px]" onClick={onRejectAll}>
              Reject all
            </button>
          )}
          {onReject && (
            <button type="button" className="ui-chrome-btn bg-bg-tertiary px-2 py-1" onClick={onReject}>
              Reject
            </button>
          )}
          {onApply && (
            <button
              type="button"
              className="rounded bg-accent-green px-2 py-1 text-[11px] text-white hover:brightness-110"
              onClick={onApply}
            >
              Apply
            </button>
          )}
          {onApplyAll && (
            <button
              type="button"
              className="rounded bg-accent-green/80 px-2 py-1 text-[10px] text-white hover:brightness-110"
              onClick={onApplyAll}
            >
              Apply all
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain text-[12px]">
        {tooLarge ? (
          <div className="p-4 text-[12px] text-text-secondary">
            <p className="mb-2 text-text-primary">Diff too large to render safely ({MAX_DIFF_RENDER_CHARS / 1000}K char limit).</p>
            <p>File was already written by the agent. Use the editor tab or Explorer to review. Apply/Reject above still works.</p>
          </div>
        ) : (
          <ReactDiffViewer
            oldValue={oldValue}
            newValue={newValue}
            splitView={splitView}
            compareMethod={DiffMethod.WORDS}
            useDarkTheme
            styles={{
              variables: {
                dark: {
                  diffViewerBackground: "#0d1117",
                  addedBackground: "#12261e",
                  removedBackground: "#2d1214",
                },
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
