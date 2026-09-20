---
id: P4
title: Scope repository fetching to the GitHub App installation
lane: high-risk
status: failed
approval: approved
plan_item: 4
plan_status_owner: runner
source: docs/plan.md#4
created_at: 2026-09-19T23:04:25Z
runner_eligible: false
runner_started_at: 2026-09-20T00:28:59Z
---

## Problem
`fetchRepoFiles` (`lib/github/fetch-repo.ts:68-111`) authenticates every GitHub call with
one operator token read from `process.env.GITHUB_TOKEN || process.env.GITHUB_PAT`
(`lib/github/fetch-repo.ts:25`), never with the requesting user's GitHub App installation.
Both callers pass an arbitrary client-supplied `owner/repo` string straight through:

- `app/api/scan/start/route.ts` (authenticated, `POST` at line 23) parses the body, calls
  `fetchRepoFiles` at line 67 with **no ownership check of any kind** before the fetch, and
  only afterwards upserts a `repos` row for the requesting user with `installation_id: 0`
  (line 90). Because `public.repos.installation_id` is `bigint not null`
  (`supabase/schema.sql:26`), `0` is the sentinel that makes the insert succeed, so the
  stored data can never say which installation authorised the fetch.
- `app/svc/scan/route.ts` (unauthenticated, `POST` at line 18) shares the same function and
  therefore the same token. Its own doc comment (lines 9-12) claims it "only reads public
  repos", which is false whenever the operator token can read a private repo.

