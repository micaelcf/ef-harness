# The handoff document

Load this in `contract` mode, once `verify` is clean. This is the artifact another repository builds
against.

---

## It is written from the code, not from the design docs

The RFC and PRD are what someone intended at product altitude, before this repository's discovery
reopened anything. This document is **what shipped**. Where they disagree, the code wins and the
document says so.

A consumer who follows the spec instead of this document will build the wrong thing and blame the
producer.

---

## Required content, in this order

### 1. Divergences from the spec — first, as a table

| Spec says | Reality | Build against |
|---|---|---|

Every place the implementation contradicts the design documents. This goes **before** the reference
material because it is the only section a consumer cannot afford to skim.

### 2. Traps

The destructive defaults, serialization shapes, ambiguous signals and non-obvious required fields
found during the audit — defect classes 2 through 5.

These cost a consumer a day each. They belong before the reference material, not in a footnote:

- fields that look optional and are effectively required
- omitted-field semantics on every write path — *leave it* or *clear it*
- nil versus empty, absent versus null, sometimes-present fields
- any signal that means two things, and how to disambiguate it

### 3. Every surface

Method, exact path, authentication and permission gates, for each endpoint or entry point. Exact, not
approximate: the route group and the parameter form are where handoff documents are most often wrong.

### 4. Every request and response shape

Field by field, **from the actual serialization tags** — not from the struct, not from the DTO's
documentation comment. State for each field:

- required, optional, or effectively-required-despite-looking-optional
- absent versus null versus zero value
- the concrete type as it appears on the wire

### 5. The error contract

The distinct error layers, which produce machine-readable keys and which do not, the status code for
each case, and the **literal message shapes** a consumer must parse.

A consumer branching on error text needs the text, exactly.

### 6. Business rules a consumer must implement or respect

Including precedence and ordering rules. Anything the producer enforces that the consumer must mirror
in its own interface, and anything the consumer must not do because the producer assumes it will not.

### 7. What is NOT implemented

Anything the spec promises that did not ship, named as an **accepted gap** rather than left to be
discovered. This is the section that saves a consumer from building against a requirement id that has
no code behind it.

### 8. What is the consumer's responsibility alone

With the copy or behaviour requirements attached. A guarantee the producer cannot enforce is the
consumer's, and saying so is the difference between a gap and a bug.

### 9. Realistic examples

Request and response examples with the **traps visible in them** — the omitted field, the empty
collection, the error shape. An example that only shows the happy path teaches the wrong lesson.

---

## Fact-check it before handing it over

**A handoff document is code a consumer executes by hand.**

Audit it in a separate pass, against the code, with the same adversarial stance: every field name,
every status code, every literal string, every claim. Use a fresh `reviewer` subagent — the draft's
author has the same blind spots as the implementation's author.

Expect defects in your own first draft, including blocking ones, and loop until it is clean.

---

## Naming and linking

Name it for its consumer, in the feature docs folder:

- `API_HANDOFF*.md` — for a repository consuming this API
- `FRONTEND_HANDOFF*.md` — for the interface layer
- `API_CHANGE_REQUEST_*.md` — when the shipped code makes a demand of **another** repository rather
  than describing itself

Then link it from the feature folder's `INDEX.md` as the starting point for downstream work, marked
as **superseding the design docs wherever they disagree**.
