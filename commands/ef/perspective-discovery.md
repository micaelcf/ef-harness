---
description: Stage 3 - discover a feature from THIS repo's perspective before implementing it - anchor check, scout fan-out, contradiction triage, then grill
argument-hint: "<path-to-feature-docs> [\"additional notes\"]"
---

Feature docs: $1
Additional notes: $2

Stage 3 of 5 · per target repo · the docs are Stage 2 output, not repo truth · next: `/ef:implement`

Run the discovery protocol in `.claude/skills/ef-perspective-discovery/SKILL.md` against those docs, from
the perspective of the repository you are currently in. Read that skill first — it is the method,
and it is mandatory.

Three things to be clear about before you start:

- Those docs are **claims**, not truth. They were written at product altitude, often before the code
  existed, usually by a session that could not see this repository. Your first job is to find where
  they and this repository disagree.
- The deliverable is **closed decisions and a written contract**, not code and not a plan document.
  Do not implement anything until the grilling is finished and the human says the decisions are
  closed.
- A `FICTION` verdict on a load-bearing claim can reopen a **product** decision, not just a local
  one. Escalate it and amend the RFC — do not route around it here, because the sibling repos are
  reading the same false claim.

Cheaper first pass: `/ef:spec-drift $1` runs the anchor check alone and stops.
