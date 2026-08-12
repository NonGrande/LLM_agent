import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/utils/constants";

export const LAYOUT_MIN = {
  left: 180,
  right: 240,
  center: 280,
  sessions: 80,
  files: 100,
  terminal: 120,
  bottomPanel: 80,
} as const;

export const LAYOUT_DEFAULTS = {
  leftWidth: 248,
  rightWidth: 420,
  sessionsHeight: 200,
  terminalHeight: 200,
  bottomPanelHeight: 160,
} as const;

/** split = chat center + editor right; chat = editor hidden; editor = editor center + chat right */
export type PanelFocus = "split" | "chat" | "editor";

interface LayoutState {
  leftWidth: number;
  rightWidth: number;
  sessionsHeight: number;
  terminalHeight: number;
  bottomPanelHeight: number;
  panelFocus: PanelFocus;
  setLeftWidth: (width: number) => void;
  setRightWidth: (width: number) => void;
  setSessionsHeight: (height: number) => void;
  setTerminalHeight: (height: number) => void;
  setBottomPanelHeight: (height: number) => void;
  setPanelFocus: (focus: PanelFocus) => void;
  cyclePanelFocus: () => void;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const FOCUS_ORDER: PanelFocus[] = ["split", "chat", "editor"];

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      ...LAYOUT_DEFAULTS,
      panelFocus: "split",

      setLeftWidth: (width) =>
        set({ leftWidth: clamp(width, LAYOUT_MIN.left, 560) }),

      setRightWidth: (width) =>
        set({ rightWidth: clamp(width, LAYOUT_MIN.right, 800) }),

      setSessionsHeight: (height) =>
        set({ sessionsHeight: clamp(height, LAYOUT_MIN.sessions, 480) }),

      setTerminalHeight: (height) =>
        set({ terminalHeight: clamp(height, LAYOUT_MIN.terminal, 480) }),

      setBottomPanelHeight: (height) =>
        set({ bottomPanelHeight: clamp(height, LAYOUT_MIN.bottomPanel, 400) }),

      setPanelFocus: (panelFocus) => set({ panelFocus }),

      cyclePanelFocus: () => {
        const cur = get().panelFocus;
        const i = FOCUS_ORDER.indexOf(cur);
        set({ panelFocus: FOCUS_ORDER[(i + 1) % FOCUS_ORDER.length]! });
      },
    }),
    {
      name: STORAGE_KEYS.LAYOUT,
      partialize: (s) => ({
        leftWidth: s.leftWidth,
        rightWidth: s.rightWidth,
        sessionsHeight: s.sessionsHeight,
        terminalHeight: s.terminalHeight,
        bottomPanelHeight: s.bottomPanelHeight,
        panelFocus: s.panelFocus,
      }),
    },
  ),
);
