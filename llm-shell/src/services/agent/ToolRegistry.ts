import type { ToolDefinition } from "@/types";

export interface ToolHandler {
  name: string;
  definition: ToolDefinition;
  /** true if UI confirmation may be required */
  requiresConfirmation: boolean;
  confirmationKey?: "writeFile" | "editFile" | "executeCommand" | "deleteFile";
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolHandler>();

  register(tool: ToolHandler) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  definitions(): ToolDefinition[] {
    return [...this.tools.values()].map((t) => t.definition);
  }

  list(): ToolHandler[] {
    return [...this.tools.values()];
  }
}
