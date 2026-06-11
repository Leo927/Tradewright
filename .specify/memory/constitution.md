<!--
Sync Impact Report
==================
Version change: 1.2.0 → 1.3.0 (MINOR — new principle added)
Modified principles: none renamed or redefined
Added sections:
  - Core Principle VII. UI Design Fidelity (implementation follows the UI design
    artifact faithfully; deviations update the design first)
  - Quality Gate 6 — Design fidelity
Removed sections: none
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — version reference updated to v1.3.0;
    new Constitution Check gate: UI work identifies its design artifact
  ✅ .specify/templates/tasks-template.md — no change needed
  ✅ .specify/templates/spec-template.md — no change needed
  ⚠ README.md / docs/quickstart.md — do not exist yet; document local test commands when created
Follow-up TODOs: none
-->

# TradeWright Constitution

## Core Principles

### I. Test-First Quality (NON-NEGOTIABLE)

Every feature MUST ship with automated tests. Two layers are mandatory:

- **Unit tests**: All logic modules (business rules, state management, data
  transformation) MUST have unit tests covering their public surface, including
  error paths and boundary conditions.
- **End-to-end tests**: Every user-facing flow MUST have Playwright tests that
  exercise the GUI as a user would.

A feature is not "done" until both layers exist and pass. Test tasks are never
optional in plans or task lists; a spec without testable acceptance scenarios
is incomplete. Bug fixes MUST include a regression test that fails before the
fix and passes after.

**Rationale**: Tests are the enforcement mechanism for every other principle in
this constitution — boundary violations and regressions surface as test
failures, not production surprises.

### II. CI/Local Test Parity

The full test suite (unit + Playwright) MUST run in the GitHub Actions CI
pipeline on every pull request and on every push to the main branch. A red
pipeline blocks merge — no exceptions, no skipped suites.

The same suites MUST be runnable locally with single, documented commands
(e.g., `npm test` for unit, `npm run test:e2e` for Playwright). CI MUST invoke
the same commands developers run locally — no CI-only test logic. If a test
passes locally it is expected to pass in CI; environment-specific divergence is
a bug to fix, not tolerate.

**Rationale**: Tests that only run in CI get debugged by push-and-pray; tests
that only run locally rot. Parity keeps the feedback loop fast and the gate
trustworthy.

### III. Separation of Concerns

Every module MUST have a single, stated responsibility. Code that mixes
concerns — rendering plus rules, persistence plus presentation, content plus
behavior — MUST be split before merge. Dependencies point in one direction:
presentation depends on logic; logic depends on nothing above it. Cross-cutting
concerns (logging, configuration, persistence) are isolated behind their own
interfaces rather than threaded through feature code.

**Rationale**: Clean seams are what make the codebase testable in isolation
(Principle I) and re-architectable later (Principle V). Principles IV and V are
the two project-specific applications of this rule.

### IV. Authoring–Implementation Separation

Authored content MUST live separately from code implementation. Content —
definitions, data, copy, scenarios, and other authored material — is expressed
as declarative data (e.g., JSON/YAML/dedicated content files) in its own
directory tree, never hard-coded into implementation source. Code loads,
validates, and interprets content through a defined schema; it never embeds it.

The test of compliance: an author MUST be able to add or change content without
touching implementation code, and an engineer MUST be able to refactor
implementation without rewriting content. Content schemas MUST be validated
(at load time or build time) so malformed content fails fast.

**Rationale**: Authoring and engineering iterate at different speeds and
potentially by different people/tools. Entangling them makes every content
tweak a code review and every refactor a content migration.

### V. GUI–Logic Boundary (Server-Ready Logic)

The GUI and the application logic MUST be separated by an explicit boundary,
because the logic layer WILL eventually be moved to a separate server.

- All GUI–logic communication goes through a defined contract interface
  (typed API of commands/queries/events). The GUI MUST NOT reach into logic
  internals, and logic modules MUST NOT import GUI code, framework components,
  or rendering concerns.
- The logic layer MUST be self-contained: no DOM access, no UI framework
  dependencies, no assumptions that it runs in the same process as the GUI.
  All data crossing the boundary MUST be serializable.
- The architecture test: replacing the in-process logic implementation with a
  remote server behind the same contract MUST require no GUI changes beyond
  the transport adapter.

Unit tests target the logic layer directly through the contract; Playwright
tests exercise the GUI side of the boundary. Contract changes MUST update both.

**Rationale**: Designing for the future server split now costs a thin
interface; retrofitting it later costs a rewrite. The serializable contract
also gives tests a stable seam.

### VI. Comment Discipline

The default is NO comment. A comment MUST be written only when it provides
obvious benefit — stating something the code itself cannot express:

- A constraint, invariant, or contract the reader cannot infer from the code
  (e.g., "order matters: schema validation must precede migration").
