# LLM Shell — Spec (publish, EN)

> Slice **v4.1** · product **0.3.0** · 2026-08-12  
> Living FR registry: [`docs/TZ.md`](../../TZ.md). Done/Remaining is tracked locally (not in the public tree).

## Purpose

Agent-first IDE: chat + disk/shell/git/MCP tools, Cursor-like layout, no VS Code fork.

## Out of scope

Debugger · cloud agents / billing · Copilot-style Tab ML · embedded Cloudflare VPN · Notepad++ lexers · richer HTML/PDF for `@web` (Phase 4+).

## FR — Agent & LLM

| ID | Requirement | Status |
|----|-------------|--------|
| A-01…A-05 | Chat+tools, multi-API, proxy, health, confirm | ✅ |
| A-06 | Ask / Agent / Plan | ✅ |
| A-07…A-12 | Parallel RO tools, patch, checkpoints, Apply/Reject, subagent, git | ✅ |
| A-13…A-15 | Skills/RAG, MCP HTTP+stdio, `lsp_hover` | ✅ |
| A-16…A-18 | Message order, Sync models, green=active profile | ✅ |
| A-19 | Agent algorithm + Strict tools (nudge-retry) | ✅ |

## FR — IDE & context

| ID | Requirement | Status |
|----|-------------|--------|
| E-01…E-05 | Monaco, tree/tabs, @file/@codebase, index, rules | ✅ |
| E-06…E-07 | Ghost-text, multi-LSP | ✅ |
| E-08…E-09 | Attach + CodeBlock modal | ✅ |
| E-10 | Palette / Problems / Outline / Find / Cmd+K | ✅ |
| E-11 | `@docs` / `@web` preview | ✅ |

## FR — UX

| ID | Requirement | Status |
|----|-------------|--------|
| U-01…U-06 | 3-col layout, Split/Chat/Editor, terminal, wizard, settings, projects | ✅ |
| U-07 | 👍/👎 · Pin → RAG · Pin → AGENTS.md | ✅ |
| U-08…U-11 | ToolCallView, CF launch, icon, scroll | ✅ |
| U-12 | Settings → Rules & RAG | ✅ |

## FR — DevOps / NFR

| ID | Requirement | Status |
|----|-------------|--------|
| D-01…D-04 | 0.3.0 MSI/NSIS, CI, soft+signed updater, release workflow | ✅ |
| D-05…D-06 | Own GitHub endpoint + Authenticode | ⚠️ ops |
| D-07 | macOS / Linux | ❌ |
| N-01 | ~156 vitest + tsc green | ✅ |

## Metrics (STATUS estimate)

Overall ~**89–91%** Cursor-likeness (Agent ~87 · IDE ~80 · Context ~82 · UX ~84 · DevOps ~80). Team estimate, not a published benchmark.

## Acceptance for this cut

Agent + IDE chrome + @docs/@web + Strict tools + Rules/RAG UI · `npm run tauri:dev` · tests green · signing/endpoint ops outside product code.
