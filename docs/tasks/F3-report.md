# F3 report — runtime artifact reliability

Task: `docs/tasks/F3-artifact-reliability.md`, T1–T7. Implemented by the implementer role, bash only, no new dependencies.

## Status: DONE

## What changed

- **`scripts/factory/lib.sh`** (T1): added `validate_stamp <path>` — true only if the path is a readable regular file holding a single line of compact JSON matching, end to end, `{"status":"(green|red)","head":"[0-9a-f]{40}","fingerprint":"[0-9a-f]{64}","at":"..."}` — an extra key, wrong-length hash, bad status value, or truncation all fail because the regex is anchored on both ends. Pure bash + grep, no jq dependency. Added `ensure_factory_dir [dir]` (default `.factory`) — creates the dir if missing; fails with a stderr message naming the owner and octal mode if it exists but isn't a directory, isn't writable by the current user, or if `<dir>/last-verify.json` exists but isn't both readable and writable by the current user.
- **`scripts/factory/preflight.sh`** (T2): new `-- runtime artifacts` section — calls `ensure_factory_dir` (`[FAIL]` with a chmod/chown hint on failure), does a real write-read-delete round trip of a `$$`-suffixed temp file inside `.factory/`, and runs `validate_stamp` on any existing stamp (`[warn]` if absent, `[FAIL]` if present but invalid). The verification-baseline log moved from the fixed `/tmp/factory-verify.log` to `.factory/verify.log` (truncated every run via `>`); if `verify.sh` fails and the log is missing/empty, preflight reports the redirect itself may have failed rather than blaming verify.
- **`scripts/factory/verify.sh`** (T3): calls `ensure_factory_dir` first — `VERIFY RED` and exit 1 if it fails, before running anything else. `HEAD` is validated as 40 lowercase hex before use — a `git rev-parse` that prints garbage is `VERIFY RED`. The stamp is written to `.factory/last-verify.json.tmp`, then `mv`'d into place atomically; it is then re-read and passed through `validate_stamp` — `VERIFY RED (stamp invalid after write)` and exit 1 if that fails, even when every other check was green.
- **`scripts/factory/commit-gate.sh`** (T4): the strict (non-doc) path now runs `validate_stamp .factory/last-verify.json` before reading any field; a missing or malformed stamp denies with the exact reason `commit gate: verify stamp missing or malformed, re-run verify.sh`. Field extraction is now anchored `sed` on the exact 4-key shape `validate_stamp` guaranteed, not the old substring `case "$stamp" in *"\"head\":\"$head\""*)` glob matching.
- **`scripts/factory/selftest.sh`** (T5): grew from 9 to 21 cases, all assert an exact message/output, never just "it failed":
  - (a) `worktree_fingerprint` called directly under `GIT_DIR=/nonexistent`, asserting both non-zero return **and** empty stdout.
  - (b) 7 `validate_stamp` cases in a scratch dir: accepts a well-formed stamp; rejects a missing file, an empty file, a 39-char head, a 63-char fingerprint, `status: "yellow"`, an extra key, and truncated JSON.
  - (e) 1 more `validate_stamp` case: rejects a directory sitting where the stamp file should be (the state a broken `mv` would leave).
  - (c) `ensure_factory_dir` against a `mktemp -d` scratch `.factory/` `chmod 500`'d — asserts non-zero **and** a non-empty message; permissions restored to 700 before the scratch dir is removed. The real `.factory/` is never touched by this case.
  - (d) explicit stamp backup/restore: a *second*, untouched backup copy is kept alongside the one used for restoration, and at the end of the run the restored file is `cmp`'d byte-for-byte against that second copy — not just checked with `[ -s ]`. `write_stamp()` now fails the case on a non-zero write, not only on an empty result.
  - Kept all 9 existing cases. One assertion's expected string changed as a direct, intended consequence of T4: the "missing stamp" case (inside the isolated `-a`-bypass scratch repo, which has no `.factory/` at all) now expects `commit gate: verify stamp missing or malformed, re-run verify.sh` instead of the old `run scripts/factory/verify.sh and get it green first`.
