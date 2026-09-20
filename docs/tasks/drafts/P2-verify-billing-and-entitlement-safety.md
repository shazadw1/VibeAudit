---
id: P2
title: Verify billing and entitlement safety
lane: high-risk
status: draft
approval: pending
plan_item: 2
plan_status_owner: runner
source: docs/plan.md#2
created_at: 2026-09-20T02:40:25Z
runner_eligible: false
---

## Problem
Item 2 is a verification item, but verification already fails: the billing surface is not
wired up, and several paths the item names cannot be exercised at all. Confirmed by direct
reads on 2026-09-20.

**The billing page is a fixture.** `app/(dashboard)/settings/billing/page.tsx`
`handleUpgrade` (lines 11-17) sets local React state after a 1.8 s timer and returns. A
repo-wide grep for `api/stripe` outside `app/api/stripe/` returns **nothing**: no code calls
`/api/stripe/checkout` or `/api/stripe/portal`. Both routes are real and unreachable. The
page's plan copy also contradicts `lib/stripe/plans.ts` — it advertises "5 AST Security
Scans / Month" on free (the real limit is 1), names the tiers "Developer Free" and "Pro AI
Shield", offers annual pricing ($23/mo) for which no Stripe price id exists, and defaults
`currentPlan` to `"pro"` so every visitor appears to be a paying customer.

**Checkout cannot satisfy the launch check.** `app/api/stripe/checkout/route.ts` always
calls `stripe.checkout.sessions.create({ mode: "subscription", ... })` (lines 50-59) with no
branch on the caller's existing `stripe_subscription_id`. A Pro subscriber choosing Agency
gets a second subscription on the same customer. The launch check — "upgrades modify one
existing subscription and cannot create duplicate active subscriptions" — fails by
construction. `docs/checklist.md` records this at lines 12 and 131-134, which call for Stripe
subscription **item updates with proration**, not a new checkout.

**Users can upgrade themselves without paying.**
`supabase/migrations/20260705000000_initial_schema.sql:116` grants `Users can update own
profile` for update using `auth.uid() = id`, with no column restriction. `plan`,
`stripe_customer_id`, and `stripe_subscription_id` all live on that row, so any
authenticated user can set `plan = 'agency'` through the client Supabase key. This is
`docs/checklist.md` lines 35 and 38. It also nullifies every entitlement check plan item 6
is adding.

**Webhook gaps.** `app/api/stripe/webhook/route.ts` verifies the signature correctly
(checklist line 32, already `[x]`), but there is no event dedupe and no use of `event.id`;
Stripe delivers at least once, so a replayed `checkout.session.completed` re-runs the profile
update (checklist line 152). `planIdFromPriceId` (`lib/stripe/plans.ts:41-46`) returns
`"free"` for any unrecognised price id, so a wrong or missing `STRIPE_PRO_MONTHLY_PRICE_ID`
silently downgrades paying customers rather than failing loudly (checklist line 155). Only
three event types are handled; `invoice.paid`, `invoice.payment_failed`,
`customer.subscription.paused`, incomplete subscriptions, trial end, and `past_due` all fall
through to the default acknowledgement (checklist line 157), so a failed payment never
changes entitlement.

**Dependency:** plan item 6 is in flight in this worktree as P6 and already edits
`lib/stripe/plans.ts` and the webhook (adding `current_period_start/end` writes and the
`plan_limits`/`usage_events` tables). This item must land after P6 and build on that shape.
The overlap is deliberate: P6 enforces limits, this item makes the plan value those limits
key off trustworthy.

## Codegraph Context
index: 2026-09-20T02:38:09Z (1789871889075), files: 100, stale: no

### `lib/stripe/client.ts`

**Search results:**

- file `client.ts` — `lib/stripe/client.ts:1-23`
- import `stripe` — `lib/stripe/client.ts:1-1`
- variable `stripeSingleton` — `lib/stripe/client.ts:3-3`
- function `getStripe` — `lib/stripe/client.ts:10-22` (exported)

**Related (edges) and unresolved references:**

