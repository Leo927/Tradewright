# Data Model: Tradewright — Core Game

**Date**: 2026-06-11 (Parts I/III/IV) / 2026-06-12 (Part II + Part I facility, faucet,
storage-expansion, and notification additions) | **Spec**: [spec.md](./spec.md) |
**Plan**: [plan.md](./plan.md)

Merged 2026-06-11 from the former specs 001/003/004 data models (spec collapse); the
combat core (Part II) was designed 2026-06-12 after the clarification rounds resolved
FR-107/108/113.

## Part I — Economy Core (former 001)

Two halves: **authored content** (read-only definitions, JSON in `packages/content/data/`,
shapes owned by [contracts/content-schema.md](./contracts/content-schema.md)) and **runtime
state** (mutable world owned by the engine; serialized as the V1 save / V2 database state).
IDs are stable string slugs for content (`item.iron-ore`) and generated IDs for runtime objects.

### Authored Content (definitions)

#### SkillDef
| Field | Type | Notes |
|---|---|---|
| id | slug | e.g. `skill.prospecting` |
| name, description | string | original text only (FR-024) |
| family | `gathering \| refining \| crafting \| hauling \| combat` | hauling levels via shipments; combat via expeditions (FR-103, Part II) |
| xpCurve | curve params | per-level XP requirement; shape per research R12 (economy) |
| tiers | TierDef[] | level threshold per tier; gates activities/recipes |

#### ActivityDef
| Field | Type | Notes |
|---|---|---|
| id, name | slug, string | |
| skillId | ref SkillDef | activity levels exactly one skill |
| tier | int | required skill tier (FR-015) |
| actionSeconds | number | duration per action (FR-011) |
| inputs | {itemId, qty}[] | empty for gathering |
| outputs | {itemId, qty}[] | |
| xpPerAction | number | |
| settlementTags | string[] | which settlements offer it (asymmetry, FR-030/SC-006) |
| stationFamily | craft-family ref? | refining/crafting only: requires a local station of effective tier ≥ this activity's tier (FR-037) |

#### ItemDef
| Field | Type | Notes |
|---|---|---|
| id, name, description | | original text only |
| tier | int | |
| weight | number | drives caravan capacity (FR-020) |
| basePrice | number | NPC equilibrium anchor (research R4 (economy)) |

#### RecipeDef
Refining and crafting are ActivityDefs with non-empty `inputs`; "RecipeDef" is the authoring
view of the same record. Integrity rule: the input graph is a DAG and every input item is
producible or gatherable somewhere in the world (content test).

#### SettlementDef
| Field | Type | Notes |
|---|---|---|
| id, name, description | | |
| activityTags | string[] | selects locally available ActivityDefs |
| listingFeeRate, salesTaxRate | number | Phase 1 world-defined (FR-034) |
| baseStorageCapacity | number | per-player, expandable (FR-023) |
| storageExpansion | {capacityPerLevel, costCurve} | escalating, disclosed coin costs (sink); max purchasable level = storage facility effective tier cap (FR-023) |
| facilities | FacilityDef[] | tiered stations + storage, the invasion-degradation target (FR-037) |
| npcProfileId | ref NpcMarketProfile | |

**FacilityDef**: `{id, kind: station(craftFamily) | storage, baseTier, maxStorageLevelPerTier?}`
— one station per craft family plus storage, modeled on New World's settlement structure
(FR-037). A facility's **effective tier** = baseTier − invasion degradation (Part III,
FacilityDegradationState); a station's effective tier caps the recipe tier craftable at the
settlement (gates ActivityDef.stationFamily assignments), the storage facility's effective
tier caps the purchasable storage-expansion level. Phase 2 territory upgrades reuse this
model.

#### RouteDef
| Field | Type | Notes |
|---|---|---|
| id | slug | |
| endpoints | [settlementId, settlementId] | bidirectional |
| caravanMinutes | number | 2–6 h band per spec assumption |
| travelMinutes | number | personal travel, ≪ caravanMinutes (FR-044) |
| riskLevel | `safe \| low \| moderate \| high` | display tier |
| riskChance | 0..1 | probability of one risk event (FR-043) |
| lossFraction | 0..1 | cargo fraction lost on event |
| mitigationCost, mitigationFactor | number | guard fee; multiplies lossFraction |
| dispatchCost | number | flat coin cost |

#### NpcMarketProfile (V1-critical, V2 liquidity bots + faucet)
| Field | Type | Notes |
|---|---|---|
| id | slug | |
| entries | NpcItemEntry[] | per tradable item at this settlement |
| floorBuyList | {itemId, floorPrice}[] | curated, regionally-varied raw goods; standing NPC buy orders at disclosed floors (FR-054a) |
| floorBudgetPerPeriod | coins | refreshes floor orders up to budget per market-tick period (R13, economy) |
| sweep | {periodTicks, budgetPerPeriod} | periodic demand sweeps buying cheapest sell orders across all goods (FR-054b) |

**NpcItemEntry**: `itemId`, `equilibriumStock`, `productionPerHour`, `consumptionPerHour`,
`priceBounds {min×, max×}` (clamp on pressure curve), `orderBandWidth` (spread around quote),
`orderDepth` (qty per refresh). Semantics per research R4 (economy). The floor/sweep
mechanisms are the game's sole recurring coin faucet (FR-053; the one-time starter grant,
FR-050, is the only other coin entry); both settle as ordinary Trades and
emit per-settlement faucet telemetry. V1 additionally places NPC sell orders (R4
simulation); V2 keeps the faucet on with sell-side liquidity configurable.

#### WorldTuningDef (singleton — `world.json`)
| Field | Type | Notes |
|---|---|---|
| worldTickSeconds | number | 60 at launch — the engine's only tick-length source (research R5 (economy)) |
| marketCadenceTicks | int | NPC order refresh / drift cadence in world ticks (research R4 (economy)) |
| offlineCapHours | number | 24 at launch (FR-013; offline-cap assumption) |
| caravanDurationBand | {minHours, maxHours} | 2–6 h at launch; every RouteDef's caravanMinutes must fall inside it (world-integrity gate 9) |
| starterCoin | integer coins | the one-time character-creation grant (FR-050), recorded as a `starter-grant` Transaction |

