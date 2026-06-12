# Implementation Plan: Relic Gear & Delve Descents

**Branch**: `004-artifacts-catacomb` | **Date**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-artifacts-catacomb/spec.md`

## Summary

Spec 004 un-defers the two largest features 003 parked: **relics** — named, one-of-a-kind,
fully tradable gear items whose permanent signature modifiers define builds, earned once per
character from disclosed challenge-format sources and progressed through material-hungry
awakening tracks — and **delves** — procedurally assembled descent dungeons for parties of
1–3, structured as ≤ 5-minute floors with a withdraw-or-descend stake at every landing,
where only the unbanked venture bonus pool is ever at risk (no-ruin, 003 FR-204 binding).

Technical approach: relics are ordinary 003 gear instances with awakening state on the item
and a flagged signature entry in the existing modifier vocabulary; uniqueness is enforced at
the two acquisition edges (source grant record + trade delivery check), never by item
binding. Delves are a `DescentInstance` meta-runtime over the 003 encounter engine: floors
are standard encounter instances; floor assembly, depth curves, and the weekly expedition
seed are pure functions over authored pools (rooms, encounters, depth modifiers — assembly
systemic, content authored). The venture pool is per-member entitlement ledgers — staked
value is never owned property, so the forfeit is a wager by construction. Everything crosses
the GUI–logic seam through additive extensions of the async command/query/event contract;
the same reducers serve V1 (in-process: solo delves, mettle-trial relic) and V2
(server-hosted party descents) without client redesign.

**Dependency note**: builds strictly on 002 (gear, equip, no-ruin, control modes — spec
fixed, **plan still pending**) and 003 (encounter runtime, modifier/gear-score system,
group/leadership rules, reward tables — planned). Research R11 carries 003's approach
forward: bind only to spec-fixed shapes, with named touchpoints to re-verify when 002 is
planned.

## Technical Context

**Language/Version**: TypeScript 5.x (strict) everywhere — inherited from 001 plan

**Primary Dependencies**: React 18 + Vite (client GUI); Zod (content/state schema
validation); Vitest (unit tests); Playwright (E2E); Node.js 22 LTS. V2 (online): Fastify +
ws + PostgreSQL — no new runtime dependencies introduced by this feature

**Storage**: V1 — IndexedDB device save (relic grant records, awakening progress, descent
state, depth records join the versioned save format). V2 — PostgreSQL (grants, descents,
ledgers, leaderboards). Authored content — JSON in `packages/content/data/`, build-time
validated

**Testing**: Vitest for unit (relic grant/trade edges, awakening steps, floor assembly
determinism, ledger accounting, landing protocol, curves, weekly seed, content validation);
Playwright for E2E (phone viewport: compendium, equip/swap, awakening, delve entry, landing
decisions, leaderboards). Same commands as 001/003: `npm test`, `npm run test:e2e`

**Target Platform**: Phone-first PWA, portrait 390×844 baseline (001 inherited). V2 server
targets Linux

**Project Type**: npm-workspaces monorepo (001 structure) — this feature adds two engine
modules, contract extensions, content types, and client screens; no new packages

**Performance Goals**: UI acknowledges every interaction < 100 ms locally (Principle IX);
floor assembly is a pure function evaluated lazily per descend (no pre-generation, no
perceptible pause at landings); descent floors target ≤ 5 minutes, first landing within
~10 minutes of entry (SC-305); encounter tick remains 1 s (003 R1)

**Constraints**: Determinism end-to-end — identical (seed, party inputs) reproduce an
identical descent (FR-310, SC-307); unbounded depth means all curves/pools total over every
depth ≥ 1, generated lazily; staked pool is entitlements, never owned property (no-ruin by
construction, SC-306); zero DOM/framework imports in engine; all time from the injected
clock; live-session-only descents suspend idle accrual (003 FR-205); relic uniqueness
enforced at acquisition edges only — no bound-item class exists anywhere

**Scale/Scope**: 4 user stories; 2 engine modules (`relics/`, `delve/`); launch content
(content decisions, not code constraints): 6–10 relics spanning all source formats with
≥ 1 V1-obtainable, 2–3 delve sites in distinct regions; ~5 new client screen groups;
weekly seed cadence aligned with the 003 affliction rotation week

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md` (v1.5.0):

