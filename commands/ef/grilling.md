---
description: Relentless one-question-at-a-time interview that closes every open decision before implementation starts - Stage 1 of a feature at product altitude, or the decision stage of a repo discovery
argument-hint: "[what to grill: a plan, a docs folder, or nothing to grill the current context]"
---

Run a grilling session over: $ARGUMENTS

If that is empty, grill whatever plan or design is live in this conversation.

## The pipeline

```
Stage 1  /ef:grilling                 close decisions            grill-decisions
Stage 2  /ef:feature-docs             author the folder          RFC · PRD · INDEX
Stage 3  /ef:perspective-discovery    per repo, anchors → grill  the contract
Stage 4  /ef:implement                per repo, fan-out          .checks/<feature>.md
Stage 5  /ef:audit                    per repo, single gate      the handoff doc
```

Stage 3 has a cheap pre-check, `/ef:spec-drift`, which verifies the docs' code anchors and stops.
Stages 4 and 5 amend the RFC and PRD in place; they are living documents, not Stage 2 deliverables.

## Two altitudes

This command runs at one of two altitudes. Decide which before you start — it determines what you
ground in and what you produce.

| | **Product grill** | **Repo grill** |
|---|---|---|
| **When** | Stage 1 of the whole feature, before a doc set exists | Step 4 of `ef-perspective-discovery`, once per repo |
| **Question class** | What do we want, why, what is in scope, what we deliberately will not build | How does *this* repo do it; the contradictions its code exposed |
| **Ground in** | Today's system, plus any verified `knowledge/` notes | The anchor table and scout reports carried out of triage |
| **Produces** | `grill-decisions-<date>-<feature>.md`, which Stage 2 writes the RFC and PRD from | Closed decisions feeding the implementation contract |
| **Authority** | Rationale source of truth — outranks the RFC and PRD written from it | Repo-local; escalate anything that reopens a product decision |

Empty `$ARGUMENTS` with no doc set in existence is the product grill: the feature is being defined
here, and this is the first step of the pipeline. A feature-docs folder plus scout reports is the
repo grill.

## What this is

An interview that converts an under-specified plan into a closed set of decisions. You are not
here to agree, summarise, or produce a plan document. You are here to find the decisions nobody
has made yet and force them, one at a time.

## Before you ask anything

Ground yourself first. A question you could have answered by reading is a wasted round trip and it
costs you credibility for the questions that matter.

1. Read the plan, docs, or code under discussion.
2. Verify its claims. Anything asserted about code — a file, a symbol, a behaviour, a "we already
   have X" — is a **claim** until you check it. Check it.
3. Build the candidate question list from what you found: contradictions between the plan and the
   code, unstated tradeoffs, and premises nobody validated.
4. Scope step 2 to your altitude. At repo altitude every claim about code is verifiable, so verify
   all of them. At product altitude most of the material is intent rather than code — verify the
   claims that *are* about today's system, and treat the rest as the thing you are here to decide.

## The protocol

**One question at a time. Never batch.** Batching produces worse answers: the human optimises for
getting through the list instead of thinking about each decision, and the follow-up you would have
asked based on answer 1 never happens.

Each question MUST have:

- **A grounded finding.** Open with what you actually discovered, with `path:line` or a doc anchor.
  "The spec says X, the code at `foo.go:41` does Y." Never open with speculation.
- **2–4 concrete options**, each with its real cost. Not "option A or B" — what each one breaks,
  what it forfeits, who pays.
- **A recommendation**, with reasoning. You have read the code; you have an opinion. Withholding it
  to seem neutral wastes the human's time.
- **The consequence of getting it wrong**, when that is not obvious.

Use the `ask` tool so the options are selectable, and mark the recommended one.

## What NOT to ask

- **Anything code, docs, or config can answer.** Decide it yourself, state the decision and the
  evidence, and move on. Route paths, naming conventions, which existing helper to reuse, house
  patterns — these are research, not decisions.
- **Anything already decided** in the docs, unless you found evidence it is wrong. Then it is not a
  question about preference, it is a correction.

## What you MUST ask

- Anything where two defensible options have materially different consequences for a human: product
  behaviour, security posture, permission scope, data loss, migration risk, a contract other teams
  will code against.
- Anything the plan asserts about code that you found to be **false**. Do not quietly work around a
  wrong spec; surface it, because the spec is probably wrong elsewhere too.
- **Anything you think you already know the answer to.** Ask it anyway. The highest-value answers
  come from questions that looked like formalities — interrogating a control nobody could justify is
  how a column gets deleted instead of built.

## Interrogate premises, not just choices

The best question is often not "A or B" but "why does this exist at all":

- *"Which concrete case is this for?"* — if nobody can name one, the thing is scaffolding that will
  be mistaken for a feature later.
- *"What happens if we just don't?"*
- *"Is this mechanism already achievable with something that ships today?"*

A control nobody will ever exercise is worse than no control: it reads as a capability, it needs
testing, docs and translation, and the next engineer trusts it.

## After each answer

Record it immediately, in one or two lines: the decision, the reason, and what it **supersedes** if
it reverses something written down. Then reassess — an answer often kills or reshapes a later
question, and sometimes creates a new one that must be asked before you move on.

Push back once if an answer hides a risk the human may not have seen: name the risk, show the
evidence, offer the alternative. Once they hold their position, execute it without relitigating.

## Termination

Stop when no **material** decision is open — not when your original list is exhausted, and not when
you have hit some number of questions.

Then deliver:

1. **Closed decisions** — numbered `Q1..Qn`, each with its rationale and what it supersedes.
2. **Corrections** — every claim in the source material you proved false, with evidence. These
   matter as much as the decisions.
3. **Decisions you took yourself**, with the evidence, so they can be vetoed.
4. **Still open, and why** — anything genuinely blocked on information nobody in the room has.

At product altitude those four sections are the artifact: write them to
`docs/features/<feature>/grill-decisions-<date>-<feature>.md`, with a header stating that this
document wins wherever the RFC or PRD later disagree, and a decision matrix mapping `Q1..Qn` to the
decision anchors Stage 2 will create. Where the grill produced verified ground truth about the
existing system, write it to `knowledge/` as topic notes with code citations — that is what the
answers cite, and what every downstream repo reads first.

Do not start implementing, and do not write the RFC or PRD here. Closing the decisions is the
deliverable; `/ef:feature-docs` is the next stage.
