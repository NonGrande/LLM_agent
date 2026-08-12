# Third-party notices (IDE / highlighting)

## monaco-editor (Microsoft)

- License: MIT
- Used for: syntax highlighting, editor UI, language tokenizers (`cpp`, `csharp`, `python`, `rust`, `html`, …)
- Source: https://github.com/microsoft/monaco-editor

## Notepad++ / Lexilla

- **Not vendored.** Notepad++ is GPLv3; Lexilla targets Scintilla (not Monaco).
- We intentionally use monaco-editor highlighters instead.

## Language servers (runtime, user-installed)

Not bundled in the MSI. Typical installs:

| Server | License (typical) |
|--------|-------------------|
| typescript-language-server | Apache-2.0 |
| vscode-langservers-extracted | MIT |
| basedpyright / pyright | MIT |
| rust-analyzer | Apache-2.0 / MIT |
| clangd | Apache-2.0 with LLVM |
| csharp-ls | MIT |
| gopls | BSD-3 |
