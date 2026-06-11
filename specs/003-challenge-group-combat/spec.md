# Feature Specification: Challenge & Group Combat Content

**Feature Branch**: `003-challenge-group-combat`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User direction: "There are also dungeons and group combat. I want to keep that too.
It is an integral part of a social game — having to depend on other players to achieve certain
things. The player should be able to actively control difficult combat like a boss fight."
Format-by-format decisions taken 2026-06-11: keep ALL of New World's PvE formats (expeditions/
dungeons, mutated difficulty tiers, raids/trials, invasions, soul trials, elite zones, world
events/breaches, world bosses); keep NO PvP formats; active control = live tactical control
with a simple auto AI for weaker stretches.

## Vision Summary

This spec adds Tradewright's challenge and social combat layer on top of spec 002's combat
core. Where 002 covers the idle, autoable loop (hunting grounds run by the tactics AI), this
spec covers the content you *show up* for: solo boss trials you pilot by hand, five-player
dungeons, rotating hard-mode afflictions, large raids, settlement-defense invasions, and a
living open world of elite zones, eruption events, and world bosses.

Two ideas govern everything here:

1. **Active play is decision speed, never dexterity.** Difficult fights use 002's active mode
   (FR-180–184): the player drives abilities, provisions, and stances in real time against
   visible boss mechanics — tapping choices on cooldown timers, not aiming or dodging. The
   simple auto AI can take over any character at any moment (easy stretches, a phone call, a
   disconnected teammate), at AI-level effectiveness.
2. **Interdependence is the point.** Group content exists so players need each other — to fill
   a dungeon party, to muster a raid, to defend a settlement — and its exclusive rewards feed
   the economy so even pure traders care that fighters band together. PvE only: no
   player-vs-player damage exists anywhere in Tradewright.

Group formats are inherently multiplayer and ship with the online version (V2); solo
challenge content (mettle trials) works in the solo version (V1) too. All structures are adapted
from New World's PvE formats, with original extensions and deliberate divergences recorded in
Assumptions; every name, place, enemy, format label, and mechanic expression is original —
including the format names themselves, which deliberately avoid the inspiration's own feature
names (its solo bosses are literally called "Soul Trials"; its modifier system "mutations").

## Clarifications

### Session 2026-06-11

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
  launch — unlimited entries and full rewards every run; daily/weekly limits remain a
  content-tunable lever applied only if economy telemetry shows exclusive-material oversupply.
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

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pilot a Solo Boss Trial (Priority: P1)

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
5. **Given** defeat in a trial, **Then** standard no-ruin rules apply (002 FR-130–132): haul
   kept, durability + recovery cost, nothing else lost.
6. **Given** a completed trial, **Then** a rank (time/penalty graded via the shared score-
   bracket mechanism) is recorded, scales that run's payout, and repeat runs can improve the
   recorded personal best.

---

### User Story 2 - Run a Dungeon with a Party (Priority: P2)

Five players form a party and enter an instanced dungeon: a sequence of encounters ending in
boss fights, designed so that one player cannot do everything — sustain, damage, and control
roles emerge from school/build choices. Each player controls their own character live (or
leans on the auto AI); bosses use the mechanic system from trials, with some mechanics
requiring multiple players to answer simultaneously. Completion pays dungeon-exclusive
materials to every member.

**Why this priority**: This is the social heart the user named — depending on other players to
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
   the completion is recorded for affliction eligibility (Story 3).

---

### User Story 3 - Climb Afflicted Difficulty Tiers (Priority: P3)

Each week, a rotating subset of dungeons gains afflictions — stacked modifiers (elemental
twists, empowered enemies, added curses) across difficulty levels. Higher affliction levels
demand tighter builds, better gear, and sharper live play, and pay proportionally rarer
rewards plus a scoreboard rank.

**Why this priority**: Afflictions turn a finite dungeon set into a repeatable endgame ladder —
retention content that reuses everything from Story 2.

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

