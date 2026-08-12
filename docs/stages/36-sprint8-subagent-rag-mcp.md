# Шаг 36 — Sprint 8 (J11 · I9 · K6–K8 · MCP stdio stub)

> **Дата:** 2026-08-11  
> **Версия:** 0.3.0 (+ Sprint 8 features)

## Цель

Закрыть backlog после 0.3.0 к ≥85%: subagent-lite, Success RAG embeddings, ToolCallView/feedback, MCP stdio заготовка.

## Сделано

| ID | Задача | Факт |
|----|--------|------|
| J11 | Subagent-lite | `subagent.ts` + tool `run_subagent` (depth≤1, roles explore/edit/review) |
| I9 | Success RAG embeddings + project | hybrid score + optional `embedding` / `projectId` |
| K6 | ToolCallView v2 | status/timing из `agentStore.toolLog` |
| K7–K8 | 👍/👎 + Pin | `ChatWindow` → `recordSuccessTask` |
| MCP | Stdio transport stub | `McpStdioClient` + UI transport/command/args + preset |

## Не в этом шаге
- Native Tauri stdin/stdout MCP pipe
- Signed updater (L3 full)
- J14 ghost-text · LSP · @web (Phase 4)

## Проверка
```powershell
cd llm-shell
npx tsc -b
npm test
```
~101+ vitest · tsc green
