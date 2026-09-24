# The five lenses

A lens is a **critical method**, not a topic. Parallel readers given the same evidence and the same
method produce correlated output and add nothing; readers given different methods decorrelate, and
that difference is the whole value of reading something more than once.

Apply the method. Never name-drop it to the user.

---

## 1. Assumption-surfacing (Socratic)

Relentlessly ask what is being taken for granted. List the unstated premises the position depends
on, then separate the **established** from the merely **assumed**.

*Output:* an assumption inventory, each tagged established or assumed, each with an evidence grade.

*Best against:* a design that reads as obviously correct.

## 2. Pre-mortem

Assume it is N months later and this failed. Write the specific failure narrative and trace the
second-order chain — the failure causes X, which causes Y.

Concrete stories only. *"It might not work"* is not a pre-mortem.

*Output:* two or three failure narratives with their consequence chains.

*Best against:* propagation, consistency and migration mechanisms.

## 3. Red-team

Adopt an adversary or a worst-case user. How is this exploited, gamed, misused, or broken on
purpose? What input was never considered?

*Output:* attack vectors and the conditions that trigger them.

*Best against:* auth, permissions, identity, quota and anything accepting external input.

## 4. Evidence-audit (falsification)

For the leading claim, ask what evidence would prove it **wrong**, whether that evidence was ever
sought, and how strong the support actually is. Grade every key claim against
`.claude/skills/_shared/evidence-grades.md`.

*Output:* a graded claim table and the single weakest link.

*Best against:* documents asserting things about code, and any "we already have X" claim.

## 5. Second-order consequences

Ignore the immediate effect. Reason about what this makes true 6 to 18 months out, including the
incentives it creates and the doors it closes.

*Output:* the downstream state, plus any one-way-door warnings.

*Best against:* extending something that already exists, and introducing a pattern the codebase
does not have yet.

---

## Assigning them

### Stage 1 — grilling

The lens is a **question generator**, applied by the interviewer before the interview. Run the
material through two or three lenses and the candidate questions fall out: assumption-surfacing
produces *"which of these is actually established?"*, pre-mortem produces *"what does this look like
when it fails?"*, second-order produces *"what does this make true next year?"*

Pick the lenses that fit the material rather than running all five.

### Stage 3 — scout fan-out

**One lens per scout, alongside its area.** The area says what to read; the lens says how. Two scouts
on different areas with the same method still return the same shape of report.

Suggested pairings, adapt to the feature:

| Scout area | Lens |
|---|---|
| conventions, and the docs' claims about this repo | evidence-audit |
| the aggregate being extended and its children | assumption-surfacing |
| the propagation, eventing or consistency mechanism | pre-mortem |
| auth, permissions and identity plumbing | red-team |
| the thing being extended rather than created | second-order |

The lens also generates that scout's pre-registered questions — the two or three whose answer you
are afraid is "no". A lens assignment without pre-registered questions produces a neutral map again.

---

## The steelman requirement

Universal, at both stages. Before arguing against any position — a doc's claim, a user's preference,
another reader's finding — restate it in its **most convincing form**. Attacking a weak version is
the fastest route to a confidently wrong conclusion, and it is invisible from the inside.
