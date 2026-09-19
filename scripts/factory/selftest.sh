#!/usr/bin/env bash
# Fail-closed self-test for the git-dependent factory scripts. No external
# deps. Run by verify.sh as its first step; safe to run standalone.
set -u
set -o pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/../.."

pass=0; fail=0
ok()  { printf '[PASS] %s\n' "$1"; pass=$((pass + 1)); }
bad() { printf '[FAIL] %s\n' "$1"; fail=$((fail + 1)); }
is_deny() { printf '%s' "$1" | grep -q '"permissionDecision":"deny"'; }
deny_reason() { printf '%s' "$1" | grep -o '"permissionDecisionReason":"[^"]*"' | sed -E 's/^[^:]*:"(.*)"$/\1/'; }
# assert_deny_reason <gate output> <expected reason> <label>: fails if no
# deny happened at all, and separately if the reason string doesn't match
# exactly -- a wrong-reason deny is still a bug (see fix round 1, finding 3).
assert_deny_reason() {
  if ! is_deny "$1"; then bad "$3 (no deny at all: $1)"; return; fi
  local got; got=$(deny_reason "$1")
  if [ "$got" = "$2" ]; then ok "$3"; else bad "$3 (expected reason [$2], got [$got])"; fi
}
commit_payload() { printf '{"tool_input":{"command":"%s"}}' "$1"; }

# -- (a) broken git must fail closed, not silently pass, and the reason
# must be the specific "git failed" one -- not just any deny. --
out=$(commit_payload "git commit -m x" | GIT_DIR=/nonexistent scripts/factory/commit-gate.sh)
assert_deny_reason "$out" \
  "commit gate: git failed (git diff --cached --name-only); add safe.directory?" \
  "gate denies a commit when git is broken"

# -- (a2) the trigger match must catch "git -C . commit" too, not just a
# literal "git commit" substring (it must not silently exit 0 before ever
# reaching the broken-git check below). --
out=$(commit_payload "git -C . commit -m x" | GIT_DIR=/nonexistent scripts/factory/commit-gate.sh)
assert_deny_reason "$out" \
  "commit gate: git failed (git diff --cached --name-only); add safe.directory?" \
  "gate recognizes \"git -C . commit\" and denies when git is broken"

# preflight --quick must also fail closed, into a fresh mktemp log (never a
# fixed path another user/process could own or leave stale).
preflight_log=$(mktemp)
if GIT_DIR=/nonexistent scripts/factory/preflight.sh --quick >"$preflight_log" 2>&1; then
  bad "preflight --quick exited 0 with broken git"
elif grep -q 'git rev-parse --show-toplevel failed' "$preflight_log"; then
  ok "preflight --quick exits 1 and reports the toplevel failure with broken git"
else
  bad "preflight --quick exited 1 but did not report the toplevel failure (see $preflight_log)"
fi
rm -f "$preflight_log"

# -- (T5a) worktree_fingerprint under broken git, tested directly (not just
# indirectly through the gate): must return non-zero AND print nothing on
# stdout. Run in a subshell so GIT_DIR only affects this one call.
fp_broken_out=$(GIT_DIR=/nonexistent bash -c '. "$1/lib.sh" && worktree_fingerprint' _ "$SCRIPT_DIR" 2>/dev/null)
fp_broken_rc=$?
if [ "$fp_broken_rc" -ne 0 ] && [ -z "$fp_broken_out" ]; then
  ok "worktree_fingerprint returns non-zero and prints nothing under broken git"
else
  bad "worktree_fingerprint rc=$fp_broken_rc out='$fp_broken_out' under broken git (want rc!=0, empty output)"
fi

# -- (T5b) validate_stamp: accepts a well-formed stamp, rejects each of
# missing file, empty file, 39-char head, 63-char fingerprint, status
# "yellow", an extra key, and truncated JSON. Isolated in a scratch dir so
# it never touches the real .factory/last-verify.json.
stamp_scratch=$(mktemp -d)
good_head=$(printf '%040x' 1)
good_fp=$(printf '%064x' 1)

good_stamp="$stamp_scratch/good.json"
printf '{"status":"green","head":"%s","fingerprint":"%s","at":"2026-09-19T00:00:00Z"}' "$good_head" "$good_fp" > "$good_stamp"
if validate_stamp "$good_stamp"; then ok "validate_stamp accepts a well-formed stamp"; else bad "validate_stamp rejected a well-formed stamp"; fi

missing_stamp="$stamp_scratch/missing.json"
if validate_stamp "$missing_stamp"; then bad "validate_stamp accepted a missing file"; else ok "validate_stamp rejects a missing file"; fi

empty_stamp="$stamp_scratch/empty.json"
: > "$empty_stamp"
if validate_stamp "$empty_stamp"; then bad "validate_stamp accepted an empty file"; else ok "validate_stamp rejects an empty file"; fi

short_head_stamp="$stamp_scratch/short_head.json"
printf '{"status":"green","head":"%s","fingerprint":"%s","at":"2026-09-19T00:00:00Z"}' "${good_head%?}" "$good_fp" > "$short_head_stamp"
if validate_stamp "$short_head_stamp"; then bad "validate_stamp accepted a 39-char head"; else ok "validate_stamp rejects a 39-char head"; fi

