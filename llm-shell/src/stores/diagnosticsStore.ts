import { create } from "zustand";
import type { LspDiagnostic } from "@/services/lsp/LspClient";
import { uriToPath } from "@/services/lsp/LspClient";

export interface FileDiagnostic {
  path: string;
  diagnostics: LspDiagnostic[];
}

interface DiagnosticsState {
  byPath: Record<string, LspDiagnostic[]>;
  setForUri: (uri: string, diagnostics: LspDiagnostic[]) => void;
  clearAll: () => void;
  all: () => FileDiagnostic[];
  count: () => { errors: number; warnings: number };
}

function normPath(uri: string): string {
  return uriToPath(uri).replace(/\//g, "\\");
}

export const useDiagnosticsStore = create<DiagnosticsState>((set, get) => ({
  byPath: {},

  setForUri: (uri, diagnostics) => {
    const path = normPath(uri);
    set((s) => {
      const next = { ...s.byPath };
      if (diagnostics.length === 0) delete next[path];
      else next[path] = diagnostics;
      return { byPath: next };
    });
  },

  clearAll: () => set({ byPath: {} }),

  all: () => {
    const entries = Object.entries(get().byPath);
    return entries
      .map(([path, diagnostics]) => ({ path, diagnostics }))
      .sort((a, b) => a.path.localeCompare(b.path));
  },

  count: () => {
    let errors = 0;
    let warnings = 0;
    for (const diags of Object.values(get().byPath)) {
      for (const d of diags) {
        if (d.severity <= 1) errors += 1;
        else if (d.severity === 2) warnings += 1;
      }
    }
    return { errors, warnings };
  },
}));
