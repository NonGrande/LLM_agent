import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useIdeStore } from "@/stores/ideStore";
import { useDiagnosticsStore } from "@/stores/diagnosticsStore";

export interface IdeCommand {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  run: () => void | Promise<void>;
}

export function buildIdeCommands(): IdeCommand[] {
  return [
    {
      id: "file.quickOpen",
      label: "Go to File…",
      category: "File",
      shortcut: "Ctrl+P",
      run: () => useIdeStore.getState().setModal("quickOpen"),
    },
    {
      id: "file.findInFiles",
      label: "Find in Files",
      category: "File",
      shortcut: "Ctrl+Shift+F",
      run: () => useIdeStore.getState().setModal("find"),
    },
    {
      id: "edit.inlineEdit",
      label: "Inline Edit (selection)",
      category: "Edit",
      shortcut: "Ctrl+K",
      run: () => useIdeStore.getState().setModal("inlineEdit"),
    },
    {
      id: "view.toggleTerminal",
      label: "Toggle Terminal",
      category: "View",
      run: () => useTerminalStore.getState().toggle(),
    },
    {
      id: "view.cycleLayout",
      label: "Cycle Layout (Split / Chat / Editor)",
      category: "View",
      run: () => useLayoutStore.getState().cyclePanelFocus(),
    },
    {
      id: "view.problems",
      label: "Show Problems",
      category: "View",
      shortcut: "Ctrl+Shift+M",
      run: () => useIdeStore.getState().toggleBottomPanel("problems"),
    },
    {
      id: "view.outline",
      label: "Show Outline",
      category: "View",
      run: () => useIdeStore.getState().toggleBottomPanel("outline"),
    },
    {
      id: "chat.new",
      label: "New Chat",
      category: "Chat",
      run: () => {
        useChatStore.getState().newSession(useSettingsStore.getState().settings.activeProjectId);
      },
    },
    {
      id: "settings.open",
      label: "Open Settings",
      category: "Preferences",
      run: () => useSettingsStore.getState().openSettings(),
    },
    {
      id: "diagnostics.clear",
      label: "Clear Problems List",
      category: "Developer",
      run: () => useDiagnosticsStore.getState().clearAll(),
    },
  ];
}

export function filterCommands(commands: IdeCommand[], query: string): IdeCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((c) => {
    const hay = `${c.label} ${c.category} ${c.id}`.toLowerCase();
    return hay.includes(q) || q.split(/\s+/).every((w) => hay.includes(w));
  });
}
