# Architecture (short)

> Living doc: [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md)

## Stack

| Layer | Tech |
|-------|------|
| Desktop | Tauri 2 (Rust IPC) |
| UI | React + TypeScript + Vite + Tailwind |
| State | Zustand → APPDATA JSON |
| Editor | Monaco + `LspRegistry` (lazy stdio) |
| Terminal | xterm.js |
| LLM | OpenAI-compatible SSE · ModelRouter · handoff |

## Layout

Left: projects, git, sessions, files. Center: chat + AgentPanel + terminal. Right: Monaco / diff. StatusBar: git · provider · model · mode · index · tokens.

## Agent loop

`services/agent/AgentLoop.ts`: system (skills + rules + RAG + mode) → tools (+ MCP) → Ask/Agent/Plan filter → stream → tool_calls → confirm → execute → checkpoint/edit queue. Strict tools: one nudge when the model replies without `tool_calls`. Stream break → handoff.

Core tools: `read_file` / `write_file` / `edit_file` / `apply_patch` / search / git_* / `execute_command` / `run_subagent` / `lsp_hover` / `mcp_*`.

## Context

| Piece | Location |
|-------|----------|
| Index / `@codebase` | `services/index/*` |
| Mentions `@file/@docs/@web` | `services/mentions/*` · `http_get_text` |
| Rules | `rulesLoader.ts` · UI `ProjectMemoryPanel` |
| Success RAG | `successMemory.ts` |
| Attach | `contextAttachStore` · `mentionPreviewStore` |

## Persist

`%APPDATA%\com.llmshell.app\llm-shell-persist.json`

## Checks

```powershell
cd llm-shell
npx tsc --noEmit
npm test
npm run tauri:dev
```
