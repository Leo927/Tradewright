# Feature Specification: Relic Gear & Delve Descents

**Feature Branch**: `004-artifacts-catacomb`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "Artifacts and catacomb"

## Vision Summary

This spec un-defers the two largest inspiration features that spec 003 consciously parked in
its Out of Scope: the unique build-defining gear tier (the inspiration's "Artifacts") and the
procedural small-group dungeon mode (its late-life 3-player "Catacombs"). Per the naming rule
(003 Assumptions; 001 FR-024), both ship under original working names:

- **Relics** — named, one-of-a-kind gear items, each carrying a permanent **signature
  modifier** that exists on no other item and defines or transforms a build. Relics are the
  marquee chase rewards of Tradewright's challenge formats: each one names the format that
  pays it out, arrives dormant, and is **awakened** through a disclosed track of deeds and
  materials — so the trophy you fought for still pulls you back to markets and crafters.
- **Delves** — procedurally assembled descent dungeons for parties of one to three, built for
  phone sessions: short floors, a decision point after every floor, and a push-or-bank stake.
  The inspiration's extraction-style *loot-loss-on-failure* is deliberately redesigned to
  honor no-ruin (003 FR-204): what a wipe forfeits is never anything you owned — only the
  unbanked **venture bonus** you knowingly left on the table by descending instead of
  withdrawing. The tension survives; the ruin does not.

The two halves interlock: deep delve milestones are one of the relic sources, delve-exclusive
materials feed the recipe economy and the relic awakening tracks, and relic-defined builds
give veterans a reason to re-run every format that drops them. The third deferred feature
(lockout-cadence seasonal trials) stays deferred — this spec amends 003's deferral decision
for these two features only.

## Clarifications

### Session 2026-06-11

- Q: Should relics be tradable or bound to the character that earned them? → A: Fully
  tradable — relics follow the all-goods-trade norm (002 FR-123); no bound item class
  exists in Tradewright.
- Q: Can a character hold duplicate copies of the same relic (earned plus bought)? → A: One
  copy at a time — acquiring an owned relic via trade is blocked with explanation; the source
  pays each character at most once ever; after selling, the market remains a path back.
- Q: How many weekly fixed-seed expedition attempts count toward the depth leaderboard? → A:
  Unlimited attempts; the character's best depth that week posts to the leaderboard.
- Q: Can a dissenting member exit individually at a landing when the leader calls descend? →
  A: Yes — any member may opt out during the ready-check, banking their personal pool share;
  the rest descend with party-size scaling adjusted. Mid-floor abandonment still forfeits the
  unbanked share.
- Q: Do descents have a finite bottom floor or are they unbounded? → A: Unbounded — no
  authored final floor; pools remix indefinitely by seed and the climbing difficulty curve is
  the practical limit; depth records and leaderboards are open-ended.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chase and Equip a Relic (Priority: P1)

A player browses the relic compendium and sees every relic in the game: its signature
modifier, the build it enables, and the disclosed source that pays it out (a specific mettle
trial rank, an afflicted dungeon level, a raid, a world boss, an invasion, or a delve depth
milestone). They pursue one, earn it, and equip it — within the equip limit — and their
character's combat behavior visibly changes in the way the signature modifier states.

**Why this priority**: The relic chase is the marquee reward layer the inspiration hung its
endgame on, and it works standalone: relics can pay out of the 003 formats that already exist,
with no delve required. It is the smallest slice that delivers "a unique item changed my
build."

**Independent Test**: Seed one relic with a mettle-trial source; a test player completes the
source, receives the relic exactly once, equips it, and combat logs show the signature
modifier's stated effect; the source never pays a second copy, and a market purchase of an
already-owned relic is blocked.

**Acceptance Scenarios**:

1. **Given** the relic compendium, **When** a player views any relic (owned or not), **Then**
   they see its name, tier, signature modifier in full, equip-limit category, disclosed
   source, and awakening track overview — multiplayer-only sources honestly labeled in V1.
2. **Given** a player who completes a relic's source requirement, **When** the reward
   resolves, **Then** the relic is granted to that character exactly once, the grant is
   recorded, and the compendium marks it owned.
3. **Given** an owned relic, **When** the player equips it, **Then** the signature modifier's
   stated effect applies to combat math and appears in the combat log; gear score and quality
   grade display per the established gear rules.
4. **Given** a relic already equipped in a category, **When** the player equips a second relic
   of the same category, **Then** the game explains the equip limit and offers a swap — never
   a silent failure.
5. **Given** a player who completes a source whose relic they already own, **When** the reward
   resolves, **Then** they receive the disclosed duplicate compensation (materials/coin)
   instead of a second copy.
6. **Given** an owned relic, **When** the player lists, escrows, or ships it, **Then** it
   trades under the standard trade rules like any other gear, carrying its awakening state
   (unsealed slots and locked modifiers) with it, and the compendium updates both characters'
   ownership state.

---

### User Story 2 - Awaken a Relic (Priority: P2)

An earned relic arrives dormant: its signature modifier works, but its remaining modifier
slots are sealed. The player works the relic's awakening track — disclosed deeds (e.g., defeat
N enemies of a family, clear its source format again at a higher rank) plus materials bought
or crafted from the market — to unseal slots one by one. Into each unsealed slot they lock a
modifier of their choice using craft-mod materials, exactly as crafters do, raising the
relic's quality grade to the maximum.

