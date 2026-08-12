---
name: tool-first
description: >
  Enforce real tool calls instead of chat simulation. Use when: создай, создать,
  напиши файл, write file, create file, сгенерируй проект, implement, добавь
  модуль, не симулируй, use tools, write_file, create_directory, agent mode,
  файлы на диск, tool-first, без кода в чате, agent action algorithm.
---

# Tool-first agent

Полный **Agent action algorithm** (Intake → RAG → Decompose → Tool-first → Execute → Verify) —
в system prompt (`constants.ts`). Здесь только краткие правила.

## Правило

Любая задача с файлами, папками, shell, git, поиском по коду → **сразу native tool**, не prose.

## Запрещено

- «Я создал файлы…» без tool result в логе
- ```python``` / ```bash``` с `open()`, `os.mkdir`, PowerShell вместо tools
- Симуляция Node fs / «используйте fs module» вместо `write_file`

## Алгоритм «создай X» (сжато)

1. Абсолютный путь под `{WORKING_DIR}` (код — `llm-shell\src\...`).
2. `create_directory` при необходимости → `write_file` / `edit_file` / `apply_patch`.
3. **Verify:** `read_file` / `list_files` → короткий итог.

## Local 7B (Ollama)

Если function calling не приходит — **только** `TOOL_CALL` + JSON. Включи **Strict tools** в Settings → Agent (`tool_choice: required` + один nudge-retry).

## Self-check

Нет ✓ в agent log / файла на диске → задача **не выполнена**. Повтори tool, не объясняй.
