# Feature Specification: Idle Auto Combat

**Feature Branch**: `002-idle-auto-combat`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "Combat is an important part and we will convert action-based
combat to UI based autoable combat."

## Vision Summary

Combat joins Tradewright as a fourth pillar alongside skilling, markets, and caravans —
re-imagined from the inspiration games' action combat into **UI-based, fully autoable combat**
that fits the idle loop. There is no aiming, dodging, or reflex input anywhere: the player makes
strategic choices (where to fight, what gear to wear, what supplies to bring, when to retreat),
assigns their character to an expedition, and combat resolves automatically in real time and
offline — visualized as UI panels: health bars, hit ticks, a combat log, and numbers.

Combat is deliberately wired into the economy rather than beside it: gear and consumables are
crafted goods (new demand for crafters), fighting consumes supplies and wears gear down (coin
and item sinks), and enemies drop combat-exclusive materials that recipes need (new supply for
markets and caravans). A fighter is a third viable playstyle next to producer and hauler.

This revises spec 001's scope boundary: 001 excluded combat entirely. **Action-based / real-time
dexterity gameplay remains permanently excluded**; combat itself is now in scope in this
UI-based, autoable form.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fight Automatically (Priority: P1)

A player opens the hunting grounds available near their settlement, picks an enemy appropriate
to their combat skill tier, and starts an expedition. Their character fights automatically:
attack ticks land on a visible timer, both sides' health bars move, a combat log narrates, and
each defeated enemy grants combat experience and rolls loot. The player can watch, navigate
away, or close the app — fighting continues either way.

**Why this priority**: The auto-battle loop is the irreducible core of combat; nothing else in
this spec matters until a fight can run itself and pay out XP and loot.

**Independent Test**: With a starter character and default gear, start an expedition against a
tier-1 enemy and verify defeats, XP gain, and loot accrual occur at the rates the enemy
definition states, with zero player input after start.

**Acceptance Scenarios**:

1. **Given** a character at a settlement with hunting grounds, **When** the player views the
   grounds, **Then** they see the enemy roster with tier, difficulty relative to their stats,
   and the loot table summary for each enemy.
2. **Given** a selected enemy and confirmed expedition, **When** combat begins, **Then** attack
   ticks resolve on stated intervals using character and enemy stats only — no player input —
   and the combat log records every meaningful event.
3. **Given** a defeated enemy, **When** the kill completes, **Then** combat XP is granted, loot
   rolls are added to the expedition's haul, and the next enemy engages automatically.
4. **Given** an active expedition, **When** the player navigates elsewhere in the app (market,
   skills), **Then** combat continues unaffected and a compact status indicator remains
   visible.
5. **Given** an active expedition, **When** the player assigns a non-combat activity, **Then**
   the game asks for confirmation and ends the expedition exactly as a manual recall would
   (haul banked per Story 4 rules).

---

### User Story 2 - Equip and Provision (Priority: P2)

Before fighting, a player assembles a loadout: crafted or market-bought gear in equipment slots,
plus provisions (food and remedies) that are consumed automatically during combat to restore
health. Better gear and provisions let the character fight higher-tier enemies and stay out
longer.

**Why this priority**: The loadout is what connects combat to the economy — gear and provisions
are crafted goods with market prices — and it is the main strategic decision space.

**Independent Test**: Equip two different gear sets against the same enemy and verify the
stronger set measurably improves outcomes (faster kills, less damage taken); verify provisions
auto-consume at the defined health threshold.

**Acceptance Scenarios**:

1. **Given** gear items in local storage, **When** the player opens the loadout screen, **Then**
   they can equip items into defined slots, see resulting stat totals, and see a fitness hint
   against their selected enemy tier.
2. **Given** an equipped loadout with provisions packed, **When** combat damage drops health
   below the auto-consume threshold, **Then** a provision is consumed automatically and health
   restores per its definition; the consumption appears in the combat log.
3. **Given** gear in use, **When** expeditions complete, **Then** gear durability decreases per
   the stated wear rate; gear at zero durability stops granting stats until repaired (repair
   costs coin and/or materials).
4. **Given** provisions run out mid-expedition, **When** the next threshold trigger occurs,
   **Then** no restore happens, the log notes supplies exhausted, and the retreat rule
   (Story 4) governs what follows.
