# Шаг 9. Zustand stores, типы, hooks, UI-каркас MVP

**Статус:** выполнен  
**Дата:** 2026-08-07  
**Связь с ТЗ:** §2.3 структура, §3.4 UI, Этап 1 MVP

## Цель
Собрать рабочий экран приложения: FileTree + Chat + Agent Panel + Settings + StatusBar, со state и типами из ТЗ. LLM пока stub (эхо), файловое дерево — через Tauri IPC.

## Типы (`src/types/index.ts`)

Ключевые интерфейсы (по ТЗ §3.1 / §8):

| Тип | Назначение |
|-----|------------|
| `ChatMessage` | Сообщение чата (+ `id`, `createdAt`, `streaming`) |
| `ProviderConfig` / `AppSettings` | Провайдер, generation, agent, workspace, appearance |
| `DirEntry`, `FileContent`, `CommandResult`, … | IPC DTO frontend ↔ Rust |
| `ToolExecution`, `PermissionRequest` | Состояние агента / подтверждения |
| `DEFAULT_SETTINGS`, `PROVIDER_PRESETS` | Дефолты и пресеты URL/моделей |

## Stores (Zustand)

### `settingsStore`
| Поле / метод | Логика |
|--------------|--------|
| `settings: AppSettings` | Полный конфиг |
| `isOpen` | Видимость диалога Settings |
| `setProviderType(type)` | Подставляет `PROVIDER_PRESETS[type]` (URL, models) |
| `updateWorkspace({ path })` | Синхронизирует `agent.workingDirectory` |
| persist | `localStorage` ключ `llm-shell:settings` (`STORAGE_KEYS.SETTINGS`) |

### `chatStore`
| Поле / метод | Логика |
|--------------|--------|
| `sessions[]`, `currentSessionId` | Мультисессии (MVP: в памяти) |
| `draft` | Текст ввода |
| `isStreaming` | Блокировка input |
| `addMessage` / `appendToMessage` | История; title из первого user-сообщения |
| `clearMessages` | Slash `/clear` |

### `fileStore`
| Поле / метод | Логика |
|--------------|--------|
| `rootPath`, `entries`, `expanded` | Lazy tree: дети только после `toggleDir` |
| `setRootPath` | `list_directory` через IPC; в browser — ошибка с подсказкой |
| `isTauri()` | `window.__TAURI_INTERNALS__` |

### `agentStore`
| Поле / метод | Логика |
|--------------|--------|
| `status`, `iteration`, `toolLog` | Панель агента |
| `requestPermission` / `resolvePermission` | Promise + UI Allow/Deny |

## UI-компоненты

```
AppLayout
├── header (New chat, Settings)
├── FileTree | ChatWindow+ChatInput | AgentPanel
├── StatusBar
└── SettingsDialog
```

| Компонент | Поведение MVP |
|-----------|----------------|
| `ChatInput` | Enter send, Shift+Enter newline, `/clear`; stub-ответ ассистента с «стримингом» |
| `FileTree` | `dialog.open({ directory: true })` → `updateWorkspace` → `list_directory` |
| `SettingsDialog` | Вкладки Provider / Model / Agent / Appearance |
| `AgentPanel` | Статус, iteration, log, confirmation UI |
| `StatusBar` | provider, model, agent status, tauri/browser, version |

## Constants (`src/utils/constants.ts`)

| Константа | Значение | Зачем |
|-----------|----------|-------|
| `APP_NAME` | `LLM Shell` | Заголовок UI |
| `APP_VERSION` | `0.1.0` | StatusBar |
| `STORAGE_KEYS.SETTINGS` | `llm-shell:settings` | persist |
| `MAX_FILE_SIZE_BYTES` | 10 MiB | согласование с Rust |
| `DEFAULT_COMMAND_TIMEOUT_MS` | 120000 | shell |
| `SYSTEM_PROMPT_TEMPLATE` | шаблон | для Этапа 3 |

## Логика stub-чата
1. User → `addMessage(user)`
2. Assistant message с `streaming: true`
3. `setInterval` дописывает текст (имитация SSE)
4. `setStreaming(false)` по завершении  

Реальный LLM — Этап 2 (`LLMClient` + SSE).

## Проверка
```powershell
cd llm-shell
npm run build
npm run dev          # UI в браузере (без FS)
# полный desktop:
npm run tauri:dev    # нужен MSVC linker (см. шаг 10)
```

## Артефакты
- `src/stores/*`
- `src/components/**`
- `src/hooks/*`
- `src/App.tsx` → `AppLayout`
- `src/utils/env.ts`
