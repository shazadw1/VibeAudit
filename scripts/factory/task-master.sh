#!/usr/bin/env bash
# Deterministic front end for the task-master skill (skills/task-master/SKILL.md).
# Drafts a code-aware task brief from a docs/plan.md item using the
# .codegraph index. Never implements, approves, or queues anything: its
# only writes are under docs/tasks/. See skills/task-master/SKILL.md for
# the full behaviour contract this script exists to make deterministic.
#
# Usage: task-master.sh <item> --lane micro|standard|high-risk [--force]
#                        [--terms a,b,c] [--db <path>]
# Exit codes: 2 usage error, 3 plan item not found, 4 draft exists (no
# --force), 1 any other failure (e.g. broken git, unusable codegraph db
# path passed to --db is not itself fatal -- see "codegraph unavailable").
set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib.sh"
[ -f "$SCRIPT_DIR/config.sh" ] && . "$SCRIPT_DIR/config.sh"
cd "$SCRIPT_DIR/../.." || { echo "task-master: could not reach the repo root" >&2; exit 1; }
REPO_ROOT="$PWD"
CGQ="$SCRIPT_DIR/codegraph-query.py"

usage() {
  cat >&2 <<'USAGE'
usage: task-master.sh <item> --lane micro|standard|high-risk [--force] [--terms a,b,c] [--db <path>]
USAGE
}

item=""
lane=""
force=0
terms_opt=""
db_override=""

while [ $# -gt 0 ]; do
  case "$1" in
    --lane)
      [ $# -ge 2 ] || { echo "task-master: --lane requires an argument" >&2; usage; exit 2; }
      lane="$2"; shift 2 ;;
    --force)
      force=1; shift ;;
    --terms)
      [ $# -ge 2 ] || { echo "task-master: --terms requires an argument" >&2; usage; exit 2; }
      terms_opt="$2"; shift 2 ;;
    --db)
      [ $# -ge 2 ] || { echo "task-master: --db requires an argument" >&2; usage; exit 2; }
      db_override="$2"; shift 2 ;;
    -*)
      echo "task-master: unknown flag: $1" >&2
      usage
      exit 2 ;;
    *)
      if [ -n "$item" ]; then
        echo "task-master: unexpected argument: $1" >&2
        usage
        exit 2
      fi
      item="$1"; shift ;;
  esac
done

if [ -z "$item" ]; then
  echo "task-master: a plan item number is required" >&2
  usage
  exit 2
fi
if ! printf '%s' "$item" | grep -Eq '^[0-9]+$'; then
  echo "task-master: plan item must be a positive integer: $item" >&2
  usage
  exit 2
fi

# The lane is mandatory -- exact message, checked before any plan.md read
# or filesystem write (SKILL.md tells the assistant to stop and ask for a
# lane rather than guess; this is the deterministic half of that rule).
if [ -z "$lane" ]; then
  echo "task-master: a lane is required: --lane micro|standard|high-risk" >&2
  exit 2
fi
case "$lane" in
  micro|standard|high-risk) ;;
  *)
    echo "task-master: invalid lane: $lane (must be micro, standard, or high-risk)" >&2
    exit 2 ;;
esac

# Fail closed if git itself is broken, before touching docs/tasks/ -- same
# ethos as the other factory scripts (lib.sh's g()).
if ! g rev-parse HEAD >/dev/null 2>&1; then
  echo "task-master: git failed; is this a git repository? (see stderr hint above)" >&2
  exit 1
fi

plan_file="${FACTORY_PLAN_FILE:-docs/plan.md}"
item_block=""
if [ -f "$plan_file" ]; then
  item_block=$(awk -v n="$item" '
    /^### [0-9]+\./ {
      if (inblock) { exit }
      if ($0 ~ ("^### " n "\\. ")) { inblock = 1; print; next } else { inblock = 0; next }
    }
    inblock { print }
  ' "$plan_file")
