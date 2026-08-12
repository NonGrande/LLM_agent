import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauri } from "@/utils/env";

export type PipedEvent =
  | { type: "frame"; body: string }
  | { type: "stderr"; line: string }
  | { type: "exit"; code: number | null }
  | { type: "error"; message: string };

/** Spawn a process with stdin/stdout Content-Length framing (MCP / LSP). */
export async function pipedSpawn(opts: {
  program: string;
  args?: string[];
  cwd?: string | null;
  channel: string;
  env?: Record<string, string>;
}): Promise<string> {
  if (!isTauri()) throw new Error("pipedSpawn requires Tauri");
  return invoke<string>("piped_spawn", {
    program: opts.program,
    args: opts.args ?? [],
    cwd: opts.cwd ?? null,
    channel: opts.channel,
    env: opts.env ?? null,
  });
}

export async function pipedWriteFrame(sessionId: string, body: string): Promise<void> {
  if (!isTauri()) throw new Error("pipedWriteFrame requires Tauri");
  await invoke("piped_write_frame", { sessionId, body });
}

export async function pipedKill(sessionId: string): Promise<void> {
  if (!isTauri()) throw new Error("pipedKill requires Tauri");
  await invoke("piped_kill", { sessionId });
}

export async function listenPipedChannel(
  channel: string,
  onEvent: (ev: PipedEvent) => void,
): Promise<UnlistenFn> {
  return listen<PipedEvent>(channel, (e) => onEvent(e.payload));
}
