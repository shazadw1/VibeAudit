#!/usr/bin/env bash
# Deterministic verification: selftest, typecheck, lint, unit tests.
# Records a signed stamp (head + worktree fingerprint) for the commit gate.
# Flags:
#   --if-stale  exit 0 immediately with "VERIFY SKIPPED (stamp fresh)" when
#               the current stamp already validates against HEAD/worktree
#               (stamp_fresh); otherwise falls through to a normal run.
#   --full      force selftest.sh to run regardless of factory_changed.
# Without --full, selftest.sh only runs when scripts/factory/ itself has
# changed (factory_changed); otherwise a skip line is printed instead.
set -u
set -o pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/../.."

if_stale=0; full=0
for arg in "$@"; do
  case "$arg" in
    --if-stale) if_stale=1 ;;
    --full) full=1 ;;
    *) printf 'verify.sh: unknown argument: %s\n' "$arg" >&2; exit 2 ;;
  esac
done

if [ "$if_stale" -eq 1 ] && stamp_fresh 2>/dev/null; then
  echo "VERIFY SKIPPED (stamp fresh)"
  exit 0
fi

stamp_file=.factory/last-verify.json
stamp_tmp=.factory/last-verify.json.tmp

# red <message>: the one exit path for every RED outcome. Prints the
# message, then removes the stamp (and any .tmp) before exiting 1, so a
# run that fails before it ever gets to write a fresh stamp -- broken
# .factory/, a failing selftest, a bad HEAD, a failed write/mv, or a
# stamp that doesn't validate right after being written -- can never
# leave a previous GREEN stamp in place for the commit gate to trust.
red() {
  printf '%s\n' "$1"
  rm -f -- "$stamp_file" "$stamp_tmp"
  exit 1
}

if ! err=$(ensure_factory_dir 2>&1); then
  red "VERIFY RED (${err:-.factory/ not usable})"
fi

if [ "$full" -eq 1 ]; then
  run_selftest=1
elif factory_changed; then
  run_selftest=1
else
  run_selftest=0
fi

if [ "$run_selftest" -eq 1 ]; then
  echo "== selftest"
  if ! scripts/factory/selftest.sh; then
    red "VERIFY RED (selftest failed)"
  fi
else
  echo "== selftest (skipped: factory unchanged)"
fi

head=$(g rev-parse HEAD)
if ! printf '%s' "$head" | grep -Eq '^[0-9a-f]{40}$'; then
  red "VERIFY RED (git rev-parse HEAD did not return a 40-char hex hash)"
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

# Clear any leftover .tmp (e.g. from a prior interrupted run, or the
# other OS user) before writing, so a stale .tmp can never shadow or
# block this run's write.
rm -f -- "$stamp_tmp"
if ! printf '{"status":"%s","head":"%s","fingerprint":"%s","at":"%s"}\n' "$status" "$head" "$fingerprint" "$at" > "$stamp_tmp"; then
  red "VERIFY RED (could not write $stamp_tmp)"
fi
if ! mv -- "$stamp_tmp" "$stamp_file"; then
  red "VERIFY RED (could not move stamp into place)"
fi
if ! validate_stamp "$stamp_file"; then
  red "VERIFY RED (stamp invalid after write)"
fi

[ $rc -eq 0 ] && echo "VERIFY GREEN" || echo "VERIFY RED"
exit $rc
