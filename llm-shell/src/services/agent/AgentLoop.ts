import type { ChatMessage, ToolCall, AppSettings, ToolExecution } from "@/types";
import { LLMClient } from "@/services/llm/LLMClient";
import { ModelRouter, ProfileRouter } from "@/services/llm/ModelRouter";
import { useSettingsStore } from "@/stores/settingsStore";
import { profileToProvider } from "@/types";
import type { ApiProfile } from "@/types";

function profileToProviderSafe(p: ApiProfile) {
  return profileToProvider(p);
}
import { ToolRegistry } from "./ToolRegistry";
import { ContextManager, buildSystemPrompt, prepareApiMessages } from "./ContextManager";
import { extractToolCallsFromText } from "./parseTextToolCalls";
import { getSkillRegistry } from "@/services/skills/SkillRegistry";
import { formatSkillsForPrompt, matchSkills } from "@/services/skills/matchSkills";
import { useChatStore } from "@/stores/chatStore";
import { useAgentStore } from "@/stores/agentStore";
import { useApiHealthStore } from "@/stores/apiHealthStore";
import { errorMessage } from "@/utils/errors";
import { yandexModelUriError } from "@/services/llm/providerPresets";
import { getRelevantSuccessMemoryBlock, recordSuccessTask } from "@/services/memory/successMemory";
import { loadWorkspaceRules } from "@/services/rules/rulesLoader";
import { beginCheckpoint, captureFileContent } from "@/services/agent/checkpoints";
import { useEditQueueStore } from "@/stores/editQueueStore";
import { useMcpStore } from "@/stores/mcpStore";
import {
  isToolAllowedInMode,
  modePromptBlock,
  toolDefinitionsForMode,
} from "@/services/agent/agentModes";
import { batchToolCalls } from "@/services/agent/parallelTools";
import { toolResultForChat } from "@/services/agent/toolResultFormat";
import { buildHandoffPacket, shouldAttemptHandoff } from "@/services/agent/handoff";
import { STRICT_TOOLS_NUDGE } from "@/utils/constants";
import type { AgentMode } from "@/types";
import {
  formatPlanForChat,
  formatPlanForExecute,
  parseTaskPlan,
  planPhaseUserNudge,
} from "@/services/agent/taskPlan";

export interface AgentLoopDeps {
  client: LLMClient;
  registry: ToolRegistry;
  settings: AppSettings;
  abortSignal?: AbortSignal;
}

function toApiMessages(messages: ChatMessage[]) {
  return prepareApiMessages(messages).map((m) => {
    const base: {
      role: string;
      content: string | ChatMessage["content"];
      tool_calls?: ToolCall[];
      tool_call_id?: string;
      name?: string;
    } = {
      role: m.role,
      // Pass multimodal ContentPart[] through for vision models (e.g. screenshot previews)
      content: typeof m.content === "string" ? m.content : m.content,
    };
    if (m.tool_calls) base.tool_calls = m.tool_calls;
    if (m.tool_call_id) base.tool_call_id = m.tool_call_id;
    if (m.name) base.name = m.name;
    return base;
  });
}

function screenshotDataUrl(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const url = (result as { data_url?: unknown }).data_url;
  return typeof url === "string" && url.startsWith("data:image/") ? url : undefined;
}

