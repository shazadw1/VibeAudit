---
description: Draft a code-aware task brief for a docs/plan.md item.
argument-hint: <item> --lane micro|standard|high-risk [--force] [--terms a,b,c]
---

Parse `$ARGUMENTS` as `<item> --lane <lane> [--force] [--terms a,b,c]`. If no `--lane` is
present, stop and ask the user for one rather than guessing.

Then follow `skills/task-master/SKILL.md`.