- edge calls (in) `POST` in `app/api/stripe/checkout/route.ts` (line 32)
- edge calls (in) `POST` in `app/api/stripe/portal/route.ts` (line 27)
- edge calls (in) `POST` in `app/api/stripe/webhook/route.ts` (line 20)
- edge imports (in) `route.ts` in `app/api/stripe/checkout/route.ts` (line 4)
- edge imports (in) `route.ts` in `app/api/stripe/portal/route.ts` (line 3)
- edge imports (in) `route.ts` in `app/api/stripe/webhook/route.ts` (line 3)

### `lib/stripe/plans.ts`

**Search results:**

- file `plans.ts` — `lib/stripe/plans.ts:1-54`
- type_alias `PlanId` — `lib/stripe/plans.ts:1-1` (exported)
- constant `PLANS` — `lib/stripe/plans.ts:3-25` (exported)
- constant `LIMIT_KINDS` — `lib/stripe/plans.ts:27-27` (exported)
- type_alias `LimitKind` — `lib/stripe/plans.ts:28-28` (exported)
- type_alias `PlanLimits` — `lib/stripe/plans.ts:29-38` (exported)
- property `scans_per_period` — `lib/stripe/plans.ts:30-30`
- property `repos` — `lib/stripe/plans.ts:31-31`
- property `monitored_repos` — `lib/stripe/plans.ts:32-32`
- property `fix_attempts_per_period` — `lib/stripe/plans.ts:33-33`

**Related (edges) and unresolved references:**

- edge calls (in) `POST` in `app/api/stripe/webhook/route.ts` (line 46)
- edge calls (in) `POST` in `app/api/stripe/webhook/route.ts` (line 70)
- edge calls (in) `POST` in `app/api/stripe/checkout/route.ts` (line 27)
- edge imports (in) `route.ts` in `app/api/stripe/webhook/route.ts` (line 5)
- edge imports (in) `route.ts` in `app/api/stripe/checkout/route.ts` (line 5)
- edge imports (in) `entitlements.ts` in `lib/entitlements.ts` (line 2)
- edge imports (in) `entitlements.ts` in `lib/entitlements.ts` (line 2)
- edge references (in) `FREE_DEFAULTS` in `lib/entitlements.ts` (line 5)
- edge references (in) `getPlanLimits` in `lib/entitlements.ts` (line 16)
- edge references (in) `getPlanLimits` in `lib/entitlements.ts` (line 16)
- edge references (in) `limitColumn` in `lib/entitlements.ts` (line 57)
- edge references (in) `limitColumn` in `lib/entitlements.ts` (line 57)
- edge references (in) `limitColumn` in `lib/entitlements.ts` (line 57)
- edge references (in) `countUsage` in `lib/entitlements.ts` (line 76)
- edge references (in) `checkLimit` in `lib/entitlements.ts` (line 138)
- edge references (in) `recordUsage` in `lib/entitlements.ts` (line 164)
- edge references (in) `limitExceededResponse` in `lib/entitlements.ts` (line 170)

### `app/api/stripe/checkout/route.ts`

**Search results:**

- file `route.ts` — `app/api/stripe/checkout/route.ts:1-67`
- import `next/server` — `app/api/stripe/checkout/route.ts:1-1`
- import `zod` — `app/api/stripe/checkout/route.ts:2-2`
- import `@/lib/supabase/server` — `app/api/stripe/checkout/route.ts:3-3`
- import `@/lib/stripe/client` — `app/api/stripe/checkout/route.ts:4-4`
- import `@/lib/stripe/plans` — `app/api/stripe/checkout/route.ts:5-5`
- import `@/types` — `app/api/stripe/checkout/route.ts:6-6`
- constant `bodySchema` — `app/api/stripe/checkout/route.ts:8-10`
- function `POST` — `app/api/stripe/checkout/route.ts:12-66` (exported)

**Related (edges) and unresolved references:**

- edge imports (out) `createClient` in `lib/supabase/server.ts` (line 3)
- edge imports (out) `getStripe` in `lib/stripe/client.ts` (line 4)
- edge imports (out) `Profile` in `types/index.ts` (line 6)
- edge imports (out) `priceIdForPlan` in `lib/stripe/plans.ts` (line 5)
- edge calls (out) `createClient` in `lib/supabase/server.ts` (line 14)
- edge calls (out) `getStripe` in `lib/stripe/client.ts` (line 32)
- edge calls (out) `priceIdForPlan` in `lib/stripe/plans.ts` (line 27)
- edge instantiates (out) `URL` in `scripts/seed-demo.mjs` (line 48)

