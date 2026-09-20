---
id: P6
title: Define and enforce plan usage limits
lane: high-risk
status: draft
approval: pending
plan_item: 6
plan_status_owner: runner
source: docs/plan.md#6
created_at: 2026-09-20T01:47:22Z
runner_eligible: false
---

## Problem
Plan limits exist only as constants. `lib/stripe/plans.ts:3-31` defines `scansPerMonth`
(free 1, pro/agency unlimited) and `reposLimit` (free 1, pro unlimited, agency 15), and the
marketing copy in `features` promises them, but nothing reads those two fields. The only
consumers of `PLANS` are `planIdFromPriceId`/`priceIdForPlan` (price mapping for checkout
and the webhook) and UI feature flags (`lib/hooks/use-user.ts:49-50` derives `isPro`/
`isAgency`). Every gated route enforces a per-minute in-memory rate limit and nothing else:

- `app/api/scan/start/route.ts` (`POST`, lines 24-154 after P4): 8 req/min, then fetches,
  scans, and inserts a `scans` row. A free user can run unlimited scans.
- `app/api/github/connect/route.ts` (`POST`, lines 11-47): 10 req/min, then
  `syncInstallationRepos` upserts every repo the installation exposes. A free user can
  connect any number of repos.
- `app/api/fix/generate/route.ts` (lines 11-38): 5 req/min, then returns
  `simulated: true`. No attempt counter.

There is no usage ledger and no billing-period anchor: `public.profiles`
(`supabase/schema.sql:8-17`) stores `plan`, `stripe_customer_id`, and
`stripe_subscription_id` only; `app/api/stripe/webhook/route.ts` writes `plan` on
subscription events (lines 42-77) but never the period start/end. Counting "scans this
month" therefore means counting `scans` rows by `started_at`, and counting repos means
counting `repos` rows.

The plan item also names monitored repos, certificates, exports, API usage, and team seats.
None of those has a server route today: `app/(dashboard)/monitoring`, `redteam`, and
`settings/team` are fixture pages, `monitoring_config` has no API writer, and there is no
certificate or export endpoint. Their limits can be *defined* now but only *enforced* once
a route exists.

Sources: `docs/checklist.md` "Usage Limits" lines 112-114 (enforce before scanning; scan
route does not enforce monthly/repo limits; track by Stripe billing period), "Upgrade
Options" lines 136-140 (store period locally; machine-readable limit errors with an
upgrade path; define downgrade-over-limit behaviour), "Plan Catalogue" line 13 (plans must
become database-backed before paid launch, which is plan item 3, not this item), and
`Roadmap.md` "Phase 1" item 1. Launch check: limits are enforced server-side for UI and
direct API calls.

## Codegraph Context
index: 2026-09-20T01:10:58Z (1789866658712), files: 91, stale: yes

### `lib/stripe/plans.ts`

**Search results:**

- file `plans.ts` — `lib/stripe/plans.ts:1-47`
- type_alias `PlanId` — `lib/stripe/plans.ts:1-1` (exported)
- constant `PLANS` — `lib/stripe/plans.ts:3-31` (exported)
- function `planIdFromPriceId` — `lib/stripe/plans.ts:34-39` (exported)
- function `priceIdForPlan` — `lib/stripe/plans.ts:42-46` (exported)

**Related (edges) and unresolved references:**

- edge calls (in) `POST` in `app/api/stripe/checkout/route.ts` (line 27)
- edge calls (in) `POST` in `app/api/stripe/webhook/route.ts` (line 45)
- edge calls (in) `POST` in `app/api/stripe/webhook/route.ts` (line 64)
- edge imports (in) `route.ts` in `app/api/stripe/checkout/route.ts` (line 5)
- edge imports (in) `route.ts` in `app/api/stripe/webhook/route.ts` (line 5)

### `reposLimit`

**Search results:**

- (no codegraph matches)

**Related (edges) and unresolved references:**

- (none)

### `scansPerMonth`

**Search results:**

- (no codegraph matches)

**Related (edges) and unresolved references:**

- (none)

### `app/api/scan/start/route.ts`

**Search results:**

