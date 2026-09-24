# INDEX template

Load this when writing `INDEX.md` — last, after the RFC and PRD exist.

`INDEX.md` is the map, not a summary. Its job is to get a reader who has never seen this feature to
the right document in one hop, and to tell a returning reader what changed.

---

## Template

```markdown
# <Feature> — Knowledge Index

<Two or three sentences: what this feature is, in plain terms, and what it deliberately leaves
untouched.>

| Field | Value |
|---|---|
| **Status** | <one line per target repo, dated> |
| **Driver** | @who |
| **Target repos** | … |
| **Ticket** | link |

---

## Root documents

| Doc | Purpose | When to update |
|---|---|---|
| [knowledge/](./knowledge/) | Verified ground truth with code citations. **Common knowledge base.** | When the underlying system changes |
| [grill-decisions](./…) | The decisions and rationale. **Source of truth for rationale.** | When a decision is revisited |
| [RFC](./…) | Decisions with options considered and rejected, criteria, assumptions, risks | When a decision or assumption changes |
| [PRD](./…) | Requirements with stable ids, acceptance criteria, metrics, non-goals | When scope or a requirement changes |
| [handoff docs](./…) | What actually shipped, per repo, written from the code | Stage 5, per repo |

---

## Reading order

1. **knowledge/** — what exists today and why it constrains the design
2. **grill-decisions** — the objective and the decision matrix
3. **RFC** — resolved decisions with rejected options
4. **PRD** — requirements and acceptance criteria
5. **handoff doc for your repo** — what shipped, and what to build against

---

## Decision index

| # | Decision | Anchor |
|---|---|---|
| Q1 | <one line> | RFC D1 |

---

## Per-repo status

| Repo | Stage | Last updated | Notes |
|---|---|---|---|
| api | 5 — audited, handoff written | 2026-… | … |
| app | 3 — discovery closed, not started | 2026-… | … |

---

## Related

- Ground-truth code: the files and services this feature reads or changes
- Reused patterns: what it imitates rather than invents
- Sibling precedent: the feature folder whose structure this mirrors
```

---

## Rules

- **The handoff doc supersedes the design docs** wherever they disagree, and the table must say so
  once it exists. A consumer who follows the RFC instead will build the wrong thing.
- **Reading order is not the document list.** Order it the way a newcomer should actually read, which
  is ground truth first and requirements last.
- **The decision index is a pointer table, not a restatement.** One line per decision, linking to its
  anchor. If a reader can act on the index without opening the RFC, the index has become a fork of it.
- **Per-repo status duplicates the RFC header deliberately.** The RFC header is normative; this table
  is the map's convenience copy, and it is the one a reader sees first. Keep them consistent, and when
  they disagree, the RFC wins.
