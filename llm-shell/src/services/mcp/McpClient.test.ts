import { describe, expect, it, vi } from "vitest";
import { createMcpClient, mcpToolName, mcpToolToDefinition } from "./McpClient";

describe("McpClient helpers", () => {
  it("builds safe tool names", () => {
    expect(mcpToolName("srv-1", "list.files")).toBe("mcp_srv_1_list_files");
  });

  it("maps tool definition with MCP prefix", () => {
    const def = mcpToolToDefinition(
      {
        id: "fs",
        name: "Filesystem",
        transport: "http",
        url: "http://127.0.0.1:1/mcp",
        enabled: true,
      },
      { name: "read_file", description: "Read a file", inputSchema: { type: "object" } },
    );
    expect(def.function.name).toBe("mcp_fs_read_file");
    expect(def.function.description).toContain("MCP:Filesystem");
  });

  it("stdio client requires tauri or command", async () => {
    const client = createMcpClient({
      id: "stdio1",
      name: "Stdio",
      transport: "stdio",
      url: "",
      command: "",
      enabled: true,
    });
    await expect(client.connect()).rejects.toThrow(/command/i);
  });

  it("createMcpClient picks stdio class", () => {
    const c = createMcpClient({
      id: "s",
      name: "S",
      transport: "stdio",
      url: "",
      command: "npx",
      enabled: true,
    });
    expect(c.config.transport).toBe("stdio");
  });
});

// silence unused in case vitest tree-shakes
void vi;