fi
if [ -z "$item_block" ]; then
  echo "task-master: plan item $item not found in $plan_file" >&2
  exit 3
fi

title=$(printf '%s\n' "$item_block" | head -1 | sed -E "s/^### ${item}\\. //")

slug=$(printf '%s' "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')
slug="${slug:0:40}"
slug="${slug%-}"

draft_path="docs/tasks/drafts/P${item}-${slug}.md"

if [ -e "$draft_path" ] && [ "$force" -ne 1 ]; then
  echo "task-master: draft already exists: $draft_path (use --force to overwrite)" >&2
  exit 4
fi

# -- queue folders (idempotent) --
for d in drafts queued active done blocked failed; do
  mkdir -p "docs/tasks/$d"
  touch "docs/tasks/$d/.gitkeep"
done

# -- codegraph term extraction: backticked paths/identifiers from the plan
# item text, plus the --terms hint list. Sanitized to the leading
# path/identifier-shaped token (drops trailing prose like ": 0"). --
declare -a raw_terms=()
while IFS= read -r t; do
  [ -n "$t" ] && raw_terms+=("$t")
done < <(printf '%s\n' "$item_block" | grep -o '`[^`]*`' | sed -e 's/^`//' -e 's/`$//')

if [ -n "$terms_opt" ]; then
  IFS=',' read -ra hint_terms <<< "$terms_opt"
  for t in "${hint_terms[@]}"; do
    [ -n "$t" ] && raw_terms+=("$t")
  done
fi

declare -A seen_terms=()
declare -a terms=()
for t in "${raw_terms[@]}"; do
  sanitized=$(printf '%s' "$t" | grep -oE '^[A-Za-z0-9_./-]+' || true)
  [ -n "$sanitized" ] || continue
  [ -n "${seen_terms[$sanitized]:-}" ] && continue
  seen_terms["$sanitized"]=1
  terms+=("$sanitized")
done

# -- codegraph availability + staleness (via the status subcommand; see
# codegraph-query.py for the hash-compare + HEAD-commit-time staleness
# rule this reuses instead of re-deriving it in bash). --
db_args=()
[ -n "$db_override" ] && db_args=(--db "$db_override")

codegraph_available=1
stale="no"
stale_reasons=""
files_n=""
newest=""
status_err_file=$(mktemp)
status_out=$(python3 "$CGQ" "${db_args[@]}" status 2>"$status_err_file")
status_rc=$?
if [ "$status_rc" -ne 0 ]; then
  codegraph_available=0
else
  while IFS=$'\t' read -r tag v1 _v2; do
    case "$tag" in
      STALE) stale="$v1" ;;
      STALE_REASON) stale_reasons="${stale_reasons}${stale_reasons:+, }${v1}" ;;
      FILES) files_n="$v1" ;;
      NEWEST_INDEXED_AT) newest="$v1" ;;
    esac
  done <<< "$status_out"
fi
rm -f "$status_err_file"

newest_human="$newest"
if [ -n "$newest" ] && printf '%s' "$newest" | grep -Eq '^[0-9]+$'; then
  human=$(date -u -d "@$((newest / 1000))" +%FT%TZ 2>/dev/null || true)
  [ -n "$human" ] && newest_human="$human ($newest)"
fi

# -- gather per-term search + related results into the Codegraph Context
# section text; track every file_path seen for the routes/lane-conflict
# checks below. --
ctx_file=$(mktemp)
declare -A seen_files=()

if [ "$codegraph_available" -eq 1 ]; then
  printf 'index: %s, files: %s, stale: %s\n\n' "$newest_human" "$files_n" "$stale" >> "$ctx_file"
else
  printf '(codegraph unavailable -- see Approval Notes)\n\n' >> "$ctx_file"
fi

