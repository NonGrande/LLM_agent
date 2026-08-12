import { useEffect, useMemo, useRef, useState } from "react";
import { useApiHealthStore } from "@/stores/apiHealthStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { listGreenModelOptions } from "@/services/llm/greenModels";

export function ChatModelSelector() {
  const profiles = useSettingsStore((s) => s.settings.apiProfiles);
  const activeProfileId = useSettingsStore((s) => s.settings.activeProfileId);
  const currentModel = useSettingsStore((s) => s.settings.provider.model);
  const setActiveProfile = useSettingsStore((s) => s.setActiveProfile);
  const updateProvider = useSettingsStore((s) => s.updateProvider);
  const healthItems = useApiHealthStore((s) => s.items);
  const healthRunning = useApiHealthStore((s) => s.running);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const options = useMemo(
    () => listGreenModelOptions(profiles, healthItems, activeProfileId),
    [profiles, healthItems, activeProfileId],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find(
    (o) => o.profileId === activeProfileId && o.model === currentModel,
  );
  const buttonLabel =
    options.length === 0
      ? "нет доступных моделей"
      : (selected?.label ?? (currentModel || "модель…"));

  const disabled = options.length === 0;

  const pick = (profileId: string, model: string) => {
    if (profileId !== activeProfileId) {
      setActiveProfile(profileId);
    }
    const after = useSettingsStore.getState().settings;
    if (after.provider.model !== model) {
      updateProvider({ model });
    }
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        title={
          disabled
            ? healthRunning
              ? "Идёт проверка API…"
              : "Нет моделей с зелёным статусом API"
            : "Модели активного профиля (с ключом или локальный)"
        }
        aria-label={
          disabled
            ? "Нет доступных моделей"
            : `Модель: ${buttonLabel}`
        }
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex max-w-[260px] items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] transition-colors duration-100 ${
          disabled
            ? "cursor-not-allowed text-text-muted"
            : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
        } ${open ? "bg-bg-tertiary text-text-primary" : ""}`}
      >
        <span className="truncate font-mono" translate="no">
          {buttonLabel}
        </span>
        {!disabled && (
          <span className="shrink-0 text-[9px] text-text-muted" aria-hidden="true">
            ▾
          </span>
        )}
      </button>

      {open && !disabled && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 z-50 mb-1 max-h-64 min-w-[180px] max-w-[320px] overflow-y-auto overscroll-contain rounded border border-border-default bg-bg-secondary py-1 shadow-lg"
        >
          {options.map((opt) => {
            const isActive =
              opt.profileId === activeProfileId && opt.model === currentModel;
            return (
              <li key={`${opt.profileId}::${opt.model}`} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={`flex w-full items-center px-2.5 py-1.5 text-left text-[12px] font-mono hover:bg-bg-tertiary ${
                    isActive ? "text-accent-blue" : "text-text-primary"
                  }`}
                  onClick={() => pick(opt.profileId, opt.model)}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