- **`docs/coding_factory_fit.md`** (T6): updated the file-map rows for all five `scripts/factory/*.sh` entries, and added a "Run 3" line to the learnings log.
- **`docs/tasks/F3-report.md`** (T6): this file.

## Rulings

- Ruling: `validate_stamp` enforces the *exact* key order `status,head,fingerprint,at` (not just "these 4 keys in any order") via one anchored regex, rather than a generic order-independent JSON check — because verify.sh only ever writes that one literal `printf` shape, and an anchored single regex gives simpler, more auditable pass/fail behavior than parsing JSON by hand. Cost if wrong: a future change to verify.sh's printf field order would need a matching update to the regex in lib.sh, or validate_stamp would wrongly reject a stamp that's semantically fine.
- Ruling: `ensure_factory_dir` takes an optional `[dir]` argument (default `.factory`) instead of being hardcoded to the real path, specifically so `selftest.sh`'s T5(c) permission case and any future scratch-dir test can call it directly without ever `chmod`ing the real `.factory/`. Cost if wrong: none identified — callers that don't pass an argument get identical behavior to a hardcoded path.
- Ruling: for the "missing/malformed stamp" deny in `commit-gate.sh` (T4), the brief's exact wording ("verify stamp missing or malformed, re-run verify.sh") wins over leaving the previously-passing selftest case's old string untouched, since T4 explicitly mandates the new message; the one selftest assertion that exercised the missing-stamp path was updated to match rather than left inconsistent with the shipped behavior. Cost if wrong: if the old wording was actually meant to survive for the *missing-file* sub-case specifically (as opposed to *malformed*), a caller scripting against the old string would break — no such caller exists in this repo.
- Ruling: preflight's new "-- runtime artifacts" section runs unconditionally (not gated behind `--quick`), since `ensure_factory_dir` and the round trip are cheap filesystem checks, unlike the tsc/lint/vitest baseline that `--quick` is meant to skip. Cost if wrong: `--quick` preflight now does slightly more I/O than before (one small temp-file write/read/delete); negligible.
- Ruling: preflight's `.factory/verify.log` "redirect failed" detection is heuristic (missing-or-empty log file after a non-zero `verify.sh` exit), since bash gives no direct way to distinguish "the redirect's `open()` failed" from "verify.sh ran and produced no output" from inside the same `if` conditional. Cost if wrong: a verify.sh failure that legitimately produces zero bytes of output (very unlikely, given it always echoes at least section headers) would be mis-reported as a redirect failure rather than a verify failure; the fix hint (`check .factory/ permissions`) would be slightly misleading but harmless.

## Verification

`git status --short` was captured before and after every `scripts/factory/selftest.sh` run during development and confirmed byte-identical (diff was empty) in each case.

### selftest.sh output (standalone run, 21/21 pass)

```
selftest: 21 passed, 0 failed
```

All 21 case labels PASS: gate denies a commit when git is broken; gate recognizes "git -C . commit" and denies when git is broken; preflight --quick exits 1 and reports the toplevel failure with broken git; worktree_fingerprint returns non-zero and prints nothing under broken git; validate_stamp accepts a well-formed stamp; validate_stamp rejects a missing file / an empty file / a 39-char head / a 63-char fingerprint / status "yellow" / an extra key / truncated JSON; validate_stamp rejects a directory in place of the stamp file; ensure_factory_dir fails with a message on a read-only directory; gate allows a non-commit command with no output; gate denies a green stamp with the wrong head / wrong fingerprint; worktree_fingerprint returns 0 with a 64-char hash when nothing is untracked; plain commit is allowed when everything staged is .md and the tree is otherwise clean; gate denies -a via the broad-commit path with an all-.md, otherwise-clean stage; restored stamp is byte-identical to the backup.

