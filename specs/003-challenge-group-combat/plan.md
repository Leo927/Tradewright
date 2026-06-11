# Implementation Plan: Challenge & Group Combat Content

**Branch**: `003-challenge-group-combat` | **Date**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-challenge-group-combat/spec.md`

## Summary

Spec 003 layers challenge and social combat on top of the 002 combat core and the 001
engine/contract architecture: a shared **encounter system** (authored mechanic vocabulary —
phases, telegraphs with seconds-scale response windows, cooperative answers, enrage timers)
that powers solo mettle trials (V1+), 5-player dungeons, weekly affliction ladders, 10–20 player
raids, elite zones, eruption events, world bosses (~50 contributors), and settlement
invasions — all PvE, all no-ruin, all phone-first.

Technical approach: encounters run as **live instances** on a fast encounter tick (1 s)
nested inside the established 60 s world tick, with idle accrual suspended while inside.
Everything is authored content (encounter scripts, afflictions, modifier pools, score brackets)
validated by Zod schemas; everything crosses the GUI–logic seam through an extension of the
existing async command/query/event contract, so the same encounter engine serves V1
(in-process, mettle trials) and V2 (server-hosted rooms, all group formats) without client
redesign. Gear gains a gear-score + derived quality grade + modifier system (FR-270–272)
that ties challenge rewards into the crafting economy.

**Dependency note**: this plan builds strictly on spec 002 (control modes, schools/abilities/
tactics, gear, no-ruin). Spec 002 has a spec but **no plan yet** — its combat core must be
planned and implemented first. This plan defines 003's design so both can be sequenced; where
003 needs a 002 structure (e.g., ability/tactics shapes), it consumes the shapes 002's spec
fixes (FR-160–184) and records the assumption in research.md (R11).

## Technical Context

**Language/Version**: TypeScript 5.x (strict) everywhere — inherited from 001 plan

**Primary Dependencies**: React 18 + Vite (client GUI); Zod (content/state schema validation);
Vitest (unit tests); Playwright (E2E); Node.js 22 LTS. V2 (online): Fastify + ws (WebSocket) +
PostgreSQL — no new runtime dependencies introduced by this feature

**Storage**: V1 — IndexedDB device save (encounter/instance state joins the versioned save
format). V2 — PostgreSQL (instances, parties, signups, leaderboards, contribution records,
threat meters). Authored content — JSON in `packages/content/data/`, build-time validated

**Testing**: Vitest for unit (encounter engine, scoring, loot rolls, affliction scheduling,
content validation); Playwright for E2E (phone viewport: trial piloting, group board, dungeon
flow against simulated co-players in V1 test harness). Same commands as 001: `npm test`,
`npm run test:e2e`

**Target Platform**: Phone-first PWA, portrait 390×844 baseline (001 inherited). V2 server
targets Linux

**Project Type**: npm-workspaces monorepo (001 structure) — this feature adds engine modules,
contract extensions, content types, and client screens; no new packages

**Performance Goals**: UI acknowledges every interaction < 100 ms locally (Principle IX);
encounter tick 1 s with response windows ≥ 4 s (decision windows, never reflex); a world-boss
encounter sustains ~50 concurrent contributors with overflow credit (SC-209); session budgets:
dungeon ≤ 30 min, raid encounter ≤ 45 min, event ≤ 15 min (SC-207)

**Constraints**: Encounter engine is deterministic (state + content + seed + recorded inputs →
identical results) for testability and replayable audit; zero DOM/framework imports; all time
from the injected clock. Live instances suspend idle accrual (FR-205). Active mode is
decision-speed only — windows in seconds, all inputs discrete UI choices (FR-201). PvE-only
invariant: the mechanic vocabulary has no player-targeting damage primitive (SC-208).
No-ruin invariant in every format (FR-204)

**Scale/Scope**: 6 user stories; 8 content formats; launch content minimums: 1 trial ladder
(≥ 3 trials), 1 dungeon (+ 3 affliction levels), 1 raid (10-player), 1 elite zone, 1 eruption
event type, 1 world boss, invasion system for all settlements; gear modifier system
(pools, craft-mods, wards/resists) spanning the 002 gear set

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md` (v1.5.0):

