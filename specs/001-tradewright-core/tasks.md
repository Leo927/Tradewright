# Tasks: Tradewright — Core Game (M0 Foundations + M1 V1 Economy)

**Input**: Design documents from `/specs/001-tradewright-core/`

**Prerequisites**: plan.md, spec.md (Stories 0–5), research.md (Parts I & V),
data-model.md (Parts I & V), contracts/game-protocol.md (Parts I & V),
contracts/content-schema.md (Parts I & V), quickstart.md (Parts I & V)

**Scope**: Per plan.md ("Tasks are regenerated per milestone"), this file covers
**M0 — Foundations** (Phases 1–2, including the i18n foundation — research Part V) and
**M1 — V1 Economy, User Stories 1–5** (Phases 4–8), with **User Story 0 (P0, i18n)** as
Phase 3 — its infrastructure lands in M0 and its validation runs continuously alongside
every later story (Design Invariant 13). M2+ (combat, challenge, relics/delves, V2, group
formats) get their own `/speckit-tasks` runs when their milestones open; regenerating this
file then replaces this scope note. *(Regenerated 2026-06-12 to fold in the i18n
foundation — spec User Story 0/P0, FR-070–078; plan/research/data-model/contracts/
quickstart Part V — replacing the pre-i18n version flagged stale on 2026-06-12.)*

**Tests**: MANDATORY per constitution Principle I — every story phase contains unit test
tasks (written first, failing before implementation) and a Playwright E2E flow at the
390×844 phone viewport; from US1 on, every story flow also passes in the generated
`pseudo-expand` locale (Design Invariant 13). CI parity (Principle II): everything runs
via `npm run check`, `npm test`, `npm run validate:content`, `npm run test:e2e`.

**Organization**: Tasks are grouped by user story so each story is independently
implementable and testable on top of its predecessors.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US0–US5, mapping to spec.md Stories 0–5
- Every task names exact file paths

---

## Phase 1: Setup (M0 — monorepo scaffold & gates)

**Purpose**: The npm-workspaces monorepo with the constitution's four physical boundaries
and the CI pipeline, live from the first commit (plan.md M0).

- [X] T001 Create monorepo root: `package.json` (npm workspaces `packages/*`, `apps/*`; scripts `dev`, `test`, `test:e2e`, `check`, `validate:content`, `gen:pseudo`, `build`), `tsconfig.base.json` (TypeScript 5.x strict), `.gitignore` (including generated `packages/content/text/pseudo-*/` — research R4 (i18n): never committed), `.editorconfig`
- [X] T002 [P] Scaffold `packages/contract/` (`@tradewright/contract`): `package.json`, `tsconfig.json`, `src/index.ts` — types only, zero runtime logic, no dependencies
- [X] T003 [P] Scaffold `packages/engine/` (`@tradewright/engine`): `package.json` (deps: `@tradewright/contract`, `@tradewright/content`), `tsconfig.json`, `src/index.ts`, `tests/` — no DOM lib in tsconfig
- [X] T004 [P] Scaffold `packages/content/` (`@tradewright/content`): `package.json` (dep: `zod`; `contentVersion` field stamped per contracts/content-schema.md), `tsconfig.json`, `schemas/`, `data/`, `text/`, `src/index.ts`, `tests/`
- [X] T005 [P] Scaffold `apps/client/` React 18 + Vite PWA: `package.json` (deps: `react`, `react-dom`, `react-intl` (FormatJS — research R2 (i18n)), `idb` (T039 persistence), `@tradewright/contract`, `@tradewright/content` (text catalogs only), `@tradewright/engine` — the latter consumed only by the T040 transport adapter; dev: `vite`, `vite-plugin-pwa`), `vite.config.ts`, `index.html`, `src/main.tsx`, portrait-phone base styles
- [X] T006 [P] Configure ESLint flat config + workspace typecheck wired into root `npm run check` in `eslint.config.js` and root `package.json`
- [X] T007 [P] Configure dependency-cruiser one-way boundary rules (client→contract+content-text only, with one carve-out: `apps/client/src/transport/` may import the `@tradewright/engine` adapter entry point — the Principle V transport-adapter exception that lets V1 bind LocalGameHost in-process (T040); engine→contract+content-data — an `packages/engine` → `packages/content/text` edge FAILS the check (content-schema Part V, research R1 (i18n)); contract→nothing; content→nothing; no engine→client edges) in `.dependency-cruiser.cjs`, wired into `npm run check` (constitution Gate 3)
- [X] T008 [P] Configure Vitest workspace so root `npm test` runs `packages/engine`, `packages/content`, `packages/contract`, and `apps/client` (i18n helper) suites in `vitest.workspace.ts`
- [X] T009 [P] Configure Playwright with three 390×844 projects against the Vite dev build (LocalTransport): **default** (base locale `en`), **pseudo** (app forced to the generated `pseudo-expand` locale; selectable via `npm run test:e2e -- --project=pseudo` per quickstart Part V), and **pseudo-cjk** (forced to `pseudo-cjk`, running only the T112 usability audit as the CJK render smoke pass — quickstart US0-f); locale forcing uses a test-only locale override on the client host, excluded from production builds per the T044 pattern; `npm run gen:pseudo` as a pretest step, in `apps/client/playwright.config.ts`; root `npm run test:e2e` runs all three projects
- [X] T010 Create `.github/workflows/ci.yml` with jobs **check** (`npm run check`), **unit** (`npm test`), **content** (`npm run validate:content` — includes the Part V text gates), **e2e** (`npx playwright install --with-deps chromium` + `npm run test:e2e` — all three locale projects), **build** (`npm run build`) — each invoking the local commands verbatim (Principle II, research R10)
- [X] T011 [P] Write `packages/content/README.md` authoring guideline: all text original, denylist policy applies in every locale (FR-024/071), no copied numeric tables, IDs and text keys immutable once shipped, `en` is the authoring locale and every key originates there, messages use ICU MessageFormat, mechanics files under `data/` carry no display text (content-schema Part V authoring rules, research R12)

**Checkpoint**: `npm install`, `npm run check`, `npm test` (empty suites) green; CI runs on push.

---

## Phase 2: Foundational (M0 — contract v0, schemas, text catalogs, starter content, deterministic core)

**Purpose**: Blocking prerequisites for every story — the Principle V contract seam, the
Principle IV content seam (mechanics **and** text — content-schema Parts I & V), the
deterministic simulation core, the client shell with its i18n runtime.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Contract v0 (`@tradewright/contract`, contracts/game-protocol.md Parts I & V)

