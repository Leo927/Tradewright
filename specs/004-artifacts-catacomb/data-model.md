# Data Model: Relic Gear & Delve Descents

**Date**: 2026-06-11 | **Plan**: [plan.md](./plan.md)

Same two halves as 001/003: **authored content** (read-only definitions, JSON in
`packages/content/data/`, shapes owned by
[contracts/content-schema.md](./contracts/content-schema.md)) and **runtime state**
(mutable, engine-owned, serialized into the V1 save / V2 database). Content ids are stable
slugs (`relic.emberwright-maul`, `delve-site.saltmere-undercroft`); runtime objects use
generated ids. Entities from 001/002/003 are referenced, not redefined — in particular
`GearItemInstance`, `GearModifierDef`, `EncounterDef`, `EncounterInstance`, `RewardTable`,
and the party/leadership model all come from 003's data model.

## Authored Content (definitions)

### RelicDef

One per relic; authoring it publishes it in the compendium (research R9).

| Field | Type | Notes |
|---|---|---|
| id, name, lore | slug, string | original text only (001 FR-024) |
| tier | int | gear score fixed at top of this tier's band — no roll (FR-304) |
| equipCategory | `weapon-focus \| armor-trinket` | equip-limit category (FR-302, R10) |
| gearSlot | 002 slot ref | which 002 gear slot it occupies |
| signatureModifierId | ref GearModifierDef | must have `signatureOf` = this relic (R3) |
| slotCount | int | total modifier slots incl. signature; sealed at grant minus signature |
| source | RelicSourceRef | exactly one disclosed source (FR-303) |
| duplicateCompensation | {items/coin, qty}[] | paid on repeat source completion (FR-303) |
| awakeningTrack | AwakeningStepDef[] | ordered; unseal one slot each (FR-304) |

**RelicSourceRef**: `{format: mettle-trial | afflicted-dungeon | raid | world-boss |
invasion | delve-depth, contentRef, threshold}` — e.g. `{format: delve-depth,
contentRef: delve-site id, threshold: depth}` or `{format: mettle-trial, contentRef:
trial id, threshold: rank/bracket}`. Multiplayer-only formats drive the V1 honest label
(FR-307).

### AwakeningStepDef

| Field | Type | Notes |
|---|---|---|
| index | int | contiguous from 1 |
| deed | DeedRequirementDef | disclosed counter requirement |
| materials | {itemId, qty}[] | ≥ 1 market-tradable across the track (SC-303, content test) |
| unseals | int | slot index unsealed by this step |

**DeedRequirementDef**: `{kind: defeat-family | clear-format-at-rank | reach-delve-depth |
deliver-trade-volume, target, count}` — closed kind set; counters accumulate on the
character (R2). New kinds are schema + engine changes, never authoring improvisation
(003 R2 discipline).

### SignatureModifierDef (constraint on 003's GearModifierDef)

Not a new entity — a `GearModifierDef` with `signatureOf: relicId` set. Schema/integrity
constraints (R3): excluded from every `ModifierPoolDef`, never a `craftModItemId` target,
referenced by exactly one relic; effect uses the standard `EffectExpr` vocabulary; counts
toward derived quality grade like any modifier.

### DelveSiteDef

| Field | Type | Notes |
|---|---|---|
| id, name, regionId | | regional asymmetry (001 FR-030, FR-310) |
| roomPool | {roomId, depthWeighting}[] | authored rooms; weights may vary by depth (R4) |
| encounterPools | {pool: EncounterRef[], depthBand, bossGrade?}[] | 003 EncounterDefs; boss-grade pools at authored intervals (FR-314) |
| depthModifierPool | DepthModifierDef[] | authored twists applied by depth draw |
| floorShape | {encountersPerFloor: {min,max}, targetMinutes ≤ 5} | phone pacing (FR-317) |
| difficultyCurve / bonusMultiplierCurve | CurveExpr | disclosed, content-tunable (R8) |
| partyScaling | {bounds, fullPartyDepthBand, diminishCurve} | honest warning beyond band (FR-311) |
| baseRewardNotes | — | base haul flows through 003 reward path; nothing authored here |
| ventureBonusTable | ref VentureBonusTable | per-floor staked accruals (R6) |
| sessionExpectation | {firstLandingMinutes ≈ 10} | disclosure + SC-305 audit target |

**RoomDef**: `{id, name, description, presentationTags}` — authored room identity;
original text only. **DepthModifierDef**: `{id, name, effect: EffectExpr, disclosure
text}` — same full-disclosure rule as affliction modifiers.

**CurveExpr**: parameterized expression `{base, perFloorRate, breakpoints?, cap?}`
evaluated by pure engine functions of `(depth, partySize)` — total over all depths,
no final floor (R4/R8).

### VentureBonusTable

`{id, entries: {itemId | gearDrop{slotPool, gearScoreBand, modifierRolls}, chance,
qty}[]}` — same shape as 003's `RewardTable`, but accrued to staked per-member ledgers
instead of banked (R6). Contains the delve-exclusive materials; every exclusive material
is demanded by ≥ 1 recipe and delve materials appear among craft-mod sources and in
selected awakening tracks (FR-316, content tests).

