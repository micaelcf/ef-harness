---
description: Stage 5 - adversarial audit of delivered work against its requirements, verification that claimed fixes are real, then the code-verified contract doc
argument-hint: "<path-to-feature-docs> [audit|verify|contract]"
---

Feature docs: $1
Mode: $2 (default `audit` when empty)

Stage 5 of 5 · per target repo, after that repo's implementation · the single audit gate

Run `skills/ef-adversarial-audit/SKILL.md` in that mode against the work delivered in the repository
you are currently in. Read the skill first — it holds the rubric.

## Before you spawn it

Run the gates named by the repository's `ef-harness` block and hand the results to the auditor as
pre-verified ground, telling it not to re-run them. A slow suite re-run inside the audit spends the
budget that should go on the defect classes no gate can see.

Audit against the **requirement identifiers in the PRD** and the rationale in `grill-decisions` —
never against the implementer's summary.

## How it is dispatched

Spawn the audit as a **`reviewer` subagent** with a read-only, report-only brief, dispatched by
whoever holds the whole feature, over `<feature base>..HEAD`, with **every** requirement in scope.
Never from inside a build slice, and never scoped to the last wave. You wrote it; you will not see
what you missed in it.

Then own the result yourself: read every finding, verify the ones you are about to act on, and
triage. Findings are **advisory** — a finding that contradicts a requirement may be the finding that
is wrong. Say so, with evidence, rather than complying automatically.

## Modes run in order

- `audit` — report only, fix nothing.
- `verify` — after remediation, assuming at least one fix is incomplete and one regressed. Loop
  `audit → remediate → verify` until verify is clean. Terminate on the external check, never on the
  implementer's assessment.
- `contract` — only once verify is clean. Emits the handoff document other repositories build
  against, written from the code.

Do not fix anything as part of this command. Report, triage, then remediate as a separate deliberate
step — a remediation pass is exactly as fallible as the work it corrects.

Record what shipped, what did not, and any accepted gap as an amendment to the RFC and PRD; the
RFC's header is the only cross-repo delivery status.
