import { createClientFromSettings } from "@/services/llm/LLMClient";
import type { AppSettings } from "@/types";

export async function runInlineEdit(
  settings: AppSettings,
  args: { filePath: string; selection: string; instruction: string },
): Promise<string> {
  const client = createClientFromSettings(
    settings.provider.baseUrl,
    settings.provider.apiKey,
    settings.network,
  );
  const sys = `You are a code editor assistant. Apply the user instruction to the SELECTED snippet only.
Return ONLY the replacement text — no markdown fences, no explanation.`;
  const user = `File: ${args.filePath}

Instruction: ${args.instruction}

Selected code:
\`\`\`
${args.selection}
\`\`\``;

  let out = "";
  for await (const ev of client.streamChat({
    model: settings.provider.model,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    max_tokens: 2048,
    stream: true,
  })) {
    if (ev.type === "content" && ev.text) out += ev.text;
    if (ev.type === "error") throw new Error(ev.error ?? "LLM error");
  }
  return out.replace(/^```[\w]*\n?/m, "").replace(/\n?```$/m, "").trim();
}
