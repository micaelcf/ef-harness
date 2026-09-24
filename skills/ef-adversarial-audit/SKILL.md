---
name: ef-adversarial-audit
description: "Stage 5 - adversarially audit delivered work against its requirements assuming a green test suite proves nothing, then verify that claimed fixes are real, then emit the code-verified contract document other repositories build against. Use after implementing a feature in a repo, after remediating audit findings, or when handing a feature to another repo."
---

# Adversarial audit — Stage 5 of 5

Stage 5 of 5 · per target repo, after that repo's implementation · the single audit gate

Find what is missing, wrong, or only apparently done in work that is claimed complete. Then confirm
the fixes are real. Then produce the contract other repositories build against.

Three modes: **audit**, **verify**, **contract**. They run in that order.

## The premise

A clean build and a fully green test suite are **not evidence of correctness**. They are the
situation in which a defect hides best. Requirements can be satisfied in a unit test while being
unreachable in production; an endpoint can be unusable because it demands a token nothing issues; a
write path can destroy data on a payload shape nobody tested.

So the stance is: **assume something is wrong, and assume the summary you were given is optimistic.**
Read the code, not the report about the code.

## How this is dispatched

Run as a **separate `reviewer` subagent**, never inline in the session that produced the work. Self
review does not find your own blind spots.

**Dispatched by whoever holds the whole feature, never by a builder.** A fresh context is not
independence on its own: the parent writes the brief, so an auditor spawned by the agent that closed
the last wave inherits that agent's *scope* even though it inherits none of its tokens. It gets
pointed at the last wave, and a pass over four requirements reads exactly like a pass over forty.

The range is `<feature base>..HEAD` and the set is **every** requirement identifier, whoever
implemented it.

The verdict returns to the orchestrator and the user, **never to a builder**. A FAIL returned to the
author is the author deciding what to do about the author's work, and the round that follows happens
inside the session the separation existed to break.

## Inputs are fixed before the audit starts

- **Requirement identifiers** come from the PRD.
- **Rationale** comes from `grill-decisions`, which outranks the RFC and PRD wherever they disagree.
- **Gate results** come pre-verified from the orchestrator, which runs the commands named by the
  repository's `ef-harness` block and hands over the output. Do not re-run them: that spends the
  budget on what a gate already proved and starves the classes no gate can see.

Audit against those, never against the implementer's summary.

---

## Mode: audit

### Method

Walk the **requirement identifiers** one at a time — not the file list, not the diff. For each, find
the code that satisfies it and decide whether it actually does. A requirement with no traceable
implementation is a finding.

Then hunt the defect classes in `references/defect-classes.md`, each of which survives a green suite.
Load that file at the start of this mode.

### Evidence rules

- Every finding carries `path:line` for the **reality** side.
- State what is actually there, which requirement it violates, and the concrete fix. A finding
  without a fix is an observation.
- Distinguish **genuinely broken** from **deliberate documented deviation**. Decisions already taken
  are not re-litigated — but flag any place the code does not match the decision as written.
- Rank: `blocker` (would make a caller send a request that is rejected, render wrong data, or lose
  data) · `major` (real, with a workaround) · `minor` · `nit`.
- Report what you **verified as correct** too, with anchors. It tells the reader which ground is
  covered and makes the findings credible.
- Where the work carries a checklist, **recompute its `Coverage` join rather than reading it** — a
  join you only read is the author's self-report with a table around it. Take the members from
  whatever holds authority over that set, which is not always the code: a set the code is meant to
  *satisfy* has its authority outside it, and recomputing from the code asks the author's output
  whether the author's output is complete.
- Read the checklist's `Swept` rows that resolve to **already covered** against the code. A cited
  constraint that is not there is a finding. Rows that say *not in scope* are policy the user
  approved.

### Report only

Fix nothing in this mode. The owner triages.

---

## Mode: verify

Run after remediation. **Assume at least one fix is incomplete or fake, and that one introduced a new
problem.** Both happen.

For each claimed fix: read the code and return `fixed` · `partially_fixed` · `not_fixed` ·
`regressed`, with `path:line`.

Additionally:

- **Check the guard, not just the change.** Where a test is claimed as the regression guard, confirm
  it would actually fail if the behaviour reverted.
- **Watch for the fix that pins the old behaviour** — a test asserting the defect will reject the
  correct implementation.
- **Confirm each named test exists and ran.** A filter matching nothing exits zero on several
  runners, which is a green check with no test behind it. Show the hit.
- **Sweep for new problems the remediation introduced**: a widened transaction, a new write outside
  the boundary, an extra side effect, a cheap read turned into an unbounded fan-out, a dead symbol
  left behind, an exhaustive switch not extended.
- **Check for an unassigned finding.** Compare the finding list to the remediation list. A finding
  nobody was asked to fix is the most likely miss.

Loop `audit → remediate → verify` until verify comes back clean, bounded to **three** rounds before
escalating to the user. Terminate on the **external check**, never on the implementer's assessment.

A later round is scoped by the fix's diff and every verdict that was not PASS; everything else carries
forward **marked as carried**, with the commit it was verified at. Silent inheritance is the
self-report problem wearing a table again.

---

## Mode: contract

Run **only once verify is clean.** Emit or refresh the handoff document — the artifact another
repository builds against.

Load `references/contract-doc.md` for the required content and the fact-check pass.

Do not write a contract over open findings: you would be publishing a defect as the interface, and
downstream repositories would implement against it.

---

## Amend the feature docs

Record what shipped, what did not, and every accepted gap as an amendment to the RFC and PRD, and
update the RFC header's per-repo status. That header is the only cross-repo delivery status in the
harness.

See `skills/ef-feature-docs/references/amendments.md`.

---

## Common failures

- **Auditing the diff instead of the requirements.** The diff cannot show you a requirement nobody
  implemented.
- **Re-running the gates.** They were handed to you green; the budget belongs to what they cannot see.
- **Reading the Coverage join instead of recomputing it.**
- **Returning the verdict to the author**, who then decides what to do about their own work.
- **A finding without a fix**, which is an observation the owner cannot act on.
- **Writing the contract document with findings still open.**
