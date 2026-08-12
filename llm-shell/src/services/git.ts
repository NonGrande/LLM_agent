import { executeCommand } from "@/services/tauri/shell";
import { isTauri } from "@/utils/env";

export interface GitInfo {
  isRepo: boolean;
  currentBranch: string | null;
  branches: string[];
  dirty: boolean;
}

const EMPTY: GitInfo = {
  isRepo: false,
  currentBranch: null,
  branches: [],
  dirty: false,
};

export function parseBranches(stdout: string): { current: string | null; branches: string[] } {
  const lines = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let current: string | null = null;
  const branches: string[] = [];
  for (const line of lines) {
    if (line.startsWith("* ")) {
      const name = line.slice(2).trim();
      // detached HEAD: "* (HEAD detached at abc)"
      if (name.startsWith("(")) {
        current = name;
      } else {
        current = name;
        branches.push(name);
      }
    } else if (line.startsWith("+ ")) {
      // worktree checked-out elsewhere
      branches.push(line.slice(2).trim());
    } else {
      branches.push(line.replace(/^\*\s+/, "").trim());
    }
  }
  return { current, branches: [...new Set(branches.filter(Boolean))] };
}

export async function getGitInfo(cwd?: string | null): Promise<GitInfo> {
  if (!isTauri() || !cwd) return EMPTY;

  try {
    const inside = await executeCommand("git rev-parse --is-inside-work-tree", cwd, 8_000);
    if (inside.exit_code !== 0 || !inside.stdout.trim().toLowerCase().includes("true")) {
      return EMPTY;
    }

    const [branchResult, statusResult] = await Promise.all([
      executeCommand("git branch --list", cwd, 8_000),
      executeCommand("git status --porcelain", cwd, 8_000),
    ]);

    const { current, branches } = parseBranches(branchResult.stdout);
    return {
      isRepo: true,
      currentBranch: current,
      branches,
      dirty: statusResult.stdout.trim().length > 0,
    };
  } catch {
    return EMPTY;
  }
}

