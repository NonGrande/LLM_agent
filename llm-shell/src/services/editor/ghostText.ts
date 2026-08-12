import type { Monaco } from "@monaco-editor/react";
import type {
  CancellationToken,
  IDisposable,
  IPosition,
  IRange,
  editor,
  languages,
} from "monaco-editor";
import { createClientFromSettings } from "@/services/llm/LLMClient";
import { useSettingsStore } from "@/stores/settingsStore";

const DEBOUNCE_MS = 450;
const MAX_PREFIX = 2500;
const MAX_SUFFIX = 800;

/**
 * Register Monaco inline completions (ghost text) via the active LLM.
 * Returns a disposable; no-op when ghost text disabled.
 */
export function registerGhostTextProvider(monaco: Monaco, languageId: string): IDisposable {
  return monaco.languages.registerInlineCompletionsProvider(languageId, {
    provideInlineCompletions: async (
      model: editor.ITextModel,
      position: IPosition,
      _context: languages.InlineCompletionContext,
      token: CancellationToken,
    ): Promise<languages.InlineCompletions> => {
      const settings = useSettingsStore.getState().settings;
      if (!settings.editor?.ghostTextEnabled) {
        return { items: [] };
      }
      if (token.isCancellationRequested) return { items: [] };

      await new Promise((r) => setTimeout(r, DEBOUNCE_MS));
      if (token.isCancellationRequested) return { items: [] };

      const offset = model.getOffsetAt(position);
      const full = model.getValue();
      const prefix = full.slice(Math.max(0, offset - MAX_PREFIX), offset);
      const suffix = full.slice(offset, offset + MAX_SUFFIX);
      if (prefix.trim().length < 8) return { items: [] };

      try {
        const client = createClientFromSettings(
          settings.provider.baseUrl,
          settings.provider.apiKey,
          settings.network,
        );
        let text = "";
        for await (const ev of client.streamChat({
          model: settings.provider.model,
          temperature: 0.1,
          max_tokens: 80,
          stream: true,
          messages: [
            {
              role: "system",
              content:
                "You are a code completion engine. Reply with ONLY the code to insert at the cursor — no markdown, no explanation.",
            },
            {
              role: "user",
              content: `Complete the code.\n\n<<<PREFIX>>>\n${prefix}\n<<<SUFFIX>>>\n${suffix}\n<<<END>>>`,
            },
          ],
        })) {
          if (token.isCancellationRequested) {
            client.cancel();
            return { items: [] };
          }
          if (ev.type === "content" && ev.text) text += ev.text;
          if (ev.type === "error") return { items: [] };
        }
        if (token.isCancellationRequested) return { items: [] };
        const insert = text
          .replace(/^```[\w]*\n?/, "")
          .replace(/\n?```$/, "")
          .trimEnd();
        if (!insert || insert.length < 1) return { items: [] };

        const range: IRange = new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column,
        );
        return {
          items: [
            {
              insertText: insert,
              range,
            },
          ],
        };
      } catch {
        return { items: [] };
      }
    },
    freeInlineCompletions: () => {},
  });
}
