# Technical Implementation Plan — Closing the Competitive Gap

References: [FINDINGS.md](FINDINGS.md) · [Roadmap.md](Roadmap.md) · [plan.md](plan.md) · [competitor_research.md](competitor_research.md)

This translates the "easy win" gaps identified in [competitor_research.md](competitor_research.md) into concrete engineering work against the actual codebase. It assumes the Phase 0/1 items in [plan.md](plan.md) (fabricated testimonial, billing safety, admin controls) land first — this is what comes after, focused on detection capability rather than commercial/honesty fixes.

> **Review status (2026-09-17):** reviewed against the codebase and GitHub documentation. Corrections are marked **[Review]** inline; prerequisites that must ship before the packs are in [Part 0](#part-0--prerequisites-surfaced-in-review); the [build order](#suggested-build-order-revised-in-review) at the bottom was revised.

## Current architecture (as-built, not aspirational)

- **Rule model** — `lib/scan/rules.ts` exports `RULES: Rule[]`, where `Rule = { id, name, severity, cwe, appliesTo(file), detect(file) }`. Nine rules today, all inline regex against raw file text, hardcoded in TypeScript.
- **Engine** — `lib/scan/engine.ts`'s `runScanEngine(files)` loops `RULES × files`, is pure, synchronous, in-memory. No network calls, no queue.
- **Explanations** — `lib/ai/explain.ts` is a *second*, parallel `Record<ruleId, Explanation>` that must be kept in sync by hand with `rules.ts` — every new rule requires editing two files and matching a string key correctly with no compiler check that they stay aligned.
- **Fetch** — `lib/github/fetch-repo.ts` pulls the current file tree via the Git Trees API + `raw.githubusercontent.com` (capped at 400 files / 512KB each). No git-history walking, no diff-only mode yet. **[Review] It authenticates with a single operator token (`GITHUB_TOKEN`/`GITHUB_PAT` from env), not an installation token — see Part 0.1.**
- **Public scan route** — **[Review]** `app/svc/scan/route.ts` is an unauthenticated, non-persisting scan endpoint that shares `fetchRepoFiles` (and therefore the operator token) with the authenticated route. Anything added to the fetch/scan path (SCA network calls, history walking) is also exposed anonymously unless explicitly gated.
- **Language coverage** — **[Review]** `fetch-repo.ts` pulls `py/rb/go/php/yml/yaml/json` files, but every code rule in `rules.ts` is gated on `isCode` (JS/TS extensions only). A Python or Go repo is fetched, scanned by nothing, and scored 100.
- **Scoring** — **[Review]** `lib/scan/scorer.ts` is additive with no cap or dedupe: 4 criticals = 0.
- **Scan entrypoint** — `app/api/scan/start/route.ts` is fully synchronous request/response (`maxDuration = 60`). This works because regex scanning is fast; it will not work once a scan step involves history-walking or external network round-trips at scale.
- **GitHub App** — `lib/github/app.ts` can mint installation-scoped Octokit clients, **[Review] but nothing in the scan path uses them today** (`syncInstallationRepos` is the only caller); the webhook (`app/api/github/webhook/route.ts`) verifies HMAC and handles `installation`/`installation_repositories` events for real, but the `push` handler only logs (Roadmap.md gap #3).
- **Data model** — Supabase tables `profiles/repos/scans/findings/fix_prs/monitoring_config`, all RLS-scoped to `auth.uid()`. `findings` is already a generic bag (`check_type, severity, file_path, line, title, plain_english, fix_suggestion, cwe`) — it doesn't yet carry a rule *version*, confidence score, or OWASP/ASVS mapping.

---

## Part 0 — Prerequisites surfaced in review

These are not new features. They are gaps that the work in Parts 1–2 would either build on top of or make worse. Ship them first.

### 0.1 Scope repository fetching to the GitHub App installation (security — do this before anything else)

`fetchRepoFiles` authenticates with one operator token from env. Today, any logged-in user can POST any `owner/repo` string to `app/api/scan/start/route.ts`; if the operator token can read that repo, it is fetched, scanned, and persisted under the requesting user with `installation_id: 0`. The anonymous `app/svc/scan/route.ts` route uses the same token. This is an authorization gap now, and it becomes a cross-tenant one the moment the push webhook (which carries `installation.id`) is wired to the same fetch function.

Fix:
- Resolve the target repo to a `repos` row owned by the requesting user; refuse otherwise (authenticated route).
- Fetch through `getInstallationOctokit(repo.installation_id)` and the Contents/Git APIs, not `raw.githubusercontent.com` with a global token.
- Keep the public route restricted to genuinely public repos with **no** token at all (unauthenticated GitHub calls only reach public content by construction), or remove it.
- Never store `installation_id: 0`.
- Minor: `parseRepoInput` lets `?`, `#`, and `..` through into the API path. Host is fixed so impact is low, but `encodeURIComponent` the owner and repo segments.

### 0.2 Suppression, baseline, and confidence gating (prerequisite for any CI gate)

`missing-auth` recognises only Supabase's `auth.getUser(`/`getSession(` and three helper names; `no-rate-limiting` recognises four rate-limit identifiers. Every Clerk, NextAuth, tRPC, cron, health-check, and intentionally public endpoint is a false positive. A gate that fails builds on these will be disabled by the customer within days, and every competitor ships the escape hatch (`nosemgrep`, `.gitleaksignore`, CodeQL baselines).

Ship, in this order:
- Inline ignore: `// vibeaudit-ignore <rule-id> [reason]` on the flagged line or the line above.
- Repo config: `.vibeaudit.yml` with per-rule `enabled`, per-rule `severity` override, and `exclude` path globs (test fixtures, generated code).
- Baseline mode for the gate: fail only on findings **new in the pushed diff**, never on pre-existing ones.
- Gate default: fail only on `confidence: high` + `severity: critical`; everything else annotates.

### 0.3 Scoring model revision (before rule packs widen)

`calculateSecurityScore` subtracts 25/12/5/2 per finding with no floor, dedupe, or cap. Four criticals zero the score. The `secrets-extended` pack alone will add hundreds of patterns; one committed test-fixture folder will zero every repo, and the score stops meaning anything (and the "58 → 99" story in the promo collapses). Before packs: dedupe by `(rule, file)`, cap the contribution per category, and weight by confidence. Snapshot the score per fixture in the test harness so scoring changes are visible in review.

### 0.4 Fix-engine security design (record it now, even though the build is Phase 2)

The autonomous PR engine is the feature customers were sold. When it is built:
- Generate against the exact scanned `commit_sha`; refuse if the branch has moved.
- Separate GitHub App permission sets: read-only for scanning; `contents: write` + `pull_requests: write` only for repos where the user has explicitly enabled fixes.
- Validate that the diff applies cleanly; run lint/`tsc` when available; never auto-merge.
- Treat repository content as **untrusted input to the fix model**: a malicious or compromised repo can embed instructions that steer the LLM into introducing a backdoor. Isolate repo content from instructions in the prompt and constrain the output to a single-file diff for the flagged range.
- Idempotency per `(finding, commit_sha)` so repeated clicks don't open duplicate PRs.
- Decide metering first: Pro is $29 flat with unlimited fix PRs; see [competitor_research.md §(d)](competitor_research.md#d-unit-economics-of-real-autofix--added-in-review).

---

## Part 1 — Rule engine redesign: making detection flexible and able to grow

This is the priority item. The current design (`RULES: Rule[]` hardcoded in one TypeScript file, explanations hand-synced in a second file) does not scale past a handful of rules — every addition is a code change + redeploy, there's no way to group/version/toggle rules, no per-rule confidence or false-positive controls, and no mapping to a compliance framework (which the fixture-only Compliance dashboard will eventually need to be real).

### Industry standards to build on instead of inventing our own

| Standard | What it gives us | Where it plugs in |
|---|---|---|
| **CWE** (MITRE) | Already in use (`cwe` field on every finding). Canonical weakness taxonomy. | Keep as the primary classification field. |
| **CWE Top 25 Most Dangerous Software Weaknesses** (MITRE/CISA, published annually) | A prioritized, evidence-based list of which weakness classes matter most. | Use to prioritize which new rules to write next, and to justify severity defaults. |
| **OWASP Top 10** (web) / **OWASP API Security Top 10** / **OWASP Top 10 for LLM Applications** | Widely recognized categories customers and auditors already know. The existing `prompt-injection` rule (CWE-1427) maps directly to OWASP LLM01. | Add an `owasp` field per rule (e.g. `"LLM01:2025"`, `"A01:2021-Broken Access Control"`) alongside `cwe`. Cheap, high narrative value, and reusable later for the Compliance dashboard once that's real. |
| **OWASP ASVS** (Application Security Verification Standard) | A leveled (L1/L2/L3) checklist of concrete verification requirements, each with a stable ID (e.g. `V4.1.1`). | Map each rule to the ASVS control(s) it verifies. This is the single best foundation for turning the Compliance dashboard from fixture data into something real and defensible, because ASVS requirements are independently auditable. |
| **SARIF** (OASIS Static Analysis Results Interchange Format) | The standard output format for static analysis findings — what CodeQL, Semgrep, and ESLint all emit. GitHub's Code Scanning API accepts SARIF uploads directly (`POST /repos/{owner}/{repo}/code-scanning/sarif`) and will render findings natively in the repo's Security tab and as PR annotations. | Add a SARIF exporter alongside the existing JSON findings shape, **for download and for customers' own CI pipelines**. **[Review] Do not build the CI gate on SARIF upload.** GitHub code scanning (and therefore SARIF upload) is unavailable on private repos for Free/Pro accounts, and Team/Enterprise orgs must buy GitHub Code Security ($30/committer/mo) to enable it (verified against GitHub docs). The target buyer's app is a private repo on a personal plan. Upload also needs `security_events: write`, which conflicts with the read-only scanning permission goal in checklist.md. Use **Check Runs with `output.annotations`** (works on every plan, up to 50 annotations per update call, batchable) for the gate. |
| **Gitleaks rule set** (MIT-licensed, community-maintained TOML patterns) | ~150+ vetted secret-detection regexes, actively maintained against new API key formats. | Don't hand-roll secret patterns forever — import/adapt gitleaks' pattern library as the seed for the expanded secrets rule pack instead of reinventing each vendor's key format. |
| **Semgrep Registry rule schema** (YAML: `id`, `languages`, `message`, `severity`, `metadata.cwe`, `metadata.owasp`, `patterns`) | The de facto community format for declarative, data-driven SAST rules. | Model VibeAudit's own declarative rule schema on this shape (below) rather than inventing a bespoke one — makes it trivial to later import/adapt public Semgrep rules that overlap with our CWE categories. |

### Proposed rule schema (declarative, not hardcoded TS)

Move from "a rule is a TypeScript object with an inline function" to "a rule is data," with a thin compiler that turns it into the same runtime shape `runScanEngine` already consumes — so the engine itself doesn't change, only where rules come from.

```jsonc
{
  "id": "supabase-rls-permissive-policy",
  "version": 1,
  "name": "Row Level Security policy allows unrestricted access",
  "pack": "baas-security",          // groups rules for enable/disable, pricing tiers, marketing
  "severity": "critical",
  "confidence": "high",             // supports future false-positive tuning / filtering
  "cwe": "CWE-284",
  "owasp": "A01:2021-Broken Access Control",
  "asvs": ["V4.1.1", "V4.1.3"],
  "appliesTo": { "pathGlobs": ["**/*.sql"] },
  "pattern": {
    "type": "regex",
    "match": "using\\s*\\(\\s*true\\s*\\)",
    "context": "create policy"       // optional: require this substring on the same/preceding line(s)
  },
  "explanation": {
    "plainEnglish": "A database policy allows unrestricted access to every row.",
    "consequence": "Any authenticated (or anonymous) user can read or modify every row in this table, including other users' data.",
    "fix": "Scope the policy with `using (auth.uid() = user_id)` or an equivalent ownership check instead of `true`."
  },
  "references": ["https://supabase.com/docs/guides/database/postgres/row-level-security"]
}
```

Key decisions this schema bakes in:
- **One source of truth per rule** — folds `explain.ts`'s parallel lookup table into the rule definition itself, so `id` drift between files becomes structurally impossible.
- **`pack` field** — rules group into named packs (`baas-security`, `secrets`, `owasp-top10`, `llm-security`, `sca`). Packs can be toggled per scan, marketed individually, and gated by plan tier (e.g. "Agency plan unlocks the full secrets pack") without touching engine code.
- **`owasp`/`asvs` fields** — free compliance-mapping groundwork; this is what eventually lets the Compliance dashboard show real, defensible control coverage instead of a hardcoded fixture array.
- **Escape hatch preserved** — rules that genuinely need multi-line/stateful logic (like the existing `rls-disabled` table/policy cross-reference, or `missing-auth`'s handler-detection) can still ship as a hand-written `detect()` function registered under the same `id`/`pack`/metadata envelope. Not everything has to be regex-only; the schema wraps *both*.
- **[Review] Regex from data is a ReDoS surface.** JavaScript's regex engine backtracks. Phase A rules are author-controlled and reviewed, but Phase B customer-authored rules in a database table are a denial-of-service vector against your own scan functions. Lint every pattern with a catastrophic-backtracking check in the fixture harness (e.g. `safe-regex2`) or execute through `re2`; enforce a per-rule timeout. The existing 512KB per-file cap helps but does not prevent exponential patterns.
- **[Review] `appliesTo` must be honest about language coverage.** Fetch pulls Python/Ruby/Go/PHP, rules ignore them, and the report says 100. Either narrow `fetch-repo.ts` to the extensions rules cover and print "N files in unsupported languages were not scanned" in the report, or add a first non-JS pack. False assurance is worse than false positives for a security product.

### Where rule definitions live (phased)

1. **Phase A (do this now):** Rule definitions as versioned JSON/YAML files under `lib/scan/rules/<pack>/*.json`, loaded at build time. Still zero infrastructure change, still fully static/free, but now adding a rule is "add a JSON file + a fixture test," not "edit two TypeScript files and hope the id strings match." Code-review-friendly, diffable, and sets up rule packs as a real concept.
2. **Phase B (later, only if needed):** Move rule definitions into a `rule_definitions` Supabase table, hot-reloadable without a redeploy. This is what would let a paid tier offer *custom* customer-authored rules — a genuine monetization angle worth flagging, but out of scope until Phase A packs (BaaS, expanded secrets, OWASP LLM) prove the schema out.

### Testing harness (borrow this from gitleaks/Semgrep too)

Every rule ships with a paired fixture: a minimal file that *should* trigger it and one that *should not* (e.g. a policy using `auth.uid()` correctly). A test runs `runScanEngine` against each fixture and asserts the expected finding count. This is exactly how gitleaks and the Semgrep Registry validate community rule contributions, and it's what keeps a growing rule set from silently regressing (a change to one regex breaking an unrelated rule, false-positive creep, etc.).

---

## Part 2 — Feature implementation, now expressed as rule packs / engine changes

With the schema above in place, most of the "easy win" features from `competitor_research.md` become **new rule packs**, not new subsystems.

### Pack: `baas-security` (Supabase/Firebase) — build first
- `rls-permissive-policy` (`using (true)` / `with check (true)`) — CWE-284
- `rls-missing-insert-check` (insert policy with no `with check`) — CWE-284
- `firebase-open-rules` (`allow read, write: if true` in `firestore.rules`/`database.rules.json`) — new `appliesTo` path glob, no engine change
Pure data addition under the Phase A schema. No architecture change. Highest cited real-world prevalence per the competitor research.

### Pack: `secrets-extended`
Seed from gitleaks' pattern library (MIT license, so directly reusable) instead of hand-writing each vendor format. Same `SECRET_PATTERNS`-style regex approach, just far more of them, now expressed as individual rule-pack entries instead of one array baked into a single rule's `detect()`.
- **[Review]** The current patterns are already stale: OpenAI keys have been `sk-proj-…` (with hyphens) since 2024, and `rules.ts`'s `/sk-[a-zA-Z0-9]{32,}/` cannot match them. Evidence the hand-rolled approach doesn't keep up.
- **[Review]** Add a Shannon-entropy filter so placeholder keys in docs and `.env.example`-style files don't fire.

### Pack: `sca` — first pack that needs a real engine extension, not just data
Dependency/CVE + "slopsquatting" checks operate on the parsed `package.json` manifest as a whole, not per-line-per-file, so this needs a second detector *type* beyond regex-on-a-file:
- New `lib/scan/sca.ts`: parse dependencies, batch-query OSV.dev's free `POST /v1/querybatch` for known CVEs, and check each package name against the npm registry (404 → likely hallucinated/AI-invented package name).
- **Honesty note:** this introduces a genuine outbound network call per scan, which changes the "pure regex, no network call" claim FINDINGS.md verified as true today. That claim needs an explicit caveat ("except the optional SCA pack") once this ships — flag for whoever owns marketing copy.
- Needs timeout + graceful degradation (SCA pack failing shouldn't fail the whole scan).
- **[Review]** A registry 404 catches *invented* names. The real slopsquatting attack is a package that **exists because an attacker registered the hallucinated name**. Add registry-metadata heuristics: published < 90 days ago, very low weekly downloads, single maintainer, no repository link.
- **[Review]** Keep SCA off `app/svc/scan/route.ts`: an unauthenticated route that fans out to OSV and the npm registry per request is a traffic-amplification vector against third parties and a cost sink.

### Pack: `ai-provenance` (narrative/positioning feature, lower security value)
Flag likely-AI-authored files via commit message/author heuristics (Copilot/Cursor/Claude Code trailers, Lovable/Replit bot accounts) fetched via `octokit.repos.listCommits`. Not a per-file regex rule — needs a commit-metadata fetch step. Cheap to build, mainly valuable for the "security for AI-built apps" brand story (mirrors SonarQube's "AI Code Assurance").

### CI/CD gate + real continuous monitoring — build this right after `baas-security` (and after Part 0)
Closes Roadmap.md gap #3. The webhook already receives verified `push` events and the payload carries `installation.id`. **[Review] Two constraints the original plan missed:**

- **GitHub abandons webhook deliveries after 10 seconds.** Create check → fetch changed files → scan → update check, on a cold serverless function, will not reliably fit. A timed-out delivery is marked failed, may be redelivered, and produces duplicate check runs. The handler must verify the signature, dedupe on `x-github-delivery`, persist a job row, return `202`, and do the work out-of-band (`waitUntil` from `@vercel/functions` on Next 14, or QStash). "Defer async infrastructure" is right for full-repo scans and wrong for the webhook.
- **Use Check Runs, not SARIF upload** (see the standards table): code scanning is unavailable on the target buyer's private repos.

Revised flow:
1. Webhook: verify HMAC, dedupe delivery ID, insert a `scan_jobs` row `(installation_id, repo, head_sha, delivery_id)`, respond `202`.
2. Background: `octokit.checks.create()` `in_progress`; fetch only the files listed in the push payload's `added`/`modified` through the **installation** Octokit (Part 0.1); run `runScanEngine`; apply `.vibeaudit.yml` + inline ignores (Part 0.2); compute new-vs-baseline.
3. `octokit.checks.update()` with `conclusion: failure` only for *new* high-confidence criticals, `neutral`/`success` otherwise, and `output.annotations` for every finding.
4. Requires the App to have `checks: write`; keep that separate from any `contents: write` used for fixes.

### Git-history secret scanning
Same commit-walking primitive as `ai-provenance`: for each commit in the push payload, fetch its patch (`octokit.repos.getCommit`) and run `secrets-extended` against added (`+`) lines only. Natural to ship alongside the CI-gate work since both consume the same webhook event and Octokit client.

### Security headers / CORS
Split scope explicitly:
- **In-repo config check** (cheap, fits Phase A rule schema): flag missing CSP/HSTS/X-Frame-Options in `middleware.ts`/`next.config.mjs`.
- **Live URL header check** (what black-box competitors actually do): a genuinely new capability — VibeAudit has no "scan a deployed URL" mode today. Scope as a separate, explicit decision later; don't bundle into the rule-pack work.

---

## Architecture decision point: async jobs

None of the Part 2 items *individually* force a queue if scoped to "just the pushed commit's diff" — they fit inside a synchronous webhook response. But full-repo git-history scans, SCA across a large dependency tree, or protecting against webhook timeouts all eventually want an actual background job, which is what `worker/index.ts` was clearly meant to become (currently a 6-line stub with no queue behind it). Also worth noting: `lib/rate-limit.ts` is explicitly in-memory/per-instance today (its own comment flags this), so any real job/queue infrastructure decision should account for the same "needs a shared backend across serverless instances" problem rather than solving it twice. **Recommendation: defer this.** Ship everything above scoped to per-push-diff (synchronous, no queue) first; only build real async infrastructure (e.g. Upstash QStash, which pairs cleanly with Vercel serverless) if a full historical/repo-wide scan becomes a hard product requirement. **[Review] Amendment:** the queue is *not* deferrable for the webhook handler specifically; see the 10-second constraint above. A job-row + `waitUntil` handoff is the minimum, and it is the natural seed for the eventual worker.

---

## Suggested build order (revised in review)

0. **Part 0.1** — installation-scoped fetch + ownership checks. Small, and it is a live authorization gap.
1. **Part 0.2** — suppression, baseline, confidence gating. Prerequisite for any gate.
2. `baas-security` rule pack (Part 1 schema + first real pack) — validates the declarative format end to end. Differentiate from Supabase's own Security Advisor ([competitor_research.md Table 3](competitor_research.md#table-3--free-first-party-substitutes-added-in-review)) by cross-referencing policies with how app code queries.
3. CI/CD gate via Check Runs with async handoff and delivery dedupe. SARIF as export only.
4. **Part 0.3** — scoring model revision, before packs widen.
5. `secrets-extended` from gitleaks, with ReDoS lint and entropy filter; git-history secret scanning on the same commit-walking primitive.
6. `sca` pack — first external-network-call feature; off the public route; needs the honesty caveat above.
7. Language-coverage decision (narrow fetch, or first Python pack).
8. `ai-provenance` — lowest security value, mainly positioning; do opportunistically.
9. Live URL/header scanning — explicit separate scope decision; see [competitor_research.md §(e)](competitor_research.md#e-black-box-url-scanning--deferral-revisited-in-review) for why it may matter more than first assumed.

This slots into [plan.md](plan.md) as new work under Phase 2/3 (Product Claim Alignment / Expansion) rather than replacing any existing item there — the Phase 0/1 honesty and billing items still gate everything above.
