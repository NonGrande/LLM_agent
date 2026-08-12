import { readFile, writeFile } from "@/services/tauri/fs";

export interface CheckpointSnapshot {
  id: string;
  sessionId: string;
  createdAt: number;
  files: Record<string, string>;
}

let active: CheckpointSnapshot | null = null;

export function beginCheckpoint(sessionId: string): string {
  active = {
    id: crypto.randomUUID(),
    sessionId,
    createdAt: Date.now(),
    files: {},
  };
  return active.id;
}

export function getActiveCheckpoint(): CheckpointSnapshot | null {
  return active;
}

export function hasRestorableCheckpoint(): boolean {
  return active !== null && Object.keys(active.files).length > 0;
}

export function captureFileContent(path: string, content: string): void {
  if (!active || !path) return;
  if (Object.prototype.hasOwnProperty.call(active.files, path)) return;
  active.files[path] = content;
}

/** Snapshot file from disk before first agent modification. */
export async function captureFileBeforeEdit(path: string): Promise<void> {
  if (!active || !path) return;
  if (Object.prototype.hasOwnProperty.call(active.files, path)) return;
  try {
    const file = await readFile(path);
    captureFileContent(path, file.is_binary ? "" : file.content);
  } catch {
    captureFileContent(path, "");
  }
}

export async function restoreCheckpoint(): Promise<{ restored: number; paths: string[] }> {
  if (!active) return { restored: 0, paths: [] };
  const paths: string[] = [];
  for (const [path, content] of Object.entries(active.files)) {
    await writeFile(path, content);
    paths.push(path);
  }
  const n = paths.length;
  active = null;
  return { restored: n, paths };
}

export function clearCheckpoint(): void {
  active = null;
}

export function checkpointFileCount(): number {
  return active ? Object.keys(active.files).length : 0;
}