### User Story 4 - Muster a Raid (Priority: P4)

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

1. **Given** a company or group leader, **When** they schedule a raid, **Then** they can post
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

### User Story 5 - Live in an Active World: Elite Zones, Events, World Bosses (Priority: P5)

The open world itself offers group-scale combat without dungeon scheduling: elite zones
(regions whose enemies assume a full party — each engagement is isolated to one party, and a
player without a party fights as a solo party of one), eruption events (timed incursions that
pop up regionally and ask whoever is present to clear waves together, no party needed), and
world bosses (massive enemies on published spawn windows that regional players gather to
bring down, with contribution-based rewards).

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
3. **Given** a world boss spawn window, **Then** it is published in advance on the region's
   board; the fight supports many simultaneous contributors; rewards scale with contribution
   with a guaranteed floor for any meaningful participation.

---

### User Story 6 - Defend the Settlement: Invasions (Priority: P6)

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
   with timing, roster limit, and station plan; signups commit to a slot.
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

### Edge Cases

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
  (001 FR-002); commitments conflict visibly at signup.
- Solo player enters group-tuned content alone → allowed where entry rules permit, with
  honest "designed for N players" warning; no artificial lockout below recommended size.
- Low population region/server → group board surfaces cross-settlement listings (travel
  required, per 001 rules); world events scale wave size down to participants present, within
  stated bounds.
- Player in a dungeon when the offline cap would hit → instanced group content runs in live
  sessions only; the cap question does not arise inside it (idle accrual is paused while in a
  live instance).
- Reward farming by re-running → launch ships with no entry limits and full rewards every
  run; daily/weekly limits exist as a content-tunable lever, applied per format only if
  economy telemetry shows exclusive-material oversupply, and always disclosed up front.
- V1 (solo version): mettle trials fully available; all multiplayer formats visibly labeled as
  online-version content, never silently absent.

## Requirements *(mandatory)*

### Functional Requirements

**Challenge Encounter System (shared by all formats)**

- **FR-201**: Boss-grade encounters MUST be built from a mechanic vocabulary (phases,
  telegraphed attacks with seconds-scale response windows, adds, enrage timers, cooperative
  answers) defined in authored content — never input-dexterity tests (002 FR-184 binding).
- **FR-202**: Every mechanic MUST present its telegraph, window, available answers, and
  consequences through UI elements; after first encounter, mechanics are inspectable in a
  bestiary/journal.
- **FR-203**: Active control in encounters follows 002 FR-181–183: live tactical input,
  auto-AI toggle at any time, AI holds disconnected/absent players, active play may
  outperform AI here.
- **FR-204**: All no-ruin guarantees hold in every format (002 FR-130–132): no death, no loss
  beyond durability/recovery; group wipes end runs without voiding earned haul.
- **FR-205**: Challenge content runs in live sessions only; idle/offline accrual (001 FR-013)
  is suspended while in an instance and resumes after. Instanced content does not run offline.

**Mettle Trials (Solo)**

- **FR-210**: Mettle trials — Tradewright's solo boss trials — MUST exist from the solo version (V1) onward, tier-laddered,
  with trial-exclusive reward materials and recorded completion ranks (graded, repeatable).
  Ranks use the same disclosed score-bracket mechanism as afflictions (FR-223): each victory's
  rank scales that run's payout on top of the trial's tier; personal-best ranks are recorded
  for recognition.
- **FR-211**: Trial unlocking uses both hard gates, mirroring affliction qualification
  (FR-223): a recorded clear of the previous trial on the ladder (the first trial is open
  by default) AND a disclosed character tier for the target trial. A recommended gear-score
  band is displayed per trial as advisory guidance only — it never blocks entry;
  under-geared players enter with an honest warning. Locked trials always show their
  requirements.

**Parties, Dungeons & Afflictions**