One authored record, not an array — the single source for engine pacing and world tunables;
the engine never hardcodes these values (Principle IV).

### Runtime State (mutable)

#### PlayerCharacter
| Field | Type | Notes |
|---|---|---|
| id, name | | one per account (FR-001) |
| locationState | `at(settlementId)` \| `traveling{routeId, departAt, arriveAt}` | exactly one (FR-002) |
| wallet | integer coins | never negative; all mutations via Transaction |
| skills | map skillId → {xp, level} | level derived from xp via SkillDef curve |
| assignment | ActivityAssignment? | at most one (FR-010) |
| caravanSlots | int | grows with hauling progression (FR-041) |
| lastSeenAt, rngState | | offline catch-up + determinism (research R6/R8 (economy)) |

#### ActivityAssignment
| Field | Type | Notes |
|---|---|---|
| activityId | ref | |
| settlementId | ref | where it runs; must match character location at start |
| startedAt | timestamp | |
| haltedAt, haltReason | optional | `inputs-exhausted \| storage-full \| travel \| replaced` (FR-016) |

**Transitions**: `idle → active` (assign; requires location, tier, inputs available) →
`halted` (engine-detected, atomic, no partial actions) or `replaced/stopped` (player, after
confirmation). Travel forces `halted(travel)`.

#### SettlementStorage (per player × settlement)
| Field | Type | Notes |
|---|---|---|
| settlementId, characterId | | |
| slots | map itemId → qty | items live in exactly ONE storage/escrow/caravan (FR-022) |
| gearInstances | GearItemInstance[] | non-fungible items stored here (Part II); same locality rules |
| expansionLevel | int | coin-purchased; ≤ storage facility effective tier cap (FR-023) |
| capacityUsed / capacity | number | capacity = base + expansion; activity halts when output won't fit (FR-016) |

#### MarketOrder
| Field | Type | Notes |
|---|---|---|
| id, settlementId, ownerId | | order is local to one settlement (FR-031) |
| side | `buy \| sell` | |
| itemId, qtyTotal, qtyRemaining, unitPrice | | partial fills (FR-033) |
| escrow | goods (sell) or coin (buy) | taken at placement, returned on cancel/expiry (FR-032/036) |
| placedAt, expiresAt | | |
| status | `open → partially-filled → filled \| cancelled \| expired` | terminal states release escrow |

**Matching invariant**: within a settlement, price priority then time priority; a unit of
quantity matches exactly once (SC-010); buyer pays, seller receives price − salesTax; goods land
in buyer's local storage. Same-owner orders never match each other (FR-033) — they coexist on
the book unfilled.

#### Trade
Immutable record: `{id, settlementId, itemId, qty, unitPrice, buyerId, sellerId, taxPaid,
executedAt}`. Feeds price history (FR-035) and transaction log (FR-052).

#### CaravanShipment
| Field | Type | Notes |
|---|---|---|
| id, ownerId, routeId | | |
| from, to | settlementIds | |
| manifest | {itemId, qty}[] | total weight ≤ capacity (FR-041) |
| departAt, arriveAt | | real-time timer, independent of assignment (FR-042) |
| mitigationPurchased | bool | |
| riskOutcome | `pending → none \| loss{items}` | rolled once, from state RNG (FR-043, research R6 (economy)) |
| status | `in-transit → delivered` | delivery deposits into destination storage |

#### NpcMarketState (per settlement × item; V1)
`{currentStock, lastTickAt, currentQuote}` — evolves per research R4 (economy); NPC orders
appear as MarketOrders owned by a reserved NPC principal.

#### Transaction (audit log, FR-052)
Append-only: `{id, characterId, kind, delta, balanceAfter, refId, at}` where kind ∈
`trade-buy/sell, listing-fee, sales-tax, dispatch-cost, mitigation, caravan-loss, production,
consumption, starter-grant`.

#### EventSummary (offline/return summary, FR-014)
Accumulated during catch-up: actions completed, items produced/consumed, xp/levels per skill,
halts (when/why), caravan arrivals, order fills/expiries, net coin change. Cleared on
acknowledgement.

#### NotificationPrefs (FR-064)
`{characterId, categories: map categoryId → optedIn}` — all categories off by default;
category ids come from authored NotificationCategoryDefs (launch set: caravan-arrival,
offline-cap-reached, committed-start-approaching, order-filled-expired). Delivery is a host
adapter (V1 device-scheduled, V2 Web Push — research R15 (economy)); the model has no
promotional category and the schema admits none.

#### SaveGame (V1) / WorldState (V2 row set)
`{formatVersion, contentVersion, character, storages[], orders[], trades[], shipments[],
npcStates[], facilityStates[], transactions[], notificationPrefs, pendingSummary,
clockMarks}` — Zod-validated on load; migrations keyed on formatVersion (research R7
(economy)).

### Cross-cutting invariants

1. **Conservation**: no engine operation creates or destroys items/coin except authored
   production/consumption, fees/taxes (sinks), and caravan risk losses — each leaves a
   Transaction. Audited by property-based engine tests (SC-010).
2. **Locality**: an item is in exactly one of {storage, sell-escrow, caravan manifest} and is
   usable only at its location (FR-022); markets never match across settlements (FR-031).
3. **Single assignment**: a character has ≤ 1 active ActivityAssignment; travel and assignment
   are mutually exclusive (FR-010/044).
4. **Determinism**: identical (SaveGame, content, elapsed ticks) ⇒ identical state; all
   randomness flows from `rngState` (research R6 (economy)).
5. **Tier gates**: assignment/craft requires SkillDef tier ≤ character level-derived tier,
   and (refining/crafting) a local station of effective tier ≥ the activity's tier
   (FR-015/037); locked content is visible but inert.

## Part II — Combat Core (designed 2026-06-12)