### `app/api/stripe/portal/route.ts`

**Search results:**

- file `route.ts` — `app/api/stripe/portal/route.ts:1-41`
- import `next/server` — `app/api/stripe/portal/route.ts:1-1`
- import `@/lib/supabase/server` — `app/api/stripe/portal/route.ts:2-2`
- import `@/lib/stripe/client` — `app/api/stripe/portal/route.ts:3-3`
- import `@/types` — `app/api/stripe/portal/route.ts:4-4`
- function `POST` — `app/api/stripe/portal/route.ts:6-40` (exported)

**Related (edges) and unresolved references:**

- edge imports (out) `createClient` in `lib/supabase/server.ts` (line 2)
- edge imports (out) `getStripe` in `lib/stripe/client.ts` (line 3)
- edge imports (out) `Profile` in `types/index.ts` (line 4)
- edge calls (out) `createClient` in `lib/supabase/server.ts` (line 8)
- edge calls (out) `getStripe` in `lib/stripe/client.ts` (line 27)
- edge instantiates (out) `URL` in `scripts/seed-demo.mjs` (line 28)

### `app/api/stripe/webhook/route.ts`

**Search results:**

- file `route.ts` — `app/api/stripe/webhook/route.ts:1-104`
- import `next/server` — `app/api/stripe/webhook/route.ts:1-1`
- import `stripe` — `app/api/stripe/webhook/route.ts:2-2`
- import `@/lib/stripe/client` — `app/api/stripe/webhook/route.ts:3-3`
- import `@/lib/supabase/admin` — `app/api/stripe/webhook/route.ts:4-4`
- import `@/lib/stripe/plans` — `app/api/stripe/webhook/route.ts:5-5`
- function `POST` — `app/api/stripe/webhook/route.ts:7-103` (exported)

**Related (edges) and unresolved references:**

- edge imports (out) `getStripe` in `lib/stripe/client.ts` (line 3)
- edge imports (out) `createAdminClient` in `lib/supabase/admin.ts` (line 4)
- edge imports (out) `planIdFromPriceId` in `lib/stripe/plans.ts` (line 5)
- edge imports (in) `route.test.ts` in `app/api/stripe/webhook/__tests__/route.test.ts` (line 23)
- edge calls (out) `getStripe` in `lib/stripe/client.ts` (line 20)
- edge calls (out) `createAdminClient` in `lib/supabase/admin.ts` (line 30)
- edge calls (out) `planIdFromPriceId` in `lib/stripe/plans.ts` (line 46)
- edge calls (out) `planIdFromPriceId` in `lib/stripe/plans.ts` (line 70)
- edge calls (in) `route.test.ts` in `app/api/stripe/webhook/__tests__/route.test.ts` (line 64)
- edge calls (in) `route.test.ts` in `app/api/stripe/webhook/__tests__/route.test.ts` (line 93)

### `planIdFromPriceId`

**Search results:**

- function `planIdFromPriceId` — `lib/stripe/plans.ts:41-46` (exported)
- import `@/lib/stripe/plans` — `app/api/stripe/webhook/route.ts:5-5`

**Related (edges) and unresolved references:**

- edge references (out) `PlanId` in `lib/stripe/plans.ts` (line 41)
- edge references (out) `PlanId` in `lib/stripe/plans.ts` (line 41)
- edge calls (in) `POST` in `app/api/stripe/webhook/route.ts` (line 46)
- edge calls (in) `POST` in `app/api/stripe/webhook/route.ts` (line 70)
- edge contains (in) `plans.ts` in `lib/stripe/plans.ts`
- edge contains (in) `route.ts` in `app/api/stripe/webhook/route.ts`
- edge imports (in) `route.ts` in `app/api/stripe/webhook/route.ts` (line 5)

### `priceIdForPlan`

**Search results:**

- import `@/lib/stripe/plans` — `app/api/stripe/checkout/route.ts:5-5`
- function `priceIdForPlan` — `lib/stripe/plans.ts:49-53` (exported)