**Why this priority**: Awakening is what makes a relic a progression arc instead of a one-time
drop, and it is the economic half of the feature — every track demands tradable materials, so
the trophy chase pays producers and haulers too.

**Independent Test**: With a dormant relic and seeded materials, complete one awakening step
and verify the deed counter, material consumption, slot unsealing, player-chosen modifier
lock, and quality-grade rise all match the disclosed track.

**Acceptance Scenarios**:

1. **Given** a dormant relic, **When** the player opens its awakening track, **Then** every
   step shows its deed requirement, material cost, and what it unseals, with current progress.
2. **Given** a completed deed and the required materials in local storage, **When** the player
   confirms the awakening step, **Then** the materials are consumed, the slot unseals, and the
   step is permanently recorded.
3. **Given** an unsealed empty slot, **When** the player locks a chosen modifier by consuming
   the matching craft-mod materials, **Then** the modifier applies per its definition and the
   relic's quality grade rises per the modifier-count derivation (003 FR-270).
4. **Given** a locked non-signature modifier, **When** the player re-locks a different
   modifier at the disclosed cost, **Then** the old modifier is replaced cleanly; the
   signature modifier itself is never replaceable or removable.
5. **Given** any awakening track, **When** audited, **Then** at least one required material is
   market-tradable — no track is completable entirely outside the economy.

---

### User Story 3 - Descend into a Delve (Priority: P3)

A party of up to three (or a solo player) enters a delve site: a descent of short procedural
floors assembled from authored room and encounter pools. Kills pay normal combat rewards
instantly — XP, mastery, standard loot, banked and never at risk. On top, each cleared floor
adds delve-exclusive materials and gear rolls to a **venture bonus pool** whose multiplier
grows with depth. At the landing after every floor the party chooses: **withdraw** (the run
ends, the pool pays out) or **descend** (the pool stays staked and keeps growing). A wipe
forfeits only the unbanked pool — everything owned, including the run's base haul, is kept
under standard no-ruin rules.

**Why this priority**: The delve is the new playable format — but it depends on the challenge
encounter system (003) and is enriched by relics existing first as its chase payoff.

**Independent Test**: A three-player party clears two floors, withdraws, and receives base
haul plus the pool at the stated multiplier; an identical party descends a third floor, wipes,
and keeps the base haul while forfeiting exactly the unbanked pool — with only standard
durability/recovery costs.

**Acceptance Scenarios**:

1. **Given** a delve site, **When** a party (or solo player as a party of one) reviews it
   before entering, **Then** they see the difficulty scaling for their party size, the bonus
   multiplier curve by depth, the full stake rules, and the session-length expectation.
2. **Given** an active floor, **When** enemies are defeated, **Then** base rewards (XP,
   mastery, standard loot) bank instantly and irrevocably, while floor bonus rewards visibly
   accumulate in the staked venture pool.
3. **Given** a cleared floor, **When** the party reaches the landing, **Then** the leader
   calls withdraw or descend after a ready-check, with the pool's current value and the next
   floor's multiplier and difficulty both shown before the choice; during the ready-check any
   member may instead opt out individually, banking their personal pool share, while the rest
   descend at adjusted party-size scaling.
4. **Given** a withdraw decision, **Then** the run ends, the venture pool pays out in full to
   every member (personal rolls), and the descent's depth is recorded.
