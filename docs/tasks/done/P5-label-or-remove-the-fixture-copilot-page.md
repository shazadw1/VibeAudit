---
id: P5
title: Label or remove the fixture Copilot page's fabricated claims
lane: high-risk
status: done
approval: approved
plan_item: 5
plan_status_owner: runner
source: docs/plan.md#5
created_at: 2026-09-20T01:25:14Z
runner_eligible: false
runner_started_at: 2026-09-20T01:53:18Z
---

## Problem
`components/dashboard/copilot-client.tsx` (502 lines) is the whole "AI Copilot" feature.
It is rendered at `/copilot` by `app/(dashboard)/copilot/page.tsx` and linked from the
sidebar (`components/dashboard/sidebar.tsx:80-84`, badge "AI") and mobile header
(`components/dashboard/header.tsx:41`). It has no backend: `handleSendPrompt`
(`components/dashboard/copilot-client.tsx:149-190`) appends a canned reply after a 1.2 s
`setTimeout`, and `handleActionClick` (lines 192-200) either redirects to `/fixes` or fires
`alert()`s such as "Autonomous scan initiated across connected repositories!".

The canned content makes product and security claims that are false today:
- "already been remediated via **Autonomous PR #117**" (line 71) and the "Explain PR #117"
  preset (lines 59, 78, 115-120), while `app/api/fix/generate/route.ts` still returns
  `simulated: true` (`docs/checklist.md` lines 14 and 236).
- "deep AST analysis ... in volatile AWS Nitro memory" (line 71), "AST graph in volatile
  RAM" (line 347), and the footer "Zero-Retention Assurance" card stating prompts "are
  processed inside volatile AWS Nitro Enclaves" (lines 405-413). The scanner is regex-based
  (`docs/checklist.md` line 218) and no enclave exists.
- An executive briefing declaring the platform "**SOC2 Type II & ISO 27001 Ready**", "27
  critical and moderate vulnerabilities autonomously patched", a "Merkle tree ledger", and
  "SAML 2.0 SSO and Okta SCIM" (line 107), plus "4 connected repositories" with named repos
  (line 55).
- The page metadata title "Neural AI Security Assistant & Threat Hunter"
  (`app/(dashboard)/copilot/page.tsx:5-6`).

