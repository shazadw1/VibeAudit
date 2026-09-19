---
id: R1
title: Runner smoke test for standard-lane factory execution
lane: standard
status: queued
approval: approved
plan_item: null
plan_status_owner: runner
source: factory
created_at: 2026-09-19T23:05:00Z
runner_eligible: false
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
