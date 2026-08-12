# Шаг 17. Исправление работы агента (text tool-call fallback)

**Статус:** выполнен  
**Дата:** 2026-08-07

## Симптом
Модель (часто Ollama `qwen2.5-coder:7b`) **печатает** JSON/`find`/`cd` текстом вместо native `tool_calls`. В Agent panel нет реальных tool-вызовов; файл не читается.

## Причины
1. Слабый / нестабильный OpenAI function calling у локальных 7B.  
2. Модель «симулирует» агента в Markdown.  
3. Unix-команды (`find`) на Windows бесполезны.  
4. Высокая temperature ухудшает формат вызовов.

## Что сделано в коде

| Изменение | Файл |
|-----------|------|
| Парсер текстовых TOOL_CALL / JSON / XML → `ToolCall[]` | `services/agent/parseTextToolCalls.ts` |
| После стрима: если нет native tools → extract + execute | `AgentLoop.ts` |
| Temperature для агента ≤ 0.3 | `AgentLoop.ts` |
| Default temperature 0.2 | `types` DEFAULT_SETTINGS |
| Промпт: Windows paths, запрет find/ls/cat, формат `TOOL_CALL\\n{json}` | `constants.ts` |

## Что сделать вам

1. **Перезапустить** LLM Shell (ярлык / `tauri-dev.ps1`), **New chat** (старый system prompt в сессии мешает).  
2. Settings → Model → **Temperature 0.0–0.3**.  
3. Open… → `C:\\Users\\UskovAA\\Documents\\LLM_agent`  
4. Промпт жёстко:
   ```
   Прочитай файл C:\Users\UskovAA\Documents\LLM_agent\docs\TZ.md через read_file и кратко резюмируй.
   ```
5. В Agent panel должны появиться `read_file` (не текст в чате).

## Модели (рекомендации)

| Модель | Tool calling |
|--------|----------------|
| qwen2.5-coder:7b | среднее; нужен fallback (уже есть) |
| qwen2.5-coder:14b+ | заметно лучше (если VRAM позволит) |
| Облачный GPT-4o / Claude | лучший native tools |

Ollama: убедитесь, что модель реально тянет tools:
```powershell
ollama show qwen2.5-coder:7b
```

## Ограничения
Fallback ловит типичные JSON/TOOL_CALL/XML паттерны, но не любой свободный текст. Если модель только болтает без JSON — смените модель или пишите промпт «вызови read_file».
