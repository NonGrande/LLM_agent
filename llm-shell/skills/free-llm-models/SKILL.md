---
name: free-llm-models
description: >
  Sync reachable language models into API profiles using current proxy/keys.
  Use when: бесплатные модели, free LLM, sync models, доступные модели,
  опроси модели, pack models into profile, Sync models button.
---

# Sync reachable LLM models

Кнопка шапки **Sync models** (и этот skill):

1. Берёт **текущие** Settings: профили, API keys, Base URL, **прокси**.
2. Для каждого профиля вызывает `GET {baseUrl}/models` (Ollama — ещё `/api/tags`).
3. Куда ответили успешно — записывает `availableModels` + primary/fallback.
4. Активирует **первый успешный** профиль.
5. OpenRouter: `:free` модели поднимаются в начало списка.

## Если ничего не доступно

- Cloudflare / системный VPN / Settings → Прокси  
- Ключ в профиле  
- Локальный Ollama на `:11434`

Не выдумывай model id и не подставляй чужие ключи.
