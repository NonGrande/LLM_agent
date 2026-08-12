import type { CodeChunk, SearchHit } from "@/services/index/types";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/)
    .filter((t) => t.length >= 2);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

export function keywordScore(query: string, content: string): number {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return 0;
  const lower = content.toLowerCase();
  let score = 0;
  for (const t of qTokens) {
    if (lower.includes(t)) score += 1;
  }
  return score / qTokens.length;
}

export function searchChunks(
  chunks: CodeChunk[],
  query: string,
  queryEmbedding: number[] | null,
  topK: number,
): SearchHit[] {
  const scored = chunks.map((c) => {
    let score = keywordScore(query, c.content);
    if (queryEmbedding && c.embedding?.length) {
      score += cosineSimilarity(queryEmbedding, c.embedding) * 3;
    }
    const pathBoost = query.split(/[/\\]/).some((part) => part && c.path.includes(part)) ? 0.2 : 0;
    return {
      path: c.path,
      startLine: c.startLine,
      endLine: c.endLine,
      content: c.content,
      score: score + pathBoost,
    };
  });

  return scored
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function formatSearchHitsForPrompt(hits: SearchHit[], label = "Codebase context"): string {
  if (!hits.length) return "";
  const body = hits
    .map(
      (h) =>
        `### ${h.path.replace(/\\/g, "/")}:${h.startLine}-${h.endLine}\n\`\`\`\n${h.content.slice(0, 2000)}\n\`\`\``,
    )
    .join("\n\n");
  return `## ${label}\n\n${body}`;
}
