---
id: P4
title: Scope repository fetching to the GitHub App installation
lane: high-risk
status: draft
approval: pending
plan_item: 4
plan_status_owner: runner
source: docs/plan.md#4
created_at: 2026-09-19T23:04:25Z
runner_eligible: false
---

## Problem
`lib/github/fetch-repo.ts`'s `fetchRepoFiles` authenticates every fetch with a single
operator token read from `process.env.GITHUB_TOKEN || process.env.GITHUB_PAT` (see
`lib/github/fetch-repo.ts:25`), not the requesting user's GitHub App installation. Both
call sites accept an arbitrary `owner/repo` string from the client:
`app/api/scan/start/route.ts` (authenticated) and the unauthenticated
`app/svc/scan/route.ts`. Neither route checks that the target repo belongs to the caller's
installation before fetching it — `app/api/scan/start/route.ts` does look up a `repos` row
by `owner_id`/`full_name` (see `app/api/scan/start/route.ts:83`, the `.from("repos")`
ownership lookup; not indexed by codegraph as its own node — see "Additional context"
below), but that lookup only gates whether the repo has ever been *synced* to some
installation, not whether the operator token used to fetch it is scoped to that
installation — and the row is written with `installation_id: 0`
(`app/api/scan/start/route.ts:90`), so the stored data never records which installation
actually authorized the fetch either way. In short: today, any logged-in user can trigger a
scan of any repository the shared operator token can read, whether or not that repo is
connected to their own GitHub App installation — this is the Launch check plan item 4
exists to close. Per
[docs/implementation_plan.md §0.1](implementation_plan.md#01-scope-repository-fetching-to-the-github-app-installation-security--do-this-before-anything-else),
this stops being merely an authorization gap and becomes a genuine cross-tenant one the
moment a push webhook (which carries a real `installation.id`) is wired to the same fetch
function. `docs/checklist.md` under "Security Baseline" already records this as a
**confirmed gap** (2026-09-17 review): "repository access is NOT limited to the user's
installation... Fix per implementation_plan.md §0.1," plus a related confirmed partial gap
for `app/svc/scan`'s shared-token exposure.

## Codegraph Context
index: 2026-09-19T22:58:38Z (1789858718989), files: 89, stale: no

### `lib/github/fetch-repo.ts`

**Search results:**

- file `fetch-repo.ts` — `lib/github/fetch-repo.ts:1-112`
- import `@/lib/scan/rules` — `lib/github/fetch-repo.ts:1-1`
- constant `CODE_EXT` — `lib/github/fetch-repo.ts:3-3`
- constant `SKIP_PATH` — `lib/github/fetch-repo.ts:4-4`
- constant `MAX_FILES` — `lib/github/fetch-repo.ts:5-5`
- constant `MAX_FILE_BYTES` — `lib/github/fetch-repo.ts:6-6`
- constant `CONCURRENCY` — `lib/github/fetch-repo.ts:7-7`
- interface `FetchedRepo` — `lib/github/fetch-repo.ts:9-16` (exported)
- function `ghHeaders` — `lib/github/fetch-repo.ts:18-28`
- function `ghJson` — `lib/github/fetch-repo.ts:30-36`

**Related (edges) and unresolved references:**

- edge imports (out) `ScanFile` in `lib/scan/rules.ts` (line 1)
- edge imports (in) `route.ts` in `app/api/scan/start/route.ts` (line 6)
- edge imports (in) `route.ts` in `app/svc/scan/route.ts` (line 5)
- edge imports (in) `route.ts` in `app/api/scan/start/route.ts` (line 6)
- edge imports (in) `route.ts` in `app/svc/scan/route.ts` (line 5)
- edge references (out) `ScanFile` in `lib/scan/rules.ts` (line 14)
- edge calls (in) `POST` in `app/api/scan/start/route.ts` (line 67)
- edge calls (in) `POST` in `app/svc/scan/route.ts` (line 34)
- edge calls (in) `POST` in `app/api/scan/start/route.ts` (line 60)
- edge calls (in) `POST` in `app/svc/scan/route.ts` (line 27)

### `installation_id`

**Search results:**

- constant `bodySchema` — `app/api/github/connect/route.ts:7-9`

**Related (edges) and unresolved references:**

- edge contains (in) `route.ts` in `app/api/github/connect/route.ts`
- edge references (in) `POST` in `app/api/github/connect/route.ts`

### `repos`

**Search results:**

- constant `INITIAL_REPOS` — `app/(dashboard)/onboarding/page.tsx:47-53`
- constant `bodySchema` — `app/svc/scan/route.ts:13-16`
- constant `REPOS` — `components/dashboard/analytics-client.tsx:52-58`
- function `fetchRepoFiles` — `lib/github/fetch-repo.ts:68-111` (exported)

**Related (edges) and unresolved references:**

- edge references (out) `RepoItem` in `app/(dashboard)/onboarding/page.tsx` (line 47)
- edge references (out) `MAX_FILE_BYTES` in `lib/github/fetch-repo.ts`
- edge references (out) `CONCURRENCY` in `lib/github/fetch-repo.ts`
- edge references (out) `MAX_FILES` in `lib/github/fetch-repo.ts`
- edge references (out) `SKIP_PATH` in `lib/github/fetch-repo.ts`
- edge references (out) `CODE_EXT` in `lib/github/fetch-repo.ts`
- edge references (out) `FetchedRepo` in `lib/github/fetch-repo.ts` (line 68)
- edge references (out) `FetchedRepo` in `lib/github/fetch-repo.ts` (line 68)
- edge references (in) `OnboardingPage` in `app/(dashboard)/onboarding/page.tsx`
- edge references (in) `AnalyticsClient` in `components/dashboard/analytics-client.tsx`
- edge references (in) `POST` in `app/svc/scan/route.ts`
- edge calls (out) `ghJson` in `lib/github/fetch-repo.ts` (line 70)
- edge calls (out) `ghJson` in `lib/github/fetch-repo.ts` (line 74)
- edge calls (out) `pool` in `lib/github/fetch-repo.ts` (line 87)
- edge calls (out) `ghHeaders` in `lib/github/fetch-repo.ts` (line 93)
- edge calls (in) `POST` in `app/api/scan/start/route.ts` (line 67)
- edge calls (in) `POST` in `app/svc/scan/route.ts` (line 34)
- edge contains (in) `page.tsx` in `app/(dashboard)/onboarding/page.tsx`
- edge contains (in) `analytics-client.tsx` in `components/dashboard/analytics-client.tsx`
- edge contains (in) `route.ts` in `app/svc/scan/route.ts`
- edge contains (in) `fetch-repo.ts` in `lib/github/fetch-repo.ts`
- edge imports (in) `route.ts` in `app/api/scan/start/route.ts` (line 6)
- edge imports (in) `route.ts` in `app/svc/scan/route.ts` (line 5)

### `app/svc/scan`

**Search results:**

- file `route.ts` — `app/svc/scan/route.ts:1-56`
- import `next/server` — `app/svc/scan/route.ts:1-1`
- import `zod` — `app/svc/scan/route.ts:2-2`
- import `@/lib/rate-limit` — `app/svc/scan/route.ts:3-3`
- import `@/lib/scan/engine` — `app/svc/scan/route.ts:4-4`
- import `@/lib/github/fetch-repo` — `app/svc/scan/route.ts:5-5`
- constant `maxDuration` — `app/svc/scan/route.ts:7-7` (exported)
- constant `bodySchema` — `app/svc/scan/route.ts:13-16`
- function `POST` — `app/svc/scan/route.ts:18-55` (exported)

**Related (edges) and unresolved references:**

- edge imports (out) `rateLimit` in `lib/rate-limit.ts` (line 3)
- edge imports (out) `clientKey` in `lib/rate-limit.ts` (line 3)
- edge imports (out) `tooManyRequests` in `lib/rate-limit.ts` (line 3)
- edge imports (out) `runScanEngine` in `lib/scan/engine.ts` (line 4)
- edge imports (out) `fetchRepoFiles` in `lib/github/fetch-repo.ts` (line 5)
- edge imports (out) `parseRepoInput` in `lib/github/fetch-repo.ts` (line 5)
- edge calls (out) `rateLimit` in `lib/rate-limit.ts` (line 19)
- edge calls (out) `clientKey` in `lib/rate-limit.ts` (line 19)
- edge calls (out) `tooManyRequests` in `lib/rate-limit.ts` (line 20)
- edge calls (out) `parseRepoInput` in `lib/github/fetch-repo.ts` (line 27)
- edge calls (out) `fetchRepoFiles` in `lib/github/fetch-repo.ts` (line 34)
- edge calls (out) `runScanEngine` in `lib/scan/engine.ts` (line 43)

### `fetchRepoFiles`

**Search results:**

- import `@/lib/github/fetch-repo` — `app/api/scan/start/route.ts:6-6`
- import `@/lib/github/fetch-repo` — `app/svc/scan/route.ts:5-5`
- function `fetchRepoFiles` — `lib/github/fetch-repo.ts:68-111` (exported)

**Related (edges) and unresolved references:**

- edge calls (out) `ghJson` in `lib/github/fetch-repo.ts` (line 70)
- edge calls (out) `ghJson` in `lib/github/fetch-repo.ts` (line 74)
- edge calls (out) `pool` in `lib/github/fetch-repo.ts` (line 87)
- edge calls (out) `ghHeaders` in `lib/github/fetch-repo.ts` (line 93)
- edge calls (in) `POST` in `app/api/scan/start/route.ts` (line 67)
- edge calls (in) `POST` in `app/svc/scan/route.ts` (line 34)
- edge references (out) `MAX_FILE_BYTES` in `lib/github/fetch-repo.ts`
- edge references (out) `CONCURRENCY` in `lib/github/fetch-repo.ts`
- edge references (out) `MAX_FILES` in `lib/github/fetch-repo.ts`
- edge references (out) `SKIP_PATH` in `lib/github/fetch-repo.ts`
- edge references (out) `CODE_EXT` in `lib/github/fetch-repo.ts`
- edge references (out) `FetchedRepo` in `lib/github/fetch-repo.ts` (line 68)
- edge references (out) `FetchedRepo` in `lib/github/fetch-repo.ts` (line 68)
- edge contains (in) `fetch-repo.ts` in `lib/github/fetch-repo.ts`
- edge contains (in) `route.ts` in `app/svc/scan/route.ts`
- edge contains (in) `route.ts` in `app/api/scan/start/route.ts`
- edge imports (in) `route.ts` in `app/api/scan/start/route.ts` (line 6)
- edge imports (in) `route.ts` in `app/svc/scan/route.ts` (line 5)

### `app/api/scan/start/route.ts`

**Search results:**

- file `route.ts` — `app/api/scan/start/route.ts:1-136`
- import `next/server` — `app/api/scan/start/route.ts:1-1`
- import `zod` — `app/api/scan/start/route.ts:2-2`
- import `@/lib/supabase/server` — `app/api/scan/start/route.ts:3-3`
- import `@/lib/rate-limit` — `app/api/scan/start/route.ts:4-4`
- import `@/lib/scan/engine` — `app/api/scan/start/route.ts:5-5`
- import `@/lib/github/fetch-repo` — `app/api/scan/start/route.ts:6-6`
- constant `maxDuration` — `app/api/scan/start/route.ts:8-8` (exported)
- constant `MAX_FILES` — `app/api/scan/start/route.ts:10-10`
- constant `MAX_FILE_BYTES` — `app/api/scan/start/route.ts:11-11`

**Related (edges) and unresolved references:**

- edge imports (out) `createClient` in `lib/supabase/server.ts` (line 3)
- edge imports (out) `rateLimit` in `lib/rate-limit.ts` (line 4)
- edge imports (out) `clientKey` in `lib/rate-limit.ts` (line 4)
- edge imports (out) `tooManyRequests` in `lib/rate-limit.ts` (line 4)
- edge imports (out) `runScanEngine` in `lib/scan/engine.ts` (line 5)
- edge imports (out) `fetchRepoFiles` in `lib/github/fetch-repo.ts` (line 6)
- edge imports (out) `parseRepoInput` in `lib/github/fetch-repo.ts` (line 6)
- edge calls (out) `createClient` in `lib/supabase/server.ts` (line 24)
- edge calls (out) `rateLimit` in `lib/rate-limit.ts` (line 32)
- edge calls (out) `clientKey` in `lib/rate-limit.ts` (line 32)
- edge calls (out) `tooManyRequests` in `lib/rate-limit.ts` (line 33)
- edge calls (out) `runScanEngine` in `lib/scan/engine.ts` (line 42)
- edge calls (out) `parseRepoInput` in `lib/github/fetch-repo.ts` (line 60)
- edge calls (out) `fetchRepoFiles` in `lib/github/fetch-repo.ts` (line 67)
- edge calls (out) `runScanEngine` in `lib/scan/engine.ts` (line 76)

### `app/svc/scan/route.ts`

**Search results:**

- file `route.ts` — `app/svc/scan/route.ts:1-56`
- import `next/server` — `app/svc/scan/route.ts:1-1`
- import `zod` — `app/svc/scan/route.ts:2-2`
- import `@/lib/rate-limit` — `app/svc/scan/route.ts:3-3`
- import `@/lib/scan/engine` — `app/svc/scan/route.ts:4-4`
- import `@/lib/github/fetch-repo` — `app/svc/scan/route.ts:5-5`
- constant `maxDuration` — `app/svc/scan/route.ts:7-7` (exported)
- constant `bodySchema` — `app/svc/scan/route.ts:13-16`
- function `POST` — `app/svc/scan/route.ts:18-55` (exported)

**Related (edges) and unresolved references:**

- edge imports (out) `rateLimit` in `lib/rate-limit.ts` (line 3)
- edge imports (out) `clientKey` in `lib/rate-limit.ts` (line 3)
- edge imports (out) `tooManyRequests` in `lib/rate-limit.ts` (line 3)
- edge imports (out) `runScanEngine` in `lib/scan/engine.ts` (line 4)
- edge imports (out) `fetchRepoFiles` in `lib/github/fetch-repo.ts` (line 5)
- edge imports (out) `parseRepoInput` in `lib/github/fetch-repo.ts` (line 5)
- edge calls (out) `rateLimit` in `lib/rate-limit.ts` (line 19)
- edge calls (out) `clientKey` in `lib/rate-limit.ts` (line 19)
- edge calls (out) `tooManyRequests` in `lib/rate-limit.ts` (line 20)
- edge calls (out) `parseRepoInput` in `lib/github/fetch-repo.ts` (line 27)
- edge calls (out) `fetchRepoFiles` in `lib/github/fetch-repo.ts` (line 34)
- edge calls (out) `runScanEngine` in `lib/scan/engine.ts` (line 43)

### `getInstallationOctokit`

**Search results:**

- function `getInstallationOctokit` — `lib/github/app.ts:24-35` (exported)

**Related (edges) and unresolved references:**

- edge calls (out) `getGitHubApp` in `lib/github/app.ts` (line 25)
- edge calls (in) `syncInstallationRepos` in `lib/github/app.ts` (line 39)
- edge contains (in) `app.ts` in `lib/github/app.ts`

### `parseRepoInput`

**Search results:**

- import `@/lib/github/fetch-repo` — `app/api/scan/start/route.ts:6-6`
- import `@/lib/github/fetch-repo` — `app/svc/scan/route.ts:5-5`
- function `parseRepoInput` — `lib/github/fetch-repo.ts:53-60` (exported)

**Related (edges) and unresolved references:**

- edge calls (in) `POST` in `app/api/scan/start/route.ts` (line 60)
- edge calls (in) `POST` in `app/svc/scan/route.ts` (line 27)
- edge contains (in) `fetch-repo.ts` in `lib/github/fetch-repo.ts`
- edge contains (in) `route.ts` in `app/svc/scan/route.ts`
- edge contains (in) `route.ts` in `app/api/scan/start/route.ts`
- edge imports (in) `route.ts` in `app/api/scan/start/route.ts` (line 6)
- edge imports (in) `route.ts` in `app/svc/scan/route.ts` (line 5)

### `encodeURIComponent`

**Search results:**

- (no codegraph matches)

**Related (edges) and unresolved references:**

- (none)

### `lib/github/app.ts`

**Search results:**

- file `app.ts` — `lib/github/app.ts:1-105`
- import `@octokit/app` — `lib/github/app.ts:1-1`
- import `@octokit/rest` — `lib/github/app.ts:2-2`
- import `@/lib/supabase/server` — `lib/github/app.ts:3-3`
- function `getGitHubApp` — `lib/github/app.ts:5-22` (exported)
- function `getInstallationOctokit` — `lib/github/app.ts:24-35` (exported)
- function `syncInstallationRepos` — `lib/github/app.ts:37-103` (exported)

**Related (edges) and unresolved references:**

- edge imports (out) `createClient` in `lib/supabase/server.ts` (line 3)
- edge imports (in) `route.ts` in `app/api/github/connect/route.ts` (line 4)
- edge calls (out) `createClient` in `lib/supabase/server.ts` (line 38)
- edge calls (in) `POST` in `app/api/github/connect/route.ts` (line 38)
- edge calls (in) `GET` in `app/api/github/connect/route.ts` (line 62)

### `GITHUB_TOKEN`

**Search results:**

- function `fetchRepoFiles` — `lib/github/fetch-repo.ts:68-111` (exported)

**Related (edges) and unresolved references:**

- edge calls (out) `ghJson` in `lib/github/fetch-repo.ts` (line 70)
- edge calls (out) `ghJson` in `lib/github/fetch-repo.ts` (line 74)
- edge calls (out) `pool` in `lib/github/fetch-repo.ts` (line 87)
- edge calls (out) `ghHeaders` in `lib/github/fetch-repo.ts` (line 93)
- edge calls (in) `POST` in `app/api/scan/start/route.ts` (line 67)
- edge calls (in) `POST` in `app/svc/scan/route.ts` (line 34)
- edge references (out) `MAX_FILE_BYTES` in `lib/github/fetch-repo.ts`
- edge references (out) `CONCURRENCY` in `lib/github/fetch-repo.ts`
- edge references (out) `MAX_FILES` in `lib/github/fetch-repo.ts`
- edge references (out) `SKIP_PATH` in `lib/github/fetch-repo.ts`
- edge references (out) `CODE_EXT` in `lib/github/fetch-repo.ts`
- edge references (out) `FetchedRepo` in `lib/github/fetch-repo.ts` (line 68)
- edge references (out) `FetchedRepo` in `lib/github/fetch-repo.ts` (line 68)
- edge contains (in) `fetch-repo.ts` in `lib/github/fetch-repo.ts`
- edge imports (in) `route.ts` in `app/api/scan/start/route.ts` (line 6)
- edge imports (in) `route.ts` in `app/svc/scan/route.ts` (line 5)

### `GITHUB_PAT`

**Search results:**

- (no codegraph matches)

**Related (edges) and unresolved references:**

- (none)

### `userId`

**Search results:**

- function `syncInstallationRepos` — `lib/github/app.ts:37-103` (exported)

**Related (edges) and unresolved references:**

- edge calls (out) `createClient` in `lib/supabase/server.ts` (line 38)
- edge calls (out) `getInstallationOctokit` in `lib/github/app.ts` (line 39)
- edge calls (in) `POST` in `app/api/github/connect/route.ts` (line 38)
- edge calls (in) `GET` in `app/api/github/connect/route.ts` (line 62)
- edge contains (in) `app.ts` in `lib/github/app.ts`
- edge imports (in) `route.ts` in `app/api/github/connect/route.ts` (line 4)

### `repo_id`

**Search results:**

- (no codegraph matches)

**Related (edges) and unresolved references:**

- (none)

### Files in scope

- `app/api/github/connect/route.ts`
  - exported function `POST` (`app/api/github/connect/route.ts:11-47`) — signature: `(request: Request)`
  - exported function `GET` (`app/api/github/connect/route.ts:49-77`) — signature: `(request: Request)`
- `app/api/scan/start/route.ts`
  - exported constant `maxDuration` (`app/api/scan/start/route.ts:8-8`) — signature: `= 60`
  - exported function `POST` (`app/api/scan/start/route.ts:23-135`) — signature: `(request: Request)`
- `app/(dashboard)/onboarding/page.tsx`
  - exported function `OnboardingPage` (`app/(dashboard)/onboarding/page.tsx:61-490`) — signature: `()`
- `app/svc/scan/route.ts`
  - exported constant `maxDuration` (`app/svc/scan/route.ts:7-7`) — signature: `= 60`
  - exported function `POST` (`app/svc/scan/route.ts:18-55`) — signature: `(request: Request)`
- `components/dashboard/analytics-client.tsx`
  - exported function `AnalyticsClient` (`components/dashboard/analytics-client.tsx:79-424`) — signature: `()`
- `lib/github/app.ts`
  - exported function `getGitHubApp` (`lib/github/app.ts:5-22`) — signature: `()`
  - exported function `getInstallationOctokit` (`lib/github/app.ts:24-35`) — signature: `(installationId: number)`
  - exported function `syncInstallationRepos` (`lib/github/app.ts:37-103`) — signature: `(userId: string, installationId: number)`
- `lib/github/fetch-repo.ts`
  - exported interface `FetchedRepo` (`lib/github/fetch-repo.ts:9-16`)
  - exported function `parseRepoInput` (`lib/github/fetch-repo.ts:53-60`) — signature: `(input: string): { fullName: string; branch?: string } | null`
  - exported function `fetchRepoFiles` (`lib/github/fetch-repo.ts:68-111`) — signature: `(fullName: string, branch?: string): Promise<FetchedRepo>`

### Routes

- `app/api/github/connect/route.ts`
- `app/api/scan/start/route.ts`
- `app/svc/scan/route.ts`

### Likely tests

- (none found among the files above -- add prose here if the assistant knows of a relevant test path)

### Follow-up queries

Per `skills/task-master/SKILL.md` step 4. Every backtick-quoted path/identifier/env
var/table name in `docs/implementation_plan.md` §0.1 ("Scope repository fetching to the
GitHub App installation") and the `docs/checklist.md` "Security Baseline" lines this plan
item cites (lines 38–40) was extracted and passed to a re-run of:

```
scripts/factory/task-master.sh 4 --lane high-risk --force --terms fetchRepoFiles,app/api/scan/start/route.ts,installation_id,app/svc/scan/route.ts,repos,getInstallationOctokit,parseRepoInput,encodeURIComponent,lib/github/fetch-repo.ts,lib/github/app.ts,GITHUB_TOKEN,GITHUB_PAT,userId,repo_id
```

That rerun is what produced every per-term section above (`` `lib/github/fetch-repo.ts` ``
through `` `repo_id` ``) — this is not a second, separate script run layered on top of it.
I then additionally ran `codegraph-query.py search <term>` and, for every file already
named above, `codegraph-query.py related <file>` myself, term by term, to check for
anything the script's per-term sections missed:

- `search GITHUB_PAT`, `search repo_id`, `search encodeURIComponent` — each returns zero
  rows (already shown as "(no codegraph matches)" under their own headings above);
  confirmed by hand, nothing missed.
- `related lib/github/fetch-repo.ts`, `related lib/github/app.ts`,
  `related app/svc/scan/route.ts`, `related app/api/scan/start/route.ts` — every edge
  returned is already listed under the matching term's "Related" subsection above (e.g.
  `related lib/github/app.ts` returns `createClient`/`lib/supabase/server.ts` and the
  `app/api/github/connect/route.ts` callers, both already present under the
  `` `lib/github/app.ts` `` heading); no additional file or symbol found.
- `search repos` was already run by the script pass above (see the `` `repos` `` heading);
  by hand, this also confirms `app/api/scan/start/route.ts:83`'s `.from("repos")` call and
  `app/api/scan/start/route.ts:90`'s `installation_id: 0` literal do not appear as their own
  nodes/edges (string arguments and object-literal keys aren't indexed) — recorded instead
  as LLM prose under "Additional context" below, per SKILL.md's allowance for exactly this
  case.

Stop-condition check (SKILL.md step 4c) against every backtick-quoted span in
`docs/implementation_plan.md` §0.1, in the order they appear there:

| Backticked span | Status |
|---|---|
| `fetchRepoFiles` | found — own heading above, `lib/github/fetch-repo.ts:68-111` |
| `owner/repo` | not a codegraph path (an example input-format string, not a file/symbol) |
| `app/api/scan/start/route.ts` | found — own heading above |
| `installation_id: 0` | found — sanitizes to `installation_id`, own heading above; the literal `: 0` is prose, see "Additional context" |
| `app/svc/scan/route.ts` | found — own heading above |
| `installation.id` | not in the index (no webhook-payload file is in scope for this item; dotted JSON field, not a repo path) |
| `repos` | found — own heading above |
| `getInstallationOctokit(repo.installation_id)` | found — sanitizes to `getInstallationOctokit`, own heading above, `lib/github/app.ts:24-35` |
| `raw.githubusercontent.com` | not in the index (external host, not a file in this repo) |
| `parseRepoInput` | found — own heading above, `lib/github/fetch-repo.ts:53-60` |
| `?`, `#`, `..` | not applicable (punctuation being discussed, not paths/identifiers) |
| `encodeURIComponent` | not in the index (a JS builtin, not a symbol this repo defines) — `search encodeURIComponent` confirmed zero rows |

Every backtick-quoted path from `docs/implementation_plan.md` §0.1 is either named above or
explicitly listed here as not present in the index.

### Additional context (assistant-added; not queryable — confirmed absent above, not just unchecked)

- The `repos` ownership lookup: `.from("repos")` at `app/api/scan/start/route.ts:83`, and
  the `installation_id: 0` literal it writes at `app/api/scan/start/route.ts:90` — both are
  string/object-literal arguments to a Supabase client call, not indexed as their own
  codegraph nodes or edges (confirmed via `related app/api/scan/start/route.ts` above,
  which lists only real symbol edges).
- The shared operator token: `process.env.GITHUB_TOKEN || process.env.GITHUB_PAT`
  (`lib/github/fetch-repo.ts:25`), also referenced in the rate-limit error message at
  `lib/github/fetch-repo.ts:33` and the doc comment at `lib/github/fetch-repo.ts:66`. A
  plain env-var read, not a symbol.
- `app/svc/scan/route.ts` has no `repos` lookup at all and shares the same operator token,
  so it can fetch any private repo that token can read (already named above via its own
  term heading; called out again here as the specific gap, per `docs/checklist.md`'s
  confirmed partial gap).

## In Scope
- Resolving the target repo to a `repos` row owned by the requesting user and refusing
  otherwise, in the authenticated route only — per
  [implementation_plan.md §0.1](implementation_plan.md#01-scope-repository-fetching-to-the-github-app-installation-security--do-this-before-anything-else)
  ("Resolve the target repo to a `repos` row owned by the requesting user; refuse
  otherwise (authenticated route)").
- Fetching through `getInstallationOctokit(repo.installation_id)`
  (`lib/github/app.ts:24-35`) and the GitHub Contents/Git APIs instead of the shared
  `GITHUB_TOKEN`/`GITHUB_PAT` operator token, per the same §0.1 fix list.
- Restricting `app/svc/scan/route.ts` to unauthenticated, token-free access to genuinely
  public repos only (unauthenticated GitHub calls can only reach public content by
  construction) — or removing the route — per §0.1 ("Keep the public route restricted to
  genuinely public repos with **no** token at all... or remove it").
- Never persisting `installation_id: 0` (`app/api/scan/start/route.ts:90`); store the real
  installation id resolved from the owning `repos` row.
- Closing `docs/checklist.md` "Security Baseline" line 39's confirmed gap and line 40's
  confirmed partial gap for these two routes.

## Out of Scope
- The `parseRepoInput` `?`/`#`/`..` encoding hardening that §0.1 lists as "Minor" (separate,
  lower-severity cleanup; host is fixed so impact is low today), and the `encodeURIComponent`
  call it recommends (confirmed not a symbol this repo defines yet — see "Follow-up
  queries" above).
- Anything in [implementation_plan.md §0.2](implementation_plan.md#02-suppression-baseline-and-confidence-gating-prerequisite-for-any-ci-gate)
  (suppression/baseline/confidence gating), §0.3 (scoring model), or §0.4 (fix-engine
  security design) — separate prerequisites, not this item.
- `docs/checklist.md` "Security Baseline" lines 59–60 (installation callback/deletion
  ownership) and lines 199–209 (installation repo sync / webhook handling) — those cover
  the installation lifecycle, not the scan-fetch path this item scopes. The push webhook's
  `installation.id` wiring implementation_plan.md §0.1 warns about is separate work too
  (confirmed no webhook-payload file is in this item's codegraph scope — see "Follow-up
  queries" above).

## Implementation Tasks
- [ ] In `app/api/scan/start/route.ts`, require the resolved `repos` row (the existing
      `.from("repos")` lookup at `app/api/scan/start/route.ts:83`) to belong to the
      requesting user's installation before proceeding; return 403/404 otherwise.
- [ ] In `lib/github/fetch-repo.ts`, change `fetchRepoFiles` (currently
      `lib/github/fetch-repo.ts:68-111`) to accept an installation-scoped Octokit (or an
      installation id it can pass to `getInstallationOctokit`,
      `lib/github/app.ts:24-35`) instead of reading `GITHUB_TOKEN`/`GITHUB_PAT`
      (`lib/github/fetch-repo.ts:25`) itself, and fetch via the Contents/Git APIs.
- [ ] Update `app/api/scan/start/route.ts:90` to persist the real
      `installation_id` from the owning `repos` row, never `0`.
- [ ] Restrict `app/svc/scan/route.ts` to a token-free client for genuinely public repos
      only, or remove the route, per §0.1; update its doc comment
      (`app/svc/scan/route.ts:11`) to match whatever is shipped.
- [ ] Add a fixture/unit test for `fetchRepoFiles`'s new installation-scoped signature (no
      existing test references it — see "Likely tests" above) and a route-level test that
      a user cannot trigger a scan of a repo their installation does not own.

## Acceptance Criteria
- A logged-in user who is not connected to installation X cannot cause
  `app/api/scan/start/route.ts` to scan a repo that only installation X owns — the request
  is refused (403/404), and this is exercised by a route-level test.
- `app/svc/scan/route.ts` either performs no authenticated/token-bearing fetch at all, or is
  removed; either way it can no longer read a private repo via the shared operator token.
- No code path writes `installation_id: 0` for a newly scanned repo.
- `fetchRepoFiles` no longer reads `process.env.GITHUB_TOKEN`/`GITHUB_PAT` directly; it is
  called with an installation-scoped Octokit/installation id sourced from
  `lib/github/app.ts`'s `getInstallationOctokit`.
- Launch check (docs/plan.md item 4): "User A cannot trigger a scan of a repo not connected
  to their own installation, via either route."

## Verification
- `npx vitest run lib/github` (new fixture(s) for `fetchRepoFiles`'s installation-scoped
  path) and any new route-level test under `app/api/scan/__tests__/` or similar.
- Manual check: with two seeded installations/users, confirm user A's session cannot scan a
  repo owned only by installation B via `app/api/scan/start` or `app/svc/scan`.
- Manual check: inspect a freshly scanned repo's stored row and confirm `installation_id`
  is the real installation id, never `0`.
- `scripts/factory/verify.sh --full` (this is a high-risk-lane item touching `app/api/`,
  `lib/github/`; the reviewer reproduces in a scratch repo per `.claude/agents/reviewer.md`
  and reruns `verify.sh` itself rather than trusting the stamp).

## Approval Notes
Open questions (assistant-added, not answered here — for the human/controller reviewing
this draft before it moves out of `pending`/`draft` status):
- Should `app/svc/scan/route.ts` be restricted to public-repo-only fetches, or removed
  outright? §0.1 offers both options; this affects whether any client relying on the
  unauthenticated route needs a migration note.
- Does removing the global `GITHUB_TOKEN`/`GITHUB_PAT` fallback break any existing
  deployment that has no GitHub App installations configured yet (e.g. local dev)? Worth
  confirming before removing the fallback outright.
