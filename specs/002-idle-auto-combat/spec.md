# Feature Specification: Idle Auto Combat

**Feature Branch**: `002-idle-auto-combat`

**Created**: 2026-06-11 (revised same day: active abilities, magic, and mastery/perk trees kept)

**Status**: Draft

**Input**: User description: "Combat is an important part and we will convert action-based
combat to UI based autoable combat. New World classes have active skill/magic/action and
skill/perk tree — keep that part too. Just rip out anything that's action-based."

## Vision Summary

Combat joins Tradewright as a fourth pillar alongside skilling, markets, and caravans — carrying
over the **full build depth of New World's combat systems** (combat schools with active
abilities and magic, weapon mastery progression, perk trees with meaningful choices) while
**ripping out everything action-based** (aiming, dodging, movement, reflex timing).

The translation rule: **every decision survives, every execution is automated.** Players choose
a combat school (weapon or magic style), unlock and slot active abilities, spend mastery points
in perk trees, assemble gear and provisions, and write simple tactics rules ("open with X, keep
Y on cooldown, heal under 40% health"). The expedition then executes that build automatically —
abilities fire per the tactics, visualized as UI panels: health bars, cast ticks, cooldown
timers, buffs/debuffs, and a combat log. Watching live, a player may tap a ready ability to
trigger it manually; automation must always be expressive enough that hands-off play loses
nothing strategically. Offline, tactics run the show.

Combat has **two control modes**. **Auto mode** is the default described above: the tactics AI
runs everything, online or offline — this is how all farmable content (hunting grounds) plays.
**Active mode** is live tactical control for designated challenge content (boss fights,
dungeons, and the other formats specified in spec 003): the player drives the fight in real
time — tapping abilities, provisions, and stance choices against boss mechanics — still with
zero aiming, dodging, or reflex input; it is decision-making under time pressure, not
execution skill. The simple auto AI remains available inside active encounters to cover easy
stretches or a player who steps away. Challenge content is where active play may legitimately
outperform automation; everyday content never requires it.

Combat stays wired into the economy: gear and provisions are crafted goods, durability and
repairs are sinks, respecs cost coin, and enemies drop combat-exclusive materials that recipes
need. A fighter is a third viable playstyle next to producer and hauler.

This revises spec 001's scope boundary: 001 excluded combat entirely. **Action-based /
real-time dexterity gameplay remains permanently excluded**; combat itself — with its full
build-craft depth — is now in scope in this UI-based, autoable form.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fight Automatically (Priority: P1)

A player opens the hunting grounds near their settlement, picks an enemy appropriate to their
tier, and starts an expedition. Their character fights automatically: basic attacks and slotted
abilities resolve on visible timers per the player's tactics, both sides' health bars move,
buffs/debuffs and cooldowns are displayed, and a combat log narrates. Each defeated enemy
grants experience and rolls loot. The player can watch, navigate away, or close the app —
fighting continues either way.

**Why this priority**: The auto-battle loop is the irreducible core; nothing else in this spec
matters until a fight can run itself, execute a build, and pay out XP and loot.

**Independent Test**: With a starter character, default school, and default tactics, start an
expedition against a tier-1 enemy and verify kills, XP, and loot accrue at the rates the enemy
and ability definitions predict, with zero player input after start.

**Acceptance Scenarios**:

1. **Given** a character at a settlement with hunting grounds, **When** the player views the
   grounds, **Then** they see the enemy roster with tier, difficulty relative to their build,
   and each enemy's loot table summary.
2. **Given** a confirmed expedition, **When** combat begins, **Then** basic attacks and slotted
   abilities resolve on stated intervals/cooldowns driven by stats, build, and tactics — no
   player input — and the combat log records every cast, hit, heal, buff, and trigger.
3. **Given** a defeated enemy, **When** the kill completes, **Then** XP (combat skill and school
   mastery) is granted, loot rolls join the expedition haul, and the next enemy engages
   automatically.
4. **Given** an active expedition, **When** the player navigates elsewhere in the app, **Then**
   combat continues unaffected and a compact status indicator stays visible.
5. **Given** an active expedition being watched live, **When** the player taps a ready ability,
   **Then** it casts immediately (manual override); abilities on cooldown show remaining time
   and cannot be forced.

---

### User Story 2 - Build a Combat School: Abilities and Magic (Priority: P2)

A player adopts a combat school — a weapon discipline or a magic school (all original to
Tradewright) — levels its mastery by fighting with it, unlocks its active abilities (strikes,
spells, heals, buffs, debuffs), and slots a limited set of them for expeditions. Magic schools
are full peers of weapon schools: same structure, different flavor and effect mix.

**Why this priority**: Active abilities are the heart of the kept New World depth — they turn
"my character fights" into "my build fights," and they are what tactics (Story 3) and trees
(Story 4) operate on.

**Independent Test**: Level a school to its first ability unlock, slot the ability, and verify
it fires in combat per its definition (cooldown, effect, log entry); verify an empty-slot build
fights with basic attacks only.

**Acceptance Scenarios**:

1. **Given** the launch content, **When** a player browses combat schools, **Then** at least
   one weapon school and one magic school are available, each with its own mastery track,
   ability roster, and perk trees.
2. **Given** fighting with a school equipped, **When** mastery XP accumulates, **Then** the
   school's mastery level rises on its stated curve, independent of other schools' progress.
3. **Given** an unlocked active ability, **When** the player edits their loadout, **Then** they
   can slot it into one of the limited ability slots (3 at launch) and see its cooldown,
   effect, and any synergy notes.
4. **Given** a slotted ability in combat, **When** its tactics condition is met and it is off
   cooldown, **Then** it casts automatically with its defined effect (damage, heal over time,
   buff, debuff, etc.) and enters cooldown.
5. **Given** a player who switches schools, **When** they equip a different school's weapon/
   focus, **Then** that school's abilities and trees apply; the previous school's mastery is
   retained for later return.

---

### User Story 3 - Write Tactics, Not Reflexes (Priority: P3)

A player configures how their build executes: ability priority order and trigger rules from a
curated set of conditions ("on cooldown", "health below X%", "enemy health above/below Y%",
"buff missing", "at expedition start"), plus provision thresholds and the retreat threshold.
Sensible defaults exist so a new player never has to touch tactics; an invested player tunes
them to squeeze out more.

**Why this priority**: Tactics are the replacement for action-based execution — the strategic
layer that makes hands-off combat feel authored rather than random. They depend on abilities
existing (Story 2).

**Independent Test**: Configure two different tactics sets over the same build and enemy and
verify combat logs show rule-conformant, materially different execution; verify defaults are
applied when nothing is configured.

**Acceptance Scenarios**:

1. **Given** a loadout with slotted abilities, **When** the player opens tactics, **Then** each
   ability has a priority position and a trigger rule chosen from the defined condition set,
   pre-filled with the school's default rotation.
2. **Given** configured tactics, **When** an expedition runs (online or offline), **Then** every
   cast in the log is explainable by the rules: highest-priority ability whose trigger is
   satisfied and cooldown is ready casts first.
3. **Given** any strategy a player could execute by manually tapping ready abilities, **When**
   expressed as tactics rules, **Then** the automated execution achieves it — the condition set
   is expressive enough that manual play is a convenience, never an advantage class.
4. **Given** a tactics change mid-expedition, **When** saved, **Then** it takes effect from the
   next combat tick without restarting the expedition.

---

### User Story 4 - Spend Points in Perk Trees (Priority: P4)

Leveling a school's mastery awards points to spend in that school's perk trees — branching
trees of passives (stat boosts, ability modifiers, conditional effects) and active-ability
unlocks, structurally modeled on New World's two-tree weapon masteries. Builds diverge: two
players with the same school can fight very differently. A respec is available for a coin cost.

**Why this priority**: Trees are the long-term chase and the second half of the kept New World
depth; they need schools (Story 2) and benefit from tactics (Story 3) to express their results.

**Independent Test**: Spend points down one branch, verify the passives apply to combat math
and any unlocked active becomes slottable; respec, rebuild down the other branch, and verify
the previous effects are fully removed and the coin cost was charged.

**Acceptance Scenarios**:

1. **Given** a mastery level-up that awards a point, **When** the player opens the school's
   trees, **Then** they see two branches with node prerequisites, each node stating its exact
   effect; affordable nodes are highlighted.
2. **Given** a spent point on a passive node, **When** the next combat tick resolves, **Then**
   the passive's effect is applied and visible in the combat math (e.g., stated % change in the
   relevant stat or ability behavior).
