# Contract: Authored Content Schema (Authors ↔ Engine)

**Date**: 2026-06-11 (Parts I/III/IV) / 2026-06-12 (Part II + faucet/notification files) |
**Plan**: [../plan.md](../plan.md) | **Package**: `@tradewright/content`

Merged 2026-06-11 from the former game/challenge/relic-delve content-schema contracts
(spec collapse); the combat content contract (Part II) was added 2026-06-12.

## File layout (combined)

One tree unions the economy core's flat files and the combat, challenge, and relic & delve
directories.

```text
packages/content/data/
├── skills.json          # SkillDef[]
├── items.json           # ItemDef[]
├── activities.json      # ActivityDef[] (gathering, refining, crafting — recipes included)
├── settlements.json     # SettlementDef[]
├── routes.json          # RouteDef[]
├── npc-profiles.json    # NpcMarketProfile[] — incl. faucet floor lists + sweep budgets (FR-054)
├── notification-categories.json # NotificationCategoryDef[] — the FR-064 launch set
├── combat/
│   ├── attributes.json  # AttributeDef[] (exactly 5) + CombatCurves (FR-107)
│   ├── schools/         # SchoolDef — one per school (roster, branches, default tactics, starter kit)
│   ├── abilities/       # AbilityDef files
│   ├── enemies/         # EnemyDef files (drop tables are shared/reward-tables refs)
│   ├── hunting-grounds/ # HuntingGroundDef per region
│   ├── gear/            # GearDef files (slots, attribute grants, armor, durability)
│   └── provisions/      # ProvisionDef files
├── encounters/          # EncounterDef files (phases, mechanics, answers) — one per encounter;
│                        #   delve floor encounters are ordinary EncounterDefs here
├── trials/              # MettleTrialDef ladder
├── dungeons/            # DungeonDef + encounter sequence refs
├── raids/               # RaidDef + StationDefs
├── afflictions/         # AfflictionSetDef, AfflictionLevelDef, rotation pools
├── gear-modifiers/      # GearModifierDef, ModifierPoolDef, QualityGrade scale, GearScoreBands
├── formats/
│   ├── elite-zones/     # EliteZoneDef
│   ├── events/          # EruptionEventDef
│   ├── world-bosses/    # WorldBossDef
│   └── invasions/       # InvasionDef (threat weights, stations, degradations, repair)
├── relics/
│   ├── relics/              # RelicDef — one file per relic (source, track, compensation)
│   └── signature-modifiers/ # GearModifierDef files with signatureOf set (R3, relic/delve)
├── delves/
│   ├── sites/             # DelveSiteDef (pools refs, curves, scaling, pacing)
│   ├── rooms/             # RoomDef
│   ├── depth-modifiers/   # DepthModifierDef
│   ├── venture-tables/    # VentureBonusTable
│   └── reward-caps/       # reserve-policy lever configs (inactive at launch)
└── shared/
    ├── score-brackets/      # ScoreBracketSet
    ├── reward-tables/       # RewardTable (incl. gearDrop entries)
    └── contribution-weights/# ContributionWeightSet
```

## Part I — Base Rules & Economy Content (former 001)

This is the constitution Principle IV seam. Authors edit JSON under `packages/content/data/`;
the engine consumes validated, typed definitions. Neither side touches the other: content
changes never require code changes, and engine refactors never rewrite content. The executable
form of this contract is the Zod schema set in `packages/content/schemas/`; this document fixes
the rules the schemas must encode. Field-level shapes live in
[../data-model.md](../data-model.md) (Authored Content section).

### Files

File layout: see the combined tree above (the economy core owns the flat `*.json` files).

A `contentVersion` (semver) in `packages/content/package.json` stamps every build and every
save (saves remember which content they were created under).

### Validation gates (run at build time and in CI; loading unvalidated content is impossible)

**Schema validity** — every file parses against its Zod schema; unknown fields are errors
(catches typos like `wieght`).

