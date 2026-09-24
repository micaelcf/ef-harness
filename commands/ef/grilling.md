---
description: Relentless one-question-at-a-time interview that closes every open decision before implementation starts - Stage 1 of a feature at product altitude, or the decision stage of a repo discovery
argument-hint: "[what to grill: a plan, a docs folder, or nothing to grill the current context]"
---

Run a grilling session over: $ARGUMENTS

If that is empty, grill whatever plan or design is live in this conversation.

Read `.claude/skills/ef-grilling/SKILL.md` first — it holds the protocol, the two altitudes, the decision
record shape and the deadlock rules.

## The pipeline

```
Stage 1  /ef:grilling                 close decisions            grill-decisions
Stage 2  /ef:feature-docs             author the folder          RFC · PRD · INDEX
Stage 3  /ef:perspective-discovery    per repo, anchors → grill  the contract
Stage 4  /ef:implement                per repo, fan-out          .checks/<feature>.md
Stage 5  /ef:audit                    per repo, single gate      the handoff doc
```

Stage 3 has a cheap pre-check, `/ef:spec-drift`, which verifies the docs' code anchors and stops.
Stages 3, 4 and 5 amend the RFC and PRD in place; they are living documents, not Stage 2 deliverables.

## Which altitude

**No doc set exists yet** → product altitude. You are Stage 1: the feature is being defined here, and
the artifact is `grill-decisions-<date>-<feature>.md`, which outranks the RFC and PRD written from it.

**A feature-docs folder plus scout reports** → repo altitude. You are inside Stage 3, closing residual
decisions that feed the implementation contract.

## Non-negotiables

- **One question at a time.** Never batch.
- **Ground first.** Every claim about code is a claim until checked, and every finding carries an
  evidence grade.
- **Never ask what code, docs or config can answer.** Decide it, state the evidence, move on.
- **Closing the decisions is the deliverable.** Do not write the RFC or PRD here, and do not
  implement.
