---
name: ef-prototype
description: "Discover a brand-new UI before implementing it: generate 4-5 radically different variants of one screen in a single shareable HTML file, switchable from a floating bar, then pick one and let it govern the requirements and the contract. Use when a feature introduces a screen, page or component that is not a variation of anything the repo already has. Do NOT use for forms, tables, list-detail, settings panes, modals or any well-known pattern, and do NOT use to prototype logic or state models."
---

# Prototype — a new UI, before it is built

The rest of this harness runs on one rule: **never ask what code can answer.** Visual design is the
single class where code cannot answer. There is no file to read that tells you what a screen nobody
has built should look like.

That is the whole reason this skill exists, and the reason it is narrow.

## The gate

> **Can you name an existing screen, component or well-known pattern this is a variation of?**
>
> **Yes** → build it. No prototype.
> **No** → prototype.

A form, a table, a list-detail, a settings pane, a modal, a wizard: **always yes**, even in a repo
that happens not to have one yet. The pattern is known, and it gets built correctly from a
description. Prototyping one burns a day to rediscover a form.

Prototype when the screen is genuinely new: a surface with no precedent here, where reasonable people
would draw it differently and nobody can settle it by talking.

Refuse out loud when the gate says no. *"This is a table with filters — I will build it directly"* is
a complete answer, and saves more time than the prototype would.

## Order matters: this runs before the contract

Whatever the API already returns will shape the screen if the screen is designed second. Running the
prototype first inverts that: the chosen variant fixes the information hierarchy, which fixes what
the screen must show, which fixes what the API must return in one call.

So this runs inside Stage 1, before `/ef:feature-docs` writes requirements and before Stage 3 freezes
a contract.

## The artifact

**One HTML file.** No build step, no dev server, no dependencies, no framework. It opens by
double-clicking, and anyone can open it — a backend developer, a product manager, a stakeholder who
will never clone the repository. That portability is the point: a prototype only the frontend can run
gets reviewed by one person.

Write it to `docs/features/<feature>/prototypes/<screen>.html`.

Requirements:

- every variant in the same file, switchable from a **floating bottom bar**, plus arrow keys
- the variant name and its one-line bet visible while that variant is shown
- realistic inline fake data — real-looking names, real-looking volumes, the empty state, the long
  string that wraps, the error state
- self-contained CSS, no CDN, no network
- a header comment: `PROTOTYPE — throwaway. Feature <name>. Not production code.`

## The variants

**Four or five minimum.** They must differ on a **named axis**, not on styling:

- what is primary — what the eye hits first, and what is demoted
- what is hidden behind progressive disclosure versus shown at once
- the navigation model — tabs, drill-down, single scroll, split pane
- density — overview of many versus detail of one
- the entry point — what the user arrives to do

Five layouts with different padding is one variant with a rendering bug.

Each variant states, in one line each: **the bet** it makes · what it **optimises for** · what it
**sacrifices**.

**One variant must be the conventional, boring one.** It is the baseline the others have to beat, and
it frequently wins. Without it you are choosing among experiments with nothing to measure against —
the same reason "do nothing" is a mandatory option in an RFC.

## What it proves and what it does not

It proves layout, flow, information hierarchy, and whether the screen makes sense to someone who did
not design it.

It does **not** prove that the data exists, that the API can serve it in one request, or that the
design system can express it. A variant everyone loves that needs three round-trips sold a lie.

So every data need the chosen variant implies is written down as a **graded assumption**, and Stage
3's anchor check verifies it like any other claim about code.

## Capture

The prototype is a decision input and a primary source. When the user picks:

1. **Record the decision** in the grill-decisions record shape: which variant, why, and **what was
   stolen from the losers** — that is usually where half the value is.
2. **Write the screen's information needs as requirements**, which Stage 2 carries into the PRD. In a
   multi-repo feature, the data the screen needs becomes a change request against the producing repo.
3. **Write the data assumptions**, graded, each with what would invalidate it.
4. **Keep the file.** Link it from the feature's `INDEX.md`. It explains why the screen looks like
   that long after the decision is forgotten, and it is the only artifact that shows the roads not
   taken.

Do not fold prototype code into production. It is throwaway; the implementation is Stage 4's, built
from the requirements the prototype produced.

## Rules

1. **Throwaway from day one, and named as such.** Nobody should have to ask whether this is
   production code.
2. **Trivial to open.** Double-click. If it needs a command, it is the wrong artifact.
3. **No persistence, no network, no backend.** In-memory only.
4. **Skip the polish.** No tests, no error handling, no abstractions, no build tooling.
5. **Never prototype logic or state models here.** Those are answerable in code — grill them, then
   prove them with Stage 4 checks.
