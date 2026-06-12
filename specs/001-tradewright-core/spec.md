# Feature Specification: Tradewright — Core Game

**Feature Branch**: `001-tradewright-core`

**Created**: 2026-06-11

**Status**: Draft

**Input**: Consolidation of the four feature specifications drafted 2026-06-11 —
001-idle-economy-mmo (economy core), 002-idle-auto-combat (combat core),
003-challenge-group-combat (challenge & group layer), 004-artifacts-catacomb (relics &
delves) — collapsed back into the single game design they always were.

**Provenance**: The game was drafted as four amendment-chained specs and merged into this one
specification on 2026-06-11. FR and SC numbering from the four sources never collided and is
preserved unchanged — FR-0xx economy, FR-1xx combat core, FR-2xx challenge & group, FR-3xx
relics & delves — so every existing cross-reference remains valid with its spec prefix dropped
("003 FR-270" is now just "FR-270"). Superseded statements (the economy layer's original
blanket combat exclusion, the challenge layer's deferral of relics and delves) are deleted or
folded in rather than left as amendment chains (constitution Principle X). The original four
documents remain in git history.

## Vision Summary

Tradewright is a phone-first, UI-only idle MMO built around a player-driven economy: Ironwood
RPG's idle skilling loop fused with New World's economy and combat systems, with everything
action-based removed. The entire game is 2D UI screens and numbers — lists, cards, progress
bars, timers, logs. There is no 3D rendering, no aiming, no dodging, no reflex input, anywhere,
ever. Every decision the inspiration games offer survives; every execution-skill demand is
automated away or converted into a discrete, timed UI choice.

The game is one integral experience built from four pillars and a chase layer on top:

1. **Produce** — trade skills (gathering, refining, crafting) progress through an idle loop
   that runs in real time and while offline. Crafting recipes consume the outputs of other
   skills, making players economically interdependent.
2. **Trade & Haul** — every settlement runs its own order book with its own fees and
   taxes, linked into one globally browsable market (per New World Update 1.1): anyone can
   see and order on any town's book from anywhere, but goods stay physical — purchases
   land in storage at the order's settlement. Prices still diverge by town, and moving
   goods between towns via timed caravans is a profitable playstyle in itself.
3. **Fight** — UI-based, autoable combat with the full build depth of the inspiration:
   combat schools with active abilities and magic, mastery progression, two-branch perk
   trees, gear and provisions, and player-authored tactics rules. The translation rule:
   **every decision survives, every execution is automated.** Standard content runs itself,
   online or offline; designated challenge content supports live tactical control —
   decision-making under time pressure, never execution skill.
4. **Band Together** — the content you *show up* for: solo mettle trials piloted by hand,
   five-player dungeons, weekly affliction ladders, 10–20 player raids, elite zones,
   eruption events, world bosses, and settlement-defense invasions. Group content exists so
   players need each other, and its exclusive rewards feed the economy so even pure traders
   care that fighters band together.

The **chase layer** crowning the pillars: **relics** — named, one-of-a-kind gear items whose
permanent signature modifiers define builds, earned from disclosed challenge-format sources
and awakened through material-hungry progression tracks — and **delves** — procedurally
assembled descent dungeons for parties of one to three, with a push-or-bank venture stake at
every landing.

Everything feeds one economy. Gear and provisions are crafted goods; enemies drop materials
gathering cannot produce; challenge formats pay exclusive materials that recipes demand;
relic awakening buys from the market; durability, repairs, respecs, taxes, and fees are
sinks. Producer, hauler, and fighter are three viable, mutually dependent playstyles, and
the social formats give all three a shared stake in each other's success.

All world content is original to Tradewright. Only the structural patterns of the
inspiration games are ported, never their IP, names, or text — and the inspiration's
documented post-launch reversals (market globalization, entry-cap oscillation, crafted
gear-score RNG removal, its 2021 deflation crisis) are treated as design evidence baked into
this specification, not just a feature catalog.

## Design Invariants

These rules are permanent, hold across every pillar, and bind all future content and tuning:

1. **UI-only, forever**: the entire game is 2D UI screens; no 3D, no animation-dependent
   gameplay (FR-060, FR-102).
2. **No action gameplay, forever**: no aiming, dodging, movement, positioning, reflex
   timing, or input-skill rewards anywhere (FR-101, FR-184, FR-201). Active control is
   decision speed — windows measured in seconds, never frames.
3. **PvE-only, forever**: no format, mechanic, or edge case may apply player-vs-player
   damage or loss (FR-261, SC-208). Territory contests stay economic.
4. **No-ruin**: no death, no loss of stored items, coin, equipped gear (beyond stated
   durability), progression, or tree points from any combat outcome in any format (FR-130–132,
   FR-204, FR-313). The delve venture stake wagers only unbanked bonuses, never owned property.
5. **Offline parity & determinism**: offline progression equals online progression to the
   unit; identical inputs and seeds reproduce identical outcomes (FR-013, FR-105, FR-106,
   FR-310). No reload-to-reroll.
6. **Originality**: every name, item, place, lore string, and mechanic expression is
   original; structure may follow genre conventions, expression may not (FR-024, FR-150).
   Inspiration feature/system names sit on an enforced content denylist.
7. **All goods trade; no bound items**: every item — gear, provisions, materials, relics —
   is storable, escrowable, tradable, and shippable under the same rules (FR-020–023,
   FR-123, FR-303).
8. **Entry is never limited**: repeatable content has no entry caps, ever; the only
   supply-control lever held in reserve is a disclosed, content-tunable cap on the
   exclusive-material/bonus portion of rewards (FR-314, challenge reward policy).
9. **Content is authored data**: skills, items, recipes, enemies, encounters, modifiers,
   curves, and tunables live in validated content files, editable without code changes
   (FR-024, FR-150).
10. **One character, one place, one activity**: a character exists in exactly one settlement
    (or in transit), occupies one activity slot, and live instanced content suspends idle
    accrual — no double-dipping (FR-002, FR-010, FR-104, FR-205).
11. **Phone-first**: every screen and flow fully usable one-handed on a portrait phone
    display; sessions fit mobile attention spans (FR-061, FR-151, FR-263, FR-317).
12. **Authoritative time**: all progress and timers derive from authoritative time; client
    clock changes never alter outcomes (FR-017).

## Product Definition: Two Versions, One Game

Tradewright ships as two versions sharing one game engine behind one contract, and **both
stay alive permanently**:

| Concern | V1 — Solo | V2 — Online |
|---------|-----------|-------------|
| World | Private single-player world | One shared persistent world |
| Markets | NPC traders simulate supply/demand price drift | Real players; NPC liquidity configurable |
| Multiplayer formats (dungeons, afflictions, raids, zones, events, bosses, invasions, party delves) | Visible, honestly labeled "online version" — never silently absent | Active |
| Solo challenge content (mettle trials, solo delves, ≥1 relic source) | Fully playable | Fully playable |
| Persistence | On device | Server-authoritative |
| Time integrity | Best-effort (clock cheating affects only the cheater's solo world) | Fully authoritative (FR-017) |

Honest caveats this table makes explicit rather than burying:

- **V1 saves are device-local**: V1 requires no account and has no cloud sync or backup;
  losing the device loses the solo world. Account-bound, cross-device state (FR-003) is a
  V2 property.
- **The player-driven-economy thesis fully holds only in V2.** V1's markets are an NPC
  simulation of the same structures. V1 is a complete, permanently supported solo game and
  the development/test harness; V2 is the product the economic design argues for.
- **Honest labeling is a hard rule**: multiplayer content in V1 is visible and labeled,
  never hidden (FR-262, FR-307, FR-318) — the solo player always sees the whole game.
- **The versions never connect**: no character, item, coin, or progression state migrates
  between V1 and V2 in either direction; a V2 character starts fresh (FR-004). The
  server-authoritative world never ingests client-held save state.

## The Player's Time

The game makes two different time offers, and the contract between them is fixed:

- **The idle backbone** (always): assign an activity or expedition, close the app, return to
  a summary. The daily check-in loop — review summary, collect, reassign, dispatch or
  receive a caravan — completes in under 2 minutes (SC-003). Offline accrual caps at 24
  hours (content-tunable). This loop never requires live play, scheduling, or other players.
- **The live layer** (always optional): content you choose to show up for, in phone-sized
  session budgets — delve landings reachable in ~10 minutes (FR-317), dungeons ≤ 30
  minutes, raid encounters ≤ 45 minutes, events ≤ 15 minutes (FR-263). Live instanced
  content suspends idle accrual while inside (FR-205) and never runs offline.
- **The weekly cadence**: affliction rotation, the featured world-boss window, and delve
  fixed-seed expeditions share a weekly rhythm — reasons to check the boards, never
  obligations (entry unlimited, leaderboards recognition-only).

The binding rules: everyday content never requires live play (FR-180); challenge content is
where live play may legitimately outperform automation (FR-183); and no live session is ever
voided by stepping away — the auto AI holds any character, in any format, at any moment
(FR-182, FR-203).

## Player Journey

The user stories below form one priority ladder (P1–P23), ordered so each story builds on
proven predecessors. The intended life of a player runs through four overlapping phases:

1. **Settler → Producer (P1–P3)**: arrive, assign a gathering activity, learn the idle
   rhythm, climb the recipe tree into refining and crafting.
2. **Trader → Hauler (P4–P5)**: convert production into profit on the local order book,
   notice price spreads, and start running caravans between towns.
3. **Fighter (P6–P13)**: open the hunting grounds, adopt a combat school, unlock abilities,
   write tactics, spend tree points, equip crafted gear — combat materials and gear demand
   wire the fighter into the economy from the first kill.
4. **Challenger → Group Player → Relic Chaser (P14–P23)**: pilot mettle trials by hand,
   join dungeons and raids, climb afflictions, defend settlements — then chase relics
   across every format and push delve depth records.

A player can stop at any phase and have a complete game; each later phase is an opt-in
deepening, not a treadmill. The phases order guidance, not access: hunting grounds are
visible from character creation, and a settler may adopt a school and fight from day one
(FR-113) — onboarding steers toward gathering first but locks nothing.

## Clarifications

Decision records from the pre-merge clarification rounds, preserved verbatim as design
history. All referenced requirement numbers remain valid in this document.

### Session 2026-06-11 (challenge & group layer)

- Q: What does the Contribution Record measure for contribution-scaled rewards (elite zones,
  events, world bosses, invasions, repair drives)? → A: Weighted multi-factor score — damage
  + healing/mitigation + objective actions (wave clears, station duties, repair supply),
  normalized per format.
- Q: What qualifies a player to enter affliction level N? → A: Both gates: a recorded clear of
  the previous level (base dungeon for level 1) AND a disclosed character tier/gear floor for
  the target level. (Refined below: the gear-floor half is advisory only; character tier is
  the hard gate.)
- Q: Can a replacement player join an in-progress dungeon/raid? → A: Yes, between encounters:
  the leader recruits via the group board any time outside an active boss fight; the joiner is
  loot-eligible only for bosses they were present for.
- Q: What if nobody repairs invasion damage? → A: Contribution repair is primary (fast,
  rewarded); facilities also self-restore over a stated multi-day window so no settlement is
  permanently crippled by low population.
- Q: What does "mass participation" mean for world bosses/events? → A: Design target of ~50
  concurrent contributors, with graceful soft-handling beyond it (overflow participants still
  earn contribution credit).
- Q: What is the launch entry-limit policy for repeatable challenge content? → A: No limits at
  launch — unlimited entries and full rewards every run. (Refined below: the held-in-reserve
  lever is reward-side caps; entry is never limited.)
- Q: What qualifies as "meaningful participation" for the guaranteed reward floor (FR-242)?
  → A: Contribution Record ≥ a disclosed percentage of the median contributor's score
  (launch default 10%, content-tunable) — AFK bystanders earn nothing; genuine low-power
  participants always qualify.
- Q: What determines when a settlement faces an invasion? → A: Threat buildup — settlement
  activity (prosperity, trade volume, regional hunting) fills a visible threat meter; when
  full, an invasion is scheduled with advance notice (e.g., 48h warboard posting).
- Q: How does a mettle trial unlock on the tier ladder? → A: Both gates, mirroring afflictions
  (FR-223): a recorded clear of the previous trial on the ladder AND a disclosed character
  tier/gear floor for the target trial. (Refined below: the gear-floor half is advisory
  only; character tier is the hard gate.)
- Q: Does gear have a quality grade separate from tier, and what does it govern? → A:
  Modeled on New World's structure: a quality grade DERIVED from modifier count (lowest
  grade = 0 modifiers, highest = all modifier slots filled), plus a separate gear-score
  number within the item's tier band that scales stat magnitude. Grade names original.
- Q: How are gear modifiers (perks) acquired on an item? → A: New World hybrid — dropped
  gear rolls modifiers randomly from disclosed pools; crafters lock specific modifiers by
  consuming rare craft-mod materials (sourced from challenge-format exclusive materials),
  remaining slots rolled; a small set of modifiers is drop-exclusive.
- Q: Do challenge formats drop finished gear or exclusive materials only? → A: Both, New
  World style — personal loot rolls can yield finished gear (rolled modifiers, gear score
  scaled to content difficulty) AND format-exclusive materials; crafting remains the
  targeted path via locked modifiers, drops are the lottery path.
- Q: What does the "gear floor" qualification gate (FR-211, FR-223) measure? → A: It is
  advisory only — a displayed gear recommendation (suggested gear-score band), never a
  hard gate. The hard gates are the recorded clear of the previous level/trial AND the
  disclosed character tier; under-geared players may enter with an honest warning.
- Q: Do affliction modifiers interact with gear modifiers? → A: Yes — each affliction's
  elemental/curse modifiers are mitigated by matching gear modifiers (wards/resists), so
  the weekly rotation creates rotating market demand for the matching craft-mod materials.
- Q: What determines which players share an enemy and its credit in elite zones (no
  spatial movement)? → A: Party-based encounters — each elite-zone engagement is isolated
  to a single party (a player without a party fights as a solo party of one); forming a
  party is never required to enter, but elite enemies are tuned too strong for solo play.
- Q: What is the launch defense-roster limit for settlement invasions? → A: 50 defenders —
  the same mass-combat scale as the world-boss/event concurrency target (content-tunable).
- Q: What happens to leader powers (backfill, calling the run) when the leader disconnects
  or leaves mid-run? → A: Automatic transfer — leadership passes to the longest-present
  remaining member after a short grace window; the original leader reclaims it on reconnect.
- Q: How do affliction scores connect to rewards? → A: Per-run score brackets — each run's
  score lands in a disclosed bracket that scales that run's payout on top of affliction level;
  the weekly leaderboard is recognition only (titles/flair), no material rewards.
- Q: Do mettle trial completion ranks affect that run's rewards? → A: Yes — trial ranks use
  the same disclosed score-bracket mechanism as afflictions: the run's rank scales its payout
  on top of the trial's tier; personal-best ranks are recorded for recognition.
- Q: How do world bosses relate to the inspiration's actual system (rotating limited-time
  featured bosses, not persistent spawns)? → A: Adopt the rotating model — one featured
  world boss per published multi-day window on a disclosed rotation; bosses are not all
  persistently available.
