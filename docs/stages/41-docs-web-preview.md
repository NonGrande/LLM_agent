# Шаг 41 — @docs / @web preview (E-11 / K9) ✅

> **Дата:** 2026-08-12 · **Статус:** закрыт  
> **Связь:** TZ E-11 · I10 / K9

## Сделано

| Тема | Суть |
|------|------|
| Rust `http_get_text` | Proxy-aware GET текста для `@web` (`commands/http.rs`) |
| TS `httpGetText` | Обёртка Tauri + browser fallback |
| `docsWeb.ts` | html→text, parse leftover mentions, searchDocsFiles, fetch/load preview, format prompt blocks |
| `mentionPreviewStore` | Chips docs/web до отправки |
| Picker | Typed items: specials `docs`/`web`/`codebase` + files / docs hits / URL |
| ChatInput | Preview chips · send inline `## Docs context` / `## Web context` · leftover `@docs`/`@web` |
| extractMentionPaths | Исключает `@docs` / `@web` / `@codebase` |

## Проверка

```powershell
cd llm-shell
npx tsc --noEmit
npm test -- --run   # 156
```

## UX

1. `@` → выбрать **docs** / **web** / **codebase** или файл  
2. `@docs` + поиск → chip с snippet; при Send — блок Docs context  
3. `@web https://…` → chip title/snippet; при Send — блок Web context  
4. Без chip: leftover `@web URL` / `@docs path` подтягиваются при Send  

## Next / Backlog

- Richer HTML readability / PDF — Phase 4+