Same two halves as the other parts: **authored content** (read-only definitions, JSON in
`packages/content/data/`, shapes owned by [contracts/content-schema.md](./contracts/content-schema.md))
and **runtime state** (mutable, engine-owned, serialized into the V1 save / V2 database).
Designed once the clarification rounds fixed the attribute model (FR-107), the threat model
(FR-108), and onboarding (FR-113). Research: research.md Part IV (combat) — research.md
numbers combat as Part IV because parts there are ordered by authoring date; the
`(combat)` qualifier is the stable reference. Parts III–IV below consume these shapes; the
touchpoints they flagged for re-verification are resolved (research R11 resolution notes).

### Authored Content (definitions)

#### AttributeDef
Exactly five (FR-107): original-named analogs of Strength / Dexterity / Intelligence /
Focus / Constitution. `{id, name, description}` — semantics come from where curves and
schools reference them, never from code.

#### CombatCurves (one global def set)
Authored CurveExpr set (same expression discipline as research R8 (relic/delve)) the
resolver evaluates and never hard-codes (FR-107): `healthCurve` (Constitution-analog →
health pool), `attributeScaling` (attribute points → magnitude multiplier),
`masteryScaling` (mastery level → magnitude multiplier), `armorMitigation` (physical and
elemental rating → mitigation %), `threatFactors` (`{sustainFactor}` — healing-to-threat
weight, FR-108), `recoveryMinutes` and `retreatDurabilityPenalty` (FR-132 costs).

#### SchoolDef
| Field | Type | Notes |
|---|---|---|
| id, name, description | slug, string | original text only (FR-150); launch: ≥ 2 schools, ≥ 1 magic (FR-160) |
| flavor | `weapon \| magic` | structural peers — same shape either way (FR-160) |
| scalingAttributeIds | ref AttributeDef[1–2] | drive ability/basic-attack magnitude (FR-107) |
| weaponFocusTag | item tag | gear with this tag activates this school when equipped (US7-AS5) |
| starterKitItemId | ref GearDef | the tier-1 one-time grant item (FR-113) |
| masteryCurve | curve params | per-level mastery XP; independent per school (FR-163) |
| basicAttack | {intervalSeconds, effects} | exists for every school (FR-165) |
| abilityIds | ref AbilityDef[] | the school's roster (FR-161) |
| branches | [TreeBranchDef, TreeBranchDef] | exactly two (FR-170) |
| defaultTactics | TacticsProgram | shipped rotation — combat works with zero config (FR-167) |

#### AbilityDef
| Field | Type | Notes |
|---|---|---|
| id, schoolId, name, description | | |
| cooldownSeconds | number | |
| effects | EffectExpr[] | damage/heal/HoT/DoT/buff/debuff/shield/threat-amp; ally-targeted variants per FR-108 |
| magnitudeScaling | curve ref | from school's scaling attributes + mastery (FR-161) |
| unlockSource | `mastery(level) \| treeNode(nodeId)` | (FR-161) |
| synergyNotes | string | surfaced in the loadout UI (US7-AS3) |

#### TreeBranchDef / TreeNodeDef
`TreeBranchDef {id, name, nodes: TreeNodeDef[]}`;
`TreeNodeDef {id, name, prereqNodeIds[], pointCost, kind: passive(EffectExpr) |
abilityUnlock(abilityId), exactEffectText}` — every node states its exact mechanical
effect (FR-172); point scarcity vs total node cost is a content test (FR-171).

#### EffectExpr (shared vocabulary — defined here, used game-wide)
One closed expression vocabulary for ability effects, perk passives, gear modifiers
(Part III), encounter-mechanic outcomes (Part III), and relic signatures (Part IV):
kinds `damage(phys|elem) | heal | hot | dot | buff(stat, duration) | debuff | shield |
modify-ability(param) | threat-amp | resource(provision interaction)`, each with
magnitude/duration/target params; targets are `self | enemy | ally | party` — **no
player-as-victim target exists** (the SC-208 audit surface, research R2 (challenge)).
New kinds are engine + schema changes, never authoring improvisation.

#### EnemyDef
| Field | Type | Notes |
|---|---|---|
| id, name, description | | original text only |
| tier | int | gates engagement by character combat tier (FR-112) |
| family | slug | deed counters (Part IV) and recipe theming key off it |
| stats | {attributes, health, armorRating{phys, elem}} | same stat model as characters (FR-107) |
| actions | {intervalSeconds, effects: EffectExpr[]}[] | ability-like behaviors on timers (FR-111) |
| xpAward | {combatSkillXp, masteryXp} | per kill (FR-103/163) |
| dropTableId | ref RewardTable | shared shape (`shared/reward-tables/`); **never coin** (FR-053, research R7 (combat)) |

#### HuntingGroundDef
| Field | Type | Notes |
|---|---|---|
| id, name, regionId | | rosters differ by region (FR-110/141) |
| settlementTags | string[] | visible from the settlement screen from creation (FR-113) |
| roster | {enemyId, requiredCharacterTier}[] | locked entries show requirements (FR-112) |

#### GearDef (extends ItemDef)
| Field | Type | Notes |
|---|---|---|
| …ItemDef fields | | tier, weight, basePrice — ordinary economy item (FR-123) |
| slot | `weapon-focus \| head \| chest \| hands \| legs \| feet \| trinket` | equipment slots (FR-120) |
| schoolTag | item tag? | weapon-focus only: which school it activates |
| attributeGrants | {attributeId, points}[] | the FR-107 gear contribution |
| armorRating | {phys, elem} | mitigation input (FR-107) |
| modifierSlots | int | rolled/locked per FR-271 (Part III); grade derived from fill count (FR-270) |
| durabilityMax, wearPerFight | numbers | depleted gear grants nothing until repaired (FR-122) |
| repairCost | {coinPerPoint, materials?} | economy sink (FR-122) |

Gear score bands per tier and the modifier system live in Part III (`gear-modifiers/`,
FR-270–272) — they apply to all gear, this table is the base identity.

#### ProvisionDef (extends ItemDef)
`{…ItemDef fields, kind: food | remedy, restoreEffects: EffectExpr[],
defaultThresholdPct, consumeCooldownSeconds}` — craftable goods that auto-consume at
player-configured thresholds (FR-121).