- Q: Which oversupply contingency lever does the spec hold in reserve? → A: Reward-side
  caps — entry stays unlimited permanently; if economy telemetry shows exclusive-material
  oversupply, the disclosed, content-tunable lever caps the exclusive-material/bonus
  portion of rewards per day/week while base rewards stay full (the inspiration's
  corrected late-life pattern). Entry caps are off the table.
- Q: How is the invasion defense roster selected when signups exceed the 50-slot cap? → A:
  Random draw at roster lock from all signups; non-drawn signups form an ordered waitlist
  that backfills no-shows. (Phase 2 governance may later add a small reserved-pick block,
  mirroring the inspiration's governor picks.)
- Q: Should ladder progression require a minimum score bracket on the previous level, as
  the inspiration did (Silver-or-better to unlock the next difficulty)? → A: No — keep
  any-clear: any recorded clear of the previous level/trial unlocks the next; score
  brackets affect payout only. A deliberate divergence from the inspiration's score-gated
  ladder, favoring attendance-based progression.
- Q: Should Tradewright include an analog of the inspiration's unique build-defining gear
  tier (its "Artifacts" — equip-limited, unique perk, upgrade track)? → A: Defer pending the
  combat core's build planning. *(Superseded the same day: the relic & delve layer
  un-deferred this — relics are now in scope, FR-301–307. Recorded here as history.)*

### Session 2026-06-11 (relic & delve layer)

- Q: Should relics be tradable or bound to the character that earned them? → A: Fully
  tradable — relics follow the all-goods-trade norm (FR-123); no bound item class
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

### Session 2026-06-11 (core-game audit round)

- Q: What is a character's "tier" for the hard entry gates on mettle trials (FR-211) and
  affliction levels (FR-223)? → A: The highest tier reached across the character's combat
  skills (FR-103) — reuses the existing per-skill tier structure, no new system.
- Q: What is the stat vocabulary for the combat core? → A: Clone New World's full attribute
  model now (un-deferring it from Scope Boundaries): five core attributes (original names;
  analogs of STR/DEX/INT/FOC/CON), each school scales from its designated attribute(s), the
  Constitution-analog drives health, gear grants attribute points plus an armor-rating
  analog (physical + elemental) for mitigation. See FR-107.
- Q: How do multi-combatant fights resolve (enemy targeting, ally-targeted effects, role
  emergence)? → A: Port New World's threat model — each enemy keeps a per-combatant threat
  table (damage, healing-generated threat, taunt-style amplifiers from abilities/gear perks)
  and attacks the highest-threat combatant; the ability vocabulary gains ally-targeted
  effects and tactics gain ally-health/party triggers, so tank/healer/damage roles emerge
  as in New World. See FR-108.
- Q: Do enemies drop coin directly? → A: No — NW-faithful: creatures drop materials and
  gear, never raw coin. Fighter income flows through selling drops; NPC trader purchases
  (FR-053) remain the economy's sole coin faucet.
- Q: How are settlement facilities modeled so invasion consequences (FR-251) have a defined
  target? → A: Port New World's settlement structure — tiered crafting stations (one per
  craft family) plus storage as facilities; station tier caps the recipe tier craftable at
  that settlement; invasion failure downgrades station tiers, repair restores them, and
  Phase 2 territory upgrades reuse the same model. See FR-037.

### Session 2026-06-12

- Q: When and how does a new player first meet combat (Q6 — hunting-ground visibility,
  school choice timing, default kit)? → A: Open from the start — hunting grounds are visible
  on the settlement screen from character creation; on first opening them the player adopts
  a school (free choice among launch schools) and receives a one-time free tier-1 starter
  weapon/focus for it; guided onboarding steers a new settler toward gathering first but
  nothing locks fighting. See FR-113.
- Q: Can a V1 (solo) character or its progress migrate into V2 (online)? → A: No migration,
  ever — V1 and V2 worlds are permanently separate in both directions; a V2 character starts
  fresh. Client-held V1 saves cannot be trusted by the server-authoritative world, and
  importing them would undermine the economy integrity guarantees (SC-010). See FR-004.
- Q: How do NPC trader purchases (the sole coin faucet, FR-053) mechanically work on a
  settlement's order book? → A: Hybrid — standing NPC buy orders at disclosed floor prices
  for a curated, regionally-varied list of raw goods (visible price floor and guaranteed
  liquidity in every settlement) PLUS periodic demand sweeps buying the cheapest listed
  sell orders across all goods, both on content-tunable per-settlement coin budgets.
  See FR-054.
- Q: How does a player's per-settlement storage capacity expand (FR-023)? → A: Coin-purchased
  expansion levels per settlement at escalating, disclosed costs (an economy sink), with the
  maximum purchasable level capped by that settlement's storage facility tier (FR-037) — a
  per-town strategic investment that gives invasion outcomes a stake players feel.
- Q: Can an under-sized party (fewer than 5 for dungeons, fewer than 10 for raids) start an
  instanced run? → A: Allowed, unscaled — any party from 1 up to the format's cap may start,
  with the honest "designed for N players" warning; difficulty stays tuned for the design
  size. Delves remain the only party-scaled format (FR-311). Resolves the tension between
  FR-221's former "fixed party size" wording and the no-artificial-lockout edge case.
- Q: Does FR-003 (account-bound, cross-device-consistent state) apply to V1 (solo)? → A: No —
  V1 is device-local only: no account required, saves live on the device with no cloud sync
  or backup, and device loss loses the solo world. FR-003 and the two-devices-one-account
  single-authoritative-state guarantees are rescoped to V2 only.
- Q: What can a V2 player do while the client has no network connection? → A: Hybrid —
  last-known state stays browsable read-only (honestly "as of" labeled); mutations scoped to
  the player's own state (assigning/changing activities, tactics edits, loadout changes) are
  accepted optimistically, queued, and reconciled on reconnect with visible rollback if the
  server rejects; mutations requiring shared multiplayer state (market orders and trades,
  party/group actions, live instanced content) are blocked offline with an honest
  explanation. Queued mutations take effect at server receipt per authoritative time
  (FR-017). See FR-063.
- Q: Do notifications ever reach the player outside the app (push)? → A: Yes — per-category
  opt-in push notifications, off by default, for a disclosed set of timer/schedule events the
  player chose: caravan arrival, offline cap reached, approaching start of a committed
  raid/invasion, market order filled/expired; never promotional. All other "notified"
  language in this spec means in-app surfaces only. See FR-064.
- Q: Does per-settlement market isolation stand, and what does FR-035's presence gate mean
  for remote market data? → A: Isolation is deprecated in favor of New World's Update 1.1
  (2021-11-18) linked-market model: every settlement's order book is browsable from
  anywhere with live data (no presence gate), buy orders are placeable at any settlement
  remotely, sell listings are created only where the goods physically are, and matching,
  fees/taxes, and goods delivery stay per-settlement — purchases land in the buyer's
  storage at the order's settlement, so hauling remains the way goods actually move.
  Supersedes the former "localized markets are a conscious divergence" scope boundary.
  See FR-031, FR-032, FR-035.

## User Scenarios & Testing *(mandatory)*

The stories below form one priority ladder across the four pillars: P1–P5 economy core,
P6–P13 combat core, P14–P19 challenge & group, P20–P23 relics & delves. Ordering follows
dependency and build order — each story is independently testable on top of its predecessors.

**— Pillar I: Economy Core (P1–P5) —**

### User Story 1 - Begin Life as a Settler (Priority: P1)

A new player creates an account, names their character, chooses a starting settlement, and is
guided to assign their character to a first gathering activity. Progress accrues visibly in real
time — a progress bar fills per action, output items accumulate in local storage, and skill
experience grows toward the next level.

**Why this priority**: This is the irreducible core of the game — without the assign-and-accrue
loop nothing else has value. It is the MVP that proves the idle engine, the content data model,
and the phone-first UI.

**Independent Test**: A fresh player can register, reach a settlement screen, start a gathering
activity, and after a known interval observe the predicted number of completed actions, items in
storage, and experience gained — with no market or caravan features present.

**Acceptance Scenarios**:

1. **Given** a first-time visitor, **When** they complete account creation and character setup,
   **Then** they arrive in their chosen starting settlement with an empty inventory, a starter
   amount of currency, and all skills at level 1.
2. **Given** a character with no active assignment, **When** the player selects a gathering
   activity available at their settlement and confirms, **Then** the activity begins immediately,
   the screen shows action duration, output per action, and experience per action.
3. **Given** an active gathering assignment, **When** one action duration elapses, **Then** the
   output items are added to the character's storage in that settlement and skill experience
   increases by the stated amount, without any user interaction.
4. **Given** an active assignment, **When** the player assigns a different activity, **Then** the
   game asks for confirmation, the previous activity stops (partial actions yield nothing), and
   the new activity starts.
5. **Given** a skill that reaches a level threshold, **When** the level increases, **Then** any
   newly unlocked activities or recipes are discoverable and clearly marked as newly available.

---

### User Story 2 - Return After Time Away (Priority: P2)

A player closes the game with an activity running. Hours later they return. The game shows a
summary of everything that happened while they were gone: actions completed, items produced,
experience and levels gained, and anything that stopped early (e.g., storage full) — then play
resumes seamlessly.

**Why this priority**: Offline accrual is what makes the game an idle game; the check-in loop is
the dominant play session type. It is second only to the loop itself.

**Independent Test**: Start an activity, advance time (or wait), reopen the game, and verify the
summary matches the deterministic prediction of actions-per-hour × elapsed time, capped at the
offline limit.

**Acceptance Scenarios**:

1. **Given** an active assignment and a closed app, **When** the player returns after N hours
   (N ≤ offline cap), **Then** a summary reports completed actions, items produced, and experience
   gained — matching exactly what continuous online play would have produced.
2. **Given** an absence longer than the offline cap, **When** the player returns, **Then**
   progress accrues only up to the cap and the summary states clearly that the cap was reached
   and when.
3. **Given** an activity whose output filled the settlement storage mid-absence, **When** the
   player returns, **Then** the summary shows when and why production halted, and accrued progress
   up to that point is preserved.
4. **Given** a player who manipulates their device clock, **When** they reopen the game, **Then**
   accrued progress reflects true elapsed time only — clock changes grant no extra progress.

---

### User Story 3 - Refine and Craft (Priority: P3)

A player takes raw materials gathered earlier and refines them into processed goods, then crafts
finished items from processed goods — following recipe trees where higher-tier recipes require
multiple lower-tier inputs from different skills. Recipes are gated by skill level tiers.

**Why this priority**: Crafting interdependence is what gives goods differentiated value and
creates the supply chains that markets and caravans exist to serve.

**Independent Test**: With seeded raw materials in storage, a player can run a refining activity
that consumes inputs and produces outputs at the stated ratio, then craft a finished item whose
recipe consumes outputs of two different skills.

**Acceptance Scenarios**:

1. **Given** sufficient input materials in local storage and the required skill tier, **When** the
   player assigns a refining activity, **Then** each completed action consumes the stated inputs
   and produces the stated outputs and experience.
2. **Given** insufficient input materials, **When** the player attempts to assign the activity,
   **Then** the game explains exactly which inputs are missing and in what quantity, and the
   assignment does not start.
3. **Given** an active refining run, **When** inputs run out mid-run, **Then** the activity halts,
   and the halt is reported (immediately if online, in the return summary if offline).
4. **Given** a recipe above the player's current skill tier, **When** the player views it, **Then**
   it is visible but locked, showing the tier required to unlock it.
5. **Given** a finished-goods recipe requiring outputs from multiple skills, **When** all inputs
   are present locally, **Then** the craft succeeds and consumes inputs from local storage only —
   materials stored in other settlements are not usable.

---

### User Story 4 - Trade at the Local Market (Priority: P4)

A player opens the trading post and browses the linked market: every settlement's order book
is visible with live prices. They sell goods on their current settlement's book and place buy
orders on any settlement's book, including remotely. Orders match within a single settlement's
book only, and purchased goods land in storage at that settlement. Prices for the same good
still differ between settlements because goods are physical and must be hauled.

**Why this priority**: The market converts production into profit and makes other players'
activity visible. It depends on Stories 1–3 producing goods worth trading.

**Independent Test**: Two test players can complete a full trade (one lists a sell order, the
other buys it — from the same settlement or remotely); the listing is visible from every
settlement, lives on exactly one book, and the purchased goods land in the buyer's storage at
the listing's settlement.

**Acceptance Scenarios**:

