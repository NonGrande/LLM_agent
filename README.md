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

Working FR registry: [docs/TZ.md](docs/TZ.md). Stakeholder pack: [docs/publish/](docs/publish/).

Map of the publish tree: [docs/publish/README.md](docs/publish/README.md).

## How it was built / Как это писалось

**EN.** Built as a Windows product (Tauri + React), not a VS Code fork. Much of the code and docs was produced in Cursor with agents — sprints, live STATUS/TZ, `tsc`/vitest — plus real debugging when small models skipped tools, huge diffs crashed the UI, or context limits hit. Local open-weight models via Ollama (~7–8B) are supported for offline use but often simulate shell instead of emitting `tool_calls`; Strict tools and the agent action algorithm exist because of that. Cloud OpenAI-compatible profiles (OpenRouter, xAI, Yandex, …) need failover and proxy. Longer RU/EN notes: [docs/publish/ru](docs/publish/ru/README.md#как-это-писалось) · [docs/publish/en](docs/publish/en/README.md#how-it-was-built).

**RU.** Собирали под Windows без встраивания VS Code. Много кода шло через Cursor/агентов и ручную отладку. Локальные open-модели (Ollama, ~7–8B) дешёвые, но часто «рисуют» bash в чате — отсюда Strict tools. Облако — профили OpenAI-совместимых API, failover и proxy. Полный текст: [docs/publish/ru](docs/publish/ru/README.md#как-это-писалось).

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
