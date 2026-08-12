# Шаг 31 — MCP + Ask/Agent/Plan + Terminal (Sprint 6)

**Дата:** 2026-08-11  
**Эпик:** J5–J10, K3–K4 (TZ-PHASE3)

## Реализовано

### Modes (J8–J10)
- `agent.mode`: `ask` | `agent` | `plan` в settings + миграция
- Header toggle `AgentModeToggle`
- Ask: только read/search tools (+ whitelist MCP)
- Plan: `tool_choice: none`, без tools
- Guard в AgentLoop блокирует запрещённые tool calls
- StatusBar: `mode ask|agent|plan`

### MCP client (J5–J7)
- `services/mcp/McpClient.ts` — HTTP JSON-RPC (`initialize`, `tools/list`, `tools/call`)
- `mcpStore` — connect/disconnect, tool handlers `mcp_<server>_<tool>`
- Settings → вкладка **MCP**: add/remove, presets (filesystem/git/fetch HTTP bridges), Connect
- Tools подмешиваются в registry на старте agent run

### Terminal (K3–K4)
- `@xterm/xterm` + FitAddon
- `TerminalPanel` + `terminalStore` (streaming shell via existing IPC)
- Header **Terminal** / Hide; resizable height in `layoutStore`

## Тесты

- `agentModes.test.ts`, `McpClient.test.ts`
- **92/92** vitest pass, `tsc -b` pass

## Ограничения

- MCP stdio не встроен — нужен HTTP-шлюз (пресеты указывают `127.0.0.1:310x`)
- SSE stream parsing упрощён до POST JSON-RPC

## Что дальше

Sprint 7: updater, export settings, release **0.3.0**
