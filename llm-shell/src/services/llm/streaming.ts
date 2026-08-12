import type { StreamEvent } from "./types";
import type { ToolCall } from "@/types";

type SseJson = {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

function* handleDataLine(
  data: string,
  toolCalls: Map<number, ToolCall>,
): Generator<StreamEvent, "continue" | "stop"> {
  if (data === "[DONE]") {
    if (toolCalls.size > 0) {
      yield {
        type: "tool_calls",
        toolCalls: [...toolCalls.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, v]) => v),
      };
    }
    yield { type: "done" };
    return "stop";
  }
  try {
    const json = JSON.parse(data) as SseJson;
    if (json.error?.message) {
      yield { type: "error", error: json.error.message };
      return "stop";
    }
    if (json.usage) {
      yield {
        type: "usage",
        promptTokens: json.usage.prompt_tokens,
        completionTokens: json.usage.completion_tokens,
      };
    }
    const delta = json.choices?.[0]?.delta;
    if (delta?.content) {
      yield { type: "content", text: delta.content };
    }
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0;
        const existing = toolCalls.get(idx) ?? {
          id: tc.id ?? `call_${idx}`,
          type: "function" as const,
          function: { name: "", arguments: "" },
        };
        if (tc.id) existing.id = tc.id;
        if (tc.function?.name) existing.function.name += tc.function.name;
        if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
        toolCalls.set(idx, existing);
      }
    }
    if (json.choices?.[0]?.finish_reason === "tool_calls" && toolCalls.size > 0) {
      yield {
        type: "tool_calls",
        toolCalls: [...toolCalls.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, v]) => v),
      };
      toolCalls.clear();
    }
  } catch {
    /* skip */
  }
  return "continue";
}

/** Parse OpenAI-compatible SSE body into StreamEvents. */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder();
  let buffer = "";
  const toolCalls = new Map<number, ToolCall>();

  while (true) {
    if (signal?.aborted) {
      yield { type: "error", error: "Aborted" };
      return;
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      const status = yield* handleDataLine(data, toolCalls);
      if (status === "stop") return;
    }
  }
  yield { type: "done" };
}

/** Parse pre-split SSE lines (from Rust proxy stream). */
export async function* parseSSELines(
  lines: AsyncIterable<string>,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const toolCalls = new Map<number, ToolCall>();
  for await (const raw of lines) {
    if (signal?.aborted) {
      yield { type: "error", error: "Aborted" };
      return;
    }
    const line = raw.trim();
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    const status = yield* handleDataLine(data, toolCalls);
    if (status === "stop") return;
  }
  yield { type: "done" };
}
