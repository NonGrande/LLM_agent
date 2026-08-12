# Шаг 16. Multi-model failover (цепочка моделей)

**Статус:** выполнен  
**Дата:** 2026-08-07

## Ответ на вопрос
Да. Можно работать с несколькими моделями и **автоматически переключаться при лимитах/ошибках**.

Это **не** то же самое, что max iterations (25):
| Механизм | Смысл |
|----------|--------|
| Max iterations | Сколько «ходов» agent loop (LLM↔tools) |
| Max context tokens | Сколько текста влезает в запрос |
| **Model failover** | Смена модели при 429 / OOM / context overflow / model not found |

## Как устроено

### Настройки (`ProviderConfig`)
- `model` — первичная
- `fallbackModels: string[]` — запасные по порядку
- `failoverEnabled: boolean` — вкл/выкл автопереключение

Defaults (Ollama): primary `qwen2.5-coder:7b`, fallbacks `qwen2.5:7b`, `qwen2.5-coder:1.5b`.

### `ModelRouter` (`services/llm/ModelRouter.ts`)
- `buildModelChain` — unique ordered list
- `isFailoverError` — эвристики: 429, rate limit, 503, context length, OOM, model not found, …
- `tryFailover(err)` → next model или exhausted

### `AgentLoop`
На ошибке стрима → failover → retry того же шага с новой моделью → в чат пишется `Failover: A → B (…)`.  
StatusBar показывает активную модель + метку `(failover)`.

### UI
Settings → Provider:
- Model (primary)
- Fallback models (по строке)
- Checkbox Auto-failover

## Ограничения сейчас
- Цепочка в рамках **одного** baseUrl/API key (один провайдер).
- Переключение между OpenAI ↔ Ollama как разными endpoint — следующий этап (multi-provider profiles).
- Max iterations сам по себе модель не меняет (только ошибки API/инференса).

## Проверка
1. Settings → задать fallbacks, включить failover  
2. Указать несуществующую primary model → запрос должен перейти на следующую  
3. StatusBar: Model показывает активную + `(failover)`  
