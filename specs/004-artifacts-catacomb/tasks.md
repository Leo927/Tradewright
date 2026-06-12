# Tasks: Relic Gear & Delve Descents

**Input**: Design documents from `/specs/004-artifacts-catacomb/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/relic-delve-protocol.md, contracts/content-schema.md, quickstart.md

**Tests**: MANDATORY per constitution Principle I (Test-First Quality) — every story includes unit test tasks (written first, failing before implementation) and Playwright E2E tasks on the 390×844 phone viewport. Same commands as 001/003: `npm test`, `npm run test:e2e`, `npm run validate:content`.

**Upstream dependency**: builds on 002 (gear/equip path, no-ruin, control modes — spec-fixed shapes only, research R11) and 003 (encounter runtime, gearmods, group/leadership, reward tables). Tasks below assume 003's M3.0 modules exist; the three R11 touchpoints (equip path, item-instance representation, inert-modifier flagging) must be re-verified when 002's plan lands.

**Organization**: Tasks are grouped by user story (spec priorities P1–P4, matching plan milestones M4.0–M4.3) so each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 (relic chase/equip), US2 (awakening), US3 (delve core), US4 (depth ladder)
- Every task names exact file paths

## Path Conventions

001 npm-workspaces monorepo (plan.md Project Structure) — no new packages:

- Contract: `packages/contract/src/relics/`, `packages/contract/src/delve/`
- Engine: `packages/engine/src/relics/`, `packages/engine/src/delve/`, extensions in `gearmods/`, `market/`, `adapter/`; tests in `packages/engine/tests/`
- Content: `packages/content/schemas/{relics,delves}/`, `packages/content/data/{relics,delves}/`, tests in `packages/content/tests/`
- Client: `apps/client/src/screens/{relics,delve}/`, E2E in `apps/client/tests/e2e/`
- UI design artifacts: `specs/004-artifacts-catacomb/design/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Directory scaffolding and the originality gate, so authoring and engine work can start anywhere

- [ ] T001 Create content data directory tree `packages/content/data/relics/{relics,signature-modifiers}/` and `packages/content/data/delves/{sites,rooms,depth-modifiers,venture-tables,reward-caps}/` and register both trees with the content loader index in `packages/content/src/index.ts`
- [ ] T002 [P] Scaffold contract modules `packages/contract/src/relics/index.ts` and `packages/contract/src/delve/index.ts` with barrel exports wired into `packages/contract/src/index.ts` (additive MINOR per 001 versioning policy)
- [ ] T003 [P] Scaffold engine modules `packages/engine/src/relics/index.ts` and `packages/engine/src/delve/index.ts` (zero DOM/framework imports; injected clock only)
- [ ] T004 [P] Extend the originality denylist with "Artifact"/"Artifacts" and "Catacomb"/"Catacombs" as feature labels in the 001 world-integrity test (integrity test 8) in `packages/content/tests/originality-denylist.test.ts`