short_fp_stamp="$stamp_scratch/short_fp.json"
printf '{"status":"green","head":"%s","fingerprint":"%s","at":"2026-09-19T00:00:00Z"}' "$good_head" "${good_fp%?}" > "$short_fp_stamp"
if validate_stamp "$short_fp_stamp"; then bad "validate_stamp accepted a 63-char fingerprint"; else ok "validate_stamp rejects a 63-char fingerprint"; fi

yellow_stamp="$stamp_scratch/yellow.json"
printf '{"status":"yellow","head":"%s","fingerprint":"%s","at":"2026-09-19T00:00:00Z"}' "$good_head" "$good_fp" > "$yellow_stamp"
if validate_stamp "$yellow_stamp"; then bad "validate_stamp accepted status \"yellow\""; else ok "validate_stamp rejects status \"yellow\""; fi

extra_key_stamp="$stamp_scratch/extra.json"
printf '{"status":"green","head":"%s","fingerprint":"%s","at":"2026-09-19T00:00:00Z","extra":"x"}' "$good_head" "$good_fp" > "$extra_key_stamp"
if validate_stamp "$extra_key_stamp"; then bad "validate_stamp accepted an extra key"; else ok "validate_stamp rejects an extra key"; fi

truncated_stamp="$stamp_scratch/truncated.json"
printf '{"status":"green","head":"%s","fingerprint":"%s"' "$good_head" "$good_fp" > "$truncated_stamp"
if validate_stamp "$truncated_stamp"; then bad "validate_stamp accepted truncated JSON"; else ok "validate_stamp rejects truncated JSON"; fi

rm -rf "$stamp_scratch"

# -- (T5e) validate_stamp must reject a directory sitting where the stamp
# file should be -- the state a broken `mv` into place would leave behind
# (verify.sh's atomic write-then-mv). Isolated scratch dir.
mv_scratch=$(mktemp -d)
mkdir -p "$mv_scratch/.factory/last-verify.json"
if validate_stamp "$mv_scratch/.factory/last-verify.json"; then
  bad "validate_stamp accepted a directory in place of the stamp file"
else
  ok "validate_stamp rejects a directory in place of the stamp file"
fi
rm -rf "$mv_scratch"

# -- (T5c) ensure_factory_dir: a read-only scratch .factory/ must fail with
# a non-empty message. Never chmod the real .factory/ -- only this scratch
# copy under mktemp -d is touched, and its permissions are restored before
# it is removed.
perm_scratch=$(mktemp -d)
scratch_factory="$perm_scratch/.factory"
mkdir -p "$scratch_factory"
chmod 500 "$scratch_factory"
perm_err=$(ensure_factory_dir "$scratch_factory" 2>&1)
perm_rc=$?
chmod 700 "$scratch_factory"
if [ "$perm_rc" -ne 0 ] && [ -n "$perm_err" ]; then
  ok "ensure_factory_dir fails with a message on a read-only directory"
else
  bad "ensure_factory_dir rc=$perm_rc msg='$perm_err' on a read-only scratch directory (want rc!=0, non-empty message)"
fi
rm -rf "$perm_scratch"

# -- (F3 fix round 1, finding 2) ensure_factory_dir must also reject an
# unwritable leftover last-verify.json.tmp, with the same owner/mode
# message shape as the other permission checks -- this is the exact
# two-user leftover case ensure_factory_dir exists for, just for the .tmp
# instead of the stamp itself. Never touches the real .factory/.
tmp_perm_scratch=$(mktemp -d)
tmp_perm_factory="$tmp_perm_scratch/.factory"
mkdir -p "$tmp_perm_factory"
: > "$tmp_perm_factory/last-verify.json.tmp"
chmod 400 "$tmp_perm_factory/last-verify.json.tmp"
tmp_owner=$(stat -c %U -- "$tmp_perm_factory/last-verify.json.tmp")
tmp_perm_err=$(ensure_factory_dir "$tmp_perm_factory" 2>&1)
tmp_perm_rc=$?
chmod 600 "$tmp_perm_factory/last-verify.json.tmp"
expected_tmp_perm_err="factory: $tmp_perm_factory/last-verify.json.tmp is not writable by this user (owner: $tmp_owner, mode: 400)"
if [ "$tmp_perm_rc" -ne 0 ] && [ "$tmp_perm_err" = "$expected_tmp_perm_err" ]; then
  ok "ensure_factory_dir fails with the owner/mode message on an unwritable leftover .tmp"
else
  bad "ensure_factory_dir rc=$tmp_perm_rc msg='$tmp_perm_err' on an unwritable .tmp (want rc!=0, msg='$expected_tmp_perm_err')"
fi
rm -rf "$tmp_perm_scratch"