- [x] **Test-First Quality (I)**: Pure-function cores (floor assembly, curves, weekly seed,
  ledger accounting, grade derivation) plus edge-enforcement rules (grant-once, trade
  block, equip limit, landing protocol) all get Vitest suites — determinism makes SC-304/
  306/307 audits deterministic CI properties. Every user story gets Playwright flows on the
  phone viewport; party descents run against the 003 scripted co-player harness in V1 CI.
  Test tasks mandatory in tasks.md.
- [x] **CI/Local Test Parity (II)**: No new test types or tooling — same `npm test` /
  `npm run test:e2e` commands, same GitHub Actions pipeline as 001/003.
- [x] **Separation of Concerns (III)**: Two new engine modules with single
  responsibilities — `relics/` (grants, awakening, uniqueness edges) and `delve/` (descent
  runtime, assembly, ledgers, records); floor combat stays in 003's `encounter/`; trade
  checks extend the existing market/escrow seams. Dependency direction unchanged
  (client → contract ← engine ← content), enforced by dependency-cruiser in CI.
- [x] **Authoring–Implementation Separation (IV)**: Relics, signature modifiers, awakening
  tracks, sites, rooms, depth modifiers, venture tables, curves, caps — all JSON in
  `packages/content/data/`, Zod-validated ([contracts/content-schema.md](./contracts/content-schema.md)).
  Rooms/encounters/modifiers are authored; only assembly is systemic (spec Out of Scope,
  research R4). Adding a relic or site never touches code.
- [x] **GUI–Logic Boundary (V)**: All new interactions extend the serializable
  command/query/event protocol ([contracts/relic-delve-protocol.md](./contracts/relic-delve-protocol.md)).
  Engine modules have no DOM/React imports; V1 binds in-process, V2 hosts the same descent
  reducer in server rooms (003 R3 two-host rule) — party delves are the architecture test.
- [x] **UI Design Fidelity (VII)**: Each UI story (compendium, awakening track, delve entry
  sheet, landing decision sheet, depth records/leaderboards) gets a design artifact in
  `specs/004-artifacts-catacomb/design/` before its implementation tasks; tasks reference
  the artifact.
- [x] **Explorable UX (VIII)**: Per-screen primary task / deferred depth declared in each
  design artifact (e.g., landing sheet shows pool value + the two choices + next-floor
  preview; ledger detail, curve charts, and stake rules live one tap deeper; compendium
  list leads, full modifier/lore/track detail on drill-down).
- [x] **Latency-Tolerant Client (IX)**: Every interaction classified in
  [contracts/relic-delve-protocol.md](./contracts/relic-delve-protocol.md):
  compendium/sites/records are local-immediate; equip/swap and ready-check responses are
  optimistic-with-reconciliation; awakening confirmation, modifier locks, landing
  decisions, and payouts are server-confirmed with operation-scoped pending state (V1
  resolves same-tick, feels instant); floor combat keeps 003's windowed rule. No
  interaction blocks the UI.

**Post-design re-check (Phase 1)**: all gates still pass — the design added no violations;
Complexity Tracking stays empty.

**Sequencing deviation note (not a constitution violation)**: spec 002 remains unplanned.
004 binds only to shapes fixed by 002's spec and 003's plan; research R11 names the three
touchpoints to re-verify when 002's plan lands (equip path, item-instance representation,
inert-modifier flagging).

## Project Structure

### Documentation (this feature)

