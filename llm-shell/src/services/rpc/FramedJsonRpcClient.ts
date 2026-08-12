import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  listenPipedChannel,
  pipedKill,
  pipedSpawn,
  pipedWriteFrame,
  type PipedEvent,
} from "@/services/tauri/processPipe";

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  method?: string;
  params?: unknown;
}

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
};

/**
 * JSON-RPC 2.0 over Content-Length framed stdio (MCP / LSP compatible).
 */
export class FramedJsonRpcClient {
  private nextId = 1;
  private sessionId: string | null = null;
  private unlisten: UnlistenFn | null = null;
  private pending = new Map<number | string, Pending>();
  private notificationHandlers: Array<(method: string, params: unknown) => void> = [];
  private closed = false;
  readonly channel: string;

  constructor(channel: string) {
    this.channel = channel;
  }

  onNotification(handler: (method: string, params: unknown) => void): () => void {
    this.notificationHandlers.push(handler);
    return () => {
      this.notificationHandlers = this.notificationHandlers.filter((h) => h !== handler);
    };
  }

  async start(opts: {
    program: string;
    args?: string[];
    cwd?: string | null;
    env?: Record<string, string>;
  }): Promise<void> {
    this.unlisten = await listenPipedChannel(this.channel, (ev) => this.onPipedEvent(ev));
    this.sessionId = await pipedSpawn({
      program: opts.program,
      args: opts.args,
      cwd: opts.cwd,
      channel: this.channel,
      env: opts.env,
    });
  }

  private onPipedEvent(ev: PipedEvent) {
    if (ev.type === "frame") {
      try {
        const msg = JSON.parse(ev.body) as JsonRpcResponse;
        if (msg.id !== undefined && msg.id !== null && this.pending.has(msg.id)) {
          const p = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) {
            p.reject(new Error(msg.error.message));
          } else {
            p.resolve(msg.result);
          }
          return;
        }
        if (typeof msg.method === "string") {
          for (const h of this.notificationHandlers) {
            h(msg.method, msg.params);
          }
        }
      } catch {
        /* ignore malformed */
      }
      return;
    }
    if (ev.type === "error") {
      for (const [, p] of this.pending) {
        p.reject(new Error(ev.message));
      }
      this.pending.clear();
    }
    if (ev.type === "exit") {
      this.closed = true;
      for (const [, p] of this.pending) {
        p.reject(new Error(`process exited (${ev.code ?? "?"})`));
      }
      this.pending.clear();
    }
  }

  async request(method: string, params?: unknown, timeoutMs = 60_000): Promise<unknown> {
    if (!this.sessionId) throw new Error("RPC client not started");
    const id = this.nextId++;
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      ...(params !== undefined ? { params } : {}),
    });
    const result = new Promise<unknown>((resolve, reject) => {
      const t = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`RPC timeout: ${method}`));
        }
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(t);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(t);
          reject(e);
        },
      });
    });
    await pipedWriteFrame(this.sessionId, payload);
    return result;
  }

  async notify(method: string, params?: unknown): Promise<void> {
    if (!this.sessionId) throw new Error("RPC client not started");
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      method,
      ...(params !== undefined ? { params } : {}),
    });
    await pipedWriteFrame(this.sessionId, payload);
  }

  async close(): Promise<void> {
    if (this.closed && !this.sessionId) return;
    const sid = this.sessionId;
    this.sessionId = null;
    this.unlisten?.();
    this.unlisten = null;
    for (const [, p] of this.pending) {
      p.reject(new Error("RPC client closed"));
    }
    this.pending.clear();
    if (sid) {
      try {
        await pipedKill(sid);
      } catch {
        /* already dead */
      }
    }
    this.closed = true;
  }
}