**Checkpoint**: Directory skeletons exist; content build picks up (empty) new trees

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contract types, content schemas, the signature-exclusion rule, and the save-format extension that every user story builds on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [P] Define relic contract types in `packages/contract/src/relics/`: compendium/awakening DTOs; commands `EquipRelic`, `SwapRelic`, `ConfirmAwakeningStep`, `LockRelicModifier`; queries `GetRelicCompendium`, `GetAwakeningTrack`; events `RelicGranted`, `DuplicateCompensated`, `AwakeningStepCompleted`, `RelicModifierLocked`; error codes `RELIC_ALREADY_OWNED`, `RELIC_LIMIT_EXCEEDED`, `AWAKENING_DEED_INCOMPLETE`, `AWAKENING_MATERIALS_MISSING`, `SIGNATURE_MODIFIER_IMMUTABLE` (contracts/relic-delve-protocol.md; serializable only)
- [ ] T006 [P] Define delve contract types in `packages/contract/src/delve/`: site/descent/landing/ledger DTOs; commands `EnterDelve`, `RespondReadyCheck`, `CallLandingDecision`, `AbandonDescent`; queries `GetDelveSites`, `GetDescentState`, `GetDepthRecords`, `GetDepthLeaderboard`; events `DescentStarted`, `DescentEnded`, `FloorCleared`, `LandingReached`, `ReadyCheckUpdated`, `MemberExited`, `DepthRecordSet`, `LeaderboardPosted`; error codes `NOT_AT_LANDING`, `READY_CHECK_PENDING` (contracts/relic-delve-protocol.md)
- [ ] T007 [P] Author Zod schemas for relic content in `packages/content/schemas/relics/`: `RelicDef` (tier, equipCategory, gearSlot, signatureModifierId, slotCount, source, duplicateCompensation, awakeningTrack), `AwakeningStepDef`, `DeedRequirementDef` (closed kind set), `RelicSourceRef`; extend the 003 `GearModifierDef` schema with optional `signatureOf` (data-model.md; no authorable gear-score field per authoring rule 3)
- [ ] T008 [P] Author Zod schemas for delve content in `packages/content/schemas/delves/`: `DelveSiteDef` (roomPool, encounterPools with depthBand/bossGrade, depthModifierPool, floorShape ≤ 5 min, difficulty/bonusMultiplier curves, partyScaling, ventureBonusTable ref, sessionExpectation), `RoomDef`, `DepthModifierDef`, `CurveExpr` (total over all depth ≥ 1), `VentureBonusTable`, reward-cap lever config (data-model.md)
- [ ] T009 Wire the new schema trees into the content build/validation pipeline so `npm run validate:content` validates `data/relics/` and `data/delves/` at build time in `packages/content/src/validate.ts`
- [ ] T010 [P] Unit tests for signature exclusion: a `GearModifierDef` with `signatureOf` is never drawn from any `ModifierPoolDef` and is never a valid craft-mod target, in `packages/engine/tests/gearmods/signature-exclusion.test.ts` (FR-301, research R3)
- [ ] T011 Implement `signatureOf` exclusion in modifier pool draws and craft-mod target validation in `packages/engine/src/gearmods/`
- [ ] T012 [P] Unit tests for the save-format extension: round-trip of relic grant records, awakening progress, descent state, depth records, weekly entries; migration from the prior save version, in `packages/engine/tests/persistence/save-format-004.test.ts`
- [ ] T013 Extend the versioned IndexedDB save format with `RelicGrantRecord`, `AwakeningProgress`, `DescentInstance`, `DepthRecord`, `WeeklyExpeditionEntry` collections in the engine persistence module `packages/engine/src/persistence/`

**Checkpoint**: Contract and schemas compile, signature exclusivity enforced, save format versioned — user stories can start (in parallel if staffed)

---

## Phase 3: User Story 1 - Chase and Equip a Relic (Priority: P1) 🎯 MVP

**Goal**: Relic compendium with full disclosure; source pays each character exactly once (duplicate compensation thereafter); relics trade like all goods but a recipient never holds two copies; equip limit with guided swap; one V1 mettle-trial relic earnable end-to-end (plan milestone M4.0)

**Independent Test**: Seed one relic with a mettle-trial source; a test player completes the source, receives the relic exactly once, equips it, and combat logs show the signature modifier's stated effect; the source never pays a second copy, and a market purchase of an already-owned relic is blocked (spec US1)

### Tests for User Story 1 (MANDATORY — write first, ensure they FAIL) ⚠️

