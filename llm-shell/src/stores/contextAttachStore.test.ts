import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/env", () => ({ isTauri: () => false }));

import { buildAttachedFilesContext } from "@/stores/contextAttachStore";

describe("buildAttachedFilesContext", () => {
  it("lists paths when not in Tauri", async () => {
    const block = await buildAttachedFilesContext(["C:\\docs\\STATUS.md"]);
    expect(block).toContain("Attached paths");
    expect(block).toContain("STATUS.md");
  });

  it("returns empty for no paths", async () => {
    expect(await buildAttachedFilesContext([])).toBe("");
  });
});
