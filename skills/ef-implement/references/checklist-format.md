# Checklist format

Load this only when writing `.ef/<feature>/` — after the contract is read, the refuse gate is passed
and the sweep is walked. Do not load it during the first pass of Extract.

Replace every placeholder with a concrete value, or omit the section. A heading with "N/A" under it
does not appear.

---

## Two layouts, decided by the scale

| Scale | Layout | Why |
|---|---|---|
| `single` | one file, `.ef/<feature>/checks.md` | one builder reads all of it anyway; a second file is a second read |
| `standard`, `multi` | **split**: an index, the contract by topic, one file per slice | each builder reads only what it codes against |

The split is **by reader, not by phase.** What each one loads:

| Reader | Loads |
|---|---|
| a builder | `checks.md` + the contract files its slice names under `Reads:` + its own slice file |
| the lead | `checks.md`, then whatever the moment needs |
| resuming after a boundary | `checks.md` + the tail of `log.md` + the diff of what landed |
| the Stage 5 auditor | everything except `log.md`, one slice file at a time |

Measured on a real 60-check, 10-slice feature, a builder went from 15k tokens to about 4k. Splitting
the checks alone would have saved far less, because the contract and the ownership table were the
largest sections. A one-file checklist makes every builder pay for every other slice.

Waves are a schedule, not a layout. They change while you build. They live in the slice table's
`Wave` column, never in file names.

---

## Split layout

```text
.ef/<feature>/
  checks.md           the index
  contract/<topic>.md the Stage 3 contract, one file per topic
  slices/S<n>-<slug>.md   one per slice: what it owns, what it reads, its checks
  verification.md     Swept + Coverage, whole
  log.md              Stage 3 record, handoffs, Landed, Stage 5 rounds: append-only
```

### `checks.md`, the index

```markdown
# <Feature> — <repo>

Sources:

- <requirement doc, ticket, or "conversation"> — <what it settles>
- <design or interface spec> — **binding for the interface**

Feature base: `<sha>`.

## Requirements

- `RF-001` — <one line>        ← every id this repo owns; each must be cited by a check

## Contract

| File | Holds |
| --- | --- |
| [contract/bindings.md](contract/bindings.md) | gate commands, identifier rule, test conventions |
| [contract/signatures.md](contract/signatures.md) | cross-slice declarations, verbatim |

## Out of scope

- <excluded capability> — <why>

## Ownership

Per-slice ownership is each slice file's `Owns:` line. Shared files and their integration owner:

| File | Integration owner |
| --- | --- |
| `<path>` | lead — serialised |

## Landing

<Two or three lines: which modules this touches and what it reuses instead of duplicating.>

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |

## Slices

| Slice | Outcome | Wave | Status | File | Checks |
| --- | --- | --- | --- | --- | --- |
| S0 | <one observable outcome> | 0 | done | [slices/S0-schema.md](slices/S0-schema.md) | C1–C8 |
```

The index never defines a check, and stays short. It's the one file every reader loads.

### `contract/<topic>.md`

One file per topic, for example `bindings`, `signatures`, `boundaries`, `naming`, `enums`,
`schema`. The split follows **who consumes it**. A section only the producing slice needs, such as
the schema it writes into code verbatim, is its own file so no other slice pays for it. A section
every slice needs, such as bindings, transaction and error boundaries, or naming, is read by all of
them. Once the producing slice lands, later slices read the code, not the contract.

Each file opens with `# <Topic>` and holds the declarations verbatim. No file over 200 lines. A
bigger one is two topics.

### `slices/S<n>-<slug>.md`

