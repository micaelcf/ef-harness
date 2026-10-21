# Where a rule lives: the four levels

Every rule or fact about a repository costs context somewhere. The levels below are ordered by
that cost. The job is to put each one at the cheapest level that still gets it in front of the
agent **before** the agent can go wrong.

| Level | Loaded | Holds | Cost |
|---|---|---|---|
| **0 · Enforced** | never; it fires only when something is violated | lint rules, types, structural tests, CI gates, hooks. The failure message names the fix | nothing until violated, then only the relevant tokens |
| **1 · Day one** | every session: the root rulebook and its imports | purpose and the one principle; gate vs inner-loop commands; **routing triggers**; **silent traps**; settled decisions, one line each | every line, every session, for every task |
| **2 · Path-triggered** | when work touches a directory | scoped rulebooks | only while working there |
| **3 · Task-triggered** | when invoked or opened | skills (procedures), ADRs and design docs (the why) | only on demand |

## The day-one test

Progressive disclosure has one blind spot: **an agent never opens a document it doesn't know is
relevant.** So the question for level 1 isn't "is this important?" It's:

> Could the agent go wrong **before** it would think to look?

If yes, level 1 needs at least a *trigger*: a one-line pointer with a condition ("before editing
`<dir>/**`, read `<dir>/AGENTS.md`"). The content itself can live lower. Level 1 is mostly
triggers, not content.

## Placing one line

Ask in order. The first yes decides.

1. **Can a deterministic check enforce it?** Then it belongs at level 0. Keep the check, or propose
   building it. The check doesn't count as level 0 if its failure is **silent**, or doesn't say what
   to do. Either fix the message, or keep the rule at level 1 until it's fixed.
2. **Can the agent find it by reading the code, the README or the manifests?** Then cut it.
   Directory tours, framework explanations and "write clean code" make the agent read more without
   helping it get more tasks right.
3. **Does it apply to every task, or can it go wrong before the agent would look?** Then level 1.
4. **Is it tied to paths?** Then level 2, plus a routing trigger at level 1.
5. **Is it a procedure?** Then it's a skill. **Is it rationale, history or a date?** Then it's an ADR,
   the changelog or git history. A rule that narrates when it was fixed has started to rot.

## What level 1 always carries

- what the project is, in two sentences, and **the one principle** the rest serves
- **commands**: which one is the gate, and which ones are fast but must never be concluded from
- **invariants**: only those that apply across the tree, each with its `Check:`
- **routing**: every scoped rulebook, with the condition that opens it
- **silent traps**: rules whose violation compiles, passes and fails later, or fails somewhere else
- **settled decisions**: one line and an ADR id each, so a redesign the team already rejected
  isn't proposed again
- **looks dead, isn't**: code with no production caller yet that must not be deleted
- the **`ef-harness` bindings block**

## What never belongs at level 1

- an overview of directories the agent can list itself
- a rule that a check already enforces with a clear message
- a rule for one subtree (move it to level 2)
- a procedure longer than a few lines (a skill)
- history, dates and "this used to be" (an ADR, or the commit)
- a second copy of anything; point to the original

## Moving a rule down a level

Moving a rule from level 1 to level 0 is the best trade the rulebook offers: one check removes a
line from every future session and replaces a request with a guarantee. When an audit or review
catches the same mistake twice, the second time is the signal to build the check.
