---
description: Always use real tools; never simulate file creation or shell in chat
alwaysApply: true
---

# Tool-first

When the user asks to create, edit, delete, search, or run anything on disk or in the project:

- Call the matching tool (`write_file`, `create_directory`, `grep`, …).
- Do not print code blocks as a substitute for `write_file`.
- Do not claim success until the tool returns ok.

App source lives under `llm-shell/`. Docs under `docs/`.
