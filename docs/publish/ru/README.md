# LLM Shell

Десктопный agent-first IDE под Windows (Tauri 2 + React). Чат с LLM, tools к файлам/shell/git, Monaco, MCP — без форка VS Code.

**Версия:** 0.3.0 · **тесты:** ~156 vitest · **оценка похожести на Cursor (ориентир):** ~89–91% — см. живой [STATUS](../../STATUS.md).

## Запуск из исходников

```powershell
cd llm-shell
npm install
npm run tauri:dev
```

Сборка MSI: `npm run tauri:build` → `llm-shell/src-tauri/target/release/bundle/msi/`.

## Что умеет (факт)

- **Agent:** Ask / Agent / Plan · tool loop · confirm опасных операций · failover / handoff · Strict tools  
- **Контекст:** `@file` · `@codebase` · `@docs` · `@web` · drag/click attach · Rules & RAG  
- **IDE:** Monaco · multi-LSP · ghost-text · Palette / Find / Problems / Outline / Cmd+K  
- **Интеграции:** MCP HTTP + stdio · Sync models · proxy · Cloudflare One (запуск, не embed)

## Документы этого набора

| Файл | О чём |
|------|--------|
| [TZ.md](TZ.md) | Требования и статусы FR |
| [USER.md](USER.md) | Установка, Settings, хоткеи |
| [CHANGELOG.md](CHANGELOG.md) | Недавние изменения для пользователя |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Стек и модули |

Английский параллельный набор: [../en/](../en/). Карта publish: [../README.md](../README.md).

Persist: `%APPDATA%\com.llmshell.app\llm-shell-persist.json`
