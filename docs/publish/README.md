# Publish docs (RU + EN)

What belongs on public GitHub / stakeholder handout.

| Path | Language | Contents |
|------|----------|----------|
| [ru/](ru/) | RU (primary) | overview, TZ, USER, CHANGELOG, architecture |
| [en/](en/) | EN | same set: README, SPEC, USER, CHANGELOG, ARCHITECTURE |

Also public (repo root / `docs/`):

- Root [README.md](../../README.md) — product landing  
- [TZ.md](../TZ.md) · [USER.md](../USER.md) · [ARCHITECTURE.md](../ARCHITECTURE.md)  
- Root [CHANGELOG.md](../../CHANGELOG.md)

**Not published** (local only, gitignored): `docs/stages/`, `progress.md`, `STATUS.md`, `agent_system/`, internal PLAN/TZ archives, `presentation.html`.

Rule: **TZ + publish READMEs** are the public source of truth for requirements and “how it was built”. Sprint kitchen stays offline.

```
docs/publish/
  README.md          ← this file
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
