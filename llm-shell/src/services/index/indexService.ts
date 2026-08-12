import { appDataStateStorage } from "@/services/persist/appDataStorage";
import type { AppSettings } from "@/types";
import { chunkFileText, chunkContentHash } from "@/services/index/chunker";
import { collectIndexableFiles, readIndexableFile } from "@/services/index/collectFiles";
import { embedTexts } from "@/services/index/embeddings";
import { searchChunks, formatSearchHitsForPrompt } from "@/services/index/retrieve";
import {
  INDEX_STORE_KEY,
  INDEX_VERSION,
  MAX_INDEX_CHUNKS,
  DEFAULT_TOP_K,
  type CodebaseIndex,
  type CodeChunk,
  type SearchHit,
} from "@/services/index/types";

type IndexMap = Record<string, CodebaseIndex>;

async function loadMap(): Promise<IndexMap> {
  try {
    const raw = await appDataStateStorage.getItem(INDEX_STORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as IndexMap;
  } catch {
    return {};
  }
}

async function saveMap(map: IndexMap): Promise<void> {
  await appDataStateStorage.setItem(INDEX_STORE_KEY, JSON.stringify(map));
}

export async function getIndex(projectId: string): Promise<CodebaseIndex | null> {
  const map = await loadMap();
  return map[projectId] ?? null;
}

export type IndexProgress = { done: number; total: number; phase: string };

export async function buildCodebaseIndex(
  projectId: string,
  rootPath: string,
  settings: AppSettings,
  onProgress?: (p: IndexProgress) => void,
): Promise<CodebaseIndex> {
  onProgress?.({ done: 0, total: 1, phase: "collecting files" });
  const files = await collectIndexableFiles(rootPath, settings.workspace.excludedPatterns ?? []);
  const total = Math.max(files.length, 1);
  const chunks: CodeChunk[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.({ done: i, total, phase: `reading ${files[i]?.split(/[/\\]/).pop() ?? ""}` });
    const content = await readIndexableFile(files[i]!);
    if (!content) continue;
    const parts = chunkFileText(files[i]!, content);
    for (const part of parts) {
      if (chunks.length >= MAX_INDEX_CHUNKS) break;
      chunks.push({
        id: crypto.randomUUID(),
        path: files[i]!,
        startLine: part.startLine,
        endLine: part.endLine,
        content: part.content,
        contentHash: chunkContentHash(part.content),
      });
    }
    if (chunks.length >= MAX_INDEX_CHUNKS) break;
  }

  onProgress?.({ done: total, total, phase: "embedding" });
  const texts = chunks.map((c) => c.content);
  const batchSize = 8;
  let modelLabel = "keyword";
  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize);
    const { embeddings, modelLabel: ml } = await embedTexts(slice, settings);
    modelLabel = ml;
    for (let j = 0; j < slice.length; j++) {
      const emb = embeddings[j];
      if (emb) chunks[i + j]!.embedding = emb;
    }
    onProgress?.({
      done: Math.min(i + batchSize, texts.length),
      total: texts.length,
      phase: "embedding",
    });
  }

  const index: CodebaseIndex = {
    projectId,
    rootPath,
    version: INDEX_VERSION,
    lastIndexedAt: Date.now(),
    embeddingModel: modelLabel,
    chunks,
  };

  const map = await loadMap();
  map[projectId] = index;
  await saveMap(map);
  onProgress?.({ done: total, total, phase: "done" });
  return index;
}

export async function searchCodebase(
  projectId: string,
  query: string,
  settings: AppSettings,
  topK = DEFAULT_TOP_K,
): Promise<SearchHit[]> {
  const index = await getIndex(projectId);
  if (!index || !query.trim()) return [];

  let queryEmbedding: number[] | null = null;
  const emb = await embedTexts([query], settings);
  if (emb.embeddings[0]) queryEmbedding = emb.embeddings[0];

  return searchChunks(index.chunks, query, queryEmbedding, topK);
}

export async function searchCodebaseForPrompt(
  projectId: string,
  query: string,
  settings: AppSettings,
  label?: string,
): Promise<string> {
  const hits = await searchCodebase(projectId, query, settings);
  return formatSearchHitsForPrompt(hits, label);
}

export async function clearProjectIndex(projectId: string): Promise<void> {
  const map = await loadMap();
  delete map[projectId];
  await saveMap(map);
}

export { formatSearchHitsForPrompt };
