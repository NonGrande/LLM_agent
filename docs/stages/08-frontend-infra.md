# Шаг 8. Frontend-зависимости, Tailwind, path aliases

**Статус:** выполнен  
**Дата:** 2026-08-07  
**Связь с ТЗ:** Этап 1 — каркас (часть frontend)

## Цель
Подготовить frontend-инфраструктуру: UI/state/IPC-зависимости из ТЗ, Tailwind v4, alias `@/`.

## Установленные зависимости (npm)

### Runtime
| Пакет | Версия (package.json) | Назначение |
|-------|----------------------|------------|
| `@tauri-apps/api` | ^2.11.1 | IPC `invoke`, events |
| `@tauri-apps/plugin-dialog` | ^2.7.2 | Диалог выбора папки |
| `@tauri-apps/plugin-fs` | ^2.5.1 | Плагин FS (резерв; основные операции — custom Rust cmds) |
| `@tauri-apps/plugin-shell` | ^2.3.5 | Shell plugin |
| `@tauri-apps/plugin-store` | ^2.4.4 | Persist настроек (следующий этап) |
| `zustand` | ^5.0.14 | State management |
| `react-markdown` + `remark-gfm` | ^10 / ^4 | Markdown (подключение в Этап 2/4) |
| `shiki` | ^4.4.2 | Подсветка кода (Этап 4) |
| `@monaco-editor/react` | ^4.7.0 | Редактор кода (Этап 4) |
| `react-diff-viewer-continued` | ^4.4.0 | Diff viewer (Этап 4) |

### Dev
| Пакет | Назначение |
|-------|------------|
| `tailwindcss` + `@tailwindcss/vite` | Стили |
| `@tauri-apps/cli` | `tauri dev` / `tauri build` |

## Переменные и конфигурация

### `vite.config.ts`
- `resolve.alias['@']` → `./src`
- `server.port = 5173`, `strictPort: true` (совпадает с `tauri.conf.json` → `devUrl`)

### `tsconfig.app.json`
- `paths["@/*"]` → `./src/*`
- `baseUrl: "."`
- `ignoreDeprecations: "6.0"` — подавление deprecation `baseUrl` в TS 6

### CSS-токены (`src/index.css` → `@theme`)
| CSS-переменная | Значение | Смысл |
|----------------|----------|-------|
| `--color-bg-primary` | `#0d1117` | Фон приложения |
| `--color-bg-secondary` | `#161b22` | Панели |
| `--color-bg-tertiary` | `#21262d` | Hover / tertiary |
| `--color-border-default` | `#30363d` | Границы |
| `--color-text-primary` | `#e6edf3` | Основной текст |
| `--color-text-secondary` | `#8b949e` | Вторичный текст |
| `--color-accent-blue` | `#58a6ff` | Акцент / CTA |
| `--color-accent-green` | `#3fb950` | Success / assistant |
| `--color-accent-red` | `#f85149` | Ошибки |
| `--color-accent-yellow` | `#d29922` | Предупреждения / tool |

Использование в классах: `bg-bg-primary`, `text-accent-blue` и т.д. (Tailwind v4 `@theme`).

## Логика
Alias `@/` позволяет импортировать модули как `@/stores/chatStore` вместо относительных путей. Vite резолвит alias на этапе сборки; TypeScript — через `paths`.

## npm-скрипты (добавлены)
```json
"tauri": "tauri",
"tauri:dev": "tauri dev",
"tauri:build": "tauri build"
```

## Проверка
```powershell
cd llm-shell
npm run build   # tsc -b && vite build — OK
```

## Артефакты
- `llm-shell/package.json`
- `llm-shell/vite.config.ts`
- `llm-shell/tsconfig.app.json`
- `llm-shell/src/index.css`
