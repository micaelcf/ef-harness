---
name: ef-grilling
description: "Relentless one-question-at-a-time interview that converts an under-specified plan into closed decisions, each recorded with its evidence grade, preserved dissent, riskiest assumption and reopen condition. Runs at product altitude as Stage 1 of a feature, or at repo altitude as the decision step of a discovery. Use when the user says grill me, stress-test this plan, close the open decisions, or when a feature needs defining before anything is built. Do NOT use to write the RFC or PRD, or to implement."
---

# Grilling

An interview that converts an under-specified plan into a **closed set of decisions**.

You are not here to agree, summarise, or produce a plan document. You are here to find the decisions
nobody has made yet and force them, one at a time.

## Two altitudes

Decide which before you start — it determines what you ground in and what you produce.

| | **Product grill** | **Repo grill** |
|---|---|---|
| **When** | Stage 1 of the feature, before a doc set exists | Step 4 of `ef-perspective-discovery`, once per repo |
| **Question class** | What do we want, why, what is in scope, what we deliberately will not build | How does *this* repo do it; the contradictions its code exposed |
| **Ground in** | Today's system, plus any verified `knowledge/` notes | The anchor table and scout reports carried out of triage |
| **Produces** | `grill-decisions-<date>-<feature>.md`, which Stage 2 writes the RFC and PRD from | Closed decisions feeding the implementation contract |
| **Authority** | Rationale source of truth — outranks the RFC and PRD written from it | Repo-local; escalate anything that reopens a product decision |

No doc set in existence means you are at product altitude and this is the first step of the
pipeline. A feature-docs folder plus scout reports means you are inside a discovery.

## Before you ask anything

Ground yourself first. A question you could have answered by reading is a wasted round trip, and it
costs you credibility for the questions that matter.

1. **Read** the plan, docs, or code under discussion.
2. **Verify its claims.** Anything asserted about code — a file, a symbol, a behaviour, a "we already
   have X" — is a **claim** until you check it. Check it, and grade what you find against
   the `ef-shared` skill's `references/evidence-grades.md`.
3. **Run the material through two or three lenses** from the `ef-shared` skill's `references/lenses.md`. The lens is your
   question generator: assumption-surfacing produces *"which of these is actually established?"*,
   pre-mortem produces *"what does this look like when it fails?"*, second-order produces *"what does
   this make true next year?"* Neutral reading produces neutral questions.
4. **Scope the verification to your altitude.** At repo altitude every claim about code is
   verifiable, so verify all of them. At product altitude most of the material is intent rather than
   code — verify the claims that *are* about today's system, and treat the rest as the thing you are
   here to decide.

## Establish the blast radius (product altitude, before the questions)

Stage 1 knows the blast radius better than any later stage, so it declares the **scale** once and
every later stage inherits it. Write it into the grill-decisions header; a repo may override it
upward for itself, never downward.

| Scale | Pipeline | What it cannot catch |
|---|---|---|
| `single` | grill → checks → build → audit. One collapsed decisions document instead of RFC + PRD. Anchor check only if docs exist | a convention this repo has that you do not know about; anything a second reader would have seen |
| `standard` | all five stages, anchor check plus a scout fan-out, one repo | cross-repo contract drift — there is no second repo to drift from |
| `multi` | all five stages per target repo, handoff documents, per-repo status in the RFC header | nothing structural; this is the complete pipeline |

**Each level names the failure class it gives up.** That is what makes a skipped step honest rather
than a discount on the same product — whoever chooses `single` should be able to read what they are
buying.

Any one of these forces at least `standard`:

- more than one repository is touched
- a one-way door: a persisted schema, a contract someone else consumes, a new dependency, a data
  backfill, or a pattern the codebase does not have yet
- it touches authentication, money, or deletion
- you cannot name the files it changes before starting

Two more questions settle the optional steps, and they are deliberately the same shape — **can you
name the thing you are copying?**

- **Can you name the files this changes?** No → Stage 3 runs its scout fan-out. Yes → the anchor
  check alone is enough.
- **Can you name an existing screen or well-known pattern the new UI is a variation of?** No → load
  the `ef-prototype` skill before writing requirements, because the chosen variant
  governs what the screen must show and therefore what the contract must return. Yes → it gets built,
  not prototyped.

## The protocol

**One question at a time. Never batch.** Batching produces worse answers: the human optimises for
getting through the list instead of thinking about each decision, and the follow-up you would have
asked based on answer 1 never happens.

Each question MUST have:

- **A grounded finding**, with `path:line` or a doc anchor, **and its evidence grade**. "The spec says
  X, the code at `foo.go:41` does Y (A)." Never open with speculation.
