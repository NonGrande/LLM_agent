import { useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

type Mode = "pick" | "online" | "offline";

export function FirstRunWizard() {
  const settings = useSettingsStore((s) => s.settings);
  const setOfflineMode = useSettingsStore((s) => s.setOfflineMode);
  const setActiveProfile = useSettingsStore((s) => s.setActiveProfile);
  const updateProvider = useSettingsStore((s) => s.updateProvider);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const openSettings = useSettingsStore((s) => s.openSettings);

  const [step, setStep] = useState<Mode>("pick");
  const [profileId, setProfileId] = useState(
    () =>
      settings.apiProfiles.find((p) => p.id === "profile-openrouter")?.id ??
      settings.apiProfiles.find((p) => p.type === "openrouter")?.id ??
      settings.apiProfiles[0]?.id ??
      "",
  );
  const [apiKey, setApiKey] = useState("");

  const cloudProfiles = settings.apiProfiles.filter((p) => p.type !== "ollama");

  const finishOnline = () => {
    if (profileId) setActiveProfile(profileId);
    setOfflineMode(false);
    if (apiKey.trim()) updateProvider({ apiKey: apiKey.trim() });
    completeOnboarding();
  };

  const finishOffline = () => {
    setOfflineMode(true);
    completeOnboarding();
  };

  return (
    <div className="ui-modal-scrim fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-run-title"
        className="w-full max-w-md rounded-lg border border-border-default bg-bg-secondary p-5 shadow-xl"
      >
        <h2 id="first-run-title" className="mb-1 text-base font-semibold text-text-primary">
          Добро пожаловать в LLM Shell
        </h2>
        <p className="mb-4 text-[13px] leading-relaxed text-text-secondary">
          Выберите режим работы. Настройки можно изменить позже в Settings.
        </p>

        {step === "pick" && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="rounded border border-border-default bg-bg-primary px-3 py-2 text-left text-[13px] hover:border-accent-blue"
              onClick={() => setStep("online")}
            >
              <span className="font-medium text-text-primary">Online</span>
              <span className="mt-0.5 block text-[11px] text-text-muted">
                OpenRouter, xAI, Yandex и другие облачные API
              </span>
            </button>
            <button
              type="button"
              className="rounded border border-border-default bg-bg-primary px-3 py-2 text-left text-[13px] hover:border-accent-blue"
              onClick={() => setStep("offline")}
            >
              <span className="font-medium text-text-primary">Offline</span>
              <span className="mt-0.5 block text-[11px] text-text-muted">
                Локальный Ollama (http://localhost:11434)
              </span>
            </button>
          </div>
        )}

        {step === "online" && (
          <div className="space-y-3">
            <label className="block text-[12px]">
              <span className="text-text-secondary">Профиль</span>
              <select
                className="mt-1 w-full rounded border border-border-default bg-bg-primary px-2 py-1.5 text-[13px]"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              >
                {cloudProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px]">
              <span className="text-text-secondary">API key</span>
              <input
                type="password"
                autoComplete="off"
                className="mt-1 w-full rounded border border-border-default bg-bg-primary px-2 py-1.5 font-mono text-[13px]"
                placeholder="sk-…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </label>
            <div className="flex justify-between gap-2 pt-1">
              <button type="button" className="ui-chrome-btn px-3 py-1.5" onClick={() => setStep("pick")}>
                Назад
              </button>
              <button
                type="button"
                className="rounded bg-accent-blue px-3 py-1.5 text-[13px] text-white hover:brightness-110"
                onClick={finishOnline}
              >
                Готово
              </button>
            </div>
          </div>
        )}

        {step === "offline" && (
          <div className="space-y-3">
            <p className="text-[12px] leading-relaxed text-text-secondary">
              Убедитесь, что Ollama запущена. Будет активирован профиль Ollama (7B). Облачные API не
              используются, пока не отключите Offline mode в Settings.
            </p>
            <div className="flex justify-between gap-2">
              <button type="button" className="ui-chrome-btn px-3 py-1.5" onClick={() => setStep("pick")}>
                Назад
              </button>
              <button
                type="button"
                className="rounded bg-accent-blue px-3 py-1.5 text-[13px] text-white hover:brightness-110"
                onClick={finishOffline}
              >
                Использовать Ollama
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          className="mt-4 text-[11px] text-text-muted underline hover:text-text-secondary"
          onClick={() => {
            completeOnboarding();
            openSettings("api");
          }}
        >
          Пропустить → открыть Settings
        </button>
      </div>
    </div>
  );
}