**Referential integrity** — every cross-reference resolves: activity→skill, activity
inputs/outputs→items, settlement→activities/npc-profile, route→settlements, npc entry→items.

**World integrity** (content unit tests, Principle I applied to data — numbering preserved
from the former economy-core contract; other documents cite these numbers):

1. Recipe graph is a DAG — no item requires itself transitively.
2. Every activity input is obtainable: gatherable somewhere or producible by another activity.
3. Every settlement offers ≥ 1 tier-1 gathering activity (a new player can always start).
4. The route graph is connected — no unreachable settlement.
5. Asymmetry budget (SC-006): no single settlement's local activities can produce > 60% of
   recipes' input needs.
6. Tier coverage: every skill has content at every tier it declares.
7. NPC sanity: priceBounds min× < 1 < max×; production and consumption rates nonzero for traded
   staples (markets can't flatline).
8. Originality lint: name/description strings are checked against a denylist of inspiration-game
   terms (New World / Ironwood / Melvor item and place names, plus their feature/system names —
   e.g. "Soul Trial", "Mutator", "Outpost Rush", "Azoth", "Aeternum") to enforce FR-024
   mechanically. (Denylist scope extended 2026-06-11 after the spec audit found a feature-name
   collision in the former spec 003's draft.)

### Authoring rules

- All text original (FR-024). Structure may follow genre conventions; expression may not
  (R12, economy).
- Numbers are tuned against pacing targets (SC-006/007, idle pacing assumptions), not copied.
- IDs are immutable once shipped (saves reference them). Renames keep the id, change the name.
- Removing content that live saves may reference requires a content migration note and a
  deprecation path (engine treats unknown-but-referenced ids as inert legacy items).

## Part II — Combat Content (contracted 2026-06-12)

Extends Part I: same rules — authored content is JSON under `packages/content/data/`,
every file validated by a Zod schema at build time, ids are stable slugs, all text
original. Field-level shapes are specified in [../data-model.md](../data-model.md)
Part II; this section fixes file layout, authoring rules, and the integrity tests that
gate CI.

### File layout

File layout: see the combined tree above (`combat/`; enemy drop tables live in
`shared/reward-tables/` — one reward-table shape game-wide, research R7 (combat)).

### Authoring rules

1. **One effect vocabulary**: every ability, perk node, enemy action, gear modifier,
   mechanic outcome, and signature modifier uses the closed `EffectExpr` vocabulary
   (data-model Part II). New effect kinds are engine + schema changes, never author
   improvisation — and no expressible target is "another player as victim" (SC-208).
2. **No coin in drop tables**: reward-table entries reference items or gearDrops only;
   a coin entry is unrepresentable by schema (FR-053, research R7 (combat)).
3. **Every school is complete**: two branches, a basic attack, a default tactics
   program, and a tier-1 starter weapon/focus — a school missing any of these fails the
   build (FR-165/167/170, FR-113).
4. **Scarcity is authored deliberately**: total tree points earnable at the launch
   mastery cap must stay below the combined cost of both branches per school (FR-171) —
   tuning that breaks this fails CI, not review.
5. **Stats are curves, not constants**: health, scaling, mitigation, threat factors,
   recovery costs all live in `CombatCurves` (FR-107); engine code evaluating a literal
   combat constant is a review reject.
6. **Original expression**: school, ability, enemy, and ground names/text pass the
   Part I originality denylist (FR-150); structure may follow New World's weapon-mastery
   conventions, expression may not.
7. **Tunables are content**: ability slot count (3 at launch), recovery minutes, retreat
   durability penalty, wear rates, repair costs, starter-kit identity — all in these
   files, never in code.

### Integrity tests (CI gate, `packages/content/tests/` — "Part II tests")

| # | Test | Source |
|---|---|---|
| 1 | Every school: 2 branches, basic attack, valid default tactics over its own roster, resolving tier-1 starter kit | FR-165/167/170/113 |
| 2 | Tree-point scarcity: earnable points < combined branch cost, per school | FR-171 |
| 3 | Abilities/nodes use only closed EffectExpr kinds; exact effect text present; unlock sources resolve | FR-161/172 |
| 4 | Drop tables pay no coin; every region yields ≥ 1 combat-exclusive material; regional rosters/materials differ; ≥ 20% of crafting recipes demand combat materials; every region's materials demanded by ≥ 1 recipe | FR-053/140/141, SC-105 |
| 5 | Every settlement region has a hunting ground with ≥ 1 tier-1 enemy | FR-110/113 |
| 6 | Gear coverage: craftable weapon/focus per school per tier; craftable coverage per armor slot per tier; durability/wear/repair present | FR-120/122 |
| 7 | Exactly 5 AttributeDefs; school scaling refs resolve (1–2 each); CombatCurves present and total | FR-107 |
| 8 | Originality denylist over all combat names/text | FR-150 |

### Versioning

Schema changes follow the Part I content-contract policy: additive optional fields are
MINOR; anything that invalidates existing content files is MAJOR and ships with a content
migration in the same change.

## Part III — Challenge Content (former 003)

Extends Part I: same rules — authored content is JSON under `packages/content/data/`, every
file validated by a Zod schema at build time, ids are stable slugs, all text original. This
section is the author-facing contract; the Zod schemas are its executable form. Field-level
shapes are specified in [../data-model.md](../data-model.md) — this section fixes file
layout, authoring rules, and the integrity tests that gate CI.

### File layout

File layout: see the combined tree above (`encounters/`, `trials/`, `dungeons/`, `raids/`,
`afflictions/`, `gear-modifiers/`, `formats/`, `shared/`).

### Authoring rules

1. **Closed mechanic vocabulary**: `MechanicDef.kind` ∈ `telegraph | add-wave | aura |
   surge | enrage`. New kinds are an engine + schema change, never an author improvisation
   (research R2, challenge).
2. **Decision speed floor**: every `windowSeconds ≥ 4`. The schema rejects smaller values —
   this is the no-dexterity rule (FR-201) in executable form.
3. **Full disclosure**: mechanics, affliction modifiers, modifier pools and odds, score
   brackets, contribution weights, reward floors, and counter-mappings are all player-visible
   data. Nothing in these files is secret; hidden-information design belongs elsewhere.
4. **Original expression**: structures may mirror genre conventions (New World's mutators,
   rarity bands); every name, place, enemy, modifier, and description is original
   (FR-024 discipline). The originality denylist (Part I, world-integrity test 8) extends to
   the inspiration's feature/system names — e.g. "Soul Trial", "Mutator"/"Mutation" as
   feature labels, "Outpost Rush", "Azoth", "Aeternum" — not just item and place names
   (2026-06-11 audit).
5. **References by slug**: cross-file references (`encounterId`, `counteredBy`,
   `craftModItemId`, recipe inputs) use content ids; the build fails on a dangling ref.
6. **Tunables are content**: roster caps, concurrency targets, notice hours, grace windows,
   self-restore days, reward-floor percentages, session budgets, entry limits (unlimited at
   launch) — all live in these files, never in code (the spec's "content-tunable" levers).

### Integrity tests (CI gate, `packages/content/tests/`)

Numbering preserved from the former challenge contract; other documents cite these numbers
(Part III tests).

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

### Versioning

Schema changes follow the Part I content-contract policy: additive optional fields are MINOR;
anything that invalidates existing content files is MAJOR and ships with a content migration
in the same change.

## Part IV — Relic & Delve Content (former 004)

Extends Part I and Part III: same rules — authored content is JSON under
`packages/content/data/`, every file validated by a Zod schema at build time, ids are stable
slugs, all text original. Field-level shapes are specified in
[../data-model.md](../data-model.md); this section fixes file layout, authoring rules, and
the integrity tests that gate CI.

### File layout

File layout: see the combined tree above (`relics/`, `delves/`; the other trees are
unchanged — delve floor encounters are ordinary EncounterDefs in `encounters/`).

### Authoring rules

1. **Signature exclusivity is structural**: a modifier with `signatureOf` may appear in no
   `ModifierPoolDef` and no craft-mod recipe, and exactly one relic references it. The
   build fails otherwise — "exists on no other item" (FR-301) is a CI property.
2. **One disclosed source per relic**: every `RelicDef.source` names an existing format
   content id and threshold; duplicate compensation is mandatory. Sources spanning the
   challenge-layer formats plus delve depth milestones only (FR-303).
3. **No gear-score roll on relics**: gear score is implied by tier (top of band) and is
   not an authorable field (FR-304, FR-270 determinism).
4. **Tracks touch the market**: every awakening track includes ≥ 1 market-tradable
   material; selected tracks (launch: ≥ 2 relics) demand delve-exclusive materials
   (FR-305/316, SC-303).
5. **Assembly is systemic, content is authored**: rooms, encounter sequences, and depth
   modifiers are authored files; sites compose them via pools and weights. No generated
   text, no procedural content — only procedural assembly (FR-024 separation; spec
   Out of Scope).
6. **Curves are total and disclosed**: difficulty, bonus multiplier, and party-scaling
   curves are expressions valid for every depth ≥ 1 (no final floor, FR-314); all curve
   parameters are player-visible data.
7. **Decision-speed floor inherited**: delve floors reference Part III EncounterDefs, so
   windows ≥ 4 s and the PvE-only mechanic vocabulary apply unchanged (Part III authoring
   rules 1–2).
8. **Tunables are content**: equip-limit counts, scaling bounds, multiplier rates,
   floor pacing targets, weekly cadence, duplicate compensation, reward-cap levers —
   all in these files, never in code.
9. **Original expression**: the originality denylist (Part I world-integrity test 8,
   extended 2026-06-11) covers the inspiration's feature names — "Artifact"/"Artifacts"
   and "Catacomb"/"Catacombs" as feature labels join it; "relic" and "delve" are working
   names and final names remain content decisions (spec Assumptions).

### Integrity tests (CI gate, `packages/content/tests/`)

Numbering preserved from the former relic & delve contract; other documents cite these
numbers (Part IV tests).

| # | Test | Source |
|---|---|---|
| 1 | Signature modifiers: resolve, `signatureOf` reciprocal, absent from all pools and craft-mod recipes, exactly one owning relic | FR-301, R3 (relic/delve) |
| 2 | Every relic: exactly one resolving source; ≥ 1 relic with a mettle-trial source (V1-obtainable); duplicate compensation present | FR-303/307, SC-308 |
| 3 | Awakening tracks: contiguous steps, unseals cover slotCount − 1 exactly, ≥ 1 tradable material per track | FR-304/305, SC-303 |
| 4 | Delve-exclusive materials: every one consumed by ≥ 1 recipe; present among craft-mod sources; demanded by ≥ 2 launch awakening tracks | FR-316 |
| 5 | Sites: curves total over depth, floor shape ≤ 5 min target, first-landing expectation ≤ ~10 min, scaling bounds + diminish band declared, boss-grade intervals disclosed | FR-311/314/317, SC-305 |
| 6 | Site pools reference existing Part III EncounterDefs only (inherits window/PvE audits); room and depth-modifier refs resolve | FR-310 |
| 7 | Reward-cap lever configs schema-valid and inactive at launch; base rewards never capped | FR-314 |
| 8 | Originality denylist: relic/delve names, rooms, modifiers, lore contain no denylisted inspiration terms | FR-024 |
| 9 | Launch scale sanity: 6–10 relics spanning all source formats; 2–3 sites in distinct regions | spec Assumptions |

### Versioning

Schema changes follow the Part I content-contract policy: additive optional fields are MINOR;
anything that invalidates existing content files is MAJOR and ships with a content
migration in the same change.