3. **Given** a tree node that unlocks an active ability, **When** purchased, **Then** the
   ability joins the school's slottable roster (Story 2 rules apply).
4. **Given** a respec request, **When** confirmed and the coin cost paid, **Then** all points
   return, all tree effects are removed, and the build can be re-spent immediately; slotted
   abilities that are no longer unlocked are unslotted with a clear notice.
5. **Given** total points at launch content limits, **When** audited, **Then** points are
   scarce enough that one school cannot fill both branches — choices are real.

---

### User Story 5 - Equip and Provision (Priority: P5)

Before fighting, a player assembles the material half of the loadout: crafted or market-bought
gear in equipment slots (including the school's weapon or magic focus), plus provisions (food
and remedies) that auto-consume per thresholds. Gear may carry perk modifiers that interact
with school builds. Better gear and provisions enable higher-tier enemies and longer
expeditions.

**Why this priority**: The loadout connects combat to the economy — gear and provisions are
crafted goods with market prices — but a default kit lets Stories 1–4 function before this
story is rich.

**Independent Test**: Equip two gear sets against the same enemy and verify the stronger set
measurably improves outcomes; verify provisions auto-consume at thresholds; verify a gear perk
changes the stated combat behavior.

**Acceptance Scenarios**:

1. **Given** gear in local storage, **When** the player opens the loadout, **Then** they can
   equip slots (weapon/focus, armor pieces, trinket), see stat totals, and a fitness hint
   against the selected enemy tier.