### Runtime State (mutable)

#### GearItemInstance (owned here; Parts III–IV extend it)
`{instanceId, itemDefId, gearScore, modifiers: gearModifierId[], durability}` —
non-fungible: stored, escrowed, and shipped as an instance under the economy core's
locality rules; provisions/materials stay fungible stacks (research R6 (combat)).
`qualityGrade` is always derived from modifier count (FR-270, Part III). At
durability 0 the instance grants no stats, perks, or modifiers until repaired.

#### SchoolMastery (per character × school)
`{schoolId, xp, level, pointsEarned, spentNodes: nodeId[]}` — independent per school,
preserved on switch (FR-163); points earned on level-up (FR-171). Combat skill XP itself
lives in the Part I skills map (family `combat`); **character tier** (the FR-211/223 hard
gate) is derived: highest tier across the character's combat skills — never stored.

#### Loadout (per character)
| Field | Type | Notes |
|---|---|---|
| equipped | map slot → gearInstanceId | school derived from equipped weapon-focus's schoolTag |
| slottedAbilityIds | abilityId[≤ 3] | launch slot count content-tunable (FR-162) |
| tactics | TacticsProgram | editable any time; mid-expedition edits effective next tick (FR-169) |
| provisionPlan | {itemId, thresholdPct}[] | auto-consume config (FR-121) |
| retreatThresholdPct | number ≥ 0 | 0% = fight to overwhelm; still no death (FR-131, edge case) |
| inertFlags | {kind: unslotted-ability \| inert-rule \| inert-modifier, ref}[] | the FR-173 pattern; reused by relics (Part IV) |

**TacticsProgram**: ordered `{abilityId, trigger: {kind, param?}}[]` with kinds
`always | self-health-below(pct) | enemy-health-above(pct) | enemy-health-below(pct) |
ally-health-below(pct) | buff-missing(ref) | debuff-present(ref) | at-expedition-start`
(closed set, FR-166; ally/party kinds per FR-108). Strict order = priority; first
satisfied + off-cooldown rule casts (FR-168). The program is also the auto AI everywhere
(research R4 (combat)).

#### ExpeditionInstance
| Field | Type | Notes |
|---|---|---|
| id, characterId, groundId, enemyId | | occupies the single activity slot (FR-104) |
| buildSnapshot | school, slottedAbilities, treeEffects, equipped instances, provisionManifest | frozen at start — only tactics stay live (FR-169, research R5 (combat)) |
| combatState | CombatState | resolver state (below) |
| haul | {items, gearInstances, xp, masteryXp, points} | banks in full on ANY end (FR-130/131) |
| provisionsRemaining | {itemId, qty} | exhaustion + overwhelm triggers retreat |
| startedAt | timestamp | |
| state | `fighting → ended(retreat \| supplies \| recalled \| offline-cap) → recovering(until)` | recovery gates expeditions only (FR-132) |

#### CombatState (resolver state — expeditions and encounter instances share it)
`{combatants: {ref, health, attributeTotals, armorTotals, cooldowns, buffs/debuffs}[],
threatTables: map enemyRef → map combatantRef → threat, tickCount, rngState}` — advanced
by the pure resolver on the 1 s combat tick (research R1/R3 (combat)); threat targeting
deterministic with stable-join-order tie-break (FR-106/108). Per-kill loot draws from
per-expedition RNG sub-streams (research R7 (combat)).

### State transitions of note

- **School adoption (FR-113)**: first hunting-grounds open → choose any launch school →
  starter kit granted once ever (`starter-grant` transaction is the idempotency record) →
  weapon equipped → school active. Later school switches are just equipping another
  school's weapon/focus; masteries persist.
- **Expedition**: `assign (slot free, not recovering, gear durability > 0 warning) →
  fighting`; each kill banks XP/loot into haul; `retreat threshold crossed ∧ no provision
  restores → ended(retreat)`; `provisions exhausted ∧ overwhelm → ended(supplies)`;
  `player recalls / travels / respecs → confirm → ended(recalled)`; any end →
  `recovering(until)` per CombatCurves, haul banked in full, extra durability wear on
  retreat (FR-131/132). Offline: identical transitions via tick replay up to the cap
  (FR-105); results merge into the unified EventSummary (FR-014).
- **Respec**: outside expeditions only; coin cost (sink) → all points refunded, tree
  effects removed; invalidated slotted abilities unslotted, dependent tactics rules
  flagged inert — never a mid-combat error (FR-173).

### Validation rules (content tests — "Part II tests")

1. Every school: exactly 2 branches, a basic attack, a valid default tactics program
   referencing only its own roster, and a resolving tier-1 `starterKitItemId`
   (FR-165/167/170/113).
2. Point scarcity: total points earnable at launch mastery cap < combined node cost of
   both branches, per school — builds require choices (FR-171, US9-AS5).
3. Every ability and tree node uses only the closed EffectExpr vocabulary, states its
   exact effect, and its unlock source resolves (FR-161/172).
4. Drop tables pay no coin (shape makes it unrepresentable; test asserts it); every
   hunting region yields ≥ 1 combat-exclusive material; regional rosters and materials
   differ; ≥ 20% of crafting recipes demand a combat-exclusive material; every region's
   materials are demanded by ≥ 1 recipe (FR-053/140/141, SC-105).
5. Every settlement region has a hunting ground with ≥ 1 tier-1 enemy — a new character
   can always fight from day one (FR-110/113).
6. Gear coverage: a craftable weapon/focus exists per school per tier; every armor slot
   has craftable coverage per tier; durability, wear, and repair fields present
   (FR-120/122).
7. Exactly five AttributeDefs; every school designates 1–2 existing attributes; all
   CombatCurves present and total over their domains (FR-107).
8. Originality denylist over school, ability, enemy, and ground names/text (FR-150,
   Part I world-integrity test 8).

## Part III — Challenge & Group Layer (former 003)

