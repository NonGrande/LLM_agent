# Шаг 28 — Profile/project + wizard + UI e2e (Sprint 3 завершён)

**Дата:** 2026-08-11  
**Эпик:** H6–H8 (TZ-PHASE3)

## Реализовано

### H6 — Profile per project
- `Project.activeProfileId` в типах
- `settingsStore.setProjectProfile()` — привязка профиля к площадке
- `activateProject` / `openProjectFolder` — переключение API при смене проекта
- UI: select «API профиль» в `ProjectList`

### H7 — First-run wizard
- `FirstRunWizard.tsx` — Online (ключ + профиль) / Offline (Ollama)
- `onboardingCompleted` в settings + миграция для существующих пользователей с ключом
- Показ в `AppLayout` до завершения onboarding

### H8 — UI e2e mock LLM
- `agentLoop.e2e.test.ts` — mock `streamChat` → `write_file` → ответ «Done»
- `npm run test:e2e-ui`
- CI: шаг `test:e2e-ui`

## Тесты

- **76/76** vitest pass

## Sprint 3 exit

Epic H (TZ-PHASE3 Tier 1) закрыт. Следующий: **Sprint 4** — @codebase index (Epic I).