**Related (edges) and unresolved references:**

- edge references (out) `PLANS` in `lib/stripe/plans.ts`
- edge references (out) `PlanId` in `lib/stripe/plans.ts` (line 49)
- edge calls (in) `POST` in `app/api/stripe/checkout/route.ts` (line 27)
- edge contains (in) `plans.ts` in `lib/stripe/plans.ts`
- edge contains (in) `route.ts` in `app/api/stripe/checkout/route.ts`
- edge imports (in) `route.ts` in `app/api/stripe/checkout/route.ts` (line 5)

### `stripe_subscription_id`

**Search results:**

- (no codegraph matches)

**Related (edges) and unresolved references:**

- (none)

### `stripe_customer_id`

**Search results:**

- (no codegraph matches)

**Related (edges) and unresolved references:**

- (none)

### `profiles`

**Search results:**

- function `ProfileSettingsPage` — `app/(dashboard)/settings/profile/page.tsx:6-172` (exported)

**Related (edges) and unresolved references:**

- edge contains (in) `page.tsx` in `app/(dashboard)/settings/profile/page.tsx`

### Files in scope

- `app/api/stripe/checkout/route.ts`
  - exported function `POST` (`app/api/stripe/checkout/route.ts:12-66`) — signature: `(request: Request)`
- `app/api/stripe/portal/route.ts`
  - exported function `POST` (`app/api/stripe/portal/route.ts:6-40`) — signature: `(request: Request)`
- `app/api/stripe/webhook/route.ts`
  - exported function `POST` (`app/api/stripe/webhook/route.ts:7-103`) — signature: `(request: Request)`
- `app/(dashboard)/settings/profile/page.tsx`
  - exported function `ProfileSettingsPage` (`app/(dashboard)/settings/profile/page.tsx:6-172`) — signature: `()`
- `lib/stripe/client.ts`
  - exported function `getStripe` (`lib/stripe/client.ts:10-22`) — signature: `(): Stripe`
- `lib/stripe/plans.ts`
  - exported type_alias `PlanId` (`lib/stripe/plans.ts:1-1`)
  - exported constant `PLANS` (`lib/stripe/plans.ts:3-25`) — signature: `= {   FREE: {     id: "free" as PlanId,     name: "Free",     price: 0,     priceId: undefined as stri...`
  - exported constant `LIMIT_KINDS` (`lib/stripe/plans.ts:27-27`) — signature: `= ['scan','repo','monitored_repo','fix_attempt','certificate','export','api_request','team_seat'] as c...`
  - exported type_alias `LimitKind` (`lib/stripe/plans.ts:28-28`)
  - exported type_alias `PlanLimits` (`lib/stripe/plans.ts:29-38`)
  - exported function `planIdFromPriceId` (`lib/stripe/plans.ts:41-46`) — signature: `(priceId: string | null | undefined): PlanId`
  - exported function `priceIdForPlan` (`lib/stripe/plans.ts:49-53`) — signature: `(plan: PlanId): string | undefined`

### Routes

- `app/api/stripe/checkout/route.ts`
- `app/api/stripe/portal/route.ts`
- `app/api/stripe/webhook/route.ts`

### Likely tests

- (none found among the files above -- add prose here if the assistant knows of a relevant test path)

### Additional context (assistant-added; codegraph indexed P6's uncommitted work)

- The index above was built while the P6 runner had uncommitted changes in the worktree, so
  `lib/stripe/plans.ts` already shows `LIMIT_KINDS`, `PlanLimits`, and no
  `scansPerMonth`/`reposLimit`. Treat post-P6 `plans.ts` as the baseline.
- `app/api/stripe/webhook/__tests__/route.test.ts` exists (P6's work, uncommitted at draft
  time) and mocks `@/lib/stripe/client` and `@/lib/supabase/admin`. It is the pattern to
  extend for dedupe, unknown-price, and failed-payment cases; no new harness is needed.
- `app/(dashboard)/settings/billing/page.tsx` is a client component with a hardcoded `plans`
  array (lines 19+). It is not a codegraph edge to the Stripe routes, because no such call
  exists.