5. **Given** a party wipe mid-floor, **Then** the run ends keeping all base haul, the unbanked
   pool is forfeited as disclosed, and only standard durability/recovery costs apply — no
   owned item, coin, or progression is ever lost (003 FR-204).
6. **Given** a member disconnect at any point, **Then** the auto AI holds their character
   (003 FR-203); the AI never makes the descend choice — landing decisions require a live
   leader, with leadership auto-transfer per 003 FR-224 if the leader is gone.

---

### User Story 4 - Push the Depth Ladder (Priority: P4)

Veterans treat delves as a depth chase: enemy strength and the bonus multiplier climb on
disclosed curves, personal-best depth is recorded per site, specific relics list deep
milestones as their source, and each week every site offers a shared fixed-seed expedition
with a recognition-only depth leaderboard.

**Why this priority**: The ladder turns a finite procedural mode into repeatable retention
content, but it only matters once Story 3's core loop is proven.

**Independent Test**: Run the same site twice with different seeds and verify materially
different layouts; run the weekly seed twice and verify identical layout; reach a relic
milestone depth and verify the relic source pays per Story 1 rules; verify the leaderboard
records depth with no material rewards attached.

**Acceptance Scenarios**:

1. **Given** repeated descents at one site, **When** seeds differ, **Then** floor layouts and
   encounter sequences differ materially; **When** the seed is identical, **Then** the descent
   is identical — reproducibility holds (002 FR-106).
2. **Given** a party reaching a depth milestone listed as a relic source, **Then** the relic
   grant resolves per Story 1 (once per character, duplicate compensation otherwise).
3. **Given** the weekly seeded expedition, **Then** all parties face the same descent for that
   week, best depths post to a per-site leaderboard that is recognition only (titles/flair, no
   material rewards), and the regular random-seed mode remains available alongside it.
4. **Given** any depth beyond the full-party band, **When** a smaller party or solo player
   continues, **Then** scaling diminishes per the disclosed bounds and the game shows an
   honest "assumes a full party" warning — entry is never artificially locked.

---

### Edge Cases

- Wipe on the very first floor → base haul kept, empty-or-small pool forfeited; retreat costs
  only. No-ruin holds at every depth.
- Player closes the app mid-floor → delves are live-session content (003 FR-205): the auto AI
  holds the character; at the next landing the AI never descends, so an all-AI party
  auto-withdraws — the pool is paid, never silently forfeited by absence.
- Idle/offline accrual during a delve → suspended while in the instance, resumes after,
  exactly as 003 FR-205 dictates.
- Member leaves permanently mid-descent → AI holds until the landing; at landings the leader
  may backfill via the group board (003 FR-224); the joiner shares pool payouts only from
  floors they were present for.
- Member opts out at a landing → exits with their personal pool share paid in full; the
  remaining party descends at adjusted scaling. Only mid-floor abandonment forfeits the
  unbanked share — the landing is always a safe personal exit.
- Leader disconnects at a landing decision → leadership auto-transfers after the grace window
  (003 FR-224); the run is never stuck.
- Duplicate relic from any source (including delve milestones) → disclosed compensation in
  materials/coin; a character can never hold two copies — a trade that would deliver an
  owned relic is blocked with explanation before any payment.
- Relic whose signature modifier targets a school the player respecs or swaps away from →
  modifier goes inert and is flagged in the loadout (002 inert-rule pattern), never an error.
- Relic equipped when its category's equip limit would be exceeded by a loadout import/swap →
  blocked with explanation and a one-tap swap path.
- Trading, escrowing, or shipping a relic → behaves as any other gear item; the awakening
  state travels with the item; awakening and delve-exclusive materials trade normally.
- V1 (solo version) → delves fully playable solo with scaling; relics with multiplayer-only
  sources are visible in the compendium and honestly labeled, never silently absent
  (003 FR-262 pattern).
- Reward farming by shallow repeated descents → entry is never limited (003 policy); the
  held-in-reserve, disclosed lever caps the exclusive-material/bonus portion per day/week if
  economy telemetry shows oversupply — base rewards stay full.
- Weekly leaderboard ties → tied depths share rank; recognition only, so nothing material
  rides on tiebreaks.

## Requirements *(mandatory)*

### Functional Requirements

**Relic Gear (unique build-defining tier)**

