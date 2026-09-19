# Launch Readiness Checklist

This checklist is for deciding whether VibeAudit is viable to launch without security, billing, trust, or product-claim surprises. The app has real Supabase/RLS, GitHub webhook verification, Stripe checkout/webhooks, rate limiting, and a deterministic scan engine. The largest launch risk is not the scanner basics; it is commercial billing maturity and marketing promises around autonomous PR fixes, live dashboards, continuous monitoring, and certificates.

Status legend:
- `[ ]` Not verified or not done
- `[x]` Verified in code
- `[!]` Must verify or fix before launch

## Launch Decision

- [!] Do not launch paid plans until existing-subscriber upgrades update the current Stripe subscription instead of creating a second active subscription.
- [!] Do not launch paid plans until plans, internal AI/fix budgets, model pricing, scan limits, markup, and coupon rules are database-backed and editable by the instance admin from UI.
- [!] Do not market autonomous PR fixes as live until `app/api/fix/generate/route.ts` opens real GitHub PRs instead of returning `simulated: true`.
- [!] Do not market continuous monitoring as catching risky pushes until GitHub push webhooks actually enqueue rescans and surface results.
- [!] Do not market analytics, fleet topology, compliance evidence, or red-team pages as live product data until fixture-only dashboards are backed by real tables/API routes.
- [!] Do not market certificates as cryptographic/verifiable until certificate generation and verification are fully implemented and tested.
- [!] Do not launch until Stripe checkout, portal, webhook, duplicate webhook, upgrade, downgrade, cancellation, renewal, failed payment, and coupon paths are tested end to end.
- [!] Do not launch until all production secrets are rotated and configured.
- [!] Do not launch until provider-level spending limits exist for AI/fix-generation providers.
- [!] Do not launch until logs are scrubbed of repository code, secrets, webhook payloads, GitHub tokens, Stripe objects, prompts, and private findings.

## Security Baseline

- [x] Supabase Auth is used for user sessions.
- [x] Supabase browser/server clients are separated.
- [x] Service-role client is isolated in `lib/supabase/admin.ts` and documented as server-only.
- [x] Core tables enable RLS in the initial migration.
- [x] RLS policies scope profiles, repos, scans, findings, fix PRs, and monitoring config to the authenticated owner.
- [x] GitHub webhook verifies HMAC-SHA256 over the raw body.
- [x] GitHub webhook uses `timingSafeEqual`.
- [x] Stripe webhook verifies the raw request body signature.
- [x] Expensive scan/fix routes have in-memory rate limits.
- [x] Public `/svc/scan` is rate-limited and does not persist user data.
- [!] RLS allows users to update their own `profiles` row; restrict column privileges so users cannot self-upgrade `plan` or alter Stripe IDs.
- [!] Add database privilege hardening equivalent to Zuvadis: billing fields must be service-role-only.
- [!] Confirm no client-side code imports `createAdminClient()`.
- [!] Confirm no route accepts `userId`, `plan`, `stripe_customer_id`, `stripe_subscription_id`, `price`, `repo_id`, or `installation_id` from the client as authority without ownership verification.
- [!] **Confirmed gap (review 2026-09-17):** repository access is NOT limited to the user's installation. `lib/github/fetch-repo.ts` uses a global `GITHUB_TOKEN`/`GITHUB_PAT`, and `app/api/scan/start` stores `installation_id: 0`. Fix per implementation_plan.md §0.1.
- [!] **Confirmed partial gap:** `app/svc/scan` cannot reach arbitrary URLs (host is fixed), but it shares the operator token above, so it can fetch any private repo that token can read. Run it with no token, or remove it.
- [!] Confirm fetched repository files are size-limited, extension-limited, and never stored unless authenticated/persisting intentionally.
- [!] Confirm logs do not include customer source code.
- [!] Confirm logs do not include findings containing secrets from scanned repos.
- [!] Confirm scan results containing secrets are protected as sensitive customer data.
- [!] Confirm production error responses do not expose stack traces, GitHub API errors with tokens, or provider internals.
- [!] Add CSRF/same-site review for browser-authenticated mutations.
- [x] HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, and X-Content-Type-Options are set in `next.config.mjs`.
- [!] Add a Content-Security-Policy header; it is the only one missing.
- [!] Confirm demo fixtures cannot mix with production tenant data.

