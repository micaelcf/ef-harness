# Orchestration

How Stage 4 runs the build across parallel agents. Load this at Build, not at Extract.

The contract exists to make concurrency safe. Everything here assumes it is written and in
`.checks/<feature>.md`.

---

## The contract

Scope the whole task before spawning anything. Delegate substantial **independent** work in parallel.
Verify at each phase boundary. Continue until the request is complete — a phase boundary is not a
stopping point.

---

## Slice by ownership, not by count

One agent per set of files no other agent writes. Requirement count is irrelevant: two agents editing
one file is not parallelism, it is a merge conflict with a schedule.

Where a file is irreducibly shared — a route table, a container registration, a schema index — name a
**single integration owner** and serialise only that boundary. Everything else stays parallel.

Write the ownership table into the checklist before spawning. An unowned file is the one that breaks.

---

## Weigh slices, do not count them

Slice size varies by a factor of three or more inside one feature: the slice holding all the doors is
rarely the one with three trivial checks. So pack by the weight on each slice heading — `wc -c` of the
files it touches, divided by four — and keep one agent's reading under roughly **150k tokens**.

That number is a default, not a law. A smaller context window means a smaller budget; say which you
used.

A slice that alone exceeds the budget was cut too coarsely in Stage 3. **Say so rather than splitting
it here.** Cutting mid-outcome hands the next agent half an outcome that is green and incomplete,
which is the horizontal cut the whole pipeline exists to avoid. The contract is the place to re-cut
vertically.

Where two packings both fit, prefer the boundary where the **surface changes** — where the next slice
reads different code. There the next agent had to read it anyway, and nothing is paid twice.

---

## What every batch carries

In shared context, once, for the whole batch:

- **the contract, verbatim** — not a pointer to a conversation the slices cannot see
- **the bindings** — gate commands, identifier rule, generated-code rule, test conventions, and the
  newest file to copy for this kind of unit
- **the requirement identifiers and checks** each slice owns
- **the ownership table**, so every agent knows what it must not touch

Per slice: exact files and symbols, explicit non-goals, and the observable outcome it must reach.

---

## Every task states: skip validation

Slices do **not** run formatters, linters or the project test suite. Mid-flight validation blocks
agents on each other's half-finished edits and produces failures that are artefacts of timing rather
than of code.

Slices run their own **proofs** — the specific tests their checks name. That is the exception, and it
is the point: a proof is narrow enough not to depend on a peer's work in progress.

---

## The wave boundary

When a wave lands:

1. **Re-read any file a peer changed.** Reports and file contents go stale inside a session, and the
   version in your head is the one that was true an hour ago.
2. **Run the gates once, yourself** — the commands the `ef-harness` block names, in order.
3. **Commit in coherent pieces**, following the repo's commit convention.

Only then does the next wave start, or Stage 5 begin.

---

## A build agent never spawns an agent

Not a helper, not a checker, not a verifier. A build slice finishes, reports, and stops.

This is what keeps "done" from being a self-report: verification is dispatched by whoever holds the
whole feature, over the whole feature range, after the last wave. An auditor spawned by a builder
inherits that builder's scope even with a clean context — it gets pointed at one slice, and a pass
over four checks reads exactly like a pass over forty.

If you find yourself writing *"when you finish, dispatch the verifier"* into a slice's brief, that is
the mistake with a friendly face.

---

## When one agent runs out of context anyway

Compaction summarises the **conversation** and chooses for you what to drop. A handoff carries the
**artifact**, at a boundary you chose.

So when a slice must hand over: only on green, with the next agent reading the checklist and the
**diff of what has landed** — never a narrative summary of it. The diff is the state, and it carries
the hundred reversible choices that sit below the `Landing` bar: naming, error shape, where the helper
went. Those are exactly what drifts between agents and exactly what no document records.

Then append to the checklist — not to the next agent's prompt, because a briefing written into a
prompt survives exactly one boundary:

- **where the boundary fell** — the checks now closed and the commit that closed them
- **what the user settled mid-build** — every clarification that did not become a `Landing` row or an
  edited check. This class hurts most: it exists only in a conversation the next agent cannot read
- **what was abandoned** — tried, discarded, and why. The one thing neither the code nor the
  checklist preserves

**When compaction happens anyway**, re-read the checklist and the diff before continuing. You cannot
see the limit approaching, but you can see that a compaction occurred — build the recovery on the
signal that exists.
