# RFC template

Load this when writing the RFC — after the grill decisions are read. The RFC records **decisions and
their rationale**. It is not an implementation design: that is the Stage 3 contract, and the record
of what actually shipped is the Stage 5 handoff document.

Replace every placeholder with a concrete value, or omit the section. A heading with "N/A" under it
does not appear.

## Mandatory sections

Header & metadata · Background · Assumptions · Decision criteria · Options considered (≥2) ·
Decisions · Risks · Open questions · Outcome.

Recommended where they apply: relevant data, cost estimate, phasing, resources.

---

## Header & metadata

```markdown
# RFC — <Feature>

| Field | Value |
|---|---|
| **Impact** | HIGH / MEDIUM / LOW — with the justification, not just the word |
| **Status** | <one line per target repo, dated> |
| **Driver** | who is proposing and responsible for the decision |
| **Approver** | who must approve |
| **Contributors** | who is doing the work, per repo |
| **Informed** | who needs to know but does not decide |
| **Target repos** | every repository this feature touches, and only those |
| **Ticket** | link |
| **Grilled decisions** | link to grill-decisions — **source of truth for rationale** |
| **Ground truth** | link to knowledge/ if it exists |
| **Created** | date |

> Where this RFC and [grill-decisions](./…) conflict, **grill-decisions wins**. Decision anchors
> **D1–Dn** map 1:1 to grill questions **Q1–Qn**.
```

**If missing, ask:** who approves this · which repositories it touches · the impact level and why.
Never guess a target repo: a repo wrongly listed gets a discovery pass nobody needed, and a repo
wrongly omitted never runs one.

The **Status** row is the only cross-repo delivery status in the whole harness. Stages 4 and 5 update
it. Write it as one line per target repo even when nothing has shipped yet, so there is a shape to
amend.

---

## Background

Current state · the problem · why now · the cost of inaction.

Concrete, with numbers where they exist. *"The current process takes 45 minutes of manual steps and
caused 3 incidents last quarter"* — not *"the current process has some issues"*.

**If missing, ask:** what changed that makes this worth doing now.

---

## Assumptions

Each assumption gets an **evidence grade** and an **invalidation trigger**:

```markdown
| # | Assumption | Owner | Evidence | Invalidated if |
|---|---|---|---|---|
| 1 | <claim, with its anchor or "unverified"> | @who | A/B/C/D | <the concrete event that breaks it> |
```

Grades come from the `ef-shared` skill's `references/evidence-grades.md`, the same scale every stage uses. A **C** or **D**
assumption that is load-bearing must carry a cheap test alongside its trigger, or be asked about
rather than assumed.

**Both columns come from the grill decisions, not from you.** Each decision record carries a
`Riskiest assumption`, a `Test` and a `Would reopen if`; those become this table's rows. An
assumptions table written fresh at Stage 2 fills with restated decisions instead of real premises,
because the person writing it no longer remembers what was uncertain.

An assumption with no invalidation trigger is a time bomb: when the decision stops working later,
nobody can tell whether it was wrong or whether a hidden premise expired. The trigger is also what
Stage 3 and Stage 4 check against — an anchor check that fires a trigger amends the row.

**At least one explicit assumption is mandatory.** A feature with none has unexamined ones.

---

## Decision criteria

Stated **before** the options, with weights, and with must-haves marked.

Criteria written after the options look chosen to justify a preferred answer, and usually were.

---

## Options considered

Minimum two. **"Do nothing" is mandatory for any significant change** — it forces an honest test of
whether action is needed at all.

```markdown
| Option | Pros | Cons | Verdict |
|---|---|---|---|
| (a) … | … | … | **Chosen** |
| (b) … | … | … | Rejected — <the property that disqualified it> |
| (c) Status quo | … | … | Rejected — <why inaction costs more> |
```

Evaluate each against the criteria above, not in isolation. A rejection reason must name a property
that can be argued with: *"cannot express the next state"*, not *"less clean"*.

**The losing options come from the grill's `Dissent` field**, which preserved the strongest case for
the road not taken at the moment it was live. Inventing them here produces the predetermined
conclusion in `anti-patterns.md`: a comparison written by someone who already knows the answer, where
the alternatives exist only to lose. Where a decision record says `none — forced by <constraint>`,
say the choice was forced and name the constraint rather than staging a fake comparison.

---

## Decisions

One subsection per anchor:

```markdown
### D<n>. <decision in one line> (grill Q<n>)

<Two or three sentences of rationale, tied back to the criteria — from the decision record's ranked
`Why`, not re-derived.>

<Options table, if this decision had live alternatives.>

**Evidence.** <A/B/C/D, carried from the decision record.>

**Decision.** <what is normative, stated so a builder can act on it without reading the history.>
```

Anchors are permanent. A superseded decision keeps its number, gets struck through, and the
amendment sits under it.

---

## Risks

```markdown
| # | Risk | Severity | Mitigation |
|---|---|---|---|
```

Severity is about consequence, not likelihood theatre. A risk with no mitigation is an accepted risk
and must say so.

---

## Open questions

```markdown
| # | Question | Needed by | Owner |
|---|---|---|---|
```

Only genuinely unresolved things — not what you could have answered from the grill decisions.
Closed later **in place**, with the evidence that closed them, never by deletion.

---

## Outcome

A placeholder during drafting, filled when the decision is actually made. Leave the heading.

---

## Quality checklist

- [ ] Title is specific and action-oriented
- [ ] Impact assessed with justification
- [ ] Background carries current state, problem, why now, cost of inaction
- [ ] Every assumption has confidence and an invalidation trigger
- [ ] Criteria defined before options, with weights and must-haves
- [ ] At least two options, including "do nothing" where the change is significant
- [ ] Options evaluated against the criteria, not just pros and cons in isolation
- [ ] Every rejection names the disqualifying property
- [ ] Decision anchors map 1:1 to grill questions
- [ ] RACI complete: driver, approver, contributors, informed
- [ ] Status row exists per target repo, even when nothing has shipped
- [ ] Outcome left as a placeholder
- [ ] Nothing in the document is an invented value in a mandatory field
