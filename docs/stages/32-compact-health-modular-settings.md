# Шаг 32 — Compact health + modular settings (presentation chrome)

> **Дата:** 2026-08-11  
> **Версия:** 0.2.0 (UX)

## Цель

Убрать развёрнутую ленту health при старте; детали по светофору; настройки по модулям в модалках; стиль ближе к `docs/presentation.html`.

## Сделано

### Health
- `apiHealthStore`: `dismissed: true` по умолчанию; `run()` / `setFilterTone` **не** раскрывают баннер.
- `ApiHealthPanel` убран из `AppLayout` (файл оставлен, не монтируется).
- `ApiTrafficLight` popover:
  - **зелёный** — список моделей (`listGreenModelOptions`) + выбор профиля/модели для следующего запроса;
  - **жёлтый 401/402/403** — диагностика профилей + Повторить / Хранилище API;
  - **красный** — только перечень недоступных.
- Кнопка шапки `↻ API` — только `run()`, без ленты.

### Settings
- `openSettings(module)` / `closeSettings()` / `activeModule`.
- Модули: api · proxy · models · generation · agent · mcp · appearance.
- `SettingsDialog` — одна панель модуля, без tablist; каталог провайдеров свёрнут.
- `SettingsLauncher` в шапке — сетка модулей.

### Chrome / docs
- CSS: `.ui-card`, `.ui-modal`, `.ui-app-header`, зелёный `#7ee787`, orange accent.
- Презентация: слайд «Почему LLM Shell» (vs Cursor / Claude Code / Copilot / Aider).

## Файлы
- `stores/apiHealthStore.ts`, `settingsStore.ts`
- `layout/ApiTrafficLight.tsx`, `AppLayout.tsx`
- `settings/SettingsDialog.tsx`, `SettingsLauncher.tsx`, `settingsModules.ts`
- `index.css`
- `docs/presentation.html`, `STATUS.md`

## Проверка
- `npx tsc -b`
- `npm test` (92)
