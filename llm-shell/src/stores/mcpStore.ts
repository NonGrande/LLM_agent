import { create } from "zustand";
import type { McpServerConfig, NetworkConfig, ToolDefinition } from "@/types";
import {
  createMcpClient,
  mcpToolName,
  mcpToolToDefinition,
  type McpClient,
  type McpToolInfo,
} from "@/services/mcp/McpClient";
import type { ToolHandler } from "@/services/agent/ToolRegistry";

interface ConnectedServer {
  client: McpClient;
  tools: McpToolInfo[];
  error?: string;
}

interface McpState {
  connected: Record<string, ConnectedServer>;
  connecting: boolean;
  lastError: string | null;

  connectServer: (server: McpServerConfig, network?: NetworkConfig) => Promise<void>;
  disconnectServer: (serverId: string) => void;
  disconnectAll: () => void;
  connectEnabled: (servers: McpServerConfig[], network?: NetworkConfig) => Promise<void>;
  toolHandlers: () => ToolHandler[];
  toolCount: () => number;
}

export const useMcpStore = create<McpState>((set, get) => ({
  connected: {},
  connecting: false,
  lastError: null,

  connectServer: async (server, network) => {
    if (server.transport !== "stdio" && !server.url.trim()) {
      set({ lastError: "MCP URL is empty" });
      return;
    }
    if (server.transport === "stdio" && !server.command?.trim()) {
      set({ lastError: "MCP stdio: укажите command" });
      return;
    }
    set({ connecting: true, lastError: null });
    try {
      const client = createMcpClient(server, network);
      const tools = await client.connect();
      set((s) => ({
        connected: {
          ...s.connected,
          [server.id]: { client, tools },
        },
        connecting: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set((s) => ({
        connecting: false,
        lastError: message,
        connected: {
          ...s.connected,
          [server.id]: {
            client: createMcpClient(server, network),
            tools: [],
            error: message,
          },
        },
      }));
    }
  },

  disconnectServer: (serverId) => {
    const entry = get().connected[serverId];
    entry?.client.disconnect();
    set((s) => {
      const next = { ...s.connected };
      delete next[serverId];
      return { connected: next };
    });
  },

  disconnectAll: () => {
    for (const entry of Object.values(get().connected)) {
      entry.client.disconnect();
    }
    set({ connected: {} });
  },

  connectEnabled: async (servers, network) => {
    get().disconnectAll();
    const enabled = servers.filter((s) => {
      if (!s.enabled) return false;
      if (s.transport === "stdio") return Boolean(s.command?.trim());
      return Boolean(s.url.trim());
    });
    for (const server of enabled) {
      await get().connectServer(server, network);
    }
  },

  toolHandlers: () => {
    const handlers: ToolHandler[] = [];
    for (const [serverId, entry] of Object.entries(get().connected)) {
      if (entry.error || !entry.tools.length) continue;
      const server = entry.client.config;
      for (const tool of entry.tools) {
        const def: ToolDefinition = mcpToolToDefinition(server, tool);
        const originalName = tool.name;
        handlers.push({
          name: mcpToolName(serverId, originalName),
          definition: def,
          requiresConfirmation: true,
          confirmationKey: "executeCommand",
          execute: async (args) => entry.client.callTool(originalName, args),
        });
      }
    }
    return handlers;
  },

  toolCount: () =>
    Object.values(get().connected).reduce(
      (n, e) => n + (e.error ? 0 : e.tools.length),
      0,
    ),
}));
