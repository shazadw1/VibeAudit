#!/usr/bin/env bash
# Factory preflight: confirm everything the loop depends on is in place.
# Run at the start of every session and before picking a task.
# Exit 0 = all required checks pass. Exit 1 = at least one required check failed.
# Usage: scripts/factory/preflight.sh [--quick]   (--quick skips tsc/lint/tests)
set -u
cd "$(dirname "$0")/../.."
QUICK=0; [ "${1:-}" = "--quick" ] && QUICK=1
fail=0; warn=0
ok()   { printf '  [ok]   %s\n' "$1"; }
bad()  { printf '  [FAIL] %s\n' "$1"; fail=1; }
warnf(){ printf '  [warn] %s\n' "$1"; warn=1; }

echo "== Factory preflight =="

echo "-- toolchain"
for t in node npm git; do command -v "$t" >/dev/null && ok "$t: $(command -v $t)" || bad "$t missing"; done
command -v jq >/dev/null && ok "jq present" || warnf "jq missing (hooks fall back to grep)"
[ -d node_modules ] && ok "node_modules installed" || bad "node_modules missing -> run: npm ci"
[ -x node_modules/.bin/vitest ] && ok "vitest installed" || bad "vitest missing -> run: npm i -D vitest"

echo "-- source-of-truth docs readable"
for f in Roadmap.md FINDINGS.md docs/plan.md docs/checklist.md docs/implementation_plan.md docs/competitor_research.md docs/coding_factory_fit.md CLAUDE.md; do
  if [ -r "$f" ]; then
    [ -w "$f" ] && ok "$f (rw)" || warnf "$f readable but not writable (owner: $(stat -c %U "$f"))"
  else
    bad "$f not readable (owner: $(stat -c %U "$f" 2>/dev/null || echo missing)) -> chmod g+rw $f"
  fi
done

echo "-- factory wiring"
[ -f .claude/settings.json ] && ok ".claude/settings.json (hooks)" || bad ".claude/settings.json missing"
for a in implementer reviewer; do [ -f ".claude/agents/$a.md" ] && ok "subagent $a" || bad "subagent .claude/agents/$a.md missing"; done
for s in scripts/factory/verify.sh scripts/factory/commit-gate.sh; do [ -x "$s" ] && ok "$s executable" || bad "$s missing or not executable"; done
for sk in brainstorming writing-plans subagent-driven-development requesting-code-review verification-before-completion; do
  [ -d "$HOME/.claude/skills/$sk" ] && ok "skill $sk" || warnf "skill $sk not installed globally (superpowers)"
done
git check-ignore -q .claude/settings.json && bad ".claude/settings.json is gitignored (fix .gitignore)" || ok ".claude tracked"

echo "-- git"
branch=$(git rev-parse --abbrev-ref HEAD); [ "$branch" = "main" ] && warnf "on main; factory work belongs on dev or a feature branch" || ok "branch $branch"
[ -n "$(git status --porcelain)" ] && warnf "working tree has uncommitted changes" || ok "working tree clean"
[ -f .env.local ] && warnf ".env.local present: never read or print it" || ok "no .env.local"

if [ $QUICK -eq 0 ]; then
  echo "-- verification baseline"
  if scripts/factory/verify.sh >/tmp/factory-verify.log 2>&1; then ok "verify.sh green (tsc, lint, tests)"; else bad "verify.sh failed -> see /tmp/factory-verify.log"; fi
fi

echo
if [ $fail -ne 0 ]; then echo "PREFLIGHT FAILED: fix the [FAIL] items before starting a task."; exit 1; fi
[ $warn -ne 0 ] && echo "PREFLIGHT OK with warnings." || echo "PREFLIGHT OK."
exit 0