- `lib/stripe/client.ts:10-22` `getStripe()` throws when `STRIPE_SECRET_KEY` is missing, by
  design, deferred to request time. Tests must mock it, never set a real key.
- `profiles` columns relevant here: `plan` (checked against `('free','pro','agency')`),
  `stripe_customer_id`, `stripe_subscription_id` (`supabase/schema.sql:8-17`), plus
  `current_period_start/end` added by P6.
- There is no `stripe_events` table and no `subscription_status`, `cancel_at_period_end`,
  `price_id`, or `latest_invoice` column anywhere (checklist line 156).

## In Scope
Decided scope (Approval Notes decisions 1-6). Verify **and** fix, in one task.
- **Plan records in the database.** New `public.plans` table holding the commercial
  metadata that is hardcoded today: `id`, `name`, `description`, `price_monthly`,
  `price_annual`, `stripe_price_id_monthly`, `stripe_price_id_annual`, `features jsonb`,
  `display_order`, `active`. Seeded from `lib/stripe/plans.ts` plus the annual prices
  (decision 2). It joins P6's `public.plan_limits` on plan id; `plan_limits` keeps the
  numeric limits and is not duplicated here. `lib/stripe/plans.ts` keeps `PlanId`,
  `LIMIT_KINDS`, `PlanLimits`, and the price-id resolvers, and its `PLANS` constant becomes
  seed data only (`docs/checklist.md` line 73).
- **Annual billing becomes real** (decision 2). The two annual Stripe prices are created by
  a human in the Stripe dashboard, test mode first; this task only consumes their ids
  through the seed. `priceIdForPlan` takes an interval; the checkout route accepts
  `interval: "month" | "year"`.
- **Billing page reads from data.** `app/(dashboard)/settings/billing/page.tsx` renders
  plans from `plans` joined to `plan_limits` instead of its hardcoded array, so the
  "5 scans/month" contradiction disappears by construction rather than by editing copy. The
  free scan limit shown is whatever `plan_limits` holds (P6 seeded 1); changing it later is
  an admin edit, not a code change (decision 2 follow-up).
- **Upgrade path** (the launch check): branch `app/api/stripe/checkout/route.ts` on the
  caller's existing subscription. None -> checkout session as today. Active or trialing ->
  `stripe.subscriptions.update` with the existing item id, the new price, and
  `proration_behavior: "create_prorations"`; return `{ updated: true }`. Refuse when the
  target plan and interval match the current one. Per `docs/checklist.md` lines 131-134, 158.
- **Self-upgrade lockdown** (decision 3): replace the blanket `Users can update own profile`
  policy (`supabase/migrations/20260705000000_initial_schema.sql:116`) so a user may still
  update `email` and `onboarding_completed` but never `plan`, `stripe_customer_id`,
  `stripe_subscription_id`, `subscription_status`, `cancel_at_period_end`, or P6's
  `current_period_start/end`. Those stay service-role only. Per `docs/checklist.md` lines
  35 and 38.
- **Webhook idempotency**: `public.stripe_events` keyed on Stripe's `event.id`, inserted
  before handling, short-circuiting on conflict. Per `docs/checklist.md` line 152.
- **Fail closed on unknown price**: `planIdFromPriceId` returns `null` for an unrecognised
  id; the webhook logs and leaves the existing plan untouched. Per `docs/checklist.md` line 155.
- **Failed payment** (decision 5): persist `subscription_status` and `cancel_at_period_end`
  on `profiles`; handle `invoice.payment_failed` and `customer.subscription.paused`.
  Entitlement drops **at period end**, evaluated at read time by a new
  `effectivePlan(profile)` in `lib/entitlements.ts`: a `past_due` or `unpaid` subscription
  keeps its plan until `now > current_period_end`, then resolves to `free`. No scheduled job.
  Every entitlement read goes through it, so P6's `checkLimit` inherits the rule.
- **Tests** extending `app/api/stripe/webhook/__tests__/route.test.ts` plus new
  `app/api/stripe/checkout/__tests__/` and `lib/__tests__/effective-plan.test.ts`. Per
  `docs/checklist.md` line 163.
- Tick `docs/checklist.md` lines 12, 35, 38, 73, 152, 155-158 at close-out (controller).

