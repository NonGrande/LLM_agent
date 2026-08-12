import type { AgentMode } from "@/types";
import { useSettingsStore } from "@/stores/settingsStore";

const MODES: { id: AgentMode; label: string; title: string }[] = [
  { id: "ask", label: "Ask", title: "Read-only tools" },
  { id: "agent", label: "Agent", title: "Full tools" },
  { id: "plan", label: "Plan", title: "No tools — markdown plan only" },
];

export function AgentModeToggle() {
  const mode = useSettingsStore((s) => s.settings.agent.mode ?? "agent");
  const updateAgent = useSettingsStore((s) => s.updateAgent);

  return (
    <div
      className="flex items-center rounded border border-border-default bg-bg-primary p-0.5"
      role="group"
      aria-label="Agent mode"
    >
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            title={m.title}
            className={`rounded px-2 py-0.5 text-[11px] ${
              active
                ? "bg-accent-blue text-white"
                : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            }`}
            onClick={() => updateAgent({ mode: m.id })}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
