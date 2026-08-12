import { parseSSELines, parseSSEStream } from "./streaming";
import type { ChatCompletionRequest, LLMClientOptions, StreamEvent } from "./types";
import type { NetworkConfig } from "@/types";
import { errorMessage } from "@/utils/errors";
import { isTauri } from "@/utils/env";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { enrichYandexModelUriHttpError } from "./providerPresets";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function activeProxy(network?: NetworkConfig): string | undefined {
  if (!network?.proxyEnabled) return undefined;
  const u = network.proxyUrl?.trim();
  return u || undefined;
}

function useRustTransport(network?: NetworkConfig): boolean {
  if (!isTauri()) return false;
  if (network?.forceRustHttp !== false) return true;
  return Boolean(activeProxy(network));
}

export class LLMClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;
  private maxRetries: number;
  private network?: NetworkConfig;
  private abort: AbortController | null = null;
  private unlisten: UnlistenFn | null = null;

  constructor(opts: LLMClientOptions & { network?: NetworkConfig }) {
    this.baseUrl = normalizeBaseUrl(opts.baseUrl);
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 120_000;
    this.maxRetries = opts.maxRetries ?? 3;
    this.network = opts.network;
  }

  updateConfig(opts: Partial<LLMClientOptions> & { network?: NetworkConfig }) {
    if (opts.baseUrl !== undefined) this.baseUrl = normalizeBaseUrl(opts.baseUrl);
    if (opts.apiKey !== undefined) this.apiKey = opts.apiKey;
    if (opts.timeoutMs !== undefined) this.timeoutMs = opts.timeoutMs;
    if (opts.maxRetries !== undefined) this.maxRetries = opts.maxRetries;
    if (opts.network !== undefined) this.network = opts.network;
  }

  cancel() {
    this.abort?.abort();
    this.abort = null;
    void this.unlisten?.();
    this.unlisten = null;
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      h.Authorization = `Bearer ${this.apiKey}`;
    }
    return h;
  }

  private proxyArg(): string | null {
    return activeProxy(this.network) ?? null;
  }

  async listModels(): Promise<string[]> {
    if (useRustTransport(this.network)) {
      const text = await invoke<string>("llm_http", {
        method: "GET",
        url: `${this.baseUrl}/models`,
        apiKey: this.apiKey || null,
        body: null,
        proxyUrl: this.proxyArg(),
        timeoutMs: this.timeoutMs,
      });
      const json = JSON.parse(text) as { data?: Array<{ id: string }> };
      return (json.data ?? []).map((m) => m.id);
    }
    const res = await this.fetchWithRetry(`${this.baseUrl}/models`, { method: "GET" });
    const json = (await res.json()) as { data?: Array<{ id: string }> };
    return (json.data ?? []).map((m) => m.id);
  }

  async quickProbe(model?: string): Promise<{
    ok: boolean;
    status: "ok" | "auth" | "unreachable";
    message: string;
    httpStatus?: number;
    latencyMs: number;
  }> {
    const started = Date.now();
    if (!this.baseUrl) {
      return { ok: false, status: "unreachable", message: "Empty base URL", latencyMs: 0 };
    }
    if (useRustTransport(this.network)) {
      try {
        const res = await invoke<{
          ok: boolean;
          status: string;
          message: string;
          http_status?: number | null;
          latency_ms: number;
        }>("probe_api", {
          baseUrl: this.baseUrl,
          apiKey: this.apiKey || null,
          timeoutMs: Math.min(this.timeoutMs, 8_000),
          proxyUrl: this.proxyArg(),
        });
        return {
          ok: res.ok,
          status: res.status === "ok" ? "ok" : res.status === "auth" ? "auth" : "unreachable",
          message: res.message,
          httpStatus: res.http_status ?? undefined,
          latencyMs: res.latency_ms,
        };
      } catch (e) {
        return {
          ok: false,
          status: "unreachable",
          message: errorMessage(e),
          latencyMs: Date.now() - started,
        };
      }
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(this.timeoutMs, 8_000));
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: this.headers(),
        signal: ctrl.signal,
      });
      const latencyMs = Date.now() - started;
      if (res.ok) {
        return {
          ok: true,
          status: "ok",
          message: `OK HTTP ${res.status}`,
          httpStatus: res.status,
          latencyMs,
        };
      }
      if (res.status === 401) {
        return {
          ok: false,
          status: "auth",
          message: `Требуется авторизация API (HTTP ${res.status}) — нужен ключ`,
          httpStatus: res.status,
          latencyMs,
        };
      }
      if (res.status === 403) {
        return {
          ok: false,
          status: "auth",
          message: `Доступ запрещён в текущей локации (HTTP ${res.status}) — geo / VPN`,
          httpStatus: res.status,
          latencyMs,
        };
      }
      if (res.status === 402) {
        return {
          ok: false,
          status: "auth",
          message: `Авторизация + оплата: недостаточно баланса (HTTP ${res.status})`,
          httpStatus: res.status,
          latencyMs,
        };
      }
      if (res.status === 404 && model) {
        try {
          const chatOk = await this.pingChat(model, 6_000);
          return chatOk
            ? { ok: true, status: "ok", message: "OK (chat)", latencyMs: Date.now() - started }
            : {
                ok: false,
                status: "unreachable",
                message: `HTTP ${res.status}`,
                httpStatus: res.status,
                latencyMs: Date.now() - started,
              };
        } catch (e) {
          return {
            ok: false,
            status: "unreachable",
            message: errorMessage(e),
            httpStatus: res.status,
            latencyMs: Date.now() - started,
          };
        }
      }
      return {
        ok: false,
        status: res.status >= 500 ? "unreachable" : "auth",
        message: `HTTP ${res.status}`,
        httpStatus: res.status,
        latencyMs,
      };
    } catch (err) {
      return {
        ok: false,
        status: "unreachable",
        message: errorMessage(err),
        latencyMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async pingChat(model: string, timeoutMs: number): Promise<boolean> {
    const prev = this.timeoutMs;
    this.timeoutMs = timeoutMs;
    try {
      for await (const ev of this.streamChat({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 2,
        stream: true,
      })) {
        if (ev.type === "error") return false;
        if (ev.type === "content" || ev.type === "done") {
          this.cancel();
          return true;
        }
      }
      return false;
    } finally {
      this.timeoutMs = prev;
    }
  }

  async testConnection(model?: string): Promise<{ ok: boolean; message: string; models?: string[] }> {
    try {
      const models = await this.listModels();
      if (model && models.length > 0 && !models.includes(model)) {
        return {
          ok: true,
          message: `Connected. Model «${model}» not in /models list (${models.length} models).`,
          models,
        };
      }
      return { ok: true, message: `Connected. ${models.length} model(s).`, models };
    } catch (err) {
      try {
        const gen = this.streamChat({
          model: model || "gpt-4o-mini",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 4,
          stream: true,
        });
        for await (const ev of gen) {
          if (ev.type === "error") return { ok: false, message: ev.error };
          if (ev.type === "content" || ev.type === "done") {
            this.cancel();
            return { ok: true, message: "Connected (chat endpoint OK)." };
          }
        }
        return { ok: true, message: "Connected." };
      } catch (e2) {
        return { ok: false, message: errorMessage(err) + " | " + errorMessage(e2) };
      }
    }
  }

  async *streamChat(req: ChatCompletionRequest): AsyncGenerator<StreamEvent> {
    this.abort = new AbortController();
    // Absolute ceiling. Idle mid-stream stalls are handled in streamChatRust —
    // reqwest timeout does NOT apply after response headers / body streaming starts.
    const absoluteMs = Math.max(this.timeoutMs, 60_000);
    const timer = setTimeout(() => this.abort?.abort(), absoluteMs);
    try {
      if (useRustTransport(this.network)) {
        yield* this.streamChatRust(req);
        return;
      }
      const body = { ...req, stream: true };
      const res = await this.fetchWithRetry(this.baseUrl + "/chat/completions", {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: this.abort.signal,
      });
      if (!res.ok) {
        const textBody = await res.text();
        yield {
          type: "error",
          error: enrichYandexModelUriHttpError(
            "HTTP " + res.status + ": " + textBody.slice(0, 500),
            req.model,
          ),
        };
        return;
      }
      if (!res.body) {
        yield { type: "error", error: "Empty response body" };
        return;
      }
      yield* parseSSEStream(res.body.getReader(), this.abort.signal);
    } catch (err) {
      yield {
        type: "error",
        error: enrichYandexModelUriHttpError(errorMessage(err), req.model),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Rust SSE bridge. Abort + idle MUST wake the queue waiter — otherwise the UI
   * sticks on streaming after the first tokens when the provider stalls.
   */
  private async *streamChatRust(req: ChatCompletionRequest): AsyncGenerator<StreamEvent> {
    const channel = "llm-stream-" + crypto.randomUUID();
    const queue: Array<{ type: string; data?: string; message?: string }> = [];
    let wake: (() => void) | null = null;
    let finished = false;
    /** Only real model tokens reset this — not SSE keepalives / blank lines */
    let lastContentAt = Date.now();
    let gotContent = false;
    const ttftMs = 60_000;
    const stallMs = 30_000;

    const bump = () => {
      wake?.();
      wake = null;
    };

    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      queue.push({ type: "error", message });
      bump();
    };

    const onAbort = () => fail("Aborted");
    this.abort?.signal.addEventListener("abort", onAbort);

    const idleTimer = setInterval(() => {
      if (finished) return;
      const limit = gotContent ? stallMs : ttftMs;
      if (Date.now() - lastContentAt > limit) {
        fail(
          "Stream idle timeout (" +
            Math.round(limit / 1000) +
            "s без токенов от API). Провайдер завис или оборвал SSE — Stop и повторите; проверьте, что активен нужный профиль (не Ollama offline).",
        );
      }
    }, 1000);

    this.unlisten = await listen<{ type: string; data?: string; message?: string }>(
      channel,
      (ev) => {
        queue.push(ev.payload);
        if (ev.payload.type === "done" || ev.payload.type === "error") finished = true;
        bump();
      },
    );

    const invokePromise = invoke("llm_chat_stream", {
      url: this.baseUrl + "/chat/completions",
      apiKey: this.apiKey || null,
      body: JSON.stringify({ ...req, stream: true }),
      proxyUrl: this.proxyArg(),
      channel,
      // Long absolute for slow TTFT; content idle is separate (45s)
      timeoutMs: Math.max(this.timeoutMs, 180_000),
    }).catch((e) => {
      fail(errorMessage(e));
    });

    async function* lineSource(): AsyncGenerator<string> {
      while (!finished || queue.length > 0) {
        if (queue.length === 0) {
          await new Promise<void>((r) => {
            wake = r;
          });
          continue;
        }
        const item = queue.shift()!;
        if (item.type === "chunk" && item.data != null) yield item.data;
        else if (item.type === "error") {
          throw new Error(item.message || "stream error");
        } else if (item.type === "done") {
          return;
        }
      }
    }

    try {
      for await (const ev of parseSSELines(lineSource(), this.abort?.signal)) {
        if (ev.type === "content" || ev.type === "tool_calls" || ev.type === "usage") {
          lastContentAt = Date.now();
          if (ev.type === "content" || ev.type === "tool_calls") gotContent = true;
        }
        if (ev.type === "done") {
          lastContentAt = Date.now();
        }
        yield ev;
      }
    } catch (e) {
      yield {
        type: "error",
        error: enrichYandexModelUriHttpError(errorMessage(e), req.model),
      };
    } finally {
      finished = true;
      clearInterval(idleTimer);
      this.abort?.signal.removeEventListener("abort", onAbort);
      bump();
      await Promise.race([invokePromise, new Promise((r) => setTimeout(r, 2500))]);
      void this.unlisten?.();
      this.unlisten = null;
    }
  }

  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const res = await fetch(url, init);
        if (res.status >= 500 && attempt < this.maxRetries - 1) {
          await sleep(2 ** attempt * 300);
          continue;
        }
        return res;
      } catch (err) {
        lastErr = err;
        if (init.signal?.aborted) throw err;
        if (attempt < this.maxRetries - 1) await sleep(2 ** attempt * 300);
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function createClientFromSettings(
  baseUrl: string,
  apiKey: string,
  network?: NetworkConfig,
): LLMClient {
  return new LLMClient({ baseUrl, apiKey, network });
}