## Authentication And Authorization

- [x] Checkout, portal, GitHub connect, scan start, scan status, and fix generation require Supabase auth.
- [x] Scan status relies on RLS for ownership.
- [x] GitHub connect route syncs repos under the authenticated user.
- [!] Verify every dashboard page rejects anonymous access.
- [!] Verify every dashboard API route rejects anonymous access.
- [!] Verify user A cannot read user B's repos, scans, findings, fix PRs, monitoring config, certificates, or billing state.
- [!] Verify GitHub installation callbacks cannot attach someone else's installation to the wrong user.
- [!] Verify installation deletion/suspension only removes repos for that installation.
- [!] Verify removed repositories are deleted or disabled without cross-tenant deletes.
- [!] Add admin/instance-owner role model before adding commercial settings UI.
- [!] Admin routes must require strong server-side authorization and audit logs.

## Plan Catalogue

- [x] Code defines plans: free, pro, agency.
- [x] Free is currently $0 with 1 scan/month and 1 repo limit.
- [x] Pro is currently $29/month with unlimited scans/repos in code.
- [x] Agency is currently $99/month with 15 repo limit in code.
- [x] Stripe price IDs are resolved server-side from env vars.
- [!] Move plans into database-backed admin-managed records before commercial launch.
- [!] Keep `lib/stripe/plans.ts` as bootstrap/default seed data only.
- [!] Store plan public price, currency, billing interval, Stripe product ID, Stripe price ID, active/archived status, display order, feature flags, and hard limits in the database.
- [!] Store scan limits per plan: repos, scans per month, public scans, private scans, monitored repos, team seats, certificates, fix PR attempts, and webhook monitoring.
- [!] Store internal AI/fix-generation monthly budget per plan in the database, editable by admin.
- [!] Store model/provider token pricing per AI model used for explanations, fix generation, Copilot, or future features.
- [!] Store credit/top-up markup percentage in the database if top-up fix credits are offered.
- [!] Recommended initial top-up policy, if used across products: 20 percent markup, meaning the customer receives 80 percent of payment value as spendable internal AI/fix credit.
- [!] Version plans and prices so existing subscribers can remain grandfathered when needed.
- [!] Add audit history for every plan, price, budget, markup, model-pricing, and feature-limit edit.
- [!] Ensure marketing pricing, billing page, checkout, webhook, and entitlement logic all read from the same plan records.
- [!] Validate admin cannot create impossible plans: negative price, negative limits, unknown Stripe IDs, unsupported currency, or invalid intervals.

## Admin-Editable Commercial Settings

- [!] Build an instance-admin billing/settings UI.
- [!] Admin must be able to create, edit, archive, and reorder plans.
- [!] Admin must be able to map plans to Stripe prices created in Stripe.
- [!] Admin must be able to edit public pricing metadata.
- [!] Admin must be able to edit included monthly scan and repo limits.
- [!] Admin must be able to edit internal monthly AI/fix budgets per plan.
- [!] Admin must be able to edit model/provider token costs.
- [!] Admin must be able to edit credit markup percentage for optional top-ups.
- [!] Admin must be able to turn features on/off per plan: monitoring, AI fix PRs, certificates, team seats, fleet, compliance, analytics, Copilot, and white-label.
- [!] Admin must not be able to silently change user balances, plans, or coupon grants without a reason and audit trail.
- [!] Add preview before saving commercial changes.
- [!] Add confirmation for high-risk edits such as reducing limits, changing Stripe IDs, changing markup, or disabling a paid feature.
- [!] Add rollback/revert path for accidental plan, coupon, markup, or budget edits.
- [!] Clearly separate public subscription price from hidden internal AI/fix budget.
- [!] Clearly separate plan-included budget from purchased top-up credits.
- [!] Hide internal budgets from end users unless intentionally presented as part of the pricing promise.
- [!] Add margin reporting by plan: subscription revenue, coupon discounts, scan volume, AI/fix cost, GitHub/API cost, top-up revenue, and remaining exposure.

