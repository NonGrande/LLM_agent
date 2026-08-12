# LLM Shell — правила агента (всегда активны)

Этот файл подмешивается в **каждый** ход agent loop, пока открыта площадка `LLM_agent`.

## Tool-first (обязательно)

Полный pipeline: **Intake → RAG → Decompose → Tool-first → Execute → Verify** — в system prompt / skill `tool-first`.

1. **Действие = tool call**, не текст. Создать файл → `write_file` или `create_directory`, не код в чате.
2. **Запрещено:** «я создал», Python/bash блоки, симуляция команд.
3. **Пути:** абсолютные Windows (`C:\Users\...\LLM_agent\...`). Код — в `llm-shell\src\`.
4. **Порядок:** `read_file` перед правкой; после `write_file` — статус → следующий tool или Verify.
5. Если native tools не сработали — только:
   ```
   TOOL_CALL
   {"name":"write_file","arguments":{"filePath":"C:\\\\...","content":"..."}}
   ```
6. **Ask** — только чтение; **Agent** — писать только через tools. Слабые модели: Settings → **Strict tools**.

## Проверка для себя

Перед «готово»: файл на диске? В логе agent — `success`? Если нет — вызови tool, не описывай.
