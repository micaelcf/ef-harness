# EF harness

A five-stage pipeline for taking a feature from raw intent to a code-verified contract other
repositories build against.

It is **repo-agnostic**: no stage assumes a language, task runner, test framework or directory
layout. Everything concrete comes from the repository being worked in, declared once in its own
context file (see *Bindings* below).

It is **tool-portable**: every file here is a plain Claude Code command or skill. Claude Code
reads them natively; oh-my-pi reads the same paths through its `claude` provider. One copy
serves both.

---

## The five stages

| Stage | Command | Runs | Produces |
|---|---|---|---|
| 1 | `/ef:grilling` | once per feature | `grill-decisions-<date>-<feature>.md` |
| 2 | `/ef:feature-docs` | once per feature | `RFC` · `PRD` · `INDEX` (+ `knowledge/`) |
| 3 | `/ef:perspective-discovery` | once per target repo | the contract (pre-check: `/ef:spec-drift`) |
| 4 | `/ef:implement` | once per target repo | `.checks/<feature>.md`, amends the RFC/PRD |
| 5 | `/ef:audit` | once per target repo | the handoff doc, amends the RFC/PRD |

Two steps are **optional**, and both are decided by the same question — *can you name the thing you
are copying?*

| Optional step | Command | Runs when |
|---|---|---|
| UI prototype | `/ef:prototype` | the feature introduces a screen that is **not** a variation of an existing one or of a well-known pattern. Runs inside Stage 1, before requirements and before any contract |
| Scout fan-out | part of Stage 3 | you **cannot** name the files the feature changes. Stage 3's anchor check always runs; only the fan-out is conditional |

The canonical runtime copy of this map lives in `commands/ef/grilling.md`, because Stage 1 is
where a feature starts. The table above is the same map for humans reading the repository.

## Scale

Stage 1 declares the scale in the grill-decisions header and every later stage inherits it. A repo
may override it upward for itself, never downward.

| Scale | Pipeline | What it cannot catch |
|---|---|---|
| `single` | grill → checks → build → audit; one collapsed decisions document instead of RFC + PRD | a convention this repo has that you do not know about; anything a second reader would have seen |
| `standard` | all five stages, one repo | cross-repo contract drift — there is no second repo to drift from |
| `multi` | all five stages per target repo, handoff docs, per-repo status | nothing structural; this is the complete pipeline |

Each level names the failure class it gives up, so a skipped step is a priced trade rather than a
discount. Any one of these forces at least `standard`: more than one repo · a one-way door (persisted
schema, a consumed contract, a new dependency, a data backfill, a pattern the codebase lacks) ·
authentication, money or deletion · you cannot name the files it changes.

**The audit never collapses.** It runs per repo, over that repo's range, at every scale.

Two things travel across the whole pipeline:

- **`grill-decisions` outranks the RFC and PRD**, which are written from it. Where they
  disagree, it wins.
- **The RFC is a living document.** Stages 3, 4 and 5 amend it in place with dated,
  trigger-tagged blocks. Its header is the only home for cross-repo delivery status — handoff
  docs are per repo and cannot answer "what is outstanding where".

---

## Layout

```
commands/ef/
├── grilling.md                  Stage 1 — shim → skills/ef-grilling; holds the canonical stage map
├── feature-docs.md              Stage 2 — shim → skills/ef-feature-docs
├── spec-drift.md                Stage 3 pre-check — anchor verification only
├── perspective-discovery.md     Stage 3 — shim → skills/ef-perspective-discovery
├── implement.md                 Stage 4 — shim → skills/ef-implement
├── audit.md                     Stage 5 — shim → skills/ef-adversarial-audit
└── prototype.md                 optional — shim → skills/ef-prototype

skills/
├── _shared/                     one vocabulary, read by every stage
│   ├── evidence-grades.md       the A–D scale
│   └── lenses.md                the five critical methods
├── ef-grilling/
│   ├── SKILL.md
│   └── references/{decision-record,deadlock}.md
├── ef-feature-docs/
│   ├── SKILL.md
│   └── references/{rfc-template,prd-template,index-template,amendments,anti-patterns}.md
├── ef-prototype/SKILL.md        optional — new-UI discovery, 4–5 variants in one HTML file
├── ef-perspective-discovery/SKILL.md
├── ef-implement/
│   ├── SKILL.md
│   └── references/{checklist-format,sweep,orchestration}.md
└── ef-adversarial-audit/
    ├── SKILL.md
    └── references/{defect-classes,contract-doc}.md
```

`_shared/` has no `SKILL.md` and is not a skill — it is the vocabulary two or more stages would
otherwise each restate. Evidence grades are used by all five stages; lenses by Stages 1 and 3. One
definition, one place to change it.

