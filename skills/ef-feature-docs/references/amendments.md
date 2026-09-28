# Amending a live feature doc

The RFC and PRD are **evolving workspaces**, not Stage 2 deliverables.

Implementation discovers that the design was wrong about the code. Discovery finds that a cited
symbol never existed. Verification finds that a promised requirement did not ship. Every one of those
belongs in the document the next repository will read — not in a commit message, not in a chat, and
not in a separate status file that goes stale in a week.

This is what makes a multi-repo feature possible: the second repo reads the first repo's corrections
before it starts.

---

## Who amends, and when

| Stage | Trigger tag | Typical content |
|---|---|---|
| 3 | `(YYYY-MM-DD, discovery)` | an anchor came back `FICTION`/`CHANGED` and a decision reopens |
| 4 | `(YYYY-MM-DD, implementation)` | the shipped shape differs from the design; a pre-existing defect surfaced in the blast radius |
| 5 | `(YYYY-MM-DD, verification)` | a requirement did not ship and is now an accepted gap; a claimed fix was not real |
| — | `(YYYY-MM-DD, product decision)` | the user changed their mind; scope moved |

---

## Rules

1. **Amend in place, next to what it changes** — under the decision anchor, the requirement row or
   the assumption it affects. An amendment appended at the end of the document is a changelog nobody
   reads in the context where it matters.

2. **Strike, never delete.**

   ```markdown
   ~~The scheduler job already exists and can be reused.~~
   **Amendment (2026-08-05, implementation) — FALSE: no such job exists anywhere in this repo.**
   ```

   A reader arriving with the old claim in their head must find it *and* find its correction, in the
   same place. Deleting it means they conclude they misremembered and go looking again.

3. **Name what it supersedes**, by anchor: which `D#`, which `RF-###`, which assumption row. An
   amendment that does not say what it replaces creates two live versions of the same decision.

4. **State what is now normative** in one line, so a builder can act on it without reading the whole
   history of the disagreement.

5. **An assumption is invalidated by its own trigger.** Every assumption row names the event that
   breaks it. When that event happens, mark the row and say which decisions rested on it.

6. **Close open questions in place**, with the evidence that closed them. A question deleted when
   answered looks like a question nobody asked.

7. **The header carries per-repo delivery status.** One dated line per target repo. This is the only
   cross-repo status home in the harness — handoff documents are per repo and structurally cannot
   answer "what is outstanding where".

8. **Pre-existing defects found in the blast radius get their own table**, separate from the
   feature's own work:

   ```markdown
   | Defect | Evidence | Impact | Status |
   |---|---|---|---|
   ```

   These are the highest-value bycatch of an implementation pass and the easiest thing to lose.

---

## What is NOT an amendment

A reversible implementation choice — naming, error shape, where a helper went, which package a type
lives in. Those live in the diff and in `.ef/<feature>/checks.md`'s `Landing` section.

Amending the RFC for them regenerates exactly the stale design document that deferring to the code
was meant to avoid. The test: **would a sibling repo's builder make a worse decision without knowing
this?** If not, it is not an amendment.

---

## The bound that keeps the RFC an RFC

Amendments record **what changed about a decision**. They do not become the design.

A feature with thirty amendments is normal and healthy. A feature whose RFC has turned into an
implementation manual has lost the distinction the harness depends on: the RFC is why, the contract
is what to build, the handoff doc is what shipped. When an amendment starts explaining how to
implement something, it belongs in the contract instead.

---

## Enforcement

There is none, deliberately. Nothing fails if a stage skips its amendment, and the Stage 5 audit
stays about code rather than doc prose.

That makes this a discipline rather than a gate, and the moment you least want to write an amendment
— just after a long build, with the tests green — is exactly the moment its content is most valuable
to the next repository. Write it then.