2. **Given** combat damage below the auto-consume threshold, **When** the next tick resolves,
   **Then** a provision is consumed and health restores per its definition, logged.
3. **Given** gear in use, **When** expeditions complete, **Then** durability decreases per the
   stated wear rate; zero-durability gear grants no stats or perks until repaired (coin and/or
   materials).
4. **Given** a gear item with a perk modifier, **When** equipped, **Then** the perk's stated
   interaction (e.g., modifies an ability or stat) applies and shows in the combat log/math.
5. **Given** any gear or provision item, **When** inspected, **Then** stats, tier, perks,
   durability, and weight are visible — and it trades, escrows, and ships like any economy
   item.

---

### User Story 6 - Expeditions Run Offline (Priority: P6)

A player provisions a long expedition, closes the app, and returns hours later to a summary:
enemies defeated, XP and mastery gained, points earned, loot hauled, provisions consumed,
durability lost, and — if the expedition ended early — when and why. Tactics rules execute
offline exactly as online.

**Why this priority**: "Autoable" must include offline, or combat is second-class against the
established idle loop.

**Independent Test**: Start an expedition, advance time past provision exhaustion, reopen, and
verify the summary's kill count, casts, loot, and end-time match the deterministic expectation
for that build and tactics.

**Acceptance Scenarios**:

1. **Given** an active expedition and a closed app, **When** the player returns within the
   offline cap, **Then** the return summary reports defeats, XP/mastery/points, loot,
   consumption, durability, and any early end — identical to continuous online play with the
   same tactics.
2. **Given** an expedition that ended offline, **When** the player returns, **Then** the
   character is back at the settlement with the haul banked, and idle time after the end is
   reported.
3. **Given** the offline cap is reached mid-expedition, **Then** progress accrues to the cap
   exactly as the established offline rules dictate.

---

### User Story 7 - Risk Without Ruin (Priority: P7)

Combat is risky but never ruinous. If the character would be overwhelmed (retreat threshold
crossed, no provisions left), they retreat automatically: the expedition ends, the haul is
kept, gear takes an extra durability hit, and a short recovery timer runs. No death, no item
loss from storage, no lost progression.

**Why this priority**: Risk rules make tier-pushing meaningful while keeping the game's calm
idle character.

