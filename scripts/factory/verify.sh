#!/usr/bin/env bash
# Deterministic verification: selftest, typecheck, lint, unit tests.
# Records a signed stamp (head + worktree fingerprint) for the commit gate.
set -u
set -o pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/../.."
mkdir -p .factory

echo "== selftest"
if ! scripts/factory/selftest.sh; then
  echo "VERIFY RED (selftest failed)"
  exit 1
fi

head=$(g rev-parse HEAD)
if [ -z "$head" ]; then
  echo "VERIFY RED (git rev-parse HEAD failed)"
  exit 1
fi

rc=0
echo "== tsc --noEmit";  npx tsc --noEmit               || rc=1
echo "== next lint";     npx next lint --max-warnings=0 || rc=1
echo "== vitest";        npx vitest run                 || rc=1

fingerprint=$(worktree_fingerprint) || fingerprint=""
if [ -z "$fingerprint" ]; then
  echo "worktree_fingerprint failed (git error?) -- forcing red"
  rc=1
fi
at=$(date -u +%FT%TZ)
status=green; [ $rc -eq 0 ] || status=red
printf '{"status":"%s","head":"%s","fingerprint":"%s","at":"%s"}\n' "$status" "$head" "$fingerprint" "$at" > .factory/last-verify.json
[ $rc -eq 0 ] && echo "VERIFY GREEN" || echo "VERIFY RED"
exit $rc
