# VibeAudit

**Built your app with AI? Scan it before it gets hacked.**

Security scanner for AI-built apps (Cursor / Lovable / Bolt / Claude Code). Connect a GitHub repo → get a Security Score (0–100) + a plain-English report of every critical issue → click "Fix it for me" to auto-open a GitHub PR. Continuous monitoring re-scans on every push.

## Who it's for
Non-technical vibe-coders — indie hackers, solo founders, freelancers shipping AI-generated apps who can't read `CWE-798` but know their app might be hackable.

## The 6 core checks
Exposed API keys · Supabase/Firebase RLS off · Missing auth checks · Payment bypass · SQL/prompt injection · No rate limiting

## Stack
Next.js 14 · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres + RLS + Auth) · Stripe · Claude API (plain-English + fix) · Semgrep (scan engine) · GitHub App · Resend · Vercel + scan worker (Railway/Fly)

## Pricing
Free ($0, 1 scan/mo) · Pro ($29/mo, unlimited + fix PR + monitoring) · Agency ($99/mo, 15 repos + white-label + badge)

## Documentation

This repo carries a full post-acquisition audit trail alongside the app code:

| Doc | What it is |
|---|---|
| [docs/FINDINGS.md](docs/FINDINGS.md) | Due-diligence audit — claim-by-claim verdict against the original sale listing |
| [docs/Roadmap.md](docs/Roadmap.md) | Gaps disclosed post-sale: what's claimed vs. actually built, with exact code references |
| [original_description.md](original_description.md) | The original Flippa listing text being audited against |
| [docs/plan.md](docs/plan.md) | Phased fix & completion plan (Phase 0 blockers → Phase 3 expansion), with status tracking |
| [docs/checklist.md](docs/checklist.md) | Launch readiness checklist |
| [docs/competitor_research.md](docs/competitor_research.md) | Competitive landscape — who else scans AI-generated code, feature/pricing comparison, good-standing checks |
| [docs/implementation_plan.md](docs/implementation_plan.md) | Technical plan for closing feature gaps, including a redesigned, standards-based rule engine |

New to the project, read in this order: FINDINGS → Roadmap → plan → checklist for what's actually true and what's left, then competitor_research → implementation_plan for what to build next and why.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Apply the SQL in `supabase/migrations/` to a Supabase project, in filename order, before using any authenticated flow.

```bash
npm run dev     # development server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## Environment

Copy `.env.example` to `.env.local` and fill it in. Store real values only in `.env.local`, in Vercel's environment settings, or in a secret manager — never in the repository.

| Group | Variables | Required |
|---|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| Application | `NEXT_PUBLIC_APP_URL` | Yes |
| AI report and fix generation | `ANTHROPIC_API_KEY` | Yes |
| GitHub App (repo access, fix PRs) | `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_WEBHOOK_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | For repo scanning and PRs |
| Billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_AGENCY_MONTHLY_PRICE_ID` | For checkout |
| Email | `RESEND_API_KEY` | For transactional email |
| Scan worker | `SCAN_WORKER_URL` | For queued scans |
| Analytics and monitoring | `NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN` | Optional |
| Demo mode | `NEXT_PUBLIC_DEMO_MODE` | Optional |

`SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security. It is server-only — never expose it to the browser, and rotate it if it is ever disclosed.

## Demo data

```bash
npm run seed:demo
```

Applies the fixtures in `supabase/demo_seeds.sql` to a demo workspace. Point it at a throwaway project, never at production data.

## Deployment

Deploys to Vercel as a standard Next.js 14 application. Add every required environment variable to the Production environment, set `NEXT_PUBLIC_APP_URL` to the real HTTPS origin, and point the GitHub App webhook and the Stripe webhook at that same origin.

`vercel.json` declares an explicit empty `rewrites` array on purpose: it overrides any dashboard-level rewrite so `/api/*` resolves to the Next.js route handlers rather than being proxied elsewhere.

The scan worker in `worker/` runs separately (Railway or Fly) and is reached through `SCAN_WORKER_URL`.

## License

Private commercial codebase. No open-source license is granted. Ownership, domains, third-party accounts and any commercial license transfer only through an executed agreement.