- [ ] T014 [P] [US1] Content integrity test 1 (signature exclusivity: resolves, `signatureOf` reciprocal, absent from all pools and craft-mod recipes, exactly one owning relic) in `packages/content/tests/relics/signature-exclusivity.test.ts`
- [ ] T015 [P] [US1] Content integrity test 2 (every relic has exactly one resolving source; ≥ 1 relic with a mettle-trial V1-obtainable source; duplicate compensation present on every relic — tests 2 + 7 of contracts/content-schema.md) in `packages/content/tests/relics/sources.test.ts`
- [ ] T016 [P] [US1] Unit tests for grant-once + duplicate compensation: first source completion mints a dormant relic (signature active, slots sealed, top-of-band gear score, no roll) and writes the grant record; every repeat completion pays compensation forever, even after the relic is sold, in `packages/engine/tests/relics/grant-once.test.ts` (SC-304)
- [ ] T017 [P] [US1] Unit tests for trade-delivery uniqueness: market purchase, escrow release, and shipment delivery reject `RELIC_ALREADY_OWNED` before any payment when the recipient owns a copy; awakening state travels intact on successful transfer; after selling, repurchase succeeds, in `packages/engine/tests/relics/trade.test.ts`
- [ ] T018 [P] [US1] Unit tests for the equip-limit category rule: one relic per category (weapon-focus / armor-trinket, content-tunable); direct equip, loadout import, and swap all return `RELIC_LIMIT_EXCEEDED` with the conflicting item id; respec away from the signature's school flags it inert, never errors, in `packages/engine/tests/relics/equip-limit.test.ts`
- [ ] T019 [P] [US1] Unit tests for the compendium query: every authored relic returned owned-or-not with name, tier, full signature modifier, category, source, awakening overview, duplicate compensation, ownership state; multiplayer-only sources carry `ONLINE_VERSION_ONLY`, in `packages/engine/tests/relics/compendium.test.ts`

### Implementation for User Story 1

- [ ] T020 [P] [US1] Author signature `GearModifierDef` files (one per launch relic, `signatureOf` set, `EffectExpr` vocabulary, sideways power per FR-306) in `packages/content/data/relics/signature-modifiers/`
- [ ] T021 [US1] Author 6–10 `RelicDef` files spanning all source formats (mettle trial, afflicted dungeon, raid, world boss, invasion, delve depth) with ≥ 1 V1 mettle-trial relic, original names/lore, duplicate compensation, and awakening tracks in `packages/content/data/relics/relics/` (references T020 signature ids)
- [ ] T022 [US1] Implement `RelicGrantRecord` store, grant-once rule, duplicate compensation payout, and dormant relic minting in `packages/engine/src/relics/grants.ts` (research R1; FR-303/304)
- [ ] T023 [US1] Implement the recipient-ownership check (indexed lookup over inventory/storage/equipped/escrow) and wire it into market purchase, escrow release, and shipment delivery seams in `packages/engine/src/relics/ownership.ts` plus the existing trade modules (research R1)
- [ ] T024 [US1] Implement equip-limit category validation in the 002 gear-equip command path with `SwapRelic` guided resolution and inert-signature flagging in `packages/engine/src/relics/equip-limit.ts` (research R10; R11 touchpoint a/c)
- [ ] T025 [US1] Implement `GetRelicCompendium` joining authored `RelicDef`s with per-character ownership/grant/awakening state and V1 honest labels in `packages/engine/src/relics/compendium.ts` (research R9; local-immediate)
- [ ] T026 [US1] Wire the mettle-trial source payout into relic grants (003 reward resolution → `grants.ts`, source threshold from `RelicSourceRef`) in `packages/engine/src/relics/sources.ts` (FR-307)
- [ ] T027 [US1] Wire relic commands/queries/events (`EquipRelic`, `SwapRelic`, `GetRelicCompendium`, `RelicGranted`, `DuplicateCompensated`) into `LocalGameHost` in `packages/engine/src/adapter/` (V1 in-process; optimistic-with-reconciliation for equip/swap per Principle IX)
- [ ] T028 [P] [US1] Design artifact for compendium + relic detail screens (primary task / deferred depth declared per Principle VIII) in `specs/004-artifacts-catacomb/design/relic-compendium.md`
- [ ] T029 [P] [US1] Design artifact for the equip-conflict swap sheet in `specs/004-artifacts-catacomb/design/relic-swap-sheet.md`
- [ ] T030 [US1] Implement compendium + relic detail screens per `design/relic-compendium.md` in `apps/client/src/screens/relics/` (depends on T028)
- [ ] T031 [US1] Implement the equip-conflict swap sheet per `design/relic-swap-sheet.md` in `apps/client/src/screens/relics/` (depends on T029)
- [ ] T032 [US1] Playwright E2E (390×844): compendium browse with honest labels → earn the mettle-trial relic → dormant grant → equip → combat log shows the signature effect → second same-category equip offers the guided swap, in `apps/client/tests/e2e/relic-chase.spec.ts` (asserts design-driven structure/labels per Gate 6)

