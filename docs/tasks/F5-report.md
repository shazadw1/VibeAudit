# F5 report (implementer, high-risk lane, 2026-09-19)

## STATUS: DONE

Every task and acceptance bullet in `docs/tasks/F5-task-master-skill.md` is implemented,
tested, and staged. `scripts/factory/verify.sh --full` is green (selftest 53/53, tsc clean,
lint clean, vitest 13/13). Not committed, per instructions.

## Files changed (staged, `git add -A`)

- `skills/task-master/SKILL.md` (new) — canonical behaviour: invocation, the 10 required
  behaviours, frontmatter contract, the eight sections, runner-eligibility and
  plan-ledger-ownership notes, staleness/unavailable-index handling, lanes.
- `.claude/commands/task-master.md` (new) — Claude adapter: parses `$ARGUMENTS`, points at
  `skills/task-master/SKILL.md`.
- `AGENTS.md` (new) — Codex/other-harness adapter with the required exact sentence
  (`Use repo skill skills/task-master/SKILL.md to draft plan item <n> with lane <lane>`)
  and a pointer to `scripts/factory/task-master.sh`.
- `.gitignore` — one added line, `!.claude/commands/`, in the existing factory block.
- `scripts/factory/codegraph-query.py` (new) — read-only stdlib-only queries (`search`,
  `file`, `symbols`, `related`, `status`) against `.codegraph/codegraph.db`.
- `scripts/factory/task-master.sh` (new) — the deterministic front end.
- `scripts/factory/selftest.sh` — 10 new cases appended (43 → 53), existing 43 unchanged.
- `docs/tasks/{drafts,queued,active,done,blocked,failed}/.gitkeep` (new) — queue skeleton.
- `docs/tasks/drafts/P4-scope-repository-fetching-to-the-github.md` (new) — the worked
  example, script output plus my own LLM-filled sections (see below).
- `docs/coding_factory_fit.md` — file map rows for task-master/codegraph-query.py/queue
  folders, loop step 3, a new "Task-master, the queue folders, and future runner
  eligibility" section, and a Run 5 learnings-log line.
- `CLAUDE.md` — loop step 3 now says plan-item drafts come from `/task-master`; Lanes
  gained `skills/` in the high-risk path list (see Ruling 4 below).

Nothing outside `docs/tasks/F5-report.md` and the allowed-paths list was touched;
`git diff --cached --stat` (below) shows nothing under `app/`, `components/`, `lib/`,
`types/`, `worker/`, `supabase/`.

## Diff stat

```
 .claude/commands/task-master.md                    |   9 +
 .gitignore                                          |   1 +
 AGENTS.md                                           |  20 +
 CLAUDE.md                                           |   4 +-
 docs/coding_factory_fit.md                          |  30 +-
 docs/tasks/active/.gitkeep                          |   0
 docs/tasks/blocked/.gitkeep                         |   0
 docs/tasks/done/.gitkeep                            |   0
 docs/tasks/drafts/.gitkeep                          |   0
 .../P4-scope-repository-fetching-to-the-github.md   | 275 +++++++++++++
 docs/tasks/failed/.gitkeep                          |   0
 docs/tasks/queued/.gitkeep                          |   0
 scripts/factory/codegraph-query.py                  | 440 +++++++++++++++++++++
 scripts/factory/selftest.sh                         | 139 +++++++
 scripts/factory/task-master.sh                      | 336 ++++++++++++++++
 skills/task-master/SKILL.md                         | 187 +++++++++
 16 files changed, 1436 insertions(+), 5 deletions(-)
```

`.gitignore`'s diff is exactly the required line:
```
+!.claude/commands/
```
`git check-ignore -v .claude/commands/task-master.md` exits 1 (no match printed) — confirmed
tracked, not ignored.

## Test summary

- `scripts/factory/selftest.sh` standalone: **53 passed, 0 failed** (43 pre-existing,
  byte-identical, + 10 new: no-lane exit 2, bogus-lane exit 2, item-999 exit 3, the full
  real run against the real `--db` (6 folders + `.gitkeep`, exact frontmatter key order,
  `docs/plan.md` byte-identical, mentions `lib/github/fetch-repo.ts`), no-force exit 4,
  `--force` overwrite, `--lane micro` lane-conflict WARNING, unavailable-db WARNING, and the
  two `codegraph-query.py` contract cases). ~18s standalone.