## Usage Limits

- [x] Public `/svc/scan` is limited to 6 requests per minute per IP.
- [x] Authenticated scan start is limited to 8 requests per minute per user/IP key.
- [x] Fix generation route is limited to 5 requests per minute per user/IP key.
- [x] Scan start validates max file count and max file bytes.
- [!] In-memory rate limiting is per-instance only; use Redis/Upstash/Postgres for production global limits.
- [!] Enforce plan limits before scanning: free 1 scan/month, repo limit, monitored repo limit, fix attempts, certificates, team seats.
- [!] Current code defines plan scan limits but scan route does not clearly enforce monthly scans/repo limits; verify and implement.
- [!] Track usage by Stripe billing period, not calendar month.
- [!] Add usage ledger for scan started, scan completed, public scan, private repo scan, finding generated, fix attempted, PR opened, certificate generated, monitoring webhook processed, and admin adjustment.
- [!] Track actual provider cost for AI fix generation and future Copilot features: input tokens, output tokens, model, provider, calculated internal cost.
- [!] Spend plan-included AI/fix budget first.
- [!] Spend purchased top-up credits only after included budget is exhausted.
- [!] Purchased top-up credits should persist until spent unless expiry is clearly disclosed.
- [!] Plan-included budget should reset each Stripe billing period and not roll over.
- [!] Mid-cycle upgrades should grant only the prorated delta between old and new internal budgets.
- [!] Add daily caps to contain account compromise and scripted abuse.
- [!] Add public endpoint abuse controls by IP, user agent, and repository target.
- [!] Add status polling limits.
- [!] Add GitHub webhook event rate controls and dedupe by delivery ID.
- [!] Add provider spend caps outside the app.

## Upgrade Options

- [!] Existing subscribers upgrading from Free to Pro can use checkout.
- [!] Existing paid subscribers upgrading from Pro to Agency must update their current Stripe subscription.
- [!] A Pro user upgrading to Agency must end with exactly one active Stripe subscription.
- [!] A paid user changing plan must not create duplicate active subscriptions.
- [!] Use Stripe subscription item updates with proration for paid-plan upgrades/downgrades.
- [!] Define whether downgrades apply immediately or at period end.
- [!] Store Stripe current period start and current period end locally for usage/budget calculations.
- [!] Do not grant a full new included AI/fix budget for an upgrade with only a few days left in the billing period.
- [!] Every limit failure should return a machine-readable code and suggested upgrade path.
- [!] Upgrade UI should show current plan, target plan, immediate charge/credit, renewal price, coupon impact, and feature changes.
- [!] Define what happens when a downgraded user has more repos, monitored repos, seats, or certificates than their new plan allows.
- [!] Confirm cancellation behavior: immediate downgrade or access until period end.
- [!] Confirm past_due behavior.

## Billing Details

