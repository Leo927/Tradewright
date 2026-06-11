# Data Model: Challenge & Group Combat Content

**Date**: 2026-06-11 | **Plan**: [plan.md](./plan.md)

Same two halves as 001: **authored content** (read-only definitions, JSON in
`packages/content/data/`, shapes owned by [contracts/content-schema.md](./contracts/content-schema.md))
and **runtime state** (mutable, engine-owned, serialized into the V1 save / V2 database).
Content ids are stable slugs (`encounter.cinder-tyrant`); runtime objects use generated ids.
Entities from 001/002 are referenced, not redefined.

## Authored Content (definitions)

### EncounterDef
The shared challenge unit every format references (FR-201).

| Field | Type | Notes |
|---|---|---|
| id, name, description | slug, string | original text only |
| bossTier | int | display + qualification context |
| enemies | EnemyRef[] | 002 EnemyDefs participating |
| phases | PhaseDef[] | ordered; entry by boss-health % and/or timer |
| enrage | {atSeconds, effect} | optional encounter-wide enrage (FR-201) |
| sessionBudgetMinutes | number | tuning target feeding SC-207 audits |

### PhaseDef
| Field | Type | Notes |
|---|---|---|
| entry | {bossHealthPctBelow? , atSeconds?} | at least one |
| mechanics | MechanicDef[] | scheduled within the phase |

### MechanicDef
Closed kind vocabulary — the PvE-only audit surface (SC-208): no kind can direct one
player's damage at another player.

| Field | Type | Notes |
|---|---|---|
| id, name | slug, string | journal entry key (FR-202) |
| kind | `telegraph \| add-wave \| aura \| surge \| enrage` | closed set |
| schedule | {firstAtSeconds, repeatEverySeconds?} | within phase |
| windowSeconds | number ≥ 4 | telegraph/surge only; schema-enforced minimum (R4) |
| answers | AnswerDef[] | telegraph/surge only; ≥ 1 |
| cooperative | {requiredAnswers: int, partialOutcome} | answers needed from distinct members (FR-221) |
| stations | StationRef[] | surge only: which lanes it targets (raids/invasions) |
| outcomes | {answered, partial?, ignored} | each an EffectExpr; materially different (US1-AS3) |

**AnswerDef**: `{id, label, source: abilityRef | stance | provision | verb(brace/duty/supply),
effect}` — answers reference the 002 action surface plus format verbs (R2).

### MettleTrialDef
| Field | Type | Notes |
|---|---|---|
| id, name | | |
| encounterId | ref EncounterDef | solo, 1 participant |
| ladderPosition | int | unlock = clear of previous + character tier (FR-211) |
| requiredCharacterTier | int | hard gate |
| recommendedGearScore | {min, max} | advisory only, never blocks (FR-211) |
| scoreBracketSetId | ref ScoreBracketSet | rank → payout scaling (FR-210) |
| rewardTableId | ref RewardTable | includes trial-exclusive materials (FR-260) |

### DungeonDef
| Field | Type | Notes |
|---|---|---|
| id, name, settlementTags | | where its entrance lives |
| partySize | int | launch: 5 (FR-221) |
| encounterSequence | EncounterRef[] | ≥ 1 cooperative mechanic per boss (content test) |
| rewardTableId | ref | dungeon-exclusive materials |
| afflictionPoolEligible | bool | joins weekly rotation pool (FR-223) |

### AfflictionSetDef
| Field | Type | Notes |
|---|---|---|
| id, name | | |
| modifiers | AfflictionModifier[] | elemental twist / empowerment / curse, full disclosure |
| counteredBy | gearModifierId[] | ward/resist mapping published with rotation (FR-272) |

**AfflictionLevelDef**: `{level (1..3+), modifierStack: afflictionSetIds, requiredCharacterTier,
recommendedGearScore, scoreBracketSetId, rewardScaling, gearScoreBand}` — qualification =
recorded clear of level−1 + character tier; gear band is advisory (FR-223).

