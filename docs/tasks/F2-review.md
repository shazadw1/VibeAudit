## Status: FAIL

Verified myself: `scripts/factory/verify.sh` → **`VERIFY GREEN`**, exit 0 (selftest 5/5, tsc, lint, vitest 13/13). Stamp has a 40-char head + 64-char fingerprint. `selftest.sh` leaves `git status --short` byte-identical to before. T1–T8 are all implemented; T6 copies are byte-identical; `deny()` never runs inside `$(...)`; no `set -e`, so `pipefail`/`set -u` cannot abort non-zero (which would be a non-blocking hook error, not a deny). Two real bypasses block PASS.

1. **Critical — `git commit -a` and `git commit -- <path>` bypass the gate entirely** (`scripts/factory/commit-gate.sh:32`). Doc/non-doc is decided from the index alone. Reproduced in a scratch repo: stage only `README.md`, modify tracked `lib/a.ts` in the worktree, feed `git commit -a -m x` → gate exits 0 with no output (ALLOW) and the unverified `.ts` is committed. Same for `git commit -m x -- lib/a.ts`. The secret scan is bypassed too: an `AKIA…` key in that unstaged file was allowed; staged, it denies. Fix: take the strict path unless (every staged path ends `.md`) **and** the command has no `-a/--all/-i/--include/-p/--patch` and no pathspec **and** `git diff --quiet -- . ':!*.md'` is clean.

2. **High — selftest can destroy the stamp and still print PASS** (`selftest.sh:48-51,39-45`). If `cp` of the stamp fails, `stamp_backup` is still a (empty) mktemp file, so `cleanup` `mv`s it over `.factory/last-verify.json`. Observed live: stamp truncated to 0 bytes while selftest reported 5/5. Fix: `cp … || exit 1`, and restore only if `[ -s "$stamp_backup" ]`; check the fake-stamp writes succeeded.

3. **High — cases (b)(c)(d) assert only "a deny happened"** (`selftest.sh:17,63,67`), so the exact regression the report says it fixed (right deny, wrong reason) passes. Case (b) also writes a fixed `/tmp/factory-selftest-preflight.log`; here it is owned by user `codex` (0664), the write failed, and the grep matched the **stale** log — a false pass. Fix: `mktemp` for the log; grep each case's specific deny reason.

4. **Medium — `worktree_fingerprint` uses raw `git`, unchecked** (`lib.sh:22-29`). Broken git yields `e3b0c442…` (empty-input sha, confirmed). verify.sh and the gate degrade identically, so a diff-only git failure makes the check pass vacuously. Use `g` and fail closed on non-zero.

5. **Medium — `preflight.sh:41`** uses raw `git check-ignore`; with `GIT_DIR=/nonexistent` it prints `[ok] .claude tracked` — the same fail-open F2 exists to remove. Use `g`, `bad` on rc>1.

6. **Low — `commit-gate.sh:10`**: `cd … || exit 0` allows when the repo root is unreachable; should deny.

Note (not a fail): the `"git commit"` substring match also **under**-matches — `git  commit` (two spaces) and `git -C . commit` both evade the gate (confirmed). Cleaner: `grep -Eq '(^|[;&|] *)git( +-[^ ]+)* +commit\b'`.

---

## Re-review (round 1)

## Status: FAIL

Findings 1-6 and the regex note are all closed, verified by reproduction. One **new blocking regression** came in with the finding-4 fix.

**Blocker — `worktree_fingerprint` returns 1 whenever there are no untracked non-doc files** (`scripts/factory/lib.sh:28-33`). Under `set -o pipefail` (all four scripts) the `{...}` group's status is the `while` loop's last body status; with an empty `ls_out` the single iteration runs `[ -n "" ] && {...}` → 1, so the pipeline returns 1 even though the hash printed fine. Reproduced with this exact `lib.sh`: no untracked non-doc file → `rc=1`; `touch x.ts` → `rc=0`. Consequences: `verify.sh:28-32` sets `fingerprint=""` and forces **VERIFY RED** forever, and `commit-gate.sh:78` denies every non-doc commit with "could not compute worktree fingerprint". It is masked today only because `lib.sh`, `selftest.sh` and `1-review.diff` are still untracked — i.e. it breaks the moment this task's own commit lands. Fix: make the group's status deterministic, e.g. `[ -n "$f" ] || continue` in the loop and a bare `true` as the group's last command; add a selftest case asserting `worktree_fingerprint` returns 0 with no untracked files.

Verified closed (scratch repo): `git commit -a`, `git commit -m x -- lib/a.ts`, `git commit -m x lib/a.ts` (no `--`), `git commit -am x` → all denied; unstaged `AKIA…` + `-a` → "secret pattern in unstaged diff"; wrong head, wrong fingerprint, broken git → exact expected reasons; correct stamp + staged `.ts` → allow; clean doc-only → allow. Preflight now prints `[FAIL] … gitignore check skipped` under broken git (was `[ok]`). `cd` failure now denies. Selftest backup is `[ -s ]`-verified before the trap, uses `mktemp` logs, and asserts exact reasons.

Regex claims confirmed: mine misses `git -C . commit` and `git -c k=v commit`; theirs matches those plus `git  commit`, and does not match `git log | grep commit`, `git-commit-helper`, `mygit commit`, `git status`. Only over-match seen: `git push # revert the commit` (fail-closed).

Runs: `selftest.sh` 7/7, tree byte-identical before/after (`vitest.config.mts` restored). `verify.sh` → **VERIFY GREEN**, exit 0 — but only in the current untracked-file state, per the blocker.

---

## Re-review (round 2)

## Status: PASS

**Blocker closed.** `lib.sh:30,40` now uses `[ -n "$f" ] || continue` plus a bare `true` as the group's last command. Reproduced in a scratch repo with *literally zero* untracked files (`git status --porcelain` empty, lib.sh sourced from outside the repo so it could not seed one): `rc=0`, 64-char hash — and the same with a tracked-but-modified file. verify.sh's `f=$(worktree_fingerprint) || f=""` consumption stays green.

**The new `-a` case really isolates `is_broad_commit`.** Its scratch repo stages only `doc.md` with an otherwise clean tree, so `dq=0` and every staged path ends `.md`; the only thing that can force the strict path is `is_broad_commit`. Confirmed on a throwaway copy of the gate (repo files untouched) with that function stubbed to `return 1`: the `-a` payload is ALLOWED, so `assert_deny_reason` would fail. The paired plain-commit control asserts the allow, so the flag is the only variable.

**Isolation confirmed.** Both new cases build `mktemp -d` trees; the `-a` case copies `lib.sh`/`commit-gate.sh` into `$scratch/scripts/factory/`, so the gate's `cd "$SCRIPT_DIR/../.."` lands in the scratch repo, and the fingerprint case only changes cwd. Each is `rm -rf`'d.

**Runs.** `selftest.sh` 9/9 PASS, rc 0; `git status --short` byte-identical before/after, and `vitest.config.mts` + `.factory/last-verify.json` md5s unchanged. `scripts/factory/verify.sh` → **VERIFY GREEN**, exit 0; stamp has a 40-char head and 64-char fingerprint.

No remaining findings. All Acceptance bullets and T1-T8 hold.
