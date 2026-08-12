/** Settings modules — each opens as a focused modal (no mega-tablist). */
export const SETTINGS_MODULES = [
  "api",
  "proxy",
  "models",
  "generation",
  "agent",
  "memory",
  "mcp",
  "editor",
  "appearance",
] as const;

export type SettingsModule = (typeof SETTINGS_MODULES)[number];

export const SETTINGS_MODULE_META: Record<
  SettingsModule,
  { title: string; short: string; hint: string }
> = {
  api: {
    title: "Хранилище API",
    short: "API",
    hint: "Профили и ключи",
  },
  proxy: {
    title: "Прокси",
    short: "Прокси",
    hint: "SOCKS / HTTP",
  },
  models: {
    title: "Models",
    short: "Models",
    hint: "Квоты и каталог",
  },
  generation: {
    title: "Generation",
    short: "Gen",
    hint: "Temperature, tokens",
  },
  agent: {
    title: "Agent",
    short: "Agent",
    hint: "Режимы и подтверждения",
  },
  memory: {
    title: "Rules & RAG",
    short: "Memory",
    hint: "AGENTS.md · Success RAG",
  },
  mcp: {
    title: "MCP",
    short: "MCP",
    hint: "Внешние tools",
  },
  editor: {
    title: "Editor",
    short: "Editor",
    hint: "Ghost-text · LSP",
  },
  appearance: {
    title: "Appearance",
    short: "UI",
    hint: "Тема и шрифт",
  },
};
