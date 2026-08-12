import { describe, expect, it } from "vitest";
import {
  parseTaskPlan,
  formatPlanForChat,
  formatPlanForExecute,
  planPhaseUserNudge,
} from "./taskPlan";

describe("taskPlan", () => {
  it("parses bare JSON plan", () => {
    const raw = JSON.stringify({
      intake: "Add hello file",
      doneWhen: "File exists",
      steps: [
        { id: 1, goal: "Create file", tool: "write_file", argsHint: "C:/t/hello.txt" },
        { id: 2, goal: "Verify", tool: "read_file", argsHint: "C:/t/hello.txt" },
      ],
    });
    const p = parseTaskPlan(raw);
    expect(p?.steps).toHaveLength(2);
    expect(p?.steps[0].tool).toBe("write_file");
  });

  it("parses fenced JSON and skips bad steps", () => {
    const raw = "```json\n{\"intake\":\"x\",\"doneWhen\":\"y\",\"steps\":[{\"tool\":\"grep\",\"goal\":\"find\"},{\"tool\":\"\",\"goal\":\"bad\"}]}\n```";
    const p = parseTaskPlan(raw);
    expect(p?.steps).toHaveLength(1);
  });

  it("returns null on garbage", () => {
    expect(parseTaskPlan("I will create a file")).toBeNull();
  });

  it("formats chat and execute blocks", () => {
    const plan = parseTaskPlan(
      '{"intake":"T","doneWhen":"D","steps":[{"id":1,"goal":"g","tool":"read_file","argsHint":"p"}]}',
    )!;
    expect(formatPlanForChat(plan)).toContain("Execution plan");
    expect(formatPlanForChat(plan)).toContain("read_file");
    expect(formatPlanForExecute(plan)).toContain('"tool":"read_file"');
    expect(planPhaseUserNudge("do stuff")).toContain("User task:");
  });
});
