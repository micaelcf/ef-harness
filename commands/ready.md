---
description: Make the repo's agent rulebook verifiable - vendor the checker, then audit, bootstrap, or grow AGENTS.md from audit findings
argument-hint: "[audit|bootstrap|grow] [path-to-audit-report]"
---

Mode: $1 (default `audit` when empty; `bootstrap` when the repo has no rulebook)
Input: $2 (for `grow`: the audit report holding `## Rulebook proposals`)

Once per target repo, before the first feature · re-run whenever audits find rot · next: `/ef:grilling`

Load the `ef-readiness` skill and run it in that mode against the repository you are currently in.
Read the skill first. It holds the levels, the format and the interview.

## Every mode starts the same way

Vendor the skill's `scripts/ef-check.mjs` to `.ef/bin/ef-check.mjs` byte for byte, then run
`node .ef/bin/ef-check.mjs`. Its findings are facts. Report them; don't re-derive them.

## Modes

- `audit`: report only. Gives the checker findings plus a verdict for every rulebook line
  (`keep` · `enforce` · `cut` · `scope` · `skill` · `record` · `false` · `stale-gap`). Edit nothing.
- `bootstrap`: derive what the code answers and run every gate candidate once. Then interview for
  what it can't answer, one question at a time. Write the rulebook and run the checker until it
  passes.
- `grow`: turn each proposal into a check first, an invariant with its `Check:` second, and an
  honest gap last. Run the checker after each change.

Never invent a command, never write a directory overview, and never edit the vendored checker to
reach a pass. Propose a CI step that runs the checker; add it only with the user's go-ahead.