- file `route.ts` — `app/api/scan/start/route.ts:1-155`
- import `next/server` — `app/api/scan/start/route.ts:1-1`
- import `zod` — `app/api/scan/start/route.ts:2-2`
- import `@/lib/supabase/server` — `app/api/scan/start/route.ts:3-3`
- import `@/lib/rate-limit` — `app/api/scan/start/route.ts:4-4`
- import `@/lib/scan/engine` — `app/api/scan/start/route.ts:5-5`
- import `@/lib/github/fetch-repo` — `app/api/scan/start/route.ts:6-6`
- import `@/lib/github/app` — `app/api/scan/start/route.ts:7-7`
- constant `maxDuration` — `app/api/scan/start/route.ts:9-9` (exported)
- constant `MAX_FILES` — `app/api/scan/start/route.ts:11-11`

**Related (edges) and unresolved references:**

- edge imports (out) `createClient` in `lib/supabase/server.ts` (line 3)
- edge imports (out) `rateLimit` in `lib/rate-limit.ts` (line 4)
- edge imports (out) `clientKey` in `lib/rate-limit.ts` (line 4)
- edge imports (out) `tooManyRequests` in `lib/rate-limit.ts` (line 4)
- edge imports (out) `runScanEngine` in `lib/scan/engine.ts` (line 5)
- edge imports (out) `fetchRepoFiles` in `lib/github/fetch-repo.ts` (line 6)
- edge imports (out) `parseRepoInput` in `lib/github/fetch-repo.ts` (line 6)
- edge imports (out) `getInstallationOctokit` in `lib/github/app.ts` (line 7)
- edge imports (in) `route.test.ts` in `app/api/scan/start/__tests__/route.test.ts` (line 41)
- edge calls (out) `createClient` in `lib/supabase/server.ts` (line 25)
- edge calls (out) `rateLimit` in `lib/rate-limit.ts` (line 33)
- edge calls (out) `clientKey` in `lib/rate-limit.ts` (line 33)
- edge calls (out) `tooManyRequests` in `lib/rate-limit.ts` (line 34)
- edge calls (out) `runScanEngine` in `lib/scan/engine.ts` (line 43)
- edge calls (out) `parseRepoInput` in `lib/github/fetch-repo.ts` (line 61)
- edge calls (out) `getInstallationOctokit` in `lib/github/app.ts` (line 81)
- edge calls (out) `fetchRepoFiles` in `lib/github/fetch-repo.ts` (line 91)
- edge calls (out) `runScanEngine` in `lib/scan/engine.ts` (line 104)
- edge calls (in) `route.test.ts` in `app/api/scan/start/__tests__/route.test.ts` (line 88)
- edge calls (in) `route.test.ts` in `app/api/scan/start/__tests__/route.test.ts` (line 105)
- edge calls (in) `route.test.ts` in `app/api/scan/start/__tests__/route.test.ts` (line 137)
- edge calls (in) `route.test.ts` in `app/api/scan/start/__tests__/route.test.ts` (line 168)

### `app/api/fix/generate/route.ts`

**Search results:**

- file `route.ts` — `app/api/fix/generate/route.ts:1-39`
- import `next/server` — `app/api/fix/generate/route.ts:1-1`
- import `zod` — `app/api/fix/generate/route.ts:2-2`
- import `@/lib/supabase/server` — `app/api/fix/generate/route.ts:3-3`
- import `@/lib/rate-limit` — `app/api/fix/generate/route.ts:4-4`
- constant `bodySchema` — `app/api/fix/generate/route.ts:6-9`
- function `POST` — `app/api/fix/generate/route.ts:11-38` (exported)

**Related (edges) and unresolved references:**

- edge imports (out) `createClient` in `lib/supabase/server.ts` (line 3)
- edge imports (out) `rateLimit` in `lib/rate-limit.ts` (line 4)
- edge imports (out) `clientKey` in `lib/rate-limit.ts` (line 4)
- edge imports (out) `tooManyRequests` in `lib/rate-limit.ts` (line 4)
- edge calls (out) `createClient` in `lib/supabase/server.ts` (line 12)
- edge calls (out) `rateLimit` in `lib/rate-limit.ts` (line 21)
- edge calls (out) `clientKey` in `lib/rate-limit.ts` (line 21)
- edge calls (out) `tooManyRequests` in `lib/rate-limit.ts` (line 22)

