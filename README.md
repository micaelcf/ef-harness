# EF harness

A five-stage pipeline for taking a feature from raw intent to a code-verified contract other
repositories build against.

It is **repo-agnostic**: no stage assumes a language, task runner, test framework or directory
layout. Everything concrete comes from the repository being worked in, declared once in its own
context file (see *Bindings* below).

It is **tool-portable**: one tree is both a Claude Code plugin and an omp plugin, published through
the same marketplace. Every file is a plain command or skill, so both tools load it natively.

---

## The five stages

| Stage | Command | Runs | Produces |
|---|---|---|---|
| 1 | `/ef:grilling` | once per feature | `grill-decisions-<date>-<feature>.md` |
| 2 | `/ef:feature-docs` | once per feature | `RFC` · `PRD` · `INDEX` (+ `knowledge/`) |
| 3 | `/ef:perspective-discovery` | once per target repo | the contract (pre-check: `/ef:spec-drift`) |
| 4 | `/ef:implement` | once per target repo | `.ef/<feature>/checks.md`, amends the RFC/PRD |
| 5 | `/ef:audit` | once per target repo | the handoff doc, amends the RFC/PRD |

Two steps are **optional**, and both are decided by the same question — *can you name the thing you
are copying?*

| Optional step | Command | Runs when |
|---|---|---|
| UI prototype | `/ef:prototype` | the feature introduces a screen that is **not** a variation of an existing one or of a well-known pattern. Runs inside Stage 1, before requirements and before any contract |
| Scout fan-out | part of Stage 3 | you **cannot** name the files the feature changes. Stage 3's anchor check always runs; only the fan-out is conditional |

The canonical runtime copy of this map lives in `commands/grilling.md`, because Stage 1 is
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
.claude-plugin/{plugin,marketplace}.json   Claude Code manifest + marketplace catalog
.omp-plugin/{plugin,marketplace}.json      omp manifest + catalog — keep identical to the Claude pair

commands/                        the plugin is named `ef`, so each file runs as /ef:<name>
├── grilling.md                  Stage 1 — shim → ef-grilling; holds the canonical stage map
├── feature-docs.md              Stage 2 — shim → ef-feature-docs
├── spec-drift.md                Stage 3 pre-check — anchor verification only
├── perspective-discovery.md     Stage 3 — shim → ef-perspective-discovery
├── implement.md                 Stage 4 — shim → ef-implement
├── audit.md                     Stage 5 — shim → ef-adversarial-audit
└── prototype.md                 optional — shim → ef-prototype

skills/
├── ef-shared/                   one vocabulary, read by every stage; not user-invocable
│   ├── SKILL.md
│   └── references/{evidence-grades,lenses}.md
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

`ef-shared` is the vocabulary two or more stages would otherwise each restate. Evidence grades are
used by all five stages; lenses by Stages 1 and 3. One definition, one place to change it. It is a
skill only so both tools can address its files; it never runs on its own.

Commands are thin shims; skills hold the method. That split matters because a skill is
**model-invoked** — a teammate who says "implement this feature per the contract" gets the method
without knowing a command exists, while the command stays the deterministic entry.

References are loaded **only at the step that needs them**, never up front.

**Reference convention** — the one both tools resolve, whether the harness is installed as a plugin
or copied:

- a file in the same skill is written relative to that skill's directory: `references/deadlock.md`
- a file in another skill names the skill: *the `ef-shared` skill's `references/lenses.md`*
- a command never points at a path; it says *load the `ef-grilling` skill*

Never write a repository path such as `.claude/skills/…` or `${CLAUDE_PLUGIN_ROOT}/…`: the first
does not exist after a plugin install, and omp does not substitute the second in skill content.

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

### Claude Code

```
/plugin marketplace add micaelcf/ef-harness
/plugin install ef@ef-harness
```

To give a whole team the same harness, commit this to the repository's `.claude/settings.json`;
Claude Code offers the install to everyone who opens the project:

```json
{
  "extraKnownMarketplaces": {
    "ef-harness": { "source": { "source": "github", "repo": "micaelcf/ef-harness" } }
  },
  "enabledPlugins": { "ef@ef-harness": true }
}
```

### omp

```
omp plugin marketplace add micaelcf/ef-harness
omp plugin install --scope project ef@ef-harness     # or --scope user for every project
```

omp reads `.omp-plugin/`, and falls back to `.claude-plugin/`. The install is persisted in
`<repo>/.omp/plugins/` (project scope) or `~/.omp/plugins/` (user scope). The project registry holds
absolute cache paths, so each developer runs the install once rather than committing it.

Remove any earlier hand-copied `~/.omp/agent/commands/ef-*.md` and
`~/.omp/agent/managed-skills/ef-*/`, so each skill exists once. Two same-named skills from
different sources resolve by omp's provider priority, not by recency — a teammate can end up
running a stale copy without noticing.

### Both tools

Commands run as `/ef:grilling`, `/ef:implement`, … and skills appear as `ef:ef-grilling`, etc.
Update with `/plugin update` (Claude Code) or `omp plugin upgrade ef@ef-harness`.

### Manual copy (no marketplace)

For offline or air-gapped use, copy the tree into the repository:

```
<repo>/.claude/commands/ef/*.md      ← commands/*.md
<repo>/.claude/skills/ef-*/**         ← skills/ef-*/
```

Both tools read `.claude/` from the **current working directory**, so a copy in a parent directory
is not discovered from inside a child repository; copy into each target repo. In Claude Code the
`ef/` folder only labels the commands, so they run as `/grilling`, `/implement`, …; omp registers
both `/grilling` and `/ef:grilling`. Everywhere this harness says `/ef:<name>`, drop the prefix under
a Claude Code manual copy.

---

## Publishing a release

1. Bump `version` in `.claude-plugin/plugin.json` and copy both manifest files over their
   `.omp-plugin/` twins — both tools keep users on the pinned version until it changes.
2. `claude plugin validate . --strict`
3. Commit and push `main`.

To list the plugin in Anthropic's public plugin directory, submit this repository through Claude
Code's plugin-directory submission process; the self-hosted marketplace above works without it.

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
| the contract | Stage 3 | `.ef/<feature>/checks.md`, in the repo that builds it |
| checks, slices, ownership, Landing, Coverage | Stage 4 | `.ef/<feature>/checks.md` |
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

---

## License

[MIT](LICENSE). Security reports: see [SECURITY.md](SECURITY.md).