# -- (F3 fix round 1, finding 1) a RED verify must leave no stamp file
# behind at all -- not even a previous run's trusted GREEN one. Runs the
# real verify.sh (and the real, fixed lib.sh) in an isolated scratch repo:
# selftest.sh is stubbed to an instant `exit 0` and `npx` is stubbed to an
# instant `exit 1` so this never runs tsc/lint/vitest or this repo's own
# selftest, only verify.sh's own ensure_factory_dir -> selftest -> HEAD ->
# checks -> stamp-write sequence. The scratch .factory/ starts with a
# green stamp and an already-a-directory last-verify.json.tmp, reproducing
# the reviewer's "mkdir .factory/last-verify.json.tmp" repro so the write
# step itself fails and forces the red() cleanup path.
redscratch=$(mktemp -d)
mkdir -p "$redscratch/scripts/factory" "$redscratch/.factory" "$redscratch/fakebin"
cp "$SCRIPT_DIR/lib.sh" "$SCRIPT_DIR/verify.sh" "$redscratch/scripts/factory/"
chmod +x "$redscratch/scripts/factory/verify.sh"
printf '#!/usr/bin/env bash\nexit 0\n' > "$redscratch/scripts/factory/selftest.sh"
chmod +x "$redscratch/scripts/factory/selftest.sh"
printf '#!/usr/bin/env bash\nexit 1\n' > "$redscratch/fakebin/npx"
chmod +x "$redscratch/fakebin/npx"
prior_head=$(printf '%040x' 2)
prior_fp=$(printf '%064x' 2)
printf '{"status":"green","head":"%s","fingerprint":"%s","at":"1970-01-01T00:00:00Z"}' "$prior_head" "$prior_fp" > "$redscratch/.factory/last-verify.json"
mkdir -p "$redscratch/.factory/last-verify.json.tmp"
if [ -n "$redscratch" ] && (
    cd "$redscratch" &&
    git init -q &&
    git config user.email selftest@example.invalid &&
    git config user.name selftest &&
    echo base > base.md &&
    git add base.md &&
    git commit -q -m init
  ) >/dev/null 2>&1
then
  ( cd "$redscratch" && PATH="$redscratch/fakebin:$PATH" scripts/factory/verify.sh ) >/dev/null 2>&1
  redscratch_rc=$?
  if [ "$redscratch_rc" -ne 0 ] && [ ! -e "$redscratch/.factory/last-verify.json" ]; then
    ok "a RED verify (stamp write blocked) removes a previously-trusted GREEN stamp"
  else
    stamp_state=missing; [ -e "$redscratch/.factory/last-verify.json" ] && stamp_state=present
    bad "verify.sh rc=$redscratch_rc, stamp $stamp_state after a blocked write (want rc!=0, stamp missing)"
  fi
else
  bad "selftest setup: could not build the scratch repo for the RED-stamp-removal case"
fi
rm -rf "$redscratch"

# -- (b) a non-commit command must be a no-op: exit 0, no output --
out=$(commit_payload "ls" | scripts/factory/commit-gate.sh)
rc=$?
if [ $rc -eq 0 ] && [ -z "$out" ]; then ok "gate allows a non-commit command with no output"; else bad "gate rc=$rc out='$out' for a non-commit command"; fi

# -- (c)/(d)/(-a): need a staged non-doc file and/or a crafted stamp.
# Back up the real stamp BEFORE any fake-stamp write, and only wire the
# restore into the trap once that backup is confirmed on disk -- if the
# backup fails, abort before ever touching the real stamp (fix round 1,
# finding 2).
tmp_file="lib/__selftest_tmp.ts"
stamp_backup=""
stamp_backup_check=""
# Fallback safety net only: the normal path restores and verifies the stamp
# explicitly near the end of this script (T5d), then clears stamp_backup,
# so this trap has nothing left to do on a clean exit. It only fires for
# real on an unexpected early exit.
cleanup() {
  git rm --cached -q "$tmp_file" >/dev/null 2>&1
  rm -f "$tmp_file"
  if [ -n "$stamp_backup" ] && [ -e "$stamp_backup" ]; then
    cp "$stamp_backup" .factory/last-verify.json 2>/dev/null
    rm -f "$stamp_backup" "$stamp_backup_check"
  fi
}

if [ -f .factory/last-verify.json ]; then
  candidate=$(mktemp) || { bad "selftest setup: mktemp failed for stamp backup"; exit 1; }
  check_candidate=$(mktemp) || { rm -f "$candidate"; bad "selftest setup: mktemp failed for stamp backup check copy"; exit 1; }
  if cp .factory/last-verify.json "$candidate" && [ -s "$candidate" ] \
     && cp .factory/last-verify.json "$check_candidate" && [ -s "$check_candidate" ]; then
    stamp_backup="$candidate"
    stamp_backup_check="$check_candidate"
  else
    rm -f "$candidate" "$check_candidate"
    bad "selftest setup: could not back up .factory/last-verify.json -- aborting before touching it"
    echo; echo "selftest: $pass passed, $fail failed"
    exit 1
  fi
fi
trap cleanup EXIT

# write_stamp <json>: fails the case (not just returns) on either a
# non-zero write or an empty result -- a permission error on the write
# must be its own failure, not indistinguishable from "wrote an empty file".
write_stamp() {
  if ! printf '%s\n' "$1" > .factory/last-verify.json; then
    bad "selftest: failed to write crafted stamp (write returned non-zero)"
    return 1
  fi
  if [ ! -s .factory/last-verify.json ]; then
    bad "selftest: failed to write crafted stamp (file empty after write)"
    return 1
  fi
  return 0
}

