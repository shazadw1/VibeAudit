## Status: PASS

All Acceptance bullets and T1–T7 verified by reproduction. Three non-blocking findings.

## Verified

- **Scope guard.** `git diff --cached --stat`: only `scripts/factory/{lib,preflight,verify,commit-gate,selftest}.sh`, `docs/tasks/F3-*`, `docs/coding_factory_fit.md`. No app code.
- **validate_stamp (lib.sh:52-62).** Regex anchored `^\{…\}$`. Rejected by reproduction: uppercase hex head **and** uppercase fingerprint (real a-f letters, not the vacuous `%040x`-of-1 the selftest uses), 41-hex head, trailing garbage, trailing spaces, CRLF, leading whitespace/newline, second line, reordered keys, quote-injection via `at`, unreadable file, a directory in its place, and `head -c 50` of the real stamp. Accepts the real stamp. A valid-shape-but-wrong 40-hex head is (correctly) accepted here and denied by the gate: `commit gate: verify stamp head does not match current HEAD, re-run verify.sh`.
- **ensure_factory_dir.** Scratch `chmod 500` dir → rc=1, `factory: …/.factory is not writable by this user (owner: claude-code, mode: 500)`. Also 444 stamp and non-directory cases: owner+mode in message. Creates when missing.
- **T4 gate.** Scratch repo, staged `.ts`: no stamp / truncated stamp / stamp-is-a-directory all deny with exactly `commit gate: verify stamp missing or malformed, re-run verify.sh`. Field extraction is anchored `sed` on the shape `validate_stamp` already pinned; `at` cannot contain `"`, so no key-suffix or injection confusion is constructible.
- **selftest.** 21 passed, 0 failed, rc 0; `git status --short` and the stamp md5 byte-identical before/after. The `chmod 700` restore runs unconditionally before the assertion (and before the EXIT trap is installed), in a `mktemp -d` tree.
- **preflight.** Full run: `-- runtime artifacts` all `[ok]`, no `[FAIL]`, log at `.factory/verify.log`; no fixed `/tmp` path remains. Scratch copy with `chmod 500 .factory` → both `[FAIL]` lines; malformed stamp → `[FAIL]`; absent → `[warn]`.
- **verify.sh** → `VERIFY GREEN`, rc 0, stamp valid, no leftover `.tmp`, tree unchanged.

## Findings (non-blocking)

1. **Low — a RED verify leaves the previous GREEN stamp trusted** (`scripts/factory/verify.sh:41-49`). Reproduced: `mkdir .factory/last-verify.json.tmp` → `VERIFY RED (could not write …)`, rc 1, stamp md5 unchanged, and the gate then still ALLOWs. Only md-only/identical-tree commits can pass (fingerprint pins staged non-md content), so it is not a code bypass. Fix: `rm -f "$stamp_file"` before `exit 1` on write/mv failure.
2. **Low — `ensure_factory_dir` ignores `last-verify.json.tmp`** (`lib.sh:68`). Reproduced: unwritable leftover `.tmp` → rc 0, yet the later redirect fails — the exact two-user leftover case T1 exists for. Fix: check/clear `<dir>/last-verify.json.tmp` too.
3. **Note.** `$(cat)` strips all trailing newlines, so `{…}\n\n\n` validates; and `selftest.sh:144` still writes/stages `lib/__selftest_tmp.ts` outside `mktemp`/`.factory` (pre-existing, restored).

---

## Re-review (round 1)

## Status: PASS

Both low findings closed; verified by reproduction, no regressions found.

1. **Stale-green fixed** (`verify.sh:17-23,52-64`). My exact repro in a scratch copy (real `verify.sh`/`lib.sh`, `.factory/last-verify.json.tmp` pre-created as a directory, a prior GREEN stamp in place): `VERIFY RED (could not write …)`, rc 1, and `.factory/` now holds **no** stamp afterwards; the gate then denies with `commit gate: verify stamp missing or malformed, re-run verify.sh`.
2. **Every RED exit routes through `red()`** (lines 26, 31, 36, 57, 60, 63); the sole exception is the checks-failed path (66-67). Reproduced it (stubbed failing `npx`, write unblocked): a valid `"status":"red"` stamp lands and the gate denies with `commit gate: last verify was not green`.
3. **`ensure_factory_dir`** now rejects an unwritable leftover `.tmp`: rc 1, `factory: …/last-verify.json.tmp is not writable by this user (owner: claude-code, mode: 400)`.
4. **New scratch-verify case is hermetic.** It copies only `lib.sh` + `verify.sh`, stubs `selftest.sh` to `exit 0` and `npx` to `exit 1` via a `PATH`-prepended `fakebin/`, and `verify.sh` cds to its own scratch root — no tsc/lint/vitest, no recursion. Whole selftest: 3.0s (a real run is ~28s). Real `.factory/` listing unchanged.
5. **selftest 23 passed, 0 failed**, rc 0; `git status --short` and the stamp md5 byte-identical before/after.
6. **`scripts/factory/verify.sh` → `VERIFY GREEN`**, rc 0, stamp valid, no leftover `.tmp`.

Residual note (not a finding): if `.factory/` itself is unwritable, `red()`'s `rm -f` cannot delete the stale stamp; it prints the error and exits RED.
