# Шаг 40 — Sprint 11: IDE chrome ✅

> **Дата:** 2026-08-12 · **Статус:** закрыт

## Сделано

| Тема | Суть |
|------|------|
| Command Palette | `Ctrl+Shift+P` · команды layout/terminal/settings |
| Quick Open | `Ctrl+P` · fuzzy go to file |
| Find in Files | `Ctrl+Shift+F` · grep по workspace |
| Problems | LSP diagnostics aggregate · `Ctrl+Shift+M` · bottom panel |
| Outline | documentSymbol tree · bottom panel tab |
| Inline Edit | `Ctrl+K` · LLM replace selection |
| Stores | `ideStore` · `diagnosticsStore` · `layoutStore.bottomPanelHeight` |

## Проверка

```powershell
cd llm-shell
npx tsc -b
npx vitest run   # 135
```

## Hotkeys

| Key | Action |
|-----|--------|
| Ctrl+Shift+P | Command Palette |
| Ctrl+P | Go to File |
| Ctrl+Shift+F | Find in Files |
| Ctrl+Shift+M | Problems panel |
| Ctrl+K | Inline Edit (selection) |
