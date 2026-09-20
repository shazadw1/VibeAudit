---
name: task-master
description: Draft a code-aware task brief from a docs/plan.md item using the .codegraph index. Never implements, approves, or queues tasks — drafting only. Use when asked to draft, scope, or prepare a plan item for the factory loop.
---

# task-master

This is the canonical behaviour for the task-master skill. `.claude/commands/task-master.md`
(Claude) and `AGENTS.md` (Codex/other harnesses) are adapters only — both point here, neither
restates or overrides anything in this file.

## What this skill does, and does not, do

Task-master drafts a task brief for one `docs/plan.md` item, pre-filled with codegraph-derived
context, and writes it to `docs/tasks/drafts/`. That is the entire scope.

- It never edits application code.
- It never sets `approval: approved`. Every draft is written with `approval: pending`, and
  nothing in this workflow may change that. If you are the assistant following this skill,
  do not hand-edit the `approval:` field under any circumstance.
- It never moves a draft into `docs/tasks/queued/`. Queueing a draft is a human action today
  (or a future runner task — not this skill). The queue folders exist (see below) so a human
  or a future runner has somewhere to move a draft to; task-master itself never writes there
  beyond the `.gitkeep` skeleton.
- It never updates `docs/plan.md`. Task-master only drafts; the ledger is a separate
  responsibility (see "Plan ledger ownership" below).
- It never re-indexes `.codegraph/`. Re-indexing is the user's decision. If the index is
  missing, unreadable, or stale, task-master warns and continues with whatever it can read
  (or with an empty Codegraph Context if the index is unreadable) rather than triggering an
  index build itself.

## Invocation

- Claude: `/task-master <item> --lane <lane>`, e.g. `/task-master 4 --lane high-risk`.
- Codex or any other harness: follow this file directly, or run
  `scripts/factory/task-master.sh <item> --lane <lane>` and then fill the LLM sections listed
  below by hand, exactly as the Claude adapter does.
- Either way, the deterministic half of the work — argument validation, folder creation,
  the frontmatter skeleton, every codegraph query, and the staleness/lane-conflict checks —
  is `scripts/factory/task-master.sh` plus `scripts/factory/codegraph-query.py`, not this
  document. This file exists so the same rules produce the same draft regardless of which
  harness or model is doing the drafting; only the LLM prose (Problem, In Scope, Out of
  Scope, Implementation Tasks, Acceptance Criteria, Verification, and any open questions in
  Approval Notes) is written by the assistant, not the script.

## Step by step

1. **A lane is mandatory.** If the user has not given `--lane micro|standard|high-risk`,
   stop and ask which lane — do not guess, and do not run the script without one. (The
   script itself also refuses without a lane, exiting 2 with the message
   `task-master: a lane is required: --lane micro|standard|high-risk`; this instruction is
   for the assistant, which should stop even earlier, before invoking the script at all,
   if the user's request didn't specify a lane.)
