# Шаг 17. Skills engine + skill-finder (verified sources)

**Статус:** выполнен  
**Дата:** 2026-08-07

## Цель
Cursor-like skills: `SKILL.md` с frontmatter, авто-подбор по запросу, инъекция в system prompt.  
Первый skill — **skill-finder**: поиск skills только из проверенных источников (skills.sh official / audits).

## Где лежат skills

| Путь | Источник |
|------|----------|
| `llm-shell/skills/*/SKILL.md` | bundled (вшиты в приложение через Vite `?raw`) |
| `{workspace}/skills/*/SKILL.md` | workspace (приоритет над bundled) |
| `{workspace}/.cursor/skills/*/SKILL.md` | совместимость с Cursor |

Первый skill:  
- `llm-shell/skills/skill-finder/SKILL.md`  
- `LLM_agent/skills/skill-finder/SKILL.md` (копия для workspace)

## Движок

| Модуль | Роль |
|--------|------|
| `services/skills/parseSkill.ts` | frontmatter `name` / `description` |
| `services/skills/SkillRegistry.ts` | load bundled + FS dirs |
| `services/skills/matchSkills.ts` | `/skill name`, scoring по description, format prompt |
| `AgentLoop` | load → match → inject в `buildSystemPrompt(..., skillsBlock)` |

## UI / команды

- Agent panel: строка **Skills** (активные на текущий ход)  
- `/skills` — каталог  
- `/skill skill-finder` или фразы «найди скилл…» — активирует skill-finder  
- `/help` обновлён  

## skill-finder — логика

1. Official → https://skills.sh/official  
2. Audits → https://skills.sh/audits  
3. Search → https://skills.sh/search?q=…  
4. Tool: `fetch_url` (не выдумывать страницы)  
5. Вердикты SAFE / CAUTION / REJECT  
6. Установка в LLM Shell = копировать в `{workspace}/skills/{name}/`  

## Проверка

1. Перезапустить LLM Shell  
2. `/skills` → виден skill-finder  
3. «Найди скилл для Notion» или `/skill skill-finder`  
4. В Agent panel: Skills = skill-finder  
5. Модель должна звать `fetch_url` на skills.sh  

## Дальше (опционально)
- UI-галерея skills  
- Роли агентов = system + subset tools + default skills  
- Авто-установка skill из SAFE-рекомендации (с confirm)  