1. **Given** a player at a settlement with goods in local storage, **When** they place a sell
   order (item, quantity, unit price), **Then** the goods are escrowed from storage and the order
   appears in that settlement's order book with its listed duration and any listing fee shown
   before confirmation.
2. **Given** a standing sell order, **When** another player in the same settlement buys at that
   price, **Then** the trade executes: the buyer pays coin and receives goods into local storage,
   the seller receives coin minus the settlement's sales tax, and both can see the completed
   trade in their history.
3. **Given** a buy order priced at or above an existing sell order, **When** it is placed, **Then**
   it fills immediately at the best available price, partially filling if quantity exceeds
   availability, with the remainder staying on the book.
4. **Given** a sell order on settlement A's book, **When** a player in settlement B browses the
   linked market and buys it, **Then** the trade executes on A's book at A's tax rates and the
   goods land in the buyer's storage at A — visible from anywhere, matched and delivered only
   at the order's home settlement.
5. **Given** an order that expires unfilled, **When** the duration lapses, **Then** escrowed goods
   or coin return to the owner's local storage/wallet and the owner is notified on next viewing.
6. **Given** any market screen, **When** the player views an item, **Then** they can see current
   best bid/ask and recent trade prices for that item in that settlement.

---

### User Story 5 - Haul Goods Between Settlements (Priority: P5)

A player notices an item is cheap where they are and expensive elsewhere. They load a caravan with
cargo (limited by weight), dispatch it on a route with a real-time travel duration and a stated
risk level, pay route costs, and — after the timer completes — the goods arrive in the destination
settlement's storage, ready to sell at the higher local price. The player's character can also
travel between settlements, separately from caravans.

**Why this priority**: Caravans are the connective tissue between local economies and the payoff
of the no-global-market design. They depend on markets (Story 4) existing in at least two towns.

**Independent Test**: With price differences seeded between two settlements, a player can dispatch
a caravan, observe the timer, receive goods at the destination on completion, and the end-to-end
arbitrage (buy low → ship → sell high) yields the predicted profit after taxes and fees.

**Acceptance Scenarios**:

1. **Given** goods in local storage, **When** the player composes a caravan shipment, **Then** the
   UI shows cargo weight against the caravan's capacity, the route's travel duration, risk level,
   dispatch cost, and destination taxes before the player confirms.
2. **Given** a dispatched caravan, **When** the travel timer is running, **Then** the player can
   continue all other play (idle activities, trading) — hauling never blocks the rest of the game
   — and can check the caravan's progress and arrival time at any moment.
3. **Given** a caravan that arrives (online or offline), **When** the player next views the game,
   **Then** the cargo is in the destination settlement's storage and the arrival appears in the
   summary/notifications.
4. **Given** a route with nonzero risk, **When** a risk event occurs on a shipment, **Then** the
   stated consequence (loss of a portion of cargo) is applied, the player is informed of exactly
   what was lost, and shipments with risk mitigation purchased lose less.
5. **Given** a character in settlement A, **When** the player initiates character travel to
   settlement B, **Then** travel takes the route's stated real time, the character's idle activity
   stops during travel, and on arrival the player can act in B (assign local activities, use B's
   market and storage).
6. **Given** the player's caravans are all in transit, **When** they attempt another dispatch,
   **Then** the game explains the caravan slot limit and when a slot frees up.

---

**— Pillar II: Combat Core (P6–P13) —**

### User Story 6 - Fight Automatically (Priority: P6)

A player opens the hunting grounds near their settlement, picks an enemy appropriate to their
tier, and starts an expedition. Their character fights automatically: basic attacks and slotted
abilities resolve on visible timers per the player's tactics, both sides' health bars move,
buffs/debuffs and cooldowns are displayed, and a combat log narrates. Each defeated enemy
grants experience and rolls loot. The player can watch, navigate away, or close the app —
fighting continues either way.

**Why this priority**: The auto-battle loop is the irreducible core of the combat pillar;
nothing else in it matters until a fight can run itself, execute a build, and pay out XP and
loot.

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

### User Story 7 - Build a Combat School: Abilities and Magic (Priority: P7)

A player adopts a combat school — a weapon discipline or a magic school (all original to
Tradewright) — levels its mastery by fighting with it, unlocks its active abilities (strikes,
spells, heals, buffs, debuffs), and slots a limited set of them for expeditions. Magic schools
are full peers of weapon schools: same structure, different flavor and effect mix.

**Why this priority**: Active abilities are the heart of the kept New World depth — they turn
"my character fights" into "my build fights," and they are what tactics (Story 8) and trees
(Story 9) operate on.

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

### User Story 8 - Write Tactics, Not Reflexes (Priority: P8)

A player configures how their build executes: ability priority order and trigger rules from a
curated set of conditions ("on cooldown", "health below X%", "enemy health above/below Y%",
"buff missing", "at expedition start"), plus provision thresholds and the retreat threshold.
Sensible defaults exist so a new player never has to touch tactics; an invested player tunes
them to squeeze out more.

**Why this priority**: Tactics are the replacement for action-based execution — the strategic
layer that makes hands-off combat feel authored rather than random. They depend on abilities
existing (Story 7).

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

### User Story 9 - Spend Points in Perk Trees (Priority: P9)

Leveling a school's mastery awards points to spend in that school's perk trees — branching
trees of passives (stat boosts, ability modifiers, conditional effects) and active-ability
unlocks, structurally modeled on New World's two-tree weapon masteries. Builds diverge: two
players with the same school can fight very differently. A respec is available for a coin cost.

**Why this priority**: Trees are the long-term chase and the second half of the kept New World
depth; they need schools (Story 7) and benefit from tactics (Story 8) to express their results.

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
   ability joins the school's slottable roster (Story 7 rules apply).
4. **Given** a respec request, **When** confirmed and the coin cost paid, **Then** all points
   return, all tree effects are removed, and the build can be re-spent immediately; slotted
   abilities that are no longer unlocked are unslotted with a clear notice.
5. **Given** total points at launch content limits, **When** audited, **Then** points are
   scarce enough that one school cannot fill both branches — choices are real.

---

### User Story 10 - Equip and Provision (Priority: P10)

Before fighting, a player assembles the material half of the loadout: crafted or market-bought
gear in equipment slots (including the school's weapon or magic focus), plus provisions (food
and remedies) that auto-consume per thresholds. Gear may carry perk modifiers that interact
with school builds. Better gear and provisions enable higher-tier enemies and longer
expeditions.

**Why this priority**: The loadout connects combat to the economy — gear and provisions are
crafted goods with market prices — but a default kit lets Stories 6–9 function before this
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

### User Story 11 - Expeditions Run Offline (Priority: P11)

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

### User Story 12 - Risk Without Ruin (Priority: P12)

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

### User Story 13 - Loot Feeds the Economy (Priority: P13)

Combat drops include materials gathering cannot produce. Recipes for gear, provisions, and
select high-tier goods require them; different regions' hunting grounds drop different
materials, extending settlement price differences and caravan arbitrage to combat goods.

**Why this priority**: This story is why combat belongs in Tradewright — it closes the loop
between the fighting pillar and the existing economy.

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

**— Pillar III: Challenge & Group (P14–P19) —**

### User Story 14 - Pilot a Solo Boss Trial (Priority: P14)

A player enters a mettle trial — a solo, instanced duel against a boss with named mechanics
(phases, telegraphed heavy attacks, summoned adds, an enrage timer). They control the fight
live: triggering abilities, drinking remedies, switching stances as the boss telegraphs its
moves, with seconds-scale windows to respond. Victory awards trial-exclusive materials and a
completion rank; defeat costs only the standard retreat penalties.

**Why this priority**: It is the purest expression of "actively control difficult combat,"
has no multiplayer dependency (works in V1), and pioneers the boss-mechanic and active-control
systems every other format reuses.

**Independent Test**: Complete one trial with active control and verify mechanics fire per
definition, responses change outcomes, rewards grant on victory, and the same trial left to
the auto AI underperforms a competent live player.

**Acceptance Scenarios**:

1. **Given** an unlocked mettle trial, **When** the player reviews it before entering, **Then**
   they see the boss's tier, its mechanic list (as discoverable hints or full detail once
   fought), recommended preparation, and the reward table.
2. **Given** an active trial, **When** the boss telegraphs a heavy attack, **Then** the UI
   presents the telegraph with a visible response window (measured in seconds) and the
   player's available answers (e.g., guard stance, counter ability, burst-through); the chosen
   response resolves with its stated effect.
3. **Given** a mechanic answered well vs ignored, **Then** outcomes differ materially (damage
   avoided/taken, phase shortened/extended) and the combat log attributes the difference.
4. **Given** the player toggles the auto AI mid-trial, **Then** the AI continues with
   configured tactics (it does not answer telegraphs beyond generic rules) and the player can
   retake control at any tick.
5. **Given** defeat in a trial, **Then** standard no-ruin rules apply (FR-130–132): haul
   kept, durability + recovery cost, nothing else lost.
6. **Given** a completed trial, **Then** a rank (time/penalty graded via the shared score-
   bracket mechanism) is recorded, scales that run's payout, and repeat runs can improve the
   recorded personal best.

---

### User Story 15 - Run a Dungeon with a Party (Priority: P15)

Five players form a party and enter an instanced dungeon: a sequence of encounters ending in
boss fights, designed so that one player cannot do everything — sustain, damage, and control
roles emerge from school/build choices. Each player controls their own character live (or
leans on the auto AI); bosses use the mechanic system from trials, with some mechanics
requiring multiple players to answer simultaneously. Completion pays dungeon-exclusive
materials to every member.

**Why this priority**: This is the social heart of the pillar — depending on other players to
achieve what you cannot alone.

**Independent Test**: Five test players complete a dungeon; verify role interdependence (a
party of five identical glass-cannon builds fails where a balanced party succeeds), shared
mechanics require multi-player answers, and per-member loot delivery.

**Acceptance Scenarios**:

1. **Given** a player at a settlement with a dungeon, **When** they open the group board,
   **Then** they can create a party listing (dungeon, role needs, planned start) or join one,
   and see the party fill in real time.
2. **Given** a full party that enters, **Then** each member fights as their own character with
   their own build and control mode; any member may use the auto AI at any time.
3. **Given** a boss mechanic flagged as cooperative, **When** it triggers, **Then** it
   requires answers from more than one party member within the window (e.g., two players must
   brace the same slam), and partial answers have partial consequences.
4. **Given** a member who disconnects mid-run, **Then** the auto AI takes their character over
   seamlessly until they return; the run is never voided by a disconnect.
5. **Given** a party wipe (all members at retreat threshold), **Then** the run ends under
   no-ruin rules: haul earned so far is kept, standard durability/recovery costs apply per
   member.
6. **Given** dungeon completion, **Then** every member receives their own loot roll
   (personal loot — no intra-party loot disputes) including dungeon-exclusive materials, and
   the completion is recorded for affliction eligibility (Story 16).

---

### User Story 16 - Climb Afflicted Difficulty Tiers (Priority: P16)

Each week, a rotating subset of dungeons gains afflictions — stacked modifiers (elemental
twists, empowered enemies, added curses) across difficulty levels. Higher affliction levels
demand tighter builds, better gear, and sharper live play, and pay proportionally rarer
rewards plus a scoreboard rank.

**Why this priority**: Afflictions turn a finite dungeon set into a repeatable endgame ladder —
retention content that reuses everything from Story 15.

**Independent Test**: Run the same dungeon at base and at a affliction level; verify modifiers
apply per definition, entry requires the stated qualification, score is computed and ranked,
and reward tiers scale.

**Acceptance Scenarios**:

1. **Given** the weekly rotation, **When** a player views the group board, **Then** they see
   which dungeons are afflicted this week, each affliction's modifiers in full, and the
   qualification needed per level.
2. **Given** a afflicted run, **Then** the stated modifiers demonstrably alter combat (resist/
   vulnerability shifts, new enemy behaviors, curse effects) and the run is scored against
   time and penalty criteria.
3. **Given** a completed afflicted run, **Then** rewards scale with affliction level and with
   the run's disclosed score bracket, and the party's score posts to a per-dungeon weekly
   leaderboard (recognition only — leaderboard placement pays no material rewards).

---

### User Story 17 - Muster a Raid (Priority: P17)

Ten or more players (10 standard; up to 20 for the largest encounter tier) schedule and
execute a raid: one or more bosses whose mechanics are built around group composition and
parallel responsibilities — splitting into sub-groups, covering simultaneous mechanics,
managing shared enrage timers. Raids are the apex of preparation: provisioning a raid is
itself an economic event (consumables, repair budgets, food for twenty).

**Why this priority**: The largest interdependence statement, but it needs every prior story's
systems plus healthy population — latest in the chain.

**Independent Test**: A full raid group completes the launch raid; verify sub-group mechanics
require distributed answers, composition gates matter, scheduling tools work, and exclusive
rewards deliver per member.

**Acceptance Scenarios**:

1. **Given** a group leader, **When** they schedule a raid, **Then** they can post
   a signup with date/time, role requirements, and minimum readiness (tier/gear hints), and
   invitees can commit, decline, or waitlist.
2. **Given** a raid encounter, **Then** at least one mechanic requires simultaneous answers
   from multiple sub-groups in different "positions" (UI lanes/stations — no spatial movement,
   assignment is a tactical choice), and failure consequences are shared.
3. **Given** raid completion, **Then** every member receives personal loot including
   raid-exclusive materials, and the clear is recorded (first-clear server announcements
   acceptable).
4. **Given** a member disconnect or drop-out mid-raid, **Then** the auto AI holds their
   character (at AI effectiveness) and the raid may continue or call it — no automatic void.

---

### User Story 18 - Live in an Active World: Elite Zones, Events, World Bosses (Priority: P18)

