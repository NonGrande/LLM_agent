import { describe, expect, it } from "vitest";
import { buildHandoffPacket, shouldAttemptHandoff } from "./handoff";
import type { ToolExecution } from "@/types";

function tool(partial: Partial<ToolExecution>): ToolExecution {
  return {
    id: "1",
    toolCallId: "c1",
    toolName: "list_files",
    args: { path: "C:/proj/docs" },
    status: "success",
    startedAt: 1,
    ...partial,
  };
}

describe("handoff", () => {
  it("builds compact packet with tools and draft", () => {
    const packet = buildHandoffPacket({
      userGoal: "сверь TZ с реализацией",
      partialAssistant: "Для сверки заложенного в ТЗ…",
      toolLog: [tool({})],
      reason: "Stream idle timeout",
      fromModel: "mistral-large-latest",
      toModel: "gpt-4o",
    });
    expect(packet).toContain("[Model handoff");
    expect(packet).toContain("list_files");
    expect(packet).toContain("C:/proj/docs");
    expect(packet).toContain("Partial draft");
    expect(packet).not.toContain("Restart discovery from list_files of the whole disk");
  });

  it("skips handoff on user abort", () => {
    expect(shouldAttemptHandoff("Aborted")).toBe(false);
    expect(shouldAttemptHandoff("Stream idle timeout")).toBe(true);
  });
});
