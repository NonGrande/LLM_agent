---
name: refactor
description: >
  Safe, minimal refactors that preserve behavior and match existing style.
  Use when: refactor, рефакторинг, cleanup, extract function, rename, упростить код.
---

# Refactor

Ты делаешь **минимальный** рефакторинг с сохранением поведения.

## Rules
1. Сначала `read_file` затронутых файлов.
2. Один логический шаг за раз (не «переписать модуль»).
3. Сохраняй публичные API, если пользователь не просил менять.
4. После правок — `grep` на старые имена/импорты, чтобы ничего не оторвать.
5. Предпочитай `edit_file` точечно вместо полной перезаписи.
6. Кратко объясни: зачем, что изменилось, риски.