export async function checkoutBranch(
  cwd: string,
  branch: string,
): Promise<{ ok: boolean; message: string }> {
  if (!isTauri() || !cwd || !branch) {
    return { ok: false, message: "Git checkout requires Tauri and a workspace." };
  }
  // Escape for cmd.exe: wrap in quotes; reject dangerous chars
  if (/[\r\n&|<>^%]/.test(branch)) {
    return { ok: false, message: "Invalid branch name." };
  }
  const quoted = `"${branch.replace(/"/g, "")}"`;
  try {
    const result = await executeCommand(`git checkout ${quoted}`, cwd, 30_000);
    if (result.exit_code !== 0) {
      return {
        ok: false,
        message: (result.stderr || result.stdout || "checkout failed").trim(),
      };
    }
    return { ok: true, message: result.stdout.trim() || `Switched to ${branch}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export interface GitCommandResult {
  ok: boolean;
  isRepo: boolean;
  output: string;
  error?: string;
}

async function assertGitRepo(cwd: string): Promise<boolean> {
  const inside = await executeCommand("git rev-parse --is-inside-work-tree", cwd, 8_000);
  return inside.exit_code === 0 && inside.stdout.trim().toLowerCase().includes("true");
}

/** Porcelain + branch summary for agent context. */
export async function getGitStatus(cwd?: string | null): Promise<GitCommandResult> {
  if (!isTauri() || !cwd) {
    return { ok: false, isRepo: false, output: "", error: "Git status requires Tauri and a workspace path." };
  }
  try {
    if (!(await assertGitRepo(cwd))) {
      return { ok: false, isRepo: false, output: "", error: "Not a git repository." };
    }
    const [branch, porcelain] = await Promise.all([
      executeCommand("git branch --show-current", cwd, 8_000),
      executeCommand("git status --porcelain -b", cwd, 12_000),
    ]);
    const branchName = branch.stdout.trim() || "(unknown)";
    const body = porcelain.stdout.trim() || "(clean working tree)";
    return {
      ok: true,
      isRepo: true,
      output: `branch: ${branchName}\n\n${body}`,
    };
  } catch (err) {
    return {
      ok: false,
      isRepo: false,
      output: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Unified diff — unstaged by default; optional file path filter. */
export async function getGitDiff(
  cwd?: string | null,
  filePath?: string,
  staged = false,
): Promise<GitCommandResult> {
  if (!isTauri() || !cwd) {
    return { ok: false, isRepo: false, output: "", error: "Git diff requires Tauri and a workspace path." };
  }
  try {
    if (!(await assertGitRepo(cwd))) {
      return { ok: false, isRepo: false, output: "", error: "Not a git repository." };
    }
    let cmd = staged ? "git diff --cached" : "git diff";
    if (filePath?.trim()) {
      const quoted = `"${filePath.replace(/"/g, "")}"`;
      cmd += ` -- ${quoted}`;
    }
    const result = await executeCommand(cmd, cwd, 30_000);
    if (result.exit_code !== 0) {
      return {
        ok: false,
        isRepo: true,
        output: "",
        error: (result.stderr || result.stdout || "git diff failed").trim(),
      };
    }
    const out = result.stdout.trim() || "(no diff)";
    return { ok: true, isRepo: true, output: out };
  } catch (err) {
    return {
      ok: false,
      isRepo: false,
      output: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Stage paths (or -A) and create a commit. Message is shell-escaped; paths validated.
 * Requires confirmation in the agent loop (`confirmationKey: "write"`).
 */
export async function gitCommit(
  cwd: string | null | undefined,
  message: string,
  paths?: string[],
): Promise<GitCommandResult> {
  if (!isTauri() || !cwd) {
    return { ok: false, isRepo: false, output: "", error: "Git commit requires Tauri and a workspace path." };
  }
  const msg = message.trim();
  if (!msg) {
    return { ok: false, isRepo: true, output: "", error: "Commit message is required." };
  }
  if (/[\r\n]/.test(msg)) {
    return { ok: false, isRepo: true, output: "", error: "Commit message must be a single line." };
  }
  try {
    if (!(await assertGitRepo(cwd))) {
      return { ok: false, isRepo: false, output: "", error: "Not a git repository." };
    }

    const files = (paths ?? []).map((p) => p.trim()).filter(Boolean);
    for (const p of files) {
      if (/[\r\n&|<>^%]/.test(p)) {
        return { ok: false, isRepo: true, output: "", error: `Invalid path: ${p}` };
      }
    }

    if (files.length === 0) {
      const add = await executeCommand("git add -A", cwd, 60_000);
      if (add.exit_code !== 0) {
        return {
          ok: false,
          isRepo: true,
          output: "",
          error: (add.stderr || add.stdout || "git add -A failed").trim(),
        };
      }
    } else {
      for (const p of files) {
        const quoted = `"${p.replace(/"/g, "")}"`;
        const add = await executeCommand(`git add -- ${quoted}`, cwd, 30_000);
        if (add.exit_code !== 0) {
          return {
            ok: false,
            isRepo: true,
            output: "",
            error: (add.stderr || add.stdout || `git add failed for ${p}`).trim(),
          };
        }
      }
    }

    // Use -m with escaped quotes for Windows cmd
    const safeMsg = msg.replace(/"/g, "'");
    const commit = await executeCommand(`git commit -m "${safeMsg}"`, cwd, 60_000);
    if (commit.exit_code !== 0) {
      return {
        ok: false,
        isRepo: true,
        output: "",
        error: (commit.stderr || commit.stdout || "git commit failed").trim(),
      };
    }
    const log = await executeCommand("git log -1 --oneline", cwd, 8_000);
    return {
      ok: true,
      isRepo: true,
      output: (log.stdout.trim() || commit.stdout.trim() || "committed").trim(),
    };
  } catch (err) {
    return {
      ok: false,
      isRepo: false,
      output: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