- **FR-301**: The game MUST provide relics: named, one-of-a-kind gear items, each carrying a
  permanent signature modifier that exists on no other item and whose effect is
  build-defining (enabling, transforming, or conditioning abilities, stances, provisions, or
  tactics interactions) through the established content-defined modifier vocabulary
  (002 FR-174, 003 FR-271). All relics, signature modifiers, names, and lore MUST be original
  authored content data (001 FR-024).
- **FR-302**: Relic equipping MUST be limited: at most one relic weapon/focus and one relic
  armor/trinket equipped simultaneously (limits content-tunable). The limit, each relic's
  category, and any conflict MUST be clearly surfaced; resolving a conflict is a guided swap,
  never a silent failure.
- **FR-303**: Every relic MUST have a disclosed source in a challenge format (mettle trial,
  afflicted dungeon level, raid, world boss, invasion, or delve depth milestone), published
  in a relic compendium visible to all players. A character earns each relic from its source
  at most once; completing a source while owning its relic pays a disclosed duplicate
  compensation. Relics are fully tradable, escrowable, and shippable like all other goods
  (002 FR-123) — no bound item class exists — and a traded relic carries its awakening state
  with it. A character MUST never hold more than one copy of the same relic: acquiring an
  owned relic via trade is blocked with a clear explanation, and after selling, the market
  remains a path back while the source never pays the same character twice. All materials
  related to relics (awakening, craft-mod) remain ordinary economy items.
- **FR-304**: Relics MUST arrive dormant: signature modifier active, gear score fixed at the
  top of the relic's tier band (no gear-score roll — consistent with the crafted-gear
  determinism rule, 003 FR-270), remaining modifier slots sealed. Each relic MUST define an
  awakening track of disclosed steps (deed requirement + material cost per step) that unseal
  slots; unsealed slots and locked modifiers are permanent item state that travels with the
  relic on trade, while deed progress toward an incomplete step is per character.
- **FR-305**: Unsealed relic slots MUST be filled by the player locking a chosen modifier
  through the established craft-mod mechanism (003 FR-271), with re-locking available at a
  disclosed material cost; the signature modifier MUST never be replaceable, removable, or
  occupy a player-fillable slot. Quality grade derives from filled modifier count exactly as
  for all gear (003 FR-270).
- **FR-306**: Relics MUST differentiate builds without obsoleting crafted gear: signature
  modifiers express sideways power (new behaviors, transformed mechanics, conditional
  effects), not flat stat dominance; the best no-relic crafted loadout MUST remain
  competitive on standard autoable content (bound: SC-302). Crafting MUST stay the targeted
  gear path (003 FR-222 discipline).
- **FR-307**: At least one relic MUST be obtainable in the solo version (V1) via a
  mettle-trial source; relics with multiplayer-only sources MUST be visible and honestly
  labeled in V1 (003 FR-262).

**Delve Descents (procedural small-group dungeons)**

- **FR-310**: The game MUST provide delve sites distributed across regions (regional
  asymmetry per 001 FR-030), each generating instanced descents procedurally assembled from
  authored content pools (rooms, encounter sequences, depth modifiers) by seed. Identical
  seed and party inputs MUST reproduce an identical descent (002 FR-106). Delves are live
  sessions only: idle/offline accrual is suspended inside and resumes after (003 FR-205).
- **FR-311**: Descents MUST support parties of 1–3 (launch design size 3), with difficulty
  scaling to party size on disclosed curves within stated bounds; beyond a disclosed depth
  band, scaling diminishes and under-sized parties see an honest "assumes a full party"
  warning — entry is never artificially locked (003 edge-case policy).
- **FR-312**: A descent MUST be structured as floors of encounters separated by landings. At
  each landing the party chooses withdraw (run ends, staked rewards pay out) or descend
  (stake carries and grows); the choice is made by the leader after a ready-check, with the
  current pool value and the next floor's multiplier and difficulty disclosed before
  deciding. During the ready-check any member MAY individually opt out: they exit the run at
  the landing, their personal pool share pays out in full, and the remaining party descends
  with difficulty scaling adjusted to its new size — a member's stake is never risked by
  another player's choice. The auto AI never chooses descend: a party with no live leader
  auto-withdraws at the landing. Leadership transfer and landing-time backfill follow 003
  FR-224; backfilled members share pool payouts only from floors they were present for.