- [x] **Test-First Quality (I)**: Encounter engine, mechanic resolution, contribution scoring,
  loot rolls, score brackets, affliction scheduling, threat meters, and content schemas all get
  Vitest suites (deterministic engine + injected clock makes seconds-scale windows testable
  without real waiting). Every user story gets Playwright flows on the phone viewport; group
  flows run against the V1 test harness with scripted co-players. Test tasks mandatory in
  tasks.md.
- [x] **CI/Local Test Parity (II)**: No new test types or tooling — same `npm test` /
  `npm run test:e2e` commands, same GitHub Actions pipeline as 001.
- [x] **Separation of Concerns (III)**: New engine modules (`encounter/`, `group/`,
  `worldevents/`, `gearmods/`) each own one responsibility; dependency direction unchanged
  (client → contract ← engine ← content), enforced by dependency-cruiser in CI.
- [x] **Authoring–Implementation Separation (IV)**: Every format is authored content —
  encounter scripts (phases/telegraphs/answers), affliction modifier sets, modifier pools and
  odds, score brackets, contribution weights, threat-meter rates — as JSON in
  `packages/content/data/`, Zod-validated at build time ([contracts/content-schema.md](./contracts/content-schema.md)).
  The engine interprets the mechanic vocabulary; it never embeds an encounter.
- [x] **GUI–Logic Boundary (V)**: All new interactions extend the existing serializable
  command/query/event protocol ([contracts/challenge-protocol.md](./contracts/challenge-protocol.md)).
  The encounter engine has no DOM/React imports; V1 binds it in-process, V2 hosts the same
  engine in server rooms — the multiplayer formats are precisely the architecture test.
- [x] **UI Design Fidelity (VII)**: Each UI story (trial HUD, group board, affliction board,
  raid signup, event/boss banners, warboard) gets a design artifact in
  `specs/003-challenge-group-combat/design/` before its implementation tasks; tasks reference
  the artifact.
- [x] **Explorable UX (VIII)**: Per-screen primary task / deferred depth declared in each
  design artifact (e.g., encounter HUD shows boss bar + active telegraph + answer buttons;
  mechanic journal, combat log, and contribution detail live one tap deeper).
- [x] **Latency-Tolerant Client (IX)**: Every interaction classified in
  [contracts/challenge-protocol.md](./contracts/challenge-protocol.md): browsing/journals are
  local-immediate; signups/listings are optimistic-with-reconciliation; encounter answers are
  optimistic with server reconciliation inside the answer window (client counts down locally,
  server validates with a stated grace; rejection rolls back visibly). No interaction blocks
  the UI on a round-trip — in V1 everything resolves locally within the tick.

**Sequencing deviation note (not a constitution violation)**: spec 002 is unplanned. 003's
design consumes only shapes that 002's spec already fixes (control modes FR-180–184, ability/
tactics structure FR-160–169, gear FR-120–123, no-ruin FR-130–132). If 002's plan changes
those shapes, this plan's research.md (R11) flags the touchpoints to re-verify.

## Project Structure

### Documentation (this feature)

