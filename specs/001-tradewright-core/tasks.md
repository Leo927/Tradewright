# Tasks: Tradewright — Core Game (M0 Foundations + M1 V1 Economy)

**Input**: Design documents from `/specs/001-tradewright-core/`

**Prerequisites**: plan.md, spec.md (Stories 1–5), research.md (Part I),
data-model.md (Part I), contracts/game-protocol.md (Part I),
contracts/content-schema.md (Part I), quickstart.md (Part I)

**Scope**: Per plan.md ("Tasks are regenerated per milestone"), this file covers
**M0 — Foundations** (Phases 1–2) and **M1 — V1 Economy, User Stories 1–5** (Phases 3–8).
M2+ (combat, challenge, relics/delves, V2, group formats) get their own `/speckit-tasks`
runs when their milestones open; regenerating this file then replaces this scope note.

**Tests**: MANDATORY per constitution Principle I — every story phase contains unit test
tasks (written first, failing before implementation) and a Playwright E2E flow at the
390×844 phone viewport. CI parity (Principle II): everything runs via `npm run check`,
`npm test`, `npm run validate:content`, `npm run test:e2e`.

**Organization**: Tasks are grouped by user story so each story is independently
implementable and testable on top of its predecessors.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US5, mapping to spec.md Stories 1–5
- Every task names exact file paths

---

## Phase 1: Setup (M0 — monorepo scaffold & gates)

**Purpose**: The npm-workspaces monorepo with the constitution's four physical boundaries
and the CI pipeline, live from the first commit (plan.md M0).

- [ ] T001 Create monorepo root: `package.json` (npm workspaces `packages/*`, `apps/*`; scripts `dev`, `test`, `test:e2e`, `check`, `validate:content`, `build`), `tsconfig.base.json` (TypeScript 5.x strict), `.gitignore`, `.editorconfig`
- [ ] T002 [P] Scaffold `packages/contract/` (`@tradewright/contract`): `package.json`, `tsconfig.json`, `src/index.ts` — types only, zero runtime logic, no dependencies
- [ ] T003 [P] Scaffold `packages/engine/` (`@tradewright/engine`): `package.json` (deps: `@tradewright/contract`, `@tradewright/content`), `tsconfig.json`, `src/index.ts`, `tests/` — no DOM lib in tsconfig
- [ ] T004 [P] Scaffold `packages/content/` (`@tradewright/content`): `package.json` (dep: `zod`; `contentVersion` field stamped per contracts/content-schema.md), `tsconfig.json`, `schemas/`, `data/`, `src/index.ts`, `tests/`
- [ ] T005 [P] Scaffold `apps/client/` React 18 + Vite PWA: `package.json` (deps: `react`, `react-dom`, `@tradewright/contract`, `@tradewright/engine` — the latter consumed only by the T036 transport adapter; dev: `vite`, `vite-plugin-pwa`), `vite.config.ts`, `index.html`, `src/main.tsx`, portrait-phone base styles
- [ ] T006 [P] Configure ESLint flat config + workspace typecheck wired into root `npm run check` in `eslint.config.js` and root `package.json`
- [ ] T007 [P] Configure dependency-cruiser one-way boundary rules (client→contract only, with one carve-out: `apps/client/src/transport/` may import the `@tradewright/engine` adapter entry point — the Principle V transport-adapter exception that lets V1 bind LocalGameHost in-process (T036); engine→contract+content; contract→nothing; content→nothing; no engine→client edges) in `.dependency-cruiser.cjs`, wired into `npm run check` (constitution Gate 3)
- [ ] T008 [P] Configure Vitest workspace so root `npm test` runs `packages/engine`, `packages/content`, `packages/contract` suites in `vitest.workspace.ts`
- [ ] T009 [P] Configure Playwright with a 390×844 default project against the Vite dev build (LocalTransport) in `apps/client/playwright.config.ts`; root `npm run test:e2e`
- [ ] T010 Create `.github/workflows/ci.yml` with jobs **check** (`npm run check`), **unit** (`npm test`), **content** (`npm run validate:content`), **e2e** (`npx playwright install --with-deps chromium` + `npm run test:e2e`), **build** (`npm run build`) — each invoking the local commands verbatim (Principle II, research R10)
- [ ] T011 [P] Write `packages/content/README.md` authoring guideline: all text original, denylist policy, no copied numeric tables, IDs immutable once shipped (FR-024, research R12)