- **FR-313**: Delve rewards MUST flow in two disclosed streams: (a) base haul — XP, mastery,
  and standard loot from kills, banked instantly and never at risk; and (b) a venture bonus
  pool — delve-exclusive materials and gear rolls accumulated per cleared floor under a
  depth-scaled multiplier — that pays out (personal rolls per member) only on withdrawal.
  A wipe or abandonment forfeits only the unbanked pool; base haul, owned items, coin, gear
  (beyond durability), and all progression are kept, with only standard durability/recovery
  costs (003 FR-204 binding). All stakes MUST be disclosed before every descend choice.
- **FR-314**: Enemy strength and the bonus multiplier MUST scale with depth on disclosed,
  content-tunable curves; floor encounters use the challenge mechanic vocabulary
  (003 FR-201/202) with boss-grade floors at disclosed intervals; per-site personal-best
  depth is recorded per character. Descents are unbounded: no authored final floor exists —
  content pools remix indefinitely by seed and the climbing difficulty curve is the
  practical limit, so depth records and leaderboards are open-ended. Entry is never limited;
  the reward-side cap lever (003 reserve policy) is the only supply-control contingency.
- **FR-315**: Each site MUST offer a weekly fixed-seed expedition alongside the random-seed
  mode: one shared seed per site per week, with a per-site, recognition-only depth
  leaderboard (titles/flair; no material rewards), consistent with 003's leaderboard policy.
  Attempts at the weekly seed are unlimited (entry is never limited, FR-314); a character's
  best depth that week is what posts to the leaderboard.
- **FR-316**: Delves MUST carry their economic weight: delve-exclusive materials MUST be
  demanded by recipes (003 FR-260) and MUST be among the sources of craft-mod materials
  (003 FR-271); selected relic awakening tracks MUST demand delve materials so the two
  halves of this spec feed each other.
- **FR-317**: Delve pacing MUST fit phone sessions: individual floors target ≤ 5 minutes,
  a withdraw decision is reachable within roughly 10 minutes of entry, and the
  every-landing exit means a session can end at any depth without voiding anything
  (001 FR-061, 003 FR-263 discipline).
- **FR-318**: Delves MUST be fully playable solo in the solo version (V1) with party-size
  scaling; multiplayer parties activate with the online version (V2) without client redesign
  (003 FR-262).

### Key Entities

- **Relic**: A unique, named, fully tradable gear item — tier, fixed top-of-band gear
  score, permanent signature modifier, sealed/unsealed modifier slots (awakening state
  travels with the item), disclosed source, awakening track, equip-limit category.
- **Signature Modifier**: A relic-exclusive, build-defining modifier; never obtainable,
  replaceable, or removable elsewhere.
- **Awakening Track**: Per-relic disclosed step sequence (deed + materials → unseal slot);
  unsealed state is permanent item state, deed progress is per character.
- **Relic Compendium**: The public catalog of all relics, sources, modifiers, and ownership
  state.
- **Delve Site**: A regional location generating procedural descents from authored pools;
  holds per-character depth records and the weekly seed.
- **Descent**: A runtime delve instance — seed, party, floors cleared, current depth, base
  haul (banked), venture bonus pool (staked), state (`descending → withdrawn | wiped`).
- **Floor / Landing**: One encounter sequence and its subsequent decision point
  (withdraw/descend).
- **Venture Bonus Pool**: The staked reward stream — accumulated floor bonuses under the
  depth multiplier; pays on withdrawal, forfeits on wipe; never contains owned property.
- **Depth Record / Weekly Seed Leaderboard**: Per-site personal bests and the
  recognition-only weekly fixed-seed ranking.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-301**: Build definition is real: for 100% of launch relics, equipping the relic changes
  the optimal tactics rules and/or loadout composition for at least one school (audited
  against the no-relic optimum) — relics are never pure stat sticks.
- **SC-302**: Crafting stays alive: on standard autoable content, the best no-relic crafted
  loadout performs within 10% of the best relic loadout at equal investment; relic advantage
  expresses in challenge content and build variety, not everyday dominance.
- **SC-303**: The trophy feeds the economy: 100% of awakening tracks require at least one
  market-tradable material, and relic-driven demand is observable in economy telemetry for
  every track's materials.
- **SC-304**: Acquisition integrity: 0 audited cases of a character holding two copies of
  the same relic, of a relic granted by a source without its disclosed requirement being
  met, or of a source paying the same character the relic more than once.
- **SC-305**: Phone-fit descents: ≥ 90% of audited descents reach their first landing within
  10 minutes, and 100% of landings offer a working withdraw that pays the pool.
