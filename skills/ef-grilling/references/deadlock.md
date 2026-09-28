# When the human will not decide

Load when the answer to a question is *"you decide"*, *"I don't know"*, *"what do you think?"*, or
silence on a question that genuinely matters.

This is the moment a grilling quietly fails. The lead picks their own prior, writes it down as a
decision, and three stages later a contract rests on something nobody actually chose.

---

## First: work out which kind of non-answer it is

| Kind | Signal | What to do |
|---|---|---|
| **Research in disguise** | The user does not know because nobody looked | Go and look. This was never a decision; it was a question you should have answered before asking. Answer it, state the evidence, move on |
| **Genuine indifference** | The user has no preference because the options are technically equivalent *to them* | You decide — see *deciding it yourself* below |
| **Deferral to expertise** | "You know the code better" | You decide, but the decision must be recorded as **yours**, with evidence, so it can be vetoed |
| **Unanswerable today** | It depends on information nobody in the room has | Record as **STILL OPEN** with what it is blocked on. Do not force it |
| **A design question** | "What should this screen look like?" — the user genuinely does not know until they see it | Not unanswerable and not yours to decide: **prototype it**. Load the `ef-prototype` skill. Check its gate first — a form or a table is built, not prototyped |
| **Avoidance** | The question is uncomfortable — cost, scope cut, someone's earlier work | Ask once more, smaller and more concrete. If it still bounces, record it as still open and name the blocker honestly |

**Getting this classification right matters more than the protocol below.** Four of the six kinds are
not deadlocks at all.

---

## Deciding it yourself

For genuine indifference and deferral to expertise:

1. **Decide.** Use the full record shape, with **Decisions you took yourself** as its section — not
   mixed in with the human's.
2. **Grade the evidence honestly.** If your own case is C, say C. A decision you made on thin
   evidence and labelled thin is recoverable; one labelled A is not.
3. **Preserve the dissent properly.** You argued both sides to yourself; write the losing one down.
4. **Make it easy to veto.** State it as *"I decided X because Y — say so if you disagree"*, not as a
   settled fact buried in a list.

That is sufficient for most bounced questions. Do not escalate further unless the next test passes.

---

## The panel, for one question

Escalate to a panel **only** when all four hold:

- the human has genuinely bounced it back, and it is not research in disguise
- the options are **technical**, not product intent — never convene a panel on what the product
  should do, who it is for, or what the business wants
- the decision is **consequential and hard to reverse**
- you can state the options concretely and the criteria that separate them

Otherwise decide it yourself and move on. A panel on a cheap, reversible choice is ceremony.

### Protocol

1. **Frame.** The question in its most decidable form, the concrete options, and 2–4 criteria that
   define a good answer for *this* question. Show the frame before spawning anything — a bad frame
   makes every downstream opinion worthless.

2. **Assemble three readers**, spawned in parallel, each with a **different lens** from
   the `ef-shared` skill's `references/lenses.md` and a different primary concern. One must argue **for** the leading option,
   one **against** it or for the best alternative, and one owns the criteria and resists premature
   agreement.

   Three is the size. Five only for a genuinely multi-dimensional decision, and never more — extra
   readers add correlated noise, not independence.

3. **Blind first pass.** No reader sees another's output before committing its own. This is the gate
   that matters: the final answer tends to stay inside the spread of the initial positions, so a
   narrow spread caps how good the outcome can be. Each returns: position (it must commit — "it
   depends" is not a position), 2–4 grounded arguments from its lens, an **evidence grade**, its
   assumptions, and a confidence.

4. **One deliberation pass, anonymised.** Strip identities, relabel the positions neutrally, send the
   set back. Each reader must steelman the strongest opposing position *before* rebutting it, state
   what would change its mind, then hold or revise. **A revision must cite the specific new argument
   that caused it.** Stop after this pass; more rounds amplify conformity rather than accuracy.

5. **Decide on the merits, not the count.** Weigh positions by evidence grade and by how well they
   survived the strongest challenge. If the revisions were uncited, or every revision moved toward
   whichever position was stated first, ignore the deliberation entirely and take the strongest
   **first-pass** position instead — that convergence was persuasion, not reasoning.

6. **Record it as yours.** The panel informed the decision; it did not make it. It goes in
   **Decisions you took yourself**, with the evidence grade capped by what the readers actually had:
   agreement among three readers of the same underlying model is weak proof, not strong.

---

## What a panel must never do

- **Decide product intent.** What to build, for whom, and why is exactly what the human is for.
  Simulated personas voting on that launders your own prior into something that looks like consensus.
- **Replace a question you could have researched.** Reading the code is cheaper and strictly better.
- **Produce a verdict on an unanswerable question.** If it is blocked on information nobody has, a
  panel cannot conjure it — it will produce a confident answer built on the same missing facts.
  Record it as still open.
- **Be cited as authority.** "The panel decided" is not a rationale. The rationale is the argument
  that survived.
