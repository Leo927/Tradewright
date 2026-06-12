# Implementation Plan: Tradewright — Core Game

**Branch**: `master` | **Date**: 2026-06-11 (updated 2026-06-12) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-tradewright-core/spec.md`

**Provenance**: Merged 2026-06-11 from the former plans of specs 001 and 003–004 (spec
collapse). The former spec 002 (combat core) never had a plan; that gap was closed by the
2026-06-12 combat design pass (research Part IV, data-model/protocol/content-schema
Part II), unblocked by the clarification rounds that resolved Q1–Q6.

## Summary

Tradewright ships as **two versions sharing one game engine behind one contract**:

- **V1 — Solo**: fully playable single-player game. The complete loop (gather → refine →
  craft → caravan arbitrage between towns, plus combat expeditions, mettle trials, relics,
  and solo delves) runs against an in-process game engine with NPC-simulated settlement
  markets whose prices drift with supply and demand. Offline progression via deterministic
  fast-forward. Saves locally on device.
- **V2 — Online**: the same client connects to a server running the same engine
  authoritatively; markets are driven by real players (with configurable NPC liquidity) and
  the multiplayer formats (dungeons, afflictions, raids, open-world events, invasions,
  party delves) activate. Same contract, different transport.

**Both versions stay alive permanently.** V1 is the offline/solo mode and the
development/test harness; V2 is the shared world. The constitution's GUI–Logic Boundary
(Principle V) is exactly this seam: the client talks to a serializable async contract, and
V1 (local adapter) vs V2 (remote adapter) differ only in transport.

Layered technical approach, one engine throughout:

- **Economy core**: deterministic world tick (60 s), offline fast-forward, per-settlement
  order books, NPC market simulation, caravan/travel timers.
- **Combat core**: auto-resolving expeditions executing builds (schools, abilities, trees,
  tactics) on a shared deterministic 1 s combat resolver nested in the world tick; the
  five-attribute stat pipeline and threat-table targeting (FR-107/108) are authored
  curves the resolver evaluates; the tactics engine doubles as the auto AI everywhere.
- **Challenge layer**: encounters run as live instances on a fast encounter tick (1 s)
  nested inside the 60 s world tick, with idle accrual suspended inside; an authored
  mechanic vocabulary (phases, telegraphs ≥ 4 s windows, cooperative answers, enrage)
  powers every format; gear gains the gear-score/quality-grade/modifier system (FR-270–272).
- **Relics & delves**: relics are ordinary gear instances with awakening state on the item
  and signature entries in the modifier vocabulary; uniqueness is enforced at the two
  acquisition edges (source grant record + trade delivery check), never by item binding.
  Delves are a `DescentInstance` meta-runtime over the encounter engine: floors are standard
  encounter instances; assembly, depth curves, and the weekly seed are pure functions over
  authored pools; the venture pool is per-member entitlement ledgers — staked value is never
  owned property, so the forfeit is a wager by construction.

## Technical Context

**Language/Version**: TypeScript 5.x (strict) everywhere — client, engine, content tooling,
server

**Primary Dependencies**: React 18 + Vite (client GUI); Zod (content/state schema
validation); Vitest (unit tests); Playwright (E2E); Node.js 22 LTS; PWA service worker
(install + opt-in device-scheduled notifications in V1; Web Push delivery in V2 — FR-064,
research R15); V2 adds Fastify + ws (WebSocket) + PostgreSQL

**Storage**: V1 — IndexedDB on device (versioned save format; expedition/instance/descent
state, relic grants, depth records all join it). V2 — PostgreSQL on server (plus parties,
signups, leaderboards, contribution records, threat meters, grants, ledgers). Authored
content — JSON files in repo, schema-validated at build time

**Testing**: Vitest for unit (engine, content validation, adapters, encounter resolution,
scoring, loot rolls, floor assembly, ledger accounting); Playwright for E2E flows (phone
viewport; group flows run against a scripted co-player harness in V1 CI); both wired into
GitHub Actions and runnable locally with the same commands (`npm test`, `npm run test:e2e`)

**Target Platform**: Phone-first web app (PWA), portrait 390×844 baseline; desktop browsers
work but are not the design target. V2 server targets Linux

**Project Type**: npm-workspaces monorepo — shared packages + client app (+ server app for
V2)

**Performance Goals**: Every interaction acknowledges < 100 ms locally (Principle IX);
offline catch-up of a 24 h absence computes in < 3 s on a mid-range phone (SC-002); world
tick 60 s, encounter tick 1 s with response windows ≥ 4 s; a world-boss encounter sustains
~50 concurrent contributors with overflow credit (SC-209); session budgets: dungeon ≤ 30
min, raid encounter ≤ 45 min, event ≤ 15 min (SC-207), first delve landing within ~10 min
(SC-305); V2 sustains 10 k concurrent players (SC-008, validated by load simulation in the
V2 milestone)

**Constraints**: Engine is deterministic (state + content + elapsed time + seed → identical
results) — required for offline catch-up correctness (SC-005), offline/online combat parity
(SC-103), descent reproducibility (SC-307), unit testability, and V1/V2 behavioral parity.
Engine has zero DOM/framework imports. All time comes from an injected clock. Live instances
suspend idle accrual (FR-205). The mechanic vocabulary has no player-targeting damage
primitive (SC-208). No-ruin in every format (FR-204); staked delve pools are entitlements,
never owned property (SC-306)

**Scale/Scope**: 23 user stories across four pillars; 18 skill tracks (5 gathering, 5
refining, 7 crafting — New World's full trade-skill family structure — plus hauling),
≥ 4 settlements,
single currency; 2 combat schools at launch; 8 challenge formats with launch minimums
(1 trial ladder ≥ 3 trials, 1 dungeon + 3 affliction levels, 1 raid, 1 elite zone, 1 event
type, 1 world boss, invasions for all settlements); 6–10 relics (≥ 1 V1-obtainable), 2–3
delve sites; two delivery tracks (V1 solo, V2 online) sharing ~80% of code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md` (v1.6.0):

