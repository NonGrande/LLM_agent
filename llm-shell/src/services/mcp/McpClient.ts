import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/utils/env";
import type { McpServerConfig, NetworkConfig, ToolDefinition } from "@/types";
import { FramedJsonRpcClient } from "@/services/rpc/FramedJsonRpcClient";
import { useSettingsStore } from "@/stores/settingsStore";

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

async function postJson(
  url: string,
  body: unknown,
  apiKey: string | undefined,
  network?: NetworkConfig,
): Promise<JsonRpcResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;

  if (isTauri()) {
    const proxyUrl =
      network?.proxyEnabled && network.proxyUrl?.trim() ? network.proxyUrl.trim() : null;
    const raw = await invoke<string>("llm_http", {
      method: "POST",
      url,
      apiKey: apiKey?.trim() || null,
      body: JSON.stringify(body),
      proxyUrl,
      timeoutMs: 60_000,
    });
    return JSON.parse(raw) as JsonRpcResponse;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as JsonRpcResponse;
}

export class McpHttpClient {
  private nextId = 1;
  private initialized = false;
  readonly config: McpServerConfig;
  private network?: NetworkConfig;
  tools: McpToolInfo[] = [];

  constructor(config: McpServerConfig, network?: NetworkConfig) {
    this.config = config;
    this.network = network;
  }

  private async rpc(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      ...(params !== undefined ? { params } : {}),
    };
    const resp = await postJson(
      normalizeUrl(this.config.url),
      payload,
      this.config.apiKey,
      this.network,
    );
    if (resp.error) {
      throw new Error(`MCP ${method}: ${resp.error.message}`);
    }
    return resp.result;
  }

  async connect(): Promise<McpToolInfo[]> {
    await this.rpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "llm-shell", version: "0.3.0" },
    });
    try {
      await this.rpc("notifications/initialized", {});
    } catch {
      /* some servers don't accept this as request */
    }
    this.initialized = true;
    const listed = (await this.rpc("tools/list", {})) as { tools?: McpToolInfo[] };
    this.tools = Array.isArray(listed?.tools) ? listed.tools : [];
    return this.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.initialized) await this.connect();
    return this.rpc("tools/call", {
      name,
      arguments: args,
    });
  }

  disconnect(): void {
    this.initialized = false;
    this.tools = [];
  }
}

/** Native MCP over stdin/stdout Content-Length pipe (Tauri process_pipe). */
export class McpStdioClient {
  readonly config: McpServerConfig;
  tools: McpToolInfo[] = [];
  private rpc: FramedJsonRpcClient | null = null;
  private initialized = false;

  constructor(config: McpServerConfig, _network?: NetworkConfig) {
    this.config = config;
  }

  async connect(): Promise<McpToolInfo[]> {
    const cmd = this.config.command?.trim();
    if (!cmd) {
      throw new Error("MCP stdio: укажите command (и args).");
    }
    if (!isTauri()) {
      throw new Error("MCP stdio требует Tauri (native pipe).");
    }

    await this.disconnectAsync();

    const channel = `mcp-stdio-${this.config.id}-${Date.now()}`;
    const rpc = new FramedJsonRpcClient(channel);
    const cwd =
      useSettingsStore.getState().settings.workspace.path?.trim() ||
      useSettingsStore.getState().settings.agent.workingDirectory?.trim() ||
      null;

    await rpc.start({
      program: cmd,
      args: this.config.args ?? [],
      cwd,
    });
    this.rpc = rpc;

    try {
      await rpc.request(
        "initialize",
        {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "llm-shell", version: "0.3.0" },
        },
        90_000,
      );
      try {
        await rpc.notify("notifications/initialized", {});
      } catch {
        /* ignore */
      }
      const listed = (await rpc.request("tools/list", {}, 60_000)) as {
        tools?: McpToolInfo[];
      };
      this.tools = Array.isArray(listed?.tools) ? listed.tools : [];
      this.initialized = true;
      return this.tools;
    } catch (err) {
      await this.disconnectAsync();
      throw err;
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.initialized || !this.rpc) await this.connect();
    return this.rpc!.request("tools/call", { name, arguments: args }, 120_000);
  }

  disconnect(): void {
    void this.disconnectAsync();
  }

  private async disconnectAsync(): Promise<void> {
    this.initialized = false;
    this.tools = [];
    const rpc = this.rpc;
    this.rpc = null;
    if (rpc) await rpc.close();
  }
}

export type McpClient = McpHttpClient | McpStdioClient;

export function createMcpClient(
  server: McpServerConfig,
  network?: NetworkConfig,
): McpClient {
  if (server.transport === "stdio") return new McpStdioClient(server, network);
  return new McpHttpClient(server, network);
}

export function mcpToolName(serverId: string, toolName: string): string {
  const safeServer = serverId.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 24);
  const safeTool = toolName.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 48);
  return `mcp_${safeServer}_${safeTool}`;
}

export function mcpToolToDefinition(
  server: McpServerConfig,
  tool: McpToolInfo,
): ToolDefinition {
  return {
    type: "function",
    function: {
      name: mcpToolName(server.id, tool.name),
      description: `[MCP:${server.name}] ${tool.description || tool.name}`,
      parameters: tool.inputSchema ?? { type: "object", properties: {} },
    },
  };
}

export const MCP_PRESETS: Array<Omit<McpServerConfig, "id" | "enabled"> & { hint: string }> = [
  {
    name: "Filesystem (HTTP bridge)",
    transport: "http",
    url: "http://127.0.0.1:3100/mcp",
    hint: "Локальный MCP filesystem через HTTP-шлюз (stdio → HTTP).",
  },
  {
    name: "Git (HTTP bridge)",
    transport: "http",
    url: "http://127.0.0.1:3101/mcp",
    hint: "MCP git server за HTTP proxy.",
  },
  {
    name: "Fetch (HTTP bridge)",
    transport: "http",
    url: "http://127.0.0.1:3102/mcp",
    hint: "MCP fetch / web tools.",
  },
  {
    name: "Filesystem (native stdio)",
    transport: "stdio",
    url: "",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
    hint: "Native stdin/stdout MCP через Tauri process pipe (нужен Node/npx).",
  },
];
