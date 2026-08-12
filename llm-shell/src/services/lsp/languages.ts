/**
 * Monaco language ids from file paths (built-in monaco-editor highlighters, MIT).
 * Notepad++ / Lexilla lexers are NOT used (GPLv3 / wrong API).
 */

const EXT_TO_MONACO: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  md: "markdown",
  mdx: "markdown",
  markdown: "markdown",
  rs: "rust",
  py: "python",
  pyi: "python",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  htm: "html",
  xml: "xml",
  toml: "ini",
  ini: "ini",
  yml: "yaml",
  yaml: "yaml",
  c: "c",
  h: "c",
  cpp: "cpp",
  cxx: "cpp",
  cc: "cpp",
  hpp: "cpp",
  hxx: "cpp",
  hh: "cpp",
  cs: "csharp",
  go: "go",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  rb: "ruby",
  php: "php",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  ps1: "powershell",
  psm1: "powershell",
  r: "r",
  lua: "lua",
  swift: "swift",
  dart: "dart",
  dockerfile: "dockerfile",
};

export function langFromPath(path: string): string {
  const base = path.replace(/\\/g, "/").split("/").pop() ?? "";
  if (/^dockerfile$/i.test(base) || /^dockerfile\./i.test(base)) return "dockerfile";
  const ext = base.includes(".") ? base.split(".").pop()?.toLowerCase() ?? "" : "";
  return EXT_TO_MONACO[ext] ?? "plaintext";
}

/** Monaco language id → LSP textDocument languageId (usually the same). */
export function monacoLangToLsp(lang: string): string {
  if (lang === "shell") return "shellscript";
  return lang;
}

export interface LspServerSpec {
  command: string;
  args: string[];
}

/** Default stdio servers (must be on PATH). Wave1 + wave2. */
export const DEFAULT_LSP_SERVERS: Record<string, LspServerSpec> = {
  typescript: { command: "typescript-language-server", args: ["--stdio"] },
  javascript: { command: "typescript-language-server", args: ["--stdio"] },
  html: { command: "vscode-html-language-server", args: ["--stdio"] },
  css: { command: "vscode-css-language-server", args: ["--stdio"] },
  scss: { command: "vscode-css-language-server", args: ["--stdio"] },
  json: { command: "vscode-json-language-server", args: ["--stdio"] },
  python: { command: "basedpyright-langserver", args: ["--stdio"] },
  rust: { command: "rust-analyzer", args: [] },
  c: { command: "clangd", args: [] },
  cpp: { command: "clangd", args: [] },
  csharp: { command: "csharp-ls", args: [] },
  go: { command: "gopls", args: [] },
};

/** Languages we register Monaco LSP providers for. */
export const LSP_MONACO_LANGUAGES = Object.keys(DEFAULT_LSP_SERVERS);

export function resolveServerSpec(
  languageId: string,
  overrides?: Record<string, LspServerSpec> | null,
  legacy?: { command: string; args: string[] } | null,
): LspServerSpec | null {
  const key = languageId;
  if (overrides?.[key]?.command?.trim()) {
    return {
      command: overrides[key].command.trim(),
      args: overrides[key].args?.length ? overrides[key].args : ["--stdio"],
    };
  }
  const def = DEFAULT_LSP_SERVERS[key];
  if (def) {
    // Legacy single lspCommand applies to TS/JS only
    if (
      legacy?.command?.trim() &&
      (key === "typescript" || key === "javascript") &&
      legacy.command.trim() !== "typescript-language-server"
    ) {
      return {
        command: legacy.command.trim(),
        args: legacy.args?.length ? legacy.args : ["--stdio"],
      };
    }
    return { ...def, args: [...def.args] };
  }
  if (legacy?.command?.trim() && (key === "typescript" || key === "javascript")) {
    return {
      command: legacy.command.trim(),
      args: legacy.args?.length ? legacy.args : ["--stdio"],
    };
  }
  return null;
}