### `app/api/github/connect/route.ts`

**Search results:**

- file `route.ts` — `app/api/github/connect/route.ts:1-78`
- import `next/server` — `app/api/github/connect/route.ts:1-1`
- import `zod` — `app/api/github/connect/route.ts:2-2`
- import `@/lib/supabase/server` — `app/api/github/connect/route.ts:3-3`
- import `@/lib/github/app` — `app/api/github/connect/route.ts:4-4`
- import `@/lib/rate-limit` — `app/api/github/connect/route.ts:5-5`
- constant `bodySchema` — `app/api/github/connect/route.ts:7-9`
- function `POST` — `app/api/github/connect/route.ts:11-47` (exported)
- function `GET` — `app/api/github/connect/route.ts:49-77` (exported)

**Related (edges) and unresolved references:**

- edge imports (out) `createClient` in `lib/supabase/server.ts` (line 3)
- edge imports (out) `syncInstallationRepos` in `lib/github/app.ts` (line 4)
- edge imports (out) `rateLimit` in `lib/rate-limit.ts` (line 5)
- edge imports (out) `clientKey` in `lib/rate-limit.ts` (line 5)
- edge imports (out) `tooManyRequests` in `lib/rate-limit.ts` (line 5)
- edge calls (out) `createClient` in `lib/supabase/server.ts` (line 56)
- edge calls (out) `syncInstallationRepos` in `lib/github/app.ts` (line 62)
- edge calls (out) `createClient` in `lib/supabase/server.ts` (line 13)
- edge calls (out) `rateLimit` in `lib/rate-limit.ts` (line 22)
- edge calls (out) `clientKey` in `lib/rate-limit.ts` (line 22)
- edge calls (out) `tooManyRequests` in `lib/rate-limit.ts` (line 26)
- edge calls (out) `syncInstallationRepos` in `lib/github/app.ts` (line 38)
- edge instantiates (out) `URL` in `scripts/seed-demo.mjs` (line 50)
- edge instantiates (out) `URL` in `scripts/seed-demo.mjs` (line 73)

### `app/api/stripe/webhook/route.ts`

**Search results:**

- file `route.ts` — `app/api/stripe/webhook/route.ts:1-93`
- import `next/server` — `app/api/stripe/webhook/route.ts:1-1`
- import `stripe` — `app/api/stripe/webhook/route.ts:2-2`
- import `@/lib/stripe/client` — `app/api/stripe/webhook/route.ts:3-3`
- import `@/lib/supabase/admin` — `app/api/stripe/webhook/route.ts:4-4`
- import `@/lib/stripe/plans` — `app/api/stripe/webhook/route.ts:5-5`
- function `POST` — `app/api/stripe/webhook/route.ts:7-92` (exported)

**Related (edges) and unresolved references:**

- edge imports (out) `getStripe` in `lib/stripe/client.ts` (line 3)
- edge imports (out) `createAdminClient` in `lib/supabase/admin.ts` (line 4)
- edge imports (out) `planIdFromPriceId` in `lib/stripe/plans.ts` (line 5)
- edge calls (out) `getStripe` in `lib/stripe/client.ts` (line 20)
- edge calls (out) `createAdminClient` in `lib/supabase/admin.ts` (line 30)
- edge calls (out) `planIdFromPriceId` in `lib/stripe/plans.ts` (line 45)
- edge calls (out) `planIdFromPriceId` in `lib/stripe/plans.ts` (line 64)

### `profiles`

**Search results:**

- function `ProfileSettingsPage` — `app/(dashboard)/settings/profile/page.tsx:6-172` (exported)

**Related (edges) and unresolved references:**

- edge contains (in) `page.tsx` in `app/(dashboard)/settings/profile/page.tsx`

### `scans`

**Search results:**

- type_alias `ScanStatusType` — `types/index.ts:7-7` (exported)

**Related (edges) and unresolved references:**

- edge contains (in) `index.ts` in `types/index.ts`