- **FR-220**: The game MUST provide party formation (create/join listings on a group board;
  invite by name; role-need labeling) without requiring third-party coordination tools.
- **FR-221**: Dungeons MUST be instanced for a fixed party size (launch: 5), composed of
  encounter sequences with at least one cooperative mechanic per boss, and tuned so balanced
  role coverage outperforms uniform compositions measurably.
- **FR-224**: In-progress dungeons and raids MUST support backfill between encounters: the
  leader may recruit a replacement through the group board whenever no boss fight is active;
  the replacement is loot-eligible only for bosses fought while present. Roster changes are
  never permitted mid-boss-fight (the auto AI holds the slot per FR-203). If the leader
  disconnects or leaves, leadership transfers automatically to the longest-present remaining
  member after a short grace window; the original leader reclaims it on reconnect — leader
  powers are never frozen mid-run.
- **FR-222**: Loot in all group content MUST be personal (per-member rolls); format-exclusive
  materials MUST feed the economy (recipes demand them) per 002 FR-140 discipline. Loot
  tables MAY yield finished gear alongside materials: dropped gear rolls per FR-271 with
  gear score scaled to the content's difficulty (higher affliction levels / raid tiers pay
  higher gear-score bands), keeping drops the lottery path and crafting the targeted path.
- **FR-223**: A weekly affliction rotation MUST apply stacked, fully-disclosed modifiers to a
  subset of dungeons across at least 3 difficulty levels, with qualification gates, scoring,
  and weekly leaderboards. Qualification for level N requires BOTH a recorded clear of the
  previous level (the base dungeon for level 1) AND a disclosed character tier for the
  target level; both hard gates are per player and shown on the group board. A recommended
  gear-score band per level is displayed as advisory guidance only — it never blocks entry;
  under-geared players enter with an honest warning. Each run's score MUST land in a
  disclosed score bracket that scales that run's reward payout on top of affliction level;
  weekly leaderboards are recognition only (titles/flair) and pay no material rewards.

**Raids**

- **FR-230**: Raid encounters MUST support 10 players (up to 20 for the largest tier), with
  sub-group mechanics requiring distributed simultaneous answers and composition-sensitive
  tuning.
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
- **FR-242**: World bosses MUST spawn on published windows, support a design target of ~50
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
  (content-tunable), matching the FR-242 mass-combat concurrency target.
- **FR-251**: Defense failure consequences MUST be temporary, settlement-level, and repairable
  through contribution (materials, coin, labor) — never destruction of player property;
  success MUST grant settlement-wide benefits so non-fighters have a stake. Contribution
  repair is the primary, rewarded path (restores quickly, pays contributors per FR-264);
  absent contribution, degraded facilities MUST self-restore over a stated multi-day window so
  no settlement is permanently crippled by low population.

**Gear Quality & Modifiers** *(extends 002 FR-120/FR-174 for challenge rewards)*

- **FR-270**: Every gear item MUST carry, beyond its tier (002 FR-120): a gear score —
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
- **FR-272**: Affliction modifiers MUST be counterable by matching gear modifiers: each
  affliction's elemental/curse effects are mitigated by corresponding ward/resist modifiers,
  with the counter relationship disclosed alongside the weekly rotation (FR-223) — so each
  rotation creates rotating, readable market demand for the matching craft-mod materials.

**Social & Economy Integration**

- **FR-260**: Each format MUST have at least one exclusive reward material demanded by the
  recipe economy, so group achievement flows into markets and caravans.
- **FR-261**: Group activity MUST respect the PvE-only rule absolutely: no format, mechanic,
  or edge case may apply player-vs-player damage or loss.
- **FR-262**: All formats MUST be visible (with honest "online version" labeling where
  applicable) in V1, and multiplayer formats MUST activate with the online version (V2)
  without client redesign.
