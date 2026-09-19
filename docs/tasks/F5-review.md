# F5 review (reviewer subagent, high-risk lane, 2026-09-19)

## Status: FAIL

Full reproduction in a scratch repo (copied docs/plan.md, scripts, SKILL.md; --db at the real read-only index; real docs/tasks/ untouched).

Passed: scope (17 staged paths, all allowed; nothing under app/, components/, lib/, types/, worker/, supabase/); no lane → exit 2 exact message, nothing created; bad lane → 2; item 999 → 3; second run → 4, --force overwrites; --lane micro → WARNING naming lib/github/fetch-repo.ts and app/api/github/connect/route.ts; docs/plan.md sha256 identical after every run. No code path writes `approved`, writes under queued/ beyond .gitkeep, or edits docs/plan.md. open_db uses mode=ro then immutable=1; no write statements; subprocess only for `git log -1 --format=%ct`. stdlib-only. `--db /nonexistent search x` → rc 1, one stderr line, empty stdout; `search fetchRepoFiles --json` → 3 rows incl. lib/github/fetch-repo.ts; `status` prints STALE no; FTS-unsafe input does not crash. selftest 53/53, real .factory and real draft byte-identical across a run. .claude/commands/task-master.md tracked. verify.sh --full → VERIFY GREEN.

### 1. Blocking — item-4 acceptance not reproducible for a Codex user (SKILL.md)
Bare script output contains 0 occurrences of lib/github/app.ts, getInstallationOctokit, GITHUB_TOKEN, GITHUB_PAT. The queries work (`search getInstallationOctokit` → lib/github/app.ts:24; `search GITHUB_TOKEN` → fetchRepoFiles; `related lib/github/fetch-repo.ts` → both scan routes) and `--terms lib/github/app.ts,getInstallationOctokit,GITHUB_TOKEN,GITHUB_PAT,installation_id,repos` puts every name in the draft. But SKILL.md only says the assistant *may* add prose and *may* pass --terms, with no test for "not enough" and no mandatory follow-up queries. Fix: a mandatory step requiring the assistant to derive terms from implementation_plan.md §0.1 and the checklist heading, re-run with --terms, and run `search <term>` / `related <file>` for each, recording misses under Codegraph Context. Mirror in AGENTS.md.

### 2. Medium — selftest hard-depends on the gitignored .codegraph index (selftest.sh)
No existence guard on the real db; on a fresh clone verify.sh --full goes red for an unrelated reason. Fix: skip those cases with one skip line when the db is absent.

### 3. Low — staged worked example is stale
Staged draft is created_at 22:33:39Z; the worktree holds a rewritten 22:52:06Z version. Re-stage and re-verify.

### 4. Low — `--db` undocumented in SKILL.md/AGENTS.md; LIKE wildcards `%`/`_` unescaped in _search_rows. Fine to defer.

## Re-review (round 1)

## Status: PASS

All four findings closed; verified by reproduction in fresh scratch copies, real docs/tasks/ untouched.

1. Blocking closed. Walked the Codex path using only AGENTS.md and skills/task-master/SKILL.md (new mandatory step 4). Step 4(a) is mechanical: the backticked spans of implementation_plan.md §0.1 plus the checklist lines yield getInstallationOctokit, GITHUB_TOKEN, GITHUB_PAT, installation_id, repos, userId, repo_id with no guessing. Passed as --terms in the scratch repo they produce a Codegraph Context naming lib/github/app.ts, getInstallationOctokit, GITHUB_TOKEN, GITHUB_PAT, installation_id, repos, app/svc/scan/route.ts. Stop condition stated. Committed P4 draft has `### Follow-up queries` with the literal rerun command, per-query findings, and a disposition table for all 12 §0.1 spans; frontmatter still draft / pending / runner_eligible false; zero occurrences of "approved"; eight sections in order.
2. Skip guard works. Copy without .codegraph/: 7 `[skip]` lines, `selftest: 47 passed, 0 failed, 7 skipped`, exit 0. With the real index the summary is the byte-identical old form.
3. Exactly one file in docs/tasks/drafts/, staged, no unstaged residue.
4. --db documented in both adapters. _like_escape applied to all three LIKE sites with ESCAPE; `search 'a_b%'` and `related 'a_b%'` rc 0, valid JSON.
5. Real-repo selftest: 55 passed, 0 failed (report said 57; text inaccuracy only). Tree, stamp, log and docs/plan.md byte-identical before and after.
6. verify.sh --full final line: VERIFY GREEN.

Non-blocking nit: .claude/commands/task-master.md argument-hint omits --db; SKILL.md is canonical.