- [X] T012 [P] Define `GameTransport` (`send`/`query`/`subscribe`), `CommandAck` (`message` is developer diagnostics only — player-facing rejection text is GUI-rendered from `code` + structured fields, protocol Part V), `ErrorCode` union (`INSUFFICIENT_INPUTS`, `NOT_AT_SETTLEMENT`, `STORAGE_FULL`, `CARAVAN_SLOTS_BUSY`, `TIER_LOCKED`, `INSUFFICIENT_FUNDS`, `OFFLINE_BLOCKED`) in `packages/contract/src/transport.ts`
- [X] T013 [P] Define command DTOs — CreateCharacter, AssignActivity, StopActivity, CollectSummary, PlaceOrder, CancelOrder, DispatchCaravan, TravelTo, ExpandStorage, SetNotificationPref, SetDisplayLocale (localeId; validated against `text/locales.json` — protocol Part V, FR-072) — in `packages/contract/src/commands.ts`
- [X] T014 [P] Define query DTOs + result shapes — GetCharacter, GetStorage, GetActivities, GetMarket, GetMyOrders, GetRoutes, GetShipments, GetTransactions, GetSummary, GetSettlementFacilities, GetNotificationPrefs — in `packages/contract/src/queries.ts` (no text query and no GetSupportedLocales — catalogs ship with the client, protocol Part V)
- [X] T015 [P] Define event DTOs — ActionCompleted, SkillLeveled, ActivityHalted, OrderFilled/OrderPartiallyFilled/OrderExpired/OrderCancelled, CaravanArrived, TravelArrived, SummaryReady, StateInvalidated, ConnectionStateChanged, WalletChanged, StorageChanged — in `packages/contract/src/events.ts`; payloads carry ids, codes, and raw values only — any field that would have been display text is an id or code (protocol Part V, FR-074/076)
- [X] T016 Contract test: every command/query/event DTO JSON-round-trips losslessly (serializability, Principle V) and no DTO declares a rendered-text field (id/code/value audit against a per-DTO allowlist — protocol Part V binding rule) in `packages/contract/tests/serializable.test.ts`

### Content schemas, gates & starter content (`@tradewright/content`, contracts/content-schema.md Parts I & V)