- [x] **Test-First Quality (I)**: Engine, content schemas, adapters, encounter resolution,
  scoring, ledgers, and assembly functions all get Vitest suites; the injected-clock,
  deterministic design makes idle timing, seconds-scale windows, and SC-304/306/307 audits
  testable without real waiting. Every user story gets Playwright flows (phone viewport);
  group flows use the scripted co-player harness in V1 CI. Test tasks mandatory in tasks.md.
- [x] **CI/Local Test Parity (II)**: Single commands — `npm test` (Vitest),
  `npm run test:e2e` (Playwright) — invoked verbatim by GitHub Actions
  (`.github/workflows/ci.yml`). No CI-only logic.
- [x] **Separation of Concerns (III)**: Four-way split: `contract` (types only) ← `engine`
  (pure logic) ← `content` (data + schemas) ← `apps/client` (GUI). Engine modules each own
  one responsibility (world, skills, market, npc, caravan, combat, encounter, group,
  worldevents, gearmods, relics, delve, simulation, adapter). Dependencies point one way;
  enforced mechanically with dependency-cruiser in CI.
- [x] **Authoring–Implementation Separation (IV)**: All game content — skills, items,
  recipes, settlements, routes, NPC profiles, schools, abilities, trees, enemies, drop
  tables, encounters, afflictions, modifier pools, score brackets, contribution weights,
  relics, awakening tracks, delve sites/rooms/curves, and every "content-tunable" lever —
  is JSON in `packages/content/data/`, validated by Zod schemas at build time
  ([contracts/content-schema.md](./contracts/content-schema.md)). Engine code never embeds
  content values.
- [x] **GUI–Logic Boundary (V)**: Client depends only on `@tradewright/contract`
  (serializable command/query/event protocol,
  [contracts/game-protocol.md](./contracts/game-protocol.md)). Engine has no DOM/React
  imports. V1 binds in-process, V2 hosts the same engine modules in server rooms — the
  multiplayer formats are precisely the architecture test, shipped as a product requirement
  ("keep both versions alive").
- [x] **UI Design Fidelity (VII)**: Each UI story gets a design artifact in
  `specs/001-tradewright-core/design/` (screen inventory, layout, states) before its
  implementation tasks; implementation references it (enforced in tasks.md ordering).