**Checkpoint**: `npm install`, `npm run check`, `npm test` (empty suites) green; CI runs on push.

---

## Phase 2: Foundational (M0 — contract v0, schemas, starter content, deterministic core)

**Purpose**: Blocking prerequisites for every story — the Principle V contract seam, the
Principle IV content seam, the deterministic simulation core, and the client shell.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Contract v0 (`@tradewright/contract`, contracts/game-protocol.md Part I)

- [ ] T012 [P] Define `GameTransport` (`send`/`query`/`subscribe`), `CommandAck`, `ErrorCode` union (`INSUFFICIENT_INPUTS`, `NOT_AT_SETTLEMENT`, `STORAGE_FULL`, `CARAVAN_SLOTS_BUSY`, `TIER_LOCKED`, `INSUFFICIENT_FUNDS`, `OFFLINE_BLOCKED`) in `packages/contract/src/transport.ts`
- [ ] T013 [P] Define command DTOs — CreateCharacter, AssignActivity, StopActivity, CollectSummary, PlaceOrder, CancelOrder, DispatchCaravan, TravelTo, ExpandStorage, SetNotificationPref — in `packages/contract/src/commands.ts`
- [ ] T014 [P] Define query DTOs + result shapes — GetCharacter, GetStorage, GetActivities, GetMarket, GetMyOrders, GetRoutes, GetShipments, GetTransactions, GetSummary, GetSettlementFacilities, GetNotificationPrefs — in `packages/contract/src/queries.ts`
- [ ] T015 [P] Define event DTOs — ActionCompleted, SkillLeveled, ActivityHalted, OrderFilled/OrderPartiallyFilled/OrderExpired/OrderCancelled, CaravanArrived, TravelArrived, SummaryReady, StateInvalidated, ConnectionStateChanged, WalletChanged, StorageChanged — in `packages/contract/src/events.ts`
- [ ] T016 Contract test: every command/query/event DTO JSON-round-trips losslessly (serializability, Principle V) in `packages/contract/tests/serializable.test.ts`

### Content schemas, gates & starter content (`@tradewright/content`, contracts/content-schema.md Part I)

