import { ToolRegistry } from "../ToolRegistry";
import * as fs from "@/services/tauri/fs";
import * as search from "@/services/tauri/search";
import * as shell from "@/services/tauri/shell";
import * as screenshot from "@/services/tauri/screenshot";
import * as git from "@/services/git";
import { searchCodebase } from "@/services/index/indexService";
import { formatSearchHitsForPrompt } from "@/services/index/retrieve";
import { fuzzyReplace } from "@/services/agent/fuzzyMatch";
import { applyPatchToFile } from "@/services/agent/patchApply";
import { useSettingsStore } from "@/stores/settingsStore";
import { isTauri } from "@/utils/env";

function agentCwd(): string {
  const s = useSettingsStore.getState().settings;
  return s.agent.workingDirectory || s.workspace.path || "";
}

function str(args: Record<string, unknown>, key: string): string {
  const v = args[key] ?? args[key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)];
  if (typeof v !== "string" || !v) throw new Error(`Missing string arg: ${key}`);
  return v;
}

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register({
    name: "read_file",
    requiresConfirmation: false,
    definition: {
      type: "function",
      function: {
        name: "read_file",
        description:
          "Read the complete contents of a file. Use absolute paths.",
        parameters: {
          type: "object",
          properties: {
            filePath: { type: "string", description: "Absolute path to the file" },
          },
          required: ["filePath"],
        },
      },
    },
    execute: async (args) => {
      const path = str(args, "filePath");
      const file = await fs.readFile(path);
      if (file.is_binary) return { path: file.path, is_binary: true, size: file.size };
      return { path: file.path, size: file.size, content: file.content };
    },
  });

  registry.register({
    name: "write_file",
    requiresConfirmation: true,
    confirmationKey: "writeFile",
    definition: {
      type: "function",
      function: {
        name: "write_file",
        description: "Create or overwrite a file with the given content. Absolute path required.",
        parameters: {
          type: "object",
          properties: {
            filePath: { type: "string" },
            content: { type: "string" },
          },
          required: ["filePath", "content"],
        },
      },
    },
    execute: async (args) => {
      const filePath =
        typeof args.filePath === "string"
          ? args.filePath
          : typeof args.path === "string"
            ? args.path
            : str(args, "filePath");
      const content = str(args, "content");
      await fs.writeFile(filePath, content);
      return { ok: true, path: filePath, bytes: content.length };
    },
  });

  registry.register({
    name: "edit_file",
    requiresConfirmation: true,
    confirmationKey: "editFile",
    definition: {
      type: "function",
      function: {
        name: "edit_file",
        description: "Replace an exact string fragment in a file (prefer unique old_string).",
        parameters: {
          type: "object",
          properties: {
            filePath: { type: "string" },
            oldString: { type: "string" },
            newString: { type: "string" },
            replaceAll: { type: "boolean" },
          },
          required: ["filePath", "oldString", "newString"],
        },
      },
    },
    execute: async (args) => {
      const filePath = str(args, "filePath");
      const oldString = str(args, "oldString");
      const newString = str(args, "newString");
      const replaceAll = Boolean(args.replaceAll);
      try {
        const file = await fs.readFile(filePath);
        if (file.is_binary) {
          return { success: false, matches_found: 0, message: "Cannot edit binary file" };
        }
        const r = fuzzyReplace(file.content, oldString, newString, replaceAll);
        if (!r.ok || r.content === undefined) {
          return { success: false, matches_found: r.matchesFound, message: r.message };
        }
        await fs.writeFile(filePath, r.content);
        return {
          success: true,
          matches_found: r.matchesFound,
          message: r.message,
          fuzzy: r.fuzzy ?? false,
        };
      } catch {
        return fs.editFile(filePath, oldString, newString, replaceAll);
      }
    },
  });

  registry.register({
    name: "apply_patch",
    requiresConfirmation: true,
    confirmationKey: "editFile",
    definition: {
      type: "function",
      function: {
        name: "apply_patch",
        description:
          "Apply a unified diff or old/new replacement to a file. Prefer structured patches over full rewrites.",
        parameters: {
          type: "object",
          properties: {
            filePath: { type: "string" },
            patch: { type: "string", description: "Unified diff hunks (optional if oldString/newString set)" },
            oldString: { type: "string" },
            newString: { type: "string" },
          },
          required: ["filePath"],
        },
      },
    },
    execute: async (args) => {
      const filePath = str(args, "filePath");
      const patch = typeof args.patch === "string" ? args.patch : "";
      const oldString = typeof args.oldString === "string" ? args.oldString : undefined;
      const newString = typeof args.newString === "string" ? args.newString : undefined;
      const mode = patch.trim() ? "unified" : "replace";
      return applyPatchToFile(filePath, patch, mode, oldString, newString);
    },
  });

  registry.register({
    name: "list_files",
    requiresConfirmation: false,
    definition: {
      type: "function",
      function: {
        name: "list_files",
        description: "List files and directories in a directory.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Absolute directory path" },
          },
          required: ["path"],
        },
      },
    },
    execute: async (args) => {
      const entries = await fs.listDirectory(str(args, "path"));
      const { compactDirListing } = await import("@/services/agent/toolResultFormat");
      return compactDirListing(entries);
    },
  });

  registry.register({
    name: "search_files",
    requiresConfirmation: false,
    definition: {
      type: "function",
      function: {
        name: "search_files",
        description: "Find files by glob pattern under a root path.",
        parameters: {
          type: "object",
          properties: {
            pattern: { type: "string" },
            path: { type: "string" },
            excludePatterns: { type: "array", items: { type: "string" } },
          },
          required: ["pattern"],
        },
      },
    },
    execute: async (args) =>
      search.globSearch(
        str(args, "pattern"),
        typeof args.path === "string" ? args.path : undefined,
        Array.isArray(args.excludePatterns) ? (args.excludePatterns as string[]) : undefined,
      ),
  });

  registry.register({
    name: "grep",
    requiresConfirmation: false,
    definition: {
      type: "function",
      function: {
        name: "grep",
        description: "Search file contents with a regular expression.",
        parameters: {
          type: "object",
          properties: {
            pattern: { type: "string" },
            path: { type: "string" },
            include: { type: "string" },
            caseInsensitive: { type: "boolean" },
          },
          required: ["pattern"],
        },
      },
    },
    execute: async (args) =>
      search.grepSearch(
        str(args, "pattern"),
        typeof args.path === "string" ? args.path : undefined,
        typeof args.include === "string" ? args.include : undefined,
        Boolean(args.caseInsensitive),
      ),
  });

  registry.register({
    name: "codebase_search",
    requiresConfirmation: false,
    definition: {
      type: "function",
      function: {
        name: "codebase_search",
        description:
          "Semantic + keyword search over the indexed codebase of the current project. Use for architecture questions.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Natural language search query" },
            topK: { type: "number", description: "Max chunks to return (default 8)" },
          },
          required: ["query"],
        },
      },
    },
    execute: async (args) => {
      const settings = useSettingsStore.getState().settings;
      const projectId = settings.activeProjectId;
      const query = str(args, "query");
      const topK = typeof args.topK === "number" ? args.topK : 8;
      const hits = await searchCodebase(projectId, query, settings, topK);
      return {
        ok: true,
        count: hits.length,
        output: formatSearchHitsForPrompt(hits, "codebase_search results") || "(no matches)",
        hits: hits.map((h) => ({
          path: h.path,
          startLine: h.startLine,
          endLine: h.endLine,
          score: h.score,
        })),
      };
    },
  });

  registry.register({
    name: "execute_command",
    requiresConfirmation: true,
    confirmationKey: "executeCommand",
    definition: {
      type: "function",
      function: {
        name: "execute_command",
        description: "Run a shell command in the workspace (or given cwd).",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string" },
            cwd: { type: "string" },
            timeoutMs: { type: "number" },
          },
          required: ["command"],
        },
      },
    },
    execute: async (args) => {
      const command = str(args, "command");
      const cwd = typeof args.cwd === "string" ? args.cwd : undefined;
      const timeoutMs = typeof args.timeoutMs === "number" ? args.timeoutMs : undefined;
      // Prefer streaming when Tauri available (long commands + kill support)
      if (isTauri()) {
        const { listen } = await import("@tauri-apps/api/event");
        const channel = `shell-${crypto.randomUUID()}`;
        const lines: string[] = [];
        let exitCode: number | null = null;
        let errMsg: string | null = null;
        let finished = false;
        const unlisten = await listen<{
          type: string;
          line?: string;
          code?: number | null;
          message?: string;
          duration_ms?: number;
        }>(channel, (ev) => {
          const p = ev.payload;
          if (p.type === "stdout" && p.line != null) lines.push(p.line);
          else if (p.type === "stderr" && p.line != null) lines.push(`[stderr] ${p.line}`);
          else if (p.type === "error" && p.message) errMsg = p.message;
          else if (p.type === "exit") {
            exitCode = p.code ?? null;
            finished = true;
          }
        });
        try {
          const pid = await shell.executeCommandStreaming(command, cwd, channel, timeoutMs);
          const started = Date.now();
          const limit = timeoutMs ?? 300_000;
          while (Date.now() - started < limit + 2000) {
            if (finished || errMsg) break;
            await new Promise((r) => setTimeout(r, 50));
          }
          if (!finished && !errMsg) {
            await shell.killProcess(pid);
            errMsg = "stream wait timed out; process killed";
          }
          return {
            pid,
            stdout: lines.filter((l) => !l.startsWith("[stderr]")).join("\n"),
            stderr: lines.filter((l) => l.startsWith("[stderr]")).map((l) => l.slice(9)).join("\n") || errMsg || "",
            exit_code: exitCode,
            duration_ms: Date.now() - started,
          };
        } finally {
          unlisten();
        }
      }
      return shell.executeCommand(command, cwd, timeoutMs);
    },
  });

  registry.register({
    name: "kill_process",
    requiresConfirmation: true,
    confirmationKey: "executeCommand",
    definition: {
      type: "function",
      function: {
        name: "kill_process",
        description: "Kill a process previously started via execute_command streaming (by pid).",
        parameters: {
          type: "object",
          properties: {
            pid: { type: "number" },
          },
          required: ["pid"],
        },
      },
    },
    execute: async (args) => {
      const pid = typeof args.pid === "number" ? args.pid : Number(args.pid);
      await shell.killProcess(pid);
      return { killed: pid };
    },
  });

  registry.register({
    name: "take_screenshot",
    requiresConfirmation: false,
    definition: {
      type: "function",
      function: {
        name: "take_screenshot",
        description:
          "Capture a screenshot of the user's screen (primary monitor) or this app window. " +
          "Use when the user asks for a screenshot / скриншот / сними экран, or to inspect the UI. " +
          "Saves a PNG and returns its absolute path plus dimensions. " +
          "Prefer this tool over inventing shell/PowerShell screenshot commands. " +
          "Default target is the primary monitor; use target \"window\" for the LLM Shell window only.",
        parameters: {
          type: "object",
          properties: {
            target: {
              type: "string",
              enum: ["primary", "window"],
              description:
                'Capture target: "primary" (default, primary monitor) or "window" (this app window).',
            },
          },
          required: [],
        },
      },
    },
    execute: async (args) => {
      if (!isTauri()) {
        throw new Error("take_screenshot requires the Tauri desktop app (not browser-only mode)");
      }
      const raw = typeof args.target === "string" ? args.target.toLowerCase() : "primary";
      const target = raw === "window" || raw === "app" || raw === "app_window" ? "window" : "primary";
      const result = await screenshot.takeScreenshot(target);
      return {
        path: result.path,
        width: result.width,
        height: result.height,
        size_bytes: result.size_bytes,
        target: result.target,
        mime_type: result.mime_type,
        has_preview: Boolean(result.data_url),
        data_url: result.data_url ?? undefined,
      };
    },
  });

  registry.register({
    name: "fetch_url",
    requiresConfirmation: false,
    definition: {
      type: "function",
      function: {
        name: "fetch_url",
        description: "Fetch text content from an HTTP(S) URL (truncated).",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string" },
          },
          required: ["url"],
        },
      },
    },
    execute: async (args) => {
      const url = str(args, "url");
      const res = await fetch(url);
      const text = await res.text();
      return { status: res.status, body: text.slice(0, 50_000) };
    },
  });

  registry.register({
    name: "create_directory",
    requiresConfirmation: true,
    confirmationKey: "writeFile",
    definition: {
      type: "function",
      function: {
        name: "create_directory",
        description: "Create a directory (and parents).",
        parameters: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
      },
    },
    execute: async (args) => {
      await fs.createDirectory(str(args, "path"));
      return { ok: true };
    },
  });

  registry.register({
    name: "delete_file",
    requiresConfirmation: true,
    confirmationKey: "deleteFile",
    definition: {
      type: "function",
      function: {
        name: "delete_file",
        description: "Delete a file or directory.",
        parameters: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
      },
    },
    execute: async (args) => {
      await fs.deletePath(str(args, "path"));
      return { ok: true };
    },
  });

  registry.register({
    name: "move_file",
    requiresConfirmation: true,
    confirmationKey: "writeFile",
    definition: {
      type: "function",
      function: {
        name: "move_file",
        description: "Move or rename a path.",
        parameters: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
          },
          required: ["from", "to"],
        },
      },
    },
    execute: async (args) => {
      await fs.movePath(str(args, "from"), str(args, "to"));
      return { ok: true };
    },
  });

  registry.register({
    name: "git_status",
    requiresConfirmation: false,
    definition: {
      type: "function",
      function: {
        name: "git_status",
        description: "Show git branch and porcelain status for the workspace (read-only).",
        parameters: {
          type: "object",
          properties: {
            cwd: { type: "string", description: "Optional repo root; defaults to agent workspace" },
          },
        },
      },
    },
    execute: async (args) => {
      const cwd = typeof args.cwd === "string" && args.cwd.trim() ? args.cwd : agentCwd();
      const result = await git.getGitStatus(cwd);
      if (!result.ok) return { ok: false, error: result.error, isRepo: result.isRepo };
      return { ok: true, isRepo: result.isRepo, output: result.output };
    },
  });

  registry.register({
    name: "git_diff",
    requiresConfirmation: false,
    definition: {
      type: "function",
      function: {
        name: "git_diff",
        description: "Show unified git diff for the workspace or a single file (read-only).",
        parameters: {
          type: "object",
          properties: {
            cwd: { type: "string" },
            filePath: { type: "string", description: "Optional file to diff" },
            staged: { type: "boolean", description: "If true, show staged (--cached) diff" },
          },
        },
      },
    },
    execute: async (args) => {
      const cwd = typeof args.cwd === "string" && args.cwd.trim() ? args.cwd : agentCwd();
      const filePath = typeof args.filePath === "string" ? args.filePath : undefined;
      const staged = Boolean(args.staged);
      const result = await git.getGitDiff(cwd, filePath, staged);
      if (!result.ok) return { ok: false, error: result.error, isRepo: result.isRepo };
      return { ok: true, isRepo: result.isRepo, output: result.output };
    },
  });

  registry.register({
    name: "git_commit",
    requiresConfirmation: true,
    confirmationKey: "writeFile",
    definition: {
      type: "function",
      function: {
        name: "git_commit",
        description:
          "Stage files (or all changes) and create a git commit. Always confirm with the user. Prefer an explicit paths list when possible.",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string", description: "Single-line commit message" },
            paths: {
              type: "array",
              items: { type: "string" },
              description: "Optional files to stage; if omitted, stages all (git add -A)",
            },
            cwd: { type: "string" },
          },
          required: ["message"],
        },
      },
    },
    execute: async (args) => {
      const cwd = typeof args.cwd === "string" && args.cwd.trim() ? args.cwd : agentCwd();
      const message = str(args, "message");
      const paths = Array.isArray(args.paths)
        ? args.paths.filter((p): p is string => typeof p === "string")
        : undefined;
      const result = await git.gitCommit(cwd, message, paths);
      if (!result.ok) return { ok: false, error: result.error, isRepo: result.isRepo };
      return { ok: true, isRepo: result.isRepo, output: result.output };
    },
  });

  registry.register({
    name: "run_subagent",
    requiresConfirmation: false,
    definition: {
      type: "function",
      function: {
        name: "run_subagent",
        description:
          "Delegate a focused subtask to an isolated subagent (max 10 tool rounds, no nesting). Use explore for read-only research, edit to apply file changes, review for analysis. Returns a summary — do not re-run the same work.",
        parameters: {
          type: "object",
          properties: {
            task: { type: "string", description: "Clear subtask for the subagent" },
            role: {
              type: "string",
              enum: ["explore", "edit", "review"],
              description: "explore/review = read-only; edit = may write files",
            },
            maxIterations: {
              type: "number",
              description: "Max tool rounds (1–10, default 10)",
            },
          },
          required: ["task"],
        },
      },
    },
    execute: async (args) => {
      const { createClientFromSettings } = await import("@/services/llm/LLMClient");
      const { runSubagentTask } = await import("@/services/agent/subagent");
      const settings = useSettingsStore.getState().settings;
      const client = createClientFromSettings(
        settings.provider.baseUrl,
        settings.provider.apiKey,
        settings.network,
      );
      const task = str(args, "task");
      const roleRaw = typeof args.role === "string" ? args.role : "explore";
      const role =
        roleRaw === "edit" || roleRaw === "review" || roleRaw === "explore" ? roleRaw : "explore";
      const maxIterations =
        typeof args.maxIterations === "number" && Number.isFinite(args.maxIterations)
          ? args.maxIterations
          : undefined;
      const result = await runSubagentTask({
        task,
        role,
        maxIterations,
        client,
        settings,
      });
      return result;
    },
  });

  registry.register({
    name: "lsp_hover",
    requiresConfirmation: false,
    definition: {
      type: "function",
      function: {
        name: "lsp_hover",
        description:
          "LSP hover at a position (types/docs). Requires Settings→Editor LSP on and language server on PATH.",
        parameters: {
          type: "object",
          properties: {
            filePath: { type: "string" },
            line: { type: "number", description: "0-based line" },
            character: { type: "number", description: "0-based character" },
            languageId: {
              type: "string",
              description: "Optional monaco/LSP language id (typescript, python, rust, cpp, …)",
            },
          },
          required: ["filePath", "line", "character"],
        },
      },
    },
    execute: async (args) => {
      const { lspSession } = await import("@/services/lsp/LspClient");
      const { langFromPath, monacoLangToLsp } = await import("@/services/lsp/languages");
      const filePath = str(args, "filePath");
      const line = typeof args.line === "number" ? args.line : Number(args.line);
      const character = typeof args.character === "number" ? args.character : Number(args.character);
      const languageId =
        typeof args.languageId === "string" && args.languageId
          ? args.languageId
          : monacoLangToLsp(langFromPath(filePath));
      const tip = await lspSession.hover(filePath, line, character, languageId);
      return tip ? { hover: tip } : { hover: null, note: "No hover (LSP off or server missing)" };
    },
  });

  return registry;
}
