# Phased Fix & Completion Plan — VibeAudit

References: [../FINDINGS.md](../FINDINGS.md) · [../original_description.md](../original_description.md) · [../Roadmap.md](../Roadmap.md) · [checklist.md](checklist.md)

The main launch risk is product honesty: the headline "Autonomous PR Fix Engine" is demoed as working in the promo video but is explicitly simulated in code. The second launch risk is commercial readiness: billing, plan limits, coupons, and admin-editable commercial settings must be verified before paid traffic.

## Status Legend

`Not Started` · `In Progress` · `Done` · `Needs Verification`

## Phase Gates

| Phase | Launch meaning | Gate |
|---|---|---|
| Phase 0 — Production Blockers | Private staging or clearly labelled beta only | Marketing honesty, billing safety, admin hardening, webhook idempotency, and commercial controls are addressed |
| Phase 1 — Minimum Paid Launch | Limited public paid launch | Plans, scan/fix limits, coupons, usage accounting, and operator reporting are operational |
| Phase 2 — Product Claim Alignment | Broader marketing launch | Autonomous PRs, dashboards, monitoring, certificates, Copilot, and sandbox claims are real or corrected |
| Phase 3 — Expansion | Post-MVP | Enterprise security workflows, richer integrations, and historical risk intelligence |

---

## Phase 0 — Production Blockers

### 1. Fix the fabricated testimonial on the landing page
- **Status:** Done (2026-09-19, factory run 1; other fictional testimonials and PR claims remain, see items 13/14)
- **Priority:** Critical
- **What:** `components/marketing/landing-client.tsx` includes a customer quote claiming the autonomous PR generator opened GitHub PRs. Remove/rewrite it while the backend returns `not_implemented`.

### 2. Verify billing and entitlement safety
- **Status:** Not Started
- **Priority:** Critical
- **What:** Verify Stripe price resolution, checkout, customer portal, subscription updates, cancelation, failed payment states, webhook signature validation, webhook idempotency, and entitlement enforcement.
- **Launch check:** Upgrades modify one existing subscription and cannot create duplicate active subscriptions.

### 3. Add admin-editable commercial settings
- **Status:** Not Started
- **Priority:** Critical
- **What:** Store plans, limits, included scan/fix budgets, provider pricing, coupon rules, and feature flags in the database with an instance-admin UI.
- **Launch check:** Admin can change commercial policy without code edits or redeploying.

### 4. Scope repository fetching to the GitHub App installation
- **Status:** Needs Verification (2026-09-20, factory runner; see P4-scope-repository-fetching-to-the-github.md)
- **Priority:** Critical
- **What:** `lib/github/fetch-repo.ts` authenticates with a single operator token, not the installation Octokit; any logged-in user can scan any repo that token can read, and rows are stored with `installation_id: 0`. Resolve repos to the requester's `repos` row, fetch through the installation token, and restrict `app/svc/scan` to unauthenticated public reads. See [implementation_plan.md §0.1](implementation_plan.md#part-0--prerequisites-surfaced-in-review).
- **Launch check:** User A cannot trigger a scan of a repo not connected to their own installation, via either route.

### 5. Label or remove the fixture Copilot page's fabricated claims
- **Status:** Done (2026-09-20, factory runner; see P5-label-or-remove-the-fixture-copilot-page.md)
- **Priority:** Critical
- **What:** `components/dashboard/copilot-client.tsx` (502 lines, fixture-only) returns canned replies claiming an "Autonomous PR #117" was opened and that analysis ran "in volatile AWS Nitro memory". Same honesty problem as the testimonial in item 1. Label the page demo or remove the fabricated content. Note: [Roadmap.md](../Roadmap.md) §4 says no Copilot feature was found; this page is it.

