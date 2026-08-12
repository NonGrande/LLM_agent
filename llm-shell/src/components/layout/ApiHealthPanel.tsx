import { useApiHealthStore } from "@/stores/apiHealthStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { toneClass, toneDot, type ApiHealthItem } from "@/services/llm/probeApiHealth";
import {
  HEALTH_FILTER_KEYS,
  HEALTH_FILTER_META,
  itemMatchesHealthFilter,
  resolveHealthFilterKey,
  type HealthFilterKey,
} from "@/services/llm/healthClassify";

/** Compact banner with API probe results (dismissible). */
export function ApiHealthPanel() {
  const running = useApiHealthStore((s) => s.running);
  const items = useApiHealthStore((s) => s.items);
  const dismissed = useApiHealthStore((s) => s.dismissed);
  const filterTone = useApiHealthStore((s) => s.filterTone);
  const setFilterTone = useApiHealthStore((s) => s.setFilterTone);
  const dismiss = useApiHealthStore((s) => s.dismiss);
  const run = useApiHealthStore((s) => s.run);
  const profiles = useSettingsStore((s) => s.settings.apiProfiles);
  const network = useSettingsStore((s) => s.settings.network);
  const setOpen = useSettingsStore((s) => s.setOpen);

  if (dismissed) return null;
  if (!running && items.length === 0) return null;

  const counts = Object.fromEntries(
    HEALTH_FILTER_KEYS.map((key) => [
      key,
      items.filter((i) => resolveHealthFilterKey(i) === key).length,
    ]),
  ) as Record<HealthFilterKey, number>;

  const visible = filterTone
    ? items.filter((i) => itemMatchesHealthFilter(i, filterTone))
    : items.filter((i) => i.tone !== "checking" && i.tone !== "idle");

  // Profiles first; local discovery presets last (no cloud preset flood).
  const ordered = [...visible].sort((a, b) => {
    if (a.kind === b.kind) return 0;
    return a.kind === "profile" ? -1 : 1;
  });

  const groups = groupVisibleItems(ordered, filterTone);

  return (
    <div
      className="shrink-0 border-b border-border-default bg-bg-secondary/95 px-3 py-1.5"
      role="status"
      aria-live="polite"
    >
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <span className="font-medium text-text-primary">
          {running ? "Проверка API…" : "API"}
        </span>
        {!running && (
          <span className="inline-flex flex-wrap items-center gap-1 font-mono tabular-nums text-text-muted">
            {HEALTH_FILTER_KEYS.map((key, idx) => (
              <span key={key} className="inline-flex items-center gap-1">
                {idx > 0 && <span aria-hidden="true">·</span>}
                <FilterCountButton
                  filterKey={key}
                  active={filterTone === key}
                  count={counts[key]}
                  onToggle={setFilterTone}
                />
              </span>
            ))}
          </span>
        )}
        {filterTone && (
          <button
            type="button"
            className="rounded border border-border-default bg-bg-primary/60 px-1.5 py-0.5 text-[10px] text-text-secondary hover:bg-bg-tertiary"
            title="Показать все"
            onClick={() => setFilterTone(null)}
          >
            {HEALTH_FILTER_META[filterTone].label} ×
          </button>
        )}
        {network?.proxyEnabled && (
          <span
            className="text-[10px] uppercase tracking-[0.06em] text-text-muted"
            title={network.proxyUrl}
          >
            proxy
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            className="ui-chrome-btn"
            disabled={running}
            onClick={() => void run(profiles)}
          >
            Повторить
          </button>
          <button type="button" className="ui-chrome-btn" onClick={() => setOpen(true)}>
            Настройки
          </button>
          <button type="button" className="ui-chrome-btn text-text-muted" onClick={() => dismiss()}>
            Скрыть
          </button>
        </div>
      </div>
      <div className="max-h-28 overflow-y-auto overscroll-contain">
        {ordered.length === 0 ? (
          <p className="px-1 py-1 text-[11px] text-text-muted">
            {running ? "Идёт проверка…" : "Нет API в этой категории"}
          </p>
        ) : (
          groups.map(({ key, rows }) => (
            <div key={key} className="mb-0.5">
              {!filterTone && (
                <div className="sticky top-0 z-[1] flex items-center gap-1.5 bg-bg-secondary/95 px-1 py-0.5 text-[10px] text-text-muted">
                  <span className={`h-1.5 w-1.5 rounded-full ${HEALTH_FILTER_META[key].dot}`} />
                  <span className="font-mono">{HEALTH_FILTER_META[key].short}</span>
                  <span>{HEALTH_FILTER_META[key].label}</span>
                  <span className="font-mono tabular-nums">({rows.length})</span>
                </div>
              )}
              <ul className="flex flex-col gap-0.5">
                {rows.map((item) => (
                  <HealthRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HealthRow({ item }: { item: ApiHealthItem }) {
  return (
    <li
      className={`flex min-w-0 items-center gap-1.5 truncate border-l-2 bg-bg-primary/40 py-0.5 pl-2 pr-1 text-[11px] ${toneClass(item.tone)}`}
      title={`${item.baseUrl}\n${item.message}${
        item.httpStatus != null ? `\nHTTP ${item.httpStatus}` : ""
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(item.tone)}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
      <span className="min-w-0 max-w-[45%] truncate text-text-secondary">{item.message}</span>
      {item.latencyMs != null && (
        <span className="shrink-0 font-mono tabular-nums text-text-muted">{item.latencyMs}ms</span>
      )}
    </li>
  );
}

function groupVisibleItems(
  list: ApiHealthItem[],
  filter: HealthFilterKey | null,
): { key: HealthFilterKey; rows: ApiHealthItem[] }[] {
  if (filter) {
    return list.length ? [{ key: filter, rows: list }] : [];
  }
  return HEALTH_FILTER_KEYS.map((key) => ({
    key,
    rows: list.filter((i) => resolveHealthFilterKey(i) === key),
  })).filter((g) => g.rows.length > 0);
}

function FilterCountButton({
  filterKey,
  active,
  count,
  onToggle,
}: {
  filterKey: HealthFilterKey;
  active: boolean;
  count: number;
  onToggle: (tone: HealthFilterKey | null) => void;
}) {
  const meta = HEALTH_FILTER_META[filterKey];
  return (
    <button
      type="button"
      title={active ? "Показать все" : `${meta.label} — ${meta.hint}`}
      aria-pressed={active}
      className={`rounded px-0.5 hover:text-text-primary ${
        active ? "bg-bg-tertiary text-text-primary" : ""
      }`}
      onClick={() => onToggle(filterKey)}
    >
      {meta.short} {count}
    </button>
  );
}
