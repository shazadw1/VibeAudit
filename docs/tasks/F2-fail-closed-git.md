# Task plan — factory run 2: fail-closed git in factory scripts

Not a plan.md item. Factory infrastructure fix from the 2026-09-19 codex review.

## Spec
All three factory scripts treat git failure as success. Reproduced with `GIT_DIR=/nonexistent`:
- `scripts/factory/commit-gate.sh` prints git usage errors and exits 0 (= allow).
- `scripts/factory/verify.sh` writes `"head":""` and still prints VERIFY GREEN.
- `scripts/factory/preflight.sh` prints `[ok] branch ` (blank) and `[ok] working tree clean`.
Root cause in practice: `.git` is owned by user `claude-code`; any other OS user (codex) gets "dubious ownership" from every git command unless they add this path to their own `safe.directory`.

## Tasks
- [x] T1: Add `scripts/factory/lib.sh` with a `g()` wrapper: runs `git "$@"`, and on non-zero exit prints `factory: git failed: git <args>` plus the hint `git config --global --add safe.directory <toplevel>` to stderr, then returns/exits non-zero. Source it from the other three scripts. `set -o pipefail` in all scripts.
- [x] T2: `preflight.sh`: first git check is `g rev-parse --show-toplevel`; if it fails, `bad` with the safe.directory hint and skip the remaining git checks. Branch and dirty-tree checks use `g`. A blank branch is a `bad`, never an `ok`.
- [x] T3: `verify.sh`: capture `head=$(g rev-parse HEAD)` before running anything; exit 1 with VERIFY RED if empty. Add a `fingerprint` = sha256 of (`git diff HEAD -- . ':!*.md'` + `git ls-files --others --exclude-standard -- . ':!*.md'` with each untracked file's sha256). Write `{"status","head","fingerprint","at"}`. Put the fingerprint computation in `lib.sh` as `worktree_fingerprint` so the gate reuses it.
- [x] T4: `commit-gate.sh`: every git call is checked; any failure → deny with reason `commit gate: git failed (<cmd>); add safe.directory?`. For non-doc commits additionally require: stamp status green, stamp head == current `HEAD`, stamp fingerprint == `worktree_fingerprint`, and `git diff --quiet -- . ':!*.md'` (no unstaged non-doc changes, so staged == verified tree). Each mismatch has its own deny reason.
- [x] T5: Add `scripts/factory/selftest.sh` (bash, no deps): (a) with `GIT_DIR=/nonexistent`, gate on a `git commit` command must output a deny JSON; preflight `--quick` must exit 1 and print a `[FAIL]` for git; (b) with real git, gate on `ls` exits 0 with no output; (c) a green stamp with a wrong head must be denied; (d) a stamp with the right head but wrong fingerprint must be denied. Print PASS/FAIL per case, exit non-zero on any failure. Make `verify.sh` run selftest as its first step.
- [x] T6: Copy `.factory/task-1-report.md` and `.factory/task-1-review.diff` to `docs/tasks/1-report.md` and `docs/tasks/1-review.diff` so run 1 has an auditable trail. Write your own report to `docs/tasks/F2-report.md` (not only `.factory/`).
- [x] T7: `docs/coding_factory_fit.md`: add a "Portability" paragraph under Rule zero: the loop is Claude-only by decision; skills live in the Claude user's home; other OS users need `safe.directory` for git and will see skill warnings. Update the file map for `lib.sh` and `selftest.sh`.
- [x] T8: Run `scripts/factory/verify.sh`; must be green (this now includes selftest).

## Acceptance
- `GIT_DIR=/nonexistent scripts/factory/commit-gate.sh` with a commit command prints a deny JSON.
- `GIT_DIR=/nonexistent scripts/factory/preflight.sh --quick` exits 1.
- `.factory/last-verify.json` has a 40-char head and a 64-char fingerprint.
- `scripts/factory/selftest.sh` passes; `scripts/factory/verify.sh` ends with VERIFY GREEN.
- No changes outside `scripts/factory/`, `docs/tasks/`, `docs/coding_factory_fit.md`.

## Result
Implementer: DONE after 2 fix rounds. Reviewer: FAIL (6 findings incl. `-a` bypass, selftest could truncate stamp), FAIL (regression: fingerprint returned 1 with no untracked files), then PASS. Selftest 9/9, verify green. Accepted 2026-09-19. Trail: F2-report.md, F2-review.md.
