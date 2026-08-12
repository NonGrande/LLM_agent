import { useEffect } from "react";
import { lspSession } from "@/services/lsp/LspClient";
import { useDiagnosticsStore } from "@/stores/diagnosticsStore";
import { useSettingsStore } from "@/stores/settingsStore";

/** Aggregate LSP publishDiagnostics into diagnosticsStore (Problems panel). */
export function useLspDiagnosticsBridge() {
  const lspEnabled = useSettingsStore((s) => s.settings.editor?.lspEnabled);

  useEffect(() => {
    if (!lspEnabled) {
      useDiagnosticsStore.getState().clearAll();
      return;
    }
    return lspSession.onDiagnostics((uri, diags) => {
      useDiagnosticsStore.getState().setForUri(uri, diags);
    });
  }, [lspEnabled]);
}
