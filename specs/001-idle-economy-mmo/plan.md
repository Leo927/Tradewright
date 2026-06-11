# Implementation Plan: Tradewright — Idle MMO Economy Game (Phase 1)

**Branch**: `master` | **Date**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-idle-economy-mmo/spec.md`

## Summary

Tradewright ships as **two versions sharing one game engine behind one contract**:

- **V1 — Solo**: fully playable single-player game. The complete loop (gather → refine → craft →
  caravan arbitrage between towns) runs against an in-process game engine with NPC-simulated
  settlement markets whose prices drift with supply and demand. Offline progression via
  deterministic fast-forward. Saves locally on device.
- **V2 — Online**: the same client connects to a server running the same engine authoritatively;
  markets are driven by real players (with configurable NPC liquidity). Same contract, different
  transport.

**Both versions stay alive permanently.** V1 is the offline/solo mode and the development/test
harness; V2 is the shared world. The constitution's GUI–Logic Boundary (Principle V) is exactly
this seam: the client talks to a serializable async contract, and V1 (local adapter) vs V2
(remote adapter) differ only in transport.

## Technical Context

**Language/Version**: TypeScript 5.x (strict) everywhere — client, engine, content tooling, server

**Primary Dependencies**: React 18 + Vite (client GUI); Zod (content/state schema validation);
Vitest (unit tests); Playwright (E2E); Node.js 22 LTS; V2 adds Fastify + ws (WebSocket) + PostgreSQL

**Storage**: V1 — IndexedDB on device (versioned save format). V2 — PostgreSQL on server.
Authored content — JSON files in repo, schema-validated at build time.

**Testing**: Vitest for unit (engine, content validation, adapters); Playwright for E2E flows
(phone viewport); both wired into GitHub Actions and runnable locally with the same commands
(`npm test`, `npm run test:e2e`)

**Target Platform**: Phone-first web app (PWA), portrait 390×844 baseline; desktop browsers
work but are not the design target. V2 server targets Linux.

**Project Type**: npm-workspaces monorepo — shared packages + client app (+ server app for V2)

**Performance Goals**: Every interaction acknowledges < 100 ms locally (Principle IX); offline
catch-up of a 24 h absence computes in < 3 s on a mid-range phone (SC-002); V2 sustains 10 k
concurrent players (SC-008, validated by load simulation in the V2 milestone)

**Constraints**: Engine is deterministic (state + content + elapsed time + seed → identical
results) — required for offline catch-up correctness (SC-005), unit testability, and V1/V2
behavioral parity. Engine has zero DOM/framework imports. All time comes from an injected clock.

**Scale/Scope**: Phase 1 spec scope: 5 user stories, ~7 skills, ≥4 settlements, single currency.
Two delivery milestones (V1 solo, V2 online) sharing ~80% of code.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md` (v1.5.0):

- [x] **Test-First Quality (I)**: Engine, content schemas, and adapters get Vitest unit suites;
  every user story gets Playwright flows (phone viewport). The injected-clock design makes idle
  timing unit-testable without real waiting. Test tasks will be mandatory in tasks.md.
- [x] **CI/Local Test Parity (II)**: Single commands — `npm test` (Vitest), `npm run test:e2e`
  (Playwright) — invoked verbatim by GitHub Actions (`.github/workflows/ci.yml`). No CI-only
  logic.
- [x] **Separation of Concerns (III)**: Four-way split: `contract` (types only) ← `engine`
  (pure logic) ← `content` (data + schemas) ← `apps/client` (GUI). Dependencies point one way;
  enforced mechanically with dependency-cruiser in CI (Gate 3).
- [x] **Authoring–Implementation Separation (IV)**: All game content (skills, items, recipes,
  settlements, routes, NPC market profiles) is JSON in `content/data/`, validated by Zod schemas
  at build time. Engine code never embeds content values. Authors edit JSON without touching code.
- [x] **GUI–Logic Boundary (V)**: Client depends only on `@tradewright/contract` (serializable
  command/query/event protocol). Engine has no DOM/React imports. V2 swaps `LocalTransport` for
  `RemoteTransport` with zero GUI changes — the architecture test is literally a shipped product
  requirement here ("keep both versions alive").
- [x] **UI Design Fidelity (VII)**: Each UI story gets a design artifact in
  `specs/001-idle-economy-mmo/design/` (screen inventory, layout, states) before its
  implementation tasks; implementation references it (enforced in tasks.md ordering).
- [x] **Explorable UX (VIII)**: Design artifacts must declare primary task vs deferred depth per
  screen (e.g., settlement home shows current activity + collect; order book depth, trade
  history, and route economics live one tap deeper).
- [x] **Latency-Tolerant Client (IX)**: The contract is async command/event from day one.
  Interaction classification (local-immediate / optimistic / server-confirmed-pending) is part of
  the contract document and per-screen design artifacts. In V1 everything resolves locally
  (< 100 ms); in V2 commands apply optimistically and reconcile on server events. No
  request-blocked interactions exist in the contract.

