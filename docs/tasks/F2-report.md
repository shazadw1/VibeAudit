# F2 — fail-closed git in factory scripts — implementation report

STATUS: DONE

## What changed

- `scripts/factory/lib.sh` (new): `g()` — runs `git "$@"`, and on non-zero exit
  prints `factory: git failed: git <args>` plus a `git config --global --add
  safe.directory <toplevel>` hint to stderr, then returns the real exit code.
  `worktree_fingerprint()` — sha256 of `git diff HEAD -- . ':!*.md'` plus,
  for every untracked non-md file, its path and sha256sum, all folded into
  one final sha256. Both are sourced by the other four scripts.
- `scripts/factory/preflight.sh`: git section rewritten. First git check is
  `g rev-parse --show-toplevel`; on failure it's a `[FAIL]` with the
  safe.directory hint and the remaining git checks (branch, dirty tree) are
  skipped. A blank branch is now always `[FAIL]`, never `[ok]`. `set -o
  pipefail` added.
- `scripts/factory/verify.sh`: runs `selftest.sh` first and turns a selftest
  failure into `VERIFY RED` + exit 1. Captures `head=$(g rev-parse HEAD)`
  before doing anything else; empty head → `VERIFY RED` + exit 1. Stamp now
  has `fingerprint` alongside `status`/`head`/`at`. `set -o pipefail` added.
- `scripts/factory/commit-gate.sh`: every git call's exit code is checked;
  any git failure denies with `commit gate: git failed (<cmd>); add
  safe.directory?`. For commits that touch any non-`.md` file, added: stamp
  `status` must be `green`, stamp `head` must equal current `HEAD`, stamp
  `fingerprint` must equal `worktree_fingerprint`, and `git diff --quiet --
  . ':!*.md'` must be clean (no unstaged non-doc changes, so staged tree ==
  verified tree). Each mismatch has its own deny reason. `set -o pipefail`
  added.
- `scripts/factory/selftest.sh` (new): (a) broken git (`GIT_DIR=/nonexistent`)
  → gate denies a `git commit`, and `preflight.sh --quick` exits 1 with a
  `[FAIL]`; (b) a non-commit command (`ls`) → gate exits 0, no output;
  (c) a green stamp with the wrong `head` → denied; (d) a green stamp with
  the right `head` but wrong `fingerprint` → denied. Stages a temp file
  (`lib/__selftest_tmp.ts`) and backs up/restores `.factory/last-verify.json`
  via a `trap ... EXIT` so a failure mid-run never leaves the tree dirty.
  Prints `[PASS]`/`[FAIL]` per case and exits non-zero on any failure.
- `docs/tasks/1-report.md`, `docs/tasks/1-review.diff`: copied from
  `.factory/task-1-report.md` / `.factory/task-1-review.diff` (run 1's
  audit trail, now also tracked).
- `docs/coding_factory_fit.md`: added a "Portability" paragraph under Rule
  zero explaining the Claude-only decision, that skills live under the
  Claude user's home (so other OS users see skill warnings), and that other
  OS users need `safe.directory` for git. Updated the file map with
  `lib.sh` and `selftest.sh`, and refreshed the `verify.sh`/`commit-gate.sh`
  rows to mention the fingerprint stamp and the new fail-closed checks.
- `docs/tasks/F2-report.md`: this file.

## Bug found and fixed during self-review

While testing, `commit-gate.sh`'s original refactor used a `gg()` helper that
called `deny()` (which does `exit 0` after printing the deny JSON) from
*inside* command substitutions, e.g. `staged=$(gg diff --cached
--name-only)`. `exit` inside `$(...)` only terminates that subshell — the
deny JSON got captured into the `staged` variable instead of reaching the
gate's real stdout, and the script limped on with a corrupted variable. It
still ended up denying (a later check caught the bad data), so the security
property held, but with a misleading reason, which breaks "each mismatch has
its own deny reason." Fixed by never calling `deny()` from within a
substitution: each git call now does `x=$(g ...); deny_if_failed $? "..."`,
where `deny_if_failed` is invoked as a plain statement (not through `$()`),
so its `exit 0` correctly ends the whole script. Verified with a manual
repro (`GIT_DIR=/nonexistent`) before and after: before, the reason was the
unrelated "verify stamp head does not match current HEAD"; after, it's
`commit gate: git failed (git diff --cached --name-only); add
safe.directory?"`, matching the brief.

