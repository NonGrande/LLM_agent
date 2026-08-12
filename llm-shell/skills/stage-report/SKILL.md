---
name: stage-report
description: >
  Пишет отчёты этапов проекта: docs/stages/NN-slug.md, строки в progress.md,
  краткие release notes. Use when: отчёт, stage report, шаг журнала, закрыть
  шаг, progress.md, docs/stages, задокументировать спринт, write stage doc,
  отчёт по реализации.
---

# Stage Report

Фиксируй сдачу шага **коротко и проверяемо** — без копипасты всего diff.

## Когда писать

- Закрыт спринт / эпик / заметный polish-пакет  
- Номер шага = следующий свободный в `docs/progress.md` оглавлении  

## Файлы

| Файл | Действие |
|------|----------|
| `docs/stages/NN-slug.md` | Полный отчёт шага |
| `docs/progress.md` | Строка в таблице оглавления + блок «Шаг NN» сверху свежих |
| `docs/STATUS.md` | Через skill `project-tracking` |
| `CHANGELOG.md` | Added/Fixed/Changed если user-facing |

Имя файла: `NN-краткий-slug.md` (латиница, дефисы), напр. `39-polish-context-models-icon.md`.

## Шаблон `docs/stages/NN-slug.md`

```markdown
# Шаг NN — Краткий заголовок ✅|WIP

> **Дата:** YYYY-MM-DD · **Статус:** закрыт|в работе
> **Связь:** Sprint N / эпик / TZ ID (если есть)

## Сделано

| Тема | Суть |
|------|------|
| … | файл / поведение одной строкой |

## Проверка

\`\`\`powershell
cd llm-shell
npx tsc -b
npx vitest run   # или узкий путь к тестам
\`\`\`

## Next / Backlog (опционально)

- одна строка: что сознательно не вошло
```

## Блок в `progress.md` (вставить выше предыдущих свежих шагов)

```markdown
## Шаг NN. Заголовок ✅

**Документация:** [docs/stages/NN-slug.md](stages/NN-slug.md)  
**Дата:** YYYY-MM-DD

- 3–6 буллетов факта
- N vitest · tsc green
```

И в **оглавление** вверху:

```markdown
| NN | ✅ | [stages/NN-slug.md](stages/NN-slug.md) |
```

## Правила

1. Пиши **факт из кода**, не планы.  
2. Команды проверки — реальные, из `llm-shell/`.  
3. Не дублируй весь STATUS; ссылайся.  
4. Секреты / ключи / APPDATA paths с токенами — запрещены.  
5. Язык отчёта: русский заголовки OK; имена файлов — латиница.

## После отчёта

Обнови STATUS/TZ через `/skill project-tracking`. Крупная веха → `/skill stakeholder-presentation`.
