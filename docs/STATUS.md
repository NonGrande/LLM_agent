# LLM Shell — Статус продукта (живой документ)

> **Обновлено:** 2026-08-12  
> **Версия приложения:** **0.3.0** (код) · MSI — `npm run tauri:build`  
> **Оценка похожести на Cursor:** ~**89–91%** (E-11 @docs/@web + agent algorithm)  
> **Тесты:** **156** vitest · `tsc --noEmit` · Rust process_pipe · `test:e2e-ipc` · `test:e2e-ui`

Точка входа перед правками. Требования: **[TZ.md](TZ.md)** (единое ТЗ v4.1). Publish: **[publish/](publish/)**.

---

## Карта документации

| Документ | Назначение | Когда править |
|----------|------------|---------------|
| **[STATUS.md](STATUS.md)** (этот) | Done / Remaining / метрики | после каждого эпика |
| **[TZ.md](TZ.md)** | Единые требования + статусы | при изменении scope/FR |
| **[publish/](publish/)** | RU + EN набор для GitHub | при релизе / docs-шаге |
| [TZ-PHASE2.md](TZ-PHASE2.md) · [TZ-PHASE3.md](TZ-PHASE3.md) | Архив → редирект на TZ.md | не дополнять |
| [PLAN-PHASE3.md](PLAN-PHASE3.md) | Спринты 3–10 (факт) | при закрытии спринта |
| [TZ-SUCCESS-RAG.md](TZ-SUCCESS-RAG.md) | Success RAG / handoff | при изменениях RAG |
| [progress.md](progress.md) · [stages/](stages/) | Журнал шагов | каждый сданный шаг |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stores, agent, persist | при смене архитектуры |
| [USER.md](USER.md) | Пользовательская инструкция | user-facing UX |
| [CHANGELOG.md](../CHANGELOG.md) | Релизные заметки | перед релизом |
| [presentation.html](presentation.html) | Презентация | после крупных вех |

---

## Done (на 2026-08-12)

### Фаза 1 — ядро (шаги 1–24)
- Tauri 2 + React + agent loop + tools
- Multi-API, proxy, health ✓/401/402/403/✕
- Skills, роли, Combat profiles, APPDATA persist
- Cursor-like 3-колоночный UI · IPC e2e smoke

### Фаза 2 — продукт (шаги 25–26)
Success RAG (keyword) · Projects · Semver 0.2.0 · MSI/NSIS · git init

### Фаза 3 — Tier 1–3 + Sprint 7–9 (шаги 27–37)
| Epic | Статус | Stage |
|------|--------|-------|
| H IDE · I Context · J Agent · K UX · L DevOps | ✅ | 27–37 |
| Sprint 7 → **0.3.0** | ✅ | [33–35](stages/33-35-sprint7-release-0.3.0.md) |
| Sprint 8 subagent/RAG/feedback | ✅ | [36](stages/36-sprint8-subagent-rag-mcp.md) |
| Sprint 9 MCP pipe · updater · ghost · LSP | ✅ | [37](stages/37-sprint9-mcp-updater-lsp.md) |

### Sprint 10 — multi-LSP ✅ (шаг 38)
- `languages.ts` · `LspRegistry` · `monacoLspBridge` · `lsp_hover` · `THIRD_PARTY_NOTICES.md`
- Stage: [38](stages/38-sprint10-multi-lsp.md)

### Polish ✅ (шаг 39)
- Context attach · prepareApiMessages · Sync models · green=active profile · CF ☁ · CodeBlock modal · app icon
- Stage: [39](stages/39-polish-context-models-icon.md)

### Sprint 11 — IDE chrome ✅ (шаг 40)
- Command Palette · Quick Open · Find in Files · Problems · Outline · Cmd+K inline edit
- Stage: [40](stages/40-sprint11-ide-chrome.md)

### @docs / @web preview ✅ (шаг 41)
- Mentions `@docs` / `@web` · preview chips · `http_get_text` · Docs/Web context на Send
- Stage: [41](stages/41-docs-web-preview.md)

### Agent reliability ✅ (шаг 42)
- Hard Agent action algorithm in system prompt · `strictTools` nudge-retry · text-tool aliases
- Stage: [42](stages/42-agent-action-algorithm.md)

### Docs bilingual pack ✅ (шаг 43)
- TZ v4.1 sync · `docs/publish/{ru,en}/` · stage + STATUS
- Stage: [43](stages/43-docs-bilingual-publish.md)
- Git publish (remote push) — ещё в Remaining

**Ключевые фичи в коде:** Monaco + multi-LSP · IDE chrome · @file/@docs/@web/@codebase · checkpoints · Ask/Agent/Plan · MCP · Sync models · handoff · Success RAG · Rules & RAG UI · Pin AGENTS · Strict tools + agent algorithm.

---

## Remaining (следующие правки)

| ID | Задача | Примечание |
|----|--------|------------|
| — | GitHub publish (commit + push publish docs) | локально готово после scrub |
| — | Updater endpoint = ваш GitHub + CI signing | ops |
| — | MSI Authenticode | Windows cert |
| — | macOS · Linux · debugger | Phase 4+ |
| — | Richer HTML/PDF for @web | Phase 4+ (stage 41 backlog) |

---

## Метрики похожести (ориентир)

| Категория | Было (утро 11.08) | **Сейчас** | Цель 0.3.0 |
|-----------|-------------------|------------|------------|
| Agent | ~58% | **~87%** | ≥90% |
| IDE | ~28% | **~80%** | ≥80% |
| Context | ~32% | **~82%** | ≥85% |
| UX | ~48% | **~84%** | ≥88% |
| DevOps | ~45% | **~80%** | ≥85% |
| **Итого** | **~42%** | **~89–91%** | **≥85%** |

---

## Как вносить правки дальше

1. Код + тесты (`npm test`, `npx tsc -b`).  
2. FR в **[TZ.md](TZ.md)** (§3).  
3. Шаг в [progress.md](progress.md) + `docs/stages/NN-….md`.  
4. Этот STATUS (Done / Remaining).  
5. User-facing → [USER.md](USER.md) + [CHANGELOG.md](../CHANGELOG.md) + при необходимости [publish/](publish/).

---

## Быстрые команды

```powershell
cd llm-shell
npm run tauri:dev
npm test
npm run test:e2e-ui
npm run tauri:build   # MSI
```

Persist: `%APPDATA%\com.llmshell.app\llm-shell-persist.json`
