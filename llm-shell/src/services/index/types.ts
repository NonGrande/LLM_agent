export interface CodeChunk {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  contentHash: string;
  embedding?: number[];
}

export interface CodebaseIndex {
  projectId: string;
  rootPath: string;
  version: 1;
  lastIndexedAt: number;
  embeddingModel: string;
  chunks: CodeChunk[];
}

export interface SearchHit {
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
}

export const INDEX_STORE_KEY = "llm-shell:codebase-index";
export const INDEX_VERSION = 1 as const;
export const MAX_INDEX_FILES = 800;
export const MAX_INDEX_FILE_BYTES = 256 * 1024;
export const MAX_INDEX_CHUNKS = 2500;
export const DEFAULT_TOP_K = 8;