Same two halves as the economy core: **authored content** (read-only definitions, JSON in
`packages/content/data/`, shapes owned by [contracts/content-schema.md](./contracts/content-schema.md))
and **runtime state** (mutable, engine-owned, serialized into the V1 save / V2 database).
Content ids are stable slugs (`encounter.cinder-tyrant`); runtime objects use generated ids.
Entities from the economy core and the combat core are referenced, not redefined.

### Authored Content (definitions)

#### EncounterDef
The shared challenge unit every format references (FR-201).

| Field | Type | Notes |
|---|---|---|
| id, name, description | slug, string | original text only |
| bossTier | int | display + qualification context |
| enemies | EnemyRef[] | combat-core EnemyDefs participating |
| phases | PhaseDef[] | ordered; entry by boss-health % and/or timer |
| enrage | {atSeconds, effect} | optional encounter-wide enrage (FR-201) |
| sessionBudgetMinutes | number | tuning target feeding SC-207 audits |

#### PhaseDef
| Field | Type | Notes |
|---|---|---|
| entry | {bossHealthPctBelow? , atSeconds?} | at least one |
| mechanics | MechanicDef[] | scheduled within the phase |

#### MechanicDef
Closed kind vocabulary — the PvE-only audit surface (SC-208): no kind can direct one
player's damage at another player.

| Field | Type | Notes |
|---|---|---|
| id, name | slug, string | journal entry key (FR-202) |
| kind | `telegraph \| add-wave \| aura \| surge \| enrage` | closed set |
| schedule | {firstAtSeconds, repeatEverySeconds?} | within phase |
| windowSeconds | number ≥ 4 | telegraph/surge only; schema-enforced minimum (research R4 (challenge)) |
| answers | AnswerDef[] | telegraph/surge only; ≥ 1 |
| cooperative | {requiredAnswers: int, partialOutcome} | answers needed from distinct members (FR-221) |
| stations | StationRef[] | surge only: which lanes it targets (raids/invasions) |
| outcomes | {answered, partial?, ignored} | each an EffectExpr; materially different (US1-AS3) |

**AnswerDef**: `{id, label, source: abilityRef | stance | provision | verb(brace/duty/supply),
effect}` — answers reference the combat-core action surface plus format verbs (research R2 (challenge)).

#### MettleTrialDef
| Field | Type | Notes |
|---|---|---|
| id, name | | |
| encounterId | ref EncounterDef | solo, 1 participant |
| ladderPosition | int | unlock = clear of previous + character tier (FR-211) |
| requiredCharacterTier | int | hard gate |
| recommendedGearScore | {min, max} | advisory only, never blocks (FR-211) |
| scoreBracketSetId | ref ScoreBracketSet | rank → payout scaling (FR-210) |
| rewardTableId | ref RewardTable | includes trial-exclusive materials (FR-260) |

#### DungeonDef
| Field | Type | Notes |
|---|---|---|
| id, name, settlementTags | | where its entrance lives |
| partySize | int | launch: 5 (FR-221) |
| encounterSequence | EncounterRef[] | ≥ 1 cooperative mechanic per boss (content test) |
| rewardTableId | ref | dungeon-exclusive materials |
| afflictionPoolEligible | bool | joins weekly rotation pool (FR-223) |

#### AfflictionSetDef
| Field | Type | Notes |
|---|---|---|
| id, name | | |
| modifiers | AfflictionModifier[] | elemental twist / empowerment / curse, full disclosure |
| counteredBy | gearModifierId[] | ward/resist mapping published with rotation (FR-272) |

**AfflictionLevelDef**: `{level (1..3+), modifierStack: afflictionSetIds, requiredCharacterTier,
recommendedGearScore, scoreBracketSetId, rewardScaling, gearScoreBand}` — qualification =
recorded clear of level−1 + character tier; gear band is advisory (FR-223).

#### RaidDef
| Field | Type | Notes |
|---|---|---|
| id, name | | |
| size | {standard: 10, max: 20} | per tier (FR-230) |
| encounterSequence | EncounterRef[] | ≥ 1 mechanic with simultaneous multi-station answers |
| stations | StationDef[] | UI lanes — tactical positions without movement |
| rewardTableId | ref | raid-exclusive materials |

**StationDef**: `{id, label, capacity, duties: AnswerDef[]}` — shared by raids and invasions.

#### EliteZoneDef
| Field | Type | Notes |
|---|---|---|
| id, name, regionId | | |
| roster | EnemyRef[] + EncounterRef[] | tuned for full party (FR-240) |
| partyTuningSize | int | drives the solo honesty warning |
| rewardTableId | ref | zone-exclusive materials |

#### EruptionEventDef
| Field | Type | Notes |
|---|---|---|
| id, name | | |
| cadence | {regionPools, meanHoursBetween, scalingBounds} | wave size scales to participants (FR-241) |
| waves | MechanicDef(surge)[] | |
| routeRiskEffect | {riskDelta, affectedRouteSelector} | caravan tie-in while active (FR-241) |
| contributionWeightSetId, rewardTableId | refs | |
| sessionBudgetMinutes | ≤ 15 | SC-207 |

#### WorldBossDef
| Field | Type | Notes |
|---|---|---|
| id, name, regionId | | |
| encounterId | ref | mass variant: aggregate presentation (research R6 (challenge)) |
| spawnWindows | schedule expr | published in advance on region board (FR-242) |
| concurrencyTarget | int | launch: 50; overflow = credit-only attach |
| contributionWeightSetId, rewardFloorPctOfMedian, rewardTableId | | floor default 10% (FR-242) |

#### InvasionDef
| Field | Type | Notes |
|---|---|---|
| id, name | | per settlement archetype |
| threatWeights | {prosperity, tradeVolume, regionalHunts} | feeds ThreatMeter (research R10 (challenge)) |
| threatThreshold, noticeHours | number | default 48 h warboard notice (FR-250) |
| rosterCap | int | launch: 50 |
| stations, waves | StationDef[], MechanicDef(surge)[] | |
| failureDegradations | FacilityDegradation[] | temporary, settlement-level only (FR-251) |
| repair | {contributionWeightSetId, selfRestoreDays} | dual path (FR-251) |
| successBoon | {prosperityBonus, durationHours} | settlement-wide stake |