- [X] T017 [P] Zod schemas for SkillDef (family, xpCurve, tiers) and ItemDef (tier, weight, basePrice) in `packages/content/schemas/skills.ts` and `packages/content/schemas/items.ts` — unknown fields are errors; **no display-text fields** (name/description live in text catalogs — data-model Part V text-field rule)
- [X] T018 [P] Zod schemas for ActivityDef (inputs/outputs, xpPerAction, settlementTags, stationFamily), SettlementDef + FacilityDef (stations per craft family, storage, baseTier, storageExpansion cost curve), RouteDef (durations, risk, mitigation, dispatchCost) in `packages/content/schemas/activities.ts`, `packages/content/schemas/settlements.ts`, `packages/content/schemas/routes.ts` — same no-display-text rule
- [X] T019 [P] Zod schemas for NpcMarketProfile (NpcItemEntry, floorBuyList, floorBudgetPerPeriod, sweep), NotificationCategoryDef (template references are `ui.json` keys, never inline strings — FR-064/070), and WorldTuningDef (worldTickSeconds, marketCadenceTicks, offlineCapHours, caravanDurationBand, starterCoin) in `packages/content/schemas/npc-profiles.ts`, `packages/content/schemas/notifications.ts`, and `packages/content/schemas/world.ts`
- [X] T020 [P] Zod schemas for the text tree (data-model Part V): LocaleDef (`id` BCP 47, `endonym`, `status: shipped|validation`) for `text/locales.json`, UiTextCatalog (flat `stringId → ICU message` map), ContentTextResource (flat `<defId>.<field> → string` map, one file per `data/` domain) in `packages/content/schemas/text.ts`
- [X] T021 Content loader: parse + validate all `data/*.json` against mechanics schemas and all `text/**` against text schemas, export typed defs, text catalogs + `contentVersion`, fail fast on any error, in `packages/content/src/loader.ts`; wire `npm run validate:content`
- [X] T022 Referential-integrity gate tests (activity→skill, inputs/outputs→items, settlement→activities/npc-profile, route→settlements, npc entry→items) in `packages/content/tests/referential.test.ts`
- [X] T023 World-integrity gate tests 1–7 and 9–10 per contracts/content-schema.md Part I (recipe DAG; every input obtainable; ≥1 tier-1 gathering activity per settlement; route graph connected; asymmetry: no single settlement's local resources can produce >60% of launch recipes (SC-006); tier coverage (every skill defines ≥ 5 tiers — spec skill-family assumption); NPC sanity bounds; every route's caravan duration within the authored `caravanDurationBand` and personal travel duration shorter than the caravan's on the same route — FR-040/044; skill-family counts: 5 gathering, 5 refining, 7 crafting, hauling present — spec Assumptions) in `packages/content/tests/world-integrity.test.ts`
- [X] T024 Originality-denylist lint test (world-integrity gate 8 + text gate 6): name/description strings checked against the inspiration-term denylist **in every locale's catalogs** (`text/<locale>/**` — FR-024/071) in `packages/content/tests/originality.test.ts` with denylist data in `packages/content/tests/denylist.json`
- [X] T025 Text-integrity gate tests per contracts/content-schema.md Part V (tests 1–5, 7): schema validity + ICU-parseability of every message; coverage — every `en` key exists in every `status: shipped` locale (SC-015); placeholder parity — each locale message's ICU placeholder set equals its base message's (FR-073); orphans — no locale key without a base entry, every `<defId>.<field>` resolves to an existing def declaring that text field (FR-071); no display text in `data/` (FR-070/071); pseudo-locale determinism — same `en` input ⇒ identical generated pseudo files (research R4 (i18n)) in `packages/content/tests/text-gates.test.ts`
- [X] T026 Pseudo-locale generator: deterministic `npm run gen:pseudo` producing `text/pseudo-expand/` (accented Latin, bracketed, ~40% padded — layout stress + leakage visibility, SC-011/013) and `text/pseudo-cjk/` (CJK-range glyph substitution — script coverage) from `text/en/`, never hand-edited or committed, in `packages/content/src/gen-pseudo.ts` (research R4 (i18n))
- [X] T027 [P] Author `packages/content/text/locales.json` (LocaleDef[]: `en` shipped + the two generated validation locales declared `status: validation`) and `packages/content/text/en/ui.json` foundation strings (app shell, navigation, common labels, error-code messages for every T012 ErrorCode, notification templates per T019 categories) — stable slugs namespaced by screen/flow, ICU MessageFormat (content-schema Part V authoring rules)
- [X] T028 [P] Author starter content: `packages/content/data/skills.json` (5 gathering + 5 refining + 7 crafting skills plus the hauling progression — 18 skill tracks copying New World's trade-skill family structure per the spec's skill-family assumption, xp curves tuned to idle pacing) and `packages/content/data/items.json` (tiered gathered/refined/finished goods with weights) — ids/numbers/enums only; original names + descriptions keyed `<defId>.<field>` in `packages/content/text/en/content/skills.json` and `packages/content/text/en/content/items.json`
- [X] T029 [P] Author starter content: `packages/content/data/activities.json` — gathering, refining, and crafting chains where refining consumes gathered goods and ≥1 finished-good recipe consumes outputs of two different skills (FR-021) — with display text in `packages/content/text/en/content/activities.json`
- [X] T030 [P] Author starter content: `packages/content/data/settlements.json` (≥4 settlements, asymmetric activityTags, facilities with station/storage tiers, fee/tax rates, storage expansion curves) and `packages/content/data/routes.json` (connected graph, 2–6 h caravan bands, risk levels) (FR-030/037) — with display text in `packages/content/text/en/content/settlements.json` and `packages/content/text/en/content/routes.json`
- [X] T031 [P] Author starter content: `packages/content/data/npc-profiles.json` (per-settlement entries, regionally-varied floorBuyList, sweep budgets — FR-054), `packages/content/data/notification-categories.json` (caravan-arrival, offline-cap-reached, committed-start-approaching, order-filled-expired — FR-064; template fields reference `ui.json` keys), and `packages/content/data/world.json` (60 s world tick, market cadence, 24 h offline cap, 2–6 h caravan duration band, starter coin — the single authored source for engine pacing and world tunables)

### Engine deterministic core (`@tradewright/engine`, research R5/R6/R7/R8)

- [X] T032 Unit tests (write first): injected clock, seeded PRNG state advance/restore, tick scheduling at the authored tick length, fast-forward replay capped at the authored offline cap (1440 ticks at launch values), identical-inputs⇒identical-state in `packages/engine/tests/simulation.test.ts`
- [X] T033 Implement `Clock` interface + seeded PRNG living in save state (no `Date.now()`/`Math.random()` anywhere in engine) in `packages/engine/src/simulation/clock.ts` and `packages/engine/src/simulation/rng.ts`
- [X] T034 Implement world tick loop + offline fast-forward replay (elapsed-tick loop), with tick length, market cadence, and offline cap all read from the authored WorldTuning content (60 s / 24 h launch values — never hardcoded in the engine) in `packages/engine/src/simulation/tick.ts`
- [X] T035 Define runtime state types — PlayerCharacter, ActivityAssignment, SettlementStorage, MarketOrder, Trade, CaravanShipment, NpcMarketState, Transaction, EventSummary, NotificationPrefs, SaveGame with a client **settings envelope** (`displayLocale`, `notificationPrefs` — sibling of world state, never read by simulation; data-model Part V DisplayLocale) — in `packages/engine/src/world/state.ts` (data-model.md Parts I & V); no state field stores rendered text (i18n invariant 1)
- [X] T036 SaveGame Zod validation + `formatVersion` migration framework (validate on load, migrate forward) in `packages/engine/src/world/save.ts` with tests in `packages/engine/tests/save.test.ts`
- [X] T037 Wallet + append-only Transaction log primitives (wallet never negative; every coin/item mutation records a Transaction — FR-052, conservation invariant; records are structured ids/codes/values, rendered only at display — FR-076) in `packages/engine/src/world/ledger.ts` with tests in `packages/engine/tests/ledger.test.ts`

### Adapter + client shell

- [X] T038 `LocalGameHost` skeleton implementing `GameTransport` over the engine (command validation/routing, query snapshots, event emitter; immediate `CommandAck`), including SetDisplayLocale persisting to the save settings envelope without touching simulation state (protocol Part V — optimistic, the GUI never waits on its ack) in `packages/engine/src/adapter/local-game-host.ts`
- [X] T039 [P] IndexedDB persistence via `idb`: load save on boot, debounced autosave on mutation events, explicit save on tab hide in `apps/client/src/persistence/indexeddb.ts` (research R7)
- [X] T040 [P] `LocalTransport` binding LocalGameHost in-process in `apps/client/src/transport/local.ts` behind a transport interface in `apps/client/src/transport/index.ts`
- [X] T041 Client i18n runtime (research R2/R3 (i18n)): react-intl `IntlProvider` over the catalogs imported from `@tradewright/content` text exports, active-locale resolution (persisted `displayLocale` → else device language when supported → else base locale, FR-072), base-locale fallback for missing keys with every gap logged (never a blank, raw key, or error — FR-075), and shared value-format helpers — `Intl.NumberFormat`/`DateTimeFormat`, one duration helper (`Intl.DurationFormat` where available, composed `NumberFormat` units otherwise), coin as locale-grouped integer with the game's coin mark, never ISO currency (FR-073) — in `apps/client/src/i18n/provider.tsx`, `apps/client/src/i18n/locale.ts`, `apps/client/src/i18n/format.ts`, with unit tests in `apps/client/src/i18n/format.test.ts`
- [X] T042 Client app shell: screen router, contract-event subscription store, shared UI primitives (list, card, progress bar, timer — all rendering through T041 helpers), every player-facing string a `ui.json` key via react-intl (FR-070 — nothing hardcoded) in `apps/client/src/state/store.ts`, `apps/client/src/App.tsx`, `apps/client/src/components/`
- [X] T043 [P] PWA manifest + service worker registration (installable, offline shell) in `apps/client/vite.config.ts` and `apps/client/public/manifest.webmanifest`
- [X] T044 [P] Test-only injected-clock hook exposed by the client host for E2E time control, excluded from production builds, in `apps/client/src/transport/test-clock.ts` (research R9)
- [X] T045 E2E smoke test: app boots at 390×844, shows first-run screen; in the `pseudo` project every visible string carries the pseudo markers (no plain-English leakage, no raw keys — SC-011, quickstart US0-a) in `apps/client/tests/e2e/smoke.spec.ts`

**Checkpoint**: Foundation ready — all CI jobs green, text gates and pseudo generation live; user story phases can begin.

---

## Phase 3: User Story 0 — Play in Your Own Language (Priority: P0 — cross-cutting) 🧭

**Goal**: Locale as pure presentation state: language selection with immediate live
switch, locale-correct value formatting, base-locale fallback, locale-neutral engine
outcomes, player-authored text verbatim (FR-070–078, SC-011–015).

**Independent Test**: With a non-base locale installed (the generated `pseudo-expand`
validation locale), run any completed story's flows entirely in that locale and verify:
zero base-language leakage, zero raw keys or blanks, locale-correct formatting of every
number/date/duration/coin value, intact phone-portrait layouts, and gameplay outcomes
identical to the base locale (quickstart Part V).

**Note**: P0 is cross-cutting — its infrastructure landed in Phase 2; this phase adds the
player-facing surface and the standing validation suite. Unit and gate tasks go green
immediately; the E2E scenario tasks (T048/T049) run against the first story flow and
reach green at the US1 checkpoint (quickstart Part V prerequisites). From then on they
run continuously — every later story's checkpoint includes them.

### Design artifact (Principle VII — before client implementation)

- [X] T046 [US0] Design artifact for the settings screen, v1: language selection (supported locales listed by endonym, current locale marked, immediate-apply behavior, unsupported-device-language messaging — FR-072) with primary task vs deferred depth declared (Principle VIII); notification settings noted as a later extension (T108) — in `specs/001-tradewright-core/design/settings-language.md`

### Tests for User Story 0 (write first, ensure they FAIL) ⚠️

- [X] T047 [P] [US0] Locale-neutrality replay test (quickstart US0-c, SC-014): identical (SaveGame, content, seed, elapsed ticks) driven through two LocalGameHost instances — one whose client-side settings envelope carries `en`, one a pseudo locale — produce identical final engine state to the unit; also asserts no engine module or contract payload imports or references `packages/content/text` (FR-074, research R1 (i18n)) in `packages/engine/tests/locale-neutrality.test.ts`
- [X] T048 [P] [US0] Playwright locale spec (quickstart US0-b/d/e/g, runs against the US1 flow once it exists): mid-session language switch re-renders every screen including previously generated records within 2 s, no restart, engine state identical before/after (SC-012); quantities/prices/dates/durations follow each locale's conventions with identical underlying values (FR-073); a key removed from the active validation locale renders the base string, never a blank or key (FR-075); a CJK/accented character name renders verbatim in every locale (FR-078) in `apps/client/tests/e2e/locale.spec.ts`
- [X] T049 [P] [US0] Fallback-gap detection assertions: `npm run validate:content` reports every key missing from a non-shipped locale (players never find a gap first — research R5 (i18n)), added to `packages/content/tests/text-gates.test.ts`

### Implementation for User Story 0

- [X] T050 [US0] Settings screen v1 per design artifact: language list by endonym from `text/locales.json` (`status: shipped` locales only — validation locales never appear in the player-facing list), selection dispatches SetDisplayLocale optimistically and re-renders the whole GUI from catalogs immediately (local-immediate class, protocol Part V; SC-012) in `apps/client/src/screens/settings.tsx`
- [X] T051 [US0] Locale boot + persistence wiring: read `displayLocale` from the save settings envelope on load, fall back to supported device language then base locale (FR-072), persist on switch via SetDisplayLocale through the transport in `apps/client/src/i18n/locale.ts` and `apps/client/src/state/store.ts`
- [X] T052 [US0] Pseudo-project leakage assertions shared by all story specs: a Playwright helper asserting every rendered system string carries pseudo markers (player-authored text excepted) and no raw keys/blanks appear, used by every flow spec in the `pseudo` project (SC-011, quickstart US0-a) in `apps/client/tests/e2e/helpers/pseudo-leakage.ts`

**Checkpoint**: US0 unit + gate level green; settings/language switch shippable; T048
E2E goes green at the US1 checkpoint and stays a standing gate for every later story.

---

## Phase 4: User Story 1 — Begin Life as a Settler (Priority: P1) 🎯 MVP

**Goal**: Create a character, choose a settlement, assign a gathering activity, watch
actions complete in real time — items into storage, XP toward levels/tiers (FR-001/002,
FR-010–012, FR-015/016, FR-050).

**Independent Test**: A fresh player can create a character, reach the settlement screen,
start a gathering activity, and after a known interval observe the predicted actions,
items, and XP — with no market or caravan features present (quickstart US1); the same
flow passes in `pseudo-expand` (Design Invariant 13).

### Design artifact (Principle VII — before client implementation)

- [X] T053 [US1] Design artifact for character creation, settlement home, and activity screens — layout, states, labels; primary task vs deferred depth declared per screen (Principle VIII); layouts tolerant of expanded text lengths (FR-077) — in `specs/001-tradewright-core/design/settlement-skilling.md`

### Tests for User Story 1 (write first, ensure they FAIL) ⚠️

- [X] T054 [P] [US1] Engine unit tests: character creation (one character, starter coin, skills at level 1; name stored verbatim in any supported script, never normalized — FR-078), assignment validation (location/tier/inputs; replace requires confirm; partial actions yield nothing), atomic action resolution (outputs+XP), level/tier unlock detection, storage-full halt with time+reason in `packages/engine/tests/skilling.test.ts`
- [X] T055 [P] [US1] Playwright flow (quickstart US1): create character → pick settlement → assign tier-1 gathering → progress cycles at stated action time, storage and XP tick per action, design-driven structure/labels asserted (Gate 6) in `apps/client/tests/e2e/skilling.spec.ts`

### Implementation for User Story 1

- [X] T056 [P] [US1] Skills module: XP curves, level derivation, tier thresholds + unlock listing from SkillDef in `packages/engine/src/skills/progression.ts`
- [X] T057 [US1] World module: character creation (name, starting settlement, starter coin grant — amount from WorldTuningDef — via Transaction), per-settlement storage with visible capacity in `packages/engine/src/world/character.ts` and `packages/engine/src/world/storage.ts`
- [X] T058 [US1] Activity assignment + per-tick action resolution: assign/stop/replace with confirmation, gathering actions apply outputs/XP atomically, halt on storage-full recording time+reason (FR-016) in `packages/engine/src/skills/activities.ts`
- [X] T059 [US1] Adapter: CreateCharacter, AssignActivity, StopActivity commands; GetCharacter, GetActivities (lock states + reason codes), GetStorage queries; ActionCompleted, SkillLeveled, ActivityHalted, WalletChanged, StorageChanged events in `packages/engine/src/adapter/local-game-host.ts`
- [X] T060 [US1] Client: character creation flow (name — accepted verbatim in any supported script, settlement choice) per design artifact in `apps/client/src/screens/create-character.tsx`
- [X] T061 [US1] Client: settlement home screen — current activity + progress, collect/storage summary, newly-unlocked badge on level-up in `apps/client/src/screens/settlement-home.tsx`
- [X] T062 [US1] Client: activity browser + assignment confirm dialog (duration, outputs, XP shown; locked activities visible with tier required) in `apps/client/src/screens/activities.tsx`
- [X] T063 [US1] Wire autosave to mutation events and load-on-boot for the full US1 loop; verify T055 E2E passes and first-activity time < 3 min (SC-001) in `apps/client/src/persistence/indexeddb.ts`
- [X] T064 [US1] Pseudo-locale pass (Design Invariant 13): all US1 screen strings externalized as `text/en/ui.json` keys with text gates green; T055's flow passes in the `pseudo` Playwright project using the T052 leakage helper (SC-011/013); the US0 locale spec T048 now runs against this flow and goes green — verify in `apps/client/tests/e2e/skilling.spec.ts` and `apps/client/tests/e2e/locale.spec.ts`

**Checkpoint**: US1 fully functional in `en` and `pseudo-expand` — the MVP idle loop is
playable and tested; US0's standing E2E gate is live.

---

## Phase 5: User Story 2 — Return After Time Away (Priority: P2)

**Goal**: Offline accrual identical to online play up to the 24 h cap, with a return
summary of actions, items, XP, halts (FR-013/014/017; SC-002/005; research R5/R8).

**Independent Test**: Start an activity, advance the test clock 8 h, reload — summary
reports ⌊8 h ÷ action time⌋ actions with matching items/XP; >24 h states the cap;
storage-full mid-absence shows halt time and reason (quickstart US2); flow passes in
`pseudo-expand`.

### Design artifact

- [ ] T065 [US2] Design artifact for the return-summary surface (summary modal content, cap/halt messaging, acknowledge flow; primary/deferred split) — including row treatments for the order-fill/expiry and caravan-arrival event kinds that join the summary in US4/US5 (FR-014) — in `specs/001-tradewright-core/design/return-summary.md`

### Tests for User Story 2 (write first) ⚠️

- [ ] T066 [P] [US2] Engine unit tests: offline ≡ online property (same inputs: tick-replay state equals live-tick state to the unit, SC-005), cap behavior + cap-reached reporting, storage-full halt mid-absence, negative-elapsed clamp (clock set backwards grants nothing), 24 h catch-up completes within a named CI compute-budget constant (the CI-runner proxy for SC-002's 3 s mid-range-phone target; the derivation is recorded at the constant) in `packages/engine/tests/offline.test.ts`
- [ ] T067 [P] [US2] Playwright flow (quickstart US2): activity running → advance test clock 8 h → reload → summary modal matches deterministic prediction; cap and halt variants in `apps/client/tests/e2e/offline.spec.ts`

### Implementation for User Story 2

- [ ] T068 [US2] EventSummary accumulation during fast-forward (actions, items, XP/levels, halts with when/why, net coin; cleared on acknowledgement) in `packages/engine/src/simulation/summary.ts` — built around typed event kinds carrying ids/codes/values only, so US4/US5 append order and caravan events without restructuring and the GUI renders each kind in the viewer's active locale at display time (FR-014/076)
- [ ] T069 [US2] V1 time integrity: persist `lastSeenWallClock` + monotonic mark in SaveGame, clamp negative elapsed, accept forward up to cap in `packages/engine/src/simulation/clock.ts`; optional HTTP-Date network time probe host-side in `apps/client/src/transport/time-probe.ts` (research R8)
- [ ] T070 [US2] Adapter: GetSummary query, CollectSummary command, SummaryReady event; run catch-up on host boot before first query in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T071 [US2] Client: return summary modal per design artifact, composing each structured event kind via ICU messages in the active locale (a locale switch re-renders a pending summary — FR-076), shown on boot when a summary is pending in `apps/client/src/screens/return-summary.tsx`
- [ ] T072 [US2] Pseudo-locale pass: US2 strings externalized, text gates green, T067's flow passes in the `pseudo` project; locale-switch re-render of a populated summary asserted in `apps/client/tests/e2e/locale.spec.ts` (quickstart US0-b)

**Checkpoint**: US1+US2 — the idle game survives closing the app; determinism proven by
tests; summaries are locale-independent data rendered at display.

---

## Phase 6: User Story 3 — Refine and Craft (Priority: P3)

**Goal**: Input-consuming activities at stated ratios, recipe chains across skills,
tier + station gates, exact-shortfall rejection, local-materials-only (FR-015/016/021,
FR-022, FR-037).

**Independent Test**: With seeded raw materials, run a refining activity consuming inputs
at the stated ratio, then craft a finished item consuming outputs of two skills;
missing-input assignment is rejected with the exact shortfall (quickstart US3); flow
passes in `pseudo-expand`.

### Design artifact

- [ ] T073 [US3] Design artifact for refining/crafting screens (recipe browser with lock states, input/output display, missing-input messaging; primary/deferred split) in `specs/001-tradewright-core/design/crafting.md`

### Tests for User Story 3 (write first) ⚠️

- [ ] T074 [P] [US3] Engine unit tests: input consumption at stated ratios (atomic consume+produce per action), insufficient-input rejection listing exact missing items+quantities (as item ids + counts — the GUI renders names from catalogs), inputs-exhausted halt (online + via catch-up), station-tier gate (refining/crafting requires local station effective tier ≥ activity tier), cross-settlement materials unusable with the holding settlement(s) named in the rejection (spec edge case) in `packages/engine/tests/crafting.test.ts`
- [ ] T075 [P] [US3] Playwright flow (quickstart US3): refine seeded inputs → craft a two-skill finished good → missing-input rejection shows shortfall → locked recipe shows required tier in `apps/client/tests/e2e/crafting.spec.ts`

### Implementation for User Story 3

- [ ] T076 [US3] Engine: input-consuming action resolution (consume inputs + produce outputs + XP atomically; halt `inputs-exhausted` with report) extending `packages/engine/src/skills/activities.ts`
- [ ] T077 [US3] Engine: station gating — facility effective-tier lookup per settlement, assignment validation against `stationFamily` (FR-037) in `packages/engine/src/world/facilities.ts`
- [ ] T078 [US3] Adapter: GetActivities lock reasons extended with missing inputs (item id+qty, plus the settlement id(s) where missing items are stored when they exist elsewhere — spec edge case) and station-tier locks; GetSettlementFacilities query in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T079 [US3] Client: recipe/craft browser per design artifact — inputs/outputs/ratios, locked recipes with tier shown, missing-input explanation on attempt naming the settlement(s) where the missing items are stored when held elsewhere in `apps/client/src/screens/crafting.tsx`
- [ ] T080 [US3] Pseudo-locale pass: US3 strings + crafting content text (recipe/item names via `<defId>.<field>` keys) covered, text gates green, T075's flow passes in the `pseudo` project in `apps/client/tests/e2e/crafting.spec.ts`

**Checkpoint**: US1–US3 — full produce loop (gather → refine → craft) playable and tested.

---

## Phase 7: User Story 4 — Trade at the Local Market (Priority: P4)

**Goal**: Per-settlement order books linked into one globally browsable market (matching
never crosses settlements) — limit orders with escrow, price-time matching with partial
fills, fees/taxes as sinks, NPC price drift + the FR-054 coin faucet (FR-031–036,
FR-050–054; research R4/R13).

**Independent Test**: One player lists a sell order, another (or the NPC principal) buys
it in the same settlement; the listing is visible from every settlement via the linked
market but matches and delivers only on its home settlement's book; buying out NPC sell
depth raises the quote next market tick (quickstart US4); flow passes in `pseudo-expand`
with locale-correct price formatting.

### Design artifact

- [ ] T081 [US4] Design artifact for trading post screens (item list with best bid/ask; depth + history one tap deeper per Principle VIII; order placement ≤ 6 inputs (SC-004) with fee/tax disclosure; my-orders; price/coin displays sized for locale-grouped formatting — FR-073/077) in `specs/001-tradewright-core/design/market.md`

### Tests for User Story 4 (write first) ⚠️

- [ ] T082 [P] [US4] Engine unit tests: order placement escrows goods/coin, listing fee disclosed+charged, price-then-time priority matching, partial fills, immediate cross fills at best price, sales tax deducted as sink Transaction, expiry/cancel returns escrow in full, matching isolation (orders match within one settlement's book only; books globally browsable), self-match skip (same-owner orders never match each other, coexisting on the book — FR-033) in `packages/engine/tests/market.test.ts`
- [ ] T083 [P] [US4] Engine unit tests: NPC stock-pressure drift (player buys deplete stock → quote rises; bounded by priceBounds), NPC order refresh on market tick, floor buy orders within period budget, demand sweeps buying cheapest sells within budget, faucet/sink telemetry counters per settlement per period in `packages/engine/tests/npc-market.test.ts`
- [ ] T084 [P] [US4] Property test: conservation across randomized trade/cancel/expiry sequences — no item or coin duplicated or lost, every mutation has a Transaction (SC-010, data-model invariant 1) in `packages/engine/tests/conservation.test.ts`
- [ ] T085 [P] [US4] Playwright flow (quickstart US4): open a market with an empty order book (assert empty-book state renders as a state, not an error, and the first order can be placed — spec edge case) → place sell order (escrow visible) → a same-owner crossing buy never matches it (FR-033) → an NPC counterparty fills it on the next market tick with tax disclosed → goods/coin land correctly → listing browsable from another settlement via the linked market, lives only on its home book, remote buy against an NPC sell listing delivers to storage at the listing's settlement → NPC drift check in `apps/client/tests/e2e/market.spec.ts`

### Implementation for User Story 4

- [ ] T086 [US4] Market module: per-settlement order book, escrow lifecycle, price-time matching with partial fills, fees/taxes, durations + expiry on tick, Trade records feeding price history in `packages/engine/src/market/orderbook.ts` and `packages/engine/src/market/matching.ts`
- [ ] T087 [US4] NPC module: NpcMarketState evolution (stock pressure quote curve), NPC principal order placement/refresh per market tick, floor buy orders + demand sweeps from per-settlement budgets, faucet/sink telemetry counters (FR-053/054) in `packages/engine/src/npc/simulation.ts` and `packages/engine/src/npc/faucet.ts`
- [ ] T088 [US4] Adapter: PlaceOrder (remote buy orders at any settlement; sell orders only where the goods sit, FR-032), CancelOrder commands; GetMarket (any settlement's book — linked-market global visibility, FR-035), GetMyOrders, GetTransactions (paged) queries; OrderFilled/OrderPartiallyFilled/OrderExpired/OrderCancelled events with proceeds & tax in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T089 [US4] Client: trading post screens per design artifact — item list with best bid/ask, item detail (depth, recent trades) with an explicit empty-book state (no liquidity shows as a normal state with order placement still available, never an error), order placement form with full fee disclosure before confirm, my-orders with status; all coin/price values through the T041 coin formatter in `apps/client/src/screens/market.tsx`
- [ ] T090 [US4] Client: transaction-log screen (paged audit history, FR-052) rendering structured Transaction records — kind codes, item ids, amounts — via catalogs in the active locale at view time (a locale switch re-renders history — FR-076) in `apps/client/src/screens/transactions.tsx`
- [ ] T091 [US4] Extend EventSummary for market events: order fills/expiries resolved during absence appear in the return summary with proceeds and tax detail (FR-014) — accumulation in `packages/engine/src/simulation/summary.ts`, unit tests added to `packages/engine/tests/offline.test.ts`, summary-modal assertion added to `apps/client/tests/e2e/offline.spec.ts`
- [ ] T092 [US4] Pseudo-locale pass: US4 strings + market content text covered, text gates green, T085's flow passes in the `pseudo` project; locale-switch re-render of populated transaction history asserted in `apps/client/tests/e2e/locale.spec.ts` (FR-076, quickstart US0-b)

**Checkpoint**: US1–US4 — production converts to profit on living local markets.

---

## Phase 8: User Story 5 — Haul Goods Between Settlements (Priority: P5)

**Goal**: Weight-limited caravans on timed, risky routes; personal travel; hauling
progression; the full arbitrage loop (FR-040–045, FR-002, FR-041).

**Independent Test**: With price spreads seeded between two settlements, dispatch a
caravan, advance the clock past arrival, travel the character, sell high — end-to-end
profit equals spread − taxes − fees − dispatch − risk losses (quickstart US5); flow
passes in `pseudo-expand` with locale-correct duration formatting.

### Design artifact

- [ ] T093 [US5] Design artifact for map/routes, caravan composition, and shipment-tracking screens (weight gauge, duration/risk/cost pre-confirm, in-transit progress; duration displays through the shared locale duration helper — FR-073; primary/deferred split) in `specs/001-tradewright-core/design/caravans-map.md`

### Tests for User Story 5 (write first) ⚠️

- [ ] T094 [P] [US5] Engine unit tests: dispatch validation (weight ≤ capacity, slot limit with explanation, costs payable), risk rolled exactly once per shipment from state RNG, mitigation reduces loss by factor, arrival deposits into destination storage (online and via catch-up), hauling skill levels by completed shipments growing capacity/slots, personal travel halts assignment + location transitions (FR-002/044), and a caravan and personal travel dispatched on the same route run their timers independently (spec edge case) in `packages/engine/tests/caravan.test.ts`
- [ ] T095 [P] [US5] Playwright flow (quickstart US5): buy low in A → dispatch caravan to B (weight/duration/risk/costs shown pre-confirm) → advance clock → travel to B → sell high → profit matches prediction; UI never blocks during transit; over-limit dispatch explains slot availability in `apps/client/tests/e2e/caravan.spec.ts`

### Implementation for User Story 5

- [ ] T096 [US5] Caravan module: shipment lifecycle (manifest escrow from storage, departAt/arriveAt timers independent of assignment, seeded risk resolution + mitigation, delivery deposit, caravan-loss Transactions) in `packages/engine/src/caravan/shipments.ts`
- [ ] T097 [US5] Hauling progression: skill XP per completed shipment driving capacity and concurrent-slot growth (FR-041) in `packages/engine/src/caravan/hauling.ts`
- [ ] T098 [US5] Personal travel: locationState `traveling` transitions on route travelMinutes, assignment halt `travel`, arrival enables destination activities/market/storage in `packages/engine/src/world/travel.ts`
- [ ] T099 [US5] Adapter: DispatchCaravan, TravelTo commands; GetRoutes (durations/risk/costs from current settlement), GetShipments (progress + ETA) queries; CaravanArrived (with risk outcome detail as codes/values), TravelArrived events in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T100 [US5] Client: map/routes screen per design artifact (destination, caravan + personal durations, risk, costs — durations via the shared locale helper) in `apps/client/src/screens/map.tsx`
- [ ] T101 [US5] Client: caravan composition flow (weight gauge, mitigation option, full cost pre-confirm) + shipment tracking with arrival countdown in `apps/client/src/screens/caravans.tsx`
- [ ] T102 [US5] Extend EventSummary for caravan events: arrivals (with risk outcome detail) and personal-travel completions resolved during absence appear in the return summary (FR-014) — accumulation in `packages/engine/src/simulation/summary.ts`, unit tests added to `packages/engine/tests/offline.test.ts`, summary-modal assertion added to `apps/client/tests/e2e/offline.spec.ts`
- [ ] T103 [US5] Pseudo-locale pass: US5 strings + route/settlement content text covered, text gates green, T095's flow passes in the `pseudo` project (timers and countdowns stay legible under ~40% expansion — FR-077/SC-013) in `apps/client/tests/e2e/caravan.spec.ts`

**Checkpoint**: US1–US5 — the complete M1 solo loop: gather → refine → craft → arbitrage
between towns, validated in base and pseudo locales.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Remaining M1 requirements that span stories, economy tuning, and the
milestone's validation pass (including the quickstart Part V acceptance checklist).

- [ ] T104 Design artifact for the storage screen and the settings-screen extension (storage capacity view + expansion purchase with escalating cost and facility-tier cap disclosure; per-category notification opt-ins with honest capability notes joining the T046 language section; primary/deferred split per Principle VIII) in `specs/001-tradewright-core/design/storage-settings.md` (Principle VII — before T105/T107)
- [ ] T105 ExpandStorage end-to-end: engine coin-sink purchase at escalating disclosed costs capped by storage-facility effective tier (FR-023/037), adapter command, purchase UI on the storage screen per design artifact, unit tests in `packages/engine/src/world/storage.ts`, `packages/engine/src/adapter/local-game-host.ts`, `apps/client/src/screens/storage.tsx`, `packages/engine/tests/storage-expansion.test.ts`
- [ ] T106 Notification model: engine-side notifiable-moment scheduler over known timers (caravan ETA, offline cap, order fill/expiry), NotificationPrefs state (all categories off by default), SetNotificationPref/GetNotificationPrefs in adapter, unit tests (FR-064, research R15) in `packages/engine/src/world/notifications.ts` and `packages/engine/tests/notifications.test.ts` — moments carry category + value payloads only; text is composed at delivery
- [ ] T107 V1 device-scheduled notification delivery adapter via service worker + Notification API, composing notification text from `ui.json` template keys in the locale active at delivery time (FR-064/076), with honest capability notes (iOS installed-PWA requirement; the committed-start-approaching category labeled as online-version content per the FR-262 pattern — no V1 M1 moment fires it), per-category opt-in settings UI extending the T050 settings screen per design artifact in `apps/client/src/notifications/scheduler.ts` and `apps/client/src/screens/settings.tsx`
- [ ] T108 [P] Playwright flows for the Phase 9 screens: storage expansion (escalating cost disclosed → purchase → capacity grows → facility-tier cap explained at max) in `apps/client/tests/e2e/storage.spec.ts`; settings (all notification categories off by default → opt in per category → preference persists across reload; language selection persists across reload) in `apps/client/tests/e2e/settings.spec.ts`
- [ ] T109 [P] Economy telemetry surface: per-settlement faucet/sink flow counters per period queryable for tuning (FR-053) in `packages/engine/src/npc/telemetry.ts` with tests in `packages/engine/tests/telemetry.test.ts`
- [ ] T110 Joint economy model (plan "Known Design Gaps" tuning precondition): simulation script over launch content checking SC-006 (no single settlement's local resources produce >60% of launch recipes) and SC-007 (both clauses: ≥1 post-tax, post-risk profitable caravan route in any 24 h window AND hauling income within ±50% of production-focused play at equivalent investment) jointly, implementing the behavior model and healthy-world/equivalent-investment definitions of research R16 with all simulation parameters (actor counts, warm-up, window, seeds, decision cadence) as named constants in the test; tune `packages/content/data/*.json` until green, in `packages/content/tests/economy-model.test.ts`
- [ ] T111 [P] Full-loop determinism test: identical SaveGame + content + elapsed ticks ⇒ identical state across skilling, market, NPC, and caravan systems together (quickstart "feature validated" item 3), run under both `en` and pseudo locale hosts (extends T047's neutrality property to the full M1 system set — SC-014) in `packages/engine/tests/determinism.test.ts`
- [ ] T112 [P] Phone-portrait usability audit (SC-009/SC-013): Playwright assertions that primary actions are reachable and visible at 390×844 on every shipped screen, run in **all three** locale projects — the `pseudo-expand` run is the FR-077 expanded-text stress validation (no clipped or overlapping gameplay-critical information: prices, warnings, timers); the `pseudo-cjk` run is the smoke-level CJK script-coverage validation (glyphs render, nothing critical clipped — quickstart US0-f, spec i18n assumptions) — in `apps/client/tests/e2e/usability.spec.ts`
- [ ] T113 [P] Pacing audits as E2E specs: first activity < 3 min (SC-001), daily check-in loop < 2 min (SC-003), order placement ≤ 6 inputs (SC-004), language switch fully rendered < 2 s (SC-012), and FR-062 immediate feedback — primary interactions on every shipped screen acknowledge locally (visible UI response without awaiting engine events) in `apps/client/tests/e2e/pacing.spec.ts`
- [ ] T114 Quickstart Parts I & V validation run: all commands green locally + CI on one commit; all five Part I story scenarios pass; the Part V acceptance checklist holds (text gates green, `pseudo-expand` E2E project green for every implemented flow, live-switch green, locale-neutrality replay green); fix any stale statements in `specs/001-tradewright-core/quickstart.md` (Principle X)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories. Includes the
  i18n foundation (text schemas/gates T020/T024/T025, pseudo generator T026, base
  catalogs T027, client i18n runtime T041) per plan.md M0
- **US0 (Phase 3)**: Depends on Phase 2. Implementation + unit/gate tasks complete
  immediately; its E2E spec (T048) runs against the US1 flow and goes green at the US1
  checkpoint, then stands as a continuous gate (Design Invariant 13)
- **User Stories (Phases 4–8)**: All depend on Phase 2 (+US0's T052 helper for their
  pseudo passes). The ladder is deliberately sequential by priority (P1→P5): US2 needs
  US1's activities to summarize; US3 extends US1's activity engine; US4 needs US3's goods
  worth trading; US5 needs US4's markets in two towns. Client screens within different
  stories are independent once their engine modules exist
- **Polish (Phase 9)**: T104 (design artifact) before the screen tasks T105/T107;
  T105–T108 need Phase 2 + the screens they touch (T107 extends US0's settings screen);
  T110/T111 need all of US1–US5; T112–T114 need all screens shipped

### User Story Dependencies

| Story | Depends on | Reason |
|---|---|---|
| US0 (P0) | Foundational only (E2E needs US1's flow) | cross-cutting foundation; validated against every story as it lands |
| US1 (P1) | Foundational only | MVP; closes US0's E2E gate |
| US2 (P2) | US1 | summarizes US1's activity accrual |
| US3 (P3) | US1 | extends activity resolution with inputs + station gates |
| US4 (P4) | US3 (goods), US1 (storage/wallet) | trades produced goods |
| US5 (P5) | US4 | arbitrage requires markets in ≥2 settlements |

### Within Each User Story

- Design artifact → before client screen tasks (Principle VII)
- Tests written first and failing → engine modules → adapter → client screens → E2E green
- Engine modules before adapter wiring; adapter before screens
- The story's pseudo-locale pass is its last task — the story checkpoint includes it

### Parallel Opportunities

- Phase 1: T002–T009, T011 all [P] after T001
- Phase 2: contract DTOs T012–T015 [P]; schemas T017–T020 [P]; content + text files
  T027–T031 [P] after schemas; engine core and client shell tracks proceed in parallel
- Phase 3: T047–T049 [P] with each other after T046
- Within each story: the unit-test and E2E-test tasks are [P] with each other; US4's
  three test files T082–T084 are [P]
- Across stories (if staffed): US2 and US3 can proceed in parallel after US1 (they touch
  different engine files); US4 engine work can start while US3 client screens finish

---

## Parallel Example: User Story 4

```text
# After Phase 6 completes, launch all US4 test tasks together:
Task T082: market matching unit tests in packages/engine/tests/market.test.ts
Task T083: NPC drift + faucet unit tests in packages/engine/tests/npc-market.test.ts
Task T084: conservation property test in packages/engine/tests/conservation.test.ts
Task T085: market E2E flow in apps/client/tests/e2e/market.spec.ts

# Then implement engine modules in parallel:
Task T086: market module (orderbook.ts, matching.ts)
Task T087: NPC module (simulation.ts, faucet.ts)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup → CI live from first commit (constitution requirement)
2. Phase 2: Foundational — contract v0, validated starter content + text catalogs,
   pseudo-locale pipeline, deterministic core, client shell with i18n runtime
3. Phase 3: US0 surface (settings/language) + standing validation suite
4. Phase 4: US1 → **STOP and VALIDATE**: the idle loop is playable on a phone, E2E green
   in `en` **and** `pseudo-expand`; US0's locale spec green
5. This is the MVP — the assign-and-accrue loop that everything else builds on,
   localization-ready from its first screen (spec User Story 0 rationale)

### Incremental Delivery

Each story phase ends independently playable and Playwright-tested in both locale
projects (plan.md M1 requirement + Design Invariant 13): US1 idle loop → US2 offline →
US3 produce chains → US4 markets → US5 arbitrage = full M1 solo loop. Commit and push
after every task or logical group (constitution Development Workflow).

### Milestone Exit (M1 done)

`npm run check`, `npm test`, `npm run validate:content`, `npm run test:e2e` (all three
locale projects) all green on one commit; quickstart Part I scenarios and the Part V acceptance
checklist pass; joint economy model (T110) holds; then regenerate tasks for M2 (combat
core, Stories 6–13) with `/speckit-tasks`.