### 17. Harden `parseRepoInput` path handling
- **Status:** Not Started
- **Priority:** Low
- **What:** The deferred "Minor" half of [implementation_plan.md §0.1](implementation_plan.md#part-0--prerequisites-surfaced-in-review), left out of item 4 as a separate cleanup: `parseRepoInput` in `lib/github/fetch-repo.ts` lets `?`, `#`, and `..` through into the API path. Impact is low because the host is fixed, but `encodeURIComponent` the owner and repo segments and reject the three characters outright.
- **Launch check:** A crafted `owner/repo` string cannot alter the API path or reach an unintended endpoint.

---

## Phase 1 — Minimum Paid Launch

### 6. Define and enforce plan usage limits
- **Status:** Not Started
- **Priority:** Critical
- **What:** Set daily/monthly limits for scans, connected repos, monitored repos, fix-generation attempts, certificates, exports, API usage, and team seats.
- **Launch check:** Limits are enforced server-side for UI and direct API calls.

### 7. Implement coupons and launch promotions
- **Status:** Not Started
- **Priority:** Critical
- **What:** Support percentage off for life, fixed price for life, fixed monthly discount/price, one-off discount, and first-N-month discounts.
- **Launch check:** Coupon eligibility, redemption caps, expiry, Stripe sync, audit logs, and abuse controls are server-side.

### 8. Add operator reporting
- **Status:** Not Started
- **Priority:** High
- **What:** Show MRR, active subscriptions, scan volume, AI/fix-generation cost, coupon usage, failed webhooks, failed payments, high-usage accounts, and GitHub integration failures.

### 18. Build usage metering and AI cost accounting
- **Status:** Not Started
- **Priority:** High
- **What:** Item 6 lands the `usage_events` ledger and enforcement; this item makes usage cost-aware. Record provider cost per AI fix and Copilot call (input/output tokens, model, provider, internal cost), spend plan-included budget before purchased top-up credits, reset included budget each billing period without rollover, grant only the prorated delta on mid-cycle upgrades, and charge or refund once per fix attempt. See `docs/checklist.md` "Usage Limits" lines 115-121 and "Cost, Budget, Credits" line 321. Depends on item 3 for where budgets and provider pricing are stored.
- **Launch check:** A fix attempt debits the right budget exactly once, and the operator report in item 8 can show real cost per account.

### 19. Replace in-memory rate limiting and add abuse controls
- **Status:** Not Started
- **Priority:** High
- **What:** `lib/rate-limit.ts` is per-instance and in-memory, so limits reset on redeploy and do not hold across instances. Move to Redis/Upstash or Postgres, then add the controls item 6 deliberately left out: daily caps to contain account compromise and scripted abuse, public-endpoint controls by IP/user agent/repository target, scan status polling limits, and GitHub webhook event rate controls with delivery-ID dedupe. See `docs/checklist.md` "Usage Limits" lines 111 and 122-125.
- **Launch check:** Limits survive a redeploy and hold across instances; a scripted caller cannot exhaust a plan's month in a single burst.

### 20. Surface limit-reached states in the product
- **Status:** Not Started
- **Priority:** Medium
- **What:** Item 6 returns a machine-readable 402 (`code: "plan_limit_exceeded"` with `limit` and `upgrade`) but nothing renders it. Show the blocked state, the usage against each limit, and the upgrade path in the dashboard and on each gated action, and show current usage on the billing settings page. See `docs/checklist.md` "Upgrade Options" lines 138-139.
- **Launch check:** A free user who hits the scan limit sees why, what resets it, and how to upgrade, without reading a network response.

---

## Phase 2 — Product Claim Alignment

### 9. Build the real Autonomous PR Fix Engine
- **Status:** Not Started
- **Priority:** High
- **What:** Replace the simulated response in `app/api/fix/generate/route.ts` with real patch generation and GitHub PR creation, or explicitly mark the feature beta/simulated in product copy. Design constraints in [implementation_plan.md §0.4](implementation_plan.md#part-0--prerequisites-surfaced-in-review): pin to the scanned SHA, separate write permissions, validate the diff, treat repo content as untrusted prompt input, idempotency per finding+SHA. Decide fix metering first — see [competitor_research.md §(d)](competitor_research.md#d-unit-economics-of-real-autofix--added-in-review).

### 10. Wire the four fixture-only dashboard pages to real data
- **Status:** Not Started
- **Priority:** Medium
- **What:** Build backend data/API support for Fleet, Red Team, Analytics, and Compliance dashboards.

### 11. Add finding suppression, baseline mode, and scoring revision
- **Status:** Not Started
- **Priority:** High
- **What:** Inline `vibeaudit-ignore` comments, a `.vibeaudit.yml` for per-rule enable/severity/path excludes, and a diff-baseline mode; revise `lib/scan/scorer.ts` (dedupe, per-category caps) before rule packs widen. Prerequisite for the CI gate in the next item. See [implementation_plan.md §0.2–0.3](implementation_plan.md#part-0--prerequisites-surfaced-in-review).
- **Launch check:** A repo with the current false-positive-prone `missing-auth` hits can suppress them and still pass the gate.

### 12. Wire auto re-scan on push
- **Status:** Not Started
- **Priority:** Medium
- **What:** Trigger the scan pipeline from verified GitHub `push` webhooks and surface results as GitHub Check Runs with annotations. Constraints: respond `202` within GitHub's 10-second delivery timeout and process out-of-band; dedupe on delivery ID; do not build on SARIF/code-scanning upload, which is unavailable on private repos without paid GitHub Code Security. See [implementation_plan.md](implementation_plan.md#cicd-gate--real-continuous-monitoring--build-this-right-after-baas-security-and-after-part-0).

### 13. Verify/clarify claimed-but-unconfirmed features
- **Status:** Not Started
- **Priority:** Low
- **What:** Confirm certificates, Copilot/security Q&A, interactive sandbox preview, and scan-worker behavior before marketing them.

### 14. Clarify promo video discrepancy
- **Status:** Not Started
- **Priority:** Low
- **What:** Promo video references "Vanta Audit" / "thebeautytie.com"; clarify or replace the asset.

---

## Phase 3 — Expansion

### 15. Enterprise security workflows
- **Status:** Not Started
- **Priority:** Strategic
- **What:** Add richer rule packs, custom policies, team workflows, remediation SLAs, evidence exports, and historical risk reporting. Rule packs (BaaS, secrets, SCA, provenance) and the declarative rule schema are specified in [implementation_plan.md](implementation_plan.md).

### 16. Controlled fix-review workflow
- **Status:** Not Started
- **Priority:** Strategic
- **What:** Add preview, approval, branch naming, PR update/retry, and rollback controls around AI-generated fixes.

## Validation Method

For every completed fix, validate anonymous, logged-in, over-limit, billing, webhook-replay, and GitHub integration cases. Then update [checklist.md](checklist.md) with evidence before moving the item to launch-ready.
