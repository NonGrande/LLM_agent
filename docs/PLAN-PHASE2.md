# План работ — Фаза 2 (краткая декомпозиция)

> Фаза 2 закрыта. Единое ТЗ: [TZ.md](TZ.md) · архив: [TZ-PHASE2.md](TZ-PHASE2.md) · статус: [STATUS.md](STATUS.md)

## Sprint 1 — «Фундамент + площадки» (P0)

### Неделя 1

| День | Задачи | ID |
|------|--------|-----|
| 1 | git init, .gitignore, первый commit | A1–A2 |
| 1 | semver 0.2.0 во всех манифестах | A3 |
| 2 | CI script / GitHub Actions | A5 |
| 2–3 | Типы Project, projectId в ChatSession | B1 |
| 3–4 | projectStore + миграция persist | B2–B3 |
| 4–5 | UI Projects в sidebar, switch project | B5–B7 |

### Неделя 2

| День | Задачи | ID |
|------|--------|-----|
| 1–2 | agent cwd + skills per project | B10–B11 |
| 2–3 | tauri build, fix bundle errors | C1–C2 |
| 3 | tauri.conf metadata, icons | C3 |
| 4 | Release smoke checklist | C4 |
| 5 | USER.md черновик | C5 |

**Exit sprint 1:** 2 площадки с разными чатами + MSI собирается.

---

## Sprint 2 — «IDE ближе + качество» (P1)

| Блок | Задачи | ID |
|------|--------|-----|
| Редактор | Monaco editable + save | D1 |
| Навигация | open file from chat | D2 |
| Git agent | git_status, git_diff tools | D3 |
| Тесты | UI e2e mock LLM | D6 |
| UX | First-run wizard | E1 |
| Docs | TZ v1.1, ARCHITECTURE.md | F1–F3 |

**Exit sprint 2:** правка файла в UI + агент видит git diff + один UI e2e green.

> **Примечание:** задачи Sprint 2 перенесены в [PLAN-PHASE3.md](PLAN-PHASE3.md) Sprint 3 (Epic H) как часть пути к 85% Cursor.

---

## Backlog (перенесено в Phase 3)

См. [TZ.md](TZ.md) и [PLAN-PHASE3.md](PLAN-PHASE3.md):

- Terminal panel (xterm) → Sprint 7 / K3
- git_commit с подтверждением → J13
- @codebase, MCP, modes, checkpoints → Sprint 4–6
- macOS .dmg / Linux AppImage → Phase 3 backlog P2
- LSP / autocomplete → Phase 4
- Encrypted export settings → L4

---

## Матрица «кто / что»

| Компонент | Файлы (ориентир) |
|-----------|------------------|
| Projects | `types/index.ts`, `stores/projectStore.ts`, `LeftSidebar.tsx`, `chatStore.ts` |
| Миграция | `settingsStore.ts`, `appDataStorage.ts` |
| MSI | `tauri.conf.json`, `src-tauri/` |
| Monaco edit | `EditorPane.tsx`, `CodeViewer.tsx` |
| Git tools | `tools/index.ts`, `services/git.ts` |

---

## Definition of Done (любая задача)

- [ ] `npx tsc -b` pass  
- [ ] `npm test` pass  
- [ ] Запись в `progress.md` / stage doc при merge эпика  
- [ ] Нет ключей в diff  