- `scripts/factory/verify.sh --full`: **VERIFY GREEN** — selftest 53/53, `tsc --noEmit`
  clean, `next lint` zero warnings, `vitest run` 13/13. ~48s.
- Manual, against the real repo (not just the scratch selftest copy): ran
  `scripts/factory/task-master.sh 4 --lane high-risk` for real, inspected the draft, reran
  with `--lane micro --force` to see the lane-conflict warning, reran with `--force` to
  confirm overwrite, then restored the high-risk version with one final
  `--lane high-risk --force` run before filling the LLM sections. `docs/plan.md` was
  byte-identical to the pre-run copy after every run (checked via `sha256sum`).

## The exact command a Codex (or any non-Claude) user runs, and what it produces

```
scripts/factory/task-master.sh 4 --lane high-risk
```
(equivalently, per `AGENTS.md`: "Use repo skill skills/task-master/SKILL.md to draft plan
item 4 with lane high-risk", which tells the assistant to run that same script and then fill
the LLM sections by hand — nothing in the flow is Claude-only.)

This prints the draft path to stdout and exits 0:
```
docs/tasks/drafts/P4-scope-repository-fetching-to-the-github.md
```
with the script-written skeleton fully populated (frontmatter, `## Codegraph Context` with
the `index:/files:/stale:` header, per-term search/related results, "Files in scope",
"Routes", "Likely tests"; the other six sections start as `TBD` for the assistant to fill).
A Claude user gets the identical draft via `/task-master 4 --lane high-risk`, since the
Claude adapter does nothing but parse `$ARGUMENTS` and point at the same
`skills/task-master/SKILL.md`, which itself just tells the assistant to run the same script.

## Draft path and frontmatter (the committed worked example)

`docs/tasks/drafts/P4-scope-repository-fetching-to-the-github.md`:
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
created_at: 2026-09-19T22:33:39Z
runner_eligible: false
---
```
All eight sections are present. The script filled `## Codegraph Context` (mentions, among
others, `lib/github/fetch-repo.ts` + `fetchRepoFiles`, `app/svc/scan/route.ts`, and
`installation_id` and `repos` as query-term headings); I then followed
`skills/task-master/SKILL.md` myself to fill `## Problem`, add an "Additional context"
subsection under `## Codegraph Context` (naming `lib/github/app.ts`'s
`getInstallationOctokit`, the `GITHUB_TOKEN`/`GITHUB_PAT` env read, and the `repos`
ownership lookup at `app/api/scan/start/route.ts:83` — none of which the codegraph schema
indexes as nodes), `## In Scope`/`## Out of Scope` (citing
`docs/implementation_plan.md` §0.1–§0.4 and `docs/checklist.md` "Security Baseline" by
heading), `## Implementation Tasks`, `## Acceptance Criteria`, `## Verification`, and two
open questions under `## Approval Notes`. No line the script wrote was edited or deleted;
`approval: pending` and `status: draft` are untouched; the word "approved" does not appear
anywhere in the file.

## Rulings

1. **task-master.sh parses codegraph-query.py's default tab-separated table output, not
   `--json`.** — No other factory script depends on `jq` (they parse the single-line
   compact-JSON verify stamp with `sed`, not a JSON library), and adding a hard `jq`
   dependency for one new script would be a bigger footprint change than the brief asked
   for. `--json` remains available for any other consumer (and is what the two
   `codegraph-query.py` selftest cases assert against). Cost if wrong: a future task wanting
   richer parsing would need to either add `jq` to `preflight.sh`'s toolchain check or teach
   `task-master.sh` a JSON parser; low cost, easily revisited.