```text
specs/004-artifacts-catacomb/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── relic-delve-protocol.md  # Contract extension: relic/delve commands, queries, events
│   └── content-schema.md        # Content extension: relics, signatures, sites, pools, curves
├── design/              # UI design artifacts, one per screen group (created during impl)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

Extends the 001 monorepo; no new packages. New modules marked **(new)**:

```text
packages/
├── contract/
│   └── src/
│       ├── ...                  # 001/002/003 protocol types
│       ├── relics/              # (new) compendium/awakening DTOs, equip-limit + trade
│       │                        #   error codes, relic commands/queries/events
│       └── delve/               # (new) site/descent/landing/ledger DTOs, commands/
│                                #   queries/events (serializable only)
├── engine/
│   ├── src/
│   │   ├── ...                  # 001 modules (world, skills, market, npc, caravan, …)
│   │   ├── combat/              # 002 modules — prerequisite, planned by 002
│   │   ├── encounter/           # 003 — floor combat reused as-is
│   │   ├── group/               # 003 — party/leadership reused at landings
│   │   ├── gearmods/            # 003 — extended: signatureOf exclusion in pools/craft-mod
│   │   ├── relics/              # (new) grant records + grant-once rule, duplicate
│   │   │                        #   compensation, awakening steps (deeds, materials,
│   │   │                        #   unseal), equip-limit validation, trade-delivery check
│   │   ├── delve/               # (new) descent runtime: floor assembly (pure fn), depth/
│   │   │                        #   multiplier/scaling curves, landing ready-check +
│   │   │                        #   opt-out, venture ledgers, wipe/withdraw resolution,
│   │   │                        #   depth records, weekly seed + leaderboard
│   │   └── adapter/             # LocalGameHost gains relic/delve command/query/event
│   │                            #   handling (V1: solo descents, trial-source relic)
│   └── tests/
├── content/
│   ├── schemas/                 # (new) relics/, delves/ Zod schemas
│   ├── data/
│   │   ├── ...                  # 001/002/003 content
│   │   ├── relics/              # (new) RelicDefs + signature GearModifierDefs
│   │   └── delves/              # (new) sites, rooms, depth-modifiers, venture tables,
│   │                            #   reward-cap lever (inactive)
│   └── tests/                   # integrity tests 1–9 (contracts/content-schema.md)
apps/
├── client/
│   ├── src/
│   │   ├── screens/
│   │   │   ├── ...              # 001/002/003 screens (encounter HUD reused for floors)
│   │   │   ├── relics/          # (new) compendium, relic detail + awakening track,
│   │   │   │                    #   equip-conflict swap sheet
│   │   │   └── delve/          # (new) site entry sheet, landing decision sheet
│   │   │                        #   (ready-check, opt-out), depth records + weekly
│   │   │                        #   leaderboard
│   │   └── ...
│   └── tests/e2e/               # (new) relic chase/trade/awakening, delve loop flows
└── server/                      # V2: descent rooms host the same delve reducer; grants,
                                 #   ledgers, leaderboards server-authoritative
```

**Structure Decision**: Stay inside the 001 four-package monorepo — the constitution's
boundaries are already physical there. Two new engine modules keep responsibilities single:
`relics/` owns acquisition/awakening rules, `delve/` owns the descent runtime; floor combat,
parties, and gear modifiers are consumed from 003's modules, not duplicated. All
multiplayer-only behavior (party descents, shared leaderboards) lives behind the same
contract so V1 ships solo delves + the trial relic in-process and V2 activates parties by
hosting the identical reducer server-side (FR-318).

## Version Strategy (V1 ↔ V2)

| Concern | V1 — Solo | V2 — Online |
|---------|-----------|-------------|
| Solo delves (party of one) | Fully playable in-process | Same, server-validated |
| Party descents (2–3) | Visible, honestly labeled "online version" (003 FR-262); exercised by scripted co-player harness in CI | Active; descent rooms host the same reducer |
| Relic sources | Mettle-trial source live; multiplayer sources honestly labeled in compendium | All sources live |
| Relic trade + uniqueness check | Local engine enforces at delivery | Server-authoritative at delivery |
| Awakening / modifier locks | Resolve locally same tick | Server-confirmed, operation-scoped pending |
| Weekly expedition + leaderboard | Solo entries, local week derivation | Shared seed server-evaluated; global per-site boards |
| Idle accrual in descents | Suspended locally (003 FR-205) | Suspended server-side |

Behavioral parity remains a test target: the descent test suite runs identically against the
in-process host and the server room host for the same recorded input streams.

## Milestones

Builds after 002's combat core and 003's M3.0 (encounter system + gear modifier
foundation). Story order follows spec priorities:

1. **M4.0 — Relic core (US1, V1-shippable)**: RelicDef/signature content types + integrity
   tests, grant-once records + duplicate compensation, trade-delivery uniqueness check,
   equip-limit category rule + guided swap, compendium (query + screen), one V1
   mettle-trial relic.
2. **M4.1 — Awakening (US2)**: deed counters, step confirmation (consume + unseal),
   craft-mod slot locking reuse + re-lock, awakening track UI, awakening-economy content
   tests (SC-303).
3. **M4.2 — Delve core (US3, V1-solo-shippable)**: site/room/pool content types, floor
   assembly function + determinism property tests, DescentInstance runtime over 003
   encounters, venture ledgers + two-stream rewards, landing ready-check/opt-out/
   auto-withdraw protocol, wipe/withdraw resolution, entry + landing screens.
4. **M4.3 — Depth ladder (US4)**: difficulty/multiplier/scaling curve evaluation +
   disclosure surfaces, under-size honesty warning, per-site depth records, weekly seed
   function + recognition leaderboard, delve-depth relic sources wired to M4.0 grants,
   delve-material economy interlock tests (FR-316).

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none — all gates pass) | | |
