# Defect classes

The eleven classes that survive a green test suite. Load at the start of `audit` mode and hunt each
one specifically — a general read of the diff finds none of them.

---

## 1. Satisfied in a test but unreachable in production

The logic exists and its test passes, but nothing reaches it: a use case never wired into a handler,
a route never registered, a dependency never injected, a validator never attached, a capability never
reachable from the interface.

*How to find it:* from the entry point inward, not from the implementation outward.

## 2. A contract that cannot be consumed

A required input no surface issues. A token no client can compute. A field the caller has no way to
obtain. An identifier only the server knows.

This class makes the feature **dead on arrival while every test passes**, because the test supplies
the input the real caller cannot get.

*How to find it:* for every required input, name where a real caller obtains it.

## 3. Destructive default on an omitted field

What does the write path do when an optional-looking field is absent? If "absent" means "clear it",
a partial update silently destroys data.

No test written by the author catches this, because the author's test sends the field.

*How to find it:* read the write path with the field missing, not with it present.

## 4. Serialization shape mismatches

Nil versus empty collection. Absent versus null. A field present only sometimes. A number serialised
as a string.

These crash **consumers**, not producers, so they pass every test on this side of the boundary.

*How to find it:* read the actual serialization tags and the zero values, not the struct definition.

## 5. A signal that means two things

A field populated on both the success and the failure path. A status that does not discriminate what
the caller must act on. An empty result that means both "nothing matched" and "the lookup failed".

*How to find it:* for each signal a caller branches on, find two different causes that produce it.

## 6. A cross-cutting predicate bypassed

Where the spec says every surface keys off one shared condition, grep for direct reads of the
underlying flag. **One bypass makes the guarantee false**, and the bypass is usually older than the
feature.

## 7. Silent error swallowing on a path that must surface

Especially where the fallback is indistinguishable from a legitimate empty result — that turns a
failure into a confident wrong answer, which is worse than an error.

*How to find it:* every caught error that returns a zero value instead of propagating.

## 8. Transaction and side-effect boundaries

A write escaping the transaction via a non-transactional handle. An event emitted inside a
transaction that can roll back, so consumers see something that never happened. More than one event
where the contract says exactly one. A side effect that fires on a path that later fails.

## 9. Concurrency claims that are not concurrent

A read-then-write where the contract needs one atomic step. A "leader only" guard that is not one. A
lock scoped to a process in a multi-process deployment. An idempotency check that races its own
insert.

## 10. Convention violations the project calls non-negotiable

Read the repository's own declarations — its context file, its `ef-harness` block, its guides — and
check them **literally**: identifier exposure rules, generated-code rules, catalogue-only constants,
files that must be generated rather than hand-written.

This is the class a repository's own inspector would catch. Where gate results were handed to you,
spend little here and more on 1–9 and 11.

## 11. A test that asserts implementation shape, or that cannot fail

For each guard the work claims, ask: **would this fail if the behaviour broke?** If not, the guard is
decorative.

Worse: a test can **pin a defect** — asserting the wrong behaviour, so the correct implementation
would be rejected by the suite. Those are worth a blocker.

*Also in this class:* a test whose expected value is built three files away from the assertion. An
assertion whose expected value cannot be read where it is asserted is weak on its face, however green
it runs. Say so and move on — walking fixtures is the per-check cost that makes a review outlast the
build it reviews, and it buys almost nothing.

---

## Reading the evidence

Cite the one or two assertions that **settle** a claim, not every assertion in a test. Setup lines
earn a citation only when the claim itself names the precondition.

**Evidence or zero.** A requirement with no located `path:line` counts as not proven — per
requirement, never one citation standing in for twenty. Search before concluding something is absent,
and show the search.

Two mechanical checks worth running on every claim:

- a claim about nine cases proven on two is a **coverage gap**
- a claim naming a status code, route or response shape whose proofs all sit below that boundary is a
  **level gap**, no matter how many assertions it carries
