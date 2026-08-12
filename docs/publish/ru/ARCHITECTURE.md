# Архитектура (кратко)

> Живой файл: [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md)

## Стек

| Слой | Технология |
|------|------------|
| Desktop | Tauri 2 (Rust IPC) |
| UI | React + TypeScript + Vite + Tailwind |
| State | Zustand → APPDATA JSON |
| Editor | Monaco + `LspRegistry` (lazy stdio) |
| Terminal | xterm.js |
| LLM | OpenAI-compatible SSE · ModelRouter · handoff |

## Layout

Левая колонка: площадки, git, sessions, files. Центр: чат + AgentPanel + terminal. Справа: Monaco / diff. StatusBar: git · provider · model · mode · index · tokens.

## Agent loop

`services/agent/AgentLoop.ts`: system (skills + rules + RAG + mode) → tools (+ MCP) → filter по Ask/Agent/Plan → stream → tool_calls → confirm → execute → checkpoint/edit queue. Strict tools: один nudge при ответе без `tool_calls`. Обрыв стрима → handoff.

Основные tools: `read_file` / `write_file` / `edit_file` / `apply_patch` / search / git_* / `execute_command` / `run_subagent` / `lsp_hover` / `mcp_*`.

## Контекст

| Что | Где |
|-----|-----|
| Index / `@codebase` | `services/index/*` |
| Mentions `@file/@docs/@web` | `services/mentions/*` · `http_get_text` |
| Rules | `rulesLoader.ts` · UI `ProjectMemoryPanel` |
| Success RAG | `successMemory.ts` |
| Attach | `contextAttachStore` · `mentionPreviewStore` |

## Persist

`%APPDATA%\com.llmshell.app\llm-shell-persist.json`

## Проверки

```powershell
cd llm-shell
npx tsc --noEmit
npm test
npm run tauri:dev
```
