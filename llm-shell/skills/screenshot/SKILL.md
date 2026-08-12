---
name: screenshot
description: >
  Capture screen or app UI with take_screenshot.
  Use when: screenshot, скриншот, сними экран, сделай скрин, capture screen, look at the UI, inspect UI.
---

# Screenshot

When the user wants a screenshot or asks you to look at the on-screen UI:

1. Call `take_screenshot` (do **not** invent PowerShell / snipping-tool / ImageMagick shell commands).
2. Use `target: "primary"` (default) for the whole primary monitor.
3. Use `target: "window"` only for the LLM Shell app window.
4. After the tool returns, use the attached image (and/or `path`) to describe what you see.
