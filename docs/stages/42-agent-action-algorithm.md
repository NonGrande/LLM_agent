# Шаг 42 — Agent action algorithm + tools hardening ✅

> **Дата:** 2026-08-12 · **Статус:** закрыт  
> **Связь:** Agent reliability / weak local models · TZ A-19

## Сделано

| Тема | Суть |
|------|------|
| System prompt | Hard pipeline Intake→RAG→Decompose→Tool-first→Execute→Verify в `constants.ts` |
| Strict tools retry | Agent + `strictTools` + tools: один nudge при ответе без `tool_calls` (`AgentLoop.ts`) |
| Text tool parse | Алиасы path/file_path/dir + больше known tools (`parseTextToolCalls.ts`) |
| Skill / AGENTS | Краткие указатели на алгоритм, без тройного дубля |
| Docs | TZ A-19 · STATUS · USER · CHANGELOG · этот stage |

## Проверка

```powershell
cd llm-shell
npx tsc --noEmit
npm test -- --run
# 156 vitest passed (2026-08-12)
```

## Next / Backlog (опционально)

- Sibling: E-11 `@docs`/`@web` (stage 41) — не пересекались по файлам UI/http
