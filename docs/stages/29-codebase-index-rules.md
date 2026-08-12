# Шаг 29 — @codebase index + rules (Sprint 4 / Epic I)

**Дата:** 2026-08-11  
**Эпик:** I (TZ-PHASE3)

## Реализовано

### Index pipeline (I1–I5)
- `services/index/chunker.ts` — line-aware chunks (~2000 chars, overlap)
- `collectFiles.ts` — glob + text file filter
- `embeddings.ts` — Ollama nomic-embed-text → OpenAI-compatible fallback → keyword
- `indexService.ts` — build, persist (`llm-shell:codebase-index`), search
- `retrieve.ts` — cosine + keyword hybrid

### UI & integration (I6, I11)
- `@codebase` в `ChatInput` → inject chunks в prompt
- `codebase_search` agent tool
- `indexStore` + reindex on project open + кнопка «Reindex @codebase»
- StatusBar: `idx N` / `index N%`

### Rules (I8)
- `rulesLoader.ts` — `AGENTS.md`, `.cursorrules`, `.cursor/rules/**`
- Inject в system prompt via `{RULES}`

## Тесты

- chunker, retrieve, filePaths (@codebase)
- **82** vitest pass

## Не в scope

- sqlite-vec (JSON persist + TS cosine)
- I9 embeddings upgrade for success RAG
- K1 Apply/Reject (Sprint 5)

## Что дальше

Sprint 5: checkpoints, apply/reject, structured patch
