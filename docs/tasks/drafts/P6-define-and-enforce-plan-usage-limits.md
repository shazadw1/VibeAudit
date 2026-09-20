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
Decided scope (Approval Notes decisions 1-6). Per `docs/checklist.md` "Usage Limits"
lines 112-115, "Upgrade Options" lines 136-140, "Plan Catalogue" line 75, and
`Roadmap.md` "Phase 1" item 1:
- **Limits stored in the database, not `plans.ts`.** A new `public.plan_limits` table
  (one row per plan id, one column per kind) seeded by migration with the placeholder
  values in Approval Notes decision 6. `lib/stripe/plans.ts` keeps price mapping and
  `features` copy only; `scansPerMonth`/`reposLimit` are removed from it so there is one
  source. Admin editing of these rows is plan item 3.
- **Usage counted from one append-only ledger.** New `public.usage_events`
  (`user_id, kind, occurred_at, ref_id`) written by every gated route, including
  upload-path scans on `/api/scan/start` that persist nothing else. RLS: users can select
  and insert their own rows; no update or delete.
- **Period = Stripe billing period.** New `profiles.current_period_start` and
  `current_period_end` columns, written by `app/api/stripe/webhook/route.ts` on
  `checkout.session.completed` (lines 47-54) and `customer.subscription.updated/created`
  (lines 65-68) from `sub.current_period_start/end`, cleared on `deleted` (lines 75-78).
  Free users with null columns fall back to a calendar month anchored on
  `profiles.created_at`.
- **One entitlement helper**, `lib/entitlements.ts`: `getPlanLimits(plan)` reads
  `plan_limits`; `currentPeriod(profile)`; `checkLimit(supabase, userId, kind)` returns
  `{ ok: true }` or `{ ok: false, response }` with the 402 body below; `recordUsage(...)`.
  All eight kinds are first-class: `scan`, `repo`, `monitored_repo`, `fix_attempt`,
  `certificate`, `export`, `api_request`, `team_seat`.
