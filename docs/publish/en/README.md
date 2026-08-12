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

Data: `%APPDATA%\com.llmshell.app\llm-shell-persist.json`