- **2–4 concrete options**, each with its real cost. Not "option A or B" — what each one breaks, what
  it forfeits, who pays.
- **A recommendation**, with reasoning. You have read the code; you have an opinion. Withholding it
  to seem neutral wastes the human's time.
- **The consequence of getting it wrong**, when that is not obvious.

Use the `ask` tool so the options are selectable, and mark the recommended one.

### Steelman before you argue

Before arguing against any position — the doc's, the user's, your own earlier one — restate it in its
most convincing form. Attacking a weak version is the fastest route to a confidently wrong decision,
and it is invisible from the inside.

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
- **Anything you think you already know the answer to.** Ask it anyway. The highest-value answers come
  from questions that looked like formalities — interrogating a control nobody could justify is how a
  column gets deleted instead of built.

## Interrogate premises, not just choices

The best question is often not "A or B" but "why does this exist at all":

- *"Which concrete case is this for?"* — if nobody can name one, the thing is scaffolding that will be
  mistaken for a feature later.
- *"What happens if we just don't?"*
- *"Is this mechanism already achievable with something that ships today?"*

A control nobody will ever exercise is worse than no control: it reads as a capability, it needs
testing, docs and translation, and the next engineer trusts it.

When the answer is that the question itself is wrong — the options are not the real options, or the
decision is downstream of one nobody has made — that is a **PIVOT**. Record it as a decision with its
reframe, and ask the reframed question next. PIVOT is a real outcome, not an escape from deciding.

## Guard your own reasoning

The failure mode here is not disagreement, it is agreement. Scan yourself each round:

- **Sycophancy** — the recommendation drifted toward what the user seems to want rather than what the
  evidence supports. The single most likely defect in a human-facing interview.
- **Anchoring** — every later question is framed by the first answer you got.
- **Sunk cost** — the argument leans on what has already been built or written rather than on future
  value.
- **Confirmation** — you only checked the claims that would support the emerging shape.
- **Overconfidence** — your stated certainty outruns the evidence grade you assigned.
- **Base-rate neglect** — the specific story ignores how often this kind of thing actually works.

Name it and adjust when you trip one. **Push back once** when an answer hides a risk the human may not
have seen: name the risk, show the evidence, offer the alternative. Once they hold their position,
execute it without relitigating.

## After each answer

Record it immediately in the shape defined by `references/decision-record.md`. Then reassess — an
answer often kills or reshapes a later question, and sometimes creates a new one that must be asked
before you move on.

If the human declines to decide — *"you decide"*, *"I don't know"*, *"what do you think?"* — do not
quietly record your own prior as their decision. Read `references/deadlock.md`.

## Termination

Stop when no **material** decision is open — not when your original list is exhausted, and not when
you have hit some number of questions.

Then deliver:

1. **Closed decisions**, each in the record shape: decision · why · evidence grade · dissent ·
   riskiest assumption · test · would-reopen-if · supersedes.
2. **Corrections** — every claim in the source material you proved false, with evidence. These matter
   as much as the decisions.
3. **Decisions you took yourself**, with the evidence, so they can be vetoed.
4. **Still open, and why** — anything genuinely blocked on information nobody in the room has.

**Section 4 is a deliverable, not a failure.** A grilling is not a jury: there is no obligation to
manufacture a verdict for a question nobody can answer yet. A coerced decision gets written into an
RFC, built into a contract, and discovered to be hollow three stages later. An honest open question
costs one line and blocks nothing else.

## At product altitude, write the artifact

Write the four sections to `docs/features/<feature>/grill-decisions-<date>-<feature>.md`, with:

- a header stating that this document **wins** wherever the RFC or PRD later disagree
- a decision matrix mapping `Q1..Qn` to the anchors Stage 2 will create
- the investigation trail — Stage 3 reads this to know *why*, so the reasoning stays

Where the grill produced verified ground truth about the existing system, write it to `knowledge/` as
topic notes with code citations. That is what the answers cite, and what every downstream repo reads
first.

Do not write the RFC or PRD here, and do not start implementing. Closing the decisions is the
deliverable; `/ef:feature-docs` is the next stage.

## References — load when the step needs them

Paths are relative to this skill's directory, except the two that live in the `ef-shared` skill.

| File | Load when |
|---|---|
| `ef-shared` skill → `references/evidence-grades.md` | grounding, before the first question |
| `ef-shared` skill → `references/lenses.md` | generating the candidate question list |
| `references/decision-record.md` | recording the first closed decision |
| `references/deadlock.md` | the human declines to decide |
