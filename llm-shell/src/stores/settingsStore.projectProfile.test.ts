import { describe, expect, it, beforeEach } from "vitest";
import { ensureProfiles, useSettingsStore } from "@/stores/settingsStore";
import { DEFAULT_SETTINGS } from "@/types";

describe("project profile binding", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: ensureProfiles({
        ...DEFAULT_SETTINGS,
        projects: [
          {
            id: "p1",
            name: "app",
            path: "C:/app",
            lastOpenedAt: 1,
          },
        ],
        activeProjectId: "p1",
      }),
    });
  });

  it("setProjectProfile stores activeProfileId on project", () => {
    useSettingsStore.getState().setProjectProfile("p1", "profile-xai");
    const s = useSettingsStore.getState().settings;
    expect(s.projects[0].activeProfileId).toBe("profile-xai");
    expect(s.activeProfileId).toBe("profile-xai");
  });

  it("migrates onboardingCompleted when api key exists", () => {
    const migrated = ensureProfiles({
      ...DEFAULT_SETTINGS,
      apiProfiles: DEFAULT_SETTINGS.apiProfiles.map((p) =>
        p.id === "profile-openrouter" ? { ...p, apiKey: "sk-test" } : p,
      ),
      onboardingCompleted: undefined,
    });
    expect(migrated.onboardingCompleted).toBe(true);
  });
});
