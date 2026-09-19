# Task plan — plan.md item 1: fabricated testimonial

## Spec
The landing page testimonials section (`components/marketing/landing-client.tsx`, ~line 1284) shows a quote attributed to "Elena Rostova, Lead Engineer @ DataFlow Systems" saying VibeAudit "opened 4 clean GitHub pull requests". The fix engine returns `simulated: true` / `not_implemented` (`app/api/fix/generate/route.ts`), so this claim is false. Remove it.

Ruling: remove rather than rewrite. A rewritten quote from a fictional person is still fabricated. Cost if wrong: one fewer card on the landing page.

Out of scope (raised for the user): the other two testimonials are also fictional (product has no customers), and the page has other autonomous-PR claims at lines ~104, 450, 628, 868, 966, 1086. Those belong to plan.md items 13/14 and the Roadmap Phase 0 marketing-honesty gate.

## Tasks
- [x] T1: Delete the Elena Rostova testimonial object from the array in the testimonials section. Change the grid from `md:grid-cols-3` to `md:grid-cols-2` so the two remaining cards fill the row. Touch nothing else in the file.
- [x] T2: Run `scripts/factory/verify.sh`; must be green.

## Acceptance
- `grep -c "Elena Rostova\|opened 4 clean" components/marketing/landing-client.tsx` returns 0.
- Only the testimonials array and its grid class changed (diff is under 15 lines).
- verify.sh green.

## Result
Implementer: DONE, 8-line diff, verify green. Reviewer: PASS, two low findings about the ledger (not code). Accepted 2026-09-19.
