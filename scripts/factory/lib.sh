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
