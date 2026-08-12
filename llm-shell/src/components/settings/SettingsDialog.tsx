import { useSettingsStore } from "@/stores/settingsStore";
import { useApiHealthStore } from "@/stores/apiHealthStore";
import type { ProviderCategory, ProviderType } from "@/types";
import {
  PROVIDER_TYPE_ORDER,
  PROVIDER_CATEGORY_META,
  PROVIDER_CATEGORY_ORDER,
  getProviderPreset,
  providersInCategory,
  profileLabelMismatch,
  profileModelFamilyMismatch,
  yandexModelUriError,
  YANDEX_MODEL_URI_HINT,
} from "@/types";
import { isProfileReadyForChat } from "@/services/llm/profileReady";
import { createClientFromSettings } from "@/services/llm/LLMClient";
import { formatQuotaShort } from "@/services/llm/modelCatalog";
import { toneDot } from "@/services/llm/probeApiHealth";
import { FieldLabel, Tooltip } from "@/components/common/Tooltip";
import { useMemo, useState, type ReactNode } from "react";
import { useMcpStore } from "@/stores/mcpStore";
import { MCP_PRESETS } from "@/services/mcp/McpClient";
import type { McpServerConfig } from "@/types";
import { SETTINGS_MODULE_META, type SettingsModule } from "@/components/settings/settingsModules";
import { ProjectMemoryPanel } from "@/components/settings/ProjectMemoryPanel";
import {
  buildSettingsExport,
  checkForAppUpdates,
  installSignedUpdate,
  parseSettingsImport,
} from "@/services/settings/settingsTransfer";
import { APP_VERSION } from "@/utils/constants";

const TIP_PROFILES =
  "Сохранённые подключения. В чате модели только активного профиля. Слоты без ключа скрыты.";

const TIP_RU_BYPASS =
  "Лучший вариант — системный VPN (TUN). Вкладка «Прокси» — HTTP/SOCKS5 для LLM через Rust. Без VPN: Ollama / LM Studio. OpenAI/Anthropic/Google из РФ часто красные без proxy.";

const TIP_BASE_URL =
  "Корень OpenAI-совместимого API, обычно …/v1. Для Ollama: http://localhost:11434/v1.";

const TIP_API_KEY =
  "Секрет провайдера. Для Ollama / LM Studio / vLLM обычно можно оставить пустым.";

const TIP_FALLBACKS =
  "По одной model id на строку. При ошибке лимита/модели агент переключится на следующую (если включён Auto-failover).";

const TIP_FAILOVER =
  "При 429, OOM, context overflow или «model not found» переключает primary → fallback-модели внутри активного профиля.";

const TIP_PROXY_URL =
  "Примеры: socks5://127.0.0.1:1080 · http://127.0.0.1:7890 · socks5://user:pass@host:1080 (Hiddify / Clash / v2rayN).";

const TIP_FORCE_RUST =
  "В Tauri весь LLM HTTP идёт через Rust reqwest — без CORS браузера. Рекомендуется оставить включённым.";

const TIP_PROXY_ENABLED =
  "Весь LLM-трафик (чат, /models, автотест) через указанный proxy URL.";

const TIP_OFFLINE =
  "Онлайн-агент: OpenRouter / xAI. Offline mode принудительно держит Ollama (7B) и не уходит в облако.";

const TIP_ROLE =
  "Роль подмешивается в system prompt: default (Composer), reviewer или refactor.";

const TIP_PROFILE_FAILOVER =
  "После исчерпания цепочки моделей профиля пробует следующий API-профиль (по умолчанию OpenRouter → xAI → Ollama).";

const TIP_PROXY_HOW =
  "1) Запустите клиент с Mixed/SOCKS портом. 2) Вставьте адрес сюда и включите proxy. 3) «Тест API» в шапке — OpenAI/Grok должны стать зелёными.";

function SectionTitle({
  children,
  tip,
}: {
  children: ReactNode;
  tip?: ReactNode;
}) {
  return (
    <h3 className="ui-section-label inline-flex items-center gap-1.5">
      {children}
      {tip != null && tip !== "" && <Tooltip content={tip} label={`Подсказка: ${String(children)}`} />}
    </h3>
  );
}

function SettingsDataPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const importAppSettings = useSettingsStore((s) => s.importAppSettings);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stripSecrets, setStripSecrets] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  const downloadExport = () => {
    const payload = buildSettingsExport(settings, { stripSecrets });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `llm-shell-settings-${APP_VERSION}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(stripSecrets ? "Экспорт без ключей скачан" : "Экспорт (с ключами) скачан — храните файл безопасно");
  };

  const onImportFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const next = parseSettingsImport(text);
      importAppSettings(next);
      setMsg("Настройки импортированы");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const onCheckUpdates = async () => {
    setBusy(true);
    setMsg(null);
    setCanInstall(false);
    try {
      const r = await checkForAppUpdates();
      setCanInstall(Boolean(r.canInstall));
      setMsg(r.message + (r.htmlUrl && r.newer && !r.canInstall ? ` → ${r.htmlUrl}` : ""));
      if (r.newer && r.htmlUrl && !r.canInstall) {
        window.open(r.htmlUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setBusy(false);
    }
  };

  const onInstall = async () => {
    if (!window.confirm("Установить подписанное обновление и перезапустить приложение?")) return;
    setBusy(true);
    try {
      const r = await installSignedUpdate();
      setMsg(r.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-2 border-t border-border-muted pt-4">
      <h3 className="ui-section-label">Данные и обновления</h3>
      <p className="text-[11px] text-text-muted">
        Экспорт / импорт · signed updater (pubkey в tauri.conf) · soft GitHub (VITE_UPDATE_REPO)
      </p>
      <label className="flex items-center gap-2 text-[12px] text-text-secondary">
        <input
          type="checkbox"
          checked={stripSecrets}
          onChange={(e) => setStripSecrets(e.target.checked)}
        />
        Экспорт без API-ключей
      </label>
      <div className="flex flex-wrap gap-1">
        <button type="button" className="ui-chrome-btn px-2" onClick={downloadExport}>
          Export settings
        </button>
        <label className="ui-chrome-btn cursor-pointer px-2">
          Import…
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImportFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="button"
          className="ui-chrome-btn px-2"
          disabled={busy}
          onClick={() => void onCheckUpdates()}
        >
          {busy ? "Checking…" : "Check updates"}
        </button>
        {canInstall && (
          <button
            type="button"
            className="ui-chrome-btn px-2"
            disabled={busy}
            onClick={() => void onInstall()}
          >
            Install & relaunch
          </button>
        )}
      </div>
      {msg && <p className="text-[11px] text-text-secondary">{msg}</p>}
    </section>
  );
}

function EditorSettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const updateEditor = useSettingsStore((s) => s.updateEditor);
  const editor = settings.editor ?? {
    ghostTextEnabled: false,
    lspEnabled: false,
    lspCommand: "typescript-language-server",
    lspArgs: ["--stdio"],
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-text-secondary">
        Ghost-text — LLM inline (Tab). LSP — multi-server (TS/JS, HTML/CSS/JSON, Python, Rust, C/C++,
        C#, Go): completion, F12, Rename, Format. Серверы должны быть на PATH (см. USER.md).
      </p>
      <label className="flex items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={editor.ghostTextEnabled}
          onChange={(e) => updateEditor({ ghostTextEnabled: e.target.checked })}
        />
        Ghost-text (LLM)
      </label>
      <label className="flex items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={editor.lspEnabled}
          onChange={(e) => updateEditor({ lspEnabled: e.target.checked })}
        />
        LSP enabled
      </label>
      <label className="block text-[12px]">
        <span className="mb-1 block text-text-secondary">LSP command</span>
        <input
          className="w-full rounded border border-border-muted bg-bg-secondary px-1.5 py-0.5 font-mono text-[11px]"
          value={editor.lspCommand}
          onChange={(e) => updateEditor({ lspCommand: e.target.value })}
          placeholder="typescript-language-server"
        />
      </label>
      <label className="block text-[12px]">
        <span className="mb-1 block text-text-secondary">LSP args (space-separated)</span>
        <input
          className="w-full rounded border border-border-muted bg-bg-secondary px-1.5 py-0.5 font-mono text-[11px]"
          value={(editor.lspArgs ?? []).join(" ")}
          onChange={(e) =>
            updateEditor({
              lspArgs: e.target.value.trim() ? e.target.value.trim().split(/\s+/) : ["--stdio"],
            })
          }
          placeholder="--stdio"
        />
      </label>
    </div>
  );
}

function ProviderOptions({ types = PROVIDER_TYPE_ORDER }: { types?: ProviderType[] }) {
  return (
    <>
      {types.map((k) => {
        const p = getProviderPreset(k);
        return (
          <option key={k} value={k}>
            {p.name}
            {p.stale ? " · устарел" : ""}
          </option>
        );
      })}
    </>
  );
}

function AddProviderCatalog({
  onAdd,
}: {
  onAdd: (type: ProviderType) => void;
}) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<ProviderCategory, boolean>>(() =>
    Object.fromEntries(
      PROVIDER_CATEGORY_ORDER.map((c) => [c, PROVIDER_CATEGORY_META[c].defaultExpanded]),
    ) as Record<ProviderCategory, boolean>,
  );

  const q = query.trim().toLowerCase();

  const filteredByCategory = useMemo(() => {
    return PROVIDER_CATEGORY_ORDER.map((cat) => {
      const types = providersInCategory(cat).filter((t) => {
        if (t === "custom" && !q) return true;
        if (!q) return true;
        const p = getProviderPreset(t);
        return (
          p.name.toLowerCase().includes(q) ||
          t.includes(q) ||
          p.baseUrl.toLowerCase().includes(q) ||
          (p.notes?.toLowerCase().includes(q) ?? false)
        );
      });
      return { cat, types };
    }).filter((g) => g.types.length > 0);
  }, [q]);

  return (
    <section className="space-y-2 border-t border-border-muted pt-4">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded border border-border-default bg-bg-primary/40 px-3 py-2 text-left hover:bg-bg-tertiary/40"
        aria-expanded={catalogOpen}
        onClick={() => setCatalogOpen((v) => !v)}
      >
        <span className="font-mono text-[10px] text-text-muted">{catalogOpen ? "▾" : "▸"}</span>
        <div className="min-w-0 flex-1">
          <h3 className="ui-section-label mb-0">Добавить провайдера</h3>
          <p className="text-[11px] text-text-muted">
            каталог {PROVIDER_TYPE_ORDER.length} пресетов · развернуть при необходимости
          </p>
        </div>
      </button>
      {catalogOpen && (
        <>
          <input
            type="search"
            placeholder="Поиск: groq, deepseek, yandex…"
            className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5 text-[12px]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="space-y-1.5">
            {filteredByCategory.map(({ cat, types }) => {
              const meta = PROVIDER_CATEGORY_META[cat];
              const open = q ? true : expanded[cat];
              return (
                <div key={cat} className="overflow-hidden rounded border border-border-default">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 bg-bg-primary/50 px-3 py-1.5 text-left hover:bg-bg-tertiary/40"
                    onClick={() => setExpanded((s) => ({ ...s, [cat]: !s[cat] }))}
                    aria-expanded={open}
                  >
                    <span className="font-mono text-[10px] text-text-muted">{open ? "▾" : "▸"}</span>
                    <span className="text-[12px] font-medium text-text-primary">{meta.label}</span>
                    <span className="font-mono text-[10px] tabular-nums text-text-muted">
                      ({types.length})
                    </span>
                    <span className="ml-auto truncate text-[10px] text-text-muted">{meta.hint}</span>
                  </button>
                  {open && (
                    <ul className="divide-y divide-border-muted">
                      {types.map((type) => {
                        const p = getProviderPreset(type);
                        return (
                          <li
                            key={type}
                            className="flex items-start gap-2 px-3 py-1.5 hover:bg-bg-tertiary/20"
                          >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[12px] font-medium text-text-primary">
                              {p.name}
                            </span>
                            {p.stale && (
                              <span
                                className="text-[10px] uppercase tracking-[0.04em] text-accent-yellow"
                                title="URL/модели могли устареть — проверьте docs"
                              >
                                stale
                              </span>
                            )}
                          </div>
                          <div className="truncate font-mono text-[10px] text-text-muted">
                            {p.baseUrl || "укажите URL вручную"}
                          </div>
                          {p.notes && (
                            <p className="mt-0.5 line-clamp-2 text-[10px] text-text-secondary">
                              {p.notes}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded border border-border-default bg-bg-primary px-2 py-1 text-[11px] text-text-primary hover:border-accent-blue hover:text-accent-blue"
                          onClick={() => onAdd(type)}
                        >
                          + Добавить
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {filteredByCategory.length === 0 && (
          <p className="px-1 py-2 text-[12px] text-text-muted">Ничего не найдено</p>
        )}
      </div>
        </>
      )}
    </section>
  );
}


function McpSettingsPanel() {
  const servers = useSettingsStore((s) => s.settings.mcpServers ?? []);
  const network = useSettingsStore((s) => s.settings.network);
  const upsert = useSettingsStore((s) => s.upsertMcpServer);
  const remove = useSettingsStore((s) => s.removeMcpServer);
  const connected = useMcpStore((s) => s.connected);
  const connecting = useMcpStore((s) => s.connecting);
  const lastError = useMcpStore((s) => s.lastError);
  const connectServer = useMcpStore((s) => s.connectServer);
  const disconnectServer = useMcpStore((s) => s.disconnectServer);
  const connectEnabled = useMcpStore((s) => s.connectEnabled);
  const toolCount = useMcpStore((s) => s.toolCount());

  const addBlank = () => {
    upsert({
      id: crypto.randomUUID(),
      name: "MCP Server",
      transport: "http",
      url: "http://127.0.0.1:3100/mcp",
      enabled: true,
    });
  };

  const addPreset = (preset: (typeof MCP_PRESETS)[number]) => {
    upsert({
      id: crypto.randomUUID(),
      name: preset.name,
      transport: preset.transport,
      url: preset.url,
      command: preset.command,
      args: preset.args,
      enabled: true,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-text-secondary">
        MCP: HTTP и native stdio (Content-Length pipe). Stdio: command/args + Connect.
        Tools: <span className="text-text-primary">{toolCount}</span>
      </p>
      {lastError && (
        <p className="rounded border border-accent-red/40 bg-accent-red/10 px-2 py-1 text-[11px] text-accent-red">
          {lastError}
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        <button type="button" className="ui-chrome-btn px-2" onClick={addBlank}>
          + Server
        </button>
        <button
          type="button"
          className="ui-chrome-btn px-2"
          disabled={connecting}
          onClick={() => void connectEnabled(servers, network)}
        >
          {connecting ? "Connecting…" : "Connect enabled"}
        </button>
        {MCP_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="ui-chrome-btn px-2 text-[10px]"
            title={p.hint}
            onClick={() => addPreset(p)}
          >
            Preset: {p.name.split(" ")[0]}
          </button>
        ))}
      </div>
      {servers.length === 0 && (
        <p className="text-[12px] text-text-muted">Нет MCP серверов. Добавьте URL или пресет.</p>
      )}
      {servers.map((server) => {
        const status = connected[server.id];
        return (
          <McpServerRow
            key={server.id}
            server={server}
            toolCount={status && !status.error ? status.tools.length : 0}
            error={status?.error}
            onChange={(next) => upsert(next)}
            onRemove={() => {
              disconnectServer(server.id);
              remove(server.id);
            }}
            onConnect={() => void connectServer(server, network)}
            onDisconnect={() => disconnectServer(server.id)}
          />
        );
      })}
    </div>
  );
}

function McpServerRow({
  server,
  toolCount,
  error,
  onChange,
  onRemove,
  onConnect,
  onDisconnect,
}: {
  server: McpServerConfig;
  toolCount: number;
  error?: string;
  onChange: (s: McpServerConfig) => void;
  onRemove: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="space-y-1.5 rounded border border-border-default bg-bg-primary p-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={server.enabled}
          onChange={(e) => onChange({ ...server, enabled: e.target.checked })}
          title="Enabled"
        />
        <input
          className="min-w-0 flex-1 rounded border border-border-muted bg-bg-secondary px-1.5 py-0.5 text-[12px]"
          value={server.name}
          onChange={(e) => onChange({ ...server, name: e.target.value })}
        />
        <select
          className="shrink-0 rounded border border-border-muted bg-bg-secondary px-1 py-0.5 text-[11px]"
          value={server.transport}
          onChange={(e) =>
            onChange({
              ...server,
              transport: e.target.value as McpServerConfig["transport"],
            })
          }
        >
          <option value="http">http</option>
          <option value="sse">sse</option>
          <option value="stdio">stdio</option>
        </select>
        <span className="shrink-0 text-[10px] text-text-muted">
          {error ? "error" : toolCount ? `${toolCount} tools` : "idle"}
        </span>
      </div>
      {server.transport === "stdio" ? (
        <>
          <input
            className="w-full rounded border border-border-muted bg-bg-secondary px-1.5 py-0.5 font-mono text-[11px]"
            value={server.command ?? ""}
            onChange={(e) => onChange({ ...server, command: e.target.value })}
            placeholder="command (e.g. npx)"
          />
          <input
            className="w-full rounded border border-border-muted bg-bg-secondary px-1.5 py-0.5 font-mono text-[11px]"
            value={(server.args ?? []).join(" ")}
            onChange={(e) =>
              onChange({
                ...server,
                args: e.target.value.trim() ? e.target.value.trim().split(/\s+/) : [],
              })
            }
            placeholder="args…"
          />
        </>
      ) : (
        <input
          className="w-full rounded border border-border-muted bg-bg-secondary px-1.5 py-0.5 font-mono text-[11px]"
          value={server.url}
          onChange={(e) => onChange({ ...server, url: e.target.value })}
          placeholder="http://127.0.0.1:3100/mcp"
        />
      )}
      <input
        className="w-full rounded border border-border-muted bg-bg-secondary px-1.5 py-0.5 font-mono text-[11px]"
        type="password"
        autoComplete="off"
        value={server.apiKey ?? ""}
        onChange={(e) => onChange({ ...server, apiKey: e.target.value })}
        placeholder="API key (optional)"
      />
      {error && <p className="text-[10px] text-accent-red">{error}</p>}
      <div className="flex gap-1">
        <button type="button" className="ui-chrome-btn px-2 text-[10px]" onClick={onConnect}>
          Connect
        </button>
        <button type="button" className="ui-chrome-btn px-2 text-[10px]" onClick={onDisconnect}>
          Disconnect
        </button>
        <button type="button" className="ui-chrome-btn px-2 text-[10px]" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}

export function SettingsDialog() {
  const isOpen = useSettingsStore((s) => s.isOpen);
  const activeModule = useSettingsStore((s) => s.activeModule);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const settings = useSettingsStore((s) => s.settings);
  const setProviderType = useSettingsStore((s) => s.setProviderType);
  const updateProvider = useSettingsStore((s) => s.updateProvider);
  const updateGeneration = useSettingsStore((s) => s.updateGeneration);
  const updateAgent = useSettingsStore((s) => s.updateAgent);
  const updateAppearance = useSettingsStore((s) => s.updateAppearance);
  const updateNetwork = useSettingsStore((s) => s.updateNetwork);
  const setActiveProfile = useSettingsStore((s) => s.setActiveProfile);
  const addApiProfile = useSettingsStore((s) => s.addApiProfile);
  const removeApiProfile = useSettingsStore((s) => s.removeApiProfile);
  const renameActiveProfile = useSettingsStore((s) => s.renameActiveProfile);
  const realignMismatchedProfileLabels = useSettingsStore(
    (s) => s.realignMismatchedProfileLabels,
  );
  const updateModelQuota = useSettingsStore((s) => s.updateModelQuota);
  const syncModelsFromList = useSettingsStore((s) => s.syncModelsFromList);
  const healthItems = useApiHealthStore((s) => s.items);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const module: SettingsModule = activeModule ?? "api";
  const moduleMeta = SETTINGS_MODULE_META[module];

  if (!isOpen) return null;

  const quotas = settings.provider.modelQuotas ?? [];
  const activeId = settings.activeProfileId;
  const mismatched = settings.apiProfiles
    .map((p) => {
      const label = profileLabelMismatch(p);
      const models = profileModelFamilyMismatch(p);
      if (!label && !models) return null;
      return {
        profile: p,
        expectedLabel: label?.expectedLabel,
        reason: label?.reason ?? models?.reason ?? "",
        kind: label && models ? ("both" as const) : label ? ("label" as const) : ("models" as const),
      };
    })
    .filter(Boolean) as Array<{
    profile: (typeof settings.apiProfiles)[number];
    expectedLabel?: string;
    reason: string;
    kind: "label" | "models" | "both";
  }>;

  return (
    <div
      className="ui-modal-scrim fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={() => closeSettings()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        className="ui-modal flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
          <div className="min-w-0">
            <div className="ui-section-label">Настройки</div>
            <h2 id="settings-dialog-title" className="text-sm font-semibold text-pretty">
              {moduleMeta.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Закрыть настройки"
            className="ui-icon-close opacity-60 hover:opacity-100"
            onClick={() => closeSettings()}
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 text-[13px]">
          {module === "api" && (
            <div className="space-y-5">
              {mismatched.length > 0 && (
                <div className="space-y-2 rounded border border-accent-yellow/50 bg-accent-yellow/5 px-3 py-2 text-[12px] text-text-secondary">
                  <p className="font-medium text-text-primary">
                    Подписи или модели профилей не совпадают с type / URL
                  </p>
                  <ul className="list-disc space-y-1 pl-4">
                    {mismatched.map(({ profile, expectedLabel, reason, kind }) => (
                      <li key={profile.id}>
                        <span className="text-text-primary">{profile.label}</span>
                        {expectedLabel && (
                          <>
                            {" → "}
                            <span className="text-accent-blue">{expectedLabel}</span>
                          </>
                        )}
                        {kind !== "label" && (
                          <span className="text-accent-blue">
                            {expectedLabel ? " · " : " → "}модели из пресета
                          </span>
                        )}
                        <span className="text-text-muted"> · {reason}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-text-muted">
                    Ключи и URL не трогаем — правим имена и сбрасываем чужие model id на пресет
                    провайдера.
                  </p>
                  <button
                    type="button"
                    className="rounded border border-border-default bg-bg-primary px-2.5 py-1 text-[11px] text-text-primary hover:border-accent-blue"
                    onClick={() => {
                      const n = realignMismatchedProfileLabels();
                      setTestMsg(
                        n > 0
                          ? `Исправлено профилей: ${n} (ключи сохранены; модели при необходимости сброшены на пресет)`
                          : "Нечего исправлять",
                      );
                    }}
                  >
                    Исправить имена
                  </button>
                </div>
              )}

              {/* —— Профили (только с ключом / локальные) —— */}
              <section className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <SectionTitle tip={TIP_PROFILES}>Профиль</SectionTitle>
                  <span className="font-mono text-[11px] text-text-muted">
                    {settings.apiProfiles.filter(isProfileReadyForChat).length}/
                    {settings.apiProfiles.length}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted">
                  Нажмите профиль — откроются его настройки. В списке: с API-ключом или локальные
                  (Ollama / LM Studio / vLLM).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {settings.apiProfiles.filter(isProfileReadyForChat).map((p) => {
                    const isActive = p.id === activeId;
                    const health = healthItems.find((h) => h.id === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        title={`${p.label}\n${p.model || "модель?"}\n${p.baseUrl}`}
                        onClick={() => {
                          setActiveProfile(p.id);
                          setTestMsg(null);
                          setShowKey(false);
                        }}
                        className={`inline-flex max-w-[200px] items-center gap-1.5 rounded border px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                          isActive
                            ? "border-accent-blue bg-accent-blue/10 text-text-primary"
                            : "border-border-default bg-bg-primary text-text-secondary hover:border-border-muted hover:text-text-primary"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(health?.tone ?? "idle")}`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate font-medium">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
                {settings.apiProfiles.filter(isProfileReadyForChat).length === 0 && (
                  <p className="text-[12px] text-accent-yellow">
                    Нет готовых профилей — добавьте провайдера ниже и вставьте ключ (или укажите
                    Ollama).
                  </p>
                )}
                {settings.apiProfiles.some((p) => !isProfileReadyForChat(p)) && (
                  <details className="rounded border border-border-muted bg-bg-primary/40 px-2 py-1.5 text-[11px] text-text-muted">
                    <summary className="cursor-pointer select-none text-text-secondary">
                      Слоты без ключа (
                      {settings.apiProfiles.filter((p) => !isProfileReadyForChat(p)).length})
                    </summary>
                    <ul className="mt-1 space-y-1 pl-1">
                      {settings.apiProfiles
                        .filter((p) => !isProfileReadyForChat(p))
                        .map((p) => (
                          <li key={p.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              className="text-left text-text-secondary hover:text-accent-blue"
                              onClick={() => {
                                setActiveProfile(p.id);
                                setTestMsg(null);
                                setShowKey(false);
                              }}
                            >
                              {p.label}
                              <span className="text-text-muted"> · нужен ключ</span>
                            </button>
                            <button
                              type="button"
                              disabled={settings.apiProfiles.length <= 1}
                              className="ui-icon-close disabled:opacity-20"
                              aria-label={`Удалить ${p.label}`}
                              onClick={() => removeApiProfile(p.id)}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                    </ul>
                  </details>
                )}
              </section>

              <AddProviderCatalog
                onAdd={(type) => {
                  addApiProfile(type);
                  setTestMsg(null);
                  setShowKey(false);
                }}
              />

              {/* —— Карточка активного API —— */}
              <section className="space-y-3 border-t border-border-muted pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SectionTitle tip={TIP_RU_BYPASS}>Настройки профиля</SectionTitle>
                  {settings.apiProfiles.length > 1 && (
                    <button
                      type="button"
                      className="ui-chrome-btn px-2 text-[10px] text-accent-red"
                      disabled={settings.apiProfiles.length <= 1}
                      onClick={() => removeApiProfile(activeId)}
                    >
                      Удалить профиль
                    </button>
                  )}
                </div>

                <label className="block">
                  <FieldLabel>Имя в хранилище</FieldLabel>
                  <input
                    className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5"
                    value={settings.provider.name}
                    onChange={(e) => renameActiveProfile(e.target.value)}
                  />
                </label>

                <label className="block">
                  <FieldLabel
                    tip={
                      (() => {
                        const preset = getProviderPreset(settings.provider.type);
                        if (!preset.notes && !preset.docsUrl) return undefined;
                        return (
                          <>
                            {preset.notes}
                            {preset.docsUrl && (
                              <>
                                {preset.notes ? " · " : null}
                                <a
                                  className="text-accent-blue hover:underline"
                                  href={preset.docsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  docs
                                </a>
                              </>
                            )}
                          </>
                        );
                      })()
                    }
                  >
                    Провайдер
                  </FieldLabel>
                  <select
                    className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5"
                    value={settings.provider.type}
                    onChange={(e) => setProviderType(e.target.value as ProviderType)}
                  >
                    <ProviderOptions />
                  </select>
                </label>

                <label className="block">
                  <FieldLabel tip={TIP_BASE_URL}>Base URL</FieldLabel>
                  <input
                    className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5 font-mono text-[12px]"
                    value={settings.provider.baseUrl}
                    onChange={(e) => updateProvider({ baseUrl: e.target.value })}
                    placeholder="https://api.x.ai/v1"
                  />
                </label>

                <label className="block">
                  <FieldLabel tip={TIP_API_KEY}>API Key</FieldLabel>
                  <div className="flex gap-2">
                    <input
                      type={showKey ? "text" : "password"}
                      className="min-w-0 flex-1 rounded border border-border-default bg-bg-primary px-2 py-1.5 font-mono text-[12px]"
                      value={settings.provider.apiKey}
                      onChange={(e) => updateProvider({ apiKey: e.target.value })}
                      placeholder="для Ollama можно оставить пустым"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded border border-border-default px-2 text-[11px] text-text-secondary hover:bg-bg-tertiary"
                      onClick={() => setShowKey((v) => !v)}
                    >
                      {showKey ? "Скрыть" : "Показать"}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <FieldLabel
                    tip={
                      settings.provider.type === "yandex" ? (
                        <>
                          {YANDEX_MODEL_URI_HINT}{" "}
                          <a
                            className="text-accent-blue hover:underline"
                            href="https://console.yandex.cloud"
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            console.yandex.cloud
                          </a>
                        </>
                      ) : (
                        "Идентификатор модели у провайдера. Список обновляется кнопкой проверки ниже."
                      )
                    }
                  >
                    Модель по умолчанию
                  </FieldLabel>
                  <input
                    className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5"
                    value={settings.provider.model}
                    onChange={(e) => updateProvider({ model: e.target.value })}
                    list="models"
                    placeholder={
                      settings.provider.type === "yandex"
                        ? "gpt://<folder_id>/yandexgpt/latest"
                        : undefined
                    }
                  />
                  <datalist id="models">
                    {settings.provider.availableModels.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  {settings.provider.type === "yandex" &&
                    (() => {
                      const err = yandexModelUriError(settings.provider.model);
                      return err ? (
                        <p className="mt-1 whitespace-pre-wrap text-[11px] text-accent-red">{err}</p>
                      ) : null;
                    })()}
                </label>

                <details className="rounded border border-border-muted px-2 py-1.5">
                  <summary className="cursor-pointer text-[12px] text-text-secondary">
                    Fallback-модели и auto-failover
                  </summary>
                  <div className="mt-2 space-y-2">
                    <label className="block">
                      <FieldLabel tip={TIP_FALLBACKS}>Fallback (по одной на строку)</FieldLabel>
                      <textarea
                        className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5 font-mono text-[12px]"
                        rows={2}
                        value={(settings.provider.fallbackModels ?? []).join("\n")}
                        onChange={(e) =>
                          updateProvider({
                            fallbackModels: e.target.value
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.provider.failoverEnabled !== false}
                        onChange={(e) => updateProvider({ failoverEnabled: e.target.checked })}
                      />
                      <span className="inline-flex items-center gap-1.5 text-[12px]">
                        Auto-failover
                        <Tooltip content={TIP_FAILOVER} label="Подсказка: Auto-failover" />
                      </span>
                    </label>
                  </div>
                </details>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={testing || !settings.provider.baseUrl}
                    className="rounded-md bg-bg-tertiary px-3 py-1.5 text-[12px] hover:bg-border-default disabled:opacity-40"
                    onClick={async () => {
                      setTesting(true);
                      setTestMsg(null);
                      if (settings.provider.type === "yandex") {
                        const uriErr = yandexModelUriError(settings.provider.model);
                        if (uriErr) {
                          setTestMsg("✗ " + uriErr);
                          setTesting(false);
                          return;
                        }
                      }
                      const client = createClientFromSettings(
                        settings.provider.baseUrl,
                        settings.provider.apiKey,
                        settings.network,
                      );
                      const res = await client.testConnection(settings.provider.model);
                      if (res.models?.length) {
                        syncModelsFromList(res.models);
                      }
                      setTestMsg((res.ok ? "✓ " : "✗ ") + res.message);
                      setTesting(false);
                    }}
                  >
                    {testing ? "Проверка…" : "Проверить доступ и синхронизировать модели"}
                  </button>
                  {testMsg && (
                    <span
                      className={`text-[12px] ${testMsg.startsWith("✓") ? "text-accent-green" : "text-accent-red"}`}
                    >
                      {testMsg}
                    </span>
                  )}
                </div>
              </section>
            </div>
          )}

          {module === "proxy" && (
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.network?.proxyEnabled ?? false}
                  onChange={(e) => updateNetwork({ proxyEnabled: e.target.checked })}
                />
                <span className="inline-flex items-center gap-1.5">
                  Включить proxy для API
                  <Tooltip content={TIP_PROXY_ENABLED} label="Подсказка: proxy" />
                </span>
              </label>
              <label className="block">
                <FieldLabel tip={TIP_PROXY_URL}>Proxy URL</FieldLabel>
                <input
                  className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5 font-mono text-[12px]"
                  placeholder="socks5://127.0.0.1:1080"
                  value={settings.network?.proxyUrl ?? ""}
                  onChange={(e) => updateNetwork({ proxyUrl: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.network?.forceRustHttp !== false}
                  onChange={(e) => updateNetwork({ forceRustHttp: e.target.checked })}
                />
                <span className="inline-flex items-center gap-1.5">
                  Всегда слать LLM через Rust (рекомендуется в Tauri, без CORS)
                  <Tooltip content={TIP_FORCE_RUST} label="Подсказка: Rust HTTP" />
                </span>
              </label>
              <p className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary">
                Как пользоваться из РФ
                <Tooltip content={TIP_PROXY_HOW} label="Подсказка: proxy из РФ" />
              </p>
            </div>
          )}

          {module === "models" && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                Каталог моделей активного API
                <Tooltip
                  content="Context/price — из публичных docs; RPM / TPM / RPD — лимиты вашего аккаунта. Список обновляется кнопкой проверки в «Хранилище API»."
                  label="Подсказка: Models"
                />
              </div>
              <div className="overflow-x-auto rounded border border-border-default">
                <table className="w-full min-w-[640px] text-left text-[11px]">
                  <thead className="bg-bg-primary text-text-secondary">
                    <tr>
                      <th className="px-2 py-1.5">Model</th>
                      <th className="px-2 py-1.5">Ctx</th>
                      <th className="px-2 py-1.5">RPM</th>
                      <th className="px-2 py-1.5">TPM</th>
                      <th className="px-2 py-1.5">RPD</th>
                      <th className="px-2 py-1.5">$/1M in</th>
                      <th className="px-2 py-1.5">$/1M out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotas.map((q) => (
                      <tr key={q.id} className="border-t border-border-default">
                        <td className="px-2 py-1 font-mono">
                          <button
                            type="button"
                            className={
                              q.id === settings.provider.model
                                ? "text-accent-blue"
                                : "text-text-primary hover:underline"
                            }
                            title={q.notes}
                            onClick={() => updateProvider({ model: q.id })}
                          >
                            {q.id}
                          </button>
                        </td>
                        <td className="px-2 py-1">
                          <NumCell
                            value={q.contextWindow}
                            onChange={(v) => updateModelQuota(q.id, { contextWindow: v })}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <NumCell
                            value={q.rpm}
                            onChange={(v) => updateModelQuota(q.id, { rpm: v })}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <NumCell
                            value={q.tpm}
                            onChange={(v) => updateModelQuota(q.id, { tpm: v })}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <NumCell
                            value={q.rpd}
                            onChange={(v) => updateModelQuota(q.id, { rpd: v })}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <NumCell
                            value={q.priceInPer1M}
                            step={0.01}
                            onChange={(v) => updateModelQuota(q.id, { priceInPer1M: v })}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <NumCell
                            value={q.priceOutPer1M}
                            step={0.01}
                            onChange={(v) => updateModelQuota(q.id, { priceOutPer1M: v })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {quotas.length === 0 && (
                <p className="text-text-muted">
                  Нет моделей — откройте «Хранилище API» → Проверить доступ…
                </p>
              )}
              <button
                type="button"
                className="rounded-md bg-bg-tertiary px-3 py-1.5 text-[12px]"
                onClick={() => {
                  const id = window.prompt("Model id");
                  if (!id?.trim()) return;
                  const mid = id.trim();
                  updateProvider({
                    availableModels: [...new Set([...settings.provider.availableModels, mid])],
                  });
                  updateModelQuota(mid, { id: mid });
                }}
              >
                + Add model id
              </button>
            </div>
          )}

          {module === "generation" && (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-text-secondary">
                  Temperature: {settings.generation.temperature.toFixed(1)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={settings.generation.temperature}
                  onChange={(e) => updateGeneration({ temperature: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-text-secondary">Max tokens</span>
                <input
                  type="number"
                  className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5"
                  value={settings.generation.maxTokens}
                  onChange={(e) => updateGeneration({ maxTokens: Number(e.target.value) })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-text-secondary">
                  Top P: {settings.generation.topP.toFixed(2)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.generation.topP}
                  onChange={(e) => updateGeneration({ topP: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
            </div>
          )}

          {module === "agent" && (
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.agent.offlineMode ?? false}
                  onChange={(e) => useSettingsStore.getState().setOfflineMode(e.target.checked)}
                />
                <span className="inline-flex items-center gap-1.5">
                  Offline mode (только Ollama / 7B)
                  <Tooltip content={TIP_OFFLINE} label="Подсказка: Offline mode" />
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.agent.ragFromSuccess !== false}
                  onChange={(e) => updateAgent({ ragFromSuccess: e.target.checked })}
                />
                <span className="inline-flex items-center gap-1.5">
                  RAG из успешных задач
                  <Tooltip
                    content="После успешного ответа агент сохраняет краткую запись (запрос + решение + tools). Похожие задачи в той же папке подмешиваются в prompt."
                    label="Подсказка: Success RAG"
                  />
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.agent.strictTools ?? false}
                  onChange={(e) => updateAgent({ strictTools: e.target.checked })}
                />
                <span className="inline-flex items-center gap-1.5">
                  Strict tools (tool_choice: required)
                  <Tooltip
                    content="Для слабых локальных моделей (7B): агент обязан вызывать tool вместо симуляции bash/Python в тексте. Только режим Agent."
                    label="Подсказка: Strict tools"
                  />
                </span>
              </label>
              <label className="block">
                <FieldLabel tip={TIP_ROLE}>Роль агента</FieldLabel>
                <select
                  className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5"
                  value={settings.agent.role ?? "default"}
                  onChange={(e) =>
                    updateAgent({
                      role: e.target.value as "default" | "reviewer" | "refactor",
                    })
                  }
                >
                  <option value="default">Default (Composer)</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="refactor">Refactor</option>
                </select>
              </label>
              <label className="block">
                <FieldLabel tip="Ask = только чтение; Agent = полный доступ; Plan = без tools, только план.">
                  Режим (Ask / Agent / Plan)
                </FieldLabel>
                <select
                  className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5"
                  value={settings.agent.mode ?? "agent"}
                  onChange={(e) =>
                    updateAgent({
                      mode: e.target.value as "ask" | "agent" | "plan",
                    })
                  }
                >
                  <option value="ask">Ask (read-only)</option>
                  <option value="agent">Agent (full tools)</option>
                  <option value="plan">Plan (no tools)</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.profileFailover?.enabled !== false}
                  onChange={(e) =>
                    useSettingsStore.getState().updateProfileFailover({ enabled: e.target.checked })
                  }
                />
                <span className="inline-flex items-center gap-1.5">
                  Failover между профилями API (OpenRouter → xAI → Ollama)
                  <Tooltip content={TIP_PROFILE_FAILOVER} label="Подсказка: profile failover" />
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block text-text-secondary">
                  Max iterations: {settings.agent.maxIterations}
                </span>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={settings.agent.maxIterations}
                  onChange={(e) => updateAgent({ maxIterations: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.agent.autoExecute}
                  onChange={(e) => updateAgent({ autoExecute: e.target.checked })}
                />
                Auto-execute (без подтверждений)
              </label>
              {(
                [
                  ["writeFile", "Подтверждать write_file"],
                  ["editFile", "Подтверждать edit_file"],
                  ["executeCommand", "Подтверждать execute_command"],
                  ["deleteFile", "Подтверждать delete_file"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.agent.confirmations[key]}
                    onChange={(e) =>
                      updateAgent({
                        confirmations: {
                          ...settings.agent.confirmations,
                          [key]: e.target.checked,
                        },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          )}

          {module === "memory" && <ProjectMemoryPanel />}

          {module === "mcp" && <McpSettingsPanel />}

          {module === "editor" && <EditorSettingsPanel />}

          {module === "appearance" && (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-text-secondary">Theme</span>
                <select
                  className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5"
                  value={settings.appearance.theme}
                  onChange={(e) =>
                    updateAppearance({ theme: e.target.value as "dark" | "light" | "system" })
                  }
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-text-secondary">
                  Font size: {settings.appearance.fontSize}px
                </span>
                <input
                  type="range"
                  min={12}
                  max={18}
                  value={settings.appearance.fontSize}
                  onChange={(e) => updateAppearance({ fontSize: Number(e.target.value) })}
                  className="w-full"
                />
              </label>

              <SettingsDataPanel />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border-default px-4 py-2.5">
          <span className="min-w-0 truncate text-[11px] text-text-muted">
            {formatQuotaShort(
              quotas.find((q) => q.id === settings.provider.model),
            ) || moduleMeta.hint}
          </span>
          <button
            type="button"
            className="rounded bg-accent-blue px-4 py-1.5 text-[13px] text-white hover:brightness-110"
            onClick={() => closeSettings()}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function NumCell({
  value,
  onChange,
  step = 1,
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
  step?: number;
}) {
  return (
    <input
      type="number"
      step={step}
      className="w-20 rounded border border-border-default bg-bg-primary px-1 py-0.5 font-mono tabular-nums"
      value={value ?? ""}
      placeholder="—"
      onChange={(e) => {
        const t = e.target.value.trim();
        onChange(t === "" ? undefined : Number(t));
      }}
    />
  );
}