### RaidDef
| Field | Type | Notes |
|---|---|---|
| id, name | | |
| size | {standard: 10, max: 20} | per tier (FR-230) |
| encounterSequence | EncounterRef[] | ≥ 1 mechanic with simultaneous multi-station answers |
| stations | StationDef[] | UI lanes — tactical positions without movement |
| rewardTableId | ref | raid-exclusive materials |

**StationDef**: `{id, label, capacity, duties: AnswerDef[]}` — shared by raids and invasions.

### EliteZoneDef
| Field | Type | Notes |
|---|---|---|
| id, name, regionId | | |
| roster | EnemyRef[] + EncounterRef[] | tuned for full party (FR-240) |
| partyTuningSize | int | drives the solo honesty warning |
| rewardTableId | ref | zone-exclusive materials |

### EruptionEventDef
| Field | Type | Notes |
|---|---|---|
| id, name | | |
| cadence | {regionPools, meanHoursBetween, scalingBounds} | wave size scales to participants (FR-241) |
| waves | MechanicDef(surge)[] | |
| routeRiskEffect | {riskDelta, affectedRouteSelector} | caravan tie-in while active (FR-241) |
| contributionWeightSetId, rewardTableId | refs | |
| sessionBudgetMinutes | ≤ 15 | SC-207 |

### WorldBossDef
| Field | Type | Notes |
|---|---|---|
| id, name, regionId | | |
| encounterId | ref | mass variant: aggregate presentation (R6) |
| spawnWindows | schedule expr | published in advance on region board (FR-242) |
| concurrencyTarget | int | launch: 50; overflow = credit-only attach |
| contributionWeightSetId, rewardFloorPctOfMedian, rewardTableId | | floor default 10% (FR-242) |

### InvasionDef
| Field | Type | Notes |
|---|---|---|
| id, name | | per settlement archetype |
| threatWeights | {prosperity, tradeVolume, regionalHunts} | feeds ThreatMeter (R10) |
| threatThreshold, noticeHours | number | default 48 h warboard notice (FR-250) |
| rosterCap | int | launch: 50 |
| stations, waves | StationDef[], MechanicDef(surge)[] | |
| failureDegradations | FacilityDegradation[] | temporary, settlement-level only (FR-251) |
| repair | {contributionWeightSetId, selfRestoreDays} | dual path (FR-251) |
| successBoon | {prosperityBonus, durationHours} | settlement-wide stake |

### GearModifierDef (extends 002 gear)
| Field | Type | Notes |
|---|---|---|
| id, name, slotTypes | | which gear slots can carry it |
| effect | EffectExpr | exact mechanical statement (FR-271) |
| counters | afflictionSetId[] | ward/resist relationships (FR-272) |
| acquisition | {poolIds, dropOdds, craftModItemId?, dropExclusiveTo?: formatId} | hybrid model (FR-271) |

**ModifierPoolDef**: `{id, slotType, entries: {modifierId, weight}[]}` — disclosed odds.

**QualityGrade**: not authored per item — a global authored scale
`{grade, minModifiers, name}`; an item's grade is always derived from its modifier count
(FR-270, R9).

**GearScoreBand**: per tier `{tier, min, max, statScalingCurve}` — gear score scales stats;
grade never does (FR-270).

### Shared reward/score primitives
- **ScoreBracketSet**: `{id, criteria: {time, penalties}, brackets: {name, threshold,
  payoutMultiplier}[]}` — shared by trials and afflictions (FR-210/223).
- **RewardTable**: `{id, entries: {itemId | gearDrop{slotPool, gearScoreBand,
  modifierRolls}, chance, qty}[]}` — every format's table contains ≥ 1 exclusive material
  demanded by ≥ 1 recipe (content test, SC-205).
- **ContributionWeightSet**: `{id, wDamage, wSustain, wObjective, normalization}` — per
  format (FR-264).