printf '// selftest tmp file, staged then unstaged by selftest.sh\n' > "$tmp_file"
if git add "$tmp_file"; then
  real_head=$(git rev-parse HEAD)
  real_fp=$(worktree_fingerprint)
  fake_head=$(printf '%040d' 0)
  fake_fp=$(printf '%064d' 0)

  if write_stamp "{\"status\":\"green\",\"head\":\"$fake_head\",\"fingerprint\":\"$real_fp\",\"at\":\"1970-01-01T00:00:00Z\"}"; then
    out=$(commit_payload "git commit -m x" | scripts/factory/commit-gate.sh)
    assert_deny_reason "$out" \
      "commit gate: verify stamp head does not match current HEAD, re-run verify.sh" \
      "gate denies a green stamp with the wrong head"
  fi

  if write_stamp "{\"status\":\"green\",\"head\":\"$real_head\",\"fingerprint\":\"$fake_fp\",\"at\":\"1970-01-01T00:00:00Z\"}"; then
    out=$(commit_payload "git commit -m x" | scripts/factory/commit-gate.sh)
    assert_deny_reason "$out" \
      "commit gate: verify stamp fingerprint does not match worktree, re-run verify.sh" \
      "gate denies a green stamp with the wrong fingerprint"
  fi
else
  bad "selftest setup: could not stage $tmp_file -- skipping wrong-head/wrong-fingerprint cases"
fi

# tmp_file is only needed above; drop it now so it can't leak into the -a
# case below and make "everything staged is .md" trivially false for the
# wrong reason.
git rm --cached -q "$tmp_file" >/dev/null 2>&1
rm -f "$tmp_file"

# -- worktree_fingerprint with no untracked non-doc files (round 2 fix):
# under `set -o pipefail`, the old code made the `{...}` group's status the
# while loop's last body result, which was 1 (a false `[ -n "" ]`) whenever
# ls_out was empty -- the common case once this repo's own new files are
# committed. Verified in an isolated scratch repo so this never depends on
# (or disturbs) this repo's real untracked files.
fp_scratch=$(mktemp -d)
if [ -n "$fp_scratch" ] && (
    cd "$fp_scratch" &&
    git init -q &&
    git config user.email selftest@example.invalid &&
    git config user.name selftest &&
    echo one > a.txt &&
    git add a.txt &&
    git commit -q -m init
  ) >/dev/null 2>&1
then
  fp=$(cd "$fp_scratch" && . "$SCRIPT_DIR/lib.sh" && worktree_fingerprint)
  fp_rc=$?
  if [ "$fp_rc" -eq 0 ] && [ "${#fp}" -eq 64 ]; then
    ok "worktree_fingerprint returns 0 with a 64-char hash when nothing is untracked"
  else
    bad "worktree_fingerprint rc=$fp_rc len=${#fp} in a clean scratch repo (want rc=0, len=64)"
  fi
else
  bad "selftest setup: could not build the scratch repo for the fingerprint regression case"
fi
rm -rf "$fp_scratch"

# -- (-a bypass), isolated: staging only a .md file, with the tree
# otherwise clean (no unstaged non-doc changes), must still force the full
# checks for a broad commit (-a/-i/-p/pathspec) via is_broad_commit itself
# -- not via any incidental unstaged diff. A plain commit in the exact same
# state must be allowed, proving the -a flag (not something else) is what
# changed the outcome. Runs against a scratch repo with its own copy of
# lib.sh/commit-gate.sh, since commit-gate.sh always cd's to *its own*
# "../..", so this is fully isolated from this repo's real (possibly
# dirty) tree.
broad_scratch=$(mktemp -d)
if [ -n "$broad_scratch" ] && (
    mkdir -p "$broad_scratch/scripts/factory" &&
    cp "$SCRIPT_DIR/lib.sh" "$SCRIPT_DIR/commit-gate.sh" "$broad_scratch/scripts/factory/" &&
    chmod +x "$broad_scratch/scripts/factory/commit-gate.sh" &&
    cd "$broad_scratch" &&
    git init -q &&
    git config user.email selftest@example.invalid &&
    git config user.name selftest &&
    echo base > base.md &&
    git add base.md &&
    git commit -q -m init &&
    echo doc > doc.md &&
    git add doc.md
  ) >/dev/null 2>&1
then
  gate="$broad_scratch/scripts/factory/commit-gate.sh"
  out=$(commit_payload "git commit -m x" | "$gate")
  rc=$?
  if [ "$rc" -eq 0 ] && [ -z "$out" ]; then
    ok "plain commit is allowed when everything staged is .md and the tree is otherwise clean"
  else
    bad "plain commit rc=$rc out='$out' in the isolated all-.md/clean scratch repo (want allow)"
  fi

  out=$(commit_payload "git commit -a -m x" | "$gate")
  assert_deny_reason "$out" \
    "commit gate: verify stamp missing or malformed, re-run verify.sh" \
    "gate denies -a via the broad-commit path with an all-.md, otherwise-clean stage"
else
  bad "selftest setup: could not build the scratch repo for the isolated -a case"
fi
rm -rf "$broad_scratch"