**Checkpoint**: US1 fully functional — a V1 player can chase, earn, equip, trade a relic; MVP shippable

---

## Phase 4: User Story 2 - Awaken a Relic (Priority: P2)

**Goal**: Disclosed awakening tracks — deed counters, atomic consume-and-unseal steps, player-chosen modifier locks via the 003 craft-mod path, re-locking, quality grade rising to maximum; awakening state travels with the item, deed progress stays per character (plan milestone M4.1)

**Independent Test**: With a dormant relic and seeded materials, complete one awakening step and verify the deed counter, material consumption, slot unsealing, player-chosen modifier lock, and quality-grade rise all match the disclosed track (spec US2)

### Tests for User Story 2 (MANDATORY — write first, ensure they FAIL) ⚠️

- [ ] T033 [P] [US2] Content integrity test 3 (every track: contiguous steps from 1, unseals cover exactly slotCount − 1, ≥ 1 market-tradable material per track) in `packages/content/tests/relics/awakening-economy.test.ts` (SC-303)
- [ ] T034 [P] [US2] Unit tests for awakening steps: deed counters accumulate per character per `DeedRequirementDef` kind; confirmation is atomic (requirement met + materials in local storage → consume, unseal, stepsCompleted++, progress reset); `AWAKENING_DEED_INCOMPLETE` / `AWAKENING_MATERIALS_MISSING` on failure; unsealed state travels on trade while the buyer's deed progress starts at zero, in `packages/engine/tests/relics/awakening.test.ts` (research R2)
- [ ] T035 [P] [US2] Unit tests for modifier locking: lock and re-lock through the 003 craft-mod path at disclosed costs; quality grade derives from filled count with the signature counting (dormant = grade 1, full awakening = crafted-gear maximum); `SIGNATURE_MODIFIER_IMMUTABLE` on any attempt to replace/remove the signature, in `packages/engine/tests/relics/modifier-lock.test.ts` (FR-305, research R3)

### Implementation for User Story 2

- [ ] T036 [US2] Implement deed-counter accumulation (closed `DeedRequirementDef` kinds subscribed to engine events: defeat-family, clear-format-at-rank, reach-delve-depth, deliver-trade-volume) and `AwakeningProgress` records in `packages/engine/src/relics/awakening.ts`
- [ ] T037 [US2] Implement `ConfirmAwakeningStep` as a single atomic command (validate → consume materials → unseal slot → record on item → reset progress) in `packages/engine/src/relics/awakening.ts` (depends on T036)
- [ ] T038 [US2] Implement `LockRelicModifier` reusing the 003 craft-mod mechanism verbatim, with re-lock at disclosed cost and signature immutability, in `packages/engine/src/relics/modifier-lock.ts`
- [ ] T039 [US2] Extend `InspectGearItem` (003) to return relic awakening state and the signature modifier's inert flag in `packages/engine/src/gearmods/`
- [ ] T040 [US2] Wire `ConfirmAwakeningStep`, `LockRelicModifier`, `GetAwakeningTrack`, `AwakeningStepCompleted`, `RelicModifierLocked` into `LocalGameHost` in `packages/engine/src/adapter/` (server-confirmed with operation-scoped pending; V1 resolves same tick)
- [ ] T041 [P] [US2] Design artifact for the awakening track screen (steps, progress, confirm control with scoped pending state) in `specs/004-artifacts-catacomb/design/awakening-track.md`
- [ ] T042 [US2] Implement the awakening track UI per `design/awakening-track.md` in `apps/client/src/screens/relics/` (depends on T041)
- [ ] T043 [US2] Playwright E2E (390×844): open track → every step shows deed/materials/unseal target with live progress → confirm a step (materials consumed, slot unsealed) → lock then re-lock a modifier → grade rises → signature shown immutable, in `apps/client/tests/e2e/relic-awakening.spec.ts`

