import { invoke } from "@tauri-apps/api/core";
import type {
  FileContent,
  DirEntry,
  EditResult,
  FileInfo,
} from "@/types";

export async function readFile(path: string): Promise<FileContent> {
  return invoke<FileContent>("read_file", { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke<void>("write_file", { path, content });
}

export async function editFile(
  path: string,
  oldString: string,
  newString: string,
  replaceAll?: boolean,
): Promise<EditResult> {
  return invoke<EditResult>("edit_file", { path, oldString, newString, replaceAll: replaceAll ?? false });
}

export async function listDirectory(path: string): Promise<DirEntry[]> {
  return invoke<DirEntry[]>("list_directory", { path });
}

export async function createDirectory(path: string): Promise<void> {
  return invoke<void>("create_directory", { path });
}

export async function deletePath(path: string): Promise<void> {
  return invoke<void>("delete_path", { path });
}

export async function movePath(from: string, to: string): Promise<void> {
  return invoke<void>("move_path", { from, to });
}

export async function fileInfo(path: string): Promise<FileInfo> {
  return invoke<FileInfo>("file_info", { path });
}
