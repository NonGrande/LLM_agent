# LLM Shell — Журнал выполнения и технический отчёт

> Документ ведётся от шага к шагу. Каждый раздел — отчёт по завершённому этапу с техническими деталями, списком установленных зависимостей и артефактов.
>
> **Актуальное состояние продукта (что сделано / что открыто):** [`STATUS.md`](STATUS.md) — точка входа перед правками.
>
> **Детальные отчёты этапов 8+:** каталог [`docs/stages/`](stages/)
>
> Связанные ТЗ/планы: **[TZ.md](TZ.md)** (единое) · [PLAN-PHASE3.md](PLAN-PHASE3.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [presentation.html](presentation.html) · архив фаз: TZ-PHASE2/3

### Оглавление документации этапов

| Шаг | Статус | Документ |
|-----|--------|----------|
| 1–7 | ✅ в этом файле | сбор требований → Tauri init |
| 8 | ✅ | [stages/08-frontend-infra.md](stages/08-frontend-infra.md) |
| 9 | ✅ | [stages/09-ui-stores-mvp.md](stages/09-ui-stores-mvp.md) |
| 10 | ✅ | [stages/10-rust-ipc.md](stages/10-rust-ipc.md) |
| 11 | ✅ | [stages/11-llm-client.md](stages/11-llm-client.md) |
| 12 | ✅ | [stages/12-agentic-loop.md](stages/12-agentic-loop.md) |
| 13 | ✅ | [stages/13-advanced-ui.md](stages/13-advanced-ui.md) |
| 14 | ✅ | [stages/14-polish-acceptance.md](stages/14-polish-acceptance.md) |
| 15 | ✅ | [stages/15-msvc-and-prompt.md](stages/15-msvc-and-prompt.md) |
| 16 | ✅ | [stages/16-multi-model-failover.md](stages/16-multi-model-failover.md) |
| 17 | ✅ | [stages/17-skills-engine.md](stages/17-skills-engine.md) |
| 18 | ✅ | [stages/18-fix-agent-tool-calling.md](stages/18-fix-agent-tool-calling.md) |
| 19 | ✅ | [stages/19-cursor-agent-multi-api.md](stages/19-cursor-agent-multi-api.md) |
| 20 | ✅ | [stages/20-in-app-proxy.md](stages/20-in-app-proxy.md) (+ каталог OpenAI-совместимых API в `providerPresets.ts`) |
| 21 | ✅ | Cursor-like layout: Left (history + git + files) · Center (chat) · Right (file preview) |
| 22 | ✅ | [stages/22-combat-profiles-persist-shell-roles.md](stages/22-combat-profiles-persist-shell-roles.md) |
| 23 | ✅ | [stages/23-health-api-ux-screenshot.md](stages/23-health-api-ux-screenshot.md) |
| 24 | ✅ | [stages/24-e2e-ipc-smoke.md](stages/24-e2e-ipc-smoke.md) |
| 25 | ✅ | [TZ-SUCCESS-RAG.md](TZ-SUCCESS-RAG.md) |
| 26 | ✅ | [stages/26-projects-platforms-semver.md](stages/26-projects-platforms-semver.md) |
| 27 | ✅ | [stages/27-monaco-git-mentions.md](stages/27-monaco-git-mentions.md) |
| 28 | ✅ | [stages/28-sprint3-wizard-e2e.md](stages/28-sprint3-wizard-e2e.md) |
| 29 | ✅ | [stages/29-codebase-index-rules.md](stages/29-codebase-index-rules.md) |
| 30 | ✅ | [stages/30-checkpoints-apply-patch.md](stages/30-checkpoints-apply-patch.md) |
| 31 | ✅ | [stages/31-mcp-modes-terminal.md](stages/31-mcp-modes-terminal.md) |
| 32 | ✅ | [stages/32-compact-health-modular-settings.md](stages/32-compact-health-modular-settings.md) |
| 33–35 | ✅ | [stages/33-35-sprint7-release-0.3.0.md](stages/33-35-sprint7-release-0.3.0.md) |
| 36 | ✅ | [stages/36-sprint8-subagent-rag-mcp.md](stages/36-sprint8-subagent-rag-mcp.md) |
| 37 | ✅ | [stages/37-sprint9-mcp-updater-lsp.md](stages/37-sprint9-mcp-updater-lsp.md) |
| 38 | ✅ | [stages/38-sprint10-multi-lsp.md](stages/38-sprint10-multi-lsp.md) |
| 39 | ✅ | [stages/39-polish-context-models-icon.md](stages/39-polish-context-models-icon.md) |
| 40 | ✅ | [stages/40-sprint11-ide-chrome.md](stages/40-sprint11-ide-chrome.md) |
| 41 | ✅ | [stages/41-docs-web-preview.md](stages/41-docs-web-preview.md) |
| 42 | ✅ | [stages/42-agent-action-algorithm.md](stages/42-agent-action-algorithm.md) |
| 43 | ✅ | [stages/43-docs-bilingual-publish.md](stages/43-docs-bilingual-publish.md) |

---


## Шаг 43. Docs bilingual pack (TZ + publish RU/EN) ✅

**Документация:** [docs/stages/43-docs-bilingual-publish.md](stages/43-docs-bilingual-publish.md)  
**Дата:** 2026-08-12

- TZ v4.1 · `docs/publish/{ru,en}/` · карта publish/README.md
- STATUS / USER / ARCHITECTURE / CHANGELOG синхронизированы
- Git push — Remaining (локально готово)

---

## Шаг 42. Agent action algorithm + tools hardening ✅

**Документация:** [docs/stages/42-agent-action-algorithm.md](stages/42-agent-action-algorithm.md)  
**Дата:** 2026-08-12

- Hard pipeline в SYSTEM_PROMPT · strictTools nudge-retry · parseTextToolCalls aliases
- Skill tool-first / AGENTS pointer · TZ A-19
- vitest + tsc (см. stage)

---

## Шаг 41. @docs / @web preview ✅

**Документация:** [docs/stages/41-docs-web-preview.md](stages/41-docs-web-preview.md)  
**Дата:** 2026-08-12

- Mentions `@docs` / `@web` с preview chips · `http_get_text` · prompt blocks Docs/Web context
- Picker specials + leftover parse на Send
- 156 vitest · tsc green

---

## Шаг 40. Sprint 11 — IDE chrome ✅

**Документация:** [docs/stages/40-sprint11-ide-chrome.md](stages/40-sprint11-ide-chrome.md)  
**Дата:** 2026-08-12

- Palette · Quick Open · Find · Problems · Outline · Cmd+K
- 135 vitest · tsc green

---

## Шаг 39. Product polish (context · models · icon) ✅

**Документация:** [docs/stages/39-polish-context-models-icon.md](stages/39-polish-context-models-icon.md)  
**Дата:** 2026-08-11

- Context attach · prepareApiMessages · Sync models · CF ☁ · CodeBlock · app icon
- 128 vitest · tsc green · единое TZ.md v4

---

## Шаг 38. Sprint 10 — multi-LSP ✅

**Документация:** [docs/stages/38-sprint10-multi-lsp.md](stages/38-sprint10-multi-lsp.md)  
**Дата:** 2026-08-11

- LspRegistry · monacoLspBridge · languages map · lsp_hover · THIRD_PARTY_NOTICES

---

## Шаг 37. Sprint 9 — native MCP · signed updater · ghost/LSP ✅

**Документация:** [docs/stages/37-sprint9-mcp-updater-lsp.md](stages/37-sprint9-mcp-updater-lsp.md)  
**Дата:** 2026-08-11

- Rust `process_pipe` (Content-Length) + MCP stdio native
- `tauri-plugin-updater` + pubkey · Install & relaunch
- Editor: ghost-text LLM · LSP diagnostics/hover
- ~105 vitest · tsc green · Rust frame test

---


## Шаг 36. Sprint 8 — subagent · RAG · feedback · MCP stdio ✅

**Документация:** [docs/stages/36-sprint8-subagent-rag-mcp.md](stages/36-sprint8-subagent-rag-mcp.md)  
**Дата:** 2026-08-11

- J11 `run_subagent` (explore/edit/review, depth≤1)
- I9 Success RAG hybrid embeddings + projectId
- K6–K8 ToolCallView v2 + 👍/👎 + Pin
- MCP stdio stub (UI + client guidance; native pipe backlog)
- ~102 vitest · `tsc -b` green

---

## Шаг 1. Сбор требований и выбор архитектуры

### 1.1. Постановка задачи
Заказчик поставил цель: создать десктопное приложение «LLM Shell» — генеративный кодинг-ассистент (аналог Cursor / Claude Code), который работает как чат-интерфейс к LLM и обладает полным agentic-набором: чтение/запись файлов, поиск по коду, выполнение терминальных команд, многошаговый автономный цикл.

### 1.2. Ключевые требования
| № | Требование | Решение |
|---|------------|---------|
| 1 | Десктопное приложение, нативный UX | **Tauri 2** (Rust + WebView) |
| 2 | Универсальная поддержка LLM | OpenAI-compatible API endpoint |
| 3 | Полный доступ к ФС и командам | Rust backend через Tauri IPC |
| 4 | Агентский цикл | TypeScript agentic loop на frontend |
| 5 | Кроссплатформенность | Windows, macOS, Linux |

### 1.3. Аналоги
- **Cursor** — IDE с AI
- **Claude Code** — CLI-агент
- **Aider** — CLI pair-programming

### 1.4. Артефакты шага
- Устное согласование стека и форм-фактора

---

## Шаг 2. Установка toolchain (Node.js, Rust, Git)

### 2.1. Действия
Установлены системные инструменты разработки через `winget` (Windows Package Manager):

```powershell
winget install OpenJS.NodeJS.LTS          # Node.js LTS
winget install Rustlang.Rustup            # Rust + Cargo
winget install Git.Git                    # Git
```

### 2.2. Проверенные версии
| Инструмент | Версия | Назначение |
|------------|--------|------------|
| Node.js | **v24.19.0** | Frontend runtime, npm |
| npm | **11.17.0** | Пакетный менеджер JS |
| Rust | **1.97.1** | Backend (Tauri) |
| Cargo | встроен в Rustup | Пакетный менеджер Rust |
| Git | **2.55.0.windows.3** | VCS |

### 2.3. Дополнительная настройка
```powershell
# Разрешение выполнения PowerShell-скриптов для npm
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Без этой команды `npm` на Windows не может запускать свои `.ps1` скрипты.

### 2.4. Зависимости
Нет программных зависимостей — только системные.

---

## Шаг 3. Создание ТЗ (`docs/TZ.md`)

### 3.1. Действия
Разработано детальное техническое задание из 10 разделов (810 строк).

### 3.2. Содержание ТЗ
| Раздел | Описание |
|--------|----------|
| 1. Назначение и цели | Постановка, цели, аналоги |
| 2. Архитектура | Диаграмма, стек, структура проекта |
| 3. IPC API | Контракт команд Tauri (Rust ↔ TS) |
| 4. Инструменты агента | Перечень tool-функций |
| 5. LLM Integration | Формат запросов, streaming, tools |
| 6. Agentic Loop | Алгоритм цикла |
| 7. UI/UX | Компоненты, макет |
| 8. Безопасность | Санитизация, подтверждения |
| 9. Roadmap | Этапы разработки |
| 10. Критерии приёмки | Acceptance criteria |

### 3.3. Технологический стек (из ТЗ)
| Слой | Технология |
|------|-----------|
| Desktop framework | Tauri 2.x |
| Frontend | React 18 + TypeScript 5.x |
| Bundler | Vite |
| CSS | Tailwind CSS + Radix UI |
| State | Zustand |
| Backend | Rust (stable) |
| IPC | Tauri Commands + Events |
| Markdown | react-markdown + remark-gfm |
| Подсветка кода | Shiki |
| Diff viewer | react-diff-viewer-continued |
| Редактор кода | Monaco Editor |
| Хранение настроек | Tauri Store API |

### 3.4. Артефакты
- `docs/TZ.md` — 810 строк

---

## Шаг 4. Создание презентации (`docs/presentation.html`)

### 4.1. Действия
Создана HTML-презентация из 10 слайдов с тёмной темой и scroll-snap навигацией.

### 4.2. Слайды
1. Заголовок — LLM Shell
2. Назначение и цели
3. Технологический стек
4. Архитектура (диаграмма)
5. IPC API и инструменты
6. Agentic Loop
7. UI/UX макет
8. Roadmap (этапы)
9. Критерии приёмки
10. Команда / итоги

### 4.3. Технологии слайда
- Чистый HTML + CSS (без зависимостей)
- CSS `scroll-snap-type: y mandatory`
- Flexbox/Grid вёрстка
- Тёмная тема (`#0d1117`)

### 4.4. Артефакты
- `docs/presentation.html`

---

## Шаг 5. Скаффолдинг Vite + React + TypeScript проекта

### 5.1. Действия
```powershell
npm create vite@latest llm-shell -- --template react-ts
```
Создан проект `llm-shell/` со стандартным шаблоном Vite React-TS.

### 5.2. Структура после скаффолдинга
```
llm-shell/
├── package.json
├── vite.config.ts
├── tsconfig.json          # референсы на app + node
├── tsconfig.app.json      # конфиг для src/
├── tsconfig.node.json     # конфиг для vite.config.ts
├── index.html
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.tsx           # точка входа React
    └── index.css
```

### 5.3. Установленные npm-зависимости (dependencies)
| Пакет | Версия | Назначение |
|-------|--------|------------|
| `react` | ^19.2.8 | UI-библиотека |
| `react-dom` | ^19.2.8 | React DOM renderer |

### 5.4. Установленные npm-зависимости (devDependencies)
| Пакет | Версия | Назначение |
|-------|--------|------------|
| `@types/node` | ^24.13.3 | Типы Node.js |
| `@types/react` | ^19.2.17 | Типы React |
| `@types/react-dom` | ^19.2.3 | Типы react-dom |
| `@vitejs/plugin-react` | ^6.0.4 | Vite-плагин React |
| `oxlint` | ^1.75.0 | Линтер |
| `typescript` | ~6.0.2 | Компилятор TS |
| `vite` | ^8.2.0 | Bundler + dev-сервер |

### 5.5. npm-скрипты
```json
{
  "dev":    "vite",
  "build":  "tsc -b && vite build",
  "lint":   "oxlint",
  "preview":"vite preview"
}
```

### 5.6. Конфигурация TypeScript (`tsconfig.app.json`)
- `target: es2023`, `lib: ["ES2023", "DOM"]`
- `moduleResolution: bundler`
- `jsx: react-jsx`
- `noUnusedLocals`, `noUnusedParameters` — строгий контроль
- `verbatimModuleSyntax: true`

---

## Шаг 6. Установка `@tauri-apps/cli`

### 6.1. Действия
```powershell
npm install --save-dev @tauri-apps/cli
```

### 6.2. Результат
| Пакет | Версия | Назначение |
|-------|--------|------------|
| `@tauri-apps/cli` | ^2.11.4 | CLI для инициализации/сборки Tauri |

Это позволяет запускать `npx tauri init`, `npx tauri dev`, `npx tauri build`.

---

## Шаг 7. Инициализация Tauri-бэкенда

### 7.1. Действия
```powershell
npx @tauri-apps/cli@latest init
```
Параметры инициализации:
- **App name:** `LLM Shell`
- **Window title:** `LLM Shell`
- **Frontend dist:** `../dist`
- **Dev server URL:** `http://localhost:5173`
- **Before dev command:** `npm run dev`
- **Before build command:** `npm run build`

### 7.2. Созданная структура `src-tauri/`
```
src-tauri/
├── Cargo.toml                    # Rust-манифест
├── build.rs                      # Tauri build script
├── tauri.conf.json               # Конфиг Tauri (окна, бандл)
├── capabilities/
│   └── default.json              # Права доступа (permissions)
├── icons/                        # Иконки приложения
└── src/
    ├── main.rs                   # Точка входа Rust
    └── lib.rs                    # Конфигурация Tauri Builder
```

### 7.3. Rust-зависимости (`Cargo.toml`)
| Crate | Версия | Назначение |
|-------|--------|------------|
| `tauri` | 2.11.3 | Core framework |
| `tauri-build` | 2.6.3 | Build-time кодогенерация |
| `tauri-plugin-log` | 2 | Логирование |
| `serde` | 1.0 (+ derive) | Сериализация |
| `serde_json` | 1.0 | JSON для IPC |
| `log` | 0.4 | Фасад логирования |

### 7.4. `tauri.conf.json` — ключевые настройки
```json
{
  "productName": "LLM Shell",
  "version": "0.1.0",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [{
      "title": "LLM Shell",
      "width": 800,
      "height": 600,
      "resizable": true
    }],
    "security": { "csp": null }
  }
}
```

### 7.5. `src/main.rs`
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    app_lib::run();
}
```
Макрос `windows_subsystem = "windows"` скрывает консоль в release-сборке на Windows.

### 7.6. `src/lib.rs`
```rust
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```
В debug-режиме подключается плагин логирования (`tauri_plugin_log`) с уровнем `Info`.

### 7.7. Capabilities (`capabilities/default.json`)
```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": ["core:default"]
}
```
Пока включены только базовые (`core:default`) права Tauri. Плагины fs/shell потребуют расширения на следующем шаге.

---

## Шаг 8. Frontend-инфраструктура (зависимости, Tailwind, aliases) ✅

**Документация:** [docs/stages/08-frontend-infra.md](stages/08-frontend-infra.md)

### Кратко
- Установлены runtime/dev зависимости из ТЗ (Tauri plugins, zustand, markdown/shiki/monaco/diff, Tailwind v4)
- Alias `@/` в Vite + `tsconfig.app.json`
- CSS-токены темы в `src/index.css` (`@theme`)
- Скрипты `tauri:dev` / `tauri:build`
- Проверка: `npm run build` — OK

---

## Шаг 9. Stores, hooks, UI-каркас MVP ✅

**Документация:** [docs/stages/09-ui-stores-mvp.md](stages/09-ui-stores-mvp.md)

### Кратко
- Zustand: `settingsStore` (persist), `chatStore`, `fileStore`, `agentStore`
- Макет: FileTree | Chat | AgentPanel + Settings + StatusBar
- Chat stub со «стримингом»; FileTree через dialog + `list_directory`
- Hooks: `useChat`, `useSettings`, `useFileTree`, `useAgent`
- Типы и `DEFAULT_SETTINGS` / `PROVIDER_PRESETS` в `src/types/index.ts`

---

## Шаг 10. Rust IPC + plugins + capabilities ✅

**Документация:** [docs/stages/10-rust-ipc.md](stages/10-rust-ipc.md)

### Кратко
- Команды: FS (read/write/edit/list/…), search (glob/grep), shell (`execute_command`), system
- Плагины: fs, shell, store, dialog; capabilities с `fs:scope **`
- TS-обёртки в `src/services/tauri/*`
- **Блокер среды:** нет `link.exe` (нужны VS Build Tools / MSVC) — без них `cargo`/`tauri:dev` не собираются; frontend работает

---

## Итоговое состояние проекта (после шага 10)

### Этап 1 ТЗ (Каркас MVP) — закрыт по коду

| Критерий Этапа 1 | Статус |
|------------------|--------|
| Tauri + React + TS | ✅ |
| Макет Chat + FileTree + Settings | ✅ |
| Tailwind + UI | ✅ |
| Базовые команды read/write/list | ✅ (+ edit/search/exec) |

### Структура (ключевое)
```
LLM_agent/
├── docs/
│   ├── TZ.md
│   ├── presentation.html
│   ├── progress.md                 # этот файл
│   └── stages/
│       ├── 08-frontend-infra.md
│       ├── 09-ui-stores-mvp.md
│       └── 10-rust-ipc.md
└── llm-shell/
    ├── package.json
    ├── src/
    │   ├── App.tsx                 # → AppLayout
    │   ├── components/{chat,workspace,agent,settings,layout,common}/
    │   ├── stores/
    │   ├── hooks/
    │   ├── services/tauri/
    │   ├── types/
    │   └── utils/
    └── src-tauri/src/
        ├── lib.rs
        ├── commands/{fs,search,shell,system}.rs
        ├── models/
        └── utils/
```

### Запуск
```powershell
cd C:\Users\UskovAA\Documents\LLM_agent\llm-shell
npm run build          # проверка TS + Vite — OK
npm run dev            # UI без native FS
# после установки MSVC Build Tools:
npm run tauri:dev      # полный desktop
```

---

## Шаг 11. LLM-клиент + streaming ✅

**Документация:** [docs/stages/11-llm-client.md](stages/11-llm-client.md)

`LLMClient`, SSE parser, Test connection, дефолт Ollama `qwen2.5-coder:7b`.

---

## Шаг 12. Agentic Loop + tools ✅

**Документация:** [docs/stages/12-agentic-loop.md](stages/12-agentic-loop.md)

`runAgentLoop`, ToolRegistry (11 tools), ContextManager, подтверждения, diff после write/edit.

---

## Шаг 13. Diff / Monaco / slash / sessions / DnD ✅

**Документация:** [docs/stages/13-advanced-ui.md](stages/13-advanced-ui.md)

---

## Шаг 14. Полировка + приёмка ✅ (с оговорками)

**Документация:** [docs/stages/14-polish-acceptance.md](stages/14-polish-acceptance.md)

Темы dark/light/system, cancel/retry, таблица критериев §9.

---

## Шаг 15. MSVC + усиление system prompt ✅

**Документация:** [docs/stages/15-msvc-and-prompt.md](stages/15-msvc-and-prompt.md)

MSVC разблокирован, `tauri:dev` собирает `app.exe`. System prompt усилен под coding-agent (Python/C#/tools).

---

## Шаг 16. Multi-model failover ✅

**Документация:** [docs/stages/16-multi-model-failover.md](stages/16-multi-model-failover.md)

Цепочка primary + fallbackModels; автопереключение при 429/OOM/context/model-not-found. StatusBar показывает активную модель.

---

## Шаг 20. Встроенный HTTP/SOCKS5 proxy ✅

**Документация:** [docs/stages/20-in-app-proxy.md](stages/20-in-app-proxy.md)

LLM-трафик (чат, `/models`, автотест) через Rust reqwest + опциональный SOCKS5/HTTP proxy (Hiddify/Clash). Вкладка **Прокси** в Settings. `npm test` / `npm run build` / `cargo check` — OK.

---

## СТОП-ФАКТОР (работы по ТЗ приостановлены)

**Снят:** MSVC установлен, `cargo check` / `tauri:dev` проходят (см. [15-msvc-and-prompt.md](stages/15-msvc-and-prompt.md)).

Историческая заметка: пункты про APPDATA persist, streaming shell / `kill_process` и роли закрыты на шаге 22.

---

## Шаг 21. Cursor-like layout ✅

Трёхколоночный UI ближе к Cursor IDE:

- **Слева:** workspace path, git branch selector (`services/git.ts` + `gitStore`), список сессий (`SessionList` / `chatStore`), FileTree
- **Центр:** ChatWindow + ChatInput; AgentPanel сжат в нижнюю полоску (лог раскрывается)
- **Справа:** EditorPane — вкладки файлов, DiffViewer, CodeViewer с Preview/Source для Markdown
- StatusBar показывает текущую ветку (или `no git`)

---

## Шаг 22. Боевые профили, APPDATA, shell stream, роли ✅

**Документация:** [docs/stages/22-combat-profiles-persist-shell-roles.md](stages/22-combat-profiles-persist-shell-roles.md)

- Дефолт API: OpenRouter + xAI + Ollama; offline → только 7B; profile failover OpenRouter → xAI → Ollama
- Persist settings/sessions через Tauri Store (`appDataStorage` → `%APPDATA%`)
- Streaming shell + `kill_process`; роли reviewer/refactor + skills
- `ensureProfiles` дописывает недостающие combat-профили без затирания ключей

---

## Шаг 23. Health 401/402/403, API UX, Yandex, screenshot, tooltips ✅

**Документация:** [docs/stages/23-health-api-ux-screenshot.md](stages/23-health-api-ux-screenshot.md)  
**Дата работ:** 2026-08-07 · **2026-08-08 … 11 — пауза (отпуск)**

Поверх шага 22 закрыты эксплуатационные дыры: светофор/пикер моделей, организация «Хранилища API», Яндекс URI, скриншот агента, DnD вложений, чистка мёртвого кода и подсказки в Tooltip.

Кратко:
- API health: фильтр **✓ / 401 / 402 / 403 / ✕**; 402 и keyless cloud не «зелёные»
- Пикер модели в инпуте — только модели зелёных **профилей**
- Settings: «Мои профили» + каталог по категориям; heal имён/моделей; пресет **Yandex AI Studio**
- `take_screenshot` (Rust/`xcap`) + skill; Tauri DnD путей; ×/ПКМ для чатов и workspace
- Visual pass + `web-design-guidelines`; подсказки полей → «?» Tooltip; удалены мёртвые hooks/stubs

### Что дальше
1. ~~Прогнать e2e: Open folder → агент write_file / execute_command / take_screenshot~~ → см. [шаг 24](stages/24-e2e-ipc-smoke.md)  
2. `npm run tauri:build` → MSI  
3. По желанию: выравнять пользовательские ключи в `%APPDATA%\com.llmshell.app\llm-shell-persist.json` (xAI / OpenRouter / Yandex folder = folder ключа)

---

## Шаг 24. E2E IPC smoke (open folder → write / shell / screenshot) ✅

**Документация:** [docs/stages/24-e2e-ipc-smoke.md](stages/24-e2e-ipc-smoke.md)  
**Дата:** 2026-08-11

Автотест IPC-слоя (не полный UI Playwright): temp workspace → `list_directory` → `write_file` → `execute_command` → `take_screenshot` (primary).  
`npm run test:e2e-ipc` — **2/2 ok** (скриншот 1920×1080 сохранён в `%LOCALAPPDATA%\llm-shell\screenshots\`).

---

## Шаг 25. Success RAG (память успешных задач) ✅

**Документация:** [docs/TZ-SUCCESS-RAG.md](TZ-SUCCESS-RAG.md)  
**Дата:** 2026-08-11

- После успешного ответа агента (без tool errors) → запись в `llm-shell:success-memory`
- Похожие запросы в том же workspace → блок **Past successful tasks** в system prompt
- Settings → Agent → «RAG из успешных задач»

### Что дальше
1. **Фаза 2** — см. [TZ-PHASE2.md](TZ-PHASE2.md) и [PLAN-PHASE2.md](PLAN-PHASE2.md)  
2. Sprint 1 (P0): ~~git + semver~~ → ~~Projects/площадки~~ → MSI  
3. Sprint 2 (P1): Monaco edit, git tools, UI e2e, USER.md

---

## Шаг 26. Projects / площадки + semver 0.2.0 ✅

**Документация:** [docs/stages/26-projects-platforms-semver.md](stages/26-projects-platforms-semver.md)  
**Дата:** 2026-08-11

- Версия **0.2.0** во всех манифестах; корневой `.gitignore`; `git init`
- Несколько площадок (workspace-папок): список в sidebar, Open…, переключение, + Chat
- Чаты привязаны к `projectId`; миграция старых сессий → `project-default`
- `npm test` 67/67, `tsc -b` pass
- **MSI 0.2.0** собран: `src-tauri/target/release/bundle/msi/LLM Shell_0.2.0_x64_en-US.msi`

### Что дальше
1. **Sprint 4** — @codebase index + embeddings (Epic I)  
2. Sprint 5 — checkpoints, apply/reject  
3. Release **0.3.0**

---

## Шаг 28. Sprint 3 завершён: profile/project + wizard + UI e2e ✅

**Документация:** [docs/stages/28-sprint3-wizard-e2e.md](stages/28-sprint3-wizard-e2e.md)  
**Дата:** 2026-08-11

- H6: API профиль per project + UI в sidebar
- H7: First-run wizard (online/offline)
- H8: `agentLoop.e2e.test.ts`, `npm run test:e2e-ui`
- 76 tests pass

### Что дальше
1. **Sprint 7** — updater, export settings, release **0.3.0**

---

## Шаг 31. MCP + Ask/Agent/Plan + Terminal ✅

**Документация:** [docs/stages/31-mcp-modes-terminal.md](stages/31-mcp-modes-terminal.md)  
**Дата:** 2026-08-11

- Ask / Agent / Plan modes (header + AgentLoop guards)
- MCP HTTP client + Settings tab + presets
- xterm Terminal panel with streaming shell
- 92 tests pass

---

## Шаг 30. Checkpoints + Apply/Reject + apply_patch ✅

**Документация:** [docs/stages/30-checkpoints-apply-patch.md](stages/30-checkpoints-apply-patch.md)  
**Дата:** 2026-08-11

- `apply_patch` tool + fuzzy `edit_file`
- Checkpoints before agent run + Restore in AgentPanel
- Edit queue: Apply/Reject/Apply all/Reject all
- 87 tests pass

---

## Шаг 29. @codebase index + rules ✅

**Документация:** [docs/stages/29-codebase-index-rules.md](stages/29-codebase-index-rules.md)  
**Дата:** 2026-08-11

- Codebase index: chunk, embed (Ollama/OpenAI), keyword fallback, persist
- `@codebase` in chat + `codebase_search` tool
- Rules: AGENTS.md, `.cursor/rules`
- Reindex UI + StatusBar index indicator
- 82 tests pass

---

## Шаг 27. Monaco edit + git tools + @file ✅

**Документация:** [docs/stages/27-monaco-git-mentions.md](stages/27-monaco-git-mentions.md)  
**Дата:** 2026-08-11

- Editable Monaco + Ctrl+S + dirty tabs (`editorStore`)
- Agent tools `git_status`, `git_diff`
- `@file` autocomplete; кликабельные пути в чате
- CI workflow, CHANGELOG, USER.md, ARCHITECTURE.md
- 73 tests pass
