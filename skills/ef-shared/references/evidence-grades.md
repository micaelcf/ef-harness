# Evidence grades

One scale, used by every stage. Load it wherever a claim's strength decides what happens next.

| Grade | Meaning |
|---|---|
| **A** | Direct data, a proof, a reproducible result, a first-hand measurement, or code read at `path:line` |
| **B** | Solid reasoning from established facts, or indirect but reliable data |
| **C** | Plausible but thin — a single source, a small sample, an untested inference |
| **D** | Anecdote, vibe, or an unverified assumption stated as fact |

Grade the **evidence behind the claim**, not the claim's importance and not how confident it sounds.

---

## The rules that make it worth writing down

1. **A decision resting on C or D evidence cannot be recorded as high confidence**, however obvious
   it seems and however firmly it was asserted.
2. **A load-bearing D is a stop.** Either test it cheaply, ask the person who knows, or record it as
   an assumption with an invalidation trigger. Building on an ungraded D is how a whole feature
   inherits one person's guess.
3. **Grade before you decide, not after.** A grade assigned to justify a decision already made is
   decoration.
4. **"Not verified" is a grade, not an omission.** Say `D — asserted in the doc, not checked` rather
   than leaving the field empty; an empty field reads as A to the next reader.

---

## Where each stage uses it

| Stage | What gets graded | What the grade changes |
|---|---|---|
| 1 — grilling | the finding that grounds each question, and the evidence behind each closed decision | a D-grade premise becomes a question about the premise, not about the choice |
| 2 — feature docs | every assumption row in the RFC | a C or D assumption must carry an invalidation trigger |
| 3 — discovery | every scout claim before it becomes load-bearing | only A claims enter the contract unverified; B and below get re-read first |
| 4 — implement | sweep answers that resolve to "already covered" | a C means read the constraint and confirm it is actually there |
| 5 — audit | every finding, and the checklist's own `Coverage` members | a finding graded C or D is reported as a question, not as a blocker |

---

## Relationship to the anchor verdicts

Stage 3's anchor check answers **does this exist** — `VERIFIED` · `MOVED` · `CHANGED` · `FICTION` ·
`N/A`. Evidence grades answer **how strongly do we know this**.

They are orthogonal and both are needed: a `VERIFIED` anchor can still support a C-grade inference,
and a `FICTION` verdict is itself A-grade evidence that a claim is false.