Commands are thin shims; skills hold the method. That split matters in Claude Code, where a
skill is **model-invoked** — a teammate who says "implement this feature per the contract" gets
the method without knowing a command exists, while the command stays the deterministic entry.

References are loaded **only at the step that needs them**, never up front.

**Path convention:** every internal pointer is written root-relative as `.claude/skills/…` or
`.claude/commands/…`, because that is where it resolves from the repository root after install.
Never use a path relative to the file doing the pointing — a reference that reads correctly beside
its neighbour fails from two directories away, silently, and the step that needed it just proceeds
without it.

## The decision record

Stage 1 closes each decision in a fixed shape — decision · ranked why · evidence grade · preserved
dissent · riskiest assumption · test · **would reopen if** · supersedes.

Every field is consumed downstream and cannot be reconstructed later:

- `Dissent` becomes the RFC's rejected-options row. Invented at Stage 2, it produces a fake
  comparison written by someone who already knows the answer.
- `Riskiest assumption` + `Test` + `Would reopen if` become the RFC's assumptions table, which
  demands exactly those three columns.
- `Would reopen if` is what makes Stage 3 self-correcting: a `FICTION` anchor is matched against the
  reopen conditions, so a false claim reverses a decision **by its own stated terms** rather than by
  someone's judgement in the moment.

---

## Installing

Copy `commands/` and `skills/` into a repository's `.claude/` directory:

```
<repo>/.claude/commands/ef/*.md
<repo>/.claude/skills/ef-*/**
```

Commands resolve from the **current working directory** in both Claude Code and oh-my-pi, so a
copy in a parent directory is not discoverable while working inside a child repository. For a
multi-repo feature, keep this directory as the source of truth and copy into each target repo.

**oh-my-pi users:** delete any `~/.omp/agent/commands/ef-*.md` and
`~/.omp/agent/managed-skills/ef-*/`. The native provider has priority 100 and would silently
shadow the repository copy for you while your teammates run the repository version — divergence
nobody would notice.

---

## Bindings

Nothing in this harness hardcodes a command, an identifier rule or a convention. Each repository
declares its own, once, in `CLAUDE.md` / `AGENTS.md`:

```markdown
## ef-harness

gates:         <commands that must pass before Stage 5, in order>
generated:     <command that regenerates code; state that the tree must be clean after>
identifier:    <which identifier may cross the API boundary, and everywhere the rule applies>
authorization: <the policy mechanism every new surface must pass>
tests:         <runner; how ONE test is named and invoked; known incompatibilities>
migrations:    <how a schema migration must be created>
audit:         <where side-effect/audit entries are catalogued, if the repo has one>
commits:       <commit message convention>
```

Where the block is absent, Stage 4 derives the gates from the task runner and the CI workflows,
**proposes** them, and offers to write the block. It never invents a command: a proof that
cannot run is worse than no proof.

The Stage 3 contract carries only what is feature-specific on top of this.

---

## Artifact ownership

| Artifact | Written by | Lives in |
|---|---|---|
| `knowledge/` topic notes | Stage 1 grounding | feature docs folder |
| `grill-decisions-<date>-<feature>.md` | Stage 1 | feature docs folder |
| `prototypes/<screen>.html` | `/ef:prototype`, inside Stage 1 | feature docs folder, linked from `INDEX.md` |
| `RFC_*.md`, `PRD_*.md`, `INDEX.md` | Stage 2 | feature docs folder |
| `DECISIONS_<feature>.md` (at `single` scale, replacing RFC + PRD) | Stage 2 | feature docs folder |
| amendments to the RFC/PRD | Stages 3, 4, 5 | in place, next to what they change |
| the contract | Stage 3 | `.checks/<feature>.md`, in the repo that builds it |
| checks, slices, ownership, Landing, Coverage | Stage 4 | `.checks/<feature>.md` |
| handoff doc (`API_HANDOFF*` / `FRONTEND_HANDOFF*` / `API_CHANGE_REQUEST_*`) | Stage 5 | feature docs folder, linked from `INDEX.md` |

Product documents are cross-repo and live with the feature. Build artifacts are per repo and
live in the repo. Nothing is written twice.

---

## Deliberate omissions

- **No verification gate other than Stage 5.** Convention inspectors and spec-completeness
  agents are not wired in. Their value moved upstream into Stage 4's sweep, where acting on a
  finding is cheap.
- **No fault injection.** Stage 5 asks whether a guard would fail if the behaviour reverted; it
  does not mutate code to prove it. If a decorative test ever ships past the audit, revisit this.
- **No enforcement of the amendment protocol.** Stages 4 and 5 are instructed to amend the
  feature docs; nothing fails if they do not. The audit stays about code.
