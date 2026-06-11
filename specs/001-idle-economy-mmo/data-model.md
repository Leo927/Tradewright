# Data Model: Tradewright Phase 1

**Date**: 2026-06-11 | **Plan**: [plan.md](./plan.md)

Two halves: **authored content** (read-only definitions, JSON in `packages/content/data/`,
shapes owned by [contracts/content-schema.md](./contracts/content-schema.md)) and **runtime
state** (mutable world owned by the engine; serialized as the V1 save / V2 database state).
IDs are stable string slugs for content (`item.iron-ore`) and generated IDs for runtime objects.

## Authored Content (definitions)

### SkillDef
| Field | Type | Notes |
|---|---|---|
| id | slug | e.g. `skill.prospecting` |
| name, description | string | original text only (FR-024) |
| family | `gathering \| refining \| crafting \| hauling` | hauling levels via shipments, not activities |
| xpCurve | curve params | per-level XP requirement; shape per R12 |
| tiers | TierDef[] | level threshold per tier; gates activities/recipes |

### ActivityDef
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

### ItemDef
| Field | Type | Notes |
|---|---|---|
| id, name, description | | original text only |
| tier | int | |
| weight | number | drives caravan capacity (FR-020) |
| basePrice | number | NPC equilibrium anchor (R4) |

### RecipeDef
Refining and crafting are ActivityDefs with non-empty `inputs`; "RecipeDef" is the authoring
view of the same record. Integrity rule: the input graph is a DAG and every input item is
producible or gatherable somewhere in the world (content test).

### SettlementDef
| Field | Type | Notes |
|---|---|---|
| id, name, description | | |
| activityTags | string[] | selects locally available ActivityDefs |
| listingFeeRate, salesTaxRate | number | Phase 1 world-defined (FR-034) |
| baseStorageCapacity | number | per-player, expandable (FR-023) |
| npcProfileId | ref NpcMarketProfile | |

### RouteDef
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

### NpcMarketProfile (V1-critical, V2 liquidity bots)
| Field | Type | Notes |
|---|---|---|
| id | slug | |
| entries | NpcItemEntry[] | per tradable item at this settlement |

**NpcItemEntry**: `itemId`, `equilibriumStock`, `productionPerHour`, `consumptionPerHour`,
`priceBounds {min×, max×}` (clamp on pressure curve), `orderBandWidth` (spread around quote),
`orderDepth` (qty per refresh). Semantics per R4.

## Runtime State (mutable)

### PlayerCharacter
| Field | Type | Notes |
|---|---|---|
| id, name | | one per account (FR-001) |
| locationState | `at(settlementId)` \| `traveling{routeId, departAt, arriveAt}` | exactly one (FR-002) |
| wallet | integer coins | never negative; all mutations via Transaction |
| skills | map skillId → {xp, level} | level derived from xp via SkillDef curve |
| assignment | ActivityAssignment? | at most one (FR-010) |
| caravanSlots | int | grows with hauling progression (FR-041) |
| lastSeenAt, rngState | | offline catch-up + determinism (R6/R8) |

### ActivityAssignment
| Field | Type | Notes |
|---|---|---|
| activityId | ref | |
| settlementId | ref | where it runs; must match character location at start |
| startedAt | timestamp | |
| haltedAt, haltReason | optional | `inputs-exhausted \| storage-full \| travel \| replaced` (FR-016) |

**Transitions**: `idle → active` (assign; requires location, tier, inputs available) →
`halted` (engine-detected, atomic, no partial actions) or `replaced/stopped` (player, after
confirmation). Travel forces `halted(travel)`.

### SettlementStorage (per player × settlement)
| Field | Type | Notes |
|---|---|---|
| settlementId, characterId | | |
| slots | map itemId → qty | items live in exactly ONE storage/escrow/caravan (FR-022) |
| capacityUsed / capacity | number | activity halts when output won't fit (FR-016) |

### MarketOrder
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
in buyer's local storage.

### Trade
Immutable record: `{id, settlementId, itemId, qty, unitPrice, buyerId, sellerId, taxPaid,
executedAt}`. Feeds price history (FR-035) and transaction log (FR-052).

### CaravanShipment
| Field | Type | Notes |
|---|---|---|
| id, ownerId, routeId | | |
| from, to | settlementIds | |
| manifest | {itemId, qty}[] | total weight ≤ capacity (FR-041) |
| departAt, arriveAt | | real-time timer, independent of assignment (FR-042) |
| mitigationPurchased | bool | |
| riskOutcome | `pending → none \| loss{items}` | rolled once, from state RNG (FR-043, R6) |
| status | `in-transit → delivered` | delivery deposits into destination storage |

### NpcMarketState (per settlement × item; V1)
`{currentStock, lastTickAt, currentQuote}` — evolves per R4; NPC orders appear as MarketOrders
owned by a reserved NPC principal.

### Transaction (audit log, FR-052)
Append-only: `{id, characterId, kind, delta, balanceAfter, refId, at}` where kind ∈
`trade-buy/sell, listing-fee, sales-tax, dispatch-cost, mitigation, caravan-loss, production,
consumption, starter-grant`.

### EventSummary (offline/return summary, FR-014)
Accumulated during catch-up: actions completed, items produced/consumed, xp/levels per skill,
halts (when/why), caravan arrivals, order fills/expiries, net coin change. Cleared on
acknowledgement.

### SaveGame (V1) / WorldState (V2 row set)
`{formatVersion, contentVersion, character, storages[], orders[], trades[], shipments[],
npcStates[], transactions[], pendingSummary, clockMarks}` — Zod-validated on load; migrations
keyed on formatVersion (R7).

## Cross-cutting invariants

1. **Conservation**: no engine operation creates or destroys items/coin except authored
   production/consumption, fees/taxes (sinks), and caravan risk losses — each leaves a
   Transaction. Audited by property-based engine tests (SC-010).
2. **Locality**: an item is in exactly one of {storage, sell-escrow, caravan manifest} and is
   usable only at its location (FR-022); markets never match across settlements (FR-031).
3. **Single assignment**: a character has ≤ 1 active ActivityAssignment; travel and assignment
   are mutually exclusive (FR-010/044).
4. **Determinism**: identical (SaveGame, content, elapsed ticks) ⇒ identical state; all
   randomness flows from `rngState` (R6).
5. **Tier gates**: assignment/craft requires SkillDef tier ≤ character level-derived tier;
   locked content is visible but inert (FR-015).
