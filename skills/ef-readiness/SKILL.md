---
name: ef-readiness
description: "Make a repository's agent rulebook (AGENTS.md / CLAUDE.md) verifiable: vendor a deterministic checker, audit every rule and citation against the code, bootstrap a lean rulebook from what the code cannot say, and grow it from audit findings. Use when setting a repo up for agents, when asked to audit or slim AGENTS.md or CLAUDE.md, before the first EF feature in a repo, or after an audit proposes rulebook lines. Do NOT use to generate a codebase overview or documentation tour."
---

# EF Readiness: once per repository, then whenever audits find rot

Runs once per target repo · before the first feature, and again whenever audits find rot · `/ef:ready`

Make the repo's rulebook small, true and checked. **True** means every path, command and rule it
states has been checked against the code. **Small** means it holds only what the code can't say.
**Checked** means a deterministic gate fails when either of those stops being so.

## The premise

The evidence on context files is unflattering. Across agents and models, `AGENTS.md`-style files
did not generally raise task success and raised cost by about 20%. Developer-written files beat
generated ones. Repository overviews didn't help agents find the right files, and instructions
*were* followed, so every line costs something
([Gloaguen et al. 2026](https://arxiv.org/abs/2602.11988)). Teams running agents at scale settled
on a short map pointing to deeper docs, with **mechanical checks that the docs are still true**
([OpenAI, Harness engineering](https://openai.com/index/harness-engineering)).

So this skill **never writes an overview** and never generates a rulebook in one pass. It writes
only what can't be derived, places each line at the cheapest level that works, and installs a
gate so the result can't quietly rot.

## The parts

| Part | Where | Role |
|---|---|---|
| The checker | `scripts/ef-check.mjs`, relative to this skill | Deterministic gates: anchors, commands, budget, routing, checks, single-source, bindings — and `feature`, over every `.ef/<feature>/` checklist |
| The format | `references/rulebook-format.md` | What the checker enforces, and the root skeleton. Load it before writing any rulebook |
| The levels | `references/levels.md` | Where each line belongs, and the day-one test. Load it in audit and grow |
| The interview | `references/interview.md` | The questions only a human can answer. Load it in bootstrap |

## Vendor the checker (every mode, first)

Copy `scripts/ef-check.mjs` from this skill to `.ef/bin/ef-check.mjs` in the repository,
**byte for byte**. If a copy exists, compare its `VERSION` with this skill's. If they differ,
replace it and say so. Never patch the vendored copy: every repo runs the same gates the harness
documents.

Vendoring is also the opt-in. The plugin's edit hook runs only in a repo that has the vendored
checker. From then on, every markdown edit the agent makes is checked against that copy, the same
one CI runs.

Then run `node .ef/bin/ef-check.mjs` and keep the output. Every mode starts from it.

## Modes

Three modes: **audit** (default), **bootstrap**, **grow**. An empty or very thin rulebook goes to
bootstrap. A rulebook that exists goes to audit.

### Audit: report, fix nothing

1. **The checker's findings are facts.** Report them as they are, grouped by gate. Don't re-derive
   what a gate already proved.
2. **Then the judgement the checker can't make.** Walk the root rulebook line by line, then each
   scoped one. Place each line with `references/levels.md` and give it one verdict:

   | Verdict | Meaning |
   |---|---|
   | `keep` | the right line at the right level |
   | `enforce` | a deterministic check could own it; name the lint, type or test |
   | `cut` | derivable from code, README or manifests |
   | `scope` | true but tied to a subtree; belongs in a scoped rulebook, with a routing line |
   | `skill` | a procedure |
   | `record` | history, rationale or a date; belongs in an ADR or the changelog |
   | `false` | contradicted by the code; give `path:line` |
   | `stale-gap` | `Check: none`, but a check now exists or is cheap; name it |

3. **Claims the checker can't parse**, such as "X is the only caller of Y" or "every handler does
   Z", are verified against the code and graded with the `ef-shared` skill's
   `references/evidence-grades.md`. A claim graded C or D is reported as a question, never as
   `false`.

Report: the checker summary, the verdict table (`file:line · verdict · reason · proposed home`),
the budget before and after the proposed moves, and the honest gaps ranked by how cheap their
check would be. **Edit nothing in this mode.** The owner approves; the changes are then applied as
in grow.

### Bootstrap: write the rulebook from what the code can't say

1. **Derive** everything the code answers: the task runner's commands, the CI workflows, generated
   code, test layout and existing scoped docs. **Run each gate candidate once.** A command that
   doesn't run doesn't go in. Never invent a command.
2. **Interview** with `references/interview.md`, one question at a time, under the `ef-grilling`
   skill's protocol. Don't ask what step 1 answered.
3. **Write** the root rulebook from the skeleton in `references/rulebook-format.md`: scoped
   rulebooks only where the interview found rules, a `CLAUDE.md` containing `@AGENTS.md` beside
   each `AGENTS.md`, and the `## ef-harness` block with `node .ef/bin/ef-check.mjs` among the gates.
   Where the repo keeps immutable records (ADRs, closed feature docs), add a `doc <dir>/  # <reason>`
   line to `.ef/anchors.allow`, but only for directories the user confirms are records. A live
   design doc that cites a moved path is a finding, not history.
4. **Gate**: run the checker until it passes. Each error is fixed in the rulebook, never in the
   checker.
5. **CI**: propose a step that runs `node .ef/bin/ef-check.mjs`. Add it with the user's go-ahead.
   It's the step that makes the rulebook a gate rather than a document.

### Grow: turn findings into rules

Input: a `## Rulebook proposals` section from a Stage 5 audit, or findings the user hands over.

For each proposal, in order of preference:

1. **Build the check** (level 0): the lint rule, type or structural test that would have caught it,
   with a failure message that names the fix. Then the rulebook needs at most a pointer.
2. **Add an invariant** with its `Check:` at the level `references/levels.md` gives it.
3. **Add an honest gap** (`Check: none — <reason>`) when no check is possible yet, and say what
   would make one possible.

Every proposal is also checked against what's already there: a new line that duplicates an
existing one is a merge, not an addition. Run the checker after each change. **The budget is a
limit, not a target.** Every line grow adds has to pay for itself, and growing past the warning is
the signal to move something down a level.

## Rules

- **Never invent a command.** Every command written down was run once, or already runs in CI.
- **Never write an overview.** A directory the agent can list is a directory it will list.
- **One rulebook per directory.** `CLAUDE.md` beside `AGENTS.md` holds `@AGENTS.md` and nothing that
  competes with it.
- **A rule without a check is a wish.** Write the check, or say honestly that there is none.
- **The checker's verdict is not negotiable in a rulebook edit.** Changing a limit goes through
  `rulebook-budget:` with a reason, in the diff where a reviewer sees it.

## Common failures

- **Generating the rulebook from the code.** That gives you the overview the evidence says doesn't
  help, written down where it costs tokens every session.
- **Keeping a rule at level 1 that a check already enforces**, so the agent pays for it twice.
- **A scoped rulebook with no routing line.** omp never loads it, and Claude Code loads it only
  once the agent is already in that directory.
- **A pointer `CLAUDE.md` that says "read AGENTS.md" in prose.** Both tools load only `CLAUDE.md`
  when both exist, so the real rulebook is left to the agent's discretion.
- **Allowlisting a path that moved.** The allowlist is for citations of things deleted on purpose.
- **Editing the vendored checker to get a pass.**
