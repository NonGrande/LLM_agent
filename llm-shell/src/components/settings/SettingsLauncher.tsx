import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  SETTINGS_MODULES,
  SETTINGS_MODULE_META,
} from "@/components/settings/settingsModules";

/** Compact header launcher — opens one settings module modal. */
export function SettingsLauncher() {
  const [open, setOpen] = useState(false);
  const openSettings = useSettingsStore((s) => s.openSettings);
  const rootRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="ui-chrome-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Настройки по модулям"
        onClick={() => setOpen((v) => !v)}
      >
        ⚙ Settings
      </button>
      {open && (
        <div
          role="menu"
          className="ui-card absolute left-0 top-full z-50 mt-1 w-64 p-1.5 shadow-lg"
        >
          <div className="ui-section-label px-1.5 pb-1 pt-0.5">Модули</div>
          <div className="grid grid-cols-1 gap-0.5">
            {SETTINGS_MODULES.map((mod) => {
              const meta = SETTINGS_MODULE_META[mod];
              return (
                <button
                  key={mod}
                  type="button"
                  role="menuitem"
                  className="flex w-full flex-col items-start rounded px-2 py-1.5 text-left hover:bg-bg-tertiary"
                  onClick={() => {
                    setOpen(false);
                    openSettings(mod);
                  }}
                >
                  <span className="text-[12px] font-medium text-text-primary">{meta.title}</span>
                  <span className="text-[10px] text-text-muted">{meta.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
