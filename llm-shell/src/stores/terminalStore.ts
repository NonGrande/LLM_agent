import { create } from "zustand";
import { executeCommandStreaming, killProcess } from "@/services/tauri/shell";
import { isTauri } from "@/utils/env";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

interface TerminalState {
  open: boolean;
  lines: string[];
  runningPid: number | null;
  channel: string | null;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  clear: () => void;
  append: (line: string) => void;
  run: (command: string, cwd?: string) => Promise<void>;
  stop: () => Promise<void>;
}

let unlisten: UnlistenFn | null = null;

export const useTerminalStore = create<TerminalState>((set, get) => ({
  open: false,
  lines: [],
  runningPid: null,
  channel: null,

  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  clear: () => set({ lines: [] }),
  append: (line) =>
    set((s) => ({
      lines: [...s.lines, line].slice(-2000),
    })),

  run: async (command, cwd) => {
    const cmd = command.trim();
    if (!cmd) return;
    get().append(`$ ${cmd}`);

    if (!isTauri()) {
      get().append("(terminal requires Tauri)");
      return;
    }

    if (get().runningPid != null) {
      get().append("(busy — stop current process first)");
      return;
    }

    void unlisten?.();
    unlisten = null;

    const channel = `term-${crypto.randomUUID()}`;
    set({ channel });

    unlisten = await listen<{
      type: string;
      line?: string;
      code?: number | null;
      message?: string;
    }>(channel, (ev) => {
      const p = ev.payload;
      if (p.type === "stdout" && p.line != null) get().append(p.line);
      else if (p.type === "stderr" && p.line != null) get().append(p.line);
      else if (p.type === "exit") {
        get().append(`[exit ${p.code ?? "?"}]`);
        set({ runningPid: null, channel: null });
        void unlisten?.();
        unlisten = null;
      } else if (p.type === "error") {
        get().append(`[error] ${p.message ?? "unknown"}`);
        set({ runningPid: null, channel: null });
        void unlisten?.();
        unlisten = null;
      }
    });

    try {
      const pid = await executeCommandStreaming(cmd, cwd, channel);
      set({ runningPid: pid });
    } catch (err) {
      get().append(`[error] ${err instanceof Error ? err.message : String(err)}`);
      set({ runningPid: null, channel: null });
      void unlisten?.();
      unlisten = null;
    }
  },

  stop: async () => {
    const pid = get().runningPid;
    if (pid == null) return;
    try {
      await killProcess(pid);
      get().append(`[killed pid ${pid}]`);
    } catch (err) {
      get().append(`[kill failed] ${err instanceof Error ? err.message : String(err)}`);
    }
    set({ runningPid: null, channel: null });
    void unlisten?.();
    unlisten = null;
  },
}));