- [x] **Explorable UX (VIII)**: Design artifacts must declare primary task vs deferred depth
  per screen (e.g., settlement home shows current activity + collect; order-book depth one
  tap deeper; encounter HUD shows boss bar + active telegraph + answers, mechanic journal
  one tap deeper; landing sheet shows pool value + two choices, ledger detail deeper).
- [x] **Latency-Tolerant Client (IX)**: The contract is async command/event from day one.
  Every interaction is classified (local-immediate / optimistic / server-confirmed-pending)
  in the protocol contract; encounter answers are optimistic with server reconciliation
  inside the answer window; in V1 everything resolves locally (< 100 ms). No
  request-blocked interactions exist in the contract.
- [x] **No Stale Content (X)**: This plan and spec replace the four amendment-chained spec
  directories in the same change that obsoleted them (the 2026-06-11 collapse). Going
  forward: any change that invalidates a part of the merged spec/plan/contracts updates that
  part in the same change — no superseded-but-retained design text.

**Post-design re-check (2026-06-12)**: re-evaluated after the combat design pass and the
platform additions (FR-037/054/063/064) — all gates still pass. The combat layer lands on
the existing seams (content-defined schools/abilities/curves per IV, resolver behind the
contract per V, classification extended per IX) and this update removed every artifact
statement the clarifications invalidated (X). Complexity Tracking stays empty.

**V1 time-integrity note**: FR-017 scopes its full guarantee to V2, where the server owns
time (spec-aligned 2026-06-12; formerly recorded here as a spec deviation). V1 applies the
best-effort integrity FR-017 mandates: monotonic clamp, persisted last-seen timestamp,
optional network time check; clock cheating affects only the cheater's solo world.
Mechanism in research.md (R8, economy).

## Known Design Gaps (resolve before the affected milestone)

The two gaps recorded at merge time are closed:

1. **Combat core — designed 2026-06-12**: the combat design pass produced research Part IV
   (combat), data-model Part II, protocol Part II, and content-schema Part II. The
   challenge and relic/delve touchpoints flagged for re-verification (combat tick rate,
   item-instance representation, auto-AI interface, equip path, inert-modifier flagging)
   are all verified — see the R11 resolution notes in [research.md](./research.md).
2. **Open Questions Q1–Q6 — resolved in the spec**: the 2026-06-11 core-game clarification
   round resolved Q1–Q5 (character tier → FR-211 definition; stat vocabulary → FR-107;
   group-combat semantics → FR-108; coin faucets → FR-053/054; settlement facilities →
   FR-037) and the 2026-06-12 session resolved Q6 (combat onboarding → FR-113) plus the
   platform ambiguities (V1 device-local saves → FR-003, no V1→V2 migration → FR-004,
   V2 offline behavior → FR-063, push notifications → FR-064). All are integrated into
   the design artifacts (data-model Part I/II additions, protocol Part I/II additions,
   research R13–R15).

One named work item remains (not a design gap — a tuning precondition): the **joint
economy model** (spec, Economy Budget "open modeling debt") — the recipe-demand and
income-parity mandates (SC-006/007/105/106/205, SC-303) are asserted pairwise but no
model yet shows them holding jointly at launch content scale. Its shape is now fixed:
research R16 (economy) defines the simulated-actor behavior model, the "healthy world"
and "equivalent investment" definitions, and the deterministic green/red criterion.
Run and tune it during M1 content tuning (tasks T093), before the recipe set is
declared launch-shaped.

## Project Structure

### Documentation (this feature)

```text
specs/001-tradewright-core/
├── spec.md              # The unified core-game specification (23 stories, FR-0xx–FR-3xx)
├── plan.md              # This file
├── research.md          # Merged research (Parts: economy / challenge / relic & delve / combat)
├── data-model.md        # Merged data model (Part II = combat, designed 2026-06-12)
├── quickstart.md        # Merged quickstart scenarios (Part II = combat validation)
├── contracts/
│   ├── game-protocol.md # Unified command/query/event contract (Part II = combat)
│   └── content-schema.md# Unified authored-content contract (Part II = combat)
├── checklists/
│   └── requirements.md  # Merged spec-quality checklists (historical, all four layers)
├── design/              # UI design artifacts, one per screen group (created during impl)
└── tasks.md             # Phase 2 output (/speckit-tasks — regenerate per milestone)
```

