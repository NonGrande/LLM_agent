# LLM Shell

Agent-first IDE for Windows: Tauri 2 + React. Chat with an LLM that can edit files, run shell/git, use Monaco, and talk to MCP — without embedding VS Code.

**Version:** 0.3.0 · **Tests:** ~156 vitest · **Rough Cursor parity (STATUS):** ~89–91%

## Quick start

```powershell
cd llm-shell
npm install
npm run tauri:dev
```

MSI build: `npm run tauri:build` → `llm-shell/src-tauri/target/release/bundle/msi/`.

## What’s in the box

- **Agent:** Ask / Agent / Plan · tool loop with confirmations · model failover · **Strict tools** for small local models  
- **Context:** `@file` · `@codebase` · `@docs` · `@web` · drag-drop attach · Rules & RAG editor · pin answers into `AGENTS.md`  
- **IDE:** Monaco · multi-LSP · ghost-text · Command Palette / Quick Open / Find / Problems / Outline / Cmd+K  
- **Ops:** MCP (HTTP + stdio) · Sync models · SOCKS/HTTP proxy · Cloudflare One (external)

## Docs (RU / EN)

| | Russian | English |
|--|---------|---------|
| Overview | [docs/publish/ru](docs/publish/ru/README.md) | [docs/publish/en](docs/publish/en/README.md) |
| Spec / TZ | [ru/TZ.md](docs/publish/ru/TZ.md) | [en/SPEC.md](docs/publish/en/SPEC.md) |
| User guide | [ru/USER.md](docs/publish/ru/USER.md) | [en/USER.md](docs/publish/en/USER.md) |
| Changelog | [ru/CHANGELOG.md](docs/publish/ru/CHANGELOG.md) | [en/CHANGELOG.md](docs/publish/en/CHANGELOG.md) |
| Architecture | [ru/ARCHITECTURE.md](docs/publish/ru/ARCHITECTURE.md) | [en/ARCHITECTURE.md](docs/publish/en/ARCHITECTURE.md) |

Working project status (not the publish pack): [docs/STATUS.md](docs/STATUS.md) · full FR registry: [docs/TZ.md](docs/TZ.md).

Map of the publish tree: [docs/publish/README.md](docs/publish/README.md).

## Layout

```
llm-shell/     # app (frontend + Tauri)
docs/          # STATUS, TZ, stages, presentation
docs/publish/  # stakeholder pack RU + EN
skills/        # agent skills
keys/          # updater public key only in git
```

Private updater key stays local (`keys/updater.key` is gitignored).

## Persist

`%APPDATA%\com.llmshell.app\llm-shell-persist.json`
