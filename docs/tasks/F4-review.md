# F4 review (reviewer subagent, high-risk lane, 2026-09-19)

## Status: PASS

Reproduced in a scratch repo with real script copies and stubbed npx.

- Scope: staged set is exactly the 12 allowed paths. lib.sh is 142 added / 0 removed lines; pre-existing helpers untouched.
- Gate parity 15/15 byte-identical old vs new (no/malformed/red stamp, wrong head, wrong fp, staged .ts, -a, -am, --all, pathspec, doc-only, doc-only+-a, staged .env.local, unstaged non-doc, broken git). All 13 reason strings match HEAD. commit-gate.sh holds no decision logic; same JSON shape; exits 0 on deny.
- ship.sh cannot commit unverified: refused for -a, -m x -a, --amend, --no-verify, -am, --author, bare arg, missing -m/-F (rc=2 before staging); red verify (rc=1); missing -F file; broken git; .env.local via add -A and via `-- .env.local`; AKIA-shaped staged diff; empty index. A message full of shell metacharacters committed verbatim, no injection.
- `--if-stale` on red: stamp_fresh requires green, never returns 0 on red. No path in verify.sh writes green without rc==0; every failure routes through red(), which deletes the stamp.
- Fail-closed: stamp_fresh under broken git → rc=1, empty stdout. factory_changed: clean=1, untracked under scripts/factory=0, staged deletion there=0, broken git=0 (treated as "changed", the safe direction).
- Runs: verify.sh --full → VERIFY GREEN, 31.8s, selftest 41/41, vitest 13/13. verify.sh --if-stale → VERIFY SKIPPED (stamp fresh), 0.19s. Selftest skip line confirmed; touching scripts/factory makes selftest run; preflight calls --full. Tree, stamp md5 and .factory file set identical after selftest. All 18 new cases in mktemp trees with exact strings.

## Findings (none blocking)

1. Medium — lane overlap on marketing copy (CLAUDE.md Lanes). micro claims "marketing copy in components/marketing/" while high-risk claims "any change to marketing claims". Not mechanical in the one area the repo already shipped a fabricated testimonial. Fix: micro = non-claim copy only (typos, punctuation, spacing); any product claim, metric, or testimonial is high-risk.
2. Low — `ship.sh -- <paths>` can commit a tree that was never verified as committed (ship.sh staging block). Untracked p1.ts + p2.ts, `ship.sh -m partial -- p1.ts` → commit lands with p2.ts untracked; verify was green with p2.ts on disk and `git diff --quiet` ignores untracked. Fix: after staging, refuse when `git status --porcelain` still lists non-.md entries.
3. Low — stale doc row (coding_factory_fit.md file map): reviewer.md still described as "re-runs verify itself"; standard lane now trusts stamp_fresh.
4. Note (pre-existing): lib.sh exempts the whole staged diff from the secret scan when any staged path matches `__tests__`. Future task.

Implementer concerns 1–2 confirmed safe (empty index takes the stamp-checked path and git commit fails anyway). Concern 3 does not block: ship.sh was exercised across 15+ scratch scenarios; the live test is the controller shipping this change set with ship.sh itself.

## Re-review (round 1)

## Status: PASS

All three findings closed; verified by reproduction, no regressions.

1. Lane overlap closed. CLAUDE.md micro now reads "non-claim copy in components/marketing/ only (typos, punctuation, spacing, Tailwind classes)" plus "Any product claim, metric, testimonial, pricing text, or feature-availability wording is high-risk, never micro"; the high-risk bullet carries the matching list. Mirrored in docs/coding_factory_fit.md.
2. ship.sh guard reproduced. Scratch repo: `-m x -- p1.ts` with untracked p2.ts → rc 3, exact `ship: unverified non-doc changes remain in the worktree (stage them or stash them): p2.ts`, HEAD unchanged, npx stub 0 invocations and no stamp written. Staged-then-modified tracked app.ts → same refusal. Only notes.md left untracked → ships normally. `add -A` control still ships. Both new selftest cases assert the exact message.
3. coding_factory_fit.md reviewer.md row now accurate.
4. selftest 43 passed, 0 failed; tree and stamp md5 byte-identical before and after.
5. verify.sh --full → VERIFY GREEN (40.7s, selftest 43/43, vitest 13/13).

No remaining findings.