## Out of Scope
- The admin role model and the UI that edits `plans` and `plan_limits` (plan item 3;
  checklist lines 62-63, 84-99). This task creates and seeds the rows and reads from them;
  item 3 makes them editable, with audit trail and confirmation for high-risk edits. Same
  split as P6 and decided the same way (decision 2 follow-up).
- Creating the Stripe annual prices themselves. That is a human action in the Stripe
  dashboard; `CLAUDE.md` §4 forbids this task from calling live Stripe. The task consumes
  the ids.
- Coupons and promotions (plan item 7), beyond leaving `allow_promotion_codes: true` as is.
- Usage metering, AI budgets, top-ups (plan items 18-19; checklist lines 115-121, 159).
- Operator-facing billing reporting (plan item 8).
- Anything P6 owns: `plan_limits`, `usage_events`, `checkLimit`, `recordUsage`, the
  monitoring route, the period columns. Landed in `414fe3b`; this task builds on them.
- Re-verifying the webhook signature check; already confirmed working (checklist line 32).
- Proration policy beyond Stripe's `create_prorations` default, and whether downgrades apply
  immediately or at period end for *plan changes* (distinct from decision 5, which is about
  failed payments). Checklist line 135; leave as Stripe default and record it.

## Implementation Tasks
- [ ] P6 has landed (`414fe3b`), so `plan_limits`, `usage_events`, the period columns, and
      `lib/entitlements.ts` exist. Rebase on `dev` before starting.
- [ ] `supabase/migrations/<ts>_billing_hardening.sql`:
      create `plans` (columns above, `id text primary key` matching `plan_limits.plan`),
      seeded with free/pro/agency from `lib/stripe/plans.ts` plus annual prices; RLS read
      for authenticated, writes service-role only.
      Create `stripe_events` (`event_id text primary key`, `type text`,
      `received_at timestamptz default now()`), service-role only, no client access.
      Add `subscription_status text` and `cancel_at_period_end boolean default false` to
      `profiles`.
      Replace the `profiles` update policy with a column-restricted one (revoke `update` on
      the billing columns from `authenticated`, grant to `service_role`).
      Mirror into `supabase/schema.sql`; update `types/database.ts`.
- [ ] `lib/stripe/plans.ts`: `planIdFromPriceId` returns `PlanId | null`;
      `priceIdForPlan(plan, interval)`; add annual env ids to the seed. Leave `LIMIT_KINDS`,
      `PlanLimits`, and P6's exports untouched.
- [ ] `lib/entitlements.ts`: add `effectivePlan(profile)` implementing the period-end rule,
      and route `getPlanLimits`/`checkLimit` through it so a lapsed subscriber is limited as
      free. Do not change P6's existing signatures otherwise.
- [ ] `app/api/stripe/webhook/route.ts`: insert into `stripe_events` before the switch,
      return `{ received: true, duplicate: true }` on conflict; on unknown price id log and
      skip the plan write; add `invoice.payment_failed` and `customer.subscription.paused`
      writing `subscription_status`; persist `cancel_at_period_end`.
- [ ] `app/api/stripe/checkout/route.ts`: accept `{ plan, interval }`; look up
      `stripe_subscription_id`; if active or trialing call `stripe.subscriptions.update`
      instead of creating a session; 400 when the target matches the current plan and
      interval; resolve the price id from `plans`, not env directly.
- [ ] `app/(dashboard)/settings/billing/page.tsx`: render from `plans` + `plan_limits`;
      replace the simulated `handleUpgrade` with a `POST` to `/api/stripe/checkout`,
      following `url` when present and refreshing on `updated`; add a "Manage billing"
      action posting to `/api/stripe/portal`; show the real current plan from the profile
      rather than defaulting to `"pro"`; keep the monthly/annual toggle, now backed by real
      prices.
- [ ] Tests: webhook (duplicate `event.id` applies once; unknown price leaves plan
      unchanged; `invoice.payment_failed` sets status); checkout (no subscription -> session
      created; active subscription -> `subscriptions.update` called and `sessions.create`
      **not** called; same plan+interval -> 400); `effectivePlan` (past_due before period
      end keeps plan, after period end resolves free). Stripe SDK mocked throughout.
