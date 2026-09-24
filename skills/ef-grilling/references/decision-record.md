# The decision record

Load when recording the first closed decision. Every closed decision takes this shape, at both
altitudes.

```markdown
### Q<n> — <the question, in its most decidable form>

**Decision.** <one actionable line>

**Why.**
1. <reason, tied to a specific finding>
2. …
3. …

**Evidence.** <A | B | C | D> — <what the strongest supporting finding actually is, with its anchor>
**Dissent.** <the strongest case against, in one line — "none" only if genuinely uncontested>
**Riskiest assumption.** <the single thing that, if false, breaks this decision>
**Test.** <one cheap check that would validate that assumption>
**Would reopen if.** <the concrete event or finding that reverses this decision>
**Supersedes.** <what this reverses — a prior decision, a doc claim, an earlier answer. Omit if nothing>
```

Reasons are **ranked, maximum five**. If a sixth matters, it is a separate decision.

---

## Why each field is here

Nothing in this block is decoration. Each field is consumed by a later stage, and the stage that
consumes it cannot reconstruct the field on its own.

| Field | Consumed by | What breaks without it |
|---|---|---|
| **Decision** | every stage | — |
| **Why** | Stage 2's RFC decision body | the RFC restates the choice with invented rationale |
| **Evidence** | Stage 3 triage | every decision looks equally solid, so the weakest is attacked last |
| **Dissent** | Stage 2's rejected-options table | the RFC invents a losing option, or presents a fake comparison |
| **Riskiest assumption** | Stage 2's assumptions table | the table gets filled with restated decisions instead of real premises |
| **Test** | whoever wants to de-risk cheaply before building | the assumption stays unexamined until it fails |
| **Would reopen if** | Stage 3's anchor check, Stage 4's implementation | nobody knows which anchor failure reopens which decision |
| **Supersedes** | everyone reading two versions of the same thing | two live decisions, silently contradicting |

**"Would reopen if" is the field that makes the pipeline self-correcting.** When a Stage 3 anchor
comes back `FICTION`, the question is not "is this bad" but "does this match a reopen condition".
Without the field, every false claim triggers the same undifferentiated alarm and the real one gets
lost among them.

---

## Writing the fields well

**Dissent is preserved, not dismissed.** One honest line stating the best case for the road not
taken. *"Migration gives the larger long-term ceiling; tuning may only defer the problem a quarter."*
Not *"the alternative was worse"* — that is a verdict wearing a dissent's clothes. Where the choice
was genuinely forced rather than compared, write `none — forced by <constraint>` and name the
constraint.

**The riskiest assumption is one thing, not a list.** If two premises are equally load-bearing, the
decision is really two decisions; split it.

**The test must be cheap and concrete.** *"Run the query against production and count the rows"*, not
*"validate the assumption"*. If the only test is "build it and see", say that explicitly — it is a
meaningful and alarming answer.

**"Would reopen if" names an observable event.** *"Any production row already uses a wildcard"*, not
*"if the assumption turns out wrong"*. It should be checkable by someone who was not in the room.

---

## PIVOT

When the answer is that the question was mis-framed, the record keeps its number and says so:

```markdown
### Q<n> — <the original question>

**Decision.** PIVOT — this is the wrong question. <the reframe, in one line.>

**Why.** 1. <what makes the original framing invalid>
**Evidence.** <grade> — <anchor>
**Reframed as.** Q<m>
```

The reframed question is then asked and recorded normally. PIVOT is not an abstention: it commits to
a claim about the shape of the problem, and the reframed question must still be answered.

---

## Still open

A question nobody in the room can answer is recorded too, and separately:

```markdown
### Q<n> — <the question>  — STILL OPEN

**Blocked on.** <the specific information, and who or what would have it>
**Cost of leaving it open.** <what cannot proceed, or what risk it carries downstream>
**Provisional.** <what we will assume meanwhile, if anything — explicitly labelled as provisional>
```

A provisional assumption entered here becomes an assumption row in the RFC with its invalidation
trigger, never a decision. That distinction is what stops a guess from hardening into a requirement
three stages later.
