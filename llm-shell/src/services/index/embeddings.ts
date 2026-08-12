import type { AppSettings } from "@/types";
import { isTauri } from "@/utils/env";
import { invoke } from "@tauri-apps/api/core";

const OLLAMA_EMBED_MODEL = "nomic-embed-text";

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "");
}

async function embedOllama(baseUrl: string, text: string): Promise<number[] | null> {
  const root = normalizeBase(baseUrl).replace(/\/v1$/, "");
  try {
    const res = await fetch(`${root}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { embedding?: number[] };
    return Array.isArray(data.embedding) ? data.embedding : null;
  } catch {
    return null;
  }
}

async function embedOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  text: string,
  proxyUrl?: string | null,
): Promise<number[] | null> {
  if (!isTauri()) return null;
  try {
    const url = `${normalizeBase(baseUrl)}/embeddings`;
    const body = JSON.stringify({
      model,
      input: text.slice(0, 8000),
    });
    const raw = await invoke<string>("llm_http", {
      method: "POST",
      url,
      apiKey: apiKey || null,
      body,
      proxyUrl: proxyUrl ?? null,
      timeoutMs: 60_000,
    });
    const parsed = JSON.parse(raw) as { data?: Array<{ embedding?: number[] }> };
    const emb = parsed.data?.[0]?.embedding;
    return Array.isArray(emb) ? emb : null;
  } catch {
    return null;
  }
}

export interface EmbedBatchResult {
  embeddings: (number[] | null)[];
  modelLabel: string;
}

/** Embed texts — Ollama nomic first, then OpenAI-compatible on active profile. */
export async function embedTexts(texts: string[], settings: AppSettings): Promise<EmbedBatchResult> {
  const ollama = settings.apiProfiles.find((p) => p.type === "ollama");
  const proxy = settings.network?.proxyEnabled ? settings.network.proxyUrl : null;

  if (ollama?.baseUrl) {
    const out: (number[] | null)[] = [];
    for (const t of texts) {
      out.push(await embedOllama(ollama.baseUrl, t));
    }
    if (out.every(Boolean)) {
      return { embeddings: out, modelLabel: `ollama/${OLLAMA_EMBED_MODEL}` };
    }
  }

  const active = settings.apiProfiles.find((p) => p.id === settings.activeProfileId);
  if (active?.baseUrl) {
    const model =
      active.type === "openrouter"
        ? "openai/text-embedding-3-small"
        : "text-embedding-3-small";
    const out: (number[] | null)[] = [];
    for (const t of texts) {
      out.push(
        await embedOpenAiCompatible(active.baseUrl, active.apiKey, model, t, proxy),
      );
    }
    if (out.some(Boolean)) {
      return { embeddings: out, modelLabel: model };
    }
  }

  return { embeddings: texts.map(() => null), modelLabel: "keyword" };
}

export { OLLAMA_EMBED_MODEL };
