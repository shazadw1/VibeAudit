# Roadmap — Launch Phases From Listing Audit

This documents functionality claimed in the individual Flippa listing ([original_description.md](../original_description.md)) that the code audit ([FINDINGS.md](FINDINGS.md)) found to be incomplete or not built. The work is ordered by launch risk, not by feature attractiveness.

## Phase 0 — Production Blockers

**Launch state:** Do not launch publicly with current marketing claims. Use private staging or a clearly labelled beta only.

1. **Marketing honesty blocker**
   - Autonomous PR generation is demoed and testified as working, but the backend returns `simulated: true` / `not_implemented`.
   - Launch gate: either implement real PR generation or remove/label every claim, testimonial, and demo assertion as simulated.

2. **Billing and entitlement safety**
   - Verify checkout, portal, subscription lifecycle, webhook idempotency, and upgrade behavior.
   - Launch gate: users cannot create duplicate active subscriptions during upgrades, unknown Stripe prices fail safely, and paid features enforce server-side entitlement.

3. **Profile/admin hardening**
   - Verify user profile plan state cannot be escalated outside trusted webhook/admin paths.
   - Launch gate: admin/commercial settings are restricted and audit logged.

4. **Commercial launch controls**
   - Plans, limits, internal scan/AI budgets, provider pricing, fix-generation costs, coupons, and promotion rules must be database-backed and editable by the instance admin.

## Phase 1 — Minimum Paid Launch

**Launch state:** Limited paid launch is acceptable after Phase 0 passes and the product is honest about incomplete premium features.

1. **Plan and usage limits**
   - Define per-plan scan limits, repo limits, fix-generation limits, monitoring cadence, team seats, export/certificate limits, and API limits.
   - Enforce daily/monthly limits server-side and record cost for scans and AI-assisted fixes.

2. **Coupons and launch promotions**
   - Support percentage off for life, fixed price for life, fixed monthly discount/price, one-off discount, and first-N-month promotions.
   - Include redemption caps, eligibility, expiry, Stripe sync behavior, abuse controls, and audit logs.

3. **Operator reporting**
   - Add visibility for MRR, scan volume, AI/fix-generation cost, coupon usage, failed webhooks, failed payments, high-risk accounts, and GitHub integration failures.

## Phase 2 — Product Claim Alignment

**Launch state:** Broader marketing launch when signature features are real.

1. Build real Autonomous PR Fix Engine or reposition it as beta/simulated.
2. Wire fleet, red-team, analytics, and compliance dashboards to real data.
3. Trigger auto re-scans and GitHub checks on push events.
4. Verify certificates, Copilot/security Q&A, sandbox preview, and scan-worker claims before marketing them.
5. Remove or clarify the promo video mismatch around "Vanta Audit" and "thebeautytie.com".

## Phase 3 — Product Expansion

**Launch state:** Post-MVP differentiation after scans, billing, and claims are stable.

1. Add deeper rule packs, custom policies, richer compliance evidence, enterprise reporting, and team workflows.
2. Build a controlled fix-review workflow before opening or updating PRs.
3. Add historical risk trends, fleet topology from real integrations, and customer-visible remediation SLAs.

---

## Detailed Audit Items

### 1. Autonomous PR Fix Engine — claimed working, confirmed not implemented

`app/api/fix/generate/route.ts` returns an explicitly flagged simulated response. No real PR is opened. The Anthropic SDK and route structure exist, but AI patch generation and PR creation still need to be built.

### 2. Four dashboard pages — fixture-only

`components/dashboard/{fleet,redteam,analytics,compliance}-client.tsx` use hardcoded fixture arrays and have no real backend/API integration.

### 3. Continuous monitoring — webhook received but no auto re-scan

`app/api/github/webhook/route.ts` verifies and receives `push` events, but only logs them. It does not trigger a scan or GitHub status check.

### 4. Claimed but not independently verified

Downloadable executive security certificates, Copilot/security Q&A, interactive sandbox preview, and the scan-worker service need direct verification before marketing.

## Also Flagged

The promotional video closes with "Vanta Audit" / "thebeautytie.com" instead of VibeAudit AI / vibeauditai.com. Clarify whether this is a transcription artifact or reused asset.

## Not On This List

The 9 detection rules, RLS/HMAC/Stripe/rate-limiting infrastructure, GitHub OAuth + magic-link login, and GitHub App repo sync were independently verified as genuinely implemented in [FINDINGS.md](FINDINGS.md).