The open world itself offers group-scale combat without dungeon scheduling: elite zones
(regions whose enemies assume a full party — each engagement is isolated to one party, and a
player without a party fights as a solo party of one), eruption events (timed incursions that
pop up regionally and ask whoever is present to clear waves together, no party needed), and
world bosses (massive enemies appearing on a disclosed rotation — one featured boss per
published multi-day window — that regional players gather to bring down, with
contribution-based rewards).

**Why this priority**: Ambient togetherness — the world feels alive and social without
scheduling. Lowest mechanical novelty (reuses auto/active combat on shared enemies).

**Independent Test**: A party fights an elite-zone enemy and verifies the engagement is
isolated to that party (a second party's fight never crosses over) with in-party shared
credit; an event spawns, two uncoordinated players contribute, both receive
contribution-scaled rewards; a world boss dies to N players and rewards all contributors per
the stated curve.

**Acceptance Scenarios**:

1. **Given** an elite zone, **When** a party (or a solo player as a party of one) engages an
   enemy, **Then** the engagement is isolated to that party — no other party's actions affect
   it — with credit and personal loot rolls shared among the party's members; a solo engager
   sees an honest warning that the enemies assume a full party.
2. **Given** an eruption event spawning in a region, **Then** players in that settlement
   region are notified, can join with one tap, fight in waves (auto or active), and earn
   contribution-scaled rewards when it resolves — including caravan-route effects while it
   rages (event regions raise route risk, tying the living world back to logistics).
3. **Given** the world-boss rotation, **Then** the current featured boss and its multi-day
   window are published in advance on the region's board; the fight supports many
   simultaneous contributors; rewards scale with contribution with a guaranteed floor for
   any meaningful participation.

---

### User Story 19 - Defend the Settlement: Invasions (Priority: P19)

Periodically a settlement faces an invasion: waves of enemies threaten its facilities, and a
defense roster of up to 50 players signs up to repel them — choosing defensive stations
(walls, gates, siege engines as UI lanes), managing wave pressure, and answering surge
mechanics together. Success protects the settlement; failure temporarily degrades its
facilities (crafting station tiers, storage capacity) until repaired by contribution.

**Why this priority**: Connects combat to the settlement/territory layer (and previews Phase
2's stakes) — but it is the most systems-entangled format, so it lands last.

**Independent Test**: Trigger an invasion, fill defense slots, and verify station assignment
matters, wave/surge mechanics resolve, success preserves facilities, and failure applies the
stated temporary degradation with a contribution-based repair path.

**Acceptance Scenarios**:

1. **Given** a scheduled invasion, **Then** the settlement's players see the warboard signup
   with timing, roster limit, and station plan; signups commit to a slot, and if signups
   exceed the roster cap the 50 defenders are drawn randomly at roster lock with the rest
   waitlisted to backfill no-shows.
2. **Given** the invasion running, **Then** defenders fight waves at their stations (auto or
   active), surge mechanics demand coordinated answers, and the defense's aggregate
   performance determines the outcome.
3. **Given** a failed defense, **Then** the settlement suffers only the stated, temporary,
   repairable consequences (degraded facility tiers; never loss of player property), and
   repair becomes a contribution event that producers and haulers can also serve (supplying
   materials).
4. **Given** a successful defense, **Then** contributors earn defense-exclusive rewards and
   the settlement gains a short prosperity bonus (e.g., reduced taxes), making defense
   everyone's business.

---

**— Pillar IV: Relics & Delves (P20–P23) —**

### User Story 20 - Chase and Equip a Relic (Priority: P20)

A player browses the relic compendium and sees every relic in the game: its signature
modifier, the build it enables, and the disclosed source that pays it out (a specific mettle
trial rank, an afflicted dungeon level, a raid, a world boss, an invasion, or a delve depth
milestone). They pursue one, earn it, and equip it — within the equip limit — and their
character's combat behavior visibly changes in the way the signature modifier states.

**Why this priority**: The relic chase is the marquee reward layer the inspiration hung its
endgame on, and it works standalone: relics can pay out of the challenge formats that already
exist, with no delve required. It is the smallest slice that delivers "a unique item changed
my build."

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

### User Story 21 - Awaken a Relic (Priority: P21)

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
   relic's quality grade rises per the modifier-count derivation (FR-270).
4. **Given** a locked non-signature modifier, **When** the player re-locks a different
   modifier at the disclosed cost, **Then** the old modifier is replaced cleanly; the
   signature modifier itself is never replaceable or removable.
5. **Given** any awakening track, **When** audited, **Then** at least one required material is
   market-tradable — no track is completable entirely outside the economy.

---

### User Story 22 - Descend into a Delve (Priority: P22)

A party of up to three (or a solo player) enters a delve site: a descent of short procedural
floors assembled from authored room and encounter pools. Kills pay normal combat rewards
instantly — XP, mastery, standard loot, banked and never at risk. On top, each cleared floor
adds delve-exclusive materials and gear rolls to a **venture bonus pool** whose multiplier
grows with depth. At the landing after every floor the party chooses: **withdraw** (the run
ends, the pool pays out) or **descend** (the pool stays staked and keeps growing). A wipe
forfeits only the unbanked pool — everything owned, including the run's base haul, is kept
under standard no-ruin rules.

**Why this priority**: The delve is the new playable format — but it depends on the challenge
encounter system and is enriched by relics existing first as its chase payoff.

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
   owned item, coin, or progression is ever lost (FR-204).
6. **Given** a member disconnect at any point, **Then** the auto AI holds their character
   (FR-203); the AI never makes the descend choice — landing decisions require a live
   leader, with leadership auto-transfer per FR-224 if the leader is gone.

---

### User Story 23 - Push the Depth Ladder (Priority: P23)

Veterans treat delves as a depth chase: enemy strength and the bonus multiplier climb on
disclosed curves, personal-best depth is recorded per site, specific relics list deep
milestones as their source, and each week every site offers a shared fixed-seed expedition
with a recognition-only depth leaderboard.

**Why this priority**: The ladder turns a finite procedural mode into repeatable retention
content, but it only matters once Story 22's core loop is proven.

**Independent Test**: Run the same site twice with different seeds and verify materially
different layouts; run the weekly seed twice and verify identical layout; reach a relic
milestone depth and verify the relic source pays per Story 20 rules; verify the leaderboard
records depth with no material rewards attached.

**Acceptance Scenarios**:

1. **Given** repeated descents at one site, **When** seeds differ, **Then** floor layouts and
   encounter sequences differ materially; **When** the seed is identical, **Then** the descent
   is identical — reproducibility holds (FR-106).
2. **Given** a party reaching a depth milestone listed as a relic source, **Then** the relic
   grant resolves per Story 20 (once per character, duplicate compensation otherwise).
3. **Given** the weekly seeded expedition, **Then** all parties face the same descent for that
   week, best depths post to a per-site leaderboard that is recognition only (titles/flair, no
   material rewards), and the regular random-seed mode remains available alongside it.
4. **Given** any depth beyond the full-party band, **When** a smaller party or solo player
   continues, **Then** scaling diminishes per the disclosed bounds and the game shows an
   honest "assumes a full party" warning — entry is never artificially locked.

---

### Edge Cases

**Economy core**

- Offline absence exceeds the offline cap → progress accrues to the cap only; summary says so.
- Settlement storage fills during production → activity halts; halt reason is reported; no output
  is silently discarded.
- Refining inputs exhausted mid-run (online or offline) → activity halts with reason.
- Device clock manipulation (forward or backward) → no effect on accrued progress, timers, or
  caravan arrivals; all timing derives from authoritative time.
- Two buyers attempt to fill the same order simultaneously → exactly one succeeds per unit of
  quantity; no goods or coin are duplicated or lost.
- Market with no liquidity (empty order book) → player can still place the first order; UI shows
  an empty-book state, not an error.
- Order expires while owner is offline → escrow returns; notification on next session.
- Caravan risk event destroys part of a cargo that was the player's entire stock → loss is bounded
  by the shipment; nothing outside the cargo is affected.
- Player attempts to use materials stored in another settlement → clearly messaged as unavailable
  here, with the location where they are stored.
- Player dispatches a caravan, then travels their character on the same route → both timers run
  independently.
- Account plays on two devices simultaneously (V2) → a single authoritative game state; no
  duplication of progress, currency, or items. (V1 has no account or cross-device state — each
  device is its own world, FR-003.)

**Combat core**

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
- Two devices, one account (V2) → single authoritative expedition state (V1 worlds are
  device-local, FR-003).
- Combat summary and general offline summary both pending → one unified return summary.

**Challenge & group**

- Party/raid member offline at scheduled start → slot opens to waitlist; run can start with
  AI-held reserved characters only by explicit leader choice.
- All members lean on auto AI in challenge content → permitted but underpowered by design
  (FR-183); content tuned so high tiers realistically require live answers.
- Disconnect during a cooperative mechanic window → AI gives the generic (suboptimal) answer;
  partial-answer consequences apply, run continues.
- Member leaves a run permanently → AI holds the character until the leader backfills a
  replacement between encounters via the group board (FR-224); the joiner earns loot only for
  bosses fought while present.
- Leader disconnects or leaves permanently → leadership auto-transfers to the
  longest-present remaining member after a short grace window (FR-224); the original leader
  reclaims it on reconnect; backfill and run-calling stay available throughout.
- Two settlements' events/invasions overlap for one player → character is one place at a time
  (FR-002); commitments conflict visibly at signup.
- Solo or under-sized party enters group-tuned content → allowed in every format (dungeons
  and raids included, FR-221/230), with the honest "designed for N players" warning;
  difficulty stays tuned for the design size — delves are the only party-scaled format. No
  artificial lockout below design size.
- Low population region/server → group board surfaces cross-settlement listings (travel
  required, per the travel rules FR-044); world events scale wave size down to participants
  present, within stated bounds.
- Player in a dungeon when the offline cap would hit → instanced group content runs in live
  sessions only; the cap question does not arise inside it (idle accrual is paused while in a
  live instance).
- Reward farming by re-running → entry is never limited; launch ships with full rewards
  every run. If economy telemetry shows exclusive-material oversupply, the content-tunable
  lever caps the exclusive-material/bonus portion of rewards per day/week (base rewards
  stay full), applied per format and always disclosed up front.
- V1 (solo version): mettle trials fully available; all multiplayer formats visibly labeled as
  online-version content, never silently absent.

**Relics & delves**

- Wipe on the very first floor → base haul kept, empty-or-small pool forfeited; retreat costs
  only. No-ruin holds at every depth.
- Player closes the app mid-floor → delves are live-session content (FR-205): the auto AI
  holds the character; at the next landing the AI never descends, so an all-AI party
  auto-withdraws — the pool is paid, never silently forfeited by absence.
- Idle/offline accrual during a delve → suspended while in the instance, resumes after,
  exactly as FR-205 dictates.
- Member leaves permanently mid-descent → AI holds until the landing; at landings the leader
  may backfill via the group board (FR-224); the joiner shares pool payouts only from
  floors they were present for.
- Member opts out at a landing → exits with their personal pool share paid in full; the
  remaining party descends at adjusted scaling. Only mid-floor abandonment forfeits the
  unbanked share — the landing is always a safe personal exit.
- Leader disconnects at a landing decision → leadership auto-transfers after the grace window
  (FR-224); the run is never stuck.
- Duplicate relic from any source (including delve milestones) → disclosed compensation in
  materials/coin; a character can never hold two copies — a trade that would deliver an
  owned relic is blocked with explanation before any payment.
- Relic whose signature modifier targets a school the player respecs or swaps away from →
  modifier goes inert and is flagged in the loadout (the inert-rule pattern, FR-173), never
  an error.
- Relic equipped when its category's equip limit would be exceeded by a loadout import/swap →
  blocked with explanation and a one-tap swap path.
- Trading, escrowing, or shipping a relic → behaves as any other gear item; the awakening
  state travels with the item; awakening and delve-exclusive materials trade normally.
- V1 (solo version) → delves fully playable solo with scaling; relics with multiplayer-only
  sources are visible in the compendium and honestly labeled, never silently absent
  (FR-262 pattern).
- Reward farming by shallow repeated descents → entry is never limited (challenge reward
  policy); the held-in-reserve, disclosed lever caps the exclusive-material/bonus portion per
  day/week if economy telemetry shows oversupply — base rewards stay full.
- Weekly leaderboard ties → tied depths share rank; recognition only, so nothing material
  rides on tiebreaks.

## Requirements *(mandatory)*

Numbering is preserved from the pre-merge specs and is now one namespace: FR-0xx economy
core, FR-1xx combat core, FR-2xx challenge & group, FR-3xx relics & delves. Requirements are
grouped by system; FR-270 and FR-271 (gear identity) were authored in the former challenge
spec and are re-homed into the Gear section where they belong — numbering unchanged.

### Functional Requirements — Economy Core

**Account & Character**

- **FR-001**: System MUST let a player create exactly one named character and choose a starting
  settlement from the launch set. In V2 the character is bound to a player account created at
  registration; V1 requires no account (FR-003).
- **FR-002**: A character MUST exist in exactly one settlement (or in transit between two) at any
  moment; the character's location determines which activities, storage, and market they can use.
- **FR-003**: In V2, game state MUST be account-bound and consistent across devices; the same
  account on a second device sees the same authoritative state. V1 game state is device-local
  only: no account, no cloud sync, no backup — losing the device loses the solo world, an
  accepted V1 trade-off.
- **FR-004**: V1 (solo) and V2 (online) worlds MUST be permanently separate: no character,
  item, coin, or progression state ever migrates between them in either direction — a V2
  character starts fresh. Rationale: client-held V1 saves cannot be trusted by the
  server-authoritative world (SC-010 integrity).

**Idle Skilling Loop**

- **FR-010**: A character MUST be assignable to at most one activity at a time (gathering,
  refining, or crafting — or a combat expedition, FR-104); assigning a new activity replaces
  the current one after confirmation.
- **FR-011**: Each activity MUST define: action duration, inputs consumed per action (if any),
  outputs produced per action, experience granted per action, and required skill level.
- **FR-012**: Active assignments MUST progress in real time while the player is online, with each
  completed action applying its inputs/outputs/experience atomically.
- **FR-013**: Active assignments MUST continue to accrue while the player is offline, up to a
  fixed offline cap, producing results identical to continuous online play over the same period.
- **FR-014**: On return from absence, the system MUST present a summary of offline gains and any
  events (halts, caravan arrivals, order fills/expiries) since last session.
- **FR-015**: Each skill MUST have levels driven by an experience curve, with content gated into
  tiers; reaching a tier unlocks that tier's activities and recipes for the skill.
- **FR-016**: Activities MUST halt safely (no lost or duplicated resources) when inputs run out or
  output storage is full, recording the halt time and reason.
- **FR-017**: All progress and timer calculations MUST use authoritative time; client clock
  changes MUST NOT alter outcomes.

**Items, Recipes & Storage**

- **FR-020**: Every item MUST have a tier and a weight; weight governs caravan capacity use.
- **FR-021**: Recipes MUST form interdependent chains: refining recipes consume gathered goods;
  crafting recipes consume refined goods, including combinations from multiple skills, at defined
  input:output ratios.
- **FR-022**: Each settlement MUST provide per-player local storage; items physically reside in
  exactly one settlement's storage (or in a caravan in transit) and are usable only where they
  reside.
- **FR-023**: Storage MUST have a capacity limit visible to the player. Capacity expands by
  purchasing successive expansion levels per settlement with coin at escalating, disclosed
  costs (an economy sink, FR-051); the maximum purchasable level is capped by that
  settlement's storage facility tier (FR-037), so invasion degradation and repair bear on
  storage capacity too.
- **FR-024**: All game content (skills, activities, items, recipes, settlements, routes) MUST be
  original to Tradewright — no names, lore, or text reproduced from other games — and MUST be
  defined as authored content data, editable without code changes.

**Settlements & Local Markets**

- **FR-030**: The launch world MUST contain multiple settlements (minimum 4) with deliberately
  asymmetric local resource availability, so that no settlement can produce everything and
  inter-settlement trade is necessary.
- **FR-031**: Each settlement MUST operate its own trading post with its own order book,
  and all order books MUST be linked into one globally browsable market (New World
  Update 1.1 model): every book is visible from anywhere, but orders live at exactly one
  settlement and matching never crosses settlements.
- **FR-032**: Players MUST be able to place limit buy and sell orders (item, quantity, unit
  price, duration); sell orders escrow goods, buy orders escrow coin. Buy orders MAY be
  placed at any settlement remotely and fill into the buyer's storage at that settlement;
  sell orders MUST be placed at the settlement where the escrowed goods physically are.
- **FR-033**: Orders MUST match within a settlement by price priority, then time priority, with
  partial fills supported; matched trades transfer goods/coin atomically.
- **FR-034**: Each settlement MUST apply its own listing fee and sales tax to market activity,
  with all fees disclosed before order confirmation. (Phase 1: rates are world-defined per
  settlement; Phase 2 will hand rate-setting to owning companies.)
- **FR-035**: Players MUST be able to see, per item per settlement, from anywhere: current
  best bid/ask, order book depth, and recent trade history — live market data for every
  settlement is globally visible with no presence requirement (linked market, FR-031).
- **FR-036**: Expired or cancelled orders MUST return escrowed goods/coin in full (fees per
  FR-034 excepted).
- **FR-037**: Each settlement MUST have facilities modeled on New World's settlement
  structure: tiered crafting stations (one per craft family) and storage. A station's tier
  caps the recipe tier craftable at that settlement — refining and crafting activities
  require a local station of sufficient tier alongside the skill-tier gate (FR-015) —
  extending regional asymmetry (FR-030) to production capability. Facility tiers are the
  target of invasion degradation and contribution repair (FR-251); Phase 2 territory
  upgrades reuse the same model. Station families, tiers, and caps are authored content
  data (FR-024).

**Caravans & Travel**

- **FR-040**: Players MUST be able to dispatch caravans carrying cargo from their current
  settlement to a connected settlement; each route defines real-time duration (on the order of
  hours), risk level, and dispatch cost.
- **FR-041**: Caravan cargo MUST be limited by weight capacity; capacity and concurrent caravan
  slots MUST grow through a hauling progression (a skill leveled by completed shipments).
- **FR-042**: Caravan timers MUST run in real time, independent of the player's online status and
  of the character's activity assignment; arrival deposits cargo into the player's destination
  storage.
- **FR-043**: Routes with risk MUST resolve risk events at most once per shipment, with the
  possible loss fraction stated before dispatch; players MUST be able to purchase mitigation
  (e.g., guards/insurance) that reduces loss, priced per shipment.
- **FR-044**: Characters MUST be able to travel between connected settlements on a real-time
  timer shorter than the caravan duration for the same route; travel suspends the active
  assignment.
- **FR-045**: The world map/route view MUST show, for each route from the current settlement:
  destination, duration (caravan and personal), risk level, and dispatch costs.

**Economy & Currency**

- **FR-050**: The game MUST have a single coin currency, earned primarily by selling goods;
  characters start with a small fixed amount.
- **FR-051**: All taxes and fees MUST be sinks (coin leaves the player economy) in Phase 1.
- **FR-052**: Every economic mutation (trade, fee, tax, caravan loss, production) MUST be recorded
  so a player's coin and item history is auditable in their transaction log.
- **FR-053**: The economy MUST include authored coin faucets — points where coin enters the
  player economy — alongside the sinks of FR-051; player-to-player trade alone is zero-sum
  and is not a faucet. NPC trader purchases on settlement order books are the sole coin
  faucet: enemies never drop coin (drop tables pay materials and gear only, FR-111), so
  combat is coin-positive only by selling drops. Faucet and sink
  rates MUST be content-tunable, and aggregate faucet/sink flows MUST be observable via
  economy telemetry so monetary imbalance (inflation or deflation) is detectable and
  correctable without code changes. (New World's November 2021 deflation/barter crisis —
  endgame sinks outpacing faucets — is the motivating failure case.)
- **FR-054**: NPC trader purchases MUST operate through two disclosed mechanisms on each
  settlement's order book: (a) standing NPC buy orders at disclosed floor prices for a
  curated, regionally-varied list of raw goods — a visible price floor and guaranteed
  baseline liquidity in every settlement; and (b) periodic demand sweeps that buy the
  cheapest listed sell orders across all goods within a per-settlement budget. Both draw
  from content-tunable per-settlement coin budgets per period, observable via the FR-053
  economy telemetry. In V1, NPC traders additionally place sell orders to simulate full
  supply/demand markets; in V2, NPC liquidity levels are configurable (Product Definition).

**Presentation & Platform**

- **FR-060**: The entire game MUST be playable through 2D UI screens — lists, cards, progress
  bars, numbers — with no 3D or action gameplay anywhere.
- **FR-061**: The game MUST be phone-first: every screen and flow fully usable on a typical
  phone-sized portrait display, with one-handed reach for primary actions.
- **FR-062**: Every interaction MUST respond immediately; operations that take time (caravans,
  actions, orders) show their pending state without blocking any other part of the UI.
- **FR-063**: When the V2 client has no network connection, last-known game state MUST remain
  browsable read-only with an honest offline indicator and "as of" timestamp. Mutations
  scoped to the player's own state (e.g., assigning or changing an activity, editing tactics,
  changing loadout) MUST be accepted optimistically, queued, and reconciled on reconnect —
  server rejections roll back visibly, never silently. Mutations that require shared
  multiplayer state (placing or filling market orders, party and group-board actions,
  entering live instanced content) MUST be blocked while offline with an honest explanation.
  Queued mutations take effect at server receipt time per authoritative time (FR-017); the
  client reconciles any optimistic prediction against the server's resolution. V1 has no
  server dependency (FR-003) and is unaffected.
- **FR-064**: The game MUST offer out-of-app (push) notifications as per-category opt-ins,
  off by default, limited to a disclosed set of timer/schedule events: caravan arrival,
  offline cap reached, approaching start of a raid or invasion the player committed to, and
  market order filled/expired (launch set; content-tunable). Promotional or engagement-bait
  notifications MUST NOT exist. Except where a player has opted in, "notified" throughout
  this specification means in-app surfaces only (summaries, boards, badges). The capability
  applies to both versions (device-scheduled in V1, server-pushed in V2).

### Functional Requirements — Combat Core

**Combat Model**

- **FR-101**: Combat MUST resolve automatically from character stats, school build (abilities,
  tree perks), gear, provisions, tactics rules, and enemy definitions — with no required
  real-time player input and no reflex, aiming, dodging, or movement mechanic anywhere.
- **FR-102**: Combat MUST be presented entirely through UI elements (bars, ticks, cooldown
  timers, buff/debuff indicators, logs, numbers) — no 3D, no animation-dependent gameplay.
- **FR-103**: Combat skills MUST follow the established skill structure (XP curves, levels,
  tiers gating enemies and gear), consistent with FR-015.
- **FR-104**: An expedition MUST occupy the character's single activity slot (FR-010);
  switching to any other activity requires confirmation and ends the expedition normally.
- **FR-105**: Expeditions MUST run identically online and offline up to the offline cap
  (FR-013), including ability casts per tactics; end states reached offline resolve exactly as
  online.
- **FR-106**: Combat outcomes MUST be reproducible: identical character, build, tactics, enemy,
  and starting conditions produce identical expedition results — no reload-to-reroll.
- **FR-107**: The character stat model MUST port New World's documented attribute system
  (all names original, FR-024): five core attributes (analogs of Strength / Dexterity /
  Intelligence / Focus / Constitution). Each combat school designates one or two scaling
  attributes that drive its ability and basic-attack magnitudes together with mastery
  (FR-161); the Constitution-analog drives the health pool; gear grants attribute points
  (FR-120) and an armor-rating analog (physical and elemental) that drives mitigation.
  Attribute names, per-school scaling assignments, and derivation curves are authored
  content data.
- **FR-108**: Multi-combatant resolution MUST port New World's threat model: each enemy
  maintains a per-combatant threat table — damage dealt, healing-generated threat, and
  taunt-style amplifiers from abilities and gear perks — and targets the highest-threat
  combatant at each tick, deterministically (FR-106 binding). The ability effect vocabulary
  (FR-161) MUST include ally-targeted effects (heals, shields, buffs) and the tactics
  condition set (FR-166) MUST include ally-health and party-state triggers, so the sustain,
  damage, and control roles dungeons assume (FR-221) emerge from builds. Solo combat is the
  single-combatant case of the same resolution.

**Enemies & Hunting Grounds**

- **FR-110**: Each settlement region MUST offer hunting grounds with an enemy roster; rosters
  differ by region (asymmetry, parallel to FR-030).
- **FR-111**: Each enemy MUST define tier, combat stats, behaviors (e.g., its own ability-like
  actions on timers), XP award, and a drop table with stated chances — all viewable before
  engaging.
- **FR-112**: Enemy tiers MUST gate engagement by combat skill tier; locked enemies show their
  unlock requirements.
- **FR-113**: Hunting grounds MUST be visible from character creation — combat is never
  locked behind trade-skill progress. On first opening the hunting grounds, the player MUST
  be offered the school adoption choice (any launch school, free) and granted a one-time
  starter kit: a tier-1 weapon/focus for the chosen school. The starter item is an ordinary
  economy item (craftable and tradable per FR-120/123); only its one-time grant is special.
  Guided onboarding steers a new settler toward gathering first but MUST NOT gate fighting.

**Combat Schools, Active Abilities & Magic**

- **FR-160**: The game MUST provide multiple combat schools — weapon disciplines and magic
  schools as structural peers — each with its own mastery track, ability roster, and perk
  trees. Launch minimum: 2 schools, at least one of them magic-flavored.
- **FR-161**: Each school MUST define active abilities with: cooldown, effect (damage, heal,
  damage-over-time, buff, debuff, shield — effect vocabulary defined in content), magnitude
  scaling from the school's designated scaling attributes (FR-107) and mastery, and unlock
  source (mastery level or tree node).
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
  always, own-health thresholds, enemy-health thresholds, ally-health and party-state
  thresholds (FR-108), buff/debuff presence, expedition start). The condition set MUST be expressive enough to encode any strategy achievable by
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
- **FR-181**: Designated challenge content (boss fights, dungeons, and the related formats of
  FR-201–251) MUST support active mode: live, real-time tactical control where the player
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
  carry stats per the attribute model (attribute points and armor rating, FR-107), tier,
  weight, durability, and optional perks (FR-174), and MUST be craftable via existing
  crafting skills and/or tradable on markets.