# -- (T5d) restore the real stamp explicitly (not only via the EXIT trap)
# and assert byte-identical restoration with cmp; a failed write or
# restore is itself a failing case, not something [ -s ] can paper over.
if [ -n "$stamp_backup" ]; then
  if cp "$stamp_backup" .factory/last-verify.json; then
    if cmp -s .factory/last-verify.json "$stamp_backup_check"; then
      ok "restored stamp is byte-identical to the backup"
    else
      bad "restored stamp differs from the backup (cmp mismatch)"
    fi
  else
    bad "failed to restore .factory/last-verify.json from backup (cp returned non-zero)"
  fi
  rm -f "$stamp_backup" "$stamp_backup_check"
  stamp_backup=""
  stamp_backup_check=""
fi

# -- (T7a) stamp_fresh: passes on a fresh stamp and fails with each of the
# four reasons stamp_fresh documents. Isolated scratch repo (own HEAD, own
# worktree, own .factory/) so this never depends on -- or disturbs -- the
# real repo's stamp. lib.sh is sourced from this checkout by absolute path;
# only the scratch repo's files are touched.
stampfresh_scratch=$(mktemp -d)
if [ -n "$stampfresh_scratch" ] && (
    cd "$stampfresh_scratch" &&
    git init -q &&
    git config user.email selftest@example.invalid &&
    git config user.name selftest &&
    printf '.factory/\n' > .gitignore &&
    echo base > base.txt &&
    git add .gitignore base.txt &&
    git commit -q -m init &&
    mkdir -p .factory
  ) >/dev/null 2>&1
then
  sf_real_head=$(cd "$stampfresh_scratch" && git rev-parse HEAD)
  sf_real_fp=$(cd "$stampfresh_scratch" && . "$SCRIPT_DIR/lib.sh" && worktree_fingerprint)
  sf_bad_head=$(printf '%040x' 1)
  sf_bad_fp=$(printf '%064x' 1)

  # stampfresh_assert <label> <expected reason, or "" for a pass> :
  # captures only stderr (stdout is discarded -- stamp_fresh never writes
  # to it) so the exact reason string can be asserted.
  stampfresh_assert() {
    local label="$1" expected="$2" out rc
    out=$( ( cd "$stampfresh_scratch" && . "$SCRIPT_DIR/lib.sh" && stamp_fresh .factory/last-verify.json ) 2>&1 1>/dev/null )
    rc=$?
    if [ -z "$expected" ]; then
      if [ "$rc" -eq 0 ] && [ -z "$out" ]; then ok "$label"; else bad "$label (rc=$rc out='$out', want rc=0 empty)"; fi
    else
      if [ "$rc" -ne 0 ] && [ "$out" = "$expected" ]; then ok "$label"; else bad "$label (rc=$rc out='$out', want rc!=0 reason='$expected')"; fi
    fi
  }

  printf '{"status":"green","head":"%s","fingerprint":"%s","at":"2026-01-01T00:00:00Z"}' "$sf_real_head" "$sf_real_fp" > "$stampfresh_scratch/.factory/last-verify.json"
  stampfresh_assert "stamp_fresh passes on a fresh stamp" ""

  rm -f "$stampfresh_scratch/.factory/last-verify.json"
  stampfresh_assert "stamp_fresh fails on a missing stamp" "stamp missing/malformed"

  printf 'not json at all' > "$stampfresh_scratch/.factory/last-verify.json"
  stampfresh_assert "stamp_fresh fails on malformed stamp content" "stamp missing/malformed"

  printf '{"status":"red","head":"%s","fingerprint":"%s","at":"2026-01-01T00:00:00Z"}' "$sf_real_head" "$sf_real_fp" > "$stampfresh_scratch/.factory/last-verify.json"
  stampfresh_assert "stamp_fresh fails on a non-green stamp" "stamp not green"

  printf '{"status":"green","head":"%s","fingerprint":"%s","at":"2026-01-01T00:00:00Z"}' "$sf_bad_head" "$sf_real_fp" > "$stampfresh_scratch/.factory/last-verify.json"
  stampfresh_assert "stamp_fresh fails when head does not match HEAD" "stamp head != HEAD"

  printf '{"status":"green","head":"%s","fingerprint":"%s","at":"2026-01-01T00:00:00Z"}' "$sf_real_head" "$sf_bad_fp" > "$stampfresh_scratch/.factory/last-verify.json"
  stampfresh_assert "stamp_fresh fails when fingerprint does not match worktree" "stamp fingerprint != worktree"
else
  bad "selftest setup: could not build the scratch repo for the stamp_fresh cases"
fi
rm -rf "$stampfresh_scratch"

