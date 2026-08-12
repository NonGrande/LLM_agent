# Шаг 33–35 — Sprint 7 / Release 0.3.0

> **Дата:** 2026-08-11  
> **Версия:** **0.3.0**

## Цель

Закрыть Sprint 7: layout toggle, git_commit, parallel tools, export/import, release WF, soft updater, bump 0.3.0.

## Сделано

| ID | Задача | Факт |
|----|--------|------|
| K5 | Layout Split/Chat/Editor | `layoutStore.panelFocus` + header button |
| J12 | Parallel read tools | `parallelTools.ts` + AgentLoop batches |
| J13 | `git_commit` | `git.ts` + tool registry (confirm write) |
| L4 | Export/import settings | Appearance → SettingsDataPanel |
| L2 | Release workflow | `.github/workflows/release.yml` |
| L3 | Update check | GitHub Releases API (`VITE_UPDATE_REPO`) |
| L5–L6 | 0.3.0 + CHANGELOG | manifests + CHANGELOG.md |

## Не в этом шаге (backlog)
- J11 subagent-lite, I9 Success RAG embeddings, MCP stdio, native Tauri updater signing keys, LSP

## Проверка
```powershell
cd llm-shell
npm test
npx tsc -b
npm run tauri:dev
```
