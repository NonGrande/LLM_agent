# Шаг 15. MSVC разблокирован + усиление agent system prompt

**Статус:** выполнен  
**Дата:** 2026-08-07

## MSVC
- Build Tools: `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools`
- `cargo check` OK после:
  - убран `protocol-asset` из `Cargo.toml`
  - `tauri_plugin_store::Builder::default().build()`
- `vite.config.ts`: `server.watch.ignored` → `**/src-tauri/**` (фикс EBUSY)
- Скрипт запуска: `llm-shell/scripts/tauri-dev.ps1`
- `npm run tauri:dev` → `Finished` + `Running target\debug\app.exe`

## Поведение модели
Локальная модель (часто 7B) может отвечать «я не могу писать код / нет IDE». Это не ограничение приложения: tools есть, но модель игнорирует роль агента.

**Фикс:** усилен `SYSTEM_PROMPT_TEMPLATE` в `src/utils/constants.ts` — явно: desktop coding agent, умеет Python/C#/… через tools, запрет отговорок про «нет IDE».

## Как запускать дальше
```powershell
cd C:\Users\UskovAA\Documents\LLM_agent\llm-shell
powershell -ExecutionPolicy Bypass -File .\scripts\tauri-dev.ps1
```
Или Developer PowerShell for VS + `npm run tauri:dev`.

## Проверка агента
1. Settings → Ollama → model `qwen2.5-coder:7b` → Test connection  
2. Open… → выбрать папку проекта  
3. New chat → «Создай hello.py с print("hi") и запусти»  
4. Allow на write/execute  
5. В Agent panel должны появиться tool calls  
