# Skills для агента (проект LLM Shell)

Каталог `{workspace}/skills/*/SKILL.md` подхватывается LLM Shell (приоритет над bundled) и совместим с Cursor (`.cursor/skills`).

| Skill | Назначение | Триггеры |
|-------|------------|----------|
| [project-docs](project-docs/SKILL.md) | Роутер: какой skill docs выбрать | документация проекта, docs hub |
| [project-tracking](project-tracking/SKILL.md) | STATUS / TZ / PLAN / DoD | статус, Remaining, закрыть спринт |
| [stage-report](stage-report/SKILL.md) | `docs/stages` + progress | отчёт, шаг журнала |
| [stakeholder-presentation](stakeholder-presentation/SKILL.md) | `presentation.html` | презентация, слайды |
| [skill-finder](skill-finder/SKILL.md) | поиск на skills.sh | найди скилл |

## В чате агента

```
/skills
/skill project-tracking
/skill stage-report
/skill stakeholder-presentation
```

Типичный пайплайн закрытия вехи:

1. `/skill stage-report` → `stages/NN-….md` + progress  
2. `/skill project-tracking` → STATUS + TZ  
3. `/skill stakeholder-presentation` → HTML deck  

Bundled копии для сборки приложения: `llm-shell/skills/<name>/`.
