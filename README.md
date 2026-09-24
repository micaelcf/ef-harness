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

The canonical runtime copy of this map lives in `commands/ef/grilling.md`, because Stage 1 is
where a feature starts. The table above is the same map for humans reading the repository.

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
├── grilling.md                  Stage 1 — self-contained; holds the canonical stage map
├── feature-docs.md              Stage 2 — shim → skills/ef-feature-docs
├── spec-drift.md                Stage 3 pre-check — anchor verification only
├── perspective-discovery.md     Stage 3 — shim → skills/ef-perspective-discovery
├── implement.md                 Stage 4 — shim → skills/ef-implement
└── audit.md                     Stage 5 — shim → skills/ef-adversarial-audit

skills/
├── ef-feature-docs/
│   ├── SKILL.md
│   └── references/{rfc-template,prd-template,index-template,amendments,anti-patterns}.md
├── ef-perspective-discovery/SKILL.md
├── ef-implement/
│   ├── SKILL.md
│   └── references/{checklist-format,sweep,orchestration}.md
└── ef-adversarial-audit/
    ├── SKILL.md
    └── references/{defect-classes,contract-doc}.md
```

Commands are thin shims; skills hold the method. That split matters in Claude Code, where a
skill is **model-invoked** — a teammate who says "implement this feature per the contract" gets
the method without knowing a command exists, while the command stays the deterministic entry.

References are loaded **only at the step that needs them**, never up front.

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
| `RFC_*.md`, `PRD_*.md`, `INDEX.md` | Stage 2 | feature docs folder |
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