## Runtime State (mutable)

### EncounterInstance
| Field | Type | Notes |
|---|---|---|
| id, encounterDefId, formatRef | | trial/dungeon/raid/zone/event/boss/invasion context |
| participants | ParticipantState[] | character snapshot + control mode + connection |
| phaseIndex, phaseClockSeconds, bossState | | engine reducer state (R3) |
| activeMechanics | {mechanicId, windowEndsAt, answersReceived[]}[] | |
| rngState | | per-instance seed; per-member loot sub-streams (R7) |
| haul, scoreInputs | | banked on any end — no-ruin (FR-204) |
| state | `forming → running → ended(victory \| wipe \| called)` | wipe banks haul, applies durability/recovery only |

**ParticipantState**: `{characterId, controlMode: active|auto, connected, joinedAtEncounterIndex,
bossesPresentFor[]}` — presence list drives backfill loot eligibility (FR-224).

### Party / RaidGroup
| Field | Type | Notes |
|---|---|---|
| id, formatTarget | | dungeon/raid/zone party |
| members | {characterId, role?, joinedAt}[] | joinedAt drives leadership succession |
| leaderId | | auto-transfer after 60 s grace; reclaim on reconnect (FR-224) |
| state | `forming → in-instance → disbanded` | |

### GroupBoardListing
`{id, settlementId, formatId, roleNeeds[], plannedStart, slotsFilled/total, state:
open → full → closed}` — also carries backfill listings for in-progress runs (FR-220/224).

### RaidSignup
`{id, raidDefId, scheduledAt, roleRequirements, readinessHints, commitments:
{characterId, status: committed | declined | waitlisted}[]}` (FR-231).

### QualificationRecord
`{characterId, ladder: trialId | dungeonId, clearedLevel, bestBracket, timestamps}` —
the hard gate evidence for FR-211/223; personal bests are recognition.

### AfflictionRotationState
Derived, not stored: `rotation(worldSeed, isoWeek)` (R8). Stored: per-week
**LeaderboardEntry** `{dungeonId, week, partyMemberIds, score, bracket}` — recognition
only, no material payout (FR-223).

### ContributionRecord
`{instanceId, characterId, damage, sustain, objectiveActions, weightedScore}` — engine
accumulator; reward floor compares to median at resolution (FR-242/264). Reused by repair
drives (FR-251).

### ThreatMeter / ScheduledInvasion
`ThreatMeter {settlementId, value, lastTickAt}` — visible to all settlement players.
`ScheduledInvasion {settlementId, invasionDefId, startsAt, roster: {characterId,
stationId}[], state: posted → rostered → running → resolved(success | failure)}` (FR-250).

### FacilityDegradationState
`{settlementId, facilityId, tiersLost, appliedAt, selfRestoreAt, repairProgress}` —
temporary by construction; restoration via contribution or timeout (FR-251).

### GearItemInstance (extends 002 item instance)
`{instanceId, itemDefId, gearScore, modifiers: gearModifierId[], durability}` —
`qualityGrade` derived on read from modifiers.length (R9). Trades/escrows/ships as an
instance; stackable goods keep 001's fungible quantity model.

## State transitions of note

- **EncounterInstance**: `forming → running` requires qualification gates pass (hard:
  prior clear + character tier; advisory gear warning acknowledged). `running → ended(*)`
  always banks haul and applies only durability + recovery (FR-204). Roster changes only
  while no boss fight is active (FR-224).
- **Leadership**: `leader disconnect → grace(60 s) → transfer(longest-present)`;
  `reconnect → reclaim`. Never frozen (FR-224).
- **Idle accrual**: `enter instance → suspend (001 FR-013 paused)`; `exit → resume from
  exit timestamp` (FR-205, R1).
- **ThreatMeter**: `accumulate (world tick) → threshold → ScheduledInvasion(posted) +
  reset`.

## Validation rules (content tests)

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
