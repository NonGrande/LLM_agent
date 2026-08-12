import { describe, expect, it, vi, beforeEach } from "vitest";
import { runAgentLoop } from "./AgentLoop";
import { createDefaultToolRegistry } from "./tools";
import { DEFAULT_SETTINGS } from "@/types";
import { useChatStore } from "@/stores/chatStore";
import { useAgentStore } from "@/stores/agentStore";
import type { StreamEvent } from "@/services/llm/types";
import type { ToolCall } from "@/types";

vi.mock("@/services/tauri/fs", () => ({
  readFile: vi.fn(async () => ({ path: "", content: "", size: 0, is_binary: false, encoding: "utf-8" })),
  writeFile: vi.fn(async () => undefined),
}));

vi.mock("@/services/memory/successMemory", () => ({
  getRelevantSuccessMemoryBlock: vi.fn(async () => ""),
  recordSuccessTask: vi.fn(async () => undefined),
}));

vi.mock("@/services/skills/SkillRegistry", () => ({
  getSkillRegistry: () => ({
    load: vi.fn(async () => undefined),
    list: () => [],
  }),
}));

import { writeFile } from "@/services/tauri/fs";

function mockClient(streams: StreamEvent[][]) {
  let call = 0;
  return {
    streamChat: vi.fn(async function* () {
      const events = streams[call] ?? [{ type: "done" as const }];
      call += 1;
      for (const ev of events) yield ev;
    }),
    cancel: vi.fn(),
    updateConfig: vi.fn(),
  };
}

describe("agent loop UI e2e (mock LLM)", () => {
  beforeEach(() => {
    useChatStore.setState({
      sessions: [],
      currentSessionId: "",
      isStreaming: false,
      draft: "",
    });
    useChatStore.getState().newSession("project-default");
    useAgentStore.setState({
      status: "idle",
      iteration: 0,
      toolLog: [],
      pendingPermission: null,
    });
    vi.mocked(writeFile).mockClear();
  });

  it("executes write_file from mocked tool_calls", async () => {
    const toolCall: ToolCall = {
      id: "call-1",
      type: "function",
      function: {
        name: "write_file",
        arguments: JSON.stringify({
          filePath: "C:/tmp/agent-e2e.txt",
          content: "hello mock",
        }),
      },
    };

    const client = mockClient([
      [{ type: "tool_calls", toolCalls: [toolCall] }, { type: "done" }],
      [{ type: "content", text: "Done." }, { type: "done" }],
    ]);

    const settings = {
      ...DEFAULT_SETTINGS,
      agent: {
        ...DEFAULT_SETTINGS.agent,
        autoExecute: true,
        workingDirectory: "C:/tmp",
      },
      workspace: { ...DEFAULT_SETTINGS.workspace, path: "C:/tmp" },
    };

    await runAgentLoop("create file", {
      client: client as unknown as import("@/services/llm/LLMClient").LLMClient,
      registry: createDefaultToolRegistry(),
      settings,
    });

    expect(writeFile).toHaveBeenCalledWith("C:/tmp/agent-e2e.txt", "hello mock");
    const messages = useChatStore.getState().currentSession().messages;
    const assistantTexts = messages
      .filter((m) => m.role === "assistant")
      .map((m) => (typeof m.content === "string" ? m.content : ""));
    expect(assistantTexts.some((t) => t.includes("Done"))).toBe(true);
    expect(useAgentStore.getState().status).toBe("idle");
  });

  it("strictTools retries once when first reply has no tool_calls", async () => {
    const toolCall: ToolCall = {
      id: "call-strict",
      type: "function",
      function: {
        name: "write_file",
        arguments: JSON.stringify({
          filePath: "C:/tmp/strict.txt",
          content: "strict ok",
        }),
      },
    };

    const client = mockClient([
      [{ type: "content", text: "I will create the file with Python..." }, { type: "done" }],
      [{ type: "tool_calls", toolCalls: [toolCall] }, { type: "done" }],
      [{ type: "content", text: "Created." }, { type: "done" }],
    ]);

    const settings = {
      ...DEFAULT_SETTINGS,
      agent: {
        ...DEFAULT_SETTINGS.agent,
        autoExecute: true,
        strictTools: true,
        mode: "agent" as const,
        workingDirectory: "C:/tmp",
      },
      workspace: { ...DEFAULT_SETTINGS.workspace, path: "C:/tmp" },
    };

    await runAgentLoop("create strict.txt", {
      client: client as unknown as import("@/services/llm/LLMClient").LLMClient,
      registry: createDefaultToolRegistry(),
      settings,
    });

    expect(client.streamChat).toHaveBeenCalled();
    // First stream + strict nudge retry + final answer after tool
    expect(client.streamChat.mock.calls.length).toBeGreaterThanOrEqual(2);
    const secondCallArgs = client.streamChat.mock.calls[1]?.[0] as {
      tool_choice?: string;
      messages?: { role: string; content: unknown }[];
    };
    expect(secondCallArgs?.tool_choice).toBe("required");
    const nudgeSeen = (secondCallArgs?.messages ?? []).some(
      (m) =>
        m.role === "user" &&
        typeof m.content === "string" &&
        m.content.includes("MUST emit tool_calls"),
    );
    expect(nudgeSeen).toBe(true);
    expect(writeFile).toHaveBeenCalledWith("C:/tmp/strict.txt", "strict ok");
  });

  it("Ask mode does not strictTools-retry on prose-only reply", async () => {
    const client = mockClient([
      [{ type: "content", text: "Here is my analysis without tools." }, { type: "done" }],
    ]);

    const settings = {
      ...DEFAULT_SETTINGS,
      agent: {
        ...DEFAULT_SETTINGS.agent,
        autoExecute: true,
        strictTools: true,
        mode: "ask" as const,
        workingDirectory: "C:/tmp",
      },
      workspace: { ...DEFAULT_SETTINGS.workspace, path: "C:/tmp" },
    };

    await runAgentLoop("explain something", {
      client: client as unknown as import("@/services/llm/LLMClient").LLMClient,
      registry: createDefaultToolRegistry(),
      settings,
    });

    expect(client.streamChat).toHaveBeenCalledTimes(1);
    expect(useAgentStore.getState().status).toBe("idle");
  });
});
