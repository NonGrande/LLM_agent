# Шаг 11. Этап 2 ТЗ — LLM-клиент, streaming, Test connection

**Статус:** выполнен  
**Дата:** 2026-08-07  
**Связь с ТЗ:** §3.1 LLM-клиент, Этап 2

## Цель
Универсальный OpenAI-compatible клиент со SSE-стримингом, retry, cancel; кнопка Test connection; дефолт Ollama.

## Модули

| Файл | Роль |
|------|------|
| `services/llm/LLMClient.ts` | HTTP client: `streamChat`, `listModels`, `testConnection`, `cancel` |
| `services/llm/streaming.ts` | Парсер SSE → `content` / `tool_calls` / `usage` / `done` / `error` |
| `services/llm/types.ts` | `StreamEvent`, `ChatCompletionRequest`, `LLMClientOptions` |
| `services/llm/providers/*` | Пресеты openai / ollama / anthropic |

## Переменные / опции клиента

| Поле | По умолчанию | Смысл |
|------|--------------|-------|
| `baseUrl` | из Settings | без trailing `/` |
| `apiKey` | `""` | Bearer, если непустой |
| `timeoutMs` | `120000` | abort стрима |
| `maxRetries` | `3` | экспоненциальная задержка на 5xx / сеть |

## Логика `streamChat`
1. POST `{baseUrl}/chat/completions` с `stream: true`
2. Читает `ReadableStream`, парсит `data: {...}`
3. Накапливает дельты `tool_calls[index]`
4. Эмитит события наружу (AgentLoop / UI)

## Test connection (Settings → Provider)
1. GET `/models` → список в `availableModels`
2. Fallback: короткий `streamChat("ping")` если `/models` недоступен

## Дефолтный провайдер
`DEFAULT_SETTINGS.provider.type = "ollama"`, model `qwen2.5-coder:7b`, URL `http://localhost:11434/v1`.

## Проверка
```powershell
npm run build
npm run dev
# Settings → Ollama → Test connection (нужен запущенный Ollama)
```

## Зависимости от среды
- CORS: в браузерном `vite` запросы к Ollama могут блокироваться; в **Tauri WebView** обычно ок.
- Полный desktop: нужен MSVC (см. шаг 10).