This is the same honesty problem as `docs/plan.md` item 1 (fixed in `dba10a0`), but here
the fabricated claims are the entire page rather than one quote. `docs/checklist.md` records
it twice: line 278 ("Label demo or remove the fabricated content; build a real authenticated
chat ... before marketing it") and line 301 ("Remove the fabricated PR/AWS-Nitro claims
baked into the fixture Copilot page"). `Roadmap.md` "Phase 2" item 4 and its "Also Flagged"
section list Copilot/security Q&A among claims needing verification before marketing.
Plan item 13 (verify claimed-but-unconfirmed features) overlaps but is Low priority; this
item is Critical because the false claims are live behind login today.

## Codegraph Context
index: 2026-09-20T01:10:58Z (1789866658712), files: 91, stale: yes

### `components/dashboard/copilot-client.tsx`

**Search results:**

- file `copilot-client.tsx` — `components/dashboard/copilot-client.tsx:1-503`
- import `react` — `components/dashboard/copilot-client.tsx:3-3`
- import `framer-motion` — `components/dashboard/copilot-client.tsx:4-4`
- import `lucide-react` — `components/dashboard/copilot-client.tsx:5-30`
- interface `ChatMessage` — `components/dashboard/copilot-client.tsx:32-47`
- constant `INITIAL_MESSAGES` — `components/dashboard/copilot-client.tsx:49-62`
- constant `PRESET_PROMPTS` — `components/dashboard/copilot-client.tsx:64-131`
- function `CopilotClient` — `components/dashboard/copilot-client.tsx:133-502` (exported)

**Related (edges) and unresolved references:**

- edge calls (in) `CopilotPage` in `app/(dashboard)/copilot/page.tsx` (line 9)
- edge imports (in) `page.tsx` in `app/(dashboard)/copilot/page.tsx` (line 2)

### Files in scope

- `components/dashboard/copilot-client.tsx`
  - exported function `CopilotClient` (`components/dashboard/copilot-client.tsx:133-502`) — signature: `()`

### Routes

- (none found among the files above)

### Likely tests

- (none found among the files above -- add prose here if the assistant knows of a relevant test path)

### Additional context (assistant-added; the index is stale and the route was not in the query term's edge set)

- `app/(dashboard)/copilot/page.tsx` (11 lines) — the only importer of `CopilotClient`;
  also carries the page `metadata` title/description with its own claims (lines 4-7).
- Nav entries: `components/dashboard/sidebar.tsx:80-84` (name "AI Copilot", badge "AI") and
  `components/dashboard/header.tsx:41`. Neither states a claim beyond the name.
- Canned data lives in module-level constants: `INITIAL_MESSAGES`
  (`components/dashboard/copilot-client.tsx:49-63`) and the preset prompt array starting at
  line 65 (three presets: audit report, executive briefing, PR #117 explanation), plus the
  default reply inline in `handleSendPrompt` at lines 164-170.
- Precedent: `dba10a0` removed one fabricated testimonial from
  `components/marketing/landing-client.tsx` (item 1). There is no existing "demo" label
  component in `components/dashboard/`; the only demo affordance is the "Load Demo $100K
  SaaS Repo" button in `components/dashboard/empty-state.tsx:103`, which seeds real rows.
- Tests: `vitest.config.ts` includes only `**/__tests__/**/*.test.ts`; there are no
  component tests in the repo, and `@testing-library/react` is not a dependency (check
  `package.json` before planning a render test).

## In Scope
Decided shape: label **and** strip (Approval Notes decision 1).
- A persistent, unmistakable "Demo preview: sample conversation, not connected to your
  repositories" banner at the top of `CopilotClient`, plus a `Demo` badge in the page
  header, per `docs/checklist.md` line 273 ("Fixture-only dashboards must be labelled demo
  until backed by real data").
- Rewrite every canned string that asserts a product fact into obviously-sample content:
  no "Autonomous PR #117" (checklist line 236), no "AWS Nitro"/"Nitro Enclaves"/"volatile
  RAM" (checklist line 301), no "SOC2 Type II & ISO 27001 Ready", "Merkle tree", "SAML/
  SCIM", "27 vulnerabilities autonomously patched", "99.8% CI/CD pass rate", or named
  "connected repositories". Sample text may describe what a finding *could* look like,
  framed as an example.
- Remove the "Zero-Retention Assurance" footer card
  (`components/dashboard/copilot-client.tsx:405-413`) entirely; it is a data-handling
  promise, not chat content, and cannot be made true by a label.
- Replace the fake `alert()` side effects in `handleActionClick` (lines 192-200) with
  no-ops or a "demo action" toast so nothing claims a scan was "initiated".
- Retitle `app/(dashboard)/copilot/page.tsx` metadata to drop "Neural" and "Threat Hunter"
  and describe the page as a preview.
- Tick `docs/checklist.md` lines 278 and 301 at close-out (controller, per `CLAUDE.md`
  §2.6).

## Out of Scope
- Building a real Copilot backend (checklist line 278's second half, and the AI cost
  tracking in checklist lines 77 and 116). Plan item 13 owns verifying the feature.
- Removing the `/copilot` route or its nav entries (`sidebar.tsx`, `header.tsx`); decided
  against in Approval Notes decision 1.
- The sidebar badge "AI" on the Copilot entry and "Auto" on Fix Engine; the latter belongs
  to the autonomous-PR claim items (checklist line 14), not this one.
- Other fixture pages with similar problems (`/compliance`, `/fleet`, `/analytics`, Red
  Team Arena; checklist lines 273-277) and remaining fictional testimonials (plan items
  13/14). Same pattern, separate items.
- Any change to `app/api/fix/` or the `simulated: true` behaviour.

## Implementation Tasks
- [ ] `components/dashboard/copilot-client.tsx`: add a `DemoBanner` block rendered above the
      chat and integrations tabs with the exact text "Demo preview: sample conversation,
      not connected to your repositories." (decision 3), and a `Demo` badge next to the
      page title; both visible on every tab and not dismissible.
- [ ] `components/dashboard/copilot-client.tsx:49-63` (`INITIAL_MESSAGES`): rewrite the
      greeting to say it is a sample conversation; drop the named repositories, "4
      connected repositories", "real-time AST context", and "zero-retention RAM".
- [ ] `components/dashboard/copilot-client.tsx:65-130` (presets): rewrite the three preset
      replies as clearly-labelled examples. Remove "Autonomous PR #117", "AWS Nitro",
      "SOC2 Type II & ISO 27001 Ready", "Merkle tree", "SAML 2.0"/"Okta SCIM", the "27
      vulnerabilities ... 99.8%" figures, and "Download Compliance PDF". Rename the PR
      preset to an "Example: explain a SQL injection fix" that references no PR number.
- [ ] `components/dashboard/copilot-client.tsx:164-170` (default reply): remove "A+ Security
      Posture (Score: 98/100)", "zero-day", and "volatile memory"; say it is a demo reply.
- [ ] `components/dashboard/copilot-client.tsx:192-200` (`handleActionClick`): replace the
      two `alert()` strings with a single "This is a demo preview; no action was taken."
      message; keep the `/fixes` redirect.
- [ ] `components/dashboard/copilot-client.tsx:218` and `:347`: drop "volatile RAM context"
      and "Neural Engine analyzing AST graph in volatile RAM".
- [ ] `components/dashboard/copilot-client.tsx:405-413`: delete the "Zero-Retention
      Assurance" card.
- [ ] `app/(dashboard)/copilot/page.tsx:4-7`: metadata title "VibeAudit Copilot (Preview)",
      description without "threat hunting"/"AST vulnerability analysis".
- [ ] Add `components/dashboard/__tests__/copilot-client-claims.test.ts`: read the two
      source files as text and assert none of a fixed forbidden-phrase list appears
      (`PR #117`, `Nitro`, `volatile`, `SOC2 Type II`, `ISO 27001`, `Merkle`, `SCIM`,
      `Autonomous PR`, `zero-retention`, `Zero-Retention`), and that the string "Demo"
      appears. A text-level test avoids adding a React render dependency.

## Acceptance Criteria
- `/copilot` shows the banner "Demo preview: sample conversation, not connected to your
  repositories." and a `Demo` badge on first paint, on both the chat and integrations
  tabs, with no way to dismiss it. The claims test asserts the banner string is present.
- `grep -n -i "PR #117\|nitro\|volatile\|SOC2 Type II\|ISO 27001\|merkle\|SCIM\|autonomous PR\|zero-retention" components/dashboard/copilot-client.tsx app/\(dashboard\)/copilot/page.tsx`
  returns nothing.
- No canned reply names a real-looking repository, PR number, certification status, or
  numeric security score presented as the user's own data.
- No `alert()` in the component claims a scan, PR, or download happened.
- The "Zero-Retention Assurance" card is gone.
- The new claims test passes and fails if any forbidden phrase is reintroduced.
- `npx tsc --noEmit`, `npx next lint`, `npx vitest run` pass; `lib/scan/__tests__/engine.test.ts` unaffected.
- Only these files change: `components/dashboard/copilot-client.tsx`,
  `app/(dashboard)/copilot/page.tsx`, the new test, and at close-out `docs/plan.md` and
  `docs/checklist.md`.

## Verification
- `npx vitest run components/dashboard` during work (new claims test).
- Manual: `npm run dev`, sign in, open `/copilot`; confirm the banner on both tabs, send a
  free-text prompt and each of the three presets, click every action button, and read
  every reply for a remaining product claim. Screenshot for the reviewer.
- Reviewer (high-risk lane, per `.claude/agents/reviewer.md`): independently grep the
  forbidden-phrase list over the whole `components/` and `app/(dashboard)/` trees, not just
  the two changed files, and report any hits outside scope as follow-up items rather than
  blocking.
- `scripts/factory/verify.sh --full` once before ship.
- No live environment needed; this item can close as `Done`.

## Approval Notes
WARNING: codegraph index is stale (index_older_than_head); re-indexing is a human decision, not this script's
Decisions recorded 2026-09-20 by the user (controller session). Binding for implementer and
reviewer; a deviation is a decision outside the brief and must stop for the user.

1. **Page fate: label and strip.** Keep `/copilot`, its route, and both nav entries. Add a
   persistent demo banner and badge, rewrite the canned replies, delete the Zero-Retention
   footer card, and neutralise the `alert()` side effects. Not removed.
2. **Claim bar: remove the phrases.** A banner is not sufficient. Every reply must be free
   of "SOC2 Type II & ISO 27001 Ready", "AWS Nitro"/"Nitro Enclaves"/"volatile", "Merkle",
   "SAML"/"SCIM", "Autonomous PR"/"PR #117", "zero-retention", and the invented
   remediation figures, so no single reply reads as a product claim even if the banner is
   missed. The guard test enforces the list in Implementation Tasks.
3. **Banner copy.** Exactly: "Demo preview: sample conversation, not connected to your
   repositories." No roadmap hint, because that is itself a feature-availability claim.

The codegraph index was stale when drafted (warning above); all context was confirmed by
direct file reads on 2026-09-20. Re-indexing is optional for this item and remains the
user's call. No remaining open questions.

## Execution Note (2026-09-20)
Implemented in commit `33fa791`. All acceptance criteria met: forbidden-phrase grep clean,
demo banner with exact required text at top of component (non-dismissible), Demo badge on
title, INITIAL_MESSAGES and all three presets rewritten, default reply labelled demo,
alert() replaced with benign demo string (with /fixes redirect kept), Zero-Retention card
deleted, page metadata updated to "VibeAudit Copilot (Preview)". New text-level guard test
at `components/dashboard/__tests__/copilot-client-claims.test.ts` — 21 assertions, all
passing. Spec compliance and code quality reviews both PASS. verify.sh green on HEAD.
