# Changelog

All notable changes to EF Harness are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as defined in
[README › Versioning](README.md#versioning).

## [Unreleased]

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
