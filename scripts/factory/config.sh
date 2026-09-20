# Repo-specific factory configuration. Installed from repo_runner templates.
# Edit this file in the target repo when its conventions differ from VibeAudit.

: "${FACTORY_PLAN_FILE:=docs/plan.md}"
: "${FACTORY_TYPECHECK_CMD:=npx tsc --noEmit}"
: "${FACTORY_LINT_CMD:=npx next lint --max-warnings=0}"
: "${FACTORY_TEST_CMD:=npx vitest run}"

# Required planning/controller inputs checked by preflight.
FACTORY_REQUIRED_DOCS=(
  docs/plan.md
  docs/checklist.md
  docs/Roadmap.md
  docs/FINDINGS.md
  CLAUDE.md
)
