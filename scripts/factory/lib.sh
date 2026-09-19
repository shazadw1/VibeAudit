# Shared helpers for the factory scripts. Source, don't execute.
# Fail-closed git: any script that sources this must treat a broken git
# (e.g. "dubious ownership") as a hard failure, not a silent pass.

# g <git args...>  -- run git, and on failure print a hint and return the
# real exit code instead of letting the caller's `|| true`/unchecked-$?
# habits paper over it.
g() {
  git "$@"
  local rc=$?
  if [ "$rc" -ne 0 ]; then
    printf 'factory: git failed: git %s\n' "$*" >&2
    printf 'factory: hint: git config --global --add safe.directory %s\n' "$PWD" >&2
  fi
  return "$rc"
}

# worktree_fingerprint -- sha256 over the non-doc working tree state: the
# diff against HEAD plus the content hash of every untracked non-md file.
# Two callers (verify.sh, commit-gate.sh) must compute this identically.
# Every git call goes through `g`; on any git failure this prints nothing
# and returns non-zero, so a caller that forgets to check `$?`/emptiness
# gets an empty (never a fake-valid) fingerprint.
worktree_fingerprint() {
  local diff_out ls_out
  diff_out=$(g diff HEAD -- . ':!*.md') || return 1
  ls_out=$(g ls-files --others --exclude-standard -- . ':!*.md') || return 1
  {
    printf '%s\n' "$diff_out"
    printf '%s\n' "$ls_out" | while IFS= read -r f; do
      [ -n "$f" ] || continue
      printf '%s ' "$f"
      sha256sum "$f"
    done
    # Under `set -o pipefail` (all callers), this group's own exit status
    # feeds the pipeline below. Without this, an empty $ls_out makes the
    # while loop's last body evaluate `[ -n "" ]` -> false, so the group
    # (and thus the whole function) would return 1 despite a good hash --
    # i.e. the common case of "no untracked non-doc files" would falsely
    # fail closed forever. Force the group to a deterministic success.
    true
  } | sha256sum | cut -d' ' -f1
}

# validate_stamp <path> -- true only if <path> is a readable regular file
# holding exactly one line of compact JSON with exactly the keys
# status,head,fingerprint,at (in that order, as written by verify.sh),
# status is "green" or "red", head is 40 lowercase hex chars, fingerprint
# is 64 lowercase hex chars. Pure bash + grep; no jq dependency. Anchored
# on both ends so an extra key, truncation, or a wrong-length hash all
# fail -- there is no partial-credit match.
validate_stamp() {
  local path="${1:-}" content
  [ -n "$path" ] || return 1
  [ -f "$path" ] && [ -r "$path" ] || return 1
  content=$(cat -- "$path" 2>/dev/null) || return 1
  [ -n "$content" ] || return 1
  case "$content" in
    *$'\n'*) return 1 ;;  # command substitution only strips *trailing*
                          # newlines, so an embedded one means >1 line.
  esac
  printf '%s' "$content" | grep -Eq '^\{"status":"(green|red)","head":"[0-9a-f]{40}","fingerprint":"[0-9a-f]{64}","at":"[^"]*"\}$'
}

# ensure_factory_dir [dir] -- default ".factory". Creates it if missing;
# fails (non-zero, message to stderr naming owner and mode) if it exists
# but is not a directory, is not writable by the current user, if
# <dir>/last-verify.json exists but is not both readable and writable by
# the current user, or if <dir>/last-verify.json.tmp exists but is not
# writable by the current user (verify.sh's atomic write needs to be able
# to overwrite or remove a leftover .tmp, e.g. left by the other OS user
# or an interrupted run). Never touches anything else under <dir>.
ensure_factory_dir() {
  local dir="${1:-.factory}" stamp stamp_tmp owner mode
  if [ ! -e "$dir" ]; then
    if ! mkdir -p -- "$dir" 2>/dev/null; then
      printf 'factory: could not create %s\n' "$dir" >&2
      return 1
    fi
  fi
  owner=$(stat -c %U -- "$dir" 2>/dev/null || echo unknown)
  mode=$(stat -c %a -- "$dir" 2>/dev/null || echo unknown)
  if [ ! -d "$dir" ]; then
    printf 'factory: %s exists but is not a directory (owner: %s, mode: %s)\n' "$dir" "$owner" "$mode" >&2
    return 1
  fi
  if [ ! -w "$dir" ]; then
    printf 'factory: %s is not writable by this user (owner: %s, mode: %s)\n' "$dir" "$owner" "$mode" >&2
    return 1
  fi
  stamp="$dir/last-verify.json"
  if [ -e "$stamp" ]; then
    owner=$(stat -c %U -- "$stamp" 2>/dev/null || echo unknown)
    mode=$(stat -c %a -- "$stamp" 2>/dev/null || echo unknown)
    if [ ! -r "$stamp" ] || [ ! -w "$stamp" ]; then
      printf 'factory: %s is not readable and writable by this user (owner: %s, mode: %s)\n' "$stamp" "$owner" "$mode" >&2
      return 1
    fi
  fi
  stamp_tmp="$dir/last-verify.json.tmp"
  if [ -e "$stamp_tmp" ]; then
    owner=$(stat -c %U -- "$stamp_tmp" 2>/dev/null || echo unknown)
    mode=$(stat -c %a -- "$stamp_tmp" 2>/dev/null || echo unknown)
    if [ ! -w "$stamp_tmp" ]; then
      printf 'factory: %s is not writable by this user (owner: %s, mode: %s)\n' "$stamp_tmp" "$owner" "$mode" >&2
      return 1
    fi
  fi
  return 0
}

