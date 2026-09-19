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
2. `/brainstorming` → produce a short spec. Stop and get user approval for anything that touches billing, auth, tenant isolation, or marketing claims. Every task brief must carry a `Lane:` line (see Lanes below).
3. For a `docs/plan.md` item, draft it with `/task-master <item> --lane <lane>` (`skills/task-master/SKILL.md`) — a codegraph-aware draft, with a checkbox task list already in it, lands at `docs/tasks/drafts/P<item>-<slug>.md`. It never implements, approves, or queues anything; it only drafts. For a factory-internal task with no plan item, use `/writing-plans` instead and save under `docs/tasks/<item-number>-<slug>.md` as before.
4. Dispatch by lane (see Lanes below): micro items the controller edits directly, no subagents; standard and high-risk items go through `/subagent-driven-development` — the `implementer` subagent per task, then the `reviewer` subagent, capped fix rounds per lane, then ask the user.
5. Commit with `scripts/factory/ship.sh -m "..."` (or `-F <file>`) in its own command — never a raw `git commit`. `ship.sh` stages (`git add -A`, or only given paths after `--`), runs `verify.sh --if-stale` (a fast skip when the stamp is already fresh, a full run otherwise), calls `gate_check` itself, and only then commits — it is self-gating because its own `git commit` runs inside the script, where the PreToolUse hook never sees it as a separate Bash command. The hook remains the backstop for any raw `git commit` typed directly, and it still fires on any Bash command containing the literal two-word phrase, even inside a heredoc or comment — build that phrase from a variable in ad hoc verification commands, as `selftest.sh` does for its own test payloads.
6. On acceptance: set the item `Done` (or `Needs Verification` if it needs a live environment), tick the matching checklist.md line, commit.
7. Batch runs: the user may name several items; run them back to back and only stop for high-risk decisions that fall outside the brief.

## 3. Lanes
Every task brief carries a `Lane:` line; the controller picks it from the paths the spec will touch. If a brief touches paths from more than one lane, the highest lane wins (high-risk > standard > micro).

- **micro**: only `*.md` files, or non-claim copy in `components/marketing/` only (typos, punctuation, spacing, Tailwind classes), and at most 1 file, no logic changes. Any product claim, metric, testimonial, pricing text, or feature-availability wording is high-risk, never micro. Controller edits directly, no subagents — `ship.sh` still gates the commit. Batch same-shape micro items into one commit.
- **standard**: anything else under `app/`, `components/`, `lib/`, `types/`, `worker/` not matched by high-risk. implementer + reviewer in their standard-lane behaviour (see `.claude/agents/reviewer.md`), targeted `npx vitest run <path>` during work, one `verify.sh --if-stale` before ship.
- **high-risk**: any path under `lib/github/`, `lib/stripe/`, `lib/supabase/`, `middleware.ts`, `supabase/`, `app/api/github/`, `app/api/stripe/`, `app/api/auth/`, `app/api/fix/`, `scripts/factory/`, `.claude/`, `skills/`, `CLAUDE.md`, or any change to auth, billing, tenancy, or marketing claims — including any product claim, metric, testimonial, pricing text, or feature-availability wording. Full loop with reproduction; user approval of the spec once, then no further stops unless a decision falls outside the brief. `skills/` is high-risk because a skill (e.g. `skills/task-master/SKILL.md`) defines canonical behaviour a future runner will trust, the same reason `scripts/factory/` and `.claude/` are high-risk.

## 4. Hard rules
- Never read or print `.env*` files. Never commit secrets. Never call live Stripe or GitHub with real credentials.
- Non-risky ambiguity: rule, record it, continue. Risky ambiguity: ask.
- Model tiering: implementer = sonnet, reviewer = opus, controller = whatever this session runs.
- Verification commands: `npx tsc --noEmit`, `npx next lint`, `npx vitest run`. All three are wrapped by `scripts/factory/verify.sh`.
