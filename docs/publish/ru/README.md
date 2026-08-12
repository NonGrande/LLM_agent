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

## Как это писалось

LLM Shell собирали как рабочий продукт под Windows: Tauri + React, без встраивания VS Code. Много кода и документации шло через Cursor и агентов — по спринтам, с живыми STATUS/TZ и проверками `tsc` / vitest. Ручная отладка никуда не делась: ломались tool-calls у маленьких моделей, падал UI на больших diff’ах, упирались в лимиты контекста; без `tauri:dev` часть IPC просто не работает.

По моделям держали две линии. Локально — Ollama и лёгкие open-weight модели (порядка 7–8B: Qwen, Mistral и похожие): удобно офлайн и без счёта за токены, но они часто «рисуют» bash/Python в чате вместо настоящих `tool_calls`. Отсюда Strict tools, жёсткий алгоритм в system prompt и нормализация аргументов tools. В онлайне — OpenAI-совместимые профили (OpenRouter, xAI, Yandex и др.), failover между моделями/профилями и proxy: из РФ без VPN/прокси часть API не отвечает. Success RAG, `@docs`/`@web`, pin в AGENTS.md — чтобы слабая модель не открывала одно и то же с нуля каждый раз.

Итого: стек под ограничения локальных open-моделей и облачных API, а не демо «идеального агента на одной флагманской модели».

Persist: `%APPDATA%\com.llmshell.app\llm-shell-persist.json`
