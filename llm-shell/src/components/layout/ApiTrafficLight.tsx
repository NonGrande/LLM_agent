import { useEffect, useMemo } from "react";
import { useApiHealthStore } from "@/stores/apiHealthStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { toneClass, toneDot } from "@/services/llm/probeApiHealth";
import { listGreenModelOptions } from "@/services/llm/greenModels";
import {
  HEALTH_FILTER_KEYS,
  HEALTH_FILTER_META,
  itemMatchesHealthFilter,
  resolveHealthFilterKey,
  type HealthFilterKey,
} from "@/services/llm/healthClassify";

export function ApiTrafficLight() {
  const running = useApiHealthStore((s) => s.running);
  const items = useApiHealthStore((s) => s.items);
  const filterTone = useApiHealthStore((s) => s.filterTone);
  const setFilterTone = useApiHealthStore((s) => s.setFilterTone);
  const run = useApiHealthStore((s) => s.run);
  const profiles = useSettingsStore((s) => s.settings.apiProfiles);
  const activeProfileId = useSettingsStore((s) => s.settings.activeProfileId);
  const currentModel = useSettingsStore((s) => s.settings.provider.model);
  const setActiveProfile = useSettingsStore((s) => s.setActiveProfile);
  const updateProvider = useSettingsStore((s) => s.updateProvider);
  const openSettings = useSettingsStore((s) => s.openSettings);

  useEffect(() => {
    if (!filterTone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterTone(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filterTone, setFilterTone]);

  const profileItems = items.filter((i) => i.kind === "profile");
  const counts = Object.fromEntries(
    HEALTH_FILTER_KEYS.map((key) => [
      key,
      profileItems.filter((i) => resolveHealthFilterKey(i) === key).length,
    ]),
  ) as Record<HealthFilterKey, number>;

  const filtered = filterTone
    ? items.filter((i) => i.kind === "profile" && itemMatchesHealthFilter(i, filterTone))
    : [];
  const openMeta = filterTone ? HEALTH_FILTER_META[filterTone] : null;

  const greenOptions = useMemo(
    () => listGreenModelOptions(profiles, items, activeProfileId),
    [profiles, items, activeProfileId],
  );

  const pickModel = (profileId: string, model: string) => {
    if (profileId !== activeProfileId) {
      setActiveProfile(profileId);
    }
    const after = useSettingsStore.getState().settings;
    if (after.provider.model !== model) {
      updateProvider({ model });
    }
    setFilterTone(null);
  };

  const isYellow =
    filterTone === "401" || filterTone === "402" || filterTone === "403";
  const isGreen = filterTone === "ok";
  const isRed = filterTone === "fail";

  return (
    <div className="relative ml-1 flex items-center gap-0.5">
      {HEALTH_FILTER_KEYS.map((key) => {
        const meta = HEALTH_FILTER_META[key];
        const count = counts[key];
        const active = filterTone === key;
        const title =
          key === "ok"
            ? `${count} доступны — выбрать модель для следующего запроса`
            : key === "fail"
              ? `${count} недоступны`
              : `${count} — ${meta.label} (${meta.hint})`;
        return (
          <button
            key={key}
            type="button"
            title={title}
            aria-label={title}
            aria-expanded={active}
            aria-pressed={active}
            className={`relative flex h-6 min-w-[1.5rem] items-center justify-center gap-0.5 rounded px-0.5 hover:bg-bg-tertiary ${
              active ? "bg-bg-tertiary" : ""
            }`}
            onClick={() => setFilterTone(key)}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${meta.dot} ${
                running ? "animate-pulse opacity-60" : ""
              }`}
              aria-hidden="true"
            />
            <span className="font-mono text-[9px] leading-none tabular-nums text-text-secondary">
              {meta.short}
            </span>
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-[12px] rounded bg-bg-primary px-0.5 text-center font-mono text-[9px] leading-3 tabular-nums text-text-secondary ring-1 ring-border-default">
                {count}
              </span>
            )}
          </button>
        );
      })}

      {filterTone && openMeta && (
        <div className="ui-card absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden shadow-lg">
          <div className="flex items-center gap-2 border-b border-border-default px-2.5 py-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${openMeta.dot}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="ui-section-label">
                {isGreen ? "Модели" : isRed ? "Недоступны" : "Диагностика"}
              </div>
              <span className="text-[12px] font-medium text-text-primary">
                {isGreen ? (
                  <>
                    <span className="font-mono tabular-nums">{greenOptions.length}</span> доступных
                  </>
                ) : (
                  <>
                    <span className="font-mono tabular-nums">{counts[filterTone]}</span>{" "}
                    {openMeta.label}
                  </>
                )}
              </span>
            </div>
            {running && (
              <span className="shrink-0 text-[10px] text-text-muted">проверка…</span>
            )}
          </div>

          {!isGreen && (
            <p className="border-b border-border-default px-2.5 py-1 text-[10px] text-text-muted">
              {openMeta.hint}
            </p>
          )}
          {isGreen && (
            <p className="border-b border-border-default px-2.5 py-1 text-[10px] text-text-muted">
              Модели активного профиля
            </p>
          )}

          <div className="max-h-56 overflow-y-auto overscroll-contain p-1.5">
            {isGreen ? (
              greenOptions.length === 0 ? (
                <p className="px-1.5 py-2 text-[11px] text-text-muted">
                  {running ? "Идёт проверка…" : "Нет доступных моделей"}
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5" role="listbox">
                  {greenOptions.map((opt) => {
                    const selected =
                      opt.profileId === activeProfileId && opt.model === currentModel;
                    return (
                      <li key={`${opt.profileId}:${opt.model}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`flex w-full min-w-0 items-center gap-1.5 truncate rounded border-l-2 py-1 pl-2 pr-1.5 text-left text-[11px] hover:bg-bg-tertiary ${
                            selected
                              ? "border-accent-green bg-bg-primary/60 text-text-primary"
                              : "border-transparent text-text-secondary"
                          }`}
                          onClick={() => pickModel(opt.profileId, opt.model)}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-green"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate font-mono">{opt.label}</span>
                          {selected && (
                            <span className="shrink-0 text-[9px] text-accent-green">●</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : filtered.length === 0 ? (
              <p className="px-1.5 py-2 text-[11px] text-text-muted">
                {running ? "Идёт проверка…" : "Нет API в этой категории"}
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {filtered.map((item) => (
                  <li
                    key={item.id}
                    title={`${item.baseUrl}\n${item.message}${
                      item.latencyMs != null ? `\n${item.latencyMs} ms` : ""
                    }${item.httpStatus != null ? `\nHTTP ${item.httpStatus}` : ""}`}
                    className={`flex min-w-0 items-start gap-1.5 border-l-2 bg-bg-primary/40 py-1 pl-2 pr-1 text-[11px] ${toneClass(item.tone)}`}
                  >
                    <span
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(item.tone)}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                        {(item.detailCode ?? item.httpStatus) != null && (
                          <span className="shrink-0 font-mono text-[9px] tabular-nums text-text-muted">
                            {item.detailCode ?? item.httpStatus}
                          </span>
                        )}
                      </div>
                      {(isYellow || isRed) && item.message && (
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-text-muted">
                          {item.message}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-1 border-t border-border-default px-1.5 py-1">
            {(isYellow || isRed || isGreen) && (
              <button
                type="button"
                className="ui-chrome-btn"
                disabled={running}
                onClick={() => void run(profiles)}
              >
                Повторить
              </button>
            )}
            {(isYellow || isRed) && (
              <button
                type="button"
                className="ui-chrome-btn"
                onClick={() => {
                  setFilterTone(null);
                  openSettings("api");
                }}
              >
                Хранилище API
              </button>
            )}
            <button
              type="button"
              className="ui-chrome-btn ml-auto text-text-muted"
              onClick={() => setFilterTone(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
