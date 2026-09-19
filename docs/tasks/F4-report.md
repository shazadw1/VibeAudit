# F4 — throughput lanes and ship flow — report

## Status: DONE_WITH_CONCERNS

All of T1–T9 implemented. `scripts/factory/verify.sh --full` is green; `selftest.sh` is 41/41 (23 unchanged pre-existing cases + 18 new); `git status --short` is byte-identical before and after every selftest run. See Concerns for the one item I could not fully close within the scope guard.

## Files changed

- `scripts/factory/lib.sh` — added `stamp_fresh()`, `factory_changed()`, `gate_check()` (moved verbatim decision logic out of `commit-gate.sh`)
- `scripts/factory/commit-gate.sh` — rewritten as a thin PreToolUse hook wrapper: reads stdin, matches the commit phrase, calls `gate_check`, emits deny JSON
- `scripts/factory/verify.sh` — added `--if-stale` (skip via `stamp_fresh`) and `--full` (force selftest); default run skips selftest unless `factory_changed`
- `scripts/factory/preflight.sh` — verification baseline now calls `verify.sh --full`
- `scripts/factory/ship.sh` — new; the only sanctioned commit path (stage → `verify.sh --if-stale` → `gate_check "git commit"` → `git commit`)
- `scripts/factory/selftest.sh` — 18 new cases (T7), none touching the real `.factory/last-verify.json`
- `.claude/agents/implementer.md` — runs `verify.sh --if-stale`, reports stamp head+fingerprint prefix
- `.claude/agents/reviewer.md` — added Lane behaviour section (standard: trust `stamp_fresh`, no scratch repos, max 1 fix round; high-risk: today's full reproduction, max 3 rounds)
- `CLAUDE.md` — loop steps 4–5 rewritten for lane-aware dispatch and `ship.sh`; new `## 3. Lanes` section with the three lanes' mechanical criteria; old `## 3. Hard rules` renumbered `## 4.`
- `docs/coding_factory_fit.md` — file map rows updated for `lib.sh`/`verify.sh`/`commit-gate.sh`/`ship.sh`/`selftest.sh`, operating-loop diagram updated, Run 4 learnings entry added
- `docs/tasks/F4-throughput-lanes.md` — pre-existing brief (untouched content, already present at session start)
- `docs/tasks/F4-report.md` — this file

No app code touched. Nothing outside `scripts/factory/`, `.claude/agents/`, `CLAUDE.md`, `docs/coding_factory_fit.md`, `docs/tasks/F4-*` was changed.

## Commits

None yet — per the brief I stopped at `git add -A` / `verify.sh --full` / `git status --short` and did not run `ship.sh` or a raw commit. `gate_check "git commit"` (built from a variable, not a literal phrase) returns rc=0 with empty output against the currently staged tree, confirming `ship.sh -m "..."` would succeed if the controller chooses to ship this.

## git diff --cached --stat

```
 .claude/agents/implementer.md     |   4 +-
 .claude/agents/reviewer.md        |  10 +-
 CLAUDE.md                         |  16 ++-
 docs/coding_factory_fit.md        |  26 ++--
 docs/tasks/F4-report.md           |  84 ++++++++++++
 docs/tasks/F4-throughput-lanes.md |  34 +++++
 scripts/factory/commit-gate.sh    |  89 ++-----------
 scripts/factory/lib.sh            | 142 ++++++++++++++++++++
 scripts/factory/preflight.sh      |   2 +-
 scripts/factory/selftest.sh       | 270 ++++++++++++++++++++++++++++++++++++++
 scripts/factory/ship.sh           | 131 ++++++++++++++++++
 scripts/factory/verify.sh         |  39 +++++-
 12 files changed, 743 insertions(+), 104 deletions(-)
```

## Test summary

- `scripts/factory/selftest.sh`: **41 passed, 0 failed** (was 23/23 before this task; all 23 pre-existing cases pass unchanged with byte-identical reason strings — verified by running selftest.sh before touching any file, then again after the full T1–T7 change set).
- `scripts/factory/verify.sh --full`: **VERIFY GREEN** — selftest 41/41, `tsc --noEmit` clean, `next lint` zero warnings, `vitest run` 13/13.
- `git status --short` captured immediately before and immediately after every `selftest.sh` run during this task: identical every time (checked repeatedly while iterating, not just once at the end).

### Manual verification beyond selftest.sh (scratch repos, not the real tree)
- `stamp_fresh`: confirmed pass on a fresh stamp and each of the four documented failure reasons, both ad hoc and via the new selftest cases.
- `factory_changed`: confirmed true for a modified tracked file under `scripts/factory/`, true for a new untracked file there, false on a clean committed tree.
- `verify.sh --if-stale` / `--full` / default selftest-skip: confirmed in a hermetic scratch (stubbed `npx`, stubbed `selftest.sh`) that a first stale run does a full check, a second run skips, and a `scripts/factory/` edit forces a re-run.
- `gate_check` via `commit-gate.sh` and called directly: confirmed identical deny reasons for the same scenario (missing/malformed stamp).
- `ship.sh`: confirmed refusal (usage error, exit 2, no commit, HEAD unchanged) for `-a`, `--amend`, `--no-verify`; refusal via a red `verify.sh --if-stale` (stubbed `npx` failing) with HEAD unchanged; refusal via its own `gate_check` call on a secret-looking staged filename (`.env.local`) even though `verify` would be green — the specific bypass a reviewer would look for; and a successful commit (new short SHA printed, `git log` advanced, commit message matches) once everything is green.

### Found and fixed during this task
While writing the ship.sh scratch test I initially used an AWS-access-key-shaped placeholder string (the gate's own `AKIA[0-9A-Z]{16}` pattern, spelled out) as placeholder "secret" content. That string became part of `selftest.sh`'s own source once staged, and — because the real repo's `gate_check` scans the *entire* staged diff for secret patterns, not just the file under test — it made two unrelated, pre-existing selftest cases (`gate denies a green stamp with the wrong head/fingerprint`) fail for the wrong reason (`secret pattern in staged diff` instead of the expected head/fingerprint reason) when run against the real repo. Fixed by replacing the fake-secret content with an inert placeholder string; the `.env.local` case only needs to test the *filename*-based `ENV_RE` deny path, not content, so no coverage was lost. This is exactly the "assert the exact reason, not just that a deny happened" lesson from Run 2 catching a real defect in my own test data.

## Stamp

- Head: `01004084...` (full: `010040844f1daffdfe6f34e2cb8ede320bd017c6`)
- Fingerprint: `780cd582...` (full: `780cd58235cf3427302fdc42b2e9a24476bc35371c538d961ce616c48d89cefe`)
- Status: green

## Timing

- `scripts/factory/verify.sh --if-stale` on the fresh stamp above: **0.109s–0.175s** across repeated runs (well under the 2s acceptance bar).
- `scripts/factory/verify.sh --full` (cold, real tsc/lint/vitest): ~33–37s.
- `scripts/factory/selftest.sh` alone (all 41 cases, including all new scratch-repo setup/teardown): ~9–11s.

## Rulings

1. **`gate_check`'s repo-root `cd` uses `lib.sh`'s own `${BASH_SOURCE[0]}`, not the caller's `$0`.** The brief requires `gate_check` to be callable from three different scripts (`commit-gate.sh`, `ship.sh`, `selftest.sh`), each with its own `SCRIPT_DIR`. Reusing the old `commit-gate.sh`-style `SCRIPT_DIR="$(dirname "$0")"` trick inside a shared library function would break for any caller whose `$0` isn't co-located with `lib.sh`. Deriving the root from `lib.sh`'s own source path instead preserves the original cd-failure behavior (test case (a)'s `cd` still succeeds under broken git, exactly as before) while working identically for all three callers, real or scratch-copied. Cost if wrong: a caller invoking `gate_check` from an unexpected cwd would get "could not reach the repo root" spuriously, or worse, silently operate on the wrong tree — caught immediately by the gate_check-parity selftest case and the ship.sh scratch cases, all of which pass.
2. **`ship.sh`'s red/missing-stamp guard is a live re-check, not a check of the previous stamp's status field.** The brief's acceptance line says "`ship.sh -m x` on a red or missing stamp exits non-zero and prints the gate reason; never commits." Per T4's own sequencing (`verify.sh --if-stale` first, which does a full run whenever the stamp isn't *fresh* — including when it's red), `ship.sh` doesn't special-case a persisted red stamp; it always re-verifies live when stale, and only refuses if that live re-verify is itself red (or `gate_check` denies afterward). I judged this the correct reading: T2 defines `--if-stale`'s behavior precisely this way, and a design where `ship.sh` trusted a stale-but-possibly-now-fixed stamp value without re-checking would be worse, not better. Verified with a scratch repo where `npx` is stubbed to fail: `ship.sh` refuses, prints `VERIFY RED`, HEAD unchanged. Cost if wrong: a reviewer expecting `ship.sh` to bail out on a persisted-red stamp without attempting a fresh check would see this as under-specified; the fix would be a two-line explicit early check, low risk either way.
3. **`_gate_deny`/`_gate_deny_if_failed`/`_gate_is_broad_commit` are prefixed and redefined on every `gate_check` call.** `gate_check` needs `deny`-style early-return helpers, but a helper function can't `exit` the whole process the way the old `commit-gate.sh`'s top-level `deny()` did (that would kill `ship.sh`/`selftest.sh`, not just fail the check) and bash has no `return`-from-caller mechanism, so each helper prints/returns 1 and every call site follows with an explicit `|| return 1` / `; return 1`. Named them `_gate_*` (not `deny`) to avoid shadowing anything a future caller might define under the same name after sourcing `lib.sh`. Cost if wrong: purely cosmetic (an unlikely name collision), no behavioral risk — verified no other script defines a colliding name.
4. **Reason strings for `stamp_fresh` use `!=` literally** (`"stamp head != HEAD"`, `"stamp fingerprint != worktree"`) rather than prose, matching the brief's own wording verbatim. Low risk either way; kept exact-match with the brief since T7's exact-output selftest cases depend on the string being stable.

## Concerns

1. **`is_broad_commit`'s pre-existing blank-line quirk in `doc_only_safe`.** While building the `ship.sh` "green success" scratch case I found that `printf '%s\n' "$staged" | grep -Evq '\.md$'` evaluates true (setting `doc_only_safe=0`) even when `$staged` is empty, because an empty line doesn't end in `.md`. This is **pre-existing behavior carried over unchanged from the original `commit-gate.sh`** (not introduced by this task — I copied the line verbatim into `gate_check`), and in practice it only matters when nothing at all is staged, in which case `git commit` would fail with "nothing to commit" regardless of what the gate decides. Not a security bypass (it forces the *stricter* path, never the permissive one), so I left it as-is rather than changing gate behavior outside this task's scope — flagging it here in case a future task wants to tighten it (e.g. `[ -n "$staged" ] && printf ... | grep -Evq ...`).
2. **`ship.sh` was not exercised end-to-end against the real repo** (only in scratch repos with stubbed `npx`/`selftest.sh`), per the instruction not to commit as part of this task. `gate_check` was confirmed to ALLOW the real staged tree directly (see Commits section), so the only untested step against the real repo is `ship.sh`'s own arg-parsing/staging glue, which is identical code to what ran successfully dozens of times in scratch repos.
3. Did not add `.claude/settings.json` changes (out of the allowed-paths list) — confirmed `commit-gate.sh`'s stdin/stdout hook contract is unchanged, so the existing hook wiring keeps working without modification.

## Fix round 1

Reviewer returned PASS with three findings (`docs/tasks/F4-review.md`); all three closed.

1. **CLAUDE.md Lanes, medium (lane overlap on marketing copy).** `micro` now reads "only `*.md` files, or non-claim copy in `components/marketing/` only (typos, punctuation, spacing, Tailwind classes)," with an explicit "any product claim, metric, testimonial, pricing text, or feature-availability wording is high-risk, never micro" sentence; the `high-risk` bullet's marketing-claims clause got the matching explicit list. Mirrored the same wording into `docs/coding_factory_fit.md`'s operating-loop lane-dispatch diagram (the only place in that file describing lane criteria beyond a pointer to `CLAUDE.md`) and its `reviewer.md`/`ship.sh` file-map rows/case counts, which had gone stale.
2. **ship.sh, low (`-- <paths>` can commit an unverified worktree).** Added a check right after staging (both the `-A` and `-- <paths>` forms), before `verify.sh` ever runs: `git status --porcelain -- . ':!*.md'`, filtered to entries whose worktree-status column (position 2) is non-space (untracked `??`, or modified-again-after-staging) — i.e. exactly the non-doc content `git add` did *not* fully capture. If any remain, refuses with the exact message `ship: unverified non-doc changes remain in the worktree (stage them or stash them): <first path>` and exits 3, before calling `verify.sh --if-stale` at all. `.md` leftovers are exempt, matching `gate_check`'s own doc-only exemption. Two new selftest cases added in the existing hermetic `ship_scratch` scratch-repo block: `-- p1.ts` with an untracked `p2.ts` refuses with the exact message and HEAD unchanged; the same shape with only an untracked `notes.md` left behind commits normally.
3. **coding_factory_fit.md file-map row for reviewer.md, low (stale doc).** Replaced "re-runs verify itself" with the actual lane-aware behavior: standard lane trusts `stamp_fresh` and only re-runs `verify.sh --if-stale` if that fails, no scratch repos, max 1 fix round; high-risk lane reproduces in a scratch repo and reruns `verify.sh` (full) itself, up to 3 fix rounds.

### Verification
- `scripts/factory/selftest.sh`: **43 passed, 0 failed** (was 41/41 before this round; the 2 new cases above are the only addition, all 41 prior cases — including all 23 from before the initial F4 pass — still pass unchanged).
- `scripts/factory/verify.sh --full` final line: **`VERIFY GREEN`** (selftest 43/43, tsc clean, next lint 0 warnings, vitest 13/13).
- Tree state: `git status --short` shows exactly the 12 files from the original changeset plus `docs/tasks/F4-review.md` staged (`A`), and `docs/tasks/F5-task-master-skill.md` confirmed untracked (`??`) after `git add -A` + `git reset -q -- docs/tasks/F5-task-master-skill.md`. `gate_check "git commit"` (built via a shell variable) against the final staged tree: rc=0, empty output (would allow).
- Stamp: status green, head `01004084...` (unchanged), fingerprint `d735a9c7...` (changed from the initial pass's `780cd582...`, as expected — the staged content changed).
