---
name: ef-implement
description: "Stage 4 - turn closed decisions and a written contract into checks with named proofs, then orchestrate the build in parallel slices and hand a whole feature to the audit. Use when discovery closed, the contract is written, or the user says implement this feature, build this ticket, extract a checklist, ef-implement. Do NOT use when nobody has decided what to build, or to design the work."
---

# EF Implement — Stage 4 of 5

Stage 4 of 5 · per target repo · after `/ef:perspective-discovery` · next: `/ef:audit`

```
EXTRACT ─────────→ BUILD ─────────→ VERIFY
(checks + proofs)  (your call)      (Stage 5, fresh agent, whole feature)
```

The thinking already happened in Stages 1–3. Your job is to lose nothing from it, prove what you
build, and hand a *whole feature* to Stage 5. **How** you build is yours — no phases, no task list,
no step-by-step.

## Inputs — all three, or stop and run that stage

- the **requirement identifiers** this repo owns, from the PRD, and `grill-decisions` as the
  rationale authority over the RFC and PRD
- the **contract** written at the end of Stage 3, in `.ef/<feature>/checks.md`. If it exists only in a
  conversation, it does not exist: parallel slices cannot read a conversation
- an **anchor table** with no unresolved `FICTION`/`CHANGED` on a load-bearing claim

## Bindings

Every concrete command, identifier rule and convention comes from the repository, never from this
skill. Read the `ef-harness` block in the repo's context file; the contract carries the
feature-specific delta.

Where the block is absent, derive the gates from the task runner and the CI workflows, propose them,
and offer to write the block. **Never invent a command** — a proof that cannot run is worse than no
proof. Prefer a command that already runs in CI.

## Critical rules

1. Every check names its **proof**: the specific test whose exit code settles it. The whole suite is
   not a proof — a suite going green says nothing about *this* claim. No proof, no check.
2. Tests assert what the check says, never what the code happens to do. **Never write a test by
   reading the implementation.**
3. Never weaken an assertion, delete a test, or skip one to make a suite pass. A red proof is a
   stop, not a note. If a check turns out to be wrong or impossible, stop and renegotiate.
4. The checks do not change while you build. Once written they are the bar you build under, not a
   position to argue against; lowering them is renegotiation with the user, visible in the diff.
   `Landing` is the exception, and it is additive.
5. **You never verify your own work.** Stage 5 is dispatched by whoever holds the whole feature,
   after the last wave, over the whole feature range. A build slice finishes, reports, and stops — it
   never spawns an agent at all.
6. **Blast radius:** an approved checklist authorises local edits and local commits. Pushing,
   deploying and production data changes need an explicit go-ahead.

---

## Extract

Read the contract and the requirements completely first, then walk the code they touch, so the checks
land on real paths and reuse what exists.

**Refuse rather than guess.** Three things must be true of every check:

- a **nameable proof** — if you cannot say which test would settle it, it is too vague to write down
- a **concrete value** — a status code, a field, a bound. Never "properly", "gracefully", "fast"
- the **boundary** is stated — you can say what is explicitly out

Missing one is normal and asking is cheap. Proceeding on a guess is not: a vague check becomes a
vague assertion that passes, which is the single failure this stage exists to prevent.

Then walk `references/sweep.md` — the requirements nobody writes down — and say where each one
landed. "Already covered by X" and "not in scope because X" are complete answers. Silence is not, and
neither is a generic one: *"authorization: handled"* is silence with a word in front of it.

Raising a sweep item is always free. Growing scope is the user's call.

### Format

Read `references/checklist-format.md` when you write `.ef/<feature>/checks.md` — after the contract is
read, the refuse gate is passed and the sweep is walked. Do not load it during the first pass.

---

## Build

You decide how. Write the tests from the checks, implement, run each proof, commit in coherent
pieces following the repo's commit convention.

Slices run in **parallel**, one agent per ownership set. `references/orchestration.md` holds the
weighing, the ownership rules and the wave boundary.

Two boundaries, about scope rather than care: capability nobody asked for and unrelated refactors are
not yours to add — surface them and move on. Everything else inside the work at hand is the work: a
guard clause, a clear error message, a test beyond the proofs when you can say what *should* happen
at an edge the checks did not name. Extra tests are welcome and there is no quota.

Doors get discovered while building, and deciding them is yours. Then record: append the row to
`Landing` with its literal shape and the alternative you rejected, **before the code that closes it
is written**. The timing is the mechanism — an alternative is only knowable while you are still
choosing between them. Written at the end it becomes a justification of what you already did.

---

## Verify → Stage 5

When the last wave is green and the gates pass, **you** dispatch `/ef:audit <docs> audit` over
`<feature base>..HEAD` with every check in scope.

Not from inside a slice, and not scoped to the last wave. An auditor briefed by the agent that closed
the final wave inherits that agent's scope even though it inherits none of its tokens — it gets
pointed at the last wave, and a pass over four checks reads exactly like a pass over forty.

---

## Amend the feature docs

Implementation is where the design meets the code, and the code wins. Record what you learned in the
RFC and PRD the next repository will read: a shipped shape that differs from the design, a promised
mechanism that does not exist, a pre-existing defect surfaced in the blast radius, an assumption whose
invalidation trigger fired.

See the `ef-feature-docs` skill's `references/amendments.md`. Nothing enforces this; it is also the highest
value thing this stage produces for anyone but you.

---

## Knowledge chain

In strict order: existing code and conventions, project docs, library documentation, web search, then
flag as uncertain. Never invent an API, a flag or a behaviour. *"I could not find documentation for
this"* always beats a plausible fabrication.

---

## Common failures

- **A proof that names a suite.** The suite going green says nothing about this claim.
- **The author verified their own work** — a slice spawned a checker, or the lead re-read its own diff
  and called it verification.
- **A test written from the implementation** — the assertion mirrors what the code does, so it cannot
  fail when the behaviour is wrong.
- **A slice split mid-outcome** — the next agent inherits half an outcome that is green and
  incomplete.
- **A `Landing` row written at the end** — then it is a justification, not a decision.
- **A generic sweep answer** — a category answered without binding it to this repo.
- **A gate command invented because none was found** — a proof that cannot run.
