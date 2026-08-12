import { describe, expect, it } from "vitest";
import { batchToolCalls, isParallelSafeTool } from "./parallelTools";

describe("parallelTools", () => {
  it("marks read tools as parallel-safe", () => {
    expect(isParallelSafeTool("read_file")).toBe(true);
    expect(isParallelSafeTool("write_file")).toBe(false);
    expect(isParallelSafeTool("git_commit")).toBe(false);
    expect(isParallelSafeTool("mcp_list_things")).toBe(true);
  });

  it("batches consecutive reads then isolates writes", () => {
    const calls = [
      { function: { name: "read_file" } },
      { function: { name: "grep" } },
      { function: { name: "write_file" } },
      { function: { name: "read_file" } },
    ];
    const batches = batchToolCalls(calls);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(2);
    expect(batches[1]).toHaveLength(1);
    expect(batches[1]![0]!.function.name).toBe("write_file");
    expect(batches[2]).toHaveLength(1);
  });
});