- **Enforcement points**, all reading `plan` from the caller's `profiles` row server-side:
  - `scan`: `app/api/scan/start/route.ts` both paths.
  - `repo`: `app/api/github/connect/route.ts` `POST`.
  - `fix_attempt`: `app/api/fix/generate/route.ts`, even while simulated.
  - `monitored_repo`: a new minimal `app/api/monitoring/route.ts` `POST { repoId, enabled }`
    that upserts `monitoring_config` (`supabase/schema.sql:68-73`, currently has no
    writer) and refuses enabling beyond the limit. This is the only new feature route.
  - `certificate`, `export`, `api_request`, `team_seat`: no feature exists to gate, so
    enforcement is the helper kind plus a unit test proving `checkLimit` blocks at the
    limit. A source-level guard test asserts every `app/api/**/route.ts` that writes a
    `usage_events` row calls `checkLimit` first, so the first real route for these kinds
    cannot skip it. (Ruling on decision 1's "routes or checks"; see Approval Notes.)
- **Uniform 402 response**: `{ error, code: "plan_limit_exceeded", limit: { kind, used,
  max, period_end }, upgrade: "/settings/billing" }`. Per checklist line 138.
- **Downgrade rule** (decision 4): existing rows stay; new creations of any kind return
  402 until under the limit; scans of already-connected repos allowed up to the scan
  limit. No row is ever removed or disabled by this item.
- Tests for each enforcement point, the helper, the period fallback, and the webhook
  period write.
- Tick `docs/checklist.md` lines 112-114 and 136 at close-out (controller).

## Out of Scope
- The admin role model and settings UI that edits `plan_limits` (plan item 3; checklist
  lines 62-63 and 84-99). This item makes the rows exist; item 3 makes them editable.
- Making downgrades apply at period end rather than immediately (checklist line 135;
  plan item 2). This item assumes the webhook flips `plan` whenever Stripe says so and
  applies the downgrade rule at that moment, whenever it is.
- Building certificates, exports, API keys, or team invitations. Only the limit kinds
  and the guard exist; the features are Phase 3 (plan items 15+).
- AI cost tracking, included budgets, top-ups, markup (checklist lines 116-121);
  daily caps (line 122); Redis-backed rate limits (line 111); status polling limits
  (line 124).
- Dashboard UI for "limit reached" beyond passing the 402 body through; a later micro
  item can render it.
- Any change to checkout, portal, or subscription-update flows (plan item 2).
- Removing the in-memory `rateLimit` calls; they stay as abuse protection.

## Implementation Tasks
- [ ] `supabase/migrations/<ts>_plan_limits_and_usage.sql`: create `plan_limits`
      (`plan text primary key check in ('free','pro','agency')`, eight integer columns
      with `null` meaning unlimited, `updated_at`), seed three rows with decision 6 values;
      create `usage_events` (`id uuid`, `user_id uuid references profiles`, `kind text`
      check in the eight kinds, `occurred_at timestamptz default now()`, `ref_id text`)
      with index on `(user_id, kind, occurred_at)`; add `current_period_start` and
      `current_period_end timestamptz` to `profiles`. RLS: `plan_limits` select for all
      authenticated, no client writes; `usage_events` select/insert own rows only. Mirror
      into `supabase/schema.sql`.
- [ ] `types/database.ts`: add the two tables and the two profile columns.
- [ ] `lib/stripe/plans.ts`: delete `scansPerMonth` and `reposLimit`; export a
      `LIMIT_KINDS` tuple and `PlanLimits` type; leave `features` copy byte-identical.
- [ ] `lib/entitlements.ts` (new): `getPlanLimits`, `currentPeriod`, `checkLimit`,
      `recordUsage`, `limitExceededResponse`. `null` limit = no check. Counting is one
      `usage_events` count query per check, scoped to `user_id`, `kind`, and
      `occurred_at >= period_start`; `repo`, `monitored_repo`, and `team_seat` are
      **standing** counts (rows in `repos`, enabled rows in `monitoring_config`, seats
      table when it exists) rather than period counts. Document which kinds are which.
- [ ] `app/api/stripe/webhook/route.ts`: write `current_period_start/end` at lines 47-54
      and 65-68 from `sub.current_period_start/end` (epoch seconds to ISO); set both to
      `null` at lines 75-78.
- [ ] `app/api/scan/start/route.ts`: after auth and rate limit, `checkLimit(..., "scan")`;
      on success `recordUsage("scan", ref_id = scanId or "upload")` for both paths.
- [ ] `app/api/github/connect/route.ts` `POST`: before `syncInstallationRepos`, compare the
      user's current `repos` count plus the installation's accessible repo count against
      the limit; refuse with 402 if it would exceed; otherwise sync and record one
      `repo` event per new row.
- [ ] `app/api/fix/generate/route.ts`: `checkLimit(..., "fix_attempt")` then
      `recordUsage` before the simulated response.
- [ ] `app/api/monitoring/route.ts` (new): auth, rate limit, body `{ repoId, enabled }`,
      verify the repo belongs to the user, `checkLimit(..., "monitored_repo")` when
      enabling, upsert `monitoring_config`, `recordUsage`. Disabling always allowed.
- [ ] `lib/__tests__/entitlements.test.ts`: all eight kinds at 0, max-1, max, `null`;
      period fallback for null columns; 402 body shape.
- [ ] `app/api/scan/start/__tests__/route.test.ts`: free user at limit gets 402 with no
      fetch; upload path records a usage event.
- [ ] `app/api/github/connect/__tests__/route.test.ts`, `app/api/fix/generate/__tests__/`,
      `app/api/monitoring/__tests__/` (new): limit reached returns 402 and no write.
- [ ] `app/api/stripe/webhook/__tests__/route.test.ts` (new): subscription events write
      period columns; deleted clears them. Stripe SDK mocked; no live calls.
- [ ] `lib/__tests__/entitlement-guard.test.ts`: reads every `app/api/**/route.ts`; any
      file containing `usage_events` or `recordUsage(` must also contain `checkLimit(`.
- [ ] `lib/demo.ts` and any `DEMO_MODE` branch in gated routes: confirm the demo profile
      never bypasses `checkLimit` in production.

## Acceptance Criteria
- Launch check (docs/plan.md item 6): limits are enforced server-side for UI and direct
  API calls; a `curl` with a session cookie hits the same 402 as the UI on every gated
  route.
- Free user with one `scan` event this period: `/api/scan/start` returns 402, no GitHub
  request, no `scans`/`findings`/`usage_events` write.
- Free user with one repo: `/api/github/connect` returns 402 and `repos` is unchanged.
- Free user: `/api/monitoring` enable returns 402; disable succeeds.
- Agency user: blocked at the 15th repo; pro user: never blocked on scans or repos.
- After a `customer.subscription.updated` event, `profiles.current_period_start/end`
  equal the subscription's values; after `deleted`, both are null and the free fallback
  period applies.
- Every 402 carries `code: "plan_limit_exceeded"`, the `limit` object, and `upgrade`.
- The plan and period used come from `profiles`, never from the request.
- `lib/stripe/plans.ts` no longer defines numeric limits; `plan_limits` has three seeded
  rows with all eight columns.
- Downgrade: a free profile with 10 existing repos can still scan them (up to the scan
  limit) but cannot connect an 11th or enable monitoring.
- The guard test fails if any API route records usage without checking the limit.
- `npx tsc --noEmit`, `npx next lint`, `npx vitest run` pass; P4 tests untouched.

## Verification
- `npx vitest run lib app/api` during work.
- Migration applied to a scratch Supabase project (never production) and `schema.sql`
  diffed against it.
- **Required live check** (mark `Needs Verification` if unavailable): free profile runs
  one repo scan and one upload scan, third returns 402; connects a two-repo installation,
  one persists; enabling monitoring returns 402. Send a Stripe test-mode
  `customer.subscription.updated` via the CLI to a local webhook and confirm the period
  columns. Flip the profile to `pro` in the database and confirm all succeed.
- Reviewer (high-risk lane, `.claude/agents/reviewer.md`): reproduce the bypass on the
  pre-fix tree (free user, two scans) in a scratch copy; confirm no route trusts `plan`
  from the client; confirm the migration's RLS blocks a user reading another user's
  `usage_events`; rerun `scripts/factory/verify.sh --full` itself.
- Never call live Stripe or GitHub with real credentials (`CLAUDE.md` §4).

## Approval Notes
WARNING: codegraph index is stale (index_older_than_head); re-indexing is a human decision, not this script's
Decisions recorded 2026-09-20 by the user (controller session). Binding for implementer and
reviewer; a deviation is a decision outside the brief and must stop for the user.

1. **Scope: all eight kinds.** Scans, connected repos, monitored repos, fix attempts,
   certificates, exports, API usage, team seats. Controller ruling on the user's "routes
   or checks": a real route is built only where a table already exists to gate
   (`monitoring_config`); the four kinds with no feature get helper enforcement, unit
   tests, and the source-level guard, not stub routes. Confirm or overrule this ruling.
2. **Period: Stripe billing period**, stored on `profiles` by the webhook; calendar-month
   fallback anchored on `profiles.created_at` for profiles with null period columns.
3. **Usage source: a single `usage_events` ledger** written by every gated route. Upload
   scans count.
4. **Downgrade: keep rows, block new.** Nothing destructive. Downgrade *timing* (period
   end vs immediate) is plan item 2's responsibility; this item applies the rule at
   whatever moment `profiles.plan` changes.
5. **Limit values are data, not code.** They live in `plan_limits` rows and are meant to
   be admin-edited via UI. Split: this item creates and seeds the table and reads from
   it; plan item 3 builds the admin role model and the editing UI.
6. **Seed values** (placeholders, editable once item 3 lands; `null` = unlimited):

   | kind | free | pro | agency |
   |---|---|---|---|
   | scans / period | 1 | null | null |
   | connected repos | 1 | null | 15 |
   | monitored repos | 0 | null | 15 |
   | fix attempts / period | 0 | 50 | 200 |
   | certificates / period | 0 | null | null |
   | exports / period | 0 | null | null |
   | api requests / day | 0 | 1000 | 5000 |
   | team seats | 1 | 1 | 5 |

   These are not derived from anything in the repo; they exist so the migration has
   values and match today's `plans.ts` for scans and repos.

Assumptions recorded, not decisions: `api_request` is a per-day kind while the others are
per-period or standing; the `features` marketing strings in `plans.ts` are not touched.
The codegraph index was stale when drafted (warning above); context confirmed by direct
file reads on 2026-09-20. No remaining open questions except confirmation of the ruling
in decision 1.
