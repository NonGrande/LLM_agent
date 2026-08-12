# LLM Shell — Единое техническое задание (живое)

> **Версия ТЗ:** 4.1 · **Дата:** 2026-08-12  
> **Версия продукта:** **0.3.0**  
> **Статус фазы:** Phase 1–3 + Sprint 11 + E-11/A-19 **закрыты** · Phase 4+ = backlog  
> **Точка входа по факту:** [STATUS.md](STATUS.md) · план спринтов: [PLAN-PHASE3.md](PLAN-PHASE3.md)  
> **Publish (RU/EN):** [publish/README.md](publish/README.md)  
> **Архив фаз:** [TZ-PHASE2.md](TZ-PHASE2.md) · [TZ-PHASE3.md](TZ-PHASE3.md) (редиректы) · Success RAG: [TZ-SUCCESS-RAG.md](TZ-SUCCESS-RAG.md)

Единственный действующий реестр требований. Исторические TZ-PHASE* не дополняются.

---

## 1. Назначение и границы

### 1.1. Назначение

Десктопный **agent-first IDE**: чат с LLM + agentic loop (файлы, shell, поиск, git, MCP), Cursor-подобный UI без форка VS Code.

### 1.2. Цели продукта

| Цель | Статус |
|------|--------|
| OpenAI-compatible multi-API + proxy + health | ✅ |
| Agentic loop + confirm + failover/handoff | ✅ |
| Workspace / площадки + persist APPDATA | ✅ |
| Monaco edit + multi-LSP + ghost-text | ✅ (серверы — на PATH пользователя) |
| Codebase index / @file / @docs / @web / @codebase / rules | ✅ |
| Checkpoints, Apply/Reject, Ask\|Agent\|Plan | ✅ |
| MCP HTTP + native stdio | ✅ |
| Rules & RAG UI · Pin → AGENTS · Strict tools | ✅ |
| Windows MSI/NSIS + CI + soft/signed updater | ✅ (Authenticode / свой GitHub endpoint — ops) |
| ≥85% взвешенной «похожести на Cursor» (agent workflow) | ✅ ~89–91% (STATUS) |

### 1.3. Аналоги

Cursor · Claude Code · Copilot Workspace · Aider — ориентиры UX/агента, не клоны.

### 1.4. Явно вне scope

| Вне scope | Почему |
|-----------|--------|
| Форк VS Code / marketplace расширений | Отдельный продукт |
| Debugger | Эпик Phase 4+ |
| Cloud agents / billing / Bugbot | Infra / сервис |
| Tab ML completion (Copilot-style) | Отдельная ML-линия (есть LLM ghost-text) |
| Встроенный Cloudflare VPN | Только запуск внешнего клиента |
| Лексеры Notepad++ | GPLv3 / чужой API — только Monaco MIT |
| Richer HTML/PDF для @web | Phase 4+ |

---

## 2. Архитектура (факт)

```
┌─────────────────────────────────────────────────────────┐
│                 Desktop (Tauri 2)                        │
│  React/TS UI  ◄──IPC──►  Rust: FS · shell · search ·    │
│  AgentLoop (TS)          process_pipe · proxy · updater │
│  Monaco + LspRegistry    External: LLM APIs · LSP bins  │
└─────────────────────────────────────────────────────────┘
```

| Слой | Стек |
|------|------|
| Desktop | Tauri 2 |
| UI | React + TypeScript + Vite + Tailwind |
| State | Zustand → `%APPDATA%\com.llmshell.app\llm-shell-persist.json` |
| Editor | Monaco (`@monaco-editor/react`) |
| Terminal | xterm.js |
| LLM | OpenAI-compatible SSE + ModelRouter failover |
| LSP | stdio Language Servers (lazy per language) |

