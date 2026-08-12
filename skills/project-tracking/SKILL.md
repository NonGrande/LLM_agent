---
name: project-tracking
description: >
  Ведёт живой статус проекта LLM Shell / agent IDE: STATUS.md, единое TZ.md,
  PLAN, Remaining, метрики похожести, DoD закрытия спринта. Use when: статус
  проекта, обновить STATUS, закрыть спринт, Remaining, roadmap, ведение проекта,
  project status, sync docs after epic, что сделано / что осталось.
---

# Project Tracking

Точка правды по продукту — не чат, а файлы в `docs/`.

## Порядок чтения (всегда сначала)

1. `docs/STATUS.md` — Done / Remaining / метрики  
2. `docs/TZ.md` — единые FR (A/E/U/D) и статусы  
3. `docs/PLAN-PHASE3.md` — спринты (факт)  
4. При user-facing — `docs/USER.md` · `CHANGELOG.md`

Архив: `TZ-PHASE2.md` / `TZ-PHASE3.md` — **не дополнять** (редиректы).

## После эпика / спринта (чеклист)

```
- [ ] Код + `npx tsc -b` + `npm test` (из llm-shell/)
- [ ] FR в docs/TZ.md §3 → ✅ / ⚠️ / ❌
- [ ] docs/STATUS.md: Done += ; Remaining −=
- [ ] docs/PLAN-PHASE3.md: строка спринта ✅
- [ ] docs/progress.md: строка оглавления + краткий шаг
- [ ] docs/stages/NN-slug.md: отчёт (skill stage-report)
- [ ] USER.md / CHANGELOG если UX или релиз
- [ ] presentation.html после крупной вехи (skill stakeholder-presentation)
```

## Шаблоны правок STATUS

**Шапка** (держи актуальной):

```markdown
> **Обновлено:** YYYY-MM-DD
> **Версия приложения:** **X.Y.Z**
> **Оценка похожести на Cursor:** ~**NN%** (краткий контекст)
> **Тесты:** **N** vitest · `tsc -b` · …
```

**Remaining** — только открытое; закрытое убери из таблицы, не дублируй в Done длинными списками.

## Метрики (не завышать)

| Категория | Вес |
|-----------|-----|
| Agent | 30% |
| IDE | 25% |
| Context | 20% |
| UX | 15% |
| DevOps | 10% |

Честно отмечай gap (например Sprint 11 Palette) — agent-first важнее «% как у Cursor».

## Язык

Ответы пользователю — кратко по-русски: что закрыто / что в Remaining / куда смотреть (`STATUS.md`).

## Связанные skills

- Отчёт этапа → `/skill stage-report`
- Презентация стейкхолдерам → `/skill stakeholder-presentation`
