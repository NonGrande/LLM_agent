import { create } from "zustand";

export type BottomPanelTab = "problems" | "outline";
export type IdeModal = "none" | "palette" | "quickOpen" | "find" | "inlineEdit";

export interface EditorSelectionSnapshot {
  path: string;
  text: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

interface IdeState {
  modal: IdeModal;
  bottomPanelOpen: boolean;
  bottomPanelTab: BottomPanelTab;
  selection: EditorSelectionSnapshot | null;
  setModal: (modal: IdeModal) => void;
  closeModal: () => void;
  toggleBottomPanel: (tab?: BottomPanelTab) => void;
  setBottomPanelTab: (tab: BottomPanelTab) => void;
  setSelection: (sel: EditorSelectionSnapshot | null) => void;
}

export const useIdeStore = create<IdeState>((set, get) => ({
  modal: "none",
  bottomPanelOpen: false,
  bottomPanelTab: "problems",
  selection: null,

  setModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: "none" }),

  toggleBottomPanel: (tab) => {
    const cur = get();
    if (tab && cur.bottomPanelOpen && cur.bottomPanelTab === tab) {
      set({ bottomPanelOpen: false });
      return;
    }
    set({
      bottomPanelOpen: true,
      bottomPanelTab: tab ?? cur.bottomPanelTab,
    });
  },

  setBottomPanelTab: (bottomPanelTab) => set({ bottomPanelTab, bottomPanelOpen: true }),
  setSelection: (selection) => set({ selection }),
}));
