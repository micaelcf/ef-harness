---
name: ef-to-jira
description: "Turn any feature description into a small, product-level Jira issue set: settle project and language, size by semantic change, write a draft, and push through the host's own Jira tools only after explicit approval. Standalone and optional: no EF docs required, outside the five stages. Use when the user asks to create Jira issues, tickets or tasks for a feature, to align a feature to Jira, or to break a feature into Jira tasks. Do NOT use to write an RFC or PRD, to plan implementation, or to edit issues that already exist."
---

# To Jira — a feature, as an issue set

Takes a feature in any form — one sentence, a pasted spec, a doc — and produces a **small,
product-level set of Jira issues**. It needs no EF documents and runs outside the five stages: the
spec does not have to be settled for the team to need its issues.

**Draft first, always.** Nothing reaches Jira until the user approves the draft.

## Before drafting: four answers

Settle these first, and ask only for the ones the prompt has not already answered — all of them in
one `ask` call, since they are independent settings.

1. **Project.** An explicit key from the prompt. Otherwise ask, offering the projects the host's
   project search returns. Never infer it from the repository, the branch or an earlier session —
   a set pushed to the wrong board is expensive to undo. No answer, no draft.
2. **Language.** The prompt, else the `jira-language:` key of the repo's `ef-harness` block, else ask
   (en · pt-BR · es · other). Never default silently. The whole set is written in that one language;
   issue type and field names stay as the project defines them.
3. **Team patterns — opt-in.** *"Follow this project's Jira conventions (title format, labels,
   fields)?"*
4. **Custom fields — opt-in.** *"Fill fields like QA, tester, code reviewer or product owner?"*

Then read the feature. Ask about the feature itself only what the text cannot answer — who it is
for, what problem it removes, which rule decides an edge case.

## The Jira tools

The harness ships no Jira client. This skill uses the **host's own Jira tools** — an Atlassian MCP
server or equivalent — under the host's permission model. Map them by capability, not by name:
project search, a project's issue types, issue search, field search or create metadata, user
search, issue creation, attachment upload.

**No issue-creation tool → draft-only.** Write the draft, say Jira tools are not available here,
and stop. Never fall back to `curl` or the REST API, and never ask for a token.

## Measure, then size

1. **List every behaviour the feature changes** before drafting a single issue. The size of the
   whole sets the size of the parts.
2. **One task per semantic change** — a change a product owner would accept on its own. Related
   changes go in one task even when it is big. One semantic change is never split across issues.
3. **Subtasks only for parts that are delivered or reviewed separately.** There is no cap; every
   split carries one line in the draft saying why (`Split: …`).
4. **Tasks and subtasks by default.** Read the project's issue types first and use its own names for
   a standard type and a subtask type (`Task` / `Sub-task`, `Tarefa` / `Subtarefa`, …). When the
   prompt asks for another shape — Epic and Stories, flat tasks — use it only if the project has
   those types. Whenever a shape's types are missing, say so and ask for one the project supports.

Fewer, coherent issues beat many thin ones: a set nobody can review in one sitting has failed.

## Product only

An issue says **what the product does**, never how it is built.

| Keep | Strip |
|---|---|
| user stories, acceptance criteria, business rules, limits, regulatory constraints, flows | file paths, endpoints, HTTP verbs, tables, columns, SQL, class and function names, frameworks, internal service names |

Restate stripped detail as observable behaviour: *`POST /api/orders` returns 201* becomes *"Placing
an order confirms it immediately."* When the input is implementation-only and the intent cannot be
restated without guessing, ask before drafting.

## Little text

Every issue has the same shape, and nothing else:

```markdown
**<summary>**                       team format when discovered, else "<verb> <outcome>"
As <who>, I want <what>, so that <why>.
Acceptance criteria                 checkable bullets; Given/When/Then where it helps
Business rules                      bullets; omit the heading when there are none
Flow                                the attached diagram, only when the flow needs one
```

No background section, no restated title, no implementation notes.

## Flows as PNG

