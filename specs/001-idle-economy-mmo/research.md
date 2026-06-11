# Research: Tradewright Phase 1

**Date**: 2026-06-11 | **Plan**: [plan.md](./plan.md)

Resolves every open technical question from the plan's Technical Context. No NEEDS CLARIFICATION
markers remain.

## R1 — Platform: PWA web app (not native)

**Decision**: Phone-first Progressive Web App built with React 18 + Vite + TypeScript strict.

**Rationale**: UI-only game (lists, numbers, progress bars) needs no native rendering; PWA gives
one codebase, instant updates, no store gatekeeping, and Playwright can test the real product
directly. Installable to home screen for app-like feel.

**Alternatives considered**: React Native / Flutter (heavier toolchain, splits E2E story, no
benefit for a pure-UI game); native iOS/Android (two codebases, store friction); Capacitor wrap
of the PWA remains available later without rework if store presence is ever wanted.

## R2 — Monorepo: npm workspaces, four boundaries as packages

**Decision**: npm workspaces with `packages/contract`, `packages/engine`, `packages/content`,
`apps/client`, `apps/server` (V2). dependency-cruiser enforces the import direction in CI.

**Rationale**: Constitution Principles III/IV/V demand physical boundaries; separate packages
make violations impossible to merge (CI fails on a reversed dependency edge). npm workspaces
needs no extra tooling; Turborepo/Nx can be added later if build times demand it.

**Alternatives considered**: single src/ tree with lint rules only (boundaries erode under
pressure); separate repos (kills atomic contract changes; overkill pre-V2).

## R3 — GUI↔engine contract: async command/query/event protocol

**Decision**: One TypeScript interface in `@tradewright/contract`:
`send(command) → Promise<Ack>`, `query(q) → Promise<Result>`, `subscribe(handler)` for events.
All payloads JSON-serializable DTOs. Documented in [contracts/game-protocol.md](./contracts/game-protocol.md).

**Rationale**: Principle V requires serializable, transport-agnostic messages; Principle IX
requires fire-without-blocking commands with confirmations as events. This shape runs in-process
(V1) and over WebSocket (V2) unchanged — the "keep both alive" requirement falls out of the
contract design rather than being extra work.

**Alternatives considered**: direct method calls into engine objects (not serializable, V2
becomes a rewrite); REST request/response per interaction (forces request-blocked UX, violates
Principle IX); GraphQL (query flexibility not needed; events awkward).

## R4 — NPC market simulation: stock-pressure price drift

**Decision**: Per settlement × item, NPC traders maintain a virtual stock level with
content-authored production/consumption rates and an equilibrium point. NPC quote prices follow
`price = basePrice × pressure(stock/equilibrium)` where pressure is a bounded curve (clamped,
e.g., 0.25×–4×). NPC traders place/refresh a band of buy and sell orders around their quote on
the real order book each market tick. Player trades change stock (buying depletes → price rises;
selling adds → price falls), so prices drift with actual supply/demand. NPC profiles (rates,
equilibria, price bounds, order band width) are authored content per settlement.

**Rationale**: User requirement is "NPC-simulated market prices that drift with supply/demand" —
a random walk fails the requirement (no causality), and full agent-based economics is untestable
and untunable. Stock-pressure is the idle/tycoon genre standard: deterministic, author-tunable,
and it makes arbitrage genuinely playable (buy pressure in town A raises A's price toward B's).
Because NPCs trade on the same order book players use, V2 can keep them as liquidity bots with
zero engine changes.

**Alternatives considered**: random-walk prices (no supply/demand causality — rejected against
explicit requirement); pure player-driven from day one (V1 would be a dead market — rejected);
double-auction agent simulation (interesting, untunable, overkill).

## R5 — Offline progression: deterministic coarse-tick fast-forward

