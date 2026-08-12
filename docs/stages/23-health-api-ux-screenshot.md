# Шаг 23. Health 401/402/403, API UX, Yandex, screenshot, tooltips

**Статус:** выполнен  
**Дата работ:** 2026-08-07  
**Пауза:** 2026-08-08 … 2026-08-11 (отпуск) — новых этапов в репозитории нет

## Контекст

После шага 22 (боевые профили, APPDATA, shell stream, роли) в тот же день закрыт пакет UX/эксплуатации: путаница профилей и ключей, раздутый каталог API, «зелёные» при 402, скриншот, вложения, подсказки.

## Сделано

### API health и выбор модели
1. Классификация `healthClassify` / probe: тона ok/auth/unreachable + **`httpStatus` / `detailCode`**.
2. UI-фильтр чипов: **✓ / 401 / 402 / 403 / ✕** (`ApiTrafficLight`, `ApiHealthPanel`, `apiHealthStore.filterTone`).
   - 401 — нужна авторизация API (ключ)
   - 402 — авторизация + оплата / баланс
   - 403 — доступ запрещён в локации (geo / VPN)
3. Счётчик «зелёных» и пикер — только **профили**, не весь каталог пресетов.
4. `listGreenModelOptions` + `ChatModelSelector` в поле ввода; 402 на чате обновляет health и убирает профиль из green.

### Хранилище API
1. Settings: секция **«Мои профили»** + **«Добавить провайдера»** (поиск, категории Local / Aggregators / Major / RU / Other свёрнут).
2. Health probe: сохранённые профили + local hosts (не все cloud-пресеты).
3. Heal: «Исправить имена»; сброс model/fallbacks при mismatch семейства (DeepSeek + `qwen2.5:7b` и наоборот); ключи не затираются.
4. Пресет **Yandex AI Studio** — `https://ai.api.cloud.yandex.net/v1`, модель URI `gpt://<folder_id>/yandexgpt/latest`; клиент/Settings ловят placeholder и «Failed to parse model URI».
5. Обновления пресетов: Groq models, Nebius host; нишевые — category `other`.

### Агент и вложения
1. Tool **`take_screenshot`** (`src-tauri` + `xcap`): primary monitor / окно приложения; PNG на диск + JPEG data URL для vision.
2. Skill `skills/screenshot/SKILL.md`; триггеры в `matchSkills`.
3. DnD файлов: Tauri `onDragDropEvent` → абсолютные пути (HTML5 `dataTransfer` в WebView2 пустой).
4. SessionList / workspace: × и ПКМ (удалить / очистить историю / очистить все; очистить рабочую зону).

### UI polish и мусор
1. Скилл `web-design-guidelines` (`.agents/skills` + `skills/`); visual pass chrome/статусбар/баннер.
2. `Tooltip` + `FieldLabel` — подсказки Settings во всплывающих «?» (hover/focus).
3. Удалены неиспользуемые hooks (`useAgent`/`useChat`/…), stubs Progress/Streaming, дубликаты `providers/*`, `events.ts`, часть unused formatters.

### Persist
- Файл: `%APPDATA%\com.llmshell.app\llm-shell-persist.json` (`createAppDataJSONStorage`).
- Ужесточён merge/`ensureProfiles`, чтобы пустые combat-дефолты не теряли ключ на `provider`.

## Ключевые пути

| Область | Путь |
|---------|------|
| Health | `src/services/llm/healthClassify.ts`, `probeApiHealth.ts` |
| Green picker | `src/services/llm/greenModels.ts`, `ChatModelSelector.tsx` |
| Presets / Yandex | `src/services/llm/providerPresets.ts`, SettingsDialog |
| Screenshot | `src-tauri/src/commands/screenshot.rs`, `tools/index.ts` |
| Tooltips | `src/components/common/Tooltip.tsx` |
| Persist | `src/services/persist/appDataStorage.ts` |

## Проверки (на момент сдачи шага)
- `npx tsc -b` — OK  
- `npm test` (vitest) — OK (в т.ч. healthClassify, greenModels, ensureProfiles)  
- `cargo check` — OK при добавлении screenshot  

## Что дальше
1. e2e: Open folder → write_file / execute_command / take_screenshot  
2. `npm run tauri:build` → MSI  
3. Ручная гигиена ключей пользователя (xAI / OpenRouter / Yandex: folder в URI = folder сервисного аккаунта)
