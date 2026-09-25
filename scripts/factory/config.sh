# Repo-specific factory configuration. Installed from repo_runner templates.
# Edit this file in the target repo when its conventions differ from VibeAudit.

[ -n "${FACTORY_KIT_VERSION:-}" ] || FACTORY_KIT_VERSION=2026.09.25.1
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