## Rulings

- Ruling: `worktree_fingerprint()` hashes each untracked file's *path and*
  its sha256, not just the sha256 — so a rename-only change of an untracked
  file changes the fingerprint — because hashing content alone would let a
  renamed untracked file silently keep the same fingerprint. Cost if wrong:
  low; low-probability edge case (renaming an unstaged, untracked file
  between verify and commit) and `git diff --quiet` already blocks unstaged
  changes on tracked files.
- Ruling: the unstaged-changes check (`git diff --quiet -- . ':!*.md'`) is
  called directly, not through the `g()`/`deny_if_failed` fail-closed path,
  because its exit code 1 is an expected "changes present" signal, not a
  git failure — wrapping it in `g()` would print a false "factory: git
  failed" hint on the normal path. Exit codes >1 (real git failure) are
  still explicitly denied with the standard "git failed" reason. Cost if
  wrong: cosmetic only — the gate still denies fail-closed either way, just
  with a less specific message if this reasoning is wrong.
- Ruling: preflight.sh's non-git sections (toolchain, docs readability,
  factory wiring) were left otherwise unchanged beyond adding `set -o
  pipefail` and sourcing `lib.sh` — T2 only scoped changes to the git
  checks. Cost if wrong: none observed; those sections don't call git.

## Test summary

`scripts/factory/selftest.sh` (also run standalone and as verify.sh's first
step) — 5/5 PASS:
```
[PASS] gate denies a commit when git is broken
[PASS] preflight --quick exits 1 and reports [FAIL] with broken git
[PASS] gate allows a non-commit command with no output
[PASS] gate denies a green stamp with the wrong head
[PASS] gate denies a green stamp with the wrong fingerprint

selftest: 5 passed, 0 failed
```
After each selftest run, `git status --short` showed no leftover files —
the trap-based cleanup of the temp file and the stamp backup held under
both PASS and (during earlier debugging) FAIL conditions.

`scripts/factory/verify.sh` final run: selftest (5/5) → `tsc --noEmit`
clean → `next lint` "No ESLint warnings or errors" → `vitest run` 13/13
tests passed → **`VERIFY GREEN`**, exit 0, ~25s wall time.

`.factory/last-verify.json` after the final run:
```
{"status":"green","head":"dba10a02cc543120d4b3ea74276ab7df8af1857e","fingerprint":"2c99a60f17df9117b84d2ec6b48573e0f135f6501e0149d94309a91abd03ecf4","at":"2026-09-19T18:10:58Z"}
```
`head` is 40 chars, `fingerprint` is 64 chars, matching acceptance.

Acceptance criteria re-checked directly (each isolated so the literal string
"git commit" in a manual test payload doesn't self-trigger this very
session's own live PreToolUse commit-gate hook on the Bash tool — that's a
meta side effect of testing a hook from inside the environment it hooks,
not a defect):
- `GIT_DIR=/nonexistent scripts/factory/preflight.sh --quick` → exit 1,
  `[FAIL] git rev-parse --show-toplevel failed -> git config --global --add
  safe.directory /opt/projects/VibeAudit`. Confirmed.
- `GIT_DIR=/nonexistent` + a `git commit` payload piped to
  `commit-gate.sh` → deny JSON with reason `commit gate: git failed (git
  diff --cached --name-only); add safe.directory?`. Confirmed.
- A non-commit command (`ls -la`) piped to `commit-gate.sh` → exit 0, no
  output. Confirmed.

## `git status --short`