**Decision**: The engine advances via fixed ticks (60 s game ticks; market/NPC updates on a
slower cadence, e.g., every 5 ticks). Online, ticks fire on schedule; on app open after absence,
the engine replays elapsed ticks (capped at 24 h = 1 440 ticks) in a tight loop and emits one
summary. Within a tick, activity actions are computed in closed form (actions = elapsed ÷
duration); ticks exist so that cross-system events (storage fills → activity halts; caravan
arrives; order expires; NPC price moves) interleave in the right order.

**Rationale**: SC-005 demands offline ≡ online to the unit — a single code path (the tick) is the
only reliable way. 1 440 ticks of arithmetic completes well under the 3 s budget (SC-002).
Closed-form-only (no ticks) cannot order the halt/arrival/expiry interactions correctly.

**Alternatives considered**: pure closed-form math per system (fast but event-ordering bugs are
guaranteed); 1 s ticks (86 400 replays — needless 60× cost for an idle game where nothing
sub-minute matters offline).

## R6 — Determinism: injected clock + seeded RNG in state

**Decision**: The engine never reads `Date.now()` or `Math.random()`. A `Clock` is injected by
the host (real time in production, controlled time in tests); a seeded PRNG (xoshiro/PCG class)
lives inside the save state and advances with consumption (caravan risk rolls, NPC jitter).

**Rationale**: Determinism is load-bearing three times over: offline catch-up equals online play
(SC-005), idle timing is unit-testable without waiting (Principle I), and V1/V2 behavioral parity
is provable. Seed-in-state also prevents save-scumming risk rolls in V1.

**Alternatives considered**: real clocks + tolerance-based tests (flaky, violates the Playwright
determinism rule in the constitution); RNG outside state (reload-reroll exploit).

## R7 — V1 persistence: IndexedDB with versioned, migratable saves

**Decision**: Save = one versioned JSON document (schema-validated with Zod on load) in
IndexedDB via the `idb` wrapper. Autosave on meaningful mutations, debounced; explicit save on
tab hide. Each save carries `formatVersion`; loaders migrate old versions forward.

**Rationale**: Saves outlive code releases — versioning from day one avoids the classic idle-game
corrupt-save disaster. IndexedDB has the capacity localStorage lacks; Zod validation catches
corruption early. The serialized world state doubles as the V2 DB row shape, easing migration.

**Alternatives considered**: localStorage (5 MB ceiling, synchronous jank); OPFS/SQLite-wasm
(power without need at V1 data sizes).

## R8 — V1 time integrity: best-effort, honest about limits (FR-017 deviation)

**Decision**: V1 stores `lastSeenWallClock` and `lastMonotonicMark` in the save. On load: negative
elapsed time clamps to zero (clock set backwards grants nothing); forward jumps are accepted up
to the 24 h offline cap (which bounds the cheat value of clock-forwarding); when online,
a network time probe (HTTP Date header) sanity-checks local time and flags drift. Full FR-017
enforcement is V2's server clock.

**Rationale**: A device-only game cannot cryptographically trust device time; the offline cap
already bounds the exploit to "what honest absence would earn anyway." In solo mode the only
victim of cheating is the cheater. V2's authoritative server closes it completely. This is the
plan's single spec deviation and is recorded in plan.md's Constitution Check.

**Alternatives considered**: mandatory online time check (breaks offline play — unacceptable for
an idle game); trusting device clock blindly (negative-elapsed corruption, trivial cheating).

## R9 — Testing stack: Vitest + Playwright, phone viewport, time control

**Decision**: Vitest for `engine`/`content`/`contract`/adapters (fast, TS-native, workspace
aware). Playwright for client E2E at 390×844 (iPhone-class) viewport as the default project;
flows drive the real V1 build with `LocalTransport`. E2E controls game time via a test-only
clock hook exposed by the host (never shipped in production builds), so "wait 2 hours" is
instant and deterministic — no sleeps, satisfying the constitution's flakiness rules. V2 adds a
server-mode Playwright project running the same flow specs against a spun-up server.