- [x] Checkout accepts a plan enum rather than arbitrary amount.
- [x] Checkout creates/reuses a Stripe customer.
- [x] Checkout stores user ID in Stripe metadata/client reference.
- [x] Billing portal route exists.
- [x] Stripe webhook verifies signature.
- [x] Webhook handles checkout completion, subscription created/updated, and subscription deleted.
- [!] Add Stripe event dedupe table; Stripe events are at-least-once.
- [!] Current webhook has no durable event idempotency; duplicate delivery could repeat side effects.
- [!] Refetch live subscription state before applying entitlement changes where possible.
- [!] Fail closed on unknown Stripe price IDs; current `planIdFromPriceId()` returns free, which is safe for privilege but can silently downgrade if env is wrong.
- [!] Store subscription status, current period start, current period end, cancel-at-period-end, price ID, coupon/promotion ID, and latest invoice state.
- [!] Add handling for `invoice.paid`, `invoice.payment_failed`, `customer.subscription.paused`, incomplete subscriptions, trial end, and past_due transitions if relevant.
- [!] Existing paid users must use a subscription update path, not brand-new checkout.
- [!] One-time top-up purchases, if offered for AI fixes, must use a separate payment/checkout flow from subscriptions.
- [!] Top-up credit grant should equal payment amount times spendable percentage after markup.
- [!] Persist purchased credits separately from plan-included budget.
- [!] Confirm taxes, receipts, invoices, refunds, disputes, and billing support process are configured.
- [!] Add tests for duplicate webhook, cancelled subscription, renewal, failed payment, unknown price, missing metadata, checkout replay, and subscription upgrade.

## Coupons And Promotions

- [!] Build coupons as database records managed by instance admin UI.
- [!] Do not rely only on ad hoc Stripe Dashboard coupons; the app must know and display the offer it promised.
- [!] Store coupon code, name, description, active status, redemption limits, per-user limits, start/end dates, eligible plans, and new-customer-only flag.
- [!] Store coupon type explicitly: percent-off lifetime, fixed-price lifetime, fixed recurring price per month, percent-off once, percent-off for N months, fixed discount once, fixed discount for N months.
- [!] Support `x% off for life`.
- [!] Support fixed price for life, such as "$29 per month forever."
- [!] Support fixed price per month for a limited duration, such as "$19 per month for first 3 months."
- [!] Support `x% off` one-off first invoice.
- [!] Support `x% off` for first N months, including first 3 months.
- [!] Store whether a coupon applies to subscription plans, top-up credits, or both.
- [!] Default should be subscription-only unless top-up discounts are intentionally offered.
- [!] Store coupon currency when coupon type involves fixed prices or fixed discounts.
- [!] Validate fixed-price coupons cannot be applied to a different currency.
- [!] Validate coupon result never creates a negative invoice or unacceptable margin unless admin explicitly overrides.
- [!] Resolve coupons server-side; never trust discounted amounts from the client.
- [!] Coupon preview should show original price, discounted price, duration, renewal behavior, and lifetime status.
- [!] Checkout should pass Stripe the correct promotion/coupon setup and store local coupon assignment.
- [!] Webhook processing should persist the coupon/promotion actually attached to the Stripe subscription.
- [!] Lifetime coupons must remain attached through upgrades according to a defined policy.
- [!] Define upgrade behavior for coupons: carry discount to new plan, restrict to original plan, or require admin-configured eligibility.
- [!] Define downgrade behavior for coupons.
- [!] Define cancellation/reactivation behavior for lifetime coupons.
- [!] Define whether coupons can stack.
- [!] Define whether coupons can apply to grandfathered plans.
- [!] Define whether coupon eligibility is checked only at checkout or on every renewal webhook.
- [!] Add coupon redemption ledger with user ID, coupon ID, Stripe promotion code ID, subscription ID, invoice ID, redeemed_at, and status.
- [!] Add admin reporting for coupon performance: redemptions, conversion, revenue, discount cost, churn, and margin.
- [!] Add tests for expired coupon, inactive coupon, wrong plan, wrong currency, max redemptions reached, per-user limit reached, first-3-month discount ending, lifetime discount surviving renewal, and fixed-price coupon.

## GitHub Integration

