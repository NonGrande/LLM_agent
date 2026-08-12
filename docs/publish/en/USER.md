# LLM Shell — User guide

> 0.3.0 · Windows · live copy: [`docs/USER.md`](../../USER.md)

## Install / run

1. MSI from `npm run tauri:build` under `llm-shell/src-tauri/target/release/bundle/msi/`.  
2. From source: `cd llm-shell` → `npm run tauri:dev`.  
3. Unsigned SmartScreen: More info → Run anyway.

First run: **⚙ Settings** → API module → profile; **Open…** in projects → folder.

### Yandex AI Studio

- Base URL: `https://llm.api.cloud.yandex.net/v1`  
- Model: `gpt://<folder_id>/yandexgpt/latest` — folder must match the key.

## Chat

| Action | How |
|--------|-----|
| Send | Enter (Shift+Enter = newline) |
| File | `@path` or click/drag into chat |
| Docs | `@docs` → chip → Docs context on Send |
| Web | `@web https://…` → fetch (proxy-aware) → Web context |
| Index | `@codebase` |
| Slash | `/help` |

Long reply code blocks start collapsed; expand in a modal.

## Agent modes

Header: **Ask | Agent | Plan**.

- **Ask** — read/search only  
- **Agent** — full tool loop (+ confirms)  
- **Plan** — no tools  

**Settings → Agent → Strict tools** — for weak local models: `tool_choice: required` + one nudge if the model dumps fake shell/Python as text. Does not affect Ask/Plan.

Reply buttons: **👍** / **👎** / **Pin to RAG** / **📌 AGENTS** (appends to workspace `AGENTS.md`).

## Settings modules

| Module | Contents |
|--------|----------|
| API / Proxy / Models / Gen | profiles, keys, SOCKS/HTTP, catalog, temperature |
| Agent | modes, confirm, Strict tools, cwd |
| Rules & RAG | edit AGENTS.md, `.cursor/rules`, Success RAG entries |
| MCP | HTTP and native stdio (Content-Length pipe) |
| Editor | ghost-text, LSP |
| Appearance | theme, Export/Import JSON, Check updates |

**Sync models** in the header probes `/models` and fills the green list for the active ready profile.  
**☁** launches Cloudflare One / WARP if installed.

## Editor / IDE chrome

Ctrl+S saves the Monaco buffer. Tab `*` = dirty.

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+P | Command Palette |
| Ctrl+P | Quick Open |
| Ctrl+Shift+F | Find in Files |
| Ctrl+Shift+M | Problems |
| Ctrl+K | Inline Edit (needs selection) |

Problems / Outline sit in the bottom panel under the editor.

LSP binaries on PATH (examples): `typescript-language-server`, `vscode-langservers-extracted`, `basedpyright`, `rust-analyzer`, `clangd`, `csharp-ls`, `gopls`. Highlighting is Monaco MIT (`llm-shell/THIRD_PARTY_NOTICES.md`).

## Layout

Header **Layout: Split | Chat | Editor** cycles column focus.

## Data

`%APPDATA%\com.llmshell.app\llm-shell-persist.json`

## Common failures

| Symptom | Check |
|---------|--------|
| 401 | API key in Settings → profile |
| 402 | quota / another profile |
| Yandex 400 | URI folder ≠ key folder |
| Empty file tree | Open… inside the Tauri window (`tauri:dev`) |