**Spec deviation note (not a constitution violation)**: FR-017 (authoritative time) cannot be
fully guaranteed in V1, which has no server. V1 applies best-effort integrity (monotonic clamp,
persisted last-seen timestamp, optional network time check); full enforcement arrives with V2,
where the server owns time. In V1 clock cheating affects only the cheater's solo world. Recorded
in research.md (R8).

## Project Structure

### Documentation (this feature)

```text
specs/001-idle-economy-mmo/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── game-protocol.md # Command/query/event contract (GUI ↔ engine seam)
│   └── content-schema.md# Authored content contract (authors ↔ engine seam)
├── design/              # UI design artifacts, one per screen group (created during impl)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/
├── contract/            # @tradewright/contract — protocol types ONLY (commands, queries,
│   └── src/             #   events, DTOs, error codes). Zero runtime logic. Everything
│                        #   JSON-serializable. Both GUI and engine depend on it.
├── engine/              # @tradewright/engine — the game. Pure TS, deterministic, no DOM.
│   ├── src/
│   │   ├── world/       #   world state, settlements, storage, wallet
│   │   ├── skills/      #   activities, XP curves, tiers, assignment
│   │   ├── market/      #   order book, matching, escrow, fees/taxes
│   │   ├── npc/         #   NPC market simulation (supply/demand price drift) [V1-critical]
│   │   ├── caravan/     #   shipments, routes, risk resolution, travel
│   │   ├── simulation/  #   tick loop, offline fast-forward, seeded RNG, injected clock
│   │   └── adapter/     #   LocalGameHost: implements the contract over the engine in-process
│   └── tests/           #   unit tests (Vitest)
├── content/             # @tradewright/content — authored game data + schemas
│   ├── schemas/         #   Zod schemas (the content contract, executable form)
│   ├── data/            #   JSON: skills, items, recipes, settlements, routes, npc-profiles
│   └── tests/           #   schema validation + content-integrity tests (e.g., every recipe
│                        #   input is producible; settlement asymmetry per SC-006)
apps/
├── client/              # React PWA. GUI ONLY — no game rules anywhere in here.
│   ├── src/
│   │   ├── transport/   #   LocalTransport (wraps engine LocalGameHost, in-process)
│   │   │                #   RemoteTransport (V2: WebSocket to server) — same interface
│   │   ├── screens/     #   settlement home, skills, market, caravans, map, summary
│   │   ├── components/  #   shared UI primitives
│   │   └── state/       #   GUI-side view state (subscriptions to contract events)
│   └── tests/e2e/       #   Playwright flows, phone viewport
└── server/              # V2 milestone. Hosts the same engine authoritatively.
    ├── src/             #   Fastify + WebSocket, PostgreSQL persistence, session auth
    └── tests/
.github/workflows/ci.yml # lint + boundary check + unit + content + e2e + build
```

**Structure Decision**: npm-workspaces monorepo. The four packages make the constitution's
boundaries physical: `contract` is the Principle V seam, `content` is the Principle IV seam,
`engine` vs `apps/client` is the GUI/logic split, and dependency-cruiser fails CI on any edge
pointing the wrong way. V1 = client + engine in-process; V2 = server hosting the same engine;
both build from this one tree forever (user requirement: keep both versions alive).

## Version Strategy (V1 ↔ V2)

| Concern | V1 — Solo | V2 — Online |
|---------|-----------|-------------|
| Engine | Same `@tradewright/engine`, runs in browser | Same engine, runs on server |
| Transport | `LocalTransport` (in-process, still async API) | `RemoteTransport` (WebSocket) |
| Markets | NPC traders simulate supply/demand drift | Real players; NPC liquidity configurable |
| Persistence | IndexedDB save on device | PostgreSQL, server-authoritative |
| Time | Injected clock, best-effort integrity (R8) | Server clock, fully authoritative (FR-017) |
| Offline catch-up | Engine fast-forward on load | Server never stopped; client just syncs |
| Mode selection | Default; always available | Title-screen choice once server exists |

Behavioral parity between modes is a test target: the engine test suite runs identically against
both hosting arrangements, and market/caravan/skilling outcomes for the same inputs must match.

## Milestones

1. **M0 — Foundations**: monorepo scaffold, CI pipeline (all gates), contract v0, content
   schemas + starter content, deterministic tick/clock core. *Constitution Gates 1–4 live from
   this milestone.*
2. **M1 — V1 Solo playable (maps to spec US1–US5)**: skilling loop → offline catch-up → recipe
   chains → NPC markets with drift → caravans/travel/arbitrage. Each story independently
   playable and Playwright-tested as it lands. Ends with the full solo loop: gather → refine →
   craft → arbitrage between towns.
3. **M2 — V2 Online**: server app hosting the engine, accounts/auth, PostgreSQL persistence,
   RemoteTransport, optimistic reconciliation in client, NPC liquidity tuning, load validation
   toward SC-008. V1 remains shipping and tested throughout.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none — all gates pass) | | |