- [ ] T017 [P] Zod schemas for SkillDef (family, xpCurve, tiers) and ItemDef (tier, weight, basePrice) in `packages/content/schemas/skills.ts` and `packages/content/schemas/items.ts` — unknown fields are errors
- [ ] T018 [P] Zod schemas for ActivityDef (inputs/outputs, xpPerAction, settlementTags, stationFamily), SettlementDef + FacilityDef (stations per craft family, storage, baseTier, storageExpansion cost curve), RouteDef (durations, risk, mitigation, dispatchCost) in `packages/content/schemas/activities.ts`, `packages/content/schemas/settlements.ts`, `packages/content/schemas/routes.ts`
- [ ] T019 [P] Zod schemas for NpcMarketProfile (NpcItemEntry, floorBuyList, floorBudgetPerPeriod, sweep), NotificationCategoryDef, and WorldTuningDef (worldTickSeconds, marketCadenceTicks, offlineCapHours, caravanDurationBand) in `packages/content/schemas/npc-profiles.ts`, `packages/content/schemas/notifications.ts`, and `packages/content/schemas/world.ts`
- [ ] T020 Content loader: parse + validate all `data/*.json` against schemas, export typed defs + `contentVersion`, fail fast on any error, in `packages/content/src/loader.ts`; wire `npm run validate:content`
- [ ] T021 Referential-integrity gate tests (activity→skill, inputs/outputs→items, settlement→activities/npc-profile, route→settlements, npc entry→items) in `packages/content/tests/referential.test.ts`
- [ ] T022 World-integrity gate tests 1–7 plus the route-duration gate (recipe DAG; every input obtainable; ≥1 tier-1 gathering activity per settlement; route graph connected; asymmetry: no single settlement's local resources can produce >60% of launch recipes (SC-006); tier coverage; NPC sanity bounds; every route's caravan duration within the authored `caravanDurationBand` and personal travel duration shorter than the caravan's on the same route — FR-040/044) in `packages/content/tests/world-integrity.test.ts`
- [ ] T023 Originality-denylist lint test (gate 8): name/description strings checked against inspiration-term denylist in `packages/content/tests/originality.test.ts` with denylist data in `packages/content/tests/denylist.json` (FR-024)
- [ ] T024 [P] Author starter content: `packages/content/data/skills.json` (~7 trade skills incl. hauling, original names, xp curves tuned to idle pacing) and `packages/content/data/items.json` (tiered gathered/refined/finished goods with weights)
- [ ] T025 [P] Author starter content: `packages/content/data/activities.json` — gathering, refining, and crafting chains where refining consumes gathered goods and ≥1 finished-good recipe consumes outputs of two different skills (FR-021)
- [ ] T026 [P] Author starter content: `packages/content/data/settlements.json` (≥4 settlements, asymmetric activityTags, facilities with station/storage tiers, fee/tax rates, storage expansion curves) and `packages/content/data/routes.json` (connected graph, 2–6 h caravan bands, risk levels) (FR-030/037)
- [ ] T027 [P] Author starter content: `packages/content/data/npc-profiles.json` (per-settlement entries, regionally-varied floorBuyList, sweep budgets — FR-054), `packages/content/data/notification-categories.json` (caravan-arrival, offline-cap-reached, committed-start-approaching, order-filled-expired — FR-064), and `packages/content/data/world.json` (60 s world tick, market cadence, 24 h offline cap, 2–6 h caravan duration band — the single authored source for engine pacing tunables)

### Engine deterministic core (`@tradewright/engine`, research R5/R6/R7/R8)

- [ ] T028 Unit tests (write first): injected clock, seeded PRNG state advance/restore, tick scheduling at the authored tick length, fast-forward replay capped at the authored offline cap (1440 ticks at launch values), identical-inputs⇒identical-state in `packages/engine/tests/simulation.test.ts`
- [ ] T029 Implement `Clock` interface + seeded PRNG living in save state (no `Date.now()`/`Math.random()` anywhere in engine) in `packages/engine/src/simulation/clock.ts` and `packages/engine/src/simulation/rng.ts`
- [ ] T030 Implement world tick loop + offline fast-forward replay (elapsed-tick loop), with tick length, market cadence, and offline cap all read from the authored WorldTuning content (60 s / 24 h launch values — never hardcoded in the engine) in `packages/engine/src/simulation/tick.ts`
- [ ] T031 Define runtime state types — PlayerCharacter, ActivityAssignment, SettlementStorage, MarketOrder, Trade, CaravanShipment, NpcMarketState, Transaction, EventSummary, NotificationPrefs, SaveGame — in `packages/engine/src/world/state.ts` (data-model.md Part I)
- [ ] T032 SaveGame Zod validation + `formatVersion` migration framework (validate on load, migrate forward) in `packages/engine/src/world/save.ts` with tests in `packages/engine/tests/save.test.ts`
- [ ] T033 Wallet + append-only Transaction log primitives (wallet never negative; every coin/item mutation records a Transaction — FR-052, conservation invariant) in `packages/engine/src/world/ledger.ts` with tests in `packages/engine/tests/ledger.test.ts`

### Adapter + client shell

- [ ] T034 `LocalGameHost` skeleton implementing `GameTransport` over the engine (command validation/routing, query snapshots, event emitter; immediate `CommandAck`) in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T035 [P] IndexedDB persistence via `idb`: load save on boot, debounced autosave on mutation events, explicit save on tab hide in `apps/client/src/persistence/indexeddb.ts` (research R7)
- [ ] T036 [P] `LocalTransport` binding LocalGameHost in-process in `apps/client/src/transport/local.ts` behind a transport interface in `apps/client/src/transport/index.ts`
- [ ] T037 Client app shell: screen router, contract-event subscription store, shared UI primitives (list, card, progress bar, timer) in `apps/client/src/state/store.ts`, `apps/client/src/App.tsx`, `apps/client/src/components/`
- [ ] T038 [P] PWA manifest + service worker registration (installable, offline shell) in `apps/client/vite.config.ts` and `apps/client/public/manifest.webmanifest`
- [ ] T039 [P] Test-only injected-clock hook exposed by the client host for E2E time control, excluded from production builds, in `apps/client/src/transport/test-clock.ts` (research R9)
- [ ] T040 E2E smoke test: app boots at 390×844, shows first-run screen in `apps/client/tests/e2e/smoke.spec.ts`

**Checkpoint**: Foundation ready — all CI jobs green; user story phases can begin.

---

## Phase 3: User Story 1 — Begin Life as a Settler (Priority: P1) 🎯 MVP

**Goal**: Create a character, choose a settlement, assign a gathering activity, watch
actions complete in real time — items into storage, XP toward levels/tiers (FR-001/002,
FR-010–012, FR-015/016, FR-050).

**Independent Test**: A fresh player can create a character, reach the settlement screen,
start a gathering activity, and after a known interval observe the predicted actions,
items, and XP — with no market or caravan features present (quickstart US1).

### Design artifact (Principle VII — before client implementation)

- [ ] T041 [US1] Design artifact for character creation, settlement home, and activity screens — layout, states, labels; primary task vs deferred depth declared per screen (Principle VIII) — in `specs/001-tradewright-core/design/settlement-skilling.md`

### Tests for User Story 1 (write first, ensure they FAIL) ⚠️

- [ ] T042 [P] [US1] Engine unit tests: character creation (one character, starter coin, skills at level 1), assignment validation (location/tier/inputs; replace requires confirm; partial actions yield nothing), atomic action resolution (outputs+XP), level/tier unlock detection, storage-full halt with time+reason in `packages/engine/tests/skilling.test.ts`
- [ ] T043 [P] [US1] Playwright flow (quickstart US1): create character → pick settlement → assign tier-1 gathering → progress cycles at stated action time, storage and XP tick per action, design-driven structure/labels asserted (Gate 6) in `apps/client/tests/e2e/skilling.spec.ts`

### Implementation for User Story 1

- [ ] T044 [P] [US1] Skills module: XP curves, level derivation, tier thresholds + unlock listing from SkillDef in `packages/engine/src/skills/progression.ts`
- [ ] T045 [US1] World module: character creation (name, starting settlement, starter coin grant via Transaction), per-settlement storage with visible capacity in `packages/engine/src/world/character.ts` and `packages/engine/src/world/storage.ts`
- [ ] T046 [US1] Activity assignment + per-tick action resolution: assign/stop/replace with confirmation, gathering actions apply outputs/XP atomically, halt on storage-full recording time+reason (FR-016) in `packages/engine/src/skills/activities.ts`
- [ ] T047 [US1] Adapter: CreateCharacter, AssignActivity, StopActivity commands; GetCharacter, GetActivities (lock states + reasons), GetStorage queries; ActionCompleted, SkillLeveled, ActivityHalted, WalletChanged, StorageChanged events in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T048 [US1] Client: character creation flow (name, settlement choice) per design artifact in `apps/client/src/screens/create-character.tsx`
- [ ] T049 [US1] Client: settlement home screen — current activity + progress, collect/storage summary, newly-unlocked badge on level-up in `apps/client/src/screens/settlement-home.tsx`
- [ ] T050 [US1] Client: activity browser + assignment confirm dialog (duration, outputs, XP shown; locked activities visible with tier required) in `apps/client/src/screens/activities.tsx`
- [ ] T051 [US1] Wire autosave to mutation events and load-on-boot for the full US1 loop; verify T043 E2E passes and first-activity time < 3 min (SC-001) in `apps/client/src/persistence/indexeddb.ts`

**Checkpoint**: US1 fully functional — the MVP idle loop is playable and tested.

---

## Phase 4: User Story 2 — Return After Time Away (Priority: P2)

**Goal**: Offline accrual identical to online play up to the 24 h cap, with a return
summary of actions, items, XP, halts (FR-013/014/017; SC-002/005; research R5/R8).

**Independent Test**: Start an activity, advance the test clock 8 h, reload — summary
reports ⌊8 h ÷ action time⌋ actions with matching items/XP; >24 h states the cap;
storage-full mid-absence shows halt time and reason (quickstart US2).

### Design artifact

- [ ] T052 [US2] Design artifact for the return-summary surface (summary modal content, cap/halt messaging, acknowledge flow; primary/deferred split) — including row treatments for the order-fill/expiry and caravan-arrival event kinds that join the summary in US4/US5 (FR-014) — in `specs/001-tradewright-core/design/return-summary.md`

### Tests for User Story 2 (write first) ⚠️

- [ ] T053 [P] [US2] Engine unit tests: offline ≡ online property (same inputs: tick-replay state equals live-tick state to the unit, SC-005), cap behavior + cap-reached reporting, storage-full halt mid-absence, negative-elapsed clamp (clock set backwards grants nothing), 24 h catch-up completes within the SC-002 compute budget in `packages/engine/tests/offline.test.ts`
- [ ] T054 [P] [US2] Playwright flow (quickstart US2): activity running → advance test clock 8 h → reload → summary modal matches deterministic prediction; cap and halt variants in `apps/client/tests/e2e/offline.spec.ts`

### Implementation for User Story 2

- [ ] T055 [US2] EventSummary accumulation during fast-forward (actions, items, XP/levels, halts with when/why, net coin; cleared on acknowledgement) in `packages/engine/src/simulation/summary.ts` — built around typed event kinds so US4/US5 append order and caravan events without restructuring (FR-014)
- [ ] T056 [US2] V1 time integrity: persist `lastSeenWallClock` + monotonic mark in SaveGame, clamp negative elapsed, accept forward up to cap in `packages/engine/src/simulation/clock.ts`; optional HTTP-Date network time probe host-side in `apps/client/src/transport/time-probe.ts` (research R8)
- [ ] T057 [US2] Adapter: GetSummary query, CollectSummary command, SummaryReady event; run catch-up on host boot before first query in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T058 [US2] Client: return summary modal per design artifact, shown on boot when a summary is pending in `apps/client/src/screens/return-summary.tsx`

**Checkpoint**: US1+US2 — the idle game survives closing the app; determinism proven by tests.

---

## Phase 5: User Story 3 — Refine and Craft (Priority: P3)

**Goal**: Input-consuming activities at stated ratios, recipe chains across skills,
tier + station gates, exact-shortfall rejection, local-materials-only (FR-015/016/021,
FR-022, FR-037).

**Independent Test**: With seeded raw materials, run a refining activity consuming inputs
at the stated ratio, then craft a finished item consuming outputs of two skills;
missing-input assignment is rejected with the exact shortfall (quickstart US3).

### Design artifact

- [ ] T059 [US3] Design artifact for refining/crafting screens (recipe browser with lock states, input/output display, missing-input messaging; primary/deferred split) in `specs/001-tradewright-core/design/crafting.md`

### Tests for User Story 3 (write first) ⚠️

- [ ] T060 [P] [US3] Engine unit tests: input consumption at stated ratios (atomic consume+produce per action), insufficient-input rejection listing exact missing items+quantities, inputs-exhausted halt (online + via catch-up), station-tier gate (refining/crafting requires local station effective tier ≥ activity tier), cross-settlement materials unusable in `packages/engine/tests/crafting.test.ts`
- [ ] T061 [P] [US3] Playwright flow (quickstart US3): refine seeded inputs → craft a two-skill finished good → missing-input rejection shows shortfall → locked recipe shows required tier in `apps/client/tests/e2e/crafting.spec.ts`

### Implementation for User Story 3

- [ ] T062 [US3] Engine: input-consuming action resolution (consume inputs + produce outputs + XP atomically; halt `inputs-exhausted` with report) extending `packages/engine/src/skills/activities.ts`
- [ ] T063 [US3] Engine: station gating — facility effective-tier lookup per settlement, assignment validation against `stationFamily` (FR-037) in `packages/engine/src/world/facilities.ts`
- [ ] T064 [US3] Adapter: GetActivities lock reasons extended with missing inputs (item+qty) and station-tier locks; GetSettlementFacilities query in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T065 [US3] Client: recipe/craft browser per design artifact — inputs/outputs/ratios, locked recipes with tier shown, missing-input explanation on attempt in `apps/client/src/screens/crafting.tsx`

**Checkpoint**: US1–US3 — full produce loop (gather → refine → craft) playable and tested.

---

## Phase 6: User Story 4 — Trade at the Local Market (Priority: P4)

**Goal**: Per-settlement independent order books — limit orders with escrow, price-time
matching with partial fills, fees/taxes as sinks, NPC price drift + the FR-054 coin
faucet (FR-031–036, FR-050–054; research R4/R13).

**Independent Test**: One player lists a sell order, another (or the NPC principal) buys
it in the same settlement; the listing is visible from every settlement via the linked
market but matches and delivers only on its home settlement's book; buying out NPC sell
depth raises the quote next market tick (quickstart US4).

### Design artifact

- [ ] T066 [US4] Design artifact for trading post screens (item list with best bid/ask; depth + history one tap deeper per Principle VIII; order placement ≤ 6 inputs (SC-004) with fee/tax disclosure; my-orders) in `specs/001-tradewright-core/design/market.md`

### Tests for User Story 4 (write first) ⚠️

- [ ] T067 [P] [US4] Engine unit tests: order placement escrows goods/coin, listing fee disclosed+charged, price-then-time priority matching, partial fills, immediate cross fills at best price, sales tax deducted as sink Transaction, expiry/cancel returns escrow in full, matching isolation (orders match within one settlement's book only; books globally browsable) in `packages/engine/tests/market.test.ts`
- [ ] T068 [P] [US4] Engine unit tests: NPC stock-pressure drift (player buys deplete stock → quote rises; bounded by priceBounds), NPC order refresh on market tick, floor buy orders within period budget, demand sweeps buying cheapest sells within budget, faucet/sink telemetry counters per settlement per period in `packages/engine/tests/npc-market.test.ts`
- [ ] T069 [P] [US4] Property test: conservation across randomized trade/cancel/expiry sequences — no item or coin duplicated or lost, every mutation has a Transaction (SC-010, data-model invariant 1) in `packages/engine/tests/conservation.test.ts`
- [ ] T070 [P] [US4] Playwright flow (quickstart US4): open a market with an empty order book (assert empty-book state renders as a state, not an error, and the first order can be placed — spec edge case) → place sell order (escrow visible) → crossing buy fills with tax disclosed → goods/coin land correctly → listing browsable from another settlement via the linked market, lives only on its home book, remote buy delivers to storage at the listing's settlement → NPC drift check in `apps/client/tests/e2e/market.spec.ts`

### Implementation for User Story 4

- [ ] T071 [US4] Market module: per-settlement order book, escrow lifecycle, price-time matching with partial fills, fees/taxes, durations + expiry on tick, Trade records feeding price history in `packages/engine/src/market/orderbook.ts` and `packages/engine/src/market/matching.ts`
- [ ] T072 [US4] NPC module: NpcMarketState evolution (stock pressure quote curve), NPC principal order placement/refresh per market tick, floor buy orders + demand sweeps from per-settlement budgets, faucet/sink telemetry counters (FR-053/054) in `packages/engine/src/npc/simulation.ts` and `packages/engine/src/npc/faucet.ts`
- [ ] T073 [US4] Adapter: PlaceOrder (remote buy orders at any settlement; sell orders only where the goods sit, FR-032), CancelOrder commands; GetMarket (any settlement's book — linked-market global visibility, FR-035), GetMyOrders, GetTransactions (paged) queries; OrderFilled/OrderPartiallyFilled/OrderExpired/OrderCancelled events with proceeds & tax in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T074 [US4] Client: trading post screens per design artifact — item list with best bid/ask, item detail (depth, recent trades) with an explicit empty-book state (no liquidity shows as a normal state with order placement still available, never an error), order placement form with full fee disclosure before confirm, my-orders with status in `apps/client/src/screens/market.tsx`
- [ ] T075 [US4] Client: transaction-log screen (paged audit history, FR-052) in `apps/client/src/screens/transactions.tsx`
- [ ] T076 [US4] Extend EventSummary for market events: order fills/expiries resolved during absence appear in the return summary with proceeds and tax detail (FR-014) — accumulation in `packages/engine/src/simulation/summary.ts`, unit tests added to `packages/engine/tests/offline.test.ts`, summary-modal assertion added to `apps/client/tests/e2e/offline.spec.ts`

**Checkpoint**: US1–US4 — production converts to profit on living local markets.

---

## Phase 7: User Story 5 — Haul Goods Between Settlements (Priority: P5)

**Goal**: Weight-limited caravans on timed, risky routes; personal travel; hauling
progression; the full arbitrage loop (FR-040–045, FR-002, FR-041).

**Independent Test**: With price spreads seeded between two settlements, dispatch a
caravan, advance the clock past arrival, travel the character, sell high — end-to-end
profit equals spread − taxes − fees − dispatch − risk losses (quickstart US5).

### Design artifact

- [ ] T077 [US5] Design artifact for map/routes, caravan composition, and shipment-tracking screens (weight gauge, duration/risk/cost pre-confirm, in-transit progress; primary/deferred split) in `specs/001-tradewright-core/design/caravans-map.md`

### Tests for User Story 5 (write first) ⚠️

- [ ] T078 [P] [US5] Engine unit tests: dispatch validation (weight ≤ capacity, slot limit with explanation, costs payable), risk rolled exactly once per shipment from state RNG, mitigation reduces loss by factor, arrival deposits into destination storage (online and via catch-up), hauling skill levels by completed shipments growing capacity/slots, personal travel halts assignment + location transitions (FR-002/044) in `packages/engine/tests/caravan.test.ts`
- [ ] T079 [P] [US5] Playwright flow (quickstart US5): buy low in A → dispatch caravan to B (weight/duration/risk/costs shown pre-confirm) → advance clock → travel to B → sell high → profit matches prediction; UI never blocks during transit; over-limit dispatch explains slot availability in `apps/client/tests/e2e/caravan.spec.ts`

### Implementation for User Story 5

- [ ] T080 [US5] Caravan module: shipment lifecycle (manifest escrow from storage, departAt/arriveAt timers independent of assignment, seeded risk resolution + mitigation, delivery deposit, caravan-loss Transactions) in `packages/engine/src/caravan/shipments.ts`
- [ ] T081 [US5] Hauling progression: skill XP per completed shipment driving capacity and concurrent-slot growth (FR-041) in `packages/engine/src/caravan/hauling.ts`
- [ ] T082 [US5] Personal travel: locationState `traveling` transitions on route travelMinutes, assignment halt `travel`, arrival enables destination activities/market/storage in `packages/engine/src/world/travel.ts`
- [ ] T083 [US5] Adapter: DispatchCaravan, TravelTo commands; GetRoutes (durations/risk/costs from current settlement), GetShipments (progress + ETA) queries; CaravanArrived (with risk outcome detail), TravelArrived events in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T084 [US5] Client: map/routes screen per design artifact (destination, caravan + personal durations, risk, costs) in `apps/client/src/screens/map.tsx`
- [ ] T085 [US5] Client: caravan composition flow (weight gauge, mitigation option, full cost pre-confirm) + shipment tracking with arrival countdown in `apps/client/src/screens/caravans.tsx`
- [ ] T086 [US5] Extend EventSummary for caravan events: arrivals (with risk outcome detail) and personal-travel completions resolved during absence appear in the return summary (FR-014) — accumulation in `packages/engine/src/simulation/summary.ts`, unit tests added to `packages/engine/tests/offline.test.ts`, summary-modal assertion added to `apps/client/tests/e2e/offline.spec.ts`

**Checkpoint**: US1–US5 — the complete M1 solo loop: gather → refine → craft → arbitrage between towns.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Remaining M1 requirements that span stories, economy tuning, and the
milestone's validation pass.

- [ ] T087 Design artifact for the storage and settings screens (storage capacity view + expansion purchase with escalating cost and facility-tier cap disclosure; per-category notification opt-ins with honest capability notes; primary/deferred split per Principle VIII) in `specs/001-tradewright-core/design/storage-settings.md` (Principle VII — before T088/T090)
- [ ] T088 ExpandStorage end-to-end: engine coin-sink purchase at escalating disclosed costs capped by storage-facility effective tier (FR-023/037), adapter command, purchase UI on the storage screen per design artifact, unit tests in `packages/engine/src/world/storage.ts`, `packages/engine/src/adapter/local-game-host.ts`, `apps/client/src/screens/storage.tsx`, `packages/engine/tests/storage-expansion.test.ts`
- [ ] T089 Notification model: engine-side notifiable-moment scheduler over known timers (caravan ETA, offline cap, order fill/expiry), NotificationPrefs state (all categories off by default), SetNotificationPref/GetNotificationPrefs in adapter, unit tests (FR-064, research R15) in `packages/engine/src/world/notifications.ts` and `packages/engine/tests/notifications.test.ts`
- [ ] T090 V1 device-scheduled notification delivery adapter via service worker + Notification API with honest capability notes (iOS installed-PWA requirement), per-category opt-in settings UI per design artifact in `apps/client/src/notifications/scheduler.ts` and `apps/client/src/screens/settings.tsx`
- [ ] T091 [P] Playwright flows for the Phase 8 screens: storage expansion (escalating cost disclosed → purchase → capacity grows → facility-tier cap explained at max) in `apps/client/tests/e2e/storage.spec.ts`; notification settings (all categories off by default → opt in per category → preference persists across reload) in `apps/client/tests/e2e/settings.spec.ts`
- [ ] T092 [P] Economy telemetry surface: per-settlement faucet/sink flow counters per period queryable for tuning (FR-053) in `packages/engine/src/npc/telemetry.ts` with tests in `packages/engine/tests/telemetry.test.ts`
- [ ] T093 Joint economy model (plan "Known Design Gaps" tuning precondition): simulation script over launch content checking SC-006 (no single settlement's local resources produce >60% of launch recipes) and SC-007 (arbitrage profitability ±50% income parity) jointly, implementing the behavior model and healthy-world/equivalent-investment definitions of research R16 with all simulation parameters (actor counts, warm-up, window, seeds, decision cadence) as named constants in the test; tune `packages/content/data/*.json` until green, in `packages/content/tests/economy-model.test.ts`
- [ ] T094 [P] Full-loop determinism test: identical SaveGame + content + elapsed ticks ⇒ identical state across skilling, market, NPC, and caravan systems together (quickstart "feature validated" item 3) in `packages/engine/tests/determinism.test.ts`
- [ ] T095 [P] Phone-portrait usability audit (SC-009): Playwright assertions that primary actions are reachable and visible at 390×844 on every shipped screen in `apps/client/tests/e2e/usability.spec.ts`
- [ ] T096 [P] Pacing audits as E2E specs: first activity < 3 min (SC-001), daily check-in loop < 2 min (SC-003), order placement ≤ 6 inputs (SC-004) in `apps/client/tests/e2e/pacing.spec.ts`
- [ ] T097 Quickstart Part I validation run: all commands green locally + CI on one commit, all five story scenarios pass; fix any stale statements in `specs/001-tradewright-core/quickstart.md` (Principle X)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–7)**: All depend on Phase 2. The ladder is deliberately
  sequential by priority (P1→P5): US2 needs US1's activities to summarize; US3 extends
  US1's activity engine; US4 needs US3's goods worth trading; US5 needs US4's markets in
  two towns. Client screens within different stories are independent once their engine
  modules exist.
- **Polish (Phase 8)**: T087 (design artifact) before the screen tasks T088/T090;
  T088–T091 need Phase 2 + the screens they touch; T093/T094 need all of US1–US5;
  T095–T097 need all screens shipped.

### User Story Dependencies

| Story | Depends on | Reason |
|---|---|---|
| US1 (P1) | Foundational only | MVP |
| US2 (P2) | US1 | summarizes US1's activity accrual |
| US3 (P3) | US1 | extends activity resolution with inputs + station gates |
| US4 (P4) | US3 (goods), US1 (storage/wallet) | trades produced goods |
| US5 (P5) | US4 | arbitrage requires markets in ≥2 settlements |

### Within Each User Story

- Design artifact → before client screen tasks (Principle VII)
- Tests written first and failing → engine modules → adapter → client screens → E2E green
- Engine modules before adapter wiring; adapter before screens

### Parallel Opportunities

- Phase 1: T002–T009, T011 all [P] after T001
- Phase 2: contract DTOs T012–T015 [P]; schemas T017–T019 [P]; content files T024–T027 [P]
  after schemas; engine core and client shell tracks proceed in parallel
- Within each story: the unit-test and E2E-test tasks are [P] with each other; US4's
  three test files T067–T069 are [P]
- Across stories (if staffed): US2 and US3 can proceed in parallel after US1 (they touch
  different engine files); US4 engine work can start while US3 client screens finish

---

## Parallel Example: User Story 4

```text
# After Phase 5 completes, launch all US4 test tasks together:
Task T067: market matching unit tests in packages/engine/tests/market.test.ts
Task T068: NPC drift + faucet unit tests in packages/engine/tests/npc-market.test.ts
Task T069: conservation property test in packages/engine/tests/conservation.test.ts
Task T070: market E2E flow in apps/client/tests/e2e/market.spec.ts

# Then implement engine modules in parallel:
Task T071: market module (orderbook.ts, matching.ts)
Task T072: NPC module (simulation.ts, faucet.ts)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup → CI live from first commit (constitution requirement)
2. Phase 2: Foundational — contract v0, validated starter content, deterministic core
3. Phase 3: US1 → **STOP and VALIDATE**: the idle loop is playable on a phone, E2E green
4. This is the MVP — the assign-and-accrue loop that everything else builds on

### Incremental Delivery

Each story phase ends independently playable and Playwright-tested (plan.md M1
requirement): US1 idle loop → US2 offline → US3 produce chains → US4 markets →
US5 arbitrage = full M1 solo loop. Commit and push after every task or logical group
(constitution Development Workflow).

### Milestone Exit (M1 done)

`npm run check`, `npm test`, `npm run validate:content`, `npm run test:e2e` all green on
one commit; quickstart Part I scenarios pass; joint economy model (T093) holds; then
regenerate tasks for M2 (combat core, Stories 6–13) with `/speckit-tasks`.