if [ "$codegraph_available" -eq 1 ]; then
  for term in "${terms[@]}"; do
    printf '### `%s`\n' "$term" >> "$ctx_file"
    printf '\n**Search results:**\n\n' >> "$ctx_file"
    found_any=0
    while IFS=$'\t' read -r kind name file_path start_line end_line is_exported; do
      [ -n "$kind" ] || continue
      found_any=1
      marker=""
      [ "$is_exported" = "1" ] && marker=" (exported)"
      printf -- '- %s `%s` — `%s:%s-%s`%s\n' "$kind" "$name" "$file_path" "$start_line" "$end_line" "$marker" >> "$ctx_file"
      [ -n "$file_path" ] && seen_files["$file_path"]=1
    done < <(python3 "$CGQ" "${db_args[@]}" search "$term" --limit 10 2>/dev/null)
    [ "$found_any" -eq 0 ] && printf -- '- (no codegraph matches)\n' >> "$ctx_file"

    printf '\n**Related (edges) and unresolved references:**\n\n' >> "$ctx_file"
    found_related=0
    while IFS=$'\t' read -r tag f2 f3 f4 f5 f6; do
      case "$tag" in
        EDGE)
          found_related=1
          line_txt=""
          [ -n "$f6" ] && line_txt=" (line $f6)"
          printf -- '- edge %s (%s) `%s` in `%s`%s\n' "$f2" "$f3" "$f4" "$f5" "$line_txt" >> "$ctx_file"
          ;;
        UNRESOLVED)
          found_related=1
          printf -- '- unresolved %s `%s` in `%s`\n' "$f3" "$f2" "$f4" >> "$ctx_file"
          ;;
      esac
    done < <(python3 "$CGQ" "${db_args[@]}" related "$term" --limit 15 2>/dev/null)
    [ "$found_related" -eq 0 ] && printf -- '- (none)\n' >> "$ctx_file"
    printf '\n' >> "$ctx_file"
  done

  if [ "${#seen_files[@]}" -gt 0 ]; then
    printf '### Files in scope\n\n' >> "$ctx_file"
    while IFS= read -r fp; do
      [ -n "$fp" ] || continue
      printf -- '- `%s`\n' "$fp" >> "$ctx_file"
      while IFS=$'\t' read -r kind name qname start_line end_line signature; do
        [ -n "$kind" ] || continue
        sig_txt=""
        [ -n "$signature" ] && sig_txt=" — signature: \`$signature\`"
        printf -- '  - exported %s `%s` (`%s:%s-%s`)%s\n' "$kind" "$name" "$fp" "$start_line" "$end_line" "$sig_txt" >> "$ctx_file"
      done < <(python3 "$CGQ" "${db_args[@]}" symbols "$fp" 2>/dev/null)
    done < <(printf '%s\n' "${!seen_files[@]}" | sort)
    printf '\n' >> "$ctx_file"
  fi

  printf '### Routes\n\n' >> "$ctx_file"
  route_found=0
  while IFS= read -r fp; do
    [ -n "$fp" ] || continue
    if [[ "$fp" =~ ^app/.*/route\.(ts|tsx|js)$ ]]; then
      printf -- '- `%s`\n' "$fp" >> "$ctx_file"
      route_found=1
    fi
  done < <(printf '%s\n' "${!seen_files[@]}" | sort)
  [ "$route_found" -eq 0 ] && printf -- '- (none found among the files above)\n' >> "$ctx_file"
  printf '\n' >> "$ctx_file"

  printf '### Likely tests\n\n' >> "$ctx_file"
  test_found=0
  while IFS= read -r fp; do
    [ -n "$fp" ] || continue
    if [[ "$fp" == *"__tests__"* || "$fp" == *.test.* ]]; then
      printf -- '- `%s`\n' "$fp" >> "$ctx_file"
      test_found=1
    fi
  done < <(printf '%s\n' "${!seen_files[@]}" | sort)
  [ "$test_found" -eq 0 ] && printf -- '- (none found among the files above -- add prose here if the assistant knows of a relevant test path)\n' >> "$ctx_file"
fi

