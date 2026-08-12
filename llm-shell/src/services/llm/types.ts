export type StreamEvent =
  | { type: "content"; text: string }
  | { type: "tool_calls"; toolCalls: import("@/types").ToolCall[] }
  | { type: "usage"; promptTokens?: number; completionTokens?: number }
  | { type: "done" }
  | { type: "error"; error: string };

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string | unknown;
    tool_calls?: unknown;
    tool_call_id?: string;
    name?: string;
  }>;
  tools?: unknown[];
  tool_choice?: unknown;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string[];
}

export interface LLMClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
}
