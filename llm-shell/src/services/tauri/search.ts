import { invoke } from "@tauri-apps/api/core";
import type { GrepMatch } from "@/types";

export async function globSearch(
  pattern: string,
  path?: string,
  excludePatterns?: string[],
): Promise<string[]> {
  return invoke<string[]>("glob_search", { pattern, path, excludePatterns });
}

export async function grepSearch(
  pattern: string,
  path?: string,
  include?: string,
  caseInsensitive?: boolean,
): Promise<GrepMatch[]> {
  return invoke<GrepMatch[]>("grep_search", { pattern, path, include, caseInsensitive });
}
