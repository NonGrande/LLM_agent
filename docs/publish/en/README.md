# LLM Shell

Desktop agent-first IDE for Windows (Tauri 2 + React). LLM chat, file/shell/git tools, Monaco, MCP — not a VS Code fork.

**Version:** 0.3.0 · **tests:** ~156 vitest · **Cursor-likeness (rough):** ~89–91% — see live [STATUS](../../STATUS.md).

## Run from source

```powershell
cd llm-shell
npm install
npm run tauri:dev
```

MSI build: `npm run tauri:build` → `llm-shell/src-tauri/target/release/bundle/msi/`.

## What ships (facts)

- **Agent:** Ask / Agent / Plan · tool loop · confirm dangerous ops · failover / handoff · Strict tools  
- **Context:** `@file` · `@codebase` · `@docs` · `@web` · drag/click attach · Rules & RAG  
- **IDE:** Monaco · multi-LSP · ghost-text · Palette / Find / Problems / Outline / Cmd+K  
- **Integrations:** MCP HTTP + stdio · Sync models · proxy · Cloudflare One (launch only)

## This pack

| File | Role |
|------|------|
| [SPEC.md](SPEC.md) | Requirements + FR status (EN of TZ) |
| [USER.md](USER.md) | Install, Settings, hotkeys |
| [CHANGELOG.md](CHANGELOG.md) | User-facing recent changes |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack and modules |

Russian primary set: [../ru/](../ru/). Publish map: [../README.md](../README.md).

## How it was built

LLM Shell was built as a working Windows product: Tauri + React, no VS Code embed. A lot of the code and docs came through Cursor and agents — sprint by sprint, with live STATUS/TZ and `tsc` / vitest checks. Manual debugging still mattered: small models broke tool-calling, the UI died on huge diffs, context limits bit; without `tauri:dev` some IPC simply does not run.

Model strategy stayed dual-track. Locally — Ollama and light open-weight models (~7–8B: Qwen, Mistral and similar): fine offline and cheap, but they often paste fake bash/Python into the chat instead of real `tool_calls`. That is why Strict tools, a hard system-prompt pipeline, and tool-argument normalization exist. Online — OpenAI-compatible profiles (OpenRouter, xAI, Yandex, etc.), failover across models/profiles, and a proxy: from some networks (e.g. RU without VPN/proxy) APIs just fail. Success RAG, `@docs`/`@web`, and pinning into AGENTS.md exist so a weak model does not rediscover the same facts every turn.

In short: an engineering stack for the limits of local open models and cloud APIs — not a demo of one flagship model doing everything perfectly.

Data: `%APPDATA%\com.llmshell.app\llm-shell-persist.json`