- [ ] Exercise the new profiles policy against a scratch database as a non-service role.

## Acceptance Criteria
- Launch check (docs/plan.md item 2): a Pro subscriber upgrading to Agency ends with exactly
  one active Stripe subscription; the checkout route calls `subscriptions.update` and never
  `checkout.sessions.create` for that caller.
- An authenticated user cannot change their own `plan`, `stripe_customer_id`,
  `stripe_subscription_id`, `subscription_status`, or period columns through the Supabase
  client; the attempt is refused by policy. Updating `onboarding_completed` still works.
- Replaying a captured `checkout.session.completed` with the same `event.id` applies the
  profile update exactly once; the second delivery is acknowledged as a duplicate.
- An unrecognised price id leaves the existing plan unchanged and logs; no silent downgrade.
- A `past_due` subscriber keeps paid limits until `current_period_end` passes, then
  `checkLimit` treats them as free. Verified through `effectivePlan`, not a cron.
- The billing page renders plan names, prices, features, and limits from the database; no
  hardcoded plan array remains; no code path simulates an upgrade with a timer.
- Monthly and annual both produce a valid Stripe price id; neither is advertised without one.
- No route accepts `plan`, `userId`, `stripe_customer_id`, or `stripe_subscription_id` from
  the request as authority (checklist line 38).
- `npx tsc --noEmit`, `npx next lint`, `npx vitest run` pass; P6's tests still pass.

## Verification
- `npx vitest run app/api/stripe lib` during work.
- Migration applied to a **scratch** Supabase project; then, as an authenticated non-service
  role, attempt `update profiles set plan='agency'` and confirm it is refused, and
  `update profiles set onboarding_completed=true` and confirm it succeeds.
- **Required live check, Stripe test mode only** (mark `Needs Verification` if unavailable):
  with test keys and `stripe listen`, run free -> Pro monthly checkout, then Pro -> Agency
  annual upgrade, and confirm in the Stripe dashboard that the customer has exactly one
  active subscription with a proration line. Replay a delivery and confirm the duplicate is
  a no-op. `stripe trigger invoice.payment_failed` and confirm status plus the period-end
  entitlement rule.
- Never use live Stripe keys or real customer data (`CLAUDE.md` §4). Test-mode keys only,
  never committed. The annual prices must already exist in test mode before this runs.
- Reviewer (high-risk lane, `.claude/agents/reviewer.md`): reproduce the duplicate-subscription
  bug on the pre-fix tree with a mocked Stripe client; independently confirm the policy blocks
  the self-upgrade; rerun `scripts/factory/verify.sh --full`.

## Approval Notes
Decisions recorded 2026-09-20 by the user (controller session). Binding for implementer and
reviewer; a deviation is a decision outside the brief and must stop for the user.

1. **Verify and fix in one task.** The item is worded as verification, but the billing page
   never calls the real routes, so the paths cannot be exercised without fixing them.
2. **Annual billing becomes real**, not removed: the two annual Stripe prices are created by
   a human in the dashboard and consumed here. Plan copy, prices, and limits are **data**,
   not code, so the "5 scans/month" contradiction is resolved by rendering from
   `plan_limits` rather than by editing a string.
3. **Split: this task stores, item 3 edits.** This task creates and seeds `plans` and reads
   from it; plan item 3 adds the admin role model and editing UI. Mirrors the P6 split.
4. **Profile column lockdown lands here**, not as a separate item. It is the highest-value
   fix in the task and makes P6's limits meaningful.
5. **Ordered after P6**, which landed as `414fe3b` and closed as Needs Verification. This
   task rebases on it and does not re-implement anything it owns.
6. **Failed payment: drop at period end.** A `past_due` or `unpaid` subscriber keeps their
   plan until `current_period_end`, then resolves to free. Evaluated at read time by
   `effectivePlan`, so no scheduled job is required.

Assumptions recorded, not decisions: proration uses Stripe's `create_prorations` default;
plan-change downgrade timing (as opposed to failed-payment timing) stays Stripe's default and
is left to plan item 3 or a follow-up; the annual prices must exist in Stripe test mode before
the live check can run. No remaining open questions.
