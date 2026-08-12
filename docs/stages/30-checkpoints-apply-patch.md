# Шаг 30 — Checkpoints + Apply/Reject + apply_patch (Sprint 5)

**Дата:** 2026-08-11  
**Эпик:** J + K (TZ-PHASE3)

## Реализовано

### J1–J2 — Structured patch
- `fuzzyMatch.ts` — exact, normalized whitespace, fuzzy line-block (≥85%)
- `patchApply.ts` — unified diff hunks + replace mode
- Agent tool **`apply_patch`**
- **`edit_file`** uses fuzzy replace in TS before Rust fallback

### J3–J4 — Checkpoints
- `checkpoints.ts` — snapshot files before agent edits
- `beginCheckpoint` at agent run start
- **Restore checkpoint (N)** in AgentPanel

### K1–K2 — Apply / Reject
- `editQueueStore` — pending edits queue
- **Apply** — keep agent change (dismiss diff)
- **Reject** — `writeFile` revert to old content
- **Apply all / Reject all** for multi-file runs
- `DiffViewer` + `EditorPane` wired

## Тесты

- `fuzzyMatch.test.ts`, `patchApply.test.ts`
- **87/87** vitest pass

## Что дальше

Sprint 6: MCP client, Ask/Agent/Plan modes, terminal panel
