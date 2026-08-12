import { createHash } from "@/services/index/hash";

export interface TextChunk {
  startLine: number;
  endLine: number;
  content: string;
}

const CHUNK_CHARS = 2000;
const OVERLAP_CHARS = 200;

/** Split file text into overlapping line-aware chunks. */
export function chunkFileText(_path: string, text: string): TextChunk[] {
  if (!text.trim()) return [];
  const lines = text.split(/\r?\n/);
  const chunks: TextChunk[] = [];
  let buf = "";
  let startLine = 1;
  let lineNo = 1;

  const flush = (endLine: number) => {
    const content = buf.trim();
    if (!content) return;
    chunks.push({ startLine, endLine, content });
    if (buf.length > OVERLAP_CHARS) {
      const tail = buf.slice(-OVERLAP_CHARS);
      const tailLines = tail.split(/\r?\n/).length;
      buf = tail;
      startLine = Math.max(1, endLine - tailLines + 1);
    } else {
      buf = "";
      startLine = endLine + 1;
    }
  };

  for (const line of lines) {
    const next = buf ? `${buf}\n${line}` : line;
    if (next.length > CHUNK_CHARS && buf) {
      flush(lineNo - 1);
      buf = line;
      startLine = lineNo;
    } else {
      buf = next;
    }
    lineNo += 1;
  }
  if (buf.trim()) flush(lineNo - 1);

  return chunks;
}

export function chunkContentHash(content: string): string {
  return createHash(content);
}
