import { appDataStateStorage } from "@/services/persist/appDataStorage";
import { STORAGE_KEYS } from "@/utils/constants";
import { cosineSimilarity } from "@/services/index/retrieve";
import { embedTexts } from "@/services/index/embeddings";
import type { AppSettings } from "@/types";

export interface SuccessMemoryEntry {
  id: string;
  workspacePath: string;
  /** Optional project scope (I9) */
  projectId?: string;
  sessionId: string;
  userQuery: string;
  solutionSummary: string;
  toolsUsed: string[];
  filesTouched: string[];
  createdAt: number;
  outcome: "success";
  /** Optional embedding of query+summary for hybrid retrieve */
  embedding?: number[];
  /** How the memory was created */
  source?: "auto" | "user_accepted";
}

interface SuccessMemoryBlob {
  version: 1 | 2;
  entries: SuccessMemoryEntry[];
}

const MAX_GLOBAL = 500;
const MAX_PER_WORKSPACE = 200;
const SUMMARY_MAX = 2000;

let cache: SuccessMemoryBlob | null = null;

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

function tokenize(text: string): Set<string> {
  const raw = text.toLowerCase().match(/[\p{L}\p{N}_./:-]{3,}/gu) ?? [];
  return new Set(raw.filter((t) => t.length >= 3));
}

function emptyBlob(): SuccessMemoryBlob {
  return { version: 2, entries: [] };
}

async function loadBlob(): Promise<SuccessMemoryBlob> {
  if (cache) return cache;
  try {
    const raw = await appDataStateStorage.getItem(STORAGE_KEYS.SUCCESS_MEMORY);
    if (!raw) {
      cache = emptyBlob();
      return cache;
    }
    const parsed = JSON.parse(raw) as SuccessMemoryBlob;
    if ((parsed?.version === 1 || parsed?.version === 2) && Array.isArray(parsed.entries)) {
      cache = { version: 2, entries: parsed.entries };
      return cache;
    }
  } catch {
    /* fall through */
  }
  cache = emptyBlob();
  return cache;
}

async function saveBlob(blob: SuccessMemoryBlob): Promise<void> {
  cache = blob;
  await appDataStateStorage.setItem(STORAGE_KEYS.SUCCESS_MEMORY, JSON.stringify(blob));
}

function trimEntries(entries: SuccessMemoryEntry[]): SuccessMemoryEntry[] {
  const byWs = new Map<string, SuccessMemoryEntry[]>();
  for (const e of entries) {
    const key = normalizePath(e.workspacePath || "");
    const list = byWs.get(key) ?? [];
    list.push(e);
    byWs.set(key, list);
  }
  const trimmed: SuccessMemoryEntry[] = [];
  for (const list of byWs.values()) {
    const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
    trimmed.push(...sorted.slice(0, MAX_PER_WORKSPACE));
  }
  return trimmed.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_GLOBAL);
}

export function scoreMemoryEntry(query: string, entry: SuccessMemoryEntry): number {
  const qTokens = tokenize(query);
  if (qTokens.size === 0) return 0;
  const hay = `${entry.userQuery} ${entry.solutionSummary} ${entry.toolsUsed.join(" ")} ${entry.filesTouched.join(" ")}`;
  const hTokens = tokenize(hay);
  let overlap = 0;
  for (const t of qTokens) {
    if (hTokens.has(t)) overlap += 1;
  }
  return overlap / qTokens.size;
}

/** Hybrid: keyword + optional cosine when both embeddings exist. */
export function scoreMemoryHybrid(
  query: string,
  entry: SuccessMemoryEntry,
  queryEmbedding?: number[] | null,
): number {
  const kw = scoreMemoryEntry(query, entry);
  if (queryEmbedding?.length && entry.embedding?.length) {
    const cos = cosineSimilarity(queryEmbedding, entry.embedding);
    return kw * 0.4 + Math.max(0, cos) * 0.6;
  }
  return kw;
}

export function retrieveSuccessMemories(
  query: string,
  workspacePath: string,
  entries: SuccessMemoryEntry[],
  limit = 3,
  opts?: { projectId?: string; queryEmbedding?: number[] | null },
): SuccessMemoryEntry[] {
  const ws = normalizePath(workspacePath);
  if (!ws) return [];

  let scoped = entries.filter((e) => normalizePath(e.workspacePath) === ws);
  if (opts?.projectId) {
    const pid = opts.projectId;
    const projectScoped = scoped.filter((e) => !e.projectId || e.projectId === pid);
    if (projectScoped.length) scoped = projectScoped;
  }

  return scoped
    .map((e) => ({ e, score: scoreMemoryHybrid(query, e, opts?.queryEmbedding) }))
    .filter(({ score }) => score > 0.18)
    .sort((a, b) => b.score - a.score || b.e.createdAt - a.e.createdAt)
    .slice(0, limit)
    .map(({ e }) => e);
}