- **FR-121**: Provisions MUST auto-consume during combat per player-configured thresholds and
  MUST be craftable goods.
- **FR-122**: Durability MUST decrease with combat use; depleted gear grants no stats or perks
  until repaired; repair costs coin and/or materials (economy sink).
- **FR-123**: All combat items MUST be ordinary economy items: storable per settlement,
  escrowable, shippable with weight (FR-020/022).

**Gear Identity: Score, Quality & Modifiers** *(FR-270/271 re-homed from the former
challenge spec — they define core gear identity for all gear, not just challenge rewards;
numbering preserved)*

- **FR-270**: Every gear item MUST carry, beyond its tier (FR-120): a gear score —
  a number within the tier's stated band that scales the item's stat magnitude — and a
  quality grade derived from the item's modifier count (lowest grade = 0 modifiers;
  highest grade = all modifier slots filled). Quality grades never scale stats directly;
  stats follow gear score, grade reflects modifier richness. Structure modeled on New
  World's rarity/gear-score system; all grade names and modifier expressions original.
  Crafted gear's gear score MUST be deterministic — a stated function of the recipe, the
  crafter's skill tier, and disclosed bonuses, never a random roll; gear-score randomness
  is reserved for dropped gear (FR-222's lottery path). (The inspiration removed crafted
  gear-score RNG in 2023 after it undermined crafting as the targeted path; Tradewright
  adopts the corrected design from the start.)