### Reward-cap lever (reserve policy)

`{id, scope: site | global, window: day | week, cap: {exclusiveMaterials?, bonusPortion?}}`
— authored, disclosed, **inactive at launch** (FR-314, 003 reserve policy). Base rewards
are never capped.

## Runtime State (mutable)

### Relic item state (extends 003 GearItemInstance)

A relic instance is a `GearItemInstance` whose def is a `RelicDef`, with awakening state
on the instance (travels on trade — R2):

`{…003 instance fields, relicState: {unsealedSlots: int[], lockedModifiers:
{slot, gearModifierId}[], stepsCompleted: int}}` — `qualityGrade` derived from
modifier count (signature + locked) per 003 R9. Gear score is fixed top-of-band at
creation; durability per 002.

### RelicGrantRecord

`{characterId, relicId, grantedAt, sourceCompletionRef}` — permanent, one per
character/relic ever; the source-pays-once evidence (R1, SC-304). Written even if the
relic is later sold; repeat source completions consult it and pay duplicate compensation.

### AwakeningProgress

`{characterId, relicDefId, stepIndex, deedCounters: {deedKey: count}}` — per-character
progress toward the *current incomplete* step of an owned relic; never transfers with the
item (R2). Deleted/reset when the step completes (progress moves into the item's
`stepsCompleted`) or abandoned when the relic is sold.

### DescentInstance

| Field | Type | Notes |
|---|---|---|
| id, siteId, seed, mode | | mode: `random \| weekly-expedition` (FR-315) |
| party | {characterId, joinedAtFloor, leftAtFloor?}[] | presence drives ledger accrual (R6) and backfill proration |
| leaderId | | 003 leadership rules apply at landings (FR-312) |
| depth, state | int, `descending → at-landing → … → ended(withdrawn \| wiped \| abandoned)` | R5 state machine |
| currentFloor | {floorPlan, encounterInstanceId} | floor combat is a 003 EncounterInstance |
| rngState | | per-descent stream; per-member ledger sub-streams (003 R7) |
| ventureLedgers | VentureLedger[] | the staked pool (R6) |

Base haul never appears here — it banks through the 003 reward path the moment it drops
(FR-313).

**FloorPlan** (derived, not stored): `assembleFloor(siteDef, seed, depth, partySize)` —
regenerated from inputs, lazily per descent (R4).

### VentureLedger

`{characterId, accruals: {floorDepth, entries: rolledEntitlement[]}[], state:
staked → paid(withdraw \| opt-out) | forfeited(wipe \| abandon)}` — entitlements, never
owned property, until paid (R6). Opt-out pays exactly this ledger; a backfilled member's
ledger starts at their join floor.

### LandingState

`{descentId, depth, poolValueDisclosed, nextFloorPreview: {multiplier, difficulty},
readyCheck: {characterId, response: pending → ready \| opt-out}[], leaderCall:
pending → withdraw \| descend, deadline}` — the ready-check protocol (FR-312). Auto-AI
members auto-`ready` but the AI never calls descend; no live leader after the 003 grace →
auto-withdraw (R5).

### DepthRecord

`{characterId, siteId, bestDepth, achievedAt}` — all-time personal best per site
(FR-314).

### WeeklyExpeditionEntry

`{siteId, isoWeek, characterId, bestDepth, partyMemberIds}` — recognition-only
leaderboard rows (titles/flair, no material payout); best-of unlimited attempts posts
(FR-315). The week's seed is derived, not stored:
`weeklySeed(worldSeed, siteId, isoWeek)` (R7).

## State transitions of note

- **Relic grant**: `source completed → grant record exists? → no: mint instance (dormant:
  signature active, slots sealed, top-band gear score) + write RelicGrantRecord; yes: pay
  duplicateCompensation` (FR-303/304, R1).
- **Relic trade delivery**: `recipient owns a copy? → yes: reject RELIC_ALREADY_OWNED
  before payment; no: transfer instance with relicState intact` (R1/R2).
- **Awakening step**: `deed counters ≥ requirement ∧ materials in local storage → consume
  materials, unseal slot, stepsCompleted++, reset AwakeningProgress` — atomic (R2).
- **Descent**: `entering → descending`; `floor cleared → at-landing (ledgers accrue)`;
  `leader: withdraw → ended(withdrawn), all ledgers pay`; `leader: descend → opt-outs'
  ledgers pay + they exit, rest → descending at recomputed scaling`; `party wipe →
  ended(wiped): staked ledgers forfeit, base haul kept, durability/recovery only`
  (FR-312/313, R5/R6).
- **Idle accrual**: suspended inside a descent, resumes from exit timestamp (003 R1,
  FR-310).

## Validation rules (content tests)

1. Every relic's `signatureModifierId` resolves, has `signatureOf` = that relic, appears
   in no modifier pool and no craft-mod recipe, and belongs to exactly one relic (FR-301,
   R3).
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
6. Site encounter pools reference only existing 003 EncounterDefs — windows ≥ 4 s and
   PvE-only audits inherited (003 tests 1/4).
7. Duplicate compensation present on every relic (FR-303).
8. Reward-cap lever configs are disclosed-shape valid and inactive at launch (FR-314).