2. **`argparse` real defaults live only on the top-level parser; the subparser copies use
   `default=argparse.SUPPRESS`.** — Found by actually running
   `codegraph-query.py --db /nonexistent search x` (not from reading the code): a shared
   `--db`/`--limit`/`--json` dest on both the main parser and every subparser makes the
   subparser's own parse step silently reset the value back to its default when the flag is
   given before the subcommand name and not repeated after it. This is the standard fix, not
   really a judgment call, but recording it since it changed the parser structure from my
   first draft. Cost if wrong: `--db`/`--limit`/`--json` before the subcommand name would be
   silently ignored — caught by the exact-output selftest case before this ever shipped.
3. **`task-master.sh`'s per-draft staleness reuses `codegraph-query.py status`'s whole-index
   verdict**, rather than re-deriving a result-set-scoped hash compare in bash. The whole-index
   check is a strict superset (never reports "stale: no" when the index actually is stale for
   the files in question) and keeps the staleness/HEAD-time logic in one language instead of
   two. Cost if wrong: a future edge case where only files *outside* the current draft's
   result set are stale would still show `stale: yes` on this draft — a false-positive warning
   a human can dismiss, not a false negative, so the failure direction is the safe one.
4. **Added `skills/` to `CLAUDE.md`'s high-risk path list (and `task-master.sh`'s mirrored
   `HIGH_RISK_PATHS`).** The brief's own `Lane:` line for this work is high-risk specifically
   because it "defines a new artifact type the runner will later trust" — but before this
   change, a `skills/` change wasn't caught by any existing high-risk path prefix
   (`scripts/factory/`, `.claude/`, `CLAUDE.md`). Since the task-master lane-conflict check
   is defined as "compares... against the high-risk path list in `CLAUDE.md`," the two lists
   have to agree or the check would silently miss future skill changes. Cost if wrong: a
   future plan item that only touches `skills/` would be miscategorized as standard/micro by
   this check; low blast radius since the controller still assigns the brief's `Lane:` line by
   hand per `CLAUDE.md` §2 step 2, this check is advisory (a warning, never an override).
5. **The brief's Tests-section bullet "A grep over the whole staged diff proves no file
   outside the allowed paths changed" is a one-time acceptance check for this run, not a new
   permanent `selftest.sh` case** — the allowed-paths list is per-task, not a repo invariant,
   so baking a specific allow-list into `selftest.sh` would make every future task's file set
   fail it. Performed manually instead (`git diff --cached --stat`, matched by hand against
   the brief's Allowed paths list — see "Diff stat" above; 16/16 staged paths matched). Cost
   if wrong: none for this task; if a future brief wants this as a recurring check it would
   need a way to pass the allow-list in, which this brief didn't ask for.
6. **Slug truncation cuts at exactly 40 characters and then trims a trailing hyphen**,
   producing `scope-repository-fetching-to-the-github` rather than the brief's own
   illustrative `...-to-the-github-app` (44 chars, over the limit). The brief itself flags
   its filename example as "(or the slug the script derives)," so this is exactly the
   flexibility it allows for. Cost if wrong: cosmetic only, the draft path is still
   deterministic and unique.
7. **`task-master.sh` calls `g rev-parse HEAD` once, early, purely as a fail-closed git
   sanity check** (satisfying the brief's "sources `scripts/factory/lib.sh` for `g`"
   constraint) rather than using git for path resolution — path resolution uses the same
   `SCRIPT_DIR`/`cd ../..` trick `verify.sh`/`ship.sh` already use, since that has to work
   correctly inside the selftest's scratch copy (which is a real git repo, but a different
   one than the real repo whose `--db` it points at). Cost if wrong: negligible; git health
   is checked once regardless.

## Concerns

- `codegraph-query.py`'s `search`/`related` FTS-vs-LIKE fallback is a heuristic (unsafe-char
  detection, then "FTS found nothing → LIKE"). It behaves correctly for every term item 4's
  plan text actually produces (verified by running it, not just reading it), but a plan item
  whose backticked terms are pure SQL-LIKE-wildcard characters (`%`, `_`) could produce
  surprising matches; not escaped, since the brief didn't ask for it and no current plan item
  exercises it.
