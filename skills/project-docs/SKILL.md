---
name: project-docs
description: >
  Маршрутизатор документации проекта: выбирает project-tracking, stage-report
  или stakeholder-presentation. Use when: документация проекта, docs hub,
  что обновить после фичи, куда писать статус/отчёт/презентацию.
---

# Project Docs (router)

Не дублируй длинные инструкции — активируй нужный skill и следуй ему.

| Запрос пользователя | Skill |
|---------------------|-------|
| статус / Remaining / закрыть спринт / TZ | `project-tracking` |
| отчёт этапа / stages / progress | `stage-report` |
| презентация / слайды / presentation.html | `stakeholder-presentation` |
| всё после крупной вехи | по порядку: stage-report → project-tracking → stakeholder-presentation |

Карта файлов: `docs/STATUS.md` (вход) · каталог skills: `skills/README.md`.
