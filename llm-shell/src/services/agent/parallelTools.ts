/** Tools safe to run concurrently in one agent turn (read-only / no shared mutation). */
const PARALLEL_SAFE = new Set([
  "read_file",
  "list_files",
  "search_files",
  "grep",
  "codebase_search",
  "git_status",
  "git_diff",
  "fetch_url",
  "take_screenshot",
]);

export function isParallelSafeTool(name: string): boolean {
  if (PARALLEL_SAFE.has(name)) return true;
  if (name.startsWith("mcp_")) {
    const n = name.toLowerCase();
    return (
      n.includes("read") ||
      n.includes("list") ||
      n.includes("get") ||
      n.includes("search") ||
      n.includes("fetch") ||
      n.includes("status") ||
      n.includes("diff")
    );
  }
  return false;
}

/**
 * Split tool calls into batches: consecutive parallel-safe tools run together;
 * mutating tools each form a solo batch (sequential).
 */
export function batchToolCalls<T extends { function: { name: string } }>(calls: T[]): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  for (const tc of calls) {
    if (isParallelSafeTool(tc.function.name)) {
      current.push(tc);
    } else {
      if (current.length) {
        batches.push(current);
        current = [];
      }
      batches.push([tc]);
    }
  }
  if (current.length) batches.push(current);
  return batches;
}
