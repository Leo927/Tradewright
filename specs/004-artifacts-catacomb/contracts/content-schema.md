# Contract: Relic & Delve Content Schema (extension)

**Date**: 2026-06-11 | **Plan**: [../plan.md](../plan.md) | **Package**: `@tradewright/content` (`schemas/relics/`, `schemas/delves/`)

Extends [001's content schema contract](../../001-idle-economy-mmo/contracts/content-schema.md)
and [003's challenge extension](../../003-challenge-group-combat/contracts/content-schema.md):
same rules — authored content is JSON under `packages/content/data/`, every file validated
by a Zod schema at build time, ids are stable slugs, all text original. Field-level shapes
are specified in [../data-model.md](../data-model.md); this contract fixes file layout,
authoring rules, and the integrity tests that gate CI.

## File layout

```text
packages/content/data/
├── relics/
│   ├── relics/            # RelicDef — one file per relic (source, track, compensation)
│   └── signature-modifiers/ # GearModifierDef files with signatureOf set (R3)
├── delves/
│   ├── sites/             # DelveSiteDef (pools refs, curves, scaling, pacing)
│   ├── rooms/             # RoomDef
│   ├── depth-modifiers/   # DepthModifierDef
│   ├── venture-tables/    # VentureBonusTable
│   └── reward-caps/       # reserve-policy lever configs (inactive at launch)
└── …                      # 001/002/003 trees unchanged; delve floor encounters are
                           #   ordinary EncounterDefs in encounters/
```

## Authoring rules

1. **Signature exclusivity is structural**: a modifier with `signatureOf` may appear in no
   `ModifierPoolDef` and no craft-mod recipe, and exactly one relic references it. The
   build fails otherwise — "exists on no other item" (FR-301) is a CI property.
2. **One disclosed source per relic**: every `RelicDef.source` names an existing format
   content id and threshold; duplicate compensation is mandatory. Sources spanning the
   003 formats plus delve depth milestones only (FR-303).
3. **No gear-score roll on relics**: gear score is implied by tier (top of band) and is
   not an authorable field (FR-304, 003 FR-270 determinism).
4. **Tracks touch the market**: every awakening track includes ≥ 1 market-tradable
   material; selected tracks (launch: ≥ 2 relics) demand delve-exclusive materials
   (FR-305/316, SC-303).
5. **Assembly is systemic, content is authored**: rooms, encounter sequences, and depth
   modifiers are authored files; sites compose them via pools and weights. No generated
   text, no procedural content — only procedural assembly (001 FR-024 separation; spec
   Out of Scope).
6. **Curves are total and disclosed**: difficulty, bonus multiplier, and party-scaling
   curves are expressions valid for every depth ≥ 1 (no final floor, FR-314); all curve
   parameters are player-visible data.
7. **Decision-speed floor inherited**: delve floors reference 003 EncounterDefs, so
   windows ≥ 4 s and the PvE-only mechanic vocabulary apply unchanged (003 rules 1–2).
8. **Tunables are content**: equip-limit counts, scaling bounds, multiplier rates,
   floor pacing targets, weekly cadence, duplicate compensation, reward-cap levers —
   all in these files, never in code.
9. **Original expression**: the originality denylist (001 world-integrity test 8,
   extended 2026-06-11) covers the inspiration's feature names — "Artifact"/"Artifacts"
   and "Catacomb"/"Catacombs" as feature labels join it; "relic" and "delve" are working
   names and final names remain content decisions (spec Assumptions).

## Integrity tests (CI gate, `packages/content/tests/`)

| # | Test | Source |
|---|---|---|
| 1 | Signature modifiers: resolve, `signatureOf` reciprocal, absent from all pools and craft-mod recipes, exactly one owning relic | FR-301, R3 |
| 2 | Every relic: exactly one resolving source; ≥ 1 relic with a mettle-trial source (V1-obtainable); duplicate compensation present | FR-303/307, SC-308 |
| 3 | Awakening tracks: contiguous steps, unseals cover slotCount − 1 exactly, ≥ 1 tradable material per track | FR-304/305, SC-303 |
| 4 | Delve-exclusive materials: every one consumed by ≥ 1 recipe; present among craft-mod sources; demanded by ≥ 2 launch awakening tracks | FR-316 |
| 5 | Sites: curves total over depth, floor shape ≤ 5 min target, first-landing expectation ≤ ~10 min, scaling bounds + diminish band declared, boss-grade intervals disclosed | FR-311/314/317, SC-305 |
| 6 | Site pools reference existing 003 EncounterDefs only (inherits window/PvE audits); room and depth-modifier refs resolve | FR-310 |
| 7 | Reward-cap lever configs schema-valid and inactive at launch; base rewards never capped | FR-314 |
| 8 | Originality denylist: relic/delve names, rooms, modifiers, lore contain no denylisted inspiration terms | 001 FR-024 |
| 9 | Launch scale sanity: 6–10 relics spanning all source formats; 2–3 sites in distinct regions | spec Assumptions |

## Versioning

Schema changes follow the 001 content-contract policy: additive optional fields are MINOR;
anything that invalidates existing content files is MAJOR and ships with a content
migration in the same change.
