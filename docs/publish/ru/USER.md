# LLM Shell — инструкция пользователя

> 0.3.0 · Windows · подробнее в живом [`docs/USER.md`](../../USER.md)

## Установка и запуск

1. MSI после `npm run tauri:build` в `llm-shell/src-tauri/target/release/bundle/msi/`.  
2. Из исходников: `cd llm-shell` → `npm run tauri:dev`.  
3. SmartScreen на unsigned-сборке: «Подробнее» → «Выполнить в любом случае».

Первый заход: **⚙ Settings** → модуль API → профиль; **Open…** в площадках → папка проекта.

### Yandex AI Studio

- Base URL: `https://llm.api.cloud.yandex.net/v1`  
- Model: `gpt://<folder_id>/yandexgpt/latest` — folder должен совпадать с ключом.

## Чат

| Действие | Как |
|----------|-----|
| Отправить | Enter (Shift+Enter — новая строка) |
| Файл | `@path` или клик/drag в чат |
| Docs | `@docs` → chip → при Send блок Docs context |
| Web | `@web https://…` → fetch (с proxy) → Web context |
| Индекс | `@codebase` |
| Slash | `/help` |

Длинные code block в ответах сначала свёрнуты — раскрытие в модалке.

## Режимы агента

Шапка: **Ask | Agent | Plan**.

- **Ask** — только чтение/поиск  
- **Agent** — полный tool loop (+ confirm)  
- **Plan** — без tools  

**Settings → Agent → Strict tools** — для слабых локальных моделей: `tool_choice: required` + один nudge, если модель пишет «команды» текстом. Ask/Plan не затрагивает.

Кнопки на ответе: **👍** / **👎** / **В RAG** / **📌 AGENTS** (дописывает в `AGENTS.md`).

## Settings (модули)

| Модуль | Содержимое |
|--------|------------|
| API / Proxy / Models / Gen | профили, ключи, SOCKS/HTTP, каталог, temperature |
| Agent | режимы, confirm, Strict tools, cwd |
| Rules & RAG | правка AGENTS.md, `.cursor/rules`, записей Success RAG |
| MCP | HTTP и native stdio (pipe Content-Length) |
| Editor | ghost-text, LSP |
| Appearance | тема, Export/Import JSON, Check updates |

**Sync models** в шапке — `/models` по профилям → зелёный список только у active/ready.  
**☁** — запуск Cloudflare One / WARP, если установлен.

## Редактор и IDE chrome

Ctrl+S сохраняет буфер Monaco. `*` на вкладке = dirty.

| Хоткей | Действие |
|--------|----------|
| Ctrl+Shift+P | Command Palette |
| Ctrl+P | Quick Open |
| Ctrl+Shift+F | Find in Files |
| Ctrl+Shift+M | Problems |
| Ctrl+K | Inline Edit (нужен selection) |

Problems / Outline — нижняя панель под редактором.

LSP на PATH (примеры): `typescript-language-server`, `vscode-langservers-extracted`, `basedpyright`, `rust-analyzer`, `clangd`, `csharp-ls`, `gopls`. Подсветка — Monaco MIT (`llm-shell/THIRD_PARTY_NOTICES.md`).

## Layout

Header **Layout: Split | Chat | Editor** — фокус колонок.

## Данные

`%APPDATA%\com.llmshell.app\llm-shell-persist.json`

## Типичные сбои

| Симптом | Что проверить |
|---------|----------------|
| 401 | ключ в Settings → профиль |
| 402 | квота / другой профиль |
| Yandex 400 | folder в URI ≠ folder ключа |
| Пустое дерево файлов | Open… в окне Tauri (`tauri:dev`) |
