# Шаг 38 — Sprint 10: multi-LSP + highlight map ✅

> **Дата:** 2026-08-11 · **Статус:** закрыт

## Сделано

- `languages.ts` — Monaco lang map (cpp/csharp/go/html/…) + DEFAULT_LSP_SERVERS wave1+wave2
- `LspClient` → multi-server **LspRegistry** (lazy spawn per language)
- `monacoLspBridge` — completion, hover, def/refs, rename, format, signature, symbols, codeAction
- Agent tool `lsp_hover`
- `THIRD_PARTY_NOTICES.md` (monaco MIT; Notepad++ не используется)
- USER.md install matrix

## Проверка

```powershell
npx tsc -b
npx vitest run src/services/lsp/languages.test.ts
```

## Закрытие

Sprint 10 **Done**. IDE chrome (Palette / Problems / Outline / Find / Cmd+K) — **Sprint 11** backlog.  
Полировка UX после S10: [39-polish-context-models-icon.md](39-polish-context-models-icon.md).
