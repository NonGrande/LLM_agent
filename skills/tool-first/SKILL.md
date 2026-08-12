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
в system prompt приложения (`llm-shell/src/utils/constants.ts`). Здесь только краткие правила.
См. также `llm-shell/skills/tool-first/SKILL.md`.

## Правило

Любая задача с файлами, папками, shell, git, поиском по коду → **сразу native tool**, не prose.

## Запрещено

- «Я создал файлы…» без tool result в логе
- ```python``` / ```bash``` вместо tools
- Симуляция Node fs вместо `write_file`

## Self-check

Нет ✓ в agent log / файла на диске → задача **не выполнена**. Повтори tool.