- **SC-306**: The stake is tension, not ruin: 0 audited cases of any delve outcome costing
  owned items, coin, gear (beyond stated durability), or progression (extends 003 SC-206);
  and in healthy test cohorts neither withdraw nor descend exceeds 90% of landing decisions —
  both choices live.
- **SC-307**: Procedural soundness: across an audit set, distinct seeds produce materially
  different descents (layout/encounter sequence), and identical seeds reproduce identical
  descents in 100% of cases.
- **SC-308**: Solo completeness: a V1 solo player can earn and fully awaken at least one
  relic and set delve depth records, with every multiplayer-gated relic honestly labeled —
  0 silently absent items.

## Scope Boundaries

**In scope**: the relic gear tier (signature modifiers, equip limits, tradable acquisition,
duplicate compensation, compendium, awakening tracks, craft-mod slot locking); delve sites
and procedural descents (1–3 players, floors/landings, withdraw-or-descend stakes, two-stream
rewards, depth scaling, personal bests, weekly fixed-seed expeditions with recognition
leaderboards); delve-exclusive materials in the recipe and craft-mod economy; relic sources
across all 003 formats plus delve depth milestones; V1 solo delves and at least one V1 relic.

**Out of scope (this spec)**:

- Lockout-cadence seasonal trials — the third feature deferred by 003 remains deferred.
- Any extraction-style loss of owned property — permanently excluded; the venture-pool stake
  is the designed replacement, and no future tuning may put owned items at risk (003 FR-204
  is binding).
- PvP in delves or anywhere else (Tradewright is PvE-only, permanently).
- Relic loadout presets, wardrobe/transmog, or build-sharing portals (future
  quality-of-life).
- New combat schools, abilities, or tree content (relics consume 002's build system; they do
  not extend it).
- Procedural generation of *content* (rooms, encounters, and modifiers are authored; only
  their assembly per seed is systemic — 001 FR-024 authoring separation).

## Assumptions

- **Working names are original placeholders**: "relic" and "delve" deliberately avoid the
  inspiration's own feature names ("Artifacts", "Catacombs"), which sit on the content
  denylist per the 003 naming rule (001 FR-024). Final shipped names are content decisions;
  the structures specified here are name-independent.
- **Amends 003's deferral**: 003 deferred three inspiration features pending 002's build
  system; this spec un-defers the unique gear tier and the procedural small-group mode.
  Seasonal lockout trials remain deferred. 003's Out of Scope note stands as historical
  record.
- **Tradable relics (clarified 2026-06-11)**: the inspiration's unique tier was non-tradable,
  but review chose to keep relics inside the all-goods-trade norm (002 FR-123) rather than
  introduce a bound item class. Tradewright therefore has no bound items: the trophy identity
  is carried by the disclosed source and the compendium's provenance, not by binding, and the
  market becomes an additional legitimate path to any relic.
- **Extraction redesign rationale**: the inspiration's mode risked the run's collected loot
  on failure. Tradewright splits rewards into an untouchable base stream and a staked bonus
  stream that is never "owned" until banked, so the push-or-bank decision survives while
  no-ruin (002 FR-130–132, 003 FR-204) holds absolutely. Framing the stake honestly before
  every descend choice is what makes the forfeit a wager, not a loss.
- **Structure ported, expression original**: relic structure (unique perk, equip limit,
  upgrade track, top-band power) and delve structure (3-player, procedural, escalating
  descent) follow the inspiration's documented systems (archived per 001 R12); every name,
  modifier, room, enemy, and track is original. The fixed top-of-band gear score follows the
  crafted-gear determinism correction (003 FR-270) — relic power is never a roll.
- **Launch scale (content decisions, not code constraints)**: on the order of 6–10 relics
  spanning all source formats with at least one V1-obtainable; 2–3 delve sites in distinct
  regions; floors tuned to ~5 minutes; weekly seed cadence aligned with the affliction
  rotation week. All counts, curves, multipliers, and limits are content-tunable.
- **Equip limit default**: one relic weapon/focus + one relic armor/trinket, mirroring the
  inspiration's two-slot structure; content-tunable per FR-302.
- **Dependency chain**: this spec builds strictly on 002 (gear, modifiers, builds, no-ruin,
  control modes) and 003 (challenge encounter system, formats, loot discipline, score and
  leaderboard policies, FR-270/271 gear rules) atop 001's economy. Multiplayer delve parties
  require the online version (V2); solo delves and V1 relic sources do not.