**Independent Test**: Send an under-built character against a too-strong enemy and verify
retreat triggers at the configured threshold, the haul is retained, the durability penalty
applies, and recovery gates the next expedition only.

**Acceptance Scenarios**:

1. **Given** a configured retreat threshold, **When** health crosses it and no provision can
   restore, **Then** automatic retreat ends the expedition and banks the full haul.
2. **Given** a retreat, **When** the player views the result, **Then** the summary states the
   cause, the durability cost, and recovery time remaining.
3. **Given** any combat outcome whatsoever, **Then** stored items, coin, equipped gear (beyond
   durability), skill/mastery progress, and spent tree points are never lost — an invariant.
4. **Given** a recovering character, **When** an expedition is attempted, **Then** remaining
   recovery time is shown; non-combat activities are available immediately.

---

### User Story 8 - Loot Feeds the Economy (Priority: P8)

Combat drops include materials gathering cannot produce. Recipes for gear, provisions, and
select high-tier goods require them; different regions' hunting grounds drop different
materials, extending settlement price differences and caravan arbitrage to combat goods.

**Why this priority**: This story is why combat belongs in Tradewright — it closes the loop
between the new pillar and the existing economy.

**Independent Test**: Verify combat-exclusive materials appear in drop tables, are required by
recipes, trade and ship normally, and at least one profitable fighter→market loop exists at
tier 1.

**Acceptance Scenarios**:

1. **Given** the launch content, **When** drop tables are audited, **Then** each hunting ground
   yields at least one combat-exclusive material and regions yield different materials.
2. **Given** combat materials in storage, **When** trading or hauling, **Then** they behave
   like any tradable good (orders, escrow, weight, taxes).
3. **Given** the recipe set, **When** audited, **Then** gear and provision recipes consume
   combat materials alongside gathered/refined goods — fighters and producers are mutually
   dependent.

---

### Edge Cases

- Expedition running when the offline cap hits → standard cap behavior; expedition state
  preserved.
- Provisions exhausted exactly as a kill completes → haul includes that kill; retreat rules
  evaluate after.
- Character cannot travel (caravan or personal) while on expedition; ending it first requires
  confirmation.
- Gear breaks (0 durability) mid-expedition → stats and perks drop immediately; log notes it;
  retreat may trigger as a consequence.
- Respec while an expedition is active → blocked; tactics edits are allowed, build edits
  (trees, gear, slotted abilities) require ending the expedition.
- Tactics that reference an ability that became unslotted (post-respec) → rule is inert and
  flagged in the tactics editor, never an error mid-combat.
- Retreat threshold set to 0% → character fights until overwhelmed with no supplies; still no
  death state.
- Conflicting triggers in the same tick (two abilities ready, conditions met) → priority order
  decides, deterministically.
- Enemy roster above the player's tier → visible but locked with requirements shown.
- Two devices, one account → single authoritative expedition state.
- Combat summary and general offline summary both pending → one unified return summary.

## Requirements *(mandatory)*

### Functional Requirements

**Combat Model**

- **FR-101**: Combat MUST resolve automatically from character stats, school build (abilities,
  tree perks), gear, provisions, tactics rules, and enemy definitions — with no required
  real-time player input and no reflex, aiming, dodging, or movement mechanic anywhere.
- **FR-102**: Combat MUST be presented entirely through UI elements (bars, ticks, cooldown
  timers, buff/debuff indicators, logs, numbers) — no 3D, no animation-dependent gameplay.
- **FR-103**: Combat skills MUST follow the established skill structure (XP curves, levels,
  tiers gating enemies and gear), consistent with 001 FR-015.
- **FR-104**: An expedition MUST occupy the character's single activity slot (001 FR-010);
  switching to any other activity requires confirmation and ends the expedition normally.
- **FR-105**: Expeditions MUST run identically online and offline up to the offline cap (001
  FR-013), including ability casts per tactics; end states reached offline resolve exactly as
  online.
- **FR-106**: Combat outcomes MUST be reproducible: identical character, build, tactics, enemy,
  and starting conditions produce identical expedition results — no reload-to-reroll.

**Enemies & Hunting Grounds**