### `plan`

**Search results:**

- constant `bodySchema` — `app/api/stripe/checkout/route.ts:8-10`
- function `DashboardSidebar` — `components/dashboard/sidebar.tsx:35-273` (exported)
- constant `DEMO_PROFILE` — `lib/demo.ts:21-25` (exported)
- function `planIdFromPriceId` — `lib/stripe/plans.ts:34-39` (exported)
- function `priceIdForPlan` — `lib/stripe/plans.ts:42-46` (exported)

**Related (edges) and unresolved references:**

- edge calls (out) `createClient` in `lib/supabase/client.ts` (line 40)
- edge calls (in) `DashboardLayout` in `app/(dashboard)/layout.tsx` (line 7)
- edge calls (in) `POST` in `app/api/stripe/checkout/route.ts` (line 27)
- edge calls (in) `POST` in `app/api/stripe/webhook/route.ts` (line 45)
- edge calls (in) `POST` in `app/api/stripe/webhook/route.ts` (line 64)
- edge references (out) `SidebarProps` in `components/dashboard/sidebar.tsx` (line 38)
- edge references (out) `PLANS` in `lib/stripe/plans.ts`
- edge references (out) `PlanId` in `lib/stripe/plans.ts` (line 42)
- edge references (out) `PlanId` in `lib/stripe/plans.ts` (line 34)
- edge references (out) `PlanId` in `lib/stripe/plans.ts` (line 34)
- edge references (in) `POST` in `app/api/stripe/checkout/route.ts`
- edge contains (in) `demo.ts` in `lib/demo.ts`
- edge contains (in) `route.ts` in `app/api/stripe/checkout/route.ts`
- edge contains (in) `sidebar.tsx` in `components/dashboard/sidebar.tsx`
- edge contains (in) `plans.ts` in `lib/stripe/plans.ts`
- edge contains (in) `plans.ts` in `lib/stripe/plans.ts`
- edge imports (in) `layout.tsx` in `app/(dashboard)/layout.tsx` (line 5)
- edge imports (in) `layout.tsx` in `app/(dashboard)/layout.tsx` (line 2)
- edge imports (in) `route.ts` in `app/api/stripe/checkout/route.ts` (line 5)
- edge imports (in) `route.ts` in `app/api/stripe/webhook/route.ts` (line 5)

### Files in scope

- `app/api/fix/generate/route.ts`
  - exported function `POST` (`app/api/fix/generate/route.ts:11-38`) — signature: `(request: Request)`
- `app/api/github/connect/route.ts`
  - exported function `POST` (`app/api/github/connect/route.ts:11-47`) — signature: `(request: Request)`
  - exported function `GET` (`app/api/github/connect/route.ts:49-77`) — signature: `(request: Request)`
- `app/api/scan/start/route.ts`
  - exported constant `maxDuration` (`app/api/scan/start/route.ts:9-9`) — signature: `= 60`
  - exported function `POST` (`app/api/scan/start/route.ts:24-154`) — signature: `(request: Request)`
- `app/api/stripe/checkout/route.ts`
  - exported function `POST` (`app/api/stripe/checkout/route.ts:12-66`) — signature: `(request: Request)`
- `app/api/stripe/webhook/route.ts`
  - exported function `POST` (`app/api/stripe/webhook/route.ts:7-92`) — signature: `(request: Request)`
- `app/(dashboard)/settings/profile/page.tsx`
  - exported function `ProfileSettingsPage` (`app/(dashboard)/settings/profile/page.tsx:6-172`) — signature: `()`
- `components/dashboard/sidebar.tsx`
  - exported function `DashboardSidebar` (`components/dashboard/sidebar.tsx:35-273`) — signature: `({   userEmail = "developer@vibeaudit.ai",   plan = "pro", }: SidebarProps)`
- `lib/demo.ts`
  - exported constant `DEMO_MODE` (`lib/demo.ts:19-19`) — signature: `= process.env.NEXT_PUBLIC_DEMO_MODE === "true"`
  - exported constant `DEMO_PROFILE` (`lib/demo.ts:21-25`) — signature: `= {   email: "demo@vibeaudit.ai",   plan: "agency" as const,   onboarding_completed: true, }`
  - exported constant `DEMO_REPO_COUNT` (`lib/demo.ts:28-28`) — signature: `= 4`
