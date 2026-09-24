# PRD template

Load this when writing the PRD — after the RFC exists. The PRD is written **from the RFC's
decisions**, not from the grill directly.

A PRD documents product discovery and becomes an evolving workspace. It is not a waterfall
specification handed down to a team, and it is not the place for implementation design.

Its one structural job in this harness: **it is the requirement identifier registry.** Stage 4
extracts checks by identifier; Stage 5 audits by walking them.

---

## Sections

Summary · Contacts · Background · Objective & success metrics · Segments · Value proposition ·
Solution overview · Requirements · Non-goals · Release & phasing · Open questions.

---

## Summary

Two or three sentences for someone who will not read the rest: what, for whom, why now.

## Contacts

Driver, approver, the engineer(s) per target repo, and any channel where this is discussed.

## Background

The problem space, prior research, what prompted this. Where the RFC already says it, link rather
than restate — but the PRD must stand alone for a reader who starts here.

## Objective & success metrics

What the objective is, why it matters, how it benefits customers and the business.

```markdown
| Metric | Current | Target | How measured |
|---|---|---|---|
```

Specific or omitted. *"Improve satisfaction"* is not a metric; *"raise task completion from 62% to
80% within 90 days of launch, measured by <event>"* is. Where no metric is measurable today, say so
explicitly rather than inventing a number.

**If missing, ask:** how will we know this worked.

## Segments

Who this is for, defined by the problem they have rather than their demographics. Any constraint —
geographic, language, regulatory, plan tier.

## Value proposition

The jobs and pains being addressed, and which of them this solves materially better than what exists
today. Link research rather than pasting it.

## Solution overview

The user experience at a high level: flows, key screens, prototype links. Key capabilities with a
one-line description each, and how each contributes to the objective.

Assumptions across **value, usability, viability and feasibility** — which are validated, which are
accepted risks.

Keep implementation detail out. If a technical constraint decides the product shape, it belongs in
the RFC as a decision, and here only as its consequence.

## Requirements

The registry. Grouped by priority, each with a stable identifier and acceptance criteria.

```markdown
### P0 — must have

| id | Requirement | Acceptance criteria | Repo |
|---|---|---|---|
| RF-101 | <one observable capability> | <concrete, checkable condition> | api |

### P1 — should have
### P2 — nice to have / later
```

Rules:

- **One observable capability per row.** If it needs "and", split it.
- **Acceptance criteria are concrete** — a status code, a field, a bound, a visible state. Never
  "properly", "gracefully", "fast".
- **Identifiers are permanent.** Never renumber. A cut requirement is struck through and kept, with
  the amendment saying why — a downstream repo may already be building against it.
- **Name the owning repo** when the feature spans several. An unowned requirement is nobody's.

## Non-goals

What this deliberately does not do, and why. As important as the goals: this is what stops scope
creep during implementation, and it is what Stage 5 checks an "accepted gap" against.

## Release & phasing

What ships first and what is deferred. Milestones as outcomes, not absolute dates — this is an
estimate, not a contract.

## Open questions

```markdown
| Question | Owner | Needed by |
|---|---|---|
```

Genuinely unresolved only. Closed in place with the evidence that closed them.

---

## Quality checklist

- [ ] Every requirement has a stable id and concrete acceptance criteria
- [ ] Every requirement names its owning repo where the feature spans several
- [ ] No requirement contains "and" hiding two capabilities
- [ ] Success metrics are measurable, or their absence is stated
- [ ] Non-goals are explicit
- [ ] Nothing in the document invents a value that only the user could supply
- [ ] Implementation design is absent — it belongs to the contract, not here
