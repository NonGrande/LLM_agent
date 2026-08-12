# ТЗ: Success RAG + multi-model handoff

**Версия:** 1.1  
**Дата:** 2026-08-11  
**Статус:** handoff + user-accepted RAG + pipeline в prompt · входит в единое [TZ.md](TZ.md) (A-13)

---

## Пайплайн задачи

1. Запрос пользователя  
2. Декомпозиция (внутри модели)  
3. **Success RAG** (workspace/project, hybrid score ≥ 0.18) — если хватает → ответ  
4. Иначе локальный поиск (tools / codebase)  
5. Иначе `fetch_url` (веб по конкретной ссылке)  
6. Выдача результата  
7. Пользователь **👍 / «В RAG»** → запись `source: user_accepted` (пропуск поиска в следующий раз)

## Handoff при обрыве / failover

При idle/error (не user Abort):  
- seal частичный ответ  
- user-сообщение `[Model handoff …]` с goal / tools / files / draft  
- retry на следующей модели/профиле **без** залипания activeProfile  

## Релевантность

- scope: `workspacePath` + optional `projectId`  
- hybrid keyword + embedding  
- порог retrieve **0.18** (слабые совпадения не подмешиваются)  
- prompt: игнорировать loosely related hits  

См. также: `handoff.ts`, `AgentLoop.ts`, `USER.md`.