**Checkpoint**: US1 + US2 work independently — relics are a full progression arc feeding the market

---

## Phase 5: User Story 3 - Descend into a Delve (Priority: P3)

**Goal**: Procedural descents for parties of 1–3 over the 003 encounter engine: ≤ 5-minute floors, two-stream rewards (base haul banks instantly; venture ledgers stake), landing ready-check with withdraw/descend/opt-out, wipe forfeits only the unbanked pool — no-ruin by construction; V1 solo delves fully playable (plan milestone M4.2)

**Independent Test**: A three-player party (scripted co-player harness) clears two floors, withdraws, and receives base haul plus the pool at the stated multiplier; an identical party descends a third floor, wipes, and keeps the base haul while forfeiting exactly the unbanked pool — with only standard durability/recovery costs (spec US3)

### Tests for User Story 3 (MANDATORY — write first, ensure they FAIL) ⚠️

- [ ] T044 [P] [US3] Content integrity tests 5–7 (sites: curves total over every depth ≥ 1, floor shape ≤ 5 min, first-landing expectation ≈ 10 min, scaling bounds + diminish band declared, boss-grade intervals disclosed; pools reference only existing 003 `EncounterDef`s and resolving rooms/depth-modifiers; reward-cap lever schema-valid and inactive at launch) in `packages/content/tests/delves/sites.test.ts`
- [ ] T045 [P] [US3] Property tests for floor assembly determinism: identical `(siteDef, seed, depth, partySize)` → identical `FloorPlan` in 100% of cases; distinct seeds → materially different layouts/encounter sequences; function total over a swept depth range, in `packages/engine/tests/delve/assembly.test.ts` (SC-307, FR-310)
- [ ] T046 [P] [US3] Unit tests for curve evaluation: difficulty, bonus multiplier, and party scaling as pure functions of `(depth, partySize)`; breakpoints/caps honored; diminish curve beyond the full-party band, in `packages/engine/tests/delve/curves.test.ts` (research R8)
- [ ] T047 [P] [US3] Unit tests for two-stream ledger accounting: base haul banks instantly through the 003 reward path; per-member accruals from per-member RNG sub-streams at the depth multiplier; withdraw pays every ledger; wipe forfeits exactly the unbanked ledgers; opt-out pays exactly that member's ledger; backfilled members accrue only from floors present, in `packages/engine/tests/delve/ledgers.test.ts` (SC-306, FR-313, research R6)
- [ ] T048 [P] [US3] Unit tests for the landing protocol against the 003 scripted co-player harness: ready-check responses; individual opt-out exits with full personal share and scaling recomputes; leader-only descend; auto-AI auto-readies but never descends; no live leader → leadership transfer then auto-withdraw after grace; mid-floor abandonment forfeits only the abandoner's unbanked share, in `packages/engine/tests/delve/landing.test.ts` (FR-312, research R5)
- [ ] T049 [P] [US3] Unit tests for the descent lifecycle: state machine `descending → at-landing → … → ended(withdrawn | wiped | abandoned)`; lazy floor generation; idle-accrual suspension inside and resume from exit timestamp; depth recorded on end, in `packages/engine/tests/delve/descent.test.ts` (FR-310, 003 FR-205)

### Implementation for User Story 3