Детали: [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 3. Функциональные требования (сводный реестр)

Статусы: ✅ done · ⚠️ partial/ops · ❌ backlog.

### 3.1. Agent & LLM

| ID | Требование | Статус |
|----|------------|--------|
| A-01 | OpenAI-compatible chat + tools streaming | ✅ |
| A-02 | Multi-profile + model failover + handoff | ✅ |
| A-03 | Proxy (in-app) | ✅ |
| A-04 | Health ✓ / 401 / 402 / 403 / ✕ | ✅ |
| A-05 | Tool loop + confirm dangerous ops | ✅ |
| A-06 | Ask / Agent / Plan modes | ✅ |
| A-07 | Parallel read-only tools | ✅ |
| A-08 | `apply_patch` + fuzzy edit | ✅ |
| A-09 | Checkpoints + rollback | ✅ |
| A-10 | Apply/Reject edit queue | ✅ |
| A-11 | `run_subagent` (depth≤1) | ✅ |
| A-12 | `git_status` / `git_diff` / `git_commit` | ✅ |
| A-13 | Skills + roles + Success RAG | ✅ |
| A-14 | MCP HTTP + native stdio pipe | ✅ |
| A-15 | `lsp_hover` tool | ✅ |
| A-16 | Корректный порядок messages (strip empty streaming assistant) | ✅ |
| A-17 | Sync models (`/models` → профили) | ✅ |
| A-18 | Green models = только active/ready profile | ✅ |
| A-19 | Agent action algorithm + Strict tools (`tool_choice: required` + 1 nudge-retry) | ✅ |

### 3.2. IDE & context

| ID | Требование | Статус |
|----|------------|--------|
| E-01 | Monaco editable + Ctrl+S | ✅ |
| E-02 | File tree + tabs + path open from chat | ✅ |
| E-03 | `@file` / `@folder` / `@codebase` | ✅ |
| E-04 | Codebase index + `codebase_search` | ✅ |
| E-05 | Rules: AGENTS.md / `.cursor/rules` | ✅ |
| E-06 | Ghost-text (LLM inline) | ✅ |
| E-07 | Multi-LSP: TS/HTML/CSS/JSON/Py/Rust/C++/C#/Go | ✅ |
| E-08 | Attach file→chat (клик / drag) + inline context | ✅ |
| E-09 | CodeBlock: свёрнут + модальное развёртывание | ✅ |
| E-10 | Command Palette / Problems / Outline / Find / Cmd+K | ✅ Sprint 11 |
| E-11 | `@docs` / `@web` preview (chips + Docs/Web context) | ✅ |

### 3.3. UX & product

| ID | Требование | Статус |
|----|------------|--------|
| U-01 | 3-колоночный Cursor-like layout | ✅ |
| U-02 | Layout Split / Chat / Editor | ✅ |
| U-03 | Terminal panel | ✅ |
| U-04 | First-run wizard | ✅ |
| U-05 | Modular settings + export/import | ✅ |
| U-06 | Projects / площадки | ✅ |
| U-07 | 👍/👎 + Pin → Success RAG + Pin → AGENTS.md | ✅ |
| U-08 | ToolCallView v2 | ✅ |
| U-09 | Cloudflare One launch (☁), не embed | ✅ |
| U-10 | App icon (Tauri icons) | ✅ |
| U-11 | Scroll чата к последнему сообщению | ✅ |
| U-12 | Settings → Rules & RAG (edit AGENTS / rules / RAG entries) | ✅ |

### 3.4. DevOps

| ID | Требование | Статус |
|----|------------|--------|
| D-01 | Semver 0.3.0 · MSI + NSIS | ✅ |
| D-02 | CI (`tsc` + vitest) | ✅ |
| D-03 | Soft update check + signed updater plugin | ✅ |
| D-04 | Release workflow (tag → draft) | ✅ |
| D-05 | Wire свой GitHub + CI signing keys | ⚠️ ops |
| D-06 | MSI Authenticode | ⚠️ ops |
| D-07 | macOS / Linux bundles | ❌ backlog |

### 3.5. NFR

| ID | Требование | Статус |
|----|------------|--------|
| N-01 | `npx tsc -b` / `tsc --noEmit` + `npm test` green | ✅ (~156 vitest) |
| N-02 | Секреты не в git; persist APPDATA | ✅ |
| N-03 | LSP lazy; UI не блокируется >500ms на index tick | ✅ design |
| N-04 | Документация STATUS + USER + CHANGELOG + publish RU/EN | ✅ на закрытии шага 43 |

---

## 4. Фазы и спринты (закрытие)

| Фаза / Sprint | Содержание | Статус |
|---------------|------------|--------|
| Phase 1 (шаги 1–24) | Ядро Tauri + agent + multi-API | ✅ |
| Phase 2 (25–26) | RAG keyword · projects · 0.2.0 MSI | ✅ |
| Sprint 3–7 (27–35) | IDE · index · checkpoints · MCP · 0.3.0 | ✅ |
| Sprint 8 (36) | Subagent · RAG hybrid · feedback | ✅ |
| Sprint 9 (37) | MCP pipe · updater · ghost · LSP baseline | ✅ |
| Sprint 10 (38) | Multi-LSP registry + Monaco bridge | ✅ |
| Polish (39) | Context attach · Sync models · CF · icon · CodeBlock | ✅ |
| Sprint 11 (40) | Palette / Problems / Outline / Find / Cmd+K | ✅ |
| E-11 (41) | `@docs` / `@web` preview | ✅ |
| A-19 (42) | Agent algorithm + Strict tools hardening | ✅ |
| Docs pack (43) | TZ sync + publish RU/EN | ✅ |

DoD: код + тесты green · STATUS/USER/CHANGELOG · без ключей в diff.

---

## 5. Метрики «похожести на Cursor» (ориентир)

| Категория | Вес | Факт | Цель Phase 3 |
|-----------|-----|------|--------------|
| Agent | 30% | ~87% | ≥90% |
| IDE | 25% | ~80% | ≥80% |
| Context | 20% | ~82% | ≥85% |
| UX | 15% | ~84% | ≥88% |
| DevOps | 10% | ~80% | ≥85% |
| **Итого** | 100% | **~89–91%** | **≥85%** |

Цифры — оценка из [STATUS.md](STATUS.md), не бенчмарк. Gap: updater endpoint, Authenticode, richer @web, debugger (Phase 4+).

---

## 6. Языки и лицензии редактора

| Тема | Решение |
|------|---------|
| Подсветка | Monaco (MIT) — `llm-shell/THIRD_PARTY_NOTICES.md` |
| IntelliSense | Внешние LSP на PATH (таблица в [USER.md](USER.md)) |
| Notepad++ | Не использовать |

---

## 7. Карта документации

| Документ | Роль |
|----------|------|
| **[TZ.md](TZ.md)** (этот) | Единые требования + статусы |
| [STATUS.md](STATUS.md) | Done / Remaining |
| [publish/](publish/) | Публикуемый набор RU + EN |
| [PLAN-PHASE3.md](PLAN-PHASE3.md) | История спринтов 3–10 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Модули и stores |
| [USER.md](USER.md) | Пользовательская инструкция (живая) |
| [TZ-SUCCESS-RAG.md](TZ-SUCCESS-RAG.md) | RAG / handoff детально |
| [progress.md](progress.md) + [stages/](stages/) | Журнал шагов |
| [CHANGELOG.md](../CHANGELOG.md) | Релизные заметки |
| TZ-PHASE2 / TZ-PHASE3 | Архив → редирект сюда |

---

## 8. Критерии приёмки текущего среза (0.3.0 + Sprint 11 + E-11/A-19)

- [x] Agent loop с tools, modes, MCP, checkpoints, Strict tools  
- [x] Multi-LSP + ghost-text (при установленных серверах)  
- [x] Context attach + @file/@docs/@web/@codebase + index  
- [x] Rules & RAG UI + Pin → AGENTS  
- [x] Health / Sync models / profile-scoped green list  
- [x] Sprint 11 IDE chrome  
- [x] `tsc` + ~156 vitest  
- [x] Иконка приложения в `src-tauri/icons`  
- [ ] Ops: свой updater endpoint + Authenticode — вне кода продукта  

*Конец единого ТЗ v4.1.*
