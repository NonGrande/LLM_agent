import type { ToolExecution } from "@/types";

export interface HandoffInput {
  userGoal: string;
  partialAssistant: string;
  toolLog: ToolExecution[];
  reason: string;
  fromModel: string;
  toModel: string;
}

/** Compact packet so the next model continues instead of restarting discovery. */
export function buildHandoffPacket(input: HandoffInput): string {
  const tools = summarizeTools(input.toolLog);
  const files = summarizeFiles(input.toolLog);
  const draft = input.partialAssistant.trim().slice(0, 1500);
  const reason = input.reason.trim().slice(0, 240);

  return [
    "[Model handoff — continue the same task, do not restart from scratch]",
    `User goal: ${input.userGoal.trim().slice(0, 800)}`,
    `Previous model: ${input.fromModel} → now: ${input.toModel}`,
    `Interrupt reason: ${reason || "stream interrupted"}`,
    tools ? `Tools already done:\n${tools}` : "Tools already done: (none in this run yet)",
    files ? `Files/paths touched:\n${files}` : "",
    draft
      ? `Partial draft (may be incomplete — finish or correct):\n"""\n${draft}\n"""`
      : "Partial draft: (empty — start the answer, reuse tool results above)",
    "",
    "Continue: prefer Success RAG / already-fetched tool results; call new tools only for missing facts; then give the final answer.",
  ]
    .filter(Boolean)
    .join("\n");
}

function summarizeTools(log: ToolExecution[]): string {
  const ok = log.filter((t) => t.status === "success" || t.status === "error");
  if (!ok.length) return "";
  return ok
    .slice(-12)
    .map((t) => {
      const argHint = briefArgs(t.args);
      const status = t.status === "error" ? ` ERROR: ${(t.error ?? "").slice(0, 80)}` : " ok";
      return `- ${t.toolName}${argHint}${status}`;
    })
    .join("\n");
}

function summarizeFiles(log: ToolExecution[]): string {
  const paths = new Set<string>();
  for (const t of log) {
    for (const key of ["filePath", "path", "dirPath"]) {
      const v = t.args[key];
      if (typeof v === "string" && v.trim()) paths.add(v.trim());
    }
  }
  return [...paths].slice(0, 15).map((p) => `- ${p}`).join("\n");
}

function briefArgs(args: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of ["path", "filePath", "dirPath", "pattern", "url", "command"]) {
    const v = args[key];
    if (typeof v === "string" && v.trim()) {
      parts.push(`${key}=${v.trim().slice(0, 80)}`);
    }
  }
  return parts.length ? ` (${parts.join(", ")})` : "";
}

/** True when error should trigger model/profile handoff retry (not user abort alone). */
export function shouldAttemptHandoff(error: string | null | undefined): boolean {
  if (!error) return false;
  const m = error.toLowerCase();
  if (m === "aborted" || m.startsWith("aborted")) return false;
  return true;
}
