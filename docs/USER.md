# LLM Shell — User Guide

> Version 0.3.0+ · Windows desktop (Tauri)

## Install

1. Run `LLM Shell_0.3.0_x64_en-US.msi` from `llm-shell/src-tauri/target/release/bundle/msi/` (after `npm run tauri:build`).
2. On SmartScreen warning: «More info» → «Run anyway» (unsigned dev build).

## First launch

1. **⚙ Settings** in the header → pick a module (API, Proxy, Models, …) → add an API profile.
2. **Open…** in «Площадки» → choose your project folder.
3. Type a message in chat; confirm tool actions when prompted.

### Yandex AI Studio

- Base URL: `https://llm.api.cloud.yandex.net/v1`
- Model: `gpt://<folder_id>/yandexgpt/latest` — folder must match your service account.

## Chat

- **Enter** — send · **Shift+Enter** — new line
- **@path** — attach file context (autocomplete after `@`)
- **@docs** — поиск docs/README/USER/AGENTS… → chip с превью; при отправке — блок Docs context
- **@web** — URL → fetch (с proxy) → chip title/snippet; при отправке — блок Web context
- **@codebase** — поиск по индексу проекта
- Drag files onto chat to attach paths; click a file in the tree to attach contents to the next message
- Long code blocks in replies start collapsed — expand in a modal
- **/help** — slash commands

## Editor (preview pane)

- Open files from the tree or by clicking paths in chat
- Edit in Monaco; **Ctrl+S** or **Save •** to write to disk
- `*` on tab = unsaved changes

## Layout

Header **Layout: Split | Chat | Editor** cycles focus:
- **Split** — chat center, editor right
- **Chat** — editor hidden
- **Editor** — editor center, chat on the right

## Settings backup

**⚙ Settings → Appearance → Export / Import** — JSON backup (optionally without API keys).  
**Check updates** — GitHub latest release when `VITE_UPDATE_REPO=owner/repo` is set at build time.

## API health

Startup probe runs quietly — no full-width banner. Header traffic light:

- **✓ (green)** — click to pick an available model for the next request
- **401 / 402 / 403 (yellow)** — click for auth/billing/geo diagnostics
- **✕ (red)** — click for a list of unreachable profiles
- **↻ API** — re-run the probe without expanding a banner
- **☁** — launch Cloudflare One / WARP (VPN) if installed; otherwise opens download page
- **Sync models** — probe `/models` on your profiles (proxy + keys) and write reachable model lists into settings; activates the first working profile

Green models are also available in the chat input selector.

## Agent feedback & memory

На ответах ассистента:

- **👍** — принять и записать в Success RAG  
- **👎** — отклонить  
- **В RAG** — сохранить ответ в Success RAG без «принять»  
- **📌 AGENTS** — дописать правило в `AGENTS.md` площадки (после пина кнопка становится AGENTS ✓)

Пайплайн в system prompt: **Intake → RAG check → Decompose → Tool-first → Execute → Verify**. При обрыве стрима — **handoff** на следующую модель (tools + черновик).

### Rules & RAG

**⚙ Settings → Rules & RAG** (модуль Memory): правка `AGENTS.md`, файлов `.cursor/rules`, списка записей Success RAG для текущей площадки. Нужен открытый workspace в Tauri.

### Strict tools (слабые локальные модели)

**⚙ Settings → Agent → Strict tools** — в режиме Agent ставит `tool_choice: required` и один повтор («MUST emit tool_calls»), если модель ответила текстом без tools. Ask/Plan не трогает. Имеет смысл для Ollama/7B, которые пишут bash/Python в чат вместо tool_calls.

## MCP

**⚙ Settings → MCP** — HTTP and **native stdio** (command/args). Stdio uses a Tauri process pipe (Content-Length JSON-RPC). Preset «Filesystem (native stdio)» needs Node/`npx`.

## Editor (ghost-text / LSP / IDE)

**⚙ Settings → Editor**:
- **Ghost-text** — LLM inline suggestions in Monaco (Tab to accept when shown).
- **LSP** — multi-language IntelliSense (completion, F12, Shift+F12, F2 rename, Shift+Alt+F format, diagnostics). Requires workspace open + language server on PATH.

**IDE hotkeys:**

| Key | Action |
|-----|--------|
| Ctrl+Shift+P | Command Palette |
| Ctrl+P | Go to File |
| Ctrl+Shift+F | Find in Files |
| Ctrl+Shift+M | Problems panel |
| Ctrl+K | Inline Edit (select code first) |

Problems and Outline live in the bottom panel under the editor.

| Language | Install (examples) |
|----------|--------------------|
| TS/JS | `npm i -g typescript typescript-language-server` |
| HTML/CSS/JSON | `npm i -g vscode-langservers-extracted` |
| Python | `npm i -g basedpyright` (or `pyright`) |
| Rust | `rustup component add rust-analyzer` |
| C/C++ | install **clangd** (LLVM) |
| C# | `dotnet tool install -g csharp-ls` |
| Go | `go install golang.org/x/tools/gopls@latest` |

Syntax highlighting uses **monaco-editor** (MIT), not Notepad++. See `llm-shell/THIRD_PARTY_NOTICES.md`.

## Updates

**Appearance → Check updates** tries signed Tauri updater first; falls back to GitHub Releases (`VITE_UPDATE_REPO`). **Install & relaunch** appears when a signed package is available. Release builds need `TAURI_SIGNING_PRIVATE_KEY` (see `keys/README.md`).

## Data location

Settings and chats: `%APPDATA%\com.llmshell.app\llm-shell-persist.json`

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 401 on all models | Check API key in Settings → profile |
| 402 on cloud models | Top up quota or switch profile |
| Yandex 400 | Model URI folder ≠ key folder |
| File tree empty | Use **Open…** in Tauri window (`npm run tauri:dev`) |

See also [TZ.md](TZ.md) (единое ТЗ) and [STATUS.md](STATUS.md) for roadmap.
