# Task plan — factory run 3: runtime artifact reliability

Not a plan.md item. Final factory hardening pass from the 2026-09-19 codex review, before the factory is used for product work.

## Scope guard
Do not touch app code. Do not alter the factory architecture (same four scripts + lib + selftest, same hook contract, same stamp file). Only harden how runtime artifacts under `.factory/` are created, written, validated, and restored. Allowed paths: `scripts/factory/`, `docs/tasks/F3-*`, and the file map / learnings log in `docs/coding_factory_fit.md`.

## Spec
Runtime state lives in `.factory/` (gitignored): `last-verify.json` (the stamp the commit gate trusts), plus reports and review packages. Today:
- `preflight.sh` never checks that `.factory/` exists, is a directory, or is writable by the runtime user, nor that the stamp can be read and written. On this host the repo is shared by two OS users, so a stamp or log owned by the other user with 0644 makes writes fail silently.
- `preflight.sh` writes its verify log to the fixed path `/tmp/factory-verify.log`. A stale copy owned by another user breaks the write and the `[ok]/[FAIL]` line then reflects the exit code of a redirect failure, not verify. Same class of bug the reviewer found in selftest during run 2.
- `verify.sh` does `mkdir -p .factory` unchecked and writes the stamp with an unchecked `printf > file`; it never re-reads the file to confirm the stamp landed and is well-formed.
- `commit-gate.sh` greps the stamp for field values without validating the file's shape; a truncated or hand-edited stamp is parsed permissively.
- `selftest.sh` distinguishes "backup failed" only by `[ -s ]`; a permission error on write/restore of the stamp is not asserted as a failure in its own right, and `worktree_fingerprint` under broken git is tested only indirectly through the gate.

## Tasks
- [x] T1: `lib.sh`: add `validate_stamp <path>`: returns 0 only if the file exists, is readable, is a single JSON object with exactly the keys `status,head,fingerprint,at`, `status` is `green` or `red`, `head` matches `^[0-9a-f]{40}$`, `fingerprint` matches `^[0-9a-f]{64}$`. Pure bash + grep/sed, jq optional. Add `ensure_factory_dir`: creates `.factory/` if missing, fails (non-zero, message to stderr naming owner and mode) if it is not a directory or not writable by the current user, or if an existing `.factory/last-verify.json` is not readable and writable by the current user.
- [x] T2: `preflight.sh`: new section `-- runtime artifacts` that calls `ensure_factory_dir` (bad on failure, with the `chmod`/`chown` hint), then does a real write-read-delete round trip of a temp file inside `.factory/`, then if a stamp exists runs `validate_stamp` (warn, not bad, if absent; bad if present but invalid). Replace the fixed `/tmp/factory-verify.log` with `.factory/verify.log` (truncate-on-write, and bad if the redirect itself fails).
- [x] T3: `verify.sh`: call `ensure_factory_dir` first; VERIFY RED if it fails. Write the stamp to `.factory/last-verify.json.tmp` then `mv` into place (atomic). After writing, re-read and `validate_stamp`; if validation fails, print `VERIFY RED (stamp invalid after write)` and exit 1 even if all checks passed. The head must be validated as 40 hex before use (a `g rev-parse` that prints garbage is red).
- [x] T4: `commit-gate.sh`: for the strict path, run `validate_stamp` before reading any field; a missing or malformed stamp denies with `commit gate: verify stamp missing or malformed, re-run verify.sh`. Field extraction must then be exact-key, not substring grep.
- [x] T5: `selftest.sh`: (a) explicit `worktree_fingerprint` test under `GIT_DIR=/nonexistent`: must return non-zero AND print nothing (assert both). (b) `validate_stamp` tests: accepts a real stamp; rejects each of: missing file, empty file, 39-char head, 63-char fingerprint, `status: "yellow"`, extra key, truncated JSON. (c) permission test: create a scratch `.factory/` under `mktemp -d`, make it read-only (`chmod 500`), run `ensure_factory_dir` against it and assert non-zero with a message; restore perms before cleanup. (d) stamp backup/restore: assert the restored stamp is byte-identical (`cmp`) to the backup at the end of the run, and fail the whole selftest if any stamp write or restore returns non-zero, not only if the result is empty. (e) `verify.sh`'s post-write validation: simulate by calling `validate_stamp` on a stamp whose `mv` target is a directory named `last-verify.json` inside a scratch `.factory/`, asserting failure. Keep the existing 9 cases.
- [x] T6: Write `docs/tasks/F3-report.md`. Update the file map and add a run-3 line in the learnings log of `docs/coding_factory_fit.md`.
- [x] T7: Stage, then run `scripts/factory/verify.sh`; must be green.

## Acceptance
- `scripts/factory/preflight.sh` prints a `-- runtime artifacts` section with all `[ok]` on this host, and `[FAIL]` when `.factory/` is made read-only (test manually with a scratch copy, not the real dir).
- `.factory/last-verify.json` passes `validate_stamp`; a hand-truncated copy fails it.
- A malformed stamp makes the gate deny with the exact reason in T4 (covered by selftest).
- `selftest.sh` has at least 16 cases, all PASS, tree byte-identical before and after.
- `scripts/factory/verify.sh` ends with VERIFY GREEN.
- `git diff --stat` touches nothing outside the allowed paths.

## Result
Implementer: DONE, then one fix round. Reviewer: PASS with two low findings (a RED verify could leave the previous GREEN stamp trusted; a leftover unwritable .tmp passed ensure_factory_dir), both closed and re-reviewed PASS. Selftest 9 → 23 cases, verify green. Accepted 2026-09-19. Trail: F3-report.md, F3-review.md.
