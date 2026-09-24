# Checklist format

Load this only when writing `.checks/<feature>.md` — after the contract is read, the refuse gate is
passed and the sweep is walked. Do not load it during the first pass of Extract.

Replace every placeholder with a concrete value, or omit the section. A heading with "N/A" under it
does not appear.

---

## Template

```markdown
# <Feature> — <repo>

Sources:

- <requirement doc, ticket, or "conversation"> — <what it settles>
- <design or interface spec> — **binding for the interface**

## Contract

<Written at the end of Stage 3, by the lead, before any slice starts.>

- **Interfaces and data shapes** — the declarations slices code against, verbatim
- **Transaction and error boundaries** — what is atomic with what, what surfaces which error
- **Naming** — the names that must agree across slices
- **Bindings** — gate commands, identifier rule, generated-code rule, test conventions
- **Requirement identifiers** owned by this repo

## Out of scope

- <excluded capability> — <why>

## Ownership

| Slice | Files this slice alone writes | Owner |
|---|---|---|
| S1 | `<paths>` | agent A |
| S2 | `<paths>` | agent B |
| shared | `<path>` | integration owner — serialised |

## Landing

<Two or three lines: which modules this touches and what it reuses instead of duplicating.>

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| `<thing>` gains `<state>` | <the exact shape the next person copies> | <option, named with the property that disqualified it> |

- Nothing else in this change is hard to reverse

## Checks

### S1 — <one observable outcome> · 4 files · 38 KB · ~10k

**C1** — <one observable claim, with a concrete value>
Proof: `<the specific test invocation>`

**C2** — <one observable claim>
Proof: `<the specific test invocation>`

### S2 — <one observable outcome> · 9 files · 140 KB · ~35k

**C3** — …
Proof: …

## Swept

- identifier exposure: C4
- input validation: C1
- authorization: existing guard already covers this surface — `<path:line>`
- transaction boundary: C7
- idempotency: C3
- concurrency: not in scope — single writer
- failure modes: C6
- dependency failure: C6
- data lifecycle: not in scope — nothing retained
- state transitions: C1, C2
- generated code: C9 — regenerated, tree clean
- audit and observability: C8
- public interface docs: C10

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| provider status -> local (9) | C2, table-driven over all 9 | - |
| event types (5) | `a` C12 · `b` C13 · `c` C14 · `d` C15 · other C16 | - |
| `limit` bound (4 edges) | 0, 1, 30, 31 all in C5 | - |
| startup config: raw body (2 assemblies) | app entry point C17 · test harness C3 | - |

- Claims naming a status code, route or response shape: C7, C12, C16 — each has a proof that
  crosses the boundary
- No other check claims more than the single case its proof exercises
```

---

## Sources

A list, because what feeds this is a list. Carry every source the upstream artifacts name, each with
what it settles, and mark any interface spec as **binding**. What does not cross into this file stops
existing for whoever builds.

## Contract

The Stage 3 output, verbatim. It lives here rather than in a conversation because parallel slices
receive files, not context. A contract that is retyped per batch degrades into a paraphrase, and the
paraphrase is where slices diverge.

## Ownership

Slice by **ownership**, not by requirement count: one agent per set of files no other agent writes.
Where a file is irreducibly shared, name a single integration owner and serialise only that boundary.

An unowned file is a merge conflict with a schedule.

## Landing

One-way doors only. A door is one-way when reversing it costs more than a refactor: a persisted
schema, a contract someone else consumes, a new dependency, a data backfill — and **a pattern the
codebase does not have yet**, because precedent stops being reversible once the next features copy it.

Each row shows the **literal shape** the next person will copy and the alternative rejected, named
with the property that disqualified it. *"Cleaner"* cannot be argued with; *"cannot express the next
state"* can. Where the choice was forced rather than compared, name the constraint that forced it.

Decomposition inside a convention that already exists is **not** a door. Writing it down produces the
stale design document this section exists to avoid.

`None — <why nothing here is one-way>` is a complete answer, and the closing line is what makes the
omission contestable.

## Checks

**Grouped under the slices they came from.** Flattening them into `C1..Cn` loses a structure the
contract had and that ownership refers to by name. Keep the slice, keep its name, number the checks
straight through.

Each slice heading carries its **weight**: `wc -c` of the files that slice touches, divided by four.
That is a floor — it counts what you will read, not the iteration on top — and a floor ranks slices
correctly even when it under-counts.

A check is **one** observable claim. If you need "and", split it. The proof names a **specific test**,
never a whole suite. Repeat `Proof:` when one test cannot settle the claim, and every proof listed
must be green.

Read the code before choosing the proof, then check the claim against the input space behind it. A
claim about nine cases is not proven by a proof exercising two.

The proof must be able to **reach the claim's subject**. A claim phrased as a response at a boundary
is not settled by a test that never crosses it; a claim about a decision table is not settled by one
path through it. When the claim and the proof sit at different levels, either split the claim or name
the second proof — never let the level slide to whichever is cheaper to write.

## Coverage

A **join, not a summary**. Every set a proof must cover gets a row, and every member is written as
its own token beside the check that proves it.

A set collapsed into a sentence — *"dispatches over a, b, c and d"* — has no empty cell, so a member
can go missing while the sentence still reads perfectly. That is how a branch named in your own
evidence ships unproven.

Walk it **from the sets, not from the checks.** Summarising the checks you just wrote can only find a
check with nothing behind it; it cannot find a name with no check, which is the failure that costs.

State gaps as **members**, never as an absence. A member sitting in `Unproven` is contestable by
anyone reading; *"nothing is missing"* can only be checked by redoing the whole allocation, so nobody
does. Never assert a negative here — write the count and its denominator.

The rows are not a new inventory. They are the enumerations this artifact already named somewhere: a
door in `Landing`, an input space behind a claim, a set in the contract. Anything enumerated in prose
owes a row, and only one of the two places can hide a member.

**Startup configuration is a set too, and its members are places.** Anything that must be true before
the first request arrives lives in every assembly separately, and a proof can only assert the one it
built. Each assembly is a member. Prefer one shared assembly over a proof per place — that deletes
the seam instead of testing it twice.

One table-driven proof may stand for a whole set, with the size stated, because there the enumeration
lives in the test.

---

## Ordering is what makes it reviewable

The checklist is complete **before** you touch code, so it reads as what you were building toward
rather than a rationalisation of what you built. Where the project tracks `.checks/`, that ordering is
worth a commit of its own before any implementation commit; where it does not, the ordering still
holds and nothing about it depends on version control.

## Stop only for what the user alone can settle

A `Landing` door with a live alternative — a forced choice needs no permission, a chosen one does.
Scope the sweep raised that would grow the work. Anything the refuse gate caught that asking did not
resolve. Otherwise write the checklist and keep going into Build: waiting for approval buys nothing
when the contract already decided the shape.