- `lib/stripe/plans.ts`
  - exported type_alias `PlanId` (`lib/stripe/plans.ts:1-1`)
  - exported constant `PLANS` (`lib/stripe/plans.ts:3-31`) — signature: `= {   FREE: {     id: "free" as PlanId,     name: "Free",     price: 0,     priceId: undefined as stri...`
  - exported function `planIdFromPriceId` (`lib/stripe/plans.ts:34-39`) — signature: `(priceId: string | null | undefined): PlanId`
  - exported function `priceIdForPlan` (`lib/stripe/plans.ts:42-46`) — signature: `(plan: PlanId): string | undefined`
- `types/index.ts`
  - exported type_alias `PlanType` (`types/index.ts:5-5`)
  - exported type_alias `SeverityType` (`types/index.ts:6-6`)
  - exported type_alias `ScanStatusType` (`types/index.ts:7-7`)
  - exported type_alias `FixPrStatusType` (`types/index.ts:8-8`)
  - exported type_alias `Profile` (`types/index.ts:10-10`)
  - exported type_alias `Repo` (`types/index.ts:11-11`)
  - exported type_alias `Scan` (`types/index.ts:12-12`)
  - exported type_alias `Finding` (`types/index.ts:13-13`)
  - exported type_alias `FixPr` (`types/index.ts:14-14`)
  - exported type_alias `MonitoringConfig` (`types/index.ts:15-15`)
  - exported type_alias `RepoWithLatestScan` (`types/index.ts:17-19`)
  - exported type_alias `ScanWithFindings` (`types/index.ts:21-24`)

### Routes

- `app/api/fix/generate/route.ts`
- `app/api/github/connect/route.ts`
- `app/api/scan/start/route.ts`
- `app/api/stripe/checkout/route.ts`
- `app/api/stripe/webhook/route.ts`

### Likely tests

- (none found among the files above -- add prose here if the assistant knows of a relevant test path)

### Additional context (assistant-added; stale index, confirmed by direct reads 2026-09-20)

- `scansPerMonth` and `reposLimit` (`lib/stripe/plans.ts:9-10,18-19,27-28`) have **zero
  readers** outside the `PLANS` literal itself; the codegraph `related` output above shows
  no incoming edges for either term.
- Rate limiting is `lib/rate-limit.ts` (`rateLimit`, `clientKey`, `tooManyRequests`), an
  in-memory per-instance window. It is not a plan limit and stays as is.
- `app/api/scan/start/route.ts` has two paths: `files` upload (lines ~41-51, no
  persistence, no `scans` row) and repo fetch (persists). Whether upload scans count against
  `scansPerMonth` is an open question below.
- Existing tests to extend: `app/api/scan/start/__tests__/route.test.ts` (mocks
  `@/lib/supabase/server`, `@/lib/github/app`, `@/lib/rate-limit`) and
  `lib/github/__tests__/fetch-repo.test.ts`. No test covers `plans.ts` or the connect route.
- `lib/demo.ts:19-28`: `DEMO_MODE` env flag with `DEMO_PROFILE.plan = "agency"` and
  `DEMO_REPO_COUNT = 4`; the demo path must not bypass server-side checks in production.
- `supabase/schema.sql` has no `usage`/`ledger` table and no period columns on `profiles`;
  `scans.started_at` (line 39) is the only timestamp usable for a calendar-month count.
- Plan items 2 (billing safety) and 3 (admin-editable commercial settings) are adjacent:
  this item enforces the constants that exist; item 3 later moves their *values* to the
  database behind the same helper.

## In Scope
- A single server-side entitlement helper, `lib/entitlements.ts`, exposing
  `getPlanLimits(plan)` and `checkLimit(userId, kind)` for kinds `scan`, `repo`, and
  `fix_attempt`, reading values from `lib/stripe/plans.ts` today (plan item 3 swaps the
  source later). Per `docs/checklist.md` line 112.
