import { useState } from "react";
import { useGitStore } from "@/stores/gitStore";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

export function GitBranchSelector() {
  const isRepo = useGitStore((s) => s.isRepo);
  const currentBranch = useGitStore((s) => s.currentBranch);
  const branches = useGitStore((s) => s.branches);
  const dirty = useGitStore((s) => s.dirty);
  const loading = useGitStore((s) => s.loading);
  const switchBranch = useGitStore((s) => s.switchBranch);
  const [pendingBranch, setPendingBranch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isRepo) {
    return (
      <div className="border-b border-border-muted px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="ui-section-label shrink-0">Git</span>
          <span className="text-[11px] text-text-muted" title="Not a git repository">
            no repo
          </span>
        </div>
      </div>
    );
  }

  const onChange = async (branch: string) => {
    if (!branch || branch === currentBranch) return;
    setError(null);
    const result = await switchBranch(branch, false);
    if (!result.ok && result.message === "dirty") {
      setPendingBranch(branch);
      return;
    }
    if (!result.ok) setError(result.message);
  };

  const confirmDirty = async () => {
    if (!pendingBranch) return;
    const branch = pendingBranch;
    setPendingBranch(null);
    const result = await switchBranch(branch, true);
    if (!result.ok) setError(result.message);
  };

  return (
    <div className="border-b border-border-muted px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="ui-section-label shrink-0">Git</span>
        <select
          aria-label="Git branch"
          className="min-w-0 flex-1 truncate rounded border border-border-muted bg-bg-tertiary px-1.5 py-0.5 text-[11px] text-text-primary focus-visible:border-accent-blue"
          value={currentBranch ?? ""}
          disabled={loading}
          onChange={(e) => void onChange(e.target.value)}
          title={dirty ? `${currentBranch} (uncommitted changes)` : (currentBranch ?? "")}
        >
          {currentBranch && !branches.includes(currentBranch) && (
            <option value={currentBranch}>{currentBranch}</option>
          )}
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
              {b === currentBranch && dirty ? " *" : ""}
            </option>
          ))}
        </select>
        {dirty && (
          <span className="shrink-0 text-[10px] text-accent-yellow" title="Uncommitted changes">
            ●
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 truncate text-[10px] text-accent-red" title={error}>
          {error}
        </p>
      )}
      {pendingBranch && (
        <ConfirmDialog
          title="Uncommitted changes"
          description={`Working tree has local changes. Switch to «${pendingBranch}» anyway? (git checkout may fail or carry changes).`}
          onConfirm={() => void confirmDirty()}
          onCancel={() => setPendingBranch(null)}
        />
      )}
    </div>
  );
}