### Source Code (repository root)

```text
packages/
├── contract/            # @tradewright/contract — protocol types ONLY (commands, queries,
│   └── src/             #   events, DTOs, error codes). Zero runtime logic. Everything
│       ├── ...          #   JSON-serializable. Economy types from M0.
│       ├── combat/      #   M2: expedition, loadout, tactics, school/tree DTOs
│       ├── challenge/   #   M3/M6: encounter, party, signup, event DTOs
│       ├── relics/      #   M4: compendium/awakening DTOs, equip/trade error codes
│       └── delve/       #   M4: site/descent/landing/ledger DTOs
├── engine/              # @tradewright/engine — the game. Pure TS, deterministic, no DOM.
│   ├── src/
│   │   ├── world/       #   world state, settlements, storage, wallet
│   │   ├── skills/      #   activities, XP curves, tiers, assignment
│   │   ├── market/      #   order book, matching, escrow, fees/taxes
│   │   ├── npc/         #   NPC market simulation (supply/demand drift) [V1-critical]
│   │   ├── caravan/     #   shipments, routes, risk resolution, travel
│   │   ├── combat/      #   M2: combat resolver (1 s tick), schools, tactics, expeditions
│   │   ├── encounter/   #   M3: 1 s encounter tick, mechanic resolution, scoring, loot
│   │   ├── group/       #   M6: parties, group board, backfill, leadership, signups
│   │   ├── worldevents/ #   M6: elite zones, events, world bosses, invasions, threat
│   │   ├── gearmods/    #   M3: gear score, quality grades, modifier pools, craft-mods
│   │   ├── relics/      #   M4: grants, awakening, uniqueness edges, equip limits
│   │   ├── delve/       #   M4: descent runtime, floor assembly, ledgers, depth records
│   │   ├── simulation/  #   tick loop, offline fast-forward, seeded RNG, injected clock
│   │   └── adapter/     #   LocalGameHost: implements the contract over the engine
│   └── tests/           #   unit tests (Vitest)
├── content/             # @tradewright/content — authored game data + schemas
│   ├── schemas/         #   Zod schemas (the content contract, executable form)
│   ├── data/            #   JSON — combined tree in contracts/content-schema.md
│   └── tests/           #   schema validation + content-integrity tests (all Parts' gates)
apps/
├── client/              # React PWA. GUI ONLY — no game rules anywhere in here.
│   ├── src/
│   │   ├── transport/   #   LocalTransport (in-process) / RemoteTransport (V2 WebSocket)
│   │   ├── persistence/ #   IndexedDB save/load — V1 device-local saves (FR-003)
│   │   ├── notifications/ # V1 device-scheduled notification delivery (FR-064)
│   │   ├── screens/     #   settlement, skills, market, transactions, caravans, map,
│   │   │                #   summary, storage, settings, combat, encounter HUD,
│   │   │                #   group board, challenges, relics, delve
│   │   ├── components/  #   shared UI primitives
│   │   └── state/       #   GUI-side view state (subscriptions to contract events)
│   └── tests/e2e/       #   Playwright flows, phone viewport
└── server/              # V2 milestone: hosts the same engine authoritatively
    ├── src/             #   Fastify + WebSocket, PostgreSQL, session auth, room hosting,
    │                    #   rotation/spawn/threat schedulers
    └── tests/
.github/workflows/ci.yml # lint + boundary check + unit + content + e2e + build
```

**Structure Decision**: npm-workspaces monorepo. The four packages make the constitution's
boundaries physical: `contract` is the Principle V seam, `content` is the Principle IV seam,
`engine` vs `apps/client` is the GUI/logic split, and dependency-cruiser fails CI on any
edge pointing the wrong way. Engine modules keep responsibilities single; multiplayer-only
state (rooms, boards, schedules) lives behind the same contract so V1 ships solo content
in-process and V2 activates group formats by hosting the identical modules server-side.

## Version Strategy (V1 ↔ V2)

