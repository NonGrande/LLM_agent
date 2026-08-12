import type { DirEntry } from "@/types";

const TOOL_RESULT_MAX = 24_000;
const LIST_FILES_MAX = 250;

/** Compact directory listing for agent context (avoids huge DirEntry JSON). */
export function compactDirListing(entries: DirEntry[], max = LIST_FILES_MAX): {
  path_count: number;
  truncated: boolean;
  entries: Array<{ name: string; is_dir: boolean; size?: number }>;
} {
  const sorted = [...entries].sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const sliced = sorted.slice(0, max);
  return {
    path_count: entries.length,
    truncated: entries.length > max,
    entries: sliced.map((e) => ({
      name: e.name,
      is_dir: e.is_dir,
      ...(e.is_dir ? {} : { size: e.size }),
    })),
  };
}

/** Serialize tool result for chat history / model context (hard-capped). */
export function toolResultForChat(toolName: string, result: unknown): string {
  if (
    toolName === "take_screenshot" &&
    result &&
    typeof result === "object" &&
    "data_url" in (result as object)
  ) {
    const { data_url: _drop, ...rest } = result as Record<string, unknown>;
    return JSON.stringify(rest).slice(0, TOOL_RESULT_MAX);
  }
  if (toolName === "list_files" && Array.isArray(result)) {
    return JSON.stringify(compactDirListing(result as DirEntry[])).slice(0, TOOL_RESULT_MAX);
  }
  if (
    toolName === "list_files" &&
    result &&
    typeof result === "object" &&
    "entries" in (result as object)
  ) {
    return JSON.stringify(result).slice(0, TOOL_RESULT_MAX);
  }
  return JSON.stringify(result).slice(0, TOOL_RESULT_MAX);
}
