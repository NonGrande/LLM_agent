# Шаг 24. E2E IPC smoke

**Статус:** выполнен  
**Дата:** 2026-08-11

## Цель

Прогнать цепочку из журнала: **Open folder → write_file / execute_command / take_screenshot** на реальном Rust IPC (без полного UI Playwright).

## Что сделано

1. Модуль тестов `src-tauri/src/e2e_smoke.rs` (подключён из `lib.rs` под `cfg(test)`).
2. Хелпер `screenshot::capture_for_e2e` — захват без `AppHandle`.
3. npm-скрипт: `test:e2e-ipc` → `cargo test … e2e_smoke -- --nocapture`.

### Сценарии

| Тест | Шаги |
|------|------|
| `open_folder_write_file_execute_command` | temp dir → `list_directory` → `write_file` → `read_file` → `list_directory` → `execute_command` (`echo e2e-shell-ok`) |
| `take_screenshot_primary_monitor` | `capture_for_e2e("primary")` → PNG на диск, width/height/size > 0 |

## Результат прогона (2026-08-11)

```
test e2e_smoke::open_folder_write_file_execute_command ... ok
test e2e_smoke::take_screenshot_primary_monitor ... ok
e2e screenshot OK: …\llm-shell\screenshots\screenshot-DISPLAY1-….png (1920x1080, ~397 KB)
```

**2 passed.**

## Запуск

```powershell
cd C:\Users\UskovAA\Documents\LLM_agent\llm-shell
npm run test:e2e-ipc
```

## Ограничения

- Это **IPC smoke**, не клики по Settings / AgentLoop с живой LLM.
- «Open folder» смоделирован как `list_directory` на temp workspace (диалог ОС не открывается).
- Скриншот окна приложения (`target: window`) в smoke не обязателен — проверяется primary monitor.
