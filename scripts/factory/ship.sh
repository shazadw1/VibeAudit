#!/usr/bin/env bash
# The only sanctioned way to commit. Its own `git commit` runs inside this
# script, so the live PreToolUse hook (commit-gate.sh) never sees it as a
# separate Bash tool call -- that is why this script calls gate_check
# itself, right before committing, instead of relying on the hook to catch
# it. The hook remains the backstop for any raw `git commit` typed
# directly outside this script.
#
# Usage: ship.sh -m "<message>" [-- <paths>...]
#        ship.sh -F <file>      [-- <paths>...]
# Without `--`, stages everything (git add -A); with `--`, stages only the
# given paths instead.
#
# Not accepted, ever: -a, --amend, --no-verify, or any other raw
# passthrough flag -- ship.sh always stages, verifies (stamp-aware), and
# gates before it commits; there is no way to skip any of those three.
set -u
set -o pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib.sh"
cd "$SCRIPT_DIR/../.."

usage() {
  cat >&2 <<'USAGE'
usage: ship.sh -m "<message>" [-- <paths>...]
       ship.sh -F <file>      [-- <paths>...]
Stages (git add -A, or only <paths> after --), runs verify.sh --if-stale,
then gate_check, then commits. Not accepted: -a, --amend, --no-verify, or
any other raw git-commit flag.
USAGE
}

msg=""; msg_file=""; have_m=0; have_F=0
paths_given=0
paths=()

while [ $# -gt 0 ]; do
  case "$1" in
    -m)
      [ $# -ge 2 ] || { echo "ship.sh: -m requires an argument" >&2; usage; exit 2; }
      msg="$2"; have_m=1; shift 2 ;;
    -F)
      [ $# -ge 2 ] || { echo "ship.sh: -F requires an argument" >&2; usage; exit 2; }
      msg_file="$2"; have_F=1; shift 2 ;;
    -a|--amend|--no-verify)
      echo "ship.sh: $1 is not accepted -- ship.sh always stages, verifies, and gates first" >&2
      usage
      exit 2 ;;
    --)
      shift
      paths=("$@")
      paths_given=1
      break ;;
    -*)
      echo "ship.sh: unknown flag: $1" >&2
      usage
      exit 2 ;;
    *)
      echo "ship.sh: unexpected argument: $1" >&2
      usage
      exit 2 ;;
  esac
done

if [ "$have_m" -eq 1 ] && [ "$have_F" -eq 1 ]; then
  echo "ship.sh: pass either -m or -F, not both" >&2
  usage
  exit 2
fi
if [ "$have_m" -eq 0 ] && [ "$have_F" -eq 0 ]; then
  echo "ship.sh: -m or -F is required" >&2
  usage
  exit 2
fi
if [ "$paths_given" -eq 1 ] && [ "${#paths[@]}" -eq 0 ]; then
  echo "ship.sh: -- was given with no paths" >&2
  usage
  exit 2
fi

if ! err=$(ensure_factory_dir 2>&1); then
  echo "ship.sh: ${err:-.factory/ not usable}" >&2
  exit 1
fi

if [ "$paths_given" -eq 1 ]; then
  if ! g add -- "${paths[@]}"; then
    echo "ship.sh: git add failed" >&2
    exit 1
  fi
else
  if ! g add -A; then
    echo "ship.sh: git add -A failed" >&2
    exit 1
  fi
fi

# After staging (either form), refuse if any non-doc path in the worktree
# still has content git add didn't capture -- untracked ("??") or modified
# again after staging ("MM", " M", etc). This matters most for `-- <paths>`:
# verify.sh's fingerprint covers the *whole* worktree diff against HEAD, so
# it would go green even with an untracked file sitting right next to what
# was staged; that untracked file would then never be part of the commit,
# but was never verified as excluded either. .md paths are exempt, same as
# gate_check's doc-only exemption.
porcelain=$(g status --porcelain -- . ':!*.md')
porcelain_rc=$?
if [ "$porcelain_rc" -ne 0 ]; then
  echo "ship.sh: git status --porcelain failed" >&2
  exit 1
fi
unverified=$(printf '%s\n' "$porcelain" | awk 'length($0) >= 2 && substr($0,2,1) != " "')
if [ -n "$unverified" ]; then
  first_path=$(printf '%s\n' "$unverified" | head -1 | cut -c4-)
  printf 'ship: unverified non-doc changes remain in the worktree (stage them or stash them): %s\n' "$first_path" >&2
  exit 3
fi

verify_out=$(scripts/factory/verify.sh --if-stale 2>&1)
verify_rc=$?
printf '%s\n' "$verify_out"
if [ "$verify_rc" -ne 0 ]; then
  echo "ship.sh: verify.sh --if-stale failed, not committing" >&2
  exit 1
fi

gate_reason=$(gate_check "git commit")
gate_rc=$?
if [ "$gate_rc" -ne 0 ]; then
  printf '%s\n' "$gate_reason" >&2
  echo "ship.sh: commit gate denied, not committing" >&2
  exit 1
fi

if [ "$have_m" -eq 1 ]; then
  g commit -m "$msg" >/dev/null
else
  g commit -F "$msg_file" >/dev/null
fi
commit_rc=$?
if [ "$commit_rc" -ne 0 ]; then
  echo "ship.sh: git commit failed" >&2
  exit 1
fi

sha=$(g rev-parse --short HEAD)
if [ -z "$sha" ]; then
  echo "ship.sh: commit appears to have succeeded but could not read the new SHA" >&2
  exit 1
fi
echo "$sha"
exit 0
