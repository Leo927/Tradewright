# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md` (v1.5.0):

- [ ] **Test-First Quality (I)**: Plan includes unit test tasks for all new/changed
  logic and Playwright E2E tasks for all new/changed user-facing flows. Tests are
  NOT optional.
- [ ] **CI/Local Test Parity (II)**: Any new test type or tooling is wired into the
  GitHub Actions pipeline AND runnable locally via a single documented command
  (same command in both).
- [ ] **Separation of Concerns (III)**: Each new module has a single stated
  responsibility; dependencies point one direction (GUI → logic, never reverse).
- [ ] **Authoring–Implementation Separation (IV)**: Authored content (definitions,
  data, copy, scenarios) lives as declarative data in its own directory tree with
  schema validation — never hard-coded in implementation source.
- [ ] **GUI–Logic Boundary (V)**: GUI and logic communicate only through the
  defined serializable contract interface; logic has no GUI/DOM/framework
  dependencies and could move to a separate server without GUI changes.
- [ ] **UI Design Fidelity (VII)**: Each UI story/flow in the plan identifies
  the design artifact it implements; implementation tasks reference it and do
  not deviate without a recorded design update or sign-off.
- [ ] **Explorable UX (VIII)**: Each UI surface's design artifact states its
  primary task and what is deferred to deeper layers; primary screens stay
  clean, depth is reachable via visible affordances, primary actions are never
  buried.
- [ ] **Latency-Tolerant Client (IX)**: Each interaction in the plan is
  classified as local-immediate, optimistic-with-reconciliation, or
  server-confirmed-with-pending-state; no interaction blocks the UI on a
  round-trip, and the GUI–logic contract stays asynchronous.

Violations MUST be justified in Complexity Tracking below or the plan reworked.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
