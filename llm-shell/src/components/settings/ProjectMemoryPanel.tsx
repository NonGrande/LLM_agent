import { useCallback, useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  readAgentsMd,
  writeAgentsMd,
  listCursorRuleFiles,
  readRuleFile,
  writeRuleFile,
  type CursorRuleFile,
} from "@/services/rules/projectRules";
import {
  listWorkspaceSuccessEntries,
  deleteSuccessMemoryEntry,
  updateSuccessMemoryEntry,
  type SuccessMemoryEntry,
} from "@/services/memory/successMemory";
import { isTauri } from "@/utils/env";

type Tab = "agents" | "rules" | "rag";

function workspacePath(settings: ReturnType<typeof useSettingsStore.getState>["settings"]): string {
  return settings.agent.workingDirectory || settings.workspace.path || "";
}

export function ProjectMemoryPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const ws = workspacePath(settings);
  const [tab, setTab] = useState<Tab>("agents");
  const [agentsText, setAgentsText] = useState("");
  const [agentsDirty, setAgentsDirty] = useState(false);
  const [ruleFiles, setRuleFiles] = useState<CursorRuleFile[]>([]);
  const [selectedRule, setSelectedRule] = useState<string>("");
  const [ruleText, setRuleText] = useState("");
  const [ruleDirty, setRuleDirty] = useState(false);
  const [ragEntries, setRagEntries] = useState<SuccessMemoryEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshAgents = useCallback(async () => {
    if (!ws) return;
    setAgentsText(await readAgentsMd(ws));
    setAgentsDirty(false);
  }, [ws]);

  const refreshRules = useCallback(async () => {
    if (!ws) return;
    const files = await listCursorRuleFiles(ws);
    setRuleFiles(files);
    if (files.length && !selectedRule) {
      setSelectedRule(files[0].path);
    }
  }, [ws]);

  const refreshRag = useCallback(async () => {
    if (!ws) return;
    setRagEntries(await listWorkspaceSuccessEntries(ws));
  }, [ws]);

  useEffect(() => {
    if (!ws || !isTauri()) return;
    setLoading(true);
    void Promise.all([refreshAgents(), refreshRules(), refreshRag()]).finally(() =>
      setLoading(false),
    );
  }, [ws, refreshAgents, refreshRules, refreshRag]);

  useEffect(() => {
    if (!selectedRule) {
      setRuleText("");
      setRuleDirty(false);
      return;
    }
    void readRuleFile(selectedRule).then((t) => {
      setRuleText(t);
      setRuleDirty(false);
    });
  }, [selectedRule]);

  if (!isTauri()) {
    return (
      <p className="text-[12px] text-text-secondary">
        Редактор правил доступен только в desktop-сборке (Tauri).
      </p>
    );
  }

  if (!ws) {
    return (
      <p className="text-[12px] text-text-secondary">
        Укажите workspace (папку проекта) в Agent → Working directory или откройте папку в IDE.
      </p>
    );
  }

  const saveAgents = async () => {
    try {
      await writeAgentsMd(ws, agentsText);
      setAgentsDirty(false);
      setStatus("AGENTS.md сохранён");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  };

  const saveRule = async () => {
    if (!selectedRule) return;
    try {
      await writeRuleFile(selectedRule, ruleText);
      setRuleDirty(false);
      setStatus(`${selectedRule.split(/[/\\]/).pop()} сохранён`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "agents", label: "AGENTS.md" },
    { id: "rules", label: ".cursor/rules" },
    { id: "rag", label: "Success RAG" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono text-text-muted truncate" title={ws}>
        {ws}
      </p>
      <div className="flex gap-1 border-b border-border-muted pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded px-2 py-0.5 text-[11px] ${
              tab === t.id ? "bg-bg-tertiary text-text-primary" : "text-text-muted hover:text-text-secondary"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-[11px] text-text-muted">Загрузка…</p>}

      {tab === "agents" && (
        <div className="space-y-2">
          <textarea
            className="h-64 w-full resize-y rounded border border-border-default bg-bg-primary p-2 font-mono text-[11px] leading-relaxed"
            value={agentsText}
            onChange={(e) => {
              setAgentsText(e.target.value);
              setAgentsDirty(true);
            }}
            spellCheck={false}
            placeholder="# AGENTS — правила проекта для агента"
          />
          <div className="flex gap-2">
            <button type="button" className="ui-chrome-btn text-[11px]" onClick={() => void refreshAgents()}>
              Перезагрузить
            </button>
            <button
              type="button"
              className="ui-chrome-btn text-[11px] disabled:opacity-40"
              disabled={!agentsDirty}
              onClick={() => void saveAgents()}
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {tab === "rules" && (
        <div className="flex gap-2">
          <div className="w-36 shrink-0 space-y-0.5 overflow-y-auto max-h-64">
            {ruleFiles.length === 0 && (
              <p className="text-[11px] text-text-muted px-1">Нет файлов в .cursor/rules</p>
            )}
            {ruleFiles.map((f) => (
              <button
                key={f.path}
                type="button"
                className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-mono ${
                  selectedRule === f.path ? "bg-bg-tertiary" : "hover:bg-bg-secondary"
                }`}
                title={f.path}
                onClick={() => setSelectedRule(f.path)}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <textarea
              className="h-56 w-full resize-y rounded border border-border-default bg-bg-primary p-2 font-mono text-[11px]"
              value={ruleText}
              disabled={!selectedRule}
              onChange={(e) => {
                setRuleText(e.target.value);
                setRuleDirty(true);
              }}
              spellCheck={false}
            />
            <button
              type="button"
              className="ui-chrome-btn text-[11px] disabled:opacity-40"
              disabled={!selectedRule || !ruleDirty}
              onClick={() => void saveRule()}
            >
              Сохранить файл
            </button>
          </div>
        </div>
      )}

      {tab === "rag" && (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {ragEntries.length === 0 && (
            <p className="text-[11px] text-text-muted">Нет записей. Используйте 👍 или «В RAG» в чате.</p>
          )}
          {ragEntries.map((e) => (
            <RagEntryRow
              key={e.id}
              entry={e}
              onDelete={async () => {
                await deleteSuccessMemoryEntry(e.id);
                await refreshRag();
                setStatus("Запись удалена");
              }}
              onSave={async (userQuery, solutionSummary) => {
                await updateSuccessMemoryEntry(e.id, { userQuery, solutionSummary });
                await refreshRag();
                setStatus("Запись обновлена");
              }}
            />
          ))}
        </div>
      )}

      {status && (
        <p className="text-[11px] text-accent-green" role="status">
          {status}
        </p>
      )}
    </div>
  );
}

function RagEntryRow({
  entry,
  onDelete,
  onSave,
}: {
  entry: SuccessMemoryEntry;
  onDelete: () => void;
  onSave: (q: string, s: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState(entry.userQuery);
  const [s, setS] = useState(entry.solutionSummary);
  const dirty = q !== entry.userQuery || s !== entry.solutionSummary;

  return (
    <div className="rounded border border-border-muted p-2 text-[11px]">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[10px] text-text-muted">
          {new Date(entry.createdAt).toLocaleString()}
          {entry.source === "user_accepted" ? " · 👍" : ""}
        </span>
        <button type="button" className="ui-chrome-btn ml-auto px-1 text-[10px]" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Свернуть" : "Изменить"}
        </button>
        <button
          type="button"
          className="ui-chrome-btn px-1 text-[10px] text-accent-red"
          onClick={() => void onDelete()}
        >
          Удалить
        </button>
      </div>
      <p className="font-medium text-text-primary truncate">{entry.userQuery}</p>
      <p className="text-text-secondary line-clamp-2">{entry.solutionSummary}</p>
      {expanded && (
        <div className="mt-2 space-y-1">
          <input
            className="w-full rounded border border-border-muted bg-bg-secondary px-1.5 py-0.5 text-[11px]"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
          />
          <textarea
            className="h-20 w-full resize-y rounded border border-border-muted bg-bg-secondary p-1.5 text-[11px]"
            value={s}
            onChange={(ev) => setS(ev.target.value)}
          />
          <button
            type="button"
            className="ui-chrome-btn text-[10px] disabled:opacity-40"
            disabled={!dirty}
            onClick={() => onSave(q, s)}
          >
            Сохранить
          </button>
        </div>
      )}
    </div>
  );
}
