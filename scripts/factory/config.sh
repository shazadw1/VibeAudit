# Repo-specific factory configuration. Installed from repo_runner templates.
# Edit this file in the target repo when its conventions differ from VibeAudit.

[ -n "${FACTORY_KIT_VERSION:-}" ] || FACTORY_KIT_VERSION=2026.09.25.3
[ -n "${FACTORY_PLAN_FILE:-}" ] || FACTORY_PLAN_FILE=docs/plan.md
[ -n "${FACTORY_NODE_MODULES_DIR:-}" ] || FACTORY_NODE_MODULES_DIR=node_modules
[ -n "${FACTORY_TYPECHECK_CMD:-}" ] || FACTORY_TYPECHECK_CMD='npx tsc --noEmit'
[ -n "${FACTORY_LINT_CMD:-}" ] || FACTORY_LINT_CMD='npx next lint --max-warnings=0'
[ -n "${FACTORY_TEST_CMD:-}" ] || FACTORY_TEST_CMD='npx vitest run'

# Required planning/controller inputs checked by preflight.
FACTORY_REQUIRED_DOCS=(
  docs/plan.md
  docs/checklist.md
  docs/Roadmap.md
  docs/FINDINGS.md
  CLAUDE.md
)

# Paths task-master.sh cross-checks a chosen lane against. A trailing
# slash means prefix match on a directory; anything else is an exact
# file match. Keep this in step with the repo's CLAUDE.md lane rules;
# the installer can seed it via --high-risk-path.
FACTORY_HIGH_RISK_PATHS=(
  lib/github/
  lib/stripe/
  lib/supabase/
  middleware.ts
  supabase/
  app/api/github/
  app/api/stripe/
  app/api/auth/
  app/api/fix/
  scripts/factory/
  .claude/
  skills/
  CLAUDE.md
)
