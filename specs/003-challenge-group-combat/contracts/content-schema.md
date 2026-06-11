# Contract: Challenge Content Schema (extension)

**Date**: 2026-06-11 | **Plan**: [../plan.md](../plan.md) | **Package**: `@tradewright/content` (`schemas/challenge/`)

Extends [001's content schema contract](../../001-idle-economy-mmo/contracts/content-schema.md):
same rules — authored content is JSON under `packages/content/data/`, every file validated by
a Zod schema at build time, ids are stable slugs, all text original. This document is the
author-facing contract; the Zod schemas are its executable form. Field-level shapes are
specified in [../data-model.md](../data-model.md) — this contract fixes file layout,
authoring rules, and the integrity tests that gate CI.

## File layout

```text
packages/content/data/
├── encounters/        # EncounterDef files (phases, mechanics, answers) — one per encounter
├── trials/            # MettleTrialDef ladder
├── dungeons/          # DungeonDef + encounter sequence refs
├── raids/             # RaidDef + StationDefs
├── afflictions/         # AfflictionSetDef, AfflictionLevelDef, rotation pools
├── gear-modifiers/    # GearModifierDef, ModifierPoolDef, QualityGrade scale, GearScoreBands
├── formats/
│   ├── elite-zones/   # EliteZoneDef
│   ├── events/        # EruptionEventDef
│   ├── world-bosses/  # WorldBossDef
│   └── invasions/     # InvasionDef (threat weights, stations, degradations, repair)
└── shared/
    ├── score-brackets/      # ScoreBracketSet
    ├── reward-tables/       # RewardTable (incl. gearDrop entries)
    └── contribution-weights/# ContributionWeightSet
```

## Authoring rules

1. **Closed mechanic vocabulary**: `MechanicDef.kind` ∈ `telegraph | add-wave | aura |
   surge | enrage`. New kinds are an engine + schema change, never an author improvisation
   (research R2).
2. **Decision speed floor**: every `windowSeconds ≥ 4`. The schema rejects smaller values —
   this is the no-dexterity rule (FR-201) in executable form.
3. **Full disclosure**: mechanics, affliction modifiers, modifier pools and odds, score
   brackets, contribution weights, reward floors, and counter-mappings are all player-visible
   data. Nothing in these files is secret; hidden-information design belongs elsewhere.
4. **Original expression**: structures may mirror genre conventions (New World's mutators,
   rarity bands); every name, place, enemy, modifier, and description is original
   (001 FR-024 discipline). The originality denylist (001 content-schema, world-integrity
   test 8) extends to the inspiration's feature/system names — e.g. "Soul Trial",
   "Mutator"/"Mutation" as feature labels, "Outpost Rush", "Azoth", "Aeternum" — not just
   item and place names (2026-06-11 audit).
5. **References by slug**: cross-file references (`encounterId`, `counteredBy`,
   `craftModItemId`, recipe inputs) use content ids; the build fails on a dangling ref.
6. **Tunables are content**: roster caps, concurrency targets, notice hours, grace windows,
   self-restore days, reward-floor percentages, session budgets, entry limits (unlimited at
   launch) — all live in these files, never in code (the spec's "content-tunable" levers).

## Integrity tests (CI gate, `packages/content/tests/`)

| # | Test | Source |
|---|---|---|
| 1 | All windows ≥ 4 s; all cooperative mechanics have `requiredAnswers ≤ partySize` | FR-201/221 |
| 2 | Every dungeon/raid boss encounter contains ≥ 1 cooperative mechanic | FR-221/230 |
| 3 | Every format reward table yields ≥ 1 exclusive material; every exclusive material is consumed by ≥ 1 recipe; group-content materials ≥ 10% of launch recipe inputs | FR-260, SC-205 |
| 4 | No mechanic kind/effect can target a player as recipient of another player's action | FR-261, SC-208 |
| 5 | Every AfflictionSet's `counteredBy` resolves; every craft-mod item is sourced from ≥ 1 challenge reward table; drop-exclusive modifiers name an existing format | FR-271/272 |
| 6 | Trial ladder and affliction levels contiguous, tiers monotonic, first rung open | FR-211/223 |
| 7 | Session budgets present and ≤ 30/45/15 min per format class | FR-263, SC-207 |
| 8 | Quality-grade scale covers 0..maxModifierSlots with no gaps; gear-score bands exist for every gear tier | FR-270 |

## Versioning

Schema changes follow the 001 content-contract policy: additive optional fields are MINOR;
anything that invalidates existing content files is MAJOR and ships with a content migration
in the same change.
