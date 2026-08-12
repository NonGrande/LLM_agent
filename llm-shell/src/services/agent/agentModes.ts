import type { AgentMode, ToolDefinition } from "@/types";
import type { ToolHandler, ToolRegistry } from "@/services/agent/ToolRegistry";

/** Read-only tools allowed in Ask mode. */
export const ASK_MODE_TOOLS = new Set([
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

export function modePromptBlock(mode: AgentMode): string {
  if (mode === "ask") {
    return `\n## Active mode: ASK (read-only)\nYou may only use read/search tools. Do not write, edit, delete, or run shell commands. Answer with findings and recommendations.\n`;
  }
  if (mode === "plan") {
    return `\n## Active mode: PLAN (no tools)\nDo not call tools. Produce a structured markdown plan: goals, steps, risks, files to touch. Wait for the user to switch to Agent mode to execute.\n`;
  }
  return `\n## Active mode: AGENT\nFull tool access. Follow the Agent action algorithm (Intake → RAG → Decompose → Tool-first → Execute → Verify). Prefer native tool_calls over speculation.\n`;
}

export function filterToolsForMode(registry: ToolRegistry, mode: AgentMode): ToolHandler[] {
  const all = registry.list();
  if (mode === "plan") return [];
  if (mode === "ask") {
    return all.filter(
      (t) => ASK_MODE_TOOLS.has(t.name) || t.name.startsWith("mcp_"),
    ).filter((t) => {
      // MCP tools that look write-y are still blocked in ask unless read-named
      if (!t.name.startsWith("mcp_")) return true;
      const n = t.name.toLowerCase();
      return (
        n.includes("read") ||
        n.includes("list") ||
        n.includes("get") ||
        n.includes("search") ||
        n.includes("fetch") ||
        n.includes("status") ||
        n.includes("diff")
      );
    });
  }
  return all;
}

export function toolDefinitionsForMode(registry: ToolRegistry, mode: AgentMode): ToolDefinition[] {
  return filterToolsForMode(registry, mode).map((t) => t.definition);
}

export function isToolAllowedInMode(name: string, mode: AgentMode): boolean {
  if (mode === "plan") return false;
  if (mode === "agent") return true;
  if (ASK_MODE_TOOLS.has(name)) return true;
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
