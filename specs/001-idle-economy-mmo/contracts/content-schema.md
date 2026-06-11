# Contract: Authored Content Schema (Authors ↔ Engine)

**Date**: 2026-06-11 | **Plan**: [../plan.md](../plan.md) | **Package**: `@tradewright/content`

This is the constitution Principle IV seam. Authors edit JSON under `packages/content/data/`;
the engine consumes validated, typed definitions. Neither side touches the other: content
changes never require code changes, and engine refactors never rewrite content. The executable
form of this contract is the Zod schema set in `packages/content/schemas/`; this document fixes
the rules the schemas must encode. Field-level shapes live in
[../data-model.md](../data-model.md) (Authored Content section).

## Files

```text
packages/content/data/
├── skills.json          # SkillDef[]
├── items.json           # ItemDef[]
├── activities.json      # ActivityDef[] (gathering, refining, crafting — recipes included)
├── settlements.json     # SettlementDef[]
├── routes.json          # RouteDef[]
└── npc-profiles.json    # NpcMarketProfile[]
```

A `contentVersion` (semver) in `packages/content/package.json` stamps every build and every
save (saves remember which content they were created under).

## Validation gates (run at build time and in CI; loading unvalidated content is impossible)

**Schema validity** — every file parses against its Zod schema; unknown fields are errors
(catches typos like `wieght`).

**Referential integrity** — every cross-reference resolves: activity→skill, activity
inputs/outputs→items, settlement→activities/npc-profile, route→settlements, npc entry→items.

**World integrity** (content unit tests, Principle I applied to data):

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
   terms (New World / Ironwood / Melvor item and place names) to enforce FR-024 mechanically.

## Authoring rules

- All text original (FR-024). Structure may follow genre conventions; expression may not (R12).
- Numbers are tuned against pacing targets (SC-006/007, idle pacing assumptions), not copied.
- IDs are immutable once shipped (saves reference them). Renames keep the id, change the name.
- Removing content that live saves may reference requires a content migration note and a
  deprecation path (engine treats unknown-but-referenced ids as inert legacy items).
