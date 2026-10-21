# Rulebook format: what `ef-check` enforces

The checker (`scripts/ef-check.mjs`, relative to this skill) holds a repository to the format below.
Every gate here is deterministic: the same tree gives the same verdict on every machine, in the hook
and in CI. Anything that needs judgement is the audit's job, not the checker's, and it lives in the
skill instead.

`error` fails the run (exit 1). `warn` is reported and passes.

## Files

| Path | Role |
|---|---|
| `AGENTS.md` at the repo root | **The root rulebook.** Read every session. Where it is absent, a root `CLAUDE.md` is the root rulebook instead |
| `CLAUDE.md` (or `.claude/CLAUDE.md`) beside an `AGENTS.md` | **A pointer.** It must import the rulebook with a line reading `@AGENTS.md` |
| `<dir>/AGENTS.md` | A **scoped rulebook**, for work under `<dir>` |
| `.ef/bin/ef-check.mjs` | The vendored checker. Never edited by hand. `/ef:ready` replaces it |
| `.ef/anchors.allow` | Paths cited because they no longer exist, each with a reason |

### Why the pointer must import

When `CLAUDE.md` and `AGENTS.md` sit in the same directory, **Claude Code and omp both load only
`CLAUDE.md`**. A pointer that says "read AGENTS.md" in prose leaves the real rulebook to the agent's
discretion. `@AGENTS.md` makes both tools expand it inline at session start. That's deterministic,
and it's the reason this is an `error` and not advice.

## The gates

### `anchors`: every cited path exists

Scanned: every tracked markdown file (`git ls-files`, so ignored build output is never consulted;
the filesystem is used when there is no git). Fenced code blocks are skipped.

A citation is a **path-shaped token containing `/`**, found in an inline code span or a markdown link
target. Each one is resolved against the citing document's directory and against the repo root.

- **Rooted or not.** A token is a claim about this repo only if its first segment exists where it
  would resolve (`src/…` when `src/` is tracked at the root). Tokens that aren't rooted are skipped
  and never fail: `owner/repo#12`, `@scope/pkg/sub`, `#alias/*`, `/route/path`, and paths in another
  repository. The limitation is that a citation whose whole top-level directory was deleted is no
  longer seen as a claim about this repo.
- **Line suffixes.** `path:42`, `path:42-60` and `#L42` must point inside the file. Line `0`, or a
  range that ends before it starts, is an error too.
- **Skipped shapes.** Tokens containing `*`, `<`, `>`, `{`, `}`, `$`, `|`, `\`, `//` or `://` are
  skipped. Globs, placeholders and escapes are patterns, not files.
- **`.ef/anchors.allow`.** It holds one entry per line: `path  # reason`. An entry ending in `/`
  covers that directory and every path cited under it, which suits a tree an ADR deleted whole.
  An entry without a reason is an `error`. An entry that is never cited, or whose path exists
  again, is a `warn`. Only list a file that a document discusses *as gone*. A file that merely
  moved gets its citation fixed.
- **Records: `doc <path>  # reason`.** These are documents that keep the paths of their day, such
  as immutable ADRs and closed feature records. Every stale citation *from* a document at or under
  `<path>` is downgraded to a `warn`, so the history stays visible without failing the gate. The
  reason is required. A rulebook, or anything a rulebook imports, is never a record: it's loaded as
  current truth, so its citations stay `error`. An entry that matches no document is a `warn`.

### `commands`: every runnable command resolves

Scanned: the rulebooks and their imports. That means code spans, and fenced blocks tagged `sh`,
`bash`, `shell`, `console`, `zsh` or untagged.

| Written as | Must resolve to |
|---|---|
| `npm run x` · `pnpm run x` · `yarn run x` · `bun run x` · `npm test` | a `scripts.x` in a `package.json` between the rulebook's directory and the root |
| `make x` | a target in a `Makefile` in those directories |
| `just x` | a recipe in a `justfile` in those directories |

Forms the checker can't verify are counted, never failed. That covers anything with `--filter`,
`-C`, `--cwd`, `--prefix` or a workspace flag, and any other binary (`cargo test`, `go test`,
`uv run pytest`). File arguments (`bun src/worker.ts`) are covered by `anchors`.

### `budget`: what loads every session fits

The always-loaded set is the root pointer (if any), the root rulebook, and every file they
`@import`, followed up to four hops. Imports don't reduce what loads; they only move it to
another file.

| Set | `warn` above | `error` above |
|---|---|---|
| root | 150 lines | 200 lines |
| each scoped rulebook and its imports | (none) | 200 lines |

An estimated token count (characters ÷ 4) is reported and never gated.

Limits are changed only in the bindings block, and only with a reason:

```text
rulebook-budget: root 180/240, scoped 250 — monorepo with four runtimes; split planned in ADR-0090
```