```
 M docs/coding_factory_fit.md
 M scripts/factory/commit-gate.sh
 M scripts/factory/preflight.sh
 M scripts/factory/verify.sh
?? docs/tasks/1-report.md
?? docs/tasks/1-review.diff
?? docs/tasks/F2-fail-closed-git.md
?? scripts/factory/lib.sh
?? scripts/factory/selftest.sh
```
(`docs/tasks/F2-fail-closed-git.md` is the pre-existing task brief, not
created by this implementation pass.) All changes are within
`scripts/factory/`, `docs/tasks/`, and `docs/coding_factory_fit.md`, per the
acceptance constraint. Nothing was committed, per instructions.

## Concerns

- Under `GIT_DIR=/nonexistent` specifically (the brief's chosen reproducer),
  git falls into `diff --no-index` argument parsing and dumps its full
  `--help`-style usage text to stderr for every failing call inside
  `commit-gate.sh`/`preflight.sh`/`selftest.sh` — very noisy, but harmless:
  it's git's own behavior reacting to a missing `GIT_DIR`, not something
  these scripts print, and the exit codes/hints/denials are all correct
  underneath it. A real "dubious ownership" failure (the actual production
  scenario this fix targets) produces a single clean `fatal:` line instead.
- The commit gate's non-doc path assumes `.factory/last-verify.json` was
  written by *this* `verify.sh` (trusted format); it does not defend against
  a hand-edited stamp file beyond the head/fingerprint/status checks
  already required by the brief.

## Fix round 1

Reviewer returned FAIL (`docs/tasks/F2-review.md`) with six findings plus a
note. All fixed, in `scripts/factory/` only.

1. **Critical — `-a`/`--all`/`-i`/`--include`/`-p`/`--patch`/pathspec bypass**
   (`commit-gate.sh`). Added `is_broad_commit()`: matches a short-option
   cluster containing a/i/p (so `-a`, `-am`, `-ip`, ... all trip it), the
   long forms `--all`/`--include`/`--patch`, or a pathspec after `--`. The
   doc-only exemption (`doc_only_safe`) now requires **all** of: every
   staged path ends `.md`, `is_broad_commit` is false, and `git diff
   --quiet -- . ':!*.md'` is clean — matching the brief's "unless ALL of"
   wording exactly. When `is_broad_commit` is true, the gate also scans
   `git diff HEAD` (and `git diff HEAD --name-only` for secret-looking
   filenames) for secrets, not just `--cached`, since `-a`/pathspec can
   commit content `--cached` never saw.
2. **High — selftest could destroy the stamp and still report PASS**
   (`selftest.sh`). The stamp backup is written to a fresh `mktemp` path
   and verified non-empty (`[ -s "$candidate" ]`) *before* `trap cleanup
   EXIT` is registered; if the backup fails, the script calls `bad()` and
   `exit 1` immediately, before any fake stamp is ever written. Added
   `write_stamp()`, which checks the crafted-stamp write actually landed
   (`[ -s .factory/last-verify.json ]`) before the corresponding case runs;
   a write failure is reported and that case is skipped rather than
   asserted on stale data.
3. **High — cases only checked "a deny happened", and one used a fixed
   `/tmp` log path** (`selftest.sh`). Added `deny_reason()` +
   `assert_deny_reason()`, which fail if the reason string doesn't match
   *exactly*. All deny-producing cases (broken-git, wrong-head,
   wrong-fingerprint, plus two new ones below) now assert the precise
   reason, not just `is_deny`. The preflight broken-git log now goes to
   `mktemp` and is grepped for the specific toplevel-failure message
   instead of a generic `[FAIL]`, so a stale file owned by another user
   can no longer produce a false pass.
4. **Medium — `worktree_fingerprint` used raw, unchecked `git`**
   (`lib.sh`). Both git calls now go through `g` with `|| return 1`,
   *before* any output is produced, so a git failure returns non-zero and
   prints nothing (never the empty-input sha `e3b0c442…`). `verify.sh`
   now treats an empty/failed fingerprint as red (`fingerprint=$(...) ||
   fingerprint=""`, then forces `rc=1` if empty) instead of writing a
   vacuously-passing stamp. `commit-gate.sh`'s non-doc path checks `[ $?
   -eq 0 ] && [ -n "$fp" ]`, outside any `$(...)` capture, and denies with
   "could not compute worktree fingerprint" otherwise.
5. **Medium — `preflight.sh` used raw `git check-ignore`**. Moved into the
   `-- git` section, nested inside the `g rev-parse --show-toplevel`
   success branch, and now routed through `g`; `rc=0` → `[FAIL]` gitignored,
   `rc=1` → `[ok]` tracked, `rc>1` → `[FAIL]` (git failure, with the
   safe.directory hint). When the toplevel check itself fails, the
   gitignore check is explicitly `bad()`-skipped rather than silently
   omitted.
6. **Low — `commit-gate.sh`'s `cd ... || exit 0`**. Reordered so the hook
   reads stdin and checks the commit-trigger regex *first* (so unrelated
   Bash commands still get an instant, cd-independent exit 0); only once a
   command is recognized as a commit does it `cd` to the repo root, and a
   failure there now `deny`s ("could not reach the repo root") instead of
   allowing.
7. **Note — command-match regex**. The reviewer's suggested replacement,
   `grep -Eq '(^|[;&|] *)git( +-[^ ]+)* +commit\b'`, does **not** actually
   match `git -C . commit` (verified empirically): the `.` argument to
   `-C` isn't a `-flag` token, so `( +-[^ ]+)*` can't cross it, and the
   pattern never reaches `commit`. Since the review's own required
   selftest case is "`git -C . commit` (must be gated)", using their
   literal regex would have made that new case fail. Used instead:
   `(^|[;&|] *)git\b[^;&|]* commit\b` — "git" (word boundary), then any
   run of characters that isn't a statement separator (`;`, `&`, `|`),
   then a space and "commit" (word boundary). Verified against: `git
   commit`, `git  commit` (double space), `git -C . commit`, `git -C repo
   commit`, `git -c k=v commit`, `echo hi; git commit`, `ls && git
   commit` (all match); and `git status`, `git log | grep commit`,
   `git-commit-helper`, `mygit commit`, `echo notgit commit` (all correctly
   don't match).

### Selftest (7 cases, up from 5)

```
[PASS] gate denies a commit when git is broken
[PASS] gate recognizes "git -C . commit" and denies when git is broken
[PASS] preflight --quick exits 1 and reports the toplevel failure with broken git
[PASS] gate allows a non-commit command with no output
[PASS] gate denies a green stamp with the wrong head
[PASS] gate denies a green stamp with the wrong fingerprint
[PASS] gate denies a -a commit even though everything staged is .md

