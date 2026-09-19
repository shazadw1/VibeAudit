# F5 — Add repo-local task-master skill for codegraph-aware task drafting

Lane: high-risk (touches `scripts/factory/`, `.claude/`, `CLAUDE.md`, and defines a new artifact type the runner will later trust). Not a plan.md item. Status: brief only, not yet implemented.

## Goal
A task-master skill that lives inside this repo and can be used by both Claude and Codex. It drafts code-aware task briefs from `docs/plan.md` items using the `.codegraph` index, but never implements, approves, or queues tasks. Drafting is the LLM's job; everything that can be deterministic (argument validation, folder creation, frontmatter skeleton, codegraph queries, staleness check) is a script so both harnesses behave identically.

## Environment facts (verified 2026-09-19, design against these)
- `.codegraph/codegraph.db` exists, is SQLite in WAL mode, owned by root with mode 644, readable by this user. `.codegraph/` is gitignored by the repo-wide `.*/` rule, so nothing under it is ever committed.
- Schema: `files(path, content_hash, language, size, modified_at, indexed_at, node_count, errors)` 88 rows; `nodes(id, kind, name, qualified_name, file_path, language, start_line, end_line, signature, docstring, is_exported, is_async, ...)` 561 rows; `edges(id, source, target, kind, metadata, line, col, provenance)` 805 rows; `nodes_fts` is an FTS5 table over `name, qualified_name, docstring, signature`; `unresolved_refs(from_node_id, reference_name, reference_kind, file_path, ...)` 175 rows; `project_metadata(key, value, updated_at)`.
- Open it with `sqlite3.connect("file:...?mode=ro", uri=True)`; if that fails because the `-shm` sidecar is not writable, retry with `?immutable=1`. Never open read-write. Never run `codegraph init` or any indexer; re-indexing is the user's decision, task-master only warns.
- `.claude/commands/` is currently gitignored by `.claude/*`; `.gitignore` needs one `!.claude/commands/` line (allowed path added below).
- No `AGENTS.md` exists yet. superpowers' convention is `AGENTS.md` as the harness-neutral pointer, `CLAUDE.md` for Claude-specific rules; follow that.

## Core design
| Path | Role |
|---|---|
| `skills/task-master/SKILL.md` | Canonical behaviour. Frontmatter `name: task-master`, `description:`. Every rule below lives here; adapters only point at it. |
| `.claude/commands/task-master.md` | Claude adapter: `/task-master <item> --lane <lane>`. Contains only: parse `$ARGUMENTS`, then "follow skills/task-master/SKILL.md". |
| `AGENTS.md` | Codex/other-harness adapter: one section "Drafting tasks" with the exact sentence `Use repo skill skills/task-master/SKILL.md to draft plan item <n> with lane <lane>` and a pointer to `scripts/factory/task-master.sh`. |
| `scripts/factory/task-master.sh` | Deterministic front end: `task-master.sh <item> --lane <lane> [--force]`. Validates, creates queue folders, runs the codegraph queries, writes the draft skeleton with frontmatter and a `Codegraph Context` section pre-filled, prints the draft path. Exit 2 on usage error, 3 on missing plan item, 4 on existing draft without `--force`. Never touches app code. |
| `scripts/factory/codegraph-query.py` | Read-only, Python 3 stdlib `sqlite3` + `argparse` + `json` only. Subcommands below. |

## Invocation
- Claude: `/task-master 4 --lane high-risk`
- Codex: `Use repo skill skills/task-master/SKILL.md to draft plan item 4 with lane high-risk`, or directly `scripts/factory/task-master.sh 4 --lane high-risk` then fill the LLM sections per SKILL.md.

## Lane requirement
- A lane is mandatory. Without `--lane`, the script exits 2 with `task-master: a lane is required: --lane micro|standard|high-risk`, and SKILL.md instructs the assistant to stop and ask the user for one rather than guess.
- Valid lanes: `micro`, `standard`, `high-risk`. Anything else exits 2.
- The selected lane is written to the draft frontmatter as given.
- Lane conflict check: the script compares the codegraph-derived file list against the high-risk path list in `CLAUDE.md` (`lib/github/`, `lib/stripe/`, `lib/supabase/`, `middleware.ts`, `supabase/`, `app/api/github/`, `app/api/stripe/`, `app/api/auth/`, `app/api/fix/`, `scripts/factory/`, `.claude/`, `CLAUDE.md`). If the user's lane is lower than what the paths imply, write a warning line into `Approval Notes` (`WARNING: lane <given> but touched paths match high-risk: <paths>`). Do not override the user's lane.