A flow gets a diagram when it branches, involves more than one actor, or runs past about four steps.
Write it in mermaid, then render it **locally**: `mmdc` on the PATH, else a copy the repository
already installed (`node_modules/.bin/mmdc`). Never install one. Write the image to
`.ef/<feature>/jira/<item>-<name>.png` and attach it to its issue.

No local renderer, or no attachment tool → put the mermaid block in the description and list the
gap. **Never use a remote renderer** (mermaid.ink, kroki, …): it sends the feature off the machine.

## Team patterns — only when opted in

Search the project's ten most recent issues (`project = <KEY> ORDER BY created DESC`) and infer the
title format, the label vocabulary, the components and the fields the team actually sets. Show it in
the draft as **Inferred style**, citing the sampled keys, so the user can check the inference.

Use only labels and components seen in the sample or named by the user — never invent one. A sample
too small or too inconsistent to read a convention from is a finding: say so and use the plain
format. Not opted in → no search, plain format, no labels.

## Custom fields — only when opted in

**Fields are discovered; people are named.** Find each field's id from the project's create
metadata or field search, and show the matched name and id in the draft. Set a person only when the
user named them, resolved through user search; an ambiguous match is a question, never a pick.
Nobody named → the field stays blank and the draft says `<field>: not provided, left blank`.

Not opted in → no custom field is touched.

Fields the project **requires** to create an issue are not opt-in. One without a known value is a
question; never invent a value to get past it.

## The draft

**One file per feature: `.ef/<feature>/jira.md`.** It is the feature's only Jira record — the draft
before the push, the keys after it — beside the feature's other `.ef/` artifacts. When the feature
already has an `.ef/<feature>/` folder, use that folder's name as listed on disk; otherwise derive a
kebab-case name from the feature title. Either way the name — and every `<item>-<name>` of a
rendered flow — holds only `a-z`, `0-9` and `-`; anything else is dropped,
so no path can leave `.ef/<feature>/`. Show the name in the header. A `jira.md` that already exists
is read first and updated in place: its keys are never removed or rewritten. If its recorded project
or language differs from this run's, stop and ask — its keys belong to that project and language,
and must not be skipped or reused as if they were this run's.

Write the draft there and show it. It opens with everything the approval depends on:

```markdown
Feature: audit-log-export · Project: SHOP · Language: pt-BR · 3 tasks, 4 subtasks
Style: plain                        or: inferred from SHOP-412…SHOP-421
Gaps: 1.2 flow not rendered (no local renderer) · QA: not provided, left blank
```

Then the issues, numbered `1`, `1.1`, `1.2`, `2`, each in the shape above with its `Split:` line.

## Approval

One approval covers the whole set. Ask, with these options:

- **Push** — create every item in the draft.
- **Strike items** — the user names them (`1.2, 3`); striking a task strikes its subtasks. Show the
  updated header and ask again.
- **Edit** — revise as told, show the draft, ask again.
- **Keep as draft** — stop. `jira.md` keeps the draft.

Only an explicit **Push** reaches Jira. Silence or an ambiguous answer is not approval.

## Push

Create parents first, then their children through the project's own parent relationship — a
subtask's parent for subtasks, the epic's child link for Stories under an Epic — then attachments.
Write each key into `jira.md` beside its item (`→ SHOP-430`) the moment the issue exists. An item
that already carries a key is never created again, and never edited.

An item without a key may still exist in Jira, when a previous push stopped between creating it and
recording it. Before creating each one, search the project for an issue with the same summary; on a
match, show it and ask whether it is that item — yes records the existing key instead of creating a
duplicate.

On a failure, stop: report what was created, the item that failed and the tool's error. Do not retry
blindly, and never delete what was already created. Finish with a table of item, key and link.

## Rules

1. **Draft first.** Push only on an explicit approval of the set the user saw.
2. **Never infer the project; never default the language.**
3. **Never invent** a label, component, field value or person.
4. **Product behaviour only.** Implementation detail is stripped or asked about.
5. **No network but the host's Jira tools.** No REST fallback, no remote rendering.
6. **Writes only `.ef/<feature>/jira.md`, its rendered flows and Jira.**
