import { describe, expect, it } from "vitest";
import { buildSystemPrompt, prepareApiMessages } from "./ContextManager";
import type { ChatMessage } from "@/types";

function msg(partial: Partial<ChatMessage> & { role: ChatMessage["role"] }): ChatMessage {
  return {
    id: crypto.randomUUID(),
    content: "",
    createdAt: Date.now(),
    ...partial,
  };
}

describe("buildSystemPrompt", () => {
  it("embeds workspace and Cursor-like rules", () => {
    const p = buildSystemPrompt("C:\\Users\\UskovAA\\Documents\\LLM_agent", "win32");
    expect(p).toContain("C:\\Users\\UskovAA\\Documents\\LLM_agent");
    expect(p).toContain("Cursor Composer");
    expect(p).toContain("TOOL_CALL");
    expect(p).toContain("read_file");
    expect(p).toMatch(/NEVER use shell: find/i);
    expect(p).not.toContain("{WORKING_DIR}");
    expect(p).toContain("Online mode");
  });

  it("includes skills block when provided", () => {
    const p = buildSystemPrompt("/w", "linux", "\n## Skills\n- skill-finder");
    expect(p).toContain("skill-finder");
  });

  it("includes reviewer role block", () => {
    const p = buildSystemPrompt("/w", "linux", "", "reviewer");
    expect(p).toContain("CODE REVIEWER");
    expect(p).toMatch(/Prefer read\/grep/i);
  });

  it("includes refactor role block", () => {
    const p = buildSystemPrompt("/w", "linux", "", "refactor");
    expect(p).toContain("REFACTOR");
    expect(p).toMatch(/behavior-preserving/i);
  });

  it("marks offline mode for local 7B", () => {
    const p = buildSystemPrompt("/w", "win32", "", "default", true);
    expect(p).toContain("Offline mode");
    expect(p).toContain("7B");
    expect(p).not.toContain("Online mode");
  });

  it("includes success RAG block", () => {
    const p = buildSystemPrompt("/w", "linux", "", "default", false, "\n## Past successful tasks\n1. Q");
    expect(p).toContain("Past successful tasks");
  });
});

describe("prepareApiMessages", () => {
  it("strips trailing empty streaming assistant (Yandex 3230)", () => {
    const prepared = prepareApiMessages([
      msg({ role: "system", content: "sys" }),
      msg({ role: "user", content: "hi" }),
      msg({ role: "assistant", content: "", streaming: true }),
    ]);
    expect(prepared.map((m) => m.role)).toEqual(["system", "user"]);
  });

  it("keeps tool turn ending on tool", () => {
    const prepared = prepareApiMessages([
      msg({ role: "user", content: "go" }),
      msg({
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "c1",
            type: "function",
            function: { name: "read_file", arguments: "{}" },
          },
        ],
      }),
      msg({ role: "tool", content: "ok", tool_call_id: "c1", name: "read_file" }),
      msg({ role: "assistant", content: "", streaming: true }),
    ]);
    expect(prepared.at(-1)?.role).toBe("tool");
  });

  it("drops finished trailing assistant so last is user", () => {
    const prepared = prepareApiMessages([
      msg({ role: "user", content: "a" }),
      msg({ role: "assistant", content: "done" }),
      msg({ role: "user", content: "b" }),
      msg({ role: "assistant", content: "old" }),
    ]);
    expect(prepared.at(-1)?.role).toBe("user");
    expect(prepared.at(-1)?.content).toBe("b");
  });
});
