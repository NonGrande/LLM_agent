# Шаг 39 — Product polish (после Sprint 10)

> **Дата:** 2026-08-11 · закрытие среза 0.3.0 + Sprint 10

## Сделано

| Тема | Суть |
|------|------|
| Context attach | Клик файла → чат; `contextAttachStore` + inline contents |
| Yandex / message order | `prepareApiMessages` — strip trailing empty streaming assistant |
| Models UX | Green list = active ready profile; Sync models `/models` |
| Cloudflare | `launch_cloudflare_one` + кнопка ☁ (не embed VPN) |
| Skill | `skills/free-llm-models/SKILL.md` |
| Chat UX | Scroll to last; CodeBlock collapsed + modal |
| Icon | `app-icon.png` → `npx tauri icon` → `src-tauri/icons/` |

## Проверка

```powershell
npx tsc -b
npx vitest run   # 128
```

## Связь

Sprint 10 LSP: [38-sprint10-multi-lsp.md](38-sprint10-multi-lsp.md) · единое ТЗ: [TZ.md](../TZ.md)