export function formatSuccessMemoryForPrompt(entries: SuccessMemoryEntry[]): string {
  if (entries.length === 0) return "";
  const lines = entries.map((e, i) => {
    const tools = e.toolsUsed.length ? `\nTools: ${e.toolsUsed.join(", ")}` : "";
    const files = e.filesTouched.length ? `\nFiles: ${e.filesTouched.slice(0, 5).join(", ")}` : "";
    const src = e.source === "user_accepted" ? " (user-accepted)" : "";
    return `${i + 1}.${src} **Q:** ${e.userQuery.slice(0, 300)}\n   **A:** ${e.solutionSummary.slice(0, 400)}${tools}${files}`;
  });
  return `\n## Past successful tasks / Success RAG (workspace-scoped)\nIf one of these clearly answers the current question, reuse it and skip rediscovery/web.\nIgnore entries that are only loosely related.\n\n${lines.join("\n\n")}\n`;
}

export interface RecordSuccessParams {
  workspacePath: string;
  projectId?: string;
  sessionId: string;
  userQuery: string;
  solutionSummary: string;
  toolsUsed: string[];
  filesTouched: string[];
  settings?: AppSettings;
  /** user_accepted = Pin/👍; auto = completed agent run */
  source?: "auto" | "user_accepted";
}

export async function recordSuccessTask(params: RecordSuccessParams): Promise<void> {
  const summary = params.solutionSummary.trim();
  if (!summary || summary.length < 8) return;

  let embedding: number[] | undefined;
  if (params.settings) {
    try {
      const text = `${params.userQuery}\n${summary}`.slice(0, 6000);
      const { embeddings } = await embedTexts([text], params.settings);
      const emb = embeddings[0];
      if (emb?.length) embedding = emb;
    } catch {
      /* keyword-only fallback */
    }
  }

  const blob = await loadBlob();
  const entry: SuccessMemoryEntry = {
    id: crypto.randomUUID(),
    workspacePath: params.workspacePath,
    projectId: params.projectId,
    sessionId: params.sessionId,
    userQuery: params.userQuery.trim().slice(0, 1000),
    solutionSummary: summary.slice(0, SUMMARY_MAX),
    toolsUsed: [...new Set(params.toolsUsed)],
    filesTouched: [...new Set(params.filesTouched)].slice(0, 20),
    createdAt: Date.now(),
    outcome: "success",
    embedding,
    source: params.source ?? "auto",
  };

  blob.entries = trimEntries([entry, ...blob.entries]);
  blob.version = 2;
  await saveBlob(blob);
}

export async function getRelevantSuccessMemoryBlock(
  query: string,
  workspacePath: string,
  opts?: { projectId?: string; settings?: AppSettings },
): Promise<string> {
  const blob = await loadBlob();
  let queryEmbedding: number[] | null = null;
  if (opts?.settings) {
    try {
      const { embeddings } = await embedTexts([query.slice(0, 4000)], opts.settings);
      queryEmbedding = embeddings[0] ?? null;
    } catch {
      queryEmbedding = null;
    }
  }
  const relevant = retrieveSuccessMemories(query, workspacePath, blob.entries, 3, {
    projectId: opts?.projectId,
    queryEmbedding,
  });
  return formatSuccessMemoryForPrompt(relevant);
}

/** Test helper */
export function __resetSuccessMemoryCache(): void {
  cache = null;
}

export async function __loadSuccessMemoryEntries(): Promise<SuccessMemoryEntry[]> {
  return (await loadBlob()).entries;
}

export async function listWorkspaceSuccessEntries(
  workspacePath: string,
): Promise<SuccessMemoryEntry[]> {
  const ws = normalizePath(workspacePath);
  if (!ws) return [];
  const blob = await loadBlob();
  return blob.entries
    .filter((e) => normalizePath(e.workspacePath) === ws)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSuccessMemoryEntry(id: string): Promise<boolean> {
  const blob = await loadBlob();
  const before = blob.entries.length;
  blob.entries = blob.entries.filter((e) => e.id !== id);
  if (blob.entries.length === before) return false;
  await saveBlob(blob);
  return true;
}

export async function updateSuccessMemoryEntry(
  id: string,
  partial: Pick<SuccessMemoryEntry, "userQuery" | "solutionSummary">,
): Promise<boolean> {
  const blob = await loadBlob();
  const entry = blob.entries.find((e) => e.id === id);
  if (!entry) return false;
  if (partial.userQuery !== undefined) {
    entry.userQuery = partial.userQuery.trim().slice(0, 1000);
  }
  if (partial.solutionSummary !== undefined) {
    entry.solutionSummary = partial.solutionSummary.trim().slice(0, SUMMARY_MAX);
  }
  await saveBlob(blob);
  return true;
}