- The live `.codegraph/codegraph.db` is re-indexed by a root-owned background watcher outside
  this session's control (confirmed live during this run: file count and `newest_indexed_at`
  changed between two queries seconds apart with no `codegraph init` run by me). This is
  expected per the codegraph MCP tool's own description ("a new index is picked up live, no
  restart") and `codegraph-query.py` never triggers it — but it does mean the worked
  example's exact `index: ...` header value in the committed draft is a snapshot of whatever
  the watcher had indexed at `22:33:39Z`, not a value anyone should expect to reproduce byte-
  for-byte on a rerun.
- `task-master.sh`'s Codegraph Context gather is best-effort from the plan item's own
  backticked terms (plus `related` edge traversal one hop out); for item 4 it did not
  discover `lib/github/app.ts` or the `GITHUB_TOKEN`/`GITHUB_PAT`/`repos`-ownership details on
  its own — I added those under "Additional context" by hand, per `skills/task-master/
  SKILL.md`'s explicit allowance for LLM prose there. This is expected/by-design (drafting is
  the LLM's job; the script's job is only what's mechanically derivable), but worth the
  reviewer knowing so they don't expect the bare script output alone to satisfy the full
  acceptance list for item 4 without the LLM pass.
- `docs/tasks/F5-review.md` does not exist yet — that's the reviewer's artifact, not mine.

## Verify final line

```
VERIFY GREEN
```
(`scripts/factory/verify.sh --full`, selftest 53/53, tsc clean, lint clean, vitest 13/13.)

## Fix round 1

Reviewer returned FAIL (`docs/tasks/F5-review.md`). All four findings closed, allowed paths
only.