- **FR-263**: All group content MUST remain phone-first (001 FR-061) with sessions designed
  for mobile attention spans: dungeons target ≤ 30 minutes, raid encounters ≤ 45 minutes,
  events ≤ 15 minutes.
- **FR-264**: Contribution scoring MUST be a weighted multi-factor score — damage dealt,
  healing/mitigation provided, and objective actions (wave clears, station duties, repair
  supply) — with weights normalized per format, so sustain and control builds earn comparably
  to damage builds; the factors and weights in effect MUST be disclosed to players.

### Key Entities

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
- **Gear Score / Quality Grade**: Per-item power number (within tier band, scales stats)
  and derived grade (function of modifier count) — the reward axes challenge content pays
  out on (FR-270).
- **Contribution Record**: Per-player weighted multi-factor participation score (damage,
  healing/mitigation, objective actions; format-normalized weights) used by events, bosses,
  invasions, and repair drives.

## Success Criteria *(mandatory)*

### Measurable Outcomes

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

## Scope Boundaries

**In scope**: the challenge encounter/mechanic system; mettle trials (V1+); parties and group
board; 5-player dungeons; weekly afflictions with leaderboards; 10–20 player raids with
scheduling; elite zones; eruption events (with caravan-risk tie-in); world bosses; settlement
invasions with contribution repair; personal loot; format-exclusive economy materials.

**Out of scope (this spec)**:

- All PvP (wars, arenas, outpost-style modes, open-world flagging, capture-the-flag) —
  decided 2026-06-11: Tradewright is PvE-only, permanently; territory contests remain economic
  per 001/Phase 2.
- Guild/company *systems* themselves (Phase 2 spec); this spec only consumes "a group of
  players" however formed.
- Voice/text chat systems (group coordination uses structured UI: pings, ready-checks,
  station assignments; a chat decision belongs to a social spec).
- Cross-server play, seasonal resets, or competitive seasons beyond weekly affliction boards.
- Spectating, replays, or build-sharing portals (future quality-of-life).
- Two inspiration PvE formats identified in the 2026-06-11 audit and consciously deferred:
  procedural small-group dungeons (the inspiration's late-life 3-player "Catacombs" mode — a
  strong phone-session fit) and lockout-cadence seasonal trials. Both are candidates for a
  future content spec; deferring them amends the "keep ALL PvE formats" input decision.

## Assumptions

- **Dependency chain**: this spec builds strictly on 002 (control modes, builds, no-ruin) and
  001 (settlements, items, economy, caravans). Multiplayer formats additionally require the
  online version (V2 in the 001 plan); mettle trials do not.
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
- **Naming vs. the inspiration**: the formats here were renamed in the 2026-06-11 audit after
  the original draft reused New World's literal feature names ("Soul Trials" → mettle trials;
  "mutations" → afflictions), violating the originality rule (001 FR-024). Inspiration
  feature/system names join the content denylist (001 content-schema, world-integrity test 8).
- **Original extensions, honestly labeled**: the inspiration's solo trials were a flat
  once-per-day rotation of three endgame bosses; the tier ladder, prior-clear gating, and
  score-bracket ranks here are Tradewright extensions, not ports. Likewise the threat-meter
  invasion trigger and contribution repair are original analogs of its systems, not copies.
- **Entry-limit divergence**: the inspiration ran entry caps (15 dungeon runs/day, 25 modified
  runs/week, weekly trial lockouts) as its standard oversupply control for most of its life.
  Tradewright deliberately inverts that default — uncapped at launch, caps held as a disclosed
  content lever — accepting the burden of watching exclusive-material supply via economy
  telemetry instead.
- **The inspiration is a closed case study**: New World: Aeternum ended content development in
  October 2025, was delisted 2026-01-15, and shuts down 2027-01-31. Its documentation is
  archived per 001 research R12; its post-launch reversals (market globalization, entry-cap
  oscillation, crafted gear-score RNG removal) are treated as design evidence, not just a
  feature catalog.
