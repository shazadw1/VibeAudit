#!/usr/bin/env bash
# Deterministic verification: typecheck, lint, unit tests. Records result for the commit gate.
set -u
cd "$(dirname "$0")/../.."
mkdir -p .factory
rc=0
echo "== tsc --noEmit";  npx tsc --noEmit            || rc=1
echo "== next lint";     npx next lint --max-warnings=0 || rc=1
echo "== vitest";        npx vitest run              || rc=1
if [ $rc -eq 0 ]; then
  printf '{"status":"green","head":"%s","at":"%s"}\n' "$(git rev-parse HEAD)" "$(date -u +%FT%TZ)" > .factory/last-verify.json
  echo "VERIFY GREEN"
else
  printf '{"status":"red","head":"%s","at":"%s"}\n' "$(git rev-parse HEAD)" "$(date -u +%FT%TZ)" > .factory/last-verify.json
  echo "VERIFY RED"
fi
exit $rc