- [ ] T050 [P] [US3] Author delve content: 2–3 `DelveSiteDef`s in distinct regions, `RoomDef`s, `DepthModifierDef`s with full disclosure text, `VentureBonusTable`s carrying the delve-exclusive materials, and the reward-cap lever config (disclosed, inactive) in `packages/content/data/delves/`
- [ ] T051 [US3] Implement `CurveExpr` evaluation as pure engine functions of `(depth, partySize)` in `packages/engine/src/delve/curves.ts`
- [ ] T052 [US3] Implement `assembleFloor(siteDef, seed, depth, partySize) → FloorPlan` as a pure function over authored pools with deterministic per-descent RNG sub-streams and depth-indexed weights (boss-grade intervals via weighting) in `packages/engine/src/delve/assembly.ts` (research R4)
- [ ] T053 [US3] Implement the `DescentInstance` runtime: state machine, lazy floor generation, each floor a standard 003 `EncounterInstance`, idle-accrual suspension, depth tracking in `packages/engine/src/delve/descent.ts` (depends on T051, T052; research R5)
- [ ] T054 [US3] Implement `VentureLedger` accounting: per-member accrual per cleared floor at the depth multiplier from per-member RNG sub-streams; `staked → paid(withdraw | opt-out) | forfeited(wipe | abandon)` transitions; base haul routed through the 003 reward path untouched, in `packages/engine/src/delve/ledgers.ts` (research R6)
- [ ] T055 [US3] Implement the landing protocol: `LandingState` with disclosed pool value + next-floor preview, ready-check with opt-out, leader call validation, auto-AI never-descend rule, leadership-grace auto-withdraw, mid-floor abandonment, landing-time backfill proration, in `packages/engine/src/delve/landing.ts` (depends on T053, T054)
- [ ] T056 [US3] Wire delve commands/queries/events (`EnterDelve`, `RespondReadyCheck`, `CallLandingDecision`, `AbandonDescent`, `GetDelveSites`, `GetDescentState`, lifecycle events) into `LocalGameHost` for V1 solo descents in `packages/engine/src/adapter/` (same reducer V2 will host server-side, FR-318)
- [ ] T057 [P] [US3] Design artifact for the delve site entry sheet (party scaling, multiplier curve, stake rules, session expectation; primary task / deferred depth declared) in `specs/004-artifacts-catacomb/design/delve-entry-sheet.md`
- [ ] T058 [P] [US3] Design artifact for the landing decision sheet (pool value + two choices + next-floor preview up front; ledger detail and stake rules one tap deeper; ready-check + opt-out states) in `specs/004-artifacts-catacomb/design/landing-decision-sheet.md`
- [ ] T059 [US3] Implement the site entry sheet per `design/delve-entry-sheet.md` in `apps/client/src/screens/delve/` (depends on T057)
- [ ] T060 [US3] Implement the landing decision sheet per `design/landing-decision-sheet.md` (003 encounter HUD reused unchanged for floor combat) in `apps/client/src/screens/delve/` (depends on T058)
- [ ] T061 [US3] Playwright E2E (390×844, V1 solo): entry sheet full disclosure → floor HUD → landing shows pool + preview → withdraw pays the pool → separate run wipes and messaging confirms base haul kept, unbanked pool forfeited, in `apps/client/tests/e2e/delve-loop.spec.ts`

**Checkpoint**: US3 independently functional — solo delves playable end-to-end with the stake honest and no-ruin holding

---

## Phase 6: User Story 4 - Push the Depth Ladder (Priority: P4)

**Goal**: Disclosed depth/multiplier curves surfaced as the chase; per-site personal-best records; weekly fixed-seed expeditions with recognition-only leaderboards; delve-depth relic sources; under-size honesty warning; delve-material economy interlock (plan milestone M4.3)

**Independent Test**: Run the same site twice with different seeds and verify materially different layouts; run the weekly seed twice and verify identical layout; reach a relic milestone depth and verify the relic source pays per Story 1 rules; verify the leaderboard records depth with no material rewards attached (spec US4)

### Tests for User Story 4 (MANDATORY — write first, ensure they FAIL) ⚠️