- Extend `lib/stripe/plans.ts` with the full limit shape for every kind the plan item names
  (`scansPerMonth`, `reposLimit`, `monitoredReposLimit`, `fixAttemptsPerMonth`,
  `certificatesPerMonth`, `exportsPerMonth`, `apiRequestsPerDay`, `teamSeats`), with
  explicit numbers for free/pro/agency; `Infinity` allowed. Per `docs/checklist.md` line 75.
- Enforce, before any side effect, in the three routes that exist:
  `app/api/scan/start/route.ts` (monthly scans), `app/api/github/connect/route.ts`
  (connected repos, counted after sync would exceed the limit), and
  `app/api/fix/generate/route.ts` (fix attempts, even while simulated, so the counter is
  real when the feature is).
- A uniform limit-exceeded response: HTTP 402, body `{ error, code: "plan_limit_exceeded",
  limit: { kind, used, max, resets_at }, upgrade: "/settings/billing" }`. Per
  `docs/checklist.md` line 138.
- Counting via existing tables (`scans` by `user_id` and `started_at`; `repos` by
  `user_id`), no new schema, using the period rule decided in Approval Notes.
- Route tests for each gate (limit reached returns 402 and performs no fetch/sync/insert;
  under limit proceeds) and a unit test for `getPlanLimits`.
- Tick `docs/checklist.md` lines 112-113 at close-out (controller).

## Out of Scope
- Enforcing monitored repos, certificates, exports, API usage, or team seats: no route
  exists to gate. Their *values* are defined here so those routes inherit them when built
  (plan items 15+; `docs/checklist.md` lines 261, 269-272).
- A usage ledger table (`docs/checklist.md` lines 115 and 321), AI cost tracking (line 116),
  top-up credits and included budgets (lines 117-121), daily caps (line 122), Redis-backed
  rate limits (line 111). Separate items.
- Storing Stripe `current_period_start/end` on `profiles` and the webhook change to write
  them (`docs/checklist.md` line 136) **unless** Approval Notes decision 2 picks billing
  period; then it moves in scope as a `supabase/migrations/` addition plus a webhook edit.
- Making limit values database-backed and admin-editable (plan item 3, checklist lines
  13, 74, 91).
- Downgrade behaviour for users already over their new limit (checklist line 140) beyond
  the rule fixed in Approval Notes decision 4.
- Any change to checkout, portal, or subscription update flows (plan item 2).
- UI changes beyond consuming the 402 body; the dashboard can show "limit reached" in a
  later micro item.

## Implementation Tasks
- [ ] `lib/stripe/plans.ts`: add a `limits` object to each plan in `PLANS` with all eight
      kinds and a `PlanLimits` type; keep `features` copy unchanged (marketing copy is
      high-risk and out of this item).
- [ ] `lib/entitlements.ts` (new): `getPlanLimits(plan: PlanId): PlanLimits`;
      `getUsage(supabase, userId, kind, periodStart)`; `checkLimit(...)` returning
      `{ ok: true } | { ok: false, response: NextResponse }` with the 402 body shape above.
      Period start computed per Approval Notes decision 2. Treat `Infinity` as no check.
- [ ] `app/api/scan/start/route.ts`: after auth and rate limit, before parsing the repo,
      call `checkLimit(..., "scan")`; apply to the fetch path, and to the upload path per
      Approval Notes decision 3. Read `plan` from the caller's `profiles` row server-side,
      never from the request.
- [ ] `app/api/github/connect/route.ts` `POST`: after `syncInstallationRepos`, or before it
      using the installation's repo count, refuse when the user's `repos` count would
      exceed `reposLimit`; on refusal, roll back or skip the upsert so no rows above the
      limit persist. Return 402.
- [ ] `app/api/fix/generate/route.ts`: call `checkLimit(..., "fix_attempt")` before the
      simulated response; count attempts from `fix_prs` rows if that table is the right
      sink, otherwise document the counting source in the helper.
- [ ] `lib/__tests__/entitlements.test.ts`: `getPlanLimits` for all three plans; `checkLimit`
      at 0, limit-1, limit, and `Infinity`; period boundary per decision 2.