selftest: 7 passed, 0 failed
```

The first two and the head/fingerprint cases now assert the **exact** deny
reason string (finding 3), not just that a deny happened. The `-a` case
reproduces the critical finding directly: it stages only a `.md` file, adds
a real *unstaged* edit to an already-tracked `vitest.config.mts` (backed up
first and restored in the trap, only after the backup was verified on
disk), and confirms `git commit -a -m x` is still denied.

Ran `scripts/factory/verify.sh` end to end afterward: selftest 7/7 → `tsc
--noEmit` clean → `next lint` clean → `vitest run` 13/13 → **`VERIFY
GREEN`**, exit 0, ~28s. `git status --short` was clean before and after
every selftest run (one real cleanup bug was caught and fixed along the
way: `git rm --cached "$tmp_file" "$doc_file"` in one call aborted
entirely once `$tmp_file` was already unstaged earlier in the script,
leaving `$doc_file` staged; split into two independent calls).

Files touched this round, all in `scripts/factory/`: `lib.sh`,
`commit-gate.sh`, `preflight.sh`, `verify.sh`, `selftest.sh`. No commits
made.

## Fix round 2

Re-review returned FAIL on one new blocker introduced by the round-1
finding-4 fix, plus an addendum on test isolation. Both fixed, in
`scripts/factory/` only.

**Blocker — `worktree_fingerprint` returned 1 whenever there were no
untracked non-doc files** (`lib.sh`). Under `set -o pipefail`, the `{...}`
group's exit status is the `while` loop's last body result; with an empty
`ls_out` the single (empty-string) iteration evaluated `[ -n "" ] && {...}`
to false, so the group — and the whole function — returned 1 despite
printing a good hash. That made `verify.sh` force red and `commit-gate.sh`
deny every non-doc commit as soon as `lib.sh`/`selftest.sh` themselves had
no untracked siblings left (i.e. the moment this task's own files are
committed). Fixed by changing the loop body to `[ -n "$f" ] || continue`
and adding a bare `true` as the group's last command, so the group's exit
status is always deterministic and never depends on the loop's last
iteration. Verified both ways directly against the real repo: with the
current untracked files present, and with a lone extra untracked `.ts`
file, `worktree_fingerprint` returns `rc=0` with a valid hash either way.
The authoritative case — *zero* untracked files at all — is covered by a
new selftest case (below) that builds an isolated scratch repo with one
committed file and nothing untracked, per the coordinator's instruction
not to touch this repo's own untracked files to prove it.

**Addendum — the `-a` selftest case only asserted `is_deny`, so it would
still pass even if `is_broad_commit` were deleted** (the `git diff --quiet`
unstaged-changes check would deny it anyway in the old test's setup,
because that test deliberately left a real unstaged edit to
`vitest.config.mts` lying around). Replaced it with a test that isolates
the broad-commit path specifically: a scratch repo with its own copy of
`lib.sh`/`commit-gate.sh` (so the scripts' hardcoded "cd to my own
`../..`" lands inside the scratch repo, not this one), one committed `.md`
file, and a second `.md` file staged — tree otherwise completely clean, no
unstaged non-doc changes anywhere. In that exact state: `git commit -m x`
(no `-a`) is asserted to be a clean allow (rc 0, no output), and `git
commit -a -m x` is asserted to deny with the *exact* reason produced by
the broad-commit path forcing the strict checks — `commit gate: run
scripts/factory/verify.sh and get it green first` (there's no
`.factory/last-verify.json` in the scratch repo). Since nothing is
unstaged in this setup, the only thing that can make the `-a` case behave
differently from the plain case is `is_broad_commit` itself — if it were
deleted, the `-a` case would wrongly take the same doc-only-exempt allow
path as the plain case, and this test would catch that.

### Selftest (9 cases, up from 7)

```
[PASS] gate denies a commit when git is broken
[PASS] gate recognizes "git -C . commit" and denies when git is broken
[PASS] preflight --quick exits 1 and reports the toplevel failure with broken git
[PASS] gate allows a non-commit command with no output
[PASS] gate denies a green stamp with the wrong head
[PASS] gate denies a green stamp with the wrong fingerprint
[PASS] worktree_fingerprint returns 0 with a 64-char hash when nothing is untracked
[PASS] plain commit is allowed when everything staged is .md and the tree is otherwise clean
[PASS] gate denies -a via the broad-commit path with an all-.md, otherwise-clean stage

selftest: 9 passed, 0 failed
```

The old vitest.config.mts-backup-and-edit mechanism for the `-a` case was
removed entirely (superseded by the isolated scratch-repo version above),
which also simplified `selftest.sh`'s cleanup trap back down to just the
one staged temp file and the stamp backup.

Ran `scripts/factory/verify.sh` end to end: selftest 9/9 → `tsc --noEmit`
clean → `next lint` clean → `vitest run` 13/13 → **`VERIFY GREEN`**, exit
0, ~29s. `git status --short` was clean before and after every selftest
run; all scratch-repo work happens under `mktemp -d` paths and is `rm -rf`'d
at the end of each case, never touching this repo's real tree.

Files touched this round, both in `scripts/factory/`: `lib.sh`,
`selftest.sh`. No commits made.
