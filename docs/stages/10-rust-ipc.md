# Шаг 10. Rust IPC: FS / search / shell / system + plugins

**Статус:** выполнен (код готов; локальная компиляция требует MSVC Build Tools)  
**Дата:** 2026-08-07  
**Связь с ТЗ:** §3.3 Backend, §7 IPC API, Этап 1

## Цель
Реализовать Tauri-команды из контракта ТЗ и зарегистрировать плагины fs/shell/store/dialog.

## Cargo-зависимости (`src-tauri/Cargo.toml`)

| Crate | Зачем |
|-------|-------|
| `tauri` 2.x | Desktop runtime |
| `tauri-plugin-fs/shell/store/dialog/log` | Плагины |
| `serde` / `serde_json` | IPC сериализация |
| `glob`, `regex`, `walkdir` | search |
| `reqwest`, `tokio` | задел под proxy (Этап 2) |
| `dirs`, `uuid`, `chrono` | утилиты / сессии |

## Модули Rust

```
src-tauri/src/
├── lib.rs              # Builder + plugins + generate_handler!
├── commands/
│   ├── fs.rs           # read/write/edit/list/create/delete/move/file_info
│   ├── search.rs       # glob_search, grep_search
│   ├── shell.rs        # execute_command (+ stub streaming/kill)
│   └── system.rs       # get_system_info, open_folder
├── models/mod.rs       # DTO (FileContent, DirEntry, …)
└── utils/
    ├── path.rs         # resolve_path (absolute / cwd-relative)
    └── security.rs     # block sensitive system paths (heuristics)
```

## Команды IPC

| Команда | Вход | Выход | Логика |
|---------|------|-------|--------|
| `read_file` | `path` | `FileContent` | UTF-8 / binary flag; max 10 MiB |
| `write_file` | `path`, `content` | `()` | create parents + write |
| `edit_file` | `path`, `old`, `new`, `replace_all?` | `EditResult` | unique match unless replace_all |
| `list_directory` | `path` | `Vec<DirEntry>` | name, path, is_dir, size, modified |
| `create_directory` | `path` | `()` | `create_dir_all` |
| `delete_path` | `path` | `()` | file or `remove_dir_all` |
| `move_path` | `from`, `to` | `()` | `rename` |
| `file_info` | `path` | `FileInfo` | metadata |
| `glob_search` | `pattern`, `path?`, `exclude?` | `Vec<String>` | walkdir + glob, max 1000 |
| `grep_search` | `pattern`, `path?`, `include?`, `ci?` | `Vec<GrepMatch>` | regex line scan, max 500 |
| `execute_command` | `command`, `cwd?`, `timeout?`, `env?` | `CommandResult` | Windows: `cmd /C`; Unix: `sh -c` |
| `execute_command_streaming` | … | `pid` | **MVP stub** (blocking under the hood) |
| `kill_process` | `pid` | error | **не реализован** в MVP |
| `get_system_info` | — | `SystemInfo` | OS/arch/hostname/cpu/shell |
| `open_folder` | `path` | `()` | explorer / open / xdg-open |

## Переменные окружения (используются backend)

| Переменная | Где | Смысл |
|------------|-----|-------|
| `COMPUTERNAME` / `HOSTNAME` | `get_system_info` | hostname |
| `COMSPEC` | Windows shell default | обычно `cmd.exe` |
| `SHELL` | Unix shell default | `/bin/sh` fallback |

`timeout_ms` в `execute_command` пока принимается, но **ещё не enforce** (нужен async kill — следующий этап).

## Capabilities (`capabilities/default.json`)

Разрешения: `core:*`, `fs:*` + scope `**`, `shell:*`, `store:default`, `dialog:allow-open/save`.

## TS-обёртки
`src/services/tauri/{fs,shell,search,events}.ts` — тонкие `invoke(...)` / `listen(...)`.

## Известный блокер среды (Windows)

```
error: linker `link.exe` not found
```

Нужны **Visual Studio Build Tools** с workload «Desktop development with C++» (MSVC + Windows SDK).  
Без этого `cargo check` / `npm run tauri:dev` не соберутся. Frontend (`npm run build` / `npm run dev`) работает независимо.

Установка (пример):
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```
После установки — новый терминал и повтор `npm run tauri:dev`.

## Проверка (после MSVC)
```powershell
cd llm-shell\src-tauri
cargo check
cd ..
npm run tauri:dev
# Open… → выбрать папку → дерево файлов заполняется
```

## Артефакты
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands/*`
- `src-tauri/src/models/mod.rs`
- `src-tauri/src/utils/*`
- `src-tauri/capabilities/default.json`
- `src-tauri/tauri.conf.json` (`identifier: com.llmshell.app`, окно 1400×900)