- [ ] T062 [P] [US4] Content integrity test 4 (every delve-exclusive material consumed by ≥ 1 recipe; delve materials among craft-mod sources; demanded by ≥ 2 launch awakening tracks) in `packages/content/tests/delves/economy-interlock.test.ts` (FR-316)
- [ ] T063 [P] [US4] Unit tests for `weeklySeed(worldSeed, siteId, isoWeek)`: stable within a week, differs across weeks and sites, aligned to the affliction rotation week, in `packages/engine/tests/delve/weekly-seed.test.ts` (research R7)
- [ ] T064 [P] [US4] Unit tests for depth records + leaderboard: per-site all-time personal best updates only on improvement; weekly best-of-unlimited-attempts posts; ties share rank; rows carry titles/flair and never material rewards, in `packages/engine/tests/delve/records.test.ts` (FR-314/315)
- [ ] T065 [P] [US4] Unit tests for the depth ladder edges: reaching a delve-depth milestone resolves the relic grant per US1 rules (once ever, duplicate compensation after); under-size party past the full-party band gets diminished scaling per the disclosed curve and the honesty warning — entry never blocked, in `packages/engine/tests/delve/depth-ladder.test.ts` (FR-311, US4-AS2/4)

### Implementation for User Story 4

- [ ] T066 [US4] Implement per-site `DepthRecord` tracking with `DepthRecordSet` events on descent end in `packages/engine/src/delve/records.ts`
- [ ] T067 [US4] Implement the `weeklySeed` pure function, weekly-expedition mode in `EnterDelve`, and `WeeklyExpeditionEntry` best-of posting with shared-rank ties in `packages/engine/src/delve/weekly.ts` (research R7)
- [ ] T068 [US4] Wire `GetDepthRecords`, `GetDepthLeaderboard`, and `LeaderboardPosted` into `LocalGameHost` (local-immediate; V1 solo entries with local week derivation) in `packages/engine/src/adapter/`
- [ ] T069 [US4] Wire delve-depth milestones into relic source resolution (descent depth reached → `packages/engine/src/relics/sources.ts` grant path) from `packages/engine/src/delve/records.ts`
- [ ] T070 [US4] Surface the under-size honesty warning ("assumes a full party") with the disclosed diminish curve in the entry sheet and landing preview flows in `packages/engine/src/delve/` + `apps/client/src/screens/delve/` (FR-311)
- [ ] T071 [P] [US4] Design artifact for depth records + weekly leaderboard screens (recognition-only framing; primary task / deferred depth declared) in `specs/004-artifacts-catacomb/design/depth-records-leaderboard.md`
- [ ] T072 [US4] Implement depth records + weekly leaderboard screens per `design/depth-records-leaderboard.md` in `apps/client/src/screens/delve/` (depends on T071)
- [ ] T073 [US4] Playwright E2E (390×844): weekly expedition entry alongside random mode → depth record updates after a run → leaderboard shows recognition-only ranks with shared ties → solo push past the band shows the honesty warning, in `apps/client/tests/e2e/delve-depth-ladder.spec.ts`

**Checkpoint**: All four user stories independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Launch-scale gates, balance audits, boundary enforcement, and full validation

- [ ] T074 [P] Content integrity test 9 (launch scale sanity: 6–10 relics spanning all source formats; 2–3 sites in distinct regions) in `packages/content/tests/launch-scale.test.ts`
- [ ] T075 [P] Verify dependency-cruiser rules cover `packages/engine/src/relics/`, `packages/engine/src/delve/`, and the new client screens (no GUI→engine, no content-in-code edges) in `.dependency-cruiser.cjs`; run `npx dependency-cruiser --validate`
- [ ] T076 [P] Balance audit harness for SC-301/SC-302: per-relic audit that equipping changes optimal tactics/loadout for ≥ 1 school vs the no-relic optimum, and the best no-relic crafted loadout stays within 10% on standard autoable content, in `packages/engine/tests/relics/balance-audit.test.ts`
- [ ] T077 Parameterize the descent test suite over the host seam (in-process `LocalGameHost` now; same recorded input streams replayable against the V2 server room host later) in `packages/engine/tests/delve/host-parity.test.ts` (plan Version Strategy)
- [ ] T078 [P] Performance validation: floor assembly evaluated lazily with no perceptible pause at landings, local interaction acknowledgement < 100 ms (Principle IX), in existing unit/E2E suites
- [ ] T079 Run all quickstart.md validation scenarios 1–8 and complete its acceptance checklist; fix anything red (`npm test`, `npm run test:e2e`, `npm run validate:content`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–6)**: All depend on Foundational completion; then proceed in priority order (P1 → P2 → P3 → P4) or in parallel where the story dependency notes below allow
- **Polish (Phase 7)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (P1)**: Only Foundational. Fully independent — relics pay out of 003 formats; no delve required. **MVP.**
- **US2 (P2)**: Uses US1's relic content (T020/T021) and grant path for fixtures, but its engine/UI work is independent; can start once T021–T022 exist (or run against seeded fixtures)
- **US3 (P3)**: Only Foundational — no dependency on US1/US2 (delves work without relics). Can run in parallel with US1/US2
- **US4 (P4)**: Depends on US3 (descent runtime, ledgers, landing protocol) and on US1's grant path (T022, T026) for delve-depth relic sources (T069)

