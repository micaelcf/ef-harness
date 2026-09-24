---
description: Stage 2 - author the feature folder (RFC, PRD, INDEX) from closed grill decisions
argument-hint: "<feature-slug> [path-to-grill-decisions]"
---

Feature: $1
Grill decisions: $2

Stage 2 of 5 · once per feature · after `/ef:grilling` · next: `/ef:perspective-discovery` per repo

Author `docs/features/<feature>/` from the closed decisions. Read `.claude/skills/ef-feature-docs/SKILL.md`
first — it holds the method, the templates and the amendment protocol.

You are **transcribing and structuring decisions already made**. You are not re-deciding them, not
designing the implementation, and not filling gaps with plausible content.

## Order is the mechanism

```
grill-decisions (exists)  →  RFC  →  PRD  →  INDEX
```

Each is written **from** the one before, never beside it. Written in parallel they drift, and the
RFC's own "grill-decisions wins" precedence header becomes a lie on the day it is written.

## Gate before you write

Never generate a document with an invented value in a mandatory field. Collect what is missing with
the `ask` tool — highest-consequence question first, one wave at a time, not a single long form.

Anything only the user can settle, that asking did not resolve, goes to `## Open questions` with an
owner and a deadline. A placeholder that looks like content is the one failure this stage must not
produce.

## These documents are alive

Do not author a "final" RFC. Stages 3, 4 and 5 amend it in place as discovery contradicts it and as
each repo delivers, and its header is the only home for cross-repo delivery status. The amendment
rules are in `.claude/skills/ef-feature-docs/references/amendments.md`; read them before writing the header
so the document has somewhere for that to land.

## Language

Author in **English** unless the user asks for pt-BR. Product copy quoted inside the documents keeps
its own locale.

## Scope

This command authors once. It is a post-grill step, not a regenerator: after the first authoring,
these documents change only through amendments.