- **FR-271**: Modifier acquisition MUST follow the hybrid model: dropped gear rolls its
  modifiers randomly from disclosed, slot-specific pools; crafted gear lets the crafter
  lock chosen modifiers by consuming craft-mod materials — and challenge-format exclusive
  materials (FR-260) MUST be the primary source of craft-mod materials, so modifier
  control is what group content sells to crafters. A small, disclosed set of modifiers
  MAY be drop-exclusive to specific formats. All pools, odds, and lock rules MUST be
  authored content data and visible to players.

**Risk & Recovery**

- **FR-130**: There MUST be no death, permadeath, or loss of stored items, coin, equipped gear
  (beyond durability), skill/mastery progress, or tree points from any combat outcome.
- **FR-131**: Players MUST be able to configure a retreat threshold per expedition; automatic
  retreat triggers at the threshold (or supply exhaustion + overwhelm) and banks the full haul.
- **FR-132**: Retreat MUST impose only its stated costs: extra durability wear and a short
  recovery period blocking further expeditions (non-combat play unaffected).

**Combat Economy Integration**

- **FR-140**: Drop tables MUST include combat-exclusive materials; the launch recipe set MUST
  require combat materials in gear, provision, and selected high-tier recipes.
- **FR-141**: Combat material availability MUST differ by region so price differences and
  caravan arbitrage extend to combat goods.
- **FR-142**: All combat-driven economic mutations (loot, repairs, provision consumption,
  durability, respec fees) MUST appear in the transaction/audit log (FR-052).

**Combat Content & Presentation**

- **FR-150**: All combat content (schools, abilities, trees, enemies, grounds, drop tables,
  gear, provisions) MUST be original to Tradewright and authored as content data, editable
  without code changes (FR-024); structure may follow genre conventions, expression may
  not.
- **FR-151**: All combat screens MUST meet the established phone-first and
  immediate-responsiveness standards (FR-060–062); starting, monitoring, tuning, and
  recalling an expedition never blocks on anything.

### Functional Requirements — Challenge & Group

**Challenge Encounter System (shared by all formats)**

- **FR-201**: Boss-grade encounters MUST be built from a mechanic vocabulary (phases,
  telegraphed attacks with seconds-scale response windows, adds, enrage timers, cooperative
  answers) defined in authored content — never input-dexterity tests (FR-184 binding).
- **FR-202**: Every mechanic MUST present its telegraph, window, available answers, and
  consequences through UI elements; after first encounter, mechanics are inspectable in a
  bestiary/journal.
- **FR-203**: Active control in encounters follows FR-181–183: live tactical input,
  auto-AI toggle at any time, AI holds disconnected/absent players, active play may
  outperform AI here.
- **FR-204**: All no-ruin guarantees hold in every format (FR-130–132): no death, no loss
  beyond durability/recovery; group wipes end runs without voiding earned haul.
- **FR-205**: Challenge content runs in live sessions only; idle/offline accrual (FR-013)
  is suspended while in an instance and resumes after. Instanced content does not run offline.

**Mettle Trials (Solo)**

- **FR-210**: Mettle trials — Tradewright's solo boss trials — MUST exist from the solo
  version (V1) onward, tier-laddered, with trial-exclusive reward materials and recorded
  completion ranks (graded, repeatable). Ranks use the same disclosed score-bracket mechanism
  as afflictions (FR-223): each victory's rank scales that run's payout on top of the trial's
  tier; personal-best ranks are recorded for recognition.
- **FR-211**: Trial unlocking uses both hard gates, mirroring affliction qualification
  (FR-223): a recorded clear of the previous trial on the ladder (the first trial is open
  by default) AND a disclosed character tier for the target trial. A character's tier is
  defined as the highest tier reached across their combat skills (FR-103); this definition
  applies wherever "character tier" gates content. A recommended gear-score
  band is displayed per trial as advisory guidance only — it never blocks entry;
  under-geared players enter with an honest warning. Locked trials always show their
  requirements.

**Parties, Dungeons & Afflictions**

- **FR-220**: The game MUST provide party formation (create/join listings on a group board;
  invite by name; role-need labeling) without requiring third-party coordination tools.
- **FR-221**: Dungeons MUST be instanced with a design party size of 5 (launch), composed of
  encounter sequences with at least one cooperative mechanic per boss, and tuned so balanced
  role coverage outperforms uniform compositions measurably. Under-sized parties (down to
  solo) MAY start a run with the honest "designed for N players" warning; difficulty MUST
  NOT scale to party size — the design-size tuning stands (delves are the only party-scaled
  format, FR-311).
- **FR-222**: Loot in all group content MUST be personal (per-member rolls); format-exclusive
  materials MUST feed the economy (recipes demand them) per FR-140 discipline. Loot
  tables MAY yield finished gear alongside materials: dropped gear rolls per FR-271 with
  gear score scaled to the content's difficulty (higher affliction levels / raid tiers pay
  higher gear-score bands), keeping drops the lottery path and crafting the targeted path.
- **FR-223**: A weekly affliction rotation MUST apply stacked, fully-disclosed modifiers to a
  subset of dungeons across at least 3 difficulty levels, with qualification gates, scoring,
  and weekly leaderboards. Qualification for level N requires BOTH a recorded clear of the
  previous level (the base dungeon for level 1) AND a disclosed character tier (highest
  combat-skill tier, per the FR-211 definition) for the target level; both hard gates are
  per player and shown on the group board. A recommended
  gear-score band per level is displayed as advisory guidance only — it never blocks entry;
  under-geared players enter with an honest warning. Each run's score MUST land in a
  disclosed score bracket that scales that run's reward payout on top of affliction level;
  weekly leaderboards are recognition only (titles/flair) and pay no material rewards.
- **FR-224**: In-progress dungeons and raids MUST support backfill between encounters: the
  leader may recruit a replacement through the group board whenever no boss fight is active;
  the replacement is loot-eligible only for bosses fought while present. Roster changes are
  never permitted mid-boss-fight (the auto AI holds the slot per FR-203). If the leader
  disconnects or leaves, leadership transfers automatically to the longest-present remaining
  member after a short grace window; the original leader reclaims it on reconnect — leader
  powers are never frozen mid-run.

**Affliction Counters** *(the underlying gear-modifier system is FR-270/271, Gear section)*

- **FR-272**: Affliction modifiers MUST be counterable by matching gear modifiers: each
  affliction's elemental/curse effects are mitigated by corresponding ward/resist modifiers,
  with the counter relationship disclosed alongside the weekly rotation (FR-223) — so each
  rotation creates rotating, readable market demand for the matching craft-mod materials.

**Raids**

- **FR-230**: Raid encounters MUST support 10 players (up to 20 for the largest tier), with
  sub-group mechanics requiring distributed simultaneous answers and composition-sensitive
  tuning. Under-sized rosters MAY start under the FR-221 entry rule: honest warning, no
  difficulty scaling.
- **FR-231**: Raid scheduling tools MUST exist in-game: posted signups with time, role needs,
  commitments, and waitlists.

**Open-World Group Content**

- **FR-240**: Elite-zone engagements MUST be isolated per party: each enemy encounter
  involves exactly one party (a player without a party fights as a solo party of one), with
  credit and personal loot rolls shared among that party's members. Party formation is never
  required to enter, but enemies MUST be tuned for a full party and solo engagement MUST
  trigger the honest group-strength warning.
- **FR-241**: Eruption events MUST spawn on regional cadences, notify present players, scale
  within stated bounds to participation, pay contribution-scaled rewards, and raise affected
  caravan-route risk while active (logistics tie-in).
- **FR-242**: World bosses MUST run as a disclosed rotation — one featured boss per
  published multi-day window (structure per the inspiration's 2025 world-boss events;
  boss roster, window length, and cadence are content-tunable). Each featured boss MUST
  be announced in advance on regional boards, support a design target of ~50
  concurrent contributors (overflow participants beyond the target still earn contribution
  credit — never silently uncredited), and reward by contribution with a guaranteed floor.
  The floor qualifies any participant whose Contribution Record is ≥ a disclosed percentage
  of the median contributor's score (launch default 10%, content-tunable); below it, no
  reward. The same ~50 concurrency target bounds eruption-event scaling (FR-241).

**Invasions**

- **FR-250**: Invasions MUST be driven by threat buildup: settlement activity (prosperity,
  trade volume, regional hunting) fills a threat meter visible to all settlement players;
  when full, an invasion is scheduled with stated advance notice (e.g., 48 hours) on the
  warboard. Invasions use warboard signups with station assignment (UI lanes) and resolve
  from aggregate defense performance. The defense roster is capped at 50 players at launch
  (content-tunable), matching the FR-242 mass-combat concurrency target. When signups
  exceed the cap, the roster is drawn randomly from all signups at a disclosed roster-lock
  time; non-drawn signups form an ordered waitlist that backfills no-shows at start.
- **FR-251**: Defense failure consequences MUST be temporary, settlement-level, and repairable
  through contribution (materials, coin, labor) — degrading facility tiers per the
  settlement facility model (FR-037), never destruction of player property;
  success MUST grant settlement-wide benefits so non-fighters have a stake. Contribution
  repair is the primary, rewarded path (restores quickly, pays contributors per FR-264);
  absent contribution, degraded facilities MUST self-restore over a stated multi-day window so
  no settlement is permanently crippled by low population.

**Social & Economy Integration**

- **FR-260**: Each format MUST have at least one exclusive reward material demanded by the
  recipe economy, so group achievement flows into markets and caravans.
- **FR-261**: Group activity MUST respect the PvE-only rule absolutely: no format, mechanic,
  or edge case may apply player-vs-player damage or loss.
- **FR-262**: All formats MUST be visible (with honest "online version" labeling where
  applicable) in V1, and multiplayer formats MUST activate with the online version (V2)
  without client redesign.
- **FR-263**: All group content MUST remain phone-first (FR-061) with sessions designed
  for mobile attention spans: dungeons target ≤ 30 minutes, raid encounters ≤ 45 minutes,
  events ≤ 15 minutes.
- **FR-264**: Contribution scoring MUST be a weighted multi-factor score — damage dealt,
  healing/mitigation provided, and objective actions (wave clears, station duties, repair
  supply) — with weights normalized per format, so sustain and control builds earn comparably
  to damage builds; the factors and weights in effect MUST be disclosed to players.

### Functional Requirements — Relics & Delves

**Relic Gear (unique build-defining tier)**

- **FR-301**: The game MUST provide relics: named, one-of-a-kind gear items, each carrying a
  permanent signature modifier that exists on no other item and whose effect is
  build-defining (enabling, transforming, or conditioning abilities, stances, provisions, or
  tactics interactions) through the established content-defined modifier vocabulary
  (FR-174, FR-271). All relics, signature modifiers, names, and lore MUST be original
  authored content data (FR-024).
- **FR-302**: Relic equipping MUST be limited: at most one relic weapon/focus and one relic
  armor/trinket equipped simultaneously (limits content-tunable). The limit, each relic's
  category, and any conflict MUST be clearly surfaced; resolving a conflict is a guided swap,
  never a silent failure.
- **FR-303**: Every relic MUST have a disclosed source in a challenge format (mettle trial,
  afflicted dungeon level, raid, world boss, invasion, or delve depth milestone), published
  in a relic compendium visible to all players. A character earns each relic from its source
  at most once; completing a source while owning its relic pays a disclosed duplicate
  compensation. Relics are fully tradable, escrowable, and shippable like all other goods
  (FR-123) — no bound item class exists — and a traded relic carries its awakening state
  with it. A character MUST never hold more than one copy of the same relic: acquiring an
  owned relic via trade is blocked with a clear explanation, and after selling, the market
  remains a path back while the source never pays the same character twice. All materials
  related to relics (awakening, craft-mod) remain ordinary economy items.
- **FR-304**: Relics MUST arrive dormant: signature modifier active, gear score fixed at the
  top of the relic's tier band (no gear-score roll — consistent with the crafted-gear
  determinism rule, FR-270), remaining modifier slots sealed. Each relic MUST define an
  awakening track of disclosed steps (deed requirement + material cost per step) that unseal
  slots; unsealed slots and locked modifiers are permanent item state that travels with the
  relic on trade, while deed progress toward an incomplete step is per character.
- **FR-305**: Unsealed relic slots MUST be filled by the player locking a chosen modifier
  through the established craft-mod mechanism (FR-271), with re-locking available at a
  disclosed material cost; the signature modifier MUST never be replaceable, removable, or
  occupy a player-fillable slot. Quality grade derives from filled modifier count exactly as
  for all gear (FR-270).
- **FR-306**: Relics MUST differentiate builds without obsoleting crafted gear: signature
  modifiers express sideways power (new behaviors, transformed mechanics, conditional
  effects), not flat stat dominance; the best no-relic crafted loadout MUST remain
  competitive on standard autoable content (bound: SC-302). Crafting MUST stay the targeted
  gear path (FR-222 discipline).
- **FR-307**: At least one relic MUST be obtainable in the solo version (V1) via a
  mettle-trial source; relics with multiplayer-only sources MUST be visible and honestly
  labeled in V1 (FR-262).

**Delve Descents (procedural small-group dungeons)**

- **FR-310**: The game MUST provide delve sites distributed across regions (regional
  asymmetry per FR-030), each generating instanced descents procedurally assembled from
  authored content pools (rooms, encounter sequences, depth modifiers) by seed. Identical
  seed and party inputs MUST reproduce an identical descent (FR-106). Delves are live
  sessions only: idle/offline accrual is suspended inside and resumes after (FR-205).
- **FR-311**: Descents MUST support parties of 1–3 (launch design size 3), with difficulty
  scaling to party size on disclosed curves within stated bounds; beyond a disclosed depth
  band, scaling diminishes and under-sized parties see an honest "assumes a full party"
  warning — entry is never artificially locked (challenge edge-case policy).