```text
specs/003-challenge-group-combat/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── challenge-protocol.md   # Contract extension: encounter/group commands, queries, events
│   └── content-schema.md       # Content extension: encounters, afflictions, modifiers, formats
├── design/              # UI design artifacts, one per screen group (created during impl)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

Extends the 001 monorepo; no new packages. New modules marked **(new)**:

```text
packages/
├── contract/
│   └── src/
│       ├── ...                  # 001/002 protocol types
│       └── challenge/           # (new) encounter, party, signup, event DTOs + commands/
│                                #   queries/events + error codes (serializable only)
├── engine/
│   ├── src/
│   │   ├── ...                  # 001 modules (world, skills, market, npc, caravan, simulation)
│   │   ├── combat/              # 002 modules (schools, abilities, tactics, expeditions) —
│   │   │                        #   prerequisite, planned by 002
│   │   ├── encounter/           # (new) encounter instance runtime: 1 s encounter tick,
│   │   │                        #   phase scripts, telegraph/answer resolution, cooperative
│   │   │                        #   answers, enrage, wipe/no-ruin, scoring, loot rolls
│   │   ├── group/               # (new) parties, group board listings, backfill, leadership
│   │   │                        #   transfer, raid signups/waitlists
│   │   ├── worldevents/         # (new) elite-zone engagements, eruption events, world-boss
│   │   │                        #   windows, invasions: threat meters, wave resolution,
│   │   │                        #   facility degradation/repair, contribution records
│   │   ├── gearmods/            # (new) gear score, quality grades, modifier pools, rolls,
│   │   │                        #   craft-mod locking, ward/resist counter-mapping
│   │   └── adapter/             # LocalGameHost gains challenge command/query/event handling
│   └── tests/
├── content/
│   ├── schemas/                 # (new) encounter, affliction, modifier, format schemas (Zod)
│   ├── data/
│   │   ├── ...                  # 001/002 content
│   │   ├── encounters/          # (new) trials, dungeon encounters, raid encounters, bosses
│   │   ├── afflictions/           # (new) modifier sets, levels, counter-mappings, brackets
│   │   ├── gear-modifiers/      # (new) modifier pools, odds, craft-mod recipes, grades
│   │   └── formats/             # (new) zones, events, world bosses, invasion/threat configs
│   └── tests/                   # content-integrity: every exclusive material demanded by a
│                                #   recipe (SC-205); no PvP-capable mechanic (SC-208)
apps/
├── client/
│   ├── src/
│   │   ├── screens/
│   │   │   ├── ...              # 001/002 screens
│   │   │   ├── encounter/       # (new) live encounter HUD (telegraphs, answers, auto toggle)
│   │   │   ├── groupboard/      # (new) listings, party fill, backfill, raid signup
│   │   │   ├── challenges/      # (new) trial ladder, affliction board, leaderboards, journal
│   │   │   └── settlement/      # warboard + threat meter + event banners join settlement home
│   │   └── ...
│   └── tests/e2e/               # (new) trial, dungeon, affliction, signup, invasion flows
└── server/                      # V2: room hosting for group instances, group-board state,
                                 #   rotation/spawn/threat schedulers (same engine modules)
```

**Structure Decision**: Stay inside the 001 four-package monorepo — the constitution's
boundaries are already physical there. Challenge logic lands as four new engine modules with
single responsibilities; all multiplayer-only state (rooms, boards, schedules) lives behind
the same contract so V1 ships mettle trials in-process and V2 activates group formats by
hosting the identical modules server-side (FR-262).

## Version Strategy (V1 ↔ V2)

| Concern | V1 — Solo | V2 — Online |
|---------|-----------|-------------|
| Mettle trials | Fully playable in-process | Same, server-validated |
| Encounter engine | Same `encounter/` module, local instance | Same module in server-hosted rooms |
| Group formats (dungeons, afflictions, raids, zones, events, bosses, invasions) | Visible, honestly labeled "online version" (FR-262); exercised by automated test harness with scripted co-players | Active; group board, rotation/spawn/threat schedulers live on server |
| Answers in active mode | Resolve locally within the tick | Optimistic with server reconciliation inside the window grace |
| Loot / scores / contribution | Local seeded rolls | Server-authoritative rolls and records |
| Idle accrual in instances | Suspended locally (FR-205) | Suspended server-side |

Behavioral parity remains a test target: the encounter test suite runs identically against
the in-process host and the server room host for the same recorded input streams.

## Milestones

Builds after 002's combat core (M-002). Story order follows spec priorities:

1. **M3.0 — Encounter system + Mettle trials (US1, V1-shippable)**: encounter tick, mechanic
   vocabulary, active control + auto-AI takeover, score brackets, trial ladder content,
   gear-score/grade/modifier foundation (FR-270–271 needed for trial rewards).
2. **M3.1 — Parties + Dungeons (US2, V2)**: group board, party lifecycle, backfill/leadership
   rules, cooperative mechanics, personal loot, launch dungeon.
3. **M3.2 — Afflictions (US3)**: weekly rotation scheduler, modifier sets + ward/resist
   counters (FR-272), qualification gates, scoring, leaderboards.
4. **M3.3 — Raids (US4)**: signup/scheduling tools, sub-group mechanics, 10/20 tuning.
5. **M3.4 — Open world (US5)**: elite-zone party isolation, eruption events + caravan-risk
   tie-in, world bosses + contribution records at ~50 scale.
6. **M3.5 — Invasions (US6)**: threat meters, warboard, station lanes, wave resolution,
   facility degradation + contribution repair + self-restore.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none — all gates pass) | | |
