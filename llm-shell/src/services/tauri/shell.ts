import { invoke } from "@tauri-apps/api/core";
import type { CommandResult, SystemInfo } from "@/types";

export async function executeCommand(
  command: string,
  cwd?: string,
  timeoutMs?: number,
  env?: Record<string, string>,
): Promise<CommandResult> {
  return invoke<CommandResult>("execute_command", { command, cwd, timeoutMs, env });
}

export async function executeCommandStreaming(
  command: string,
  cwd?: string,
  channel?: string,
  timeoutMs?: number,
): Promise<number> {
  return invoke<number>("execute_command_streaming", {
    command,
    cwd,
    channel,
    timeoutMs,
  });
}

export async function killProcess(pid: number | string): Promise<void> {
  const n = typeof pid === "string" ? Number(pid) : pid;
  return invoke<void>("kill_process", { pid: n });
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return invoke<SystemInfo>("get_system_info");
}

export async function openFolder(path: string): Promise<void> {
  return invoke<void>("open_folder", { path });
}
