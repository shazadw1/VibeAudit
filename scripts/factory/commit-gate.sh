#!/usr/bin/env bash
# PreToolUse hook on Bash. Blocks `git commit` unless: no secrets staged and last verify was green.
# Reads the hook JSON on stdin; only acts when the command contains "git commit".
set -u
cd "$(dirname "$0")/../.." 2>/dev/null || exit 0
input=$(cat)
if command -v jq >/dev/null; then cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty'); else cmd=$(printf '%s' "$input" | grep -o '"command":"[^"]*"' | head -1); fi
printf '%s' "$cmd" | grep -q 'git commit' || exit 0

deny() { printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"; exit 0; }

# 1. no secrets staged
if git diff --cached --name-only | grep -Eq '(^|/)\.env(\..*)?$|\.pem$|\.key$'; then deny "commit gate: secret-looking file staged"; fi
if git diff --cached | grep -Eq '^\+.*(sk-ant-[a-z0-9-]{20,}|sk_live_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (RSA |EC )?PRIVATE KEY)'; then
  git diff --cached --name-only | grep -q '__tests__' || deny "commit gate: secret pattern in staged diff"
fi
# 2. last verify green (docs-only commits are exempt)
if git diff --cached --name-only | grep -Evq '\.md$'; then
  [ -f .factory/last-verify.json ] && grep -q '"green"' .factory/last-verify.json || deny "commit gate: run scripts/factory/verify.sh and get it green first"
fi
exit 0