### verify.sh final line

```
VERIFY GREEN
```

(selftest 21/21, `tsc --noEmit` clean, `next lint` zero warnings, `vitest run` 13/13. Stamp after this run: 40-char head, 64-char fingerprint, passes `validate_stamp`.)

### Manual spot checks (outside selftest.sh, in throwaway scratch repos under `/tmp`, never touching the real `.factory/`)

- `validate_stamp` accepts the real `.factory/last-verify.json` and rejects a hand-truncated copy of it (`head -c 50`).
- `ensure_factory_dir` against a `mktemp -d` scratch `.factory/` made `chmod 500` fails with `factory: <path> is not writable by this user (owner: claude-code, mode: 500)`, rc=1; permissions restored before removal; real `.factory/` owner/mode unchanged by the check.
- `commit-gate.sh`, run against a scratch git repo with a truncated `.factory/last-verify.json` and a staged non-`.md` file, denies with exactly `commit gate: verify stamp missing or malformed, re-run verify.sh`.

## git diff --stat

```
 docs/coding_factory_fit.md     |  11 ++--
 scripts/factory/commit-gate.sh |  28 +++++----
 scripts/factory/lib.sh         |  55 +++++++++++++++++
 scripts/factory/preflight.sh   |  36 ++++++++++-
 scripts/factory/selftest.sh    | 132 +++++++++++++++++++++++++++++++++++++++--
 scripts/factory/verify.sh      |  27 +++++++--
 6 files changed, 260 insertions(+), 29 deletions(-)
```

Plus two new untracked docs files: `docs/tasks/F3-artifact-reliability.md` (the brief, pre-existing at task start) and `docs/tasks/F3-report.md` (this file). Nothing outside `scripts/factory/`, `docs/tasks/F3-*`, and `docs/coding_factory_fit.md` was touched.

## Concerns

- Building on the F2 reviewer's finding: the live commit-gate hook's trigger regex matches "git" ... "commit" across a multi-line Bash tool command with no `;`/`&`/`|` between them — this bit me directly while manually verifying T4 in a scratch repo (a plain `git commit -q -m init` used only to seed a throwaway git repo tripped the *real* gate on my own tool call, not the scratch one). Not a defect in the shipped scripts — `selftest.sh` already builds its payload strings without ever writing the literal phrase — but worth flagging since it will bite the next person who manually verifies against a scratch repo the same way. Recorded in the learnings log.
- `ensure_factory_dir`'s permission checks (`[ -w ]`, `[ -r ]`) are bypassed for root; on a host where these scripts ever ran as root, T5(c)'s scratch permission test would need a different mechanism (e.g. an immutable flag) to still fail meaningfully. Not applicable to this host (uid 1002), so left as-is per the brief's scope.

## Fix round 1

Reviewer returned PASS (`docs/tasks/F3-review.md`) with two low findings, both in scope, closed here. Nothing else changed.