# -- (T7b) verify.sh --if-stale: hermetic scratch (own lib.sh/verify.sh, a
# stubbed instant-pass selftest.sh and npx, matching the existing
# redscratch pattern) -- runs a full check when the stamp is stale (no
# stamp yet), skips on the very next run (now fresh), then runs again once
# the tree changes.
ifstale_scratch=$(mktemp -d)
mkdir -p "$ifstale_scratch/scripts/factory" "$ifstale_scratch/fakebin"
cp "$SCRIPT_DIR/lib.sh" "$SCRIPT_DIR/verify.sh" "$ifstale_scratch/scripts/factory/"
chmod +x "$ifstale_scratch/scripts/factory/verify.sh"
printf '#!/usr/bin/env bash\nexit 0\n' > "$ifstale_scratch/scripts/factory/selftest.sh"
chmod +x "$ifstale_scratch/scripts/factory/selftest.sh"
printf '#!/usr/bin/env bash\nexit 0\n' > "$ifstale_scratch/fakebin/npx"
chmod +x "$ifstale_scratch/fakebin/npx"
if [ -n "$ifstale_scratch" ] && (
    cd "$ifstale_scratch" &&
    git init -q &&
    git config user.email selftest@example.invalid &&
    git config user.name selftest &&
    printf '.factory/\n' > .gitignore &&
    echo base > base.md &&
    git add base.md .gitignore &&
    git commit -q -m init
  ) >/dev/null 2>&1
then
  out1=$(cd "$ifstale_scratch" && PATH="$ifstale_scratch/fakebin:$PATH" scripts/factory/verify.sh --if-stale 2>&1)
  rc1=$?
  out2=$(cd "$ifstale_scratch" && PATH="$ifstale_scratch/fakebin:$PATH" scripts/factory/verify.sh --if-stale 2>&1)
  rc2=$?
  if [ "$rc1" -eq 0 ] && printf '%s\n' "$out1" | grep -qx 'VERIFY GREEN' && [ "$rc2" -eq 0 ] && [ "$out2" = "VERIFY SKIPPED (stamp fresh)" ]; then
    ok "verify.sh --if-stale runs a full check when stale, then skips (exact line) when fresh"
  else
    bad "verify.sh --if-stale rc1=$rc1 rc2=$rc2 out2='$out2' (want run-then-skip)"
  fi

  echo 'x' > "$ifstale_scratch/app.ts"
  out3=$(cd "$ifstale_scratch" && PATH="$ifstale_scratch/fakebin:$PATH" scripts/factory/verify.sh --if-stale 2>&1)
  rc3=$?
  if [ "$rc3" -eq 0 ] && printf '%s\n' "$out3" | grep -qx 'VERIFY GREEN' && [ "$out3" != "VERIFY SKIPPED (stamp fresh)" ]; then
    ok "verify.sh --if-stale runs (does not skip) once the tree changes"
  else
    bad "verify.sh --if-stale rc3=$rc3 out3='$out3' after a tree change (want a full GREEN run)"
  fi
else
  bad "selftest setup: could not build the scratch repo for the --if-stale case"
fi
rm -rf "$ifstale_scratch"

# -- (T7c) selftest skip line: same hermetic-scratch pattern. verify.sh
# (no flags) must print the exact skip line when scripts/factory is
# unchanged since HEAD, and must run selftest.sh (exact "== selftest" line,
# no skip line) once scripts/factory itself changes.
skipline_scratch=$(mktemp -d)
mkdir -p "$skipline_scratch/scripts/factory" "$skipline_scratch/fakebin"
cp "$SCRIPT_DIR/lib.sh" "$SCRIPT_DIR/verify.sh" "$skipline_scratch/scripts/factory/"
chmod +x "$skipline_scratch/scripts/factory/verify.sh"
printf '#!/usr/bin/env bash\nexit 0\n' > "$skipline_scratch/scripts/factory/selftest.sh"
chmod +x "$skipline_scratch/scripts/factory/selftest.sh"
printf '#!/usr/bin/env bash\nexit 0\n' > "$skipline_scratch/fakebin/npx"
chmod +x "$skipline_scratch/fakebin/npx"
if [ -n "$skipline_scratch" ] && (
    cd "$skipline_scratch" &&
    git init -q &&
    git config user.email selftest@example.invalid &&
    git config user.name selftest &&
    printf '.factory/\n' > .gitignore &&
    git add -A &&
    git commit -q -m init
  ) >/dev/null 2>&1
then
  out=$(cd "$skipline_scratch" && PATH="$skipline_scratch/fakebin:$PATH" scripts/factory/verify.sh 2>&1)
  if printf '%s\n' "$out" | grep -qx '== selftest (skipped: factory unchanged)' && ! printf '%s\n' "$out" | grep -qx '== selftest'; then
    ok "verify.sh prints the exact selftest-skipped line when scripts/factory is unchanged"
  else
    bad "verify.sh output did not show the expected skip line when factory unchanged: $out"
  fi

  echo '# touch' >> "$skipline_scratch/scripts/factory/verify.sh"
  out2=$(cd "$skipline_scratch" && PATH="$skipline_scratch/fakebin:$PATH" scripts/factory/verify.sh 2>&1)
  if printf '%s\n' "$out2" | grep -qx '== selftest' && ! printf '%s\n' "$out2" | grep -qx '== selftest (skipped: factory unchanged)'; then
    ok "verify.sh runs selftest (no skip line) once scripts/factory changes"
  else
    bad "verify.sh output did not run selftest after a factory change: $out2"
  fi
else
  bad "selftest setup: could not build the scratch repo for the selftest-skip-line case"
fi
rm -rf "$skipline_scratch"