- **FR-110**: Each settlement region MUST offer hunting grounds with an enemy roster; rosters
  differ by region (asymmetry, parallel to 001 FR-030).
- **FR-111**: Each enemy MUST define tier, combat stats, behaviors (e.g., its own ability-like
  actions on timers), XP award, and a drop table with stated chances — all viewable before
  engaging.
- **FR-112**: Enemy tiers MUST gate engagement by combat skill tier; locked enemies show their
  unlock requirements.

**Combat Schools, Active Abilities & Magic**

- **FR-160**: The game MUST provide multiple combat schools — weapon disciplines and magic
  schools as structural peers — each with its own mastery track, ability roster, and perk
  trees. Launch minimum: 2 schools, at least one of them magic-flavored.
- **FR-161**: Each school MUST define active abilities with: cooldown, effect (damage, heal,
  damage-over-time, buff, debuff, shield — effect vocabulary defined in content), magnitude
  scaling from stats/mastery, and unlock source (mastery level or tree node).
- **FR-162**: Players MUST slot a limited number of active abilities (3 slots at launch) for an
  expedition; unslotted abilities do not participate.
- **FR-163**: School mastery MUST level independently per school from XP earned fighting with
  that school; switching schools preserves all masteries.
- **FR-164**: While spectating live combat, the player MAY manually trigger a ready ability
  (tap-to-cast); manual triggering MUST never be required and MUST confer no advantage that
  cannot be expressed in tactics rules (FR-166).
- **FR-165**: Basic attack MUST exist for every school so an ability-less build still fights.

**Tactics (Automated Execution Rules)**

- **FR-166**: Players MUST be able to configure, per expedition loadout: ability priority order
  and per-ability trigger conditions from a defined condition set (at minimum: on-cooldown/
  always, own-health thresholds, enemy-health thresholds, buff/debuff presence, expedition
  start). The condition set MUST be expressive enough to encode any strategy achievable by
  manual tap-casting.
- **FR-167**: Every school MUST ship with a default tactics rotation so combat works with zero
  configuration.
- **FR-168**: Tactics execution MUST be deterministic: in any combat tick, the
  highest-priority ability whose trigger is satisfied and whose cooldown is ready casts; ties
  are impossible by construction (strict priority order).
- **FR-169**: Tactics MUST be editable mid-expedition (effective next tick); build elements
  (gear, slotted abilities, tree points) MUST NOT change mid-expedition.

**Mastery & Perk Trees**

- **FR-170**: Each school MUST have two perk-tree branches (structure modeled on New World's
  weapon masteries; all content original) containing passive nodes and active-ability unlock
  nodes with prerequisites.
- **FR-171**: Mastery level-ups MUST award tree points; total available points MUST be scarce
  relative to total node cost so builds require choices (cannot fill both branches).
- **FR-172**: Every node MUST state its exact mechanical effect; spent passives apply to combat
  math immediately and visibly.
- **FR-173**: Respec MUST be available outside expeditions for a coin cost (economy sink),
  refunding all points and cleanly removing all effects; newly invalid slotted abilities or
  tactics rules are unslotted/inert with notice.
- **FR-174**: Gear MAY carry perk modifiers (content-defined) that interact with school
  abilities and passives; equipped gear perks apply only while durability > 0.

**Control Modes (Auto / Active)**

- **FR-180**: All standard hunting-ground content MUST be fully completable in auto mode
  (tactics AI), online and offline; active control is never required for it.
- **FR-181**: Designated challenge content (defined in spec 003: boss fights, dungeons, and
  related formats) MUST support active mode: live, real-time tactical control where the player
  triggers abilities, provisions, and stance choices directly — with no aiming, dodging,
  movement, or reflex mechanics; all inputs are discrete UI choices on visible timers.
- **FR-182**: Within an active-mode encounter, the player MUST be able to toggle the auto AI on
  at any time (per ability or wholesale); the AI runs the configured tactics until the player
  retakes control. Stepping away never voids the encounter — the AI fights on at its level.
- **FR-183**: Active mode MAY outperform the auto AI on challenge content (that is its point);
  the tactics-parity guarantee (FR-166, SC-108) applies to standard autoable content only.
