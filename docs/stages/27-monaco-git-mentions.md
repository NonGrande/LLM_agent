# Шаг 27 — Monaco edit + git tools + @file (Phase 3 Sprint 3 start)

**Дата:** 2026-08-11  
**Эпик:** H (TZ-PHASE3)  
**Версия:** 0.2.0 (код), 0.3.0-dev (roadmap)

## Реализовано

### H1–H2 — Editable Monaco

- `stores/editorStore.ts` — buffers, dirty, save → `write_file` IPC
- `CodeViewer.tsx` — editable Monaco, Save button, **Ctrl+S**, dirty `*` on tab
- `FileTabs.tsx` — синяя точка на несохранённых вкладках
- `EditorPane.tsx` — confirm при закрытии dirty tab

### H3 — Git tools для агента

- `services/git.ts` — `getGitStatus`, `getGitDiff`
- `tools/index.ts` — `git_status`, `git_diff` (read-only, cwd = workspace)

### H4–H5 — Навигация и @file

- `PathLinkedText.tsx` — кликабельные пути в сообщениях пользователя
- `FileMentionPicker.tsx` + `services/mentions/filePaths.ts` — `@` autocomplete
- `ChatInput.tsx` — `@file` → `[Mentioned paths]` в payload

### H9–H12 — DevOps / docs

- `.github/workflows/ci.yml` — tsc, vitest, cargo test/check
- `CHANGELOG.md`, `docs/USER.md`, `docs/ARCHITECTURE.md`

## Тесты

- `editorStore.test.ts`, `filePaths.test.ts`
- **73/73** vitest pass, `tsc -b` pass

## Не в этом шаге

- H6 profile per project UI
- H7 first-run wizard
- H8 UI e2e Playwright

## Что дальше

Sprint 3 продолжение: H6–H8, затем Sprint 4 (@codebase index).
