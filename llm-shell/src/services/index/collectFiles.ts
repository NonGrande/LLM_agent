import { globSearch } from "@/services/tauri/search";
import { readFile } from "@/services/tauri/fs";
import { isTauri } from "@/utils/env";
import { MAX_INDEX_FILE_BYTES, MAX_INDEX_FILES } from "@/services/index/types";

const INDEX_GLOB = "**/*";
const DEFAULT_EXCLUDES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/target/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/__pycache__/**",
  "**/*.png",
  "**/*.jpg",
  "**/*.jpeg",
  "**/*.gif",
  "**/*.webp",
  "**/*.ico",
  "**/*.pdf",
  "**/*.zip",
  "**/*.exe",
  "**/*.dll",
  "**/*.msi",
];

const TEXT_EXT =
  /\.(ts|tsx|js|jsx|json|md|mdx|rs|py|go|java|kt|cs|cpp|c|h|hpp|css|scss|html|vue|svelte|toml|yaml|yml|sql|sh|ps1|txt|xml|svg)$/i;

export function isLikelyTextFile(path: string): boolean {
  const base = path.replace(/\\/g, "/").split("/").pop() ?? path;
  if (base.startsWith(".")) return base === ".cursorrules" || base.endsWith(".md");
  return TEXT_EXT.test(base) || !base.includes(".");
}

export async function collectIndexableFiles(
  root: string,
  extraExcludes: string[] = [],
): Promise<string[]> {
  if (!isTauri() || !root.trim()) return [];
  const excludes = [...DEFAULT_EXCLUDES, ...extraExcludes.map((p) => `**/${p}/**`)];
  const hits = await globSearch(INDEX_GLOB, root, excludes);
  return hits
    .filter((p) => !p.endsWith("/") && isLikelyTextFile(p))
    .slice(0, MAX_INDEX_FILES);
}

export async function readIndexableFile(path: string): Promise<string | null> {
  try {
    const file = await readFile(path);
    if (file.is_binary || file.size > MAX_INDEX_FILE_BYTES) return null;
    return file.content;
  } catch {
    return null;
  }
}
