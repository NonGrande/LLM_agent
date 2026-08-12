import type { ChatMessage } from "@/types";
import { SYSTEM_PROMPT_TEMPLATE } from "@/utils/constants";

/** Heuristic token estimate (~4 chars / token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function messageText(msg: ChatMessage): string {
  if (typeof msg.content === "string") return msg.content;
  return msg.content.map((p) => (p.type === "text" ? p.text : "[image]")).join("\n");
}

export function buildSystemPrompt(
  workingDir: string,
  platform: string,
  skillsBlock = "",
  role: "default" | "reviewer" | "refactor" = "default",
  offlineMode = false,
  ragBlock = "",
  rulesBlock = "",
  modeBlock = "",
): string {
  const roleBlock =
    role === "reviewer"
      ? `\n## Active role: CODE REVIEWER\nFocus on bugs, security, edge cases. Prefer read/grep over edits unless asked to fix.\n`
      : role === "refactor"
        ? `\n## Active role: REFACTOR\nMinimal behavior-preserving changes. Prefer edit_file; no drive-by rewrites.\n`
        : "";
  const offlineBlock = offlineMode
    ? `\n## Offline mode (local 7B)\nYou are on a small local model. Be extremely tool-call oriented. Prefer TOOL_CALL JSON. Keep answers tiny.\n`
    : `\n## Online mode\nPrefer strong cloud models. Local 7B is for offline only — do not suggest falling back to weak local models unless offline.\n`;

  return SYSTEM_PROMPT_TEMPLATE.replace("{WORKING_DIR}", workingDir || "(not set)")
    .replace("{PLATFORM}", platform)
    .replace("{SKILLS}", `${roleBlock}${offlineBlock}${modeBlock}${skillsBlock || ""}`)
    .replace("{RAG}", ragBlock || "")
    .replace("{RULES}", rulesBlock ? `\n${rulesBlock}\n` : "");
}

/**
 * Yandex / some OpenAI-compat APIs require the last message to be user or tool
 * (not a bare assistant). We add an empty streaming assistant in the UI before
 * the request — strip that and repair broken tool sequences.
 */
export function prepareApiMessages(messages: ChatMessage[]): ChatMessage[] {
  let out = [...messages];

  // Drop trailing UI placeholders (empty / still streaming assistant)
  while (out.length > 0) {
    const last = out[out.length - 1]!;
    if (last.role !== "assistant") break;
    const text = messageText(last).trim();
    const hasTools = Boolean(last.tool_calls?.length);
    if (last.streaming || (!text && !hasTools)) {
      out.pop();
      continue;
    }
    break;
  }

  // Incomplete trailing assistant+tool_calls without following tool results
  if (out.length > 0) {
    const last = out[out.length - 1]!;
    if (last.role === "assistant" && last.tool_calls?.length) {
      out.pop();
    }
  }

  // Yandex serving: last role must be user or tool — drop finished trailing assistants
  while (out.length > 0 && out[out.length - 1]!.role === "assistant") {
    out.pop();
  }

  out = dropOrphanToolMessages(out);
  return out;
}

function dropOrphanToolMessages(messages: ChatMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [];
  let pendingToolIds: Set<string> | null = null;
  for (const m of messages) {
    if (m.role === "assistant" && m.tool_calls?.length) {
      pendingToolIds = new Set(m.tool_calls.map((t) => t.id));
      result.push(m);
      continue;
    }
    if (m.role === "tool") {
      if (pendingToolIds && m.tool_call_id && pendingToolIds.has(m.tool_call_id)) {
        result.push(m);
        pendingToolIds.delete(m.tool_call_id);
        if (pendingToolIds.size === 0) pendingToolIds = null;
      }
      continue;
    }
    pendingToolIds = null;
    result.push(m);
  }
  if (pendingToolIds && pendingToolIds.size > 0) {
    while (result.length && result[result.length - 1]!.role === "tool") result.pop();
    if (result.length && result[result.length - 1]!.role === "assistant") result.pop();
  }
  return result;
}

export class ContextManager {
  maxContextTokens: number;

  constructor(maxContextTokens = 128_000) {
    this.maxContextTokens = maxContextTokens;
  }

  countMessages(messages: ChatMessage[]): number {
    return messages.reduce((sum, m) => {
      let n = estimateTokens(messageText(m));
      if (m.tool_calls) n += estimateTokens(JSON.stringify(m.tool_calls));
      return sum + n + 4;
    }, 0);
  }

  /** Keep system + newest messages within budget. */
  trim(messages: ChatMessage[], reserveOutput = 4096): ChatMessage[] {
    const budget = Math.max(2000, this.maxContextTokens - reserveOutput);
    if (this.countMessages(messages) <= budget) return messages;

    const system = messages.filter((m) => m.role === "system");
    const rest = messages.filter((m) => m.role !== "system");

    for (let start = 0; start < rest.length; start++) {
      const trial = [...system, ...rest.slice(start)];
      if (this.countMessages(trial) <= budget) {
        if (start > 0) {
          return [
            ...system,
            {
              id: crypto.randomUUID(),
              role: "system",
              content: `[Context trimmed: ${start} earlier messages omitted.]`,
              createdAt: Date.now(),
            },
            ...rest.slice(start),
          ];
        }
        return trial;
      }
    }
    return [...system, ...rest.slice(-2)];
  }
}
