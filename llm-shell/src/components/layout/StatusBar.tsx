import { useSettingsStore } from "@/stores/settingsStore";
import { useAgentStore } from "@/stores/agentStore";
import { useFileStore } from "@/stores/fileStore";
import { useGitStore } from "@/stores/gitStore";
import { useIndexStore } from "@/stores/indexStore";
import { APP_VERSION } from "@/utils/constants";
import { isTauri } from "@/utils/env";
import { formatQuotaShort } from "@/services/llm/modelCatalog";

export function StatusBar() {
  const provider = useSettingsStore((s) => s.settings.provider);
  const status = useAgentStore((s) => s.status);
  const tokens = useAgentStore((s) => s.contextTokens);
  const activeModel = useAgentStore((s) => s.activeModel);
  const rootPath = useFileStore((s) => s.rootPath);
  const gitBranch = useGitStore((s) => s.currentBranch);
  const isRepo = useGitStore((s) => s.isRepo);
  const dirty = useGitStore((s) => s.dirty);
  const indexing = useIndexStore((s) => s.indexing);
  const indexProgress = useIndexStore((s) => s.progress);
  const indexChunks = useIndexStore((s) => s.chunkCount);
  const agentMode = useSettingsStore((s) => s.settings.agent.mode ?? "agent");
  const shownModel = activeModel || provider.model;
  const quota = (provider.modelQuotas ?? []).find((q) => q.id === shownModel);
  const quotaLabel = formatQuotaShort(quota);

  const sep = (
    <span className="select-none text-border-default" aria-hidden="true">
      ·
    </span>
  );

  return (
    <footer className="flex h-6 shrink-0 items-center gap-2 overflow-hidden border-t border-border-default bg-bg-secondary px-2.5 font-mono text-[10px] tabular-nums text-text-secondary">
      <span className="min-w-0 shrink-0 truncate text-text-primary" title={isRepo ? "Git branch" : "No git repo"}>
        {isRepo && gitBranch ? (
          <>
            <span className="text-text-muted">⎇ </span>
            <span translate="no">{gitBranch}</span>
            {dirty ? <span className="text-accent-yellow">*</span> : null}
          </>
        ) : (
          <span className="text-text-muted">no git</span>
        )}
      </span>
      {sep}
      <span className="min-w-0 shrink truncate" title={provider.name}>
        <span className="text-text-muted">provider </span>
        <span className="text-text-primary" translate="no">
          {provider.name}
        </span>
      </span>
      {sep}
      <span className="min-w-0 truncate" title={(provider.fallbackModels ?? []).join(" → ")}>
        <span className="text-text-muted">model </span>
        <span className="text-text-primary" translate="no">
          {shownModel}
        </span>
        {activeModel && activeModel !== provider.model && (
          <span className="ml-1 text-accent-yellow">failover</span>
        )}
      </span>
      {quotaLabel && (
        <>
          {sep}
          <span className="shrink-0 text-text-muted" title={quota?.notes}>
            {quotaLabel}
          </span>
        </>
      )}
      {sep}
      <span className="shrink-0" title="Agent mode">
        <span className="text-text-muted">mode </span>
        <span className="text-text-primary">{agentMode}</span>
      </span>
      {sep}
      <span className="shrink-0" title="Codebase index">
        {indexing ? (
          <span className="text-accent-blue">index {indexProgress}%</span>
        ) : indexChunks > 0 ? (
          <span className="text-text-muted">idx {indexChunks}</span>
        ) : (
          <span className="text-text-muted">no idx</span>
        )}
      </span>
      {sep}
      <span className="shrink-0">
        <span className="text-text-muted">agent </span>
        <span className="text-text-primary">{status}</span>
      </span>
      {sep}
      <span className="shrink-0">
        <span className="text-text-muted">tok </span>
        <span className="text-text-primary">{(tokens / 1000).toFixed(1)}K</span>
      </span>
      <span className="ml-auto min-w-0 truncate text-text-muted" title={rootPath}>
        {rootPath || "no workspace"} · {isTauri() ? "tauri" : "browser"} · v{APP_VERSION}
      </span>
    </footer>
  );
}