```markdown
# S1 — <one observable outcome> · 4 files · 38 KB · ~10k

Owns: `<path>`, `<path>/**`
Reads: contract/bindings.md, contract/signatures.md

**C9** · RF-004 — <one observable claim, with a concrete value>
Proof: `<the specific test invocation>`

**C10** · RF-004 — <one observable claim>
Proof: `<the specific test invocation>`
```

- `Owns:` is the files this slice alone writes, as code spans. No path appears in two slices.
- `Reads:` is every contract file this slice codes against, relative to the feature directory.
  Its builder loads these and nothing else from `contract/`.
- The heading carries the slice's **weight**: `wc -c` of the files it touches, divided by four.
- No slice file over 150 lines. A slice that size was cut too coarsely. Re-cut it in the contract.

### `verification.md`

`## Swept` and `## Coverage`, exactly as below. **Never split these per slice.** Coverage is a
join across every check. Split, a member that no slice covers has no row to stand empty in, which
is the failure Coverage exists to expose.

### `log.md`

Append-only: the Stage 3 record (anchor table, decisions taken in discovery), every handoff, Landed
notes, each Stage 5 round. The build never reads it, so history stops costing every builder tokens.

---

## Single-file layout

Used at `single` scale. The same sections in one file, in this order:

```markdown
# <Feature> — <repo>

Sources:
- …

## Requirements
## Contract          <the Stage 3 output, verbatim>
## Out of scope
## Ownership         | Slice | Files this slice alone writes | Owner |
## Landing
## Checks            ### S1 — <outcome> · <weight>, then the check lines
## Swept
## Coverage
## Log               <handoffs, Landed, Stage 5 rounds>
```

A single feature that grows past three slices, or past roughly 300 lines, should move to the split
layout. Run `node .ef/bin/ef-check.mjs --split .ef/<feature>`.

---

## The check line

```text
**C17** · RF-012 — <one observable claim, with a concrete value>
Proof: `<the specific test invocation>`
```

One line per claim, ids numbered straight through the whole feature, the requirement ids it proves
on the same line. That line is the search index: `grep C17` or `grep RF-012` finds one line without
loading a file. A check that proves no requirement says so in the claim.

---

## Sources

A list, because what feeds this is a list. Carry every source the upstream artifacts name, each with
what it settles, and mark any interface spec as **binding**. What does not cross into this file stops
existing for whoever builds.

## Requirements

The requirement identifiers this repo owns, from the PRD, as a list. The gate fails an owned id that
no check cites, and a check that cites an id with the same prefix that is not on the list. That
catches a typo and a requirement another repo owns alike.

## Contract

The Stage 3 output, verbatim. It lives in files rather than in a conversation because parallel
slices receive files, not context. A contract that is retyped per batch degrades into a paraphrase,
and the paraphrase is where slices diverge.

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

A check is **one** observable claim. If you need "and", split it. The proof names a **specific test**,
never a whole suite. Repeat `Proof:` when one test cannot settle the claim, and every proof listed
must be green.

Read the code before choosing the proof, then check the claim against the input space behind it. A
claim about nine cases is not proven by a proof exercising two.

The proof must be able to **reach the claim's subject**. A claim phrased as a response at a boundary
is not settled by a test that never crosses it; a claim about a decision table is not settled by one
path through it. When the claim and the proof sit at different levels, either split the claim or name
the second proof — never let the level slide to whichever is cheaper to write.

## Swept

```markdown
- identifier exposure: C4
- authorization: existing guard already covers this surface — `<path:line>`
- concurrency: not in scope — single writer
```

One line per sweep item, each bound to a check id, an anchor, or a reason.

## Coverage

```markdown
| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| provider status -> local (9) | C2, table-driven over all 9 | - |
| event types (5) | `a` C12 · `b` C13 · `c` C14 · `d` C15 · other C16 | - |
```

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

## The gate

Where the repository vendors the checker (`/ef:ready`), `node .ef/bin/ef-check.mjs` holds every
`.ef/<feature>/` to this format. It reads `.ef/` from disk, so it works even when `.ef/` is
gitignored. It is an error when:

- a check id is defined twice, or a check has no `Proof:` line
- a check id cited in the index, a slice or `verification.md` is defined nowhere (`C2–C4` ranges
  are expanded)
- an owned requirement id is cited by no check, or a check cites an unlisted id with an owned prefix
- *(split)* a slice file is not named in the index, or the index names one that does not exist
- *(split)* a slice has no `Owns:` or no `Reads:`, a `Reads:` target does not exist, or a contract
  file is read by no slice
- *(split)* one path is owned by two slices, a slice file passes 150 lines, a contract file passes
  200, or the index defines a check

A missing `## Requirements` section is a warning. The edit hook runs the same gate after each write,
so a broken cross-reference comes back in the turn that made it.

### Migrating a single-file checklist

`node .ef/bin/ef-check.mjs --split .ef/<feature>` rewrites it into the split layout. Nothing is
written until every non-blank line of the original is found in the output, and the original is
kept as `checks.md.orig`. The split is deterministic:

- `## Contract` subsections become `contract/<topic>.md`
- `### S<n>` check groups become slice files, each carrying its ownership row as `Owns:`
- Swept and Coverage become `verification.md`, and history becomes `log.md`
- the index gains a slice table and a contract table

A contract heading naming slices in parentheses, such as `Schema (S0)`, goes to those slices'
`Reads:`. Every other contract file goes to every slice. Review the `Reads:` lines, add
`## Requirements` if it is missing, then run the gate.

---

## Ordering is what makes it reviewable

The checklist is complete **before** you touch code, so it reads as what you were building toward
rather than a rationalisation of what you built. Where the project tracks `.ef/`, that ordering is
worth a commit of its own before any implementation commit; where it does not, the ordering still
holds and nothing about it depends on version control.

## Stop only for what the user alone can settle

A `Landing` door with a live alternative — a forced choice needs no permission, a chosen one does.
Scope the sweep raised that would grow the work. Anything the refuse gate caught that asking did not
resolve. Otherwise write the checklist and keep going into Build: waiting for approval buys nothing
when the contract already decided the shape.
