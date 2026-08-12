# Шаг 37 — Sprint 9: native MCP pipe · signed updater · ghost-text / LSP

> **Дата:** 2026-08-11  
> **Версия:** 0.3.0 (+ Sprint 9)

## Цель

Закрыть Phase 4 lite: настоящий MCP stdio, signed Tauri updater, ghost-text и минимальный LSP.

## Сделано

| Тема | Факт |
|------|------|
| Process pipe | Rust `piped_spawn` / `piped_write_frame` / `piped_kill` + Content-Length |
| MCP native stdio | `McpStdioClient` через `FramedJsonRpcClient` |
| Signed updater | `tauri-plugin-updater` + pubkey · Install & relaunch · soft GitHub fallback |
| Ghost-text | Monaco `InlineCompletionsProvider` → LLM (Settings → Editor) |
| LSP baseline | `typescript-language-server` (настраиваемо): didOpen/change, diagnostics markers, hover |

## Ключи updater

- Public: `keys/updater.key.pub` (в git) · private: `keys/updater.key` (**не** в git)
- CI: `TAURI_SIGNING_PRIVATE_KEY` (+ optional password)
- Endpoint в `tauri.conf.json` → правьте на свой `latest.json` GitHub release
- `bundle.createUpdaterArtifacts: true`

## Проверка
```powershell
cd llm-shell
npx tsc -b
npm test
cargo test --manifest-path src-tauri/Cargo.toml process_pipe -- --nocapture
npm run tauri:dev
```

## Remaining
- Полноценный monaco-languageclient / completion provider
- Кастомный GitHub owner/repo endpoint без правки conf
- Code signing MSI помимо updater signatures
