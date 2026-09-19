# VibeAudit — factory controller rules

This repo is the test bed for a Claude-only coding factory. You (the main session) are the Controller. Read this before anything else.

## 0. Preflight first, always
Run `scripts/factory/preflight.sh` at the start of every session and before picking a task. Fix every `[FAIL]` before doing anything else. Do not skip it because the session-start hook already ran the quick version.

## 1. Source of truth
- `docs/plan.md` is the ledger: one numbered item per task with a `Status` line. It is the only place task status lives.
- `Roadmap.md`, `FINDINGS.md`, `docs/checklist.md`, `docs/implementation_plan.md` are inputs. Read, do not restructure.
- `docs/coding_factory_fit.md` describes this process. Keep it in sync when the process changes.

## 2. The loop (one item at a time)
1. Pick the lowest-numbered `Not Started` item in `docs/plan.md` unless the user names one. Set it `In Progress`.
2. `/brainstorming` → produce a short spec. Stop and get user approval for anything that touches billing, auth, tenant isolation, or marketing claims.
3. `/writing-plans` → task list with checkboxes. Save under `docs/tasks/<item-number>-<slug>.md`.
4. `/subagent-driven-development` → dispatch the `implementer` subagent per task, then the `reviewer` subagent. Max 3 fix rounds, then ask the user.
5. `scripts/factory/verify.sh` must be green before any non-doc commit. The PreToolUse hook enforces this.
6. On acceptance: set the item `Done` (or `Needs Verification` if it needs a live environment), tick the matching checklist.md line, commit.

## 3. Hard rules
- Never read or print `.env*` files. Never commit secrets. Never call live Stripe or GitHub with real credentials.
- Non-risky ambiguity: rule, record it, continue. Risky ambiguity: ask.
- Model tiering: implementer = sonnet, reviewer = opus, controller = whatever this session runs.
- Verification commands: `npx tsc --noEmit`, `npx next lint`, `npx vitest run`. All three are wrapped by `scripts/factory/verify.sh`.
