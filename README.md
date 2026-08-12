# Publish docs (RU + EN)

Что класть в публичный GitHub / раздачу стейкхолдерам.

| Путь | Язык | Содержание |
|------|------|------------|
| [ru/](ru/) | RU (основной) | обзор, ТЗ, USER, CHANGELOG, архитектура |
| [en/](en/) | EN | тот же набор: README, SPEC, USER, CHANGELOG, ARCHITECTURE |

Живые рабочие файлы проекта (не дублировать сюда при каждой правке кода — синхронизировать при релизе/шаге docs):

- `docs/STATUS.md` — Done / Remaining  
- `docs/TZ.md` — единый реестр FR (источник для `ru/TZ.md` / `en/SPEC.md`)  
- `docs/USER.md` · `docs/ARCHITECTURE.md` · корневой `CHANGELOG.md`  
- `docs/progress.md` · `docs/stages/` — журнал разработки  

Правило: **STATUS + TZ в `docs/` — правда**. Каталог `publish/` — срезанный, читаемый набор без журнала этапов и без внутренних PLAN.

```
docs/publish/
  README.md          ← этот файл
  ru/
    README.md
    TZ.md
    USER.md
    CHANGELOG.md
    ARCHITECTURE.md
  en/
    README.md
    SPEC.md
    USER.md
    CHANGELOG.md
    ARCHITECTURE.md
```