| Concern | V1 — Solo | V2 — Online |
|---------|-----------|-------------|
| Engine | Same `@tradewright/engine`, runs in browser | Same engine, runs on server |
| Transport | `LocalTransport` (in-process, still async API) | `RemoteTransport` (WebSocket) |
| Markets | NPC traders simulate supply/demand drift | Real players; NPC liquidity configurable |
| Persistence | IndexedDB save on device | PostgreSQL, server-authoritative |
| Time | Injected clock, best-effort integrity (R8, economy) | Server clock, fully authoritative (FR-017) |
| Offline catch-up | Engine fast-forward on load | Server never stopped; client just syncs |
| Expeditions, mettle trials, solo delves, trial-source relic | Fully playable in-process | Same, server-validated |
| Group formats (dungeons, afflictions, raids, zones, events, bosses, invasions, party delves) | Visible, honestly labeled (FR-262); exercised by scripted co-player harness in CI | Active; boards, rooms, rotation/spawn/threat schedulers on server |
| Loot / scores / grants / ledgers | Local seeded rolls and records | Server-authoritative |
| Idle accrual in live instances | Suspended locally (FR-205) | Suspended server-side |
| Mode selection | Default; always available | Title-screen choice once server exists |

Behavioral parity between modes is a test target: the engine test suite runs identically
against both hosting arrangements, and outcomes for the same recorded inputs must match.

## Milestones

One ladder, replacing the former per-spec milestone tracks. Stories refer to the unified
P1–P23 ladder in spec.md.

1. **M0 — Foundations**: monorepo scaffold, CI pipeline (all gates), contract v0, content
   schemas + starter content, deterministic tick/clock core. *Constitution gates live from
   this milestone.*
2. **M1 — V1 Economy (Stories 1–5)**: skilling loop → offline catch-up → recipe chains →
   NPC markets with drift → caravans/travel/arbitrage. Each story independently playable
   and Playwright-tested as it lands. Ends with the full solo loop: gather → refine →
   craft → arbitrage between towns. Includes the FR-054 faucet (floor orders + demand
   sweeps) and the FR-037 facility/station gates. *Build the joint economy model (Known
   Design Gaps) during content tuning.*
3. **M2 — Combat core (Stories 6–13)**: *(precondition satisfied 2026-06-12 — the combat
   design pass produced data-model Part II, protocol Part II, content-schema Part II, and
   research Part IV.)* Expedition runtime on the shared 1 s combat resolver,
   schools/abilities/tactics/trees, gear + provisions, retreat/recovery, drop tables,
   onboarding (FR-113), combat economy integration. V1-shippable.
4. **M3 — Challenge foundation + Mettle trials (Story 14)**: encounter tick + mechanic
   vocabulary, active control + auto-AI takeover, score brackets, trial ladder content, and
   the gear-score/grade/modifier foundation (FR-270–272 — needed for trial rewards).
   V1-shippable.
5. **M4 — Relics + solo delves (Stories 20–23, solo scope)**: relic content types +
   integrity tests, grant-once + duplicate compensation, trade-delivery uniqueness check,
   equip limits + guided swap, compendium, one V1 trial-source relic; awakening (deeds,
   unseal, craft-mod locking); descent runtime over encounters, floor assembly + determinism
   property tests, venture ledgers + landing protocol, depth ladder + weekly seed +
   recognition leaderboard. V1-shippable.
6. **M5 — V2 Online**: server app hosting the engine, accounts/auth, PostgreSQL,
   RemoteTransport, optimistic reconciliation, NPC liquidity tuning, load validation toward
   SC-008. V1 remains shipping and tested throughout. *Can begin in parallel after M1; the
   economy contract is the first surface to stabilize.*
7. **M6 — Group formats (Stories 15–19; party delves)**: *(former preconditions Q3/Q5
   resolved in the spec — threat model FR-108, facilities FR-037.)* Group board + party
   lifecycle +
   backfill/leadership; dungeons with cooperative mechanics + personal loot; affliction
   rotation + ward/resist counters + leaderboards; raids with scheduling; elite zones,
   eruption events (caravan-risk tie-in), world bosses at ~50 scale; invasions (threat
   meters, stations, degradation + contribution repair); party delves + shared weekly
   leaderboards. Requires M5.

Tasks are regenerated per milestone with `/speckit-tasks` scoped to that milestone's
stories — the former whole-feature tasks.md for relics/delves was dropped as stale in the
merge; it predated the combat design pass it depends on.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none — all gates pass) | | |