# stamp_fresh [path] -- default ".factory/last-verify.json". True only if
# the stamp at <path> validates (validate_stamp), is "green", and its head
# and fingerprint match the current HEAD and worktree_fingerprint exactly.
# Prints the first failing reason to stderr and nothing to stdout; every
# git call goes through `g`/worktree_fingerprint, so a broken git makes the
# head/fingerprint comparison fail (never falsely "fresh"). Used by
# verify.sh --if-stale and the standard-lane reviewer to skip re-running a
# check that the current tree already satisfies.
stamp_fresh() {
  local path="${1:-.factory/last-verify.json}" stamp status head fp cur_head cur_fp
  if ! validate_stamp "$path"; then
    printf 'stamp missing/malformed\n' >&2
    return 1
  fi
  stamp=$(cat -- "$path" 2>/dev/null)
  status=$(printf '%s' "$stamp" | sed -E 's/^\{"status":"([^"]*)".*$/\1/')
  head=$(printf '%s' "$stamp" | sed -E 's/^\{"status":"[^"]*","head":"([^"]*)".*$/\1/')
  fp=$(printf '%s' "$stamp" | sed -E 's/^\{"status":"[^"]*","head":"[^"]*","fingerprint":"([^"]*)".*$/\1/')
  if [ "$status" != "green" ]; then
    printf 'stamp not green\n' >&2
    return 1
  fi
  cur_head=$(g rev-parse HEAD 2>/dev/null)
  if [ "$head" != "$cur_head" ]; then
    printf 'stamp head != HEAD\n' >&2
    return 1
  fi
  cur_fp=$(worktree_fingerprint)
  if [ -z "$cur_fp" ] || [ "$fp" != "$cur_fp" ]; then
    printf 'stamp fingerprint != worktree\n' >&2
    return 1
  fi
  return 0
}

# factory_changed -- true (0) if any path under scripts/factory/ shows up in
# `git diff HEAD --name-only` (staged or unstaged) or in the untracked-files
# list; false (1) only when git succeeds and finds neither. Fails closed:
# any git failure returns 0 (treat as "changed", i.e. run the full check)
# rather than silently skipping. Used by verify.sh to decide whether
# selftest.sh needs to run.
factory_changed() {
  local diff_out untracked_out
  diff_out=$(g diff HEAD --name-only -- scripts/factory/) || return 0
  [ -n "$diff_out" ] && return 0
  untracked_out=$(g ls-files --others --exclude-standard -- scripts/factory/) || return 0
  [ -n "$untracked_out" ] && return 0
  return 1
}

