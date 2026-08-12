# Шаг 22. Боевые профили, APPDATA, profile failover, shell stream, роли

**Статус:** выполнен  
**Дата:** 2026-08-07

## Сделано
1. Дефолт: OpenRouter (боевой) + xAI + Ollama offline/7B; SOCKS URL-заготовка `socks5://127.0.0.1:1080`.
2. Offline mode — только Ollama 7B; онлайн — cloud.
3. Persist settings/sessions через Tauri Store → `%APPDATA%` (`llm-shell-persist.json`), fallback localStorage (`createAppDataJSONStorage`).
4. Failover моделей + **профилей** (OpenRouter → xAI → Ollama).
5. Streaming shell + `kill_process` (Rust); event `type`: `stdout`/`stderr`/`exit`/`error`.
6. Skills: `code-reviewer`, `refactor` + роли в Settings → Agent.
7. `ensureProfiles` дописывает `profile-openrouter` / `profile-xai` / `profile-ollama` без затирания ключей.
8. Проверки: `npx tsc -b`, `npm test` — OK.
