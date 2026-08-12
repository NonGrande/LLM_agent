# Шаг 43 — Docs bilingual pack (TZ + publish RU/EN) ✅

> **Дата:** 2026-08-12 · **Статус:** закрыт  
> **Связь:** TZ v4.1 · N-04 · STATUS Remaining: git push

## Сделано

| Тема | Суть |
|------|------|
| TZ.md | v4.1: E-11/A-19/U-12, 156 tests, фазы 40–43, метрики = STATUS |
| publish/ | `ru/` + `en/` (README, TZ/SPEC, USER, CHANGELOG, ARCHITECTURE) + карта |
| Living docs | USER (Rules&RAG / Pin AGENTS) · ARCHITECTURE · STATUS · CHANGELOG |
| Scrub | без hype / Furthermore / seamlessly; факты и пути |

## Проверка

```powershell
# файлы на диске
Get-ChildItem -Recurse docs\publish | Select-Object FullName
# banned phrases
rg -i "Furthermore|seamlessly|cutting-edge|It is important|In conclusion|empower" docs\publish docs\TZ.md docs\USER.md
```

## Next / Backlog

- Commit + push на GitHub — вручную после финального scrub (не в этом шаге)