- **FR-184**: Boss-grade enemies in challenge content MUST express difficulty through visible,
  decision-answerable mechanics (phases, telegraphed heavy attacks with reaction windows of
  seconds-not-frames, adds, enrage timers) — never through input dexterity.

**Gear & Provisions**

- **FR-120**: Gear MUST occupy defined equipment slots (including the school's weapon/focus),
  carry stats, tier, weight, durability, and optional perks (FR-174), and MUST be craftable
  via existing crafting skills and/or tradable on markets.
- **FR-121**: Provisions MUST auto-consume during combat per player-configured thresholds and
  MUST be craftable goods.
- **FR-122**: Durability MUST decrease with combat use; depleted gear grants no stats or perks
  until repaired; repair costs coin and/or materials (economy sink).
- **FR-123**: All combat items MUST be ordinary economy items: storable per settlement,
  escrowable, shippable with weight (001 FR-020/022).

**Risk & Recovery**

- **FR-130**: There MUST be no death, permadeath, or loss of stored items, coin, equipped gear
  (beyond durability), skill/mastery progress, or tree points from any combat outcome.
- **FR-131**: Players MUST be able to configure a retreat threshold per expedition; automatic
  retreat triggers at the threshold (or supply exhaustion + overwhelm) and banks the full haul.
- **FR-132**: Retreat MUST impose only its stated costs: extra durability wear and a short
  recovery period blocking further expeditions (non-combat play unaffected).

**Economy Integration**

- **FR-140**: Drop tables MUST include combat-exclusive materials; the launch recipe set MUST
  require combat materials in gear, provision, and selected high-tier recipes.
- **FR-141**: Combat material availability MUST differ by region so price differences and
  caravan arbitrage extend to combat goods.
- **FR-142**: All combat-driven economic mutations (loot, repairs, provision consumption,
  durability, respec fees) MUST appear in the transaction/audit log (001 FR-052).

**Content & Presentation**

- **FR-150**: All combat content (schools, abilities, trees, enemies, grounds, drop tables,
  gear, provisions) MUST be original to Tradewright and authored as content data, editable
  without code changes (001 FR-024); structure may follow genre conventions, expression may
  not.
- **FR-151**: All combat screens MUST meet the established phone-first and
  immediate-responsiveness standards (001 FR-060–062); starting, monitoring, tuning, and
  recalling an expedition never blocks on anything.

### Key Entities

- **Combat School**: A weapon discipline or magic school — mastery track + ability roster +
  two perk-tree branches. Original flavor; New World-class structural depth.
- **Active Ability**: Authored definition — cooldown, effect type, magnitude scaling, unlock
  source; slottable (limited slots) and automatable via tactics.
- **Perk Tree / Node**: Branching progression per school; passive effects and ability unlocks
  with prerequisites and point costs.
- **Mastery**: Per-school level track earning tree points; independent across schools.
- **Tactics**: Ordered ability rules (priority + trigger condition) plus provision and retreat
  thresholds; the player-authored "program" combat executes.
- **Combat Skill(s)**: Character-level combat progression gating enemy tiers and gear
  (established skill structure).
- **Enemy / Hunting Ground / Drop Table**: Authored region-bound rosters with stats, behaviors,
  XP, and loot.
- **Expedition**: Runtime combat assignment — build snapshot (school, abilities, tree state,
  gear, provisions), tactics, haul, state (`fighting → ended(reason) → recovered`).
- **Gear Item / Provision**: Economy items per 001, extended with slots, combat stats, perks,
  durability / restore effects and auto-consume rules.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-101**: A player with a ready loadout goes from hunting-grounds screen to a running
  expedition in at most 4 inputs and under 30 seconds.
- **SC-102**: An expedition runs indefinitely (until supplies/retreat/cap end it) with zero
  player input after start — verified for 100% of launch enemy types, including ability
  rotations.
- **SC-103**: Offline expedition results match online results exactly for identical builds,
  tactics, and conditions in 100% of audited cases.
- **SC-104**: No combat outcome reduces stored items, coin, gear (beyond stated wear),
  progression, or tree points — 0 violations in audit (extends 001 SC-010).
- **SC-105**: Economy integration: at launch ≥ 20% of crafting recipes require a
  combat-exclusive material; every hunting region's materials are demanded by ≥ 1 recipe;
  respec and repair sinks are live.
- **SC-106**: Fighter viability: combat-focused play earns coin within ±50% of production- or
  hauling-focused play at equivalent investment (extends 001 SC-007 to three playstyles).
- **SC-107**: Builds matter: at any launch tier, a well-chosen school/tree/tactics build
  improves expedition yield ≥ 25% over the default build at equal gear — and at least 2
  materially different builds per school sit within 10% of each other (no single solved
  build).
- **SC-108**: Tactics parity on standard content: for every launch hunting-ground enemy, the
  best outcome achievable by live manual tap-casting is reproducible by tactics rules alone
  (0 cases where manual play is strictly required). Designated challenge content (spec 003) is
  explicitly exempt — there, active control may be rewarded.
- **SC-109**: All combat screens pass the established phone-portrait usability bar (001
  SC-009).

## Scope Boundaries

**In scope**: auto-resolving PvE expeditions; combat schools incl. magic with active abilities;
limited ability slots; tactics rules (priority + triggers) with shipped defaults; optional
live tap-to-cast; per-school mastery and two-branch perk trees with scarce points and paid
respec; combat skills/tiers; enemies, hunting grounds, drop tables; gear with stats, perks,
durability, repair; provisions with auto-consume; retreat/recovery; offline expeditions;
combat-material economy integration; phone-first combat UI.

**Out of scope (this spec)**:

- Anything action-based: aiming, dodging, movement, positioning, reflex timing, input-skill
  rewards — permanently excluded by design (001's exclusion of action gameplay stands; only
  its blanket exclusion of combat is superseded).
- PvP combat of any kind (decided 2026-06-11: Tradewright is PvE-only; territory contests stay
  economic).
- Challenge and group combat content — solo boss trials (mettle trials), dungeons, afflicted
  difficulty tiers, raids, invasions, elite zones, world events, world bosses — specified
  separately in
  [spec 003](../003-challenge-group-combat/spec.md), which builds on this spec's control modes
  (FR-180–184).
- Combat's role in Phase 2 territory contests (stays economic per 001 unless a Phase 2 spec
  decides otherwise).
