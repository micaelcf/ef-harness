# Feature-doc anti-patterns

Read before finalising the RFC or the PRD. Each of these produces a document that reads well and
misleads.

---

## A predetermined conclusion disguised as options

**Bad**

> We should adopt the queue. Here are the reasons. Option 2 is to not adopt it.

**Good**

> Option (a) adopt the queue — genuine pros and cons.
> Option (b) extend the existing scheduler — genuine pros and cons.
> Option (c) do nothing — what that costs, concretely.

A one-sided RFC undermines trust and produces bad decisions. If only one option was ever live, say
the choice was **forced** and name the constraint that forced it — that is honest and useful. A fake
comparison is neither.

---

## Vague background

**Bad:** *"The current deployment process has some issues."*

**Good:** *"The current deployment process requires 45 minutes of manual steps and caused three
production incidents last quarter. The team spends about eight hours a week on it."*

If no numbers exist, say that they do not and name what would produce them.

---

## Missing "do nothing"

Always include the status quo for a significant change. It is the only option that forces an honest
test of whether the work is worth doing, and it is the one most often skipped precisely because
somebody already decided.

---

## Criteria written after the options

Criteria defined after the options look like they were chosen to justify a preferred answer — and
usually were. Write them first, with weights, and mark the must-haves. Then evaluate each option
against them explicitly.

---

## Hidden assumptions

**Bad:** *"We'll migrate over six months."*

**Good:** *"Assumption: two engineers are available for migration work next quarter. Confidence:
medium. Invalidated if headcount changes."*

An assumption without an invalidation trigger becomes invisible. When the decision stops working
later, nobody can tell whether it was wrong or whether a hidden premise expired.

---

## A requirement with no identifier

Stage 4 extracts checks by identifier and Stage 5 audits by walking them. A requirement without one
is invisible to both — it will not be proven, it will not be audited, and nobody will notice it was
dropped.

---

## A requirement containing "and"

*"Users can export and schedule reports"* is two capabilities, one acceptance criterion and a
guaranteed half-implementation. Split it.

---

## An acceptance criterion that cannot fail

*"Handled gracefully"*, *"performs well"*, *"properly validated"*. Nothing can be proven against
these, so Stage 4 will either invent a concrete meaning or write a check that passes trivially. Give
a status code, a field, a bound, a visible state.

---

## A document that reads as finished

An RFC with no status row, no open-questions section and no outcome placeholder has nowhere for
reality to land. The first amendment then goes into a commit message or a chat, and the next repo
never sees it. Leave the affordances even when they are empty.

---

## Implementation design in the PRD

The PRD says what must be true for a user. The contract says what to build. The handoff doc says
what shipped. When the PRD starts naming tables and function signatures, all three collapse into one
document that is authoritative for nothing.

---

## A placeholder that reads like content

The worst failure of this stage. `<TBD>` is honest; an invented metric, an assumed approver or a
plausible-sounding acceptance criterion is not — a downstream repo will build against it and nobody
will know it was a guess.

If asking did not resolve it, it goes to `## Open questions` with an owner.
