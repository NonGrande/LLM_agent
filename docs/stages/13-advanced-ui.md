# Шаг 13. Этап 4 ТЗ — Diff, Monaco, slash, sessions, DnD

**Статус:** выполнен (функционально в UI)  
**Дата:** 2026-08-07  
**Связь с ТЗ:** Этап 4

## Компоненты

| Компонент | Файл | Поведение |
|-----------|------|-----------|
| Diff viewer | `workspace/DiffViewer.tsx` | side-by-side, Apply/Reject (закрывает панель) |
| Monaco | `workspace/CodeViewer.tsx` | read-only просмотр по path |
| File tabs | `workspace/FileTabs.tsx` | открытые файлы |
| Markdown + Shiki | `common/Markdown.tsx`, `CodeBlock.tsx` | GFM + Copy |
| Slash commands | `chat/ChatInput.tsx` | `/clear` `/help` `/model` `/context` `/stop` |
| DnD | `ChatInput` | drop файлов → attached paths в промпт |
| Sessions | `chatStore` persist | localStorage `llm-shell:current-session` (до 30 сессий) |

## `workspaceUiStore`

| Поле/метод | Смысл |
|------------|-------|
| `openFiles`, `activePath` | вкладки редактора |
| `openFile(path)` | открыть в Monaco |
| `showDiff(path, old, new)` | показать Diff после write/edit агента |
| `clearDiff` | закрыть diff |

## Мультимодальность
Базовый задел: типы `ContentPart` / `image_url` в `types`. Полноценный paste изображений в запрос — минимальный (пути файлов через DnD). Vision API — расширение при наличии vision-модели.

## Layout
При открытом файле/diff центральная колонка делится: сверху Monaco/Diff, снизу Chat.