- [x] GitHub App connect route exists.
- [x] Installation repo sync exists.
- [x] GitHub webhook handles installation and installation repositories events.
- [x] Installation deletion/suspension removes matching repos.
- [x] Removed repositories are scoped by installation ID.
- [!] Verify GitHub App permissions are read-only for scanning unless PR fixes are actually enabled.
- [!] CI gate needs `checks: write`; SARIF upload would need `security_events: write` — do not request the latter, and do not build on SARIF upload (unavailable on private repos without paid GitHub Code Security).
- [!] If PR fixes are enabled, clearly separate read-only scan permission from write/contents/pull-request permissions.
- [!] Store GitHub installation IDs and repo IDs as sensitive integration data.
- [!] Dedupe GitHub webhook deliveries.
- [!] Add retry/backoff for GitHub API failures.
- [!] Add user-visible reconnect/error states for revoked installations.
- [!] Add audit trail when repos are connected, disconnected, rescanned, or PRs are opened.

## Scan Engine And Security Product Accuracy

- [x] Nine detection rules exist.
- [x] Scanner is deterministic and does not require LLM calls for explanations.
- [x] Scanner checks exposed secrets, disabled RLS, missing auth, client-trusted payment, SQL injection, prompt injection, stored XSS risk, unbounded AI, and no rate limiting.
- [x] Scan scoring exists.
- [!] The product listing claims AST/data-flow style behavior, but current engine is regex/pattern based; correct marketing or build real AST/dataflow.
- [!] Add false-positive/false-negative evaluation on real sample repos.
- [!] Add test fixtures for every rule.
- [!] Rules apply only to JS/TS files, but `fetch-repo.ts` pulls Python/Ruby/Go/PHP; unsupported stacks currently score 100 (false assurance). Narrow fetch or add coverage, and disclose unscanned files in the report.
- [!] Current OpenAI secret pattern misses the `sk-proj-…` key format in use since 2024; seed patterns from gitleaks.
- [!] Lint every rule regex for catastrophic backtracking before loading rules from JSON or a database (ReDoS against the scanner).
- [!] Scorer is additive with no cap or dedupe (4 criticals = 0); revise before adding rule packs.
- [!] Add severity calibration and confidence scores.
- [!] Add ignored findings/suppression workflow.
- [!] Add rescanning after fixes to confirm resolution.
- [!] Add finding ownership and privacy review because findings may contain code snippets/secrets.
- [!] Add dependency vulnerability scanning only if marketed.
- [!] Add SAST/DAST/compliance claim review with legal/technical precision.

## Autonomous Fix PRs

- [x] Fix route is authenticated and rate-limited.
- [x] Fix route clearly returns simulated/not implemented.
- [!] Do not claim autonomous PR fixes are live until implemented.
- [!] Build AI patch generation against the exact scanned commit.
- [!] Treat repository content as untrusted input to the fix model (a malicious repo can embed instructions); isolate it from instructions and constrain output to a single-file diff.
- [!] Decide fix metering before launch: $29 unlimited fix PRs cannot cover per-fix LLM cost (competitor_research.md §(d)).
- [!] Generate minimal diffs, not broad rewrites.
- [!] Validate generated diffs apply cleanly.
- [!] Run tests/lint/static validation before opening PR when possible.
- [!] Open PRs through GitHub App with least-privilege write permissions.
- [!] Include clear PR title/body, finding link, risk explanation, changed files, and rollback notes.
- [!] Never auto-merge fixes.
- [!] Add idempotency so repeated clicks do not open duplicate PRs.
- [!] Store fix attempt status: queued, generating, validation_failed, pr_opened, failed, merged, closed.
- [!] Charge usage/budget only once per fix attempt or refund failed attempts according to policy.
- [!] Add customer confirmation before opening a PR on private repos.

## Continuous Monitoring