#### GearModifierDef (extends combat-core gear)
| Field | Type | Notes |
|---|---|---|
| id, name, slotTypes | | which gear slots can carry it |
| effect | EffectExpr | exact mechanical statement (FR-271) |
| counters | afflictionSetId[] | ward/resist relationships (FR-272) |
| acquisition | {poolIds, dropOdds, craftModItemId?, dropExclusiveTo?: formatId} | hybrid model (FR-271) |

**ModifierPoolDef**: `{id, slotType, entries: {modifierId, weight}[]}` — disclosed odds.

**QualityGrade**: not authored per item — a global authored scale
`{grade, minModifiers, name}`; an item's grade is always derived from its modifier count
(FR-270, research R9 (challenge)).

**GearScoreBand**: per tier `{tier, min, max, statScalingCurve}` — gear score scales stats;
grade never does (FR-270).

#### Shared reward/score primitives
- **ScoreBracketSet**: `{id, criteria: {time, penalties}, brackets: {name, threshold,
  payoutMultiplier}[]}` — shared by trials and afflictions (FR-210/223).
- **RewardTable**: `{id, entries: {itemId | gearDrop{slotPool, gearScoreBand,
  modifierRolls}, chance, qty}[]}` — every format's table contains ≥ 1 exclusive material
  demanded by ≥ 1 recipe (content test, SC-205).
- **ContributionWeightSet**: `{id, wDamage, wSustain, wObjective, normalization}` — per
  format (FR-264).

### Runtime State (mutable)

#### EncounterInstance
| Field | Type | Notes |
|---|---|---|
| id, encounterDefId, formatRef | | trial/dungeon/raid/zone/event/boss/invasion context |
| participants | ParticipantState[] | character snapshot + control mode + connection |
| phaseIndex, phaseClockSeconds, bossState | | engine reducer state (research R3 (challenge)) |
| activeMechanics | {mechanicId, windowEndsAt, answersReceived[]}[] | |
| rngState | | per-instance seed; per-member loot sub-streams (research R7 (challenge)) |
| haul, scoreInputs | | banked on any end — no-ruin (FR-204) |
| state | `forming → running → ended(victory \| wipe \| called)` | wipe banks haul, applies durability/recovery only |

**ParticipantState**: `{characterId, controlMode: active|auto, connected, joinedAtEncounterIndex,
bossesPresentFor[]}` — presence list drives backfill loot eligibility (FR-224).

#### Party / RaidGroup
| Field | Type | Notes |
|---|---|---|
| id, formatTarget | | dungeon/raid/zone party |
| members | {characterId, role?, joinedAt}[] | joinedAt drives leadership succession |
| leaderId | | auto-transfer after 60 s grace; reclaim on reconnect (FR-224) |
| state | `forming → in-instance → disbanded` | |

#### GroupBoardListing
`{id, settlementId, formatId, roleNeeds[], plannedStart, slotsFilled/total, state:
open → full → closed}` — also carries backfill listings for in-progress runs (FR-220/224).

#### RaidSignup
`{id, raidDefId, scheduledAt, roleRequirements, readinessHints, commitments:
{characterId, status: committed | declined | waitlisted}[]}` (FR-231).

#### QualificationRecord
`{characterId, ladder: trialId | dungeonId, clearedLevel, bestBracket, timestamps}` —
the hard gate evidence for FR-211/223; personal bests are recognition.

#### AfflictionRotationState
Derived, not stored: `rotation(worldSeed, isoWeek)` (research R8 (challenge)). Stored: per-week
**LeaderboardEntry** `{dungeonId, week, partyMemberIds, score, bracket}` — recognition
only, no material payout (FR-223).

#### ContributionRecord
`{instanceId, characterId, damage, sustain, objectiveActions, weightedScore}` — engine
accumulator; reward floor compares to median at resolution (FR-242/264). Reused by repair
drives (FR-251).

#### ThreatMeter / ScheduledInvasion
`ThreatMeter {settlementId, value, lastTickAt}` — visible to all settlement players.
`ScheduledInvasion {settlementId, invasionDefId, startsAt, roster: {characterId,
stationId}[], state: posted → rostered → running → resolved(success | failure)}` (FR-250).

#### FacilityDegradationState
`{settlementId, facilityId, tiersLost, appliedAt, selfRestoreAt, repairProgress}` —
temporary by construction; restoration via contribution or timeout (FR-251).

#### GearItemInstance (defined in Part II — combat core)
The instance representation is owned by the combat core (Part II, research R6 (combat));
this layer supplies the `gearScore`/`modifiers` semantics on it: `qualityGrade` derived on
read from modifiers.length (research R9 (challenge)), gear score within the tier's
authored band. Trades/escrows/ships as an instance; stackable goods keep the economy
core's fungible quantity model.

### State transitions of note

- **EncounterInstance**: `forming → running` requires qualification gates pass (hard:
  prior clear + character tier; advisory gear warning acknowledged). `running → ended(*)`
  always banks haul and applies only durability + recovery (FR-204). Roster changes only
  while no boss fight is active (FR-224).
- **Leadership**: `leader disconnect → grace(60 s) → transfer(longest-present)`;
  `reconnect → reclaim`. Never frozen (FR-224).
- **Idle accrual**: `enter instance → suspend (FR-013 paused)`; `exit → resume from
  exit timestamp` (FR-205, research R1 (challenge)).
- **ThreatMeter**: `accumulate (world tick) → threshold → ScheduledInvasion(posted) +
  reset`.

### Validation rules (content tests)

1. Every `windowSeconds ≥ 4` (schema minimum — decision speed, not dexterity).
2. Every dungeon/raid boss encounter has ≥ 1 `cooperative` mechanic (FR-221/230).
3. Every format's RewardTable yields ≥ 1 exclusive material AND every exclusive material
   is consumed by ≥ 1 recipe (SC-205).
4. No MechanicDef kind or EffectExpr can target a player as recipient of another player's
   action — PvE audit (SC-208).