- A non-obvious "why" — a workaround for an external bug, a deliberate
  deviation from the expected approach, a performance trade-off.

Comments that restate what the code does, narrate change history, describe the
next line, or address a reviewer are prohibited and MUST be removed in review.
If a comment is needed to explain *what* code does, prefer renaming or
restructuring the code so it explains itself. Any comment that does exist MUST
be kept accurate when the surrounding code changes — a stale comment is worse
than none.

**Rationale**: Comments are unverified by tests and rot silently. Reserving
them for genuinely non-inferable knowledge keeps the ones that remain
trustworthy and the code as the single source of truth.

### VII. UI Design Fidelity

UI implementation MUST follow the UI design faithfully. When a design artifact
exists for a screen or flow — mockup, wireframe, design spec, design tokens —
the implementation MUST match its layout, spacing, typography, colors, labels,
component states, and interaction behavior. Implementers MUST NOT improvise
visual or interaction changes during implementation.

- The design artifact is the source of truth for UI work. Per Principle IV it
  lives with authored content, not inside implementation code.
- If a design proves impractical, ambiguous, or incomplete during
  implementation, the design artifact MUST be updated (or the deviation
  explicitly signed off and recorded in the feature's spec/plan) BEFORE the
  divergent implementation merges. Silent drift is a constitution violation.
- Playwright tests for a flow SHOULD assert the design-driven properties that
  define it (structure, labels, visible states), so fidelity regressions fail
  CI rather than waiting for a human to notice.

**Rationale**: When implementation silently diverges, design artifacts stop
being trustworthy and every review becomes a matter of opinion. Keeping design
as the single source of truth extends the authoring/implementation separation
(Principle IV) to the visual layer.

## Quality Gates & Testing Standards

These gates apply to every pull request:

- **Gate 1 — Unit tests**: New/changed logic has unit tests; full unit suite
  passes in CI.
- **Gate 2 — E2E tests**: New/changed user-facing flows have Playwright
  coverage; full E2E suite passes in CI.
- **Gate 3 — Boundary check**: No imports from GUI code into logic modules, no
  logic internals accessed from GUI, no authored content embedded in
  implementation code. Enforce mechanically where possible (lint rules,
  dependency-cruiser or equivalent import-boundary checks) and via review
  otherwise.
- **Gate 4 — Local reproducibility**: Any new test type or tooling added to CI
  MUST be runnable locally with a documented command before the CI step is
  merged.
- **Gate 5 — Comment discipline**: New/changed code contains no comments that
  restate the code, narrate changes, or address reviewers; remaining comments
  state non-inferable constraints or rationale only.
- **Gate 6 — Design fidelity**: UI changes match the referenced design
  artifact; any deviation is reflected in an updated design artifact or a
  recorded sign-off before merge.

Playwright tests MUST be deterministic: no arbitrary sleeps, use web-first
assertions and test fixtures. Flaky tests are fixed or quarantined with a
tracking issue within one working session — never silently retried forever.

## Development Workflow

- All work flows through the Spec Kit lifecycle: specify → plan → tasks →
  implement. Plans MUST pass the Constitution Check before implementation
  begins; violations require an explicit Complexity Tracking justification.
- Task lists generated for features MUST include test tasks (unit and, for
  user-facing stories, Playwright) — they are mandatory, not optional.
- Repository layout MUST reflect the boundaries: logic, GUI, and authored
  content live in distinct top-level directories (e.g., `src/logic/`,
  `src/gui/`, `content/`), with tests mirroring that split (`tests/unit/`,
  `tests/e2e/`).
- The GitHub Actions workflow is part of the codebase: changes to it are
  reviewed like any other code, and it MUST stay in sync with the locally
  documented commands.
- **Always commit and push**: every completed unit of work — a task, a spec or
  plan artifact, a constitution amendment — MUST be committed to git with a
  descriptive message and pushed to the remote immediately. Work MUST NOT
  accumulate uncommitted across work sessions; an interrupted session loses at
  most the unit in progress. Commits MUST be scoped to one logical change so
  history stays reviewable and revertable.

## Governance

This constitution supersedes all other development practices in this
repository. Where a plan, task list, or review conflicts with it, the
constitution wins.

- **Amendments**: Proposed via pull request that updates this file, states the
  rationale, and includes a Sync Impact Report. Dependent templates
  (`.specify/templates/*.md`) MUST be updated in the same change.
- **Versioning**: Semantic versioning. MAJOR for removing or redefining a
  principle in a backward-incompatible way; MINOR for adding a principle or
  materially expanding guidance; PATCH for clarifications and wording.
- **Compliance review**: Every plan's Constitution Check gates on the
  principles above. Every PR review verifies the Quality Gates. Deviations
  MUST be justified in the plan's Complexity Tracking table or rejected.

**Version**: 1.3.0 | **Ratified**: 2026-06-11 | **Last Amended**: 2026-06-11