# gate_check <command-string> -- the commit gate's decision logic. This is
# the single source of truth: commit-gate.sh (the live PreToolUse hook) and
# ship.sh both call this; neither reimplements a check. Returns 0 to allow;
# on deny, prints the exact reason (plain text, one line, no JSON -- the
# hook wrapper adds the JSON envelope) to stdout and returns 1. Reason
# strings are byte-identical to the pre-refactor commit-gate.sh so every
# existing selftest case keeps passing unchanged. Does its own cd to the
# repo root (relative to lib.sh's own location, the same trick
# commit-gate.sh used via its own SCRIPT_DIR) so it works whether called
# from the real repo or a selftest/ship.sh scratch copy, without requiring
# git to already be healthy at call time.
gate_check() {
  local cmd="${1:-}"
  local lib_dir
  lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
  if [ -z "$lib_dir" ] || ! cd "$lib_dir/../.." 2>/dev/null; then
    printf 'commit gate: could not reach the repo root; add safe.directory?\n'
    return 1
  fi

  # Helpers local to this check, redefined each call. `_gate_deny` only
  # prints; the caller (this function) must `return 1` right after --
  # mirrors the old commit-gate.sh `deny()`+`exit 0`, but as a function this
  # cannot itself terminate the whole calling process.
  _gate_deny() { printf '%s\n' "$1"; }
  _gate_deny_if_failed() { [ "$1" -eq 0 ] && return 0; _gate_deny "commit gate: git failed ($2); add safe.directory?"; return 1; }
  _gate_is_broad_commit() {
    printf '%s' "$1" | grep -Eq -- '(^|[^A-Za-z0-9_-])-[A-Za-z]*[aip][A-Za-z]*([[:space:]]|=|$)' && return 0
    printf '%s' "$1" | grep -Eq -- '(^|[[:space:]])--(all|include|patch)([[:space:]=]|$)' && return 0
    printf '%s' "$1" | grep -Eq -- '[[:space:]]--[[:space:]]+[^[:space:]]' && return 0
    return 1
  }

  local ENV_RE='(^|/)\.env(\..*)?$|\.pem$|\.key$'
  local SECRET_RE='^\+.*(sk-ant-[a-z0-9-]{20,}|sk_live_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (RSA |EC )?PRIVATE KEY)'

  local broad=0; _gate_is_broad_commit "$cmd" && broad=1

  # 1. no secrets staged
  local staged staged_diff
  staged=$(g diff --cached --name-only); _gate_deny_if_failed $? "git diff --cached --name-only" || return 1
  if printf '%s\n' "$staged" | grep -Eq "$ENV_RE"; then _gate_deny "commit gate: secret-looking file staged"; return 1; fi
  staged_diff=$(g diff --cached); _gate_deny_if_failed $? "git diff --cached" || return 1
  if printf '%s\n' "$staged_diff" | grep -Eq "$SECRET_RE"; then
    printf '%s\n' "$staged" | grep -q '__tests__' || { _gate_deny "commit gate: secret pattern in staged diff"; return 1; }
  fi

  # 1b. a broad commit (-a/-i/-p/pathspec) can pull in unstaged content that
  # --cached never saw; scan the full HEAD diff too in that case.
  if [ "$broad" -eq 1 ]; then
    local head_names head_diff
    head_names=$(g diff HEAD --name-only); _gate_deny_if_failed $? "git diff HEAD --name-only" || return 1
    if printf '%s\n' "$head_names" | grep -Eq "$ENV_RE"; then _gate_deny "commit gate: secret-looking file in unstaged diff"; return 1; fi
    head_diff=$(g diff HEAD); _gate_deny_if_failed $? "git diff HEAD" || return 1
    if printf '%s\n' "$head_diff" | grep -Eq "$SECRET_RE"; then
      printf '%s\n' "$head_names" | grep -q '__tests__' || { _gate_deny "commit gate: secret pattern in unstaged diff"; return 1; }
    fi
  fi

  # 2. decide whether this is safely doc-only: every staged path ends .md, no
  # broad flag/pathspec, and no unstaged non-doc changes (staged == verified).
  git diff --quiet -- . ':!*.md'
  local dq=$?
  [ "$dq" -le 1 ] || { _gate_deny "commit gate: git failed (git diff --quiet); add safe.directory?"; return 1; }

  local doc_only_safe=1
  printf '%s\n' "$staged" | grep -Evq '\.md$' && doc_only_safe=0
  [ "$broad" -eq 0 ] || doc_only_safe=0
  [ "$dq" -eq 0 ] || doc_only_safe=0

  # 3. non-doc (or unsafe-to-exempt) commits: the tree must be exactly what
  # verify.sh checked.
  if [ "$doc_only_safe" -eq 0 ]; then
    validate_stamp .factory/last-verify.json || { _gate_deny "commit gate: verify stamp missing or malformed, re-run verify.sh"; return 1; }
    local stamp stamp_status stamp_head stamp_fingerprint head fp
    stamp=$(cat .factory/last-verify.json)
    stamp_status=$(printf '%s' "$stamp" | sed -E 's/^\{"status":"([^"]*)".*$/\1/')
    stamp_head=$(printf '%s' "$stamp" | sed -E 's/^\{"status":"[^"]*","head":"([^"]*)".*$/\1/')
    stamp_fingerprint=$(printf '%s' "$stamp" | sed -E 's/^\{"status":"[^"]*","head":"[^"]*","fingerprint":"([^"]*)".*$/\1/')

    head=$(g rev-parse HEAD); _gate_deny_if_failed $? "git rev-parse HEAD" || return 1
    fp=$(worktree_fingerprint)
    [ $? -eq 0 ] && [ -n "$fp" ] || { _gate_deny "commit gate: could not compute worktree fingerprint; add safe.directory?"; return 1; }

    [ "$stamp_status" = "green" ] || { _gate_deny "commit gate: last verify was not green"; return 1; }
    [ "$stamp_head" = "$head" ] || { _gate_deny "commit gate: verify stamp head does not match current HEAD, re-run verify.sh"; return 1; }
    [ "$stamp_fingerprint" = "$fp" ] || { _gate_deny "commit gate: verify stamp fingerprint does not match worktree, re-run verify.sh"; return 1; }
    [ "$dq" -eq 0 ] || { _gate_deny "commit gate: unstaged non-doc changes present, stage or stash them before committing"; return 1; }
  fi
  return 0
}
