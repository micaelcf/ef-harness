---
description: Discover a brand-new UI before building it - 4-5 radically different variants in one shareable HTML file
argument-hint: "<screen or feature> [path-to-feature-docs]"
---

Screen: $1
Feature docs: $2

Optional · runs inside Stage 1, before `/ef:feature-docs` and before any contract is frozen

Load the `ef-prototype` skill — it holds the gate, the variant rules and the capture rules.

## Check the gate first

**Can you name an existing screen, component or well-known pattern this is a variation of?**

- **Yes** → say so and build it directly. A form, a table, a list-detail, a settings pane, a modal or
  a wizard is always a yes, even in a repo that has none yet.
- **No** → prototype it.

Refusing is a complete answer and usually the right one.

## What you produce

One self-contained HTML file at `docs/features/<feature>/prototypes/<screen>.html`, with 4–5 variants
that differ on a **named axis** — not on styling — switchable from a floating bottom bar. One of them
must be the conventional, boring baseline.

Then capture: the chosen variant and what was stolen from the losers, the screen's information needs
as requirements, and its data assumptions graded for Stage 3 to verify.
