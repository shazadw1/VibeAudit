# Task plan — factory run 4: throughput lanes and ship flow

Lane: high-risk (touches scripts/factory and CLAUDE.md). Not a plan.md item.

## Scope guard
Faster supervised automation, not removal of the safety model. Keep: the hook, the stamp file and its shape, validate_stamp, ensure_factory_dir, reproduction for high-risk work, Opus reviewer. Allowed paths: `scripts/factory/`, `.claude/agents/`, `CLAUDE.md`, `docs/coding_factory_fit.md`, `docs/tasks/F4-*`. No app code.

## Spec
Measured this session: verify.sh is ~30s; the time goes to (a) verify being run three times per task (implementer, reviewer, controller), (b) reviewers building scratch repos for every task, (c) sequential fix rounds, (d) the stage / verify / commit three-step forced by the hook evaluating the whole command up front. Fix by adding lanes, making verification stamp-aware, and adding a self-gating ship script.

## Tasks
- [x] T1: `lib.sh`: add `stamp_fresh [path]`: returns 0 only if `validate_stamp` passes, `status` is `green`, `head` equals current `g rev-parse HEAD`, and `fingerprint` equals `worktree_fingerprint`. Prints the first failing reason to stderr (`stamp missing/malformed`, `stamp not green`, `stamp head != HEAD`, `stamp fingerprint != worktree`). Also add `factory_changed`: returns 0 if any path under `scripts/factory/` is in `git diff HEAD --name-only` or in untracked files.
- [x] T2: `verify.sh` flags: `--if-stale` exits 0 immediately with `VERIFY SKIPPED (stamp fresh)` when `stamp_fresh` passes; `--full` forces selftest. Without `--full`, run selftest only when `factory_changed`. Print `== selftest (skipped: factory unchanged)` when skipped. `preflight.sh` calls `verify.sh --full` so selftest still runs once per session.
- [x] T3: Move the gate's decision logic out of `commit-gate.sh` into `lib.sh` as `gate_check <command-string>`: returns 0 = allow, non-zero = deny with the exact reason on stdout (the same reason strings as today). `commit-gate.sh` becomes a thin hook wrapper: read stdin, extract the command, call `gate_check`, emit the deny JSON on non-zero. All existing selftest cases must still pass unchanged.
- [x] T4: New `scripts/factory/ship.sh`: usage `ship.sh -m "<msg>"` or `ship.sh -F <file>`; optional `-- <paths>` to stage instead of `git add -A`. Sequence: `ensure_factory_dir`; stage; `verify.sh --if-stale` (abort with its output if red); `gate_check "git commit"` (abort printing the deny reason if non-zero); `g commit -F/-m`; print the new short SHA. Never accept `-a`, `--amend`, `--no-verify`, or a raw passthrough. Exit non-zero on any step failure. This script is the only sanctioned way to commit; the hook remains the backstop for raw `git commit`.
- [x] T5: `.claude/agents/implementer.md`: run `scripts/factory/verify.sh --if-stale` before reporting, and report the stamp's head+fingerprint prefix so the reviewer can check freshness. `.claude/agents/reviewer.md`: add lane behaviour: standard lane = read the diff, run `stamp_fresh` and rerun verify only if it fails, no scratch repos, max 1 fix round before returning a decision to the controller; high-risk lane = today's behaviour (reproduce, rerun verify, up to 3 rounds). The brief's `Lane:` line is the source of truth.
- [x] T6: `CLAUDE.md`: replace section 2 step 4–5 and add a "Lanes" section with mechanical criteria:
  - micro: only `*.md`, marketing copy in `components/marketing/`, or Tailwind class changes, ≤ 1 file, no logic. Controller edits directly, no subagents, `ship.sh` still gates. Batch same-shape micro items into one commit.
  - standard: anything else under `app/`, `components/`, `lib/`, `types/`, `worker/` not matched by high-risk. implementer + reviewer (standard behaviour), targeted `npx vitest run <path>` during work, one `verify.sh --if-stale` before ship.
  - high-risk: any path under `lib/github/`, `lib/stripe/`, `lib/supabase/`, `middleware.ts`, `supabase/`, `app/api/github/`, `app/api/stripe/`, `app/api/auth/`, `app/api/fix/`, `scripts/factory/`, `.claude/`, `CLAUDE.md`, or any change to auth, billing, tenancy, or marketing claims. Full loop with reproduction; user approval of the spec once, then no stops unless a decision falls outside the brief.
  - Every task brief must carry a `Lane:` line; the controller picks the lane from the paths the spec will touch, highest lane wins.
  - Commit step becomes: `scripts/factory/ship.sh -m "..."` (or `-F`). Note that the hook still fires if the literal commit phrase appears in the shell command.
  - Batch runs: the user may name several items; the controller runs them back to back and only stops for high-risk decisions outside the brief.
- [x] T7: `selftest.sh`: add exact-output cases: `stamp_fresh` passes on a fresh stamp and fails with each of the four reasons; `verify.sh --if-stale` in a hermetic scratch (same pattern as the existing scratch-verify case) prints `VERIFY SKIPPED (stamp fresh)` when fresh and runs when the tree changed; selftest skip line appears when `scripts/factory` is unchanged and is absent when it is; `gate_check` returns the same reasons as before through the wrapper (one case through the hook wrapper, one direct); `ship.sh` in a scratch repo refuses with the gate reason when the stamp is red, refuses `-a`/`--amend`/`--no-verify` with a usage error, and commits (new SHA printed, `git log` advanced) when everything is green.
- [x] T8: Docs: update the file map, the loop, and add a run-4 learnings line in `docs/coding_factory_fit.md`. Write `docs/tasks/F4-report.md`.
- [x] T9: Stage, `scripts/factory/verify.sh --full`, must be green.

## Acceptance
- `scripts/factory/verify.sh --if-stale` twice in a row: second run prints `VERIFY SKIPPED (stamp fresh)` in under 2s.
- `scripts/factory/verify.sh` with no factory change prints the selftest-skipped line; with a factory change runs selftest.
- `scripts/factory/ship.sh -m x` on a red or missing stamp exits non-zero and prints the gate reason; never commits.
- All prior selftest cases pass unchanged; new cases added; total ≥ 32; tree byte-identical before and after.
- CLAUDE.md has the Lanes section and every path list above.
- Nothing outside the allowed paths changed.

## Result
Implementer (native subagent): DONE_WITH_CONCERNS, then one fix round. Reviewer (native subagent, high-risk lane): PASS with three findings (marketing-copy lane overlap, `ship.sh -- <paths>` leaving unverified files, stale doc row), all closed, re-review PASS. Selftest 23 → 43, `verify.sh --if-stale` on a fresh stamp 0.2s. Accepted 2026-09-19. Shipped with `scripts/factory/ship.sh` as its own live test.