5. **Given** any gear or provision item, **When** the player inspects it, **Then** its stats,
   tier, durability, and weight are visible — and it is tradable on settlement markets and
   shippable by caravan like any other item.

---

### User Story 3 - Expeditions Run Offline (Priority: P3)

A player provisions a long expedition, closes the app, and returns hours later to a summary:
enemies defeated, XP and levels gained, loot hauled, provisions consumed, durability lost, and —
if the expedition ended early — when and why (supplies exhausted or retreat threshold reached).

**Why this priority**: "Autoable" must include offline, or combat is second-class against the
established idle loop.

**Independent Test**: Start an expedition, advance time past the point where provisions run
out, reopen, and verify the summary's kill count, loot, and end-time match the deterministic
expectation for that loadout and enemy.

**Acceptance Scenarios**:

1. **Given** an active expedition and a closed app, **When** the player returns within the
   offline cap, **Then** the return summary reports defeats, XP, loot, consumption, durability,
   and any early end — identical to what continuous online play would have produced.
2. **Given** an expedition that ended offline (supplies exhausted or retreat), **When** the
   player returns, **Then** the character is safely back at the settlement with the haul
   banked to local storage, and idle time after the end is reported.
3. **Given** the offline cap is reached mid-expedition, **When** the player returns, **Then**
   progress accrues to the cap exactly as the established offline rules dictate.

---

### User Story 4 - Risk Without Ruin (Priority: P4)

Combat is risky but never ruinous. The player sets a retreat threshold (e.g., retreat when
health falls below 30% with no provisions left). If the character would be overwhelmed, they
retreat automatically: the expedition ends, the haul is kept, gear takes an extra durability
hit, and the character returns to the settlement after a short recovery. There is no death, no
item loss from storage, and no permanent setback.

**Why this priority**: The risk rules make tier-pushing a meaningful choice while keeping the
game's calm, no-ruin idle character. They gate how players engage higher-tier content.

**Independent Test**: Send an under-geared character against a too-strong enemy and verify
retreat triggers at the configured threshold, the haul is retained, the durability penalty
applies, and a recovery timer runs before the next expedition.

**Acceptance Scenarios**:

1. **Given** a configured retreat threshold, **When** health crosses it and no provision can
   restore, **Then** the character retreats automatically, the expedition ends, and the haul
   banks to settlement storage in full.
2. **Given** a retreat, **When** the player views the result, **Then** the summary states the
   cause, the extra durability cost, and the recovery time remaining before the next
   expedition can start.
3. **Given** any combat outcome whatsoever, **Then** items in settlement storage, equipped gear
   (beyond durability), coin, and skill progress are never lost — verified as an invariant.
4. **Given** a recovering character, **When** the player tries to start an expedition, **Then**
   the game shows remaining recovery time; non-combat activities are available immediately.

---

### User Story 5 - Loot Feeds the Economy (Priority: P5)

Combat drops include materials that gathering cannot produce — hides, trophies, essences (all
names original). Crafting recipes for gear, provisions, and select high-tier goods require
them, so fighters sell into settlement markets, crafters buy, and price differences between
settlements (different hunting grounds drop different materials) create new caravan routes.

**Why this priority**: This story is why combat belongs in Tradewright at all — it closes the
loop between the new pillar and the existing economy.

**Independent Test**: Verify combat-exclusive materials appear in drop tables, are required by
crafting recipes, are tradable and haulable, and that at least one profitable fighter→market
loop exists at tier 1.

**Acceptance Scenarios**:

1. **Given** the launch content set, **When** drop tables are audited, **Then** each hunting
   ground yields at least one combat-exclusive material, and hunting grounds in different
   regions yield different materials.
2. **Given** combat materials in storage, **When** the player visits the trading post or loads
   a caravan, **Then** the materials behave like any tradable good (orders, escrow, weight,
   taxes).
3. **Given** the recipe set, **When** audited, **Then** gear and provision recipes consume
   combat materials alongside gathered/refined goods, making fighters and producers mutually
   dependent.

---

### Edge Cases

- Expedition running when offline cap hits → standard cap behavior; expedition state preserved.
- Provisions exhausted exactly as a kill completes → haul includes that kill; retreat rules
  evaluate after.