- Pets, mercenaries, or multiple simultaneous expeditions per character.
- Attribute systems and multi-school loadouts (2026-06-11 audit note): the inspiration pairs
  each attribute threshold with both a combat and a trade-skill bonus — a natural cross-pillar
  hook for a game whose whole thesis is fighter/producer/hauler interdependence — and allows
  two equipped weapon schools with hot-swap. Both are recorded as future build-depth
  candidates, deliberately not specified here.

## Assumptions

- **What "rip out action-based" means**: decisions stay (school choice, ability picks, tree
  builds, gear, tactics, when to push tiers), execution goes (no aiming/dodging/reflex input).
  Optional tap-to-cast while spectating is allowed because it is a strategic timing choice
  fully replicable by tactics rules (FR-166/SC-108), not an input-skill mechanic.
- **Structure ported, IP not**: school/ability/tree shapes follow New World's weapon-mastery
  conventions (3 slotted actives, two trees per school, scarce points, respec); every school,
  ability, enemy, and name is original (001 FR-024 / R12 discipline applies).
- **Combat occupies the one activity slot** — preserves the idle pacing model's central
  trade-off.
- **No-death model**: defeat = automatic retreat, haul kept, durability + recovery-minutes
  cost. Harsher penalties are content tuning later if wanted.
- **Determinism**: reproducible outcomes (FR-106) imply seeded randomness consistent with the
  established offline-parity guarantee.
- **Launch scale**: 2 schools (≥ 1 magic), 3 ability slots, two branches per school, 2–3
  combat skills — content decisions, not code constraints; structure supports more.
- **Recovery duration**: minutes, not hours — a pacing speed bump, content-tunable.
- **Spec 001 amendment**: 001's blanket combat exclusion is superseded; its permanent
  exclusion of action/dexterity gameplay is unchanged and binding here.
