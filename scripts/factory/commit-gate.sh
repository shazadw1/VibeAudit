#!/usr/bin/env bash
# PreToolUse hook on Bash. Thin wrapper only: reads the hook JSON on stdin,
# and for any command matching a git-commit phrase, calls gate_check
# (lib.sh) -- the single source of truth for the decision logic -- and
# turns a non-zero return into the hook's deny JSON. Never acts on a
# non-commit command. See lib.sh:gate_check for the actual checks.
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

reason=$(gate_check "$cmd")
rc=$?
if [ "$rc" -ne 0 ]; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$reason"
fi
exit 0