- Player travels (caravan/personal) — character cannot travel while on expedition; expedition
  must end first (confirmation required).
- Gear breaks (0 durability) mid-expedition → stats drop immediately; log notes it; retreat
  threshold may trigger as a result.
- Retreat threshold set to 0% → character fights until provisions are gone, then retreats at
  the point of being overwhelmed; still no death state.
- Enemy roster at a settlement is above the player's tier → grounds visible, enemies shown as
  locked with the tier required (consistent with recipe tier-gating).
- Two devices, one account → single authoritative expedition state, as with all other systems.
- Offline summary and combat both pending → one unified return summary, combat section included.

## Requirements *(mandatory)*

### Functional Requirements

**Combat Model**

- **FR-101**: Combat MUST resolve automatically from character stats, equipped gear, provisions,
  and enemy definitions — with no real-time player input, reflex, or dexterity mechanic anywhere.
- **FR-102**: Combat MUST be presented entirely through UI elements (bars, ticks, logs, numbers)
  — no 3D, no animation-dependent gameplay.
- **FR-103**: Combat skills MUST follow the established skill structure: XP curves, levels, and
  tiers that gate enemy rosters and gear, consistent with spec 001 FR-015.
- **FR-104**: An expedition MUST occupy the character's single activity slot (001 FR-010);
  combat and non-combat activities are mutually exclusive and switching requires confirmation.
- **FR-105**: Expeditions MUST run identically online and offline up to the offline cap, using
  the same accrual rules as all other activities (001 FR-013), and end states reached offline
  (supplies exhausted, retreat) MUST resolve exactly as they would online.
- **FR-106**: Combat outcomes MUST be reproducible: the same character, loadout, enemy, and
  starting conditions produce the same expedition result (no hidden nondeterminism a player
  could re-roll by reloading).

**Enemies & Hunting Grounds**

- **FR-110**: Each settlement region MUST offer hunting grounds with an enemy roster; rosters
  differ by region (asymmetry, parallel to 001 FR-030).
- **FR-111**: Each enemy MUST define tier, combat stats, XP award, and a drop table with stated
  drop chances; players MUST be able to view all of this before engaging.
- **FR-112**: Enemy tiers MUST gate engagement by combat skill tier; locked enemies are visible
  with unlock requirements shown.

**Gear & Provisions**

- **FR-120**: Gear MUST occupy defined equipment slots, carry stats, tier, weight, and
  durability, and MUST be craftable via existing crafting skills and/or tradable on markets.
- **FR-121**: Provisions (food/remedies) MUST auto-consume during combat per player-configured
  thresholds and MUST be craftable goods.
- **FR-122**: Durability MUST decrease with combat use; depleted gear grants no stats until
  repaired; repair MUST cost coin and/or materials (economy sink).
- **FR-123**: All combat items MUST be ordinary economy items: storable per settlement,
  escrowable in orders, shippable by caravan with weight (001 FR-020/022).

**Risk & Recovery**

- **FR-130**: There MUST be no death, permadeath, or loss of stored items, coin, equipped gear
  (beyond durability), or skill progress from any combat outcome.
- **FR-131**: Players MUST be able to configure a retreat threshold per expedition; automatic
  retreat MUST trigger at the threshold (or on supply exhaustion + overwhelm) and bank the full
  haul.
- **FR-132**: Retreat MUST impose its stated costs only: extra durability wear and a short
  recovery period blocking further expeditions (non-combat play unaffected).

**Economy Integration**

- **FR-140**: Drop tables MUST include combat-exclusive materials; the launch recipe set MUST
  require combat materials in gear, provision, and selected high-tier recipes so that fighters
  and producers depend on each other.
- **FR-141**: Combat material availability MUST differ by region so inter-settlement price
  differences and caravan arbitrage extend to combat goods.
- **FR-142**: All combat-driven economic mutations (loot gains, repair costs, provision
  consumption, durability loss) MUST appear in the transaction/audit log (001 FR-052).

**Content & Presentation**

- **FR-150**: All combat content (skills, enemies, grounds, drop tables, gear, provisions) MUST
  be original to Tradewright and authored as content data, editable without code changes
  (001 FR-024); structure may follow genre conventions, expression may not.
