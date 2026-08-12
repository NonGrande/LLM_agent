# Шаг 19. Cursor-like агент, multi-API, лимиты моделей, тесты

**Статус:** выполнен  
**Дата:** 2026-08-07

## Что сделано

1. **System prompt** — стиль Cursor Composer: tool-first, запрет fake shell, Windows paths, язык пользователя.
2. **Провайдер xAI Grok** — пресет `https://api.x.ai/v1` + список моделей.
3. **APIs tab** — несколько сохранённых подключений (Ollama / Grok / OpenAI / Custom…), переключение без потери ключей.
4. **Models tab** — таблица ctx / RPM / TPM / RPD / $/1M; seed из каталога, RPM/TPM/RPD правите под свой тариф; Test & sync тянет `/v1/models`.
5. **Тесты** — `npm test` (vitest): parseTextToolCalls, ModelRouter, system prompt, modelCatalog.

## Как подключить Grok + свои лимиты

1. Settings → **APIs** → Add API → **xAI Grok** → Connect.  
2. **Provider** → вставить API key → **Test & sync models**.  
3. **Models** → вписать RPM/TPM/RPD из [console.x.ai](https://console.x.ai).  
4. New chat (новый system prompt).

## Команды

```powershell
cd C:\Users\UskovAA\Documents\LLM_agent\llm-shell
npm test
npm run build
```
