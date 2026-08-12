import { describe, expect, it, beforeEach } from "vitest";
import { useDiagnosticsStore } from "@/stores/diagnosticsStore";

describe("diagnosticsStore", () => {
  beforeEach(() => {
    useDiagnosticsStore.getState().clearAll();
  });

  it("stores by normalized path", () => {
    useDiagnosticsStore.getState().setForUri("file:///C:/proj/a.ts", [
      { message: "err", severity: 1, line: 0, character: 0, endLine: 0, endCharacter: 1 },
    ]);
    const all = useDiagnosticsStore.getState().all();
    expect(all.length).toBe(1);
    expect(all[0]!.diagnostics[0]!.message).toBe("err");
  });

  it("counts errors and warnings", () => {
    useDiagnosticsStore.getState().setForUri("file:///a.ts", [
      { message: "e", severity: 1, line: 0, character: 0, endLine: 0, endCharacter: 1 },
      { message: "w", severity: 2, line: 1, character: 0, endLine: 1, endCharacter: 1 },
    ]);
    expect(useDiagnosticsStore.getState().count()).toEqual({ errors: 1, warnings: 1 });
  });
});
