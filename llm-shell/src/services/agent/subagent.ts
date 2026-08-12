import type { AppSettings, ChatMessage, ToolCall } from "@/types";
import { LLMClient } from "@/services/llm/LLMClient";
import { ToolRegistry } from "@/services/agent/ToolRegistry";
import { extractToolCallsFromText } from "@/services/agent/parseTextToolCalls";
import { batchToolCalls } from "@/services/agent/parallelTools";
import { errorMessage } from "@/utils/errors";
import { ASK_MODE_TOOLS } from "@/services/agent/agentModes";

export type SubagentRole = "explore" | "edit" | "review";

export interface SubagentResult {
  ok: boolean;
  summary: string;
  toolsUsed: string[];
  iterations: number;
  error?: string;
}

/** Max nesting: parent may spawn one child; child cannot spawn. */
let subagentDepth = 0;

const EDIT_TOOLS = new Set([
  ...ASK_MODE_TOOLS,
  "write_file",
  "edit_file",
  "apply_patch",
  "create_directory",
]);

export async function createSubagentRegistry(role: SubagentRole = "explore"): Promise<ToolRegistry> {
  const { createDefaultToolRegistry } = await import("@/services/agent/tools/index");
  const full = createDefaultToolRegistry();
  const child = new ToolRegistry();
  const allow = role === "edit" ? EDIT_TOOLS : ASK_MODE_TOOLS;

  for (const h of full.list()) {
    if (h.name === "run_subagent") continue;
    if (allow.has(h.name)) child.register(h);
  }
  return child;
}

/**
 * Isolated mini-loop: does not touch chatStore / agentStore.
 * Returns a short summary for the parent agent.
 */
export async function runSubagentTask(opts: {
  task: string;
  role?: SubagentRole;
  maxIterations?: number;
  client: LLMClient;
  settings: AppSettings;
  abortSignal?: AbortSignal;
}): Promise<SubagentResult> {
  if (subagentDepth >= 1) {
    return {
      ok: false,
      summary: "",
      toolsUsed: [],
      iterations: 0,
      error: "Nested subagent not allowed (max depth 1)",
    };
  }

  const task = opts.task.trim();
  if (!task) {
    return { ok: false, summary: "", toolsUsed: [], iterations: 0, error: "Empty task" };
  }

  const role = opts.role ?? "explore";
  const maxIter = Math.min(Math.max(opts.maxIterations ?? 10, 1), 10);
  const registry = await createSubagentRegistry(role);
  const tools = registry.definitions();
  const toolsUsed: string[] = [];
  const model = opts.settings.provider.model;

  const messages: ChatMessage[] = [
    {
      id: crypto.randomUUID(),
      role: "system",
      content:
        `You are a focused subagent (${role}). Solve the task with tools. ` +
        `Be concise. Do not ask the user questions. Max ${maxIter} tool rounds.\n` +
        (role === "explore" || role === "review"
          ? "Read-only: do not modify files.\n"
          : "You may edit files when needed.\n"),
      createdAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      role: "user",
      content: task,
      createdAt: Date.now(),
    },
  ];

  subagentDepth += 1;
  let iterations = 0;
  let lastAssistant = "";

  try {
    for (let i = 0; i < maxIter; i++) {
      if (opts.abortSignal?.aborted) {
        return {
          ok: false,
          summary: lastAssistant || "Aborted",
          toolsUsed: [...new Set(toolsUsed)],
          iterations,
          error: "Aborted",
        };
      }
      iterations = i + 1;

      let content = "";
      let toolCalls: ToolCall[] | undefined;

      for await (const ev of opts.client.streamChat({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
          name: m.name,
        })),
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? "auto" : undefined,
        temperature: Math.min(opts.settings.generation.temperature, 0.3),
        max_tokens: Math.min(opts.settings.generation.maxTokens, 4096),
        stream: true,
      })) {
        if (opts.abortSignal?.aborted) {
          opts.client.cancel();
          break;
        }
        if (ev.type === "content") content += ev.text;
        else if (ev.type === "tool_calls") toolCalls = ev.toolCalls;
        else if (ev.type === "error") {
          return {
            ok: false,
            summary: content,
            toolsUsed: [...new Set(toolsUsed)],
            iterations,
            error: ev.error,
          };
        }
      }

      if ((!toolCalls || toolCalls.length === 0) && content) {
        const extracted = extractToolCallsFromText(content);
        if (extracted.toolCalls.length > 0) {
          toolCalls = extracted.toolCalls;
          content = extracted.cleanedContent || content;
        }
      }

      lastAssistant = content;
      messages.push({
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        tool_calls: toolCalls,
        createdAt: Date.now(),
      });

      if (!toolCalls?.length) {
        return {
          ok: true,
          summary: content.slice(0, 4000) || "(no content)",
          toolsUsed: [...new Set(toolsUsed)],
          iterations,
        };
      }

      const runOne = async (tc: ToolCall) => {
        toolsUsed.push(tc.function.name);
        const handler = registry.get(tc.function.name);
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = { raw: tc.function.arguments };
        }
        let result: unknown;
        if (!handler) {
          result = { error: `Unknown tool: ${tc.function.name}` };
        } else {
          try {
            result = await handler.execute(args);
          } catch (err) {
            result = { error: errorMessage(err) };
          }
        }
        messages.push({
          id: crypto.randomUUID(),
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(result).slice(0, 50_000),
          createdAt: Date.now(),
        });
      };

      for (const batch of batchToolCalls(toolCalls)) {
        if (batch.length === 1) await runOne(batch[0]!);
        else await Promise.all(batch.map(runOne));
      }
    }

    return {
      ok: true,
      summary: (lastAssistant || "Reached max subagent iterations").slice(0, 4000),
      toolsUsed: [...new Set(toolsUsed)],
      iterations,
    };
  } catch (err) {
    return {
      ok: false,
      summary: lastAssistant,
      toolsUsed: [...new Set(toolsUsed)],
      iterations,
      error: errorMessage(err),
    };
  } finally {
    subagentDepth = Math.max(0, subagentDepth - 1);
  }
}

/** Test helper */
export function __resetSubagentDepth(): void {
  subagentDepth = 0;
}