5. Every AfflictionSetDef's `counteredBy` references existing GearModifierDefs and every
   craft-mod item is sourced from ≥ 1 challenge RewardTable (FR-271/272).
6. Trial/affliction ladders are well-formed: contiguous levels, monotonically increasing
   requiredCharacterTier, ladder position 1 / level 1 reachable (FR-211/223).
7. Session budgets present and within format caps (30/45/15 min) for SC-207 auditing.

## Part IV — Relics & Delves (former 004)

Same two halves as the economy core and the challenge layer: **authored content** (read-only
definitions, JSON in `packages/content/data/`, shapes owned by
[contracts/content-schema.md](./contracts/content-schema.md)) and **runtime state**
(mutable, engine-owned, serialized into the V1 save / V2 database). Content ids are stable
slugs (`relic.emberwright-maul`, `delve-site.saltmere-undercroft`); runtime objects use
generated ids. Entities from the economy core, the combat core, and the challenge layer are
referenced, not redefined — in particular
`GearItemInstance`, `GearModifierDef`, `EncounterDef`, `EncounterInstance`, `RewardTable`,
and the party/leadership model all come from the challenge layer's data model (Part III).

### Authored Content (definitions)

#### RelicDef

One per relic; authoring it publishes it in the compendium (research R9 (relic/delve)).

| Field | Type | Notes |
|---|---|---|
| id, name, lore | slug, string | original text only (FR-024) |
| tier | int | gear score fixed at top of this tier's band — no roll (FR-304) |
| equipCategory | `weapon-focus \| armor-trinket` | equip-limit category (FR-302, research R10 (relic/delve)) |
| gearSlot | combat-core slot ref | which combat-core gear slot it occupies |
| signatureModifierId | ref GearModifierDef | must have `signatureOf` = this relic (research R3 (relic/delve)) |
| slotCount | int | total modifier slots incl. signature; sealed at grant minus signature |
| source | RelicSourceRef | exactly one disclosed source (FR-303) |
| duplicateCompensation | {items/coin, qty}[] | paid on repeat source completion (FR-303) |
| awakeningTrack | AwakeningStepDef[] | ordered; unseal one slot each (FR-304) |

**RelicSourceRef**: `{format: mettle-trial | afflicted-dungeon | raid | world-boss |
invasion | delve-depth, contentRef, threshold}` — e.g. `{format: delve-depth,
contentRef: delve-site id, threshold: depth}` or `{format: mettle-trial, contentRef:
trial id, threshold: rank/bracket}`. Multiplayer-only formats drive the V1 honest label
(FR-307).

#### AwakeningStepDef

| Field | Type | Notes |
|---|---|---|
| index | int | contiguous from 1 |
| deed | DeedRequirementDef | disclosed counter requirement |
| materials | {itemId, qty}[] | ≥ 1 market-tradable across the track (SC-303, content test) |
| unseals | int | slot index unsealed by this step |

**DeedRequirementDef**: `{kind: defeat-family | clear-format-at-rank | reach-delve-depth |
deliver-trade-volume, target, count}` — closed kind set; counters accumulate on the
character (research R2 (relic/delve)). New kinds are schema + engine changes, never authoring
improvisation (research R2 (challenge) discipline).

#### SignatureModifierDef (constraint on the challenge layer's GearModifierDef)

Not a new entity — a `GearModifierDef` with `signatureOf: relicId` set. Schema/integrity
constraints (research R3 (relic/delve)): excluded from every `ModifierPoolDef`, never a
`craftModItemId` target, referenced by exactly one relic; effect uses the standard `EffectExpr`
vocabulary; counts toward derived quality grade like any modifier.

#### DelveSiteDef

| Field | Type | Notes |
|---|---|---|
| id, name, regionId | | regional asymmetry (FR-030, FR-310) |
| roomPool | {roomId, depthWeighting}[] | authored rooms; weights may vary by depth (research R4 (relic/delve)) |
| encounterPools | {pool: EncounterRef[], depthBand, bossGrade?}[] | challenge-layer EncounterDefs; boss-grade pools at authored intervals (FR-314) |
| depthModifierPool | DepthModifierDef[] | authored twists applied by depth draw |
| floorShape | {encountersPerFloor: {min,max}, targetMinutes ≤ 5} | phone pacing (FR-317) |
| difficultyCurve / bonusMultiplierCurve | CurveExpr | disclosed, content-tunable (research R8 (relic/delve)) |
| partyScaling | {bounds, fullPartyDepthBand, diminishCurve} | honest warning beyond band (FR-311) |
| baseRewardNotes | — | base haul flows through the challenge-layer reward path; nothing authored here |
| ventureBonusTable | ref VentureBonusTable | per-floor staked accruals (research R6 (relic/delve)) |
| sessionExpectation | {firstLandingMinutes ≈ 10} | disclosure + SC-305 audit target |

**RoomDef**: `{id, name, description, presentationTags}` — authored room identity;
original text only. **DepthModifierDef**: `{id, name, effect: EffectExpr, disclosure
text}` — same full-disclosure rule as affliction modifiers.

**CurveExpr**: parameterized expression `{base, perFloorRate, breakpoints?, cap?}`
evaluated by pure engine functions of `(depth, partySize)` — total over all depths,
no final floor (research R4/R8 (relic/delve)).

#### VentureBonusTable

`{id, entries: {itemId | gearDrop{slotPool, gearScoreBand, modifierRolls}, chance,
qty}[]}` — same shape as the challenge layer's `RewardTable`, but accrued to staked per-member
ledgers instead of banked (research R6 (relic/delve)). Contains the delve-exclusive materials;
every exclusive material is demanded by ≥ 1 recipe and delve materials appear among craft-mod
sources and in selected awakening tracks (FR-316, content tests).

#### Reward-cap lever (reserve policy)

