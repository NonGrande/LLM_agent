# Шаг 12. Этап 3 ТЗ — Agentic Loop, tools, Context Manager

**Статус:** выполнен  
**Дата:** 2026-08-07  
**Связь с ТЗ:** §3.2 Agentic Loop, реестр инструментов

## Цель
Многошаговый цикл: LLM → tool_calls → execute (с confirm) → снова LLM, до финального ответа или maxIterations.

## Модули

| Файл | Роль |
|------|------|
| `services/agent/AgentLoop.ts` | `runAgentLoop(userText, deps)` |
| `services/agent/ToolRegistry.ts` | Регистрация handlers + JSON Schema |
| `services/agent/tools/index.ts` | Все tools из ТЗ |
| `services/agent/ContextManager.ts` | оценка токенов + trim истории |

## Параметры цикла (из `settings.agent`)

| Поле | Использование |
|------|----------------|
| `maxIterations` | лимит итераций (default 25) |
| `autoExecute` | пропуск UI-confirm |
| `confirmations.*` | какие действия спрашивать |
| `maxContextTokens` | бюджет ContextManager |
| `workingDirectory` | в system prompt |

## Инструменты

| Tool | Confirm key | Backend |
|------|-------------|---------|
| `read_file` | — | `read_file` |
| `write_file` | writeFile | `write_file` + Diff UI |
| `edit_file` | editFile | `edit_file` + Diff UI |
| `list_files` | — | `list_directory` |
| `search_files` | — | `glob_search` |
| `grep` | — | `grep_search` |
| `execute_command` | executeCommand | `execute_command` |
| `fetch_url` | — | `fetch` в WebView |
| `create_directory` | writeFile | `create_directory` |
| `delete_file` | deleteFile | `delete_path` |
| `move_file` | writeFile | `move_path` |

## Логика AgentLoop (кратко)
1. Добавить system (если нет) + user message  
2. `trim(history)` → `streamChat` с `tools`  
3. Стримить assistant content в chatStore  
4. Если нет tool_calls → idle, выход  
5. Для каждого tool: pending → (confirm?) → execute → tool message  
6. После write/edit — `workspaceUiStore.showDiff`  
7. Повтор с шага 2  

## UI
- `ToolCallView` в чате  
- `AgentPanel`: status, ProgressIndicator, Allow/Deny, actions log  
- ChatInput: Stop / abort  

## ContextManager
- `estimateTokens` ≈ `ceil(len/4)`  
- `trim`: сохраняет system + хвост истории; вставляет пометку об omitted messages  

## Ограничения
- Tools FS/shell работают только в Tauri (нужен MSVC для `tauri:dev`)  
- `execute_command` timeout пока не enforce (принимается, не убивает процесс)  
- Локальные модели могут слабо поддерживать native tool calling — качество зависит от модели  
