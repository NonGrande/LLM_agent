# Changelog

All notable changes to LLM Shell are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- `@docs` / `@web` mention previews (chips + Docs/Web context on send); Rust `http_get_text` (proxy-aware).
- Sprint 11 IDE chrome: Command Palette (`Ctrl+Shift+P`), Quick Open (`Ctrl+P`), Find in Files, Problems/Outline panels, Inline Edit (`Ctrl+K`).
- Agent action algorithm in system prompt + Strict tools nudge-retry for weak local models (A-19).
- Signed updater (`tauri-plugin-updater` + pubkey); Install & relaunch; GitHub soft check fallback (Sprint 9).
- Editor: LLM ghost-text and LSP baseline → multi-LSP registry (TS/HTML/CSS/JSON/Python/Rust/C++/C#/Go) + Monaco bridge; agent tool `lsp_hover` (Sprint 9–10).
- Context attach: click/drag files into chat with inline contents.
- Sync models (`/models` probe → profile model lists); Cloudflare One launch button (☁).
- Collapsible chat CodeBlocks with modal expand; app icon via Tauri icons.
- Skill `free-llm-models`.

### Fixed
- Trailing empty streaming assistant stripped before API send (Yandex message-order 400).
- Model picker lists only the active ready profile’s green models.

### Changed
- Docs: [TZ.md](docs/TZ.md) v4.1; bilingual publish pack [`docs/publish/`](docs/publish/) (RU/EN); Phase 2/3 TZ archived as redirects; honest “How it was built” notes in root + publish READMEs.

## [0.3.0] - 2026-08-11

### Added
- Layout focus toggle: Split → Chat → Editor (K5).
- Agent tool `git_commit` (with confirmation) (J13).
- Parallel execution of consecutive read-only tools (J12).
- Settings export/import JSON (+ optional strip secrets) (L4).
- Soft update check via GitHub Releases (`VITE_UPDATE_REPO`) (L3 lite).
- GitHub Actions release workflow (tag `v*` → draft MSI/NSIS) (L2).
- Compact API traffic light (green = model pick; yellow = 401/402/403; red = fail list).
- Modular settings launcher (one module per modal).
- Dev process guard (`npm run tauri:dev`) frees port 5173 on start/exit.
- Subagent-lite tool `run_subagent` (explore/edit/review, depth ≤1) (J11).
- Success RAG hybrid retrieve (embeddings + keyword, optional `projectId`) (I9).
- ToolCallView v2 status/timing; message 👍/👎 and Pin → success memory (K6–K8).
- MCP HTTP + stdio transport UI (native pipe completed in Unreleased / Sprint 9).

### Changed
- Semver **0.3.0** across package / Cargo / tauri.conf / APP_VERSION.
- Startup API health no longer expands a full banner.

## [0.2.0] - 2026-08-11

### Added
- Projects / площадки: multiple workspaces with per-project chat history.
- Semver 0.2.0 across manifests; root `.gitignore`.
- Windows MSI and NSIS installers.
- Success RAG (keyword) from completed agent tasks.
- Editable Monaco preview with dirty indicator and Ctrl+S save.
- Agent tools `git_status` and `git_diff` (read-only).
- `@file` mentions; clickable paths; CI; wizard; profile per project.
- `@codebase` index, rules, `apply_patch`, checkpoints, Ask/Agent/Plan, MCP HTTP, xterm.

### Changed
- Cursor-like three-column layout with project list in sidebar.

## [0.1.0] - prior

- Initial agentic loop, multi-API profiles, skills, health checks, Tauri desktop shell.