**1. Blocking — item-4 acceptance not reproducible for a Codex user.** `skills/task-master/
SKILL.md` gained a new mandatory step 4, "Mandatory follow-up queries," between "read the
planning docs" (old step 3) and "fill the LLM sections" (old step 4, now 5; everything after
renumbered by one): (a) extract every backtick-quoted path/identifier/env var/table name from
the cited `docs/implementation_plan.md` section(s) and `docs/checklist.md` lines, and re-run
`task-master.sh <item> --lane <lane> --force --terms <comma list>` with all of them; (b) run
`codegraph-query.py search <term>` for each term and `codegraph-query.py related <file>` for
each file already in scope, recording anything the script's own output missed under a new
`### Follow-up queries` subsection at the end of `## Codegraph Context`, one line per finding
naming the query that found it; (c) an explicit stop condition — the section must name every
backtick-quoted path from the cited `implementation_plan.md` section(s), or list which ones
the index does not contain. `AGENTS.md` gained a matching three-item numbered list ("Before
filling the LLM sections...") so the Codex path carries the same rule, not just a
cross-reference to it. I then actually followed the new steps myself: deleted the stale draft,
re-ran `task-master.sh 4 --lane high-risk --force --terms fetchRepoFiles,app/api/scan/start/
route.ts,installation_id,app/svc/scan/route.ts,repos,getInstallationOctokit,parseRepoInput,
encodeURIComponent,lib/github/fetch-repo.ts,lib/github/app.ts,GITHUB_TOKEN,GITHUB_PAT,userId,
repo_id`, ran `search`/`related` myself for every term/file to confirm nothing was missed
(nothing was — the `--terms` rerun already surfaced everything queryable), and wrote a
`### Follow-up queries` subsection recording that, plus a table walking every backtick-quoted
span in `implementation_plan.md` §0.1 and its disposition (found / not a codegraph path /
not in the index). The regenerated, committed draft now names `lib/github/app.ts`,
`getInstallationOctokit`, `GITHUB_TOKEN`, `GITHUB_PAT`, `installation_id`, and the `repos`
ownership lookup, each traceable to the query (or, for the two genuinely unindexed items —
the `.from("repos")` call and the env-var read — to an explicit "Additional context" note
explaining why no query can find them). Added a selftest case: in the scratch copy,
`task-master.sh 4 --lane high-risk --terms lib/github/app.ts,getInstallationOctokit,
GITHUB_TOKEN` produces a draft whose Codegraph Context contains `lib/github/app.ts` and
`getInstallationOctokit` (skipped with one line if the real db is absent, per finding 2).

**2. Medium — selftest hard-depends on the real `.codegraph/codegraph.db`.** Added a `skip()`
helper alongside `ok()`/`bad()` in `scripts/factory/selftest.sh` (`[skip] codegraph index
absent: <case name>`, counts toward neither `$pass` nor `$fail`). Guarded every case that
needs `$real_db` (the task-master.sh real-run/no-force/force-overwrite/lane-conflict/`--terms`
chain, and the two `codegraph-query.py` cases against the default db path) behind
`[ -f "$real_db" ]`, each printing its own skip line when absent; the two cases that pass
`--db /nonexistent` on purpose (the unavailable-index warning case and the
`--db /nonexistent search x` contract case) are untouched since they never depend on the real
db existing. The summary line now reads `$pass passed, $fail failed, $skipped skipped` when
`$skipped > 0`, and the original `$pass passed, $fail failed` (byte-identical) when it's 0, so
existing tooling/expectations built on that exact string see no change on a machine that has
the index. Verified the guard logic in isolation (a scratch `real_db=/definitely/not/here`
run correctly prints two skip lines and increments `$skipped`, not `$pass`/`$fail`) since
forcibly removing the real, root-owned `.codegraph/` wasn't an option in this environment.

**3. Low — staged worked example was stale.** The unstaged, hand-edited `22:52:06Z` version
in the worktree (apparently left over from the reviewer's reproduction) was discarded, not
merged forward: the draft was deleted and regenerated from scratch via the new mandatory
process (finding 1), which is a stronger form of "re-stage the regenerated worked example"
than reconciling two hand-written versions would have been. Confirmed exactly one file exists
in `docs/tasks/drafts/` (`ls docs/tasks/drafts/` → the single `P4-...md`), re-staged.

**4. Low — `--db` undocumented; LIKE wildcards unescaped.** `skills/task-master/SKILL.md`
step 2 and `AGENTS.md`'s script-invocation paragraph both now document `--db <path>`
explicitly. In `scripts/factory/codegraph-query.py`, added `_like_escape()` (escapes `\`,
then `%`, then `_`) and applied it everywhere a LIKE pattern is built from user input (the
`search`/`related` node fallback query, and `related`'s `unresolved_refs` lookup), each now
using `LIKE ? ESCAPE '\'`. Added a selftest case: `codegraph-query.py search 'a_b%' --json`
returns valid JSON and rc 0 (guarded behind `$real_db` per finding 2, alongside the existing
`fetchRepoFiles` JSON case).

### Files changed (additional, beyond the initial pass)

- `skills/task-master/SKILL.md` — new mandatory step 4 (follow-up queries), `--db`
  documentation, step renumbering.
- `AGENTS.md` — new three-item numbered list mirroring step 4, `--db` documentation.
- `scripts/factory/codegraph-query.py` — `_like_escape()`, `ESCAPE '\'` on all three LIKE
  queries.
- `scripts/factory/selftest.sh` — `skip()` helper, `$real_db` guards on 6 cases, 2 new cases
  (`--terms` follow-up, `a_b%` no-crash), summary line handles a nonzero skip count.
- `docs/tasks/drafts/P4-scope-repository-fetching-to-the-github.md` — regenerated from
  scratch via the new mandatory process (deleted, `--force --terms <full list>`, manual
  follow-up `search`/`related` calls, `### Follow-up queries` subsection, full LLM
  sections refilled).

### New selftest count

**55 passed, 0 failed** (53 → 55: the `--terms` follow-up case and the `a_b%` no-crash case;
all real-db-dependent cases ran for real in this environment, none skipped, since the real
`.codegraph/codegraph.db` is present here).

### Verify line (fix round 1)

```
VERIFY GREEN
```
(`scripts/factory/verify.sh --full`, selftest 55/55, tsc clean, `next lint` zero warnings,
vitest 13/13, ~60s.)

Staged (`git add -A`), 18 files changed (2048 insertions(+), 9 deletions(-)); scope still
exactly the allowed-paths list (now including `docs/tasks/F5-review.md`, itself an allowed
path). Not committed, per instructions.
