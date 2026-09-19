# AGENTS.md — harness-neutral notes

`CLAUDE.md` holds the Claude-specific controller rules for this repo's coding factory.
This file is for any other harness (Codex, etc.) working in the same repo: pointers to the
same underlying, harness-neutral behaviour, so no rule has to be duplicated per harness.

## Drafting tasks

Use repo skill skills/task-master/SKILL.md to draft plan item <n> with lane <lane>

Replace `<n>` with the `docs/plan.md` item number and `<lane>` with `micro`, `standard`, or
`high-risk`. That skill is the canonical behaviour for drafting a code-aware task brief from
a plan item; it never implements, approves, or queues anything.

The deterministic half of that skill is a script, not a prompt: run
`scripts/factory/task-master.sh <n> --lane <lane>` directly (add `--force` to overwrite an
existing draft, `--terms a,b,c` to hint additional codegraph query terms, `--db <path>` to
point at a `.codegraph/codegraph.db` other than the default under the repo root), then fill
the LLM sections of the draft it writes by hand, exactly as `skills/task-master/SKILL.md`
describes. Nothing in that flow is Claude-only: the script,
`scripts/factory/codegraph-query.py`, and `skills/task-master/SKILL.md` are all plain files
any harness can read and run.

Before filling the LLM sections, the mandatory follow-up-queries step
(`skills/task-master/SKILL.md` step 4) applies just as much to this path as to Claude's:

1. Extract every backtick-quoted path, identifier, env var, and table name from the
   `docs/implementation_plan.md` section(s) and `docs/checklist.md` lines the plan item
   cites, and re-run `task-master.sh <n> --lane <lane> --force --terms <comma list>` with
   all of them.
2. Run `codegraph-query.py search <term>` for each of those terms and
   `codegraph-query.py related <file>` for each file already named in `## Codegraph
   Context`; record anything those queries find that the script's own output missed under
   a `### Follow-up queries` subsection, one line per finding, naming the query that found
   it.
3. Stop only once `## Codegraph Context` names every backtick-quoted path from the cited
   `docs/implementation_plan.md` section(s), or explicitly lists which ones the index does
   not contain.