- [x] GitHub push webhook is verified and received.
- [!] Push handler currently logs only; wire it to enqueue a rescan.
- [!] Add job queue or durable background worker for rescans.
- [!] Add GitHub commit status/check run if marketing says risky pushes are caught before merge.
- [!] Push handler must respond within GitHub's 10-second webhook delivery timeout: return `202` and scan out-of-band (`waitUntil`/QStash), never synchronously.
- [!] Do not build the gate on SARIF/code-scanning upload: unavailable on private repos for Free/Pro accounts and requires paid GitHub Code Security on Team/Enterprise. Use Check Runs with annotations.
- [!] Add branch filtering and default branch policy.
- [!] Add debounce/coalescing for rapid push events.
- [!] Add monitoring limits per plan.
- [!] Add alert channels: email, Slack/Discord/webhook only when actually implemented.
- [!] Store monitoring events and outcomes.
- [!] Add user-visible monitoring health and last scan time.
- [!] Add failure alerts for broken GitHub installation, webhook secret mismatch, or worker downtime.

## Certificates, Compliance, Fleet, Analytics, Copilot

- [!] Verify certificate generation uses real scan data and cannot be forged.
- [!] Do not call certificates cryptographic unless signatures/verifiable proofs exist.
- [!] Add certificate revocation or stale-scan indicator.
- [!] Add certificate privacy controls for public sharing.
- [!] Fixture-only dashboards must be labelled demo until backed by real data.
- [!] Fleet topology needs real data sources or the claim should be removed.
- [!] Compliance mapping needs real evidence per control or the claim should be removed.
- [!] Analytics needs historical scan data, aggregation, and tenant scoping.
- [!] Red Team Arena needs a real scenario engine or should be labelled demo.
- [!] Copilot page exists as a 502-line fixture (`components/dashboard/copilot-client.tsx`) with canned replies claiming "Autonomous PR #117" and "AWS Nitro memory". Label demo or remove the fabricated content; build a real authenticated chat backed by repo context before marketing it.

## Data Protection And Retention

- [!] Document whether repository code is stored, for how long, and where.
- [!] If marketing says zero-retention RAM sandbox, verify implementation matches that promise.
- [!] Current authenticated scans persist scan metadata and findings; ensure copy does not imply zero storage of all scan data.
- [!] Avoid persisting full source code unless explicitly disclosed.
- [!] Encrypt sensitive integration tokens/secrets if stored.
- [!] Add account deletion flow covering repos, scans, findings, fix PRs, monitoring config, certificates, and billing references.
- [!] Add repository disconnect flow.
- [!] Add data export path if promised.
- [!] Add backup and restore process.
- [!] Add retention policy for logs and scan findings.
- [!] Confirm demo seed data contains no real customer code or secrets.

## Product Viability And Marketing Honesty

- [x] Core scan engine is real.
- [x] Supabase/RLS foundation is real.
- [x] GitHub connect/webhook foundation is real.
- [x] Stripe foundation is real.
- [!] Remove or rewrite fabricated testimonial claiming autonomous PRs opened real pull requests.
- [!] Remove the fabricated PR/AWS-Nitro claims baked into the fixture Copilot page.
- [!] Run trademark clearance on "VibeAudit" and retire all "Vanta Audit" assets; Vanta is an established compliance-automation vendor.
- [!] Correct claims that imply AST/data-flow scanning unless built.
- [!] Correct claims that imply PR fixes are live unless built.
- [!] Correct claims that imply monitoring blocks bad pushes unless built.
- [!] Correct claims that imply dashboards are live data unless built.
- [!] Correct "Vanta Audit" and `thebeautytie.com` promo discrepancy before using that video.
- [!] Add clear docs for setup, deployment, Supabase migrations, Stripe webhooks, GitHub App setup, scan worker, env vars, and demo data.
- [!] Verify domain, brand, legal pages, support address, and company details are consistent.

## Database And Migrations

