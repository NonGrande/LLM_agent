# LLM Shell

Десктопный agentic-чат (Tauri 2 + React + Rust).  
Статус: [`../docs/STATUS.md`](../docs/STATUS.md) · ТЗ: [`../docs/TZ.md`](../docs/TZ.md) · Журнал: [`../docs/progress.md`](../docs/progress.md)

## Быстрый старт

```powershell
cd llm-shell
npm install
npm run build
npm run dev
```

Полное приложение (нужен **MSVC Build Tools** / `link.exe`):

```powershell
npm run tauri:dev
```

## Документация этапов

| Шаг | Документ |
|-----|----------|
| 8 Frontend infra | [08](../docs/stages/08-frontend-infra.md) |
| 9 UI + stores | [09](../docs/stages/09-ui-stores-mvp.md) |
| 10 Rust IPC | [10](../docs/stages/10-rust-ipc.md) |
| 11 LLM client | [11](../docs/stages/11-llm-client.md) |
| 12 Agentic loop | [12](../docs/stages/12-agentic-loop.md) |
| 13 Advanced UI | [13](../docs/stages/13-advanced-ui.md) |
| 14 Polish / acceptance | [14](../docs/stages/14-polish-acceptance.md) |

## Возможности сейчас

- Chat + agentic loop (tools, confirmations, stop)
- OpenAI-compatible / Ollama streaming
- File tree, Monaco viewer, Diff после правок агента
- Slash: `/help` `/clear` `/model` `/context` `/stop`
- Темы dark/light/system

## Стоп-фактор

Сборка Tauri на этой машине блокируется отсутствием `link.exe` (Visual Studio Build Tools).
