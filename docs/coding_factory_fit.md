# Coding Factory Fit — Claude-only implementation

Status: **implemented in this repo on 2026-09-19** and VibeAudit is the test bed. Supersedes the earlier orientation note that proposed a bespoke `.agent-factory/` folder.

## Decision

Build the factory from Claude Code primitives, not from a hand-rolled folder of role files and shell scripts. Two reference repos were surveyed (`devjarus/coding-agent`, `obra/superpowers`):

| Repo | What it is | What we take |
|---|---|---|
| coding-agent | Claude-Code-only plugin: native `.claude/agents` subagents, hook-driven state, 18 bash gate checks, formal artifact state machine | The idea of a few deterministic gates enforced by hooks. Three checks, not eighteen. |
| superpowers | 15 portable skills, prompt-template roles, three scripts (workspace, task-brief, review-package) | The inner loop: brainstorm → plan → subagent-driven development → review, with a progress ledger and capped fix rounds. Already installed globally, so it is invoked, not copied. |

The original note was right that VibeAudit should not get a second planning system: `docs/plan.md` is the ledger. It was wrong to propose new `controller.md` / `agents/*.md` / `next.sh` files, because Claude Code already provides subagents, skills, hooks and the Agent tool.

## Rule zero: preflight before anything

Every session starts with `scripts/factory/preflight.sh`. It confirms the toolchain, that every source-of-truth doc is readable and writable by this user, that hooks and subagents are wired, that the required skills are installed, the git state, and that `verify.sh` is green. A `[FAIL]` blocks task work. The SessionStart hook runs the quick variant automatically; the Controller runs the full one.

This exists because the first validation pass found `Roadmap.md` and three docs owned by another user with mode 600, which would have broken step 1 of the loop silently.

### Portability

The loop is Claude-only by decision (see below): it is not meant to run unmodified for any OS user. Skills live under the Claude user's home (`$HOME/.claude/skills`), so another OS user running these scripts will see `[warn] skill ... not installed globally` even when the factory is otherwise healthy for them — that is expected, not a bug. Git is the sharper edge: `.git` is owned by the Claude user, so any other OS user gets "detected dubious ownership" from every git command in these scripts unless they add this repo to their own `safe.directory` list (`git config --global --add safe.directory <toplevel>`, the exact hint `lib.sh`'s `g()` wrapper prints on any git failure). Before this fix, that failure mode was invisible: the scripts treated git's non-zero exit as success, so a second OS user (e.g. codex) would see a blank branch reported `[ok]`, a fake-green verify stamp, and a commit gate that let everything through.

## What is in the repo

| Path | Role |
|---|---|
| `CLAUDE.md` | Controller rules: preflight first, source of truth, the loop, hard rules, model tiering |
| `.claude/settings.json` | Hooks: SessionStart → preflight (quick); PreToolUse on Bash → commit gate |
| `.claude/agents/implementer.md` | Sonnet, one task per fresh context, must run verify before reporting, never spawns subagents |
| `.claude/agents/reviewer.md` | Opus, read-only, returns `## Status: PASS` or `FAIL`, re-runs verify itself |
| `scripts/factory/lib.sh` | Shared `g()` fail-closed git wrapper and `worktree_fingerprint()`; sourced by the other four scripts |
| `scripts/factory/preflight.sh` | Environment and wiring check (see above) |
| `scripts/factory/verify.sh` | Runs `selftest.sh`, then `tsc --noEmit` + `next lint` + `vitest run`; writes `.factory/last-verify.json` (status, head, fingerprint) |
| `scripts/factory/commit-gate.sh` | Blocks `git commit` if git itself fails, a secret-looking file or pattern is staged, or (non-doc commits) the verify stamp's head/fingerprint doesn't match the current tree exactly (doc-only commits exempt) |
| `scripts/factory/selftest.sh` | No-dependency test of the fail-closed behavior above: broken git, wrong-head stamp, wrong-fingerprint stamp, non-commit pass-through |
| `lib/scan/__tests__/engine.test.ts` | First real tests: one fixture per rule, explanation-table sync, clean-input score, ordering, scorer snapshot |
| `vitest.config.mts` | Test runner with the `@/` alias |
| `docs/plan.md` | The ledger. One `Status` line per item; the only place status lives |
| `docs/tasks/` | Per-item plans produced by `/writing-plans` (created on first use) |

Gitignore was changed so `.claude/settings.json` and `.claude/agents/` are tracked while `.claude/settings.local.json` and `.factory/` stay local.

## The operating loop

```text
0. preflight.sh             -> all [ok], or stop and fix
1. Controller picks the lowest Not Started item in docs/plan.md (or the one the user names); sets In Progress
2. /brainstorming            -> short spec; user approval required for billing, auth, tenant isolation, marketing claims
3. /writing-plans            -> docs/tasks/<n>-<slug>.md with checkbox tasks
4. /subagent-driven-development
     implementer subagent per task (fresh context, sonnet)
     reviewer subagent per task (opus) -> PASS | FAIL
     max 3 fix rounds, then ask the user
5. verify.sh green           -> enforced by the commit-gate hook
6. plan.md item -> Done | Needs Verification; tick checklist.md line; commit
```

Non-risky ambiguity is ruled on and recorded in the implementer report. Risky ambiguity stops for the user.

## Validation results (2026-09-19)

- `npm ci` completed; `tsc --noEmit` passes. This closes the "compile-clean unverified" line in `FINDINGS.md` item 12.
- `next lint` passes with zero warnings.
- 13 tests pass. `payment-bypass` is the only rule without a fixture yet and the test suite asserts that so it cannot be forgotten.
- Full preflight is green on branch `dev`.

## Deliberately not adopted

- coding-agent's 15 other checks, its `.mcp.json` (Playwright MCP, Xcode, exa), and its artifact state frontmatter. Add a check only when a failure mode actually appears.
- A `TASK-0001/` artifact tree. superpowers' own `.superpowers/sdd/` workspace already holds briefs, reports, and review packages.
- Any dependency on `/tmp` clones. Nothing in the repo references them.

## First task for the factory

Item 1 in `docs/plan.md` (remove the fabricated testimonial) is small, low-risk, and touches marketing copy, so it exercises the full loop including the user-approval gate. Item 4 (scope repo fetching to the installation) is the first item that needs the reviewer's security focus.

## Learnings log

- **Run 1 (item 1, 2026-09-19):** loop worked end to end: brief → Sonnet implementer → review package → Opus reviewer PASS → verify green → ledger. Caveat: `.claude/agents/*.md` and `.claude/settings.json` hooks are only loaded at session start, so in the session that creates them the Controller must dispatch a general-purpose agent with the role rules inlined and the chosen model. From the next session on, `subagent_type: implementer|reviewer` works directly and the commit gate is live.
- **Run 2 (factory fail-closed fix, 2026-09-19):** triggered by an external codex review that found the gate, verify stamp and preflight all treated git failure as success. The loop earned its keep: the Opus reviewer rejected the first implementation with a real `git commit -a` bypass and a selftest that could truncate the verify stamp, then rejected the fix with a regression that would have made every non-doc commit impossible once the new files were committed. Two fix rounds, then PASS. Lessons: (1) a self-test that only asserts "a deny happened" proves nothing, assert the exact reason; (2) under `pipefail` a `{ ...; }` group's status is its last command, end groups with `true`; (3) the reviewer must reproduce bypasses in a scratch repo, not reason about them.
