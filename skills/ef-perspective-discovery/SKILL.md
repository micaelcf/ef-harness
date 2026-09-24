---
name: ef-perspective-discovery
description: "Discover a feature from the current repository's perspective, after it was defined upstream at product altitude: verify the docs' code anchors, fan out read-only scouts, triage contradictions, grill the survivors, then write the contract. Use when handed a feature-docs folder (grill-decisions/RFC/PRD) produced elsewhere, once per target repo, before implementing."
---

# Perspective discovery — Stage 3 of 5

Turn a feature specified **somewhere else** into closed decisions and a written contract for **this**
repository, before any code exists.

The deliverable is a list of contradictions, a set of closed decisions, and the contract. It is not
a plan document, and it is not code.

## Where this sits

This is **not** the first stage. The feature was already defined at product altitude and written up
by Stage 2; the docs folder you were handed is that output.

```
Stage 1 /ef:grilling  →  Stage 2 /ef:feature-docs  →  grill-decisions · RFC · PRD · INDEX
        ↓
THIS SKILL, once per target repo  →  closed decisions → the contract
        ↓
Stage 4 /ef:implement  →  Stage 5 /ef:audit  →  the handoff doc
```

Three consequences:

- **The docs are upstream intent, not repo truth.** They were written at product altitude, often
  before the code existed, usually by a session that could not see this repository. That is
  precisely why Step 1 exists.
- **One product grill fans out to N repos.** Each target repo runs this skill independently and
  reaches its own decisions against the same doc set. That is what "perspective" means here.
- **A `FICTION` verdict can reopen a product decision, not just a local one.** When a false claim is
  load-bearing for an RFC decision, escalate it up a stage and amend the RFC. Do not quietly route
  around it in this repo — the sibling repos are reading the same false claim and will not know.

## Why this exists

Feature docs are prose. Prose cannot be compiled, so it rots the moment it is written and nothing
catches it. A docs folder that reads beautifully routinely contains load-bearing claims about code
that are simply false — a job that does not exist, a migration that was never created, a permission
gate that is enforced nowhere, a table shape someone refused. Reading the docs harder never finds
those. Checking them against the code does.

So: **this is contradiction-hunting, not reading.**

---

## Step 1 — Anchor check (always first)

Extract every concrete claim about code from the docs: `path:line` references, file names, symbol
names, table and column names, migration names, "we already have X" assertions.

Verify each against this repository. Classify:

| Verdict | Meaning |
|---|---|
| `VERIFIED` | Exists, and says what the docs claim |
| `MOVED` | Exists elsewhere or at a different line — record the real location |
| `CHANGED` | Exists at that location but behaves differently than claimed |
| `FICTION` | Does not exist at all |
| `N/A` | Belongs to another repository — do not guess, mark and move on |

Report a table plus a count per verdict. **Any `FICTION` or `CHANGED` on a load-bearing claim means
the docs cannot be trusted as written**, and every decision resting on that claim is reopened. Say so
explicitly, and amend the RFC where the claim was load-bearing for a decision.

**Check each failure against the decisions' `Would reopen if` conditions** in `grill-decisions`. That
field exists so this step is a match rather than a judgement call: a false claim that satisfies a
stated reopen condition reopens that decision by its own terms, and one that satisfies none is a
correction to the docs rather than a reversal. Without the match, every false claim triggers the same
undifferentiated alarm and the one that matters gets lost among them.

Cheap, mechanical, and it prevents the tax where a wrong spec is discovered one amendment at a time
during implementation. `/ef:spec-drift` runs this step alone.

---

## Step 2 — Scout fan-out

Read-only subagents in parallel, one per **area of this repo the feature touches**.

### First: is a fan-out warranted?

**Can you name the files this feature changes, before starting?**

- **Yes** → skip the fan-out. Step 1's anchor check plus a direct read of those files is enough, and
  four scouts would return what you already know. Say you skipped it and why.
- **No** → fan out. Not knowing which files change is precisely the condition scouts exist for.

Step 1 is never skipped at any scale: it is minutes of work and it is the only thing that catches a
doc claiming something false. The fan-out is the expensive half, and it is the conditional one.

### Picking the axes

One scout per layer or subsystem, derived from the docs' own anchors plus this repo's structure —
read the repo's context file, its guides, and its directory layout to find the real seams. Not one
per file, not one per requirement.

Axes must be **disjoint**: two scouts reading the same code is wasted budget and produces conflicting
maps. 4 is the floor for a real feature; past ~8 the reports blur together and you stop reading them
properly.

Typical seams, whatever the stack: the aggregate being extended and its children · the
transaction/consistency mechanism · the propagation or eventing mechanism · the thing you are
extending rather than creating · schema and generated code · background work and side effects ·
auth, permissions and identity plumbing · test conventions · validation and any legacy to delete ·
the presentation layer's routing, state, components and i18n conventions.

Always include a **conventions** scout: how does this repo wire a new unit of this kind, what is the
newest example to copy, and what are its gate commands? That scout's output is not disposable — it
becomes the bindings half of the contract, and Stage 4 codes against it.

### Assign each scout a lens

The area says what to read; the **lens** says how. Parallel readers given the same method produce
correlated reports however different their areas, and the fan-out buys nothing. Assign one lens per
scout from `.claude/skills/_shared/lenses.md` — evidence-audit, assumption-surfacing, pre-mortem, red-team, or
second-order — matched to what that area is most likely to hide.

