import { create } from "zustand";
import type { AgentStatus, ToolExecution, PermissionRequest } from "@/types";

interface AgentState {
  status: AgentStatus;
  iteration: number;
  maxIterations: number;
  toolLog: ToolExecution[];
  pendingPermission: PermissionRequest | null;
  contextTokens: number;
  /** Currently active model (may differ from settings after failover) */
  activeModel: string;
  /** Skill names injected for the current turn */
  activeSkills: string[];

  setStatus: (status: AgentStatus) => void;
  setIteration: (n: number) => void;
  setMaxIterations: (n: number) => void;
  setContextTokens: (n: number) => void;
  setActiveModel: (model: string) => void;
  setActiveSkills: (names: string[]) => void;
  pushTool: (tool: ToolExecution) => void;
  updateTool: (id: string, partial: Partial<ToolExecution>) => void;
  clearLog: () => void;
  requestPermission: (req: Omit<PermissionRequest, "resolve">) => Promise<boolean>;
  resolvePermission: (granted: boolean) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  status: "idle",
  iteration: 0,
  maxIterations: 25,
  toolLog: [],
  pendingPermission: null,
  contextTokens: 0,
  activeModel: "",
  activeSkills: [],

  setStatus: (status) => set({ status }),
  setIteration: (n) => set({ iteration: n }),
  setMaxIterations: (n) => set({ maxIterations: n }),
  setContextTokens: (n) => set({ contextTokens: n }),
  setActiveModel: (model) => set({ activeModel: model }),
  setActiveSkills: (names) => set({ activeSkills: names }),

  pushTool: (tool) => set((s) => ({ toolLog: [...s.toolLog, tool] })),

  updateTool: (id, partial) =>
    set((s) => ({
      toolLog: s.toolLog.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    })),

  clearLog: () => set({ toolLog: [], iteration: 0, status: "idle", activeSkills: [] }),

  requestPermission: (req) =>
    new Promise<boolean>((resolve) => {
      set({
        status: "waiting_confirmation",
        pendingPermission: {
          ...req,
          resolve: (granted) => {
            resolve(granted);
            set({ pendingPermission: null, status: granted ? "executing_tool" : "idle" });
          },
        },
      });
    }),

  resolvePermission: (granted) => {
    get().pendingPermission?.resolve(granted);
  },
}));