2. Run `scripts/factory/task-master.sh <item> --lane <lane>` (add `--force` only if you
   intend to overwrite an existing draft for the same item, `--terms a,b,c` if the plan
   item's own backticked paths/identifiers are not enough to find the right files, and
   `--db <path>` only to point at a `.codegraph/codegraph.db` other than the default
   `.codegraph/codegraph.db` under the repo root — e.g. when running from a scratch copy of
   the repo that has no index of its own, point `--db` at the real one). This:
   - Reads `docs/plan.md`, locates the `### <item>.` heading, and fails (exit 3) if it is
     absent.
   - Creates `docs/tasks/{drafts,queued,active,done,blocked,failed}/` (each with a
     `.gitkeep`) if they don't already exist.
   - Computes the draft path `docs/tasks/drafts/P<item>-<slug>.md` (kebab-case of the plan
     item's heading title, capped at 40 characters) and refuses (exit 4) if it already
     exists, unless `--force`.
   - Extracts query terms from every backtick-quoted path/identifier in the plan item's
     text, plus any `--terms` given, and queries `scripts/factory/codegraph-query.py`
     (`search`, `related`, `symbols`) for each one.
   - Pre-fills the entire `## Codegraph Context` section: an `index: ..., files: ...,
     stale: yes|no` header, per-term search results and related edges/unresolved
     references, an aggregated "Files in scope" list with exported symbols, a "Routes"
     list (files under `app/**/route.ts`), and a "Likely tests" list.
   - Compares the discovered file list against the high-risk path list from `CLAUDE.md`
     and, if the given lane is lower than what the paths imply, writes a
     `WARNING: lane <given> but touched paths match high-risk: <paths>` line into
     `## Approval Notes` — without ever overriding the lane the user chose.
   - Writes `## Approval Notes` warnings for an unavailable or stale codegraph index too.
   - Writes the frontmatter with `approval: pending`, `plan_item: <item>`,
     `plan_status_owner: runner`, `runner_eligible: false`, and prints the draft path.
3. **Read `docs/Roadmap.md`, `docs/FINDINGS.md`, and `docs/checklist.md`** as planning
   inputs for the sections below. If `docs/implementation_plan.md` exists, read it as
   optional supporting context. Cite the files by heading, do not restructure them, and do
   not treat them as a second source of truth for task status (`docs/plan.md` is the only
   place status lives).
4. **Mandatory follow-up queries.** The plan item's own backticked terms are rarely enough —
   step 2's bare script output is a starting point, not the finished section. This step is
   not optional and is not skipped just because step 2's output already looks substantial:
   1. (a) From the `docs/checklist.md` lines the plan item cites and, when present,
      `docs/implementation_plan.md` section(s), extract **every** backtick-quoted path,
      identifier, environment variable, and table name. Re-run
      `scripts/factory/task-master.sh <item> --lane <lane> --force --terms <comma list>`
      with all of them (plus anything from the plan item's own text) as the `--terms` list,
      so the regenerated draft's Codegraph Context reflects the full term set in one
      script-written pass.
   2. (b) For every one of those terms, additionally run
      `scripts/factory/codegraph-query.py search <term>` yourself, and for every file
      already named anywhere in `## Codegraph Context`, run
      `scripts/factory/codegraph-query.py related <file>` yourself. Add a subsection headed
      `### Follow-up queries` at the end of `## Codegraph Context` (after the script's own
      output, never editing it) and record every file or symbol these queries surface that
      the script's own section missed — one line each, naming the exact query that found
      it, e.g. `` - `lib/github/app.ts`, `getInstallationOctokit` — found by `codegraph-query.py search getInstallationOctokit` ``.
   3. (c) Stop condition: `## Codegraph Context` (script output plus `### Follow-up
      queries`) must name every backtick-quoted path from the cited
      `docs/implementation_plan.md` section(s), when that file exists. If the index genuinely does not contain
      one of them (a `search` for it returns nothing, checked via `--json` or by eye), list
      that path under `### Follow-up queries` as "not found in the index" instead of
      silently omitting it. Do not consider this step done while any cited path is simply
      absent with no explanation.
5. **Fill the LLM sections** of the draft the script produced, in place, without touching
   anything the script already wrote (the frontmatter, or any line already present under
   `## Codegraph Context` or `## Approval Notes`):
   - `## Problem` — from the plan item's "What"/"Launch check" text plus the Roadmap/FINDINGS
     context you just read.
   - `## Codegraph Context` — step 4 already added the mandatory `### Follow-up queries`
     subsection; you may add further prose under the script's output too (e.g. naming a
     symbol, env var, or literal string the codegraph schema doesn't capture as a node), but
     never delete or edit a line the script wrote.
   - `## In Scope` / `## Out of Scope` — cite `docs/checklist.md` and any relevant optional
     `docs/implementation_plan.md` items by heading.
   - `## Implementation Tasks` — a checkbox list; name files from `## Codegraph Context` in
     each item.
   - `## Acceptance Criteria` — testable statements.
   - `## Verification` — which `vitest` paths, which manual checks, and
     `scripts/factory/verify.sh`.
   - `## Approval Notes` — add open questions below the script's warnings (if any). Do not
     write the word "approved" anywhere in this section, and do not remove a warning the
     script wrote.
6. Leave `status: draft` and `approval: pending` exactly as the script wrote them. Hand the
   draft to the user (or the controller) for review; approval and queueing are separate,
   human steps this skill does not perform.

## Frontmatter contract

Exact keys, in this order:

```yaml
---
id: P4
title: Scope repository fetching to the GitHub App installation
lane: high-risk
status: draft
approval: pending
plan_item: 4
plan_status_owner: runner
source: docs/plan.md#4
created_at: 2026-09-19T21:40:00Z
runner_eligible: false
---
```

`plan_item` is the `docs/plan.md` item number and `source` is `docs/plan.md#<n>` for every
plan-derived draft. A future `--factory <slug>` mode (not built yet) would instead write
`plan_item: null` and `source: factory` for a purely internal/factory task with no ledger
item. `plan_status_owner` is always `runner`. `runner_eligible` is always written `false` by
the script and is never hand-set to `true` by this skill — see "Runner eligibility" below.

## The eight sections, in order

Every draft has all eight, in this order, each present even if `TBD`:

1. `## Problem` (LLM)
2. `## Codegraph Context` (script pre-fills; LLM may add prose, never delete script output)
3. `## In Scope` (LLM, cites implementation_plan.md/checklist.md by heading)
4. `## Out of Scope` (LLM, same citation rule)
5. `## Implementation Tasks` (LLM, checkbox list naming files from Codegraph Context)
6. `## Acceptance Criteria` (LLM, testable statements)
7. `## Verification` (LLM: vitest paths, manual checks, `scripts/factory/verify.sh`)
8. `## Approval Notes` (script writes lane-conflict/staleness/unavailable warnings; LLM adds
   open questions; nothing here may say "approved")

## Runner eligibility

There is no runner yet. When one exists, it will only ever treat a task as eligible to run
when all three of these hold: `approval: approved`, `status: queued`, and a valid `lane`.
`runner_eligible` is always derived from those three fields at the time a runner (or any
other consumer) reads the draft — it is never a field a human or an LLM sets directly, and
task-master itself always writes it `false` because a freshly drafted task has not been
approved or queued yet.

## Plan ledger ownership

- Task-master drafts tasks only and never touches `docs/plan.md`.
- The future runner/dispatcher close-out step owns `docs/plan.md` updates. It will update the
  ledger only after a queued task is completed, blocked, failed, or marked Needs
  Verification — and never for a task whose `plan_item` is `null` (a factory-internal task
  has no ledger row to update).
- A future stale-ledger check should fail if a task in `docs/tasks/done/` references
  `plan_item: N` but `docs/plan.md` item `N` is not `Done` or `Needs Verification`. That
  check is not built yet; this note exists so the runner task that eventually builds the
  runner inherits the rule.
- Until the runner exists, the controller keeps updating `docs/plan.md` by hand at close-out,
  exactly as today.

## Staleness and an unavailable index

`scripts/factory/codegraph-query.py status` reports whether `.codegraph/codegraph.db` is
stale: any indexed file's `content_hash` differs from the sha256 of that file on disk, or the
newest `indexed_at` predates `HEAD`'s commit time. `task-master.sh` calls this once per run
and writes the verdict into the `## Codegraph Context` header line
(`index: ..., files: ..., stale: yes|no`); if stale, it also adds a warning to
`## Approval Notes`. If the database is missing or cannot be opened, `## Codegraph Context`
is left with no query results at all and `## Approval Notes` gets
`WARNING: codegraph unavailable, context section is empty`. In neither case does task-master
run `codegraph init` or any other indexer — that is always the user's call.

## Lanes

A lane is required on every invocation; there is no default. Valid lanes are `micro`,
`standard`, and `high-risk` (see `CLAUDE.md` "Lanes" for what each means for dispatch). The
lane the user gives is written to the draft frontmatter verbatim and is never overridden by
this skill or by `task-master.sh` — a mismatch between the given lane and the paths the
codegraph context touched is reported as a warning in `## Approval Notes`, not corrected
automatically, because only a human (or the controller) decides whether that mismatch is
real.