- **FR-312**: A descent MUST be structured as floors of encounters separated by landings. At
  each landing the party chooses withdraw (run ends, staked rewards pay out) or descend
  (stake carries and grows); the choice is made by the leader after a ready-check, with the
  current pool value and the next floor's multiplier and difficulty disclosed before
  deciding. During the ready-check any member MAY individually opt out: they exit the run at
  the landing, their personal pool share pays out in full, and the remaining party descends
  with difficulty scaling adjusted to its new size — a member's stake is never risked by
  another player's choice. The auto AI never chooses descend: a party with no live leader
  auto-withdraws at the landing. Leadership transfer and landing-time backfill follow
  FR-224; backfilled members share pool payouts only from floors they were present for.
- **FR-313**: Delve rewards MUST flow in two disclosed streams: (a) base haul — XP, mastery,
  and standard loot from kills, banked instantly and never at risk; and (b) a venture bonus
  pool — delve-exclusive materials and gear rolls accumulated per cleared floor under a
  depth-scaled multiplier — that pays out (personal rolls per member) only on withdrawal.
  A wipe or abandonment forfeits only the unbanked pool; base haul, owned items, coin, gear
  (beyond durability), and all progression are kept, with only standard durability/recovery
  costs (FR-204 binding). All stakes MUST be disclosed before every descend choice.
- **FR-314**: Enemy strength and the bonus multiplier MUST scale with depth on disclosed,
  content-tunable curves; floor encounters use the challenge mechanic vocabulary
  (FR-201/202) with boss-grade floors at disclosed intervals; per-site personal-best
  depth is recorded per character. Descents are unbounded: no authored final floor exists —
  content pools remix indefinitely by seed and the climbing difficulty curve is the
  practical limit, so depth records and leaderboards are open-ended. Entry is never limited;
  the reward-side cap lever (the challenge reward-cap reserve policy) is the only
  supply-control contingency.
- **FR-315**: Each site MUST offer a weekly fixed-seed expedition alongside the random-seed
  mode: one shared seed per site per week, with a per-site, recognition-only depth
  leaderboard (titles/flair; no material rewards), consistent with the challenge leaderboard
  policy. Attempts at the weekly seed are unlimited (entry is never limited, FR-314); a
  character's best depth that week is what posts to the leaderboard.
- **FR-316**: Delves MUST carry their economic weight: delve-exclusive materials MUST be
  demanded by recipes (FR-260) and MUST be among the sources of craft-mod materials
  (FR-271); selected relic awakening tracks MUST demand delve materials so relics and
  delves feed each other.
- **FR-317**: Delve pacing MUST fit phone sessions: individual floors target ≤ 5 minutes,
  a withdraw decision is reachable within roughly 10 minutes of entry, and the
  every-landing exit means a session can end at any depth without voiding anything
  (FR-061, FR-263 discipline).
- **FR-318**: Delves MUST be fully playable solo in the solo version (V1) with party-size
  scaling; multiplayer parties activate with the online version (V2) without client redesign
  (FR-262).

## Economy Budget (Whole-Game View)

Every pillar makes demands on the same recipe economy and coin supply. This section is the
single aggregate view of those demands; the individual requirements remain authoritative.

**Material classes and their sources**

| Class | Source | Demanded by |
|-------|--------|-------------|
| Gathered goods | Gathering activities (regional asymmetry, FR-030) | Refining recipes (FR-021) |
| Refined goods | Refining activities | Crafting recipes, incl. multi-skill combinations (FR-021) |
| Combat-exclusive materials | Hunting-ground drops, regional (FR-140/141) | Gear, provision, and selected high-tier recipes (FR-140) |
| Format-exclusive materials | Each challenge format (trials, dungeons, afflictions, raids, zones, events, bosses, invasions) (FR-260) | ≥ 1 recipe per format (FR-260, SC-205) |
| Craft-mod materials | Primarily challenge-format exclusives; delves are also a source (FR-271, FR-316) | Modifier locking on crafted gear and relic slots (FR-271, FR-305) |
| Delve-exclusive materials | Venture bonus pools (FR-313) | Recipes, craft-mods, and selected relic awakening tracks (FR-316) |
| Awakening materials | Market-tradable (≥ 1 per track, SC-303) | Relic awakening steps (FR-304) |

**Recipe-demand mandates (aggregate)**: no single settlement's local resources
produce > 60% of launch recipes (SC-006); ≥ 20% of crafting recipes require a combat-exclusive material (SC-105);
group-content materials account for ≥ 10% of launch recipe inputs overall (SC-205); every
hunting region's and every challenge format's materials are demanded by ≥ 1 recipe (SC-105,
SC-205); every relic awakening track demands ≥ 1 market-tradable material (SC-303). These
mandates compound on one recipe set — content authoring must satisfy all of them jointly,
and the content integrity tests enforce them in CI.

**Income parity (three playstyles)**: hauling-focused play earns within ±50% of
production-focused play (SC-007); combat-focused play earns within ±50% of both (SC-106).
Parity is measured at equivalent investment and verified against a healthy world; both
terms are operationally defined by the joint economy model's behavior model (research R16,
economy).

**Coin faucets**: NPC trader purchases on settlement order books — the sole faucet (FR-053),
operating as standing floor-price buy orders on curated raw goods plus periodic demand
sweeps across all goods, each on content-tunable per-settlement budgets (FR-054).
Enemies never drop coin; fighting is coin-positive only via selling drops. Player-to-player
trade is zero-sum and is not a faucet.

**Coin sinks**: listing fees and sales taxes (FR-034, FR-051), caravan dispatch costs and
risk mitigation (FR-040, FR-043), storage expansion purchases (FR-023), gear repair
(FR-122), respec fees (FR-173), modifier re-lock costs (FR-305). All sinks and faucets are content-tunable, and aggregate flows MUST
be observable via economy telemetry (FR-053) — the inspiration's 2021 deflation crisis is
the standing warning.

**Open modeling debt**: the parity and demand claims above are asserted pairwise by their
source requirements; no joint economic model yet demonstrates they can all hold
simultaneously at launch content scale. The model's shape — simulated-actor behavior,
"healthy world" and "equivalent investment" definitions, and its deterministic green/red
criterion — is fixed in research R16 (economy); running it against launch content and
tuning until green remains M1 content-tuning work.

### Key Entities

**Economy core**

- **Account / Character**: The player's identity — one character per account in V2; in V1 the
  character lives in a device-local world with no account (FR-003). Has a location (settlement
  or in transit), a coin wallet, skill levels, and an optional active assignment.
- **Skill**: A named progression track (gathering, refining, crafting, or hauling family) with an
  experience curve and tier thresholds that gate content.
- **Activity**: A repeatable unit of idle work tied to a skill and a settlement's available
  resources; defines duration, inputs, outputs, experience.
- **Item**: A tradable good with tier and weight; exists in a settlement storage, an order escrow,
  or a caravan.
- **Recipe**: A transformation (refining or crafting) defining input items/quantities → output
  items/quantities and required skill tier.
- **Settlement**: A world location with local resource availability, per-player storage,
  tiered crafting-station facilities (FR-037), a trading post (order book), tax/fee rates,
  and routes to connected settlements.
- **Market Order**: A standing buy or sell offer (item, quantity, unit price, duration, owner)
  local to one settlement; escrows goods or coin.
- **Trade**: An executed match between orders; records item, quantity, price, tax, parties, time.
- **Caravan Shipment**: A cargo manifest in transit on a route; has departure/arrival times, risk
  outcome, and mitigation purchased.
- **Route**: A connection between two settlements with caravan duration, personal travel
  duration, risk level, and dispatch cost.
- **Offline/Event Summary**: The accumulated record of everything that resolved since the
  player's last session.

**Combat core**

- **Attribute**: One of five core character attributes (analogs of Strength / Dexterity /
  Intelligence / Focus / Constitution, original names); granted by gear, designated per
  school for ability scaling, with the Constitution-analog driving health (FR-107).
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
- **Gear Item / Provision**: Economy items per the standard item rules, extended with slots,
  combat stats, perks, durability / restore effects and auto-consume rules.
- **Gear Score / Quality Grade**: Per-item power number (within tier band, scales stats)
  and derived grade (function of modifier count) — the reward axes challenge content pays
  out on (FR-270).

**Challenge & group**

- **Encounter / Mechanic**: Authored challenge definitions — phase scripts, telegraphs,
  response windows, answers, cooperative requirements, enrage timers.
- **Mettle Trial**: Solo instanced encounter ladder with ranks and exclusive rewards.
- **Dungeon**: 5-player instanced encounter sequence; base + weekly afflicted variants.
- **Affliction**: Stacked modifier set (level 1–3+) with qualification, scoring, leaderboard.
- **Raid**: 10–20 player instanced encounter(s) with sub-group mechanics and scheduling.
- **Party / Raid Group / Signup**: Social formation objects — listings, roles, commitments,
  waitlists.
- **Elite Zone / Eruption Event / World Boss**: Open-world group content — elite zones use
  party-isolated encounters with in-party shared credit; events and world bosses use mass
  shared participation with contribution-scaled rewards.
- **Invasion**: Scheduled settlement-defense event — stations, waves, aggregate resolution,
  temporary repairable consequences, settlement-wide stakes.
- **Contribution Record**: Per-player weighted multi-factor participation score (damage,
  healing/mitigation, objective actions; format-normalized weights) used by events, bosses,
  invasions, and repair drives.

**Relics & delves**

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

### Measurable Outcomes — Economy Core

- **SC-001**: A first-time player gets from app open to their first running idle activity in
  under 3 minutes without external help.
- **SC-002**: A returning player sees their complete offline summary within 3 seconds of opening
  the game, and the reported gains exactly match the deterministic expectation for the elapsed
  time in 100% of audited cases.
- **SC-003**: The daily check-in loop (review summary, collect, reassign activity, dispatch or
  receive a caravan) is completable in under 2 minutes.
- **SC-004**: Placing a market order takes no more than 6 inputs (taps/entries) from the trading
  post screen.
- **SC-005**: Offline and online progression are identical: for any activity and any duration up
  to the offline cap, offline yield equals online yield to the unit.
- **SC-006**: Economic interdependence is real: no single settlement's local resources can
  produce more than 60% of launch recipes, so trade is required for full progression.
- **SC-007**: Arbitrage is live gameplay: across any 24-hour window of a healthy world, at least
  one caravan route offers a post-tax, post-risk expected profit, and hauling-focused play earns
  coin at a rate within ±50% of production-focused play at equivalent investment.
- **SC-008**: The shared world supports at least 10,000 concurrently active players trading on
  settlement markets without players experiencing degraded responsiveness.
- **SC-009**: Every screen passes phone-portrait usability: all primary actions reachable and all
  text legible on a 6-inch display, verified for 100% of shipped screens.
- **SC-010**: Zero tolerance for economic integrity defects: duplication or loss of items/coin
  from concurrent trading, timer manipulation, or interrupted sessions occurs in 0 audited cases.

### Measurable Outcomes — Combat Core

- **SC-101**: A player with a ready loadout goes from hunting-grounds screen to a running
  expedition in at most 4 inputs and under 30 seconds.
- **SC-102**: An expedition runs indefinitely (until supplies/retreat/cap end it) with zero
  player input after start — verified for 100% of launch enemy types, including ability
  rotations.
- **SC-103**: Offline expedition results match online results exactly for identical builds,
  tactics, and conditions in 100% of audited cases.
- **SC-104**: No combat outcome reduces stored items, coin, gear (beyond stated wear),
  progression, or tree points — 0 violations in audit (extends SC-010).
- **SC-105**: Economy integration: at launch ≥ 20% of crafting recipes require a
  combat-exclusive material; every hunting region's materials are demanded by ≥ 1 recipe;
  respec and repair sinks are live.
- **SC-106**: Fighter viability: combat-focused play earns coin within ±50% of production- or
  hauling-focused play at equivalent investment (extends SC-007 to three playstyles).
- **SC-107**: Builds matter: at any launch tier, a well-chosen school/tree/tactics build
  improves expedition yield ≥ 25% over the default build at equal gear — and at least 2
  materially different builds per school sit within 10% of each other (no single solved
  build).
- **SC-108**: Tactics parity on standard content: for every launch hunting-ground enemy, the
  best outcome achievable by live manual tap-casting is reproducible by tactics rules alone
  (0 cases where manual play is strictly required). Designated challenge content (FR-201–251)
  is explicitly exempt — there, active control may be rewarded.
- **SC-109**: All combat screens pass the established phone-portrait usability bar (SC-009).

### Measurable Outcomes — Challenge & Group

- **SC-201**: A competent live-controlled player clears a tier-appropriate mettle trial that the
  auto AI (same build/gear) fails or completes ≥ 25% slower — active control demonstrably
  matters on 100% of launch trials.
- **SC-202**: A five-player party with balanced roles completes the launch dungeon at the
  target session length (≤ 30 min) with ≥ 90% of runs free of technical voiding; a uniform
  no-sustain composition fails the same dungeon ≥ 70% of attempts (interdependence is real).
- **SC-203**: Disconnect resilience: 100% of mid-run disconnects result in AI takeover within
  one combat tick and zero voided runs in audit.
- **SC-204**: Social formation works in-game: ≥ 80% of dungeon parties in test cohorts form
  via the group board without external coordination tools.
- **SC-205**: Economy integration: every format's exclusive materials are demanded by ≥ 1
  recipe; group-content materials account for ≥ 10% of launch recipe inputs overall.
- **SC-206**: No-ruin holds at scale: 0 audited cases of any group outcome destroying player
  property or progression beyond stated durability/recovery costs.
- **SC-207**: Phone sessions: ≥ 90% of completed dungeon runs and 100% of events fit their
  target session lengths on phone-portrait UI.
