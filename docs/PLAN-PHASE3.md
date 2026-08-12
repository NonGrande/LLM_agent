# План работ — Фаза 3 (факт спринтов → 85% Cursor)

> **Единое ТЗ:** [TZ.md](TZ.md) · **Статус:** [STATUS.md](STATUS.md)  
> **Обновлено:** 2026-08-11  
> **Итог:** Tier 1–3 + Sprint 7–11 ✅ · **~88–90%** · Phase 4+ = backlog

---

## Обзор Tier'ов

| Tier | Sprint'ы | Версия | Похожесть | Фокус | **Факт** |
|------|----------|--------|-----------|-------|----------|
| **Tier 1** | 3 | 0.3.0-dev | ~55% | IDE, git, @file, CI | ✅ 27–28 |
| **Tier 2** | 4–5 | 0.3.0-beta | ~70% | @codebase, checkpoints | ✅ 29–30 |
| **Tier 3** | 6–7 | **0.3.0** | **≥85%** | MCP, modes, terminal, release | ✅ 31 · 33–35 |
| **IDE+** | 8–10 | 0.3.0+ | ~85–88% | subagent, RAG, LSP multi | ✅ 36–38 · polish 39 |

---

## Sprint 3–9 — ✅

Кратко: [27](stages/27-monaco-git-mentions.md)–[37](stages/37-sprint9-mcp-updater-lsp.md)  
Детали задач — в истории git / stage-доках; статусы FR — в [TZ.md](TZ.md) §3.

| Sprint | Exit | Stage |
|--------|------|-------|
| 3 | Monaco, git tools, @file, wizard, CI | 27–28 |
| 4 | Index, @codebase, rules | 29 |
| 5 | apply_patch, checkpoints, Apply/Reject | 30 |
| 6 | MCP HTTP, modes, terminal | 31 |
| 7 | Layout, git_commit, parallel, export, **0.3.0** | 33–35 |
| 8 | Subagent, RAG hybrid, feedback, MCP stub | 36 |
| 9 | MCP pipe, signed updater, ghost, LSP TS | 37 |

---

## Sprint 10 — «Multi-LSP» ✅

| Задачи | Статус |
|--------|--------|
| Language map + DEFAULT_LSP_SERVERS | ✅ |
| LspRegistry (lazy multi-server) | ✅ |
| monacoLspBridge (completion, nav, rename, format, …) | ✅ |
| `lsp_hover` agent tool | ✅ |
| THIRD_PARTY_NOTICES (Monaco MIT) | ✅ |

Stage: [38](stages/38-sprint10-multi-lsp.md)

---

## Polish (шаг 39) ✅

Context attach · message order fix · Sync models · CF launch · CodeBlock · app icon  
Stage: [39](stages/39-polish-context-models-icon.md)

---

## Sprint 11 — «IDE chrome» ✅

| Задачи | Статус |
|--------|--------|
| Command Palette + Quick Open | ✅ |
| Find in Files | ✅ |
| Problems + Outline panels | ✅ |
| Inline Edit (Ctrl+K) | ✅ |

Stage: [40](stages/40-sprint11-ide-chrome.md)

---

## Backlog (Phase 4+)
| — | Wire release.yml signing + real GitHub updater endpoint |
| — | MSI Authenticode · macOS · Linux · debugger |

---

## Definition of Done (закрытый срез)

- [x] `npx tsc -b` · `npm test` (128)  
- [x] [STATUS.md](STATUS.md) + [progress.md](progress.md) + stages 38–39  
- [x] Единое [TZ.md](TZ.md) · USER / CHANGELOG  
- [x] Нет ключей в diff  

*Следующее по запросу: Sprint 11 IDE chrome или ops signing.*