# -- (T7d) gate_check parity: the hook wrapper (commit-gate.sh, JSON deny)
# and a direct call to gate_check (no JSON, no hook) must deny the same
# scenario with the identical reason string -- proving gate_check really is
# the single source of truth, not a copy.
gatecheck_scratch=$(mktemp -d)
if [ -n "$gatecheck_scratch" ] && (
    mkdir -p "$gatecheck_scratch/scripts/factory" &&
    cp "$SCRIPT_DIR/lib.sh" "$SCRIPT_DIR/commit-gate.sh" "$gatecheck_scratch/scripts/factory/" &&
    chmod +x "$gatecheck_scratch/scripts/factory/commit-gate.sh" &&
    cd "$gatecheck_scratch" &&
    git init -q &&
    git config user.email selftest@example.invalid &&
    git config user.name selftest &&
    echo base > base.md &&
    git add base.md &&
    git commit -q -m init &&
    echo 'x' > app.ts &&
    git add app.ts
  ) >/dev/null 2>&1
then
  expected="commit gate: verify stamp missing or malformed, re-run verify.sh"
  wrapper_out=$(commit_payload "git commit -m x" | "$gatecheck_scratch/scripts/factory/commit-gate.sh")
  wrapper_reason=$(deny_reason "$wrapper_out")
  if is_deny "$wrapper_out" && [ "$wrapper_reason" = "$expected" ]; then
    ok "gate_check denies via the hook wrapper with the expected reason"
  else
    bad "gate_check via wrapper: out='$wrapper_out' (want deny reason '$expected')"
  fi

  direct_reason=$( (cd "$gatecheck_scratch" && . scripts/factory/lib.sh && gate_check "git commit") )
  direct_rc=$?
  if [ "$direct_rc" -ne 0 ] && [ "$direct_reason" = "$expected" ]; then
    ok "gate_check denies the same way called directly (no hook wrapper)"
  else
    bad "gate_check direct: rc=$direct_rc reason='$direct_reason' (want rc!=0 reason='$expected')"
  fi
else
  bad "selftest setup: could not build the scratch repo for the gate_check wrapper/direct parity case"
fi
rm -rf "$gatecheck_scratch"

# -- (T7e) ship.sh: hermetic scratch, npx stubbed so verify's outcome is
# controllable without running real tsc/lint/vitest. Covers: refuses -a /
# --amend / --no-verify with an exact usage error and no commit; refuses
# (via verify.sh --if-stale) on a red/missing stamp and never commits;
# refuses (via its own gate_check call) a secret-looking staged file even
# when verify itself would be green -- the case a reviewer would look for
# to prove ship.sh cannot commit without going through the same checks;
# and commits with the new short SHA printed and git log advanced once
# everything is green; and (fix round 1, finding 2) `-- <paths>` refuses
# with an exact message when an untracked non-doc file remains alongside
# what was staged, but still commits when the only leftover is a .md file.
ship_scratch=$(mktemp -d)
mkdir -p "$ship_scratch/scripts/factory" "$ship_scratch/fakebin"
cp "$SCRIPT_DIR/lib.sh" "$SCRIPT_DIR/verify.sh" "$SCRIPT_DIR/ship.sh" "$ship_scratch/scripts/factory/"
chmod +x "$ship_scratch/scripts/factory/verify.sh" "$ship_scratch/scripts/factory/ship.sh"
printf '#!/usr/bin/env bash\nexit 0\n' > "$ship_scratch/scripts/factory/selftest.sh"
chmod +x "$ship_scratch/scripts/factory/selftest.sh"
printf '#!/usr/bin/env bash\nexit 1\n' > "$ship_scratch/fakebin/npx"
chmod +x "$ship_scratch/fakebin/npx"
if [ -n "$ship_scratch" ] && (
    cd "$ship_scratch" &&
    git init -q &&
    git config user.email selftest@example.invalid &&
    git config user.name selftest &&
    printf '.factory/\nfakebin/\n' > .gitignore &&
    git add -A &&
    git commit -q -m init
  ) >/dev/null 2>&1
