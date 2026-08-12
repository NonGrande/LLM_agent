import { describe, expect, it, beforeEach } from "vitest";
import { __resetSubagentDepth, createSubagentRegistry, runSubagentTask } from "./subagent";
import type { LLMClient } from "@/services/llm/LLMClient";
import { DEFAULT_SETTINGS } from "@/types";

describe("subagent", () => {
  beforeEach(() => {
    __resetSubagentDepth();
  });

  it("explore registry excludes write and run_subagent", async () => {
    const r = await createSubagentRegistry("explore");
    expect(r.get("read_file")).toBeTruthy();
    expect(r.get("write_file")).toBeFalsy();
    expect(r.get("run_subagent")).toBeFalsy();
  });

  it("edit registry includes write_file", async () => {
    const r = await createSubagentRegistry("edit");
    expect(r.get("write_file")).toBeTruthy();
    expect(r.get("run_subagent")).toBeFalsy();
  });

  it("rejects empty task", async () => {
    const client = {} as LLMClient;
    const res = await runSubagentTask({
      task: "  ",
      client,
      settings: DEFAULT_SETTINGS,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Empty/);
  });
});
