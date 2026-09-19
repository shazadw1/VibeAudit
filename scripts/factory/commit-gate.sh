#!/usr/bin/env bash
# PreToolUse hook on Bash. Blocks `git commit` unless: git itself is healthy,
# no secrets staged (or, for a broad commit, unstaged), and (for non-doc
# commits) the staged tree matches a green verify.sh stamp exactly.
# Reads the hook JSON on stdin; only acts when the command is a git commit.
set -u
set -o pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib.sh"

input=$(cat)
if command -v jq >/dev/null; then cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty'); else cmd=$(printf '%s' "$input" | grep -o '"command":"[^"]*"' | head -1); fi
# Matches "git commit", "git  commit" (extra spaces), "git -C x commit",
# "ls && git commit", etc., but not "git status" or a "git-commit-helper"
# binary. Heuristic, not a real shell parser -- errs toward over-matching.
printf '%s' "$cmd" | grep -Eq '(^|[;&|] *)git\b[^;&|]* commit\b' || exit 0

deny() { printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"; exit 0; }
# deny_if_failed <rc> <label>: call right after `x=$(g ...)` with rc="$?".
# Note: deny() must never run *inside* a `$(...)` capture -- its exit only
# kills that subshell, so the JSON would be swallowed into the variable
# instead of reaching the gate's real stdout. Always check rc afterward,
# in the main shell, as done below.
deny_if_failed() { [ "$1" -eq 0 ] || deny "commit gate: git failed ($2); add safe.directory?"; }

cd "$SCRIPT_DIR/../.." 2>/dev/null || deny "commit gate: could not reach the repo root; add safe.directory?"

ENV_RE='(^|/)\.env(\..*)?$|\.pem$|\.key$'
SECRET_RE='^\+.*(sk-ant-[a-z0-9-]{20,}|sk_live_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (RSA |EC )?PRIVATE KEY)'
# is_broad_commit: true if the command could sweep in unstaged content that
# `git diff --cached` never saw: -a/--all, -i/--include, -p/--patch (alone
# or in a short-option cluster like -am), or a pathspec after "--".
is_broad_commit() {
  printf '%s' "$1" | grep -Eq -- '(^|[^A-Za-z0-9_-])-[A-Za-z]*[aip][A-Za-z]*([[:space:]]|=|$)' && return 0
  printf '%s' "$1" | grep -Eq -- '(^|[[:space:]])--(all|include|patch)([[:space:]=]|$)' && return 0
  printf '%s' "$1" | grep -Eq -- '[[:space:]]--[[:space:]]+[^[:space:]]' && return 0
  return 1
}
broad=0; is_broad_commit "$cmd" && broad=1

# 1. no secrets staged
staged=$(g diff --cached --name-only); deny_if_failed $? "git diff --cached --name-only"
if printf '%s\n' "$staged" | grep -Eq "$ENV_RE"; then deny "commit gate: secret-looking file staged"; fi
staged_diff=$(g diff --cached); deny_if_failed $? "git diff --cached"
if printf '%s\n' "$staged_diff" | grep -Eq "$SECRET_RE"; then
  printf '%s\n' "$staged" | grep -q '__tests__' || deny "commit gate: secret pattern in staged diff"
fi

# 1b. a broad commit (-a/-i/-p/pathspec) can pull in unstaged content that
# --cached never saw; scan the full HEAD diff too in that case.
if [ "$broad" -eq 1 ]; then
  head_names=$(g diff HEAD --name-only); deny_if_failed $? "git diff HEAD --name-only"
  if printf '%s\n' "$head_names" | grep -Eq "$ENV_RE"; then deny "commit gate: secret-looking file in unstaged diff"; fi
  head_diff=$(g diff HEAD); deny_if_failed $? "git diff HEAD"
  if printf '%s\n' "$head_diff" | grep -Eq "$SECRET_RE"; then
    printf '%s\n' "$head_names" | grep -q '__tests__' || deny "commit gate: secret pattern in unstaged diff"
  fi
fi

# 2. decide whether this is safely doc-only: every staged path ends .md, no
# broad flag/pathspec, and no unstaged non-doc changes (staged == verified).
git diff --quiet -- . ':!*.md'
dq=$?
[ "$dq" -le 1 ] || deny "commit gate: git failed (git diff --quiet); add safe.directory?"

doc_only_safe=1
printf '%s\n' "$staged" | grep -Evq '\.md$' && doc_only_safe=0
[ "$broad" -eq 0 ] || doc_only_safe=0
[ "$dq" -eq 0 ] || doc_only_safe=0

# 3. non-doc (or unsafe-to-exempt) commits: the tree must be exactly what
# verify.sh checked.
if [ "$doc_only_safe" -eq 0 ]; then
  [ -f .factory/last-verify.json ] || deny "commit gate: run scripts/factory/verify.sh and get it green first"
  stamp=$(cat .factory/last-verify.json)
  head=$(g rev-parse HEAD); deny_if_failed $? "git rev-parse HEAD"
  fp=$(worktree_fingerprint)
  [ $? -eq 0 ] && [ -n "$fp" ] || deny "commit gate: could not compute worktree fingerprint; add safe.directory?"
  case "$stamp" in
    *'"status":"green"'*) ;;
    *) deny "commit gate: last verify was not green" ;;
  esac
  case "$stamp" in
    *"\"head\":\"$head\""*) ;;
    *) deny "commit gate: verify stamp head does not match current HEAD, re-run verify.sh" ;;
  esac
  case "$stamp" in
    *"\"fingerprint\":\"$fp\""*) ;;
    *) deny "commit gate: verify stamp fingerprint does not match worktree, re-run verify.sh" ;;
  esac
  [ "$dq" -eq 0 ] || deny "commit gate: unstaged non-doc changes present, stage or stash them before committing"
fi
exit 0