The lens is also what generates that scout's pre-registered questions. Apply the method; never name
it in the report.

### The brief

Shared context, once, for the whole batch:

```
# Goal — what the batch accomplishes, and one sentence of why
# Constraints
- READ-ONLY. No edits, no formatters, no builds, no test runs.
- Report exact path:line for every claim. NEVER paraphrase a signature — quote it.
- Precision over breadth: I will write code against your report, so a wrong
  signature is worse than an omission.
- Where you find something that CONTRADICTS the docs' assumptions, say so
  explicitly and loudly. That is the highest-value output.
- Flag your own uncertainty. "I did not verify X" is useful; a confident guess
  is not.
- Clean up any scratch file or directory you create.
- <any repo-specific constraint Step 1 or the repo's guides revealed>
# Contract — the report shape
## Facts — numbered path:line findings
## Signatures — verbatim declarations the lead must code against
## Conventions — the house pattern to imitate, and the newest file to copy
## Contradictions / Gaps — anything breaking a docs assumption, or that only a
   human can answer
```

Per task: `# Target` (exact files/symbols, explicit non-goals) · `# Change` (numbered list of what to
map) · `# Acceptance` (the report, plus pre-registered questions).

### Pre-registered questions are the point

The `# Acceptance` questions matter more than the mapping instructions. For each scout, write the two
or three questions **you are afraid the answer to is "no"**:

- *"Is <mechanism the docs rely on> actually enforced anywhere today?"*
- *"Does any existing path do <the multi-step thing> atomically, or is this the first?"*
- *"Is there a second writer of this data outside this repo?"*
- *"Would adding <column/field/route> break an existing consumer?"*

The answers to these become the grilling questions. Neutral "map this area" instructions produce
neutral maps and leave you to spot the contradictions yourself, which defeats the fan-out.

---

## Step 3 — Triage (the gate)

Read **every** report yourself. Then sort each contradiction into exactly one bucket:

1. **Resolved** by another scout's facts → note and move on.
2. **Self-answerable** from code with one more look → answer it now. Do not carry it to the human.
3. **A genuine decision** with materially different consequences → becomes a grilling question.

**Proceed to grilling when bucket 2 is empty and bucket 3 is stable.** That is the termination
condition for discovery.

Before you trust a report: **verify any scout claim you are about to make load-bearing.** Scouts are
confidently wrong occasionally, and a wrong claim baked into the contract propagates into every
slice.

Grade each claim you are about to rely on against `.claude/skills/_shared/evidence-grades.md`. Only **A** claims —
code read at `path:line` — enter the contract unverified; **B** and below get re-read first. Triage
bucket 3 by grade too: the weakest-evidence decision is the one most likely to be wrong, so it is the
one to grill first, not last.

---

## Step 4 — Grill

Hand bucket 3 to `.claude/skills/ef-grilling/SKILL.md`, at **repo altitude** — the protocol, the bias guards
and the record shape are there. One question at a time, each grounded in a finding with its evidence
grade, each with options, tradeoffs and a recommendation.

Every closed decision takes the record shape in
`.claude/skills/ef-grilling/references/decision-record.md`, and its `Would reopen if` field is what lets a
later anchor failure reverse it by its own terms.

Bucket 2 answers are stated as decisions you took, with evidence, so they can be vetoed. Step 1's
`FICTION`/`CHANGED` findings are stated as corrections, not questions. A question the human bounces
back is handled by `.claude/skills/ef-grilling/references/deadlock.md` — never by quietly recording your own
prior as their decision.

---

## Step 5 — Write the contract

Do not delegate this. Before any implementation subagent starts, **you** write the shared surface
every slice codes against.

Write it to `.checks/<feature>.md` under a `## Contract` heading, in this repository. It must be a
file: parallel slices cannot read a conversation, and a contract that is retyped per batch degrades
into a paraphrase, which is the divergence it existed to prevent.

The contract carries:

- **Interfaces and data shapes** — the declarations slices code against, verbatim.
- **Transaction and error boundaries** — what is atomic with what, what surfaces which error.
- **Naming** — the names that must agree across slices.
- **Bindings** — the gate commands, identifier rule, generated-code rule and test conventions the
  conventions scout found, as the feature-specific delta on top of the repo's own `ef-harness`
  declaration.
- **Requirement identifiers** owned by this repo.

Concurrent edits to the same files resolve fine — but only because the contract was decided first and
stated in the batch context. Anything left for slices to negotiate between themselves will diverge.

Then `/ef:implement` may begin.

---

## Failure modes

- **A scout is confidently wrong.** Verify before building on it.
- **Scratch artifacts break the build.** Require cleanup in the constraints.
- **Reports go stale within the session.** After any wave of edits, re-read before touching a file a
  peer changed.
- **Scouts cannot see each other.** Contracts belong in shared context, never assumed.
- **Skipping a question because the answer seems obvious.** The formality-looking questions produce
  the design changes.
- **Treating the docs as the requirement after Step 1 disproved them.** Once a claim is false, its
  dependent decisions are open again.
- **Leaving the conventions report in the scout's output.** If it does not reach the contract, Stage 4
  rediscovers it — or guesses.

## Output

1. The anchor table with per-verdict counts.
2. Contradictions, ranked by consequence, each with `path:line`.
3. Decisions you took yourself, with evidence.
4. Closed decisions from the grilling, each with rationale and what it supersedes.
5. The contract, written to `.checks/<feature>.md`.
6. Any amendment the anchor check owes the RFC.