then
  ship_head_before=$(cd "$ship_scratch" && git rev-parse HEAD)

  for bad_flag in -a --amend --no-verify; do
    expected_msg="ship.sh: $bad_flag is not accepted -- ship.sh always stages, verifies, and gates first"
    out=$(cd "$ship_scratch" && PATH="$ship_scratch/fakebin:$PATH" scripts/factory/ship.sh "$bad_flag" -m x 2>&1)
    rc=$?
    first_line=$(printf '%s\n' "$out" | head -1)
    head_after=$(cd "$ship_scratch" && git rev-parse HEAD)
    if [ "$rc" -eq 2 ] && [ "$head_after" = "$ship_head_before" ] && [ "$first_line" = "$expected_msg" ]; then
      ok "ship.sh refuses $bad_flag with an exact usage error and does not commit"
    else
      bad "ship.sh $bad_flag: rc=$rc first_line='$first_line' head_after='$head_after' (want rc=2, msg='$expected_msg', head unchanged)"
    fi
  done

  echo 'x' > "$ship_scratch/app.ts"
  out=$(cd "$ship_scratch" && PATH="$ship_scratch/fakebin:$PATH" scripts/factory/ship.sh -m "should not land" 2>&1)
  rc=$?
  head_after=$(cd "$ship_scratch" && git rev-parse HEAD)
  if [ "$rc" -ne 0 ] && [ "$head_after" = "$ship_head_before" ] && printf '%s\n' "$out" | grep -qx 'VERIFY RED'; then
    ok "ship.sh refuses to commit (via verify.sh --if-stale) on a red/missing stamp"
  else
    bad "ship.sh on red verify: rc=$rc out='$out' head_after='$head_after' (want rc!=0, head unchanged, VERIFY RED in output)"
  fi

  printf '#!/usr/bin/env bash\nexit 0\n' > "$ship_scratch/fakebin/npx"
  printf 'placeholder value, not a real secret\n' > "$ship_scratch/.env.local"
  out=$(cd "$ship_scratch" && PATH="$ship_scratch/fakebin:$PATH" scripts/factory/ship.sh -m "secret should not land" 2>&1)
  rc=$?
  head_after=$(cd "$ship_scratch" && git rev-parse HEAD)
  rm -f "$ship_scratch/.env.local"
  if [ "$rc" -ne 0 ] && [ "$head_after" = "$ship_head_before" ] && printf '%s\n' "$out" | grep -qx 'commit gate: secret-looking file staged'; then
    ok "ship.sh refuses (via its own gate_check call) a secret-looking staged file even though verify is green"
  else
    bad "ship.sh secret case: rc=$rc out='$out' head_after='$head_after' (want rc!=0, head unchanged, gate reason in output)"
  fi
  git -C "$ship_scratch" reset -q --hard "$ship_head_before" >/dev/null 2>&1
  printf '#!/usr/bin/env bash\nexit 0\n' > "$ship_scratch/fakebin/npx"
  echo 'real change' > "$ship_scratch/final.txt"

  out=$(cd "$ship_scratch" && PATH="$ship_scratch/fakebin:$PATH" scripts/factory/ship.sh -m "real commit" 2>&1)
  rc=$?
  new_head=$(cd "$ship_scratch" && git rev-parse HEAD)
  new_short=$(cd "$ship_scratch" && git rev-parse --short HEAD)
  log_msg=$(cd "$ship_scratch" && git log -1 --format=%s)
  if [ "$rc" -eq 0 ] && [ "$new_head" != "$ship_head_before" ] && [ "$log_msg" = "real commit" ] && printf '%s\n' "$out" | grep -qx "$new_short"; then
    ok "ship.sh commits, prints the new short SHA, and git log advances when everything is green"
  else
    bad "ship.sh on green: rc=$rc out='$out' new_head='$new_head' log_msg='$log_msg' (want rc=0, HEAD advanced, SHA printed)"
  fi

  # -- (fix round 1, finding 2) `ship.sh -- <paths>` must refuse when an
  # untracked (or otherwise unstaged) non-doc file remains in the worktree
  # alongside what was staged -- verify.sh's fingerprint covers the whole
  # worktree diff against HEAD, so it would go green even though that
  # leftover file was never part of what gets committed.
  base_head="$new_head"
  echo p1 > "$ship_scratch/p1.ts"
  echo p2 > "$ship_scratch/p2.ts"
  out=$(cd "$ship_scratch" && PATH="$ship_scratch/fakebin:$PATH" scripts/factory/ship.sh -m partial -- p1.ts 2>&1)
  rc=$?
  head_after=$(cd "$ship_scratch" && git rev-parse HEAD)
  expected_msg="ship: unverified non-doc changes remain in the worktree (stage them or stash them): p2.ts"
  if [ "$rc" -eq 3 ] && [ "$head_after" = "$base_head" ] && [ "$out" = "$expected_msg" ]; then
    ok "ship.sh -- <paths> refuses (exact message, HEAD unchanged) when an untracked non-doc file remains"
  else
    bad "ship.sh -- p1.ts with untracked p2.ts: rc=$rc out='$out' head_after='$head_after' (want rc=3, msg='$expected_msg', head unchanged)"
  fi
  rm -f "$ship_scratch/p1.ts" "$ship_scratch/p2.ts"
  git -C "$ship_scratch" reset -q --hard "$base_head" >/dev/null 2>&1

  # Same shape, but the only thing left behind is a .md file (exempt) --
  # must commit normally.
  echo p1 > "$ship_scratch/p1.ts"
  echo notes > "$ship_scratch/notes.md"
  out=$(cd "$ship_scratch" && PATH="$ship_scratch/fakebin:$PATH" scripts/factory/ship.sh -m "partial with doc leftover" -- p1.ts 2>&1)
  rc=$?
  head_after=$(cd "$ship_scratch" && git rev-parse HEAD)
  if [ "$rc" -eq 0 ] && [ "$head_after" != "$base_head" ] && [ -e "$ship_scratch/notes.md" ]; then
    ok "ship.sh -- <paths> commits normally when only an untracked .md file remains"
  else
    bad "ship.sh -- p1.ts with untracked notes.md: rc=$rc out='$out' head_after='$head_after' (want rc=0, HEAD advanced, notes.md left alone)"
  fi
  rm -f "$ship_scratch/notes.md"
else
  bad "selftest setup: could not build the scratch repo for the ship.sh cases"
fi
rm -rf "$ship_scratch"

echo
echo "selftest: $pass passed, $fail failed"
[ $fail -eq 0 ]
