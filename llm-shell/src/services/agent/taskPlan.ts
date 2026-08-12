/** Structured task plan for Agent mode Plan→Execute (A1). */

export interface PlanStep {
  id: number;
  goal: string;
  tool: string;
  /** Short hint of key args (path, pattern, …) */
  argsHint?: string;
}

export interface TaskPlan {
  intake: string;
  doneWhen: string;
  steps: PlanStep[];
}

const PLAN_PROMPT = `Respond with ONLY a JSON object (no markdown fences, no prose) for this coding task:
{
  "intake": "1 sentence restatement",
  "doneWhen": "done criteria",
  "steps": [
    { "id": 1, "goal": "what", "tool": "exact_tool_name", "argsHint": "key args" }
  ]
}
Rules: 3–8 steps; tool must be a real tool name (read_file, write_file, edit_file, list_files, grep, …); absolute paths in argsHint when known; no simulated bash.`;

export function planPhaseUserNudge(userTask: string): string {
  return `${PLAN_PROMPT}\n\nUser task:\n${userTask.slice(0, 4000)}`;
}

export function formatPlanForChat(plan: TaskPlan): string {
  const lines = plan.steps.map((s) => {
    const hint = s.argsHint?.trim() ? ` — \`${s.argsHint.trim()}\`` : "";
    return `${s.id}. **${s.tool}**: ${s.goal}${hint}`;
  });
  return (
    `## Execution plan\n` +
    `**Task:** ${plan.intake}\n` +
    `**Done when:** ${plan.doneWhen}\n\n` +
    lines.join("\n") +
    `\n\n_Executing with tools…_`
  );
}

export function formatPlanForExecute(plan: TaskPlan): string {
  return (
    `[System — execute this plan with native tool_calls only. One step → tool → result → next. Do not rewrite the plan.]\n` +
    JSON.stringify(plan)
  );
}

/** Extract first JSON object from model text (tolerates ```json fences). */
export function parseTaskPlan(raw: string): TaskPlan | null {
  if (!raw?.trim()) return null;
  let text = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const stepsRaw = obj.steps;
    if (!Array.isArray(stepsRaw) || stepsRaw.length === 0) return null;

    const steps: PlanStep[] = [];
    for (let i = 0; i < Math.min(stepsRaw.length, 8); i++) {
      const s = stepsRaw[i] as Record<string, unknown>;
      const tool = String(s.tool ?? s.name ?? "").trim();
      const goal = String(s.goal ?? s.description ?? s.task ?? "").trim();
      if (!tool || !goal) continue;
      steps.push({
        id: typeof s.id === "number" ? s.id : i + 1,
        goal: goal.slice(0, 300),
        tool: tool.slice(0, 64),
        argsHint:
          s.argsHint != null
            ? String(s.argsHint).slice(0, 200)
            : s.args != null
              ? String(s.args).slice(0, 200)
              : undefined,
      });
    }
    if (!steps.length) return null;

    return {
      intake: String(obj.intake ?? obj.task ?? "Task").trim().slice(0, 400) || "Task",
      doneWhen: String(obj.doneWhen ?? obj.done ?? "Completed").trim().slice(0, 400) || "Completed",
      steps,
    };
  } catch {
    return null;
  }
}