The reason follows `—` or `--`. Without one the override is an `error` and the defaults apply.

### `routing`: every scoped rulebook is reachable from the root

Every scoped `AGENTS.md` (or a standalone scoped `CLAUDE.md`) must be named by path somewhere in the
root's always-loaded set. omp discovers context files by walking **up** from the session directory,
so a rulebook below it never loads. Claude Code loads one only after reading a file in that
directory. The routing line is the day-one trigger that makes the agent open it in time. The
finding is reported on the scoped file, so the hook fires when that file is written.

### `checks`: every invariant says how it is caught

Every rulebook may hold a section whose heading contains **Invariants**. Each top-level list item in
that section is an invariant, and each must contain one of:

```text
Check: <the lint rule, type, test or command that fails when this is violated>
Check: none — <why nothing can check it yet, and what catches it instead>
```

Emphasis is ignored, so `_Check:_` and `**Check:**` both count. `Check: none` with a reason shorter
than ten characters is an `error`. The report lists every honest gap. Each one is a candidate for a
level 0 check.

Only the Invariants section is gated. Other sections, such as settled decisions or what looks dead,
are judged by the audit, not the checker.

### `single-source`: one rulebook per directory

Where `CLAUDE.md` sits beside `AGENTS.md`:

- it must import `@AGENTS.md` (`error`: otherwise neither tool loads the rulebook)
- it must not hold an Invariants section or an `ef-harness` block (`error`: two rulebooks, and the
  one you aren't reading is the wrong one)
- more than 20 non-blank lines of its own is a `warn`

### `bindings`: the `ef-harness` block exists and is runnable

The root's always-loaded set must hold a heading `## ef-harness`. Its lines are `key: value`, and
indented lines continue the previous value. A fenced block inside the section is read the same way.

| Key | Meaning |
|---|---|
| `gates` | **required.** Commands that must pass before Stage 5, in order, separated by `,` `;` or `&&`. Each verifiable one must resolve (see `commands`) |
| `generated` | command that regenerates code; the tree must be clean after it |
| `identifier` | which identifier may cross the API boundary, and everywhere the rule applies |
| `authorization` | the policy mechanism every new surface must pass |
| `tests` | runner; how one test is named and invoked; known incompatibilities |
| `migrations` | how a schema migration must be created |
| `audit` | where side-effect or audit entries are catalogued |
| `commits` | commit message convention |
| `rulebook-budget` | budget override (see `budget`) |

An unknown key is an `error`, because `gate:` for `gates:` should fail loudly, not silently.
If `.ef/bin/ef-check.mjs` exists and no gate runs it, that's a `warn`: Stage 4 would never run the
rulebook's own gate.

### `feature`: every `.ef/<feature>/` checklist holds together

Not a rulebook gate, but the same checker runs it, and the same hook. For each `.ef/<name>/`
holding a `checks.md` (read from disk, because `.ef/` is often gitignored), it checks that:

- check ids are unique and each has a proof
- every cited check exists
- every owned requirement is cited by some check
- in the split layout: the slice files and the index agree, every `Reads:` target exists, every
  contract file has a reader, no path has two owners, and the budgets hold (slice 150, contract 200)

The format, and what each rule protects, is the `ef-implement` skill's
`references/checklist-format.md`.

## Running it

```text
node .ef/bin/ef-check.mjs                 # every gate, text report
node .ef/bin/ef-check.mjs --json          # the same, machine-readable
node .ef/bin/ef-check.mjs --only a.md,b.md   # only findings reported on those files (the hook uses this)
node .ef/bin/ef-check.mjs --split .ef/<feature>   # migrate a one-file checklist to the split layout
node .ef/bin/ef-check.mjs --version
```

Exit `0` means no errors. Exit `1` means at least one error. Exit `2` means the checker couldn't run.
It needs Node 18 or later and no dependencies.

## Root rulebook skeleton

```markdown
# <Project>: agent rulebook

<What this is and who it serves, in two sentences.>

**<The one principle everything else serves.>**

## Commands

| Task | Command |
|---|---|
| The gate: must be green before you are done | `<cmd>` |
| Fast inner loop: never conclude from it | `<cmd>` |

## Invariants

Each one states how a violation is caught. A rule with no check is a wish.

1. **<Rule.>** <Why, in one sentence.> _Check:_ <what fails when it is broken>
2. **<Rule.>** _Check:_ none — <why nothing checks it yet; who catches it>

## Read before editing

| Editing | Read first |
|---|---|
| `<dir>/**` | `<dir>/AGENTS.md` |

## Settled: do not reopen

- <decision, one line> (<ADR id>)

## Looks dead, isn't

- `<symbol or path>`: <why it stays>

## ef-harness

gates: <cmd>, <cmd>, node .ef/bin/ef-check.mjs
commits: <convention, or a pointer to the file that holds it>
```
