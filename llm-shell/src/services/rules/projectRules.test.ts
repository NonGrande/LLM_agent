import { describe, expect, it } from "vitest";
import {
  PINNED_RULES_MARKER,
  condenseRuleFromAnswer,
  agentsMdPath,
} from "./projectRules";

describe("projectRules", () => {
  it("condenseRuleFromAnswer strips code blocks", () => {
    const raw = "Always use tools.\n\n```python\nprint(1)\n```\nDone.";
    expect(condenseRuleFromAnswer(raw)).toBe("Always use tools.\n\nDone.");
  });

  it("truncates long answers", () => {
    const long = "x".repeat(800);
    expect(condenseRuleFromAnswer(long).length).toBeLessThanOrEqual(602);
  });

  it("agentsMdPath normalizes slashes", () => {
    expect(agentsMdPath("C:\\proj\\")).toBe("C:/proj/AGENTS.md");
  });

  it("marker is stable", () => {
    expect(PINNED_RULES_MARKER).toContain("Pinned rules");
  });
});