### Within Each User Story

- Tests MUST be written and observed failing before implementation
- Content authoring and design artifacts before the code that consumes them; design artifacts (Principle VII) strictly before their UI tasks
- Engine modules before adapter wiring; adapter before client screens; screens before E2E

### Parallel Opportunities

- Phase 1: T002, T003, T004 in parallel after T001
- Phase 2: T005, T006, T007, T008 all in parallel; T010 ∥ T012
- All test-writing tasks within a story run in parallel (different files)
- Design artifacts (T028, T029, T041, T057, T058, T071) parallel with their story's engine work
- After Phase 2: US1 and US3 can proceed in parallel by different developers; US2 follows US1's content, US4 follows US3

---

## Parallel Example: User Story 3

```bash
# Launch all US3 test tasks together (write-first, all failing):
Task: "Content integrity tests 5–7 in packages/content/tests/delves/sites.test.ts"
Task: "Floor assembly determinism property tests in packages/engine/tests/delve/assembly.test.ts"
Task: "Curve evaluation tests in packages/engine/tests/delve/curves.test.ts"
Task: "Two-stream ledger tests in packages/engine/tests/delve/ledgers.test.ts"
Task: "Landing protocol tests in packages/engine/tests/delve/landing.test.ts"
Task: "Descent lifecycle tests in packages/engine/tests/delve/descent.test.ts"

# Then content + design in parallel with early engine work:
Task: "Author delve content in packages/content/data/delves/"
Task: "Design artifact delve entry sheet in specs/004-artifacts-catacomb/design/delve-entry-sheet.md"
Task: "Design artifact landing decision sheet in specs/004-artifacts-catacomb/design/landing-decision-sheet.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup → Phase 2: Foundational (blocks everything)
2. Phase 3: US1 — relic core (M4.0)
3. **STOP and VALIDATE**: quickstart scenarios 1–2 — compendium disclosure, grant-once, trade uniqueness, equip + signature effect
4. V1-shippable: one earnable mettle-trial relic, full compendium with honest labels

### Incremental Delivery

1. Setup + Foundational → contract/schemas/save format ready
2. US1 → validate → **MVP** (relic chase live on 003 formats)
3. US2 → validate → relics become progression arcs feeding the market
4. US3 → validate → solo delves live (second V1-shippable cut, M4.2)
5. US4 → validate → depth ladder + weekly expeditions; the two halves interlock (delve-depth relic sources, delve materials in awakening tracks)
6. Polish → launch-scale gates, balance audits, host-parity harness, quickstart sweep

### Parallel Team Strategy

After Foundational: Developer A takes US1 then US2 (relics track); Developer B takes US3 then US4 (delves track); the only cross-track join is T069 (delve-depth milestones → relic grants), which needs A's T022/T026 and B's T066.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- Verify each test task fails before its implementation task starts (Principle I)
- Commit and push after every completed task (constitution Development Workflow: work never accumulates uncommitted)
- Engine code: zero DOM/framework imports, all time via the injected clock, serializable contract payloads only (Principle V)
- All counts, curves, multipliers, and limits are content-tunable — never hard-code a tunable (Principle IV, authoring rule 8)
- R11 re-verification when 002's plan lands: equip path (T024), item-instance representation (T022/T034), inert-modifier flagging (T024/T039)