**Rationale**: Constitution Principles I/II fix the frameworks (unit + Playwright, CI + local
parity); the injected clock (R6) is what makes an idle game E2E-testable at all. Reusing the same
flow specs against both transports turns "keep both versions alive" into a checkbox in CI.

**Alternatives considered**: Jest (slower, worse ESM/TS ergonomics than Vitest); Cypress
(weaker multi-tab/network control, Playwright mandated by constitution anyway).

## R10 — CI: single GitHub Actions workflow mirroring local commands

**Decision**: `.github/workflows/ci.yml` with jobs: **check** (typecheck + ESLint +
dependency-cruiser boundary check), **unit** (`npm test` — engine/content/contract suites),
**e2e** (`npm run test:e2e` after `npx playwright install --with-deps chromium`), **build**
(client production build + content validation). Every job invokes the exact script a developer
runs locally. Required on every PR and push to master.

**Rationale**: Principle II verbatim. Boundary check in CI is constitution Gate 3's mechanical
enforcement.

**Alternatives considered**: separate workflows per package (more YAML, no benefit at this size);
merge-queue/nightly-only E2E (violates Principle II's every-PR gate).

## R11 — V2 server shape (architecture-level; detail deferred to M2)

**Decision**: Node 22 + Fastify, WebSocket (`ws`) carrying the same contract messages,
PostgreSQL for world + account state, the same `@tradewright/engine` running authoritatively
(world tick on the server, per-settlement market processing). Client's `RemoteTransport`
implements optimistic apply + server reconciliation per Principle IX. Accounts: email/password +
session tokens at M2 (standard, replaceable).

**Rationale**: Same language end-to-end keeps the single-engine guarantee (the entire point of
the architecture). Fastify/ws/Postgres are boring, proven choices. Only the architecture is
fixed now — capacity design (sharding by settlement, interest management) is researched in M2
when SC-008 load validation happens; nothing in V1 constrains it because the contract is
transport-agnostic.

**Alternatives considered**: different server language (breaks engine sharing — rejected
outright); Firebase/managed BaaS (order-book matching and ticked simulation don't fit;
vendor lock); Colyseus (room model fits sessions, but brings its own protocol — our contract
already is the protocol).

## R12 — Inspiration compliance: structure-only porting

**Decision**: Recipe-tree shapes, refining input:output ratio patterns, XP curve shapes, and
tier-gating structure follow New World's publicly documented trade-skill conventions; idle
pacing (actions/hour bands, check-in cadence) follows Ironwood/Melvor conventions. A content
authoring guideline in `packages/content/README.md` requires: every name, item, settlement,
and text string original; no copied numeric tables — curves are re-derived from our own pacing
targets (SC-006, SC-007 budgets).

**Rationale**: Spec FR-024 and the user's explicit "port the structure and math, never the IP."
Game mechanics are not copyrightable; expression (names, text, art, exact data tables) is.
Original numbers tuned to our own success criteria are both safer and better-balanced for an
idle game with different session patterns than an MMO.

**Audit addendum (2026-06-11)**: New World: Aeternum ended content development in October
2025, was delisted on 2026-01-15, and its servers shut down on 2027-01-31. Two consequences:
(1) the "publicly documented" systems this research cites will become unverifiable — the key
references (trade-skill structures; trading-post history including the 2021-11-18 market
globalization; the November 2021 deflation crisis; the entry-cap history) must be archived
into `docs/reference/` while sources still exist; (2) New World is a *closed case study* —
its post-launch reversals (market globalization, entry-cap oscillation, crafted gear-score
RNG removal in 2023) are design evidence to mine, not just a feature catalog. The denylist
in the content-schema contract extends beyond item/place names to the inspiration's
feature/system names (e.g., "Soul Trial", "Mutator", "Outpost Rush", "Azoth", "Aeternum")
after the audit found spec 003's original draft reusing "soul trials" as a format name.
