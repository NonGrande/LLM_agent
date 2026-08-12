import { describe, expect, it } from "vitest";
import {
  buildSettingsExport,
  isNewerVersion,
  parseSettingsImport,
} from "./settingsTransfer";
import { DEFAULT_SETTINGS } from "@/types";

describe("settingsTransfer", () => {
  it("round-trips export/import", () => {
    const payload = buildSettingsExport(DEFAULT_SETTINGS, { stripSecrets: true });
    expect(payload.format).toBe("llm-shell-settings");
    expect(payload.settings.provider.apiKey).toBe("");
    const raw = JSON.stringify(payload);
    const back = parseSettingsImport(raw);
    expect(back.appearance.theme).toBe(DEFAULT_SETTINGS.appearance.theme);
  });

  it("compares versions", () => {
    expect(isNewerVersion("0.3.0", "0.2.0")).toBe(true);
    expect(isNewerVersion("0.2.0", "0.3.0")).toBe(false);
    expect(isNewerVersion("v0.3.0", "0.3.0")).toBe(false);
  });
});
