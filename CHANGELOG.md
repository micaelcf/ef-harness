# Changelog

All notable changes to EF Harness are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as defined in
[README › Versioning](README.md#versioning).

## [Unreleased]

### Added

- `/ef:ready` (`ef-readiness`): makes a repository's agent rulebook verifiable, once per repo.
  Modes `audit` (checker findings plus a verdict for every rulebook line, edits nothing),
  `bootstrap` (derive what the code says, interview for what it cannot, write, gate) and `grow`
  (turn audit findings into checks first, rules second). Places every rule on one of four levels —
  enforced, day one, path-triggered, task-triggered — and never writes a codebase overview.
- **`ef-check`**, a zero-dependency Node checker vendored into each repository at
  `.ef/bin/ef-check.mjs`, with seven deterministic gates: `anchors` (cited paths and line numbers
  exist), `commands` (named scripts, make targets and just recipes exist), `budget` (the
  always-loaded set, imports included, warns past 150 lines and fails past 200; scoped rulebooks
  fail past 200), `routing` (every scoped rulebook is named from the root), `checks` (every
  invariant states its `Check:` or an honest `Check: none — <reason>`), `single-source` (a
  `CLAUDE.md` beside `AGENTS.md` imports `@AGENTS.md` and holds no rules of its own) and `bindings`
  (the `ef-harness` block exists, has known keys, and its gates resolve). Exit `0` / `1` / `2`;
  `--json` and `--only` for tools.
- `.ef/anchors.allow`: paths cited because they were deleted on purpose, each with a required
  reason; an entry ending in `/` covers a deleted tree. `doc <path>  # reason` marks immutable
  records (ADRs, closed feature docs) whose stale citations are reported as warnings; a rulebook is
  never a record.
- `.gitattributes` pins `*.mjs`, `*.js` and `*.json` to LF in the harness, so the checker, the
  hooks and the twin manifests are byte-identical on every platform; `/ef:ready` adds
  `.ef/bin/*.mjs text eol=lf` to the consumer repo for the vendored copy.
- Optional bindings key `rulebook-budget:` (`root <warn>/<fail>, scoped <fail> — <reason>`).
- **Edit-triggered rulebook hook** for both tools — a Claude Code `PostToolUse` hook
  (`hooks/hooks.json`) and an omp extension (`package.json#omp.extensions`) — that runs the
  repository's vendored checker, with `node` in a child process, on each markdown file the agent
  writes and returns the findings in the same turn; a checker that cannot run is reported, not
  swallowed. It does nothing in a repository that has not vendored the checker.
- Stage 5 reports `## Rulebook proposals` for defect classes that could recur, each with its level
  and `Check:`, for `/ef:ready grow` to apply.
- **`feature` gate** in `ef-check`, over every `.ef/<feature>/` (read from disk, so a gitignored
  `.ef/` is still checked): check ids are unique and each has a `Proof:`; every cited check id
  exists, with `C2–C4` ranges expanded; every requirement id listed under `## Requirements` is cited
  by a check, and a check cites no unlisted id with an owned prefix. In the split layout it also
  requires the index and `slices/` to agree, an `Owns:` and a `Reads:` line on every slice, every
  `Reads:` target to exist, every contract file to have a reader, no path owned by two slices, slice
  files under 150 lines and contract files under 200. A glob that overlaps another slice's files is
  a warning, because real checklists split a tree on purpose.
- `ef-check --split .ef/<feature>`: deterministic migration of a one-file checklist to the split
  layout. A contract heading naming slices in parentheses (`Schema (S0)`) is read by those slices
  only; every other contract file by every slice.
- `node:test` suites for the checker, the feature gate and split, and both hook adapters, run in the
  release workflow.

### Changed

- The "markdown only — no hooks, no executables" design rule is replaced by "deterministic code
  only where it beats prose": one vendored checker and one edit hook, no MCP servers, no model
  calls, no network.
- Stage 4 points a repository without a bindings block at `/ef:ready`.
- The public API now includes the rulebook and checklist formats `ef-check` enforces and the
  checker's location, arguments and exit codes; a new checker `error` that fails a previously
  passing rulebook or checklist is a MAJOR change.
- **BREAKING** — at `standard` and `multi` scale, `.ef/<feature>/` is **split by reader**:
  `checks.md` becomes the index (sources, `## Requirements`, Landing, a slice table and a contract
  table), the Stage 3 contract moves to `contract/<topic>.md`, each slice's ownership and checks to
  `slices/S<n>-<slug>.md` with `Owns:` and `Reads:` lines, Swept and Coverage to `verification.md`,
  and history to an append-only `log.md`. A builder now loads the index, the contract files its slice
  reads and its slice file — on a real ten-slice feature, ~4k tokens instead of ~15k. `checks.md`
  stays the entry point, and `single` scale keeps one file. Stages 3, 4 and 5 and the commands read
  and write the new layout. **Migrate** an in-flight feature with
  `node .ef/bin/ef-check.mjs --split .ef/<feature>`, review the generated `Reads:` lines, and add
  `## Requirements`; finished features need no migration. The split writes nothing unless every
  non-blank line of the original is found in its output, and keeps the original as `checks.md.orig`.

## [0.1.0] - 2026-10-02

First public release.

### Added

- **Five-stage pipeline**, each stage a command backed by a model-invoked skill:
  - Stage 1 `/ef:grilling` (`ef-grilling`): one-question-at-a-time decision interview with bias
    guards; every decision is recorded as *Decision · Why · Evidence grade · Dissent · Riskiest
    assumption · Test · Would reopen if · Supersedes*.
  - Stage 2 `/ef:feature-docs` (`ef-feature-docs`): RFC, PRD and INDEX written from the grill
    decisions, with templates, an amendment protocol and an anti-pattern list.
  - Stage 3 `/ef:perspective-discovery` (`ef-perspective-discovery`): anchor check
    (`VERIFIED` / `MOVED` / `CHANGED` / `FICTION`), lens-diverse scout fan-out, triage, repo-altitude
    grill and a written contract. A `FICTION` anchor that matches a decision's *Would reopen if*
    reopens it.
  - Stage 4 `/ef:implement` (`ef-implement`): checks with named proofs fixed before code, the
    thirteen-point sweep of unwritten requirements, and parallel slices with one owner per file set.
  - Stage 5 `/ef:audit` (`ef-adversarial-audit`): a single adversarial review by a fresh agent over
    the whole feature range, with defect classes that survive a green suite and a handoff document
    written from the code.
- `/ef:spec-drift`: cheap Stage 3 pre-check that runs the anchor verification only.
- `/ef:prototype` (`ef-prototype`): optional stage producing 4–5 distinct UI variants in one HTML
  file for screens with no known pattern.
- `ef-shared`: evidence grades A–D and the five critical lenses used across stages.
- **Scale switch** (`single` / `standard` / `multi`), declared once in Stage 1 and inherited by
  every stage; each shortcut states which class of failure it stops catching. The audit runs at
  every scale.
- **Bindings block** (`gates`, `generated`, `identifier`, `authorization`, `tests`, `migrations`,
  `audit`, `commits`) in `CLAUDE.md` / `AGENTS.md`, so the harness never hardcodes a stack.
- Packaging as a **Claude Code plugin and an omp plugin** from the same tree (`ef@ef-harness`).
- README with pipeline diagrams and animations, MIT license and security policy.

[Unreleased]: https://github.com/micaelcf/ef-harness/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/micaelcf/ef-harness/releases/tag/v0.1.0