1. **`scripts/factory/verify.sh` — a RED verify could leave a previous GREEN stamp trusted.** Reproduced by the reviewer via `mkdir .factory/last-verify.json.tmp`: the write failed, `VERIFY RED` printed, rc 1, but the old GREEN stamp's md5 was unchanged, so the gate still ALLOWed (only doc-only/identical-tree commits could actually pass, since the fingerprint still pins staged non-doc content, but it's still a stale-trust bug). Fix: `stamp_file`/`stamp_tmp` are now declared at the top of the script, and every RED exit path — `ensure_factory_dir` failure, `selftest.sh` failure, a non-hex `HEAD`, a failed `.tmp` write, a failed `mv`, and a stamp that fails `validate_stamp` right after being written — now goes through one `red()` helper that removes both `$stamp_file` and `$stamp_tmp` before `exit 1`. The one RED path that legitimately *writes* a stamp (tsc/lint/vitest failed, but the write/mv/post-write-validate all succeeded) is unchanged: it still records that real red stamp, since that's an accurate, trustworthy record, not a stale leftover. Also added `rm -f -- "$stamp_tmp"` immediately before the write, clearing any leftover `.tmp` (e.g. from an interrupted run or the other OS user) so it can never block or shadow this run's write.
2. **`scripts/factory/lib.sh` `ensure_factory_dir` — ignored a leftover `last-verify.json.tmp`.** Reproduced by the reviewer: an unwritable leftover `.tmp` passed `ensure_factory_dir` (rc 0) and only failed later, at the write itself — the exact two-user leftover case `ensure_factory_dir` exists to catch up front. Fix: `ensure_factory_dir` now also checks `<dir>/last-verify.json.tmp` if it exists, failing with the same owner/mode message shape as the other checks (`factory: <path> is not writable by this user (owner: X, mode: Y)`) when it is not writable by the current user.
3. **`scripts/factory/selftest.sh`** (T5 fix-round-1 additions, both asserting exact output, not just "it failed"):
   - `ensure_factory_dir fails with the owner/mode message on an unwritable leftover .tmp` — a scratch `.factory/last-verify.json.tmp` `chmod 400`'d; asserts the exact expected message string built from the file's real owner and mode, restores `600` before cleanup, never touches the real `.factory/`.
   - `a RED verify (stamp write blocked) removes a previously-trusted GREEN stamp` — runs the real, fixed `verify.sh` and `lib.sh` (copied unmodified) in an isolated scratch git repo, with `scripts/factory/selftest.sh` stubbed to an instant `exit 0` and `npx` stubbed to an instant `exit 1` (via a `fakebin/` prepended to `PATH`) so it never runs tsc/lint/vitest or this repo's own selftest — only verify.sh's actual `ensure_factory_dir` → selftest → HEAD → stamp-write sequence. The scratch `.factory/` starts with a green stamp and `last-verify.json.tmp` pre-created as a directory (reproducing the reviewer's exact repro), forcing the write to fail; asserts `verify.sh` exits non-zero **and** `.factory/last-verify.json` no longer exists.
   - Selftest count: 21 → 23, all PASS.

### Verification

`scripts/factory/selftest.sh` run standalone: `selftest: 23 passed, 0 failed`, rc 0. `git status --short` captured immediately before and after that run and diffed byte-for-byte identical.

`git add -A`, then `scripts/factory/verify.sh`:

```
selftest: 23 passed, 0 failed
== tsc --noEmit
== next lint
✔ No ESLint warnings or errors
== vitest
 Test Files  1 passed (1)
      Tests  13 passed (13)
VERIFY GREEN
```

Final `.factory/last-verify.json`: 40-char head, 64-char fingerprint, passes `validate_stamp`.

Final `git status --short`:

```
M  docs/coding_factory_fit.md
A  docs/tasks/F3-artifact-reliability.md
A  docs/tasks/F3-report.md
A  docs/tasks/F3-review.md
M  scripts/factory/commit-gate.sh
M  scripts/factory/lib.sh
M  scripts/factory/preflight.sh
M  scripts/factory/selftest.sh
M  scripts/factory/verify.sh
```

`git diff --cached --stat`:

```
 docs/coding_factory_fit.md            |  11 +-
 docs/tasks/F3-artifact-reliability.md |  31 ++++++
 docs/tasks/F3-report.md               |  74 +++++++++++++
 docs/tasks/F3-review.md               |  19 ++++
 scripts/factory/commit-gate.sh        |  28 ++---
 scripts/factory/lib.sh                |  67 ++++++++++++
 scripts/factory/preflight.sh          |  36 +++++-
 scripts/factory/selftest.sh           | 199 +++++++++++++++++++++++++++++++++-
 scripts/factory/verify.sh             |  44 ++++++--
 9 files changed, 477 insertions(+), 32 deletions(-)
```

Nothing outside `scripts/factory/`, `docs/tasks/F3-*`, and `docs/coding_factory_fit.md` was touched. No commit made.
