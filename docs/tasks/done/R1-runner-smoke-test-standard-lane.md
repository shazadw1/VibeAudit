---
id: R1
title: Runner smoke test for standard-lane factory execution
lane: standard
status: done
approval: approved
plan_item: null
plan_status_owner: runner
source: factory
created_at: 2026-09-19T23:05:00Z
runner_eligible: false
runner_started_at: 2026-09-20T00:02:13Z
---

## Problem
We need a harmless queued task to prove the external runner can execute the factory loop end to end before using it on high-risk product work.

## In Scope
Add one small regression test to `lib/scan/__tests__/engine.test.ts` proving the scan engine ignores generated or binary-like files.

## Out of Scope
No runtime code changes. No factory changes. No docs/plan.md update. No GitHub, auth, billing, Supabase, or marketing changes.

## Implementation Tasks
- [ ] Add a test under the existing `describe("engine", ...)` block.
- [ ] The test should pass files under `.next/`, `dist/`, or binary/static extensions and assert ignored files do not increase `filesScanned`.
- [ ] If the engine does not currently skip one of those paths, prefer testing an already-supported ignored path rather than changing runtime behavior.

## Acceptance Criteria
- Only `lib/scan/__tests__/engine.test.ts` changes.
- `npx vitest run lib/scan/__tests__/engine.test.ts` passes.
- `scripts/factory/verify.sh --if-stale` or `--full` passes.
- Task frontmatter is updated to `status: done` before the factory exits.

## Verification
Run targeted vitest first, then factory verify.

## Execution Note
Added one test `"ignores generated build output under .next/"` to the existing `describe("engine", ...)` block in `lib/scan/__tests__/engine.test.ts`. The test feeds `.next/` files containing synthetic credential and XSS patterns and asserts `filesScanned` and `findings` are unchanged versus the clean baseline. Confirmed `.next/` was already handled by `isScannable` in `engine.ts`; `dist/` is not ignored so the test was scoped to `.next/` only, matching the brief's "prefer already-supported ignored path" guidance. Vitest: 14/14 pass. verify.sh: green. Shipped as commit `4d78a2f`.