## Draft output
Path: `docs/tasks/drafts/<id>-<slug>.md` where `id` = `P<item>` (e.g. `P4`) and `slug` = kebab-case of the plan item heading, max 40 chars. If the file exists, refuse (exit 4) unless `--force`.

Frontmatter (YAML, exact keys, this order):
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
For plan-derived tasks `plan_item` is the `docs/plan.md` item number and `source` is `docs/plan.md#<n>`. For factory/internal tasks (a future `--factory <slug>` mode, not required in this run) `plan_item: null` and `source: factory`. `plan_status_owner` is always `runner`.

Sections, in order, each present even if `TBD`:
1. `## Problem` — from the plan item's What/Launch check plus Roadmap/FINDINGS context. LLM.
2. `## Codegraph Context` — pre-filled by the script: relevant files with line ranges, exported symbols, routes (nodes whose `file_path` matches `app/**/route.ts`), likely tests (paths under `__tests__` or `*.test.*` referencing the same symbols), and unresolved references touching the query terms. Header line records `index: <indexed_at max>, files: <n>, stale: yes|no`. LLM may add prose under it but must not delete script output.
3. `## In Scope` / 4. `## Out of Scope` — LLM, must cite implementation_plan.md and checklist.md items by heading.
5. `## Implementation Tasks` — checkbox list, each naming files from Codegraph Context. LLM.
6. `## Acceptance Criteria` — testable statements. LLM.
7. `## Verification` — which vitest paths, which manual checks, and `scripts/factory/verify.sh`. LLM.
8. `## Approval Notes` — script writes the lane-conflict warning and the staleness warning here if any; LLM adds open questions. Nothing here may say approved.

## Required behaviour (SKILL.md must state each)
1. Read `docs/plan.md`, locate `### <n>.` heading; fail if absent.
2. Read `Roadmap.md`, `FINDINGS.md`, `docs/implementation_plan.md`, `docs/checklist.md` as planning inputs; cite them by heading.
3. Query the codegraph via `codegraph-query.py` for files, symbols, routes, and likely tests. Query terms come from the plan item text (backticked paths and identifiers) plus a per-item hint list the script accepts via `--terms a,b,c`.
4. Warn if `.codegraph/codegraph.db` is missing or unreadable (`Approval Notes: WARNING: codegraph unavailable, context section is empty`), or stale. Stale = any `files.content_hash` differs from the sha256 of the file on disk for the files in the result set, or the newest `indexed_at` is older than the commit time of `HEAD`. Report which.
5. Never modify app code. The script's only writes are under `docs/tasks/`.
6. Never set `approval: approved`. The script writes `pending` and SKILL.md forbids editing it.
7. Never move drafts into `docs/tasks/queued/`. Queueing is a human action (or a future runner task, not this one).
8. Create the queue folders `docs/tasks/{drafts,queued,active,done,blocked,failed}/` each with a `.gitkeep`, idempotently.
9. Never update `docs/plan.md`. Task-master drafts only. The selftest asserts `docs/plan.md` is byte-identical before and after a run.
10. Document in SKILL.md and `docs/coding_factory_fit.md` that future runner eligibility requires all of `approval: approved`, `status: queued`, and a valid lane, and that `runner_eligible` is derived, never hand-set to true.

## Plan ledger ownership (amendment 2026-09-19, codex review)
- Task-master drafts tasks only and never touches `docs/plan.md`.
- The future runner/dispatcher close-out step owns `docs/plan.md` updates. It updates the ledger only after a queued task is completed, blocked, failed, or marked Needs Verification, and never for tasks whose `plan_item` is `null`.
- A future stale-ledger check should fail if a task in `docs/tasks/done/` references `plan_item: N` but `docs/plan.md` item N is not `Done` or `Needs Verification`. Not built in this run; state it in SKILL.md and `docs/coding_factory_fit.md` so the runner task inherits it.
- Until the runner exists, the controller keeps updating `docs/plan.md` by hand at close-out, exactly as today.

