import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/utils/env";

export interface HttpTextResult {
  status: number;
  content_type: string;
  body: string;
}

/** Fetch URL text via Rust (proxy-aware, no CORS). Falls back to browser fetch. */
export async function httpGetText(
  url: string,
  opts?: { proxyUrl?: string; timeoutMs?: number; maxChars?: number },
): Promise<HttpTextResult> {
  if (isTauri()) {
    return invoke<HttpTextResult>("http_get_text", {
      url,
      proxyUrl: opts?.proxyUrl?.trim() || null,
      timeoutMs: opts?.timeoutMs ?? 20_000,
      maxChars: opts?.maxChars ?? 80_000,
    });
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 20_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const text = await res.text();
    const cap = opts?.maxChars ?? 80_000;
    return {
      status: res.status,
      content_type: res.headers.get("content-type") ?? "",
      body: text.slice(0, cap),
    };
  } finally {
    clearTimeout(t);
  }
}
