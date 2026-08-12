import type { ToolCall } from "@/types";

const KNOWN_TOOLS = new Set([
  "read_file",
  "write_file",
  "edit_file",
  "apply_patch",
  "list_files",
  "search_files",
  "grep",
  "codebase_search",
  "git_status",
  "git_diff",
  "git_commit",
  "run_subagent",
  "execute_command",
  "kill_process",
  "take_screenshot",
  "fetch_url",
  "create_directory",
  "delete_file",
  "move_file",
  "lsp_hover",
]);

/** Tools that take a primary file path as `filePath`. */
const FILE_PATH_TOOLS = new Set([
  "read_file",
  "write_file",
  "edit_file",
  "apply_patch",
  "delete_file",
  "lsp_hover",
]);

/**
 * Local models (Ollama/Qwen 7B) often print tool calls as text instead of
 * OpenAI native `tool_calls`. Recover them so the agent loop can execute.
 */
export function extractToolCallsFromText(text: string): {
  toolCalls: ToolCall[];
  cleanedContent: string;
} {
  const found: ToolCall[] = [];
  let cleaned = text;

  // 1) {"name":"read_file","arguments":{...}}  (also with "function")
  const jsonObjs = findJsonObjects(text);
  for (const raw of jsonObjs) {
    const parsed = tryParseToolJson(raw);
    if (parsed) {
      found.push(toToolCall(parsed.name, parsed.args));
      cleaned = cleaned.replace(raw, "").trim();
    }
  }

  // 2) ```json ... ```
  cleaned = cleaned.replace(/```(?:json|tool)?\s*([\s\S]*?)```/gi, (_, body: string) => {
    const parsed = tryParseToolJson(body.trim());
    if (parsed) {
      found.push(toToolCall(parsed.name, parsed.args));
      return "";
    }
    return _;
  });

  // 3) XML-ish <tool_call> / invoke
  const xmlRe =
    /<(?:tool_call|tool|function_call)\s*>\s*([\s\S]*?)<\/(?:tool_call|tool|function_call)>/gi;
  cleaned = cleaned.replace(xmlRe, (_, inner: string) => {
    const name =
      /<name>\s*([^<]+)\s*<\/name>/i.exec(inner)?.[1]?.trim() ||
      /"name"\s*:\s*"([^"]+)"/.exec(inner)?.[1];
    const argsRaw =
      /<arguments>\s*([\s\S]*?)<\/arguments>/i.exec(inner)?.[1]?.trim() ||
      /"arguments"\s*:\s*(\{[\s\S]*\})/.exec(inner)?.[1];
    if (name && KNOWN_TOOLS.has(name)) {
      let args: Record<string, unknown> = {};
      try {
        args = argsRaw ? (JSON.parse(argsRaw) as Record<string, unknown>) : {};
      } catch {
        args = { raw: argsRaw };
      }
      found.push(toToolCall(name, args));
      return "";
    }
    return _;
  });

  // 4) TOOL_CALL\n{json}
  cleaned = cleaned.replace(/TOOL_CALL\s*\n\s*(\{[\s\S]*?\})\s*(?=\n|$)/gi, (_, body: string) => {
    const parsed = tryParseToolJson(body);
    if (parsed) {
      found.push(toToolCall(parsed.name, parsed.args));
      return "";
    }
    return _;
  });

  // Deduplicate by name+args
  const uniq: ToolCall[] = [];
  const seen = new Set<string>();
  for (const tc of found) {
    const key = `${tc.function.name}:${tc.function.arguments}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(tc);
  }

  cleaned = cleaned
    .replace(/^\s*TOOL_CALL\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*(sh|bash|powershell|Copy)\s*$/gim, "")
    .trim();

  return { toolCalls: uniq, cleanedContent: cleaned };
}

function pickString(
  args: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = args[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

function toToolCall(name: string, args: Record<string, unknown>): ToolCall {
  // Normalize common aliases from confused models
  const normalizedArgs = { ...args };

  if (FILE_PATH_TOOLS.has(name)) {
    if (!normalizedArgs.filePath) {
      const fp = pickString(normalizedArgs, [
        "path",
        "filepath",
        "file_path",
        "FilePath",
        "file",
        "filename",
      ]);
      if (fp) {
        normalizedArgs.filePath = fp;
        for (const k of ["path", "filepath", "file_path", "FilePath", "file", "filename"]) {
          if (k !== "filePath") delete normalizedArgs[k];
        }
      }
    }
  }

  if (name === "list_files" || name === "search_files") {
    if (!normalizedArgs.dirPath) {
      const dp = pickString(normalizedArgs, [
        "path",
        "dir",
        "directory",
        "folder",
        "dir_path",
        "directoryPath",
      ]);
      if (dp) {
        normalizedArgs.dirPath = dp;
        for (const k of ["path", "dir", "directory", "folder", "dir_path", "directoryPath"]) {
          delete normalizedArgs[k];
        }
      }
    }
  }

  if (name === "create_directory") {
    if (!normalizedArgs.path) {
      const p = pickString(normalizedArgs, [
        "dirPath",
        "dir",
        "directory",
        "folder",
        "filePath",
        "filepath",
      ]);
      if (p) normalizedArgs.path = p;
    }
  }

  if (name === "move_file") {
    if (!normalizedArgs.from) {
      const from = pickString(normalizedArgs, ["filePath", "path", "source", "src", "oldPath"]);
      if (from) normalizedArgs.from = from;
    }
    if (!normalizedArgs.to) {
      const to = pickString(normalizedArgs, ["destination", "dest", "newPath", "target"]);
      if (to) normalizedArgs.to = to;
    }
  }

  if (name === "execute_command") {
    if (!normalizedArgs.command) {
      const cmd = pickString(normalizedArgs, ["cmd", "shell", "script"]);
      if (cmd) normalizedArgs.command = cmd;
    }
  }

  if (name === "grep" || name === "codebase_search" || name === "search_files") {
    if (!normalizedArgs.query && !normalizedArgs.pattern) {
      const q = pickString(normalizedArgs, ["q", "search", "text", "needle"]);
      if (q) {
        if (name === "grep") normalizedArgs.pattern = q;
        else normalizedArgs.query = q;
      }
    }
    if (name === "grep" && !normalizedArgs.pattern && typeof normalizedArgs.query === "string") {
      normalizedArgs.pattern = normalizedArgs.query;
      delete normalizedArgs.query;
    }
  }

  const rid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return {
    id: `text_${rid}`,
    type: "function",
    function: {
      name,
      arguments: JSON.stringify(normalizedArgs),
    },
  };
}

function tryParseToolJson(raw: string): { name: string; args: Record<string, unknown> } | null {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    // OpenAI-ish nested
    if (obj.function && typeof obj.function === "object") {
      const fn = obj.function as { name?: string; arguments?: unknown };
      if (fn.name && KNOWN_TOOLS.has(fn.name)) {
        return { name: fn.name, args: coerceArgs(fn.arguments) };
      }
    }
    const name = typeof obj.name === "string" ? obj.name : "";
    if (name && KNOWN_TOOLS.has(name)) {
      const args =
        obj.arguments !== undefined
          ? coerceArgs(obj.arguments)
          : coerceArgs(obj.parameters ?? obj.args ?? {});
      return { name, args };
    }
  } catch {
    /* not json */
  }
  return null;
}

function coerceArgs(v: unknown): Record<string, unknown> {
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as Record<string, unknown>;
    } catch {
      return { raw: v };
    }
  }
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

/** Extract top-level {...} candidates (brace matching). */
function findJsonObjects(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          const slice = text.slice(i, j + 1);
          if (slice.includes('"name"') && slice.length < 8000) out.push(slice);
          i = j;
          break;
        }
      }
    }
  }
  return out;
}