## codegraph-query.py contract
Read-only; opens the db as described above; exits 1 with a one-line error on stderr if the db is missing or unreadable; `--json` on every subcommand for the script to consume, human table otherwise; `--db <path>` override (default `.codegraph/codegraph.db`); `--limit N` (default 25).
- `search <query>` — FTS5 `MATCH` over `nodes_fts`, falling back to `LIKE` on `name`/`qualified_name`/`file_path` when FTS finds nothing or the query has FTS-unsafe characters. Returns kind, name, file_path, start_line, end_line, is_exported.
- `file <path>` — the `files` row plus every node in it, ordered by start_line.
- `symbols <path>` — exported nodes in the file with signature.
- `related <query-or-path>` — resolve the argument to node ids (path → all nodes in file; otherwise `search`), then return edges in both directions with the peer node's file and name, and `unresolved_refs` rows whose `reference_name` matches. Group by edge `kind`.
- `status` — `project_metadata`, file count, newest `indexed_at`, and the staleness verdict for the whole index (hash compare over all 88 files; fast enough).

## Tests (factory_changed will trigger selftest; add cases to `scripts/factory/selftest.sh`, exact output as always)
- `task-master.sh 4` without a lane → exit 2 with the exact message; no folders or files created.
- `--lane bogus` → exit 2.
- item `999` → exit 3 `task-master: plan item 999 not found in docs/plan.md`.
- `task-master.sh 4 --lane high-risk` in a scratch copy of the repo (copy `docs/plan.md`, point `--db` at the real read-only db) → creates the six folders with `.gitkeep`, writes `docs/tasks/drafts/P4-<slug>.md`, frontmatter keys in the exact order above, `approval: pending`, `plan_item: 4`, `plan_status_owner: runner`, `runner_eligible: false`, `docs/plan.md` byte-identical before and after, Codegraph Context non-empty and mentioning `lib/github/fetch-repo.ts`.
- Second run without `--force` → exit 4; with `--force` overwrites.
- `--lane micro` on item 4 → draft contains the lane-conflict WARNING naming `lib/github/`.
- `codegraph-query.py --db /nonexistent search x` → exit 1, one stderr line, empty stdout.
- `codegraph-query.py search fetchRepoFiles --json` → JSON array with at least one row whose file_path is `lib/github/fetch-repo.ts`.
- A grep over the whole staged diff proves no file outside the allowed paths changed.

## Acceptance
- A Claude user can run `/task-master 4 --lane high-risk` and get a draft at `docs/tasks/drafts/P4-scope-repository-fetching-to-the-github-app.md` (or the slug the script derives) with all eight sections and the frontmatter above.
- A Codex user gets the same draft by following `AGENTS.md` and `skills/task-master/SKILL.md`; nothing required for the flow is Claude-only. Reviewer verifies this by walking the Codex path with only `AGENTS.md`, `SKILL.md`, and the scripts.
- The item-4 draft's Codegraph Context names, at minimum: `lib/github/fetch-repo.ts` and `fetchRepoFiles`, `lib/github/app.ts` and the installation Octokit helper, `app/api/scan/start/route.ts`, `app/svc/scan/route.ts`, the `GITHUB_TOKEN`/`GITHUB_PAT` env usage, `installation_id`, and the `repos` ownership lookup.
- Task-master cannot approve or queue its own draft: the script has no code path that writes `approved` or writes under `queued/`, and SKILL.md forbids it in words.
- Queue folders exist with `.gitkeep` files and are committed.
- No app code is changed (`git diff --cached --stat` shows nothing under `app/`, `components/`, `lib/`, `types/`, `worker/`, `supabase/`).
- `scripts/factory/verify.sh --full` is green (`--full` was added in F4 and forces the factory selftest).
- `docs/coding_factory_fit.md` file map and loop mention task-master and the queue folders; `CLAUDE.md` step 3 says drafts come from `/task-master`.

## Allowed paths
- `skills/task-master/SKILL.md`
- `.claude/commands/task-master.md`
- `.gitignore` (only the `!.claude/commands/` line)
- `AGENTS.md`
- `scripts/factory/codegraph-query.py`
- `scripts/factory/task-master.sh`
- `scripts/factory/selftest.sh` (new cases only)
- `docs/tasks/drafts/.gitkeep`, `docs/tasks/queued/.gitkeep`, `docs/tasks/active/.gitkeep`, `docs/tasks/done/.gitkeep`, `docs/tasks/blocked/.gitkeep`, `docs/tasks/failed/.gitkeep`
- `docs/tasks/drafts/P4-*.md` (the acceptance run's output, committed as the worked example)
- `docs/coding_factory_fit.md`
- `CLAUDE.md`
- `docs/tasks/F5-report.md`, `docs/tasks/F5-review.md`, `docs/tasks/F5-task-master-skill.md`

## Out of scope
- Any runner that consumes `queued/`. Any change to the commit gate, ship.sh, verify.sh, or the hook. Re-indexing codegraph. Implementing plan item 4 itself.