export async function runAgentLoop(userText: string, deps: AgentLoopDeps): Promise<void> {
  const { client, registry, settings } = deps;
  const chat = useChatStore.getState();
  const agent = useAgentStore.getState();
  const ctx = new ContextManager(settings.agent.maxContextTokens);
  const maxIter = settings.agent.maxIterations;
  const router = new ModelRouter(settings.provider);
  const profileRouter = new ProfileRouter(
    settings.activeProfileId,
    settings.apiProfiles,
    settings.profileFailover,
  );

  // Offline: stick to Ollama; online combat profiles prefer cloud
  if (settings.agent.offlineMode) {
    const ollama = settings.apiProfiles.find((p) => p.type === "ollama");
    if (ollama && ollama.id !== settings.activeProfileId) {
      useSettingsStore.getState().setActiveProfile(ollama.id);
      client.updateConfig({
        baseUrl: ollama.baseUrl,
        apiKey: ollama.apiKey,
        network: settings.network,
      });
      router.reset(profileToProviderSafe(ollama));
    }
  }

  agent.clearLog();
  agent.setMaxIterations(maxIter);
  agent.setStatus("thinking");
  // Always start from the active settings model (clear stale failover badge / wrong provider)
  agent.setActiveModel(router.current());
  chat.setStreaming(true);
  beginCheckpoint(chat.currentSessionId);

  if (settings.provider.type === "yandex") {
    const uriErr = yandexModelUriError(router.current());
    if (uriErr) {
      chat.addMessage({ role: "user", content: userText });
      chat.addMessage({ role: "assistant", content: uriErr });
      chat.setStreaming(false);
      agent.setStatus("idle");
      return;
    }
  }

  const workspace = settings.agent.workingDirectory || settings.workspace.path;
  const agentMode: AgentMode = settings.agent.mode ?? "agent";
  const skillRegistry = getSkillRegistry();
  try {
    await skillRegistry.load(workspace || undefined);
  } catch (err) {
    console.warn("skills load:", errorMessage(err));
  }

  // Attach MCP tools from connected servers
  for (const handler of useMcpStore.getState().toolHandlers()) {
    if (!registry.get(handler.name)) registry.register(handler);
  }

  const modeTools = toolDefinitionsForMode(registry, agentMode);
  const activeSkills = matchSkills(userText, skillRegistry.list());
  agent.setActiveSkills(activeSkills.map((s) => s.name));
  const skillsBlock = formatSkillsForPrompt(activeSkills);

  let ragBlock = "";
  if (settings.agent.ragFromSuccess !== false && workspace) {
    try {
      ragBlock = await getRelevantSuccessMemoryBlock(userText, workspace, {
        projectId: settings.activeProjectId,
        settings,
      });
    } catch (err) {
      console.warn("success memory retrieve:", errorMessage(err));
    }
  }

  let rulesBlock = "";
  if (workspace) {
    try {
      rulesBlock = await loadWorkspaceRules(workspace);
    } catch (err) {
      console.warn("rules load:", errorMessage(err));
    }
  }

  const platform = navigator.platform || "unknown";
  const systemContent = buildSystemPrompt(
    workspace,
    platform,
    skillsBlock,
    settings.agent.role ?? "default",
    settings.agent.offlineMode ?? false,
    ragBlock,
    rulesBlock,
    modePromptBlock(agentMode),
  );

  // Refresh system message each turn so skills match the latest user request
  const session = chat.currentSession();
  const existingSystem = session.messages.find((m) => m.role === "system");
  if (existingSystem) {
    useChatStore.getState().updateMessage(existingSystem.id, { content: systemContent });
  } else {
    chat.addMessage({ role: "system", content: systemContent });
  }

  chat.addMessage({ role: "user", content: userText });

  // A1: Plan→Execute — structured JSON plan before tools (Agent mode only)
  if (agentMode === "agent" && settings.agent.planThenExecute !== false) {
    if (deps.abortSignal?.aborted) {
      chat.setStreaming(false);
      agent.setStatus("idle");
      return;
    }
    agent.setStatus("thinking");
    const planMsgId = chat.addMessage({
      role: "assistant",
      content: "Planning…",
      streaming: true,
    });
    let planText = "";
    try {
      const historyForPlan = useChatStore
        .getState()
        .currentSession()
        .messages.filter((m) => m.id !== planMsgId);
      const apiPlan = [
        ...toApiMessages(ctx.trim(historyForPlan)),
        { role: "user" as const, content: planPhaseUserNudge(userText) },
      ];
      for await (const ev of client.streamChat({
        model: router.current(),
        messages: apiPlan,
        tools: undefined,
        tool_choice: "none",
        temperature: 0.1,
        max_tokens: Math.min(settings.generation.maxTokens, 1500),
        top_p: settings.generation.topP,
        stream: true,
      })) {
        if (deps.abortSignal?.aborted) {
          client.cancel();
          break;
        }
        if (ev.type === "content") {
          planText += ev.text;
          useChatStore.getState().updateMessage(planMsgId, {
            content: planText || "Planning…",
            streaming: true,
          });
        }
      }
    } catch (err) {
      console.warn("plan phase:", errorMessage(err));
    }

    const plan = parseTaskPlan(planText);
    if (plan) {
      useChatStore.getState().updateMessage(planMsgId, {
        content: formatPlanForChat(plan),
        streaming: false,
      });
      chat.addMessage({
        role: "system",
        content: formatPlanForExecute(plan),
      });
    } else {
      useChatStore.getState().updateMessage(planMsgId, {
        content:
          planText.trim().length > 20
            ? `## Execution plan (unstructured)\n\n${planText.trim().slice(0, 2000)}\n\n_Executing with tools…_`
            : "No structured plan — executing with tools directly.",
        streaming: false,
      });
    }
  }

  try {
    for (let iter = 1; iter <= maxIter; iter++) {
      if (deps.abortSignal?.aborted) break;
      agent.setIteration(iter);
      agent.setStatus("thinking");
      agent.setActiveModel(router.current());

      const history = ctx.trim(useChatStore.getState().currentSession().messages);
      agent.setContextTokens(ctx.countMessages(history));

      let assistantId = chat.addMessage({
        role: "assistant",
        content: "",
        streaming: true,
      });

      let content = "";
      let toolCalls: ToolCall[] | undefined;
      let streamError: string | null = null;

      const apiMessages = () =>
        toApiMessages(ctx.trim(useChatStore.getState().currentSession().messages));

      const runStream = async (model: string) => {
        content = "";
        toolCalls = undefined;
        streamError = null;
        const temperature = Math.min(settings.generation.temperature, 0.3);
        const toolChoice =
          agentMode === "plan"
            ? "none"
            : modeTools.length
              ? agentMode === "agent" && settings.agent.strictTools
                ? "required"
                : "auto"
              : "none";
        for await (const ev of client.streamChat({
          model,
          messages: apiMessages(),
          tools: modeTools.length ? modeTools : undefined,
          tool_choice: toolChoice,
          temperature,
          max_tokens: settings.generation.maxTokens,
          top_p: settings.generation.topP,
          stream: true,
        })) {
          if (deps.abortSignal?.aborted) {
            client.cancel();
            break;
          }
          if (ev.type === "content") {
            content += ev.text;
            useChatStore.getState().updateMessage(assistantId, {
              content,
              streaming: true,
            });
          } else if (ev.type === "tool_calls") {
            toolCalls = ev.toolCalls;
          } else if (ev.type === "usage") {
            const total = (ev.promptTokens ?? 0) + (ev.completionTokens ?? 0);
            if (total) useAgentStore.getState().setContextTokens(total);
          } else if (ev.type === "error") {
            streamError = ev.error;
          }
        }
      };

      /** Seal partial answer + inject handoff, then retry on another model. */
      const retryWithHandoff = async (fromModel: string, toModel: string, reason: string) => {
        const partial = content;
        const packet = buildHandoffPacket({
          userGoal: userText,
          partialAssistant: partial,
          toolLog: useAgentStore.getState().toolLog,
          reason,
          fromModel,
          toModel,
        });
        useChatStore.getState().updateMessage(assistantId, {
          content:
            (partial.trim() ? partial.trim() + "\n\n" : "") +
            `⚠ Поток прерван (${reason.slice(0, 160)}). Передаю контекст → ${toModel}…`,
          streaming: false,
        });
        useChatStore.getState().addMessage({
          role: "user",
          content: packet,
        });
        assistantId = useChatStore.getState().addMessage({
          role: "assistant",
          content: "",
          streaming: true,
        });
        useAgentStore.getState().setActiveModel(toModel);
        streamError = null;
        await runStream(toModel);
      };

      await runStream(router.current());

      if (streamError && shouldAttemptHandoff(streamError)) {
        useApiHealthStore
          .getState()
          .reportLlmError(profileRouter.currentProfile().id, streamError);

        const fromModel = router.current();
        const fo = router.tryFailover(streamError);
        if (fo.switched) {
          await retryWithHandoff(fromModel, fo.to, fo.reason || streamError);
          if (streamError) {
            useApiHealthStore
              .getState()
              .reportLlmError(profileRouter.currentProfile().id, streamError);
          }
        }
      }

      // Cross-profile failover: temporary client only + handoff packet
      if (streamError && shouldAttemptHandoff(streamError) && !settings.agent.offlineMode) {
        const homeProfileId = settings.activeProfileId;
        const homeProvider = { ...settings.provider };
        const failedProfileId = profileRouter.currentProfile().id;
        const fromModel = router.current();
        const pf = profileRouter.tryNextProfile(streamError);
        if (pf.switched && pf.provider) {
          useApiHealthStore.getState().reportLlmError(failedProfileId, streamError);
          client.updateConfig({
            baseUrl: pf.provider.baseUrl,
            apiKey: pf.provider.apiKey,
            network: settings.network,
          });
          router.reset(pf.provider);
          await retryWithHandoff(fromModel, router.current(), pf.reason || streamError);
          client.updateConfig({
            baseUrl: homeProvider.baseUrl,
            apiKey: homeProvider.apiKey,
            network: settings.network,
          });
          router.reset(homeProvider);
          if (useSettingsStore.getState().settings.activeProfileId !== homeProfileId) {
            useSettingsStore.getState().setActiveProfile(homeProfileId);
          }
          useAgentStore.getState().setActiveModel(homeProvider.model);
          if (streamError) {
            useApiHealthStore.getState().reportLlmError(failedProfileId, streamError);
          }
        }
      }

      if (streamError) {
        const idle = /stream idle timeout/i.test(streamError);
        useChatStore.getState().updateMessage(assistantId, {
          content: content
            ? content +
              (idle
                ? "\n\n⚠ Поток оборвался (нет токенов от API). Можно повторить — handoff подхватит tools/черновик."
                : `\n\nError: ${streamError}`)
            : `Error: ${streamError}`,
          streaming: false,
        });
        useAgentStore.getState().setStatus("error");
        useChatStore.getState().setStreaming(false);
        return;
      }

      // Fallback: local models often emit tools as plain text / fake JSON
      const applyTextToolFallback = () => {
        if ((!toolCalls || toolCalls.length === 0) && content) {
          const extracted = extractToolCallsFromText(content);
          if (extracted.toolCalls.length > 0) {
            toolCalls = extracted.toolCalls;
            content =
              extracted.cleanedContent ||
              `(calling ${toolCalls.map((t) => t.function.name).join(", ")})`;
          }
        }
      };
      applyTextToolFallback();

      // Strict tools: one nudge retry when Agent mode returns prose without tool_calls
      const wantsStrictTools =
        agentMode === "agent" &&
        settings.agent.strictTools &&
        modeTools.length > 0 &&
        (!toolCalls || toolCalls.length === 0);

      if (wantsStrictTools) {
        useChatStore.getState().updateMessage(assistantId, {
          content:
            (content.trim() ? content.trim() + "\n\n" : "") +
            "⚠ Strict tools: повторный запрос — модель должна вызвать tool…",
          streaming: false,
        });
        useChatStore.getState().addMessage({
          role: "user",
          content: STRICT_TOOLS_NUDGE,
        });
        assistantId = useChatStore.getState().addMessage({
          role: "assistant",
          content: "",
          streaming: true,
        });
        await runStream(router.current());
        if (streamError) {
          useChatStore.getState().updateMessage(assistantId, {
            content: content
              ? `${content}\n\nError: ${streamError}`
              : `Error: ${streamError}`,
            streaming: false,
          });
          useAgentStore.getState().setStatus("error");
          useChatStore.getState().setStreaming(false);
          return;
        }
        applyTextToolFallback();
      }

      useChatStore.getState().updateMessage(assistantId, {
        content,
        tool_calls: toolCalls,
        streaming: false,
      });

      if (!toolCalls || toolCalls.length === 0) {
        if (settings.agent.ragFromSuccess !== false && workspace && content.trim()) {
          const toolLog = useAgentStore.getState().toolLog;
          const hadToolErrors = toolLog.some((t) => t.status === "error");
          const looksLikeError = /^error:/i.test(content.trim());
          if (!hadToolErrors && !looksLikeError) {
            const filesTouched = toolLog
              .map((t) => String(t.args.filePath ?? t.args.path ?? ""))
              .filter(Boolean);
            void recordSuccessTask({
              workspacePath: workspace,
              projectId: settings.activeProjectId,
              sessionId: useChatStore.getState().currentSessionId,
              userQuery: userText,
              solutionSummary: content,
              toolsUsed: [...new Set(toolLog.map((t) => t.toolName))],
              filesTouched,
              settings,
            }).catch((err) => console.warn("success memory record:", errorMessage(err)));
          }
        }
        useAgentStore.getState().setStatus("idle");
        useChatStore.getState().setStreaming(false);
        return;
      }

      const pendingScreenshots: { path: string; dataUrl: string }[] = [];

      const runOneTool = async (tc: ToolCall) => {
        const handler = registry.get(tc.function.name);
        const execId = crypto.randomUUID();
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = { raw: tc.function.arguments };
        }

        const execution: ToolExecution = {
          id: execId,
          toolCallId: tc.id,
          toolName: tc.function.name,
          args,
          status: "pending",
          startedAt: Date.now(),
        };
        useAgentStore.getState().pushTool(execution);

        if (!handler) {
          useAgentStore.getState().updateTool(execId, {
            status: "error",
            error: `Unknown tool: ${tc.function.name}`,
            completedAt: Date.now(),
          });
          useChatStore.getState().addMessage({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: JSON.stringify({ error: `Unknown tool: ${tc.function.name}` }),
          });
          return;
        }

        if (!isToolAllowedInMode(tc.function.name, agentMode)) {
          useAgentStore.getState().updateTool(execId, {
            status: "cancelled",
            error: `Blocked in ${agentMode} mode`,
            completedAt: Date.now(),
          });
          useChatStore.getState().addMessage({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: JSON.stringify({
              error: `Tool «${tc.function.name}» is not allowed in ${agentMode} mode`,
            }),
          });
          return;
        }

        const needsConfirm =
          handler.requiresConfirmation &&
          !settings.agent.autoExecute &&
          handler.confirmationKey &&
          settings.agent.confirmations[handler.confirmationKey];

        if (needsConfirm) {
          const granted = await useAgentStore.getState().requestPermission({
            id: crypto.randomUUID(),
            action: handler.confirmationKey!,
            description: `Allow ${handler.name}?`,
            details: args,
          });
          if (!granted) {
            useAgentStore.getState().updateTool(execId, {
              status: "cancelled",
              completedAt: Date.now(),
            });
            useChatStore.getState().addMessage({
              role: "tool",
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify({ error: "User denied permission" }),
            });
            return;
          }
        }

        useAgentStore.getState().setStatus("executing_tool");
        useAgentStore.getState().updateTool(execId, { status: "running" });
        try {
          let before = "";
          const fileEditTools = new Set(["write_file", "edit_file", "apply_patch"]);
          if (fileEditTools.has(tc.function.name)) {
            const filePath = String(args.filePath ?? "");
            if (filePath) {
              try {
                const { readFile } = await import("@/services/tauri/fs");
                const f = await readFile(filePath);
                before = f.is_binary ? "" : f.content;
              } catch {
                before = "";
              }
              captureFileContent(filePath, before);
            }
          }

          const result = await handler.execute(args);

          if (fileEditTools.has(tc.function.name)) {
            const filePath = String(args.filePath ?? "");
            let after = typeof args.content === "string" ? args.content : "";
            if ((tc.function.name === "edit_file" || tc.function.name === "apply_patch") && filePath) {
              try {
                const { readFile } = await import("@/services/tauri/fs");
                const f = await readFile(filePath);
                after = f.content;
              } catch {
                /* keep */
              }
            }
            if (filePath && before !== after) {
              useEditQueueStore.getState().push({ path: filePath, oldValue: before, newValue: after });
            }
          }

          useAgentStore.getState().updateTool(execId, {
            status: "success",
            result:
              tc.function.name === "take_screenshot" && result && typeof result === "object"
                ? (() => {
                    const { data_url: _d, ...rest } = result as Record<string, unknown>;
                    return rest;
                  })()
                : result,
            completedAt: Date.now(),
          });
          useChatStore.getState().addMessage({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: toolResultForChat(tc.function.name, result),
          });

          if (tc.function.name === "take_screenshot") {
            const dataUrl = screenshotDataUrl(result);
            const path =
              result && typeof result === "object" && typeof (result as { path?: unknown }).path === "string"
                ? (result as { path: string }).path
                : "";
            if (dataUrl) pendingScreenshots.push({ path, dataUrl });
          }
        } catch (err) {
          const msg = errorMessage(err);
          useAgentStore.getState().updateTool(execId, {
            status: "error",
            error: msg,
            completedAt: Date.now(),
          });
          useChatStore.getState().addMessage({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: JSON.stringify({ error: msg }),
          });
        }
      };

      for (const batch of batchToolCalls(toolCalls)) {
        if (batch.length === 1) {
          await runOneTool(batch[0]!);
        } else {
          await Promise.all(batch.map((tc) => runOneTool(tc)));
        }
      }

      // After all tool results: attach screenshots for vision models (keeps tool_call order valid)
      for (const shot of pendingScreenshots) {
        useChatStore.getState().addMessage({
          role: "user",
          content: [
            {
              type: "text",
              text: `[Screenshot from take_screenshot${shot.path ? `: ${shot.path}` : ""}] Describe what you see if the user asked to inspect the UI.`,
            },
            { type: "image_url", image_url: { url: shot.dataUrl, detail: "high" } },
          ],
        });
      }
    }

    useChatStore.getState().addMessage({
      role: "assistant",
      content: `Stopped: reached max iterations (${maxIter}).`,
    });
    useAgentStore.getState().setStatus("stopped");
  } catch (err) {
    useChatStore.getState().addMessage({
      role: "assistant",
      content: `Agent error: ${errorMessage(err)}`,
    });
    useAgentStore.getState().setStatus("error");
  } finally {
    useChatStore.getState().setStreaming(false);
    const st = useAgentStore.getState().status;
    if (st === "thinking" || st === "executing_tool") {
      useAgentStore.getState().setStatus("idle");
    }
  }
}
