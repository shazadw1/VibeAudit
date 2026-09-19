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
cleanup() {
  git rm --cached -q "$tmp_file" >/dev/null 2>&1
  rm -f "$tmp_file"
  if [ -n "$stamp_backup" ]; then mv "$stamp_backup" .factory/last-verify.json; fi
}

if [ -f .factory/last-verify.json ]; then
  candidate=$(mktemp) || { bad "selftest setup: mktemp failed for stamp backup"; exit 1; }
  if cp .factory/last-verify.json "$candidate" && [ -s "$candidate" ]; then
    stamp_backup="$candidate"
  else
    rm -f "$candidate"
    bad "selftest setup: could not back up .factory/last-verify.json -- aborting before touching it"
    echo; echo "selftest: $pass passed, $fail failed"
    exit 1
  fi
fi
trap cleanup EXIT

write_stamp() {
  printf '%s\n' "$1" > .factory/last-verify.json
  [ -s .factory/last-verify.json ] || { bad "selftest: failed to write crafted stamp"; return 1; }
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
    "commit gate: run scripts/factory/verify.sh and get it green first" \
    "gate denies -a via the broad-commit path with an all-.md, otherwise-clean stage"
else
  bad "selftest setup: could not build the scratch repo for the isolated -a case"
fi
rm -rf "$broad_scratch"

echo
echo "selftest: $pass passed, $fail failed"
[ $fail -eq 0 ]