- [x] Initial schema creates profiles, repos, scans, findings, fix PRs, and monitoring config.
- [x] RLS insert policy for findings was added after initial migration.
- [!] Add `stripe_events` table for webhook idempotency.
- [!] Add plan tables: `plans`, `plan_prices`, `plan_entitlements`.
- [!] Add AI/model cost table for provider/model pricing.
- [!] Add commercial settings table for markup/global billing policy.
- [!] Add subscription period budget table for included AI/fix budgets.
- [!] Add purchased credit ledger if top-ups are offered.
- [!] Add usage ledger for scans, fixes, certificates, monitoring, and AI cost.
- [!] Add coupon table.
- [!] Add coupon redemption table.
- [!] Add admin audit log table.
- [!] Add GitHub webhook delivery table for dedupe.
- [!] Add monitoring job table or queue if implementing continuous monitoring.
- [!] Add fix attempt table fields for status/idempotency.
- [!] Restrict profile update privileges so users cannot mutate billing columns.
- [!] Confirm migrations are applied in production in order.

## Observability And Operations

- [!] Add structured logs for auth failures, billing events, GitHub webhook events, scan starts/failures, fix attempts, rate limits, and provider failures.
- [!] Redact repository code, secrets, prompts, Stripe objects, GitHub payloads, and PII.
- [!] Add uptime monitoring.
- [!] Add synthetic checks for login, checkout start, billing portal, public scan, authenticated scan, GitHub webhook, and scan status.
- [!] Add alerts for Stripe webhook failures.
- [!] Add alerts for GitHub webhook failures.
- [!] Add alerts for scan worker downtime.
- [!] Add alerts for AI provider 401/402/429/5xx.
- [!] Add alerts for sudden scan or fix-generation spikes.
- [!] Add database backup monitoring.
- [!] Add rollback plan for bad deployments and bad commercial settings.

## Testing Before Launch

- [!] Run clean install.
- [!] Run TypeScript check.
- [!] Run lint.
- [!] Run unit tests for scan rules.
- [!] Run production build.
- [!] Apply Supabase migrations to staging.
- [!] Test sign-up, login, auth callback, and logout.
- [!] Test dashboard/API access as anonymous user.
- [!] Test user A cannot access user B's repos/scans/findings.
- [!] Test public scan rate limit.
- [!] Test authenticated scan rate limit.
- [!] Test plan scan limits for free, pro, and agency.
- [!] Test repo limit for free and agency.
- [!] Test checkout, portal, webhook, duplicate webhook, cancellation, renewal, failed payment, unknown price, and missing metadata.
- [!] Test Pro to Agency upgrade and confirm only one active Stripe subscription exists.
- [!] Test Agency to Pro downgrade and confirm only one active Stripe subscription exists.
- [!] Test mid-cycle upgrade and confirm prorated internal budget grant.
- [!] Test coupon: percent off for life.
- [!] Test coupon: fixed price for life.
- [!] Test coupon: fixed price per month for first N months.
- [!] Test coupon: percent off once.
- [!] Test coupon: percent off first 3 months.
- [!] Test coupon limits, expiry, wrong plan, wrong currency, and repeated redemption.
- [!] Test GitHub installation, repo sync, repo removal, installation deletion, and webhook signature failure.
- [!] Test push webhook triggers rescan once monitoring is implemented.
- [!] Test fix generation remains clearly disabled/simulated until real PR support ships.
- [!] Test certificate URL privacy and verification behavior.

## Final Go/No-Go

- [ ] Existing-subscriber upgrade path updates one Stripe subscription instead of creating duplicates.
- [ ] Plans, internal budgets, model pricing, markup, and coupons are database-backed and admin-editable.
- [ ] Webhook idempotency exists for Stripe and GitHub.
- [ ] Profile billing columns cannot be self-edited.
- [ ] Plan and usage limits are enforced server-side.
- [ ] Autonomous PR claims corrected or implemented.
- [ ] Continuous monitoring claims corrected or implemented.
- [ ] Fixture dashboard claims corrected or implemented.
- [ ] Certificate claims verified.
- [ ] Coupon system tested for lifetime, fixed-price, one-off, and limited-duration promotions.
- [ ] Sensitive logging removed.
- [ ] Production secrets rotated.
- [ ] Monitoring, backups, and rollback tested.