- **FR-151**: All combat screens MUST meet the established phone-first and
  immediate-responsiveness standards (001 FR-060–062); starting, monitoring, and recalling an
  expedition never blocks on anything.

### Key Entities

- **Combat Skill(s)**: Progression tracks in the established skill structure (e.g., an offense
  and a vitality track — exact set is a content decision) whose tiers gate enemies and gear.
- **Enemy**: Authored definition — tier, stats (health, damage, attack interval, defense), XP
  award, drop table.
- **Hunting Ground**: A region-bound roster of enemies available from a settlement.
- **Expedition**: The runtime combat assignment — character, target enemy/ground, loadout
  snapshot, provisions, retreat threshold, accumulated haul, state
  (`fighting → ended(reason) → recovered`).
- **Gear Item**: Equippable economy item with slot, stats, tier, weight, durability.
- **Provision**: Consumable economy item with restore amount and auto-consume rules.
- **Drop Table**: Per-enemy loot definition with materials (some combat-exclusive) and chances.
- **Loadout**: The set of equipped gear + packed provisions + thresholds for an expedition.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-101**: A player with a ready loadout can go from hunting-grounds screen to a running
  expedition in at most 4 inputs and under 30 seconds.
- **SC-102**: An expedition runs indefinitely (until supplies/retreat/cap end it) with zero
  player input after start — verified for 100% of enemy types at launch.
- **SC-103**: Offline expedition results match online results exactly for identical conditions
  in 100% of audited cases (parity with the established offline guarantee).
- **SC-104**: No combat outcome can reduce a player's stored items, coin, equipped gear (beyond
  stated durability wear), or skill progress — 0 violations in audit (extends 001 SC-010).
- **SC-105**: Economy integration is real: at launch, at least 20% of crafting recipes require
  a combat-exclusive material, and every hunting region's materials are demanded by at least
  one recipe.
- **SC-106**: Fighter viability: a combat-focused player earns coin (via loot sales) at a rate
  within ±50% of production- or hauling-focused play at equivalent investment (extends 001
  SC-007 to three playstyles).
- **SC-107**: Strategic depth without input: across launch tiers, the best-fit loadout for an
  enemy improves expedition yield by at least 25% over a naive same-tier loadout — gear choice
  must matter.
- **SC-108**: All combat screens pass the established phone-portrait usability bar (001
  SC-009).

## Scope Boundaries

**In scope**: auto-resolving PvE expeditions; combat skills/tiers; enemies, hunting grounds,
drop tables; gear with durability and repair; provisions with auto-consume; retreat/recovery
rules; offline expeditions; combat-material economy integration; phone-first combat UI.

**Out of scope (this spec)**:

- PvP combat of any kind (no player-vs-player damage anywhere).
- Real-time player input during combat — permanently excluded by design (the 001 exclusion of
  action gameplay stands; only its blanket exclusion of combat is superseded).
- Group/party combat, raids, or multiplayer expeditions (future consideration).
- Combat's role in Phase 2 territory contests (stays economic per 001; any change is a Phase 2
  spec decision).
- Pets, mercenaries, or multiple simultaneous expeditions per character.

## Assumptions

- **Combat occupies the one activity slot**: fighting competes with gathering/refining/crafting
  for character time, preserving the idle design's central trade-off. (Alternative — parallel
  combat — was rejected as it would invalidate the one-activity pacing model.)
- **No-death model**: defeat = automatic retreat with haul kept, extra durability wear, short
  recovery. Chosen to match the game's calm idle character; harsher penalties are content-level
  tuning later if needed.
- **Determinism**: reproducible outcomes (FR-106) imply seeded randomness consistent with the
  established offline-parity guarantee; loot chance still *feels* random across expeditions.
- **Skill set**: 2–3 combat skills at launch (content decision), following the structural
  conventions of the existing seven.
- **Recovery duration**: minutes, not hours — a pacing speed bump, not a punishment. Content-
  tunable.
- **Spec 001 amendment**: 001's "combat excluded permanently" scope line is superseded by this
  spec; 001's exclusion of action/dexterity gameplay is unchanged and binding here.
- **Inspiration**: auto-combat structure follows Melvor Idle / Ironwood RPG conventions
  (loadout → assign → auto-resolve → summary); all names, enemies, and lore original (001
  FR-024 applies).
