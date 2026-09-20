# Due-Diligence Findings — VibeAudit

Acquired via Flippa as "PRODUCT 2 — Security Scanner for AI-Built Apps," sold together with Voxorio as a two-product bundle. Audited against the seller's listing claims on 2026-09-09.

## Git history
- Single commit ("Initial commit"), no branches/tags, consistent with a squashed transfer snapshot rather than real development history.

## Claim-by-claim verdict — this product checks out well

| # | Claim | Verdict |
|---|---|---|
| 1 | 9 detection rules (CWE-798, 200, 284, 306, 602, 89, 79, 1427, 770) | Implemented — `lib/scan/rules.ts:63-200`, real regex detection logic for all 9 |
| 2 | Runs in-process, no external scanning service | Implemented — `lib/scan/engine.ts:33-40`, pure regex, no network call |
| 3 | Finding schema (path/line/severity/explanation/consequence/fix) | Implemented — `lib/scan/engine.ts`, `lib/ai/explain.ts` |
| 4 | Full scan pipeline (fetch → rules → score → store) | Implemented |
| 5 | Deterministic plain-English explanations, zero LLM cost | Implemented — `lib/ai/explain.ts` is a static lookup table, no LLM call |
| 6 | GitHub OAuth + magic link login | Implemented — `app/(auth)/login`, `signup`, `api/auth/callback` |
| 7 | GitHub App + auto repo sync | Implemented — `app/api/github/webhook/route.ts:51-85` |
| 8 | HMAC-SHA256 webhook verification | Implemented — `app/api/github/webhook/route.ts:9-16`, uses `timingSafeEqual` |
| 9 | Supabase schema (profiles/repos/scans/findings/fix_prs/monitoring_config), RLS-isolated | Implemented — `supabase/migrations/20260705000000_initial_schema.sql` |
| 10 | Stripe billing (Free/Pro $29/Agency $99) | Implemented — server-derived pricing, signature-verified webhooks |
| 11 | Rate limiting on expensive routes | Implemented — `lib/rate-limit.ts`, sliding window |
| 12 | 81 TS files, compiles clean | File count roughly confirmed (~83); compile-clean **unverified** — toolchain not installed in audit environment, run `tsc --noEmit` before closing |

## Honest-disclosure verification — seller's disclosed gaps all check out

- **Auto-PR "fix it for me" not implemented** — confirmed honestly simulated (`app/api/fix/generate/route.ts:29-37` returns `{simulated: true, status: "not_implemented"}`).
- **Pattern/regex-based, not AST/dataflow** — confirmed.
- **4 fixture-only dashboard pages (~1900 lines, Red Team Arena / Fleet / Compliance / Analytics)** — confirmed, hardcoded arrays, no real API calls.
- **scan-worker is a placeholder** — confirmed, 6-line stub.
- **Continuous monitoring verifies webhooks but doesn't auto re-scan on push** — confirmed, `push` event handler only logs.

## Issues found

1. **Fabricated testimonial in marketing copy.** `components/marketing/landing-client.tsx:1293` has a customer quote claiming the "autonomous PR generator... opened 4 clean GitHub pull requests" — this directly contradicts the backend's own honest `"not_implemented"` label on that same feature. Minor but real dishonesty in sales material, worth flagging as evidence of embellishment elsewhere in the listing.
2. VibeAudit's own codebase was checked against its own 9 detection categories — **no matches found** (no exposed secrets, disabled RLS, unauthenticated routes, or client-trusted payment amounts in its own code).

## Overall assessment

Unlike the sibling Resumelevate product, VibeAudit's code substantially matches its claims — real detection logic, real RLS/HMAC/rate-limiting/Stripe wiring, and honest disclosure of its own gaps. The only real issue is a false testimonial on the landing page overselling the (honestly disclosed as unbuilt) auto-PR feature.
