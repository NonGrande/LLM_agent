# LLM Shell — Architecture

> **Обновлено:** 2026-08-12 · версия **0.3.0**  
> Onboarding для разработчиков. Требования: [TZ.md](TZ.md) · статус: [STATUS.md](STATUS.md) · publish: [publish/](publish/).

## Stack

| Слой | Технология |
|------|------------|
| Desktop | Tauri 2 (Rust IPC) |
| Frontend | React + TypeScript + Vite + Tailwind |
| State | Zustand (+ persist → APPDATA) |
| Editor | Monaco — editable + multi-LSP bridge |
| Terminal | `@xterm/xterm` + FitAddon |
| Diff | `react-diff-viewer-continued` |
| LLM | OpenAI-compatible (+ profile/model failover + handoff) |
| LSP | stdio servers via `LspRegistry` (lazy) |

## Layout

```
┌──────────┬─────────────────────┬────────────┐
│ Площадки │ Chat + AgentPanel   │ Editor /   │
│ Git      │ ChatInput           │ Diff       │
│ Sessions │ [Terminal xterm]    │ Monaco     │
│ Files    │                     │            │
└──────────┴─────────────────────┴────────────┘
 StatusBar: git · provider · model · mode · idx · tok
```

Header: New Chat · Settings · **Ask|Agent|Plan** · Terminal · health (✓/401/… + Sync models + ☁ CF).

## Key stores

| Store | Файл | Роль |
|-------|------|------|
| `settingsStore` | `stores/settingsStore.ts` | API, agent, projects, MCP, onboarding, editor |
| `chatStore` | `stores/chatStore.ts` | Sessions per `projectId` |
| `fileStore` | `stores/fileStore.ts` | File tree |
| `workspaceUiStore` | `stores/workspaceUiStore.ts` | Tabs, active path, diff |
| `editorStore` | `stores/editorStore.ts` | Dirty buffers, Ctrl+S |
| `contextAttachStore` | `stores/contextAttachStore.ts` | Файлы, прикреплённые к чату |
| `editQueueStore` | `stores/editQueueStore.ts` | Apply/Reject queue |
| `indexStore` | `stores/indexStore.ts` | @codebase progress |
| `mcpStore` | `stores/mcpStore.ts` | Connected MCP clients/tools |
| `terminalStore` | `stores/terminalStore.ts` | xterm lines + streaming PID |
| `layoutStore` | `stores/layoutStore.ts` | Column + terminal heights |
| `agentStore` | `stores/agentStore.ts` | Status, tool log, permissions |
| `apiHealthStore` | `stores/apiHealthStore.ts` | ✓/401/402/403/✕ |

## Agent loop

`runAgentLoop` → `services/agent/AgentLoop.ts`:

1. System prompt: skills + **rules** + Success RAG + **mode block**
2. Register built-in tools + **MCP tools** from `mcpStore`
3. Filter tools by **Ask / Agent / Plan** (`agentModes.ts`)
4. `prepareApiMessages` → `streamChat` → tool_calls → confirm → execute → loop
5. Checkpoint before edits; push to edit queue for Apply/Reject
6. On stream break → **handoff** to next model

### Built-in tools (основные)

`read_file`, `write_file`, `edit_file`, `apply_patch`, `list_files`, `search_files`, `grep`, `codebase_search`, `git_status`, `git_diff`, `git_commit`, `execute_command`, `kill_process`, `take_screenshot`, `fetch_url`, `create_directory`, `delete_file`, `move_file`, `run_subagent`, `lsp_hover` + `mcp_*`.

### Modes

| Mode | Tools |
|------|-------|
| Ask | read/search whitelist |
| Agent | all |
| Plan | none (`tool_choice: none`) |

## Context & index

| Модуль | Путь |
|--------|------|
| Chunker / retrieve | `services/index/*` |
| Embeddings | Ollama nomic → OpenAI-compat → keyword |
| Persist index | `llm-shell:codebase-index` in APPDATA store |
| Rules | `services/rules/rulesLoader.ts` |
| Mentions | `services/mentions/filePaths.ts` + `docsWeb.ts` (`@file`, `@docs`, `@web`, `@codebase`) |
| Attach | `stores/contextAttachStore.ts` · `mentionPreviewStore.ts` + FileTree / ChatInput |
| Web fetch | Rust `http_get_text` · `services/tauri/httpText.ts` |
| Success RAG | `services/memory/successMemory.ts` |
| Rules & RAG UI | `components/settings/ProjectMemoryPanel.tsx` · Settings module `memory` |
| Pin → AGENTS | `appendRuleToAgents` in `services/rules/projectRules.ts` · ChatWindow |
| Strict tools | `settings.agent.strictTools` · nudge-retry in `AgentLoop.ts` |

## LSP

| Модуль | Путь |
|--------|------|
| Language map / servers | `services/lsp/languages.ts` |
| Registry | `services/lsp/LspClient.ts` |
| Monaco bridge | `services/lsp/monacoLspBridge.ts` |

## MCP

- Client: `services/mcp/McpClient.ts` (HTTP + native stdio via Tauri `process_pipe`)
- UI: Settings → **MCP**
- Presets: HTTP bridge + Filesystem native stdio

## LLM helpers

| Модуль | Роль |
|--------|------|
| `greenModels.ts` | Модели активного ready-профиля |
| `freeModels.ts` | Sync `/models` → profiles |
| `probeApiHealth.ts` | Health classify |
| `launchCloudflare.ts` | External WARP / download |

## Projects

`services/projects/projectActions.ts` — open/activate, cwd, chats, optional `activeProfileId`, reindex.

## Persist

`createAppDataJSONStorage()` → Tauri Store  
`%APPDATA%\com.llmshell.app\llm-shell-persist.json`

## Tests

| Команда | Что |
|---------|-----|
| `npm test` | Vitest (**~156**) |
| `npm run test:e2e-ui` | mock LLM → write_file |
| `npm run test:e2e-ipc` | Rust IPC smoke |

## Docs map

См. [STATUS.md](STATUS.md) § «Карта документации» · требования [TZ.md](TZ.md).
