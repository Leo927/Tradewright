# Tasks: Tradewright — Core Game (M2 — Combat Core, User Stories 6–13)

**Input**: Design documents from `/specs/001-tradewright-core/`

**Prerequisites**: plan.md, spec.md (Stories 6–13), research.md (Part IV — combat),
data-model.md (Part II — combat), contracts/game-protocol.md (Part II — combat),
contracts/content-schema.md (Part II — combat), quickstart.md (Part II — combat).
**Carried forward (must be implemented and green):** M0 — Foundations (monorepo, CI gates,
contract v0, content schemas + text catalogs, deterministic tick/clock/PRNG core, i18n
foundation) and M1 — V1 Economy (Stories 0–5). M2 builds directly on the M1 activity slot,
storage, market, transaction log, EventSummary, and offline fast-forward.

**Scope**: Per plan.md ("Tasks are regenerated per milestone with `/speckit-tasks` scoped to
that milestone's stories"), this file covers **M2 — Combat core (User Stories 6–13, P6–P13)**:
expedition runtime on the shared 1 s combat resolver, schools/abilities/magic, tactics, perk
trees, gear + provisions, offline expeditions, retreat/recovery, and the loot→economy loop —
all V1-shippable. It **replaces** the prior M0+M1 economy tasks.md (that scope is complete —
T001–T114, committed; the record lives in git history). Task IDs continue from **T115** so
they never collide with the IDs already referenced in commit history. M3+ (challenge, relics/
delves, V2, group formats) get their own `/speckit-tasks` runs when those milestones open.
*(Generated 2026-06-13. The combat design pass completed 2026-06-12 — data-model Part II,
protocol Part II, content-schema Part II, research Part IV — so M2's precondition is satisfied.)*

**User Story 0 (P0, i18n) remains a standing property**: it is not re-listed as a phase, but
every M2 story flow must pass in the generated `pseudo-expand` locale (Design Invariant 13),
text gates stay green over all new combat catalogs, and engine combat outcomes stay
locale-neutral. Each story phase carries an explicit pseudo-locale pass task to enforce this.

**Tests**: MANDATORY per constitution Principle I — every story phase contains unit test
tasks (written first, failing before implementation) and a Playwright E2E flow at the
390×844 phone viewport tagged `@combat` (quickstart Part II §8). The shared combat resolver,
EffectExpr/curve evaluators, tactics engine, threat tables, expedition state machine, loot
rolls, and offline replay all get Vitest suites with injected clock + seeded PRNG (no real
waiting). CI parity (Principle II): everything runs via `npm run check`, `npm test`,
`npm run validate:content`, `npm run test:e2e` — invoked verbatim by `.github/workflows/ci.yml`.

**Organization**: Tasks are grouped by user story so each story is independently
implementable and testable on top of its predecessors (and on top of M1).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US6–US13, mapping to spec.md Stories 6–13
- Every task names exact file paths

---

## Phase 1: M2 Foundational — Combat Core Machinery

**Purpose**: The shared, content-agnostic combat machinery every combat story depends on —
the Principle V contract extension (protocol Part II), the Principle IV content schemas
(content-schema Part II), and the deterministic engine core: the one EffectExpr vocabulary,
the authored CombatCurves evaluator, the single 1 s combat resolver with threat tables, the
tactics engine (which doubles as the auto AI), and the combat runtime state types. Engine
suites here run against **test fixtures**, not shipped content — shipped combat content is
authored per story so each story stays independently testable; the Part II integrity gates are
written here and go green progressively as story content lands (fully green at US13).

**⚠️ CRITICAL**: No combat user-story work can begin until this phase is complete.

### Contract — Part II (`@tradewright/contract`, contracts/game-protocol.md Part II)

- [ ] T115 [P] Define combat command DTOs — ChooseStartingSchool, StartExpedition, RecallExpedition, TapCastAbility, EditTactics, SetProvisionPlan, SetRetreatThreshold, EquipGear, UnequipGear, SlotAbility, UnslotAbility, SpendTreePoint, Respec, RepairGear (payloads carry ids/codes/values only — protocol Part V) in `packages/contract/src/combat/commands.ts`, re-exported from `packages/contract/src/index.ts`
- [ ] T116 [P] Define combat query DTOs + result shapes — GetHuntingGrounds, GetSchools, GetLoadout, GetExpedition, GetCombatLog (paged), GetRecovery — every returned field an id/code/raw value, no rendered text (protocol Part V, FR-074/076) in `packages/contract/src/combat/queries.ts`
- [ ] T117 [P] Define combat event DTOs — StarterKitGranted, ExpeditionStarted, ExpeditionEnded (reason: retreat|supplies|recalled|offline-cap; full haul, durability deltas, recovery-until), EnemyDefeated, CombatLogAppended (batched), MasteryLeveled, GearBroke, RecoveryEnded — and extend `ErrorCode` with `RECOVERING`, `EXPEDITION_ACTIVE`, `ABILITY_NOT_READY`, `ABILITY_SLOTS_FULL`, `NODE_PREREQS_MISSING`, `NO_POINTS_AVAILABLE`, `STARTER_KIT_ALREADY_GRANTED`, `GEAR_BROKEN` in `packages/contract/src/combat/events.ts` and `packages/contract/src/transport.ts`
- [ ] T118 Contract test: every combat command/query/event DTO JSON-round-trips losslessly and declares no rendered-text field (id/code/value audit against the per-DTO allowlist — protocol Part V binding rule) in `packages/contract/tests/combat-serializable.test.ts`

### Content schemas — Part II (`@tradewright/content`, contracts/content-schema.md Part II)

- [ ] T119 [P] Zod schema for the closed `EffectExpr` vocabulary (kinds `damage(phys|elem) | heal | hot | dot | buff(stat,duration) | debuff | shield | modify-ability(param) | threat-amp | resource`, each with magnitude/duration/target params; targets `self | enemy | ally | party` — **no player-as-victim target is representable**, the SC-208 audit surface) in `packages/content/schemas/effects.ts` — unknown fields are errors; new kinds are schema+engine changes, never authoring improvisation
- [ ] T120 [P] Zod schemas for AttributeDef (exactly five) and CombatCurves (one global def set: `healthCurve`, `attributeScaling`, `masteryScaling`, `armorMitigation`, `threatFactors{sustainFactor}`, `recoveryMinutes`, `retreatDurabilityPenalty` — authored CurveExpr, never display text) in `packages/content/schemas/attributes.ts` and `packages/content/schemas/curves.ts`
- [ ] T121 [P] Zod schemas for SchoolDef (flavor weapon|magic, scalingAttributeIds[1–2], weaponFocusTag, starterKitItemId, masteryCurve, basicAttack, abilityIds, branches[2], defaultTactics), AbilityDef (cooldownSeconds, effects: EffectExpr[], magnitudeScaling, unlockSource `mastery(level)|treeNode(nodeId)`, synergyNotes), TreeBranchDef/TreeNodeDef (prereqNodeIds[], pointCost, kind passive(EffectExpr)|abilityUnlock(abilityId), exactEffectText) in `packages/content/schemas/combat-schools.ts` — no display-text fields (name/description in text catalogs)
- [ ] T122 [P] Zod schemas for EnemyDef (tier, family, stats{attributes,health,armorRating{phys,elem}}, actions[], xpAward{combatSkillXp,masteryXp}, dropTableId) and HuntingGroundDef (regionId, settlementTags[], roster{enemyId,requiredCharacterTier}[]) in `packages/content/schemas/enemies.ts`, plus the shared RewardTable schema (entries reference item or gearDrop only — a coin entry is unrepresentable, FR-053) in `packages/content/schemas/reward-tables.ts`
- [ ] T123 [P] Zod schemas for GearDef (extends ItemDef: slot `weapon-focus|head|chest|hands|legs|feet|trinket`, schoolTag?, attributeGrants[], armorRating{phys,elem}, modifierSlots, durabilityMax, wearPerFight, repairCost{coinPerPoint,materials?}) and ProvisionDef (extends ItemDef: kind food|remedy, restoreEffects: EffectExpr[], defaultThresholdPct, consumeCooldownSeconds) in `packages/content/schemas/gear.ts`
- [ ] T124 Extend the content loader to parse + validate all `data/combat/**` and `data/shared/reward-tables/**` against the Part II schemas, export typed combat defs alongside the existing exports, fail fast on any error, and bump `contentVersion` (additive MINOR per the content-contract policy) in `packages/content/src/loader.ts`
- [ ] T125 Part II integrity gate tests 1–8 (write first; reference contracts/content-schema.md Part II): (1) every school has 2 branches, a basic attack, a valid default tactics program over its own roster, a resolving tier-1 starter kit; (2) tree-point scarcity — earnable points at launch mastery cap < combined branch cost per school; (3) abilities/nodes use only closed EffectExpr kinds, state exact effect text, unlock sources resolve; (4) drop tables pay no coin, every region yields ≥1 combat-exclusive material, regional rosters/materials differ, ≥20% of crafting recipes demand combat materials, every region's materials demanded by ≥1 recipe; (5) every settlement region has a hunting ground with ≥1 tier-1 enemy; (6) gear coverage — craftable weapon/focus per school per tier, craftable coverage per armor slot per tier, durability/wear/repair present; (7) exactly 5 AttributeDefs, school scaling refs resolve (1–2 each), all CombatCurves present and total; (8) originality denylist over all combat names/text in every locale — in `packages/content/tests/combat-integrity.test.ts` (these go green progressively: 7 at T127, 3 partially at T128, 1 at T129, 2 at T129, 6 at T143, 4 at T155)

### Engine — deterministic combat core (`@tradewright/engine`, research Part IV)

- [ ] T126 [P] Engine unit tests (write first): EffectExpr evaluator over fixtures — every kind resolves to a deterministic outcome, no kind can target a combatant as a damage victim except enemy/self per the closed targets (SC-208 unit assertion); CombatCurves evaluator — health/attributeScaling/masteryScaling/armorMitigation/threatFactors evaluate the authored expressions, never a literal constant (FR-107) in `packages/engine/tests/combat/effects.test.ts` and `packages/engine/tests/combat/curves.test.ts`
- [ ] T127 [P] Implement the EffectExpr evaluator and the CombatCurves evaluator (pure functions over authored defs + combat state; zero hard-coded combat constants — a literal combat constant is a review reject) in `packages/engine/src/combat/effects.ts` and `packages/engine/src/combat/curves.ts`
- [ ] T128 Engine unit tests (write first): the 1 s combat resolver as a pure reducer `(combatState, defs, tick|input) → combatState + events` — basic-attack + ability cadence on cooldowns; per-(enemy,combatant) threat accumulation (`threat += damageDealt + sustainFactor×healingDone + tauntAmplifiers`), highest-threat targeting with stable join-order tie-break (FR-106/108); ally-targeted effects; identical-inputs⇒identical-state; per-kill loot from per-expedition RNG sub-streams replays identically in `packages/engine/tests/combat/resolver.test.ts`
- [ ] T129 Implement the shared combat resolver: 1 s combat tick advancing combat state, threat tables, cooldowns, buff/debuff timers, basic attacks, ability casts, loot draws from seeded sub-streams; nested inside the world tick (60 combat ticks per 60 s world tick) and replayable in the offline fast-forward (research R1/R3/R7 combat) in `packages/engine/src/combat/resolver.ts`
- [ ] T130 Engine unit tests (write first): tactics evaluation — strict-priority ordered rules over the closed trigger vocabulary (`always | self-health-below | enemy-health-above | enemy-health-below | ally-health-below | buff-missing | debuff-present | at-expedition-start`); each tick the highest-priority satisfied + off-cooldown rule casts (FR-168); the program also drives the auto AI; empty-slot build fights with basic attacks only in `packages/engine/tests/combat/tactics.test.ts`
- [ ] T131 Implement the tactics engine (the auto AI everywhere — research R4 combat) as a pure selector the resolver calls each tick in `packages/engine/src/combat/tactics.ts`
- [ ] T132 Define combat runtime state types — GearItemInstance (`{instanceId, itemDefId, gearScore, modifiers[], durability}`, qualityGrade derived), SchoolMastery (per character×school: `{schoolId, xp, level, pointsEarned, spentNodes[]}`), Loadout (equipped map, slottedAbilityIds≤3, tactics, provisionPlan, retreatThresholdPct, inertFlags), ExpeditionInstance (build snapshot, combatState, haul, provisionsRemaining, state machine), CombatState (combatants, threatTables, tickCount, rngState) — in `packages/engine/src/combat/types.ts`; extend SaveGame to carry them and add a `formatVersion` migration (M1 saves load and gain empty combat state) in `packages/engine/src/world/state.ts` and `packages/engine/src/world/save.ts`, with migration tests in `packages/engine/tests/save.test.ts`. No state field stores rendered text (i18n invariant 1).

**Checkpoint**: `npm run check`, `npm test` (resolver/effects/curves/tactics suites green over fixtures), `npm run validate:content` (Part II gate 7 green; gates 1–6,8 present and pending content) all green; contract Part II serializable. Combat user-story phases can begin.

---

## Phase 2: User Story 6 — Fight Automatically (Priority: P6) 🎯 MVP (combat)

**Goal**: Open the hunting grounds (visible from creation), adopt a school with a one-time
starter kit (FR-113), start an expedition against a tier-1 enemy, and watch the character
fight itself — basic attacks + slotted abilities on timers per default tactics, both health
bars moving, a narrating combat log, XP + loot per kill, fight continuing while away; manual
tap-to-cast override while spectating (FR-101/104/110–113/164, US6).

**Independent Test**: With a fresh character, default school, and default tactics, open the
grounds → adopt a school (kit granted once) → start a tier-1 expedition → with zero further
input, kills/XP/mastery/loot accrue at the rates the enemy and ability defs predict; a compact
status indicator stays visible elsewhere in the app (quickstart Part II §1, SC-101/102). Flow
passes in `pseudo-expand`.

### Design artifact (Principle VII — before client implementation)

- [ ] T133 [US6] Design artifact for the combat screens — hunting-grounds roster (tier, relative difficulty, drop-table summary, lock states), school-adoption sheet, expedition HUD (both health bars, cooldowns, buffs/debuffs, current enemy), combat log surface, and the compact in-app status indicator; primary task vs deferred depth declared per screen (Principle VIII — e.g. HUD shows boss/enemy bar + active casts, full log one tap deeper); layouts tolerant of ~40% text expansion (FR-077) — in `specs/001-tradewright-core/design/combat-hunting-expedition.md`

### Tests for User Story 6 (write first, ensure they FAIL) ⚠️

- [ ] T134 [P] [US6] Engine unit tests: starter-grant idempotency (school adoption mints the tier-1 kit exactly once ever, the `starter-grant` transaction is the record — FR-113); auto-battle rates are deterministic for every launch tier-1 enemy (kills/XP/mastery/loot per the defs — SC-102); expedition occupies the single activity slot, next enemy engages on kill; RecallExpedition ends normally and banks the full haul in `packages/engine/tests/combat/auto-battle.test.ts` and `packages/engine/tests/combat/starter-grant.test.ts`
- [ ] T135 [P] [US6] Playwright `@combat` flow (quickstart Part II §1): fresh character → grounds visible on the settlement screen at creation → adopt a school → kit granted once → start tier-1 expedition with default tactics → navigate away and back, fight still running, status indicator visible; ready-loadout→running within 4 inputs / 30 s (SC-101) in `apps/client/tests/e2e/combat-auto-battle.spec.ts`

### Implementation for User Story 6

- [ ] T136 [P] [US6] Author core combat content: `data/combat/attributes.json` (the five AttributeDefs) and `data/combat/curves.json` (all CombatCurves) — ids/numbers/curve-exprs only; names/descriptions in `text/en/content/combat/attributes.json` (Part II gate 7 goes green)
- [ ] T137 [P] [US6] Author the launch schools' combat-critical content: `data/combat/schools.json` (≥2 schools incl ≥1 magic — flavor, scalingAttributeIds, weaponFocusTag, starterKitItemId, masteryCurve, basicAttack, two branch refs, defaultTactics; ability rosters filled in US7, node bodies in US9) and the tier-1 starter weapon/focus GearDefs in `data/combat/gear.json`, with text in `text/en/content/combat/schools.json` and `text/en/content/combat/gear.json`
- [ ] T138 [P] [US6] Author `data/combat/enemies.json` (≥1 tier-1 enemy per settlement region, stats/actions/xpAward/dropTableId), `data/combat/hunting-grounds.json` (one per region, settlementTags, roster with requiredCharacterTier), and `data/shared/reward-tables/*.json` (materials + gearDrop entries, no coin) with text in `text/en/content/combat/enemies.json` and `text/en/content/combat/hunting-grounds.json` (Part II gate 5 goes green; gate 4's region/material checks land at US13)
- [ ] T139 [US6] Engine: expedition lifecycle + school adoption — ChooseStartingSchool (grant-once via the M1 transaction log, derive active school from the equipped weapon/focus), StartExpedition (slot free, not recovering, enemy tier ≤ character tier), RecallExpedition; the build snapshot frozen at start (only tactics live); per-kill XP into the M1 skills map (family `combat`) + mastery + loot into the haul, banked into M1 storage on any end in `packages/engine/src/combat/expedition.ts`
- [ ] T140 [US6] Adapter: ChooseStartingSchool, StartExpedition, RecallExpedition, TapCastAbility commands; GetHuntingGrounds, GetExpedition, GetCombatLog queries; StarterKitGranted, ExpeditionStarted, ExpeditionEnded, EnemyDefeated, CombatLogAppended events — TapCastAbility windowed-optimistic (resolves same combat tick), expedition commands optimistic-with-reconciliation (protocol Part II classification) in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T141 [US6] Client: hunting-grounds screen + school-adoption sheet per design artifact (roster with tier/difficulty/drop summary, lock states with requirements) in `apps/client/src/screens/combat/hunting-grounds.tsx`
- [ ] T142 [US6] Client: expedition HUD + combat log + compact app-wide status indicator per design artifact (both health bars, cooldowns, buffs/debuffs; tap-ready-ability override with cooldown remaining shown; log rendered from structured id/code/value entries via ICU messages in the active locale — FR-076); continue-while-navigating wired through the event store in `apps/client/src/screens/combat/expedition.tsx`, `apps/client/src/components/combat/status-indicator.tsx`
- [ ] T143 [US6] Pseudo-locale pass (Design Invariant 13): all US6 screen + combat content strings externalized, text gates green over the new combat catalogs; T135's flow passes in the `pseudo` Playwright project using the T052 leakage helper (SC-011/013); combat-log composition stays legible under ~40% expansion (FR-077) in `apps/client/tests/e2e/combat-auto-battle.spec.ts`

**Checkpoint**: US6 fully functional in `en` and `pseudo-expand` — the auto-battle MVP runs with zero input at predicted rates; grounds open from creation; kit granted once ever.

---

## Phase 3: User Story 7 — Build a Combat School: Abilities and Magic (Priority: P7)

**Goal**: Adopt/switch schools, level mastery by fighting, unlock active abilities, and slot a
limited set (3 at launch) for expeditions; magic schools are full structural peers of weapon
schools (FR-160–165, US7).

**Independent Test**: Level a school to its first ability unlock, slot the ability, and verify
it fires in combat per its definition (cooldown, effect, log entry); an empty-slot build
fights with basic attacks only; switching weapon/focus switches the active school with masteries
preserved (quickstart Part II §2). Flow passes in `pseudo-expand`.

### Design artifact (Principle VII)

- [ ] T144 [US7] Design artifact for the schools + ability-slotting screens — mastery track, ability roster with unlock state + synergy notes, the ≤3 slot editor, school switch via equipped weapon/focus; primary/deferred split (Principle VIII) — in `specs/001-tradewright-core/design/combat-schools-loadout.md`

### Tests for User Story 7 (write first) ⚠️

- [ ] T145 [P] [US7] Engine unit tests: mastery XP accrues per kill on the authored curve, independent per school and preserved on switch (FR-163); ability unlock at the stated mastery level; SlotAbility/UnslotAbility respect the ≤3 slot count and unlocked state; a slotted ability fires per cooldown/effect when its tactics rule holds; empty-slot build = basic attacks only (FR-165) in `packages/engine/tests/combat/schools.test.ts`
- [ ] T146 [P] [US7] Playwright `@combat` flow (quickstart Part II §2): fight to first ability unlock → slot it → it casts in the log per definition; switch weapon/focus → active school + roster swap, prior mastery retained in `apps/client/tests/e2e/combat-schools.spec.ts`

### Implementation for User Story 7

- [ ] T147 [P] [US7] Author the full ability rosters: `data/combat/abilities.json` (each school's strikes/spells/heals/buffs/debuffs — cooldowns, EffectExpr effects, magnitudeScaling, unlockSource, synergyNotes) with text in `text/en/content/combat/abilities.json` (Part II gate 3 goes green for abilities)
- [ ] T148 [US7] Engine: school mastery progression (XP→level on the authored curve, points awarded on level-up, per-school independence + switch preservation), ability unlock derivation, ability slotting in `packages/engine/src/combat/schools.ts` and `packages/engine/src/combat/loadout.ts`
- [ ] T149 [US7] Adapter: SlotAbility, UnslotAbility commands; GetSchools query (mastery level/xp, ability rosters with unlock state, points); MasteryLeveled event in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T150 [US7] Client: schools screen (mastery track, ability roster with unlock state + synergy notes) and the ability-slot editor per design artifact in `apps/client/src/screens/combat/schools.tsx` and `apps/client/src/screens/combat/loadout.tsx`
- [ ] T151 [US7] Pseudo-locale pass: US7 strings + ability content text externalized, text gates green, T146's flow passes in the `pseudo` project in `apps/client/tests/e2e/combat-schools.spec.ts`

**Checkpoint**: US6+US7 — builds fight, not just characters; abilities fire per their defs in both locales; magic and weapon schools are structural peers.

---

## Phase 4: User Story 8 — Write Tactics, Not Reflexes (Priority: P8)

**Goal**: Configure ability priority + trigger rules from the closed condition set, plus
provision thresholds and the retreat threshold; sensible school defaults exist; mid-expedition
edits take effect next tick (FR-166–169, US8).

**Independent Test**: Configure two different tactics programs over the same build and enemy and
verify combat logs are 100% rule-explainable and materially different; defaults apply when
nothing is configured; tactics parity holds — the best manual tap trace is reproducible by
tactics alone (quickstart Part II §2, SC-108). Flow passes in `pseudo-expand`.

### Design artifact (Principle VII)

- [ ] T152 [US8] Design artifact for the tactics editor — ordered rule list with per-rule trigger picker (closed condition set), provision-threshold and retreat-threshold controls, default-rotation prefill, mid-expedition edit affordance; phone-first one-handed reorder; primary/deferred split — in `specs/001-tradewright-core/design/combat-tactics.md`

### Tests for User Story 8 (write first) ⚠️

- [ ] T153 [P] [US8] Engine unit tests: two tactics programs over one build/enemy produce rule-explainable, materially different logs; school default applies with nothing configured (FR-167); a mid-expedition EditTactics takes effect from the next tick without restarting (FR-169); **tactics parity** property suite (SC-108) — for every launch enemy, the best manual tap-cast trace found by search is reproduced by some tactics program in `packages/engine/tests/combat/tactics-rules.test.ts` and `packages/engine/tests/combat/tactics-parity.test.ts`
- [ ] T154 [P] [US8] Playwright `@combat` flow (quickstart Part II §2): open tactics → edit a rule + provision threshold + retreat threshold mid-expedition → next-tick behavior change visible in the log in `apps/client/tests/e2e/combat-tactics.spec.ts`

### Implementation for User Story 8

- [ ] T155 [US8] Adapter: EditTactics, SetProvisionPlan, SetRetreatThreshold commands (validate against slotted abilities + the closed condition set; mid-expedition accepted, effective next tick) wired to the T131 tactics engine and the T132 Loadout state in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T156 [US8] Client: tactics editor screen per design artifact (ordered rules, trigger picker over the closed set, provision + retreat thresholds, default prefill, mid-expedition save) in `apps/client/src/screens/combat/tactics.tsx`
- [ ] T157 [US8] Pseudo-locale pass: US8 strings (rule/trigger labels) externalized, text gates green, T154's flow passes in the `pseudo` project (rule rows stay legible under expansion — FR-077) in `apps/client/tests/e2e/combat-tactics.spec.ts`

**Checkpoint**: US6–US8 — hands-off combat is authored, not random; every cast is rule-explainable; manual play is convenience, never an advantage class.

---

## Phase 5: User Story 9 — Spend Points in Perk Trees (Priority: P9)

**Goal**: Mastery level-ups award points for two-branch perk trees (passives + active-ability
unlocks); points are scarce enough that one school cannot fill both branches; respec refunds
all points for a coin cost and cleanly removes effects, flagging invalidated slots/rules inert
(FR-170–173, US9).

**Independent Test**: Spend points down one branch, verify each passive's exact stated effect
appears in combat math next tick and a tree-unlocked active becomes slottable; respec, rebuild
down the other branch, verify prior effects fully removed and the coin cost charged; point
scarcity audited (quickstart Part II §3, SC-107). Flow passes in `pseudo-expand`.

### Design artifact (Principle VII)

- [ ] T158 [US9] Design artifact for the perk-tree screen + respec flow — two branches with node prereqs and exact-effect text, affordable-node highlighting, point counter, respec confirm with coin cost + inert-flag notice; primary/deferred split — in `specs/001-tradewright-core/design/combat-trees.md`

### Tests for User Story 9 (write first) ⚠️

- [ ] T159 [P] [US9] Engine unit tests: SpendTreePoint respects point availability + prereqs; a passive node's exact stated effect appears in combat math next tick; an ability-unlock node makes the ability slottable; Respec (outside expeditions) refunds all points, removes all tree effects, charges the coin cost to the transaction log (sink), unslots now-invalid abilities and flags dependent tactics rules inert — never a mid-combat error (FR-173); point scarcity holds (FR-171) in `packages/engine/tests/combat/trees.test.ts`
- [ ] T160 [P] [US9] Playwright `@combat` flow (quickstart Part II §3): spend down one branch → passive visible in combat math, unlocked active slottable → respec for coin → points refund, effects gone, fee in history, inert notice shown in `apps/client/tests/e2e/combat-trees.spec.ts`

### Implementation for User Story 9

- [ ] T161 [P] [US9] Author the perk-tree node bodies: `data/combat/trees.json` (two branches per school — nodes with prereqs, point costs, passive EffectExpr or ability-unlock, exact effect text refs; total earnable points < combined branch cost per school) with text in `text/en/content/combat/trees.json` (Part II gates 1 and 2 go green; gate 3 fully green)
- [ ] T162 [US9] Engine: tree-point spend (prereqs, availability), passive-effect application into the resolver's stat/ability math, ability-unlock wiring, and respec (refund + clean effect removal + coin sink + inert flagging of invalidated slots/rules) in `packages/engine/src/combat/schools.ts`
- [ ] T163 [US9] Adapter: SpendTreePoint, Respec commands; extend GetSchools/GetLoadout to surface branch state (spent/affordable nodes) and inert flags in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T164 [US9] Client: perk-tree screen + respec flow per design artifact (branches, prereqs, exact-effect text, affordable highlight, respec confirm with cost + inert notice) in `apps/client/src/screens/combat/trees.tsx`
- [ ] T165 [US9] Pseudo-locale pass: US9 strings + tree content text externalized, text gates green, T160's flow passes in the `pseudo` project in `apps/client/tests/e2e/combat-trees.spec.ts`

**Checkpoint**: US6–US9 — builds diverge; the same school fights differently down different branches; respec is clean and never a mid-combat error; no single solved build.

---

## Phase 6: User Story 10 — Equip and Provision (Priority: P10)

**Goal**: Assemble the material half of the loadout — gear in equipment slots (incl. the
school's weapon/focus) with attribute grants, armor ratings, and perk modifiers, plus
provisions that auto-consume at thresholds; durability wears and zero-durability gear grants
nothing until repaired (FR-120–123, US10).

**Independent Test**: Equip two gear sets against the same enemy and verify the stronger set
measurably improves outcomes; provisions auto-consume at thresholds; a gear perk changes stated
combat behavior; durability decreases and a broken item is honest until repaired (quickstart
Part II §4). Flow passes in `pseudo-expand`.

### Design artifact (Principle VII)

- [ ] T166 [US10] Design artifact for the gear/provisions loadout screen — equipment slots with stat totals + fitness hint vs selected enemy tier, gear inspection (stats/tier/perks/durability/weight), provision plan with thresholds, repair affordance with coin/material cost; primary/deferred split — extends `specs/001-tradewright-core/design/combat-schools-loadout.md`
- [ ] T167 [P] [US10] Engine unit tests: equip/unequip updates attribute totals + armor mitigation and the fitness hint; a gear perk modifier's stated interaction shows in combat math/log; provisions auto-consume at the configured threshold and restore per definition, logged (FR-121); durability decrements per wear rate, zero-durability gear grants no stats/perks/modifiers until repaired, mid-fight break logged (FR-122); RepairGear charges the stated coin/materials sink and restores durability in `packages/engine/tests/combat/gear.test.ts`
- [ ] T168 [P] [US10] Playwright `@combat` flow (quickstart Part II §4): equip a stronger set → stat totals + fitness hint update, outcome improves; provisions auto-consume; durability falls, broken item honest, repair restores in `apps/client/tests/e2e/combat-gear.spec.ts`

### Implementation for User Story 10

- [ ] T169 [P] [US10] Author the gear + provision content: complete `data/combat/gear.json` (craftable weapon/focus per school per tier; craftable armor coverage per slot per tier; attributeGrants, armorRating, modifierSlots, durabilityMax/wearPerFight/repairCost) and `data/combat/provisions.json` (food/remedy, restoreEffects, defaultThresholdPct, consumeCooldownSeconds), plus the crafting recipes that produce them (extending M1 `data/activities.json`), with text in `text/en/content/combat/gear.json` and `text/en/content/combat/provisions.json` (Part II gate 6 goes green)
- [ ] T170 [US10] Engine: gear-instance equip/unequip (slot compatibility, school activation from weapon/focus, stat aggregation into the resolver), provision auto-consume during the combat tick, durability wear + zero-durability inert handling, RepairGear in `packages/engine/src/combat/gear.ts` and `packages/engine/src/combat/loadout.ts`
- [ ] T171 [US10] Adapter: EquipGear, UnequipGear, SetProvisionPlan, RepairGear commands; GetLoadout (equipped instances, stat totals, fitness hint, provision plan); GearBroke event in `packages/engine/src/adapter/local-game-host.ts`
- [ ] T172 [US10] Client: gear/provisions loadout per design artifact (slots, stat totals + fitness hint, gear inspection, provision thresholds, repair flow) extending `apps/client/src/screens/combat/loadout.tsx`
- [ ] T173 [US10] Pseudo-locale pass: US10 strings + gear/provision content text externalized, text gates green, T168's flow passes in the `pseudo` project in `apps/client/tests/e2e/combat-gear.spec.ts`

**Checkpoint**: US6–US10 — the loadout wires combat to the economy; gear and provisions are crafted, inspectable, tradable goods; durability is a real sink.

---

## Phase 7: User Story 11 — Expeditions Run Offline (Priority: P11)

**Goal**: A provisioned expedition runs while the app is closed and returns one unified summary
(defeats, XP/mastery/points, loot, provisions consumed, durability lost, early-end reason);
tactics execute offline exactly as online (FR-105, US11).

**Independent Test**: Start an expedition, advance the test clock past provision exhaustion,
reload — the unified return summary's kills/casts/loot/end-time match the deterministic
expectation; offline ≡ online for identical builds/tactics (quickstart Part II §5, SC-103).
Flow passes in `pseudo-expand`.

### Tests for User Story 11 (write first) ⚠️

- [ ] T174 [P] [US11] Engine unit tests: offline ≡ online combat — tick-replay of an expedition inside the M1 fast-forward equals the live-tick result to the unit for identical build/tactics/seed (SC-103); expedition end mid-absence banks the haul and reports the early-end reason + time; 24 h combat catch-up (86 400 combat ticks) stays inside the named CI compute-budget constant (research R1 combat) in `packages/engine/tests/combat/offline-parity.test.ts`
- [ ] T175 [P] [US11] Playwright `@combat` flow (quickstart Part II §5): provisioned expedition → advance test clock past exhaustion → reload → the **unified** return summary (one summary, not two) reports the combat results merged with any idle accrual in `apps/client/tests/e2e/combat-offline.spec.ts`

### Implementation for User Story 11

- [ ] T176 [US11] Engine: run the combat resolver inside the M1 offline fast-forward (expedition combat ticks replayed in the catch-up loop, bounded by provision exhaustion, retreat, or the 24 h cap) and merge expedition results into the existing EventSummary as new typed event kinds (defeats, XP/mastery/points, loot, consumption, durability, early end) — one summary, ids/codes/values only (FR-014/105) in `packages/engine/src/combat/expedition.ts` and `packages/engine/src/simulation/summary.ts`
- [ ] T177 [US11] Adapter + client: expedition results arrive in the existing `SummaryReady` payload (no second channel); extend the return-summary modal to render the combat event kinds via ICU messages in the active locale in `packages/engine/src/adapter/local-game-host.ts` and `apps/client/src/screens/return-summary.tsx`
- [ ] T178 [US11] Pseudo-locale pass: combat summary rows externalized, text gates green, T175's flow passes in the `pseudo` project; a locale switch re-renders a pending combat summary (FR-076) in `apps/client/tests/e2e/combat-offline.spec.ts` and `apps/client/tests/e2e/locale.spec.ts`

**Checkpoint**: US6–US11 — combat is a first-class idle activity; offline ≡ online proven; the returning player sees one unified summary.

---

## Phase 8: User Story 12 — Risk Without Ruin (Priority: P12)

**Goal**: Crossing the retreat threshold (or running out of provisions while overwhelmed) ends
the expedition automatically — haul kept, an extra durability hit, a short recovery timer that
gates only further expeditions; no death, no item/coin/gear/progression/point loss ever
(FR-130–132, FR-204, US12).

**Independent Test**: Send an under-built character against a too-strong enemy and verify
retreat triggers at the threshold, the haul is retained, the durability penalty applies, and
recovery gates the next expedition only; the no-ruin invariant holds across every combat
outcome (quickstart Part II §5, SC-104). Flow passes in `pseudo-expand`.

### Tests for User Story 12 (write first) ⚠️

- [ ] T179 [P] [US12] Engine unit tests: automatic retreat when health crosses the threshold with no provision restoring (and the 0% threshold edge — fight to overwhelm, still no death, FR-131); end banks the full haul, applies the extra retreat durability wear, starts the content-tunable recovery timer (recovery gates expeditions only — non-combat activities open); **no-ruin property suite** (SC-104) — across every combat outcome, stored items/coin/equipped gear-beyond-durability/skill+mastery progress/spent tree points are never reduced (0 violations) in `packages/engine/tests/combat/no-ruin.test.ts`
- [ ] T180 [P] [US12] Playwright `@combat` flow: under-built character vs too-strong enemy → auto-retreat → result states cause + durability cost + recovery remaining → non-combat activity available immediately, next expedition gated until recovery ends in `apps/client/tests/e2e/combat-retreat.spec.ts`

### Implementation for User Story 12

- [ ] T181 [US12] Engine: retreat transitions (`ended(retreat|supplies)` → `recovering(until)` per CombatCurves `recoveryMinutes`/`retreatDurabilityPenalty`), no-ruin enforcement (haul banked in full, only durability changes), recovery gating expeditions only in `packages/engine/src/combat/expedition.ts`
- [ ] T182 [US12] Adapter + client: GetRecovery query, RecoveryEnded event; expedition-result UI states retreat cause + durability cost + recovery time, and a recovery indicator blocks new expeditions while keeping non-combat activities available — extending the T133 combat HUD/indicator in `packages/engine/src/adapter/local-game-host.ts` and `apps/client/src/screens/combat/expedition.tsx`
- [ ] T183 [US12] Pseudo-locale pass: retreat/recovery strings externalized, text gates green, T180's flow passes in the `pseudo` project in `apps/client/tests/e2e/combat-retreat.spec.ts`

**Checkpoint**: US6–US12 — tier-pushing is meaningful but never ruinous; recovery is the only cost beyond durability; the no-ruin invariant is enforced and tested.

---

## Phase 9: User Story 13 — Loot Feeds the Economy (Priority: P13)

**Goal**: Combat drops include materials gathering cannot produce; gear/provision/select
high-tier recipes demand them; regions drop different materials, extending price spreads and
caravan arbitrage to combat goods (FR-140/141, SC-105/106, US13).

**Independent Test**: Combat-exclusive materials appear in drop tables, are required by recipes,
trade and ship normally, and at least one profitable tier-1 fighter→market loop exists
(quickstart Part II §6). Flow passes in `pseudo-expand` where surfaced.

### Tests for User Story 13 (write first) ⚠️

- [ ] T184 [P] [US13] Content + engine tests: `content/combat-economy` — every hunting region yields ≥1 combat-exclusive material and regions differ; ≥20% of crafting recipes demand combat materials; every region's materials demanded by ≥1 recipe; drop tables pay no coin (sole-faucet rule, FR-053); combat materials trade/escrow/ship like any good (M1 market/caravan paths); at least one profitable tier-1 fighter→market loop exists; repair + respec sinks present in the transaction log (SC-105/106) in `packages/content/tests/combat-economy.test.ts` and `packages/engine/tests/combat/economy-loop.test.ts`
- [ ] T185 [P] [US13] Playwright `@combat` flow: sell a combat-dropped material on the market and ship it via caravan (reusing the M1 market/caravan screens) — combat goods behave as ordinary tradable goods in `apps/client/tests/e2e/combat-economy.spec.ts`

### Implementation for User Story 13

- [ ] T186 [US13] Author combat-exclusive materials + recipe demand: add the combat-exclusive material ItemDefs (regionally varied, dropped only by `data/shared/reward-tables/**`), wire ≥20% of `data/activities.json` crafting recipes (gear, provisions, select high-tier goods) to consume them, and ensure every region's materials are demanded by ≥1 recipe — with text in the relevant `text/en/content/**` catalogs (Part II gate 4 goes fully green)
- [ ] T187 [US13] Verify combat materials flow through the M1 economy unchanged (order books, escrow, weight/taxes, caravans) — no new engine paths, only content; close gate 4 and the combat-economy suite in `packages/content/tests/combat-economy.test.ts`
- [ ] T188 [US13] Pseudo-locale pass: new material content text externalized, text gates green, T185's flow passes in the `pseudo` project in `apps/client/tests/e2e/combat-economy.spec.ts`

**Checkpoint**: US6–US13 complete — the combat pillar closes the loop with the economy; fighter, producer, and hauler are mutually dependent; all Part II integrity gates (1–8) green.

---

## Phase 10: Polish & Cross-Cutting (M2)

**Purpose**: Combat-wide concerns that span the stories, plus the milestone validation run.

- [ ] T189 [P] Combat onboarding polish: guided steering toward gathering first while the grounds stay visible and unlocked from creation (FR-113); first-expedition reachable within SC-101's input/time budget across the real screen flow in `apps/client/src/screens/settlement-home.tsx` and `apps/client/src/screens/combat/hunting-grounds.tsx`
- [ ] T190 [P] SC-208 PvE-only audit test: a standing assertion that no EffectExpr in any shipped content, and no resolver code path, can target a player/combatant as a damage victim outside enemy/self semantics (the closed-target vocabulary makes it unrepresentable; the test proves it over all `data/combat/**` + `data/shared/reward-tables/**`) in `packages/content/tests/pve-only.test.ts`
- [ ] T191 [P] Full-loop combat determinism test: identical SaveGame + content + elapsed ticks ⇒ identical state across the resolver, threat tables, loot sub-streams, mastery/trees, and economy together, run under both `en` and a pseudo locale host (extends T111 to the combat system set — SC-014/103) in `packages/engine/tests/combat/determinism.test.ts`
- [ ] T192 [P] Offline catch-up benchmark: a CI benchmark asserting a 24 h combat-heavy absence (expedition replaying combat ticks) stays inside the 3 s mid-range-phone budget proxy constant (SC-002, research R1 combat) in `packages/engine/tests/combat/catchup-benchmark.test.ts`
- [ ] T193 [P] Combat pacing audit as E2E: ready-loadout→running-expedition within 4 inputs / 30 s (SC-101); every combat screen acknowledges interactions locally with immediate feedback (FR-062); the `@combat` E2E sweep passes on 390×844 portrait (SC-109) in `apps/client/tests/e2e/combat-pacing.spec.ts`
- [ ] T194 Quickstart Part II validation run: all commands green locally + in CI on one commit; all eight Part II scenarios pass; the Part II acceptance checklist holds (auto-battle rates, tactics parity, builds-beat-defaults ≥25%, gear deltas, offline ≡ online, no-ruin 0 violations, combat-economy mandates, content integrity + dependency boundaries, `@combat` E2E green on phone viewport in `en` and `pseudo-expand`); fix any stale statements in `specs/001-tradewright-core/quickstart.md` (Principle X)

---

## Dependencies & Execution Order

### Phase Dependencies

- **M0 + M1 (carried forward)**: complete and green — the activity slot, storage, market, transaction log, EventSummary, offline fast-forward, i18n foundation, and CI gates all exist. M2 does not re-create them.
- **Phase 1 (M2 Foundational)**: depends on M0+M1 — BLOCKS all combat stories. Contract Part II, content schemas Part II + integrity-test scaffolds, EffectExpr/curve evaluators, the combat resolver, the tactics engine, and combat runtime state types.
- **Phases 2–9 (User Stories 6–13)**: each depends on Phase 1. The ladder is dependency-ordered (each story builds on proven predecessors), but several are independently testable once Phase 1 lands.
- **Phase 10 (Polish)**: depends on all desired stories being complete.

### User Story Dependencies

- **US6 (P6)**: needs Phase 1 only. The combat MVP — auto-battle + onboarding. Authors the core content (attributes, curves, school skeletons, enemies, grounds, drop tables) the later stories extend.
- **US7 (P7)**: needs US6's school skeletons + Phase 1; adds ability rosters + slotting.
- **US8 (P8)**: needs US7's slotted abilities; adds the tactics editor (the engine tactics engine is Phase 1).
- **US9 (P9)**: needs US7's mastery (points) + Phase 1; adds tree node bodies + respec.
- **US10 (P10)**: needs Phase 1's gear-instance state; adds full gear/provision content + equip/repair. Independent of US7–US9 at the engine level (a default kit lets US6–US9 run before this is rich).
- **US11 (P11)**: needs the expedition runtime (US6) + M1 offline fast-forward; pure replay + summary work.
- **US12 (P12)**: needs the expedition runtime (US6); adds retreat/recovery + the no-ruin suite.
- **US13 (P13)**: needs the M1 economy + combat drop tables (US6); pure content + verification, closes gate 4.

### Within Each User Story

- Design artifact (UI stories, Principle VII) before client implementation.
- Tests written and FAILING before implementation (Principle I).
- Content/schemas/engine before adapter; adapter before client; client before the pseudo-locale pass.
- Story complete (en + pseudo-expand green) before moving to the next priority.

### Parallel Opportunities

- All Phase 1 [P] tasks (T115–T117 contract; T119–T123 schemas; T126/T127 evaluators) run in parallel; the resolver (T128/T129) and tactics engine (T130/T131) follow the evaluators; T132 state types can proceed alongside the schemas.
- Within each story, the [P] content-authoring and [P] test tasks run in parallel before the engine→adapter→client chain.
- US10, US11, US12, and US13 can largely proceed in parallel once US6 lands (different files, distinct concerns), if staffed.

---

## Parallel Example: Phase 1 (Foundational)

```bash
# Contract Part II together:
Task: "T115 combat command DTOs in packages/contract/src/combat/commands.ts"
Task: "T116 combat query DTOs in packages/contract/src/combat/queries.ts"
Task: "T117 combat event DTOs + error codes in packages/contract/src/combat/events.ts"

# Content schemas Part II together:
Task: "T119 EffectExpr schema in packages/content/schemas/effects.ts"
Task: "T120 AttributeDef + CombatCurves schemas in packages/content/schemas/{attributes,curves}.ts"
Task: "T121 School/Ability/Tree schemas in packages/content/schemas/combat-schools.ts"
Task: "T122 Enemy/HuntingGround/RewardTable schemas in packages/content/schemas/{enemies,reward-tables}.ts"
Task: "T123 Gear/Provision schemas in packages/content/schemas/gear.ts"
```

---

## Implementation Strategy

### Combat MVP First (User Story 6 Only)

1. Complete Phase 1: M2 Foundational (CRITICAL — blocks all combat stories).
2. Complete Phase 2: User Story 6 (auto-battle + onboarding).
3. **STOP and VALIDATE**: a fresh character fights automatically at predicted rates with zero input, in `en` and `pseudo-expand`.
4. Ship/demo — combat is playable.

### Incremental Delivery

1. Phase 1 → combat machinery ready.
2. US6 → auto-battle MVP → demo.
3. US7 → builds fight → demo.
4. US8 → authored tactics → demo.
5. US9 → diverging builds → demo.
6. US10 → gear/provisions wire combat to the economy → demo.
7. US11 → offline expeditions → demo.
8. US12 → risk without ruin → demo.
9. US13 → loot closes the economy loop → demo.
10. Each story keeps `en` + `pseudo-expand` green and adds value without breaking predecessors.

### Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- [Story] label maps each task to its spec.md story (US6–US13) for traceability.
- Verify tests fail before implementing.
- Commit after each task or logical group (constitution — commit after every logical group).
- Stop at any checkpoint to validate the story independently.
- The Part II integrity gates (1–8) go green progressively: gate 7 at US6 content, gate 5 at US6, gate 3 (abilities) at US7, gates 1 & 2 at US9, gate 6 at US10, gate 4 at US13; gate 8 (originality) holds continuously.
- Every M2 story flow must pass in `pseudo-expand` (Design Invariant 13 / standing US0 property) — enforced by the per-story pseudo-locale pass tasks.