`{id, scope: site | global, window: day | week, cap: {exclusiveMaterials?, bonusPortion?}}`
— authored, disclosed, **inactive at launch** (FR-314, the challenge layer's reserve policy).
Base rewards are never capped.

### Runtime State (mutable)

#### Relic item state (extends the challenge layer's GearItemInstance)

A relic instance is a `GearItemInstance` whose def is a `RelicDef`, with awakening state
on the instance (travels on trade — research R2 (relic/delve)):

`{…challenge-layer instance fields, relicState: {unsealedSlots: int[], lockedModifiers:
{slot, gearModifierId}[], stepsCompleted: int}}` — `qualityGrade` derived from
modifier count (signature + locked) per research R9 (challenge). Gear score is fixed
top-of-band at creation; durability per the combat core.

#### RelicGrantRecord

`{characterId, relicId, grantedAt, sourceCompletionRef}` — permanent, one per
character/relic ever; the source-pays-once evidence (research R1 (relic/delve), SC-304).
Written even if the relic is later sold; repeat source completions consult it and pay duplicate
compensation.

#### AwakeningProgress

`{characterId, relicDefId, stepIndex, deedCounters: {deedKey: count}}` — per-character
progress toward the *current incomplete* step of an owned relic; never transfers with the
item (research R2 (relic/delve)). Deleted/reset when the step completes (progress moves into
the item's `stepsCompleted`) or abandoned when the relic is sold.

#### DescentInstance

| Field | Type | Notes |
|---|---|---|
| id, siteId, seed, mode | | mode: `random \| weekly-expedition` (FR-315) |
| party | {characterId, joinedAtFloor, leftAtFloor?}[] | presence drives ledger accrual (research R6 (relic/delve)) and backfill proration |
| leaderId | | challenge-layer leadership rules apply at landings (FR-312) |
| depth, state | int, `descending → at-landing → … → ended(withdrawn \| wiped \| abandoned)` | research R5 (relic/delve) state machine |
| currentFloor | {floorPlan, encounterInstanceId} | floor combat is a challenge-layer EncounterInstance |
| rngState | | per-descent stream; per-member ledger sub-streams (research R7 (challenge)) |
| ventureLedgers | VentureLedger[] | the staked pool (research R6 (relic/delve)) |

Base haul never appears here — it banks through the challenge-layer reward path the moment
it drops (FR-313).

**FloorPlan** (derived, not stored): `assembleFloor(siteDef, seed, depth, partySize)` —
regenerated from inputs, lazily per descent (research R4 (relic/delve)).

#### VentureLedger

`{characterId, accruals: {floorDepth, entries: rolledEntitlement[]}[], state:
staked → paid(withdraw \| opt-out) | forfeited(wipe \| abandon)}` — entitlements, never
owned property, until paid (research R6 (relic/delve)). Opt-out pays exactly this ledger; a
backfilled member's ledger starts at their join floor.

#### LandingState

`{descentId, depth, poolValueDisclosed, nextFloorPreview: {multiplier, difficulty},
readyCheck: {characterId, response: pending → ready \| opt-out}[], leaderCall:
pending → withdraw \| descend, deadline}` — the ready-check protocol (FR-312). Auto-AI
members auto-`ready` but the AI never calls descend; no live leader after the challenge-layer
grace → auto-withdraw (research R5 (relic/delve)).

#### DepthRecord

`{characterId, siteId, bestDepth, achievedAt}` — all-time personal best per site
(FR-314).

#### WeeklyExpeditionEntry

`{siteId, isoWeek, characterId, bestDepth, partyMemberIds}` — recognition-only
leaderboard rows (titles/flair, no material payout); best-of unlimited attempts posts
(FR-315). The week's seed is derived, not stored:
`weeklySeed(worldSeed, siteId, isoWeek)` (research R7 (relic/delve)).

### State transitions of note

- **Relic grant**: `source completed → grant record exists? → no: mint instance (dormant:
  signature active, slots sealed, top-band gear score) + write RelicGrantRecord; yes: pay
  duplicateCompensation` (FR-303/304, research R1 (relic/delve)).
- **Relic trade delivery**: `recipient owns a copy? → yes: reject RELIC_ALREADY_OWNED
  before payment; no: transfer instance with relicState intact` (research R1/R2 (relic/delve)).
- **Awakening step**: `deed counters ≥ requirement ∧ materials in local storage → consume
  materials, unseal slot, stepsCompleted++, reset AwakeningProgress` — atomic (research R2 (relic/delve)).
- **Descent**: `entering → descending`; `floor cleared → at-landing (ledgers accrue)`;
  `leader: withdraw → ended(withdrawn), all ledgers pay`; `leader: descend → opt-outs'
  ledgers pay + they exit, rest → descending at recomputed scaling`; `party wipe →
  ended(wiped): staked ledgers forfeit, base haul kept, durability/recovery only`
  (FR-312/313, research R5/R6 (relic/delve)).
- **Idle accrual**: suspended inside a descent, resumes from exit timestamp (research R1
  (challenge), FR-310).

### Validation rules (content tests)

1. Every relic's `signatureModifierId` resolves, has `signatureOf` = that relic, appears
   in no modifier pool and no craft-mod recipe, and belongs to exactly one relic (FR-301,
   research R3 (relic/delve)).
2. Every relic has exactly one source with a resolving contentRef; ≥ 1 relic has a
   mettle-trial (V1-obtainable) source (FR-303/307, SC-308).
3. Every awakening track: contiguous steps, each unsealing an existing slot, total
   unseals = slotCount − 1 (signature excluded), ≥ 1 market-tradable material in the
   track (FR-304/305, SC-303).
4. Selected awakening tracks demand delve-exclusive materials; every delve-exclusive
   material is consumed by ≥ 1 recipe; delve materials appear among craft-mod sources
   (FR-316).
5. Every site: curves present and total over depth (no final floor), floor shape targets
   ≤ 5 minutes, party scaling declares bounds + diminish band, boss-grade pools at
   disclosed intervals (FR-311/314/317).
6. Site encounter pools reference only existing challenge-layer EncounterDefs — windows
   ≥ 4 s and PvE-only audits inherited (Part III validation tests 1/4).
7. Duplicate compensation present on every relic (FR-303).
8. Reward-cap lever configs are disclosed-shape valid and inactive at launch (FR-314).
