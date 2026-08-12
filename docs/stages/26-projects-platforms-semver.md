# Шаг 26 — Projects / площадки + semver 0.2.0

**Дата:** 2026-08-11  
**Sprint:** Phase 2 · Sprint 1 (Epic A + B)

## Цель

Несколько workspace-папок («площадки») с отдельными списками чатов; инженерная база: git repo, semver **0.2.0**.

## Реализовано

### Semver 0.2.0 (Epic A)

- `llm-shell/package.json`, `src-tauri/Cargo.toml`, `tauri.conf.json`, `APP_VERSION` в `constants.ts`
- Корневой `.gitignore` в `LLM_agent/`
- `git init` в корне монорепо (первый commit — по запросу)

### Projects / площадки (Epic B)

| Компонент | Файл | Назначение |
|-----------|------|------------|
| Типы | `types/index.ts` | `Project`, `settings.projects`, `activeProjectId`, `ChatSession.projectId` |
| Helpers | `services/projects/projectHelpers.ts` | upsert, migrate, `DEFAULT_PROJECT_ID` |
| Actions | `services/projects/projectActions.ts` | open / activate / remove / clear workspace |
| UI | `components/layout/ProjectList.tsx` | Open…, список, + Chat, контекстное меню |
| Chat store | `stores/chatStore.ts` | `projectId` на сессиях, фильтр, `ensureSessionForProject` |
| Settings | `stores/settingsStore.ts` | `ensureProjects()` при hydrate |
| Sidebar | `LeftSidebar.tsx`, `SessionList.tsx`, `FileTree.tsx` | чаты и файлы по активной площадке |
| Startup | `AppLayout.tsx` | `useStartupProjectSession()`, New chat → `activeProjectId` |

### Миграция persist

- Старые сессии без `projectId` → `project-default`
- Пустой `projects[]` → одна площадка из `workspace.path` или «Без папки»

### Тесты

- `projectHelpers.test.ts` — upsert, migrate
- `npm test` — **67 passed**
- `npx tsc -b` — pass

## Ручная проверка (checklist)

1. Open… → папка A → чат «A1»
2. Open… → папка B → чат «B1»; в списке чатов только B
3. Переключить на A → виден «A1»
4. Перезапуск → списки и активная площадка сохранены

## Не в scope шага

- ~~Epic C: `npm run tauri:build` → MSI~~ → **собрано 2026-08-11**
- CI / CHANGELOG
- agent cwd + skills per project (B10–B11)

### Артефакты сборки (Epic C)

- MSI: `llm-shell/src-tauri/target/release/bundle/msi/LLM Shell_0.2.0_x64_en-US.msi`
- NSIS: `llm-shell/src-tauri/target/release/bundle/nsis/LLM Shell_0.2.0_x64-setup.exe`

## Что дальше

1. Первый git commit (по запросу)
2. `tauri:build` + smoke MSI
3. Sprint 2: Monaco edit, git tools, UI e2e
