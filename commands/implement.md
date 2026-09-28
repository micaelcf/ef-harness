---
description: Stage 4 - extract checks with named proofs from the contract, then orchestrate the build in parallel slices
argument-hint: "<path-to-feature-docs>"
---

Feature docs: $1

Stage 4 of 5 · per target repo · after `/ef:perspective-discovery` closed decisions · next: `/ef:audit`

Load the `ef-implement` skill and read it first — it holds the method.

## Do not start until all three hold

1. Discovery ran in **this** repo and no `FICTION` or `CHANGED` verdict is left unresolved on a
   load-bearing claim.
2. The decisions are closed and the human said so.
3. **You** wrote the contract — interfaces, data shapes, transaction and error boundaries, naming.
   Never delegated: anything left for slices to negotiate between themselves diverges, because they
   cannot see each other.

Any one missing: stop and run that stage instead.

## Shape of the stage

```
EXTRACT ─────────→ BUILD ─────────→ VERIFY
(checks + proofs)  (your call)      (Stage 5, fresh agent, whole feature)
```

The thinking already happened in Stages 1–3. Lose nothing from it, prove what you build, and hand a
*whole feature* to Stage 5.

## Concrete commands come from the repo

Read the `ef-harness` block in the repository's context file for the gate commands, identifier rule
and test conventions; the contract carries the feature-specific delta. Where the block is absent,
derive the gates from the task runner and the CI workflows and **propose** them. Never invent a
command.

## Amend the feature docs

Implementation discovers that the design was wrong about the code. That discovery belongs in the
RFC and PRD the next repo will read, not in a commit message. See the `ef-feature-docs` skill's
`references/amendments.md`.

omp users may additionally start the turn with the `orchestrate` keyword. The skill states the same
contract explicitly, so this command is self-sufficient in Claude Code.
