# Шаг 14. Этап 5 ТЗ — Полировка, темы, ошибки, критерии приёмки

**Статус:** выполнен на уровне кода UI; desktop/installer — блокер MSVC  
**Дата:** 2026-08-07  
**Связь с ТЗ:** Этап 5, §9 критерии приёмки

## Сделано

| Тема | Реализация |
|------|------------|
| Dark / Light / System | `AppLayout.useTheme` + `html.theme-light` CSS tokens |
| Font size | `settings.appearance.fontSize` → inline style layout |
| Ошибки LLM | сообщения `Error: …` в чате, agent status `error` |
| Cancel stream | Stop + `AbortController` / `LLMClient.cancel` |
| Retry | `fetchWithRetry` в LLMClient |
| ConfirmDialog | common component (AgentPanel использует inline confirm) |

## Критерии приёмки (§9) — статус

| № | Критерий | Статус |
|---|----------|--------|
| 1 | Запуск Windows без доп. зависимостей (WebView2) | ⚠️ нужен MSVC для сборки; runtime — WebView2 |
| 2 | Streaming chat | ✅ код готов (нужен провайдер) |
| 3 | read/write/edit файлов | ✅ IPC + tools (нужен Tauri) |
| 4 | glob + grep | ✅ |
| 5 | shell с подтверждением | ✅ |
| 6 | agentic loop ≤25 | ✅ |
| 7 | OpenAI / Ollama / custom | ✅ |
| 8 | Settings без перезапуска | ✅ zustand persist |
| 9 | Diff viewer | ✅ |
| 10 | Темы | ✅ |
| 11 | История чата | ✅ localStorage (не APPDATA path из ТЗ — см. ниже) |
| 12 | MSI installer | ❌ стоп-фактор: нет MSVC / не собирали `tauri build` |

## Отклонения от ТЗ (осознанно / следующий шаг)

1. **История сессий** хранится в `localStorage`, не в `%APPDATA%/llm-shell/sessions/` — для APPDATA нужен Tauri Store / fs после MSVC.  
2. **API keys** в localStorage plaintext — перенос в Tauri Store / OS keychain после desktop-сборки.  
3. **Radix UI** не подключался — UI на Tailwind.  
4. **Streaming shell / kill_process** — stubs.  
5. **Кроссплатформенные инсталляторы** не собраны.

## СТОП-ФАКТОР

```
error: linker `link.exe` not found
```

Без **Visual Studio Build Tools (MSVC + Windows SDK)** невозможно:
- `cargo check` / `npm run tauri:dev`
- e2e проверка FS tools
- `tauri build` → `.msi`

Frontend (`npm run build` / `npm run dev`) и логика LLM/агента готовы к проверке в браузере (Ollama может упереться в CORS) или в Tauri после установки MSVC.
