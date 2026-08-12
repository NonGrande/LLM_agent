# LLM Shell — ТЗ (publish, RU)

> Срез **v4.1** · продукт **0.3.0** · 2026-08-12  
> Живой реестр в репо: [`docs/TZ.md`](../../TZ.md). Done/Remaining ведётся локально (не в публичном git).

## Назначение

Agent-first IDE: чат + инструменты к диску/shell/git/MCP, Cursor-подобный layout, без форка VS Code.

## Вне scope

Debugger · cloud agents / billing · Tab-ML как у Copilot · встроенный Cloudflare VPN · Notepad++ лексеры · richer HTML/PDF для `@web` (Phase 4+).

## FR — Agent & LLM

| ID | Требование | Статус |
|----|------------|--------|
| A-01…A-05 | Chat+tools, multi-API, proxy, health, confirm | ✅ |
| A-06 | Ask / Agent / Plan | ✅ |
| A-07…A-12 | Parallel RO tools, patch, checkpoints, Apply/Reject, subagent, git | ✅ |
| A-13…A-15 | Skills/RAG, MCP HTTP+stdio, `lsp_hover` | ✅ |
| A-16…A-18 | Message order, Sync models, green=active profile | ✅ |
| A-19 | Agent algorithm + Strict tools (nudge-retry) | ✅ |

## FR — IDE & context

| ID | Требование | Статус |
|----|------------|--------|
| E-01…E-05 | Monaco, tree/tabs, @file/@codebase, index, rules | ✅ |
| E-06…E-07 | Ghost-text, multi-LSP | ✅ |
| E-08…E-09 | Attach + CodeBlock modal | ✅ |
| E-10 | Palette / Problems / Outline / Find / Cmd+K | ✅ |
| E-11 | `@docs` / `@web` preview | ✅ |

## FR — UX

| ID | Требование | Статус |
|----|------------|--------|
| U-01…U-06 | Layout 3-col, Split/Chat/Editor, terminal, wizard, settings, площадки | ✅ |
| U-07 | 👍/👎 · Pin → RAG · Pin → AGENTS.md | ✅ |
| U-08…U-11 | ToolCallView, CF launch, icon, scroll | ✅ |
| U-12 | Settings → Rules & RAG | ✅ |

## FR — DevOps / NFR

| ID | Требование | Статус |
|----|------------|--------|
| D-01…D-04 | 0.3.0 MSI/NSIS, CI, updater soft+signed, release workflow | ✅ |
| D-05…D-06 | Свой GitHub endpoint + Authenticode | ⚠️ ops |
| D-07 | macOS / Linux | ❌ |
| N-01 | ~156 vitest + tsc green | ✅ |

## Метрики (ориентир STATUS)

Итого ~**89–91%** «похожести на Cursor» (Agent ~87 · IDE ~80 · Context ~82 · UX ~84 · DevOps ~80). Не бенчмарк — взвешенная оценка команды.

## Приёмка среза

Agent + IDE chrome + @docs/@web + Strict tools + Rules/RAG UI · `npm run tauri:dev` · тесты green · ops (signing/endpoint) вне кода.