- [ ] `app/api/scan/start/__tests__/route.test.ts`: add a free-plan user at 1 scan this
      period gets 402 with `code: "plan_limit_exceeded"` and no `fetchRepoFiles` call.
- [ ] `app/api/github/connect/__tests__/route.test.ts` (new): free user with 1 repo
      connecting a second gets 402 and no upsert.
- [ ] `lib/demo.ts` / any `DEMO_MODE` branch in the gated routes: confirm the demo profile
      does not bypass `checkLimit` in production.

## Acceptance Criteria
- Launch check (docs/plan.md item 6): limits are enforced server-side for UI and direct API
  calls. A `curl` with a valid session cookie against each of the three routes hits the
  same 402 as the UI.
- A free-plan user with one scan in the current period gets 402 from `/api/scan/start` and
  no GitHub request, `scans` insert, or `findings` insert occurs.
- A free-plan user with one connected repo gets 402 from `/api/github/connect` and the
  `repos` table is unchanged.
- Pro users are never blocked on scans or repos; agency users are blocked at 15 repos.
- Every 402 body carries `code: "plan_limit_exceeded"`, the `limit` object, and
  `upgrade`.
- The plan used for the check comes from the `profiles` row, not the request body or a
  client-controlled header.
- `lib/stripe/plans.ts` exports a limit value for all eight kinds on all three plans.
- `npx tsc --noEmit`, `npx next lint`, `npx vitest run` pass; P4's tests are untouched.

## Verification
- `npx vitest run lib app/api/scan/start app/api/github/connect` during work.
- Manual, needs a live Supabase (mark `Needs Verification` if unavailable): with a free
  profile, run one scan, confirm the second returns 402 and the dashboard surfaces the
  message; connect an installation exposing two repos, confirm one persists. Flip the
  profile to `pro` directly in the database and confirm both succeed.
- Reviewer (high-risk lane, `.claude/agents/reviewer.md`): reproduce the bypass on the
  pre-fix tree (free user, two scans) in a scratch copy with stubbed Supabase; confirm no
  route reads `plan` from the request; rerun `scripts/factory/verify.sh --full` itself.
- Never call live Stripe or GitHub with real credentials (`CLAUDE.md` §4).

## Approval Notes
WARNING: codegraph index is stale (index_older_than_head); re-indexing is a human decision, not this script's
Open questions for the human/controller before this leaves `pending`/`draft`. Each changes
the implementation:
1. **Scope: enforce only what exists?** The plan item lists eight limit kinds; only scans,
   connected repos, and (simulated) fix attempts have routes. The draft defines all eight
   values but enforces three. Confirm, or name additional surfaces to build routes for.
2. **Period: calendar month or Stripe billing period?** `docs/checklist.md` line 114 says
   billing period, but `profiles` has no period columns and the webhook does not write
   them. Calendar month (UTC, from `scans.started_at`) needs no schema change and ships
   now; billing period adds a migration and a `supabase/` + `app/api/stripe/webhook/`
   edit, both high-risk paths, and a fallback rule for free users with no subscription.
   Draft recommends calendar month now, billing period as a follow-up when item 2 lands.
3. **Do upload-path scans count?** `/api/scan/start` with `files` persists nothing. Counting
   them needs a lightweight usage row; not counting them lets a free user scan unlimited
   uploads. Draft recommends counting them, which pulls a minimal `usage_events` table
   into scope (conflicts with the no-schema assumption above; resolve together with 2).
4. **Downgrade over limit.** When a pro user with 10 repos drops to free, the draft rule
   is: existing rows stay, new connects are refused, scans of already-connected repos are
   allowed up to the scan limit. Confirm or change.
5. **Limit numbers for kinds with no route.** Draft proposes: monitored repos free 0 / pro
   Infinity / agency 15; fix attempts free 0 / pro 50 / agency 200 per month; certificates
   and exports free 0 / pro Infinity / agency Infinity; API requests per day free 0 / pro
   1000 / agency 5000; team seats free 1 / pro 1 / agency 5. These are placeholders for
   product decision, not derived from anything in the repo.
The codegraph index was stale when drafted (warning above); context confirmed by direct
file reads on 2026-09-20.