codegraph_context=$(cat "$ctx_file")
rm -f "$ctx_file"

# -- lane conflict check: compare the discovered file list against the repo's
# high-risk path list (config.sh FACTORY_HIGH_RISK_PATHS, which should mirror
# that repo's own CLAUDE.md "Lanes" section).
#
# This list used to be hardcoded here to VibeAudit's product layout, which
# shipped unchanged to every repo: outside VibeAudit it matched none of the
# repo's own sensitive paths, so the warning could never fire where it
# mattered. The fallback below is the factory's own control surface only --
# high-risk everywhere by definition -- so an older config.sh that predates
# the variable still gets a correct, if narrower, check rather than another
# repo's paths.
# declare -p guards the ${#...} under `set -u`: an unset array would abort the
# script. Note "${arr[@]+x}" is NOT a usable guard here -- for an unset array
# it expands to zero words, so [ -n "${arr[@]+x}" ] collapses to [ -n ] and
# tests the literal string "-n", which is always true.
if declare -p FACTORY_HIGH_RISK_PATHS >/dev/null 2>&1 \
   && [ "${#FACTORY_HIGH_RISK_PATHS[@]}" -gt 0 ]; then
  HIGH_RISK_PATHS=("${FACTORY_HIGH_RISK_PATHS[@]}")
else
  HIGH_RISK_PATHS=(scripts/factory/ .claude/ skills/ CLAUDE.md)
fi
declare -a matched=()
while IFS= read -r fp; do
  [ -n "$fp" ] || continue
  for hp in "${HIGH_RISK_PATHS[@]}"; do
    case "$hp" in
      */)
        case "$fp" in
          "$hp"*) matched+=("$fp"); break ;;
        esac
        ;;
      *)
        [ "$fp" = "$hp" ] && { matched+=("$fp"); break; }
        ;;
    esac
  done
done < <(printf '%s\n' "${!seen_files[@]}" | sort)

approval_notes=""
if [ "$codegraph_available" -eq 0 ]; then
  approval_notes="${approval_notes}WARNING: codegraph unavailable, context section is empty"$'\n'
fi
if [ "$codegraph_available" -eq 1 ] && [ "$stale" = "yes" ]; then
  approval_notes="${approval_notes}WARNING: codegraph index is stale (${stale_reasons:-reason unknown}); re-indexing is a human decision, not this script's"$'\n'
fi
if [ "$lane" != "high-risk" ] && [ "${#matched[@]}" -gt 0 ]; then
  matched_str=$(printf '%s, ' "${matched[@]}")
  matched_str="${matched_str%, }"
  approval_notes="${approval_notes}WARNING: lane $lane but touched paths match high-risk: ${matched_str}"$'\n'
fi
approval_notes="${approval_notes}TBD: open questions (assistant: add any here per skills/task-master/SKILL.md)."

created_at=$(date -u +%FT%TZ)

{
  printf -- '---\n'
  printf 'id: P%s\n' "$item"
  printf 'title: %s\n' "$title"
  printf 'lane: %s\n' "$lane"
  printf 'status: draft\n'
  printf 'approval: pending\n'
  printf 'plan_item: %s\n' "$item"
  printf 'plan_status_owner: runner\n'
  printf 'source: %s#%s\n' "$plan_file" "$item"
  printf 'created_at: %s\n' "$created_at"
  printf 'runner_eligible: false\n'
  printf -- '---\n\n'
  printf '## Problem\nTBD\n\n'
  printf '## Codegraph Context\n%s\n\n' "$codegraph_context"
  printf '## In Scope\nTBD\n\n'
  printf '## Out of Scope\nTBD\n\n'
  printf '## Implementation Tasks\n- [ ] TBD\n\n'
  printf '## Acceptance Criteria\n- TBD\n\n'
  printf '## Verification\nTBD\n\n'
  printf '## Approval Notes\n%s\n' "$approval_notes"
} > "$draft_path"

echo "$draft_path"
exit 0
