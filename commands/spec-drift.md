---
description: Stage 3 pre-check - verify every code anchor in a feature's docs still resolves in this repo
argument-hint: "<path-to-feature-docs>"
---

Feature docs: $1

Stage 3 pre-check · per target repo · docs come from Stage 2 · next: `/ef:perspective-discovery`

Load the `ef-perspective-discovery` skill and run **only its anchor-verification stage** (Step 1)
against those docs, for the repository you are currently in. Do not run the scout fan-out, do not
triage, do not grill, do not implement.

Read that skill's Step 1 for the method and the report format.

Report the anchor table plus the count of each verdict, and stop.

If anything comes back `FICTION` or `CHANGED` on a load-bearing claim, say plainly that the docs
cannot be trusted as written and that a full `/ef:perspective-discovery` is needed before any
implementation starts. Where the false claim is load-bearing for a decision in the RFC, say that the
decision is reopened — the sibling repos are reading the same claim and will not know.

This command exists because it is the cheapest possible way to learn that a spec has rotted, before
spending a discovery budget on it.
