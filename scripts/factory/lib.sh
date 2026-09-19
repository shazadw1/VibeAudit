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