- **SC-208**: PvE-only invariant: 0 code paths or content definitions capable of applying
  player-to-player damage (verified by audit of the mechanic vocabulary).
- **SC-209**: Open-world scale: a world boss fight with 50 concurrent contributors resolves
  correctly with every participant's contribution recorded; participants beyond 50 still
  receive contribution credit in 100% of audited cases.

### Measurable Outcomes — Relics & Delves

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
  owned items, coin, gear (beyond stated durability), or progression (extends SC-206);
  and in healthy test cohorts neither withdraw nor descend exceeds 90% of landing decisions —
  both choices live.
- **SC-307**: Procedural soundness: across an audit set, distinct seeds produce materially
  different descents (layout/encounter sequence), and identical seeds reproduce identical
  descents in 100% of cases.
- **SC-308**: Solo completeness: a V1 solo player can earn and fully awaken at least one
  relic and set delve depth records, with every multiplayer-gated relic honestly labeled —
  0 silently absent items.

## Open Questions

All six gaps the 2026-06-11 holistic audit surfaced are resolved: Q1–Q5 (character tier,
stat vocabulary, group-combat semantics, combat coin faucets, settlement facilities) in the
core-game clarification round, and Q6 (combat onboarding) in the 2026-06-12 session — see
Clarifications. The answers are integrated into the requirements; no open questions remain.

## Scope Boundaries

**In scope (the core game)**: accounts and characters; idle skilling with offline accrual;
items, recipes, and per-settlement storage; settlements with linked-but-located markets and
tiered crafting-station facilities; the five-attribute stat model with per-school scaling;
caravans and character travel; single currency with faucet/sink telemetry; transaction
history; auto-resolving PvE expeditions; combat schools (incl. magic) with active abilities,
limited slots, tactics rules with shipped defaults, optional live tap-to-cast; per-school
mastery and two-branch perk trees with scarce points and paid respec; enemies, hunting
grounds, drop tables; gear with stats, gear score, quality grades, modifiers, durability,
repair; provisions with auto-consume; retreat/recovery; the challenge encounter/mechanic
system; mettle trials (V1+); parties and the group board; 5-player dungeons; weekly
afflictions with recognition leaderboards; 10–20 player raids with scheduling; elite zones;
eruption events (with caravan-risk tie-in); world bosses on rotation; settlement invasions
with contribution repair; personal loot; format-exclusive economy materials; the relic gear
tier (signature modifiers, equip limits, tradable acquisition, duplicate compensation,
compendium, awakening tracks); delve sites and procedural descents (1–3 players,
floors/landings, withdraw-or-descend stakes, two-stream rewards, depth scaling, weekly
fixed-seed expeditions); V1 solo and V2 online as defined in Product Definition; phone-first
UI throughout.

**Out of scope**:

*Permanently excluded by design:*

- Action gameplay and real-time dexterity mechanics of any kind (aiming, dodging, movement,
  positioning, reflex timing, input-skill rewards).
- 3D rendering of any kind.
- PvP of any kind (wars, arenas, outpost-style modes, open-world flagging) — decided
  2026-06-11: Tradewright is PvE-only; territory contests stay economic.
- Extraction-style loss of owned property — the delve venture stake is the designed
  replacement; no future tuning may put owned items at risk (FR-204 binding).

*Deferred to Phase 2 (territory & social governance):*

- Companies/guilds as systems, settlement ownership, player-set taxes, facility upgrades,
  war-effort contribution races. (This spec consumes "a group of players" however formed,
  and invasion repair mechanics are designed for later territory reuse — nothing here
  decides ownership.)
- Chat or social systems beyond structured group coordination (pings, ready-checks, station
  assignments).

*Deferred, recorded candidates:*

- Monetization, purchases, or premium currency.
- Player-to-player direct trading/gifting outside the market (prevents untracked transfers).
- Multi-character support (one character per account at launch).
- Multi-school loadouts — recorded as a future build-depth candidate. (The attribute system
  itself was un-deferred on 2026-06-11 and is now in scope, FR-107; attribute thresholds
  granting trade-skill bonuses — the inspiration's cross-pillar hook — remain a future
  candidate.)
- Lockout-cadence seasonal trials (the one inspiration feature still consciously deferred).
- Pets, mercenaries, or multiple simultaneous expeditions per character.
- Cross-server play, seasonal resets, or competitive seasons beyond weekly recognition
  boards.
- Spectating, replays, build-sharing portals, relic loadout presets, wardrobe/transmog
  (future quality-of-life).
- Procedural generation of *content* (rooms, encounters, and modifiers are authored; only
  their assembly per seed is systemic — FR-024 authoring separation).

## Assumptions

### World & Economy

- **Two versions**: the V1/V2 product definition (see Product Definition section) supersedes
  the older "shared world with simulated participants for testing" assumption — V1 is a
  permanent solo product, not a test stub.
- **Offline cap**: offline accrual is capped at 24 hours; absence beyond the cap wastes time,
  not progress already earned. The cap value is content-tunable.
- **Idle pacing**: standard idle conventions apply — actions in the seconds-to-minute range,
  hundreds to low thousands of actions per hour-equivalent at low tiers, exponential XP curves
  per tier, modeled on Ironwood RPG / Melvor Idle pacing.
- **Skill families at launch**: at least 3 gathering, 2 refining, and 2 crafting skills plus the
  hauling progression, each with at least 4 tiers — enough to demonstrate full interdependence.
  Exact counts are content decisions, not code constraints.
- **Structure porting**: recipe tree shapes, refining input:output ratio patterns, and tier
  progression structure follow New World's publicly documented trade-skill systems; every name,
  item, location, and text string is original. Caravan logistics are original to Tradewright —
  New World never had caravans (goods moved on encumbered characters); the "fused with New
  World's economy systems" framing covers markets, crafting interdependence, and territory,
  not hauling.
- **Linked market, located goods (a port of New World Update 1.1)**: New World launched with
  isolated per-settlement trading posts and linked them into one globally browsable market on
  2021-11-18 (Update 1.1) after isolation produced fragmented liquidity, dead towns, and
  unrewarded hauling tedium. Tradewright ports the post-1.1 model (clarified 2026-06-12,
  superseding the earlier "keep localization" divergence): every settlement's book is
  browsable and orderable from anywhere, while order books, matching, fees/taxes, and goods
  delivery stay per-settlement — purchases land in storage at the order's settlement.
  Hauling stays rewarded because goods are physical: NPC traders floor liquidity in every
  settlement (research R4, economy), hauling is paid progression gameplay (FR-040–045), and
  asymmetric resources (FR-030) keep prices divergent. SC-007 is the live health check that
  spreads survive global visibility.
- **Caravan durations**: routes run roughly 2–6 hours for caravans; personal travel is materially
  shorter (minutes to tens of minutes). Values are content-tunable per route.
- **Risk model**: route risk is a disclosed probability of losing a fraction of cargo, resolved
  once per shipment; mitigation spend reduces the loss fraction. No total-loss routes at launch.
- **Order presence rule**: buy orders may be placed and managed at any settlement from
  anywhere; sell orders require the goods (and so their listing) to be at the settlement
  where they physically sit. Standing orders continue to work after the character leaves.
- **One character per account** at launch; multi-character support is a future consideration.
- **Authentication**: V2 uses standard account registration/login appropriate for a persistent
  online game; no specific provider assumed. V1 requires no account or login (FR-003).

### Combat

- **What "rip out action-based" means**: decisions stay (school choice, ability picks, tree
  builds, gear, tactics, when to push tiers), execution goes (no aiming/dodging/reflex input).
  Optional tap-to-cast while spectating is allowed because it is a strategic timing choice
  fully replicable by tactics rules (FR-166/SC-108), not an input-skill mechanic.
- **Structure ported, IP not**: school/ability/tree shapes follow New World's weapon-mastery
  conventions (3 slotted actives, two trees per school, scarce points, respec); every school,
  ability, enemy, and name is original (FR-024 / R12 discipline, economy research).
- **Combat occupies the one activity slot** — preserves the idle pacing model's central
  trade-off.
- **No-death model**: defeat = automatic retreat, haul kept, durability + recovery-minutes
  cost. Harsher penalties are content tuning later if wanted.
- **Determinism**: reproducible outcomes (FR-106) imply seeded randomness consistent with the
  established offline-parity guarantee.
- **Launch scale**: 2 schools (≥ 1 magic), 3 ability slots, two branches per school, 2–3
  combat skills — content decisions, not code constraints; structure supports more.
- **Recovery duration**: minutes, not hours — a pacing speed bump, content-tunable.

### Challenge & Group

- **"Positions" without movement**: where the source formats use spatial positioning, we use
  UI stations/lanes (a tactical assignment choice) — preserving the decision, discarding the
  movement, consistent with the no-action rule.
- **Personal loot** (no group loot disputes) chosen over roll/auction systems for phone-first
  simplicity and social hygiene.
- **Affliction cadence** weekly with 3 levels at launch, content-tunable (structure per New
  World's mutator system; all modifier names/effects original).
- **Raid size** 10 standard / 20 max at launch (mirrors source structure: 10-player raid,
  20-player apex encounters) — content-tunable.
- **Invasion stakes** preview Phase 2: facility degradation/repair mechanics are designed to
  be reused by territory systems later; nothing here decides territory *ownership*.
- **Session lengths** (30/45/15 min) are design budgets, not hard timeouts; content tuning
  enforces them statistically (SC-207).
- **Idle pause in instances**: suspending idle accrual during live instanced sessions is the
  anti-double-dip rule; it also keeps "one character, one place, one activity" coherent.
- **Naming vs. the inspiration**: the challenge formats were renamed in the 2026-06-11 audit
  after the original draft reused New World's literal feature names ("Soul Trials" → mettle
  trials; "mutations" → afflictions), violating the originality rule (FR-024). Inspiration
  feature/system names join the content denylist (content-schema contract, Part I
  world-integrity test 8).
- **Original extensions, honestly labeled**: the inspiration's solo trials were a flat
  once-per-day rotation of three endgame bosses; the tier ladder, prior-clear gating, and
  score-bracket ranks here are Tradewright extensions, not ports. The any-clear ladder gate
  is a deliberate divergence: the inspiration required a minimum score rank on a level to
  unlock the next; Tradewright unlocks on any recorded clear, with score brackets affecting
  payout only. Likewise the threat-meter invasion trigger and contribution repair are
  original analogs of its systems, not copies (the inspiration's invasions were triggered by
  *neglected* corruption events; Tradewright inverts this — settlement activity builds
  threat).
- **World-boss rotation matches the source's real system**: the inspiration had no
  persistent world bosses; its world-boss system (added mid-2025) ran one featured boss per
  published multi-day window on rotation. FR-242 adopts that rotating structure (verified
  2026-06-11 research); the contribution floor and ~50-target concurrency handling remain
  Tradewright designs.
- **Supply-control divergence, corrected against research (2026-06-11)**: the inspiration's
  dungeon entry caps were 15 runs/day plus 25 modified runs/week, raised to 35/week in 2023;
  its trials, raids, and world bosses never capped entry — only bonus loot (1–2 bonus
  spoils/week, capped daily bonus boxes with weekly pity). Its trajectory moved away from
  entry gating (tuning orbs removed 2022) toward uncapped entry with capped bonus rewards.
  Tradewright adopts that end state from the start: entry is never limited; the
  held-in-reserve, disclosed content lever is capping the exclusive-material/bonus portion
  of rewards per day/week, triggered only by economy telemetry showing oversupply.
- **The inspiration is a closed case study**: New World: Aeternum ended content development in
  October 2025, was delisted 2026-01-15, and shuts down 2027-01-31. Its documentation is
  archived per research R12 (economy); its post-launch reversals (market globalization,
  entry-cap oscillation, crafted gear-score RNG removal) are treated as design evidence, not
  just a feature catalog.

### Relics & Delves

- **Working names are original placeholders**: "relic" and "delve" deliberately avoid the
  inspiration's own feature names ("Artifacts", "Catacombs"), which sit on the content
  denylist per the naming rule (FR-024). Final shipped names are content decisions; the
  structures specified here are name-independent.
- **Deferral history**: relics and delves were briefly deferred on 2026-06-11 pending the
  combat core's build planning, then un-deferred the same day. Seasonal lockout trials
  remain the one deferred inspiration feature (Scope Boundaries).
- **Tradable relics (clarified 2026-06-11)**: the inspiration's unique tier was non-tradable,
  but review chose to keep relics inside the all-goods-trade norm (FR-123) rather than
  introduce a bound item class. Tradewright therefore has no bound items: the trophy identity
  is carried by the disclosed source and the compendium's provenance, not by binding, and the
  market becomes an additional legitimate path to any relic.
- **Extraction redesign rationale**: the inspiration's mode risked the run's collected loot
  on failure. Tradewright splits rewards into an untouchable base stream and a staked bonus
  stream that is never "owned" until banked, so the push-or-bank decision survives while
  no-ruin (FR-130–132, FR-204) holds absolutely. Framing the stake honestly before
  every descend choice is what makes the forfeit a wager, not a loss.
- **Structure ported, expression original**: relic structure (unique perk, equip limit,
  upgrade track, top-band power) and delve structure (3-player, procedural, escalating
  descent) follow the inspiration's documented systems (archived per research R12, economy);
  every name, modifier, room, enemy, and track is original. The fixed top-of-band gear score
  follows the crafted-gear determinism correction (FR-270) — relic power is never a roll.
- **Launch scale (content decisions, not code constraints)**: on the order of 6–10 relics
  spanning all source formats with at least one V1-obtainable; 2–3 delve sites in distinct
  regions; floors tuned to ~5 minutes; weekly seed cadence aligned with the affliction
  rotation week. All counts, curves, multipliers, and limits are content-tunable.
- **Equip limit default**: one relic weapon/focus + one relic armor/trinket, mirroring the
  inspiration's two-slot structure; content-tunable per FR-302.