Net effect, as `docs/plan.md` item 4 puts it: any logged-in user can scan any repo the
operator token can read, and anonymous callers can do the same through the public route.
[implementation_plan.md §0.1](implementation_plan.md#01-scope-repository-fetching-to-the-github-app-installation-security--do-this-before-anything-else)
calls this an authorization gap today that becomes a cross-tenant gap the moment the push
webhook (which carries a real `installation.id`) is wired to the same fetch function.
`docs/checklist.md` "Security Baseline" records it twice: line 39 (**confirmed gap**,
2026-09-17 review: access not limited to the user's installation, `installation_id: 0`
stored) and line 40 (**confirmed partial gap**: `app/svc/scan` shares the token). The
installation-scoped client this fix needs already exists as `getInstallationOctokit`
(`lib/github/app.ts:24-35`); per implementation_plan.md "Current state" bullet "GitHub App",
nothing in the scan path uses it today.

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

- `app/api/scan/start/route.ts` — the `.from("repos")` call at lines 82-95 is an **upsert
  after the fetch**, not a lookup before it; there is no ownership check anywhere in the
  handler. `installation_id: 0` is the object-literal argument at line 90. Neither is a
  codegraph node (confirmed via `related app/api/scan/start/route.ts` above).
- `lib/github/app.ts` — `getGitHubApp()` (`lib/github/app.ts:5-22`) returns `null` when the
  App env is missing or a placeholder; `getInstallationOctokit(installationId)`
  (`lib/github/app.ts:24-35`) returns `null` on failure; `syncInstallationRepos`
  (`lib/github/app.ts:37-103`) is the only writer of a real `installation_id` into `repos`
  today, and its non-production demo fallback writes `installationId || 999999`
  (`lib/github/app.ts:52-58`).
- `supabase/schema.sql:20-29` — `public.repos` has `installation_id bigint not null` and
  `unique(user_id, github_repo_id)`; RLS in
  `supabase/migrations/20260705000000_initial_schema.sql:117-120` scopes rows by `user_id`.
  No schema change is needed.
- `components/scan/real-scan-client.tsx:62` — the only caller of `/svc/scan`. Its UI copy at
  line 138 tells users private repos "need a GITHUB_TOKEN set on the server"; that is
  feature-availability wording and must change in step with the route (high-risk per
  `CLAUDE.md` Lanes).
- The operator token is a plain env read (`lib/github/fetch-repo.ts:25`), also in the 403
  error text at line 33 and the doc comment at line 66.
- `app/(dashboard)/onboarding/page.tsx` and `components/dashboard/analytics-client.tsx` in
  "Files in scope" are false positives from the `repos` search term (UI fixture constants);
  not touched by this item.
- Tests: `vitest.config.ts` includes only `**/__tests__/**/*.test.ts`; the sole existing test
  is `lib/scan/__tests__/engine.test.ts`. New tests belong in `lib/github/__tests__/` and
  `app/api/scan/start/__tests__/`.

## In Scope
Per
[implementation_plan.md §0.1](implementation_plan.md#01-scope-repository-fetching-to-the-github-app-installation-security--do-this-before-anything-else)
"Fix" list, and `docs/checklist.md` "Security Baseline" lines 39-40:
- Authenticated route: resolve the target repo to a `repos` row where `user_id` is the
  requesting user **before** fetching; refuse (404) if none exists. The row is the source
  of `installation_id`.
- Fetch through `getInstallationOctokit(repo.installation_id)` (`lib/github/app.ts:24-35`)
  using the GitHub API (Git Trees + Git blobs / Contents) for metadata, tree, and blob
  reads. `fetchRepoFiles` stops reading `GITHUB_TOKEN`/`GITHUB_PAT` itself.
- Never store `installation_id: 0`; the upsert at `app/api/scan/start/route.ts:82-95`
  either goes away (row already exists) or writes the resolved row's real id.
- Public route `app/svc/scan/route.ts`: keep it, public-only and token-free. Every GitHub
  call it makes is unauthenticated, so it can only reach public content by construction
  (§0.1's first option; decided, see Approval Notes). Fix its doc comment and the UI copy
  in `components/scan/real-scan-client.tsx:138` to match.
- No global-token fallback anywhere. If the GitHub App credentials are missing or
  `getInstallationOctokit` returns `null` for the resolved installation, the authenticated
  route returns 503 (decided, see Approval Notes).
- Tests under `lib/github/__tests__/` and `app/api/scan/start/__tests__/` for the
  behaviours in Acceptance Criteria.

## Out of Scope
- The §0.1 "Minor" `parseRepoInput` hardening (`encodeURIComponent` on owner/repo, blocking
  `?`, `#`, `..`); low impact because the host is fixed, and `encodeURIComponent` is
  confirmed not a symbol this repo defines yet (see "Follow-up queries" above). Separate
  micro-sized follow-up.
- Everything in implementation_plan.md §0.2 (suppression/baseline/confidence), §0.3
  (scoring), §0.4 (fix-engine security).
- Wiring the push webhook (`app/api/github/webhook/route.ts`) to the fetch path; that is
  the "CI/CD gate + real continuous monitoring" work in implementation_plan.md and
  `docs/checklist.md` line 371 (confirmed no webhook-payload file is in this item's
  codegraph scope, see "Follow-up queries" above). This item only makes the fetch function
  safe for it.
- `docs/checklist.md` "Authentication And Authorization" lines 59-61 (installation callback
  and deletion ownership) and "GitHub Integration" lines 199-209 (sync, dedupe, retry,
  reconnect UI): installation lifecycle, not the scan-fetch path.
- Using `raw.githubusercontent.com` with the installation token as a bearer to save API
  rate limit. Decided out for this task; blobs are read through the GitHub API only. A
  later item may revisit if installation rate limits bite in practice.
- Any `supabase/` schema or RLS change; the existing `repos` shape already carries what is
  needed.
- The `syncInstallationRepos` demo fallback (`lib/github/app.ts:41-70`) and its `999999`
  sentinel; noted in Approval Notes only.

## Implementation Tasks
- [ ] `lib/github/fetch-repo.ts`: change `fetchRepoFiles` to take an explicit client
      instead of reading env: `fetchRepoFiles(fullName, branch, client)` where `client`
      is either an installation Octokit from `getInstallationOctokit` or an explicit
      `{ anonymous: true }` marker. Route metadata, tree, and blob reads through the
      GitHub API (Git Trees + Git blobs / Contents) on both paths; do not read blobs from
      `raw.githubusercontent.com`. Delete `ghHeaders`'s `GITHUB_TOKEN`/`GITHUB_PAT` read
      (line 25) with no replacement fallback, and update the 403 message (line 33) and
      doc comment (line 66). Keep `CODE_EXT`, `SKIP_PATH`, `MAX_FILES`,
      `MAX_FILE_BYTES`, `CONCURRENCY`, `pool`, and the `FetchedRepo` shape unchanged.
- [ ] `app/api/scan/start/route.ts`: before line 65, select the `repos` row by
      `user_id = user.id` and `full_name = parsedRepo.fullName` (RLS also enforces
      `user_id`); return 404 `{ error: "Repository is not connected to your GitHub App
      installation" }` if absent (404, not 403: decided). Call
      `getInstallationOctokit(row.installation_id)`; return 503
      `{ error: "GitHub App is not configured or the installation is unavailable" }` if it
      is `null`. Never fall back to an env token. Pass the client to `fetchRepoFiles`.
- [ ] `app/api/scan/start/route.ts:78-95`: drop the `installation_id: 0` upsert. Use the
      resolved row's `id` for the `scans` insert; at most update `default_branch` on it.
- [ ] `app/svc/scan/route.ts`: call `fetchRepoFiles` with the anonymous client; rewrite the
      doc comment (lines 9-12) to state that only public repos are reachable and no token
      is ever used.
- [ ] `components/scan/real-scan-client.tsx:138`: replace the "need a GITHUB_TOKEN" copy
      with wording that private repos require connecting the GitHub App and scanning from
      the dashboard.
- [ ] `lib/github/__tests__/fetch-repo.test.ts`: with a stubbed client, assert (a) no
      `Authorization` header and no `process.env.GITHUB_TOKEN`/`GITHUB_PAT` read on the
      anonymous path, (b) the installation client is used for metadata, tree, and blob
      reads, (c) existing filtering/truncation behaviour is preserved.
- [ ] `app/api/scan/start/__tests__/route.test.ts`: mock `@/lib/supabase/server` and
      `@/lib/github/app`; assert a repo not in the user's `repos` rows returns 404 before
      any fetch, a `null` installation client returns 503 before any fetch, an owned repo
      fetches via `getInstallationOctokit(row.installation_id)`, and no write ever carries
      `installation_id: 0`.
- [ ] `docs/checklist.md`: on acceptance, controller ticks lines 39 and 40 (handled at
      close-out per `CLAUDE.md` §2.6, not by the implementer).

## Acceptance Criteria
- Launch check (docs/plan.md item 4): user A cannot trigger a scan of a repo not connected
  to their own installation, via either route. Covered by the route test (authenticated)
  and by construction for the public route (no credentials).
- `POST /api/scan/start` with a `repo` that has no `repos` row for the caller returns 404
  and performs zero GitHub requests.
- `POST /api/scan/start` for an owned repo returns 503 and performs zero GitHub requests
  when `getInstallationOctokit` returns `null` (App credentials missing or installation
  unavailable). Covered by the route test.
- `POST /api/scan/start` with an owned repo fetches through
  `getInstallationOctokit(<that row's installation_id>)` and never through an env token.
- No code path writes `installation_id: 0`; `grep -rn "installation_id: 0"` over `app/`
  and `lib/` returns nothing.
- `lib/github/fetch-repo.ts` contains no reference to `GITHUB_TOKEN`, `GITHUB_PAT`, or
  `raw.githubusercontent.com`; no code under `app/` or `lib/` reads either env var.
- `POST /svc/scan` sends no `Authorization` header on any request; a private repo returns
  the existing "not found (is it public?)" 502 path.
- The `files` upload path of `/api/scan/start` (lines 40-50) is unchanged.
- `npx tsc --noEmit`, `npx next lint`, and `npx vitest run` all pass, including
  `lib/scan/__tests__/engine.test.ts`.

## Verification
- `npx vitest run lib/github app/api/scan/start` during work (targeted).
- **Required live check (two installations).** Two users, one real GitHub App
  installation each. Confirm user A's session gets 404 from `/api/scan/start` for user
  B's repo, that a successful scan by user A writes a `scans` row whose `repo_id` points
  at a row with A's real `installation_id`, and that unsetting the App credentials makes
  the same request return 503. Unit and route tests do not substitute for this. If the
  environment is not available at close-out, the item closes as `Needs Verification`,
  not `Done`.
- Manual: `POST /svc/scan` with a known-private repo returns 502 "not found", even with
  `GITHUB_TOKEN` still set in the environment.
- `scripts/factory/verify.sh --full` once before ship. High-risk lane: the reviewer
  reproduces the bypass on the pre-fix tree (a scratch copy, stubbed `fetch`) and reruns
  `verify.sh` itself rather than trusting the stamp, per `.claude/agents/reviewer.md`.
- Never call live GitHub with real credentials during verification (`CLAUDE.md` §4).

## Approval Notes
Decisions recorded 2026-09-19 by the user (controller session). These are binding for the
implementer and reviewer; a deviation is a decision outside the brief and must stop for
the user.

1. **Public route.** Keep `app/svc/scan/route.ts`. It becomes public-only and token-free:
   no `Authorization` header on any GitHub call it makes. Not removed.
2. **Fetch mechanism.** Authenticated scans use the installation Octokit from
   `getInstallationOctokit` and the GitHub API for metadata, tree, and blob reads. The
   `raw.githubusercontent.com` bearer optimisation is explicitly out of this task.
3. **No global-token fallback.** `GITHUB_TOKEN`/`GITHUB_PAT` are no longer read anywhere
   in the fetch path. Missing GitHub App credentials, or a `null` client for the resolved
   installation, returns 503 from the authenticated route. Non-production environments
   without App credentials therefore cannot run authenticated scans; that is accepted.
4. **Unowned repo.** `/api/scan/start` returns 404 when the caller has no `repos` row for
   the requested repo. Not 403.
5. **Live verification is required.** The two-installation manual check in Verification
   is a completion requirement. If it cannot be run, the item closes as
   `Needs Verification`.

Lane is `high-risk` as given: paths under `lib/github/` and `app/api/` match the `CLAUDE.md`
high-risk list, and `components/scan/real-scan-client.tsx:138` is feature-availability copy.
No lane conflict. No remaining open questions.
