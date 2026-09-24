---
name: ef-feature-docs
description: "Stage 2 - author a feature's documentation folder from closed grill decisions: grill-decisions to RFC to PRD to INDEX, with mandatory fields gated by asking rather than invented, stable requirement identifiers, and an amendment protocol that keeps the documents alive through implementation. Use after a product-altitude grilling has closed the decisions, or when the user says write the RFC, write the PRD, author the feature docs."
---

# Feature docs — Stage 2 of 5

Turn closed decisions into the document set every downstream repository reads.

You are **transcribing and structuring decisions already made**. You are not re-deciding them, not
designing the implementation, and not filling gaps with plausible content.

## Order is the mechanism

```
grill-decisions (exists)  →  RFC  →  PRD  →  INDEX
```

Each document is written **from** the one before, never beside it:

- **`grill-decisions`** is the rationale source of truth and outranks everything written from it.
  Stage 1 produced it; you do not modify it.
- **The RFC** carries the decisions with their options, criteria, assumptions and risks. Its
  decision anchors `D1..Dn` map 1:1 to the grill's `Q1..Qn`. Where a grill question produced no
  anchor, say so rather than renumbering.
- **The PRD** carries requirements with stable identifiers, acceptance criteria and success metrics.
  It is written from the RFC's decisions, not from the grill directly.
- **`INDEX.md`** is the map: what this feature is, which document settles what, the reading order,
  the decision index, and the per-repo status.

Written in parallel they drift, and the RFC's own precedence header becomes a lie on the day it is
written.

## Gate before you write

Never generate a document with an invented value in a mandatory field. Each template names its
mandatory fields and the question to ask when one is missing.

Collect what is missing with the `ask` tool — highest-consequence question first, one wave at a
time, not a single long form. If the user provided rich context, use it; do not ask for what you
already have.

Anything only the user can settle that asking did not resolve goes to `## Open questions` with an
owner and a deadline. **A placeholder that reads like content is the one failure this stage must not
produce** — a downstream repo will build against it.

## The PRD is the identifier registry

Stage 4 extracts checks by requirement identifier and Stage 5 audits by walking them. So:

- every requirement gets a stable id (`RF-###` or the repo family's convention)
- ids are **never renumbered**; a superseded requirement is struck through and kept
- a requirement with no id cannot be traced, proven or audited, and will be silently dropped

## These documents are alive

Do not author a "final" RFC. Stage 3 amends it when an anchor comes back false, Stage 4 when the
shipped shape differs from the design, Stage 5 when something did not ship. Its header is the only
home for cross-repo delivery status.

Read `references/amendments.md` before writing the header, so the document has somewhere for that
to land.

## Language

Author in **English** unless the user asks for pt-BR. Product copy quoted inside the documents keeps
its own locale. Technical terms stay in English regardless.

## Scope

This skill authors **once**. It is a post-grill step, not a regenerator: after the first authoring,
these documents change only through amendments. That is why there is no merge behaviour to define.

## References — load at the step that needs them

| File | Load when |
|---|---|
| `references/rfc-template.md` | writing the RFC |
| `references/prd-template.md` | writing the PRD |
| `references/index-template.md` | writing INDEX.md |
| `references/amendments.md` | writing the RFC header, or amending later |
| `references/anti-patterns.md` | before finalising either document |

Do not load them during the first pass over the grill decisions.

## Output

State where each file was written, which mandatory fields you had to ask about, and what remains in
`## Open questions` with an owner. Then name the next stage: `/ef:spec-drift` or
`/ef:perspective-discovery`, per target repo.
